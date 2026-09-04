/**
 * build_redbull_glb.mjs
 *
 * Procedurally constructs a game-ready Red Bull-inspired F1 car as a THREE.Scene
 * and serializes it to a binary glTF 2.0 (.glb) file using Three.js's GLTFExporter.
 *
 * Output: ../assets/models/redbull.glb
 *
 * Hierarchy (matches the loader in js/car.js):
 *   Car
 *   ├── body
 *   ├── front_wing
 *   ├── rear_wing
 *   ├── halo
 *   ├── sidepods
 *   ├── engine_cover
 *   ├── wheel_FL
 *   ├── wheel_FR
 *   ├── wheel_RL
 *   └── wheel_RR
 *
 * Dimensions (real F1 scale):
 *   length   ~5.5 m   (Z extent)
 *   width    ~2.0 m   (X extent)
 *   height   ~1.05 m  (Y extent, ground at Y=0)
 *   wheelbase 3.6 m
 *   front axle Z = +1.8, rear axle Z = -1.8
 *
 * Orientation: +Z = forward (nose direction), +Y = up, ground at Y = 0.
 * Pivot: world origin at vehicle center on the ground plane.
 */

import * as THREE from 'three';
import { GLTFExporter } from './GLTFExporter.js';
import { createCanvas } from './nodeCanvasShim.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '..', '..', 'assets', 'models', 'redbull.glb');

// -----------------------------------------------------------------------------
// 1. PROCEDURAL PBR TEXTURES (canvas-based, sRGB where needed)
// -----------------------------------------------------------------------------

function srgbCanvas(w, h) {
  return createCanvas(w, h);
}

function paintBaseColor(ctx, w, h) {
  // Red Bull-inspired livery: dark navy base, red flowing graphics,
  // yellow nose + airbox accents, sponsor text.
  const navy = '#0b1a3a';
  const deepNavy = '#06122a';
  const cobalt = '#1e4fd8';
  const brightBlue = '#2860ff';
  const redBull = '#dc1a22';
  const darkRed = '#9b0d12';
  const yellow = '#ffd400';

  // Base navy gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, deepNavy);
  grad.addColorStop(0.45, navy);
  grad.addColorStop(1.0, deepNavy);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Metallic flake
  for (let i = 0; i < 4500; i++) {
    const g = Math.floor(Math.random() * 255);
    ctx.fillStyle = `rgba(${g},${g},${g},0.04)`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  // Blue flowing wave along the sidepod
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h * 0.40);
  ctx.bezierCurveTo(w * 0.18, h * 0.24, w * 0.36, h * 0.55, w * 0.55, h * 0.44);
  ctx.bezierCurveTo(w * 0.74, h * 0.32, w * 0.88, h * 0.57, w, h * 0.46);
  ctx.lineTo(w, h * 0.70);
  ctx.bezierCurveTo(w * 0.86, h * 0.82, w * 0.72, h * 0.62, w * 0.52, h * 0.76);
  ctx.bezierCurveTo(w * 0.32, h * 0.86, w * 0.18, h * 0.72, 0, h * 0.80);
  ctx.closePath();
  const wave = ctx.createLinearGradient(0, h * 0.36, 0, h * 0.82);
  wave.addColorStop(0.0, brightBlue);
  wave.addColorStop(0.5, cobalt);
  wave.addColorStop(1.0, navy);
  ctx.fillStyle = wave;
  ctx.fill();
  ctx.restore();

  // Red spine stripe
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h * 0.48);
  ctx.bezierCurveTo(w * 0.22, h * 0.46, w * 0.42, h * 0.52, w * 0.62, h * 0.50);
  ctx.bezierCurveTo(w * 0.82, h * 0.47, w * 0.92, h * 0.52, w, h * 0.49);
  ctx.lineTo(w, h * 0.52);
  ctx.bezierCurveTo(w * 0.90, h * 0.55, w * 0.76, h * 0.50, w * 0.56, h * 0.53);
  ctx.bezierCurveTo(w * 0.36, h * 0.56, w * 0.20, h * 0.51, 0, h * 0.54);
  ctx.closePath();
  const redGrad = ctx.createLinearGradient(0, h * 0.47, 0, h * 0.54);
  redGrad.addColorStop(0.0, darkRed);
  redGrad.addColorStop(0.5, redBull);
  redGrad.addColorStop(1.0, darkRed);
  ctx.fillStyle = redGrad;
  ctx.fill();
  ctx.restore();

  // Yellow nose wedge (right side = +Z = nose direction in our UV mapping)
  ctx.save();
  const noseGrad = ctx.createLinearGradient(w * 0.78, 0, w, 0);
  noseGrad.addColorStop(0.0, 'rgba(255,212,0,0)');
  noseGrad.addColorStop(0.25, yellow);
  noseGrad.addColorStop(1.0, yellow);
  ctx.fillStyle = noseGrad;
  ctx.beginPath();
  ctx.moveTo(w * 0.78, h * 0.36);
  ctx.lineTo(w, h * 0.32);
  ctx.lineTo(w, h * 0.72);
  ctx.lineTo(w * 0.78, h * 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Yellow circle car number badge near nose
  ctx.fillStyle = yellow;
  ctx.beginPath();
  ctx.arc(w * 0.88, h * 0.50, h * 0.10, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#0b1a3a';
  ctx.stroke();
  ctx.fillStyle = '#0b1a3a';
  ctx.font = `bold ${Math.floor(h * 0.12)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', w * 0.88, h * 0.51);

  // "ORACLE" sponsor text
  ctx.fillStyle = yellow;
  ctx.font = `900 ${Math.floor(h * 0.06)}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('ORACLE', w * 0.16, h * 0.70);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.floor(h * 0.045)}px sans-serif`;
  ctx.fillText('RED BULL RACING', w * 0.16, h * 0.76);

  // "HONDA" wordmark
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(h * 0.05)}px sans-serif`;
  ctx.fillText('HONDA', w * 0.52, h * 0.24);
  ctx.fillStyle = redBull;
  ctx.fillRect(w * 0.52, h * 0.245, w * 0.10, h * 0.012);

  // "BYBIT" wordmark
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(h * 0.045)}px sans-serif`;
  ctx.fillText('BYBIT', w * 0.52, h * 0.82);
  ctx.fillStyle = yellow;
  ctx.fillRect(w * 0.52, h * 0.825, w * 0.08, h * 0.008);

  // Glossy lacquer highlight on top
  const gloss = ctx.createLinearGradient(0, 0, 0, h * 0.35);
  gloss.addColorStop(0.0, 'rgba(255,255,255,0.20)');
  gloss.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  gloss.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, w, h * 0.35);
}

function paintNormalMap(ctx, w, h) {
  // Approximate normal map using gradient fills (no getImageData/putImageData).
  // Base normal (0.5, 0.5, 1.0) = flat surface = #8080ff
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, w, h);

  // Add carbon fiber weave pattern as subtle normal variation
  // Weave: diagonal lines in a grid
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = 0; x < w; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Panel seams - slightly darker lines every 256px
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const pos = Math.floor(w * (i + 1) / 4);
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, h);
    ctx.stroke();
    const posz = Math.floor(h * (i + 1) / 4);
    ctx.beginPath();
    ctx.moveTo(0, posz);
    ctx.lineTo(w, posz);
    ctx.stroke();
  }
}

function paintRoughnessMap(ctx, w, h) {
  // Mostly glossy (low roughness = 0.2). Slightly rougher floor / diffuser.
  ctx.fillStyle = '#3d3d3d'; // ~0.24 roughness
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#6a6a6a'; // ~0.42 in floor / diffuser region
  ctx.fillRect(0, h * 0.86, w, h * 0.14);
  // Pirelli tire-sidewall band: more matte
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(w * 0.36, h * 0.40, w * 0.28, h * 0.20);
}

function paintMetallicMap(ctx, w, h) {
  // Carbon bodywork ~ 0.6 metallic, paint panels ~ 0.0
  ctx.fillStyle = '#999999'; // ~0.6 metallic
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#000000'; // paint (non-metallic)
  ctx.fillRect(w * 0.05, h * 0.05, w * 0.90, h * 0.90);
}

function paintAOMap(ctx, w, h) {
  // White (full ambient) with darker crevices.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  // Darker wheel arches
  ctx.fillStyle = '#cccccc';
  ctx.fillRect(0, h * 0.30, w * 0.06, h * 0.40);
  ctx.fillRect(w * 0.94, h * 0.30, w * 0.06, h * 0.40);
  // Floor / underbody shadow
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(0, h * 0.92, w, h * 0.08);
}

function paintTireBaseColor(ctx, w, h) {
  // Black rubber
  ctx.fillStyle = '#141416';
  ctx.fillRect(0, 0, w, h);
  // Grain
  for (let i = 0; i < 3000; i++) {
    const g = 15 + Math.random() * 15;
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  // Pirelli yellow sidewall band ring
  const cx = w / 2, cy = h / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.36, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd400';
  ctx.lineWidth = 8;
  ctx.stroke();
  // "PIRELLI" curved text
  ctx.fillStyle = '#ffd400';
  ctx.font = `900 ${Math.floor(w * 0.05)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const r = Math.min(w, h) * 0.36;
  const text = 'PIRELLI';
  const start = -Math.PI * 0.35;
  const end = Math.PI * 0.35;
  for (let i = 0; i < text.length; i++) {
    const a = start + (end - start) * (i / (text.length - 1));
    ctx.save();
    ctx.translate(cx + Math.sin(a) * r, cy - Math.cos(a) * r);
    ctx.rotate(a);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  // Inner rim hole mask
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.27, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1d21';
  ctx.fill();
}

function paintTireRoughness(ctx, w, h) {
  // Rubber = very rough
  ctx.fillStyle = '#cccccc';
  ctx.fillRect(0, 0, w, h);
}

function paintTireMetallic(ctx, w, h) {
  // Rubber = non-metallic
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
}

function paintTireNormal(ctx, w, h) {
  // Approximate tire normal map - flat surface with subtle grain
  // Base normal = #8080ff (flat)
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, w, h);

  // Subtle grain pattern as small dots
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Inner rim area darker normal
  const cx = w / 2, cy = h / 2;
  const innerR = Math.min(w, h) * 0.27;
  const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, innerR * 1.8);
  grad.addColorStop(0, 'rgba(0,0,0,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function paintTireAO(ctx, w, h) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  // Darker near the rim opening (shadow under the rim)
  const grad = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.27, cx, cy, Math.min(w, h) * 0.45);
  grad.addColorStop(0, '#707070');
  grad.addColorStop(1, '#ffffff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function makeTextureFromCanvas(canvas, { colorSpace = THREE.SRGBColorSpace, anisotropy = 8 } = {}) {
  // @napi-rs/canvas adds a `.data` property that GLTFExporter mistakes for
  // a DataTexture. Remove it so the exporter uses the canvas drawImage path.
  try {
    delete canvas.data;
  } catch (_) {
    try { Object.defineProperty(canvas, 'data', { value: undefined, writable: true, configurable: true }); } catch (_) {}
    try { canvas.data = undefined; } catch (_) {}
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.anisotropy = anisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// -----------------------------------------------------------------------------
// 2. PBR MATERIAL SETS
// -----------------------------------------------------------------------------

function buildBodyMaterials() {
  const baseCanvas = srgbCanvas(1024, 1024);
  paintBaseColor(baseCanvas.getContext('2d'), 1024, 1024);
  const normalCanvas = srgbCanvas(1024, 1024);
  paintNormalMap(normalCanvas.getContext('2d'), 1024, 1024);
  const roughCanvas = srgbCanvas(1024, 1024);
  paintRoughnessMap(roughCanvas.getContext('2d'), 1024, 1024);
  const metalCanvas = srgbCanvas(1024, 1024);
  paintMetallicMap(metalCanvas.getContext('2d'), 1024, 1024);
  const aoCanvas = srgbCanvas(1024, 1024);
  paintAOMap(aoCanvas.getContext('2d'), 1024, 1024);

  const baseTex = makeTextureFromCanvas(baseCanvas);
  const normalTex = makeTextureFromCanvas(normalCanvas, { colorSpace: THREE.NoColorSpace });
  const roughTex = makeTextureFromCanvas(roughCanvas, { colorSpace: THREE.NoColorSpace });
  const metalTex = makeTextureFromCanvas(metalCanvas, { colorSpace: THREE.NoColorSpace });
  const aoTex = makeTextureFromCanvas(aoCanvas, { colorSpace: THREE.NoColorSpace });

  const mat = new THREE.MeshStandardMaterial({
    map: baseTex,
    normalMap: normalTex,
    roughnessMap: roughTex,
    metalnessMap: metalTex,
    aoMap: aoTex,
    color: 0xffffff,
    metalness: 1.0,
    roughness: 1.0,
    envMapIntensity: 1.0,
  });
  // Set the AO map UV channel to 1 by default; we keep UVs in channel 0 too.
  return mat;
}

function buildTireMaterials() {
  const baseCanvas = srgbCanvas(512, 512);
  paintTireBaseColor(baseCanvas.getContext('2d'), 512, 512);
  const normalCanvas = srgbCanvas(512, 512);
  paintTireNormal(normalCanvas.getContext('2d'), 512, 512);
  const roughCanvas = srgbCanvas(512, 512);
  paintTireRoughness(roughCanvas.getContext('2d'), 512, 512);
  const metalCanvas = srgbCanvas(512, 512);
  paintTireMetallic(metalCanvas.getContext('2d'), 512, 512);
  const aoCanvas = srgbCanvas(512, 512);
  paintTireAO(aoCanvas.getContext('2d'), 512, 512);

  const mat = new THREE.MeshStandardMaterial({
    map: makeTextureFromCanvas(baseCanvas),
    normalMap: makeTextureFromCanvas(normalCanvas, { colorSpace: THREE.NoColorSpace }),
    roughnessMap: makeTextureFromCanvas(roughCanvas, { colorSpace: THREE.NoColorSpace }),
    metalnessMap: makeTextureFromCanvas(metalCanvas, { colorSpace: THREE.NoColorSpace }),
    aoMap: makeTextureFromCanvas(aoCanvas, { colorSpace: THREE.NoColorSpace }),
    color: 0xffffff,
    metalness: 1.0,
    roughness: 1.0,
  });
  return mat;
}

function buildCarbonMaterial() {
  // Bare carbon fiber, used for non-liveried panels (floor, diffuser, wing elements)
  const baseCanvas = srgbCanvas(256, 256);
  const ctx = baseCanvas.getContext('2d');
  ctx.fillStyle = '#151517';
  ctx.fillRect(0, 0, 256, 256);
  const tile = 8;
  for (let y = 0; y < 256; y += tile) {
    for (let x = 0; x < 256; x += tile) {
      const diag = ((x / tile) + (y / tile)) & 1;
      ctx.fillStyle = diag ? '#222327' : '#0d0e10';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  const mat = new THREE.MeshStandardMaterial({
    map: makeTextureFromCanvas(baseCanvas),
    color: 0xffffff,
    metalness: 0.6,
    roughness: 0.45,
  });
  return mat;
}

function buildRimMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x222328,
    metalness: 0.92,
    roughness: 0.25,
  });
}

function buildBrakeRotorMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x5a5d66,
    metalness: 0.90,
    roughness: 0.35,
  });
}

function buildCaliperMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xd80018,
    metalness: 0.7,
    roughness: 0.3,
  });
}

// -----------------------------------------------------------------------------
// 3. GEOMETRY HELPERS
// -----------------------------------------------------------------------------

function uvPlane(geo) {
  // Ensure non-degenerate UVs so the body livery maps properly to all faces.
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) + 1.5) / 3.0;
    const v = (pos.getZ(i) + 3.0) / 6.0;
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  return geo;
}

function centerPivot(geo) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  const cz = (bb.min.z + bb.max.z) / 2;
  geo.translate(-cx, -cy, -cz);
  return geo;
}

// -----------------------------------------------------------------------------
// 4. SCENE / HIERARCHY CONSTRUCTION
// -----------------------------------------------------------------------------

const carGroup = new THREE.Group();
carGroup.name = 'Car';

const bodyGroup = new THREE.Group();
bodyGroup.name = 'body';
const frontWingGroup = new THREE.Group();
frontWingGroup.name = 'front_wing';
const rearWingGroup = new THREE.Group();
rearWingGroup.name = 'rear_wing';
const haloGroup = new THREE.Group();
haloGroup.name = 'halo';
const sidepodsGroup = new THREE.Group();
sidepodsGroup.name = 'sidepods';
const engineCoverGroup = new THREE.Group();
engineCoverGroup.name = 'engine_cover';

const bodyMat = buildBodyMaterials();
const carbonMat = buildCarbonMaterial();
const tireMat = buildTireMaterials();
const rimMat = buildRimMaterial();
const brakeRotorMat = buildBrakeRotorMaterial();
const caliperMat = buildCaliperMaterial();

// --- BODY (monocoque + nose + airbox + shark fin + floor) ---

// Main monocoque chassis (driver tub) - tapered box centered on origin
{
  const geo = new THREE.BoxGeometry(0.95, 0.45, 1.8, 4, 2, 6);
  // Taper the top so it slopes toward the airbox
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 0) {
      const taper = 1.0 - Math.max(0, (z + 0.9) / 1.8) * 0.18;
      pos.setX(i, pos.getX(i) * taper);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  uvPlane(geo);
  const m = new THREE.Mesh(geo, bodyMat);
  m.position.set(0, 0.42, 0.0);
  m.castShadow = true;
  bodyGroup.add(m);
}

// Sharp front nose - long tapered wedge
{
  const geo = new THREE.ConeGeometry(0.32, 2.4, 6);
  geo.rotateX(Math.PI / 2);
  geo.scale(1.0, 0.32, 1.0);
  uvPlane(geo);
  const m = new THREE.Mesh(geo, bodyMat);
  m.position.set(0, 0.30, 1.85);
  m.castShadow = true;
  bodyGroup.add(m);
}

// Nose tip camera pod
{
  const geo = new THREE.BoxGeometry(0.16, 0.10, 0.30);
  const m = new THREE.Mesh(geo, carbonMat);
  m.position.set(0, 0.26, 2.85);
  bodyGroup.add(m);
}

// Cockpit opening (dark)
{
  const geo = new THREE.BoxGeometry(0.55, 0.08, 0.78);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 }));
  m.position.set(0, 0.56, 0.50);
  bodyGroup.add(m);
}

// Floor / underbody
{
  const geo = new THREE.BoxGeometry(0.95, 0.05, 3.4);
  const m = new THREE.Mesh(geo, carbonMat);
  m.position.set(0, 0.07, 0);
  m.castShadow = true;
  bodyGroup.add(m);
}

// Rear diffuser
{
  const geo = new THREE.BoxGeometry(1.05, 0.20, 0.50);
  const m = new THREE.Mesh(geo, carbonMat);
  m.position.set(0, 0.22, -1.95);
  m.castShadow = true;
  bodyGroup.add(m);
}

// Diffuser fins (5 vertical strakes)
for (let i = 0; i < 5; i++) {
  const geo = new THREE.BoxGeometry(0.02, 0.18, 0.42);
  const m = new THREE.Mesh(geo, carbonMat);
  m.position.set(-0.4 + i * 0.2, 0.24, -1.95);
  bodyGroup.add(m);
}

// Shark fin (engine cover tail)
{
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, 0.48);
  shape.lineTo(1.10, 0.06);
  shape.lineTo(1.10, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
  geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, carbonMat);
  m.position.set(0.02, 0.66, -1.50);
  bodyGroup.add(m);
}

// --- SIDEPODS ---

function makeSidepod(side) {
  const g = new THREE.Group();
  // Main pod body
  const podGeo = new THREE.BoxGeometry(0.42, 0.40, 1.7, 2, 2, 6);
  const m = new THREE.Mesh(podGeo, bodyMat);
  m.position.set(side * 0.55, 0.32, 0.05);
  m.castShadow = true;
  g.add(m);
  // Inlet (dark)
  const inletGeo = new THREE.BoxGeometry(0.32, 0.26, 0.08);
  const inletMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 });
  const inlet = new THREE.Mesh(inletGeo, inletMat);
  inlet.position.set(side * 0.55, 0.32, 0.92);
  g.add(inlet);
  // Radiator outlet slit
  const slitGeo = new THREE.BoxGeometry(0.04, 0.10, 0.40);
  const slit = new THREE.Mesh(slitGeo, carbonMat);
  slit.position.set(side * 0.78, 0.30, -0.50);
  g.add(slit);
  return g;
}
sidepodsGroup.add(makeSidepod(-1));
sidepodsGroup.add(makeSidepod(+1));

// --- ENGINE COVER (airbox) ---

{
  const geo = new THREE.BoxGeometry(0.40, 0.42, 1.4, 2, 2, 6);
  // Taper down toward the rear
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (z < 0) {
      const k = Math.max(0, (-z) / 0.7);
      pos.setX(i, pos.getX(i) * (1 - k * 0.25));
      pos.setY(i, pos.getY(i) * (1 - k * 0.10));
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  uvPlane(geo);
  const m = new THREE.Mesh(geo, bodyMat);
  m.position.set(0, 0.70, -0.40);
  m.castShadow = true;
  engineCoverGroup.add(m);

  // Airbox intake (round hole above driver)
  const holeGeo = new THREE.CircleGeometry(0.13, 16);
  holeGeo.rotateY(Math.PI);
  const hole = new THREE.Mesh(holeGeo, new THREE.MeshStandardMaterial({ color: 0x050505, side: THREE.DoubleSide }));
  hole.position.set(0, 0.80, 0.40);
  engineCoverGroup.add(hole);

  // Roll hoop intake trim ring (yellow accent)
  const ringGeo = new THREE.TorusGeometry(0.14, 0.018, 8, 24);
  ringGeo.rotateX(Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ color: 0xffd400, metalness: 0.5, roughness: 0.4 }));
  ring.position.set(0, 0.80, 0.40);
  engineCoverGroup.add(ring);
}

// --- HALO ---

{
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.26, 0.60, 0.25),
    new THREE.Vector3(-0.25, 0.74, 0.45),
    new THREE.Vector3(0.0, 0.76, 0.75),
    new THREE.Vector3(0.25, 0.74, 0.45),
    new THREE.Vector3(0.26, 0.60, 0.25),
  ]);
  const geo = new THREE.TubeGeometry(curve, 28, 0.038, 10, false);
  const m = new THREE.Mesh(geo, carbonMat);
  m.castShadow = true;
  haloGroup.add(m);

  // Central halo pillar
  const pillarGeo = new THREE.CylinderGeometry(0.022, 0.032, 0.26, 10);
  const pillar = new THREE.Mesh(pillarGeo, carbonMat);
  pillar.position.set(0, 0.62, 0.78);
  haloGroup.add(pillar);
}

// --- FRONT WING ---

{
  // Main plane
  const mainGeo = new THREE.BoxGeometry(2.10, 0.04, 0.44);
  const main = new THREE.Mesh(mainGeo, carbonMat);
  main.position.set(0, 0.14, 2.40);
  main.castShadow = true;
  frontWingGroup.add(main);

  // Upper flap (slightly tilted)
  const flapGeo = new THREE.BoxGeometry(2.10, 0.03, 0.20);
  const flap = new THREE.Mesh(flapGeo, bodyMat);
  flap.position.set(0, 0.18, 2.46);
  flap.rotation.x = -0.08;
  frontWingGroup.add(flap);

  // Endplates
  for (const side of [-1, 1]) {
    const epGeo = new THREE.BoxGeometry(0.04, 0.24, 0.56);
    const ep = new THREE.Mesh(epGeo, bodyMat);
    ep.position.set(side * 1.04, 0.20, 2.40);
    frontWingGroup.add(ep);
  }

  // Nose connection pylons
  for (const side of [-1, 1]) {
    const pylonGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.40, 6);
    const py = new THREE.Mesh(pylonGeo, carbonMat);
    py.position.set(side * 0.18, 0.36, 2.20);
    py.rotation.x = -0.25;
    frontWingGroup.add(py);
  }
}

// --- REAR WING ---

{
  // Main plane
  const mainGeo = new THREE.BoxGeometry(1.10, 0.04, 0.32);
  const main = new THREE.Mesh(mainGeo, carbonMat);
  main.position.set(0, 0.96, -2.30);
  main.castShadow = true;
  rearWingGroup.add(main);

  // Upper DRS flap
  const drsGeo = new THREE.BoxGeometry(1.10, 0.03, 0.22);
  const drs = new THREE.Mesh(drsGeo, bodyMat);
  drs.position.set(0, 1.05, -2.32);
  drs.rotation.x = -0.18;
  rearWingGroup.add(drs);

  // Endplates
  for (const side of [-1, 1]) {
    const epGeo = new THREE.BoxGeometry(0.04, 0.50, 0.58);
    const ep = new THREE.Mesh(epGeo, bodyMat);
    ep.position.set(side * 0.56, 0.94, -2.30);
    ep.castShadow = true;
    rearWingGroup.add(ep);
  }

  // Center support pillar
  for (const side of [-1, 1]) {
    const pylonGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.65, 8);
    const py = new THREE.Mesh(pylonGeo, carbonMat);
    py.position.set(side * 0.22, 0.62, -2.22);
    py.rotation.x = -0.18;
    rearWingGroup.add(py);
  }

  // Rain safety light
  const ledGeo = new THREE.BoxGeometry(0.12, 0.06, 0.04);
  const led = new THREE.Mesh(ledGeo, new THREE.MeshStandardMaterial({
    color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0
  }));
  led.position.set(0, 0.30, -2.18);
  rearWingGroup.add(led);
}

// --- WHEELS ---

// Front axle Z = +1.8, rear axle Z = -1.8
// Track width ~ 1.6 m, so wheels at X = ±0.85 (front) and ±0.88 (rear)
// Tire radius: front 0.33, rear 0.36 (real F1 sizes)

const WHEEL_POSITIONS = {
  FL: { x: -0.85, y: 0.33, z: +1.80, radius: 0.33, width: 0.30 },
  FR: { x: +0.85, y: 0.33, z: +1.80, radius: 0.33, width: 0.30 },
  RL: { x: -0.88, y: 0.36, z: -1.80, radius: 0.36, width: 0.40 },
  RR: { x: +0.88, y: 0.36, z: -1.80, radius: 0.36, width: 0.40 },
};

function buildWheel(pos, suffix) {
  const g = new THREE.Group();
  g.name = `wheel_${suffix}`;

  // Tire (oriented along X axis so it can spin around X)
  const tireGeo = new THREE.CylinderGeometry(pos.radius, pos.radius, pos.width, 32);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  g.add(tire);

  // Outer sidewall disc with Pirelli livery
  const sideGeo = new THREE.CircleGeometry(pos.radius, 32);
  sideGeo.rotateY(Math.PI / 2);
  const sideMat = new THREE.MeshStandardMaterial({
    map: tireMat.map,
    roughnessMap: tireMat.roughnessMap,
    normalMap: tireMat.normalMap,
    aoMap: tireMat.aoMap,
    metalnessMap: tireMat.metalnessMap,
    color: 0xffffff,
    metalness: 1.0,
    roughness: 1.0,
  });
  const outerSide = new THREE.Mesh(sideGeo, sideMat);
  outerSide.position.set(pos.width / 2 + 0.003, 0, 0);
  g.add(outerSide);

  const innerSide = new THREE.Mesh(sideGeo, sideMat);
  innerSide.position.set(-(pos.width / 2 + 0.003), 0, 0);
  innerSide.rotation.y = Math.PI;
  g.add(innerSide);

  // Rim
  const rimGeo = new THREE.CylinderGeometry(pos.radius * 0.60, pos.radius * 0.60, pos.width * 0.95, 18);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  g.add(rim);

  // Spokes (10 thin spokes)
  for (let s = 0; s < 10; s++) {
    const spokeGeo = new THREE.BoxGeometry(0.04, pos.radius * 1.05, 0.02);
    const spoke = new THREE.Mesh(spokeGeo, rimMat);
    spoke.rotation.x = (s * Math.PI) / 5;
    g.add(spoke);
  }

  // Brake disc
  const rotorGeo = new THREE.CylinderGeometry(pos.radius * 0.55, pos.radius * 0.55, 0.02, 24);
  rotorGeo.rotateZ(Math.PI / 2);
  const rotor = new THREE.Mesh(rotorGeo, brakeRotorMat);
  rotor.position.set(suffix === 'FR' || suffix === 'RR' ? -pos.width * 0.2 : pos.width * 0.2, 0, 0);
  g.add(rotor);

  // Caliper
  const caliperGeo = new THREE.BoxGeometry(0.06, pos.radius * 0.32, pos.radius * 0.22);
  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  caliper.position.set(suffix === 'FR' || suffix === 'RR' ? -pos.width * 0.22 : pos.width * 0.22, pos.radius * 0.35, 0);
  g.add(caliper);

  g.position.set(pos.x, pos.y, pos.z);
  return g;
}

carGroup.add(buildWheel(WHEEL_POSITIONS.FL, 'FL'));
carGroup.add(buildWheel(WHEEL_POSITIONS.FR, 'FR'));
carGroup.add(buildWheel(WHEEL_POSITIONS.RL, 'RL'));
carGroup.add(buildWheel(WHEEL_POSITIONS.RR, 'RR'));

// Assemble hierarchy
carGroup.add(bodyGroup);
carGroup.add(frontWingGroup);
carGroup.add(rearWingGroup);
carGroup.add(haloGroup);
carGroup.add(sidepodsGroup);
carGroup.add(engineCoverGroup);

const scene = new THREE.Scene();
scene.add(carGroup);

// -----------------------------------------------------------------------------
// 5. EXPORT TO .GLB
// -----------------------------------------------------------------------------

const exporter = new GLTFExporter();

const result = await new Promise((resolve, reject) => {
  exporter.parse(
    scene,
    (gltf) => resolve(gltf),
    (err) => reject(err),
    {
      binary: true,
      embedImages: true,
      onlyVisible: true,
      truncateDrawRange: true,
      maxTextureSize: 1024,
    }
  );
});

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, Buffer.from(result));

console.log(`[build-redbull-glb] Wrote ${OUTPUT_PATH} (${Buffer.byteLength(result)} bytes)`);
