import React, { useMemo } from "react";
import { getTodaysVerse } from "./dailyScripture.js";

const CRM_URL = "https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/";
const NEW_LIFE_URL = "https://new-life-game-alpha.vercel.app/start-v2.html";

const DAILY_PRESSURE = [
  { headline: "Your family gets the result of today’s work.", support: "Not the plan. Not the intention. The result.", challenge: "Make today count. Do the work that changes your position." },
  { headline: "You do not need another plan. You need a serious day.", support: "Pick the work that matters and stay with it.", challenge: "No busywork before the important work is moving." },
  { headline: "The life you want is paid for with the work you do today.", support: "Freedom comes later. The standard is today.", challenge: "Earn the next step by executing this one." },
  { headline: "Stop waiting to feel ready.", support: "You already know enough to start.", challenge: "Turn the next hour into measurable progress." },
  { headline: "Hard work first. Everything else can wait.", support: "Your attention is worth more than another distraction.", challenge: "Get one important result before you give your attention away." },
  { headline: "Build the future by winning the day.", support: "Cash. Assets. Discipline. Repeated.", challenge: "Do the work that makes tomorrow easier and stronger." },
  { headline: "Potential does not pay. Output does.", support: "Make something happen today.", challenge: "Leave evidence behind before you stop." },
  { headline: "Do not make your future compete with your comfort.", support: "Choose the useful thing.", challenge: "Take the harder action while you still have the energy." },
  { headline: "One serious day can change the direction of a month.", support: "Treat today like it matters.", challenge: "Protect the next focused block and use it properly." },
  { headline: "Your standard is visible in what you finish.", support: "Execution is character made visible.", challenge: "Finish something that matters before you open another loop." },
  { headline: "Make money. Build assets. Strengthen the man doing both.", support: "That is the order.", challenge: "Start with the highest-value action in front of you." },
  { headline: "Do not let another day become preparation for the life you want.", support: "Today is part of the build.", challenge: "Move the business. Move yourself. Leave evidence." },
  { headline: "You are not here to be busy. You are here to build.", support: "Useful work beats impressive intentions.", challenge: "Pick one outcome and make it real." },
  { headline: "Pressure is useful when it becomes action.", support: "Do not carry it. Convert it.", challenge: "Turn urgency into one completed result now." },
  { headline: "Finish the thing you keep avoiding.", support: "That is probably where the growth is.", challenge: "Do it before the easier work gets a chance to distract you." },
  { headline: "Work like the future depends on your consistency.", support: "Because it does.", challenge: "Give the next block your full attention." },
  { headline: "The scoreboard only moves when you move it.", support: "No waiting. No pretending.", challenge: "Create a real business result today." },
  { headline: "Earn your confidence through action.", support: "Do first. Review after.", challenge: "Take the obvious next step without overthinking it." },
  { headline: "A better life requires better days.", support: "Start with this one.", challenge: "Make today a day you can point to." },
  { headline: "Do the work now so your family has more choices later.", support: "That is the bigger game.", challenge: "Use your best hours on work that creates value." },
  { headline: "Do not waste a good morning on low-value work.", support: "Protect the hours that can change the picture.", challenge: "Cash first. Then build." },
  { headline: "The work does not become easier because you postpone it.", support: "Start while it is still uncomfortable.", challenge: "Get the hard thing moving." },
  { headline: "You have enough ideas. Now produce.", support: "Less thinking about it. More evidence of it.", challenge: "Ship something useful today." },
  { headline: "Your future business is being built in ordinary hours.", support: "Treat them like they matter.", challenge: "Make this next hour count." },
  { headline: "Consistency beats the occasional heroic day.", support: "Build the standard you can repeat.", challenge: "Do today’s work properly." },
  { headline: "Do not quit on a day that could compound.", support: "One more useful action matters.", challenge: "Create one more opportunity before you finish." },
  { headline: "The goal is freedom. The mechanism is disciplined work.", support: "There is no shortcut around the mechanism.", challenge: "Execute the next useful step." },
  { headline: "Make today too productive to regret.", support: "You can rest after the important work is done.", challenge: "Start with the highest-impact task." },
  { headline: "Leave tonight with proof that you moved forward.", support: "Something should be different because you worked today.", challenge: "Make that change before the day closes." },
  { headline: "Do the work your future self will thank you for.", support: "Not the work that merely feels easy now.", challenge: "Choose the action with the biggest useful consequence." },
];

function dayIndex(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000);
}

function phaseForHour(hour) {
  if (hour < 13) return { label: "CASH FIRST", title: "Move money before you build more." };
  if (hour < 18) return { label: "BUILD SECOND", title: "Turn the work into an asset." };
  return { label: "FINISH STRONG", title: "Leave evidence behind tonight." };
}

function WorkspaceCard({ number, name, label, description, href, external, tone, action }) {
  return (
    <a className={`home-engine home-engine-${tone}`} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
      <div className="home-engine-top">
        <span className="home-engine-number">0{number}</span>
        <span className="home-engine-arrow" aria-hidden="true">{external ? "↗" : "→"}</span>
      </div>
      <div>
        <div className="home-engine-name">{name}</div>
        <div className="home-engine-label">{label}</div>
        <p>{description}</p>
      </div>
      <div className="home-engine-action">{action} <span aria-hidden="true">{external ? "↗" : "→"}</span></div>
    </a>
  );
}

export default function EnterpriseCommandHome() {
  const now = new Date();
  const hour = now.getHours();
  const pressure = DAILY_PRESSURE[dayIndex(now) % DAILY_PRESSURE.length];
  const phase = phaseForHour(hour);
  const verse = useMemo(() => getTodaysVerse(), []);

  const primary = hour < 13
    ? { href: CRM_URL, external: true, label: "START TRACK A" }
    : { href: "/creative", external: false, label: "START TRACK B" };

  return (
    <main className="enterprise-home-v3">
      <style>{`
        .enterprise-home-v3{min-height:100svh;width:100%;background:var(--bg);color:var(--text);font-family:var(--sans);padding:16px clamp(14px,2.4vw,42px) 40px}
        .home-v3-shell{width:100%;max-width:none;margin:0 auto}
        .home-v3-header{min-height:54px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:18px}
        .home-v3-brand{display:flex;align-items:center;gap:11px;min-width:0}
        .home-v3-mark{width:38px;height:38px;border-radius:11px;background:#ddd9cc;color:#141516;display:grid;place-items:center;font-weight:900;flex:0 0 38px}
        .home-v3-name{font-size:15px;font-weight:790;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .home-v3-right{display:flex;align-items:center;gap:18px}
        .home-v3-nav{display:flex;align-items:center;gap:3px}
        .home-v3-nav a{display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:9px;color:var(--text-muted);text-decoration:none;font-size:10px;font-weight:780;transition:background .16s ease,color .16s ease}
        .home-v3-nav a:hover{background:var(--surface);color:var(--text)}
        .home-v3-nav a:nth-child(1) b{color:var(--track-a)}
        .home-v3-nav a:nth-child(2) b{color:var(--track-b)}
        .home-v3-nav a:nth-child(3) b{color:var(--new-life)}
        .home-v3-nav small{font-size:7px;letter-spacing:.13em;text-transform:uppercase;color:var(--text-subtle);font-weight:760}
        .home-v3-nav b{font-size:12px;font-weight:700}
        .home-v3-online{display:flex;align-items:center;gap:7px;color:var(--text-subtle);font-size:7px;letter-spacing:.15em;text-transform:uppercase;font-weight:780}
        .home-v3-online i{width:6px;height:6px;border-radius:50%;background:var(--success);display:block}

        .home-v3-hero{margin-top:28px;display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,.45fr);gap:26px;align-items:stretch}
        .home-v3-hero-main{min-height:430px;padding:clamp(28px,4vw,58px);border:1px solid var(--word-border);border-radius:20px;background:linear-gradient(145deg,color-mix(in srgb,var(--word) 8%,var(--surface)),var(--surface) 65%);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;position:relative}
        .home-v3-hero-main:after{content:"";position:absolute;width:420px;height:420px;right:-210px;bottom:-250px;border-radius:50%;background:var(--word);opacity:.06;filter:blur(4px);pointer-events:none}
        .home-v3-kicker{font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:var(--word);font-weight:840}
        .home-v3-headline{margin:18px 0 0;max-width:18ch;font-size:clamp(46px,6vw,92px);line-height:.90;letter-spacing:-.07em;font-weight:880;color:var(--text-h)}
        .home-v3-support{margin:22px 0 0;max-width:62ch;font-size:clamp(15px,1.5vw,21px);line-height:1.45;color:#d0d1cc;font-weight:560}
        .home-v3-hero-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:26px;margin-top:42px;position:relative;z-index:1}
        .home-v3-challenge{max-width:680px}
        .home-v3-challenge span{display:block;font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:var(--text-subtle);font-weight:820}
        .home-v3-challenge strong{display:block;margin-top:8px;font-size:14px;line-height:1.45;color:var(--text)}
        .home-v3-cta{flex:0 0 auto;min-height:48px;padding:0 18px;border:1px solid var(--border-strong);border-radius:11px;background:#ddd9cc;color:#141516;text-decoration:none;display:flex;align-items:center;gap:10px;font-size:11px;font-weight:850;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.16)}
        .home-v3-cta span{font-size:16px}

        .home-v3-mission{min-height:430px;padding:28px 26px;border:1px solid var(--border);border-radius:20px;background:var(--surface);display:flex;flex-direction:column;justify-content:space-between}
        .home-v3-mission-label{font-size:8px;letter-spacing:.20em;text-transform:uppercase;color:var(--text-subtle);font-weight:820}
        .home-v3-mission-title{margin-top:14px;font-size:30px;line-height:1.02;letter-spacing:-.055em;font-weight:850}
        .home-v3-standard{margin-top:28px;padding-top:18px;border-top:1px solid var(--border)}
        .home-v3-standard-label{font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-subtle);font-weight:820}
        .home-v3-standard-value{margin-top:8px;font-size:17px;font-weight:820;color:var(--word)}
        .home-v3-verse{padding-top:20px;border-top:1px solid var(--border)}
        .home-v3-verse-ref{font-size:9px;color:var(--word);font-weight:800}
        .home-v3-verse-text{margin-top:7px;font-size:12px;line-height:1.5;color:var(--text-muted)}

        .home-v3-engines{margin-top:26px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .home-engine{min-height:240px;padding:21px 22px;border:1px solid var(--border);border-radius:17px;background:var(--surface);display:flex;flex-direction:column;justify-content:space-between;text-decoration:none;color:var(--text);transition:transform .18s ease,border-color .18s ease,background .18s ease}
        .home-engine:hover{transform:translateY(-2px);background:var(--surface-2)}
        .home-engine-a:hover{border-color:color-mix(in srgb,var(--track-a) 35%,var(--border))}
        .home-engine-b:hover{border-color:color-mix(in srgb,var(--track-b) 35%,var(--border))}
        .home-engine-life:hover{border-color:color-mix(in srgb,var(--new-life) 35%,var(--border))}
        .home-engine-top{display:flex;justify-content:space-between;align-items:center}
        .home-engine-number{font-size:8px;letter-spacing:.16em;color:var(--text-subtle);font-weight:820}
        .home-engine-arrow{width:31px;height:31px;border:1px solid var(--border);border-radius:9px;display:grid;place-items:center;font-size:13px}
        .home-engine-a .home-engine-arrow{color:var(--track-a)}
        .home-engine-b .home-engine-arrow{color:var(--track-b)}
        .home-engine-life .home-engine-arrow{color:var(--new-life)}
        .home-engine-name{margin-top:32px;font-size:30px;line-height:1;letter-spacing:-.055em;font-weight:850}
        .home-engine-label{margin-top:8px;font-size:8px;letter-spacing:.17em;text-transform:uppercase;color:var(--text-subtle);font-weight:820}
        .home-engine p{margin:12px 0 0;max-width:40ch;color:var(--text-muted);font-size:11px;line-height:1.5}
        .home-engine-action{margin-top:20px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:9px;font-weight:820;text-transform:uppercase;letter-spacing:.12em;color:var(--text-muted)}

        .home-v3-footer{margin-top:26px;padding-top:15px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;color:var(--text-subtle);font-size:8px;letter-spacing:.12em;text-transform:uppercase;font-weight:780}
        .home-v3-footer strong{color:var(--text-muted)}

        @media(max-width:900px){
          .home-v3-right{gap:10px}
          .home-v3-nav small{display:none}
          .home-v3-hero{grid-template-columns:1fr;gap:12px}
          .home-v3-hero-main,.home-v3-mission{min-height:auto}
          .home-v3-hero-main{padding:26px;min-height:390px}
          .home-v3-mission{min-height:260px;padding:24px}
          .home-v3-engines{grid-template-columns:1fr;gap:10px}
          .home-engine{min-height:155px}
          .home-engine-name{margin-top:18px;font-size:27px}
        }
        @media(max-width:600px){
          .enterprise-home-v3{padding:10px 12px calc(24px + env(safe-area-inset-bottom))}
          .home-v3-header{min-height:50px}
          .home-v3-mark{width:34px;height:34px;flex-basis:34px}
          .home-v3-name{font-size:13px}
          .home-v3-nav{display:none}
          .home-v3-online{font-size:7px}
          .home-v3-hero{margin-top:18px}
          .home-v3-hero-main{min-height:460px;padding:24px 20px;border-radius:17px}
          .home-v3-headline{font-size:clamp(44px,13vw,64px);max-width:12ch}
          .home-v3-support{font-size:15px;max-width:32ch}
          .home-v3-hero-bottom{display:block;margin-top:30px}
          .home-v3-challenge strong{font-size:13px}
          .home-v3-cta{width:100%;justify-content:center;margin-top:18px;min-height:50px}
          .home-v3-mission{min-height:235px;padding:22px;border-radius:17px}
          .home-v3-mission-title{font-size:27px}
          .home-v3-standard{margin-top:20px}
          .home-v3-verse{padding-top:18px}
          .home-v3-engines{margin-top:18px}
          .home-engine{min-height:132px;padding:17px 18px;border-radius:15px}
          .home-engine-name{font-size:25px}
          .home-engine p{font-size:10px;margin-top:8px}
          .home-engine-action{margin-top:13px;padding-top:11px}
          .home-v3-footer{margin-top:18px;display:block;line-height:1.7}
        }
      `}</style>

      <div className="home-v3-shell">
        <header className="home-v3-header">
          <div className="home-v3-brand"><span className="home-v3-mark">C</span><span className="home-v3-name">Cornerstone AI Enterprise</span></div>
          <div className="home-v3-right">
            <nav className="home-v3-nav" aria-label="Primary workspaces">
              <a href={CRM_URL} target="_blank" rel="noreferrer"><span>Track A</span><small>Money</small><b>↗</b></a>
              <a href="/creative"><span>Track B</span><small>Build</small><b>→</b></a>
              <a href={NEW_LIFE_URL} target="_blank" rel="noreferrer"><span>New Life</span><small>Standard</small><b>↗</b></a>
            </nav>
            <div className="home-v3-online"><i /> online</div>
          </div>
        </header>

        <section className="home-v3-hero">
          <article className="home-v3-hero-main">
            <div>
              <div className="home-v3-kicker">{phase.label} · TODAY</div>
              <h1 className="home-v3-headline">{pressure.headline}</h1>
              <p className="home-v3-support">{pressure.support}</p>
            </div>
            <div className="home-v3-hero-bottom">
              <div className="home-v3-challenge"><span>Today’s order</span><strong>{phase.title} {pressure.challenge}</strong></div>
              <a className="home-v3-cta" href={primary.href} target={primary.external ? "_blank" : undefined} rel={primary.external ? "noreferrer" : undefined}>{primary.label} <span aria-hidden="true">→</span></a>
            </div>
          </article>

          <aside className="home-v3-mission">
            <div>
              <div className="home-v3-mission-label">The mission</div>
              <div className="home-v3-mission-title">Build a life your family can rely on.</div>
              <div className="home-v3-standard"><div className="home-v3-standard-label">Standard</div><div className="home-v3-standard-value">Cash → Assets → Freedom</div></div>
            </div>
            <div className="home-v3-verse"><div className="home-v3-verse-ref">{verse.ref}</div><div className="home-v3-verse-text">“{verse.text}”</div></div>
          </aside>
        </section>

        <section className="home-v3-engines" aria-label="Primary workspaces">
          <WorkspaceCard number={1} name="Track A" label="Cash · Outreach" description="Create demand, move conversations, and get closer to money." href={CRM_URL} external tone="a" action="Open CRM" />
          <WorkspaceCard number={2} name="Track B" label="Build · Ship" description="Turn ideas into finished content, offers, and assets." href="/creative" tone="b" action="Open Station" />
          <WorkspaceCard number={3} name="New Life" label="Standard · Habits" description="Strengthen the routines and behaviour that support the whole system." href={NEW_LIFE_URL} external tone="life" action="Open New Life" />
        </section>

        <footer className="home-v3-footer"><span>Today: <strong>cash → assets → standards</strong></span><span>Work first. Review after.</span></footer>
      </div>
    </main>
  );
}
