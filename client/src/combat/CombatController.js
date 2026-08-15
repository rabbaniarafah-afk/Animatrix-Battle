import { rectsOverlap } from './Hitbox.js';
import { spawnHitSpark, blockSpark, screenShake, comboText, specialFlash } from './HitEffects.js';
import { playHit, playBlock } from '../audio/SFX.js';

// ---------------------------------------------------------------------------
// CombatController
//
// Each frame, checks whether either fighter currently has an active hitbox
// (only true during that attack's "active" window) overlapping the other
// fighter's hurtbox. On the first overlap per swing (hitConfirmed guards
// against multi-hitting across several active frames) it resolves damage,
// knockback, hit-stun, energy gain, combo tracking, and spawns feedback
// (spark / block spark / shake / combo counter popup).
// ---------------------------------------------------------------------------

export class CombatController {
  constructor(scene, fighterA, fighterB, opts = {}) {
    this.scene = scene;
    this.fighters = [fighterA, fighterB];
    this.onHit = opts.onHit || null; // used in online host mode to relay fx to the guest
  }

  update() {
    const [a, b] = this.fighters;
    this._resolve(a, b);
    this._resolve(b, a);
  }

  _resolve(attacker, defender) {
    if (defender.defeated) return;
    const hitbox = attacker.getActiveHitbox();
    if (!hitbox) return;

    const hRect = hitbox.getRect();
    const dRect = defender.hurtbox.getRect();
    if (!rectsOverlap(hRect, dRect)) return;

    attacker.markHitConfirmed();

    const blocked = defender.blocking;
    const config = attacker.attack.config;
    const isSpecial = config.id === 'special';

    defender.takeHit({
      damage: config.damage,
      knockback: config.knockback,
      knockbackUp: config.knockbackUp,
      hitstun: config.hitstun,
      fromX: attacker.feetX,
      blocked,
      energyGain: blocked ? config.damage * 0.25 : config.damage * 0.55,
    });
    attacker.gainEnergy(blocked ? config.damage * 0.4 : config.damage * 1.1);

    const contactX = (hRect.left + hRect.right) / 2;
    const contactY = (hRect.top + hRect.bottom) / 2;

    if (blocked) {
      blockSpark(this.scene, contactX, contactY);
      screenShake(this.scene, 0.003, 60);
      playBlock();
    } else {
      const big = config.damage >= 12;
      spawnHitSpark(this.scene, contactX, contactY, attacker.config.color, big);
      screenShake(this.scene, big ? 0.009 : 0.005, big ? 160 : 100);
      playHit({ big });
      if (isSpecial) specialFlash(this.scene, contactX, contactY, attacker.config.color);
      if (defender.comboCounter >= 2) comboText(this.scene, defender.feetX, defender.feetY - 190, defender.comboCounter);
    }

    if (this.onHit) {
      this.onHit({
        x: contactX,
        y: contactY,
        color: attacker.config.color,
        big: config.damage >= 12,
        blocked,
        special: isSpecial,
        comboCount: defender.comboCounter,
      });
    }
  }
}
