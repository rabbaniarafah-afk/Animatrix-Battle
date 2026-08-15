const ACCENT_COLORS = [0xfbe64d, 0x55b8f6, 0x911df5, 0xd5ecfb, 0x000000];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;

    this._buildBackground(width, height);
    this._buildTitle(width, height);
    this._buildButtons(width, height);
    this._buildFooter(width, height);
  }

  // -- Background ------------------------------------------------------
  _buildBackground(width, height) {
    const g = this.add.graphics();

    // Vertical gradient wash
    g.fillGradientStyle(0x0d1420, 0x0d1420, 0x05070a, 0x05070a, 1);
    g.fillRect(0, 0, width, height);

    // Distant silhouette skyline (original, generated shapes)
    const hill = this.add.graphics();
    hill.fillStyle(0x121a26, 1);
    hill.beginPath();
    hill.moveTo(0, height * 0.72);
    for (let x = 0; x <= width; x += 40) {
      const y = height * 0.72 + Math.sin(x * 0.01) * 14 + Math.cos(x * 0.004) * 20;
      hill.lineTo(x, y);
    }
    hill.lineTo(width, height);
    hill.lineTo(0, height);
    hill.closePath();
    hill.fillPath();

    // Slow-drifting accent streaks representing the roster's colors
    ACCENT_COLORS.forEach((color, i) => {
      const streak = this.add.rectangle(
        -200 - i * 150,
        120 + i * 110,
        260,
        4,
        color === 0x000000 ? 0x3a3f4a : color,
        0.35
      );
      streak.setAngle(-18);
      this.tweens.add({
        targets: streak,
        x: width + 300,
        duration: 9000 + i * 1400,
        repeat: -1,
        delay: i * 900,
        ease: 'Linear',
      });
    });

    // Ground line
    g.lineStyle(3, 0xf4d232, 0.5);
    g.lineBetween(0, height * 0.86, width, height * 0.86);
  }

  // -- Title -------------------------------------------------------------
  _buildTitle(width, height) {
    const titleY = height * 0.24;

    const glow = this.add
      .text(width / 2, titleY, 'ANIMATRIX BATTLE', {
        fontFamily: 'Russo One, sans-serif',
        fontSize: '76px',
        color: '#f4d232',
      })
      .setOrigin(0.5)
      .setAlpha(0.25)
      .setScale(1.04);

    const title = this.add
      .text(width / 2, titleY, 'ANIMATRIX BATTLE', {
        fontFamily: 'Russo One, sans-serif',
        fontSize: '76px',
        color: '#ffffff',
        stroke: '#f4d232',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: glow,
      alpha: 0.45,
      scale: 1.08,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: title,
      y: titleY - 6,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(width / 2, titleY + 56, 'FIGHT.  ANIMATE.  DOMINATE.', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '20px',
        color: '#8fa3b8',
        letterSpacing: 4,
      })
      .setOrigin(0.5);
  }

  // -- Buttons -------------------------------------------------------------
  _buildButtons(width, height) {
    const items = [
      { label: '⚔️  QUICK BATTLE', action: () => this._goToSelect('quick') },
      { label: '🎯  TRAINING', action: () => this._goToSelect('training') },
      { label: '👥  LOCAL BATTLE', action: () => this._goToSelect('local') },
      { label: '🌐  ONLINE BATTLE', action: () => this.scene.start('OnlineScene') },
      { label: '⚙️  SETTINGS', action: () => this._comingSoon('Settings') },
    ];

    const startY = height * 0.52;
    const spacing = 56;
    const btnWidth = 360;

    items.forEach((item, i) => {
      const y = startY + i * spacing;

      const bg = this.add
        .rectangle(width / 2, y, btnWidth, 44, 0x141a24, 0.9)
        .setStrokeStyle(2, 0x2c3444)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(width / 2, y, item.label, {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '22px',
          fontStyle: '600',
          color: '#e6edf5',
        })
        .setOrigin(0.5);

      bg.on('pointerover', () => {
        bg.setStrokeStyle(2, 0xf4d232);
        bg.setFillStyle(0x1d2430, 0.95);
        label.setColor('#f4d232');
        this.tweens.add({ targets: [bg, label], scaleX: 1.03, scaleY: 1.05, duration: 120 });
      });

      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, 0x2c3444);
        bg.setFillStyle(0x141a24, 0.9);
        label.setColor('#e6edf5');
        this.tweens.add({ targets: [bg, label], scaleX: 1, scaleY: 1, duration: 120 });
      });

      bg.on('pointerdown', item.action);
    });
  }

  _buildFooter(width, height) {
    this.add
      .text(width / 2, height - 24, 'PHASE 1  ·  Local exploration build', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '13px',
        color: '#4a5568',
      })
      .setOrigin(0.5);
  }

  _goToSelect(mode) {
    this.scene.start('CharacterSelectScene', { mode });
  }

  _comingSoon(name) {
    const { width, height } = this.scale;
    const toast = this.add
      .text(width / 2, height - 70, `${name} arrives in a later phase`, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '18px',
        color: '#f4d232',
        backgroundColor: '#141a24',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 1200,
      onComplete: () => toast.destroy(),
    });
  }
}
