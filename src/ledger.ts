import type { IconName } from "./icons";

export type Verdict = "GO" | "CAUTION" | "STAY";
export type ExpenseCat = "Fuel" | "Food" | "Ice/Supplies" | "Gear/Repair" | "Other";
export type SpotCat = "spot" | "catch" | "danger" | "market" | "fuel" | "custom";
export type LedgerTab = "trips" | "ledger" | "budget";
export type BudgetPeriod = "weekly" | "monthly";

export interface CatchEntry {
  id: string;
  species: string;
  weightKg: number;
  pricePerKg: number;
  note: string;
}

export interface TripExpense {
  id: string;
  category: ExpenseCat;
  amount: number;
}

export interface TripRecord {
  id: string;
  date: string;
  location: string;
  lat: number;
  lng: number;
  path: number[][];
  verdict: Verdict;
  notes: string;
  catches: CatchEntry[];
  expenses: TripExpense[];
}

export interface SavedSpot {
  id: string;
  title: string;
  lat: number;
  lng: number;
  category: SpotCat;
  note: string;
  catchKg: string;
}

export interface Budget {
  period: BudgetPeriod;
  amount: number;
}

export const EXPENSE_CATS: ExpenseCat[] = ["Fuel", "Food", "Ice/Supplies", "Gear/Repair", "Other"];
export const SPECIES = ["Galunggong", "Tamban", "Tulingan", "Bangus", "Tilapia", "Sapsap", "Alumahan", "Lambat"];

export const SPOT_META: Record<SpotCat, { label: string; icon: IconName; color: string }> = {
  spot: { label: "Fishing Spot", icon: "map-marker", color: "#16A34A" },
  catch: { label: "Good Catch", icon: "fish", color: "#1A6BAD" },
  danger: { label: "Dangerous Area", icon: "alert", color: "#DC2626" },
  market: { label: "Fish Market", icon: "store", color: "#B45309" },
  fuel: { label: "Fuel / Supply", icon: "gas-station", color: "#0E4C81" },
  custom: { label: "Custom", icon: "map-marker-plus", color: "#7C3AED" },
};

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function tripIncome(t: TripRecord) {
  return t.catches.reduce((s, c) => s + Math.round(c.weightKg * c.pricePerKg), 0);
}

export function tripCatchKg(t: TripRecord) {
  return Math.round(t.catches.reduce((s, c) => s + c.weightKg, 0) * 10) / 10;
}

export function tripExpenseTotal(t: TripRecord) {
  return t.expenses.reduce((s, e) => s + e.amount, 0);
}

export function tripProfit(t: TripRecord) {
  return tripIncome(t) - tripExpenseTotal(t);
}

export function lastCatchTrip(trips: TripRecord[]) {
  return trips
    .filter((t) => tripCatchKg(t) > 0)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export function fmtP(n: number) {
  const abs = Math.abs(Math.round(n));
  const sign = n < 0 ? "-" : "";
  return `${sign}₱${abs.toLocaleString()}`;
}

export function fmtSignedP(n: number) {
  const abs = Math.abs(Math.round(n));
  if (n > 0) return `+₱${abs.toLocaleString()}`;
  if (n < 0) return `−₱${abs.toLocaleString()}`;
  return "₱0";
}

export function seedTrips(): TripRecord[] {
  return [
    {
      id: "t-23",
      date: "2026-08-23",
      location: "Tangos Shoal",
      lat: 14.6694,
      lng: 120.9478,
      path: [[120.933, 14.639], [120.94, 14.652], [120.948, 14.669]],
      verdict: "GO",
      notes: "Mild north swell, slack tide. Good lambat set.",
      catches: [{ id: "c-23", species: "Lambat", weightKg: 11, pricePerKg: 137, note: "Morning haul" }],
      expenses: [
        { id: "e-23a", category: "Fuel", amount: 1120 },
        { id: "e-23b", category: "Ice/Supplies", amount: 200 },
        { id: "e-23c", category: "Food", amount: 150 },
      ],
    },
    {
      id: "t-21",
      date: "2026-08-21",
      location: "Tangos Shoal",
      lat: 14.6694,
      lng: 120.9478,
      path: [[120.933, 14.639], [120.94, 14.652], [120.948, 14.669]],
      verdict: "GO",
      notes: "",
      catches: [{ id: "c-21", species: "Lambat", weightKg: 11, pricePerKg: 137, note: "" }],
      expenses: [{ id: "e-21", category: "Fuel", amount: 1120 }],
    },
    {
      id: "t-19",
      date: "2026-08-19",
      location: "Navotas landing",
      lat: 14.639,
      lng: 120.933,
      path: [],
      verdict: "STAY",
      notes: "Waves too high. Did not leave.",
      catches: [],
      expenses: [],
    },
    {
      id: "t-18",
      date: "2026-08-18",
      location: "Navotas Coast Deep",
      lat: 14.655,
      lng: 120.928,
      path: [[120.933, 14.639], [120.928, 14.655]],
      verdict: "CAUTION",
      notes: "Short run. Wind picked up after 8.",
      catches: [{ id: "c-18", species: "Tamban", weightKg: 8.5, pricePerKg: 137, note: "" }],
      expenses: [
        { id: "e-18a", category: "Fuel", amount: 980 },
        { id: "e-18b", category: "Food", amount: 140 },
      ],
    },
    {
      id: "t-15",
      date: "2026-08-15",
      location: "Binuangan Boundary",
      lat: 14.62,
      lng: 120.905,
      path: [[120.933, 14.639], [120.92, 14.628], [120.905, 14.62]],
      verdict: "GO",
      notes: "",
      catches: [{ id: "c-15", species: "Tulingan", weightKg: 12.2, pricePerKg: 137, note: "" }],
      expenses: [{ id: "e-15", category: "Fuel", amount: 1120 }],
    },
  ];
}

export function prettyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString("en-PH", { day: "numeric", month: "short" });
}

export function applyCatchToTrips(
  trips: TripRecord[],
  input: {
    date: string;
    location: string;
    lat: number;
    lng: number;
    species: string;
    weightKg: number;
    pricePerKg: number;
    note: string;
    verdict?: Verdict;
  },
): TripRecord[] {
  const catchRow: CatchEntry = {
    id: uid(),
    species: input.species,
    weightKg: input.weightKg,
    pricePerKg: input.pricePerKg,
    note: input.note,
  };
  const idx = trips.findIndex((t) => t.date === input.date);
  if (idx >= 0) {
    const next = trips.slice();
    const cur = next[idx];
    next[idx] = {
      ...cur,
      location: input.location || cur.location,
      lat: input.lat || cur.lat,
      lng: input.lng || cur.lng,
      notes: input.note || cur.notes,
      catches: [...cur.catches, catchRow],
    };
    return next;
  }
  return [
    {
      id: uid(),
      date: input.date,
      location: input.location,
      lat: input.lat,
      lng: input.lng,
      path: input.lat ? [[120.933, 14.639], [input.lng, input.lat]] : [],
      verdict: input.verdict ?? "GO",
      notes: input.note,
      catches: [catchRow],
      expenses: [],
    },
    ...trips,
  ];
}

export function addExpenseToTrip(trips: TripRecord[], tripId: string, category: ExpenseCat, amount: number): TripRecord[] {
  return trips.map((t) =>
    t.id === tripId ? { ...t, expenses: [...t.expenses, { id: uid(), category, amount }] } : t,
  );
}

export function summarizeJourney(trips: TripRecord[]) {
  const n = Math.max(trips.length, 1);
  const income = trips.reduce((s, t) => s + tripIncome(t), 0);
  const expenses = trips.reduce((s, t) => s + tripExpenseTotal(t), 0);
  const kg = trips.reduce((s, t) => s + tripCatchKg(t), 0);
  const paid = trips.filter((t) => tripProfit(t) > 0).length;
  const go = trips.filter((t) => t.verdict === "GO").length;
  const caution = trips.filter((t) => t.verdict === "CAUTION").length;
  const stay = trips.filter((t) => t.verdict === "STAY").length;
  const best = trips.length ? trips.reduce((top, t) => (tripProfit(t) > tripProfit(top) ? t : top), trips[0]) : null;
  const species: Record<string, number> = {};
  const cats: Record<string, number> = {};
  const grounds: Record<string, { kg: number; profit: number; trips: number }> = {};
  trips.forEach((t) => {
    t.catches.forEach((c) => { species[c.species] = (species[c.species] || 0) + c.weightKg; });
    t.expenses.forEach((e) => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
    const g = grounds[t.location] || { kg: 0, profit: 0, trips: 0 };
    g.kg += tripCatchKg(t);
    g.profit += tripProfit(t);
    g.trips += 1;
    grounds[t.location] = g;
  });
  const topFish = Object.entries(species).sort((a, b) => b[1] - a[1])[0];
  const bestGround = Object.entries(grounds).sort((a, b) => b[1].kg - a[1].kg)[0];
  const fuel = cats.Fuel || 0;
  return {
    income,
    expenses,
    profit: income - expenses,
    avgIncome: Math.round(income / n),
    avgCost: Math.round(expenses / n),
    avgProfit: Math.round((income - expenses) / n),
    avgKg: Math.round((kg / n) * 10) / 10,
    avgKgOut: (() => {
      const out = trips.filter((t) => tripCatchKg(t) > 0);
      if (!out.length) return 0;
      const outKg = out.reduce((s, t) => s + tripCatchKg(t), 0);
      return Math.round((outKg / out.length) * 10) / 10;
    })(),
    pesoPerKg: kg ? Math.round(income / kg) : 0,
    pesoBack: expenses ? Math.round((income / expenses) * 100) / 100 : 0,
    totalKg: Math.round(kg * 10) / 10,
    paid,
    tripCount: trips.length,
    go,
    caution,
    stay,
    best,
    topFish: topFish ? topFish[0] : "—",
    topFishKg: topFish ? Math.round(topFish[1] * 10) / 10 : 0,
    fuelShare: expenses ? Math.round((fuel / expenses) * 100) : 0,
    cats,
    grounds,
    bestGround: bestGround ? bestGround[0] : "—",
    bestGroundKg: bestGround ? Math.round(bestGround[1].kg * 10) / 10 : 0,
    bestGroundTrips: bestGround ? bestGround[1].trips : 0,
  };
}
