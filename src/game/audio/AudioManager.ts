/**
 * Centralized audio manager for The Cliff Whisperer.
 * Handles SFX playback and looping ambience/music.
 */
export class AudioManager {
  private scene: Phaser.Scene;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private currentMusicKey: string = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Play a one-shot SFX. */
  playSfx(key: string, volume = 0.5, rate = 1) {
    if (!this.scene.cache.audio.exists(key)) return;
    this.scene.sound.play(key, { volume, rate });
  }

  /** Play a one-shot SFX with slight pitch randomization for variety. */
  playSfxRandom(key: string, volume = 0.5, rateMin = 0.9, rateMax = 1.1) {
    const rate = rateMin + Math.random() * (rateMax - rateMin);
    this.playSfx(key, volume, rate);
  }

  /** Start a looping music/ambience track. Stops current if different. */
  playMusic(key: string, volume = 0.3) {
    if (this.currentMusicKey === key && this.currentMusic?.isPlaying) return;
    this.stopMusic();
    if (!this.scene.cache.audio.exists(key)) return;
    this.currentMusic = this.scene.sound.add(key, { loop: true, volume });
    this.currentMusic.play();
    this.currentMusicKey = key;
  }

  /** Stop the current music/ambience. */
  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
      this.currentMusicKey = '';
    }
  }

  /** Crossfade to a new music track. */
  crossfadeTo(key: string, volume = 0.3, duration = 1000) {
    if (this.currentMusicKey === key) return;
    if (this.currentMusic) {
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: 0,
        duration,
        onComplete: () => {
          this.stopMusic();
          this.playMusic(key, volume);
        },
      });
    } else {
      this.playMusic(key, volume);
    }
  }
}

/** All audio asset keys used in the game. */
export const AUDIO_KEYS = {
  // Human actions
  HUMAN_SPAWN: 'human_spawn',
  HUMAN_JUMP: 'human_jump',
  HUMAN_SPLASH: 'human_splash',
  HUMAN_TURNBACK: 'human_turnback',
  SOUL_RISE: 'soul_rise',

  // Abilities
  ABILITY_FRENZY: 'ability_frenzy',
  ABILITY_VOID: 'ability_void',
  ABILITY_DARKWAVE: 'ability_darkwave',
  ABILITY_HARVEST: 'ability_harvest',
  ABILITY_SILENCE: 'ability_silence',

  // Phase transitions
  PHASE_NIGHT: 'phase_night',
  PHASE_DAY: 'phase_day',
  PHASE_SUNSET: 'phase_sunset',

  // Skill tree
  NODE_HOVER: 'node_hover',
  NODE_UNLOCK: 'node_unlock',
  NODE_LOCKED: 'node_locked',

  // UI
  UI_CLICK: 'ui_click',
  UI_HOVER: 'ui_hover',
  UI_CONFIRM: 'ui_confirm',
  UI_CANCEL: 'ui_cancel',
  SAVE_CONFIRM: 'save_confirm',

  // Decorations
  DECO_HOUSE: 'deco_house',
  DECO_CHURCH: 'deco_church',
  DECO_LIGHTHOUSE: 'deco_lighthouse',
  DECO_TREE: 'deco_tree',
  DECO_TOMBSTONE: 'deco_tombstone',
  DECO_WALL: 'deco_wall',

  // Game events
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  POPULATION_BIRTH: 'population_birth',

  // Music / ambience
  AMBIENCE_NIGHT: 'ambience_night',
  AMBIENCE_DAY: 'ambience_day',
  MENU_THEME: 'menu_theme',
} as const;

/** Map ability IDs to their audio keys. */
export const ABILITY_AUDIO: Record<string, string> = {
  frenzy_pulse: AUDIO_KEYS.ABILITY_FRENZY,
  void_call: AUDIO_KEYS.ABILITY_VOID,
  dark_wave: AUDIO_KEYS.ABILITY_DARKWAVE,
  soul_harvest: AUDIO_KEYS.ABILITY_HARVEST,
  silence: AUDIO_KEYS.ABILITY_SILENCE,
};

/** Map decoration IDs to their audio keys. */
export const DECO_AUDIO: Record<string, string> = {
  house: AUDIO_KEYS.DECO_HOUSE,
  church: AUDIO_KEYS.DECO_CHURCH,
  lighthouse: AUDIO_KEYS.DECO_LIGHTHOUSE,
  tree: AUDIO_KEYS.DECO_TREE,
  tombstone: AUDIO_KEYS.DECO_TOMBSTONE,
  wall: AUDIO_KEYS.DECO_WALL,
};
