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
  // ── House — Birth rate +5/day ──
  { id: 'house', name: 'House', frameIndex: frame(0, 1),
    description: 'Birth rate +5/day',
    apply: (s) => { s.birthRate += 5; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 5); } },

  // ── Church — Turn-back rate +0.05 ──
  { id: 'church', name: 'Church', frameIndex: frame(5, 1),
    description: 'Turn-back rate +0.05',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.05); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.05); } },

  // ── Lighthouse — Walk speed -15% ──
  { id: 'lighthouse', name: 'Lighthouse', frameIndex: frame(1, 2),
    description: 'Walk speed -15%',
    apply: (s) => { s.walkSpeed = Math.max(30, Math.round(s.walkSpeed * 0.85)); },
    unapply: (s) => { s.walkSpeed = Math.round(s.walkSpeed / 0.85); } },

  // ── Tree — birthratePerSec +1/s ──
  { id: 'tree', name: 'Tree', frameIndex: frame(0, 0),
    description: 'birthratePerSec +1/s',
    apply: (s) => { s.birthratePerSec += 1; },
    unapply: (s) => { s.birthratePerSec = Math.max(0, s.birthratePerSec - 1); } },

  // ── Tombstone — Turn-back rate +0.03 ──
  { id: 'tombstone', name: 'Tombstone', frameIndex: frame(3, 2),
    description: 'Turn-back rate +0.03',
    apply: (s) => { s.turnBackRate = Math.min(1, s.turnBackRate + 0.03); },
    unapply: (s) => { s.turnBackRate = Math.max(0, s.turnBackRate - 0.03); } },

  // ── Wall — Walk speed -10% ──
  { id: 'wall', name: 'Wall', frameIndex: frame(2, 2),
    description: 'Walk speed -10%',
    apply: (s) => { s.walkSpeed = Math.max(30, Math.round(s.walkSpeed * 0.90)); },
    unapply: (s) => { s.walkSpeed = Math.round(s.walkSpeed / 0.90); } },
];
