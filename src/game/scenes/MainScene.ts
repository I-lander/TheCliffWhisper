import { CustomScene } from '../customClasses/CustomScene';
import { GameManager, GamePhase } from '../GameManager';
import { PopulationManager } from '../PopulationManager';
import { ConstellationManager } from '../constellations/ConstellationManager';
import { DecorManager } from '../decor/DecorManager';
import { Human } from '../objects/Human';
import { SkillTreeUI } from '../objects/SkillTreeUI';
import { JuiceEffects } from '../objects/JuiceEffects';
import { AbilityUI } from '../abilities/AbilityUI';
import { removeSplashScreen } from '../utils/utils';
import { UIScene } from './UIScene';

const SKY_COLORS: Record<GamePhase, number> = {
  [GamePhase.Night]: 0x0a0a1a,
  [GamePhase.Daytime]: 0x424f66,
  [GamePhase.Sunset]: 0x1a1020,
};

export class MainScene extends CustomScene {
  uiScene!: UIScene;
  gameManager!: GameManager;
  populationManager!: PopulationManager;
  constellationManager!: ConstellationManager;
  decorManager!: DecorManager;
  private skillTreeUI!: SkillTreeUI;
  private abilityUI!: AbilityUI;
  private juiceEffects!: JuiceEffects;
  private decorContainer!: Phaser.GameObjects.Container;
  private endDayBtn!: Phaser.GameObjects.Text;

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

  // Ability timed effects
  private chainJumpActive: boolean = false;
  private soulHarvestActive: boolean = false;
  private savedBirthRate: number = 0;

  // Camera drag
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private camStartX: number = 0;
  private camStartY: number = 0;

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
    );

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
    });

    // Skill tree UI (night phase)
    this.skillTreeUI = new SkillTreeUI(this, this.constellationManager, () => {
      this.gameManager.skipPhase();
    });

    // Ability UI (day phase)
    this.abilityUI = new AbilityUI(
      this,
      () => this.constellationManager.bonuses,
      (id) => this.executeAbility(id),
    );

    // Juice effects
    this.juiceEffects = new JuiceEffects(this);

    this.uiScene = this.scene.get('UIScene') as UIScene;
    this.uiScene.setGameManager(this.gameManager);
    this.uiScene.setPopulationManager(this.populationManager);

    // nightScrollY will be computed dynamically from root position

    // End Day button (visible during Daytime only)
    this.endDayBtn = this.add
      .text(this.canvasWidth / 2, this.tileSize * 0.8, '[ End Day ]', {
        fontSize: `${Math.round(this.tileSize * 0.5)}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setDepth(160)
      .setInteractive({ useHandCursor: true });
    this.endDayBtn.on(Phaser.Input.Events.POINTER_OVER, () => this.endDayBtn.setColor('#ffffff'));
    this.endDayBtn.on(Phaser.Input.Events.POINTER_OUT, () => this.endDayBtn.setColor('#aaccff'));
    this.endDayBtn.on(Phaser.Input.Events.POINTER_DOWN, () => this.gameManager.skipPhase());

    this.gameManager.onPhaseChange((phase) => {
      this.cameras.main.setBackgroundColor(SKY_COLORS[phase]);
      if (phase === GamePhase.Daytime) {
        this.autoClickTimer = 0;
        this.clickCooldownTimer = 0;
        this.chainJumpActive = false;
        this.soulHarvestActive = false;
        this.juiceEffects.resetDaily();
      }
      if (phase === GamePhase.Sunset) {
        this.forceAllTurnBack();
        // Restore birth rate if Silence was active
        if (this.savedBirthRate > 0) {
          this.populationManager.stats.birthRate = this.savedBirthRate;
          this.savedBirthRate = 0;
        }
      }

      // Show skill tree only during night
      const isNight = phase === GamePhase.Night;
      this.skillTreeUI.setVisible(isNight);
      if (isNight) {
        this.skillTreeUI.refresh();
      }

      // Show abilities + end day button during Daytime
      const isDaytime = phase === GamePhase.Daytime;
      this.abilityUI.setVisible(isDaytime);
      this.endDayBtn.setVisible(isDaytime);
      if (isDaytime) {
        this.abilityUI.refresh();
      }

      // Camera pan: night = center on root star, day = back to origin
      if (isNight) {
        const rootPos = this.skillTreeUI.getRootWorldPos();
        this.tweens.add({
          targets: this.cameras.main,
          scrollX: rootPos.x - this.canvasWidth / 2,
          scrollY: rootPos.y - this.canvasHeight / 2,
          duration: 800,
          ease: 'Power2',
        });
      } else {
        this.tweens.add({
          targets: this.cameras.main,
          scrollX: 0,
          scrollY: 0,
          duration: 800,
          ease: 'Power2',
        });
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

    // Click / drag handling
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.runEnded) return;

      if (this.gameManager.getPhase() === GamePhase.Night) {
        // Start drag for camera pan
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.camStartX = this.cameras.main.scrollX;
        this.camStartY = this.cameras.main.scrollY;
        return;
      }

      if (this.gameManager.getPhase() !== GamePhase.Daytime) return;
      if (this.clickCooldownTimer > 0) return;
      this.doSpawn();
      this.clickCooldownTimer = this.populationManager.stats.clickCooldown;
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !pointer.isDown) return;
      const dx = this.dragStartX - pointer.x;
      const dy = this.dragStartY - pointer.y;
      this.cameras.main.scrollX = this.camStartX + dx;
      this.cameras.main.scrollY = this.camStartY + dy;

      // Clamp camera bounds — no peeking below the cliff, constellation extends upward
      const maxScrollY = this.groundY - this.canvasHeight + this.tileSize;
      const minScrollY = -this.canvasHeight * 4;
      const maxScrollX = this.canvasWidth * 0.8;
      const minScrollX = -this.canvasWidth * 0.8;
      this.cameras.main.scrollX = Math.max(minScrollX, Math.min(maxScrollX, this.cameras.main.scrollX));
      this.cameras.main.scrollY = Math.max(minScrollY, Math.min(maxScrollY, this.cameras.main.scrollY));
    });

    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.isDragging = false;
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

  // ── Ability execution ──

  private executeAbility(id: string) {
    switch (id) {
      case 'void_call':
        this.forceAllJump();
        break;
      case 'dark_wave':
        for (let i = 0; i < 8; i++) {
          this.spawnHuman(this.spawnX - i * this.tileSize * 1.5, true);
        }
        break;
      case 'frenzy_pulse': {
        const origSpeed = this.populationManager.stats.walkSpeed;
        this.populationManager.stats.walkSpeed = Math.round(origSpeed * 3);
        this.time.delayedCall(10_000, () => {
          this.populationManager.stats.walkSpeed = origSpeed;
        });
        break;
      }
      case 'chain_of_souls':
        this.chainJumpActive = true;
        this.time.delayedCall(15_000, () => {
          this.chainJumpActive = false;
        });
        break;
      case 'silence':
        this.savedBirthRate = this.populationManager.stats.birthRate;
        this.populationManager.stats.birthRate = 0;
        break;
      case 'soul_harvest':
        this.soulHarvestActive = true;
        this.time.delayedCall(15_000, () => {
          this.soulHarvestActive = false;
        });
        break;
    }
  }

  // ── Decor sprites ──

  private addDecorSprite(frameIndex: number, slotIndex: number, elevated: boolean = false) {
    const scale = this.tileSize / 16;
    const x = slotIndex * this.tileSize;
    const baseY = this.groundY - this.tileSize;
    const y = elevated ? baseY - this.tileSize : baseY;

    // If elevated, draw a 3-tile-wide hill using same sprites as cliff
    if (elevated) {
      const hillX = x - this.tileSize;
      const hillW = this.tileSize * 3;
      const groundFrame = 14 * 16 + 1;  // same as cliff ground surface
      const faceFrame = 15 * 16 + 1;    // same as cliff face
      const hillAlpha = 0.7;

      // Hill body (fill)
      const ground = this.add.graphics();
      ground.fillStyle(0x222222);
      ground.fillRect(hillX, baseY, hillW, this.tileSize);
      this.decorContainer.addAt(ground, 0);

      // Ground surface on top of hill (3 tiles)
      for (let i = 0; i < 3; i++) {
        this.decorContainer.add(
          this.add.image(hillX + i * this.tileSize, baseY - this.tileSize, 'worldElement', groundFrame)
            .setOrigin(0, 0).setScale(scale).setAlpha(hillAlpha),
        );
      }

      // Face tiles on left and right sides of the hill
      this.decorContainer.add(
        this.add.image(hillX, baseY, 'worldElement', faceFrame)
          .setOrigin(0, 0).setScale(scale).setAlpha(hillAlpha),
      );
      this.decorContainer.add(
        this.add.image(hillX + this.tileSize * 2, baseY, 'worldElement', faceFrame)
          .setOrigin(0, 0).setScale(scale).setAlpha(hillAlpha).setFlipX(true),
      );
    }

    const sprite = this.add
      .image(x, y, 'worldElement', frameIndex)
      .setOrigin(0, 0)
      .setScale(scale)
      .setAlpha(0);

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

  // ── Cliff rendering ──

  private drawCliff() {
    const g = this.add.graphics();
    g.fillStyle(0x222222);
    g.fillRect(-this.cliffEdgeX, this.groundY, this.cliffEdgeX * 2 - this.tileSize, this.canvasHeight - this.groundY);

    const scale = this.tileSize / 16;
    const groundFrame = 14 * 16 + 1;
    const faceFrame = 15 * 16 + 1;
    const cornerFrame = 15 * 16 + 2;

    for (let tx = 0; tx < this.cliffEdgeX - this.tileSize; tx += this.tileSize) {
      this.add.image(tx, this.groundY - this.tileSize, 'worldElement', groundFrame)
        .setOrigin(0, 0).setScale(scale);
    }

    this.add.image(this.cliffEdgeX, this.groundY, 'worldElement', cornerFrame)
      .setOrigin(1, 0).setScale(scale);

    for (let ty = this.groundY + this.tileSize; ty < this.canvasHeight; ty += this.tileSize) {
      this.add.image(this.cliffEdgeX, ty, 'worldElement', faceFrame)
        .setOrigin(1, 0).setScale(scale);
    }
  }

  // ── Game loop ──

  update(time: number, delta: number) {
    if (this.runEnded) return;

    this.gameManager.update(delta);
    this.decorManager.update(delta);
    this.juiceEffects.update(delta);
    this.abilityUI.update(delta);

    // Win check
    if (this.populationManager.isExtinct()) {
      this.endRun('victory');
      return;
    }

    // Auto-clicker spawns during Daytime
    if (this.gameManager.getPhase() === GamePhase.Daytime && !this.populationManager.isExtinct()) {
      const autoCount = this.constellationManager.bonuses.autoClickerCount;
      if (autoCount > 0) {
        this.autoClickTimer += delta;
        const interval = this.populationManager.stats.clickCooldown;
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
      const bw = this.tileSize * 4;
      this.cooldownBar.width = bw * progress;
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

  // ── Spawn logic ──

  private doSpawn(overrideX?: number, forceJump = false) {
    if (this.populationManager.population <= 0) return;
    this.spawnHuman(overrideX, forceJump);
    if (this.populationManager.shouldSpawnExtra()) {
      this.spawnHuman(undefined, forceJump);
    }
  }

  private spawnHuman(overrideX?: number, forceJump = false) {
    if (this.populationManager.population <= 0) return;

    const shouldTurnBack = forceJump ? false : this.populationManager.shouldTurnBack();

    const human = new Human(
      this,
      overrideX ?? this.spawnX,
      this.groundY,
      this.cliffEdgeX,
      this.populationManager.stats.walkSpeed,
      shouldTurnBack,
      (jumpX: number, jumpY: number) => {
        this.populationManager.onHumanJumped();
        // Soul gain with multiplier
        const soulGain = Math.floor(this.constellationManager.bonuses.soulMultiplier * (this.soulHarvestActive ? 2 : 1));
        for (let s = 0; s < soulGain; s++) this.constellationManager.onHumanKilled();
        this.juiceEffects.onJump(jumpX, jumpY);

        // Chain of Souls ability
        if (this.chainJumpActive) {
          this.cascadeToNearest(jumpX);
        }
      },
      () => this.populationManager.onHumanTurnedBack(),
    );
    human.setOnFellOff((fx) => {
      this.juiceEffects.spawnSoul(fx, this.canvasHeight);
      this.juiceEffects.onDeath();
    });
    this.humans.push(human);
  }

  // ── Helpers ──

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
