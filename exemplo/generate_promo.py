"""
Generate 6 promotional Play Store screenshots (1080x1920, 9:16)
Each slide: gradient background + headline + phone mockup with real screenshot + CookIt logo
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(DIR, "promo")
os.makedirs(OUT, exist_ok=True)

W, H = 1080, 1920

# ── Slide definitions ──
SLIDES = [
    {
        "headline": "Discover recipes\nfrom around\nthe world",
        "sub": "Explore cuisines from different\ncultures and find your next favourite meal",
        "screenshot": "Screenshot_20260507_200535_CookIt.jpg",
        "bg_colors": [(251,245,239), (237,224,208), (194,98,45)],
        "text_dark": True,
    },
    {
        "headline": "Step by step\ndetailed recipes",
        "sub": "Ingredients, timings, difficulty\nand ratings — everything you need",
        "screenshot": "Screenshot_20260507_200143_CookIt.jpg",
        "bg_colors": [(26,26,26), (61,32,16), (194,98,45)],
        "text_dark": False,
    },
    {
        "headline": "Cook with\nconfidence",
        "sub": "Follow preparation steps\nand rate every recipe you try",
        "screenshot": "Screenshot_20260507_200154_CookIt.jpg",
        "bg_colors": [(251,245,239), (237,224,208), (139,61,24)],
        "text_dark": True,
    },
    {
        "headline": "Build your\nchef profile",
        "sub": "Track your recipes, achievements\nand cooking calendar",
        "screenshot": "Screenshot_20260507_200207_CookIt.jpg",
        "bg_colors": [(237,224,208), (212,168,83), (194,98,45)],
        "text_dark": False,
    },
    {
        "headline": "Smart\nshopping list",
        "sub": "Add ingredients straight from\nrecipes and organise your shopping",
        "screenshot": "Screenshot_20260507_200251_CookIt.jpg",
        "bg_colors": [(251,245,239), (212,168,83), (139,61,24)],
        "text_dark": True,
    },
    {
        "headline": "Share your\ncreations",
        "sub": "Publish recipes, choose cuisine,\ndifficulty and ingredients in seconds",
        "screenshot": "Captura de ecrã 2026-05-07 200754.png",
        "bg_colors": [(26,26,26), (45,26,14), (212,168,83)],
        "text_dark": False,
    },
]

# ── Helpers ──

def lerp_color(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))

def make_gradient(w, h, colors):
    """3-stop vertical gradient."""
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    mid = len(colors) // 2
    for y in range(h):
        t = y / h
        if t < 0.5:
            c = lerp_color(colors[0], colors[mid], t * 2)
        else:
            c = lerp_color(colors[mid], colors[-1], (t - 0.5) * 2)
        draw.line([(0, y), (w, y)], fill=c)
    return img

def draw_rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill)

def make_phone_frame(screenshot_path, frame_w=460, frame_h=940):
    """Create a phone mockup with the screenshot inside."""
    bezel = 12
    corner = 44
    inner_w = frame_w - bezel * 2
    inner_h = frame_h - bezel * 2
    inner_corner = corner - 6

    # Frame (dark background)
    frame = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)

    # Phone body
    draw_rounded_rect(draw, (0, 0, frame_w, frame_h), corner, (30, 30, 30, 255))

    # Subtle edge highlight
    draw_rounded_rect(draw, (1, 1, frame_w - 1, frame_h - 1), corner, (40, 40, 40, 255))
    draw_rounded_rect(draw, (2, 2, frame_w - 2, frame_h - 2), corner, (30, 30, 30, 255))

    # Screen area (white bg as fallback)
    draw_rounded_rect(draw, (bezel, bezel, frame_w - bezel, frame_h - bezel), inner_corner, (251, 245, 239, 255))

    # Load and paste screenshot
    sc_path = os.path.join(DIR, screenshot_path)
    if os.path.exists(sc_path):
        sc = Image.open(sc_path).convert("RGBA")
        sc = sc.resize((inner_w, inner_h), Image.LANCZOS)

        # Create rounded mask for screen
        mask = Image.new("L", (inner_w, inner_h), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle((0, 0, inner_w, inner_h), radius=inner_corner, fill=255)

        screen_layer = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
        screen_layer.paste(sc, (bezel, bezel), mask)
        frame = Image.alpha_composite(frame, screen_layer)

    # Notch
    draw2 = ImageDraw.Draw(frame)
    notch_w, notch_h = 140, 28
    notch_x = (frame_w - notch_w) // 2
    draw2.rounded_rectangle(
        (notch_x, 0, notch_x + notch_w, notch_h),
        radius=14, fill=(30, 30, 30, 255)
    )

    return frame

def add_shadow(img, offset=(0, 20), radius=40, opacity=80):
    """Add drop shadow behind phone frame."""
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow_layer = Image.new("RGBA", img.size, (0, 0, 0, opacity))

    # Use alpha channel of phone as shadow mask
    mask = img.split()[3]
    shadow.paste(shadow_layer, offset, mask)

    # Blur the shadow
    shadow_rgb = shadow.convert("RGB").filter(ImageFilter.GaussianBlur(radius))
    shadow_a = shadow.split()[3].filter(ImageFilter.GaussianBlur(radius))
    shadow = Image.merge("RGBA", (*shadow_rgb.split(), shadow_a))

    # Composite: shadow behind phone
    result = Image.new("RGBA", img.size, (0, 0, 0, 0))
    result = Image.alpha_composite(result, shadow)
    result = Image.alpha_composite(result, img)
    return result

def get_font(bold=False, size=72):
    """Try to load nice fonts, fallback to default."""
    font_names = []
    if bold:
        font_names = [
            "C:/Windows/Fonts/Georgia Bold.ttf",
            "C:/Windows/Fonts/georgiab.ttf",
            "C:/Windows/Fonts/timesbd.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
        ]
    else:
        font_names = [
            "C:/Windows/Fonts/Georgia.ttf",
            "C:/Windows/Fonts/georgia.ttf",
            "C:/Windows/Fonts/times.ttf",
            "C:/Windows/Fonts/arial.ttf",
        ]
    for fn in font_names:
        if os.path.exists(fn):
            try:
                return ImageFont.truetype(fn, size)
            except:
                pass
    return ImageFont.load_default()

def draw_text_block(draw, text, xy, font, fill, line_spacing=1.15):
    x, y = xy
    lines = text.split("\n")
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        draw.text((x, y), line, font=font, fill=fill)
        line_h = bbox[3] - bbox[1]
        y += int(line_h * line_spacing)
    return y

def draw_accent_line(draw, x, y, color):
    draw.rounded_rectangle((x, y, x + 80, y + 8), radius=4, fill=color)

def draw_logo(draw, x, y, dark=True):
    font = get_font(bold=True, size=50)
    c_color = (26, 26, 26) if dark else (255, 255, 255)
    k_color = (194, 98, 45) if dark else (212, 168, 83)
    draw.text((x, y), "Cook", font=font, fill=c_color)
    bbox = draw.textbbox((x, y), "Cook", font=font)
    draw.text((bbox[2], y), "It", font=font, fill=k_color)

# ── Generate slides ──

for i, slide in enumerate(SLIDES):
    print(f"Generating slide {i+1}/6: {slide['headline'].split(chr(10))[0]}...")

    # Background gradient
    bg = make_gradient(W, H, slide["bg_colors"])
    bg = bg.convert("RGBA")

    # Decorative circle (subtle)
    circle = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(circle)
    cdraw.ellipse((W - 350, -200, W + 250, 400), fill=(255, 255, 255, 12))
    cdraw.ellipse((-200, H - 350, 350, H + 100), fill=(255, 255, 255, 8))
    bg = Image.alpha_composite(bg, circle)

    draw = ImageDraw.Draw(bg)

    # Colors
    is_dark = slide["text_dark"]
    h_color = (26, 26, 26) if is_dark else (255, 255, 255)
    s_color = (85, 85, 85) if is_dark else (255, 255, 255, 180)
    s_color_rgb = (85, 85, 85) if is_dark else (220, 220, 220)
    accent_color = (194, 98, 45) if is_dark else (212, 168, 83)

    # ── Text section (top) ──
    text_x = 80
    text_y = 120

    # Accent line
    draw_accent_line(draw, text_x, text_y, accent_color)
    text_y += 50

    # Headline
    h_font = get_font(bold=True, size=78)
    text_y = draw_text_block(draw, slide["headline"], (text_x, text_y), h_font, h_color, 1.12)
    text_y += 24

    # Subtitle
    s_font = get_font(bold=False, size=34)
    text_y = draw_text_block(draw, slide["sub"], (text_x, text_y), s_font, s_color_rgb, 1.35)

    # ── Phone mockup (center-bottom) ──
    phone_w, phone_h = 480, 980
    phone = make_phone_frame(slide["screenshot"], phone_w, phone_h)

    # Add shadow
    phone_canvas = Image.new("RGBA", (phone_w + 80, phone_h + 80), (0, 0, 0, 0))
    phone_canvas.paste(phone, (40, 20), phone)
    phone_with_shadow = add_shadow(phone_canvas, offset=(0, 15), radius=30, opacity=70)

    # Position phone
    phone_x = (W - phone_with_shadow.width) // 2
    phone_y = text_y + 40
    # Make sure phone doesn't overflow — adjust if needed
    max_phone_y = H - phone_with_shadow.height - 100
    phone_y = min(phone_y, max_phone_y)

    bg.paste(phone_with_shadow, (phone_x, phone_y), phone_with_shadow)

    # ── Logo at bottom ──
    draw = ImageDraw.Draw(bg)
    logo_y = H - 90
    draw_logo(draw, (W - 200) // 2, logo_y, dark=is_dark)

    # ── Save ──
    out_path = os.path.join(OUT, f"promo_{i+1}.png")
    bg = bg.convert("RGB")
    bg.save(out_path, "PNG", optimize=True)
    print(f"  -> Saved: {out_path}")

print(f"\nDone! 6 screenshots saved to: {OUT}")
