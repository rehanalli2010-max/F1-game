import fs from 'fs';

let code = fs.readFileSync('js/session.js', 'utf8');
const header = `/**
 * Formula 1 Session State Controller
 * Manages Practice Mode and 10-Car Grid Race
 * with authentic 5-Red-Lights starting sequence, AI difficulty engine, and broadcast sponsor mock ads.
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const SESSION_TYPES = {
  PRACTICE: 'PRACTICE',
  RACE: 'RACE'
};

export class SessionManager {
  constructor(track, physicsWorld, timingSystem, audioManager, uiCallbacks) {
    this.track = track;
`;

code = code.replace(/^\/\*\*[\s\S]*?this\.physics = physicsWorld;/, header + '    this.physics = physicsWorld;');
fs.writeFileSync('js/session.js', code, 'utf8');
console.log('Fixed header');
