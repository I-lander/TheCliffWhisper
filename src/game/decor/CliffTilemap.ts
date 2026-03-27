/**
 * 2D tilemap for the cliff surface and hills.
 * Sprites are added directly to the scene (not a container)
 * so that depth sorting works correctly across rows.
 */

export interface TileCell {
  col: number;
  row: number;
  solid: boolean;
  sprite: Phaser.GameObjects.Image | null;
  grassSprite: Phaser.GameObjects.Image | null;
  elementSprite: Phaser.GameObjects.Image | null;
  elementId: string | null;
}

const GROUND_FRAME = 15 * 16 + 1;
const CORNER_FRAME = 15 * 16 + 2;
const GRASS_FRAMES = [14 * 16 + 0, 14 * 16 + 1, 14 * 16 + 2];
const GRASS_CHANCE = 0.4;

export class CliffTilemap {
  private grid: TileCell[][] = [];
  private scene: Phaser.Scene;
  private tileSize: number;
  private originX: number;
  private originY: number;
  readonly cols: number;
  readonly rows: number;

  constructor(
    scene: Phaser.Scene,
    cols: number,
    rows: number,
    tileSize: number,
    originX: number,
    originY: number,
  ) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.cols = cols;
    this.rows = rows;
    this.originX = originX;
    this.originY = originY;

    for (let r = 0; r < rows; r++) {
      const row: TileCell[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          col: c, row: r,
          solid: r === rows - 1,
          sprite: null, grassSprite: null, elementSprite: null, elementId: null,
        });
      }
      this.grid.push(row);
    }
  }

  getCell(col: number, row: number): TileCell | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.grid[row][col];
  }

  isSolid(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.grid[row][col].solid;
  }

  setSolid(col: number, row: number) {
    const cell = this.getCell(col, row);
    if (!cell || cell.solid) return;
    cell.solid = true;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        this.refreshSprite(col + dc, row + dr);
      }
    }
  }

  placeElement(col: number, row: number, frameIndex: number, elementId: string): Phaser.GameObjects.Image | null {
    const cell = this.getCell(col, row);
    if (!cell || !cell.solid || cell.elementId) return null;

    const scale = this.tileSize / 16;
    const wx = this.originX + col * this.tileSize;
    const wy = this.originY + row * this.tileSize - this.tileSize;
    // Element depth: just above its terrain row, but behind rows below
    const depth = row * 10 + 5;

    const sprite = this.scene.add.image(wx, wy, 'worldElement', frameIndex)
      .setOrigin(0, 0)
      .setScale(scale)
      .setAlpha(0)
      .setDepth(depth);

    cell.elementSprite = sprite;
    cell.elementId = elementId;

    this.scene.tweens.add({
      targets: sprite,
      alpha: 1,
      scaleX: scale * 1.3, scaleY: scale * 1.3,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: sprite,
          scaleX: scale, scaleY: scale,
          duration: 200, ease: 'Power2',
        });
      },
    });

    return sprite;
  }

  getTopSolidRow(col: number): number {
    for (let r = 0; r < this.rows; r++) {
      if (this.isSolid(col, r)) return r;
    }
    return -1;
  }

  renderAll() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].solid) {
          this.refreshSprite(c, r);
        }
      }
    }
  }

  private refreshSprite(col: number, row: number) {
    const cell = this.getCell(col, row);
    if (!cell) return;

    if (cell.sprite) { cell.sprite.destroy(); cell.sprite = null; }
    if (cell.grassSprite) { cell.grassSprite.destroy(); cell.grassSprite = null; }
    if (!cell.solid) return;

    const scale = this.tileSize / 16;
    const wx = this.originX + col * this.tileSize;
    const wy = this.originY + row * this.tileSize;
    const tint = this.getTintForRow(row);

    const above = this.isSolid(col, row - 1);
    const left = this.isSolid(col - 1, row);
    const right = this.isSolid(col + 1, row);

    let frame: number;
    let flipX = false;

    if (!above && !left && !right) {
      frame = CORNER_FRAME;
    } else if (!above && left && right) {
      frame = GROUND_FRAME;
    } else if (!above && left && !right) {
      frame = CORNER_FRAME;
    } else if (!above && !left && right) {
      frame = CORNER_FRAME;
      flipX = true;
    } else {
      frame = GROUND_FRAME;
    }

    // Depth: lower rows on screen (higher row index = closer to bottom) render in front
    const depth = row * 10;

    const img = this.scene.add.image(wx, wy, 'worldElement', frame)
      .setOrigin(0, 0)
      .setScale(scale)
      .setTintFill(tint)
      .setFlipX(flipX)
      .setDepth(depth);

    cell.sprite = img;

    // Grass on exposed top tiles
    if (!above && Math.random() < GRASS_CHANCE) {
      const grassFrame = GRASS_FRAMES[Math.floor(Math.random() * GRASS_FRAMES.length)];
      const grassY = wy - this.tileSize;
      cell.grassSprite = this.scene.add.image(wx, grassY, 'worldElement', grassFrame)
        .setOrigin(0, 0)
        .setScale(scale)
        .setTintFill(tint)
        .setDepth(depth + 6);
    }
  }

  /** Darken higher rows via tint (opaque, no alpha stacking). */
  private getTintForRow(row: number): number {
    const distFromBottom = this.rows - 1 - row;
    // Bottom row = 0x33 (dark grey, matching cliff). Each level up lightens.
    const v = Math.min(0x55, 0x22 + distFromBottom * 0x0c);
    return (v << 16) | (v << 8) | v;
  }
}
