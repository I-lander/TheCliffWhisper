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
  walkSpeedBonus: number;
  extraDaySeconds: number;
  cardDropRate: number;
  autoClickerCount: number;
  soulMultiplier: number;
  abilities: string[];
}

export const DEFAULT_BONUSES: ConstellationBonuses = {
  walkSpeedBonus: 1.0,
  extraDaySeconds: 0,
  cardDropRate: 0,
  autoClickerCount: 0,
  soulMultiplier: 1,
  abilities: [],
};

/*
  Constellation "The Ancient God" — 70 nodes, 8 branches radiating from root at center.
  Each branch can fork. Positions use polar coordinates for organic radial layout.

  Branch angles (degrees from right, counter-clockwise):
    Haste     120°   — walk speed           (9 nodes: main 1-6, fork 7-9)
    Faith     165°   — turn-back rate       (9 nodes: main 10-15, fork 16-18)
    Tide      210°   — drag rate            (8 nodes: main 19-23, fork 24-26)
    Void      250°   — birth rate           (9 nodes: main 27-32, fork 33-35)
    Automation 295°  — auto-clickers        (9 nodes: main 36-41, fork 42-44)
    Frenzy    345°   — click cooldown       (8 nodes: main 45-49, fork 50-52)
    Power      30°   — abilities            (9 nodes: main 53-58, fork 59-61)
    Harvest    75°   — soul multiplier      (8 nodes: main 62-66, fork 67-69)
*/

// Helper: polar to (x, y) with wobble for organic feel
function p(angleDeg: number, dist: number, wx = 0, wy = 0): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.round((Math.cos(rad) * dist + wx) * 100) / 100,
    y: Math.round((-Math.sin(rad) * dist + wy) * 100) / 100,
  };
}

// ── Branch position generators ──

function mainPath(angle: number, count: number, startDist = 0.12, step = 0.13): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const d = startDist + i * step;
    const wobbleX = ((i % 3) - 1) * 0.02;
    const wobbleY = ((i % 2) === 0 ? 0.015 : -0.01);
    pts.push(p(angle + (i % 2 === 0 ? 1.5 : -1.5), d, wobbleX, wobbleY));
  }
  return pts;
}

function forkPath(angle: number, forkDist: number, count: number, step = 0.13): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const d = forkDist + (i + 1) * step;
    const wobbleX = ((i % 2) === 0 ? -0.015 : 0.02);
    const wobbleY = ((i % 3) - 1) * 0.015;
    pts.push(p(angle + (i % 2 === 0 ? -2 : 2), d, wobbleX, wobbleY));
  }
  return pts;
}

// ── Compute positions ──
const hastePts = mainPath(120, 6);
const hasteForkPts = forkPath(145, 0.50, 3);

const faithPts = mainPath(165, 6);
const faithForkPts = forkPath(188, 0.50, 3);

const tidePts = mainPath(210, 5);
const tideForkPts = forkPath(233, 0.38, 3);

const voidPts = mainPath(250, 6);
const voidForkPts = forkPath(272, 0.50, 3);

const autoPts = mainPath(295, 6);
const autoForkPts = forkPath(318, 0.50, 3);

const frenzyPts = mainPath(345, 5);
const frenzyForkPts = forkPath(10, 0.38, 3);

const powerPts = mainPath(30, 6);
const powerForkPts = forkPath(55, 0.50, 3);

const harvestPts = mainPath(75, 5);
const harvestForkPts = forkPath(98, 0.38, 3);

const TREE: SkillTree = {
  id: 'whisper',
  name: 'The Ancient God',
  color: '#aaccff',
  edges: [
    // Haste (main 1-6, fork from 4 → 7-9)
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
    [4, 7], [7, 8], [8, 9],
    // Faith (main 10-15, fork from 13 → 16-18)
    [0, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15],
    [13, 16], [16, 17], [17, 18],
    // Tide (main 19-23, fork from 21 → 24-26)
    [0, 19], [19, 20], [20, 21], [21, 22], [22, 23],
    [21, 24], [24, 25], [25, 26],
    // Void (main 27-32, fork from 30 → 33-35)
    [0, 27], [27, 28], [28, 29], [29, 30], [30, 31], [31, 32],
    [30, 33], [33, 34], [34, 35],
    // Automation (main 36-41, fork from 39 → 42-44)
    [0, 36], [36, 37], [37, 38], [38, 39], [39, 40], [40, 41],
    [39, 42], [42, 43], [43, 44],
    // Frenzy (main 45-49, fork from 47 → 50-52)
    [0, 45], [45, 46], [46, 47], [47, 48], [48, 49],
    [47, 50], [50, 51], [51, 52],
    // Power (main 53-58, fork from 55 → 59-61)
    [0, 53], [53, 54], [54, 55], [55, 56], [56, 57], [57, 58],
    [55, 59], [59, 60], [60, 61],
    // Harvest (main 62-66, fork from 64 → 67-69)
    [0, 62], [62, 63], [63, 64], [64, 65], [65, 66],
    [64, 67], [67, 68], [68, 69],
  ],
  nodes: [
    // ═══ 0: Root ═══
    {
      id: 'root', name: 'The First Whisper', cost: 3,
      description: 'Turn-back rate -0.02',
      ...p(0, 0),
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.02); },
    },

    // ═══ Haste branch — walk speed (1-6 main, 7-9 fork) ═══
    {
      id: 'ha_1', name: 'Quick Step', cost: 2,
      description: 'Walk speed +8%',
      ...hastePts[0],
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.08); b.walkSpeedBonus *= 1.08; },
    },
    {
      id: 'ha_2', name: 'Light Feet', cost: 3,
      description: 'Walk speed +10%',
      ...hastePts[1],
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.10); b.walkSpeedBonus *= 1.10; },
    },
    {
      id: 'ha_3', name: 'Swift Current', cost: 5,
      description: 'Walk speed +10%',
      ...hastePts[2],
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.10); b.walkSpeedBonus *= 1.10; },
    },
    {
      id: 'ha_4', name: 'Gale Force', cost: 8,
      description: 'Walk speed +12%',
      ...hastePts[3],
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.12); b.walkSpeedBonus *= 1.12; },
    },
    {
      id: 'ha_5', name: 'Fevered March', cost: 12,
      description: 'Walk speed +15%',
      ...hastePts[4],
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.15); b.walkSpeedBonus *= 1.15; },
    },
    {
      id: 'ha_6', name: 'Relentless Tide', cost: 18,
      description: 'Walk speed +20%',
      ...hastePts[5],
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.20); b.walkSpeedBonus *= 1.20; },
    },
    // Fork: Haste → Frenzy Pulse ability
    {
      id: 'ha_f1', name: 'Rushing Blood', cost: 10,
      description: 'Walk speed +12%',
      ...hasteForkPts[0],
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.12); b.walkSpeedBonus *= 1.12; },
    },
    {
      id: 'ha_f2', name: 'Adrenaline', cost: 14,
      description: 'Walk speed +15%',
      ...hasteForkPts[1],
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.15); b.walkSpeedBonus *= 1.15; },
    },
    {
      id: 'ha_f3', name: 'Frenzy Pulse', cost: 20,
      description: 'Unlock ability: Walk speed x3 for 10s',
      ...hasteForkPts[2],
      apply: (_s, b) => { b.abilities.push('frenzy_pulse'); },
    },

    // ═══ Faith branch — turn-back rate (10-15 main, 16-18 fork) ═══
    {
      id: 'fa_1', name: 'Linger', cost: 2,
      description: 'Turn-back rate -0.02',
      ...faithPts[0],
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.02); },
    },
    {
      id: 'fa_2', name: 'Hesitation', cost: 3,
      description: 'Turn-back rate -0.03',
      ...faithPts[1],
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.03); },
    },
    {
      id: 'fa_3', name: 'Doubt', cost: 5,
      description: 'Turn-back rate -0.03',
      ...faithPts[2],
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.03); },
    },
    {
      id: 'fa_4', name: 'Conviction', cost: 8,
      description: 'Turn-back rate -0.04',
      ...faithPts[3],
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.04); },
    },
    {
      id: 'fa_5', name: 'Blind Faith', cost: 12,
      description: 'Turn-back rate -0.04',
      ...faithPts[4],
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.04); },
    },
    {
      id: 'fa_6', name: 'No Return', cost: 18,
      description: 'Turn-back rate -0.05',
      ...faithPts[5],
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.05); },
    },
    // Fork: Faith → deeper reductions
    {
      id: 'fa_f1', name: 'Zealotry', cost: 10,
      description: 'Turn-back rate -0.03',
      ...faithForkPts[0],
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.03); },
    },
    {
      id: 'fa_f2', name: 'Fanaticism', cost: 14,
      description: 'Turn-back rate -0.04',
      ...faithForkPts[1],
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.04); },
    },
    {
      id: 'fa_f3', name: 'Absolute Surrender', cost: 20,
      description: 'Turn-back rate -0.06',
      ...faithForkPts[2],
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.06); },
    },

    // ═══ Tide branch — drag rate (19-23 main, 24-26 fork) ═══
    {
      id: 'ti_1', name: 'Resonance', cost: 2,
      description: 'Drag rate +0.03',
      ...tidePts[0],
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.03); },
    },
    {
      id: 'ti_2', name: 'Undertow', cost: 4,
      description: 'Drag rate +0.04',
      ...tidePts[1],
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.04); },
    },
    {
      id: 'ti_3', name: 'Chain Pull', cost: 7,
      description: 'Drag rate +0.06',
      ...tidePts[2],
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.06); },
    },
    {
      id: 'ti_4', name: 'Mass Calling', cost: 11,
      description: 'Drag rate +0.08',
      ...tidePts[3],
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.08); },
    },
    {
      id: 'ti_5', name: 'Mass Hysteria', cost: 16,
      description: 'Drag rate +0.12',
      ...tidePts[4],
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.12); },
    },
    // Fork: Tide → Chain of Souls ability
    {
      id: 'ti_f1', name: 'Linked Fate', cost: 8,
      description: 'Drag rate +0.05',
      ...tideForkPts[0],
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.05); },
    },
    {
      id: 'ti_f2', name: 'Bound Souls', cost: 12,
      description: 'Drag rate +0.08',
      ...tideForkPts[1],
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.08); },
    },
    {
      id: 'ti_f3', name: 'Chain of Souls', cost: 18,
      description: 'Unlock ability: Chain jumps for 15s',
      ...tideForkPts[2],
      apply: (_s, b) => { b.abilities.push('chain_of_souls'); },
    },

    // ═══ Void branch — birth rate (27-32 main, 33-35 fork) ═══
    {
      id: 'vo_1', name: 'Whispered Doubt', cost: 3,
      description: 'Birth rate -5%',
      ...voidPts[0],
      apply: (s) => { s.birthRate = Math.max(0, Math.round(s.birthRate * 0.95)); },
    },
    {
      id: 'vo_2', name: 'Fading Hope', cost: 4,
      description: 'Birth rate -6%',
      ...voidPts[1],
      apply: (s) => { s.birthRate = Math.max(0, Math.round(s.birthRate * 0.94)); },
    },
    {
      id: 'vo_3', name: 'Barren Wind', cost: 7,
      description: 'Birth rate -8%',
      ...voidPts[2],
      apply: (s) => { s.birthRate = Math.max(0, Math.round(s.birthRate * 0.92)); },
    },
    {
      id: 'vo_4', name: 'Empty Cradles', cost: 11,
      description: 'Birth rate -10%',
      ...voidPts[3],
      apply: (s) => { s.birthRate = Math.max(0, Math.round(s.birthRate * 0.90)); },
    },
    {
      id: 'vo_5', name: 'Dying Lineage', cost: 15,
      description: 'Birth rate -12%',
      ...voidPts[4],
      apply: (s) => { s.birthRate = Math.max(0, Math.round(s.birthRate * 0.88)); },
    },
    {
      id: 'vo_6', name: 'Silence of the Womb', cost: 22,
      description: 'Birth rate -15%',
      ...voidPts[5],
      apply: (s) => { s.birthRate = Math.max(0, Math.round(s.birthRate * 0.85)); },
    },
    // Fork: Void → Silence ability
    {
      id: 'vo_f1', name: 'Sterile Ground', cost: 12,
      description: 'Birth rate -8%',
      ...voidForkPts[0],
      apply: (s) => { s.birthRate = Math.max(0, Math.round(s.birthRate * 0.92)); },
    },
    {
      id: 'vo_f2', name: 'Withered Roots', cost: 16,
      description: 'Birth rate -10%',
      ...voidForkPts[1],
      apply: (s) => { s.birthRate = Math.max(0, Math.round(s.birthRate * 0.90)); },
    },
    {
      id: 'vo_f3', name: 'Silence', cost: 24,
      description: 'Unlock ability: Birth rate = 0 for rest of day',
      ...voidForkPts[2],
      apply: (_s, b) => { b.abilities.push('silence'); },
    },

    // ═══ Automation branch — auto-clickers (36-41 main, 42-44 fork) ═══
    {
      id: 'ac_1', name: 'Whisper', cost: 3,
      description: '+1 auto-clicker',
      ...autoPts[0],
      apply: (_s, b) => { b.autoClickerCount++; },
    },
    {
      id: 'ac_2', name: 'Echo', cost: 5,
      description: '+1 auto-clicker',
      ...autoPts[1],
      apply: (_s, b) => { b.autoClickerCount++; },
    },
    {
      id: 'ac_3', name: 'Murmur', cost: 8,
      description: '+1 auto-clicker',
      ...autoPts[2],
      apply: (_s, b) => { b.autoClickerCount++; },
    },
    {
      id: 'ac_4', name: 'Voice', cost: 12,
      description: '+1 auto-clicker',
      ...autoPts[3],
      apply: (_s, b) => { b.autoClickerCount++; },
    },
    {
      id: 'ac_5', name: 'Chant', cost: 16,
      description: '+1 auto-clicker',
      ...autoPts[4],
      apply: (_s, b) => { b.autoClickerCount++; },
    },
    {
      id: 'ac_6', name: 'The Chorus', cost: 22,
      description: '+1 auto-clicker',
      ...autoPts[5],
      apply: (_s, b) => { b.autoClickerCount++; },
    },
    // Fork: Automation → faster auto-click speed
    {
      id: 'ac_f1', name: 'Rapid Pulse', cost: 10,
      description: 'Auto-click speed +15%',
      ...autoForkPts[0],
      apply: (s) => { s.spawnInterval = Math.max(100, Math.round(s.spawnInterval * 0.85)); },
    },
    {
      id: 'ac_f2', name: 'Heartbeat', cost: 14,
      description: 'Auto-click speed +20%',
      ...autoForkPts[1],
      apply: (s) => { s.spawnInterval = Math.max(100, Math.round(s.spawnInterval * 0.80)); },
    },
    {
      id: 'ac_f3', name: 'Machine Heart', cost: 20,
      description: 'Auto-click speed +25%',
      ...autoForkPts[2],
      apply: (s) => { s.spawnInterval = Math.max(100, Math.round(s.spawnInterval * 0.75)); },
    },

    // ═══ Frenzy branch — click cooldown (45-49 main, 50-52 fork) ═══
    {
      id: 'fr_1', name: 'Eager Hands', cost: 2,
      description: 'Click cooldown -8%',
      ...frenzyPts[0],
      apply: (s) => { s.clickCooldown = Math.round(s.clickCooldown * 0.92); },
    },
    {
      id: 'fr_2', name: 'Itching Fingers', cost: 4,
      description: 'Click cooldown -10%',
      ...frenzyPts[1],
      apply: (s) => { s.clickCooldown = Math.round(s.clickCooldown * 0.90); },
    },
    {
      id: 'fr_3', name: 'Restless', cost: 7,
      description: 'Click cooldown -12%',
      ...frenzyPts[2],
      apply: (s) => { s.clickCooldown = Math.round(s.clickCooldown * 0.88); },
    },
    {
      id: 'fr_4', name: 'Fever', cost: 11,
      description: 'Click cooldown -15%',
      ...frenzyPts[3],
      apply: (s) => { s.clickCooldown = Math.round(s.clickCooldown * 0.85); },
    },
    {
      id: 'fr_5', name: 'Madness', cost: 16,
      description: 'Click cooldown -18%',
      ...frenzyPts[4],
      apply: (s) => { s.clickCooldown = Math.round(s.clickCooldown * 0.82); },
    },
    // Fork: Frenzy → even more cooldown
    {
      id: 'fr_f1', name: 'Twitching', cost: 8,
      description: 'Click cooldown -10%',
      ...frenzyForkPts[0],
      apply: (s) => { s.clickCooldown = Math.round(s.clickCooldown * 0.90); },
    },
    {
      id: 'fr_f2', name: 'Spasm', cost: 12,
      description: 'Click cooldown -12%',
      ...frenzyForkPts[1],
      apply: (s) => { s.clickCooldown = Math.round(s.clickCooldown * 0.88); },
    },
    {
      id: 'fr_f3', name: 'Seizure', cost: 18,
      description: 'Click cooldown -15%',
      ...frenzyForkPts[2],
      apply: (s) => { s.clickCooldown = Math.round(s.clickCooldown * 0.85); },
    },

    // ═══ Power branch — abilities (53-58 main, 59-61 fork) ═══
    {
      id: 'pw_1', name: 'Dark Reach', cost: 4,
      description: 'Turn-back rate -0.02',
      ...powerPts[0],
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.02); },
    },
    {
      id: 'pw_2', name: 'Void Call', cost: 8,
      description: 'Unlock ability: Force all humans to jump',
      ...powerPts[1],
      apply: (_s, b) => { b.abilities.push('void_call'); },
    },
    {
      id: 'pw_3', name: 'Gathering Storm', cost: 10,
      description: 'Walk speed +10%, Drag rate +0.04',
      ...powerPts[2],
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.10); b.walkSpeedBonus *= 1.10; s.dragRate = Math.min(1, s.dragRate + 0.04); },
    },
    {
      id: 'pw_4', name: 'Dark Wave', cost: 15,
      description: 'Unlock ability: Spawn 8 humans forced to jump',
      ...powerPts[3],
      apply: (_s, b) => { b.abilities.push('dark_wave'); },
    },
    {
      id: 'pw_5', name: 'Overwhelming Force', cost: 18,
      description: 'Drag rate +0.08, Turn-back -0.03',
      ...powerPts[4],
      apply: (s) => { s.dragRate = Math.min(1, s.dragRate + 0.08); s.turnBackRate = Math.max(0, s.turnBackRate - 0.03); },
    },
    {
      id: 'pw_6', name: 'Apocalypse', cost: 28,
      description: 'Walk speed +20%, all abilities CD -20%',
      ...powerPts[5],
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.20); b.walkSpeedBonus *= 1.20; },
    },
    // Fork: Power → more abilities
    {
      id: 'pw_f1', name: 'Soul Sight', cost: 12,
      description: 'Soul multiplier +0.5x',
      ...powerForkPts[0],
      apply: (_s, b) => { b.soulMultiplier += 0.5; },
    },
    {
      id: 'pw_f2', name: 'Soul Command', cost: 16,
      description: 'Turn-back rate -0.04',
      ...powerForkPts[1],
      apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.04); },
    },
    {
      id: 'pw_f3', name: 'Dominion', cost: 22,
      description: 'Walk speed +15%, Drag +0.06',
      ...powerForkPts[2],
      apply: (s, b) => { s.walkSpeed = Math.round(s.walkSpeed * 1.15); b.walkSpeedBonus *= 1.15; s.dragRate = Math.min(1, s.dragRate + 0.06); },
    },

    // ═══ Harvest branch — soul multiplier (62-66 main, 67-69 fork) ═══
    {
      id: 'hv_1', name: 'Glean', cost: 3,
      description: 'Soul multiplier +0.2x',
      ...harvestPts[0],
      apply: (_s, b) => { b.soulMultiplier += 0.2; },
    },
    {
      id: 'hv_2', name: 'Reap', cost: 5,
      description: 'Soul multiplier +0.3x',
      ...harvestPts[1],
      apply: (_s, b) => { b.soulMultiplier += 0.3; },
    },
    {
      id: 'hv_3', name: 'Abundance', cost: 8,
      description: 'Soul multiplier +0.5x',
      ...harvestPts[2],
      apply: (_s, b) => { b.soulMultiplier += 0.5; },
    },
    {
      id: 'hv_4', name: 'Bountiful Death', cost: 14,
      description: 'Soul multiplier +0.5x',
      ...harvestPts[3],
      apply: (_s, b) => { b.soulMultiplier += 0.5; },
    },
    {
      id: 'hv_5', name: 'Endless Harvest', cost: 20,
      description: 'Soul multiplier +1x',
      ...harvestPts[4],
      apply: (_s, b) => { b.soulMultiplier += 1.0; },
    },
    // Fork: Harvest → Soul Harvest ability
    {
      id: 'hv_f1', name: 'Soul Siphon', cost: 10,
      description: 'Soul multiplier +0.3x',
      ...harvestForkPts[0],
      apply: (_s, b) => { b.soulMultiplier += 0.3; },
    },
    {
      id: 'hv_f2', name: 'Death Tithe', cost: 14,
      description: 'Soul multiplier +0.5x',
      ...harvestForkPts[1],
      apply: (_s, b) => { b.soulMultiplier += 0.5; },
    },
    {
      id: 'hv_f3', name: 'Soul Harvest', cost: 20,
      description: 'Unlock ability: Double souls for 15s',
      ...harvestForkPts[2],
      apply: (_s, b) => { b.abilities.push('soul_harvest'); },
    },
  ],
};

export const SKILL_TREES: SkillTree[] = [TREE];
