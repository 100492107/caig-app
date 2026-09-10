import React from "react";
import "./appLanding.css";

export default function AppLanding() {
  return (
    <main className="app-launcher">
      <div className="app-launcher-card">
        <div className="app-kicker">CORNERSTONE AI GROUP</div>
        <h1>Where do you want to work?</h1>
        <p className="app-sub">Choose the workspace you need.</p>
        <div className="app-choice-grid">
          <a className="app-choice" href="/content/remake">
            <div className="app-choice-number">01</div>
            <div><h2>Content Engine</h2><p>Start from evidence, build an original package, produce, publish and measure.</p></div>
            <span>Open →</span>
          </a>
          <a className="app-choice" href="/content/creators">
            <div className="app-choice-number">02</div>
            <div><h2>Creators</h2><p>Open owned faces and voices for creator-led content workflows.</p></div>
            <span>Open →</span>
          </a>
        </div>
      </div>
    </main>
  );
}
