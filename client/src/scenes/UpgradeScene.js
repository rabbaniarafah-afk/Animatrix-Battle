import { CHARACTERS } from '../characters/CharacterConfig.js';
import { STATS, MAX_LEVEL, getCoins, getLevel, getUpgradeCost, buyUpgrade } from '../meta/Wallet.js';
import { playPunch, playSpecial } from '../audio/SFX.js';

const STAT_LABELS = { damage: 'DAMAGE', health: 'HEALTH', speed: 'SPEED' };

// ---------------------------------------------------------------------------
// UpgradeScene — reachable from the Main Menu's UPGRADES button.
// Spend coins earned from match wins on permanent per-character stat boosts
// (damage / health / speed), 5 levels each, +4% per level. Persisted via
// meta/Wallet.js (localStorage).
// ---------------------------------------------------------------------------
export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('UpgradeScene');
  }

  init(data) {
    this.returnTo = data?.returnTo || 'MenuScene';
    this.selectedIndex = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(220, 5, 7, 10);

    const g = this.add.graphics();
    g.fillGradientStyle(0x0d1420, 0x0d1420, 0x05070a, 0x05070a, 1);
    g.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, height * 0.08, 'UPGRADES', {
        fontFamily: 'Russo One, sans-serif',
        fontSize: '44px',
        color: '#ffffff',
        stroke: '#f4d232',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.coinText = this.add
      .text(width / 2, height * 0.155, '', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '20px',
        fontStyle: '700',
        color: '#f4d232',
      })
      .setOrigin(0.5);

    this._buildCharacterTabs(width, height * 0.24);

    this.statRowsContainer = this.add.container(0, 0);
    this._buildBackButton(width, height * 0.94);

    this._refresh();
  }

  _refresh() {
    this.coinText.setText(`🪙 ${getCoins()} COINS`);
    this._buildStatRows(this.scale.width, this.scale.height * 0.36);
    this._refreshTabs();
  }

  // -- Character tabs -----------------------------------------------------

  _buildCharacterTabs(width, y) {
    this.tabs = [];
    const spacing = 150;
    const startX = width / 2 - ((CHARACTERS.length - 1) * spacing) / 2;

    CHARACTERS.forEach((char, i) => {
      const x = startX + i * spacing;

      const bg = this.add
        .rectangle(x, y, 128, 90, 0x141a24, 0.9)
        .setStrokeStyle(2, 0x2c3444)
        .setInteractive({ useHandCursor: true });
      const img = this.add.image(x, y - 12, char.texture).setScale(char.scale * 0.5);
      const label = this.add
        .text(x, y + 34, char.name, {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '11px',
          fontStyle: '700',
          color: '#8fa3b8',
        })
        .setOrigin(0.5);

      bg.on('pointerdown', () => {
        this.selectedIndex = i;
        playPunch();
        this._refresh();
      });

      this.tabs.push({ bg, img, label });
    });
  }

  _refreshTabs() {
    this.tabs.forEach((tab, i) => {
      const selected = i === this.selectedIndex;
      tab.bg.setStrokeStyle(2, selected ? 0xf4d232 : 0x2c3444);
      tab.bg.setFillStyle(selected ? 0x1d2430 : 0x141a24, 0.95);
      tab.label.setColor(selected ? '#f4d232' : '#8fa3b8');
    });
  }

  // -- Stat rows ------------------------------------------------------------

  _buildStatRows(width, startY) {
    this.statRowsContainer.destroy();
    this.statRowsContainer = this.add.container(0, 0);

    const char = CHARACTERS[this.selectedIndex];
    const rowSpacing = 96;

    STATS.forEach((stat, i) => {
      const y = startY + i * rowSpacing;
      const level = getLevel(char.id, stat);
      const cost = getUpgradeCost(char.id, stat);
      const maxed = cost === null;

      const label = this.add
        .text(width / 2 - 300, y, STAT_LABELS[stat], {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '20px',
          fontStyle: '700',
          color: '#e6edf5',
        })
        .setOrigin(0, 0.5);

      const pips = this.add
        .text(width / 2 - 30, y, this._pipString(level), {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '22px',
          color: '#f4d232',
          letterSpacing: 4,
        })
        .setOrigin(0.5);

      const bonusText = this.add
        .text(width / 2 - 300, y + 24, `+${level * 4}% currently`, {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '13px',
          color: '#5a6578',
        })
        .setOrigin(0, 0.5);

      const btnLabel = maxed ? 'MAXED' : `UPGRADE  🪙${cost}`;
      const affordable = !maxed && getCoins() >= cost;

      const btnBg = this.add
        .rectangle(width / 2 + 210, y, 220, 44, 0x141a24, 0.9)
        .setStrokeStyle(2, maxed ? 0x2c3444 : affordable ? 0x3fae5c : 0x5a2c2c);
      const btnTxt = this.add
        .text(width / 2 + 210, y, btnLabel, {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '16px',
          fontStyle: '700',
          color: maxed ? '#5a6578' : affordable ? '#8fe6a8' : '#e08080',
        })
        .setOrigin(0.5);

      if (!maxed) {
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerdown', () => {
          const result = buyUpgrade(char.id, stat);
          if (result.success) {
            playSpecial();
            this._refresh();
          }
          // insufficient-coins clicks just do nothing extra — the red
          // outline already communicates "can't afford this yet".
        });
      }

      this.statRowsContainer.add([label, pips, bonusText, btnBg, btnTxt]);
    });
  }

  _pipString(level) {
    return '●'.repeat(level) + '○'.repeat(MAX_LEVEL - level);
  }

  // -- Back button ----------------------------------------------------------

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
