import { useMemo, useState } from "react";
import { mascotPrice } from "./assets/media";
import Icon from "./icons";
import {
  EXPENSE_CATS,
  type Budget,
  type BudgetPeriod,
  type ExpenseCat,
  type LedgerTab,
  type TripRecord,
  addExpenseToTrip,
  fmtP,
  prettyDate,
  tripCatchKg,
  tripExpenseTotal,
  tripIncome,
  tripProfit,
} from "./ledger";

export default function LedgerScreen({
  trips,
  budget,
  firstName,
  onBudget,
  onTrips,
  onBack,
}: {
  trips: TripRecord[];
  budget: Budget;
  firstName: string;
  onBudget: (b: Budget) => void;
  onTrips: (t: TripRecord[]) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<LedgerTab>("trips");
  const [openId, setOpenId] = useState<string | null>(null);
  const [expCat, setExpCat] = useState<ExpenseCat>("Fuel");
  const [expAmt, setExpAmt] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [bookFilter, setBookFilter] = useState<"all" | "in" | "out">("all");

  const totals = useMemo(() => {
    const income = trips.reduce((s, t) => s + tripIncome(t), 0);
    const expenses = trips.reduce((s, t) => s + tripExpenseTotal(t), 0);
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthTrips = trips.filter((t) => t.date.startsWith(monthKey)).length;
    const monthLabel = new Date().toLocaleString("en-US", { month: "long" });
    return {
      income,
      expenses,
      profit: income - expenses,
      remain: budget.amount - expenses,
      monthTrips,
      monthLabel,
    };
  }, [trips, budget.amount]);

  const profitTone = totals.profit > 0 ? "go" : totals.profit < 0 ? "stay" : "even";
  const profitStatus = totals.profit > 0 ? "IN THE GREEN" : totals.profit < 0 ? "IN THE RED" : "EVEN WATERS";

  const open = trips.find((t) => t.id === openId) ?? null;

  function saveExpense() {
    if (!open) return;
    const n = Number(expAmt);
    if (!n || n <= 0) return;
    onTrips(addExpenseToTrip(trips, open.id, expCat, Math.round(n)));
    setExpAmt("");
    setShowAdd(false);
  }

  return (
    <div className="ledger">
      <div className="app-bar">
        <button type="button" onClick={onBack} className="icon-key" aria-label="Back">
          <Icon name="arrow-left" size={20} color="#fff" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-bar__title">FISHING LEDGER</div>
          <div className="app-bar__sub">Record once. Calculate automatically.</div>
        </div>
      </div>

      <div className="log-top">
        <article className="tw-slide log-hi">
          <img src={mascotPrice} alt="Price mascot" className="log-hi__face mascot-cut" />
          <div className="log-hi__copy">
            <p>Hi, <span>{firstName}</span></p>
            <small>Your fishing book · {totals.monthTrips} trips in {totals.monthLabel}</small>
          </div>
          <div className={`log-hi__net ledger-profit--${profitTone}`}>
            <em>Net</em>
            <b>{fmtP(totals.profit)}</b>
            <small>{profitStatus}</small>
          </div>
        </article>
        <div className="log-split">
          <article className="tw-slide log-chip log-chip--in">
            <span>Income</span>
            <b>{fmtP(totals.income)}</b>
            <small>From saved catch</small>
          </article>
          <article className="tw-slide log-chip log-chip--out">
            <span>Expenses</span>
            <b>{fmtP(totals.expenses)}</b>
            <small>Fuel, ice, food, gear</small>
          </article>
        </div>
        <article className="tw-slide log-limit">
          <div className="log-limit__row">
            <span>Budget left · {budget.period}</span>
            <b className={totals.remain >= 0 ? "is-go" : "is-stay"}>{fmtP(totals.remain)}</b>
          </div>
          <div className="ledger-budget__bar">
            <i style={{ width: `${Math.min(100, (totals.expenses / Math.max(budget.amount, 1)) * 100)}%` }} />
          </div>
        </article>
      </div>

      <div className="ledger__tabs" role="tablist">
        {([
          ["trips", "Trips"],
          ["ledger", "Ledger"],
          ["budget", "Budget"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "is-on" : ""} onClick={() => { setTab(id); setOpenId(null); }}>
            {label}
          </button>
        ))}
      </div>

      <div className="ledger__body">
        {tab === "trips" && !open && (
          <div className="log-trips">
            {trips.map((t, i) => {
              const inc = tripIncome(t);
              const cost = tripExpenseTotal(t);
              const profit = inc - cost;
              return (
                <button key={t.id} type="button" className="tw-slide log-trip" style={{ animationDelay: `${i * 40}ms` }} onClick={() => setOpenId(t.id)}>
                  <div className="log-trip__top">
                    <strong>{prettyDate(t.date)}</strong>
                    <span className={`ledger-pill ledger-pill--${t.verdict.toLowerCase()}`}>{t.verdict}</span>
                  </div>
                  <div className="log-trip__place">{t.location}</div>
                  <div className="log-trip__nums">
                    <span>{tripCatchKg(t) ? `${tripCatchKg(t)} kg` : "0 kg"}</span>
                    <span className="is-go">{inc ? fmtP(inc) : "—"}</span>
                    <span className="is-cost">{cost ? fmtP(cost) : "—"}</span>
                    <span className={profit > 0 ? "is-go" : profit < 0 ? "is-stay" : ""}>{inc || cost ? fmtP(profit) : "—"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === "ledger" && !open && (
          <div className="tw-slide ledger-book">
            <div className="log-filters">
              {(["all", "in", "out"] as const).map((f) => (
                <button key={f} type="button" className={bookFilter === f ? "is-on" : ""} onClick={() => setBookFilter(f)}>
                  {f === "all" ? "All" : f === "in" ? "Income" : "Expense"}
                </button>
              ))}
            </div>
            {trips.flatMap((t) => {
              const rows: { id: string; date: string; side: "in" | "out"; label: string; amount: number }[] = [
                ...t.catches.map((c) => ({
                  id: c.id,
                  date: t.date,
                  side: "in" as const,
                  label: `${c.species} · ${c.weightKg} kg`,
                  amount: Math.round(c.weightKg * c.pricePerKg),
                })),
                ...t.expenses.map((e) => ({
                  id: e.id,
                  date: t.date,
                  side: "out" as const,
                  label: e.category,
                  amount: e.amount,
                })),
              ];
              if (!rows.length) {
                rows.push({ id: `${t.id}-stay`, date: t.date, side: "out", label: "STAY · no trip", amount: 0 });
              }
              return rows;
            }).filter((r) => bookFilter === "all" || r.side === bookFilter).map((r) => (
              <div key={r.id} className={`ledger-line ledger-line--${r.side}`}>
                <div>
                  <b>{r.label}</b>
                  <small>{prettyDate(r.date)}</small>
                </div>
                <em>{r.amount ? fmtP(r.side === "out" ? -r.amount : r.amount) : "—"}</em>
              </div>
            ))}
          </div>
        )}

        {tab === "budget" && (
          <div className="tw-slide ledger-budget">
            <p>Set one weekly or monthly amount. Expenses from every trip subtract themselves.</p>
            <div className="ledger-budget__toggle">
              {(["weekly", "monthly"] as BudgetPeriod[]).map((p) => (
                <button key={p} type="button" className={budget.period === p ? "is-on" : ""} onClick={() => onBudget({ ...budget, period: p })}>
                  {p === "weekly" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
            <label>
              {budget.period === "weekly" ? "Weekly" : "Monthly"} budget (₱)
              <input
                type="number"
                min={0}
                value={budget.amount || ""}
                onChange={(e) => onBudget({ ...budget, amount: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <div className="ledger-budget__bar">
              <i style={{ width: `${Math.min(100, (totals.expenses / Math.max(budget.amount, 1)) * 100)}%` }} />
            </div>
            <div className="ledger-budget__meta">
              <span>Spent {fmtP(totals.expenses)}</span>
              <span>Left {fmtP(totals.remain)}</span>
            </div>
          </div>
        )}

        {open && (
          <div className="tw-slide ledger-detail">
            <div className="ledger-detail__bar">
              <button type="button" onClick={() => { setOpenId(null); setShowAdd(false); }} aria-label="Back to list">
                <Icon name="arrow-left" size={18} color="#0E4C81" />
              </button>
              <b>{prettyDate(open.date)} · {open.location}</b>
            </div>
            <div className={`ledger-pill ledger-pill--${open.verdict.toLowerCase()}`}>{open.verdict}</div>
            {open.path.length > 1 && (
              <div className="ledger-mini-map">
                <svg viewBox="0 0 120 64">
                  <polyline
                    fill="none"
                    stroke="#1A6BAD"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    points={open.path.map((c, i) => {
                      const xs = open.path.map((p) => p[0]);
                      const ys = open.path.map((p) => p[1]);
                      const minX = Math.min(...xs);
                      const maxX = Math.max(...xs);
                      const minY = Math.min(...ys);
                      const maxY = Math.max(...ys);
                      const x = ((c[0] - minX) / Math.max(maxX - minX, 0.001)) * 108 + 6;
                      const y = 58 - ((c[1] - minY) / Math.max(maxY - minY, 0.001)) * 52;
                      return `${x},${y}`;
                    }).join(" ")}
                  />
                </svg>
                <small>Recorded route · {open.lat.toFixed(4)}°, {open.lng.toFixed(4)}°</small>
              </div>
            )}
            <div className="ledger-kv">
              <span>Catch</span>
              <b>{tripCatchKg(open) ? `${tripCatchKg(open)} kg` : "None"}</b>
              <span>Income</span>
              <b>{fmtP(tripIncome(open))}</b>
              <span>Expenses</span>
              <b>{fmtP(tripExpenseTotal(open))}</b>
              <span>Net profit</span>
              <b className={tripProfit(open) >= 0 ? "is-go" : "is-stay"}>{fmtP(tripProfit(open))}</b>
            </div>
            {open.catches.map((c) => (
              <div key={c.id} className="ledger-line ledger-line--in">
                <div>
                  <b>{c.species}</b>
                  <small>{c.weightKg} kg × ₱{c.pricePerKg}</small>
                </div>
                <em>{fmtP(Math.round(c.weightKg * c.pricePerKg))}</em>
              </div>
            ))}
            {open.expenses.map((e) => (
              <div key={e.id} className="ledger-line ledger-line--out">
                <div>
                  <b>{e.category}</b>
                </div>
                <em>{fmtP(-e.amount)}</em>
              </div>
            ))}
            {open.notes && <p className="ledger-notes">{open.notes}</p>}
            {!showAdd ? (
              <button type="button" className="ledger-add" onClick={() => setShowAdd(true)}>Add expense</button>
            ) : (
              <div className="ledger-addbox">
                <div className="ledger-cats">
                  {EXPENSE_CATS.map((c) => (
                    <button key={c} type="button" className={expCat === c ? "is-on" : ""} onClick={() => setExpCat(c)}>{c}</button>
                  ))}
                </div>
                <input type="number" min={0} placeholder="Amount ₱" value={expAmt} onChange={(e) => setExpAmt(e.target.value)} />
                <div className="ledger-addbox__row">
                  <button type="button" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="button" className="is-save" onClick={saveExpense}>Save expense</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
