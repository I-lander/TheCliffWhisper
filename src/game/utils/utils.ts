import { CustomScene } from '../customClasses/CustomScene';
import CrtShader from '../shaders/CrtShader';

export const SPRITE_BASE_UNIT = 16;
export const FRONT_DEPTH = 1000000;

export function getColors(color: string): number {
  return Phaser.Display.Color.ValueToColor(color).color;
}

export function removeSplashScreen(scene: Phaser.Scene) {
  if (import.meta.env.VITE_IS_DEV_SPLASH === 'true') {
    document.getElementById('splashScreen')?.remove();
  } else {
    const splashMinDuration = 3000;
    const splashElapsed = Date.now() - window.splashStartTime;
    const remaining = Math.max(splashMinDuration - splashElapsed, 0);

    scene.time.delayedCall(remaining, () => {
      document.getElementById('splashScreen')?.classList.add('fade-out');
    });
  }
}

export function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function hexToHsl(hex: string) {
  const n = hex.replace('#', '');
  const bigint = parseInt(
    n.length === 3
      ? n
          .split('')
          .map((c) => c + c)
          .join('')
      : n,
    16,
  );
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

export function hslToHex(h: number, s: number, l: number) {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => {
    return Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function screenInit(canvas: HTMLCanvasElement) {
  const desiredRatio = 16 / 9;

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const screenRatio = screenWidth / screenHeight;

  let canvasWidth: number, canvasHeight: number;

  if (screenRatio > desiredRatio) {
    canvasHeight = screenHeight;
    canvasWidth = canvasHeight * desiredRatio;
  } else {
    canvasWidth = screenWidth;
    canvasHeight = canvasWidth / desiredRatio;
  }

  const pixelRatio = window.devicePixelRatio || 1;

  if (canvas) {
    canvas.width = canvasWidth * pixelRatio;
    canvas.height = canvasHeight * pixelRatio;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
  }
}

export function createUIPanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  lineWidth: number,
  color: number = 0xffffff,
  alpha: number = 1,
  background?: { color: number; alpha: number },
) {
  if (background) {
    graphics.fillStyle(background.color, background.alpha);
    graphics.fillRect(x, y, width, height);
  }

  const corner = lineWidth * 2;

  graphics.fillStyle(color, alpha);

  graphics.fillRect(x + corner * 1.5, y, width - corner * 3, lineWidth);
  graphics.fillRect(x + corner * 1.5, y + height - lineWidth, width - corner * 3, lineWidth);
  graphics.fillRect(x, y + corner * 1.5, lineWidth, height - corner * 3);
  graphics.fillRect(x + width - lineWidth, y + corner * 1.5, lineWidth, height - corner * 3);

  graphics.fillRect(x, y, corner, corner);
  graphics.fillRect(x + width - corner, y, corner, corner);
  graphics.fillRect(x, y + height - corner, corner, corner);
  graphics.fillRect(x + width - corner, y + height - corner, corner, corner);
}

export function initShader(scene: Phaser.Scene) {
  scene.scene.manager.scenes.forEach((s) => {
    const key = s.scene.key;

    if (key !== 'LoadingScene' && key !== 'UIScene') {
      const renderer = s.renderer as Phaser.Renderer.WebGL.WebGLRenderer;

      renderer.pipelines.addPostPipeline('CrtShader', CrtShader);
      if (s.cameras.main) {
        s.cameras.main.setPostPipeline('CrtShader');

        const pipelineInstance = s.cameras.main.getPostPipeline('CrtShader') as CrtShader;
        (s as CustomScene).crtShader = pipelineInstance;
        (s as CustomScene).updateShader();
      }
    }
  });
}

export function clearShader(scene: Phaser.Scene) {
  scene.scene.manager.scenes.forEach((s) => {
    const key = s.scene.key;

    if (key !== 'LoadingScene' && s.cameras) {
      if (s.cameras.main) {
        s.cameras.main.removePostPipeline('CrtShader');
      }
    }
  });
}

export function toggleDebugGrid(scene: CustomScene) {
  const tileSize = scene.tileSize;
  const screenWidth = scene.cameras.main.width;
  const screenHeight = scene.cameras.main.height;
  const fontSize = Math.round(tileSize * 0.3);
  const columnsCount = Math.ceil(screenWidth / tileSize);
  const rowsCount = Math.ceil(screenHeight / tileSize);

  const debugGrid = scene.add.graphics();
  debugGrid.lineStyle(scene.pixelUnit / 2, 0xffffff, 0.3);

  for (let x = 0; x <= screenWidth; x += tileSize) {
    debugGrid.lineBetween(x, 0, x, screenHeight);
  }

  for (let y = 0; y <= screenHeight; y += tileSize) {
    debugGrid.lineBetween(0, y, screenWidth, y);
  }

  debugGrid.setDepth(999);

  for (let col = 0; col < columnsCount; col++) {
    for (let row = 0; row < rowsCount; row++) {
      scene.add
        .text(col * tileSize + 2, row * tileSize + 1, `${col},${row}`, {
          fontSize: `${fontSize}px`,
          color: '#ffffff',
        })
        .setAlpha(0.4)
        .setDepth(999);
    }
  }
}

export interface AtlasFrame {
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface AtlasJSON {
  frames: Record<string, AtlasFrame>;
}

export function createAtlasFromArray<
  T extends { id: string; atlasObj: { x: number; y: number; w: number; h: number } },
>(array: T[]) {
  const atlas = {
    frames: {} as Record<string, { frame: { x: number; y: number; w: number; h: number } }>,
  };

  array.forEach((_) => {
    atlas.frames[_.id] = {
      frame: {
        x: SPRITE_BASE_UNIT * _.atlasObj.x,
        y: SPRITE_BASE_UNIT * _.atlasObj.y,
        w: SPRITE_BASE_UNIT * _.atlasObj.w,
        h: SPRITE_BASE_UNIT * _.atlasObj.h,
      },
    };
  });

  return atlas;
}

export function fillPixelRoundedRect(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  width: number,
  height: number,
  radius: number,
) {
  for (let row = 0; row < height; row++) {
    const distFromEdge = Math.min(row, height - 1 - row);
    const inset = Math.max(0, radius - 1 - distFromEdge);
    ctx.fillRect(startX + inset, startY + row, width - 2 * inset, 1);
  }
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  style: string,
  x: number,
  y: number,
  width: number,
  height: number,
  borderRadius: number,
) {
  if (width < 2 * borderRadius) borderRadius = width / 2;
  if (height < 2 * borderRadius) borderRadius = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + borderRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, borderRadius);
  ctx.arcTo(x + width, y + height, x, y + height, borderRadius);
  ctx.arcTo(x, y + height, x, y, borderRadius);
  ctx.arcTo(x, y, x + width, y, borderRadius);
  ctx.closePath();
  style === 'fill' ? ctx.fill() : ctx.stroke();
}
