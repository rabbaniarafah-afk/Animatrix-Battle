import { CHARACTERS } from '../characters/CharacterConfig.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this._drawLoadingBar();

    for (const char of CHARACTERS) {
      this.load.image(char.texture, char.path);
      this.load.image(char.headTexture, char.headPath);
    }
  }

  create() {
    this.scene.start('MenuScene');
  }

  _drawLoadingBar() {
    const { width, height } = this.scale;
    const box = this.add.graphics();
    const bar = this.add.graphics();

    box.fillStyle(0x1a1f28, 1);
    box.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    const label = this.add
      .text(width / 2, height / 2 - 40, 'LOADING ANIMATRIX BATTLE', {
        fontFamily: 'Russo One, sans-serif',
        fontSize: '18px',
        color: '#f4d232',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(0xf4d232, 1);
      bar.fillRect(width / 2 - 150, height / 2 - 10, 300 * value, 20);
    });

    this.load.on('complete', () => {
      bar.destroy();
      box.destroy();
      label.destroy();
    });
  }
}
