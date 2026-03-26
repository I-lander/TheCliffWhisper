import { GameManager, GamePhase } from './GameManager';

export const TURN_BACK_MIN = 0.05;
export const TURN_BACK_MAX = 0.80;
export const STAGNATION_LIMIT_MS = 30_000;

export interface PopulationStats {
  walkSpeed: number; // pixels per second (base: 120)
  turnBackRate: number; // 0-1 probability (base: 0.30)
  dragRate: number; // 0-1 chance a turning-back human causes another to turn back when crossing (base: 0.05)
  birthRate: number; // integer — humans added per day at sunset (base: 10)
  birthratePerSec: number; // integer — humans spawned per second during day (base: 0)
  clickCooldown: number; // ms between clicks, shared player + auto-clickers (base: 1000)
}

const BASE_STATS: PopulationStats = {
  walkSpeed: 120,
  turnBackRate: 0.30,
  dragRate: 0.05,
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

  /** Time since last human jumped (ms), tracked during Daytime only. */
  stagnationTimer: number = 0;

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
    this.stagnationTimer = 0;
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
    this.stagnationTimer = 0;
  }

  onHumanTurnedBack() {
    this.turnedBack++;
  }

  /** Clamp turn-back rate to safe bounds. Call before reading the rate. */
  getEffectiveTurnBackRate(): number {
    return Math.max(TURN_BACK_MIN, Math.min(TURN_BACK_MAX, this.stats.turnBackRate));
  }

  shouldTurnBack(): boolean {
    return Math.random() < this.getEffectiveTurnBackRate();
  }

  shouldDragTurnBack(): boolean {
    return Math.random() < this.stats.dragRate;
  }

  isExtinct(): boolean {
    return this.population <= 0;
  }

  /** Returns true if no human has jumped for too long during Daytime. */
  isStagnant(): boolean {
    return this.stagnationTimer >= STAGNATION_LIMIT_MS;
  }

  /** Call every frame during Daytime to track stagnation. */
  updateStagnation(delta: number) {
    this.stagnationTimer += delta;
  }

  getCurrentBirthRate(): number {
    return this.stats.birthRate;
  }

  getMaxKillsPerDay(dayDurationMs: number, autoClickerCount: number): number {
    if (autoClickerCount === 0) return 0;
    const clicksPerDay = Math.floor(dayDurationMs / this.stats.clickCooldown) * autoClickerCount;
    const effectiveKills = clicksPerDay * (1 - this.getEffectiveTurnBackRate());
    return Math.floor(effectiveKills);
  }

  isDefeatInevitable(dayDurationMs: number, autoClickerCount: number): boolean {
    if (autoClickerCount === 0) return false;
    const totalBirthPerDay = this.stats.birthRate + this.stats.birthratePerSec * (dayDurationMs / 1000);
    return totalBirthPerDay >= this.getMaxKillsPerDay(dayDurationMs, autoClickerCount);
  }

  getDaySummary(): { jumped: number; turnedBack: number; born: number } {
    return {
      jumped: this.jumped,
      turnedBack: this.turnedBack,
      born: this.born,
    };
  }
}
