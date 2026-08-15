// ---------------------------------------------------------------------------
// Hitbox — attacker-side rectangle, only meaningful during an attack's
// "active" phase. Positioned in front of the fighter based on facing.
// ---------------------------------------------------------------------------

export class Hitbox {
  /**
   * @param {StickFighter} owner
   * @param {object} attack - an entry from ATTACKS
   */
  constructor(owner, attack) {
    this.owner = owner;
    this.attack = attack;
  }

  getRect() {
    const feetX = this.owner.feetX;
    const feetY = this.owner.feetY;
    const dir = this.owner.facing;

    const centerX = feetX + dir * (this.attack.range * 0.55);
    const centerY = feetY + this.attack.reachY;
    const w = this.attack.range;
    const h = this.attack.height;

    return {
      left: centerX - (dir > 0 ? w * 0.15 : w * 0.85),
      right: centerX + (dir > 0 ? w * 0.85 : w * 0.15),
      top: centerY - h / 2,
      bottom: centerY + h / 2,
    };
  }
}

export function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
