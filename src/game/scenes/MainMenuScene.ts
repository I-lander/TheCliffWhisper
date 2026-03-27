import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SaveManager } from '../SaveManager';
import { removeSplashScreen, createUIPanel, createPanelButton } from '../utils/utils';
import { t, getLanguage, setLanguage, initLanguage } from '../i18n/i18n';
import { AudioManager, AUDIO_KEYS } from '../audio/AudioManager';
import { CustomScene } from '../customClasses/CustomScene';

export class MainMenuScene extends CustomScene {
  private confirmGroup: Phaser.GameObjects.GameObject[] = [];
  private audio!: AudioManager;

  constructor() {
    super('MainMenuScene');
  }

  create() {
    initLanguage();
    this.audio = new AudioManager(this);
    this.audio.playMusic(AUDIO_KEYS.MENU_THEME, 0.25);
    removeSplashScreen(this);
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const tileSize = this.cameras.main.height / 18;
    const titleSize = Math.round(tileSize * 1.4);
    const btnSize = Math.round(tileSize * 0.6);

    this.cameras.main.setBackgroundColor(0x050510);

    // Title
    this.add
      .text(cx, cy - tileSize * 4, t('menu.title'), {
        fontSize: `${titleSize}px`,
        color: '#ffffff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setAlpha(0.9);

    // Language toggle button (top-right)
    const currentLang = getLanguage();
    const flagScale = (tileSize * 1.2) / this.textures.get(`flag_${currentLang}`).getSourceImage().width;
    const langBtn = this.add
      .image(this.cameras.main.width - tileSize * 0.5, tileSize * 0.5, `flag_${currentLang}`)
      .setOrigin(1, 0)
      .setScale(flagScale)
      .setAlpha(0.7)
      .setInteractive({ useHandCursor: true });

    langBtn.on(Phaser.Input.Events.POINTER_OVER, () => langBtn.setAlpha(1));
    langBtn.on(Phaser.Input.Events.POINTER_OUT, () => langBtn.setAlpha(0.7));
    langBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4);
      setLanguage(currentLang === 'en' ? 'fr' : 'en');
      this.scene.restart();
    });

    // New Game button
    const newGame = createPanelButton(this, cx, cy + tileSize * 0.5, t('menu.newGame'), btnSize);
    newGame.text.on(Phaser.Input.Events.POINTER_OVER, () => { newGame.text.setColor('#ffffff'); this.audio.playSfx(AUDIO_KEYS.UI_HOVER, 0.15); });
    newGame.text.on(Phaser.Input.Events.POINTER_OUT, () => newGame.text.setColor('#aaccff'));
    newGame.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4);
      if (SaveManager.hasSave()) {
        this.showNewGameConfirm(cx, cy, tileSize);
      } else {
        this.startGame();
      }
    });

    // Continue button
    const hasSave = SaveManager.hasSave();
    const continueBtn = createPanelButton(this, cx, cy + tileSize * 2, t('menu.continue'), btnSize, {
      color: hasSave ? '#aaccff' : '#333344',
      panelAlpha: hasSave ? 0.5 : 0.15,
    });

    if (hasSave) {
      continueBtn.text.on(Phaser.Input.Events.POINTER_OVER, () => { continueBtn.text.setColor('#ffffff'); this.audio.playSfx(AUDIO_KEYS.UI_HOVER, 0.15); });
      continueBtn.text.on(Phaser.Input.Events.POINTER_OUT, () => continueBtn.text.setColor('#aaccff'));
      continueBtn.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4);
        this.startGame(true);
      });

      const ts = SaveManager.getSaveTimestamp();
      if (ts) {
        const date = new Date(ts);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.add
          .text(cx, cy + tileSize * 2.8, dateStr, {
            fontSize: `${Math.round(tileSize * 0.35)}px`,
            color: '#444466',
            fontFamily: 'PixelSleigh',
          })
          .setOrigin(0.5);
      }
    } else {
      continueBtn.text.disableInteractive();
    }

    // Quit button
    const quit = createPanelButton(this, cx, cy + tileSize * 3.5, t('menu.quit'), btnSize, {
      color: '#666688',
    });
    quit.text.on(Phaser.Input.Events.POINTER_OVER, () => { quit.text.setColor('#ff6666'); this.audio.playSfx(AUDIO_KEYS.UI_HOVER, 0.15); });
    quit.text.on(Phaser.Input.Events.POINTER_OUT, () => quit.text.setColor('#666688'));
    quit.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4);
      if (Capacitor.getPlatform() === 'android') {
        App.exitApp();
      } else if (window.electron) {
        window.electron.quitApp();
      }
    });
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
    createUIPanel(panel, panelX, panelY, panelW, panelH, lineWidth, 0x334466, 1, { color: 0x0a0a1a, alpha: 1 });

    const warning = this.add
      .text(cx, cy - tileSize * 1.5, t('menu.confirmLose'), {
        fontSize: `${smallSize}px`,
        color: '#ff6666',
        fontFamily: 'PixelSleigh',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(11);

    const yes = createPanelButton(this, cx - tileSize * 2, cy + tileSize * 0.5, t('menu.yes'), smallSize, { depth: 11 });
    yes.text.on(Phaser.Input.Events.POINTER_OVER, () => yes.text.setColor('#ffffff'));
    yes.text.on(Phaser.Input.Events.POINTER_OUT, () => yes.text.setColor('#aaccff'));
    yes.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audio.playSfx(AUDIO_KEYS.UI_CONFIRM, 0.4);
      SaveManager.deleteSave();
      this.startGame();
    });

    const no = createPanelButton(this, cx + tileSize * 2, cy + tileSize * 0.5, t('menu.no'), smallSize, { depth: 11 });
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
    this.scene.start('MainScene', { loadSave });
    this.scene.start('UIScene');
    this.scene.bringToTop('UIScene');
  }
}
