/**
 * CAST — Complete Media Casting & Streaming Platform
 * Main Orchestrator & Application Controller
 * Strict SVG-Only Policy • Liquid Glass Architecture • Created By Shiv Yogi
 */

import { getIconSvg, renderIcons } from './modules/icons.js';
import { settings, DEFAULT_SETTINGS } from './modules/settings.js';
import { pairing } from './modules/pairing.js';
import { mediaTransfer } from './modules/media-transfer.js';
import { MoviePlayer } from './modules/movie-player.js';
import { MusicPlayer } from './modules/music-player.js';
import { ImageViewer } from './modules/image-viewer.js';
import { PdfReader } from './modules/pdf-reader.js';
import { NoSignalScreensaver } from './modules/no-signal.js';
import { visualizer } from './modules/audio-visualizer.js';

class CastApp {
  constructor() {
    this.currentSection = 'home';
    this.moviePlayer = null;
    this.musicPlayer = null;
    this.imageViewer = null;
    this.pdfReader = null;
    this.noSignal = null;
    this.toasts = [];

    this.init();
  }

  async init() {
    // 1. Run Cinematic Intro Sequence (Strict Branding)
    this.runIntroSequence();

    // 2. Initialize Subsystems
    this.initPlayers();

    // 3. Bind Navigation & Device Layouts
    this.bindNavigation();

    // 4. Bind Pairing & Casting System
    this.bindPairingUi();

    // 5. Bind Media Upload & Transfer
    this.bindMediaUploads();

    // 6. Bind Settings Panel (12 Categories)
    this.bindSettingsUi();

    // 7. Initialize Battery Telemetry
    this.initBatteryTelemetry();

    // 8. Load Sample Media Demonstrations
    this.loadSampleDemonstrations();

    // 9. Check URL Pairing Parameters
    this.checkUrlPairing();

    // 10. Render any static SVG icons
    renderIcons(document);
  }

  // ------------------------------------------------------------------------
  // Cinematic Intro Sequence (Strict Branding Rules)
  // Sequence: CAST -> Created By Shiv Yogi -> Complete -> Open main website
  // Automatic completion, no skip button!
  // ------------------------------------------------------------------------
  runIntroSequence() {
    const introEl = document.getElementById('cinematic-intro');
    if (!introEl) return;

    // Intro completes after 3.2 seconds automatically
    setTimeout(() => {
      introEl.classList.add('intro-finished');
      setTimeout(() => {
        introEl.style.display = 'none';
      }, 850);
    }, 3200);
  }

  initPlayers() {
    this.moviePlayer = new MoviePlayer('movie-player-mount');
    this.musicPlayer = new MusicPlayer('music-player-mount');
    this.imageViewer = new ImageViewer('image-viewer-mount');
    this.pdfReader = new PdfReader('pdf-reader-mount');
    this.noSignal = new NoSignalScreensaver('no-signal-stage');

    // Mount players into their respective section DOM nodes
    const movieMount = document.getElementById('movie-player-mount');
    if (movieMount) this.moviePlayer.mount(movieMount);

    const musicMount = document.getElementById('music-player-mount');
    if (musicMount) this.musicPlayer.mount(musicMount);

    const imageMount = document.getElementById('image-viewer-mount');
    if (imageMount) this.imageViewer.mount(imageMount);

    const pdfMount = document.getElementById('pdf-reader-mount');
    if (pdfMount) this.pdfReader.mount(pdfMount);

    const noSignalMount = document.getElementById('no-signal-mount');
    if (noSignalMount) this.noSignal.mount(noSignalMount);
  }

  // ------------------------------------------------------------------------
  // Navigation & View Routing
  // ------------------------------------------------------------------------
  bindNavigation() {
    // Desktop Sidebar Links
    const sidebarLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('data-section');
        this.navigateTo(section);
      });
    });

    // Mobile Bottom Nav Links
    const bottomLinks = document.querySelectorAll('#mobile-bottom-nav .bottom-nav-item');
    bottomLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('data-section');
        this.navigateTo(section);
      });
    });

    // Mobile header settings button
    const btnMobileSettings = document.getElementById('btn-mobile-settings');
    btnMobileSettings?.addEventListener('click', () => this.navigateTo('settings'));
  }

  navigateTo(sectionName) {
    if (!sectionName) return;
    this.currentSection = sectionName;

    // Update Desktop Nav Active
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-section') === sectionName);
    });

    // Update Mobile Nav Active
    document.querySelectorAll('#mobile-bottom-nav .bottom-nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-section') === sectionName);
    });

    // Update Visible Workspace Section
    const allSections = document.querySelectorAll('.app-section');
    allSections.forEach(sec => {
      if (sec.id === `section-${sectionName}`) {
        sec.style.display = 'block';
        sec.classList.add('active');
      } else {
        sec.style.display = 'none';
        sec.classList.remove('active');
      }
    });

    // Header title update
    const titleEl = document.getElementById('desktop-header-title');
    const descEl = document.getElementById('desktop-header-desc');
    const sectionTitles = {
      home: { title: 'Media Casting Hub', desc: 'Real-time peer-to-peer media casting and streaming studio' },
      cast: { title: 'Sender Studio', desc: 'Broadcast movies, bulk music, images, and documents to paired receivers' },
      pair: { title: 'Pair & Watch', desc: 'Connect two devices using secure 6-digit codes or QR scan' },
      movies: { title: 'Movie Casting Studio', desc: 'Custom HTML5 cinema player with WebRTC state sync' },
      music: { title: 'Bulk Music Studio', desc: 'High-fidelity audio player and reactive Aurora visualizer' },
      images: { title: 'Liquid Image Viewer', desc: 'Multi-touch gallery with animated SVG Waterdrop controls' },
      documents: { title: 'Document Reader', desc: 'High-fidelity PDF and text reader with liquid document controls' },
      settings: { title: 'System Settings', desc: 'Fine-tune 12 global performance, appearance, and audio profiles' },
    };

    if (titleEl && sectionTitles[sectionName]) {
      titleEl.textContent = sectionTitles[sectionName].title;
    }
    if (descEl && sectionTitles[sectionName]) {
      descEl.textContent = sectionTitles[sectionName].desc;
    }
  }

  // ------------------------------------------------------------------------
  // Device Pairing System (QR Code, 6-digit code, WebRTC DataChannel)
  // ------------------------------------------------------------------------
  bindPairingUi() {
    const btnCreateSender = document.getElementById('btn-create-sender-session');
    const btnJoinReceiver = document.getElementById('btn-join-receiver');
    const inputPairCode = document.getElementById('input-receiver-code');
    const btnDisconnect = document.getElementById('btn-disconnect-session');
    const btnCopyPairUrl = document.getElementById('btn-copy-pair-url');

    // Sender: Create Pairing Session
    btnCreateSender?.addEventListener('click', async () => {
      try {
        const session = await pairing.createSenderSession();
        document.getElementById('sender-code-display').textContent = session.code;
        document.getElementById('sender-qr-container').innerHTML = session.qrSvg;
        document.getElementById('sender-pair-url').value = session.pairUrl;
        
        document.getElementById('sender-idle-box').style.display = 'none';
        document.getElementById('sender-active-box').style.display = 'block';

        this.showToast('Pairing session created! Share code or QR with Receiver.', 'info');
      } catch (err) {
        this.showToast(`Failed to create session: ${err.message}`, 'error');
      }
    });

    // Receiver: Enter 6-digit Code
    btnJoinReceiver?.addEventListener('click', async () => {
      const code = inputPairCode?.value;
      try {
        await pairing.joinAsReceiver(code);
        this.showToast('Connecting to Sender...', 'info');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // Copy Pairing URL button
    btnCopyPairUrl?.addEventListener('click', () => {
      const urlInput = document.getElementById('sender-pair-url');
      if (urlInput) {
        urlInput.select();
        navigator.clipboard?.writeText(urlInput.value);
        this.showToast('Pairing URL copied to clipboard!', 'success');
      }
    });

    // Disconnect button
    btnDisconnect?.addEventListener('click', () => {
      pairing.disconnect();
      this.updateConnectionStateUi('disconnected');
      this.showToast('Session disconnected.', 'info');
    });

    // Listen to pairing events
    pairing.on('statechange', (state) => {
      this.updateConnectionStateUi(state);
    });

    pairing.on('connected', (data) => {
      this.showToast(`Paired successfully as ${data.role.toUpperCase()}!`, 'success');
      this.updateConnectionStateUi('connected');
    });

    pairing.on('disconnected', () => {
      this.updateConnectionStateUi('disconnected');
    });

    pairing.on('timer-tick', (tick) => {
      const timerEl = document.getElementById('sender-timer-display');
      if (timerEl) timerEl.textContent = `Expires in ${tick.formatted}`;
    });

    pairing.on('session-expired', () => {
      this.showToast('Pairing session expired. Generate a new code to reconnect.', 'warning');
      document.getElementById('sender-idle-box').style.display = 'block';
      document.getElementById('sender-active-box').style.display = 'none';
    });

    pairing.on('peer-telemetry', (packet) => {
      this.updatePeerDeviceInfoUi(packet.deviceInfo, packet.battery);
    });
  }

  updateConnectionStateUi(state) {
    const dots = document.querySelectorAll('.status-dot');
    const badges = document.querySelectorAll('.connection-status-text');

    dots.forEach(dot => {
      dot.className = `status-dot ${state === 'connected' ? 'connected' : state === 'pairing' || state === 'connecting' ? 'pairing' : ''}`;
    });

    badges.forEach(b => {
      b.textContent = state.toUpperCase();
    });

    // DVD screensaver activation: when paired as Receiver and no media playing
    const receiverNoSignalBox = document.getElementById('receiver-no-signal-box');
    if (receiverNoSignalBox) {
      if (pairing.role === 'receiver' && state === 'connected') {
        receiverNoSignalBox.style.display = 'block';
        this.noSignal.start();
      } else {
        receiverNoSignalBox.style.display = 'none';
        this.noSignal.stop();
      }
    }
  }

  updatePeerDeviceInfoUi(info, battery) {
    const peerNameEl = document.getElementById('connected-peer-name');
    const peerScreenEl = document.getElementById('connected-peer-screen');
    const peerBatteryEl = document.getElementById('connected-peer-battery');

    if (peerNameEl) peerNameEl.textContent = info?.name || 'Connected Device';
    if (peerScreenEl) peerScreenEl.textContent = info?.screen || 'Unknown Resolution';
    
    if (peerBatteryEl) {
      if (battery && battery.supported) {
        peerBatteryEl.textContent = `${battery.level}% ${battery.charging ? '(Charging)' : ''}`;
      } else {
        peerBatteryEl.textContent = 'Battery Status Unavailable';
      }
    }
  }

  // ------------------------------------------------------------------------
  // Media Upload & Transfer Handlers
  // ------------------------------------------------------------------------
  bindMediaUploads() {
    // Movie Upload
    const movieInput = document.getElementById('upload-movie-input');
    movieInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      this.handleMovieFile(file);
    });

    // Bulk Music Upload
    const musicInput = document.getElementById('upload-music-input');
    musicInput?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      this.handleBulkMusicFiles(files);
    });

    // Images Upload
    const imageInput = document.getElementById('upload-image-input');
    imageInput?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      this.handleImageFiles(files);
    });

    // Document Upload
    const docInput = document.getElementById('upload-doc-input');
    docInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      this.handleDocumentFile(file);
    });

    // Incoming media listener from WebRTC
    mediaTransfer.on('media-ready', (item) => {
      this.showToast(`Received ${item.name} from paired sender!`, 'success');
      this.handleIncomingMedia(item);
    });

    mediaTransfer.on('incoming-progress', (prog) => {
      const bar = document.getElementById('transfer-progress-fill');
      const text = document.getElementById('transfer-progress-text');
      if (bar) bar.style.width = `${prog.progress}%`;
      if (text) text.textContent = `Receiving file... ${prog.progress}%`;
    });
  }

  handleMovieFile(file) {
    const meta = mediaTransfer.inspectFile(file);
    const url = mediaTransfer.createTrackedUrl(file);
    const movieItem = { ...meta, url, file };

    // Play locally
    this.moviePlayer.loadMovie(movieItem);
    this.navigateTo('movies');

    // Cast to paired receiver
    if (pairing.connection && pairing.connection.state === 'connected') {
      this.showToast(`Streaming ${file.name} to receiver...`, 'info');
      mediaTransfer.sendFile(file, 'movie');
    }
  }

  handleBulkMusicFiles(files) {
    const songs = files.map(file => {
      const meta = mediaTransfer.inspectFile(file);
      const url = mediaTransfer.createTrackedUrl(file);
      return { ...meta, url, file };
    });

    this.musicPlayer.addSongs(songs);
    this.navigateTo('music');

    // Transfer first song or playlist to receiver if paired
    if (pairing.connection && pairing.connection.state === 'connected' && files[0]) {
      this.showToast(`Casting audio playlist to receiver...`, 'info');
      mediaTransfer.sendFile(files[0], 'music');
    }
  }

  handleImageFiles(files) {
    const images = files.map(file => {
      const meta = mediaTransfer.inspectFile(file);
      const url = mediaTransfer.createTrackedUrl(file);
      return { ...meta, url, file };
    });

    this.imageViewer.loadImages(images);
    this.navigateTo('images');

    if (pairing.connection && pairing.connection.state === 'connected' && files[0]) {
      this.showToast(`Casting images to receiver...`, 'info');
      mediaTransfer.sendFile(files[0], 'image');
    }
  }

  handleDocumentFile(file) {
    const meta = mediaTransfer.inspectFile(file);
    const url = mediaTransfer.createTrackedUrl(file);
    const docItem = { ...meta, url, file };

    this.pdfReader.loadDocument(docItem);
    this.navigateTo('documents');

    if (pairing.connection && pairing.connection.state === 'connected') {
      this.showToast(`Casting document to receiver...`, 'info');
      mediaTransfer.sendFile(file, 'pdf');
    }
  }

  handleIncomingMedia(item) {
    // Hide DVD screensaver when media arrives
    const receiverNoSignalBox = document.getElementById('receiver-no-signal-box');
    if (receiverNoSignalBox) {
      receiverNoSignalBox.style.display = 'none';
      this.noSignal.stop();
    }

    if (item.category === 'movie') {
      this.moviePlayer.loadMovie(item);
      this.navigateTo('movies');
    } else if (item.category === 'music') {
      this.musicPlayer.addSongs([item]);
      this.navigateTo('music');
    } else if (item.category === 'image') {
      this.imageViewer.loadImages([item]);
      this.navigateTo('images');
    } else if (item.category === 'pdf' || item.category === 'document') {
      this.pdfReader.loadDocument(item);
      this.navigateTo('documents');
    }
  }

  // ------------------------------------------------------------------------
  // Settings Management (12 Functional Categories)
  // ------------------------------------------------------------------------
  bindSettingsUi() {
    // Category Tabs Switching
    const catButtons = document.querySelectorAll('.settings-cat-btn');
    const catSections = document.querySelectorAll('.settings-cat-content');

    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        catButtons.forEach(b => b.classList.toggle('active', b === btn));
        catSections.forEach(sec => {
          sec.style.display = sec.getAttribute('data-cat') === cat ? 'block' : 'none';
        });
      });
    });

    // Category 1: Appearance
    const selTheme = document.getElementById('setting-theme');
    selTheme?.addEventListener('change', (e) => settings.set('theme', e.target.value));

    const selAccent = document.getElementById('setting-accent');
    selAccent?.addEventListener('change', (e) => settings.set('accentColor', e.target.value));

    const selGlass = document.getElementById('setting-glass-intensity');
    selGlass?.addEventListener('change', (e) => settings.set('glassIntensity', e.target.value));

    const chkBgAnim = document.getElementById('setting-bg-effects');
    chkBgAnim?.addEventListener('change', (e) => settings.set('backgroundEffects', e.target.checked));

    const sliderBlur = document.getElementById('setting-blur-intensity');
    sliderBlur?.addEventListener('input', (e) => settings.set('blurIntensity', parseInt(e.target.value)));

    const selCorner = document.getElementById('setting-corner-radius');
    selCorner?.addEventListener('change', (e) => settings.set('cornerRadius', e.target.value));

    const selFontSize = document.getElementById('setting-font-size');
    selFontSize?.addEventListener('change', (e) => settings.set('fontSize', e.target.value));

    // Category 3: Performance
    const selPerfMode = document.getElementById('setting-perf-mode');
    selPerfMode?.addEventListener('change', (e) => {
      const mode = e.target.value;
      settings.set('performanceMode', mode);
      if (mode === 'performance') {
        settings.update({ reducedMotion: true, backgroundEffects: false, visualizerFps: 30 });
      } else {
        settings.update({ reducedMotion: false, backgroundEffects: true, visualizerFps: 60 });
      }
    });

    // Category 6 & 7: Waterdrop auto-collapse timer (3-6s)
    const sliderWdTimer = document.getElementById('setting-waterdrop-timer');
    const labelWdTimer = document.getElementById('setting-waterdrop-timer-label');
    sliderWdTimer?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      settings.set('waterdropCollapseTimer', val);
      settings.set('pdfAutoCollapseTimer', val);
      if (labelWdTimer) labelWdTimer.textContent = `${val} seconds`;
    });

    // Category 9: Accessibility
    const chkHighContrast = document.getElementById('setting-high-contrast');
    chkHighContrast?.addEventListener('change', (e) => settings.set('highContrast', e.target.checked));

    const chkReducedMotion = document.getElementById('setting-reduced-motion');
    chkReducedMotion?.addEventListener('change', (e) => settings.set('reducedMotion', e.target.checked));

    // Category 11: Storage & Export/Import
    const btnExport = document.getElementById('btn-export-settings');
    btnExport?.addEventListener('click', () => {
      settings.exportToJson();
      this.showToast('Settings exported to JSON.', 'success');
    });

    const fileImportInput = document.getElementById('file-import-settings');
    fileImportInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const res = settings.importFromJson(ev.target.result);
        this.showToast(res.message, res.success ? 'success' : 'error');
      };
      reader.readAsText(file);
    });

    const btnClearCache = document.getElementById('btn-clear-cache');
    btnClearCache?.addEventListener('click', () => {
      mediaTransfer.cleanupAllUrls();
      this.showToast('Temporary media blob cache cleared.', 'success');
      this.refreshStorageStats();
    });

    const btnResetSettings = document.getElementById('btn-reset-settings');
    btnResetSettings?.addEventListener('click', () => {
      if (confirm('Reset all settings to default values?')) {
        settings.resetAll();
        this.showToast('All settings reset to default.', 'info');
      }
    });

    // Load initial values into inputs
    this.syncSettingsInputValues();
    this.refreshStorageStats();
  }

  syncSettingsInputValues() {
    const s = settings.settings;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    const setChk = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    };

    setVal('setting-theme', s.theme);
    setVal('setting-accent', s.accentColor);
    setVal('setting-glass-intensity', s.glassIntensity);
    setChk('setting-bg-effects', s.backgroundEffects);
    setVal('setting-blur-intensity', s.blurIntensity);
    setVal('setting-corner-radius', s.cornerRadius);
    setVal('setting-font-size', s.fontSize);
    setVal('setting-perf-mode', s.performanceMode);
    setVal('setting-waterdrop-timer', s.waterdropCollapseTimer);
    setChk('setting-high-contrast', s.highContrast);
    setChk('setting-reduced-motion', s.reducedMotion);

    const labelWdTimer = document.getElementById('setting-waterdrop-timer-label');
    if (labelWdTimer) labelWdTimer.textContent = `${s.waterdropCollapseTimer} seconds`;
  }

  async refreshStorageStats() {
    const stats = await settings.getStorageStats();
    const lsEl = document.getElementById('stats-local-storage');
    const idbEl = document.getElementById('stats-indexed-db');
    if (lsEl) lsEl.textContent = stats.localStorageBytes;
    if (idbEl) idbEl.textContent = stats.indexedDbUsage;
  }

  // ------------------------------------------------------------------------
  // Device Status & Battery Telemetry
  // ------------------------------------------------------------------------
  async initBatteryTelemetry() {
    const batteryStat = await settings.getBatteryStatus();
    const el = document.getElementById('local-battery-status');
    if (!el) return;

    if (batteryStat.supported) {
      el.textContent = `${batteryStat.level}% ${batteryStat.charging ? '(Charging)' : ''}`;
    } else {
      el.textContent = 'Battery Status Unavailable';
    }
  }

  // ------------------------------------------------------------------------
  // Sample Demonstrations (Synthetic video/audio/images for immediate testing)
  // ------------------------------------------------------------------------
  loadSampleDemonstrations() {
    const btnDemoVideo = document.getElementById('btn-load-demo-video');
    const btnDemoAudio = document.getElementById('btn-load-demo-audio');
    const btnDemoImage = document.getElementById('btn-load-demo-image');
    const btnDemoDoc = document.getElementById('btn-load-demo-doc');

    // Demo Video: High-Definition Procedural Canvas Video Stream
    btnDemoVideo?.addEventListener('click', () => {
      const demoUrl = this.generateSyntheticVideoUrl();
      const demoItem = {
        name: 'CAST_Studio_Cosmic_Journey_1080p.mp4',
        url: demoUrl,
        size: 15728640,
        formattedSize: '15.0 MB',
        mime: 'video/mp4',
      };
      this.moviePlayer.loadMovie(demoItem);
      this.navigateTo('movies');
      this.showToast('Loaded demo video in Movie Casting Studio.', 'info');
    });

    // Demo Audio: High-Tech Synthesizer Audio Track
    btnDemoAudio?.addEventListener('click', () => {
      const demoAudioUrl = this.generateSyntheticAudioUrl();
      const songs = [
        {
          name: 'Liquid Glass Horizon',
          artist: 'Shiv Yogi',
          album: 'CAST Sessions Vol 1',
          url: demoAudioUrl,
          size: 4194304,
          formattedSize: '4.0 MB',
        },
        {
          name: 'Nebula Frequency Pulse',
          artist: 'Shiv Yogi',
          album: 'CAST Sessions Vol 1',
          url: demoAudioUrl,
          size: 5242880,
          formattedSize: '5.0 MB',
        }
      ];
      this.musicPlayer.addSongs(songs);
      this.navigateTo('music');
      this.showToast('Loaded bulk demo music into playlist.', 'info');
    });

    // Demo Images: Procedural Neon Fluid Wallpapers
    btnDemoImage?.addEventListener('click', () => {
      const img1 = this.generateNeonPatternDataUrl('#00e5ff', '#3b82f6', 'Liquid Flow 01');
      const img2 = this.generateNeonPatternDataUrl('#a855f7', '#ec4899', 'Cosmic Aura 02');
      const img3 = this.generateNeonPatternDataUrl('#10b981', '#06b6d4', 'Emerald Prism 03');

      const items = [
        { name: 'Liquid_Flow_01.png', url: img1, size: 840000, formattedSize: '820 KB', mime: 'image/png' },
        { name: 'Cosmic_Aura_02.png', url: img2, size: 910000, formattedSize: '888 KB', mime: 'image/png' },
        { name: 'Emerald_Prism_03.png', url: img3, size: 780000, formattedSize: '761 KB', mime: 'image/png' },
      ];
      this.imageViewer.loadImages(items);
      this.navigateTo('images');
      this.showToast('Loaded demo image gallery with Waterdrop controls.', 'info');
    });

    // Demo Document: Specifications Specification
    btnDemoDoc?.addEventListener('click', () => {
      const specContent = `
================================================================================
CAST PLATFORM ARCHITECTURE & SPECIFICATION GUIDE
Created By Shiv Yogi
================================================================================

1. SYSTEM OVERVIEW
CAST is a high-performance, responsive media casting and streaming platform.
Designed for peer-to-peer browser-to-browser media casting with zero third-party
cloud storage intermediaries.

2. PEER-TO-PEER WEBRTC ARCHITECTURE
- WebRTC Data Channels handle high-speed media packet transfer.
- Chunked file streaming provides memory safety for lower-end Android devices.
- Cloudflare Workers provide WebSockets and HTTP signaling fallbacks.
- Cross-tab BroadcastChannel provides zero-latency offline pairing across windows.

3. LIQUID GLASS INTERFACE
- Midnight dark backdrop (#040711) with translucent frosted panels.
- Neon Cyan (#00e5ff), Electric Blue (#3b82f6), and Radiant Purple (#a855f7).
- Animated SVG Waterdrop control system with auto-collapse timer (3-6 seconds).

4. AUDIO-REACTIVE AURORA VISUALIZER
- Web Audio API AnalyserNode with 512 FFT bins.
- 6 visual modes: Aurora Nebula, Circular Spectrum, Frequency Bars, Waveform,
  Pulse Rings, Cosmic Waves.
- Landscape orientation lock where available.

5. SECURITY & PRIVACY
- Temporary 6-digit codes with 5-minute countdown expiration.
- Attempt limiter (5 attempts max before lockout).
- Strict SVG-Only iconography: Zero emojis anywhere in the interface.
- Automatic object URL and audio buffer memory cleanup.

[END OF SPECIFICATION DOCUMENT]
      `.trim();

      const blob = new Blob([specContent], { type: 'text/plain' });
      const url = mediaTransfer.createTrackedUrl(blob);
      const docItem = {
        name: 'CAST_Platform_Specification.txt',
        url,
        blob,
        size: blob.size,
        formattedSize: `${(blob.size / 1024).toFixed(1)} KB`,
        category: 'document',
      };

      this.pdfReader.loadDocument(docItem);
      this.navigateTo('documents');
      this.showToast('Loaded CAST specification in Document Reader.', 'info');
    });
  }

  // Generate procedural sample video (canvas -> MediaStream -> MediaRecorder blob)
  generateSyntheticVideoUrl() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    // Draw cosmic procedural animation into canvas
    let frame = 0;
    const draw = () => {
      frame++;
      ctx.fillStyle = '#050918';
      ctx.fillRect(0, 0, 640, 360);

      // Glowing orb
      const grad = ctx.createRadialGradient(320, 180, 10, 320, 180, 160);
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.8)');
      grad.addColorStop(0.6, 'rgba(168, 85, 247, 0.4)');
      grad.addColorStop(1, 'rgba(5, 9, 24, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Title
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('CAST CINEMA STREAM', 320, 170);

      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Created By Shiv Yogi • Liquid Glass Demo', 320, 210);

      if (frame < 120) requestAnimationFrame(draw);
    };
    draw();

    try {
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.start();
      setTimeout(() => recorder.stop(), 500);

      return new Promise(resolve => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(mediaTransfer.createTrackedUrl(blob));
        };
      });
    } catch (e) {
      // Fallback tiny valid webm data URI
      return 'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQN+BA0KFgQIYU4BnQN+BA0KCQAR3ZWJtQoeBAkKFgQIYU4BnQN+BA0KFgQIYU4BnQN+BA0K';
    }
  }

  // Generate procedural sample audio (Web Audio oscillator -> audio buffer wav)
  generateSyntheticAudioUrl() {
    const sampleRate = 44100;
    const duration = 8; // seconds
    const numSamples = sampleRate * duration;
    const buffer = new Float32Array(numSamples);

    // Synthesize rich chords
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const f1 = 220; // A3
      const f2 = 277.18; // C#4
      const f3 = 329.63; // E4
      const wave = Math.sin(2 * Math.PI * f1 * t) * 0.3 +
                   Math.sin(2 * Math.PI * f2 * t) * 0.25 +
                   Math.sin(2 * Math.PI * f3 * t) * 0.2;
      buffer[i] = wave * Math.exp(-t * 0.15); // gentle decay
    }

    // Convert to PCM WAV blob
    const wavBlob = this.encodeWav(buffer, sampleRate);
    return mediaTransfer.createTrackedUrl(wavBlob);
  }

  encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  generateNeonPatternDataUrl(color1, color2, label) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Deep background
    ctx.fillStyle = '#060a18';
    ctx.fillRect(0, 0, 1200, 800);

    // Glowing Neon Gradient
    const grad = ctx.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);

    ctx.strokeStyle = grad;
    ctx.lineWidth = 14;

    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(600, 400, 60 + i * 45, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`CAST • ${label}`, 600, 390);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Waterdrop Image Viewer Demonstration', 600, 440);

    return canvas.toDataURL('image/png');
  }

  // ------------------------------------------------------------------------
  // Auto-Pair via URL Parameters (e.g. ?pair=123456&token=...)
  // ------------------------------------------------------------------------
  checkUrlPairing() {
    const params = new URLSearchParams(window.location.search);
    const pairCode = params.get('pair');
    if (pairCode) {
      this.navigateTo('pair');
      const input = document.getElementById('input-receiver-code');
      if (input) input.value = pairCode;
      pairing.joinAsReceiver(pairCode)
        .then(() => this.showToast(`Auto-paired with code ${pairCode}!`, 'success'))
        .catch(err => this.showToast(err.message, 'error'));
    }
  }

  // ------------------------------------------------------------------------
  // Toast Notification System
  // ------------------------------------------------------------------------
  showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    else if (type === 'error') iconName = 'alert-circle';
    else if (type === 'warning') iconName = 'alert-circle';

    toast.innerHTML = `
      <div class="toast-icon">${getIconSvg(iconName)}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <button class="btn-icon" style="width:24px; height:24px; margin-left:auto;" aria-label="Close Notification">
        ${getIconSvg('close', 'cast-icon-sm')}
      </button>
    `;

    toast.querySelector('button')?.addEventListener('click', () => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.isConnected) {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 300);
      }
    }, 4500);
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Instantiate and attach when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.castApp = new CastApp();
});
