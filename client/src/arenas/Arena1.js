// ---------------------------------------------------------------------------
// ARENA: "Neon Rooftop" (original, procedurally drawn — no external art)
//
// To add another arena later:
//   1. Copy this file to ArenaN.js and change the palette / silhouette shapes
//      (or load a background image instead of drawing one, if you prefer).
//   2. Export it and register it in ArenaScene's arena list.
// Ground height and boundaries are returned so ArenaScene can build matching
// physics colliders without duplicating layout numbers.
// ---------------------------------------------------------------------------

export const ARENA1 = {
  id: 'neon_rooftop',
  name: 'Neon Rooftop',
  description: 'City lights and rain-slick concrete.',
  previewColor: 0x1a2436,
  groundY: 600,
  leftBoundary: 60,
  rightBoundary: 1220,

  build(scene) {
    const { width, height } = scene.scale;
    const g = scene.add.graphics();

    // Sky gradient
    g.fillGradientStyle(0x1a2436, 0x1a2436, 0x0a0e16, 0x0a0e16, 1);
    g.fillRect(0, 0, width, height);

    // Distant city silhouette (procedural rectangles, original shapes)
    const buildings = scene.add.graphics();
    buildings.fillStyle(0x141c29, 1);
    let bx = -20;
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    while (bx < width + 20) {
      const bw = 40 + rand() * 70;
      const bh = 80 + rand() * 220;
      buildings.fillRect(bx, this.groundY - bh + 40, bw, bh);
      bx += bw + 10 + rand() * 20;
    }

    // Window lights
    buildings.fillStyle(0xf4d232, 0.5);
    for (let i = 0; i < 60; i++) {
      const wx = rand() * width;
      const wy = this.groundY - rand() * 220 - 20;
      if (rand() > 0.5) buildings.fillRect(wx, wy, 4, 6);
    }

    // Ground platform
    const ground = scene.add.graphics();
    ground.fillStyle(0x232c3d, 1);
    ground.fillRect(0, this.groundY, width, height - this.groundY);
    ground.lineStyle(4, 0xf4d232, 0.85);
    ground.lineBetween(0, this.groundY, width, this.groundY);

    // Subtle rooftop texture lines
    ground.lineStyle(1, 0x30394d, 0.6);
    for (let x = 0; x < width; x += 48) {
      ground.lineBetween(x, this.groundY + 6, x, height);
    }

    // Boundary markers (visual only — physics boundary added by ArenaScene)
    const edge = scene.add.graphics();
    edge.fillStyle(0xf4d232, 0.12);
    edge.fillRect(0, 0, this.leftBoundary, height);
    edge.fillRect(this.rightBoundary, 0, width - this.rightBoundary, height);

    // Ambient floating particles for depth
    for (let i = 0; i < 18; i++) {
      const px = rand() * width;
      const py = rand() * this.groundY;
      const dot = scene.add.circle(px, py, 1.5, 0x8fa3b8, 0.4);
      scene.tweens.add({
        targets: dot,
        y: py - 40,
        alpha: 0,
        duration: 4000 + rand() * 4000,
        repeat: -1,
        delay: rand() * 4000,
        ease: 'Sine.easeInOut',
      });
    }
  },
};
