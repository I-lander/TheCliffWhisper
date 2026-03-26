import { PopulationStats } from '../PopulationManager';

// worldElement.png: 256x256, 16x16 tiles, no margin -> 16 tiles per row
const COLS = 16;

function frame(col: number, row: number): number {
  return row * COLS + col;
}

export interface DecorDef {
  id: string;
  name: string;
  frameIndex: number;
  description: string;
  apply: (stats: PopulationStats) => void;
  unapply: (stats: PopulationStats) => void;
}

export const DECOR_CATALOG: DecorDef[] = [
  // Row 0: Trees — slow walk speed (nature reclaims, humans hesitate)
  { id: 'tree_1', name: 'Oak', frameIndex: frame(0, 0),
    description: 'Walk speed -8',
    apply: (s) => { s.walkSpeed = Math.max(30, s.walkSpeed - 8); },
    unapply: (s) => { s.walkSpeed += 8; } },
  { id: 'tree_2', name: 'Elm', frameIndex: frame(1, 0),
    description: 'Walk speed -6',
    apply: (s) => { s.walkSpeed = Math.max(30, s.walkSpeed - 6); },
    unapply: (s) => { s.walkSpeed += 6; } },
  { id: 'tree_3', name: 'Maple', frameIndex: frame(2, 0),
    description: 'Walk speed -10',
    apply: (s) => { s.walkSpeed = Math.max(30, s.walkSpeed - 10); },
    unapply: (s) => { s.walkSpeed += 10; } },
  { id: 'tree_4', name: 'Pine', frameIndex: frame(3, 0),
    description: 'Walk speed -7',
    apply: (s) => { s.walkSpeed = Math.max(30, s.walkSpeed - 7); },
    unapply: (s) => { s.walkSpeed += 7; } },
  { id: 'tree_5', name: 'Willow', frameIndex: frame(4, 0),
    description: 'Walk speed -12',
    apply: (s) => { s.walkSpeed = Math.max(30, s.walkSpeed - 12); },
    unapply: (s) => { s.walkSpeed += 12; } },
  { id: 'dead_tree', name: 'Dead Tree', frameIndex: frame(5, 0),
    description: 'Walk speed -4',
    apply: (s) => { s.walkSpeed = Math.max(30, s.walkSpeed - 4); },
    unapply: (s) => { s.walkSpeed += 4; } },

  // Row 1: Buildings — increase birth rate (civilization rebuilds)
  { id: 'house_1', name: 'House', frameIndex: frame(0, 1),
    description: 'Birth rate +1/day',
    apply: (s) => { s.birthRate += 1; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 1); } },
  { id: 'house_2', name: 'Cottage', frameIndex: frame(1, 1),
    description: 'Birth rate +1/day',
    apply: (s) => { s.birthRate += 1; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 1); } },
  { id: 'house_3', name: 'Workshop', frameIndex: frame(2, 1),
    description: 'Birth rate +2/day',
    apply: (s) => { s.birthRate += 2; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 2); } },
  { id: 'house_4', name: 'Manor', frameIndex: frame(3, 1),
    description: 'Birth rate +2/day',
    apply: (s) => { s.birthRate += 2; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 2); } },
  { id: 'chapel', name: 'Chapel', frameIndex: frame(4, 1),
    description: 'Turn-back rate +0.02',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.02); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.02); } },
  { id: 'church', name: 'Church', frameIndex: frame(5, 1),
    description: 'Turn-back rate +0.03',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.03); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.03); } },

  // Row 2: Structures — increase turn-back rate (fortifications, hope)
  { id: 'stone_house', name: 'Stone House', frameIndex: frame(0, 2),
    description: 'Turn-back rate +0.02',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.02); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.02); } },
  { id: 'tower', name: 'Watchtower', frameIndex: frame(1, 2),
    description: 'Turn-back rate +0.03',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.03); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.03); } },
  { id: 'fort', name: 'Fort', frameIndex: frame(2, 2),
    description: 'Turn-back rate +0.025, Walk speed -5',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.025); s.walkSpeed = Math.max(30, s.walkSpeed - 5); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.025); s.walkSpeed += 5; } },
  { id: 'monument', name: 'Monument', frameIndex: frame(3, 2),
    description: 'Birth rate +1, Turn-back +0.01',
    apply: (s) => { s.birthRate += 1; s.turnBackRate = Math.min(1, s.turnBackRate + 0.01); },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 1); s.turnBackRate = Math.max(0, s.turnBackRate - 0.01); } },
  { id: 'garden', name: 'Garden', frameIndex: frame(4, 2),
    description: 'Birth rate +1/day',
    apply: (s) => { s.birthRate += 1; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 1); } },
  { id: 'shrine', name: 'Shrine', frameIndex: frame(5, 2),
    description: 'Turn-back rate +0.02',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.02); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.02); } },

  // Row 3: Small elements — increase click cooldown (resistance to the whisperer)
  { id: 'bush_1', name: 'Thornbush', frameIndex: frame(0, 3),
    description: 'Click cooldown +30ms',
    apply: (s) => { s.clickCooldown += 30; },
    unapply: (s) => { s.clickCooldown = Math.max(100, s.clickCooldown - 30); } },
  { id: 'bush_2', name: 'Brambles', frameIndex: frame(1, 3),
    description: 'Click cooldown +40ms',
    apply: (s) => { s.clickCooldown += 40; },
    unapply: (s) => { s.clickCooldown = Math.max(100, s.clickCooldown - 40); } },
  { id: 'hedge', name: 'Hedge Wall', frameIndex: frame(2, 3),
    description: 'Walk speed -5, Click cooldown +20ms',
    apply: (s) => { s.walkSpeed = Math.max(30, s.walkSpeed - 5); s.clickCooldown += 20; },
    unapply: (s) => { s.walkSpeed += 5; s.clickCooldown = Math.max(100, s.clickCooldown - 20); } },
  { id: 'flowers', name: 'Memorial Flowers', frameIndex: frame(3, 3),
    description: 'Birth rate +1, Turn-back +0.01',
    apply: (s) => { s.birthRate += 1; s.turnBackRate = Math.min(1, s.turnBackRate + 0.01); },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 1); s.turnBackRate = Math.max(0, s.turnBackRate - 0.01); } },
];
