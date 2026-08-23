/**
 * Dev/preview handler for POST /api/chat.
 * Reads GEMINI_API_KEY from .env (not exposed to the browser).
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Connect, Plugin } from "vite";

const MODELS = ["gemini-3.6-flash", "gemini-flash-latest"];

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function formatContext(ctx: Record<string, unknown>): string {
  const parts = [`Timestamp: ${ctx.timestamp ?? ""}`, `Language: ${ctx.language ?? "en"}`];
  const bp = ctx.boat_profile as Record<string, unknown> | null | undefined;
  if (bp) {
    parts.push(
      `Boat: ${bp.name ?? ""}, motor=${bp.motorClass ?? ""}, trip=${bp.tripDuration ?? ""}h, ground=${bp.fishingGround ?? ""}, gear=${bp.gear ?? ""}`,
    );
  }
  const w = ctx.latest_weather as Record<string, unknown> | null | undefined;
  if (w) {
    parts.push(
      `Weather: ${w.condition ?? ""}, ${w.temp ?? ""}°C, wind ${w.windKmh ?? ""} km/h (${w.windLabel ?? ""}), waves ${w.waveM ?? ""}m (${w.waveNote ?? ""}), rain ${w.rainChance ?? ""}%, tide ${w.tideM ?? ""}m (${w.tideTrend ?? ""}), gale=${w.gale ? "YES: " + w.galeText : "none"}, sunrise ${w.sunrise ?? ""}, sunset ${w.sunset ?? ""}`,
    );
  }
  const r = ctx.latest_result as Record<string, unknown> | null | undefined;
  if (r) parts.push(`Result: score=${r.score ?? ""}/100, call=${r.call ?? ""}, status="${r.status ?? ""}"`);
  const f = ctx.fuel_price as Record<string, unknown> | null | undefined;
  if (f) {
    const d = f.dieselDeltaPct;
    const delta = d != null ? ` (${Number(d) > 0 ? "+" : ""}${d}%)` : "";
    parts.push(`Diesel: ₱${f.diesel ?? ""}/L${delta} — ${f.dieselSource ?? ""}`);
  }
  return parts.join("\n");
}

function systemPrompt(lang: string): string {
  if (lang === "fil") {
    return `Ikaw si Pawi, ang makakalikasang sea-turtle mascot ng TripWise — isang fishing decision app para sa mga mangingisda sa Navotas at Manila Bay.

Mga patakaran mo:
- Sagutin lang base sa datos na ibinigay sa iyo (weather, diesel, score, trip history). Huwag mag-imbento ng data.
- Huwag baguhin o kontrahin ang GO / CAUTION / STAY na resulta ng app — ipaliwanag mo lang kung bakit ganoon.
- Kung STAY ang resulta at delikado ang dagat, huwag i-soften. Sabihin mong "Huwag muna."
- Gumamit ng casual na Filipino — Taglish okay, huwag masyadong pormal o makata.
- Maikli lang ang sagot — dalawa hanggang tatlong pangungusap lang kung pwede.
- Kung hindi mo alam o walang sapat na datos, sabihin mo na kailangan ng internet o mas detalyadong impormasyon.
- Ikaw ay friendly at supportive — para kang kasamahan sa bangka.`;
  }
  return `You are Pawi, TripWise's friendly sea-turtle mascot — a fishing decision assistant for small-scale fishers in Navotas and Manila Bay.

Rules:
- Answer ONLY based on the context data provided (weather, diesel, score, trip history). Never invent weather/price/safety data.
- Never override or contradict the GO / CAUTION / STAY result from the scoring engine — explain it, don't recompute it.
- If STAY and conditions are dangerous, be firm: "Stay. The sea isn't worth it today."
- Keep answers short — two to three sentences when possible.
- Use plain, practical language a municipal fisher would use.
- If you lack information to answer, say so clearly.
- You are warm and supportive — like a trustworthy crewmate.`;
}

async function generateAnswer(apiKey: string, question: string, ctx: Record<string, unknown>): Promise<string> {
  const lang = String(ctx.language ?? "en");
  const prompt = `Current fishing conditions and context:\n---\n${formatContext(ctx)}\n---\n\nFisher's question: ${question}`;
  const payload = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt(lang) }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  let lastErr = "Gemini request failed";
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: payload,
    });
    const raw = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      lastErr = raw.slice(0, 180);
      continue;
    }
    if (!res.ok) {
      const err = data.error as { message?: string } | undefined;
      lastErr = err?.message || `Gemini ${res.status}`;
      continue;
    }
    const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
    const text = candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) return text;
    lastErr = "Empty Gemini response";
  }
  throw new Error(lastErr);
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(data));
}

function isChatPath(url?: string) {
  if (!url) return false;
  try {
    const pathOnly = url.split("?")[0];
    return pathOnly === "/api/chat" || pathOnly.endsWith("/api/chat") || pathOnly.endsWith("/api/chat/");
  } catch {
    return url.includes("/api/chat");
  }
}

function readKeyFromDotenv(): string {
  try {
    const raw = readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i === -1) continue;
      if (trimmed.slice(0, i).trim() === "GEMINI_API_KEY") {
        return trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    /* no .env */
  }
  return "";
}

export function geminiChatPlugin(apiKeyFromEnv?: string): Plugin {
  const apiKey = apiKeyFromEnv || process.env.GEMINI_API_KEY || readKeyFromDotenv();

  const handler: Connect.NextHandleFunction = (req, res, next) => {
    if (!isChatPath(req.url)) {
      next();
      return;
    }
    if (req.method === "OPTIONS") {
      json(res, 200, { ok: true });
      return;
    }
    if (req.method === "GET") {
      json(res, 200, { ok: true, configured: Boolean(apiKey) });
      return;
    }
    if (req.method !== "POST") {
      next();
      return;
    }

    if (!apiKey) {
      json(res, 503, { error: "Gemini API key not configured" });
      return;
    }

    void (async () => {
      try {
        const body = JSON.parse(await readBody(req)) as { question?: string; context?: Record<string, unknown> };
        const question = (body.question || "").trim();
        if (!question) {
          json(res, 400, { error: "Missing question" });
          return;
        }
        const answer = await generateAnswer(apiKey, question, body.context || {});
        json(res, 200, { answer });
      } catch (e) {
        json(res, 502, { error: e instanceof Error ? e.message : "Gemini error" });
      }
    })();
  };

  return {
    name: "gemini-chat",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
