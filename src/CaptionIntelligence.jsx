import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

const CARD = { background: "#0e1118", border: "1px solid #252b3b", borderRadius: 18, padding: 18 };
const INPUT = { width: "100%", boxSizing: "border-box", background: "#10131c", color: "#eef1f7", border: "1px solid #2a3042", borderRadius: 10, padding: "10px 12px" };
const BUTTON = { background: "#141924", color: "#eef1f7", border: "1px solid #30374b", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const PRIMARY = { ...BUTTON, background: "#d4af37", color: "#08090d", borderColor: "#d4af37", fontWeight: 950 };

const CREATORS = {
  cara: { name: "Cara", voice: "Direct, dry, disciplined, British. Specific, sharp, self-aware. Confidence without performance." },
  lila: { name: "Lila", voice: "Measured, warm, observant, understated. Short sentences. Calm, intimate, quietly confident." },
  cara_lila: { name: "Cara + Lila", voice: "Two distinct women with natural chemistry. Contrast, teasing, shared moments and earned 'we'. Never blend them." },
};

const PLATFORMS = {
  instagram: { name: "Instagram", objective: "attention → profile curiosity → bio/link click → subscription interest", rules: "Specific lifestyle language, strong opening, natural CTA, no generic hard sell." },
  facebook: { name: "Facebook", objective: "conversation → profile curiosity → link/profile visit → subscription interest", rules: "Conversational, relatable, opinionated, shareable. Comment-worthy without sounding engineered." },
  fanvue: { name: "Fanvue", objective: "attention → connection → curiosity/exclusivity → subscription or repeat purchase", rules: "More direct and intimate. Sell access, continuity, personality and exclusivity. No false claims or deceptive scarcity." },
};

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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CaptionIntelligence() {
  const [creator, setCreator] = useState("cara");
  const [platform, setPlatform] = useState("instagram");
  const [objective, setObjective] = useState("Conversion");
  const [files, setFiles] = useState([]);
  const [context, setContext] = useState("");
  const [fanvueOffer, setFanvueOffer] = useState("Exclusive posts, private sets, personal updates and closer access");
  const [captions, setCaptions] = useState([]);
  const [recommended, setRecommended] = useState("");
  const [reason, setReason] = useState("");
  const [research, setResearch] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recentJobs, setRecentJobs] = useState([]);

  const creatorProfile = CREATORS[creator];
  const platformProfile = PLATFORMS[platform];

  async function loadRecentJobs() {
    const { data } = await supabase.from("local_ai_jobs")
      .select("id,title,status,result,error_message,created_at,completed_at,persona_id,job_type")
      .eq("job_type", "social_caption_intelligence")
      .order("created_at", { ascending: false })
      .limit(30);
    setRecentJobs(data || []);
  }

  useEffect(() => { loadRecentJobs(); }, []);

  async function extractPhotoFacts(selectedFiles) {
    const facts = [];
    for (let start = 0; start < selectedFiles.length; start += 4) {
      const group = selectedFiles.slice(start, start + 4);
      const images = await Promise.all(group.map(async (file) => ({ dataUrl: await fileToDataUrl(file), mimeType: file.type || "image/jpeg" })));
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "You are a visual fact extractor. Do not write captions. Inspect the supplied photos and return JSON only. Record only visible facts: people count, apparent creator identity if supplied, location, time-of-day cues, lighting, clothing, objects, activity, mood, composition and caption risks. Never invent a backstory. Unknown stays unknown.",
          user: "Return {\"images\":[{\"index\":1,\"facts\":{\"people\":[],\"location\":\"\",\"timeOfDay\":\"\",\"lighting\":\"\",\"clothing\":[],\"objects\":[],\"activity\":\"\",\"mood\":\"\",\"composition\":\"\",\"captionRisks\":[]}}]}. Do not infer facts that are not visible.",
          images,
          maxTokens: 2400,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Photo analysis failed (${response.status})`);
      const parsed = parseJson(data.text || "{}");
      if (Array.isArray(parsed.images)) facts.push(...parsed.images);
    }
    return facts;
  }

  async function generateCaptions() {
    if (!files.length && !context.trim()) {
      setMessage("Choose one or more photos from this Mac, or add a brief description.");
      return;
    }

    setBusy(true); setCaptions([]); setRecommended(""); setReason(""); setResearch([]);
    setMessage("Reading the actual photos, researching current public signals, then asking Qwen to write the captions…");

    try {
      const photoFacts = files.length ? await extractPhotoFacts(files) : [];
      const prompt = `CAPTION TASK\nCREATOR: ${creatorProfile.name}\nVOICE: ${creatorProfile.voice}\nPLATFORM: ${platformProfile.name}\nFUNNEL: ${platformProfile.objective}\nPLATFORM RULES: ${platformProfile.rules}\nPRIMARY JOB: ${objective}\nFANVUE OFFER: ${fanvueOffer}\nUSER CONTEXT: ${context || "none"}\n\nPHOTO FACTS:\n${JSON.stringify(photoFacts)}\n\nIMPORTANT: use the CURRENT LIVE RESEARCH PACK appended by the worker. This must not be replaced with old CAIG Trend Radar output. The research pack may contain qualitative platform guidance, current creator/marketing coverage and recent signals. Distinguish evidence from inference.\n\nReturn JSON only:\n{\"strategy\":\"\",\"currentSignals\":[{\"source\":\"\",\"published\":\"\",\"signal\":\"\",\"evidenceLevel\":\"\"}],\"captions\":[{\"label\":\"Curiosity\",\"text\":\"\",\"goal\":\"\",\"cta\":\"\"},{\"label\":\"Personality\",\"text\":\"\",\"goal\":\"\",\"cta\":\"\"},{\"label\":\"Conversation\",\"text\":\"\",\"goal\":\"\",\"cta\":\"\"},{\"label\":\"Profile curiosity\",\"text\":\"\",\"goal\":\"\",\"cta\":\"\"},{\"label\":\"Conversion\",\"text\":\"\",\"goal\":\"\",\"cta\":\"\"}],\"recommended\":\"\",\"reason\":\"\",\"testPlan\":\"\"}`;

      const system = `You are the Social Caption Intelligence Director for Cornerstone AI Assets. You are judged by whether the operator can paste the output immediately and whether the strategy is actually useful.

LIVE-RESEARCH RULE:
- The worker will append a fresh research pack at job runtime.
- Never use a previous CAIG Trend Radar job as proof of what is working now.
- Prefer sources published within the last 7-30 days for trend signals. Official platform or policy material may be older when still current.
- Never claim a metric, conversion rate or viral format is proven unless the supplied source actually provides evidence.
- Extract repeated current mechanisms across multiple recent sources, then make your own strategic inference. Label inference as inference.
- If current evidence is weak, say so. Do not fill the gap with fabricated certainty.

PHOTO-TRUTH RULE:
- The caption must match the actual photo facts. Never invent a location, outfit, person, relationship, activity, event, time or backstory.
- Do not force a trend onto a photo if it makes the caption unnatural. The current signal is a strategic input, not permission to lie about the image.

CREATOR: ${creatorProfile.name}\nVOICE: ${creatorProfile.voice}\nPLATFORM: ${platformProfile.name}\nOBJECTIVE: ${objective}\n
COPY QUALITY:
- No generic AI filler or recycled influencer phrases.
- Write like this creator, not a social media manager.
- Produce genuinely different angles.
- Public social: attention and relationship first, natural route to profile/Fanvue where appropriate.
- Fanvue: direct conversion is allowed. Sell access, continuity, exclusivity, personality and the reason to stay subscribed. Do not use deceptive or false claims, and stay within Fanvue/platform rules.
- Do not produce explicit sexual content.`;

      const { data: queued, error } = await supabase.from("local_ai_jobs").insert({
        title: `Caption Writer · ${creatorProfile.name} · ${files.length || 1} photo${files.length === 1 ? "" : "s"} · ${platformProfile.name}`,
        job_type: "social_caption_intelligence",
        model: "mlx-community/Qwen3-8B-4bit",
        persona_id: creator,
        system_prompt: system,
        user_prompt: prompt,
        options: { max_tokens: 4200, temperature: 0.62 },
        status: "queued",
        production_status: "not_started",
        result: JSON.stringify({ localFileNames: files.map((f) => f.name), creator, platform, objective }),
      }).select("id").single();
      if (error) throw error;

      // Persist only the extracted facts/job metadata. Original photos remain on the Mac.
      await supabase.from("local_ai_jobs").update({
        result: JSON.stringify({ localFileNames: files.map((f) => f.name), creator, platform, objective, photoFacts }),
        user_prompt: `${prompt}\n\nPHOTO FACTS FROM LOCAL FILES:\n${JSON.stringify(photoFacts)}`,
      }).eq("id", queued.id);

      let completed = null;
      for (let i = 0; i < 180; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const { data: job, error: pollError } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", queued.id).maybeSingle();
        if (pollError) throw pollError;
        if (job?.status === "error") throw new Error(job.error_message || "Qwen caption job failed.");
        if (job?.status === "completed") { completed = job; break; }
      }
      if (!completed) throw new Error("Caption job timed out. The job remains saved in Recent Caption Writer jobs.");

      const parsed = parseJson(completed.result);
      setCaptions(Array.isArray(parsed.captions) ? parsed.captions : []);
      setRecommended(parsed.recommended || "");
      setReason(parsed.reason || "");
      setResearch(Array.isArray(parsed.currentSignals) ? parsed.currentSignals : []);
      setMessage("Done. This job used the current runtime research pack and the actual photo facts — not the old CAIG Trend Radar.");
      await loadRecentJobs();
    } catch (error) {
      setMessage(error.message || String(error));
      await loadRecentJobs();
    } finally { setBusy(false); }
  }

  return <div style={{ minHeight: "100vh", background: "#07080c", color: "#eef1f7", padding: "28px 30px 70px", fontFamily: "Inter, system-ui, sans-serif" }}>
    <div style={{ maxWidth: 1380, margin: "0 auto", display: "grid", gap: 16 }}>
      <section style={CARD}>
        <div style={{ color: "#d4af37", fontSize: 10, fontWeight: 950, letterSpacing: ".2em", textTransform: "uppercase" }}>CornerstoneAIAssets · Live Caption Intelligence</div>
        <h1 style={{ margin: "8px 0 5px", fontSize: 34, letterSpacing: "-.04em" }}>Use the photo you already have. Let Qwen find the angle.</h1>
        <p style={{ margin: 0, color: "#858ea1", fontSize: 13, maxWidth: 980 }}>The photos do not need to enter the Asset Library. Pick files from this Mac, we extract visual facts, then Qwen researches the current public signal layer at runtime and writes paste-ready captions.</p>
      </section>

      <section style={CARD}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 11, color: "#929aab" }}>Creator<select value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...INPUT, marginTop: 6 }}><option value="cara">Cara</option><option value="lila">Lila</option><option value="cara_lila">Cara + Lila</option></select></label>
          <label style={{ fontSize: 11, color: "#929aab" }}>Destination<select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ ...INPUT, marginTop: 6 }}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="fanvue">Fanvue</option></select></label>
          <label style={{ fontSize: 11, color: "#929aab" }}>Primary job<select value={objective} onChange={(e) => setObjective(e.target.value)} style={{ ...INPUT, marginTop: 6 }}><option>Attention</option><option>Engagement</option><option>Profile Visit</option><option>Conversion</option><option>Retention</option></select></label>
        </div>
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <label style={{ fontSize: 11, color: "#929aab" }}>Photos from this Mac<input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 20))} style={{ ...INPUT, marginTop: 6 }} /></label>
          <div style={{ fontSize: 11, color: "#70798c" }}>{files.length ? `${files.length} local photo${files.length === 1 ? "" : "s"} selected · ${files.map((f) => f.name).join(", ")}` : "Your originals stay on this Mac. They are not imported into the Asset Library."}</div>
          <label style={{ fontSize: 11, color: "#929aab" }}>Optional context note<textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} placeholder="Only add context the image cannot show. Qwen is instructed not to invent anything else." style={{ ...INPUT, marginTop: 6, resize: "vertical" }} /></label>
          {platform === "fanvue" && <label style={{ fontSize: 11, color: "#929aab" }}>Fanvue offer<input value={fanvueOffer} onChange={(e) => setFanvueOffer(e.target.value)} style={{ ...INPUT, marginTop: 6 }} /></label>}
          <button style={PRIMARY} onClick={generateCaptions} disabled={busy}>{busy ? "Researching + writing…" : "Research what is working now + write captions"}</button>
          {message && <div style={{ color: "#b9c0cf", fontSize: 12, lineHeight: 1.55 }}>{message}</div>}
        </div>
      </section>

      {captions.length > 0 && <section style={CARD}>
        <div style={{ color: "#d4af37", fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 900 }}>Recommended: {recommended}</div>
        <div style={{ marginTop: 6, color: "#aeb6c7", fontSize: 12, lineHeight: 1.55 }}>{reason}</div>
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {captions.map((caption) => <div key={caption.label} style={{ border: `1px solid ${caption.label === recommended ? "#d4af37" : "#252b3b"}`, borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong>{caption.label}</strong><span style={{ color: "#7e8799", fontSize: 11 }}>{caption.goal}</span></div>
            <div style={{ marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 13 }}>{caption.text}</div>
            {caption.cta && <div style={{ marginTop: 8, color: "#8d95a7", fontSize: 11 }}>CTA: {caption.cta}</div>}
            <button style={{ ...BUTTON, marginTop: 10 }} onClick={() => navigator.clipboard?.writeText(caption.text || "")}>Copy caption</button>
          </div>)}
        </div>
      </section>}

      {research.length > 0 && <section style={CARD}>
        <div style={{ color: "#d4af37", fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 900 }}>Live research used by Qwen</div>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>{research.slice(0, 10).map((item, i) => <div key={`${item.source}-${i}`} style={{ fontSize: 11, color: "#9da6b6", lineHeight: 1.5 }}><strong style={{ color: "#eef1f7" }}>{item.source}</strong> · {item.published || "recent"} — {item.signal} <span style={{ color: "#6f788b" }}>({item.evidenceLevel || "inference"})</span></div>)}</div>
      </section>}

      <section style={CARD}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><strong>Recent Caption Writer jobs</strong><div style={{ color: "#70798c", fontSize: 11, marginTop: 4 }}>The original photos stay local; only caption job metadata and visual facts are saved.</div></div><button style={BUTTON} onClick={loadRecentJobs}>Refresh</button></div>{recentJobs.map((job) => <div key={job.id} style={{ borderTop: "1px solid #252b3b", marginTop: 10, paddingTop: 10, fontSize: 11 }}><strong>{job.title}</strong> · {job.status} · {job.created_at}</div>)}</section>
    </div>
  </div>;
}
