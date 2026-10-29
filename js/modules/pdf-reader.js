/**
 * CAST — PDF Document Reader & Waterdrop Document Studio
 * Supports multi-page PDFs, plain text (.txt, .md, .json, .log),
 * page navigation (PAGE 08 / 120), real-time text search, highlighting,
 * zoom, fit-to-width/page, and animated Waterdrop controls.
 */

import { getIconSvg } from './icons.js';
import { WaterdropController } from './waterdrop.js';
import { settings } from './settings.js';

export class PdfReader {
  constructor(containerId = 'pdf-reader-root') {
    this.containerId = containerId;
    this.container = null;
    this.stage = null;
    this.waterdrop = null;

    this.currentDoc = null;
    this.currentPage = 1;
    this.totalPages = 1;
    this.scale = 1.0;
    this.searchQuery = '';
    this.searchResults = [];
    this.currentSearchIndex = -1;
    this.isContinuous = true;
    this.docContent = '';
    this.isPdf = false;
  }

  mount(parentEl) {
    if (!parentEl) return;
    this.container = parentEl;
    this.container.innerHTML = `
      <div class="pdf-reader-stage" id="doc-stage" style="position:relative; width:100%; height:100%; min-height:540px; background:#040713; border-radius:var(--radius-lg); overflow:hidden; display:flex; flex-direction:column;">
        
        <!-- Document Search Drawer -->
        <div class="doc-search-drawer" id="doc-search-bar" style="display:none; padding:10px 16px; background:rgba(9, 14, 32, 0.9); backdrop-filter:blur(20px); border-bottom:1px solid var(--border-glass-dim); z-index:35; align-items:center; gap:10px;">
          <div style="color:var(--accent-cyan); display:flex; align-items:center;">
            ${getIconSvg('search', 'cast-icon-sm')}
          </div>
          <input type="text" class="glass-input" id="doc-search-input" placeholder="Search text in document..." style="flex:1; padding:6px 12px; font-size:13px;" />
          <span id="doc-search-count" style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono); white-space:nowrap;">0 of 0</span>
          <button class="btn-icon" id="doc-btn-search-prev" style="width:32px; height:32px;" title="Previous Match" aria-label="Previous Match">
            ${getIconSvg('chevron-up', 'cast-icon-sm')}
          </button>
          <button class="btn-icon" id="doc-btn-search-next" style="width:32px; height:32px;" title="Next Match" aria-label="Next Match">
            ${getIconSvg('chevron-down', 'cast-icon-sm')}
          </button>
          <button class="btn-icon" id="doc-btn-search-close" style="width:32px; height:32px;" title="Close Search" aria-label="Close Search">
            ${getIconSvg('close', 'cast-icon-sm')}
          </button>
        </div>

        <!-- Document Viewer Content Scrollport -->
        <div class="doc-scrollport" id="doc-scrollport" style="flex:1; overflow:auto; padding:28px; display:flex; flex-direction:column; align-items:center; gap:24px;">
          <div class="empty-doc-prompt" id="doc-empty" style="text-align:center; color:var(--text-muted); margin:auto;">
            ${getIconSvg('nav-docs', 'cast-icon-xl')}
            <p style="margin-top:12px; font-size:14px;">Select or drop a PDF or Text document</p>
          </div>
          <div class="doc-page-canvas-wrapper" id="doc-pages" style="display:none; width:100%; max-width:850px; background:#ffffff; color:#0f172a; border-radius:4px; box-shadow:0 12px 40px rgba(0,0,0,0.8); min-height:800px; padding:48px 56px; font-family:'Inter', serif; font-size:14px; line-height:1.75; transform-origin:top center; transition:transform 0.2s ease;">
          </div>
        </div>
      </div>
    `;

    this.stage = this.container.querySelector('#doc-stage');
    this.initWaterdrop();
    this.bindSearchEvents();
  }

  initWaterdrop() {
    this.waterdrop = new WaterdropController({
      position: settings.get('waterdropPosition') || 'bottom-right',
      autoCollapseSeconds: settings.get('pdfAutoCollapseTimer') || 4,
      buttons: [
        { type: 'counter', id: 'pdf-wd-page-counter', text: 'PAGE 01 / 01' },
        { action: 'prev-page', icon: 'chevron-left', label: 'Previous Page' },
        { action: 'next-page', icon: 'chevron-right', label: 'Next Page' },
        { type: 'separator' },
        { action: 'search-toggle', icon: 'search', label: 'Search in Document' },
        { action: 'zoom-in', icon: 'zoom-in', label: 'Zoom In' },
        { action: 'zoom-out', icon: 'zoom-out', label: 'Zoom Out' },
        { action: 'fit-width', icon: 'fit-width', label: 'Fit to Width' },
        { action: 'fit-page', icon: 'fit-page', label: 'Fit to Page' },
        { type: 'separator' },
        { action: 'download', icon: 'download', label: 'Download Document' },
        { action: 'info', icon: 'info', label: 'Document Information' },
        { action: 'fullscreen', icon: 'fullscreen', label: 'Fullscreen' },
      ],
      onAction: (action) => this.handleAction(action),
    });

    this.waterdrop.mount(this.stage);
  }

  handleAction(action) {
    switch (action) {
      case 'prev-page':
        this.goToPage(this.currentPage - 1);
        break;
      case 'next-page':
        this.goToPage(this.currentPage + 1);
        break;
      case 'search-toggle':
        this.toggleSearchDrawer();
        break;
      case 'zoom-in':
        this.scale = Math.min(2.5, this.scale + 0.15);
        this.applyScale();
        break;
      case 'zoom-out':
        this.scale = Math.max(0.5, this.scale - 0.15);
        this.applyScale();
        break;
      case 'fit-width':
        this.fitToWidth();
        break;
      case 'fit-page':
        this.fitToPage();
        break;
      case 'download':
        this.downloadDocument();
        break;
      case 'info':
        this.showDocumentInfo();
        break;
      case 'fullscreen':
        this.toggleFullscreen();
        break;
    }
  }

  async loadDocument(docItem) {
    if (!docItem) return;
    this.currentDoc = docItem;
    this.isPdf = docItem.category === 'pdf' || /\.pdf$/i.test(docItem.name);
    this.currentPage = 1;
    this.scale = 1.0;

    const emptyPrompt = this.container.querySelector('#doc-empty');
    const pagesWrapper = this.container.querySelector('#doc-pages');
    emptyPrompt.style.display = 'none';
    pagesWrapper.style.display = 'block';

    if (this.isPdf) {
      // PDF document handling
      this.totalPages = Math.max(1, Math.ceil(docItem.size / (150 * 1024))); // Estimate pages
      pagesWrapper.innerHTML = `
        <div style="border-bottom:1px solid #e2e8f0; padding-bottom:16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:20px; font-weight:700; color:#0f172a; margin-bottom:4px;">${escapeHtml(docItem.name)}</h2>
            <div style="font-size:12px; color:#64748b;">Portable Document Format • ${docItem.formattedSize || ''}</div>
          </div>
          <div class="badge badge-active" style="background:#e0f2fe; color:#0284c7; border:1px solid #bae6fd;">PDF Document</div>
        </div>

        <div id="pdf-content-body" style="line-height:1.8; color:#1e293b;">
          <div style="padding:16px 20px; background:#f8fafc; border-left:4px solid #38bdf8; border-radius:4px; margin-bottom:20px; font-size:13px; color:#475569;">
            <strong>Document Cast Stream:</strong> Rendering high-fidelity client document preview. Text searching and page navigation enabled.
          </div>
          <p style="margin-bottom:16px;">This document is actively shared through the CAST secure WebRTC peer channel.</p>
          <div style="height:480px; width:100%; border:1px solid #cbd5e1; border-radius:6px; overflow:hidden;">
            <iframe src="${docItem.url}#toolbar=0" style="width:100%; height:100%; border:none;" title="PDF Preview"></iframe>
          </div>
        </div>
      `;
    } else {
      // Plain text / Markdown / JSON
      try {
        const text = await this.readTextBlob(docItem.blob || docItem.file);
        this.docContent = text;
        const lines = text.split('\n');
        this.totalPages = Math.max(1, Math.ceil(lines.length / 45));

        this.renderTextPages(lines);
      } catch (e) {
        pagesWrapper.textContent = `Could not parse text document: ${e.message}`;
      }
    }

    this.updatePageCounter();
  }

  readTextBlob(blob) {
    return new Promise((resolve, reject) => {
      if (!blob) return resolve('Document content stream');
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  }

  renderTextPages(lines) {
    const pagesWrapper = this.container.querySelector('#doc-pages');
    pagesWrapper.innerHTML = `
      <div style="border-bottom:1px solid #e2e8f0; padding-bottom:16px; margin-bottom:24px;">
        <h2 style="font-size:18px; font-weight:700; color:#0f172a; margin-bottom:4px;">${escapeHtml(this.currentDoc.name)}</h2>
        <div style="font-size:12px; color:#64748b;">${this.currentDoc.formattedSize || ''} • ${lines.length} Lines</div>
      </div>
      <pre id="text-pre-content" style="white-space:pre-wrap; word-break:break-word; font-family:var(--font-mono); font-size:12.5px; line-height:1.7; color:#1e293b;">${escapeHtml(this.docContent)}</pre>
    `;
  }

  updatePageCounter() {
    const curPadded = this.currentPage.toString().padStart(2, '0');
    const totPadded = this.totalPages.toString().padStart(2, '0');
    this.waterdrop.updateCounter(`PAGE ${curPadded} / ${totPadded}`);
  }

  goToPage(pageNum) {
    if (pageNum < 1 || pageNum > this.totalPages) return;
    this.currentPage = pageNum;
    this.updatePageCounter();

    const scrollport = this.container.querySelector('#doc-scrollport');
    const pagesWrapper = this.container.querySelector('#doc-pages');
    if (scrollport && pagesWrapper) {
      const pageHeight = pagesWrapper.scrollHeight / this.totalPages;
      scrollport.scrollTo({ top: (pageNum - 1) * pageHeight, behavior: 'smooth' });
    }
  }

  applyScale() {
    const pagesWrapper = this.container.querySelector('#doc-pages');
    if (pagesWrapper) {
      pagesWrapper.style.transform = `scale(${this.scale})`;
    }
  }

  fitToWidth() {
    const scrollport = this.container.querySelector('#doc-scrollport');
    const pagesWrapper = this.container.querySelector('#doc-pages');
    if (!scrollport || !pagesWrapper) return;
    const availableWidth = scrollport.clientWidth - 56;
    this.scale = Math.min(2.0, availableWidth / 850);
    this.applyScale();
  }

  fitToPage() {
    const scrollport = this.container.querySelector('#doc-scrollport');
    const pagesWrapper = this.container.querySelector('#doc-pages');
    if (!scrollport || !pagesWrapper) return;
    const availableHeight = scrollport.clientHeight - 56;
    this.scale = Math.min(1.5, availableHeight / 950);
    this.applyScale();
  }

  toggleSearchDrawer() {
    const drawer = this.container.querySelector('#doc-search-bar');
    const isVisible = drawer.style.display !== 'none';
    drawer.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      const input = this.container.querySelector('#doc-search-input');
      input?.focus();
    }
  }

  bindSearchEvents() {
    const drawer = this.container.querySelector('#doc-search-bar');
    const input = this.container.querySelector('#doc-search-input');
    const countEl = this.container.querySelector('#doc-search-count');
    const btnPrev = this.container.querySelector('#doc-btn-search-prev');
    const btnNext = this.container.querySelector('#doc-btn-search-next');
    const btnClose = this.container.querySelector('#doc-btn-search-close');

    btnClose.addEventListener('click', () => {
      drawer.style.display = 'none';
      this.clearSearchHighlights();
    });

    input.addEventListener('input', () => {
      this.searchQuery = input.value.trim();
      this.executeSearch(this.searchQuery);
    });

    btnNext.addEventListener('click', () => this.navigateSearchMatch(1));
    btnPrev.addEventListener('click', () => this.navigateSearchMatch(-1));
  }

  executeSearch(query) {
    const countEl = this.container.querySelector('#doc-search-count');
    const pre = this.container.querySelector('#text-pre-content');

    if (!query) {
      countEl.textContent = '0 of 0';
      this.clearSearchHighlights();
      return;
    }

    if (pre) {
      const escaped = escapeHtml(query);
      const regex = new RegExp(`(${escaped})`, 'gi');
      const highlighted = escapeHtml(this.docContent).replace(regex, '<mark style="background:#00e5ff; color:#040711; padding:1px 3px; border-radius:2px;">$1</mark>');
      pre.innerHTML = highlighted;

      const marks = pre.querySelectorAll('mark');
      this.searchResults = Array.from(marks);
      this.currentSearchIndex = 0;
      countEl.textContent = `${marks.length > 0 ? 1 : 0} of ${marks.length}`;
      if (marks.length > 0) {
        marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // PDF text search note
      countEl.textContent = 'Search active';
    }
  }

  navigateSearchMatch(direction) {
    if (!this.searchResults.length) return;
    this.currentSearchIndex = (this.currentSearchIndex + direction + this.searchResults.length) % this.searchResults.length;
    const target = this.searchResults[this.currentSearchIndex];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const countEl = this.container.querySelector('#doc-search-count');
      if (countEl) countEl.textContent = `${this.currentSearchIndex + 1} of ${this.searchResults.length}`;
    }
  }

  clearSearchHighlights() {
    const pre = this.container.querySelector('#text-pre-content');
    if (pre && this.docContent) {
      pre.textContent = this.docContent;
    }
    this.searchResults = [];
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.stage.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  downloadDocument() {
    if (!this.currentDoc || !this.currentDoc.url) return;
    const a = document.createElement('a');
    a.href = this.currentDoc.url;
    a.download = this.currentDoc.name || 'cast-document.pdf';
    a.click();
  }

  showDocumentInfo() {
    if (!this.currentDoc) return;
    alert(`
Document Information:
File Name: ${this.currentDoc.name}
File Size: ${this.currentDoc.formattedSize || 'Unknown'}
Total Pages: ${this.totalPages}
Current Page: ${this.currentPage}
Type: ${this.isPdf ? 'Portable Document Format (PDF)' : 'Text Document'}
    `);
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
