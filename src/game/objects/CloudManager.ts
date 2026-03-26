import { GamePhase } from '../GameManager';

interface Cloud {
  gfx: Phaser.GameObjects.Graphics;
  speed: number;
  x: number;
  y: number;
  width: number;
}

/**
 * Generate a pixel-art cloud shape as a Graphics object.
 * Uses stacked rows of filled rectangles to create a chunky, retro look.
 */
function drawPixelCloud(scene: Phaser.Scene, pu: number): { gfx: Phaser.GameObjects.Graphics; width: number } {
  const gfx = scene.add.graphics();

  const baseW = 10 + Math.floor(Math.random() * 10);
  const rows: { x: number; w: number }[] = [];

  rows.push({ x: 0, w: baseW });

  const midRows = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < midRows; i++) {
    const shrinkL = Math.floor(Math.random() * 2);
    const shrinkR = Math.floor(Math.random() * 2);
    const prevRow = rows[rows.length - 1];
    const w = Math.max(2, prevRow.w - shrinkL - shrinkR);
    const x = prevRow.x + shrinkL;
    rows.push({ x, w });
  }

  const bumps = 2 + Math.floor(Math.random() * 3);
  for (let b = 0; b < bumps; b++) {
    const bumpW = 2 + Math.floor(Math.random() * 4);
    const bumpX = Math.floor(Math.random() * (baseW - bumpW));
    rows.push({ x: bumpX, w: bumpW });
  }

  const blockSize = pu * 3;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRect(row.x * blockSize, -r * blockSize, row.w * blockSize, blockSize);
  }

  const totalWidth = baseW * blockSize;
  return { gfx, width: totalWidth };
}

export class CloudManager {
  private scene: Phaser.Scene;
  private clouds: Cloud[] = [];
  private tileSize: number;
  private canvasWidth: number;
  private phase: GamePhase = GamePhase.Daytime;
  private pu: number;

  /** Full vertical range of the world where clouds can exist. */
  private worldMinY: number;
  private worldMaxY: number;

  constructor(scene: Phaser.Scene, tileSize: number) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.canvasWidth = scene.cameras.main.width;
    this.pu = tileSize / 16;

    const canvasHeight = scene.cameras.main.height;
    // Clouds span from the top of the camera night range to just above the cliff
    this.worldMinY = -canvasHeight * 4;
    this.worldMaxY = canvasHeight * 0.35;

    // Spawn initial clouds spread across the full world space
    const totalHeight = this.worldMaxY - this.worldMinY;
    const count = Math.round(totalHeight / (tileSize * 3));
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.canvasWidth * 1.5 - this.canvasWidth * 0.25;
      const y = this.worldMinY + Math.random() * totalHeight;
      this.spawnCloud(x, y);
    }
  }

  private spawnCloud(startX?: number, fixedY?: number) {
    const y = fixedY ?? this.worldMinY + Math.random() * (this.worldMaxY - this.worldMinY);
    const x = startX ?? this.canvasWidth + this.tileSize * 3;
    const speed = 6 + Math.random() * 12;

    const { gfx, width } = drawPixelCloud(this.scene, this.pu);
    gfx.setPosition(x, y);
    gfx.setDepth(5);

    this.applyPhaseAlpha(gfx);

    this.clouds.push({ gfx, speed, x, y, width });
  }

  private applyPhaseAlpha(gfx: Phaser.GameObjects.Graphics) {
    if (this.phase === GamePhase.Night) {
      gfx.setAlpha(0.05);
    } else if (this.phase === GamePhase.Sunset) {
      gfx.setAlpha(0.08);
    } else {
      gfx.setAlpha(0.12);
    }
  }

  setPhase(phase: GamePhase) {
    this.phase = phase;
    for (const cloud of this.clouds) {
      this.applyPhaseAlpha(cloud.gfx);
    }
  }

  update(delta: number) {
    const dt = delta / 1000;

    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      cloud.x -= cloud.speed * dt;
      cloud.gfx.setX(cloud.x);

      // Remove if fully off-screen left, spawn a replacement at the same Y band
      if (cloud.x < -cloud.width - this.tileSize * 2) {
        const oldY = cloud.y;
        cloud.gfx.destroy();
        this.clouds.splice(i, 1);
        // Respawn at the right edge, at a similar Y with some variation
        const newY = oldY + (Math.random() - 0.5) * this.tileSize * 4;
        const clampedY = Math.max(this.worldMinY, Math.min(this.worldMaxY, newY));
        this.spawnCloud(this.canvasWidth + this.tileSize * 3, clampedY);
      }
    }
  }

  destroy() {
    for (const cloud of this.clouds) {
      cloud.gfx.destroy();
    }
    this.clouds = [];
  }
}
