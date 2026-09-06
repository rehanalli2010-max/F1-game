import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { TextureFactory } from './textures.js';
import { TRACK_DATABASE, getTrackById } from './tracks_db.js';

/**
 * 3D F1 Racing Circuit Environment
 * Supports dynamic procedural generation of 10 distinct Grand Prix tracks from TRACK_DATABASE.
 * Features procedural ribbon asphalt, national/team colored curbs, continuous Armco/Concrete barriers,
 * physical Cannon-es colliders, 10-car staggered starting grid, FIA starting gantry, distance braking markers,
 * thematic environmental props (trees, floodlights, city walls), and comprehensive memory disposal.
 */
export class Track {
  constructor(scene, physics = null, trackDataOrId = null) {
    this.scene = scene;
    this.physics = physics;
    this.physicsBodies = [];
    this.animatedFlags = [];
    this.sampleCount = 600;
    this.sampledPoints = [];
    this.sampledTangents = [];

    // Root Three.js container for all track meshes and lights
    this.trackRoot = new THREE.Group();
    this.trackRoot.name = 'track_root';
    this.scene.add(this.trackRoot);

    // Initial track loading
    const trackData = (typeof trackDataOrId === 'string')
      ? getTrackById(trackDataOrId)
      : (trackDataOrId || TRACK_DATABASE[0]);

    this.loadTrack(trackData);
  }

  /**
   * Disposes of all previous Three.js geometries, materials, textures,
   * and Cannon-es rigid bodies to prevent memory leaks.
   */
  dispose() {
    // 1. Remove physical collision bodies from Cannon-es world
    if (this.physics && this.physics.world) {
      for (const body of this.physicsBodies) {
        this.physics.world.removeBody(body);
      }
    }
    this.physicsBodies = [];
    this.animatedFlags = [];

    // 2. Traverse and dispose Three.js meshes, geometries, and materials
    if (this.trackRoot) {
      this.trackRoot.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => {
                if (m.map) m.map.dispose();
                m.dispose();
              });
            } else {
              if (child.material.map) child.material.map.dispose();
              child.material.dispose();
            }
          }
        }
      });

      // Clear all children from trackRoot
      while (this.trackRoot.children.length > 0) {
        this.trackRoot.remove(this.trackRoot.children[0]);
      }
    }
  }

  /**
   * Dynamically rebuilds the 3D circuit for the given track data configuration
   */
  loadTrack(trackData) {
    this.dispose();

    this.trackData = trackData || TRACK_DATABASE[0];
    this.trackWidth = this.trackData.trackWidth || 16.0;
    this.barrierDistance = this.trackData.barrierDistance || (this.trackWidth / 2 + 3.5);

    // Build Catmull-Rom spline curve
    const pts = this.trackData.controlPoints.map(p => new THREE.Vector3(p.x, p.y || 0, p.z));
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.2);
    this.trackLength = this.curve.getLength();

    // Sample track points & tangents
    this.sampleTrackData();

    // Cache track elevation range for procedural terrain contouring
    let minElev = 0;
    let maxElev = 0;
    for (let i = 0; i < this.sampledPoints.length; i++) {
      const y = this.sampledPoints[i].y || 0;
      if (y < minElev) minElev = y;
      if (y > maxElev) maxElev = y;
    }
    this._minTrackElevation = minElev;
    this._maxTrackElevation = maxElev;

    // Generate 8 evenly spaced checkpoints for lap validation & anti-cut detection
    this.generateCheckpoints();

    // Initialize grandstand specifications & terraced pads before building terrain environment
    this.initGrandstandPads();

    // Build Environment & Thematic Palettes
    this.buildEnvironment();

    // Build Asphalt Ribbon, Aprons, Curbs
    this.buildTrackRibbon();
    this.buildCurbsAndMarkings();

    // Build Barriers & Cannon-es Colliders
    this.buildTrackBarriers();

    // Dedicated Crossover Bridge Architecture (Suzuka Figure-8 Overpass)
    if (this.trackData.id === 'suzuka') {
      this.buildSuzukaCrossoverBridge();
    }

    // Build Pit Complex, Starting Gantry, 10 Grid Boxes
    this.buildPitComplex();
    this.buildStartFinishGantry();
    this.buildStartFinishLine();
    this.buildBrakeMarkers();
    this.buildSponsorHoardings();
    this.buildGrandstandsAndAudience();

    // Build Thematic Props (Trees, Floodlights, City Walls)
    this.buildThematicProps();
  }

  sampleTrackData() {
    this.sampledPoints = [];
    this.sampledTangents = [];
    for (let i = 0; i < this.sampleCount; i++) {
      const t = i / this.sampleCount;
      const pt = this.curve.getPointAt(t);
      const tgt = this.curve.getTangentAt(t).normalize();
      this.sampledPoints.push(pt);
      this.sampledTangents.push(tgt);
    }
  }

  generateCheckpoints() {
    this.checkpoints = [];
    const numCheckpoints = 8;
    for (let i = 0; i < numCheckpoints; i++) {
      const t = i / numCheckpoints;
      this.checkpoints.push({
        id: i,
        name: i === 0 ? 'START_FINISH' : `CHECKPOINT_${i}`,
        label: i === 0 ? 'Start / Finish' : `Sector ${i}`,
        t: t
      });
    }
  }

  /**
   * Initializes bespoke grandstand specifications and geometric spectator pads
   * so terrain contouring can flatten and terrace viewing plateaus into hillsides.
   */
  initGrandstandPads() {
    this.grandstandPads = [];
    let grandstandSpecs = [];

    if (this.trackData.id === 'monza') {
      grandstandSpecs = [
        { t: 0.008, side: -1, dist: this.barrierDistance + 13.0, length: 90, depth: 14, height: 10.5, rows: 10, sponsor: 'FORMULA 1', roofColor: 0xe10600 },
        { t: 0.045, side: -1, dist: this.barrierDistance + 13.0, length: 90, depth: 14, height: 10.5, rows: 10, sponsor: 'PIRELLI', roofColor: 0x111827 },
        { t: 0.125, side: -1, dist: this.barrierDistance + 15.0, length: 75, depth: 14, height: 11.0, rows: 11, sponsor: 'ROLEX', roofColor: 0x00594f },
        { t: 0.72, side: -1, dist: this.barrierDistance + 15.0, length: 70, depth: 13, height: 10.0, rows: 10, sponsor: 'QATAR AIRWAYS', roofColor: 0x5c0632 },
        { t: 0.92, side: -1, dist: this.barrierDistance + 16.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'HEINEKEN', roofColor: 0x008234 },
        { t: 0.965, side: -1, dist: this.barrierDistance + 14.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'DHL', roofColor: 0xffcc00 }
      ];
    } else if (this.trackData.id === 'monaco') {
      grandstandSpecs = [
        // 1. Grandstand A - Sainte-Dévote (Overlooking Turn 1 braking zone from Pit Straight)
        { t: 0.10, side: -1, dist: this.barrierDistance + 4.5, length: 48, depth: 8, height: 7.5, rows: 6, sponsor: 'ROLEX', roofColor: 0x00594f },
        // 2. Grandstand B - Casino Square Plaza (Overlooking Hotel de Paris & Casino Square terrace at summit)
        { t: 0.44, side: 1, dist: this.barrierDistance + 7.0, length: 32, depth: 8, height: 7.0, rows: 6, sponsor: 'MONTE CARLO', roofColor: 0x1e3a8a },
        // 3. Grandstand K - Port Hercule Harbor Quay (Along the famous waterfront quay overlooking superyachts)
        { t: 0.82, side: -1, dist: this.barrierDistance + 5.0, length: 56, depth: 8, height: 7.5, rows: 6, sponsor: 'TAG HEUER', roofColor: 0xe10600 },
        // 4. Grandstand L - Rainier III Swimming Pool / Piscine (Overlooking harbor chicane)
        { t: 0.90, side: -1, dist: this.barrierDistance + 4.5, length: 50, depth: 8, height: 7.5, rows: 6, sponsor: 'PIRELLI', roofColor: 0x111827 },
        // 5. Grandstand T - Pit Straight / La Rascasse (Opposite pit lane and start straight entry)
        { t: 0.98, side: -1, dist: this.barrierDistance + 4.5, length: 46, depth: 8, height: 7.0, rows: 6, sponsor: 'FORMULA 1', roofColor: 0xe10600 }
      ];
    } else if (this.trackData.id === 'silverstone') {
      grandstandSpecs = [
        { t: 0.975, side: -1, dist: this.barrierDistance + 14.0, length: 90, depth: 14, height: 10.5, rows: 10, sponsor: 'FORMULA 1', roofColor: 0xe10600 },
        { t: 0.05, side: -1, dist: this.barrierDistance + 15.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'PIRELLI', roofColor: 0x111827 },
        { t: 0.25, side: 1, dist: this.barrierDistance + 15.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'ROLEX', roofColor: 0x00594f },
        { t: 0.38, side: -1, dist: this.barrierDistance + 15.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'BRITISH GP', roofColor: 0x1e3a8a },
        { t: 0.505, side: -1, dist: this.barrierDistance + 16.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'ARAMCO', roofColor: 0x008080 },
        { t: 0.61, side: 1, dist: this.barrierDistance + 16.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'QATAR AIRWAYS', roofColor: 0x5c0632 },
        { t: 0.825, side: 1, dist: this.barrierDistance + 16.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'DHL', roofColor: 0xffcc00 }
      ];
    } else if (this.trackData.id === 'spa') {
      grandstandSpecs = [
        // 1. Main Straight Tribuna (Overlooking start grid & pit garages)
        { t: 0.012, side: -1, dist: this.barrierDistance + 13.0, length: 85, depth: 14, height: 10.5, rows: 10, sponsor: 'FORMULA 1', roofColor: 0xe10600 },
        // 2. Eau Rouge & Raidillon Stadium (Overlooking iconic uphill climb)
        { t: 0.22, side: -1, dist: this.barrierDistance + 15.0, length: 80, depth: 14, height: 11.0, rows: 11, sponsor: 'ROLEX', roofColor: 0x00594f },
        // 3. Kemmel Straight / Les Combes Arena (High-speed braking zone on outside spectator hill)
        { t: 0.42, side: -1, dist: this.barrierDistance + 15.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'PIRELLI', roofColor: 0x111827 },
        // 4. Bruxelles / Rivage Downhill Hairpin Viewing Terrace
        { t: 0.55, side: -1, dist: this.barrierDistance + 15.0, length: 70, depth: 14, height: 10.5, rows: 10, sponsor: 'QATAR AIRWAYS', roofColor: 0x5c0632 },
        // 5. Pouhon Hillside Stadium (Famous double-apex spectator bowl)
        { t: 0.65, side: -1, dist: this.barrierDistance + 16.0, length: 85, depth: 14, height: 11.0, rows: 11, sponsor: 'ARAMCO', roofColor: 0x008080 },
        // 6. Bus Stop Chicane Stadium (Final braking chicane into start straight)
        { t: 0.965, side: -1, dist: this.barrierDistance + 14.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'DHL', roofColor: 0xffcc00 }
      ];
    } else if (this.trackData.id === 'suzuka') {
      // Bespoke Suzuka Circuit Grandstands tailored for Figure-8 geometry with guaranteed zero track intrusion
      grandstandSpecs = [
        // 1. Main Straight Grandstand V1/V2 (opposite pit lane & starting grid)
        { t: 0.015, side: -1, dist: this.barrierDistance + 13.0, length: 85, depth: 14, height: 10.5, rows: 10, sponsor: 'FORMULA 1', roofColor: 0xe10600 },
        // 2. First Corner / Turn 2 Grandstand B (outside Turn 1-2 braking zone)
        { t: 0.09, side: -1, dist: this.barrierDistance + 14.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'HONDA', roofColor: 0xcc0000 },
        // 3. S-Curves Hillside Grandstand D (elevated spectator hill overlooking S-Curves)
        { t: 0.22, side: -1, dist: this.barrierDistance + 14.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'ROLEX', roofColor: 0x00594f },
        // 4. Hairpin Stadium Grandstand I (outside hairpin perimeter)
        { t: 0.54, side: 1, dist: this.barrierDistance + 15.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'PIRELLI', roofColor: 0x111827 },
        // 5. Back Straight / 130R Approach Grandstand (high-speed viewing arena)
        { t: 0.88, side: -1, dist: this.barrierDistance + 14.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'DHL', roofColor: 0xffcc00 },
        // 6. Casio Triangle Chicane Grandstand R (final chicane entry into start straight)
        { t: 0.965, side: -1, dist: this.barrierDistance + 13.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'QATAR AIRWAYS', roofColor: 0x5c0632 }
      ];
    } else {
      grandstandSpecs = [
        { t: 0.01, side: -1, dist: this.barrierDistance + 13.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'FORMULA 1', roofColor: 0xe10600 },
        { t: 0.045, side: -1, dist: this.barrierDistance + 13.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'PIRELLI', roofColor: 0x111827 },
        { t: 0.14, side: -1, dist: this.barrierDistance + 15.0, length: 70, depth: 14, height: 10.5, rows: 10, sponsor: 'ROLEX', roofColor: 0x00594f },
        { t: 0.50, side: -1, dist: this.barrierDistance + 15.0, length: 70, depth: 14, height: 10.0, rows: 10, sponsor: 'ARAMCO', roofColor: 0x008080 },
        { t: 0.75, side: -1, dist: this.barrierDistance + 15.0, length: 70, depth: 14, height: 10.5, rows: 10, sponsor: 'EMIRATES', roofColor: 0xd60400 },
        { t: 0.94, side: -1, dist: this.barrierDistance + 15.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'DHL', roofColor: 0xffcc00 }
      ];
    }

    this.grandstandSpecs = grandstandSpecs;

    // Calculate geometric pads for terrain terracing
    const up = new THREE.Vector3(0, 1, 0);
    for (const spec of grandstandSpecs) {
      const pt = this.curve.getPointAt(spec.t);
      const tgt = this.curve.getTangentAt(spec.t).normalize();
      const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();
      const outward = new THREE.Vector3().copy(normal).multiplyScalar(spec.side).normalize();
      const xBasis = new THREE.Vector3().crossVectors(up, outward).normalize();

      const padCenter = new THREE.Vector3().copy(pt).addScaledVector(outward, spec.dist + (spec.depth + 2.0) / 2);

      this.grandstandPads.push({
        spec,
        center: padCenter,
        targetY: pt.y,
        xBasis,
        outward,
        halfLen: (spec.length + 8.0) / 2,
        halfDepth: (spec.depth + 10.0) / 2,
        blendMargin: 16.0
      });
    }
  }

  /**
   * Evaluates terrain elevation at any world coordinate (x, z).
   * Contours smoothly beneath track ribbons, aprons, and curbs,
   * guaranteeing that the green terrain never clips over the track surface
   * at Eau Rouge, Raidillon, Pouhon, or on any 3D undulating circuit,
   * and carves realistic terraced spectator pads beneath grandstands.
   */
  getTerrainHeight(x, z) {
    const pts = this.sampledPoints;
    if (!pts || pts.length === 0) return -0.05;

    const count = pts.length;
    let minDistSq = Infinity;
    let bestIdx = 0;

    for (let i = 0; i < count; i++) {
      const p = pts[i];
      const dx = p.x - x;
      const dz = p.z - z;
      const dSq = dx * dx + dz * dz;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        bestIdx = i;
      }
    }

    const dist = Math.sqrt(minDistSq);
    const pt = pts[bestIdx];
    const halfW = (this.trackWidth || 16.0) / 2;
    const roadClearance = halfW + 4.5;

    const minTrackY = this._minTrackElevation !== undefined ? this._minTrackElevation : -0.05;
    const baseGroundLevel = Math.min(-0.05, minTrackY - 1.5);

    // Find minimum elevation in local neighborhood (+/- 8 points ~ 18m along track)
    // Completely eliminates chord cutting across steep concave dips like Eau Rouge compression
    let minLocalY = pt.y;
    for (let j = -8; j <= 8; j++) {
      const nIdx = (bestIdx + j + count) % count;
      if (pts[nIdx].y < minLocalY) minLocalY = pts[nIdx].y;
    }

    // Protection for Crossover / Multi-Level Tracks (e.g. Suzuka Bridge & Underpass):
    // Search radius expanded to 38.0m for Suzuka so underpass trench stays down at lowest track level
    const nearbyRadius = (this.trackData && this.trackData.id === 'suzuka') ? 38.0 : roadClearance;
    let lowestNearbyY = minLocalY;
    for (let i = 0; i < count; i++) {
      const p = pts[i];
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz <= nearbyRadius * nearbyRadius) {
        if (p.y < lowestNearbyY) lowestNearbyY = p.y;
      }
    }

    const safeRoadY = Math.min(pt.y - 0.25, lowestNearbyY - 0.25, minLocalY - 0.15);

    if (dist <= roadClearance) {
      return safeRoadY;
    }

    const maxInfluenceDist = 140.0;
    let rawY = baseGroundLevel;
    if (dist < maxInfluenceDist) {
      const u = (dist - roadClearance) / (maxInfluenceDist - roadClearance);
      const blend = 0.5 * (1.0 + Math.cos(Math.PI * u));
      rawY = blend * safeRoadY + (1.0 - blend) * baseGroundLevel;
    }

    let currentH = Math.min(rawY, minLocalY - 0.15, pt.y - 0.15);

    // Dedicated underpass cutting protection for Suzuka:
    // Any point in the Degner 2 -> Underpass -> Hairpin approach corridor stays firmly below track level
    if (this.trackData && this.trackData.id === 'suzuka') {
      if (x >= -135 && x <= -65 && z >= -85 && z <= 25) {
        const uStart = Math.floor(0.39 * count);
        const uEnd = Math.ceil(0.46 * count);
        let minUnderDist = Infinity;
        for (let ui = uStart; ui <= uEnd; ui++) {
          const upPt = pts[ui % count];
          const ud = Math.hypot(upPt.x - x, upPt.z - z);
          if (ud < minUnderDist) minUnderDist = ud;
        }
        if (minUnderDist <= 28.0) {
          currentH = Math.min(currentH, -0.35);
        }
      }
    }

    // Terraced spectator pads beneath grandstands (carves flat plateaus into the hillsides)
    if (this.grandstandPads && this.grandstandPads.length > 0) {
      for (let k = 0; k < this.grandstandPads.length; k++) {
        const pad = this.grandstandPads[k];
        const dx = x - pad.center.x;
        const dz = z - pad.center.z;
        const localX = dx * pad.xBasis.x + dz * pad.xBasis.z;
        const localZ = dx * pad.outward.x + dz * pad.outward.z;

        const dX = Math.max(0, Math.abs(localX) - pad.halfLen);
        const dZ = Math.max(0, Math.abs(localZ) - pad.halfDepth);
        const edgeDist = Math.hypot(dX, dZ);

        if (edgeDist < pad.blendMargin) {
          const padY = pad.targetY - 0.25;
          if (edgeDist <= 0) {
            currentH = padY;
          } else {
            const tBlend = edgeDist / pad.blendMargin;
            const w = 0.5 * (1.0 + Math.cos(Math.PI * tBlend));
            currentH = w * padY + (1.0 - w) * currentH;
          }
        }
      }
    }

    // Never allow grandstand pads or natural slopes to encroach higher than safe road elevation near track
    if (dist <= roadClearance + 8.0) {
      currentH = Math.min(currentH, safeRoadY);
    }

    return currentH;
  }

  buildEnvironment() {
    const theme = this.trackData.theme || {};
    const lighting = theme.lighting || {};

    // 1. Scene background color and fog
    if (this.scene) {
      this.scene.background = new THREE.Color(theme.skyColor || 0x6ca6cd);
      if (lighting.fogColor) {
        this.scene.fog = new THREE.FogExp2(lighting.fogColor, lighting.fogDensity || 0.0008);
      }
    }

    // 2. Thematic Terrain Ground Mesh with Elevation Contouring (2600m x 2600m, 240x240 grid)
    const terrainSize = 2600;
    const terrainSegments = 240;
    const groundGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    groundGeo.rotateX(-Math.PI / 2);

    const posAttr = groundGeo.attributes.position;
    const pArr = posAttr.array;
    const vCount = posAttr.count;
    const halfW = (this.trackWidth || 16.0) / 2;

    for (let i = 0; i < vCount; i++) {
      const vx = pArr[i * 3];
      const vz = pArr[i * 3 + 2];
      let gy = this.getTerrainHeight(vx, vz);

      // Strict post-processing ground clearance check against racetrack spline
      const snap = this.getClosestTrackPoint(vx, vz, null, null);
      if (snap && snap.distance <= (halfW + 4.5)) {
        gy = Math.min(gy, snap.point.y - 0.25);
      }
      pArr[i * 3 + 1] = gy;
    }
    posAttr.needsUpdate = true;
    groundGeo.computeVertexNormals();

    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512;
    groundCanvas.height = 512;
    const gctx = groundCanvas.getContext('2d');

    const baseHex = '#' + (theme.groundColor || 0x2e6b35).toString(16).padStart(6, '0');
    const detailHex = '#' + (theme.groundDetailColor || 0x24542a).toString(16).padStart(6, '0');

    gctx.fillStyle = baseHex;
    gctx.fillRect(0, 0, 512, 512);

    if (theme.groundType === 'DESERT_SAND') {
      // Golden desert wavy sand ripple pattern
      gctx.fillStyle = detailHex;
      for (let y = 0; y < 512; y += 32) {
        gctx.beginPath();
        gctx.moveTo(0, y);
        for (let x = 0; x <= 512; x += 16) {
          gctx.lineTo(x, y + Math.sin(x * 0.08) * 8);
        }
        gctx.lineTo(512, y + 16);
        gctx.lineTo(0, y + 16);
        gctx.fill();
      }
    } else if (theme.groundType === 'URBAN_ASPHALT' || theme.groundType === 'CITY_PROMENADE') {
      // Urban paving stone tiles
      gctx.fillStyle = detailHex;
      for (let x = 0; x < 512; x += 64) {
        for (let y = 0; y < 512; y += 64) {
          if ((x / 64 + y / 64) % 2 === 0) {
            gctx.fillRect(x + 2, y + 2, 60, 60);
          }
        }
      }
    } else if (theme.groundType === 'MARINA_HARBOR') {
      // Mediterranean harbor promenade pavers & textured maritime waterfront
      gctx.fillStyle = detailHex;
      for (let x = 0; x < 512; x += 32) {
        for (let y = 0; y < 512; y += 32) {
          if ((x / 32 + y / 32) % 2 === 0) {
            gctx.fillRect(x + 1, y + 1, 30, 30);
          }
        }
      }
      // Paved harbor pier curb lines
      gctx.strokeStyle = '#2d3748';
      gctx.lineWidth = 2;
      for (let x = 0; x <= 512; x += 128) {
        gctx.beginPath();
        gctx.moveTo(x, 0);
        gctx.lineTo(x, 512);
        gctx.stroke();
      }
    } else {
      // Standard mowing lawn stripes
      gctx.fillStyle = detailHex;
      for (let y = 0; y < 512; y += 64) {
        gctx.fillRect(0, y, 512, 32);
      }
    }

    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(48, 48);

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.95
    });

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = 0;
    groundMesh.receiveShadow = true;
    this.trackRoot.add(groundMesh);

    // 3. Sky Dome / Cylinder
    const skyGeo = new THREE.CylinderGeometry(1100, 1100, 450, 32, 1, true);
    skyGeo.scale(-1, 1, 1);

    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const sctx = skyCanvas.getContext('2d');
    const skyGrad = sctx.createLinearGradient(0, 0, 0, 512);

    const topSkyHex = '#' + (theme.skyColor || 0x6ca6cd).toString(16).padStart(6, '0');
    const horizHex = '#' + (theme.horizonColor || 0xcae1ff).toString(16).padStart(6, '0');

    skyGrad.addColorStop(0.0, topSkyHex);
    skyGrad.addColorStop(0.7, horizHex);
    skyGrad.addColorStop(1.0, horizHex);
    sctx.fillStyle = skyGrad;
    sctx.fillRect(0, 0, 512, 512);

    // Night stars or fluffy clouds
    if (theme.skyType === 'NIGHT') {
      sctx.fillStyle = '#ffffff';
      for (let i = 0; i < 400; i++) {
        const sx = Math.random() * 512;
        const sy = Math.random() * 320;
        const sr = Math.random() * 1.5 + 0.5;
        sctx.beginPath();
        sctx.arc(sx, sy, sr, 0, Math.PI * 2);
        sctx.fill();
      }
    } else if (theme.skyType === 'DAY' || theme.skyType === 'SUNSET') {
      // Soft procedural cumulus clouds
      sctx.fillStyle = theme.skyType === 'SUNSET' ? 'rgba(253, 230, 138, 0.45)' : 'rgba(255, 255, 255, 0.75)';
      for (let i = 0; i < 20; i++) {
        const cx = Math.random() * 512;
        const cy = 100 + Math.random() * 180;
        const cr = 25 + Math.random() * 45;
        sctx.beginPath();
        sctx.arc(cx, cy, cr, 0, Math.PI * 2);
        sctx.arc(cx + cr * 0.7, cy - 10, cr * 0.8, 0, Math.PI * 2);
        sctx.arc(cx - cr * 0.7, cy - 5, cr * 0.7, 0, Math.PI * 2);
        sctx.fill();
      }
    }

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.position.y = 120;
    this.trackRoot.add(skyMesh);

    // 4. Directional Sun & Ambient Light
    const sunPos = lighting.sunPos || [150, 220, 180];
    const sunLight = new THREE.DirectionalLight(lighting.sunColor || 0xffffff, lighting.sunIntensity || 1.4);
    sunLight.position.set(sunPos[0], sunPos[1], sunPos[2]);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 800;
    const d = 300;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.trackRoot.add(sunLight);

    const ambientLight = new THREE.AmbientLight(lighting.ambientColor || 0xffffff, lighting.ambientIntensity || 0.75);
    this.trackRoot.add(ambientLight);
  }

  buildTrackRibbon() {
    const halfW = this.trackWidth / 2;
    const count = this.sampleCount;
    const pts = this.sampledPoints;
    const up = new THREE.Vector3(0, 1, 0);

    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    let totalDist = 0;

    for (let i = 0; i <= count; i++) {
      const idx = i % count;
      const pt = pts[idx];
      const tgt = this.sampledTangents[idx];
      const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

      if (i > 0) {
        totalDist += pt.distanceTo(pts[(i - 1 + count) % count]);
      }

      // 4 cross-section vertices: left apron, left road, right road, right apron
      const apronExtra = 3.5;
      const lApron = new THREE.Vector3().copy(pt).addScaledVector(normal, -(halfW + apronExtra));
      const lEdge = new THREE.Vector3().copy(pt).addScaledVector(normal, -halfW);
      const rEdge = new THREE.Vector3().copy(pt).addScaledVector(normal, halfW);
      const rApron = new THREE.Vector3().copy(pt).addScaledVector(normal, halfW + apronExtra);

      const vBase = i * 4;

      // Positions
      vertices.push(
        lApron.x, pt.y + 0.005, lApron.z,
        lEdge.x, pt.y + 0.02, lEdge.z,
        rEdge.x, pt.y + 0.02, rEdge.z,
        rApron.x, pt.y + 0.005, rApron.z
      );

      // Upwards normals
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);

      // UVs
      const uDist = totalDist * 0.25;
      uvs.push(
        0.0, uDist,
        0.15, uDist,
        0.85, uDist,
        1.0, uDist
      );

      if (i < count) {
        const nextBase = (i + 1) * 4;
        // Left apron quad
        indices.push(vBase, vBase + 1, nextBase);
        indices.push(vBase + 1, nextBase + 1, nextBase);

        // Asphalt track quad
        indices.push(vBase + 1, vBase + 2, nextBase + 1);
        indices.push(vBase + 2, nextBase + 2, nextBase + 1);

        // Right apron quad
        indices.push(vBase + 2, vBase + 3, nextBase + 2);
        indices.push(vBase + 3, nextBase + 3, nextBase + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    const asphaltTex = TextureFactory.createAsphaltTexture();
    const asphaltNormalMap = TextureFactory.createAsphaltNormalMap();
    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      normalMap: asphaltNormalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const roadMesh = new THREE.Mesh(geo, roadMat);
    roadMesh.receiveShadow = true;
    this.trackRoot.add(roadMesh);
  }

  buildCurbsAndMarkings() {
    const halfW = this.trackWidth / 2;
    const count = this.sampleCount;
    const pts = this.sampledPoints;
    const up = new THREE.Vector3(0, 1, 0);

    const theme = this.trackData.theme || {};
    const curbColors = theme.curbColors || ['#e10600', '#ffffff'];

    // Generate procedural curb texture with theme curb colors
    const curbCanvas = document.createElement('canvas');
    curbCanvas.width = 128;
    curbCanvas.height = 128;
    const cctx = curbCanvas.getContext('2d');

    const segCount = curbColors.length;
    const segH = 128 / segCount;
    for (let s = 0; s < segCount; s++) {
      cctx.fillStyle = curbColors[s];
      cctx.fillRect(0, s * segH, 128, segH);
    }
    // High-contrast bevelling stripe
    cctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    cctx.fillRect(0, 0, 8, 128);
    cctx.fillRect(120, 0, 8, 128);

    const curbTex = new THREE.CanvasTexture(curbCanvas);
    curbTex.wrapS = THREE.RepeatWrapping;
    curbTex.wrapT = THREE.RepeatWrapping;
    curbTex.repeat.set(1, 45);

    const curbMat = new THREE.MeshStandardMaterial({
      map: curbTex,
      roughness: 0.5,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    const createCurbMesh = (sideSign) => {
      const vertices = [];
      const normals = [];
      const uvs = [];
      const indices = [];
      const curbW = 1.4;

      for (let i = 0; i <= count; i++) {
        const idx = i % count;
        const pt = pts[idx];
        const tgt = this.sampledTangents[idx];
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

        const innerPos = new THREE.Vector3().copy(pt).addScaledVector(normal, sideSign * halfW);
        const outerPos = new THREE.Vector3().copy(pt).addScaledVector(normal, sideSign * (halfW + curbW));

        const vBase = i * 2;
        vertices.push(
          innerPos.x, pt.y + 0.035, innerPos.z,
          outerPos.x, pt.y + 0.065, outerPos.z
        );

        normals.push(0, 1, 0, 0, 1, 0);
        const v = (i / count) * 45;
        uvs.push(0.0, v, 1.0, v);

        if (i < count) {
          const nextBase = (i + 1) * 2;
          indices.push(vBase, vBase + 1, nextBase);
          indices.push(vBase + 1, nextBase + 1, nextBase);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      return new THREE.Mesh(geo, curbMat);
    };

    // Left and Right Curbs
    const leftCurb = createCurbMesh(-1);
    const rightCurb = createCurbMesh(1);
    this.trackRoot.add(leftCurb);
    this.trackRoot.add(rightCurb);
  }

  buildTrackBarriers() {
    const barrierDist = this.barrierDistance;
    const count = this.sampleCount;
    const pts = this.sampledPoints;
    const up = new THREE.Vector3(0, 1, 0);
    const theme = this.trackData.theme || {};

    const barrierMat = new THREE.MeshStandardMaterial({
      color: theme.barrierColor || 0x94a3b8,
      metalness: theme.barrierType === 'CONCRETE_WALL' ? 0.1 : 0.7,
      roughness: theme.barrierType === 'CONCRETE_WALL' ? 0.9 : 0.35,
      side: THREE.DoubleSide
    });

    const postMat = new THREE.MeshStandardMaterial({
      color: theme.barrierPostColor || 0x1e293b,
      roughness: 0.8
    });

    // Armco or Concrete Wall Extrusion
    const isConcrete = theme.barrierType === 'CONCRETE_WALL' || theme.barrierType === 'FLOODLIGHT_WALLS';
    const bHeight = isConcrete ? 1.3 : 1.1;

    const createWallMesh = (sideSign) => {
      const vertices = [];
      const normals = [];
      const indices = [];

      for (let i = 0; i <= count; i++) {
        const idx = i % count;
        const pt = pts[idx];
        const tgt = this.sampledTangents[idx];
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

        const basePos = new THREE.Vector3().copy(pt).addScaledVector(normal, sideSign * barrierDist);
        const vBase = i * 2;

        vertices.push(
          basePos.x, pt.y, basePos.z,
          basePos.x, pt.y + bHeight, basePos.z
        );

        normals.push(normal.x * -sideSign, 0, normal.z * -sideSign);
        normals.push(normal.x * -sideSign, 0, normal.z * -sideSign);

        if (i < count) {
          const nextBase = (i + 1) * 2;
          indices.push(vBase, vBase + 1, nextBase);
          indices.push(vBase + 1, nextBase + 1, nextBase);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setIndex(indices);
      return new THREE.Mesh(geo, barrierMat);
    };

    const leftWall = createWallMesh(-1);
    const rightWall = createWallMesh(1);
    leftWall.castShadow = true;
    rightWall.castShadow = true;
    this.trackRoot.add(leftWall);
    this.trackRoot.add(rightWall);

    // Support Posts every ~8 meters
    const postGeo = new THREE.BoxGeometry(0.18, bHeight + 0.1, 0.18);
    for (let i = 0; i < count; i += 3) {
      const pt = pts[i];
      const tgt = this.sampledTangents[i];
      const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

      const lPostPos = new THREE.Vector3().copy(pt).addScaledVector(normal, -barrierDist);
      const lPost = new THREE.Mesh(postGeo, postMat);
      lPost.position.set(lPostPos.x, pt.y + (bHeight / 2), lPostPos.z);
      this.trackRoot.add(lPost);

      const rPostPos = new THREE.Vector3().copy(pt).addScaledVector(normal, barrierDist);
      const rPost = new THREE.Mesh(postGeo, postMat);
      rPost.position.set(rPostPos.x, pt.y + (bHeight / 2), rPostPos.z);
      this.trackRoot.add(rPost);
    }

    // Physical Cannon-es Static Box Colliders for Side Barriers
    if (this.physics && this.physics.world && typeof CANNON !== 'undefined') {
      const step = 2; // High-fidelity 2-sample segments (~5m) prevents chord cutting on tight hairpins
      for (let i = 0; i < count; i += step) {
        const idx1 = i;
        const idx2 = (i + step) % count;
        const pt1 = pts[idx1];
        const pt2 = pts[idx2];
        const tgt1 = this.sampledTangents[idx1];
        const tgt2 = this.sampledTangents[idx2];
        const norm1 = new THREE.Vector3().crossVectors(tgt1, up).normalize();
        const norm2 = new THREE.Vector3().crossVectors(tgt2, up).normalize();

        // Left static barrier box
        const l1 = new THREE.Vector3().copy(pt1).addScaledVector(norm1, -barrierDist);
        const l2 = new THREE.Vector3().copy(pt2).addScaledVector(norm2, -barrierDist);
        const lMid = new THREE.Vector3().addVectors(l1, l2).multiplyScalar(0.5);
        const lSeg = new THREE.Vector3().subVectors(l2, l1);
        const lLen = lSeg.length();

        const leftBody = new CANNON.Body({
          mass: 0,
          position: new CANNON.Vec3(lMid.x, (l1.y + l2.y) / 2 + 0.7, lMid.z),
          shape: new CANNON.Box(new CANNON.Vec3(0.35, 1.0, lLen / 2 + 0.1))
        });
        const lYaw = Math.atan2(lSeg.x, lSeg.z);
        leftBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), lYaw);
        this.physics.world.addBody(leftBody);
        this.physicsBodies.push(leftBody);

        // Right static barrier box
        const r1 = new THREE.Vector3().copy(pt1).addScaledVector(norm1, barrierDist);
        const r2 = new THREE.Vector3().copy(pt2).addScaledVector(norm2, barrierDist);
        const rMid = new THREE.Vector3().addVectors(r1, r2).multiplyScalar(0.5);
        const rSeg = new THREE.Vector3().subVectors(r2, r1);
        const rLen = rSeg.length();

        const rightBody = new CANNON.Body({
          mass: 0,
          position: new CANNON.Vec3(rMid.x, (r1.y + r2.y) / 2 + 0.7, rMid.z),
          shape: new CANNON.Box(new CANNON.Vec3(0.35, 1.0, rLen / 2 + 0.1))
        });
        const rYaw = Math.atan2(rSeg.x, rSeg.z);
        rightBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rYaw);
        this.physics.world.addBody(rightBody);
        this.physicsBodies.push(rightBody);
      }
    }
  }

  buildSuzukaCrossoverBridge() {
    const halfW = this.trackWidth / 2;
    const count = this.sampleCount;
    const pts = this.sampledPoints;
    const up = new THREE.Vector3(0, 1, 0);

    // Suzuka crossover bridge span along the spline: t from 0.585 to 0.680
    const startT = 0.585;
    const endT = 0.680;
    const startIdx = Math.floor(startT * count);
    const endIdx = Math.ceil(endT * count);
    const numSlices = endIdx - startIdx + 1;

    // Materials - Realistic light architectural highway concrete and industrial steel with subtle ambient bounce
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xcfd4dc, // Clean structural highway concrete
      roughness: 0.72,
      metalness: 0.08,
      emissive: 0x353b45, // Soft ambient fill so underside is clearly visible
      side: THREE.DoubleSide
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x5a6578, // Industrial structural steel girders
      roughness: 0.42,
      metalness: 0.65,
      emissive: 0x222832
    });

    const pierMat = new THREE.MeshStandardMaterial({
      color: 0xb4bcc8, // Reinforced concrete pier columns
      roughness: 0.7,
      metalness: 0.05,
      emissive: 0x252a33
    });

    // 1. Continuous 3D Solid Concrete Bridge Deck Structure (Soffit + Fascias + Parapets)
    const deckThickness = 1.1; // 1.1m thick concrete box girder slab
    const wallDist = this.barrierDistance + 0.35; // 11.6m
    const wallHeight = 1.35; // 1.35m parapet height

    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let s = 0; s < numSlices; s++) {
      const idx = (startIdx + s) % count;
      const pt = pts[idx];
      const tgt = this.sampledTangents[idx];
      const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

      // Smoothly blend bridge depth into the natural terrain at the abutment ends
      const edgeFactor = Math.min(1.0, Math.min(s / 4.0, (numSlices - 1 - s) / 4.0));
      const curThick = deckThickness * edgeFactor;
      const yBot = pt.y - curThick;
      const yWall = pt.y + wallHeight * edgeFactor;

      const pBotL = new THREE.Vector3().copy(pt).addScaledVector(normal, -wallDist);
      const pBotR = new THREE.Vector3().copy(pt).addScaledVector(normal, wallDist);
      const pTopL = new THREE.Vector3().copy(pt).addScaledVector(normal, -wallDist);
      const pTopR = new THREE.Vector3().copy(pt).addScaledVector(normal, wallDist);
      const pInL = new THREE.Vector3().copy(pt).addScaledVector(normal, -(wallDist - 0.4));
      const pInR = new THREE.Vector3().copy(pt).addScaledVector(normal, (wallDist - 0.4));

      const vBase = s * 6;
      vertices.push(
        pBotL.x, yBot, pBotL.z, // 0
        pBotR.x, yBot, pBotR.z, // 1
        pTopL.x, yWall, pTopL.z, // 2
        pTopR.x, yWall, pTopR.z, // 3
        pInL.x, yWall, pInL.z,   // 4
        pInR.x, yWall, pInR.z    // 5
      );

      normals.push(
        0, -1, 0,
        0, -1, 0,
        -normal.x, 0, -normal.z,
        normal.x, 0, normal.z,
        normal.x, 0, normal.z,
        -normal.x, 0, -normal.z
      );

      const u = s / (numSlices - 1);
      uvs.push(0, u, 1, u, 0, u, 1, u, 0, u, 1, u);

      if (s < numSlices - 1) {
        const next = (s + 1) * 6;
        // Bottom Soffit quad (visible from underpass below!)
        indices.push(vBase + 0, vBase + 1, next + 1);
        indices.push(vBase + 0, next + 1, next + 0);

        // Left Outer Fascia quad
        indices.push(vBase + 0, next + 0, next + 2);
        indices.push(vBase + 0, next + 2, vBase + 2);

        // Right Outer Fascia quad
        indices.push(vBase + 1, vBase + 3, next + 3);
        indices.push(vBase + 1, next + 3, next + 1);

        // Left Parapet Top quad
        indices.push(vBase + 2, next + 2, next + 4);
        indices.push(vBase + 2, next + 4, vBase + 4);

        // Right Parapet Top quad
        indices.push(vBase + 3, vBase + 5, next + 5);
        indices.push(vBase + 3, next + 5, next + 3);
      }
    }

    const bridgeGeo = new THREE.BufferGeometry();
    bridgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    bridgeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    bridgeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    bridgeGeo.setIndex(indices);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, concreteMat);
    bridgeMesh.castShadow = true;
    bridgeMesh.receiveShadow = true;
    this.trackRoot.add(bridgeMesh);

    // 2. Longitudinal Structural Steel Girders running underneath the bridge deck
    const girderOffsets = [-5.5, 0.0, 5.5];
    const girderGeo = new THREE.BoxGeometry(0.75, 0.9, 4.2);
    for (const gOffset of girderOffsets) {
      for (let s = 2; s < numSlices - 2; s += 2) {
        const idx = (startIdx + s) % count;
        const pt = pts[idx];
        const tgt = this.sampledTangents[idx];
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

        const gPos = new THREE.Vector3().copy(pt).addScaledVector(normal, gOffset);
        const girder = new THREE.Mesh(girderGeo, steelMat);
        girder.position.set(gPos.x, pt.y - 1.1 - 0.45, gPos.z);
        girder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tgt);
        girder.castShadow = true;
        this.trackRoot.add(girder);
      }
    }

    // 3. Heavy Concrete Bridge Pier Columns outside the Underpass Track
    const pierRadius = 0.9;
    const pierHeight = 6.4;
    const colGeo = new THREE.CylinderGeometry(pierRadius, pierRadius * 1.12, pierHeight, 16);
    const colCapGeo = new THREE.BoxGeometry(2.6, 0.95, 18.5);
    const footingGeo = new THREE.BoxGeometry(2.8, 0.8, 2.8);

    // Safety yellow & dark charcoal chevron hazard pattern on pier footings
    const hazardCanvas = document.createElement('canvas');
    hazardCanvas.width = 256;
    hazardCanvas.height = 128;
    const hctx = hazardCanvas.getContext('2d');
    hctx.fillStyle = '#facc15';
    hctx.fillRect(0, 0, 256, 128);
    hctx.fillStyle = '#111827';
    for (let x = -128; x < 384; x += 48) {
      hctx.beginPath();
      hctx.moveTo(x, 0);
      hctx.lineTo(x + 24, 0);
      hctx.lineTo(x - 24, 128);
      hctx.lineTo(x - 48, 128);
      hctx.fill();
    }
    const hazardTex = new THREE.CanvasTexture(hazardCanvas);
    hazardTex.wrapS = THREE.RepeatWrapping;
    hazardTex.repeat.set(2, 1);
    const hazardMat = new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.6 });

    const underPt = this.curve.getPointAt(0.412);
    const underTgt = this.curve.getTangentAt(0.412).normalize();
    const underNorm = new THREE.Vector3().crossVectors(underTgt, up).normalize();

    for (const sideSign of [-1, 1]) {
      const pierCenter = new THREE.Vector3().copy(underPt).addScaledVector(underNorm, sideSign * (halfW + 4.2));

      // Twin supporting columns per side
      for (const colOffset of [-3.8, 3.8]) {
        const colPos = new THREE.Vector3().copy(pierCenter).addScaledVector(underTgt, colOffset);
        const col = new THREE.Mesh(colGeo, pierMat);
        col.position.set(colPos.x, pierHeight / 2 - 0.25, colPos.z);
        col.castShadow = true;
        this.trackRoot.add(col);

        // Crash footing with hazard stripes
        const baseRing = new THREE.Mesh(footingGeo, hazardMat);
        baseRing.position.set(colPos.x, 0.2, colPos.z);
        baseRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), underTgt);
        this.trackRoot.add(baseRing);
      }

      // Concrete Pier Cap Beam (Crosshead)
      const cap = new THREE.Mesh(colCapGeo, pierMat);
      cap.position.set(pierCenter.x, pierHeight - 0.45, pierCenter.z);
      cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), underTgt);
      cap.castShadow = true;
      this.trackRoot.add(cap);
    }

    // 4. Iconic Overhead Highway Bridge Fascia Banner mounted flush on outer bridge fascia
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 1024;
    bannerCanvas.height = 128;
    const bctx = bannerCanvas.getContext('2d');
    bctx.fillStyle = '#0f172a';
    bctx.fillRect(0, 0, 1024, 128);
    bctx.fillStyle = '#e10600';
    bctx.fillRect(0, 0, 24, 128);
    bctx.fillRect(1000, 0, 24, 128);
    bctx.fillRect(24, 114, 976, 14);
    bctx.fillStyle = '#ffffff';
    bctx.font = '900 38px Arial, sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('🏎️  SUZUKA CIRCUIT  •  JAPANESE GRAND PRIX  •  HONDA  🇯🇵', 512, 60);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });

    const bridgePt = this.curve.getPointAt(0.635);
    const bridgeTgt = this.curve.getTangentAt(0.635).normalize();
    const bridgeNorm = new THREE.Vector3().crossVectors(bridgeTgt, up).normalize();

    // Facing oncoming cars approaching from Degner:
    const fasciaDir = new THREE.Vector3(-bridgeNorm.x, 0, -bridgeNorm.z).normalize();
    const bannerPos = new THREE.Vector3().copy(bridgePt)
      .addScaledVector(bridgeNorm, -wallDist - 0.08);
    bannerPos.y += 0.45; // Centered on parapet fascia

    const bannerGeo = new THREE.PlaneGeometry(22.0, 1.7);
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.position.copy(bannerPos);
    bannerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fasciaDir);
    this.trackRoot.add(bannerMesh);

    // 5. Underpass Ceiling Floodlights (Authentic underpass illumination)
    const underLight1 = new THREE.PointLight(0xfff6ea, 2.0, 26, 1.2);
    underLight1.position.set(underPt.x - underTgt.x * 3.5, underPt.y + 3.8, underPt.z - underTgt.z * 3.5);
    this.trackRoot.add(underLight1);

    const underLight2 = new THREE.PointLight(0xfff6ea, 2.0, 26, 1.2);
    underLight2.position.set(underPt.x + underTgt.x * 3.5, underPt.y + 3.8, underPt.z + underTgt.z * 3.5);
    this.trackRoot.add(underLight2);
  }

  buildStartFinishLine() {
    const halfW = this.trackWidth / 2;
    const pt = this.curve.getPointAt(0.0);
    const tgt = this.curve.getTangentAt(0.0).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

    // Checkered Start / Finish line
    const checkerCanvas = document.createElement('canvas');
    checkerCanvas.width = 128;
    checkerCanvas.height = 32;
    const cctx = checkerCanvas.getContext('2d');
    cctx.fillStyle = '#ffffff';
    cctx.fillRect(0, 0, 128, 32);
    cctx.fillStyle = '#111827';
    for (let x = 0; x < 128; x += 16) {
      for (let y = 0; y < 32; y += 16) {
        if ((x / 16 + y / 16) % 2 === 0) cctx.fillRect(x, y, 16, 16);
      }
    }

    const checkerTex = new THREE.CanvasTexture(checkerCanvas);
    const checkerMat = new THREE.MeshBasicMaterial({ map: checkerTex });
    const lineGeo = new THREE.PlaneGeometry(this.trackWidth - 1.2, 2.4);
    lineGeo.rotateX(-Math.PI / 2);

    const lineMesh = new THREE.Mesh(lineGeo, checkerMat);
    lineMesh.position.set(pt.x, pt.y + 0.04, pt.z);
    lineMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tgt);
    this.trackRoot.add(lineMesh);

    // 10 Starting Grid Boxes (P1 to P10) in staggered 2x2 layout
    const boxMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const stopBarMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let slot = 1; slot <= 10; slot++) {
      const slotT = (1.0 - (slot * 0.0065)) % 1.0;
      const bPt = this.curve.getPointAt(slotT);
      const bTgt = this.curve.getTangentAt(slotT).normalize();
      const bNorm = new THREE.Vector3().crossVectors(bTgt, up).normalize();

      const sideSign = (slot % 2 === 1) ? -1 : 1;
      const sideDist = 3.2 * sideSign;
      const boxCenter = new THREE.Vector3().copy(bPt).addScaledVector(bNorm, sideDist);

      const bW = 2.4;
      const bL = 4.8;
      const hW = bW / 2;
      const hL = bL / 2;

      const p1 = new THREE.Vector3(-hW, 0.04, -hL);
      const p2 = new THREE.Vector3(hW, 0.04, -hL);
      const p3 = new THREE.Vector3(hW, 0.04, hL);
      const p4 = new THREE.Vector3(-hW, 0.04, hL);

      const boxPoints = [p1, p2, p3, p4, p1];
      const boxGeo = new THREE.BufferGeometry().setFromPoints(boxPoints);
      const boxLine = new THREE.Line(boxGeo, boxMat);
      boxLine.position.set(boxCenter.x, bPt.y + 0.04, boxCenter.z);
      boxLine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bTgt);
      this.trackRoot.add(boxLine);

      // Front stop bar
      const barGeo = new THREE.PlaneGeometry(bW + 0.4, 0.3);
      barGeo.rotateX(-Math.PI / 2);
      const barMesh = new THREE.Mesh(barGeo, stopBarMat);
      barMesh.position.set(boxCenter.x, bPt.y + 0.045, boxCenter.z);
      barMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bTgt);
      barMesh.translateZ(hL);
      this.trackRoot.add(barMesh);
    }
  }

  buildStartFinishGantry() {
    const pt = this.curve.getPointAt(0.0);
    const tgt = this.curve.getTangentAt(0.0).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

    const gantryGroup = new THREE.Group();
    const spanW = this.trackWidth + 8;
    const gHeight = 9.0;

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4 });
    const postGeo = new THREE.BoxGeometry(0.8, gHeight, 0.8);

    // Left pillar
    const lPost = new THREE.Mesh(postGeo, metalMat);
    lPost.position.set(-spanW / 2, gHeight / 2, 0);
    gantryGroup.add(lPost);

    // Right pillar
    const rPost = new THREE.Mesh(postGeo, metalMat);
    rPost.position.set(spanW / 2, gHeight / 2, 0);
    gantryGroup.add(rPost);

    // Overhead truss
    const beamGeo = new THREE.BoxGeometry(spanW + 1.2, 1.2, 1.2);
    const beam = new THREE.Mesh(beamGeo, metalMat);
    beam.position.set(0, gHeight - 0.6, 0);
    gantryGroup.add(beam);

    // Overhead sponsor board
    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 512;
    boardCanvas.height = 128;
    const bctx = boardCanvas.getContext('2d');
    bctx.fillStyle = '#0f172a';
    bctx.fillRect(0, 0, 512, 128);
    bctx.fillStyle = '#e10600';
    bctx.fillRect(0, 0, 16, 128);
    bctx.fillRect(496, 0, 16, 128);
    bctx.fillStyle = '#ffffff';
    bctx.font = 'bold 44px "Arial Black", sans-serif';
    bctx.textAlign = 'center';
    bctx.fillText(this.trackData.name.toUpperCase(), 256, 76);

    const boardTex = new THREE.CanvasTexture(boardCanvas);
    const boardMat = new THREE.MeshBasicMaterial({ map: boardTex });
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(spanW - 4, 1.6), boardMat);
    boardMesh.position.set(0, gHeight - 0.6, 0.65);
    gantryGroup.add(boardMesh);

    gantryGroup.position.set(pt.x, pt.y, pt.z);
    gantryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tgt);
    this.trackRoot.add(gantryGroup);
  }

  buildBrakeMarkers() {
    const pts = this.sampledPoints;
    const count = this.sampleCount;
    const up = new THREE.Vector3(0, 1, 0);
    const halfW = this.trackWidth / 2;

    const boardCanvas = (num) => {
      const cvs = document.createElement('canvas');
      cvs.width = 128;
      cvs.height = 128;
      const ctx = cvs.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#111827';
      ctx.fillRect(6, 6, 116, 116);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(num, 64, 82);
      return new THREE.CanvasTexture(cvs);
    };

    const tex150 = boardCanvas('150');
    const tex100 = boardCanvas('100');
    const tex50 = boardCanvas('50');

    const mGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x334155 });

    // Place markers before heavy curvature points
    for (let i = 10; i < count; i += 20) {
      const prev = pts[(i - 6 + count) % count];
      const pt = pts[i];
      const next = pts[(i + 6) % count];
      const dir1 = new THREE.Vector3().subVectors(pt, prev).normalize();
      const dir2 = new THREE.Vector3().subVectors(next, pt).normalize();
      const curvature = Math.abs(new THREE.Vector3().crossVectors(dir1, dir2).y);

      if (curvature > 0.02) {
        // Skip elevated bridge spans where there is no roadside terrain
        if (this.trackData && this.trackData.id === 'suzuka') {
          const tVal = i / count;
          if (tVal >= 0.54 && tVal <= 0.72) {
            i += 10;
            continue;
          }
        }

        // Place 150m, 100m, 50m before corner entry
        const offsets = [-14, -10, -6];
        const texs = [tex150, tex100, tex50];

        for (let m = 0; m < 3; m++) {
          const mIdx = (i + offsets[m] + count) % count;
          const mPt = pts[mIdx];
          const mTgt = this.sampledTangents[mIdx];
          const mNorm = new THREE.Vector3().crossVectors(mTgt, up).normalize();

          const bPos = new THREE.Vector3().copy(mPt).addScaledVector(mNorm, -(halfW + 2.4));

          // Skip if on elevated bridge or if ground elevation is far below track
          if (this.trackData && this.trackData.id === 'suzuka') {
            const m_tVal = mIdx / count;
            if (m_tVal >= 0.54 && m_tVal <= 0.72) continue;
          }
          const groundY = this.getTerrainHeight(bPos.x, bPos.z);
          if (Math.abs(groundY - mPt.y) > 1.8) continue;

          const markerGroup = new THREE.Group();

          const post = new THREE.Mesh(postGeo, pMat);
          post.position.y = 0.9;
          markerGroup.add(post);

          const mat = new THREE.MeshBasicMaterial({ map: texs[m], side: THREE.DoubleSide });
          const board = new THREE.Mesh(mGeo, mat);
          board.position.y = 1.4;
          markerGroup.add(board);

          markerGroup.position.set(bPos.x, mPt.y, bPos.z);
          markerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), mTgt);
          this.trackRoot.add(markerGroup);
        }
        i += 30; // Skip ahead after braking zone
      }
    }
  }

  buildSponsorHoardings() {
    const sponsors = ['PIRELLI', 'ROLEX', 'ARAMCO', 'DHL', 'HEINEKEN', 'CRYPTO.COM'];
    const pts = this.sampledPoints;
    const count = this.sampleCount;
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 20; i < count; i += 30) {
      // Skip elevated bridge span for Suzuka as bridge has integrated parapets and banners
      if (this.trackData && this.trackData.id === 'suzuka') {
        const tVal = i / count;
        if (tVal >= 0.54 && tVal <= 0.72) continue;
      }

      const pt = pts[i];
      const tgt = this.sampledTangents[i];
      const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();
      const sponsor = sponsors[Math.floor(i / 30) % sponsors.length];

      const cvs = document.createElement('canvas');
      cvs.width = 256;
      cvs.height = 64;
      const ctx = cvs.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#e10600';
      ctx.fillRect(0, 0, 10, 64);
      ctx.fillRect(246, 0, 10, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sponsor, 128, 44);

      const tex = new THREE.CanvasTexture(cvs);
      const mat = new THREE.MeshBasicMaterial({ map: tex });

      // Place flush on the barrier on both sides facing INTO the track
      for (const side of [-1, 1]) {
        const outward = new THREE.Vector3().copy(normal).multiplyScalar(side).normalize();
        const inward = outward.clone().negate();
        const xBasis = new THREE.Vector3().crossVectors(inward, up).normalize();
        const rotMatrix = new THREE.Matrix4().makeBasis(xBasis, up, inward);

        const hMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 1.0), mat);
        hMesh.quaternion.setFromRotationMatrix(rotMatrix);
        hMesh.position.copy(pt).addScaledVector(outward, this.barrierDistance - 0.05);
        hMesh.position.y += 0.65;
        this.trackRoot.add(hMesh);
      }
    }
  }

  /**
   * Generates a high-density procedural spectator crowd texture with official F1 team supporter colors
   */
  createCrowdTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Bleacher background
    ctx.fillStyle = '#222733';
    ctx.fillRect(0, 0, 1024, 512);

    const teamColors = [
      '#e10600', // Ferrari Red
      '#06152b', // Red Bull Navy
      '#ffd000', // Yellow
      '#00d2be', // Mercedes Teal
      '#ff8700', // McLaren Papaya
      '#00594f', // Aston Martin Green
      '#ffffff', // White
      '#52e0ff', // Williams Cyan
      '#2b2d33'  // Dark Jacket
    ];

    const skinTones = ['#f5d0b0', '#e0b58e', '#c68642', '#8d5524', '#ffdbac'];
    const rows = 10;
    const rowH = 512 / rows;

    for (let r = 0; r < rows; r++) {
      const yBase = r * rowH;
      ctx.fillStyle = '#141821';
      ctx.fillRect(0, yBase, 1024, 4);
      ctx.fillStyle = '#2a3140';
      ctx.fillRect(0, yBase + 4, 1024, 7);

      const cols = 105;
      const colW = 1024 / cols;

      for (let c = 0; c < cols; c++) {
        const x = c * colW + (Math.random() * 2 - 1);
        const y = yBase + 11;
        if (Math.random() < 0.04) continue;

        const shirtColor = teamColors[Math.floor(Math.random() * teamColors.length)];
        const skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];

        ctx.fillStyle = shirtColor;
        ctx.fillRect(x, y + 10, colW - 1.2, rowH - 18);

        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(x + colW / 2, y + 6, colW / 2.3, 0, Math.PI * 2);
        ctx.fill();

        if (Math.random() < 0.72) {
          const capColor = (Math.random() < 0.6) ? shirtColor : '#ffffff';
          ctx.fillStyle = capColor;
          ctx.beginPath();
          ctx.arc(x + colW / 2, y + 4.5, colW / 2.3, Math.PI, Math.PI * 2);
          ctx.fill();
        }

        if (Math.random() < 0.08) {
          ctx.fillStyle = teamColors[Math.floor(Math.random() * teamColors.length)];
          ctx.fillRect(x - 2, y - 4, 6, 4);
        }
      }

      if (r % 3 === 0) {
        for (let b = 0; b < 6; b++) {
          if (Math.random() < 0.55) {
            const bx = b * 170 + 25;
            ctx.fillStyle = teamColors[b % teamColors.length];
            ctx.fillRect(bx, yBase + rowH - 8, 85, 8);
          }
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  /**
   * Constructs a single high-detail Grandstand with bleachers, roof, 3D fans, and sponsor fascia.
   * Uses strict right-handed orthonormal basis:
   * Local +X = along track length (parallel to tangent)
   * Local +Y = vertical (up)
   * Local +Z = outward away from track into spectator area
   */
  buildSingleGrandstand(spec, crowdTex) {
    const pt = this.curve.getPointAt(spec.t);
    const tgt = this.curve.getTangentAt(spec.t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

    const gsGroup = new THREE.Group();

    // Orthonormal basis: local Z points away from track, local X runs parallel along track
    const outward = new THREE.Vector3().copy(normal).multiplyScalar(spec.side).normalize();
    const xBasis = new THREE.Vector3().crossVectors(up, outward).normalize();
    const rotMatrix = new THREE.Matrix4().makeBasis(xBasis, up, outward);
    gsGroup.quaternion.setFromRotationMatrix(rotMatrix);
    gsGroup.position.copy(pt).addScaledVector(outward, spec.dist);

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x474f5e, roughness: 0.9, metalness: 0.1 });
    const concourseMat = new THREE.MeshStandardMaterial({ color: 0x333b47, roughness: 0.92, metalness: 0.08 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x222630, roughness: 0.4, metalness: 0.8 });
    const crowdMat = new THREE.MeshStandardMaterial({ map: crowdTex, roughness: 0.75, metalness: 0.1 });
    const roofMat = new THREE.MeshStandardMaterial({ color: spec.roofColor || 0xe10600, roughness: 0.35, metalness: 0.65 });
    const railingMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.85 });

    // 0. Paved Spectator Concourse Apron (Pedestrian plaza extending around the grandstand)
    const apronGeo = new THREE.BoxGeometry(spec.length + 6.0, 0.35, spec.depth + 6.0);
    const apronMesh = new THREE.Mesh(apronGeo, concourseMat);
    apronMesh.position.set(0, 0.175, (spec.depth + 2.0) / 2);
    apronMesh.receiveShadow = true;
    gsGroup.add(apronMesh);

    // 1. Foundation Base Slab & Deep Retaining Skirt (Solid 7m deep foundation into the earth)
    const skirtDepth = 7.0;
    const baseGeo = new THREE.BoxGeometry(spec.length + 1.2, skirtDepth + 1.2, spec.depth + 3.0);
    const baseMesh = new THREE.Mesh(baseGeo, concreteMat);
    baseMesh.position.set(0, 1.2 - (skirtDepth + 1.2) / 2, (spec.depth + 2) / 2);
    baseMesh.receiveShadow = true;
    gsGroup.add(baseMesh);

    // Concrete side retaining walls (anchoring into slope)
    const sideWallGeo = new THREE.BoxGeometry(0.8, spec.height * 0.75 + skirtDepth, spec.depth + 3.0);
    const leftSideWall = new THREE.Mesh(sideWallGeo, concreteMat);
    leftSideWall.position.set(-spec.length / 2 - 0.4, 1.2 + (spec.height * 0.75 - skirtDepth) / 2, (spec.depth + 2) / 2);
    gsGroup.add(leftSideWall);

    const rightSideWall = new THREE.Mesh(sideWallGeo, concreteMat);
    rightSideWall.position.set(spec.length / 2 + 0.4, 1.2 + (spec.height * 0.75 - skirtDepth) / 2, (spec.depth + 2) / 2);
    gsGroup.add(rightSideWall);

    // Rear concrete retaining wall
    const rearWallGeo = new THREE.BoxGeometry(spec.length + 2.0, spec.height * 0.8 + skirtDepth, 0.8);
    const rearWall = new THREE.Mesh(rearWallGeo, concreteMat);
    rearWall.position.set(0, 1.2 + (spec.height * 0.8 - skirtDepth) / 2, spec.depth + 2.4);
    gsGroup.add(rearWall);

    // 2. Stepped Bleachers
    const rowCount = spec.rows;
    const stepDepth = spec.depth / rowCount;
    const stepRise = (spec.height * 0.7) / rowCount;

    for (let r = 0; r < rowCount; r++) {
      const stepY = 1.2 + r * stepRise;
      const stepZ = 1.0 + r * stepDepth;

      const stepGeo = new THREE.BoxGeometry(spec.length - 0.5, stepRise + 0.1, stepDepth + 0.2);
      const stepMesh = new THREE.Mesh(stepGeo, concreteMat);
      stepMesh.position.set(0, stepY + stepRise / 2, stepZ + stepDepth / 2);
      gsGroup.add(stepMesh);
    }

    // Sloped Crowd Plane covering the tiered seating area
    const slopeLen = Math.sqrt(spec.depth * spec.depth + (spec.height * 0.7) * (spec.height * 0.7));
    const crowdGeo = new THREE.PlaneGeometry(spec.length - 1.0, slopeLen);
    const crowdMesh = new THREE.Mesh(crowdGeo, crowdMat);
    const angle = Math.atan2(spec.height * 0.7, spec.depth);
    crowdMesh.rotation.x = -Math.PI / 2 + angle;
    crowdMesh.position.set(0, 1.2 + (spec.height * 0.7) / 2 + 0.1, 1.0 + spec.depth / 2);
    gsGroup.add(crowdMesh);

    // 3. Front Walkway & Metal Safety Railing
    const railPostGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6);
    const railBarGeo = new THREE.BoxGeometry(spec.length, 0.06, 0.06);

    const railBar = new THREE.Mesh(railBarGeo, railingMat);
    railBar.position.set(0, 2.3, 0.6);
    gsGroup.add(railBar);

    for (let x = -spec.length / 2 + 2; x <= spec.length / 2 - 2; x += 5) {
      const rPost = new THREE.Mesh(railPostGeo, railingMat);
      rPost.position.set(x, 1.75, 0.6);
      gsGroup.add(rPost);
    }

    // 4. Stylized 3D Front-Row Fans along Railing
    const spectatorColors = [0xe10600, 0x06152b, 0x00d2be, 0xff8700, 0x00594f, 0xffffff, 0xffd000];
    const spectatorCount = Math.floor(spec.length / 3.2);
    const torsoGeo = new THREE.BoxGeometry(0.48, 0.65, 0.32);
    const headGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const armGeo = new THREE.BoxGeometry(0.14, 0.45, 0.14);

    for (let i = 0; i < spectatorCount; i++) {
      const sx = -spec.length / 2 + 2 + i * 3.2 + (Math.random() * 0.6 - 0.3);
      const color = spectatorColors[i % spectatorColors.length];
      const fanMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c199, roughness: 0.8 });

      const person = new THREE.Group();
      const torso = new THREE.Mesh(torsoGeo, fanMat);
      torso.position.y = 1.6;
      person.add(torso);

      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 2.05;
      person.add(head);

      const leftArm = new THREE.Mesh(armGeo, fanMat);
      leftArm.position.set(-0.3, 1.8, -0.1);
      leftArm.rotation.x = Math.PI / 4;
      person.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, fanMat);
      rightArm.position.set(0.3, 1.8, -0.1);
      rightArm.rotation.x = Math.PI / 4;
      person.add(rightArm);

      if (i % 3 === 0) {
        const miniFlagGeo = new THREE.PlaneGeometry(0.55, 0.38);
        const miniFlagMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
        const miniFlag = new THREE.Mesh(miniFlagGeo, miniFlagMat);
        miniFlag.position.set(0.35, 2.15, -0.2);
        person.add(miniFlag);
      }

      person.position.set(sx, 0, 0.9);
      gsGroup.add(person);
    }

    // 5. Rear Wall & Steel Support Pillars
    const backWallGeo = new THREE.BoxGeometry(spec.length, spec.height, 0.6);
    const backWall = new THREE.Mesh(backWallGeo, concreteMat);
    backWall.position.set(0, spec.height / 2, spec.depth + 1.8);
    gsGroup.add(backWall);

    const pillarCount = Math.floor(spec.length / 12) + 1;
    const pillarGeo = new THREE.CylinderGeometry(0.35, 0.4, spec.height + 2, 8);
    for (let p = 0; p < pillarCount; p++) {
      const px = -spec.length / 2 + (p / (pillarCount - 1)) * spec.length;
      const pillar = new THREE.Mesh(pillarGeo, steelMat);
      pillar.position.set(px, (spec.height + 2) / 2, spec.depth + 1.8);
      gsGroup.add(pillar);
    }

    // 6. Cantilevered Roof Canopy
    const roofOverhang = spec.depth + 3.0;
    const roofGeo = new THREE.BoxGeometry(spec.length + 2, 0.45, roofOverhang);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, spec.height + 1.2, roofOverhang / 2 - 0.5);
    roofMesh.rotation.x = -0.06;
    gsGroup.add(roofMesh);

    // Diagonal cantilever trusses
    for (let p = 0; p < pillarCount; p++) {
      const px = -spec.length / 2 + (p / (pillarCount - 1)) * spec.length;
      const trussGeo = new THREE.CylinderGeometry(0.12, 0.12, roofOverhang * 0.75, 6);
      const truss = new THREE.Mesh(trussGeo, steelMat);
      truss.position.set(px, spec.height + 0.3, roofOverhang * 0.45);
      truss.rotation.x = Math.PI / 4;
      gsGroup.add(truss);
    }

    // 7. Roof Fascia Sponsor Billboard Facing the Track
    const fCanvas = document.createElement('canvas');
    fCanvas.width = 512;
    fCanvas.height = 64;
    const fctx = fCanvas.getContext('2d');
    fctx.fillStyle = '#0f131a';
    fctx.fillRect(0, 0, 512, 64);
    fctx.fillStyle = '#ffffff';
    fctx.font = '900 32px Arial';
    fctx.textAlign = 'center';
    fctx.textBaseline = 'middle';
    fctx.fillText((spec.sponsor || 'FORMULA 1') + ' GRANDSTAND', 256, 32);

    const fTex = new THREE.CanvasTexture(fCanvas);
    const fasciaGeo = new THREE.PlaneGeometry(spec.length, 1.4);
    const fasciaMat = new THREE.MeshBasicMaterial({ map: fTex, side: THREE.DoubleSide });
    const fascia = new THREE.Mesh(fasciaGeo, fasciaMat);
    fascia.position.set(0, spec.height + 1.2, -0.6);
    fascia.rotation.y = Math.PI; // Face inward toward track
    gsGroup.add(fascia);

    // 8. Roof Team Flags
    const flagPoleCount = 5;
    const flagPoleGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.0, 6);
    const flagColors = [0xe10600, 0x06152b, 0x00d2be, 0xff8700, 0xffffff];

    for (let f = 0; f < flagPoleCount; f++) {
      const fx = -spec.length / 2 + 5 + (f / (flagPoleCount - 1)) * (spec.length - 10);
      const pole = new THREE.Mesh(flagPoleGeo, steelMat);
      pole.position.set(fx, spec.height + 3.2, spec.depth + 1.8);
      gsGroup.add(pole);

      const flagMeshGeo = new THREE.PlaneGeometry(2.4, 1.4);
      const flagMeshMat = new THREE.MeshStandardMaterial({
        color: flagColors[f % flagColors.length],
        side: THREE.DoubleSide,
        roughness: 0.6
      });
      const flagMesh = new THREE.Mesh(flagMeshGeo, flagMeshMat);
      flagMesh.position.set(fx + 1.2, spec.height + 4.2, spec.depth + 1.8);
      gsGroup.add(flagMesh);

      if (this.animatedFlags) {
        this.animatedFlags.push(flagMesh);
      }
    }

    // 9. FIA Safety Catch Fence
    const fencePostGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.5, 6);
    const fenceWireGeo = new THREE.PlaneGeometry(spec.length, 2.5);
    const fenceWireMat = new THREE.MeshBasicMaterial({
      color: 0x888888,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });

    const fenceWire = new THREE.Mesh(fenceWireGeo, fenceWireMat);
    fenceWire.position.set(0, 1.75, -1.8);
    gsGroup.add(fenceWire);

    for (let x = -spec.length / 2; x <= spec.length / 2; x += 6) {
      const fPost = new THREE.Mesh(fencePostGeo, steelMat);
      fPost.position.set(x, 1.75, -1.8);
      gsGroup.add(fPost);
    }

    this.trackRoot.add(gsGroup);
  }

  /**
   * Builds realistic spectator grandstands around high-speed zones and corner stadiums.
   * Specifically addresses the Monza Curva Parabolica (last turn) and main straight viewing areas.
   */
  buildGrandstandsAndAudience() {
    this.animatedFlags = [];
    const crowdTex = this.createCrowdTexture();

    const specs = this.grandstandSpecs || [];
    for (const spec of specs) {
      this.buildSingleGrandstand(spec, crowdTex);
    }
  }

  /**
   * Builds the Pit Facility Complex parallel to the main straight on the infield side.
   * Includes 10 team garages, pit lane apron, pit wall with team telemetry perches, and VIP hospitality.
   * Guaranteed ZERO intersection with the track surface.
   */
  buildPitComplex() {
    const isMonaco = this.trackData.id === 'monaco';
    const isSilverstone = this.trackData.id === 'silverstone';
    // Monaco GP has a compact street circuit; center pit complex along straight (t = 0.095)
    // Silverstone Wing sits along Hamilton straight centered at t = 0.015
    const pitT = isMonaco ? 0.095 : (isSilverstone ? 0.015 : 0.04);
    const pt = this.curve.getPointAt(pitT);
    const tgt = this.curve.getTangentAt(pitT).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

    // Infield side (+normal)
    const pitSide = 1;
    const outward = new THREE.Vector3().copy(normal).multiplyScalar(pitSide).normalize();
    const xBasis = new THREE.Vector3().crossVectors(up, outward).normalize();
    const rotMatrix = new THREE.Matrix4().makeBasis(xBasis, up, outward);

    const pitGroup = new THREE.Group();
    pitGroup.quaternion.setFromRotationMatrix(rotMatrix);

    // Place pit group origin safely off the track at distance: barrierDistance + 4.0m
    const pitDist = this.barrierDistance + 4.0;
    pitGroup.position.copy(pt).addScaledVector(outward, pitDist);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.6 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.7 });

    const bLen = isMonaco ? 110 : 130;
    const bHeight = 8.5;
    const bDepth = isMonaco ? 15 : 16;
    const wallApronLen = bLen + (isMonaco ? 12 : 20);

    // 1. Pit Lane Apron Roadway (Runs parallel to track between pit wall and garage doors)
    const apronGeo = new THREE.PlaneGeometry(wallApronLen, 8.0);
    apronGeo.rotateX(-Math.PI / 2);
    const apron = new THREE.Mesh(apronGeo, concreteMat);
    apron.position.set(0, 0.03, 3.5);
    pitGroup.add(apron);

    // Speed limit line along the pit lane edge
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const yLineGeo = new THREE.PlaneGeometry(wallApronLen, 0.25);
    yLineGeo.rotateX(-Math.PI / 2);
    const yLine = new THREE.Mesh(yLineGeo, yellowLineMat);
    yLine.position.set(0, 0.035, -0.4);
    pitGroup.add(yLine);

    // 2. Concrete Pit Wall separating track barrier from pit lane
    const pitWallGeo = new THREE.BoxGeometry(wallApronLen, 1.1, 0.6);
    const pitWall = new THREE.Mesh(pitWallGeo, wallMat);
    pitWall.position.set(0, 0.55, -0.8);
    pitGroup.add(pitWall);

    // Pit Wall Catch Fence & Team Perches (Command Stands)
    const perchGeo = new THREE.BoxGeometry(3.2, 1.8, 1.6);
    const perchRoofGeo = new THREE.BoxGeometry(3.6, 0.15, 2.0);
    const screenGeo = new THREE.BoxGeometry(1.2, 0.7, 0.05);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const perchSpan = bLen - 30;
    for (let i = 0; i < 5; i++) {
      const p = -perchSpan / 2 + i * (perchSpan / 4);
      const perchGroup = new THREE.Group();
      const perch = new THREE.Mesh(perchGeo, metalMat);
      perch.position.set(0, 0.9, 0);
      perchGroup.add(perch);

      const perchRoof = new THREE.Mesh(perchRoofGeo, wallMat);
      perchRoof.position.set(0, 2.2, 0);
      perchGroup.add(perchRoof);

      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 1.4, 0.75);
      perchGroup.add(screen);

      perchGroup.position.set(p, 0, -0.8);
      pitGroup.add(perchGroup);
    }

    // 3. Main Pit Building (10 Team Garages + VIP Hospitality)
    // Positioned at z = 7.5 + bDepth/2, so front wall is at local z = 7.5 (23m from track centerline)
    const building = new THREE.Mesh(new THREE.BoxGeometry(bLen, bHeight, bDepth), wallMat);
    building.position.set(0, bHeight / 2, 7.5 + bDepth / 2);
    pitGroup.add(building);

    // Upper level VIP viewing glass gallery
    const vipGallery = new THREE.Mesh(new THREE.BoxGeometry(bLen - 4, 3.2, 0.2), glassMat);
    vipGallery.position.set(0, 6.2, 7.4);
    pitGroup.add(vipGallery);

    // 4. 10 Team Garage Doors on Front Wall (facing pit lane at z = 7.4)
    const shutterWidth = isMonaco ? 7.6 : 8.8;
    const shutterGeo = new THREE.BoxGeometry(shutterWidth, 4.0, 0.15);
    const teamNames = [
      'FERRARI', 'ORION RACING', 'MERCEDES', 'MCLAREN', 'ASTON MARTIN',
      'ALPINE', 'WILLIAMS', 'HAAS', 'SAUBER', 'RB'
    ];
    const teamColors = [
      '#e10600', '#06152b', '#00d2be', '#ff8700', '#00594f',
      '#0090ff', '#52e0ff', '#b6babd', '#00e700', '#6692ff'
    ];

    const garageSpan = bLen - 20;
    const garageSpacing = garageSpan / 9;
    const startGx = -garageSpan / 2;

    for (let g = 0; g < 10; g++) {
      const gx = startGx + g * garageSpacing;

      // Shutter door
      const shutter = new THREE.Mesh(shutterGeo, shutterMat);
      shutter.position.set(gx, 2.0, 7.42);
      pitGroup.add(shutter);

      // Team sponsor sign above garage
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 256;
      signCanvas.height = 64;
      const sctx = signCanvas.getContext('2d');
      sctx.fillStyle = '#0f172a';
      sctx.fillRect(0, 0, 256, 64);
      sctx.fillStyle = teamColors[g];
      sctx.fillRect(0, 56, 256, 8);
      sctx.fillStyle = '#ffffff';
      sctx.font = 'bold 26px Arial, sans-serif';
      sctx.textAlign = 'center';
      sctx.textBaseline = 'middle';
      sctx.fillText(teamNames[g], 128, 28);

      const signTex = new THREE.CanvasTexture(signCanvas);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(shutterWidth * 0.95, 1.4), signMat);
      signMesh.position.set(gx, 4.4, 7.42);
      signMesh.rotation.y = Math.PI; // Face towards the pit lane
      pitGroup.add(signMesh);

      // Pit Stop Box on Apron (Red/Yellow box where car stops)
      const boxMat = new THREE.LineBasicMaterial({ color: 0xffffff });
      const boxHalfW = shutterWidth * 0.4;
      const boxPts = [
        new THREE.Vector3(gx - boxHalfW, 0.04, 1.5),
        new THREE.Vector3(gx + boxHalfW, 0.04, 1.5),
        new THREE.Vector3(gx + boxHalfW, 0.04, 5.5),
        new THREE.Vector3(gx - boxHalfW, 0.04, 5.5),
        new THREE.Vector3(gx - boxHalfW, 0.04, 1.5)
      ];
      const boxGeo = new THREE.BufferGeometry().setFromPoints(boxPts);
      const pitBoxLine = new THREE.Line(boxGeo, boxMat);
      pitGroup.add(pitBoxLine);
    }

    this.trackRoot.add(pitGroup);
  }

  buildThematicProps() {
    const theme = this.trackData.theme || {};
    const props = theme.props || 'PARK_TREES';
    const pts = this.sampledPoints;
    const count = this.sampleCount;
    const up = new THREE.Vector3(0, 1, 0);
    const bDist = this.barrierDistance + 6.0;

    if (props === 'PARK_TREES' || props === 'PINE_FOREST' || props === 'CHERRY_TREES' || props === 'TROPICAL_TREES') {
      // 3D Procedural Trees around the circuit
      const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 4.5, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 });

      let foliageColor = 0x24542a;
      if (props === 'PINE_FOREST') foliageColor = 0x14361c;
      else if (props === 'CHERRY_TREES') foliageColor = 0xf472b6;
      else if (props === 'TROPICAL_TREES') foliageColor = 0x16a34a;

      const foliageMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.8 });
      const foliageGeo = (props === 'PINE_FOREST')
        ? new THREE.ConeGeometry(3.5, 7.5, 7)
        : new THREE.DodecahedronGeometry(3.6, 1);

      for (let i = 0; i < count; i += 12) {
        const pt = pts[i];
        const tgt = this.sampledTangents[i];
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

        // Left and right trees with random jitter
        const sideOffsets = [-1, 1];
        for (const side of sideOffsets) {
          // Do not spawn trees on or under the elevated bridge span
          if (this.trackData && this.trackData.id === 'suzuka') {
            const tVal = i / count;
            if (tVal >= 0.54 && tVal <= 0.72) continue;
          }

          const dist = bDist + 6 + Math.random() * 22;
          const tPos = new THREE.Vector3().copy(pt).addScaledVector(normal, side * dist);

          // Strict clearance check against the ENTIRE racetrack ribbon:
          const check = this.getClosestTrackPoint(tPos.x, tPos.z);
          if (check.distance < (this.trackWidth / 2 + 5.0)) continue;

          const tree = new THREE.Group();
          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.position.y = 2.25;
          tree.add(trunk);

          const foliage = new THREE.Mesh(foliageGeo, foliageMat);
          foliage.position.y = (props === 'PINE_FOREST') ? 6.5 : 5.8;
          tree.add(foliage);

          const s = 0.8 + Math.random() * 0.5;
          tree.scale.set(s, s, s);
          const treeY = this.getTerrainHeight(tPos.x, tPos.z);
          tree.position.set(tPos.x, treeY, tPos.z);
          this.trackRoot.add(tree);
        }
      }
    } else if (props === 'FLOODLIGHT_TOWERS' || props === 'DESERT_FLOODLIGHTS') {
      // Towering Floodlight Gantries along the barriers
      const poleGeo = new THREE.CylinderGeometry(0.25, 0.4, 18, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
      const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      for (let i = 0; i < count; i += 18) {
        const pt = pts[i];
        const tgt = this.sampledTangents[i];
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

        for (const side of [-1, 1]) {
          const lPos = new THREE.Vector3().copy(pt).addScaledVector(normal, side * (this.barrierDistance + 3.5));
          const lightGroup = new THREE.Group();

          const pole = new THREE.Mesh(poleGeo, poleMat);
          pole.position.y = 9;
          lightGroup.add(pole);

          // Floodlight head pointing down to track
          const headGeo = new THREE.BoxGeometry(2.4, 0.8, 1.2);
          const head = new THREE.Mesh(headGeo, headMat);
          head.position.set(0, 18, 0);
          lightGroup.add(head);

          const lightY = this.getTerrainHeight(lPos.x, lPos.z);
          lightGroup.position.set(lPos.x, lightY, lPos.z);
          this.trackRoot.add(lightGroup);
        }
      }
    } else if (props === 'CITY_BUILDINGS' || props === 'CASTLE_WALLS') {
      // Concrete Urban Retaining Walls & Stone Fortress Blocks
      const wallMat = new THREE.MeshStandardMaterial({
        color: props === 'CASTLE_WALLS' ? 0x85796e : 0x475569,
        roughness: 0.95
      });
      const blockGeo = new THREE.BoxGeometry(4.0, 5.5, 1.8);

      for (let i = 0; i < count; i += 16) {
        const pt = pts[i];
        const tgt = this.sampledTangents[i];
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

        const wPos = new THREE.Vector3().copy(pt).addScaledVector(normal, -(this.barrierDistance + 4.5));
        // Ensure block does not collide with track
        const check = this.getClosestTrackPoint(wPos.x, wPos.z);
        if (check.distance < (this.trackWidth / 2 + 2.5)) continue;

        const block = new THREE.Mesh(blockGeo, wallMat);
        const wallY = this.getTerrainHeight(wPos.x, wPos.z);
        block.position.set(wPos.x, wallY + 2.75, wPos.z);
        block.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tgt);
        this.trackRoot.add(block);
      }
    }
  }

  update(dt) {
    if (this.animatedFlags && this.animatedFlags.length > 0) {
      const time = performance.now() * 0.003;
      for (let i = 0; i < this.animatedFlags.length; i++) {
        const flag = this.animatedFlags[i];
        const offset = i * 0.7;
        flag.rotation.y = Math.sin(time + offset) * 0.22;
        flag.rotation.z = Math.cos(time * 1.2 + offset) * 0.07;
      }
    }
  }

  getClosestTrackPoint(x, z, y = null, hintT = null) {
    const pts = this.sampledPoints;
    if (!pts || pts.length === 0) {
      return {
        point: new THREE.Vector3(x, y || 0, z),
        tangent: new THREE.Vector3(0, 0, 1),
        index: 0,
        t: 0,
        distance: 0
      };
    }
    const len = pts.length;
    let minDistSq = Infinity;
    let bestIdx = 0;

    // 1. If hintT is provided (e.g. car progress from previous frame), search in local window first
    // This prevents crossover hopping and backwards snapping on multi-level tracks (like Suzuka Figure-8)
    if (hintT !== null && hintT !== undefined && hintT >= 0 && hintT <= 1) {
      const hintIdx = Math.round(hintT * len) % len;
      const windowRadius = Math.max(35, Math.floor(len * 0.12));
      let localMinDistSq = Infinity;
      let localBestIdx = hintIdx;

      for (let offset = -windowRadius; offset <= windowRadius; offset++) {
        const i = (hintIdx + offset + len) % len;
        const p = pts[i];
        const dx = p.x - x;
        const dz = p.z - z;
        const dy = (y !== null && y !== undefined) ? (p.y - y) * 2.5 : 0;
        const dSq = dx * dx + dz * dz + dy * dy;
        if (dSq < localMinDistSq) {
          localMinDistSq = dSq;
          localBestIdx = i;
        }
      }

      // If local window found a candidate within 35m, accept it immediately
      if (localMinDistSq < 1225) { // 35^2
        minDistSq = localMinDistSq;
        bestIdx = localBestIdx;
      }
    }

    // 2. Global search fallback (e.g. initial spawn, car teleport, or far off-track)
    if (minDistSq === Infinity) {
      for (let i = 0; i < len; i++) {
        const p = pts[i];
        const dx = p.x - x;
        const dz = p.z - z;
        const dy = (y !== null && y !== undefined) ? (p.y - y) * 2.5 : 0;
        const dSq = dx * dx + dz * dz + dy * dy;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          bestIdx = i;
        }
      }
    }

    // Check adjacent segments [prevIdx, bestIdx] and [bestIdx, nextIdx] for continuous projection
    const prevIdx = (bestIdx - 1 + len) % len;
    const nextIdx = (bestIdx + 1) % len;

    const projectOnSeg = (i0, i1) => {
      const A = pts[i0];
      const B = pts[i1];
      const segX = B.x - A.x;
      const segZ = B.z - A.z;
      const segLenSq = segX * segX + segZ * segZ;
      if (segLenSq < 1e-6) return { distSq: (x - A.x) ** 2 + (z - A.z) ** 2, s: 0, i0, i1 };
      const s = Math.max(0, Math.min(1, ((x - A.x) * segX + (z - A.z) * segZ) / segLenSq));
      const px = A.x + s * segX;
      const pz = A.z + s * segZ;
      const distSq = (x - px) ** 2 + (z - pz) ** 2;
      return { distSq, s, px, pz, i0, i1 };
    };

    const segPrev = projectOnSeg(prevIdx, bestIdx);
    const segNext = projectOnSeg(bestIdx, nextIdx);
    const bestSeg = (segPrev.distSq <= segNext.distSq) ? segPrev : segNext;

    const A = pts[bestSeg.i0];
    const B = pts[bestSeg.i1];
    const s = bestSeg.s;
    const projX = A.x + s * (B.x - A.x);
    const projY = A.y + s * (B.y - A.y);
    const projZ = A.z + s * (B.z - A.z);

    const tgA = this.sampledTangents[bestSeg.i0] || new THREE.Vector3(0, 0, 1);
    const tgB = this.sampledTangents[bestSeg.i1] || new THREE.Vector3(0, 0, 1);
    const interpTg = new THREE.Vector3(
      tgA.x + s * (tgB.x - tgA.x),
      tgA.y + s * (tgB.y - tgA.y),
      tgA.z + s * (tgB.z - tgA.z)
    ).normalize();

    const t = (bestSeg.i0 + s) / len;
    const dist = Math.sqrt(bestSeg.distSq);

    return {
      point: new THREE.Vector3(projX, projY, projZ),
      tangent: interpTg,
      index: bestIdx,
      t: t,
      distance: dist
    };
  }

  isOnTrack(x, z) {
    const info = this.getClosestTrackPoint(x, z);
    return info.distance <= (this.trackWidth / 2);
  }

  setGantryLights(count) {
    // Optional 3D gantry bulb animation hook
  }
}
