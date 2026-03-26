import { PopulationStats } from '../PopulationManager';
import { SKILL_TREES, SkillTree, ConstellationBonuses, DEFAULT_BONUSES } from './ConstellationData';

const STARTING_SOULS = 0;

export class ConstellationManager {
  souls: number = STARTING_SOULS;
  unlockedNodes: Set<string> = new Set();
  bonuses: ConstellationBonuses = JSON.parse(JSON.stringify(DEFAULT_BONUSES));

  private stats: PopulationStats;
  private trees: SkillTree[] = SKILL_TREES;

  constructor(stats: PopulationStats) {
    this.stats = stats;
  }

  /** Called each time a human dies — grants souls based on multiplier. Always integer. */
  onHumanKilled() {
    this.souls += Math.floor(this.bonuses.soulMultiplier);
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
    if (this.souls < node.cost) return false;

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

    this.souls -= node.cost;
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
