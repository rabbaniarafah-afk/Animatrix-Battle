import { setVolume, getVolume, setMuted, getMuted, playPunch } from '../audio/SFX.js';

// ---------------------------------------------------------------------------
// SettingsScene — reachable from the Main Menu's SETTINGS button.
// Lets the player adjust master volume, mute, toggle fullscreen, and view
// a reference of every control scheme. Volume/mute persist across sessions
// via localStorage (see SFX.js); fullscreen is a live per-session toggle,
// since browsers require a fresh user gesture each session to allow it.
// ---------------------------------------------------------------------------
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  init(data) {
    this.returnTo = data?.returnTo || 'MenuScene';
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(220, 5, 7, 10);

    const g = this.add.graphics();
    g.fillGradientStyle(0x0d1420, 0x0d1420, 0x05070a, 0x05070a, 1);
    g.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, height * 0.1, 'SETTINGS', {
        fontFamily: 'Russo One, sans-serif',
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#f4d232',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this._buildAudioSection(width, height * 0.26);
    this._buildDisplaySection(width, height * 0.44);
    this._buildControlsSection(width, height * 0.56);
    this._buildBackButton(width, height * 0.92);
  }

  // -- Section helpers ---------------------------------------------------

  _sectionLabel(width, y, text) {
    this.add
      .text(width / 2, y, text, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '16px',
        fontStyle: '700',
        color: '#f4d232',
        letterSpacing: 3,
      })
      .setOrigin(0.5);
  }

  _pillButton(x, y, label, onClick, w = 44) {
    const bg = this.add
      .rectangle(x, y, w, 40, 0x141a24, 0.9)
      .setStrokeStyle(2, 0x2c3444)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(x, y, label, { fontFamily: 'Rajdhani, sans-serif', fontSize: '20px', fontStyle: '700', color: '#e6edf5' })
      .setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, 0xf4d232);
      txt.setColor('#f4d232');
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(2, 0x2c3444);
      txt.setColor('#e6edf5');
    });
    bg.on('pointerdown', onClick);

    return { bg, txt };
  }

  _buildAudioSection(width, y) {
    this._sectionLabel(width, y - 46, 'AUDIO');

    const volumeLabel = this.add
      .text(width / 2 - 220, y, 'MASTER VOLUME', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '18px',
        fontStyle: '600',
        color: '#e6edf5',
      })
      .setOrigin(0, 0.5);

    const volumeValue = this.add
      .text(width / 2 + 70, y, '', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '18px',
        fontStyle: '700',
        color: '#8fa3b8',
      })
      .setOrigin(0.5);

    const refreshVolumeText = () => {
      volumeValue.setText(getMuted() ? 'MUTED' : `${Math.round(getVolume() * 100)}%`);
    };
    refreshVolumeText();

    this._pillButton(width / 2 + 30, y, '−', () => {
      setVolume(getVolume() - 0.1);
      refreshVolumeText();
      if (!getMuted()) playPunch();
    });
    this._pillButton(width / 2 + 130, y, '+', () => {
      setVolume(getVolume() + 0.1);
      refreshVolumeText();
      if (!getMuted()) playPunch();
    });

    const muteBtn = this._pillButton(
      width / 2 + 230,
      y,
      getMuted() ? 'UNMUTE' : 'MUTE',
      () => {
        setMuted(!getMuted());
        muteBtn.txt.setText(getMuted() ? 'UNMUTE' : 'MUTE');
        refreshVolumeText();
        if (!getMuted()) playPunch();
      },
      110
    );

    void volumeLabel; // referenced only for layout clarity
  }

  _buildDisplaySection(width, y) {
    this._sectionLabel(width, y - 30, 'DISPLAY');

    const isFull = () => this.scale.isFullscreen;
    const fsBtn = this._pillButton(
      width / 2,
      y + 20,
      isFull() ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN',
      () => {
        this.scale.toggleFullscreen();
        // isFullscreen flips asynchronously in some browsers — re-check shortly after.
        this.time.delayedCall(60, () => fsBtn.txt.setText(isFull() ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN'));
      },
      220
    );
  }

  _buildControlsSection(width, y) {
    this._sectionLabel(width, y - 10, 'CONTROLS REFERENCE');

    const p1 =
      'PLAYER 1\nMove: A / D    Jump: W (double)    Crouch: S    Run: SHIFT    Block: B    Dash: SPACE\n' +
      'Punch / Heavy / Kick: J / K / L    Dash Attack: U    Special: I    Ultimate (low HP): O    Power Blast: P';

    const p2 =
      "PLAYER 2 (Local Battle)\nMove: ← / →    Jump: ↑ (double)    Crouch: ↓    Run: /    Block: '    Dash: .\n" +
      'Punch / Heavy / Kick: 1 / 2 / 3    Dash Attack: 4    Special: 0    Ultimate (low HP): 9    Power Blast: 5';

    const style = {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '15px',
      color: '#b8c4d4',
      align: 'center',
      lineSpacing: 6,
    };

    this.add.text(width / 2, y + 34, p1, style).setOrigin(0.5);
    this.add.text(width / 2, y + 98, p2, style).setOrigin(0.5);

    this.add
      .text(width / 2, y + 150, 'Custom key rebinding isn\u2019t available yet — these are fixed for now.', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '13px',
        color: '#5a6578',
      })
      .setOrigin(0.5);
  }

  _buildBackButton(width, y) {
    const bg = this.add
      .rectangle(width / 2, y, 220, 46, 0x141a24, 0.9)
      .setStrokeStyle(2, 0x2c3444)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(width / 2, y, '← BACK', { fontFamily: 'Rajdhani, sans-serif', fontSize: '20px', fontStyle: '700', color: '#e6edf5' })
      .setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, 0xf4d232);
      txt.setColor('#f4d232');
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(2, 0x2c3444);
      txt.setColor('#e6edf5');
    });
    bg.on('pointerdown', () => this.scene.start(this.returnTo));
  }
}
