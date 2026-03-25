import { ConstellationManager } from '../constellations/ConstellationManager';
import { SkillTree } from '../constellations/ConstellationData';
import { drawDashedLine, createUIPanel } from '../utils/utils';

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
  'ha_k1', 'ha_k2', 'fa_k1', 'fa_k2', 'ti_k2',
  'vo_k1', 'au_k1', 'fr_k1', 'fr_k2',
  'po_k1', 'hv_k1', 'hv_k2',
  // ability unlock nodes
  'ha_b2', 'fa_b3', 'ti_a3', 'vo_a3', 'au_b3', 'hv_a2',
]);

// Per-branch colors keyed by node id prefix
const BRANCH_COLORS: Record<string, number> = {
  root: 0xffffff,
  ha: 0xffcc44,  // haste — yellow
  fa: 0xbb66ff,  // faith — purple
  ti: 0x44ff88,  // tide — green
  vo: 0xff4466,  // void — red
  au: 0x44ddff,  // automation — cyan
  fr: 0xff8844,  // frenzy — orange
  po: 0xff66aa,  // power — pink
  hv: 0x88ddff,  // harvest — light blue
  xb: 0xdddddd,  // cross-branch — white
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
  private uiOverlay!: Phaser.GameObjects.Container;
  private treeContainers: Phaser.GameObjects.Container[] = [];
  private tooltipContainer!: Phaser.GameObjects.Container;
  private tooltipBg!: Phaser.GameObjects.Graphics;
  private tooltipName!: Phaser.GameObjects.Text;
  private tooltipDesc!: Phaser.GameObjects.Text;
  private tooltipCost!: Phaser.GameObjects.Text;
  private unlockBtn!: Phaser.GameObjects.Text;
  private selectedNode: { treeId: string; nodeIndex: number } | null = null;

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

    // Constellation in WORLD space — much larger than screen, camera pans to explore
    this.constellationW = cam.width * 2.5;
    this.constellationH = cam.height * 2.5;
    this.spacing = cam.width / (trees.length + 1);
    this.baseX = cam.width / 2; // center horizontally

    // Root sits just above the cliff in world coords
    const groundY = cam.height * 0.4;
    this.baseY = groundY - tileSize * 2;

    this.container = scene.add.container(0, 0);

    // Budget text
    const fontSize = Math.round(tileSize * 0.55);
    // UI overlay — fixed to screen (scrollFactor 0), not in world container
    this.uiOverlay = scene.add.container(0, 0).setScrollFactor(0).setDepth(180).setVisible(false);

    this.budgetText = scene.add
      .text(cam.width / 2, tileSize * 0.5, '', {
        fontSize: `${fontSize}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setAlpha(0.9)
      .setScrollFactor(0);
    this.uiOverlay.add(this.budgetText);

    // End Night button
    const btnY = cam.height - tileSize * 1.2;
    this.endNightBtn = scene.add
      .text(cam.width / 2, btnY, '[ End Night ]', {
        fontSize: `${Math.round(tileSize * 0.6)}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.endNightBtn.on(Phaser.Input.Events.POINTER_OVER, () =>
      this.endNightBtn.setColor('#ffffff'),
    );
    this.endNightBtn.on(Phaser.Input.Events.POINTER_OUT, () =>
      this.endNightBtn.setColor('#aaccff'),
    );
    this.endNightBtn.on(Phaser.Input.Events.POINTER_DOWN, () => this.onEndNight());
    this.uiOverlay.add(this.endNightBtn);

    // Tooltip (shared, moves on click)
    this.tooltipContainer = scene.add.container(0, 0).setVisible(false).setDepth(200).setScrollFactor(0);
    this.tooltipBg = scene.add.graphics();
    const ttFont = Math.round(tileSize * 0.45);
    const ttSmall = Math.round(ttFont * 0.8);
    const lineH = ttFont * 1.6;
    this.tooltipName = scene.add.text(0, 0, '', {
      fontSize: `${ttFont}px`,
      color: '#ffffff',
      fontFamily: 'PixelSleigh',
    });
    this.tooltipDesc = scene.add.text(0, lineH, '', {
      fontSize: `${ttSmall}px`,
      color: '#cccccc',
      fontFamily: 'PixelSleigh',
    });
    this.tooltipCost = scene.add.text(0, lineH * 2, '', {
      fontSize: `${ttSmall}px`,
      color: '#ffcc44',
      fontFamily: 'PixelSleigh',
    });
    this.unlockBtn = scene.add.text(0, lineH * 3.2, '[ Unlock ]', {
      fontSize: `${ttFont}px`,
      color: '#44ff88',
      fontFamily: 'PixelSleigh',
    })
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.unlockBtn.on(Phaser.Input.Events.POINTER_OVER, () => this.unlockBtn.setColor('#ffffff'));
    this.unlockBtn.on(Phaser.Input.Events.POINTER_OUT, () => this.unlockBtn.setColor('#44ff88'));
    this.unlockBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.selectedNode) return;
      const success = this.constellationMgr.unlockNode(this.selectedNode.treeId, this.selectedNode.nodeIndex);
      if (success) {
        this.selectedNode = null;
        this.tooltipContainer.setVisible(false);
        this.refresh();
      }
    });
    this.tooltipContainer.add([
      this.tooltipBg,
      this.tooltipName,
      this.tooltipDesc,
      this.tooltipCost,
      this.unlockBtn,
    ]);
    this.container.add(this.tooltipContainer);

    this.setVisible(false);
  }

  private isNight: boolean = false;

  setVisible(visible: boolean) {
    this.isNight = visible;
    // Always keep the constellation container visible — day mode shows unlocked nodes at low alpha
    this.container.setVisible(true);
    // UI overlay (budget, end night) only during night
    this.uiOverlay.setVisible(visible);
    if (!visible) this.tooltipContainer.setVisible(false);
    this.refresh();
  }

  /** Returns the world position of the root node for camera centering. */
  getRootWorldPos(): { x: number; y: number } {
    const trees = this.constellationMgr.getTrees();
    if (trees.length === 0) return { x: this.baseX, y: this.baseY };
    const tree = trees[0];
    const cx = this.baseX;
    const cy = this.baseY;
    const rootPos = this.nodeScreenPos(tree, 0, cx, cy);
    return rootPos;
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
    // cy is the BOTTOM (root level, just above cliff).
    // All nodes go UP from there. We find the max y in data (root=0)
    // and offset so that max y maps to cy, everything else goes above.
    const maxY = Math.max(...tree.nodes.map(n => n.y));
    return {
      x: cx + node.x * (this.constellationW / 2),
      y: cy + (node.y - maxY) * (this.constellationH / 2),
    };
  }

  private renderConstellation(
    tree: SkillTree,
    cx: number,
    cy: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    const dayAlpha = this.isNight ? 1 : 0.15;

    // ── Background web: faint radial lines from root (night only) ──
    if (this.isNight) {
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
    }

    // ── Edges ──
    const edgeGraphics = this.scene.add.graphics();
    edgeGraphics.setAlpha(dayAlpha);
    for (const [fromIdx, toIdx] of tree.edges) {
      const from = this.nodeScreenPos(tree, fromIdx, cx, cy);
      const to = this.nodeScreenPos(tree, toIdx, cx, cy);
      const fromNode = tree.nodes[fromIdx];
      const toNode = tree.nodes[toIdx];
      const fromUnlocked = this.constellationMgr.isUnlocked(fromNode.id);
      const toUnlocked = this.constellationMgr.isUnlocked(toNode.id);
      const bothUnlocked = fromUnlocked && toUnlocked;
      const eitherUnlocked = fromUnlocked || toUnlocked;

      // Day mode: only draw unlocked edges
      if (!this.isNight && !bothUnlocked) continue;

      const pu = this.scene.cameras.main.height / 288; // pixelUnit
      const dash = pu * 4;
      const gap = pu * 3;

      if (bothUnlocked) {
        const branchColor = getBranchColor(toNode.id);
        drawDashedLine(edgeGraphics, from.x, from.y, to.x, to.y, dash, gap, pu * 3, branchColor, 0.12);
        drawDashedLine(edgeGraphics, from.x, from.y, to.x, to.y, dash, gap, pu, branchColor, 0.5);
        drawDashedLine(edgeGraphics, from.x, from.y, to.x, to.y, dash, gap, pu, 0xffffff, 0.4);
      } else if (eitherUnlocked) {
        const branchColor = getBranchColor(toNode.id);
        drawDashedLine(edgeGraphics, from.x, from.y, to.x, to.y, dash, gap, pu, branchColor, 0.2);
      } else {
        drawDashedLine(edgeGraphics, from.x, from.y, to.x, to.y, dash, gap, pu, 0x333355, 0.15);
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

      // Day mode: only draw unlocked nodes
      if (!this.isNight && !isUnlocked) return;

      const starScale = (tier === 'keystone' ? 1.8 : tier === 'notable' ? 1.2 : 0.7) * (this.scene.cameras.main.height / 18 / 16);

      if (isUnlocked) {
        // Glow behind star
        const glow = this.scene.add.graphics();
        glow.fillStyle(branchColor, 0.08);
        glow.fillCircle(pos.x, pos.y, radius * 3);
        glow.fillStyle(branchColor, 0.15);
        glow.fillCircle(pos.x, pos.y, radius * 1.8);
        glow.setAlpha(dayAlpha);
        container.add(glow);
        // Star sprite tinted with branch color
        const star = this.scene.add.image(pos.x, pos.y, 'star').setScale(starScale).setAlpha(dayAlpha);
        star.setTintFill(branchColor);
        container.add(star);
        // Bright center
        const center = this.scene.add.image(pos.x, pos.y, 'star').setScale(starScale * 0.5).setAlpha(0.9 * dayAlpha);
        star.setTintFill(0xffffff);
        container.add(center);
      } else if (canUnlock) {
        const star = this.scene.add.image(pos.x, pos.y, 'star').setScale(starScale * 0.9).setAlpha(0.5 * dayAlpha);
        star.setTintFill(branchColor);
        container.add(star);
      } else {
        const star = this.scene.add.image(pos.x, pos.y, 'star').setScale(starScale * 0.6).setAlpha(LOCKED_ALPHA * dayAlpha);
        star.setTintFill(0x445566);
        container.add(star);
      }

      // Interactive zone (night only)
      if (this.isNight) {
        const hitRadius = Math.max(radius * 2.5, 16);
        const hitZone = this.scene.add
          .circle(pos.x, pos.y, hitRadius)
          .setInteractive({ useHandCursor: true })
          .setAlpha(0.001);

        hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
          this.showTooltip(pos.x, pos.y - radius - 30, node, isUnlocked, canUnlock, branchColor, tree.id, nodeIndex);
        });

        container.add(hitZone);
      }
    });

    return container;
  }

  // ── Tooltip ──

  private showTooltip(
    x: number,
    y: number,
    node: { name: string; description: string; cost: number; id: string },
    unlocked: boolean,
    canUnlock: boolean,
    branchColor: number,
    treeId: string,
    nodeIndex: number,
  ) {
    const pad = Math.round(this.scene.cameras.main.height / 18 * 0.4);
    const colorStr = '#' + branchColor.toString(16).padStart(6, '0');
    this.tooltipName.setText(node.name).setColor(colorStr);
    this.tooltipDesc.setText(node.description);
    this.tooltipCost.setText(unlocked ? 'Unlocked' : `Cost: ${node.cost} souls`);
    if (unlocked) this.tooltipCost.setColor('#44ff88');
    else this.tooltipCost.setColor('#ffcc44');

    // Show unlock button only if affordable
    this.unlockBtn.setVisible(canUnlock);
    this.selectedNode = canUnlock ? { treeId, nodeIndex } : null;

    const bottomEl = canUnlock ? this.unlockBtn : this.tooltipCost;
    const w =
      Math.max(this.tooltipName.width, this.tooltipDesc.width, this.tooltipCost.width, canUnlock ? this.unlockBtn.width : 0) + pad * 2;
    const h = bottomEl.y + bottomEl.height + pad;
    const pu = this.scene.cameras.main.height / 288;

    this.tooltipBg.clear();
    createUIPanel(
      this.tooltipBg,
      -pad, -pad, w, h,
      pu,
      branchColor, 0.6,
      { color: 0x080810, alpha: 0.92 },
    );

    // Convert world coords to screen coords (tooltip has scrollFactor 0)
    const cam = this.scene.cameras.main;
    const screenX = x - cam.scrollX;
    const screenY = y - cam.scrollY;

    let tx = screenX - w / 2 + pad;
    let ty = screenY - h;
    tx = Math.max(4, Math.min(cam.width - w - 4, tx));
    ty = Math.max(4, ty);

    this.tooltipContainer.setPosition(tx, ty);
    this.tooltipContainer.setVisible(true);
  }

  private updateBudget() {
    this.budgetText.setText(`Souls: ${this.constellationMgr.souls}`);
  }
}
