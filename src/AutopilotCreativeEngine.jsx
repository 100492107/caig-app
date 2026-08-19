import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./autopilotCreativeEngine.css";

const MODEL = "mlx-community/Qwen3-8B-4bit";
const STORAGE_KEY = "caig_autopilot_creative_v1";

const PERSONAS = {
  cara: { id: "cara", name: "Cara", note: "Direct · dry · disciplined · British" },
  lila: { id: "lila", name: "Lila", note: "Measured · warm · observant · understated" },
  duo: { id: "duo", name: "Cara + Lila", note: "Contrast · chemistry · shared moments" },
};

const PLATFORM_RULES = {
  TikTok: "Fast hook, native pacing, conversational language, visible action in the first beat, one clear idea, no ad-like intro.",
  Instagram: "Aesthetic but human. Strong first frame, simple narrative, visual identity, captions that sound like a person rather than a brand.",
  YouTube: "Narrative clarity. Hook immediately, then setup → tension → payoff. Shorts should still feel like a complete story.",
  Facebook: "Shareability and conversation. Strong opinion, relatable observation, taggable premise or practical takeaway.",
};

const FORMAT_LIBRARY = [
  "POV / first-person confession",
  "Things I stopped doing",
  "Unexpected comparison",
  "Storytime with a payoff",
  "Observation / social truth",
  "Before → after / transformation",
  "Banter / duo disagreement",
  "Comment reply / response",
  "Mini experiment / challenge",
  "Silent visual reveal",
  "List with escalating examples",
  "Day-in-the-life micro story",
];

const DEFAULT_SIGNALS = `Use the creator trend workflow: start from a recognisable format or hook mechanism, not a generic topic. Look for short-form patterns that can be adapted into authentic Cara, Lila or duo content. Avoid copying a specific creator or script. Prefer mechanisms such as curiosity, contrast, confession, observation, proof, identity and transformation.\n\nReference source for live trend checking: TikTok Creative Center → Trends / Top Ads. The app should treat live trend data pasted below as source material, not something to invent.`;

function loadState() {
  try {
    return { persona: "duo", platform: "TikTok", goal: "Grow account", signals: DEFAULT_SIGNALS, niche: "Quiet ambition · style · everyday life · mindset · money · calm luxury", count: 12 };
  } catch {
    return { persona: "duo", platform: "TikTok", goal: "Grow account", signals: DEFAULT_SIGNALS, niche: "Quiet ambition · style · everyday life · mindset · money · calm luxury", count: 12 };
  }
}

function parseJson(value) {
  const text = String(value || "").trim().replace(/```json|```/gi, "").trim();
  try { return JSON.parse(text); } catch {}
  const start = text.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned no JSON result.");
  const opening = text[start];
  const closing = opening === "{" ? "}" : "]";
  let depth = 0; let inString = false; let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === opening) depth += 1;
    else if (ch === closing) {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error("Qwen returned incomplete JSON.");
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === "") return [];
  return [String(value)];
}

function usePersistentState() {
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || loadState(); }
    catch { return loadState(); }
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }, [state]);
  return [state, setState];
}

function scoreColour(score) {
  if (score >= 90) return "hot";
  if (score >= 80) return "warm";
  return "cool";
}

export default function AutopilotCreativeEngine() {
  const [state, setState] = usePersistentState();
  const { persona, platform, goal, signals, niche, count } = state;
  const [view, setView] = useState("radar");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [opportunities, setOpportunities] = useState([]);
  const [selected, setSelected] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [learning, setLearning] = useState(null);

  const personaLabel = PERSONAS[persona]?.name || "Cara + Lila";
  const sourceUrl = "https://ads.tiktok.com/creative/creativeCenter/trends?countryCode=US";

  function patch(values) { setState((s) => ({ ...s, ...values })); }

  async function loadJobs() {
    const { data } = await supabase
      .from("local_ai_jobs")
      .select("id,title,job_type,model,status,result,error_message,created_at,completed_at,persona_id,production_status,video_url,caption_job_id,captioned_video_url")
      .in("job_type", ["trend_scan", "autopilot_concept", "content_package", "repurpose"])
      .order("created_at", { ascending: false })
      .limit(40);
    setJobs(data || []);
  }

  useEffect(() => {
    loadJobs();
    const timer = setInterval(loadJobs, 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const latest = jobs.find((j) => j.job_type === "trend_scan" && j.status === "completed");
    if (!latest?.result) return;
    try {
      const parsed = parseJson(latest.result);
      if (Array.isArray(parsed.opportunities)) setOpportunities(parsed.opportunities);
      setMessage("Latest Qwen radar scan loaded.");
    } catch {}
  }, [jobs]);

  const productionJobs = useMemo(() => jobs.filter((j) => ["content_package", "repurpose"].includes(j.job_type)), [jobs]);

  async function queueJob({ jobType, title, personaId, systemPrompt, userPrompt, maxTokens = 2400 }) {
    const { data, error } = await supabase.from("local_ai_jobs").insert({
      title,
      job_type: jobType,
      model: MODEL,
      persona_id: personaId,
      system_prompt: systemPrompt,
      user_prompt: userPrompt,
      options: { max_tokens: maxTokens, temperature: 0.62 },
      status: "queued",
      production_status: "not_started",
    }).select("id").single();
    if (error) throw error;
    return data.id;
  }

  async function scanTrends() {
    setBusy(true);
    setMessage("Qwen is scanning your trend signals and building remix opportunities…");
    try {
      const personContext = PERSONAS[persona]?.note || PERSONAS.duo.note;
      const systemPrompt = `You are the autonomous Creative Director for Cornerstone AI Assets. Your job is to turn trend signals into original, platform-native opportunities for a real creator account. Never copy a creator, exact script or protected creative. Extract the mechanism: hook, pacing, psychology, visual behaviour, narrative structure and why people would keep watching. Treat live trend data supplied by the user as source material. Never pretend you have live internet access or invent current performance numbers. Return JSON only.`;
      const userPrompt = `PLATFORM: ${platform}\nGOAL: ${goal}\nNICHE: ${niche}\nCREATOR: ${personContext}\nTARGET OPPORTUNITIES: ${count}\nPLATFORM RULE: ${PLATFORM_RULES[platform]}\nFORMAT LIBRARY: ${FORMAT_LIBRARY.join(", ")}\n\nTREND SIGNALS / SOURCE NOTES:\n${signals}\n\nReturn exactly {"opportunities":[...]}. Each opportunity must contain: id,title,trend_signal,mechanism,hook,format,pacing,psychology,why_now,creator_adaptation,score,confidence,production_notes,remix_variants. score is 0-100 and confidence is Low/Medium/High. remix_variants must contain 3 short variants for Cara, Lila and Cara + Lila. Do not fabricate metrics or claim something is viral without source evidence.`;
      await queueJob({ jobType: "trend_scan", title: `Trend Radar · ${platform} · ${personaLabel}`, personaId: persona === "duo" ? "cara_lila" : persona, systemPrompt, userPrompt, maxTokens: 4200 });
      await loadJobs();
      setView("radar");
    } catch (error) {
      setMessage(error.message || String(error));
    } finally { setBusy(false); }
  }

  function toggleSelection(id) {
    setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  async function remixSelected() {
    const picks = opportunities.filter((x) => selected.includes(x.id));
    if (!picks.length) return;
    setBusy(true);
    setMessage(`Qwen is turning ${picks.length} winning pattern${picks.length === 1 ? "" : "s"} into executable concepts…`);
    try {
      for (const pick of picks) {
        const systemPrompt = `You are the autonomous Creative Director for Cornerstone AI Assets. Convert a validated content mechanism into one original, executable short-form concept for ${personaLabel}. The concept must preserve the mechanism but feel native to the character. Return JSON only.\n\nQuality rules: specific, human, believable, platform-native, no generic AI copy, no fabricated personal claims, no invented performance numbers, no copying of the source creator.`;
        const userPrompt = `PLATFORM: ${platform}\nGOAL: ${goal}\nCREATOR: ${personaLabel}\nNICHE: ${niche}\nTREND PATTERN:\n${JSON.stringify(pick)}\n\nReturn {"concept":{"title","creator","hook","script","format","shot_list","visual_prompt","caption","cta","duration","edit_plan","why_it_should_work"}}. The result must be production-ready for an image/video generation pipeline.`;
        await queueJob({ jobType: "autopilot_concept", title: `Remix · ${pick.title}`, personaId: persona === "duo" ? "cara_lila" : persona, systemPrompt, userPrompt, maxTokens: 3400 });
      }
      setMessage("Concepts queued. Qwen is generating the executable briefs now.");
      setView("production");
      await loadJobs();
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  async function promoteConcept(job) {
    if (!job?.result) return;
    setBusy(true);
    setMessage(`Turning ${job.title} into a full production package…`);
    try {
      const parsed = parseJson(job.result);
      const concept = parsed.concept || parsed;
      const systemPrompt = `You are the production director for Cornerstone AI Assets. Convert an approved concept into a complete machine-friendly content package for short-form video. Return JSON only. Include HOOK, SCRIPT, VIDEO PROMPT, SHOT TIMELINE, AUDIO, CAPTION, EDIT NOTES and NEGATIVE CONSTRAINTS. The visual must feel like authentic creator footage, not a cinematic AI commercial.`;
      const userPrompt = `PLATFORM: ${platform}\nCREATOR: ${personaLabel}\nAPPROVED CONCEPT:\n${JSON.stringify(concept)}\n\nReturn {"package":{"hook","script","videoPrompt","timeline","audio","caption","cta","editNotes","negativeConstraints","postType","duration"}}.`;
      await queueJob({ jobType: "content_package", title: `Produce · ${job.title}`, personaId: job.persona_id || (persona === "duo" ? "cara_lila" : persona), systemPrompt, userPrompt, maxTokens: 3400 });
      setMessage("Production package queued. When Qwen finishes, the job is ready for media production.");
      await loadJobs();
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  async function generateVideo(job) {
    if (!job?.result) return;
    setBusy(true);
    setMessage(`Generating the visual anchor for ${job.title}…`);
    try {
      const parsed = parseJson(job.result);
      const pkg = parsed.package || parsed;
      const personaId = job.persona_id || (persona === "duo" ? "cara_lila" : persona);
      const imagePrompt = `${pkg.videoPrompt || "Authentic social video scene"}. ${personaLabel}. Vertical 9:16. Use the supplied persona identity as the reference anchor. Natural phone-camera behaviour, believable posture, lived-in environment, imperfect framing, realistic skin texture and movement. No subtitles, no text overlays, no watermark.`;
      const imageSubmit = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: { subject: imagePrompt, photo_idea: imagePrompt }, photo_idea: imagePrompt, hook: pkg.hook || "", caption: pkg.caption || "", personaId }) });
      const imageJob = await imageSubmit.json().catch(() => ({}));
      if (!imageSubmit.ok) throw new Error(imageJob.error || `Image submit failed (${imageSubmit.status})`);
      let imageUrl = "";
      for (let i = 0; i < 100; i += 1) {
        await new Promise((r) => setTimeout(r, 3000));
        const r = await fetch("/api/generate-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: imageJob.requestId, type: "image", statusUrl: imageJob.statusUrl, resultUrl: imageJob.resultUrl }) });
        const d = await r.json().catch(() => ({}));
        if (d.status === "COMPLETED") { imageUrl = d.imageUrl || d.url; break; }
        if (d.status === "FAILED") throw new Error(d.error || "Image generation failed");
      }
      if (!imageUrl) throw new Error("Image generation timed out.");

      const videoPrompt = [
        pkg.videoPrompt,
        `SHOT TIMELINE:\n${pkg.timeline || ""}`,
        `AUDIO:\n${pkg.audio || ""}`,
        `SCRIPT:\n${pkg.script || ""}`,
        "Continuity lock: same identity, hairstyle, wardrobe, body proportions and environment throughout.",
        "Authentic creator footage. Handheld smartphone feel, realistic autofocus, small exposure shifts, natural movement and diegetic sound. No cinematic AI gloss.",
        "No subtitles, logos or text overlays in generated footage."
      ].filter(Boolean).join("\n\n");

      const videoSubmit = await fetch("/api/track-b-video-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "seedance_2_5", imageUrl, prompt: videoPrompt, resolution: "720p", aspectRatio: "9:16", duration: Number(pkg.duration || 30) }) });
      const videoJob = await videoSubmit.json().catch(() => ({}));
      if (!videoSubmit.ok) throw new Error(videoJob.error || `Video submit failed (${videoSubmit.status})`);
      for (let i = 0; i < 140; i += 1) {
        await new Promise((r) => setTimeout(r, 5000));
        const r = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: videoJob.requestId, provider: videoJob.provider || "seedance_2_5", action: "status" }) });
        const d = await r.json().catch(() => ({}));
        if (d.status === "COMPLETED") break;
        if (["FAILED", "CANCELLED"].includes(d.status)) throw new Error(d.error || `Video ${String(d.status).toLowerCase()}`);
      }
      const result = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: videoJob.requestId, provider: videoJob.provider || "seedance_2_5", action: "result" }) }).then((r) => r.json());
      if (!result.videoUrl) throw new Error(result.error || "Video completed without a URL.");

      const { error } = await supabase.from("local_ai_jobs").update({ production_status: "video_ready", video_url: result.videoUrl, error_message: null }).eq("id", job.id);
      if (error) throw error;
      setMessage("Video ready. Next: caption it, review it, publish it, measure it.");
      await loadJobs();
      setView("production");
    } catch (error) {
      await supabase.from("local_ai_jobs").update({ production_status: "error", error_message: error.message || String(error) }).eq("id", job.id);
      setMessage(error.message || String(error));
      await loadJobs();
    } finally { setBusy(false); }
  }

  async function buildLearningLoop() {
    const completed = jobs.filter((j) => j.status === "completed" && j.job_type === "content_package");
    const winners = completed.map((j) => ({ title: j.title, status: j.production_status, result: j.result?.slice(0, 1200) }));
    setLearning({ patterns: FORMAT_LIBRARY.slice(0, 6), winners, note: "Performance feedback will become automatic when platform analytics are connected." });
  }

  return <div className="autopilot-shell">
    <header className="autopilot-topbar">
      <div>
        <div className="autopilot-kicker">CORNERSTONE AI ASSETS · QWEN AUTOPILOT</div>
        <h1>Creative that finds the opportunity, then executes it.</h1>
        <p>Trend pattern → remix → production package → video → learning loop.</p>
      </div>
      <div className="autopilot-actions">
        <a className="source-link" href={sourceUrl} target="_blank" rel="noreferrer">Open TikTok Creative Center ↗</a>
        <button className="primary" disabled={busy} onClick={scanTrends}>{busy ? "Qwen working…" : "Scan trends"}</button>
      </div>
    </header>

    <nav className="autopilot-nav">
      {[['radar','Trend Radar'],['opportunities','Opportunities'],['production','Production'],['learning','Learning']].map(([id,label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label}</button>)}
      <span className="qwen-status"><i /> Local Qwen · {MODEL.replace("mlx-community/", "")}</span>
    </nav>

    {message && <div className="autopilot-message">{message}</div>}

    {view === "radar" && <section className="radar-grid">
      <div className="panel setup-panel">
        <div className="panel-head"><span className="eyebrow">01 · CONTEXT</span><span className="micro">QWEN INPUT</span></div>
        <label>Creator<input value={personaLabel} readOnly /></label>
        <div className="two-col">
          <label>Platform<select value={platform} onChange={(e) => patch({ platform: e.target.value })}><option>TikTok</option><option>Instagram</option><option>YouTube</option><option>Facebook</option></select></label>
          <label>Goal<select value={goal} onChange={(e) => patch({ goal: e.target.value })}><option>Grow account</option><option>Increase engagement</option><option>Test a product</option><option>Generate leads</option><option>Sell a service</option></select></label>
        </div>
        <label>Niche<textarea value={niche} onChange={(e) => patch({ niche: e.target.value })} rows={3} /></label>
        <label>Trend signals / source notes<textarea value={signals} onChange={(e) => patch({ signals: e.target.value })} rows={11} /></label>
        <div className="hint">Paste a few observations or links from the live trend feed. Qwen extracts the mechanism instead of copying the creator.</div>
        <div className="two-col">
          <label>Opportunities<select value={count} onChange={(e) => patch({ count: Number(e.target.value) })}><option value={6}>6</option><option value={9}>9</option><option value={12}>12</option><option value={18}>18</option></select></label>
          <button className="primary big" disabled={busy} onClick={scanTrends}>{busy ? "Scanning…" : "Run Qwen Radar"}</button>
        </div>
      </div>

      <div className="panel system-panel">
        <div className="panel-head"><span className="eyebrow">02 · THE LOOP</span><span className="micro">AUTONOMOUS FLOW</span></div>
        <div className="loop">
          {[["TREND RADAR","Find patterns worth adapting"],["QWEN DIRECTOR","Score, rank and remix"],["PRODUCTION","Turn winners into media"],["PUBLISH","Queue the finished asset"],["LEARN","Feed performance back"]].map(([a,b],i) => <div className="loop-step" key={a}><span>{String(i+1).padStart(2,'0')}</span><div><b>{a}</b><small>{b}</small></div>{i < 4 && <em>↓</em>}</div>)}
        </div>
        <div className="why-card"><b>What changed</b><p>You are no longer starting with “what should we post?” Qwen starts from the creative mechanisms already earning attention, then makes an original version that fits Cara, Lila or both.</p></div>
      </div>
    </section>}

    {view === "opportunities" && <section className="section-wrap">
      <div className="section-head"><div><span className="eyebrow">03 · OPPORTUNITIES</span><h2>Pick the patterns worth making.</h2></div><button className="primary" disabled={busy || !selected.length} onClick={remixSelected}>Remix {selected.length || ""} selected</button></div>
      <div className="opportunity-grid">
        {!opportunities.length && <div className="empty">Run the radar first. Qwen will return ranked opportunities here.</div>}
        {opportunities.map((o) => <article className={`opportunity ${selected.includes(o.id) ? 'selected' : ''}`} key={o.id} onClick={() => toggleSelection(o.id)}>
          <div className="op-top"><span className={`score ${scoreColour(Number(o.score || 0))}`}>{Number(o.score || 0)}</span><span>{o.confidence || 'Medium'} confidence</span></div>
          <h3>{o.title}</h3>
          <p className="signal">{o.trend_signal}</p>
          <div className="tag-row"><span>{o.format}</span><span>{o.mechanism}</span><span>{o.pacing}</span></div>
          <p>{o.why_now || o.creator_adaptation}</p>
          <div className="remix-row">{toArray(o.remix_variants).slice(0, 3).map((x, i) => <div key={i}><b>{["Cara","Lila","Duo"][i]}</b>{x}</div>)}</div>
          <div className="select-foot"><span>{selected.includes(o.id) ? "Selected" : "Select"}</span><small>{o.psychology}</small></div>
        </article>)}
      </div>
    </section>}

    {view === "production" && <section className="section-wrap">
      <div className="section-head"><div><span className="eyebrow">04 · PRODUCTION</span><h2>Ideas become assets.</h2><p>Qwen writes the package. CAIG can then create the visual anchor and video.</p></div><button className="ghost" onClick={() => loadJobs()}>Refresh</button></div>
      <div className="job-list">
        {jobs.filter((j) => ["autopilot_concept","content_package"].includes(j.job_type)).map((job) => <article className="job-card" key={job.id}>
          <div className="job-head"><div><span className="job-type">{job.job_type.replace('_',' ')}</span><h3>{job.title}</h3></div><span className={`job-status ${job.status}`}>{job.status}</span></div>
          {job.result && <pre>{job.result.slice(0, 4200)}</pre>}
          <div className="job-actions">
            {job.status === 'completed' && job.job_type === 'autopilot_concept' && <button className="primary" disabled={busy} onClick={() => promoteConcept(job)}>Build production package</button>}
            {job.status === 'completed' && job.job_type === 'content_package' && job.production_status !== 'video_ready' && <button className="primary" disabled={busy} onClick={() => generateVideo(job)}>Generate video</button>}
            {job.video_url && <a className="ghost link-btn" href={job.video_url} target="_blank" rel="noreferrer">Open video ↗</a>}
            {job.error_message && <span className="error-text">{job.error_message}</span>}
          </div>
        </article>)}
        {!jobs.filter((j) => ["autopilot_concept","content_package"].includes(j.job_type)).length && <div className="empty">Your remixed concepts and production jobs will appear here.</div>}
      </div>
    </section>}

    {view === "learning" && <section className="section-wrap">
      <div className="section-head"><div><span className="eyebrow">05 · LEARNING LOOP</span><h2>Teach Qwen what wins.</h2><p>The final layer is performance feedback. Until platform analytics are connected, CAIG keeps the loop ready and shows what is in production.</p></div><button className="primary" onClick={buildLearningLoop}>Build learning snapshot</button></div>
      {learning && <div className="learning-grid"><div className="panel"><span className="eyebrow">CURRENT PATTERN BANK</span><div className="pattern-bank">{learning.patterns.map((p) => <span key={p}>{p}</span>)}</div></div><div className="panel"><span className="eyebrow">RECENT PRODUCTION</span>{learning.winners.map((w, i) => <div className="learning-row" key={i}><b>{w.title}</b><span>{w.status || 'not started'}</span></div>)}</div><div className="panel full"><span className="eyebrow">NEXT CONNECTION</span><p>Connect Instagram/TikTok/YouTube metrics → calculate retention, saves, shares, comments, profile visits and conversion by concept → write winning mechanisms back into the pattern library → let Qwen overweight those mechanisms in the next radar cycle.</p></div></div>}
      {!learning && <div className="empty">Build a learning snapshot to see the current loop.</div>}
    </section>}
  </div>;
}
