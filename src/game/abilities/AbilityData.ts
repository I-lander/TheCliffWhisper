export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  cooldown: number; // ms
}

export const ABILITIES: AbilityDef[] = [
  {
    id: 'void_call',
    name: 'Void Call',
    description: 'Force all humans to jump',
    cooldown: 30_000,
  },
  {
    id: 'dark_wave',
    name: 'Dark Wave',
    description: 'Spawn 8 humans forced to jump',
    cooldown: 25_000,
  },
  {
    id: 'frenzy_pulse',
    name: 'Frenzy Pulse',
    description: 'Walk speed x3 for 10s',
    cooldown: 45_000,
  },
  {
    id: 'chain_of_souls',
    name: 'Chain of Souls',
    description: 'Chain jumps for 15s',
    cooldown: 60_000,
  },
  {
    id: 'silence',
    name: 'Silence',
    description: 'Birth rate = 0 for rest of day',
    cooldown: 90_000,
  },
  {
    id: 'soul_harvest',
    name: 'Soul Harvest',
    description: 'Double souls for 15s',
    cooldown: 40_000,
  },
];
