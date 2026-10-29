/**
 * CAST — Global Settings System & Persistence Engine
 * 12 Comprehensive functional categories with LocalStorage/IndexedDB synchronization
 */

const SETTINGS_STORAGE_KEY = 'cast_platform_settings_v1';

// Default system preferences
export const DEFAULT_SETTINGS = {
  // 1. Appearance
  theme: 'midnight', // 'midnight' | 'obsidian' | 'cyber' | 'amethyst'
  accentColor: 'cyan', // 'cyan' | 'blue' | 'purple' | 'emerald'
  glassIntensity: 'medium', // 'low' | 'medium' | 'high'
  backgroundEffects: true,
  glowIntensity: 'medium', // 'subtle' | 'medium' | 'vibrant'
  blurIntensity: 18, // px
  interfaceDensity: 'normal', // 'compact' | 'normal' | 'spacious'
  cornerRadius: 'rounded', // 'sharp' | 'rounded' | 'extra-rounded'
  fontSize: 'medium', // 'small' | 'medium' | 'large'
  iconSize: 'normal', // 'compact' | 'normal' | 'large'
  animationSpeed: 'normal', // 'fast' | 'normal' | 'smooth'

  // 2. Device and Layout
  layoutMode: 'auto', // 'auto' | 'desktop' | 'mobile'
  navigationPosition: 'sidebar', // 'sidebar' | 'bottom'
  landscapeAutoRotate: false,
  autoFullscreenOnPlay: false,
  touchGesturesEnabled: true,
  keyboardShortcutsEnabled: true,

  // 3. Performance
  performanceMode: 'balanced', // 'performance' | 'balanced' | 'quality'
  reducedMotion: false,
  particleQuality: 'high', // 'low' | 'medium' | 'high'
  visualizerFps: 60,
  blurOptimization: true,
  dataSaverMode: false,

  // 4. Movie Player
  defaultMovieVolume: 0.85,
  defaultPlaybackSpeed: 1.0,
  subtitlesEnabled: true,
  defaultFitMode: 'contain', // 'contain' | 'cover' | 'fill'
  skipInterval: 10, // seconds
  autoPlayNextMovie: true,
  playbackSyncEnabled: true,

  // 5. Music Player
  defaultMusicVolume: 0.8,
  visualizerStyle: 'aurora', // 'aurora' | 'spectrum' | 'bars' | 'waveform' | 'pulse' | 'cosmic'
  visualizerQuality: 'high',
  spectrumSensitivity: 1.2,
  musicAutoPlayNext: true,
  defaultShuffle: false,
  defaultRepeat: 'off', // 'off' | 'all' | 'one'

  // 6. Image Viewer
  defaultImageZoom: 1.0,
  defaultImageFit: 'contain',
  swipeSensitivity: 'normal',
  waterdropPosition: 'bottom-right', // 'bottom-right' | 'bottom-center' | 'bottom-left'
  waterdropCollapseTimer: 4, // 3 to 6 seconds
  imageInfoVisible: false,

  // 7. PDF Reader
  defaultPdfFit: 'width', // 'width' | 'page'
  pdfContinuousScroll: true,
  pdfAutoCollapseTimer: 4, // seconds
  searchHighlightColor: 'cyan',

  // 8. Pairing and Connection
  pairingApprovalRequired: false,
  sessionDurationMinutes: 60,
  codeExpirationMinutes: 5,
  autoReconnect: true,
  signalingServerUrl: '', // blank = local fallback or Cloudflare Worker relative endpoint

  // 9. Accessibility
  highContrast: false,
  largerText: false,
  visibleFocus: true,
  screenReaderLabels: true,

  // 10. Notifications
  notifyConnected: true,
  notifyDisconnected: true,
  notifyTransferComplete: true,
  notifyErrors: true,

  // 11. Storage
  cacheRetentionDays: 7
};

class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = new Set();
    this.load();
  }

  load() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.settings = { ...DEFAULT_SETTINGS, ...parsed };
        }
      }
    } catch (e) {
      this.settings = { ...DEFAULT_SETTINGS };
    }
    this.applyAll();
  }

  save() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      }
      this.applyAll();
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  get(key) {
    return this.settings[key] ?? DEFAULT_SETTINGS[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  update(batch) {
    this.settings = { ...this.settings, ...batch };
    this.save();
  }

  resetCategory(category) {
    if (category === 'appearance') {
      const keys = ['theme', 'accentColor', 'glassIntensity', 'backgroundEffects', 'glowIntensity', 'blurIntensity', 'interfaceDensity', 'cornerRadius', 'fontSize', 'iconSize', 'animationSpeed'];
      keys.forEach(k => { this.settings[k] = DEFAULT_SETTINGS[k]; });
    } else if (category === 'layout') {
      const keys = ['layoutMode', 'navigationPosition', 'landscapeAutoRotate', 'autoFullscreenOnPlay', 'touchGesturesEnabled', 'keyboardShortcutsEnabled'];
      keys.forEach(k => { this.settings[k] = DEFAULT_SETTINGS[k]; });
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
    }
    this.save();
  }

  resetAll() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
  }

  // Real-time DOM application of settings
  applyAll() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    if (!body || !root) return;

    // Theme & Accents
    body.setAttribute('data-theme', this.settings.theme);
    body.setAttribute('data-accent', this.settings.accentColor);
    body.setAttribute('data-motion', this.settings.reducedMotion ? 'reduced' : 'standard');
    body.setAttribute('data-contrast', this.settings.highContrast ? 'high' : 'normal');

    // Blur intensity CSS variable
    root.style.setProperty('--blur-intensity', `${this.settings.blurIntensity}px`);

    // Glass intensity
    if (this.settings.glassIntensity === 'high') {
      root.style.setProperty('--bg-glass-standard', 'rgba(12, 19, 44, 0.88)');
    } else if (this.settings.glassIntensity === 'low') {
      root.style.setProperty('--bg-glass-standard', 'rgba(16, 26, 56, 0.45)');
    } else {
      root.style.setProperty('--bg-glass-standard', 'rgba(16, 26, 56, 0.65)');
    }

    // Font size scaling
    if (this.settings.fontSize === 'large' || this.settings.largerText) {
      root.style.setProperty('font-size', '17px');
    } else if (this.settings.fontSize === 'small') {
      root.style.setProperty('font-size', '13.5px');
    } else {
      root.style.setProperty('font-size', '15px');
    }

    // Corner radius
    if (this.settings.cornerRadius === 'sharp') {
      root.style.setProperty('--radius-md', '4px');
      root.style.setProperty('--radius-lg', '6px');
    } else if (this.settings.cornerRadius === 'extra-rounded') {
      root.style.setProperty('--radius-md', '20px');
      root.style.setProperty('--radius-lg', '28px');
    } else {
      root.style.setProperty('--radius-md', '14px');
      root.style.setProperty('--radius-lg', '20px');
    }

    // Background animation
    const orbs = document.querySelectorAll('.liquid-orb');
    orbs.forEach(orb => {
      orb.style.display = (this.settings.backgroundEffects && !this.settings.reducedMotion) ? 'block' : 'none';
    });
  }

  // Export settings as valid JSON file
  exportToJson() {
    const safeData = { ...this.settings };
    // Remove any temporary runtime properties
    const blob = new Blob([JSON.stringify(safeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cast-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import and validate JSON settings
  importFromJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON format: Root must be an object.');
      }
      // Validate safe keys
      const updated = {};
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (key in data) {
          updated[key] = data[key];
        }
      }
      this.update(updated);
      return { success: true, message: 'Settings successfully imported and applied.' };
    } catch (err) {
      return { success: false, message: `Import failed: ${err.message}` };
    }
  }

  // Storage info calculator
  async getStorageStats() {
    let lsBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        lsBytes += (k?.length || 0) + (localStorage.getItem(k)?.length || 0);
      }
    } catch (e) {
      lsBytes = 0;
    }

    let idbEstimate = 'Supported';
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        idbEstimate = `${((est.usage || 0) / 1024 / 1024).toFixed(2)} MB of ${((est.quota || 0) / 1024 / 1024).toFixed(0)} MB`;
      } catch (e) {
        idbEstimate = 'Unavailable';
      }
    }

    return {
      localStorageBytes: (lsBytes / 1024).toFixed(2) + ' KB',
      indexedDbUsage: idbEstimate
    };
  }

  // Battery status query (Strict: Display "Battery Status Unavailable" if not supported, never invent fake readings)
  async getBatteryStatus() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        return {
          supported: true,
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      } catch (e) {
        return { supported: false, message: 'Battery Status Unavailable' };
      }
    }
    return { supported: false, message: 'Battery Status Unavailable' };
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(this.settings); } catch (e) { console.error(e); }
    });
  }
}

export const settings = new SettingsManager();
