import fs from 'fs';

let code = fs.readFileSync('js/main.js', 'utf8');

// Replace using regex that accepts \r?\n
const regex = /banner\.className = 'center-alert-banner';\r?\n\s*\}\r?\n\s*if \(visible\) gantry\.classList\.remove\('hidden'\);\r?\n\s*else gantry\.classList\.add\('hidden'\);\r?\n\s*\}/;

const replacement = `banner.className = 'center-alert-banner';
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
    }`;

if (!regex.test(code)) {
  console.error('Regex did not match!');
} else {
  code = code.replace(regex, replacement);
  fs.writeFileSync('js/main.js', code, 'utf8');
  console.log('Regex matched and replaced successfully!');
}
