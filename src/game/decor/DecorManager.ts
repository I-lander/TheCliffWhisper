import { GameManager, GamePhase } from '../GameManager';
import { PopulationStats } from '../PopulationManager';
import { DecorDef, DECOR_CATALOG } from './DecorData';

export interface PlacedDecor {
  def: DecorDef;
  slotIndex: number;
  /** 0 = ground level, 1+ = elevated (hill height in tiles) */
  elevation: number;
}

const MAX_ELEVATION = 3;

export class DecorManager {
  placed: PlacedDecor[] = [];
  totalSlots: number;
  /** Track occupation per slot: elevation level occupied (0=ground, 1=first hill, etc.) */
  private occupied: Map<number, number> = new Map(); // slot → max elevation placed

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
    for (let i = 1; i < this.totalSlots - 1; i++) {
      if ((this.occupied.get(i) ?? -1) < MAX_ELEVATION) return false;
    }
    return true;
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
    // Collect available positions — skip slot 0 and last slot (hills need 1 tile margin)
    const available: { slot: number; elevation: number }[] = [];
    for (let i = 1; i < this.totalSlots - 1; i++) {
      const currentLevel = this.occupied.get(i) ?? -1;
      if (currentLevel < MAX_ELEVATION) {
        available.push({ slot: i, elevation: currentLevel + 1 });
      }
    }

    if (available.length === 0) return;

    const def = DECOR_CATALOG[Math.floor(Math.random() * DECOR_CATALOG.length)];

    // Prefer ground level (elevation 0) first, then stack with 30% chance
    const groundSlots = available.filter((a) => a.elevation === 0);
    const elevatedSlots = available.filter((a) => a.elevation > 0);

    let pick: { slot: number; elevation: number };
    if (elevatedSlots.length > 0 && (groundSlots.length === 0 || Math.random() < 0.3)) {
      pick = elevatedSlots[Math.floor(Math.random() * elevatedSlots.length)];
    } else if (groundSlots.length > 0) {
      pick = groundSlots[Math.floor(Math.random() * groundSlots.length)];
    } else {
      return;
    }

    this.occupied.set(pick.slot, pick.elevation);

    const placed: PlacedDecor = { def, slotIndex: pick.slot, elevation: pick.elevation };
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
    return this.placed.length;
  }
}
