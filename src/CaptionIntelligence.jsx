import React, { useEffect, useMemo, useState } from "react";
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
  instagram: { name: "Instagram", objective: "attention → profile curiosity → bio/link click → subscription interest" },
  facebook: { name: "Facebook", objective: "conversation → profile curiosity → profile visit → subscription interest" },
  fanvue: { name: "Fanvue", objective: "attention → connection → curiosity/exclusivity → subscription or repeat purchase" },
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

function decisionStyle(decision) {
  if (decision === "USE") return { border: "#3b8b6a", bg: "rgba(59,139,106,.08)" };
  if (decision === "ADAPT") return { border: "#8f7a2c", bg: "rgba(143,122,44,.08)" };
  return { border: "#7b3c4c", bg: "rgba(123,60,76,.08)" };
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
  const [decision, setDecision] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [research, setResearch] = useState(null);
  const [testPlan, setTestPlan] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recentJobs, setRecentJobs] = useState([]);

  const creatorProfile = CREATORS[creator];
  const platformProfile = PLATFORMS[platform];
  const evidence = research?.evidence || [];

  const groupedEvidence = useMemo(() => {
    const grouped = {};
    evidence.forEach((item) => {
      const key = item.platform || "Other";
      grouped[key] = grouped[key] || [];
      grouped[key].push(item);
    });
    return grouped;
  }, [evidence]);

  async function loadRecentJobs() {
    const { data } = await supabase.from("local_ai_jobs")
      .select("id,title,status,result,error_message,created_at,completed_at,persona_id,job_type")
      .eq("job_type", "social_caption_intelligence")
      .order("created_at", { ascending: false })
      .limit(20);
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
          system: "You are a visual fact extractor. Return JSON only. Record only visible facts from each supplied photo: people count, location, time-of-day cues, lighting, clothing, objects, activity, mood, composition and caption risks. Do not infer hidden backstory. Unknown stays unknown.",
          user: "Return {\"images\":[{\"index\":1,\"facts\":{\"people\":[],\"location\":\"\",\"timeOfDay\":\"\",\"lighting\":\"\",\"clothing\":[],\"objects\":[],\"activity\":\"\",\"mood\":\"\",\"composition\":\"\",\"captionRisks\":[]}}]}",
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
      setMessage("Choose one or more photos from this Mac, or add a short description.");
      return;
    }

    setBusy(true);
    setCaptions([]); setRecommended(""); setReason(""); setDecision(""); setDecisionReason(""); setResearch(null); setTestPlan("");
    setMessage("Stage 1/3 · reading the actual photos…");

    try {
      const photoFacts = files.length ? await extractPhotoFacts(files) : [];
      setMessage("Stage 2/3 · researching the last 7 days across TikTok, Instagram and Reddit…");

      const prompt = `CAPTION TASK\nCREATOR: ${creatorProfile.name}\nVOICE: ${creatorProfile.voice}\nPLATFORM: ${platformProfile.name}\nFUNNEL: ${platformProfile.objective}\nPRIMARY JOB: ${objective}\nFANVUE OFFER: ${fanvueOffer}\nUSER CONTEXT: ${context || "none"}\n\nPHOTO FACTS:\n${JSON.stringify(photoFacts)}\n\nUse the LIVE RESEARCH PACK added by the local worker. This is a fresh runtime research pass. Do not use old CAIG Trend Radar output as evidence.\n\nReturn JSON only:\n{\"strategy\":\"\",\"trendDecision\":\"USE|ADAPT|IGNORE\",\"trendDecisionReason\":\"\",\"confidence\":\"high|medium|low\",\"currentSignals\":[{\"source\":\"\",\"published\":\"\",\"platform\":\"\",\"signal\":\"\",\"evidenceLevel\":\"\"}],\"captions\":[{\"label\":\"Curiosity\",\"text\":\"\",\"goal\":\"\",\"cta\":\"\"},{\"label\":\"Personality\",\"text\":\"\",\"goal\":\"\",\"cta\":\"\"},{\"label\":\"Conversation\",\"text\":\"\",\"goal\":\"\",\"cta\":\"\"},{\"label\":\"Profile curiosity\",\"text\":\"\",\"goal\":\"\",\"cta\":\"\"},{\"label\":\"Conversion\",\"text\":\"\",\"goal\":\"\",\"cta\":\"\"}],\"recommended\":\"\",\"reason\":\"\",\"testPlan\":\"\"}`;

      const system = `You are the Social Caption Intelligence Director for Cornerstone AI Assets. You are judged by whether the operator can paste the result immediately and whether the strategy is genuinely useful.

CURRENT-MARKET RESEARCH RULES:
- The local worker performs a fresh public-web research pass every job using a strict 7-day trend window.
- Research must inspect current TikTok Creative Center/current trend pages, current Reddit creator discussions, current indexed/public Instagram references, and official platform/Fanvue guidance where relevant.
- Extract repeated mechanisms: opening hook, first-frame treatment, on-image text, pacing, visual pattern, storytelling structure, caption style, CTA and comment trigger.
- Decide USE, ADAPT or IGNORE for this exact photo and creator. Never force a trend because it is current.
- Only call something viral/proven when the supplied evidence supports that claim.
- For carousel/image text, only claim exact text was observed when the research source actually exposed the image. Never invent text evidence.
- If direct platform evidence is limited, state the limitation and lower confidence.

PHOTO TRUTH:
- Caption must match visible photo facts. Never invent a location, activity, relationship, outfit, person, event, time or backstory.
- The current signal is a strategic input, not permission to misrepresent the image.

CREATOR: ${creatorProfile.name}\nVOICE: ${creatorProfile.voice}\nPLATFORM: ${platformProfile.name}\nOBJECTIVE: ${objective}\n
COPY QUALITY:
- No generic AI filler.
- No recycled influencer phrases.
- Write like the selected creator, not a social media manager.
- Make the five angles meaningfully different.
- Public social: attention and relationship first, natural route to profile/Fanvue where appropriate.
- Fanvue: direct conversion is allowed, but sell access, continuity, personality and exclusivity rather than explicit sexual material. No deceptive scarcity, fake social proof or false claims.`;

      const { data: queued, error } = await supabase.from("local_ai_jobs").insert({
        title: `Caption Writer · ${creatorProfile.name} · ${files.length || 1} photo${files.length === 1 ? "" : "s"} · ${platformProfile.name}`,
        job_type: "social_caption_intelligence",
        model: "mlx-community/Qwen3-8B-4bit",
        persona_id: creator,
        system_prompt: system,
        user_prompt: `${prompt}\n\nPHOTO FACTS FROM LOCAL FILES:\n${JSON.stringify(photoFacts)}`,
        options: { max_tokens: 4200, temperature: 0.58 },
        status: "queued",
        production_status: "not_started",
        result: JSON.stringify({ localFileNames: files.map((f) => f.name), creator, platform, objective, photoFacts }),
      }).select("id").single();
      if (error) throw error;

      setMessage("Stage 3/3 · Qwen is deciding whether the current signal should be used, adapted or ignored…");

      let completed = null;
      for (let i = 0; i < 180; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const { data: job, error: pollError } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", queued.id).maybeSingle();
        if (pollError) throw pollError;
        if (job?.status === "error") throw new Error(job.error_message || "Qwen caption job failed.");
        if (job?.status === "completed") { completed = job; break; }
      }
      if (!completed) throw new Error("Caption job timed out. It remains saved in Recent Caption Writer jobs.");

      const parsed = parseJson(completed.result);
      setCaptions(Array.isArray(parsed.captions) ? parsed.captions : []);
      setRecommended(parsed.recommended || "");
      setReason(parsed.reason || "");
      setDecision(parsed.trendDecision || "");
      setDecisionReason(parsed.trendDecisionReason || "");
      setTestPlan(parsed.testPlan || "");
      setResearch(parsed.research || null);
      setMessage("Complete. Research evidence, limitations and the Qwen decision are shown below.");
      await loadRecentJobs();
    } catch (error) {
      setMessage(error.message || String(error));
      await loadRecentJobs();
    } finally {
      setBusy(false);
    }
  }

  const decision = decisionStyle(decision);

  return <div style={{ minHeight: "100vh", background: "#07080c", color: "#eef1f7", padding: "28px 30px 70px", fontFamily: "Inter, system-ui, sans-serif" }}>
    <div style={{ maxWidth: 1380, margin: "0 auto", display: "grid", gap: 16 }}>
      <section style={CARD}>
        <div style={{ color: "#d4af37", fontSize: 10, fontWeight: 950, letterSpacing: ".2em", textTransform: "uppercase" }}>CornerstoneAIAssets · Qwen Caption Writer</div>
        <h1 style={{ margin: "8px 0 5px", fontSize: 34, letterSpacing: "-.04em" }}>Use the photo you already have. Let Qwen find the angle.</h1>
        <p style={{ margin: 0, color: "#858ea1", fontSize: 13, maxWidth: 980 }}>Your originals stay on this Mac. CAIG reads the photos, researches the last 7 days of public signals at runtime, then gives you paste-ready captions.</p>
      </section>

      <section style={CARD}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 11, color: "#929aab" }}>Creator<select value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...INPUT, marginTop: 6 }}><option value="cara">Cara</option><option value="lila">Lila</option><option value="cara_lila">Cara + Lila</option></select></label>
          <label style={{ fontSize: 11, color: "#929aab" }}>Destination<select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ ...INPUT, marginTop: 6 }}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="fanvue">Fanvue</option></select></label>
          <label style={{ fontSize: 11, color: "#929aab" }}>Primary job<select value={objective} onChange={(e) => setObjective(e.target.value)} style={{ ...INPUT, marginTop: 6 }}><option>Attention</option><option>Engagement</option><option>Profile Visit</option><option>Conversion</option><option>Retention</option></select></label>
        </div>
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <label style={{ fontSize: 11, color: "#929aab" }}>Photos from this Mac<input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 20))} style={{ ...INPUT, marginTop: 6 }} /></label>
          <div style={{ fontSize: 11, color: "#70798c" }}>{files.length ? `${files.length} local photo${files.length === 1 ? "" : "s"} selected · originals stay local` : "Select up to 20 photos. Only visual facts are sent to CAIG; originals stay on the Mac."}</div>
          {platform === "fanvue" && <label style={{ fontSize: 11, color: "#929aab" }}>Fanvue offer / conversion context<textarea value={fanvueOffer} onChange={(e) => setFanvueOffer(e.target.value)} rows={3} style={{ ...INPUT, marginTop: 6, resize: "vertical" }} /></label>}
          <label style={{ fontSize: 11, color: "#929aab" }}>Optional context<textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} placeholder="Anything the photo alone cannot tell us: location, story, launch, offer, inside joke…" style={{ ...INPUT, marginTop: 6, resize: "vertical" }} /></label>
          <button type="button" onClick={generateCaptions} disabled={busy} style={{ ...PRIMARY, opacity: busy ? 0.6 : 1 }}>{busy ? "Researching + writing…" : "Research & write captions"}</button>
          <div style={{ color: "#858ea1", fontSize: 12 }}>{message}</div>
        </div>
      </section>

      {research && <section style={CARD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div><div style={{ color: "#d4af37", fontSize: 10, letterSpacing: ".2em", fontWeight: 950 }}>LIVE RESEARCH EVIDENCE</div><h2 style={{ margin: "6px 0 0", fontSize: 22 }}>Last {research.windowDays || 7} days</h2></div>
          <div style={{ display: "flex", gap: 8 }}><span style={{ border: "1px solid #2e3547", borderRadius: 999, padding: "7px 10px", fontSize: 11 }}>Confidence: {research.confidence || "unknown"}</span><span style={{ border: "1px solid #2e3547", borderRadius: 999, padding: "7px 10px", fontSize: 11 }}>Evidence: {research.evidence?.length || 0}</span></div>
        </div>
        <div style={{ color: "#858ea1", fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>{research.methodology}</div>
        {research.limitations?.length > 0 && <div style={{ marginTop: 10, padding: 12, border: "1px solid #4a3d25", borderRadius: 12, background: "rgba(212,175,55,.05)", color: "#c8c1af", fontSize: 11 }}><strong>Research limitations:</strong> {research.limitations.join(" ")}</div>}
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {Object.entries(groupedEvidence).map(([name, items]) => <div key={name} style={{ borderTop: "1px solid #1e2432", paddingTop: 12 }}><div style={{ fontWeight: 900, fontSize: 12, marginBottom: 8 }}>{name}</div>{items.slice(0, 8).map((item, index) => <div key={`${name}-${index}`} style={{ marginBottom: 8, padding: 10, background: "#10131c", border: "1px solid #202638", borderRadius: 10 }}><div style={{ fontSize: 11, fontWeight: 800 }}>{item.title}</div><div style={{ marginTop: 4, color: "#7f8899", fontSize: 10 }}>{item.sourceType || "source"} · {item.published ? new Date(item.published).toLocaleString() : "current / undated"}</div><div style={{ marginTop: 5, color: "#aeb5c3", fontSize: 11, lineHeight: 1.4 }}>{String(item.signal || "").slice(0, 500)}</div>{item.url && <a href={item.url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 5, color: "#d4af37", fontSize: 10 }}>View source ↗</a>}</div>)}</div>)}
        </div>
      </section>}

      {(decision || recommended || captions.length) && <section style={CARD}>
        {decision && <div style={{ padding: 14, border: `1px solid ${decision.border}`, borderRadius: 14, background: decision.bg }}><div style={{ fontSize: 10, letterSpacing: ".2em", fontWeight: 950, color: "#8b95a8" }}>QWEN DECISION</div><div style={{ marginTop: 6, fontSize: 30, fontWeight: 950 }}>{decision}</div><div style={{ marginTop: 6, color: "#9ca5b6", fontSize: 12 }}>{decisionReason || "No decision explanation returned."}</div></div>}
        {recommended && <div style={{ marginTop: 14, padding: 16, border: "1px solid #3b465f", borderRadius: 14, background: "#111520" }}><div style={{ color: "#d4af37", fontSize: 10, letterSpacing: ".2em", fontWeight: 950 }}>RECOMMENDED CAPTION</div><div style={{ marginTop: 9, fontSize: 20, lineHeight: 1.45, fontWeight: 800 }}>{recommended}</div><div style={{ marginTop: 8, color: "#858ea1", fontSize: 12 }}>{reason}</div></div>}
        {testPlan && <div style={{ marginTop: 12, color: "#9ca5b6", fontSize: 12 }}><strong>Test plan:</strong> {testPlan}</div>}
        {captions.length > 0 && <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10 }}>{captions.map((caption) => <div key={caption.label} style={{ background: "#10131c", border: "1px solid #242b3d", borderRadius: 14, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong>{caption.label}</strong><button type="button" onClick={() => navigator.clipboard?.writeText(caption.text || "")} style={{ ...BUTTON, padding: "6px 9px", fontSize: 10 }}>Copy</button></div><div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5 }}>{caption.text}</div>{caption.goal && <div style={{ marginTop: 8, color: "#7d8799", fontSize: 10 }}>Goal: {caption.goal}</div>}{caption.cta && <div style={{ marginTop: 5, color: "#7d8799", fontSize: 10 }}>CTA: {caption.cta}</div>}</div>)}</div>}
      </section>}

      <section style={CARD}>
        <div style={{ color: "#8a94a7", fontSize: 10, letterSpacing: ".2em", fontWeight: 950 }}>RECENT CAPTION JOBS</div>
        <div style={{ marginTop: 10, display: "grid", gap: 7 }}>{recentJobs.slice(0, 8).map((job) => <div key={job.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #1b2130", fontSize: 11 }}><span>{job.title}</span><span style={{ color: job.status === "completed" ? "#72d4ad" : "#858ea1" }}>{job.status}</span></div>)}</div>
      </section>
    </div>
  </div>;
}
