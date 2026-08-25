import { StickFighter } from '../characters/StickFighter.js';
import { AIController } from '../characters/AIController.js';
import { CombatController } from '../combat/CombatController.js';
import { MatchHUD } from '../ui/MatchHUD.js';
import { ARENA1 } from '../arenas/Arena1.js';
import { getArenaById } from '../arenas/ArenaRegistry.js';
import { CHARACTERS } from '../characters/CharacterConfig.js';
import { Projectile } from '../combat/Projectile.js';
import { rectsOverlap } from '../combat/Hitbox.js';
import { spawnHitSpark, blockSpark, screenShake, comboText, specialFlash, powerImpact, damageNumber } from '../combat/HitEffects.js';
import { playHit, playBlock } from '../audio/SFX.js';

const NET_TICK_MS = 50; // ~20Hz state broadcast from host to guest

export class ArenaScene extends Phaser.Scene {
  constructor() {
    super('ArenaScene');
  }

  init(data) {
    this.mode = data?.mode || 'quick';
    this.isLocal = this.mode === 'local';
    this.isOnline = this.mode === 'online';
    this.isHost = window.ANIMATRIX.isHost;

    this.p1Id = window.ANIMATRIX.selection.player1 || 'yellow';
    this.p2Id = window.ANIMATRIX.selection.player2 || CHARACTERS.find((c) => c.id !== this.p1Id)?.id || CHARACTERS[0].id;

    this.arenaConfig = getArenaById(window.ANIMATRIX.selectedArena) || ARENA1;
  }

  create() {
    const { width, height } = this.scale;
    this.arena = this.arenaConfig;
    this.arena.build(this);

    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(width / 2, height / 2);
    this.cameras.main.fadeIn(280, 5, 7, 10);

    this.physics.world.setBounds(this.arena.leftBoundary, 0, this.arena.rightBoundary - this.arena.leftBoundary, height);

    this.groundCollider = this.add.rectangle(
      width / 2,
      this.arena.groundY + (height - this.arena.groundY) / 2,
      width,
      height - this.arena.groundY
    );
    this.physics.add.existing(this.groundCollider, true);

    this.projectiles = [];
    const onProjectile = (owner, config) => this._spawnProjectile(owner, config);

    this.player1 = new StickFighter(this, width * 0.32, this.arena.groundY, this.p1Id, { facing: 1, depth: 12, onProjectile });
    this.player2 = new StickFighter(this, width * 0.68, this.arena.groundY, this.p2Id, {
      facing: -1,
      depth: 11,
      isAI: !this.isLocal && !this.isOnline,
      onProjectile,
    });

    this.physics.add.collider(this.player1.body, this.groundCollider);
    this.physics.add.collider(this.player2.body, this.groundCollider);
    this.physics.add.collider(this.player1.body, this.player2.body);

    if (this.isOnline && !this.isHost) {
      this.player1.body.body.moves = false;
      this.player2.body.body.moves = false;
    }

    this.ai = !this.isLocal && !this.isOnline ? new AIController(this.player2, this.player1) : null;

    const onHit = this.isOnline && this.isHost ? (evt) => window.ANIMATRIX.network.sendEvent(evt) : null;
    const onFinish = (winner, loser, point) => this._triggerFinishCinematic(winner, loser, point);
    this.combat = new CombatController(this, this.player1, this.player2, { onHit, onFinish });
    this.hud = new MatchHUD(this, this.player1, this.player2);

    this._setupInput();
    this._buildControlsHint();

    this.controlsLocked = true;
    this.matchOver = false;
    this.finishTriggered = false;
    this.hitStopUntil = 0;
    this.paused = false;
    this.netTickAccum = 0;
    this.remoteInput = this._emptyKeys();

    if (this.isOnline) this._setupOnlineHandlers();

    this.hud.playIntro(() => {
      this.controlsLocked = false;
    });
  }

  _setupInput() {
    const kb = this.input.keyboard;
    this.keys1 = {
      left: kb.addKey('A'),
      right: kb.addKey('D'),
      up: kb.addKey('W'),
      down: kb.addKey('S'),
      run: kb.addKey('SHIFT'),
      block: kb.addKey('B'),
      dash: kb.addKey('SPACE'),
      lightPunch: kb.addKey('J'),
      heavyPunch: kb.addKey('K'),
      kick: kb.addKey('L'),
      dashAttack: kb.addKey('U'),
      special: kb.addKey('I'),
      power: kb.addKey('P'),
    };
    this.cursors = kb.createCursorKeys();

    this.keys2 = {
      block: kb.addKey('QUOTES'),
      dash: kb.addKey('PERIOD'),
      lightPunch: kb.addKey('ONE'),
      heavyPunch: kb.addKey('TWO'),
      kick: kb.addKey('THREE'),
      dashAttack: kb.addKey('FOUR'),
      special: kb.addKey('ZERO'),
      power: kb.addKey('FIVE'),
      run: kb.addKey('FORWARD_SLASH'),
    };

    this.escKey = kb.addKey('ESC');

    // Dev/testing shortcut: instantly fills both fighters' energy bars so
    // specials can be tested without fighting for 10-20 seconds each time.
    // Not part of normal gameplay — safe to remove later if you want.
    this.debugFillEnergyKey = kb.addKey('M');
  }

  _emptyKeys() {
    return {
      left: { isDown: false },
      right: { isDown: false },
      down: { isDown: false },
      run: { isDown: false },
      jumpPressed: false,
      jumpHeld: false,
      blockHeld: false,
      dashPressed: false,
      lightPunch: false,
      heavyPunch: false,
      kick: false,
      dashAttack: false,
      special: false,
      power: false,
    };
  }

  _buildControlsHint() {
    const { width, height } = this.scale;
    const p1Hint =
      'P1: A/D move · W jump(x2) · S crouch · SHIFT run · B block · SPACE dash · J/K/L punch/heavy/kick · U dash-atk · I special · P power';
    const p2Hint =
      "P2: ←/→ move · ↑ jump(x2) · ↓ crouch · / run · ' block · . dash · 1/2/3 punch/heavy/kick · 4 dash-atk · 0 special · 5 power";

    this.add
      .text(width / 2, height - (this.isLocal ? 34 : 20), p1Hint, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '13px',
        fontStyle: '600',
        color: '#8fa3b8',
      })
      .setOrigin(0.5);

    if (this.isLocal) {
      this.add
        .text(width / 2, height - 14, p2Hint, {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '13px',
          fontStyle: '600',
          color: '#8fa3b8',
        })
        .setOrigin(0.5);
    }

    this.add
      .text(width - 20, 16, 'ESC — PAUSE', { fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', color: '#4a5568' })
      .setOrigin(1, 0);

    if (this.isOnline) {
      this.add
        .text(20, 16, this.isHost ? 'HOST' : 'GUEST', { fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', color: '#55b8f6' })
        .setOrigin(0, 0);
    }
  }

  _readPlayer1Keys() {
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys1.up) || Phaser.Input.Keyboard.JustDown(this.cursors.up);
    const dashPressed = Phaser.Input.Keyboard.JustDown(this.keys1.dash);

    return {
      left: { isDown: this.keys1.left.isDown || this.cursors.left.isDown },
      right: { isDown: this.keys1.right.isDown || this.cursors.right.isDown },
      down: { isDown: this.keys1.down.isDown || this.cursors.down.isDown },
      run: { isDown: this.keys1.run.isDown },
      jumpPressed,
      jumpHeld: this.keys1.up.isDown || this.cursors.up.isDown,
      blockHeld: this.keys1.block.isDown,
      dashPressed,
      lightPunch: this.keys1.lightPunch.isDown,
      heavyPunch: this.keys1.heavyPunch.isDown,
      kick: this.keys1.kick.isDown,
      dashAttack: this.keys1.dashAttack.isDown,
      special: this.keys1.special.isDown,
      power: this.keys1.power.isDown,
    };
  }

  _readPlayer2Keys() {
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
    const dashPressed = Phaser.Input.Keyboard.JustDown(this.keys2.dash);

    return {
      left: { isDown: this.cursors.left.isDown },
      right: { isDown: this.cursors.right.isDown },
      down: { isDown: this.cursors.down.isDown },
      run: { isDown: this.keys2.run.isDown },
      jumpPressed,
      jumpHeld: this.cursors.up.isDown,
      blockHeld: this.keys2.block.isDown,
      dashPressed,
      lightPunch: this.keys2.lightPunch.isDown,
      heavyPunch: this.keys2.heavyPunch.isDown,
      kick: this.keys2.kick.isDown,
      dashAttack: this.keys2.dashAttack.isDown,
      special: this.keys2.special.isDown,
      power: this.keys2.power.isDown,
    };
  }

  // -- Power-blast projectiles ---------------------------------------------
  _spawnProjectile(owner, config) {
    const startX = owner.feetX + owner.facing * 40;
    const startY = owner.feetY - 80;
    const proj = new Projectile(this, startX, startY, owner.facing, config, owner.config.color);
    proj.owner = owner;
    this.projectiles.push(proj);
  }

  _updateProjectiles(dt) {
    const bounds = { left: this.arena.leftBoundary, right: this.arena.rightBoundary };

    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.update(dt, bounds);
      if (!proj.alive) continue;

      const target = proj.owner === this.player1 ? this.player2 : this.player1;
      if (target.defeated) continue;

      // Guest doesn't resolve its own projectile hits locally in online
      // mode — it only renders what the host's snapshots/events tell it.
      if (this.isOnline && !this.isHost) continue;

      if (rectsOverlap(proj.getRect(), target.hurtbox.getRect())) {
        const blocked = target.blocking;
        target.takeHit({
          damage: proj.config.damage,
          knockback: proj.config.knockback,
          knockbackUp: proj.config.knockbackUp,
          hitstun: 260,
          fromX: proj.x,
          blocked,
          energyGain: blocked ? proj.config.damage * 0.2 : proj.config.damage * 0.4,
        });
        proj.owner.gainEnergy(blocked ? proj.config.damage * 0.3 : proj.config.damage * 0.8);

        if (blocked) {
          blockSpark(this, proj.x, proj.y);
          playBlock();
        } else {
          powerImpact(this, proj.x, proj.y, proj.config.color);
          damageNumber(this, proj.x, proj.y - 10, proj.config.damage, false);
          playHit({ big: false });
        }

        if (this.isOnline && this.isHost) {
          window.ANIMATRIX.network.sendEvent({ type: 'power', x: proj.x, y: proj.y, color: proj.config.color, blocked });
        }

        if (!blocked && target.defeated && !this.finishTriggered) {
          this._triggerFinishCinematic(proj.owner, target, { x: proj.x, y: proj.y });
        }

        proj.destroy();
      }
    }

    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  // -- Online -----------------------------------------------------------
  _setupOnlineHandlers() {
    const net = window.ANIMATRIX.network;
    if (!net) {
      this.scene.start('MenuScene');
      return;
    }

    net.on('input', (input) => {
      this.remoteInput = input;
    });

    net.on('state', (snapshot) => {
      if (!this.isHost) {
        this.player1.applySnapshot(snapshot.p1);
        this.player2.applySnapshot(snapshot.p2);
      }
    });

    net.on('matchEvent', (evt) => {
      if (this.isHost) return;
      if (evt.type === 'rematch') {
        this.scene.start('ArenaScene', { mode: this.mode });
        return;
      }
      if (evt.type === 'power') {
        if (evt.blocked) blockSpark(this, evt.x, evt.y);
        else powerImpact(this, evt.x, evt.y, evt.color);
        return;
      }
      if (evt.blocked) {
        blockSpark(this, evt.x, evt.y);
        screenShake(this, 0.003, 60);
        playBlock();
      } else {
        spawnHitSpark(this, evt.x, evt.y, evt.color, evt.big);
        screenShake(this, evt.big ? 0.009 : 0.005, evt.big ? 160 : 100);
        playHit({ big: evt.big });
        if (evt.special) specialFlash(this, evt.x, evt.y, evt.color);
        if (evt.comboCount >= 2) comboText(this, evt.x, evt.y - 120, evt.comboCount);
      }
    });

    net.on('opponentLeft', () => {
      if (!this.matchOver) {
        this.matchOver = true;
        this._showOpponentLeft();
      }
    });
  }

  _showOpponentLeft() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setDepth(90);
    this.add
      .text(width / 2, height / 2, 'Opponent disconnected', {
        fontFamily: 'Russo One, sans-serif',
        fontSize: '28px',
        color: '#e23b3b',
      })
      .setOrigin(0.5)
      .setDepth(91);
    const btn = this.add
      .text(width / 2, height / 2 + 50, 'BACK TO MENU', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '18px',
        fontStyle: '700',
        color: '#f4d232',
        backgroundColor: '#141a24',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(91)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      window.ANIMATRIX.network?.disconnect();
      this._fadeTo('MenuScene');
    });
  }

  // -- Pause -----------------------------------------------------------
  _togglePause() {
    if (this.matchOver) return;
    this.paused = !this.paused;

    if (this.paused) {
      const { width, height } = this.scale;
      this.pauseOverlay = this.add.container(0, 0).setDepth(150);
      const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0).setInteractive();
      const title = this.add
        .text(width / 2, height / 2 - 70, 'PAUSED', { fontFamily: 'Russo One, sans-serif', fontSize: '36px', color: '#f4d232' })
        .setOrigin(0.5);

      const resumeBtn = this._pauseButton(width / 2, height / 2 + 10, 'RESUME', 0xf4d232, '#0a0e14', () => this._togglePause());
      const quitBtn = this._pauseButton(width / 2, height / 2 + 74, 'QUIT TO MENU', 0x141a24, '#e6edf5', () => {
        window.ANIMATRIX.network?.disconnect();
        this._fadeTo('MenuScene');
      });

      this.pauseOverlay.add([bg, title, ...resumeBtn, ...quitBtn]);
    } else if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
  }

  _pauseButton(x, y, label, fillColor, textColor, onClick) {
    const bg = this.add
      .rectangle(x, y, 220, 48, fillColor)
      .setStrokeStyle(2, fillColor === 0x141a24 ? 0x2c3444 : fillColor)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, { fontFamily: 'Russo One, sans-serif', fontSize: '16px', color: textColor })
      .setOrigin(0.5);
    bg.on('pointerover', () => this.tweens.add({ targets: [bg, text], scale: 1.04, duration: 100 }));
    bg.on('pointerout', () => this.tweens.add({ targets: [bg, text], scale: 1, duration: 100 }));
    bg.on('pointerdown', onClick);
    return [bg, text];
  }

  _fadeTo(sceneKey, data) {
    this.cameras.main.fadeOut(220, 5, 7, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(sceneKey, data));
  }

  /**
   * Fires once, on the exact hit that reduces someone to 0 HP: a brief
   * hit-stop freeze, a quick punchy zoom pulse + white flash (camera snaps
   * straight back to normal, no lingering zoom or pan so the HUD stays
   * fully visible), plus the winner striking their victory pose — before
   * handing off to the normal K.O. overlay.
   */
  _triggerFinishCinematic(winner, loser, point) {
    if (this.finishTriggered) return;
    this.finishTriggered = true;
    this.matchOver = true;

    this.hitStopUntil = this.time.now + 130;

    this.cameras.main.zoomTo(1.06, 150, 'Cubic.easeOut');
    this.time.delayedCall(150, () => {
      this.cameras.main.zoomTo(1, 280, 'Cubic.easeIn');
    });

    const flash = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0xffffff, 0.55)
      .setOrigin(0)
      .setDepth(200)
      .setScrollFactor(0);
    this.tweens.add({ targets: flash, alpha: 0, duration: 240, onComplete: () => flash.destroy() });

    screenShake(this, 0.01, 200);
    winner.playVictoryPose();

    this.time.delayedCall(900, () => {
      this.hud.showKO(
        winner,
        () => {
          if (this.isOnline && this.isHost) window.ANIMATRIX.network.sendEvent({ type: 'rematch' });
          this.scene.start('ArenaScene', { mode: this.mode });
        },
        () => {
          window.ANIMATRIX.network?.disconnect();
          this._fadeTo('MenuScene');
        }
      );
    });
  }

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.escKey) && !this.matchOver) {
      this._togglePause();
    }

    // Dev/testing shortcut — press M to instantly max both energy bars.
    // Works in Quick Battle and Local Battle. In Online Battle it only
    // takes effect on the host, since the guest's state is overwritten by
    // the host's snapshots each tick.
    if (Phaser.Input.Keyboard.JustDown(this.debugFillEnergyKey) && !this.matchOver) {
      if (!this.isOnline || this.isHost) {
        this.player1.energy = this.player1.maxEnergy;
        this.player2.energy = this.player2.maxEnergy;
      }
    }

    if (this.paused) return;

    if (this.hitStopUntil && time < this.hitStopUntil) return;

    if (!this.controlsLocked && !this.matchOver) {
      if (this.isOnline) {
        if (this.isHost) {
          this.player1.handleInput(this._readPlayer1Keys(), this.player2);
          this.player2.handleInput(this.remoteInput, this.player1);
          this.combat.update();
          this._updateProjectiles(delta);

          this.netTickAccum += delta;
          if (this.netTickAccum >= NET_TICK_MS) {
            this.netTickAccum = 0;
            window.ANIMATRIX.network.sendState({ p1: this.player1.getSnapshot(), p2: this.player2.getSnapshot() });
          }
        } else {
          window.ANIMATRIX.network.sendInput(this._readPlayer1Keys());
          this._updateProjectiles(delta);
        }
      } else if (this.isLocal) {
        this.player1.handleInput(this._readPlayer1Keys(), this.player2);
        this.player2.handleInput(this._readPlayer2Keys(), this.player1);
        this.combat.update();
        this._updateProjectiles(delta);
      } else {
        this.player1.handleInput(this._readPlayer1Keys(), this.player2);
        this.player2.handleInput(this.ai.getKeys(delta), this.player1);
        this.combat.update();
        this._updateProjectiles(delta);
      }
    }

    this.player1.update(delta);
    this.player2.update(delta);
    this.hud.update();

    if (!this.matchOver && !this.finishTriggered && (this.player1.defeated || this.player2.defeated)) {
      const winner = this.player1.defeated ? this.player2 : this.player1;
      const loser = this.player1.defeated ? this.player1 : this.player2;
      this._triggerFinishCinematic(winner, loser, { x: loser.feetX, y: loser.feetY - 80 });
    }
  }
}
