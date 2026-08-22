"""Knock out gray/white studio backgrounds; keep the turtle."""
from pathlib import Path

from PIL import Image
import numpy as np

SRC = Path(__file__).resolve().parents[1] / "src" / "assets" / "mascot" / "drive"
DST = Path(__file__).resolve().parents[1] / "src" / "assets" / "mascot" / "clear"
DST.mkdir(parents=True, exist_ok=True)

FILES = [
    "Gemini_Generated_Image_eg5ii6eg5ii6eg5i.jpg",
    "HOME DAILY DECISION.jpg",
    "POSTRIP CATCH LOG.jpg",
    "Boat Profile Setup.jpg",
    "SETTINGS.jpg",
    "Gemini_Generated_Image_upjku9upjku9upjk.jpg",
    "Gemini_Generated_Image_rjhixwrjhixwrjhi.jpg",
]


def studio_mask(rgb: np.ndarray) -> np.ndarray:
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    sat = np.where(mx == 0, 0, (mx - mn) / np.maximum(mx, 1))
    return (mx >= 168) & (sat < 0.16)


def dilate(a: np.ndarray) -> np.ndarray:
    return a | np.roll(a, 1, 0) | np.roll(a, -1, 0) | np.roll(a, 1, 1) | np.roll(a, -1, 1)


def knock(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    im.thumbnail((900, 900), Image.Resampling.LANCZOS)
    arr = np.array(im)
    h, w = arr.shape[:2]
    studio = studio_mask(arr[:, :, :3].astype(np.float32))
    reach = np.zeros((h, w), dtype=bool)
    reach[0, :] = True
    reach[-1, :] = True
    reach[:, 0] = True
    reach[:, -1] = True
    reach &= studio
    for _ in range(max(h, w)):
        nxt = dilate(reach) & studio
        if nxt.sum() == reach.sum():
            break
        reach = nxt
    arr[reach, 3] = 0
    out = Image.fromarray(arr)
    bbox = out.getbbox()
    if bbox:
        pad = 10
        x0, y0, x1, y1 = bbox
        out = out.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)))
    return out


def main():
    for name in FILES:
        src = SRC / name
        if not src.exists():
            print("missing", name)
            continue
        dest = DST / (Path(name).stem + ".png")
        knock(src).save(dest)
        print("wrote", dest.name)


if __name__ == "__main__":
    main()
