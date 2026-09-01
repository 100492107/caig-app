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
        .enterprise-shell{min-height:100vh;width:100%;background:#07090d;color:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,system-ui,sans-serif;padding:28px clamp(22px,4.5vw,72px) 64px;display:flex;justify-content:center}
        .enterprise-wrap{width:100%;max-width:1480px;margin:0 auto}
        .enterprise-header{display:flex;align-items:center;justify-content:space-between;min-height:52px;margin-bottom:clamp(72px,8vh,108px)}
        .enterprise-brand{display:flex;align-items:center;gap:15px}
        .enterprise-mark{width:50px;height:50px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,#e8c762,#9f7628);color:#151109;font-weight:950;font-size:23px;box-shadow:0 10px 30px rgba(212,175,55,.14)}
        .enterprise-name{font-size:20px;font-weight:850;letter-spacing:-.03em}
        .enterprise-status{width:8px;height:8px;border-radius:50%;background:#6fcaa5;box-shadow:0 0 20px rgba(111,202,165,.6)}
        .enterprise-main{width:100%}
        .enterprise-hero{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:clamp(58px,7vh,92px)}
        .enterprise-kicker{margin-bottom:16px;color:#707988;font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:900}
        .enterprise-title{margin:0;max-width:1120px;font-size:clamp(52px,6vw,92px);line-height:.91;letter-spacing:-.072em;font-weight:900;text-wrap:balance}
        .enterprise-subtitle{margin:22px 0 0;max-width:700px;color:#737d8d;font-size:15px;line-height:1.55}
        .enterprise-grid{width:100%;max-width:1460px;margin:0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
        .enterprise-card{position:relative;min-height:360px;padding:30px;border-radius:30px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;color:#f5f6f8;text-decoration:none;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018));border:1px solid rgba(255,255,255,.085);box-shadow:0 26px 80px rgba(0,0,0,.25);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}
        .enterprise-card:hover{transform:translateY(-6px);border-color:color-mix(in srgb,var(--accent) 42%,white 5%);box-shadow:0 34px 96px rgba(0,0,0,.34)}
        .enterprise-glow{position:absolute;right:-12%;bottom:-25%;width:340px;height:340px;border-radius:50%;background:var(--accent);opacity:.095;filter:blur(28px);pointer-events:none}
        .enterprise-icon{position:relative;width:60px;height:60px;border-radius:18px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 10%,transparent);border:1px solid color-mix(in srgb,var(--accent) 29%,transparent);color:var(--accent);font-size:27px;font-weight:900}
        .enterprise-arrow{position:absolute;right:28px;top:28px;width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:rgba(255,255,255,.045);color:#7f8897;font-size:17px}
        .enterprise-card-title{position:relative;font-size:clamp(34px,3vw,48px);letter-spacing:-.055em;font-weight:900}
        @media(max-width:900px){
          .enterprise-shell{padding:22px 18px 48px}
          .enterprise-header{margin-bottom:64px}
          .enterprise-name{font-size:17px}
          .enterprise-title{font-size:clamp(48px,12vw,72px)}
          .enterprise-grid{grid-template-columns:1fr;max-width:680px;gap:16px}
          .enterprise-card{min-height:240px}
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
            <p className="enterprise-subtitle">One place for the systems, creative tools and products you're building.</p>
          </section>

          <div className="enterprise-grid">
            {destinations.map((item) => <Card key={item.title} item={item} />)}
          </div>
        </main>
      </div>
    </div>
  );
}
