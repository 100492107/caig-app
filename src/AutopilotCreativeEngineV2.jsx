import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const MODEL = "mlx-community/Qwen3-8B-4bit";

const PERSONAS = {
  cara: { name: "Cara", note: "Direct · dry · disciplined · British" },
  lila: { name: "Lila", note: "Measured · warm · observant · understated" },
  duo: { name: "Cara + Lila", note: "Contrast · chemistry · shared moments" },
};

const PLATFORM_RULES = {
  TikTok: "Fast hook, visible action immediately, conversational language, one clear idea, native pacing.",
  Instagram: "Strong first frame, visual identity, simple narrative, captions that sound human and saveable.",
  YouTube: "Immediate hook, then setup → tension → payoff. Shorts should still feel like a complete story.",
  Facebook: "Shareability, opinion, relatable observation, practical or taggable premise.",
};

const FORMATS = [
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

function parseJson(value) {
  const text = String(value || "").trim().replace(/```json|```/gi, "").trim();
  try { return JSON.parse(text); } catch {}
  const start = text.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned no JSON.");
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error("Qwen returned incomplete JSON.");
}

function jobProgress(job) {
  if (!job) return { pct: 0, label: "Waiting" };
  if (job.status === "completed") return { pct: 100, label: "Complete" };
  if (job.status === "error") return { pct: 100, label: "Error" };
  if (job.status === "processing") return { pct: 55, label: "Qwen is thinking" };
  return { pct: 12, label: "Queued" };
}

function PipelineBar({ steps, activeIndex, error }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 6 }}>
        {steps.map((step, index) => {
          const done = index < activeIndex || activeIndex === steps.length - 1;
          const active = index === activeIndex;
          return <div key={step} style={{ minWidth: 0 }}>
            <div style={{ height: 7, borderRadius: 99, background: done ? "#d4af37" : active ? "#8b83ff" : "#252a39", boxShadow: active ? "0 0 16px rgba(139,131,255,.3)" : "none" }} />
            <div style={{ marginTop: 5, fontSize: 9, color: error && active ? "#ff8e8e" : active || done ? "#f4d77e" : "#6f7690", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{step}</div>
          </div>;
        })}
      </div>
    </div>
  );
}

function Card({ children }) {
  return <div style={{ background: "#0e1017", border: "1px solid #262b3b", borderRadius: 18, padding: 18 }}>{children}</div>;
}

export default function AutopilotCreativeEngineV2() {
  const [persona, setPersona] = useState("duo");
  const [platform, setPlatform] = useState("TikTok");
  const [goal, setGoal] = useState("Grow account");
  const [niche, setNiche] = useState("Quiet ambition · style · everyday life · mindset · money · calm luxury");
  const [count, setCount] = useState(12);
  const [signals, setSignals] = useState("");
  const [jobs, setJobs] = useState([]);
  const [view, setView] = useState("radar");
  const [selected, setSelected] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState({});

  const creator = PERSONAS[persona]?.name || PERSONAS.duo.name;
  const trendJob = useMemo(() => jobs.find((j) => j.job_type === "trend_scan"), [jobs]);
  const conceptJobs = useMemo(() => jobs.filter((j) => j.job_type === "autopilot_concept"), [jobs]);
  const productionJobs = useMemo(() => jobs.filter((j) => j.job_type === "content_package"), [jobs]);

  async function loadJobs() {
    const { data } = await supabase.from("local_ai_jobs")
      .select("id,title,job_type,status,result,error_message,created_at,completed_at,persona_id,production_status,video_url,captioned_video_url")
      .in("job_type", ["trend_scan", "autopilot_concept", "content_package"])
      .order("created_at", { ascending: false })
      .limit(60);
    setJobs(data || []);
    const latestTrend = (data || []).find((j) => j.job_type === "trend_scan" && j.status === "completed");
    if (latestTrend?.result) {
      try {
        const parsed = parseJson(latestTrend.result);
        if (Array.isArray(parsed.opportunities)) setOpportunities(parsed.opportunities);
      } catch {}
    }
  }

  useEffect(() => {
    loadJobs();
    const timer = setInterval(loadJobs, 2500);
    return () => clearInterval(timer);
  }, []);

  async function queueJob({ jobType, title, userPrompt, systemPrompt, personaId = persona, maxTokens = 3000 }) {
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
    await loadJobs();
    return data.id;
  }

  async function scanTrends() {
    setBusy(true);
    setMessage("Qwen is scanning the signal layer and building ranked opportunities…");
    try {
      const context = PERSONAS[persona].note;
      await queueJob({
        jobType: "trend_scan",
        title: `Trend Radar · ${platform} · ${creator}`,
        maxTokens: 4300,
        systemPrompt: `You are Cornerstone AI Assets' autonomous Creative Director. Start from mechanisms that already earn attention: hooks, formats, pacing, psychology, visual behaviour and narrative structure. Do not copy an exact creator, script or protected creative. Never invent current performance figures or pretend you have live internet access. Return JSON only.`,
        userPrompt: `PLATFORM: ${platform}\nGOAL: ${goal}\nCREATOR: ${context}\nNICHE: ${niche}\nTARGET OPPORTUNITIES: ${count}\nPLATFORM RULES: ${PLATFORM_RULES[platform]}\nFORMAT LIBRARY: ${FORMATS.join(", ")}\n\nLIVE/SOURCE SIGNALS:\n${signals || "No live signal pasted. Use mechanism-first ideation and label confidence conservatively."}\n\nReturn {"opportunities":[...]}. Each must contain: id,title,trend_signal,mechanism,hook,format,pacing,psychology,why_now,creator_adaptation,score,confidence,production_notes,remix_variants. score 0-100. confidence Low/Medium/High. remix_variants must include Cara, Lila and Cara + Lila variants. Do not claim something is viral without evidence.`,
      });
      setView("radar");
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  function toggle(id) { setSelected((items) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id]); }

  async function remix() {
    const picks = opportunities.filter((item) => selected.includes(item.id));
    if (!picks.length) return;
    setBusy(true);
    setMessage(`Qwen is remaking ${picks.length} pattern${picks.length === 1 ? "" : "s"} for ${creator}…`);
    try {
      for (const pick of picks) {
        await queueJob({
          jobType: "autopilot_concept",
          title: `Remix · ${pick.title}`,
          maxTokens: 3300,
          systemPrompt: `You are the autonomous Creative Director for Cornerstone AI Assets. Preserve the mechanism, not the source execution. Make the idea feel native to ${creator}. Return JSON only.`,
          userPrompt: `PLATFORM: ${platform}\nGOAL: ${goal}\nCREATOR: ${creator}\nNICHE: ${niche}\nPATTERN:\n${JSON.stringify(pick)}\n\nReturn {"concept":{"title","creator","hook","script","format","shot_list","visual_prompt","caption","cta","duration","edit_plan","why_it_should_work"}}.`,
          personaId: persona === "duo" ? "cara_lila" : persona,
        });
      }
      setView("concepts");
      setSelected([]);
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  async function promote(job) {
    const parsed = parseJson(job.result);
    const concept = parsed.concept || parsed;
    setBusy(true);
    setMessage(`Qwen is writing the machine-ready production package for ${job.title}…`);
    try {
      await queueJob({
        jobType: "content_package",
        title: `Produce · ${job.title}`,
        maxTokens: 3400,
        personaId: job.persona_id || (persona === "duo" ? "cara_lila" : persona),
        systemPrompt: `You are the production director for Cornerstone AI Assets. Return JSON only. Build a production-ready package for image, carousel and short-form video. The video version must contain hook, script, visual prompt, shot timeline, audio, caption, CTA, edit notes and negative constraints.`,
        userPrompt: `PLATFORM: ${platform}\nCREATOR: ${creator}\nAPPROVED CONCEPT:\n${JSON.stringify(concept)}\n\nReturn {"package":{"hook","script","videoPrompt","timeline","audio","caption","cta","editNotes","negativeConstraints","duration","carouselSlides"}}. carouselSlides should contain 5-7 slide objects with headline, body and visualPrompt.`,
      });
      setView("production");
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  async function updateMedia(id, patch) { setMedia((s) => ({ ...s, [id]: { ...(s[id] || {}), ...patch } })); }

  async function pollImage(requestId, statusUrl, resultUrl, jobId, label) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      await new Promise((r) => setTimeout(r, 3000));
      const response = await fetch("/api/generate-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, type: "image", statusUrl, resultUrl }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Image generation failed (${response.status})`);
      await updateMedia(jobId, { label, pct: Math.min(96, 25 + attempt), status: data.status || "WORKING" });
      if (data.status === "COMPLETED") return data.imageUrl || data.url;
      if (data.status === "FAILED") throw new Error(data?.error || "Image generation failed");
    }
    throw new Error("Image generation timed out.");
  }

  async function generateImage(job, carousel = false) {
    setBusy(true);
    await updateMedia(job.id, { label: carousel ? "Generating carousel" : "Generating image", pct: 5, status: "STARTING" });
    try {
      const parsed = parseJson(job.result);
      const pkg = parsed.package || parsed;
      const basePrompt = pkg.videoPrompt || pkg.visualPrompt || "photorealistic social content scene";
      const slides = carousel ? (Array.isArray(pkg.carouselSlides) && pkg.carouselSlides.length ? pkg.carouselSlides.slice(0, 7) : Array.from({ length: 5 }, (_, i) => ({ headline: `Slide ${i + 1}`, body: pkg.caption || "", visualPrompt: basePrompt }))) : [{ headline: pkg.hook || "", body: pkg.caption || "", visualPrompt: basePrompt }];
      const urls = [];
      for (let i = 0; i < slides.length; i += 1) {
        await updateMedia(job.id, { label: carousel ? `Carousel slide ${i + 1}/${slides.length}` : "Generating image", pct: Math.round((i / slides.length) * 85), status: "GENERATING" });
        const prompt = `${slides[i].visualPrompt || basePrompt}. Creator: ${creator}. Vertical 4:5 social frame. Authentic phone/lifestyle content, natural skin texture, believable environment, no text generated inside image, no watermark.`;
        const submit = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: { subject: prompt, photo_idea: prompt }, photo_idea: prompt, hook: slides[i].headline || pkg.hook || "", caption: slides[i].body || pkg.caption || "", personaId: job.persona_id || (persona === "duo" ? "cara_lila" : persona) }) });
        const data = await submit.json().catch(() => ({}));
        if (!submit.ok || !data.requestId) throw new Error(data?.error || `Image submit failed (${submit.status})`);
        urls.push(await pollImage(data.requestId, data.statusUrl, data.resultUrl, job.id, carousel ? `Slide ${i + 1}/${slides.length}` : "Image"));
      }
      await updateMedia(job.id, { pct: 100, status: "COMPLETE", urls });
      setMessage(carousel ? `Carousel ready: ${urls.length} slides.` : "Image ready.");
    } catch (error) {
      await updateMedia(job.id, { pct: 100, status: "ERROR", error: error.message || String(error) });
      setMessage(error.message || String(error));
    } finally { setBusy(false); }
  }

  async function generateVideo(job) {
    setBusy(true);
    await updateMedia(job.id, { label: "Preparing video", pct: 8, status: "STARTING" });
    try {
      const parsed = parseJson(job.result);
      const pkg = parsed.package || parsed;
      const personaId = job.persona_id || (persona === "duo" ? "cara_lila" : persona);
      const imagePrompt = `${pkg.videoPrompt || "Authentic social video scene"}. ${creator}. Vertical 9:16. Identity continuity from persona references. Natural smartphone capture, believable environment, real skin texture, realistic movement. No subtitles or text overlays.`;
      const imageSubmit = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: { subject: imagePrompt, photo_idea: imagePrompt }, photo_idea: imagePrompt, hook: pkg.hook || "", caption: pkg.caption || "", personaId }) });
      const imageJob = await imageSubmit.json().catch(() => ({}));
      if (!imageSubmit.ok || !imageJob.requestId) throw new Error(imageJob?.error || `Visual anchor failed (${imageSubmit.status})`);
      const imageUrl = await pollImage(imageJob.requestId, imageJob.statusUrl, imageJob.resultUrl, job.id, "Visual anchor");
      await updateMedia(job.id, { pct: 38, label: "Visual anchor ready", status: "VIDEO SUBMIT" });

      const videoPrompt = [pkg.videoPrompt, `SHOT TIMELINE:\n${pkg.timeline || ""}`, `AUDIO:\n${pkg.audio || ""}`, `SCRIPT:\n${pkg.script || ""}`, "Continuity lock: same identity, hairstyle, wardrobe, body proportions and environment throughout.", "Authentic creator footage: handheld smartphone feel, realistic autofocus and natural diegetic audio. No cinematic AI gloss. No subtitles, logos or watermarks."].filter(Boolean).join("\n\n");
      const submit = await fetch("/api/track-b-video-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "seedance", imageUrl, prompt: videoPrompt, resolution: "720p", aspectRatio: "9:16", duration: Number(pkg.duration || 10) }) });
      const videoJob = await submit.json().catch(() => ({}));
      if (!submit.ok || !videoJob.requestId) throw new Error(videoJob?.error || `Video submit failed (${submit.status})`);

      for (let i = 0; i < 120; i += 1) {
        await new Promise((r) => setTimeout(r, 5000));
        const r = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: videoJob.requestId, provider: videoJob.provider || "fal", providerKey: videoJob.providerKey || "seedance", action: "status" }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || `Video status failed (${r.status})`);
        await updateMedia(job.id, { label: "Generating video", pct: Math.min(92, 42 + Math.round(i * 0.45)), status: d.status || "WORKING" });
        if (d.status === "COMPLETED") break;
        if (["FAILED", "CANCELLED"].includes(d.status)) throw new Error(d?.error || `Video generation ${String(d.status).toLowerCase()}`);
      }

      const resultResponse = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: videoJob.requestId, provider: videoJob.provider || "fal", providerKey: videoJob.providerKey || "seedance", action: "result" }) });
      const result = await resultResponse.json().catch(() => ({}));
      if (!resultResponse.ok || !result.videoUrl) throw new Error(result?.error || "Video finished without a URL");
      await updateMedia(job.id, { pct: 94, label: "Video ready · queuing captions", status: "CAPTION QUEUE", videoUrl: result.videoUrl });

      const caption = await supabase.from("caption_jobs").insert({
        title: `${job.title} · captions`,
        source_url: result.videoUrl,
        transcript: pkg.script || "",
        hook: pkg.hook || "",
        style: personaId === "lila" ? "lila_minimal" : "cara_editorial",
        aspect_ratio: "9:16",
        position: "lower_center",
        options: { auto_transcribe: true, punch_in: true, source_job_id: job.id },
        status: "queued",
      }).select("id").single();
      if (caption.error) throw new Error(`Video ready, but caption queue failed: ${caption.error.message}`);
      await updateMedia(job.id, { pct: 100, label: "Video + captions queued", status: "READY", captionJobId: caption.data.id, videoUrl: result.videoUrl });
      await supabase.from("local_ai_jobs").update({ production_status: "caption_queued", video_url: result.videoUrl, caption_job_id: caption.data.id }).eq("id", job.id);
      setMessage("Video is ready and the caption worker has been queued.");
    } catch (error) {
      await updateMedia(job.id, { pct: 100, status: "ERROR", error: error.message || String(error) });
      setMessage(error.message || String(error));
    } finally { setBusy(false); }
  }

  const stage = view === "radar" ? 0 : view === "concepts" ? 1 : 2;

  return <div style={{ background: "#07080c", color: "#eef1f7", minHeight: "100vh", padding: "28px 30px 50px" }}>
    <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 18 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#d4af37", fontWeight: 900, letterSpacing: ".18em", fontSize: 10 }}>QWEN AUTOPILOT</div>
            <h1 style={{ margin: "8px 0 5px", fontSize: 32, letterSpacing: "-.04em" }}>Find the opportunity. Remix it. Execute it.</h1>
            <p style={{ margin: 0, color: "#81899b" }}>Trend mechanism → Qwen creative director → image / carousel / video → captions.</p>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            {["radar", "concepts", "production"].map((name, i) => <button key={name} type="button" onClick={() => setView(name)} style={{ border: `1px solid ${view === name ? "#d4af37" : "#303548"}`, background: view === name ? "rgba(212,175,55,.1)" : "#111520", color: view === name ? "#f7d77b" : "#a9b0c1", borderRadius: 999, padding: "8px 12px", fontWeight: 800, cursor: "pointer" }}>{i + 1}. {name}</button>)}
          </div>
        </div>
        <div style={{ marginTop: 20 }}><PipelineBar steps={["Trend Radar", "Remix Concepts", "Production"]} activeIndex={stage} /></div>
      </Card>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
          <select value={persona} onChange={(e) => setPersona(e.target.value)} style={field}><option value="cara">Cara</option><option value="lila">Lila</option><option value="duo">Cara + Lila</option></select>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={field}><option>TikTok</option><option>Instagram</option><option>YouTube</option><option>Facebook</option></select>
          <select value={goal} onChange={(e) => setGoal(e.target.value)} style={field}><option>Grow account</option><option>Engagement</option><option>Profile visits</option><option>Conversions</option></select>
          <input value={niche} onChange={(e) => setNiche(e.target.value)} style={field} placeholder="Niche / world" />
        </div>
        <textarea value={signals} onChange={(e) => setSignals(e.target.value)} placeholder="Paste current trend observations, links, hooks or screenshots notes here. Qwen will extract mechanisms rather than copy them." style={{ ...field, marginTop: 10, minHeight: 90, resize: "vertical" }} />
        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 11, color: "#858da2" }}>Opportunities <input type="number" min="4" max="20" value={count} onChange={(e) => setCount(Math.max(4, Math.min(20, Number(e.target.value) || 12)))} style={{ ...field, width: 72, display: "inline-block", marginLeft: 6 }} /></label>
          <button type="button" disabled={busy} onClick={scanTrends} style={primary}>{busy ? "Working…" : "Scan with Qwen"}</button>
          <span style={{ color: "#71798f", fontSize: 11 }}>{message}</span>
        </div>
      </Card>

      {view === "radar" && <Card>
        <div style={sectionHead}><div><div style={kicker}>TREND RADAR</div><h2 style={h2}>Opportunities, not random ideas.</h2></div><div style={{ color: "#6f7690", fontSize: 11 }}>{trendJob ? `${jobProgress(trendJob).label} · ${jobProgress(trendJob).pct}%` : "Ready"}</div></div>
        {trendJob && <div style={{ margin: "14px 0" }}><Progress value={jobProgress(trendJob).pct} label={jobProgress(trendJob).label} /></div>}
        <div style={{ display: "grid", gap: 10 }}>
          {opportunities.map((item) => <div key={item.id} style={{ border: `1px solid ${selected.includes(item.id) ? "#d4af37" : "#252a39"}`, background: selected.includes(item.id) ? "rgba(212,175,55,.06)" : "#0b0d13", borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={kicker}>{item.format || "PATTERN"}</div><h3 style={{ margin: "5px 0" }}>{item.title}</h3><div style={{ color: "#9299ab", fontSize: 12 }}>{item.mechanism || item.why_now}</div></div><div style={{ color: "#f2d36d", fontSize: 20, fontWeight: 900 }}>{item.score ?? "—"}</div></div>
            <div style={{ marginTop: 10, color: "#dfe4ee", fontSize: 13 }}>{item.hook}</div>
            <div style={{ marginTop: 10, color: "#737c91", fontSize: 11 }}>Psychology: {item.psychology || "—"} · Confidence: {item.confidence || "—"}</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}><button type="button" onClick={() => toggle(item.id)} style={selected.includes(item.id) ? primary : button}>{selected.includes(item.id) ? "Selected" : "Select"}</button><span style={{ color: "#697187", fontSize: 11, alignSelf: "center" }}>Remix: {item.creator_adaptation || "native to the chosen creator"}</span></div>
          </div>)}
          {!opportunities.length && <div style={{ color: "#6e768c", padding: 20, border: "1px dashed #2a3040", borderRadius: 12 }}>Run Scan with Qwen to build the radar.</div>}
        </div>
        {!!selected.length && <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#8b93a6", fontSize: 12 }}>{selected.length} selected</span><button type="button" disabled={busy} onClick={remix} style={primary}>Remix selected →</button></div>}
      </Card>}

      {view === "concepts" && <Card>
        <div style={sectionHead}><div><div style={kicker}>QWEN REMIXES</div><h2 style={h2}>Original concepts built from the mechanism.</h2></div></div>
        <div style={{ display: "grid", gap: 12 }}>
          {conceptJobs.map((job) => { const prog = jobProgress(job); let concept = null; try { concept = job.result ? (parseJson(job.result).concept || parseJson(job.result)) : null; } catch {} return <div key={job.id} style={{ border: "1px solid #252a39", borderRadius: 14, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={kicker}>REMIX CONCEPT</div><h3 style={{ margin: "5px 0" }}>{job.title}</h3></div><div style={{ color: prog.pct >= 100 && job.status === "completed" ? "#75ddb5" : "#8d96ab", fontSize: 11 }}>{prog.label} · {prog.pct}%</div></div><Progress value={prog.pct} label={prog.label} />{concept && <div style={{ marginTop: 12, display: "grid", gap: 6 }}><strong>{concept.title}</strong><div style={{ color: "#d6dbe5", fontSize: 13 }}>{concept.hook}</div><div style={{ color: "#7c8498", fontSize: 11 }}>{concept.format} · {concept.duration || "—"}s</div><button type="button" disabled={busy} onClick={() => promote(job)} style={{ ...primary, justifySelf: "start" }}>Build production package →</button></div>}</div> })}
          {!conceptJobs.length && <div style={{ color: "#6e768c" }}>No remixes yet. Go back to Trend Radar and select an opportunity.</div>}
        </div>
      </Card>}

      {view === "production" && <Card>
        <div style={sectionHead}><div><div style={kicker}>PRODUCTION BAY</div><h2 style={h2}>One concept. Three outputs.</h2></div></div>
        <div style={{ display: "grid", gap: 14 }}>
          {productionJobs.map((job) => { let pkg = null; try { pkg = job.result ? (parseJson(job.result).package || parseJson(job.result)) : null; } catch {} const m = media[job.id] || { pct: 0, label: job.status === "completed" ? "Choose an output" : job.status, status: job.status }; return <div key={job.id} style={{ border: "1px solid #252a39", borderRadius: 16, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div style={kicker}>CONTENT PACKAGE</div><h3 style={{ margin: "5px 0" }}>{job.title}</h3></div><div style={{ color: m.status === "ERROR" ? "#ff9696" : "#7fdbb7", fontSize: 11 }}>{m.label || m.status}{m.pct ? ` · ${m.pct}%` : ""}</div></div><Progress value={m.pct || 0} label={m.label || "Qwen"} />{pkg && <><div style={{ marginTop: 12, color: "#aeb6c8", fontSize: 12 }}>{pkg.hook}</div><div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" disabled={busy} onClick={() => generateVideo(job)} style={primary}>Generate video</button><button type="button" disabled={busy} onClick={() => generateImage(job, false)} style={button}>Generate image</button><button type="button" disabled={busy} onClick={() => generateImage(job, true)} style={button}>Generate carousel</button></div></>}{m.error && <div style={{ marginTop: 10, color: "#ff9696", fontSize: 11 }}>{m.error}</div>}{m.urls?.length > 0 && <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: `repeat(${Math.min(4, m.urls.length)}, minmax(0,1fr))`, gap: 8 }}>{m.urls.map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Generated ${i + 1}`} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 10, border: "1px solid #30364a" }} /></a>)}</div>}{m.videoUrl && <video controls playsInline src={m.videoUrl} style={{ width: "100%", borderRadius: 12, marginTop: 14, background: "#000" }} />}</div> })}
          {!productionJobs.length && <div style={{ color: "#6e768c" }}>No production packages yet.</div>}
        </div>
      </Card>}

      <Card><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><div style={kicker}>PIPELINE STATUS</div><div style={{ color: "#8a92a6", fontSize: 12 }}>Qwen → creative package → image / carousel / video → local captions</div></div><div style={{ color: "#6f7790", fontSize: 11 }}>{jobs.length} jobs tracked</div></div></Card>
    </div>
  </div>;
}

const field = { width: "100%", boxSizing: "border-box", background: "#111520", color: "#eef1f7", border: "1px solid #2a3040", borderRadius: 10, padding: "10px 11px", outline: "none" };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };
const kicker = { color: "#d4af37", fontWeight: 900, letterSpacing: ".16em", fontSize: 9 };
const h2 = { margin: "6px 0 0", fontSize: 22, letterSpacing: "-.04em" };
const sectionHead = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", marginBottom: 14 };
function Progress({ value, label }) { return <div style={{ marginTop: 9 }}><div style={{ height: 8, background: "#171b26", borderRadius: 99, overflow: "hidden", border: "1px solid #242a3a" }}><div style={{ width: `${Math.max(0, Math.min(100, value || 0))}%`, height: "100%", background: value >= 100 ? "#6fd5af" : "linear-gradient(90deg,#8b83ff,#d4af37)", transition: "width .35s ease" }} /></div><div style={{ marginTop: 4, color: "#6f7790", fontSize: 9 }}>{label}</div></div>; }
