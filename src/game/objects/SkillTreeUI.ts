import { ConstellationManager } from '../constellations/ConstellationManager';
import { SkillTree } from '../constellations/ConstellationData';

const STAR_RADIUS = 10;
const STAR_RADIUS_UNLOCKED = 13;
const CONSTELLATION_WIDTH = 400;
const CONSTELLATION_HEIGHT = 420;
const LOCKED_ALPHA = 0.25;
const AFFORDABLE_ALPHA = 0.6;

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

  constructor(scene: Phaser.Scene, constellationMgr: ConstellationManager, onEndNight: () => void) {
    this.scene = scene;
    this.constellationMgr = constellationMgr;
    this.onEndNight = onEndNight;

    const cam = scene.cameras.main;
    const tileSize = cam.height / 18;
    const trees = constellationMgr.getTrees();
    this.spacing = cam.width / (trees.length + 1);
    this.baseX = this.spacing;
    this.baseY = tileSize * 2 + CONSTELLATION_HEIGHT / 2;

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
    const btnY = this.baseY + CONSTELLATION_HEIGHT / 2 + tileSize * 2;
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
    const ttFont = Math.round(tileSize * 0.3);
    this.tooltipName = scene.add.text(0, 0, '', {
      fontSize: `${ttFont}px`,
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    this.tooltipDesc = scene.add.text(0, ttFont * 1.3, '', {
      fontSize: `${Math.round(ttFont * 0.85)}px`,
      color: '#aaaaaa',
      fontFamily: 'monospace',
    });
    this.tooltipCost = scene.add.text(0, ttFont * 2.6, '', {
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
      x: cx + node.x * (CONSTELLATION_WIDTH / 2),
      y: cy + node.y * (CONSTELLATION_HEIGHT / 2),
    };
  }

  private renderConstellation(
    tree: SkillTree,
    cx: number,
    cy: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const tileSize = this.scene.cameras.main.height / 18;
    const treeColor = Phaser.Display.Color.ValueToColor(tree.color).color;

    // Constellation name below
    const nameText = this.scene.add
      .text(cx, cy + CONSTELLATION_HEIGHT / 2 + tileSize * 0.6, tree.name, {
        fontSize: `${Math.round(tileSize * 0.35)}px`,
        color: tree.color,
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);
    container.add(nameText);

    // Draw edges first (lines between stars)
    const edgeGraphics = this.scene.add.graphics();
    for (const [fromIdx, toIdx] of tree.edges) {
      const from = this.nodeScreenPos(tree, fromIdx, cx, cy);
      const to = this.nodeScreenPos(tree, toIdx, cx, cy);
      const fromUnlocked = this.constellationMgr.isUnlocked(tree.nodes[fromIdx].id);
      const toUnlocked = this.constellationMgr.isUnlocked(tree.nodes[toIdx].id);
      const bothUnlocked = fromUnlocked && toUnlocked;

      edgeGraphics.lineStyle(
        bothUnlocked ? 2 : 1,
        bothUnlocked ? treeColor : 0x444466,
        bothUnlocked ? 0.6 : 0.2,
      );
      edgeGraphics.lineBetween(from.x, from.y, to.x, to.y);
    }
    container.add(edgeGraphics);

    // Draw nodes (stars)
    tree.nodes.forEach((node, nodeIndex) => {
      const pos = this.nodeScreenPos(tree, nodeIndex, cx, cy);
      const isUnlocked = this.constellationMgr.isUnlocked(node.id);
      const canUnlock = this.constellationMgr.canUnlock(tree.id, nodeIndex);

      const g = this.scene.add.graphics();
      const radius = isUnlocked ? STAR_RADIUS_UNLOCKED : STAR_RADIUS;

      if (isUnlocked) {
        // Glowing star
        g.fillStyle(treeColor, 0.15);
        g.fillCircle(pos.x, pos.y, radius * 2.5);
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(pos.x, pos.y, radius);
        g.fillStyle(treeColor, 0.4);
        g.fillCircle(pos.x, pos.y, radius * 0.6);
      } else if (canUnlock) {
        // Pulsing dim star
        g.fillStyle(0xaabbee, AFFORDABLE_ALPHA);
        g.fillCircle(pos.x, pos.y, radius);
        g.lineStyle(1, 0xaabbee, 0.5);
        g.strokeCircle(pos.x, pos.y, radius * 1.5);
      } else {
        // Dim dot
        g.fillStyle(0x556677, LOCKED_ALPHA);
        g.fillCircle(pos.x, pos.y, radius * 0.7);
      }

      container.add(g);

      // Interactive zone
      const hitRadius = radius * 2;
      const hitZone = this.scene.add
        .circle(pos.x, pos.y, hitRadius)
        .setInteractive({ useHandCursor: canUnlock })
        .setAlpha(0.001);

      hitZone.on(Phaser.Input.Events.POINTER_OVER, () => {
        this.showTooltip(
          pos.x,
          pos.y - 40,
          node.name,
          node.description,
          node.cost,
          isUnlocked,
          tree.color,
        );
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

  private showTooltip(
    x: number,
    y: number,
    name: string,
    desc: string,
    cost: number,
    unlocked: boolean,
    color: string,
  ) {
    const pad = 8;
    this.tooltipName.setText(name).setColor(color);
    this.tooltipDesc.setText(desc);
    this.tooltipCost.setText(unlocked ? 'Unlocked' : `Cost: ${cost} faith`);
    if (unlocked) this.tooltipCost.setColor('#44ff88');
    else this.tooltipCost.setColor('#ffcc44');

    const w =
      Math.max(this.tooltipName.width, this.tooltipDesc.width, this.tooltipCost.width) + pad * 2;
    const h = this.tooltipCost.y + this.tooltipCost.height + pad;

    this.tooltipBg.clear();
    this.tooltipBg.fillStyle(0x111122, 0.9);
    this.tooltipBg.fillRoundedRect(-pad, -pad, w, h, 4);

    this.tooltipContainer.setPosition(x - w / 2 + pad, y - h);
    this.tooltipContainer.setVisible(true);
  }

  private updateBudget() {
    const available = this.constellationMgr.darkFaith;
    const earned = this.constellationMgr.darkFaithEarnedLastDay;
    this.budgetText.setText(`Dark Faith: ${available}  (earned last day: ${earned})`);
  }
}
