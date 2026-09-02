import React, { useEffect, useMemo, useState } from "react";
import OperatorCommandStrip from "./OperatorCommandStrip.jsx";
import { getTodaysVerse } from "./dailyScripture.js";

const CRM_URL = "https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/";
const NEW_LIFE_URL = "https://new-life-game-alpha.vercel.app/start-v2.html";

const DAILY_BRIEFINGS = [
  { doctrine: "Revenue is the scoreboard.", challenge: "Before you touch a creative task, move one live opportunity forward.", family: "Build income that gives your family options, not promises.", action: "Clear the highest-value unanswered conversation first." },
  { doctrine: "Do not hide in preparation.", challenge: "Put the offer in front of a buyer before you improve the offer again.", family: "Security comes from useful output repeated for long enough.", action: "Make one direct ask for the business." },
  { doctrine: "Finish what you start.", challenge: "Take the oldest unfinished money task and close the loop.", family: "Reliability is built by keeping commitments when nobody is watching.", action: "Close one open loop before creating another." },
  { doctrine: "Attention is capital.", challenge: "Protect the first serious block of work from anything that does not move cash or output.", family: "Your time becomes your family's future when you spend it deliberately.", action: "Start the hardest revenue task before checking anything optional." },
  { doctrine: "Follow-up is where money hides.", challenge: "Reopen the conversation you are tempted to write off too early.", family: "Patience plus persistence compounds differently from hype.", action: "Follow up until you have a yes, no, or date." },
  { doctrine: "One completed asset beats a page of ideas.", challenge: "Ship one thing that can actually be consumed, sold, or reused.", family: "Assets are built by completion, not intention.", action: "Finish the package already closest to done." },
  { doctrine: "Do not confuse motion with progress.", challenge: "Remove one task that feels productive but has no measurable consequence.", family: "The goal is a stronger life, not a busier calendar.", action: "Delete one low-value task from today." },
  { doctrine: "Ask for the sale.", challenge: "Stop making the buyer guess what you want them to do next.", family: "Courage in business is often one clear sentence.", action: "Make the next-step request explicit." },
  { doctrine: "Work the constraint.", challenge: "Find the single bottleneck slowing today's cash or shipment and attack that before anything else.", family: "A disciplined operator fixes the constraint instead of complaining about the system.", action: "Name the bottleneck, then remove it." },
  { doctrine: "Evidence decides.", challenge: "Use what the market actually did yesterday instead of what you hope it will do tomorrow.", family: "Truth is more useful to your family than a comforting story.", action: "Review one piece of evidence before making the next creative decision." },
  { doctrine: "Comfort is expensive.", challenge: "Do the task you have been postponing because it can produce a real consequence.", family: "The future is paid for with today's discomfort.", action: "Take the avoided action before noon." },
  { doctrine: "Build earning power.", challenge: "Spend the day becoming more valuable to the market, not merely more informed.", family: "Skill that creates cash creates choice.", action: "Practise the exact sales or production skill that is closest to revenue." },
  { doctrine: "Protect the pipeline.", challenge: "Never let a warm lead sit without a dated next action.", family: "A predictable household is easier to build from a predictable pipeline.", action: "Put a date and next move against every warm opportunity." },
  { doctrine: "Use the machine.", challenge: "Operate the system you have already built before inventing another system.", family: "A tool only changes your life when you use it.", action: "Open the correct workspace and execute the first step." },
  { doctrine: "Do not negotiate with distraction.", challenge: "When you notice yourself browsing, designing, or rearranging instead of working, return to the next measurable move.", family: "Discipline is choosing the useful thing repeatedly.", action: "Return to the queue within sixty seconds." },
  { doctrine: "Cash creates breathing room.", challenge: "Move today's work toward an actual financial event: reply, call, sample, pilot, sale.", family: "You are building room around the people you are responsible for.", action: "Advance one opportunity to the next financial milestone." },
  { doctrine: "Make yourself hard to ignore.", challenge: "Create a useful result the market can see today.", family: "Reputation follows repeated proof.", action: "Put one finished proof point into circulation." },
  { doctrine: "Do not start from zero twice.", challenge: "Turn today's learning into a reusable asset before you finish the day.", family: "Compounding begins when lessons stop disappearing.", action: "Capture the strongest learning and make it reusable." },
  { doctrine: "Speed matters.", challenge: "Shorten the gap between deciding and doing.", family: "Faster execution gives your family more opportunities sooner.", action: "Take the next action before you redesign the plan." },
  { doctrine: "Discipline before mood.", challenge: "Let the plan determine the work, not your current appetite for the work.", family: "Standards are what remain when motivation leaves.", action: "Do the planned first task without renegotiation." },
  { doctrine: "Quiet work makes loud results.", challenge: "Do not announce the plan. Produce the evidence.", family: "Your family needs outcomes more than explanations.", action: "Complete the work before talking about the work." },
  { doctrine: "Finish the money loop.", challenge: "A contact without a next step is unfinished business.", family: "Reliable cash flow is built from completed loops.", action: "Turn one open conversation into a dated commitment." },
  { doctrine: "Earn the right to scale.", challenge: "Prove the small loop before adding complexity.", family: "Simple systems that work beat impressive systems that stall.", action: "Make the smallest repeatable loop work today." },
  { doctrine: "Do not let ideas outrun execution.", challenge: "Park new ideas until the current production queue is clean.", family: "Long-term wealth is built by compounding finished assets.", action: "Clear the oldest production item." },
  { doctrine: "The buyer does not owe you attention.", challenge: "Make every outreach message earn the next reply.", family: "Respect the other person's time by making your value clear.", action: "Improve one message by making the business outcome obvious." },
  { doctrine: "Be exact.", challenge: "Replace vague intentions with a specific result, owner, and time.", family: "Precision reduces wasted effort.", action: "Define today's one non-negotiable outcome." },
  { doctrine: "Do hard work while it is still hard.", challenge: "Do not wait for the task to feel easier before beginning it.", family: "Strength comes from repeated contact with resistance.", action: "Begin the uncomfortable task immediately." },
  { doctrine: "Build before you boast.", challenge: "Let today's output be something another person can actually use.", family: "Substance creates durable confidence.", action: "Publish or deliver something useful." },
  { doctrine: "Do not carry dead weight.", challenge: "Remove one recurring process, commitment, or distraction that gives less back than it costs.", family: "A leaner life leaves more capacity for the people who matter.", action: "Cut one recurring source of friction." },
  { doctrine: "Every day should leave evidence.", challenge: "At the end of the day, there must be something measurable that did not exist yesterday.", family: "Evidence turns ambition into a track record.", action: "Create one new piece of evidence today." },
  { doctrine: "Control the morning.", challenge: "Do not hand the first high-energy hours to notifications, feeds, or low-value admin.", family: "The first hours set the economic direction of the day.", action: "Win the first ninety minutes with one high-value task." },
  { doctrine: "Do not mistake patience for passivity.", challenge: "Keep moving while you wait for external decisions.", family: "You can be patient with outcomes without being passive with inputs.", action: "Create another opportunity while one waits." },
  { doctrine: "Turn capability into leverage.", challenge: "Use automation, AI, templates, or systems only where they remove real friction.", family: "Leverage is useful when it makes your work repeatable.", action: "Automate one repeated step that is genuinely costing time." },
  { doctrine: "Respect the numbers.", challenge: "Look at the actual pipeline before deciding how the day feels.", family: "Reality is easier to improve than illusion.", action: "Check the live cash position before choosing today's priorities." },
  { doctrine: "No fantasy bookkeeping.", challenge: "Do not count hope as progress. Count replies, meetings, samples, pilots, sales and shipped work.", family: "Honest numbers create honest decisions.", action: "Record the real movement before adding another goal." },
  { doctrine: "Protect the asset.", challenge: "Spend one deliberate block improving something that can earn or save repeatedly.", family: "The point of today's work is to make tomorrow stronger.", action: "Improve one reusable asset." },
  { doctrine: "One more conversation.", challenge: "When the urge is to stop, create one additional genuine opportunity.", family: "Small extra efforts are often where compounding starts.", action: "Make one more quality contact than the minimum." },
  { doctrine: "Act like the outcome matters.", challenge: "Bring urgency to the task that directly changes the financial picture.", family: "Responsibility should change behaviour, not just intention.", action: "Move the highest-impact task to the front of the queue." },
  { doctrine: "Do not outsource conviction.", challenge: "You do not need another opinion before taking the obvious next action.", family: "Confidence grows from evidence collected by action.", action: "Make one decision you already have enough information to make." },
  { doctrine: "Take the long view without losing today.", challenge: "Protect the long-term engine while still winning the current day.", family: "Wealth is built over years through today's repetitions.", action: "Complete today's cash move and today's compounding move." },
  { doctrine: "Leave nothing vague.", challenge: "Every open project needs a concrete next action.", family: "Clarity turns pressure into movement.", action: "Write the next action for every open priority." },
  { doctrine: "Momentum is earned.", challenge: "Do three consecutive useful actions before you evaluate how you feel.", family: "Action creates the momentum that motivation often waits for.", action: "Complete three high-value actions back-to-back." },
  { doctrine: "The standard is the standard.", challenge: "Do not lower the quality bar because today started badly.", family: "A difficult morning does not deserve a wasted day.", action: "Restart immediately and finish the next required task." },
  { doctrine: "Make the next hour count.", challenge: "Ignore the whole month for sixty minutes and execute the highest-value move.", family: "A strong life is built hour by hour.", action: "Set one focused sixty-minute block now." },
  { doctrine: "Build a business, not a hobby.", challenge: "Ask whether today's work creates revenue, distribution, an asset, or evidence.", family: "Purpose becomes real when the work can support people.", action: "Remove one activity that creates none of those four outputs." },
  { doctrine: "Do not let fear dress as strategy.", challenge: "Name the real risk and take the smallest useful action against it.", family: "Avoidance protects comfort, not the future.", action: "Take one measured step toward the thing you are avoiding." },
  { doctrine: "Your calendar reveals your priorities.", challenge: "Make sure the work you say matters is visible in the hours you actually spend.", family: "Time allocation is a real statement of values.", action: "Protect a visible block for the work that matters most." },
  { doctrine: "Earn momentum before optimising.", challenge: "Run the process enough times to see the bottleneck before redesigning it.", family: "Useful systems are discovered through operation.", action: "Run the current process once more and observe what breaks." },
  { doctrine: "The finish line is a delivered result.", challenge: "Do not stop at 'ready'. Put it in the hands of the person who needs it.", family: "Delivery turns work into value.", action: "Send, publish, submit, or deliver one finished result." },
  { doctrine: "Use pressure correctly.", challenge: "Let urgency sharpen the next action rather than scatter your attention.", family: "Pressure is useful when converted into execution.", action: "Choose one priority and ignore the rest until it moves." },
  { doctrine: "Be ruthless with low-value work.", challenge: "Your attention belongs to the activities closest to cash or compounding.", family: "The life you want requires selective effort.", action: "Move one low-value task out of today's prime hours." },
  { doctrine: "Do not celebrate setup.", challenge: "Setup is only useful if it ends in execution.", family: "The family result is on the far side of completed work.", action: "Stop configuring and start operating." },
  { doctrine: "Let the market teach you.", challenge: "Use today's response to improve tomorrow's move.", family: "Learning compounds when it changes behaviour.", action: "Turn one real response into one concrete adjustment." },
  { doctrine: "Be the closer of loops.", challenge: "Look for conversations, tasks and decisions you can finish today.", family: "Closed loops make a business dependable.", action: "Close the easiest high-value open loop first." },
  { doctrine: "Your work should buy freedom.", challenge: "Prioritise actions that create either cash now or leverage later.", family: "Freedom is purchased through repeated useful output.", action: "Choose today's cash move and today's leverage move." },
  { doctrine: "Do not need permission.", challenge: "Take the next legitimate action without waiting for perfect confidence.", family: "Responsibility often means moving first.", action: "Act on the opportunity already in front of you." },
  { doctrine: "Discomfort is data.", challenge: "Notice what you resist; it often points directly to the work that matters.", family: "Resistance is not always a stop sign.", action: "Work on the task you most want to postpone." },
  { doctrine: "Build something that survives you.", challenge: "Choose one action that improves a system, asset, brand, or audience beyond today.", family: "The strongest work creates value after the workday ends.", action: "Improve one compounding asset before the day closes." },
  { doctrine: "No zero days.", challenge: "Even on a bad day, create one measurable business result.", family: "Consistency protects the future when motivation fails.", action: "Produce one undeniable result before stopping." },
  { doctrine: "Close strong.", challenge: "Do not let the final hour become a surrender to distraction.", family: "How you finish becomes evidence of your standard.", action: "End the day with one completed high-value result." },
];

function dayIndex(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000);
}

function keyToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readWins() {
  try { return new Set(JSON.parse(localStorage.getItem("caig_operator_wins") || "[]")); } catch { return new Set(); }
}

function writeWin(key) {
  try {
    const next = Array.from(new Set([...readWins(), key])).slice(-365);
    localStorage.setItem("caig_operator_wins", JSON.stringify(next));
  } catch {}
}

function streakLength(wins) {
  let d = new Date();
  let n = 0;
  while (wins.has(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function NavLink({ href, label, descriptor, external, className = "" }) {
  return <a className={`enterprise-nav-item ${className}`} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
    <span className="enterprise-nav-label">{label}</span>
    <span className="enterprise-nav-descriptor">{descriptor}</span>
    <span className="enterprise-nav-arrow" aria-hidden="true">{external ? "↗" : "→"}</span>
  </a>;
}

function DestinationCard({ title, descriptor, copy, href, external, accent, priority }) {
  return <a className="enterprise-destination" style={{ "--destination-accent": accent }} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
    <div className="destination-top"><span className="destination-priority">{priority}</span><span className="destination-arrow">{external ? "↗" : "→"}</span></div>
    <div className="destination-accent" />
    <div className="destination-bottom"><div><div className="destination-descriptor">{descriptor}</div><h2>{title}</h2><p>{copy}</p></div><span className="destination-open">Open</span></div>
  </a>;
}

export default function EnterpriseCommandHome() {
  const today = keyToday();
  const [wins, setWins] = useState(() => readWins());
  const [focus, setFocus] = useState("mission");
  const index = dayIndex();
  const brief = DAILY_BRIEFINGS[index % DAILY_BRIEFINGS.length];
  const verse = useMemo(() => getTodaysVerse(), [today]);
  const streak = streakLength(wins);
  const dayWon = wins.has(today);
  const now = new Date();
  const hour = now.getHours();
  const phase = hour < 13 ? "CASH" : hour < 18 ? "SHIP" : "REVIEW";
  const phaseTitle = hour < 13 ? "Win the cash side first." : hour < 18 ? "Turn work into output." : "Close the loop and reset.";

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "1") setFocus("mission");
      if (event.key === "2") window.location.href = CRM_URL;
      if (event.key === "3") window.location.href = "/creative";
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function markWon() {
    if (dayWon) return;
    writeWin(today);
    setWins(readWins());
    setFocus("mission");
  }

  return <div className="enterprise-command-shell">
    <style>{`
      .enterprise-command-shell{min-height:100svh;background:var(--bg);color:var(--text);font-family:var(--sans);padding:16px clamp(14px,2.6vw,48px) 38px}
      .enterprise-command-wrap{width:100%;max-width:1600px;min-height:calc(100svh - 54px);margin:0 auto;display:flex;flex-direction:column}
      .enterprise-command-header{min-height:54px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:18px}
      .enterprise-brand{display:flex;align-items:center;gap:11px;min-width:0}.enterprise-mark{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:#d9d6ca;color:#111315;font-weight:900;font-size:18px;flex:0 0 40px}.enterprise-name{font-size:16px;font-weight:760;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .enterprise-command-nav{display:flex;align-items:center;gap:3px}.enterprise-nav-item{display:grid;grid-template-columns:auto auto auto;align-items:center;gap:7px;padding:7px 10px;border-radius:9px;color:var(--text-muted);text-decoration:none}.enterprise-nav-item:hover{background:var(--surface);color:var(--text)}.enterprise-nav-item:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.enterprise-nav-label{font-size:10px;font-weight:820}.enterprise-nav-descriptor{font-size:8px;color:var(--text-subtle);text-transform:uppercase;letter-spacing:.10em}.enterprise-nav-arrow{font-size:12px}.enterprise-nav-a .enterprise-nav-arrow{color:var(--track-a)}.enterprise-nav-b .enterprise-nav-arrow{color:var(--track-b)}.enterprise-nav-life .enterprise-nav-arrow{color:var(--new-life)}.enterprise-live{width:7px;height:7px;border-radius:50%;background:var(--success);box-shadow:0 0 14px rgba(111,155,122,.4);flex:0 0 7px}
      .enterprise-intro{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(270px,.65fr);gap:16px;margin-top:16px}.brief-card,.mission-card,.score-card,.operator-shell,.destination-shell{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow)}
      .brief-card{padding:24px 26px;border-color:var(--word-border);background:linear-gradient(150deg,color-mix(in srgb,var(--word) 7%,var(--surface)),var(--surface))}.eyebrow{font-size:8px;letter-spacing:.22em;text-transform:uppercase;font-weight:820;color:var(--word)}.brief-doctrine{margin-top:10px;font-size:clamp(25px,3vw,40px);line-height:1.05;letter-spacing:-.055em;font-weight:850;max-width:23ch}.brief-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.brief-detail{padding-top:11px;border-top:1px solid var(--word-border)}.brief-detail span{display:block;font-size:8px;color:var(--text-subtle);text-transform:uppercase;letter-spacing:.14em;font-weight:780}.brief-detail strong{display:block;margin-top:6px;font-size:12px;line-height:1.45;color:var(--text)}
      .verse-card{padding:22px 24px;display:flex;flex-direction:column;justify-content:space-between}.verse-ref{margin-top:9px;font-size:11px;color:var(--word);font-weight:760}.verse-text{margin-top:8px;font-size:15px;line-height:1.5;color:var(--text-h);font-weight:580}.verse-meta{margin-top:14px;font-size:9px;color:var(--text-subtle)}
      .mission-row{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(260px,.55fr);gap:16px;margin-top:16px}.mission-card{padding:25px 27px}.mission-title{margin-top:8px;font-size:clamp(34px,4.7vw,66px);line-height:.92;letter-spacing:-.065em;font-weight:860;max-width:980px}.mission-copy{margin-top:12px;max-width:900px;color:#c5c7c7;font-size:13px;line-height:1.55}.mission-side{padding:22px 24px}.mission-side-label{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-subtle);font-weight:800}.mission-phase{margin-top:8px;color:var(--track-a);font-size:10px;letter-spacing:.18em;font-weight:820}.mission-phase-title{margin-top:8px;font-size:20px;letter-spacing:-.035em;font-weight:800}.mission-action{margin-top:14px;padding-top:14px;border-top:1px solid var(--border);color:var(--text-muted);font-size:11px;line-height:1.5}.mission-action strong{color:var(--text)}
      .score-card{margin-top:16px;padding:20px 22px;display:grid;grid-template-columns:1.5fr repeat(3,1fr) auto;align-items:center;gap:18px}.score-head strong{display:block;font-size:28px;letter-spacing:-.05em}.score-head span,.metric span{display:block;color:var(--text-subtle);font-size:8px;text-transform:uppercase;letter-spacing:.13em;font-weight:780}.metric strong{display:block;margin-top:4px;font-size:23px;letter-spacing:-.04em}.metric.is-focus strong{color:var(--word)}.score-cta{min-height:40px;padding:0 13px;border:1px solid var(--border-strong);background:#ddd9cc;color:#111315;border-radius:10px;font-size:10px;font-weight:840;cursor:pointer}.score-cta.done{background:var(--surface-2);color:var(--text-muted)}
      .operator-shell{margin-top:16px;padding:0}.operator-shell .operator-strip{margin-top:0!important;padding:0}
      .destination-shell{margin-top:16px;padding:12px}.destination-heading{display:flex;align-items:end;justify-content:space-between;padding:4px 7px 12px}.destination-heading span{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:var(--text-subtle);font-weight:800}.destination-heading strong{font-size:11px;color:var(--text-muted);font-weight:700}.destination-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.enterprise-destination{position:relative;min-height:176px;padding:18px;display:flex;flex-direction:column;justify-content:space-between;text-decoration:none;color:var(--text);background:#12151a;border:1px solid var(--border);border-radius:15px;overflow:hidden;transition:transform .18s ease,border-color .18s ease,background .18s ease}.enterprise-destination:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--destination-accent) 34%,var(--border));background:#15181d}.destination-top,.destination-bottom{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.destination-priority,.destination-descriptor{font-size:8px;text-transform:uppercase;letter-spacing:.15em;font-weight:800;color:var(--text-subtle)}.destination-arrow{width:30px;height:30px;border:1px solid var(--border);border-radius:9px;display:grid;place-items:center;color:var(--destination-accent);font-size:13px}.destination-accent{position:absolute;width:180px;height:180px;border-radius:50%;right:-80px;bottom:-100px;background:var(--destination-accent);opacity:.08;filter:blur(20px)}.destination-bottom h2{margin:5px 0 0;font-size:25px;letter-spacing:-.045em}.destination-bottom p{margin:6px 0 0;max-width:34ch;color:var(--text-muted);font-size:10px;line-height:1.45}.destination-open{align-self:flex-end;color:var(--text-muted);font-size:9px;font-weight:800}
      @media(max-width:1050px){.enterprise-command-header{align-items:flex-start;padding:7px 0;flex-direction:column;gap:7px}.enterprise-command-nav{width:100%;overflow:auto}.enterprise-intro,.mission-row{grid-template-columns:1fr}.score-card{grid-template-columns:1.4fr repeat(3,1fr)}}
      @media(max-width:760px){.enterprise-command-shell{padding:10px 10px 25px}.enterprise-intro{gap:10px}.brief-card,.verse-card,.mission-card,.mission-side{padding:19px}.brief-grid{grid-template-columns:1fr}.score-card{grid-template-columns:1fr 1fr;gap:14px}.score-cta{grid-column:1/-1}.destination-grid{grid-template-columns:1fr}.enterprise-destination{min-height:155px}.enterprise-nav-descriptor{display:none}.enterprise-nav-item{padding:7px 8px}}
    `}</style>

    <div className="enterprise-command-wrap">
      <header className="enterprise-command-header">
        <div className="enterprise-brand"><span className="enterprise-mark">C</span><span className="enterprise-name">Cornerstone AI Enterprise</span></div>
        <div className="enterprise-head-right"><nav className="enterprise-command-nav" aria-label="Primary workspaces">
          <NavLink href={CRM_URL} label="Track A" descriptor="Money" external className="enterprise-nav-a" />
          <NavLink href="/creative" label="Track B" descriptor="Build" className="enterprise-nav-b" />
          <NavLink href={NEW_LIFE_URL} label="New Life" descriptor="Standard" external className="enterprise-nav-life" />
        </nav><span className="enterprise-live" aria-label="Online" /></div>
      </header>

      <section className="enterprise-intro">
        <article className="brief-card">
          <div className="eyebrow">Operator briefing · {phase}</div>
          <div className="brief-doctrine">{brief.doctrine}</div>
          <div className="brief-grid">
            <div className="brief-detail"><span>Today's challenge</span><strong>{brief.challenge}</strong></div>
            <div className="brief-detail"><span>Why it matters</span><strong>{brief.family}</strong></div>
          </div>
        </article>
        <article className="verse-card brief-card">
          <div><div className="eyebrow">Word for today</div><div className="verse-ref">{verse.ref}</div><div className="verse-text">“{verse.text}”</div></div>
          <div className="verse-meta">Let scripture set the standard. Let execution prove it.</div>
        </article>
      </section>

      <section className="mission-row">
        <article className="mission-card">
          <div className="eyebrow">The mission</div>
          <h1 className="mission-title">Build a life your family can rely on.</h1>
          <p className="mission-copy">Build dependable cash flow. Build assets that compound. Build the discipline required to protect both. Cornerstone exists to turn those intentions into repeated, measurable execution.</p>
        </article>
        <article className="mission-side">
          <div className="mission-side-label">Today's order</div>
          <div className="mission-phase">{phase}</div>
          <div className="mission-phase-title">{phaseTitle}</div>
          <div className="mission-action"><strong>Next:</strong> {brief.action}</div>
        </article>
      </section>

      <section className="score-card" aria-label="Execution score">
        <div className="score-head"><strong>{streak}</strong><span>day execution streak</span></div>
        <div className="metric is-focus"><span>standard</span><strong>Cash → Assets</strong></div>
        <div className="metric"><span>position</span><strong>{dayWon ? "Won today" : "Open"}</strong></div>
        <div className="metric"><span>daily command</span><strong>{index + 1}</strong></div>
        <button className={`score-cta${dayWon ? " done" : ""}`} disabled={dayWon} onClick={markWon}>{dayWon ? "Today won" : "Mark day won"}</button>
      </section>

      <section className="operator-shell"><OperatorCommandStrip /></section>

      <section className="destination-shell">
        <div className="destination-heading"><span>Primary workspaces</span><strong>Press 2 / 3 to jump on desktop</strong></div>
        <div className="destination-grid">
          <DestinationCard priority="01" title="Track A" descriptor="Cash engine" copy="Dealer outreach, samples, diagnostics and pilots. The fastest path to money." href={CRM_URL} external accent="var(--track-a)" />
          <DestinationCard priority="02" title="Track B" descriptor="Compounding engine" copy="Content, distribution, offers and production. Build what keeps working." href="/creative" accent="var(--track-b)" />
          <DestinationCard priority="03" title="New Life" descriptor="Personal operating system" copy="Identity, habits and the standard behind the work." href={NEW_LIFE_URL} external accent="var(--new-life)" />
        </div>
      </section>
    </div>
  </div>;
}
