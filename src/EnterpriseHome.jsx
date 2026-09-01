import React from "react";

const destinations = [
  { title: "Track A", href: "https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/", icon: "↗", accent: "#6f8cff", external: true },
  { title: "Track B", href: "/creative", icon: "✦", accent: "#d4af37", external: false },
  { title: "New Life", href: "https://new-life-game-alpha.vercel.app/start-v2.html", icon: "◒", accent: "#bb8cff", external: true },
];

function Card({ item }) {
  return (
    <a
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noreferrer" : undefined}
      className="enterprise-card"
      style={{ "--accent": item.accent }}
    >
      <span className="enterprise-glow" />
      <span className="enterprise-icon">{item.icon}</span>
      <span className="enterprise-arrow">{item.external ? "↗" : "→"}</span>
      <span className="enterprise-card-title">{item.title}</span>
    </a>
  );
}

export default function EnterpriseHome() {
  return (
    <div className="enterprise-shell">
      <style>{`
        .enterprise-shell{min-height:100vh;background:#07090d;color:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,system-ui,sans-serif;padding:clamp(28px,6vw,76px) clamp(20px,5vw,64px)}
        .enterprise-wrap{max-width:1240px;margin:0 auto}
        .enterprise-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:clamp(54px,10vw,110px)}
        .enterprise-brand{display:flex;align-items:center;gap:13px}
        .enterprise-mark{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#e8c762,#9f7628);color:#151109;font-weight:950;font-size:20px;box-shadow:0 8px 28px rgba(212,175,55,.13)}
        .enterprise-name{font-size:18px;font-weight:850;letter-spacing:-.025em}
        .enterprise-status{width:7px;height:7px;border-radius:50%;background:#6fcaa5;box-shadow:0 0 18px rgba(111,202,165,.55)}
        .enterprise-title{margin:0 0 38px;font-size:clamp(42px,7vw,82px);line-height:.94;letter-spacing:-.065em;font-weight:860;max-width:820px}
        .enterprise-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
        .enterprise-card{position:relative;min-height:300px;padding:26px;border-radius:28px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;color:#f5f6f8;text-decoration:none;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018));border:1px solid rgba(255,255,255,.08);box-shadow:0 24px 70px rgba(0,0,0,.22);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}
        .enterprise-card:hover{transform:translateY(-5px);border-color:color-mix(in srgb,var(--accent) 45%,white 5%);box-shadow:0 30px 90px rgba(0,0,0,.32)}
        .enterprise-glow{position:absolute;right:-18%;bottom:-38%;width:280px;height:280px;border-radius:50%;background:var(--accent);opacity:.10;filter:blur(22px);pointer-events:none}
        .enterprise-icon{position:relative;width:54px;height:54px;border-radius:17px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 10%,transparent);border:1px solid color-mix(in srgb,var(--accent) 28%,transparent);color:var(--accent);font-size:24px;font-weight:900}
        .enterprise-arrow{position:absolute;right:25px;top:25px;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.045);color:#7f8897;font-size:16px}
        .enterprise-card-title{position:relative;font-size:35px;letter-spacing:-.045em;font-weight:850}
        @media(max-width:850px){.enterprise-grid{grid-template-columns:1fr}.enterprise-card{min-height:220px}.enterprise-header{margin-bottom:58px}.enterprise-title{font-size:clamp(40px,12vw,66px);margin-bottom:28px}}
      `}</style>
      <div className="enterprise-wrap">
        <header className="enterprise-header">
          <div className="enterprise-brand"><span className="enterprise-mark">C</span><span className="enterprise-name">Cornerstone AI Enterprise</span></div>
          <span className="enterprise-status" aria-label="Online" />
        </header>
        <main>
          <h1 className="enterprise-title">Cornerstone AI Enterprise</h1>
          <div className="enterprise-grid">{destinations.map((item) => <Card key={item.title} item={item} />)}</div>
        </main>
      </div>
    </div>
  );
}
