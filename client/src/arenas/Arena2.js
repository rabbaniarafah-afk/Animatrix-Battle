// ---------------------------------------------------------------------------
// ARENA: "Sunset Docks" (original, procedurally drawn — no external art)
// ---------------------------------------------------------------------------

export const ARENA2 = {
  id: 'sunset_docks',
  name: 'Sunset Docks',
  description: 'Warm light over creaking wood and water.',
  previewColor: 0xd9702f,
  groundY: 600,
  leftBoundary: 60,
  rightBoundary: 1220,

  build(scene) {
    const { width, height } = scene.scale;

    // Warm sunset sky gradient
    const g = scene.add.graphics();
    g.fillGradientStyle(0x3a2a4a, 0x3a2a4a, 0xd9702f, 0xd9702f, 1);
    g.fillRect(0, 0, width, height * 0.7);
    g.fillGradientStyle(0xd9702f, 0xd9702f, 0x4a2a1a, 0x4a2a1a, 1);
    g.fillRect(0, height * 0.55, width, height * 0.2);

    // Sun
    const sun = scene.add.circle(width * 0.7, height * 0.42, 70, 0xffcf6b, 0.9);
    scene.tweens.add({ targets: sun, alpha: 0.7, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Distant silhouette masts/cranes (procedural, original shapes)
    const structures = scene.add.graphics();
    structures.fillStyle(0x1f1420, 1);
    let seed = 21;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    let bx = -10;
    while (bx < width + 20) {
      const bw = 8 + rand() * 6;
      const bh = 120 + rand() * 160;
      structures.fillRect(bx, this.groundY - bh, bw, bh);
      structures.fillRect(bx - 30, this.groundY - bh + 20, bw + 60, 6); // crossbeam
      bx += 140 + rand() * 120;
    }

    // Water strip below the dock line with shimmer
    const water = scene.add.graphics();
    water.fillStyle(0x2a3a4a, 1);
    water.fillRect(0, this.groundY - 26, width, 26);
    for (let i = 0; i < 24; i++) {
      const wx = rand() * width;
      const shimmer = scene.add.rectangle(wx, this.groundY - 10 - rand() * 10, 20 + rand() * 20, 2, 0xffcf6b, 0.4);
      scene.tweens.add({
        targets: shimmer,
        alpha: 0,
        duration: 900 + rand() * 900,
        repeat: -1,
        yoyo: true,
        delay: rand() * 900,
      });
    }

    // Dock planks
    const ground = scene.add.graphics();
    ground.fillStyle(0x3a2a20, 1);
    ground.fillRect(0, this.groundY, width, height - this.groundY);
    ground.lineStyle(4, 0xffcf6b, 0.85);
    ground.lineBetween(0, this.groundY, width, this.groundY);
    ground.lineStyle(2, 0x241812, 0.7);
    for (let x = 0; x < width; x += 56) {
      ground.lineBetween(x, this.groundY + 6, x, height);
    }

    // Boundary markers
    const edge = scene.add.graphics();
    edge.fillStyle(0xffcf6b, 0.1);
    edge.fillRect(0, 0, this.leftBoundary, height);
    edge.fillRect(this.rightBoundary, 0, width - this.rightBoundary, height);

    // Drifting gulls (simple chevron shapes)
    for (let i = 0; i < 4; i++) {
      const gy = 80 + rand() * 160;
      const gull = scene.add.text(-40, gy, '^', { fontFamily: 'Arial', fontSize: '18px', color: '#2a1a2a' }).setAlpha(0.6);
      scene.tweens.add({
        targets: gull,
        x: width + 40,
        duration: 14000 + rand() * 6000,
        repeat: -1,
        delay: rand() * 6000,
        ease: 'Linear',
      });
    }
  },
};
