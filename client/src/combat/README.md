# combat/

Fully implemented. Contains:

- `Attack.js` — attack definitions (punch, kick, special, ultimate): damage, range, startup/active/recovery frames, and the per-character `SPECIALS_BY_CHARACTER` / `ULTIMATES_BY_CHARACTER` maps
- `Hitbox.js` — attack-side collision volume, spawned during an attack's active frames
- `Hurtbox.js` — receiving-side collision volume, always attached to a `StickFighter` (scales with `sizeScale` for grow/shrink effects)
- `CombatController.js` — resolves hitbox/hurtbox overlaps into damage, knockback, hit-stun, combo counting, and per-character passive damage multipliers
- `Projectile.js` — the ranged Power Blast system, plus special/ultimate-tier projectiles (e.g. Shadowlord's laser beam)
- `HitEffects.js` — particle/VFX functions (sparks, dust, screen shake, damage numbers, etc.)

Hitboxes/hurtboxes are simple rectangles positioned relative to the fighter's facing direction — not image-overlap checks, per the project spec.
