import CrtShader from '../shaders/CrtShader';

export class CustomScene extends Phaser.Scene {
  crtShader!: CrtShader;
  tileSize!: number;
  pixelUnit!: number;

  constructor(key: string) {
    super(key);
  }

  create() {
    this.time.delayedCall(1000, () => {
      this.scale.refresh();
    });
  }

  updateShader() {
    if (this.crtShader) {
      this.crtShader.dynamicOffsetX = 0;
      this.crtShader.screenWidth = this.sys.canvas.width;
      this.crtShader.screenHeight = this.sys.canvas.height;
    }
  }

  shakeScreen(duration: number = 100, intensity: number = 1) {
    if (!this.crtShader) {
      return;
    }

    const pixelUnit = this.pixelUnit ?? 1;

    const direction = Math.random() < 0.5 ? -1 : 1;
    this.crtShader.dynamicOffsetX += pixelUnit * intensity * direction;
    this.cameras.main.shake(duration / 2, 0.002);
    this.tweens.add({
      targets: this.crtShader,
      dynamicOffsetX: 0,
      duration: duration,
      ease: 'Quad.easeOut',
    });
  }
}
