// ---------------------------------------------------------------------------
// StickmanRig
//
// Draws a fighter as a true jointed skeleton (hip, chest, head, two arms of
// two segments each, two legs of two segments each) using Phaser Graphics,
// instead of pasting a flat static image on screen. Every attack, reaction,
// and movement state reshapes these joint angles (see PoseLibrary.js /
// AnimationController.js), so limbs actually bend, swing, and extend.
//
// Coordinate convention: the rig is always authored as if facing RIGHT with
// feet at local (0,0). AnimationController flips the whole rig horizontally
// (negative scaleX) when the fighter faces left — so pose keyframes never
// need to know about facing direction.
// ---------------------------------------------------------------------------

export const RIG = {
  legLen: 64, // upper + lower leg, straight
  upperLeg: 32,
  lowerLeg: 32,
  torso: 46,
  neck: 8,
  headR: 15,
  shoulderW: 13,
  hipW: 7,
  upperArm: 27,
  lowerArm: 23,
  limbWidth: 13,
  jointR: 7,
};

function project(originX, originY, angle, len) {
  return { x: originX + Math.sin(angle) * len, y: originY + Math.cos(angle) * len };
}

/**
 * Computes every joint's LOCAL position (feet at 0,0) from a pose descriptor.
 * pose fields: hipDrop, headTilt, armFront{shoulder,elbow}, armBack{...},
 * legFront{hip,knee}, legBack{...}
 */
export function computeSkeleton(pose) {
  const hip = { x: 0, y: -RIG.legLen + pose.hipDrop };
  const chest = { x: 0, y: hip.y - RIG.torso };
  const neckTop = { x: 0, y: chest.y - RIG.neck };
  const head = { x: Math.sin(pose.headTilt) * 6, y: neckTop.y - RIG.headR - 2 };

  const shoulderFront = { x: chest.x + RIG.shoulderW, y: chest.y + 5 };
  const shoulderBack = { x: chest.x - RIG.shoulderW, y: chest.y + 5 };
  const elbowFront = project(shoulderFront.x, shoulderFront.y, pose.armFront.shoulder, RIG.upperArm);
  const handFront = project(elbowFront.x, elbowFront.y, pose.armFront.shoulder + pose.armFront.elbow, RIG.lowerArm);
  const elbowBack = project(shoulderBack.x, shoulderBack.y, pose.armBack.shoulder, RIG.upperArm);
  const handBack = project(elbowBack.x, elbowBack.y, pose.armBack.shoulder + pose.armBack.elbow, RIG.lowerArm);

  const hipFront = { x: hip.x + RIG.hipW, y: hip.y };
  const hipBack = { x: hip.x - RIG.hipW, y: hip.y };
  const kneeFront = project(hipFront.x, hipFront.y, pose.legFront.hip, RIG.upperLeg);
  const footFront = project(kneeFront.x, kneeFront.y, pose.legFront.hip + pose.legFront.knee, RIG.lowerLeg);
  const kneeBack = project(hipBack.x, hipBack.y, pose.legBack.hip, RIG.upperLeg);
  const footBack = project(kneeBack.x, kneeBack.y, pose.legBack.hip + pose.legBack.knee, RIG.lowerLeg);

  return {
    hip, chest, neckTop, head,
    shoulderFront, elbowFront, handFront,
    shoulderBack, elbowBack, handBack,
    hipFront, kneeFront, footFront,
    hipBack, kneeBack, footBack,
  };
}

/**
 * Redraws the given (already-cleared) Graphics object from a pose.
 * @param {Phaser.GameObjects.Graphics} g
 * @param {object} pose
 * @param {number} color - hex fill/stroke color
 * @param {number} outline - stroke color for the outline pass (for the
 *   near-white "Gothliotic" fighter this gives contrast against light bg)
 */
export function drawRig(g, pose, color, outline) {
  const s = computeSkeleton(pose);
  g.clear();

  const drawLimb = (a, b) => {
    g.lineStyle(RIG.limbWidth, color, 1);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.strokePath();
    g.fillStyle(color, 1);
    g.fillCircle(a.x, a.y, RIG.jointR);
    g.fillCircle(b.x, b.y, RIG.jointR);
  };

  // Back limbs first (rendered behind torso/front limbs)
  drawLimb(s.hipBack, s.kneeBack);
  drawLimb(s.kneeBack, s.footBack);
  drawLimb(s.shoulderBack, s.elbowBack);
  drawLimb(s.elbowBack, s.handBack);

  // Torso
  g.lineStyle(RIG.limbWidth + 2, color, 1);
  g.beginPath();
  g.moveTo(s.hip.x, s.hip.y);
  g.lineTo(s.chest.x, s.chest.y);
  g.strokePath();

  // Neck — bridges the torso up into the head image so there's no gap
  g.lineStyle(RIG.limbWidth, color, 1);
  g.beginPath();
  g.moveTo(s.chest.x, s.chest.y);
  g.lineTo(s.head.x, s.head.y + RIG.headR * 0.5);
  g.strokePath();

  // Front leg
  drawLimb(s.hipFront, s.kneeFront);
  drawLimb(s.kneeFront, s.footFront);

  // Head is rendered separately as the character's own artwork (see
  // AnimationController), not drawn here — this keeps the in-game fighter's
  // head matching the Character Select portrait instead of a generic circle.

  // Front arm (drawn last so it reads in front of the torso)
  drawLimb(s.shoulderFront, s.elbowFront);
  drawLimb(s.elbowFront, s.handFront);

  return s; // caller may want handFront/footFront/head world position
}
