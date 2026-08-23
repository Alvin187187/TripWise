import React, { useState, useCallback, useRef, useEffect } from "react";
import { logoOnNavy, mascotCatch, mascotFront, mascotHistory, mascotHome, mascotLanding, mascotOnboarding, mascotSettings, mascotWhatIf, photos } from "./assets/media";
import HistoryScreen from "./HistoryScreen";
import Icon, { type IconName } from "./icons";
import MapScreen from "./MapScreen";
import LedgerScreen from "./LedgerScreen";
import { applyCatchToTrips, fmtP, seedTrips, summarizeJourney, type Budget, type SavedSpot, type TripRecord } from "./ledger";

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = "landing" | "login" | "onboarding" | "home" | "weather" | "math" | "whatif" | "map" | "catchlog" | "history" | "reference" | "settings";
type Verdict = "GO" | "CAUTION" | "STAY";
type MotorClass = "small" | "typical" | "heavier";
type Lang = "en" | "fil";

interface FisherProfile {
  name: string;
  language: Lang;
  motorClass: MotorClass;
  tripDuration: number;
  fishingGround: string;
  gear: string;
  extraGrounds: string[];
  extraHours: number[];
  extraGear: string[];
}

// ─── Blue & White eye-friendly light theme ────────────────────────────────────
const C = {
  bg:           "#E8F3FC",
  surface:      "#FFFFFF",
  card:         "#FFFFFF",
  cardAlt:      "#F2F8FE",
  header:       "#0E4C81",   // deep blue header bar
  headerLight:  "#1A6BAD",
  blue:         "#1A6BAD",   // primary interactive
  blueMid:      "#2685CE",
  blueLight:    "#D4E9F8",
  blueFaint:    "#ECF5FF",
  blueTint:     "#F0F7FF",
  border:       "#C2D9EF",
  borderLight:  "#DBECf8",
  text:         "#0B2237",
  textSub:      "#40627E",
  textFaint:    "#86A8C2",
  muted:        "#6E97B5",
  // Verdict — safety-critical
  go:           "#16A34A",
  goBg:         "#F0FDF4",
  goBorder:     "#86EFAC",
  goText:       "#14532D",
  caution:      "#B45309",
  cautionBg:    "#FFFBEB",
  cautionBorder:"#FCD34D",
  stay:         "#DC2626",
  stayBg:       "#FEF2F2",
  stayBorder:   "#FECACA",
} as const;

const MOTOR_LPH: Record<MotorClass, number> = { small: 2.5, typical: 4.2, heavier: 6.5 };
const DIESEL_PRICE = 68.00;
const TAMBAN_PRICE = 137;
const DEFAULT_GROUND = "Tangos (Navotas Coast)";

const FISHING_GROUNDS = [
  "Tangos (Navotas Coast)",
  "Manila Bay North",
  "Navotas Channel",
  "Bocaue River Mouth",
  "Dagat-dagatan",
  "Pamarawan Boundary",
];

const BASE_HOURS = [3, 4, 5, 8];
const BASE_GEAR = ["Gillnet / Lambat", "Kawil (Hook & Line)", "Palakol (Gill Net)", "Bintol (Trap)", "Trawl"];

function emptyExtras() {
  return { extraGrounds: [] as string[], extraHours: [] as number[], extraGear: [] as string[] };
}

function AddOther({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");

  function save() {
    const next = val.trim();
    if (!next) return;
    onAdd(next);
    setVal("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="setup-add" onClick={() => setOpen(true)}>
        + Add other
      </button>
    );
  }

  return (
    <div className="setup-addrow">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        className="slot setup-input"
        autoFocus
        onKeyDown={(e) => { if (e.key === "Enter") save(); }}
      />
      <button type="button" className="is-on" onClick={save}>Add</button>
      <button type="button" onClick={() => { setOpen(false); setVal(""); }}>Cancel</button>
    </div>
  );
}

const BFAR_DATA = [
  { species: "Galunggong", local: "Round Scad",      pMin: 130, pMax: 145, vol: 42, note: "High demand, stable arrivals" },
  { species: "Tamban",     local: "Sardinella",      pMin: 95,  pMax: 110, vol: 28, note: "Moderate schooling near Tangos" },
  { species: "Tulingan",   local: "Frigate Tuna",    pMin: 180, pMax: 220, vol: 15, note: "Limited offshore catch reported" },
  { species: "Bangus",     local: "Milkfish",        pMin: 160, pMax: 180, vol: 35, note: "From surrounding Bulacan pens" },
  { species: "Tilapia",    local: "Tilapia",         pMin: 120, pMax: 140, vol: 22, note: "Stable pricing this week" },
  { species: "Sapsap",     local: "Ponyfish",        pMin: 85,  pMax: 100, vol: 18, note: "High volume at Navotas Fish Port" },
  { species: "Alumahan",   local: "Indian Mackerel", pMin: 150, pMax: 170, vol: 12, note: "Fewer landings reported" },
];

const MAP_SPOTS = [
  { name: "Tangos Shoal",         dist: "2.4 km WSW", lastKg: 11.0, species: "Lambat", verdict: "GO"      as Verdict },
  { name: "Navotas Coast Deep",   dist: "4.1 km NW",  lastKg: 9.5,  species: "Tamban", verdict: "CAUTION" as Verdict },
  { name: "Binuangan Boundary",   dist: "7.1 km SW",  lastKg: 6.2,  species: "Tulingan", verdict: "STAY"  as Verdict },
];

// ─── Icons (Material Design via Iconify) ──────────────────────────────────────
function IcBack({ size=22, color=C.text }: { size?: number; color?: string }) {
  return <Icon name="arrow-left" size={size} color={color} />;
}
function IcChevD({ size=16, color=C.muted }: { size?: number; color?: string }) {
  return <Icon name="chevron-down" size={size} color={color} />;
}
function IcHome({ size=22, color=C.text }: { size?: number; color?: string }) {
  return <Icon name="home" size={size} color={color} />;
}
function IcMap({ size=22, color=C.text }: { size?: number; color?: string }) {
  return <Icon name="map" size={size} color={color} />;
}
function IcLog({ size=22, color=C.text }: { size?: number; color?: string }) {
  return <Icon name="clipboard-text" size={size} color={color} />;
}
function IcHistory({ size=22, color=C.text }: { size?: number; color?: string }) {
  return <Icon name="history" size={size} color={color} />;
}
function IcGear({ size=20, color=C.text }: { size?: number; color?: string }) {
  return <Icon name="cog" size={size} color={color} />;
}
function IcShare({ size=18, color=C.blue }: { size?: number; color?: string }) {
  return <Icon name="share-variant" size={size} color={color} />;
}
function IcSliders({ size=22, color=C.text }: { size?: number; color?: string }) {
  return <Icon name="tune" size={size} color={color} />;
}
function IcSun({ size=22, color=C.text }: { size?: number; color?: string }) {
  return <Icon name="weather-sunny" size={size} color={color} />;
}

function IconSlot({ name, size = 22, color = C.blue, title }: { name: IconName; size?: number; color?: string; title?: string }) {
  return <Icon name={name} size={size} color={color} title={title} />;
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function TripWiseLogo({ size=40 }: { size?: number }) {
  return (
    <img
      src={logoOnNavy}
      alt="TripWise"
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: size * 0.22, objectFit: "cover", flexShrink: 0, boxShadow: "4px 4px 8px rgba(14,76,129,0.28), inset 0 1px 0 rgba(255,255,255,0.22)" }}
    />
  );
}

function MascotSlot({ size = 160, alt = "TripWise mascot", src = "" }: { size?: number; alt?: string; src?: string }) {
  return <img alt={alt} src={src} className="mascot-slot" style={{ width: size, height: size }} />;
}

function PhotoWell({
  src, alt, wash = "navy", className = "", children,
}: {
  src?: string; alt: string; wash?: "navy" | "sky" | "sea" | "dawn"; className?: string; children?: React.ReactNode;
}) {
  const hasPhoto = Boolean(src);
  return (
    <div className={`photo-well photo-well--${wash} ${className}`}>
      {hasPhoto ? <img className="photo-well__img" src={src} alt={alt} /> : <div className="photo-well__fallback" aria-hidden />}
      {hasPhoto ? <div className="photo-well__wash" /> : null}
      {children ? <div className="photo-well__content">{children}</div> : null}
    </div>
  );
}

function MiniChart({ data, color, dense }: { data: number[]; color: string; dense?: boolean }) {
  const mx = Math.max(...data, 1);
  return (
    <div className={`chart-bars ${dense ? "chart-bars--dense" : ""}`}>
      {data.map((v, i) => (
        <div
          key={i}
          className="chart-bar"
          style={{ height: `${(v / mx) * 100}%`, background: color, animationDelay: `${i * 28}ms` }}
        />
      ))}
    </div>
  );
}

function SpeedGauge({ value }: { value: number }) {
  const r = 54;
  const track = Math.PI * r;
  const len = track * Math.min(100, Math.max(0, value)) / 100;
  return (
    <div className="speed-gauge" aria-label={`Pangisdaan score ${value} of 100`}>
      <svg width="148" height="92" viewBox="0 0 148 92">
        <path d="M 16 78 A 58 58 0 0 1 132 78" fill="none" stroke="#E4F2FC" strokeWidth="14" strokeLinecap="round" />
        <path
          className="speed-gauge__arc"
          d="M 16 78 A 58 58 0 0 1 132 78"
          fill="none"
          stroke="#1A6BAD"
          strokeWidth="14"
          strokeLinecap="round"
          style={{ ["--len" as string]: len, ["--track" as string]: track }}
        />
      </svg>
      <div className="speed-gauge__readout">
        <span className="speed-gauge__num">{value}</span>
        <span className="speed-gauge__den">/100</span>
      </div>
    </div>
  );
}

function Wx3D({ kind }: { kind: "sun" | "cloud" | "rain" | "wind" | "tide" | "tide-high" | "tide-low" | "humid" | "thermo" | "eye" | "rise" | "set" }) {
  if (kind === "sun") {
    return (
      <div className="wx3d wx3d--sun" aria-hidden>
        <span className="wx3d__sun" />
      </div>
    );
  }
  if (kind === "rise") {
    return (
      <div className="wx3d wx3d--rise" aria-hidden>
        <span className="wx3d__ray wx3d__ray--l" />
        <span className="wx3d__ray wx3d__ray--c" />
        <span className="wx3d__ray wx3d__ray--r" />
        <span className="wx3d__sun wx3d__sun--rise" />
        <span className="wx3d__horizon" />
      </div>
    );
  }
  if (kind === "set") {
    return (
      <div className="wx3d wx3d--set" aria-hidden>
        <span className="wx3d__sun wx3d__sun--set" />
        <span className="wx3d__horizon wx3d__horizon--dusk" />
        <span className="wx3d__glow" />
      </div>
    );
  }
  if (kind === "cloud") {
    return (
      <div className="wx3d wx3d--cloud" aria-hidden>
        <span className="wx3d__puff wx3d__puff--a" />
        <span className="wx3d__puff wx3d__puff--b" />
        <span className="wx3d__puff wx3d__puff--c" />
      </div>
    );
  }
  if (kind === "rain") {
    return (
      <div className="wx3d wx3d--rain" aria-hidden>
        <span className="wx3d__puff wx3d__puff--a" />
        <span className="wx3d__puff wx3d__puff--b" />
        <span className="wx3d__drop" />
        <span className="wx3d__drop wx3d__drop--b" />
        <span className="wx3d__drop wx3d__drop--c" />
      </div>
    );
  }
  if (kind === "wind") {
    return (
      <div className="wx3d wx3d--gust" aria-hidden>
        <span className="wx3d__sun wx3d__sun--tiny" />
        <span className="wx3d__puff wx3d__puff--b" />
        <span className="wx3d__swirl" />
        <span className="wx3d__swirl wx3d__swirl--b" />
      </div>
    );
  }
  if (kind === "tide" || kind === "tide-high") {
    return (
      <div className="wx3d wx3d--tide-high" aria-hidden>
        <span className="wx3d__arrow wx3d__arrow--up" />
        <span className="wx3d__swell wx3d__swell--hi" />
      </div>
    );
  }
  if (kind === "tide-low") {
    return (
      <div className="wx3d wx3d--tide-low" aria-hidden>
        <span className="wx3d__arrow wx3d__arrow--down" />
        <span className="wx3d__swell wx3d__swell--lo" />
      </div>
    );
  }
  if (kind === "humid") {
    return (
      <div className="wx3d wx3d--drop" aria-hidden>
        <span className="wx3d__blob" />
      </div>
    );
  }
  if (kind === "thermo") {
    return (
      <div className="wx3d wx3d--thermo" aria-hidden>
        <span className="wx3d__tube" />
        <span className="wx3d__bulb" />
      </div>
    );
  }
  return (
    <div className="wx3d wx3d--eye" aria-hidden>
      <span className="wx3d__oval" />
      <span className="wx3d__pupil" />
    </div>
  );
}

function WindVane({ dir }: { dir: string }) {
  const deg: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
  return (
    <div className="wind-vane" style={{ transform: `rotate(${deg[dir] ?? 0}deg)` }} aria-label={dir}>
      <span className="wind-vane__shaft" />
      <span className="wind-vane__head" />
    </div>
  );
}

function TideGraph({ points }: { points: number[] }) {
  const w = 320;
  const h = 118;
  const padL = 28;
  const padR = 8;
  const padT = 18;
  const padB = 22;
  const max = Math.max(...points, 1);
  const min = 0;
  const span = max - min || 1;
  const xs = points.map((_, i) => padL + (i / (points.length - 1)) * (w - padL - padR));
  const ys = points.map((v) => padT + (1 - (v - min) / span) * (h - padT - padB));
  const pts = xs.map((x, i) => ({ x, y: ys[i] }));
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  const hi = 15;
  const lo = 9;
  const ticks = [0, 2, 4];
  return (
    <svg className="tide-graph" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Tide level over 24 hours">
      {ticks.map((ft) => {
        const y = padT + (1 - ft / span) * (h - padT - padB);
        return (
          <g key={ft}>
            <line className="tide-graph__grid" x1={padL} y1={y} x2={w - padR} y2={y} />
            <text className="tide-graph__tick" x={padL - 6} y={y + 3}>{ft} ft</text>
          </g>
        );
      })}
      <path className="tide-graph__fill" d={`${d} L ${w - padR} ${h - padB} L ${padL} ${h - padB} Z`} />
      <path className="tide-graph__line" d={d} />
      <circle className="tide-graph__dot tide-graph__dot--hi" cx={pts[hi].x} cy={pts[hi].y} r="4.5" />
      <circle className="tide-graph__dot tide-graph__dot--lo" cx={pts[lo].x} cy={pts[lo].y} r="4.5" />
      <text className="tide-graph__mark" x={pts[hi].x} y={pts[hi].y - 8}>High</text>
      <text className="tide-graph__mark tide-graph__mark--lo" x={pts[lo].x} y={pts[lo].y + 14}>Low</text>
      {["12A", "6AM", "12P", "6PM", "12A"].map((label, i) => (
        <text key={label + i} className="tide-graph__axis" x={padL + i * ((w - padL - padR) / 4)} y={h - 4}>{label}</text>
      ))}
    </svg>
  );
}

function Seascape({ iconAlt = "Weather", photo }: { iconAlt?: string; photo?: string }) {
  const icon = (
    <span className="seascape__icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name="weather-partly-cloudy" size={22} color="#fff" title={iconAlt} />
    </span>
  );
  if (photo) {
    return (
      <PhotoWell src={photo} alt={iconAlt} wash="sky">
        {icon}
      </PhotoWell>
    );
  }
  return (
    <div className="seascape">
      {icon}
      <div className="seascape__sun" />
      <div className="seascape__hill seascape__hill--a" />
      <div className="seascape__ocean" />
      <div className="seascape__hill seascape__hill--b" />
    </div>
  );
}

function SceneCard({ visual, children, tall, compact, badge }: { visual: React.ReactNode; children: React.ReactNode; tall?: boolean; compact?: boolean; badge?: React.ReactNode }) {
  return (
    <article className="scene-card">
      <div className={`scene-card__visual ${tall ? "scene-card__visual--tall" : ""} ${compact ? "scene-card__visual--compact" : ""}`}>
        {visual}
        <div className="scene-card__shine" />
        {badge && <div className="scene-card__badge">{badge}</div>}
      </div>
      <div className="scene-card__body">{children}</div>
    </article>
  );
}

function KeyBtn({
  children, onClick, disabled, variant = "primary", size = "md", block, className = "", style, type = "button",
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "primary" | "go" | "surface" | "ghost" | "danger" | "chip";
  size?: "sm" | "md" | "lg"; block?: boolean; className?: string; style?: React.CSSProperties; type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`key-btn key-btn--${variant} key-btn--${size} ${block ? "key-btn--block" : ""} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function SkyToys() {
  return (
    <div className="sky-toys" aria-hidden>
      <div className="cloud-front"><span className="puff-l" /><span className="puff-r" /></div>
      <span className="sun-glow" />
      <span className="sun-ball" />
      <div className="cloud-back"><span className="puff-l" /><span className="puff-r" /></div>
    </div>
  );
}

function SpinSun() {
  return (
    <div className="spin-sun" aria-hidden>
      <div className="spin-sun__core" />
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="spin-sun__ray" style={{ transform: `rotate(${i * 45}deg)` }} />
      ))}
    </div>
  );
}

function MoonOnly() {
  return (
    <div className="moon-only" aria-hidden>
      <span className="moon-only__crater" style={{ width: 11, height: 11, top: 14, left: 12 }} />
      <span className="moon-only__crater" style={{ width: 15, height: 15, top: 30, left: 28 }} />
      <span className="moon-only__crater" style={{ width: 8, height: 8, top: 38, left: 14 }} />
    </div>
  );
}

function WeekPeek({ day, temp }: { day: string; temp: number }) {
  return (
    <article className="week-card">
      <div className="week-card__sky">
        <span className="week-card__sun" style={{ left: "22%", top: "18%" }} />
        <span className="week-card__hill" style={{ right: "-22%", bottom: "8%", width: 92, height: 38 }} />
        <span className="week-card__ocean" />
      </div>
      <div className="week-card__meta">
        <span className="week-card__day">{day}</span>
        <span className="week-card__deg">{temp}°</span>
      </div>
    </article>
  );
}

function EconDonut({ fuel, breakeven, expected, profit }: { fuel: number; breakeven: number; expected: number; profit: number }) {
  const parts = [
    { color: "#DC2626", value: fuel },
    { color: "#B45309", value: breakeven * 100 },
    { color: "#1A6BAD", value: expected * 100 },
    { color: "#16A34A", value: Math.max(profit, 1) },
  ];
  const minShare = 0.14;
  const raw = parts.map((p) => Math.max(p.value, 1));
  const sum = raw.reduce((a, b) => a + b, 0);
  let shares = raw.map((v) => Math.max(v / sum, minShare));
  const boost = shares.reduce((a, b) => a + b, 0);
  shares = shares.map((s) => s / boost);
  const r = 46;
  const c = 2 * Math.PI * r;
  const gap = 7;
  let offset = 0;
  return (
    <div className="econ-donut" aria-label={`Estimated profit ${profit} pesos`}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="#E4F2FC" strokeWidth="16" />
        {parts.map((p, i) => {
          const arc = Math.max(shares[i] * c - gap, 10);
          const dashOffset = -offset;
          offset += shares[i] * c;
          return (
            <circle
              key={p.color}
              className="econ-donut__arc"
              cx="66"
              cy="66"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${arc} ${c - arc}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 66 66)"
              style={{
                ["--arc" as string]: arc,
                ["--rest" as string]: c - arc,
                animationDelay: `${i * 90}ms`,
              }}
            />
          );
        })}
      </svg>
      <div className="econ-donut__meta">
        <div className="econ-donut__hint">Est. profit</div>
        <div className="econ-donut__num">+₱{profit}</div>
      </div>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, value)) / 100);
  return (
    <div className="score-ring" aria-label={`Fishing score ${value} percent`}>
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} fill="none" stroke="#E4F2FC" strokeWidth="8" />
        <circle
          cx="46"
          cy="46"
          r={r}
          fill="none"
          stroke={C.go}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-ring__meta">
        <Icon name="fish" size={16} color={C.go} />
        <span className="score-ring__num">{value}%</span>
      </div>
    </div>
  );
}

function AppBar({ title, sub, onBack, onSettings, showSOS, onSOS }: { title: string; sub?: string; onBack?: () => void; onSettings?: () => void; showSOS?: boolean; onSOS?: () => void }) {
  return (
    <div className="app-bar">
      {onBack && (
        <button onClick={onBack} className="icon-key" aria-label="Back">
          <IcBack size={20} color="white"/>
        </button>
      )}
      {!onBack && <span className="led" aria-hidden />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="app-bar__title">{title}</div>
        {sub && <div className="app-bar__sub">{sub}</div>}
      </div>
      {showSOS && (
        <KeyBtn variant="danger" size="sm" onClick={onSOS}>
          <IconSlot name="lifebuoy" size={16} color="#fff" title="SOS" />
          SOS
        </KeyBtn>
      )}
      {onSettings && (
        <button onClick={onSettings} className="icon-key" aria-label="Settings">
          <IcGear size={18} color="white"/>
        </button>
      )}
    </div>
  );
}

function Card({ children, style={}, onClick, screws }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void; screws?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`panel ${screws ? "panel--screws" : ""} ${onClick ? "panel--interactive" : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, action, onAction }: { children: React.ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div className="dash-title">{children}</div>
      {action && <button onClick={onAction} className="key-btn key-btn--ghost key-btn--sm" style={{ minHeight: 32, padding: 0 }}>{action}</button>}
    </div>
  );
}

function VerdictBadge({ verdict, size="sm" }: { verdict: Verdict; size?: "sm" | "md" }) {
  const colors = { GO: { bg: C.goBg, border: C.goBorder, text: C.go }, CAUTION: { bg: C.cautionBg, border: C.cautionBorder, text: C.caution }, STAY: { bg: C.stayBg, border: C.stayBorder, text: C.stay } }[verdict];
  return <span className={`verdict ${size === "md" ? "verdict--md" : ""}`} style={{ background: colors.bg, border: `1.5px solid ${colors.border}`, color: colors.text }}>{verdict}</span>;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`toggle ${on ? "is-on" : ""}`} aria-pressed={on}>
      <span className="toggle__knob" />
    </button>
  );
}

function BottomNav({ current, onNav }: { current: Screen; onNav: (s: Screen) => void }) {
  const tabs = [
    { id: "home"     as Screen, Icon: IcHome,    label: "Today"   },
    { id: "weather"  as Screen, Icon: IcSun,     label: "Weather" },
    { id: "map"      as Screen, Icon: IcMap,     label: "Map"     },
    { id: "catchlog" as Screen, Icon: IcLog,     label: "Log"     },
    { id: "history"  as Screen, Icon: IcHistory, label: "History" },
    { id: "whatif"   as Screen, Icon: IcSliders, label: "What-If" },
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map(({ id, Icon, label }) => {
        const active = current === id;
        return (
          <button key={id} onClick={() => onNav(id)} className={`bottom-nav__item ${active ? "is-on" : ""}`}>
            <Icon size={22} color={active ? C.blue : C.textFaint}/>
            <span>{label}</span>
            {active && <div className="bottom-nav__dot"/>}
          </button>
        );
      })}
    </nav>
  );
}

// ─── SCREEN: Landing ──────────────────────────────────────────────────────────
function LandingScreen({ onNav }: { onNav: (s: Screen) => void }) {
  return (
    <div className="landing">
      <PhotoWell src={photos.coverLanding} alt="Manila Bay waters" wash="navy" className="landing__cover" />

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
        <TripWiseLogo size={52}/>
        <div style={{ color: "white", fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 900, letterSpacing: "0.16em", lineHeight: 1 }}>TRIPWISE</div>
      </div>

      {/* Mascot */}
      <div style={{ marginBottom: 28 }}>
        <MascotSlot size={210} alt="TripWise mascot" src={mascotLanding} />
      </div>

      {/* Headline */}
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <h1 style={{ color: "white", fontFamily: "var(--font-display)", fontSize: 56, fontWeight: 900, lineHeight: 0.92, letterSpacing: "0.03em", margin: 0 }}>
          FISH SMARTER.<br/><span style={{ color: "#7BC8F6" }}>STAY SAFER.</span>
        </h1>
      </div>

      {/* CTA */}
      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
        <KeyBtn block size="lg" variant="surface" className="key-btn--shine" onClick={() => onNav("login")}>
          GET STARTED
        </KeyBtn>
        <button onClick={() => onNav("login")} style={{ width: "100%", minHeight: 48, borderRadius: 16, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer" }}>
          Already have an account? <strong>Log in</strong>
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN: Login ────────────────────────────────────────────────────────────
function LoginScreen({ onNav, onSuccess }: { onNav: (s: Screen) => void; onSuccess: () => void }) {
  const [phone, setPhone] = useState("");
  const digits = phone.replace(/\D/g, "").slice(0, 10);
  const valid = digits.length === 10 && digits.startsWith("9");
  const formatted = digits.length > 6 ? `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}` : digits.length > 3 ? `${digits.slice(0,3)} ${digits.slice(3)}` : digits;

  return (
    <div style={{ minHeight: "100%", background: "white", display: "flex", flexDirection: "column" }}>
      <div className="app-bar">
        <button onClick={() => onNav("landing")} className="icon-key" aria-label="Back"><IcBack size={20} color="white"/></button>
        <TripWiseLogo size={34}/>
        <span className="app-bar__title">TRIPWISE</span>
      </div>

      <div style={{ flex: 1, padding: "28px 24px 40px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <h2 style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: "0.03em", margin: 0 }}>
              ENTER YOUR<br/><span style={{ color: C.blue }}>MOBILE</span><br/>NUMBER
            </h2>
            <p style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.6, marginTop: 12, marginBottom: 0, maxWidth: 200 }}>
              Your number is your account — no password needed.
            </p>
          </div>
          <MascotSlot size={84} alt="TripWise mascot" src={mascotFront} />
        </div>

        <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Mobile Number</div>
        <div className="slot-wrap" style={{ marginBottom: 10, boxShadow: valid ? `inset 4px 4px 8px #C2D9EF, inset -4px -4px 8px #FFFFFF, 0 0 0 2px ${C.go}` : undefined }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
            <IconSlot name="flag" size={22} color={C.blue} title="Philippines" />
            <span className="num" style={{ color: C.text, fontSize: 17, fontWeight: 700 }}>+63</span>
          </div>
          <input autoFocus type="tel" inputMode="numeric" value={formatted} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="9XX XXX XXXX"
            className="slot" style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "0.06em" }}/>
          {valid && <div style={{ display: "flex", alignItems: "center", padding: "0 14px" }}><IconSlot name="check-circle" size={20} color={C.go} title="Valid" /></div>}
        </div>

        {digits.length > 0 && !valid && <div style={{ color: C.stay, fontFamily: "var(--font-body)", fontSize: 12, marginBottom: 12 }}>Must be 10 digits starting with 9 (e.g. 917 123 4567)</div>}

        <div style={{ flex: 1 }}/>
        <KeyBtn block size="lg" onClick={onSuccess} disabled={!valid}>
          LOG IN
        </KeyBtn>
        <p style={{ textAlign: "center", color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 11, marginTop: 16, lineHeight: 1.7 }}>By logging in you agree to TripWise Terms of Service and Privacy Policy.</p>
      </div>
    </div>
  );
}

// ─── SCREEN: Onboarding ───────────────────────────────────────────────────────
function OnboardingScreen({ onComplete }: { onComplete: (p: FisherProfile) => void }) {
  const [lang, setLang] = useState<Lang>("en");
  const [name, setName] = useState("");
  const [motor, setMotor] = useState<MotorClass>("typical");
  const [durationInput, setDurationInput] = useState("5");
  const [ground, setGround] = useState("");
  const [groundOpen, setGroundOpen] = useState(false);
  const [gear, setGear] = useState("");
  const [extraGrounds, setExtraGrounds] = useState<string[]>([]);
  const [extraHours, setExtraHours] = useState<number[]>([]);
  const [extraGear, setExtraGear] = useState<string[]>([]);

  const allGrounds = [...FISHING_GROUNDS, ...extraGrounds.filter((g) => !FISHING_GROUNDS.includes(g))];
  const allHours = [...BASE_HOURS, ...extraHours.filter((h) => !BASE_HOURS.includes(h))].sort((a, b) => a - b);
  const allGear = [...BASE_GEAR, ...extraGear.filter((g) => !BASE_GEAR.includes(g))];

  const motorOptions: { id: MotorClass; label: string; sub: string }[] = [
    { id: "small",   label: "Small",   sub: "~2.5 L/h" },
    { id: "typical", label: "Typical", sub: "4.2 L/h" },
    { id: "heavier", label: "Heavier", sub: "6.5 L/h" },
  ];

  const durationVal = parseFloat(durationInput) || 0;
  const canContinue = durationVal > 0 && ground.trim().length > 0;

  function handleDurationSuggestion(h: number) {
    setDurationInput(String(h));
  }

  return (
    <div className="setup-page">
      <div className="app-bar">
        <TripWiseLogo size={36}/>
        <div style={{ flex: 1 }}>
          <div className="app-bar__title">TRIPWISE</div>
          <div className="app-bar__sub">Worth the fuel. Safe home.</div>
        </div>
        <img src={mascotOnboarding} alt="Setup mascot" className="setup-mascot mascot-cut" />
      </div>

      <div className="setup-warn">
        <IconSlot name="alert" size={16} color={C.stay} title="Safety warning" />
        <span>If the sea is dangerous, STAY — always.</span>
      </div>

      <div className="setup-stack">
        <article className="tw-slide setup-card">
          <label className="setup-label">Wika / Language</label>
          <div className="setup-pair">
            {(["en", "fil"] as Lang[]).map((l) => (
              <button key={l} type="button" className={lang === l ? "is-on" : ""} onClick={() => setLang(l)}>
                {l === "en" ? "English" : "Filipino"}
              </button>
            ))}
          </div>
          <label className="setup-label">Fisher name <em>(optional)</em></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mang Nardo" className="slot setup-input" />
        </article>

        <article className="tw-slide setup-card">
          <label className="setup-label">Boat motor</label>
          <div className="setup-motors">
            {motorOptions.map((opt) => (
              <button key={opt.id} type="button" className={motor === opt.id ? "is-on" : ""} onClick={() => setMotor(opt.id)}>
                <b>{opt.label}</b>
                <small>{opt.sub}</small>
              </button>
            ))}
          </div>
          <label className="setup-label">Typical trip duration</label>
          <div className="slot-wrap setup-hours">
            <input
              type="number"
              inputMode="decimal"
              min={0.5}
              max={24}
              step={0.5}
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              placeholder="5"
              className="slot setup-input"
            />
            <span>hours</span>
          </div>
          <div className="setup-hours-picks">
            {allHours.map((h) => (
              <button key={h} type="button" className={parseFloat(durationInput) === h ? "is-on" : ""} onClick={() => handleDurationSuggestion(h)}>
                {h}h
              </button>
            ))}
          </div>
          <AddOther
            placeholder="e.g. 6.5"
            onAdd={(v) => {
              const n = Number(v);
              if (!n || n < 0.5 || n > 24) return;
              const hours = Math.round(n * 2) / 2;
              setExtraHours((list) => list.includes(hours) ? list : [...list, hours]);
              setDurationInput(String(hours));
            }}
          />
        </article>

        <article className="tw-slide setup-card">
          <label className="setup-label">Primary fishing ground</label>
          <div className="setup-ground">
            <input
              value={ground}
              onChange={(e) => { setGround(e.target.value); setGroundOpen(true); }}
              onFocus={() => setGroundOpen(true)}
              placeholder="Type or pick..."
              className="slot setup-input"
            />
            <button type="button" className="setup-chev" onClick={() => setGroundOpen((v) => !v)} aria-label="Ground list">
              <IcChevD size={18} color={C.blue} />
            </button>
          </div>
          {groundOpen && (
            <div className="setup-list">
              {allGrounds.filter((g) => g.toLowerCase().includes(ground.toLowerCase()) || ground === "").map((g) => (
                <button key={g} type="button" className={g === ground ? "is-on" : ""} onClick={() => { setGround(g); setGroundOpen(false); }}>
                  {g}
                </button>
              ))}
            </div>
          )}
          <AddOther
            placeholder="e.g. Malabon boundary"
            onAdd={(v) => {
              if (allGrounds.some((g) => g.toLowerCase() === v.toLowerCase())) {
                setGround(v);
                return;
              }
              setExtraGrounds((list) => [...list, v]);
              setGround(v);
              setGroundOpen(false);
            }}
          />
          <label className="setup-label">Gear type</label>
          <input value={gear} onChange={(e) => setGear(e.target.value)} placeholder="e.g. Gillnet, Kawil..." className="slot setup-input" />
          <div className="setup-chips">
            {allGear.map((g) => (
              <button key={g} type="button" className={gear === g ? "is-on" : ""} onClick={() => setGear(g)}>{g}</button>
            ))}
          </div>
          <AddOther
            placeholder="e.g. Panakot, Bubo..."
            onAdd={(v) => {
              if (allGear.some((g) => g.toLowerCase() === v.toLowerCase())) {
                setGear(v);
                return;
              }
              setExtraGear((list) => [...list, v]);
              setGear(v);
            }}
          />
        </article>

        <button
          type="button"
          onClick={() => {
            const hours = durationVal || 5;
            const groundVal = ground.trim() || DEFAULT_GROUND;
            const gearVal = gear.trim() || "Gillnet / Lambat";
            onComplete({
              name: name || "Kuya Jun",
              language: lang,
              motorClass: motor,
              tripDuration: hours,
              fishingGround: groundVal,
              gear: gearVal,
              extraGrounds: extraGrounds.includes(groundVal) || FISHING_GROUNDS.includes(groundVal)
                ? extraGrounds
                : [...extraGrounds, groundVal],
              extraHours: extraHours.includes(hours) || BASE_HOURS.includes(hours)
                ? extraHours
                : [...extraHours, hours],
              extraGear: extraGear.includes(gearVal) || BASE_GEAR.includes(gearVal)
                ? extraGear
                : [...extraGear, gearVal],
            });
          }}
          disabled={!canContinue}
          className="key-btn key-btn--primary key-btn--lg key-btn--block"
        >
          CONTINUE TO APP
        </button>
        <button
          type="button"
          className="setup-skip"
          onClick={() => onComplete({
            name: "Demo Fisher",
            language: "en",
            motorClass: "typical",
            tripDuration: 5,
            fishingGround: DEFAULT_GROUND,
            gear: "Gillnet / Lambat",
            ...emptyExtras(),
          })}
        >
          Skip for demo mode
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN: Home (Today) ─────────────────────────────────────────────────────
function HomeScreen({ profile, onNav }: { profile: FisherProfile; onNav: (s: Screen) => void }) {
  const lph = MOTOR_LPH[profile.motorClass];
  const fuelCost = Math.round(lph * profile.tripDuration * DIESEL_PRICE);
  const breakeven = Math.round((fuelCost / TAMBAN_PRICE) * 10) / 10;
  const expected = 11.0;
  const profit = Math.round(expected * TAMBAN_PRICE - fuelCost);
  const score = 82;
  const firstName = profile.name.split(" ")[0];

  return (
    <div className="dash">
      <header className="home-bar">
        <div className="home-bar__brand">
          <TripWiseLogo size={40} />
          <div>
            <div className="home-bar__title">TRIPWISE</div>
            <div className="home-bar__hint">Worth the fuel. Safe home.</div>
          </div>
        </div>
        <KeyBtn variant="danger" size="sm" onClick={() => {}}>
          <IconSlot name="lifebuoy" size={16} color="#fff" title="SOS" />
          SOS
        </KeyBtn>
        <button onClick={() => onNav("settings")} className="icon-key" aria-label="Settings">
          <IcGear size={18} color="white" />
        </button>
      </header>
      <div className="sync-strip">
        <IconSlot name="cloud-check" size={16} color={C.go} title="Offline cache" />
        <div>
          <div className="sync-strip__title">Cached off-grid · Safety ready</div>
          <div className="sync-strip__sub">Last sync <span>5:42 AM</span></div>
        </div>
      </div>

      <div className="screen-pad">
        <article className="hello-card dash-card">
          <div className="hello-card__mascot">
            <img src={mascotHome} alt="TripWise mascot" className="mascot-slot" />
          </div>
          <div className="hello-card__body">
            <div className="speech">
              <p className="speech__text">
                Good morning, <span className="speech__name">{firstName}</span>!
              </p>
            </div>
            <div className="hello-card__score">
              <div className="hello-card__label">Today&apos;s fishing score</div>
              <div className="hello-card__score-row">
                <ScoreRing value={score} />
                <div>
                  <div className="hello-card__status">GOOD TRIP INDICATION</div>
                  <div className="hello-note">
                    <IconSlot name="shield-check" size={16} color={C.go} title="Safety status" />
                    No gale warnings
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="sky-card">
          <SkyToys />
          <div className="sky-card__place">{profile.fishingGround.split(" ")[0]}<br />Manila Bay</div>
          <div className="sky-card__date">Sat, 22 Aug 2026</div>
          <div className="sky-card__hero">
            <div className="sky-card__temp">29°</div>
            <div className="sky-card__meta">
              <div className="sky-card__cond">Partly cloudy<br />Rain 30%</div>
              <div className="sky-card__scale">Celsius</div>
            </div>
          </div>
          <div className="weather-grid">
            {[
              { icon: "weather-windy" as const, label: "Wind", value: "12 km/h", note: "Light breezes" },
              { icon: "waves" as const, label: "Waves", value: "0.8m", note: "Safe 2.0m" },
              { icon: "waves-arrow-up" as const, label: "Tide", value: "Rising", note: "9:14 AM" },
            ].map((cell) => (
              <div key={cell.label} className="weather-grid__cell">
                <span className="weather-grid__icon">
                  <IconSlot name={cell.icon} size={36} color={C.blue} title={cell.label} />
                </span>
                <div className="weather-grid__val">{cell.value}</div>
                <div className="weather-grid__label">{cell.label}</div>
                <div className="weather-grid__note">{cell.note}</div>
              </div>
            ))}
          </div>
          <button type="button" className="fill-btn fill-btn--in-card" onClick={() => onNav("weather")}>
            <span className="fill-btn__label">View Weather</span>
          </button>
        </article>

        <div className="mini-slides">
          <article className="mini-slide">
            <div className="mini-slide__icon"><SpinSun /></div>
            <div className="mini-slide__name">Major Peak Bite</div>
            <div className="mini-slide__time">5:48 – 7:52 AM</div>
          </article>
          <article className="mini-slide mini-slide--night">
            <div className="mini-slide__icon"><MoonOnly /></div>
            <div className="mini-slide__name">Minor Peak Bite</div>
            <div className="mini-slide__time">11:36 AM – 12:24 PM</div>
          </article>
          <article className="mini-slide mini-slide--wide">
            <div className="fuel-copy">
              <div className="hello-card__label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IconSlot name="gas-station" size={18} color={C.blue} title="Fuel" />
                Fuel forecast
              </div>
              <div className="mini-slide__value">₱{DIESEL_PRICE.toFixed(2)}</div>
              <div className="mini-slide__time">Average per liter · DOE</div>
              <div className="delta delta--up">
                <IconSlot name="trending-up" size={16} color={C.go} title="Increase" />
                +0.32% vs yesterday
              </div>
            </div>
            <img src={mascotHistory} alt="" className="fuel-mascot" />
          </article>
        </div>

        <Card style={{ padding: "18px 18px 16px" }}>
          <SectionTitle action="Show the Math" onAction={() => onNav("math")}>Trip Economics (Est.)</SectionTitle>
          <div className="econ-layout">
            <EconDonut fuel={fuelCost} breakeven={breakeven} expected={expected} profit={profit} />
            <ul className="econ-list">
              {[
                { label: "Trip cost (fuel)", value: `₱${fuelCost.toLocaleString()}`, color: "#DC2626" },
                { label: "Break-even", value: `${breakeven} kg`, color: "#B45309" },
                { label: "Expected", value: `${expected} kg`, color: "#1A6BAD" },
                { label: "Est. profit", value: `+₱${profit}`, color: C.go },
              ].map((row) => (
                <li key={row.label} className="econ-list__row">
                  <span className="econ-list__dot" style={{ background: row.color }} />
                  <span className="econ-list__label">{row.label}</span>
                  <span className="econ-list__value" style={{ color: row.color }}>{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Last catch — IDEA 4 compact scene */}
        <SceneCard
          visual={
            <div className="thumb-visual thumb-visual--ground">
              <PhotoWell src={photos.featureSpot} alt="Fishing ground" wash="dawn">
                <span className="icon-slot icon-slot--lg icon-slot--round" style={{ width: 48, height: 48, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="map-marker" size={26} color="#fff" title="Fishing ground" />
                </span>
              </PhotoWell>
            </div>
          }
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div className="label">Last fishing spot</div>
              <div className="hello-card__label" style={{ marginTop: 4, color: C.text }}>{profile.fishingGround.split(" ")[0]} Ground</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="label">Last catch</div>
              <div className="econ-list__value" style={{ marginTop: 4 }}>11.0 kg</div>
            </div>
          </div>
        </SceneCard>

        <KeyBtn block size="lg" variant="go" onClick={() => onNav("catchlog")}>
          <IconSlot name="ferry" size={18} color="#fff" title="Start departure" />
          START DEPARTURE LOG
        </KeyBtn>
      </div>
    </div>
  );
}

// ─── SCREEN: Weather & Conditions ─────────────────────────────────────────────
function WeatherScreen({ onBack }: { onBack: () => void }) {
  const [weekMode, setWeekMode] = useState<"temp" | "wind" | "precip">("temp");
  const hourlyData = [
    { h: "12A", temp: 27, humid: 84, wind: 8, rain: 8 },
    { h: "1AM", temp: 27, humid: 85, wind: 8, rain: 10 },
    { h: "2AM", temp: 26, humid: 86, wind: 7, rain: 8 },
    { h: "3AM", temp: 26, humid: 86, wind: 7, rain: 6 },
    { h: "4AM", temp: 26, humid: 85, wind: 8, rain: 8 },
    { h: "5AM", temp: 27, humid: 83, wind: 9, rain: 10 },
    { h: "6AM", temp: 28, humid: 70, wind: 10, rain: 10 },
    { h: "7AM", temp: 29, humid: 72, wind: 12, rain: 20 },
    { h: "8AM", temp: 30, humid: 75, wind: 12, rain: 30 },
    { h: "9AM", temp: 31, humid: 78, wind: 14, rain: 40 },
    { h: "10A", temp: 32, humid: 80, wind: 16, rain: 50 },
    { h: "11A", temp: 32, humid: 82, wind: 18, rain: 60 },
    { h: "12P", temp: 31, humid: 80, wind: 16, rain: 70 },
    { h: "1PM", temp: 30, humid: 78, wind: 14, rain: 80 },
    { h: "2PM", temp: 30, humid: 79, wind: 15, rain: 75 },
    { h: "3PM", temp: 29, humid: 80, wind: 16, rain: 65 },
    { h: "4PM", temp: 29, humid: 81, wind: 14, rain: 55 },
    { h: "5PM", temp: 28, humid: 82, wind: 13, rain: 45 },
    { h: "6PM", temp: 28, humid: 83, wind: 12, rain: 35 },
    { h: "7PM", temp: 28, humid: 84, wind: 11, rain: 25 },
    { h: "8PM", temp: 27, humid: 84, wind: 10, rain: 18 },
    { h: "9PM", temp: 27, humid: 85, wind: 9, rain: 12 },
    { h: "10P", temp: 27, humid: 85, wind: 9, rain: 10 },
    { h: "11P", temp: 27, humid: 85, wind: 8, rain: 8 },
  ];
  const weeklyData = [
    { day: "Mon", cond: "sun" as const, temp: 29, hpa: 1012, windMph: 7, dir: "NE", rain: 15, inch: 0.04 },
    { day: "Tue", cond: "cloud" as const, temp: 30, hpa: 1010, windMph: 8, dir: "E", rain: 25, inch: 0.08 },
    { day: "Wed", cond: "rain" as const, temp: 31, hpa: 1006, windMph: 11, dir: "SE", rain: 45, inch: 0.22 },
    { day: "Thu", cond: "rain" as const, temp: 30, hpa: 1004, windMph: 12, dir: "S", rain: 60, inch: 0.41 },
    { day: "Fri", cond: "cloud" as const, temp: 29, hpa: 1008, windMph: 9, dir: "SW", rain: 35, inch: 0.14 },
    { day: "Sat", cond: "sun" as const, temp: 28, hpa: 1013, windMph: 7, dir: "W", rain: 20, inch: 0.06 },
    { day: "Sun", cond: "cloud" as const, temp: 29, hpa: 1011, windMph: 8, dir: "NW", rain: 30, inch: 0.11 },
  ];
  const tidePoints = [2.8, 3.6, 4.2, 4.6, 4.1, 3.2, 2.1, 1.2, 0.8, 0.7, 1.0, 1.8, 2.7, 3.5, 4.2, 4.6, 4.0, 3.1, 2.0, 1.3, 0.9, 0.8, 1.1, 1.9];

  return (
    <div className="dash wx-page">
      <AppBar title="WEATHER & CONDITIONS" sub="Navotas Coast" onBack={onBack} />
      <div className="screen-pad">
        <article className="sky-card pang-card">
          <div className="pang-card__hero">
            <div className="pang-card__copy">
              <div className="pang-card__kicker">Pangisdaan Score</div>
              <div className="pang-card__go">GO / PUMALAOT</div>
            </div>
            <SpeedGauge value={82} />
          </div>
          <div className="pang-card__notes">
            {[
              { icon: "weather-rainy" as IconName, title: "Low rainfall", detail: "30% chance AM" },
              { icon: "weather-windy" as IconName, title: "Moderate wind", detail: "12 km/h NE" },
              { icon: "waves" as IconName, title: "Calm waves", detail: "0.8m average" },
            ].map((t) => (
              <div key={t.title} className="pang-card__note">
                <IconSlot name={t.icon} size={16} color={C.go} />
                <div>
                  <div className="pang-card__note-title">{t.title}</div>
                  <div className="pang-card__note-detail">{t.detail}</div>
                </div>
              </div>
            ))}
            <div className="pang-card__note pang-card__note--warn">
              <IconSlot name="alert" size={16} color={C.caution} title="Caution" />
              <div>
                <div className="pang-card__note-title">Rain &amp; wind expected</div>
                <div className="pang-card__note-detail">After 2 PM</div>
              </div>
            </div>
          </div>
        </article>

        <section className="dash-card now-card">
          <div className="dash-title">Right Now (Navotas Coast)</div>
          <div className="now-grid">
            {[
              { label: "Temperature", value: "29°C", note: "Feels 31°", kind: "thermo" as const },
              { label: "Rain Probability", value: "40%", note: "Light drizzle", kind: "rain" as const },
              { label: "Wind Force", value: "12 km/h", note: "NE", kind: "wind" as const },
              { label: "Tide Curve", value: "0.6m", note: "Rising", kind: "tide" as const },
              { label: "Humidity", value: "78%", note: "Muggy air", kind: "humid" as const },
              { label: "Visibility", value: "8 km", note: "Clear", kind: "eye" as const },
              { label: "Sunrise", value: "5:42 AM", note: "First light", kind: "rise" as const },
              { label: "Sunset", value: "6:18 PM", note: "Last light", kind: "set" as const },
            ].map((item) => (
              <article key={item.label} className="now-tile">
                <Wx3D kind={item.kind} />
                <div>
                  <div className="now-tile__label">{item.label}</div>
                  <div className="now-tile__value">{item.value}</div>
                  <div className="now-tile__note">{item.note}</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="dash-title" style={{ marginBottom: 10 }}>7-day forecast</div>
          <div className="wx-tabs">
            {([
              { id: "temp" as const, label: "Temperature" },
              { id: "wind" as const, label: "Wind" },
              { id: "precip" as const, label: "Precipitation" },
            ]).map((t) => (
              <button
                key={t.id}
                type="button"
                className={`wx-tab ${weekMode === t.id ? "is-on" : ""}`}
                onClick={() => setWeekMode(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="week-row" key={weekMode}>
            {weeklyData.map((d) => (
              <article key={d.day} className="day-slide">
                <div className="day-slide__day">{d.day}</div>
                <div className="day-slide__icon">
                  {weekMode === "wind" ? <WindVane dir={d.dir} /> : <Wx3D kind={d.cond} />}
                </div>
                {weekMode === "temp" && (
                  <>
                    <div className="day-slide__value">{d.temp}°</div>
                    <div className="day-slide__meta">{d.hpa} hPa</div>
                  </>
                )}
                {weekMode === "wind" && (
                  <>
                    <div className="day-slide__value">{d.windMph}</div>
                    <div className="day-slide__meta">{d.dir} · mph</div>
                  </>
                )}
                {weekMode === "precip" && (
                  <>
                    <div className="day-slide__value">{d.rain}%</div>
                    <div className="day-slide__meta">{d.inch.toFixed(2)} in</div>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="dash-card tide-card">
          <div className="dash-title">Tides Level</div>
          <TideGraph points={tidePoints} />
          <div className="tide-pair">
            <article className="mini-slide">
              <div className="mini-slide__icon"><Wx3D kind="tide-high" /></div>
              <div className="mini-slide__name">Highest Tide</div>
              <div className="mini-slide__time">4.6 ft · 4:10 PM</div>
            </article>
            <article className="mini-slide mini-slide--night">
              <div className="mini-slide__icon"><Wx3D kind="tide-low" /></div>
              <div className="mini-slide__name">Lowest Tide</div>
              <div className="mini-slide__time">0.7 ft · 9:40 AM</div>
            </article>
          </div>
        </section>

        <section className="dash-card hour-card">
          <div className="dash-title">Hourly Trends (24 Hours)</div>
          <div className="hour-scroll">
            <div className="hour-labels">
              {hourlyData.map((d) => (
                <div key={d.h}>{d.h}</div>
              ))}
            </div>
            {[
              { label: "Temp (°C)", data: hourlyData.map((d) => d.temp), color: "#F97316" },
              { label: "Humid (%)", data: hourlyData.map((d) => d.humid), color: "#0EA5E9" },
              { label: "Wind (km/h)", data: hourlyData.map((d) => d.wind), color: C.blue },
              { label: "Rain (%)", data: hourlyData.map((d) => d.rain), color: C.stay },
            ].map((series) => (
              <div key={series.label} className="hour-row">
                <div className="hour-row__label">{series.label}</div>
                <MiniChart data={series.data} color={series.color} dense />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── SCREEN: Trip Formula Matrix ──────────────────────────────────────────────
function MathScreen({ profile, onBack }: { profile: FisherProfile; onBack: () => void }) {
  const lph = MOTOR_LPH[profile.motorClass];
  const liters = lph * profile.tripDuration;
  const fuelCost = Math.round(liters * DIESEL_PRICE);
  const breakeven = Math.round((fuelCost / TAMBAN_PRICE) * 10) / 10;
  const expected = 11.0;
  const ratio = Math.round((expected / breakeven) * 100) / 100;

  return (
    <div style={{ minHeight: "100%", background: C.bg, paddingBottom: 80 }}>
      <AppBar title="TRIP FORMULA MATRIX" onBack={onBack}/>
      <div className="screen-pad">
        <Card screws style={{ padding: 20 }}>
          <div style={{ color: C.blue, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 900, letterSpacing: "0.04em", marginBottom: 6 }}>Not a black box.</div>
          <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.6 }}>We compute raw safety thresholds and economic viability in real time using local market and weather endpoints.</div>
        </Card>

        <Card screws style={{ padding: 20 }}>
          <SectionTitle>System Inputs</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { label: "DOE Navotas, 6:00 AM Today", key: "Diesel Price", value: `₱${DIESEL_PRICE.toFixed(2)} / L` },
              { label: "Your setup profile", key: "Typical Motor Cons.", value: `${lph} L/h × ${profile.tripDuration}h = ${liters} Liters` },
              { label: "211 L × ₱68 + allowance", key: "Trip Cost (Fuel only)", value: `₱${fuelCost.toLocaleString()}` },
              { label: "Navotas Fish Port Union average", key: "Tamban/Galunggong Price", value: `₱${TAMBAN_PRICE}.00 / kg` },
              { label: "Historical logs + Moon phase + Tide factor", key: "Expected catch target", value: `${expected} kg` },
              { label: "Open Meteo marine forecast, 5:45 AM", key: "Wave Height", value: "0.8m" },
              { label: "PAGASA official data feeds", key: "Storm/Gale Signals", value: "None active" },
            ].map((row, i, arr) => (
              <div key={row.key} style={{ padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600 }}>{row.key}</div>
                    <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 11, marginTop: 1 }}>{row.label}</div>
                  </div>
                  <div style={{ color: C.blue, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, textAlign: "right", flexShrink: 0 }}>{row.value}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: "14px 16px", marginBottom: 12, background: C.blueFaint, border: `1.5px solid ${C.blueLight}` }}>
          <SectionTitle>The Formula</SectionTitle>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 12, marginBottom: 6 }}>Break-even Catch Volume:</div>
            <div style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 900, textAlign: "center", background: "white", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px" }}>
              ₱{fuelCost.toLocaleString()} fuel ÷ ₱{TAMBAN_PRICE} price = <span style={{ color: C.blue }}>{breakeven} kg</span>
            </div>
          </div>
          <div>
            <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 12, marginBottom: 6 }}>Economic Margin Ratio:</div>
            <div style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 900, textAlign: "center", background: "white", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px" }}>
              {expected} kg est ÷ {breakeven} kg break-even = <span style={{ color: C.go }}>{ratio}x</span>
            </div>
          </div>
        </Card>

        <Card screws style={{ padding: 20 }}>
          <SectionTitle>Decision Thresholds</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "GO: ≥ 1.30x", bg: C.goBg, border: C.goBorder, color: C.go },
              { label: "CAUTION: ~1.0x", bg: C.cautionBg, border: C.cautionBorder, color: C.caution },
              { label: "STAY: < 0.80x", bg: C.stayBg, border: C.stayBorder, color: C.stay },
            ].map(t => (
              <div key={t.label} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, background: t.bg, border: `1.5px solid ${t.border}`, textAlign: "center", color: t.color, fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800 }}>{t.label}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── SCREEN: What-If Simulator ────────────────────────────────────────────────
function WhatIfScreen({ profile, trips, onBack }: { profile: FisherProfile; trips: TripRecord[]; onBack: () => void }) {
  const lph = MOTOR_LPH[profile.motorClass];
  const book = summarizeJourney(trips);
  const firstName = profile.name.split(" ")[0];
  const [fuelPrice, setFuelPrice] = useState(DIESEL_PRICE);
  const [catchKg, setCatchKg] = useState(Math.round(book.avgKgOut || 11));
  const [tripHrs, setTripHrs] = useState(profile.tripDuration);
  const [fishPrice, setFishPrice] = useState(TAMBAN_PRICE);
  const [waveHt, setWaveHt] = useState(0.8);
  const [preset, setPreset] = useState<string | null>(null);
  const [showMath, setShowMath] = useState(false);

  const fuelCost = Math.round(lph * tripHrs * fuelPrice);
  const otherCost = 300;
  const totalCost = fuelCost + otherCost;
  const revenue = Math.round(catchKg * fishPrice);
  const netProfit = revenue - totalCost;
  const breakeven = Math.round((totalCost / fishPrice) * 10) / 10;
  const verdict: Verdict = waveHt > 2.0 ? "STAY" : netProfit > 500 ? "GO" : netProfit > 0 ? "CAUTION" : "STAY";
  const profitTone = netProfit > 0 ? "go" : netProfit < 0 ? "stay" : "even";

  const talk =
    waveHt > 2
      ? `Waves at ${waveHt.toFixed(1)}m beat any catch. I would stay, even at ${catchKg} kg.`
      : netProfit > 500
        ? `Waves are ${waveHt.toFixed(1)}m and this trip clears ${fmtP(netProfit)} after fuel and the ₱${otherCost} ice/food pad. I would go.`
        : netProfit > 0
          ? `You beat break-even (${breakeven} kg), but only ${fmtP(netProfit)} is left. Thin water. Caution.`
          : `This trip would lose ${fmtP(netProfit)}. Stay for the money.`;

  const presets = [
    { label: "Diesel +₱5", action: () => { setFuelPrice(DIESEL_PRICE + 5); setPreset("Diesel +₱5"); } },
    { label: "Bad Day (4kg)", action: () => { setCatchKg(4); setPreset("Bad Day (4kg)"); } },
    { label: "Rough Sea (2.1m)", action: () => { setWaveHt(2.1); setPreset("Rough Sea (2.1m)"); } },
  ];

  return (
    <div className="whatif-page">
      <div className="app-bar">
        <button type="button" onClick={onBack} className="icon-key" aria-label="Back"><IcBack size={20} color="white"/></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-bar__title">WHAT IF</div>
          <div className="app-bar__sub">Knobs and result stay on one screen.</div>
        </div>
        <VerdictBadge verdict={verdict}/>
      </div>

      <div className="whatif-desk">
        <article className={`tw-slide whatif-live whatif-live--${verdict.toLowerCase()}`}>
          <img src={mascotWhatIf} alt="What-If mascot" className="mascot-cut" />
          <div className="whatif-live__text">
            <p><span>{firstName}</span>, {talk}</p>
            <div className={`whatif-live__num ledger-profit--${profitTone}`}>{fmtP(netProfit)}</div>
          </div>
          <div className="whatif-live__ticks">
            <span>Break-even <b>{breakeven} kg</b></span>
            <span>Fuel <b>{fmtP(fuelCost)}</b></span>
            <span>Vs book <b className={netProfit - book.avgProfit >= 0 ? "is-go" : "is-stay"}>{fmtP(netProfit - book.avgProfit)}</b></span>
          </div>
        </article>

        <article className="tw-slide whatif-board">
          <div className="whatif-presets">
            {presets.map((p) => (
              <button key={p.label} type="button" className={preset === p.label ? "is-on" : ""} onClick={p.action}>{p.label}</button>
            ))}
          </div>
          {[
            { label: "Diesel / L", val: fuelPrice, min: 50, max: 100, step: 0.5, display: `₱${fuelPrice.toFixed(0)}`, set: setFuelPrice },
            { label: "Catch", val: catchKg, min: 2, max: 20, step: 1, display: `${catchKg} kg`, set: setCatchKg },
            { label: "Hours", val: tripHrs, min: 2, max: 8, step: 1, display: `${tripHrs} h`, set: setTripHrs },
            { label: "₱ / kg", val: fishPrice, min: 100, max: 250, step: 5, display: `₱${fishPrice}`, set: setFishPrice },
            { label: "Waves", val: waveHt, min: 0.2, max: 3.2, step: 0.1, display: `${waveHt.toFixed(1)} m`, set: setWaveHt },
          ].map((s) => (
            <label key={s.label} className="whatif-slim">
              <span>{s.label}</span>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={(e) => { s.set(+e.target.value); setPreset(null); }} />
              <b>{s.display}</b>
            </label>
          ))}
          {waveHt > 2.0 && <div className="whatif-warn">Waves over 2.0m force STAY, even at 20 kg.</div>}
        </article>

        <button type="button" className="tw-slide history-ref" onClick={() => setShowMath((v) => !v)}>
          {showMath ? "Hide the math" : "Show the math"}
        </button>
        {showMath && (
          <article className="tw-slide whatif-math">
            <div className="ledger-kv">
              <span>Fuel</span>
              <b>{lph} L/h × {tripHrs} h × ₱{fuelPrice} = {fmtP(fuelCost)}</b>
              <span>Ice / food pad</span>
              <b>{fmtP(otherCost)} · fixed in this sim</b>
              <span>Revenue</span>
              <b>{catchKg} kg × ₱{fishPrice} = {fmtP(revenue)}</b>
              <span>Profit</span>
              <b className={netProfit >= 0 ? "is-go" : "is-stay"}>{fmtP(revenue)} − {fmtP(totalCost)} = {fmtP(netProfit)}</b>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

// ─── Hold-to-activate SOS button ─────────────────────────────────────────────
function HoldSosButton({ onActivate }: { onActivate: () => void }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdDuration = 3000;

  function startHold() {
    setHolding(true);
    setProgress(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / holdDuration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        stopHold();
        onActivate();
      }
    }, 30);
  }

  function stopHold() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setHolding(false);
    setProgress(0);
  }

  const circumference = 2 * Math.PI * 22;
  const strokeOffset = circumference - (progress / 100) * circumference;

  return (
    <button
      onPointerDown={startHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      style={{ position: "relative", width: 64, height: 52, borderRadius: 10, background: holding ? "#7F1D1D" : "#DC2626", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, flexShrink: 0, overflow: "hidden", transition: "background 0.15s", userSelect: "none" }}
    >
      {/* Ring progress */}
      {holding && (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 64 52">
          <rect width="64" height="52" rx="10" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4"/>
          <rect width="64" height="52" rx="10" fill="none" stroke="white" strokeWidth="4"
            strokeDasharray={`${((64+52)*2-4*4*Math.PI/4)} ${((64+52)*2)}`}
            strokeDashoffset={`${(1 - progress/100) * ((64+52)*2-4*4*Math.PI/4)}`}
            strokeLinecap="round"/>
        </svg>
      )}
      <IconSlot name="lifebuoy" size={18} color="#fff" title="SOS" />
      <span style={{ color: "white", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, letterSpacing: "0.06em", lineHeight: 1 }}>SOS</span>
      {holding && (
        <span style={{ color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-body)", fontSize: 7, letterSpacing: "0.04em" }}>
          {Math.ceil(((100 - progress) / 100) * 3)}s...
        </span>
      )}
    </button>
  );
}

// ─── SCREEN: Catch Log ────────────────────────────────────────────────────────
function CatchLogScreen({ profile, onBack, onSave }: { profile: FisherProfile; onBack: () => void; onSave: () => void }) {
  const SPECIES = ["Galunggong", "Tamban", "Tulingan", "Bangus", "Tilapia", "Sapsap", "Alumahan"];
  const [species, setSpecies] = useState("Galunggong");
  const [price, setPrice] = useState(137);
  const [catchKg, setCatchKg] = useState(11.0);
  const [hours, setHours] = useState<number>(5);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const revenue = Math.round(catchKg * price);

  if (saved) return (
    <div style={{ minHeight: "100%", background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <MascotSlot size={140} alt="Catch saved" src={mascotCatch} />
      <div style={{ color: C.go, fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 900, letterSpacing: "0.04em", margin: "8px 0" }}>Saved!</div>
      <p style={{ color: C.textSub, fontFamily: "var(--font-body)", textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>Trip logged. <span style={{ color: C.go, fontWeight: 700 }}>₱{revenue.toLocaleString()}</span> revenue from <strong>{catchKg} kg</strong>.</p>
      <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 13, textAlign: "center", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <IconSlot name="cloud-check" size={16} color={C.go} title="Logged offline" />
        Logged offline. Syncs automatically in tomorrow's math engine.
      </div>
      <KeyBtn block size="lg" onClick={onSave}>BACK TO HOME</KeyBtn>
    </div>
  );

  return (
    <div style={{ minHeight: "100%", background: C.bg, paddingBottom: 80 }}>
      <div className="app-bar">
        <button onClick={onBack} className="icon-key" aria-label="Back"><IcBack size={20} color="white"/></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-bar__title">NEW CATCH LOG</div>
          <div className="app-bar__sub">21 Aug  ·  {profile.fishingGround.split(" ")[0]} Ground  ·  Gillnet</div>
        </div>
        <div className="label" style={{ padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,0.16)", color: "white", letterSpacing: "0.06em" }}>AUTO-FILLED</div>
      </div>

      <div className="screen-pad">
        {/* Species */}
        <Card screws style={{ padding: 20 }}>
          <SectionTitle>Select Primary Caught Species</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {SPECIES.map(s => (
              <button key={s} onClick={() => setSpecies(s)} style={{ padding: "8px 14px", borderRadius: 20, background: species === s ? C.header : C.blueFaint, color: species === s ? "white" : C.textSub, border: `1.5px solid ${species === s ? C.header : C.border}`, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {s}
              </button>
            ))}
          </div>
        </Card>

        {/* Price */}
        <Card screws style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>Current Estimated Market Price</div>
              <div style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, marginTop: 4 }}>₱{price}.00 / kg</div>
            </div>
            <button onClick={() => {}} style={{ padding: "8px 14px", borderRadius: 8, background: C.blueFaint, border: `1px solid ${C.border}`, color: C.blue, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit Price</button>
          </div>
        </Card>

        {/* Catch weight */}
        <Card screws style={{ padding: 20 }}>
          <SectionTitle>Total Catch Weight (kg)</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <button onClick={() => setCatchKg(v => Math.max(0, Math.round((v - 0.5) * 10) / 10))} style={{ width: 44, height: 44, borderRadius: 12, background: C.blueFaint, border: `1px solid ${C.border}`, color: C.blue, fontSize: 22, fontWeight: 700, cursor: "pointer" }}>−</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 900, lineHeight: 1 }}>{catchKg.toFixed(1)}</div>
              <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 11 }}>KILOGRAMS</div>
            </div>
            <button onClick={() => setCatchKg(v => Math.round((v + 0.5) * 10) / 10)} style={{ width: 44, height: 44, borderRadius: 12, background: C.header, border: "none", color: "white", fontSize: 22, fontWeight: 700, cursor: "pointer" }}>+</button>
          </div>
          <div style={{ background: C.goBg, border: `1px solid ${C.goBorder}`, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
            <span style={{ color: C.goText, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600 }}>Estimated Total Revenue: </span>
            <span style={{ color: C.go, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}>₱{revenue.toLocaleString()}.00</span>
          </div>
        </Card>

        {/* Hours */}
        <Card screws style={{ padding: 20 }}>
          <SectionTitle>Actual Hours at Sea</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            {[3, 4, 5, 6, 7].map(h => (
              <button key={h} onClick={() => setHours(h)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: hours === h ? C.header : C.blueFaint, color: hours === h ? "white" : C.textSub, border: `1.5px solid ${hours === h ? C.header : C.border}`, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, cursor: "pointer", position: "relative" }}>
                {h}h{hours === h && h === 5 && <span style={{ position: "absolute", bottom: -14, left: 0, right: 0, fontSize: 8, color: C.blue, fontFamily: "var(--font-body)", fontWeight: 600 }}>(Pre)</span>}
              </button>
            ))}
          </div>
        </Card>

        {/* Notes */}
        <Card screws style={{ padding: 20 }}>
          <SectionTitle>Fishing Trip Notes</SectionTitle>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Tangos shoal area, mild north swell, slack tide action." className="slot" />
        </Card>

        <KeyBtn block size="lg" onClick={() => setSaved(true)}>SAVE TRIP TO LOGBOOK</KeyBtn>
        <div style={{ textAlign: "center", color: C.go, fontFamily: "var(--font-body)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <IconSlot name="cloud-check" size={16} color={C.go} title="Logged offline" />
          Logged offline. Syncs automatically in tomorrow's math engine.
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: Reference ────────────────────────────────────────────────────────
function ReferenceScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ minHeight: "100%", background: C.bg, paddingBottom: 80 }}>
      <div className="app-bar">
        <button onClick={onBack} className="icon-key" aria-label="Back"><IcBack size={20} color="white"/></button>
        <div className="app-bar__title">PORT LANDINGS &amp; BFAR REF</div>
      </div>
      <div className="screen-pad">
        <Card screws style={{ padding: 20 }}>
          <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Official Navotas Market Reference</div>
          <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 12, lineHeight: 1.6 }}>Compiled from BFAR regional offices &amp; local fish port union monitoring.</div>
        </Card>

        <Card style={{ padding: 0, marginBottom: 12, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 52px", padding: "10px 16px", background: C.header, gap: 8 }}>
            {["SPECIES", "PRICE RANGE", "VOLUME"].map(h => (
              <div key={h} style={{ color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-body)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: h !== "SPECIES" ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          {BFAR_DATA.map((fish, i) => (
            <div key={fish.species} style={{ borderBottom: i < BFAR_DATA.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 52px", padding: "12px 16px", gap: 8, background: i % 2 === 0 ? "white" : C.cardAlt, alignItems: "start" }}>
                <div>
                  <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 700 }}>{fish.species}</div>
                  <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 10, fontStyle: "italic", marginTop: 1 }}>{fish.local}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: C.blue, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800 }}>₱{fish.pMin}–{fish.pMax}</div>
                  <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 9 }}>/ kg</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>{fish.vol}</div>
                  <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 9 }}>tons</div>
                </div>
              </div>
              <div style={{ padding: "0 16px 10px", background: i % 2 === 0 ? "white" : C.cardAlt }}>
                <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 11, lineHeight: 1.5 }}>Note: {fish.note}</div>
              </div>
            </div>
          ))}
        </Card>

        <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 11, lineHeight: 1.7, padding: "0 4px 8px" }}>
          Disclaimer: Static local BFAR reference data, updated weekly. Use only for base catch/income planning models on dock.
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: Settings ─────────────────────────────────────────────────────────
function SettingsScreen({ profile, onBack, onReset, onProfile }: { profile: FisherProfile; onBack: () => void; onReset: () => void; onProfile: (p: FisherProfile) => void }) {
  const [lang, setLang] = useState<Lang>(profile.language);
  const [contact, setContact] = useState("+63 917 123 4567");
  const [editContact, setEditContact] = useState(false);

  const lph = MOTOR_LPH[profile.motorClass];
  const motorLabel = { small: "Small", typical: "Typical", heavier: "Heavier" }[profile.motorClass];
  const extras = { extraGrounds: profile.extraGrounds ?? [], extraHours: profile.extraHours ?? [], extraGear: profile.extraGear ?? [] };
  const allGrounds = [
    ...FISHING_GROUNDS,
    ...extras.extraGrounds.filter((g) => !FISHING_GROUNDS.includes(g)),
    ...(FISHING_GROUNDS.includes(profile.fishingGround) || extras.extraGrounds.includes(profile.fishingGround) ? [] : [profile.fishingGround]),
  ];
  const allHours = [
    ...BASE_HOURS,
    ...extras.extraHours.filter((h) => !BASE_HOURS.includes(h)),
    ...(BASE_HOURS.includes(profile.tripDuration) || extras.extraHours.includes(profile.tripDuration) ? [] : [profile.tripDuration]),
  ].sort((a, b) => a - b);
  const allGear = [
    ...BASE_GEAR,
    ...extras.extraGear.filter((g) => !BASE_GEAR.includes(g)),
    ...(BASE_GEAR.includes(profile.gear) || extras.extraGear.includes(profile.gear) ? [] : [profile.gear]),
  ];

  return (
    <div style={{ minHeight: "100%", background: C.bg, paddingBottom: 80 }}>
      <div className="app-bar">
        <button onClick={onBack} className="icon-key" aria-label="Back"><IcBack size={20} color="white"/></button>
        <div className="app-bar__title" style={{ flex: 1 }}>APP CONFIGURATION</div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-body)", fontSize: 13 }}>Kuya {profile.name.split(" ")[0]}</div>
      </div>

      <div className="screen-pad">
        {/* Language */}
        <Card screws style={{ padding: 20 }}>
          <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Wika / App Language</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", alignSelf: "center" }}>SELECT LANGUAGE / PUMILI NG WIKA</div>
            <div style={{ flex: 1 }}/>
            {(["en","fil"] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: "7px 16px", borderRadius: 8, background: lang === l ? C.header : C.blueFaint, color: lang === l ? "white" : C.textSub, border: `1.5px solid ${lang === l ? C.header : C.border}`, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {l === "en" ? "English" : "Filipino"}
              </button>
            ))}
          </div>
        </Card>

        <article className="tw-slide setup-card">
          <div className="setup-label">Engine class</div>
          <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{motorLabel} ({lph} L/h)</div>
          <label className="setup-label">Typical trip duration</label>
          <div className="setup-hours-picks">
            {allHours.map((h) => (
              <button key={h} type="button" className={profile.tripDuration === h ? "is-on" : ""} onClick={() => onProfile({ ...profile, ...extras, tripDuration: h })}>
                {h}h
              </button>
            ))}
          </div>
          <AddOther
            placeholder="e.g. 6.5"
            onAdd={(v) => {
              const n = Number(v);
              if (!n || n < 0.5 || n > 24) return;
              const hours = Math.round(n * 2) / 2;
              onProfile({
                ...profile,
                ...extras,
                tripDuration: hours,
                extraHours: extras.extraHours.includes(hours) ? extras.extraHours : [...extras.extraHours, hours],
              });
            }}
          />
          <label className="setup-label">Primary fishing ground</label>
          <div className="setup-chips">
            {allGrounds.map((g) => (
              <button key={g} type="button" className={profile.fishingGround === g ? "is-on" : ""} onClick={() => onProfile({ ...profile, ...extras, fishingGround: g })}>
                {g}
              </button>
            ))}
          </div>
          <AddOther
            placeholder="e.g. Malabon boundary"
            onAdd={(v) => {
              const exists = allGrounds.some((g) => g.toLowerCase() === v.toLowerCase());
              onProfile({
                ...profile,
                ...extras,
                fishingGround: v,
                extraGrounds: exists ? extras.extraGrounds : [...extras.extraGrounds, v],
              });
            }}
          />
          <label className="setup-label">Gear type</label>
          <div className="setup-chips">
            {allGear.map((g) => (
              <button key={g} type="button" className={profile.gear === g ? "is-on" : ""} onClick={() => onProfile({ ...profile, ...extras, gear: g })}>
                {g}
              </button>
            ))}
          </div>
          <AddOther
            placeholder="e.g. Panakot, Bubo..."
            onAdd={(v) => {
              const exists = allGear.some((g) => g.toLowerCase() === v.toLowerCase());
              onProfile({
                ...profile,
                ...extras,
                gear: v,
                extraGear: exists ? extras.extraGear : [...extras.extraGear, v],
              });
            }}
          />
        </article>

        {/* Family contact */}
        <Card screws style={{ padding: 20 }}>
          <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Family Emergency Safety Contact</div>
          <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>PRIMARY SMS CONTACT (WIFE)</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {editContact
              ? <input value={contact} onChange={e => setContact(e.target.value)} style={{ flex: 1, padding: "10px 12px", border: `1.5px solid ${C.blue}`, borderRadius: 8, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: C.text, outline: "none", background: C.blueFaint }} autoFocus/>
              : <div style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 900, color: C.text }}>Rosa {contact}</div>
            }
            <button onClick={() => setEditContact(v => !v)} style={{ padding: "8px 16px", borderRadius: 8, background: C.blueFaint, border: `1px solid ${C.border}`, color: C.blue, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {editContact ? "Save" : "Change"}
            </button>
          </div>
        </Card>

        {/* System status */}
        <Card screws style={{ padding: 20 }}>
          <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>System Status</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            {[
              { label: "LAST SYNCHRONIZED", value: "5:42 AM Today" },
              { label: "CONNECTION LOOKUP", value: "Searching..." },
              { label: "LOCAL CACHE SIZE", value: "12 MB" },
              { label: "STATUS", value: "OFFLINE CACHED READY", color: C.go },
            ].map(s => (
              <div key={s.label} style={{ background: C.blueFaint, borderRadius: 8, padding: "8px 8px", textAlign: "center" }}>
                <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>{s.label}</div>
                <div style={{ color: (s as any).color || C.text, fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, lineHeight: 1.3 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Pilot scenarios */}
        <Card screws style={{ padding: 20 }}>
          <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Pilot Phase Simulation Scenarios</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "GO SCENARIO", bg: C.goBg, border: C.goBorder, color: C.go },
              { label: "CAUTION VERDICT", bg: C.cautionBg, border: C.cautionBorder, color: C.caution },
              { label: "STAY (ECONOMICS)", bg: C.stayBg, border: C.stayBorder, color: C.stay },
              { label: "STAY (WAVES)", bg: C.stayBg, border: C.stayBorder, color: C.stay },
            ].map(s => (
              <button key={s.label} style={{ padding: "12px 8px", borderRadius: 10, background: s.bg, border: `1.5px solid ${s.border}`, color: s.color, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {s.label}
              </button>
            ))}
          </div>
          <button onClick={onReset} style={{ width: "100%", marginTop: 10, padding: "10px 0", background: "transparent", border: "none", cursor: "pointer", color: C.blue, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600 }}>
            Reset Onboarding Decision Parameters
          </button>
        </Card>

        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <MascotSlot size={72} alt="Settings mascot" src={mascotSettings} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "8px 0 4px" }}>
            <TripWiseLogo size={26}/>
            <span style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800, letterSpacing: "0.12em" }}>TRIPWISE</span>
          </div>
          <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 10 }}>v1.0.0 Pilot  •  Data: PAGASA · NAMRIA · BFAR · DOE</div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [profile, setProfile] = useState<FisherProfile | null>(null);
  const [trips, setTrips] = useState<TripRecord[]>(() => seedTrips());
  const [savedSpots, setSavedSpots] = useState<SavedSpot[]>([]);
  const [budget, setBudget] = useState<Budget>({ period: "weekly", amount: 5000 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const nav = useCallback((s: Screen) => setScreen(s), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [screen]);

  const showNav = profile !== null && !["landing","login","onboarding"].includes(screen);

  return (
    <div className="app-shell">
      <div ref={scrollRef} className="app-scroll">
        <div key={screen} className="screen-enter">
          {screen === "landing"  && <LandingScreen onNav={nav}/>}
          {screen === "login"    && <LoginScreen onNav={nav} onSuccess={() => { if (!profile) nav("onboarding"); else nav("home"); }}/>}
          {screen === "onboarding" && <OnboardingScreen onComplete={p => { setProfile(p); nav("home"); }}/>}

          {profile && <>
            {screen === "home"      && <HomeScreen profile={profile} onNav={nav}/>}
            {screen === "weather"   && <WeatherScreen onBack={() => nav("home")}/>}
            {screen === "math"      && <MathScreen profile={profile} onBack={() => nav("home")}/>}
            {screen === "whatif"    && <WhatIfScreen profile={profile} trips={trips} onBack={() => nav("home")}/>}
            {screen === "map"       && (
              <MapScreen
                profile={profile}
                savedSpots={savedSpots}
                onSaveSpot={(spot) => setSavedSpots((s) => [spot, ...s])}
                onSaveCatch={(input) => setTrips((t) => applyCatchToTrips(t, input))}
                onBack={() => nav("home")}
              />
            )}
            {screen === "catchlog"  && (
              <LedgerScreen
                trips={trips}
                budget={budget}
                firstName={profile.name.split(" ")[0]}
                onBudget={setBudget}
                onTrips={setTrips}
                onBack={() => nav("home")}
              />
            )}
            {screen === "history"   && (
              <HistoryScreen
                trips={trips}
                firstName={profile.name.split(" ")[0]}
                onBack={() => nav("home")}
                onReference={() => nav("reference")}
              />
            )}
            {screen === "reference" && <ReferenceScreen onBack={() => nav("history")}/>}
            {screen === "settings"  && <SettingsScreen profile={profile} onBack={() => nav("home")} onProfile={setProfile} onReset={() => { setProfile(null); nav("onboarding"); }}/>}
          </>}
        </div>
      </div>

      {showNav && <BottomNav current={screen} onNav={nav}/>}
    </div>
  );
}
