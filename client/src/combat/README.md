# combat/

Arrives in **Phase 2**. Will contain:

- `Attack.js` — attack definitions (punch, kick, special): damage, range, startup/active/recovery frames
- `Hitbox.js` — attack-side collision volume, spawned during an attack's active frames
- `Hurtbox.js` — receiving-side collision volume, always attached to a `StickFighter`
- `CombatController.js` — resolves hitbox/hurtbox overlaps into damage, knockback, and hit-stun, and drives `StickFighter.setState()` the same way movement does today

Hitboxes/hurtboxes will be simple rectangles (or small rectangle groups) positioned relative to the fighter's facing direction — not image-overlap checks, per the project spec.
