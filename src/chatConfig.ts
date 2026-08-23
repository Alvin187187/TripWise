/**
 * Shared chatbot configuration — single source of truth for persona,
 * system prompt, and context schema used by BOTH online and
 * offline (template) modes.
 */

import type { Lang } from "./i18n";

// ─── Context schema passed to the LLM / used by offline templates ─────────────
export interface ChatContext {
  boat_profile: {
    name: string;
    motorClass: string;
    tripDuration: number;
    fishingGround: string;
    gear: string;
  } | null;
  latest_weather: {
    temp: number;
    windKmh: number;
    windLabel: string;
    waveM: number;
    waveNote: string;
    rainChance: number;
    tideM: number;
    tideTrend: string;
    condition: string;
    gale: boolean;
    galeText: string;
    sunrise: string;
    sunset: string;
  } | null;
  latest_result: {
    score: number;
    call: "GO" | "CAUTION" | "STAY";
    status: string;
  } | null;
  fuel_price: {
    diesel: number;
    dieselDeltaPct: number | null;
    dieselSource: string;
  } | null;
  timestamp: string;
  language: Lang;
}

// ─── System prompt ────────────────────────────────────────────────────────────
export function systemPrompt(lang: Lang): string {
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

// ─── Build context from app state ─────────────────────────────────────────────
export function buildChatContext(
  profile: { name: string; motorClass: string; tripDuration: number; fishingGround: string; gear: string } | null,
  live: {
    temp: number; windKmh: number; windLabel: string; waveM: number; waveNote: string;
    rainChance: number; tideM: number; tideTrend: string; condition: string;
    gale: boolean; galeText: string; sunrise: string; sunset: string;
    score: number; call: "GO" | "CAUTION" | "STAY"; status: string;
    diesel: number; dieselDeltaPct: number | null; dieselSource: string;
  } | null,
  lang: Lang,
): ChatContext {
  return {
    boat_profile: profile
      ? { name: profile.name, motorClass: profile.motorClass, tripDuration: profile.tripDuration, fishingGround: profile.fishingGround, gear: profile.gear }
      : null,
    latest_weather: live
      ? { temp: live.temp, windKmh: live.windKmh, windLabel: live.windLabel, waveM: live.waveM, waveNote: live.waveNote, rainChance: live.rainChance, tideM: live.tideM, tideTrend: live.tideTrend, condition: live.condition, gale: live.gale, galeText: live.galeText, sunrise: live.sunrise, sunset: live.sunset }
      : null,
    latest_result: live
      ? { score: live.score, call: live.call, status: live.status }
      : null,
    fuel_price: live
      ? { diesel: live.diesel, dieselDeltaPct: live.dieselDeltaPct, dieselSource: live.dieselSource }
      : null,
    timestamp: new Date().toISOString(),
    language: lang,
  };
}
