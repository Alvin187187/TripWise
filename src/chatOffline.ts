/**
 * Offline templated-response module.
 * Answers common questions using ONLY cached localStorage data.
 * No API calls are made in this module.
 */

import type { Lang } from "./i18n";
import type { ChatContext } from "./chatConfig";

interface OfflineResult {
  answer: string;
  matched: boolean;
}

// Simple keyword matcher — extend categories as needed
export function offlineRespond(question: string, ctx: ChatContext, lang: Lang): OfflineResult {
  const q = question.toLowerCase().trim();

  // ─── GO / CAUTION / STAY explanation ───────────────────────────────────────
  if (matchesAny(q, ["why go", "bakit go", "why caution", "bakit caution", "why stay", "bakit stay", "ano ibig sabihin", "what does the score mean", "explain the result", "ipaliwanag", "score", "verdict"])) {
    if (!ctx.latest_result) {
      return reply(lang === "fil"
        ? "Wala akong cached na resulta ngayon. Kailangan ng internet para ma-refresh."
        : "I don't have a cached result right now. Need internet to refresh.");
    }
    const { score, call, status } = ctx.latest_result;
    if (lang === "fil") {
      if (call === "GO") return reply(`Score ngayon: ${score}/100. GO — ${status}. Maganda ang kondisyon, sulit pumalaot.`);
      if (call === "CAUTION") return reply(`Score: ${score}/100. CAUTION — ${status}. Pwede pa pero mag-ingat, obserbahan ang alon at hangin bago umalis.`);
      return reply(`Score: ${score}/100. STAY — ${status}. Delikado o lugi ang biyahe ngayon. Huwag muna.`);
    }
    if (call === "GO") return reply(`Current score: ${score}/100. GO — ${status}. Conditions look favorable for a trip.`);
    if (call === "CAUTION") return reply(`Score: ${score}/100. CAUTION — ${status}. You can go but watch the waves and wind closely before leaving.`);
    return reply(`Score: ${score}/100. STAY — ${status}. Either dangerous or not worth the diesel today.`);
  }

  // ─── Cached weather ────────────────────────────────────────────────────────
  if (matchesAny(q, ["weather", "panahon", "alon", "waves", "wind", "hangin", "ulan", "rain", "tide", "tubig", "temperature", "temp", "kondisyon", "condition"])) {
    if (!ctx.latest_weather) {
      return reply(lang === "fil"
        ? "Walang cached na weather data. Kailangan ng internet para ma-fetch."
        : "No cached weather data available. Need internet to refresh.");
    }
    const w = ctx.latest_weather;
    if (lang === "fil") {
      return reply(`Cached na datos: ${w.condition}, ${w.temp}°C, hangin ${w.windKmh} km/h (${w.windLabel}), alon ${w.waveM}m, ulan ${w.rainChance}%, tide ${w.tideM}m (${w.tideTrend}).${w.gale ? " ⚠️ May gale warning!" : ""}`);
    }
    return reply(`Cached data: ${w.condition}, ${w.temp}°C, wind ${w.windKmh} km/h (${w.windLabel}), waves ${w.waveM}m, rain ${w.rainChance}%, tide ${w.tideM}m (${w.tideTrend}).${w.gale ? " ⚠️ Gale warning active!" : ""}`);
  }

  // ─── Fuel / diesel price ───────────────────────────────────────────────────
  if (matchesAny(q, ["diesel", "fuel", "gas", "presyo", "gasolina", "price", "magkano"])) {
    if (!ctx.fuel_price) {
      return reply(lang === "fil"
        ? "Walang cached na presyo ng diesel. Kailangan ng signal para i-check ang DOE."
        : "No cached diesel price. Need internet to check the DOE monitor.");
    }
    const d = ctx.fuel_price;
    const delta = d.dieselDeltaPct != null ? ` (${d.dieselDeltaPct > 0 ? "+" : ""}${d.dieselDeltaPct}% vs last)` : "";
    if (lang === "fil") {
      return reply(`Huling presyo ng diesel: ₱${d.diesel.toFixed(2)}/L${delta}. Source: ${d.dieselSource}.`);
    }
    return reply(`Last diesel price: ₱${d.diesel.toFixed(2)}/L${delta}. Source: ${d.dieselSource}.`);
  }

  // ─── Break-even / economics ────────────────────────────────────────────────
  if (matchesAny(q, ["break-even", "breakeven", "bawi", "sulit", "lugi", "profit", "kita", "economics", "cost", "gastos"])) {
    if (!ctx.fuel_price || !ctx.boat_profile) {
      return reply(lang === "fil"
        ? "Kulang ang datos para ma-compute ang break-even. I-setup muna ang profile at maghintay ng diesel price."
        : "Not enough data for break-even. Set up your profile and wait for a diesel price update.");
    }
    const lph: Record<string, number> = { small: 2.5, typical: 4.2, heavier: 6.5 };
    const rate = lph[ctx.boat_profile.motorClass] ?? 4.2;
    const fuelCost = rate * ctx.boat_profile.tripDuration * ctx.fuel_price.diesel;
    const breakKg = Math.ceil(fuelCost / 137); // tamban baseline
    if (lang === "fil") {
      return reply(`Motor mo: ${ctx.boat_profile.motorClass}, ${ctx.boat_profile.tripDuration} oras. Fuel cost ~₱${Math.round(fuelCost)}. Kailangan mo ~${breakKg} kg (tamban price) para ma-bawi ang diesel.`);
    }
    return reply(`Your ${ctx.boat_profile.motorClass} motor for ${ctx.boat_profile.tripDuration}h ≈ ₱${Math.round(fuelCost)} fuel. You need ~${breakKg} kg at tamban price to break even on diesel alone.`);
  }

  // ─── Safety contacts ───────────────────────────────────────────────────────
  if (matchesAny(q, ["sos", "emergency", "safety", "rescue", "coast guard", "tulong", "saklolo", "contact"])) {
    if (lang === "fil") {
      return reply("Emergency contacts:\n• Philippine Coast Guard: 0917-724-3682\n• PCG Navotas: (02) 8527-8481\n• NDRRMC: 911\n\nGamitin ang SOS button sa app para i-text ang pamilya mo.");
    }
    return reply("Emergency contacts:\n• Philippine Coast Guard: 0917-724-3682\n• PCG Navotas: (02) 8527-8481\n• NDRRMC: 911\n\nUse the SOS button in the app to text your family.");
  }

  // ─── No match ──────────────────────────────────────────────────────────────
  return {
    answer: lang === "fil"
      ? "Kailangan ng internet connection para dito. I-try mo ulit pag may signal ka na."
      : "This needs an internet connection. Try again when you're back online.",
    matched: false,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function matchesAny(input: string, keywords: string[]): boolean {
  return keywords.some((kw) => input.includes(kw));
}

function reply(text: string): OfflineResult {
  return { answer: text, matched: true };
}
