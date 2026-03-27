import { ABILITIES, AbilityDef } from './AbilityData';
import { ConstellationBonuses } from '../constellations/ConstellationData';
import { createUIPanel } from '../utils/utils';
import { t } from '../i18n/i18n';

interface AbilityButton {
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  cdOverlay: Phaser.GameObjects.Graphics;
  cdText: Phaser.GameObjects.Text;
  durationBar: Phaser.GameObjects.Graphics;
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
  private durations: Map<string, { remaining: number; total: number }> = new Map();
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
    const fontSize = Math.round(tileSize * 0.32);
    const padX = tileSize * 0.6;
    const padY = tileSize * 0.3;
    const gap = tileSize * 0.3;

    // Measure each button based on its text
    const measurements = unlocked.map((def) => {
      const name = t(`ability.${def.id}.name`);
      const tmpText = this.scene.add.text(0, 0, name, {
        fontSize: `${fontSize}px`,
        fontFamily: 'PixelSleigh',
      });
      const w = tmpText.width + padX * 2;
      const h = tmpText.height + padY * 2;
      tmpText.destroy();
      return { def, w, h };
    });

    const btnH = measurements.reduce((max, m) => Math.max(max, m.h), 0);
    const maxW = measurements.reduce((max, m) => Math.max(max, m.w), 0);

    // Vertical column, anchored bottom-right
    const totalH = unlocked.length * (btnH + gap) - gap;
    const baseX = cam.width * 0.75 - maxW - tileSize ;
    const baseY = cam.height - tileSize * 1.5 - totalH;

    for (let i = 0; i < measurements.length; i++) {
      const m = measurements[i];
      const y = baseY + i * (btnH + gap);
      this.createButton(m.def, baseX, y, maxW, btnH);
    }
  }

  private createButton(def: AbilityDef, x: number, y: number, w: number, h: number) {
    const tileSize = this.scene.cameras.main.height / 18;
    const pixelUnit = tileSize / 16;
    const fontSize = Math.round(tileSize * 0.32);
    const lineWidth = pixelUnit;

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

    // Duration progress bar (below the button)
    const durationBar = this.scene.add.graphics();

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
          const duration = this.getAbilityDuration(def.id);
          this.cooldowns.set(def.id, this.getAbilityCooldown(def.id));
          if (duration > 0) {
            this.durations.set(def.id, { remaining: duration, total: duration });
          }
          this.onActivate(def.id);
        }
        this.pressedAbilityId = null;
        this.hideTooltip();
      }
    });

    hitZone.on(Phaser.Input.Events.POINTER_OVER, () => {
      if ((this.cooldowns.get(def.id) ?? 0) <= 0) label.setColor('#ffffff');
      this.showTooltip(def, x, y, w);
    });
    hitZone.on(Phaser.Input.Events.POINTER_OUT, () => {
      label.setColor('#aaccff');
      this.hideTooltip();
    });

    this.container.add([bg, label, cdOverlay, cdText, durationBar, hitZone]);
    this.buttons.set(def.id, { bg, label, cdOverlay, cdText, durationBar, hitZone, x, y, w, h });
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

  private getAbilityDuration(id: string): number {
    const b = this.getBonuses();
    switch (id) {
      case 'frenzy_pulse': return b.frenzyPulse.duration;
      case 'void_call': return b.voidCall.duration;
      case 'soul_harvest': return b.soulHarvest.duration;
      case 'silence': return b.silence.duration;
      default: return 0; // dark_wave is instant
    }
  }

  update(delta: number) {
    const tileSize = this.scene.cameras.main.height / 18;
    const barH = Math.round(tileSize * 0.12);
    const barGap = Math.round(tileSize * 0.08);

    // Update cooldowns
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
        btn.cdText.setVisible(false);

        // Overlay shrinks horizontally from right to left
        btn.cdOverlay.clear();
        btn.cdOverlay.fillStyle(0x000000, 0.6);
        const overlayW = btn.w * progress;
        btn.cdOverlay.fillRect(btn.x + btn.w - overlayW, btn.y, overlayW, btn.h);
      } else {
        btn.label.setAlpha(1);
        btn.cdText.setVisible(false);
        btn.cdOverlay.clear();
      }
    }

    // Update duration bars
    for (const [id, dur] of this.durations) {
      if (dur.remaining <= 0) continue;
      dur.remaining = Math.max(0, dur.remaining - delta);

      const btn = this.buttons.get(id);
      if (!btn) continue;

      btn.durationBar.clear();
      if (dur.remaining > 0) {
        const progress = dur.remaining / dur.total;
        const barY = btn.y + btn.h + barGap;
        // Background
        btn.durationBar.fillStyle(0x000000, 0.5);
        btn.durationBar.fillRect(btn.x, barY, btn.w, barH);
        // Fill
        btn.durationBar.fillStyle(0xaaccff, 0.8);
        btn.durationBar.fillRect(btn.x, barY, btn.w * progress, barH);
      }
    }
  }
}
