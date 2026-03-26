import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SaveManager } from '../SaveManager';
import { removeSplashScreen, createUIPanel } from '../utils/utils';
import { t, getLanguage, setLanguage, initLanguage } from '../i18n/i18n';

export class MainMenuScene extends Phaser.Scene {
  private continueBtn!: Phaser.GameObjects.Text;
  private confirmGroup: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('MainMenuScene');
  }

  create() {
    initLanguage();
    removeSplashScreen(this);
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const tileSize = this.cameras.main.height / 18;
    const titleSize = Math.round(tileSize * 1.4);
    const btnSize = Math.round(tileSize * 0.7);

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

    // Subtitle
    this.add
      .text(cx, cy - tileSize * 2.5, t('menu.subtitle'), {
        fontSize: `${Math.round(tileSize * 0.45)}px`,
        color: '#666688',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5);

    // Language toggle button (top-right)
    const langBtn = this.add
      .text(this.cameras.main.width - tileSize * 0.5, tileSize * 0.5, t('menu.language'), {
        fontSize: `${Math.round(tileSize * 0.5)}px`,
        color: '#666688',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    langBtn.on(Phaser.Input.Events.POINTER_OVER, () => langBtn.setColor('#aaccff'));
    langBtn.on(Phaser.Input.Events.POINTER_OUT, () => langBtn.setColor('#666688'));
    langBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      setLanguage(getLanguage() === 'en' ? 'fr' : 'en');
      this.scene.restart();
    });

    // New Game button
    const newGameBtn = this.add
      .text(cx, cy + tileSize * 0.5, t('menu.newGame'), {
        fontSize: `${btnSize}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    newGameBtn.on(Phaser.Input.Events.POINTER_OVER, () => newGameBtn.setColor('#ffffff'));
    newGameBtn.on(Phaser.Input.Events.POINTER_OUT, () => newGameBtn.setColor('#aaccff'));
    newGameBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (SaveManager.hasSave()) {
        this.showNewGameConfirm(cx, cy, tileSize);
      } else {
        this.startGame();
      }
    });

    // Continue button (only if save exists)
    const hasSave = SaveManager.hasSave();

    this.continueBtn = this.add
      .text(cx, cy + tileSize * 2, t('menu.continue'), {
        fontSize: `${btnSize}px`,
        color: hasSave ? '#aaccff' : '#333344',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5);

    if (hasSave) {
      this.continueBtn.setInteractive({ useHandCursor: true });
      this.continueBtn.on(Phaser.Input.Events.POINTER_OVER, () => this.continueBtn.setColor('#ffffff'));
      this.continueBtn.on(Phaser.Input.Events.POINTER_OUT, () => this.continueBtn.setColor('#aaccff'));
      this.continueBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.startGame(true);
      });

      // Show save date
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
    }

    // Quit button
    const quitBtn = this.add
      .text(cx, cy + tileSize * 4, t('menu.quit'), {
        fontSize: `${btnSize}px`,
        color: '#666688',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    quitBtn.on(Phaser.Input.Events.POINTER_OVER, () => quitBtn.setColor('#ff6666'));
    quitBtn.on(Phaser.Input.Events.POINTER_OUT, () => quitBtn.setColor('#666688'));
    quitBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
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

    const yesBtn = this.add
      .text(cx - tileSize * 2, cy + tileSize * 0.5, t('menu.yes'), {
        fontSize: `${smallSize}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setInteractive({ useHandCursor: true });

    yesBtn.on(Phaser.Input.Events.POINTER_OVER, () => yesBtn.setColor('#ffffff'));
    yesBtn.on(Phaser.Input.Events.POINTER_OUT, () => yesBtn.setColor('#aaccff'));
    yesBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      SaveManager.deleteSave();
      this.startGame();
    });

    const noBtn = this.add
      .text(cx + tileSize * 2, cy + tileSize * 0.5, t('menu.no'), {
        fontSize: `${smallSize}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setInteractive({ useHandCursor: true });

    noBtn.on(Phaser.Input.Events.POINTER_OVER, () => noBtn.setColor('#ffffff'));
    noBtn.on(Phaser.Input.Events.POINTER_OUT, () => noBtn.setColor('#aaccff'));
    noBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.dismissConfirm();
    });

    this.confirmGroup = [overlay, panel, warning, yesBtn, noBtn];
  }

  private dismissConfirm() {
    for (const obj of this.confirmGroup) {
      obj.destroy();
    }
    this.confirmGroup = [];
  }

  private startGame(loadSave = false) {
    this.scene.start('MainScene', { loadSave });
    this.scene.start('UIScene');
    this.scene.bringToTop('UIScene');
  }
}
