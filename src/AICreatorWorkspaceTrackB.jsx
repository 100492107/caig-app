import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const QWEN_MODEL = "mlx-community/Qwen3-8B-4bit";
const DISCLOSURE = "Cara is the dedicated demonstration model of Cornerstone AI Assets. Every client asset maps onto private, unique reference weights — ensuring their content remains consistently them, not us.";

const PEOPLE = [
  { id: "cara", name: "Cara", note: "Direct · dry · disciplined · British" },
  { id: "lila", name: "Lila", note: "Warm · measured · observant · understated" },
  { id: "cara_lila", name: "Cara + Lila", note: "Distinct personalities · chemistry · contrast" },
];

const CONTENT_TYPES = [
  ["social", "Social post", "One strong post with a caption and one hero image."],
  ["carousel", "Carousel", "5–7 coherent slides with on-image text and a ready post caption."],
  ["fanvue", "Fanvue", "Private-page lifestyle, personality, photo sets and teasing content."],
];
const PLATFORMS = ["Instagram", "Instagram Reels", "TikTok", "Facebook", "Facebook Reels", "YouTube Shorts"];
const GOALS = ["Reach / attention", "Engagement", "Lifestyle / filler", "Product discovery", "Conversion", "Story / personality", "Proof / authority"];
const FANVUE_PURPOSES = [
  ["Personal post", "Private-page lifestyle moment."],
  ["Photo set", "Cohesive pool, resort, bedroom, terrace or sunbed set."],
  ["Personality", "Getting ready, lazy morning, travel, beauty or playful private-page moment."],
  ["Interaction", "Direct-to-subscriber post with a reason to reply."],
  ["Tease", "Tasteful, suggestive private-page teaser; adult and non-explicit."],
  ["Behind the scenes", "Candid creator preparation, shoot prep, hotel or holiday moment."],
];
const CAROUSEL_STRUCTURES = ["Story / conflict", "Useful list", "Identity / aspiration", "Quick hit", "Proof / comparison", "Visual reveal"];
const ADVANCED_MODELS = [
  ["h3", "MiniMax H3", 8, "rich motion / cinematic"],
  ["kling", "Kling 3.0 Pro", 5, "polished creator motion"],
  ["seedance", "Seedance 2.0 Fast", 10, "premium multi-beat prompt"],
  ["grok", "Grok Imagine Video", 6, "fast premium social"],
];

const PUBLIC_BIBLES = {
  cara: `Cara Whitmore is an adult fictional creator. Direct, dry, disciplined and British. Her natural content worlds are training, discipline, money, work, routines, confidence, ordinary life, humour and specific observations. She is practical and understated. She is not a generic motivational influencer. Her content should feel like a real young woman living at a high personal standard, caught mid-action rather than posing for an advert.`,
  lila: `Lila Sterling is an adult fictional creator. Warm, measured, observant and understated. Her natural content worlds are lifestyle, travel, wellness, beauty, routines, quiet opinions, small observations and believable aspiration. She is calm rather than loud. Her content should feel personal, spontaneous and visually beautiful without becoming a generic influencer shoot.`,
  duo: `Cara + Lila are two separate adult fictional creators. Cara is direct, dry, disciplined and British. Lila is warm, measured, observant and understated. Shared content should show believable chemistry, banter, contrast, friendship, shared routines and small human interactions. Never merge their identities or make them look like duplicates.`,
};

const page = { minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 28px 72px", fontFamily: "Inter,system-ui,sans-serif" };
const shell = { maxWidth: 1240, margin: "0 auto" };
const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18, marginBottom: 16 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 10, padding: "10px 12px" };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };
const muted = { color: "#838ca0", fontSize: 12, lineHeight: 1.6 };

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("Qwen returned invalid JSON");
}
function idFor(persona) { return persona === "cara_lila" ? "duo" : persona; }
function nameFor(persona) { return PEOPLE.find((p) => p.id === persona)?.name || "Cara"; }
function notesFor(item) { try { return item?.notes ? JSON.parse(item.notes) : {}; } catch { return {}; } }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function queueQwen({ title, persona, systemPrompt, userPrompt, jobType = "content_package" }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title,
    job_type: jobType,
    model: QWEN_MODEL,
    persona_id: idFor(persona),
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    options: { max_tokens: 3400, temperature: 0.62 },
    status: "queued",
    production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function waitQwen(jobId, setMessage) {
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(3500);
    const { data, error } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", jobId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Qwen job disappeared from the queue.");
    if (data.status === "completed") return data.result || "";
    if (data.status === "error") throw new Error(data.error_message || "Qwen failed.");
    setMessage(`Qwen is working locally… ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}

async function waitImage(request, setMessage) {
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(3000);
    const response = await fetch("/api/generate-poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: request.requestId, type: "image", status_url: request.statusUrl, result_url: request.resultUrl }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Image status check failed");
    if (data.status === "COMPLETED") return data.imageUrl || data.url;
    if (data.status === "FAILED") throw new Error(data?.error || "Image generation failed");
    setMessage(`Generating image… ${data.status}`);
  }
  throw new Error("Image generation timed out.");
}

async function waitVideo(request, setMessage) {
  const deadline = Date.now() + 12 * 60 * 1000;
  const provider = request.providerKey || request.provider;
  while (Date.now() < deadline) {
    await sleep(3500);
    const response = await fetch("/api/track-b-video-poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: request.requestId, model: request.model, provider, statusUrl: request.statusUrl, action: "status" }),
    });
    const status = await response.json();
    if (!response.ok) throw new Error(status?.error || "Video status failed");
    if (["FAILED", "CANCELLED"].includes(status.status)) throw new Error(status.detail || `Video generation ${String(status.status).toLowerCase()}`);
    if (status.status === "COMPLETED") {
      const resultResponse = await fetch("/api/track-b-video-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.requestId, model: request.model, provider, action: "result" }),
      });
      const result = await resultResponse.json();
      if (!resultResponse.ok || !result.videoUrl) throw new Error(result?.error || "Completed video did not return a URL");
      return result.videoUrl;
    }
    setMessage(`Generating reel… ${status.status || "working"}`);
  }
  throw new Error("Video generation timed out.");
}

function download(url, filename) {
  if (!url) return;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.target = "_blank";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image for caption rendering."));
    image.src = url;
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

async function renderCaptionImage(url, text, preset = "editorial") {
  const image = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const width = canvas.width;
  const fontSize = Math.max(34, Math.round(width * 0.055));
  ctx.font = `900 ${fontSize}px Inter, Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const margin = Math.round(width * 0.055);
  const maxWidth = width - margin * 2;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = Math.round(fontSize * 1.05);
  const pad = Math.round(fontSize * 0.55);
  const blockHeight = lines.length * lineHeight + pad * 2;
  const y = preset === "top" ? margin : canvas.height - margin - blockHeight;

  const gradient = ctx.createLinearGradient(0, y - pad * 2, 0, y + blockHeight + pad * 2);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.35, "rgba(0,0,0,.26)");
  gradient.addColorStop(1, "rgba(0,0,0,.72)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, Math.max(0, y - pad * 2), canvas.width, blockHeight + pad * 4);

  const boxWidth = Math.min(maxWidth, Math.max(...lines.map((line) => ctx.measureText(line).width)) + pad * 1.8);
  const boxX = margin - pad * 0.35;
  const boxY = y - pad * 0.35;
  const boxH = blockHeight + pad * 0.7;
  ctx.fillStyle = "rgba(8,8,12,.78)";
  ctx.beginPath();
  const radius = Math.round(pad * 0.6);
  ctx.roundRect(boxX, boxY, boxWidth + pad * 0.7, boxH, radius);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  lines.forEach((line, index) => ctx.fillText(line, margin, y + pad + index * lineHeight));

  return canvas.toDataURL("image/png");
}

function deriveSlideText(item, index) {
  const notes = notesFor(item);
  const slides = Array.isArray(notes.carousel_slides) ? notes.carousel_slides : [];
  const explicit = slides[index]?.text;
  if (explicit) return explicit;
  if (index === 0) return item.hook || item.caption || "";
  return item.caption?.split(/[.!?]/).map((x) => x.trim()).filter(Boolean)[index - 1] || "";
}

export default function AICreatorWorkspaceTrackB() {
  const [persona, setPersona] = useState("cara");
  const [contentType, setContentType] = useState("social");
  const [platform, setPlatform] = useState("Instagram Reels");
  const [goal, setGoal] = useState("Reach / attention");
  const [fanvuePurpose, setFanvuePurpose] = useState("Personal post");
  const [carouselStructure, setCarouselStructure] = useState("Story / conflict");
  const [brief, setBrief] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [advancedModel, setAdvancedModel] = useState("seedance");
  const [advancedDuration, setAdvancedDuration] = useState("10");

  const selectedPerson = useMemo(() => PEOPLE.find((p) => p.id === persona), [persona]);
  const personaBible = PUBLIC_BIBLES[persona === "cara_lila" ? "duo" : persona];

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("content_queue").select("id,persona_id,persona_name,platform,status,caption,image_url,image_urls,video_url,content_label,hook,cta,notes,created_at,post_type").like("content_label", "%AI Creator%").order("created_at", { ascending: false }).limit(50);
      if (data) setItems(data.map((row) => ({ ...row, stage: row.video_url ? "video_ready" : row.image_url ? "image_ready" : "review" })));
    })();
  }, []);

  const context = useMemo(() => [
    `CONTENT TYPE: ${contentType}`,
    contentType === "social" ? `PLATFORM: ${platform}\nGOAL: ${goal}` : "",
    contentType === "fanvue" ? `FANVUE PURPOSE: ${fanvuePurpose}\nFANVUE VISUAL DIRECTION: ${FANVUE_PURPOSES.find((x) => x[0] === fanvuePurpose)?.[1]}` : "",
    contentType === "carousel" ? `CAROUSEL STRUCTURE: ${carouselStructure}. Build 5–7 slides. On-image captions must be concise and swipe-worthy.` : "",
    brief.trim() ? `OPTIONAL USER DIRECTION: ${brief.trim()}` : "OPTIONAL USER DIRECTION: none — choose the strongest coherent idea from the persona bible yourself.",
  ].filter(Boolean).join("\n"), [contentType, platform, goal, fanvuePurpose, carouselStructure, brief]);

  async function generateContent() {
    setBusy(true);
    setMessage("Writing the concept… then running the Human Quality Gate…");
    try {
      const writerSystem = `You are the senior creative director for CornerstoneAIAssets. The selected creator is ${selectedPerson?.name}. PERSONA BIBLE:\n${personaBible}\n\nTHIS IS TRACK B, NOT TRACK A. Cara, Lila and Cara + Lila are lifestyle creators. NEVER put dealership, car-sale, automotive, lot-photo, client-brand, B2B or Cornerstone AI Group material into their content unless the user explicitly supplies a product brief that requires it.\n\nHUMAN CREATIVE RULES:\n1. Start from a believable human moment, observation, opinion, tension, useful detail, joke or question.\n2. The visual must literally make sense with the hook and caption.\n3. Setting, wardrobe, props, lighting, people and action must belong together.\n4. Avoid generic pretty-girl scenes. Prefer being caught mid-action: walking, training, getting ready, making coffee, travelling, talking, shopping, sunbathing, reading, laughing, filming, working on something that fits her life.\n5. Never invent facts, testimonials, results, prices, locations, product use or personal experiences.\n6. No generic influencer filler, sterile advertising, random spectacle or AI-slop phrasing.\n7. Fanvue is an adult private-page mode: tasteful swimwear, lounge, resort, pool, sunbed, bedroom, getting-ready and boudoir/editorial styling are appropriate; keep it adult and non-explicit. Never put Fanvue in a business setting.\n8. Carousel is one coherent visual/story thread, not five unrelated selfies.\n9. Every image prompt must include identity continuity, logical environment, wardrobe, action, camera, lighting, realistic texture and negative constraints.\n10. Every video prompt must describe one main action, camera behaviour, subtle human motion, timing and sound.\nReturn JSON only.`;
      const writerUser = `CREATOR: ${selectedPerson?.name}\n${context}\n\nReturn exactly this JSON shape:\n{"hook":"","script":"","caption":"","cta":"","image_prompt":"","video_prompt":"","creative_reason":"","post_type":"single_photo|carousel","carousel_slides":[{"slide":1,"text":"","image_prompt":""}]}\nIf there is no user direction, make the idea yourself from the persona. For Fanvue, make the writing personal, confident and teasing without explicit sexual description. For carousel, create 5–7 slide objects with concise on-image text and a matching image prompt for each slide.`;

      const draftJob = await queueQwen({ title: `AI Creator · ${selectedPerson?.name} · draft`, persona, systemPrompt: writerSystem, userPrompt: writerUser });
      const draft = parseJson(await waitQwen(draftJob, setMessage));

      const checkerSystem = `You are the Human Quality Gate for CornerstoneAIAssets. You are the final editor before Review Queue. Score the draft 0–100 and rewrite it where necessary.\n\nREJECT OR REWRITE if: the scene is random, pretty-for-no-reason, AI-slop, mismatched to the caption/hook, inconsistent with the creator, uses irrelevant props, has impossible wardrobe/location/action, mixes Track A automotive material into Cara/Lila lifestyle content, makes Fanvue bland/public/corporate, or makes a carousel out of disconnected images. The result should feel like a real creator's content plan, not a demo of an AI model.\n\nReturn JSON only: {"score":0,"issues":[],"revised":{same fields as the draft}}.`;
      const auditJob = await queueQwen({ title: `AI Creator · ${selectedPerson?.name} · human quality gate`, persona, systemPrompt: checkerSystem, userPrompt: `PERSONA BIBLE:\n${personaBible}\n\nCONTEXT:\n${context}\n\nDRAFT:\n${JSON.stringify(draft)}`, jobType: "creative_human_check" });
      const audit = parseJson(await waitQwen(auditJob, setMessage));
      if (Number(audit?.score || 0) < 72) throw new Error("Human Quality Gate rejected this concept. Generate again for a different idea.");

      const final = { ...draft, ...(audit?.revised || {}) };
      let caption = final.caption || "";
      if (contentType === "fanvue" && !caption.includes(DISCLOSURE)) caption = `${caption}\n\n${DISCLOSURE}`.trim();

      const row = {
        id: crypto.randomUUID(),
        persona_id: idFor(persona),
        persona_name: selectedPerson?.name,
        platform: contentType === "fanvue" ? "fv_page" : contentType === "carousel" ? "TikTok Photo Mode" : platform,
        status: "review",
        pillar: contentType === "fanvue" ? fanvuePurpose : contentType === "carousel" ? carouselStructure : goal,
        hook: final.hook || "",
        caption,
        cta: final.cta || null,
        photo_direction: final.image_prompt || "",
        photo_idea: final.image_prompt || "",
        post_type: contentType === "carousel" ? "carousel" : "single_photo",
        content_label: `AI Creator · ${selectedPerson?.name} · ${contentType}`,
        image_prompt: final.image_prompt || "",
        image_url: null,
        image_urls: null,
        video_url: null,
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: new Date().toTimeString().slice(0, 5),
        notes: JSON.stringify({
          script: final.script || "",
          video_prompt: final.video_prompt || "",
          creative_reason: final.creative_reason || "",
          human_audit: audit,
          carousel_slides: Array.isArray(final.carousel_slides) ? final.carousel_slides : [],
          fanvuePurpose: contentType === "fanvue" ? fanvuePurpose : null,
        }),
      };

      const { error } = await supabase.from("content_queue").upsert(row, { onConflict: "id" });
      if (error) throw error;
      setItems((current) => [{ ...row, stage: "review" }, ...current]);
      setBrief("");
      setMessage("Ready in Review Queue. Caption is prepared; image generation has not started.");
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  async function generateImage(item, promptOverride = null) {
    setBusy(true);
    setMessage(`Generating ${item.persona_name}'s image…`);
    try {
      const notes = notesFor(item);
      const response = await fetch("/api/generate-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: promptOverride || item.image_prompt || item.photo_direction,
          photo_idea: promptOverride || item.photo_idea,
          hook: item.hook,
          caption: item.caption,
          photoDirection: notes.video_prompt || item.photo_direction,
          personaId: item.persona_id,
        }),
      });
      const request = await response.json();
      if (!response.ok) throw new Error(request?.detail || request?.error || "Image generation failed");
      const imageUrl = await waitImage(request, setMessage);
      const update = { image_url: imageUrl, image_urls: [imageUrl], status: "draft" };
      const { error } = await supabase.from("content_queue").update(update).eq("id", item.id);
      if (error) throw error;
      setItems((current) => current.map((x) => x.id === item.id ? { ...x, ...update, stage: "image_ready" } : x));
      setMessage("Image ready. The original stays here; you can download it or make a Reel from the same image.");
      return imageUrl;
    } catch (error) {
      setMessage(error.message || String(error));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function generateCarousel(item) {
    const slides = notesFor(item).carousel_slides || [];
    if (!slides.length) return generateImage(item);
    setBusy(true);
    setMessage(`Generating ${slides.length} connected carousel slides…`);
    try {
      const urls = [];
      for (let i = 0; i < slides.length; i++) {
        const slidePrompt = `${slides[i]?.image_prompt || item.image_prompt}\n\nCONTINUITY LOCK: This is carousel slide ${i + 1} of ${slides.length}. Preserve exactly the same adult character, face, hair, body proportions, wardrobe family, location, time of day and lighting as the other slides. This must feel like one continuous moment, not a new photoshoot.`;
        const response = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: slidePrompt, photo_idea: slidePrompt, hook: slides[i]?.text || item.hook, caption: item.caption, personaId: item.persona_id }) });
        const request = await response.json();
        if (!response.ok) throw new Error(request?.detail || request?.error || `Slide ${i + 1} generation failed`);
        const url = await waitImage(request, (msg) => setMessage(`Carousel slide ${i + 1}/${slides.length}: ${msg}`));
        urls.push(url);
      }
      const { error } = await supabase.from("content_queue").update({ image_urls: urls, image_url: urls[0] || null, status: "draft" }).eq("id", item.id);
      if (error) throw error;
      setItems((current) => current.map((x) => x.id === item.id ? { ...x, image_urls: urls, image_url: urls[0] || null, status: "draft", stage: "image_ready" } : x));
      setMessage("Carousel images ready. Add the on-image captions, then download the slides.");
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  async function makeSimpleReel(item) {
    if (!item.image_url) { setMessage("Generate the image first."); return; }
    await generateReel(item, "grok", 6);
  }

  async function generateReel(item, provider, duration) {
    if (!item.image_url) { setMessage("Generate the image first."); return; }
    setBusy(true);
    const modelLabel = ADVANCED_MODELS.find((x) => x[0] === provider)?.[1] || provider;
    setMessage(`Generating ${provider === "grok" ? "Simple Reel" : modelLabel}…`);
    try {
      const notes = notesFor(item);
      const prompt = [
        notes.video_prompt || item.photo_direction || "Natural social movement.",
        "Use the attached image as the exact identity and starting frame. Preserve facial structure, hair, body proportions, skin texture, wardrobe and environment. Do not beautify or redesign the person. No identity drift.",
        provider === "grok"
          ? "Simple Reel: one continuous 5–8 second social shot. One main action only. Natural breathing, blinking, small posture change, subtle hair/clothing/environment motion, realistic handheld phone physics. No scene change. No impossible movement."
          : "Advanced Reel: director-style production brief. One clear main action, believable camera language, timed movement, physical continuity, realistic environmental audio where supported, and a visual payoff within the selected duration. Do not turn it into a generic AI demo.",
      ].join(" ");

      const response = await fetch("/api/track-b-video-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: item.image_url, prompt, provider, duration: Number(duration), resolution: provider === "h3" ? "2K" : "720p", aspectRatio: "9:16" }),
      });
      const request = await response.json();
      if (!response.ok) throw new Error(request?.detail || request?.error || "Video submit failed");
      const videoUrl = await waitVideo(request, setMessage);
      const notesUpdate = { ...notes, video_provider: provider, video_model: request.model, video_prompt_used: prompt };
      const { error } = await supabase.from("content_queue").update({ video_url: videoUrl, status: "draft", notes: JSON.stringify(notesUpdate) }).eq("id", item.id);
      if (error) throw error;
      setItems((current) => current.map((x) => x.id === item.id ? { ...x, video_url: videoUrl, status: "draft", stage: "video_ready", notes: JSON.stringify(notesUpdate) } : x));
      setMessage("Reel ready. Download it beside the original image.");
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  async function downloadCaptioned(item, text, index = 0) {
    if (!item.image_urls?.length && !item.image_url) { setMessage("Generate the image first."); return; }
    setBusy(true);
    try {
      const url = item.image_urls?.[index] || item.image_url;
      const output = await renderCaptionImage(url, text || deriveSlideText(item, index));
      download(output, `${(item.persona_name || "creator").replace(/\s+/g, "-").toLowerCase()}-${index + 1}-captioned.png`);
      setMessage("Captioned image downloaded.");
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  const styles = {
    avatar: { width: 72, height: 72, borderRadius: 14, objectFit: "cover", border: "1px solid #303648" },
    pill: { ...button, borderRadius: 999, padding: "8px 12px", fontSize: 12 },
    active: { ...primary, borderRadius: 999, padding: "8px 12px", fontSize: 12 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 },
  };

  return (
    <div style={page}>
      <div style={shell}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "#d9a43c", fontWeight: 800 }}>CornerstoneAIAssets · Track B</div>
          <h1 style={{ margin: "6px 0 4px", fontSize: 34, letterSpacing: "-.05em" }}>AI Creator</h1>
          <p style={{ ...muted, maxWidth: 760 }}>One connected creator workflow: character → idea → human quality check → review → image → captioned carousel → simple reel → advanced reel.</p>
        </div>

        <section style={card}>
          <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>1. Choose the creator</div>
          <div style={styles.grid}>
            {PEOPLE.map((person) => (
              <button key={person.id} onClick={() => setPersona(person.id)} style={persona === person.id ? activeCard : cardButton}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>{person.name}</div>
                <div style={{ ...muted, marginTop: 4 }}>{person.note}</div>
              </button>
            ))}
          </div>
        </section>

        <section style={card}>
          <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>2. What are we making?</div>
          <div style={styles.grid}>
            {CONTENT_TYPES.map(([id, label, desc]) => (
              <button key={id} onClick={() => setContentType(id)} style={contentType === id ? activeCard : cardButton}>
                <div style={{ fontSize: 14, fontWeight: 900 }}>{label}</div>
                <div style={{ ...muted, marginTop: 5 }}>{desc}</div>
              </button>
            ))}
          </div>
          {contentType === "social" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <label style={labelStyle}>Platform<select value={platform} onChange={(e) => setPlatform(e.target.value)} style={input}><option>{PLATFORMS.join("</option><option>")}</option></select></label>
              <label style={labelStyle}>Goal<select value={goal} onChange={(e) => setGoal(e.target.value)} style={input}><option>{GOALS.join("</option><option>")}</option></select></label>
            </div>
          )}
          {contentType === "carousel" && (
            <label style={{ ...labelStyle, marginTop: 14 }}>Carousel structure<select value={carouselStructure} onChange={(e) => setCarouselStructure(e.target.value)} style={input}>{CAROUSEL_STRUCTURES.map((value) => <option key={value}>{value}</option>)}</select></label>
          )}
          {contentType === "fanvue" && (
            <div style={{ marginTop: 14 }}>
              <div style={labelStyle}>Fanvue purpose</div>
              <div style={styles.grid}>{FANVUE_PURPOSES.map(([id, desc]) => <button key={id} onClick={() => setFanvuePurpose(id)} style={fanvuePurpose === id ? activeCard : cardButton}><div style={{ fontWeight: 900 }}>{id}</div><div style={{ ...muted, marginTop: 4 }}>{desc}</div></button>)}</div>
            </div>
          )}
          <label style={{ ...labelStyle, marginTop: 14 }}>Optional direction<textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Leave blank. The character bible will decide what she should post today." rows={3} style={{ ...input, resize: "vertical" }} /></label>
          <button disabled={busy} onClick={generateContent} style={{ ...primary, marginTop: 14 }}>{busy ? "Working…" : "Generate Content"}</button>
        </section>

        <section style={card}>
          <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 4 }}>3. Review Queue</div>
          <div style={muted}>Ideas arrive here first. Captions are ready before image generation, so you can reject weak concepts without spending on images.</div>
          <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
            {items.length === 0 && <div style={{ ...muted, padding: 18, textAlign: "center", border: "1px dashed #2a3040", borderRadius: 12 }}>Nothing waiting for review.</div>}
            {items.map((item) => {
              const notes = notesFor(item);
              const isCarousel = item.post_type === "carousel";
              return (
                <div key={item.id} style={{ border: "1px solid #2a3040", borderRadius: 14, padding: 16, background: "#11141b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#d9a43c", fontWeight: 900, textTransform: "uppercase" }}>{item.persona_name} · {item.platform}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 5 }}>{item.hook || "Content idea"}</div>
                    </div>
                    <div style={{ fontSize: 10, color: "#7c8497", textTransform: "uppercase" }}>{item.stage?.replace("_", " ")}</div>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
                    <div>
                      <div style={sectionLabel}>Post caption</div>
                      <div style={outputBox}>{item.caption || "—"}</div>
                      <div style={sectionLabel}>Creative reason</div>
                      <div style={{ ...outputBox, minHeight: 60 }}>{notes.creative_reason || "—"}</div>
                    </div>
                    <div>
                      <div style={sectionLabel}>Visual direction</div>
                      <div style={outputBox}>{item.photo_idea || item.image_prompt || "—"}</div>
                      <div style={sectionLabel}>Video direction</div>
                      <div style={{ ...outputBox, minHeight: 60 }}>{notes.video_prompt || "—"}</div>
                    </div>
                  </div>

                  {item.image_url ? (
                    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
                      <div>
                        <div style={sectionLabel}>Original image</div>
                        <img src={item.image_url} alt="Generated creator" style={{ width: "100%", maxWidth: 460, borderRadius: 12, display: "block", background: "#050608" }} />
                        <div style={actionRow}>
                          <button disabled={busy} onClick={() => download(item.image_url, `${item.persona_name}-original.png`)} style={button}>Download Image</button>
                          <button disabled={busy} onClick={() => downloadCaptioned(item, item.hook || item.caption)} style={button}>Download Captioned Image</button>
                        </div>
                      </div>
                      <div>
                        <div style={sectionLabel}>Reel output</div>
                        {item.video_url ? <video controls src={item.video_url} style={{ width: "100%", maxWidth: 460, borderRadius: 12, background: "#050608" }} /> : <div style={{ minHeight: 250, border: "1px dashed #303648", borderRadius: 12, display: "grid", placeItems: "center", color: "#626b7e", fontSize: 12 }}>No Reel yet. The original image stays intact.</div>}
                        <div style={actionRow}>
                          {item.video_url && <button onClick={() => download(item.video_url, `${item.persona_name}-reel.mp4`)} style={button}>Download Reel</button>}
                          <button disabled={busy} onClick={() => makeSimpleReel(item)} style={button}>Simple Reel</button>
                        </div>
                        <div style={{ marginTop: 12, padding: 12, border: "1px solid #2a3040", borderRadius: 12 }}>
                          <div style={sectionLabel}>Advanced Reel</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <select value={advancedModel} onChange={(e) => setAdvancedModel(e.target.value)} style={input}>{ADVANCED_MODELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
                            <select value={advancedDuration} onChange={(e) => setAdvancedDuration(e.target.value)} style={input}><option value="5">5 seconds</option><option value="8">8 seconds</option><option value="10">10 seconds</option><option value="15">15 seconds</option></select>
                          </div>
                          <button disabled={busy} onClick={() => generateReel(item, advancedModel, Number(advancedDuration))} style={{ ...primary, marginTop: 8, width: "100%" }}>Generate Advanced Reel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 14 }}>
                      <button disabled={busy} onClick={() => isCarousel ? generateCarousel(item) : generateImage(item)} style={primary}>{isCarousel ? "Generate Carousel Images" : "Generate Image"}</button>
                    </div>
                  )}

                  {isCarousel && item.image_urls?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={sectionLabel}>Carousel slides + on-image captions</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
                        {item.image_urls.map((url, index) => {
                          const slideText = deriveSlideText(item, index);
                          return <div key={url + index} style={{ border: "1px solid #2a3040", borderRadius: 12, padding: 8 }}><img src={url} alt={`Carousel slide ${index + 1}`} style={{ width: "100%", borderRadius: 8, display: "block" }} /><div style={{ fontSize: 11, lineHeight: 1.4, color: "#d5dbe5", marginTop: 7 }}>{slideText}</div><button disabled={busy} onClick={() => downloadCaptioned(item, slideText, index)} style={{ ...button, width: "100%", marginTop: 7 }}>Download Slide {index + 1}</button></div>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {message && <div style={{ position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)", background: "#151a24", border: "1px solid #2e3646", color: "#e8edf5", borderRadius: 999, padding: "10px 15px", fontSize: 11.5, fontWeight: 700, zIndex: 200, maxWidth: "90vw", textAlign: "center" }}>{message}</div>}
    </div>
  );
}

const labelStyle = { display: "flex", flexDirection: "column", gap: 7, fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800, color: "#7f8798" };
const sectionLabel = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800, color: "#7f8798", marginBottom: 7 };
const outputBox = { background: "#151822", border: "1px solid #2a3040", borderRadius: 10, padding: 10, color: "#dce2ec", fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap", marginBottom: 10, minHeight: 44 };
const actionRow = { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 };
const cardButton = { ...button, textAlign: "left", minHeight: 76 };
const activeCard = { ...cardButton, borderColor: "#d4af37", background: "rgba(212,175,55,.12)", color: "#fff" };
