import { ARENAS } from '../arenas/ArenaRegistry.js';

export class ArenaSelectScene extends Phaser.Scene {
  constructor() {
    super('ArenaSelectScene');
  }

  init(data) {
    this.mode = data?.mode || 'quick';
    this.selectedIndex = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x05070a).setOrigin(0);

    this.add
      .text(width / 2, 60, 'CHOOSE YOUR ARENA', { fontFamily: 'Russo One, sans-serif', fontSize: '38px', color: '#f4d232' })
      .setOrigin(0.5);

    this._buildCards(width, height);
    this._buildStartButton(width, height);
    this._buildBackButton();
  }

  _buildCards(width, height) {
    const cardW = 320;
    const cardH = 300;
    const gap = 36;
    const totalW = ARENAS.length * cardW + (ARENAS.length - 1) * gap;
    const startX = width / 2 - totalW / 2 + cardW / 2;
    const y = height / 2 - 10;

    this.cardObjects = [];

    ARENAS.forEach((arena, i) => {
      const x = startX + i * (cardW + gap);
      const card = this.add.container(x, y);

      const bg = this.add
        .rectangle(0, 0, cardW, cardH, 0x121824, 0.95)
        .setStrokeStyle(3, 0x2c3444)
        .setInteractive({ useHandCursor: true });

      const swatch = this.add.rectangle(0, -60, cardW - 24, 150, arena.previewColor, 0.85).setStrokeStyle(2, 0x000000, 0.3);
      const groundStrip = this.add.rectangle(0, 22, cardW - 24, 16, 0xf4d232, 0.8);

      const nameText = this.add
        .text(0, 70, arena.name, { fontFamily: 'Russo One, sans-serif', fontSize: '18px', color: '#ffffff' })
        .setOrigin(0.5);
      const descText = this.add
        .text(0, 100, arena.description, {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '13px',
          color: '#8fa3b8',
          align: 'center',
          wordWrap: { width: cardW - 30 },
        })
        .setOrigin(0.5);

      card.add([bg, swatch, groundStrip, nameText, descText]);

      bg.on('pointerover', () => {
        if (this.selectedIndex !== i) bg.setStrokeStyle(3, 0x55b8f6);
      });
      bg.on('pointerout', () => {
        if (this.selectedIndex !== i) bg.setStrokeStyle(3, 0x2c3444);
      });
      bg.on('pointerdown', () => this._select(i));

      this.cardObjects.push({ bg, container: card });
    });

    this._select(0);
  }

  _select(index) {
    this.selectedIndex = index;
    this.cardObjects.forEach((c, i) => {
      const isSel = i === index;
      c.bg.setStrokeStyle(3, isSel ? 0xf4d232 : 0x2c3444);
      this.tweens.add({ targets: c.container, scale: isSel ? 1.05 : 1, duration: 140 });
    });
  }

  _buildStartButton(width, height) {
    const bg = this.add.rectangle(width / 2, height - 46, 220, 50, 0xf4d232).setInteractive({ useHandCursor: true });
    const label = this.add
      .text(width / 2, height - 46, 'START MATCH', { fontFamily: 'Russo One, sans-serif', fontSize: '17px', color: '#0a0e14' })
      .setOrigin(0.5);

    bg.on('pointerover', () => this.tweens.add({ targets: [bg, label], scale: 1.05, duration: 100 }));
    bg.on('pointerout', () => this.tweens.add({ targets: [bg, label], scale: 1, duration: 100 }));
    bg.on('pointerdown', () => {
      window.ANIMATRIX.selectedArena = ARENAS[this.selectedIndex].id;
      this.scene.start('ArenaScene', { mode: this.mode });
    });
  }

  _buildBackButton() {
    const back = this.add
      .text(28, 28, '←  BACK', { fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontStyle: '600', color: '#8fa3b8' })
      .setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#f4d232'));
    back.on('pointerout', () => back.setColor('#8fa3b8'));
    back.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
