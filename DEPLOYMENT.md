# CAST — Deployment & Infrastructure Guide

**Created By Shiv Yogi**

This guide provides instructions for deploying **CAST** to **Cloudflare Pages** (frontend) and **Cloudflare Workers** (WebRTC signaling & session management).

---

## 1. Architecture Overview

```
                      +-----------------------------+
                      |   Cloudflare Edge Network   |
                      +-----------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
    [Cloudflare Pages]                            [Cloudflare Worker]
    Static Frontend Host                        Signaling & Pairing API
    - HTML5 / CSS / ES Modules                  - POST /api/pair/create
    - SVG Icon Library                          - POST /api/pair/join
    - Progressive Web App                       - POST /api/pair/signal
    - Service Worker Cache                      - GET  /api/pair/ws/:id
               |                                           |
               +---------------------+---------------------+
                                     |
                                 [WebRTC]
                       Direct Peer-to-Peer DataChannel
                     Sender Device <---> Receiver Device
```

---

## 2. Cloudflare Pages Deployment (Frontend)

### Method A: Direct Git Integration (Recommended)
1. Push your repository to **GitHub**.
2. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/).
3. Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
4. Select your `CAST` repository.
5. In **Build settings**:
   - **Framework preset**: `None`
   - **Build command**: Leave blank (pure client-side vanilla assets)
   - **Build output directory**: `/` (or root where `index.html` is located)
6. Click **Save and Deploy**.
7. Cloudflare Pages provides an HTTPS domain (e.g., `cast.pages.dev`).

### Method B: Deploy via Wrangler CLI
```bash
# Install wrangler if needed or use npx
npx wrangler pages deploy . --project-name=cast-media-platform
```

---

## 3. Cloudflare Worker Deployment (Signaling Backend)

The signaling backend is located in `workers/signaling-worker.js`.

### Step 1: Configure `wrangler.toml`
Ensure `wrangler.toml` matches your Cloudflare account configuration:
```toml
name = "cast-signaling-worker"
main = "workers/signaling-worker.js"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"
MAX_PAIRING_ATTEMPTS = "5"
```

### Step 2: Deploy Worker
```bash
npx wrangler deploy
```
Once deployed, Cloudflare outputs the Worker's public URL:
`https://cast-signaling-worker.<your-subdomain>.workers.dev`

### Step 3: Link Worker URL in Settings
In the CAST user interface:
1. Navigate to **Settings** > **Pairing & Signals**.
2. Enter your Worker URL in the **Signaling Server URL** field (e.g., `https://cast-signaling-worker.<subdomain>.workers.dev`).
3. If left blank, the app will check the current domain or seamlessly fall back to local mesh signaling.

---

## 4. HTTPS & Security Requirements

- **WebRTC & Camera/Screen Requirements**: Modern browsers (Chrome, Safari, Firefox, Edge, Android Chrome, and Smart TV browsers) require HTTPS to access WebRTC APIs, `MediaDevices`, and the Battery API.
- Cloudflare Pages and Workers automatically provide free SSL/TLS certificates.
- **No Secrets in Frontend**: Pairing codes are ephemeral (5-minute TTL) and validated on the worker or over the direct P2P data channel.

---

## 5. WebRTC Connectivity & Optional TURN Server

### Default STUN Configuration
CAST comes configured with Google's public STUN servers in `js/modules/webrtc.js`:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

STUN enables peer discovery in standard NAT and domestic Wi-Fi network conditions.

### Optional Cloudflare Calls / TURN Setup
In restrictive enterprise firewalls, symmetric NATs, or multi-hop mobile carrier networks, direct P2P connections may benefit from a TURN relay:
1. In Cloudflare Dashboard, go to **Calls / TURN Service**.
2. Create TURN credentials (hostname, username, credential).
3. In `js/modules/webrtc.js`, add your TURN server entry to `RTC_CONFIG.iceServers`:
```javascript
{
  urls: 'turn:your-turn-host.cloudflare.com:3478?transport=udp',
  username: '<your-turn-username>',
  credential: '<your-turn-credential>'
}
```

---

## 6. Testing Checklist Before Production Launch

- [x] **Cinematic Intro**: Plays CAST typography -> Created By Shiv Yogi -> smoothly opens main website.
- [x] **Zero Emoji Enforcement**: All icons rendered using SVG components.
- [x] **Sender Flow**: File picker loads movies, bulk music, images, and documents.
- [x] **Receiver Flow**: Enters 6-digit code or scans QR, transitions to player upon stream start.
- [x] **DVD Screensaver**: Bounces across screen with glow color shifting on collision when idle.
- [x] **Single-Song Rule**: Previous/Next hidden when playlist <= 1, shown when >= 2.
- [x] **Single-Image Rule**: Gallery navigation hidden when images <= 1.
- [x] **Waterdrop Controls**: Expands on click, collapses after idle timeout (default 4s).
- [x] **Aurora Visualizer**: Canvas reacts dynamically to live audio frequency data.
- [x] **Settings System**: All 12 categories persist preferences and apply live DOM changes.
- [x] **Service Worker**: PWA assets cached for fast loading and offline resilience.
