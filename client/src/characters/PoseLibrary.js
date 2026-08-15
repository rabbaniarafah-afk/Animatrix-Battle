// ---------------------------------------------------------------------------
// PoseLibrary
//
// Every fighting state (idle, walk, attacks, hit reactions, ...) is defined
// here as one or more keyframe poses, authored in degrees for readability.
// AnimationController blends and sequences these every frame. Written as if
// the fighter always faces right — StickmanRig/AnimationController handle
// mirroring for facing left.
//
// Fields per pose:
//   hipDrop   px, positive = hip lowered (crouch/land/squash)
//   headTilt  radians, small head lean
//   lean      radians, whole-body rotation (authored separately, applied by
//             the controller as container rotation — see BASE_LEAN below)
//   armFront/armBack   { shoulder, elbow } radians
//   legFront/legBack   { hip, knee } radians
// ---------------------------------------------------------------------------

const D = Math.PI / 180;
const deg = (v) => v * D;

function pose({ hipDrop = 0, headTilt = 0, lean = 0, armFront, armBack, legFront, legBack }) {
  return {
    hipDrop,
    headTilt: deg(headTilt),
    lean: deg(lean),
    armFront: { shoulder: deg(armFront[0]), elbow: deg(armFront[1]) },
    armBack: { shoulder: deg(armBack[0]), elbow: deg(armBack[1]) },
    legFront: { hip: deg(legFront[0]), knee: deg(legFront[1]) },
    legBack: { hip: deg(legBack[0]), knee: deg(legBack[1]) },
  };
}

export const POSES = {
  idle: pose({
    armFront: [14, 18], armBack: [-10, 16],
    legFront: [7, 4], legBack: [-7, 4],
  }),

  walkA: pose({
    lean: 4,
    armFront: [-26, 14], armBack: [30, 20],
    legFront: [34, 8], legBack: [-30, 34],
  }),
  walkB: pose({
    lean: -4,
    armFront: [30, 20], armBack: [-26, 14],
    legFront: [-30, 34], legBack: [34, 8],
  }),

  runA: pose({
    lean: 14, hipDrop: -2,
    armFront: [-46, 20], armBack: [50, 26],
    legFront: [48, 12], legBack: [-42, 46],
  }),
  runB: pose({
    lean: -14, hipDrop: -2,
    armFront: [50, 26], armBack: [-46, 20],
    legFront: [-42, 46], legBack: [48, 12],
  }),

  jumpPrep: pose({
    hipDrop: 15, lean: -6,
    armFront: [-42, 30], armBack: [36, 12],
    legFront: [22, 48], legBack: [-16, 48],
  }),

  rise: pose({
    lean: -6,
    armFront: [-58, 12], armBack: [-48, 12],
    legFront: [-8, 58], legBack: [10, 58],
  }),

  fall: pose({
    lean: 4,
    armFront: [-20, 20], armBack: [-14, 18],
    legFront: [12, 22], legBack: [-10, 22],
  }),

  land: pose({
    hipDrop: 20, lean: 8,
    armFront: [-22, 12], armBack: [22, 12],
    legFront: [26, 56], legBack: [-20, 56],
  }),

  crouch: pose({
    hipDrop: 16, lean: 10,
    armFront: [8, 62], armBack: [-6, 56],
    legFront: [20, 40], legBack: [-15, 40],
  }),

  block: pose({
    hipDrop: 6, lean: 12,
    armFront: [4, 104], armBack: [-16, 82],
    legFront: [10, 12], legBack: [-10, 10],
  }),

  dash: pose({
    hipDrop: 5, lean: 34,
    armFront: [-30, 12], armBack: [42, 16],
    legFront: [42, 16], legBack: [-36, 22],
  }),

  // --- Light punch ---------------------------------------------------
  punchWindup: pose({
    lean: -9,
    armFront: [-38, 102], armBack: [16, 22],
    legFront: [10, 8], legBack: [-8, 6],
  }),
  punchStrike: pose({
    lean: 15,
    armFront: [72, 4], armBack: [-14, 20],
    legFront: [14, 6], legBack: [-4, 4],
  }),

  // --- Heavy punch -----------------------------------------------------
  heavyWindup: pose({
    hipDrop: -3, lean: -20,
    armFront: [-58, 112], armBack: [24, 24],
    legFront: [16, 12], legBack: [-14, 10],
  }),
  heavyStrike: pose({
    hipDrop: -4, lean: 30,
    armFront: [82, 0], armBack: [-20, 24],
    legFront: [20, 8], legBack: [-2, 4],
  }),

  // --- Kick --------------------------------------------------------------
  kickWindup: pose({
    hipDrop: 6, lean: -12,
    legFront: [-38, 84], legBack: [-6, 18],
    armFront: [-16, 30], armBack: [20, 20],
  }),
  kickStrike: pose({
    lean: 10,
    legFront: [74, 8], legBack: [-10, 14],
    armFront: [-24, 20], armBack: [24, 16],
  }),

  // --- Air attack ----------------------------------------------------
  airWindup: pose({
    lean: -6,
    legFront: [16, 58], legBack: [-6, 50],
    armFront: [-32, 60], armBack: [-20, 40],
  }),
  airStrike: pose({
    lean: 16,
    legFront: [62, 10], legBack: [-4, 40],
    armFront: [64, 8], armBack: [-16, 30],
  }),

  // --- Special attack (big telegraphed haymaker) ----------------------
  specialWindup: pose({
    hipDrop: -6, lean: -34, headTilt: 10,
    armFront: [-70, 130], armBack: [40, 30],
    legFront: [24, 16], legBack: [-20, 12],
  }),
  specialStrike: pose({
    hipDrop: -8, lean: 42,
    armFront: [90, -6], armBack: [-30, 30],
    legFront: [28, 10], legBack: [4, 6],
  }),

  // --- Reactions -------------------------------------------------------
  hitReact: pose({
    lean: -22, headTilt: -14,
    armFront: [-24, 34], armBack: [-34, 40],
    legFront: [-6, 18], legBack: [-16, 14],
  }),

  knockback: pose({
    lean: -32, headTilt: -10,
    armFront: [-50, 40], armBack: [-42, 34],
    legFront: [-22, 20], legBack: [-26, 16],
  }),

  defeat: pose({
    hipDrop: 30, lean: -70, headTilt: -20,
    armFront: [-70, 50], armBack: [-60, 46],
    legFront: [-30, 30], legBack: [-34, 26],
  }),
};

export function blendPose(a, b, t) {
  const lerp = (x, y) => Phaser.Math.Linear(x, y, t);
  return {
    hipDrop: lerp(a.hipDrop, b.hipDrop),
    headTilt: lerp(a.headTilt, b.headTilt),
    lean: lerp(a.lean, b.lean),
    armFront: { shoulder: lerp(a.armFront.shoulder, b.armFront.shoulder), elbow: lerp(a.armFront.elbow, b.armFront.elbow) },
    armBack: { shoulder: lerp(a.armBack.shoulder, b.armBack.shoulder), elbow: lerp(a.armBack.elbow, b.armBack.elbow) },
    legFront: { hip: lerp(a.legFront.hip, b.legFront.hip), knee: lerp(a.legFront.knee, b.legFront.knee) },
    legBack: { hip: lerp(a.legBack.hip, b.legBack.hip), knee: lerp(a.legBack.knee, b.legBack.knee) },
  };
}
