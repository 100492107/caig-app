import React from "react";
import App from "./App.jsx";

export default function MainAppShell() {
  return (
    <>
      <App />
      <a
        href="/"
        aria-label="Back to Cornerstone app home"
        style={{
          position: "fixed",
          top: 14,
          right: 16,
          zIndex: 9999,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 12px",
          borderRadius: 9,
          border: "1px solid rgba(255,255,255,.12)",
          background: "rgba(10,11,17,.92)",
          color: "#dbe1ea",
          textDecoration: "none",
          font: "700 11px Inter, system-ui, sans-serif",
          boxShadow: "0 8px 24px rgba(0,0,0,.25)",
          backdropFilter: "blur(10px)",
        }}
      >
        ← Home
      </a>
    </>
  );
}
