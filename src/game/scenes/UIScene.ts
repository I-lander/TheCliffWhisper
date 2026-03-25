import { CustomScene } from '../customClasses/CustomScene';
import { GameManager, GamePhase } from '../GameManager';
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

  // Top-right: defeat threshold
  private thresholdText!: Phaser.GameObjects.Text;

  // Bottom-left: daily stats + souls
  private dailyStatsText!: Phaser.GameObjects.Text;
  private soulsText!: Phaser.GameObjects.Text;

  // Top-center: day progress bar
  private progressBarBg!: Phaser.GameObjects.Graphics;
  private progressBarFill!: Phaser.GameObjects.Graphics;
  private progressBarWidth: number = 0;
  private progressBarHeight: number = 0;
  private progressBarX: number = 0;
  private progressBarY: number = 0;


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
        fontFamily: 'monospace',
      })
      .setAlpha(0.8);

    this.phaseText = this.add
      .text(padding, padding + fontSize * 1.2, '', {
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setAlpha(0.8);

    this.timerText = this.add
      .text(padding, padding + fontSize * 2.4, '', {
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setAlpha(0.6);

    // Top-right: population + birth rate
    this.popText = this.add
      .text(screenWidth - padding, padding, '', {
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontFamily: 'monospace',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setAlpha(0.9);

    this.birthRateText = this.add
      .text(screenWidth - padding, padding + fontSize * 1.2, '', {
        fontSize: `${smallFontSize}px`,
        color: '#ff6666',
        fontFamily: 'monospace',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setAlpha(0.7);

    // Top-right: defeat threshold
    this.thresholdText = this.add
      .text(screenWidth - padding, padding + fontSize * 2.4, '', {
        fontSize: `${smallFontSize}px`,
        color: '#ff4444',
        fontFamily: 'monospace',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setAlpha(0.5);

    // Bottom-left: daily stats
    this.dailyStatsText = this.add
      .text(padding, this.cameras.main.height - padding, '', {
        fontSize: `${smallFontSize}px`,
        color: '#aaaaaa',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 1)
      .setAlpha(0.6);

    // Bottom-left: souls counter (above daily stats)
    this.soulsText = this.add
      .text(padding, this.cameras.main.height - padding - smallFontSize * 1.5, '', {
        fontSize: `${smallFontSize}px`,
        color: '#aaccff',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 1)
      .setAlpha(0.8);

    // Top-center: day progress bar
    this.progressBarWidth = screenWidth * 0.3;
    this.progressBarHeight = Math.round(this.tileSize * 0.25);
    this.progressBarX = (screenWidth - this.progressBarWidth) / 2;
    this.progressBarY = padding;
    this.progressBarBg = this.add.graphics();
    this.progressBarBg.fillStyle(0x333344, 0.5);
    this.progressBarBg.fillRoundedRect(
      this.progressBarX,
      this.progressBarY,
      this.progressBarWidth,
      this.progressBarHeight,
      3,
    );
    this.progressBarFill = this.add.graphics();

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
    const remaining = Math.ceil(this.gameManager.getPhaseRemaining() / 1000);
    const day = this.gameManager.getDayCount();

    this.dayText.setText(`Day ${day}`);
    this.phaseText.setText(phase);
    this.timerText.setText(phase === GamePhase.Daytime ? '' : `${remaining}s`);

    const pop = this.populationManager.population;
    const birthRate = this.populationManager.getCurrentBirthRate();
    const dayDuration = this.gameManager.getDaytimeDuration();
    const autoCount = this.mainScene.constellationManager.bonuses.autoClickerCount;
    const maxKills = this.populationManager.getMaxKillsPerDay(dayDuration, autoCount);

    this.popText.setText(`Population: ${pop.toLocaleString()}`);
    this.birthRateText.setText(`+${birthRate}/day`);
    if (autoCount > 0) {
      this.thresholdText.setText(`Defeat threshold: ${maxKills}/day`).setAlpha(0.5);
    } else {
      this.thresholdText.setText('Click to spawn humans').setAlpha(0.35);
    }

    const { jumped, turnedBack } = this.populationManager;
    this.dailyStatsText.setText(`Jumped: ${jumped}  Turned back: ${turnedBack}`);

    const souls = this.mainScene.constellationManager.souls;
    this.soulsText.setText(`Souls: ${souls}`);

    // Progress bar — visible only during Daytime
    this.progressBarFill.clear();
    if (phase === GamePhase.Daytime) {
      this.progressBarBg.setAlpha(1);
      const duration = this.gameManager.getPhaseDuration();
      const elapsed = this.gameManager.getPhaseElapsed();
      const progress = Math.min(1, elapsed / duration);
      const fillWidth = this.progressBarWidth * progress;

      // Color shifts from white to orange to red as day ends
      let color = 0xccccdd;
      if (progress > 0.7) color = 0xffaa44;
      if (progress > 0.9) color = 0xff4444;

      this.progressBarFill.fillStyle(color, 0.8);
      this.progressBarFill.fillRoundedRect(
        this.progressBarX,
        this.progressBarY,
        fillWidth,
        this.progressBarHeight,
        3,
      );
    } else {
      this.progressBarBg.setAlpha(0);
    }

  }
}
