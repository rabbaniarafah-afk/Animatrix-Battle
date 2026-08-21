import { NetworkClient } from '../networking/NetworkClient.js';

export class OnlineScene extends Phaser.Scene {
  constructor() {
    super('OnlineScene');
  }

  init() {
    this.enteredCode = '';
    this.view = 'menu'; // 'menu' | 'creating' | 'joining' | 'waiting'
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(220, 5, 7, 10);
    this.add.rectangle(0, 0, width, height, 0x05070a).setOrigin(0);

    this.add
      .text(width / 2, 70, 'ONLINE BATTLE', { fontFamily: 'Russo One, sans-serif', fontSize: '38px', color: '#f4d232' })
      .setOrigin(0.5);

    if (!window.ANIMATRIX.network) window.ANIMATRIX.network = new NetworkClient();
    this.net = window.ANIMATRIX.network;
    this.net.connect();
    window.ANIMATRIX.selectedArena = 'neon_rooftop'; // keep host/guest on the same stage

    this.body = this.add.container(width / 2, height / 2 + 10);
    this._showMenu();
    this._buildBackButton();
  }

  _clearBody() {
    this.body.removeAll(true);
  }

  // -- Root menu: Create / Join -------------------------------------------
  _showMenu() {
    this.view = 'menu';
    this._clearBody();

    const createBtn = this._makeButton(0, -40, 'CREATE ROOM', () => this._createRoom());
    const joinBtn = this._makeButton(0, 30, 'JOIN ROOM', () => this._showJoin());
    this.body.add([createBtn.bg, createBtn.label, joinBtn.bg, joinBtn.label]);

    this.body.add(
      this.add
        .text(0, 100, 'Play with a friend on the same network by sharing a room code.', {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '14px',
          color: '#8fa3b8',
          align: 'center',
          wordWrap: { width: 440 },
        })
        .setOrigin(0.5)
    );
  }

  _makeButton(x, y, text, onClick) {
    const bg = this.add
      .rectangle(x, y, 280, 52, 0x141a24)
      .setStrokeStyle(2, 0x2c3444)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(x, y, text, { fontFamily: 'Russo One, sans-serif', fontSize: '18px', color: '#e6edf5' })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setStrokeStyle(2, 0xf4d232));
    bg.on('pointerout', () => bg.setStrokeStyle(2, 0x2c3444));
    bg.on('pointerdown', onClick);
    return { bg, label };
  }

  // -- Create room ----------------------------------------------------------
  async _createRoom() {
    this._clearBody();
    this.view = 'creating';
    const status = this.add
      .text(0, -20, 'Creating room…', { fontFamily: 'Rajdhani, sans-serif', fontSize: '18px', color: '#8fa3b8' })
      .setOrigin(0.5);
    this.body.add(status);

    const code = await this.net.createRoom();
    window.ANIMATRIX.isHost = true;
    this._showWaiting(code, 'Share this code with your opponent:');
  }

  // -- Join room: numeric keypad -------------------------------------------
  _showJoin() {
    this.view = 'joining';
    this._clearBody();
    this.enteredCode = '';

    const title = this.add
      .text(0, -160, 'ENTER ROOM CODE', { fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', color: '#8fa3b8', letterSpacing: 3 })
      .setOrigin(0.5);

    this.codeDisplay = this.add
      .text(0, -110, '----', { fontFamily: 'Russo One, sans-serif', fontSize: '40px', color: '#f4d232', letterSpacing: 10 })
      .setOrigin(0.5);

    this.body.add([title, this.codeDisplay]);

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'GO'];
    const cols = 3;
    const btnW = 90;
    const btnH = 56;
    const gap = 14;
    const startX = -((cols - 1) * (btnW + gap)) / 2;
    const startY = -40;

    keys.forEach((k, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gap);
      const y = startY + row * (btnH + gap);

      const bg = this.add
        .rectangle(x, y, btnW, btnH, 0x141a24)
        .setStrokeStyle(2, 0x2c3444)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x, y, k, { fontFamily: 'Russo One, sans-serif', fontSize: '20px', color: k === 'GO' ? '#f4d232' : '#e6edf5' })
        .setOrigin(0.5);

      bg.on('pointerover', () => bg.setStrokeStyle(2, 0xf4d232));
      bg.on('pointerout', () => bg.setStrokeStyle(2, 0x2c3444));
      bg.on('pointerdown', () => this._onKeypadPress(k));

      this.body.add([bg, label]);
    });

    this.joinStatus = this.add
      .text(0, 150, '', { fontFamily: 'Rajdhani, sans-serif', fontSize: '15px', color: '#e23b3b' })
      .setOrigin(0.5);
    this.body.add(this.joinStatus);
  }

  _onKeypadPress(k) {
    if (k === '⌫') {
      this.enteredCode = this.enteredCode.slice(0, -1);
    } else if (k === 'GO') {
      this._attemptJoin();
      return;
    } else if (this.enteredCode.length < 4) {
      this.enteredCode += k;
    }
    const padded = this.enteredCode.padEnd(4, '-');
    this.codeDisplay.setText(padded.split('').join(' '));
  }

  async _attemptJoin() {
    if (this.enteredCode.length !== 4) {
      this.joinStatus.setText('Enter all 4 digits first.');
      return;
    }
    this.joinStatus.setText('Joining…');
    const res = await this.net.joinRoom(this.enteredCode);
    if (!res.success) {
      this.joinStatus.setText(res.reason || 'Could not join that room.');
      return;
    }
    window.ANIMATRIX.isHost = false;
    // A successful join means both sides are already paired — go straight
    // to character select rather than waiting for an event that only the
    // host receives.
    this.scene.start('CharacterSelectScene', { mode: 'online' });
  }

  // -- Waiting for the opponent ---------------------------------------------
  _showWaiting(code, message, skipCodeDisplay = false) {
    this.view = 'waiting';
    this._clearBody();

    if (!skipCodeDisplay) {
      this.body.add(
        this.add
          .text(0, -70, message, { fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', color: '#8fa3b8' })
          .setOrigin(0.5)
      );
      this.body.add(
        this.add
          .text(0, -10, code, { fontFamily: 'Russo One, sans-serif', fontSize: '56px', color: '#f4d232', letterSpacing: 14 })
          .setOrigin(0.5)
      );
    } else {
      this.body.add(
        this.add.text(0, -20, message, { fontFamily: 'Rajdhani, sans-serif', fontSize: '18px', color: '#8fa3b8' }).setOrigin(0.5)
      );
    }

    const spinner = this.add
      .text(0, 70, '●', { fontFamily: 'Rajdhani, sans-serif', fontSize: '22px', color: '#55b8f6' })
      .setOrigin(0.5);
    this.body.add(spinner);
    this.tweens.add({ targets: spinner, alpha: 0.15, duration: 550, yoyo: true, repeat: -1 });

    this.net.on('opponentJoined', () => {
      this.scene.start('CharacterSelectScene', { mode: 'online' });
    });
  }

  _buildBackButton() {
    const back = this.add
      .text(28, 28, '←  MENU', { fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontStyle: '600', color: '#8fa3b8' })
      .setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#f4d232'));
    back.on('pointerout', () => back.setColor('#8fa3b8'));
    back.on('pointerdown', () => {
      if (this.net) this.net.disconnect();
      this.scene.start('MenuScene');
    });
  }
}
