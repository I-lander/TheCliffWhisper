import { CustomScene } from '../customClasses/CustomScene';
import { GameManager, GamePhase } from '../GameManager';
import { PopulationManager } from '../PopulationManager';
import { ConstellationManager } from '../constellations/ConstellationManager';
import { DecorManager } from '../decor/DecorManager';
import { Human } from '../objects/Human';
import { SkillTreeUI } from '../objects/SkillTreeUI';
import { CardHandUI } from '../objects/CardHandUI';
import { JuiceEffects } from '../objects/JuiceEffects';
import { removeSplashScreen } from '../utils/utils';
import { UIScene } from './UIScene';
import { DeckManager } from '../cards/DeckManager';

const SKY_COLORS: Record<GamePhase, number> = {
  [GamePhase.Night]: 0x0a0a1a,
  [GamePhase.Daytime]: 0x2a2a4a,
  [GamePhase.Sunset]: 0x1a1020,
};

export class MainScene extends CustomScene {
  uiScene!: UIScene;
  gameManager!: GameManager;
  populationManager!: PopulationManager;
  constellationManager!: ConstellationManager;
  deckManager!: DeckManager;
  decorManager!: DecorManager;
  private skillTreeUI!: SkillTreeUI;
  private cardHandUI!: CardHandUI;
  private juiceEffects!: JuiceEffects;
  private decorContainer!: Phaser.GameObjects.Container;

  canvasWidth: number = 0;
  canvasHeight: number = 0;
  tileSize: number = 0;

  // Cliff geometry
  private cliffEdgeX: number = 0;
  private groundY: number = 0;
  private spawnX: number = 0;

  // Humans
  private humans: Human[] = [];
  private autoClickTimer: number = 0;
  private runEnded: boolean = false;

  // Click cooldown
  private clickCooldownTimer: number = 0;
  private cooldownBar!: Phaser.GameObjects.Rectangle;
  private cooldownBarBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('MainScene');
  }

  create() {
    super.create();
    removeSplashScreen(this);

    this.canvasHeight = this.cameras.main.height;
    this.canvasWidth = this.cameras.main.width;
    this.tileSize = this.canvasHeight / 18;
    this.pixelUnit = this.tileSize / 16;

    // Cliff layout
    this.groundY = this.canvasHeight * 0.4;
    this.cliffEdgeX = this.canvasWidth * 0.75;
    this.spawnX = -this.tileSize;

    this.drawCliff();

    // Managers
    this.gameManager = new GameManager();
    this.populationManager = new PopulationManager(this.gameManager);

    this.constellationManager = new ConstellationManager(
      this.populationManager.stats,
      this.populationManager,
      this.gameManager,
    );

    this.deckManager = new DeckManager(this.populationManager, this.gameManager);
    this.deckManager.setSpawnWaveFn((count) => {
      for (let i = 0; i < count; i++) {
        this.spawnHuman(this.spawnX - i * this.tileSize * 1.5);
      }
    });
    this.deckManager.setHumansOnScreenFn(() => this.getWalkingHumansCount());
    this.deckManager.setHumansNearEdgeFn(() => this.getHumansNearEdge());
    this.deckManager.setForceAllJumpFn(() => this.forceAllJump());
    this.deckManager.setDecorCountFn(() => this.decorManager.getOccupiedCount());
    this.deckManager.setInvertDecorFn(() => this.decorManager.invertEffects());
    this.deckManager.setRevertDecorFn(() => this.decorManager.revertInversion());
    this.deckManager.setBonusesFn(() => this.constellationManager.bonuses);

    // Decor system
    this.decorManager = new DecorManager(
      this.cliffEdgeX,
      this.tileSize,
      this.populationManager.stats,
      this.gameManager,
    );
    this.decorContainer = this.add.container(0, 0);

    this.decorManager.setOnDecorPlaced((placed) => {
      this.addDecorSprite(placed.def.frameIndex, placed.slotIndex, placed.elevated);
      // Vow of Fragility: decor pop ends the effect
      if (this.deckManager.onDecorCallback) {
        this.deckManager.onDecorCallback();
        this.deckManager.onDecorCallback = null;
      }
    });

    // Skill tree UI (night phase)
    this.skillTreeUI = new SkillTreeUI(this, this.constellationManager, () => {
      this.gameManager.skipPhase();
    });

    // Card hand UI (day phase)
    this.cardHandUI = new CardHandUI(this, this.deckManager);

    // Juice effects
    this.juiceEffects = new JuiceEffects(this);

    // Wire card play feedback + decor cost
    this.deckManager.setOnCardPlayed((card) => {
      this.juiceEffects.onCardPlayed(card.tier);
      // Playing a card triggers decor spawns as a cost
      const decorCost =
        card.tier === 'common' ? 1 : card.tier === 'uncommon' ? 1 : card.tier === 'rare' ? 2 : 3; // legendary
      this.decorManager.forceSpawn(decorCost);
    });
    this.deckManager.setOnPenaltyApplied(() => {
      this.juiceEffects.onPenalty();
    });
    this.deckManager.setOnCardDropped(() => {
      this.cardHandUI.refresh();
    });

    this.uiScene = this.scene.get('UIScene') as UIScene;
    this.uiScene.setGameManager(this.gameManager);
    this.uiScene.setPopulationManager(this.populationManager);

    const nightScrollY = this.groundY - this.canvasHeight + this.tileSize;

    this.gameManager.onPhaseChange((phase) => {
      this.cameras.main.setBackgroundColor(SKY_COLORS[phase]);
      if (phase === GamePhase.Daytime) {
        this.autoClickTimer = 0;
        this.clickCooldownTimer = 0;
        this.juiceEffects.resetDaily();
      }
      if (phase === GamePhase.Sunset) {
        this.forceAllTurnBack();
      }

      // Show skill tree only during night
      const isNight = phase === GamePhase.Night;
      this.skillTreeUI.setVisible(isNight);
      if (isNight) {
        this.skillTreeUI.refresh();
      }

      // Show card hand during Daytime
      this.cardHandUI.setVisible(phase === GamePhase.Daytime);
      if (phase === GamePhase.Daytime) {
        this.cardHandUI.refresh();
      }

      // Camera pan: night = scroll up to show constellation, day/sunset = normal
      const targetScrollY = isNight ? nightScrollY : 0;
      this.tweens.add({
        targets: this.cameras.main,
        scrollY: targetScrollY,
        duration: 800,
        ease: 'Power2',
        onUpdate: () => {
          if (isNight) {
            this.skillTreeUI.setCameraOffset(this.cameras.main.scrollY);
          }
        },
      });
      if (isNight) {
        this.skillTreeUI.setCameraOffset(this.cameras.main.scrollY);
      }
    });

    // Start in daytime
    this.cameras.main.setBackgroundColor(SKY_COLORS[GamePhase.Daytime]);

    // Cooldown bar (bottom-center, hidden by default)
    const barWidth = this.tileSize * 4;
    const barHeight = this.tileSize * 0.3;
    const barX = this.canvasWidth / 2 - barWidth / 2;
    const barY = this.canvasHeight - this.tileSize * 1.5;
    this.cooldownBarBg = this.add
      .rectangle(barX, barY, barWidth, barHeight, 0x000000, 0.4)
      .setOrigin(0, 0)
      .setDepth(150)
      .setVisible(false);
    this.cooldownBar = this.add
      .rectangle(barX, barY, barWidth, barHeight, 0xaaccff, 0.8)
      .setOrigin(0, 0)
      .setDepth(151)
      .setVisible(false);

    // Click on cliff during daytime = spawn 1 human
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.runEnded) return;
      if (this.gameManager.getPhase() !== GamePhase.Daytime) return;
      if (this.clickCooldownTimer > 0) return;
      this.doSpawn();
      this.clickCooldownTimer = this.populationManager.stats.clickCooldown;
    });

    // Debug shortcuts (Space = skip phase, F = fast-forward 10s)
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.runEnded) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.gameManager.skipPhase();
      }
      if (e.code === 'KeyF') {
        this.gameManager.update(10_000);
      }
    });
  }

  private addDecorSprite(frameIndex: number, slotIndex: number, elevated: boolean = false) {
    const scale = this.tileSize / 16;
    const x = slotIndex * this.tileSize;
    const baseY = this.groundY - this.tileSize;
    const y = elevated ? baseY - this.tileSize : baseY;

    // If elevated, draw a 3-tile-wide hill with sprites
    if (elevated) {
      const hillX = x - this.tileSize;
      const hillW = this.tileSize * 3;
      const ground = this.add.graphics();
      ground.fillStyle(0x3a3a2a);
      ground.fillRect(hillX, baseY, hillW, this.tileSize);
      this.decorContainer.addAt(ground, 0);

      const cornerFrame = 14 * 16 + 0; // frame(0, 14) — left corner, hills only
      const edgeFrame = 14 * 16 + 1; // frame(1, 14) — straight edge
      // Left corner
      this.decorContainer.add(
        this.add
          .image(hillX, baseY - this.tileSize, 'worldElement', cornerFrame)
          .setOrigin(0, 0)
          .setScale(scale),
      );
      // Center edge
      this.decorContainer.add(
        this.add
          .image(hillX + this.tileSize, baseY - this.tileSize, 'worldElement', edgeFrame)
          .setOrigin(0, 0)
          .setScale(scale),
      );
      // Right edge (mirror the edge)
      this.decorContainer.add(
        this.add
          .image(hillX + this.tileSize * 2, baseY - this.tileSize, 'worldElement', edgeFrame)
          .setOrigin(0, 0)
          .setScale(scale),
      );
    }

    const sprite = this.add
      .image(x, y, 'worldElement', frameIndex)
      .setOrigin(0, 0)
      .setScale(scale)
      .setAlpha(0);

    // Pop-in animation
    this.tweens.add({
      targets: sprite,
      alpha: 1,
      scaleX: scale * 1.3,
      scaleY: scale * 1.3,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: sprite,
          scaleX: scale,
          scaleY: scale,
          duration: 200,
          ease: 'Power2',
        });
      },
    });

    this.decorContainer.add(sprite);
  }

  private drawCliff() {
    const g = this.add.graphics();
    g.fillStyle(0x222222);
    g.fillRect(0, this.groundY, this.cliffEdgeX - this.tileSize, this.canvasHeight - this.groundY);

    const scale = this.tileSize / 16;
    const groundFrame = 14 * 16 + 1;  // frame(1, 14) — ground surface, tiled
    const faceFrame = 15 * 16 + 1;    // frame(1, 15) — cliff face, tiled vertically
    const cornerFrame = 15 * 16 + 2;  // frame(2, 15) — cliff corner (top-right)

    // Ground surface along the top
    for (let tx = 0; tx < this.cliffEdgeX -  this.tileSize; tx += this.tileSize) {
      this.add
        .image(tx, this.groundY - this.tileSize, 'worldElement', groundFrame)
        .setOrigin(0, 0)
        .setScale(scale);
    }

    // Cliff corner at top-right
    this.add
      .image(this.cliffEdgeX, this.groundY, 'worldElement', cornerFrame)
      .setOrigin(1, 0)
      .setScale(scale);

    // Cliff face going down from below the corner
    for (let ty = this.groundY + this.tileSize; ty < this.canvasHeight; ty += this.tileSize) {
      this.add
        .image(this.cliffEdgeX, ty, 'worldElement', faceFrame)
        .setOrigin(1, 0)
        .setScale(scale);
    }
  }

  update(time: number, delta: number) {
    if (this.runEnded) return;

    this.gameManager.update(delta);
    this.deckManager.update(delta);
    this.decorManager.update(delta);
    this.juiceEffects.update(delta);

    // Win check
    if (this.populationManager.isExtinct()) {
      this.endRun('victory');
      return;
    }

    // Lose check — only during Daytime with active auto-clickers
    if (this.gameManager.getPhase() === GamePhase.Daytime) {
      const dayDuration = this.gameManager.getDaytimeDuration();
      const autoCount = this.constellationManager.bonuses.autoClickerCount;
      if (this.populationManager.isDefeatInevitable(dayDuration, autoCount)) {
        this.endRun('defeat');
        return;
      }
    }

    // Auto-clicker spawns during Daytime
    if (this.gameManager.getPhase() === GamePhase.Daytime && !this.populationManager.isExtinct()) {
      const autoCount = this.constellationManager.bonuses.autoClickerCount;
      if (autoCount > 0) {
        this.autoClickTimer += delta;
        const interval = this.populationManager.stats.spawnInterval;
        if (this.autoClickTimer >= interval) {
          this.autoClickTimer -= interval;
          for (let i = 0; i < autoCount; i++) {
            this.doSpawn();
          }
        }
      }
    }

    // Click cooldown
    if (this.clickCooldownTimer > 0) {
      this.clickCooldownTimer = Math.max(0, this.clickCooldownTimer - delta);
      const cooldown = this.populationManager.stats.clickCooldown;
      const progress = this.clickCooldownTimer / cooldown;
      const barWidth = this.tileSize * 4;
      this.cooldownBar.width = barWidth * progress;
      this.cooldownBarBg.setVisible(true);
      this.cooldownBar.setVisible(true);
    } else {
      this.cooldownBarBg.setVisible(false);
      this.cooldownBar.setVisible(false);
    }

    // Update humans
    for (let i = this.humans.length - 1; i >= 0; i--) {
      const human = this.humans[i];
      human.update(time, delta);
      if (human.isGone()) {
        human.destroy();
        this.humans.splice(i, 1);
      }
    }
  }

  /** Spawn one human plus optional drag/override extras. */
  private doSpawn(overrideX?: number) {
    if (this.populationManager.population <= 0) return;
    this.spawnHuman(overrideX);
    if (this.deckManager.nextSpawnDragOverride > 0) {
      const extra = this.deckManager.nextSpawnDragOverride;
      this.deckManager.nextSpawnDragOverride = -1;
      for (let i = 0; i < extra; i++) this.spawnHuman();
    } else if (this.populationManager.shouldSpawnExtra()) {
      this.spawnHuman();
    }
  }

  private spawnHuman(overrideX?: number) {
    if (this.populationManager.population <= 0) return;

    // Black Tide: forceJumpRemaining overrides turn-back
    let shouldTurnBack = this.populationManager.shouldTurnBack();
    if (this.deckManager.forceJumpRemaining > 0) {
      shouldTurnBack = false;
      this.deckManager.forceJumpRemaining--;
    }

    const human = new Human(
      this,
      overrideX ?? this.spawnX,
      this.groundY,
      this.cliffEdgeX,
      this.populationManager.stats.walkSpeed,
      shouldTurnBack,
      (jumpX: number, jumpY: number) => {
        this.populationManager.onHumanJumped();
        this.juiceEffects.onJump(jumpX, jumpY);
        this.deckManager.tryDropCard(this.constellationManager.bonuses.cardDropRate);

        // Cursed Procession: chain spawn on jump
        if (this.deckManager.chainSpawnActive) {
          this.spawnHuman();
        }

        // The Last Sermon: cascade — force nearest walking human to also jump
        if (this.deckManager.cascadeJumpActive) {
          this.cascadeToNearest(jumpX);
        }
      },
      () => this.populationManager.onHumanTurnedBack(),
    );
    human.setOnFellOff((fx) => {
      this.juiceEffects.spawnSoul(fx, this.canvasHeight);
    });
    this.humans.push(human);
  }

  private getWalkingHumansCount(): number {
    return this.humans.filter((h) => h.isWalking()).length;
  }

  private getHumansNearEdge(): number {
    return this.humans.filter((h) => h.isWalking() && h.getProgress() > 0.6).length;
  }

  private forceAllJump() {
    const walking = this.humans.filter((h) => h.isWalking());
    for (const human of walking) {
      human.forceJump();
    }
  }

  private cascadeToNearest(fromX: number) {
    let nearest: Human | null = null;
    let nearestDist = Infinity;
    for (const h of this.humans) {
      if (!h.isWalking()) continue;
      const dist = Math.abs(h.x - fromX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = h;
      }
    }
    if (nearest) {
      nearest.forceJump();
    }
  }

  private forceAllTurnBack() {
    for (const human of this.humans) {
      human.forceTurnBack();
    }
  }

  private endRun(result: 'victory' | 'defeat') {
    this.runEnded = true;
    this.gameManager.pause();
    this.scene.launch('EndRunScene', {
      result,
      dayCount: this.gameManager.getDayCount(),
      population: this.populationManager.population,
    });
  }
}
