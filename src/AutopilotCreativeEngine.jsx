import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const MODEL = "mlx-community/Qwen3-8B-4bit";
const PERSONAS = {
  cara: { name: "Cara", note: "Direct · dry · disciplined · British" },
  lila: { name: "Lila", note: "Measured · warm · observant · understated" },
  cara_lila: { name: "Cara + Lila", note: "Two distinct personalities · contrast · chemistry · shared moments" },
  duo: { name: "Cara + Lila", note: "Two distinct personalities · contrast · chemistry · shared moments" },
};
const PLATFORMS = ["TikTok", "Instagram", "YouTube", "Facebook"];
const DEFAULT_NICHE = "Quiet ambition · style · everyday life · mindset · money · calm luxury";

const FORMAT_LIBRARY = [
  { id: "green_screen", label: "Green Screen", description: "Creator reacts or talks over a supporting visual. Hook first, context second, payoff last.", execution: "Use a strong background visual behind the creator. Keep creator large enough to read on mobile. Never make the supporting image unrelated to the spoken point." },
  { id: "slideshow", label: "Slideshow", description: "Fast sequence of stills with escalating visual proof and simple text beats.", execution: "3–7 connected frames. Each frame advances the same idea. Avoid random photo dumps. Keep visual continuity and consistent creator identity." },
  { id: "wall_of_text", label: "Wall of Text", description: "One visual or short loop carries a clear block of readable social-native text.", execution: "One dominant visual with high-contrast readable text. The text is the hook or story itself. Keep it concise enough to scan on mobile." },
  { id: "talking_head", label: "Talking Head", description: "Direct-to-camera hook with conversational delivery and a clear payoff.", execution: "Creator speaks naturally to camera. Minimal staging. The opening sentence must work with sound off via on-screen hook." },
  { id: "pov", label: "POV", description: "First-person scene that makes the viewer feel inside the moment.", execution: "Camera behaves like the viewer's perspective. One believable action. The scene must visually support the spoken or written POV." },
  { id: "broll_caption", label: "B-roll + Captions", description: "Lifestyle footage or stills with a narration/caption layer carrying the story.", execution: "Use visually useful B-roll rather than filler. Every shot should support one line of the narrative." },
  { id: "duo_banter", label: "Duo Banter", description: "Cara + Lila contrast creates the reason to watch.", execution: "Both people remain distinct characters with different attitudes. Dialogue should feel observed rather than scripted." },
  { id: "carousel", label: "Carousel", description: "A connected 3–7 slide story, list, proof sequence or progression.", execution: "Slide 1 earns the swipe. Middle slides deepen the idea. Final slide resolves it or gives the viewer a reason to save/share." },
  { id: "single_image", label: "Single Image", description: "One strong still with a social-native caption or headline.", execution: "The image must carry the idea without a collage, split screen or visual gimmick unless specifically required." },
];

const FORMAT_MAP = Object.fromEntries(FORMAT_LIBRARY.map((x) => [x.id, x]));
const FORMAT_LABELS = FORMAT_LIBRARY.map((x) => x.label).join(", ");

const baseField = { width: "100%", boxSizing: "border-box", background: "#10131c", color: "#eef1f7", border: "1px solid #2a3042", borderRadius: 10, padding: "10px 12px" };
const primary = { background: "#d4af37", color: "#08090d", border: "1px solid #d4af37", borderRadius: 10, padding: "11px 14px", fontWeight: 900, cursor: "pointer" };
const secondary = { background: "#141924", color: "#eef1f7", border: "1px solid #30374b", borderRadius: 10, padding: "11px 14px", fontWeight: 800, cursor: "pointer" };

function parseJson(value) {
  const text = String(value || "").trim().replace(/```json|```/gi, "").trim();
  try { return JSON.parse(text); } catch {}
  const start = text.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned no JSON result.");
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

function personaFromJob(job) {
  const id = String(job?.persona_id || "").toLowerCase();
  if (id.includes("cara_lila") || id === "duo" || id.includes("cara+lila")) return PERSONAS.cara_lila;
  if (id.includes("lila")) return PERSONAS.lila;
  return PERSONAS.cara;
}

function personaIdFromSelection(value) {
  if (value === "duo") return "cara_lila";
  return value;
}

function formatFromJob(job, pkg) {
  const raw = pkg?.formatId || pkg?.format || pkg?.outputFormat || job?.format_id || "";
  const key = String(raw).toLowerCase().replace(/\s+/g, "_");
  return FORMAT_MAP[key] || FORMAT_MAP["single_image"];
}

function jobProgress(job) {
  if (!job) return { pct: 0, label: "Waiting" };
  if (job.status === "error") return { pct: 100, label: "Error" };
  if (job.status === "processing") return { pct: 55, label: "Qwen is working" };
  if (job.status === "completed") return { pct: 100, label: "Complete" };
  return { pct: 12, label: "Queued" };
}

function Progress({ value, label }) {
  return <div style={{ marginTop: 10 }}>
    <div style={{ height: 7, background: "#222737", borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${Math.max(0, Math.min(100, value || 0))}%`, height: "100%", background: "linear-gradient(90deg,#d4af37,#7cddbd)" }} /></div>
    <div style={{ marginTop: 5, fontSize: 10, color: "#7e879c" }}>{label} · {Math.round(value || 0)}%</div>
  </div>;
}

function Card({ children }) { return <div style={{ background: "#0e1118", border: "1px solid #252b3b", borderRadius: 18, padding: 18 }}>{children}</div>; }

function sceneLockFromPackage(pkg) {
  const s = pkg?.sceneLock || {};
  return {
    location: s.location || "private lived-in interior",
    timeOfDay: s.timeOfDay || "obey the concept exactly",
    lighting: s.lighting || "lighting must match the specified time of day",
    action: s.action || "one simple believable human action",
    props: s.props || "only props explicitly required by the concept",
    wardrobe: s.wardrobe || "consistent with the creator reference and concept",
    composition: s.composition || "single continuous camera frame",
    avoid: s.avoid || "unrelated locations, dealerships, vehicles, daylight when night is specified, split-screen, collage, duplicated props, impossible hands, impossible object interactions, unnatural posing",
  };
}

function scenePrompt(pkg, creator, ratio) {
  const s = sceneLockFromPackage(pkg);
  const format = formatFromJob(null, pkg);
  return [
    pkg?.imagePrompt || pkg?.visualPrompt || pkg?.videoPrompt || "Authentic creator moment",
    `CREATOR IDENTITY LOCK: ${creator}`,
    `FORMAT LOCK: ${format.label} — ${format.execution}`,
    `LOCATION LOCK: ${s.location}`,
    `TIME LOCK: ${s.timeOfDay}`,
    `LIGHTING LOCK: ${s.lighting}`,
    `ACTION LOCK: ${s.action}`,
    `PROP LOCK: ${s.props}`,
    `WARDROBE LOCK: ${s.wardrobe}`,
    `COMPOSITION LOCK: ${s.composition}`,
    `NEGATIVE SCENE LOCK: ${s.avoid}`,
    `OUTPUT: ${ratio}. One coherent physical world.`,
    "HARD RULE: do not add a location, vehicle, prop, person, time-of-day or action not specified by the scene contract.",
    "NO split-screen, no diptych, no collage, no panels, no before/after layout, no montage in a single still.",
    "NORMAL HUMAN BEHAVIOUR: believable posture, believable hand/object interaction, anatomically plausible hands, consistent props, no duplicated cups/phones, no objects intersecting fingers, no impossible simultaneous actions.",
    "If the scene says night or early morning, there must be no daylight, sunbeams, bright blue sky or daytime exterior light. Windows should read dark unless the concept explicitly requires exterior light.",
    "Do not introduce cars, dealerships, showrooms, gyms, offices, restaurants or other locations unless the scene explicitly requires them.",
    "Photorealistic creator content, natural skin, believable lens behaviour, subtle imperfections, no text or watermark generated inside the image.",
  ].join("\n");
}

async function storeGeneratedImage({ url, requestId, postId, slideIndex, personaName, jobId, formatId }) {
  const response = await fetch("/api/store-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ falUrl: url, requestId: requestId || `qwen_${Date.now()}`, postId, slideIndex, personaName, formatId, metadata: { source_job_id: jobId, source: "qwen_autopilot", format_id: formatId } }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.publicUrl) throw new Error(data?.error || "Generated image could not be saved permanently.");
  return data.publicUrl;
}

async function persistJobMedia(job, patch, historyEntry = null) {
  const current = await supabase.from("local_ai_jobs").select("result").eq("id", job.id).maybeSingle();
  if (current.error) throw current.error;
  let parsed = {};
  try { parsed = parseJson(current.data?.result || "{}"); } catch { parsed = {}; }
  const media = { ...(parsed.media || {}), ...patch, updatedAt: new Date().toISOString() };
  if (historyEntry) media.imageHistory = [...(media.imageHistory || []), historyEntry];
  parsed.media = media;
  const { error } = await supabase.from("local_ai_jobs").update({ result: JSON.stringify(parsed), production_status: "media_saved" }).eq("id", job.id);
  if (error) throw error;
  return media;
}

export default function AutopilotCreativeEngineV3() {
  const [persona, setPersona] = useState("duo");
  const [platform, setPlatform] = useState("TikTok");
  const [goal, setGoal] = useState("Grow account");
  const [niche, setNiche] = useState(DEFAULT_NICHE);
  const [signals, setSignals] = useState("");
  const [count, setCount] = useState(12);
  const [view, setView] = useState("radar");
  const [selected, setSelected] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [media, setMedia] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const creator = PERSONAS[personaIdFromSelection(persona)]?.name || PERSONAS.cara_lila.name;
  const conceptJobs = useMemo(() => jobs.filter((j) => j.job_type === "autopilot_concept"), [jobs]);
  const productionJobs = useMemo(() => jobs.filter((j) => j.job_type === "content_package"), [jobs]);
  const trendJob = useMemo(() => jobs.find((j) => j.job_type === "trend_scan"), [jobs]);

  async function loadJobs() {
    const { data } = await supabase.from("local_ai_jobs")
      .select("id,title,job_type,model,status,result,error_message,created_at,completed_at,persona_id,production_status,video_url,caption_job_id,captioned_video_url")
      .in("job_type", ["trend_scan", "autopilot_concept", "content_package", "caption_package", "carousel_copy"])
      .order("created_at", { ascending: false }).limit(100);
    const rows = data || [];
    setJobs(rows);

    const restored = {};
    for (const row of rows) {
      try {
        const parsed = parseJson(row.result || "{}");
        const saved = parsed?.media;
        if (saved && (saved.imageUrl || Array.isArray(saved.imageUrls))) restored[row.id] = { ...saved, pct: 100, label: "Saved media", status: "READY", saved: true, transient: false };
      } catch {}
    }
    setMedia((existing) => {
      const next = { ...existing };
      for (const [id, value] of Object.entries(restored)) if (!next[id]?.transient) next[id] = { ...(next[id] || {}), ...value };
      return next;
    });

    const latestTrend = rows.find((j) => j.job_type === "trend_scan" && j.status === "completed");
    if (latestTrend?.result) { try { const parsed = parseJson(latestTrend.result); if (Array.isArray(parsed.opportunities)) setOpportunities(parsed.opportunities); } catch {} }
  }

  useEffect(() => { loadJobs(); const timer = setInterval(loadJobs, 2500); return () => clearInterval(timer); }, []);

  async function queueJob({ jobType, title, systemPrompt, userPrompt, personaId = persona, formatId = null, maxTokens = 3200 }) {
    const { data, error } = await supabase.from("local_ai_jobs").insert({
      title, job_type: jobType, model: MODEL, persona_id: personaId, system_prompt: systemPrompt, user_prompt: userPrompt,
      options: { max_tokens: maxTokens, temperature: 0.55, format_id: formatId }, status: "queued", production_status: "not_started",
    }).select("id").single();
    if (error) throw error;
    return data.id;
  }

  async function scanTrends() {
    setBusy(true); setMessage("Qwen is scanning the signal layer and ranking mechanisms…");
    try {
      const selectedPersona = PERSONAS[personaIdFromSelection(persona)] || PERSONAS.cara_lila;
      const systemPrompt = `You are the autonomous Creative Director for Cornerstone AI Assets. Think like a high-performing short-form content engine. Start from proven creative mechanisms and format structures, not generic topics. Extract the hook, tension, payoff, pacing, psychology, visual behaviour and format DNA from each signal, then rebuild original concepts for the selected creator. Never copy an exact script or creator. Never invent performance numbers. Return JSON only.`;
      const userPrompt = `PLATFORM: ${platform}\nGOAL: ${goal}\nCREATOR: ${selectedPersona.name}\nCREATOR PROFILE: ${selectedPersona.note}\nNICHE: ${niche}\nTARGET: ${count}\nVALID FORMAT LIBRARY: ${FORMAT_LABELS}\n\nSOURCE SIGNALS:\n${signals || "No live signals supplied. Generate conservative mechanism-first opportunities based on the niche and format library."}\n\nReturn {"opportunities":[...]} with exactly ${count} distinct opportunities. Every object must contain: id,title,trend_signal,mechanism,hook,formatId,formatLabel,pacing,psychology,why_now,creator_adaptation,score,confidence,production_notes,remix_variants. remix_variants must contain Cara, Lila and Cara + Lila variants. FORMAT RULE: choose the format that best matches the mechanism, not the easiest format. GREEN SCREEN, SLIDESHOW and WALL OF TEXT are first-class formats and should be used when appropriate.`;
      await queueJob({ jobType: "trend_scan", title: `Trend Radar · ${platform} · ${selectedPersona.name}`, systemPrompt, userPrompt, personaId: personaIdFromSelection(persona), maxTokens: 5000 });
    } catch (e) { setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  function toggle(id) { setSelected((x) => x.includes(id) ? x.filter((v) => v !== id) : [...x, id]); }

  async function remix() {
    const picks = opportunities.filter((x) => selected.includes(x.id)); if (!picks.length) return;
    setBusy(true); setMessage(`Qwen is rebuilding ${picks.length} mechanism${picks.length === 1 ? "" : "s"} for ${creator}…`);
    try {
      const targetPersonaId = personaIdFromSelection(persona);
      const targetPersona = PERSONAS[targetPersonaId] || PERSONAS.cara_lila;
      for (const pick of picks) {
        const format = FORMAT_MAP[String(pick.formatId || "").toLowerCase()] || FORMAT_MAP.single_image;
        const systemPrompt = `You are the autonomous Creative Director for Cornerstone AI Group. Preserve the proven mechanism, but rebuild the actual creative natively for ${targetPersona.name}. The output must be culturally and visually natural for the creator. Return JSON only.`;
        const userPrompt = `PLATFORM: ${platform}\nGOAL: ${goal}\nCREATOR: ${targetPersona.name}\nCREATOR PROFILE: ${targetPersona.note}\nNICHE: ${niche}\nSELECTED FORMAT: ${format.label}\nFORMAT EXECUTION: ${format.execution}\nPATTERN:\n${JSON.stringify(pick)}\n\nReturn {"concept":{"title","creator","formatId","formatLabel","hook","script","shot_list","visual_prompt","caption","cta","duration","edit_plan","why_it_should_work"}}. Keep the creator identity and selected format locked. If the format is GREEN SCREEN, specify the background visual and the creator reaction/line. If SLIDESHOW, specify a connected frame-by-frame story. If WALL OF TEXT, specify exact text structure and the single supporting visual.`;
        await queueJob({ jobType: "autopilot_concept", title: `Remix · ${pick.title}`, systemPrompt, userPrompt, personaId: targetPersonaId, formatId: format.id, maxTokens: 3800 });
      }
      setSelected([]); setView("concepts");
    } catch (e) { setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function promote(job) {
    const parsed = parseJson(job.result); const concept = parsed.concept || parsed;
    const targetPersona = personaFromJob(job);
    const format = FORMAT_MAP[String(concept.formatId || job.options?.format_id || "").toLowerCase()] || FORMAT_MAP.single_image;
    setBusy(true); setMessage(`Qwen is locking ${targetPersona.name} + ${format.label} and writing the full production package…`);
    try {
      const systemPrompt = `You are the production director for Cornerstone AI Assets. Return JSON only. The approved concept is the source of truth. The selected creator and selected format are immutable. Do not substitute another creator. Do not mix personas. Do not introduce a location, time of day, prop, vehicle, daylight, split-screen or action that the concept does not require. For a still image, use one coherent physical moment. For GREEN SCREEN, the background visual must be explicitly defined. For SLIDESHOW/CAROUSEL, each frame must advance the same story. For WALL OF TEXT, keep the text itself as the primary creative device. Before returning, run a hard human-quality gate for hands, props, mugs, phones, perspective, time of day, identity, location and format fidelity.`;
      const userPrompt = `PLATFORM: ${platform}\nCREATOR LOCK: ${targetPersona.name}\nCREATOR PROFILE: ${targetPersona.note}\nFORMAT LOCK: ${format.label}\nFORMAT EXECUTION: ${format.execution}\nAPPROVED CONCEPT:\n${JSON.stringify(concept)}\n\nReturn exactly {"package":{\n"creatorId":"${job.persona_id}",\n"creator":"${targetPersona.name}",\n"formatId":"${format.id}",\n"formatLabel":"${format.label}",\n"hook":"",\n"script":"",\n"recommendedOutput":"video|image|carousel",\n"videoPrompt":"",\n"imagePrompt":"",\n"timeline":"",\n"audio":"",\n"caption":"",\n"captionVariants":["","",""],\n"cta":"",\n"editNotes":"",\n"formatInstruction":"",\n"negativeConstraints":"",\n"duration":10,\n"sceneLock":{"location":"","timeOfDay":"","lighting":"","action":"","props":"","wardrobe":"","composition":"single continuous camera frame","avoid":""},\n"carouselSlides":[{"slide":1,"headline":"","body":"","visualPrompt":""},{"slide":2,"headline":"","body":"","visualPrompt":""},{"slide":3,"headline":"","body":"","visualPrompt":""},{"slide":4,"headline":"","body":"","visualPrompt":""},{"slide":5,"headline":"","body":"","visualPrompt":""}]}}.\n\nCRITICAL: creatorId=${job.persona_id} means ONLY that creator may appear. If creatorId is cara, absolutely do not include Lila. If creatorId is lila, absolutely do not include Cara. If creatorId is cara_lila, both are allowed and must remain distinct. Do not let a prior UI selection override the job's creator.\n\nCRITICAL SCENE EXAMPLE: if the concept is '3 AM productivity ritual', timeOfDay MUST be 3:00 AM, location MUST be a believable private interior such as a bedroom/kitchen/home office, lighting MUST be practical night lighting, and daylight/sunbeams/dealerships/cars are forbidden unless explicitly required.\n\nFORMAT EXAMPLE: a GREEN SCREEN package must specify the background visual, creator placement, hook timing, and reaction. A SLIDESHOW package must specify 3–7 connected visual beats. A WALL OF TEXT package must specify one supporting visual plus the exact readable text structure.`;
      await queueJob({ jobType: "content_package", title: `Produce · ${job.title}`, systemPrompt, userPrompt, personaId: job.persona_id, formatId: format.id, maxTokens: 5000 });
      setView("production");
    } catch (e) { setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  function setMediaState(id, patch) { setMedia((s) => ({ ...s, [id]: { ...(s[id] || {}), ...patch } })); }

  async function pollImage(requestId, statusUrl, resultUrl, jobId, label) {
    for (let i = 0; i < 100; i += 1) {
      await new Promise((r) => setTimeout(r, 3000));
      const response = await fetch("/api/generate-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, type: "image", statusUrl, resultUrl }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Image generation failed (${response.status})`);
      setMediaState(jobId, { pct: Math.min(96, 18 + Math.round((i / 100) * 78)), label, status: data.status || "WORKING", transient: true, saved: false });
      if (data.status === "COMPLETED") return data.imageUrl || data.url;
      if (data.status === "FAILED") throw new Error(data?.error || "Image generation failed");
    }
    throw new Error("Image generation timed out.");
  }

  async function generateImage(job) {
    setBusy(true); setMediaState(job.id, { pct: 5, label: "Generating image", status: "STARTING", transient: true, saved: false }); setMessage("Generating image…");
    try {
      const pkg = parseJson(job.result).package || parseJson(job.result);
      const targetPersona = personaFromJob(job);
      const format = formatFromJob(job, pkg);
      const prompt = scenePrompt(pkg, targetPersona.name, "4:5");
      const submit = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: { subject: prompt, photo_idea: prompt, setting: sceneLockFromPackage(pkg).location, photoDirection: prompt, formatId: format.id }, photo_idea: prompt, hook: pkg.hook, caption: pkg.caption, personaId: job.persona_id }) });
      const data = await submit.json().catch(() => ({}));
      if (!submit.ok || !data.requestId) throw new Error(data?.error || `Image submit failed (${submit.status})`);
      const url = await pollImage(data.requestId, data.statusUrl, data.resultUrl, job.id, `Generating ${format.label}`);
      const postId = `qwen_${job.id}_${Date.now()}`;
      const publicUrl = await storeGeneratedImage({ url, requestId: data.requestId, postId, personaName: targetPersona.name, jobId: job.id, formatId: format.id });
      const savedMedia = await persistJobMedia(job, { imageUrl: publicUrl, creator: targetPersona.name, creatorId: job.persona_id, formatId: format.id, formatLabel: format.label }, { type: "image", url: publicUrl, createdAt: new Date().toISOString(), postId, creatorId: job.persona_id, formatId: format.id });
      setMediaState(job.id, { ...savedMedia, pct: 100, label: "Image saved permanently", status: "READY", saved: true, transient: false });
      setMessage(`${format.label} generated for ${targetPersona.name} and saved permanently.`);
    } catch (e) { setMediaState(job.id, { pct: 100, label: "Error", status: "ERROR", error: e.message || String(e), transient: false }); setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function generateCarousel(job) {
    setBusy(true); setMediaState(job.id, { pct: 3, label: "Preparing carousel", status: "STARTING", transient: true, saved: false }); setMessage("Generating carousel…");
    try {
      const pkg = parseJson(job.result).package || parseJson(job.result);
      const targetPersona = personaFromJob(job);
      const slides = Array.isArray(pkg.carouselSlides) ? pkg.carouselSlides.slice(0, 7) : [];
      if (!slides.length) throw new Error("This production package has no carousel slide plan.");
      const generationId = `qwen_${job.id}_${Date.now()}`;
      const urls = [];
      for (let i = 0; i < slides.length; i += 1) {
        const slide = slides[i];
        setMediaState(job.id, { pct: 5 + Math.round((i / slides.length) * 75), label: `Generating carousel · slide ${i + 1}/${slides.length}`, status: "GENERATING", transient: true, saved: false });
        const prompt = `${scenePrompt(pkg, targetPersona.name, "4:5")}\nSLIDE ${i + 1}/${slides.length}: ${slide.visualPrompt}\nSLIDE TEXT INTENT: ${slide.headline || ""} ${slide.body || ""}`;
        const submit = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: { subject: prompt, photo_idea: prompt, setting: sceneLockFromPackage(pkg).location, photoDirection: prompt, formatId: "carousel" }, photo_idea: prompt, hook: slide.headline, caption: slide.body, personaId: job.persona_id }) });
        const data = await submit.json().catch(() => ({}));
        if (!submit.ok || !data.requestId) throw new Error(data?.error || `Slide ${i + 1} submit failed (${submit.status})`);
        const url = await pollImage(data.requestId, data.statusUrl, data.resultUrl, job.id, `Carousel · slide ${i + 1}/${slides.length}`);
        const publicUrl = await storeGeneratedImage({ url, requestId: data.requestId, postId: generationId, slideIndex: i, personaName: targetPersona.name, jobId: job.id, formatId: "carousel" });
        urls.push(publicUrl);
        const savedMedia = await persistJobMedia(job, { imageUrl: urls[0], imageUrls: [...urls], creator: targetPersona.name, creatorId: job.persona_id, formatId: "carousel", formatLabel: "Carousel" });
        setMediaState(job.id, { ...savedMedia, pct: 5 + Math.round(((i + 1) / slides.length) * 90), label: `Carousel saved · slide ${i + 1}/${slides.length}`, status: "SAVED", saved: true, transient: true });
      }
      const savedMedia = await persistJobMedia(job, { imageUrl: urls[0], imageUrls: urls, carouselSlides: slides, creator: targetPersona.name, creatorId: job.persona_id, formatId: "carousel", formatLabel: "Carousel" }, { type: "carousel", urls, createdAt: new Date().toISOString(), generationId, creatorId: job.persona_id });
      setMediaState(job.id, { ...savedMedia, pct: 100, label: `Carousel saved · ${urls.length} slides`, status: "READY", carouselUrls: urls, carouselSlides: slides, saved: true, transient: false });
      setMessage(`Carousel generated for ${targetPersona.name} and saved permanently — ${urls.length} slides.`);
    } catch (e) { setMediaState(job.id, { pct: 100, label: "Error", status: "ERROR", error: e.message || String(e), transient: false }); setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function queueCopy(job) {
    setBusy(true); setMessage("Qwen is writing the slide copy and structure…");
    try {
      const pkg = parseJson(job.result).package || parseJson(job.result);
      const targetPersona = personaFromJob(job);
      const systemPrompt = `You are the carousel editor for Cornerstone AI Assets. Return JSON only. Keep the exact creator, concept and scene logic. Write short, human slide copy with a strong first slide and useful progression. Never add a location or time that is not in the source.`;
      const userPrompt = `CREATOR LOCK: ${targetPersona.name}\nPACKAGE:\n${JSON.stringify(pkg)}\n\nReturn {"carouselSlides":[{"slide":1,"headline":"","body":"","visualPrompt":""},{"slide":2,"headline":"","body":"","visualPrompt":""},{"slide":3,"headline":"","body":"","visualPrompt":""},{"slide":4,"headline":"","body":"","visualPrompt":""},{"slide":5,"headline":"","body":"","visualPrompt":""}]}`;
      await queueJob({ jobType: "carousel_copy", title: `Slide Copy · ${job.title}`, systemPrompt, userPrompt, personaId: job.persona_id, formatId: "carousel", maxTokens: 2600 });
      setMessage("Slide copy queued. It will appear here when Qwen finishes.");
    } catch (e) { setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function queueCaptions(job) {
    setBusy(true); setMessage("Qwen is writing caption variations…");
    try {
      const pkg = parseJson(job.result).package || parseJson(job.result);
      const targetPersona = personaFromJob(job);
      const systemPrompt = `You are the social caption editor for Cornerstone AI Assets. Write concise, human captions that match ${targetPersona.name}. No generic AI language, no motivational cliches, no fake personal claims. Return JSON only.`;
      const userPrompt = `PLATFORM: ${platform}\nGOAL: ${goal}\nCREATOR LOCK: ${targetPersona.name}\nHOOK: ${pkg.hook}\nSCRIPT: ${pkg.script}\nCONCEPT: ${pkg.caption}\n\nReturn {"captions":[{"style":"Direct","text":""},{"style":"Conversational","text":""},{"style":"Dry","text":""}],"recommended":"Direct"}`;
      await queueJob({ jobType: "caption_package", title: `Captions · ${job.title}`, systemPrompt, userPrompt, personaId: job.persona_id, formatId: pkg.formatId || null, maxTokens: 2200 });
      setMessage("Caption variations queued.");
    } catch (e) { setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function generateVideo(job) {
    setBusy(true); setMediaState(job.id, { pct: 4, label: "Preparing visual anchor", status: "STARTING", transient: true, saved: false });
    try {
      const pkg = parseJson(job.result).package || parseJson(job.result);
      const targetPersona = personaFromJob(job);
      const format = formatFromJob(job, pkg);
      const visualPrompt = scenePrompt(pkg, targetPersona.name, "9:16");
      const submitImage = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: { subject: visualPrompt, photo_idea: visualPrompt, setting: sceneLockFromPackage(pkg).location, photoDirection: visualPrompt, formatId: format.id }, photo_idea: visualPrompt, hook: pkg.hook, caption: pkg.caption, personaId: job.persona_id }) });
      const imageJob = await submitImage.json().catch(() => ({}));
      if (!submitImage.ok || !imageJob.requestId) throw new Error(imageJob?.error || `Visual anchor failed (${submitImage.status})`);
      const imageUrl = await pollImage(imageJob.requestId, imageJob.statusUrl, imageJob.resultUrl, job.id, `${format.label} visual anchor`);
      setMediaState(job.id, { pct: 35, label: `Visual anchor ready · submitting ${format.label} video`, status: "VIDEO SUBMIT", imageUrl, transient: true, saved: false });
      const videoPrompt = [pkg.videoPrompt, `CREATOR LOCK: ${targetPersona.name}`, `FORMAT LOCK: ${format.label}`, `FORMAT EXECUTION: ${format.execution}`, `SCENE LOCK: ${JSON.stringify(sceneLockFromPackage(pkg))}`, `TIMELINE: ${pkg.timeline}`, `AUDIO: ${pkg.audio}`, `SCRIPT: ${pkg.script}`, "One continuous world. No identity mix-ups. No location substitution. No split-screen unless the format itself explicitly requires it. No montage in a single shot. Keep identity, time of day, wardrobe, props and location coherent.", "Natural human movement and believable object interaction. No duplicated mugs, phones, hands or people. No daylight if the scene is night.", "No subtitles, logos or watermarks in generated footage unless the chosen format explicitly calls for designed on-screen text."].filter(Boolean).join("\n\n");
      const submitVideo = await fetch("/api/track-b-video-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "seedance", imageUrl, prompt: videoPrompt, resolution: "720p", aspectRatio: "9:16", duration: Number(pkg.duration || 10) }) });
      const videoJob = await submitVideo.json().catch(() => ({}));
      if (!submitVideo.ok || !videoJob.requestId) throw new Error(videoJob?.error || `Video submit failed (${submitVideo.status})`);
      let complete = false;
      for (let i = 0; i < 120; i += 1) {
        await new Promise((r) => setTimeout(r, 5000));
        const r = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: videoJob.requestId, provider: videoJob.provider || "fal", providerKey: videoJob.providerKey || "seedance", action: "status" }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || `Video status failed (${r.status})`);
        setMediaState(job.id, { pct: Math.min(90, 40 + Math.round((i / 120) * 48)), label: "Generating video", status: d.status || "WORKING", imageUrl, transient: true, saved: false });
        if (d.status === "COMPLETED") { complete = true; break; }
        if (["FAILED", "CANCELLED"].includes(d.status)) throw new Error(d?.error || `Video generation ${String(d.status).toLowerCase()}`);
      }
      if (!complete) throw new Error("Video timed out while polling the provider.");
      const result = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: videoJob.requestId, provider: videoJob.provider || "fal", providerKey: videoJob.providerKey || "seedance", action: "result" }) }).then((r) => r.json());
      if (!result.videoUrl) throw new Error(result?.error || "Video completed without a URL.");
      const postId = `qwen_video_${job.id}_${Date.now()}`;
      const persistentAnchor = await storeGeneratedImage({ url: imageUrl, requestId: imageJob.requestId, postId, personaName: targetPersona.name, jobId: job.id, formatId: format.id });
      const cap = await supabase.from("caption_jobs").insert({ title: `${job.title} · captions`, source_url: result.videoUrl, transcript: pkg.script || "", hook: pkg.hook || "", style: job.persona_id === "lila" ? "lila_minimal" : "cara_editorial", aspect_ratio: "9:16", position: "lower_center", options: { auto_transcribe: true, punch_in: true, source_job_id: job.id }, status: "queued" }).select("id").single();
      if (cap.error) throw new Error(`Video ready, caption queue failed: ${cap.error.message}`);
      const savedMedia = await persistJobMedia(job, { imageUrl: persistentAnchor, videoUrl: result.videoUrl, creator: targetPersona.name, creatorId: job.persona_id, formatId: format.id, formatLabel: format.label }, { type: "video_anchor", url: persistentAnchor, videoUrl: result.videoUrl, createdAt: new Date().toISOString(), postId, creatorId: job.persona_id, formatId: format.id });
      await supabase.from("local_ai_jobs").update({ production_status: "caption_queued", video_url: result.videoUrl, caption_job_id: cap.data.id }).eq("id", job.id);
      setMediaState(job.id, { ...savedMedia, pct: 100, label: "Video + captions queued", status: "READY", saved: true, transient: false });
      setMessage(`Video complete for ${targetPersona.name}. Visual anchor saved permanently; local captions are queued.`);
    } catch (e) { setMediaState(job.id, { pct: 100, label: "Error", status: "ERROR", error: e.message || String(e), transient: false }); setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  function parseAux(jobType, jobTitle) { return jobs.find((j) => j.job_type === jobType && String(j.title).includes(jobTitle)); }
  const stage = view === "radar" ? 0 : view === "concepts" ? 1 : 2;

  return <div style={{ background: "#07080c", color: "#eef1f7", minHeight: "100vh", padding: "26px 26px 50px" }}>
    <div style={{ maxWidth: 1450, margin: "0 auto", display: "grid", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div><div style={{ color: "#d4af37", fontSize: 10, fontWeight: 900, letterSpacing: ".2em" }}>QWEN AUTOPILOT</div><h1 style={{ margin: "7px 0 5px", fontSize: 31, letterSpacing: "-.04em" }}>Find the opportunity. Remix it. Execute it.</h1><p style={{ margin: 0, color: "#7e879a" }}>Fastlane-style mechanism discovery → Qwen creative director → format-native production → saved outputs.</p></div>
          <div style={{ display: "flex", gap: 7 }}>{["radar","concepts","production"].map((x, i) => <button key={x} onClick={() => setView(x)} style={{ ...secondary, borderColor: view === x ? "#d4af37" : "#30374b", color: view === x ? "#f5d46e" : "#eef1f7" }}>{i + 1}. {x}</button>)}</div>
        </div>
        <div style={{ marginTop: 18 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>{["Trend Radar","Remix Concepts","Production"].map((s, i) => <div key={s}><div style={{ height: 7, background: i < stage ? "#d4af37" : i === stage ? "#7b83ff" : "#252a39", borderRadius: 99 }} /><div style={{ marginTop: 5, fontSize: 9, color: i <= stage ? "#ead27a" : "#697187" }}>{s}</div></div>)}</div></div>
      </Card>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
          <select value={persona} onChange={(e) => setPersona(e.target.value)} style={baseField}><option value="cara">Cara</option><option value="lila">Lila</option><option value="duo">Cara + Lila</option></select>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={baseField}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={goal} onChange={(e) => setGoal(e.target.value)} style={baseField}><option>Grow account</option><option>Engagement</option><option>Profile visits</option><option>Conversions</option></select>
          <input value={niche} onChange={(e) => setNiche(e.target.value)} style={baseField} />
        </div>
        <textarea value={signals} onChange={(e) => setSignals(e.target.value)} placeholder="Paste trend observations, links, hooks or screenshot notes. Qwen extracts the mechanism rather than copying." style={{ ...baseField, marginTop: 10, minHeight: 88 }} />
        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><label style={{ fontSize: 11, color: "#7d879b" }}>Opportunities <input type="number" min="4" max="20" value={count} onChange={(e) => setCount(Math.max(4, Math.min(20, Number(e.target.value) || 12)))} style={{ ...baseField, width: 76, display: "inline-block", marginLeft: 6 }} /></label><button disabled={busy} onClick={scanTrends} style={primary}>{busy ? "Qwen working…" : "Scan with Qwen"}</button><span style={{ color: "#7b8497", fontSize: 11 }}>{message}</span></div>
      </Card>

      {view === "radar" && <Card>
        <div style={{ display: "flex", justifyContent: "space-between" }}><div><b style={{ color: "#d4af37", fontSize: 10, letterSpacing: ".16em" }}>TREND RADAR</b><h2 style={{ margin: "6px 0" }}>Opportunities, not random ideas.</h2></div><div style={{ fontSize: 11, color: "#7e879c" }}>{trendJob ? `${jobProgress(trendJob).label} · ${jobProgress(trendJob).pct}%` : "Ready"}</div></div>
        {trendJob && <Progress value={jobProgress(trendJob).pct} label={jobProgress(trendJob).label} />}
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {opportunities.map((item) => { const f = FORMAT_MAP[String(item.formatId || "").toLowerCase()] || FORMAT_MAP.single_image; return <div key={item.id} style={{ border: "1px solid #252b3b", borderRadius: 13, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div style={{ fontSize: 10, color: "#d4af37" }}>{f.label}</div><h3 style={{ margin: "5px 0" }}>{item.title}</h3><div style={{ color: "#8f97aa", fontSize: 12 }}>{item.mechanism || item.why_now}</div></div><b style={{ color: "#f3d56d", fontSize: 20 }}>{item.score ?? "—"}</b></div>
            <div style={{ marginTop: 9 }}>{item.hook}</div>
            <div style={{ marginTop: 9, color: "#7c8496", fontSize: 11 }}>Psychology: {item.psychology || "—"} · Confidence: {item.confidence || "—"}</div>
            <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "#0b0e15", color: "#9ea7ba", fontSize: 11 }}>{f.description}</div>
            <button onClick={() => toggle(item.id)} style={{ ...secondary, marginTop: 10, borderColor: selected.includes(item.id) ? "#d4af37" : "#30374b" }}>{selected.includes(item.id) ? "Selected" : "Select"}</button>
          </div>; })}
          {!opportunities.length && <div style={{ color: "#6f788c", border: "1px dashed #2a3040", borderRadius: 12, padding: 18 }}>Run Scan with Qwen to build the radar.</div>}
        </div>
        {selected.length > 0 && <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}><span style={{ color: "#7e879a", fontSize: 11 }}>{selected.length} selected</span><button disabled={busy} onClick={remix} style={primary}>Remix selected →</button></div>}
      </Card>}

      {view === "concepts" && <Card>
        <div><b style={{ color: "#d4af37", fontSize: 10, letterSpacing: ".16em" }}>QWEN REMIXES</b><h2 style={{ margin: "6px 0" }}>Original concepts built from the mechanism.</h2></div>
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>{conceptJobs.map((job) => { const p = jobProgress(job); const targetPersona = personaFromJob(job); let c = null; try { c = parseJson(job.result || "").concept; } catch {} const f = FORMAT_MAP[String(c?.formatId || job.options?.format_id || "").toLowerCase()] || FORMAT_MAP.single_image; return <div key={job.id} style={{ border: "1px solid #252b3b", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><div><h3 style={{ margin: 0 }}>{job.title}</h3><div style={{ marginTop: 5, color: "#d4af37", fontSize: 10 }}>{targetPersona.name} · {f.label}</div></div><span style={{ fontSize: 11, color: p.pct === 100 ? "#78dab6" : "#9aa2b4" }}>{p.label} · {p.pct}%</span></div>
          <Progress value={p.pct} label={p.label} />
          {c && <><div style={{ marginTop: 12, fontWeight: 900 }}>{c.title}</div><div style={{ color: "#dbe0ea", marginTop: 6 }}>{c.hook}</div><div style={{ color: "#7f889b", fontSize: 11, marginTop: 6 }}>{c.creator || targetPersona.name} · {c.formatLabel || f.label} · {c.duration || 10}s</div><button disabled={busy} onClick={() => promote(job)} style={{ ...primary, marginTop: 10 }}>Build production package →</button></>}
        </div>; })}</div>
      </Card>}

      {view === "production" && <Card>
        <div><b style={{ color: "#d4af37", fontSize: 10, letterSpacing: ".16em" }}>PRODUCTION BAY</b><h2 style={{ margin: "6px 0" }}>One concept. One creator. Format-native output.</h2></div>
        <div style={{ display: "grid", gap: 14, marginTop: 12 }}>{productionJobs.map((job) => { let pkg = null; try { pkg = parseJson(job.result || "").package; } catch {} const targetPersona = personaFromJob(job); const f = formatFromJob(job, pkg); const m = media[job.id] || { pct: job.status === "completed" ? 100 : 0, label: job.status === "completed" ? "Choose an output" : job.status, status: job.status }; const slides = Array.isArray(pkg?.carouselSlides) ? pkg.carouselSlides : []; const copyJob = parseAux("carousel_copy", job.title); const captionJob = parseAux("caption_package", job.title); let copy = copyJob?.result ? (() => { try { return parseJson(copyJob.result).carouselSlides || []; } catch { return []; } })() : []; let captions = captionJob?.result ? (() => { try { return parseJson(captionJob.result); } catch { return null; } })() : null; return <div key={job.id} style={{ border: "1px solid #252b3b", borderRadius: 16, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div style={{ color: "#d4af37", fontSize: 10, letterSpacing: ".16em" }}>CONTENT PACKAGE</div><h3 style={{ margin: "6px 0" }}>{job.title}</h3><div style={{ color: "#b7c0d1", fontSize: 11 }}>{targetPersona.name} · {f.label}</div></div><span style={{ color: m.status === "ERROR" ? "#ff9696" : "#78dab6", fontSize: 11 }}>{m.label || m.status} {m.pct ? `· ${m.pct}%` : ""}</span></div>
          <Progress value={m.pct} label={m.label || "Production"} />
          {pkg && <>
            <div style={{ marginTop: 10, color: "#cdd3de", fontSize: 12 }}>{pkg.hook}</div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 7, fontSize: 10, color: "#858ea2" }}><div><b>Creator</b><br />{targetPersona.name}</div><div><b>Format</b><br />{f.label}</div><div><b>Location</b><br />{sceneLockFromPackage(pkg).location}</div><div><b>Time</b><br />{sceneLockFromPackage(pkg).timeOfDay}</div><div><b>Light</b><br />{sceneLockFromPackage(pkg).lighting}</div><div><b>Action</b><br />{sceneLockFromPackage(pkg).action}</div></div>
            <div style={{ marginTop: 10, padding: 10, background: "#0b0e15", borderRadius: 10, color: "#9ba5b8", fontSize: 11 }}><b style={{ color: "#d4af37" }}>{f.label}</b> — {pkg.formatInstruction || f.execution}</div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}><button disabled={busy} onClick={() => generateVideo(job)} style={primary}>Generate video</button><button disabled={busy} onClick={() => generateImage(job)} style={secondary}>Generate image</button><button disabled={busy} onClick={() => generateCarousel(job)} style={secondary}>Generate carousel</button><button disabled={busy} onClick={() => queueCopy(job)} style={secondary}>Generate slide copy</button><button disabled={busy} onClick={() => queueCaptions(job)} style={secondary}>Generate captions</button></div>
          </>}
          {(m.imageUrl || m.videoUrl || (m.carouselUrls || []).length > 0) && <div style={{ marginTop: 14 }}><div style={{ fontSize: 11, color: "#d4af37", fontWeight: 900 }}>OUTPUTS · {m.saved ? "PERSISTED" : "WORKING"}</div>{m.imageUrl && <img src={m.imageUrl} alt={`${targetPersona.name} generated`} style={{ width: "100%", maxWidth: 520, borderRadius: 12, marginTop: 8, display: "block" }} />}{m.videoUrl && <video src={m.videoUrl} controls style={{ width: "100%", maxWidth: 720, borderRadius: 12, marginTop: 8 }} />}{(m.carouselUrls || m.imageUrls || []).length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 8, marginTop: 8 }}>{(m.carouselUrls || m.imageUrls || []).map((url, i) => <div key={`${url}-${i}`} style={{ border: "1px solid #252b3b", borderRadius: 10, overflow: "hidden" }}><img src={url} alt={`Slide ${i + 1}`} style={{ width: "100%", display: "block" }} /><div style={{ padding: 8, fontSize: 10, color: "#d6dce7" }}><b>{(copy.length ? copy[i]?.headline : slides[i]?.headline) || `Slide ${i + 1}`}</b><div style={{ marginTop: 4, color: "#838da1" }}>{(copy.length ? copy[i]?.body : slides[i]?.body) || ""}</div></div></div>)}</div>}</div>}
          {copy.length > 0 && <div style={{ marginTop: 12, padding: 12, background: "#0b0e15", borderRadius: 10 }}><b style={{ color: "#d4af37", fontSize: 10 }}>SLIDE COPY</b>{copy.map((s, i) => <div key={i} style={{ marginTop: 8 }}><b>Slide {i + 1}: {s.headline}</b><div style={{ color: "#9099ab", fontSize: 12 }}>{s.body}</div></div>)}</div>}
          {captions && <div style={{ marginTop: 12, padding: 12, background: "#0b0e15", borderRadius: 10 }}><b style={{ color: "#d4af37", fontSize: 10 }}>CAPTION OPTIONS</b>{(captions.captions || []).map((c, i) => <div key={i} style={{ marginTop: 8 }}><b>{c.style}</b><div style={{ color: "#9099ab", fontSize: 12 }}>{c.text}</div></div>)}</div>}
          {m.error && <div style={{ marginTop: 10, color: "#ff9696" }}>{m.error}</div>}
        </div>; })}
        {!productionJobs.length && <div style={{ color: "#6f788c" }}>No production packages yet. Build one from a Qwen remix.</div>}
      </div></Card>}
    </div>
  </div>;
}
