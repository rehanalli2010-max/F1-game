import * as THREE from 'three';

const _textureCache = new Map();

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
    const cacheKey = `carbon_fiber_${width}_${height}`;
    if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);
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
    _textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Generates a Red Bull Racing-style body livery with dark navy base,
   * flowing red and cobalt-blue graphic waves, and yellow nose/accent details
   * modelled on the reference Oracle Red Bull Racing livery.
   */
  static createRedBullLiveryTexture(carNumber = '1') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Brand palette
    const navy = '#0b1a3a';
    const deepNavy = '#06122a';
    const cobalt = '#1e4fd8';
    const brightBlue = '#2860ff';
    const redBull = '#dc1a22';
    const darkRed = '#9b0d12';
    const yellow = '#ffd400';
    const carbonBlack = '#0a0c12';

    // 1. Glossy carbon fiber navy base coat
    const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
    baseGrad.addColorStop(0.0, deepNavy);
    baseGrad.addColorStop(0.45, navy);
    baseGrad.addColorStop(1.0, deepNavy);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Metallic flake sheen
    for (let i = 0; i < 4500; i++) {
      const g = Math.random() * 255;
      ctx.fillStyle = `rgba(${g},${g},${g},0.04)`;
      ctx.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
    }

    // 2. Engine cover / sidepod flowing blue graphic wave (Red Bull signature sweep)
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

    // Inner darker blue shadow line under the wave
    ctx.strokeStyle = darkRed;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 410);
    ctx.bezierCurveTo(200, 440, 420, 360, 620, 400);
    ctx.bezierCurveTo(820, 440, 920, 380, 1024, 410);
    ctx.stroke();
    ctx.restore();

    // 3. Red Bull signature red stripe along the spine (engine cover)
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
    redStripe.addColorStop(0.0, darkRed);
    redStripe.addColorStop(0.5, redBull);
    redStripe.addColorStop(1.0, darkRed);
    ctx.fillStyle = redStripe;
    ctx.fill();
    ctx.restore();

    // 4. Flowing red sidepod splashes mirroring the blue wave
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

    // 5. Yellow nose / leading edge accent (front of car)
    ctx.save();
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
    ctx.restore();

    // Sharp nose tip yellow block
    ctx.fillStyle = yellow;
    ctx.fillRect(960, 200, 80, 120);
    ctx.fillStyle = '#b89000';
    ctx.fillRect(960, 320, 80, 6);
    ctx.fillRect(960, 200, 80, 6);

    // 6. Front wing / nose tip accent block (yellow halo of light at the very tip)
    ctx.fillStyle = yellow;
    ctx.beginPath();
    ctx.moveTo(1000, 240);
    ctx.lineTo(1024, 230);
    ctx.lineTo(1024, 290);
    ctx.lineTo(1000, 280);
    ctx.closePath();
    ctx.fill();

    // 7. Sidepod air intake shadow gradient
    const intakeGrad = ctx.createLinearGradient(300, 0, 700, 0);
    intakeGrad.addColorStop(0.0, 'rgba(0,0,0,0.75)');
    intakeGrad.addColorStop(0.4, 'rgba(0,0,0,0.20)');
    intakeGrad.addColorStop(1.0, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = intakeGrad;
    ctx.fillRect(280, 60, 440, 400);

    // 8. Front Nose Number Badge (Yellow circle, navy outline)
    ctx.fillStyle = yellow;
    ctx.beginPath();
    ctx.arc(905, 256, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0b1a3a';
    ctx.stroke();
    ctx.fillStyle = '#0b1a3a';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(carNumber, 905, 259);

    // 9. Engine cover "ORION RACING" sponsor block
    ctx.fillStyle = 'rgba(11,26,58,0.92)';
    ctx.fillRect(150, 330, 320, 60);
    ctx.strokeStyle = yellow;
    ctx.lineWidth = 2;
    ctx.strokeRect(150, 330, 320, 60);

    ctx.fillStyle = yellow;
    ctx.font = '900 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ORION', 165, 356);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px sans-serif';
    ctx.fillText('ORION RACING F1', 165, 380);

    // 10. Side sponsor: large "ORION" wordmark on engine cover
    ctx.save();
    ctx.translate(220, 170);
    ctx.fillStyle = redBull;
    ctx.font = '900 italic 60px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ORION', 0, 0);
    ctx.restore();

    // 11. Side sponsor: KINETIC power unit branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('KINETIC', 540, 120);
    ctx.fillStyle = redBull;
    ctx.fillRect(540, 124, 110, 6);

    // 12. PULSAR aerodynamic partner branding (mid-sidepod)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('PULSAR', 540, 410);
    ctx.fillStyle = yellow;
    ctx.fillRect(540, 414, 86, 4);

    // 13. "07" badge near rear
    ctx.fillStyle = yellow;
    ctx.font = '900 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('07', 740, 250);

    // 14. Glossy lacquer top highlight
    const gloss = ctx.createLinearGradient(0, 0, 0, 180);
    gloss.addColorStop(0.0, 'rgba(255,255,255,0.20)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    gloss.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(0, 0, 1024, 180);

    // 15. Subtle carbon weave near floor / diffuser area
    ctx.save();
    ctx.globalAlpha = 0.35;
    const tileSize = 12;
    for (let y = 460; y < 512; y += tileSize) {
      for (let x = 0; x < 1024; x += tileSize) {
        const diag = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = diag ? carbonBlack : '#16181f';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  /**
   * Generates nosecone livery texture with car number and accent stripes
   */
  static createNoseTexture(teamOrId, carNumber = '1') {
    const teamId = (typeof teamOrId === 'string' ? teamOrId : (teamOrId && (teamOrId.teamId || teamOrId.id))) || 'redbull';
    const cacheKey = `nose_${teamId}_${carNumber}`;
    if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);

    const primaryHex = (typeof teamOrId === 'object' && teamOrId.primaryHex) ? teamOrId.primaryHex : (teamId === 'redbull' ? '#03102c' : '#dc0000');
    const secondaryHex = (typeof teamOrId === 'object' && teamOrId.secondaryHex) ? teamOrId.secondaryHex : '#ffffff';
    const accentHex = (typeof teamOrId === 'object' && teamOrId.accentHex) ? teamOrId.accentHex : '#ffd400';

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = (teamId === 'redbull') ? '#03102c' : primaryHex;
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = secondaryHex;
    ctx.fillRect(236, 0, 40, 512);

    ctx.fillStyle = accentHex;
    ctx.font = '900 110px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(carNumber), 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    _textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Generates sidepod cooling pod livery texture with team branding
   */
  static createSidepodTexture(teamOrId, isRightSide = false) {
    const teamId = (typeof teamOrId === 'string' ? teamOrId : (teamOrId && (teamOrId.teamId || teamOrId.id))) || 'redbull';
    const cacheKey = `sidepod_${teamId}_${isRightSide ? 'R' : 'L'}`;
    if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);

    const primaryHex = (typeof teamOrId === 'object' && teamOrId.primaryHex) ? teamOrId.primaryHex : (teamId === 'redbull' ? '#03102c' : '#dc0000');
    const secondaryHex = (typeof teamOrId === 'object' && teamOrId.secondaryHex) ? teamOrId.secondaryHex : '#ffd400';

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = (teamId === 'redbull') ? '#03102c' : primaryHex;
    ctx.fillRect(0, 0, 1024, 512);

    ctx.fillStyle = secondaryHex;
    ctx.beginPath();
    ctx.moveTo(100, 200);
    ctx.quadraticCurveTo(512, 350, 924, 220);
    ctx.lineTo(924, 290);
    ctx.quadraticCurveTo(512, 420, 100, 270);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const sponsorName = (teamId === 'redbull') ? 'ORION' : (teamId === 'ferrari' ? 'SHELL' : (teamId === 'mercedes' ? 'PETRONAS' : 'GRAND PRIX'));
    ctx.fillText(sponsorName, 512, 280);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    _textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Generates rear wing DRS flap sponsor banner
   */
  static createRearWingDrsTexture(teamOrId) {
    const teamId = (typeof teamOrId === 'string' ? teamOrId : (teamOrId && (teamOrId.teamId || teamOrId.id))) || 'redbull';
    const cacheKey = `drs_flap_${teamId}`;
    if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);

    const primaryHex = (typeof teamOrId === 'object' && teamOrId.primaryHex) ? teamOrId.primaryHex : (teamId === 'redbull' ? '#03102c' : '#dc0000');
    const secondaryHex = (typeof teamOrId === 'object' && teamOrId.secondaryHex) ? teamOrId.secondaryHex : '#ffd400';

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = (teamId === 'redbull') ? '#03102c' : primaryHex;
    ctx.fillRect(0, 0, 1024, 256);

    ctx.fillStyle = secondaryHex;
    ctx.fillRect(0, 0, 1024, 12);
    ctx.fillRect(0, 244, 1024, 12);

    let sponsorText = 'ORION';
    let sponsorColor = '#ffffff';

    if (teamId === 'redbull') { sponsorText = 'ORION'; sponsorColor = '#ffffff'; }
    else if (teamId === 'ferrari') { sponsorText = 'FERRARI'; sponsorColor = '#ffffff'; }
    else if (teamId === 'mercedes') { sponsorText = 'NEXUS'; sponsorColor = '#00f0ff'; }
    else if (teamId === 'mclaren') { sponsorText = 'McLAREN'; sponsorColor = '#ff8000'; }
    else if (teamId === 'astonmartin') { sponsorText = 'ARAMCO'; sponsorColor = '#cedc00'; }
    else if (teamId === 'alpine') { sponsorText = 'ALPINE'; sponsorColor = '#fd4bc7'; }
    else if (teamId === 'williams') { sponsorText = 'WILLIAMS'; sponsorColor = '#ffffff'; }
    else if (teamId === 'sauber') { sponsorText = 'STAKE'; sponsorColor = '#00e700'; }
    else if (teamId === 'haas') { sponsorText = 'HAAS'; sponsorColor = '#ffffff'; }
    else if (teamId === 'rb') { sponsorText = 'CASH APP'; sponsorColor = '#ffffff'; }

    ctx.save();
    ctx.translate(512, 128);
    ctx.rotate(Math.PI);
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = sponsorColor;
    ctx.font = '900 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sponsorText, 0, 0);

    if (teamId === 'redbull') {
      ctx.fillStyle = '#dc1a22';
      ctx.fillRect(-252, 76, 504, 8);
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    _textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Generates shark fin engine cover badge texture
   */
  static createSharkFinTexture(teamOrId) {
    const teamId = (typeof teamOrId === 'string' ? teamOrId : (teamOrId && (teamOrId.teamId || teamOrId.id))) || 'redbull';
    const cacheKey = `shark_fin_${teamId}`;
    if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);

    const primaryHex = (typeof teamOrId === 'object' && teamOrId.primaryHex) ? teamOrId.primaryHex : (teamId === 'redbull' ? '#03102c' : '#dc0000');
    const secondaryHex = (typeof teamOrId === 'object' && teamOrId.secondaryHex) ? teamOrId.secondaryHex : '#ffd400';
    const accentHex = (typeof teamOrId === 'object' && teamOrId.accentHex) ? teamOrId.accentHex : '#dc1a22';

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = (teamId === 'redbull') ? '#03102c' : primaryHex;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 512, 10);

    if (teamId === 'redbull') {
      ctx.fillStyle = '#ffd400';
      ctx.beginPath();
      ctx.arc(280, 130, 48, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#dc1a22';
      ctx.beginPath();
      ctx.ellipse(260, 136, 70, 36, -0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(210, 126, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffd400';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(212, 110);
      ctx.quadraticCurveTo(200, 85, 185, 90);
      ctx.moveTo(222, 110);
      ctx.quadraticCurveTo(226, 85, 240, 88);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HONDA RBPT', 280, 220);
    } else if (teamId === 'mercedes') {
      const teal = '#00f0ff';
      const carbon = '#0d1117';
      const silver = '#b8bcc0';
      
      ctx.fillStyle = carbon;
      ctx.fillRect(0, 0, 512, 256);
      
      ctx.fillStyle = teal;
      ctx.fillRect(0, 0, 512, 10);
      
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = silver;
      ctx.font = '900 italic 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEXUS', 256, 100);
      
      ctx.fillStyle = teal;
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('RACING', 256, 150);
      
      ctx.fillStyle = silver;
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('MERCEDES-AMG M15 E PERFORMANCE', 256, 210);
    } else {
      ctx.fillStyle = secondaryHex;
      ctx.font = '900 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GRAND PRIX', 256, 128);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    _textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Universal suite getter for all car aerodynamic components
   */
  static getTeamLiverySuite(teamOrId, carNumber = '1') {
    const teamId = (typeof teamOrId === 'string' ? teamOrId : (teamOrId && (teamOrId.teamId || teamOrId.id))) || 'redbull';
    const cacheKey = `livery_suite_${teamId}_${carNumber}`;
    if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);

    const suite = {
      noseTex: this.createNoseTexture(teamOrId, carNumber),
      sidepodLeftTex: this.createSidepodTexture(teamOrId, false),
      sidepodRightTex: this.createSidepodTexture(teamOrId, true),
      drsTex: this.createRearWingDrsTexture(teamOrId),
      finTex: this.createSharkFinTexture(teamOrId),
      bodyTex: (teamId === 'redbull')
        ? this.createRedBullLiveryTexture(carNumber)
        : this.createCarLiveryTexture(
            teamOrId && teamOrId.primaryHex ? teamOrId.primaryHex : '#dc0000',
            teamOrId && teamOrId.secondaryHex ? teamOrId.secondaryHex : '#ffffff',
            teamOrId && teamOrId.accentHex ? teamOrId.accentHex : '#1a1a1a',
            carNumber
          )
    };
    _textureCache.set(cacheKey, suite);
    return suite;
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
   * Generates normal map for asphalt surface with aggregate bumps and racing line groove
   * High-performance implementation: uses direct typed-array pixel synthesis (< 5ms)
   * instead of 30,000 DOM canvas creations (which took 11+ seconds).
   */
  static createAsphaltNormalMap() {
    const cacheKey = 'asphalt_normal_map';
    if (_textureCache.has(cacheKey)) {
      return _textureCache.get(cacheKey);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 1. Direct TypedArray ImageData generation: 1,048,576 pixels in ~3ms
    const imgData = ctx.createImageData(1024, 1024);
    const data32 = new Uint32Array(imgData.data.buffer);

    // Flat normal facing straight up: RGB(128, 128, 255), Alpha 255
    // Little-endian Uint32: (0xFF << 24) | (255 << 16) | (128 << 8) | 128
    const baseNormal = 0xFFFF8080;
    data32.fill(baseNormal);

    // Aggregate bump perturbations directly in pixel array
    const totalPixels = 1024 * 1024;
    for (let i = 0; i < 40000; i++) {
      const idx = Math.floor(Math.random() * totalPixels);
      const intensity = Math.floor((Math.random() - 0.5) * 24);
      const r = Math.max(0, Math.min(255, 128 + intensity));
      const g = Math.max(0, Math.min(255, 128 + intensity));
      const b = Math.max(210, Math.min(255, 255 - Math.abs(intensity)));
      const pixel = (0xFF << 24) | (b << 16) | (g << 8) | r;
      data32[idx] = pixel;
      if (idx + 1 < totalPixels) data32[idx + 1] = pixel;
    }

    ctx.putImageData(imgData, 0, 0);

    // 2. Racing line groove - subtle longitudinal depression
    const groove = ctx.createLinearGradient(0, 0, 1024, 0);
    groove.addColorStop(0.18, 'rgba(128,128,255,0)');
    groove.addColorStop(0.32, 'rgba(120,128,255,0.4)');
    groove.addColorStop(0.48, 'rgba(128,128,255,0)');
    groove.addColorStop(0.55, 'rgba(128,128,255,0)');
    groove.addColorStop(0.68, 'rgba(120,128,255,0.4)');
    groove.addColorStop(0.82, 'rgba(128,128,255,0)');
    ctx.fillStyle = groove;
    ctx.fillRect(0, 0, 1024, 1024);

    // 3. Track edge lines
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(28, 0, 24, 1024);
    ctx.fillRect(972, 0, 24, 1024);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 45);
    _textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Generates Crazy Grand Prix style realistic asphalt road surface
   * High-performance implementation: uses fast TypedArray noise fill (< 4ms)
   */
  static createAsphaltTexture() {
    const cacheKey = 'asphalt_diffuse_texture';
    if (_textureCache.has(cacheKey)) {
      return _textureCache.get(cacheKey);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Fast aggregate gravel noise in ImageData buffer
    const imgData = ctx.createImageData(1024, 1024);
    const data32 = new Uint32Array(imgData.data.buffer);

    // Base dark charcoal: #22252c -> R=34, G=37, B=44, A=255
    const baseColor = (0xFF << 24) | (44 << 16) | (37 << 8) | 34;
    data32.fill(baseColor);

    const totalPixels = 1024 * 1024;
    for (let i = 0; i < 40000; i++) {
      const idx = Math.floor(Math.random() * totalPixels);
      const shade = Math.floor(25 + Math.random() * 45);
      const r = shade;
      const g = shade + 2;
      const b = shade + 6;
      data32[idx] = (0xFF << 24) | (b << 16) | (g << 8) | r;
    }

    ctx.putImageData(imgData, 0, 0);

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
    _textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Generates Paul Ricard / Abu Dhabi style azure & cobalt blue striped runoff tarmac
   * (Directly matched to Crazy Grand Prix competitor)
   */
  static createBlueRunoffTexture() {
    const cacheKey = 'blue_runoff_texture';
    if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);
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
    _textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Generates realistic red & white 3D curb rumble strip texture
   */
  static createCurbTexture() {
    const cacheKey = 'curb_texture';
    if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);
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
    _textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Generates pit lane garage structure facade texture
   */
  static createPitBuildingTexture() {
    const cacheKey = 'pit_building_texture';
    if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);
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
    _textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Generates realistic grass texture with natural variation, blades, and organic feel
   */
  static createGrassTexture(variant = 'standard') {
    const cacheKey = `grass_texture_${variant}`;
    if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Fast grass texture generation using ImageData
    const imgData = ctx.createImageData(1024, 1024);
    const data32 = new Uint32Array(imgData.data.buffer);
    const totalPixels = 1024 * 1024;

    let baseColor, highlightColor, shadowColor, bladeColor;

    switch (variant) {
      case 'standard':
      case 'park':
        // Classic park grass - vibrant green
        baseColor = 0x2e6b35;      // #2e6b35
        highlightColor = 0x4a9c4f; // lighter green
        shadowColor = 0x1e4d24;    // darker green
        bladeColor = 0x3a7d3f;     // blade color
        break;
      case 'country':
        // Silverstone style - lush countryside grass
        baseColor = 0x3d7a42;      // #3d7a42
        highlightColor = 0x5a9b5e;
        shadowColor = 0x2a5a2e;
        bladeColor = 0x458549;
        break;
      case 'forest':
        // Spa style - darker forest grass
        baseColor = 0x22482c;      // #22482c
        highlightColor = 0x356b3e;
        shadowColor = 0x15301a;
        bladeColor = 0x2a5532;
        break;
      case 'technical':
        // Suzuka style - technical runoff grass
        baseColor = 0x3b6e44;      // #3b6e44
        highlightColor = 0x528a5b;
        shadowColor = 0x284d2e;
        bladeColor = 0x437d4c;
        break;
      case 'tropical':
        // Interlagos style - tropical grass
        baseColor = 0x226b38;      // #226b38
        highlightColor = 0x3a8a4f;
        shadowColor = 0x164e28;
        bladeColor = 0x2d7a42;
        break;
      case 'alpine':
        // Red Bull Ring style - alpine meadow
        baseColor = 0x2d6a4f;      // #2d6a4f
        highlightColor = 0x458a63;
        shadowColor = 0x1b4332;
        bladeColor = 0x367858;
        break;
      default:
        baseColor = 0x2e6b35;
        highlightColor = 0x4a9c4f;
        shadowColor = 0x1e4d24;
        bladeColor = 0x3a7d3f;
    }

    // Extract RGB components
    const baseR = (baseColor >> 16) & 0xFF;
    const baseG = (baseColor >> 8) & 0xFF;
    const baseB = baseColor & 0xFF;

    const highlightR = (highlightColor >> 16) & 0xFF;
    const highlightG = (highlightColor >> 8) & 0xFF;
    const highlightB = highlightColor & 0xFF;

    const shadowR = (shadowColor >> 16) & 0xFF;
    const shadowG = (shadowColor >> 8) & 0xFF;
    const shadowB = shadowColor & 0xFF;

    // Fill with base grass color
    const basePixel = (0xFF << 24) | (baseB << 16) | (baseG << 8) | baseR;
    data32.fill(basePixel);

    // Add organic noise variation (simulates soil/color variation)
    for (let i = 0; i < 150000; i++) {
      const idx = Math.floor(Math.random() * totalPixels);
      const variation = Math.floor((Math.random() - 0.5) * 30);
      const r = Math.max(0, Math.min(255, baseR + variation));
      const g = Math.max(0, Math.min(255, baseG + variation + 5));
      const b = Math.max(0, Math.min(255, baseB + variation - 3));
      data32[idx] = (0xFF << 24) | (b << 16) | (g << 8) | r;
    }

    // Add grass blade streaks (vertical lines for mowed grass look)
    const bladeCount = variant === 'park' ? 800 : 600;
    for (let i = 0; i < bladeCount; i++) {
      const x = Math.floor(Math.random() * 1024);
      const y = Math.floor(Math.random() * 1024);
      const length = 3 + Math.floor(Math.random() * 6);
      const intensity = 0.3 + Math.random() * 0.4;

      for (let l = 0; l < length; l++) {
        const py = (y + l) % 1024;
        const idx = py * 1024 + x;
        if (idx < totalPixels) {
          const r = Math.max(0, Math.min(255, baseR + Math.floor((highlightR - baseR) * intensity)));
          const g = Math.max(0, Math.min(255, baseG + Math.floor((highlightG - baseG) * intensity)));
          const b = Math.max(0, Math.min(255, baseB + Math.floor((highlightB - baseB) * intensity)));
          data32[idx] = (0xFF << 24) | (b << 16) | (g << 8) | r;
        }
      }
    }

    // Add darker patches (shadows, wet spots, wear)
    const patchCount = variant === 'forest' ? 200 : 120;
    for (let i = 0; i < patchCount; i++) {
      const cx = Math.floor(Math.random() * 1024);
      const cy = Math.floor(Math.random() * 1024);
      const radius = 8 + Math.floor(Math.random() * 20);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const px = (cx + dx + 1024) % 1024;
            const py = (cy + dy + 1024) % 1024;
            const idx = py * 1024 + px;
            const falloff = 1 - dist / radius;
            const r = Math.max(0, Math.min(255, baseR + Math.floor((shadowR - baseR) * falloff * 0.6)));
            const g = Math.max(0, Math.min(255, baseG + Math.floor((shadowG - baseG) * falloff * 0.6)));
            const b = Math.max(0, Math.min(255, baseB + Math.floor((shadowB - baseB) * falloff * 0.6)));
            data32[idx] = (0xFF << 24) | (b << 16) | (g << 8) | r;
          }
        }
      }
    }

    // Add mowing stripes for park/country variants
    if (variant === 'park' || variant === 'country' || variant === 'alpine') {
      const stripeWidth = 32;
      for (let y = 0; y < 1024; y += stripeWidth * 2) {
        const stripeIntensity = variant === 'alpine' ? 0.15 : 0.1;
        for (let sy = 0; sy < stripeWidth; sy++) {
          const py = (y + sy) % 1024;
          for (let x = 0; x < 1024; x++) {
            const idx = py * 1024 + x;
            const r = Math.max(0, Math.min(255, baseR + Math.floor((highlightR - baseR) * stripeIntensity)));
            const g = Math.max(0, Math.min(255, baseG + Math.floor((highlightG - baseG) * stripeIntensity)));
            const b = Math.max(0, Math.min(255, baseB + Math.floor((highlightB - baseB) * stripeIntensity)));
            data32[idx] = (0xFF << 24) | (b << 16) | (g << 8) | r;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    tex.anisotropy = 8;
    _textureCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Generates realistic Grand Prix daytime skydome texture with cumulus clouds and atmospheric haze
   */
  static createDaytimeSkyTexture() {
    const cacheKey = 'daytime_sky_texture';
    if (_textureCache.has(cacheKey)) return _textureCache.get(cacheKey);
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
    _textureCache.set(cacheKey, tex);
    return tex;
  }
}
