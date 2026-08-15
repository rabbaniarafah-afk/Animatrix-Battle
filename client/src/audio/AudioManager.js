// ---------------------------------------------------------------------------
// AudioManager (scaffold — wired up fully in Phase 7)
//
// Usage once sounds are added:
//   const audio = new AudioManager(scene);
//   audio.load();               // call from BootScene.preload()
//   audio.play('punch');        // call from combat code
//
// To add your own sounds later: drop files into client/assets/audio/ and
// add an entry to the `SOUND_KEYS` map below — no other code changes needed.
// ---------------------------------------------------------------------------

const SOUND_KEYS = {
  punch: 'assets/audio/punch.mp3',
  kick: 'assets/audio/kick.mp3',
  hit: 'assets/audio/hit.mp3',
  dash: 'assets/audio/dash.mp3',
  jump: 'assets/audio/jump.mp3',
  land: 'assets/audio/land.mp3',
  menuSelect: 'assets/audio/menu_select.mp3',
  victory: 'assets/audio/victory.mp3',
  music: 'assets/audio/bgm.mp3',
};

export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false; // flips true once real audio files exist in assets/audio/
  }

  load() {
    if (!this.enabled) return;
    for (const [key, path] of Object.entries(SOUND_KEYS)) {
      this.scene.load.audio(key, path);
    }
  }

  play(key, config = {}) {
    if (!this.enabled) return;
    this.scene.sound.play(key, config);
  }
}
