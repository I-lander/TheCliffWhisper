import { GameManager, GamePhase } from '../GameManager';
import { PopulationManager, PopulationStats } from '../PopulationManager';
import { SKILL_TREES, SkillTree, ConstellationBonuses, DEFAULT_BONUSES } from './ConstellationData';

const STARTING_DARK_FAITH = 5;

export class ConstellationManager {
  darkFaith: number = STARTING_DARK_FAITH;
  darkFaithEarnedLastDay: number = 0;
  unlockedNodes: Set<string> = new Set();
  bonuses: ConstellationBonuses = { ...DEFAULT_BONUSES };

  private stats: PopulationStats;
  private populationManager: PopulationManager;
  private trees: SkillTree[] = SKILL_TREES;

  constructor(
    stats: PopulationStats,
    populationManager: PopulationManager,
    gameManager: GameManager,
  ) {
    this.stats = stats;
    this.populationManager = populationManager;

    // Grant Dark Faith at the start of each night: 1 per human jumped the previous day
    gameManager.onPhaseChange((phase) => {
      if (phase === GamePhase.Night) {
        this.grantDarkFaith();
      }
    });
  }

  private grantDarkFaith() {
    const earned = this.populationManager.jumped;
    this.darkFaithEarnedLastDay = earned;
    this.darkFaith += earned;
  }

  getTrees(): SkillTree[] {
    return this.trees;
  }

  isUnlocked(nodeId: string): boolean {
    return this.unlockedNodes.has(nodeId);
  }

  canUnlock(treeId: string, nodeIndex: number): boolean {
    const tree = this.trees.find((t) => t.id === treeId);
    if (!tree || nodeIndex < 0 || nodeIndex >= tree.nodes.length) return false;

    const node = tree.nodes[nodeIndex];
    if (this.unlockedNodes.has(node.id)) return false;
    if (this.darkFaith < node.cost) return false;

    // Root node (index 0) has no prerequisite
    if (nodeIndex === 0) return true;

    // Must have at least one parent (connected via edge) unlocked
    const hasUnlockedParent = tree.edges.some(([from, to]) => {
      return to === nodeIndex && this.unlockedNodes.has(tree.nodes[from].id);
    });

    return hasUnlockedParent;
  }

  unlockNode(treeId: string, nodeIndex: number): boolean {
    if (!this.canUnlock(treeId, nodeIndex)) return false;

    const tree = this.trees.find((t) => t.id === treeId)!;
    const node = tree.nodes[nodeIndex];

    this.darkFaith -= node.cost;
    this.unlockedNodes.add(node.id);
    node.apply(this.stats, this.bonuses);

    return true;
  }

  getTreeProgress(treeId: string): number {
    const tree = this.trees.find((t) => t.id === treeId);
    if (!tree) return 0;
    return tree.nodes.filter((n) => this.unlockedNodes.has(n.id)).length;
  }
}
