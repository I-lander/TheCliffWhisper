import { GamePhase } from './GameManager';
import { PopulationStats } from './PopulationManager';
import { ConstellationBonuses, DEFAULT_BONUSES } from './constellations/ConstellationData';

const SAVE_KEY = 'cliff_whisper_save';

export interface SaveData {
  version: number;
  timestamp: number;

  // GameManager
  currentPhase: GamePhase;
  phaseElapsed: number;
  dayCount: number;

  // PopulationManager
  population: number;
  jumped: number;
  turnedBack: number;
  born: number;
  stats: PopulationStats;

  // ConstellationManager
  souls: number;
  unlockedNodes: string[];
  bonuses: ConstellationBonuses;
}

const CURRENT_VERSION = 2;

export class SaveManager {
  static save(data: SaveData): void {
    data.version = CURRENT_VERSION;
    data.timestamp = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  static load(): SaveData | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw) as SaveData;
      if (!data.version || !data.currentPhase) return null;
      // Migrate v1 saves: add deathMultiplier if missing
      if (data.stats && (data.stats as unknown as Record<string, unknown>).deathMultiplier === undefined) {
        data.stats.deathMultiplier = 1;
      }
      return data;
    } catch {
      return null;
    }
  }

  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  static getSaveTimestamp(): number | null {
    const data = this.load();
    return data?.timestamp ?? null;
  }
}
