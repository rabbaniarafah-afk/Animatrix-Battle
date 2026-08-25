// ---------------------------------------------------------------------------
// Hurtbox — the volume that can BE hit, always present on a fighter
// (shrinks slightly while crouching/blocking so low/guarded fighters read
// as harder to hit, matching normal fighting-game feel).
// ---------------------------------------------------------------------------

export class Hurtbox {
  constructor(owner) {
    this.owner = owner;
  }

  getRect() {
    const feetX = this.owner.feetX;
    const feetY = this.owner.feetY;
    const crouched = this.owner.crouching || this.owner.blocking;
    const scale = this.owner.sizeScale ?? 1;

    const halfW = 22 * scale;
    const height = (crouched ? 92 : 128) * scale;

    return {
      left: feetX - halfW,
      right: feetX + halfW,
      top: feetY - height,
      bottom: feetY,
    };
  }
}
