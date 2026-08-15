// ---------------------------------------------------------------------------
// MatchHUD — health bars, the pre-match "P1 VS P2 -> 3,2,1,FIGHT!" sequence,
// and the K.O. / winner overlay with a rematch option.
// ---------------------------------------------------------------------------

export class MatchHUD {
  constructor(scene, fighter1, fighter2) {
    this.scene = scene;
    this.f1 = fighter1;
    this.f2 = fighter2;
    this._buildHealthBars();
  }

  _buildHealthBars() {
    const { width } = this.scene.scale;
    const barW = 380;
    const barH = 22;
    const y = 34;
    const enBarH = 8;
    const enY = y + barH / 2 + 8;

    // Player 1 (left side)
    this.p1Container = this.scene.add.container(24, y);
    this.p1BarBg = this.scene.add.rectangle(0, 0, barW, barH, 0x141a24).setOrigin(0, 0.5).setStrokeStyle(2, 0x2c3444);
    this.p1BarFill = this.scene.add.rectangle(2, 0, barW - 4, barH - 4, 0xe23b3b).setOrigin(0, 0.5);
    this.p1Name = this.scene.add
      .text(0, -20, this.f1.config.name, { fontFamily: 'Rajdhani, sans-serif', fontSize: '15px', fontStyle: '700', color: '#e6edf5' })
      .setOrigin(0, 1);
    this.p1EnBg = this.scene.add.rectangle(0, enY, barW, enBarH, 0x141a24).setOrigin(0, 0.5).setStrokeStyle(1, 0x2c3444);
    this.p1EnFill = this.scene.add.rectangle(2, enY, 0, enBarH - 3, 0x55b8f6).setOrigin(0, 0.5);
    this.p1Container.add([this.p1BarBg, this.p1BarFill, this.p1Name, this.p1EnBg, this.p1EnFill]);

    // Player 2 (right side)
    this.p2Container = this.scene.add.container(width - 24 - barW, y);
    this.p2BarBg = this.scene.add.rectangle(0, 0, barW, barH, 0x141a24).setOrigin(0, 0.5).setStrokeStyle(2, 0x2c3444);
    this.p2BarFill = this.scene.add.rectangle(2, 0, barW - 4, barH - 4, 0xe23b3b).setOrigin(0, 0.5);
    this.p2Name = this.scene.add
      .text(barW, -20, this.f2.config.name, { fontFamily: 'Rajdhani, sans-serif', fontSize: '15px', fontStyle: '700', color: '#e6edf5' })
      .setOrigin(1, 1);
    this.p2EnBg = this.scene.add.rectangle(0, enY, barW, enBarH, 0x141a24).setOrigin(0, 0.5).setStrokeStyle(1, 0x2c3444);
    this.p2EnFill = this.scene.add.rectangle(barW - 2, enY, 0, enBarH - 3, 0x55b8f6).setOrigin(1, 0.5);
    this.p2Container.add([this.p2BarBg, this.p2BarFill, this.p2Name, this.p2EnBg, this.p2EnFill]);

    this.scene.add
      .text(width / 2, 30, 'VS', { fontFamily: 'Russo One, sans-serif', fontSize: '22px', color: '#f4d232' })
      .setOrigin(0.5);
  }

  update() {
    const w1 = Math.max(0, (this.f1.health / this.f1.maxHealth) * (380 - 4));
    const w2 = Math.max(0, (this.f2.health / this.f2.maxHealth) * (380 - 4));
    this.p1BarFill.width = w1;
    this.p2BarFill.width = w2;
    this.p2BarFill.x = 380 - 2 - w2; // right-anchored so P2's bar drains toward center

    const colorFor = (ratio) => (ratio > 0.5 ? 0xe23b3b : ratio > 0.22 ? 0xf4a23b : 0xf4d232);
    this.p1BarFill.fillColor = colorFor(this.f1.health / this.f1.maxHealth);
    this.p2BarFill.fillColor = colorFor(this.f2.health / this.f2.maxHealth);

    const ew1 = Math.max(0, (this.f1.energy / this.f1.maxEnergy) * (380 - 4));
    const ew2 = Math.max(0, (this.f2.energy / this.f2.maxEnergy) * (380 - 4));
    this.p1EnFill.width = ew1;
    this.p2EnFill.width = ew2;
    const full1 = this.f1.energy >= this.f1.maxEnergy;
    const full2 = this.f2.energy >= this.f2.maxEnergy;
    this.p1EnFill.fillColor = full1 ? 0xf4d232 : 0x55b8f6;
    this.p2EnFill.fillColor = full2 ? 0xf4d232 : 0x55b8f6;
    this.p1EnBg.setStrokeStyle(1, full1 ? 0xf4d232 : 0x2c3444);
    this.p2EnBg.setStrokeStyle(1, full2 ? 0xf4d232 : 0x2c3444);
  }

  /** Plays P1 VS P2 -> 3,2,1,FIGHT! and calls onDone when input should unlock. */
  playIntro(onDone) {
    const { width, height } = this.scene.scale;
    const scene = this.scene;

    const vsText = scene.add
      .text(width / 2, height / 2 - 40, `${this.f1.config.name}\n\nVS\n\n${this.f2.config.name}`, {
        fontFamily: 'Russo One, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    scene.tweens.add({
      targets: vsText,
      alpha: 1,
      duration: 300,
      hold: 900,
      yoyo: true,
      onComplete: () => {
        vsText.destroy();
        this._playCountdown(onDone);
      },
    });
  }

  _playCountdown(onDone) {
    const { width, height } = this.scene.scale;
    const scene = this.scene;
    const steps = ['3', '2', '1', 'FIGHT!'];
    const text = scene.add
      .text(width / 2, height / 2 - 40, '', { fontFamily: 'Russo One, sans-serif', fontSize: '64px', color: '#f4d232' })
      .setOrigin(0.5)
      .setAlpha(0);

    let i = 0;
    const showNext = () => {
      if (i >= steps.length) {
        text.destroy();
        onDone();
        return;
      }
      text.setText(steps[i]);
      text.setScale(0.6);
      text.setAlpha(1);
      scene.tweens.add({
        targets: text,
        scale: 1,
        alpha: { from: 1, to: 0 },
        duration: 600,
        ease: 'Cubic.easeOut',
        onComplete: showNext,
      });
      i++;
    };
    showNext();
  }

  /** Winner banner with REMATCH / MAIN MENU buttons. */
  showKO(winnerFighter, onRematch, onMenu) {
    const { width, height } = this.scene.scale;
    const scene = this.scene;

    const overlay = scene.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0);
    scene.tweens.add({ targets: overlay, fillAlpha: 0.55, duration: 300 });

    const ko = scene.add
      .text(width / 2, height / 2 - 90, 'K.O.', { fontFamily: 'Russo One, sans-serif', fontSize: '72px', color: '#e23b3b' })
      .setOrigin(0.5)
      .setScale(0.4)
      .setAlpha(0);
    scene.tweens.add({ targets: ko, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut' });

    const winner = scene.add
      .text(width / 2, height / 2 - 20, `${winnerFighter.config.name} WINS!`, {
        fontFamily: 'Russo One, sans-serif',
        fontSize: '30px',
        color: '#f4d232',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    scene.tweens.add({ targets: winner, alpha: 1, duration: 400, delay: 250 });

    const rematchBtn = scene.add
      .rectangle(width / 2 - 110, height / 2 + 60, 190, 46, 0xf4d232)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);
    const rematchLabel = scene.add
      .text(width / 2 - 110, height / 2 + 60, 'REMATCH', { fontFamily: 'Russo One, sans-serif', fontSize: '16px', color: '#0a0e14' })
      .setOrigin(0.5)
      .setAlpha(0);

    const menuBtn = scene.add
      .rectangle(width / 2 + 110, height / 2 + 60, 190, 46, 0x141a24)
      .setStrokeStyle(2, 0x2c3444)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);
    const menuLabel = scene.add
      .text(width / 2 + 110, height / 2 + 60, 'MAIN MENU', { fontFamily: 'Russo One, sans-serif', fontSize: '16px', color: '#e6edf5' })
      .setOrigin(0.5)
      .setAlpha(0);

    scene.tweens.add({
      targets: [rematchBtn, rematchLabel, menuBtn, menuLabel],
      alpha: 1,
      duration: 400,
      delay: 500,
    });

    rematchBtn.on('pointerdown', onRematch);
    menuBtn.on('pointerdown', onMenu);
  }
}
