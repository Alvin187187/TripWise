import React, { useState, useCallback, useRef, useEffect } from "react";
import { logoOnNavy, mascotCatch, mascotFront, mascotHistory, mascotHome, mascotLanding, mascotOnboarding, mascotSettings, photos } from "./assets/media";
import Icon, { type IconName } from "./icons";

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

const BFAR_DATA = [
  { species: "Galunggong", local: "Round Scad",      pMin: 130, pMax: 145, vol: 42, note: "High demand, stable arrivals" },
  { species: "Tamban",     local: "Sardinella",      pMin: 95,  pMax: 110, vol: 28, note: "Moderate schooling near Tangos" },
  { species: "Tulingan",   local: "Frigate Tuna",    pMin: 180, pMax: 220, vol: 15, note: "Limited offshore catch reported" },
  { species: "Bangus",     local: "Milkfish",        pMin: 160, pMax: 180, vol: 35, note: "From surrounding Bulacan pens" },
  { species: "Tilapia",    local: "Tilapia",         pMin: 120, pMax: 140, vol: 22, note: "Stable pricing this week" },
  { species: "Sapsap",     local: "Ponyfish",        pMin: 85,  pMax: 100, vol: 18, note: "High volume at Navotas Fish Port" },
  { species: "Alumahan",   local: "Indian Mackerel", pMin: 150, pMax: 170, vol: 12, note: "Fewer landings reported" },
];

const TRIP_LOG = [
  { date: "21 Aug", verdict: "GO"      as Verdict, catchKg: 11.0, revenue: 1507, fuel: 1120 },
  { date: "19 Aug", verdict: "STAY"    as Verdict, catchKg: 0,    revenue: 0,    fuel: 0    },
  { date: "18 Aug", verdict: "CAUTION" as Verdict, catchKg: 8.5,  revenue: 1165, fuel: 1120 },
  { date: "15 Aug", verdict: "GO"      as Verdict, catchKg: 12.2, revenue: 1671, fuel: 1120 },
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
    <div style={{ minHeight: "100%", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="app-bar">
        <TripWiseLogo size={38}/>
        <div style={{ flex: 1 }}>
          <div className="app-bar__title">TRIPWISE</div>
          <div className="app-bar__sub">Worth the fuel. Safe home.</div>
        </div>
        <MascotSlot size={52} alt="Setup mascot" src={mascotOnboarding} />
      </div>

      {/* Safety banner */}
      <div style={{ background: "#FEF2F2", borderBottom: `1px solid ${C.stayBorder}`, padding: "12px 20px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <IconSlot name="alert" size={18} color={C.stay} title="Safety warning" />
        <div style={{ color: "#7F1D1D", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>SAFETY RULE: If the sea is dangerous, STAY – always.</div>
      </div>

        <div className="stack" style={{ flex: 1, padding: "20px 20px 32px", overflow: "auto" }}>

        {/* Language */}
        <div className="panel panel--screws" style={{ padding: 20 }}>
          <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Wika / Language</div>
          <div style={{ display: "flex", gap: 10 }}>
            {(["en","fil"] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, background: lang === l ? C.header : C.blueFaint, color: lang === l ? "white" : C.textSub, border: `1.5px solid ${lang === l ? C.header : C.border}`, fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                {l === "en" ? "English" : "Filipino"}
              </button>
            ))}
          </div>
        </div>

        {/* Fisher name */}
        <div className="panel panel--screws" style={{ padding: 20 }}>
          <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Fisher Name <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11 }}>(optional)</span>
          </div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mang Nardo"
            style={{ width: "100%" }}
            className="slot"
            onFocus={e => e.currentTarget.style.borderColor = C.blue}
            onBlur={e => e.currentTarget.style.borderColor = C.border}
          />
        </div>

        {/* Motor class */}
        <div className="panel panel--screws" style={{ padding: 20 }}>
          <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Boat Motor / Engine Class</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {motorOptions.map(opt => (
              <button key={opt.id} onClick={() => setMotor(opt.id)} style={{ padding: "14px 8px", borderRadius: 12, background: motor === opt.id ? C.header : C.blueFaint, color: motor === opt.id ? "white" : C.textSub, border: `1.5px solid ${motor === opt.id ? C.header : C.border}`, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, letterSpacing: "0.02em" }}>{opt.label}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, marginTop: 3, opacity: 0.75 }}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Trip duration — manual input + suggestions */}
        <div className="panel panel--screws" style={{ padding: 20 }}>
          <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Typical Trip Duration</div>
          {/* Manual input */}
          <div className="slot-wrap" style={{ marginBottom: 12 }}>
            <input
              type="number" inputMode="decimal" min={0.5} max={24} step={0.5}
              value={durationInput}
              onChange={e => setDurationInput(e.target.value)}
              placeholder="e.g. 5"
              className="slot"
              style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800 }}
            />
            <div style={{ padding: "0 16px", color: C.textSub, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, borderLeft: `1px solid ${C.border}`, alignSelf: "stretch", display: "flex", alignItems: "center" }}>hours</div>
          </div>
          {/* Quick suggestions */}
          <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 11, marginBottom: 8 }}>Quick suggestions:</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[3, 4, 5, 8].map(h => (
              <button key={h} onClick={() => handleDurationSuggestion(h)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, background: parseFloat(durationInput) === h ? C.blueLight : "white", color: parseFloat(durationInput) === h ? C.blue : C.textSub, border: `1.5px solid ${parseFloat(durationInput) === h ? C.blue : C.border}`, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                {h}h
              </button>
            ))}
          </div>
        </div>

        {/* Fishing ground — manual text + dropdown suggestions */}
        <div className="panel panel--screws" style={{ padding: 20, position: "relative" }}>
          <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Primary Fishing Ground</div>
          <div style={{ position: "relative" }}>
            <input
              value={ground}
              onChange={e => { setGround(e.target.value); setGroundOpen(true); }}
              onFocus={() => setGroundOpen(true)}
              placeholder="Type or pick from list below..."
              className="slot"
            style={{ fontFamily: "var(--font-body)" }}
            />
            <button onClick={() => setGroundOpen(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <IcChevD size={18} color={C.blue}/>
            </button>
          </div>
          {groundOpen && (
            <div style={{ marginTop: 6, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 16px rgba(14,76,129,0.12)" }}>
              {FISHING_GROUNDS.filter(g => g.toLowerCase().includes(ground.toLowerCase()) || ground === "").map((g, i, arr) => (
                <button key={g} onClick={() => { setGround(g); setGroundOpen(false); }} style={{ width: "100%", padding: "12px 14px", textAlign: "left", background: g === ground ? C.blueLight : "white", border: "none", borderBottom: i < arr.length - 1 ? `1px solid ${C.borderLight}` : "none", cursor: "pointer", color: C.text, fontFamily: "var(--font-body)", fontSize: 14, transition: "background 0.1s" }}>
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Gear type */}
        <div className="panel panel--screws" style={{ padding: 20 }}>
          <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Gear Type</div>
          <input value={gear} onChange={e => setGear(e.target.value)} placeholder="e.g. Gillnet, Kawil, Palakol..."
            className="slot"
            onFocus={e => e.currentTarget.style.borderColor = C.blue}
            onBlur={e => e.currentTarget.style.borderColor = gear ? C.blue : C.border}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {["Gillnet / Lambat", "Kawil (Hook & Line)", "Palakol (Gill Net)", "Bintol (Trap)", "Trawl"].map(g => (
              <button key={g} onClick={() => setGear(g)} style={{ padding: "6px 12px", borderRadius: 20, background: gear === g ? C.blueLight : C.blueFaint, color: gear === g ? C.blue : C.textSub, border: `1px solid ${gear === g ? C.blue : C.border}`, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ paddingTop: 4, display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => onComplete({ name: name || "Kuya Jun", language: lang, motorClass: motor, tripDuration: durationVal || 5, fishingGround: ground || DEFAULT_GROUND, gear: gear || "Gillnet / Lambat" })}
            disabled={!canContinue}
            className="key-btn key-btn--primary key-btn--lg key-btn--block">
            CONTINUE TO APP
          </button>
          <button onClick={() => onComplete({ name: "Demo Fisher", language: "en", motorClass: "typical", tripDuration: 5, fishingGround: DEFAULT_GROUND, gear: "Gillnet / Lambat" })}
            style={{ width: "100%", padding: "13px 0", background: "transparent", border: "none", cursor: "pointer", color: C.textSub, fontFamily: "var(--font-body)", fontSize: 13 }}>
            Skip for demo mode
          </button>
        </div>
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
function WhatIfScreen({ profile, onBack }: { profile: FisherProfile; onBack: () => void }) {
  const lph = MOTOR_LPH[profile.motorClass];
  const [fuelPrice, setFuelPrice] = useState(68);
  const [catchKg, setCatchKg] = useState(11);
  const [tripHrs, setTripHrs] = useState(profile.tripDuration);
  const [fishPrice, setFishPrice] = useState(TAMBAN_PRICE);
  const [waveHt, setWaveHt] = useState(0.8);
  const [preset, setPreset] = useState<string | null>(null);

  const fuelCost = Math.round(lph * tripHrs * fuelPrice);
  const otherCost = 300;
  const totalCost = fuelCost + otherCost;
  const revenue = Math.round(catchKg * fishPrice);
  const netProfit = revenue - totalCost;
  const breakeven = Math.round((totalCost / fishPrice) * 10) / 10;
  const safeScore = Math.round(Math.max(0, 100 - waveHt * 20));
  const econScore = Math.round(Math.max(0, (netProfit / totalCost) * 100 + 50));
  const safetyIndex = waveHt > 2.0 ? 0 : safeScore;
  const verdict: Verdict = waveHt > 2.0 ? "STAY" : netProfit > 500 ? "GO" : netProfit > 0 ? "CAUTION" : "STAY";

  const presets = [
    { label: "Diesel +₱5", action: () => { setFuelPrice(73); setPreset("Diesel +₱5"); } },
    { label: "Bad Day (4kg)", action: () => { setCatchKg(4); setPreset("Bad Day (4kg)"); } },
    { label: "Rough Sea (2.1m)", action: () => { setWaveHt(2.1); setPreset("Rough Sea (2.1m)"); } },
  ];

  const vc = { GO: { color: C.go, bg: C.goBg, border: C.goBorder }, CAUTION: { color: C.caution, bg: C.cautionBg, border: C.cautionBorder }, STAY: { color: C.stay, bg: C.stayBg, border: C.stayBorder } }[verdict];

  return (
    <div style={{ minHeight: "100%", background: C.bg, paddingBottom: 80 }}>
      <div className="app-bar">
        <button onClick={onBack} className="icon-key" aria-label="Back"><IcBack size={20} color="white"/></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-bar__title">WHAT IF: TRIP SIMULATOR</div>
        </div>
        <VerdictBadge verdict={verdict}/>
      </div>

      <div className="screen-pad">
        {/* Presets */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, alignSelf: "center" }}>PRESETS:</div>
          {presets.map(p => (
            <button key={p.label} onClick={p.action} style={{ padding: "7px 12px", borderRadius: 20, background: preset === p.label ? C.header : C.card, color: preset === p.label ? "white" : C.textSub, border: `1px solid ${preset === p.label ? C.header : C.border}`, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Result card */}
        <Card style={{ padding: "14px 16px", marginBottom: 12, border: `1.5px solid ${vc.border}`, background: vc.bg }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 12 }}>
            {[
              { l: "TOTAL DIESEL", v: `₱${fuelCost.toLocaleString()}` },
              { l: "OTHER COSTS", v: `₱${otherCost}` },
              { l: "TOTAL SIM COST", v: `₱${totalCost.toLocaleString()}` },
            ].map(c => <div key={c.l} style={{ textAlign: "center" }}><div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.l}</div><div style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, marginTop: 2 }}>{c.v}</div></div>)}
          </div>
          <div style={{ height: 1, background: vc.border, marginBottom: 12 }}/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 14 }}>
            {[
              { l: "BREAK-EVEN", v: `${breakeven} kg` },
              { l: "EST. REVENUE", v: `₱${revenue.toLocaleString()}` },
              { l: "NET PROFIT", v: `${netProfit >= 0 ? "+" : ""}₱${netProfit.toLocaleString()}`, color: netProfit >= 0 ? C.go : C.stay },
            ].map(c => <div key={c.l} style={{ textAlign: "center" }}><div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.l}</div><div style={{ color: (c as any).color || C.text, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, marginTop: 2 }}>{c.v}</div></div>)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ l: "Safety Score", v: safeScore }, { l: "Economic", v: econScore }, { l: "Safety Index", v: safetyIndex }].map(s => (
              <div key={s.l} style={{ flex: 1, textAlign: "center", background: "white", borderRadius: 8, padding: "8px 4px", border: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: s.v >= 70 ? C.go : s.v >= 40 ? C.caution : C.stay }}>{s.v}</div>
                <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 9 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Safety override warning */}
        {waveHt > 2.0 && (
          <div style={{ background: C.stayBg, border: `1.5px solid ${C.stayBorder}`, borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
            <div style={{ color: C.stay, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700 }}>Safety Overrides Economics</div>
            <div style={{ color: "#7F1D1D", fontFamily: "var(--font-body)", fontSize: 11, lineHeight: 1.5, marginTop: 3 }}>If Wave Height exceeds 2.0m, final simulated verdict automatically changes to STAY, even if expected catch is 20kg.</div>
          </div>
        )}

        {/* Sliders */}
        <Card screws style={{ padding: 20 }}>
          <SectionTitle>Adjust Simulation Parameters</SectionTitle>
          {[
            { label: "Fuel Price per Liter", val: fuelPrice, min: 50, max: 100, step: 0.5, display: `₱${fuelPrice.toFixed(0)}`, set: setFuelPrice },
            { label: "Expected Catch Volume", val: catchKg, min: 2, max: 20, step: 1, display: `${catchKg} kg`, set: setCatchKg },
            { label: "Trip Duration", val: tripHrs, min: 2, max: 8, step: 1, display: `${tripHrs} hours`, set: setTripHrs },
            { label: "Tamban Blend Market Price", val: fishPrice, min: 100, max: 250, step: 5, display: `₱${fishPrice}/kg`, set: setFishPrice },
            { label: "Forecast Wave Height", val: waveHt, min: 0.2, max: 3.2, step: 0.1, display: `${waveHt.toFixed(1)}m`, set: setWaveHt },
          ].map(s => (
            <div key={s.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 12 }}>{s.label}</div>
                <div style={{ color: C.blue, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}>{s.display}</div>
              </div>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e => { s.set(+e.target.value); setPreset(null); }}/>
              <div style={{ display: "flex", justifyContent: "space-between", color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 10, marginTop: 2 }}>
                <span>{s.min}</span><span>{s.max}</span>
              </div>
            </div>
          ))}
        </Card>

        <button onClick={onBack} style={{ width: "100%", padding: "14px", borderRadius: 10, background: C.blueFaint, border: `1px solid ${C.border}`, color: C.blue, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Show Simulation Math
        </button>
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

// ─── SCREEN: Map ──────────────────────────────────────────────────────────────
function MapScreen({ profile, onBack }: { profile: FisherProfile; onBack: () => void }) {
  const [sharing, setSharing] = useState(true);
  const [activeFilter, setActiveFilter] = useState("Spots");
  const [sos, setSos] = useState(false);

  return (
    <div style={{ minHeight: "100%", background: C.bg, paddingBottom: 80 }}>
      <div className="app-bar">
        <button onClick={onBack} className="icon-key" aria-label="Back"><IcBack size={20} color="white"/></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-bar__title">OFFLINE MAP · MANILA BAY</div>
          <div className="app-bar__sub">246° WSW  ·  5.4 Knots  ·  14.639°N, 120.933°E</div>
        </div>
        {!sos ? (
          <button
            className="key-btn key-btn--danger key-btn--sm"
            onPointerDown={() => { const t = setTimeout(() => setSos(true), 1800); const up = () => { clearTimeout(t); document.removeEventListener("pointerup", up); }; document.addEventListener("pointerup", up); }}
          >
            <IconSlot name="lifebuoy" size={16} color="#fff" title="SOS" />
            SOS
          </button>
        ) : (
          <KeyBtn variant="danger" size="sm" onClick={() => setSos(false)}>CALLING... CANCEL</KeyBtn>
        )}
      </div>

      <div className="screen-pad">
        {/* Map */}
        <div className="panel" style={{ height: 260, borderRadius: 20, overflow: "hidden", position: "relative", boxShadow: "var(--shadow-hard)" }}>
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice">
            <rect width="400" height="260" fill="#c8dff0"/>
            <path d="M0,0 L230,0 L235,30 L228,60 L222,90 L215,120 L208,150 L202,180 L196,210 L190,240 L185,260 L0,260 Z" fill="#e8f0e4"/>
            <path d="M240,0 L290,0 L285,30 L278,60 L270,90 L263,120 L256,150 L249,180 L242,210 L236,240 L232,260 L224,260 L228,240 L232,210 L237,180 L242,150 L248,120 L254,90 L260,60 L265,30 L268,0 Z" fill="#e8f0e4"/>
            {[[20,20,18,14],[48,20,22,14],[80,20,20,14],[20,42,26,14],[52,42,18,14],[80,42,22,14],[110,20,20,14],[140,20,18,14],[110,42,22,14],[20,80,20,18],[46,80,18,18],[20,130,22,18],[48,130,18,18],[20,180,20,18]].map(([x,y,w,h],i)=>(
              <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#d8e8c8" stroke="#c5d8b5" strokeWidth="0.5"/>
            ))}
            <line x1="0" y1="90" x2="210" y2="90" stroke="white" strokeWidth="5"/><line x1="0" y1="90" x2="210" y2="90" stroke="#f8c84a" strokeWidth="1.5" strokeDasharray="8,8"/>
            <line x1="0" y1="155" x2="215" y2="155" stroke="white" strokeWidth="5"/><line x1="0" y1="155" x2="215" y2="155" stroke="#f8c84a" strokeWidth="1.5" strokeDasharray="8,8"/>
            <line x1="110" y1="0" x2="110" y2="200" stroke="white" strokeWidth="5"/><line x1="110" y1="0" x2="110" y2="200" stroke="#f8c84a" strokeWidth="1.5" strokeDasharray="8,8"/>
            {[[0,55,200,55],[0,115,210,115],[0,175,208,175],[35,0,35,210],[75,0,75,210],[148,0,148,210]].map(([x1,y1,x2,y2],i)=>(
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="2.5" opacity="0.8"/>
            ))}
            <text x="320" y="130" fill="#7aaec8" fontSize="13" fontWeight="600" fontFamily="sans-serif" textAnchor="middle" transform="rotate(-10,320,130)" opacity="0.9">Manila Bay</text>
            <polyline points="170,230 155,185 135,155 115,120 95,90 70,55 55,35" fill="none" stroke={C.stay} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,4" opacity="0.85"/>
            {/* Spots */}
            <g transform="translate(90,78)" style={{ cursor: "pointer" }}>
              <path d="M10,0 C4.5,0 0,4.5 0,10 C0,16.5 10,23 10,23 C10,23 20,16.5 20,10 C20,4.5 15.5,0 10,0 Z" fill={C.go}/>
              <circle cx="10" cy="10" r="4" fill="white" opacity="0.9"/>
              <text x="22" y="-3" fill={C.text} fontSize="9" fontFamily="sans-serif" fontWeight="700">Tangos</text>
              <text x="22" y="8" fill={C.go} fontSize="8" fontFamily="sans-serif">13 kg</text>
            </g>
            <g transform="translate(30,95)" style={{ cursor: "pointer" }}>
              <path d="M8,0 C3.6,0 0,3.6 0,8 C0,13 8,18 8,18 C8,18 16,13 16,8 C16,3.6 12.4,0 8,0 Z" fill={C.caution}/>
              <circle cx="8" cy="8" r="3.2" fill="white" opacity="0.9"/>
              <text x="18" y="4" fill={C.text} fontSize="9" fontFamily="sans-serif" fontWeight="700">Pamarawan</text>
            </g>
            {/* Home position */}
            <g transform="translate(170,230)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
              <circle cx="0" cy="0" r="12" fill={C.header}/>
              <circle cx="0" cy="0" r="8" fill="white"/>
              <foreignObject x="-8" y="-8" width="16" height="16">
                <div style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="sail-boat" size={12} color={C.header} title="Boat position" />
                </div>
              </foreignObject>
              <circle cx="0" cy="0" r="20" fill="none" stroke={C.header} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6"/>
            </g>
            {/* Scale */}
            <g transform="translate(10,240)"><rect x="0" y="0" width="52" height="10" rx="2" fill="white" opacity="0.88"/><line x1="2" y1="5" x2="50" y2="5" stroke="#555" strokeWidth="1.5"/><line x1="2" y1="3" x2="2" y2="8" stroke="#555" strokeWidth="1.5"/><line x1="50" y1="3" x2="50" y2="8" stroke="#555" strokeWidth="1.5"/><text x="26" y="5" fontSize="6" textAnchor="middle" fill="#555" fontFamily="sans-serif" dominantBaseline="middle">Scale 1 km</text></g>
            {/* Compass */}
            <g transform="translate(375,20)"><circle cx="0" cy="0" r="12" fill="white" opacity="0.9"/><text x="0" y="-2" fontSize="7" textAnchor="middle" fill="#DC2626" fontFamily="sans-serif" fontWeight="700">N</text><polygon points="0,-9 2.5,-2 0,0 -2.5,-2" fill="#DC2626"/><polygon points="0,9 2.5,2 0,0 -2.5,2" fill="#aaa"/></g>
          </svg>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["Spots", "Routes", "Wind", "Rain", "Warnings"].map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{ padding: "6px 12px", borderRadius: 20, background: activeFilter === f ? C.header : C.card, color: activeFilter === f ? "white" : C.textSub, border: `1px solid ${activeFilter === f ? C.header : C.border}`, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              {f}
            </button>
          ))}
        </div>

        {/* Sharing */}
        <Card style={{ padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: sharing ? C.blueLight : C.blueFaint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IcShare size={16} color={sharing ? C.blue : C.textFaint}/>
              </div>
              <div>
                <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600 }}>Rosa (Asawa) can see me</div>
                <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 11 }}>Auto-sends periodic low-bandwidth SMS coordinates</div>
              </div>
            </div>
            <Toggle on={sharing} onChange={setSharing}/>
          </div>
        </Card>

        <div style={{ display: "flex", gap: 10 }}>
          <KeyBtn variant="primary" onClick={() => {}} style={{ flex: 1 }}>START DEPARTURE LOG</KeyBtn>
          <HoldSosButton onActivate={() => setSos(true)}/>
        </div>

        <SectionTitle>Familiar Fishing Spots</SectionTitle>
        {MAP_SPOTS.map((spot, i) => (
          <SceneCard
            key={i}
            compact
            badge={<VerdictBadge verdict={spot.verdict}/>}
            visual={
              <div className="thumb-visual thumb-visual--spot">
                <PhotoWell src={[photos.mapTangos, photos.mapCoast, photos.mapBinuangan][i]} alt={spot.name} wash="sea">
                  <span className="icon-slot icon-slot--lg icon-slot--round" style={{ width: 40, height: 40, background: "rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="map-marker" size={22} color="#fff" title={spot.name} />
                  </span>
                </PhotoWell>
              </div>
            }
          >
            <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 700 }}>{spot.name}</div>
            <div className="num" style={{ color: C.textFaint, fontSize: 12 }}>{spot.dist}  ·  Last: {spot.lastKg} kg ({spot.species})</div>
          </SceneCard>
        ))}
      </div>
    </div>
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

// ─── SCREEN: History ──────────────────────────────────────────────────────────
function HistoryScreen({ onBack, onReference }: { onBack: () => void; onReference: () => void }) {
  const totalFuelSaved = 2340;
  const incomeProtected = 8100;
  const bestGround = "Tangos";
  const maxRev = Math.max(...TRIP_LOG.map(t => t.revenue));

  return (
    <div style={{ minHeight: "100%", background: C.bg, paddingBottom: 80 }}>
      <div className="app-bar">
        <button onClick={onBack} className="icon-key" aria-label="Back"><IcBack size={20} color="white"/></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-bar__title">TRIP HISTORY &amp; SCORES</div>
        </div>
        <span className="verdict" style={{ background: C.go, color: "white", border: "none" }}>SDG 14</span>
        <span className="verdict" style={{ background: C.caution, color: "white", border: "none" }}>SDG 1</span>
      </div>

      <div className="screen-pad">
        {/* Impact dashboard */}
        <Card screws style={{ padding: 20 }}>
          <SectionTitle>Your Estimated Impact Dashboard</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[
              { label: "TOTAL FUEL SAVED", value: `₱${(totalFuelSaved/1000).toFixed(1)}k`, sub: "5 Safe Stays", color: C.go },
              { label: "INCOME PROTECTED", value: `₱${(incomeProtected/1000).toFixed(1)}k`, sub: "Avoided Losses", color: C.blue },
              { label: "BEST GROUND (MO)", value: bestGround, sub: "12.4 kg Avg", color: C.caution },
            ].map(m => (
              <div key={m.label} style={{ textAlign: "center" }}>
                <div style={{ color: m.color, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 900 }}>{m.value}</div>
                <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{m.label}</div>
                <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 10, marginTop: 1 }}>{m.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.goBg, border: `1px solid ${C.goBorder}`, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
            <span style={{ color: C.goText, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <IconSlot name="fire" size={16} color={C.go} title="Stay streak" />
              Stay Streak: 2 Days. Saved ₱780 in fuel costs this week!
            </span>
          </div>
        </Card>

        {/* Performance scores */}
        <Card screws style={{ padding: 20 }}>
          <SectionTitle>Historical Performance Scores</SectionTitle>
          {[
            { label: "Fishing Spot Utility Score", sub: "Based on yield predictions vs actual catch", score: 82, color: C.go },
            { label: "Economic Margin Ratio", sub: "Expected revenue divided by trip cost", score: 76, color: C.blue },
            { label: "Safety Threshold Score", sub: "Wind and wave heights safely observed", score: 94, color: "#16A34A" },
          ].map((s, i) => (
            <div key={s.label} style={{ marginBottom: i < 2 ? 14 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 11 }}>{s.sub}</div>
                </div>
                <div style={{ color: s.color, fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, marginLeft: 12 }}>{s.score}</div>
              </div>
              <div className="chart-track" style={{ height: 6, borderRadius: 3, background: C.blueLight }}>
                <div className="chart-fill" style={{ width: `${s.score}%`, background: s.color, animationDelay: `${i * 90}ms` }}/>
              </div>
            </div>
          ))}
        </Card>

        {/* Month vs last month */}
        <Card screws style={{ padding: 20 }}>
          <SectionTitle>This Month vs Last Month</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Catch", value: "+18%", color: C.go },
              { label: "Net Income", value: "+12%", color: C.go },
              { label: "Fuel Cost", value: "+6%", color: C.caution },
              { label: "Est Profit", value: "+15%", color: C.go },
            ].map(m => (
              <div key={m.label} style={{ textAlign: "center", background: C.blueFaint, borderRadius: 8, padding: "10px 4px" }}>
                <div style={{ color: m.color, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900 }}>▲ {m.value}</div>
                <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 10, marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Trip log table */}
        <Card style={{ padding: 0, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>Recent Trip Logs</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "48px 58px 60px 70px 70px 60px", padding: "8px 14px", borderBottom: `1px solid ${C.borderLight}` }}>
            {["Date", "Verdict", "Catch", "Net Income", "Fuel Cost", "Profit"].map(h => (
              <div key={h} style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: h !== "Date" && h !== "Verdict" ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          {TRIP_LOG.map((trip, i) => {
            const profit = trip.revenue - trip.fuel;
            const vc = { GO: C.go, CAUTION: C.caution, STAY: C.stay }[trip.verdict];
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "48px 58px 60px 70px 70px 60px", padding: "10px 14px", borderBottom: i < TRIP_LOG.length - 1 ? `1px solid ${C.borderLight}` : "none", alignItems: "center" }}>
                <div style={{ color: C.textSub, fontFamily: "var(--font-body)", fontSize: 12 }}>{trip.date}</div>
                <VerdictBadge verdict={trip.verdict} size="sm"/>
                <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, textAlign: "right" }}>{trip.catchKg > 0 ? `${trip.catchKg} kg` : "0 kg (Waves)"}</div>
                <div style={{ color: trip.revenue > 0 ? C.go : C.textFaint, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, textAlign: "right" }}>{trip.revenue > 0 ? `₱${trip.revenue.toLocaleString()}` : `₱${trip.fuel > 0 ? trip.fuel.toLocaleString() : "—"} Saved`}</div>
                <div style={{ color: trip.fuel > 0 ? C.textSub : C.textFaint, fontFamily: "var(--font-body)", fontSize: 12, textAlign: "right" }}>₱{trip.fuel.toLocaleString()}</div>
                <div style={{ color: profit > 0 ? C.go : profit < 0 ? C.stay : C.textFaint, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, textAlign: "right" }}>{profit > 0 ? `+₱${profit.toLocaleString()}` : trip.fuel > 0 ? `₱${Math.abs(profit).toLocaleString()}` : "—"}</div>
              </div>
            );
          })}
          <button onClick={onReference} style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: C.blueFaint, border: "none", cursor: "pointer", color: C.blue, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, borderTop: `1px solid ${C.border}` }}>
            View Official Navotas Port Landings Report →
          </button>
        </Card>
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
function SettingsScreen({ profile, onBack, onReset }: { profile: FisherProfile; onBack: () => void; onReset: () => void }) {
  const [lang, setLang] = useState<Lang>(profile.language);
  const [contact, setContact] = useState("+63 917 123 4567");
  const [editContact, setEditContact] = useState(false);

  const lph = MOTOR_LPH[profile.motorClass];
  const motorLabel = { small: "Small", typical: "Typical", heavier: "Heavier" }[profile.motorClass];

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

        {/* Profile locked */}
        <Card screws style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="lock" size={14} color={C.blue} title="Locked" />
            <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700 }}>Fisher Setup Profile (Locked)</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Engine Capacity Class", value: `${motorLabel} (${lph} L/h) consumption profile` },
              { label: "Default Trip Expected Duration", value: `${profile.tripDuration} Hours profile duration` },
              { label: "Primary Fishing Ground Bounds", value: `${profile.fishingGround} (Navotas Coast)` },
              { label: "Default Gear in Use", value: profile.gear },
            ].map(row => (
              <div key={row.label}>
                <div style={{ color: C.textFaint, fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{row.label}</div>
                <div style={{ color: C.text, fontFamily: "var(--font-body)", fontSize: 13, marginTop: 1 }}>{row.value}</div>
              </div>
            ))}
          </div>
        </Card>

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
            {screen === "whatif"    && <WhatIfScreen profile={profile} onBack={() => nav("home")}/>}
            {screen === "map"       && <MapScreen profile={profile} onBack={() => nav("home")}/>}
            {screen === "catchlog"  && <CatchLogScreen profile={profile} onBack={() => nav("home")} onSave={() => nav("home")}/>}
            {screen === "history"   && <HistoryScreen onBack={() => nav("home")} onReference={() => nav("reference")}/>}
            {screen === "reference" && <ReferenceScreen onBack={() => nav("history")}/>}
            {screen === "settings"  && <SettingsScreen profile={profile} onBack={() => nav("home")} onReset={() => { setProfile(null); nav("onboarding"); }}/>}
          </>}
        </div>
      </div>

      {showNav && <BottomNav current={screen} onNav={nav}/>}
    </div>
  );
}
