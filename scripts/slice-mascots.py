from pathlib import Path
from PIL import Image

ASSETS = Path(r"C:\Users\alvin\.cursor\projects\d-TripWise\assets")
OUT = Path(r"D:\TripWise\src\assets")
BRAND = OUT / "brand"
MASCOT = OUT / "mascot"
BRAND.mkdir(parents=True, exist_ok=True)
MASCOT.mkdir(parents=True, exist_ok=True)

LOGO_WHITE = ASSETS / "c__Users_alvin_AppData_Roaming_Cursor_User_workspaceStorage_127b9a6aa340437aa4778df9828bfaf0_images_image-131bfb0f-ce03-4431-bd08-58b67bd31bbb.png"
LOGO_NAVY = ASSETS / "c__Users_alvin_AppData_Roaming_Cursor_User_workspaceStorage_127b9a6aa340437aa4778df9828bfaf0_images_image-e4adc545-72f8-4fe0-b304-dc1a9a98e709.png"
TURNS = ASSETS / "c__Users_alvin_AppData_Roaming_Cursor_User_workspaceStorage_127b9a6aa340437aa4778df9828bfaf0_images_image-9eb235e1-a32e-483a-99fe-8180de443a86.jpg"
SCREENS = ASSETS / "c__Users_alvin_AppData_Roaming_Cursor_User_workspaceStorage_127b9a6aa340437aa4778df9828bfaf0_images_image-23aecd35-dcc0-490a-a613-c4d46a8d429a.jpg"


def luma(rgb):
    r, g, b = rgb[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def knock_bg(im: Image.Image, luma_cut=210, fade=18) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            L = luma((r, g, b))
            if L >= luma_cut:
                px[x, y] = (r, g, b, 0)
            elif L >= luma_cut - fade:
                alpha = int(255 * (luma_cut - L) / fade)
                px[x, y] = (r, g, b, max(0, min(255, alpha)))
    return im


def trim(im: Image.Image, pad=6) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def process_cell(im: Image.Image, box, luma_cut=210) -> Image.Image:
    return trim(knock_bg(im.crop(box), luma_cut=luma_cut))


def save(im: Image.Image, path: Path):
    im.save(path, "PNG")
    print("saved", path.name, im.size)


# Logos
Image.open(LOGO_WHITE).convert("RGB").save(BRAND / "logo-on-navy.png")
print("saved logo-on-navy.png")

save(trim(knock_bg(Image.open(LOGO_NAVY), luma_cut=232, fade=12), pad=10), BRAND / "logo-mark.png")

white_src = Image.open(LOGO_WHITE).convert("RGBA")
px = white_src.load()
w, h = white_src.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if r > 210 and g > 210 and b > 210:
            px[x, y] = (255, 255, 255, 255)
        else:
            px[x, y] = (255, 255, 255, 0)
save(trim(white_src, pad=12), BRAND / "logo-mark-white.png")

# Turnaround 1024x558
turns = Image.open(TURNS).convert("RGB")
tw, th = turns.size

# Empirically: two rows. Top bodies sit in upper ~48%.
# Bottom: wide portrait then three framed heads.
top_h = int(th * 0.48)
bot_y = int(th * 0.50)

for i, name in enumerate(["front", "three-quarter", "profile", "back"]):
    x0 = int(i * tw / 4)
    x1 = int((i + 1) * tw / 4)
    save(process_cell(turns, (x0 + 4, 4, x1 - 4, top_h), luma_cut=205), MASCOT / f"{name}.png")

# Bottom row: portrait is the leftmost ~0.36, remaining three squares
portrait_w = int(tw * 0.355)
save(process_cell(turns, (6, bot_y, portrait_w, th - 4), luma_cut=205), MASCOT / "portrait.png")

expr = ["happy", "determined", "worried"]
left = portrait_w
span = tw - portrait_w
for i, name in enumerate(expr):
    x0 = left + int(i * span / 3) + 6
    x1 = left + int((i + 1) * span / 3) - 6
    save(process_cell(turns, (x0, bot_y + 8, x1, th - 6), luma_cut=200), MASCOT / f"{name}.png")

# Screen poses 5x2. Cut labels (bottom ~22% of each cell).
screens = Image.open(SCREENS).convert("RGB")
sw, sh = screens.size
names = [
    "onboarding", "home", "math", "whatif", "map",
    "catch", "history", "reference", "settings", "price",
]
cols, rows = 5, 2
cw, rh = sw / cols, sh / rows
for i, name in enumerate(names):
    c, r = i % cols, i // cols
    x0, y0 = int(c * cw) + 4, int(r * rh) + 2
    x1, y1 = int((c + 1) * cw) - 4, int(r * rh + rh * 0.76)
    save(process_cell(screens, (x0, y0, x1, y1), luma_cut=198), MASCOT / f"{name}.png")

print("done")
