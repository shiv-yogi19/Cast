/**
 * CAST — Device Pairing Engine & Session Coordinator
 * Manages QR Code, 6-digit codes, countdown expiration, attempt limiter,
 * device identification, battery telemetry, and session state.
 */

import { generateQrSvg } from './qrcode.js';
import { CastConnection } from './webrtc.js';
import { settings } from './settings.js';

export class PairingManager {
  constructor() {
    this.role = 'none'; // 'sender' | 'receiver' | 'none'
    this.code = null;
    this.sessionId = null;
    this.expiresAt = null;
    this.timerInterval = null;
    this.failedAttempts = 0;
    this.maxAttempts = 5;
    this.isLockedOut = false;
    this.connection = null;
    this.connectedDevice = null;
    this.listeners = new Map();

    this.deviceInfo = this.detectDeviceInfo();
  }

  detectDeviceInfo() {
    const ua = navigator.userAgent || '';
    let type = 'Desktop';
    if (/SmartTV|Tizen|Web0S|NetCast|BRAVIA|HbbTV|Roku/i.test(ua)) {
      type = 'Smart TV';
    } else if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) {
      type = 'Mobile';
    }

    let os = 'Unknown OS';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let browser = 'Browser';
    if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/Chrome/i.test(ua)) browser = 'Chrome';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

    return {
      type,
      os,
      browser,
      screen: `${window.screen.width}x${window.screen.height}`,
      name: `${type} (${browser} on ${os})`,
    };
  }

  // Sender creates a new session
  async createSenderSession() {
    this.role = 'sender';
    this.code = Math.floor(100000 + Math.random() * 900000).toString();
    this.sessionId = 'cast-sess-' + Math.random().toString(36).substring(2, 9);
    
    const expMinutes = settings.get('codeExpirationMinutes') || 5;
    this.expiresAt = Date.now() + expMinutes * 60 * 1000;

    // Start expiration countdown
    this.startExpirationTimer();

    // Initialize WebRTC
    this.connection = new CastConnection('sender', {
      sessionId: this.sessionId,
      code: this.code,
      signalingUrl: settings.get('signalingServerUrl'),
    });

    this.bindConnectionEvents();
    await this.connection.startSender(this.code, this.sessionId);

    // Compute pair URL
    const pairUrl = `${window.location.origin}${window.location.pathname}?pair=${this.code}&token=${this.sessionId}`;
    const qrSvg = generateQrSvg(pairUrl, 220);

    const sessionData = {
      code: this.code,
      sessionId: this.sessionId,
      expiresAt: this.expiresAt,
      pairUrl,
      qrSvg,
      deviceInfo: this.deviceInfo,
    };

    this.emit('session-created', sessionData);
    return sessionData;
  }

  // Receiver joins with a 6-digit code or URL token
  async joinAsReceiver(inputCode) {
    this.role = 'receiver';
    const cleanCode = (inputCode || '').trim().replace(/\s+/g, '');

    if (this.isLockedOut) {
      throw new Error('Too many failed attempts. Please wait before trying again.');
    }

    if (!cleanCode || cleanCode.length < 6) {
      throw new Error('Please enter a valid 6-digit pairing code.');
    }

    this.code = cleanCode;
    this.connection = new CastConnection('receiver', {
      code: this.code,
      signalingUrl: settings.get('signalingServerUrl'),
    });

    this.bindConnectionEvents();

    try {
      await this.connection.startReceiver(this.code);
      this.failedAttempts = 0;
      this.emit('joining', { code: this.code });
    } catch (err) {
      this.failedAttempts++;
      if (this.failedAttempts >= this.maxAttempts) {
        this.isLockedOut = true;
        setTimeout(() => {
          this.isLockedOut = false;
          this.failedAttempts = 0;
        }, 60000); // 1 min cooldown
        throw new Error('Maximum incorrect pairing attempts reached. Locked for 60 seconds.');
      }
      throw new Error(`Pairing failed: ${err.message}. (${this.maxAttempts - this.failedAttempts} attempts left)`);
    }
  }

  bindConnectionEvents() {
    this.connection.on('statechange', (state) => {
      this.emit('statechange', state);
      if (state === 'connected') {
        // Send device telemetry and exchange metadata
        this.sendDeviceTelemetry();
      }
    });

    this.connection.on('connected', () => {
      this.emit('connected', {
        role: this.role,
        code: this.code,
      });
    });

    this.connection.on('disconnected', () => {
      this.connectedDevice = null;
      this.emit('disconnected');
    });

    this.connection.on('message', (packet) => {
      if (packet && packet.type === 'telemetry') {
        this.connectedDevice = packet.deviceInfo;
        this.emit('peer-telemetry', packet);
      }
      this.emit('message', packet);
    });
  }

  // Battery and device telemetry dispatch
  async sendDeviceTelemetry() {
    let batteryData = { supported: false, message: 'Battery Status Unavailable' };
    try {
      batteryData = await settings.getBatteryStatus();
    } catch (e) {}

    this.sendPacket({
      type: 'telemetry',
      deviceInfo: this.deviceInfo,
      battery: batteryData,
      role: this.role,
      timestamp: Date.now(),
    });
  }

  sendPacket(packet) {
    if (this.connection) {
      return this.connection.sendMessage(packet);
    }
    return false;
  }

  startExpirationTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      const remainingMs = this.expiresAt - Date.now();
      if (remainingMs <= 0) {
        clearInterval(this.timerInterval);
        this.emit('session-expired');
        this.disconnect();
      } else {
        const totalSeconds = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        this.emit('timer-tick', { remainingMs, totalSeconds, formatted });
      }
    }, 1000);
  }

  disconnect() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.connection) {
      this.connection.disconnect();
    }
    this.code = null;
    this.sessionId = null;
    this.connectedDevice = null;
    this.emit('disconnected');
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

export const pairing = new PairingManager();
