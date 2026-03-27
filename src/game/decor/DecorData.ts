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
  // ── House — Birth rate +3/day (was +5) ──
  { id: 'house', name: 'House', frameIndex: frame(0, 1),
    description: 'Birth rate +3/day',
    apply: (s) => { s.birthRate += 3; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 3); } },

  // ── Church — Turn-back rate +0.03 (was +0.05) ──
  { id: 'church', name: 'Church', frameIndex: frame(5, 1),
    description: 'Turn-back rate +0.03',
    apply: (s) => { s.turnBackRate += 0.03; },
    unapply: (s) => { s.turnBackRate -= 0.03; } },

  // ── Lighthouse — Walk speed -6% ──
  { id: 'lighthouse', name: 'Lighthouse', frameIndex: frame(1, 2),
    description: 'Walk speed -6%',
    apply: (s) => { s.walkSpeed = Math.max(40, Math.round(s.walkSpeed * 0.94)); },
    unapply: (s) => { s.walkSpeed = Math.round(s.walkSpeed / 0.94); } },

  // ── Tree — birthratePerSec +1/s (unchanged) ──
  { id: 'tree', name: 'Tree', frameIndex: frame(0, 0),
    description: 'birthratePerSec +1/s',
    apply: (s) => { s.birthratePerSec += 1; },
    unapply: (s) => { s.birthratePerSec = Math.max(0, s.birthratePerSec - 1); } },

  // ── Tombstone — Turn-back rate +0.02 (was +0.03) ──
  { id: 'tombstone', name: 'Tombstone', frameIndex: frame(3, 2),
    description: 'Turn-back rate +0.02',
    apply: (s) => { s.turnBackRate += 0.02; },
    unapply: (s) => { s.turnBackRate -= 0.02; } },

  // ── Wall — Walk speed -5% ──
  { id: 'wall', name: 'Wall', frameIndex: frame(2, 2),
    description: 'Walk speed -5%',
    apply: (s) => { s.walkSpeed = Math.max(40, Math.round(s.walkSpeed * 0.95)); },
    unapply: (s) => { s.walkSpeed = Math.round(s.walkSpeed / 0.95); } },

  // ── Bush — Drag rate +0.02 ──
  { id: 'bush', name: 'Bush', frameIndex: frame(1, 0),
    description: 'Drag rate +0.02',
    apply: (s) => { s.dragRate += 0.02; },
    unapply: (s) => { s.dragRate -= 0.02; } },

  // ── Pine — Birth rate +2/day ──
  { id: 'pine', name: 'Pine', frameIndex: frame(2, 0),
    description: 'Birth rate +2/day',
    apply: (s) => { s.birthRate += 2; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 2); } },

  // ── Big Tree — Turn-back rate +0.02, Walk speed -5% ──
  { id: 'bigtree', name: 'Big Tree', frameIndex: frame(3, 0),
    description: 'Turn-back +0.02, speed -5%',
    apply: (s) => { s.turnBackRate += 0.02; s.walkSpeed = Math.max(40, Math.round(s.walkSpeed * 0.95)); },
    unapply: (s) => { s.turnBackRate -= 0.02; s.walkSpeed = Math.round(s.walkSpeed / 0.95); } },

  // ── Cactus — Walk speed -8% ──
  { id: 'cactus', name: 'Cactus', frameIndex: frame(4, 0),
    description: 'Walk speed -8%',
    apply: (s) => { s.walkSpeed = Math.max(40, Math.round(s.walkSpeed * 0.92)); },
    unapply: (s) => { s.walkSpeed = Math.round(s.walkSpeed / 0.92); } },

  // ── Oak — birthratePerSec +1/s, Drag rate +0.01 ──
  { id: 'oak', name: 'Oak', frameIndex: frame(5, 0),
    description: 'birthratePerSec +1/s, drag +0.01',
    apply: (s) => { s.birthratePerSec += 1; s.dragRate += 0.01; },
    unapply: (s) => { s.birthratePerSec = Math.max(0, s.birthratePerSec - 1); s.dragRate -= 0.01; } },

  // ── Spruce — Click cooldown -50ms ──
  { id: 'spruce', name: 'Spruce', frameIndex: frame(6, 0),
    description: 'Click cooldown -50ms',
    apply: (s) => { s.clickCooldown = Math.max(100, s.clickCooldown - 50); },
    unapply: (s) => { s.clickCooldown += 50; } },

  // ── Bench — Turn-back rate +0.02 ──
  { id: 'bench', name: 'Bench', frameIndex: frame(1, 1),
    description: 'Turn-back rate +0.02',
    apply: (s) => { s.turnBackRate += 0.02; },
    unapply: (s) => { s.turnBackRate -= 0.02; } },

  // ── Cart — Birth rate +2/day, Walk speed -5% ──
  { id: 'cart', name: 'Cart', frameIndex: frame(2, 1),
    description: 'Birth rate +2, speed -5%',
    apply: (s) => { s.birthRate += 2; s.walkSpeed = Math.max(40, Math.round(s.walkSpeed * 0.95)); },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 2); s.walkSpeed = Math.round(s.walkSpeed / 0.95); } },

  // ── Crate — Drag rate +0.03 ──
  { id: 'crate', name: 'Crate', frameIndex: frame(3, 1),
    description: 'Drag rate +0.03',
    apply: (s) => { s.dragRate += 0.03; },
    unapply: (s) => { s.dragRate -= 0.03; } },

  // ── Sign — Click cooldown -80ms ──
  { id: 'sign', name: 'Sign', frameIndex: frame(4, 1),
    description: 'Click cooldown -80ms',
    apply: (s) => { s.clickCooldown = Math.max(100, s.clickCooldown - 80); },
    unapply: (s) => { s.clickCooldown += 80; } },

  // ── Market — Birth rate +4/day ──
  { id: 'market', name: 'Market', frameIndex: frame(6, 1),
    description: 'Birth rate +4/day',
    apply: (s) => { s.birthRate += 4; },
    unapply: (s) => { s.birthRate = Math.max(0, s.birthRate - 4); } },

  // ── Shop — birthratePerSec +2/s ──
  { id: 'shop', name: 'Shop', frameIndex: frame(7, 1),
    description: 'birthratePerSec +2/s',
    apply: (s) => { s.birthratePerSec += 2; },
    unapply: (s) => { s.birthratePerSec = Math.max(0, s.birthratePerSec - 2); } },

  // ── Elder Tree — Turn-back rate +0.03, birthratePerSec +1/s ──
  { id: 'eldertree', name: 'Elder Tree', frameIndex: frame(0, 2),
    description: 'Turn-back +0.03, spawn +1/s',
    apply: (s) => { s.turnBackRate += 0.03; s.birthratePerSec += 1; },
    unapply: (s) => { s.turnBackRate -= 0.03; s.birthratePerSec = Math.max(0, s.birthratePerSec - 1); } },

  // ── Fence — Walk speed -6%, Drag rate +0.02 ──
  { id: 'fence', name: 'Fence', frameIndex: frame(4, 2),
    description: 'Speed -6%, drag +0.02',
    apply: (s) => { s.walkSpeed = Math.max(40, Math.round(s.walkSpeed * 0.94)); s.dragRate += 0.02; },
    unapply: (s) => { s.walkSpeed = Math.round(s.walkSpeed / 0.94); s.dragRate -= 0.02; } },

  // ── Barrel — Click cooldown -60ms, Birth rate +1/day ──
  { id: 'barrel', name: 'Barrel', frameIndex: frame(5, 2),
    description: 'Cooldown -60ms, birth +1/day',
    apply: (s) => { s.clickCooldown = Math.max(100, s.clickCooldown - 60); s.birthRate += 1; },
    unapply: (s) => { s.clickCooldown += 60; s.birthRate = Math.max(0, s.birthRate - 1); } },
];
