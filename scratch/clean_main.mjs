import fs from 'fs';

let code = fs.readFileSync('js/main.js', 'utf8');

// 1. Remove showQualifyingModal from uiCallbacks
code = code.replace(
  /\s*showQualifyingModal:\s*\(result\)\s*=>\s*this\.showQualifyingModal\(result\),/,
  ''
);

// 2. Remove qualiBtn and clean up raceBtn
const sessionBtnsRegex = /const qualiBtn = document\.getElementById\('btn-mode-qualifying'\);\r?\n\s*const raceBtn = document\.getElementById\('btn-mode-race'\);\r?\n\s*if \(practiceBtn\) practiceBtn\.addEventListener\('click', \(\) => this\.session\.initSession\(SESSION_TYPES\.PRACTICE, this\.playerVehicle, this\.playerCar\)\);\r?\n\s*if \(qualiBtn\) qualiBtn\.addEventListener\('click', \(\) => this\.session\.initSession\(SESSION_TYPES\.QUALIFYING, this\.playerVehicle, this\.playerCar\)\);\r?\n\s*if \(raceBtn\) \{\r?\n\s*raceBtn\.addEventListener\('click', \(\) => \{\r?\n\s*const qualifiedGrid = this\.session\.qualifyingResult \? this\.session\.qualifyingResult\.gridOrder : null;\r?\n\s*this\.session\.initSession\(SESSION_TYPES\.RACE, this\.playerVehicle, this\.playerCar, qualifiedGrid\);\r?\n\s*\}\);\r?\n\s*\}/;

const sessionBtnsReplacement = `const raceBtn = document.getElementById('btn-mode-race');

    if (practiceBtn) practiceBtn.addEventListener('click', () => this.session.initSession(SESSION_TYPES.PRACTICE, this.playerVehicle, this.playerCar));
    if (raceBtn) {
      raceBtn.addEventListener('click', () => {
        this.session.initSession(SESSION_TYPES.RACE, this.playerVehicle, this.playerCar);
      });
    }`;

if (!sessionBtnsRegex.test(code)) {
  console.error('Failed to match sessionBtnsRegex');
} else {
  code = code.replace(sessionBtnsRegex, sessionBtnsReplacement);
}

// 3. Remove qRetry, qRace, and simplify raceAgain
const qModalBtnsRegex = /const qRetry = document\.getElementById\('btn-quali-retry'\);\r?\n\s*if \(qRetry\) qRetry\.addEventListener\('click', \(\) => \{\r?\n\s*this\.closeModals\(\);\r?\n\s*this\.session\.initSession\(SESSION_TYPES\.QUALIFYING, this\.playerVehicle, this\.playerCar\);\r?\n\s*\}\);\r?\n\r?\n\s*const qRace = document\.getElementById\('btn-quali-race'\);\r?\n\s*if \(qRace\) qRace\.addEventListener\('click', \(\) => \{\r?\n\s*this\.closeModals\(\);\r?\n\s*const qualifiedGrid = this\.session\.qualifyingResult \? this\.session\.qualifyingResult\.gridOrder : null;\r?\n\s*this\.session\.initSession\(SESSION_TYPES\.RACE, this\.playerVehicle, this\.playerCar, qualifiedGrid\);\r?\n\s*\}\);\r?\n\r?\n\s*const raceAgain = document\.getElementById\('btn-race-again'\);\r?\n\s*if \(raceAgain\) raceAgain\.addEventListener\('click', \(\) => \{\r?\n\s*this\.closeModals\(\);\r?\n\s*const qualifiedGrid = this\.session\.qualifyingResult \? this\.session\.qualifyingResult\.gridOrder : null;\r?\n\s*this\.session\.initSession\(SESSION_TYPES\.RACE, this\.playerVehicle, this\.playerCar, qualifiedGrid\);\r?\n\s*\}\);/;

const qModalBtnsReplacement = `const raceAgain = document.getElementById('btn-race-again');
    if (raceAgain) raceAgain.addEventListener('click', () => {
      this.closeModals();
      this.session.initSession(SESSION_TYPES.RACE, this.playerVehicle, this.playerCar);
    });`;

if (!qModalBtnsRegex.test(code)) {
  console.error('Failed to match qModalBtnsRegex');
} else {
  code = code.replace(qModalBtnsRegex, qModalBtnsReplacement);
}

// 4. Update HUD playerPosEl and lapCounterEl
const hudPlayerPosRegex = /if \(this\.session\.currentMode === SESSION_TYPES\.RACE\) \{\r?\n\s*const livePos = this\.aiGrid \? this\.aiGrid\.getPlayerLivePosition\(\) : 1;\r?\n\s*playerPosEl\.style\.display = 'inline-block';\r?\n\s*playerPosEl\.textContent = `P\$\{livePos\} \/ 10`;\r?\n\s*\} else if \(this\.session\.currentMode === SESSION_TYPES\.QUALIFYING\) \{\r?\n\s*playerPosEl\.style\.display = 'inline-block';\r?\n\s*playerPosEl\.textContent = this\.session\.qualifyingPhase === 'FLYING_LAP' \? 'HOT LAP' : 'OUT LAP';\r?\n\s*\} else \{\r?\n\s*playerPosEl\.style\.display = 'none';\r?\n\s*\}/;

const hudPlayerPosReplacement = `if (this.session.currentMode === SESSION_TYPES.RACE) {
        const livePos = this.aiGrid ? this.aiGrid.getPlayerLivePosition() : 1;
        playerPosEl.style.display = 'inline-block';
        playerPosEl.textContent = \`P\${livePos} / 10\`;
      } else {
        playerPosEl.style.display = 'none';
      }`;

if (!hudPlayerPosRegex.test(code)) {
  console.error('Failed to match hudPlayerPosRegex');
} else {
  code = code.replace(hudPlayerPosRegex, hudPlayerPosReplacement);
}

const hudLapCounterRegex = /if \(this\.session\.currentMode === SESSION_TYPES\.PRACTICE\) \{\r?\n\s*lapCounterEl\.textContent = `LAP \$\{this\.timing\.currentLap\}`;\r?\n\s*\} else if \(this\.session\.currentMode === SESSION_TYPES\.QUALIFYING\) \{\r?\n[\s\S]*?\} else if \(this\.session\.currentMode === SESSION_TYPES\.RACE\) \{/;

const hudLapCounterReplacement = `if (this.session.currentMode === SESSION_TYPES.PRACTICE) {
        lapCounterEl.textContent = \`LAP \${this.timing.currentLap}\`;
      } else if (this.session.currentMode === SESSION_TYPES.RACE) {`;

if (!hudLapCounterRegex.test(code)) {
  console.error('Failed to match hudLapCounterRegex');
} else {
  code = code.replace(hudLapCounterRegex, hudLapCounterReplacement);
}

// 5. Update updateSessionBadge
const badgeQualiRegex = /\s*\} else if \(mode === 'QUALIFYING' && \(status === 'OUT-LAP APPROACH' \|\| status === 'OUT-LAP'\)\) \{\r?\n\s*display = this\.i18n\.t\('badge_quali_outlap'\);\r?\n\s*\} else if \(mode === 'QUALIFYING' && status\.includes\('HOT LAP'\)\) \{\r?\n\s*display = this\.i18n\.t\('badge_quali_hotlap'\);/;

if (!badgeQualiRegex.test(code)) {
  console.error('Failed to match badgeQualiRegex');
} else {
  code = code.replace(badgeQualiRegex, '');
}

// 6. Update onSessionChanged
const onSessionChangedRegex = /\} else if \(mode === SESSION_TYPES\.QUALIFYING\) \{\r?\n\s*const btn = document\.getElementById\('btn-mode-qualifying'\);\r?\n\s*if \(btn\) btn\.classList\.add\('active'\);\r?\n\s*\}/;

if (!onSessionChangedRegex.test(code)) {
  console.error('Failed to match onSessionChangedRegex');
} else {
  code = code.replace(onSessionChangedRegex, '');
}

// 7. Remove showQualifyingModal method
const showQualiModalMethodRegex = /\s*showQualifyingModal\(result\) \{\r?\n[\s\S]*?modal\.classList\.add\('active'\);\r?\n\s*\}\r?\n/;

if (!showQualiModalMethodRegex.test(code)) {
  console.error('Failed to match showQualiModalMethodRegex');
} else {
  code = code.replace(showQualiModalMethodRegex, '\n');
}

// 8. Remove this.network.onQualiResults
const onQualiResultsRegex = /\s*this\.network\.onQualiResults = \(packet\) => \{\r?\n\s*this\.showQualifyingModal\(packet\.result\);\r?\n\s*\};\r?\n/;

if (!onQualiResultsRegex.test(code)) {
  console.error('Failed to match onQualiResultsRegex');
} else {
  code = code.replace(onQualiResultsRegex, '\n');
}

// 9. Update onGuestInitGame
const guestInitQualiRegex = /\s*\} else if \(packet\.mode === SESSION_TYPES\.QUALIFYING\) \{\r?\n\s*this\.session\.startQualifyingSession\(this\.playerVehicle, this\.playerCar\);/;

if (!guestInitQualiRegex.test(code)) {
  console.error('Failed to match guestInitQualiRegex');
} else {
  code = code.replace(guestInitQualiRegex, '');
}

fs.writeFileSync('js/main.js', code, 'utf8');
console.log('Successfully updated js/main.js');
