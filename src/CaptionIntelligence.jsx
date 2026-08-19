import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const CARD = { background: "#0e1118", border: "1px solid #252b3b", borderRadius: 18, padding: 18 };
const INPUT = { width: "100%", boxSizing: "border-box", background: "#10131c", color: "#eef1f7", border: "1px solid #2a3042", borderRadius: 10, padding: "10px 12px" };
const BUTTON = { background: "#141924", color: "#eef1f7", border: "1px solid #30374b", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const PRIMARY = { ...BUTTON, background: "#d4af37", color: "#08090d", borderColor: "#d4af37", fontWeight: 950 };

const CREATORS = {
  cara: {
    name: "Cara",
    voice: "Direct, dry, disciplined, British. Confident but not loud. Specific, sharp, self-aware. Never generic influencer copy.",
  },
  lila: {
    name: "Lila",
    voice: "Measured, warm, observant, understated. Short sentences. Calm, intimate and quietly confident. Never try-hard.",
  },
  cara_lila: {
    name: "Cara + Lila",
    voice: "Two distinct women with natural chemistry. Use contrast, teasing, shared moments and earned 'we'. Never blend them into one personality.",
  },
};

const PLATFORMS = {
  instagram: {
    name: "Instagram",
    objective: "attention → profile curiosity → bio/link click → subscription interest",
    rules: "Lifestyle-first, concise, conversational. Use a hook in the opening line. Avoid sounding like a hard ad. CTA can point to the link in bio or invite a profile visit.",
  },
  tiktok: {
    name: "TikTok",
    objective: "reach → profile curiosity → Instagram/profile route → subscription interest",
    rules: "Fast hook, natural language, highly shareable or commentable. Avoid direct adult-sales language. Use curiosity, series language, questions and profile routing where appropriate.",
  },
  facebook: {
    name: "Facebook",
    objective: "conversation → profile curiosity → link/profile visit → subscription interest",
    rules: "Conversational and shareable. Questions, opinions and relatable observations work well. Keep the CTA natural rather than sales-heavy.",
  },
  x: {
    name: "X",
    objective: "attention → profile click → Fanvue click → subscription",
    rules: "Short, punchy and conversational. Direct link/CTA is possible where permitted. Optimise for replies, quote-posts and profile curiosity.",
  },
};

const INTENTS = [
  ["Curiosity", "Make someone stop and want the context."],
  ["Connection", "Make the audience feel they know her."],
  ["Comment", "Create a natural reason to reply."],
  ["Profile", "Create enough curiosity to visit the profile."],
  ["Conversion", "Move warm attention towards the paid page."],
  ["Retention", "Make existing followers want to keep checking back."],
];

function parseJson(value) {
  const text = String(value || "").trim().replace(/```json|```/gi, "").trim();
  try { return JSON.parse(text); } catch {}
  const start = text.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned no JSON.");
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0; let quoted = false; let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === open) depth += 1;
    else if (ch === close && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("Qwen returned incomplete JSON.");
}

function safeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export default function CaptionIntelligence() {
  const [creator, setCreator] = useState("cara");
  const [platform, setPlatform] = useState("instagram");
  const [objective, setObjective] = useState("Conversion");
  const [selectedIntent, setSelectedIntent] = useState("Conversion");
  const [imageContext, setImageContext] = useState("");
  const [fanvueOffer, setFanvueOffer] = useState("Private content, subscriber-only posts and direct connection on Fanvue");
  const [assets, setAssets] = useState([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [performanceNotes, setPerformanceNotes] = useState("");
  const [captions, setCaptions] = useState([]);
  const [recommended, setRecommended] = useState("");
  const [trendSummary, setTrendSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recentJobs, setRecentJobs] = useState([]);

  const creatorProfile = CREATORS[creator];
  const platformProfile = PLATFORMS[platform];
  const filteredAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => `${a.name || ""} ${a.prompt || ""} ${JSON.stringify(a.metadata || {})}`.toLowerCase().includes(q));
  }, [assets, assetSearch]);

  async function loadAssets() {
    const { data, error } = await supabase
      .from("track_b_assets")
      .select("id,name,public_url,prompt,metadata,created_at,asset_type,approval_status")
      .eq("asset_type", "image")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) setAssets(data || []);
  }

  async function loadRecentJobs() {
    const { data, error } = await supabase
      .from("local_ai_jobs")
      .select("id,title,status,result,error_message,created_at,completed_at,persona_id,job_type")
      .eq("job_type", "social_caption_intelligence")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error) setRecentJobs(data || []);
  }

  async function loadTrendContext() {
    const { data } = await supabase
      .from("local_ai_jobs")
      .select("result,created_at")
      .eq("job_type", "trend_scan")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.result) return;
    try {
      const parsed = parseJson(data.result);
      const opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, 8) : [];
      setTrendSummary(opportunities.map((x) => `${x.format || "format"}: ${x.title || ""} — ${x.mechanism || x.hook || ""}`).join("\n"));
    } catch {}
  }

  useEffect(() => {
    loadAssets();
    loadRecentJobs();
    loadTrendContext();
    const timer = setInterval(() => { loadRecentJobs(); }, 3000);
    return () => clearInterval(timer);
  }, []);

  function toggleAsset(id) {
    setSelectedAssetIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  async function generateCaptions() {
    const selected = assets.filter((a) => selectedAssetIds.includes(a.id));
    if (!selected.length && !imageContext.trim()) {
      setMessage("Select at least one saved image or describe the image first.");
      return;
    }
    setBusy(true);
    setCaptions([]);
    setRecommended("");
    setMessage("Qwen is analysing the current signal layer, audience psychology and conversion path…");
    try {
      const assetContext = selected.slice(0, 12).map((a, i) => ({
        index: i + 1,
        id: a.id,
        name: a.name,
        prompt: a.prompt,
        metadata: a.metadata,
        url: a.public_url,
      }));
      const systemPrompt = `You are the Social Caption Intelligence Director for Cornerstone AI Assets. Your job is not to write generic captions. You are optimising captions for AI creator accounts where public social content is the top of the funnel and the paid Fanvue profile is the conversion destination. Keep all copy non-explicit and suitable for the platform. The goal is attention first, emotional connection second, profile curiosity third, and paid subscription interest only when the platform and context support it.

CREATOR: ${creatorProfile.name}
CREATOR VOICE: ${creatorProfile.voice}
PLATFORM: ${platformProfile.name}
PLATFORM FUNNEL: ${platformProfile.objective}
PLATFORM RULES: ${platformProfile.rules}

STRICT RULES:
- The caption must match the actual image/context. Never invent a location, activity, clothing item, person, time, event or claim that is not supported by the supplied context.
- Never describe a scene as something it visibly is not.
- Do not use generic phrases such as "just a little reminder", "main character energy", "living my best life", "link in bio" without a specific reason, or other recycled AI filler.
- Do not sound like an advertisement unless the selected intent is Conversion.
- Build tension through specificity, curiosity, personality, contrast or an open loop.
- Use natural human language with the selected creator's voice.
- Avoid manipulative or false claims, fake scarcity, invented earnings, fabricated fan reactions or fabricated social proof.
- Do not produce explicit sexual content. Keep conversion language tasteful and platform-appropriate.
- When Conversion is requested, sell the feeling of access, continuity, personality and exclusivity rather than describing explicit sexual material.
- Create several genuinely different strategies, not one caption rewritten five times.
- Return JSON only.`;

      const userPrompt = `TASK: Generate social captions for one or more existing creator images.
SELECTED INTENT: ${selectedIntent}
CONVERSION OBJECTIVE: ${objective}
FANVUE OFFER: ${fanvueOffer}
MANUAL IMAGE CONTEXT: ${imageContext || "None supplied. Infer only from supplied asset metadata/prompt."}
CURRENT QWEN TREND RADAR SIGNALS:\n${trendSummary || "No recent trend scan available. Use durable platform mechanisms and clearly mark trend confidence as low."}
PERFORMANCE NOTES FROM OUR OWN ACCOUNT:\n${performanceNotes || "No account performance data supplied yet. Do not invent performance."}
IMAGES:\n${JSON.stringify(assetContext)}

Return exactly:
{
  "strategy":"one paragraph explaining the caption strategy",
  "trend_signal":"what current mechanism it is borrowing, without copying another creator",
  "captions":[
    {"label":"Curiosity","text":"","goal":"","score":0,"cta":""},
    {"label":"Personality","text":"","goal":"","score":0,"cta":""},
    {"label":"Conversation","text":"","goal":"","score":0,"cta":""},
    {"label":"Profile curiosity","text":"","goal":"","score":0,"cta":""},
    {"label":"Conversion","text":"","goal":"","score":0,"cta":""}
  ],
  "recommended":"one label",
  "reason":"why this one is best for this image and funnel stage",
  "test_plan":"what to test next and what metric should decide the winner"
}`;

      const { data: queued, error: queueError } = await supabase.from("local_ai_jobs").insert({
        title: `Social Captions · ${creatorProfile.name} · ${selected.length || 1} image${selected.length === 1 ? "" : "s"}`,
        job_type: "social_caption_intelligence",
        model: "mlx-community/Qwen3-8B-4bit",
        persona_id: creator,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        options: { max_tokens: 3200, temperature: 0.55 },
        status: "queued",
        production_status: "not_started",
        result: JSON.stringify({ source_assets: selected.map((x) => x.id), platform, objective, intent: selectedIntent }),
      }).select("id").single();
      if (queueError) throw queueError;

      let completed = null;
      for (let i = 0; i < 160; i += 1) {
        await new Promise((r) => setTimeout(r, 2500));
        const { data: job, error } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", queued.id).maybeSingle();
        if (error) throw error;
        if (job?.status === "error") throw new Error(job.error_message || "Qwen caption job failed.");
        if (job?.status === "completed") { completed = job; break; }
      }
      if (!completed) throw new Error("Caption analysis timed out. The job is still saved in Recent caption intelligence jobs.");
      const parsed = parseJson(completed.result);
      setCaptions(Array.isArray(parsed.captions) ? parsed.captions : []);
      setRecommended(parsed.recommended || "");
      setMessage("Caption intelligence complete. Copy the recommended caption or test another angle.");
      await loadRecentJobs();
    } catch (error) {
      setMessage(error.message || String(error));
      await loadRecentJobs();
    } finally {
      setBusy(false);
    }
  }

  return <div style={{ minHeight: "100vh", background: "#07080c", color: "#eef1f7", padding: "28px 30px 70px", fontFamily: "Inter, system-ui, sans-serif" }}>
    <div style={{ maxWidth: 1380, margin: "0 auto", display: "grid", gap: 16 }}>
      <section style={CARD}>
        <div style={{ color: "#d4af37", fontSize: 10, fontWeight: 950, letterSpacing: ".2em", textTransform: "uppercase" }}>CornerstoneAIAssets · Qwen Caption Intelligence</div>
        <h1 style={{ margin: "8px 0 5px", fontSize: 34, letterSpacing: "-.04em" }}>Every photo gets a purpose.</h1>
        <p style={{ margin: 0, color: "#858ea1", fontSize: 13, maxWidth: 900 }}>Turn the existing photo bank into caption-led social posts built for attention, connection, profile curiosity and conversion — without changing the image.</p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 16 }}>
        <section style={CARD}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 11, color: "#929aab" }}>Creator<select value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...INPUT, marginTop: 6 }}><option value="cara">Cara</option><option value="lila">Lila</option><option value="cara_lila">Cara + Lila</option></select></label>
            <label style={{ fontSize: 11, color: "#929aab" }}>Platform<select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ ...INPUT, marginTop: 6 }}>{Object.entries(PLATFORMS).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}</select></label>
            <label style={{ fontSize: 11, color: "#929aab" }}>Primary job<select value={objective} onChange={(e) => setObjective(e.target.value)} style={{ ...INPUT, marginTop: 6 }}><option>Attention</option><option>Engagement</option><option>Profile visit</option><option>Conversion</option><option>Retention</option></select></label>
          </div>
          <div style={{ marginTop: 14 }}><div style={{ fontSize: 11, color: "#929aab", marginBottom: 8 }}>Caption angle</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>{INTENTS.map(([id, desc]) => <button key={id} type="button" onClick={() => setSelectedIntent(id)} style={{ ...BUTTON, textAlign: "left", borderColor: selectedIntent === id ? "#d4af37" : "#30374b", background: selectedIntent === id ? "rgba(212,175,55,.12)" : "#141924" }}><div style={{ color: selectedIntent === id ? "#f3d36e" : "#eef1f7" }}>{id}</div><div style={{ marginTop: 4, color: "#788195", fontSize: 10 }}>{desc}</div></button>)}</div></div>
          <label style={{ display: "block", fontSize: 11, color: "#929aab", marginTop: 14 }}>Fanvue offer / value proposition<textarea value={fanvueOffer} onChange={(e) => setFanvueOffer(e.target.value)} style={{ ...INPUT, marginTop: 6, minHeight: 56, resize: "vertical" }} /></label>
          <label style={{ display: "block", fontSize: 11, color: "#929aab", marginTop: 12 }}>Image context<textarea value={imageContext} onChange={(e) => setImageContext(e.target.value)} placeholder="Optional: mirror selfie in a white shirt, coffee shop, bedroom, gym, holiday, outfit shot, etc. Be factual." style={{ ...INPUT, marginTop: 6, minHeight: 70, resize: "vertical" }} /></label>
          <label style={{ display: "block", fontSize: 11, color: "#929aab", marginTop: 12 }}>What is working on the account<textarea value={performanceNotes} onChange={(e) => setPerformanceNotes(e.target.value)} placeholder="Paste recent winners: likes, saves, comments, shares, profile visits, link clicks, Fanvue subscribers, renewals, best hooks, best CTA patterns. Qwen uses this as conversion evidence." style={{ ...INPUT, marginTop: 6, minHeight: 92, resize: "vertical" }} /></label>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#0b0e15", border: "1px solid #252b3b" }}><div style={{ fontSize: 10, color: "#d4af37", fontWeight: 900, letterSpacing: ".14em" }}>CURRENT SIGNAL LAYER</div><div style={{ marginTop: 8, whiteSpace: "pre-wrap", color: "#8992a5", fontSize: 11, lineHeight: 1.5 }}>{trendSummary || "No completed Qwen Trend Radar yet. Run the Radar first and this tab will reuse its signal layer."}</div></div>
          <button onClick={generateCaptions} disabled={busy} style={{ ...PRIMARY, marginTop: 14, width: "100%" }}>{busy ? "Qwen is analysing and writing…" : `Generate captions with Qwen for ${selectedAssetIds.length || 1} image${selectedAssetIds.length === 1 ? "" : "s"}`}</button>
          {message && <div style={{ marginTop: 10, color: "#b8c0cf", fontSize: 12, lineHeight: 1.5 }}>{message}</div>}
        </section>

        <section style={CARD}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><div style={{ fontWeight: 900 }}>Your image bank</div><div style={{ marginTop: 4, color: "#778094", fontSize: 10 }}>Select up to 12 images per Qwen run. Everything stays in the Asset Library.</div></div><button style={BUTTON} onClick={loadAssets}>Refresh</button></div>
          <input value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} placeholder="Search saved images…" style={{ ...INPUT, marginTop: 10 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 10, maxHeight: 560, overflow: "auto", paddingRight: 2 }}>
            {filteredAssets.map((asset) => { const selected = selectedAssetIds.includes(asset.id); return <button key={asset.id} type="button" onClick={() => toggleAsset(asset.id)} style={{ padding: 0, borderRadius: 12, overflow: "hidden", border: `2px solid ${selected ? "#d4af37" : "#252b3b"}`, background: "#0b0e15", cursor: "pointer", textAlign: "left" }}><img src={asset.public_url} alt={asset.name} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }} /><div style={{ padding: 7, color: selected ? "#f2d472" : "#aab2c1", fontSize: 9 }}>{selected ? "Selected · " : ""}{asset.name || "Saved image"}</div></button>; })}
          </div>
          {!filteredAssets.length && <div style={{ marginTop: 20, color: "#697286", fontSize: 12 }}>No saved images found. Generate images in the Creator workflow first, or refresh the Asset Library.</div>}
        </section>
      </div>

      {captions.length > 0 && <section style={CARD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div><div style={{ color: "#d4af37", fontSize: 10, fontWeight: 950, letterSpacing: ".16em" }}>QWEN OUTPUT</div><h2 style={{ margin: "6px 0" }}>Caption options</h2></div><div style={{ color: "#f2d36d", fontSize: 12 }}>Recommended: <b>{recommended || "—"}</b></div></div>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{captions.map((caption, index) => <div key={`${caption.label}-${index}`} style={{ border: `1px solid ${caption.label === recommended ? "#d4af37" : "#252b3b"}`, borderRadius: 14, padding: 14, background: caption.label === recommended ? "rgba(212,175,55,.06)" : "#0b0e15" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b>{caption.label}</b><span style={{ color: "#f2d36d", fontSize: 11 }}>Score {caption.score ?? "—"}</span></div><div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{caption.text}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10, color: "#7f889b", fontSize: 10 }}><div><b>Goal</b><br />{caption.goal || "—"}</div><div><b>CTA</b><br />{caption.cta || "—"}</div></div><button style={{ ...BUTTON, marginTop: 10 }} onClick={() => navigator.clipboard?.writeText(caption.text).then(() => setMessage(`${caption.label} caption copied.`))}>Copy caption</button></div>)}</div>
      </section>}

      <section style={CARD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><b>Recent caption intelligence jobs</b><div style={{ color: "#778094", fontSize: 10, marginTop: 4 }}>The caption history lives in Supabase, so it survives reloads and new tabs.</div></div><button style={BUTTON} onClick={loadRecentJobs}>Refresh</button></div>
        <div style={{ marginTop: 10 }}>{recentJobs.map((job) => <div key={job.id} style={{ borderTop: "1px solid #252b3b", padding: "11px 0", display: "grid", gridTemplateColumns: "1.5fr .7fr 1fr", gap: 10, alignItems: "center" }}><div><b style={{ fontSize: 11 }}>{job.title}</b><div style={{ color: "#667087", fontSize: 9, marginTop: 3 }}>{job.created_at}</div></div><div style={{ color: job.status === "completed" ? "#8de1b7" : "#aeb6c6", fontSize: 10 }}>{job.status}</div><div style={{ color: "#717b8f", fontSize: 10 }}>{job.error_message || "Saved"}</div></div>)}</div>
      </section>
    </div>
  </div>;
}
