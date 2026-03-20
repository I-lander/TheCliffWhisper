import { DeckManager, HandCard } from '../cards/DeckManager';
import { getTierColor } from '../cards/CardData';

export class CardHandUI {
  private scene: Phaser.Scene;
  private deckManager: DeckManager;
  private container: Phaser.GameObjects.Container;
  private cardContainers: Phaser.GameObjects.Container[] = [];

  private baseY: number;
  private cardWidth: number;
  private cardHeight: number;

  constructor(scene: Phaser.Scene, deckManager: DeckManager) {
    this.scene = scene;
    this.deckManager = deckManager;

    const h = scene.cameras.main.height;
    const tileSize = h / 18;
    this.cardWidth = tileSize * 3.5;
    this.cardHeight = tileSize * 5;
    this.baseY = h - this.cardHeight - tileSize * 0.5;

    this.container = scene.add.container(0, 0);
    this.container.setDepth(100);
    this.setVisible(false);
  }

  setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }

  refresh() {
    this.cardContainers.forEach((c) => c.destroy());
    this.cardContainers = [];

    const hand = this.deckManager.getHand();
    const gap = 16;
    const totalWidth = hand.length * this.cardWidth + (hand.length - 1) * gap;
    const startX = (this.scene.cameras.main.width - totalWidth) / 2;

    hand.forEach((handCard, i) => {
      const x = startX + i * (this.cardWidth + gap);
      const cardContainer = this.createCard(handCard, i, x, this.baseY);
      this.container.add(cardContainer);
      this.cardContainers.push(cardContainer);
    });
  }

  private createCard(handCard: HandCard, index: number, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const def = handCard.def;
    const tierColor = Phaser.Display.Color.ValueToColor(getTierColor(def.tier)).color;
    const tileSize = this.scene.cameras.main.height / 18;
    const pad = tileSize * 0.35;
    const textWidth = this.cardWidth - pad * 2;

    // Card background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0d0d1a, 0.95);
    bg.fillRoundedRect(0, 0, this.cardWidth, this.cardHeight, 6);
    bg.lineStyle(2, tierColor, 0.7);
    bg.strokeRoundedRect(0, 0, this.cardWidth, this.cardHeight, 6);
    container.add(bg);

    // --- Layout zones ---
    // Zone 1: Name (top)
    const nameSize = Math.round(tileSize * 0.38);
    const nameText = this.scene.add.text(pad, pad, def.name, {
      fontSize: `${nameSize}px`,
      color: getTierColor(def.tier),
      fontFamily: 'monospace',
      fontStyle: 'bold',
      wordWrap: { width: textWidth },
      lineSpacing: 2,
    });
    container.add(nameText);

    // Separator line after name
    const sepY1 = pad + nameText.height + pad * 0.5;
    const sep1 = this.scene.add.graphics();
    sep1.lineStyle(1, tierColor, 0.25);
    sep1.lineBetween(pad, sepY1, this.cardWidth - pad, sepY1);
    container.add(sep1);

    // Zone 2: Effect (middle, main area)
    const effectY = sepY1 + pad * 0.6;
    const effectSize = Math.round(tileSize * 0.32);
    const effectText = this.scene.add.text(pad, effectY, def.effectText, {
      fontSize: `${effectSize}px`,
      color: '#dddddd',
      fontFamily: 'monospace',
      wordWrap: { width: textWidth },
      lineSpacing: 4,
    });
    container.add(effectText);

    // Zone 3: Penalty (bottom, pinned)
    const penaltySize = Math.round(tileSize * 0.26);
    const penaltyY = this.cardHeight - pad - penaltySize * 2.5;
    const sep2 = this.scene.add.graphics();
    sep2.lineStyle(1, 0xff4444, 0.15);
    sep2.lineBetween(pad, penaltyY - pad * 0.4, this.cardWidth - pad, penaltyY - pad * 0.4);
    container.add(sep2);

    const penaltyLabel = this.scene.add.text(pad, penaltyY, 'Penalty', {
      fontSize: `${penaltySize}px`,
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setAlpha(0.7);
    container.add(penaltyLabel);

    const penaltyText = this.scene.add.text(pad, penaltyY + penaltySize * 1.3, def.penaltyText, {
      fontSize: `${penaltySize}px`,
      color: '#cc6666',
      fontFamily: 'monospace',
      wordWrap: { width: textWidth },
      lineSpacing: 2,
    }).setAlpha(0.8);
    container.add(penaltyText);

    // Interactive zone
    const hitZone = this.scene.add.rectangle(
      this.cardWidth / 2, this.cardHeight / 2,
      this.cardWidth, this.cardHeight,
    ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    container.add(hitZone);

    if (handCard.played) {
      container.setVisible(false);
    } else {
      hitZone.on(Phaser.Input.Events.POINTER_OVER, () => {
        container.setY(y - 15);
      });
      hitZone.on(Phaser.Input.Events.POINTER_OUT, () => {
        container.setY(y);
      });
      hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
        const success = this.deckManager.playCard(index);
        if (success) {
          this.refresh();
        }
      });
    }

    return container;
  }
}
