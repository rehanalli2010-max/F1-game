import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * 3D F1 Racing Circuit Environment
 * Builds a closed-loop asphalt track with red-and-white curbs, continuous 3D Armco side barriers,
 * starting grid boxes, start/finish gantry, distance braking boards, and physical collision boundaries.
 */
export class Track {
  constructor(scene, physics = null) {
    this.scene = scene;
    this.physics = physics;
    this.trackWidth = 16; // 16 meters track width
    this.barrierDistance = 11.5; // 11.5 meters from centerline to side barriers

    // Spline definition of the Formula 1 circuit
    this.curve = this.createTrackSpline();
    this.sampleCount = 600;
    this.sampledPoints = [];
    this.sampledTangents = [];
    this.sampleTrackData();

    // Checkpoint definitions (Progress t along spline from 0 to 1)
    this.checkpoints = [
      { id: 0, name: 'START_FINISH', t: 0.0, label: 'Start / Finish' },
      { id: 1, name: 'SECTOR_1', t: 0.33, label: 'Sector 1' },
      { id: 2, name: 'SECTOR_2', t: 0.66, label: 'Sector 2' },
      { id: 3, name: 'SECTOR_3', t: 0.90, label: 'Sector 3' }
    ];

    this.buildEnvironment();
    this.buildTrackRibbon();
    this.buildCurbsAndMarkings();
    this.buildTrackBarriers();
    this.buildGrandstandsAndAudience();
    this.buildStartFinishGantry();
    this.buildBrakeMarkers();
    this.buildSponsorHoardings();
  }

  createTrackSpline() {
    // Grand Prix circuit with 340m straight, high-speed S-curves, hairpin, and sweeper (zero overlapping sections)
    const controlPoints = [
      new THREE.Vector3(120, 0, -150),  // 0. Start/Finish Line (on long straight)
      new THREE.Vector3(120, 0, 0),     // 1. Main Straight Midpoint (DRS zone)
      new THREE.Vector3(120, 0, 160),   // 2. Main Straight End (Braking Zone)
      new THREE.Vector3(110, 0, 240),   // 3. Turn 1 Entry
      new THREE.Vector3(50, 0, 270),    // 4. Turn 1 Apex (Right)
      new THREE.Vector3(-20, 0, 240),   // 5. Turn 2 Switchback (Left)
      new THREE.Vector3(-70, 0, 180),   // 6. High-speed entry into S-Curves
      new THREE.Vector3(-120, 0, 110),  // 7. S-Curve 1 (Maggotts-style)
      new THREE.Vector3(-160, 0, 30),   // 8. S-Curve 2 (Becketts-style)
      new THREE.Vector3(-150, 0, -60),  // 9. Chapel Curve Exit
      new THREE.Vector3(-120, 0, -150), // 10. Hairpin Braking Zone
      new THREE.Vector3(-60, 0, -220),  // 11. Hairpin Apex (Sharp Right)
      new THREE.Vector3(0, 0, -240),    // 12. Hairpin Exit
      new THREE.Vector3(40, 0, -230),   // 13. Acceleration Zone
      new THREE.Vector3(80, 0, -210),   // 14. Final Sweeper Entry
      new THREE.Vector3(115, 0, -180)   // 15. Straightening onto Main Straight
    ];

    return new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.2);
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

  buildEnvironment() {
    // 1. Terrain Grass Ground Plane
    const groundGeo = new THREE.PlaneGeometry(1600, 1600, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);

    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 512;
    grassCanvas.height = 512;
    const gctx = grassCanvas.getContext('2d');
    gctx.fillStyle = '#1c2d1b';
    gctx.fillRect(0, 0, 512, 512);

    // Mowing striping
    gctx.fillStyle = '#182717';
    for (let y = 0; y < 512; y += 64) {
      gctx.fillRect(0, y, 512, 32);
    }

    const grassTex = new THREE.CanvasTexture(grassCanvas);
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(80, 80);

    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.9,
      metalness: 0.1
    });

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // 2. Horizon Skyline Backdrop
    const horizonGeo = new THREE.CylinderGeometry(780, 780, 80, 32, 1, true);
    const horizonMat = new THREE.MeshBasicMaterial({
      color: 0x131a26,
      side: THREE.BackSide
    });
    const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    horizonMesh.position.y = 20;
    this.scene.add(horizonMesh);
  }

  buildTrackRibbon() {
    const pts = this.sampledPoints;
    const count = pts.length;
    const halfWidth = this.trackWidth / 2; // 8m
    const barrierDist = this.barrierDistance; // 11.5m
    const up = new THREE.Vector3(0, 1, 0);

    // Main Road Ribbon
    const roadVertices = [];
    const roadNormals = [];
    const roadUvs = [];
    const roadIndices = [];

    // Outer Runoff Aprons
    const runoffVertices = [];
    const runoffNormals = [];
    const runoffUvs = [];
    const runoffIndices = [];

    for (let i = 0; i <= count; i++) {
      const idx = i % count;
      const pt = pts[idx];
      const tgt = this.sampledTangents[idx];
      const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

      const leftRoad = new THREE.Vector3().copy(pt).addScaledVector(normal, -halfWidth);
      const rightRoad = new THREE.Vector3().copy(pt).addScaledVector(normal, halfWidth);

      // Elevated asphalt road at Y = 0.04
      roadVertices.push(leftRoad.x, 0.04, leftRoad.z);
      roadVertices.push(rightRoad.x, 0.04, rightRoad.z);
      roadNormals.push(0, 1, 0, 0, 1, 0);

      const vProgress = i / count;
      roadUvs.push(0, vProgress, 1, vProgress);

      if (i < count) {
        const base = i * 2;
        roadIndices.push(base, base + 1, base + 2);
        roadIndices.push(base + 1, base + 3, base + 2);
      }

      // Runoff outer boundaries at Y = 0.02
      const leftOuter = new THREE.Vector3().copy(pt).addScaledVector(normal, -barrierDist);
      const rightOuter = new THREE.Vector3().copy(pt).addScaledVector(normal, barrierDist);

      const rBase = i * 4;
      runoffVertices.push(leftOuter.x, 0.02, leftOuter.z);
      runoffVertices.push(leftRoad.x, 0.02, leftRoad.z);
      runoffVertices.push(rightRoad.x, 0.02, rightRoad.z);
      runoffVertices.push(rightOuter.x, 0.02, rightOuter.z);

      runoffNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      runoffUvs.push(0, vProgress, 0.3, vProgress, 0.7, vProgress, 1.0, vProgress);

      if (i < count) {
        // Left runoff quad
        runoffIndices.push(rBase, rBase + 1, rBase + 4);
        runoffIndices.push(rBase + 1, rBase + 5, rBase + 4);
        // Right runoff quad
        runoffIndices.push(rBase + 2, rBase + 3, rBase + 6);
        runoffIndices.push(rBase + 3, rBase + 7, rBase + 6);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);

    // Procedural High-Detail Asphalt Road Texture
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 1024;
    roadCanvas.height = 1024;
    const rctx = roadCanvas.getContext('2d');

    rctx.fillStyle = '#1c1f26';
    rctx.fillRect(0, 0, 1024, 1024);

    // Grain noise
    for (let p = 0; p < 25000; p++) {
      const g = Math.floor(24 + Math.random() * 26);
      rctx.fillStyle = `rgb(${g},${g},${g})`;
      rctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }

    // White Track Limit Lines
    rctx.fillStyle = '#ffffff';
    rctx.fillRect(20, 0, 22, 1024);
    rctx.fillRect(982, 0, 22, 1024);

    // Outer Rumble Kerb strips
    const curbStripeH = 64;
    for (let y = 0; y < 1024; y += curbStripeH) {
      const isRed = (Math.floor(y / curbStripeH) % 2 === 0);
      rctx.fillStyle = isRed ? '#e10600' : '#ffffff';
      rctx.fillRect(0, y, 20, curbStripeH);
      rctx.fillRect(1004, y, 20, curbStripeH);
    }

    // Racing line groove
    const rubber = rctx.createLinearGradient(0, 0, 1024, 0);
    rubber.addColorStop(0.20, 'transparent');
    rubber.addColorStop(0.35, 'rgba(12, 14, 18, 0.55)');
    rubber.addColorStop(0.48, 'transparent');
    rubber.addColorStop(0.52, 'transparent');
    rubber.addColorStop(0.65, 'rgba(12, 14, 18, 0.55)');
    rubber.addColorStop(0.80, 'transparent');
    rctx.fillStyle = rubber;
    rctx.fillRect(0, 0, 1024, 1024);

    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = THREE.ClampToEdgeWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, 50);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.75,
      metalness: 0.18,
      side: THREE.DoubleSide
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    // Runoff Apron Texture
    const runoffCanvas = document.createElement('canvas');
    runoffCanvas.width = 512;
    runoffCanvas.height = 512;
    const roctx = runoffCanvas.getContext('2d');
    roctx.fillStyle = '#262a33';
    roctx.fillRect(0, 0, 512, 512);

    const stripeW = 32;
    for (let y = 0; y < 512; y += stripeW * 2) {
      roctx.fillStyle = '#0a3875';
      roctx.fillRect(0, y, 512, stripeW);
    }

    const runoffTex = new THREE.CanvasTexture(runoffCanvas);
    runoffTex.wrapS = THREE.RepeatWrapping;
    runoffTex.wrapT = THREE.RepeatWrapping;
    runoffTex.repeat.set(1, 40);

    const runoffGeo = new THREE.BufferGeometry();
    runoffGeo.setAttribute('position', new THREE.Float32BufferAttribute(runoffVertices, 3));
    runoffGeo.setAttribute('normal', new THREE.Float32BufferAttribute(runoffNormals, 3));
    runoffGeo.setAttribute('uv', new THREE.Float32BufferAttribute(runoffUvs, 2));
    runoffGeo.setIndex(runoffIndices);

    const runoffMat = new THREE.MeshStandardMaterial({
      map: runoffTex,
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const runoffMesh = new THREE.Mesh(runoffGeo, runoffMat);
    runoffMesh.receiveShadow = true;
    this.scene.add(runoffMesh);
  }

  buildCurbsAndMarkings() {
    const pts = this.sampledPoints;
    const count = pts.length;
    const halfWidth = this.trackWidth / 2;
    const up = new THREE.Vector3(0, 1, 0);

    const curbGeo = new THREE.BoxGeometry(1.4, 0.12, 2.0);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe10600, roughness: 0.45, metalness: 0.1 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.45, metalness: 0.1 });

    for (let i = 0; i < count; i += 2) {
      const prev = pts[(i - 4 + count) % count];
      const curr = pts[i];
      const next = pts[(i + 4) % count];

      const dir1 = new THREE.Vector3().subVectors(curr, prev).normalize();
      const dir2 = new THREE.Vector3().subVectors(next, curr).normalize();
      const cross = new THREE.Vector3().crossVectors(dir1, dir2);
      const curvature = cross.y;

      if (Math.abs(curvature) > 0.012) {
        const tgt = this.sampledTangents[i];
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();
        const isRightTurn = curvature < 0;

        const sideMult = isRightTurn ? 1 : -1;
        const curbPos = new THREE.Vector3().copy(curr).addScaledVector(normal, sideMult * (halfWidth + 0.6));

        const mat = (Math.floor(i / 2) % 2 === 0) ? redMat : whiteMat;
        const curb = new THREE.Mesh(curbGeo, mat);
        curb.position.set(curbPos.x, 0.05, curbPos.z);
        curb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tgt);
        this.scene.add(curb);
      }
    }

    this.buildStartFinishLine();
  }

  buildTrackBarriers() {
    const pts = this.sampledPoints;
    const count = pts.length;
    const barrierDist = this.barrierDistance; // 11.5m
    const up = new THREE.Vector3(0, 1, 0);

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.85,
      roughness: 0.35,
      side: THREE.DoubleSide
    });

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.7,
      roughness: 0.5
    });

    const tecproRedMat = new THREE.MeshStandardMaterial({ color: 0xd60400, roughness: 0.6 });
    const tecproWhiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });

    // Generate Continuous Armco Rails along left and right borders
    const createRailGeometry = (sideSign, yBottom, yTop) => {
      const vertices = [];
      const normals = [];
      const uvs = [];
      const indices = [];

      for (let i = 0; i <= count; i++) {
        const idx = i % count;
        const pt = pts[idx];
        const tgt = this.sampledTangents[idx];
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

        const basePos = new THREE.Vector3().copy(pt).addScaledVector(normal, sideSign * barrierDist);
        const inwardNormal = new THREE.Vector3().copy(normal).multiplyScalar(-sideSign);

        vertices.push(basePos.x, yBottom, basePos.z);
        vertices.push(basePos.x, yTop, basePos.z);

        normals.push(inwardNormal.x, 0, inwardNormal.z);
        normals.push(inwardNormal.x, 0, inwardNormal.z);

        const u = i / 8;
        uvs.push(u, 0, u, 1);

        if (i < count) {
          const b = i * 2;
          if (sideSign < 0) {
            indices.push(b, b + 1, b + 2);
            indices.push(b + 1, b + 3, b + 2);
          } else {
            indices.push(b, b + 2, b + 1);
            indices.push(b + 1, b + 2, b + 3);
          }
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      return geo;
    };

    // Left Barriers
    const leftUpperGeo = createRailGeometry(-1, 0.75, 1.20);
    const leftLowerGeo = createRailGeometry(-1, 0.25, 0.65);
    this.scene.add(new THREE.Mesh(leftUpperGeo, metalMat));
    this.scene.add(new THREE.Mesh(leftLowerGeo, metalMat));

    // Right Barriers
    const rightUpperGeo = createRailGeometry(1, 0.75, 1.20);
    const rightLowerGeo = createRailGeometry(1, 0.25, 0.65);
    this.scene.add(new THREE.Mesh(rightUpperGeo, metalMat));
    this.scene.add(new THREE.Mesh(rightLowerGeo, metalMat));

    // Steel Vertical Posts every 4-5 meters
    const postGeo = new THREE.BoxGeometry(0.14, 1.35, 0.14);
    for (let i = 0; i < count; i += 2) {
      const pt = pts[i];
      const tgt = this.sampledTangents[i];
      const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

      // Left post
      const leftPostPos = new THREE.Vector3().copy(pt).addScaledVector(normal, -barrierDist);
      const lPost = new THREE.Mesh(postGeo, postMat);
      lPost.position.set(leftPostPos.x, 0.67, leftPostPos.z);
      this.scene.add(lPost);

      // Right post
      const rightPostPos = new THREE.Vector3().copy(pt).addScaledVector(normal, barrierDist);
      const rPost = new THREE.Mesh(postGeo, postMat);
      rPost.position.set(rightPostPos.x, 0.67, rightPostPos.z);
      this.scene.add(rPost);

      // Tecpro safety blocks on sharp corners
      const prev = pts[(i - 4 + count) % count];
      const next = pts[(i + 4) % count];
      const dir1 = new THREE.Vector3().subVectors(pt, prev).normalize();
      const dir2 = new THREE.Vector3().subVectors(next, pt).normalize();
      const curvature = new THREE.Vector3().crossVectors(dir1, dir2).y;

      if (Math.abs(curvature) > 0.012) {
        const isRightTurn = curvature < 0;
        const outerSign = isRightTurn ? -1 : 1;
        const tecproPos = new THREE.Vector3().copy(pt).addScaledVector(normal, outerSign * (barrierDist - 0.7));

        const tecMat = (Math.floor(i / 2) % 2 === 0) ? tecproRedMat : tecproWhiteMat;
        const tecBlock = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 2.2), tecMat);
        tecBlock.position.set(tecproPos.x, 0.58, tecproPos.z);
        tecBlock.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tgt);
        this.scene.add(tecBlock);
      }
    }

    // Physical Cannon-es Static Box Colliders for Side Barriers
    if (this.physics && this.physics.world && typeof CANNON !== 'undefined') {
      const step = 6; // every ~18 meters
      for (let i = 0; i < count; i += step) {
        const idx1 = i;
        const idx2 = (i + step) % count;
        const pt1 = pts[idx1];
        const pt2 = pts[idx2];
        const tgt1 = this.sampledTangents[idx1];
        const norm1 = new THREE.Vector3().crossVectors(tgt1, up).normalize();

        // Left static barrier box
        const l1 = new THREE.Vector3().copy(pt1).addScaledVector(norm1, -barrierDist);
        const l2 = new THREE.Vector3().copy(pt2).addScaledVector(norm1, -barrierDist);
        const lMid = new THREE.Vector3().addVectors(l1, l2).multiplyScalar(0.5);
        const lSeg = new THREE.Vector3().subVectors(l2, l1);
        const lLen = lSeg.length();

        const leftBody = new CANNON.Body({
          mass: 0,
          position: new CANNON.Vec3(lMid.x, 0.7, lMid.z),
          shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.9, lLen / 2 + 0.6))
        });
        const lYaw = Math.atan2(lSeg.x, lSeg.z);
        leftBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), lYaw);
        this.physics.world.addBody(leftBody);

        // Right static barrier box
        const r1 = new THREE.Vector3().copy(pt1).addScaledVector(norm1, barrierDist);
        const r2 = new THREE.Vector3().copy(pt2).addScaledVector(norm1, barrierDist);
        const rMid = new THREE.Vector3().addVectors(r1, r2).multiplyScalar(0.5);
        const rSeg = new THREE.Vector3().subVectors(r2, r1);
        const rLen = rSeg.length();

        const rightBody = new CANNON.Body({
          mass: 0,
          position: new CANNON.Vec3(rMid.x, 0.7, rMid.z),
          shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.9, rLen / 2 + 0.6))
        });
        const rYaw = Math.atan2(rSeg.x, rSeg.z);
        rightBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rYaw);
        this.physics.world.addBody(rightBody);
      }
    }
  }

  buildStartFinishLine() {
    const startPt = this.curve.getPointAt(0.0);
    const tgt = this.curve.getTangentAt(0.0).normalize();
    const up = new THREE.Vector3(0, 1, 0);

    const checkCanvas = document.createElement('canvas');
    checkCanvas.width = 256;
    checkCanvas.height = 64;
    const ctx = checkCanvas.getContext('2d');
    const squareSize = 16;
    for (let x = 0; x < 256; x += squareSize) {
      for (let y = 0; y < 64; y += squareSize) {
        ctx.fillStyle = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0 ? '#ffffff' : '#111111';
        ctx.fillRect(x, y, squareSize, squareSize);
      }
    }
    const checkTex = new THREE.CanvasTexture(checkCanvas);

    const lineGeo = new THREE.PlaneGeometry(this.trackWidth - 1, 2.5);
    lineGeo.rotateX(-Math.PI / 2);
    const lineMat = new THREE.MeshBasicMaterial({ map: checkTex });
    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
    lineMesh.position.set(startPt.x, 0.02, startPt.z);
    lineMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tgt);
    this.scene.add(lineMesh);

    // Staggered Starting Grid Boxes (P1 to P6) placed behind the start line
    const gridBoxGeo = new THREE.BoxGeometry(2.4, 0.02, 5.0);
    const gridBoxMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });

    for (let p = 1; p <= 6; p++) {
      const gridT = (1.0 - (p * 0.007)) % 1.0;
      const gPt = this.curve.getPointAt(gridT);
      const gTgt = this.curve.getTangentAt(gridT).normalize();
      const gNormal = new THREE.Vector3().crossVectors(gTgt, up).normalize();

      const sideOffset = (p % 2 === 1) ? -3.5 : 3.5;
      const box = new THREE.Mesh(gridBoxGeo, gridBoxMat);
      box.position.copy(gPt).addScaledVector(gNormal, sideOffset);
      box.position.y = 0.02;
      box.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), gTgt);
      this.scene.add(box);
    }
  }

  buildStartFinishGantry() {
    const startPt = this.curve.getPointAt(0.0);
    const tgt = this.curve.getTangentAt(0.0).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

    const gantryGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });

    const pillarHeight = 9.0;
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.35, pillarHeight, 8);
    const leftPillar = new THREE.Mesh(pillarGeo, metalMat);
    leftPillar.position.set(-this.trackWidth / 2 - 2.5, pillarHeight / 2, 0);
    gantryGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, metalMat);
    rightPillar.position.set(this.trackWidth / 2 + 2.5, pillarHeight / 2, 0);
    gantryGroup.add(rightPillar);

    const crossbarLen = this.trackWidth + 6;
    const crossbarGeo = new THREE.BoxGeometry(crossbarLen, 0.8, 1.2);
    const crossbar = new THREE.Mesh(crossbarGeo, metalMat);
    crossbar.position.set(0, pillarHeight - 0.5, 0);
    gantryGroup.add(crossbar);

    // 5-Light Starting Gantry Box
    const lightBoxGeo = new THREE.BoxGeometry(6.5, 1.2, 0.6);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 });
    const lightBox = new THREE.Mesh(lightBoxGeo, boxMat);
    lightBox.position.set(0, pillarHeight - 1.2, 0.3);
    gantryGroup.add(lightBox);

    this.gantryBulbs = [];
    const bulbGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16);
    bulbGeo.rotateX(Math.PI / 2);

    for (let c = 0; c < 5; c++) {
      const xPos = -2.2 + c * 1.1;
      for (let r = 0; r < 2; r++) {
        const yPos = 0.25 - r * 0.5;
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(xPos, yPos, 0.32);
        lightBox.add(bulb);
        this.gantryBulbs.push(bulb);
      }
    }

    gantryGroup.position.set(startPt.x, 0, startPt.z);
    gantryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tgt);
    this.scene.add(gantryGroup);
  }

  buildBrakeMarkers() {
    const markers = [
      { t: 0.024, label: '150' },
      { t: 0.028, label: '100' },
      { t: 0.032, label: '50' }
    ];

    const up = new THREE.Vector3(0, 1, 0);

    for (const m of markers) {
      const pt = this.curve.getPointAt(m.t);
      const tgt = this.curve.getTangentAt(m.t).normalize();
      const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 54px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.label, 64, 64);

      const tex = new THREE.CanvasTexture(canvas);
      const boardGeo = new THREE.PlaneGeometry(1.4, 1.4);
      const boardMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      const board = new THREE.Mesh(boardGeo, boardMat);

      const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 0.9;

      const markerGroup = new THREE.Group();
      board.position.y = 1.4;
      markerGroup.add(post);
      markerGroup.add(board);

      markerGroup.position.copy(pt).addScaledVector(normal, this.trackWidth / 2 + 1.8);
      markerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tgt);
      this.scene.add(markerGroup);
    }
  }

  buildSponsorHoardings() {
    const sponsors = ['FORMULA 1', 'PIRELLI', 'ROLEX', 'DHL', 'AWS'];
    const up = new THREE.Vector3(0, 1, 0);
    const locations = [0.03, 0.15, 0.28, 0.45, 0.62, 0.78, 0.88];

    locations.forEach((t, i) => {
      const pt = this.curve.getPointAt(t);
      const tgt = this.curve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = (i % 2 === 0) ? '#e10600' : '#111827';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sponsors[i % sponsors.length], 128, 32);

      const tex = new THREE.CanvasTexture(canvas);
      const bannerGeo = new THREE.BoxGeometry(7.0, 1.2, 0.2);
      const bannerMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.copy(pt).addScaledVector(normal, -(this.trackWidth / 2 + 2.0));
      banner.position.y = 0.7;
      banner.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tgt);
      this.scene.add(banner);
    });
  }

  isOnTrack(x, z) {
    const info = this.getClosestTrackPoint(x, z);
    return info.distance <= (this.trackWidth / 2 + 1.2);
  }

  getClosestTrackPoint(x, z) {
    if (!this.sampledPoints || this.sampledPoints.length === 0) {
      return {
        point: new THREE.Vector3(x, 0, z),
        tangent: new THREE.Vector3(0, 0, 1),
        t: 0,
        distance: 0,
        index: 0
      };
    }
    let minDistanceSq = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < this.sampleCount; i++) {
      const pt = this.sampledPoints[i];
      const dx = pt.x - x;
      const dz = pt.z - z;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestIndex = i;
      }
    }

    const t = closestIndex / this.sampleCount;
    const pt = this.sampledPoints[closestIndex];
    const tgt = this.sampledTangents[closestIndex];

    return {
      point: pt,
      tangent: tgt,
      t: t,
      distance: Math.sqrt(minDistanceSq),
      index: closestIndex
    };
  }

  setGantryLights(litColumnsCount) {
    if (!this.gantryBulbs) return;
    for (let c = 0; c < 5; c++) {
      const isLit = c < litColumnsCount;
      const color = isLit ? 0xff0000 : 0x330000;
      this.gantryBulbs[c * 2].material.color.setHex(color);
      this.gantryBulbs[c * 2 + 1].material.color.setHex(color);
    }
  }

  /**
   * Build realistic multi-tiered F1 grandstands and audience spectators around circuit boundaries
   */
  buildGrandstandsAndAudience() {
    this.animatedFlags = [];
    const crowdTex = this.createCrowdTexture();

    // 6 grandstand arenas placed at high-speed and overtaking spectator zones
    const grandstandSpecs = [
      // 1. Main Pit Straight Grandstand A (Overlooking starting grid & gantry)
      {
        t: 0.005,
        side: -1,
        dist: 18.5,
        length: 95,
        depth: 14,
        height: 10.5,
        rows: 10,
        sponsor: 'FORMULA 1',
        roofColor: 0xe10600
      },
      // 2. Main Straight Grandstand B (Right side opposite pit boxes)
      {
        t: 0.025,
        side: 1,
        dist: 19.5,
        length: 105,
        depth: 14,
        height: 10.5,
        rows: 10,
        sponsor: 'PIRELLI',
        roofColor: 0x111827
      },
      // 3. Turn 1 Braking Stadium Grandstand (End of main straight)
      {
        t: 0.125,
        side: 1,
        dist: 20.5,
        length: 80,
        depth: 15,
        height: 11.0,
        rows: 11,
        sponsor: 'ROLEX',
        roofColor: 0x00594f
      },
      // 4. Maggotts/Becketts S-Curve Arena Grandstand
      {
        t: 0.44,
        side: -1,
        dist: 21.5,
        length: 75,
        depth: 14,
        height: 9.8,
        rows: 10,
        sponsor: 'QATAR AIRWAYS',
        roofColor: 0x5c0632
      },
      // 5. Turn 5 Hairpin Stadium Arena
      {
        t: 0.70,
        side: 1,
        dist: 22.5,
        length: 90,
        depth: 16,
        height: 12.0,
        rows: 12,
        sponsor: 'EMIRATES',
        roofColor: 0xd60400
      },
      // 6. Final Sweeper into Main Straight
      {
        t: 0.93,
        side: 1,
        dist: 19.5,
        length: 70,
        depth: 13,
        height: 9.2,
        rows: 9,
        sponsor: 'DHL',
        roofColor: 0xffcc00
      }
    ];

    for (const spec of grandstandSpecs) {
      this.buildSingleGrandstand(spec, crowdTex);
    }
  }

  /**
   * Generates a high-density procedural spectator crowd texture with F1 team merchandise colors
   */
  createCrowdTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Concrete bleacher background
    ctx.fillStyle = '#222733';
    ctx.fillRect(0, 0, 1024, 512);

    // Official F1 Team Supporter Colors
    const teamColors = [
      '#e10600', // Scuderia Ferrari Red
      '#06152b', // Red Bull Racing Dark Navy
      '#ffd000', // Red Bull / Renault Racing Yellow
      '#00d2be', // Mercedes AMG Petronas Teal
      '#ff8700', // McLaren Papaya Orange
      '#00594f', // Aston Martin Racing Green
      '#ffffff', // White team shirts
      '#52e0ff', // Williams Racing Cyan
      '#2b2d33'  // Dark team jackets
    ];

    const skinTones = ['#f5d0b0', '#e0b58e', '#c68642', '#8d5524', '#ffdbac'];

    const rows = 10;
    const rowH = 512 / rows;

    for (let r = 0; r < rows; r++) {
      const yBase = r * rowH;

      // Row step shadow
      ctx.fillStyle = '#141821';
      ctx.fillRect(0, yBase, 1024, 4);

      // Seat backings
      ctx.fillStyle = '#2a3140';
      ctx.fillRect(0, yBase + 4, 1024, 7);

      const cols = 110;
      const colW = 1024 / cols;

      for (let c = 0; c < cols; c++) {
        const x = c * colW + (Math.random() * 2 - 1);
        const y = yBase + 11;

        if (Math.random() < 0.04) continue; // occasional vacant aisle seat

        const shirtColor = teamColors[Math.floor(Math.random() * teamColors.length)];
        const skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];

        // Spectator Shirt
        ctx.fillStyle = shirtColor;
        ctx.fillRect(x, y + 10, colW - 1.2, rowH - 18);

        // Spectator Head
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(x + colW / 2, y + 6, colW / 2.3, 0, Math.PI * 2);
        ctx.fill();

        // Team Cap / Visor / Hair
        if (Math.random() < 0.72) {
          const capColor = (Math.random() < 0.6) ? shirtColor : '#ffffff';
          ctx.fillStyle = capColor;
          ctx.beginPath();
          ctx.arc(x + colW / 2, y + 4.5, colW / 2.3, Math.PI, Math.PI * 2);
          ctx.fill();
        }

        // Camera flash or small waving flag
        if (Math.random() < 0.07) {
          ctx.fillStyle = teamColors[Math.floor(Math.random() * teamColors.length)];
          ctx.fillRect(x - 2, y - 4, 6, 4);
        }
      }

      // Fan team banners draped on front of some rows
      if (r % 3 === 0) {
        for (let b = 0; b < 6; b++) {
          if (Math.random() < 0.55) {
            const bx = b * 170 + 25;
            const bCol = teamColors[b % teamColors.length];
            ctx.fillStyle = bCol;
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
   * Constructs a single high-detail Grandstand with bleachers, roof, 3D fans, and sponsor fascia
   */
  buildSingleGrandstand(spec, crowdTex) {
    const pt = this.curve.getPointAt(spec.t);
    const tgt = this.curve.getTangentAt(spec.t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

    const gsGroup = new THREE.Group();

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x474f5e,
      roughness: 0.9,
      metalness: 0.1
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x222630,
      roughness: 0.4,
      metalness: 0.8
    });

    const crowdMat = new THREE.MeshStandardMaterial({
      map: crowdTex,
      roughness: 0.75,
      metalness: 0.1
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: spec.roofColor,
      roughness: 0.35,
      metalness: 0.65
    });

    const railingMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.3,
      metalness: 0.85
    });

    // 1. Concrete Foundation Podium (base slab)
    const baseGeo = new THREE.BoxGeometry(spec.length, 1.2, spec.depth + 2);
    const baseMesh = new THREE.Mesh(baseGeo, concreteMat);
    baseMesh.position.set(0, 0.6, (spec.depth + 2) / 2);
    gsGroup.add(baseMesh);

    // 2. Stepped Seating Bleachers
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

    // Sloped Crowd Surface covering the tiered seating area
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

    // 4. Stylized 3D Front-Row Cheering Spectators along the railing
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

      // Cheering arms raised toward the track
      const leftArm = new THREE.Mesh(armGeo, fanMat);
      leftArm.position.set(-0.3, 1.8, -0.1);
      leftArm.rotation.x = Math.PI / 4;
      person.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, fanMat);
      rightArm.position.set(0.3, 1.8, -0.1);
      rightArm.rotation.x = Math.PI / 4;
      person.add(rightArm);

      // Mini fan flag held by some spectators
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

    // 5. Rear Windbreak Wall & Steel Support Pillars
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

    // 6. Modern Aerodynamic Cantilevered Roof Canopy
    const roofOverhang = spec.depth + 3.0;
    const roofGeo = new THREE.BoxGeometry(spec.length + 2, 0.45, roofOverhang);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, spec.height + 1.2, roofOverhang / 2 - 0.5);
    roofMesh.rotation.x = -0.06;
    gsGroup.add(roofMesh);

    // Diagonal cantilever truss supports
    for (let p = 0; p < pillarCount; p++) {
      const px = -spec.length / 2 + (p / (pillarCount - 1)) * spec.length;
      const trussGeo = new THREE.CylinderGeometry(0.12, 0.12, roofOverhang * 0.75, 6);
      const truss = new THREE.Mesh(trussGeo, steelMat);
      truss.position.set(px, spec.height + 0.3, roofOverhang * 0.45);
      truss.rotation.x = Math.PI / 4;
      gsGroup.add(truss);
    }

    // 7. Roof Fascia Sponsor Billboard (High-visibility text banner facing the track)
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
    fctx.fillText(spec.sponsor + ' GRANDSTAND', 256, 32);

    const fTex = new THREE.CanvasTexture(fCanvas);
    const fasciaGeo = new THREE.PlaneGeometry(spec.length, 1.4);
    const fasciaMat = new THREE.MeshBasicMaterial({ map: fTex, side: THREE.DoubleSide });
    const fascia = new THREE.Mesh(fasciaGeo, fasciaMat);
    fascia.position.set(0, spec.height + 1.2, -0.6);
    fascia.rotation.y = Math.PI; // Face unmirrored toward track
    gsGroup.add(fascia);

    // 8. Swaying Team Flagpoles on the Roof
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

    // 9. FIA Safety Catch Fence in front of the grandstand
    const fencePostGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.5, 6);
    const fenceWireGeo = new THREE.PlaneGeometry(spec.length, 2.5);
    const fenceWireMat = new THREE.MeshBasicMaterial({
      color: 0x888888,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });

    const fenceWire = new THREE.Mesh(fenceWireGeo, fenceWireMat);
    fenceWire.position.set(0, 1.75, -2.0);
    gsGroup.add(fenceWire);

    for (let x = -spec.length / 2; x <= spec.length / 2; x += 6) {
      const fPost = new THREE.Mesh(fencePostGeo, steelMat);
      fPost.position.set(x, 1.75, -2.0);
      gsGroup.add(fPost);
    }

    // Position and Orient Grandstand Group along Track
    // Strict right-handed basis:
    // Local +Z = outward away from track
    // Local +Y = up
    // Local +X = cross(up, outward) -> along track length
    const outward = new THREE.Vector3().copy(normal).multiplyScalar(spec.side).normalize();
    const xBasis = new THREE.Vector3().crossVectors(up, outward).normalize();
    const rotMatrix = new THREE.Matrix4().makeBasis(xBasis, up, outward);
    gsGroup.quaternion.setFromRotationMatrix(rotMatrix);
    gsGroup.position.copy(pt).addScaledVector(outward, spec.dist);

    this.scene.add(gsGroup);
  }

  /**
   * Periodic updates (such as waving flags in the wind)
   */
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

  /**
   * Find closest point, tangent, distance, and progress t along track centerline
   */
  getClosestTrackPoint(x, z) {
    const pts = this.sampledPoints;
    if (!pts || pts.length === 0) {
      return {
        point: new THREE.Vector3(x, 0, z),
        tangent: new THREE.Vector3(0, 0, 1),
        index: 0,
        t: 0,
        distance: 0
      };
    }
    let minDistSq = Infinity;
    let bestIdx = 0;
    const len = pts.length;
    for (let i = 0; i < len; i++) {
      const dx = pts[i].x - x;
      const dz = pts[i].z - z;
      const dSq = dx * dx + dz * dz;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        bestIdx = i;
      }
    }
    const dist = Math.sqrt(minDistSq);
    const t = bestIdx / (len || 1);
    return {
      point: pts[bestIdx] || new THREE.Vector3(x, 0, z),
      tangent: (this.sampledTangents && this.sampledTangents[bestIdx]) || new THREE.Vector3(0, 0, 1),
      index: bestIdx,
      t: t,
      distance: dist
    };
  }

  /**
   * Check whether coordinate is on track asphalt vs off-track grass/gravel
   */
  isOnTrack(x, z) {
    const info = this.getClosestTrackPoint(x, z);
    // Track width is 16m -> half-width is 8m
    return info.distance <= (this.trackWidth / 2);
  }
}
