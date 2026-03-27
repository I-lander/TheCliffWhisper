import { CustomScene } from '../customClasses/CustomScene';
import { GameManager, GamePhase } from '../GameManager';
import { PopulationManager } from '../PopulationManager';
import { ConstellationManager } from '../constellations/ConstellationManager';
import { DecorManager } from '../decor/DecorManager';
import { CliffTilemap } from '../decor/CliffTilemap';
import { Human } from '../objects/Human';
import { SkillTreeUI } from '../objects/SkillTreeUI';
import { JuiceEffects } from '../objects/JuiceEffects';
import { AbilityUI } from '../abilities/AbilityUI';
import { UIScene } from './UIScene';
import { SaveManager } from '../SaveManager';
import { t } from '../i18n/i18n';
import { AudioManager, AUDIO_KEYS, ABILITY_AUDIO, DECO_AUDIO } from '../audio/AudioManager';
import { createUIPanel } from '../utils/utils';
import { CloudManager } from '../objects/CloudManager';
import { createWaveShader } from '../shaders/WaveShader';

const SKY_COLORS: Record<GamePhase, { r: number; g: number; b: number }> = {
  [GamePhase.Night]: { r: 0x0a, g: 0x0a, b: 0x1a },
  [GamePhase.Daytime]: { r: 0x42, g: 0x4f, b: 0x66 },
  [GamePhase.Sunset]: { r: 0x1a, g: 0x10, b: 0x20 },
};

export class MainScene extends CustomScene {
  uiScene!: UIScene;
  gameManager!: GameManager;
  populationManager!: PopulationManager;
  constellationManager!: ConstellationManager;
  decorManager!: DecorManager;
  private cliffTilemap!: CliffTilemap;
  private skillTreeUI!: SkillTreeUI;
  private abilityUI!: AbilityUI;
  private juiceEffects!: JuiceEffects;
  private endDayBtn!: Phaser.GameObjects.Text;
  private endDayBtnBg!: Phaser.GameObjects.Graphics;
  private waveShaderObj!: Phaser.GameObjects.Shader;
  private waveElapsed: number = 0;
  private waveTopY: number = 0;
  private waveCanvasW: number = 0;
  private waveCanvasH: number = 0;
  private waveWorldH: number = 0;
  private wavePixelToWorld: number = 0;

  canvasWidth: number = 0;
  canvasHeight: number = 0;
  tileSize: number = 0;

  // Sky color transition (initialized in create() from current phase)
  private skyColor = { r: 0, g: 0, b: 0 };

  // Cliff geometry
  private cliffEdgeX: number = 0;
  private groundY: number = 0;
  private spawnX: number = 0;

  // Humans
  private humans: Human[] = [];
  private firstHumanSpawned: boolean = false;
  private autoClickTimer: number = 0;
  private runEnded: boolean = false;

  // Click cooldown
  private clickCooldownTimer: number = 0;
  private cooldownBar!: Phaser.GameObjects.Rectangle;
  private cooldownBarBg!: Phaser.GameObjects.Rectangle;

  // Ability timed effects
  private soulHarvestActive: boolean = false;
  private savedBirthratePerSec: number = 0;

  // Camera drag
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private camStartX: number = 0;
  private camStartY: number = 0;

  private loadSave: boolean = false;
  audio!: AudioManager;
  private cloudManager!: CloudManager;

  constructor() {
    super('MainScene');
  }

  init(data?: { loadSave?: boolean }) {
    this.loadSave = data?.loadSave ?? false;

    // Cleanup previous run
    if (this.cloudManager) this.cloudManager.destroy();

    // Reset all runtime state for a fresh game
    this.humans = [];
    this.firstHumanSpawned = false;
    this.autoClickTimer = 0;
    this.runEnded = false;
    this.clickCooldownTimer = 0;
    this.soulHarvestActive = false;
    this.savedBirthratePerSec = 0;
    this.isDragging = false;
    this.waveElapsed = 0;
    // Reset camera scroll from potential night constellation view
    if (this.cameras?.main) {
      this.cameras.main.scrollX = 0;
      this.cameras.main.scrollY = 0;
    }
  }

  create() {
    super.create();

    this.canvasHeight = this.cameras.main.height;
    this.canvasWidth = this.cameras.main.width;
    this.tileSize = this.canvasHeight / 18;
    this.pixelUnit = this.tileSize / 16;

    // Cliff layout
    this.groundY = this.canvasHeight * 0.4;
    this.cliffEdgeX = this.canvasWidth * 0.75;
    this.spawnX = -this.tileSize;

    // Tilemap: cols = cliff width in tiles (minus margin), rows = max hill height + 1 ground
    const tilemapCols = Math.floor(this.cliffEdgeX / this.tileSize) - 1;
    const tilemapRows = 5; // 1 ground + up to 4 levels of hills
    const tilemapOriginX = 0;
    const tilemapOriginY = this.groundY - (tilemapRows - 1) * this.tileSize;
    this.cliffTilemap = new CliffTilemap(
      this,
      tilemapCols,
      tilemapRows,
      this.tileSize,
      tilemapOriginX,
      tilemapOriginY,
    );
    this.cliffTilemap.renderAll();
    this.drawCliffEdge();

    // Managers
    this.gameManager = new GameManager();
    this.populationManager = new PopulationManager(this.gameManager);

    this.constellationManager = new ConstellationManager(this.populationManager.stats);

    // Decor system
    this.decorManager = new DecorManager(
      this.cliffEdgeX,
      this.tileSize,
      this.populationManager.stats,
      this.gameManager,
    );

    this.decorManager.setOnDecorPlaced((placed) => {
      const decoSound = DECO_AUDIO[placed.def.id];
      if (decoSound) this.audio.playSfx(decoSound, 0.35);
      // For elevated decor, make the hill columns solid first
      if (placed.elevation > 0) {
        const row = this.cliffTilemap.rows - 1 - placed.elevation;
        // Make 3 tiles solid (center + left + right) to form the hill
        for (let dc = -1; dc <= 1; dc++) {
          const c = placed.slotIndex + dc;
          if (c >= 0 && c < this.cliffTilemap.cols) {
            this.cliffTilemap.setSolid(c, row);
          }
        }
      }
      // Place the decor element on top of the solid cell
      const topRow = this.cliffTilemap.getTopSolidRow(placed.slotIndex);
      if (topRow >= 0) {
        this.cliffTilemap.placeElement(
          placed.slotIndex,
          topRow,
          placed.def.frameIndex,
          placed.def.id,
        );
      }
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

    // Clouds
    this.cloudManager = new CloudManager(this, this.tileSize);

    // Waves at the bottom of the screen (below the cliff body)
    const SPRITE_BASE_UNIT = 16;
    this.waveTopY = this.canvasHeight * 0.75;
    const waveWorldW = this.canvasWidth;
    this.waveWorldH = this.canvasHeight - this.waveTopY;
    const waveCenterX = this.canvasWidth / 2;
    const waveCenterY = this.waveTopY + this.waveWorldH / 2;
    this.waveCanvasW = Math.round((waveWorldW / this.tileSize) * SPRITE_BASE_UNIT);
    this.waveCanvasH = Math.round((this.waveWorldH / this.tileSize) * SPRITE_BASE_UNIT);
    this.wavePixelToWorld = this.tileSize / SPRITE_BASE_UNIT;
    const waveScale = waveWorldW / this.waveCanvasW;

    this.waveShaderObj = this.add
      .shader(createWaveShader(), waveCenterX, waveCenterY, this.waveCanvasW, this.waveCanvasH)
      .setScale(waveScale)
      .setDepth(100);

    this.waveShaderObj.setUniform('pixelToWorld.value', this.wavePixelToWorld);
    this.waveShaderObj.setUniform('canvasSizeX.value', this.waveCanvasW);
    this.waveShaderObj.setUniform('canvasSizeY.value', this.waveCanvasH);

    // Audio
    this.audio = new AudioManager(this);
    this.audio.playMusic(AUDIO_KEYS.AMBIENCE_DAY, 0.2);

    this.uiScene = this.scene.get('UIScene') as UIScene;
    this.uiScene.setGameManager(this.gameManager);
    this.uiScene.setPopulationManager(this.populationManager);

    // nightScrollY will be computed dynamically from root position

    // End Day button with panel (visible during Daytime only)
    const endDayFontSize = Math.round(this.tileSize * 0.5);
    const endDayPadX = this.tileSize * 0.6;
    const endDayPadY = this.tileSize * 0.25;
    const lineWidth = this.pixelUnit;

    this.endDayBtn = this.add
      .text(this.canvasWidth / 2, this.tileSize * 0.8, t('game.endDay'), {
        fontSize: `${endDayFontSize}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setDepth(161)
      .setInteractive({ useHandCursor: true });

    this.endDayBtnBg = this.add.graphics().setDepth(160);
    const btnW = this.endDayBtn.width + endDayPadX * 2;
    const btnH = this.endDayBtn.height + endDayPadY * 2;
    const btnX = this.canvasWidth / 2 - btnW / 2;
    const btnY = this.tileSize * 0.8 - btnH / 2;
    createUIPanel(this.endDayBtnBg, btnX, btnY, btnW, btnH, lineWidth, 0xaaccff, 0.5);

    this.endDayBtn.on(Phaser.Input.Events.POINTER_OVER, () => this.endDayBtn.setColor('#ffffff'));
    this.endDayBtn.on(Phaser.Input.Events.POINTER_OUT, () => this.endDayBtn.setColor('#aaccff'));
    this.endDayBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4);
      this.gameManager.skipPhase();
    });

    // Set initial sky color from current game phase
    const initialSky = SKY_COLORS[this.gameManager.getPhase()];
    this.skyColor.r = initialSky.r;
    this.skyColor.g = initialSky.g;
    this.skyColor.b = initialSky.b;
    this.cameras.main.setBackgroundColor(
      Phaser.Display.Color.GetColor(initialSky.r, initialSky.g, initialSky.b),
    );

    this.gameManager.onPhaseChange((phase) => {
      this.transitionSkyColor(SKY_COLORS[phase]);
      // Phase transition audio + clouds
      this.cloudManager.setPhase(phase);
      if (phase === GamePhase.Night) {
        this.audio.playSfx(AUDIO_KEYS.PHASE_NIGHT, 0.4);
        this.audio.crossfadeTo(AUDIO_KEYS.AMBIENCE_NIGHT, 0.2);
      } else if (phase === GamePhase.Daytime) {
        this.audio.playSfx(AUDIO_KEYS.PHASE_DAY, 0.4);
        this.audio.crossfadeTo(AUDIO_KEYS.AMBIENCE_DAY, 0.2);
      } else if (phase === GamePhase.Sunset) {
        this.audio.playSfx(AUDIO_KEYS.PHASE_SUNSET, 0.35);
        this.audio.playSfx(AUDIO_KEYS.POPULATION_BIRTH, 0.3);
      }
      if (phase === GamePhase.Daytime) {
        this.autoClickTimer = 0;
        this.clickCooldownTimer = 0;
        this.soulHarvestActive = false;
        this.juiceEffects.resetDaily();
        this.autoSave(); // Save at end of night
      }
      if (phase === GamePhase.Sunset) {
        this.autoSave(); // Save at end of day
        this.forceAllTurnBack();
        // Restore birthratePerSec if Silence was active
        if (this.savedBirthratePerSec > 0) {
          this.populationManager.stats.birthratePerSec = this.savedBirthratePerSec;
          this.savedBirthratePerSec = 0;
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
      this.endDayBtnBg.setVisible(isDaytime);
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
    const barHeight = this.pixelUnit;
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

      // Ignore clicks on interactive UI elements (buttons, hit zones) in any scene
      if (this.isPointerOverUI(pointer)) return;

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
      this.cameras.main.scrollX = Math.max(
        minScrollX,
        Math.min(maxScrollX, this.cameras.main.scrollX),
      );
      this.cameras.main.scrollY = Math.max(
        minScrollY,
        Math.min(maxScrollY, this.cameras.main.scrollY),
      );
    });

    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.isDragging = false;
    });

    // Debug shortcuts (Space = skip phase, F = fast-forward 10s)
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.runEnded) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        this.openPauseMenu();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        this.gameManager.skipPhase();
      }
      if (e.code === 'KeyF') {
        this.gameManager.update(10_000);
      }
      if (e.code === 'KeyD') {
        this.decorManager.forceSpawn(1);
      }
    });

    // Load saved state if requested
    if (this.loadSave) {
      this.applySaveData();
      this.autoSave();
    }
  }

  // ── Ability execution ──

  private executeAbility(id: string) {
    const abilitySound = ABILITY_AUDIO[id];
    if (abilitySound) this.audio.playSfx(abilitySound, 0.5);
    const bonuses = this.constellationManager.bonuses;
    switch (id) {
      case 'void_call': {
        const origTurnBack = this.populationManager.stats.turnBackRate;
        this.populationManager.stats.turnBackRate = 0;
        this.time.delayedCall(bonuses.voidCall.duration, () => {
          this.populationManager.stats.turnBackRate = origTurnBack;
        });
        break;
      }
      case 'dark_wave': {
        const count = bonuses.darkWave.count;
        for (let i = 0; i < count; i++) {
          this.spawnHuman(this.spawnX - i * this.tileSize * 1.5);
        }
        break;
      }
      case 'frenzy_pulse': {
        const origSpeed = this.populationManager.stats.walkSpeed;
        this.populationManager.stats.walkSpeed = Math.round(
          origSpeed * bonuses.frenzyPulse.multiplier,
        );
        this.time.delayedCall(bonuses.frenzyPulse.duration, () => {
          this.populationManager.stats.walkSpeed = origSpeed;
        });
        break;
      }
      case 'silence':
        this.savedBirthratePerSec = this.populationManager.stats.birthratePerSec;
        this.populationManager.stats.birthratePerSec = 0;
        this.time.delayedCall(bonuses.silence.duration, () => {
          if (this.populationManager.stats.birthratePerSec === 0) {
            this.populationManager.stats.birthratePerSec = this.savedBirthratePerSec;
          }
          this.savedBirthratePerSec = 0;
        });
        break;
      case 'soul_harvest':
        this.soulHarvestActive = true;
        this.time.delayedCall(bonuses.soulHarvest.duration, () => {
          this.soulHarvestActive = false;
        });
        break;
    }
  }

  // ── Cliff rendering ──

  /** Draw the cliff body fill + the vertical right edge (not managed by tilemap). */
  private drawCliffEdge() {
    const cliffDepth = 110;
    const g = this.add.graphics();
    g.fillStyle(0x222222);
    g.fillRect(
      -this.cliffEdgeX,
      this.groundY,
      this.cliffEdgeX * 2 - this.tileSize,
      this.canvasHeight - this.groundY,
    );
    g.setDepth(cliffDepth);

    const scale = this.tileSize / 16;
    const faceFrame = 15 * 16 + 1;
    const cornerFrame = 15 * 16 + 2;

    // Corner at top-right of cliff
    this.add
      .image(this.cliffEdgeX, this.groundY, 'worldElement', cornerFrame)
      .setOrigin(1, 0)
      .setScale(scale)
      .setDepth(cliffDepth);

    // Vertical face going down
    for (let ty = this.groundY + this.tileSize; ty < this.canvasHeight; ty += this.tileSize) {
      this.add
        .image(this.cliffEdgeX, ty, 'worldElement', faceFrame)
        .setOrigin(1, 0)
        .setScale(scale)
        .setDepth(cliffDepth);
    }
  }

  // ── Game loop ──

  update(time: number, delta: number) {
    if (this.runEnded) return;

    this.gameManager.update(delta);
    this.decorManager.update(delta);
    this.juiceEffects.update(delta);
    this.cloudManager.update(delta);
    this.waveElapsed += delta;
    this.waveShaderObj.setUniform('elapsedTime.value', this.waveElapsed);
    this.abilityUI.update(delta);

    // Win check
    if (this.populationManager.isExtinct()) {
      this.endRun('victory');
      return;
    }

    // Stagnation check: defeat if no human jumped for too long during Daytime
    if (this.gameManager.getPhase() === GamePhase.Daytime) {
      if (this.firstHumanSpawned) {
        this.populationManager.updateStagnation(delta);
      }
      if (this.populationManager.isStagnant()) {
        this.endRun('defeat');
        return;
      }
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

  /** Check if the pointer is over an interactive game object in any active scene. */
  private isPointerOverUI(pointer: Phaser.Input.Pointer): boolean {
    for (const scene of this.game.scene.getScenes(true)) {
      const hits = scene.input.hitTestPointer(pointer);
      if (hits.length > 0) return true;
    }
    return false;
  }

  // ── Spawn logic ──

  private doSpawn(overrideX?: number, forceJump = false) {
    if (this.populationManager.population <= 0) return;
    this.spawnHuman(overrideX, forceJump);
  }

  private spawnHuman(overrideX?: number, forceJump = false) {
    if (this.populationManager.population <= 0) return;

    const isFirst = !this.firstHumanSpawned;
    if (isFirst) this.firstHumanSpawned = true;
    const shouldTurnBack = forceJump || isFirst ? false : this.populationManager.shouldTurnBack();

    const human = new Human(
      this,
      overrideX ?? this.spawnX,
      this.groundY,
      this.cliffEdgeX,
      this.populationManager.stats.walkSpeed,
      shouldTurnBack,
      (jumpX: number, jumpY: number) => {
        this.populationManager.onHumanJumped();
        this.audio.playSfxRandom(AUDIO_KEYS.HUMAN_JUMP, 0.4);
        // Soul gain: deathMultiplier × soulMultiplier × soul harvest if active
        const kills = Math.floor(this.populationManager.stats.deathMultiplier);
        const soulHarvestMult = this.soulHarvestActive
          ? this.constellationManager.bonuses.soulHarvest.multiplier
          : 1;
        const soulGain = Math.floor(
          kills * this.constellationManager.bonuses.soulMultiplier * soulHarvestMult,
        );
        this.constellationManager.souls += soulGain;
        this.juiceEffects.onJump(jumpX, jumpY);
      },
      () => {
        this.populationManager.onHumanTurnedBack();
        this.audio.playSfxRandom(AUDIO_KEYS.HUMAN_TURNBACK, 0.3);
      },
    );

    this.humans.push(human);
  }

  // ── Helpers ──

  private forceAllJump() {
    const walking = this.humans.filter((h) => h.isWalking());
    for (const human of walking) {
      human.forceJump();
    }
  }

  private forceAllTurnBack() {
    for (const human of this.humans) {
      human.forceTurnBack();
    }
  }

  /**
   * Compute the world Y of the first wave line at a given world X,
   * replicating the GLSL sine calculation from WaveShader.
   */
  getFirstWaveWorldY(worldX: number): number {
    // Convert worldX to shader canvas space
    const canvasX = (worldX / this.canvasWidth) * this.waveCanvasW;
    const shaderWorldX = canvasX * this.wavePixelToWorld;

    // Shader constants (must match WaveShader.ts)
    const SPACING = 16;
    const BASE_AMPLITUDE = 2.4;
    const SPEED = 0.001;

    // First wave line (waveIndex = 0)
    const wi = 0;
    const baseY = SPACING * (wi + 0.5);
    const phaseOffset = wi * 2.3;
    const frequencyA = 0.006 + (wi % 3) * 0.002;
    const frequencyB = 0.015 + (wi % 5) * 0.003;
    const amplitudeVariation = 0.7 + (wi % 4) * 0.2;

    const primary = Math.sin(shaderWorldX * frequencyA + this.waveElapsed * SPEED + phaseOffset);
    const secondary =
      Math.sin(shaderWorldX * frequencyB - this.waveElapsed * SPEED * 0.6 + phaseOffset * 0.7) *
      0.4;
    const shaderY = baseY + (primary + secondary) * BASE_AMPLITUDE * amplitudeVariation;

    // Convert shader canvas Y → world Y
    return this.waveTopY + (shaderY / this.waveCanvasH) * this.waveWorldH;
  }

  private transitionSkyColor(target: { r: number; g: number; b: number }, duration = 2000) {
    this.tweens.add({
      targets: this.skyColor,
      r: target.r,
      g: target.g,
      b: target.b,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const r = Math.round(this.skyColor.r);
        const g = Math.round(this.skyColor.g);
        const b = Math.round(this.skyColor.b);
        this.cameras.main.setBackgroundColor(Phaser.Display.Color.GetColor(r, g, b));
      },
    });
  }

  private endRun(result: 'victory' | 'defeat') {
    this.runEnded = true;
    this.gameManager.pause();
    this.audio.stopMusic();
    this.audio.playSfx(result === 'victory' ? AUDIO_KEYS.VICTORY : AUDIO_KEYS.DEFEAT, 0.5);
    SaveManager.deleteSave();
    this.scene.launch('EndRunScene', {
      result,
      dayCount: this.gameManager.getDayCount(),
      population: this.populationManager.population,
    });
  }

  openPauseMenu() {
    if (this.scene.isActive('PauseMenuScene')) return;
    this.gameManager.pause();
    this.scene.pause('MainScene');
    this.scene.pause('UIScene');
    this.scene.launch('PauseMenuScene');
    this.scene.bringToTop('PauseMenuScene');
  }

  private autoSave() {
    SaveManager.save({
      version: 1,
      timestamp: Date.now(),
      currentPhase: this.gameManager.getPhase(),
      phaseElapsed: this.gameManager.getPhaseElapsed(),
      dayCount: this.gameManager.getDayCount(),
      population: this.populationManager.population,
      jumped: this.populationManager.jumped,
      turnedBack: this.populationManager.turnedBack,
      born: this.populationManager.born,
      stats: { ...this.populationManager.stats },
      souls: this.constellationManager.souls,
      unlockedNodes: Array.from(this.constellationManager.unlockedNodes),
      bonuses: JSON.parse(JSON.stringify(this.constellationManager.bonuses)),
    });
  }

  private applySaveData() {
    const data = SaveManager.load();
    if (!data) return;

    // Restore GameManager state
    this.gameManager.restoreState(data.currentPhase, data.phaseElapsed, data.dayCount);

    // Restore PopulationManager state
    this.populationManager.population = data.population;
    this.populationManager.jumped = data.jumped;
    this.populationManager.turnedBack = data.turnedBack;
    this.populationManager.born = data.born;
    Object.assign(this.populationManager.stats, data.stats);

    // Restore ConstellationManager state
    this.constellationManager.souls = data.souls;
    this.constellationManager.unlockedNodes = new Set(data.unlockedNodes);
    this.constellationManager.bonuses = JSON.parse(JSON.stringify(data.bonuses));

    // Refresh ability bar if abilities are unlocked
    const isDaytime = data.currentPhase === GamePhase.Daytime;
    if (this.constellationManager.bonuses.abilities.length > 0) {
      this.abilityUI.refresh();
      this.abilityUI.setVisible(isDaytime);
    }
  }
}
