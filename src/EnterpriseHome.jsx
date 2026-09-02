import React, { useEffect, useMemo, useState } from "react";
import OperatorCommandStrip from "./OperatorCommandStrip.jsx";
import { getTodaysVerse, getVerseForDateKey } from "./dailyScripture.js";

const CRM_URL = "https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/";
const NEW_LIFE_URL = "https://new-life-game-alpha.vercel.app/start-v2.html";

const destinations = [
  { title: "Track A", meta: "Cash engine", blurb: "Dealer outreach, samples, diagnostics, pilots.", href: CRM_URL, icon: "↗", accent: "var(--track-a)", external: true },
  { title: "Track B", meta: "Compounding engine", blurb: "Content, distribution, offers and production.", href: "/creative", icon: "✦", accent: "var(--track-b)", external: false },
  { title: "New Life", meta: "Personal operating system", blurb: "Identity, habits and the standard behind the work.", href: NEW_LIFE_URL, icon: "◒", accent: "var(--new-life)", external: true },
];

const dailyCommands = [
  "Open Track A before Track B. Clear every warm opportunity with a real next step.",
  "Send the sample. A draft sitting on your screen is worth £0.",
  "Book the conversation. A reply is not revenue until the pipeline moves.",
  "Advance one pilot today. Pipeline only matters when it moves toward money.",
  "Follow up until you get a yes, a no, or a date. Silence is not a status.",
  "Do not redesign the machine before using it to make money.",
  "One finished package is worth more than ten concepts sitting in notes.",
  "Close the loop on yesterday before creating another problem for tomorrow.",
  "No creative browsing before the cash queue is clear.",
  "Ask for the business. Do not hide inside preparation.",
  "Turn one warm lead into a calendar event today.",
  "Use the market's response to choose the next move. Do not invent certainty.",
  "Do the uncomfortable revenue task first. The easy work can wait.",
  "Protect the first working hours from low-value work.",
  "Your family benefits from results, not intentions.",
  "Build assets after the cash engine has eaten.",
  "A cleaner pipeline beats a larger to-do list.",
  "If a prospect has no next action, the work is unfinished.",
  "If content is waiting to ship, ship it before ideating.",
  "The goal is not to feel productive. It is to produce evidence.",
  "Make one offer today that can produce money this week.",
  "Measure movement: contact, reply, meeting, sample, pilot, recurring.",
  "Do not negotiate with the part of you asking for an easier task.",
  "Stop when the required work is done, not when your attention is tired.",
  "Turn yesterday's learning into today's asset.",
  "One hard sales conversation can beat an hour of dashboard work.",
  "Do not confuse planning the offer with putting it in front of a buyer.",
  "Finish the job already started.",
  "Earn tomorrow's freedom by doing today's work.",
  "Build for your household, not for applause.",
];

function dayIndex(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000);
}

function localDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function markDayWon() {
  const today = localDayKey();
  try {
    const current = JSON.parse(localStorage.getItem("caig_operator_wins") || "[]");
    const next = Array.from(new Set([...current, today])).slice(-365);
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
    while (wins.has(localDayKey(cursor))) {
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
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function PrimaryNav() {
  return (
    <nav className="enterprise-primary-nav" aria-label="Primary workspaces">
      <a className="enterprise-nav-link enterprise-nav-a" href={CRM_URL} target="_blank" rel="noreferrer"><span>Track A</span><small>Money</small><b aria-hidden="true">↗</b></a>
      <a className="enterprise-nav-link enterprise-nav-b" href="/creative"><span>Track B</span><small>Build</small><b aria-hidden="true">→</b></a>
      <a className="enterprise-nav-link enterprise-nav-life" href={NEW_LIFE_URL} target="_blank" rel="noreferrer"><span>New Life</span><small>Standard</small><b aria-hidden="true">↗</b></a>
    </nav>
  );
}

function Card({ item, index }) {
  return (
    <a href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined} className="enterprise-card" style={{ "--accent": item.accent }}>
      <span className="enterprise-card-top"><span className="enterprise-card-index">0{index + 1}</span><span className="enterprise-card-arrow">{item.external ? "↗" : "→"}</span></span>
      <span className="enterprise-card-middle"><span className="enterprise-icon-wrap"><span className="enterprise-icon">{item.icon}</span></span></span>
      <span className="enterprise-card-bottom">
        <span><span className="enterprise-card-meta">{item.meta}</span><span className="enterprise-card-title">{item.title}</span><span className="enterprise-card-blurb">{item.blurb}</span></span>
        <span className="enterprise-card-open">Open <span aria-hidden="true">{item.external ? "↗" : "→"}</span></span>
      </span>
    </a>
  );
}

function MonthCalendar({ selectedKey, onSelect, wins }) {
  const [cursor, setCursor] = useState(() => new Date());
  const cells = useMemo(() => buildMonth(cursor), [cursor]);
  const todayKey = localDayKey();
  const label = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="cal-panel">
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">‹</button>
        <div className="cal-label">{label}</div>
        <button type="button" className="cal-nav" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">›</button>
      </div>
      <div className="cal-week">{"MTWTFSS".split("").map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}</div>
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} className="cal-cell is-empty" />;
          const key = localDayKey(day);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const won = wins.has(key);
          return <button key={key} type="button" className={`cal-cell${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}${won ? " is-won" : ""}`} onClick={() => onSelect(key)} aria-label={`${day.toLocaleDateString()}${won ? ", day won" : ""}`} aria-pressed={isSelected}>{day.getDate()}</button>;
        })}
      </div>
      <div className="cal-legend"><span><i className="dot won" />won</span><span><i className="dot today" />today</span></div>
    </div>
  );
}

export default function EnterpriseHome() {
  const todayKey = localDayKey();
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [streak, setStreak] = useState(0);
  const [wins, setWins] = useState(() => getWins());
  const dayWon = wins.has(todayKey);
  const viewingToday = selectedDay === todayKey;
  const verse = useMemo(() => (viewingToday ? getTodaysVerse() : getVerseForDateKey(selectedDay)), [selectedDay, viewingToday]);
  const command = dailyCommands[dayIndex() % dailyCommands.length];
  const selectedLabel = new Date(`${selectedDay}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  useEffect(() => { setStreak(calculateStreak()); }, [wins]);

  function completeDay() {
    if (dayWon) return;
    markDayWon();
    setWins(getWins());
  }

  return (
    <div className="enterprise-shell">
      <style>{`
        .enterprise-shell{min-height:100svh;width:100%;background:var(--bg);color:var(--text);font-family:var(--sans);padding:18px clamp(14px,3vw,52px) 42px;box-sizing:border-box}
        .enterprise-wrap{width:100%;max-width:1580px;min-height:calc(100svh - 60px);margin:0 auto;display:flex;flex-direction:column}
        .enterprise-header{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:54px;border-bottom:1px solid var(--border)}
        .enterprise-brand{display:flex;align-items:center;gap:12px;min-width:0}
        .enterprise-mark{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#d9d6ca;color:#111315;font-weight:900;font-size:19px;flex:0 0 42px}
        .enterprise-name{font-size:17px;font-weight:740;letter-spacing:-.025em;color:#ecece8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .enterprise-head-right{display:flex;align-items:center;gap:12px;min-width:0}
        .enterprise-status{width:7px;height:7px;border-radius:50%;background:var(--success);box-shadow:0 0 14px rgba(111,155,122,.45);flex:0 0 7px}
        .enterprise-primary-nav{display:flex;align-items:center;gap:4px;min-width:0}
        .enterprise-nav-link{display:grid;grid-template-columns:auto auto auto;align-items:center;gap:8px;min-height:38px;padding:0 11px;border:1px solid transparent;border-radius:10px;color:var(--text-muted);text-decoration:none;transition:background .16s ease,border-color .16s ease,color .16s ease,transform .16s ease}
        .enterprise-nav-link:hover{background:var(--surface);border-color:var(--border);color:var(--text)}
        .enterprise-nav-link:focus-visible{outline:2px solid color-mix(in srgb,var(--accent) 72%,white 28%);outline-offset:2px}
        .enterprise-nav-link span{font-size:11px;font-weight:790}
        .enterprise-nav-link small{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-subtle);font-weight:750}
        .enterprise-nav-link b{font-size:13px;font-weight:650}
        .enterprise-nav-a{--accent:var(--track-a)} .enterprise-nav-a b{color:var(--track-a)}
        .enterprise-nav-b{--accent:var(--track-b)} .enterprise-nav-b b{color:var(--track-b)}
        .enterprise-nav-life{--accent:var(--new-life)} .enterprise-nav-life b{color:var(--new-life)}

        .word-row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(280px,.65fr);gap:16px;margin-top:16px}
        .word-panel,.cal-panel,.mission-main,.mission-side{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow)}
        .word-panel{padding:24px 26px;border-color:var(--word-border);background:linear-gradient(155deg,color-mix(in srgb,var(--word) 7%,var(--surface)),var(--surface))}
        .word-kicker,.mission-kicker{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--word);font-weight:800}
        .word-ref{margin-top:9px;font-size:12px;font-weight:760;color:var(--word);letter-spacing:.04em}
        .word-text{margin:11px 0 0;font-size:clamp(20px,2.35vw,29px);line-height:1.35;letter-spacing:-.03em;font-weight:650;color:var(--text-h);max-width:48ch}
        .word-meta{margin-top:15px;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;color:var(--text-muted);font-size:11px}
        .word-command{color:var(--accent);font-weight:750}
        .word-day-tag{padding:4px 7px;border-radius:999px;border:1px solid var(--word-border);background:var(--word-dim);color:var(--word);font-size:9px;font-weight:750}
        .cal-panel{padding:16px}
        .cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
        .cal-label{font-size:12px;font-weight:760;letter-spacing:-.02em}
        .cal-nav{width:30px;height:30px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer}
        .cal-nav:hover{background:var(--surface-2)}
        .cal-week{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:4px}
        .cal-week span{text-align:center;font-size:8px;color:var(--text-subtle);font-weight:760}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
        .cal-cell{aspect-ratio:1;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--text-muted);font-size:10px;font-weight:650;cursor:pointer}
        .cal-cell.is-empty{cursor:default}
        .cal-cell:not(.is-empty):hover{background:var(--surface-2);color:var(--text)}
        .cal-cell.is-today{border-color:var(--word-border);color:var(--word)}
        .cal-cell.is-selected{background:var(--word-dim);border-color:var(--word-border);color:var(--text-h)}
        .cal-cell.is-won:after{content:"";display:block;width:4px;height:4px;border-radius:50%;background:var(--word);margin:2px auto 0}
        .cal-legend{display:flex;gap:12px;margin-top:10px;color:var(--text-subtle);font-size:8px;font-weight:650}.cal-legend span{display:flex;align-items:center;gap:5px}.cal-legend .dot{width:5px;height:5px;border-radius:50%;display:inline-block}.cal-legend .dot.won{background:var(--word)}.cal-legend .dot.today{box-shadow:0 0 0 1px var(--word)}

        .enterprise-mission{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(290px,.72fr);gap:16px;margin:16px 0}
        .mission-main{padding:26px 28px}.mission-side{padding:22px}
        .mission-kicker{color:var(--text-subtle)}
        .mission-title{margin:9px 0 10px;font-size:clamp(34px,4.5vw,63px);line-height:.94;letter-spacing:-.065em;font-weight:850;max-width:980px}
        .mission-line{margin:0;max-width:900px;color:#c7c9c7;font-size:13px;line-height:1.55}
        .mission-side-title{font-size:9px;letter-spacing:.17em;text-transform:uppercase;color:var(--text-subtle);font-weight:800}
        .mission-target{margin-top:9px;font-size:14px;line-height:1.5;color:var(--text);font-weight:610}
        .mission-divider{height:1px;background:var(--border);margin:17px 0}
        .mission-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .mission-score{font-size:34px;font-weight:850;letter-spacing:-.04em;color:var(--word);line-height:1}
        .mission-score-label{margin-top:4px;font-size:9px;color:var(--text-subtle);text-transform:uppercase;letter-spacing:.12em;font-weight:760}
        .mission-button{border:0;border-radius:10px;padding:10px 13px;background:var(--word);color:#10140f;font-weight:820;cursor:pointer}.mission-button.done{background:var(--surface-2);color:var(--text-muted);border:1px solid var(--border)}

        .enterprise-operator{margin:2px 0 18px}.enterprise-destinations{margin-top:auto;padding-top:6px}.enterprise-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}
        .enterprise-card{position:relative;min-height:196px;padding:20px;border-radius:var(--radius-lg);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;color:var(--text);text-decoration:none;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow);transition:transform .18s ease,border-color .18s ease,background .18s ease}
        .enterprise-card:hover{transform:translateY(-2px);background:var(--surface-2);border-color:color-mix(in srgb,var(--accent) 34%,var(--border))}.enterprise-card:focus-visible{outline:2px solid color-mix(in srgb,var(--accent) 72%,white 28%);outline-offset:3px}.enterprise-card:before{content:"";position:absolute;inset:auto -20% -42% auto;width:210px;height:210px;border-radius:50%;background:var(--accent);opacity:.055;filter:blur(23px);pointer-events:none}
        .enterprise-card-top,.enterprise-card-bottom{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:15px}.enterprise-card-index{color:var(--text-subtle);font-size:8px;font-weight:750;letter-spacing:.18em}.enterprise-card-arrow{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:rgba(255,255,255,.03);border:1px solid var(--border);color:#8b929c;font-size:12px}.enterprise-card-middle{position:relative;display:flex;justify-content:flex-start;align-items:center;flex:1;padding:10px 0}.enterprise-icon-wrap{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 29%,var(--border));background:color-mix(in srgb,var(--accent) 9%,var(--surface))}.enterprise-icon{color:var(--accent);font-size:22px;font-weight:850}.enterprise-card-meta{display:block;margin-bottom:4px;color:var(--text-subtle);font-size:8px;font-weight:760;letter-spacing:.14em;text-transform:uppercase}.enterprise-card-title{display:block;font-size:27px;letter-spacing:-.045em;font-weight:830}.enterprise-card-blurb{display:block;margin-top:7px;max-width:34ch;color:var(--text-muted);font-size:11px;line-height:1.4}.enterprise-card-open{padding-top:10px;color:var(--text-muted);font-size:9px;font-weight:750;white-space:nowrap}

        @media(max-width:1050px){.word-row,.enterprise-mission{grid-template-columns:1fr}.enterprise-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:760px){
          .enterprise-shell{padding:12px 12px 24px}.enterprise-header{align-items:flex-start;flex-wrap:wrap;padding-bottom:11px}.enterprise-head-right{width:100%;justify-content:space-between}.enterprise-primary-nav{width:100%;overflow-x:auto;scrollbar-width:none}.enterprise-nav-link{flex:0 0 auto;min-height:40px}.word-row{margin-top:12px}.word-panel{padding:20px}.word-text{font-size:20px}.enterprise-mission{margin:12px 0;grid-template-columns:1fr}.mission-main{padding:22px}.mission-side{padding:19px}.mission-title{font-size:clamp(36px,11vw,52px)}.enterprise-grid{grid-template-columns:1fr}.enterprise-card{min-height:168px}.enterprise-card-middle{padding:7px 0}.enterprise-card-title{font-size:25px}
        }
        @media(prefers-reduced-motion:reduce){.enterprise-card,.enterprise-nav-link{transition:none}}
      `}</style>

      <div className="enterprise-wrap">
        <header className="enterprise-header">
          <div className="enterprise-brand"><span className="enterprise-mark">C</span><span className="enterprise-name">Cornerstone AI Enterprise</span></div>
          <div className="enterprise-head-right">
            <PrimaryNav />
            <span className="enterprise-status" aria-label="Online" />
          </div>
        </header>

        <section className="word-row" aria-label="Daily focus">
          <article className="word-panel">
            <div className="word-kicker">Word for today</div>
            <div className="word-ref">{verse.ref}</div>
            <p className="word-text">“{verse.text}”</p>
            <div className="word-meta">
              <span className="word-day-tag">{viewingToday ? "Today" : "Selected day"}</span>
              <span>{selectedLabel}</span>
              {viewingToday && <span className="word-command">Command — {command}</span>}
            </div>
          </article>
          <MonthCalendar selectedKey={selectedDay} onSelect={setSelectedDay} wins={wins} />
        </section>

        <section className="enterprise-mission">
          <div className="mission-main">
            <div className="mission-kicker">The objective</div>
            <h1 className="mission-title">Build a life your family can rely on.</h1>
            <p className="mission-line">Track A produces cash now. Track B compounds distribution and assets. New Life enforces the standard required to run both.</p>
          </div>
          <div className="mission-side">
            <div className="mission-side-title">Daily standard</div>
            <div className="mission-target">Do the work that creates the outcome. Not the work that gives you the feeling of progress.</div>
            <div className="mission-divider" />
            <div className="mission-row">
              <div><div className="mission-score">{streak}</div><div className="mission-score-label">day execution streak</div></div>
              <button type="button" className={`mission-button${dayWon ? " done" : ""}`} onClick={completeDay} disabled={dayWon}>{dayWon ? "Today won" : "Mark today won"}</button>
            </div>
          </div>
        </section>

        <section className="enterprise-operator" aria-label="Operator command"><OperatorCommandStrip /></section>

        <section className="enterprise-destinations" aria-label="Workspaces">
          <div className="enterprise-grid">{destinations.map((item, index) => <Card key={item.title} item={item} index={index} />)}</div>
        </section>
      </div>
    </div>
  );
}
