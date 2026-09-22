import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QWEN_URL = process.env.QWEN_URL || "http://127.0.0.1:8000";
const QWEN_MODEL = process.env.QWEN_MODEL || "mlx-community/Qwen3.5-9B-4bit";
const POLL_MS = 2500;
const STALE_MS = 15 * 60 * 1000;

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase worker credentials are required.");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function cleanOutput(value) {
  return String(value || "").replace(/^\s*\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`\s*$/i, "").trim();
}

async function resolveModel(preferred) {
  try {
    const r = await fetch(QWEN_URL + "/v1/models", { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return preferred;
    const json = await r.json();
    const ids = Array.isArray(json?.data) ? json.data.map((x) => String(x?.id || "")) : [];
    return ids.includes(preferred) ? preferred : (ids.includes(QWEN_MODEL) ? QWEN_MODEL : (ids[0] || preferred));
  } catch {
    return preferred;
  }
}

async function callQwen(job) {
  const response = await fetch(QWEN_URL + "/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: await resolveModel(job.model || QWEN_MODEL),
      messages: [
        { role: "system", content: job.system_prompt || "You are Cornerstone Commerce Intelligence." },
        { role: "user", content: job.user_prompt || "" }
      ],
      temperature: Number(job.options?.temperature ?? 0.45),
      max_tokens: Math.max(1200, Math.min(Number(job.options?.max_tokens || 4200), 6000)),
      stream: false,
      chat_template_kwargs: { enable_thinking: false }
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Qwen request failed (" + response.status + "): " + JSON.stringify(json).slice(0, 1000));
  const output = cleanOutput(json?.choices?.[0]?.message?.content);
  if (!output) throw new Error("Qwen returned no commerce intelligence output.");
  return output;
}

async function recoverStaleJobs() {
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  const { data, error } = await supabase.from("local_ai_jobs")
    .select("id,started_at")
    .eq("job_type", "commerce_intelligence")
    .eq("status", "processing")
    .lt("started_at", cutoff)
    .limit(20);
  if (error) throw error;
  for (const job of data || []) {
    await supabase.from("local_ai_jobs")
      .update({ status: "queued", production_status: "commerce_intelligence_queued", error_message: "Recovered after specialist worker restart." })
      .eq("id", job.id)
      .eq("status", "processing");
  }
}

async function claimJob() {
  const { data, error } = await supabase.from("local_ai_jobs")
    .select("*")
    .eq("job_type", "commerce_intelligence")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  const job = data?.[0];
  if (!job) return null;
  const { data: claimed, error: claimError } = await supabase.from("local_ai_jobs")
    .update({ status: "processing", started_at: new Date().toISOString(), production_status: "commerce_intelligence_processing", error_message: null })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();
  if (claimError) throw claimError;
  return claimed || null;
}

async function processJob(job) {
  try {
    const raw = await callQwen(job);
    let result = raw;
    try {
      const parsed = JSON.parse(raw);
      result = JSON.stringify(parsed);
    } catch {}
    const { error } = await supabase.from("local_ai_jobs").update({
      status: "completed",
      result,
      completed_at: new Date().toISOString(),
      production_status: "commerce_intelligence_completed",
      error_message: null
    }).eq("id", job.id);
    if (error) throw error;
    console.log("[COMMERCE] completed", job.id);
  } catch (error) {
    const message = error?.message || String(error);
    console.error("[COMMERCE] failed", job.id, message);
    await supabase.from("local_ai_jobs").update({
      status: "error",
      error_message: message,
      production_status: "commerce_intelligence_error"
    }).eq("id", job.id);
  }
}

console.log("[COMMERCE] worker online", QWEN_URL, QWEN_MODEL);
let lastRecovery = 0;
for (;;) {
  try {
    if (Date.now() - lastRecovery > STALE_MS) {
      await recoverStaleJobs();
      lastRecovery = Date.now();
    }
    const job = await claimJob();
    if (job) await processJob(job);
    else await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  } catch (error) {
    console.error("[COMMERCE] loop error", error);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
