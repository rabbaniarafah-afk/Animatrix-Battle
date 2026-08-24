import { AnimationController } from './AnimationController.js';
import { getCharacterById } from './CharacterConfig.js';
import { Hitbox } from '../combat/Hitbox.js';
import { Hurtbox } from '../combat/Hurtbox.js';
import { ATTACKS, getSpecialFor } from '../combat/Attack.js';
import { getPowerFor } from '../combat/Projectile.js';
import { playPunch, playHeavyPunch, playKick, playSpecial, playPower, playDoubleJump, playRageActivate } from '../audio/SFX.js';
import { landingDust, dashTrailStreak, rageEmber } from '../combat/HitEffects.js';

const MOVE_SPEED = 230;
const RUN_SPEED = 370;
const ACCEL = 2200;
const AIR_ACCEL = 1300;
const FRICTION = 2200;
const JUMP_VELOCITY = -600;
const AIR_JUMP_VELOCITY = -520;
const JUMP_PREP_MS = 70;
const DASH_SPEED = 560;
const DASH_MS = 180;
const DASH_COOLDOWN_MS = 420;
const MULTI_HIT_GAP_MS = 90; // minimum spacing between hits of a multi-hit special
const GLIDE_MAX_FALL = 220; // soft-cap on fall speed while holding jump/up in the air
const RAGE_HEALTH_THRESHOLD = 0.25;
export const RAGE_DAMAGE_MULT = 1.15;

const BODY_W = 46;
const BODY_H = 150;

const MAX_HEALTH = 100;

/**
 * StickFighter — physics body (an invisible Zone, so the visual is fully
 * owned by the procedural rig) + full combat state machine + the
 * AnimationController that renders it.
 *
 * Each character's passive `abilities` (see CharacterConfig.js) are applied
 * here as simple multipliers on movement/damage/knockback — see the
 * `_ability()` helper.
 */
export class StickFighter {
  constructor(scene, x, groundY, characterId, opts = {}) {
    this.scene = scene;
    this.config = getCharacterById(characterId);
    this.playerLabel = opts.label || 'FIGHTER';
    this.isAI = !!opts.isAI;

    // Effective, ability-adjusted movement stats for this fighter.
    this.moveSpeed = MOVE_SPEED * this._ability('moveSpeedMult', 1);
    this.runSpeed = RUN_SPEED * this._ability('moveSpeedMult', 1);
    this.dashSpeed = DASH_SPEED * this._ability('dashSpeedMult', 1);
    this.dashCooldownMs = DASH_COOLDOWN_MS * this._ability('dashCooldownMult', 1);

    this.body = scene.add.zone(x, groundY - BODY_H / 2, BODY_W, BODY_H);
    scene.physics.add.existing(this.body);
    this.body.body.setCollideWorldBounds(true);
    this.body.body.setDragX(FRICTION);
    this.body.body.maxVelocity.x = RUN_SPEED + DASH_SPEED + 200;
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
    this.airJumpsUsed = 0;
    this.powerCooldown = 0;
    this.isRaging = false;
    this.rageEmberTimer = 0;

    this.health = MAX_HEALTH;
    this.maxHealth = MAX_HEALTH;
    this.defeated = false;
    this.defeatElapsed = 0;
    this.victoryPose = false;
    this.energy = 0;
    this.maxEnergy = 100;

    this.comboCounter = 0;
    this.comboResetTimer = 0;

    this.attack = null; // { config, phase, timer, hitCount, maxHits, lastHitTime }
    this.attackCooldown = 0;
    this.hitstunTimer = 0;
    this.reactionType = null; // 'hitReact' | 'knockback' | null
    this.reactionDuration = 1;
    this.reactionElapsed = 0;

    this.lastOpponent = null;
    this.onProjectile = opts.onProjectile || null;

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

  _ability(key, fallback) {
    return this.config.abilities?.[key] ?? fallback;
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
   *    dashPressed, lightPunch, heavyPunch, kick, dashAttack, special }
   * @param {StickFighter} opponent - used to auto-face them and for special-move mechanics
   */
  handleInput(keys, opponent) {
    const b = this.body.body;
    const grounded = this.isGrounded;
    if (grounded) this.airJumpsUsed = 0;
    if (opponent) this.lastOpponent = opponent;

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
      b.setVelocityX(this.facing * this.dashSpeed);
      if (this.scene.time.now - this._lastTrailTime > 40) {
        this._lastTrailTime = this.scene.time.now;
        dashTrailStreak(this.scene, this.feetX, this.feetY - 70, this.config.color, this.facing);
      }
      this._updateTimers();
      return;
    }

    let moveDir = 0;
    if (keys.left.isDown) moveDir -= 1;
    if (keys.right.isDown) moveDir += 1;

    this.blocking = !!keys.blockHeld && grounded;
    const running = keys.run?.isDown && grounded && !this.blocking;
    const maxSpeed = running ? this.runSpeed : this.moveSpeed;
    const accel = grounded ? ACCEL : AIR_ACCEL;

    this.crouching = grounded && keys.down.isDown && moveDir === 0 && !this.blocking;

    if (this.blocking || this.crouching) {
      b.setAccelerationX(0);
      b.setDragX(FRICTION * 2.2);
    } else if (moveDir !== 0) {
      if (grounded) {
        // Ground movement snaps straight to top speed the instant a
        // direction is held — no ramp-up, so key press == immediate motion.
        b.setAccelerationX(0);
        b.setDragX(0);
        b.setVelocityX(moveDir * maxSpeed);
      } else {
        // Airborne movement keeps a short accelerate-in for a natural jump arc.
        b.setAccelerationX(moveDir * accel);
        b.setDragX(FRICTION * 0.4);
        b.maxVelocity.x = maxSpeed;
      }
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
    } else if (keys.jumpPressed && !grounded && this.airJumpsUsed < 1 && !this.jumpPrepping) {
      // Double jump — a brief taste of "flight": one extra jump while airborne.
      b.setVelocityY(AIR_JUMP_VELOCITY);
      this.airJumpsUsed += 1;
      playDoubleJump();
    }
    if (this.jumpPrepping) {
      this.jumpPrepTimer += this.scene.game.loop.delta;
      b.setVelocityX(b.velocity.x * 0.5);
      if (this.jumpPrepTimer >= JUMP_PREP_MS) {
        b.setVelocityY(JUMP_VELOCITY);
        this.jumpPrepping = false;
      }
    }

    // Glide — holding jump/up while falling softens the descent.
    if (!grounded && b.velocity.y > 0 && keys.jumpHeld) {
      b.velocity.y = Math.min(b.velocity.y, GLIDE_MAX_FALL);
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
      else if (keys.power && this.powerCooldown <= 0) this._fireProjectile();
    }

    this._updateTimers();
  }

  _fireProjectile() {
    const config = getPowerFor(this.config.id);
    this.powerCooldown = config.cooldown;
    playPower();
    this.onProjectile?.(this, config);
  }

  _startAttack(id) {
    if (this.attackCooldown > 0) return;
    const config = id === 'special' ? getSpecialFor(this.config.id) : ATTACKS[id];
    if (config.requiresAirborne && this.isGrounded) return;
    if (config.requiresGrounded && !this.isGrounded) return;
    if (config.energyCost && this.energy < config.energyCost) return;

    this.attack = {
      config,
      phase: 'startup',
      timer: 0,
      hitCount: 0,
      maxHits: config.hits || 1,
      lastHitTime: null,
    };

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
      this._applySpecialMechanics(a.config);
    } else if (a.phase === 'active' && a.timer >= a.config.active) {
      a.phase = 'recovery';
      a.timer = 0;
    } else if (a.phase === 'recovery' && a.timer >= a.config.recovery) {
      this.attackCooldown = a.config.cooldown;
      this.attack = null;
    }
  }

  /** One-time special-move effects triggered right as the active (hit) window begins. */
  _applySpecialMechanics(config) {
    const opp = this.lastOpponent;
    if (!opp || opp.defeated) return;

    if (config.teleportBehind) {
      const behindX = opp.feetX - opp.facing * 90;
      this.body.body.reset(behindX, this.body.body.y);
      this.facing = opp.feetX >= this.feetX ? 1 : -1;
    }

    if (config.pullOpponent) {
      const dir = opp.feetX >= this.feetX ? -1 : 1;
      opp.body.body.setVelocityX(dir * 520);
      opp.body.body.setVelocityY(-80);
    }
  }

  /** Returns a Hitbox instance only while the attack is in its active window and hasn't used up its hits. */
  getActiveHitbox() {
    if (!this.attack || this.attack.phase !== 'active') return null;
    const a = this.attack;
    if (a.hitCount >= a.maxHits) return null;
    if (a.lastHitTime != null && a.timer - a.lastHitTime < MULTI_HIT_GAP_MS) return null;
    return new Hitbox(this, a.config);
  }

  markHitConfirmed() {
    if (!this.attack) return;
    this.attack.hitCount += 1;
    this.attack.lastHitTime = this.attack.timer;
  }

  /**
   * Applies an incoming hit.
   * @param {object} hit - { damage, knockback, knockbackUp, hitstun, fromX, blocked, energyGain }
   */
  takeHit(hit) {
    if (this.defeated) return;
    const dir = this.feetX >= hit.fromX ? 1 : -1;
    const kbResist = this._ability('knockbackResist', 1);

    if (hit.blocked) {
      this.health = Math.max(0, this.health - hit.damage * 0.12);
      this.body.body.setVelocityX(dir * hit.knockback * 0.35 * kbResist);
      this.reactionType = null; // stays in block pose
      this.comboCounter = 0;
      this.comboResetTimer = 0;
      this.gainEnergy(hit.energyGain ?? 0);
      return;
    }

    this.health = Math.max(0, this.health - hit.damage);
    this.body.body.setVelocityX(dir * hit.knockback * kbResist);
    this.body.body.setVelocityY(hit.knockbackUp * kbResist);
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

    if (!this.isRaging && this.health / this.maxHealth <= RAGE_HEALTH_THRESHOLD) {
      this.isRaging = true;
      playRageActivate();
    }

    if (this.health <= 0) {
      this.defeated = true;
      this.defeatElapsed = 0;
    }
  }

  gainEnergy(amount) {
    const scaled = amount * this._ability('energyRate', 1);
    this.energy = Phaser.Math.Clamp(this.energy + scaled, 0, this.maxEnergy);
  }

  /** Called by ArenaScene on the surviving fighter once a match ends. */
  playVictoryPose() {
    this.victoryPose = true;
  }

  _updateTimers() {
    const dt = this.scene.game.loop.delta;
    if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.powerCooldown > 0) this.powerCooldown = Math.max(0, this.powerCooldown - dt);

    if (this.dashing) {
      this.dashTimer += dt;
      if (this.dashTimer >= DASH_MS) {
        this.dashing = false;
        this.dashCooldown = this.dashCooldownMs;
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

    if (this.defeated) this.defeatElapsed += dt;
  }

  _computeAnimState() {
    if (this.victoryPose) return { kind: 'victory' };
    if (this.defeated) return { kind: 'defeat', t: this.defeatElapsed };

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

    if (!this.wasGrounded && grounded) {
      landingDust(this.scene, this.feetX, this.feetY, this.config.color);
    }

    if (this.isRaging && !this.defeated) {
      this.rageEmberTimer -= dt;
      if (this.rageEmberTimer <= 0) {
        this.rageEmberTimer = 220;
        rageEmber(this.scene, this.feetX, this.feetY - 70, this.config.color);
      }
    }

    this.anim.update(dt, animState, { feetX: this.feetX, feetY: this.feetY, facing: this.facing });

    this.nameLabel.setVisible(!this.defeated && !this.victoryPose);
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
      defeatElapsed: this.defeatElapsed,
      victoryPose: this.victoryPose,
      blocking: this.blocking,
      crouching: this.crouching,
      dashing: this.dashing,
      hitstunTimer: this.hitstunTimer,
      reactionType: this.reactionType,
      reactionElapsed: this.reactionElapsed,
      reactionDuration: this.reactionDuration,
      isRaging: this.isRaging,
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
    this.defeatElapsed = s.defeatElapsed ?? this.defeatElapsed;
    this.victoryPose = !!s.victoryPose;
    this.blocking = s.blocking;
    this.crouching = s.crouching;
    this.dashing = s.dashing;
    this.hitstunTimer = s.hitstunTimer;
    this.reactionType = s.reactionType;
    this.reactionElapsed = s.reactionElapsed;
    this.reactionDuration = s.reactionDuration;
    this.isRaging = !!s.isRaging;
    const cfg = s.attack ? (s.attack.id === 'special' ? getSpecialFor(this.config.id) : ATTACKS[s.attack.id]) : null;
    this.attack = s.attack
      ? { config: cfg, phase: s.attack.phase, timer: s.attack.timer, hitCount: 0, maxHits: cfg.hits || 1, lastHitTime: null }
      : null;
  }
}
