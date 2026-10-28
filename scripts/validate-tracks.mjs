#!/usr/bin/env node
/**
 * Static geometry + route-coverage checks for the F1 circuit database.
 * Run with: node scripts/validate-tracks.mjs
 *
 * This validates the path data used by the real Three.js circuit builder. The
 * synthetic coverage loop is not a substitute for hands-on driving or browser
 * physics testing; it ensures each car/lap/checkpoint route sample is finite.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = fs.readFileSync(path.join(root, 'js/tracks_db.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const circuit = fs.readFileSync(path.join(root, 'js/circuit.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

const trackPattern = /id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?difficultyRating:\s*'([^']+)'[\s\S]*?difficultyScore:\s*(\d+)[\s\S]*?lengthMeters:\s*(\d+)[\s\S]*?trackWidth:\s*([\d.]+)[\s\S]*?controlPoints:\s*\[([\s\S]*?)\n\s*\]/g;
const pointPattern = /new THREE\.Vector3\(\s*(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\)/g;
const tracks = [];
let match;
while ((match = trackPattern.exec(db)) !== null) {
  const points = [...match[7].matchAll(pointPattern)].map((p) => [Number(p[1]), Number(p[2]), Number(p[3])]);
  tracks.push({
    id: match[1], name: match[2], difficulty: match[3], score: Number(match[4]),
    declaredLength: Number(match[5]), width: Number(match[6]), points,
  });
}

assert(tracks.length === 15, `Expected 15 selectable circuits, parsed ${tracks.length}`);
assert(new Set(tracks.map((t) => t.id)).size === tracks.length, 'Track IDs must be unique');
assert(new Set(tracks.map((t) => t.name)).size === tracks.length, 'Track names must be unique');

const originalIds = [
  'ember-valley', 'cloudbreak-highlands', 'copper-canyon', 'aurora-ridge', 'tidal-spiral',
];
for (const id of originalIds) assert(tracks.some((t) => t.id === id), `Missing original circuit: ${id}`);

const difficultyCounts = Object.fromEntries(['Easy', 'Medium', 'Hard'].map((difficulty) => [
  difficulty, tracks.filter((t) => t.difficulty === difficulty).length,
]));
assert(difficultyCounts.Easy === 4 && difficultyCounts.Medium === 5 && difficultyCounts.Hard === 6,
  `Unexpected difficulty split: ${JSON.stringify(difficultyCounts)}`);

function sampleClosedCatmullRom(points, samplesPerSegment = 16) {
  const result = [];
  const n = points.length;
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const mul = (a, scalar) => a.map((v) => v * scalar);
  const tension = 0.2;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const m1 = mul(sub(p2, p0), tension);
    const m2 = mul(sub(p3, p1), tension);
    for (let j = 0; j < samplesPerSegment; j++) {
      const t = j / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      result.push(p1.map((v, k) =>
        (2 * t3 - 3 * t2 + 1) * v +
        (t3 - 2 * t2 + t) * m1[k] +
        (-2 * t3 + 3 * t2) * p2[k] +
        (t3 - t2) * m2[k]));
    }
  }
  return result;
}

function distanceXZ(a, b) {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

function inspectTrack(track) {
  assert(track.points.length >= 16, `${track.id}: needs at least 16 control points`);
  assert(track.width >= 12 && track.width <= 20, `${track.id}: unreasonable road width`);
  assert(track.declaredLength >= 1000, `${track.id}: missing/invalid declared length`);
  assert(['Easy', 'Medium', 'Hard'].includes(track.difficulty), `${track.id}: invalid difficulty label`);
  assert(track.points.flat().every(Number.isFinite), `${track.id}: non-finite control point`);

  const ys = track.points.map((p) => p[1]);
  const elevationRange = Math.max(...ys) - Math.min(...ys);
  assert(elevationRange >= 5, `${track.id}: elevation range too small (${elevationRange.toFixed(1)}m)`);
  let climbs = 0;
  let descents = 0;
  for (let i = 0; i < ys.length; i++) {
    const delta = ys[(i + 1) % ys.length] - ys[i];
    if (delta > 0.25) climbs++;
    if (delta < -0.25) descents++;
  }
  assert(climbs >= 2 && descents >= 2, `${track.id}: needs multiple uphill and downhill sections`);

  const sampled = sampleClosedCatmullRom(track.points);
  assert(sampled.length >= 250, `${track.id}: insufficient curve samples`);
  assert(sampled.flat().every(Number.isFinite), `${track.id}: spline contains non-finite coordinates`);

  let approximateLength = 0;
  let sharpCorners = 0;
  for (let i = 0; i < sampled.length; i++) {
    const current = sampled[i];
    const next = sampled[(i + 1) % sampled.length];
    approximateLength += Math.hypot(next[0] - current[0], next[1] - current[1], next[2] - current[2]);
  }
  for (let i = 0; i < track.points.length; i++) {
    const a = track.points[(i - 1 + track.points.length) % track.points.length];
    const b = track.points[i];
    const c = track.points[(i + 1) % track.points.length];
    const u = [b[0] - a[0], b[2] - a[2]];
    const v = [c[0] - b[0], c[2] - b[2]];
    const lengths = [Math.hypot(...u), Math.hypot(...v)];
    if (lengths.some((length) => length < 1e-5)) continue;
    const cosine = Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (lengths[0] * lengths[1])));
    const deflection = Math.acos(cosine) * 180 / Math.PI;
    if (deflection >= 12) sharpCorners++;
  }
  assert(approximateLength > track.declaredLength * 0.45 && approximateLength < track.declaredLength * 1.65,
    `${track.id}: spline length ${Math.round(approximateLength)}m conflicts with metadata ${track.declaredLength}m`);
  assert(sharpCorners >= 3, `${track.id}: not enough distinguishable corner direction changes`);

  // Avoid ambiguous near-overlapping road segments. Intentional multi-level
  // crossings are excluded from the old Suzuka layout only if the bridge flag returns.
  const skip = Math.max(24, Math.floor(sampled.length * 0.07));
  let closestNonLocal = Infinity;
  for (let i = 0; i < sampled.length; i += 3) {
    for (let j = i + skip; j < sampled.length; j += 3) {
      if (Math.min(j - i, sampled.length - (j - i)) < skip) continue;
      closestNonLocal = Math.min(closestNonLocal, distanceXZ(sampled[i], sampled[j]));
    }
  }
  assert(closestNonLocal > track.width * 0.55,
    `${track.id}: possible overlapping/self-approaching road segments (${closestNonLocal.toFixed(1)}m)`);

  return {
    id: track.id,
    difficulty: track.difficulty,
    controlPoints: track.points.length,
    elevationRangeM: Math.round(elevationRange * 10) / 10,
    approximateLengthM: Math.round(approximateLength),
    sharpCorners: sharpCorners,
    minNonLocalGapM: Math.round(closestNonLocal * 10) / 10,
    sampled,
  };
}

const report = tracks.map(inspectTrack);

// The top-down selector needs to enumerate all circuits and surface the terrain + challenge stats.
assert(main.includes("./tracks_db.js?v=303"), 'Track database cache version is stale in main.js');
assert(main.includes('ELEVATION') && main.includes('TURNS'), 'Track cards are missing elevation/turn stats');
assert(circuit.includes('this.trackData.controlPoints.map'), 'Circuit builder is not consuming per-map control points');
assert(css.includes('.track-pill.diff-easy'), 'Easy difficulty badge styling missing');
assert(css.includes('.track-pill.diff-medium'), 'Medium difficulty badge styling missing');
assert(css.includes('.track-pill.diff-hard'), 'Hard difficulty badge styling missing');

// Exercise finite path samples for every position in the 10-car grid, 20 laps,
// and 8 timing checkpoints on every map (coverage check, not a full physics sim).
let routeSamplesChecked = 0;
for (const track of report) {
  for (let car = 0; car < 10; car++) {
    for (let lap = 0; lap < 20; lap++) {
      for (let checkpoint = 0; checkpoint < 8; checkpoint++) {
        const progress = ((checkpoint / 8) + (car * 0.0007) + (lap * 0.00001)) % 1;
        const p = track.sampled[Math.floor(progress * track.sampled.length) % track.sampled.length];
        assert(p.every(Number.isFinite), `${track.id}: invalid route sample for car ${car}, lap ${lap + 1}, checkpoint ${checkpoint + 1}`);
        routeSamplesChecked++;
      }
    }
  }
}

console.log('PASS: 15 distinct circuit records; 4 Easy / 5 Medium / 6 Hard.');
console.log('PASS: all circuits have multi-directional elevation and distinct corners.');
console.log('PASS: all sampled layouts have clear non-local road separation.');
console.log(`PASS: ${routeSamplesChecked.toLocaleString('en-US')} finite route samples across 10-car grids, 20 laps and 8 checkpoints per map.`);
console.log('Per-track geometry summary:');
for (const track of report) {
  console.log(`  ${track.id.padEnd(22)} ${track.difficulty.padEnd(6)} ${String(track.controlPoints).padStart(2)} pts  elevation ${String(track.elevationRangeM).padStart(4)}m  spline ${String(track.approximateLengthM).padStart(4)}m  sharp corners ${track.sharpCorners}`);
}
console.log('NOTE: This is a static geometry/route-coverage test, not an in-browser physics or manual race test.');
