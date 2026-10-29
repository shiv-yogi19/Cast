# CAST — Complete Media Casting & Streaming Platform

**Created By Shiv Yogi**

CAST is a high-performance, responsive media casting and streaming platform engineered for peer-to-peer browser-to-browser media streaming. CAST enables users to pair two devices—such as two mobile phones or a mobile phone and a compatible Smart TV browser—where one acts as the **Sender** and the other acts as the **Receiver**.

The platform is built to be deployed seamlessly to **GitHub**, **Cloudflare Pages**, and **Cloudflare Workers**.

---

## Key Features & Highlights

### 1. Strict Branding & Cinematic Opening
- **Brand Name**: Exclusively named **CAST**.
- **Creator Signature**: **Created By Shiv Yogi**.
- **Cinematic Sequence**: On initial launch, CAST opens with an animated high-contrast logo reveal transitioning into *Created By Shiv Yogi*, which automatically completes and opens the main media hub without requiring a skip button.
- **English-Only UI**: All visible user interface text, tooltips, dialogs, buttons, and notifications are formatted in clear English.

### 2. Strict SVG-Only Icon System
- **Zero Emojis Everywhere**: Emojis and Unicode symbol placeholders are strictly prohibited across all headings, navigation items, buttons, player controls, dialogs, and notifications.
- **Consistent Vector Library**: All icons are engineered in scalable vector graphics (SVG) with uniform 2px stroke geometry, consistent 20px / 24px sizing, and high accessibility attributes.

### 3. Distinct Desktop & Mobile Interfaces
- **Desktop Studio Layout**:
  - Full-height sidebar navigation with real-time connection status telemetry.
  - Multi-column media workspaces for simultaneous streaming and playlist queuing.
  - Hover micro-interactions, responsive aspect ratio framing, and keyboard shortcuts (`Space` to toggle play, `Left`/`Right` arrows for 10s seek, `F` for fullscreen, `M` to mute).
- **Mobile Touch Layout**:
  - Compact glass header with quick-status indicator.
  - Fixed bottom navigation bar optimized for thumbs.
  - Swipe gestures for gallery navigation.
  - Floating, animated SVG **Waterdrop** controls.
- **Tablet Responsive**:
  - Dynamically adapts between 600px and 991px with intermediate 2-column card layouts.

### 4. Device Pairing Engine
- **QR Code Pairing**: Instant scanning with self-contained SVG QR matrix generator.
- **6-Digit Pairing PIN**: Secure numeric PIN with 5-minute countdown expiration and brute-force attempt lockout (max 5 incorrect tries).
- **Cloudflare Worker Signaling**: Production signaling backend (`workers/signaling-worker.js`) supporting WebSocket and HTTP SDP / ICE exchanges.
- **Offline / Cross-Tab Mesh**: Built-in `BroadcastChannel` local mesh signaling for instant zero-config testing across two browser tabs or windows on the same device.
- **Telemetry**: Real-time connected device platform identification and battery API integration (displays real percentage when available, or explicitly reports *"Battery Status Unavailable"*, never fabricating fake readings).

### 5. DVD-Style "NO SIGNAL" Screen
- When paired devices are connected but no media is actively playing, the Receiver displays an authentic DVD-style screensaver.
- The CAST logo bounces smoothly off the screen edges with neon color cycling on collision, liquid glass reflections, and zero clutter.
- Automatically transitions into the media player when a movie, song, photo, or document is cast.

### 6. Movie Casting Studio & Custom HTML5 Cinema Player
- File browsing, drag-and-drop, and automatic format detection (MP4, WebM, MKV, MOV).
- Custom SVG controls: Play/Pause, Seek bar with buffering indicator and hover preview, Skip 10s forward/back, Volume slider with mute toggle, playback speed cycling (0.5x to 2.0x), Fit modes (Contain, Cover, Fill, Original), Subtitle tracks, and Fullscreen toggle.
- **Real-Time Playback Synchronization**: Commands (play, pause, seek, speed) synchronize across paired devices via WebRTC DataChannel with automated drift correction.

### 7. Bulk Music Upload Studio & Aurora Nebula Visualizer
- **Multi-Song Selection**: Upload or drag-and-drop multiple audio files (MP3, WAV, OGG, AAC, M4A, FLAC) in one step.
- **Strict Single-Song Rule**:
  - 0 or 1 song in playlist: Automatically hides the **Previous** and **Next** buttons.
  - 2 or more songs: Automatically displays **Previous** and **Next** buttons.
- **Aurora Nebula Visualizer**:
  - Real-time frequency analysis powered by the Web Audio API (`AudioContext` and `AnalyserNode`) and HTML5 Canvas.
  - 6 audio-reactive styles: *Aurora Nebula*, *Circular Spectrum*, *Frequency Bars*, *Waveform*, *Pulse Rings*, and *Cosmic Waves*.
  - Fullscreen display with orientation lock request and double-tap gesture to exit.

### 8. Image Viewer with Animated SVG Waterdrop
- Reusable floating SVG Waterdrop control bubble with liquid morphing animation upon expansion.
- Controls: Zoom In, Zoom Out, Actual Size 1:1, Fit to Screen, 90-degree Rotation, Download, Image Metadata Information, Previous, and Next.
- **Single-Image Rule**: Hides navigation arrows and gallery strip when viewing a single image.
- **Multiple-Image Rule**: Displays counter (e.g. `3 / 12`), thumbnail filmstrip, and touch swipe navigation.
- **Auto-Collapse Timer**: Collapses smoothly back into a floating bubble after 3 to 6 seconds (default 4s), with automatic pause during active dragging or interaction.

### 9. PDF & Document Reader
- Custom canvas and document viewer supporting PDF and plain text files (.txt, .md, .json, .log, .csv).
- Waterdrop document control bar with page navigation (e.g. `PAGE 08 / 120`), text search with real-time match counters and highlighting, zoom, and fit modes.

### 10. Global Settings System (12 Categories)
1. **Appearance**: 4 themes (*Midnight Glass*, *Obsidian Abyss*, *Cyber Neon*, *Deep Amethyst*), 4 neon accent palettes, glass intensity, blur sliders, corner radius, font sizing.
2. **Device & Layout**: Automatic responsive mode, forced desktop, or forced mobile layouts.
3. **Performance**: Balanced, High Performance (low-end devices), and Quality (60fps visualizer) modes.
4. **Movie Player**: Volume defaults, speed, subtitle toggle, and fit mode.
5. **Music Player**: Default volume, visualizer style, and repeat/shuffle defaults.
6. **Waterdrop Controls**: Auto-collapse timer slider (3 to 6 seconds) and anchor positions.
7. **PDF Reader**: Default fit and layout modes.
8. **Pairing & Signals**: Session duration, code expiration, and custom worker signaling URLs.
9. **Accessibility**: High contrast borders and reduced motion preferences.
10. **Notifications**: In-app toast settings for connection events and media completions.
11. **Storage & Data**: LocalStorage bytes usage, IndexedDB stats, JSON settings export/import, and media cache cleanup.
12. **Device Telemetry**: Battery status monitor with strict fallback.

---

## Project Structure

```
CAST/
├── index.html                   # Master entrypoint with desktop & mobile shells
├── package.json                 # Project configuration & npm/pnpm scripts
├── manifest.webmanifest         # Progressive Web App manifest
├── service-worker.js            # PWA service worker with offline asset caching
├── wrangler.toml                # Cloudflare Worker deployment configuration
├── _routes.json                 # Cloudflare Pages routing rules
├── README.md                    # Platform documentation
├── DEPLOYMENT.md                # Cloudflare Pages & Workers deployment guide
├── assets/
│   ├── svg/
│   │   └── icons.svg            # Strict SVG icon sprite library
│   ├── fonts/                   # Typography assets
│   └── images/                  # Media previews
├── css/
│   ├── global.css               # Design tokens, CSS variables & reset
│   ├── liquid-glass.css         # Frosted panels, neon glows & intro animation
│   ├── desktop.css              # Desktop sidebar & multi-column workspace
│   ├── mobile.css               # Mobile compact header & bottom navigation
│   ├── players.css              # Video player, music player & Aurora visualizer
│   └── waterdrop.css            # Animated SVG Waterdrop control system
├── js/
│   ├── app.js                   # Application controller & state orchestrator
│   └── modules/
│       ├── icons.js             # SVG icon helper & strict emoji sanitizer
│       ├── settings.js          # 12-category settings & storage manager
│       ├── pairing.js           # Pairing coordinator & session lifecycle
│       ├── webrtc.js            # WebRTC PeerConnection & mesh signaling
│       ├── media-transfer.js    # Chunked file streaming & blob lifecycle
│       ├── movie-player.js      # Custom HTML5 video player with sync
│       ├── music-player.js      # Bulk audio player & single-song rule
│       ├── audio-visualizer.js  # Aurora Nebula Canvas audio visualizer
│       ├── image-viewer.js      # Liquid image viewer & swipe gestures
│       ├── pdf-reader.js        # PDF & text reader with search
│       ├── waterdrop.js         # Animated SVG Waterdrop component
│       ├── no-signal.js         # DVD-style bouncing screensaver
│       └── qrcode.js            # Standalone SVG QR code generator
├── workers/
│   └── signaling-worker.js      # Cloudflare Worker WebRTC signaling backend
└── test/
    └── suite.js                 # Automated verification test suite
```

---

## Local Development & Testing

### 1. Run with Node.js
```bash
node -e 'const http=require("http"),fs=require("fs"),path=require("path");http.createServer((req,res)=>{let p=path.join(process.cwd(),req.url==="/"?"index.html":req.url.split("?")[0]);fs.readFile(p,(e,d)=>{if(e){res.statusCode=404;res.end("Not found");}else{const ext=path.extname(p);const m={".html":"text/html",".css":"text/css",".js":"text/javascript",".svg":"image/svg+xml",".json":"application/json"};res.setHeader("Content-Type",m[ext]||"text/plain");res.end(d);}});}).listen(8080,()=>console.log("CAST running at http://localhost:8080"));'
```
Or with python:
```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` in your web browser.

### 2. Testing Two-Device Pairing Locally
1. Open `http://localhost:8080` in Tab A and click **Cast Media** (Sender). Click **Start New Pairing Session** to generate a 6-digit code.
2. Open `http://localhost:8080` in Tab B and click **Pair / Watch** (Receiver). Enter the 6-digit code.
3. The two tabs pair immediately through the built-in local broadcast channel.
4. Upload or choose a demo video, songs, or images in Tab A. They stream and synchronize on Tab B in real time!

### 3. Run Automated Tests
```bash
node test/suite.js
```
The test suite validates:
- Zero emojis across all source files.
- All 41+ required SVG icons registered and accessible.
- Settings system defaults and schema validity.
- 6-digit pairing code generation and expiration limits.
- Single-Song Rule enforcement.
- Cloudflare Worker exports and endpoints.

---

## Creator Information

- **Project**: CAST Media Casting & Streaming Platform
- **Branding**: Created By Shiv Yogi
- **License**: MIT
