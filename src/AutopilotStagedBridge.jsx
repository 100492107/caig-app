import React, { useEffect } from "react";
import AutopilotCreativeEngine from "./AutopilotCreativeEngine.jsx";

const INTERNAL_STAGE = ["radar", "concepts", "production"];

export default function AutopilotStagedBridge({ stage = 0 }) {
  useEffect(() => {
    const target = INTERNAL_STAGE[Math.max(0, Math.min(stage, INTERNAL_STAGE.length - 1))];
    const id = window.setTimeout(() => {
      const root = document.querySelector(".tb-workspace-body");
      if (!root) return;
      const button = Array.from(root.querySelectorAll("button")).find((el) => {
        const text = String(el.textContent || "").trim().toLowerCase();
        return text === `${target}` || text === `${INTERNAL_STAGE.indexOf(target) + 1}. ${target}`;
      });
      button?.click();
    }, 30);
    return () => window.clearTimeout(id);
  }, [stage]);

  return <div className="autopilot-stage-bridge"><AutopilotCreativeEngine /></div>;
}
