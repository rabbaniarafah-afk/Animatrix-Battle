// ---------------------------------------------------------------------------
// ARENA: "Underground Dojo" (original, procedurally drawn — no external art)
// ---------------------------------------------------------------------------

export const ARENA3 = {
  id: 'underground_dojo',
  name: 'Underground Dojo',
  description: 'Torchlight, stone, and silence.',
  previewColor: 0xe8722f,
  groundY: 600,
  leftBoundary: 60,
  rightBoundary: 1220,

  build(scene) {
    const { width, height } = scene.scale;

    // Deep stone gradient
    const g = scene.add.graphics();
    g.fillGradientStyle(0x241a16, 0x241a16, 0x120c0a, 0x120c0a, 1);
    g.fillRect(0, 0, width, height);

    let seed = 55;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // Stone pillars
    const pillars = scene.add.graphics();
    pillars.fillStyle(0x35281f, 1);
    const pillarXs = [140, 420, 860, 1140];
    pillarXs.forEach((px) => {
      pillars.fillRect(px - 22, 60, 44, this.groundY - 60);
      pillars.fillStyle(0x1c130f, 1);
      pillars.fillRect(px - 30, 60, 60, 14);
      pillars.fillRect(px - 30, this.groundY - 30, 60, 14);
      pillars.fillStyle(0x35281f, 1);
    });

    // Torches with flickering glow
    pillarXs.forEach((px) => {
      const glow = scene.add.circle(px, 220, 26, 0xe8722f, 0.35);
      const flame = scene.add.circle(px, 220, 8, 0xffb04a, 0.95);
      scene.tweens.add({
        targets: [glow, flame],
        alpha: { from: 0.5, to: 1 },
        scale: { from: 0.85, to: 1.15 },
        duration: 260 + rand() * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Back wall carvings (simple geometric motif, original)
    const wall = scene.add.graphics();
    wall.lineStyle(2, 0x4a382c, 0.5);
    for (let x = 40; x < width; x += 90) {
      wall.strokeCircle(x, 150, 26);
    }

    // Floor
    const ground = scene.add.graphics();
    ground.fillStyle(0x2a201a, 1);
    ground.fillRect(0, this.groundY, width, height - this.groundY);
    ground.lineStyle(4, 0xe8722f, 0.7);
    ground.lineBetween(0, this.groundY, width, this.groundY);
    ground.lineStyle(1, 0x1c130f, 0.8);
    for (let x = 0; x < width; x += 64) {
      ground.lineBetween(x, this.groundY + 4, x, height);
    }
    // Floor mat outline
    ground.lineStyle(3, 0xb33a2a, 0.5);
    ground.strokeRect(this.leftBoundary + 40, this.groundY + 14, this.rightBoundary - this.leftBoundary - 80, height - this.groundY - 28);

    // Boundary markers
    const edge = scene.add.graphics();
    edge.fillStyle(0xe8722f, 0.1);
    edge.fillRect(0, 0, this.leftBoundary, height);
    edge.fillRect(this.rightBoundary, 0, width - this.rightBoundary, height);

    // Drifting dust motes
    for (let i = 0; i < 20; i++) {
      const px = rand() * width;
      const py = rand() * this.groundY;
      const dot = scene.add.circle(px, py, 1.2, 0xe8722f, 0.3);
      scene.tweens.add({
        targets: dot,
        y: py - 30,
        alpha: 0,
        duration: 3500 + rand() * 3500,
        repeat: -1,
        delay: rand() * 3500,
        ease: 'Sine.easeInOut',
      });
    }
  },
};
