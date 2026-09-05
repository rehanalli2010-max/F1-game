/**
 * High-End Procedural Web Audio Engine for Formula 1 Racing
 * Multi-layer acoustic synthesis modeling:
 * - V6 Turbo-Hybrid internal combustion harmonics (fundamental, half-order, and upper harmonics)
 * - Analog WaveShaper saturation & tube warmth (rich, expensive, non-linear distortion)
 * - Dual-chamber tuned exhaust formant acoustic resonance (460 Hz manifold & 1280 Hz tailpipe)
 * - Airbox induction roar on heavy throttle
 * - High-speed turbocharger spool with ceramic bearing whine
 * - Procedural wastegate flutter on throttle lift-off
 * - Authentic exhaust overrun pops, burbles, and gear-shift backfire crackles
 * - Multi-band realistic tire screech & aerodynamic slipstream rush
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Master & Submix Busses
    this.masterGain = null;
    this.engineMasterGain = null;
    this.screechGain = null;
    this.windGain = null;
    this.inductionGain = null;

    // Dynamic state tracking
    this.currentRPM = 4200;
    this.targetRPM = 4200;
    this.currentThrottle = 0;
    this.previousThrottle = 0;
    this.turboBoost = 0; // 0 to 1
    this.lastPopTime = 0;
    this._lastImpactAt = 0;

    // Harmonic Combustion Oscillators
    this.oscFund = null;    // Firing order fundamental (f0 = RPM/60 * 3)
    this.oscSub = null;     // Crankshaft rotation (0.5 * f0) - deep chest thrum
    this.oscBank = null;    // Asymmetric V-bank manifold wave (1.5 * f0) - throaty growl
    this.oscOctave = null;  // Second order exhaust wave (2.0 * f0) - bite & presence
    this.oscRasp = null;    // High metallic scream (3.0 * f0) - titanium pipe rasp
    this.oscBass = null;    // Sub-bass horsepower vibration (45-80 Hz sine)

    // Gain nodes for harmonic blending
    this.gainFund = null;
    this.gainSub = null;
    this.gainBank = null;
    this.gainOctave = null;
    this.gainRasp = null;
    this.gainBass = null;

    // Acoustic Processing Nodes
    this.waveShaper = null;
    this.formant1 = null;    // Exhaust manifold resonator
    this.formant2 = null;    // Tailpipe exit resonator
    this.lowCutFilter = null;
    this.highCutFilter = null;

    // Turbocharger Nodes
    this.turboOsc = null;
    this.turboMod = null;
    this.turboGain = null;

    // Induction Roar Nodes
    this.inductionNode = null;
    this.inductionFilter = null;

    // Tire Screech Nodes
    this.screechNode = null;
    this.screechFilter = null;

    // Wind & Aerodynamic Rush Nodes
    this.windNode = null;
    this.windFilter = null;
  }

  /**
   * Initialize Web Audio context and build sound synthesis pipeline
   */
  init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output bus with safety limiter
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // --- 1. ENGINE COMBUSTION SYNTHESIS PIPELINE ---
      this.buildEnginePipeline();

      // --- 2. TURBOCHARGER SPOOL & WHINE PIPELINE ---
      this.buildTurboPipeline();

      // --- 3. AIRBOX INDUCTION ROAR PIPELINE ---
      this.buildInductionPipeline();

      // --- 4. TIRE FRICTION & DRIFT SCREECH PIPELINE ---
      this.buildTireScreechPipeline();

      // --- 5. AERODYNAMIC AIR RUSH PIPELINE ---
      this.buildWindPipeline();

      // --- 6. TRACKSIDE GRANDSTAND CROWD PIPELINE ---
      this.buildCrowdPipeline();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API initialization encountered an issue:', e);
    }
  }

  /**
   * Build the harmonic oscillator bank, saturation, and acoustic exhaust formants
   */
  buildEnginePipeline() {
    const t = this.ctx.currentTime;

    // Engine submix bus
    this.engineMasterGain = this.ctx.createGain();
    this.engineMasterGain.gain.setValueAtTime(0.0, t);

    // Analog WaveShaper Saturation (eliminates synthetic digital sound and adds warm tube overdrive)
    this.waveShaper = this.ctx.createWaveShaper();
    this.waveShaper.curve = this.createSaturationCurve(2.8, 4096);
    this.waveShaper.oversample = '4x';

    // Sub-bass cleanup filter (removes DC offset and sub-35Hz mud)
    this.lowCutFilter = this.ctx.createBiquadFilter();
    this.lowCutFilter.type = 'highpass';
    this.lowCutFilter.frequency.setValueAtTime(38, t);
    this.lowCutFilter.Q.setValueAtTime(0.7, t);

    // Formant Resonator 1: Tuned Exhaust Manifold Cavity (~460 Hz)
    this.formant1 = this.ctx.createBiquadFilter();
    this.formant1.type = 'peaking';
    this.formant1.frequency.setValueAtTime(460, t);
    this.formant1.Q.setValueAtTime(3.2, t);
    this.formant1.gain.setValueAtTime(5.5, t);

    // Formant Resonator 2: High-RPM Titanium Tailpipe Ring (~1280 Hz)
    this.formant2 = this.ctx.createBiquadFilter();
    this.formant2.type = 'peaking';
    this.formant2.frequency.setValueAtTime(1280, t);
    this.formant2.Q.setValueAtTime(2.6, t);
    this.formant2.gain.setValueAtTime(6.0, t);

    // Dynamic Exhaust Lowpass Filter (warm, clean, non-buzzy purr at idle; opens under throttle)
    this.highCutFilter = this.ctx.createBiquadFilter();
    this.highCutFilter.type = 'lowpass';
    this.highCutFilter.frequency.setValueAtTime(450, t);
    this.highCutFilter.Q.setValueAtTime(1.0, t);

    // --- Harmonic Oscillator Bank ---
    // 1. Fundamental firing order pulse (f0 = RPM/60 * 3)
    this.oscFund = this.ctx.createOscillator();
    this.oscFund.type = 'sawtooth';
    this.oscFund.frequency.setValueAtTime(210, t);
    this.gainFund = this.ctx.createGain();
    this.gainFund.gain.setValueAtTime(0.35, t);
    this.oscFund.connect(this.gainFund);

    // 2. Sub-harmonic crankshaft rotation (0.5 * f0) - deep mechanical body
    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'triangle';
    this.oscSub.frequency.setValueAtTime(105, t);
    this.gainSub = this.ctx.createGain();
    this.gainSub.gain.setValueAtTime(0.45, t);
    this.oscSub.connect(this.gainSub);

    // 3. Asymmetric V-bank manifold pulse (1.5 * f0) - throaty V6 growl
    this.oscBank = this.ctx.createOscillator();
    this.oscBank.type = 'sawtooth';
    this.oscBank.frequency.setValueAtTime(315, t);
    this.gainBank = this.ctx.createGain();
    this.gainBank.gain.setValueAtTime(0.04, t);
    this.oscBank.connect(this.gainBank);

    // 4. Second-order combustion pulse (2.0 * f0) - high-RPM bite
    this.oscOctave = this.ctx.createOscillator();
    this.oscOctave.type = 'sawtooth';
    this.oscOctave.frequency.setValueAtTime(420, t);
    this.gainOctave = this.ctx.createGain();
    this.gainOctave.gain.setValueAtTime(0.0, t);
    this.oscOctave.connect(this.gainOctave);

    // 5. High metallic rasp (3.0 * f0) - strictly 0 at idle
    this.oscRasp = this.ctx.createOscillator();
    this.oscRasp.type = 'sawtooth';
    this.oscRasp.frequency.setValueAtTime(630, t);
    this.gainRasp = this.ctx.createGain();
    this.gainRasp.gain.setValueAtTime(0.0, t);
    this.oscRasp.connect(this.gainRasp);

    // 6. Visceral Sub-Bass Rumble (45-80 Hz sine) - heavy horsepower presence
    this.oscBass = this.ctx.createOscillator();
    this.oscBass.type = 'sine';
    this.oscBass.frequency.setValueAtTime(52, t);
    this.gainBass = this.ctx.createGain();
    this.gainBass.gain.setValueAtTime(0.35, t);
    this.oscBass.connect(this.gainBass);

    // Sum oscillator bank into WaveShaper
    this.gainFund.connect(this.waveShaper);
    this.gainSub.connect(this.waveShaper);
    this.gainBank.connect(this.waveShaper);
    this.gainOctave.connect(this.waveShaper);
    this.gainRasp.connect(this.waveShaper);
    this.gainBass.connect(this.waveShaper);

    // Processing Chain: WaveShaper -> LowCut -> Formant 1 -> Formant 2 -> HighCut -> EngineMasterGain -> Master
    this.waveShaper.connect(this.lowCutFilter);
    this.lowCutFilter.connect(this.formant1);
    this.formant1.connect(this.formant2);
    this.formant2.connect(this.highCutFilter);
    this.highCutFilter.connect(this.engineMasterGain);
    this.engineMasterGain.connect(this.masterGain);

    this.oscFund.start(t);
    this.oscSub.start(t);
    this.oscBank.start(t);
    this.oscOctave.start(t);
    this.oscRasp.start(t);
    this.oscBass.start(t);
  }

  /**
   * Generates a soft-saturation transfer curve for rich analog warmth & harmonic density
   */
  createSaturationCurve(amount = 2.5, samples = 4096) {
    const curve = new Float32Array(samples);
    const k = amount;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Hyperbolic soft-clip transfer function with warm second-harmonic inflection
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  /**
   * High-revving turbocharger whistle with ceramic bearing micro-flutter
   */
  buildTurboPipeline() {
    const t = this.ctx.currentTime;

    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.setValueAtTime(1600, t);

    // Subtle pitch vibrato/flutter on turbo spool
    this.turboMod = this.ctx.createOscillator();
    this.turboMod.type = 'sine';
    this.turboMod.frequency.setValueAtTime(18, t);
    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(25, t);
    this.turboMod.connect(modGain);
    modGain.connect(this.turboOsc.frequency);

    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0.0, t);

    // Highpass filter on turbo to remove any low bleed
    const turboHP = this.ctx.createBiquadFilter();
    turboHP.type = 'highpass';
    turboHP.frequency.setValueAtTime(1400, t);

    this.turboOsc.connect(turboHP);
    turboHP.connect(this.turboGain);
    this.turboGain.connect(this.masterGain);

    this.turboOsc.start(t);
    this.turboMod.start(t);
  }

  /**
   * Throaty carbon-fiber airbox induction roar under heavy acceleration
   */
  buildInductionPipeline() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Shaped pink-weighted noise
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }

    this.inductionNode = this.ctx.createBufferSource();
    this.inductionNode.buffer = buffer;
    this.inductionNode.loop = true;

    this.inductionFilter = this.ctx.createBiquadFilter();
    this.inductionFilter.type = 'bandpass';
    this.inductionFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.inductionFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

    this.inductionGain = this.ctx.createGain();
    this.inductionGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.inductionNode.connect(this.inductionFilter);
    this.inductionFilter.connect(this.inductionGain);
    this.inductionGain.connect(this.masterGain);

    this.inductionNode.start(this.ctx.currentTime);
  }

  /**
   * Procedural tire scrub and high-slip drift screech
   */
  buildTireScreechPipeline() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.screechNode = this.ctx.createBufferSource();
    this.screechNode.buffer = buffer;
    this.screechNode.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1150, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(4.5, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.screechNode.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    this.screechNode.start(this.ctx.currentTime);
  }

  /**
   * Aerodynamic wind rush and cockpit slipstream
   */
  buildWindPipeline() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.windNode = this.ctx.createBufferSource();
    this.windNode.buffer = buffer;
    this.windNode.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.windNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    this.windNode.start(this.ctx.currentTime);
  }

  /**
   * Trackside Grandstand Audience Ambience Pipeline
   */
  buildCrowdPipeline() {
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }

    this.crowdNode = this.ctx.createBufferSource();
    this.crowdNode.buffer = buffer;
    this.crowdNode.loop = true;

    this.crowdFilter = this.ctx.createBiquadFilter();
    this.crowdFilter.type = 'bandpass';
    this.crowdFilter.frequency.setValueAtTime(650, this.ctx.currentTime);
    this.crowdFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.crowdNode.connect(this.crowdFilter);
    this.crowdFilter.connect(this.crowdGain);
    this.crowdGain.connect(this.masterGain);

    this.crowdNode.start(this.ctx.currentTime);
  }

  /**
   * Play dynamic crowd cheer and spectator stadium airhorn
   */
  playCrowdCheer(intensity = 1.0) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    if (this.crowdGain) {
      this.crowdGain.gain.cancelScheduledValues(t);
      this.crowdGain.gain.setValueAtTime(this.crowdGain.gain.value, t);
      this.crowdGain.gain.linearRampToValueAtTime(0.20 * intensity, t + 0.35);
      this.crowdGain.gain.exponentialRampToValueAtTime(0.04, t + 2.8);
    }
    this.playAirhorn(t);
  }

  /**
   * Procedural stadium airhorn triad (Bb major)
   */
  playAirhorn(time) {
    if (!this.ctx || this.isMuted) return;
    const hornFrequencies = [466.16, 587.33, 698.46];
    for (const freq of hornFrequencies) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.06, time);
      gain.gain.setValueAtTime(0.06, time + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.4, time);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.30);
    }
  }

  /**
   * Update audio parameters dynamically from vehicle telemetry
   * @param {number} rpm - Engine RPM (4,000 to 13,500)
   * @param {number} throttle - Throttle pedal position (0 to 1)
   * @param {number} speedKmh - Current vehicle speed in km/h
   * @param {number} slip - Tire lateral slip / drift ratio (0 to 1)
   */
  update(rpm, throttle, speedKmh, slip) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;

    // Sanitize inputs to guarantee valid finite numbers
    const safeRPM = (Number.isFinite(rpm) && rpm > 0) ? rpm : 4200;
    const safeThrottle = (Number.isFinite(throttle) && throttle >= 0) ? Math.min(1, throttle) : 0;
    const safeSpeed = (Number.isFinite(speedKmh) && speedKmh >= 0) ? speedKmh : 0;
    const safeSlip = (Number.isFinite(slip) && slip >= 0) ? Math.min(1, slip) : 0;

    // Smooth RPM and Throttle response
    this.currentRPM += (safeRPM - this.currentRPM) * 0.28;
    this.currentThrottle += (safeThrottle - this.currentThrottle) * 0.35;

    // --- 1. ACCURATE V6 COMBUSTION FIRING FREQUENCIES ---
    // A 4-stroke V6 fires 3 cylinders per crankshaft revolution: f0 = (RPM / 60) * 3
    // At 4,200 RPM (idle)  -> f0 = 210 Hz
    // At 8,000 RPM (mid)   -> f0 = 400 Hz
    // At 11,000 RPM (high) -> f0 = 550 Hz
    // At 13,500 RPM (red)  -> f0 = 675 Hz
    const f0 = Math.max(50, Math.min(1200, (this.currentRPM / 60) * 3.0));

    // Update harmonic oscillators with organic micro-pitch inertia
    this.oscFund.frequency.setTargetAtTime(f0, t, 0.025);
    this.oscSub.frequency.setTargetAtTime(f0 * 0.5, t, 0.025);
    this.oscBank.frequency.setTargetAtTime(f0 * 1.5, t, 0.025);
    this.oscOctave.frequency.setTargetAtTime(f0 * 2.0, t, 0.025);
    this.oscRasp.frequency.setTargetAtTime(f0 * 3.0, t, 0.025);

    // Sub-bass horsepower resonance (42 Hz at idle up to 78 Hz under full load)
    const bassFreq = Math.max(30, Math.min(120, 42 + (this.currentRPM / 13500) * 36));
    this.oscBass.frequency.setTargetAtTime(bassFreq, t, 0.03);

    // --- 2. DYNAMIC HARMONIC WEIGHTING UNDER THROTTLE ---
    const throttleLoad = Math.max(0, this.currentThrottle);
    const rpmNorm = (this.currentRPM - 4000) / 9500; // 0 to 1
    const isIdle = safeSpeed < 2 && throttleLoad < 0.05;

    // At 0 km/h / Idle: Silky smooth, deep combustion thrum with ZERO harsh buzzing or high-pitch rasp
    // Under throttle / High RPM: Soaring V6 racing harmonics
    this.gainFund.gain.setTargetAtTime(isIdle ? 0.35 : (0.45 + throttleLoad * 0.30), t, 0.03);
    this.gainSub.gain.setTargetAtTime(isIdle ? 0.45 : (0.55 + (1.0 - rpmNorm) * 0.3), t, 0.03);
    this.gainBank.gain.setTargetAtTime(isIdle ? 0.04 : (0.25 + throttleLoad * 0.35), t, 0.03);
    this.gainOctave.gain.setTargetAtTime(isIdle ? 0.0 : (rpmNorm * 0.40 + throttleLoad * 0.30), t, 0.03);
    this.gainRasp.gain.setTargetAtTime(isIdle ? 0.0 : ((rpmNorm * rpmNorm) * 0.45 + throttleLoad * 0.35), t, 0.03);
    this.gainBass.gain.setTargetAtTime(isIdle ? 0.22 : (0.28 + throttleLoad * 0.45), t, 0.03);

    // --- 3. EXHAUST ACOUSTIC FORMANT FILTERING ---
    // Warm low-pass cutoff at idle (550 Hz) cuts off all metallic buzz and static; opens up to 8,000+ Hz on throttle
    const targetHighCut = isIdle ? 550 : (950 + throttleLoad * 7000 + rpmNorm * 4200);
    this.highCutFilter.frequency.setTargetAtTime(targetHighCut, t, 0.035);

    // Exhaust formants shift slightly with exhaust gas velocity (Doppler/cavity expansion)
    this.formant1.frequency.setTargetAtTime(440 + rpmNorm * 120, t, 0.05);
    this.formant2.frequency.setTargetAtTime(1240 + rpmNorm * 280, t, 0.05);

    // Engine Master Volume (clean, quiet, gentle purr at 0 km/h)
    const engineVolume = isIdle ? 0.16 : (0.24 + throttleLoad * 0.45 + rpmNorm * 0.28);
    this.engineMasterGain.gain.setTargetAtTime(engineVolume, t, 0.035);

    // --- 4. TURBOCHARGER WHISTLE & WASTEGATE FLUTTER ---
    const targetBoost = throttleLoad * (0.3 + rpmNorm * 0.7);
    this.turboBoost += (targetBoost - this.turboBoost) * 0.12;

    const turboFreq = 1800 + this.turboBoost * 5400 + rpmNorm * 1200;
    this.turboOsc.frequency.setTargetAtTime(turboFreq, t, 0.04);
    const turboVolume = isIdle ? 0.0 : (this.turboBoost * 0.11);
    this.turboGain.gain.setTargetAtTime(turboVolume, t, 0.04);

    // Check for throttle lift-off to trigger wastegate flutter / blow-off chirp
    const throttleDelta = this.previousThrottle - safeThrottle;
    if (throttleDelta > 0.45 && this.turboBoost > 0.4 && t - this.lastPopTime > 0.35) {
      this.triggerWastegateFlutter();
    }

    // --- 5. INDUCTION AIRBOX ROAR ---
    if (this.inductionGain && this.inductionFilter) {
      const inductionVol = isIdle ? 0.0 : (throttleLoad * (0.18 + rpmNorm * 0.16));
      this.inductionGain.gain.setTargetAtTime(inductionVol, t, 0.04);
      this.inductionFilter.frequency.setTargetAtTime(280 + rpmNorm * 480, t, 0.04);
    }

    // --- 6. EXHAUST OVERRUN CRACKLES & BURBLES ---
    if (safeThrottle < 0.15 && this.currentRPM > 6800 && t - this.lastPopTime > 0.22) {
      if (Math.random() < 0.65) {
        this.triggerOverrunPop(t);
        this.lastPopTime = t;
      }
    }

    this.previousThrottle = safeThrottle;

    // --- 7. REALISTIC TIRE SCREECH ---
    // Zero screech when stationary
    const targetScreech = safeSpeed < 5 ? 0.0 : Math.min(1.0, Math.max(0, (safeSlip - 0.18) * 1.8));
    this.screechGain.gain.setTargetAtTime(targetScreech * 0.32, t, 0.04);
    if (this.screechFilter) {
      this.screechFilter.frequency.setTargetAtTime(950 + safeSlip * 480, t, 0.04);
    }

    // --- 8. AERODYNAMIC AIRFLOW RUSH ---
    // Strictly zero airflow rush when stopped or slow
    const windVol = safeSpeed < 45 ? 0.0 : Math.min(0.28, Math.max(0, (safeSpeed - 45) / 280) * 0.28);
    this.windGain.gain.setTargetAtTime(windVol, t, 0.06);
    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(250 + (safeSpeed / 350) * 950, t, 0.06);
    }

    // --- 9. TRACKSIDE GRANDSTAND CROWD AMBIENCE ---
    // Zero crowd hiss when stationary; crowd cheering triggers on lights out & race events
    if (this.crowdGain) {
      const crowdVol = safeSpeed < 15 ? 0.0 : Math.min(0.12, ((safeSpeed - 15) / 320) * 0.12);
      this.crowdGain.gain.setTargetAtTime(crowdVol, t, 0.08);
    }
  }

  /**
   * Sound effect for seamless gear shift: ignition cut dip followed by an aggressive exhaust crackle & pop
   */
  playGearShift() {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Instantaneous 50ms ignition cut dip
    this.engineMasterGain.gain.cancelScheduledValues(t);
    this.engineMasterGain.gain.setValueAtTime(0.06, t);
    this.engineMasterGain.gain.setTargetAtTime(0.48, t + 0.06, 0.025);

    // 2. Powerful ignition pop / backfire crackle in the exhaust pipe
    this.triggerGearShiftPop(t + 0.045);

    // 3. Brief turbo blow-off release chirp
    this.triggerWastegateFlutter(0.4);
  }

  /**
   * Procedural gear-shift exhaust detonation pop
   */
  triggerGearShiftPop(time) {
    if (!this.ctx || this.isMuted) return;

    // Low-end acoustic pressure thump (subwoofer impact)
    const thumpOsc = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(140, time);
    thumpOsc.frequency.exponentialRampToValueAtTime(38, time + 0.09);

    thumpGain.gain.setValueAtTime(0.35, time);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, time + 0.10);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thumpOsc.start(time);
    thumpOsc.stop(time + 0.11);

    // Metallic exhaust pipe crackle
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }

    const crackleNode = this.ctx.createBufferSource();
    crackleNode.buffer = buffer;

    const crackleFilter = this.ctx.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.setValueAtTime(1600, time);
    crackleFilter.Q.setValueAtTime(2.5, time);

    const crackleGain = this.ctx.createGain();
    crackleGain.gain.setValueAtTime(0.22, time);

    crackleNode.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(this.masterGain);

    crackleNode.start(time);
  }

  /**
   * Procedural exhaust overrun burble / unburnt fuel pop on deceleration
   */
  triggerOverrunPop(time) {
    if (!this.ctx || this.isMuted) return;

    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const popTime = time + i * (0.04 + Math.random() * 0.05);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const startFreq = 120 + Math.random() * 80;
      osc.frequency.setValueAtTime(startFreq, popTime);
      osc.frequency.exponentialRampToValueAtTime(45, popTime + 0.04);

      const vol = (0.15 + Math.random() * 0.22);
      gain.gain.setValueAtTime(vol, popTime);
      gain.gain.exponentialRampToValueAtTime(0.001, popTime + 0.045);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(popTime);
      osc.stop(popTime + 0.05);
    }
  }

  /**
   * Procedural turbo wastegate compressor flutter ("sutututu" sound)
   */
  triggerWastegateFlutter(intensity = 0.5) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const chirps = 4;
    for (let i = 0; i < chirps; i++) {
      const chirpTime = t + i * 0.048;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400 - i * 220, chirpTime);
      osc.frequency.exponentialRampToValueAtTime(1600 - i * 180, chirpTime + 0.035);

      const vol = intensity * (0.12 * Math.pow(0.72, i));
      gain.gain.setValueAtTime(vol, chirpTime);
      gain.gain.exponentialRampToValueAtTime(0.001, chirpTime + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(chirpTime);
      osc.stop(chirpTime + 0.042);
    }
  }

  /**
   * Distinct-pitch broadcast beep for each of the 5 red starting lights.
   * Light 1 is the lowest tone; light 5 is the highest before lights-out.
   */
  playStartLightBeep(lightNumber = 1) {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const freqs = [0, 440, 554, 659, 784, 932];
    const idx = Math.max(1, Math.min(5, lightNumber | 0));
    const freq = freqs[idx];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.20, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.20);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);

    // Subtle second harmonic so each column reads as a unique FIA tone
    const harm = this.ctx.createOscillator();
    const harmGain = this.ctx.createGain();
    harm.type = 'triangle';
    harm.frequency.setValueAtTime(freq * 2, t);
    harmGain.gain.setValueAtTime(0.05, t);
    harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    harm.connect(harmGain);
    harmGain.connect(this.masterGain);
    harm.start(t);
    harm.stop(t + 0.16);
  }

  /**
   * Low-frequency burst oscillator for barrier / wall impacts.
   * Intensity is expected in roughly m/s of closing speed.
   */
  playWallImpact(intensity = 1.0) {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (this._lastImpactAt && t - this._lastImpactAt < 0.12) return;
    this._lastImpactAt = t;

    const mag = Math.max(0.18, Math.min(1.0, intensity / 18));

    // Sub-bass body thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(72 + mag * 50, t);
    osc.frequency.exponentialRampToValueAtTime(26, t + 0.20);
    gain.gain.setValueAtTime(0.42 * mag, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.26);

    // Short filtered noise crack for carbon/armco contact
    const nLen = Math.floor(this.ctx.sampleRate * 0.09);
    const buf = this.ctx.createBuffer(1, nLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nLen * 0.28));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(280 + mag * 220, t);
    bp.Q.setValueAtTime(1.6, t);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.28 * mag, t);
    src.connect(bp);
    bp.connect(nGain);
    nGain.connect(this.masterGain);
    src.start(t);
  }

  /**
   * Punchy broadcast siren tone for "LIGHTS OUT AND AWAY WE GO"
   */
  playLightsOutTone() {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1450, t);
    osc.frequency.exponentialRampToValueAtTime(1850, t + 0.22);
    gain.gain.setValueAtTime(0.26, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.60);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.65);

    // Roar of the stadium crowd and airhorns as lights go out
    this.playCrowdCheer(1.0);
  }

  /**
   * F1 TV broadcast chime when passing sector or setting fastest lap
   */
  playSectorChime(isPurple = false) {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isPurple ? 1240 : 980, now);
    osc.frequency.exponentialRampToValueAtTime(isPurple ? 1580 : 1120, now + 0.16);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.40);

    if (isPurple) {
      this.playCrowdCheer(0.75);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.18, this.ctx.currentTime);
      if (!this.isMuted && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    return this.isMuted;
  }
}
