/**
 * High-Precision F1 Lap Timing & Anti-Cheat Checkpoint System
 * Tracks millisecond lap times (MM:SS:mmm), sector splits (S1/S2/S3),
 * personal best deltas, reverse driving detection, and sequential checkpoint validation.
 */
export class TimingSystem {
  constructor(track, audioManager = null) {
    this.track = track;
    this.audio = audioManager;

    // Lap counters & timestamps
    this.currentLap = 1;
    this.lapStartTime = 0;
    this.currentLapTime = 0;
    this.lastLapTime = null;
    this.bestLapTime = null;

    // Sector times for current lap
    this.sectorTimes = [null, null, null];
    this.bestSectorTimes = [null, null, null];
    this.sessionBestSectorTimes = [24.120, 26.340, 21.990]; // Benchmark purple sector targets

    // Checkpoint sequential states
    // 0: Start/Finish, 1: Sector 1, 2: Sector 2, 3: Sector 3
    this.sector1Reached = false;
    this.sector2Reached = false;
    this.sector3Reached = false;
    this.nextExpectedCheckpoint = 1;
    this.lastTriggeredCheckpoint = 0;
    this.checkpointsHit = new Set([0]);

    // Anti-cheat & alerts
    this.isDrivingWrongWay = false;
    this.lastWrongWayAlertTime = 0;
    this.lapInvalidated = false;
    this.prevProgress = 0;
    this.onLapCompleteCallback = null;

    // Benchmark Qualifying times for F1 grid comparison
    this.benchmarkGrid = [
      { name: 'M. Verstappen', team: 'Red Bull Racing', time: 72.450 },
      { name: 'C. Leclerc', team: 'Ferrari', time: 72.610 },
      { name: 'L. Norris', team: 'McLaren', time: 72.780 },
      { name: 'L. Hamilton', team: 'Mercedes', time: 72.920 },
      { name: 'O. Piastri', team: 'McLaren', time: 73.150 },
      { name: 'G. Russell', team: 'Mercedes', time: 73.340 },
      { name: 'C. Sainz', team: 'Ferrari', time: 73.480 },
      { name: 'F. Alonso', team: 'Aston Martin', time: 73.620 },
      { name: 'P. Gasly', team: 'Alpine', time: 73.890 },
      { name: 'A. Albon', team: 'Williams', time: 74.210 }
    ];

    this.timerRunning = false;
  }

  start() {
    this.lapStartTime = performance.now();
    this.timerRunning = true;
    this.currentLapTime = 0;
    this.nextExpectedCheckpoint = 1;
    this.checkpointsHit.clear();
    this.checkpointsHit.add(0);
    this.lapInvalidated = false;
    this.prevProgress = 0;
  }

  reset() {
    this.currentLap = 1;
    this.currentLapTime = 0;
    this.lastLapTime = null;
    this.sectorTimes = [null, null, null];
    this.nextExpectedCheckpoint = 1;
    this.checkpointsHit.clear();
    this.checkpointsHit.add(0);
    this.timerRunning = false;
    this.isDrivingWrongWay = false;
    this.lapInvalidated = false;
    this.prevProgress = 0;
  }

  /**
   * Main timing update called every frame
   */
  update(carPos, carVelocity) {
    if (!this.timerRunning) return;

    const now = performance.now();
    this.currentLapTime = (now - this.lapStartTime) / 1000;

    // 1. Check car position against track spline
    const trackInfo = this.track.getClosestTrackPoint(carPos.x, carPos.z);
    const progress = trackInfo.t; // 0 to 1

    // 2. Anti-Cheat: Reverse Driving Detection
    const speed = Math.sqrt(carVelocity.x * carVelocity.x + carVelocity.z * carVelocity.z);
    if (speed > 4.0) {
      const vDir = { x: carVelocity.x / speed, z: carVelocity.z / speed };
      const tDir = trackInfo.tangent;
      const dot = vDir.x * tDir.x + vDir.z * tDir.z;

      // If driving against track tangent
      if (dot < -0.35) {
        this.isDrivingWrongWay = true;
      } else {
        this.isDrivingWrongWay = false;
      }
    } else {
      this.isDrivingWrongWay = false;
    }

    // 3. Sector & Lap Progression Detection
    // Use track checkpoints for sector boundaries instead of hardcoded progress values
    // Checkpoints are at 0/8, 1/8, 2/8, 3/8, 4/8, 5/8, 6/8, 7/8 of lap
    // Sector 1 ends at checkpoint 3 (3/8 = 0.375), Sector 2 at checkpoint 5 (5/8 = 0.625), Sector 3 at checkpoint 7 (7/8 = 0.875)
    const sector1End = this.track.checkpoints && this.track.checkpoints[3] ? this.track.checkpoints[3].t : 0.375;
    const sector2End = this.track.checkpoints && this.track.checkpoints[5] ? this.track.checkpoints[5].t : 0.625;
    const sector3End = this.track.checkpoints && this.track.checkpoints[7] ? this.track.checkpoints[7].t : 0.875;

    // Sector 1
    if (progress >= sector1End - 0.05 && progress <= sector1End + 0.05 && !this.sector1Reached) {
      this.sector1Reached = true;
      this.checkpointsHit.add(1);
      this.onPassSector(1, this.currentLapTime);
    }
    // Sector 2
    if (progress >= sector2End - 0.05 && progress <= sector2End + 0.05 && !this.sector2Reached && this.sector1Reached) {
      this.sector2Reached = true;
      this.checkpointsHit.add(2);
      this.onPassSector(2, this.currentLapTime);
    }
    // Sector 3 approach
    if (progress >= sector3End - 0.05 && this.sector1Reached && this.sector2Reached) {
      this.sector3Reached = true;
      this.checkpointsHit.add(3);
    }

    // Start / Finish Line Crossing: Trigger as car wraps across the gantry
    // (prevProgress > 0.82 and progress < 0.18) OR (sector3Reached and progress < 0.08)
    const crossedFinishLine = (this.prevProgress > 0.82 && progress < 0.18) || (this.sector3Reached && progress < 0.08);

    if (crossedFinishLine && this.sector1Reached && this.sector2Reached) {
      this.onCompleteLap();
    }

    this.prevProgress = progress;
  }

  setTrack(track) {
    this.track = track;
    this.reset();
  }

  onPassSector(sectorNumber, timeAtSector) {
    let sectorDuration = 0;
    if (sectorNumber === 1) {
      sectorDuration = timeAtSector;
      this.sectorTimes[0] = sectorDuration;
    } else if (sectorNumber === 2) {
      sectorDuration = timeAtSector - (this.sectorTimes[0] || 0);
      this.sectorTimes[1] = sectorDuration;
    }

    // Check if sector is purple (fastest session) or green (personal best)
    const isPurple = !this.sessionBestSectorTimes[sectorNumber - 1] || sectorDuration < this.sessionBestSectorTimes[sectorNumber - 1];
    if (isPurple) {
      this.sessionBestSectorTimes[sectorNumber - 1] = sectorDuration;
    }

    if (this.audio) {
      this.audio.playSectorChime(isPurple);
    }
  }

  onCompleteLap() {
    const completedLapTime = this.currentLapTime;

    // Anti-cheat: Ensure minimum realistic lap time was achieved
    // Calculate based on track length and max realistic F1 speed (~350 km/h = 97 m/s)
    // Add 20% margin for safety: minTime = (trackLength / 97) * 1.2
    const trackLength = this.track.trackLength || 1850;
    const minRealisticTime = (trackLength / 97.0) * 1.2;
    if (completedLapTime < minRealisticTime) {
      this.lapInvalidated = true;
      this.resetLapTimer();
      return { valid: false, reason: 'LAP_TOO_FAST' };
    }

    // Anti-cheat: Ensure sectors 1 and 2 were visited
    if (!this.sector1Reached || !this.sector2Reached) {
      this.lapInvalidated = true;
      this.resetLapTimer();
      return { valid: false, reason: 'MISSED_CHECKPOINTS' };
    }

    this.lastLapTime = completedLapTime;

    // Sector 3 time
    const s1 = this.sectorTimes[0] || 0;
    const s2 = this.sectorTimes[1] || 0;
    this.sectorTimes[2] = completedLapTime - (s1 + s2);

    let isNewBest = false;
    if (!this.bestLapTime || completedLapTime < this.bestLapTime) {
      this.bestLapTime = completedLapTime;
      isNewBest = true;
    }

    if (this.audio) {
      this.audio.playSectorChime(isNewBest);
    }

    const lapResult = {
      valid: true,
      lapNumber: this.currentLap,
      time: completedLapTime,
      isNewBest: isNewBest,
      sectors: [...this.sectorTimes]
    };

    // Prepare next lap
    this.currentLap++;
    this.resetLapTimer();

    if (this.onLapCompleteCallback) {
      this.onLapCompleteCallback(lapResult);
    }

    return lapResult;
  }

  resetLapTimer() {
    this.lapStartTime = performance.now();
    this.currentLapTime = 0;
    this.sector1Reached = false;
    this.sector2Reached = false;
    this.sector3Reached = false;
    this.nextExpectedCheckpoint = 1;
    this.checkpointsHit.clear();
    this.checkpointsHit.add(0);
    this.sectorTimes = [null, null, null];
  }

  /**
   * Format seconds to standard F1 timing: MM:SS.mmm
   */
  static formatTime(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    const mStr = String(mins).padStart(2, '0');
    const sStr = String(secs).padStart(2, '0');
    const msStr = String(ms).padStart(3, '0');

    return `${mStr}:${sStr}.${msStr}`;
  }

  /**
   * Format delta time with +/- sign: +0.284 or -0.192
   */
  static formatDelta(deltaSec) {
    if (deltaSec === null || isNaN(deltaSec)) return '+0.000';
    const sign = deltaSec > 0 ? '+' : '-';
    const abs = Math.abs(deltaSec);
    return `${sign}${abs.toFixed(3)}s`;
  }

  /**
   * Evaluate qualifying position against benchmark F1 grid
   */
  getQualifyingClassification(playerTime) {
    const fullGrid = [...this.benchmarkGrid];
    fullGrid.push({
      name: 'YOU (Player)',
      team: 'Scuderia Player',
      time: playerTime,
      isPlayer: true
    });

    fullGrid.sort((a, b) => a.time - b.time);

    const playerIndex = fullGrid.findIndex(entry => entry.isPlayer);
    const poleTime = fullGrid[0].time;
    const deltaToPole = playerTime - poleTime;

    return {
      position: playerIndex + 1,
      totalDrivers: fullGrid.length,
      playerTime: playerTime,
      poleTime: poleTime,
      deltaToPole: deltaToPole,
      classification: fullGrid.map((entry, idx) => ({
        pos: idx + 1,
        name: entry.name,
        team: entry.team,
        time: TimingSystem.formatTime(entry.time),
        delta: idx === 0 ? 'POLE' : TimingSystem.formatDelta(entry.time - poleTime),
        isPlayer: entry.isPlayer || false
      }))
    };
  }
}
