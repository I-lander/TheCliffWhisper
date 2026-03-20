import { GameManager, GamePhase } from '../GameManager';
import { PopulationManager } from '../PopulationManager';
import { ConstellationBonuses, DEFAULT_BONUSES } from '../constellations/ConstellationData';
import { CardDef, CardContext, ALL_CARDS } from './CardData';

export interface TimedEffect {
  remaining: number;
  revert: () => void;
}

export interface HandCard {
  def: CardDef;
  played: boolean;
}

const MAX_HAND_SIZE = 5;

export class DeckManager {
  hand: HandCard[] = [];
  private usedThisRun: Set<string> = new Set();
  private timedEffects: TimedEffect[] = [];

  nextSpawnDragOverride: number = -1;
  forceJumpRemaining: number = 0;
  chainSpawnActive: boolean = false;
  cascadeJumpActive: boolean = false;
  invertDecorActive: boolean = false;
  onDecorCallback: (() => void) | null = null;

  private spawnWaveFn: (count: number) => void = () => {};
  private humansOnScreenFn: () => number = () => 0;
  private humansNearEdgeFn: () => number = () => 0;
  private forceAllJumpFn: () => void = () => {};
  private decorCountFn: () => number = () => 0;
  private invertDecorFn: () => void = () => {};
  private revertDecorFn: () => void = () => {};
  private bonusesFn: () => ConstellationBonuses = () => ({ ...DEFAULT_BONUSES });

  private populationManager: PopulationManager;
  private gameManager: GameManager;
  private onCardPlayedCb: (card: CardDef) => void = () => {};
  private onPenaltyAppliedCb: (card: CardDef) => void = () => {};
  private onCardDroppedCb: (card: CardDef) => void = () => {};

  constructor(populationManager: PopulationManager, gameManager: GameManager) {
    this.populationManager = populationManager;
    this.gameManager = gameManager;

    gameManager.onPhaseChange((phase) => {
      if (phase === GamePhase.Daytime) {
        this.resetDayFlags();
      }
      if (phase === GamePhase.Sunset) {
        this.applyPenalties();
        this.clearTimedEffects();
        this.resetDayFlags();
      }
    });
  }

  private resetDayFlags() {
    this.nextSpawnDragOverride = -1;
    this.forceJumpRemaining = 0;
    this.chainSpawnActive = false;
    this.cascadeJumpActive = false;
    this.invertDecorActive = false;
    this.onDecorCallback = null;
  }

  tryDropCard(cardDropRate: number): void {
    if (this.hand.length >= MAX_HAND_SIZE) return;
    if (cardDropRate <= 0) return;
    if (Math.random() > cardDropRate) return;

    const available = ALL_CARDS.filter((c) => {
      if (c.singleUsePerRun && this.usedThisRun.has(c.id)) return false;
      if (this.hand.some((h) => h.def.id === c.id)) return false;
      return true;
    });

    if (available.length === 0) return;
    const card = available[Math.floor(Math.random() * available.length)];
    this.hand.push({ def: card, played: false });
    this.onCardDroppedCb(card);
  }

  setSpawnWaveFn(fn: (count: number) => void) {
    this.spawnWaveFn = fn;
  }
  setHumansOnScreenFn(fn: () => number) {
    this.humansOnScreenFn = fn;
  }
  setHumansNearEdgeFn(fn: () => number) {
    this.humansNearEdgeFn = fn;
  }
  setForceAllJumpFn(fn: () => void) {
    this.forceAllJumpFn = fn;
  }
  setDecorCountFn(fn: () => number) {
    this.decorCountFn = fn;
  }
  setInvertDecorFn(fn: () => void) {
    this.invertDecorFn = fn;
  }
  setRevertDecorFn(fn: () => void) {
    this.revertDecorFn = fn;
  }
  setBonusesFn(fn: () => ConstellationBonuses) {
    this.bonusesFn = fn;
  }
  setOnCardPlayed(fn: (card: CardDef) => void) {
    this.onCardPlayedCb = fn;
  }
  setOnPenaltyApplied(fn: (card: CardDef) => void) {
    this.onPenaltyAppliedCb = fn;
  }
  setOnCardDropped(fn: (card: CardDef) => void) {
    this.onCardDroppedCb = fn;
  }

  playCard(index: number): boolean {
    const handCard = this.hand[index];
    if (!handCard || handCard.played) return false;

    handCard.played = true;
    if (handCard.def.singleUsePerRun) {
      this.usedThisRun.add(handCard.def.id);
    }

    const ctx = this.createContext();

    if (handCard.def.id === 'suspended_hour') {
      const bonusSeconds = this.bonusesFn().extraDaySeconds;
      this.gameManager.extendCurrentPhase((30 + bonusSeconds) * 1000);
    }

    handCard.def.effect.play(ctx);
    this.onCardPlayedCb(handCard.def);
    return true;
  }

  private applyPenalties() {
    const ctx = this.createContext();
    for (const handCard of this.hand) {
      if (!handCard.played) {
        handCard.def.effect.penalty(ctx);
        this.onPenaltyAppliedCb(handCard.def);
      }
    }
    this.hand = [];
  }

  private createContext(): CardContext {
    return {
      stats: this.populationManager.stats,
      bonuses: this.bonusesFn(),
      population: () => this.populationManager.population,
      setPopulation: (n: number) => {
        this.populationManager.population = n;
      },
      addTimedEffect: (durationMs, apply, revert) => {
        apply();
        this.timedEffects.push({ remaining: durationMs, revert });
      },
      spawnWave: (count: number) => {
        this.spawnWaveFn(count);
      },
      setNextSpawnDragOverride: (count: number) => {
        this.nextSpawnDragOverride = count;
      },
      humansOnScreen: () => this.humansOnScreenFn(),
      humansNearEdge: () => this.humansNearEdgeFn(),
      forceAllJump: () => this.forceAllJumpFn(),
      forceNextNJump: (n: number) => {
        this.forceJumpRemaining += n;
      },
      decorCount: () => this.decorCountFn(),
      setChainSpawn: (active: boolean) => {
        this.chainSpawnActive = active;
      },
      setCascadeJump: (active: boolean) => {
        this.cascadeJumpActive = active;
      },
      setInvertDecor: (active: boolean) => {
        this.invertDecorActive = active;
      },
      setOnDecorCallback: (fn: (() => void) | null) => {
        this.onDecorCallback = fn;
      },
      invertDecorEffects: () => this.invertDecorFn(),
      revertDecorEffects: () => this.revertDecorFn(),
    };
  }

  update(delta: number) {
    for (let i = this.timedEffects.length - 1; i >= 0; i--) {
      this.timedEffects[i].remaining -= delta;
      if (this.timedEffects[i].remaining <= 0) {
        this.timedEffects[i].revert();
        this.timedEffects.splice(i, 1);
      }
    }
  }

  private clearTimedEffects() {
    for (const effect of this.timedEffects) {
      effect.revert();
    }
    this.timedEffects = [];
  }

  getHand(): HandCard[] {
    return this.hand;
  }
}
