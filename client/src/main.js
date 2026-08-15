import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { CharacterSelectScene } from './scenes/CharacterSelectScene.js';
import { ArenaSelectScene } from './scenes/ArenaSelectScene.js';
import { ArenaScene } from './scenes/ArenaScene.js';
import { OnlineScene } from './scenes/OnlineScene.js';
import { unlock as unlockAudio } from './audio/SFX.js';

// ---------------------------------------------------------------------------
// ANIMATRIX BATTLE — Game Bootstrap
// Phase 1: Menu -> Character Select -> Arena (movement, jump, gravity)
// ---------------------------------------------------------------------------

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#05070a',
  pixelArt: false,
  antialias: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1400 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, CharacterSelectScene, ArenaSelectScene, ArenaScene, OnlineScene],
};

window.ANIMATRIX = window.ANIMATRIX || {
  // Shared global game-state passed between scenes (selected fighters, etc.)
  selection: {
    player1: null,
    player2: null,
  },
  network: null,
  isHost: false,
};

const game = new Phaser.Game(config);
window.game = game; // exposed for debugging in the browser console

// Browsers require a user gesture before audio can play — unlock on the
// very first click/keypress anywhere in the page.
const unlockOnce = () => {
  unlockAudio();
  window.removeEventListener('pointerdown', unlockOnce);
  window.removeEventListener('keydown', unlockOnce);
};
window.addEventListener('pointerdown', unlockOnce);
window.addEventListener('keydown', unlockOnce);
