// ---------------------------------------------------------------------------
// Projectile — a simple traveling hitbox (not tied to the Attack/Hitbox
// melee system). Each fighter can fire one on a cooldown, independent of
// their energy bar. Represented as a small Phaser Graphics blob colored to
// the shooter, moving in a straight line until it hits something or leaves
// the arena.
// ---------------------------------------------------------------------------

const POWER_BY_CHARACTER = {
  yellow: { damage: 9, speed: 720, radius: 10, color: 0xfbe64d, knockback: 220, knockbackUp: -80, cooldown: 1500 },
  barbarian: { damage: 13, speed: 560, radius: 14, color: 0x55b8f6, knockback: 300, knockbackUp: -100, cooldown: 2000 },
  shadowlord: { damage: 10, speed: 820, radius: 9, color: 0x911df5, knockback: 200, knockbackUp: -70, cooldown: 1400 },
  gothliotic: { damage: 8, speed: 900, radius: 8, color: 0xd5ecfb, knockback: 190, knockbackUp: -70, cooldown: 1200 },
  gosths: { damage: 11, speed: 640, radius: 12, color: 0x8fa3b8, knockback: 260, knockbackUp: -90, cooldown: 1700 },
};

export function getPowerFor(characterId) {
  return POWER_BY_CHARACTER[characterId] || POWER_BY_CHARACTER.yellow;
}

// ---------------------------------------------------------------------------
// Special-move projectiles — fired as part of a character's special attack
// (not the generic Power Blast). Currently just Shadowlord's laser beam.
// `beam: true` switches Projectile into beam mode (see below): instead of
// traveling like a blob, it draws instantly as a long rectangle in front of
// the shooter and disappears after `beamLife` ms.
// ---------------------------------------------------------------------------
const SPECIAL_PROJECTILES = {
  shadowlord: {
    damage: 22,
    radius: 13,
    color: 0xb46bff,
    knockback: 380,
    knockbackUp: -80,
    beam: true,
    length: 900,
    beamLife: 240,
  },
};

export function getSpecialProjectileFor(characterId) {
  return SPECIAL_PROJECTILES[characterId] || null;
}

// ---------------------------------------------------------------------------
// Ultimate-tier projectiles — bigger, stronger versions fired by Ultimate
// moves (see ULTIMATES_BY_CHARACTER in Attack.js). Currently just
// Shadowlord's Abyssal Beam: a wider, longer-lasting, harder-hitting laser.
// ---------------------------------------------------------------------------
const ULTIMATE_PROJECTILES = {
  shadowlord: {
    damage: 32,
    radius: 20,
    color: 0xd48bff,
    knockback: 460,
    knockbackUp: -100,
    beam: true,
    length: 1100,
    beamLife: 320,
  },
};

export function getUltimateProjectileFor(characterId) {
  return ULTIMATE_PROJECTILES[characterId] || null;
}

export class Projectile {
  constructor(scene, x, y, dir, config, ownerColor) {
    this.scene = scene;
    this.dir = dir;
    this.config = config;
    this.alive = true;
    this.hasHit = false;

    this.x = x;
    this.y = y;
    this.beamLife = config.beam ? (config.beamLife ?? 220) : null;

    this.gfx = scene.add.graphics().setDepth(15);
    this._draw();

    // Small motion trail handled by re-drawing a fading ghost each frame.
    this.trailTimer = 0;
  }

  _draw() {
    const g = this.gfx;
    g.clear();

    if (this.config.beam) {
      const len = this.config.length ?? 700;
      const thickness = this.config.radius * 2;
      const x0 = this.dir > 0 ? this.x : this.x - len;
      const fade = this.beamLife != null ? Phaser.Math.Clamp(this.beamLife / (this.config.beamLife ?? 220), 0, 1) : 1;
      g.fillStyle(this.config.color, 0.55 * fade);
      g.fillRect(x0, this.y - thickness, len, thickness * 2);
      g.fillStyle(this.config.color, 0.9 * fade);
      g.fillRect(x0, this.y - thickness / 2, len, thickness);
      g.fillStyle(0xffffff, 0.85 * fade);
      g.fillRect(x0, this.y - thickness * 0.15, len, thickness * 0.3);
      return;
    }

    g.fillStyle(this.config.color, 1);
    g.fillCircle(this.x, this.y, this.config.radius);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(this.x, this.y, this.config.radius * 0.4);
  }

  getRect() {
    if (this.config.beam) {
      const len = this.config.length ?? 700;
      const thickness = this.config.radius * 2;
      const x0 = this.dir > 0 ? this.x : this.x - len;
      return { left: x0, right: x0 + len, top: this.y - thickness / 2, bottom: this.y + thickness / 2 };
    }
    const r = this.config.radius;
    return { left: this.x - r, right: this.x + r, top: this.y - r, bottom: this.y + r };
  }

  update(dt, bounds) {
    if (!this.alive) return;

    if (this.config.beam) {
      this.beamLife -= dt;
      this._draw();
      if (this.beamLife <= 0) this.destroy();
      return;
    }

    this.x += this.dir * this.config.speed * (dt / 1000);
    this._draw();

    if (this.x < bounds.left - 40 || this.x > bounds.right + 40) {
      this.destroy();
    }
  }

  destroy() {
    this.alive = false;
    this.gfx.destroy();
  }
}
