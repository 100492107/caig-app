import React, { useEffect, useMemo, useState } from "react";
import { getTodaysVerse } from "./dailyScripture.js";

const CRM_URL = "https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/";
const NEW_LIFE_URL = "https://new-life-game-alpha.vercel.app/start-v2.html";

const DAILY_BRIEFINGS = [
  { doctrine: "Revenue is the scoreboard.", challenge: "Move one live opportunity forward before doing anything optional.", action: "Open Track A and clear the highest-value next action." },
  { doctrine: "Do not hide in preparation.", challenge: "Put the offer in front of a buyer before improving it again.", action: "Make one direct ask for the business." },
  { doctrine: "Finish what you start.", challenge: "Close the oldest unfinished money task first.", action: "Open the correct workspace and finish the open loop." },
  { doctrine: "Attention is capital.", challenge: "Protect the first serious block of work from low-value noise.", action: "Start the hardest useful task now." },
  { doctrine: "Follow-up is where money hides.", challenge: "Reopen the conversation you are tempted to write off too early.", action: "Follow up until you have a yes, no, or date." },
  { doctrine: "One finished asset beats ten ideas.", challenge: "Ship something another person can actually consume, buy or reuse.", action: "Finish the package closest to done." },
  { doctrine: "Do not confuse motion with progress.", challenge: "Remove one task that feels productive but changes nothing.", action: "Delete the lowest-value item from today." },
  { doctrine: "Ask for the sale.", challenge: "Stop making the buyer guess what happens next.", action: "Make the next-step request explicit." },
  { doctrine: "Evidence decides.", challenge: "Use what the market actually did, not what you hope it will do.", action: "Review one real response before choosing the next move." },
  { doctrine: "Comfort is expensive.", challenge: "Do the task you keep postponing because it can create a real consequence.", action: "Take the avoided action first." },
  { doctrine: "Build earning power.", challenge: "Spend time becoming more valuable, not merely more informed.", action: "Practise the skill closest to revenue." },
  { doctrine: "Protect the pipeline.", challenge: "Never let a warm lead sit without a dated next action.", action: "Put a next move and date against every warm opportunity." },
  { doctrine: "Use the machine.", challenge: "Operate the system you already built before inventing another one.", action: "Open the right workspace and execute step one." },
  { doctrine: "Do not negotiate with distraction.", challenge: "When you notice yourself browsing or rearranging, return to the measurable move.", action: "Return to the queue within sixty seconds." },
  { doctrine: "Cash creates breathing room.", challenge: "Move today's work toward an actual financial event.", action: "Advance one opportunity to its next milestone." },
  { doctrine: "Make yourself hard to ignore.", challenge: "Create one useful result the market can see today.", action: "Put one finished proof point into circulation." },
  { doctrine: "Do not start from zero twice.", challenge: "Turn today's learning into something reusable.", action: "Capture the strongest learning as an asset." },
  { doctrine: "Speed matters.", challenge: "Shorten the gap between deciding and doing.", action: "Take the next action before redesigning the plan." },
  { doctrine: "Discipline before mood.", challenge: "Let the plan determine the work, not your appetite for it.", action: "Do the planned first task without renegotiation." },
  { doctrine: "Quiet work makes loud results.", challenge: "Do not announce the plan. Produce the evidence.", action: "Complete the work before talking about the work." },
  { doctrine: "Finish the money loop.", challenge: "A contact without a next step is unfinished business.", action: "Turn one open conversation into a dated commitment." },
  { doctrine: "Earn the right to scale.", challenge: "Prove the small loop before adding complexity.", action: "Make the smallest repeatable loop work today." },
  { doctrine: "Do not let ideas outrun execution.", challenge: "Keep new ideas parked until the current queue is clean.", action: "Clear the oldest production item." },
  { doctrine: "Be exact.", challenge: "Replace vague intentions with a specific result and time.", action: "Choose today's one non-negotiable outcome." },
  { doctrine: "Every day should leave evidence.", challenge: "Something measurable should exist at the end of today that did not exist yesterday.", action: "Create one new piece of evidence." },
  { doctrine: "Control the morning.", challenge: "Do not hand your best hours to feeds, notifications or low-value admin.", action: "Win the first focused block with one high-value task." },
  { doctrine: "Do not mistake patience for passivity.", challenge: "Keep creating opportunities while you wait on external decisions.", action: "Create another opportunity while one waits." },
  { doctrine: "Respect the numbers.", challenge: "Look at the actual pipeline before deciding how the day feels.", action: "Check the live cash position before choosing priorities." },
  { doctrine: "No fantasy bookkeeping.", challenge: "Count movement, not hope: replies, meetings, samples, pilots, sales and shipped work.", action: "Record the real movement before adding another goal." },
  { doctrine: "Close strong.", challenge: "Do not let the final hour become a surrender to distraction.", action: "End the day with one completed high-value result." },
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readWon() {
  try {
    return new Set(JSON.parse(localStorage.getItem("caig_operator_wins") || "[]"));
  } catch {
    return new Set();
  }
}

function writeWon(key) {
  try {
    const next = Array.from(new Set([...readWon(), key])).slice(-365);
    localStorage.setItem("caig_operator_wins", JSON.stringify(next));
  } catch {}
}

function getStreak(wins) {
  let date = new Date();
  let count = 0;
  while (true) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (!wins.has(key)) break;
    count += 1;
    date.setDate(date.getDate() - 1);
  }
  return count;
}

function NavButton({ href, label, meta, external = false, tone }) {
  return (
    <a
      className={`home-workspace home-workspace-${tone}`}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      <span className="home-workspace-copy">
        <strong>{label}</strong>
        <small>{meta}</small>
      </span>
      <span className="home-workspace-arrow" aria-hidden="true">{external ? "↗" : "→"}</span>
    </a>
  );
}

export default function EnterpriseCommandHome() {
  const hour = new Date().getHours();
  const today = todayKey();
  const index = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 86400000) % DAILY_BRIEFINGS.length;
  const brief = DAILY_BRIEFINGS[index];
  const verse = useMemo(() => getTodaysVerse(), []);
  const [wins, setWins] = useState(() => readWon());
  const dayWon = wins.has(today);
  const streak = getStreak(wins);
  const phase = hour < 13 ? "CASH FIRST" : hour < 18 ? "BUILD SECOND" : "CLOSE THE LOOP";

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "1") window.location.href = CRM_URL;
      if (event.key === "2") window.location.href = "/creative";
      if (event.key === "3") window.location.href = NEW_LIFE_URL;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const markWon = () => {
    if (dayWon) return;
    writeWon(today);
    setWins(readWon());
  };

  return (
    <main className="enterprise-home-v2">
      <style>{`
        .enterprise-home-v2{min-height:100svh;background:var(--bg);color:var(--text);font-family:var(--sans);padding:12px 14px 88px}
        .home-frame{max-width:900px;margin:0 auto}
        .home-header{min-height:48px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);gap:12px}
        .home-brand{display:flex;align-items:center;gap:10px;min-width:0}
        .home-mark{width:34px;height:34px;border-radius:10px;background:#ddd9cc;color:#151617;display:grid;place-items:center;font-weight:900;flex:0 0 34px}
        .home-brand-name{font-size:14px;font-weight:780;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .home-status{display:flex;align-items:center;gap:7px;color:var(--text-subtle);font-size:8px;letter-spacing:.12em;text-transform:uppercase;font-weight:760}
        .home-status-dot{width:6px;height:6px;border-radius:50%;background:var(--success)}

        .home-main{padding-top:18px}
        .home-phase{font-size:8px;letter-spacing:.20em;text-transform:uppercase;color:var(--word);font-weight:820}
        .home-doctrine{margin:8px 0 0;font-size:clamp(30px,7vw,54px);line-height:.98;letter-spacing:-.055em;font-weight:860;max-width:15ch}
        .home-challenge{margin-top:16px;font-size:15px;line-height:1.5;color:var(--text);max-width:62ch}
        .home-action{margin-top:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;border:1px solid var(--word-border);background:var(--word-dim);border-radius:12px}
        .home-action span{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:var(--word);font-weight:820}
        .home-action strong{font-size:12px;color:var(--text-h);font-weight:760}
        .home-action-arrow{font-size:16px;color:var(--word)}

        .home-workspaces{margin-top:22px;display:grid;gap:8px}
        .home-workspace{min-height:64px;padding:13px 14px;border:1px solid var(--border);border-radius:13px;background:var(--surface);display:flex;align-items:center;justify-content:space-between;gap:12px;text-decoration:none;color:var(--text);transition:background .16s ease,border-color .16s ease,transform .16s ease}
        .home-workspace:hover{background:var(--surface-2);transform:translateY(-1px)}
        .home-workspace-copy{display:flex;align-items:baseline;gap:10px;min-width:0}
        .home-workspace-copy strong{font-size:15px;font-weight:800}
        .home-workspace-copy small{font-size:8px;text-transform:uppercase;letter-spacing:.13em;color:var(--text-subtle);font-weight:780}
        .home-workspace-arrow{width:30px;height:30px;border:1px solid var(--border);border-radius:9px;display:grid;place-items:center;font-size:13px;flex:0 0 30px}
        .home-workspace-a .home-workspace-arrow{color:var(--track-a)}
        .home-workspace-b .home-workspace-arrow{color:var(--track-b)}
        .home-workspace-life .home-workspace-arrow{color:var(--new-life)}

        .home-secondary{margin-top:20px;display:grid;gap:10px}
        .home-secondary-card{border-top:1px solid var(--border);padding-top:15px}
        .home-secondary-kicker{font-size:8px;letter-spacing:.17em;text-transform:uppercase;color:var(--text-subtle);font-weight:820}
        .home-mission{margin-top:7px;font-size:23px;line-height:1.05;letter-spacing:-.045em;font-weight:820}
        .home-verse-ref{margin-top:8px;color:var(--word);font-size:10px;font-weight:780}
        .home-verse{margin-top:5px;font-size:12px;line-height:1.5;color:var(--text-muted);max-width:62ch}

        .home-footer{margin-top:22px;padding-top:14px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px}
        .home-score{display:flex;align-items:baseline;gap:8px;color:var(--text-muted)}
        .home-score strong{font-size:19px;color:var(--text-h);letter-spacing:-.04em}
        .home-score span{font-size:8px;letter-spacing:.12em;text-transform:uppercase}
        .home-win{min-height:40px;padding:0 14px;border-radius:10px;border:1px solid var(--border-strong);background:#ddd9cc;color:#141516;font-size:10px;font-weight:820}
        .home-win.done{background:var(--surface-2);color:var(--text-muted);border-color:var(--border);}

        @media(min-width:760px){
          .enterprise-home-v2{padding:20px 24px 40px}
          .home-frame{max-width:1120px}
          .home-header{min-height:54px}
          .home-main{padding-top:38px}
          .home-workspaces{grid-template-columns:repeat(3,1fr)}
          .home-workspace{min-height:92px;padding:17px}
          .home-workspace-copy{display:block}
          .home-workspace-copy small{display:block;margin-top:5px}
          .home-secondary{grid-template-columns:1.2fr 1fr;gap:28px;margin-top:28px}
          .home-footer{margin-top:30px}
        }
      `}</style>

      <div className="home-frame">
        <header className="home-header">
          <div className="home-brand">
            <span className="home-mark">C</span>
            <span className="home-brand-name">Cornerstone AI Enterprise</span>
          </div>
          <div className="home-status"><span className="home-status-dot" /> online</div>
        </header>

        <section className="home-main" aria-labelledby="today-doctrine">
          <div className="home-phase">{phase} · TODAY</div>
          <h1 className="home-doctrine" id="today-doctrine">{brief.doctrine}</h1>
          <p className="home-challenge">{brief.challenge}</p>
          <a className="home-action" href={hour < 13 ? CRM_URL : "/creative"} target={hour < 13 ? "_blank" : undefined} rel={hour < 13 ? "noreferrer" : undefined}>
            <span>Next move</span>
            <strong>{brief.action}</strong>
            <span className="home-action-arrow" aria-hidden="true">→</span>
          </a>
        </section>

        <section className="home-workspaces" aria-label="Primary workspaces">
          <NavButton href={CRM_URL} label="Track A" meta="Cash · outreach" external tone="a" />
          <NavButton href="/creative" label="Track B" meta="Build · ship" tone="b" />
          <NavButton href={NEW_LIFE_URL} label="New Life" meta="Standard · habits" external tone="life" />
        </section>

        <section className="home-secondary">
          <article className="home-secondary-card">
            <div className="home-secondary-kicker">The mission</div>
            <div className="home-mission">Build a life your family can rely on.</div>
          </article>
          <article className="home-secondary-card">
            <div className="home-secondary-kicker">Word for today</div>
            <div className="home-verse-ref">{verse.ref}</div>
            <div className="home-verse">“{verse.text}”</div>
          </article>
        </section>

        <footer className="home-footer">
          <div className="home-score"><strong>{streak}</strong><span>day streak</span></div>
          <button className={`home-win${dayWon ? " done" : ""}`} onClick={markWon} disabled={dayWon}>{dayWon ? "Today won" : "Mark day won"}</button>
        </footer>
      </div>
    </main>
  );
}
