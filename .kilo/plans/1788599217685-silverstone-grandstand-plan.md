# Silverstone GP — Grandstand Placement Plan

## Goal
Add a dedicated Silverstone grandstand layout so spectator stands land on the real corners (Hamilton Straight, Abbey, Stowe, Vale/Club) instead of the generic "other circuits" set. Then verify with a top-down screenshot and console diagnostic.

## Context (already inspected)
- Track data: `js/tracks_db.js:126-186` — Silverstone `controlPoints` (indices 0–19) spanning `(110,0,-130)` → `(150,0,-105)`.
- Grandstand authoring: `js/circuit.js:1149-1255` — `buildGrandstandsAndAudience()` branches on `this.trackData.id` ('monza', 'monaco', else-generic). No `silverstone` branch exists.
- Grandstand placement inputs (already supported by `buildSingleGrandstand`): `t` (0..1 along curve), `side` (±1 across), `dist` (offset from track centerline beyond `barrierDistance`), plus `length/depth/height/rows/sponsor/roofColor`.
- Validation harness: `scratch/verify_monza_fixes.js` already shows the pattern — headless Edge + CDP + `Runtime.evaluate` + `Page.captureScreenshot`. Reuse this pattern; do not duplicate the harness.

## Affected files
- `js/circuit.js` — add `silverstone` branch in `buildGrandstandsAndAudience()` (insert after the `monaco` branch, before the `else` generic).
- `scratch/verify_silverstone_layout.js` — new headless verification script.
- (No changes to `js/tracks_db.js` — the control points are already correct and must not be re-edited as part of this plan.)

## Step 1 — Add `silverstone` grandstand branch
In `js/circuit.js`, inside `buildGrandstandsAndAudience()`, add a new `else if (this.trackData.id === 'silverstone')` block. Use 6 stands aligned to real Silverstone spectator zones, all on the `side` that places them on the outside of each corner relative to the existing control-point order (clockwise layout: start/finish at Hamilton Straight heads north then west; outside = `-1` for most clockwise apexes).

Proposed specs (re-check against the rendered overlay before finalizing — these are starting values, not gospel):

| # | Zone (real)         | t (approx) | side | dist offset (m) | length | depth | height | rows | sponsor        | roofColor  |
|---|---------------------|-----------:|-----:|----------------:|-------:|------:|-------:|-----:|----------------|-----------|
| 1 | Hamilton Straight A |       0.01 |   -1 |  +13.0          |     90 |    14 |   10.5 |   10 | FORMULA 1      | 0xe10600  |
| 2 | Hamilton Straight B |       0.04 |   -1 |  +13.0          |     85 |    14 |   10.5 |   10 | PIRELLI        | 0x111827  |
| 3 | Stowe (T18)         |       0.90 |   -1 |  +15.0          |     70 |    13 |   10.0 |   10 | ROLEX          | 0x00594f  |
| 4 | Vale / Club (T19)   |       0.97 |   -1 |  +14.0          |     65 |    13 |    9.5 |    9 | DHL            | 0xffcc00  |
| 5 | Copse outside       |       0.64 |   +1 |  +15.0          |     60 |    12 |    9.0 |    9 | ARAMCO         | 0x008080  |
| 6 | Abbey / Farm        |       0.12 |   -1 |  +15.0          |     60 |    12 |    9.0 |    9 | EMIRATES       | 0xd60400  |

Notes:
- `dist` is **added to** `this.barrierDistance` (Silverstone `barrierDistance = 12.0`), so absolute offset is ~25–27 m from centerline.
- The `+1` side on Copse exists because that corner's outside in the current control-point order is on the +1 (right) side. Confirm with the Step 2 screenshot.
- Keep `length/depth/height/rows` consistent with Monza stands so visual scale is uniform.

## Step 2 — Build the verification script
Create `scratch/verify_silverstone_layout.js`, modeled directly on `scratch/verify_monza_fixes.js`:

1. Launch headless Edge with `--remote-debugging-port=9246` and a dedicated `--user-data-dir` (e.g. `edge_profile_verify_silverstone`).
2. Connect via CDP, `Page.enable` + `Runtime.enable` + `Console.enable`.
3. `Page.navigate` to `http://localhost:3000/?v=verify_silverstone`.
4. Poll `!!(window.game && window.game.playerVehicle && window.game.track)` up to 10 s.
5. Switch track: `window.game.switchTrack('silverstone')`.
6. Audit block (mirroring Monza script lines 117–165) — for every child of `track.trackRoot` that is a `Group` with ≥ 8 children (a grandstand), record `{index, position:{x,y,z}, childCount}`. Also compute the nearest `controlPoints` index by 2D distance for reporting.
7. Top-down capture:
   - Compute scene AABB from `track.curve.getPoints(400)`.
   - Use an `OrthographicCamera` (or `PerspectiveCamera` with high Y) framed over the AABB + 20% margin, looking straight down `-Y`.
   - Disable fog/sky for the capture frame.
   - `Page.captureScreenshot` → `scratch/silverstone_topdown.png`.
8. Log grandstand world positions + nearest control-point name (use the comment labels already in `tracks_db.js:163-185`) so we can read the layout from the console without an image.

## Step 3 — Run, inspect, iterate
- Start the dev server (whatever the repo uses; check `package.json` — likely `npm start` on port 3000).
- Run `node scratch/verify_silverstone_layout.js`.
- Open `scratch/silverstone_topdown.png`. For each stand, verify it sits outside the intended corner and not on the racing line, runoff, or another stand.
- If a stand is misplaced:
  - Adjust that stand's `t` (move along track) and/or `side` (flip across).
  - Re-run the script. Do not change `controlPoints` unless a stand is structurally impossible to place — in that case flag it and ask before touching `tracks_db.js`.
- Stop when all 6 stands are on green/paved runoff outside the intended corner and ≥ one `length` apart from each other.

## Validation checklist
- [ ] `scratch/silverstone_topdown.png` exists and shows full circuit.
- [ ] Console log lists 6 grandstands with non-overlapping positions.
- [ ] No `Runtime.exceptionThrown` events captured by the script.
- [ ] No stand's `position` lies inside the track ribbon (sanity: distance from `position.xz` to nearest curve sample > `trackWidth/2 + 1`).
- [ ] Hamilton Straight stands visually frame the start/finish gantry.

## Out of scope
- Editing `js/tracks_db.js` Silverstone `controlPoints`.
- Refactoring grandstand specs into `tracks_db.js`.
- Audio (`js/audio.js`) crowd ambience mapping — already generic per track, no per-track work needed.
- The legacy `js/track.js` grandstand code (not used by `main.js`).

## Risks
- The Silverstone `controlPoints` order may have outside/inside flipped relative to the real circuit. If a stand lands on the racing line, flip `side` and re-screenshot — do not rewrite control points.
- `buildSingleGrandstand` (`circuit.js:933`) builds bleachers + roof + flagpoles; if a stand is at a sharp apex the geometry may clip the track. Move the stand's `t` ±0.02 away from the apex as the first fix, not deeper `dist`.

## Open questions (none blocking)
- None. The three clarifying decisions (real-world reference, Silverstone branch, top-down validation) were resolved in pre-plan Q&A.
