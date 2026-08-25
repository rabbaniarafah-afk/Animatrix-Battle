// ---------------------------------------------------------------------------
// Attack definitions
//
// `startup`/`active`/`recovery` (ms) drive BOTH the hitbox timing AND the
// animation phase timing (AnimationController reads the same numbers), so
// the visual windup/strike/recovery always matches when the hit can land.
// ---------------------------------------------------------------------------

export const ATTACKS = {
  lightPunch: {
    id: 'lightPunch',
    poseWindup: 'punchWindup',
    poseStrike: 'punchStrike',
    startup: 150,
    active: 90,
    recovery: 180,
    damage: 6,
    knockback: 190,
    knockbackUp: -60,
    hitstun: 260,
    range: 62,
    reachY: -70, // offset from feet, negative = up (roughly chest height)
    height: 34,
    cooldown: 120,
    requiresGrounded: true,
    cancelableAfter: 0.3,
  },
  heavyPunch: {
    id: 'heavyPunch',
    poseWindup: 'heavyWindup',
    poseStrike: 'heavyStrike',
    startup: 260,
    active: 110,
    recovery: 340,
    damage: 15,
    knockback: 360,
    knockbackUp: -140,
    hitstun: 420,
    range: 70,
    reachY: -72,
    height: 36,
    cooldown: 200,
    requiresGrounded: true,
    cancelableAfter: 0.65,
  },
  kick: {
    id: 'kick',
    poseWindup: 'kickWindup',
    poseStrike: 'kickStrike',
    startup: 190,
    active: 110,
    recovery: 260,
    damage: 10,
    knockback: 280,
    knockbackUp: -100,
    hitstun: 340,
    range: 78,
    reachY: -34,
    height: 32,
    cooldown: 160,
    requiresGrounded: true,
    cancelableAfter: 0.45,
  },
  airAttack: {
    id: 'airAttack',
    poseWindup: 'airWindup',
    poseStrike: 'airStrike',
    startup: 120,
    active: 100,
    recovery: 160,
    damage: 9,
    knockback: 240,
    knockbackUp: -40,
    hitstun: 300,
    range: 68,
    reachY: -30,
    height: 40,
    cooldown: 140,
    requiresAirborne: true,
  },
  dashAttack: {
    id: 'dashAttack',
    poseWindup: 'punchWindup',
    poseStrike: 'heavyStrike',
    startup: 90,
    active: 110,
    recovery: 240,
    damage: 10,
    knockback: 330,
    knockbackUp: -80,
    hitstun: 360,
    range: 76,
    reachY: -60,
    height: 40,
    cooldown: 220,
    requiresGrounded: true,
    dashSpeed: 620,
  },
  special: {
    id: 'special',
    poseWindup: 'specialWindup',
    poseStrike: 'specialStrike',
    startup: 380,
    active: 140,
    recovery: 380,
    damage: 26,
    knockback: 460,
    knockbackUp: -220,
    hitstun: 520,
    range: 100,
    reachY: -66,
    height: 52,
    cooldown: 300,
    requiresGrounded: true,
    energyCost: 100,
  },
};

// ---------------------------------------------------------------------------
// Per-character special moves. Each fighter's special replaces the generic
// `special` entry above with something that looks and plays differently —
// see StickFighter._startAttack() / CombatController for how the extra
// fields (`hits`, `teleportBehind`, `pullOpponent`) are handled.
// ---------------------------------------------------------------------------
export const SPECIALS_BY_CHARACTER = {
  yellow: {
    id: 'special',
    name: 'MASSIVE HAYMAKER',
    poseWindup: 'yellowSpecialWindup',
    poseStrike: 'yellowSpecialStrike',
    startup: 340, // longer wind-up — telegraphs a single enormous swing
    active: 160,
    recovery: 400,
    damage: 40, // one huge hit instead of the old twin-hit flurry
    knockback: 540,
    knockbackUp: -220,
    hitstun: 560,
    range: 130,
    reachY: -66,
    height: 62,
    cooldown: 320,
    requiresGrounded: true,
    energyCost: 100,
    growPulse: 1.22, // briefly scales him up for a "putting his whole body into it" impact
  },
  barbarian: {
    id: 'special',
    name: 'GROUND SLAM',
    poseWindup: 'barbarianSpecialWindup',
    poseStrike: 'barbarianSpecialStrike',
    startup: 420,
    active: 150,
    recovery: 420,
    damage: 36,
    knockback: 500,
    knockbackUp: -180,
    hitstun: 560,
    range: 110,
    reachY: -40,
    height: 60,
    cooldown: 320,
    requiresGrounded: true,
    energyCost: 100,
    groundPound: true, // extra dust + heavier shake on landing the hit
  },
  shadowlord: {
    id: 'special',
    name: 'VOID LASER',
    poseWindup: 'shadowlordSpecialWindup',
    poseStrike: 'shadowlordSpecialStrike',
    startup: 240,
    active: 140,
    recovery: 300,
    damage: 18, // the close-range melee hit, in case the opponent is already in his face
    knockback: 340,
    knockbackUp: -140,
    hitstun: 420,
    range: 90,
    reachY: -60,
    height: 50,
    cooldown: 280,
    requiresGrounded: true,
    energyCost: 100,
    fireLaser: true, // also fires a full-screen piercing laser beam — see Projectile.js
  },
  gothliotic: {
    id: 'special',
    name: 'BLINK STRIKE',
    poseWindup: 'gothlioticSpecialWindup',
    poseStrike: 'gothlioticSpecialStrike',
    startup: 140,
    active: 110,
    recovery: 260,
    damage: 20,
    knockback: 380,
    knockbackUp: -160,
    hitstun: 420,
    range: 88,
    reachY: -66,
    height: 44,
    cooldown: 240,
    requiresGrounded: true,
    energyCost: 100,
  },
  gosths: {
    id: 'special',
    name: 'COLOSSAL GRASP',
    poseWindup: 'gosthsSpecialWindup',
    poseStrike: 'gosthsSpecialStrike',
    startup: 320,
    active: 150,
    recovery: 360,
    damage: 34,
    knockback: 520,
    knockbackUp: -220,
    hitstun: 500,
    range: 110,
    reachY: -70,
    height: 60,
    cooldown: 300,
    requiresGrounded: true,
    energyCost: 100,
    pullOpponent: true, // yanks the opponent in close before the hit lands
    growPulse: 1.55, // grows him massive for the grasp — see StickFighter sizeScale
  },
};

export function getSpecialFor(characterId) {
  return SPECIALS_BY_CHARACTER[characterId] || ATTACKS.special;
}

export function totalAttackDuration(attack) {
  return attack.startup + attack.active + attack.recovery;
}
