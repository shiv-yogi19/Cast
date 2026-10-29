/**
 * CAST — Image Viewer with Animated SVG Waterdrop
 * Features pan/zoom canvas, rotation, 1:1, double-tap zoom, swipe gestures,
 * and strict Single-Image vs Multiple-Image rules inside Waterdrop.
 */

import { getIconSvg } from './icons.js';
import { WaterdropController } from './waterdrop.js';
import { settings } from './settings.js';

export class ImageViewer {
  constructor(containerId = 'image-viewer-root') {
    this.containerId = containerId;
    this.container = null;
    this.stage = null;
    this.imgElement = null;
    this.waterdrop = null;

    this.images = [];
    this.currentIndex = 0;

    // Transform state
    this.scale = 1.0;
    this.rotation = 0;
    this.translateX = 0;
    this.translateY = 0;

    // Interaction tracking
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.lastTap = 0;
  }

  mount(parentEl) {
    if (!parentEl) return;
    this.container = parentEl;
    this.container.innerHTML = `
      <div class="image-viewer-stage" id="iv-stage" style="position:relative; width:100%; height:100%; min-height:480px; overflow:hidden; background:#02050e; border-radius:var(--radius-lg); display:flex; align-items:center; justify-content:center; cursor:grab; user-select:none; touch-action:none;">
        <img class="viewer-img" id="iv-img" src="" alt="Viewing Image" style="max-width:100%; max-height:100%; object-fit:contain; transition:transform 0.15s ease; will-change:transform; pointer-events:none; display:none;" />
        
        <div class="empty-image-prompt" id="iv-empty" style="text-align:center; color:var(--text-muted);">
          ${getIconSvg('nav-images', 'cast-icon-xl')}
          <p style="margin-top:12px; font-size:14px;">Select or drop images to view</p>
        </div>

        <!-- Thumbnails Strip for Multi-Image -->
        <div class="thumbnails-filmstrip" id="iv-thumbs" style="position:absolute; top:20px; left:50%; transform:translateX(-50%); display:none; gap:8px; padding:6px 12px; background:rgba(9, 14, 32, 0.75); backdrop-filter:blur(16px); border:1px solid var(--border-glass-dim); border-radius:var(--radius-full); z-index:40; max-width:85vw; overflow-x:auto;"></div>
      </div>
    `;

    this.stage = this.container.querySelector('#iv-stage');
    this.imgElement = this.container.querySelector('#iv-img');

    this.initWaterdrop();
    this.bindGestures();
  }

  initWaterdrop() {
    this.waterdrop = new WaterdropController({
      position: settings.get('waterdropPosition') || 'bottom-right',
      autoCollapseSeconds: settings.get('waterdropCollapseTimer') || 4,
      buttons: [
        { type: 'counter', id: 'iv-wd-counter', text: '1 / 1', className: 'wd-single-nav' },
        { action: 'prev', icon: 'chevron-left', label: 'Previous Image', className: 'wd-single-nav' },
        { action: 'next', icon: 'chevron-right', label: 'Next Image', className: 'wd-single-nav' },
        { type: 'separator', className: 'wd-single-nav' },
        { action: 'zoom-in', icon: 'zoom-in', label: 'Zoom In' },
        { action: 'zoom-out', icon: 'zoom-out', label: 'Zoom Out' },
        { action: 'actual-size', icon: 'actual-size', label: 'Actual Size 1:1' },
        { action: 'fit', icon: 'fit-screen', label: 'Fit to Screen' },
        { action: 'rotate', icon: 'rotate-cw', label: 'Rotate 90 Degrees' },
        { type: 'separator' },
        { action: 'info', icon: 'info', label: 'Image Information' },
        { action: 'download', icon: 'download', label: 'Download Image' },
        { action: 'fullscreen', icon: 'fullscreen', label: 'Fullscreen' },
      ],
      onAction: (action) => this.handleAction(action),
    });

    this.waterdrop.mount(this.stage);
  }

  handleAction(action) {
    switch (action) {
      case 'zoom-in':
        this.zoom(1.25);
        break;
      case 'zoom-out':
        this.zoom(0.8);
        break;
      case 'actual-size':
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;
        this.applyTransform();
        break;
      case 'fit':
        this.resetTransform();
        break;
      case 'rotate':
        this.rotation = (this.rotation + 90) % 360;
        this.applyTransform();
        break;
      case 'prev':
        this.showPrevious();
        break;
      case 'next':
        this.showNext();
        break;
      case 'fullscreen':
        this.toggleFullscreen();
        break;
      case 'download':
        this.downloadCurrent();
        break;
      case 'info':
        this.showImageInfo();
        break;
    }
  }

  loadImages(imgItems) {
    if (!Array.isArray(imgItems)) imgItems = [imgItems];
    this.images = imgItems;
    this.currentIndex = 0;
    this.displayImage(0);
    this.updateRules();
  }

  displayImage(index) {
    if (index < 0 || index >= this.images.length) return;
    this.currentIndex = index;
    const current = this.images[index];

    this.imgElement.src = current.url;
    this.imgElement.style.display = 'block';
    this.container.querySelector('#iv-empty').style.display = 'none';

    this.resetTransform();
    this.updateCounter();
    this.renderThumbnails();
  }

  updateRules() {
    const isSingle = this.images.length <= 1;
    this.waterdrop.setHiddenForSingleItem(isSingle);

    const thumbs = this.container.querySelector('#iv-thumbs');
    if (thumbs) {
      thumbs.style.display = isSingle ? 'none' : 'flex';
    }
  }

  updateCounter() {
    const text = `${this.currentIndex + 1} / ${this.images.length}`;
    this.waterdrop.updateCounter(text);
  }

  renderThumbnails() {
    const thumbs = this.container.querySelector('#iv-thumbs');
    if (!thumbs || this.images.length <= 1) return;

    thumbs.innerHTML = this.images.map((img, idx) => `
      <img src="${img.url}" data-idx="${idx}" alt="thumb" style="width:36px; height:36px; object-fit:cover; border-radius:6px; cursor:pointer; opacity:${idx === this.currentIndex ? '1' : '0.5'}; border:${idx === this.currentIndex ? '2px solid var(--accent-cyan)' : '1px solid transparent'}; transition:opacity 0.2s;" />
    `).join('');

    thumbs.querySelectorAll('img').forEach(th => {
      th.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        this.displayImage(idx);
      });
    });
  }

  showNext() {
    if (this.currentIndex < this.images.length - 1) {
      this.displayImage(this.currentIndex + 1);
    }
  }

  showPrevious() {
    if (this.currentIndex > 0) {
      this.displayImage(this.currentIndex - 1);
    }
  }

  zoom(factor) {
    this.scale = Math.max(0.2, Math.min(8.0, this.scale * factor));
    this.applyTransform();
  }

  resetTransform() {
    this.scale = 1.0;
    this.rotation = 0;
    this.translateX = 0;
    this.translateY = 0;
    this.applyTransform();
  }

  applyTransform() {
    if (!this.imgElement) return;
    this.imgElement.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale}) rotate(${this.rotation}deg)`;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.stage.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  downloadCurrent() {
    const current = this.images[this.currentIndex];
    if (!current || !current.url) return;
    const a = document.createElement('a');
    a.href = current.url;
    a.download = current.name || 'cast-image.png';
    a.click();
  }

  showImageInfo() {
    const current = this.images[this.currentIndex];
    if (!current) return;
    const w = this.imgElement.naturalWidth || 'Unknown';
    const h = this.imgElement.naturalHeight || 'Unknown';
    alert(`
Image Information:
File Name: ${current.name}
File Size: ${current.formattedSize || 'N/A'}
Resolution: ${w} x ${h} px
Format: ${current.mime || 'Image'}
Index: ${this.currentIndex + 1} of ${this.images.length}
    `);
  }

  bindGestures() {
    // Mouse drag / pan
    this.stage.addEventListener('mousedown', (e) => {
      if (e.target.closest('.waterdrop-container') || e.target.closest('#iv-thumbs')) return;
      this.isDragging = true;
      this.dragStartX = e.clientX - this.translateX;
      this.dragStartY = e.clientY - this.translateY;
      this.stage.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.translateX = e.clientX - this.dragStartX;
      this.translateY = e.clientY - this.dragStartY;
      this.applyTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      if (this.stage) this.stage.style.cursor = 'grab';
    });

    // Wheel zoom
    this.stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      this.zoom(factor);
    }, { passive: false });

    // Touch swipe & double tap
    this.stage.addEventListener('touchstart', (e) => {
      if (e.target.closest('.waterdrop-container') || e.target.closest('#iv-thumbs')) return;
      const t = e.touches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;

      // Double-tap zoom
      const now = Date.now();
      if (now - this.lastTap < 350) {
        if (this.scale > 1.2) {
          this.resetTransform();
        } else {
          this.zoom(2.0);
        }
      }
      this.lastTap = now;
    }, { passive: true });

    this.stage.addEventListener('touchend', (e) => {
      if (e.target.closest('.waterdrop-container') || e.target.closest('#iv-thumbs')) return;
      if (e.changedTouches.length === 0) return;
      const t = e.changedTouches[0];
      const deltaX = t.clientX - this.touchStartX;
      const deltaY = t.clientY - this.touchStartY;

      // Horizontal swipe navigation if not zoomed in
      if (this.scale <= 1.1 && Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
        if (deltaX < 0) {
          this.showNext();
        } else {
          this.showPrevious();
        }
      }
    }, { passive: true });
  }
}
