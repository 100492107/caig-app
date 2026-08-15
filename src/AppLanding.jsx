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
          <a className="app-choice" href="/creative">
            <div className="app-choice-number">01</div>
            <div>
              <h2>Creative Engine</h2>
              <p>Develop ideas, test hypotheses, create media, review and publish.</p>
            </div>
            <span>Open →</span>
          </a>
          <a className="app-choice" href="/main-app">
            <div className="app-choice-number">02</div>
            <div>
              <h2>Main App</h2>
              <p>Content Engine, UGC Centre, clients, review queue, calendar and operations.</p>
            </div>
            <span>Open →</span>
          </a>
        </div>
      </div>
    </main>
  );
}
