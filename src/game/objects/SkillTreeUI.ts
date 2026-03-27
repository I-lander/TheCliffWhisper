import { ConstellationManager } from '../constellations/ConstellationManager';
import { SkillTree } from '../constellations/ConstellationData';
import { drawDashedLine, createUIPanel } from '../utils/utils';
import { t } from '../i18n/i18n';
import { AUDIO_KEYS } from '../audio/AudioManager';
import { MainScene } from '../scenes/MainScene';

const LOCKED_ALPHA = 0.18;

// Node tiers — root is keystone, ability unlocks are highlighted, branch tips are notable, rest are minor
type NodeTier = 'keystone' | 'ability' | 'notable' | 'minor';

const TIER_RADIUS: Record<NodeTier, number> = {
  keystone: 14,
  ability: 12,
  notable: 10,
  minor: 6,
};

// Ability unlock nodes — displayed with special emphasis
const ABILITY_UNLOCK_IDS = new Set(['ve_ab1', 'de_ab1', 'co_ab1', 'ma_ab1', 'ge_ab1']);

// Notable nodes: trunk tips, fork tips, and ability final upgrades
const BRANCH_TIP_IDS = new Set([
  // Trunk tips (node 10 of each branch)
  've_10',
  'de_10',
  'co_10',
  'ma_10',
  'ge_10',
  // Fork A tips
  've_fa4',
  'de_fa4',
  'co_fa4',
  'ma_fa4',
  'ge_fa4',
  // Fork B tips
  've_fb3',
  'de_fb3',
  'co_fb3',
  'ma_fb3',
  'ge_fb3',
  // Ability final upgrades
  've_ab6',
  'de_ab6',
  'co_ab6',
  'ma_ab6',
  'ge_ab6',
]);

// Per-branch colors keyed by node id prefix
const BRANCH_COLORS: Record<string, number> = {
  root: 0xffffff,
  ve: 0xffcc44, // velocity — yellow
  de: 0xbb66ff, // devotion — purple
  co: 0x44ff88, // contagion — green
  ma: 0x44ddff, // machinery — cyan
  ge: 0xff8844, // genesis — orange
};

function getBranchColor(nodeId: string): number {
  const prefix = nodeId.split('_')[0];
  return BRANCH_COLORS[prefix] ?? BRANCH_COLORS['root'];
}

function getNodeTier(nodeId: string): NodeTier {
  if (nodeId === 'root') return 'keystone';
  if (ABILITY_UNLOCK_IDS.has(nodeId)) return 'ability';
  if (BRANCH_TIP_IDS.has(nodeId)) return 'notable';
  return 'minor';
}

export class SkillTreeUI {
  private scene: MainScene;
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

  // Close button — standalone objects (not in a container) to avoid Phaser scrollFactor input bug
  private closeBtnText!: Phaser.GameObjects.Text;
  private closeBtnHitZone!: Phaser.GameObjects.Rectangle;

  // Unlock button — standalone objects with scrollFactor(0), positioned in showTooltip
  private unlockBtnBg!: Phaser.GameObjects.Graphics;
  private unlockBtnText!: Phaser.GameObjects.Text;
  private unlockBtnHitZone!: Phaser.GameObjects.Rectangle;

  private selectedNode: { treeId: string; nodeIndex: number } | null = null;

  private baseX: number;
  private baseY: number;
  private spacing: number;
  private constellationW: number;
  private constellationH: number;

  constructor(scene: MainScene, constellationMgr: ConstellationManager, onEndNight: () => void) {
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

    // End Night button with panel (same style as End Day)
    const endNightY = cam.height - tileSize * 1.2;
    const endNightFontSize = Math.round(tileSize * 0.5);
    const endNightPadX = tileSize * 0.6;
    const endNightPadY = tileSize * 0.25;
    const endNightLW = this.scene.pixelUnit;

    this.endNightBtn = scene.add
      .text(cam.width / 2, endNightY, t('tree.endNight'), {
        fontSize: `${endNightFontSize}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(181)
      .setInteractive({ useHandCursor: true });

    const endNightBg = scene.add.graphics().setScrollFactor(0).setDepth(180);
    const enBtnW = this.endNightBtn.width + endNightPadX * 2;
    const enBtnH = this.endNightBtn.height + endNightPadY * 2;
    const enBtnX = cam.width / 2 - enBtnW / 2;
    const enBtnY = endNightY - enBtnH / 2;
    createUIPanel(endNightBg, enBtnX, enBtnY, enBtnW, enBtnH, endNightLW, 0x4466aa, 0.5);

    this.endNightBtn.on(Phaser.Input.Events.POINTER_OVER, () =>
      this.endNightBtn.setColor('#ffffff'),
    );
    this.endNightBtn.on(Phaser.Input.Events.POINTER_OUT, () =>
      this.endNightBtn.setColor('#aaccff'),
    );
    this.endNightBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.sound.play(AUDIO_KEYS.UI_CLICK, { volume: 0.4 });
      this.onEndNight();
    });
    this.uiOverlay.add(endNightBg);
    this.uiOverlay.add(this.endNightBtn);

    // Tooltip (shared, moves on click) — only non-interactive elements here
    this.tooltipContainer = scene.add
      .container(0, 0)
      .setVisible(false)
      .setDepth(200)
      .setScrollFactor(0);
    this.tooltipBg = scene.add.graphics();
    const ttFont = Math.round(tileSize * 0.45);
    const ttSmall = Math.round(ttFont * 0.8);
    const lineH = ttFont * 1.6;
    this.tooltipName = scene.add
      .text(0, 0, '', {
        fontSize: `${ttFont}px`,
        color: '#ffffff',
        fontFamily: 'PixelSleigh',
      })
      .setVisible(false);
    this.tooltipDesc = scene.add.text(0, 0, '', {
      fontSize: `${ttSmall}px`,
      color: '#cccccc',
      fontFamily: 'PixelSleigh',
      wordWrap: { width: tileSize * 8 },
    });
    this.tooltipCost = scene.add.text(0, lineH, '', {
      fontSize: `${ttSmall}px`,
      color: '#ffcc44',
      fontFamily: 'PixelSleigh',
    });
    this.tooltipContainer.add([
      this.tooltipBg,
      this.tooltipName,
      this.tooltipDesc,
      this.tooltipCost,
    ]);

    // Close button — standalone objects, NOT inside tooltipContainer
    const closeFontSize = Math.round(tileSize * 0.45);
    const closeHitSize = tileSize * 1.2;
    this.closeBtnText = scene.add
      .text(0, 0, 'X', {
        fontSize: `${closeFontSize}px`,
        color: '#ff6666',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201)
      .setVisible(false);

    this.closeBtnHitZone = scene.add
      .rectangle(0, 0, closeHitSize, closeHitSize)
      .setScrollFactor(0)
      .setDepth(201)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setVisible(false);
    this.closeBtnHitZone.on(Phaser.Input.Events.POINTER_OVER, () =>
      this.closeBtnText.setColor('#ffffff'),
    );
    this.closeBtnHitZone.on(Phaser.Input.Events.POINTER_OUT, () =>
      this.closeBtnText.setColor('#ff6666'),
    );
    this.closeBtnHitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.hideSelection();
    });

    // Unlock button — standalone objects, NOT inside a container
    const btnFontSize = Math.round(tileSize * 0.55);
    this.unlockBtnBg = scene.add.graphics().setScrollFactor(0).setDepth(210).setVisible(false);
    this.unlockBtnText = scene.add
      .text(0, 0, t('tree.unlock'), {
        fontSize: `${btnFontSize}px`,
        color: '#44ff88',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(210)
      .setVisible(false);

    this.unlockBtnHitZone = scene.add
      .rectangle(0, 0, tileSize * 6, tileSize * 1.5)
      .setScrollFactor(0)
      .setDepth(210)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setVisible(false);
    this.unlockBtnHitZone.on(Phaser.Input.Events.POINTER_OVER, () =>
      this.unlockBtnText.setColor('#ffffff'),
    );
    this.unlockBtnHitZone.on(Phaser.Input.Events.POINTER_OUT, () =>
      this.unlockBtnText.setColor('#44ff88'),
    );
    this.unlockBtnHitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.selectedNode) return;
      const success = this.constellationMgr.unlockNode(
        this.selectedNode.treeId,
        this.selectedNode.nodeIndex,
      );
      if (success) {
        this.scene.sound.play(AUDIO_KEYS.NODE_UNLOCK, { volume: 0.5 });
        this.hideSelection();
        this.refresh();
      } else {
        this.scene.sound.play(AUDIO_KEYS.NODE_LOCKED, { volume: 0.3 });
      }
    });

    // Click on empty space during night → dismiss tooltip
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (!this.isNight) return;
      if (currentlyOver.length === 0 && this.tooltipContainer.visible) {
        this.hideSelection();
      }
    });

    this.setVisible(false);
  }

  private isNight: boolean = false;

  private hideSelection() {
    this.selectedNode = null;
    this.tooltipContainer.setVisible(false);
    this.closeBtnText.setVisible(false);
    this.closeBtnHitZone.setVisible(false);
    this.unlockBtnBg.setVisible(false);
    this.unlockBtnText.setVisible(false);
    this.unlockBtnHitZone.setVisible(false);
  }

  setVisible(visible: boolean) {
    this.isNight = visible;
    // Always keep the constellation container visible — day mode shows unlocked nodes at low alpha
    this.container.setVisible(true);
    // UI overlay (budget, end night) only during night
    this.uiOverlay.setVisible(visible);
    if (!visible) {
      this.hideSelection();
    }
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
    const maxY = Math.max(...tree.nodes.map((n) => n.y));
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
          rootPos.x,
          rootPos.y,
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
        drawDashedLine(
          edgeGraphics,
          from.x,
          from.y,
          to.x,
          to.y,
          dash,
          gap,
          pu * 3,
          branchColor,
          0.12,
        );
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

      const isAbility = tier === 'ability';
      const starScale =
        (tier === 'keystone' ? 1.8 : isAbility ? 1.5 : tier === 'notable' ? 1.2 : 0.7) *
        (this.scene.cameras.main.height / 18 / 16);

      if (isUnlocked) {
        // Glow behind star
        const glow = this.scene.add.graphics();
        glow.fillStyle(branchColor, isAbility ? 0.12 : 0.08);
        glow.fillCircle(pos.x, pos.y, radius * (isAbility ? 4 : 3));
        glow.fillStyle(branchColor, isAbility ? 0.25 : 0.15);
        glow.fillCircle(pos.x, pos.y, radius * (isAbility ? 2.5 : 1.8));
        glow.setAlpha(dayAlpha);
        container.add(glow);
        // Star sprite tinted with branch color
        const star = this.scene.add
          .image(pos.x, pos.y, 'star')
          .setScale(starScale)
          .setAlpha(dayAlpha);
        star.setTintFill(branchColor);
        container.add(star);
        // Bright center
        const center = this.scene.add
          .image(pos.x, pos.y, 'star')
          .setScale(starScale * 0.5)
          .setAlpha(0.9 * dayAlpha);
        star.setTintFill(0xffffff);
        container.add(center);
      } else if (canUnlock) {
        // Ability nodes: pulsing outer ring when unlockable
        if (isAbility) {
          const pulseGlow = this.scene.add.graphics();
          pulseGlow.fillStyle(branchColor, 0.15);
          pulseGlow.fillCircle(pos.x, pos.y, radius * 3.5);
          pulseGlow.setAlpha(dayAlpha);
          container.add(pulseGlow);
          this.scene.tweens.add({
            targets: pulseGlow,
            alpha: { from: 0.15 * dayAlpha, to: 0.4 * dayAlpha },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
        const star = this.scene.add
          .image(pos.x, pos.y, 'star')
          .setScale(starScale * 0.9)
          .setAlpha((isAbility ? 0.7 : 0.5) * dayAlpha);
        star.setTintFill(branchColor);
        container.add(star);
      } else {
        // Ability nodes: still bigger and slightly brighter when locked
        if (isAbility) {
          const dimGlow = this.scene.add.graphics();
          dimGlow.fillStyle(branchColor, 0.06);
          dimGlow.fillCircle(pos.x, pos.y, radius * 2.5);
          dimGlow.setAlpha(dayAlpha);
          container.add(dimGlow);
        }
        const star = this.scene.add
          .image(pos.x, pos.y, 'star')
          .setScale(starScale * (isAbility ? 0.8 : 0.6))
          .setAlpha((isAbility ? LOCKED_ALPHA * 1.5 : LOCKED_ALPHA) * dayAlpha);
        star.setTintFill(isAbility ? branchColor : 0x445566);
        container.add(star);
      }

      // Interactive zone (night only) — large touch target for mobile
      if (this.isNight) {
        const tileSize = this.scene.cameras.main.height / 18;
        const minHitRadius = tileSize * 0.8; // ~44px equivalent on mobile
        const hitRadius = Math.max(radius * 3, minHitRadius);
        const hitZone = this.scene.add
          .circle(pos.x, pos.y, hitRadius)
          .setInteractive({ useHandCursor: true })
          .setAlpha(0.001);

        hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
          this.scene.sound.play(AUDIO_KEYS.NODE_HOVER, { volume: 0.2 });
          this.showTooltip(
            pos.x,
            pos.y - radius - 30,
            node,
            isUnlocked,
            canUnlock,
            branchColor,
            tree.id,
            nodeIndex,
          );
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
    const cam = this.scene.cameras.main;
    const tileSize = cam.height / 18;
    const pad = Math.round(tileSize * 0.4);
    const pu = tileSize/16;
    const colorStr = '#' + branchColor.toString(16).padStart(6, '0');

    // Show node name (localized) + technical stat/modifier description (localized)
    this.tooltipName.setText(t(`node.${node.id}.name`)).setColor(colorStr).setVisible(true);
    this.tooltipDesc.setText(t(`node.${node.id}.desc`)).setColor('#cccccc');
    this.tooltipDesc.setY(this.tooltipName.height + pad * 0.3);
    this.tooltipCost.setText(
      unlocked ? t('tree.unlocked') : t('tree.cost').replace('{cost}', String(node.cost)),
    );
    this.tooltipCost.setY(this.tooltipDesc.y + this.tooltipDesc.height + pad * 0.5);
    if (unlocked) this.tooltipCost.setColor('#44ff88');
    else this.tooltipCost.setColor('#ffcc44');

    this.selectedNode = canUnlock ? { treeId, nodeIndex } : null;

    // Tooltip dimensions — extra space on right for close button
    const closeBtnSpace = Math.round(pad * 1.5);
    const w = Math.max(this.tooltipName.width, this.tooltipDesc.width, this.tooltipCost.width) + pad * 2 + closeBtnSpace;
    const h = this.tooltipCost.y + this.tooltipCost.height + pad;

    this.tooltipBg.clear();
    createUIPanel(this.tooltipBg, -pad, -pad, w, h, pu, branchColor, 0.6, {
      color: 0x080810,
      alpha: 0.92,
    });

    // Convert world coords to screen coords (tooltip has scrollFactor 0)
    const screenX = x - cam.scrollX;
    const screenY = y - cam.scrollY;

    let tx = screenX - w / 2 + pad;
    let ty = screenY - h;
    tx = Math.max(4, Math.min(cam.width - w - 4, tx));
    ty = Math.max(4, ty);

    this.tooltipContainer.setPosition(tx, ty);
    this.tooltipContainer.setVisible(true);

    // Close button — positioned at top-right of tooltip in absolute screen coords
    const closeX = tx + w - pad - closeBtnSpace / 2;
    const closeY = ty;
    this.closeBtnText.setPosition(closeX, closeY).setVisible(true);
    this.closeBtnHitZone.setPosition(closeX, closeY).setVisible(true);

    // Unlock button — attached just below the tooltip
    if (canUnlock) {
      const btnW = w;
      const btnH = tileSize * 1.5;
      const btnX = tx - pad;
      const btnY = ty + h;

      this.unlockBtnBg.clear();
      this.unlockBtnBg.setVisible(true);
      createUIPanel(this.unlockBtnBg, btnX, btnY, btnW, btnH, pu, 0x44ff88, 0.8, {
        color: 0x0a0a1a,
        alpha: 0.92,
      });
      this.unlockBtnText.setPosition(btnX + btnW / 2, btnY + btnH / 2).setVisible(true);
      this.unlockBtnHitZone.setPosition(btnX + btnW / 2, btnY + btnH / 2);
      this.unlockBtnHitZone.setSize(btnW, btnH);
      this.unlockBtnHitZone.setInteractive({ useHandCursor: true });
      this.unlockBtnHitZone.setVisible(true);
    } else {
      this.unlockBtnBg.setVisible(false);
      this.unlockBtnText.setVisible(false);
      this.unlockBtnHitZone.setVisible(false);
    }
  }

  private updateBudget() {
    this.budgetText.setText(`${t('hud.souls')}: ${this.constellationMgr.souls}`);
  }
}
