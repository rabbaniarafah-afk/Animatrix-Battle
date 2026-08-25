import { POSES, blendPose } from './PoseLibrary.js';
import { drawRig, RIG } from './StickmanRig.js';

// ---------------------------------------------------------------------------
// AnimationController
//
// Consumes a per-frame `animState` descriptor from StickFighter (its
// movement/attack/reaction state machine) and turns it into an actual
// skeletal pose, drawn every frame via StickmanRig. Attack states carry the
// SAME startup/active/recovery timings the combat system uses for hit
// detection, so the visible anticipation -> strike -> recovery always lines
// up with when a hit can actually land.
// ---------------------------------------------------------------------------

const Ease = Phaser.Math.Easing;

export class AnimationController {
  constructor(scene, color, outline, depth = 10, headTextureKey = null) {
    this.scene = scene;
    this.color = color;
    this.outline = outline;
    this.rig = scene.add.graphics().setDepth(depth);
    this.current = { ...POSES.idle };
    this.walkPhase = 0;
    this.lastSkeleton = null;

    this.headImage = null;
    this.headScale = 1;
    if (headTextureKey && scene.textures.exists(headTextureKey)) {
      this.headImage = scene.add.image(0, 0, headTextureKey).setDepth(depth + 1);
      const src = scene.textures.get(headTextureKey).getSourceImage();
      const targetDiameter = RIG.headR * 2.15;
      this.headScale = targetDiameter / Math.max(src.width, src.height);
      this.headImage.setScale(this.headScale);
    }
  }

  /**
   * @param {number} dt
   * @param {object} animState - see StickFighter._computeAnimState()
   * @param {object} transform - { feetX, feetY, facing }
   */
  update(dt, animState, transform) {
    let target = POSES.idle;
    let smoothRate = 0.2;

    switch (animState.kind) {
      case 'idle':
        target = POSES.idle;
        smoothRate = 0.12;
        break;

      case 'walk':
        this.walkPhase += dt * 0.012;
        target = blendPose(POSES.walkA, POSES.walkB, (Math.sin(this.walkPhase) + 1) / 2);
        smoothRate = 0.35;
        break;

      case 'run':
        this.walkPhase += dt * 0.02;
        target = blendPose(POSES.runA, POSES.runB, (Math.sin(this.walkPhase) + 1) / 2);
        smoothRate = 0.4;
        break;

      case 'crouch':
        target = POSES.crouch;
        smoothRate = 0.25;
        break;

      case 'block':
        target = POSES.block;
        smoothRate = 0.4;
        break;

      case 'dash':
        target = POSES.dash;
        smoothRate = 0.5;
        break;

      case 'jumpPrep':
        target = POSES.jumpPrep;
        smoothRate = 0.45;
        break;

      case 'rise':
        target = POSES.rise;
        smoothRate = 0.25;
        break;

      case 'fall':
        target = POSES.fall;
        smoothRate = 0.2;
        break;

      case 'land':
        target = POSES.land;
        smoothRate = 0.55;
        break;

      case 'attack': {
        const { phase, phaseT, attack } = animState;
        const windup = POSES[attack.poseWindup];
        const strike = POSES[attack.poseStrike];
        if (phase === 'startup') {
          target = blendPose(POSES.idle, windup, Ease.Quadratic.Out(phaseT));
        } else if (phase === 'active') {
          target = blendPose(windup, strike, Ease.Quadratic.In(Math.min(1, phaseT * 1.5)));
        } else {
          target = blendPose(strike, POSES.idle, Ease.Quadratic.Out(phaseT));
        }
        smoothRate = 0.65;
        break;
      }

      case 'hitReact':
        target = blendPose(POSES.hitReact, POSES.idle, Ease.Quadratic.In(animState.t || 0));
        smoothRate = 0.6;
        break;

      case 'knockback':
        target = POSES.knockback;
        smoothRate = 0.45;
        break;

      // Phased K.O. sequence: a sharp backward stagger, then a collapsing
      // fall, then settling into a flat down pose — driven by elapsed time
      // (animState.t, ms) rather than a single static pose.
      case 'defeat': {
        const t = animState.t || 0;
        if (t < 220) {
          target = blendPose(POSES.knockback, POSES.koStagger, Ease.Quadratic.Out(t / 220));
          smoothRate = 0.5;
        } else if (t < 600) {
          target = blendPose(POSES.koStagger, POSES.koCollapse, Ease.Quadratic.In((t - 220) / 380));
          smoothRate = 0.4;
        } else {
          target = blendPose(POSES.koCollapse, POSES.koFlat, Ease.Quadratic.Out(Math.min(1, (t - 600) / 300)));
          smoothRate = 0.3;
        }
        break;
      }

      case 'victory':
        target = POSES.victory;
        smoothRate = 0.15;
        break;

      default:
        target = POSES.idle;
    }

    this.current = blendPose(this.current, target, smoothRate);

    const dir = transform.facing >= 0 ? 1 : -1;
    const scale = transform.scale ?? 1;
    this.rig.setPosition(transform.feetX, transform.feetY);
    this.rig.setRotation(this.current.lean * dir);
    this.rig.setScale(dir * scale, scale);

    this.lastSkeleton = drawRig(this.rig, this.current, this.color, this.outline);

    if (this.headImage) {
      const headWorld = this._localToWorld(this.lastSkeleton.head, dir);
      this.headImage.setPosition(headWorld.x, headWorld.y);
      this.headImage.setRotation(this.rig.rotation);
      this.headImage.setScale(this.headScale * dir * scale, this.headScale * scale);
    }
  }

  /** Converts a rig-local point to world space using the same scale/rotate/translate the rig itself uses. */
  _localToWorld(p, dir) {
    const cos = Math.cos(this.rig.rotation);
    const sin = Math.sin(this.rig.rotation);
    const s = this.rig.scaleY; // size-scale magnitude (Y axis never flips sign, unlike X)
    const x = (p.x * dir * cos - p.y * sin) * s;
    const y = (p.x * dir * sin + p.y * cos) * s;
    return { x: this.rig.x + x, y: this.rig.y + y };
  }

  /** World-space position of the front hand, for spawning hit sparks precisely. */
  getFrontHandWorld() {
    if (!this.lastSkeleton) return { x: this.rig.x, y: this.rig.y };
    const dir = this.rig.scaleX >= 0 ? 1 : -1;
    return this._localToWorld(this.lastSkeleton.handFront, dir);
  }

  destroy() {
    this.rig.destroy();
    if (this.headImage) this.headImage.destroy();
  }
}
