import { AnimationController } from './AnimationController.js';
import { getCharacterById } from './CharacterConfig.js';
import { Hitbox } from '../combat/Hitbox.js';
import { Hurtbox } from '../combat/Hurtbox.js';
import { ATTACKS } from '../combat/Attack.js';
import { playPunch, playHeavyPunch, playKick, playSpecial } from '../audio/SFX.js';

const MOVE_SPEED = 230;
const RUN_SPEED = 370;
const ACCEL = 2200;
const AIR_ACCEL = 1300;
const FRICTION = 2200;
const JUMP_VELOCITY = -600;
const JUMP_PREP_MS = 70;
const DASH_SPEED = 560;
const DASH_MS = 180;
const DASH_COOLDOWN_MS = 420;

const BODY_W = 46;
const BODY_H = 150;

const MAX_HEALTH = 100;

/**
 * StickFighter — physics body (an invisible Zone, so the visual is fully
 * owned by the procedural rig) + full combat state machine + the
 * AnimationController that renders it.
 */
export class StickFighter {
  constructor(scene, x, groundY, characterId, opts = {}) {
    this.scene = scene;
    this.config = getCharacterById(characterId);
    this.playerLabel = opts.label || 'FIGHTER';
    this.isAI = !!opts.isAI;

    this.body = scene.add.zone(x, groundY - BODY_H / 2, BODY_W, BODY_H);
    scene.physics.add.existing(this.body);
    this.body.body.setCollideWorldBounds(true);
    this.body.body.setDragX(FRICTION);
    this.body.body.maxVelocity.x = RUN_SPEED + DASH_SPEED;
    this.body.body.setSize(BODY_W, BODY_H);

    this.facing = opts.facing || 1;
    this.wasGrounded = true;
    this.jumpPrepping = false;
    this.jumpPrepTimer = 0;
    this.crouching = false;
    this.blocking = false;
    this.dashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;

    this.health = MAX_HEALTH;
    this.maxHealth = MAX_HEALTH;
    this.defeated = false;
    this.energy = 0;
    this.maxEnergy = 100;

    this.comboCounter = 0;
    this.comboResetTimer = 0;

    this.attack = null; // { config, phase, timer, hitConfirmed }
    this.attackCooldown = 0;
    this.hitstunTimer = 0;
    this.reactionType = null; // 'hitReact' | 'knockback' | null
    this.reactionDuration = 1;
    this.reactionElapsed = 0;

    this.hurtbox = new Hurtbox(this);

    this.anim = new AnimationController(scene, this.config.color, this.config.outline, opts.depth || 10, this.config.headTexture);

    this.nameLabel = scene.add
      .text(x, groundY - BODY_H - 26, this.config.name, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '13px',
        fontStyle: '700',
        color: '#e6edf5',
        backgroundColor: '#00000066',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5);
  }

  get feetX() {
    return this.body.body.center.x;
  }
  get feetY() {
    return this.body.body.bottom;
  }
  get isGrounded() {
    return this.body.body.blocked.down || this.body.body.touching.down;
  }
  get isAttacking() {
    return !!this.attack;
  }
  get isStunned() {
    return this.hitstunTimer > 0 || this.defeated;
  }
  get canAct() {
    return !this.isAttacking && !this.isStunned;
  }

  /**
   * @param {object} keys
   *  { left, right, down, run:{isDown}, jumpPressed, blockHeld,
   *    dashPressed, lightPunch, heavyPunch, kick }
   * @param {StickFighter} opponent - used to auto-face them
   */
  handleInput(keys, opponent) {
    const b = this.body.body;
    const grounded = this.isGrounded;

    // Hitstun / defeat: physics keeps running (knockback drift, gravity)
    // but no player-driven movement or new actions.
    if (this.isStunned) {
      b.setDragX(FRICTION);
      this._updateTimers();
      return;
    }

    if (this.isAttacking) {
      const cfg = this.attack.config;
      if (cfg.id !== 'dashAttack') b.setAccelerationX(0);

      // Combo canceling: once recovery has progressed past the move's
      // cancelableAfter threshold, a fresh attack input immediately chains
      // into the next move instead of waiting out the rest of recovery.
      const frac = this.attack.phase === 'recovery' ? this.attack.timer / Math.max(1, cfg.recovery) : 0;
      const canCancel = this.attack.phase === 'recovery' && frac >= (cfg.cancelableAfter ?? 1.01);

      if (canCancel && !keys.blockHeld) {
        if (keys.lightPunch) this._startAttack(grounded ? 'lightPunch' : 'airAttack');
        else if (keys.heavyPunch && grounded) this._startAttack('heavyPunch');
        else if (keys.kick && grounded) this._startAttack('kick');
        else if (keys.special && grounded && this.energy >= 100) this._startAttack('special');
      }

      if (this.isAttacking) this._advanceAttack();
      this._updateTimers();
      return;
    }

    if (this.dashing) {
      b.setVelocityX(this.facing * DASH_SPEED);
      this._updateTimers();
      return;
    }

    let moveDir = 0;
    if (keys.left.isDown) moveDir -= 1;
    if (keys.right.isDown) moveDir += 1;

    this.blocking = !!keys.blockHeld && grounded;
    const running = keys.run?.isDown && grounded && !this.blocking;
    const maxSpeed = running ? RUN_SPEED : MOVE_SPEED;
    const accel = grounded ? ACCEL : AIR_ACCEL;

    this.crouching = grounded && keys.down.isDown && moveDir === 0 && !this.blocking;

    if (this.blocking || this.crouching) {
      b.setAccelerationX(0);
      b.setDragX(FRICTION * 2.2);
    } else if (moveDir !== 0) {
      b.setAccelerationX(moveDir * accel);
      b.setDragX(FRICTION * 0.4);
      b.maxVelocity.x = maxSpeed;
      this.facing = moveDir;
    } else {
      b.setAccelerationX(0);
      b.setDragX(FRICTION);
    }

    if (opponent) this.facing = opponent.feetX >= this.feetX ? 1 : -1;

    // Jump
    if (keys.jumpPressed && grounded && !this.jumpPrepping && !this.crouching && !this.blocking) {
      this.jumpPrepping = true;
      this.jumpPrepTimer = 0;
    }
    if (this.jumpPrepping) {
      this.jumpPrepTimer += this.scene.game.loop.delta;
      b.setVelocityX(b.velocity.x * 0.5);
      if (this.jumpPrepTimer >= JUMP_PREP_MS) {
        b.setVelocityY(JUMP_VELOCITY);
        this.jumpPrepping = false;
      }
    }

    // Dash (tap)
    if (keys.dashPressed && grounded && this.dashCooldown <= 0 && !this.crouching && !this.blocking) {
      this.dashing = true;
      this.dashTimer = 0;
    }

    // Attacks
    if (!this.blocking) {
      if (keys.lightPunch) this._startAttack(grounded ? 'lightPunch' : 'airAttack');
      else if (keys.heavyPunch && grounded) this._startAttack('heavyPunch');
      else if (keys.kick && grounded) this._startAttack('kick');
      else if (keys.dashAttack && grounded && this.dashCooldown <= 0) this._startAttack('dashAttack');
      else if (keys.special && grounded && this.energy >= 100) this._startAttack('special');
    }

    this._updateTimers();
  }

  _startAttack(id) {
    if (this.attackCooldown > 0) return;
    const config = ATTACKS[id];
    if (config.requiresAirborne && this.isGrounded) return;
    if (config.requiresGrounded && !this.isGrounded) return;
    if (config.energyCost && this.energy < config.energyCost) return;

    this.attack = { config, phase: 'startup', timer: 0, hitConfirmed: false };
    if (id === 'dashAttack') {
      this.body.body.setVelocityX(this.facing * config.dashSpeed);
    }

    if (config.energyCost) {
      this.energy = Math.max(0, this.energy - config.energyCost);
      playSpecial();
    } else if (id === 'heavyPunch') playHeavyPunch();
    else if (id === 'kick') playKick();
    else playPunch(); // lightPunch, airAttack, dashAttack
  }

  _advanceAttack() {
    const dt = this.scene.game.loop.delta;
    const a = this.attack;
    a.timer += dt;

    if (a.phase === 'startup' && a.timer >= a.config.startup) {
      a.phase = 'active';
      a.timer = 0;
    } else if (a.phase === 'active' && a.timer >= a.config.active) {
      a.phase = 'recovery';
      a.timer = 0;
    } else if (a.phase === 'recovery' && a.timer >= a.config.recovery) {
      this.attackCooldown = a.config.cooldown;
      this.attack = null;
    }
  }

  /** Returns a Hitbox instance only while the attack is in its active window. */
  getActiveHitbox() {
    if (!this.attack || this.attack.phase !== 'active' || this.attack.hitConfirmed) return null;
    return new Hitbox(this, this.attack.config);
  }

  markHitConfirmed() {
    if (this.attack) this.attack.hitConfirmed = true;
  }

  /**
   * Applies an incoming hit.
   * @param {object} hit - { damage, knockback, knockbackUp, hitstun, fromX, blocked, energyGain }
   */
  takeHit(hit) {
    if (this.defeated) return;
    const dir = this.feetX >= hit.fromX ? 1 : -1;

    if (hit.blocked) {
      this.health = Math.max(0, this.health - hit.damage * 0.12);
      this.body.body.setVelocityX(dir * hit.knockback * 0.35);
      this.reactionType = null; // stays in block pose
      this.comboCounter = 0;
      this.comboResetTimer = 0;
      this.gainEnergy(hit.energyGain ?? 0);
      return;
    }

    this.health = Math.max(0, this.health - hit.damage);
    this.body.body.setVelocityX(dir * hit.knockback);
    this.body.body.setVelocityY(hit.knockbackUp);
    this.hitstunTimer = hit.hitstun;
    this.reactionDuration = hit.hitstun;
    this.reactionElapsed = 0;
    this.reactionType = hit.knockback >= 300 ? 'knockback' : 'hitReact';
    this.attack = null;
    this.jumpPrepping = false;
    this.dashing = false;

    this.comboCounter = this.comboResetTimer > 0 ? this.comboCounter + 1 : 1;
    this.comboResetTimer = hit.hitstun + 550;
    this.gainEnergy(hit.energyGain ?? 0);

    if (this.health <= 0) {
      this.defeated = true;
    }
  }

  gainEnergy(amount) {
    this.energy = Phaser.Math.Clamp(this.energy + amount, 0, this.maxEnergy);
  }

  _updateTimers() {
    const dt = this.scene.game.loop.delta;
    if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);

    if (this.dashing) {
      this.dashTimer += dt;
      if (this.dashTimer >= DASH_MS) {
        this.dashing = false;
        this.dashCooldown = DASH_COOLDOWN_MS;
      }
    }

    if (this.hitstunTimer > 0) {
      this.hitstunTimer = Math.max(0, this.hitstunTimer - dt);
      this.reactionElapsed += dt;
      if (this.hitstunTimer === 0) this.reactionType = null;
    }

    if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
      if (this.comboResetTimer === 0) this.comboCounter = 0;
    }
  }

  _computeAnimState() {
    if (this.defeated) return { kind: 'defeat' };

    if (this.hitstunTimer > 0) {
      if (this.reactionType === 'knockback') return { kind: 'knockback' };
      return { kind: 'hitReact', t: Phaser.Math.Clamp(this.reactionElapsed / Math.max(1, this.reactionDuration), 0, 1) };
    }

    if (this.attack) {
      const a = this.attack;
      const dur = a.phase === 'startup' ? a.config.startup : a.phase === 'active' ? a.config.active : a.config.recovery;
      return { kind: 'attack', attack: a.config, phase: a.phase, phaseT: Phaser.Math.Clamp(a.timer / Math.max(1, dur), 0, 1) };
    }

    if (this.dashing) return { kind: 'dash' };
    if (this.blocking) return { kind: 'block' };

    const grounded = this.isGrounded;
    if (this.jumpPrepping) return { kind: 'jumpPrep' };
    if (!grounded) return { kind: this.body.body.velocity.y < 0 ? 'rise' : 'fall' };
    if (!this.wasGrounded && grounded) return { kind: 'land' };
    if (this.crouching) return { kind: 'crouch' };

    const vx = Math.abs(this.body.body.velocity.x);
    if (vx > 260) return { kind: 'run' };
    if (vx > 12) return { kind: 'walk' };
    return { kind: 'idle' };
  }

  update(dt) {
    const grounded = this.isGrounded;
    const animState = this._computeAnimState();

    this.anim.update(dt, animState, { feetX: this.feetX, feetY: this.feetY, facing: this.facing });

    this.nameLabel.x = this.feetX;
    this.nameLabel.y = this.feetY - BODY_H - 26;

    this.wasGrounded = grounded;
  }

  destroy() {
    this.body.destroy();
    this.anim.destroy();
    this.nameLabel.destroy();
  }

  // -- Online sync -----------------------------------------------------
  /** Compact state snapshot the host broadcasts each tick for this fighter. */
  getSnapshot() {
    return {
      x: this.body.body.center.x,
      y: this.body.body.center.y,
      vx: this.body.body.velocity.x,
      vy: this.body.body.velocity.y,
      facing: this.facing,
      health: this.health,
      energy: this.energy,
      defeated: this.defeated,
      blocking: this.blocking,
      crouching: this.crouching,
      dashing: this.dashing,
      hitstunTimer: this.hitstunTimer,
      reactionType: this.reactionType,
      reactionElapsed: this.reactionElapsed,
      reactionDuration: this.reactionDuration,
      attack: this.attack ? { id: this.attack.config.id, phase: this.attack.phase, timer: this.attack.timer } : null,
    };
  }

  /** Applied on the guest client — hard-syncs this fighter to the host's authoritative snapshot. */
  applySnapshot(s) {
    this.body.body.reset(s.x, s.y);
    this.body.body.setVelocity(s.vx, s.vy);
    this.facing = s.facing;
    this.health = s.health;
    this.energy = s.energy;
    this.defeated = s.defeated;
    this.blocking = s.blocking;
    this.crouching = s.crouching;
    this.dashing = s.dashing;
    this.hitstunTimer = s.hitstunTimer;
    this.reactionType = s.reactionType;
    this.reactionElapsed = s.reactionElapsed;
    this.reactionDuration = s.reactionDuration;
    this.attack = s.attack ? { config: ATTACKS[s.attack.id], phase: s.attack.phase, timer: s.attack.timer, hitConfirmed: true } : null;
  }
}
