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

/** Small dust puff at the feet when landing from a fall. */
export function landingDust(scene, x, y, color = 0xd5ecfb) {
  for (let i = 0; i < 5; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const spread = (Math.random() * 0.6 + 0.2) * dir;
    const puff = scene.add.circle(x, y, 4 + Math.random() * 3, color, 0.35).setDepth(8);
    scene.tweens.add({
      targets: puff,
      x: x + spread * 40,
      y: y - Math.random() * 10,
      scale: 2.2,
      alpha: 0,
      duration: 300 + Math.random() * 120,
      ease: 'Cubic.easeOut',
      onComplete: () => puff.destroy(),
    });
  }
}

/** A short motion streak left behind while dashing. */
export function dashTrailStreak(scene, x, y, color, facing) {
  const streak = scene.add.rectangle(x, y, 40, 60, color, 0.3).setDepth(7);
  streak.scaleX = 0.4;
  scene.tweens.add({
    targets: streak,
    x: x - facing * 20,
    alpha: 0,
    scaleX: 0.1,
    duration: 220,
    ease: 'Cubic.easeOut',
    onComplete: () => streak.destroy(),
  });
}

/** A single faint ember drifting up off a fighter in Rage state. */
export function rageEmber(scene, x, y, color = 0xe23b3b) {
  const dx = (Math.random() - 0.5) * 30;
  const ember = scene.add.circle(x + dx, y, 3 + Math.random() * 2, color, 0.55).setDepth(9);
  scene.tweens.add({
    targets: ember,
    y: y - 50 - Math.random() * 20,
    x: x + dx * 1.5,
    alpha: 0,
    duration: 500 + Math.random() * 200,
    ease: 'Sine.easeOut',
    onComplete: () => ember.destroy(),
  });
}

/** Small burst when a fired power blast connects. */
export function powerImpact(scene, x, y, color) {
  const ring = scene.add.circle(x, y, 6, color, 0).setStrokeStyle(4, color, 1).setDepth(50);
  scene.tweens.add({
    targets: ring,
    scale: 3.2,
    alpha: { from: 1, to: 0 },
    duration: 260,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });
  spawnHitSpark(scene, x, y, color, false);
}

/** Floating damage number popup. */
export function damageNumber(scene, x, y, amount, big = false) {
  const text = scene.add
    .text(x + (Math.random() * 20 - 10), y, `-${Math.round(amount)}`, {
      fontFamily: 'Russo One, sans-serif',
      fontSize: big ? '26px' : '18px',
      color: big ? '#ff6b4a' : '#f4d232',
      stroke: '#0a0e14',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(65);

  scene.tweens.add({
    targets: text,
    y: y - 46,
    alpha: { from: 1, to: 0 },
    duration: 620,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}
