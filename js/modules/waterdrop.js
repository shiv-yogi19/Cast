/**
 * CAST — Animated SVG Waterdrop Control Component
 * Floating liquid-morph bubble expanding into glass control bar
 * Features configurable idle collapse timer (3-6s), interaction lock,
 * and SVG-only iconography.
 */

import { getIconSvg } from './icons.js';
import { settings } from './settings.js';

export class WaterdropController {
  constructor(options = {}) {
    this.container = null;
    this.bubble = null;
    this.panel = null;
    this.isExpanded = false;
    this.idleTimer = null;
    this.isInteracting = false;
    this.position = options.position || settings.get('waterdropPosition') || 'bottom-right';
    this.autoCollapseSeconds = options.autoCollapseSeconds || settings.get('waterdropCollapseTimer') || 4;
    this.buttons = options.buttons || [];
    this.onAction = options.onAction || (() => {});
  }

  mount(parentEl) {
    if (!parentEl) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = `waterdrop-container waterdrop-pos-${this.position}`;
    wrapper.innerHTML = `
      <!-- Closed State: Floating Bubble -->
      <div class="waterdrop-bubble" title="Open Controls" aria-label="Open Waterdrop Controls" role="button" tabindex="0">
        ${getIconSvg('waterdrop')}
      </div>

      <!-- Expanded State: Liquid Morph Panel -->
      <div class="waterdrop-panel" role="toolbar" aria-label="Media Controls">
        <div class="waterdrop-buttons-slot" style="display:flex; align-items:center; gap:6px;"></div>
        <div class="wd-separator"></div>
        <button class="wd-btn wd-btn-close" title="Collapse" aria-label="Collapse Controls">
          ${getIconSvg('close')}
        </button>
      </div>
    `;

    parentEl.appendChild(wrapper);
    this.container = wrapper;
    this.bubble = wrapper.querySelector('.waterdrop-bubble');
    this.panel = wrapper.querySelector('.waterdrop-panel');

    this.renderButtons();
    this.bindEvents();
  }

  renderButtons() {
    const slot = this.panel.querySelector('.waterdrop-buttons-slot');
    if (!slot) return;

    slot.innerHTML = this.buttons.map(b => {
      if (b.type === 'separator') {
        return '<div class="wd-separator"></div>';
      }
      if (b.type === 'counter') {
        return `<span class="wd-counter-badge ${b.className || ''}" id="${b.id || ''}">${b.text || '1 / 1'}</span>`;
      }
      return `
        <button class="wd-btn ${b.className || ''}" id="${b.id || ''}" data-action="${b.action}" title="${b.label}" aria-label="${b.label}">
          ${getIconSvg(b.icon)}
        </button>
      `;
    }).join('');
  }

  bindEvents() {
    // Bubble click -> expand
    this.bubble.addEventListener('click', (e) => {
      e.stopPropagation();
      this.expand();
    });

    // Close button -> collapse
    this.panel.querySelector('.wd-btn-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.collapse();
    });

    // Action buttons click delegation
    this.panel.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        const action = btn.getAttribute('data-action');
        this.resetIdleTimer();
        this.onAction(action, btn);
      }
    });

    // Interaction lock: prevent collapse during active hover or touch
    this.panel.addEventListener('mouseenter', () => { this.isInteracting = true; });
    this.panel.addEventListener('mouseleave', () => {
      this.isInteracting = false;
      this.resetIdleTimer();
    });
    this.panel.addEventListener('touchstart', () => { this.isInteracting = true; }, { passive: true });
    this.panel.addEventListener('touchend', () => {
      this.isInteracting = false;
      this.resetIdleTimer();
    });
  }

  expand() {
    this.isExpanded = true;
    this.container.classList.add('expanded');
    this.resetIdleTimer();
  }

  collapse() {
    this.isExpanded = false;
    this.container.classList.remove('expanded');
    if (this.idleTimer) clearTimeout(this.idleTimer);
  }

  resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (!this.isExpanded) return;

    const timeoutMs = (settings.get('waterdropCollapseTimer') || this.autoCollapseSeconds) * 1000;
    this.idleTimer = setTimeout(() => {
      if (!this.isInteracting) {
        this.collapse();
      }
    }, timeoutMs);
  }

  updateCounter(text) {
    const badge = this.panel?.querySelector('.wd-counter-badge');
    if (badge) badge.textContent = text;
  }

  setHiddenForSingleItem(hide) {
    const singleEls = this.panel?.querySelectorAll('.wd-single-nav');
    singleEls?.forEach(el => {
      el.classList.toggle('wd-single-hidden', hide);
    });
  }

  setPosition(position) {
    this.container.classList.remove('waterdrop-pos-bottom-right', 'waterdrop-pos-bottom-center', 'waterdrop-pos-bottom-left');
    this.container.classList.add(`waterdrop-pos-${position}`);
  }
}
