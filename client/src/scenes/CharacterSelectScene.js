import { CHARACTERS } from '../characters/CharacterConfig.js';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectScene');
  }

  init(data) {
    this.mode = data?.mode || 'quick';
    this.playerTurn = data?.playerTurn || 1;
    this.selectedIndex = 0;
    this.waiting = false;
    // Phaser reuses the same Scene instance across scene.start() calls, so
    // stale references from a previous run of this scene must be cleared
    // here — otherwise _select()/_updatePreview() during card setup can
    // touch already-destroyed GameObjects from the last time this scene ran.
    this.previewName = null;
    this.previewDesc = null;
    this.previewAbility = null;
    this.cardObjects = null;
    this.readyBg = null;
    this.readyLabel = null;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(220, 5, 7, 10);

    this.add.rectangle(0, 0, width, height, 0x05070a).setOrigin(0);

    this.add
      .text(width / 2, 56, 'CHARACTER SELECT', {
        fontFamily: 'Russo One, sans-serif',
        fontSize: '40px',
        color: '#f4d232',
      })
      .setOrigin(0.5);

    const subtitle =
      this.mode === 'local' ? `PLAYER ${this.playerTurn}` : this.mode === 'online' ? 'YOUR FIGHTER' : 'PLAYER 1';

    this.add
      .text(width / 2, 96, subtitle, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '18px',
        color: '#8fa3b8',
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    this._buildPreview(width, height);
    this._buildCards(width, height);
    this._buildReadyButton(width, height);
    this._buildBackButton();

    if (this.mode === 'online') this._setupOnlineListeners();
  }

  _buildCards(width, height) {
    const cardW = 190;
    const cardH = 230;
    const gap = 24;
    const totalW = CHARACTERS.length * cardW + (CHARACTERS.length - 1) * gap;
    const startX = width / 2 - totalW / 2 + cardW / 2;
    const y = height / 2 - 20;

    this.cardObjects = [];

    CHARACTERS.forEach((char, i) => {
      const x = startX + i * (cardW + gap);
      const card = this.add.container(x, y);

      const bg = this.add
        .rectangle(0, 0, cardW, cardH, 0x121824, 0.95)
        .setStrokeStyle(3, 0x2c3444)
        .setInteractive({ useHandCursor: true });

      const img = this.add.image(0, -18, char.texture).setScale(char.scale * 0.72);

      const nameText = this.add
        .text(0, cardH / 2 - 30, char.name, {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '15px',
          fontStyle: '700',
          color: '#e6edf5',
          align: 'center',
          wordWrap: { width: cardW - 20 },
        })
        .setOrigin(0.5);

      card.add([bg, img, nameText]);

      bg.on('pointerover', () => {
        if (this.selectedIndex !== i) bg.setStrokeStyle(3, 0x55b8f6);
      });
      bg.on('pointerout', () => {
        if (this.selectedIndex !== i) bg.setStrokeStyle(3, 0x2c3444);
      });
      bg.on('pointerdown', () => {
        if (!this.waiting) this._select(i);
      });

      this.cardObjects.push({ bg, container: card });
    });

    this._select(0);
  }

  _select(index) {
    this.selectedIndex = index;
    this.cardObjects.forEach((c, i) => {
      const isSel = i === index;
      c.bg.setStrokeStyle(3, isSel ? 0xf4d232 : 0x2c3444);
      this.tweens.add({ targets: c.container, scale: isSel ? 1.06 : 1, duration: 140 });
    });
    this._updatePreview();
  }

  _buildPreview(width, height) {
    this.previewName = this.add
      .text(width / 2, height - 154, '', { fontFamily: 'Russo One, sans-serif', fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5);

    this.previewDesc = this.add
      .text(width / 2, height - 126, '', { fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', color: '#8fa3b8' })
      .setOrigin(0.5);

    this.previewAbility = this.add
      .text(width / 2, height - 100, '', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '14px',
        fontStyle: '600',
        color: '#55b8f6',
        align: 'center',
        wordWrap: { width: Math.min(720, width - 120) },
      })
      .setOrigin(0.5);

    this._updatePreview();
  }

  _updatePreview() {
    const char = CHARACTERS[this.selectedIndex];
    if (this.previewName) {
      this.previewName.setText(char.name);
      this.previewDesc.setText(char.description);
      this.previewAbility.setText(`SPECIAL: ${char.specialName}   ·   PASSIVE: ${char.abilityName} — ${char.abilityDesc}`);
    }
  }

  _buildReadyButton(width, height) {
    this.readyBg = this.add
      .rectangle(width / 2, height - 50, 220, 50, 0xf4d232)
      .setInteractive({ useHandCursor: true });

    this.readyLabel = this.add
      .text(width / 2, height - 50, 'READY', { fontFamily: 'Russo One, sans-serif', fontSize: '20px', color: '#0a0e14' })
      .setOrigin(0.5);

    this.readyBg.on('pointerover', () => {
      if (!this.waiting) this.tweens.add({ targets: [this.readyBg, this.readyLabel], scale: 1.05, duration: 100 });
    });
    this.readyBg.on('pointerout', () => {
      if (!this.waiting) this.tweens.add({ targets: [this.readyBg, this.readyLabel], scale: 1, duration: 100 });
    });
    this.readyBg.on('pointerdown', () => this._onReady());
  }

  _onReady() {
    if (this.waiting) return;
    const char = CHARACTERS[this.selectedIndex];

    if (this.mode === 'local' && this.playerTurn === 1) {
      window.ANIMATRIX.selection.player1 = char.id;
      this.scene.start('CharacterSelectScene', { mode: this.mode, playerTurn: 2 });
      return;
    }
    if (this.mode === 'local' && this.playerTurn === 2) {
      window.ANIMATRIX.selection.player2 = char.id;
      this.scene.start('ArenaSelectScene', { mode: this.mode });
      return;
    }
    if (this.mode === 'online') {
      this._confirmOnlineSelection(char.id);
      return;
    }

    window.ANIMATRIX.selection.player1 = char.id;
    this.scene.start('ArenaSelectScene', { mode: this.mode });
  }

  // -- Online-mode selection: pick, then wait for opponent's pick ---------
  _confirmOnlineSelection(charId) {
    const net = window.ANIMATRIX.network;
    if (!net) {
      this.scene.start('MenuScene');
      return;
    }

    this.waiting = true;
    this.readyBg.setFillStyle(0x2c3444);
    this.readyLabel.setText('WAITING...');

    if (window.ANIMATRIX.isHost) window.ANIMATRIX.selection.player1 = charId;
    else window.ANIMATRIX.selection.player2 = charId;

    net.sendCharacterSelect(charId);
    this._myCharSent = true;

    this._waitOverlay = this.add
      .text(this.scale.width / 2, this.scale.height - 170, 'Waiting for opponent to pick their fighter…', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '15px',
        color: '#8fa3b8',
      })
      .setOrigin(0.5);

    this._tryStartOnlineMatch();
  }

  _setupOnlineListeners() {
    const net = window.ANIMATRIX.network;
    if (!net) return;

    net.on('opponentCharacterSelect', (id) => {
      if (window.ANIMATRIX.isHost) window.ANIMATRIX.selection.player2 = id;
      else window.ANIMATRIX.selection.player1 = id;
      this._opponentPicked = true;
      this._tryStartOnlineMatch();
    });

    net.on('matchStart', () => {
      // The host already transitions itself directly in _tryStartOnlineMatch()
      // right after sending this — without this guard, the host would also
      // receive its own broadcast (server relays to the whole room) and
      // start ArenaScene a second time, restarting the intro mid-sequence.
      if (window.ANIMATRIX.isHost) return;
      this.scene.start('ArenaScene', { mode: 'online' });
    });

    net.on('opponentLeft', () => {
      if (this.scene.isActive()) {
        this.scene.start('MenuScene');
      }
    });
  }

  _tryStartOnlineMatch() {
    const ready = window.ANIMATRIX.selection.player1 && window.ANIMATRIX.selection.player2;
    if (!ready) return;
    // Only the host tells the server to broadcast matchStart (avoids a race
    // where both sides try to start independently).
    if (window.ANIMATRIX.isHost) {
      window.ANIMATRIX.network.sendStartMatch();
      this.scene.start('ArenaScene', { mode: 'online' });
    }
  }

  _buildBackButton() {
    const back = this.add
      .text(28, 28, '←  MENU', { fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontStyle: '600', color: '#8fa3b8' })
      .setInteractive({ useHandCursor: true });

    back.on('pointerover', () => back.setColor('#f4d232'));
    back.on('pointerout', () => back.setColor('#8fa3b8'));
    back.on('pointerdown', () => {
      if (window.ANIMATRIX.network) window.ANIMATRIX.network.disconnect();
      this.scene.start('MenuScene');
    });
  }
}
