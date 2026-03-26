export enum GamePhase {
  Night = 'Night',
  Daytime = 'Daytime',
  Sunset = 'Sunset',
}

export interface PhaseConfig {
  duration: number; // in milliseconds
}

const PHASE_DURATIONS: Record<GamePhase, number> = {
  [GamePhase.Night]: 90_000,
  [GamePhase.Daytime]: 60_000,
  [GamePhase.Sunset]: 2_000,
};

const PHASE_ORDER: GamePhase[] = [
  GamePhase.Night,
  GamePhase.Daytime,
  GamePhase.Sunset,
];

export class GameManager {
  private currentPhase: GamePhase = GamePhase.Daytime;
  private phaseElapsed: number = 0;
  private phaseExtension: number = 0;
  private dayCount: number = 1;
  private running: boolean = true;

  private listeners: Array<(phase: GamePhase, dayCount: number) => void> = [];

  getPhase(): GamePhase {
    return this.currentPhase;
  }

  getPhaseElapsed(): number {
    return this.phaseElapsed;
  }

  getPhaseDuration(): number {
    return PHASE_DURATIONS[this.currentPhase] + this.phaseExtension;
  }

  extendCurrentPhase(ms: number) {
    this.phaseExtension += ms;
  }

  getDaytimeDuration(): number {
    return PHASE_DURATIONS[GamePhase.Daytime];
  }

  getPhaseRemaining(): number {
    return Math.max(0, this.getPhaseDuration() - this.phaseElapsed);
  }

  getDayCount(): number {
    return this.dayCount;
  }

  isRunning(): boolean {
    return this.running;
  }

  pause() {
    this.running = false;
  }

  resume() {
    this.running = true;
  }

  onPhaseChange(callback: (phase: GamePhase, dayCount: number) => void) {
    this.listeners.push(callback);
  }

  /** Skip the current phase immediately (used for Night "End Night" button) */
  skipPhase() {
    if (!this.running) return;
    this.advancePhase();
  }

  update(delta: number) {
    if (!this.running) return;

    // Night and Daytime do not auto-advance — player decides when to end
    if (this.currentPhase === GamePhase.Night) return;
    if (this.currentPhase === GamePhase.Daytime) return;

    this.phaseElapsed += delta;

    if (this.phaseElapsed >= this.getPhaseDuration()) {
      this.advancePhase();
    }
  }

  restoreState(phase: GamePhase, phaseElapsed: number, dayCount: number) {
    this.currentPhase = phase;
    this.phaseElapsed = phaseElapsed;
    this.dayCount = dayCount;
    this.running = true;
    this.phaseExtension = 0;
    for (const cb of this.listeners) {
      cb(this.currentPhase, this.dayCount);
    }
  }

  private advancePhase() {
    const currentIndex = PHASE_ORDER.indexOf(this.currentPhase);
    const nextIndex = (currentIndex + 1) % PHASE_ORDER.length;

    // If we loop back to Night, increment day count
    if (nextIndex === 0) {
      this.dayCount++;
    }

    this.currentPhase = PHASE_ORDER[nextIndex];
    this.phaseElapsed = 0;
    this.phaseExtension = 0;

    for (const cb of this.listeners) {
      cb(this.currentPhase, this.dayCount);
    }
  }
}
