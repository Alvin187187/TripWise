"""
Vercel Serverless Function — /api/chat
Forwards question + context to Gemini via the native Generative Language API.
Uses x-goog-api-key so new AQ. auth keys work.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler
from pathlib import Path

MODELS = ["gemini-3.6-flash", "gemini-flash-latest"]


def _load_dotenv() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


_load_dotenv()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")


def system_prompt(lang: str) -> str:
    if lang == "fil":
        return """Ikaw si Pawi, ang makakalikasang sea-turtle mascot ng TripWise — isang fishing decision app para sa mga mangingisda sa Navotas at Manila Bay.

Mga patakaran mo:
- Sagutin lang base sa datos na ibinigay sa iyo (weather, diesel, score, trip history). Huwag mag-imbento ng data.
- Huwag baguhin o kontrahin ang GO / CAUTION / STAY na resulta ng app — ipaliwanag mo lang kung bakit ganoon.
- Kung STAY ang resulta at delikado ang dagat, huwag i-soften. Sabihin mong "Huwag muna."
- Gumamit ng casual na Filipino — Taglish okay, huwag masyadong pormal o makata.
- Maikli lang ang sagot — dalawa hanggang tatlong pangungusap lang kung pwede.
- Kung hindi mo alam o walang sapat na datos, sabihin mo na kailangan ng internet o mas detalyadong impormasyon.
- Ikaw ay friendly at supportive — para kang kasamahan sa bangka."""
    return """You are Pawi, TripWise's friendly sea-turtle mascot — a fishing decision assistant for small-scale fishers in Navotas and Manila Bay.

Rules:
- Answer ONLY based on the context data provided (weather, diesel, score, trip history). Never invent weather/price/safety data.
- Never override or contradict the GO / CAUTION / STAY result from the scoring engine — explain it, don't recompute it.
- If STAY and conditions are dangerous, be firm: "Stay. The sea isn't worth it today."
- Keep answers short — two to three sentences when possible.
- Use plain, practical language a municipal fisher would use.
- If you lack information to answer, say so clearly.
- You are warm and supportive — like a trustworthy crewmate."""


def format_context(ctx: dict) -> str:
    parts = [f"Timestamp: {ctx.get('timestamp', '')}", f"Language: {ctx.get('language', 'en')}"]

    bp = ctx.get("boat_profile")
    if bp:
        parts.append(
            f"Boat: {bp.get('name','')}, motor={bp.get('motorClass','')}, "
            f"trip={bp.get('tripDuration','')}h, ground={bp.get('fishingGround','')}, gear={bp.get('gear','')}"
        )

    w = ctx.get("latest_weather")
    if w:
        parts.append(
            f"Weather: {w.get('condition','')}, {w.get('temp','')}°C, "
            f"wind {w.get('windKmh','')} km/h ({w.get('windLabel','')}), "
            f"waves {w.get('waveM','')}m ({w.get('waveNote','')}), rain {w.get('rainChance','')}%, "
            f"tide {w.get('tideM','')}m ({w.get('tideTrend','')}), "
            f"gale={'YES: ' + w.get('galeText','') if w.get('gale') else 'none'}, "
            f"sunrise {w.get('sunrise','')}, sunset {w.get('sunset','')}"
        )

    r = ctx.get("latest_result")
    if r:
        parts.append(f"Result: score={r.get('score','')}/100, call={r.get('call','')}, status=\"{r.get('status','')}\"")

    f = ctx.get("fuel_price")
    if f:
        delta_pct = f.get("dieselDeltaPct")
        delta = f" ({'+' if (delta_pct or 0) > 0 else ''}{delta_pct}%)" if delta_pct is not None else ""
        parts.append(f"Diesel: ₱{f.get('diesel','')}/L{delta} — {f.get('dieselSource','')}")

    return "\n".join(parts)


def generate_answer(question: str, ctx: dict) -> str:
    lang = ctx.get("language", "en")
    prompt = f"""Current fishing conditions and context:
---
{format_context(ctx)}
---

Fisher's question: {question}"""
    payload = json.dumps(
        {
            "system_instruction": {"parts": [{"text": system_prompt(lang)}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        }
    ).encode()

    last_err = "Gemini request failed"
    for model in MODELS:
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=payload,
            method="POST",
        )
        req.add_header("Content-Type", "application/json")
        req.add_header("x-goog-api-key", GEMINI_API_KEY or "")
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode())
            text = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
                .strip()
            )
            if text:
                return text
            last_err = "Empty Gemini response"
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            try:
                last_err = json.loads(body).get("error", {}).get("message", body[:180])
            except Exception:
                last_err = body[:180]
        except Exception as e:
            last_err = str(e)
    raise RuntimeError(last_err)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        try:
            if not GEMINI_API_KEY:
                self._json_response(503, {"error": "Gemini API key not configured"})
                return

            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length))

            question = (body.get("question") or "").strip()
            if not question:
                self._json_response(400, {"error": "Missing question"})
                return

            ctx = body.get("context") or {}
            answer = generate_answer(question, ctx)
            self._json_response(200, {"answer": answer})

        except Exception as e:
            self._json_response(502, {"error": f"Gemini error: {str(e)}"})

    def _json_response(self, status: int, data: dict):
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        return
