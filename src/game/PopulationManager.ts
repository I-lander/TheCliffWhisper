import { GameManager, GamePhase } from './GameManager';

export interface PopulationStats {
  spawnInterval: number; // ms between spawns (base: 800)
  walkSpeed: number; // pixels per second (base: 160)
  turnBackRate: number; // 0-1 probability (base: 0.3)
  dragRate: number; // 0-1 chance to drag +1 human (base: 0.1)
  birthRate: number; // humans added per day (base: 15)
  clickCooldown: number; // ms between manual clicks (base: 500)
}

const BASE_STATS: PopulationStats = {
  spawnInterval: 600,
  walkSpeed: 150,
  turnBackRate: 0.35,
  dragRate: 0.1,
  birthRate: 15,
  clickCooldown: 1000,
};

export class PopulationManager {
  population: number = 1000;
  jumped: number = 0;
  turnedBack: number = 0;
  born: number = 0;

  stats: PopulationStats = { ...BASE_STATS };

  private gameManager: GameManager;
  private birthAppliedThisDay: boolean = false;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;

    this.gameManager.onPhaseChange((phase) => {
      if (phase === GamePhase.Daytime) {
        this.onDayStart();
      }
      if (phase === GamePhase.Sunset) {
        this.onSunset();
      }
    });
  }

  private onDayStart() {
    this.birthAppliedThisDay = false;
    this.born = 0;
  }

  private onSunset() {
    if (!this.birthAppliedThisDay) {
      this.applyBirthRate();
    }
  }

  private applyBirthRate() {
    this.population += this.stats.birthRate;
    this.born = this.stats.birthRate;
    this.birthAppliedThisDay = true;
  }

  onHumanJumped() {
    this.population = Math.max(0, this.population - 1);
    this.jumped++;
  }

  onHumanTurnedBack() {
    this.turnedBack++;
  }

  shouldSpawnExtra(): boolean {
    return Math.random() < this.stats.dragRate;
  }

  shouldTurnBack(): boolean {
    return Math.random() < this.stats.turnBackRate;
  }

  isExtinct(): boolean {
    return this.population <= 0;
  }

  getCurrentBirthRate(): number {
    return this.stats.birthRate;
  }

  /**
   * Max humans that can jump per day based on auto-clicker throughput.
   * If birth rate exceeds this, extinction is mathematically impossible.
   * Returns 0 when there are no auto-clickers (pure manual = no hard cap).
   */
  getMaxKillsPerDay(dayDurationMs: number, autoClickerCount: number): number {
    if (autoClickerCount === 0) return 0;
    const spawnsPerDay = Math.floor(dayDurationMs / this.stats.spawnInterval) * autoClickerCount;
    const avgWithDrag = spawnsPerDay * (1 + this.stats.dragRate);
    const effectiveKills = avgWithDrag * (1 - this.stats.turnBackRate);
    return Math.floor(effectiveKills);
  }

  isDefeatInevitable(dayDurationMs: number, autoClickerCount: number): boolean {
    if (autoClickerCount === 0) return false; // manual clicks, never mathematically impossible
    return this.stats.birthRate >= this.getMaxKillsPerDay(dayDurationMs, autoClickerCount);
  }

  /** Snapshot of daily stats for the night summary */
  getDaySummary(): { jumped: number; turnedBack: number; born: number } {
    return {
      jumped: this.jumped,
      turnedBack: this.turnedBack,
      born: this.born,
    };
  }
}
