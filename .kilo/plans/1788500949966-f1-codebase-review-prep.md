# F1 Grand Prix 3D — Codebase Review Preparation

## PROJECT_STRUCTURE

```
D:\CODE\F1 Game\
├── server.js                  # Node.js static file server (port 3000)
├── package.json               # Minimal manifest, no npm deps (CDN-based)
├── index.html                 # Entry point: HUD DOM, import map, WebRTC script
├── README.md                  # Full architecture & deployment doc
├── css/
│   └── style.css              # Complete broadcast HUD theme (2609 lines)
├── js/
│   ├── main.js                # Main orchestrator (F1Game class, 2003 lines)
│   ├── physics.js             # Cannon-es F1 arcade physics (375 lines)
│   ├── car.js                 # Procedural F1 car mesh (589 lines)
│   ├── circuit.js             # Procedural 3D track builder (1374+ lines, full)
│   ├── track.js               # Legacy Monza-only track (1196 lines)
│   ├── ai.js                  # 10-car AI grid + 9 driver roster (1213 lines)
│   ├── session.js             # Practice/Qualifying/Race state machine (506 lines)
│   ├── timing.js              # Lap timing + checkpoint system (292 lines)
│   ├── network.js             # PeerJS WebRTC P2P (327 lines)
│   ├── fx.js                  # Tire smoke, skid marks, camera shake (200 lines)
│   ├── audio.js               # Procedural Web Audio engine (834 lines)
│   ├── textures.js            # Procedural canvas textures (515 lines)
│   ├── tracks_db.js           # 10 Grand Prix track configs (595 lines)
│   └── teams_db.js            # 10 F1 constructor liveries (171 lines)
└── scratch/                   # Dev-only verification scripts & screenshots (NOT TO BE REVIEWED)
```

The `scratch/` directory contains ~100 verification scripts and screenshots and should be ignored during review.

---

## TECH_STACK

- **Framework / Library:** Vanilla JavaScript + ES Modules (no framework). Three.js 0.160 + Cannon-es 0.20 (loaded via CDN import map), PeerJS 1.5.4 (WebRTC).
- **Programming Languages:** JavaScript (ES2020 modules), CSS3, HTML5.
- **Build Tools:** NONE. Zero bundler, zero npm install. Pure CDN static hosting.
- **Server:** Custom Node.js static file server (`server.js`, port 3000). No Express, no Vite, no Webpack.
- **Database:** NONE. Pure client-side. Only `localStorage` for team preference (`f1_player_team`).
- **API / Network:** PeerJS WebRTC DataChannel for 2-player P2P multiplayer (host-authoritative).
- **Entry Points:** `index.html` → `js/main.js` (type=module). Bootstraps `new F1Game()` on DOMContentLoaded.
- **Fonts (Google Fonts CDN):** Outfit, Chakra Petch, Titillium Web.

---

## IMPORTANT_FILES

| File | Why important |
|---|---|
| `index.html` | Root DOM scaffold, CDN import map, HUD layout, all modal containers, mobile control buttons |
| `package.json` | Entry point declaration (`node server.js`) |
| `server.js` | Static dev server on port 3000 with `--open` browser launch |
| `js/main.js` | F1Game orchestrator: 3D scene, camera, input, HUD sync, animation loop, session/AI/network wiring, track selector, car selector, modals |
| `js/physics.js` | Cannon-es world, 880kg chassis, 8-speed transmission, aerodynamic downforce/drag, barrier deflection, anti-reverse |
| `js/car.js` | F1Car class — procedural composite chassis (nosecone/monocoque/halo/wings/sidepods/wheels), livery system, tire smoke pool |
| `js/circuit.js` | `Track` class — dynamically builds 10 procedural circuits from `tracks_db.js`: ribbon, curbs, barriers, gantry, grid, pit complex, grandstands, crowd texture, brake markers |
| `js/track.js` | Legacy Monza-only hardcoded track (kept for backward compat) |
| `js/ai.js` | `AIGridManager` + `AICar` + `DRIVER_ROSTER` (9 drivers) + `DIFFICULTY_CONFIG` (Easy/Medium/Hard) + pure-pursuit steering + overtaking logic + qualifying sim |
| `js/session.js` | `SessionManager` — Practice/Qualifying/Race state machine, 5-red-light countdown, jump-start detection, race finish flow |
| `js/timing.js` | `TimingSystem` — lap/sector splits, wrong-way detection, checkpoint validation, format helpers |
| `js/network.js` | `NetworkManager` — PeerJS host/join, 6-char room codes (e.g. `F1-X7K2`), 30Hz state broadcast, 60Hz input uplink |
| `js/audio.js` | Procedural Web Audio: V6 engine synthesis with harmonics, turbo spool, airbox induction, tire screech, wind rush, crowd, gear pops, wall impact, start beep |
| `js/fx.js` | EffectsManager: preallocated skid-mark pool (120 ribbons), tire smoke billboards, camera shake |
| `js/textures.js` | TextureFactory: procedural carbon fiber, livery, Pirelli sidewall, brake rotor, asphalt, blue runoff, curb, pit building, daytime sky |
| `js/tracks_db.js` | `TRACK_DATABASE` — 10 tracks (Monza, Monaco, Silverstone, Spa, Suzuka, Singapore, Bahrain, Red Bull Ring, Interlagos, Baku) with spline control points, themes, flags, lengths |
| `js/teams_db.js` | `F1_TEAMS` — 10 constructors (Ferrari, Red Bull, Mercedes, McLaren, Aston Martin, Alpine, Williams, Sauber, Haas, RB) with liveries, driver numbers, power units |
| `css/style.css` | All styling: tokens (`:root`), top-bar/session pills/timing tower/leaderboard/minimap/telemetry/mobile controls/modals/animations |

### Files controlling UI components
- `index.html` — every DOM element (top bar, timing tower, telemetry, modals, mobile buttons)
- `js/main.js:541-733` — `initUI()` binds every button
- `css/style.css` — every visual style

### Files controlling animations
- `js/fx.js` — skid fade, camera shake
- `js/track.js:1148-1158` + `js/circuit.js` — waving grandstand flags (`this.animatedFlags`)
- `css/style.css` — CSS transitions (button hovers, modal scale-in, RPM LED flashes, sector pulse)

### Files controlling themes
- `css/style.css:7-22` — `:root` color tokens (`--f1-red`, `--f1-cyan`, `--f1-yellow`, etc.)
- `js/tracks_db.js` — per-track `theme` object (sky color, ground type, curb colors, barrier color, lighting)
- `js/circuit.js:145-287` — `buildEnvironment()` applies track theme to scene

### Files controlling buttons / cards / sidebar / dashboard / pricing / modals
- **Buttons:** `index.html` lines 49-108 (top-bar), `css/style.css:162-238` (.session-btn, .hud-icon-btn, .hud-action-btn), `css/style.css:1204-1229` (.modal-btn), `css/style.css:2315-2604` (.car-card, .btn-select-car)
- **Cards (Track & Car):** `css/style.css:1765-1930` (.track-card), `css/style.css:2428-2605` (.car-card)
- **Sidebar / Timing Tower:** `css/style.css:291-562` (.timing-tower, .tower-row, .race-position-tower)
- **Dashboard / Telemetry:** `css/style.css:830-1076` (.telemetry-cluster, .rpm-led-bar, .tachometer-bar, .pedal-meters, .sector-deltas)
- **Modals:** `index.html:326-587`, `css/style.css:1082-1230` (.modal-backdrop, .modal-card), `css/style.css:1690-1930` (track modal), `css/style.css:1957-2297` (multiplayer modal), `css/style.css:2353-2605` (car modal)

---

## CODE_FILES

(Full file contents follow — these are the actual files as they exist on disk.)

### `package.json`
```json
{
  "name": "f1-web-racing-game",
  "version": "1.0.0",
  "description": "3D Formula 1 Web Racing Game Prototype",
  "main": "server.js",
  "scripts": {
    "start": "node server.js --open",
    "serve": "node server.js"
  },
  "keywords": [
    "threejs",
    "cannon-es",
    "f1",
    "racing-game"
  ],
  "author": "",
  "license": "MIT"
}
```

### `server.js`
```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  const cleanUrl = req.url.split('?')[0];
  let filePath = path.join(__dirname, (cleanUrl === '/' || cleanUrl === '') ? 'index.html' : cleanUrl);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already running. F1 Game Server running at http://localhost:${PORT}/`);
    if (process.argv.includes('--open')) {
      exec(`start http://localhost:${PORT}/`);
    }
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`F1 Game Server running at http://localhost:${PORT}/`);
  if (process.argv.includes('--open')) {
    exec(`start http://localhost:${PORT}/`);
  }
});
```

### `index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Formula 1 Grand Prix 3D - Web Racing Simulator</title>
  <meta name="description" content="High-performance 3D Formula 1 web racing game built with Three.js and Cannon-es. Features realistic downforce physics, responsive arcade handling, F1 broadcast HUD, and session modes.">
  <link rel="stylesheet" href="css/style.css?v=400">

  <!-- PeerJS WebRTC P2P DataChannel Library -->
  <script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>

  <!-- Import Maps for Three.js and Cannon-es CDNs (Zero bundler required) -->
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js",
      "cannon-es": "https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js"
    }
  }
  </script>
</head>
<body>

  <!-- WebGL 3D Canvas Viewport -->
  <div id="game-container">
    <canvas id="webgl-canvas"></canvas>
  </div>

  <!-- F1 Broadcast HUD Layer -->
  <div id="hud-layer">
    <div id="center-alert-banner" class="center-alert-banner"></div>

    <header class="top-bar">
      <div class="brand-section">
        <div class="f1-logo-badge">F1 <span>2026</span></div>
        <div class="session-badge">
          <div class="status-dot"></div>
          <span id="session-badge-text">PRACTICE - FREE DRIVING</span>
        </div>
      </div>

      <nav class="session-controls interactive" aria-label="Session Modes">
        <button id="btn-mode-practice" class="session-btn active" title="Free Practice (Unlimited Laps)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
          Practice
        </button>
        <button id="btn-mode-qualifying" class="session-btn" title="One-Shot Qualifying (1 Flying Lap)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
          Qualifying
        </button>
        <button id="btn-mode-race" class="session-btn" title="Sprint Race (10-Car Grid)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
          Sprint Race
        </button>
        <button id="btn-mode-multiplayer" class="session-btn mp-btn" title="P2P Multiplayer via WebRTC">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          Multiplayer
        </button>
      </nav>

      <button id="btn-track-select" class="track-select-btn interactive" title="Select Grand Prix Circuit">
        <span class="track-btn-flag" id="track-btn-flag">🇮🇹</span>
        <span class="track-btn-name" id="track-btn-name">MONZA GP</span>
        <svg class="track-btn-arrow" viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
      </button>

      <button id="btn-car-select" class="car-select-btn interactive" title="Choose Your F1 Car & Constructor Livery">
        <span class="car-btn-swatch" id="car-btn-swatch"></span>
        <span class="car-btn-name" id="car-btn-name">FERRARI</span>
        <svg class="car-btn-arrow" viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
      </button>

      <div class="difficulty-controls interactive" id="difficulty-controls" aria-label="AI Difficulty">
        <span class="diff-title">DIFFICULTY:</span>
        <button class="diff-btn" data-diff="EASY" title="AI Overtakes, Accessible 82% Pace, Easy to Re-Overtake">EASY</button>
        <button class="diff-btn active" data-diff="MEDIUM" title="Competitive 94% Pace, Clean Overtakes, Guards Apex">MEDIUM</button>
        <button class="diff-btn" data-diff="HARD" title="Hardcore 100%+ Pace, Late Braking, Aggressive Blocking & Slipstream">HARD</button>
      </div>

      <div class="utility-controls interactive">
        <button id="mute-btn" class="hud-icon-btn" title="Toggle Sound (M)">
          <svg id="mute-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </button>
        <button id="camera-btn" class="hud-icon-btn" title="Cycle Camera: Chase / Cockpit / TV (C)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.4 10.5l4.77-8.26C13.47 2.09 12.75 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10c4.7 0 8.65-3.24 9.72-7.61L14.5 12.5h-5.1zM12 4.07c.34 0 .67.03 1 .08L8.6 11.5H5.05C5.66 7.37 8.52 4.26 12 4.07zM3.95 12.5h4.15l-3.3 5.72C4.31 16.63 4 14.63 4 12.5zm8.05 7.43c-2.38 0-4.48-1.22-5.74-3.09l4.13-7.16 2.37 4.1-2.48 4.31c.56.09 1.13.14 1.72.14 1.83 0 3.51-.62 4.87-1.65l-2.02 3.5c-1.04.55-2.22.85-3.47.85z"/>
          </svg>
        </button>
        <button id="restart-btn" class="hud-action-btn" title="Restart Current Session (R)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          Restart
        </button>
        <button id="help-btn" class="hud-icon-btn" title="Controls Guide (H)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
        </button>
      </div>
    </header>

    <aside class="timing-tower">
      <div class="timing-header">
        <div class="driver-pill" id="hud-driver-pill">
          <span class="driver-number" id="hud-driver-number">16</span>
          <span class="driver-name" id="hud-driver-name">PLAYER</span>
        </div>
        <div class="header-badges">
          <span class="player-live-pos" id="hud-player-pos">P1 / 10</span>
          <span class="lap-counter-text" id="hud-lap-counter">LAP 1/3</span>
        </div>
      </div>
      <div class="timing-rows">
        <div class="timing-row"><span class="timing-label">CURRENT</span><span class="timing-value current" id="timing-current">00:00.000</span></div>
        <div class="timing-row"><span class="timing-label">BEST</span><span class="timing-value best" id="timing-best">--:--.---</span></div>
        <div class="timing-row"><span class="timing-label">LAST</span><span class="timing-value last" id="timing-last">--:--.---</span></div>
        <div class="timing-row"><span class="timing-label">DELTA</span><span class="delta-badge faster" id="timing-delta">+0.000s</span></div>
      </div>
      <div class="sectors-container">
        <div class="sector-block"><div class="sector-title">S1</div><div class="sector-status" id="sector-status-1"></div></div>
        <div class="sector-block"><div class="sector-title">S2</div><div class="sector-status" id="sector-status-2"></div></div>
        <div class="sector-block"><div class="sector-title">S3</div><div class="sector-status" id="sector-status-3"></div></div>
      </div>
      <div id="race-position-tower" class="race-position-tower">
        <div class="tower-header"><span>POS</span><span>DRIVER</span><span>GAP</span></div>
        <div id="position-tower-rows" class="position-tower-rows"></div>
      </div>
    </aside>

    <div id="center-alert-container"></div>

    <div id="start-lights-gantry" class="hidden">
      <div class="gantry-title">FIA STARTING SYSTEM</div>
      <div class="gantry-lights-grid">
        <div class="light-column"><div class="f1-bulb" id="f1-bulb-1-1"></div><div class="f1-bulb" id="f1-bulb-1-2"></div></div>
        <div class="light-column"><div class="f1-bulb" id="f1-bulb-2-1"></div><div class="f1-bulb" id="f1-bulb-2-2"></div></div>
        <div class="light-column"><div class="f1-bulb" id="f1-bulb-3-1"></div><div class="f1-bulb" id="f1-bulb-3-2"></div></div>
        <div class="light-column"><div class="f1-bulb" id="f1-bulb-4-1"></div><div class="f1-bulb" id="f1-bulb-4-2"></div></div>
        <div class="light-column"><div class="f1-bulb" id="f1-bulb-5-1"></div><div class="f1-bulb" id="f1-bulb-5-2"></div></div>
      </div>
      <div class="gantry-subtitle">STAND BY FOR LIGHTS OUT</div>
    </div>

    <footer class="bottom-hud">
      <div class="minimap-card">
        <div class="minimap-header"><span>TRACK RADAR</span><span id="radar-track-title">MONZA GP</span></div>
        <canvas id="minimap-canvas"></canvas>
      </div>
      <div class="controls-hint">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>&uarr;</kbd><kbd>&larr;</kbd><kbd>&darr;</kbd><kbd>&rarr;</kbd> Drive</span>
        <span><kbd>C</kbd> Camera</span>
        <span><kbd>R</kbd> Reset</span>
      </div>
      <div class="telemetry-cluster">
        <div class="rpm-led-bar" id="rpm-leds"></div>
        <div class="speed-gear-main">
          <div class="gear-container"><span class="gear-label">GEAR</span><span class="gear-number" id="gear-value">1</span></div>
          <div class="speed-container"><span class="speed-digits" id="speed-value">000</span><span class="speed-unit">KM/H</span></div>
        </div>
        <div class="tachometer-bar" title="Engine RPM">
          <div class="tach-fill" id="tach-fill"></div>
          <div class="tach-marker" style="left: 70%"></div>
          <div class="tach-marker" style="left: 93%"></div>
        </div>
        <div class="sector-deltas" id="sector-deltas">
          <div class="sd-cell" id="sd-1"><span class="sd-label">S1</span><span class="sd-value">--</span></div>
          <div class="sd-cell" id="sd-2"><span class="sd-label">S2</span><span class="sd-value">--</span></div>
          <div class="sd-cell" id="sd-3"><span class="sd-label">S3</span><span class="sd-value">--</span></div>
        </div>
        <div class="pedals-drs-row">
          <div class="pedal-meters">
            <div class="pedal-meter" title="Throttle"><div class="pedal-fill throttle" id="pedal-throttle-fill"></div></div>
            <div class="pedal-meter" title="Brake"><div class="pedal-fill brake" id="pedal-brake-fill"></div></div>
          </div>
          <div class="drs-badge" id="drift-badge" style="display:none; background: #ff7700; color: #fff; border-color: #ffa500; font-weight: 900; box-shadow: 0 0 10px #ff7700;">DRIFT</div>
          <div class="drs-badge" id="drs-badge">DRS</div>
        </div>
      </div>
    </footer>

    <div id="mobile-controls" class="mobile-controls interactive">
      <div class="mobile-steer-zone">
        <button id="touch-left" class="touch-btn touch-steer" aria-label="Steer Left">
          <span class="touch-arrow">&#9668;</span><span class="touch-txt">LEFT</span>
        </button>
        <button id="touch-right" class="touch-btn touch-steer" aria-label="Steer Right">
          <span class="touch-txt">RIGHT</span><span class="touch-arrow">&#9658;</span>
        </button>
      </div>
      <div class="mobile-action-zone">
        <button id="touch-cam" class="touch-btn touch-action" aria-label="Change Camera"><span class="action-icon">&#128247;</span><span>CAM</span></button>
        <button id="touch-reset" class="touch-btn touch-action" aria-label="Reset Car"><span class="action-icon">&#8635;</span><span>RESET</span></button>
      </div>
      <div class="mobile-pedal-zone">
        <button id="touch-brake" class="touch-btn touch-pedal touch-brake" aria-label="Brake / Reverse"><span class="pedal-icon">&#9660;</span><span class="pedal-txt">BRAKE</span></button>
        <button id="touch-throttle" class="touch-btn touch-pedal touch-throttle" aria-label="Accelerate"><span class="pedal-icon">&#9650;</span><span class="pedal-txt">GAS</span></button>
      </div>
    </div>
  </div>

  <!-- Modal overlays -->
  <div class="modal-backdrop" id="modal-multiplayer">
    <div class="modal-card mp-modal-card">
      <div class="track-modal-header">
        <div>
          <div class="track-modal-pretitle">WEBRTC PEER-TO-PEER RACING</div>
          <h2 class="modal-title">FORMULA 1 MULTIPLAYER LOBBY</h2>
          <p class="modal-subtitle">Direct 2-Player real-time racing over WebRTC DataChannels with 8 synchronized AI cars.</p>
        </div>
        <button id="btn-close-mp" class="track-modal-close-btn" title="Close">&times;</button>
      </div>
      <div class="mp-columns">
        <div class="mp-card host-card">
          <div class="mp-card-badge">CREATE A RACE</div>
          <h3 class="mp-card-title">HOST A ROOM</h3>
          <p class="mp-card-desc">Create a private game session and share your 6-character room invite code with a friend.</p>
          <div class="mp-field-group">
            <label class="mp-label">YOUR ROOM INVITE CODE</label>
            <div class="mp-code-box">
              <span id="mp-host-code" class="mp-code-display">GENERATING...</span>
              <button id="btn-copy-code" class="btn-mp-copy" title="Copy code">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                Copy
              </button>
            </div>
            <div id="mp-copy-toast" class="mp-copy-toast">Copied to Clipboard!</div>
          </div>
          <div class="mp-field-group">
            <label class="mp-label">SELECT GRAND PRIX CIRCUIT</label>
            <select id="mp-select-track" class="mp-select"></select>
          </div>
          <div class="mp-field-group">
            <label class="mp-label">SESSION FORMAT</label>
            <select id="mp-select-mode" class="mp-select">
              <option value="PRACTICE">Practice Session (Free Track Running)</option>
              <option value="QUALIFYING">One-Shot Qualifying (Ghost Hot Lap)</option>
              <option value="RACE" selected>Sprint Race (20 Laps • 10-Car Grid)</option>
            </select>
          </div>
          <div class="mp-status-container" id="mp-host-status">
            <div class="mp-pulse amber" id="mp-host-pulse"></div>
            <span id="mp-host-status-text">Waiting for Player 2 to join...</span>
          </div>
          <button id="btn-mp-launch" class="btn-mp-launch" disabled>LAUNCH MULTIPLAYER WEEKEND</button>
        </div>
        <div class="mp-card join-card">
          <div class="mp-card-badge guest">CONNECT</div>
          <h3 class="mp-card-title">JOIN A ROOM</h3>
          <p class="mp-card-desc">Enter a 6-character room invite code from your friend to join their Grand Prix lobby.</p>
          <div class="mp-field-group">
            <label class="mp-label">ENTER 6-CHARACTER ROOM CODE</label>
            <div class="mp-input-wrap">
              <input id="mp-input-code" class="mp-input" placeholder="e.g. F1-X7K2" maxlength="10" autocomplete="off" spellcheck="false" />
            </div>
          </div>
          <button id="btn-mp-join" class="btn-mp-join">CONNECT TO ROOM</button>
          <div class="mp-status-container" id="mp-guest-status" style="margin-top: 24px;">
            <div class="mp-pulse gray" id="mp-guest-dot"></div>
            <span id="mp-guest-status-text">Enter room code above and click Connect</span>
          </div>
          <div class="mp-info-box">
            <div class="mp-info-title">MULTIPLAYER RULES</div>
            <ul class="mp-info-list">
              <li><strong>Car #1:</strong> Host Player (Scuderia Red)</li>
              <li><strong>Car #2:</strong> Guest Player (Cyan Racing)</li>
              <li><strong>Cars #3-10:</strong> 8 AI Opponents synced by Host</li>
              <li><strong>Ghost Mode:</strong> Active in Qualifying to prevent griefing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" id="modal-peer-disconnected">
    <div class="modal-card">
      <h2 class="modal-title" style="color: #f87171;">PEER DISCONNECTED</h2>
      <p class="modal-subtitle">The connection to the other player was closed. Returning to single-player mode.</p>
      <div class="modal-actions">
        <button id="btn-close-disconnect" class="modal-btn primary">Return to Practice</button>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" id="modal-track-select">
    <div class="modal-card track-modal-card">
      <div class="track-modal-header">
        <div>
          <div class="track-modal-pretitle">FIA FORMULA 1 WORLD CHAMPIONSHIP</div>
          <h2 class="modal-title">GRAND PRIX CALENDAR 2026</h2>
          <p class="modal-subtitle">Select from 10 authentic circuits with procedural 3D splines, elevation profiles, and environmental themes.</p>
        </div>
        <button id="btn-close-track-select" class="track-modal-close-btn" title="Close">&times;</button>
      </div>
      <div class="track-grid-container" id="track-grid-container"></div>
    </div>
  </div>

  <div class="modal-backdrop" id="modal-car-select">
    <div class="modal-card car-modal-card">
      <div class="car-modal-header">
        <div>
          <div class="car-modal-pretitle">FIA FORMULA 1 CONSTRUCTORS</div>
          <h2 class="modal-title">CHOOSE YOUR F1 CAR &amp; TEAM</h2>
          <p class="modal-subtitle">Select an official constructor to drive. Experience authentic liveries, factory power units, and technical aerodynamics.</p>
        </div>
        <button id="btn-close-car-select" class="car-modal-close-btn" title="Close">&times;</button>
      </div>
      <div class="car-grid-container" id="car-grid-container"></div>
    </div>
  </div>

  <div class="modal-backdrop" id="modal-qualifying">
    <div class="modal-card">
      <h2 class="modal-title">QUALIFYING RESULTS</h2>
      <p class="modal-subtitle">Official 1-Shot Flying Lap Classification</p>
      <div class="result-hero-box">
        <div class="result-position-badge" id="quali-pos-text">P1</div>
        <div class="result-lap-time" id="quali-time-text">01:12.450</div>
        <div class="result-delta" id="quali-delta-text">POLE POSITION!</div>
      </div>
      <table class="leaderboard-table">
        <thead><tr><th>POS</th><th>DRIVER</th><th>TEAM</th><th>TIME</th><th>GAP</th></tr></thead>
        <tbody id="quali-table-body"></tbody>
      </table>
      <div class="modal-actions">
        <button id="btn-quali-retry" class="modal-btn">Retry Qualifying</button>
        <button id="btn-quali-race" class="modal-btn primary">Start Race from this Grid</button>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" id="modal-race-finish">
    <div class="modal-card">
      <h2 class="modal-title" id="race-result-title">VICTORY! 1ST PLACE</h2>
      <p class="modal-subtitle">Grand Prix Sprint Race Finished (10-Car Classification)</p>
      <div class="result-hero-box">
        <div style="font-size: 13px; color: #94a3b8; letter-spacing: 1px;">TOTAL RACE TIME</div>
        <div class="result-lap-time" id="race-total-time">02:26.812</div>
        <div style="font-size: 13px; color: #00d2be; margin-top: 6px;">FASTEST LAP: <span id="race-best-lap">01:13.120</span></div>
        <div id="race-penalty-note" style="display: none; color: #ff3333; font-size: 12px; margin-top: 4px;">*Includes +5.0s Jump-Start Penalty</div>
      </div>
      <table class="leaderboard-table" style="margin-top: 14px;">
        <thead><tr><th>POS</th><th>DRIVER</th><th>TEAM</th><th>GAP</th></tr></thead>
        <tbody id="race-table-body"></tbody>
      </table>
      <div class="modal-actions">
        <button id="btn-race-again" class="modal-btn primary">Race Again</button>
        <button id="btn-race-practice" class="modal-btn">Return to Practice Menu</button>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" id="modal-mock-ad">
    <div class="modal-card ad-card">
      <div class="ad-tag" id="ad-tag-text">OFFICIAL BROADCAST SPONSOR</div>
      <div class="ad-logo" id="ad-sponsor-name">ROLEX</div>
      <div class="ad-subtitle" id="ad-sponsor-subtitle">Formula 1 Grand Prix Global Partner &amp; Official Timepiece</div>
      <div class="ad-timer-bar"><div class="ad-timer-progress" id="ad-timer-fill"></div></div>
      <div class="modal-actions" style="margin-top: 24px;">
        <button id="btn-skip-ad" class="modal-btn primary">Skip to Track</button>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" id="modal-help">
    <div class="modal-card">
      <h2 class="modal-title">RACE CONTROLS</h2>
      <p class="modal-subtitle">Formula 1 Prototype Phase 1 Guide</p>
      <table class="controls-table">
        <tr><td><kbd>W</kbd> or <kbd>&uarr;</kbd></td><td>Throttle / Acceleration (8-Speed Transmission)</td></tr>
        <tr><td><kbd>S</kbd> or <kbd>&darr;</kbd></td><td>Carbon-Ceramic Brake / Reverse</td></tr>
        <tr><td><kbd>A</kbd> / <kbd>D</kbd> or <kbd>&larr;</kbd> / <kbd>&rarr;</kbd></td><td>Speed-Sensitive Steering</td></tr>
        <tr><td><kbd>TOUCH</kbd></td><td>On-Screen Pedals (Gas/Brake) &amp; Steering Buttons for Mobile &amp; Tablet</td></tr>
        <tr><td><kbd>C</kbd></td><td>Cycle Camera: Chase Cam &rarr; Cockpit Halo &rarr; TV Broadcast</td></tr>
        <tr><td><kbd>R</kbd></td><td>Reset Session / Teleport to Grid</td></tr>
        <tr><td><kbd>M</kbd></td><td>Toggle Procedural Sound Mute / Unmute</td></tr>
        <tr><td><kbd>H</kbd></td><td>Toggle this Help Dialog</td></tr>
      </table>
      <div class="modal-actions">
        <button id="btn-close-help" class="modal-btn primary">Back to Track</button>
      </div>
    </div>
  </div>

  <script type="module" src="js/main.js?v=600"></script>
</body>
</html>
```

---

### `js/main.js` (key sections)

(See separate full read above; full content was 2003 lines. The key wiring points are:)
- `import` block (lines 1-13): pulls all modules with cache-busting `?v=` query strings
- `class F1Game constructor` (lines 18-63): instantiates `AudioManager`, `PhysicsWorld`, `NetworkManager`, initializes scene, track, vehicles, timing, session, minimap, inputs, mobile controls, UI, network; starts `requestAnimationFrame` loop
- `initThree()` (65-128): creates Scene (hemi + ambient + directional sun), PerspectiveCamera, WebGLRenderer (PCFSoftShadowMap, ACES tone mapping), scratch Vector3 pool for render-loop
- `initTrack()` (130-134): `new Track(scene, physics, currentTrackId)` → wires `physics.isOnTrackCallback`
- `initVehicles()` (136-155): creates player `physics.createVehicleBody` + `F1Car` with team livery, then `new AIGridManager(track, physics, scene).init(playerVehicle, playerCar)`
- `initTimingAndSession()` (157-186): builds `SessionManager` with UI callbacks (`showAlert`, `updateSessionBadge`, `showQualifyingModal`, `showRaceFinishModal`, `showMockAd`, `broadcastLights`); starts in PRACTICE
- `initMinimap()` / `drawMinimap()` (188-296): 170x170 canvas, draws track spline, AI dots, player triangle with heading
- `initInputs()` (298-326): keyboard listeners (W/A/S/D/arrows/C/R/M/H, audio init on first keypress)
- `initMobileControls()` (328-375): touch/mouse bindings to `touch-left/right/throttle/brake/cam/reset`
- `updateControls(dt)` (377-430): AAA asymmetric steering filter (turn-in 9.5, center 26.0), anti-reverse near start line (`t < 0.035 || t > 0.965`), jump-start detection (returns throttle 0.3 / brake 1.0 during LIGHTS_COUNTDOWN)
- `cycleCamera()` / `updateCamera()` (432-522): three modes CHASE (dynamic FOV up to +16°, lerp dt*8.5), COCKPIT (FOV 72, helmet halo view), TV (FOV 48, 12m up + 22m tangent off); applies camera shake offset
- `restartSession()` / `toggleMute()` / `initUI()` (524-733): binds every button
- `updateHUD()` (735-889): writes speed/gear/15 RPM LEDs/pedals/DRS/sector deltas/race position tower (rebuilds innerHTML every frame)
- `renderSectorDeltas()` (915-951): green/red/purple per-sector +/-
- `showCenterAlert()` / `showQualifyingModal()` / `showRaceFinishModal()` / `showMockAd()` (953-1178): all HUD/modal updates
- `openTrackSelectModal()` / `initTrackSelectorUI()` / `drawTrackPreview()` / `switchTrack()` (1180-1364): track modal grid with 2D spline previews; `switchTrack()` calls `track.loadTrack`, re-wires physics/timing/session/ai, updates header button
- `openCarSelectModal()` / `initCarSelectorUI()` / `drawCarLiveryPreview()` / `switchCar()` (1369-1548): constructor modal with 2D livery swatches
- `initNetwork()` / `launchMultiplayerWeekend()` / `onGuestInitGame()` / `onGuestStateSync()` / `onPeerDisconnected()` (1576-1782): all P2P plumbing
- `animate(t)` loop (1809-1990): branches to guest thin-client mode (`isMultiplayer && !isHost`) which interpolates host-sent transforms at `dt*25.0` lerp speed; otherwise runs authoritative single-player / host: `physics.updateVehicle` → `physics.step` → `playerCar.setPositionAndRotation` → `session.update` → `timing.update` → `fx.update` → `audio.update` → `updateCamera` → `updateHUD` → `drawMinimap` → broadcast 30Hz state if host → `renderer.render`
- `bootGame()` (1994-2002): instantiates `new F1Game()` once DOM ready

(Full 2003-line file content already shown above when read.)

### `js/physics.js` (key sections)
- `class PhysicsWorld` constructor builds `CANNON.World` with gravity 0,0,0 (cars locked to plane Y=0.04), SAPBroadphase, zero friction
- 8 gear ratios (45 to 350 km/h)
- `createVehicleBody()` (50-82): Box chassis (0.9 × 0.25 × 2.2), 880kg, linearFactor (1,0,1), angularFactor (0,1,0) — strictly yaw-only, no flip/fly
- `updateVehicle()` (87-321): applies downforce `6.2 * v²`, drag `0.85 * v²`, auto-shift gears, throttle `14200 * gearRatio`, brake clamp `min(maxBrake, brake*32*880)`, anti-reverse near start line, RPM calc, AAA non-linear steering `Math.pow(steer, 1.4)`, progressive cornering velocity blend `dt*15`, barrier deflection + impact impulse + camera shake trigger
- `step()` (326-328): `world.step(1/60, dt, 3)`
- `resetVehicle()` / `setGhostCollision()` (330-374): multi-player ghost collision filtering via collisionFilterGroup/Mask

### `js/car.js` (key sections)
- `class F1Car` constructor: builds composite mesh group (`group` → `visualBody` + `wheelsGroup`), 60-particle smoke pool
- `buildVisualBody()` (97-321): nosecone, monocoque tub, sidepods+intakes, engine airbox, shark fin, cockpit cutout, helmet, visor, titanium halo (CatmullRomCurve3 + TubeGeometry), front wing + endplates, rear wing + DRS flap, rear wing endplates + pillars, diffuser, blinking rain light
- `buildWheels()` (323-470): 4 wheels (FL/FR steerable holders; RL/RR fixed), each with tire cylinder + sidewall (Pirelli texture), rim hub + 5 spokes, brake rotor (cross-drilled), Brembo caliper; carbon suspension wishbones
- `update()` (517-576): wheel spin from `speedMps*dt / circumference`, front wheel steer `dt*18` smoothing, body roll, body pitch (squat on accel, dip on brake), rain light blink `Math.sin(now*0.015)`, smoke emission
- `emitSmoke()` / `updateLivery()`

### `js/circuit.js` (key sections) — full file is 1374+ lines
- `class Track` constructor builds `trackRoot` THREE.Group, `loadTrack(trackData)` from `tracks_db.js`
- `dispose()` properly disposes all geometries, materials, textures, removes Cannon-es bodies
- `sampleTrackData()` samples 600 points along `CatmullRomCurve3` spline
- `generateCheckpoints()` creates 8 evenly-spaced checkpoints
- `buildEnvironment()` applies theme (sky color, fog, ground type — DESERT/URBAN/PARK/etc., procedural skydome with stars/clouds, sun directional light)
- `buildTrackRibbon()` — main asphalt + apron using BufferGeometry
- `buildCurbsAndMarkings()` — theme-colored curbs
- `buildTrackBarriers()` — concrete walls or Armco rails with support posts, also adds Cannon-es static box colliders every ~18m
- `buildStartFinishLine()` — checkered line + 10 staggered grid boxes (slotT formula `(1 - slot*0.0065) % 1`)
- `buildStartFinishGantry()` — overhead beam with sponsor board
- `buildBrakeMarkers()` — 150/100/50 boards before heavy curvature
- `buildSponsorHoardings()` — PIRELLI/ROLEX/ARAMCO/DHL/HEINEKEN/CRYPTO.COM banners
- `buildPitComplex()` — 10 garage doors, VIP gallery, pit wall, perches with screens
- `buildGrandstandsAndAudience()` — uses `createCrowdTexture()` (1024×512 canvas with team-shirt colors), builds full grandstand (foundation + stepped bleachers + crowd plane + railing + 3D front-row fans + rear wall + pillars + cantilevered roof + sponsor fascia + flagpoles + safety catch fence) at each spec point; `animatedFlags` array for wind sway
- `update(dt)` waves flags via `Math.sin(time + offset)`
- `getClosestTrackPoint(x, z)` — linear scan of 600 samples returning point, tangent, t, distance
- `isOnTrack(x, z)` returns `distance <= trackWidth/2 + 1.2`
- `setGantryLights(count)` updates 5 in-3D gantry bulb materials

### `js/track.js` — legacy file (1196 lines). Defines a hardcoded Monza-like track with its own `createTrackSpline()` (16 control points), `buildEnvironment()`, `buildTrackRibbon()`, `buildCurbsAndMarkings()`, `buildTrackBarriers()`, `buildStartFinishLine()`, `buildStartFinishGantry()`, `buildBrakeMarkers()`, `buildSponsorHoardings()`, `buildGrandstandsAndAudience()`, `createCrowdTexture()`, `buildSingleGrandstand()`, `update(dt)` (waving flags), `getClosestTrackPoint()`, `isOnTrack()`, `setGantryLights()`. **Not currently used by main.js** (which uses `circuit.js` instead), kept for backward compatibility.

### `js/ai.js` (key sections)
- `DRIVER_ROSTER` (10 entries): PLAYER + Verstappen / Hamilton / Norris / Alonso / Gasly / Albon / Bottas / Hülkenberg / Lawson with codes (VER/HAM/NOR/ALO/GAS/ALB/BOT/HUL/LAW), team colors, `baseSkill`
- `DIFFICULTY_CONFIG`:
  - EASY: 84% pace, 16m early braking, 0.2 aggression, no apex defense, no drafting, quali 82.5–88.5s
  - MEDIUM: 94% pace, 6m early braking, 0.5 aggression, apex defense, quali 75.0–78.8s
  - HARD: 100% pace, 1.5m early braking, 0.85 aggression, blocks player + drafting, quali 72.2–74.5s
- `class AICar` — has `vehicle` (Cannon-es body), `visualCar` (F1Car), `lateralOffset` for racing line, `remoteInputs` for multiplayer Guest
- `update()` pure-pursuit lookahead, lateral offset transitions, overtake lane selection (±2.8m), drafting +5.5 m/s on HARD only, defensive line logic
- `generateRacingLineWaypoints()` — 300 waypoints with apex offsets, backward-pass braking zones (max decel 30 m/s²)
- `setupSession(mode, qualifiedGrid)` switches between PRACTICE/QUALIFYING/RACE
- `spawnRaceGrid()` places all 10 cars in 2×2 staggered slots
- `simulateQualifyingTimes(playerLapTime, guestLapTime)` builds 10-driver classification
- `updateLeaderboard()` sorts cars by raceDistance, returns live gaps
- `getPlayerLivePosition()`, `getRaceWinner()`, `getFinalClassification()`

### `js/session.js` (506 lines)
- `SESSION_TYPES = { PRACTICE, QUALIFYING, RACE }`
- `class SessionManager` tracks `currentMode`, `difficulty`, `raceLapsTotal`, `playerRaceLap`, `playerGridPos`, `raceState` ('PRE_START' → 'LIGHTS_COUNTDOWN' → 'RACING' → 'FINISHING' → 'FINISHED'), `qualifyingPhase` ('OUT_LAP' → 'FLYING_LAP' → 'FINISHED'), `jumpStart` flag
- `initSession()` — shows `showMockAd` ONLY for race single-player (skipped in multiplayer)
- `startPracticeSession()` spawns at start line stationary
- `startQualifyingSession()` spawns at t=0.95 with 220 km/h rolling speed (gear 6, 11500 RPM)
- `startRaceSession()` calls `beginStartLightsSequence()` → 5 lights @ 1s intervals + random 0.4-1.4s hold → LIGHTS OUT (timing.start)
- `update(dt, ...)` — qualifying arming, race AI update, jump-start detection (velocity > 2.0 during countdown), race winner
- `handleLapComplete()` — practice: best-lap alert, qualifying: triggers `simulateQualifyingTimes` + showQualifyingModal, race: increments `playerRaceLap` and finishes if `>raceLapsTotal`
- `finishRace()` builds final leaderboard via `aiGrid.getFinalClassification` + showRaceFinishModal
- `returnToMenu()` shows another sponsor ad

### `js/timing.js` (292 lines)
- `class TimingSystem` — `currentLap`, `lapStartTime`, `currentLapTime`, `lastLapTime`, `bestLapTime`, `sectorTimes[3]`, `bestSectorTimes[3]`, `sessionBestSectorTimes[3]`, checkpoint state, `isDrivingWrongWay`, `lapInvalidated`
- `start()` / `reset()` / `setTrack()`
- `update(carPos, carVelocity)` per-frame: anti-cheat wrong-way detection (dot < -0.35 with track tangent @ > 4 m/s), sector triggers at progress 0.20/0.55/0.85, finish line crossing via prevProgress wrap
- `onPassSector()` records sector duration, checks purple (session best)
- `onCompleteLap()` validates minimum 20s lap, computes S3, updates best, fires lap callback
- `static formatTime(s)` → "MM:SS.mmm"
- `static formatDelta(s)` → "+0.000s" / "-0.000s"
- `getQualifyingClassification(playerTime)` — sorts player vs `benchmarkGrid` (10 fixed F1 driver times)

### `js/network.js` (327 lines)
- `NETWORK_PACKET_TYPES` — HELLO, INIT_GAME, STATE_SYNC, INPUT, START_LIGHTS, QUALI_RESULTS, RACE_FINISH, DISCONNECT
- `class NetworkManager` — PeerJS wrapper, 6-char room codes (`F1-XXXX` format using alphabet excluding ambiguous chars), ICE servers: stun.l.google.com + stun.twilio.com
- `hostRoom()` creates peer with id `f1gp-2026-<code>`, listens for connection, retries on `unavailable-id`
- `joinRoom()` creates anonymous peer, calls `peer.connect(targetId, { reliable: false })`
- `broadcastState()` rate-limited to 30Hz (33ms interval)
- `sendGuestInput()` raw 60Hz throttle/brake/steer uplink

### `js/audio.js` (834 lines)
- `class AudioManager` — entirely procedural Web Audio (zero external assets)
- Pipelines: engine (6-oscillator V6 harmonic synthesis through WaveShaper saturation + dual formant peaking filters @ 460Hz + 1280Hz), turbo (sine 1800→7200Hz with vibrato), induction (noise buffer + bandpass), tire screech, wind rush, crowd (1-pole low-pass filtered noise)
- `update(rpm, throttle, speedKmh, slip)` drives all oscillators each frame, smooths RPM (0.28), throttle (0.35), boosts engine harmonics with throttle load, opens high-cut filter 550→11000Hz
- SFX: `playGearShift()`, `triggerGearShiftPop()`, `triggerOverrunPop()`, `triggerWastegateFlutter()`, `playStartLightBeep(1-5)` with Bb major triad, `playWallImpact()`, `playLightsOutTone()`, `playSectorChime()`, `playCrowdCheer()`, `playAirhorn()` (3 sine horns at 466/587/698 Hz)

### `js/fx.js` (200 lines)
- `class EffectsManager` — preallocated skid-mark pool (120 ribbons), smoke billboard pool, camera shake
- `initSkidMarks()` 120 PlaneGeometry meshes (0.38 × 1.15) rotated flat
- `updateSkids(dt, car, slip, brake, throttle, speedKmh)` triggers on launch / heavy brake / drift
- `triggerShake(intensity)` sets `shakeIntensity` (max 1.25) and `shakeTime` (0.32s)
- `updateShake(dt)` produces `_shakeOffset` Vector3 with random X/Y/Z falloff
- `getShakeOffset()` consumed by `updateCamera()`

### `js/textures.js` (515 lines)
- `class TextureFactory` static methods:
  - `createCarbonFiberTexture(256,256)` — diagonal weave pattern
  - `createCarLiveryTexture(primary, secondary, accent, number)` — 1024×512 with stripes, sponsor decals (PIRELLI, Mobil 1, GRAND PRIX)
  - `createTireSidewallTexture(stripeColor, label)` — Pirelli P ZERO curved text
  - `createBrakeRotorTexture()` — cross-drilled steel
  - `createAsphaltTexture()` — 1024×1024 with racing line rubbering gradient
  - `createBlueRunoffTexture()` — Paul Ricard style azure stripes
  - `createCurbTexture()` — red/white rumble strips
  - `createPitBuildingTexture()` — 4 garage doors with VIP windows
  - `createDaytimeSkyTexture()` — 2048×1024 with cumulus clouds + horizon mountains

### `js/tracks_db.js` (595 lines)
- `TRACK_DATABASE` — 10 tracks, each with `{ id, name, fullName, country, countryCode, flag, laps (20), difficultyRating, difficultyScore, lengthMeters, characteristics, trackWidth, barrierDistance, theme: { skyType, skyColor, horizonColor, groundType, groundColor, groundDetailColor, curbColors[], barrierType, barrierColor, barrierPostColor, props, lighting{...} }, controlPoints: [Vector3, ...16] }`
- Tracks: monza, monaco, silverstone, spa, suzuka, singapore, bahrain, redbullring, interlagos, baku
- `getTrackById(id)` returns first match or TRACK_DATABASE[0]

### `js/teams_db.js` (171 lines)
- `F1_TEAMS` — 10 constructors (ferrari, redbull, mercedes, mclaren, astonmartin, alpine, williams, sauber, haas, rb), each with `{ id, name, fullName, driverNumber, driverName, primaryColor (hex int), primaryHex, secondaryHex, accentHex, accentColor (hex int), haloColor, powerUnit, tagline, stats: { topSpeed, aero, acceleration } }`
- `getTeamById(id)` returns first match or F1_TEAMS[0]

### `css/style.css` (2609 lines, key sections)
- `:root` tokens (`:root --f1-red #e10600, --f1-cyan #00f0ff, --f1-yellow #ffd000, --f1-green #00d2be, --f1-purple #b026ff, etc.`)
- Google Fonts: Outfit, Chakra Petch, Titillium Web
- `#hud-layer` flex column with top-bar / timing-tower / bottom-hud
- `.session-controls` rounded pill bar, `.session-btn.active` red glow
- `.difficulty-controls`, `.diff-btn.active` cyan gradient
- `.hud-icon-btn`, `.hud-action-btn`
- `.timing-tower` left border red accent, `.timing-row`, `.sectors-container`, `.sector-status.active/green/purple/yellow`
- `.race-position-tower` 10-car live order, `.tower-row.player-row` red highlight
- `.center-alert-container` + `.center-alert.visible` pop-in animations
- `#start-lights-gantry` + `.gantry-lights-grid` 5×2 bulbs, `.f1-bulb.active` red glow
- `.minimap-card`, `#minimap-canvas`
- `.telemetry-cluster` red bottom border, `.rpm-led-bar` 15 LEDs (green/red/blue with flash-redline), `.speed-gear-main` Chakra Petch, `.tachometer-bar`, `.sector-deltas`, `.pedals-drs-row`, `.drs-badge.active`
- `.modal-backdrop` blur+opacity transition, `.modal-card` scale 0.92→1 spring
- `.leaderboard-table`, `.modal-btn`, `.modal-btn.primary`
- `.mobile-controls` flex row of touch buttons (cyan/red/green glow), `:active` press scale 0.92
- Responsive `@media (max-width: 1024px)` and `@media (max-width: 640px)` shrink HUD
- `.track-select-btn`, `.track-modal-card`, `.track-grid-container`, `.track-card` with `--team-color` CSS var, `.btn-select-circuit`
- `.mp-modal-card` 2-column host/join, `.mp-card.host-card` red border / `.mp-card.join-card` cyan border, `.mp-code-display`, `.btn-mp-launch`, `.btn-mp-join`, `.mp-pulse.amber/green/gray` + keyframe animations
- `.car-select-btn`, `.car-modal-card`, `.car-grid-container`, `.car-card::before` top color bar, `.car-card-number-pod`, `.btn-select-car`

---

## Notes for the AI reviewer

- The `scratch/` directory (~100 files including `verify_*.js`, `test_*.js`, screenshots, edge browser profile) is local debug scaffolding and should be ignored.
- `js/track.js` is a legacy 1196-line file kept alongside `js/circuit.js`. `js/main.js` only imports `circuit.js`. `track.js` is unused by the running game.
- `package.json` declares no dependencies — all third-party libraries (Three.js, Cannon-es, PeerJS, Google Fonts) are loaded from CDN via import maps or `<script>` tags.
- File imports use cache-busting `?v=N` query strings (e.g., `./audio.js?v=40`, `./car.js?v=28`, `./circuit.js?v=320`, `./physics.js?v=60`, `./timing.js?v=350`, `./session.js?v=350`, `./ai.js?v=450`, `./tracks_db.js?v=300`, `./network.js?v=400`, `./teams_db.js?v=100`, `./fx.js?v=50`, plus `js/main.js?v=600` in `index.html`).
- Physics: cars are strictly locked to plane Y=0.04 (linearFactor Y=0, gravity 0); yaw-only rotation (angularFactor X,Z=0); barrier deflection handled in `physics.js:262-299` rather than via Cannon-es friction/contacts.
- Multiplayer: host-authoritative model. Host runs full simulation + 30Hz state broadcast. Guest is a thin client that sends raw inputs at 60Hz and interpolates transforms.
- All textures are procedurally generated via Canvas2D (`textures.js`); the only external assets are Google Fonts and CDN scripts.
