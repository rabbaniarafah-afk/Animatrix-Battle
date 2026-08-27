// ---------------------------------------------------------------------------
// AIController
//
// Drives a StickFighter the same way a human does — by producing the same
// `keys` object StickFighter.handleInput() expects — so it obeys the exact
// same movement/attack rules as the player. No teleporting, no stat
// cheating; it just makes reasonably-timed decisions.
// ---------------------------------------------------------------------------

const ATTACK_RANGE = 95;
const RETREAT_HEALTH_RATIO = 0.28;

export class AIController {
  constructor(fighter, opponent) {
    this.fighter = fighter;
    this.opponent = opponent;
    this.decisionTimer = 0;
    this.decisionInterval = 260;
    this.currentPlan = { move: 0, jump: false, block: false, dash: false, attack: null };
    this.clock = 0;
  }

  _decide() {
    const f = this.fighter;
    const o = this.opponent;
    const dx = o.feetX - f.feetX;
    const dist = Math.abs(dx);
    const dir = dx >= 0 ? 1 : -1;
    const lowHealth = f.health <= f.maxHealth * RETREAT_HEALTH_RATIO;

    const plan = { move: 0, jump: false, block: false, dash: false, attack: null };

    // Unleash the Ultimate when it's available (full energy + low health) — a comeback finisher.
    if (lowHealth && f.energy >= f.maxEnergy && dist < ATTACK_RANGE + 30 && Math.random() < 0.65) {
      plan.attack = 'ultimate';
      this.currentPlan = plan;
      return;
    }

    // Occasionally unleash the special once energy is full.
    if (f.energy >= f.maxEnergy && dist < ATTACK_RANGE + 30 && Math.random() < 0.5) {
      plan.attack = 'special';
      this.currentPlan = plan;
      return;
    }

    // Fire a power blast at range when off cooldown.
    if (f.powerCooldown <= 0 && dist > ATTACK_RANGE && dist < 500 && Math.random() < 0.35) {
      plan.attack = 'power';
      this.currentPlan = plan;
      return;
    }

    if (lowHealth && dist < 220 && Math.random() < 0.5) {
      plan.move = -dir;
      if (Math.random() < 0.2) plan.jump = true;
    } else if (dist > ATTACK_RANGE + 20) {
      plan.move = dir;
      if (dist > 380 && Math.random() < 0.25) plan.dash = true;
      if (Math.random() < 0.08) plan.jump = true;
    } else if (dist < ATTACK_RANGE - 10) {
      if (Math.random() < 0.55) {
        const roll = Math.random();
        plan.attack = roll < 0.45 ? 'lightPunch' : roll < 0.8 ? 'kick' : 'heavyPunch';
      } else {
        plan.move = -dir * 0.4;
      }
    } else {
      const roll = Math.random();
      if (roll < 0.5) {
        const atkRoll = Math.random();
        plan.attack = atkRoll < 0.4 ? 'lightPunch' : atkRoll < 0.7 ? 'kick' : atkRoll < 0.9 ? 'heavyPunch' : 'dashAttack';
      } else if (roll < 0.72) {
        plan.block = true;
      } else if (roll < 0.85) {
        plan.jump = true;
      }
    }

    if (o.isAttacking && dist < ATTACK_RANGE + 15 && Math.random() < 0.55) {
      plan.block = true;
      plan.attack = null;
    }

    this.currentPlan = plan;
  }

  /** @returns {object} a `keys`-shaped object for StickFighter.handleInput */
  getKeys(dt) {
    this.clock += dt;
    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0) {
      this._decide();
      this.decisionTimer = this.decisionInterval + Math.random() * 220;
    }

    const p = this.currentPlan;
    const wantsLeft = p.move < -0.15;
    const wantsRight = p.move > 0.15;
    const justDecided = this.clock % this.decisionInterval < dt * 1.5;

    return {
      left: { isDown: wantsLeft },
      right: { isDown: wantsRight },
      down: { isDown: false },
      run: { isDown: Math.abs(p.move) > 0.5 },
      jumpPressed: !!p.jump && justDecided,
      jumpHeld: !!p.jump,
      blockHeld: !!p.block,
      dashPressed: !!p.dash && justDecided,
      lightPunch: p.attack === 'lightPunch',
      heavyPunch: p.attack === 'heavyPunch',
      kick: p.attack === 'kick',
      dashAttack: p.attack === 'dashAttack',
      special: p.attack === 'special',
      ultimate: p.attack === 'ultimate',
      power: p.attack === 'power',
    };
  }
}
