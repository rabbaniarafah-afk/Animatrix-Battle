import { StickFighter } from '../characters/StickFighter.js';
import { AIController } from '../characters/AIController.js';
import { CombatController } from '../combat/CombatController.js';
import { MatchHUD } from '../ui/MatchHUD.js';
import { ARENA1 } from '../arenas/Arena1.js';
import { ARENAS, getArenaById } from '../arenas/ArenaRegistry.js';
import { CHARACTERS } from '../characters/CharacterConfig.js';
import { spawnHitSpark, blockSpark, screenShake, comboText, specialFlash } from '../combat/HitEffects.js';
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

    // Reset camera in case a previous match (same scene instance, reused by
    // Phaser on scene.start) left it zoomed/panned from a finishing blow.
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(width / 2, height / 2);

    this.physics.world.setBounds(this.arena.leftBoundary, 0, this.arena.rightBoundary - this.arena.leftBoundary, height);

    this.groundCollider = this.add.rectangle(
      width / 2,
      this.arena.groundY + (height - this.arena.groundY) / 2,
      width,
      height - this.arena.groundY
    );
    this.physics.add.existing(this.groundCollider, true);

    this.player1 = new StickFighter(this, width * 0.32, this.arena.groundY, this.p1Id, { facing: 1, depth: 12 });
    this.player2 = new StickFighter(this, width * 0.68, this.arena.groundY, this.p2Id, {
      facing: -1,
      depth: 11,
      isAI: !this.isLocal && !this.isOnline,
    });

    this.physics.add.collider(this.player1.body, this.groundCollider);
    this.physics.add.collider(this.player2.body, this.groundCollider);
    this.physics.add.collider(this.player1.body, this.player2.body);

    if (this.isOnline && !this.isHost) {
      // Guest: rendering-only bodies. Position/health/etc come from host
      // snapshots (applySnapshot), not local physics simulation.
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
    this.netTickAccum = 0;
    this.remoteInput = this._emptyKeys();

    if (this.isOnline) this._setupOnlineHandlers();

    this.hud.playIntro(() => {
      this.controlsLocked = false;
    });
  }

  _setupInput() {
    const kb = this.input.keyboard;
    // Player 1 / solo keyboard scheme (also used by an online guest for their own fighter)
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
    };
    this.cursors = kb.createCursorKeys();

    // Player 2 / same-keyboard local scheme
    this.keys2 = {
      block: kb.addKey('QUOTES'),
      dash: kb.addKey('PERIOD'),
      lightPunch: kb.addKey('ONE'),
      heavyPunch: kb.addKey('TWO'),
      kick: kb.addKey('THREE'),
      dashAttack: kb.addKey('FOUR'),
      special: kb.addKey('ZERO'),
      run: kb.addKey('FORWARD_SLASH'),
    };

    this.escKey = kb.addKey('ESC');
  }

  _emptyKeys() {
    return {
      left: { isDown: false },
      right: { isDown: false },
      down: { isDown: false },
      run: { isDown: false },
      jumpPressed: false,
      blockHeld: false,
      dashPressed: false,
      lightPunch: false,
      heavyPunch: false,
      kick: false,
      dashAttack: false,
      special: false,
    };
  }

  _buildControlsHint() {
    const { width, height } = this.scale;
    const p1Hint =
      'P1: A/D move · W jump · S crouch · SHIFT run · B block · SPACE dash · J/K/L punch/heavy/kick · U dash-atk · I special';
    const p2Hint = "P2: ←/→ move · ↑ jump · ↓ crouch · / run · ' block · . dash · 1/2/3 punch/heavy/kick · 4 dash-atk · 0 special";

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
      .text(width - 20, 16, 'ESC — MENU', { fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', color: '#4a5568' })
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
      blockHeld: this.keys1.block.isDown,
      dashPressed,
      lightPunch: this.keys1.lightPunch.isDown,
      heavyPunch: this.keys1.heavyPunch.isDown,
      kick: this.keys1.kick.isDown,
      dashAttack: this.keys1.dashAttack.isDown,
      special: this.keys1.special.isDown,
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
      blockHeld: this.keys2.block.isDown,
      dashPressed,
      lightPunch: this.keys2.lightPunch.isDown,
      heavyPunch: this.keys2.heavyPunch.isDown,
      kick: this.keys2.kick.isDown,
      dashAttack: this.keys2.dashAttack.isDown,
      special: this.keys2.special.isDown,
    };
  }

  // -- Online -----------------------------------------------------------
  _setupOnlineHandlers() {
    const net = window.ANIMATRIX.network;
    if (!net) {
      this.scene.start('MenuScene');
      return;
    }

    net.on('input', (input) => {
      this.remoteInput = input; // host receives guest's input
    });

    net.on('state', (snapshot) => {
      // guest receives host's authoritative state
      if (!this.isHost) {
        this.player1.applySnapshot(snapshot.p1);
        this.player2.applySnapshot(snapshot.p2);
      }
    });

    net.on('matchEvent', (evt) => {
      if (this.isHost) return; // host already played its own local fx
      if (evt.type === 'rematch') {
        this.scene.start('ArenaScene', { mode: this.mode });
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
      this.scene.start('MenuScene');
    });
  }

  /**
   * Fires once, on the exact hit that reduces someone to 0 HP: a brief
   * hit-stop freeze, then a camera zoom/pan into the impact point, plus the
   * winner striking their victory pose — before handing off to the normal
   * K.O. overlay.
   */
  _triggerFinishCinematic(winner, loser, point) {
    if (this.finishTriggered) return;
    this.finishTriggered = true;
    this.matchOver = true;

    this.hitStopUntil = this.time.now + 130;
    this.cameras.main.zoomTo(1.18, 500, 'Sine.easeOut');
    this.cameras.main.pan(point.x, this.scale.height / 2, 500, 'Sine.easeOut');
    screenShake(this, 0.014, 260);
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
          this.scene.start('MenuScene');
        }
      );
    });
  }

  update(time, delta) {
    if (this.escKey.isDown && !this.matchOver) {
      window.ANIMATRIX.network?.disconnect();
      this.scene.start('MenuScene');
      return;
    }

    // Brief hit-stop freeze on the finishing blow — skip advancing gameplay
    // for a few frames while the camera zoom tween plays out.
    if (this.hitStopUntil && time < this.hitStopUntil) return;

    if (!this.controlsLocked && !this.matchOver) {
      if (this.isOnline) {
        if (this.isHost) {
          this.player1.handleInput(this._readPlayer1Keys(), this.player2);
          this.player2.handleInput(this.remoteInput, this.player1);
          this.combat.update();

          this.netTickAccum += delta;
          if (this.netTickAccum >= NET_TICK_MS) {
            this.netTickAccum = 0;
            window.ANIMATRIX.network.sendState({ p1: this.player1.getSnapshot(), p2: this.player2.getSnapshot() });
          }
        } else {
          window.ANIMATRIX.network.sendInput(this._readPlayer1Keys());
        }
      } else if (this.isLocal) {
        this.player1.handleInput(this._readPlayer1Keys(), this.player2);
        this.player2.handleInput(this._readPlayer2Keys(), this.player1);
        this.combat.update();
      } else {
        this.player1.handleInput(this._readPlayer1Keys(), this.player2);
        this.player2.handleInput(this.ai.getKeys(delta), this.player1);
        this.combat.update();
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
