// ---------------------------------------------------------------------------
// CHARACTER ROSTER
//
// To add a new fighter later:
//   1. Drop a transparent PNG of the character into client/assets/characters/
//   2. Add an entry below with a unique `id`, the `texture` key, the file
//      `path`, and a `tint` (leave tint: null to use the image's own colors).
//   3. The character will automatically appear in Character Select.
//
// `scale` lets you normalize different-sized source art to a consistent
// in-game height. `anchorY` fine-tunes where the "feet" are for ground
// alignment if the artwork isn't perfectly cropped to the feet.
// ---------------------------------------------------------------------------

export const CHARACTERS = [
  {
    id: 'yellow',
    name: 'YELLOW',
    texture: 'char_yellow',
    path: 'assets/characters/yellow.png',
    headTexture: 'head_yellow',
    headPath: 'assets/characters/yellow_head.png',
    color: 0xfbe64d,
    outline: null,
    scale: 0.34,
    description: 'Balanced and relentless.',
    specialName: 'MASSIVE HAYMAKER',
    abilityName: 'Relentless',
    abilityDesc: 'Builds energy 20% faster than anyone else.',
    abilities: { energyRate: 1.2 },
  },
  {
    id: 'barbarian',
    name: 'POWERFUL BARBARIAN',
    texture: 'char_barbarian',
    path: 'assets/characters/barbarian.png',
    headTexture: 'head_barbarian',
    headPath: 'assets/characters/barbarian_head.png',
    color: 0x55b8f6,
    outline: null,
    scale: 0.34,
    description: 'Heavy hits, heavy presence.',
    specialName: 'GROUND SLAM',
    abilityName: 'Skybound Bruiser',
    abilityDesc: 'Heavy Punches and the special hit 30% harder, and he can fly — hold jump in the air to thrust upward on a fuel meter that refills on the ground.',
    abilities: { heavyDamageMult: 1.3, canFly: true },
  },
  {
    id: 'shadowlord',
    name: 'SHADOWLORD',
    texture: 'char_shadowlord',
    path: 'assets/characters/shadowlord.png',
    headTexture: 'head_shadowlord',
    headPath: 'assets/characters/shadowlord_head.png',
    color: 0x911df5,
    outline: null,
    scale: 0.34,
    description: 'Strikes from the dark.',
    specialName: 'VOID LASER',
    abilityName: 'Phantom Step',
    abilityDesc: 'Dashes 25% farther and recovers from it faster.',
    abilities: { dashSpeedMult: 1.25, dashCooldownMult: 0.7 },
  },
  {
    id: 'gothliotic',
    name: 'GOTHLIOTIC',
    texture: 'char_gothliotic',
    path: 'assets/characters/gothliotic.png',
    headTexture: 'head_gothliotic',
    headPath: 'assets/characters/gothliotic_head.png',
    color: 0xd5ecfb,
    outline: 0x2a2f3a,
    scale: 0.34,
    description: 'Fast, pale, unpredictable.',
    specialName: 'BLINK STRIKE',
    abilityName: 'Featherweight',
    abilityDesc: 'Super speed — moves and runs much faster than the rest — and kicks hit 30% harder.',
    abilities: { moveSpeedMult: 1.4, kickDamageMult: 1.3 },
  },
  {
    id: 'gosths',
    name: 'GOSTHS',
    texture: 'char_gosths',
    path: 'assets/characters/gosths.png',
    headTexture: 'head_gosths',
    headPath: 'assets/characters/gosths_head.png',
    color: 0x000000,
    outline: 0x8fa3b8,
    scale: 0.34,
    description: 'A silhouette that hits back.',
    specialName: 'COLOSSAL GRASP',
    abilityName: 'Unshaken',
    abilityDesc: 'Takes 20% less knockback from every hit, shrinks and gets harder to hit while crouching or blocking, and grows massive during his special.',
    abilities: { knockbackResist: 0.8, shrinkWhenGuarding: true },
  },
];

export function getCharacterById(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
