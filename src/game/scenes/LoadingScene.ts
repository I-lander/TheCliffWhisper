export class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' });
  }

  preload() {
    this.load.image('human', './assets/images/human.png');
    this.load.spritesheet('tileset', './assets/images/tileset.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('worldElement', './assets/images/worldElement.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('soul', './assets/images/soul.png');
    this.load.image('star', './assets/images/star.png');
    this.load.image('flag_en', './assets/images/en.png');
    this.load.image('flag_fr', './assets/images/fr.png');

    // Fire-and-forget font loading (non-blocking, compatible Capacitor)
    document.fonts.load('16px "PixelSleigh"').then(() => {});
  }

  async create() {
    this.scene.start('MainMenuScene');
  }
}
