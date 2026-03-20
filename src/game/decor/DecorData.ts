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
  // Row 0: Trees — slow down spawns
  { id: 'tree_1', name: 'Oak', frameIndex: frame(0, 0),
    description: 'Spawn interval +80ms',
    apply: (s) => { s.spawnInterval += 80; },
    unapply: (s) => { s.spawnInterval = Math.max(100, s.spawnInterval - 80); } },
  { id: 'tree_2', name: 'Elm', frameIndex: frame(1, 0),
    description: 'Spawn interval +60ms',
    apply: (s) => { s.spawnInterval += 60; },
    unapply: (s) => { s.spawnInterval = Math.max(100, s.spawnInterval - 60); } },
  { id: 'tree_3', name: 'Maple', frameIndex: frame(2, 0),
    description: 'Spawn interval +90ms',
    apply: (s) => { s.spawnInterval += 90; },
    unapply: (s) => { s.spawnInterval = Math.max(100, s.spawnInterval - 90); } },
  { id: 'tree_4', name: 'Pine', frameIndex: frame(3, 0),
    description: 'Spawn interval +70ms',
    apply: (s) => { s.spawnInterval += 70; },
    unapply: (s) => { s.spawnInterval = Math.max(100, s.spawnInterval - 70); } },
  { id: 'tree_5', name: 'Willow', frameIndex: frame(4, 0),
    description: 'Spawn interval +100ms',
    apply: (s) => { s.spawnInterval += 100; },
    unapply: (s) => { s.spawnInterval = Math.max(100, s.spawnInterval - 100); } },
  { id: 'dead_tree', name: 'Dead Tree', frameIndex: frame(5, 0),
    description: 'Walk speed -8%',
    apply: (s) => { s.walkSpeed = Math.round(s.walkSpeed * 0.92); },
    unapply: (s) => { s.walkSpeed = Math.round(s.walkSpeed / 0.92); } },

  // Row 1: Buildings — increase birth rate
  { id: 'house_1', name: 'House', frameIndex: frame(0, 1),
    description: 'Birth rate +4/day',
    apply: (s) => { s.birthRate += 4; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 4); } },
  { id: 'house_2', name: 'Cottage', frameIndex: frame(1, 1),
    description: 'Birth rate +3/day',
    apply: (s) => { s.birthRate += 3; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 3); } },
  { id: 'house_3', name: 'Workshop', frameIndex: frame(2, 1),
    description: 'Birth rate +5/day',
    apply: (s) => { s.birthRate += 5; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 5); } },
  { id: 'house_4', name: 'Manor', frameIndex: frame(3, 1),
    description: 'Birth rate +6/day',
    apply: (s) => { s.birthRate += 6; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 6); } },
  { id: 'chapel', name: 'Chapel', frameIndex: frame(4, 1),
    description: 'Turn-back rate +0.05',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.05); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.05); } },
  { id: 'church', name: 'Church', frameIndex: frame(5, 1),
    description: 'Turn-back rate +0.06',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.06); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.06); } },

  // Row 2: Structures — slow walk speed / turn-back
  { id: 'stone_house', name: 'Stone House', frameIndex: frame(0, 2),
    description: 'Walk speed -10%',
    apply: (s) => { s.walkSpeed = Math.round(s.walkSpeed * 0.9); },
    unapply: (s) => { s.walkSpeed = Math.round(s.walkSpeed / 0.9); } },
  { id: 'tower', name: 'Tower', frameIndex: frame(1, 2),
    description: 'Walk speed -12%',
    apply: (s) => { s.walkSpeed = Math.round(s.walkSpeed * 0.88); },
    unapply: (s) => { s.walkSpeed = Math.round(s.walkSpeed / 0.88); } },
  { id: 'fort', name: 'Fort', frameIndex: frame(2, 2),
    description: 'Turn-back rate +0.04',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.04); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.04); } },
  { id: 'monument', name: 'Monument', frameIndex: frame(3, 2),
    description: 'Walk speed -15%',
    apply: (s) => { s.walkSpeed = Math.round(s.walkSpeed * 0.85); },
    unapply: (s) => { s.walkSpeed = Math.round(s.walkSpeed / 0.85); } },
  { id: 'garden', name: 'Garden', frameIndex: frame(4, 2),
    description: 'Birth rate +3/day',
    apply: (s) => { s.birthRate += 3; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 3); } },
  { id: 'shrine', name: 'Shrine', frameIndex: frame(5, 2),
    description: 'Turn-back rate +0.03',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.03); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.03); } },

  // Row 3: Small elements
  { id: 'bush_1', name: 'Bush', frameIndex: frame(0, 3),
    description: 'Spawn interval +40ms',
    apply: (s) => { s.spawnInterval += 40; },
    unapply: (s) => { s.spawnInterval = Math.max(100, s.spawnInterval - 40); } },
  { id: 'bush_2', name: 'Shrub', frameIndex: frame(1, 3),
    description: 'Spawn interval +50ms',
    apply: (s) => { s.spawnInterval += 50; },
    unapply: (s) => { s.spawnInterval = Math.max(100, s.spawnInterval - 50); } },
  { id: 'hedge', name: 'Hedge', frameIndex: frame(2, 3),
    description: 'Walk speed -6%',
    apply: (s) => { s.walkSpeed = Math.round(s.walkSpeed * 0.94); },
    unapply: (s) => { s.walkSpeed = Math.round(s.walkSpeed / 0.94); } },
  { id: 'flowers', name: 'Flowers', frameIndex: frame(3, 3),
    description: 'Birth rate +2/day',
    apply: (s) => { s.birthRate += 2; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 2); } },
];
