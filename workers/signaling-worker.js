/**
 * CAST — Cloudflare Worker WebRTC Signaling & Pairing Backend
 * 
 * Routes:
 * - POST /api/pair/create   : Creates a new 6-digit pairing session with expiration
 * - POST /api/pair/join     : Validates 6-digit code or pairing token, returns session info
 * - POST /api/pair/signal   : Exchanges WebRTC SDP offer/answer & ICE candidates via HTTP
 * - GET  /api/pair/ws/:id   : WebSocket connection for low-latency bidirectional signaling
 * - GET  /api/health        : Health check
 */

// In-memory session store (or KV / Durable Objects in Cloudflare Workers)
const sessions = new Map();
const MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes max TTL

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';

    // CORS preflight handling
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Content-Type': 'application/json',
    };

    // Clean expired sessions
    cleanupExpiredSessions();

    try {
      // 1. Health check
      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', service: 'CAST Signaling Worker', timestamp: Date.now() }), {
          headers: corsHeaders,
        });
      }

      // 2. Create Pairing Session (Sender)
      if (url.pathname === '/api/pair/create' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const code = generateSixDigitCode();
        const sessionId = crypto.randomUUID();
        const expiresAt = Date.now() + (body.expirationMinutes || 5) * 60 * 1000;

        const session = {
          sessionId,
          code,
          expiresAt,
          createdAt: Date.now(),
          senderDevice: body.deviceInfo || { type: 'unknown' },
          receiverDevice: null,
          status: 'waiting', // waiting | paired | closed
          failedAttempts: 0,
          signals: [],
          senderWs: null,
          receiverWs: null,
        };

        sessions.set(code, session);
        sessions.set(sessionId, session);

        return new Response(JSON.stringify({
          success: true,
          sessionId,
          code,
          expiresAt,
          pairUrl: `${url.origin}/?pair=${code}&token=${sessionId}`,
        }), { headers: corsHeaders });
      }

      // 3. Join / Validate Pairing Code (Receiver)
      if (url.pathname === '/api/pair/join' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const codeOrToken = (body.code || body.token || '').trim();

        const session = sessions.get(codeOrToken);
        if (!session) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid or expired pairing code.',
          }), { status: 404, headers: corsHeaders });
        }

        // Check expiration
        if (Date.now() > session.expiresAt) {
          sessions.delete(session.code);
          sessions.delete(session.sessionId);
          return new Response(JSON.stringify({
            success: false,
            error: 'This pairing session has expired. Please generate a new code.',
          }), { status: 410, headers: corsHeaders });
        }

        // Check brute-force attempts
        if (session.failedAttempts >= MAX_ATTEMPTS) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Too many incorrect attempts. This session is locked.',
          }), { status: 429, headers: corsHeaders });
        }

        // Attach receiver
        session.receiverDevice = body.deviceInfo || { type: 'unknown' };
        session.status = 'paired';

        return new Response(JSON.stringify({
          success: true,
          sessionId: session.sessionId,
          senderDevice: session.senderDevice,
          status: 'paired',
        }), { headers: corsHeaders });
      }

      // 4. Signal Relay (SDP Offer/Answer & ICE Candidates)
      if (url.pathname === '/api/pair/signal' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { sessionId, signal, sender } = body;

        const session = sessions.get(sessionId);
        if (!session) {
          return new Response(JSON.stringify({ success: false, error: 'Session not found' }), {
            status: 404,
            headers: corsHeaders,
          });
        }

        session.signals.push({
          sender, // 'sender' | 'receiver'
          signal,
          timestamp: Date.now(),
        });

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // 5. Signal Poll (for environments where WebSocket upgrade is not used)
      if (url.pathname === '/api/pair/poll' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { sessionId, role, since } = body;

        const session = sessions.get(sessionId);
        if (!session) {
          return new Response(JSON.stringify({ success: false, error: 'Session not found' }), {
            status: 404,
            headers: corsHeaders,
          });
        }

        // Target signals intended for this role (sent by the counterpart)
        const targetRole = role === 'sender' ? 'receiver' : 'sender';
        const pendingSignals = session.signals.filter(
          s => s.sender === targetRole && s.timestamp > (since || 0)
        );

        return new Response(JSON.stringify({
          success: true,
          signals: pendingSignals,
          now: Date.now(),
        }), { headers: corsHeaders });
      }

      // 6. WebSocket Signaling Upgrade
      if (url.pathname.startsWith('/api/pair/ws/')) {
        const upgradeHeader = request.headers.get('Upgrade');
        if (!upgradeHeader || upgradeHeader !== 'websocket') {
          return new Response('Expected Upgrade: websocket', { status: 426 });
        }

        const sessionId = url.pathname.split('/').pop();
        const role = url.searchParams.get('role') || 'receiver'; // 'sender' | 'receiver'

        const webSocketPair = new WebSocketPair();
        const [clientWs, serverWs] = Object.values(webSocketPair);

        serverWs.accept();

        let session = sessions.get(sessionId);
        if (session) {
          if (role === 'sender') session.senderWs = serverWs;
          else session.receiverWs = serverWs;
        }

        serverWs.addEventListener('message', event => {
          try {
            const data = JSON.parse(event.data);
            const targetSession = sessions.get(sessionId);
            if (!targetSession) return;

            // Route to counterpart
            const peerWs = role === 'sender' ? targetSession.receiverWs : targetSession.senderWs;
            if (peerWs && peerWs.readyState === WebSocket.OPEN) {
              peerWs.send(JSON.stringify({ ...data, from: role }));
            }
          } catch (e) {
            console.error('WS relay error:', e);
          }
        });

        serverWs.addEventListener('close', () => {
          const s = sessions.get(sessionId);
          if (s) {
            if (role === 'sender') s.senderWs = null;
            else s.receiverWs = null;
          }
        });

        return new Response(null, {
          status: 101,
          webSocket: clientWs,
        });
      }

      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: corsHeaders,
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};

function generateSixDigitCode() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now > session.expiresAt || (now - session.createdAt > SESSION_TTL_MS)) {
      sessions.delete(key);
    }
  }
}
