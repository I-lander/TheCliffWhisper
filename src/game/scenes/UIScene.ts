import { CustomScene } from '../customClasses/CustomScene';
import { GameManager, GamePhase } from '../GameManager';
import { PopulationManager, STAGNATION_LIMIT_MS } from '../PopulationManager';
import { MainScene } from './MainScene';
import { t } from '../i18n/i18n';
import { AUDIO_KEYS } from '../audio/AudioManager';
import { createPanelButton } from '../utils/utils';
import { isTutoDone, markTutoDone } from '../Settings';

function formatBigNumber(n: number): string {
  return n.toLocaleString();
}

export class UIScene extends CustomScene {
  mainScene!: MainScene;
  private gameManager!: GameManager;
  private populationManager!: PopulationManager;

  // Top-left: day info
  private dayText!: Phaser.GameObjects.Text;

  // Stagnation progress bar (top-center)
  private stagnationBarBg!: Phaser.GameObjects.Rectangle;
  private stagnationBarFill!: Phaser.GameObjects.Rectangle;
  private stagnationBarMaxW: number = 0;

  // Bottom-left: main stats
  private popText!: Phaser.GameObjects.Text;
  private soulsText!: Phaser.GameObjects.Text;

  // Bottom-left: detailed stats panel
  private statsText!: Phaser.GameObjects.Text;

  // Tutorial
  private tutoStep1!: Phaser.GameObjects.Text;
  private tutoStep2!: Phaser.GameObjects.Text;
  private tutoStep1Done: boolean = false;
  private tutoStep2Done: boolean = false;

  constructor() {
    super('UIScene');
  }

  preload() {
    this.mainScene = this.scene.get('MainScene') as MainScene;
  }

  create() {
    super.create();
    this.tileSize = this.mainScene.tileSize;
    this.pixelUnit = this.mainScene.pixelUnit;

    const fontSize = Math.round(this.tileSize * 0.6);
    const smallFontSize = Math.round(this.tileSize * 0.45);
    const padding = this.tileSize * 0.5;
    // Top-left: day + phase
    this.dayText = this.add
      .text(padding, padding, '', {
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontFamily: 'PixelSleigh',
      })
      .setAlpha(0.8);

    // Stagnation bar (top-center, below the End Day button)
    const screenWidth = this.cameras.main.width;
    const barW = this.tileSize * 6;
    const barH = this.tileSize * 0.25;
    const barX = screenWidth / 2 - barW / 2;
    const barY = this.tileSize * 1.8;
    this.stagnationBarMaxW = barW;

    this.stagnationBarBg = this.add
      .rectangle(barX, barY, barW, barH, 0x000000, 0.4)
      .setOrigin(0, 0)
      .setVisible(false);

    this.stagnationBarFill = this.add
      .rectangle(barX, barY, barW, barH, 0xffffff, 0.8)
      .setOrigin(0, 0)
      .setVisible(false);

    // Bottom-left: all stats stacked from bottom up
    const bottomY = this.cameras.main.height - padding;
    const lineHeight = smallFontSize * 1.4;

    // Row 1 (bottom): population
    this.popText = this.add
      .text(padding, bottomY, '', {
        fontSize: `${smallFontSize}px`,
        color: '#ffffff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0, 1)
      .setAlpha(0.9);

    // Row 2: souls
    this.soulsText = this.add
      .text(padding, bottomY - lineHeight, '', {
        fontSize: `${smallFontSize}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0, 1)
      .setAlpha(0.8);

    // Bottom-left: detailed stats panel (above the main stats)
    this.statsText = this.add
      .text(padding, bottomY - lineHeight * 2.5, '', {
        fontSize: `${smallFontSize}px`,
        color: '#666688',
        fontFamily: 'PixelSleigh',
      })
      .setOrigin(0, 1)
      .setAlpha(0.6);

    // Tutorial hints (only on first ever game)
    const showTuto = !isTutoDone();
    const tutoFontSize = Math.round(this.tileSize * 0.45);
    const cx = screenWidth / 2;
    const tutoY = this.cameras.main.height * 0.55;
    this.tutoStep1Done = !showTuto;
    this.tutoStep2Done = !showTuto;

    this.tutoStep1 = this.add
      .text(cx, tutoY, t('tuto.step1'), {
        fontSize: `${tutoFontSize}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(showTuto ? 0.7 : 0)
      .setVisible(showTuto);

    this.tutoStep2 = this.add
      .text(cx, tutoY + tutoFontSize * 1.8, t('tuto.step2'), {
        fontSize: `${tutoFontSize}px`,
        color: '#aaccff',
        fontFamily: 'PixelSleigh',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setVisible(false);

    // Top-right: menu button
    const menuBtnX = screenWidth - padding - smallFontSize * 4;
    const menuBtnY = padding + smallFontSize * 0.5;
    const menu = createPanelButton(this, menuBtnX, menuBtnY, t('hud.menu'), smallFontSize, {
      color: '#666688',
    });
    menu.text.on(Phaser.Input.Events.POINTER_OVER, () => { menu.text.setColor('#aaccff'); this.mainScene.audio.playSfx(AUDIO_KEYS.UI_HOVER, 0.15); });
    menu.text.on(Phaser.Input.Events.POINTER_OUT, () => menu.text.setColor('#666688'));
    menu.text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.mainScene.audio.playSfx(AUDIO_KEYS.UI_CLICK, 0.4);
      this.mainScene.openPauseMenu();
    });
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
    const day = this.gameManager.getDayCount();

    this.dayText.setText(`${t('hud.day')} ${day}`);

    // Stagnation bar: visible during Daytime
    if (phase === GamePhase.Daytime) {
      const remaining = Math.max(0, STAGNATION_LIMIT_MS - this.populationManager.stagnationTimer);
      const ratio = remaining / STAGNATION_LIMIT_MS; // 1 = full (safe), 0 = empty (defeat)

      this.stagnationBarBg.setVisible(true);
      this.stagnationBarFill.setVisible(true);
      this.stagnationBarFill.width = this.stagnationBarMaxW * ratio;

      // Color: white → yellow → red as time runs out
      if (ratio > 0.5) {
        this.stagnationBarFill.setFillStyle(0xffffff, 0.6);
      } else if (ratio > 0.25) {
        this.stagnationBarFill.setFillStyle(0xffcc44, 0.8);
      } else {
        this.stagnationBarFill.setFillStyle(0xff4444, 1);
      }
    } else {
      this.stagnationBarBg.setVisible(false);
      this.stagnationBarFill.setVisible(false);
    }

    // Tutorial logic (first day only)
    if (!this.tutoStep1Done && this.gameManager.getDayCount() === 1) {
      if (this.populationManager.jumped > 0) {
        this.tutoStep1Done = true;
        this.tweens.add({ targets: this.tutoStep1, alpha: 0, duration: 500, onComplete: () => this.tutoStep1.setVisible(false) });
        // Show step 2
        this.tutoStep2.setVisible(true);
        this.tweens.add({ targets: this.tutoStep2, alpha: 0.7, duration: 500 });
      }
    }
    if (!this.tutoStep2Done && this.tutoStep1Done) {
      if (phase !== GamePhase.Daytime || this.gameManager.getDayCount() > 1) {
        this.tutoStep2Done = true;
        markTutoDone();
        this.tweens.add({ targets: this.tutoStep2, alpha: 0, duration: 500, onComplete: () => this.tutoStep2.setVisible(false) });
      }
    }
    // Hide tuto if past day 1
    if (this.gameManager.getDayCount() > 1 && !this.tutoStep1Done) {
      this.tutoStep1Done = true;
      this.tutoStep1.setVisible(false);
    }

    const pop = this.populationManager.population;

    this.popText.setText(`${t('hud.population')}: ${formatBigNumber(pop)}`);

    const souls = this.mainScene.constellationManager.souls;
    this.soulsText.setText(`${t('hud.souls')}: ${formatBigNumber(souls)}`);

    // Bottom-left: detailed stats
    const s = this.populationManager.stats;
    const bonuses = this.mainScene.constellationManager.bonuses;
    const f = (v: number) => v % 1 === 0 ? String(v) : v.toFixed(2);
    const lines = [
      `${t('stats.walkSpeed')}: ${f(s.walkSpeed)}`,
      `${t('stats.turnBackRate')}: ${(this.populationManager.getEffectiveTurnBackRate() * 100).toFixed(2)}%`,
      `${t('stats.dragRate')}: ${(s.dragRate * 100).toFixed(2)}%`,
      `${t('stats.clickCooldown')}: ${(s.clickCooldown / 1000).toFixed(2)}s`,
      `${t('stats.autoClickers')}: ${bonuses.autoClickerCount}`,
      `${t('stats.soulMult')}: x${f(bonuses.soulMultiplier)}`,
      `${t('stats.deathMult')}: x${formatBigNumber(Math.floor(s.deathMultiplier))}`,
      `${t('stats.birthRate')}: +${formatBigNumber(s.birthRate)}/${t('hud.day').toLowerCase()}`,
      `${t('stats.birthPerSec')}: ${f(s.birthratePerSec)}`,
    ];
    this.statsText.setText(lines.join('\n'));
  }
}
