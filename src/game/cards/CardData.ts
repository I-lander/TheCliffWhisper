import { PopulationStats } from '../PopulationManager';
import { ConstellationBonuses } from '../constellations/ConstellationData';

export type CardTier = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface CardEffect {
  play: (ctx: CardContext) => void;
  penalty: (ctx: CardContext) => void;
}

export interface CardContext {
  stats: PopulationStats;
  bonuses: ConstellationBonuses;
  population: () => number;
  setPopulation: (n: number) => void;
  addTimedEffect: (durationMs: number, apply: () => void, revert: () => void) => void;
  spawnWave: (count: number) => void;
  setNextSpawnDragOverride: (count: number) => void;
  humansOnScreen: () => number;
  humansNearEdge: () => number;
  forceAllJump: () => void;
  forceNextNJump: (n: number) => void;
  decorCount: () => number;
  setChainSpawn: (active: boolean) => void;
  setCascadeJump: (active: boolean) => void;
  setInvertDecor: (active: boolean) => void;
  setOnDecorCallback: (fn: (() => void) | null) => void;
  invertDecorEffects: () => void;
  revertDecorEffects: () => void;
}

export interface CardDef {
  id: string;
  name: string;
  tier: CardTier;
  flavor: string;
  effectText: string;
  penaltyText: string;
  singleUsePerRun?: boolean;
  effect: CardEffect;
}

const TIER_COLORS: Record<CardTier, string> = {
  common: '#aaaaaa',
  uncommon: '#bb77ff',
  rare: '#ff4444',
  legendary: '#ffaa00',
};

export function getTierColor(tier: CardTier): string {
  return TIER_COLORS[tier];
}

export const ALL_CARDS: CardDef[] = [
  // ---- COMMON (no penalty, timing still matters) ----
  {
    id: 'black_tide',
    name: 'Black Tide',
    tier: 'common',
    flavor: 'They feel the call. Just a little stronger.',
    effectText: 'Spawn 10 humans (+ Reaper bonus), ignore turn-back',
    penaltyText: 'None',
    effect: {
      play: (ctx) => {
        const count = 10 + Math.round(ctx.stats.dragRate * 30);
        ctx.forceNextNJump(count);
        ctx.spawnWave(count);
      },
      penalty: () => {},
    },
  },
  {
    id: 'evening_mist',
    name: 'Evening Mist',
    tier: 'common',
    flavor: 'The path back disappears into the fog.',
    effectText: 'Auto-clickers 2x faster for 20s',
    penaltyText: 'None',
    effect: {
      play: (ctx) => {
        const orig = ctx.stats.spawnInterval;
        ctx.addTimedEffect(
          20_000,
          () => {
            ctx.stats.spawnInterval = Math.round(orig * 0.5);
          },
          () => {
            ctx.stats.spawnInterval = orig;
          },
        );
      },
      penalty: () => {},
    },
  },

  // ---- UNCOMMON (moderate penalty, screen-state dependent) ----
  {
    id: 'whisper_of_the_abyss',
    name: 'Whisper of the Abyss',
    tier: 'uncommon',
    flavor: 'He has been speaking to their dreams for weeks.',
    effectText: 'All humans on screen walk 3x faster for 10s',
    penaltyText: '+25% birth rate this day',
    effect: {
      play: (ctx) => {
        const orig = ctx.stats.walkSpeed;
        ctx.addTimedEffect(
          10_000,
          () => {
            ctx.stats.walkSpeed = orig * 3;
          },
          () => {
            ctx.stats.walkSpeed = orig;
          },
        );
      },
      penalty: (ctx) => {
        ctx.stats.birthRate = Math.round(ctx.stats.birthRate * 1.25);
      },
    },
  },
  {
    id: 'suspended_hour',
    name: 'Suspended Hour',
    tier: 'uncommon',
    flavor: 'The sun hesitates. One more minute.',
    effectText: 'Day extended by 30s',
    penaltyText: '+20% birth rate',
    effect: {
      play: () => {
        // Handled by DeckManager — extends day timer
      },
      penalty: (ctx) => {
        ctx.stats.birthRate = Math.round(ctx.stats.birthRate * 1.2);
      },
    },
  },
  {
    id: 'vow_of_fragility',
    name: 'Vow of Fragility',
    tier: 'uncommon',
    flavor: 'Their feet can no longer turn around.',
    effectText: 'Turn-back = 0 until next decor appears',
    penaltyText: '+20% birth rate, +15% turn-back',
    effect: {
      play: (ctx) => {
        const orig = ctx.stats.turnBackRate;
        ctx.stats.turnBackRate = 0;
        // Set callback: when next decor pops, revert
        ctx.setOnDecorCallback(() => {
          ctx.stats.turnBackRate = orig;
        });
      },
      penalty: (ctx) => {
        ctx.stats.birthRate = Math.round(ctx.stats.birthRate * 1.2);
        ctx.stats.turnBackRate = Math.min(1, ctx.stats.turnBackRate + 0.15);
      },
    },
  },

  // ---- RARE (heavy penalty, high impact, screen-dependent) ----
  {
    id: 'call_of_the_void',
    name: 'Call of the Void',
    tier: 'rare',
    flavor: 'It is not a fall. It is a return.',
    effectText: 'All on-screen humans jump + spawn 5',
    penaltyText: '+40% birth rate, turn-back x2',
    effect: {
      play: (ctx) => {
        ctx.forceAllJump();
        ctx.spawnWave(5);
      },
      penalty: (ctx) => {
        ctx.stats.birthRate = Math.round(ctx.stats.birthRate * 1.4);
        ctx.stats.turnBackRate = Math.min(1, ctx.stats.turnBackRate * 2);
      },
    },
  },
  {
    id: 'soul_eclipse',
    name: 'Soul Eclipse',
    tier: 'rare',
    flavor: 'The light that guided them has gone out.',
    effectText: 'Birth rate = 0 rest of day, but spawns x2 slower',
    penaltyText: 'Birth rate x2, +25% turn-back',
    effect: {
      play: (ctx) => {
        const origBR = ctx.stats.birthRate;
        const origSI = ctx.stats.spawnInterval;
        ctx.addTimedEffect(
          999_000,
          () => {
            ctx.stats.birthRate = 0;
            ctx.stats.spawnInterval = origSI * 2;
          },
          () => {
            ctx.stats.birthRate = origBR;
            ctx.stats.spawnInterval = origSI;
          },
        );
      },
      penalty: (ctx) => {
        ctx.stats.birthRate = ctx.stats.birthRate * 2;
        ctx.stats.turnBackRate = Math.min(1, ctx.stats.turnBackRate + 0.25);
      },
    },
  },
  {
    id: 'cursed_procession',
    name: 'Cursed Procession',
    tier: 'rare',
    flavor: 'They walk. They sing. They do not stop.',
    effectText: 'Each jump spawns the next for 25s (+ Void bonus)',
    penaltyText: '+35% birth rate',
    effect: {
      play: (ctx) => {
        const duration = 25_000;
        ctx.setChainSpawn(true);
        ctx.addTimedEffect(
          duration,
          () => {},
          () => {
            ctx.setChainSpawn(false);
          },
        );
      },
      penalty: (ctx) => {
        ctx.stats.birthRate = Math.round(ctx.stats.birthRate * 1.35);
      },
    },
  },

  // ---- LEGENDARY (severe penalty, game-changing, single use) ----
  {
    id: 'the_last_sermon',
    name: 'The Last Sermon',
    tier: 'legendary',
    flavor: 'His voice convinced empires. It will convince a species.',
    effectText: 'Pop -10%. Jumps cascade to nearest human for 30s',
    penaltyText: '+60% birth rate rest of run',
    singleUsePerRun: true,
    effect: {
      play: (ctx) => {
        const pop = ctx.population();
        ctx.setPopulation(Math.round(pop * 0.9));
        ctx.setCascadeJump(true);
        ctx.addTimedEffect(
          30_000,
          () => {},
          () => {
            ctx.setCascadeJump(false);
          },
        );
      },
      penalty: (ctx) => {
        ctx.stats.birthRate = Math.round(ctx.stats.birthRate * 1.6);
      },
    },
  },
  {
    id: 'memory_of_extinction',
    name: 'Memory of Extinction',
    tier: 'legendary',
    flavor: 'He remembers having succeeded before.',
    effectText: 'Invert all decor effects this day',
    penaltyText: '+50% birth rate, +40% turn-back',
    singleUsePerRun: true,
    effect: {
      play: (ctx) => {
        ctx.invertDecorEffects();
        ctx.addTimedEffect(
          999_000,
          () => {},
          () => {
            ctx.revertDecorEffects();
          },
        );
      },
      penalty: (ctx) => {
        ctx.stats.birthRate = Math.round(ctx.stats.birthRate * 1.5);
        ctx.stats.turnBackRate = Math.min(1, ctx.stats.turnBackRate + 0.4);
      },
    },
  },
];
