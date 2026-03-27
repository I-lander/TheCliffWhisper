import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SaveManager } from '../SaveManager';
import {
  removeSplashScreen,
  createUIPanel,
  createPanelButton,
  applyCrtSetting,
  PanelButton,
} from '../utils/utils';
import { t, getLanguage, setLanguage, initLanguage } from '../i18n/i18n';
import { AudioManager, AUDIO_KEYS } from '../audio/AudioManager';
import { CustomScene } from '../customClasses/CustomScene';
import { isSoundEnabled, toggleSound, isCrtEnabled, toggleCrt } from '../Settings';
import { DECOR_CATALOG } from '../decor/DecorData';
import { CliffTilemap } from '../decor/CliffTilemap';
import { CloudManager } from '../objects/CloudManager';
import { createWaveShader } from '../shaders/WaveShader';

// Lightweight menu human — walks back and forth on the cliff
interface MenuHuman {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  direction: 1 | -1;
  state: 'walking' | 'flipping';
  flipProgress: number;
  turnTimer: number;
  walkTime: number;
  baseY: number;
  baseScaleX: number;
}

export class MainMenuScene extends CustomScene {
  private confirmGroup: Phaser.GameObjects.GameObject[] = [];
  private audio!: AudioManager;

  // Background scene elements
  private menuHumans: MenuHuman[] = [];
  private spawnTimer: number = 0;
  private maxMenuHumans: number = 5;
  private cloudManager!: CloudManager;
  private waveShaderObj!: Phaser.GameObjects.Shader;
  private waveElapsed: number = 0;

  // Layout
  private groundY: number = 0;
  private cliffEdgeX: number = 0;
  private ts: number = 0;
  isSplashScreenDone: boolean = false;

  constructor() {
    super('MainMenuScene');
  }

  create() {
    super.create();
    initLanguage();

    if (import.meta.env.VITE_IS_DEV_SPLASH === 'true') {
      document.getElementById('splashScreen')?.remove();
      this.isSplashScreenDone = true;
    } else {
      const splashMinDuration = 3000;
      const splashElapsed = Date.now() - window.splashStartTime;
      const remaining = Math.max(splashMinDuration - splashElapsed, 0);

      this.time.delayedCall(remaining, () => {
        document.getElementById('splashScreen')?.classList.add('fade-out');
        this.isSplashScreenDone = true;
      });
    }

    this.audio = new AudioManager(this);
    this.audio.playMusic(AUDIO_KEYS.MENU_THEME, 0.25);
    removeSplashScreen(this);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const cx = w / 2;
    this.ts = h / 18;
    const scale = this.ts / 16;

    this.groundY = h * 0.4;
    this.cliffEdgeX = w * 0.75;

    // ── Background sky ──
    this.cameras.main.setBackgroundColor(0x424f66);

    // ── Cliff body + edge (same as MainScene.drawCliffEdge) ──
    const cliffDepth = 2;
    const cliffGfx = this.add.graphics().setDepth(cliffDepth);
    cliffGfx.fillStyle(0x222222);
    cliffGfx.fillRect(
      -this.cliffEdgeX,
      this.groundY,
      this.cliffEdgeX * 2 - this.ts,
      h - this.groundY,
    );

    const faceFrame = 15 * 16 + 1;
    const cornerFrame = 15 * 16 + 2;

    // Corner at top-right of cliff
    this.add
      .image(this.cliffEdgeX, this.groundY, 'worldElement', cornerFrame)
      .setOrigin(1, 0)
      .setScale(scale)
      .setDepth(cliffDepth);

    // Vertical face going down
    for (let ty = this.groundY + this.ts; ty < h; ty += this.ts) {
      this.add
        .image(this.cliffEdgeX, ty, 'worldElement', faceFrame)
        .setOrigin(1, 0)
        .setScale(scale)
        .setDepth(cliffDepth);
    }

    // ── Tilemap with hills, decor & grass (same as in-game) ──
    const tilemapCols = Math.floor(this.cliffEdgeX / this.ts) - 1;
    const tilemapRows = 5;
    const tilemapOriginX = 0;
    const tilemapOriginY = this.groundY - (tilemapRows - 1) * this.ts;
    const tilemap = new CliffTilemap(
      this,
      tilemapCols,
      tilemapRows,
      this.ts,
      tilemapOriginX,
      tilemapOriginY,
    );
    tilemap.renderAll();

    // Build some random hills and place decor, mimicking DecorManager logic
    const decorCount = 15 + Math.floor(Math.random() * 5);
    const usedSlots = new Set<number>();
    for (let i = 0; i < decorCount; i++) {
      let slot: number;
      do {
        slot = 1 + Math.floor(Math.random() * (tilemapCols - 2));
      } while (usedSlots.has(slot));
      usedSlots.add(slot);

      // Random elevation: 0 (ground), 1, 2, or 3 levels high
      const rand = Math.random();
      const elevation = rand < 0.45 ? 0 : rand < 0.7 ? 1 : rand < 0.9 ? 2 : 3;
      // Build hill from ground up to target elevation
      for (let e = 1; e <= elevation; e++) {
        const row = tilemapRows - 1 - e;
        for (let dc = -1; dc <= 1; dc++) {
          const c = slot + dc;
          if (c >= 0 && c < tilemapCols) tilemap.setSolid(c, row);
        }
      }

      const def = DECOR_CATALOG[Math.floor(Math.random() * DECOR_CATALOG.length)];
      const topRow = tilemap.getTopSolidRow(slot);
      if (topRow >= 0) {
        tilemap.placeElement(slot, topRow, def.frameIndex, def.id);
      }
    }

    // ── Clouds ──
    this.cloudManager = new CloudManager(this, this.ts);

    // ── Waves ──
    const SPRITE_BASE_UNIT = 16;
    const waveTopY = h * 0.75;
    const waveWorldH = h - waveTopY;
    const waveWorldW = w;
    const waveCenterX = w / 2;
    const waveCenterY = waveTopY + waveWorldH / 2;
    const waveCanvasW = Math.round((waveWorldW / this.ts) * SPRITE_BASE_UNIT);
    const waveCanvasH = Math.round((waveWorldH / this.ts) * SPRITE_BASE_UNIT);
    const wavePixelToWorld = this.ts / SPRITE_BASE_UNIT;
    const waveScale = waveWorldW / waveCanvasW;

    this.waveShaderObj = this.add
      .shader(createWaveShader(), waveCenterX, waveCenterY, waveCanvasW, waveCanvasH)
      .setScale(waveScale)
      .setDepth(5);
    this.waveShaderObj.setUniform('pixelToWorld.value', wavePixelToWorld);
    this.waveShaderObj.setUniform('canvasSizeX.value', waveCanvasW);
    this.waveShaderObj.setUniform('canvasSizeY.value', waveCanvasH);
    this.waveElapsed = 0;

    // ── UI layer (depth 7+) ──
    const titleSize = Math.round(this.ts * 1.4);
    const btnSize = Math.round(this.ts * 0.6);
    const smallBtnSize = Math.round(this.ts * 0.45);

    // Title — above the cliff
    this.add
      .text(cx, this.ts * 1.5, t('menu.title'), {
        fontSize: `${titleSize}px`,
        color: '#ffffff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setAlpha(0.95)
      .setDepth(7);

    // Subtitle
    this.add
      .text(cx, this.ts * 1.5 + titleSize * 0.9, t('menu.subtitle'), {
        fontSize: `${Math.round(this.ts * 0.35)}px`,
        color: '#8899aa',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setAlpha(0.7)
      .setDepth(7);

    // Language toggle (top-right)
    const currentLang = getLanguage();
    const flagScale =
      (this.ts * 1.2) / this.textures.get(`flag_${currentLang}`).getSourceImage().width;
    const langBtn = this.add
      .image(w - this.ts * 0.5, this.ts * 0.5, `flag_${currentLang}`)
      .setOrigin(1, 0)
      .setScale(flagScale)
      .setAlpha(0.7)
      .setDepth(7)
      .setInteractive({ useHandCursor: true });

    langBtn.on(Phaser.Input.Events.POINTER_OVER, () => langBtn.setAlpha(1));
    langBtn.on(Phaser.Input.Events.POINTER_OUT, () => langBtn.setAlpha(0.7));
    langBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4);
      setLanguage(currentLang === 'en' ? 'fr' : 'en');
      this.scene.restart();
    });

    // ── Buttons — below cliff ──
    const hasSave = SaveManager.hasSave();
    const btnZoneTop = this.groundY + this.ts * 2;
    const btnZoneMid = btnZoneTop + this.ts * 1.5;

    if (hasSave) {
      const continueBtn = createPanelButton(this, cx, btnZoneTop, t('menu.continue'), btnSize, {
        depth: 7,
      });
      continueBtn.text.on(Phaser.Input.Events.POINTER_OVER, () => {
        continueBtn.text.setColor('#ffffff');
        this.audio.playSfx(AUDIO_KEYS.UI_HOVER, 0.15);
      });
      continueBtn.text.on(Phaser.Input.Events.POINTER_OUT, () =>
        continueBtn.text.setColor('#aaccff'),
      );
      continueBtn.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4);
        this.startGame(true);
      });

      const ts = SaveManager.getSaveTimestamp();
      if (ts) {
        const date = new Date(ts);
        const dateStr =
          date.toLocaleDateString() +
          ' ' +
          date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.add
          .text(cx, btnZoneTop + this.ts * 0.8, dateStr, {
            fontSize: `${Math.round(this.ts * 0.35)}px`,
            color: '#556688',
            fontFamily: 'PixelSleigh',
          })
          .setOrigin(0.5)
          .setDepth(7);
      }

      const newGame = createPanelButton(
        this,
        cx,
        btnZoneTop + this.ts * 1.8,
        t('menu.newGame'),
        smallBtnSize,
        {
          color: '#666688',
          depth: 7,
        },
      );
      newGame.text.on(Phaser.Input.Events.POINTER_OVER, () => {
        newGame.text.setColor('#ffffff');
        this.audio.playSfx(AUDIO_KEYS.UI_HOVER, 0.15);
      });
      newGame.text.on(Phaser.Input.Events.POINTER_OUT, () => newGame.text.setColor('#666688'));
      newGame.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4);
        this.showNewGameConfirm(cx, btnZoneMid, this.ts);
      });
    } else {
      const newGame = createPanelButton(this, cx, btnZoneTop, t('menu.newGame'), btnSize, {
        depth: 7,
      });
      newGame.text.on(Phaser.Input.Events.POINTER_OVER, () => {
        newGame.text.setColor('#ffffff');
        this.audio.playSfx(AUDIO_KEYS.UI_HOVER, 0.15);
      });
      newGame.text.on(Phaser.Input.Events.POINTER_OUT, () => newGame.text.setColor('#aaccff'));
      newGame.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4);
        this.startGame();
      });
    }

    // Quit button
    const quitY = btnZoneTop + (hasSave ? this.ts * 3 : this.ts * 1.8);
    const quit = createPanelButton(this, cx, quitY, t('menu.quit'), smallBtnSize, {
      color: '#666688',
      depth: 7,
    });
    quit.text.on(Phaser.Input.Events.POINTER_OVER, () => {
      quit.text.setColor('#ff6666');
      this.audio.playSfx(AUDIO_KEYS.UI_HOVER, 0.15);
    });
    quit.text.on(Phaser.Input.Events.POINTER_OUT, () => quit.text.setColor('#666688'));
    quit.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4);
      if (Capacitor.getPlatform() === 'android') {
        App.exitApp();
      } else if (window.electron) {
        window.electron.quitApp();
      }
    });

    // Settings toggles (bottom)
    const toggleSize = Math.round(this.ts * 0.4);
    const toggleY = h - this.ts * 1.5;

    const soundBtn = createPanelButton(
      this,
      cx - this.ts * 3,
      toggleY,
      isSoundEnabled() ? t('pause.soundOn') : t('pause.soundOff'),
      toggleSize,
      {
        color: isSoundEnabled() ? '#aaccff' : '#666688',
        depth: 7,
      },
    );
    soundBtn.text.on(Phaser.Input.Events.POINTER_OVER, () => soundBtn.text.setColor('#ffffff'));
    soundBtn.text.on(Phaser.Input.Events.POINTER_OUT, () =>
      soundBtn.text.setColor(isSoundEnabled() ? '#aaccff' : '#666688'),
    );
    soundBtn.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      const enabled = toggleSound();
      soundBtn.text.setText(enabled ? t('pause.soundOn') : t('pause.soundOff'));
      soundBtn.text.setColor(enabled ? '#aaccff' : '#666688');
      if (!enabled) {
        this.sound.stopAll();
      } else {
        this.audio.playMusic(AUDIO_KEYS.MENU_THEME, 0.25);
      }
      this.rebuildTogglePanel(soundBtn);
    });

    const crtBtn = createPanelButton(
      this,
      cx + this.ts * 3,
      toggleY,
      isCrtEnabled() ? t('pause.crtOn') : t('pause.crtOff'),
      toggleSize,
      {
        color: isCrtEnabled() ? '#aaccff' : '#666688',
        depth: 7,
      },
    );
    crtBtn.text.on(Phaser.Input.Events.POINTER_OVER, () => crtBtn.text.setColor('#ffffff'));
    crtBtn.text.on(Phaser.Input.Events.POINTER_OUT, () =>
      crtBtn.text.setColor(isCrtEnabled() ? '#aaccff' : '#666688'),
    );
    crtBtn.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      const enabled = toggleCrt();
      crtBtn.text.setText(enabled ? t('pause.crtOn') : t('pause.crtOff'));
      crtBtn.text.setColor(enabled ? '#aaccff' : '#666688');
      applyCrtSetting(this);
      this.rebuildTogglePanel(crtBtn);
    });

    // Humans — some already on the cliff, others will spawn off-screen
    this.menuHumans = [];
    this.spawnTimer = 0;
    const initialCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < initialCount; i++) {
      this.spawnMenuHuman(this.ts * 2 + Math.random() * (this.cliffEdgeX - this.ts * 4));
    }
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    // Clouds
    this.cloudManager.update(delta);

    // Waves
    this.waveElapsed += delta;
    this.waveShaderObj.setUniform('elapsedTime.value', this.waveElapsed);

    // Spawn humans off-screen periodically
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && this.menuHumans.length < this.maxMenuHumans) {
      this.spawnMenuHuman();
      this.spawnTimer = 2000 + Math.random() * 4000;
    }

    // Update humans — walk with Paper Mario flip turn
    for (const mh of this.menuHumans) {
      if (mh.state === 'walking') {
        mh.sprite.x += mh.speed * mh.direction * dt;
        mh.walkTime += dt * (10 + mh.speed / 30);
        mh.sprite.y = mh.baseY + Math.sin(mh.walkTime) * 0.8;
        mh.sprite.setRotation(Math.sin(mh.walkTime * 0.5) * 0.08);

        // Random turn or forced at edges
        mh.turnTimer -= delta;
        const atEdge = (mh.direction === 1 && mh.sprite.x >= this.cliffEdgeX - this.ts)
          || (mh.direction === -1 && mh.sprite.x <= this.ts);
        if (mh.turnTimer <= 0 || atEdge) {
          mh.state = 'flipping';
          mh.flipProgress = 0;
          mh.sprite.setRotation(0);
        }
      } else if (mh.state === 'flipping') {
        // Paper Mario style: squeeze scaleX to 0, then expand flipped
        mh.flipProgress += dt * 4;
        if (mh.flipProgress < 1) {
          const s = mh.baseScaleX * (1 - mh.flipProgress);
          mh.sprite.setScale(mh.direction === -1 ? -s : s, Math.abs(mh.sprite.scaleY));
        } else if (mh.flipProgress < 2) {
          const newDir = (mh.direction === 1 ? -1 : 1) as 1 | -1;
          const s = mh.baseScaleX * (mh.flipProgress - 1);
          mh.sprite.setScale(newDir === -1 ? -s : s, Math.abs(mh.sprite.scaleY));
        } else {
          // Done — flip direction and resume walking
          mh.direction = (mh.direction === 1 ? -1 : 1) as 1 | -1;
          mh.sprite.setScale(mh.direction === -1 ? -mh.baseScaleX : mh.baseScaleX, Math.abs(mh.sprite.scaleY));
          mh.state = 'walking';
          mh.turnTimer = 3000 + Math.random() * 6000;
        }
      }
    }
  }

  private spawnMenuHuman(startX?: number) {
    const spriteScale = this.cameras.main.height / 18 / 16;
    const x = startX ?? -this.ts;
    const direction: 1 | -1 = startX != null ? (Math.random() < 0.5 ? 1 : -1) : 1;
    const sprite = this.add
      .image(x, this.groundY, 'human')
      .setScale(direction === -1 ? -spriteScale : spriteScale, spriteScale)
      .setOrigin(0.5, 1)
      .setDepth(60);

    const speed = 30 + Math.random() * 50;
    this.menuHumans.push({
      sprite,
      speed,
      direction,
      state: 'walking',
      flipProgress: 0,
      turnTimer: 3000 + Math.random() * 6000,
      walkTime: Math.random() * Math.PI * 2,
      baseY: this.groundY,
      baseScaleX: spriteScale,
    });
  }

  private rebuildTogglePanel(pb: PanelButton) {
    const pu = this.ts / 16;
    const padX = this.ts * 0.6;
    const padY = this.ts * 0.25;
    pb.bg.clear();
    const btnW = pb.text.width + padX * 2;
    const btnH = pb.text.height + padY * 2;
    const btnX = pb.text.x - btnW / 2;
    const btnY = pb.text.y - btnH / 2;
    createUIPanel(pb.bg, btnX, btnY, btnW, btnH, pu, 0x4466aa, 0.5);
  }

  private showNewGameConfirm(cx: number, cy: number, tileSize: number) {
    if (this.confirmGroup.length > 0) return;

    const smallSize = Math.round(tileSize * 0.5);

    const overlay = this.add
      .rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setDepth(10);

    const panelW = tileSize * 10;
    const panelH = tileSize * 5;
    const panelX = cx - panelW / 2;
    const panelY = cy - tileSize * 0.3 - panelH / 2;
    const lineWidth = Math.round(tileSize * 0.06);
    const panel = this.add.graphics().setDepth(10);
    createUIPanel(panel, panelX, panelY, panelW, panelH, lineWidth, 0x334466, 1, {
      color: 0x0a0a1a,
      alpha: 1,
    });

    const warning = this.add
      .text(cx, cy - tileSize * 1.5, t('menu.confirmLose'), {
        fontSize: `${smallSize}px`,
        color: '#ff6666',
        fontFamily: 'PixelSleigh',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(11);

    const yes = createPanelButton(
      this,
      cx - tileSize * 2,
      cy + tileSize * 0.5,
      t('menu.yes'),
      smallSize,
      { depth: 11 },
    );
    yes.text.on(Phaser.Input.Events.POINTER_OVER, () => yes.text.setColor('#ffffff'));
    yes.text.on(Phaser.Input.Events.POINTER_OUT, () => yes.text.setColor('#aaccff'));
    yes.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audio.playSfx(AUDIO_KEYS.UI_CONFIRM, 0.4);
      SaveManager.deleteSave();
      this.startGame();
    });

    const no = createPanelButton(
      this,
      cx + tileSize * 2,
      cy + tileSize * 0.5,
      t('menu.no'),
      smallSize,
      { depth: 11 },
    );
    no.text.on(Phaser.Input.Events.POINTER_OVER, () => no.text.setColor('#ffffff'));
    no.text.on(Phaser.Input.Events.POINTER_OUT, () => no.text.setColor('#aaccff'));
    no.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audio.playSfx(AUDIO_KEYS.UI_CANCEL, 0.4);
      this.dismissConfirm();
    });

    this.confirmGroup = [overlay, panel, warning, yes.text, yes.bg, no.text, no.bg];
  }

  private dismissConfirm() {
    for (const obj of this.confirmGroup) {
      obj.destroy();
    }
    this.confirmGroup = [];
  }

  private startGame(loadSave = false) {
    this.audio.stopMusic();
    this.cloudManager.destroy();
    this.scene.start('MainScene', { loadSave });
    this.scene.start('UIScene');
    this.scene.bringToTop('UIScene');
  }
}
