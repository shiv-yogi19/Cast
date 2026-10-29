/**
 * CAST — Aurora Nebula Audio-Reactive Canvas Visualizer
 * Real-time frequency analysis using Web Audio API (AudioContext & AnalyserNode)
 * 6 visual styles: Aurora Nebula, Circular Spectrum, Frequency Bars, Waveform, Pulse Rings, Cosmic Waves.
 */

import { getIconSvg } from './icons.js';
import { settings } from './settings.js';

export class AudioVisualizer {
  constructor() {
    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.audioCtx = null;
    this.analyser = null;
    this.sourceNode = null;
    this.dataArray = null;
    this.timeArray = null;
    this.animationId = null;
    this.mode = 'aurora'; // 'aurora' | 'spectrum' | 'bars' | 'waveform' | 'pulse' | 'cosmic'
    this.isActive = false;
    this.lastTapTime = 0;
    this.currentTrack = { title: 'Unknown Track', artist: 'Unknown Artist' };
  }

  init(audioElement) {
    if (!audioElement) return;

    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.82;

        this.sourceNode = this.audioCtx.createMediaElementSource(audioElement);
        this.sourceNode.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);

        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        this.timeArray = new Uint8Array(bufferLength);
      }
    } catch (e) {
      console.warn('Web Audio API initialized or cross-origin restricted:', e);
    }
  }

  mountModal() {
    if (document.querySelector('#visualizer-modal')) {
      this.modal = document.querySelector('#visualizer-modal');
      this.canvas = this.modal.querySelector('#visualizer-canvas');
      this.ctx = this.canvas.getContext('2d');
      return;
    }

    const modalEl = document.createElement('div');
    modalEl.id = 'visualizer-modal';
    modalEl.innerHTML = `
      <canvas id="visualizer-canvas"></canvas>
      
      <!-- Top Overlay Controls -->
      <div class="visualizer-overlay-controls">
        <div class="visualizer-mode-pills" id="vis-pills">
          <div class="vis-pill active" data-mode="aurora">Aurora Nebula</div>
          <div class="vis-pill" data-mode="spectrum">Circular Spectrum</div>
          <div class="vis-pill" data-mode="bars">Frequency Bars</div>
          <div class="vis-pill" data-mode="waveform">Waveform</div>
          <div class="vis-pill" data-mode="pulse">Pulse Rings</div>
          <div class="vis-pill" data-mode="cosmic">Cosmic Waves</div>
        </div>

        <button class="btn-icon" id="vis-btn-close" title="Exit Visualizer" aria-label="Exit Visualizer">
          ${getIconSvg('close')}
        </button>
      </div>

      <!-- Bottom Track Info & Gesture Hint -->
      <div class="visualizer-bottom-info">
        <div class="vis-track-title" id="vis-title">Playing Track</div>
        <div class="vis-track-artist" id="vis-artist">CAST Studio</div>
        <div class="vis-gesture-hint">Double-tap anywhere or press ESC to exit</div>
      </div>
    `;

    document.body.appendChild(modalEl);
    this.modal = modalEl;
    this.canvas = modalEl.querySelector('#visualizer-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Resize canvas
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Close button
    modalEl.querySelector('#vis-btn-close').addEventListener('click', () => this.close());

    // Mode switch pills
    const pills = modalEl.querySelectorAll('.vis-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        pills.forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.mode = e.currentTarget.getAttribute('data-mode');
      });
    });

    // Double-tap or double-click to exit
    modalEl.addEventListener('click', (e) => {
      if (e.target.closest('#vis-pills') || e.target.closest('#vis-btn-close')) return;
      const now = Date.now();
      if (now - this.lastTapTime < 350) {
        this.close();
      }
      this.lastTapTime = now;
    });

    // ESC key to exit
    window.addEventListener('keydown', (e) => {
      if (this.isActive && e.key === 'Escape') {
        this.close();
      }
    });
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  open(trackInfo = {}) {
    if (trackInfo.title) this.currentTrack.title = trackInfo.title;
    if (trackInfo.artist) this.currentTrack.artist = trackInfo.artist;

    this.mountModal();

    const titleEl = this.modal.querySelector('#vis-title');
    const artistEl = this.modal.querySelector('#vis-artist');
    if (titleEl) titleEl.textContent = this.currentTrack.title;
    if (artistEl) artistEl.textContent = this.currentTrack.artist;

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.modal.classList.add('active');
    this.isActive = true;

    // Orientation lock attempt (where supported)
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    } catch (e) {}

    this.resizeCanvas();
    this.startRenderLoop();
  }

  close() {
    if (!this.isActive) return;
    this.isActive = false;
    if (this.modal) {
      this.modal.classList.remove('active');
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    // Unlock screen orientation if previously locked
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch (e) {}
  }

  startRenderLoop() {
    let tick = 0;

    const render = () => {
      if (!this.isActive) return;
      tick++;

      if (this.analyser) {
        this.analyser.getByteFrequencyData(this.dataArray);
        this.analyser.getByteTimeDomainData(this.timeArray);
      } else {
        // Fallback procedural frequencies if audio context direct source not attached
        if (!this.dataArray) this.dataArray = new Uint8Array(128);
        for (let i = 0; i < 128; i++) {
          this.dataArray[i] = 40 + Math.sin(tick * 0.05 + i * 0.2) * 35;
        }
      }

      this.ctx.fillStyle = 'rgba(2, 4, 10, 0.22)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      switch (this.mode) {
        case 'aurora':
          this.drawAurora(tick);
          break;
        case 'spectrum':
          this.drawCircularSpectrum(tick);
          break;
        case 'bars':
          this.drawFrequencyBars(tick);
          break;
        case 'waveform':
          this.drawWaveform(tick);
          break;
        case 'pulse':
          this.drawPulseRings(tick);
          break;
        case 'cosmic':
          this.drawCosmicWaves(tick);
          break;
        default:
          this.drawAurora(tick);
      }

      this.animationId = requestAnimationFrame(render);
    };

    this.animationId = requestAnimationFrame(render);
  }

  drawAurora(tick) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const avg = this.getAverageFrequency();

    // Multilayer wavy Aurora curtains
    for (let layer = 0; layer < 4; layer++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, h);

      for (let x = 0; x <= w; x += 15) {
        const bin = Math.floor((x / w) * (this.dataArray.length / 2));
        const freqVal = (this.dataArray[bin] || 0) * 0.9;
        const wave = Math.sin(x * 0.005 + tick * 0.02 + layer) * 80;
        const y = h * 0.65 - wave - freqVal * (1 + layer * 0.3) + layer * 40;
        this.ctx.lineTo(x, y);
      }

      this.ctx.lineTo(w, h);
      this.ctx.closePath();

      const grad = this.ctx.createLinearGradient(0, h * 0.3, 0, h);
      if (layer === 0) {
        grad.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
        grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      } else if (layer === 1) {
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      } else if (layer === 2) {
        grad.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
        grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else {
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      }

      this.ctx.fillStyle = grad;
      this.ctx.fill();
    }
  }

  drawCircularSpectrum(tick) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const baseRadius = Math.min(cx, cy) * 0.35;
    const bars = 90;
    const step = (Math.PI * 2) / bars;

    for (let i = 0; i < bars; i++) {
      const freq = (this.dataArray[i * 2] || 0) * 0.75;
      const angle = i * step + tick * 0.005;
      
      const x1 = cx + Math.cos(angle) * baseRadius;
      const y1 = cy + Math.sin(angle) * baseRadius;
      const x2 = cx + Math.cos(angle) * (baseRadius + freq);
      const y2 = cy + Math.sin(angle) * (baseRadius + freq);

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.strokeStyle = `hsl(${(i * 4 + tick) % 360}, 90%, 65%)`;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }
  }

  drawFrequencyBars(tick) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const count = 64;
    const barWidth = (w / count) - 4;

    for (let i = 0; i < count; i++) {
      const val = (this.dataArray[i * 2] || 0) / 255;
      const barHeight = val * (h * 0.7);
      const x = i * (barWidth + 4);
      const y = h - barHeight;

      const grad = this.ctx.createLinearGradient(0, y, 0, h);
      grad.addColorStop(0, '#00e5ff');
      grad.addColorStop(0.5, '#3b82f6');
      grad.addColorStop(1, '#a855f7');

      this.ctx.fillStyle = grad;
      this.ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  drawWaveform(tick) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!this.timeArray) return;

    this.ctx.beginPath();
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = '#00e5ff';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#00e5ff';

    const sliceWidth = w / this.timeArray.length;
    let x = 0;

    for (let i = 0; i < this.timeArray.length; i++) {
      const v = this.timeArray[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
      x += sliceWidth;
    }

    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  drawPulseRings(tick) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const avg = this.getAverageFrequency();

    for (let r = 1; r <= 5; r++) {
      const radius = (r * 70 + (tick * 2) % 350) + avg * 0.4;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(0, 229, 255, ${Math.max(0, 1 - radius / 500)})`;
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();
    }
  }

  drawCosmicWaves(tick) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cols = 24;
    const rows = 12;
    const cellW = w / cols;
    const cellH = h / rows;

    for (let r = 0; r < rows; r++) {
      this.ctx.beginPath();
      for (let c = 0; c < cols; c++) {
        const bin = (c + r * 2) % (this.dataArray.length / 2);
        const freq = (this.dataArray[bin] || 0) * 0.4;
        const x = c * cellW;
        const y = r * cellH + Math.sin(c * 0.3 + tick * 0.05) * 20 - freq;
        if (c === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.strokeStyle = `rgba(168, 85, 247, 0.45)`;
      this.ctx.lineWidth = 1.8;
      this.ctx.stroke();
    }
  }

  getAverageFrequency() {
    if (!this.dataArray || !this.dataArray.length) return 0;
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return sum / this.dataArray.length;
  }
}

export const visualizer = new AudioVisualizer();
