import { GameManager, GamePhase } from './GameManager';

export interface PopulationStats {
  walkSpeed: number; // pixels per second (base: 150)
  turnBackRate: number; // 0-1 probability (base: 0.35)
  dragRate: number; // 0-1 chance a turning-back human causes another to turn back when crossing (base: 0.1)
  birthRate: number; // integer — humans added per day at sunset (base: 15)
  birthratePerSec: number; // integer — humans spawned per second during day (base: 0)
  clickCooldown: number; // ms between clicks, shared player + auto-clickers (base: 1000)
}

const BASE_STATS: PopulationStats = {
  walkSpeed: 150,
  turnBackRate: 0.35,
  dragRate: 0.1,
  birthRate: 15,
  birthratePerSec: 0,
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

  /** When a human turns back and crosses another, chance the other turns back too */
  shouldDragTurnBack(): boolean {
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
   * Each auto-clicker fires once per cooldown cycle.
   */
  getMaxKillsPerDay(dayDurationMs: number, autoClickerCount: number): number {
    if (autoClickerCount === 0) return 0;
    const clicksPerDay = Math.floor(dayDurationMs / this.stats.clickCooldown) * autoClickerCount;
    const effectiveKills = clicksPerDay * (1 - this.stats.turnBackRate);
    return Math.floor(effectiveKills);
  }

  isDefeatInevitable(dayDurationMs: number, autoClickerCount: number): boolean {
    if (autoClickerCount === 0) return false;
    const totalBirthPerDay = this.stats.birthRate + this.stats.birthratePerSec * (dayDurationMs / 1000);
    return totalBirthPerDay >= this.getMaxKillsPerDay(dayDurationMs, autoClickerCount);
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
