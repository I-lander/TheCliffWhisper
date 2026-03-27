import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { MainScene } from './MainScene';
import { t } from '../i18n/i18n';
import { AudioManager, AUDIO_KEYS } from '../audio/AudioManager';
import { CustomScene } from '../customClasses/CustomScene';
import { createPanelButton, createUIPanel, applyCrtSetting, PanelButton } from '../utils/utils';
import { isSoundEnabled, toggleSound, isCrtEnabled, toggleCrt } from '../Settings';

export class PauseMenuScene extends CustomScene {
  private overlay!: Phaser.GameObjects.Rectangle;
  private audio!: AudioManager;
  private confirmGroup: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('PauseMenuScene');
  }

  create() {
    super.create();
    this.audio = new AudioManager(this);
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const tileSize = h / 18;
    const btnSize = Math.round(tileSize * 0.55);
    const toggleSize = Math.round(tileSize * 0.4);
    const cx = w / 2;
    const cy = h / 2;

    // Dark overlay
    this.overlay = this.add
      .rectangle(0, 0, w, h, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setDepth(0);

    // Title
    this.add
      .text(cx, cy - tileSize * 3, t('pause.title'), {
        fontSize: `${Math.round(tileSize * 1)}px`,
        color: '#ffffff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setDepth(1);

    // Main buttons
    const buttons = [
      { label: t('pause.resume'), action: () => this.resumeGame() },
      { label: t('pause.mainMenu'), action: () => this.showConfirm(() => this.goToMenu()) },
      { label: t('pause.quitGame'), action: () => this.showConfirm(() => this.quitApp()) },
    ];

    buttons.forEach((btn, i) => {
      const pb = createPanelButton(this, cx, cy - tileSize * 0.5 + i * tileSize * 1.5, btn.label, btnSize, { depth: 1 });
      pb.text.on(Phaser.Input.Events.POINTER_OVER, () => { pb.text.setColor('#ffffff'); this.audio.playSfx(AUDIO_KEYS.UI_HOVER, 0.15); });
      pb.text.on(Phaser.Input.Events.POINTER_OUT, () => pb.text.setColor('#aaccff'));
      pb.text.on(Phaser.Input.Events.POINTER_DOWN, () => { this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4); btn.action(); });
    });

    // Toggle buttons (bottom area)
    const toggleY = cy + tileSize * 4;

    // Sound toggle
    const soundLabel = isSoundEnabled() ? t('pause.soundOn') : t('pause.soundOff');
    const soundBtn = createPanelButton(this, cx - tileSize * 3, toggleY, soundLabel, toggleSize, {
      depth: 1,
      color: isSoundEnabled() ? '#aaccff' : '#666688',
    });
    soundBtn.text.on(Phaser.Input.Events.POINTER_OVER, () => soundBtn.text.setColor('#ffffff'));
    soundBtn.text.on(Phaser.Input.Events.POINTER_OUT, () => soundBtn.text.setColor(isSoundEnabled() ? '#aaccff' : '#666688'));
    soundBtn.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      const enabled = toggleSound();
      soundBtn.text.setText(enabled ? t('pause.soundOn') : t('pause.soundOff'));
      soundBtn.text.setColor(enabled ? '#aaccff' : '#666688');
      if (!enabled) {
        this.sound.stopAll();
      }
      this.rebuildTogglePanel(soundBtn, toggleSize);
    });

    // CRT toggle
    const crtLabel = isCrtEnabled() ? t('pause.crtOn') : t('pause.crtOff');
    const crtBtn = createPanelButton(this, cx + tileSize * 3, toggleY, crtLabel, toggleSize, {
      depth: 1,
      color: isCrtEnabled() ? '#aaccff' : '#666688',
    });
    crtBtn.text.on(Phaser.Input.Events.POINTER_OVER, () => crtBtn.text.setColor('#ffffff'));
    crtBtn.text.on(Phaser.Input.Events.POINTER_OUT, () => crtBtn.text.setColor(isCrtEnabled() ? '#aaccff' : '#666688'));
    crtBtn.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      const enabled = toggleCrt();
      crtBtn.text.setText(enabled ? t('pause.crtOn') : t('pause.crtOff'));
      crtBtn.text.setColor(enabled ? '#aaccff' : '#666688');
      applyCrtSetting(this);
      this.rebuildTogglePanel(crtBtn, toggleSize);
    });

    // ESC to resume
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.confirmGroup.length > 0) {
        this.dismissConfirm();
      } else {
        this.resumeGame();
      }
    });
  }

  /** Redraw the panel border after text content changed (width may differ). */
  private rebuildTogglePanel(pb: PanelButton, fontSize: number) {
    const tileSize = this.cameras.main.height / 18;
    const pu = tileSize / 16;
    const padX = tileSize * 0.6;
    const padY = tileSize * 0.25;
    pb.bg.clear();
    const btnW = pb.text.width + padX * 2;
    const btnH = pb.text.height + padY * 2;
    const btnX = pb.text.x - btnW / 2;
    const btnY = pb.text.y - btnH / 2;
    createUIPanel(pb.bg, btnX, btnY, btnW, btnH, pu, 0x4466aa, 0.5);
  }

  private showConfirm(onConfirm: () => void) {
    if (this.confirmGroup.length > 0) return;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const tileSize = h / 18;
    const cx = w / 2;
    const cy = h / 2;
    const smallSize = Math.round(tileSize * 0.45);
    const lineWidth = Math.round(tileSize * 0.06);

    const confirmOverlay = this.add
      .rectangle(0, 0, w, h, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setDepth(10);

    const panelW = tileSize * 10;
    const panelH = tileSize * 5;
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2;
    const panel = this.add.graphics().setDepth(10);
    createUIPanel(panel, panelX, panelY, panelW, panelH, lineWidth, 0x334466, 1, { color: 0x0a0a1a, alpha: 1 });

    const warning = this.add
      .text(cx, cy - tileSize * 1, t('pause.confirmLeave'), {
        fontSize: `${smallSize}px`,
        color: '#ff6666',
        fontFamily: 'PixelSleigh',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(11);

    const yes = createPanelButton(this, cx - tileSize * 2, cy + tileSize * 1, t('menu.yes'), smallSize, { depth: 11 });
    yes.text.on(Phaser.Input.Events.POINTER_OVER, () => yes.text.setColor('#ffffff'));
    yes.text.on(Phaser.Input.Events.POINTER_OUT, () => yes.text.setColor('#aaccff'));
    yes.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audio.playSfx(AUDIO_KEYS.UI_CONFIRM, 0.4);
      this.dismissConfirm();
      onConfirm();
    });

    const no = createPanelButton(this, cx + tileSize * 2, cy + tileSize * 1, t('menu.no'), smallSize, { depth: 11 });
    no.text.on(Phaser.Input.Events.POINTER_OVER, () => no.text.setColor('#ffffff'));
    no.text.on(Phaser.Input.Events.POINTER_OUT, () => no.text.setColor('#aaccff'));
    no.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audio.playSfx(AUDIO_KEYS.UI_CANCEL, 0.4);
      this.dismissConfirm();
    });

    this.confirmGroup = [confirmOverlay, panel, warning, yes.text, yes.bg, no.text, no.bg];
  }

  private dismissConfirm() {
    for (const obj of this.confirmGroup) {
      obj.destroy();
    }
    this.confirmGroup = [];
  }

  private resumeGame() {
    const mainScene = this.scene.get('MainScene') as MainScene;
    mainScene.gameManager.resume();
    this.scene.stop('PauseMenuScene');
    this.scene.resume('MainScene');
    this.scene.resume('UIScene');
  }

  private goToMenu() {
    this.scene.stop('PauseMenuScene');
    this.scene.stop('UIScene');
    this.scene.stop('MainScene');
    this.scene.start('MainMenuScene');
  }

  private quitApp() {
    if (Capacitor.getPlatform() === 'android') {
      App.exitApp();
    } else if (window.electron) {
      window.electron.quitApp();
    }
  }
}
