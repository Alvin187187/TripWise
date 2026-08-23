import { useEffect, useMemo, useRef, useState } from "react";
import { GeoJSONSource, LngLatBounds, Map, Marker, NavigationControl, setWorkerUrl, type MapMouseEvent } from "maplibre-gl";
import maplibreWorker from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { mascotHistory, mascotMap, photos } from "./assets/media";
import Icon, { type IconName } from "./icons";
import { SPECIES, SPOT_META, uid, type SavedSpot, type SpotCat } from "./ledger";

setWorkerUrl(maplibreWorker);

type MotorClass = "small" | "typical" | "heavier";

interface FisherProfile {
  name: string;
  motorClass: MotorClass;
  fishingGround: string;
}

type Sheet = "about" | "spot" | "catch" | "qr" | "history" | null;
type RecordKind = "trolling" | "trotline" | null;

const HOME = { lat: 14.639, lng: 120.933 };
const DIESEL = 68;
const LPH: Record<MotorClass, number> = { small: 2.5, typical: 4.2, heavier: 6.5 };
const CRUISE_KMH = 12;
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const RASTER_STYLE = {
  version: 8 as const,
  sources: {
    carto: {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster" as const, source: "carto" }],
};

const SPOTS = [
  { name: "Tangos Shoal", lat: 14.6694, lng: 120.9478, dist: "2.4 km WSW", lastKg: 11.0, species: "Lambat", verdict: "GO" as const, photo: photos.mapTangos },
  { name: "Navotas Coast Deep", lat: 14.655, lng: 120.928, dist: "4.1 km NW", lastKg: 9.5, species: "Tamban", verdict: "CAUTION" as const, photo: photos.mapCoast },
  { name: "Binuangan Boundary", lat: 14.62, lng: 120.905, dist: "7.1 km SW", lastKg: 6.2, species: "Tulingan", verdict: "STAY" as const, photo: photos.mapBinuangan },
];

const TIMELINE = [
  { date: "Sat, Aug 23, 2026", path: [[120.933, 14.639], [120.94, 14.652], [120.948, 14.669]], items: [
    { kind: "spot", title: "Tangos Shoal", detail: "Left at 5:12 AM", meta: "11.0 kg Lambat" },
    { kind: "boat", title: "Trolling run", detail: "5:12 AM – 8:40 AM", meta: "6.8 km · 3 hr 28 min" },
    { kind: "home", title: "Navotas landing", detail: "Back at 9:05 AM", meta: "₱1,507 revenue" },
  ]},
  { date: "Thu, Aug 21, 2026", path: [[120.933, 14.639], [120.928, 14.655]], items: [
    { kind: "boat", title: "Coast hop", detail: "4:50 AM – 10:10 AM", meta: "4.1 km · GO day" },
    { kind: "home", title: "Navotas landing", detail: "Back at 10:22 AM", meta: "11.0 kg · ₱1,507" },
  ]},
];

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function fmtCoord(lat: number, lng: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${ns}, ${Math.abs(lng).toFixed(5)}° ${ew}`;
}

function pathLength(pts: { lat: number; lng: number }[]) {
  let km = 0;
  for (let i = 1; i < pts.length; i++) km += kmBetween(pts[i - 1], pts[i]);
  return km;
}

function qrCells(payload: string) {
  const n = 21;
  const cells: boolean[] = [];
  let h = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const finder =
        (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
      if (finder) {
        const ix = x < 7 ? x : x - (n - 7);
        const iy = y < 7 ? y : y - (n - 7);
        const ring = ix === 0 || iy === 0 || ix === 6 || iy === 6 || (ix >= 2 && ix <= 4 && iy >= 2 && iy <= 4);
        cells.push(ring);
      } else {
        const v = Math.imul(h ^ (x * 131 + y * 17), 2654435761) >>> 0;
        cells.push((v & 3) !== 0);
      }
    }
  }
  return { n, cells };
}

function updateMeasureLayer(map: Map, pts: { lat: number; lng: number }[]) {
  const data = {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: pts.map((p) => [p.lng, p.lat]) },
  };
  const src = map.getSource("tw-measure") as GeoJSONSource | undefined;
  if (src) src.setData(data);
  else if (map.isStyleLoaded() && pts.length) {
    map.addSource("tw-measure", { type: "geojson", data });
    if (!map.getLayer("tw-measure-line")) {
      map.addLayer({
        id: "tw-measure-line",
        type: "line",
        source: "tw-measure",
        paint: { "line-color": "#1A6BAD", "line-width": 4, "line-opacity": 0.9 },
      });
    }
  }
}

function lineData(coords: number[][]) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: coords.length ? coords : [[HOME.lng, HOME.lat], [HOME.lng, HOME.lat]] },
  };
}

function ensureLine(map: Map, id: string, coords: number[][], color: string, width: number) {
  const data = lineData(coords);
  const src = map.getSource(id) as GeoJSONSource | undefined;
  if (src) src.setData(data);
  else if (map.isStyleLoaded()) {
    map.addSource(id, { type: "geojson", data });
    if (!map.getLayer(`${id}-glow`)) {
      map.addLayer({
        id: `${id}-glow`,
        type: "line",
        source: id,
        paint: { "line-color": color, "line-width": width + 6, "line-opacity": 0.22, "line-blur": 1.4 },
      });
    }
    if (!map.getLayer(`${id}-line`)) {
      map.addLayer({
        id: `${id}-line`,
        type: "line",
        source: id,
        paint: { "line-color": color, "line-width": width, "line-opacity": 0.95 },
      });
    }
  }
}

function updateTripLayer(map: Map, path: number[][]) {
  ensureLine(map, "tw-trip", path, "#0E4C81", 6);
}

function updateRecLayer(map: Map, pts: { lat: number; lng: number }[]) {
  ensureLine(map, "tw-rec", pts.map((p) => [p.lng, p.lat]), "#DC2626", 5);
}

const CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

function cardinal(deg: number) {
  const n = ((deg % 360) + 360) % 360;
  return CARDINALS[Math.round(n / 22.5) % 16];
}

function wrapDeg(deg: number) {
  return ((deg % 360) + 360) % 360;
}

const COMPASS_TICKS = Array.from({ length: 73 }, (_, i) => {
  const raw = i * 15 - 360;
  const deg = wrapDeg(raw);
  return { raw, deg, major: deg % 45 === 0, label: deg % 90 === 0 ? CARDINALS[deg / 22.5] : String(deg) };
});
const PX_PER_DEG = 7;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MapScreen({
  profile,
  savedSpots,
  onSaveSpot,
  onSaveCatch,
  onBack,
}: {
  profile: FisherProfile;
  savedSpots: SavedSpot[];
  onSaveSpot: (spot: SavedSpot) => void;
  onSaveCatch: (input: {
    date: string;
    location: string;
    lat: number;
    lng: number;
    species: string;
    weightKg: number;
    pricePerKg: number;
    note: string;
  }) => void;
  onBack: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const measureRef = useRef<{ lat: number; lng: number }[]>([]);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const armTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopHoldTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const headingRef = useRef(246);
  const recKmRef = useRef(0);
  const armedOk = useRef(false);

  const [ready, setReady] = useState(false);
  const [heading, setHeading] = useState(246);
  const [course, setCourse] = useState(246);
  const [menuOpen, setMenuOpen] = useState(false);
  const [spotsOpen, setSpotsOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState("");
  const [sosOn, setSosOn] = useState(false);
  const [sosHold, setSosHold] = useState(0);
  const sosTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [measurePts, setMeasurePts] = useState<{ lat: number; lng: number }[]>([]);

  const [spotForm, setSpotForm] = useState({ title: "", lat: HOME.lat, lng: HOME.lng, catchKg: "", note: "", category: "spot" as SpotCat });
  const [catchForm, setCatchForm] = useState({
    species: "Galunggong",
    location: SPOTS[0].name,
    weight: "11.0",
    price: "137",
    date: todayIso(),
    note: "",
    lat: HOME.lat,
    lng: HOME.lng,
  });
  const userMarks = useRef<Marker[]>([]);

  const [recording, setRecording] = useState<RecordKind>(null);
  const [recSec, setRecSec] = useState(0);
  const [recKm, setRecKm] = useState(0);
  const [recPts, setRecPts] = useState<{ lat: number; lng: number }[]>([]);
  const [armHold, setArmHold] = useState<{ id: string; pct: number } | null>(null);
  const [stopHold, setStopHold] = useState(0);

  const [dayIdx, setDayIdx] = useState(0);
  headingRef.current = heading;

  const lph = LPH[profile.motorClass] ?? LPH.typical;
  const measureKm = useMemo(() => pathLength(measurePts), [measurePts]);
  const measureHrs = measureKm / CRUISE_KMH;
  const measureL = measureHrs * lph;
  const measureCost = measureL * DIESEL;
  const pickKm = picked ? kmBetween(HOME, picked) : 0;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    userMarks.current.forEach((m) => m.remove());
    userMarks.current = [];
    savedSpots.forEach((s) => {
      const el = document.createElement("div");
      el.className = `omap-pin omap-pin--cat-${s.category}`;
      el.title = `${s.title} · ${SPOT_META[s.category].label}`;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setPicked({ lat: s.lat, lng: s.lng });
        setSheet("about");
      });
      userMarks.current.push(new Marker({ element: el, anchor: "bottom" }).setLngLat([s.lng, s.lat]).addTo(map));
    });
  }, [savedSpots, ready]);

  useEffect(() => {
    measureRef.current = measurePts;
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) updateMeasureLayer(map, measurePts);
  }, [measurePts]);

  useEffect(() => {
    if (!wrapRef.current || mapRef.current) return;
    const map = new Map({
      container: wrapRef.current,
      style: STYLE_URL,
      center: [HOME.lng, HOME.lat],
      zoom: 12.2,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new NavigationControl({ showCompass: true, visualizePitch: false }), "top-right");
    const syncBearing = () => {
      const b = wrapDeg(map.getBearing());
      setHeading((h) => (document.body.dataset.twHasCompass === "1" ? h : wrapDeg(246 - b)));
      setCourse((c) => (document.body.dataset.twHasCog === "1" ? c : wrapDeg(246 - b)));
    };
    map.on("rotate", syncBearing);
    map.on("rotateend", syncBearing);

    let decorated = false;
    let usedFallback = false;
    const decorate = () => {
      if (decorated) return;
      decorated = true;
      const homeEl = document.createElement("div");
      homeEl.className = "omap-home";
      homeEl.innerHTML = "<span class='omap-home__pulse'></span><span class='omap-home__dot'></span>";
      new Marker({ element: homeEl, anchor: "center" }).setLngLat([HOME.lng, HOME.lat]).addTo(map);

      SPOTS.forEach((s) => {
        const el = document.createElement("div");
        el.className = `omap-pin omap-pin--${s.verdict.toLowerCase()}`;
        el.title = s.name;
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          setPicked({ lat: s.lat, lng: s.lng });
          setSheet("about");
          setMenuOpen(false);
        });
        const mk = new Marker({ element: el, anchor: "bottom" }).setLngLat([s.lng, s.lat]).addTo(map);
        markersRef.current.push(mk);
      });
      setReady(true);
    };

    map.on("load", decorate);
    map.once("error", () => {
      if (usedFallback || decorated) return;
      usedFallback = true;
      map.setStyle(RASTER_STYLE);
    });
    const bootTimer = window.setTimeout(() => {
      if (decorated || usedFallback) return;
      usedFallback = true;
      map.setStyle(RASTER_STYLE);
    }, 8000);

    map.on("click", (e: MapMouseEvent) => {
      const pt = { lat: Number(e.lngLat.lat.toFixed(5)), lng: Number(e.lngLat.lng.toFixed(5)) };
      if (measureRef.current && (map.getCanvas().dataset.measure === "1" || document.body.dataset.twMeasure === "1")) {
        setMeasurePts((prev) => [...prev, pt]);
        return;
      }
      setPicked(pt);
      setSheet("about");
      setMenuOpen(false);
      setSpotsOpen(false);
    });

    const alignZoom = () => {
      const shell = wrapRef.current?.closest(".omap");
      const share = shell?.querySelector(".omap__share");
      const ctrl = shell?.querySelector(".maplibregl-ctrl-top-right");
      if (!shell || !share || !(ctrl instanceof HTMLElement)) return;
      const top = share.getBoundingClientRect().top - shell.getBoundingClientRect().top;
      ctrl.style.top = `${Math.round(top)}px`;
    };
    const ro = new ResizeObserver(() => {
      map.resize();
      alignZoom();
    });
    ro.observe(wrapRef.current);
    map.on("load", alignZoom);

    return () => {
      window.clearTimeout(bootTimer);
      map.off("rotate", syncBearing);
      map.off("rotateend", syncBearing);
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      userMarks.current.forEach((m) => m.remove());
      userMarks.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      const raw = webkit != null ? webkit : e.alpha != null ? 360 - e.alpha : null;
      if (raw == null) return;
      document.body.dataset.twHasCompass = "1";
      setHeading(wrapDeg(raw));
      if (document.body.dataset.twHasCog !== "1") setCourse(wrapDeg(raw + 4));
    };
    window.addEventListener("deviceorientation", onOrient, true);
    let watch = 0;
    if (navigator.geolocation) {
      watch = navigator.geolocation.watchPosition((pos) => {
        if (pos.coords.heading != null && !Number.isNaN(pos.coords.heading)) {
          document.body.dataset.twHasCog = "1";
          setCourse(wrapDeg(pos.coords.heading));
        }
      }, () => undefined, { enableHighAccuracy: true, maximumAge: 2000 });
    }
    return () => {
      window.removeEventListener("deviceorientation", onOrient, true);
      if (watch) navigator.geolocation.clearWatch(watch);
    };
  }, []);

  useEffect(() => {
    document.body.dataset.twMeasure = measuring ? "1" : "0";
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = measuring ? "crosshair" : "";
  }, [measuring]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || sheet !== "history") return;
    updateTripLayer(map, TIMELINE[dayIdx].path);
    const b = new LngLatBounds();
    TIMELINE[dayIdx].path.forEach((c) => b.extend(c as [number, number]));
    map.fitBounds(b, { padding: { top: 150, bottom: 280, left: 36, right: 36 }, duration: 700, maxZoom: 13.4 });
  }, [dayIdx, sheet, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded() && recPts.length) updateRecLayer(map, recPts);
  }, [recPts]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function ping(msg: string) {
    setToast(msg);
  }

  function openSpot(seed?: { lat: number; lng: number; title?: string }) {
    const lat = seed?.lat ?? picked?.lat ?? HOME.lat;
    const lng = seed?.lng ?? picked?.lng ?? HOME.lng;
    setSpotForm({ title: seed?.title ?? "", lat, lng, catchKg: "", note: "", category: "spot" });
    setSheet("spot");
    setMenuOpen(false);
  }

  function openCatch(location?: string) {
    const lat = picked?.lat ?? HOME.lat;
    const lng = picked?.lng ?? HOME.lng;
    const loc = location ?? (picked ? "Picked map point" : SPOTS[0].name);
    setCatchForm((f) => ({
      ...f,
      location: loc,
      date: f.date || todayIso(),
      lat,
      lng,
    }));
    setSheet("catch");
    setMenuOpen(false);
  }

  function startMeasure(seed?: { lat: number; lng: number }) {
    const first = seed ?? picked ?? HOME;
    setMeasuring(true);
    setMeasurePts([first]);
    setSheet(null);
    setMenuOpen(false);
    ping("Tap the map to drop measure points");
  }

  function addMeasurePoint() {
    const last = measurePts[measurePts.length - 1] ?? HOME;
    const next = {
      lat: Number((last.lat + (Math.random() - 0.5) * 0.008).toFixed(5)),
      lng: Number((last.lng + (Math.random() - 0.5) * 0.008).toFixed(5)),
    };
    setMeasurePts((p) => [...p, next]);
  }

  function startSos() {
    setSosHold(0);
    const start = Date.now();
    sosTimer.current = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / 4000) * 100, 100);
      setSosHold(pct);
      if (pct >= 100) {
        stopSos(false);
        setSosOn(true);
      }
    }, 40);
  }

  function stopSos(cancel = true) {
    if (sosTimer.current) clearInterval(sosTimer.current);
    sosTimer.current = null;
    if (cancel) setSosHold(0);
  }

  function beginArm(id: string, kind: RecordKind) {
    if (armTimer.current) clearInterval(armTimer.current);
    setArmHold({ id, pct: 0 });
    const start = Date.now();
    armTimer.current = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / 3000) * 100, 100);
      setArmHold({ id, pct });
      if (pct >= 100) {
        clearInterval(armTimer.current!);
        armTimer.current = null;
        setArmHold(null);
        armedOk.current = true;
        startRec(kind);
      }
    }, 40);
  }

  function cancelArm() {
    if (armTimer.current) clearInterval(armTimer.current);
    armTimer.current = null;
    setArmHold(null);
  }

  function startRec(kind: RecordKind) {
    setRecording(kind);
    setRecSec(0);
    recKmRef.current = 0;
    setRecKm(0);
    setRecPts([HOME]);
    setStopHold(0);
    setMenuOpen(false);
    setSheet(null);
    if (recordTimer.current) clearInterval(recordTimer.current);
    recordTimer.current = setInterval(() => {
      recKmRef.current += 0.014;
      setRecSec((s) => s + 1);
      setRecKm(recKmRef.current);
      const step = 0.00012;
      const rad = (headingRef.current * Math.PI) / 180;
      setRecPts((pts) => {
        const last = pts[pts.length - 1] ?? HOME;
        return [...pts, { lat: last.lat + Math.cos(rad) * step, lng: last.lng + Math.sin(rad) * step }];
      });
    }, 1000);
    ping(`${kind === "trolling" ? "Trolling" : "Trotline"} recording`);
  }

  function beginStopHold() {
    if (stopHoldTimer.current) clearInterval(stopHoldTimer.current);
    const start = Date.now();
    stopHoldTimer.current = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / 3000) * 100, 100);
      setStopHold(pct);
      if (pct >= 100) {
        clearInterval(stopHoldTimer.current!);
        stopHoldTimer.current = null;
        finishRec();
      }
    }, 40);
  }

  function cancelStopHold() {
    if (stopHoldTimer.current) clearInterval(stopHoldTimer.current);
    stopHoldTimer.current = null;
    setStopHold(0);
  }

  function finishRec() {
    if (recordTimer.current) clearInterval(recordTimer.current);
    recordTimer.current = null;
    const kind = recording;
    setRecording(null);
    setStopHold(0);
    if (kind) ping(`${kind} saved · ${recKmRef.current.toFixed(2)} km`);
  }

  const qr = useMemo(() => qrCells(`tripwise://gps/${HOME.lat},${HOME.lng}`), []);
  const ring = 2 * Math.PI * 26;
  const actions: { id: string; label: string; icon: IconName; tone: "navy" | "sky" | "mint"; hold?: RecordKind; run?: () => void }[] = [
    { id: "spot", label: "Save Spot", icon: "map-marker-plus", tone: "navy", run: () => openSpot() },
    { id: "measure", label: "Measure Distance", icon: "vector-polyline", tone: "sky", run: () => startMeasure() },
    { id: "catch", label: "Save Catch", icon: "fish", tone: "navy", run: () => openCatch() },
    { id: "troll", label: "Record trolling", icon: "record-circle", tone: "mint", hold: "trolling" },
    { id: "trot", label: "Record trotline", icon: "flag", tone: "sky", hold: "trotline" },
  ];
  const tapeShift = heading * PX_PER_DEG;

  return (
    <div className="omap">
      <div ref={wrapRef} className="omap__canvas" aria-label="Offline map" />
      {!ready && <div className="omap__boot">Loading Manila Bay tiles…</div>}

      <div className="omap-compass" aria-live="polite">
        <div className="omap-compass__window">
          <div className="omap-compass__tape" style={{ transform: `translateX(calc(50% - ${tapeShift}px))` }}>
            {COMPASS_TICKS.map((t) => (
              <span key={t.raw} className={t.major ? "is-major" : ""} style={{ left: t.raw * PX_PER_DEG }}>
                {t.label}
              </span>
            ))}
          </div>
          <i className="omap-compass__notch" />
        </div>
        <div className="omap-compass__read">
          <span>Course over ground <b>{Math.round(course)}° {cardinal(course)}</b></span>
          <span>Heading <b>{Math.round(heading)}° {cardinal(heading)}</b></span>
        </div>
      </div>

      <header className="omap__chrome">
        <div className="omap__titlechip">
          <div className="omap__titlechip-copy">
            <div className="omap__kicker">OFFLINE MAP</div>
            <div className="omap__title">Manila Bay</div>
            <div className="omap__gps">{fmtCoord(HOME.lat, HOME.lng)}</div>
          </div>
          <img src={mascotMap} alt="TripWise location and safety mascot" className="omap__mascot mascot-cut" />
        </div>
        <aside className="omap__share">
        <div className="omap__share-row">
          <div>
            <div className="omap__share-label">Location Sharing</div>
            <div className="omap__share-sub">{sharing ? "Live GPS on" : "GPS hidden"}</div>
          </div>
          <button
            type="button"
            className={`omap-toggle ${sharing ? "is-on" : ""}`}
            aria-label="Location Sharing"
            aria-pressed={sharing}
            onClick={() => setSharing((v) => !v)}
          >
            <span />
          </button>
        </div>
          <button type="button" className="omap__qr-mini" onClick={() => setSheet("qr")}>
            <Icon name="qrcode" size={16} color="#0E4C81" />
            Share GPS via QR
          </button>
        </aside>
      </header>

      {measuring && (
        <div className="omap-measure">
          <div className="omap-measure__head">
            <span>MEASURE DISTANCE</span>
            <button type="button" onClick={() => { setMeasuring(false); setMeasurePts([]); }}>Done</button>
          </div>
          <div className="omap-measure__grid">
            <div>
              <b>{measureKm.toFixed(2)}</b>
              <em>Total length km</em>
            </div>
            <div>
              <b>{measurePts.length}</b>
              <em>Points</em>
            </div>
            <div>
              <b>{measureL.toFixed(1)} L</b>
              <em>Est. fuel</em>
            </div>
            <div>
              <b>₱{Math.round(measureCost)}</b>
              <em>Est. cost</em>
            </div>
          </div>
          <button type="button" className="omap-measure__add" onClick={addMeasurePoint}>
            <Icon name="plus" size={18} color="#fff" />
            Add point
          </button>
        </div>
      )}

      {recording && (
        <div className="omap-rec">
          <div className="omap-rec__logo is-hot">
            <Icon name="record-circle" size={28} color="#fff" />
          </div>
          <div>
            <div className="omap-rec__k">RECORDING {recording.toUpperCase()}</div>
            <div className="omap-rec__len">{recKm.toFixed(2)} km · {recSec}s</div>
            <div className="omap-rec__hint">Live track on the map · hold STOP 3s to save</div>
          </div>
          <button
            type="button"
            className={`omap-rec__stop ${stopHold > 0 ? "is-hot" : ""}`}
            onPointerDown={beginStopHold}
            onPointerUp={cancelStopHold}
            onPointerLeave={cancelStopHold}
          >
            <svg className="omap-fab__ring" viewBox="0 0 58 58">
              <circle cx="29" cy="29" r="26" />
              <circle cx="29" cy="29" r="26" style={{ strokeDasharray: `${ring}`, strokeDashoffset: `${ring - (stopHold / 100) * ring}` }} />
            </svg>
            {stopHold > 0 ? `${Math.ceil((100 - stopHold) / 33)}s` : "HOLD 3s"}
          </button>
        </div>
      )}

      <div className={`omap-dock ${spotsOpen ? "is-open" : ""}`}>
        <div className="omap-dock__lift">
          <button type="button" className="omap-history-btn" onClick={() => setSheet("history")}>
            <img src={mascotHistory} alt="" />
            <span>Trip History</span>
          </button>
          <div className="omap__fabs">
            {menuOpen && (
              <div className="omap-menu">
                {actions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`omap-menu__row omap-menu__row--${a.tone} ${armHold?.id === a.id ? "is-holding" : ""}`}
                    onClick={a.hold ? () => { if (armedOk.current) { armedOk.current = false; return; } ping("Hold 3 seconds to start"); } : a.run}
                    onPointerDown={a.hold ? () => beginArm(a.id, a.hold!) : undefined}
                    onPointerUp={a.hold ? cancelArm : undefined}
                    onPointerLeave={a.hold ? cancelArm : undefined}
                  >
                    <span>
                      {a.label}
                      {a.hold && <em>{armHold?.id === a.id ? `${Math.ceil((100 - armHold.pct) / 33)}s` : "HOLD 3s"}</em>}
                    </span>
                    <i>
                      <Icon name={a.icon} size={20} color={a.tone === "navy" ? "#fff" : "#0E4C81"} />
                    </i>
                  </button>
                ))}
              </div>
            )}
            <button type="button" className={`omap-fab omap-fab--plus ${menuOpen ? "is-open" : ""}`} onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? "Close actions" : "Open actions"}>
              <Icon name={menuOpen ? "close" : "plus"} size={26} color="#fff" />
            </button>
            <button
              type="button"
              className={`omap-fab omap-fab--sos ${sosOn ? "is-live" : ""}`}
              onPointerDown={startSos}
              onPointerUp={() => stopSos(true)}
              onPointerLeave={() => stopSos(true)}
              aria-label="Hold four seconds for SOS"
            >
              <svg className="omap-fab__ring" viewBox="0 0 58 58">
                <circle cx="29" cy="29" r="26" />
                <circle cx="29" cy="29" r="26" style={{ strokeDasharray: `${ring}`, strokeDashoffset: `${ring - (sosHold / 100) * ring}` }} />
              </svg>
              <strong>SOS</strong>
              <em>{sosOn ? "LIVE" : sosHold > 0 ? `${Math.ceil((100 - sosHold) / 25)}s` : "HOLD 4s"}</em>
            </button>
          </div>
        </div>
        <div
          className="omap-spots"
          onPointerDown={(e) => {
            const y0 = e.clientY;
            const up = (ev: PointerEvent) => {
              if (y0 - ev.clientY > 36) setSpotsOpen(true);
              if (ev.clientY - y0 > 36) setSpotsOpen(false);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointerup", up);
          }}
        >
          <button type="button" className="omap-spots__peek" onClick={() => setSpotsOpen((v) => !v)}>
            <i />
            Familiar fishing spots
          </button>
          <div className="omap-spots__list" hidden={!spotsOpen}>
            {SPOTS.map((s) => (
              <button
                key={s.name}
                type="button"
                className="omap-spot"
                onClick={() => {
                  mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: 13.4, duration: 700 });
                  setPicked({ lat: s.lat, lng: s.lng });
                  setSheet("about");
                }}
              >
                <img src={s.photo} alt="" />
                <div>
                  <b>{s.name}</b>
                  <small>{s.dist} · Last {s.lastKg} kg {s.species}</small>
                </div>
                <em className={`omap-pill omap-pill--${s.verdict.toLowerCase()}`}>{s.verdict}</em>
              </button>
            ))}
          </div>
        </div>
      </div>

      {sheet === "about" && picked && (
        <div className="omap-sheet">
          <div className="omap-sheet__bar">
            <b>About this location</b>
            <button type="button" onClick={() => setSheet(null)} aria-label="Close"><Icon name="close" size={18} color="#0B2237" /></button>
          </div>
          <p className="omap-sheet__meta">
            Distance from GPS: <strong>{pickKm.toFixed(2)} km</strong>
            <br />
            {fmtCoord(picked.lat, picked.lng)}
          </p>
          <div className="omap-sheet__acts">
            <button type="button" onClick={() => openSpot({ ...picked })}>
              <Icon name="map-marker-plus" size={20} color="#0E4C81" />
              Save Spot
            </button>
            <button type="button" onClick={() => openCatch("Picked map point")}>
              <Icon name="fish" size={20} color="#0E4C81" />
              Save Catch
            </button>
            <button type="button" onClick={() => startMeasure(picked)}>
              <Icon name="vector-polyline" size={20} color="#0E4C81" />
              Measure
            </button>
          </div>
        </div>
      )}

      {sheet === "spot" && (
        <div className="omap-sheet omap-sheet--form">
          <div className="omap-sheet__bar">
            <b>Save Spot</b>
            <button type="button" onClick={() => setSheet(null)} aria-label="Close"><Icon name="close" size={18} color="#0B2237" /></button>
          </div>
          <label>Title
            <input value={spotForm.title} onChange={(e) => setSpotForm({ ...spotForm, title: e.target.value })} placeholder="Dawn drop, Tangos" />
          </label>
          <div className="omap-cats">
            {(Object.keys(SPOT_META) as SpotCat[]).map((c) => (
              <button key={c} type="button" className={spotForm.category === c ? "is-on" : ""} onClick={() => setSpotForm({ ...spotForm, category: c })}>
                {SPOT_META[c].label}
              </button>
            ))}
          </div>
          <div className="omap-duo">
            <label>Latitude
              <input value={String(spotForm.lat)} onChange={(e) => setSpotForm({ ...spotForm, lat: Number(e.target.value) || 0 })} />
            </label>
            <label>Longitude
              <input value={String(spotForm.lng)} onChange={(e) => setSpotForm({ ...spotForm, lng: Number(e.target.value) || 0 })} />
            </label>
          </div>
          <label>Add catch (kg)
            <input value={spotForm.catchKg} onChange={(e) => setSpotForm({ ...spotForm, catchKg: e.target.value })} placeholder="optional" />
          </label>
          <label>Note
            <textarea value={spotForm.note} onChange={(e) => setSpotForm({ ...spotForm, note: e.target.value })} placeholder="Current, wind, gear…" rows={2} />
          </label>
          <button
            type="button"
            className="omap-save"
            onClick={() => {
              onSaveSpot({
                id: uid(),
                title: spotForm.title || SPOT_META[spotForm.category].label,
                lat: spotForm.lat,
                lng: spotForm.lng,
                category: spotForm.category,
                note: spotForm.note,
                catchKg: spotForm.catchKg,
              });
              setSheet(null);
              ping("Spot pinned on the map");
            }}
          >
            Save spot
          </button>
        </div>
      )}

      {sheet === "catch" && (
        <div className="omap-sheet omap-sheet--form">
          <div className="omap-sheet__bar">
            <b>Save Catch</b>
            <button type="button" onClick={() => setSheet(null)} aria-label="Close"><Icon name="close" size={18} color="#0B2237" /></button>
          </div>
          <div className="omap-cats">
            {SPECIES.map((s) => (
              <button key={s} type="button" className={catchForm.species === s ? "is-on" : ""} onClick={() => setCatchForm({ ...catchForm, species: s })}>
                {s}
              </button>
            ))}
          </div>
          <label>Fishing location
            <select value={catchForm.location} onChange={(e) => setCatchForm({ ...catchForm, location: e.target.value })}>
              {SPOTS.map((s) => <option key={s.name}>{s.name}</option>)}
              <option>Picked map point</option>
              <option>{profile.fishingGround}</option>
            </select>
          </label>
          <div className="omap-duo">
            <label>Weight (kg)
              <input value={catchForm.weight} onChange={(e) => setCatchForm({ ...catchForm, weight: e.target.value })} />
            </label>
            <label>Price / kg
              <input value={catchForm.price} onChange={(e) => setCatchForm({ ...catchForm, price: e.target.value })} />
            </label>
          </div>
          <div className="omap-income">
            Estimated income <b>₱{Math.round((Number(catchForm.weight) || 0) * (Number(catchForm.price) || 0)).toLocaleString()}</b>
          </div>
          <label>Note
            <textarea value={catchForm.note} onChange={(e) => setCatchForm({ ...catchForm, note: e.target.value })} rows={2} />
          </label>
          <button
            type="button"
            className="omap-save"
            onClick={() => {
              const weightKg = Number(catchForm.weight) || 0;
              const pricePerKg = Number(catchForm.price) || 0;
              if (weightKg <= 0) { ping("Add catch weight"); return; }
              onSaveCatch({
                date: catchForm.date || todayIso(),
                location: catchForm.location,
                lat: catchForm.lat,
                lng: catchForm.lng,
                species: catchForm.species,
                weightKg,
                pricePerKg,
                note: catchForm.note,
              });
              setSheet(null);
              ping("Catch saved to ledger");
            }}
          >
            Save catch
          </button>
        </div>
      )}

      {sheet === "qr" && (
        <div className="omap-sheet omap-sheet--qr">
          <div className="omap-sheet__bar">
            <b>Share GPS location</b>
            <button type="button" onClick={() => setSheet(null)} aria-label="Close"><Icon name="close" size={18} color="#0B2237" /></button>
          </div>
          <p>{`Scan to open ${profile.name}'s live boat pin. Works even when Location Sharing is off — they get this snapshot.`}</p>
          <div className="omap-qr" style={{ gridTemplateColumns: `repeat(${qr.n}, 1fr)` }}>
            {qr.cells.map((on, i) => <i key={i} className={on ? "is-on" : ""} />)}
          </div>
          <div className="omap-qr__cap">{fmtCoord(HOME.lat, HOME.lng)}</div>
        </div>
      )}

      {sheet === "history" && (
        <div className="omap-timeline omap-timeline--sheet">
          <div className="omap-timeline__top">
            <img src={mascotHistory} alt="Trip history mascot" />
            <div>
              <div className="omap__kicker">TRIP HISTORY</div>
              <h2>Day-to-day trips</h2>
            </div>
            <button type="button" onClick={() => setSheet(null)} aria-label="Close"><Icon name="close" size={20} color="#0B2237" /></button>
          </div>
          <div className="omap-timeline__tabs">
            <span className="is-on">Day</span>
            <span>Trips</span>
            <span>Spots</span>
          </div>
          <div className="omap-timeline__date">
            <button type="button" onClick={() => setDayIdx((i) => Math.min(TIMELINE.length - 1, i + 1))}>‹</button>
            <b>{TIMELINE[dayIdx].date}</b>
            <button type="button" onClick={() => setDayIdx((i) => Math.max(0, i - 1))}>›</button>
          </div>
          <ol>
            {TIMELINE[dayIdx].items.map((it) => (
              <li key={it.title}>
                <i className={`omap-dot omap-dot--${it.kind}`} />
                <div>
                  <b>{it.title}</b>
                  <small>{it.detail}</small>
                  <em>{it.meta}</em>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {sosOn && (
        <div className="omap-sos-live">
          <strong>SOS SENT</strong>
          <p>Holding complete. Watch desk has your last GPS pin.</p>
          <button type="button" onClick={() => setSosOn(false)}>Cancel alert</button>
        </div>
      )}

      {toast && <div className="omap-toast">{toast}</div>}
    </div>
  );
}
