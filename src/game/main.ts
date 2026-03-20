import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { UIScene } from './scenes/UIScene';
import { LoadingScene } from './scenes/LoadingScene';
import { EndRunScene } from './scenes/EndRunScene';

export function initPhaserGame() {
  window.splashStartTime = Date.now();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL,
    width: 2560,
    height: 1440,
    backgroundColor: 'rgba(10, 10, 26, 1)',
    antialias: false,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      zoom: 1,
    },
    disableContextMenu: true,
    parent: 'game-container',
    scene: [LoadingScene, MainScene, UIScene, EndRunScene],
    powerPreference: 'high-performance',
    autoMobilePipeline: true,
    fps: {
      target: 60,
      forceSetTimeOut: false,
    },
  };

  new Phaser.Game(config);
}
