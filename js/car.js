import * as THREE from 'three';
import { TextureFactory } from './textures.js?v=42';
import { F1_TEAMS, getTeamById } from './teams_db.js?v=42';

const _liveryCanvasCache = new Map();
const _tireCompoundStripes = {
  SOFT: { color: '#ff0000', label: 'SOFT' },
  MEDIUM: { color: '#ffff00', label: 'MEDIUM' },
  HARD: { color: '#ffffff', label: 'HARD' }
};

const _compoundNames = ['SOFT', 'MEDIUM', 'HARD'];

/**
 * Path to the optional external Red Bull GLB body.
 * When this file exists, Red Bull cars load it in place of the procedural body
 * while keeping the existing physics chassis, wheels, steering, AI and netcode.
 * Other teams are unaffected and continue to use the procedural composite body.
 */
const RED_BULL_GLB_PATH = 'assets/models/redbull.glb';

/**
 * Path to the optional external Mercedes GLB body.
 * When this file exists, Mercedes cars load it in place of the procedural body
 * while keeping the existing physics chassis, wheels, steering, AI and netcode.
 * Other teams are unaffected and continue to use the procedural composite body.
 */
const MERCEDES_GLB_PATH = 'assets/models/mercedes.glb';

/**
 * Path to the custom Ferrari slot GLB body ("SCUDERIA NOVARA").
 * When this file exists, cars in the Ferrari team slot load it in place of
 * the procedural body while keeping the existing physics chassis, wheels,
 * steering, suspension, AI and netcode completely unchanged.
 * Other teams are unaffected and continue to use their respective models.
 */
const FERRARI_GLB_PATH = 'assets/models/ferrari.glb?v=6';

/**
 * GLB body alignment constants.
 * Adjust these to match the imported Red Bull GLB's natural orientation
 * (most DCCs export glTF with +Y up, +Z forward, scale in meters).
 * - BODY_SCALE:        uniform scale of the loaded scene root
 * - BODY_OFFSET_Y:     vertical offset so the floor of the model sits at the
 *                      same height as the procedural body (wheel hubs ~y=0)
 * - BODY_ROTATION_Y:   Y-axis rotation to align the model's "forward" with
 *                      the chassis +Z (which is the cannon-es forward axis)
 * - BODY_LENGTH_TARGET: target total length in meters (used to auto-scale if
 *                       AUTO_SCALE_TO_PHYSICS is true)
 * - AUTO_SCALE_TO_PHYSICS: when true, BODY_SCALE is recomputed so the model's
 *                          bounding box matches the physics chassis length
 */
const BODY_SCALE = 1.0;
const BODY_OFFSET_Y = 0.0;
const BODY_ROTATION_Y = 0.0;
const AUTO_SCALE_TO_PHYSICS = false;
const BODY_LENGTH_TARGET = 4.4;

/**
 * GLB mesh name prefixes to hide, because the existing procedural wheel
 * system in this file (buildWheels) already drives wheel rotation, steering
 * and physics sync from cannon-es. Naming your GLB wheels with one of these
 * prefixes (e.g. wheel_FL, tire_rear_right) suppresses the GLB wheel so you
 * do not get double wheels.
 * Set to [] to keep the GLB's wheels visible.
 */
const HIDE_GLB_MESH_PREFIXES = ['wheel', 'tire', 'tyre', 'brake', 'rim', 'hub', 'suspension', 'wishbone'];

const _gltfCache = new Map();

/**
 * Creates a clearcoat carbon-fiber PBR material using MeshPhysicalMaterial
 * @param {number} baseColor - Base color hex
 * @param {THREE.Texture} [map] - Optional livery map
 * @returns {THREE.MeshPhysicalMaterial}
 */
function createClearcoatCarbonMaterial(baseColor, map = null) {
  const carbonTex = TextureFactory.createCarbonFiberTexture(256, 256);
  carbonTex.wrapS = THREE.RepeatWrapping;
  carbonTex.wrapT = THREE.RepeatWrapping;
  carbonTex.repeat.set(8, 8);

  return new THREE.MeshPhysicalMaterial({
    color: map ? 0xffffff : baseColor, // Critical: don't tint custom livery textures!
    map: map,
    roughness: 0.22,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.6,
    normalMap: carbonTex,
    normalScale: new THREE.Vector2(0.2, 0.2),
  });
}

let _cachedMatteCarbonMat = null;
/**
 * Creates matte checkered carbon-fiber material for aero elements
 * @returns {THREE.MeshPhysicalMaterial}
 */
function createMatteCarbonMaterial() {
  if (_cachedMatteCarbonMat) return _cachedMatteCarbonMat;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0e10';
  ctx.fillRect(0, 0, 256, 256);

  const tileSize = 8;
  for (let y = 0; y < 256; y += tileSize) {
    for (let x = 0; x < 256; x += tileSize) {
      const isDiagonal = ((x / tileSize) + (y / tileSize)) % 2 === 0;
      ctx.fillStyle = isDiagonal ? '#1a1b1f' : '#0a0b0d';
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);

  _cachedMatteCarbonMat = new THREE.MeshPhysicalMaterial({
    map: tex,
    color: 0x1a1a1a,
    roughness: 0.85,
    metalness: 0.35,
    clearcoat: 0.0,
    envMapIntensity: 0.3,
  });
  return _cachedMatteCarbonMat;
}

const _tireMaterialCache = new Map();
/**
 * Creates tire compound material with sidewall stripe (cached per compound)
 * @param {string} compound - 'SOFT' | 'MEDIUM' | 'HARD'
 * @param {string} teamColor - Team accent color for branding
 * @returns {Object} { tireMat, sidewallMat, stripeColor }
 */
function createTireCompoundMaterials(compound, teamColor) {
  const compKey = compound || 'MEDIUM';
  if (_tireMaterialCache.has(compKey)) {
    return _tireMaterialCache.get(compKey);
  }

  const stripe = _tireCompoundStripes[compKey] || _tireCompoundStripes.MEDIUM;

  const tireRubberMat = new THREE.MeshPhysicalMaterial({
    color: 0x141416,
    roughness: 0.80,
    metalness: 0.08,
    clearcoat: 0.1,
    clearcoatRoughness: 0.6,
  });

  const sidewallCanvas = document.createElement('canvas');
  sidewallCanvas.width = 512;
  sidewallCanvas.height = 512;
  const sctx = sidewallCanvas.getContext('2d');

  sctx.fillStyle = '#141416';
  sctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 3000; i++) {
    const g = 15 + Math.random() * 15;
    sctx.fillStyle = `rgb(${g},${g},${g})`;
    sctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  const cx = 256, cy = 256;
  sctx.beginPath();
  sctx.arc(cx, cy, 185, 0, Math.PI * 2);
  sctx.strokeStyle = stripe.color;
  sctx.lineWidth = 14;
  sctx.stroke();

  sctx.beginPath();
  sctx.arc(cx, cy, 160, 0, Math.PI * 2);
  sctx.strokeStyle = 'rgba(255,255,255,0.25)';
  sctx.lineWidth = 2;
  sctx.stroke();

  const drawCurvedText = (text, radius, startAngle, endAngle, isTop = true) => {
    sctx.save();
    sctx.fillStyle = stripe.color;
    sctx.font = '900 24px sans-serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    const angleStep = (endAngle - startAngle) / text.length;
    for (let i = 0; i < text.length; i++) {
      const angle = startAngle + i * angleStep + angleStep / 2;
      sctx.save();
      sctx.translate(cx, cy);
      sctx.rotate(angle);
      sctx.translate(0, isTop ? -radius : radius);
      if (!isTop) sctx.rotate(Math.PI);
      sctx.fillText(text[i], 0, 0);
      sctx.restore();
    }
    sctx.restore();
  };

  drawCurvedText('PIRELLI', 185, -Math.PI * 0.35, Math.PI * 0.35, true);
  drawCurvedText(stripe.label, 185, -Math.PI * 0.32, Math.PI * 0.32, false);

  sctx.beginPath();
  sctx.arc(cx, cy, 140, 0, Math.PI * 2);
  sctx.fillStyle = '#1c1d21';
  sctx.fill();

  const sidewallTex = new THREE.CanvasTexture(sidewallCanvas);
  const sidewallMat = new THREE.MeshBasicMaterial({
    map: sidewallTex,
    transparent: true,
  });

  const res = { tireMat: tireRubberMat, sidewallMat, stripeColor: stripe.color };
  _tireMaterialCache.set(compKey, res);
  return res;
}

/**
 * Generates a procedural livery texture for a specific team with racing numbers,
 * sponsor decals, gradients, and distinct patterns
 * @param {Object} team - Team data from teams_db.js
 * @param {number} carNumber - Racing number 1-99
 * @returns {THREE.CanvasTexture}
 */
function generateProceduralLivery(team, carNumber) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const primary = team.primaryHex || '#' + team.primaryColor.toString(16).padStart(6, '0');
  const secondary = team.secondaryHex || '#ffffff';
  const accent = team.accentHex || '#1a1a1a';

  // 1. Base gradient coat
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
  baseGrad.addColorStop(0.0, primary);
  baseGrad.addColorStop(0.5, adjustBrightness(primary, -15));
  baseGrad.addColorStop(1.0, primary);
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // 2. Metallic flake
  for (let i = 0; i < 4000; i++) {
    const g = Math.random() * 255;
    ctx.fillStyle = `rgba(${g},${g},${g},0.04)`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
  }

  // 3. Team-specific pattern generation
  drawTeamPattern(ctx, team.id, primary, secondary, accent, carNumber);

  // 4. Common elements: Racing number pod
  drawNumberPod(ctx, carNumber, secondary, accent);

  // 5. Sponsor decals
  drawSponsorDecals(ctx, team.id, secondary, accent);

  // 6. Glossy lacquer highlight
  const gloss = ctx.createLinearGradient(0, 0, 0, 180);
  gloss.addColorStop(0.0, 'rgba(255,255,255,0.18)');
  gloss.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  gloss.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, 1024, 180);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

function adjustBrightness(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function drawTeamPattern(ctx, teamId, primary, secondary, accent, carNumber) {
  switch (teamId) {
    case 'ferrari':
      drawFerrariPattern(ctx, primary, secondary, accent);
      break;
    case 'redbull':
      drawRedBullPattern(ctx, primary, secondary, accent);
      break;
    case 'mercedes':
      drawMercedesPattern(ctx, primary, secondary, accent);
      break;
    case 'mclaren':
      drawMcLarenPattern(ctx, primary, secondary, accent);
      break;
    case 'astonmartin':
      drawAstonMartinPattern(ctx, primary, secondary, accent);
      break;
    case 'alpine':
      drawAlpinePattern(ctx, primary, secondary, accent);
      break;
    case 'williams':
      drawWilliamsPattern(ctx, primary, secondary, accent);
      break;
    case 'sauber':
      drawSauberPattern(ctx, primary, secondary, accent);
      break;
    case 'haas':
      drawHaasPattern(ctx, primary, secondary, accent);
      break;
    case 'rb':
      drawRBPattern(ctx, primary, secondary, accent);
      break;
    default:
      drawGenericPattern(ctx, primary, secondary, accent);
  }
}

function drawFerrariPattern(ctx, primary, secondary, accent) {
  // Classic Ferrari: white accent pinstripe along spine
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.moveTo(0, 210);
  ctx.lineTo(1024, 170);
  ctx.lineTo(1024, 332);
  ctx.lineTo(0, 292);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.fillRect(0, 200, 1024, 10);
  ctx.fillRect(0, 292, 1024, 10);
}

function drawRedBullPattern(ctx, primary, secondary, accent) {
  // Flowing red/blue wave signature
  const navy = '#0b1a3a';
  const cobalt = '#1e4fd8';
  const brightBlue = '#2860ff';
  const redBull = '#dc1a22';
  const yellow = '#ffd400';

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 200);
  ctx.bezierCurveTo(180, 120, 360, 280, 560, 220);
  ctx.bezierCurveTo(760, 160, 900, 290, 1024, 230);
  ctx.lineTo(1024, 360);
  ctx.bezierCurveTo(880, 420, 720, 320, 520, 380);
  ctx.bezierCurveTo(320, 440, 180, 360, 0, 410);
  ctx.closePath();

  const blueWave = ctx.createLinearGradient(0, 180, 0, 430);
  blueWave.addColorStop(0.0, brightBlue);
  blueWave.addColorStop(0.5, cobalt);
  blueWave.addColorStop(1.0, navy);
  ctx.fillStyle = blueWave;
  ctx.fill();

  ctx.strokeStyle = '#9b0d12';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 410);
  ctx.bezierCurveTo(200, 440, 420, 360, 620, 400);
  ctx.bezierCurveTo(820, 440, 920, 380, 1024, 410);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 246);
  ctx.bezierCurveTo(220, 232, 420, 268, 620, 252);
  ctx.bezierCurveTo(820, 236, 920, 260, 1024, 248);
  ctx.lineTo(1024, 264);
  ctx.bezierCurveTo(900, 280, 760, 252, 560, 268);
  ctx.bezierCurveTo(360, 284, 200, 256, 0, 268);
  ctx.closePath();
  const redStripe = ctx.createLinearGradient(0, 240, 1024, 270);
  redStripe.addColorStop(0.0, '#9b0d12');
  redStripe.addColorStop(0.5, redBull);
  redStripe.addColorStop(1.0, '#9b0d12');
  ctx.fillStyle = redStripe;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(120, 170);
  ctx.bezierCurveTo(260, 200, 380, 120, 520, 150);
  ctx.bezierCurveTo(680, 280, 820, 170, 960, 200);
  ctx.lineTo(960, 212);
  ctx.bezierCurveTo(820, 192, 680, 298, 520, 168);
  ctx.bezierCurveTo(380, 142, 260, 214, 120, 184);
  ctx.closePath();
  ctx.fillStyle = redBull;
  ctx.fill();
  ctx.restore();

  const noseGrad = ctx.createLinearGradient(780, 0, 1024, 0);
  noseGrad.addColorStop(0.0, 'rgba(255,212,0,0.0)');
  noseGrad.addColorStop(0.25, yellow);
  noseGrad.addColorStop(1.0, yellow);
  ctx.fillStyle = noseGrad;
  ctx.beginPath();
  ctx.moveTo(780, 180);
  ctx.lineTo(1024, 160);
  ctx.lineTo(1024, 360);
  ctx.lineTo(780, 340);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = yellow;
  ctx.fillRect(960, 200, 80, 120);
  ctx.fillStyle = '#b89000';
  ctx.fillRect(960, 320, 80, 6);
  ctx.fillRect(960, 200, 80, 6);
}

function drawMercedesPattern(ctx, primary, secondary, accent) {
  // Premium fictional F1 design: Metallic silver body with carbon black accents and electric teal highlights
  // Base silver with subtle metallic flake
  const silverGrad = ctx.createLinearGradient(0, 0, 0, 512);
  silverGrad.addColorStop(0.0, '#c8ccd0');
  silverGrad.addColorStop(0.3, '#b8bcc0');
  silverGrad.addColorStop(0.5, '#a8acb0');
  silverGrad.addColorStop(0.7, '#b8bcc0');
  silverGrad.addColorStop(1.0, '#c8ccd0');
  ctx.fillStyle = silverGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Metallic flake
  for (let i = 0; i < 5000; i++) {
    const g = 180 + Math.random() * 75;
    ctx.fillStyle = `rgba(${g},${g},${g + 10},0.06)`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
  }

  // Carbon fiber black lower body / sidepod undertray
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 360, 1024, 152);

  // Carbon weave pattern on lower section
  ctx.save();
  ctx.globalAlpha = 0.4;
  const tileSize = 8;
  for (let y = 360; y < 512; y += tileSize) {
    for (let x = 0; x < 1024; x += tileSize) {
      const isDiagonal = ((x / tileSize) + (y / tileSize)) % 2 === 0;
      ctx.fillStyle = isDiagonal ? '#1a1f25' : '#080b0e';
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }
  ctx.restore();

  // Electric teal/cyan aerodynamic pinstripes along spine
  const tealGrad = ctx.createLinearGradient(0, 180, 1024, 332);
  tealGrad.addColorStop(0.0, '#00f0ff');
  tealGrad.addColorStop(0.5, '#00d4e0');
  tealGrad.addColorStop(1.0, '#00b8c4');
  ctx.fillStyle = tealGrad;
  ctx.fillRect(0, 180, 1024, 3);
  ctx.fillRect(0, 332, 1024, 3);

  // Secondary thin carbon pinstripe
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 183, 1024, 2);
  ctx.fillRect(0, 329, 1024, 2);

  // Geometric futuristic pattern on engine cover (center area)
  ctx.save();
  ctx.translate(512, 256);
  const accentGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
  accentGrad.addColorStop(0.0, 'rgba(0,240,255,0.15)');
  accentGrad.addColorStop(0.5, 'rgba(0,240,255,0.05)');
  accentGrad.addColorStop(1.0, 'rgba(0,240,255,0.0)');
  ctx.fillStyle = accentGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 220, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Angular geometric accents - front section
  ctx.fillStyle = '#00f0ff';
  ctx.globalAlpha = 0.7;
  // Front left geometric element
  ctx.beginPath();
  ctx.moveTo(100, 200);
  ctx.lineTo(180, 180);
  ctx.lineTo(200, 220);
  ctx.lineTo(120, 240);
  ctx.closePath();
  ctx.fill();
  // Front right geometric element
  ctx.beginPath();
  ctx.moveTo(824, 200);
  ctx.lineTo(904, 180);
  ctx.lineTo(924, 220);
  ctx.lineTo(844, 240);
  ctx.closePath();
  ctx.fill();
  // Rear left geometric element
  ctx.beginPath();
  ctx.moveTo(100, 292);
  ctx.lineTo(180, 272);
  ctx.lineTo(200, 312);
  ctx.lineTo(120, 332);
  ctx.closePath();
  ctx.fill();
  // Rear right geometric element
  ctx.beginPath();
  ctx.moveTo(824, 292);
  ctx.lineTo(904, 272);
  ctx.lineTo(924, 312);
  ctx.lineTo(844, 332);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Aerodynamic vortex generator stripes on sidepods (carbon black with teal edge)
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(180, 210, 60, 4);
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(180, 210, 60, 1);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(784, 210, 60, 4);
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(784, 210, 60, 1);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(180, 302, 60, 4);
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(180, 302, 60, 1);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(784, 302, 60, 4);
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(784, 302, 60, 1);

  // Nose tip electric teal accent
  ctx.fillStyle = '#00f0ff';
  ctx.beginPath();
  ctx.moveTo(980, 220);
  ctx.lineTo(1024, 200);
  ctx.lineTo(1024, 312);
  ctx.lineTo(980, 292);
  ctx.closePath();
  ctx.fill();

  // Glossy lacquer highlight on upper surfaces
  const gloss = ctx.createLinearGradient(0, 0, 0, 180);
  gloss.addColorStop(0.0, 'rgba(255,255,255,0.22)');
  gloss.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  gloss.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, 1024, 180);
}

function drawMcLarenPattern(ctx, primary, secondary, accent) {
  // Papaya with cyan accents
  ctx.fillStyle = '#00d2be';
  ctx.beginPath();
  ctx.moveTo(0, 200);
  ctx.lineTo(300, 200);
  ctx.lineTo(200, 300);
  ctx.lineTo(0, 300);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.fillRect(0, 190, 1024, 10);
  ctx.fillRect(0, 320, 1024, 10);

  // Speedmark logo
  ctx.fillStyle = '#00d2be';
  ctx.font = '900 80px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('McLAREN', 512, 260);
}

function drawAstonMartinPattern(ctx, primary, secondary, accent) {
  // British Racing Green with lime accents
  ctx.fillStyle = '#cedc00';
  ctx.fillRect(0, 180, 1024, 8);
  ctx.fillRect(0, 332, 1024, 8);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 188, 1024, 6);
  ctx.fillRect(0, 326, 1024, 6);

  // Union jack accent on nose
  ctx.fillStyle = '#00594f';
  ctx.fillRect(900, 180, 124, 100);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(910, 190, 104, 80);
}

function drawAlpinePattern(ctx, primary, secondary, accent) {
  // French Blue with pink accents
  ctx.fillStyle = '#fd4bc7';
  ctx.beginPath();
  ctx.moveTo(0, 210);
  ctx.lineTo(1024, 170);
  ctx.lineTo(1024, 190);
  ctx.lineTo(0, 230);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.fillRect(0, 200, 1024, 10);
  ctx.fillRect(0, 300, 1024, 10);
}

function drawWilliamsPattern(ctx, primary, secondary, accent) {
  // Navy with cyan accents
  ctx.fillStyle = '#00d2be';
  ctx.fillRect(0, 180, 1024, 6);
  ctx.fillRect(0, 332, 1024, 6);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 186, 1024, 14);
  ctx.fillRect(0, 320, 1024, 14);
}

function drawSauberPattern(ctx, primary, secondary, accent) {
  // Neon Green with black
  ctx.fillStyle = '#00e700';
  ctx.fillRect(0, 180, 1024, 8);
  ctx.fillRect(0, 332, 1024, 8);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 188, 1024, 4);
  ctx.fillRect(0, 328, 1024, 4);
}

function drawHaasPattern(ctx, primary, secondary, accent) {
  // Red with white/black pinstripes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 180, 1024, 6);
  ctx.fillRect(0, 332, 1024, 6);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 186, 1024, 4);
  ctx.fillRect(0, 328, 1024, 4);
}

function drawRBPattern(ctx, primary, secondary, accent) {
  // Dark blue with red/white
  ctx.fillStyle = '#d81e05';
  ctx.fillRect(0, 180, 1024, 6);
  ctx.fillRect(0, 332, 1024, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 186, 1024, 3);
  ctx.fillRect(0, 329, 1024, 3);
}

function drawGenericPattern(ctx, primary, secondary, accent) {
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.moveTo(0, 220);
  ctx.lineTo(1024, 180);
  ctx.lineTo(1024, 332);
  ctx.lineTo(0, 292);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(0, 210, 1024, 10);
  ctx.fillRect(0, 292, 1024, 10);
}

function drawNumberPod(ctx, carNumber, secondary, accent) {
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.arc(880, 256, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = accent;
  ctx.stroke();

  ctx.fillStyle = '#0a0a0a';
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(carNumber.toString(), 880, 258);
}

function drawSponsorDecals(ctx, teamId, secondary, accent) {
  // PIRELLI
  ctx.fillStyle = '#ffd000';
  ctx.font = '900 34px sans-serif';
  ctx.fillText('IRELLI', 560, 140);
  ctx.fillText('IRELLI', 560, 372);
  ctx.fillStyle = '#e10600';
  ctx.fillText('P', 485, 140);
  ctx.fillText('P', 485, 372);

  // Mobil 1
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Mobil 1', 340, 140);
  ctx.fillText('Mobil 1', 340, 372);

  // Engine cover branding
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '900 italic 38px sans-serif';
  ctx.fillText('GRAND PRIX', 200, 256);
}

/**
 * Loads and caches a .glb model from the given URL.
 * Returns a Promise<THREE.Group> with the loaded scene cloned.
 * If the file is missing or fails to load, the promise rejects.
 */
async function loadGltfModelAsync(url) {
  if (_gltfCache.has(url)) {
    return _gltfCache.get(url).clone(true);
  }
  const loader = await import('three/addons/loaders/GLTFLoader.js');
  const GLTFLoader = loader.GLTFLoader;
  const gltfLoader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const root = gltf.scene || gltf.scenes[0];
        _gltfCache.set(url, root);
        resolve(root.clone(true));
      },
      undefined,
      (err) => reject(err)
    );
  });
}

/**
 * Procedural Composite 3D Formula 1 Car
 * Creates an aerodynamic F1 car with monocoque chassis, halo, wings,
 * steerable wheels, rotating tires, brake calipers, and dynamic smoke particles.
 * If the team is Red Bull and assets/models/redbull.glb exists, the body is
 * replaced by the GLB (wings, halo, sidepods, nose, etc.) while wheels,
 * physics, AI, steering and multiplayer all remain driven by the original code.
 */
export class F1Car {
  constructor(scene, isPlayer = true, optionsOrColor = 0xe10600) {
    this.scene = scene;
    this.isPlayer = isPlayer;

    if (typeof optionsOrColor === 'number') {
      this.primaryColor = optionsOrColor;
      this.options = { primaryColor: optionsOrColor };
    } else if (optionsOrColor && typeof optionsOrColor === 'object') {
      this.options = optionsOrColor;
      this.primaryColor = optionsOrColor.primaryColor !== undefined ? optionsOrColor.primaryColor : (isPlayer ? 0xe10600 : 0x0058b8);
    } else {
      this.options = {};
      this.primaryColor = isPlayer ? 0xe10600 : 0x0058b8;
    }

    this.carNumber = this.options.carNumber || (this.isPlayer ? '16' : '1');
    this.secondaryHex = this.options.secondaryHex || (this.isPlayer ? '#ffffff' : '#ffd000');
    this.accentHex = this.options.accentHex || (this.isPlayer ? '#1a1a1a' : '#0a101d');
    this.accentColor = this.options.accentColor !== undefined ? this.options.accentColor : (this.isPlayer ? 0xffffff : 0x00f0ff);
    this.driverName = this.options.driverName || (this.isPlayer ? 'PLAYER' : 'AI DRIVER');
    this.teamName = this.options.teamName || (this.isPlayer ? 'Scuderia Player' : 'Grand Prix Racing');

    // Root group placed into the Three.js scene
    this.group = new THREE.Group();
    // Inner mesh group to allow aerodynamic body pitch and roll
    this.visualBody = new THREE.Group();
    this.group.add(this.visualBody);
    // Wheels group attached directly to root group to keep tires planted on the asphalt
    this.wheelsGroup = new THREE.Group();
    this.group.add(this.wheelsGroup);

    // Wing meshes for damage system
    this.frontWingMesh = null;
    this.leftFrontEndplate = null;
    this.rightFrontEndplate = null;
    this.rearWingMesh = null;
    this.leftRearEndplate = null;
    this.rightRearEndplate = null;
    this.diffuserMesh = null;

    // Wheel nodes
    this.wheelMeshes = {
      fl: null,
      fr: null,
      rl: null,
      rr: null
    };

    this.frontWheelHolders = {
      fl: null,
      fr: null
    };

    this.rainLight = null;
    this.smokeParticles = [];
    this.sparkParticles = [];
    this._proceduralBodyMeshes = [];
    this._glbRoot = null;
    this._glbSwapRequestId = 0;

    this.wheelRotation = 0;
    this.currentSteerAngle = 0;
    this.currentRoll = 0;
    this.currentPitch = 0;

    // Phase 6: Damage & wear state
    this.damage = {
      frontWingDamage: 0,        // 0 = intact, 1 = fully detached
      rearWingDamage: 0,
      steeringDragMultiplier: 1.0,
      topSpeedMultiplier: 1.0,
      lastImpactTime: 0
    };
    this.tireCompound = this.options.tireCompound || 'MEDIUM';
    this.teamId = this.options.teamId || this.options.id || null;

    this.buildCar();
    this.initSmokeParticles();
    this.initSparkParticles();
    this.scene.add(this.group);
  }

  buildCar() {
    this.buildVisualBody();
    this.buildWheels();
  }

  updateLivery(teamOptions) {
    if (!teamOptions) return;
    if (teamOptions.primaryColor !== undefined) this.primaryColor = teamOptions.primaryColor;
    if (teamOptions.secondaryHex) this.secondaryHex = teamOptions.secondaryHex;
    if (teamOptions.accentHex) this.accentHex = teamOptions.accentHex;
    if (teamOptions.accentColor !== undefined) this.accentColor = teamOptions.accentColor;
    if (teamOptions.driverNumber || teamOptions.carNumber) this.carNumber = teamOptions.driverNumber || teamOptions.carNumber;
    if (teamOptions.name || teamOptions.teamName) this.teamName = teamOptions.name || teamOptions.teamName;
    if (teamOptions.driverName) this.driverName = teamOptions.driverName;
    if (teamOptions.haloColor !== undefined) this.haloColor = teamOptions.haloColor;
    if (teamOptions.teamId || teamOptions.id) this.teamId = teamOptions.teamId || teamOptions.id;

    // Safely remove and dispose all previous visual body meshes
    this._clearGlbBody();
    while (this.visualBody.children.length > 0) {
      const child = this.visualBody.children[0];
      this.visualBody.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    // Increment request ID to invalidate any pending GLB load from previous livery
    this._glbSwapRequestId++;

    this.buildVisualBody();
  }

  buildVisualBody() {
    // 1. Get team data for procedural livery
    const teamData = this.teamId ? getTeamById(this.teamId) : null;
    const primaryHex = '#' + this.primaryColor.toString(16).padStart(6, '0');
    const secondaryHex = this.secondaryHex;
    const accentHex = this.accentHex;
    const carNumber = this.carNumber;

    // Red Bull uses dedicated flowing navy/red/yellow livery suite
    const isRedBull = (this.teamName && this.teamName.toLowerCase().includes('red bull')) ||
                      (this.teamId === 'redbull') ||
                      (primaryHex === '#03102c' || primaryHex === '#0b1a3a');

    // Mercedes uses dedicated premium silver/black/teal livery suite
    const isMercedes = (this.teamName && this.teamName.toLowerCase().includes('mercedes')) ||
                       (this.teamId === 'mercedes') ||
                       (primaryHex === '#b8bcc0');

    // Ferrari slot uses dedicated custom F1 model & livery (Scuderia Novara)
    const isFerrari = (this.teamId === 'ferrari') ||
                      (this.teamName && (this.teamName.toLowerCase().includes('ferrari') || this.teamName.toLowerCase().includes('novara')));

    this._isRedBull = isRedBull;
    this._isMercedes = isMercedes;
    this._isFerrari = isFerrari;
    this._proceduralBodyMeshes = [];

    // Generate comprehensive team livery suite
    const teamPayload = teamData
      ? { ...teamData, id: teamData.id || teamData.teamId, teamId: teamData.teamId || teamData.id }
      : (this.teamId || (isRedBull ? 'redbull' : null));
    const liverySuite = TextureFactory.getTeamLiverySuite(teamPayload, carNumber);

    // 2. PBR MATERIALS
    // Chassis: Clearcoat carbon-fiber finish
    const bodyMat = createClearcoatCarbonMaterial(this.primaryColor, liverySuite.bodyTex);
    const noseMat = createClearcoatCarbonMaterial(this.primaryColor, liverySuite.noseTex);
    const sidepodLeftMat = createClearcoatCarbonMaterial(this.primaryColor, liverySuite.sidepodLeftTex);
    const sidepodRightMat = createClearcoatCarbonMaterial(this.primaryColor, liverySuite.sidepodRightTex);
    const drsMat = createClearcoatCarbonMaterial(this.primaryColor, liverySuite.drsTex);
    const finMat = createClearcoatCarbonMaterial(this.primaryColor, liverySuite.finTex);

    // Aero elements: Matte checkered carbon-fiber
    const matteCarbonMat = createMatteCarbonMaterial();

    // Accent color material (for endplates, DRS flap)
    const accentMat = new THREE.MeshPhysicalMaterial({
      color: this.accentColor,
      roughness: 0.20,
      metalness: 0.85,
      clearcoat: 0.5,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.0,
    });

    // Halo material
    const haloMat = new THREE.MeshPhysicalMaterial({
      map: TextureFactory.createCarbonFiberTexture(256, 256),
      color: isRedBull ? 0x03102c : (this.haloColor !== undefined ? this.haloColor : 0x2a2a2a),
      roughness: 0.35,
      metalness: 0.85,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
    });

    // Intake matte black
    const intakeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

    // 1. NOSECONE & MAIN CHASSIS
    // Nosecone (tapered wedge with authentic front number & nose graphics)
    const noseGeo = new THREE.ConeGeometry(0.38, 2.0, 5);
    noseGeo.rotateX(Math.PI / 2);
    noseGeo.scale(1.2, 0.45, 1.0);
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.position.set(0, 0.25, 1.6);
    noseMesh.castShadow = true;
    this.visualBody.add(noseMesh);

    // Front Nose Tip (yellow camera pod for Red Bull, carbon for others)
    const noseTipGeo = new THREE.BoxGeometry(0.2, 0.1, 0.3);
    const noseTipMat = isRedBull
      ? new THREE.MeshPhysicalMaterial({ color: 0xffd400, roughness: 0.2, metalness: 0.1, clearcoat: 1.0 })
      : matteCarbonMat;
    const noseTipMesh = new THREE.Mesh(noseTipGeo, noseTipMat);
    noseTipMesh.position.set(0, 0.22, 2.65);
    this.visualBody.add(noseTipMesh);

    // Main Cockpit Monocoque Tub
    const tubGeo = new THREE.BoxGeometry(0.82, 0.42, 1.8);
    const tubMesh = new THREE.Mesh(tubGeo, bodyMat);
    tubMesh.position.set(0, 0.32, 0.3);
    tubMesh.castShadow = true;
    this.visualBody.add(tubMesh);

    // Sidepods (Left & Right aerodynamic cooling pods with dedicated outward-facing livery)
    const sidepodGeo = new THREE.BoxGeometry(0.42, 0.38, 1.6);
    // Left sidepod: material index 1 is -X (outer left face)
    const leftSidepod = new THREE.Mesh(sidepodGeo, [bodyMat, sidepodLeftMat, bodyMat, matteCarbonMat, intakeMat, bodyMat]);
    leftSidepod.position.set(-0.52, 0.28, 0.1);
    leftSidepod.castShadow = true;
    this.visualBody.add(leftSidepod);

    // Right sidepod: material index 0 is +X (outer right face)
    const rightSidepod = new THREE.Mesh(sidepodGeo, [sidepodRightMat, bodyMat, bodyMat, matteCarbonMat, intakeMat, bodyMat]);
    rightSidepod.position.set(0.52, 0.28, 0.1);
    rightSidepod.castShadow = true;
    this.visualBody.add(rightSidepod);

    // Sidepod air intakes (black openings)
    const intakeGeo = new THREE.BoxGeometry(0.32, 0.24, 0.08);
    const leftIntake = new THREE.Mesh(intakeGeo, intakeMat);
    leftIntake.position.set(-0.52, 0.28, 0.91);
    this.visualBody.add(leftIntake);

    const rightIntake = new THREE.Mesh(intakeGeo, intakeMat);
    rightIntake.position.set(0.52, 0.28, 0.91);
    this.visualBody.add(rightIntake);

    // Engine Cover Cowl & Overhead Airbox Scoop
    const airboxGeo = new THREE.BoxGeometry(0.36, 0.38, 1.4);
    const airboxMesh = new THREE.Mesh(airboxGeo, bodyMat);
    airboxMesh.position.set(0, 0.58, -0.4);
    airboxMesh.castShadow = true;
    this.visualBody.add(airboxMesh);

    // Airbox intake hole above driver helmet
    const airboxHoleGeo = new THREE.CircleGeometry(0.12, 12);
    airboxHoleGeo.rotateY(Math.PI);
    const airboxHole = new THREE.Mesh(airboxHoleGeo, intakeMat);
    airboxHole.position.set(0, 0.68, 0.36);
    this.visualBody.add(airboxHole);

    // Shark Fin (with team badge & bull graphic)
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0, 0.42);
    finShape.lineTo(1.1, 0.05);
    finShape.lineTo(1.1, 0);
    finShape.closePath();
    const extrudeSettings = { depth: 0.04, bevelEnabled: false };
    const finGeo = new THREE.ExtrudeGeometry(finShape, extrudeSettings);
    finGeo.rotateY(Math.PI / 2);
    const finMesh = new THREE.Mesh(finGeo, finMat);
    finMesh.position.set(0.02, 0.58, -1.35);
    this.visualBody.add(finMesh);

    // Cockpit opening cutout
    const cockpitCutout = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.75), matteCarbonMat);
    cockpitCutout.position.set(0, 0.48, 0.45);
    this.visualBody.add(cockpitCutout);

    // Driver Helmet with team matching accent color
    const helmetGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const helmetMat = new THREE.MeshPhysicalMaterial({
      color: isRedBull ? 0x03102c : (this.accentColor || (this.isPlayer ? 0xffe600 : 0x00f0ff)),
      roughness: 0.2,
      metalness: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 0.52, 0.45);
    this.visualBody.add(helmet);

    // Helmet Visor
    const visorGeo = new THREE.BoxGeometry(0.18, 0.06, 0.12);
    const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9, clearcoat: 1.0 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.53, 0.56);
    this.visualBody.add(visor);

    // Titanium Halo
    const haloCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, 0.52, 0.25),
      new THREE.Vector3(-0.24, 0.65, 0.42),
      new THREE.Vector3(0, 0.67, 0.72),
      new THREE.Vector3(0.24, 0.65, 0.42),
      new THREE.Vector3(0.25, 0.52, 0.25)
    ]);
    const haloGeo = new THREE.TubeGeometry(haloCurve, 20, 0.035, 8, false);
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.visualBody.add(haloMesh);

    // Halo Central Pillar
    const pillarGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.24, 8);
    const haloPillar = new THREE.Mesh(pillarGeo, haloMat);
    haloPillar.position.set(0, 0.55, 0.72);
    this.visualBody.add(haloPillar);

    // 3. AERODYNAMIC WINGS (with damage references)
    // Front Wing Main Plane - matte carbon
    const frontWingGeo = new THREE.BoxGeometry(2.05, 0.04, 0.42);
    this.frontWingMesh = new THREE.Mesh(frontWingGeo, matteCarbonMat);
    this.frontWingMesh.position.set(0, 0.12, 2.35);
    this.frontWingMesh.castShadow = true;
    this.visualBody.add(this.frontWingMesh);

    // Front Wing Endplates
    const frontEndplateGeo = new THREE.BoxGeometry(0.04, 0.22, 0.52);
    this.leftFrontEndplate = new THREE.Mesh(frontEndplateGeo, accentMat);
    this.leftFrontEndplate.position.set(-1.02, 0.18, 2.35);
    this.leftFrontEndplate.userData.originalPosition = this.leftFrontEndplate.position.clone();
    this.leftFrontEndplate.userData.isEndplate = true;
    this.leftFrontEndplate.userData.side = 'left';
    this.visualBody.add(this.leftFrontEndplate);

    this.rightFrontEndplate = new THREE.Mesh(frontEndplateGeo, accentMat);
    this.rightFrontEndplate.position.set(1.02, 0.18, 2.35);
    this.rightFrontEndplate.userData.originalPosition = this.rightFrontEndplate.position.clone();
    this.rightFrontEndplate.userData.isEndplate = true;
    this.rightFrontEndplate.userData.side = 'right';
    this.visualBody.add(this.rightFrontEndplate);

    // Rear Wing Main Plane - matte carbon
    const rearWingGeo = new THREE.BoxGeometry(1.4, 0.04, 0.32);
    this.rearWingMesh = new THREE.Mesh(rearWingGeo, matteCarbonMat);
    this.rearWingMesh.position.set(0, 0.85, -1.8);
    this.rearWingMesh.castShadow = true;
    this.visualBody.add(this.rearWingMesh);

    // Rear Wing Upper DRS Flap (with high-res sponsor banner facing backwards towards chase cam and forward)
    const drsFlapGeo = new THREE.BoxGeometry(1.4, 0.03, 0.22);
    const drsFlapMat = [accentMat, accentMat, drsMat, matteCarbonMat, drsMat, drsMat];
    const drsFlap = new THREE.Mesh(drsFlapGeo, drsFlapMat);
    drsFlap.position.set(0, 0.94, -1.82);
    drsFlap.rotation.x = -0.15;
    this.visualBody.add(drsFlap);

    // Rear Wing Endplates
    const rearEndplateGeo = new THREE.BoxGeometry(0.04, 0.45, 0.55);
    this.leftRearEndplate = new THREE.Mesh(rearEndplateGeo, accentMat);
    this.leftRearEndplate.position.set(-0.7, 0.82, -1.8);
    this.leftRearEndplate.castShadow = true;
    this.leftRearEndplate.userData.originalPosition = this.leftRearEndplate.position.clone();
    this.leftRearEndplate.userData.isEndplate = true;
    this.leftRearEndplate.userData.side = 'left';
    this.visualBody.add(this.leftRearEndplate);

    this.rightRearEndplate = new THREE.Mesh(rearEndplateGeo, accentMat);
    this.rightRearEndplate.position.set(0.7, 0.82, -1.8);
    this.rightRearEndplate.castShadow = true;
    this.rightRearEndplate.userData.originalPosition = this.rightRearEndplate.position.clone();
    this.rightRearEndplate.userData.isEndplate = true;
    this.rightRearEndplate.userData.side = 'right';
    this.visualBody.add(this.rightRearEndplate);

    // Rear Wing Support Pillars
    const rearPillarGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6);
    const leftPillar = new THREE.Mesh(rearPillarGeo, matteCarbonMat);
    leftPillar.position.set(-0.2, 0.55, -1.75);
    leftPillar.rotation.x = -0.2;
    this.visualBody.add(leftPillar);

    const rightPillar = new THREE.Mesh(rearPillarGeo, matteCarbonMat);
    rightPillar.position.set(0.2, 0.55, -1.75);
    rightPillar.rotation.x = -0.2;
    this.visualBody.add(rightPillar);

    // Rear Diffuser - matte carbon
    const diffuserGeo = new THREE.BoxGeometry(1.1, 0.14, 0.38);
    this.diffuserMesh = new THREE.Mesh(diffuserGeo, matteCarbonMat);
    this.diffuserMesh.position.set(0, 0.16, -1.7);
    this.visualBody.add(this.diffuserMesh);

    // Blinking Rain LED
    const rainLightGeo = new THREE.BoxGeometry(0.12, 0.06, 0.04);
    const rainLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.rainLight = new THREE.Mesh(rainLightGeo, rainLightMat);
    this.rainLight.position.set(0, 0.16, -1.9);
    this.visualBody.add(this.rainLight);

    // Dedicated external GLB body loader
    // Custom F1 3D model for the Ferrari team slot ("SCUDERIA NOVARA")
    // Applied ONLY to the Ferrari team slot; other teams continue using their respective models.
    if (this._isFerrari) {
      this._scheduleGlbBodySwap(FERRARI_GLB_PATH);
    }

    // Only activated if an external model without duplicate wheels is supplied
    const ENABLE_EXTERNAL_GLB = false;
    if (this._isRedBull && ENABLE_EXTERNAL_GLB) {
      this._scheduleGlbBodySwap(RED_BULL_GLB_PATH);
    }
    if (this._isMercedes && ENABLE_EXTERNAL_GLB) {
      this._scheduleGlbBodySwap(MERCEDES_GLB_PATH);
    }
  }

  _clearGlbBody() {
    if (this._glbRoot) {
      if (this._glbRoot.parent) this._glbRoot.parent.remove(this._glbRoot);
      this._glbRoot.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      this._glbRoot = null;
    }
  }

  _scheduleGlbBodySwap(glbPath) {
    const requestId = ++this._glbSwapRequestId;
    loadGltfModelAsync(glbPath).then((gltfRoot) => {
      if (requestId !== this._glbSwapRequestId) {
        gltfRoot.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        return;
      }
      // Verify team still matches the GLB being loaded
      const isFerrariGlb = glbPath === FERRARI_GLB_PATH;
      const isRedBullGlb = glbPath === RED_BULL_GLB_PATH;
      const isMercedesGlb = glbPath === MERCEDES_GLB_PATH;
      if (isFerrariGlb && !this._isFerrari) {
        gltfRoot.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        return;
      }
      if (isRedBullGlb && !this._isRedBull) {
        gltfRoot.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        return;
      }
      if (isMercedesGlb && !this._isMercedes) {
        gltfRoot.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        return;
      }

      const isGlbWheelPart = (obj) => {
        let cur = obj;
        while (cur && cur !== gltfRoot) {
          const n = (cur.name || '').toLowerCase();
          if (HIDE_GLB_MESH_PREFIXES.some((p) => n.startsWith(p) || n.includes(p))) return true;
          cur = cur.parent;
        }
        return false;
      };

      gltfRoot.traverse((obj) => {
        if (obj.isMesh) {
          if (isGlbWheelPart(obj)) {
            obj.visible = false;
          } else {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        }
      });

      gltfRoot.rotation.y = BODY_ROTATION_Y;
      gltfRoot.position.y = BODY_OFFSET_Y;

      if (AUTO_SCALE_TO_PHYSICS) {
        const box = new THREE.Box3().setFromObject(gltfRoot);
        const size = new THREE.Vector3();
        box.getSize(size);
        const longest = Math.max(size.x, size.y, size.z) || 1;
        const targetAxis = Math.max(BODY_LENGTH_TARGET, size.x, size.y);
        gltfRoot.scale.setScalar(targetAxis / longest);
      } else {
        gltfRoot.scale.setScalar(BODY_SCALE);
      }

      this._clearGlbBody();
      this._glbRoot = gltfRoot;

      this.visualBody.traverse((obj) => {
        if (obj.isMesh && obj !== this.rainLight) {
          obj.visible = false;
        }
      });

      this.visualBody.add(gltfRoot);

      gltfRoot.traverse((obj) => {
        if (obj.isMesh && !isGlbWheelPart(obj)) {
          obj.visible = true;
        }
      });
    }).catch((err) => {
      if (requestId !== this._glbSwapRequestId) return;
      const teamName = glbPath === FERRARI_GLB_PATH ? 'Ferrari' : (glbPath === RED_BULL_GLB_PATH ? 'Red Bull' : 'Mercedes');
      console.warn(`[F1Car] ${teamName} GLB not loaded, using procedural body:`, err && err.message ? err.message : err);
    });
  }

  buildWheels() {
    const carbonTex = TextureFactory.createCarbonFiberTexture();
    const carbonMat = new THREE.MeshStandardMaterial({
      map: carbonTex,
      color: 0x222222,
      roughness: 0.45,
      metalness: 0.50
    });
    const brakeRotorTex = TextureFactory.createBrakeRotorTexture();
    const brakeRotorMat = new THREE.MeshStandardMaterial({
      map: brakeRotorTex,
      roughness: 0.35,
      metalness: 0.90,
      side: THREE.DoubleSide
    });

    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xd80018, // Brembo Racing Red
      roughness: 0.3,
      metalness: 0.7
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x222328,
      roughness: 0.25,
      metalness: 0.92
    });

    const tireRubberMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.80,
      metalness: 0.08
    });

    const sidewallTex = TextureFactory.createTireSidewallTexture(this.isPlayer ? '#e10600' : '#ffd000', 'P ZERO');
    const sidewallMat = new THREE.MeshBasicMaterial({
      map: sidewallTex,
      transparent: true
    });
    const createWheel = (radius, width, isRightSide = false) => {
      const wheelGroup = new THREE.Group();

      // Tire Tread (Cylinder oriented horizontally along X-axis)
      const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 28);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireRubberMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Pirelli P-Zero Textured Sidewall Disc (Outer Face)
      const sidewallGeo = new THREE.CircleGeometry(radius, 28);
      sidewallGeo.rotateY(Math.PI / 2);
      const outerSidewall = new THREE.Mesh(sidewallGeo, sidewallMat);
      outerSidewall.position.set(isRightSide ? (width / 2 + 0.003) : (-width / 2 - 0.003), 0, 0);
      if (!isRightSide) outerSidewall.rotation.y = Math.PI; // Face outwards
      wheelGroup.add(outerSidewall);

      // Inner Sidewall Disc
      const innerSidewall = new THREE.Mesh(sidewallGeo, sidewallMat);
      innerSidewall.position.set(isRightSide ? (-width / 2 - 0.003) : (width / 2 + 0.003), 0, 0);
      if (isRightSide) innerSidewall.rotation.y = Math.PI;
      wheelGroup.add(innerSidewall);

      // Central Rim Hub
      const rimGeo = new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width * 0.96, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheelGroup.add(rim);

      // Rim spokes (10-spoke lightweight alloy)
      for (let s = 0; s < 5; s++) {
        const spokeGeo = new THREE.BoxGeometry(0.04, radius * 1.1, 0.02);
        const spoke = new THREE.Mesh(spokeGeo, rimMat);
        spoke.rotation.x = (s * Math.PI) / 2.5;
        wheelGroup.add(spoke);
      }

      // Ventilated Carbon/Steel Brake Disc Rotor (mounted inside wheel barrel)
      const rotorGeo = new THREE.CircleGeometry(radius * 0.52, 20);
      rotorGeo.rotateY(Math.PI / 2);
      const rotor = new THREE.Mesh(rotorGeo, brakeRotorMat);
      rotor.position.set(isRightSide ? -width * 0.2 : width * 0.2, 0, 0);
      wheelGroup.add(rotor);

      // Brembo Racing Red Brake Caliper
      const caliperGeo = new THREE.BoxGeometry(0.06, radius * 0.32, radius * 0.22);
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(isRightSide ? -width * 0.22 : width * 0.22, radius * 0.35, 0);
      wheelGroup.add(caliper);

      return wheelGroup;
    };

    // Front wheels (steerable)
    const frontRadius = 0.33;
    const frontWidth = 0.32;
    const frontTrackWidth = 0.92;
    const frontAxleZ = 1.45;

    // FL
    this.frontWheelHolders.fl = new THREE.Group();
    this.frontWheelHolders.fl.position.set(-frontTrackWidth, frontRadius, frontAxleZ);
    this.wheelMeshes.fl = createWheel(frontRadius, frontWidth, false);
    this.frontWheelHolders.fl.add(this.wheelMeshes.fl);
    this.wheelsGroup.add(this.frontWheelHolders.fl);

    // FR
    this.frontWheelHolders.fr = new THREE.Group();
    this.frontWheelHolders.fr.position.set(frontTrackWidth, frontRadius, frontAxleZ);
    this.wheelMeshes.fr = createWheel(frontRadius, frontWidth, true);
    this.frontWheelHolders.fr.add(this.wheelMeshes.fr);
    this.wheelsGroup.add(this.frontWheelHolders.fr);

    // Rear wheels
    const rearRadius = 0.35;
    const rearWidth = 0.42;
    const rearTrackWidth = 0.94;
    const rearAxleZ = -1.35;

    // RL
    this.wheelMeshes.rl = createWheel(rearRadius, rearWidth, false);
    this.wheelMeshes.rl.position.set(-rearTrackWidth, rearRadius, rearAxleZ);
    this.wheelsGroup.add(this.wheelMeshes.rl);

    // RR
    this.wheelMeshes.rr = createWheel(rearRadius, rearWidth, true);
    this.wheelMeshes.rr.position.set(rearTrackWidth, rearRadius, rearAxleZ);
    this.wheelsGroup.add(this.wheelMeshes.rr);

    // Carbon fiber suspension wishbones
    const addWishbone = (from, to) => {
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      const boneGeo = new THREE.CylinderGeometry(0.015, 0.015, len, 6);
      const bone = new THREE.Mesh(boneGeo, carbonMat);
      bone.position.copy(from).addScaledVector(dir, 0.5);
      bone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      this.wheelsGroup.add(bone);
    };

    // Front suspension
    addWishbone(new THREE.Vector3(-0.35, 0.3, frontAxleZ), new THREE.Vector3(-frontTrackWidth + 0.1, frontRadius, frontAxleZ));
    addWishbone(new THREE.Vector3(0.35, 0.3, frontAxleZ), new THREE.Vector3(frontTrackWidth - 0.1, frontRadius, frontAxleZ));

    // Rear suspension
    addWishbone(new THREE.Vector3(-0.35, 0.35, rearAxleZ), new THREE.Vector3(-rearTrackWidth + 0.1, rearRadius, rearAxleZ));
    addWishbone(new THREE.Vector3(0.35, 0.35, rearAxleZ), new THREE.Vector3(rearTrackWidth - 0.1, rearRadius, rearAxleZ));
  }

  initSmokeParticles() {
    // Tire smoke particle pool
    const particleCount = 60;
    const pGeo = new THREE.PlaneGeometry(0.6, 0.6);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });

    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(pGeo, pMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.smokeParticles.push({
        mesh,
        life: 0,
        maxLife: 1.0,
        vel: new THREE.Vector3()
      });
    }
  }

  initSparkParticles() {
    // Spark particle pool for underfloor bottoming out
    const particleCount = 80;
    const pGeo = new THREE.PlaneGeometry(0.08, 0.3);
    const colors = [0xffcc00, 0xff8800, 0xff4400, 0xffffaa];

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const pMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparkParticles.push({
        mesh,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        vel: new THREE.Vector3(),
        gravity: -18 - Math.random() * 8,
      });
    }
  }

  emitSparks(worldPos, speedMps, count = 5) {
    if (speedMps < 25) return;
    for (let i = 0; i < count; i++) {
      const p = this.sparkParticles.find(sp => sp.life <= 0);
      if (!p) continue;

      p.life = 0.001;
      p.maxLife = 0.3 + Math.random() * 0.25;
      p.mesh.position.copy(worldPos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        0.05,
        (Math.random() - 0.5) * 0.2
      ));
      p.mesh.rotation.z = Math.random() * Math.PI * 2;
      p.mesh.scale.setScalar(0.6 + Math.random() * 0.6);
      p.mesh.material.opacity = 1.0;
      p.mesh.visible = true;
      // Sparks shoot backwards and slightly up with gravity
      const backwardSpeed = speedMps * 0.3 + 5 + Math.random() * 8;
      p.vel.set(
        (Math.random() - 0.5) * 4,
        3 + Math.random() * 5,
        backwardSpeed
      );
      p.gravity = -18 - Math.random() * 10;
    }
  }

  /**
   * Apply visual damage to front wing endplates
   * @param {number} severity - 0 to 1, where 1 = fully detached
   */
  applyFrontWingDamage(severity) {
    this.damage.frontWingDamage = Math.min(1, this.damage.frontWingDamage + severity);
    const d = this.damage.frontWingDamage;

    if (this.leftFrontEndplate && this.rightFrontEndplate) {
      // Tilt endplates upward and outward based on damage
      const tiltAngle = d * Math.PI * 0.35; // up to ~63 degrees
      const outwardShift = d * 0.4;
      const upwardShift = d * 0.3;

      this.leftFrontEndplate.rotation.x = tiltAngle;
      this.leftFrontEndplate.position.z = this.leftFrontEndplate.userData.originalPosition.z + outwardShift;
      this.leftFrontEndplate.position.y = this.leftFrontEndplate.userData.originalPosition.y + upwardShift;

      this.rightFrontEndplate.rotation.x = -tiltAngle;
      this.rightFrontEndplate.position.z = this.rightFrontEndplate.userData.originalPosition.z + outwardShift;
      this.rightFrontEndplate.position.y = this.rightRearEndplate.userData.originalPosition.y + upwardShift;
    }

    // Increase steering drag and reduce top speed
    this.damage.steeringDragMultiplier = 1.0 + this.damage.frontWingDamage * 0.15;
    this.damage.topSpeedMultiplier = 1.0 - this.damage.frontWingDamage * 0.10;
  }

  /**
   * Apply visual damage to rear wing
   * @param {number} severity - 0 to 1
   */
  applyRearWingDamage(severity) {
    this.damage.rearWingDamage = Math.min(1, this.damage.rearWingDamage + severity);
    const d = this.damage.rearWingDamage;

    if (this.leftRearEndplate && this.rightRearEndplate) {
      const tiltAngle = d * Math.PI * 0.25;
      const backwardShift = d * 0.3;

      this.leftRearEndplate.rotation.x = -tiltAngle;
      this.leftRearEndplate.position.z = this.leftRearEndplate.userData.originalPosition.z - backwardShift;

      this.rightRearEndplate.rotation.x = tiltAngle;
      this.rightRearEndplate.position.z = this.rightRearEndplate.userData.originalPosition.z - backwardShift;
    }
  }

  /**
   * Repair damage (called when crossing repair checkpoint or completing lap)
   */
  repairDamage() {
    this.damage.frontWingDamage = 0;
    this.damage.rearWingDamage = 0;
    this.damage.steeringDragMultiplier = 1.0;
    this.damage.topSpeedMultiplier = 1.0;

    // Reset endplate positions
    if (this.leftFrontEndplate) {
      this.leftFrontEndplate.rotation.x = 0;
      this.leftFrontEndplate.position.copy(this.leftFrontEndplate.userData.originalPosition);
    }
    if (this.rightFrontEndplate) {
      this.rightFrontEndplate.rotation.x = 0;
      this.rightFrontEndplate.position.copy(this.rightFrontEndplate.userData.originalPosition);
    }
    if (this.leftRearEndplate) {
      this.leftRearEndplate.rotation.x = 0;
      this.leftRearEndplate.position.copy(this.leftRearEndplate.userData.originalPosition);
    }
    if (this.rightRearEndplate) {
      this.rightRearEndplate.rotation.x = 0;
      this.rightRearEndplate.position.copy(this.rightRearEndplate.userData.originalPosition);
    }
  }

  emitSmoke(wheelPos, lateralSlip) {
    if (lateralSlip < 0.25) return;
    const p = this.smokeParticles.find(sp => sp.life <= 0);
    if (!p) return;

    p.life = 0.01;
    p.maxLife = 0.5 + Math.random() * 0.4;
    p.mesh.position.copy(wheelPos).add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      0.15,
      (Math.random() - 0.5) * 0.3
    ));
    p.mesh.scale.setScalar(0.4 + Math.random() * 0.3);
    p.mesh.material.opacity = Math.min(0.65, lateralSlip * 0.7);
    p.mesh.visible = true;
    p.vel.set((Math.random() - 0.5) * 1.5, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.5);
  }

  /**
   * Update visual dynamics (steering, wheel spin, body roll/pitch, particles, damage)
   */
  update(dt, speedMps, steerInput, lateralSlip, accelInput, brakeInput, isBottomingOut = false) {
    // 1. Wheel spin rotation based on distance travelled
    const wheelCircumference = 2 * Math.PI * 0.34;
    const dAngle = (speedMps * dt) / wheelCircumference;
    this.wheelRotation += dAngle;

    // Rotate all 4 wheels around X axis
    if (this.wheelMeshes.fl) this.wheelMeshes.fl.rotation.x = this.wheelRotation;
    if (this.wheelMeshes.fr) this.wheelMeshes.fr.rotation.x = this.wheelRotation;
    if (this.wheelMeshes.rl) this.wheelMeshes.rl.rotation.x = this.wheelRotation;
    if (this.wheelMeshes.rr) this.wheelMeshes.rr.rotation.x = this.wheelRotation;

    // 2. Steer front wheels smoothly (positive steerInput = turn left)
    const targetSteer = steerInput * 0.40; // max ~23 degrees
    this.currentSteerAngle += (targetSteer - this.currentSteerAngle) * Math.min(1, dt * 18);
    if (this.frontWheelHolders.fl) this.frontWheelHolders.fl.rotation.y = this.currentSteerAngle;
    if (this.frontWheelHolders.fr) this.frontWheelHolders.fr.rotation.y = this.currentSteerAngle;

    // 3. Subtle aerodynamic body roll during high-speed cornering
    const targetRoll = -steerInput * Math.min(1.0, Math.abs(speedMps) / 30) * 0.022;
    this.currentRoll += (targetRoll - this.currentRoll) * Math.min(1, dt * 8);
    this.visualBody.rotation.z = this.currentRoll;

    // 4. Subtle aerodynamic chassis pitch (slight squat on throttle, subtle dip on brake)
    const targetPitch = (accelInput * 0.012) - (brakeInput * 0.018);
    this.currentPitch += (targetPitch - this.currentPitch) * Math.min(1, dt * 7);
    this.visualBody.rotation.x = this.currentPitch;

    // 5. Blinking rear safety rain light
    if (this.rainLight) {
      const blink = Math.sin(performance.now() * 0.015) > 0;
      this.rainLight.visible = blink;
    }

    // 6. Emit smoke from rear tires during high slip or drift
    if (lateralSlip > 0.20 || (brakeInput > 0.4 && speedMps > 8)) {
      const rlWorldPos = new THREE.Vector3();
      const rrWorldPos = new THREE.Vector3();
      this.wheelMeshes.rl.getWorldPosition(rlWorldPos);
      this.wheelMeshes.rr.getWorldPosition(rrWorldPos);
      this.emitSmoke(rlWorldPos, lateralSlip);
      this.emitSmoke(rrWorldPos, lateralSlip);
    }

    // 7. Emit sparks when bottoming out at high speed or clipping kerbs
    if (isBottomingOut && speedMps > 30) {
      const diffuserPos = new THREE.Vector3();
      if (this.diffuserMesh) {
        this.diffuserMesh.getWorldPosition(diffuserPos);
      } else {
        // Fallback: approximate diffuser position
        diffuserPos.set(0, 0.16, -1.7).applyMatrix4(this.visualBody.matrixWorld);
      }
      const sparkCount = Math.floor(3 + (speedMps / 80) * 8);
      this.emitSparks(diffuserPos, speedMps, sparkCount);
    }

    // Update smoke particles
    for (const sp of this.smokeParticles) {
      if (sp.life > 0) {
        sp.life += dt;
        if (sp.life >= sp.maxLife) {
          sp.life = 0;
          sp.mesh.visible = false;
        } else {
          const progress = sp.life / sp.maxLife;
          sp.mesh.position.addScaledVector(sp.vel, dt);
          sp.mesh.scale.multiplyScalar(1.0 + dt * 1.5);
          sp.mesh.material.opacity = (1.0 - progress) * 0.5;
        }
      }
    }

    // Update spark particles
    for (const sp of this.sparkParticles) {
      if (sp.life > 0) {
        sp.life += dt;
        if (sp.life >= sp.maxLife) {
          sp.life = 0;
          sp.mesh.visible = false;
        } else {
          const progress = sp.life / sp.maxLife;
          sp.vel.y += sp.gravity * dt;
          sp.mesh.position.addScaledVector(sp.vel, dt);
          sp.mesh.rotation.z += dt * 20;
          sp.mesh.material.opacity = 1.0 - progress;
          sp.mesh.scale.multiplyScalar(0.98);
        }
      }
    }
  }

  setPositionAndRotation(pos, quat) {
    this.group.position.copy(pos);
    this.group.quaternion.copy(quat);
  }

  dispose() {
    this._clearGlbBody();

    // Dispose visual body meshes, geometries, materials
    this.visualBody.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
    });

    // Dispose wheels group meshes, geometries, materials
    this.wheelsGroup.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
    });

    // Dispose front wheel holders
    if (this.frontWheelHolders.fl) {
      this.frontWheelHolders.fl.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        }
      });
    }
    if (this.frontWheelHolders.fr) {
      this.frontWheelHolders.fr.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        }
      });
    }

    // Dispose smoke particle meshes and materials
    for (const sp of this.smokeParticles) {
      if (sp.mesh) {
        this.scene.remove(sp.mesh);
        if (sp.mesh.geometry) sp.mesh.geometry.dispose();
        if (sp.mesh.material) {
          if (Array.isArray(sp.mesh.material)) sp.mesh.material.forEach(m => m.dispose());
          else sp.mesh.material.dispose();
        }
      }
    }

    // Dispose spark particle meshes and materials
    for (const sp of this.sparkParticles) {
      if (sp.mesh) {
        this.scene.remove(sp.mesh);
        if (sp.mesh.geometry) sp.mesh.geometry.dispose();
        if (sp.mesh.material) {
          if (Array.isArray(sp.mesh.material)) sp.mesh.material.forEach(m => m.dispose());
          else sp.mesh.material.dispose();
        }
      }
    }

    this.scene.remove(this.group);
  }
}
