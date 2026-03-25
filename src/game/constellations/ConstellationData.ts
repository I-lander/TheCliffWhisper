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
  Constellation "The Ancient God" — 160 nodes, 8 branches + cross-branch connectors.
  Root at center, branches radiate outward with forks and small passives.

  Node index map (by ID order in the array):
    0          : root
    1-18       : Haste      (walk speed)
    19-36      : Faith      (turn-back rate)
    37-50      : Tide       (drag rate)
    51-68      : Void       (birth rate)
    69-86      : Automation (auto-clickers)
    87-100     : Frenzy     (click cooldown)
    101-120    : Power      (abilities)
    121-136    : Harvest    (soul multiplier)
    137-141    : Supplemental small passives
    142-149    : Cross-branch connectors
*/

// Polar to cartesian with wobble
function p(deg: number, r: number, wx = 0, wy = 0): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return {
    x: Math.round((Math.cos(rad) * r + wx) * 100) / 100,
    y: Math.round((-Math.sin(rad) * r + wy) * 100) / 100,
  };
}

// Shorthand helpers
const ws = (v: number) => (s: PopulationStats, b: ConstellationBonuses) => { s.walkSpeed += v; b.walkSpeedBonus *= (s.walkSpeed / (s.walkSpeed - v)); };
const tb = (v: number) => (s: PopulationStats) => { s.turnBackRate = Math.max(0, s.turnBackRate - v); };
const dr = (v: number) => (s: PopulationStats) => { s.dragRate = Math.min(1, s.dragRate + v); };
const br = (v: number) => (s: PopulationStats) => { s.birthRate = Math.max(0, s.birthRate - v); };
const ac = (v: number) => (_s: PopulationStats, b: ConstellationBonuses) => { b.autoClickerCount += v; };
const si = (v: number) => (s: PopulationStats) => { s.spawnInterval = Math.max(100, s.spawnInterval - v); };
const cc = (v: number) => (s: PopulationStats) => { s.clickCooldown = Math.max(100, s.clickCooldown - v); };
const sm = (v: number) => (_s: PopulationStats, b: ConstellationBonuses) => { b.soulMultiplier += v; };
const ab = (id: string) => (_s: PopulationStats, b: ConstellationBonuses) => { b.abilities.push(id); };
const noop = () => {};

// Define edges by node ID pairs — resolved to index pairs after nodes are defined
const EDGE_IDS: [string, string][] = [
  // Haste
  ['root','ha_1'],['ha_1','ha_s1'],['ha_s1','ha_2'],['ha_2','ha_s2'],['ha_s2','ha_3'],
  ['ha_3','ha_s3'],['ha_s3','ha_4'],['ha_4','ha_s4'],['ha_s4','ha_5'],['ha_5','ha_k1'],
  ['ha_2','ha_a1'],['ha_a1','ha_a2'],['ha_a2','ha_a3'],
  ['ha_4','ha_b1'],['ha_b1','ha_b2'],['ha_b2','ha_b3'],['ha_b3','ha_k2'],
  // Faith
  ['root','fa_1'],['fa_1','fa_s1'],['fa_s1','fa_2'],['fa_2','fa_s2'],['fa_s2','fa_3'],
  ['fa_3','fa_s3'],['fa_s3','fa_4'],['fa_4','fa_s4'],['fa_s4','fa_5'],['fa_5','fa_k1'],
  ['fa_2','fa_a1'],['fa_a1','fa_a2'],['fa_a2','fa_a3'],
  ['fa_3','fa_b1'],['fa_b1','fa_b2'],['fa_b2','fa_b3'],['fa_b3','fa_k2'],
  // Tide
  ['root','ti_1'],['ti_1','ti_s1'],['ti_s1','ti_2'],['ti_2','ti_s2'],['ti_s2','ti_3'],
  ['ti_3','ti_s3'],['ti_s3','ti_4'],
  ['ti_2','ti_a1'],['ti_a1','ti_a2'],['ti_a2','ti_a3'],
  ['ti_3','ti_b1'],['ti_b1','ti_b2'],['ti_b2','ti_k2'],
  // Void
  ['root','vo_1'],['vo_1','vo_s1'],['vo_s1','vo_2'],['vo_2','vo_s2'],['vo_s2','vo_3'],
  ['vo_3','vo_s3'],['vo_s3','vo_4'],['vo_4','vo_s4'],['vo_s4','vo_5'],['vo_5','vo_k1'],
  ['vo_2','vo_a1'],['vo_a1','vo_a2'],['vo_a2','vo_a3'],
  ['vo_4','vo_b1'],['vo_b1','vo_b2'],['vo_b2','vo_b3'],
  ['vo_3','vo_s5'],['vo_4','vo_s6'],
  // Automation
  ['root','au_1'],['au_1','au_s1'],['au_s1','au_2'],['au_2','au_s2'],['au_s2','au_3'],
  ['au_3','au_s3'],['au_s3','au_4'],['au_4','au_s4'],['au_s4','au_5'],['au_5','au_k1'],
  ['au_2','au_a1'],['au_a1','au_a2'],['au_a2','au_a3'],
  ['au_4','au_b1'],['au_b1','au_b2'],['au_b2','au_b3'],
  ['au_1','au_s5'],['au_4','au_s6'],
  // Frenzy
  ['root','fr_1'],['fr_1','fr_s1'],['fr_s1','fr_2'],['fr_2','fr_s2'],['fr_s2','fr_3'],
  ['fr_3','fr_s3'],['fr_s3','fr_4'],['fr_4','fr_k1'],
  ['fr_2','fr_a1'],['fr_a1','fr_a2'],['fr_a2','fr_a3'],
  ['fr_3','fr_b1'],['fr_b1','fr_b2'],['fr_b2','fr_k2'],
  // Power
  ['root','po_1'],['po_1','po_s1'],['po_s1','po_2'],['po_2','po_s2'],['po_s2','po_3'],
  ['po_3','po_s3'],['po_s3','po_4'],['po_4','po_s4'],['po_s4','po_5'],['po_5','po_k1'],
  ['po_2','po_a1'],['po_a1','po_a2'],['po_a2','po_a3'],['po_a3','po_a4'],
  ['po_4','po_b1'],['po_b1','po_b2'],['po_b2','po_b3'],
  ['po_3','po_c1'],['po_c1','po_c2'],
  // Harvest
  ['root','hv_1'],['hv_1','hv_s1'],['hv_s1','hv_2'],['hv_2','hv_s2'],['hv_s2','hv_3'],
  ['hv_3','hv_s3'],['hv_s3','hv_4'],['hv_4','hv_k1'],
  ['hv_2','hv_a1'],['hv_a1','hv_a2'],['hv_a2','hv_a3'],
  ['hv_3','hv_b1'],['hv_b1','hv_b2'],['hv_b2','hv_k2'],
  ['hv_1','hv_s4'],['hv_3','hv_s5'],
  // Supplemental
  ['ha_1','ha_sx'],['au_1','au_sx'],['vo_1','vo_sx'],['fa_1','fa_sx'],['hv_1','hv_sx'],
  // Cross-branch connectors
  ['ha_a1','xb_1'],['hv_a1','xb_1'],
  ['fa_a2','xb_2'],['ha_a2','xb_2'],
  ['fa_a3','xb_3'],['ti_a1','xb_3'],
  ['ti_b1','xb_4'],['vo_a1','xb_4'],
  ['vo_b1','xb_5'],['au_b1','xb_5'],
  ['au_a2','xb_6'],['fr_b1','xb_6'],
  ['fr_a2','xb_7'],['po_c1','xb_7'],
  ['po_a3','xb_8'],['hv_a2','xb_8'],
];

const NODES: SkillNode[] = [
    // ═══ 0: ROOT ═══
    { id: 'root', name: 'The Cliff\'s Edge', cost: 0, description: 'The abyss whispers your name.',
      ...p(0, 0), apply: noop },

    // ═══ HASTE — walk speed (1-18) ═══
    // Main: 1-10
    { id: 'ha_1', name: 'Gust of Dread', cost: 3, description: 'Walk speed +10',
      ...p(120, 0.10), apply: ws(10) },
    { id: 'ha_s1', name: 'Whistling Heights', cost: 2, description: 'Walk speed +5',
      ...p(120, 0.17), apply: ws(5) },
    { id: 'ha_2', name: 'Tailwind of Doom', cost: 5, description: 'Walk speed +15',
      ...p(120, 0.25), apply: ws(15) },
    { id: 'ha_s2', name: 'Restless Steps', cost: 2, description: 'Walk speed +5',
      ...p(118, 0.32), apply: ws(5) },
    { id: 'ha_3', name: 'Hastened Descent', cost: 8, description: 'Walk speed +20',
      ...p(117, 0.40), apply: ws(20) },
    { id: 'ha_s3', name: 'Trembling Ground', cost: 3, description: 'Walk speed +8',
      ...p(115, 0.48), apply: ws(8) },
    { id: 'ha_4', name: 'Rushing Oblivion', cost: 12, description: 'Walk speed +25',
      ...p(114, 0.55), apply: ws(25) },
    { id: 'ha_s4', name: 'Downhill Slide', cost: 3, description: 'Walk speed +8',
      ...p(112, 0.65), apply: ws(8) },
    { id: 'ha_5', name: 'Velocity of the Damned', cost: 20, description: 'Walk speed +35',
      ...p(110, 0.75), apply: ws(35) },
    { id: 'ha_k1', name: 'Terminal Velocity', cost: 40, description: 'KEYSTONE: Walk speed +60',
      ...p(108, 0.90), apply: ws(60) },
    // Fork A: 11-13
    { id: 'ha_a1', name: 'Zephyr\'s Lure', cost: 5, description: 'Walk speed +12',
      ...p(130, 0.33), apply: ws(12) },
    { id: 'ha_a2', name: 'Windborne Panic', cost: 10, description: 'Walk speed +18, Turn-back -0.02',
      ...p(135, 0.45), apply: (s, b) => { ws(18)(s, b); tb(0.02)(s); } },
    { id: 'ha_a3', name: 'Gale of No Return', cost: 18, description: 'Walk speed +20, Turn-back -0.04',
      ...p(138, 0.58), apply: (s, b) => { ws(20)(s, b); tb(0.04)(s); } },
    // Fork B: 14-17 (→ frenzy_pulse ability + keystone)
    { id: 'ha_b1', name: 'Frantic March', cost: 8, description: 'Walk speed +15',
      ...p(106, 0.62), apply: ws(15) },
    { id: 'ha_b2', name: 'Screaming Sprint', cost: 15, description: 'Unlock: Frenzy Pulse',
      ...p(102, 0.72), apply: ab('frenzy_pulse') },
    { id: 'ha_b3', name: 'Cyclone Step', cost: 22, description: 'Walk speed +30',
      ...p(99, 0.82), apply: ws(30) },
    { id: 'ha_k2', name: 'The Endless Stampede', cost: 38, description: 'KEYSTONE: Walk speed +40',
      ...p(96, 0.92), apply: ws(40) },
    // 18 is index 18, but we have 18 nodes (indices 1-18 = 18 nodes). ✓

    // ═══ FAITH — turn-back rate (19-36) ═══
    // Main: 19-28
    { id: 'fa_1', name: 'Whisper of Compliance', cost: 3, description: 'Turn-back -0.02',
      ...p(165, 0.10), apply: tb(0.02) },
    { id: 'fa_s1', name: 'Dulled Instinct', cost: 2, description: 'Turn-back -0.01',
      ...p(165, 0.17), apply: tb(0.01) },
    { id: 'fa_2', name: 'Eroded Will', cost: 5, description: 'Turn-back -0.03',
      ...p(165, 0.25), apply: tb(0.03) },
    { id: 'fa_s2', name: 'Foggy Thoughts', cost: 2, description: 'Turn-back -0.01',
      ...p(163, 0.32), apply: tb(0.01) },
    { id: 'fa_3', name: 'Sermon of the Abyss', cost: 10, description: 'Turn-back -0.04',
      ...p(162, 0.40), apply: tb(0.04) },
    { id: 'fa_s3', name: 'Numb Resolve', cost: 3, description: 'Turn-back -0.015',
      ...p(160, 0.48), apply: tb(0.015) },
    { id: 'fa_4', name: 'Blind Devotion', cost: 15, description: 'Turn-back -0.05',
      ...p(158, 0.58), apply: tb(0.05) },
    { id: 'fa_s4', name: 'Hollow Faith', cost: 4, description: 'Turn-back -0.015',
      ...p(156, 0.67), apply: tb(0.015) },
    { id: 'fa_5', name: 'Absolution at the Edge', cost: 22, description: 'Turn-back -0.06',
      ...p(155, 0.78), apply: tb(0.06) },
    { id: 'fa_k1', name: 'The Unquestioning Flock', cost: 45, description: 'KEYSTONE: Turn-back rate halved',
      ...p(153, 0.92), apply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate * 0.5); } },
    // Fork A: 29-31
    { id: 'fa_a1', name: 'Seeds of Surrender', cost: 5, description: 'Turn-back -0.02, Souls +0.05x',
      ...p(175, 0.33), apply: (s, b) => { tb(0.02)(s); sm(0.05)(s, b); } },
    { id: 'fa_a2', name: 'Congregation of Shadows', cost: 10, description: 'Turn-back -0.03',
      ...p(180, 0.45), apply: tb(0.03) },
    { id: 'fa_a3', name: 'Mass Hypnosis', cost: 18, description: 'Turn-back -0.05, Drag +0.02',
      ...p(183, 0.58), apply: (s) => { tb(0.05)(s); dr(0.02)(s); } },
    // Fork B: 32-35 (→ void_call ability + keystone)
    { id: 'fa_b1', name: 'Silenced Doubt', cost: 8, description: 'Turn-back -0.03',
      ...p(155, 0.47), apply: tb(0.03) },
    { id: 'fa_b2', name: 'Covenant of Falling', cost: 14, description: 'Turn-back -0.04',
      ...p(150, 0.57), apply: tb(0.04) },
    { id: 'fa_b3', name: 'Prophet of the Ledge', cost: 20, description: 'Unlock: Void Call, Turn-back -0.04',
      ...p(147, 0.70), apply: (s, b) => { tb(0.04)(s); ab('void_call')(s, b); } },
    { id: 'fa_k2', name: 'Absolute Obedience', cost: 42, description: 'KEYSTONE: Turn-back -0.08',
      ...p(144, 0.85), apply: tb(0.08) },

    // ═══ TIDE — drag rate (37-50) ═══
    // Main: 37-43
    { id: 'ti_1', name: 'Herd Instinct', cost: 3, description: 'Drag rate +0.03',
      ...p(210, 0.10), apply: dr(0.03) },
    { id: 'ti_s1', name: 'Gathering Dread', cost: 2, description: 'Drag rate +0.01',
      ...p(210, 0.18), apply: dr(0.01) },
    { id: 'ti_2', name: 'Strength in Numbers', cost: 6, description: 'Drag rate +0.04',
      ...p(210, 0.27), apply: dr(0.04) },
    { id: 'ti_s2', name: 'Shoulder to Shoulder', cost: 3, description: 'Drag rate +0.02',
      ...p(208, 0.36), apply: dr(0.02) },
    { id: 'ti_3', name: 'Tidal Congregation', cost: 12, description: 'Drag rate +0.06',
      ...p(207, 0.45), apply: dr(0.06) },
    { id: 'ti_s3', name: 'Lingering Crowd', cost: 3, description: 'Drag rate +0.02',
      ...p(205, 0.55), apply: dr(0.02) },
    { id: 'ti_4', name: 'Swarm of the Willing', cost: 20, description: 'Drag rate +0.08',
      ...p(204, 0.68), apply: dr(0.08) },
    // Fork A: 44-46 (→ dark_wave)
    { id: 'ti_a1', name: 'Curious Bystanders', cost: 5, description: 'Drag rate +0.03',
      ...p(220, 0.35), apply: dr(0.03) },
    { id: 'ti_a2', name: 'Peer Pressure', cost: 10, description: 'Drag rate +0.05, Turn-back -0.02',
      ...p(224, 0.48), apply: (s) => { dr(0.05)(s); tb(0.02)(s); } },
    { id: 'ti_a3', name: 'Social Contagion', cost: 18, description: 'Unlock: Dark Wave, Drag +0.04',
      ...p(228, 0.62), apply: (s, b) => { dr(0.04)(s); ab('dark_wave')(s, b); } },
    // Fork B: 47-49 (→ keystone)
    { id: 'ti_b1', name: 'Ripple Effect', cost: 8, description: 'Drag rate +0.04',
      ...p(198, 0.52), apply: dr(0.04) },
    { id: 'ti_b2', name: 'Undertow', cost: 15, description: 'Drag rate +0.06',
      ...p(194, 0.65), apply: dr(0.06) },
    { id: 'ti_k2', name: 'Tsunami of Flesh', cost: 38, description: 'KEYSTONE: Drag rate doubled',
      ...p(190, 0.82), apply: (s) => { s.dragRate = Math.min(1, s.dragRate * 2); } },
    // Tide keystone on main
    // (ti_4 at index 43 is the main tip, ti_k2 at 49 is fork B keystone)

    // ═══ VOID — birth rate (51-68) ═══
    // Main: 51-60
    { id: 'vo_1', name: 'Fading Cradle', cost: 3, description: 'Birth rate -0.5/day',
      ...p(250, 0.10), apply: br(0.5) },
    { id: 'vo_s1', name: 'Withered Roots', cost: 2, description: 'Birth rate -0.3/day',
      ...p(250, 0.17), apply: br(0.3) },
    { id: 'vo_2', name: 'Barren Hearth', cost: 5, description: 'Birth rate -0.8/day',
      ...p(250, 0.25), apply: br(0.8) },
    { id: 'vo_s2', name: 'Forgotten Lullabies', cost: 2, description: 'Birth rate -0.3/day',
      ...p(248, 0.32), apply: br(0.3) },
    { id: 'vo_3', name: 'Womb of Despair', cost: 10, description: 'Birth rate -1/day',
      ...p(247, 0.40), apply: br(1) },
    { id: 'vo_s3', name: 'Diminishing Returns', cost: 3, description: 'Birth rate -0.5, Walk speed +5',
      ...p(245, 0.48), apply: (s, b) => { br(0.5)(s); ws(5)(s, b); } },
    { id: 'vo_4', name: 'Population Collapse', cost: 15, description: 'Birth rate -1.5/day',
      ...p(244, 0.58), apply: br(1.5) },
    { id: 'vo_s4', name: 'Echoing Silence', cost: 4, description: 'Birth rate -0.5/day',
      ...p(242, 0.67), apply: br(0.5) },
    { id: 'vo_5', name: 'Extinction Protocol', cost: 25, description: 'Birth rate -2/day',
      ...p(240, 0.78), apply: br(2) },
    { id: 'vo_k1', name: 'Heat Death of Humanity', cost: 48, description: 'KEYSTONE: Birth rate halved',
      ...p(238, 0.93), apply: (s) => { s.birthRate = Math.max(0, Math.round(s.birthRate * 0.5)); } },
    // Fork A: 61-63 (→ silence)
    { id: 'vo_a1', name: 'Childless Villages', cost: 6, description: 'Birth rate -0.8/day',
      ...p(258, 0.33), apply: br(0.8) },
    { id: 'vo_a2', name: 'Cursed Bloodlines', cost: 12, description: 'Birth rate -1.2/day',
      ...p(263, 0.45), apply: br(1.2) },
    { id: 'vo_a3', name: 'The Last Cradle', cost: 20, description: 'Unlock: Silence, Birth rate -1',
      ...p(267, 0.58), apply: (s, b) => { br(1)(s); ab('silence')(s, b); } },
    // Fork B: 64-66
    { id: 'vo_b1', name: 'Hollow Nursery', cost: 10, description: 'Birth rate -1/day',
      ...p(237, 0.65), apply: br(1) },
    { id: 'vo_b2', name: 'Severed Lineage', cost: 18, description: 'Birth rate -1.5/day',
      ...p(233, 0.75), apply: br(1.5) },
    { id: 'vo_b3', name: 'Void Womb', cost: 28, description: 'Birth rate -1.5/day',
      ...p(230, 0.87), apply: br(1.5) },
    // Extra nodes to fill: 67-68 don't exist, we have 16 nodes (51-66). Adding 2 more:
    { id: 'vo_s5', name: 'Desolate Horizon', cost: 3, description: 'Birth rate -0.4/day',
      ...p(246, 0.52, 0.02), apply: br(0.4) },
    { id: 'vo_s6', name: 'Last Generation', cost: 4, description: 'Birth rate -0.5/day',
      ...p(241, 0.72, -0.01), apply: br(0.5) },

    // ═══ AUTOMATION — auto-clickers (69-86) ═══
    // Main: 69-78
    { id: 'au_1', name: 'Dark Apprentice', cost: 4, description: '+1 auto-clicker',
      ...p(295, 0.10), apply: ac(1) },
    { id: 'au_s1', name: 'Oiled Gears', cost: 2, description: 'Spawn interval -20ms',
      ...p(295, 0.17), apply: si(20) },
    { id: 'au_2', name: 'Twin Specters', cost: 6, description: '+1 auto-clicker',
      ...p(295, 0.25), apply: ac(1) },
    { id: 'au_s2', name: 'Restless Servants', cost: 3, description: 'Spawn interval -25ms',
      ...p(293, 0.32), apply: si(25) },
    { id: 'au_3', name: 'Assembly of Shadows', cost: 10, description: '+2 auto-clickers',
      ...p(292, 0.40), apply: ac(2) },
    { id: 'au_s3', name: 'Perpetual Motion', cost: 3, description: 'Spawn interval -30ms',
      ...p(290, 0.48), apply: si(30) },
    { id: 'au_4', name: 'Legion of the Ledge', cost: 15, description: '+2 auto-clickers',
      ...p(289, 0.58), apply: ac(2) },
    { id: 'au_s4', name: 'Clockwork Precision', cost: 4, description: 'Spawn interval -35ms',
      ...p(287, 0.67), apply: si(35) },
    { id: 'au_5', name: 'The Dark Factory', cost: 25, description: '+3 auto-clickers, interval -40ms',
      ...p(285, 0.78), apply: (s, b) => { ac(3)(s, b); si(40)(s); } },
    { id: 'au_k1', name: 'Infinite Engine', cost: 45, description: 'KEYSTONE: +5 auto-clickers, interval -30%',
      ...p(283, 0.92), apply: (s, b) => { ac(5)(s, b); s.spawnInterval = Math.max(100, Math.round(s.spawnInterval * 0.7)); } },
    // Fork A: 79-81 (faster interval)
    { id: 'au_a1', name: 'Swift Mechanisms', cost: 5, description: 'Spawn interval -40ms',
      ...p(305, 0.33), apply: si(40) },
    { id: 'au_a2', name: 'Overclocked Abyss', cost: 12, description: 'Spawn interval -60ms',
      ...p(310, 0.47), apply: si(60) },
    { id: 'au_a3', name: 'Temporal Compression', cost: 20, description: 'Spawn interval -80ms',
      ...p(314, 0.60), apply: si(80) },
    // Fork B: 82-84 (→ chain_of_souls)
    { id: 'au_b1', name: 'Shadow Foreman', cost: 10, description: '+2 auto-clickers',
      ...p(282, 0.65), apply: ac(2) },
    { id: 'au_b2', name: 'Necromantic Workshop', cost: 18, description: '+3 auto-clickers',
      ...p(278, 0.75), apply: ac(3) },
    { id: 'au_b3', name: 'Army of Oblivion', cost: 28, description: 'Unlock: Chain of Souls, +2 AC',
      ...p(275, 0.87), apply: (s, b) => { ac(2)(s, b); ab('chain_of_souls')(s, b); } },
    // Extra: 85-86
    { id: 'au_s5', name: 'Tireless Gears', cost: 3, description: 'Spawn interval -15ms',
      ...p(294, 0.14, 0.01), apply: si(15) },
    { id: 'au_s6', name: 'Grinding Wheels', cost: 4, description: 'Spawn interval -20ms',
      ...p(288, 0.62, -0.01), apply: si(20) },

    // ═══ FRENZY — click cooldown (87-100) ═══
    // Main: 87-93
    { id: 'fr_1', name: 'Twitching Fingers', cost: 3, description: 'Click cooldown -50ms',
      ...p(345, 0.10), apply: cc(50) },
    { id: 'fr_s1', name: 'Nervous Energy', cost: 2, description: 'Click cooldown -25ms',
      ...p(345, 0.18), apply: cc(25) },
    { id: 'fr_2', name: 'Manic Tempo', cost: 6, description: 'Click cooldown -75ms',
      ...p(345, 0.27), apply: cc(75) },
    { id: 'fr_s2', name: 'Itching Palm', cost: 3, description: 'Click cooldown -30ms',
      ...p(343, 0.36), apply: cc(30) },
    { id: 'fr_3', name: 'Fevered Hands', cost: 12, description: 'Click cooldown -100ms',
      ...p(342, 0.47), apply: cc(100) },
    { id: 'fr_s3', name: 'Caffeinated Malice', cost: 3, description: 'Click cooldown -35ms',
      ...p(340, 0.57), apply: cc(35) },
    { id: 'fr_4', name: 'Berserker\'s Touch', cost: 22, description: 'Click cooldown -120ms',
      ...p(338, 0.70), apply: cc(120) },
    // Fork A: 94-96
    { id: 'fr_a1', name: 'Obsessive Compulsion', cost: 5, description: 'Click cooldown -60ms',
      ...p(355, 0.35), apply: cc(60) },
    { id: 'fr_a2', name: 'Trigger Finger', cost: 10, description: 'Click cooldown -80ms',
      ...p(0, 0.47), apply: cc(80) },
    { id: 'fr_a3', name: 'Seizure of Fury', cost: 18, description: 'Click cooldown -60ms',
      ...p(3, 0.60), apply: cc(60) },
    // Fork B: 97-99 (→ keystone)
    { id: 'fr_b1', name: 'Blood Rush', cost: 8, description: 'Click cooldown -70ms',
      ...p(335, 0.55), apply: cc(70) },
    { id: 'fr_b2', name: 'Adrenaline Overload', cost: 15, description: 'Click cooldown -90ms',
      ...p(332, 0.68), apply: cc(90) },
    { id: 'fr_k2', name: 'Singularity of Madness', cost: 38, description: 'KEYSTONE: Click cooldown -40%',
      ...p(329, 0.83), apply: (s) => { s.clickCooldown = Math.max(100, Math.round(s.clickCooldown * 0.6)); } },
    // Main keystone
    { id: 'fr_k1', name: 'Infinite Frenzy', cost: 42, description: 'KEYSTONE: Click cooldown -40%',
      ...p(336, 0.90), apply: (s) => { s.clickCooldown = Math.max(100, Math.round(s.clickCooldown * 0.6)); } },

    // ═══ POWER — abilities (101-120) ═══
    // Main: 101-110
    { id: 'po_1', name: 'Channeled Malice', cost: 4, description: 'Turn-back -0.02',
      ...p(30, 0.10), apply: tb(0.02) },
    { id: 'po_s1', name: 'Flickering Power', cost: 2, description: 'Walk speed +5',
      ...p(30, 0.17), apply: ws(5) },
    { id: 'po_2', name: 'Conduit of the Abyss', cost: 6, description: 'Walk speed +10, Drag +0.02',
      ...p(30, 0.25), apply: (s, b) => { ws(10)(s, b); dr(0.02)(s); } },
    { id: 'po_s2', name: 'Resonant Dark', cost: 3, description: 'Walk speed +5',
      ...p(28, 0.32), apply: ws(5) },
    { id: 'po_3', name: 'Arcane Amplifier', cost: 10, description: 'Walk speed +15, Turn-back -0.03',
      ...p(27, 0.40), apply: (s, b) => { ws(15)(s, b); tb(0.03)(s); } },
    { id: 'po_s3', name: 'Eldritch Residue', cost: 3, description: 'Drag rate +0.02',
      ...p(25, 0.48), apply: dr(0.02) },
    { id: 'po_4', name: 'Master of Dark Arts', cost: 15, description: 'Walk speed +20, Drag +0.04',
      ...p(24, 0.58), apply: (s, b) => { ws(20)(s, b); dr(0.04)(s); } },
    { id: 'po_s4', name: 'Overflowing Darkness', cost: 4, description: 'Turn-back -0.02',
      ...p(22, 0.67), apply: tb(0.02) },
    { id: 'po_5', name: 'Cosmic Authority', cost: 25, description: 'Walk speed +25, Drag +0.06',
      ...p(20, 0.78), apply: (s, b) => { ws(25)(s, b); dr(0.06)(s); } },
    { id: 'po_k1', name: 'Avatar of Annihilation', cost: 50, description: 'KEYSTONE: Walk speed +40, all stats boosted',
      ...p(18, 0.93), apply: (s, b) => { ws(40)(s, b); tb(0.05)(s); dr(0.05)(s); } },
    // Fork A: 111-114 (ability enhancements)
    { id: 'po_a1', name: 'Void Resonance', cost: 6, description: 'Souls +0.1x',
      ...p(40, 0.33), apply: sm(0.1) },
    { id: 'po_a2', name: 'Amplified Summons', cost: 12, description: 'Souls +0.15x',
      ...p(45, 0.45), apply: sm(0.15) },
    { id: 'po_a3', name: 'Empowered Harvest', cost: 18, description: 'Souls +0.2x',
      ...p(48, 0.58), apply: sm(0.2) },
    { id: 'po_a4', name: 'Ability Fusion', cost: 28, description: 'Souls +0.3x',
      ...p(51, 0.72), apply: sm(0.3) },
    // Fork B: 115-117
    { id: 'po_b1', name: 'Chain Amplification', cost: 10, description: 'Drag rate +0.04',
      ...p(15, 0.65), apply: dr(0.04) },
    { id: 'po_b2', name: 'Frenzy Overdrive', cost: 18, description: 'Walk speed +20',
      ...p(12, 0.75), apply: ws(20) },
    { id: 'po_b3', name: 'Silence Perfected', cost: 25, description: 'Drag rate +0.08, Turn-back -0.04',
      ...p(9, 0.87), apply: (s) => { dr(0.08)(s); tb(0.04)(s); } },
    // Fork C: 118-119
    { id: 'po_c1', name: 'Dual Casting', cost: 10, description: 'Walk speed +10, Turn-back -0.02',
      ...p(35, 0.48), apply: (s, b) => { ws(10)(s, b); tb(0.02)(s); } },
    { id: 'po_c2', name: 'Cascade Mastery', cost: 18, description: 'Souls +0.2x, Drag +0.03',
      ...p(38, 0.60), apply: (s, b) => { sm(0.2)(s, b); dr(0.03)(s); } },
    // index 120 not used

    // ═══ HARVEST — soul multiplier (121-136) ═══
    // Main: 121-127
    { id: 'hv_1', name: 'Soul Siphon', cost: 3, description: 'Souls +0.1x',
      ...p(75, 0.10), apply: sm(0.1) },
    { id: 'hv_s1', name: 'Spiritual Residue', cost: 2, description: 'Souls +0.05x',
      ...p(75, 0.18), apply: sm(0.05) },
    { id: 'hv_2', name: 'Essence Extraction', cost: 6, description: 'Souls +0.15x',
      ...p(75, 0.27), apply: sm(0.15) },
    { id: 'hv_s2', name: 'Soul Fragments', cost: 3, description: 'Souls +0.08x',
      ...p(73, 0.36), apply: sm(0.08) },
    { id: 'hv_3', name: 'Reaper\'s Tithe', cost: 12, description: 'Souls +0.25x',
      ...p(72, 0.47), apply: sm(0.25) },
    { id: 'hv_s3', name: 'Glowing Bones', cost: 4, description: 'Souls +0.1x',
      ...p(70, 0.57), apply: sm(0.1) },
    { id: 'hv_4', name: 'Feast of Spirits', cost: 22, description: 'Souls +0.4x',
      ...p(68, 0.70), apply: sm(0.4) },
    // Fork A: 128-130 (→ soul_harvest)
    { id: 'hv_a1', name: 'Greedy Grasp', cost: 5, description: 'Souls +0.12x',
      ...p(85, 0.35), apply: sm(0.12) },
    { id: 'hv_a2', name: 'Soul Taxation', cost: 12, description: 'Unlock: Soul Harvest, Souls +0.15x',
      ...p(90, 0.48), apply: (s, b) => { sm(0.15)(s, b); ab('soul_harvest')(s, b); } },
    { id: 'hv_a3', name: 'Spiritual Monopoly', cost: 20, description: 'Souls +0.3x',
      ...p(94, 0.62), apply: sm(0.3) },
    // Fork B: 131-133 (→ keystone)
    { id: 'hv_b1', name: 'Bone Marrow Extract', cost: 8, description: 'Souls +0.15x',
      ...p(63, 0.55), apply: sm(0.15) },
    { id: 'hv_b2', name: 'Distilled Suffering', cost: 15, description: 'Souls +0.25x',
      ...p(58, 0.68), apply: sm(0.25) },
    { id: 'hv_k2', name: 'Philosopher\'s Reap', cost: 40, description: 'KEYSTONE: Soul multiplier +1x',
      ...p(54, 0.83), apply: sm(1.0) },
    // Main keystone
    { id: 'hv_k1', name: 'The Soul Singularity', cost: 45, description: 'KEYSTONE: Soul multiplier x1.5',
      ...p(66, 0.90), apply: (_s, b) => { b.soulMultiplier *= 1.5; } },
    // Extra: 135-136
    { id: 'hv_s4', name: 'Soul Crumbs', cost: 2, description: 'Souls +0.05x',
      ...p(77, 0.14), apply: sm(0.05) },
    { id: 'hv_s5', name: 'Lingering Spirits', cost: 3, description: 'Souls +0.08x',
      ...p(69, 0.62, 0.02), apply: sm(0.08) },

    // ═══ SUPPLEMENTAL small passives (137-141) ═══
    { id: 'ha_sx', name: 'Slippery Slope', cost: 2, description: 'Walk speed +5',
      ...p(122, 0.14), apply: ws(5) },
    { id: 'au_sx', name: 'Whirring Cogs', cost: 2, description: 'Spawn interval -15ms',
      ...p(297, 0.14), apply: si(15) },
    { id: 'vo_sx', name: 'Sterile Wind', cost: 2, description: 'Birth rate -0.2/day',
      ...p(252, 0.14), apply: br(0.2) },
    { id: 'fa_sx', name: 'Clouded Judgment', cost: 2, description: 'Turn-back -0.01',
      ...p(167, 0.14), apply: tb(0.01) },
    { id: 'hv_sx', name: 'Faint Echoes', cost: 2, description: 'Souls +0.05x',
      ...p(77, 0.14, 0, 0.02), apply: sm(0.05) },

    // ═══ CROSS-BRANCH CONNECTORS (142-149) ═══
    { id: 'xb_1', name: 'Windswept Congregation', cost: 12, description: 'Walk speed +10, Souls +0.1x',
      ...p(97, 0.45), apply: (s, b) => { ws(10)(s, b); sm(0.1)(s, b); } },
    { id: 'xb_2', name: 'Faithful Gale', cost: 10, description: 'Turn-back -0.02, Walk speed +10',
      ...p(142, 0.50), apply: (s, b) => { tb(0.02)(s); ws(10)(s, b); } },
    { id: 'xb_3', name: 'Hypnotic Tide', cost: 12, description: 'Turn-back -0.02, Drag +0.03',
      ...p(188, 0.45), apply: (s) => { tb(0.02)(s); dr(0.03)(s); } },
    { id: 'xb_4', name: 'Barren Swarm', cost: 14, description: 'Drag +0.04, Birth rate -0.5',
      ...p(230, 0.50), apply: (s) => { dr(0.04)(s); br(0.5)(s); } },
    { id: 'xb_5', name: 'Automated Extinction', cost: 14, description: 'Birth rate -0.8, +1 AC',
      ...p(273, 0.45), apply: (s, b) => { br(0.8)(s); ac(1)(s, b); } },
    { id: 'xb_6', name: 'Mechanical Frenzy', cost: 12, description: '+1 AC, Cooldown -40ms',
      ...p(320, 0.50), apply: (s, b) => { ac(1)(s, b); cc(40)(s); } },
    { id: 'xb_7', name: 'Frenzied Power', cost: 10, description: 'Cooldown -30ms, Walk speed +10',
      ...p(8, 0.45), apply: (s, b) => { cc(30)(s); ws(10)(s, b); } },
    { id: 'xb_8', name: 'Harvested Authority', cost: 12, description: 'Souls +0.15x, Drag +0.03',
      ...p(52, 0.50), apply: (s, b) => { sm(0.15)(s, b); dr(0.03)(s); } },
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
    const damping = 1 - iter / iterations * 0.5; // cool down over time

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

    // Attraction: pull connected nodes toward ideal edge distance (stronger force)
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

relaxLayout(NODES, EDGE_IDS, 0.11, 0.15, 120);

const TREE: SkillTree = {
  id: 'whisper',
  name: 'The Ancient God',
  color: '#aaccff',
  nodes: NODES,
  edges: buildEdges(NODES, EDGE_IDS),
};

export const SKILL_TREES: SkillTree[] = [TREE];
