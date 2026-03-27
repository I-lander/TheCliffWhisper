const STORAGE_KEY = 'cliff_whisper_settings';

interface GameSettings {
  soundEnabled: boolean;
  crtEnabled: boolean;
  tutoDone: boolean;
}

const defaults: GameSettings = {
  soundEnabled: true,
  crtEnabled: true,
  tutoDone: false,
};

let current: GameSettings = { ...defaults };

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      current = { ...defaults, ...parsed };
    }
  } catch {
    /* ignore */
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
}

export function isSoundEnabled(): boolean {
  return current.soundEnabled;
}

export function isCrtEnabled(): boolean {
  return current.crtEnabled;
}

export function toggleSound(): boolean {
  current.soundEnabled = !current.soundEnabled;
  save();
  return current.soundEnabled;
}

export function toggleCrt(): boolean {
  current.crtEnabled = !current.crtEnabled;
  save();
  return current.crtEnabled;
}

export function isTutoDone(): boolean {
  return current.tutoDone;
}

export function markTutoDone() {
  current.tutoDone = true;
  save();
}
