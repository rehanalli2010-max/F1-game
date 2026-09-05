import fs from 'fs';

let code = fs.readFileSync('js/session.js', 'utf8');

// 1. Comment & SESSION_TYPES
code = code.replace(
  ` * Manages Practice Mode, One-Shot Flying Lap Qualifying, and 10-Car Grid Sprint Race`,
  ` * Manages Practice Mode and 10-Car Grid Race`
);

code = code.replace(
`export const SESSION_TYPES = {
  PRACTICE: 'PRACTICE',
  QUALIFYING: 'QUALIFYING',
  RACE: 'RACE'
};`,
`export const SESSION_TYPES = {
  PRACTICE: 'PRACTICE',
  RACE: 'RACE'
};`
);

// 2. In constructor, remove qualifying state
code = code.replace(
`    // Qualifying state
    this.qualifyingPhase = 'OUT_LAP'; // 'OUT_LAP' -> 'FLYING_LAP' -> 'FINISHED'
    this.qualifyingResult = null;`,
``
);

// 3. In executeSessionInit, remove qualifying branch
code = code.replace(
`    if (mode === SESSION_TYPES.PRACTICE) {
      this.startPracticeSession(playerVehicle, playerCar);
    } else if (mode === SESSION_TYPES.QUALIFYING) {
      this.startQualifyingSession(playerVehicle, playerCar);
    } else if (mode === SESSION_TYPES.RACE) {
      this.startRaceSession(playerVehicle, playerCar, qualifiedGrid);
    }`,
`    if (mode === SESSION_TYPES.PRACTICE) {
      this.startPracticeSession(playerVehicle, playerCar);
    } else if (mode === SESSION_TYPES.RACE) {
      this.startRaceSession(playerVehicle, playerCar, qualifiedGrid);
    }`
);

// 4. Remove startQualifyingSession method and update race comment
const qualiMethodRegex = /\/\* -+[\r\n\s]+2\. ONE-SHOT QUALIFYING MODE[\s\S]*?startQualifyingSession[\s\S]*?\}\r?\n\r?\n\s*\/\* -+[\r\n\s]+3\. SPRINT RACE MODE/;

code = code.replace(
  qualiMethodRegex,
  `/* --------------------------------------------------------------------------\n     2. RACE MODE`
);

// 5. In update(), remove qualifying block
const qualiUpdateRegex = /\s*\/\/ 1\. QUALIFYING LOGIC[\s\S]*?\}\r?\n\s*\}\r?\n\r?\n\s*\/\/ 2\. RACE AI GRID DYNAMICS/;
code = code.replace(
  qualiUpdateRegex,
  `\n    // RACE AI GRID DYNAMICS`
);

// 6. In handleLapComplete(), remove qualifying block
const qualiLapRegex = /\s*\/\/ QUALIFYING: 1 hot lap finishes the session[\s\S]*?\}\r?\n\s*\}\r?\n\r?\n\s*\/\/ RACE MODE: Check laps/;
code = code.replace(
  qualiLapRegex,
  `\n    // RACE MODE: Check laps`
);

// 7. In finishRace comment:
code = code.replace('Concludes the Grand Prix Sprint Race', 'Concludes the Grand Prix Race');

// 8. In resetSessionState(), remove qualifying state
code = code.replace(
`    // Qualifying state
    this.qualifyingPhase = 'OUT_LAP';
    this.qualifyingResult = null;`,
``
);

fs.writeFileSync('js/session.js', code, 'utf8');
console.log('Successfully cleaned js/session.js');
