import { PopulationStats, TURN_BACK_MIN } from '../PopulationManager';

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
  Constellation "The Ancient God" — 166 nodes (1 root + 5 branches × 33 nodes).
  Central star with 5 radiating branches, each with trunk + 2 forks + ability sub-branch.

  Node index map:
    0           : root
    1-33        : Velocity     (walkSpeed + Frenzy Pulse)
    34-66       : Devotion     (turnBackRate + Void Call)
    67-99       : Contagion    (dragRate + Dark Wave)
    100-132     : Machinery    (autoClickers + clickCooldown + Soul Harvest)
    133-165     : Genesis      (soulMultiplier + deathMultiplier + Silence)
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
const tb = (v: number) => (s: PopulationStats) => { s.turnBackRate = Math.max(TURN_BACK_MIN, s.turnBackRate - v); };
const dr = (v: number) => (s: PopulationStats) => { s.dragRate = Math.min(1, s.dragRate + v); };
const cc = (v: number) => (s: PopulationStats) => { s.clickCooldown = Math.max(100, s.clickCooldown - v); };
const ac = (v: number) => (_s: PopulationStats, b: ConstellationBonuses) => { b.autoClickerCount += v; };
const sm = (v: number) => (_s: PopulationStats, b: ConstellationBonuses) => { b.soulMultiplier += v; };
const bps = (v: number) => (s: PopulationStats) => { s.birthratePerSec += v; };
const br = (v: number) => (s: PopulationStats) => { s.birthRate += v; };
const dm = (v: number) => (s: PopulationStats) => { s.deathMultiplier *= v; };
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

// Radial distances — 15-node trunk
const trunkR = (i: number) => 0.06 + i * 0.06;
// Fork A starts at trunk node 5, Fork B at trunk node 9
const forkAR = (i: number) => trunkR(4) + (i + 1) * 0.07;
const forkBR = (i: number) => trunkR(8) + (i + 1) * 0.07;
// Ability sub-branch starts at trunk node 6
const abilR = (i: number) => trunkR(5) + (i + 1) * 0.065;

// Edge definitions by ID pairs
const EDGE_IDS: [string, string][] = [
  // ── Velocity ──
  ['root','ve_1'],
  ['ve_1','ve_2'],['ve_2','ve_3'],['ve_3','ve_4'],['ve_4','ve_5'],['ve_5','ve_6'],
  ['ve_6','ve_7'],['ve_7','ve_8'],['ve_8','ve_9'],['ve_9','ve_10'],['ve_10','ve_11'],
  ['ve_11','ve_12'],['ve_12','ve_13'],['ve_13','ve_14'],['ve_14','ve_15'],
  ['ve_5','ve_fa1'],['ve_fa1','ve_fa2'],['ve_fa2','ve_fa3'],['ve_fa3','ve_fa4'],['ve_fa4','ve_fa5'],['ve_fa5','ve_fa6'],
  ['ve_9','ve_fb1'],['ve_fb1','ve_fb2'],['ve_fb2','ve_fb3'],['ve_fb3','ve_fb4'],['ve_fb4','ve_fb5'],
  ['ve_6','ve_ab1'],['ve_ab1','ve_ab2'],['ve_ab2','ve_ab3'],['ve_ab3','ve_ab4'],['ve_ab4','ve_ab5'],['ve_ab5','ve_ab6'],['ve_ab6','ve_ab7'],

  // ── Devotion ──
  ['root','de_1'],
  ['de_1','de_2'],['de_2','de_3'],['de_3','de_4'],['de_4','de_5'],['de_5','de_6'],
  ['de_6','de_7'],['de_7','de_8'],['de_8','de_9'],['de_9','de_10'],['de_10','de_11'],
  ['de_11','de_12'],['de_12','de_13'],['de_13','de_14'],['de_14','de_15'],
  ['de_5','de_fa1'],['de_fa1','de_fa2'],['de_fa2','de_fa3'],['de_fa3','de_fa4'],['de_fa4','de_fa5'],['de_fa5','de_fa6'],
  ['de_9','de_fb1'],['de_fb1','de_fb2'],['de_fb2','de_fb3'],['de_fb3','de_fb4'],['de_fb4','de_fb5'],
  ['de_6','de_ab1'],['de_ab1','de_ab2'],['de_ab2','de_ab3'],['de_ab3','de_ab4'],['de_ab4','de_ab5'],['de_ab5','de_ab6'],['de_ab6','de_ab7'],

  // ── Contagion ──
  ['root','co_1'],
  ['co_1','co_2'],['co_2','co_3'],['co_3','co_4'],['co_4','co_5'],['co_5','co_6'],
  ['co_6','co_7'],['co_7','co_8'],['co_8','co_9'],['co_9','co_10'],['co_10','co_11'],
  ['co_11','co_12'],['co_12','co_13'],['co_13','co_14'],['co_14','co_15'],
  ['co_5','co_fa1'],['co_fa1','co_fa2'],['co_fa2','co_fa3'],['co_fa3','co_fa4'],['co_fa4','co_fa5'],['co_fa5','co_fa6'],
  ['co_9','co_fb1'],['co_fb1','co_fb2'],['co_fb2','co_fb3'],['co_fb3','co_fb4'],['co_fb4','co_fb5'],
  ['co_6','co_ab1'],['co_ab1','co_ab2'],['co_ab2','co_ab3'],['co_ab3','co_ab4'],['co_ab4','co_ab5'],['co_ab5','co_ab6'],['co_ab6','co_ab7'],

  // ── Machinery ──
  ['root','ma_1'],
  ['ma_1','ma_2'],['ma_2','ma_3'],['ma_3','ma_4'],['ma_4','ma_5'],['ma_5','ma_6'],
  ['ma_6','ma_7'],['ma_7','ma_8'],['ma_8','ma_9'],['ma_9','ma_10'],['ma_10','ma_11'],
  ['ma_11','ma_12'],['ma_12','ma_13'],['ma_13','ma_14'],['ma_14','ma_15'],
  ['ma_5','ma_fa1'],['ma_fa1','ma_fa2'],['ma_fa2','ma_fa3'],['ma_fa3','ma_fa4'],['ma_fa4','ma_fa5'],['ma_fa5','ma_fa6'],
  ['ma_9','ma_fb1'],['ma_fb1','ma_fb2'],['ma_fb2','ma_fb3'],['ma_fb3','ma_fb4'],['ma_fb4','ma_fb5'],
  ['ma_6','ma_ab1'],['ma_ab1','ma_ab2'],['ma_ab2','ma_ab3'],['ma_ab3','ma_ab4'],['ma_ab4','ma_ab5'],['ma_ab5','ma_ab6'],['ma_ab6','ma_ab7'],

  // ── Genesis ──
  ['root','ge_1'],
  ['ge_1','ge_2'],['ge_2','ge_3'],['ge_3','ge_4'],['ge_4','ge_5'],['ge_5','ge_6'],
  ['ge_6','ge_7'],['ge_7','ge_8'],['ge_8','ge_9'],['ge_9','ge_10'],['ge_10','ge_11'],
  ['ge_11','ge_12'],['ge_12','ge_13'],['ge_13','ge_14'],['ge_14','ge_15'],
  ['ge_5','ge_fa1'],['ge_fa1','ge_fa2'],['ge_fa2','ge_fa3'],['ge_fa3','ge_fa4'],['ge_fa4','ge_fa5'],['ge_fa5','ge_fa6'],
  ['ge_9','ge_fb1'],['ge_fb1','ge_fb2'],['ge_fb2','ge_fb3'],['ge_fb3','ge_fb4'],['ge_fb4','ge_fb5'],
  ['ge_6','ge_ab1'],['ge_ab1','ge_ab2'],['ge_ab2','ge_ab3'],['ge_ab3','ge_ab4'],['ge_ab4','ge_ab5'],['ge_ab5','ge_ab6'],['ge_ab6','ge_ab7'],
];

const NODES: SkillNode[] = [
  // ═══ 0: ROOT ═══
  { id: 'root', name: 'The Cliff\'s Edge', cost: 0, description: 'The abyss whispers your name.',
    ...p(0, 0), apply: noop },

  // ═══════════════════════════════════════════════════════════════
  // VELOCITY — walkSpeed (nodes 1-33)
  // Max walkSpeed: 120 + 230 = 350
  // ═══════════════════════════════════════════════════════════════

  // Trunk (15 nodes): +3,+3,+5,+5,+7,+7,+8,+10,+10,+12,+12,+15,+15,+18,+20 = +150
  { id: 've_1', name: 'Swift Step', cost: 5, description: 'Walk speed +3',
    ...p(VELOCITY_DEG, trunkR(0)), apply: ws(3) },
  { id: 've_2', name: 'Quickened Pace', cost: 8, description: 'Walk speed +3',
    ...p(VELOCITY_DEG, trunkR(1)), apply: ws(3) },
  { id: 've_3', name: 'Hurried Stride', cost: 15, description: 'Walk speed +5',
    ...p(VELOCITY_DEG, trunkR(2)), apply: ws(5) },
  { id: 've_4', name: 'Fevered March', cost: 30, description: 'Walk speed +5',
    ...p(VELOCITY_DEG, trunkR(3)), apply: ws(5) },
  { id: 've_5', name: 'Driven Forward', cost: 60, description: 'Walk speed +7',
    ...p(VELOCITY_DEG, trunkR(4)), apply: ws(7) },
  { id: 've_6', name: 'Rushing Tide', cost: 120, description: 'Walk speed +7',
    ...p(VELOCITY_DEG, trunkR(5)), apply: ws(7) },
  { id: 've_7', name: 'Relentless Gait', cost: 300, description: 'Walk speed +8',
    ...p(VELOCITY_DEG, trunkR(6)), apply: ws(8) },
  { id: 've_8', name: 'Blinding Speed', cost: 700, description: 'Walk speed +10',
    ...p(VELOCITY_DEG, trunkR(7)), apply: ws(10) },
  { id: 've_9', name: 'Wind Walker', cost: 1500, description: 'Walk speed +10',
    ...p(VELOCITY_DEG, trunkR(8)), apply: ws(10) },
  { id: 've_10', name: 'Terminal Velocity', cost: 4000, description: 'Walk speed +12',
    ...p(VELOCITY_DEG, trunkR(9)), apply: ws(12) },
  { id: 've_11', name: 'Beyond Mortal Pace', cost: 10000, description: 'Walk speed +12',
    ...p(VELOCITY_DEG, trunkR(10)), apply: ws(12) },
  { id: 've_12', name: 'Sonic Pilgrimage', cost: 25000, description: 'Walk speed +15',
    ...p(VELOCITY_DEG, trunkR(11)), apply: ws(15) },
  { id: 've_13', name: 'Lightspeed Lemmings', cost: 60000, description: 'Walk speed +15',
    ...p(VELOCITY_DEG, trunkR(12)), apply: ws(15) },
  { id: 've_14', name: 'Warp March', cost: 150000, description: 'Walk speed +18',
    ...p(VELOCITY_DEG, trunkR(13)), apply: ws(18) },
  { id: 've_15', name: 'The Stampede Eternal', cost: 500000, description: 'Walk speed +20',
    ...p(VELOCITY_DEG, trunkR(14)), apply: ws(20) },

  // Fork A (from node 5, 6 nodes): +5,+6,+8,+10,+12,+15 = +56
  { id: 've_fa1', name: 'Zephyr\'s Lure', cost: 50, description: 'Walk speed +5',
    ...p(VELOCITY_DEG + FORK_A_OFFSET, forkAR(0)), apply: ws(5) },
  { id: 've_fa2', name: 'Windborne Panic', cost: 150, description: 'Walk speed +6',
    ...p(VELOCITY_DEG + FORK_A_OFFSET, forkAR(1)), apply: ws(6) },
  { id: 've_fa3', name: 'Gale of No Return', cost: 500, description: 'Walk speed +8',
    ...p(VELOCITY_DEG + FORK_A_OFFSET, forkAR(2)), apply: ws(8) },
  { id: 've_fa4', name: 'Cyclone Step', cost: 2000, description: 'Walk speed +10',
    ...p(VELOCITY_DEG + FORK_A_OFFSET, forkAR(3)), apply: ws(10) },
  { id: 've_fa5', name: 'Tempest Rush', cost: 8000, description: 'Walk speed +12',
    ...p(VELOCITY_DEG + FORK_A_OFFSET, forkAR(4)), apply: ws(12) },
  { id: 've_fa6', name: 'Hurricane Charge', cost: 30000, description: 'Walk speed +15',
    ...p(VELOCITY_DEG + FORK_A_OFFSET, forkAR(5)), apply: ws(15) },

  // Fork B (from node 9, 5 nodes): +4,+5,+6,+7,+8 = +30 (minor speed + birth rate combos)
  { id: 've_fb1', name: 'Frantic March', cost: 1200, description: 'Walk speed +4, birth rate +50/day',
    ...p(VELOCITY_DEG + FORK_B_OFFSET, forkBR(0)), apply: (s) => { s.walkSpeed += 4; s.birthRate += 50; } },
  { id: 've_fb2', name: 'Screaming Sprint', cost: 5000, description: 'Walk speed +5, birth rate +200/day',
    ...p(VELOCITY_DEG + FORK_B_OFFSET, forkBR(1)), apply: (s) => { s.walkSpeed += 5; s.birthRate += 200; } },
  { id: 've_fb3', name: 'Panic Exodus', cost: 15000, description: 'Walk speed +6, birth rate +500/day',
    ...p(VELOCITY_DEG + FORK_B_OFFSET, forkBR(2)), apply: (s) => { s.walkSpeed += 6; s.birthRate += 500; } },
  { id: 've_fb4', name: 'Death Race', cost: 50000, description: 'Walk speed +7, birth rate +2000/day',
    ...p(VELOCITY_DEG + FORK_B_OFFSET, forkBR(3)), apply: (s) => { s.walkSpeed += 7; s.birthRate += 2000; } },
  { id: 've_fb5', name: 'The Endless Stampede', cost: 200000, description: 'Walk speed +8, birth rate +5000/day',
    ...p(VELOCITY_DEG + FORK_B_OFFSET, forkBR(4)), apply: (s) => { s.walkSpeed += 8; s.birthRate += 5000; } },

  // Ability: Frenzy Pulse (from node 6, 7 nodes)
  { id: 've_ab1', name: 'Frenzy Pulse', cost: 100, description: 'Unlock: Walk speed x2 for 8s (cd 45s)',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(0)), apply: ab('frenzy_pulse') },
  { id: 've_ab2', name: 'Sustained Frenzy', cost: 350, description: 'Frenzy Pulse duration +4s',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(1)), apply: (_s, b) => { b.frenzyPulse.duration += 4000; } },
  { id: 've_ab3', name: 'Amplified Frenzy', cost: 1000, description: 'Frenzy Pulse multiplier x2.5',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(2)), apply: (_s, b) => { b.frenzyPulse.multiplier = 2.5; } },
  { id: 've_ab4', name: 'Relentless Frenzy', cost: 3000, description: 'Frenzy Pulse cooldown -10s',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(3)), apply: (_s, b) => { b.frenzyPulse.cooldown -= 10000; } },
  { id: 've_ab5', name: 'Overwhelming Frenzy', cost: 10000, description: 'Frenzy Pulse x3, duration +4s',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(4)), apply: (_s, b) => { b.frenzyPulse.multiplier = 3; b.frenzyPulse.duration += 4000; } },
  { id: 've_ab6', name: 'Eternal Frenzy', cost: 40000, description: 'Frenzy Pulse cd -10s, duration +4s',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(5)), apply: (_s, b) => { b.frenzyPulse.cooldown -= 10000; b.frenzyPulse.duration += 4000; } },
  { id: 've_ab7', name: 'Godspeed', cost: 150000, description: 'Frenzy Pulse x4, cd -5s',
    ...p(VELOCITY_DEG + ABILITY_OFFSET, abilR(6)), apply: (_s, b) => { b.frenzyPulse.multiplier = 4; b.frenzyPulse.cooldown -= 5000; } },

  // ═══════════════════════════════════════════════════════════════
  // DEVOTION — turnBackRate (nodes 34-66)
  // Total trunk reduction: -0.20 (from 0.30 → 0.10)
  // ═══════════════════════════════════════════════════════════════

  // Trunk (15 nodes): -0.01 x7, -0.015 x4, -0.02 x4 = -0.20
  { id: 'de_1', name: 'Linger', cost: 5, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG, trunkR(0)), apply: tb(0.01) },
  { id: 'de_2', name: 'Hesitation', cost: 8, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG, trunkR(1)), apply: tb(0.01) },
  { id: 'de_3', name: 'Doubt', cost: 15, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG, trunkR(2)), apply: tb(0.01) },
  { id: 'de_4', name: 'Wavering Faith', cost: 30, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG, trunkR(3)), apply: tb(0.01) },
  { id: 'de_5', name: 'Fading Hope', cost: 60, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG, trunkR(4)), apply: tb(0.01) },
  { id: 'de_6', name: 'Conviction', cost: 120, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG, trunkR(5)), apply: tb(0.01) },
  { id: 'de_7', name: 'Blind Devotion', cost: 300, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG, trunkR(6)), apply: tb(0.01) },
  { id: 'de_8', name: 'No Return', cost: 700, description: 'Turn-back rate -0.015',
    ...p(DEVOTION_DEG, trunkR(7)), apply: tb(0.015) },
  { id: 'de_9', name: 'The Abyss Calls', cost: 1500, description: 'Turn-back rate -0.015',
    ...p(DEVOTION_DEG, trunkR(8)), apply: tb(0.015) },
  { id: 'de_10', name: 'Absolute Faith', cost: 4000, description: 'Turn-back rate -0.015',
    ...p(DEVOTION_DEG, trunkR(9)), apply: tb(0.015) },
  { id: 'de_11', name: 'Unwavering Resolve', cost: 10000, description: 'Turn-back rate -0.02',
    ...p(DEVOTION_DEG, trunkR(10)), apply: tb(0.02) },
  { id: 'de_12', name: 'Shattered Will', cost: 25000, description: 'Turn-back rate -0.02',
    ...p(DEVOTION_DEG, trunkR(11)), apply: tb(0.02) },
  { id: 'de_13', name: 'Mind Erased', cost: 60000, description: 'Turn-back rate -0.02',
    ...p(DEVOTION_DEG, trunkR(12)), apply: tb(0.02) },
  { id: 'de_14', name: 'Empty Vessel', cost: 150000, description: 'Turn-back rate -0.02',
    ...p(DEVOTION_DEG, trunkR(13)), apply: tb(0.02) },
  { id: 'de_15', name: 'Total Surrender', cost: 500000, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG, trunkR(14)), apply: tb(0.01) },

  // Fork A (from node 5, 6 nodes): -0.01 x6 = -0.06
  { id: 'de_fa1', name: 'Seeds of Surrender', cost: 50, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG + FORK_A_OFFSET, forkAR(0)), apply: tb(0.01) },
  { id: 'de_fa2', name: 'Congregation of Shadows', cost: 150, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG + FORK_A_OFFSET, forkAR(1)), apply: tb(0.01) },
  { id: 'de_fa3', name: 'Mass Hypnosis', cost: 500, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG + FORK_A_OFFSET, forkAR(2)), apply: tb(0.01) },
  { id: 'de_fa4', name: 'Unbreakable Trance', cost: 2000, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG + FORK_A_OFFSET, forkAR(3)), apply: tb(0.01) },
  { id: 'de_fa5', name: 'Puppeteer\'s Thread', cost: 8000, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG + FORK_A_OFFSET, forkAR(4)), apply: tb(0.01) },
  { id: 'de_fa6', name: 'Absolute Control', cost: 30000, description: 'Turn-back rate -0.01',
    ...p(DEVOTION_DEG + FORK_A_OFFSET, forkAR(5)), apply: tb(0.01) },

  // Fork B (from node 9, 5 nodes): drag rate combos
  { id: 'de_fb1', name: 'Silenced Doubt', cost: 1200, description: 'Turn-back -0.01, drag +0.02',
    ...p(DEVOTION_DEG + FORK_B_OFFSET, forkBR(0)), apply: (s) => { s.turnBackRate = Math.max(TURN_BACK_MIN, s.turnBackRate - 0.01); s.dragRate += 0.02; } },
  { id: 'de_fb2', name: 'Covenant of Falling', cost: 5000, description: 'Turn-back -0.01, drag +0.03',
    ...p(DEVOTION_DEG + FORK_B_OFFSET, forkBR(1)), apply: (s) => { s.turnBackRate = Math.max(TURN_BACK_MIN, s.turnBackRate - 0.01); s.dragRate += 0.03; } },
  { id: 'de_fb3', name: 'Absolute Obedience', cost: 15000, description: 'Turn-back -0.01, drag +0.03',
    ...p(DEVOTION_DEG + FORK_B_OFFSET, forkBR(2)), apply: (s) => { s.turnBackRate = Math.max(TURN_BACK_MIN, s.turnBackRate - 0.01); s.dragRate += 0.03; } },
  { id: 'de_fb4', name: 'Hive Mind', cost: 50000, description: 'Turn-back -0.01, drag +0.04',
    ...p(DEVOTION_DEG + FORK_B_OFFSET, forkBR(3)), apply: (s) => { s.turnBackRate = Math.max(TURN_BACK_MIN, s.turnBackRate - 0.01); s.dragRate += 0.04; } },
  { id: 'de_fb5', name: 'One Will', cost: 200000, description: 'Turn-back -0.01, drag +0.05',
    ...p(DEVOTION_DEG + FORK_B_OFFSET, forkBR(4)), apply: (s) => { s.turnBackRate = Math.max(TURN_BACK_MIN, s.turnBackRate - 0.01); s.dragRate += 0.05; } },

  // Ability: Void Call (from node 6, 7 nodes)
  { id: 'de_ab1', name: 'Void Call', cost: 100, description: 'Unlock: Turn-back = 0 for 5s (cd 30s)',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(0)), apply: ab('void_call') },
  { id: 'de_ab2', name: 'Extended Silence', cost: 350, description: 'Void Call duration +3s',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(1)), apply: (_s, b) => { b.voidCall.duration += 3000; } },
  { id: 'de_ab3', name: 'Quickened Call', cost: 1000, description: 'Void Call cooldown -5s',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(2)), apply: (_s, b) => { b.voidCall.cooldown -= 5000; } },
  { id: 'de_ab4', name: 'Lingering Void', cost: 3000, description: 'Void Call duration +4s',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(3)), apply: (_s, b) => { b.voidCall.duration += 4000; } },
  { id: 'de_ab5', name: 'Resonant Void', cost: 10000, description: 'Void Call cooldown -5s',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(4)), apply: (_s, b) => { b.voidCall.cooldown -= 5000; } },
  { id: 'de_ab6', name: 'Eternal Void', cost: 40000, description: 'Void Call duration +5s, cd -5s',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(5)), apply: (_s, b) => { b.voidCall.duration += 5000; b.voidCall.cooldown -= 5000; } },
  { id: 'de_ab7', name: 'Absolute Void', cost: 150000, description: 'Void Call duration +5s, cd -5s',
    ...p(DEVOTION_DEG + ABILITY_OFFSET, abilR(6)), apply: (_s, b) => { b.voidCall.duration += 5000; b.voidCall.cooldown -= 5000; } },

  // ═══════════════════════════════════════════════════════════════
  // CONTAGION — dragRate (nodes 67-99)
  // Total trunk: +0.30 (from 0.05 → 0.35)
  // ═══════════════════════════════════════════════════════════════

  // Trunk (15 nodes): +0.01 x4, +0.02 x5, +0.03 x4, +0.04 x2 = +0.30
  { id: 'co_1', name: 'Whispered Doubt', cost: 5, description: 'Drag rate +0.01',
    ...p(CONTAGION_DEG, trunkR(0)), apply: dr(0.01) },
  { id: 'co_2', name: 'Shared Glance', cost: 8, description: 'Drag rate +0.01',
    ...p(CONTAGION_DEG, trunkR(1)), apply: dr(0.01) },
  { id: 'co_3', name: 'Herd Instinct', cost: 15, description: 'Drag rate +0.01',
    ...p(CONTAGION_DEG, trunkR(2)), apply: dr(0.01) },
  { id: 'co_4', name: 'Mass Anxiety', cost: 30, description: 'Drag rate +0.01',
    ...p(CONTAGION_DEG, trunkR(3)), apply: dr(0.01) },
  { id: 'co_5', name: 'Panic Spread', cost: 60, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG, trunkR(4)), apply: dr(0.02) },
  { id: 'co_6', name: 'Chain Reaction', cost: 120, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG, trunkR(5)), apply: dr(0.02) },
  { id: 'co_7', name: 'Mob Mentality', cost: 300, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG, trunkR(6)), apply: dr(0.02) },
  { id: 'co_8', name: 'Hysteria', cost: 700, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG, trunkR(7)), apply: dr(0.02) },
  { id: 'co_9', name: 'Cascade Effect', cost: 1500, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG, trunkR(8)), apply: dr(0.02) },
  { id: 'co_10', name: 'Mass Psychosis', cost: 4000, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG, trunkR(9)), apply: dr(0.03) },
  { id: 'co_11', name: 'Fever Dream', cost: 10000, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG, trunkR(10)), apply: dr(0.03) },
  { id: 'co_12', name: 'Collective Madness', cost: 25000, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG, trunkR(11)), apply: dr(0.03) },
  { id: 'co_13', name: 'Plague of Despair', cost: 60000, description: 'Drag rate +0.04',
    ...p(CONTAGION_DEG, trunkR(12)), apply: dr(0.04) },
  { id: 'co_14', name: 'Total Infection', cost: 150000, description: 'Drag rate +0.04',
    ...p(CONTAGION_DEG, trunkR(13)), apply: dr(0.04) },
  { id: 'co_15', name: 'Apocalyptic Spread', cost: 500000, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG, trunkR(14)), apply: dr(0.03) },

  // Fork A (from node 5, 6 nodes): +0.02 x3, +0.03 x3 = +0.15
  { id: 'co_fa1', name: 'Curious Bystanders', cost: 50, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG + FORK_A_OFFSET, forkAR(0)), apply: dr(0.02) },
  { id: 'co_fa2', name: 'Peer Pressure', cost: 150, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG + FORK_A_OFFSET, forkAR(1)), apply: dr(0.02) },
  { id: 'co_fa3', name: 'Social Contagion', cost: 500, description: 'Drag rate +0.02',
    ...p(CONTAGION_DEG + FORK_A_OFFSET, forkAR(2)), apply: dr(0.02) },
  { id: 'co_fa4', name: 'Mass Delusion', cost: 2000, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG + FORK_A_OFFSET, forkAR(3)), apply: dr(0.03) },
  { id: 'co_fa5', name: 'Psychic Plague', cost: 8000, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG + FORK_A_OFFSET, forkAR(4)), apply: dr(0.03) },
  { id: 'co_fa6', name: 'Unstoppable Panic', cost: 30000, description: 'Drag rate +0.03',
    ...p(CONTAGION_DEG + FORK_A_OFFSET, forkAR(5)), apply: dr(0.03) },

  // Fork B (from node 9, 5 nodes): birth rate combos
  { id: 'co_fb1', name: 'Ripple Effect', cost: 1200, description: 'Drag +0.02, birth +100/day',
    ...p(CONTAGION_DEG + FORK_B_OFFSET, forkBR(0)), apply: (s) => { s.dragRate += 0.02; s.birthRate += 100; } },
  { id: 'co_fb2', name: 'Undertow', cost: 5000, description: 'Drag +0.03, birth +300/day',
    ...p(CONTAGION_DEG + FORK_B_OFFSET, forkBR(1)), apply: (s) => { s.dragRate += 0.03; s.birthRate += 300; } },
  { id: 'co_fb3', name: 'Tsunami of Flesh', cost: 15000, description: 'Drag +0.03, birth +1000/day',
    ...p(CONTAGION_DEG + FORK_B_OFFSET, forkBR(2)), apply: (s) => { s.dragRate += 0.03; s.birthRate += 1000; } },
  { id: 'co_fb4', name: 'Tidal Wave', cost: 50000, description: 'Drag +0.04, birth +5000/day',
    ...p(CONTAGION_DEG + FORK_B_OFFSET, forkBR(3)), apply: (s) => { s.dragRate += 0.04; s.birthRate += 5000; } },
  { id: 'co_fb5', name: 'World Flood', cost: 200000, description: 'Drag +0.05, birth +20000/day',
    ...p(CONTAGION_DEG + FORK_B_OFFSET, forkBR(4)), apply: (s) => { s.dragRate += 0.05; s.birthRate += 20000; } },

  // Ability: Dark Wave (from node 6, 7 nodes)
  { id: 'co_ab1', name: 'Dark Wave', cost: 100, description: 'Unlock: Spawn 5 humans (cd 30s)',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(0)), apply: ab('dark_wave') },
  { id: 'co_ab2', name: 'Swelling Tide', cost: 350, description: 'Dark Wave +3 humans',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(1)), apply: (_s, b) => { b.darkWave.count += 3; } },
  { id: 'co_ab3', name: 'Quickened Tide', cost: 1000, description: 'Dark Wave cooldown -5s',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(2)), apply: (_s, b) => { b.darkWave.cooldown -= 5000; } },
  { id: 'co_ab4', name: 'Crashing Wave', cost: 3000, description: 'Dark Wave +5 humans',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(3)), apply: (_s, b) => { b.darkWave.count += 5; } },
  { id: 'co_ab5', name: 'Relentless Surge', cost: 10000, description: 'Dark Wave cooldown -5s',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(4)), apply: (_s, b) => { b.darkWave.cooldown -= 5000; } },
  { id: 'co_ab6', name: 'Apocalyptic Flood', cost: 40000, description: 'Dark Wave +7 humans, cd -5s',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(5)), apply: (_s, b) => { b.darkWave.count += 7; b.darkWave.cooldown -= 5000; } },
  { id: 'co_ab7', name: 'Endless Deluge', cost: 150000, description: 'Dark Wave +10 humans, cd -5s',
    ...p(CONTAGION_DEG + ABILITY_OFFSET, abilR(6)), apply: (_s, b) => { b.darkWave.count += 10; b.darkWave.cooldown -= 5000; } },

  // ═══════════════════════════════════════════════════════════════
  // MACHINERY — autoClickers + clickCooldown (nodes 100-132)
  // ═══════════════════════════════════════════════════════════════

  // Trunk (15 nodes): alternating cooldown reduction & auto-clickers
  //   total: -490ms cooldown, +8 auto-clickers
  { id: 'ma_1', name: 'Loose Gear', cost: 5, description: 'Click cooldown -20ms',
    ...p(MACHINERY_DEG, trunkR(0)), apply: cc(20) },
  { id: 'ma_2', name: 'First Automaton', cost: 8, description: '+1 auto-clicker',
    ...p(MACHINERY_DEG, trunkR(1)), apply: ac(1) },
  { id: 'ma_3', name: 'Oiled Mechanism', cost: 15, description: 'Click cooldown -30ms',
    ...p(MACHINERY_DEG, trunkR(2)), apply: cc(30) },
  { id: 'ma_4', name: 'Second Automaton', cost: 30, description: '+1 auto-clicker',
    ...p(MACHINERY_DEG, trunkR(3)), apply: ac(1) },
  { id: 'ma_5', name: 'Precision Gears', cost: 60, description: 'Click cooldown -30ms',
    ...p(MACHINERY_DEG, trunkR(4)), apply: cc(30) },
  { id: 'ma_6', name: 'Third Automaton', cost: 120, description: '+1 auto-clicker',
    ...p(MACHINERY_DEG, trunkR(5)), apply: ac(1) },
  { id: 'ma_7', name: 'Clockwork Engine', cost: 300, description: 'Click cooldown -40ms',
    ...p(MACHINERY_DEG, trunkR(6)), apply: cc(40) },
  { id: 'ma_8', name: 'Fourth Automaton', cost: 700, description: '+1 auto-clicker',
    ...p(MACHINERY_DEG, trunkR(7)), apply: ac(1) },
  { id: 'ma_9', name: 'Perpetual Motion', cost: 1500, description: 'Click cooldown -50ms',
    ...p(MACHINERY_DEG, trunkR(8)), apply: cc(50) },
  { id: 'ma_10', name: 'The Machine God', cost: 4000, description: '+2 auto-clickers',
    ...p(MACHINERY_DEG, trunkR(9)), apply: ac(2) },
  { id: 'ma_11', name: 'Quantum Gears', cost: 10000, description: 'Click cooldown -60ms',
    ...p(MACHINERY_DEG, trunkR(10)), apply: cc(60) },
  { id: 'ma_12', name: 'Assembly Line', cost: 25000, description: 'Click cooldown -70ms',
    ...p(MACHINERY_DEG, trunkR(11)), apply: cc(70) },
  { id: 'ma_13', name: 'Factory of Doom', cost: 60000, description: '+1 auto-clicker',
    ...p(MACHINERY_DEG, trunkR(12)), apply: ac(1) },
  { id: 'ma_14', name: 'Industrial Revolution', cost: 150000, description: 'Click cooldown -80ms, +1 AC',
    ...p(MACHINERY_DEG, trunkR(13)), apply: (s, b) => { s.clickCooldown = Math.max(100, s.clickCooldown - 80); b.autoClickerCount += 1; } },
  { id: 'ma_15', name: 'Singularity Engine', cost: 500000, description: 'Click cooldown -80ms, +1 AC',
    ...p(MACHINERY_DEG, trunkR(14)), apply: (s, b) => { s.clickCooldown = Math.max(100, s.clickCooldown - 80); b.autoClickerCount += 1; } },

  // Fork A (from node 5, 6 nodes): cooldown focused — total -330ms
  { id: 'ma_fa1', name: 'Swift Mechanisms', cost: 50, description: 'Click cooldown -30ms',
    ...p(MACHINERY_DEG + FORK_A_OFFSET, forkAR(0)), apply: cc(30) },
  { id: 'ma_fa2', name: 'Overclocked Abyss', cost: 150, description: 'Click cooldown -40ms',
    ...p(MACHINERY_DEG + FORK_A_OFFSET, forkAR(1)), apply: cc(40) },
  { id: 'ma_fa3', name: 'Temporal Compression', cost: 500, description: 'Click cooldown -50ms',
    ...p(MACHINERY_DEG + FORK_A_OFFSET, forkAR(2)), apply: cc(50) },
  { id: 'ma_fa4', name: 'Infinite Gears', cost: 2000, description: 'Click cooldown -60ms',
    ...p(MACHINERY_DEG + FORK_A_OFFSET, forkAR(3)), apply: cc(60) },
  { id: 'ma_fa5', name: 'Warp Drive', cost: 8000, description: 'Click cooldown -70ms',
    ...p(MACHINERY_DEG + FORK_A_OFFSET, forkAR(4)), apply: cc(70) },
  { id: 'ma_fa6', name: 'Time Collapse', cost: 30000, description: 'Click cooldown -80ms',
    ...p(MACHINERY_DEG + FORK_A_OFFSET, forkAR(5)), apply: cc(80) },

  // Fork B (from node 9, 5 nodes): auto-clicker focused — total +9 AC
  { id: 'ma_fb1', name: 'Shadow Foreman', cost: 1200, description: '+1 auto-clicker',
    ...p(MACHINERY_DEG + FORK_B_OFFSET, forkBR(0)), apply: ac(1) },
  { id: 'ma_fb2', name: 'Necromantic Workshop', cost: 5000, description: '+2 auto-clickers',
    ...p(MACHINERY_DEG + FORK_B_OFFSET, forkBR(1)), apply: ac(2) },
  { id: 'ma_fb3', name: 'Army of Oblivion', cost: 15000, description: '+2 auto-clickers',
    ...p(MACHINERY_DEG + FORK_B_OFFSET, forkBR(2)), apply: ac(2) },
  { id: 'ma_fb4', name: 'Legion of Gears', cost: 50000, description: '+2 auto-clickers',
    ...p(MACHINERY_DEG + FORK_B_OFFSET, forkBR(3)), apply: ac(2) },
  { id: 'ma_fb5', name: 'The Swarm', cost: 200000, description: '+2 auto-clickers',
    ...p(MACHINERY_DEG + FORK_B_OFFSET, forkBR(4)), apply: ac(2) },

  // Ability: Soul Harvest (from node 6, 7 nodes)
  { id: 'ma_ab1', name: 'Soul Harvest', cost: 100, description: 'Unlock: Souls x2 for 10s (cd 40s)',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(0)), apply: ab('soul_harvest') },
  { id: 'ma_ab2', name: 'Extended Harvest', cost: 350, description: 'Soul Harvest duration +5s',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(1)), apply: (_s, b) => { b.soulHarvest.duration += 5000; } },
  { id: 'ma_ab3', name: 'Amplified Harvest', cost: 1000, description: 'Soul Harvest x2.5',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(2)), apply: (_s, b) => { b.soulHarvest.multiplier = 2.5; } },
  { id: 'ma_ab4', name: 'Quickened Harvest', cost: 3000, description: 'Soul Harvest cooldown -10s',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(3)), apply: (_s, b) => { b.soulHarvest.cooldown -= 10000; } },
  { id: 'ma_ab5', name: 'Overwhelming Harvest', cost: 10000, description: 'Soul Harvest x3, duration +5s',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(4)), apply: (_s, b) => { b.soulHarvest.multiplier = 3; b.soulHarvest.duration += 5000; } },
  { id: 'ma_ab6', name: 'Eternal Harvest', cost: 40000, description: 'Soul Harvest cd -10s, duration +5s',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(5)), apply: (_s, b) => { b.soulHarvest.cooldown -= 10000; b.soulHarvest.duration += 5000; } },
  { id: 'ma_ab7', name: 'Infinite Reaping', cost: 150000, description: 'Soul Harvest x4, cd -5s',
    ...p(MACHINERY_DEG + ABILITY_OFFSET, abilR(6)), apply: (_s, b) => { b.soulHarvest.multiplier = 4; b.soulHarvest.cooldown -= 5000; } },

  // ═══════════════════════════════════════════════════════════════
  // GENESIS — soulMultiplier + deathMultiplier + birthratePerSec (nodes 133-165)
  // ═══════════════════════════════════════════════════════════════

  // Trunk (15 nodes): soulMultiplier — total +29 (from 1 → 30)
  { id: 'ge_1', name: 'Dark Ember', cost: 5, description: 'Soul multiplier +0.1',
    ...p(GENESIS_DEG, trunkR(0)), apply: sm(0.1) },
  { id: 'ge_2', name: 'Soul Spark', cost: 8, description: 'Soul multiplier +0.1',
    ...p(GENESIS_DEG, trunkR(1)), apply: sm(0.1) },
  { id: 'ge_3', name: 'Growing Hunger', cost: 15, description: 'Soul multiplier +0.2',
    ...p(GENESIS_DEG, trunkR(2)), apply: sm(0.2) },
  { id: 'ge_4', name: 'Death\'s Tithe', cost: 30, description: 'Soul multiplier +0.3',
    ...p(GENESIS_DEG, trunkR(3)), apply: sm(0.3) },
  { id: 'ge_5', name: 'Reaping Wind', cost: 60, description: 'Soul multiplier +0.5',
    ...p(GENESIS_DEG, trunkR(4)), apply: sm(0.5) },
  { id: 'ge_6', name: 'Soul Furnace', cost: 120, description: 'Soul multiplier +0.8',
    ...p(GENESIS_DEG, trunkR(5)), apply: sm(0.8) },
  { id: 'ge_7', name: 'Dark Harvest', cost: 300, description: 'Soul multiplier +1',
    ...p(GENESIS_DEG, trunkR(6)), apply: sm(1) },
  { id: 'ge_8', name: 'Essence Drain', cost: 700, description: 'Soul multiplier +1.5',
    ...p(GENESIS_DEG, trunkR(7)), apply: sm(1.5) },
  { id: 'ge_9', name: 'Death\'s Bounty', cost: 1500, description: 'Soul multiplier +2',
    ...p(GENESIS_DEG, trunkR(8)), apply: sm(2) },
  { id: 'ge_10', name: 'The Soul Singularity', cost: 4000, description: 'Soul multiplier +2.5',
    ...p(GENESIS_DEG, trunkR(9)), apply: sm(2.5) },
  { id: 'ge_11', name: 'Void Harvester', cost: 10000, description: 'Soul multiplier +3',
    ...p(GENESIS_DEG, trunkR(10)), apply: sm(3) },
  { id: 'ge_12', name: 'Cosmic Reaper', cost: 25000, description: 'Soul multiplier +4',
    ...p(GENESIS_DEG, trunkR(11)), apply: sm(4) },
  { id: 'ge_13', name: 'Dimensional Rift', cost: 60000, description: 'Soul multiplier +5',
    ...p(GENESIS_DEG, trunkR(12)), apply: sm(5) },
  { id: 'ge_14', name: 'Infinity Engine', cost: 150000, description: 'Soul multiplier +5',
    ...p(GENESIS_DEG, trunkR(13)), apply: sm(5) },
  { id: 'ge_15', name: 'The God Eater', cost: 500000, description: 'Soul multiplier +3',
    ...p(GENESIS_DEG, trunkR(14)), apply: sm(3) },

  // Fork A (from node 5, 6 nodes): soulMultiplier + birthratePerSec combos
  { id: 'ge_fa1', name: 'Greedy Grasp', cost: 50, description: 'Soul mult +0.5, births +1/s',
    ...p(GENESIS_DEG + FORK_A_OFFSET, forkAR(0)), apply: (s, b) => { b.soulMultiplier += 0.5; s.birthratePerSec += 1; } },
  { id: 'ge_fa2', name: 'Soul Taxation', cost: 150, description: 'Soul mult +1, births +2/s',
    ...p(GENESIS_DEG + FORK_A_OFFSET, forkAR(1)), apply: (s, b) => { b.soulMultiplier += 1; s.birthratePerSec += 2; } },
  { id: 'ge_fa3', name: 'Spiritual Monopoly', cost: 500, description: 'Soul mult +1.5, births +3/s',
    ...p(GENESIS_DEG + FORK_A_OFFSET, forkAR(2)), apply: (s, b) => { b.soulMultiplier += 1.5; s.birthratePerSec += 3; } },
  { id: 'ge_fa4', name: 'Philosopher\'s Reap', cost: 2000, description: 'Soul mult +2, births +5/s',
    ...p(GENESIS_DEG + FORK_A_OFFSET, forkAR(3)), apply: (s, b) => { b.soulMultiplier += 2; s.birthratePerSec += 5; } },
  { id: 'ge_fa5', name: 'Eternal Hunger', cost: 8000, description: 'Soul mult +3, births +10/s',
    ...p(GENESIS_DEG + FORK_A_OFFSET, forkAR(4)), apply: (s, b) => { b.soulMultiplier += 3; s.birthratePerSec += 10; } },
  { id: 'ge_fa6', name: 'Omnivorous God', cost: 30000, description: 'Soul mult +5, births +20/s',
    ...p(GENESIS_DEG + FORK_A_OFFSET, forkAR(5)), apply: (s, b) => { b.soulMultiplier += 5; s.birthratePerSec += 20; } },

  // Fork B (from node 9, 5 nodes): DEATH MULTIPLIER — multiplicative
  // x2 → x5 → x10 → x20 → x50 = total x100,000
  { id: 'ge_fb1', name: 'Ticking Clock', cost: 800, description: 'Death multiplier x2',
    ...p(GENESIS_DEG + FORK_B_OFFSET, forkBR(0)), apply: dm(2) },
  { id: 'ge_fb2', name: 'Mass Graves', cost: 5000, description: 'Death multiplier x5',
    ...p(GENESIS_DEG + FORK_B_OFFSET, forkBR(1)), apply: dm(5) },
  { id: 'ge_fb3', name: 'Reaper\'s Scythe', cost: 30000, description: 'Death multiplier x10',
    ...p(GENESIS_DEG + FORK_B_OFFSET, forkBR(2)), apply: dm(10) },
  { id: 'ge_fb4', name: 'Apocalypse Herald', cost: 200000, description: 'Death multiplier x20',
    ...p(GENESIS_DEG + FORK_B_OFFSET, forkBR(3)), apply: dm(20) },
  { id: 'ge_fb5', name: 'Extinction Engine', cost: 1000000, description: 'Death multiplier x50',
    ...p(GENESIS_DEG + FORK_B_OFFSET, forkBR(4)), apply: dm(50) },

  // Ability: Silence (from node 6, 7 nodes)
  { id: 'ge_ab1', name: 'Silence', cost: 100, description: 'Unlock: birthratePerSec = 0 for 15s (cd 60s)',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(0)), apply: ab('silence') },
  { id: 'ge_ab2', name: 'Extended Silence', cost: 350, description: 'Silence duration +5s',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(1)), apply: (_s, b) => { b.silence.duration += 5000; } },
  { id: 'ge_ab3', name: 'Quickened Silence', cost: 1000, description: 'Silence cooldown -10s',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(2)), apply: (_s, b) => { b.silence.cooldown -= 10000; } },
  { id: 'ge_ab4', name: 'Deep Silence', cost: 3000, description: 'Silence duration +5s',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(3)), apply: (_s, b) => { b.silence.duration += 5000; } },
  { id: 'ge_ab5', name: 'Resonant Silence', cost: 10000, description: 'Silence cooldown -10s',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(4)), apply: (_s, b) => { b.silence.cooldown -= 10000; } },
  { id: 'ge_ab6', name: 'Eternal Silence', cost: 40000, description: 'Silence duration +10s, cd -10s',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(5)), apply: (_s, b) => { b.silence.duration += 10000; b.silence.cooldown -= 10000; } },
  { id: 'ge_ab7', name: 'The Great Mute', cost: 150000, description: 'Silence duration +10s, cd -10s',
    ...p(GENESIS_DEG + ABILITY_OFFSET, abilR(6)), apply: (_s, b) => { b.silence.duration += 10000; b.silence.cooldown -= 10000; } },
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

relaxLayout(NODES, EDGE_IDS, 0.06, 0.09, 150);

const TREE: SkillTree = {
  id: 'whisper',
  name: 'The Ancient God',
  color: '#aaccff',
  nodes: NODES,
  edges: buildEdges(NODES, EDGE_IDS),
};

export const SKILL_TREES: SkillTree[] = [TREE];
