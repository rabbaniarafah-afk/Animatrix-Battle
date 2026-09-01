import { NetworkClient } from '../networking/NetworkClient.js';

const TEAM_SLOTS = ['A0', 'A1', 'B0', 'B1'];

export class OnlineScene extends Phaser.Scene {
  constructor() {
    super('OnlineScene');
  }

  init() {
    this.enteredCode = '';
    this.roomMode = '1v1'; // '1v1' | '2v2' — chosen on the root menu
    this.mySlot = null; // e.g. 'A0' — only set in 2v2
    this.view = 'menu'; // 'menu' | 'creating' | 'joining' | 'waiting' | 'lobby2v2'
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
    window.ANIMATRIX.selectedArena = 'neon_rooftop'; // keep everyone on the same stage

    this.body = this.add.container(width / 2, height / 2 + 10);
    this._showMenu();
    this._buildBackButton();
  }

  _clearBody() {
    this.body.removeAll(true);
  }

  // -- Root menu: mode toggle + Create / Join ------------------------------
  _showMenu() {
    this.view = 'menu';
    this._clearBody();

    const modeLabel = this.add
      .text(0, -140, 'MATCH TYPE', { fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', color: '#8fa3b8', letterSpacing: 3 })
      .setOrigin(0.5);

    const oneVOneBtn = this._makeToggle(-75, -100, '1v1', this.roomMode === '1v1', () => {
      this.roomMode = '1v1';
      this._showMenu();
    });
    const twoVTwoBtn = this._makeToggle(75, -100, '2v2', this.roomMode === '2v2', () => {
      this.roomMode = '2v2';
      this._showMenu();
    });

    const createBtn = this._makeButton(0, -30, 'CREATE ROOM', () => this._createRoom());
    const joinBtn = this._makeButton(0, 40, 'JOIN ROOM', () => this._showJoin());
    this.body.add([modeLabel, oneVOneBtn.bg, oneVOneBtn.label, twoVTwoBtn.bg, twoVTwoBtn.label, createBtn.bg, createBtn.label, joinBtn.bg, joinBtn.label]);

    const hint =
      this.roomMode === '2v2'
        ? '2v2 is in early access: up to 4 friends can create/join a team lobby together right now. Full 2v2 combat is coming in a follow-up update.'
        : 'Play with a friend on the same network by sharing a room code.';

    this.body.add(
      this.add
        .text(0, 110, hint, {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '13px',
          color: '#8fa3b8',
          align: 'center',
          wordWrap: { width: 460 },
        })
        .setOrigin(0.5)
    );
  }

  _makeToggle(x, y, text, active, onClick) {
    const bg = this.add
      .rectangle(x, y, 130, 40, active ? 0x1d2430 : 0x141a24)
      .setStrokeStyle(2, active ? 0xf4d232 : 0x2c3444)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(x, y, text, { fontFamily: 'Russo One, sans-serif', fontSize: '15px', color: active ? '#f4d232' : '#8fa3b8' })
      .setOrigin(0.5);
    bg.on('pointerdown', onClick);
    return { bg, label };
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

    const { code, mode } = await this.net.createRoom(this.roomMode);
    window.ANIMATRIX.isHost = true;

    if (mode === '2v2') {
      this.mySlot = 'A0'; // the creator always takes the first slot
      this._showTeamLobby(code);
    } else {
      this._showWaiting(code, 'Share this code with your opponent:');
    }
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

    if (res.mode === '2v2') {
      this.mySlot = `${res.team}${res.slot}`;
      this._showTeamLobby(this.enteredCode);
      return;
    }

    // 1v1 — a successful join means both sides are already paired, go
    // straight to character select rather than waiting for an event that
    // only the host receives.
    this.scene.start('CharacterSelectScene', { mode: 'online' });
  }

  // -- Waiting for the opponent (1v1) ---------------------------------------
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

  // -- Team Lobby (2v2) -------------------------------------------------------
  _showTeamLobby(code) {
    this.view = 'lobby2v2';
    this._clearBody();

    this.body.add(
      this.add
        .text(0, -190, 'ROOM CODE', { fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', color: '#8fa3b8', letterSpacing: 3 })
        .setOrigin(0.5)
    );
    this.body.add(
      this.add
        .text(0, -160, code, { fontFamily: 'Russo One, sans-serif', fontSize: '36px', color: '#f4d232', letterSpacing: 10 })
        .setOrigin(0.5)
    );

    this.body.add(
      this.add.text(-150, -95, 'TEAM A', { fontFamily: 'Russo One, sans-serif', fontSize: '18px', color: '#55b8f6' }).setOrigin(0.5)
    );
    this.body.add(
      this.add.text(150, -95, 'TEAM B', { fontFamily: 'Russo One, sans-serif', fontSize: '18px', color: '#e23b3b' }).setOrigin(0.5)
    );

    this.slotTexts = {};
    const positions = { A0: [-150, -50], A1: [-150, 10], B0: [150, -50], B1: [150, 10] };
    TEAM_SLOTS.forEach((slot) => {
      const [x, y] = positions[slot];
      const bg = this.add.rectangle(x, y, 180, 44, 0x141a24, 0.9).setStrokeStyle(2, 0x2c3444);
      const txt = this.add
        .text(x, y, 'EMPTY', { fontFamily: 'Rajdhani, sans-serif', fontSize: '15px', fontStyle: '700', color: '#4a5568' })
        .setOrigin(0.5);
      this.body.add([bg, txt]);
      this.slotTexts[slot] = { bg, txt };
    });

    this.lobbyStatus = this.add
      .text(0, 75, 'Waiting for players…', { fontFamily: 'Rajdhani, sans-serif', fontSize: '15px', color: '#8fa3b8' })
      .setOrigin(0.5);
    this.body.add(this.lobbyStatus);

    this.body.add(
      this.add
        .text(0, 105, 'Share the room code above — up to 3 friends can join this lobby.', {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '12px',
          color: '#5a6578',
          align: 'center',
          wordWrap: { width: 420 },
        })
        .setOrigin(0.5)
    );

    // Reflect ourselves immediately without waiting for a round-trip.
    this._renderLobbySlots({ [this.mySlot]: true });

    this.net.on('lobbyUpdate', (snapshot) => this._renderLobbySlots(snapshot.slots, true));
    this.net.on('opponentLeft', () => this._renderLobbyDisconnectNotice());
  }

  _renderLobbySlots(slots, fromServer = false) {
    let filled = 0;
    TEAM_SLOTS.forEach((slot) => {
      const occupied = fromServer ? !!slots[slot] : slot === this.mySlot ? true : !!slots[slot];
      if (occupied) filled += 1;
      const isMe = slot === this.mySlot;
      const { bg, txt } = this.slotTexts[slot];
      if (isMe) {
        txt.setText('YOU');
        txt.setColor('#f4d232');
        bg.setStrokeStyle(2, 0xf4d232);
      } else if (occupied) {
        txt.setText('PLAYER JOINED');
        txt.setColor('#8fe6a8');
        bg.setStrokeStyle(2, 0x3fae5c);
      } else {
        txt.setText('EMPTY');
        txt.setColor('#4a5568');
        bg.setStrokeStyle(2, 0x2c3444);
      }
    });

    if (filled >= 4) {
      this.lobbyStatus.setText('✅ Lobby full! 2v2 combat is coming in a follow-up update — for now, this confirms the room works end-to-end.');
      this.lobbyStatus.setColor('#8fe6a8');
    } else {
      this.lobbyStatus.setText(`Waiting for players… (${filled}/4)`);
      this.lobbyStatus.setColor('#8fa3b8');
    }
  }

  _renderLobbyDisconnectNotice() {
    if (this.lobbyStatus) {
      this.lobbyStatus.setText('A player disconnected from the lobby.');
      this.lobbyStatus.setColor('#e08080');
    }
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
