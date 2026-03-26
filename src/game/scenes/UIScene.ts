import { CustomScene } from '../customClasses/CustomScene';
import { GameManager } from '../GameManager';
import { PopulationManager } from '../PopulationManager';
import { MainScene } from './MainScene';

export class UIScene extends CustomScene {
  mainScene!: MainScene;
  private gameManager!: GameManager;
  private populationManager!: PopulationManager;

  // Top-left: phase info
  private phaseText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;

  // Top-right: population info
  private popText!: Phaser.GameObjects.Text;
  private birthRateText!: Phaser.GameObjects.Text;

  // Bottom-left: daily stats + souls
  private dailyStatsText!: Phaser.GameObjects.Text;
  private soulsText!: Phaser.GameObjects.Text;

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
    const screenWidth = this.cameras.main.width;

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

    // Top-right: population + birth rate
    this.popText = this.add
      .text(screenWidth - padding, padding, '', {
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontFamily: 'PixelSleigh',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setAlpha(0.9);

    this.birthRateText = this.add
      .text(screenWidth - padding, padding + fontSize * 1.2, '', {
        fontSize: `${smallFontSize}px`,
        color: '#ff6666',
        fontFamily: 'PixelSleigh',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setAlpha(0.7);

    // Bottom-left: daily stats
    this.dailyStatsText = this.add
      .text(padding, this.cameras.main.height - padding, '', {
        fontSize: `${smallFontSize}px`,
        color: '#aaaaaa',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0, 1)
      .setAlpha(0.6);

    // Bottom-left: souls counter (above daily stats)
    this.soulsText = this.add
      .text(padding, this.cameras.main.height - padding - smallFontSize * 1.5, '', {
        fontSize: `${smallFontSize}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0, 1)
      .setAlpha(0.8);
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

    this.dayText.setText(`Day ${day}`);
    this.phaseText.setText(phase);
    this.timerText.setText('');

    const pop = this.populationManager.population;
    const birthRate = this.populationManager.getCurrentBirthRate();
    const dayDuration = this.gameManager.getDaytimeDuration();
    const autoCount = this.mainScene.constellationManager.bonuses.autoClickerCount;
    const maxKills = this.populationManager.getMaxKillsPerDay(dayDuration, autoCount);

    this.popText.setText(`Population: ${pop.toLocaleString()}`);
    this.birthRateText.setText(`+${birthRate}/day`);

    const { jumped, turnedBack } = this.populationManager;
    this.dailyStatsText.setText(`Jumped: ${jumped}  Turned back: ${turnedBack}`);

    const souls = this.mainScene.constellationManager.souls;
    this.soulsText.setText(`Souls: ${souls}`);
  }
}
