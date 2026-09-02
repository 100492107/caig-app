import React, { useEffect, useMemo, useState } from "react";
import OperatorCommandStrip from "./OperatorCommandStrip.jsx";
import { getTodaysVerse, getVerseForDateKey } from "./dailyScripture.js";

const CRM_URL = "https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/";
const NEW_LIFE_URL = "https://new-life-game-alpha.vercel.app/start-v2.html";

const destinations = [
  {
    title: "Track A",
    meta: "Cash engine",
    blurb: "Dealer outreach, samples, diagnostics, pilots. Money this week.",
    href: CRM_URL,
    icon: "↗",
    accent: "var(--track-a)",
    external: true,
  },
  {
    title: "Track B",
    meta: "Long-term cash engine",
    blurb: "YouTube · short form · Shop · affiliates · identity-locked production.",
    href: "/creative",
    icon: "✦",
    accent: "var(--track-b)",
    external: false,
  },
  {
    title: "New Life",
    meta: "Imperative",
    blurb: "Identity, habits, and the life system that makes the work sustainable.",
    href: NEW_LIFE_URL,
    icon: "◒",
    accent: "var(--new-life)",
    external: true,
  },
];

const dailyCommands = [
  "Clear every warm lead before you open creative work.",
  "Send one sample and book one conversation before noon.",
  "Ship one finished package. Do not start three new ideas.",
  "Follow up on every open pilot. Silence is not a strategy.",
  "Do the money work first. Earn the right to build.",
  "Finish, send, follow up. In that order.",
  "Use the skill the market pays you for, not the task that feels safest.",
  "Create one new opportunity and advance one existing opportunity.",
  "Make the day count before the day gets away from you.",
  "Do one hard thing before doing five easy things.",
  "Close the day with evidence, not excuses.",
  "Earn the right to ideate by clearing today's obligations.",
];

function dayIndex(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000);
}

function markDayWon() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const current = JSON.parse(localStorage.getItem("caig_operator_wins") || "[]");
    const next = Array.from(new Set([...current, today])).slice(-120);
    localStorage.setItem("caig_operator_wins", JSON.stringify(next));
  } catch {}
}

function getWins() {
  try { return new Set(JSON.parse(localStorage.getItem("caig_operator_wins") || "[]")); } catch { return new Set(); }
}

function calculateStreak() {
  try {
    const wins = getWins();
    let cursor = new Date();
    let streak = 0;
    while (wins.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  } catch {
    return 0;
  }
}

function buildMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function Card({ item, index }) {
  return (
    <a
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noreferrer" : undefined}
      className="enterprise-card"
      style={{ "--accent": item.accent }}
    >
      <span className="enterprise-card-top">
        <span className="enterprise-card-index">0{index + 1}</span>
        <span className="enterprise-card-arrow">{item.external ? "↗" : "→"}</span>
      </span>
      <span className="enterprise-card-middle">
        <span className="enterprise-icon-wrap"><span className="enterprise-icon">{item.icon}</span></span>
      </span>
      <span className="enterprise-card-bottom">
        <span>
          <span className="enterprise-card-meta">{item.meta}</span>
          <span className="enterprise-card-title">{item.title}</span>
          <span className="enterprise-card-blurb">{item.blurb}</span>
        </span>
        <span className="enterprise-card-open">Open <span aria-hidden="true">{item.external ? "↗" : "→"}</span></span>
      </span>
    </a>
  );
}

function MonthCalendar({ selectedKey, onSelect, wins }) {
  const [cursor, setCursor] = useState(() => new Date());
  const cells = useMemo(() => buildMonth(cursor), [cursor]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const label = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="cal-panel">
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">‹</button>
        <div className="cal-label">{label}</div>
        <button type="button" className="cal-nav" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">›</button>
      </div>
      <div className="cal-week">{"SMTWTFS".split("").map((d) => <span key={d}>{d}</span>)}</div>
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} className="cal-cell is-empty" />;
          const key = day.toISOString().slice(0, 10);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const won = wins.has(key);
          return (
            <button
              key={key}
              type="button"
              className={`cal-cell${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}${won ? " is-won" : ""}`}
              onClick={() => onSelect(key)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <div className="cal-legend"><span className="dot won" /> day won <span className="dot today" /> today</div>
    </div>
  );
}

export default function EnterpriseHome() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [streak, setStreak] = useState(0);
  const [wins, setWins] = useState(() => getWins());
  const dayWon = wins.has(todayKey);
  const viewingToday = selectedDay === todayKey;
  const verse = useMemo(
    () => (viewingToday ? getTodaysVerse() : getVerseForDateKey(selectedDay)),
    [selectedDay, viewingToday]
  );
  const command = dailyCommands[dayIndex() % dailyCommands.length];
  const todayLabel = new Date(selectedDay + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  useEffect(() => { setStreak(calculateStreak()); }, [wins]);

  function completeDay() {
    markDayWon();
    const next = getWins();
    setWins(next);
    setStreak(calculateStreak());
  }

  return (
    <div className="enterprise-shell">
      <style>{`
        .enterprise-shell{min-height:100svh;width:100%;background:var(--bg);color:var(--text);font-family:var(--sans);padding:22px clamp(16px,3.2vw,56px) 44px;box-sizing:border-box}
        .enterprise-wrap{width:100%;max-width:1560px;min-height:calc(100svh - 66px);margin:0 auto;display:flex;flex-direction:column}
        .enterprise-header{display:flex;align-items:center;justify-content:space-between;min-height:50px;border-bottom:1px solid var(--border)}
        .enterprise-brand{display:flex;align-items:center;gap:13px}
        .enterprise-mark{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:#d9d6ca;color:#111315;font-weight:900;font-size:20px}
        .enterprise-name{font-size:17px;font-weight:720;letter-spacing:-.025em;color:#ecece8}
        .enterprise-status{width:7px;height:7px;border-radius:50%;background:var(--success);box-shadow:0 0 14px rgba(111,155,122,.45)}

        .word-row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(280px,.7fr);gap:16px;margin-top:18px}
        .word-panel,.cal-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow)}
        .word-panel{padding:26px 28px;border-color:var(--word-border);background:linear-gradient(160deg,color-mix(in srgb,var(--word) 8%,var(--surface)),var(--surface))}
        .word-kicker{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--word);font-weight:800}
        .word-ref{margin-top:10px;font-size:13px;font-weight:750;color:var(--word);letter-spacing:.04em}
        .word-text{margin:12px 0 0;font-size:clamp(20px,2.4vw,28px);line-height:1.35;letter-spacing:-.03em;font-weight:650;color:var(--text-h);max-width:48ch}
        .word-meta{margin-top:16px;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;color:var(--text-muted);font-size:12px}
        .word-command{color:var(--accent);font-weight:700;letter-spacing:.04em;text-transform:uppercase;font-size:11px}
        .word-day-tag{padding:4px 8px;border-radius:999px;border:1px solid var(--word-border);background:var(--word-dim);color:var(--word);font-size:10px;font-weight:750}

        .cal-panel{padding:18px}
        .cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .cal-label{font-size:13px;font-weight:750;letter-spacing:-.02em}
        .cal-nav{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer}
        .cal-nav:hover{background:var(--surface-2)}
        .cal-week{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px}
        .cal-week span{text-align:center;font-size:9px;color:var(--text-subtle);font-weight:750}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
        .cal-cell{aspect-ratio:1;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--text-muted);font-size:11px;font-weight:650;cursor:pointer}
        .cal-cell.is-empty{cursor:default}
        .cal-cell:not(.is-empty):hover{background:var(--surface-2);color:var(--text)}
        .cal-cell.is-today{border-color:var(--word-border);color:var(--word);box-shadow:inset 0 0 0 1px var(--word-dim)}
        .cal-cell.is-selected{background:var(--word-dim);border-color:var(--word-border);color:var(--text-h)}
        .cal-cell.is-won:after{content:"";display:block;width:4px;height:4px;border-radius:50%;background:var(--word);margin:2px auto 0}
        .cal-legend{margin-top:12px;display:flex;gap:12px;align-items:center;font-size:9px;color:var(--text-subtle);font-weight:650}
        .cal-legend .dot{width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:4px}
        .cal-legend .dot.won{background:var(--word)}
        .cal-legend .dot.today{box-shadow:0 0 0 1px var(--word);background:transparent}

        .enterprise-mission{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(300px,.65fr);gap:16px;margin:18px 0}
        .mission-main,.mission-side{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow)}
        .mission-main{padding:28px 30px 26px}
        .mission-side{padding:24px}
        .mission-kicker{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--text-subtle);font-weight:800}
        .mission-title{margin:9px 0 10px;font-size:clamp(34px,4.6vw,64px);line-height:.92;letter-spacing:-.065em;font-weight:840;max-width:980px}
        .mission-line{margin:0;max-width:900px;color:#c7c9c7;font-size:14px;line-height:1.5}
        .mission-side-title{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-subtle);font-weight:800}
        .mission-target{margin-top:10px;font-size:15px;line-height:1.45;color:var(--text);font-weight:600}
        .mission-divider{height:1px;background:var(--border);margin:18px 0}
        .mission-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .mission-score{font-size:34px;font-weight:840;letter-spacing:-.04em;color:var(--word)}
        .mission-score-label{font-size:10px;color:var(--text-subtle);text-transform:uppercase;letter-spacing:.12em;font-weight:750}
        .mission-button{border:0;border-radius:11px;padding:11px 14px;background:var(--word);color:#10140f;font-weight:800;cursor:pointer}
        .mission-button.done{background:var(--surface-2);color:var(--text-muted);border:1px solid var(--border)}
        .mission-button:disabled{cursor:default}

        .enterprise-operator{margin:4px 0 18px}
        .enterprise-destinations{margin-top:auto;padding-top:8px}
        .enterprise-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .enterprise-card{position:relative;min-height:210px;padding:22px;border-radius:var(--radius-lg);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;color:var(--text);text-decoration:none;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow);transition:transform .2s ease,border-color .2s ease,background .2s ease}
        .enterprise-card:hover{transform:translateY(-3px);background:var(--surface-2);border-color:color-mix(in srgb,var(--accent) 35%,var(--border))}
        .enterprise-card:before{content:"";position:absolute;inset:auto -20% -40% auto;width:220px;height:220px;border-radius:50%;background:var(--accent);opacity:.07;filter:blur(24px);pointer-events:none}
        .enterprise-card-top,.enterprise-card-bottom{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
        .enterprise-card-index{color:var(--text-subtle);font-size:9px;font-weight:700;letter-spacing:.18em}
        .enterprise-card-arrow{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:rgba(255,255,255,.03);border:1px solid var(--border);color:#8b929c;font-size:13px}
        .enterprise-card-middle{position:relative;display:flex;justify-content:flex-start;align-items:center;flex:1;padding:12px 0}
        .enterprise-icon-wrap{width:56px;height:56px;border-radius:17px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--border));background:color-mix(in srgb,var(--accent) 10%,var(--surface))}
        .enterprise-icon{color:var(--accent);font-size:24px;font-weight:850;line-height:1}
        .enterprise-card-meta{display:block;margin-bottom:4px;color:var(--text-subtle);font-size:9px;font-weight:750;letter-spacing:.14em;text-transform:uppercase}
        .enterprise-card-title{display:block;font-size:28px;letter-spacing:-.045em;font-weight:820}
        .enterprise-card-blurb{display:block;margin-top:8px;max-width:28ch;color:var(--text-muted);font-size:12px;line-height:1.4}
        .enterprise-card-open{padding-top:12px;color:var(--text-muted);font-size:9px;font-weight:750;white-space:nowrap}

        @media(max-width:1000px){
          .word-row,.enterprise-mission{grid-template-columns:1fr}
          .enterprise-grid{grid-template-columns:1fr}
        }
        @media(max-width:700px){
          .enterprise-shell{padding:14px 12px 26px}
          .word-panel{padding:20px}
          .word-text{font-size:20px}
          .mission-title{font-size:clamp(36px,11vw,52px)}
        }
      `}</style>

      <div className="enterprise-wrap">
        <header className="enterprise-header">
          <div className="enterprise-brand">
            <span className="enterprise-mark">C</span>
            <span className="enterprise-name">Cornerstone AI Enterprise</span>
          </div>
          <span className="enterprise-status" aria-label="Online" />
        </header>

        <section className="word-row" aria-label="Word for today and calendar">
          <article className="word-panel">
            <div className="word-kicker">Word for today</div>
            <div className="word-ref">{verse.ref}</div>
            <p className="word-text">“{verse.text}”</p>
            <div className="word-meta">
              <span className="word-day-tag">{viewingToday ? "Today" : "Selected day"}</span>
              <span>{todayLabel}</span>
              {viewingToday && <span className="word-command">Command — {command}</span>}
            </div>
          </article>
          <MonthCalendar selectedKey={selectedDay} onSelect={setSelectedDay} wins={wins} />
        </section>

        <section className="enterprise-mission">
          <div className="mission-main">
            <div className="mission-kicker">The mission</div>
            <h1 className="mission-title">Build a life your family can rely on.</h1>
            <p className="mission-line">
              Track A funds the month. Track B compounds for years. New Life keeps the man who runs both.
              Cash flow first. Assets second. Freedom third.
            </p>
          </div>
          <div className="mission-side">
            <div className="mission-side-title">Operator standard</div>
            <div className="mission-target">Become the man who does the required work whether he feels like it or not.</div>
            <div className="mission-divider" />
            <div className="mission-row">
              <div>
                <div className="mission-score">{streak}</div>
                <div className="mission-score-label">day execution streak</div>
              </div>
              <button className={`mission-button${dayWon ? " done" : ""}`} onClick={completeDay} disabled={dayWon}>
                {dayWon ? "Today won" : "Mark today won"}
              </button>
            </div>
          </div>
        </section>

        <section className="enterprise-operator"><OperatorCommandStrip /></section>

        <section className="enterprise-destinations">
          <div className="enterprise-grid">
            {destinations.map((item, index) => <Card key={item.title} item={item} index={index} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
