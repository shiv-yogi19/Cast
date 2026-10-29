/**
 * CAST — Movie Casting Studio & Custom HTML5 Video Player
 * Features full SVG controls, playback synchronization, playlist queuing,
 * subtitle tracks, fit modes, speed selection, and keyboard shortcuts.
 */

import { getIconSvg } from './icons.js';
import { pairing } from './pairing.js';
import { settings } from './settings.js';

export class MoviePlayer {
  constructor(containerId = 'movie-player-root') {
    this.containerId = containerId;
    this.container = null;
    this.video = null;
    this.playlist = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.idleTimer = null;
    this.isMuted = false;
    this.currentFitMode = 'contain';
    this.playbackSpeed = 1.0;
    this.subtitles = [];
    this.isSyncing = false;
    this.listeners = new Map();

    this.bindDataChannelSync();
  }

  mount(parentEl) {
    if (!parentEl) return;
    this.container = parentEl;
    this.renderPlayerShell();
    this.bindDomEvents();
  }

  renderPlayerShell() {
    this.container.innerHTML = `
      <div class="video-player-container idle" id="vp-container">
        <video class="video-element fit-contain" id="vp-video" playsinline preload="metadata"></video>
        
        <!-- Center Flash Indicator -->
        <div class="video-center-indicator" id="vp-center-indicator">
          ${getIconSvg('play', 'cast-icon-xl')}
        </div>

        <!-- Subtitles Display -->
        <div class="video-subtitles-overlay" id="vp-subtitles" style="display:none;">
          <div class="subtitle-text" id="vp-sub-text"></div>
        </div>

        <!-- Controls Overlay -->
        <div class="video-controls-overlay" id="vp-controls">
          <!-- Top Bar -->
          <div class="video-player-header">
            <div class="video-title-display" id="vp-title">No Movie Loaded</div>
            <div class="video-controls-group">
              <button class="btn-icon" id="vp-btn-info" title="Media Information" aria-label="Media Information">
                ${getIconSvg('info')}
              </button>
              <button class="btn-icon" id="vp-btn-download" title="Download Movie" aria-label="Download Movie">
                ${getIconSvg('download')}
              </button>
            </div>
          </div>

          <!-- Bottom Bar -->
          <div class="video-controls-bottom">
            <!-- Seek Track -->
            <div class="video-seek-track" id="vp-seek-track" role="slider" aria-label="Seek Bar">
              <div class="video-seek-buffered" id="vp-seek-buffered"></div>
              <div class="video-seek-progress" id="vp-seek-progress">
                <div class="video-seek-handle"></div>
              </div>
            </div>

            <!-- Controls Row -->
            <div class="video-controls-row">
              <!-- Left Group: Play/Pause, Skip, Time -->
              <div class="video-controls-group">
                <button class="btn-icon" id="vp-btn-prev" title="Previous Movie" aria-label="Previous Movie" style="display:none;">
                  ${getIconSvg('prev-track')}
                </button>
                <button class="btn-icon" id="vp-btn-play" title="Play or Pause (Space)" aria-label="Play or Pause">
                  ${getIconSvg('play')}
                </button>
                <button class="btn-icon" id="vp-btn-next" title="Next Movie" aria-label="Next Movie" style="display:none;">
                  ${getIconSvg('next-track')}
                </button>
                
                <button class="btn-icon" id="vp-btn-skip-back" title="Skip 10s Backward" aria-label="Skip Backward">
                  ${getIconSvg('skip-back')}
                </button>
                <button class="btn-icon" id="vp-btn-skip-fwd" title="Skip 10s Forward" aria-label="Skip Forward">
                  ${getIconSvg('skip-forward')}
                </button>

                <div class="volume-control-wrapper">
                  <button class="btn-icon" id="vp-btn-mute" title="Mute (M)" aria-label="Mute Audio">
                    ${getIconSvg('volume-high')}
                  </button>
                  <input type="range" class="volume-slider" id="vp-volume-slider" min="0" max="1" step="0.05" value="0.85" aria-label="Volume">
                </div>

                <div class="video-time-display" id="vp-time-display">00:00 / 00:00</div>
              </div>

              <!-- Right Group: Speed, Fit, Subtitles, Fullscreen -->
              <div class="video-controls-group">
                <button class="badge" id="vp-btn-speed" title="Playback Speed" aria-label="Playback Speed">
                  1.0x
                </button>
                <button class="btn-icon" id="vp-btn-fit" title="Toggle Fit Mode (Contain / Cover / Fill)" aria-label="Fit Mode">
                  ${getIconSvg('fit-screen')}
                </button>
                <button class="btn-icon" id="vp-btn-subtitles" title="Subtitles" aria-label="Subtitles">
                  ${getIconSvg('subtitles')}
                </button>
                <button class="btn-icon" id="vp-btn-fullscreen" title="Fullscreen (F)" aria-label="Fullscreen">
                  ${getIconSvg('fullscreen')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.video = this.container.querySelector('#vp-video');
  }

  bindDomEvents() {
    const vpContainer = this.container.querySelector('#vp-container');
    const btnPlay = this.container.querySelector('#vp-btn-play');
    const btnMute = this.container.querySelector('#vp-btn-mute');
    const volSlider = this.container.querySelector('#vp-volume-slider');
    const seekTrack = this.container.querySelector('#vp-seek-track');
    const btnSkipBack = this.container.querySelector('#vp-btn-skip-back');
    const btnSkipFwd = this.container.querySelector('#vp-btn-skip-fwd');
    const btnSpeed = this.container.querySelector('#vp-btn-speed');
    const btnFit = this.container.querySelector('#vp-btn-fit');
    const btnFullscreen = this.container.querySelector('#vp-btn-fullscreen');
    const btnPrev = this.container.querySelector('#vp-btn-prev');
    const btnNext = this.container.querySelector('#vp-btn-next');
    const btnInfo = this.container.querySelector('#vp-btn-info');
    const btnDownload = this.container.querySelector('#vp-btn-download');

    // Controls visibility on mouse/touch
    const showControls = () => {
      vpContainer.classList.remove('idle');
      if (this.idleTimer) clearTimeout(this.idleTimer);
      if (this.isPlaying) {
        this.idleTimer = setTimeout(() => {
          vpContainer.classList.add('idle');
        }, 3200);
      }
    };

    vpContainer.addEventListener('mousemove', showControls);
    vpContainer.addEventListener('touchstart', showControls, { passive: true });
    vpContainer.addEventListener('mouseleave', () => {
      if (this.isPlaying) vpContainer.classList.add('idle');
    });

    // Play / Pause
    btnPlay.addEventListener('click', () => this.togglePlay());
    this.video.addEventListener('click', () => this.togglePlay());

    // Skip
    btnSkipBack.addEventListener('click', () => this.seekDelta(-10));
    btnSkipFwd.addEventListener('click', () => this.seekDelta(10));

    // Seek track scrub
    seekTrack.addEventListener('click', (e) => {
      const rect = seekTrack.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (this.video.duration) {
        this.seekTo(pos * this.video.duration);
      }
    });

    // Volume
    volSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.setVolume(val);
    });

    btnMute.addEventListener('click', () => this.toggleMute());

    // Speed Cycling (0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x)
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    btnSpeed.addEventListener('click', () => {
      let nextIdx = (speeds.indexOf(this.playbackSpeed) + 1) % speeds.length;
      if (nextIdx === -1) nextIdx = 2; // Default 1.0x
      this.setSpeed(speeds[nextIdx]);
    });

    // Fit Mode Cycling (contain -> cover -> fill -> original)
    const fitModes = ['contain', 'cover', 'fill', 'original'];
    btnFit.addEventListener('click', () => {
      const nextIdx = (fitModes.indexOf(this.currentFitMode) + 1) % fitModes.length;
      this.setFitMode(fitModes[nextIdx]);
    });

    // Fullscreen
    btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Prev / Next
    btnPrev.addEventListener('click', () => this.playPrevious());
    btnNext.addEventListener('click', () => this.playNext());

    // Download
    btnDownload.addEventListener('click', () => this.downloadCurrent());

    // Media Info
    btnInfo.addEventListener('click', () => this.showMediaInfoModal());

    // Video Element Time & Buffering Events
    this.video.addEventListener('timeupdate', () => this.updateTimeUi());
    this.video.addEventListener('progress', () => this.updateBufferUi());
    this.video.addEventListener('ended', () => {
      if (settings.get('autoPlayNextMovie') && this.playlist.length > 1) {
        this.playNext();
      }
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (!settings.get('keyboardShortcutsEnabled')) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.seekDelta(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.seekDelta(10);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        this.toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        this.toggleMute();
      }
    });
  }

  loadMovie(movieItem) {
    if (!movieItem || !this.video) return;

    // Check if already in playlist
    const existingIdx = this.playlist.findIndex(p => p.url === movieItem.url || p.name === movieItem.name);
    if (existingIdx !== -1) {
      this.currentIndex = existingIdx;
    } else {
      this.playlist.push(movieItem);
      this.currentIndex = this.playlist.length - 1;
    }

    this.video.src = movieItem.url;
    this.video.load();

    const titleEl = this.container.querySelector('#vp-title');
    if (titleEl) titleEl.textContent = movieItem.name || 'Untitled Video';

    this.updatePlaylistButtons();
    this.play();

    // Broadcast state to receiver if sender
    this.broadcastSync('load', { name: movieItem.name });
  }

  play() {
    if (!this.video) return;
    this.video.play().then(() => {
      this.isPlaying = true;
      this.updatePlayStateUi();
      this.flashIndicator('play');
      this.broadcastSync('play', { time: this.video.currentTime });
    }).catch(err => console.warn('Autoplay blocked:', err));
  }

  pause() {
    if (!this.video) return;
    this.video.pause();
    this.isPlaying = false;
    this.updatePlayStateUi();
    this.flashIndicator('pause');
    this.broadcastSync('pause', { time: this.video.currentTime });
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  seekTo(timeInSeconds) {
    if (!this.video) return;
    this.video.currentTime = Math.max(0, Math.min(timeInSeconds, this.video.duration || 0));
    this.broadcastSync('seek', { time: this.video.currentTime });
  }

  seekDelta(deltaSeconds) {
    if (!this.video) return;
    this.seekTo(this.video.currentTime + deltaSeconds);
  }

  setVolume(vol) {
    if (!this.video) return;
    this.video.volume = vol;
    this.isMuted = vol === 0;
    this.updateVolumeUi();
  }

  toggleMute() {
    if (!this.video) return;
    this.video.muted = !this.video.muted;
    this.isMuted = this.video.muted;
    this.updateVolumeUi();
  }

  setSpeed(speed) {
    if (!this.video) return;
    this.playbackSpeed = speed;
    this.video.playbackRate = speed;
    const btnSpeed = this.container.querySelector('#vp-btn-speed');
    if (btnSpeed) btnSpeed.textContent = `${speed}x`;
    this.broadcastSync('speed', { speed });
  }

  setFitMode(mode) {
    this.currentFitMode = mode;
    this.video.className = `video-element fit-${mode}`;
  }

  toggleFullscreen() {
    const vpContainer = this.container.querySelector('#vp-container');
    if (!document.fullscreenElement) {
      vpContainer.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  playPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.loadMovie(this.playlist[this.currentIndex]);
    }
  }

  playNext() {
    if (this.currentIndex < this.playlist.length - 1) {
      this.currentIndex++;
      this.loadMovie(this.playlist[this.currentIndex]);
    }
  }

  updatePlaylistButtons() {
    const btnPrev = this.container.querySelector('#vp-btn-prev');
    const btnNext = this.container.querySelector('#vp-btn-next');
    if (!btnPrev || !btnNext) return;

    if (this.playlist.length <= 1) {
      btnPrev.style.display = 'none';
      btnNext.style.display = 'none';
    } else {
      btnPrev.style.display = 'inline-flex';
      btnNext.style.display = 'inline-flex';
      btnPrev.disabled = this.currentIndex === 0;
      btnNext.disabled = this.currentIndex === this.playlist.length - 1;
    }
  }

  updatePlayStateUi() {
    const btnPlay = this.container.querySelector('#vp-btn-play');
    if (btnPlay) {
      btnPlay.innerHTML = this.isPlaying ? getIconSvg('pause') : getIconSvg('play');
    }
  }

  updateTimeUi() {
    if (!this.video) return;
    const cur = this.video.currentTime || 0;
    const dur = this.video.duration || 0;

    const progressPercent = dur > 0 ? (cur / dur) * 100 : 0;
    const progressBar = this.container.querySelector('#vp-seek-progress');
    if (progressBar) progressBar.style.width = `${progressPercent}%`;

    const timeDisplay = this.container.querySelector('#vp-time-display');
    if (timeDisplay) {
      timeDisplay.textContent = `${this.formatTime(cur)} / ${this.formatTime(dur)}`;
    }
  }

  updateBufferUi() {
    if (!this.video || !this.video.buffered.length) return;
    const dur = this.video.duration || 0;
    const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
    const bufferPercent = dur > 0 ? (bufferedEnd / dur) * 100 : 0;
    const bufferBar = this.container.querySelector('#vp-seek-buffered');
    if (bufferBar) bufferBar.style.width = `${bufferPercent}%`;
  }

  updateVolumeUi() {
    const btnMute = this.container.querySelector('#vp-btn-mute');
    const volSlider = this.container.querySelector('#vp-volume-slider');
    if (!btnMute || !this.video) return;

    if (this.isMuted || this.video.volume === 0) {
      btnMute.innerHTML = getIconSvg('volume-mute');
      if (volSlider) volSlider.value = 0;
    } else if (this.video.volume < 0.5) {
      btnMute.innerHTML = getIconSvg('volume-low');
      if (volSlider) volSlider.value = this.video.volume;
    } else {
      btnMute.innerHTML = getIconSvg('volume-high');
      if (volSlider) volSlider.value = this.video.volume;
    }
  }

  flashIndicator(iconName) {
    const ind = this.container.querySelector('#vp-center-indicator');
    if (!ind) return;
    ind.innerHTML = getIconSvg(iconName, 'cast-icon-xl');
    ind.classList.add('flash');
    setTimeout(() => ind.classList.remove('flash'), 500);
  }

  formatTime(seconds) {
    const s = Math.floor(seconds || 0);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      const remMins = mins % 60;
      return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  downloadCurrent() {
    const current = this.playlist[this.currentIndex];
    if (!current || !current.url) return;
    const a = document.createElement('a');
    a.href = current.url;
    a.download = current.name || 'cast-video.mp4';
    a.click();
  }

  showMediaInfoModal() {
    const current = this.playlist[this.currentIndex];
    if (!current) return;
    const info = `
File Name: ${current.name || 'Unknown'}
Resolution: ${this.video?.videoWidth || 1920}x${this.video?.videoHeight || 1080}
Duration: ${this.formatTime(this.video?.duration || 0)}
File Size: ${current.formattedSize || 'Direct Stream'}
Playback Speed: ${this.playbackSpeed}x
Format: ${current.mime || 'video/mp4'}
    `;
    alert(info);
  }

  // WebRTC Synchronization
  broadcastSync(action, payload = {}) {
    if (!settings.get('playbackSyncEnabled') || this.isSyncing) return;
    pairing.sendPacket({
      type: 'movie-sync',
      action,
      payload,
      timestamp: Date.now(),
    });
  }

  bindDataChannelSync() {
    pairing.on('message', (packet) => {
      if (!packet || packet.type !== 'movie-sync' || !this.video) return;

      this.isSyncing = true;
      const { action, payload } = packet;

      if (action === 'play') {
        if (payload.time !== undefined && Math.abs(this.video.currentTime - payload.time) > 1.5) {
          this.video.currentTime = payload.time;
        }
        this.play();
      } else if (action === 'pause') {
        this.pause();
      } else if (action === 'seek') {
        if (payload.time !== undefined) {
          this.video.currentTime = payload.time;
        }
      } else if (action === 'speed') {
        if (payload.speed) {
          this.setSpeed(payload.speed);
        }
      }

      setTimeout(() => { this.isSyncing = false; }, 100);
    });
  }
}
