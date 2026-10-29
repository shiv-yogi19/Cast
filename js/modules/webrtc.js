/**
 * CAST — WebRTC PeerConnection & Hybrid Signaling Module
 * Handles PeerConnection, DataChannel, STUN/TURN, Cloudflare Worker signaling,
 * and Cross-Tab / Local BroadcastChannel mesh fallback.
 */

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class CastConnection {
  constructor(role = 'sender', options = {}) {
    this.role = role; // 'sender' | 'receiver'
    this.sessionId = options.sessionId || null;
    this.code = options.code || null;
    this.signalingUrl = options.signalingUrl || '';
    
    this.peerConnection = null;
    this.dataChannel = null;
    this.state = 'idle'; // idle | pairing | connecting | connected | disconnected | failed
    
    this.listeners = new Map();
    this.localBroadcast = null;
    this.ws = null;
    this.pollInterval = null;
    this.lastPollTimestamp = 0;

    this.initLocalBroadcastMesh();
  }

  // Local BroadcastChannel for instant local pairing across tabs/windows
  initLocalBroadcastMesh() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.localBroadcast = new BroadcastChannel('cast_local_mesh_channel');
        this.localBroadcast.onmessage = (event) => {
          this.handleMeshSignal(event.data);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel unavailable, falling back to network signaling', e);
    }
  }

  // Start connection as Sender
  async startSender(code, sessionId) {
    this.role = 'sender';
    this.code = code;
    this.sessionId = sessionId;
    this.setState('pairing');

    this.setupPeerConnection();

    // Create reliable RTCDataChannel
    this.dataChannel = this.peerConnection.createDataChannel('cast-channel', {
      ordered: true,
    });
    this.bindDataChannelEvents(this.dataChannel);

    // Create SDP Offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Broadcast offer
    this.sendSignal({
      type: 'offer',
      sdp: offer,
      code: this.code,
      sessionId: this.sessionId,
      senderRole: 'sender',
    });
  }

  // Start connection as Receiver
  async startReceiver(codeOrToken) {
    this.role = 'receiver';
    this.setState('connecting');
    this.setupPeerConnection();

    // Listen for incoming data channel
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.bindDataChannelEvents(this.dataChannel);
    };

    // Send receiver join beacon
    this.sendSignal({
      type: 'receiver-join',
      code: codeOrToken,
      token: codeOrToken,
      senderRole: 'receiver',
    });
  }

  setupPeerConnection() {
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (e) {}
    }

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'candidate',
          candidate: event.candidate,
          sessionId: this.sessionId,
          code: this.code,
          senderRole: this.role,
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      if (state === 'connected') {
        this.setState('connected');
      } else if (state === 'disconnected' || state === 'closed') {
        this.setState('disconnected');
      } else if (state === 'failed') {
        this.setState('failed');
      }
    };
  }

  bindDataChannelEvents(channel) {
    channel.onopen = () => {
      this.setState('connected');
      this.emit('connected', { role: this.role });
    };

    channel.onclose = () => {
      this.setState('disconnected');
      this.emit('disconnected');
    };

    channel.onerror = (error) => {
      console.error('DataChannel error:', error);
      this.emit('error', error);
    };

    channel.onmessage = (event) => {
      try {
        let payload;
        if (typeof event.data === 'string') {
          payload = JSON.parse(event.data);
        } else {
          payload = event.data; // Binary chunk
        }
        this.emit('message', payload);
      } catch (err) {
        this.emit('message', event.data);
      }
    };
  }

  // Relay signals via BroadcastChannel and/or Worker
  sendSignal(signalPayload) {
    // 1. Broadcast locally
    if (this.localBroadcast) {
      this.localBroadcast.postMessage(signalPayload);
    }

    // 2. Relay via Cloudflare Worker if URL provided
    if (this.signalingUrl && this.sessionId) {
      fetch(`${this.signalingUrl}/api/pair/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          signal: signalPayload,
          sender: this.role,
        }),
      }).catch(() => {});
    }
  }

  // Handle incoming mesh / worker signals
  async handleMeshSignal(data) {
    if (!data || data.senderRole === this.role) return;

    // Check code / session match if known
    if (this.code && data.code && data.code !== this.code) return;

    try {
      if (data.type === 'receiver-join' && this.role === 'sender') {
        // Receiver requested connection with our code, re-send our offer
        if (this.peerConnection && this.peerConnection.localDescription) {
          this.sendSignal({
            type: 'offer',
            sdp: this.peerConnection.localDescription,
            code: this.code,
            sessionId: this.sessionId,
            senderRole: 'sender',
          });
        }
      } else if (data.type === 'offer' && this.role === 'receiver') {
        this.code = data.code;
        this.sessionId = data.sessionId;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.sendSignal({
          type: 'answer',
          sdp: answer,
          code: this.code,
          sessionId: this.sessionId,
          senderRole: 'receiver',
        });
      } else if (data.type === 'answer' && this.role === 'sender') {
        if (this.peerConnection.signalingState !== 'stable') {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      } else if (data.type === 'candidate' && this.peerConnection) {
        if (data.candidate) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      }
    } catch (e) {
      console.warn('Signal handling warning:', e);
    }
  }

  // Send structured message over DataChannel
  sendMessage(packet) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(typeof packet === 'string' ? packet : JSON.stringify(packet));
      return true;
    }
    return false;
  }

  // Send binary data chunk
  sendBinary(chunk) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(chunk);
      return true;
    }
    return false;
  }

  disconnect() {
    this.setState('disconnected');
    if (this.dataChannel) {
      try { this.dataChannel.close(); } catch (e) {}
    }
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (e) {}
    }
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.emit('disconnected');
  }

  setState(newState) {
    this.state = newState;
    this.emit('statechange', newState);
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(fn => {
        try { fn(data); } catch (e) { console.error(e); }
      });
    }
  }
}
