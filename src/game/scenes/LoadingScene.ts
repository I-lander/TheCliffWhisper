import { AUDIO_KEYS } from '../audio/AudioManager';

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

    // Audio: SFX
    const sfxPath = './assets/audio/sfx/';
    const sfxKeys = [
      AUDIO_KEYS.HUMAN_SPAWN, AUDIO_KEYS.HUMAN_JUMP,
      AUDIO_KEYS.HUMAN_TURNBACK, AUDIO_KEYS.SOUL_RISE, AUDIO_KEYS.HUMAN_SPLASH,
      AUDIO_KEYS.ABILITY_FRENZY, AUDIO_KEYS.ABILITY_VOID,
      AUDIO_KEYS.ABILITY_DARKWAVE, AUDIO_KEYS.ABILITY_HARVEST,
      AUDIO_KEYS.ABILITY_SILENCE,
      AUDIO_KEYS.PHASE_NIGHT, AUDIO_KEYS.PHASE_DAY, AUDIO_KEYS.PHASE_SUNSET,
      AUDIO_KEYS.NODE_HOVER, AUDIO_KEYS.NODE_UNLOCK, AUDIO_KEYS.NODE_LOCKED,
      AUDIO_KEYS.UI_CLICK, AUDIO_KEYS.UI_HOVER, AUDIO_KEYS.UI_CONFIRM,
      AUDIO_KEYS.UI_CANCEL, AUDIO_KEYS.SAVE_CONFIRM,
      AUDIO_KEYS.DECO_HOUSE, AUDIO_KEYS.DECO_CHURCH, AUDIO_KEYS.DECO_LIGHTHOUSE,
      AUDIO_KEYS.DECO_TREE, AUDIO_KEYS.DECO_TOMBSTONE, AUDIO_KEYS.DECO_WALL,
      AUDIO_KEYS.VICTORY, AUDIO_KEYS.DEFEAT, AUDIO_KEYS.POPULATION_BIRTH,
    ];
    for (const key of sfxKeys) {
      this.load.audio(key, `${sfxPath}${key}.wav`);
    }

    // Audio: Music / Ambience
    const musicPath = './assets/audio/music/';
    const musicKeys = [
      AUDIO_KEYS.AMBIENCE_NIGHT, AUDIO_KEYS.AMBIENCE_DAY, AUDIO_KEYS.MENU_THEME,
    ];
    for (const key of musicKeys) {
      this.load.audio(key, `${musicPath}${key}.wav`);
    }

    // Fire-and-forget font loading (non-blocking, compatible Capacitor)
    document.fonts.load('16px "PixelSleigh"').then(() => {});
  }

  async create() {
    this.scene.start('MainMenuScene');
  }
}
