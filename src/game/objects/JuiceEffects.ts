export class JuiceEffects {
  private scene: Phaser.Scene;
  private flashOverlay!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const cam = scene.cameras.main;

    // Flash overlay
    this.flashOverlay = scene.add.rectangle(
      cam.width / 2, cam.height / 2, cam.width, cam.height, 0xffffff
    ).setAlpha(0).setDepth(200);
  }

  onJump(x: number, y: number) {
    this.spawnJumpParticles(x, y);
    this.scene.cameras.main.shake(60, 0.002);
  }

  onCardPlayed(tier: string) {
    let flashAlpha = 0.1;
    let shakeDuration = 100;
    let shakeIntensity = 0.005;
    let flashColor = 0xffffff;

    switch (tier) {
      case 'common':
        flashAlpha = 0.08;
        shakeDuration = 80;
        shakeIntensity = 0.003;
        flashColor = 0xcccccc;
        break;
      case 'uncommon':
        flashAlpha = 0.15;
        shakeDuration = 120;
        shakeIntensity = 0.008;
        flashColor = 0xaa44ff;
        break;
      case 'rare':
        flashAlpha = 0.25;
        shakeDuration = 200;
        shakeIntensity = 0.015;
        flashColor = 0xff4444;
        break;
      case 'legendary':
        flashAlpha = 0.4;
        shakeDuration = 300;
        shakeIntensity = 0.025;
        flashColor = 0xffaa00;
        break;
    }

    this.flashOverlay.setFillStyle(flashColor);
    this.flashOverlay.setAlpha(flashAlpha);
    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: shakeDuration * 2,
      ease: 'Power2',
    });

    this.scene.cameras.main.shake(shakeDuration, shakeIntensity);
  }

  onPenalty() {
    this.flashOverlay.setFillStyle(0xff0000);
    this.flashOverlay.setAlpha(0.3);
    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
    });
    this.scene.cameras.main.shake(200, 0.01);
  }

  resetDaily() {}

  update(_delta: number) {}

  private spawnJumpParticles(x: number, y: number) {
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const particle = this.scene.add.circle(
        x, y,
        1 + Math.random() * 2,
        0xffffff,
        0.8
      ).setDepth(40);

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 50 + Math.random() * 100;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + vx * 0.5,
        y: particle.y + vy * 0.5,
        alpha: 0,
        scale: 0.2,
        duration: 300 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }
}
