import { ABILITIES, AbilityDef } from './AbilityData';
import { ConstellationBonuses } from '../constellations/ConstellationData';

export class AbilityUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private cooldowns: Map<string, number> = new Map();
  private buttons: Map<string, { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; cdOverlay: Phaser.GameObjects.Graphics; cdText: Phaser.GameObjects.Text }> = new Map();
  private getBonuses: () => ConstellationBonuses;
  private onActivate: (id: string) => void;

  constructor(
    scene: Phaser.Scene,
    getBonuses: () => ConstellationBonuses,
    onActivate: (id: string) => void,
  ) {
    this.scene = scene;
    this.getBonuses = getBonuses;
    this.onActivate = onActivate;
    this.container = scene.add.container(0, 0).setDepth(160);
    this.setVisible(false);
  }

  setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }

  refresh() {
    this.container.removeAll(true);
    this.buttons.clear();

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

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111122, 0.85);
    bg.fillRoundedRect(x, y, w, h, 4);
    bg.lineStyle(1, 0xaaccff, 0.4);
    bg.strokeRoundedRect(x, y, w, h, 4);

    const label = this.scene.add.text(x + w / 2, y + h / 2, def.name, {
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
      this.cooldowns.set(def.id, this.getAbilityCooldown(def.id));
      this.onActivate(def.id);
    });

    hitZone.on(Phaser.Input.Events.POINTER_OVER, () => {
      if ((this.cooldowns.get(def.id) ?? 0) <= 0) label.setColor('#ffffff');
    });
    hitZone.on(Phaser.Input.Events.POINTER_OUT, () => {
      label.setColor('#aaccff');
    });

    this.container.add([bg, label, cdOverlay, cdText, hitZone]);
    this.buttons.set(def.id, { bg, label, cdOverlay, cdText });
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
        btn.cdText.setText(`${Math.ceil(newVal / 1000)}s`);

        // Darken overlay
        btn.cdOverlay.clear();
        const bounds = btn.label.parentContainer
          ? { x: btn.label.x - 50, y: btn.label.y - 15, w: 100, h: 30 }
          : { x: 0, y: 0, w: 0, h: 0 };
        // Simple alpha tint on the whole button area
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
