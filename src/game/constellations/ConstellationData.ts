import { PopulationStats } from '../PopulationManager';

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  x: number;
  y: number;
  apply: (stats: PopulationStats, bonuses: ConstellationBonuses) => void;
}

export interface SkillTree {
  id: string;
  name: string;
  color: string;
  nodes: SkillNode[];
  edges: [number, number][];
}

export interface ConstellationBonuses {
  /** Multiplier applied to walk speed (stacks multiplicatively) */
  walkSpeedBonus: number;
  /** Extra seconds added to day duration by Suspended Hour card */
  extraDaySeconds: number;
  /** Per-jump probability to drop a card [0, 1] */
  cardDropRate: number;
  /** Number of active auto-clickers (each spawns at stats.spawnInterval rate) */
  autoClickerCount: number;
}

export const DEFAULT_BONUSES: ConstellationBonuses = {
  walkSpeedBonus: 1.0,
  extraDaySeconds: 0,
  cardDropRate: 0,
  autoClickerCount: 0,
};

/*
  Single constellation with 7 branches from a root node.
  Positions are organic (not grid-aligned) to evoke a real constellation.

  Index map:
    0          : Root
    1–4        : Auto-Clicker branch  (ac_1 … ac_4)
    5–8        : Faith branch         (fa_1 … fa_4)  — turn-back rate
    9–11       : Haste branch         (ha_1 … ha_3)  — walk speed
    12–15      : Tide branch          (ti_1 … ti_4)  — drag rate
    16–19      : Void branch          (vo_1 … vo_4)  — birth rate
    20–23      : Omen branch          (om_1 … om_4)  — card drop rate
    24–26      : Cooldown branch      (cc_1 … cc_3)  — click cooldown

  Edges: each branch is a linear chain from the root.
*/

const TREE: SkillTree = {
  id: 'whisper',
  name: 'The Ancient God',
  color: '#aaccff',
  edges: [
    [0, 1], [1, 2], [2, 3], [3, 4],            // auto-clicker
    [0, 5], [5, 6], [6, 7], [7, 8],            // faith
    [0, 9], [9, 10], [10, 11],                 // haste
    [0, 12], [12, 13], [13, 14], [14, 15],     // tide
    [0, 16], [16, 17], [17, 18], [18, 19],     // void
    [0, 20], [20, 21], [21, 22], [22, 23],     // omen
    [0, 24], [24, 25], [25, 26],               // cooldown
  ],
  nodes: [
    // ── Root ──────────────────────────────────────────────────────
    {
      id: 'root', name: 'The First Whisper', cost: 5,
      description: 'Turn-back rate -0.03',
      x: 0, y: 0.82,
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.03); },
    },

    // ── Auto-Clicker branch (far left, curving) ──────────────────
    {
      id: 'ac_1', name: 'Whisper', cost: 3,
      description: 'Unlock 1st auto-clicker',
      x: -0.62, y: 0.48,
      apply: (_s, b) => { b.autoClickerCount++; },
    },
    {
      id: 'ac_2', name: 'Echo', cost: 5,
      description: '+1 auto-clicker',
      x: -0.80, y: 0.18,
      apply: (_s, b) => { b.autoClickerCount++; },
    },
    {
      id: 'ac_3', name: 'Voice', cost: 8,
      description: '+1 auto-clicker',
      x: -0.72, y: -0.12,
      apply: (_s, b) => { b.autoClickerCount++; },
    },
    {
      id: 'ac_4', name: 'The Chorus', cost: 12,
      description: '+1 auto-clicker',
      x: -0.88, y: -0.48,
      apply: (_s, b) => { b.autoClickerCount++; },
    },

    // ── Faith branch — turn-back rate (mid-left, slight wobble) ──
    {
      id: 'fa_1', name: 'Linger', cost: 3,
      description: 'Turn-back rate -0.04',
      x: -0.35, y: 0.55,
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.04); },
    },
    {
      id: 'fa_2', name: 'Doubt', cost: 5,
      description: 'Turn-back rate -0.06',
      x: -0.48, y: 0.22,
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.06); },
    },
    {
      id: 'fa_3', name: 'Conviction', cost: 8,
      description: 'Turn-back rate -0.08',
      x: -0.40, y: -0.15,
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.08); },
    },
    {
      id: 'fa_4', name: 'No Return', cost: 12,
      description: 'Turn-back rate -0.12',
      x: -0.52, y: -0.52,
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.12); },
    },

    // ── Haste branch — walk speed (near-left, 3 nodes) ──────────
    {
      id: 'ha_1', name: 'Swift Step', cost: 4,
      description: 'Walk speed +10%',
      x: -0.15, y: 0.48,
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.1); b.walkSpeedBonus *= 1.1; },
    },
    {
      id: 'ha_2', name: 'Fevered March', cost: 7,
      description: 'Walk speed +15%',
      x: -0.22, y: 0.08,
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.15); b.walkSpeedBonus *= 1.15; },
    },
    {
      id: 'ha_3', name: 'Relentless Tide', cost: 11,
      description: 'Walk speed +20%',
      x: -0.10, y: -0.35,
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.2); b.walkSpeedBonus *= 1.2; },
    },

    // ── Tide branch — drag rate (near-right, zigzag) ────────────
    {
      id: 'ti_1', name: 'Resonance', cost: 3,
      description: 'Drag rate +0.06',
      x: 0.28, y: 0.48,
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.06); },
    },
    {
      id: 'ti_2', name: 'Chain Pull', cost: 5,
      description: 'Drag rate +0.10',
      x: 0.20, y: 0.10,
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.10); },
    },
    {
      id: 'ti_3', name: 'Mass Calling', cost: 8,
      description: 'Drag rate +0.14',
      x: 0.32, y: -0.22,
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.14); },
    },
    {
      id: 'ti_4', name: 'Mass Hysteria', cost: 12,
      description: 'Drag rate +0.20',
      x: 0.22, y: -0.58,
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.20); },
    },

    // ── Void branch — birth rate (mid-right, wobble) ────────────
    {
      id: 'vo_1', name: 'Whispered Doubt', cost: 4,
      description: 'Birth rate -10%',
      x: 0.52, y: 0.50,
      apply: (s) => { s.birthRate = Math.round(s.birthRate * 0.9); },
    },
    {
      id: 'vo_2', name: 'Fading Hope', cost: 7,
      description: 'Birth rate -15%',
      x: 0.58, y: 0.15,
      apply: (s) => { s.birthRate = Math.round(s.birthRate * 0.85); },
    },
    {
      id: 'vo_3', name: 'Empty Cradles', cost: 11,
      description: 'Birth rate -20%',
      x: 0.48, y: -0.18,
      apply: (s) => { s.birthRate = Math.round(s.birthRate * 0.80); },
    },
    {
      id: 'vo_4', name: 'Silence of the Womb', cost: 16,
      description: 'Birth rate -25%',
      x: 0.55, y: -0.52,
      apply: (s) => { s.birthRate = Math.round(s.birthRate * 0.75); },
    },

    // ── Omen branch — card drop rate (far right, curving) ───────
    {
      id: 'om_1', name: 'Dark Omen', cost: 4,
      description: 'Card drop rate: +5% per jump',
      x: 0.78, y: 0.48,
      apply: (_s, b) => { b.cardDropRate += 0.05; },
    },
    {
      id: 'om_2', name: 'Ill Sign', cost: 7,
      description: 'Card drop rate: +5% (10% total)',
      x: 0.85, y: 0.12,
      apply: (_s, b) => { b.cardDropRate += 0.05; },
    },
    {
      id: 'om_3', name: 'Prophecy', cost: 11,
      description: 'Card drop rate: +10% (20% total)',
      x: 0.75, y: -0.22,
      apply: (_s, b) => { b.cardDropRate += 0.10; },
    },
    {
      id: 'om_4', name: 'The Revelation', cost: 16,
      description: 'Card drop rate: +15% (35% total)',
      x: 0.90, y: -0.50,
      apply: (_s, b) => { b.cardDropRate += 0.15; },
    },

    // ── Cooldown branch — click cooldown (center, 3 nodes) ──────
    {
      id: 'cc_1', name: 'Eager Hands', cost: 3,
      description: 'Click cooldown -15%',
      x: 0.08, y: 0.50,
      apply: (s) => { s.clickCooldown = Math.round(s.clickCooldown * 0.85); },
    },
    {
      id: 'cc_2', name: 'Restless Fingers', cost: 6,
      description: 'Click cooldown -20%',
      x: -0.02, y: 0.12,
      apply: (s) => { s.clickCooldown = Math.round(s.clickCooldown * 0.80); },
    },
    {
      id: 'cc_3', name: 'Frenzy', cost: 10,
      description: 'Click cooldown -25%',
      x: 0.10, y: -0.28,
      apply: (s) => { s.clickCooldown = Math.round(s.clickCooldown * 0.75); },
    },
  ],
};

export const SKILL_TREES: SkillTree[] = [TREE];
