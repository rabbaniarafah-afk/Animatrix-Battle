import { rectsOverlap } from './Hitbox.js';
import { spawnHitSpark, blockSpark, screenShake, comboText, specialFlash, damageNumber } from './HitEffects.js';
import { playHit, playBlock } from '../audio/SFX.js';
import { RAGE_DAMAGE_MULT } from '../characters/StickFighter.js';

// ---------------------------------------------------------------------------
// CombatController
//
// Each frame, checks whether either fighter currently has an active hitbox
// (only true during that attack's "active" window) overlapping the other
// fighter's hurtbox. hitCount/maxHits (on the attacker's `attack` object)
// guard how many times a single swing can land — most moves allow exactly
// one hit, but multi-hit specials (see Attack.js `hits`) allow a few, each
// spaced out by StickFighter's MULTI_HIT_GAP_MS. Every landed hit resolves
// damage, knockback, hit-stun, energy gain, combo tracking, and spawns
// feedback (spark / block spark / shake / combo counter popup).
// ---------------------------------------------------------------------------

export class CombatController {
  constructor(scene, fighterA, fighterB, opts = {}) {
    this.scene = scene;
    this.fighters = [fighterA, fighterB];
    this.onHit = opts.onHit || null; // used in online host mode to relay fx to the guest
    this.onFinish = opts.onFinish || null; // called once, on the hit that reduces someone to 0 HP
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
    const isSpecial = config.id === 'special' || config.id === 'ultimate';

    // Barbarian's "Skybound Bruiser" passive: heavy punch and special hit harder.
    let damage = config.damage;
    if ((config.id === 'heavyPunch' || isSpecial) && attacker.config.abilities?.heavyDamageMult) {
      damage *= attacker.config.abilities.heavyDamageMult;
    }
    // Gothliotic's "Featherweight" passive: kicks hit harder.
    if (config.id === 'kick' && attacker.config.abilities?.kickDamageMult) {
      damage *= attacker.config.abilities.kickDamageMult;
    }
    // Rage: once a fighter drops below the health threshold, their attacks hit harder.
    if (attacker.isRaging) damage *= RAGE_DAMAGE_MULT;
    // Permanent coin-bought damage upgrade (see meta/Wallet.js) — applies to every hit.
    damage *= attacker.upgradeDamageMult ?? 1;

    defender.takeHit({
      damage,
      knockback: config.knockback,
      knockbackUp: config.knockbackUp,
      hitstun: config.hitstun,
      fromX: attacker.feetX,
      blocked,
      energyGain: blocked ? damage * 0.25 : damage * 0.55,
    });
    attacker.gainEnergy(blocked ? damage * 0.4 : damage * 1.1);

    const contactX = (hRect.left + hRect.right) / 2;
    const contactY = (hRect.top + hRect.bottom) / 2;
    const big = damage >= 12;

    if (blocked) {
      blockSpark(this.scene, contactX, contactY);
      screenShake(this.scene, 0.003, 60);
      playBlock();
    } else {
      spawnHitSpark(this.scene, contactX, contactY, attacker.config.color, big);
      screenShake(this.scene, big ? 0.009 : 0.005, big ? 160 : 100);
      playHit({ big });
      damageNumber(this.scene, contactX, contactY - 20, damage, big);
      if (isSpecial) specialFlash(this.scene, contactX, contactY, attacker.config.color);
      if (defender.comboCounter >= 2) comboText(this.scene, defender.feetX, defender.feetY - 190, defender.comboCounter);
    }

    if (this.onHit) {
      this.onHit({
        x: contactX,
        y: contactY,
        color: attacker.config.color,
        big,
        blocked,
        special: isSpecial,
        comboCount: defender.comboCounter,
      });
    }

    if (!blocked && defender.defeated && this.onFinish) {
      this.onFinish(attacker, defender, { x: contactX, y: contactY });
    }
  }
}
