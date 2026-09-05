import fs from 'fs';

let content = fs.readFileSync('js/i18n.js', 'utf8');
content = content.replace(/quali_btn_race: 'Inizia Gara Sprint'/g, "quali_btn_race: 'Inizia Gara'");
content = content.replace(/quali_btn_race: 'Start Sprint Race'/g, "quali_btn_race: 'Start Race'");
content = content.replace(/quali_btn_race: 'Iniciar Carrera Sprint'/g, "quali_btn_race: 'Iniciar Carrera'");
content = content.replace(/quali_btn_race: 'Démarrer la Course Sprint'/g, "quali_btn_race: 'Démarrer la Course'");
content = content.replace(/quali_btn_race: 'Sprint-Rennen starten'/g, "quali_btn_race: 'Rennen starten'");
content = content.replace(/quali_btn_race: 'スプリントレース開始'/g, "quali_btn_race: 'レース開始'");
content = content.replace(/quali_btn_race: 'Iniciar Corrida Sprint'/g, "quali_btn_race: 'Iniciar Corrida'");

fs.writeFileSync('js/i18n.js', content, 'utf8');
console.log('Successfully updated quali_btn_race in js/i18n.js');
