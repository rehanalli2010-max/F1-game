import * as THREE from 'three';

/**
 * Low-overhead visual FX: tire smoke billboards, fading skid-mark ribbons,
 * and high-speed barrier camera shake. All pools are preallocated so the
 * render loop never constructs Vector3 / Mesh objects.
 */
export class EffectsManager {
  constructor(scene) {
    this.scene = scene;

    this.shakeIntensity = 0;
    this.shakeTime = 0;
    this.SHAKE_DURATION = 0.32;
    this._shakeOffset = new THREE.Vector3();

    this._dummy = new THREE.Object3D();
    this._tmp = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._lastSkidL = new THREE.Vector3(Infinity, 0, 0);
    this._lastSkidR = new THREE.Vector3(Infinity, 0, 0);
    this._skidSpacing = 0.58;

    this.skidIndex = 0;
    this.skidMarks = [];

    this.initSkidMarks();
  }

  static createSkidTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(16, 0, 16, 64);
    g.addColorStop(0, 'rgba(12,12,12,0)');
    g.addColorStop(0.18, 'rgba(18,18,18,0.55)');
    g.addColorStop(0.5, 'rgba(10,10,10,0.85)');
    g.addColorStop(0.82, 'rgba(18,18,18,0.55)');
    g.addColorStop(1, 'rgba(12,12,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  initSkidMarks() {
    const count = 120;
    const geo = new THREE.PlaneGeometry(0.38, 1.15);
    geo.rotateX(-Math.PI / 2);
    const tex = EffectsManager.createSkidTexture();
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.visible = false;
      mesh.renderOrder = 1;
      mesh.frustumCulled = true;
      this.scene.add(mesh);
      this.skidMarks.push({
        mesh,
        life: 0,
        maxLife: 8
      });
    }
  }

  /**
   * Place a fading rubber ribbon on the asphalt when tire slip exceeds grip.
   */
  emitSkid(worldPos, heading, intensity) {
    if (!worldPos || intensity < 0.22) return;
    const mark = this.skidMarks[this.skidIndex];
    this.skidIndex = (this.skidIndex + 1) % this.skidMarks.length;

    mark.life = 0.001;
    mark.maxLife = 7.5 + Math.random() * 3.5;
    mark.mesh.visible = true;
    mark.mesh.position.set(worldPos.x, 0.028, worldPos.z);
    mark.mesh.rotation.y = Math.atan2(heading.x, heading.z);
    const w = 0.32 + intensity * 0.18;
    const l = 0.85 + intensity * 0.45;
    mark.mesh.scale.set(w, 1, l);
    mark.mesh.material.opacity = Math.min(0.72, 0.28 + intensity * 0.5);
  }

  /**
   * Emit left/right rear skids if the car has moved far enough since last mark.
   */
  updateSkids(dt, car, slip, brake, throttle, speedKmh) {
    if (!car || !car.wheelMeshes) return;

    const launch = throttle > 0.82 && speedKmh < 48;
    const heavyBrake = brake > 0.68 && speedKmh > 55;
    const drift = slip > 0.26 && speedKmh > 18;
    if (!launch && !heavyBrake && !drift) return;

    const intensity = Math.max(
      slip,
      launch ? 0.55 : 0,
      heavyBrake ? brake * 0.7 : 0
    );

    const rl = car.wheelMeshes.rl;
    const rr = car.wheelMeshes.rr;
    if (!rl || !rr) return;

    rl.getWorldPosition(this._tmp);
    this._fwd.set(0, 0, 1).applyQuaternion(car.group.quaternion);

    if (this._tmp.distanceToSquared(this._lastSkidL) > this._skidSpacing * this._skidSpacing) {
      this.emitSkid(this._tmp, this._fwd, intensity);
      this._lastSkidL.copy(this._tmp);
    }

    rr.getWorldPosition(this._tmp);
    if (this._tmp.distanceToSquared(this._lastSkidR) > this._skidSpacing * this._skidSpacing) {
      this.emitSkid(this._tmp, this._fwd, intensity);
      this._lastSkidR.copy(this._tmp);
    }
  }

  triggerShake(intensity) {
    const mag = Math.max(0, Math.min(1.25, intensity));
    if (mag >= this.shakeIntensity) {
      this.shakeIntensity = mag;
      this.shakeTime = this.SHAKE_DURATION;
    }
  }

  updateShake(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const falloff = this.shakeTime / this.SHAKE_DURATION;
      const mag = this.shakeIntensity * falloff;
      this._shakeOffset.set(
        (Math.random() - 0.5) * mag * 0.38,
        (Math.random() - 0.5) * mag * 0.22,
        (Math.random() - 0.5) * mag * 0.38
      );
      if (this.shakeTime <= 0) this.shakeIntensity = 0;
    } else {
      this._shakeOffset.set(0, 0, 0);
    }
    return this._shakeOffset;
  }

  getShakeOffset() {
    return this._shakeOffset;
  }

  update(dt, car, slip, brake, throttle, speedKmh) {
    this.updateSkids(dt, car, slip, brake, throttle, speedKmh);

    for (let i = 0; i < this.skidMarks.length; i++) {
      const s = this.skidMarks[i];
      if (s.life <= 0) continue;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.life = 0;
        s.mesh.visible = false;
      } else {
        const fade = 1 - s.life / s.maxLife;
        s.mesh.material.opacity = fade * 0.62;
      }
    }

    this.updateShake(dt);
  }

  reset() {
    this.shakeIntensity = 0;
    this.shakeTime = 0;
    this._shakeOffset.set(0, 0, 0);
    this._lastSkidL.set(Infinity, 0, 0);
    this._lastSkidR.set(Infinity, 0, 0);
    for (const s of this.skidMarks) {
      s.life = 0;
      s.mesh.visible = false;
    }
  }

  dispose() {
    for (const s of this.skidMarks) {
      this.scene.remove(s.mesh);
      if (s.mesh.material) s.mesh.material.dispose();
    }
    this.skidMarks.length = 0;
  }
}
