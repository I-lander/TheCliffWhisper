import CrtShader from '../shaders/CrtShader';
import { applyCrtToScene } from '../utils/utils';

export class CustomScene extends Phaser.Scene {
  crtShader!: CrtShader;
  tileSize!: number;
  pixelUnit!: number;

  constructor(key: string) {
    super(key);
  }

  create() {
    applyCrtToScene(this);
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
    const pixelUnit = this.pixelUnit ?? 1;
    const direction = Math.random() < 0.5 ? -1 : 1;
    const offset = pixelUnit * intensity * direction;

    // Apply to ALL active scenes that have a CRT shader
    this.scene.manager.scenes.forEach((s) => {
      const cs = s as CustomScene;
      if (cs.crtShader && s.scene.isActive()) {
        cs.crtShader.dynamicOffsetX += offset;
        cs.tweens.add({
          targets: cs.crtShader,
          dynamicOffsetX: 0,
          duration,
          ease: 'Quad.easeOut',
        });
      }
    });

    this.cameras.main.shake(duration / 2, 0.002);
  }
}
