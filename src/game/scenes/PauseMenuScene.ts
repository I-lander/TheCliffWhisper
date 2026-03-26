import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SaveManager, SaveData } from '../SaveManager';
import { MainScene } from './MainScene';
import { t } from '../i18n/i18n';
import { AudioManager, AUDIO_KEYS } from '../audio/AudioManager';
import { CustomScene } from '../customClasses/CustomScene';

export class PauseMenuScene extends CustomScene {
  private overlay!: Phaser.GameObjects.Rectangle;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private saveStatusText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super('PauseMenuScene');
  }

  create() {
    this.audio = new AudioManager(this);
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const tileSize = h / 18;
    const btnSize = Math.round(tileSize * 0.65);
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

    // Save status (shows feedback after save)
    this.saveStatusText = this.add
      .text(cx, cy + tileSize * 4, '', {
        fontSize: `${Math.round(tileSize * 0.4)}px`,
        color: '#66ff88',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0.5)
      .setDepth(1);

    const buttons = [
      { label: t('pause.resume'), action: () => this.resumeGame() },
      { label: t('pause.save'), action: () => this.saveGame() },
      { label: t('pause.mainMenu'), action: () => this.saveAndGoToMenu() },
      { label: t('pause.quitGame'), action: () => this.saveAndQuitApp() },
    ];

    buttons.forEach((btn, i) => {
      const text = this.add
        .text(cx, cy - tileSize * 0.5 + i * tileSize * 1.5, btn.label, {
          fontSize: `${btnSize}px`,
          color: '#aaccff',
          fontFamily: 'PixelSleigh',
        })
        .setOrigin(0.5)
        .setDepth(1)
        .setInteractive({ useHandCursor: true });

      text.on(Phaser.Input.Events.POINTER_OVER, () => { text.setColor('#ffffff'); this.audio.playSfx(AUDIO_KEYS.UI_HOVER, 0.15); });
      text.on(Phaser.Input.Events.POINTER_OUT, () => text.setColor('#aaccff'));
      text.on(Phaser.Input.Events.POINTER_DOWN, () => { this.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4); btn.action(); });
      this.menuItems.push(text);
    });

    // ESC to resume
    this.input.keyboard?.on('keydown-ESC', () => {
      this.resumeGame();
    });
  }

  private buildSaveData(): SaveData {
    const mainScene = this.scene.get('MainScene') as MainScene;
    const gm = mainScene.gameManager;
    const pm = mainScene.populationManager;
    const cm = mainScene.constellationManager;

    return {
      version: 1,
      timestamp: Date.now(),
      currentPhase: gm.getPhase(),
      phaseElapsed: gm.getPhaseElapsed(),
      dayCount: gm.getDayCount(),
      population: pm.population,
      jumped: pm.jumped,
      turnedBack: pm.turnedBack,
      born: pm.born,
      stats: { ...pm.stats },
      souls: cm.souls,
      unlockedNodes: Array.from(cm.unlockedNodes),
      bonuses: JSON.parse(JSON.stringify(cm.bonuses)),
    };
  }

  private saveGame() {
    const data = this.buildSaveData();
    SaveManager.save(data);
    this.audio.playSfx(AUDIO_KEYS.SAVE_CONFIRM, 0.4);
    this.saveStatusText.setText(t('pause.saved'));
    this.time.delayedCall(2000, () => {
      this.saveStatusText.setText('');
    });
  }

  private resumeGame() {
    const mainScene = this.scene.get('MainScene') as MainScene;
    mainScene.gameManager.resume();
    this.scene.stop('PauseMenuScene');
    this.scene.resume('MainScene');
    this.scene.resume('UIScene');
  }

  private saveAndGoToMenu() {
    const data = this.buildSaveData();
    SaveManager.save(data);
    this.scene.stop('PauseMenuScene');
    this.scene.stop('UIScene');
    this.scene.stop('MainScene');
    this.scene.start('MainMenuScene');
  }

  private saveAndQuitApp() {
    const data = this.buildSaveData();
    SaveManager.save(data);
    if (Capacitor.getPlatform() === 'android') {
      App.exitApp();
    } else if (window.electron) {
      window.electron.quitApp();
    }
  }
}
