# F1 Grand Prix 3D — Web Racing Simulator

High-performance 3D Formula 1 web racing game built with **Three.js**, **Cannon-es**, and **PeerJS** WebRTC P2P. Zero build step, zero NPM install — pure static HTML/JS/CSS that can be drag-and-dropped onto Netlify, Vercel, GitHub Pages, or any static host.

## Quick Start

```bash
# Local dev (Node static server, no deps)
node server.js
# then open http://localhost:8080
```

You can also simply **double-click `index.html`** — every dependency loads from CDN via the import map (Three.js, Cannon-es, PeerJS, Google Fonts). No `npm install` is required.

## Features

### Phase 1–4 (Core Game)
- **Three.js** WebGL2 renderer with PCF soft shadows, ACES filmic tone mapping, and adaptive pixel ratio.
- **Cannon-es** fixed-step physics (`world.step(1/60, dt, 3)`) with realistic F1 downforce, drag, gear-ratio transmission (8-speed + reverse), anti-roll, anti-reverse at start line.
- **10 Grand Prix circuits** with distinct national palettes, themed props, and FIA-spec starting gantry.
- **10-car starting grid** with three AI difficulty tiers (Easy / Medium / Hard).
- **Weekend sessions**: Free Practice and 20-Lap Race (10-Car Grid).
- **PeerJS 6-character room code P2P multiplayer** with 30Hz state sync for Guest thin-client rendering.
- **Pre-race / post-race broadcast mock ad hooks** (`SessionManager.showMockAd`).

### Phase 5 (This Update)
- **Web Audio API procedural sound** — zero external audio assets. Multi-harmonic V6 engine synthesis with analog wave-shaper saturation, dual-chamber formant resonators, turbocharger whistle, induction airbox, gear-shift pops, overrun burbles, FIA 5-light start beeps, lights-out tone, wall impacts, and broadcast crowd cheer.
- **Particle FX** — tire smoke sprites emitted on launch / drift / heavy braking, fading skid-mark ribbons on asphalt when slip exceeds grip, and subtle dynamic camera shake on barrier impacts.
- **Speed sense FOV warp** — chase-camera FOV expands up to +16° as the car approaches top speed.
- **F1 Telemetry HUD** — broadcast-style 15-LED RPM shift bar, continuous tachometer gauge, large km/h speedometer, gear indicator, pedal meters, DRS/DRIFT badges, mini-map radar (track + 10 cars + player heading arrow), live session best lap / last lap / current lap / delta badge, and a **per-sector delta tracker** (S1/S2/S3 +/- splits in green/red).
- **Performance hardening** — every temporary `THREE.Vector3` / `THREE.Quaternion` inside the render loop is hoisted to instance-scope scratch vectors; merge-geometry barriers; Cannon-es fixed timestep with max 3 sub-steps; particle & FX pools are preallocated and never constructed per-frame.
- **Deployment** — single static root: drop `index.html`, `css/`, `js/`, `server.js` straight onto any static host.

## Controls

| Key | Action |
|---|---|
| `W` / `↑` | Throttle |
| `S` / `↓` | Brake / Reverse |
| `A` / `←` | Steer Left |
| `D` / `→` | Steer Right |
| `C` | Cycle Camera (Chase / Cockpit / TV) |
| `R` | Restart Session |
| `M` | Toggle Mute |
| `H` | Toggle Help |
| Touch Buttons | Mobile virtual controls |

## Deployment

### Netlify
Drag the project folder onto the Netlify dashboard. That's it. No build command, no env vars. The site publishes immediately.

### Vercel
```
vercel --prod
```
Vercel auto-detects it as a static site. Default output is the project root.

### GitHub Pages
Push the repo to GitHub → Settings → Pages → Source: `main` branch / root. Done.

### Generic static host
Upload the entire project root (`index.html`, `css/`, `js/`, `server.js`). Any HTTP server that serves static files will run it.

## Architecture

```
index.html         Entry point, import-map, HUD DOM
css/style.css      Broadcast-style HUD theme
js/main.js         Orchestrator (input → physics → audio → FX → render)
js/audio.js        Procedural Web Audio engine (zero external assets)
js/fx.js           Particle / skid-mark / camera-shake effects
js/car.js          F1 chassis + livery + wheel animation + smoke pool
js/circuit.js      Procedural 3D circuit builder (track, barriers, gantry, grandstands)
js/track.js        Alias for circuit.js (legacy)
js/physics.js      Cannon-es F1 physics world
js/ai.js           10-car AI grid with 3 difficulty tiers
js/session.js      Practice / Race state machine
js/timing.js       Lap timing, sectors, delta, session best
js/network.js      PeerJS 6-char room code P2P
js/tracks_db.js    10 Grand Prix configurations
js/teams_db.js     10 F1 constructor liveries
js/textures.js     Procedural canvas textures (asphalt, carbon, livery)
```

## License

MIT