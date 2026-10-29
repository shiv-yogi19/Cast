/**
 * CAST — Bulk Music Upload Studio & Custom Music Player
 * Handles multi-song queues, reordering, shuffle/repeat, ID3 tag detection,
 * Single-Song Rule enforcement, Web Audio routing, and Aurora visualizer link.
 */

import { getIconSvg } from './icons.js';
import { pairing } from './pairing.js';
import { settings } from './settings.js';
import { visualizer } from './audio-visualizer.js';

export class MusicPlayer {
  constructor(containerId = 'music-player-root') {
    this.containerId = containerId;
    this.container = null;
    this.audio = new Audio();
    this.playlist = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.isShuffle = false;
    this.repeatMode = 'off'; // 'off' | 'all' | 'one'
    this.isMuted = false;
    this.listeners = new Map();

    this.audio.preload = 'metadata';
    this.bindAudioEvents();
  }

  mount(parentEl) {
    if (!parentEl) return;
    this.container = parentEl;
    this.renderPlayerShell();
    this.bindDomEvents();
    visualizer.init(this.audio);
  }

  renderPlayerShell() {
    this.container.innerHTML = `
      <div class="glass-panel music-player-panel" id="mp-panel">
        <!-- Hero Details: Artwork + Metadata -->
        <div class="music-hero-stage">
          <div class="music-artwork-wrapper" id="mp-artwork-wrapper">
            <div class="music-artwork-default" id="mp-default-icon">
              ${getIconSvg('nav-music', 'cast-icon-xl')}
            </div>
            <img class="music-artwork-img" id="mp-art-img" style="display:none;" alt="Album Artwork">
          </div>

          <div class="music-meta-details">
            <div class="badge badge-active" id="mp-format-badge">Ready</div>
            <div class="music-track-title" id="mp-track-title">No Song Playing</div>
            <div class="music-artist-name" id="mp-artist-name">Select songs to begin</div>
            <div class="music-album-info" id="mp-album-info">Casting Studio Audio</div>
          </div>
        </div>

        <!-- Progress Seek Bar -->
        <div class="music-progress-wrapper">
          <div class="video-seek-track" id="mp-seek-track" role="slider" aria-label="Seek Bar">
            <div class="video-seek-progress" id="mp-seek-progress">
              <div class="video-seek-handle"></div>
            </div>
          </div>
          <div class="music-time-row">
            <span id="mp-time-elapsed">00:00</span>
            <span id="mp-time-total">00:00</span>
          </div>
        </div>

        <!-- Main Actions Row -->
        <div class="music-actions-row">
          <!-- Left Utilities: Shuffle, Repeat -->
          <div class="video-controls-group">
            <button class="btn-icon" id="mp-btn-shuffle" title="Shuffle" aria-label="Shuffle Playlist">
              ${getIconSvg('shuffle')}
            </button>
            <button class="btn-icon" id="mp-btn-repeat" title="Repeat" aria-label="Repeat Mode">
              ${getIconSvg('repeat')}
            </button>
          </div>

          <!-- Center Controls: Prev, Play/Pause, Next (Strict Single-Song Rule) -->
          <div class="music-primary-controls">
            <button class="btn-icon single-song-hidden" id="mp-btn-prev" title="Previous Song" aria-label="Previous Song">
              ${getIconSvg('prev-track')}
            </button>

            <button class="btn-play-pause-circle" id="mp-btn-play" title="Play or Pause" aria-label="Play or Pause">
              ${getIconSvg('play')}
            </button>

            <button class="btn-icon single-song-hidden" id="mp-btn-next" title="Next Song" aria-label="Next Song">
              ${getIconSvg('next-track')}
            </button>
          </div>

          <!-- Right Utilities: Volume & Fullscreen Visualizer -->
          <div class="video-controls-group">
            <div class="volume-control-wrapper">
              <button class="btn-icon" id="mp-btn-mute" title="Mute Audio" aria-label="Mute Audio">
                ${getIconSvg('volume-high')}
              </button>
              <input type="range" class="volume-slider" id="mp-volume-slider" min="0" max="1" step="0.05" value="0.8" aria-label="Volume">
            </div>

            <button class="btn-primary" id="mp-btn-visualizer" title="Aurora Nebula Visualizer" aria-label="Launch Aurora Visualizer">
              ${getIconSvg('visualizer')}
              <span>Visualizer</span>
            </button>
          </div>
        </div>

        <!-- Playlist Queue Section -->
        <div class="playlist-header" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
          <div style="font-weight:600; font-size:14px; color:var(--text-secondary);">
            PLAYLIST QUEUE (<span id="mp-queue-count">0</span>)
          </div>
          <button class="btn-secondary" id="mp-btn-clear-queue" style="padding:4px 10px; font-size:12px;">
            Clear
          </button>
        </div>

        <div class="playlist-container" id="mp-playlist-list">
          <div class="playlist-empty" style="text-align:center; padding:24px; color:var(--text-muted); font-size:13px;">
            No songs in queue. Drag & drop audio files or use Bulk Upload above.
          </div>
        </div>
      </div>
    `;
  }

  bindDomEvents() {
    const btnPlay = this.container.querySelector('#mp-btn-play');
    const btnPrev = this.container.querySelector('#mp-btn-prev');
    const btnNext = this.container.querySelector('#mp-btn-next');
    const btnShuffle = this.container.querySelector('#mp-btn-shuffle');
    const btnRepeat = this.container.querySelector('#mp-btn-repeat');
    const btnMute = this.container.querySelector('#mp-btn-mute');
    const volSlider = this.container.querySelector('#mp-volume-slider');
    const seekTrack = this.container.querySelector('#mp-seek-track');
    const btnVisualizer = this.container.querySelector('#mp-btn-visualizer');
    const btnClearQueue = this.container.querySelector('#mp-btn-clear-queue');

    btnPlay.addEventListener('click', () => this.togglePlay());
    btnPrev.addEventListener('click', () => this.playPrevious());
    btnNext.addEventListener('click', () => this.playNext());

    btnShuffle.addEventListener('click', () => {
      this.isShuffle = !this.isShuffle;
      btnShuffle.classList.toggle('active', this.isShuffle);
    });

    // Repeat cycling: off -> all -> one -> off
    btnRepeat.addEventListener('click', () => {
      if (this.repeatMode === 'off') {
        this.repeatMode = 'all';
        btnRepeat.innerHTML = getIconSvg('repeat');
        btnRepeat.classList.add('active');
      } else if (this.repeatMode === 'all') {
        this.repeatMode = 'one';
        btnRepeat.innerHTML = getIconSvg('repeat-one');
        btnRepeat.classList.add('active');
      } else {
        this.repeatMode = 'off';
        btnRepeat.innerHTML = getIconSvg('repeat');
        btnRepeat.classList.remove('active');
      }
    });

    volSlider.addEventListener('input', (e) => {
      this.setVolume(parseFloat(e.target.value));
    });

    btnMute.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      this.audio.muted = this.isMuted;
      this.updateVolumeUi();
    });

    seekTrack.addEventListener('click', (e) => {
      const rect = seekTrack.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (this.audio.duration) {
        this.audio.currentTime = pos * this.audio.duration;
      }
    });

    btnVisualizer.addEventListener('click', () => {
      const track = this.playlist[this.currentIndex] || { name: 'Audio Stream', artist: 'CAST' };
      visualizer.open({ title: track.name, artist: track.artist || 'CAST Studio' });
    });

    btnClearQueue.addEventListener('click', () => this.clearPlaylist());
  }

  bindAudioEvents() {
    this.audio.addEventListener('timeupdate', () => {
      const cur = this.audio.currentTime || 0;
      const dur = this.audio.duration || 0;
      const percent = dur > 0 ? (cur / dur) * 100 : 0;

      const progress = this.container?.querySelector('#mp-seek-progress');
      if (progress) progress.style.width = `${percent}%`;

      const curEl = this.container?.querySelector('#mp-time-elapsed');
      const durEl = this.container?.querySelector('#mp-time-total');
      if (curEl) curEl.textContent = this.formatTime(cur);
      if (durEl) durEl.textContent = this.formatTime(dur);
    });

    this.audio.addEventListener('ended', () => {
      if (this.repeatMode === 'one') {
        this.audio.currentTime = 0;
        this.play();
      } else {
        this.playNext();
      }
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayStateUi();
      this.container?.querySelector('#mp-artwork-wrapper')?.classList.add('playing');
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayStateUi();
      this.container?.querySelector('#mp-artwork-wrapper')?.classList.remove('playing');
    });
  }

  // Bulk add multiple songs
  addSongs(songs) {
    if (!Array.isArray(songs)) songs = [songs];
    songs.forEach(s => {
      this.playlist.push({
        id: 'song_' + Math.random().toString(36).substring(2, 9),
        name: s.name.replace(/\.[^/.]+$/, ''),
        artist: s.artist || 'Local Audio',
        album: s.album || 'CAST Collection',
        size: s.size,
        formattedSize: s.formattedSize || '',
        url: s.url,
        file: s.file || null,
      });
    });

    this.enforceSingleSongRule();
    this.renderPlaylistRows();

    // Auto play first if none was playing
    if (this.currentIndex === -1 && this.playlist.length > 0) {
      this.loadIndex(0);
    }
  }

  loadIndex(index) {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;
    const track = this.playlist[index];

    this.audio.src = track.url;
    this.audio.load();

    const titleEl = this.container.querySelector('#mp-track-title');
    const artistEl = this.container.querySelector('#mp-artist-name');
    const albumEl = this.container.querySelector('#mp-album-info');
    const formatEl = this.container.querySelector('#mp-format-badge');

    if (titleEl) titleEl.textContent = track.name;
    if (artistEl) artistEl.textContent = track.artist;
    if (albumEl) albumEl.textContent = `${track.album} • ${track.formattedSize || ''}`;
    if (formatEl) formatEl.textContent = 'PLAYING';

    this.highlightActivePlaylistRow();
    this.play();
  }

  play() {
    this.audio.play().catch(e => console.warn('Audio playback interrupted:', e));
  }

  pause() {
    this.audio.pause();
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else if (this.currentIndex !== -1) this.play();
    else if (this.playlist.length > 0) this.loadIndex(0);
  }

  playNext() {
    if (this.playlist.length <= 1) return;

    if (this.isShuffle) {
      let nextIdx = Math.floor(Math.random() * this.playlist.length);
      if (nextIdx === this.currentIndex) nextIdx = (nextIdx + 1) % this.playlist.length;
      this.loadIndex(nextIdx);
    } else if (this.currentIndex < this.playlist.length - 1) {
      this.loadIndex(this.currentIndex + 1);
    } else if (this.repeatMode === 'all') {
      this.loadIndex(0);
    }
  }

  playPrevious() {
    if (this.playlist.length <= 1) return;

    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    if (this.currentIndex > 0) {
      this.loadIndex(this.currentIndex - 1);
    } else if (this.repeatMode === 'all') {
      this.loadIndex(this.playlist.length - 1);
    }
  }

  // STRICT SINGLE-SONG RULE:
  // If playlist contains 0 or 1 song, hide Previous and Next.
  // If 2 or more songs, display Previous and Next.
  enforceSingleSongRule() {
    const btnPrev = this.container?.querySelector('#mp-btn-prev');
    const btnNext = this.container?.querySelector('#mp-btn-next');
    if (!btnPrev || !btnNext) return;

    if (this.playlist.length <= 1) {
      btnPrev.classList.add('single-song-hidden');
      btnNext.classList.add('single-song-hidden');
    } else {
      btnPrev.classList.remove('single-song-hidden');
      btnNext.classList.remove('single-song-hidden');
    }

    const countEl = this.container?.querySelector('#mp-queue-count');
    if (countEl) countEl.textContent = this.playlist.length.toString();
  }

  renderPlaylistRows() {
    const listEl = this.container?.querySelector('#mp-playlist-list');
    if (!listEl) return;

    if (this.playlist.length === 0) {
      listEl.innerHTML = `
        <div class="playlist-empty" style="text-align:center; padding:24px; color:var(--text-muted); font-size:13px;">
          No songs in queue. Drag & drop audio files or use Bulk Upload above.
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.playlist.map((track, idx) => `
      <div class="playlist-row ${idx === this.currentIndex ? 'active' : ''}" data-index="${idx}">
        <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
          <div style="color:var(--text-muted); font-size:12px; font-family:var(--font-mono); width:20px;">
            ${(idx + 1).toString().padStart(2, '0')}
          </div>
          <div style="display:flex; flex-direction:column; overflow:hidden;">
            <span class="playlist-song-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:13px;">
              ${escapeHtml(track.name)}
            </span>
            <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(track.artist)}</span>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono);">
            ${track.formattedSize}
          </span>
          <button class="btn-icon btn-remove-track" data-index="${idx}" title="Remove Song" aria-label="Remove Song" style="width:30px; height:30px;">
            ${getIconSvg('trash', 'cast-icon-sm')}
          </button>
        </div>
      </div>
    `).join('');

    // Bind row clicks
    listEl.querySelectorAll('.playlist-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-track')) return;
        const idx = parseInt(row.getAttribute('data-index'));
        this.loadIndex(idx);
      });
    });

    // Bind remove button clicks
    listEl.querySelectorAll('.btn-remove-track').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'));
        this.removeTrack(idx);
      });
    });
  }

  highlightActivePlaylistRow() {
    const rows = this.container?.querySelectorAll('.playlist-row');
    rows?.forEach((row, idx) => {
      row.classList.toggle('active', idx === this.currentIndex);
    });
  }

  removeTrack(index) {
    if (index < 0 || index >= this.playlist.length) return;
    this.playlist.splice(index, 1);
    if (this.currentIndex === index) {
      if (this.playlist.length > 0) {
        this.loadIndex(Math.min(index, this.playlist.length - 1));
      } else {
        this.currentIndex = -1;
        this.audio.pause();
        this.audio.src = '';
      }
    } else if (this.currentIndex > index) {
      this.currentIndex--;
    }
    this.enforceSingleSongRule();
    this.renderPlaylistRows();
  }

  clearPlaylist() {
    this.playlist = [];
    this.currentIndex = -1;
    this.audio.pause();
    this.audio.src = '';
    this.enforceSingleSongRule();
    this.renderPlaylistRows();
  }

  setVolume(vol) {
    this.audio.volume = vol;
    this.isMuted = vol === 0;
    this.updateVolumeUi();
  }

  updateVolumeUi() {
    const btnMute = this.container.querySelector('#mp-btn-mute');
    const volSlider = this.container.querySelector('#mp-volume-slider');
    if (!btnMute) return;

    if (this.isMuted || this.audio.volume === 0) {
      btnMute.innerHTML = getIconSvg('volume-mute');
      if (volSlider) volSlider.value = 0;
    } else if (this.audio.volume < 0.5) {
      btnMute.innerHTML = getIconSvg('volume-low');
      if (volSlider) volSlider.value = this.audio.volume;
    } else {
      btnMute.innerHTML = getIconSvg('volume-high');
      if (volSlider) volSlider.value = this.audio.volume;
    }
  }

  updatePlayStateUi() {
    const btnPlay = this.container.querySelector('#mp-btn-play');
    if (btnPlay) {
      btnPlay.innerHTML = this.isPlaying ? getIconSvg('pause') : getIconSvg('play');
    }
  }

  formatTime(seconds) {
    const s = Math.floor(seconds || 0);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
