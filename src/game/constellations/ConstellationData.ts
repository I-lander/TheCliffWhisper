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
  autoClickerCount: number;
  soulMultiplier: number;
  abilities: string[];
  // Ability upgrade state
  frenzyPulse: { multiplier: number; duration: number; cooldown: number };
  voidCall: { duration: number; cooldown: number };
  darkWave: { count: number; cooldown: number };
  soulHarvest: { multiplier: number; duration: number; cooldown: number };
  silence: { duration: number; cooldown: number };
}

export const DEFAULT_BONUSES: ConstellationBonuses = {
  autoClickerCount: 0,
  soulMultiplier: 1,
  abilities: [],
  frenzyPulse: { multiplier: 2, duration: 8000, cooldown: 45000 },
  voidCall: { duration: 5000, cooldown: 30000 },
  darkWave: { count: 5, cooldown: 30000 },
  soulHarvest: { multiplier: 2, duration: 10000, cooldown: 40000 },
  silence: { duration: 15000, cooldown: 60000 },
};

/*
  Constellation "The Ancient God" — 116 nodes (1 root + 5 branches × 23 nodes).
  Central star with 5 radiating branches, each with trunk + 2 forks + ability sub-branch.

  Node index map:
    0           : root
    1-23        : Velocity     (walkSpeed + Frenzy Pulse)
    24-46       : Devotion     (turnBackRate + Void Call)
    47-69       : Contagion    (dragRate + Dark Wave)
    70-92       : Machinery    (autoClickers + clickCooldown + Soul Harvest)
    93-115      : Genesis      (soulMultiplier + birthratePerSec + Silence)
*/

// Polar to cartesian with wobble
function p(deg: number, r: number, wx = 0, wy = 0): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return {
    x: Math.round((Math.cos(rad) * r + wx) * 100) / 100,
    y: Math.round((-Math.sin(rad) * r + wy) * 100) / 100,
  };
}

// Shorthand stat helpers
const ws = (v: number) => (s: PopulationStats) => { s.walkSpeed += v; };
const tb = (v: number) => (s: PopulationStats) => { s.turnBackRate = Math.max(0, s.turnBackRate - v); };
const dr = (v: number) => (s: PopulationStats) => { s.dragRate = Math.min(1, s.dragRate + v); };
const cc = (v: number) => (s: PopulationStats) => { s.clickCooldown = Math.max(100, s.clickCooldown - v); };
const ac = (v: number) => (_s: PopulationStats, b: ConstellationBonuses) => { b.autoClickerCount += v; };
const sm = (v: number) => (_s: PopulationStats, b: ConstellationBonuses) => { b.soulMultiplier += v; };
const bps = (v: number) => (s: PopulationStats) => { s.birthratePerSec += v; };
const ab = (id: string) => (_s: PopulationStats, b: ConstellationBonuses) => { b.abilities.push(id); };
const noop = () => {};

// Branch angles (5 branches evenly spaced at 72° intervals)
const VELOCITY_DEG = 90;    // top
const DEVOTION_DEG = 162;   // top-left
const CONTAGION_DEG = 234;  // bottom-left
const MACHINERY_DEG = 306;  // bottom-right
const GENESIS_DEG = 18;     // top-right

// Fork offsets from main branch angle
const FORK_A_OFFSET = 15;
const FORK_B_OFFSET = -15;
const ABILITY_OFFSET = -8;

// Radial distances for trunk nodes (10 nodes, evenly spaced)
const trunkR = (i: number) => 0.08 + i * 0.085;
// Fork A starts at trunk node 4 depth, Fork B at trunk node 7 depth
const forkAR = (i: number) => trunkR(3) + (i + 1) * 0.09;
const forkBR = (i: number) => trunkR(6) + (i + 1) * 0.09;
// Ability sub-branch starts at trunk node 5 depth
const abilR = (i: number) => trunkR(4) + (i + 1) * 0.085;

// Edge definitions by ID pairs
const EDGE_IDS: [string, string][] = [
  // ── Velocity ──
  ['root','ve_1'],['ve_1','ve_2'],['ve_2','ve_3'],['ve_3','ve_4'],['ve_4','ve_5'],
  ['ve_5','ve_6'],['ve_6','ve_7'],['ve_7','ve_8'],['ve_8','ve_9'],['ve_9','ve_10'],
  ['ve_4','ve_fa1'],['ve_fa1','ve_fa2'],['ve_fa2','ve_fa3'],['ve_fa3','ve_fa4'],
  ['ve_7','ve_fb1'],['ve_fb1','ve_fb2'],['ve_fb2','ve_fb3'],
  ['ve_5','ve_ab1'],['ve_ab1','ve_ab2'],['ve_ab2','ve_ab3'],['ve_ab3','ve_ab4'],['ve_ab4','ve_ab5'],['ve_ab5','ve_ab6'],

  // ── Devotion ──
  ['root','de_1'],['de_1','de_2'],['de_2','de_3'],['de_3','de_4'],['de_4','de_5'],
  ['de_5','de_6'],['de_6','de_7'],['de_7','de_8'],['de_8','de_9'],['de_9','de_10'],
  ['de_4','de_fa1'],['de_fa1','de_fa2'],['de_fa2','de_fa3'],['de_fa3','de_fa4'],
  ['de_7','de_fb1'],['de_fb1','de_fb2'],['de_fb2','de_fb3'],
  ['de_5','de_ab1'],['de_ab1','de_ab2'],['de_ab2','de_ab3'],['de_ab3','de_ab4'],['de_ab4','de_ab5'],['de_ab5','de_ab6'],

  // ── Contagion ──
  ['root','co_1'],['co_1','co_2'],['co_2','co_3'],['co_3','co_4'],['co_4','co_5'],
  ['co_5','co_6'],['co_6','co_7'],['co_7','co_8'],['co_8','co_9'],['co_9','co_10'],
  ['co_4','co_fa1'],['co_fa1','co_fa2'],['co_fa2','co_fa3'],['co_fa3','co_fa4'],
  ['co_7','co_fb1'],['co_fb1','co_fb2'],['co_fb2','co_fb3'],
  ['co_5','co_ab1'],['co_ab1','co_ab2'],['co_ab2','co_ab3'],['co_ab3','co_ab4'],['co_ab4','co_ab5'],['co_ab5','co_ab6'],

  // ── Machinery ──
  ['root','ma_1'],['ma_1','ma_2'],['ma_2','ma_3'],['ma_3','ma_4'],['ma_4','ma_5'],
  ['ma_5','ma_6'],['ma_6','ma_7'],['ma_7','ma_8'],['ma_8','ma_9'],['ma_9','ma_10'],
  ['ma_4','ma_fa1'],['ma_fa1','ma_fa2'],['ma_fa2','ma_fa3'],['ma_fa3','ma_fa4'],
  ['ma_7','ma_fb1'],['ma_fb1','ma_fb2'],['ma_fb2','ma_fb3'],
  ['ma_5','ma_ab1'],['ma_ab1','ma_ab2'],['ma_ab2','ma_ab3'],['ma_ab3','ma_ab4'],['ma_ab4','ma_ab5'],['ma_ab5','ma_ab6'],

  // ── Genesis ──
  ['root','ge_1'],['ge_1','ge_2'],['ge_2','ge_3'],['ge_3','ge_4'],['ge_4','ge_5'],
  ['ge_5','ge_6'],['ge_6','ge_7'],['ge_7','ge_8'],['ge_8','ge_9'],['ge_9','ge_10'],
  ['ge_4','ge_fa1'],['ge_fa1','ge_fa2'],['ge_fa2','ge_fa3'],['ge_fa3','ge_fa4'],
  ['ge_7','ge_fb1'],['ge_fb1','ge_fb2'],['ge_fb2','ge_fb3'],
  ['ge_5','ge_ab1'],['ge_ab1','ge_ab2'],['ge_ab2','ge_ab3'],['ge_ab3','ge_ab4'],['ge_ab4','ge_ab5'],['ge_ab5','ge_ab6'],
];

const NODES: SkillNode[] = [
  // ═══ 0: ROOT ═══
  { id: 'root', name: 'The Cliff\'s Edge', cost: 0, description: 'The abyss whispers your name.',
    ...p(0, 0), apply: noop },

  // ═══════════════════════════════════════════════════════════════
  // VELOCITY — walkSpeed (nodes 1-23)
  // ═══════════════════════════════════════════════════════════════

  // Trunk (10 nodes): +3, +5, +5, +8, +8, +10, +10, +12, +15, +20 = +96
  { id: 've_1', name: 'Swift Step', cost: 3, description: 'Walk speed +3',
    ...p(VELOCITY_DEG, trunkR(0)), apply: ws(3) },
  { id: 've_2', name: 'Quickened Pace', cost: 5, description: 'Walk speed +5',
    ...p(VELOCITY_DEG, trunkR(1)), apply: ws(5) },
  { id: 've_3', name: 'Hurried Stride', cost: 8, description: 'Walk speed +5',
    ...p(VELOCITY_DEG, trunkR(2)), apply: ws(5) },
  { id: 've_4', name: 'Fevered March', cost: 12, description: 'Walk speed +8',
    ...p(VELOCITY_DEG, trunkR(3)), apply: ws(8) },
  { id: 've_5', name: 'Driven Forward', cost: 18, description: 'Walk speed +8',
    ...p(VELOCITY_DEG, trunkR(4)), apply: ws(8) },
  { id: 've_6', name: 'Rushing Tide', cost: 25, description: 'Walk speed +10',
    ...p(VELOCITY_DEG, trunkR(5)), apply: ws(10) },
  { id: 've_7', name: 'Relentless Gait', cost: 35, description: 'Walk speed +10',
    ...p(VELOCITY_DEG, trunkR(6)), apply: ws(10) },
  { id: 've_8', name: 'Blinding Speed', cost: 45, description: 'Walk speed +12',
    ...p(VELOCITY_DEG, trunkR(7)), apply: ws(12) },
  { id: 've_9', name: 'Wind Walker', cost: 60, description: 'Walk speed +15',
    ...p(VELOCITY_DEG, trunkR(8)), apply: ws(15) },
  { id: 've_10', name: 'Terminal Velocity', cost: 80, description: 'Walk speed +20',
    ...p(VELOCITY_DEG, trunkR(9)), apply: ws(20) },

  // Fork A (from node 4, 4 nodes): +6, +8, +10, +12 = +36
  { id: 've_fa1', name: 'Zephyr\'s Lure', cost: 10, description: 'Walk speed +6',
    ...p(VELOCITY_DEG + FORK_A_OFFSET, forkAR(0)), apply: ws(6) },
  { id: 've_fa2', name: 'Windborne Panic', cost: 18, description: 'Walk speed +8',
    ...p(VELOCITY_DEG + FORK_A_OFFSET, forkAR(1)), apply: ws(8) },
  { id: 've_fa3', name: 'Gale of No Return', cost: 28, description: 'Walk speed +10',
    ...p(VELOCITY_DEG + FORK_A_OFFSET, forkAR(2)), apply: ws(10) },
  { id: 've_fa4', name: 'Cyclone Step', cost: 42, description: 'Walk speed +12',
    ...p(VELOCITY_DEG + FORK_A_OFFSET, forkAR(3)), apply: ws(12) },

  // Fork B (from node 7, 3 nodes): +15, +18, +20 = +53
  { id: 've_fb1', name: 'Frantic March', cost: 30, description: 'Walk speed +15',
    ...p(VELOCITY_DEG + FORK_B_OFFSET, forkBR(0)), apply: ws(15) },
  { id: 've_fb2', name: 'Screaming Sprint', cost: 45, description: 'Walk speed +18',
    ...p(VELOCITY_DEG + FORK_B_OFFSET, forkBR(1)), apply: ws(18) },
  { id: 've_fb3', name: 'The Endless Stampede', cost: 65, description: 'Walk speed +20',
    ...p(VELOCITY_DEG + FORK_B_OFFSET, forkBR(2)), apply: ws(20) },

  // Ability: Frenzy Pulse (from node 5, 6 nodes)
  { id: 've_ab1', name: 'Frenzy Pulse', cost: 20, description: 'Unlock: Walk speed ×2 for 8s (cd 45s)',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(0)), apply: ab('frenzy_pulse') },
  { id: 've_ab2', name: 'Sustained Frenzy', cost: 35, description: 'Frenzy Pulse duration +4s',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(1)), apply: (_s, b) => { b.frenzyPulse.duration += 4000; } },
  { id: 've_ab3', name: 'Amplified Frenzy', cost: 50, description: 'Frenzy Pulse multiplier ×2.5',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(2)), apply: (_s, b) => { b.frenzyPulse.multiplier = 2.5; } },
  { id: 've_ab4', name: 'Relentless Frenzy', cost: 70, description: 'Frenzy Pulse cooldown -10s',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(3)), apply: (_s, b) => { b.frenzyPulse.cooldown -= 10000; } },
  { id: 've_ab5', name: 'Overwhelming Frenzy', cost: 100, description: 'Frenzy Pulse ×3, duration +4s',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(4)), apply: (_s, b) => { b.frenzyPulse.multiplier = 3; b.frenzyPulse.duration += 4000; } },
  { id: 've_ab6', name: 'Eternal Frenzy', cost: 120, description: 'Frenzy Pulse cd -10s, duration +4s',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(5)), apply: (_s, b) => { b.frenzyPulse.cooldown -= 10000; b.frenzyPulse.duration += 4000; } },

  // ═══════════════════════════════════════════════════════════════
  // DEVOTION — turnBackRate (nodes 24-46)
  // ═══════════════════════════════════════════════════════════════

  // Trunk (10 nodes): -0.01, -0.01, -0.02, -0.02, -0.02, -0.03, -0.03, -0.03, -0.04, -0.04 = -0.25
  { id: 'de_1', name: 'Linger', cost: 3, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG, trunkR(0)), apply: tb(0.01) },
  { id: 'de_2', name: 'Hesitation', cost: 5, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG, trunkR(1)), apply: tb(0.01) },
  { id: 'de_3', name: 'Doubt', cost: 8, description: 'Turn-back rate -0.02',
    ...p(DEVOTION_DEG, trunkR(2)), apply: tb(0.02) },
  { id: 'de_4', name: 'Wavering Faith', cost: 12, description: 'Turn-back rate -0.02',
    ...p(DEVOTION_DEG, trunkR(3)), apply: tb(0.02) },
  { id: 'de_5', name: 'Fading Hope', cost: 18, description: 'Turn-back rate -0.02',
    ...p(DEVOTION_DEG, trunkR(4)), apply: tb(0.02) },
  { id: 'de_6', name: 'Conviction', cost: 25, description: 'Turn-back rate -0.03',
    ...p(DEVOTION_DEG, trunkR(5)), apply: tb(0.03) },
  { id: 'de_7', name: 'Blind Devotion', cost: 35, description: 'Turn-back rate -0.03',
    ...p(DEVOTION_DEG, trunkR(6)), apply: tb(0.03) },
  { id: 'de_8', name: 'No Return', cost: 45, description: 'Turn-back rate -0.03',
    ...p(DEVOTION_DEG, trunkR(7)), apply: tb(0.03) },
  { id: 'de_9', name: 'The Abyss Calls', cost: 60, description: 'Turn-back rate -0.04',
    ...p(DEVOTION_DEG, trunkR(8)), apply: tb(0.04) },
  { id: 'de_10', name: 'Absolute Faith', cost: 80, description: 'Turn-back rate -0.04',
    ...p(DEVOTION_DEG, trunkR(9)), apply: tb(0.04) },

  // Fork A (from node 4, 4 nodes): -0.02, -0.03, -0.03, -0.04 = -0.12
  { id: 'de_fa1', name: 'Seeds of Surrender', cost: 10, description: 'Turn-back rate -0.02',
    ...p(DEVOTION_DEG + FORK_A_OFFSET, forkAR(0)), apply: tb(0.02) },
  { id: 'de_fa2', name: 'Congregation of Shadows', cost: 18, description: 'Turn-back rate -0.03',
    ...p(DEVOTION_DEG + FORK_A_OFFSET, forkAR(1)), apply: tb(0.03) },
  { id: 'de_fa3', name: 'Mass Hypnosis', cost: 28, description: 'Turn-back rate -0.03',
    ...p(DEVOTION_DEG + FORK_A_OFFSET, forkAR(2)), apply: tb(0.03) },
  { id: 'de_fa4', name: 'Unbreakable Trance', cost: 42, description: 'Turn-back rate -0.04',
    ...p(DEVOTION_DEG + FORK_A_OFFSET, forkAR(3)), apply: tb(0.04) },

  // Fork B (from node 7, 3 nodes): -0.03, -0.04, -0.05 = -0.12
  { id: 'de_fb1', name: 'Silenced Doubt', cost: 30, description: 'Turn-back rate -0.03',
    ...p(DEVOTION_DEG + FORK_B_OFFSET, forkBR(0)), apply: tb(0.03) },
  { id: 'de_fb2', name: 'Covenant of Falling', cost: 45, description: 'Turn-back rate -0.04',
    ...p(DEVOTION_DEG + FORK_B_OFFSET, forkBR(1)), apply: tb(0.04) },
  { id: 'de_fb3', name: 'Absolute Obedience', cost: 65, description: 'Turn-back rate -0.05',
    ...p(DEVOTION_DEG + FORK_B_OFFSET, forkBR(2)), apply: tb(0.05) },

  // Ability: Void Call (from node 5, 6 nodes)
  { id: 'de_ab1', name: 'Void Call', cost: 20, description: 'Unlock: Turn-back = 0 for 5s (cd 30s)',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(0)), apply: ab('void_call') },
  { id: 'de_ab2', name: 'Extended Silence', cost: 35, description: 'Void Call duration +3s',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(1)), apply: (_s, b) => { b.voidCall.duration += 3000; } },
  { id: 'de_ab3', name: 'Quickened Call', cost: 50, description: 'Void Call cooldown -5s',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(2)), apply: (_s, b) => { b.voidCall.cooldown -= 5000; } },
  { id: 'de_ab4', name: 'Lingering Void', cost: 70, description: 'Void Call duration +4s',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(3)), apply: (_s, b) => { b.voidCall.duration += 4000; } },
  { id: 'de_ab5', name: 'Resonant Void', cost: 100, description: 'Void Call cooldown -5s',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(4)), apply: (_s, b) => { b.voidCall.cooldown -= 5000; } },
  { id: 'de_ab6', name: 'Eternal Void', cost: 120, description: 'Void Call duration +5s, cd -5s',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(5)), apply: (_s, b) => { b.voidCall.duration += 5000; b.voidCall.cooldown -= 5000; } },

  // ═══════════════════════════════════════════════════════════════
  // CONTAGION — dragRate (nodes 47-69)
  // ═══════════════════════════════════════════════════════════════

  // Trunk (10 nodes): +0.01, +0.01, +0.02, +0.02, +0.02, +0.03, +0.03, +0.03, +0.04, +0.04 = +0.25
  { id: 'co_1', name: 'Whispered Doubt', cost: 3, description: 'Drag rate +0.01',
    ...p(CONTAGION_DEG, trunkR(0)), apply: dr(0.01) },
  { id: 'co_2', name: 'Shared Glance', cost: 5, description: 'Drag rate +0.01',
    ...p(CONTAGION_DEG, trunkR(1)), apply: dr(0.01) },
  { id: 'co_3', name: 'Herd Instinct', cost: 8, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG, trunkR(2)), apply: dr(0.02) },
  { id: 'co_4', name: 'Mass Anxiety', cost: 12, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG, trunkR(3)), apply: dr(0.02) },
  { id: 'co_5', name: 'Panic Spread', cost: 18, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG, trunkR(4)), apply: dr(0.02) },
  { id: 'co_6', name: 'Chain Reaction', cost: 25, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG, trunkR(5)), apply: dr(0.03) },
  { id: 'co_7', name: 'Mob Mentality', cost: 35, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG, trunkR(6)), apply: dr(0.03) },
  { id: 'co_8', name: 'Hysteria', cost: 45, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG, trunkR(7)), apply: dr(0.03) },
  { id: 'co_9', name: 'Cascade Effect', cost: 60, description: 'Drag rate +0.04',
    ...p(CONTAGION_DEG, trunkR(8)), apply: dr(0.04) },
  { id: 'co_10', name: 'Mass Psychosis', cost: 80, description: 'Drag rate +0.04',
    ...p(CONTAGION_DEG, trunkR(9)), apply: dr(0.04) },

  // Fork A (from node 4, 4 nodes): +0.02, +0.03, +0.03, +0.04 = +0.12
  { id: 'co_fa1', name: 'Curious Bystanders', cost: 10, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG + FORK_A_OFFSET, forkAR(0)), apply: dr(0.02) },
  { id: 'co_fa2', name: 'Peer Pressure', cost: 18, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG + FORK_A_OFFSET, forkAR(1)), apply: dr(0.03) },
  { id: 'co_fa3', name: 'Social Contagion', cost: 28, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG + FORK_A_OFFSET, forkAR(2)), apply: dr(0.03) },
  { id: 'co_fa4', name: 'Collective Madness', cost: 42, description: 'Drag rate +0.04',
    ...p(CONTAGION_DEG + FORK_A_OFFSET, forkAR(3)), apply: dr(0.04) },

  // Fork B (from node 7, 3 nodes): +0.04, +0.05, +0.06 = +0.15
  { id: 'co_fb1', name: 'Ripple Effect', cost: 30, description: 'Drag rate +0.04',
    ...p(CONTAGION_DEG + FORK_B_OFFSET, forkBR(0)), apply: dr(0.04) },
  { id: 'co_fb2', name: 'Undertow', cost: 45, description: 'Drag rate +0.05',
    ...p(CONTAGION_DEG + FORK_B_OFFSET, forkBR(1)), apply: dr(0.05) },
  { id: 'co_fb3', name: 'Tsunami of Flesh', cost: 65, description: 'Drag rate +0.06',
    ...p(CONTAGION_DEG + FORK_B_OFFSET, forkBR(2)), apply: dr(0.06) },

  // Ability: Dark Wave (from node 5, 6 nodes)
  { id: 'co_ab1', name: 'Dark Wave', cost: 20, description: 'Unlock: Spawn 5 humans (cd 30s)',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(0)), apply: ab('dark_wave') },
  { id: 'co_ab2', name: 'Swelling Tide', cost: 35, description: 'Dark Wave +3 humans',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(1)), apply: (_s, b) => { b.darkWave.count += 3; } },
  { id: 'co_ab3', name: 'Quickened Tide', cost: 50, description: 'Dark Wave cooldown -5s',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(2)), apply: (_s, b) => { b.darkWave.cooldown -= 5000; } },
  { id: 'co_ab4', name: 'Crashing Wave', cost: 70, description: 'Dark Wave +5 humans',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(3)), apply: (_s, b) => { b.darkWave.count += 5; } },
  { id: 'co_ab5', name: 'Relentless Surge', cost: 100, description: 'Dark Wave cooldown -5s',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(4)), apply: (_s, b) => { b.darkWave.cooldown -= 5000; } },
  { id: 'co_ab6', name: 'Apocalyptic Flood', cost: 120, description: 'Dark Wave +7 humans, cd -5s',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(5)), apply: (_s, b) => { b.darkWave.count += 7; b.darkWave.cooldown -= 5000; } },

  // ═══════════════════════════════════════════════════════════════
  // MACHINERY — autoClickers + clickCooldown (nodes 70-92)
  // ═══════════════════════════════════════════════════════════════

  // Trunk (10 nodes): -30ms, +1AC, -40ms, +1AC, -50ms, +1AC, -60ms, +1AC, -80ms, +2AC
  //   total: -260ms cooldown, +6 auto-clickers
  { id: 'ma_1', name: 'Loose Gear', cost: 3, description: 'Click cooldown -30ms',
    ...p(MACHINERY_DEG, trunkR(0)), apply: cc(30) },
  { id: 'ma_2', name: 'First Automaton', cost: 5, description: '+1 auto-clicker',
    ...p(MACHINERY_DEG, trunkR(1)), apply: ac(1) },
  { id: 'ma_3', name: 'Oiled Mechanism', cost: 8, description: 'Click cooldown -40ms',
    ...p(MACHINERY_DEG, trunkR(2)), apply: cc(40) },
  { id: 'ma_4', name: 'Second Automaton', cost: 12, description: '+1 auto-clicker',
    ...p(MACHINERY_DEG, trunkR(3)), apply: ac(1) },
  { id: 'ma_5', name: 'Precision Gears', cost: 18, description: 'Click cooldown -50ms',
    ...p(MACHINERY_DEG, trunkR(4)), apply: cc(50) },
  { id: 'ma_6', name: 'Third Automaton', cost: 25, description: '+1 auto-clicker',
    ...p(MACHINERY_DEG, trunkR(5)), apply: ac(1) },
  { id: 'ma_7', name: 'Clockwork Engine', cost: 35, description: 'Click cooldown -60ms',
    ...p(MACHINERY_DEG, trunkR(6)), apply: cc(60) },
  { id: 'ma_8', name: 'Fourth Automaton', cost: 45, description: '+1 auto-clicker',
    ...p(MACHINERY_DEG, trunkR(7)), apply: ac(1) },
  { id: 'ma_9', name: 'Perpetual Motion', cost: 60, description: 'Click cooldown -80ms',
    ...p(MACHINERY_DEG, trunkR(8)), apply: cc(80) },
  { id: 'ma_10', name: 'The Machine God', cost: 80, description: '+2 auto-clickers',
    ...p(MACHINERY_DEG, trunkR(9)), apply: ac(2) },

  // Fork A (from node 4, 4 nodes): -40ms, -50ms, -60ms, -80ms = -230ms cooldown
  { id: 'ma_fa1', name: 'Swift Mechanisms', cost: 10, description: 'Click cooldown -40ms',
    ...p(MACHINERY_DEG + FORK_A_OFFSET, forkAR(0)), apply: cc(40) },
  { id: 'ma_fa2', name: 'Overclocked Abyss', cost: 18, description: 'Click cooldown -50ms',
    ...p(MACHINERY_DEG + FORK_A_OFFSET, forkAR(1)), apply: cc(50) },
  { id: 'ma_fa3', name: 'Temporal Compression', cost: 28, description: 'Click cooldown -60ms',
    ...p(MACHINERY_DEG + FORK_A_OFFSET, forkAR(2)), apply: cc(60) },
  { id: 'ma_fa4', name: 'Infinite Gears', cost: 42, description: 'Click cooldown -80ms',
    ...p(MACHINERY_DEG + FORK_A_OFFSET, forkAR(3)), apply: cc(80) },

  // Fork B (from node 7, 3 nodes): +1, +2, +3 = +6 auto-clickers
  { id: 'ma_fb1', name: 'Shadow Foreman', cost: 30, description: '+1 auto-clicker',
    ...p(MACHINERY_DEG + FORK_B_OFFSET, forkBR(0)), apply: ac(1) },
  { id: 'ma_fb2', name: 'Necromantic Workshop', cost: 45, description: '+2 auto-clickers',
    ...p(MACHINERY_DEG + FORK_B_OFFSET, forkBR(1)), apply: ac(2) },
  { id: 'ma_fb3', name: 'Army of Oblivion', cost: 65, description: '+3 auto-clickers',
    ...p(MACHINERY_DEG + FORK_B_OFFSET, forkBR(2)), apply: ac(3) },

  // Ability: Soul Harvest (from node 5, 6 nodes)
  { id: 'ma_ab1', name: 'Soul Harvest', cost: 20, description: 'Unlock: Souls ×2 for 10s (cd 40s)',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(0)), apply: ab('soul_harvest') },
  { id: 'ma_ab2', name: 'Extended Harvest', cost: 35, description: 'Soul Harvest duration +5s',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(1)), apply: (_s, b) => { b.soulHarvest.duration += 5000; } },
  { id: 'ma_ab3', name: 'Amplified Harvest', cost: 50, description: 'Soul Harvest ×2.5',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(2)), apply: (_s, b) => { b.soulHarvest.multiplier = 2.5; } },
  { id: 'ma_ab4', name: 'Quickened Harvest', cost: 70, description: 'Soul Harvest cooldown -10s',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(3)), apply: (_s, b) => { b.soulHarvest.cooldown -= 10000; } },
  { id: 'ma_ab5', name: 'Overwhelming Harvest', cost: 100, description: 'Soul Harvest ×3, duration +5s',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(4)), apply: (_s, b) => { b.soulHarvest.multiplier = 3; b.soulHarvest.duration += 5000; } },
  { id: 'ma_ab6', name: 'Eternal Harvest', cost: 120, description: 'Soul Harvest cooldown -10s',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(5)), apply: (_s, b) => { b.soulHarvest.cooldown -= 10000; } },

  // ═══════════════════════════════════════════════════════════════
  // GENESIS — soulMultiplier + birthratePerSec (nodes 93-115)
  // ═══════════════════════════════════════════════════════════════

  // Trunk (10 nodes): +0.05, +0.05, +0.10, +0.10, +0.10, +0.15, +0.15, +0.20, +0.20, +0.25 = +1.35
  { id: 'ge_1', name: 'Dark Ember', cost: 3, description: 'Soul multiplier +0.05',
    ...p(GENESIS_DEG, trunkR(0)), apply: sm(0.05) },
  { id: 'ge_2', name: 'Soul Spark', cost: 5, description: 'Soul multiplier +0.05',
    ...p(GENESIS_DEG, trunkR(1)), apply: sm(0.05) },
  { id: 'ge_3', name: 'Growing Hunger', cost: 8, description: 'Soul multiplier +0.10',
    ...p(GENESIS_DEG, trunkR(2)), apply: sm(0.10) },
  { id: 'ge_4', name: 'Death\'s Tithe', cost: 12, description: 'Soul multiplier +0.10',
    ...p(GENESIS_DEG, trunkR(3)), apply: sm(0.10) },
  { id: 'ge_5', name: 'Reaping Wind', cost: 18, description: 'Soul multiplier +0.10',
    ...p(GENESIS_DEG, trunkR(4)), apply: sm(0.10) },
  { id: 'ge_6', name: 'Soul Furnace', cost: 25, description: 'Soul multiplier +0.15',
    ...p(GENESIS_DEG, trunkR(5)), apply: sm(0.15) },
  { id: 'ge_7', name: 'Dark Harvest', cost: 35, description: 'Soul multiplier +0.15',
    ...p(GENESIS_DEG, trunkR(6)), apply: sm(0.15) },
  { id: 'ge_8', name: 'Essence Drain', cost: 45, description: 'Soul multiplier +0.20',
    ...p(GENESIS_DEG, trunkR(7)), apply: sm(0.20) },
  { id: 'ge_9', name: 'Death\'s Bounty', cost: 60, description: 'Soul multiplier +0.20',
    ...p(GENESIS_DEG, trunkR(8)), apply: sm(0.20) },
  { id: 'ge_10', name: 'The Soul Singularity', cost: 80, description: 'Soul multiplier +0.25',
    ...p(GENESIS_DEG, trunkR(9)), apply: sm(0.25) },

  // Fork A (from node 4, 4 nodes): +0.10, +0.15, +0.20, +0.25 = +0.70
  { id: 'ge_fa1', name: 'Greedy Grasp', cost: 10, description: 'Soul multiplier +0.10',
    ...p(GENESIS_DEG + FORK_A_OFFSET, forkAR(0)), apply: sm(0.10) },
  { id: 'ge_fa2', name: 'Soul Taxation', cost: 18, description: 'Soul multiplier +0.15',
    ...p(GENESIS_DEG + FORK_A_OFFSET, forkAR(1)), apply: sm(0.15) },
  { id: 'ge_fa3', name: 'Spiritual Monopoly', cost: 28, description: 'Soul multiplier +0.20',
    ...p(GENESIS_DEG + FORK_A_OFFSET, forkAR(2)), apply: sm(0.20) },
  { id: 'ge_fa4', name: 'Philosopher\'s Reap', cost: 42, description: 'Soul multiplier +0.25',
    ...p(GENESIS_DEG + FORK_A_OFFSET, forkAR(3)), apply: sm(0.25) },

  // Fork B (from node 7, 3 nodes): birthratePerSec +1, +1, +2 = +4/s
  { id: 'ge_fb1', name: 'Ticking Clock', cost: 30, description: 'birthratePerSec +1/s',
    ...p(GENESIS_DEG + FORK_B_OFFSET, forkBR(0)), apply: bps(1) },
  { id: 'ge_fb2', name: 'Relentless Cradle', cost: 45, description: 'birthratePerSec +1/s',
    ...p(GENESIS_DEG + FORK_B_OFFSET, forkBR(1)), apply: bps(1) },
  { id: 'ge_fb3', name: 'Endless Generation', cost: 65, description: 'birthratePerSec +2/s',
    ...p(GENESIS_DEG + FORK_B_OFFSET, forkBR(2)), apply: bps(2) },

  // Ability: Silence (from node 5, 6 nodes)
  { id: 'ge_ab1', name: 'Silence', cost: 20, description: 'Unlock: birthratePerSec = 0 for 15s (cd 60s)',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(0)), apply: ab('silence') },
  { id: 'ge_ab2', name: 'Extended Silence', cost: 35, description: 'Silence duration +5s',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(1)), apply: (_s, b) => { b.silence.duration += 5000; } },
  { id: 'ge_ab3', name: 'Quickened Silence', cost: 50, description: 'Silence cooldown -10s',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(2)), apply: (_s, b) => { b.silence.cooldown -= 10000; } },
  { id: 'ge_ab4', name: 'Deep Silence', cost: 70, description: 'Silence duration +5s',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(3)), apply: (_s, b) => { b.silence.duration += 5000; } },
  { id: 'ge_ab5', name: 'Resonant Silence', cost: 100, description: 'Silence cooldown -10s',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(4)), apply: (_s, b) => { b.silence.cooldown -= 10000; } },
  { id: 'ge_ab6', name: 'Eternal Silence', cost: 120, description: 'Silence duration +10s, cd -10s',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(5)), apply: (_s, b) => { b.silence.duration += 10000; b.silence.cooldown -= 10000; } },
];

// Resolve string-based edges to index pairs
function buildEdges(nodes: SkillNode[], edgeIds: [string, string][]): [number, number][] {
  const idMap = new Map<string, number>();
  nodes.forEach((n, i) => idMap.set(n.id, i));
  return edgeIds
    .map(([a, b]) => [idMap.get(a)!, idMap.get(b)!] as [number, number])
    .filter(([a, b]) => a !== undefined && b !== undefined);
}

// Force-directed layout: repel overlapping nodes + attract connected nodes
function relaxLayout(
  nodes: SkillNode[],
  edgeIds: [string, string][],
  minDist: number,
  idealEdgeDist: number,
  iterations: number,
) {
  const idMap = new Map<string, number>();
  nodes.forEach((n, i) => idMap.set(n.id, i));

  const edgePairs = edgeIds
    .map(([a, b]) => [idMap.get(a)!, idMap.get(b)!] as [number, number])
    .filter(([a, b]) => a !== undefined && b !== undefined);

  for (let iter = 0; iter < iterations; iter++) {
    const damping = 1 - iter / iterations * 0.5;

    // Repulsion: push apart ALL node pairs that are too close
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === 'root') continue;
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[j].id === 'root') continue;
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist > 0.001) {
          const force = (minDist - dist) * 0.3 * damping;
          const nx = dx / dist;
          const ny = dy / dist;
          nodes[i].x -= nx * force;
          nodes[i].y -= ny * force;
          nodes[j].x += nx * force;
          nodes[j].y += ny * force;
        }
      }
    }

    // Attraction: pull connected nodes toward ideal edge distance
    for (const [a, b] of edgePairs) {
      if (nodes[a].id === 'root' || nodes[b].id === 'root') continue;
      const dx = nodes[b].x - nodes[a].x;
      const dy = nodes[b].y - nodes[a].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > idealEdgeDist && dist > 0.001) {
        const force = (dist - idealEdgeDist) * 0.35 * damping;
        const nx = dx / dist;
        const ny = dy / dist;
        nodes[a].x += nx * force;
        nodes[a].y += ny * force;
        nodes[b].x -= nx * force;
        nodes[b].y -= ny * force;
      }
    }

    // Clamp to bounds
    for (const n of nodes) {
      if (n.id === 'root') continue;
      n.x = Math.max(-0.95, Math.min(0.95, n.x));
      n.y = Math.max(-0.95, Math.min(0.95, n.y));
    }
  }

  // Round to 2 decimals
  for (const n of nodes) {
    n.x = Math.round(n.x * 100) / 100;
    n.y = Math.round(n.y * 100) / 100;
  }
}

relaxLayout(NODES, EDGE_IDS, 0.08, 0.12, 120);

const TREE: SkillTree = {
  id: 'whisper',
  name: 'The Ancient God',
  color: '#aaccff',
  nodes: NODES,
  edges: buildEdges(NODES, EDGE_IDS),
};

export const SKILL_TREES: SkillTree[] = [TREE];
