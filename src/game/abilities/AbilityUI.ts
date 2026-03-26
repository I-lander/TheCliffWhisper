import { ABILITIES, AbilityDef } from './AbilityData';
import { ConstellationBonuses } from '../constellations/ConstellationData';
import { createUIPanel } from '../utils/utils';
import { t } from '../i18n/i18n';

interface AbilityButton {
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  cdOverlay: Phaser.GameObjects.Graphics;
  cdText: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  w: number;
  h: number;
}

export class AbilityUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private cooldowns: Map<string, number> = new Map();
  private buttons: Map<string, AbilityButton> = new Map();
  private getBonuses: () => ConstellationBonuses;
  private onActivate: (id: string) => void;

  // Tooltip
  private tooltipContainer: Phaser.GameObjects.Container;
  private tooltipGfx!: Phaser.GameObjects.Graphics;
  private tooltipText!: Phaser.GameObjects.Text;
  private pressedAbilityId: string | null = null;

  constructor(
    scene: Phaser.Scene,
    getBonuses: () => ConstellationBonuses,
    onActivate: (id: string) => void,
  ) {
    this.scene = scene;
    this.getBonuses = getBonuses;
    this.onActivate = onActivate;
    this.container = scene.add.container(0, 0).setDepth(160);
    this.tooltipContainer = scene.add.container(0, 0).setDepth(170).setVisible(false);
    this.initTooltip();
    this.setVisible(false);
  }

  private initTooltip() {
    const tileSize = this.scene.cameras.main.height / 18;
    const fontSize = Math.round(tileSize * 0.3);

    this.tooltipGfx = this.scene.add.graphics();
    this.tooltipText = this.scene.add.text(0, 0, '', {
      fontSize: `${fontSize}px`,
      color: '#ccccdd',
      fontFamily: 'PixelSleigh',
      align: 'center',
      wordWrap: { width: tileSize * 6 },
    }).setOrigin(0.5, 1);

    this.tooltipContainer.add([this.tooltipGfx, this.tooltipText]);
  }

  setVisible(visible: boolean) {
    this.container.setVisible(visible);
    if (!visible) this.hideTooltip();
  }

  refresh() {
    this.container.removeAll(true);
    this.buttons.clear();
    this.hideTooltip();

    const bonuses = this.getBonuses();
    const unlocked = ABILITIES.filter((a) => bonuses.abilities.includes(a.id));
    if (unlocked.length === 0) return;

    const cam = this.scene.cameras.main;
    const tileSize = cam.height / 18;
    const btnW = tileSize * 3.5;
    const btnH = tileSize * 1.2;
    const gap = tileSize * 0.4;
    const totalW = unlocked.length * (btnW + gap) - gap;
    let startX = (cam.width - totalW) / 2;
    const y = cam.height - tileSize * 3;

    unlocked.forEach((def) => {
      this.createButton(def, startX, y, btnW, btnH);
      startX += btnW + gap;
    });
  }

  private createButton(def: AbilityDef, x: number, y: number, w: number, h: number) {
    const tileSize = this.scene.cameras.main.height / 18;
    const fontSize = Math.round(tileSize * 0.32);
    const lineWidth = Math.round(tileSize * 0.04);

    const bg = this.scene.add.graphics();
    createUIPanel(bg, x, y, w, h, lineWidth, 0x4466aa, 0.5, { color: 0x111122, alpha: 0.85 });

    const label = this.scene.add.text(x + w / 2, y + h / 2, t(`ability.${def.id}.name`), {
      fontSize: `${fontSize}px`,
      color: '#aaccff',
      fontFamily: 'PixelSleigh',
    }).setOrigin(0.5);

    const cdOverlay = this.scene.add.graphics();
    const cdText = this.scene.add.text(x + w / 2, y + h / 2, '', {
      fontSize: `${Math.round(fontSize * 0.9)}px`,
      color: '#ff6666',
      fontFamily: 'PixelSleigh',
    }).setOrigin(0.5).setVisible(false);

    // Hit zone
    const hitZone = this.scene.add.rectangle(x + w / 2, y + h / 2, w, h)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001);

    hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if ((this.cooldowns.get(def.id) ?? 0) > 0) return;
      this.pressedAbilityId = def.id;
      this.showTooltip(def, x, y, w);
    });

    hitZone.on(Phaser.Input.Events.POINTER_UP, () => {
      if (this.pressedAbilityId === def.id) {
        if ((this.cooldowns.get(def.id) ?? 0) <= 0) {
          this.cooldowns.set(def.id, this.getAbilityCooldown(def.id));
          this.onActivate(def.id);
        }
        this.pressedAbilityId = null;
        this.hideTooltip();
      }
    });

    hitZone.on(Phaser.Input.Events.POINTER_OVER, () => {
      if ((this.cooldowns.get(def.id) ?? 0) <= 0) label.setColor('#ffffff');
    });
    hitZone.on(Phaser.Input.Events.POINTER_OUT, () => {
      label.setColor('#aaccff');
      if (this.pressedAbilityId === def.id) {
        this.pressedAbilityId = null;
        this.hideTooltip();
      }
    });

    this.container.add([bg, label, cdOverlay, cdText, hitZone]);
    this.buttons.set(def.id, { bg, label, cdOverlay, cdText, hitZone, x, y, w, h });
  }

  private showTooltip(def: AbilityDef, btnX: number, btnY: number, btnW: number) {
    const tileSize = this.scene.cameras.main.height / 18;
    const lineWidth = Math.round(tileSize * 0.04);
    const bonuses = this.getBonuses();
    const stats = this.getAbilityStats(def.id, bonuses);

    const name = t(`ability.${def.id}.name`);
    const desc = t(`ability.${def.id}.desc`);
    const text = `${name}\n${desc}\n\n${stats}`;
    this.tooltipText.setText(text);

    const padding = tileSize * 0.4;
    const tw = Math.max(this.tooltipText.width + padding * 2, tileSize * 5);
    const th = this.tooltipText.height + padding * 2;
    const tx = btnX + btnW / 2 - tw / 2;
    const ty = btnY - th - tileSize * 0.3;

    this.tooltipText.setPosition(tx + tw / 2, ty + th - padding);

    this.tooltipGfx.clear();
    createUIPanel(this.tooltipGfx, tx, ty, tw, th, lineWidth, 0x4466aa, 0.6, { color: 0x0a0a1a, alpha: 0.95 });

    this.tooltipContainer.setVisible(true);
  }

  private hideTooltip() {
    this.tooltipContainer.setVisible(false);
    this.pressedAbilityId = null;
  }

  private getAbilityStats(id: string, b: ConstellationBonuses): string {
    const f = (v: number) => v % 1 === 0 ? String(v) : v.toFixed(2);
    const cd = (v: number) => t('ability.stat.cd').replace('{cd}', f(v / 1000));
    switch (id) {
      case 'frenzy_pulse':
        return `${t('ability.stat.speed').replace('{mult}', f(b.frenzyPulse.multiplier)).replace('{dur}', f(b.frenzyPulse.duration / 1000))}\n${cd(b.frenzyPulse.cooldown)}`;
      case 'void_call':
        return `${t('ability.stat.turnBack').replace('{dur}', f(b.voidCall.duration / 1000))}\n${cd(b.voidCall.cooldown)}`;
      case 'dark_wave':
        return `${t('ability.stat.spawn').replace('{count}', String(b.darkWave.count))}\n${cd(b.darkWave.cooldown)}`;
      case 'soul_harvest':
        return `${t('ability.stat.souls').replace('{mult}', f(b.soulHarvest.multiplier)).replace('{dur}', f(b.soulHarvest.duration / 1000))}\n${cd(b.soulHarvest.cooldown)}`;
      case 'silence':
        return `${t('ability.stat.births').replace('{dur}', f(b.silence.duration / 1000))}\n${cd(b.silence.cooldown)}`;
      default:
        return '';
    }
  }

  private getAbilityCooldown(id: string): number {
    const b = this.getBonuses();
    switch (id) {
      case 'frenzy_pulse': return b.frenzyPulse.cooldown;
      case 'void_call': return b.voidCall.cooldown;
      case 'dark_wave': return b.darkWave.cooldown;
      case 'soul_harvest': return b.soulHarvest.cooldown;
      case 'silence': return b.silence.cooldown;
      default: return 30000;
    }
  }

  update(delta: number) {
    for (const [id, remaining] of this.cooldowns) {
      if (remaining <= 0) continue;
      const newVal = Math.max(0, remaining - delta);
      this.cooldowns.set(id, newVal);

      const btn = this.buttons.get(id);
      if (!btn) continue;

      if (newVal > 0) {
        const totalCd = this.getAbilityCooldown(id);
        const progress = newVal / totalCd;
        btn.label.setAlpha(0.3);
        btn.cdText.setVisible(true);
        btn.cdText.setText(`${(newVal / 1000).toFixed(2)}s`);
        btn.bg.setAlpha(0.3 + 0.7 * (1 - progress));
      } else {
        btn.label.setAlpha(1);
        btn.cdText.setVisible(false);
        btn.bg.setAlpha(1);
        btn.cdOverlay.clear();
      }
    }
  }
}
