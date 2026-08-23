import { useMemo, useState } from "react";
import { mascotMath } from "./assets/media";
import Icon from "./icons";
import { t, type Lang } from "./i18n";
import {
  EXPENSE_CATS,
  type TripRecord,
  fmtP,
  prettyDate,
  summarizeJourney,
  tripCatchKg,
  tripExpenseTotal,
  tripIncome,
  tripProfit,
} from "./ledger";

function Ring({ slices }: { slices: { v: number; c: string }[] }) {
  const total = slices.reduce((s, x) => s + x.v, 0) || 1;
  const r = 34;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg className="hist-ring" viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E4F2FC" strokeWidth="14" />
      {slices.filter((s) => s.v > 0).map((s, i) => {
        const len = (s.v / total) * circ;
        const offset = acc * circ;
        acc += s.v / total;
        return (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={s.c}
            strokeWidth="14"
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform="rotate(-90 50 50)"
          />
        );
      })}
    </svg>
  );
}

function TallBars({
  data,
  labels,
  color,
  active,
  onPick,
}: {
  data: number[];
  labels: string[];
  color: string;
  active: number;
  onPick: (i: number) => void;
}) {
  const mx = Math.max(...data.map((v) => Math.abs(v)), 1);
  return (
    <div className="hist-bars" role="tablist" aria-label="Trip day">
      {data.map((v, i) => (
        <button
          key={`${labels[i]}-${i}`}
          type="button"
          role="tab"
          aria-selected={i === active}
          className={`hist-bars__col ${i === active ? "is-on" : ""}`}
          onClick={() => onPick(i)}
        >
          <div
            className="hist-bars__val"
            style={{
              height: `${Math.max(10, (Math.abs(v) / mx) * 100)}%`,
              background: v < 0 ? "#DC2626" : color,
              animationDelay: `${i * 40}ms`,
            }}
          />
          <em>{labels[i]}</em>
        </button>
      ))}
    </div>
  );
}

export default function HistoryScreen({
  trips,
  firstName,
  lang = "en",
  onBack,
  onReference,
}: {
  trips: TripRecord[];
  firstName: string;
  lang?: Lang;
  onBack: () => void;
  onReference: () => void;
}) {
  const chrono = [...trips].sort((a, b) => (a.date < b.date ? -1 : 1));
  const j = useMemo(() => summarizeJourney(trips), [trips]);
  const [pick, setPick] = useState(chrono.length - 1);
  const [series, setSeries] = useState<"income" | "cost" | "profit" | "catch">("profit");
  const chosen = chrono[pick] ?? chrono[0];

  const seriesMap = {
    income: { data: chrono.map(tripIncome), color: "#16A34A", label: "Income (₱)" },
    cost: { data: chrono.map(tripExpenseTotal), color: "#DC2626", label: "Expenses (₱)" },
    profit: { data: chrono.map(tripProfit), color: "#1A6BAD", label: "Profit (₱)" },
    catch: { data: chrono.map(tripCatchKg), color: "#B45309", label: "Catch (kg)" },
  }[series];

  const insight = j.bestGroundKg
    ? `${j.bestGround} gave the most catch — ${j.bestGroundKg} kg across ${j.bestGroundTrips} trips.`
    : "Log a catch and I will show which ground paid.";

  return (
    <div className="history-page">
      <div className="app-bar">
        <button type="button" onClick={onBack} className="icon-key" aria-label="Back">
          <Icon name="arrow-left" size={20} color="#fff" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-bar__title">{t(lang, "histTitle")}</div>
          <div className="app-bar__sub">{t(lang, "histSub")}</div>
        </div>
      </div>

      <div className="hist-pad">
        <article className="tw-slide hist-hero">
          <div className="hist-hero__viz">
            <Ring
              slices={[
                { v: j.go, c: "#16A34A" },
                { v: j.caution, c: "#B45309" },
                { v: j.stay, c: "#DC2626" },
              ]}
            />
            <div className="hist-hero__hole">
              <b>{j.go + j.caution}</b>
              <small>{t(lang, "wentOut")}</small>
            </div>
          </div>
          <div className="hist-hero__copy">
            <p><span>{firstName}</span>, {t(lang, "histSplit")}</p>
            <ul>
              <li><i style={{ background: "#16A34A" }} /> GO {j.go}</li>
              <li><i style={{ background: "#B45309" }} /> CAUTION {j.caution}</li>
              <li><i style={{ background: "#DC2626" }} /> STAY {j.stay}</li>
            </ul>
          </div>
          <img src={mascotMath} alt="Show the Math mascot" className="hist-hero__mascot mascot-cut" />
        </article>

        <article className="tw-slide hist-chart">
          <div className="hist-chart__bar">
            <strong>Trip days</strong>
            <div className="log-filters">
              {(["profit", "income", "cost", "catch"] as const).map((id) => (
                <button key={id} type="button" className={series === id ? "is-on" : ""} onClick={() => setSeries(id)}>
                  {id === "cost" ? "Cost" : id[0].toUpperCase() + id.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <p className="history-explain">{seriesMap.label} · tap a bar to open that day</p>
          <TallBars
            data={seriesMap.data}
            labels={chrono.map((t) => t.date.slice(8))}
            color={seriesMap.color}
            active={pick}
            onPick={setPick}
          />
          {chosen && (
            <div className="hist-pick">
              <div>
                <em>{prettyDate(chosen.date)}</em>
                <b>{chosen.location}</b>
              </div>
              <div className="hist-pick__nums">
                <span>{tripCatchKg(chosen)} kg</span>
                <span className="is-go">{fmtP(tripIncome(chosen))}</span>
                <span className={tripProfit(chosen) >= 0 ? "is-go" : "is-stay"}>{fmtP(tripProfit(chosen))}</span>
              </div>
            </div>
          )}
        </article>

        {Object.keys(j.cats).length > 0 && (
          <article className="tw-slide hist-mix">
            <strong>Where money went</strong>
            <div className="hist-mix__row">
              <Ring
                slices={EXPENSE_CATS.filter((c) => j.cats[c]).map((c, i) => ({
                  v: j.cats[c],
                  c: ["#1A6BAD", "#0E4C81", "#86A8C2", "#B45309", "#16A34A"][i % 5],
                }))}
              />
              <ul>
                {EXPENSE_CATS.filter((c) => j.cats[c]).map((c, i) => (
                  <li key={c}>
                    <i style={{ background: ["#1A6BAD", "#0E4C81", "#86A8C2", "#B45309", "#16A34A"][i % 5] }} />
                    <div>
                      <span>{c}</span>
                      <small>{j.expenses ? Math.round((j.cats[c] / j.expenses) * 100) : 0}%</small>
                    </div>
                    <b>{fmtP(j.cats[c])}</b>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        )}

        <article className="tw-slide hist-note">
          <img src={mascotMath} alt="" className="mascot-cut" />
          <p>{insight} ₱{j.pesoBack} came back for every ₱1 spent.</p>
        </article>

        <button type="button" className="tw-slide history-ref" onClick={onReference}>
          Official Navotas port landings (BFAR) →
        </button>
      </div>
    </div>
  );
}
