/**
 * Formula 1 Session State Controller
 * Manages Practice Mode, One-Shot Flying Lap Qualifying, and 10-Car Grid Sprint Race
 * with authentic 5-Red-Lights starting sequence, AI difficulty engine, and broadcast sponsor mock ads.
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const SESSION_TYPES = {
  PRACTICE: 'PRACTICE',
  QUALIFYING: 'QUALIFYING',
  RACE: 'RACE'
};

export class SessionManager {
  constructor(track, physicsWorld, timingSystem, audioManager, uiCallbacks) {
    this.track = track;
    this.physics = physicsWorld;
    this.timing = timingSystem;
    this.audio = audioManager;
    this.ui = uiCallbacks;

    this.currentMode = SESSION_TYPES.PRACTICE;
    this.difficulty = 'MEDIUM'; // 'EASY', 'MEDIUM', 'HARD'

    // Race specific states (up to 20 laps capability)
    this.raceLapsTotal = 3;
    this.playerRaceLap = 1;
    this.playerGridPos = 1;
    this.raceState = 'PRE_START'; // 'PRE_START', 'LIGHTS_COUNTDOWN', 'RACING', 'FINISHING', 'FINISHED'
    this.raceStartTime = 0;
    this.jumpStart = false;
    this.leaderFinished = false;
    this.raceWinner = null;
    this.finishTimeout = null;

    // Starting Lights timer state
    this.gantryStep = 0;
    this.gantryTimer = null;

    // AI Grid Manager (10 Cars)
    this.aiGrid = null;

    // Qualifying state
    this.qualifyingPhase = 'OUT_LAP'; // 'OUT_LAP' -> 'FLYING_LAP' -> 'FINISHED'
    this.qualifyingResult = null;

    if (this.timing) {
      this.timing.onLapCompleteCallback = (lapResult) => this.handleLapComplete(lapResult);
    }
  }

  setTrack(track) {
    this.track = track;
    if (this.track && this.track.trackData && this.track.trackData.laps) {
      this.raceLapsTotal = this.track.trackData.laps;
    }
  }

  setAIGridManager(aiGridManager) {
    this.aiGrid = aiGridManager;
    if (this.aiGrid) {
      this.aiGrid.setDifficulty(this.difficulty);
    }
  }

  setDifficulty(diffMode) {
    this.difficulty = diffMode;
    if (this.aiGrid) {
      this.aiGrid.setDifficulty(diffMode);
    }
  }

  setRaceLapsTotal(laps) {
    this.raceLapsTotal = Math.max(1, Math.min(20, laps));
  }

  setMultiplayerMode(isMP, isHost = false) {
    this.isMultiplayer = isMP;
    this.isHost = isHost;
    if (this.aiGrid) {
      this.aiGrid.setGuestRemote(isMP);
    }
  }

  initSession(mode, playerVehicle, playerCar, qualifiedGrid = null, skipAd = false) {
    // STRICT AD POLICY: Mock ads are entirely disabled in Multiplayer mode!
    if (this.isMultiplayer) {
      skipAd = true;
    }

    // If starting race and mock ad callback exists (single player only)
    if (mode === SESSION_TYPES.RACE && !skipAd && this.ui.showMockAd) {
      this.ui.showMockAd({
        title: 'OFFICIAL BROADCAST SPONSOR',
        sponsor: 'ROLEX',
        subtitle: 'Formula 1 Grand Prix Starting Grid Live Broadcast',
        buttonText: 'Skip to Starting Grid',
        duration: 3000,
        onFinish: () => {
          this.executeSessionInit(mode, playerVehicle, playerCar, qualifiedGrid);
        }
      });
      return;
    }

    this.executeSessionInit(mode, playerVehicle, playerCar, qualifiedGrid);
  }

  executeSessionInit(mode, playerVehicle, playerCar, qualifiedGrid = null) {
    this.currentMode = mode;
    this.clearAllTimers();
    this.timing.reset();

    // Notify UI
    if (this.ui.onSessionChange) {
      this.ui.onSessionChange(this.currentMode);
    }

    if (mode === SESSION_TYPES.PRACTICE) {
      this.startPracticeSession(playerVehicle, playerCar);
    } else if (mode === SESSION_TYPES.QUALIFYING) {
      this.startQualifyingSession(playerVehicle, playerCar);
    } else if (mode === SESSION_TYPES.RACE) {
      this.startRaceSession(playerVehicle, playerCar, qualifiedGrid);
    }
  }

  /* --------------------------------------------------------------------------
     1. PRACTICE MODE (Solo / Ghost Run)
     -------------------------------------------------------------------------- */
  startPracticeSession(playerVehicle, playerCar) {
    this.raceState = 'PRACTICE';
    // Spawn player at start line stationary
    const startPt = this.track.curve.getPointAt(0.0);
    const tgt = this.track.curve.getTangentAt(0.0).normalize();
    const yaw = Math.atan2(tgt.x, tgt.z);
    const startY = (startPt.y || 0) + 0.04;

    this.physics.resetVehicle(playerVehicle, startPt.x, startY, startPt.z, yaw, 0);
    this.timing.start();

    // Hide and deactivate all 9 AI cars in Practice mode
    if (this.aiGrid) {
      this.aiGrid.setupSession('PRACTICE');
    }

    if (this.ui.showAlert) {
      this.ui.showAlert('PRACTICE SESSION - FREE DRIVING', 3000, 'alert-flying-lap');
    }
    if (this.ui.updateSessionBadge) {
      this.ui.updateSessionBadge('PRACTICE', 'SOLO TRACK RUN');
    }
  }

  /* --------------------------------------------------------------------------
     2. ONE-SHOT QUALIFYING MODE (Solo Flying Lap Run)
     -------------------------------------------------------------------------- */
  startQualifyingSession(playerVehicle, playerCar) {
    this.raceState = 'QUALIFYING';
    this.qualifyingPhase = 'OUT_LAP';
    this.qualifyingResult = null;

    // Rolling start spawn: ~120m before the start/finish line (t ~ 0.95)
    const spawnT = 0.95;
    const spawnPt = this.track.curve.getPointAt(spawnT);
    const tgt = this.track.curve.getTangentAt(spawnT).normalize();
    const yaw = Math.atan2(tgt.x, tgt.z);
    const spawnY = (spawnPt.y || 0) + 0.04;

    // Initial rolling speed of ~220 km/h (61 m/s)
    this.physics.resetVehicle(playerVehicle, spawnPt.x, spawnY, spawnPt.z, yaw, 61.0);
    playerVehicle.currentGear = 6;
    playerVehicle.rpm = 11500;

    // Hide and deactivate all 9 AI cars in Qualifying mode
    if (this.aiGrid) {
      this.aiGrid.setupSession('QUALIFYING');
    }

    if (this.ui.showAlert) {
      this.ui.showAlert('OUT-LAP APPROACH - PREPARE FOR HOT LAP', 3000, 'alert-flying-lap');
    }
    if (this.ui.updateSessionBadge) {
      this.ui.updateSessionBadge('QUALIFYING', 'OUT-LAP APPROACH');
    }
  }

  /* --------------------------------------------------------------------------
     3. SPRINT RACE MODE (10 Cars on 2x2 Staggered Grid)
     -------------------------------------------------------------------------- */
  startRaceSession(playerVehicle, playerCar, qualifiedGrid = null) {
    this.raceState = 'PRE_START';
    this.playerRaceLap = 1;
    this.jumpStart = false;
    this.leaderFinished = false;
    this.raceWinner = null;
    if (this.finishTimeout) {
      clearTimeout(this.finishTimeout);
      this.finishTimeout = null;
    }

    // Spawn all 10 cars (Player + 9 AI) on 2x2 staggered starting grid
    if (this.aiGrid) {
      this.aiGrid.setupSession('RACE', qualifiedGrid);
    } else {
      // Fallback if aiGrid not set
      const pGridT = 0.99;
      const pPt = this.track.curve.getPointAt(pGridT);
      const pTgt = this.track.curve.getTangentAt(pGridT).normalize();
      const pYaw = Math.atan2(pTgt.x, pTgt.z);
      this.physics.resetVehicle(playerVehicle, pPt.x - 3.2, 0.04, pPt.z, pYaw, 0);
    }

    if (this.ui.updateSessionBadge) {
      this.ui.updateSessionBadge('RACE', '10-CAR FORMATION GRID');
    }

    // Begin 5 Red Lights Sequence after 1.2s delay
    this.beginStartLightsSequence(playerVehicle);
  }

  beginStartLightsSequence(playerVehicle) {
    this.raceState = 'LIGHTS_COUNTDOWN';
    this.gantryStep = 0;
    if (this.ui.setStartLightsVisible) {
      this.ui.setStartLightsVisible(true);
      this.ui.updateGantryBulbs(0);
    }
    this.track.setGantryLights(0);

    const scheduleNextLight = () => {
      this.gantryStep++;
      if (this.gantryStep <= 5) {
        if (this.ui.updateGantryBulbs) this.ui.updateGantryBulbs(this.gantryStep);
        this.track.setGantryLights(this.gantryStep);
        if (this.audio) this.audio.playStartLightBeep();

        if (this.ui.broadcastLights) {
          this.ui.broadcastLights({ step: this.gantryStep, lightsOut: false });
        }

        this.gantryTimer = setTimeout(scheduleNextLight, 1000);
      } else {
        // Random pause between 0.4s and 1.4s before LIGHTS OUT
        const randomHold = 400 + Math.random() * 1000;
        this.gantryTimer = setTimeout(() => {
          // LIGHTS OUT AND AWAY WE GO!
          this.raceState = 'RACING';
          this.raceStartTime = performance.now();
          this.timing.start();

          if (this.ui.updateGantryBulbs) this.ui.updateGantryBulbs(0);
          this.track.setGantryLights(0);
          if (this.audio) this.audio.playLightsOutTone();

          if (this.ui.broadcastLights) {
            this.ui.broadcastLights({ step: 0, lightsOut: true });
          }

          if (this.ui.showAlert) {
            this.ui.showAlert('LIGHTS OUT AND AWAY WE GO!', 2500, 'alert-flying-lap');
          }
          if (this.ui.setStartLightsVisible) {
            setTimeout(() => this.ui.setStartLightsVisible(false), 800);
          }
          if (this.ui.updateSessionBadge) {
            this.ui.updateSessionBadge('RACE', `LAP 1/${this.raceLapsTotal}`);
          }
        }, randomHold);
      }
    };

    this.gantryTimer = setTimeout(scheduleNextLight, 1200);
  }

  setGuestLights(step, lightsOut) {
    if (lightsOut) {
      this.raceState = 'RACING';
      this.raceStartTime = performance.now();
      this.timing.start();
      if (this.ui.updateGantryBulbs) this.ui.updateGantryBulbs(0);
      this.track.setGantryLights(0);
      if (this.audio) this.audio.playLightsOutTone();
      if (this.ui.showAlert) {
        this.ui.showAlert('LIGHTS OUT AND AWAY WE GO!', 2500, 'alert-flying-lap');
      }
      if (this.ui.setStartLightsVisible) {
        setTimeout(() => this.ui.setStartLightsVisible(false), 800);
      }
      if (this.ui.updateSessionBadge) {
        this.ui.updateSessionBadge('RACE', `LAP 1/${this.raceLapsTotal}`);
      }
    } else {
      this.raceState = 'LIGHTS_COUNTDOWN';
      this.gantryStep = step;
      if (this.ui.setStartLightsVisible) this.ui.setStartLightsVisible(true);
      if (this.ui.updateGantryBulbs) this.ui.updateGantryBulbs(step);
      this.track.setGantryLights(step);
      if (this.audio) this.audio.playStartLightBeep();
    }
  }

  /**
   * Main session tick called in game loop
   */
  update(dt, playerVehicle, playerPos, playerVel) {
    // 1. QUALIFYING LOGIC
    if (this.currentMode === SESSION_TYPES.QUALIFYING) {
      const trackInfo = this.track.getClosestTrackPoint(playerPos.x, playerPos.z);
      const progress = trackInfo.t;

      if (this.qualifyingPhase === 'OUT_LAP') {
        // Arm timing when player crosses the start line from approaching straight
        if (progress > 0.99 || progress < 0.04) {
          this.qualifyingPhase = 'FLYING_LAP';
          this.timing.start();
          if (this.ui.showAlert) {
            this.ui.showAlert('FLYING LAP ACTIVE - MAXIMUM ATTACK!', 2500, 'alert-flying-lap');
          }
          if (this.ui.updateSessionBadge) {
            this.ui.updateSessionBadge('QUALIFYING', 'HOT LAP 1/1');
          }
        }
      }
    }

    // 2. RACE AI GRID DYNAMICS
    if (this.currentMode === SESSION_TYPES.RACE) {
      if (this.raceState === 'RACING' || this.raceState === 'FINISHING') {
if (this.aiGrid) {
            const currentRaceTime = (performance.now() - this.raceStartTime) / 1000;
            this.aiGrid.update(dt, playerPos, playerVel, this.playerRaceLap, currentRaceTime, this.raceLapsTotal, this.audio);

          // Check if an AI leader finished all race laps first
          if (!this.leaderFinished) {
            const winner = this.aiGrid.getRaceWinner(this.raceLapsTotal);
            if (winner) {
              this.leaderFinished = true;
              this.raceWinner = winner;
              this.raceState = 'FINISHING';
              if (this.ui.showAlert) {
                this.ui.showAlert(`CHECKERED FLAG! WINNER: ${winner.name.toUpperCase()} (${winner.team.toUpperCase()})`, 4500, 'alert-flying-lap');
              }
              if (this.audio) this.audio.playSectorChime(true);

              // Allow trailing cars up to 15s to cross the line before closing the race
              this.finishTimeout = setTimeout(() => {
                if (this.raceState !== 'FINISHED') {
                  this.finishRace();
                }
              }, 15000);
            }
          }
        }
      } else if (this.raceState === 'LIGHTS_COUNTDOWN' || this.raceState === 'PRE_START') {
        if (this.aiGrid) {
          this.aiGrid.updateLeaderboard(playerPos, 1);
        }
      }

      // Check Jump Start
      if (this.raceState === 'LIGHTS_COUNTDOWN' && playerVehicle.body.velocity.length() > 2.0 && !this.jumpStart) {
        this.jumpStart = true;
        if (this.ui.showAlert) {
          this.ui.showAlert('JUMP START PENALTY (+5.0s)', 4000, 'alert-wrong-way');
        }
      }
    }
  }

  /**
   * Handle Lap completion event emitted by TimingSystem
   */
  handleLapComplete(lapResult) {
    if (!lapResult.valid) {
      if (this.ui.showAlert) {
        this.ui.showAlert('LAP INVALIDATED - CHECKPOINTS MISSED', 3500, 'alert-wrong-way');
      }
      return;
    }

    // PRACTICE MODE: Unlimited laps with progressive counters
    if (this.currentMode === SESSION_TYPES.PRACTICE) {
      if (this.ui.showAlert) {
        const timeStr = this.timing.constructor.formatTime(lapResult.time);
        const msg = lapResult.isNewBest
          ? `NEW BEST LAP! LAP ${lapResult.lapNumber}: ${timeStr}`
          : `LAP ${lapResult.lapNumber} COMPLETE: ${timeStr}`;
        this.ui.showAlert(msg, 3000, lapResult.isNewBest ? 'alert-new-best' : 'alert-flying-lap');
      }
      if (this.ui.updateSessionBadge) {
        this.ui.updateSessionBadge('PRACTICE', `LAP ${this.timing.currentLap}`);
      }
    }

    // QUALIFYING: 1 hot lap finishes the session
    if (this.currentMode === SESSION_TYPES.QUALIFYING) {
      if (this.qualifyingPhase === 'FLYING_LAP') {
        this.qualifyingPhase = 'FINISHED';
        this.timing.timerRunning = false;

        // Simulate AI times for the 9 opponents based on selected difficulty & sort 10 drivers
        let evalResult = null;
        if (this.aiGrid) {
          evalResult = this.aiGrid.simulateQualifyingTimes(lapResult.time);
        } else {
          evalResult = this.timing.getQualifyingClassification(lapResult.time);
        }
        this.qualifyingResult = evalResult;

        if (this.ui.showQualifyingModal) {
          this.ui.showQualifyingModal(evalResult);
        }
      }
    }

    // RACE MODE: Check laps
    if (this.currentMode === SESSION_TYPES.RACE) {
      this.playerRaceLap++;
      if (this.playerRaceLap > this.raceLapsTotal) {
        // Player completed all laps!
        if (this.finishTimeout) clearTimeout(this.finishTimeout);
        this.finishRace();
      } else {
        if (this.ui.updateSessionBadge) {
          this.ui.updateSessionBadge('RACE', `LAP ${this.playerRaceLap}/${this.raceLapsTotal}`);
        }
        if (this.ui.showAlert) {
          const isFinalLap = this.playerRaceLap === this.raceLapsTotal;
          this.ui.showAlert(isFinalLap ? 'FINAL LAP!' : `LAP ${this.playerRaceLap}/${this.raceLapsTotal}`, 2500, 'alert-flying-lap');
        }
      }
    }
  }

  /**
   * Concludes the Grand Prix Sprint Race and displays full 10-car classification
   */
  finishRace() {
    if (this.raceState === 'FINISHED') return;
    this.raceState = 'FINISHED';
    this.timing.timerRunning = false;
    if (this.finishTimeout) {
      clearTimeout(this.finishTimeout);
      this.finishTimeout = null;
    }

    const playerTotalTime = (performance.now() - this.raceStartTime) / 1000;
    const finalLeaderboard = this.aiGrid
      ? this.aiGrid.getFinalClassification(this.raceLapsTotal, playerTotalTime, this.playerRaceLap)
      : [];
    const playerEntry = finalLeaderboard.find(e => e.isPlayer);
    const playerPos = playerEntry ? playerEntry.pos : 10;
    const playerWon = playerPos === 1;

    if (this.ui.showRaceFinishModal) {
      this.ui.showRaceFinishModal({
        position: playerPos,
        won: playerWon,
        totalTime: playerTotalTime,
        bestLap: this.timing.bestLapTime,
        jumpStart: this.jumpStart,
        leaderboard: finalLeaderboard
      });
    }
  }


  /**
   * Return to menu with broadcast sponsor mock ad trigger
   */
  returnToMenu(targetSession = SESSION_TYPES.PRACTICE, playerVehicle, playerCar) {
    // STRICT AD POLICY: Never show ads in Multiplayer mode!
    if (this.isMultiplayer) {
      this.initSession(targetSession, playerVehicle, playerCar, null, true);
      return;
    }

    if (this.ui.showMockAd) {
      this.ui.showMockAd({
        title: 'BROADCAST REPLAY SPONSOR',
        sponsor: 'PIRELLI',
        subtitle: 'Official Formula 1 Grand Prix Tire Partner',
        buttonText: 'Return to Track',
        duration: 3000,
        onFinish: () => {
          this.initSession(targetSession, playerVehicle, playerCar, null, true);
        }
      });
    } else {
      this.initSession(targetSession, playerVehicle, playerCar, null, true);
    }
  }

  /**
   * Reset all session state variables to clean defaults.
   * Called when switching tracks to prevent stale state from previous session.
   */
  resetSessionState() {
    // Race state
    this.raceState = 'PRE_START';
    this.playerRaceLap = 1;
    this.playerGridPos = 1;
    this.raceStartTime = 0;
    this.jumpStart = false;
    this.leaderFinished = false;
    this.raceWinner = null;
    if (this.finishTimeout) {
      clearTimeout(this.finishTimeout);
      this.finishTimeout = null;
    }

    // Starting Lights timer state
    this.gantryStep = 0;
    if (this.gantryTimer) {
      clearTimeout(this.gantryTimer);
      this.gantryTimer = null;
    }

    // Qualifying state
    this.qualifyingPhase = 'OUT_LAP';
    this.qualifyingResult = null;
  }

  clearAllTimers() {
    if (this.gantryTimer) {
      clearTimeout(this.gantryTimer);
      this.gantryTimer = null;
    }
    if (this.finishTimeout) {
      clearTimeout(this.finishTimeout);
      this.finishTimeout = null;
    }
    if (this.track && typeof this.track.setGantryLights === 'function') {
      this.track.setGantryLights(0);
    }
  }
}
