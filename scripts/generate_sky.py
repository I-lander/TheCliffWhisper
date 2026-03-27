"""Generate a sky + pixel-art clouds background image using the same algorithm as CloudManager.ts."""

from PIL import Image, ImageDraw
import random

# --- Config ---
WIDTH = 1920
HEIGHT = 1080
SKY_COLOR = (0x42, 0x4F, 0x66)
CLOUD_COLOR = (255, 255, 255)
CLOUD_ALPHA = 30  # 0.12 * 255 ≈ 30
BLOCK_PX = 6  # pixel unit scaled for the output resolution
CLOUD_COUNT = 35


def draw_pixel_cloud(draw: ImageDraw.ImageDraw, ox: int, oy: int, block: int, alpha: int):
    """Draw a single pixel-art cloud matching the game's drawPixelCloud algorithm."""
    base_w = 10 + random.randint(0, 9)
    rows = [{"x": 0, "w": base_w}]

    # Middle rows (shrink)
    mid_rows = 2 + random.randint(0, 2)
    for _ in range(mid_rows):
        prev = rows[-1]
        shrink_l = random.randint(0, 1)
        shrink_r = random.randint(0, 1)
        w = max(2, prev["w"] - shrink_l - shrink_r)
        x = prev["x"] + shrink_l
        rows.append({"x": x, "w": w})

    # Bumps on top
    bumps = 2 + random.randint(0, 2)
    for _ in range(bumps):
        bump_w = 2 + random.randint(0, 3)
        bump_x = random.randint(0, max(0, base_w - bump_w))
        rows.append({"x": bump_x, "w": bump_w})

    fill = CLOUD_COLOR + (alpha,)
    for r, row in enumerate(rows):
        x1 = ox + row["x"] * block
        y1 = oy - r * block
        x2 = x1 + row["w"] * block
        y2 = y1 + block
        draw.rectangle([x1, y1, x2, y2], fill=fill)


def main():
    img = Image.new("RGBA", (WIDTH, HEIGHT), SKY_COLOR + (255,))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for _ in range(CLOUD_COUNT):
        x = random.randint(-100, WIDTH)
        y = random.randint(40, int(HEIGHT * 0.75))
        draw_pixel_cloud(draw, x, y, BLOCK_PX, CLOUD_ALPHA)

    img = Image.alpha_composite(img, overlay)
    img = img.convert("RGB")

    out = "sky_background.png"
    img.save(out)
    print(f"Saved {out} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
