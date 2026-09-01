import React from "react";

const destinations = [
  { title: "Track A", meta: "Revenue", href: "https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/", icon: "↗", accent: "var(--track-a)", external: true },
  { title: "Track B", meta: "Creative Station", href: "/creative", icon: "✦", accent: "var(--track-b)", external: false },
  { title: "New Life", meta: "Game", href: "https://new-life-game-alpha.vercel.app/start-v2.html", icon: "◒", accent: "#9b8bb8", external: true },
];

function Card({ item, index }) {
  return (
    <a href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined} className="enterprise-card" style={{ "--accent": item.accent }}>
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
        </span>
        <span className="enterprise-card-open">Open <span aria-hidden="true">{item.external ? "↗" : "→"}</span></span>
      </span>
    </a>
  );
}

export default function EnterpriseHome() {
  return (
    <div className="enterprise-shell">
      <style>{`
        .enterprise-shell{min-height:100svh;width:100%;background:var(--bg);color:var(--text);font-family:var(--sans);padding:28px clamp(22px,4.5vw,72px) 52px;box-sizing:border-box}
        .enterprise-wrap{width:100%;max-width:1440px;min-height:calc(100svh - 80px);margin:0 auto;display:flex;flex-direction:column}
        .enterprise-header{display:flex;align-items:center;justify-content:space-between;min-height:52px}
        .enterprise-brand{display:flex;align-items:center;gap:14px}
        .enterprise-mark{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:#d9d6ca;color:#111315;font-weight:900;font-size:22px;box-shadow:0 12px 34px rgba(0,0,0,.22)}
        .enterprise-name{font-size:19px;font-weight:720;letter-spacing:-.025em;color:#ecece8}
        .enterprise-status{width:7px;height:7px;border-radius:50%;background:var(--success);box-shadow:0 0 16px rgba(111,155,122,.5)}
        .enterprise-main{flex:1;display:flex;flex-direction:column;justify-content:center;padding:clamp(58px,7vh,96px) 0 12px}
        .enterprise-hero{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:clamp(44px,6vh,66px)}
        .enterprise-kicker{margin-bottom:13px;color:var(--text-subtle);font-size:9px;letter-spacing:.24em;text-transform:uppercase;font-weight:700}
        .enterprise-title{margin:0;max-width:980px;font-size:clamp(52px,6vw,90px);line-height:.93;letter-spacing:-.07em;font-weight:820;text-wrap:balance}
        .enterprise-grid{width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
        .enterprise-card{position:relative;min-height:330px;padding:24px;border-radius:24px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;color:var(--text);text-decoration:none;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow);transition:transform .24s ease,border-color .24s ease,box-shadow .24s ease,background .24s ease}
        .enterprise-card:hover{transform:translateY(-5px);background:var(--surface-2);border-color:rgba(255,255,255,.12);box-shadow:0 30px 80px rgba(0,0,0,.28)}
        .enterprise-card:focus-visible{outline:2px solid color-mix(in srgb,var(--accent) 72%,white 28%);outline-offset:4px}
        .enterprise-card:before{content:"";position:absolute;inset:auto -10% -38% auto;width:300px;height:300px;border-radius:50%;background:var(--accent);opacity:.06;filter:blur(28px);pointer-events:none;transition:opacity .24s ease,transform .24s ease}
        .enterprise-card:hover:before{opacity:.10;transform:scale(1.06)}
        .enterprise-card-top,.enterprise-card-bottom{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
        .enterprise-card-index{color:var(--text-subtle);font-size:9px;font-weight:700;letter-spacing:.18em}
        .enterprise-card-arrow{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.035);border:1px solid var(--border);color:#8b929c;font-size:16px;transition:transform .2s ease,color .2s ease}
        .enterprise-card:hover .enterprise-card-arrow{transform:translate(2px,-2px);color:var(--text)}
        .enterprise-card-middle{position:relative;display:flex;justify-content:center;align-items:center;flex:1}
        .enterprise-icon-wrap{width:94px;height:94px;border-radius:28px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 28%,var(--border));background:color-mix(in srgb,var(--accent) 7%,var(--surface));box-shadow:inset 0 1px rgba(255,255,255,.04)}
        .enterprise-icon{color:var(--accent);font-size:38px;font-weight:850;line-height:1}
        .enterprise-card-meta{display:block;margin-bottom:6px;color:var(--text-subtle);font-size:9px;font-weight:750;letter-spacing:.14em;text-transform:uppercase}
        .enterprise-card-title{display:block;font-size:clamp(30px,2.35vw,40px);letter-spacing:-.05em;font-weight:820}
        .enterprise-card-open{padding-top:22px;color:var(--text-muted);font-size:10px;font-weight:700;white-space:nowrap;transition:color .2s ease}
        .enterprise-card:hover .enterprise-card-open{color:var(--text)}
        .enterprise-card-open span{padding-left:5px;font-size:14px}
        @media(max-width:900px){
          .enterprise-shell{padding:20px 18px 40px}.enterprise-wrap{min-height:calc(100svh - 60px)}
          .enterprise-name{font-size:17px}.enterprise-main{padding-top:48px}.enterprise-title{font-size:clamp(48px,12vw,72px)}
          .enterprise-grid{grid-template-columns:1fr;max-width:680px;margin:0 auto}.enterprise-card{min-height:220px}
          .enterprise-icon-wrap{width:76px;height:76px;border-radius:23px}.enterprise-icon{font-size:30px}
        }
      `}</style>
      <div className="enterprise-wrap">
        <header className="enterprise-header">
          <div className="enterprise-brand"><span className="enterprise-mark">C</span><span className="enterprise-name">Cornerstone AI Enterprise</span></div>
          <span className="enterprise-status" aria-label="Online" />
        </header>
        <main className="enterprise-main">
          <section className="enterprise-hero"><div className="enterprise-kicker">Enterprise</div><h1 className="enterprise-title">Cornerstone AI Enterprise</h1></section>
          <div className="enterprise-grid">{destinations.map((item, index) => <Card key={item.title} item={item} index={index} />)}</div>
        </main>
      </div>
    </div>
  );
}
