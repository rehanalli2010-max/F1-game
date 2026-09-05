/**
 * build_redbull_glb.mjs
 *
 * Procedurally constructs a high-fidelity, professional racing simulator F1 car model
 * for the Red Bull team slot: "ORION RACING" (Car #07) as a THREE.Scene
 * and serializes it to a binary glTF 2.0 (.glb) file using Three.js's GLTFExporter.
 *
 * Output: ../../assets/models/redbull.glb
 *
 * Hierarchy (strictly matches user specification & js/car.js):
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
const OUTPUT_PATH = resolve(__dirname, '..', '..', 'assets', 'models', 'redbull.glb');

// =============================================================================
// COLOR PALETTE (Exact match to Orion Racing Reference Specification)
// =============================================================================
const NAVY_PRIMARY = '#0A1D3B';
const NAVY_DEEP    = '#06122A';
const NAVY_NIGHT   = '#030917';
const CARBON_BLACK = '#0A0C10';
const BRIGHT_RED   = '#E30613';
const FIRE_RED     = '#C70510';
const FIRE_ORANGE  = '#FF5500';
const GOLD_YELLOW  = '#FFCC00';
const PURE_WHITE   = '#FFFFFF';

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

// =============================================================================
// 1. PROCEDURAL TEXTURES & LIVERY GENERATION
// =============================================================================

function createCarbonMaterial() {
  const canvas = makeCanvas(256, 256);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0F1014';
  ctx.fillRect(0, 0, 256, 256);
  const tile = 8;
  for (let y = 0; y < 256; y += tile) {
    for (let x = 0; x < 256; x += tile) {
      const diag = ((x / tile) + (y / tile)) & 1;
      ctx.fillStyle = diag ? '#1A1B20' : '#08090C';
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

function drawOrionEmblem(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);

  const s = size;
  // Center sharp diamond
  ctx.fillStyle = GOLD_YELLOW;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.95);
  ctx.lineTo(s * 0.28, -s * 0.1);
  ctx.lineTo(0, s * 0.85);
  ctx.lineTo(-s * 0.28, -s * 0.1);
  ctx.closePath();
  ctx.fill();

  // Red center faceted split
  ctx.fillStyle = BRIGHT_RED;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.95);
  ctx.lineTo(s * 0.28, -s * 0.1);
  ctx.lineTo(0, s * 0.15);
  ctx.closePath();
  ctx.fill();

  // Left wing facet
  ctx.fillStyle = GOLD_YELLOW;
  ctx.beginPath();
  ctx.moveTo(-s * 0.25, -s * 0.7);
  ctx.lineTo(-s * 0.85, -s * 0.35);
  ctx.lineTo(-s * 0.75, s * 0.35);
  ctx.lineTo(-s * 0.35, s * 0.15);
  ctx.closePath();
  ctx.fill();

  // Left inner orange accent
  ctx.fillStyle = FIRE_ORANGE;
  ctx.beginPath();
  ctx.moveTo(-s * 0.35, -s * 0.5);
  ctx.lineTo(-s * 0.75, -s * 0.25);
  ctx.lineTo(-s * 0.45, s * 0.05);
  ctx.closePath();
  ctx.fill();

  // Right wing facet
  ctx.fillStyle = GOLD_YELLOW;
  ctx.beginPath();
  ctx.moveTo(s * 0.25, -s * 0.7);
  ctx.lineTo(s * 0.85, -s * 0.35);
  ctx.lineTo(s * 0.75, s * 0.35);
  ctx.lineTo(s * 0.35, s * 0.15);
  ctx.closePath();
  ctx.fill();

  // Right inner red accent
  ctx.fillStyle = BRIGHT_RED;
  ctx.beginPath();
  ctx.moveTo(s * 0.35, -s * 0.5);
  ctx.lineTo(s * 0.75, -s * 0.25);
  ctx.lineTo(s * 0.45, s * 0.05);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawEnergyParticles(ctx, x0, y0, x1, y1, count) {
  const colors = [BRIGHT_RED, FIRE_ORANGE, GOLD_YELLOW, PURE_WHITE];
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const bx = x0 + (x1 - x0) * t + (Math.random() - 0.5) * 50;
    const by = y0 + (y1 - y0) * t + (Math.random() - 0.5) * 40;
    const len = 8 + Math.random() * 24;
    const h = 3 + Math.random() * 6;
    const angle = -0.10 + (Math.random() - 0.5) * 0.25;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle);
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.beginPath();
    ctx.moveTo(len, 0);
    ctx.lineTo(-len, -h);
    ctx.lineTo(-len * 0.6, 0);
    ctx.lineTo(-len, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/**
 * DRS Flap rear texture (centered crisp white "ORION" facing chase camera)
 */
function createDrsFlapTexture() {
  const w = 1024, h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, NAVY_DEEP);
  grad.addColorStop(0.4, NAVY_PRIMARY);
  grad.addColorStop(1.0, NAVY_DEEP);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = CARBON_BLACK;
  ctx.fillRect(0, 0, w, 22);
  ctx.fillRect(0, h - 22, w, 22);

  ctx.fillStyle = BRIGHT_RED;
  ctx.fillRect(0, 22, w, 6);
  ctx.fillRect(0, h - 28, w, 6);

  ctx.fillStyle = GOLD_YELLOW;
  ctx.fillRect(0, 28, w, 3);
  ctx.fillRect(0, h - 31, w, 3);

  ctx.fillStyle = BRIGHT_RED;
  ctx.fillRect(0, 0, 60, h);
  ctx.fillRect(w - 60, 0, 60, h);

  ctx.fillStyle = GOLD_YELLOW;
  ctx.fillRect(60, 0, 4, h);
  ctx.fillRect(w - 64, 0, 4, h);

  ctx.save();
  ctx.fillStyle = PURE_WHITE;
  ctx.font = 'italic 900 138px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 12;
  ctx.fillText('ORION', w / 2, h / 2 - 8);
  ctx.restore();

  ctx.fillStyle = GOLD_YELLOW;
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('F 1   T E A M', w / 2, h / 2 + 64);

  return makeTexture(canvas);
}

/**
 * Sidepod Decal Texture:
 * Built specifically for Left or Right side so forward/rear elements and typography
 * are completely un-mirrored and read naturally from left-to-right!
 */
function createSidepodDecalTexture(isRightSide = false) {
  const w = 2048, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, NAVY_DEEP);
  grad.addColorStop(0.3, NAVY_PRIMARY);
  grad.addColorStop(0.8, NAVY_DEEP);
  grad.addColorStop(1.0, NAVY_NIGHT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 3500; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  // Lower aerodynamic undercut in carbon fiber
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  ctx.bezierCurveTo(w * 0.28, h * 0.62, w * 0.70, h * 0.78, w, h * 0.72);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = CARBON_BLACK;
  ctx.fill();

  // Glowing scarlet red undercut border line
  ctx.beginPath();
  ctx.moveTo(0, h * 0.715);
  ctx.bezierCurveTo(w * 0.28, h * 0.615, w * 0.70, h * 0.775, w, h * 0.715);
  ctx.strokeStyle = BRIGHT_RED;
  ctx.lineWidth = 14;
  ctx.stroke();

  // Sweeping vibrant gold speed ribbon
  ctx.beginPath();
  ctx.moveTo(0, h * 0.36);
  ctx.bezierCurveTo(w * 0.30, h * 0.16, w * 0.55, h * 0.46, w, h * 0.38);
  ctx.strokeStyle = GOLD_YELLOW;
  ctx.lineWidth = 16;
  ctx.stroke();

  // Secondary fire-orange pinstripe
  ctx.beginPath();
  ctx.moveTo(0, h * 0.39);
  ctx.bezierCurveTo(w * 0.30, h * 0.19, w * 0.55, h * 0.49, w, h * 0.41);
  ctx.strokeStyle = FIRE_ORANGE;
  ctx.lineWidth = 5;
  ctx.stroke();

  drawEnergyParticles(ctx, w * 0.15, h * 0.64, w * 0.85, h * 0.72, 90);

  // Large Bold Crisp White "ORION" wordmark (Prominent in center)
  ctx.save();
  ctx.fillStyle = PURE_WHITE;
  ctx.font = 'italic 900 190px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillText('ORION', w * 0.50, h * 0.36);
  ctx.restore();

  // "F1 TEAM" subtitle in bold gold
  ctx.fillStyle = GOLD_YELLOW;
  ctx.font = 'italic 900 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('F 1   T E A M', w * 0.50, h * 0.53);

  // Gold accent bar under subtitle
  ctx.fillStyle = GOLD_YELLOW;
  ctx.fillRect(w * 0.50 - 180, h * 0.56, 360, 6);

  if (!isRightSide) {
    // Left sidepod:
    // Left edge (x = 0) is towards rear (-Z): show Car Number "07"
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'italic 900 110px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('07', w * 0.08, h * 0.36);

    // Right edge (x = w) is towards front (+Z): show "PULSAR"
    ctx.fillStyle = PURE_WHITE;
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('PULSAR', w * 0.94, h * 0.38);
    ctx.fillStyle = BRIGHT_RED;
    ctx.fillRect(w * 0.94 - 190, h * 0.405, 190, 5);
  } else {
    // Right sidepod:
    // Left edge (x = 0) is towards front (+Z): show "PULSAR"
    ctx.fillStyle = PURE_WHITE;
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PULSAR', w * 0.06, h * 0.38);
    ctx.fillStyle = BRIGHT_RED;
    ctx.fillRect(w * 0.06, h * 0.405, 190, 5);

    // Right edge (x = w) is towards rear (-Z): show Car Number "07"
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'italic 900 110px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('07', w * 0.92, h * 0.36);
  }

  // Clearcoat reflection
  const gloss = ctx.createLinearGradient(0, 0, 0, h * 0.4);
  gloss.addColorStop(0.0, 'rgba(255,255,255,0.22)');
  gloss.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, w, h * 0.4);

  return makeTexture(canvas);
}

/**
 * Upper Nosecone Decal Texture:
 * y = 0 maps to NOSE TIP (+Z in car space)
 * y = h maps to COCKPIT (-Z in car space)
 */
function createNoseDecalTexture() {
  const w = 1024, h = 2048;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Deep navy base
  ctx.fillStyle = NAVY_PRIMARY;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  // Fiery energy flame gradient at the NOSE TIP (y = 0..h * 0.48)
  const flameGrad = ctx.createLinearGradient(0, 0, 0, h * 0.48);
  flameGrad.addColorStop(0.0, GOLD_YELLOW);
  flameGrad.addColorStop(0.35, FIRE_ORANGE);
  flameGrad.addColorStop(0.75, FIRE_RED);
  flameGrad.addColorStop(1.0, 'rgba(10,29,59,0)');
  ctx.fillStyle = flameGrad;
  ctx.fillRect(0, 0, w, h * 0.48);

  // Fiery tongues licking backwards from tip towards cockpit
  ctx.save();
  ctx.fillStyle = FIRE_RED;
  ctx.beginPath();
  ctx.moveTo(w * 0.12, 0);
  ctx.bezierCurveTo(w * 0.18, h * 0.35, w * 0.32, h * 0.46, w * 0.5, h * 0.52);
  ctx.bezierCurveTo(w * 0.68, h * 0.46, w * 0.82, h * 0.35, w * 0.88, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = FIRE_ORANGE;
  ctx.beginPath();
  ctx.moveTo(w * 0.22, 0);
  ctx.bezierCurveTo(w * 0.28, h * 0.30, w * 0.38, h * 0.40, w * 0.5, h * 0.44);
  ctx.bezierCurveTo(w * 0.62, h * 0.40, w * 0.72, h * 0.30, w * 0.78, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = GOLD_YELLOW;
  ctx.beginPath();
  ctx.moveTo(w * 0.30, 0);
  ctx.bezierCurveTo(w * 0.34, h * 0.20, w * 0.42, h * 0.30, w * 0.5, h * 0.34);
  ctx.bezierCurveTo(w * 0.58, h * 0.30, w * 0.66, h * 0.20, w * 0.70, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawEnergyParticles(ctx, w * 0.25, h * 0.15, w * 0.75, h * 0.48, 90);

  // Dual aerodynamic gold pinstripes running along the nose ridge
  ctx.strokeStyle = GOLD_YELLOW;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(w * 0.38, h * 0.05);
  ctx.lineTo(w * 0.38, h * 0.92);
  ctx.moveTo(w * 0.62, h * 0.05);
  ctx.lineTo(w * 0.62, h * 0.92);
  ctx.stroke();

  // "PULSAR" at the very nose tip
  ctx.save();
  ctx.translate(w / 2, h * 0.08);
  ctx.rotate(Math.PI);
  ctx.fillStyle = NAVY_NIGHT;
  ctx.font = '900 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PULSAR', 0, 0);
  ctx.restore();

  // Prominent Car Number "07" in bold white italic with black drop shadow
  // Rotated by Math.PI so it is right side up when viewed from the front of the car!
  ctx.save();
  ctx.translate(w / 2, h * 0.42);
  ctx.rotate(Math.PI);
  ctx.fillStyle = PURE_WHITE;
  ctx.font = 'italic 900 240px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 8;
  ctx.fillText('07', 0, 0);
  ctx.restore();

  // "ORION RACING" typography below number
  ctx.save();
  ctx.translate(w / 2, h * 0.58);
  ctx.rotate(Math.PI);
  ctx.fillStyle = PURE_WHITE;
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ORION RACING', 0, 0);
  ctx.restore();

  // Orion faceted geometric crest emblem (near cockpit)
  drawOrionEmblem(ctx, w / 2, h * 0.78, 120);

  return makeTexture(canvas);
}

function createSharkFinTexture(isRightSide = false) {
  const w = 1024, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = NAVY_PRIMARY;
  ctx.fillRect(0, 0, w, h);

  if (!isRightSide) {
    // LEFT FIN (viewer sees rear on left, front on right)
    const burst = ctx.createRadialGradient(w * 0.8, h * 0.8, 30, w * 0.8, h * 0.8, w * 0.85);
    burst.addColorStop(0.0, GOLD_YELLOW);
    burst.addColorStop(0.3, FIRE_ORANGE);
    burst.addColorStop(0.65, BRIGHT_RED);
    burst.addColorStop(1.0, 'rgba(10,29,59,0)');
    ctx.fillStyle = burst;
    ctx.fillRect(0, 0, w, h);

    drawEnergyParticles(ctx, w * 0.3, h * 0.4, w * 0.8, h * 0.7, 60);

    ctx.fillStyle = GOLD_YELLOW;
    ctx.fillRect(0, 0, 24, h);
    ctx.fillStyle = BRIGHT_RED;
    ctx.fillRect(24, 0, 12, h);

    drawOrionEmblem(ctx, w * 0.65, h * 0.45, 80);

    ctx.save();
    ctx.fillStyle = PURE_WHITE;
    ctx.font = 'italic 900 180px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 16;
    ctx.fillText('07', w * 0.30, h * 0.48);
    ctx.restore();

    ctx.fillStyle = GOLD_YELLOW;
    ctx.font = '900 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ORION RACING', w * 0.5, h * 0.88);
  } else {
    // RIGHT FIN (viewer sees front on left, rear on right)
    const burst = ctx.createRadialGradient(w * 0.2, h * 0.8, 30, w * 0.2, h * 0.8, w * 0.85);
    burst.addColorStop(0.0, GOLD_YELLOW);
    burst.addColorStop(0.3, FIRE_ORANGE);
    burst.addColorStop(0.65, BRIGHT_RED);
    burst.addColorStop(1.0, 'rgba(10,29,59,0)');
    ctx.fillStyle = burst;
    ctx.fillRect(0, 0, w, h);

    drawEnergyParticles(ctx, w * 0.2, h * 0.7, w * 0.7, h * 0.4, 60);

    ctx.fillStyle = GOLD_YELLOW;
    ctx.fillRect(w - 24, 0, 24, h);
    ctx.fillStyle = BRIGHT_RED;
    ctx.fillRect(w - 36, 0, 12, h);

    drawOrionEmblem(ctx, w * 0.35, h * 0.45, 80);

    ctx.save();
    ctx.fillStyle = PURE_WHITE;
    ctx.font = 'italic 900 180px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 16;
    ctx.fillText('07', w * 0.70, h * 0.48);
    ctx.restore();

    ctx.fillStyle = GOLD_YELLOW;
    ctx.font = '900 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ORION RACING', w * 0.5, h * 0.88);
  }

  return makeTexture(canvas);
}

function createEngineCowlTopTexture() {
  const w = 1024, h = 1024;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = NAVY_PRIMARY;
  ctx.fillRect(0, 0, w, h);

  const burst = ctx.createRadialGradient(w / 2, h * 0.35, 40, w / 2, h * 0.4, w * 0.6);
  burst.addColorStop(0.0, GOLD_YELLOW);
  burst.addColorStop(0.35, FIRE_ORANGE);
  burst.addColorStop(0.70, BRIGHT_RED);
  burst.addColorStop(1.0, 'rgba(10,29,59,0)');
  ctx.fillStyle = burst;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.fillStyle = FIRE_ORANGE;
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.15);
  ctx.bezierCurveTo(w * 0.1, h * 0.3, w * 0.05, h * 0.65, w * 0.2, h * 0.85);
  ctx.bezierCurveTo(w * 0.35, h * 0.6, w * 0.45, h * 0.45, w / 2, h * 0.35);
  ctx.bezierCurveTo(w * 0.55, h * 0.45, w * 0.65, h * 0.6, w * 0.8, h * 0.85);
  ctx.bezierCurveTo(w * 0.95, h * 0.65, w * 0.9, h * 0.3, w / 2, h * 0.15);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = GOLD_YELLOW;
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.2);
  ctx.bezierCurveTo(w * 0.25, h * 0.35, w * 0.2, h * 0.6, w * 0.3, h * 0.75);
  ctx.bezierCurveTo(w * 0.4, h * 0.55, w * 0.45, h * 0.42, w / 2, h * 0.32);
  ctx.bezierCurveTo(w * 0.55, h * 0.42, w * 0.6, h * 0.55, w * 0.7, h * 0.75);
  ctx.bezierCurveTo(w * 0.8, h * 0.6, w * 0.75, h * 0.35, w / 2, h * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawEnergyParticles(ctx, w * 0.2, h * 0.3, w * 0.8, h * 0.75, 70);
  drawOrionEmblem(ctx, w / 2, h * 0.5, 95);

  return makeTexture(canvas);
}

function createFrontWingDecalTexture(isRightSide = false) {
  const w = 512, h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = NAVY_PRIMARY;
  ctx.fillRect(0, 0, w, h);

  if (!isRightSide) {
    ctx.fillStyle = BRIGHT_RED;
    ctx.fillRect(w - 24, 0, 24, h);
    ctx.fillStyle = GOLD_YELLOW;
    ctx.fillRect(w - 32, 0, 8, h);
  } else {
    ctx.fillStyle = BRIGHT_RED;
    ctx.fillRect(0, 0, 24, h);
    ctx.fillStyle = GOLD_YELLOW;
    ctx.fillRect(24, 0, 8, h);
  }

  ctx.fillStyle = PURE_WHITE;
  ctx.font = 'italic 900 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PULSAR', w / 2, h / 2);

  ctx.fillStyle = BRIGHT_RED;
  ctx.fillRect(w * 0.2, h * 0.72, w * 0.6, 6);
  ctx.fillStyle = GOLD_YELLOW;
  ctx.fillRect(w * 0.25, h * 0.77, w * 0.5, 4);

  return makeTexture(canvas);
}

function createTireTexture() {
  const w = 512, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#121316';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 2500; i++) {
    const g = 14 + Math.random() * 12;
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  const cx = w / 2, cy = h / 2;

  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.38, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD_YELLOW;
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = GOLD_YELLOW;
  ctx.font = `900 ${Math.floor(w * 0.048)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const r = Math.min(w, h) * 0.38;
  const textTop = 'ORION';
  const startTop = -Math.PI * 0.25;
  const endTop = Math.PI * 0.25;
  for (let i = 0; i < textTop.length; i++) {
    const a = startTop + (endTop - startTop) * (i / (textTop.length - 1 || 1));
    ctx.save();
    ctx.translate(cx + Math.sin(a) * r, cy - Math.cos(a) * r);
    ctx.rotate(a);
    ctx.fillText(textTop[i], 0, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.28, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD_YELLOW;
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.27, 0, Math.PI * 2);
  ctx.fillStyle = '#18191D';
  ctx.fill();

  return makeTexture(canvas);
}

// =============================================================================
// 2. MATERIALS SETUP
// =============================================================================

const carbonMat = createCarbonMaterial();
const drsTex = createDrsFlapTexture();
const leftSidepodTex = createSidepodDecalTexture(false);
const rightSidepodTex = createSidepodDecalTexture(true);
const leftSharkFinTex = createSharkFinTexture(false);
const rightSharkFinTex = createSharkFinTexture(true);
const noseDecalTex = createNoseDecalTexture();
const engineCowlTopTex = createEngineCowlTopTexture();
const leftFrontWingDecalTex = createFrontWingDecalTexture(false);
const rightFrontWingDecalTex = createFrontWingDecalTexture(true);
const tireTex = createTireTexture();

const drsMat = new THREE.MeshStandardMaterial({
  map: drsTex,
  roughness: 0.20,
  metalness: 0.18,
  side: THREE.DoubleSide
});

const leftSidepodDecalMat = new THREE.MeshStandardMaterial({
  map: leftSidepodTex,
  roughness: 0.20,
  metalness: 0.18,
  side: THREE.FrontSide
});

const rightSidepodDecalMat = new THREE.MeshStandardMaterial({
  map: rightSidepodTex,
  roughness: 0.20,
  metalness: 0.18,
  side: THREE.FrontSide
});

const leftSharkFinMat = new THREE.MeshStandardMaterial({
  map: leftSharkFinTex,
  roughness: 0.22,
  metalness: 0.18,
  side: THREE.FrontSide
});

const rightSharkFinMat = new THREE.MeshStandardMaterial({
  map: rightSharkFinTex,
  roughness: 0.22,
  metalness: 0.18,
  side: THREE.FrontSide
});

const noseDecalMat = new THREE.MeshStandardMaterial({
  map: noseDecalTex,
  roughness: 0.18,
  metalness: 0.15,
  side: THREE.FrontSide
});

const engineCowlTopMat = new THREE.MeshStandardMaterial({
  map: engineCowlTopTex,
  roughness: 0.20,
  metalness: 0.18,
  side: THREE.DoubleSide
});

const leftFrontWingDecalMat = new THREE.MeshStandardMaterial({
  map: leftFrontWingDecalTex,
  roughness: 0.22,
  metalness: 0.15,
  side: THREE.DoubleSide
});

const rightFrontWingDecalMat = new THREE.MeshStandardMaterial({
  map: rightFrontWingDecalTex,
  roughness: 0.22,
  metalness: 0.15,
  side: THREE.DoubleSide
});

const navyPaintMat = new THREE.MeshStandardMaterial({
  color: 0x0A1D3B,
  roughness: 0.18,
  metalness: 0.25,
});

const redAccentMat = new THREE.MeshStandardMaterial({
  color: 0xE30613,
  roughness: 0.22,
  metalness: 0.20,
});

const goldAccentMat = new THREE.MeshStandardMaterial({
  color: 0xFFCC00,
  metalness: 0.70,
  roughness: 0.25,
});

const rimMat = new THREE.MeshStandardMaterial({
  color: 0x16171B,
  metalness: 0.92,
  roughness: 0.22,
});

const rimYellowRingMat = new THREE.MeshStandardMaterial({
  color: 0xFFCC00,
  metalness: 0.65,
  roughness: 0.25,
});

const brakeRotorMat = new THREE.MeshStandardMaterial({
  color: 0x555860,
  metalness: 0.90,
  roughness: 0.35,
});

const caliperMat = new THREE.MeshStandardMaterial({
  color: 0xE30613,
  metalness: 0.75,
  roughness: 0.25,
});

const tireMat = new THREE.MeshStandardMaterial({
  map: tireTex,
  color: 0xffffff,
  metalness: 0.1,
  roughness: 0.85,
});

// =============================================================================
// 3. SCENE HIERARCHY CONSTRUCTION (Strictly matches User Target Structure)
// =============================================================================

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
  const m = new THREE.Mesh(geo, navyPaintMat);
  m.position.set(0, 0.42, 0.0);
  m.castShadow = true;
  carBodyGroup.add(m);
}

// Sharp aerodynamic long nosecone
{
  const geo = new THREE.ConeGeometry(0.34, 2.45, 8);
  geo.rotateX(Math.PI / 2);
  geo.scale(1.05, 0.32, 1.0);
  const m = new THREE.Mesh(geo, navyPaintMat);
  m.position.set(0, 0.31, 1.88);
  m.castShadow = true;
  carBodyGroup.add(m);
}

// Upper Nosecone Decal Surface (Direct buffer geometry from cockpit to tip)
{
  const zRear = 0.85, yRear = 0.465, wRear = 0.46 / 2;
  const zFront = 2.92, yFront = 0.285, wFront = 0.20 / 2;
  const noseBoardGeo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    -wRear,  yRear,  zRear,   // 0: Rear-Left  (cockpit end)
     wRear,  yRear,  zRear,   // 1: Rear-Right (cockpit end)
     wFront, yFront, zFront,  // 2: Front-Right (nose tip)
    -wFront, yFront, zFront,  // 3: Front-Left  (nose tip)
  ]);
  const uvs = new Float32Array([
    0, 0, // Rear-Left: v = 0 (bottom of canvas = cockpit)
    1, 0, // Rear-Right: v = 0
    1, 1, // Front-Right: v = 1 (top of canvas = nose tip)
    0, 1, // Front-Left: v = 1
  ]);
  noseBoardGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  noseBoardGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  // Winding with normal facing up:
  noseBoardGeo.setIndex([0, 2, 1, 0, 3, 2]);
  noseBoardGeo.computeVertexNormals();

  const noseDecal = new THREE.Mesh(noseBoardGeo, noseDecalMat);
  carBodyGroup.add(noseDecal);
}

// Nose tip camera pods
{
  const geo = new THREE.BoxGeometry(0.18, 0.10, 0.32);
  const m = new THREE.Mesh(geo, carbonMat);
  m.position.set(0, 0.26, 2.92);
  carBodyGroup.add(m);
}

// Cockpit interior opening
{
  const geo = new THREE.BoxGeometry(0.56, 0.10, 0.80);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.95 }));
  m.position.set(0, 0.57, 0.50);
  carBodyGroup.add(m);

  // Driver headrest collar in bright red
  const collarGeo = new THREE.BoxGeometry(0.50, 0.16, 0.26);
  const collar = new THREE.Mesh(collarGeo, redAccentMat);
  collar.position.set(0, 0.62, 0.15);
  carBodyGroup.add(collar);
}

// Aerodynamic Side Mirrors
for (const side of [-1, 1]) {
  const stalkGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6);
  const stalk = new THREE.Mesh(stalkGeo, goldAccentMat);
  stalk.position.set(side * 0.46, 0.62, 0.62);
  stalk.rotation.z = side * 0.55;
  carBodyGroup.add(stalk);

  const mirrorGeo = new THREE.BoxGeometry(0.14, 0.06, 0.08);
  const mirror = new THREE.Mesh(mirrorGeo, navyPaintMat);
  mirror.position.set(side * 0.54, 0.68, 0.62);
  carBodyGroup.add(mirror);

  const mirrorCapGeo = new THREE.BoxGeometry(0.02, 0.058, 0.078);
  const mirrorCap = new THREE.Mesh(mirrorCapGeo, redAccentMat);
  mirrorCap.position.set(side * 0.61, 0.68, 0.62);
  carBodyGroup.add(mirrorCap);
}

// Front Suspension Wishbones (Exposed carbon fiber linkages)
for (const side of [-1, 1]) {
  const uArmGeo = new THREE.BoxGeometry(0.48, 0.018, 0.03);
  const uArm = new THREE.Mesh(uArmGeo, carbonMat);
  uArm.position.set(side * 0.52, 0.38, 1.80);
  uArm.rotation.z = side * 0.10;
  carBodyGroup.add(uArm);

  const lArmGeo = new THREE.BoxGeometry(0.48, 0.018, 0.03);
  const lArm = new THREE.Mesh(lArmGeo, carbonMat);
  lArm.position.set(side * 0.52, 0.22, 1.80);
  lArm.rotation.z = -side * 0.06;
  carBodyGroup.add(lArm);

  const pushGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.52, 6);
  const pushrod = new THREE.Mesh(pushGeo, carbonMat);
  pushrod.position.set(side * 0.50, 0.32, 1.76);
  pushrod.rotation.z = side * 0.45;
  carBodyGroup.add(pushrod);
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

  // Sculpted pod body in glossy Deep Navy Blue
  const podGeo = new THREE.BoxGeometry(0.44, 0.46, 1.75, 2, 2, 6);
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

  const m = new THREE.Mesh(podGeo, navyPaintMat);
  m.position.set(side * 0.56, 0.35, 0.05);
  m.castShadow = true;
  g.add(m);

  // Dedicated un-mirrored decal billboard surface
  const plateGeo = new THREE.PlaneGeometry(1.72, 0.44);
  if (side === 1) {
    plateGeo.rotateY(Math.PI / 2); // Faces +X
  } else {
    plateGeo.rotateY(-Math.PI / 2); // Faces -X
  }
  const decalMesh = new THREE.Mesh(plateGeo, side === 1 ? rightSidepodDecalMat : leftSidepodDecalMat);
  decalMesh.position.set(side * (0.56 + 0.225), 0.35, 0.05);
  g.add(decalMesh);

  // Radiator intake yellow/gold highlight lip
  const lipGeo = new THREE.BoxGeometry(0.36, 0.03, 0.04);
  const lip = new THREE.Mesh(lipGeo, goldAccentMat);
  lip.position.set(side * 0.56, 0.53, 0.95);
  g.add(lip);

  // Front radiator inlet (dark recess)
  const inletGeo = new THREE.BoxGeometry(0.34, 0.30, 0.06);
  const inlet = new THREE.Mesh(inletGeo, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95 }));
  inlet.position.set(side * 0.56, 0.36, 0.94);
  g.add(inlet);

  // Carbon floor bargeboard & edge winglet
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
  const m = new THREE.Mesh(geo, navyPaintMat);
  m.position.set(0, 0.71, -0.40);
  m.castShadow = true;
  engineCoverGroup.add(m);

  // Top Engine Cowl Fiery Decal Surface (visible from top view and rear 3/4)
  const cowlTopGeo = new THREE.PlaneGeometry(0.40, 1.40);
  cowlTopGeo.rotateX(-Math.PI / 2);
  const cowlTop = new THREE.Mesh(cowlTopGeo, engineCowlTopMat);
  cowlTop.position.set(0, 0.932, -0.40);
  engineCoverGroup.add(cowlTop);

  // Overhead airbox hole
  const holeGeo = new THREE.CircleGeometry(0.135, 18);
  holeGeo.rotateY(Math.PI);
  const hole = new THREE.Mesh(holeGeo, new THREE.MeshStandardMaterial({ color: 0x050505, side: THREE.DoubleSide }));
  hole.position.set(0, 0.81, 0.41);
  engineCoverGroup.add(hole);

  // Vibrant Gold/Yellow airbox intake trim ring (prominent in reference image)
  const ringGeo = new THREE.TorusGeometry(0.145, 0.02, 8, 24);
  ringGeo.rotateX(Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, goldAccentMat);
  ring.position.set(0, 0.81, 0.41);
  engineCoverGroup.add(ring);

  // Aerodynamic shark fin with Car #07 and energy graphics (strictly un-mirrored on both sides)
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
  const leftFin = new THREE.Mesh(leftFinGeo, leftSharkFinMat);
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
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ]);
  rightFinGeo.setAttribute('position', new THREE.BufferAttribute(rightPositions, 3));
  rightFinGeo.setAttribute('uv', new THREE.BufferAttribute(rightUvs, 2));
  rightFinGeo.setIndex([0, 1, 2, 0, 2, 3]);
  rightFinGeo.computeVertexNormals();
  const rightFin = new THREE.Mesh(rightFinGeo, rightSharkFinMat);
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
  const m = new THREE.Mesh(geo, navyPaintMat);
  m.castShadow = true;
  haloGroup.add(m);

  // Central halo support pillar
  const pillarGeo = new THREE.CylinderGeometry(0.022, 0.034, 0.27, 10);
  const pillar = new THREE.Mesh(pillarGeo, carbonMat);
  pillar.position.set(0, 0.63, 0.79);
  haloGroup.add(pillar);

  // Gold aerodynamic fairing line along top hoop
  const fairingGeo = new THREE.BoxGeometry(0.32, 0.02, 0.12);
  const fairing = new THREE.Mesh(fairingGeo, goldAccentMat);
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

  // Upper cascade flaps in Deep Navy
  const flapGeo = new THREE.BoxGeometry(2.14, 0.03, 0.22);
  const flap = new THREE.Mesh(flapGeo, navyPaintMat);
  flap.position.set(0, 0.18, 2.48);
  flap.rotation.x = -0.09;
  frontWingGroup.add(flap);

  // Third flap with bright red leading edge
  const flap3Geo = new THREE.BoxGeometry(2.04, 0.02, 0.14);
  const flap3 = new THREE.Mesh(flap3Geo, redAccentMat);
  flap3.position.set(0, 0.21, 2.53);
  flap3.rotation.x = -0.12;
  frontWingGroup.add(flap3);

  // Fourth flap with gold trim
  const flap4Geo = new THREE.BoxGeometry(1.96, 0.015, 0.10);
  const flap4 = new THREE.Mesh(flap4Geo, goldAccentMat);
  flap4.position.set(0, 0.23, 2.56);
  flap4.rotation.x = -0.15;
  frontWingGroup.add(flap4);

  // Outwash endplates with decals
  for (const side of [-1, 1]) {
    const epGeo = new THREE.BoxGeometry(0.04, 0.26, 0.60);
    const ep = new THREE.Mesh(epGeo, navyPaintMat);
    ep.position.set(side * 1.06, 0.21, 2.42);
    frontWingGroup.add(ep);

    // Endplate decal billboard facing outward
    const epDecalGeo = new THREE.PlaneGeometry(0.56, 0.24);
    if (side === 1) epDecalGeo.rotateY(Math.PI / 2);
    else epDecalGeo.rotateY(-Math.PI / 2);
    const epDecal = new THREE.Mesh(epDecalGeo, side === 1 ? rightFrontWingDecalMat : leftFrontWingDecalMat);
    epDecal.position.set(side * 1.082, 0.21, 2.42);
    frontWingGroup.add(epDecal);

    // Aerodynamic outwash flicks in gold
    const flickGeo = new THREE.BoxGeometry(0.08, 0.02, 0.16);
    const flick = new THREE.Mesh(flickGeo, goldAccentMat);
    flick.position.set(side * 1.08, 0.32, 2.36);
    flick.rotation.z = side * 0.3;
    frontWingGroup.add(flick);
  }

  // Nose connection pylons
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

  // Upper DRS flap body in Deep Navy
  const drsGeo = new THREE.BoxGeometry(1.14, 0.035, 0.24);
  const drs = new THREE.Mesh(drsGeo, navyPaintMat);
  drs.position.set(0, 1.06, -2.34);
  drs.rotation.x = -0.18;
  rearWingGroup.add(drs);

  // Un-mirrored rear DRS billboard facing chase camera (-Z)
  // Proven Ferrari architecture: uvs = [1, 0,  0, 0,  0, 1,  1, 1], indices = [0, 2, 1, 0, 3, 2]
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

  // Endplates in Deep Navy with red accents
  for (const side of [-1, 1]) {
    const epGeo = new THREE.BoxGeometry(0.04, 0.52, 0.60);
    const ep = new THREE.Mesh(epGeo, navyPaintMat);
    ep.position.set(side * 0.58, 0.94, -2.32);
    ep.castShadow = true;
    rearWingGroup.add(ep);

    // Endplate red lower section
    const epRedGeo = new THREE.BoxGeometry(0.042, 0.14, 0.58);
    const epRed = new THREE.Mesh(epRedGeo, redAccentMat);
    epRed.position.set(side * 0.58, 0.72, -2.32);
    rearWingGroup.add(epRed);

    // Gold vertical pinstripe
    const epGoldGeo = new THREE.BoxGeometry(0.044, 0.48, 0.02);
    const epGold = new THREE.Mesh(epGoldGeo, goldAccentMat);
    epGold.position.set(side * 0.58, 0.94, -2.04);
    rearWingGroup.add(epGold);
  }

  // Dual swan-neck pylons
  for (const side of [-1, 1]) {
    const pylonGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.68, 8);
    const py = new THREE.Mesh(pylonGeo, carbonMat);
    py.position.set(side * 0.22, 0.63, -2.24);
    py.rotation.x = -0.18;
    rearWingGroup.add(py);
  }

  // DRS actuator pod in center
  const podGeo = new THREE.BoxGeometry(0.08, 0.08, 0.16);
  const actPod = new THREE.Mesh(podGeo, carbonMat);
  actPod.position.set(0, 1.08, -2.34);
  rearWingGroup.add(actPod);

  // FIA Rain safety LED
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

  // Outer sidewall disc with tire texture
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

  // Vibrant Yellow outer rim lip ring (as shown in reference image!)
  const rimLipGeo = new THREE.TorusGeometry(pos.radius * 0.58, 0.012, 8, 32);
  rimLipGeo.rotateY(Math.PI / 2);
  const rimLip = new THREE.Mesh(rimLipGeo, rimYellowRingMat);
  rimLip.position.set(pos.width / 2 + 0.004, 0, 0);
  g.add(rimLip);

  // 10 alloy spokes
  for (let s = 0; s < 10; s++) {
    const spokeGeo = new THREE.BoxGeometry(0.038, pos.radius * 1.05, 0.02);
    const spoke = new THREE.Mesh(spokeGeo, rimMat);
    spoke.rotation.x = (s * Math.PI) / 5;
    g.add(spoke);
  }

  // Red center wheel nut
  const nutGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.025, 6);
  nutGeo.rotateZ(Math.PI / 2);
  const nut = new THREE.Mesh(nutGeo, redAccentMat);
  nut.position.set(pos.width / 2 + 0.008, 0, 0);
  g.add(nut);

  // Brake rotor disc
  const rotorGeo = new THREE.CylinderGeometry(pos.radius * 0.55, pos.radius * 0.55, 0.02, 24);
  rotorGeo.rotateZ(Math.PI / 2);
  const rotor = new THREE.Mesh(rotorGeo, brakeRotorMat);
  rotor.position.set(suffix === 'FR' || suffix === 'RR' ? -pos.width * 0.2 : pos.width * 0.2, 0, 0);
  g.add(rotor);

  // Bright red brake caliper
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

// =============================================================================
// 4. EXPORT TO .GLB
// =============================================================================

console.log('[build-redbull-glb] Exporting high-fidelity Orion Racing model...');

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

console.log(`[build-redbull-glb] SUCCESS: Wrote ${OUTPUT_PATH} (${Buffer.byteLength(result)} bytes)`);
process.exit(0);
