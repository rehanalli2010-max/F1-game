import * as THREE from 'three';
import { TextureFactory } from './textures.js';

/**
 * Procedural Composite 3D Formula 1 Car
 * Creates an aerodynamic F1 car with monocoque chassis, halo, wings,
 * steerable wheels, rotating tires, brake calipers, and dynamic smoke particles.
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

    this.wheelRotation = 0;
    this.currentSteerAngle = 0;
    this.currentRoll = 0;
    this.currentPitch = 0;

    this.buildCar();
    this.initSmokeParticles();
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

    // Safely remove and dispose all previous visual body meshes
    while (this.visualBody.children.length > 0) {
      const child = this.visualBody.children[0];
      this.visualBody.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    this.buildVisualBody();
  }

  buildVisualBody() {
    // 1. Textures from TextureFactory
    const carbonTex = TextureFactory.createCarbonFiberTexture();
    const primaryHex = '#' + this.primaryColor.toString(16).padStart(6, '0');
    const secondaryHex = this.secondaryHex;
    const accentHex = this.accentHex;
    const carNumber = this.carNumber;
    const liveryTex = TextureFactory.createCarLiveryTexture(primaryHex, secondaryHex, accentHex, carNumber);

    // 2. High-Gloss Lacquer Body Material (Crazy Grand Prix style)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.primaryColor,
      map: liveryTex,
      roughness: 0.20,
      metalness: 0.75,
      envMapIntensity: 1.2
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      map: carbonTex,
      color: 0x222222,
      roughness: 0.45,
      metalness: 0.50
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: this.accentColor,
      roughness: 0.25,
      metalness: 0.65
    });

    const haloMat = new THREE.MeshStandardMaterial({
      map: carbonTex,
      color: this.haloColor !== undefined ? this.haloColor : 0x2a2a2a,
      roughness: 0.35,
      metalness: 0.85
    });

    // 1. NOSECONE & MAIN CHASSIS
    // Nosecone (tapered wedge)
    const noseGeo = new THREE.ConeGeometry(0.38, 2.0, 5);
    noseGeo.rotateX(Math.PI / 2);
    noseGeo.scale(1.2, 0.45, 1.0);
    const noseMesh = new THREE.Mesh(noseGeo, bodyMat);
    noseMesh.position.set(0, 0.25, 1.6);
    noseMesh.castShadow = true;
    this.visualBody.add(noseMesh);

    // Front Nose Tip (camera pod)
    const noseTipGeo = new THREE.BoxGeometry(0.2, 0.1, 0.3);
    const noseTipMesh = new THREE.Mesh(noseTipGeo, carbonMat);
    noseTipMesh.position.set(0, 0.22, 2.65);
    this.visualBody.add(noseTipMesh);

    // Main Cockpit Monocoque Tub
    const tubGeo = new THREE.BoxGeometry(0.82, 0.42, 1.8);
    const tubMesh = new THREE.Mesh(tubGeo, bodyMat);
    tubMesh.position.set(0, 0.32, 0.3);
    tubMesh.castShadow = true;
    this.visualBody.add(tubMesh);

    // Sidepods (Left & Right aerodynamic cooling pods)
    const sidepodGeo = new THREE.BoxGeometry(0.42, 0.38, 1.6);
    // Left sidepod
    const leftSidepod = new THREE.Mesh(sidepodGeo, bodyMat);
    leftSidepod.position.set(-0.52, 0.28, 0.1);
    leftSidepod.castShadow = true;
    this.visualBody.add(leftSidepod);

    // Right sidepod
    const rightSidepod = new THREE.Mesh(sidepodGeo, bodyMat);
    rightSidepod.position.set(0.52, 0.28, 0.1);
    rightSidepod.castShadow = true;
    this.visualBody.add(rightSidepod);

    // Sidepod air intakes (black openings)
    const intakeGeo = new THREE.BoxGeometry(0.32, 0.24, 0.08);
    const intakeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
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

    // Shark Fin
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0, 0.42);
    finShape.lineTo(1.1, 0.05);
    finShape.lineTo(1.1, 0);
    finShape.closePath();
    const extrudeSettings = { depth: 0.04, bevelEnabled: false };
    const finGeo = new THREE.ExtrudeGeometry(finShape, extrudeSettings);
    finGeo.rotateY(Math.PI / 2);
    const finMesh = new THREE.Mesh(finGeo, carbonMat);
    finMesh.position.set(0.02, 0.58, -1.35);
    this.visualBody.add(finMesh);

    // 2. COCKPIT & DRIVER
    // Cockpit opening cutout
    const cockpitCutout = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.75), carbonMat);
    cockpitCutout.position.set(0, 0.48, 0.45);
    this.visualBody.add(cockpitCutout);

    // Driver Helmet with team matching accent color
    const helmetGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const helmetMat = new THREE.MeshStandardMaterial({
      color: this.accentColor || (this.isPlayer ? 0xffe600 : 0x00f0ff),
      roughness: 0.2,
      metalness: 0.3
    });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 0.52, 0.45);
    this.visualBody.add(helmet);

    // Helmet Visor
    const visorGeo = new THREE.BoxGeometry(0.18, 0.06, 0.12);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
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

    // 3. AERODYNAMIC WINGS
    // Front Wing Main Plane
    const frontWingGeo = new THREE.BoxGeometry(2.05, 0.04, 0.42);
    const frontWing = new THREE.Mesh(frontWingGeo, carbonMat);
    frontWing.position.set(0, 0.12, 2.35);
    frontWing.castShadow = true;
    this.visualBody.add(frontWing);

    // Front Wing Endplates
    const frontEndplateGeo = new THREE.BoxGeometry(0.04, 0.22, 0.52);
    const leftFrontEndplate = new THREE.Mesh(frontEndplateGeo, accentMat);
    leftFrontEndplate.position.set(-1.02, 0.18, 2.35);
    this.visualBody.add(leftFrontEndplate);

    const rightFrontEndplate = new THREE.Mesh(frontEndplateGeo, accentMat);
    rightFrontEndplate.position.set(1.02, 0.18, 2.35);
    this.visualBody.add(rightFrontEndplate);

    // Rear Wing Main Plane
    const rearWingGeo = new THREE.BoxGeometry(1.4, 0.04, 0.32);
    const rearWing = new THREE.Mesh(rearWingGeo, carbonMat);
    rearWing.position.set(0, 0.85, -1.8);
    rearWing.castShadow = true;
    this.visualBody.add(rearWing);

    // Rear Wing Upper DRS Flap
    const drsFlapGeo = new THREE.BoxGeometry(1.4, 0.03, 0.22);
    const drsFlap = new THREE.Mesh(drsFlapGeo, accentMat);
    drsFlap.position.set(0, 0.94, -1.82);
    drsFlap.rotation.x = -0.15;
    this.visualBody.add(drsFlap);

    // Rear Wing Endplates
    const rearEndplateGeo = new THREE.BoxGeometry(0.04, 0.45, 0.55);
    const leftRearEndplate = new THREE.Mesh(rearEndplateGeo, accentMat);
    leftRearEndplate.position.set(-0.7, 0.82, -1.8);
    leftRearEndplate.castShadow = true;
    this.visualBody.add(leftRearEndplate);

    const rightRearEndplate = new THREE.Mesh(rearEndplateGeo, accentMat);
    rightRearEndplate.position.set(0.7, 0.82, -1.8);
    rightRearEndplate.castShadow = true;
    this.visualBody.add(rightRearEndplate);

    // Rear Wing Support Pillars
    const rearPillarGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6);
    const leftPillar = new THREE.Mesh(rearPillarGeo, carbonMat);
    leftPillar.position.set(-0.2, 0.55, -1.75);
    leftPillar.rotation.x = -0.2;
    this.visualBody.add(leftPillar);

    const rightPillar = new THREE.Mesh(rearPillarGeo, carbonMat);
    rightPillar.position.set(0.2, 0.55, -1.75);
    rightPillar.rotation.x = -0.2;
    this.visualBody.add(rightPillar);

    // Rear Diffuser & Rain Safety Light
    const diffuserGeo = new THREE.BoxGeometry(1.1, 0.14, 0.38);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMat);
    diffuser.position.set(0, 0.16, -1.7);
    this.visualBody.add(diffuser);

    // Blinking Rain LED
    const rainLightGeo = new THREE.BoxGeometry(0.12, 0.06, 0.04);
    const rainLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.rainLight = new THREE.Mesh(rainLightGeo, rainLightMat);
    this.rainLight.position.set(0, 0.16, -1.9);
    this.visualBody.add(this.rainLight);
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
   * Update visual dynamics (steering, wheel spin, body roll/pitch, particles)
   */
  update(dt, speedMps, steerInput, lateralSlip, accelInput, brakeInput) {
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
  }

  setPositionAndRotation(pos, quat) {
    this.group.position.copy(pos);
    this.group.quaternion.copy(quat);
  }

  dispose() {
    this.scene.remove(this.group);
    for (const sp of this.smokeParticles) {
      this.scene.remove(sp.mesh);
    }
  }
}
