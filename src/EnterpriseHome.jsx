import React, { useEffect, useMemo, useState } from "react";
import OperatorCommandStrip from "./OperatorCommandStrip.jsx";

const CRM_URL = "https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/";
const NEW_LIFE_URL = "https://new-life-game-alpha.vercel.app/start-v2.html";

const destinations = [
  { title: "Track A", meta: "Revenue", href: CRM_URL, icon: "↗", accent: "var(--track-a)", external: true },
  { title: "Track B", meta: "Creative Station", href: "/creative", icon: "✦", accent: "var(--track-b)", external: false },
  { title: "New Life", meta: "Game", href: NEW_LIFE_URL, icon: "◒", accent: "#9b8bb8", external: true },
];

const dailyTruths = [
  "Your family does not need another plan. They need the version of you who follows through.",
  "Comfort is expensive. Every comfortable hour has to be paid for somewhere else.",
  "Being busy is worthless if the work does not increase cash, capability or control.",
  "The market does not pay for potential. It pays for useful outcomes delivered repeatedly.",
  "You do not need a better mood. You need a higher standard for what gets done anyway.",
  "A warm opportunity ignored today can become a closed door tomorrow. Move while the door is open.",
  "Your future household is funded by what you do with ordinary hours like this one.",
  "Do not confuse research with progress. At some point the answer is to make the call.",
  "The fastest way to feel stronger is to keep promises you made to yourself yesterday.",
  "Income follows value. Value follows skill, judgement, courage and repetition.",
  "A man who can create demand, close business and keep his word is difficult to replace.",
  "You are not being punished by the boring work. The boring work is the toll for independence.",
  "The obstacle is not the enemy. The hesitation around the obstacle is.",
  "Do the thing that can change the bank balance before the thing that merely improves the system.",
  "Do not spend your best energy on low-value maintenance. Put it where the upside lives.",
  "Your family will feel the compound effect of today's discipline long after today's discomfort is gone.",
  "If the offer is good, the job is to get it in front of enough people. Volume plus learning beats wishing.",
  "The goal is not to look successful. The goal is to become economically difficult to stop.",
  "Every finished piece of work is evidence. Every avoided piece is a debt against your own confidence.",
  "Do not wait for certainty. Make the highest-quality decision you can with the information you have.",
  "You can be tired and still be useful. You can be frustrated and still execute.",
  "Your standards should survive bad nights, low motivation and disappointing replies.",
  "You do not need permission to move faster. You need a reason strong enough to tolerate discomfort.",
  "The business gets stronger when you stop asking what feels interesting and start asking what pays.",
  "Build earning power first. Then build assets. Then buy back time.",
  "There is no honour in being overwhelmed by work you could have finished earlier.",
  "The cleanest answer to self-doubt is evidence: another call made, another package shipped, another sale pursued.",
  "Your attention is capital. Stop investing it in things that return nothing.",
  "Discipline is not a personality trait. It is a decision repeated after the excitement disappears.",
  "If the pipeline is weak, solve the pipeline. If production is stuck, finish production. Diagnose before you decorate.",
];

const dailyCommands = [
  "First hour: create a revenue opportunity.",
  "Clear every warm follow-up before you open anything creative.",
  "Ask for the call. Stop hiding behind another message draft.",
  "Turn one prospect into a concrete next step today.",
  "Finish the oldest unfinished job before starting another.",
  "Sell before you optimise.",
  "Ship something that can be seen, used or bought.",
  "Make the uncomfortable call before the easy tasks.",
  "Put an offer in front of more people.",
  "Remove one bottleneck instead of adding one more tool.",
  "Do the highest-value task before noon.",
  "Follow up until the answer is clear: yes, no or later with a date.",
  "Close one loop completely.",
  "Turn today's work into tomorrow's distribution.",
  "Create evidence instead of consuming motivation.",
  "Make one move that increases earning power.",
  "Protect the morning from creative distraction.",
  "Complete the thing you have been mentally carrying.",
  "Ask: what action could put cash closer to the family this week? Do that first.",
  "Reduce the distance between knowing and doing.",
  "Take the next action before you redesign the process.",
  "Turn one conversation into a booked next step.",
  "Make your output measurable today.",
  "Do not leave a warm lead without a timestamped next action.",
  "Finish, send, follow up. In that order.",
  "Use the skill the market pays you for, not the task that feels safest.",
  "Create one new opportunity and advance one existing opportunity.",
  "Make the day count before the day gets away from you.",
  "Do one hard thing before doing five easy things.",
  "Close the day with evidence, not excuses.",
  "Earn the right to ideate by clearing today's obligations.",
];

const stoicReminders = [
  "Control the action. Release the outcome.",
  "Do your duty before you judge the difficulty.",
  "The obstacle changes the route, not the standard.",
  "Do not negotiate with the task. Execute the next part.",
  "Use reason before emotion; use action before rumination.",
  "What is outside your control is not today's assignment.",
  "One proper action now is worth an hour of imagined action.",
  "Act without noise. Let results make the argument.",
  "Do the work that belongs to you and leave the rest alone.",
  "A disciplined day is built act by act.",
];

const objectiveDefaults = {
  mission: "Build real financial strength for the family — cash flow first, assets second, freedom third.",
  money: "Increase earning power until money stops being the constraint.",
  character: "Become the man who does the required work whether he feels like it or not.",
};

function dayIndex() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now - start) / 86400000);
}

function getTodayNumber() {
  try { return Number(localStorage.getItem("caig_operator_today") || "0"); } catch { return 0; }
}

function markDayWon() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const current = JSON.parse(localStorage.getItem("caig_operator_wins") || "[]");
    const next = Array.from(new Set([...current, today])).slice(-120);
    localStorage.setItem("caig_operator_wins", JSON.stringify(next));
    localStorage.setItem("caig_operator_today", String(next.length));
  } catch {}
}

function calculateStreak() {
  try {
    const wins = new Set(JSON.parse(localStorage.getItem("caig_operator_wins") || "[]"));
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

function Card({ item, index }) {
  return <a href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined} className="enterprise-card" style={{ "--accent": item.accent }}>
    <span className="enterprise-card-top"><span className="enterprise-card-index">0{index + 1}</span><span className="enterprise-card-arrow">{item.external ? "↗" : "→"}</span></span>
    <span className="enterprise-card-middle"><span className="enterprise-icon-wrap"><span className="enterprise-icon">{item.icon}</span></span></span>
    <span className="enterprise-card-bottom"><span><span className="enterprise-card-meta">{item.meta}</span><span className="enterprise-card-title">{item.title}</span></span><span className="enterprise-card-open">Open <span aria-hidden="true">{item.external ? "↗" : "→"}</span></span></span>
  </a>;
}

export default function EnterpriseHome() {
  const [refresh, setRefresh] = useState(0);
  const [streak, setStreak] = useState(calculateStreak);
  const [dayWon, setDayWon] = useState(() => {
    try { return JSON.parse(localStorage.getItem("caig_operator_wins") || "[]").includes(new Date().toISOString().slice(0, 10)); } catch { return false; }
  });
  const index = (dayIndex() + refresh) % dailyTruths.length;
  const actionIndex = (dayIndex() + refresh * 7) % dailyCommands.length;
  const stoicIndex = (dayIndex() + refresh * 3) % stoicReminders.length;
  const todayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  useEffect(() => {
    const onFocus = () => setRefresh((x) => x + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  function completeDay() {
    markDayWon();
    setDayWon(true);
    setStreak(calculateStreak());
  }

  return <div className="enterprise-shell">
    <style>{`
      .enterprise-shell{min-height:100svh;width:100%;background:var(--bg);color:var(--text);font-family:var(--sans);padding:22px clamp(16px,3.2vw,56px) 44px;box-sizing:border-box}.enterprise-wrap{width:100%;max-width:1560px;min-height:calc(100svh - 66px);margin:0 auto;display:flex;flex-direction:column}.enterprise-header{display:flex;align-items:center;justify-content:space-between;min-height:50px;border-bottom:1px solid var(--border)}.enterprise-brand{display:flex;align-items:center;gap:13px}.enterprise-mark{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:#d9d6ca;color:#111315;font-weight:900;font-size:20px}.enterprise-name{font-size:17px;font-weight:720;letter-spacing:-.025em;color:#ecece8}.enterprise-status{width:7px;height:7px;border-radius:50%;background:var(--success);box-shadow:0 0 14px rgba(111,155,122,.45)}
      .enterprise-mission{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(320px,.65fr);gap:16px;margin:18px 0}.mission-main,.mission-side{background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow)}.mission-main{padding:28px 30px 26px}.mission-side{padding:24px}.mission-kicker,.operator-kicker{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--text-subtle);font-weight:800}.mission-title{margin:9px 0 10px;font-size:clamp(34px,4.6vw,68px);line-height:.92;letter-spacing:-.065em;font-weight:840;max-width:980px}.mission-line{margin:0;max-width:900px;color:#c7c9c7;font-size:14px;line-height:1.5}.mission-side-title{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-muted);font-weight:800}.mission-target{margin:12px 0 0;font-size:22px;letter-spacing:-.035em;font-weight:780;line-height:1.15}.mission-target small{display:block;margin-top:8px;color:var(--text-muted);font-size:11px;line-height:1.45;font-weight:600}.mission-divider{height:1px;background:var(--border);margin:18px 0}.mission-row{display:flex;justify-content:space-between;align-items:flex-end;gap:16px}.mission-score{font-size:34px;font-weight:850;letter-spacing:-.06em}.mission-score-label{font-size:9px;color:var(--text-subtle);text-transform:uppercase;letter-spacing:.16em;font-weight:800}.mission-button{border:1px solid var(--border);background:#ebe7d9;color:#141512;padding:11px 15px;border-radius:10px;font-size:10px;font-weight:850;letter-spacing:.09em;text-transform:uppercase;cursor:pointer}.mission-button:hover{filter:brightness(1.04)}.mission-button.done{background:transparent;color:var(--text);border-color:#6f9b7a}.mission-button:disabled{cursor:default;opacity:.9}
      .daily-brief{display:grid;grid-template-columns:1.45fr .9fr .8fr;gap:16px;margin-bottom:18px}.brief-panel{min-height:160px;background:var(--surface);border:1px solid var(--border);padding:22px 24px;box-shadow:var(--shadow)}.brief-title{margin:8px 0 0;font-size:23px;line-height:1.12;letter-spacing:-.04em;font-weight:800}.brief-body{margin:10px 0 0;color:#c5c7c6;font-size:13px;line-height:1.5}.brief-command{margin-top:15px;color:#f0eee7;font-size:15px;line-height:1.35;font-weight:760}.brief-stoic{margin-top:14px;color:var(--text-muted);font-size:12px;line-height:1.45;font-weight:650}.brief-date{margin-top:7px;color:var(--text-muted);font-size:10px;font-weight:700;letter-spacing:.04em}.streak-number{font-size:55px;line-height:.9;letter-spacing:-.07em;font-weight:850;margin-top:13px}.streak-caption{margin-top:8px;color:var(--text-muted);font-size:11px;line-height:1.4}.standard-list{margin:13px 0 0;padding:0;list-style:none}.standard-list li{padding:9px 0;border-top:1px solid var(--border);color:#d9d9d5;font-size:11px;font-weight:700}.standard-list li:first-child{border-top:0;padding-top:0}
      .enterprise-operator{margin-bottom:18px}.operator-strip{display:grid;grid-template-columns:1fr 1fr;gap:16px}.operator-command{background:var(--surface);border:1px solid var(--border);padding:20px 22px;box-shadow:var(--shadow)}.operator-command.has-pressure{border-color:rgba(180,120,100,.38)}.operator-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.operator-head h2{margin:7px 0 6px;font-size:24px;line-height:1.08;letter-spacing:-.04em}.operator-head p{margin:0;color:var(--text-muted);font-size:11px;line-height:1.4}.operator-cta{background:#ece8db;color:#151614;border-radius:10px;padding:11px 13px;text-decoration:none;font-size:10px;font-weight:850;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}.operator-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:18px;background:var(--border);border:1px solid var(--border)}.operator-stat{background:#131518;padding:13px}.operator-stat strong{display:block;font-size:27px;letter-spacing:-.05em;font-weight:840}.operator-stat span{display:block;margin-top:3px;font-size:9px;color:var(--text-subtle);text-transform:uppercase;letter-spacing:.14em;font-weight:780}.operator-stat.is-urgent strong{color:#eee9dc}.operator-foot{display:flex;justify-content:space-between;gap:16px;margin-top:11px;color:var(--text-subtle);font-size:9px;font-weight:700;letter-spacing:.03em}.operator-foot span:last-child{text-align:right}
      .enterprise-destinations{margin-top:auto}.enterprise-grid{width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.enterprise-card{position:relative;min-height:180px;padding:19px;border-radius:18px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;color:var(--text);text-decoration:none;background:var(--surface);border:1px solid var(--border);transition:transform .2s ease,border-color .2s ease,background .2s ease}.enterprise-card:hover{transform:translateY(-2px);background:var(--surface-2);border-color:rgba(255,255,255,.12)}.enterprise-card:focus-visible{outline:2px solid color-mix(in srgb,var(--accent) 72%,white 28%);outline-offset:4px}.enterprise-card:before{content:"";position:absolute;inset:auto -8% -50% auto;width:220px;height:220px;border-radius:50%;background:var(--accent);opacity:.045;filter:blur(22px);pointer-events:none}.enterprise-card-top,.enterprise-card-bottom{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.enterprise-card-index{color:var(--text-subtle);font-size:9px;font-weight:700;letter-spacing:.18em}.enterprise-card-arrow{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:rgba(255,255,255,.03);border:1px solid var(--border);color:#8b929c;font-size:13px}.enterprise-card-middle{position:relative;display:flex;justify-content:flex-start;align-items:center;flex:1}.enterprise-icon-wrap{width:56px;height:56px;border-radius:17px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 26%,var(--border));background:color-mix(in srgb,var(--accent) 5%,var(--surface))}.enterprise-icon{color:var(--accent);font-size:24px;font-weight:850;line-height:1}.enterprise-card-meta{display:block;margin-bottom:4px;color:var(--text-subtle);font-size:9px;font-weight:750;letter-spacing:.14em;text-transform:uppercase}.enterprise-card-title{display:block;font-size:27px;letter-spacing:-.045em;font-weight:820}.enterprise-card-open{padding-top:15px;color:var(--text-muted);font-size:9px;font-weight:750;white-space:nowrap}.enterprise-card-open span{padding-left:4px;font-size:13px}
      @media(max-width:1000px){.enterprise-mission{grid-template-columns:1fr}.daily-brief{grid-template-columns:1.2fr .8fr}.daily-brief .brief-panel:last-child{grid-column:1/-1}.operator-strip{grid-template-columns:1fr}}@media(max-width:700px){.enterprise-shell{padding:14px 12px 26px}.enterprise-name{font-size:15px}.mission-main{padding:22px 20px}.mission-side{padding:20px}.mission-title{font-size:clamp(40px,12vw,60px)}.daily-brief{grid-template-columns:1fr}.daily-brief .brief-panel:last-child{grid-column:auto}.brief-panel{min-height:0}.operator-strip{gap:10px}.operator-head{flex-direction:column}.operator-cta{align-self:flex-start}.operator-stats{grid-template-columns:repeat(3,1fr)}.operator-stat strong{font-size:22px}.operator-foot{flex-direction:column;gap:4px}.operator-foot span:last-child{text-align:left}.enterprise-grid{grid-template-columns:1fr}.enterprise-card{min-height:145px}}
    `}</style>

    <div className="enterprise-wrap">
      <header className="enterprise-header">
        <div className="enterprise-brand"><span className="enterprise-mark">C</span><span className="enterprise-name">Cornerstone AI Enterprise</span></div>
        <span className="enterprise-status" aria-label="Online" />
      </header>

      <section className="enterprise-mission">
        <div className="mission-main">
          <div className="mission-kicker">The mission</div>
          <h1 className="mission-title">Build a life your family can rely on.</h1>
          <p className="mission-line">Cash flow first. Assets second. Freedom third. Every useful hour has one job: move the family closer to financial strength.</p>
        </div>
        <div className="mission-side">
          <div className="mission-side-title">Operator standard</div>
          <div className="mission-target">{objectiveDefaults.character}</div>
          <div className="mission-divider" />
          <div className="mission-row"><div><div className="mission-score">{streak}</div><div className="mission-score-label">day execution streak</div></div><button className={`mission-button${dayWon ? " done" : ""}`} onClick={completeDay} disabled={dayWon}>{dayWon ? "Today won" : "Mark today won"}</button></div>
        </div>
      </section>

      <section className="daily-brief">
        <article className="brief-panel">
          <div className="mission-kicker">Daily briefing</div>
          <div className="brief-title">{dailyTruths[index]}</div>
          <div className="brief-command">COMMAND — {dailyCommands[actionIndex]}</div>
          <div className="brief-date">{todayLabel} · {stoicReminders[stoicIndex]}</div>
        </article>
        <article className="brief-panel">
          <div className="mission-kicker">Money doctrine</div>
          <div className="brief-title">{objectiveDefaults.money}</div>
          <ul className="standard-list">
            <li>Cash work before creative comfort.</li>
            <li>Skill before status.</li>
            <li>Income becomes assets.</li>
          </ul>
        </article>
        <article className="brief-panel">
          <div className="mission-kicker">Family</div>
          <div className="brief-title">Build options, not appearances.</div>
          <p className="brief-body">The outcome is not looking successful. It is having enough capability and capital that the family has choices when life gets difficult.</p>
        </article>
      </section>

      <section className="enterprise-operator"><OperatorCommandStrip /></section>

      <section className="enterprise-destinations">
        <div className="enterprise-grid">{destinations.map((item,index)=><Card key={item.title} item={item} index={index}/>)}</div>
      </section>
    </div>
  </div>;
}
