import * as THREE from 'three';

/**
 * Texture Generator for F1 Racing Game
 * Provides authentic Crazy Grand Prix style procedural textures:
 * - Carbon fiber weave diffuse and bump
 * - High-speed team racing liveries (Scuderia Red, Azure Cyan, Emerald Green, Stealth Black)
 * - Pirelli P-Zero racing slick tire sidewalls and brake disc rotors
 * - Realistic asphalt road with rubbered-in racing line
 * - Paul Ricard style azure and cobalt blue striped runoff tarmac
 * - Pit lane garage rolling doors, concrete textures, and sponsor banners
 * - Grandstand crowds and safety catch-fencing
 */
export class TextureFactory {
  /**
   * Generates a 2x2 micro-tile woven carbon fiber pattern
   */
  static createCarbonFiberTexture(width = 256, height = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#151517';
    ctx.fillRect(0, 0, width, height);

    const tileSize = 8;
    for (let y = 0; y < height; y += tileSize) {
      for (let x = 0; x < width; x += tileSize) {
        const isDiagonal = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = isDiagonal ? '#222327' : '#0d0e10';
        ctx.fillRect(x, y, tileSize, tileSize);

        // Add 3D fiber sheen lines
        ctx.strokeStyle = isDiagonal ? 'rgba(60,63,72,0.45)' : 'rgba(25,27,32,0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (isDiagonal) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + tileSize, y + tileSize);
        } else {
          ctx.moveTo(x + tileSize, y);
          ctx.lineTo(x, y + tileSize);
        }
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    return tex;
  }

  /**
   * Generates detailed F1 car body livery with racing stripes, number pod, and sponsor decals
   */
  static createCarLiveryTexture(primaryHex = '#e10600', secondaryHex = '#ffffff', accentHex = '#1a1a1a', carNumber = '1') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Base car lacquer coat
    ctx.fillStyle = primaryHex;
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle metallic flake noise
    for (let i = 0; i < 4000; i++) {
      const g = Math.random() * 255;
      ctx.fillStyle = `rgba(${g},${g},${g},0.035)`;
      ctx.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
    }

    // 2. Aerodynamic high-speed racing stripes along the spine
    ctx.fillStyle = secondaryHex;
    ctx.beginPath();
    ctx.moveTo(0, 220);
    ctx.lineTo(1024, 180);
    ctx.lineTo(1024, 332);
    ctx.lineTo(0, 292);
    ctx.closePath();
    ctx.fill();

    // Secondary accent pinstripe
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 210, 1024, 10);
    ctx.fillRect(0, 292, 1024, 10);

    // 3. Sidepod intake scoops gradient shadow
    const sidepodGrad = ctx.createLinearGradient(350, 0, 750, 0);
    sidepodGrad.addColorStop(0, 'rgba(0,0,0,0.65)');
    sidepodGrad.addColorStop(0.3, 'rgba(0,0,0,0.15)');
    sidepodGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = sidepodGrad;
    ctx.fillRect(300, 50, 450, 412);

    // 4. Sponsor Decals & Logos (Crazy Grand Prix style)
    // Front Nose Number Badge
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(880, 256, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = accentHex;
    ctx.stroke();

    ctx.fillStyle = '#0a0a0a';
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(carNumber, 880, 258);

    // Side Sponsor 1: PIRELLI
    ctx.fillStyle = '#ffd000';
    ctx.font = '900 34px sans-serif';
    ctx.fillText('IRELLI', 560, 140);
    ctx.fillText('IRELLI', 560, 372);
    // Red P
    ctx.fillStyle = '#e10600';
    ctx.fillText('P', 485, 140);
    ctx.fillText('P', 485, 372);

    // Side Sponsor 2: SHELL / MOBIL
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('Mobil 1', 340, 140);
    ctx.fillText('Mobil 1', 340, 372);

    // Engine Cover: GRAND PRIX branding
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '900 italic 38px sans-serif';
    ctx.fillText('GRAND PRIX', 200, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  /**
   * Generates Pirelli P-Zero racing slick tire sidewall texture
   */
  static createTireSidewallTexture(stripeColor = '#ffd000', label = 'P ZERO') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const cx = 256;
    const cy = 256;

    // Outer dark rubber
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle rubber grain
    for (let i = 0; i < 3000; i++) {
      const g = 15 + Math.random() * 15;
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // Colored Pirelli sidewall stripe ring
    ctx.beginPath();
    ctx.arc(cx, cy, 185, 0, Math.PI * 2);
    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = 14;
    ctx.stroke();

    // Second thin inner bead ring
    ctx.beginPath();
    ctx.arc(cx, cy, 160, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Curved Text: PIRELLI on top, P ZERO on bottom
    const drawCurvedText = (text, radius, startAngle, endAngle, isTop = true) => {
      ctx.save();
      ctx.fillStyle = stripeColor;
      ctx.font = '900 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const angleStep = (endAngle - startAngle) / text.length;
      for (let i = 0; i < text.length; i++) {
        const angle = startAngle + i * angleStep + angleStep / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.translate(0, isTop ? -radius : radius);
        if (!isTop) ctx.rotate(Math.PI);
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();
    };

    drawCurvedText('PIRELLI', 185, -Math.PI * 0.35, Math.PI * 0.35, true);
    drawCurvedText(label, 185, -Math.PI * 0.32, Math.PI * 0.32, false);

    // Inner rim hole mask
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1d21';
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  /**
   * Generates metallic cross-drilled racing brake disc rotor texture
   */
  static createBrakeRotorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cx = 128;
    const cy = 128;

    // Steel disc surface
    ctx.fillStyle = '#5a5d66';
    ctx.beginPath();
    ctx.arc(cx, cy, 115, 0, Math.PI * 2);
    ctx.fill();

    // Radial brushed steel rings
    for (let r = 50; r < 112; r += 3) {
      ctx.strokeStyle = (r % 6 === 0) ? '#727682' : '#454850';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cross-drilled ventilation holes
    ctx.fillStyle = '#111215';
    for (let ring = 0; ring < 4; ring++) {
      const radius = 62 + ring * 14;
      const count = 18 + ring * 4;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (ring * 0.2);
        const hx = cx + Math.cos(angle) * radius;
        const hy = cy + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(hx, hy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Inner hub
    ctx.fillStyle = '#222328';
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  /**
   * Generates Crazy Grand Prix style realistic asphalt road surface
   */
  static createAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Rich dark charcoal base
    ctx.fillStyle = '#22252c';
    ctx.fillRect(0, 0, 1024, 1024);

    // Multi-tone aggregate gravel noise
    for (let i = 0; i < 40000; i++) {
      const shade = Math.floor(25 + Math.random() * 45);
      ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 6})`;
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }

    // Crisp white track edge lines (left and right)
    ctx.fillStyle = '#f0f3f8';
    ctx.fillRect(28, 0, 24, 1024);
    ctx.fillRect(972, 0, 24, 1024);

    // Racing line dark rubbering groove (groove worn into asphalt by race cars)
    const groove = ctx.createLinearGradient(0, 0, 1024, 0);
    groove.addColorStop(0.18, 'transparent');
    groove.addColorStop(0.32, 'rgba(10, 12, 16, 0.65)');
    groove.addColorStop(0.48, 'transparent');
    groove.addColorStop(0.55, 'transparent');
    groove.addColorStop(0.68, 'rgba(10, 12, 16, 0.65)');
    groove.addColorStop(0.82, 'transparent');
    ctx.fillStyle = groove;
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle longitudinal asphalt seam line in center
    ctx.strokeStyle = 'rgba(15, 17, 22, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(512, 0);
    ctx.lineTo(512, 1024);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 45);
    return tex;
  }

  /**
   * Generates Paul Ricard / Abu Dhabi style azure & cobalt blue striped runoff tarmac
   * (Directly matched to Crazy Grand Prix competitor)
   */
  static createBlueRunoffTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base dark cobalt blue
    ctx.fillStyle = '#0c3d7a';
    ctx.fillRect(0, 0, 512, 512);

    // Alternating vibrant azure blue stripes
    const stripeH = 48;
    for (let y = 0; y < 512; y += stripeH * 2) {
      ctx.fillStyle = '#007be5';
      ctx.fillRect(0, y, 512, stripeH);

      // Fine white dividing pinstripe
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, y, 512, 4);
      ctx.fillRect(0, y + stripeH, 512, 4);
    }

    // Aggregate friction noise
    for (let i = 0; i < 15000; i++) {
      const v = Math.random();
      ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 30);
    return tex;
  }

  /**
   * Generates realistic red & white 3D curb rumble strip texture
   */
  static createCurbTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const blockH = 64;
    for (let y = 0; y < 512; y += blockH) {
      const isRed = (Math.floor(y / blockH) % 2 === 0);
      ctx.fillStyle = isRed ? '#d80018' : '#f5f5f7';
      ctx.fillRect(0, y, 256, blockH);

      // Top bevel highlight & bottom shadow
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(0, y, 256, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, y + blockH - 4, 256, 4);

      // Rumble grooves
      for (let g = 8; g < blockH - 8; g += 12) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, y + g, 256, 2);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 20);
    return tex;
  }

  /**
   * Generates pit lane garage structure facade texture
   */
  static createPitBuildingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Concrete architectural facade
    ctx.fillStyle = '#dcdde2';
    ctx.fillRect(0, 0, 1024, 512);

    // 4 Pit Garages
    const garageW = 240;
    for (let g = 0; g < 4; g++) {
      const gx = 16 + g * 252;

      // 1. Garage Opening Frame
      ctx.fillStyle = '#22242a';
      ctx.fillRect(gx, 160, garageW, 330);

      // 2. Corrugated Industrial Roller Shutter Door
      const shutterW = garageW - 16;
      for (let s = 175; s < 480; s += 10) {
        ctx.fillStyle = (Math.floor(s / 10) % 2 === 0) ? '#8a929d' : '#a2abb8';
        ctx.fillRect(gx + 8, s, shutterW, 8);
      }

      // 3. Team Pit Signboard above garage
      const teamColors = ['#e10600', '#00d2be', '#0c3d7a', '#005a30'];
      const teamNames = ['SCUDERIA', 'MERCEDES', 'RED BULL', 'ASTON'];
      ctx.fillStyle = teamColors[g];
      ctx.fillRect(gx + 8, 110, shutterW, 42);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(teamNames[g], gx + 8 + shutterW / 2, 140);

      // 4. Second Floor VIP Viewing Balcony Windows
      ctx.fillStyle = '#101726';
      ctx.fillRect(gx + 8, 20, shutterW, 75);
      // Window mullions
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(gx + 8, 20, shutterW, 75);
      ctx.beginPath();
      ctx.moveTo(gx + 8 + shutterW / 2, 20);
      ctx.lineTo(gx + 8 + shutterW / 2, 95);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  /**
   * Generates realistic Grand Prix daytime skydome texture with cumulus clouds and atmospheric haze
   */
  static createDaytimeSkyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 1. Sky blue gradient (Zenith deep azure to Horizon pale cyan)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    skyGrad.addColorStop(0.0, '#1565c0');  // Rich deep sky blue
    skyGrad.addColorStop(0.45, '#3b8fe0'); // Bright sunny cyan
    skyGrad.addColorStop(0.85, '#8ec5f5'); // Soft horizon blue
    skyGrad.addColorStop(1.0, '#dcedfc');  // Atmospheric white haze
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // 2. Procedural fluffy cumulus clouds
    const drawCloud = (cx, cy, scale) => {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      const puffs = 7;
      for (let i = 0; i < puffs; i++) {
        const angle = (i / puffs) * Math.PI;
        const dist = (i - puffs / 2) * 28 * scale;
        const r = (32 + Math.sin(i * 1.5) * 16) * scale;
        ctx.beginPath();
        ctx.arc(cx + dist, cy + Math.sin(angle) * 10 * scale, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // Cloud field
    for (let c = 0; c < 18; c++) {
      const cx = (c * 125 + (c % 3) * 60) % 2048;
      const cy = 180 + (c % 5) * 80;
      const scale = 0.7 + (c % 4) * 0.4;
      drawCloud(cx, cy, scale);
    }

    // 3. Distant green rolling mountains/hills on horizon line
    ctx.fillStyle = '#497352';
    ctx.beginPath();
    ctx.moveTo(0, 1024);
    for (let x = 0; x <= 2048; x += 64) {
      const hy = 870 + Math.sin(x * 0.008) * 45 + Math.cos(x * 0.02) * 22;
      ctx.lineTo(x, hy);
    }
    ctx.lineTo(2048, 1024);
    ctx.closePath();
    ctx.fill();

    // Haze over mountains
    const haze = ctx.createLinearGradient(0, 820, 0, 1024);
    haze.addColorStop(0, 'rgba(220, 237, 252, 0.0)');
    haze.addColorStop(1, 'rgba(220, 237, 252, 0.85)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 820, 2048, 204);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }
}
