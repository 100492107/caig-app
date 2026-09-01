import React from "react";

const destinations = [
  { title: "Track A", href: "https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/", icon: "↗", accent: "#6f8cff", external: true },
  { title: "Track B", href: "/creative", icon: "✦", accent: "#d4af37", external: false },
  { title: "New Life", href: "https://new-life-game-alpha.vercel.app/start-v2.html", icon: "◒", accent: "#bb8cff", external: true },
];

function Card({ item, index }) {
  return (
    <a
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noreferrer" : undefined}
      className="enterprise-card"
      style={{ "--accent": item.accent, "--delay": `${index * 70}ms` }}
    >
      <span className="enterprise-card-sheen" />
      <span className="enterprise-card-glow" />

      <span className="enterprise-card-top">
        <span className="enterprise-card-index">0{index + 1}</span>
        <span className="enterprise-card-arrow">{item.external ? "↗" : "→"}</span>
      </span>

      <span className="enterprise-card-middle">
        <span className="enterprise-icon-wrap">
          <span className="enterprise-icon">{item.icon}</span>
        </span>
      </span>

      <span className="enterprise-card-bottom">
        <span className="enterprise-card-title">{item.title}</span>
        <span className="enterprise-card-open">
          <span>Open</span>
          <span aria-hidden="true">{item.external ? "↗" : "→"}</span>
        </span>
      </span>
    </a>
  );
}

export default function EnterpriseHome() {
  return (
    <div className="enterprise-shell">
      <style>{`
        .enterprise-shell{min-height:100vh;width:100%;background:#07090d;color:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,system-ui,sans-serif;padding:28px clamp(22px,4.5vw,72px) 64px;display:flex;justify-content:center}
        .enterprise-wrap{width:100%;max-width:1480px;margin:0 auto;display:flex;flex-direction:column;min-height:calc(100vh - 92px)}
        .enterprise-header{display:flex;align-items:center;justify-content:space-between;min-height:52px}
        .enterprise-brand{display:flex;align-items:center;gap:15px}
        .enterprise-mark{width:50px;height:50px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,#e8c762,#9f7628);color:#151109;font-weight:950;font-size:23px;box-shadow:0 10px 30px rgba(212,175,55,.14)}
        .enterprise-name{font-size:20px;font-weight:850;letter-spacing:-.03em}
        .enterprise-status{width:8px;height:8px;border-radius:50%;background:#6fcaa5;box-shadow:0 0 20px rgba(111,202,165,.6)}
        .enterprise-main{display:flex;flex:1;flex-direction:column;justify-content:center;padding:clamp(58px,8vh,92px) 0 18px}
        .enterprise-hero{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:clamp(46px,6vh,72px)}
        .enterprise-kicker{margin-bottom:15px;color:#66707f;font-size:9px;letter-spacing:.24em;text-transform:uppercase;font-weight:900}
        .enterprise-title{margin:0;max-width:1100px;font-size:clamp(54px,6vw,92px);line-height:.91;letter-spacing:-.075em;font-weight:900;text-wrap:balance}
        .enterprise-subtitle{display:none}
        .enterprise-grid{width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
        .enterprise-card{position:relative;min-height:390px;padding:24px;border-radius:28px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;color:#f5f6f8;text-decoration:none;background:linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.018));border:1px solid rgba(255,255,255,.08);box-shadow:0 24px 80px rgba(0,0,0,.24),inset 0 1px rgba(255,255,255,.03);transform:translateY(0);transition:transform .28s cubic-bezier(.2,.7,.2,1),border-color .28s ease,box-shadow .28s ease,background .28s ease}
        .enterprise-card:hover{transform:translateY(-8px);border-color:color-mix(in srgb,var(--accent) 55%,white 10%);background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.02));box-shadow:0 34px 100px rgba(0,0,0,.34),0 0 0 1px color-mix(in srgb,var(--accent) 12%,transparent),inset 0 1px rgba(255,255,255,.04)}
        .enterprise-card:focus-visible{outline:2px solid color-mix(in srgb,var(--accent) 75%,white 25%);outline-offset:4px}
        .enterprise-card-sheen{position:absolute;inset:0;background:linear-gradient(125deg,transparent 18%,rgba(255,255,255,.045) 48%,transparent 78%);transform:translateX(-120%);transition:transform .65s ease;pointer-events:none}
        .enterprise-card:hover .enterprise-card-sheen{transform:translateX(120%)}
        .enterprise-card-glow{position:absolute;right:-20%;bottom:-24%;width:370px;height:370px;border-radius:50%;background:var(--accent);opacity:.105;filter:blur(34px);pointer-events:none;transition:opacity .3s ease,transform .3s ease}
        .enterprise-card:hover .enterprise-card-glow{opacity:.16;transform:scale(1.08)}
        .enterprise-card-top,.enterprise-card-bottom{position:relative;display:flex;align-items:center;justify-content:space-between}
        .enterprise-card-index{color:#596272;font-size:10px;font-weight:800;letter-spacing:.18em}
        .enterprise-card-arrow{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.06);color:#8a94a3;font-size:17px;transition:transform .25s ease,color .25s ease,background .25s ease}
        .enterprise-card:hover .enterprise-card-arrow{transform:translate(2px,-2px);color:#fff;background:rgba(255,255,255,.07)}
        .enterprise-card-middle{position:relative;display:flex;align-items:center;justify-content:center;flex:1}
        .enterprise-icon-wrap{width:118px;height:118px;border-radius:34px;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--accent) 20%,white 2%),color-mix(in srgb,var(--accent) 5%,transparent) 62%,transparent 63%);border:1px solid color-mix(in srgb,var(--accent) 23%,rgba(255,255,255,.08));box-shadow:inset 0 1px rgba(255,255,255,.08),0 18px 45px color-mix(in srgb,var(--accent) 10%,transparent);transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease}
        .enterprise-card:hover .enterprise-icon-wrap{transform:scale(1.045);border-color:color-mix(in srgb,var(--accent) 38%,rgba(255,255,255,.08));box-shadow:inset 0 1px rgba(255,255,255,.1),0 22px 58px color-mix(in srgb,var(--accent) 17%,transparent)}
        .enterprise-icon{color:var(--accent);font-size:50px;line-height:1;font-weight:900;filter:drop-shadow(0 7px 18px color-mix(in srgb,var(--accent) 20%,transparent))}
        .enterprise-card-title{font-size:clamp(31px,2.5vw,42px);letter-spacing:-.055em;font-weight:900}
        .enterprise-card-open{display:flex;align-items:center;gap:8px;color:#6f7888;font-size:11px;font-weight:800;letter-spacing:.01em;transition:color .25s ease}
        .enterprise-card:hover .enterprise-card-open{color:#dfe3e8}
        .enterprise-card-open span:last-child{font-size:15px;color:#8992a1}
        @media(max-width:900px){
          .enterprise-shell{padding:22px 18px 44px}
          .enterprise-wrap{min-height:calc(100vh - 66px)}
          .enterprise-name{font-size:17px}
          .enterprise-main{padding-top:54px}
          .enterprise-title{font-size:clamp(50px,12vw,74px)}
          .enterprise-grid{grid-template-columns:1fr;max-width:700px;margin:0 auto}
          .enterprise-card{min-height:245px}
          .enterprise-icon-wrap{width:84px;height:84px;border-radius:25px}
          .enterprise-icon{font-size:35px}
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

        <main className="enterprise-main">
          <section className="enterprise-hero">
            <div className="enterprise-kicker">Enterprise</div>
            <h1 className="enterprise-title">Cornerstone AI Enterprise</h1>
          </section>

          <div className="enterprise-grid">
            {destinations.map((item, index) => <Card key={item.title} item={item} index={index} />)}
          </div>
        </main>
      </div>
    </div>
  );
}
