/**
 * CAST — DVD-Style "NO SIGNAL" Screensaver Animation
 * Classic bouncing logo physics with collision edge detection,
 * neon glow cycling, and smooth transitions when media is cast.
 */

export class NoSignalScreensaver {
  constructor(containerId = 'no-signal-container') {
    this.container = null;
    this.containerId = containerId;
    this.box = null;
    this.logoCard = null;
    this.animationFrame = null;

    // Physics
    this.x = 80;
    this.y = 80;
    this.vx = 2.4;
    this.vy = 2.0;
    this.boxWidth = 160;
    this.boxHeight = 60;
    
    // Glow color palette on bounce
    this.glowColors = ['glow-cyan', 'glow-purple', 'glow-blue', 'glow-emerald'];
    this.currentColorIdx = 0;
    this.isRunning = false;
  }

  mount(parentEl) {
    if (!parentEl) return;
    this.container = parentEl;
    this.container.innerHTML = `
      <div class="no-signal-stage" id="${this.containerId}">
        <div class="no-signal-badge">
          <span class="blink-dot"></span>
          <span>NO SIGNAL</span>
        </div>
        <div class="dvd-bounce-box" id="dvd-bounce-element">
          <div class="dvd-logo-card glow-cyan" id="dvd-logo-card">
            <svg class="cast-icon cast-icon-lg" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M4 22 A 6 6 0 0 1 10 28" />
              <path d="M4 16 A 12 12 0 0 1 16 28" />
              <path d="M4 10 A 18 18 0 0 1 22 28" />
              <rect x="3" y="4" width="26" height="20" rx="3" stroke-dasharray="20 100" />
              <circle cx="4" cy="28" r="1.5" fill="currentColor"/>
            </svg>
            <span class="dvd-logo-text">CAST</span>
          </div>
        </div>
      </div>
    `;

    this.box = this.container.querySelector('#dvd-bounce-element');
    this.logoCard = this.container.querySelector('#dvd-logo-card');
    this.start();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    const step = () => {
      if (!this.isRunning || !this.container) return;
      this.updatePhysics();
      this.animationFrame = requestAnimationFrame(step);
    };

    this.animationFrame = requestAnimationFrame(step);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  updatePhysics() {
    const stage = this.container.querySelector('.no-signal-stage');
    if (!stage || !this.box) return;

    const bounds = stage.getBoundingClientRect();
    const maxX = bounds.width - this.boxWidth;
    const maxY = bounds.height - this.boxHeight;

    if (maxX <= 10 || maxY <= 10) return;

    this.x += this.vx;
    this.y += this.vy;

    let collided = false;

    // Bounce horizontally
    if (this.x <= 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx);
      collided = true;
    } else if (this.x >= maxX) {
      this.x = maxX;
      this.vx = -Math.abs(this.vx);
      collided = true;
    }

    // Bounce vertically
    if (this.y <= 0) {
      this.y = 0;
      this.vy = Math.abs(this.vy);
      collided = true;
    } else if (this.y >= maxY) {
      this.y = maxY;
      this.vy = -Math.abs(this.vy);
      collided = true;
    }

    if (collided) {
      this.cycleColor();
    }

    this.box.style.transform = `translate3d(${this.x.toFixed(1)}px, ${this.y.toFixed(1)}px, 0)`;
  }

  cycleColor() {
    if (!this.logoCard) return;
    this.logoCard.classList.remove(this.glowColors[this.currentColorIdx]);
    this.currentColorIdx = (this.currentColorIdx + 1) % this.glowColors.length;
    this.logoCard.classList.add(this.glowColors[this.currentColorIdx]);
  }
}
