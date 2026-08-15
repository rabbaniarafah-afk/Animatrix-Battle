// ---------------------------------------------------------------------------
// HitEffects — minimal, dependency-free impact feedback. Kept intentionally
// light-weight (a handful of tweened shapes) so it performs well in-browser;
// Phase 7 replaces/extends this with fuller particle polish.
// ---------------------------------------------------------------------------

export function spawnHitSpark(scene, x, y, color = 0xffffff, big = false) {
  const rays = big ? 8 : 6;
  const len = big ? 34 : 22;

  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + Math.random() * 0.3;
    const line = scene.add
      .rectangle(x, y, big ? 5 : 3, len, color, 1)
      .setRotation(angle)
      .setDepth(50);

    scene.tweens.add({
      targets: line,
      x: x + Math.cos(angle) * len * 1.6,
      y: y + Math.sin(angle) * len * 1.6,
      alpha: 0,
      scaleY: 0.2,
      duration: big ? 260 : 180,
      ease: 'Cubic.easeOut',
      onComplete: () => line.destroy(),
    });
  }

  const flash = scene.add.circle(x, y, big ? 26 : 16, 0xffffff, 0.9).setDepth(51);
  scene.tweens.add({
    targets: flash,
    scale: big ? 2.2 : 1.6,
    alpha: 0,
    duration: big ? 180 : 120,
    ease: 'Cubic.easeOut',
    onComplete: () => flash.destroy(),
  });
}

export function screenShake(scene, intensity = 0.006, duration = 120) {
  scene.cameras.main.shake(duration, intensity);
}

export function blockSpark(scene, x, y) {
  const ring = scene.add.circle(x, y, 10, 0x8fa3b8, 0).setStrokeStyle(3, 0xd5ecfb, 1).setDepth(50);
  scene.tweens.add({
    targets: ring,
    scale: 2.4,
    alpha: { from: 1, to: 0 },
    duration: 220,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });
}

/** Floating "X HIT COMBO" popup, used when a combo counter reaches 2+. */
export function comboText(scene, x, y, count) {
  const text = scene.add
    .text(x, y, `${count} HIT COMBO`, {
      fontFamily: 'Russo One, sans-serif',
      fontSize: '22px',
      color: '#f4d232',
      stroke: '#0a0e14',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(60)
    .setScale(0.7);

  scene.tweens.add({
    targets: text,
    scale: 1,
    y: y - 30,
    alpha: { from: 1, to: 0 },
    duration: 700,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}

/** Extra bright flourish for a landed special attack, on top of the normal hit spark. */
export function specialFlash(scene, x, y, color) {
  const ring = scene.add.circle(x, y, 8, color, 0).setStrokeStyle(5, 0xffffff, 1).setDepth(52);
  scene.tweens.add({
    targets: ring,
    scale: 5,
    alpha: { from: 1, to: 0 },
    duration: 320,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });

  const flash = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0xffffff, 0.25).setOrigin(0).setDepth(70);
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: 140,
    ease: 'Cubic.easeOut',
    onComplete: () => flash.destroy(),
  });
}
