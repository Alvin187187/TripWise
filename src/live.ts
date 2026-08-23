import { useEffect, useState } from "react";

export const BAY = { lat: 14.639, lng: 120.933 };
const CACHE_KEY = "tripwise-live-v1";
const TZ = "Asia/Manila";

export type TripCall = "GO" | "CAUTION" | "STAY";

export interface HourPoint {
  time: string;
  label: string;
  temp: number;
  humid: number;
  wind: number;
  rain: number;
  wave: number;
  tide: number;
}

export interface DayPoint {
  date: string;
  day: string;
  temp: number;
  rain: number;
  wind: number;
  code: number;
}

export interface BiteWindow {
  start: Date;
  end: Date;
  label: string;
}

export interface LiveBundle {
  fetchedAt: string;
  temp: number;
  feels: number;
  code: number;
  condition: string;
  rainChance: number;
  humidity: number;
  visibilityKm: number | null;
  windKmh: number;
  windDir: number;
  windLabel: string;
  waveM: number;
  waveNote: string;
  tideM: number;
  tideTrend: "Rising" | "Falling" | "Slack";
  tideNext: string;
  highTide: { m: number; at: string };
  lowTide: { m: number; at: string };
  sunrise: string;
  sunset: string;
  hourly: HourPoint[];
  daily: DayPoint[];
  majorBite: BiteWindow | null;
  minorBite: BiteWindow | null;
  diesel: number;
  dieselDeltaPct: number | null;
  dieselSource: string;
  gale: boolean;
  galeText: string;
  score: number;
  call: TripCall;
  status: string;
}

function wmoLabel(code: number) {
  if (code === 0) return "Clear skies";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Mist / fog";
  if (code <= 55) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Showers";
  if (code <= 82) return "Heavy rain";
  if (code <= 99) return "Thunderstorm";
  return "Overcast";
}

function windWord(kmh: number) {
  if (kmh < 12) return "Light breezes";
  if (kmh < 20) return "Moderate";
  if (kmh < 29) return "Fresh";
  if (kmh < 40) return "Strong";
  if (kmh < 62) return "Near gale";
  return "Gale force";
}

function dirWord(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function hourLabel(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const am = h < 12;
  const hr = h % 12 || 12;
  if (h === 0) return "12A";
  if (h === 12) return "12P";
  return `${hr}${am ? "AM" : "PM"}`.replace(/AM|PM/, (m) => (hr >= 10 ? m[0] : m));
}

export function fmtClock(d: Date) {
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ });
}

function asDate(v: Date | string) {
  return v instanceof Date ? v : new Date(v);
}

export function fmtBite(w: BiteWindow | null) {
  if (!w) return "Calculating…";
  const start = asDate(w.start);
  const end = asDate(w.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Calculating…";
  return `${fmtClock(start)} – ${fmtClock(end)}`;
}

export function prettyWhen(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });
}

export function greeting() {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: TZ }));
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function parseIso(v: string | null | undefined) {
  if (!v || v === "undefined") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addHours(d: Date, h: number) {
  return new Date(d.getTime() + h * 3600 * 1000);
}

function biteFromMoon(moonrise: string | null, moonset: string | null): { major: BiteWindow | null; minor: BiteWindow | null } {
  const rise = parseIso(moonrise ?? undefined);
  const set = parseIso(moonset ?? undefined);
  let major: BiteWindow | null = null;
  let minor: BiteWindow | null = null;
  if (rise && set) {
    const span = set.getTime() - rise.getTime();
    const transit = new Date(rise.getTime() + (span > 0 ? span : span + 24 * 3600 * 1000) / 2);
    major = { start: addHours(transit, -1), end: addHours(transit, 1), label: "Moon overhead" };
    minor = { start: addHours(rise, -0.4), end: addHours(rise, 0.4), label: "Moonrise" };
  } else if (rise) {
    major = { start: addHours(rise, -1), end: addHours(rise, 1), label: "Moonrise" };
  } else if (set) {
    major = { start: addHours(set, -1), end: addHours(set, 1), label: "Moonset" };
  }
  return { major, minor };
}

function nearestIndex(times: string[], target = Date.now()) {
  let best = 0;
  let dist = Infinity;
  times.forEach((t, i) => {
    const d = Math.abs(new Date(t).getTime() - target);
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  return best;
}

function scoreLive(input: {
  waveM: number;
  windKmh: number;
  rainChance: number;
  gale: boolean;
  tideTrend: LiveBundle["tideTrend"];
  diesel: number;
}) {
  let score = 88;
  let call: TripCall = "GO";
  if (input.gale || input.windKmh >= 62 || input.waveM >= 2) {
    return { score: input.gale ? 16 : 24, call: "STAY" as TripCall, status: "STAY — SEA IS NOT WORTH IT" };
  }
  if (input.waveM >= 1.5) {
    score -= 22;
    call = "CAUTION";
  } else if (input.waveM >= 1.1) score -= 10;
  if (input.windKmh >= 40) {
    score -= 18;
    call = "CAUTION";
  } else if (input.windKmh >= 28) score -= 8;
  if (input.rainChance >= 70) score -= 14;
  else if (input.rainChance >= 45) score -= 7;
  if (input.tideTrend === "Falling") score -= 4;
  if (input.diesel >= 80) score -= 5;
  score = Math.max(8, Math.min(99, Math.round(score)));
  if (score < 48) call = "STAY";
  else if (score < 72 && call === "GO") call = "CAUTION";
  const status =
    call === "GO" ? "GOOD TRIP INDICATION" : call === "CAUTION" ? "CAUTION — CHECK THE SEA" : "STAY — NOT WORTH IT";
  return { score, call, status };
}

async function readText(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.text();
}

async function fetchGale() {
  try {
    const text = await readText("https://r.jina.ai/https://www.pagasa.dost.gov.ph/marine/gale-warning");
    const body = text.toLowerCase();
    const none = body.includes("no gale warning issued") || body.includes("there is no gale warning");
    const west = /manila bay|west of luzon|western seaboard of luzon|metro manila/.test(body);
    const gale = !none && (west || /gale warning nr|gale warning no/.test(body));
    const line = (text.match(/As of today,[^\n.]+[.\n]/i) || text.match(/Gale Warning[^\n]+/i) || ["PAGASA gale desk"])[0].trim();
    return { gale, text: none ? "No gale warning issued (PAGASA)" : line.slice(0, 140) };
  } catch {
    return null;
  }
}

function dieselFromDoeText(text: string) {
  const common = text.match(/Diesel\s+(\d{2,3}\.\d{2})\s+(\d{2,3}\.\d{2})\s+(\d{2,3}\.\d{2})/i);
  if (common) return Number(common[3]);
  const block = text.match(/DIESEL(?!\s+PLUS)[^\n]{0,280}/i);
  const nums = (block?.[0] || "")
    .match(/\b(?:5\d|6\d|7\d|8\d|9\d|1[01]\d)\.\d{1,2}\b/g)
    ?.map(Number)
    .filter((n) => n >= 47 && n <= 145) ?? [];
  if (!nums.length) return null;
  nums.sort((a, b) => a - b);
  return nums[Math.floor(nums.length / 2)];
}

function doeMonitorUrls() {
  const urls: string[] = [];
  const cursor = new Date();
  while (cursor.getDay() !== 2) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 8; i++) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i * 7);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    urls.push(`https://r.jina.ai/https://prod-cms.doe.gov.ph/documents/d/guest/ncr-price-monitoring-${mm}${dd}${d.getFullYear()}-pdf`);
  }
  urls.push(
    "https://r.jina.ai/https://prod-cms.doe.gov.ph/documents/d/guest/ncr-price-monitoring-07212026-pdf",
    "https://r.jina.ai/https://prod-cms.doe.gov.ph/documents/d/guest/oil-monitor-as-of-07-july-2026-pdf",
  );
  return [...new Set(urls)];
}

async function fetchDiesel(): Promise<{ price: number; source: string } | null> {
  const hits = await Promise.all(
    doeMonitorUrls().map(async (url) => {
      try {
        const price = dieselFromDoeText(await readText(url));
        return price ? { price, source: "DOE NCR common diesel" } : null;
      } catch {
        return null;
      }
    }),
  );
  return hits.find((hit) => hit !== null) ?? null;
}

export async function loadLive(): Promise<LiveBundle> {
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${BAY.lat}&longitude=${BAY.lng}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation_probability,relative_humidity_2m,visibility` +
    `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability` +
    `&daily=sunrise,sunset,moonrise,moonset,moon_phase,weather_code,temperature_2m_max,precipitation_probability_max,wind_speed_10m_max` +
    `&timezone=${encodeURIComponent(TZ)}&forecast_days=7`;
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${BAY.lat}&longitude=${BAY.lng}` +
    `&current=wave_height,wave_period,wind_wave_height` +
    `&hourly=wave_height,sea_level_height_msl` +
    `&timezone=${encodeURIComponent(TZ)}&forecast_days=2`;

  const [forecastRes, marineRes, galeRes, dieselRes] = await Promise.all([
    fetch(forecastUrl).then((r) => r.json()),
    fetch(marineUrl).then((r) => r.json()),
    fetchGale(),
    fetchDiesel(),
  ]);

  const cur = forecastRes.current ?? {};
  const daily = forecastRes.daily ?? {};
  const hourly = forecastRes.hourly ?? {};
  const mCur = marineRes.current ?? {};
  const mHour = marineRes.hourly ?? {};

  const hi = nearestIndex(hourly.time || [new Date().toISOString()]);
  const mi = nearestIndex(mHour.time || hourly.time || [new Date().toISOString()]);
  const tideNow = Number(mHour.sea_level_height_msl?.[mi] ?? 0);
  const tideNext = Number(mHour.sea_level_height_msl?.[mi + 1] ?? tideNow);
  const tideDiff = tideNext - tideNow;
  const tideTrend: LiveBundle["tideTrend"] = Math.abs(tideDiff) < 0.02 ? "Slack" : tideDiff > 0 ? "Rising" : "Falling";

  const tideSeries = (mHour.sea_level_height_msl || []).map((m: number, i: number) => ({ m, t: mHour.time[i] }));
  const today = (daily.time?.[0] || "").slice(0, 10);
  const todayTides = tideSeries.filter((x: { t: string }) => String(x.t).startsWith(today));
  const high = todayTides.reduce((a: { m: number; t: string }, b: { m: number; t: string }) => (b.m > a.m ? b : a), todayTides[0] || { m: tideNow, t: mHour.time?.[mi] });
  const low = todayTides.reduce((a: { m: number; t: string }, b: { m: number; t: string }) => (b.m < a.m ? b : a), todayTides[0] || { m: tideNow, t: mHour.time?.[mi] });

  const hours: HourPoint[] = (hourly.time || []).slice(0, 24).map((t: string, i: number) => ({
    time: t,
    label: hourLabel(t),
    temp: Number(hourly.temperature_2m?.[i] ?? 0),
    humid: Number(hourly.relative_humidity_2m?.[i] ?? 0),
    wind: Number(hourly.wind_speed_10m?.[i] ?? 0),
    rain: Number(hourly.precipitation_probability?.[i] ?? 0),
    wave: Number(mHour.wave_height?.[nearestIndex(mHour.time || [], new Date(t).getTime())] ?? 0),
    tide: Number(mHour.sea_level_height_msl?.[nearestIndex(mHour.time || [], new Date(t).getTime())] ?? 0),
  }));

  const days: DayPoint[] = (daily.time || []).map((d: string, i: number) => ({
    date: d,
    day: new Date(d + "T12:00:00").toLocaleDateString("en-PH", { weekday: "short", timeZone: TZ }),
    temp: Number(daily.temperature_2m_max?.[i] ?? 0),
    rain: Number(daily.precipitation_probability_max?.[i] ?? 0),
    wind: Number(daily.wind_speed_10m_max?.[i] ?? 0),
    code: Number(daily.weather_code?.[i] ?? 0),
  }));

  const { major, minor } = biteFromMoon(daily.moonrise?.[0], daily.moonset?.[0]);
  const diesel = dieselRes?.price ?? 68;
  let dieselDeltaPct: number | null = null;
  try {
    const prev = localStorage.getItem("tripwise-diesel");
    if (prev) {
      const old = Number(prev);
      if (old > 0) dieselDeltaPct = Math.round(((diesel - old) / old) * 1000) / 10;
    }
    localStorage.setItem("tripwise-diesel", String(diesel));
  } catch {
    /* ignore */
  }

  const windKmh = Number(cur.wind_speed_10m ?? 0);
  const waveM = Number(mCur.wave_height ?? 0.8);
  const rainChance = Number(cur.precipitation_probability ?? hourly.precipitation_probability?.[hi] ?? 0);
  const derivedGale = windKmh >= 62 || waveM >= 2.5;
  const gale = Boolean(galeRes?.gale || derivedGale);
  const galeText = galeRes?.text || (derivedGale ? "Gale-strength wind/waves on the marine model" : "No gale warning found");

  const scored = scoreLive({ waveM, windKmh, rainChance, gale, tideTrend, diesel });
  const vis = cur.visibility != null ? Math.round(Number(cur.visibility) / 1000) : null;

  const bundle: LiveBundle = {
    fetchedAt: new Date().toISOString(),
    temp: Math.round(Number(cur.temperature_2m ?? 0)),
    feels: Math.round(Number(cur.apparent_temperature ?? cur.temperature_2m ?? 0)),
    code: Number(cur.weather_code ?? 0),
    condition: wmoLabel(Number(cur.weather_code ?? 0)),
    rainChance: Math.round(rainChance),
    humidity: Math.round(Number(cur.relative_humidity_2m ?? hourly.relative_humidity_2m?.[hi] ?? 0)),
    visibilityKm: vis,
    windKmh: Math.round(windKmh * 10) / 10,
    windDir: Number(cur.wind_direction_10m ?? 0),
    windLabel: `${windWord(windKmh)} · ${dirWord(Number(cur.wind_direction_10m ?? 0))}`,
    waveM: Math.round(waveM * 100) / 100,
    waveNote: waveM < 1 ? "Safe under 2.0m" : waveM < 2 ? "Caution under 2.0m" : "Over safe limit",
    tideM: Math.round(tideNow * 100) / 100,
    tideTrend,
    tideNext: mHour.time?.[mi + 1] ? fmtClock(new Date(mHour.time[mi + 1])) : "—",
    highTide: { m: Math.round((high?.m ?? tideNow) * 100) / 100, at: high?.t ? fmtClock(new Date(high.t)) : "—" },
    lowTide: { m: Math.round((low?.m ?? tideNow) * 100) / 100, at: low?.t ? fmtClock(new Date(low.t)) : "—" },
    sunrise: daily.sunrise?.[0] ? fmtClock(new Date(daily.sunrise[0])) : "—",
    sunset: daily.sunset?.[0] ? fmtClock(new Date(daily.sunset[0])) : "—",
    hourly: hours,
    daily: days,
    majorBite: major,
    minorBite: minor,
    diesel,
    dieselDeltaPct,
    dieselSource: dieselRes?.source ?? "Cached / last known DOE",
    gale,
    galeText,
    ...scored,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(bundle));
  } catch {
    /* ignore */
  }
  return bundle;
}

function readCache(): LiveBundle | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as LiveBundle) : null;
  } catch {
    return null;
  }
}

export function useLive() {
  const [data, setData] = useState<LiveBundle | null>(() => readCache());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!readCache());

  useEffect(() => {
    let alive = true;
    loadLive()
      .then((bundle) => {
        if (!alive) return;
        setData(bundle);
        setError(null);
      })
      .catch((err: Error) => {
        if (!alive) return;
        setError(err.message || "Live feed failed");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { data, error, loading };
}
