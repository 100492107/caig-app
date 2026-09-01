import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const STALE_AFTER_MS = 15000;

export default function LocalAIStatus({ compact = false }) {
  const [worker, setWorker] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data, error: queryError } = await supabase
        .from("local_ai_worker_heartbeat")
        .select("status,last_seen,model,current_job_id,current_job_type,hostname")
        .eq("id", "qwen")
        .maybeSingle();
      if (!mounted) return;
      if (queryError) {
        setError(queryError.message || "Status unavailable");
        return;
      }
      setWorker(data || null);
      setError("");
    }
    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const computed = useMemo(() => {
    const fresh = worker?.last_seen ? Date.now() - new Date(worker.last_seen).getTime() < STALE_AFTER_MS : false;
    if (!fresh || !worker) return { key: "offline", label: "Offline", detail: error ? "Status unavailable" : "Start Qwen on your Mac" };
    if (worker.status === "busy") return { key: "busy", label: "Busy", detail: worker.current_job_type ? `Processing ${worker.current_job_type}` : "Processing a job" };
    return { key: "online", label: "Online", detail: "Mac Qwen ready" };
  }, [worker, error]);

  return (
    <div className={`tb-ai-status is-${computed.key}${compact ? " is-compact" : ""}`} title={`${computed.label} · ${computed.detail}`} aria-label={`Local AI ${computed.label}. ${computed.detail}`}>
      <span className="tb-ai-dot" aria-hidden="true" />
      <span className="tb-ai-copy">
        <strong>Local AI</strong>
        <span>{computed.label}</span>
      </span>
      {!compact && <span className="tb-ai-detail">{computed.detail}</span>}
    </div>
  );
}
