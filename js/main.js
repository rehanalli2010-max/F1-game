import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { AudioManager } from './audio.js?v=41';
import { F1Car } from './car.js?v=33';
import { PhysicsWorld } from './physics.js?v=62';
import { Track } from './circuit.js?v=321';
import { TimingSystem } from './timing.js?v=351';
import { SessionManager, SESSION_TYPES } from './session.js?v=351';
import { AIGridManager } from './ai.js?v=451';
import { TRACK_DATABASE, getTrackById } from './tracks_db.js?v=301';
import { NetworkManager, NETWORK_PACKET_TYPES } from './network.js?v=401';
import { F1_TEAMS, getTeamById } from './teams_db.js?v=101';
import { EffectsManager } from './fx.js?v=51';
import { i18n, SUPPORTED_LANGUAGES } from './i18n.js';

/**
 * Main Application Orchestrator for Phase 4 3D F1 Racing Game with P2P Multiplayer
 */
class F1Game {
  constructor() {
    window.game = this;
    this.i18n = i18n;
    this.i18n.addListener((lang) => this.onLanguageChanged(lang));
    this.canvas = document.getElementById('webgl-canvas');
    this.clock = new THREE.Clock();
    this.currentTrackId = 'monza';
    this.currentTeamId = localStorage.getItem('f1_player_team') || 'ferrari';

    // Core Subsystems
    this.audio = new AudioManager();
    this.physics = new PhysicsWorld();
    this.network = new NetworkManager();

    // Multiplayer WebRTC state
    this.isMultiplayer = false;
    this.isHost = false;
    this.guestTargetTransforms = new Map();
    this.lastInputSendTime = 0;

    this.cameraMode = 'CHASE'; // 'CHASE', 'COCKPIT', 'TV'
    this.controls = {
      throttle: 0,
      brake: 0,
      steer: 0
    };
    this.touchThrottle = 0;
    this.touchBrake = 0;
    this.touchSteer = 0;

    // Gamepad state
    this.gamepad = null;
    this.gamepadIndex = -1;
    this.gamepadConnected = false;
    this.hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this.keys = {};

    this.initThree();
    this.initTrack();
    this.initVehicles();
    this.initTimingAndSession();
    this.initMinimap();
    this.initInputs();
    this.initMobileControls();
    this.initUI();
    this.i18n.updateDOM();
    this.initNetwork();

    // Start rendering
    window.addEventListener('resize', () => this.onWindowResize());
    this.clock.start();
    requestAnimationFrame((t) => this.animate(t));
  }

  initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x76b5ed); // Bright summer sky
    this.scene.fog = new THREE.FogExp2(0xa9d2f5, 0.0007); // Soft atmospheric haze

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1500);
    this.camera.position.set(0, 5, -10);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;

    // 4. Lighting with Cascaded Shadow Maps (CSM)
    const hemiLight = new THREE.HemisphereLight(0x8ec8ff, 0x47783b, 1.25);
    this.scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambientLight);

    // Main sun light with CSM
    this.sunLight = new THREE.DirectionalLight(0xfff8ee, 1.85);
    this.sunLight.position.set(150, 200, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 450;
    const shadowD = 80;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // CSM: Additional cascade lights for crisp shadows at different distances
    this.csmCascades = [];
    const cascadeConfig = [
      { distance: 30, size: 20, mapSize: 1024 },
      { distance: 80, size: 40, mapSize: 1024 },
      { distance: 200, size: 100, mapSize: 1024 },
    ];

    for (let i = 0; i < cascadeConfig.length; i++) {
      const config = cascadeConfig[i];
      const cascadeLight = new THREE.DirectionalLight(0xfff8ee, 0);
      cascadeLight.position.copy(this.sunLight.position);
      cascadeLight.castShadow = true;
      cascadeLight.shadow.mapSize.width = config.mapSize;
      cascadeLight.shadow.mapSize.height = config.mapSize;
      cascadeLight.shadow.camera.near = 5;
      cascadeLight.shadow.camera.far = config.distance;
      cascadeLight.shadow.camera.left = -config.size;
      cascadeLight.shadow.camera.right = config.size;
      cascadeLight.shadow.camera.top = config.size;
      cascadeLight.shadow.camera.bottom = -config.size;
      cascadeLight.shadow.bias = -0.0005;
      cascadeLight.shadow.normalBias = 0.02;
      cascadeLight.shadow.autoUpdate = false; // Manual update for performance
      this.scene.add(cascadeLight);
      this.csmCascades.push({ light: cascadeLight, distance: config.distance, size: config.size });
    }

    // Camera follow vectors
    this.cameraTargetPos = new THREE.Vector3();
    this.cameraLookTarget = new THREE.Vector3();
    this.smoothLookAt = new THREE.Vector3();

    // Reusable scratch vectors (NEVER allocate inside render loop)
    this._scratchFwd = new THREE.Vector3(0, 0, 1);
    this._scratchPos = new THREE.Vector3();
    this._scratchVel = new THREE.Vector3();
    this._scratchCockpitPos = new THREE.Vector3();
    this._scratchCockpitLook = new THREE.Vector3();
    this._scratchTvPos = new THREE.Vector3();
    this._scratchTvTan = new THREE.Vector3();
    this._scratchUp = new THREE.Vector3(0, 1, 0);

    // Motion blur vignette post-processing
    this.initMotionBlurVignette();

    // Particle / FX systems
    this.fx = new EffectsManager(this.scene);
    this._wasImpacting = false;
  }

  initMotionBlurVignette() {
    // Create a full-screen vignette mesh for high-speed motion blur effect
    this.vignetteGeometry = new THREE.PlaneGeometry(2, 2);
    this.vignetteMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      depthTest: false,
    });
    this.vignetteMesh = new THREE.Mesh(this.vignetteGeometry, this.vignetteMaterial);
    this.vignetteMesh.renderOrder = 999;
    this.vignetteMesh.frustumCulled = false;
    this.scene.add(this.vignetteMesh);

    // Radial gradient texture for vignette
    const vignetteCanvas = document.createElement('canvas');
    vignetteCanvas.width = 512;
    vignetteCanvas.height = 512;
    const vctx = vignetteCanvas.getContext('2d');
    const gradient = vctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0.0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.6, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.85, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(1.0, 'rgba(0,0,0,0.8)');
    vctx.fillStyle = gradient;
    vctx.fillRect(0, 0, 512, 512);
    this.vignetteTexture = new THREE.CanvasTexture(vignetteCanvas);
    this.vignetteMaterial.map = this.vignetteTexture;
    this.vignetteMaterial.needsUpdate = true;
  }

  initTrack() {
    this.track = new Track(this.scene, this.physics, this.currentTrackId);
    this.physics.setTrack(this.track);
    this.physics.isOnTrackCallback = (x, z) => this.track.isOnTrack(x, z);
  }

  initVehicles() {
    // Player Vehicle initialized with selected F1 Team Livery
    const initialTeam = getTeamById(this.currentTeamId);
    this.playerVehicle = this.physics.createVehicleBody(0, 0.04, 0);
    this.playerCar = new F1Car(this.scene, true, {
      primaryColor: initialTeam.primaryColor,
      secondaryHex: initialTeam.secondaryHex,
      accentHex: initialTeam.accentHex,
      accentColor: initialTeam.accentColor,
      haloColor: initialTeam.haloColor,
      carNumber: initialTeam.driverNumber,
      driverName: 'PLAYER',
      teamName: initialTeam.fullName || initialTeam.name,
      teamId: initialTeam.id
    });

    // 10-Car Grid AI Subsystem
    this.aiGrid = new AIGridManager(this.track, this.physics, this.scene);
    this.aiGrid.init(this.playerVehicle, this.playerCar);
    this.aiGrid.setPlayerTeam(initialTeam);
    this.resetCamera();
  }

  initTimingAndSession() {
    this.timing = new TimingSystem(this.track, this.audio);

    // Session UI Callbacks
    const uiCallbacks = {
      showAlert: (msg, duration, cssClass) => this.showCenterAlert(msg, duration, cssClass),
      updateSessionBadge: (mode, status) => this.updateSessionBadge(mode, status),
      onSessionChange: (mode) => this.onSessionChanged(mode),
      setStartLightsVisible: (vis) => this.setStartLightsVisible(vis),
      updateGantryBulbs: (count) => this.updateGantryBulbs(count),
      showRaceFinishModal: (result) => this.showRaceFinishModal(result),
      showMockAd: (adConfig) => this.showMockAd(adConfig),
      broadcastLights: (data) => {
        if (this.isMultiplayer && this.isHost && this.network && this.network.isConnected) {
          this.network.send({
            type: NETWORK_PACKET_TYPES.START_LIGHTS,
            step: data.step,
            lightsOut: data.lightsOut
          });
        }
      }
    };

    this.session = new SessionManager(this.track, this.physics, this.timing, this.audio, uiCallbacks);
    this.session.setAIGridManager(this.aiGrid);

    // Start in Practice Mode by default
    this.session.initSession(SESSION_TYPES.PRACTICE, this.playerVehicle, this.playerCar);
  }

  initMinimap() {
    this.minimapCanvas = document.getElementById('minimap-canvas');
    if (!this.minimapCanvas) return;
    this.mmCtx = this.minimapCanvas.getContext('2d');
    this.minimapCanvas.width = 170;
    this.minimapCanvas.height = 170;
    this.updateMinimapBounds();
  }

  updateMinimapBounds() {
    if (!this.track || !this.track.sampledPoints || this.track.sampledPoints.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const pt of this.track.sampledPoints) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.z < minZ) minZ = pt.z;
      if (pt.z > maxZ) maxZ = pt.z;
    }

    const padding = 30;
    const spanX = (maxX - minX) + padding * 2;
    const spanZ = (maxZ - minZ) + padding * 2;
    const maxSpan = Math.max(spanX, spanZ);

    this.mmBounds = {
      minX: minX - padding,
      minZ: minZ - padding,
      scale: 150 / (maxSpan || 1)
    };
  }

  drawMinimap() {
    if (!this.mmCtx || !this.mmBounds) return;
    const ctx = this.mmCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw Track Line
    ctx.beginPath();
    ctx.strokeStyle = '#445166';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const toMmX = (x) => 10 + (x - this.mmBounds.minX) * this.mmBounds.scale;
    const toMmY = (z) => 10 + (z - this.mmBounds.minZ) * this.mmBounds.scale;

    for (let i = 0; i < this.track.sampledPoints.length; i++) {
      const pt = this.track.sampledPoints[i];
      const mx = toMmX(pt.x);
      const my = toMmY(pt.z);
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.closePath();
    ctx.stroke();

    // Start/Finish Line notch
    const sPt = this.track.curve.getPointAt(0.0);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(toMmX(sPt.x), toMmY(sPt.z), 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw all active AI cars (yellow/blue/red dots by team on radar)
    if (this.aiGrid && this.aiGrid.aiCars) {
      for (const ai of this.aiGrid.aiCars) {
        if (ai.active && ai.visualCar && ai.visualCar.group.visible) {
          const aiPos = ai.visualCar.group.position;
          // Color dots by livery / team palette so positions are easy to read at a glance
          const team = (ai.info && ai.info.color !== undefined) ? ai.info.color : 0x4d6b8a;
          const aColor = '#' + team.toString(16).padStart(6, '0');
          ctx.fillStyle = aColor;
          ctx.shadowColor = aColor;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(toMmX(aiPos.x), toMmY(aiPos.z), 3.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // Player Dot (F1 Red with heading) — drawn last so it always sits on top of opponents
    const pPos = this.playerCar.group.position;
    const px = toMmX(pPos.x);
    const py = toMmY(pPos.z);

    ctx.fillStyle = '#e10600';
    ctx.shadowColor = '#e10600';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Player heading triangle (white outline arrow)
    const pForward = this._scratchFwd.set(0, 0, 1).applyQuaternion(this.playerCar.group.quaternion);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(px + pForward.x * 9, py + pForward.z * 9);
    ctx.lineTo(px - pForward.x * 4 + (-pForward.z) * 4, py - pForward.z * 4 + (pForward.x) * 4);
    ctx.lineTo(px - pForward.x * 4 - (-pForward.z) * 4, py - pForward.z * 4 - (pForward.x) * 4);
    ctx.closePath();
    ctx.stroke();
  }

  resetInputs() {
    this.keys = {};
    this.touchThrottle = 0;
    this.touchBrake = 0;
    this.touchSteer = 0;
    this.controls.throttle = 0;
    this.controls.brake = 0;
    this.controls.steer = 0;
    if (this.playerVehicle) {
      this.playerVehicle.isReversing = false;
      this.playerVehicle.reverseBlocked = false;
      if (this.playerVehicle.body) {
        this.playerVehicle.body.angularVelocity.set(0, 0, 0);
      }
    }
    delete this._silverstoneAutoPilot;
    delete this._silverstoneAutopilot;
    // Clear active UI classes on touch/virtual controls
    ['touch-throttle', 'touch-brake', 'touch-left', 'touch-right', 'virtual-throttle', 'virtual-brake'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('active');
        if (id === 'virtual-throttle') el.style.background = 'rgba(0,210,190,0.3)';
        if (id === 'virtual-brake') el.style.background = 'rgba(255,59,48,0.3)';
      }
    });
  }

  initInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.key) this.keys[e.key.toLowerCase()] = true;

      // Audio resume on first keypress
      if (!this.audio.isInitialized) {
        this.audio.init();
      }

      // Hotkeys
      if (e.code === 'KeyR') this.restartSession();
      if (e.code === 'KeyM') this.toggleMute();
      if (e.code === 'KeyH') this.toggleHelpModal();
      if (e.code === 'KeyC') this.resetCamera();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.key) this.keys[e.key.toLowerCase()] = false;
    });

    // Zero out inputs whenever window loses focus, tabs change, or pointer cancels
    window.addEventListener('blur', () => this.resetInputs());
    window.addEventListener('focus', () => this.resetInputs());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetInputs();
    });
    window.addEventListener('pointercancel', () => this.resetInputs());
    window.addEventListener('mouseup', () => {
      this.touchThrottle = 0;
      this.touchBrake = 0;
      this.touchSteer = 0;
    });

    // Touch and mouse unlock for audio
    window.addEventListener('pointerdown', () => {
      if (!this.audio.isInitialized) {
        this.audio.init();
      }
    });

    // Gamepad API
    this.initGamepad();
  }

  initGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepad = e.gamepad;
      this.gamepadIndex = e.gamepad.index;
      this.gamepadConnected = true;
      console.log('[Gamepad] Connected:', this.gamepad.id, 'at index', this.gamepadIndex);
      this.showCenterAlert(`GAMEPAD CONNECTED: ${this.gamepad.id}`, 2000);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index === this.gamepadIndex) {
        this.gamepad = null;
        this.gamepadIndex = -1;
        this.gamepadConnected = false;
        console.log('[Gamepad] Disconnected');
        this.showCenterAlert('GAMEPAD DISCONNECTED', 2000);
      }
    });

    // Check for already connected gamepads
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.gamepad = gamepads[i];
        this.gamepadIndex = i;
        this.gamepadConnected = true;
        console.log('[Gamepad] Already connected:', this.gamepad.id);
        break;
      }
    }
  }

  initMobileControls() {
    const bindTouch = (id, onStart, onEnd) => {
      const btn = document.getElementById(id);
      if (!btn) return;

      // Prevent scrolling/zooming on iOS Safari - touch-action: none disables default touch behaviors
      btn.style.touchAction = 'none';

      const start = (e) => {
        if (e && e.cancelable) e.preventDefault();
        btn.classList.add('active');
        if (!this.audio.isInitialized) this.audio.init();
        onStart();
      };

      const end = (e) => {
        if (e && e.cancelable) e.preventDefault();
        btn.classList.remove('active');
        onEnd();
      };

      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('touchcancel', end, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
    };

    // Check if we need virtual analog steering slider (for touch devices without gamepad)
    if (this.hasTouchSupport) {
      this.initVirtualAnalogControls();
    } else {
      // Traditional button controls for desktop testing
      bindTouch('touch-left', () => this.touchSteer = 1, () => this.touchSteer = 0);
      bindTouch('touch-right', () => this.touchSteer = -1, () => this.touchSteer = 0);
      bindTouch('touch-throttle', () => this.touchThrottle = 1, () => this.touchThrottle = 0);
      bindTouch('touch-brake', () => this.touchBrake = 1, () => this.touchBrake = 0);
    }



    const resetBtn = document.getElementById('touch-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.restartSession();
      });
    }
  }

  initVirtualAnalogControls() {
    // Create virtual analog steering slider on left
    const steerZone = document.getElementById('touch-left');
    const rightZone = document.getElementById('touch-right');
    
    if (steerZone && rightZone) {
      // Replace buttons with analog zones
      steerZone.outerHTML = `
        <div id="virtual-steer" class="virtual-analog-zone" style="
          position: fixed;
          left: 20px;
          bottom: 20px;
          width: 120px;
          height: 120px;
          background: rgba(13,17,26,0.7);
          border: 2px solid rgba(0,240,255,0.3);
          border-radius: 60px;
          touch-action: none;
          z-index: 999;
        "></div>
      `;
      
      rightZone.outerHTML = `
        <div id="virtual-pedals" class="virtual-analog-zone" style="
          position: fixed;
          right: 20px;
          bottom: 20px;
          width: 140px;
          height: 180px;
          background: rgba(13,17,26,0.7);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          touch-action: none;
          z-index: 999;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          padding: 15px;
          align-items: center;
        ">
          <div id="virtual-brake" class="virtual-pedal" style="
            width: 70px; height: 70px;
            background: rgba(255,59,48,0.3);
            border: 2px solid rgba(255,59,48,0.5);
            border-radius: 35px;
            display: flex; align-items: center; justify-content: center;
            color: #ff3b30; font-weight: 900; font-size: 11px;
            touch-action: none;
          ">BRAKE</div>
          <div id="virtual-throttle" class="virtual-pedal" style="
            width: 80px; height: 80px;
            background: rgba(0,210,190,0.3);
            border: 2px solid rgba(0,210,190,0.5);
            border-radius: 40px;
            display: flex; align-items: center; justify-content: center;
            color: #00d2be; font-weight: 900; font-size: 11px;
            touch-action: none;
          ">GAS</div>
        </div>
      `;

      this.setupVirtualAnalogSteering();
      this.setupVirtualPedals();
    }

    // Keep reset button

    const resetBtn = document.getElementById('touch-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.restartSession();
      });
    }
  }

  setupVirtualAnalogSteering() {
    const steerZone = document.getElementById('virtual-steer');
    if (!steerZone) return;

    let activeTouchId = null;
    const centerX = 60; // half of 120px
    const centerY = 60;
    const maxRadius = 50;

    const handleTouchStart = (e) => {
      e.preventDefault();
      if (!this.audio.isInitialized) this.audio.init();
      const touch = e.changedTouches[0];
      activeTouchId = touch.identifier;
      this.updateVirtualSteer(touch.clientX, touch.clientY, steerZone, centerX, centerY, maxRadius);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          this.updateVirtualSteer(touch.clientX, touch.clientY, steerZone, centerX, centerY, maxRadius);
          break;
        }
      }
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          activeTouchId = null;
          this.touchSteer = 0;
          break;
        }
      }
    };

    steerZone.addEventListener('touchstart', handleTouchStart, { passive: false });
    steerZone.addEventListener('touchmove', handleTouchMove, { passive: false });
    steerZone.addEventListener('touchend', handleTouchEnd, { passive: false });
    steerZone.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }

  updateVirtualSteer(clientX, clientY, steerZone, centerX, centerY, maxRadius) {
    const rect = steerZone.getBoundingClientRect();
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;
    const dist = Math.sqrt(x * x + y * y);
    
    // Clamp to circle
    let clampedX = x;
    let clampedY = y;
    if (dist > maxRadius) {
      clampedX = (x / dist) * maxRadius;
      clampedY = (y / dist) * maxRadius;
    }
    
    // Visual feedback - move a small indicator
    steerZone.style.background = `radial-gradient(circle at ${centerX + clampedX}px ${centerY + clampedY}px, rgba(0,240,255,0.3), rgba(13,17,26,0.7))`;
    
    // Steer is horizontal offset (-1 left, +1 right)
    this.touchSteer = -clampedX / maxRadius;
  }

  setupVirtualPedals() {
    const brakeBtn = document.getElementById('virtual-brake');
    const throttleBtn = document.getElementById('virtual-throttle');
    
    if (!brakeBtn || !throttleBtn) return;

    let activeBrakeTouch = null;
    let activeThrottleTouch = null;

    const bindPedal = (btn, pedalType) => {
      const start = (e) => {
        e.preventDefault();
        if (!this.audio.isInitialized) this.audio.init();
        btn.classList.add('active');
        btn.style.background = pedalType === 'brake' 
          ? 'rgba(255,59,48,0.6)' 
          : 'rgba(0,210,190,0.6)';
        if (pedalType === 'brake') {
          activeBrakeTouch = e.changedTouches[0].identifier;
          this.touchBrake = 1;
        } else {
          activeThrottleTouch = e.changedTouches[0].identifier;
          this.touchThrottle = 1;
        }
      };
      
      const end = (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if ((pedalType === 'brake' && touch.identifier === activeBrakeTouch) ||
              (pedalType === 'throttle' && touch.identifier === activeThrottleTouch)) {
            btn.classList.remove('active');
            btn.style.background = pedalType === 'brake' 
              ? 'rgba(255,59,48,0.3)' 
              : 'rgba(0,210,190,0.3)';
            if (pedalType === 'brake') {
              activeBrakeTouch = null;
              this.touchBrake = 0;
            } else {
              activeThrottleTouch = null;
              this.touchThrottle = 0;
            }
            break;
          }
        }
      };

      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('touchcancel', end, { passive: false });
    };

    window.addEventListener('touchend', (e) => {
      if (!e.touches || e.touches.length === 0) {
        this.touchThrottle = 0;
        this.touchBrake = 0;
        activeBrakeTouch = null;
        activeThrottleTouch = null;
        if (brakeBtn) {
          brakeBtn.classList.remove('active');
          brakeBtn.style.background = 'rgba(255,59,48,0.3)';
        }
        if (throttleBtn) {
          throttleBtn.classList.remove('active');
          throttleBtn.style.background = 'rgba(0,210,190,0.3)';
        }
      }
    });
    window.addEventListener('touchcancel', (e) => {
      if (!e.touches || e.touches.length === 0) {
        this.touchThrottle = 0;
        this.touchBrake = 0;
        activeBrakeTouch = null;
        activeThrottleTouch = null;
      }
    });

    bindPedal(brakeBtn, 'brake');
    bindPedal(throttleBtn, 'throttle');
  }

  updateControls(dt) {
    // Poll gamepad state
    if (this.gamepadConnected) {
      const gamepads = navigator.getGamepads();
      this.gamepad = gamepads[this.gamepadIndex];
    }

    // If controls locked during lights countdown in Race mode
    if (this.session.currentMode === SESSION_TYPES.RACE && (this.session.raceState === 'LIGHTS_COUNTDOWN' || this.session.raceState === 'PRE_START')) {
      const isAcc = !!(this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'] || this.touchThrottle > 0 || (this.gamepad && this.gamepad.buttons[7]?.pressed)); // RT/R2
      this.controls.throttle = 0; // Strictly zero throttle - car cannot move before red lights go off!
      this.controls.brake = 1.0;
      this.controls.steer = 0;
      // Allow visual/audio RPM revving on the grid without moving the car
      if (isAcc && this.playerVehicle) {
        this.playerVehicle.rpm = Math.min(12500, Math.max(this.playerVehicle.rpm || 4000, 10800));
      }
      return;
    }

    // Gamepad input (if connected)
    let gamepadThrottle = 0;
    let gamepadBrake = 0;
    let gamepadSteer = 0;

    if (this.gamepad && this.gamepadConnected) {
      // Left Stick X axis for steering (standard mapping: axes[0])
      const leftStickX = this.gamepad.axes[0] || 0;
      // D-Pad fallback for steering
      const dpadLeft = this.gamepad.buttons[14]?.pressed || false;
      const dpadRight = this.gamepad.buttons[15]?.pressed || false;
      
      if (Math.abs(leftStickX) > 0.15) {
        gamepadSteer = -leftStickX; // Invert: left stick left = positive steer (turn left)
      } else if (dpadLeft) {
        gamepadSteer = 1;
      } else if (dpadRight) {
        gamepadSteer = -1;
      }

      // Right Trigger (RT/R2) - index 7 for standard gamepad, 5 for some
      const rtValue = this.gamepad.buttons[7]?.value || this.gamepad.buttons[5]?.value || 0;
      if (rtValue > 0.15) {
        gamepadThrottle = rtValue;
      }

      // Left Trigger (LT/L2) - index 6 for standard gamepad, 4 for some
      const ltValue = this.gamepad.buttons[6]?.value || this.gamepad.buttons[4]?.value || 0;
      if (ltValue > 0.15) {
        gamepadBrake = ltValue;
      }

      // Also support face buttons: A (cross) for throttle, B (circle) for brake
      if (this.gamepad.buttons[0]?.pressed) { // A / Cross
        gamepadThrottle = Math.max(gamepadThrottle, 1.0);
      }
      if (this.gamepad.buttons[1]?.pressed) { // B / Circle
        gamepadBrake = Math.max(gamepadBrake, 1.0);
      }
    }

    // Throttle (W, Up Arrow, or Mobile Touch Gas, or Gamepad RT)
    const isAccelerating = !!(this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'] || this.touchThrottle > 0 || gamepadThrottle > 0);
    const targetThrottle = isAccelerating ? Math.max(this.touchThrottle, gamepadThrottle, 1.0) : 0;
    if (isAccelerating) {
      this.controls.throttle = Math.min(1.0, this.controls.throttle + dt * 5.5);
    } else {
      this.controls.throttle = Math.max(0.0, this.controls.throttle - dt * 7.5);
    }

    // Brake / Reverse (S, Down Arrow, or Mobile Touch Brake, or Gamepad LT)
    const isBraking = !!(this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s'] || this.touchBrake > 0 || gamepadBrake > 0);
    if (isBraking) {
      // Anti-reverse protection near Start/Finish line & starting lights
      if (this.track && this.playerVehicle) {
        const trackInfo = this.track.getClosestTrackPoint(this.playerVehicle.body.position.x, this.playerVehicle.body.position.z);
        if ((trackInfo.t < 0.035 || trackInfo.t > 0.965) && this.playerVehicle.body.velocity.length() < 0.8) {
          this.controls.brake = 1.0;
          this.playerVehicle.isReversing = false;
          this.showCenterAlert('REVERSE ACROSS START LINE PROHIBITED', 2000, 'alert-penalty');
        } else {
          this.controls.brake = Math.min(1.0, this.controls.brake + dt * 7.0);
        }
      } else {
        this.controls.brake = Math.min(1.0, this.controls.brake + dt * 7.0);
      }
    } else {
      this.controls.brake = Math.max(0.0, this.controls.brake - dt * 8.5);
    }

    // Steering: A / Left Arrow / Touch-Left / Gamepad Left Stick = Steer LEFT (+1)
    //           D / Right Arrow / Touch-Right / Gamepad Right Stick = Steer RIGHT (-1)
    let targetSteer = 0;
    const isLeft = this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a'];
    const isRight = this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d'];
    if (isLeft) targetSteer += 1;
    if (isRight) targetSteer -= 1;
    targetSteer += this.touchSteer;
    targetSteer += gamepadSteer;
    targetSteer = Math.max(-1, Math.min(1, targetSteer));

    // AAA Asymmetric Smoothing Filter:
    // Smooth turn-in attack (dt * 9.5) avoids twitchy sharp jerking
    // Snappy centering return (dt * 26.0) eliminates sluggish lingering lag
    const steerRate = targetSteer === 0 ? 26.0 : 9.5;
    this.controls.steer += (targetSteer - this.controls.steer) * Math.min(1, dt * steerRate);
  }

  cycleCamera() {
    // Camera is permanently locked to Third-Person Chase View
    this.cameraMode = 'CHASE';
    this.resetCamera();
  }

  resetCamera() {
    this.cameraMode = 'CHASE';
    this._smoothCameraForward = null;
    const isGuest = (this.isMultiplayer && !this.isHost && this.aiGrid && this.aiGrid.aiCars[0]);
    const focusCar = isGuest ? this.aiGrid.aiCars[0].visualCar : this.playerCar;
    if (focusCar && focusCar.group) {
      const effPos = focusCar.group.position;
      const effForward = new THREE.Vector3(0, 0, 1).applyQuaternion(focusCar.group.quaternion);
      this._smoothCameraForward = effForward.clone();
      this.camera.fov = 62;
      this.camera.updateProjectionMatrix();
      this.camera.position.copy(effPos).addScaledVector(effForward, -6.0);
      this.camera.position.y = effPos.y + 2.15;
      this.cameraLookTarget.copy(effPos).addScaledVector(effForward, 4.2);
      this.cameraLookTarget.y = effPos.y + 0.85;
      this.camera.lookAt(this.cameraLookTarget);
    }
  }

  updateCamera(dt, carPos, carForward, speedMps) {
    const isGuest = (this.isMultiplayer && !this.isHost && this.aiGrid && this.aiGrid.aiCars[0]);
    const focusCar = isGuest ? this.aiGrid.aiCars[0].visualCar : this.playerCar;
    const effPos = focusCar ? focusCar.group.position : carPos;
    const effForward = focusCar ? new THREE.Vector3(0, 0, 1).applyQuaternion(focusCar.group.quaternion) : carForward;
    const effSpeedMps = speedMps;

    // Enforce Third-Person Chase View
    this.cameraMode = 'CHASE';

    // Third-person smooth follow
    const speedKmh = Math.abs(effSpeedMps) * 3.6;
    // Dynamic FOV based on speed (sensational warp feeling: 62 deg at rest to 74 deg at 320 km/h)
    const targetFov = 62 + Math.min(12, (speedKmh / 320) * 12);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, dt * 5.0);
    this.camera.updateProjectionMatrix();

    // Optimal chase position: ~6.0m behind, ~2.15m up (plus subtle speed elevation for corner visibility)
    const behindDist = 6.0;
    const heightDist = 2.15 + Math.min(0.35, (speedKmh / 350) * 0.35);

    // Smooth camera heading (yaw) so camera swings around corners smoothly
    // while maintaining a rock-solid, locked distance along the car's forward axis
    // (eliminates forward-backward distance rubber-banding & acceleration vibration)
    if (!this._smoothCameraForward || !Number.isFinite(this._smoothCameraForward.x)) {
      this._smoothCameraForward = new THREE.Vector3().copy(effForward);
    }
    const headingFollowSpeed = Math.min(1.0, dt * 10.0);
    this._smoothCameraForward.lerp(effForward, headingFollowSpeed).normalize();

    // Lock camera position relative to car along smoothed heading
    this.camera.position.copy(effPos)
      .addScaledVector(this._smoothCameraForward, -behindDist);
    this.camera.position.y = effPos.y + heightDist;

    // Smooth lookahead point along the car's smoothed direction
    this.cameraLookTarget.copy(effPos)
      .addScaledVector(this._smoothCameraForward, 4.2);
    this.cameraLookTarget.y = effPos.y + 0.85;

    this.camera.lookAt(this.cameraLookTarget);

    // Inject camera shake offset (subtle vibration from kerbs & impacts)
    if (this.fx) {
      const shakeOffset = this.fx.getShakeOffset();
      if (this.fx.shakeTime > 0) {
        this.camera.position.x += shakeOffset.x;
        this.camera.position.y += shakeOffset.y;
        this.camera.position.z += shakeOffset.z;
      }
    }
  }

  restartSession() {
    this.resetInputs();
    this.session.initSession(this.session.currentMode, this.playerVehicle, this.playerCar);
    this.resetInputs();
    this.resetCamera();
  }

  toggleMute() {
    const isMuted = this.audio.toggleMute();
    const muteIcon = document.getElementById('mute-icon');
    if (muteIcon) {
      muteIcon.innerHTML = isMuted
        ? '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>'
        : '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
    }
  }

  /* --------------------------------------------------------------------------
     HUD & UI SYNCHRONIZATION
     -------------------------------------------------------------------------- */
  initUI() {
    // Session buttons
    const practiceBtn = document.getElementById('btn-mode-practice');
    const raceBtn = document.getElementById('btn-mode-race');

    if (practiceBtn) practiceBtn.addEventListener('click', () => this.session.initSession(SESSION_TYPES.PRACTICE, this.playerVehicle, this.playerCar));
    if (raceBtn) {
      raceBtn.addEventListener('click', () => {
        this.session.initSession(SESSION_TYPES.RACE, this.playerVehicle, this.playerCar);
      });
    }

    // 3-Tier AI Difficulty selector buttons
    const diffButtons = document.querySelectorAll('.diff-btn');
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const diff = btn.getAttribute('data-diff');
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.session.setDifficulty(diff);
        this.showCenterAlert(`AI DIFFICULTY: ${diff}`, 1800);
      });
    });

    // Icon action buttons
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) muteBtn.addEventListener('click', () => this.toggleMute());

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.addEventListener('click', () => this.restartSession());

    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) helpBtn.addEventListener('click', () => this.toggleHelpModal());

    const langBtn = document.getElementById('lang-btn');
    if (langBtn) langBtn.addEventListener('click', () => this.openLanguageModal());

    // Modal buttons
    const closeHelp = document.getElementById('btn-close-help');
    if (closeHelp) closeHelp.addEventListener('click', () => this.toggleHelpModal(false));

    const closeLang = document.getElementById('btn-close-lang');
    if (closeLang) closeLang.addEventListener('click', () => this.closeModals());

    this.initLanguageSelectorUI();

    const raceAgain = document.getElementById('btn-race-again');
    if (raceAgain) raceAgain.addEventListener('click', () => {
      this.closeModals();
      this.session.initSession(SESSION_TYPES.RACE, this.playerVehicle, this.playerCar);
    });

    const raceToPractice = document.getElementById('btn-race-practice');
    if (raceToPractice) raceToPractice.addEventListener('click', () => {
      this.closeModals();
      this.session.returnToMenu(SESSION_TYPES.PRACTICE, this.playerVehicle, this.playerCar);
    });

    // Track selector dropdown button & modal
    const trackSelectBtn = document.getElementById('btn-track-select');
    if (trackSelectBtn) {
      trackSelectBtn.addEventListener('click', () => {
        this.openTrackSelectModal();
      });
    }

    const closeTrackSelect = document.getElementById('btn-close-track-select');
    if (closeTrackSelect) {
      closeTrackSelect.addEventListener('click', () => {
        this.closeModals();
      });
    }

    this.initTrackSelectorUI();

    // Car & Constructor Team selector dropdown button & modal
    const carSelectBtn = document.getElementById('btn-car-select');
    if (carSelectBtn) {
      carSelectBtn.addEventListener('click', () => {
        this.openCarSelectModal();
      });
    }

    const closeCarSelect = document.getElementById('btn-close-car-select');
    if (closeCarSelect) {
      closeCarSelect.addEventListener('click', () => {
        this.closeModals();
      });
    }

    const currentTeam = getTeamById(this.currentTeamId);
    this.initCarSelectorUI();
    this.updateCarHeaderButton(currentTeam);
    this.updateHUDDriverBadge(currentTeam);

    // Multiplayer Lobby button & modals
    const mpBtn = document.getElementById('btn-mode-multiplayer');
    if (mpBtn) {
      mpBtn.addEventListener('click', () => {
        this.openMultiplayerModal();
      });
    }

    const closeMpBtn = document.getElementById('btn-close-mp');
    if (closeMpBtn) {
      closeMpBtn.addEventListener('click', () => {
        this.closeModals();
      });
    }

    const copyCodeBtn = document.getElementById('btn-copy-code');
    if (copyCodeBtn) {
      copyCodeBtn.addEventListener('click', () => {
        const codeText = document.getElementById('mp-host-code')?.textContent;
        if (codeText && codeText !== 'GENERATING...') {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(codeText).then(() => {
              const toast = document.getElementById('mp-copy-toast');
              if (toast) {
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 1600);
              }
            });
          } else {
            const toast = document.getElementById('mp-copy-toast');
            if (toast) {
              toast.classList.add('show');
              setTimeout(() => toast.classList.remove('show'), 1600);
            }
          }
        }
      });
    }

    const launchMpBtn = document.getElementById('btn-mp-launch');
    if (launchMpBtn) {
      launchMpBtn.addEventListener('click', () => {
        this.launchMultiplayerWeekend();
      });
    }

    const joinMpBtn = document.getElementById('btn-mp-join');
    if (joinMpBtn) {
      joinMpBtn.addEventListener('click', () => {
        const input = document.getElementById('mp-input-code');
        const code = input ? input.value.trim().toUpperCase() : '';
        if (code) {
          const statusText = document.getElementById('mp-guest-status-text');
          if (statusText) statusText.textContent = `Connecting to room ${code}...`;
          const dot = document.getElementById('mp-guest-dot');
          if (dot) {
            dot.className = 'mp-pulse amber';
          }
          this.network.joinRoom(code);
        } else {
          this.showCenterAlert('PLEASE ENTER A 6-CHARACTER ROOM CODE', 2000, 'alert-penalty');
        }
      });
    }

    const closeDiscBtn = document.getElementById('btn-close-disconnect');
    if (closeDiscBtn) {
      closeDiscBtn.addEventListener('click', () => {
        this.closeModals();
        this.session.setMultiplayerMode(false, false);
        this.session.initSession(SESSION_TYPES.PRACTICE, this.playerVehicle, this.playerCar);
      });
    }

    // Create 15 RPM LED elements
    const ledContainer = document.getElementById('rpm-leds');
    if (ledContainer) {
      ledContainer.innerHTML = '';
      for (let i = 0; i < 15; i++) {
        const led = document.createElement('div');
        led.className = 'rpm-led';
        led.id = `rpm-led-${i}`;
        ledContainer.appendChild(led);
      }
    }
  }

  updateHUD(speedKmh, gear, rpm, throttle, brake, drsActive) {
    // Speed
    const speedEl = document.getElementById('speed-value');
    if (speedEl) speedEl.textContent = String(Math.round(speedKmh)).padStart(3, '0');

    // Gear
    const gearEl = document.getElementById('gear-value');
    if (gearEl) {
      if (gear === -1) gearEl.textContent = 'R';
      else if (gear === 0) gearEl.textContent = 'N';
      else gearEl.textContent = String(gear);
    }

    // RPM LEDs (15 units)
    // 0-4: Green (8000-10500 RPM)
    // 5-9: Red (10500-12500 RPM)
    // 10-14: Purple (12500-13500 RPM, flashing at redline)
    const rpmFrac = Math.max(0, Math.min(1, (rpm - 6000) / 7500));
    const activeLeds = Math.min(15, Math.floor(rpmFrac * 15));

    // Phase 5: Tachometer Bar (continuous RPM gauge)
    const tachFill = document.getElementById('tach-fill');
    if (tachFill) {
      tachFill.style.width = `${rpmFrac * 100}%`;
      if (rpmFrac > 0.97) tachFill.classList.add('over-red');
      else tachFill.classList.remove('over-red');
    }

    for (let i = 0; i < 15; i++) {
      const led = document.getElementById(`rpm-led-${i}`);
      if (!led) continue;
      led.className = 'rpm-led';

      if (i < activeLeds) {
        if (i < 5) led.classList.add('green-active');
        else if (i < 10) led.classList.add('red-active');
        else {
          led.classList.add('blue-active');
          if (rpm >= 13200) led.classList.add('flash-purple');
        }
      }
    }

    // Pedals
    const throttleFill = document.getElementById('pedal-throttle-fill');
    if (throttleFill) throttleFill.style.width = `${Math.round(throttle * 100)}%`;

    const brakeFill = document.getElementById('pedal-brake-fill');
    if (brakeFill) brakeFill.style.width = `${Math.round(brake * 100)}%`;

    // DRS & Drift
    const drsBadge = document.getElementById('drs-badge');
    if (drsBadge) {
      if (drsActive) drsBadge.classList.add('active');
      else drsBadge.classList.remove('active');
    }

    const driftBadge = document.getElementById('drift-badge');
    if (driftBadge) {
      const isDrifting = this.playerVehicle.lateralSlip > 0.32 || this.controls.handbrake;
      driftBadge.style.display = isDrifting ? 'inline-block' : 'none';
    }

    // Lap Timing
    const curTimeEl = document.getElementById('timing-current');
    if (curTimeEl) curTimeEl.textContent = TimingSystem.formatTime(this.timing.currentLapTime);

    const bestTimeEl = document.getElementById('timing-best');
    if (bestTimeEl) bestTimeEl.textContent = TimingSystem.formatTime(this.timing.bestLapTime);

    const lastTimeEl = document.getElementById('timing-last');
    if (lastTimeEl) lastTimeEl.textContent = TimingSystem.formatTime(this.timing.lastLapTime);

    // Delta badge
    const deltaEl = document.getElementById('timing-delta');
    if (deltaEl && this.timing.bestLapTime) {
      const delta = this.timing.currentLapTime - this.timing.bestLapTime;
      deltaEl.textContent = TimingSystem.formatDelta(delta);
      deltaEl.className = 'delta-badge ' + (delta <= 0 ? 'faster' : 'slower');
    }

    // F1 Timing Tower Lap Counter & Live Position Indicator
    const playerPosEl = document.getElementById('hud-player-pos');
    if (playerPosEl) {
      if (this.session.currentMode === SESSION_TYPES.RACE) {
        const livePos = this.aiGrid ? this.aiGrid.getPlayerLivePosition() : 1;
        playerPosEl.style.display = 'inline-block';
        playerPosEl.textContent = `P${livePos} / 10`;
      } else {
        playerPosEl.style.display = 'none';
      }
    }

    const lapCounterEl = document.getElementById('hud-lap-counter');
    if (lapCounterEl) {
      if (this.session.currentMode === SESSION_TYPES.PRACTICE) {
        lapCounterEl.textContent = `LAP ${this.timing.currentLap}`;
      } else if (this.session.currentMode === SESSION_TYPES.RACE) {
        if (this.session.raceState === 'FINISHED') {
          lapCounterEl.textContent = `LAP ${this.session.raceLapsTotal}/${this.session.raceLapsTotal}`;
        } else {
          lapCounterEl.textContent = `LAP ${Math.min(this.session.playerRaceLap, this.session.raceLapsTotal)}/${this.session.raceLapsTotal}`;
        }
      }
    }

    // Live 10-Car Race Position Tower HUD
    const raceTowerEl = document.getElementById('race-position-tower');
    const towerRowsEl = document.getElementById('position-tower-rows');
    if (raceTowerEl && towerRowsEl) {
      if (this.session.currentMode === SESSION_TYPES.RACE) {
        raceTowerEl.style.display = 'flex';
        const leaderboard = this.aiGrid ? this.aiGrid.getLiveLeaderboard() : [];
        if (leaderboard && leaderboard.length > 0) {
          let rowsHtml = '';
          for (let i = 0; i < leaderboard.length; i++) {
            const entry = leaderboard[i];
            const gapStr = entry.gapSeconds === 'LEADER' ? 'LEADER' : `+${entry.gapSeconds}s`;
            rowsHtml += `
              <div class="tower-row ${entry.isPlayer ? 'player-row' : ''}">
                <span class="tower-pos">P${entry.pos}</span>
                <div class="tower-driver-cell">
                  <span class="tower-team-bar" style="background:${entry.color};"></span>
                  <span class="tower-code">${entry.code}</span>
                </div>
                <span class="tower-gap">${gapStr}</span>
              </div>
            `;
          }
          towerRowsEl.innerHTML = rowsHtml;
        }
      } else {
        raceTowerEl.style.display = 'none';
      }
    }

    // Sector status indicators
    this.updateSectorHUD();

    // Wrong Way Alert
    if (this.timing.isDrivingWrongWay) {
      this.showCenterAlert('WRONG WAY!', 200, 'alert-wrong-way');
    }
  }

  updateSectorHUD() {
    const s1 = document.getElementById('sector-status-1');
    const s2 = document.getElementById('sector-status-2');
    const s3 = document.getElementById('sector-status-3');

    const setSectorClass = (el, val, isBest) => {
      if (!el) return;
      el.className = 'sector-status';
      if (val !== null) {
        el.classList.add(isBest ? 'purple' : 'green');
      }
    };

    if (s1) setSectorClass(s1, this.timing.sectorTimes[0], true);
    if (s2) setSectorClass(s2, this.timing.sectorTimes[1], true);
    if (s3) setSectorClass(s3, this.timing.sectorTimes[2], true);

    // Phase 5: Sector Delta Tracker (3 split per-sector +/- vs session best)
    this.renderSectorDeltas();
  }

  /**
   * Render the per-sector delta splits (+/- vs each sector's best time this session)
   */
  renderSectorDeltas() {
    const cells = [
      document.getElementById('sd-1'),
      document.getElementById('sd-2'),
      document.getElementById('sd-3')
    ];
    const bests = (this.timing && this.timing.sessionBestSectorTimes) || [null, null, null];
    const current = (this.timing && this.timing.sectorTimes) || [null, null, null];

    for (let i = 0; i < 3; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const valEl = cell.querySelector('.sd-value');
      const c = current[i];
      const b = bests[i];

      if (c === null || c === undefined) {
        cell.className = 'sd-cell neutral';
        if (valEl) valEl.textContent = '--';
        continue;
      }

      if (b && Number.isFinite(b) && b > 0) {
        const delta = c - b;
        const sign = delta > 0 ? '+' : '-';
        if (valEl) valEl.textContent = `${sign}${Math.abs(delta).toFixed(3)}`;
        // Tiny epsilon so perfectly matching sectors still show purple
        if (Math.abs(delta) < 0.001) cell.className = 'sd-cell purple';
        else if (delta < 0) cell.className = 'sd-cell green';
        else cell.className = 'sd-cell red';
      } else {
        // First lap / no reference yet -> purple (overall best by default)
        if (valEl) valEl.textContent = `${c.toFixed(2)}s`;
        cell.className = 'sd-cell purple';
      }
    }
  }

  showCenterAlert(text, durationMs = 2500, cssClass = 'alert-flying-lap') {
    const container = document.getElementById('center-alert-container');
    if (!container) return;

    // Translate standard alert messages if i18n is available
    let displayText = text;
    if (this.i18n) {
      if (text === 'LIGHTS OUT AND AWAY WE GO!') {
        displayText = this.i18n.t('alert_lights_out');
      } else if (text === 'FLYING LAP ACTIVE - MAXIMUM ATTACK!') {
        displayText = this.i18n.t('alert_flying_lap');
      } else if (text === 'PRACTICE SESSION - FREE DRIVING') {
        displayText = this.i18n.t('alert_practice_start');
      } else if (text === 'OUT-LAP APPROACH - PREPARE FOR HOT LAP') {
        displayText = this.i18n.t('alert_out_lap');
      } else if (text === 'JUMP START PENALTY (+5.0s)') {
        displayText = this.i18n.t('alert_jump_start');
      } else if (text === 'LAP INVALIDATED - CHECKPOINTS MISSED') {
        displayText = this.i18n.t('alert_lap_invalidated');
      } else if (text === 'FINAL LAP!') {
        displayText = this.i18n.t('alert_final_lap');
      } else if (text === 'WRONG WAY!') {
        displayText = this.i18n.t('alert_wrong_way');
      } else if (text === 'REVERSE ACROSS START LINE PROHIBITED') {
        displayText = this.i18n.t('alert_reverse_prohibited');
      } else if (text.startsWith('CIRCUIT LOADED: ')) {
        const name = text.replace('CIRCUIT LOADED: ', '');
        displayText = this.i18n.t('alert_circuit_loaded', { name });
      } else if (text.startsWith('CAR SELECTED: ')) {
        const team = text.replace('CAR SELECTED: ', '');
        displayText = this.i18n.t('alert_car_selected', { team });
      } else if (text.startsWith('CHECKERED FLAG! WINNER: ')) {
        const winner = text.replace('CHECKERED FLAG! WINNER: ', '');
        displayText = this.i18n.t('alert_checkered_flag', { winner });
      } else if (text.startsWith('AI DIFFICULTY: ')) {
        const diff = text.replace('AI DIFFICULTY: ', '');
        displayText = this.i18n.t('alert_ai_diff', { diff });
      } else if (this.i18n.t(text) !== text) {
        displayText = this.i18n.t(text);
      }
    }

    // Clear previous
    container.innerHTML = '';
    const alertBox = document.createElement('div');
    alertBox.className = `center-alert visible ${cssClass}`;
    alertBox.textContent = displayText;
    container.appendChild(alertBox);

    setTimeout(() => {
      alertBox.classList.remove('visible');
      setTimeout(() => alertBox.remove(), 300);
    }, durationMs);
  }

  updateSessionBadge(mode, status) {
    let display = `${mode} - ${status}`;

    if (this.i18n) {
      if (mode === 'PRACTICE' && (status === 'FREE DRIVING' || status === 'SOLO TRACK RUN')) {
        display = this.i18n.t('badge_practice_free');
      } else if (mode === 'RACE' && status.includes('GRID')) {
        display = this.i18n.t('badge_race_grid');
      } else if (status.startsWith('LAP ')) {
        const lapParts = status.replace('LAP ', '').split('/');
        if (lapParts.length === 2) {
          const modeName = this.i18n.t(`nav_${mode.toLowerCase()}`) || mode;
          display = `${modeName.toUpperCase()} - ${this.i18n.t('badge_lap', { current: lapParts[0], total: lapParts[1] })}`;
        }
      }
    }

    const badgeText = document.getElementById('session-badge-text');
    if (badgeText) badgeText.textContent = display;
    const lapCounter = document.getElementById('hud-lap-counter');
    if (lapCounter) {
      lapCounter.textContent = status;
    }
  }

  clearCenterAlert() {
    const container = document.getElementById('center-alert-container');
    if (container) container.innerHTML = '';
    const banner = document.getElementById('center-alert-banner');
    if (banner) {
      banner.textContent = '';
      banner.className = 'center-alert-banner';
    }
  }

  onSessionChanged(mode) {
    this.clearCenterAlert();
    // Highlight active session button
    document.querySelectorAll('.session-btn').forEach(b => b.classList.remove('active'));
    if (mode === SESSION_TYPES.PRACTICE) {
      const btn = document.getElementById('btn-mode-practice');
      if (btn) btn.classList.add('active');
    } else if (mode === SESSION_TYPES.RACE) {
      const btn = document.getElementById('btn-mode-race');
      if (btn) btn.classList.add('active');
    }
  }

  setStartLightsVisible(visible) {
    const gantry = document.getElementById('start-lights-gantry');
    if (gantry) {
      if (visible) gantry.classList.remove('hidden');
      else gantry.classList.add('hidden');
    }
  }

  updateGantryBulbs(litCount) {
    for (let c = 1; c <= 5; c++) {
      const topBulb = document.getElementById(`f1-bulb-${c}-1`);
      const botBulb = document.getElementById(`f1-bulb-${c}-2`);
      const isLit = c <= litCount;

      if (topBulb) {
        if (isLit) topBulb.classList.add('active');
        else topBulb.classList.remove('active');
      }
      if (botBulb) {
        if (isLit) botBulb.classList.add('active');
        else botBulb.classList.remove('active');
      }
    }
  }

  showRaceFinishModal(result) {
    const modal = document.getElementById('modal-race-finish');
    if (!modal) return;

    const titleEl = document.getElementById('race-result-title');
    if (titleEl) {
      if (result.won || result.position === 1) {
        titleEl.textContent = 'VICTORY! 1ST PLACE';
        titleEl.style.color = '#ffd000';
      } else if (result.position === 2) {
        titleEl.textContent = 'PODIUM FINISH! 2ND PLACE';
        titleEl.style.color = '#00f0ff';
      } else if (result.position === 3) {
        titleEl.textContent = 'PODIUM FINISH! 3RD PLACE';
        titleEl.style.color = '#00d2be';
      } else {
        titleEl.textContent = `RACE FINISHED - P${result.position} / 10`;
        titleEl.style.color = '#ff6b6b';
      }
    }

    const totalTimeEl = document.getElementById('race-total-time');
    if (totalTimeEl) totalTimeEl.textContent = TimingSystem.formatTime(result.totalTime);

    const bestLapEl = document.getElementById('race-best-lap');
    if (bestLapEl) bestLapEl.textContent = TimingSystem.formatTime(result.bestLap);

    const penaltyEl = document.getElementById('race-penalty-note');
    if (penaltyEl) {
      penaltyEl.style.display = result.jumpStart ? 'block' : 'none';
    }

    // Populate all 10 drivers in race classification table
    const tbody = document.getElementById('race-table-body');
    if (tbody && result.leaderboard) {
      tbody.innerHTML = '';
      result.leaderboard.forEach(entry => {
        const tr = document.createElement('tr');
        if (entry.isPlayer) tr.className = 'highlight-player';
        let gapStr = 'WINNER';
        if (entry.pos > 1) {
          if (entry.gapSeconds === 'LEADER') {
            gapStr = '+0.0s';
          } else if (typeof entry.gapSeconds === 'string' && (entry.gapSeconds.startsWith('+') || entry.gapSeconds.includes('LAP'))) {
            gapStr = entry.gapSeconds;
          } else {
            gapStr = `+${entry.gapSeconds}s`;
          }
        }
        tr.innerHTML = `
          <td><strong>P${entry.pos}</strong></td>
          <td>${entry.name}</td>
          <td>${entry.team}</td>
          <td>${gapStr}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    modal.classList.add('active');
  }

  showMockAd(adConfig) {
    const modal = document.getElementById('modal-mock-ad');
    if (!modal) {
      if (adConfig.onFinish) adConfig.onFinish();
      return;
    }

    const tagEl = document.getElementById('ad-tag-text');
    const nameEl = document.getElementById('ad-sponsor-name');
    const subEl = document.getElementById('ad-sponsor-subtitle');
    const fillEl = document.getElementById('ad-timer-fill');
    const skipBtn = document.getElementById('btn-skip-ad');

    if (tagEl) tagEl.textContent = adConfig.title || 'OFFICIAL BROADCAST SPONSOR';
    if (nameEl) nameEl.textContent = adConfig.sponsor || 'ROLEX';
    if (subEl) subEl.textContent = adConfig.subtitle || 'Formula 1 Grand Prix Global Partner & Official Timepiece';
    if (skipBtn) skipBtn.textContent = adConfig.buttonText || 'Skip to Track';

    modal.classList.add('active');
    if (fillEl) {
      fillEl.style.transition = 'none';
      fillEl.style.width = '0%';
      setTimeout(() => {
        fillEl.style.transition = `width ${adConfig.duration || 2800}ms linear`;
        fillEl.style.width = '100%';
      }, 50);
    }

    let finished = false;
    const finishAd = () => {
      if (finished) return;
      finished = true;
      modal.classList.remove('active');
      if (this._adTimer) clearTimeout(this._adTimer);
      if (adConfig.onFinish) adConfig.onFinish();
    };

    if (skipBtn) {
      skipBtn.onclick = (e) => {
        e.preventDefault();
        finishAd();
      };
    }

    this._adTimer = setTimeout(finishAd, adConfig.duration || 2800);
  }

  openTrackSelectModal() {
    this.resetInputs();
    const modal = document.getElementById('modal-track-select');
    if (modal) {
      modal.classList.add('active');
      // Redraw canvases in case modal was hidden during initial load
      setTimeout(() => {
        TRACK_DATABASE.forEach(track => {
          const cvs = document.getElementById(`track-canvas-${track.id}`);
          if (cvs) this.drawTrackPreview(cvs, track);
        });
      }, 50);
    }
  }

  initTrackSelectorUI() {
    const container = document.getElementById('track-grid-container');
    if (!container) return;

    container.innerHTML = '';

    TRACK_DATABASE.forEach(track => {
      const card = document.createElement('div');
      card.className = `track-card ${track.id === this.currentTrackId ? 'active' : ''}`;
      card.setAttribute('data-track', track.id);

      const diffClass = `diff-${track.difficultyRating.toLowerCase()}`;

      card.innerHTML = `
        ${track.id === this.currentTrackId ? '<div class="track-card-active-badge">ACTIVE</div>' : ''}
        <div class="track-card-top">
          <span class="track-card-flag">${track.flag}</span>
          <div class="track-card-info">
            <span class="track-card-name">${track.name}</span>
            <span class="track-card-country">${track.country} • ${track.countryCode}</span>
          </div>
        </div>

        <div class="track-card-preview-wrap">
          <canvas class="track-card-canvas" id="track-canvas-${track.id}" width="260" height="120"></canvas>
        </div>

        <div class="track-card-stats">
          <span class="track-pill">${track.lengthMeters}M</span>
          <span class="track-pill ${diffClass}">${track.difficultyRating.toUpperCase()}</span>
          <span class="track-pill">${track.theme.skyType}</span>
        </div>

        <div class="track-card-desc">${track.characteristics}</div>

        <button class="btn-select-circuit" data-track="${track.id}">SELECT &amp; RACE</button>
      `;

      card.addEventListener('click', () => {
        this.switchTrack(track.id);
        this.closeModals();
      });

      container.appendChild(card);
    });

    // Render 2D top-down spline preview on all card canvases
    setTimeout(() => {
      TRACK_DATABASE.forEach(track => {
        const cvs = document.getElementById(`track-canvas-${track.id}`);
        if (cvs) this.drawTrackPreview(cvs, track);
      });
    }, 80);
  }

  drawTrackPreview(canvas, trackData) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const pts = trackData.controlPoints;
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.2);

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const samples = [];
    const count = 100;
    for (let i = 0; i < count; i++) {
      const p = curve.getPointAt(i / count);
      samples.push(p);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const pad = 18;
    const spanX = (maxX - minX) || 1;
    const spanZ = (maxZ - minZ) || 1;
    const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanZ);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    const toX = (x) => w / 2 + (x - cx) * scale;
    const toY = (z) => h / 2 + (z - cz) * scale;

    // Track asphalt ribbon
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#334155';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= count; i++) {
      const p = samples[i % count];
      if (i === 0) ctx.moveTo(toX(p.x), toY(p.z));
      else ctx.lineTo(toX(p.x), toY(p.z));
    }
    ctx.stroke();

    // Racing line glowing red
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#e10600';
    ctx.shadowColor = '#e10600';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i <= count; i++) {
      const p = samples[i % count];
      if (i === 0) ctx.moveTo(toX(p.x), toY(p.z));
      else ctx.lineTo(toX(p.x), toY(p.z));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Start / finish point
    const sPt = samples[0];
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(toX(sPt.x), toY(sPt.z), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  switchTrack(trackId) {
    const trackData = getTrackById(trackId);
    if (!trackData) return;

    this.currentTrackId = trackId;
    this.resetInputs();

    // 1. Procedural Track Load (cleans up previous meshes & static Cannon-es physics colliders)
    this.track.loadTrack(trackData);
    this.physics.setTrack(this.track);
    this.physics.isOnTrackCallback = (x, z) => this.track.isOnTrack(x, z);

    // 2. Update Subsystems with the new circuit
    this.timing.setTrack(this.track);
    this.session.setTrack(this.track);
    this.aiGrid.setTrack(this.track);

    // 3. Update Minimap bounds
    this.updateMinimapBounds();

    // 4. Update HUD elements
    const flagEl = document.getElementById('track-btn-flag');
    if (flagEl) flagEl.textContent = trackData.flag;
    const nameEl = document.getElementById('track-btn-name');
    if (nameEl) nameEl.textContent = trackData.name.toUpperCase();
    const radarTitle = document.getElementById('radar-track-title');
    if (radarTitle) radarTitle.textContent = trackData.name.toUpperCase();

    // 5. Update active card in modal
    document.querySelectorAll('.track-card').forEach(card => {
      if (card.getAttribute('data-track') === trackId) {
        card.classList.add('active');
        if (!card.querySelector('.track-card-active-badge')) {
          const b = document.createElement('div');
          b.className = 'track-card-active-badge';
          b.textContent = 'ACTIVE';
          card.appendChild(b);
        }
      } else {
        card.classList.remove('active');
        const b = card.querySelector('.track-card-active-badge');
        if (b) b.remove();
      }
    });

    // 6. Reset session state to clean defaults before initializing new session
    this.session.resetSessionState();

    // 7. Reset session cleanly to Practice mode on the new starting grid
    this.session.initSession(SESSION_TYPES.PRACTICE, this.playerVehicle, this.playerCar);
    this.resetInputs();
    if (this.playerVehicle && this.playerVehicle.body) {
      this.playerVehicle.body.velocity.set(0, 0, 0);
      this.playerVehicle.body.angularVelocity.set(0, 0, 0);
    }
    this.resetCamera();
    this.showCenterAlert(`CIRCUIT LOADED: ${trackData.name.toUpperCase()}`, 2500, 'alert-flying-lap');
  }

  /* --------------------------------------------------------------------------
     F1 CAR & CONSTRUCTOR TEAM SELECTION SYSTEM
     -------------------------------------------------------------------------- */
  openCarSelectModal() {
    this.resetInputs();
    const modal = document.getElementById('modal-car-select');
    if (modal) {
      modal.classList.add('active');
      // Render livery canvas previews
      setTimeout(() => {
        F1_TEAMS.forEach(team => {
          const cvs = document.getElementById(`car-canvas-${team.id}`);
          if (cvs) this.drawCarLiveryPreview(cvs, team);
        });
      }, 50);
    }
  }

  initCarSelectorUI() {
    const container = document.getElementById('car-grid-container');
    if (!container) return;

    container.innerHTML = '';

    F1_TEAMS.forEach(team => {
      const card = document.createElement('div');
      const isActive = team.id === this.currentTeamId;
      card.className = `car-card ${isActive ? 'active' : ''}`;
      card.setAttribute('data-team', team.id);
      card.style.setProperty('--team-color', team.primaryHex);

      card.innerHTML = `
        ${isActive ? '<div class="car-card-active-badge">ACTIVE</div>' : ''}
        <div class="car-card-header">
          <div class="car-card-number-pod" style="border-color: ${team.primaryHex};">
            ${team.driverNumber}
          </div>
          <div class="car-card-title-group">
            <span class="car-card-name">${team.name}</span>
            <span class="car-card-driver">${team.driverName} • ${team.fullName}</span>
          </div>
        </div>

        <div class="car-card-preview-wrap">
          <canvas class="car-card-canvas" id="car-canvas-${team.id}" width="280" height="60"></canvas>
        </div>

        <div class="car-card-pu">
          <span class="car-card-pu-label">POWER UNIT:</span>
          <span>${team.powerUnit}</span>
        </div>

        <div class="car-card-stats">
          <span class="car-stat-pill">TOP: ${team.stats.topSpeed}</span>
          <span class="car-stat-pill">AERO: ${team.stats.aero}</span>
          <span class="car-stat-pill">ACCEL: ${team.stats.acceleration}</span>
        </div>

        <button class="btn-select-car" data-team="${team.id}">SELECT &amp; DRIVE</button>
      `;

      card.addEventListener('click', () => {
        this.switchCar(team.id);
        this.closeModals();
      });

      container.appendChild(card);
    });

    // Render 2D top-down livery swatch on card canvases
    setTimeout(() => {
      F1_TEAMS.forEach(team => {
        const cvs = document.getElementById(`car-canvas-${team.id}`);
        if (cvs) this.drawCarLiveryPreview(cvs, team);
      });
    }, 80);
  }

  drawCarLiveryPreview(canvas, team) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background gradient representing the chassis livery
    const bgGrad = ctx.createLinearGradient(0, 0, w, 0);
    bgGrad.addColorStop(0, '#0a0e17');
    bgGrad.addColorStop(0.25, team.primaryHex);
    bgGrad.addColorStop(0.85, team.primaryHex);
    bgGrad.addColorStop(1, '#0a0e17');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Racing stripe in secondary color
    ctx.fillStyle = team.secondaryHex;
    ctx.beginPath();
    ctx.moveTo(w * 0.12, h * 0.42);
    ctx.lineTo(w * 0.92, h * 0.35);
    ctx.lineTo(w * 0.88, h * 0.58);
    ctx.lineTo(w * 0.12, h * 0.58);
    ctx.closePath();
    ctx.fill();

    // Accent pinstripe
    ctx.fillStyle = team.accentHex || '#ffffff';
    ctx.fillRect(w * 0.15, h * 0.58, w * 0.72, 3);

    // Team badge text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 12px sans-serif';
    ctx.fillText(team.name.toUpperCase(), w * 0.22, h * 0.30);

    // Driver Number Circle
    ctx.beginPath();
    ctx.arc(w * 0.84, h * 0.48, 16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
    ctx.fill();
    ctx.strokeStyle = team.secondaryHex;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(team.driverNumber, w * 0.84, h * 0.48);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  switchCar(teamId) {
    const team = getTeamById(teamId);
    if (!team) return;

    this.currentTeamId = team.id;
    try {
      localStorage.setItem('f1_player_team', team.id);
    } catch (e) {}

    // 1. Harmonize AI Grid and update player 3D car livery
    if (this.aiGrid) {
      this.aiGrid.setPlayerTeam(team);
    } else if (this.playerCar) {
      this.playerCar.updateLivery({
        primaryColor: team.primaryColor,
        secondaryHex: team.secondaryHex,
        accentHex: team.accentHex,
        accentColor: team.accentColor,
        haloColor: team.haloColor,
        carNumber: team.driverNumber,
        driverNumber: team.driverNumber,
        teamName: team.fullName || team.name,
        driverName: 'PLAYER'
      });
    }

    // 2. Update Header Button
    this.updateCarHeaderButton(team);

    // 3. Update HUD driver badges
    this.updateHUDDriverBadge(team);

    // 4. Update active cards in the modal
    const cards = document.querySelectorAll('.car-card');
    cards.forEach(card => {
      if (card.getAttribute('data-team') === team.id) {
        card.classList.add('active');
        if (!card.querySelector('.car-card-active-badge')) {
          const b = document.createElement('div');
          b.className = 'car-card-active-badge';
          b.textContent = 'ACTIVE';
          card.appendChild(b);
        }
      } else {
        card.classList.remove('active');
        const b = card.querySelector('.car-card-active-badge');
        if (b) b.remove();
      }
    });

    this.showCenterAlert(`CAR SELECTED: ${team.fullName.toUpperCase()} (#${team.driverNumber})`, 2500, 'alert-flying-lap');
  }

  updateCarHeaderButton(team) {
    const swatch = document.getElementById('car-btn-swatch');
    const nameEl = document.getElementById('car-btn-name');
    if (swatch) {
      swatch.style.background = team.primaryHex;
      swatch.style.boxShadow = `0 0 10px ${team.primaryHex}`;
    }
    if (nameEl) {
      nameEl.textContent = team.name.toUpperCase();
    }
  }

  updateHUDDriverBadge(team) {
    const numEl = document.getElementById('hud-driver-number');
    const nameEl = document.getElementById('hud-driver-name');
    const pill = document.getElementById('hud-driver-pill');
    if (numEl) {
      numEl.textContent = team.driverNumber;
    }
    if (nameEl && this.i18n) {
      nameEl.textContent = this.i18n.t('hud_driver');
    }
    if (pill) {
      pill.style.borderLeft = `3px solid ${team.primaryHex}`;
    }
  }

  /* --------------------------------------------------------------------------
     PHASE 4: MULTIPLAYER NETWORKING METHODS
     -------------------------------------------------------------------------- */
  initNetwork() {
    if (!this.network) return;

    this.network.onPeerReady = (code) => {
      const codeEl = document.getElementById('mp-host-code');
      if (codeEl) codeEl.textContent = code;
    };

    this.network.onGuestConnected = () => {
      const statusText = document.getElementById('mp-host-status-text');
      if (statusText) statusText.textContent = 'Player 2 Connected! (Guest Racing)';
      const pulse = document.getElementById('mp-host-pulse');
      if (pulse) {
        pulse.classList.remove('amber');
        pulse.classList.add('green');
      }
      const launchBtn = document.getElementById('btn-mp-launch');
      if (launchBtn) launchBtn.disabled = false;
      this.showCenterAlert('PLAYER 2 CONNECTED VIA WEBRTC!', 2500, 'alert-flying-lap');
    };

    this.network.onHostConnected = () => {
      const statusText = document.getElementById('mp-guest-status-text');
      if (statusText) statusText.textContent = 'Connected! Waiting for Host to launch session...';
      const dot = document.getElementById('mp-guest-dot');
      if (dot) {
        dot.className = 'mp-pulse green';
      }
      this.showCenterAlert('CONNECTED TO HOST! PREPARING GRID...', 2500, 'alert-flying-lap');
    };

    this.network.onDisconnected = () => {
      this.onPeerDisconnected();
    };

    this.network.onInitGame = (packet) => {
      this.onGuestInitGame(packet);
    };

    this.network.onStateSync = (packet) => {
      this.onGuestStateSync(packet);
    };

    this.network.onInput = (packet) => {
      this.onHostReceiveGuestInput(packet);
    };

    this.network.onStartLights = (packet) => {
      this.session.setGuestLights(packet.step, packet.lightsOut);
    };

    this.network.onRaceFinish = (packet) => {
      this.showRaceFinishModal(packet.result);
    };

    this.network.onError = (err) => {
      const guestStatus = document.getElementById('mp-guest-status-text');
      if (guestStatus) guestStatus.textContent = `Error: ${err}`;
      const guestDot = document.getElementById('mp-guest-dot');
      if (guestDot) guestDot.className = 'mp-pulse gray';
      this.showCenterAlert(`NETWORK: ${err}`, 3000, 'alert-penalty');
    };
  }

  openMultiplayerModal() {
    const modal = document.getElementById('modal-multiplayer');
    if (!modal) return;

    // Populate circuit selection dropdown with all 10 tracks
    const trackSel = document.getElementById('mp-select-track');
    if (trackSel && trackSel.options.length === 0) {
      TRACK_DATABASE.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.flag} ${t.name} (${t.countryCode})`;
        if (t.id === this.currentTrackId) opt.selected = true;
        trackSel.appendChild(opt);
      });
    }

    modal.classList.add('active');

    // Host room if not already hosting
    if (!this.network.peer) {
      this.network.hostRoom();
      const codeEl = document.getElementById('mp-host-code');
      if (codeEl) codeEl.textContent = this.network.roomCode || 'GENERATING...';
    } else {
      const codeEl = document.getElementById('mp-host-code');
      if (codeEl && this.network.roomCode) codeEl.textContent = this.network.roomCode;
    }
  }

  launchMultiplayerWeekend() {
    const trackSel = document.getElementById('mp-select-track');
    const modeSel = document.getElementById('mp-select-mode');
    const selectedTrack = trackSel ? trackSel.value : this.currentTrackId;
    const selectedMode = modeSel ? modeSel.value : 'RACE';

    // Switch track if different
    if (selectedTrack !== this.currentTrackId) {
      this.switchTrack(selectedTrack);
    }

    this.isMultiplayer = true;
    this.isHost = true;
    this.session.setMultiplayerMode(true, true);

    // Send INIT_GAME packet to Guest
    this.network.send({
      type: NETWORK_PACKET_TYPES.INIT_GAME,
      trackId: selectedTrack,
      mode: selectedMode,
      lapsTotal: this.session.raceLapsTotal || 20
    });

    this.closeModals();
    this.session.initSession(selectedMode, this.playerVehicle, this.playerCar);
    this.showCenterAlert(`LAUNCHING MULTIPLAYER ${selectedMode}!`, 2500, 'alert-flying-lap');
  }

  onGuestInitGame(packet) {
    if (!packet) return;

    this.isMultiplayer = true;
    this.isHost = false;

    if (packet.trackId && packet.trackId !== this.currentTrackId) {
      this.switchTrack(packet.trackId);
    }

    this.session.setMultiplayerMode(true, false);
    if (packet.lapsTotal) this.session.setRaceLapsTotal(packet.lapsTotal);

    this.closeModals();
    this.session.currentMode = packet.mode;

    if (packet.mode === SESSION_TYPES.PRACTICE) {
      this.session.startPracticeSession(this.playerVehicle, this.playerCar);
    } else if (packet.mode === SESSION_TYPES.RACE) {
      this.session.startRaceSession(this.playerVehicle, this.playerCar);
    }

    this.showCenterAlert(`MULTIPLAYER ${packet.mode} LAUNCHED!`, 2500, 'alert-flying-lap');
  }

  onGuestStateSync(packet) {
    if (!packet || !packet.cars) return;

    for (const c of packet.cars) {
      let entry = this.guestTargetTransforms.get(c.id);
      if (!entry) {
        entry = {
          pos: new THREE.Vector3(c.x, c.y, c.z),
          quat: new THREE.Quaternion(c.qx, c.qy, c.qz, c.qw),
          speed: c.speed,
          gear: c.gear,
          rpm: c.rpm,
          drs: c.drs,
          lap: c.lap,
          progress: c.progress
        };
        this.guestTargetTransforms.set(c.id, entry);
      } else {
        entry.pos.set(c.x, c.y, c.z);
        entry.quat.set(c.qx, c.qy, c.qz, c.qw);
        entry.speed = c.speed;
        entry.gear = c.gear;
        entry.rpm = c.rpm;
        entry.drs = c.drs;
        entry.lap = c.lap;
        entry.progress = c.progress;
      }
    }

    if (packet.session) {
      this.session.raceState = packet.session.raceState;
      this.session.gantryStep = packet.session.gantryStep;
      if (this.session.raceState === 'RACING' && !this.timing.timerRunning) {
        this.timing.start();
      }
    }
  }

  onHostReceiveGuestInput(packet) {
    if (packet && packet.inputs && this.aiGrid) {
      this.aiGrid.applyGuestInput(packet.inputs);
    }
  }

  onPeerDisconnected() {
    this.isMultiplayer = false;
    this.isHost = false;
    this.session.setMultiplayerMode(false, false);
    this.closeModals();

    const discModal = document.getElementById('modal-peer-disconnected');
    if (discModal) discModal.classList.add('active');

    this.network.cleanup();
  }

  toggleHelpModal(force) {
    this.resetInputs();
    const modal = document.getElementById('modal-help');
    if (!modal) return;
    if (force !== undefined) {
      if (force) modal.classList.add('active');
      else modal.classList.remove('active');
    } else {
      modal.classList.toggle('active');
    }
  }

  toggleLanguageModal(force) {
    this.resetInputs();
    const modal = document.getElementById('modal-language');
    if (!modal) return;
    this.updateLanguageSelectorUI();
    if (force !== undefined) {
      if (force) modal.classList.add('active');
      else modal.classList.remove('active');
    } else {
      modal.classList.toggle('active');
    }
  }

  openLanguageModal() {
    this.resetInputs();
    this.toggleLanguageModal(true);
  }

  initLanguageSelectorUI() {
    this.updateLanguageSelectorUI();
  }

  updateLanguageSelectorUI() {
    const container = document.getElementById('lang-grid-container');
    if (!container || !this.i18n) return;

    container.innerHTML = '';
    const currentLang = this.i18n.getCurrentLanguage();
    const autoLang = this.i18n.autoDetectedLang;

    Object.values(SUPPORTED_LANGUAGES).forEach(lang => {
      const card = document.createElement('div');
      const isActive = lang.code === currentLang;
      const isAuto = lang.code === autoLang;
      card.className = `lang-card ${isActive ? 'active' : ''}`;
      card.setAttribute('data-lang', lang.code);

      const activeTag = isActive ? `<span class="lang-active-tag">${this.i18n.t('lang_active', {}, 'ACTIVE')}</span>` : '';
      const autoTag = isAuto ? `<span class="lang-auto-tag">${this.i18n.t('lang_auto_badge', {}, 'AUTO')}</span>` : '';

      card.innerHTML = `
        <div class="lang-card-flag">${lang.flag}</div>
        <div class="lang-card-info">
          <div class="lang-card-name">${lang.name}</div>
          <div class="lang-card-region">${lang.region}</div>
        </div>
        <div class="lang-badge-container">
          ${activeTag}
          ${autoTag}
        </div>
      `;

      card.addEventListener('click', () => {
        this.i18n.setLanguage(lang.code);
        this.closeModals();
        this.showCenterAlert(`${lang.flag} ${lang.name.toUpperCase()}`, 1600);
      });

      container.appendChild(card);
    });

    const flagEl = document.getElementById('lang-btn-flag');
    const codeEl = document.getElementById('lang-btn-code');
    const meta = this.i18n.getLanguageMeta();
    if (flagEl) flagEl.textContent = meta.flag;
    if (codeEl) codeEl.textContent = meta.code.toUpperCase();
  }

  onLanguageChanged(lang) {
    this.updateLanguageSelectorUI();
    this.initTrackSelectorUI();
    this.initCarSelectorUI();
    const currentTeam = getTeamById(this.currentTeamId);
    if (currentTeam) {
      this.updateHUDDriverBadge(currentTeam);
    }
  }

  closeModals() {
    this.resetInputs();
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  /* --------------------------------------------------------------------------
     MAIN ANIMATION & PHYSICS GAME LOOP
     -------------------------------------------------------------------------- */
  animate(timestamp) {
    requestAnimationFrame((t) => this.animate(t));

    let dt = Math.min(0.05, Math.max(0.001, this.clock.getDelta()));

    // 1. Process Local User Inputs
    this.updateControls(dt);

    // ======================================================================
    // GUEST CLIENT MODE: Thin client rendering with WebRTC interpolation
    // ======================================================================
    if (this.isMultiplayer && !this.isHost) {
      // Send raw inputs at 60Hz to Host
      const now = performance.now();
      if (now - this.lastInputSendTime >= 16) {
        this.lastInputSendTime = now;
        this.network.sendGuestInput(this.controls);
      }

      const lerpSpeed = Math.min(1.0, dt * 25.0);

      // Interpolate Host Car (Car #1 / Player 1)
      const hostData = this.guestTargetTransforms.get('player');
      if (hostData) {
        this.playerCar.group.visible = true;
        this.playerCar.group.position.lerp(hostData.pos, lerpSpeed);
        this.playerCar.group.quaternion.slerp(hostData.quat, lerpSpeed);
        this.playerCar.update(dt, hostData.speed / 3.6, 0, 0, 0, 0);
      }

      // Interpolate Guest Car (Car #2) and AI Cars (Cars #3 to #10)
      if (this.aiGrid && this.aiGrid.aiCars) {
        for (let i = 0; i < this.aiGrid.aiCars.length; i++) {
          const ai = this.aiGrid.aiCars[i];
          const carData = this.guestTargetTransforms.get(ai.info.id);
          if (carData) {
            ai.visualCar.group.visible = true;
            ai.visualCar.group.position.lerp(carData.pos, lerpSpeed);
            ai.visualCar.group.quaternion.slerp(carData.quat, lerpSpeed);
            ai.visualCar.update(dt, carData.speed / 3.6, 0, 0, 0, 0);
            ai.currentSpeed = carData.speed / 3.6;
            ai.trackProgress = carData.progress || 0;
            ai.currentLap = carData.lap || 1;
          }
        }
      }

      // Guest Car Telemetry & Camera
      let guestSpeedKmh = 0, guestGear = 1, guestRpm = 4000;
      const guestData = this.guestTargetTransforms.get('ai_1');
      if (guestData) {
        guestSpeedKmh = guestData.speed;
        guestGear = guestData.gear || 1;
        guestRpm = guestData.rpm || 4000;
      }

      const guestCar = (this.aiGrid && this.aiGrid.aiCars) ? this.aiGrid.aiCars[0] : null;
      const gPos = guestCar ? guestCar.visualCar.group.position : this.playerCar.group.position;
      this._scratchFwd.set(0, 0, 1).applyQuaternion(guestCar ? guestCar.visualCar.group.quaternion : this.playerCar.group.quaternion);
      const gForward = this._scratchFwd;

      this.updateCamera(dt, gPos, gForward, guestSpeedKmh / 3.6);

      this.sunLight.position.set(gPos.x + 120, 180, gPos.z + 80);
      if (guestCar) this.sunLight.target = guestCar.visualCar.group;

      this.updateHUD(
        guestSpeedKmh,
        guestGear,
        guestRpm,
        this.controls.throttle,
        this.controls.brake,
        guestData ? guestData.drs : false
      );

      this.audio.update(guestRpm, this.controls.throttle, guestSpeedKmh, 0);

      if (this.track && this.track.update) {
        this.track.update(dt);
      }

      this.drawMinimap();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // ======================================================================
    // SINGLE PLAYER & HOST AUTHORITATIVE SIMULATION
    // ======================================================================
    // During countdown, keep player car firmly locked on starting grid position
    if (this.session.currentMode === SESSION_TYPES.RACE && (this.session.raceState === 'LIGHTS_COUNTDOWN' || this.session.raceState === 'PRE_START')) {
      this.playerVehicle.body.velocity.set(0, 0, 0);
      this.playerVehicle.body.angularVelocity.set(0, 0, 0);
      if (this.aiGrid && this.aiGrid.playerSpawnGridPos) {
        this.playerVehicle.body.position.copy(this.aiGrid.playerSpawnGridPos);
      }
    }

    this.physics.updateVehicle(this.playerVehicle, this.controls, dt, this.audio);
    this.physics.step(dt);

    if (this.session.currentMode === SESSION_TYPES.RACE && (this.session.raceState === 'LIGHTS_COUNTDOWN' || this.session.raceState === 'PRE_START')) {
      this.playerVehicle.body.velocity.set(0, 0, 0);
      this.playerVehicle.body.angularVelocity.set(0, 0, 0);
      if (this.aiGrid && this.aiGrid.playerSpawnGridPos) {
        this.playerVehicle.body.position.copy(this.aiGrid.playerSpawnGridPos);
      }
    }

    // Use Cannon-es physics interpolated position & quaternion to ensure silky-smooth rendering
    const pPos = (this.playerVehicle.body.interpolatedPosition && Number.isFinite(this.playerVehicle.body.interpolatedPosition.x))
      ? this.playerVehicle.body.interpolatedPosition
      : this.playerVehicle.body.position;
    let finalQuat = (this.playerVehicle.body.interpolatedQuaternion && Number.isFinite(this.playerVehicle.body.interpolatedQuaternion.x))
      ? this.playerVehicle.body.interpolatedQuaternion
      : this.playerVehicle.body.quaternion;

    if (this.track && typeof this.track.getClosestTrackPoint === 'function') {
      const curTrackInfo = this.track.getClosestTrackPoint(pPos.x, pPos.z);
      if (curTrackInfo && curTrackInfo.tangent && Number.isFinite(curTrackInfo.tangent.y)) {
        const targetPitchAngle = -Math.asin(Math.max(-0.45, Math.min(0.45, curTrackInfo.tangent.y)));
        if (!Number.isFinite(this._smoothPitchAngle)) this._smoothPitchAngle = targetPitchAngle;
        this._smoothPitchAngle += (targetPitchAngle - this._smoothPitchAngle) * Math.min(1.0, dt * 12.0);
        if (!this._pitchQuat) this._pitchQuat = new THREE.Quaternion();
        if (!this._combinedQuat) this._combinedQuat = new THREE.Quaternion();
        this._pitchQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this._smoothPitchAngle);
        this._combinedQuat.copy(finalQuat).multiply(this._pitchQuat);
        finalQuat = this._combinedQuat;
      }
    }
    this.playerCar.setPositionAndRotation(pPos, finalQuat);

    const vel = this.playerVehicle.body.velocity;
    this._scratchFwd.set(0, 0, 1).applyQuaternion(this.playerCar.group.quaternion);
    const forward = this._scratchFwd;
    const rawSpeedMps = vel.x * forward.x + vel.z * forward.z;
    const speedMps = Number.isFinite(rawSpeedMps) ? rawSpeedMps : 0;
    const speedKmh = Math.abs(speedMps) * 3.6;

    // Detect bottoming out: high vertical velocity (from kerbs) or low ride height at high speed
    const isBottomingOut = Math.abs(vel.y) > 1.5 || (speedMps > 60 && this.track && Math.random() < 0.02);

    // Apply damage on high-speed impact
    if (this.playerVehicle.justImpacted) {
      const impulse = this.playerVehicle.impactImpulse || 0;
      if (impulse > 8.0) {
        this.playerCar.applyFrontWingDamage(Math.min(0.5, impulse / 30));
        this.fx.triggerShake(Math.min(1.2, impulse / 16));
        this.audio.playWallImpact(impulse);
      } else if (impulse > 5.5) {
        this.fx.triggerShake(Math.min(1.2, impulse / 16));
        this.audio.playWallImpact(impulse);
      }
      this.playerVehicle.justImpacted = false;
    }

    // Repair damage when crossing start/finish line (pit stop simulation)
    const trackInfo = this.track.getClosestTrackPoint(pPos.x, pPos.z);
    if (trackInfo.t < 0.02 && this.playerCar.damage.frontWingDamage > 0) {
      this.playerCar.repairDamage();
    }

    this.playerCar.update(
      dt,
      speedMps,
      this.playerVehicle.steerAngle,
      this.playerVehicle.lateralSlip,
      this.controls.throttle,
      this.controls.brake,
      isBottomingOut
    );

    // Update Session state machine & 10-car AI grid dynamics
    this.session.update(dt, this.playerVehicle, pPos, vel);
    this.timing.update(pPos, vel);
    this.lastCheckedLap = this.timing.currentLap;

    if (this.track && this.track.update) {
      this.track.update(dt);
    }

    this.audio.update(
      this.playerVehicle.rpm,
      this.controls.throttle,
      speedKmh,
      this.playerVehicle.lateralSlip
    );

    this.updateCamera(dt, this.playerCar.group.position, forward, speedMps);

    // Update Cascaded Shadow Maps to follow the car
    this.updateCsmCascades(pPos);

    // Update motion blur vignette based on speed
    this.updateMotionBlurVignette(speedKmh);

    this.sunLight.position.set(pPos.x + 120, 180, pPos.z + 80);
    this.sunLight.target = this.playerCar.group;

    this.updateHUD(
      speedKmh,
      this.playerVehicle.currentGear,
      this.playerVehicle.rpm,
      this.controls.throttle,
      this.controls.brake,
      this.playerVehicle.drsActive
    );

    this.drawMinimap();

    // Broadcast 30Hz snapshot from Host to Guest
    if (this.isMultiplayer && this.isHost && this.network && this.network.isConnected) {
      const sessionState = {
        mode: this.session.currentMode,
        raceState: this.session.raceState,
        gantryStep: this.session.gantryStep,
        trackId: this.currentTrackId,
        lapsTotal: this.session.raceLapsTotal,
        hostLap: this.session.playerRaceLap
      };
      const carsSnapshot = this.aiGrid.get10CarStateSnapshot(this.playerVehicle, this.playerCar, this.session.playerRaceLap);
      this.network.broadcastState(sessionState, carsSnapshot);
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateCsmCascades(carPos) {
    if (!this.csmCascades || this.csmCascades.length === 0) return;
    
    // Update each cascade to center on the car position
    for (let i = 0; i < this.csmCascades.length; i++) {
      const cascade = this.csmCascades[i];
      cascade.light.position.set(carPos.x, cascade.light.position.y, carPos.z);
      cascade.light.shadow.camera.position.set(carPos.x, carPos.y + 100, carPos.z);
      cascade.light.shadow.camera.lookAt(carPos.x, carPos.y, carPos.z);
      cascade.light.shadow.camera.updateProjectionMatrix();
      cascade.light.shadow.needsUpdate = true;
    }
  }

  updateMotionBlurVignette(speedKmh) {
    if (!this.vignetteMesh || !this.vignetteMaterial) return;
    
    // Activate vignette at speeds exceeding 280 km/h
    const threshold = 280;
    if (speedKmh > threshold) {
      const intensity = Math.min(1.0, (speedKmh - threshold) / 80);
      this.vignetteMaterial.opacity = intensity * 0.35;
      // Subtle radial scale distortion
      const scale = 1.0 + intensity * 0.02;
      this.vignetteMesh.scale.setScalar(scale);
    } else {
      this.vignetteMaterial.opacity = 0.0;
      this.vignetteMesh.scale.setScalar(1.0);
    }
  }
}

// Instantiate game once DOM is loaded (handles both pre- and post-DOMContentLoaded module execution)
function bootGame() {
  if (!window.game) {
    window.game = new F1Game();
  }
}
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}
