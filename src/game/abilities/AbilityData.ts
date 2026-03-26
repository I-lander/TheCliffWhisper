export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  branch: string;
}

export const ABILITIES: AbilityDef[] = [
  {
    id: 'frenzy_pulse',
    name: 'Frenzy Pulse',
    description: 'Multiply walk speed for a duration',
    branch: 'Velocity',
  },
  {
    id: 'void_call',
    name: 'Void Call',
    description: 'Set turn-back rate to 0 for a duration',
    branch: 'Devotion',
  },
  {
    id: 'dark_wave',
    name: 'Dark Wave',
    description: 'Spawn a wave of humans instantly',
    branch: 'Contagion',
  },
  {
    id: 'soul_harvest',
    name: 'Soul Harvest',
    description: 'Multiply soul gain for a duration',
    branch: 'Machinery',
  },
  {
    id: 'silence',
    name: 'Silence',
    description: 'Set birthratePerSec to 0 for a duration',
    branch: 'Genesis',
  },
];
