/**
 * build_ferrari_glb.mjs
 *
 * Procedurally constructs a high-fidelity, game-ready modern Formula 1 car model
 * for the Ferrari team slot: "SCUDERIA NOVARA" (Car #55) as a THREE.Scene
 * and serializes it to a binary glTF 2.0 (.glb) file using Three.js's GLTFExporter.
 *
 * Output: ../../assets/models/ferrari.glb
 *
 * Hierarchy (matches user specification & js/car.js):
 *   Car
 *   ├── car_body
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
const OUTPUT_PATH = resolve(__dirname, '..', '..', 'assets', 'models', 'ferrari.glb');

const ROSSO_RED = '#e10600';
const DARK_RED = '#9e0500';
const DEEP_WINE = '#650300';
const CARBON_BLACK = '#0d0d0d';
const RACING_YELLOW = '#efc107';
const PURE_WHITE = '#ffffff';

function makeCanvas(w, h) {
  return createCanvas(w, h);
}

function makeTexture(canvas, { colorSpace = THREE.SRGBColorSpace, anisotropy = 8 } = {}) {
  try { delete canvas.data; } catch (_) {}
  try { Object.defineProperty(canvas, 'data', { value: undefined, writable: true, configurable: true }); } catch (_) {}
  try { canvas.data = undefined; } catch (_) {}

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.anisotropy = anisotropy;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// -----------------------------------------------------------------------------
// 1. PROCEDURAL TEXTURES
// -----------------------------------------------------------------------------

function createCarbonMaterial() {
  const canvas = makeCanvas(256, 256);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#101114';
  ctx.fillRect(0, 0, 256, 256);
  const tile = 8;
  for (let y = 0; y < 256; y += tile) {
    for (let x = 0; x < 256; x += tile) {
      const diag = ((x / tile) + (y / tile)) & 1;
      ctx.fillStyle = diag ? '#1b1c20' : '#090a0c';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  const tex = makeTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);

  return new THREE.MeshStandardMaterial({
    map: tex,
    color: 0xffffff,
    metalness: 0.65,
    roughness: 0.40,
  });
}

/**
 * DRS Flap rear texture (centered white "NOVARA" with yellow underline)
 */
function createDrsFlapTexture() {
  const w = 1024, h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Red gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, DARK_RED);
  grad.addColorStop(0.5, ROSSO_RED);
  grad.addColorStop(1.0, DARK_RED);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Top and bottom carbon trim
  ctx.fillStyle = CARBON_BLACK;
  ctx.fillRect(0, 0, w, 22);
  ctx.fillRect(0, h - 22, w, 22);

  // Yellow accent lines
  ctx.fillStyle = RACING_YELLOW;
  ctx.fillRect(0, 22, w, 5);
  ctx.fillRect(0, h - 27, w, 5);

  // Bold crisp white "NOVARA"
  ctx.fillStyle = PURE_WHITE;
  ctx.font = 'italic 900 128px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NOVARA', w / 2, h / 2 + 2);

  // Yellow underline
  ctx.fillStyle = RACING_YELLOW;
  ctx.fillRect(w / 2 - 270, h / 2 + 64, 540, 8);

  // Specular sheen
  const sheen = ctx.createLinearGradient(0, 0, 0, h * 0.4);
  sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h * 0.4);

  return makeTexture(canvas);
}

/**
 * Sidepod Decal Texture (left-to-right reading order)
 */
function createSidepodDecalTexture() {
  const w = 1024, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Red base
  const redGrad = ctx.createLinearGradient(0, 0, 0, h);
  redGrad.addColorStop(0.0, DEEP_WINE);
  redGrad.addColorStop(0.3, ROSSO_RED);
  redGrad.addColorStop(0.7, DARK_RED);
  ctx.fillStyle = redGrad;
  ctx.fillRect(0, 0, w, h);

  // Metallic flake
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = 'rgba(255,235,200,0.04)';
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  // Lower carbon undercut section
  ctx.beginPath();
  ctx.moveTo(0, h * 0.65);
  ctx.bezierCurveTo(w * 0.3, h * 0.58, w * 0.7, h * 0.75, w, h * 0.68);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = CARBON_BLACK;
  ctx.fill();

  // Yellow sweeping speedline
  ctx.beginPath();
  ctx.moveTo(0, h * 0.645);
  ctx.bezierCurveTo(w * 0.3, h * 0.575, w * 0.7, h * 0.745, w, h * 0.675);
  ctx.strokeStyle = RACING_YELLOW;
  ctx.lineWidth = 10;
  ctx.stroke();

  // Aerodynamic triangular particle dispersion pattern
  function drawTri(cx, cy, s, a, col) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.866, s * 0.5);
    ctx.lineTo(-s * 0.866, s * 0.5);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < 160; i++) {
    const px = w * 0.45 + Math.random() * (w * 0.52);
    const py = h * 0.28 + Math.random() * (h * 0.45);
    const size = 3 + Math.random() * 8;
    const rot = Math.random() * Math.PI * 2;
    const r = Math.random();
    const col = r < 0.45 ? 'rgba(13,13,13,0.5)' : (r < 0.75 ? 'rgba(239,193,7,0.6)' : 'rgba(255,255,255,0.5)');
    drawTri(px, py, size, rot, col);
  }

  // "NOVARA" branding
  ctx.fillStyle = PURE_WHITE;
  ctx.font = 'italic 900 86px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textX = w * 0.46;
  const textY = h * 0.45;
  ctx.fillText('NOVARA', textX, textY);

  // Yellow underline
  ctx.fillStyle = RACING_YELLOW;
  ctx.fillRect(textX - 190, textY + 46, 380, 7);

  // Technical partner "VELANTE"
  ctx.fillStyle = PURE_WHITE;
  ctx.font = '900 38px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VELANTE', w * 0.10, h * 0.35);
  ctx.fillStyle = RACING_YELLOW;
  ctx.fillRect(w * 0.10, h * 0.38, 90, 5);

  return makeTexture(canvas);
}

/**
 * Shark fin texture: White Car #55, Novara crest, yellow pinstripes
 */
function createSharkFinTexture() {
  const w = 512, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Red to carbon black gradient
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0.0, ROSSO_RED);
  grad.addColorStop(0.5, DARK_RED);
  grad.addColorStop(1.0, CARBON_BLACK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Flakes
  function drawTri(cx, cy, s, a, col) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.866, s * 0.5);
    ctx.lineTo(-s * 0.866, s * 0.5);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 80; i++) {
    const px = w * 0.35 + Math.random() * (w * 0.55);
    const py = Math.random() * h;
    const col = Math.random() < 0.6 ? 'rgba(239,193,7,0.55)' : 'rgba(255,255,255,0.45)';
    drawTri(px, py, 4 + Math.random() * 6, Math.random() * Math.PI, col);
  }

  // Car Number 55
  ctx.fillStyle = PURE_WHITE;
  ctx.font = 'italic 900 130px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('55', w * 0.40, h * 0.42);

  // Team text
  ctx.fillStyle = RACING_YELLOW;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('SCUDERIA NOVARA', w * 0.40, h * 0.62);

  // Geometric Novara 'N' crest
  const cx = w * 0.78, cy = h * 0.40, r = 40;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.85, cy - r * 0.3);
  ctx.lineTo(cx + r * 0.65, cy + r * 0.7);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.65, cy + r * 0.7);
  ctx.lineTo(cx - r * 0.85, cy - r * 0.3);
  ctx.closePath();
  ctx.fillStyle = RACING_YELLOW;
  ctx.fill();
  ctx.fillStyle = ROSSO_RED;
  ctx.font = '900 48px sans-serif';
  ctx.fillText('N', cx, cy + 2);

  return makeTexture(canvas);
}

/**
 * Nosecone top decal texture:
 * Car #55, Novara crest, yellow contour pinstripes, "NOVARA" decal.
 */
function createNoseDecalTexture() {
  const w = 512, h = 1024;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Red base
  ctx.fillStyle = ROSSO_RED;
  ctx.fillRect(0, 0, w, h);

  // Metallic flake
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = 'rgba(255,230,180,0.035)';
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  // Dual yellow contour pinstripes running along length
  ctx.strokeStyle = RACING_YELLOW;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w * 0.28, 0);
  ctx.lineTo(w * 0.28, h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(w * 0.72, 0);
  ctx.lineTo(w * 0.72, h);
  ctx.stroke();

  // White "55" driver number on nose (oriented forward towards camera)
  ctx.fillStyle = PURE_WHITE;
  ctx.font = 'italic 900 120px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('55', w / 2, h * 0.68);

  // Geometric Novara 'N' crest in front of 55
  const nx = w / 2, ny = h * 0.84, nr = 42;
  ctx.beginPath();
  ctx.moveTo(nx, ny - nr);
  ctx.lineTo(nx + nr * 0.85, ny - nr * 0.3);
  ctx.lineTo(nx + nr * 0.65, ny + nr * 0.7);
  ctx.lineTo(nx, ny + nr);
  ctx.lineTo(nx - nr * 0.65, ny + nr * 0.7);
  ctx.lineTo(nx - nr * 0.85, ny - nr * 0.3);
  ctx.closePath();
  ctx.fillStyle = RACING_YELLOW;
  ctx.fill();
  ctx.fillStyle = ROSSO_RED;
  ctx.font = '900 48px sans-serif';
  ctx.fillText('N', nx, ny + 2);

  // "NOVARA" wordmark behind number 55
  ctx.fillStyle = PURE_WHITE;
  ctx.font = 'italic 900 64px sans-serif';
  ctx.fillText('NOVARA', w / 2, h * 0.46);

  // "VELANTE" technical sponsor
  ctx.fillStyle = RACING_YELLOW;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('VELANTE', w / 2, h * 0.28);

  return makeTexture(canvas);
}

function createTireTexture() {
  const w = 512, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#141416';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 2800; i++) {
    const g = 14 + Math.random() * 16;
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  const cx = w / 2, cy = h / 2;
  // Pirelli Yellow Medium compound sidewall ring
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.36, 0, Math.PI * 2);
  ctx.strokeStyle = RACING_YELLOW;
  ctx.lineWidth = 8;
  ctx.stroke();

  // "PIRELLI" curved sidewall text
  ctx.fillStyle = RACING_YELLOW;
  ctx.font = `900 ${Math.floor(w * 0.052)}px sans-serif`;
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

  // Inner rim mask
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.27, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1d21';
  ctx.fill();

  return makeTexture(canvas);
}

// -----------------------------------------------------------------------------
// 2. MATERIALS SETUP
// -----------------------------------------------------------------------------

const carbonMat = createCarbonMaterial();
const drsTex = createDrsFlapTexture();
const sidepodTex = createSidepodDecalTexture();
const sharkFinTex = createSharkFinTexture();
const noseDecalTex = createNoseDecalTexture();
const tireTex = createTireTexture();

const drsMat = new THREE.MeshStandardMaterial({
  map: drsTex,
  roughness: 0.22,
  metalness: 0.15,
  side: THREE.DoubleSide
});

const sidepodDecalMat = new THREE.MeshStandardMaterial({
  map: sidepodTex,
  roughness: 0.22,
  metalness: 0.18,
  side: THREE.DoubleSide
});

const sharkFinMat = new THREE.MeshStandardMaterial({
  map: sharkFinTex,
  roughness: 0.25,
  metalness: 0.2,
  side: THREE.DoubleSide
});

const noseDecalMat = new THREE.MeshStandardMaterial({
  map: noseDecalTex,
  roughness: 0.20,
  metalness: 0.15,
  side: THREE.DoubleSide
});

const redPaintMat = new THREE.MeshStandardMaterial({
  color: 0xe10600,
  roughness: 0.20,
  metalness: 0.15,
});

const yellowMat = new THREE.MeshStandardMaterial({
  color: 0xefc107,
  metalness: 0.65,
  roughness: 0.28,
});

const rimMat = new THREE.MeshStandardMaterial({
  color: 0x1a1a1d,
  metalness: 0.92,
  roughness: 0.25,
});

const brakeRotorMat = new THREE.MeshStandardMaterial({
  color: 0x5a5d66,
  metalness: 0.90,
  roughness: 0.35,
});

const caliperMat = new THREE.MeshStandardMaterial({
  color: 0xe10600,
  metalness: 0.75,
  roughness: 0.25,
});

const tireMat = new THREE.MeshStandardMaterial({
  map: tireTex,
  color: 0xffffff,
  metalness: 0.1,
  roughness: 0.85,
});

// -----------------------------------------------------------------------------
// 3. SCENE HIERARCHY
// -----------------------------------------------------------------------------

const carGroup = new THREE.Group();
carGroup.name = 'Car';

const carBodyGroup = new THREE.Group();
carBodyGroup.name = 'car_body';

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

// --- 3A. CAR_BODY ---

// Monocoque cockpit tub
{
  const geo = new THREE.BoxGeometry(0.96, 0.46, 1.85, 4, 2, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 0) {
      const taper = 1.0 - Math.max(0, (z + 0.9) / 1.85) * 0.20;
      pos.setX(i, pos.getX(i) * taper);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, redPaintMat);
  m.position.set(0, 0.42, 0.0);
  m.castShadow = true;
  carBodyGroup.add(m);
}

// Sharp aerodynamic long nosecone
{
  const geo = new THREE.ConeGeometry(0.34, 2.45, 8);
  geo.rotateX(Math.PI / 2);
  geo.scale(1.05, 0.32, 1.0);
  const m = new THREE.Mesh(geo, redPaintMat);
  m.position.set(0, 0.31, 1.88);
  m.castShadow = true;
  carBodyGroup.add(m);
}

// Dedicated upper nosecone decal plate (Car #55, Novara crest, yellow pinstripes)
{
  const geo = new THREE.PlaneGeometry(0.50, 1.90);
  geo.rotateX(-Math.PI / 2); // Lay flat facing up
  const m = new THREE.Mesh(geo, noseDecalMat);
  m.position.set(0, 0.44, 1.70);
  carBodyGroup.add(m);
}

// Nose tip camera pods
{
  const geo = new THREE.BoxGeometry(0.18, 0.10, 0.32);
  const m = new THREE.Mesh(geo, carbonMat);
  m.position.set(0, 0.26, 2.92);
  carBodyGroup.add(m);
}

// Cockpit opening and interior tub
{
  const geo = new THREE.BoxGeometry(0.56, 0.10, 0.80);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.95 }));
  m.position.set(0, 0.57, 0.50);
  carBodyGroup.add(m);

  // Driver headrest collar
  const collarGeo = new THREE.BoxGeometry(0.50, 0.16, 0.26);
  const collar = new THREE.Mesh(collarGeo, redPaintMat);
  collar.position.set(0, 0.62, 0.15);
  carBodyGroup.add(collar);
}

// Aerodynamic carbon underfloor tray
{
  const geo = new THREE.BoxGeometry(1.02, 0.05, 3.45);
  const m = new THREE.Mesh(geo, carbonMat);
  m.position.set(0, 0.07, 0);
  m.castShadow = true;
  carBodyGroup.add(m);
}

// Rear diffuser
{
  const geo = new THREE.BoxGeometry(1.10, 0.22, 0.52);
  const m = new THREE.Mesh(geo, carbonMat);
  m.position.set(0, 0.23, -1.96);
  m.castShadow = true;
  carBodyGroup.add(m);
}

// Diffuser strakes (5 vertical fins)
for (let i = 0; i < 5; i++) {
  const geo = new THREE.BoxGeometry(0.02, 0.20, 0.44);
  const m = new THREE.Mesh(geo, carbonMat);
  m.position.set(-0.42 + i * 0.21, 0.25, -1.96);
  carBodyGroup.add(m);
}

// --- 3B. SIDEPODS ---

function buildSidepod(side) {
  const g = new THREE.Group();

  // Sculpted pod body in glossy Rosso Red
  const podGeo = new THREE.BoxGeometry(0.44, 0.42, 1.75, 2, 2, 6);
  const pos = podGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 0 && z < 0) {
      pos.setY(i, y * (1.0 - (-z) / 1.75 * 0.35));
    }
  }
  pos.needsUpdate = true;
  podGeo.computeVertexNormals();

  const m = new THREE.Mesh(podGeo, redPaintMat);
  m.position.set(side * 0.56, 0.33, 0.05);
  m.castShadow = true;
  g.add(m);

  // Dedicated outward-facing decal billboard plate
  // Left side: plane faces -X. Right side: plane faces +X.
  const plateGeo = new THREE.PlaneGeometry(1.72, 0.40);
  if (side === 1) {
    plateGeo.rotateY(Math.PI / 2); // Faces +X
  } else {
    plateGeo.rotateY(-Math.PI / 2); // Faces -X
  }
  const decalMesh = new THREE.Mesh(plateGeo, sidepodDecalMat);
  decalMesh.position.set(side * (0.56 + 0.225), 0.33, 0.05);
  g.add(decalMesh);

  // Front radiator intake recess lip
  const lipGeo = new THREE.BoxGeometry(0.36, 0.03, 0.04);
  const lip = new THREE.Mesh(lipGeo, yellowMat);
  lip.position.set(side * 0.56, 0.49, 0.95);
  g.add(lip);

  // Front intake dark interior
  const inletGeo = new THREE.BoxGeometry(0.34, 0.28, 0.06);
  const inlet = new THREE.Mesh(inletGeo, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95 }));
  inlet.position.set(side * 0.56, 0.34, 0.94);
  g.add(inlet);

  // Carbon floor bargeboard
  const bargeGeo = new THREE.BoxGeometry(0.04, 0.16, 0.65);
  const barge = new THREE.Mesh(bargeGeo, carbonMat);
  barge.position.set(side * 0.82, 0.18, 0.45);
  g.add(barge);

  return g;
}

sidepodsGroup.add(buildSidepod(-1));
sidepodsGroup.add(buildSidepod(+1));

// --- 3C. ENGINE_COVER ---

{
  const geo = new THREE.BoxGeometry(0.42, 0.44, 1.45, 2, 2, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (z < 0) {
      const k = Math.max(0, (-z) / 0.72);
      pos.setX(i, pos.getX(i) * (1.0 - k * 0.28));
      pos.setY(i, pos.getY(i) * (1.0 - k * 0.12));
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, redPaintMat);
  m.position.set(0, 0.71, -0.40);
  m.castShadow = true;
  engineCoverGroup.add(m);

  // Overhead airbox hole
  const holeGeo = new THREE.CircleGeometry(0.135, 18);
  holeGeo.rotateY(Math.PI);
  const hole = new THREE.Mesh(holeGeo, new THREE.MeshStandardMaterial({ color: 0x050505, side: THREE.DoubleSide }));
  hole.position.set(0, 0.81, 0.41);
  engineCoverGroup.add(hole);

  // Yellow intake ring
  const ringGeo = new THREE.TorusGeometry(0.145, 0.02, 8, 24);
  ringGeo.rotateX(Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, yellowMat);
  ring.position.set(0, 0.81, 0.41);
  engineCoverGroup.add(ring);

  // Aerodynamic shark fin with Car #55 (dual-sided with un-mirrored graphics)
  const finL = 1.15 / 2, finH = 0.48 / 2;

  // Left fin face (normal points -X towards viewer looking from left)
  const leftFinGeo = new THREE.BufferGeometry();
  const leftPositions = new Float32Array([
    -0.004, -finH, -finL,
    -0.004, -finH,  finL,
    -0.004,  finH,  finL,
    -0.004,  finH, -finL,
  ]);
  const leftUvs = new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ]);
  leftFinGeo.setAttribute('position', new THREE.BufferAttribute(leftPositions, 3));
  leftFinGeo.setAttribute('uv', new THREE.BufferAttribute(leftUvs, 2));
  leftFinGeo.setIndex([0, 1, 2, 0, 2, 3]);
  leftFinGeo.computeVertexNormals();
  const leftFin = new THREE.Mesh(leftFinGeo, sharkFinMat);
  leftFin.position.set(0, 0.90, -1.05);
  leftFin.castShadow = true;
  engineCoverGroup.add(leftFin);

  // Right fin face (normal points +X towards viewer looking from right)
  const rightFinGeo = new THREE.BufferGeometry();
  const rightPositions = new Float32Array([
    0.004, -finH,  finL,
    0.004, -finH, -finL,
    0.004,  finH, -finL,
    0.004,  finH,  finL,
  ]);
  const rightUvs = new Float32Array([
    1, 0,
    0, 0,
    0, 1,
    1, 1,
  ]);
  rightFinGeo.setAttribute('position', new THREE.BufferAttribute(rightPositions, 3));
  rightFinGeo.setAttribute('uv', new THREE.BufferAttribute(rightUvs, 2));
  rightFinGeo.setIndex([0, 1, 2, 0, 2, 3]);
  rightFinGeo.computeVertexNormals();
  const rightFin = new THREE.Mesh(rightFinGeo, sharkFinMat);
  rightFin.position.set(0, 0.90, -1.05);
  rightFin.castShadow = true;
  engineCoverGroup.add(rightFin);

  // Exhaust tailpipe
  const exhGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.18, 16);
  exhGeo.rotateX(Math.PI / 2);
  const exh = new THREE.Mesh(exhGeo, new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.9, roughness: 0.3 }));
  exh.position.set(0, 0.56, -1.58);
  engineCoverGroup.add(exh);
}

// --- 3D. HALO ---

{
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.27, 0.61, 0.25),
    new THREE.Vector3(-0.26, 0.75, 0.45),
    new THREE.Vector3(0.0, 0.77, 0.76),
    new THREE.Vector3(0.26, 0.75, 0.45),
    new THREE.Vector3(0.27, 0.61, 0.25),
  ]);
  const geo = new THREE.TubeGeometry(curve, 32, 0.040, 10, false);
  const m = new THREE.Mesh(geo, redPaintMat);
  m.castShadow = true;
  haloGroup.add(m);

  // Central pillar
  const pillarGeo = new THREE.CylinderGeometry(0.022, 0.034, 0.27, 10);
  const pillar = new THREE.Mesh(pillarGeo, carbonMat);
  pillar.position.set(0, 0.63, 0.79);
  haloGroup.add(pillar);

  // Aerodynamic fairing
  const fairingGeo = new THREE.BoxGeometry(0.32, 0.02, 0.12);
  const fairing = new THREE.Mesh(fairingGeo, yellowMat);
  fairing.position.set(0, 0.78, 0.62);
  haloGroup.add(fairing);
}

// --- 3E. FRONT_WING ---

{
  // Carbon mainplane
  const mainGeo = new THREE.BoxGeometry(2.14, 0.04, 0.46);
  const main = new THREE.Mesh(mainGeo, carbonMat);
  main.position.set(0, 0.14, 2.42);
  main.castShadow = true;
  frontWingGroup.add(main);

  // Upper cascade flaps
  const flapGeo = new THREE.BoxGeometry(2.14, 0.03, 0.22);
  const flap = new THREE.Mesh(flapGeo, redPaintMat);
  flap.position.set(0, 0.18, 2.48);
  flap.rotation.x = -0.09;
  frontWingGroup.add(flap);

  // Third flap
  const flap3Geo = new THREE.BoxGeometry(2.04, 0.02, 0.14);
  const flap3 = new THREE.Mesh(flap3Geo, yellowMat);
  flap3.position.set(0, 0.21, 2.53);
  flap3.rotation.x = -0.12;
  frontWingGroup.add(flap3);

  // Outwash endplates
  for (const side of [-1, 1]) {
    const epGeo = new THREE.BoxGeometry(0.04, 0.26, 0.60);
    const ep = new THREE.Mesh(epGeo, redPaintMat);
    ep.position.set(side * 1.06, 0.21, 2.42);
    frontWingGroup.add(ep);

    const flickGeo = new THREE.BoxGeometry(0.08, 0.02, 0.16);
    const flick = new THREE.Mesh(flickGeo, yellowMat);
    flick.position.set(side * 1.08, 0.32, 2.36);
    flick.rotation.z = side * 0.3;
    frontWingGroup.add(flick);
  }

  // Nose pylons
  for (const side of [-1, 1]) {
    const pylonGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6);
    const py = new THREE.Mesh(pylonGeo, carbonMat);
    py.position.set(side * 0.18, 0.36, 2.22);
    py.rotation.x = -0.26;
    frontWingGroup.add(py);
  }
}

// --- 3F. REAR_WING ---

{
  // Main carbon plane
  const mainGeo = new THREE.BoxGeometry(1.14, 0.04, 0.34);
  const main = new THREE.Mesh(mainGeo, carbonMat);
  main.position.set(0, 0.96, -2.32);
  main.castShadow = true;
  rearWingGroup.add(main);

  // Upper DRS flap body
  const drsGeo = new THREE.BoxGeometry(1.14, 0.035, 0.24);
  const drs = new THREE.Mesh(drsGeo, redPaintMat);
  drs.position.set(0, 1.06, -2.34);
  drs.rotation.x = -0.18;
  rearWingGroup.add(drs);

  // Un-mirrored rear DRS billboard facing chase camera (-Z)
  // Counter-clockwise from -Z:
  // v0 = (-hw, -hh, 0) -> UV(0, 0)
  // v1 = ( hw, -hh, 0) -> UV(1, 0)
  // v2 = ( hw,  hh, 0) -> UV(1, 1)
  // v3 = (-hw,  hh, 0) -> UV(0, 1)
  const rearBannerGeo = new THREE.BufferGeometry();
  const hw = 1.14 / 2;
  const hh = 0.22 / 2;
  const positions = new Float32Array([
    -hw, -hh, 0,
     hw, -hh, 0,
     hw,  hh, 0,
    -hw,  hh, 0,
  ]);
  const uvs = new Float32Array([
    1, 0,
    0, 0,
    0, 1,
    1, 1,
  ]);
  const indices = [0, 2, 1, 0, 3, 2];
  rearBannerGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  rearBannerGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  rearBannerGeo.setIndex(indices);
  rearBannerGeo.computeVertexNormals();

  const rearBanner = new THREE.Mesh(rearBannerGeo, drsMat);
  rearBanner.position.set(0, 1.06, -2.46);
  rearBanner.rotation.x = -0.18;
  rearWingGroup.add(rearBanner);

  // Endplates with yellow vertical stripes
  for (const side of [-1, 1]) {
    const epGeo = new THREE.BoxGeometry(0.04, 0.52, 0.60);
    const ep = new THREE.Mesh(epGeo, redPaintMat);
    ep.position.set(side * 0.58, 0.94, -2.32);
    ep.castShadow = true;
    rearWingGroup.add(ep);

    const stripeGeo = new THREE.BoxGeometry(0.01, 0.44, 0.03);
    const stripe = new THREE.Mesh(stripeGeo, yellowMat);
    stripe.position.set(side * 0.602, 0.94, -2.25);
    rearWingGroup.add(stripe);
  }

  // Pylons
  for (const side of [-1, 1]) {
    const pylonGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.66, 8);
    const py = new THREE.Mesh(pylonGeo, carbonMat);
    py.position.set(side * 0.22, 0.62, -2.24);
    py.rotation.x = -0.18;
    rearWingGroup.add(py);
  }

  // Rain safety LED
  const ledGeo = new THREE.BoxGeometry(0.12, 0.06, 0.04);
  const led = new THREE.Mesh(ledGeo, new THREE.MeshStandardMaterial({
    color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5
  }));
  led.position.set(0, 0.30, -2.20);
  rearWingGroup.add(led);
}

// --- 3G. WHEELS (wheel_FL, wheel_FR, wheel_RL, wheel_RR) ---

const WHEEL_POSITIONS = {
  FL: { x: -0.85, y: 0.33, z: +1.80, radius: 0.33, width: 0.30 },
  FR: { x: +0.85, y: 0.33, z: +1.80, radius: 0.33, width: 0.30 },
  RL: { x: -0.88, y: 0.36, z: -1.80, radius: 0.36, width: 0.40 },
  RR: { x: +0.88, y: 0.36, z: -1.80, radius: 0.36, width: 0.40 },
};

function buildWheel(pos, suffix) {
  const g = new THREE.Group();
  g.name = `wheel_${suffix}`;

  const tireGeo = new THREE.CylinderGeometry(pos.radius, pos.radius, pos.width, 32);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  g.add(tire);

  // Outer sidewall disc
  const sideGeo = new THREE.CircleGeometry(pos.radius, 32);
  sideGeo.rotateY(Math.PI / 2);
  const outerSide = new THREE.Mesh(sideGeo, tireMat);
  outerSide.position.set(pos.width / 2 + 0.003, 0, 0);
  g.add(outerSide);

  const innerSide = new THREE.Mesh(sideGeo, tireMat);
  innerSide.position.set(-(pos.width / 2 + 0.003), 0, 0);
  innerSide.rotation.y = Math.PI;
  g.add(innerSide);

  // Rim barrel
  const rimGeo = new THREE.CylinderGeometry(pos.radius * 0.60, pos.radius * 0.60, pos.width * 0.95, 18);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  g.add(rim);

  // 10 alloy spokes
  for (let s = 0; s < 10; s++) {
    const spokeGeo = new THREE.BoxGeometry(0.038, pos.radius * 1.05, 0.02);
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

  // Rosso Red brake caliper
  const caliperGeo = new THREE.BoxGeometry(0.06, pos.radius * 0.34, pos.radius * 0.22);
  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  caliper.position.set(suffix === 'FR' || suffix === 'RR' ? -pos.width * 0.22 : pos.width * 0.22, pos.radius * 0.35, 0);
  g.add(caliper);

  g.position.set(pos.x, pos.y, pos.z);
  return g;
}

// Hierarchy assembly
carGroup.add(carBodyGroup);
carGroup.add(frontWingGroup);
carGroup.add(rearWingGroup);
carGroup.add(haloGroup);
carGroup.add(sidepodsGroup);
carGroup.add(engineCoverGroup);

carGroup.add(buildWheel(WHEEL_POSITIONS.FL, 'FL'));
carGroup.add(buildWheel(WHEEL_POSITIONS.FR, 'FR'));
carGroup.add(buildWheel(WHEEL_POSITIONS.RL, 'RL'));
carGroup.add(buildWheel(WHEEL_POSITIONS.RR, 'RR'));

const scene = new THREE.Scene();
scene.add(carGroup);

// -----------------------------------------------------------------------------
// 4. EXPORT TO .GLB
// -----------------------------------------------------------------------------

console.log('[build-ferrari-glb] Exporting high-fidelity Scuderia Novara model...');

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

console.log(`[build-ferrari-glb] SUCCESS: Wrote ${OUTPUT_PATH} (${Buffer.byteLength(result)} bytes)`);
process.exit(0);
