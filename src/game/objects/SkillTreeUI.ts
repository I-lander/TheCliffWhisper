import { ConstellationManager } from '../constellations/ConstellationManager';
import { SkillTree } from '../constellations/ConstellationData';

const LOCKED_ALPHA = 0.18;

// Node tiers — root is keystone, branch tips are notable, rest are minor
type NodeTier = 'keystone' | 'notable' | 'minor';

const TIER_RADIUS: Record<NodeTier, number> = {
  keystone: 14,
  notable: 10,
  minor: 6,
};

// Branch tip indices (last node of each branch)
const BRANCH_TIP_IDS = new Set([
  'ac_4', 'fa_4', 'ha_3', 'ti_4', 'vo_4', 'om_4', 'cc_3',
]);

// Per-branch colors keyed by node id prefix
const BRANCH_COLORS: Record<string, number> = {
  root: 0xffffff,
  ac: 0x44ddff,  // auto-clicker — cyan
  fa: 0xbb66ff,  // faith — purple
  ha: 0xffcc44,  // haste — yellow
  ti: 0x44ff88,  // tide — green
  vo: 0xff4466,  // void — red
  om: 0xff8844,  // omen — orange
  cc: 0x6688ff,  // cooldown — blue
};

function getBranchColor(nodeId: string): number {
  const prefix = nodeId.split('_')[0];
  return BRANCH_COLORS[prefix] ?? BRANCH_COLORS['root'];
}

function getNodeTier(nodeId: string): NodeTier {
  if (nodeId === 'root') return 'keystone';
  if (BRANCH_TIP_IDS.has(nodeId)) return 'notable';
  return 'minor';
}

export class SkillTreeUI {
  private scene: Phaser.Scene;
  private constellationMgr: ConstellationManager;
  private container: Phaser.GameObjects.Container;
  private onEndNight: () => void;

  private budgetText!: Phaser.GameObjects.Text;
  private endNightBtn!: Phaser.GameObjects.Text;
  private treeContainers: Phaser.GameObjects.Container[] = [];
  private tooltipContainer!: Phaser.GameObjects.Container;
  private tooltipBg!: Phaser.GameObjects.Graphics;
  private tooltipName!: Phaser.GameObjects.Text;
  private tooltipDesc!: Phaser.GameObjects.Text;
  private tooltipCost!: Phaser.GameObjects.Text;

  private baseX: number;
  private baseY: number;
  private spacing: number;
  private constellationW: number;
  private constellationH: number;

  constructor(scene: Phaser.Scene, constellationMgr: ConstellationManager, onEndNight: () => void) {
    this.scene = scene;
    this.constellationMgr = constellationMgr;
    this.onEndNight = onEndNight;

    const cam = scene.cameras.main;
    const tileSize = cam.height / 18;
    const trees = constellationMgr.getTrees();

    // Use most of the screen for the constellation
    this.constellationW = cam.width * 0.85;
    this.constellationH = cam.height - tileSize * 5; // top margin + bottom button area
    this.spacing = cam.width / (trees.length + 1);
    this.baseX = this.spacing;
    this.baseY = tileSize * 1.5 + this.constellationH / 2;

    this.container = scene.add.container(0, 0);

    // Budget text
    const fontSize = Math.round(tileSize * 0.55);
    this.budgetText = scene.add
      .text(cam.width / 2, tileSize * 0.5, '', {
        fontSize: `${fontSize}px`,
        color: '#aaccff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setAlpha(0.9);
    this.container.add(this.budgetText);

    // End Night button
    const btnY = cam.height - tileSize * 1.2;
    this.endNightBtn = scene.add
      .text(cam.width / 2, btnY, '[ End Night ]', {
        fontSize: `${Math.round(tileSize * 0.6)}px`,
        color: '#aaccff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.endNightBtn.on(Phaser.Input.Events.POINTER_OVER, () =>
      this.endNightBtn.setColor('#ffffff'),
    );
    this.endNightBtn.on(Phaser.Input.Events.POINTER_OUT, () =>
      this.endNightBtn.setColor('#aaccff'),
    );
    this.endNightBtn.on(Phaser.Input.Events.POINTER_DOWN, () => this.onEndNight());
    this.container.add(this.endNightBtn);

    // Tooltip (shared, moves on hover)
    this.tooltipContainer = scene.add.container(0, 0).setVisible(false).setDepth(200);
    this.tooltipBg = scene.add.graphics();
    const ttFont = Math.round(tileSize * 0.32);
    this.tooltipName = scene.add.text(0, 0, '', {
      fontSize: `${ttFont}px`,
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.tooltipDesc = scene.add.text(0, ttFont * 1.4, '', {
      fontSize: `${Math.round(ttFont * 0.85)}px`,
      color: '#aaaaaa',
      fontFamily: 'monospace',
    });
    this.tooltipCost = scene.add.text(0, ttFont * 2.8, '', {
      fontSize: `${Math.round(ttFont * 0.85)}px`,
      color: '#ffcc44',
      fontFamily: 'monospace',
    });
    this.tooltipContainer.add([
      this.tooltipBg,
      this.tooltipName,
      this.tooltipDesc,
      this.tooltipCost,
    ]);
    this.container.add(this.tooltipContainer);

    this.setVisible(false);
  }

  setVisible(visible: boolean) {
    this.container.setVisible(visible);
    if (!visible) this.tooltipContainer.setVisible(false);
  }

  /** Reposition the container in world space so it stays screen-fixed despite camera scroll. */
  setCameraOffset(scrollY: number) {
    this.container.setY(scrollY);
  }

  refresh() {
    this.treeContainers.forEach((c) => c.destroy());
    this.treeContainers = [];

    const trees = this.constellationMgr.getTrees();
    trees.forEach((tree, i) => {
      const cx = this.baseX + i * this.spacing;
      const cy = this.baseY;
      const tc = this.renderConstellation(tree, cx, cy);
      this.container.add(tc);
      this.treeContainers.push(tc);
    });

    this.updateBudget();
  }

  private nodeScreenPos(
    tree: SkillTree,
    nodeIndex: number,
    cx: number,
    cy: number,
  ): { x: number; y: number } {
    const node = tree.nodes[nodeIndex];
    return {
      x: cx + node.x * (this.constellationW / 2),
      y: cy + node.y * (this.constellationH / 2),
    };
  }

  private renderConstellation(
    tree: SkillTree,
    cx: number,
    cy: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // ── Background web: faint radial lines from root ──
    const rootPos = this.nodeScreenPos(tree, 0, cx, cy);
    const webGraphics = this.scene.add.graphics();
    webGraphics.lineStyle(1, 0x222244, 0.08);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      const len = Math.max(this.constellationW, this.constellationH) * 0.6;
      webGraphics.lineBetween(
        rootPos.x, rootPos.y,
        rootPos.x + Math.cos(angle) * len,
        rootPos.y + Math.sin(angle) * len,
      );
    }
    container.add(webGraphics);

    // ── Edges ──
    const edgeGraphics = this.scene.add.graphics();
    for (const [fromIdx, toIdx] of tree.edges) {
      const from = this.nodeScreenPos(tree, fromIdx, cx, cy);
      const to = this.nodeScreenPos(tree, toIdx, cx, cy);
      const fromNode = tree.nodes[fromIdx];
      const toNode = tree.nodes[toIdx];
      const fromUnlocked = this.constellationMgr.isUnlocked(fromNode.id);
      const toUnlocked = this.constellationMgr.isUnlocked(toNode.id);
      const bothUnlocked = fromUnlocked && toUnlocked;
      const eitherUnlocked = fromUnlocked || toUnlocked;

      if (bothUnlocked) {
        // Bright glowing edge
        const branchColor = getBranchColor(toNode.id);
        edgeGraphics.lineStyle(4, branchColor, 0.12);
        edgeGraphics.lineBetween(from.x, from.y, to.x, to.y);
        edgeGraphics.lineStyle(2, branchColor, 0.5);
        edgeGraphics.lineBetween(from.x, from.y, to.x, to.y);
        edgeGraphics.lineStyle(1, 0xffffff, 0.4);
        edgeGraphics.lineBetween(from.x, from.y, to.x, to.y);
      } else if (eitherUnlocked) {
        // Partially lit
        const branchColor = getBranchColor(toNode.id);
        edgeGraphics.lineStyle(1.5, branchColor, 0.2);
        edgeGraphics.lineBetween(from.x, from.y, to.x, to.y);
      } else {
        // Dark dormant line
        edgeGraphics.lineStyle(1, 0x333355, 0.15);
        edgeGraphics.lineBetween(from.x, from.y, to.x, to.y);
      }
    }
    container.add(edgeGraphics);

    // ── Nodes ──
    tree.nodes.forEach((node, nodeIndex) => {
      const pos = this.nodeScreenPos(tree, nodeIndex, cx, cy);
      const isUnlocked = this.constellationMgr.isUnlocked(node.id);
      const canUnlock = this.constellationMgr.canUnlock(tree.id, nodeIndex);
      const tier = getNodeTier(node.id);
      const branchColor = getBranchColor(node.id);
      const radius = TIER_RADIUS[tier];

      const g = this.scene.add.graphics();

      if (isUnlocked) {
        this.drawUnlockedNode(g, pos.x, pos.y, radius, tier, branchColor);
      } else if (canUnlock) {
        this.drawAffordableNode(g, pos.x, pos.y, radius, tier, branchColor);
      } else {
        this.drawLockedNode(g, pos.x, pos.y, radius, tier);
      }

      container.add(g);

      // Interactive zone
      const hitRadius = Math.max(radius * 2.5, 16);
      const hitZone = this.scene.add
        .circle(pos.x, pos.y, hitRadius)
        .setInteractive({ useHandCursor: canUnlock })
        .setAlpha(0.001);

      hitZone.on(Phaser.Input.Events.POINTER_OVER, () => {
        this.showTooltip(pos.x, pos.y - radius - 30, node, isUnlocked, branchColor);
      });
      hitZone.on(Phaser.Input.Events.POINTER_OUT, () => {
        this.tooltipContainer.setVisible(false);
      });

      if (canUnlock) {
        hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
          const success = this.constellationMgr.unlockNode(tree.id, nodeIndex);
          if (success) {
            this.tooltipContainer.setVisible(false);
            this.refresh();
          }
        });
      }

      container.add(hitZone);
    });

    return container;
  }

  // ── Node rendering by state ──

  private drawUnlockedNode(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number,
    radius: number,
    tier: NodeTier,
    color: number,
  ) {
    // Outer glow layers (bloom effect)
    g.fillStyle(color, 0.04);
    g.fillCircle(x, y, radius * 4);
    g.fillStyle(color, 0.08);
    g.fillCircle(x, y, radius * 2.8);
    g.fillStyle(color, 0.14);
    g.fillCircle(x, y, radius * 1.8);

    // Ring border
    if (tier === 'keystone') {
      g.lineStyle(3, 0xffffff, 0.6);
      g.strokeCircle(x, y, radius + 3);
      g.lineStyle(1.5, color, 0.5);
      g.strokeCircle(x, y, radius + 6);
    } else if (tier === 'notable') {
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeCircle(x, y, radius + 2);
    }

    // Core fill
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, y, radius);

    // Inner color overlay
    g.fillStyle(color, 0.35);
    g.fillCircle(x, y, radius * 0.7);

    // Center bright dot
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(x, y, radius * 0.25);
  }

  private drawAffordableNode(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number,
    radius: number,
    tier: NodeTier,
    color: number,
  ) {
    // Subtle glow to indicate affordability
    g.fillStyle(color, 0.06);
    g.fillCircle(x, y, radius * 2.5);

    // Pulsing ring
    g.lineStyle(tier === 'keystone' ? 2.5 : tier === 'notable' ? 2 : 1.5, color, 0.55);
    g.strokeCircle(x, y, radius + 2);

    // Dim fill
    g.fillStyle(color, 0.25);
    g.fillCircle(x, y, radius);

    // Inner dot
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(x, y, radius * 0.3);
  }

  private drawLockedNode(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number,
    radius: number,
    tier: NodeTier,
  ) {
    // Barely visible outline
    const r = tier === 'keystone' ? radius : tier === 'notable' ? radius * 0.85 : radius * 0.7;

    g.lineStyle(1, 0x445566, LOCKED_ALPHA);
    g.strokeCircle(x, y, r);

    // Very dim fill
    g.fillStyle(0x334455, LOCKED_ALPHA * 0.6);
    g.fillCircle(x, y, r * 0.5);
  }

  // ── Tooltip ──

  private showTooltip(
    x: number,
    y: number,
    node: { name: string; description: string; cost: number; id: string },
    unlocked: boolean,
    branchColor: number,
  ) {
    const pad = 10;
    const colorStr = '#' + branchColor.toString(16).padStart(6, '0');
    this.tooltipName.setText(node.name).setColor(colorStr);
    this.tooltipDesc.setText(node.description);
    this.tooltipCost.setText(unlocked ? 'Unlocked' : `Cost: ${node.cost} faith`);
    if (unlocked) this.tooltipCost.setColor('#44ff88');
    else this.tooltipCost.setColor('#ffcc44');

    const w =
      Math.max(this.tooltipName.width, this.tooltipDesc.width, this.tooltipCost.width) + pad * 2;
    const h = this.tooltipCost.y + this.tooltipCost.height + pad;

    this.tooltipBg.clear();
    // Dark panel with border
    this.tooltipBg.fillStyle(0x080810, 0.92);
    this.tooltipBg.fillRoundedRect(-pad, -pad, w, h, 4);
    this.tooltipBg.lineStyle(1, branchColor, 0.3);
    this.tooltipBg.strokeRoundedRect(-pad, -pad, w, h, 4);

    // Clamp to screen
    const cam = this.scene.cameras.main;
    let tx = x - w / 2 + pad;
    let ty = y - h;
    tx = Math.max(4, Math.min(cam.width - w - 4, tx));
    ty = Math.max(4, ty);

    this.tooltipContainer.setPosition(tx, ty);
    this.tooltipContainer.setVisible(true);
  }

  private updateBudget() {
    const available = this.constellationMgr.darkFaith;
    const earned = this.constellationMgr.darkFaithEarnedLastDay;
    this.budgetText.setText(`Dark Faith: ${available}  (earned last day: ${earned})`);
  }
}
