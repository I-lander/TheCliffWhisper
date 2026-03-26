import { CustomScene } from '../customClasses/CustomScene';
import { GameManager } from '../GameManager';
import { PopulationManager } from '../PopulationManager';
import { MainScene } from './MainScene';
import { t } from '../i18n/i18n';

export class UIScene extends CustomScene {
  mainScene!: MainScene;
  private gameManager!: GameManager;
  private populationManager!: PopulationManager;

  // Top-left: phase info
  private phaseText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;

  // Bottom-left: main stats
  private popText!: Phaser.GameObjects.Text;
  private soulsText!: Phaser.GameObjects.Text;

  // Bottom-left: detailed stats panel
  private statsText!: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  preload() {
    this.mainScene = this.scene.get('MainScene') as MainScene;
  }

  create() {
    this.tileSize = this.mainScene.tileSize;
    this.pixelUnit = this.mainScene.pixelUnit;

    const fontSize = Math.round(this.tileSize * 0.6);
    const smallFontSize = Math.round(this.tileSize * 0.45);
    const padding = this.tileSize * 0.5;
    // Top-left: day + phase + timer
    this.dayText = this.add
      .text(padding, padding, '', {
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontFamily: 'PixelSleigh',
      })
      .setAlpha(0.8);

    this.phaseText = this.add
      .text(padding, padding + fontSize * 1.2, '', {
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontFamily: 'PixelSleigh',
      })
      .setAlpha(0.8);

    this.timerText = this.add
      .text(padding, padding + fontSize * 2.4, '', {
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontFamily: 'PixelSleigh',
      })
      .setAlpha(0.6);

    // Bottom-left: all stats stacked from bottom up
    const bottomY = this.cameras.main.height - padding;
    const lineHeight = smallFontSize * 1.4;

    // Row 1 (bottom): population
    this.popText = this.add
      .text(padding, bottomY, '', {
        fontSize: `${smallFontSize}px`,
        color: '#ffffff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0, 1)
      .setAlpha(0.9);

    // Row 2: souls
    this.soulsText = this.add
      .text(padding, bottomY - lineHeight, '', {
        fontSize: `${smallFontSize}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0, 1)
      .setAlpha(0.8);

    // Bottom-left: detailed stats panel (above the main stats)
    this.statsText = this.add
      .text(padding, bottomY - lineHeight * 2.5, '', {
        fontSize: `${smallFontSize}px`,
        color: '#666688',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0, 1)
      .setAlpha(0.6);

    // Top-right: menu button
    const screenWidth = this.cameras.main.width;
    const menuBtn = this.add
      .text(screenWidth - padding, padding, t('hud.menu'), {
        fontSize: `${smallFontSize}px`,
        color: '#666688',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(1, 0)
      .setAlpha(0.8)
      .setInteractive({ useHandCursor: true });

    menuBtn.on(Phaser.Input.Events.POINTER_OVER, () => menuBtn.setColor('#aaccff'));
    menuBtn.on(Phaser.Input.Events.POINTER_OUT, () => menuBtn.setColor('#666688'));
    menuBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.mainScene.openPauseMenu();
    });
  }

  setGameManager(gm: GameManager) {
    this.gameManager = gm;
  }

  setPopulationManager(pm: PopulationManager) {
    this.populationManager = pm;
  }

  update() {
    if (!this.gameManager || !this.populationManager) return;

    const phase = this.gameManager.getPhase();
    const day = this.gameManager.getDayCount();

    this.dayText.setText(`${t('hud.day')} ${day}`);
    this.phaseText.setText(t(`phase.${phase}`));
    this.timerText.setText('');

    const pop = this.populationManager.population;

    this.popText.setText(`${t('hud.population')}: ${pop.toLocaleString()}`);

    const souls = this.mainScene.constellationManager.souls;
    this.soulsText.setText(`${t('hud.souls')}: ${souls}`);

    // Bottom-left: detailed stats
    const s = this.populationManager.stats;
    const bonuses = this.mainScene.constellationManager.bonuses;
    const lines = [
      `${t('stats.walkSpeed')}: ${s.walkSpeed}`,
      `${t('stats.turnBackRate')}: ${Math.round(s.turnBackRate * 100)}%`,
      `${t('stats.dragRate')}: ${Math.round(s.dragRate * 100)}%`,
      `${t('stats.clickCooldown')}: ${(s.clickCooldown / 1000).toFixed(1)}s`,
      `${t('stats.autoClickers')}: ${bonuses.autoClickerCount}`,
      `${t('stats.soulMult')}: x${bonuses.soulMultiplier}`,
      `${t('stats.birthRate')}: +${s.birthRate}/${t('hud.day').toLowerCase()}`,
      `${t('stats.birthPerSec')}: ${s.birthratePerSec}`,
    ];
    this.statsText.setText(lines.join('\n'));
  }
}
