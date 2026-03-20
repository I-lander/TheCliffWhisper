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
  }

  async create() {
    this.scene.start('MainScene');
    this.scene.start('UIScene');
    this.scene.bringToTop('UIScene');
  }
}
