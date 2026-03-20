import { GameManager, GamePhase } from '../GameManager';
import { PopulationStats } from '../PopulationManager';
import { DecorDef, DECOR_CATALOG } from './DecorData';

export interface PlacedDecor {
  def: DecorDef;
  slotIndex: number;
  /** If true, this decor sits on a hill (1 tile higher, with ground tile below) */
  elevated: boolean;
}

export class DecorManager {
  placed: PlacedDecor[] = [];
  totalSlots: number;
  private groundOccupied: Set<number> = new Set();
  private elevatedOccupied: Set<number> = new Set();

  /** Callback fired when a new decor appears (for rendering + notification) */
  private onDecorPlaced: (placed: PlacedDecor) => void = () => {};

  private stats: PopulationStats;
  private dayCount: number = 1;
  private active: boolean = false;
  private nextSpawnTimer: number = 0;

  constructor(cliffWidthPx: number, tileSize: number, stats: PopulationStats, gameManager: GameManager) {
    this.stats = stats;
    this.totalSlots = Math.floor(cliffWidthPx / tileSize);

    gameManager.onPhaseChange((phase, dayCount) => {
      this.dayCount = dayCount;
      if (phase === GamePhase.Daytime) {
        this.active = true;
        this.scheduleNext();
      } else {
        this.active = false;
      }
    });
  }

  setOnDecorPlaced(fn: (placed: PlacedDecor) => void) {
    this.onDecorPlaced = fn;
  }

  private isFull(): boolean {
    return this.groundOccupied.size >= this.totalSlots && this.elevatedOccupied.size >= this.totalSlots;
  }

  update(delta: number) {
    if (!this.active) return;
    if (this.isFull()) return;

    this.nextSpawnTimer -= delta;
    if (this.nextSpawnTimer <= 0) {
      this.placeOne();
      this.scheduleNext();
    }
  }

  private scheduleNext() {
    // Interval decreases with day count: starts ~15s, down to ~5s by day 5+
    const baseInterval = Math.max(5000, 18000 - this.dayCount * 2500);
    const variation = baseInterval * 0.4;
    this.nextSpawnTimer = baseInterval + (Math.random() - 0.5) * variation * 2;
  }

  private placeOne() {
    // Collect available positions: ground slots, and elevated slots (only where ground is occupied)
    const emptyGround: number[] = [];
    const emptyElevated: number[] = [];
    for (let i = 0; i < this.totalSlots; i++) {
      if (!this.groundOccupied.has(i)) {
        emptyGround.push(i);
      } else if (!this.elevatedOccupied.has(i)) {
        emptyElevated.push(i);
      }
    }

    if (emptyGround.length === 0 && emptyElevated.length === 0) return;

    const def = DECOR_CATALOG[Math.floor(Math.random() * DECOR_CATALOG.length)];

    // 30% chance to place elevated (hill) if possible, otherwise ground
    let elevated = false;
    let slotIndex: number;

    if (emptyElevated.length > 0 && (emptyGround.length === 0 || Math.random() < 0.3)) {
      elevated = true;
      slotIndex = emptyElevated[Math.floor(Math.random() * emptyElevated.length)];
      this.elevatedOccupied.add(slotIndex);
    } else if (emptyGround.length > 0) {
      slotIndex = emptyGround[Math.floor(Math.random() * emptyGround.length)];
      this.groundOccupied.add(slotIndex);
    } else {
      return;
    }

    const placed: PlacedDecor = { def, slotIndex, elevated };
    this.placed.push(placed);
    def.apply(this.stats);

    this.onDecorPlaced(placed);
  }

  /** Force spawn N decor elements immediately */
  forceSpawn(count: number) {
    for (let i = 0; i < count; i++) {
      if (this.isFull()) break;
      this.placeOne();
    }
  }

  /** Invert all placed decor effects (undo each, then apply reverse) */
  invertEffects() {
    for (const placed of this.placed) {
      placed.def.unapply(this.stats);
      placed.def.unapply(this.stats);
    }
  }

  /** Revert inversion: re-apply all effects normally twice */
  revertInversion() {
    for (const placed of this.placed) {
      placed.def.apply(this.stats);
      placed.def.apply(this.stats);
    }
  }

  getPlacedDecor(): PlacedDecor[] {
    return this.placed;
  }

  getOccupiedCount(): number {
    return this.groundOccupied.size + this.elevatedOccupied.size;
  }
}
