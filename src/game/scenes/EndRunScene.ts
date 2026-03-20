export type EndRunResult = 'victory' | 'defeat';

export class EndRunScene extends Phaser.Scene {
  private result!: EndRunResult;
  private dayCount!: number;
  private finalPopulation!: number;

  constructor() {
    super('EndRunScene');
  }

  init(data: { result: EndRunResult; dayCount: number; population: number }) {
    this.result = data.result;
    this.dayCount = data.dayCount;
    this.finalPopulation = data.population;
  }

  create() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const tileSize = this.cameras.main.height / 18;
    const titleSize = Math.round(tileSize * 1.2);
    const bodySize = Math.round(tileSize * 0.6);

    this.cameras.main.setBackgroundColor(0x050510);

    // Title
    const title = this.result === 'victory' ? 'Silence.' : 'They endure.';
    const titleColor = this.result === 'victory' ? '#ffffff' : '#ff4444';

    this.add.text(cx, cy - tileSize * 2, title, {
      fontSize: `${titleSize}px`,
      color: titleColor,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Stats
    const statsLines = this.result === 'victory'
      ? `Extinction achieved in ${this.dayCount} days.`
      : `Population: ${this.finalPopulation.toLocaleString()}\nThe birth rate could no longer be overcome.`;

    this.add.text(cx, cy, statsLines, {
      fontSize: `${bodySize}px`,
      color: '#888888',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);

    // Restart prompt
    this.add.text(cx, cy + tileSize * 3, 'Click to try again', {
      fontSize: `${bodySize}px`,
      color: '#555555',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.stop('EndRunScene');
      this.scene.stop('UIScene');
      this.scene.stop('MainScene');
      this.scene.start('MainScene');
      this.scene.start('UIScene');
      this.scene.bringToTop('UIScene');
    });
  }
}
