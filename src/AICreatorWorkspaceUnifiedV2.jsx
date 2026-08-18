import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./creativeWorkspace.css";

const QWEN_MODEL = "mlx-community/Qwen3-8B-4bit";
const DISCLOSURE = "Cara is the dedicated demonstration model of Cornerstone AI Assets. Every client asset maps onto private, unique reference weights — ensuring their content remains consistently them, not us.";

const PEOPLE = [
  { id: "cara", name: "Cara", note: "Direct · dry · disciplined · British" },
  { id: "lila", name: "Lila", note: "Measured · warm · observant · understated" },
  { id: "cara_lila", name: "Cara + Lila", note: "Contrast · chemistry · natural interaction" },
];
const CONTENT_TYPES = [
  ["social", "Social post"],
  ["carousel", "Carousel"],
  ["fanvue", "Fanvue"],
];
const PLATFORMS = ["Instagram", "Instagram Reels", "TikTok", "Facebook", "Facebook Reels", "YouTube Shorts"];
const GOALS = ["Reach / attention", "Engagement", "Lifestyle / filler", "Product discovery", "Conversion", "Story / personality", "Proof / authority"];
const FANVUE_PURPOSES = ["Personal post", "Photo set", "Personality", "Interaction", "Tease", "Behind the scenes"];
const CAROUSEL_STRUCTURES = ["Story / conflict", "Useful list", "Identity / aspiration", "Quick hit", "Proof / comparison", "Visual reveal"];
const ADVANCED = [
  ["h3", "MiniMax H3", 8],
  ["kling", "Kling 3.0 Pro", 5],
  ["seedance", "Seedance 2.0 Fast", 10],
  ["grok", "Grok Imagine Video", 6],
];

const PUBLIC_BIBLES = {
  cara: `Cara Whitmore is an adult fictional creator. Direct, dry, disciplined and British. Her natural content worlds are training, discipline, money, work, routines, confidence, ordinary life, humour and specific observations. She is practical and understated. She is not a generic motivational influencer.`,
  lila: `Lila Sterling is an adult fictional creator. Warm, measured, observant and understated. Her natural content worlds are lifestyle, travel, wellness, beauty, routines, quiet opinions, small observations and believable aspiration. She is calm rather than loud. She is not generic influencer filler.`,
  duo: `Cara + Lila are two separate adult fictional creators. Cara is direct, dry, disciplined and British. Lila is warm, measured, observant and understated. Their shared content uses real contrast, chemistry, banter, shared moments and small believable interactions. Never merge their identities.`,
};

const FANVUE_VISUALS = {
  "Personal post": "Private-page lifestyle moment. Bedroom, lounge, balcony or poolside. Relaxed, personal, attractive and intimate without explicit nudity. The image should feel like content shared with subscribers, not public B2B or an advert.",
  "Photo set": "Cohesive private-page photo set. Resort, pool, sunbed, bedroom or terrace. Swimwear, fitted lounge pieces or tasteful boudoir styling are appropriate. Keep one believable environment and consistent light/wardrobe across the set.",
  "Personality": "Private-page personality post. Bedroom, kitchen, lounge, getting ready, lazy morning, pool or travel moment. Attractive but conversational and human, with a playful or teasing undertone.",
  "Interaction": "Direct-to-subscriber scene. Close selfie, sitting on a bed, lounge chair, sunbed, balcony or pool edge. Eye contact, playful expression and a reason to reply. Teasing rather than explicit.",
  "Tease": "Private-page teaser. Boudoir/editorial or resort mood, swimwear, silk or fitted lounge styling, confident direct gaze, suggestive framing and a sense that there is more behind the paywall. Keep it clothed and non-explicit.",
  "Behind the scenes": "Behind-the-scenes creator moment. Getting ready, fixing hair, choosing an outfit, poolside, hotel room, sunbed, travel day or preparing a shoot. Flirty and candid, with imperfections and ordinary details.",
};

const FALLBACK_FANVUE_SCENES = {
  "Personal post": "Cara or Lila relaxing in a private bedroom or bright apartment lounge, natural window light, candid phone-photo feel, comfortable fitted lounge set, relaxed eye contact.",
  "Photo set": "Cara or Lila on a private resort sunbed beside a pool, warm afternoon sun, neutral swimwear, sunglasses nearby, relaxed pose, believable holiday atmosphere.",
  "Personality": "Cara or Lila in a bright bedroom getting ready, oversized shirt over a fitted top, hair down, candid mirror or phone-photo moment, warm morning daylight.",
  "Interaction": "Cara or Lila seated on a sunbed or bed, close phone-camera framing, direct eye contact, playful half-smile, simple fitted swimwear or lounge set, warm natural light.",
  "Tease": "Cara or Lila by a private pool at golden hour, tasteful two-piece swimwear or fitted silk lounge styling, confident direct gaze, elegant but teasing pose, premium phone-photo realism.",
  "Behind the scenes": "Cara or Lila in a hotel room or private apartment preparing for a shoot, half-finished hair, makeup items or clothes nearby, candid mid-action frame, soft daylight.",
};

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("Qwen returned invalid JSON");
}
function creatorId(id) { return id === "cara_lila" ? "duo" : id; }
function nameFor(id) { return PEOPLE.find((p) => p.id === id)?.name || "Cara"; }
function notesFor(item) { try { return item?.notes ? JSON.parse(item.notes) : {}; } catch { return {}; } }
function modeLabel(mode) { return CONTENT_TYPES.find((x) => x[0] === mode)?.[1] || mode; }

async function queueQwen({ title, personaId, jobType, systemPrompt, userPrompt }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title,
    job_type: jobType,
    model: QWEN_MODEL,
    persona_id: personaId,
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    options: { max_tokens: 3200, temperature: 0.62 },
    status: "queued",
    production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function waitQwen(jobId, setMessage) {
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3500));
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
  const deadline = Date.now() + 4 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const r = await fetch("/api/generate-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: request.requestId, type: "image", status_url: request.statusUrl, result_url: request.resultUrl }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error || "Image status check failed");
    if (d.status === "COMPLETED") return d.imageUrl || d.url;
    if (d.status === "FAILED") throw new Error(d?.error || "Image generation failed");
    setMessage(`Generating image… ${d.status}`);
  }
  throw new Error("Image generation timed out.");
}

async function waitVideo(request, setMessage) {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3500));
    const r = await fetch("/api/track-b-video-poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { requestId: request.requestId, model: request.model, provider: request.providerKey || request.provider, statusUrl: request.statusUrl, action: "status" },
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error || "Video status failed");
    if (["FAILED", "CANCELLED"].includes(d.status)) throw new Error(d.detail || `Video generation ${String(d.status).toLowerCase()}`);
    if (d.status === "COMPLETED") {
      const result = await fetch("/api/track-b-video-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.requestId, model: request.model, provider: request.providerKey || request.provider, action: "result" }),
      });
      const out = await result.json();
      if (!result.ok || !out.videoUrl) throw new Error(out?.error || "Completed video did not return a URL");
      return out.videoUrl;
    }
    setMessage(`Generating reel… ${d.status || "working"}`);
  }
  throw new Error("Video generation timed out.");
}

function downloadAsset(url, filename) {
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function AICreatorWorkspaceUnifiedV2() {
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

  const selected = useMemo(() => PEOPLE.find((p) => p.id === persona), [persona]);
  const personaBible = persona === "cara_lila" ? PUBLIC_BIBLES.duo : PUBLIC_BIBLES[persona];

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("content_queue").select("id,persona_id,persona_name,platform,status,caption,image_url,image_urls,video_url,content_label,hook,cta,notes,created_at,post_type").like("content_label", "%AI Creator%").order("created_at", { ascending: false }).limit(50);
      if (data) setItems(data.map((row) => ({ ...row, stage: row.video_url ? "video_ready" : row.image_url ? "image_ready" : "review" })));
    })();
  }, []);

  function buildContext() {
    return [
      `CONTENT TYPE: ${modeLabel(contentType)}`,
      contentType === "social" ? `PLATFORM: ${platform}\nGOAL: ${goal}` : "",
      contentType === "fanvue" ? `FANVUE PURPOSE: ${fanvuePurpose}\nFANVUE VISUAL RULE: ${FANVUE_VISUALS[fanvuePurpose]}` : "",
      contentType === "carousel" ? `CAROUSEL STRUCTURE: ${carouselStructure}\nBuild 5–7 slides.` : "",
      brief.trim() ? `OPTIONAL USER DIRECTION: ${brief.trim()}` : "OPTIONAL USER DIRECTION: none. Choose the strongest idea from the persona bible yourself.",
    ].filter(Boolean).join("\n");
  }

  async function generateContent() {
    setBusy(true);
    setMessage("Creating content from the persona bible… then running the human-quality check…");
    try {
      const writerSystem = `You are the senior creative director for CornerstoneAIAssets. The PERSONA BIBLE is the source of truth. Do not mix business tracks. The selected creator is ${selected?.name}. Never insert dealership, car-sales, automotive, client-brand or Cornerstone AI Group material into Cara, Lila or Cara + Lila content.\n\nPERSONA BIBLE:\n${personaBible}\n\nHUMAN CREATIVE RULES:\n1. Start from a believable human moment, observation, tension, opinion, useful detail, joke or question.\n2. The visual must literally make sense with the hook and caption.\n3. Every prop, location, wardrobe choice and action must belong in the same scene.\n4. No random cars, dealerships, corporate settings or B2B props unless the selected creator is explicitly being used for a supplied client/product brief.\n5. Never invent personal experiences, testimonials, results, prices, locations or product use.\n6. No generic influencer language or AI-slop filler.\n7. Premium means believable craft, not sterile perfection.\n8. If no user direction is supplied, invent a coherent idea from the creator's established life and audience.\n9. For Fanvue: adult, private-page, teasing, attractive, swimwear/loungewear/boudoir where appropriate, but non-explicit. Prefer bedrooms, lounges, resorts, beaches, pools, terraces, sunbeds, hotel rooms and getting-ready moments. Never business settings.\n10. For Carousel: every slide must belong to one coherent story or visual thread.\n\nReturn JSON only.`;
      const writerUser = `CREATOR: ${selected?.name}\n${buildContext()}\n\nReturn exactly {"hook":"","script":"","caption":"","cta":"","image_prompt":"","video_prompt":"","post_type":"single_photo|carousel","creative_reason":"","carousel_slides":[{"slide":1,"text":"","image_prompt":""}]}.\nFor Fanvue, make the caption confident, personal and teasing without explicit sexual description. Include the required Cornerstone disclosure exactly at the end of the caption for Cara/Lila owned content.`;

      const draftJob = await queueQwen({ title: `AI Creator · ${selected?.name} · draft`, personaId: creatorId(persona), jobType: "content_draft", systemPrompt: writerSystem, userPrompt: writerUser });
      const draft = parseJson(await waitQwen(draftJob, setMessage));

      const checkerSystem = `You are the Human Quality Gate. Check the proposed content before it reaches Review Queue. Return only JSON. Score 0–100 and rewrite anything weak.\n\nReject or rewrite if: the scene is random; the hook says one thing but the image shows another; the location, clothing and action do not belong together; the content looks like generic AI influencer filler; it mixes Cara/Lila lifestyle content with dealership/B2B material; Fanvue content is too public, corporate or bland; a Carousel contains disconnected images; facts or personal experiences are invented; or the creator would not plausibly post it.\n\nReturn {"pass":true|false,"score":0-100,"issues":[],"revised":{same fields as draft}}.`;
      const auditJob = await queueQwen({ title: `AI Creator · ${selected?.name} · human quality gate`, personaId: creatorId(persona), jobType: "creative_human_check", systemPrompt: checkerSystem, userPrompt: `PERSONA BIBLE:\n${personaBible}\n\nCONTEXT:\n${buildContext()}\n\nDRAFT:\n${JSON.stringify(draft)}` });
      const audit = parseJson(await waitQwen(auditJob, setMessage));
      if (Number(audit?.score || 0) < 72) throw new Error("Human Quality Gate rejected this concept. Generate again for a different idea.");
      const final = { ...draft, ...(audit.revised || {}) };

      const row = {
        id: crypto.randomUUID(),
        persona_id: creatorId(persona),
        persona_name: selected?.name,
        platform: contentType === "fanvue" ? "fv_page" : contentType === "carousel" ? "TikTok Photo Mode" : platform,
        status: "review",
        pillar: contentType === "fanvue" ? fanvuePurpose : contentType === "carousel" ? carouselStructure : goal,
        hook: final.hook || "",
        caption: contentType === "fanvue" && !String(final.caption || "").includes(DISCLOSURE) ? `${final.caption || ""}\n\n${DISCLOSURE}`.trim() : (final.caption || ""),
        cta: final.cta || null,
        photo_direction: final.image_prompt || "",
        photo_idea: final.image_prompt || "",
        post_type: contentType === "carousel" ? "carousel" : "single_photo",
        content_label: `AI Creator · ${selected?.name} · ${modeLabel(contentType)}`,
        image_prompt: final.image_prompt || "",
        image_url: null,
        image_urls: null,
        video_url: null,
        scheduled_date: new Date().toISOString().slice(0,10),
        scheduled_time: new Date().toTimeString().slice(0,5),
        notes: JSON.stringify({
          script: final.script || "",
          video_prompt: final.video_prompt || "",
          creative_reason: final.creative_reason || "",
          human_audit: audit,
          carousel_slides: Array.isArray(final.carousel_slides) ? final.carousel_slides : [],
          fanvuePurpose: contentType === "fanvue" ? fanvuePurpose : null,
          contentType,
        }),
      };
      const { error } = await supabase.from("content_queue").upsert(row, { onConflict: "id" });
      if (error) throw error;
      setItems((old) => [{ ...row, stage: "review" }, ...old]);
      setBrief("");
      setMessage("Content is in Review Queue. Caption is ready. No image has been generated yet.");
    } catch (e) { setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function generateImage(item) {
    setBusy(true);
    setMessage(`Generating ${item.persona_name}'s image…`);
    try {
      const notes = notesFor(item);
      const r = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: item.image_prompt || item.photo_direction, photo_idea: item.photo_idea, hook: item.hook, caption: item.caption, photoDirection: notes.video_prompt || item.photo_direction, personaId: item.persona_id }) });
      const request = await r.json();
      if (!r.ok) throw new Error(request?.detail || request?.error || "Image generation failed");
      const url = await waitImage(request, setMessage);
      const update = { image_url: url, image_urls: [url], status: "draft" };
      const { error } = await supabase.from("content_queue").update(update).eq("id", item.id);
      if (error) throw error;
      const next = { ...item, ...update, stage: "image_ready" };
      setItems((old) => old.map((x) => x.id === item.id ? next : x));
      setMessage("Image ready. The original image stays here; choose Download, Simple Reel or Advanced Reel.");
    } catch (e) { setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function generateCarousel(item) {
    const notes = notesFor(item);
    const slides = Array.isArray(notes.carousel_slides) ? notes.carousel_slides : [];
    if (!slides.length) return generateImage(item);
    setBusy(true);
    setMessage(`Generating ${slides.length} coherent carousel slides…`);
    try {
      const urls = [];
      for (const slide of slides) {
        const r = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: slide.image_prompt || item.image_prompt, photo_idea: slide.image_prompt || item.image_prompt, hook: slide.text || item.hook, caption: item.caption, personaId: item.persona_id }) });
        const request = await r.json();
        if (!r.ok) throw new Error(request?.detail || request?.error || "Carousel image generation failed");
        urls.push(await waitImage(request, setMessage));
      }
      const update = { image_url: urls[0], image_urls: urls, status: "draft" };
      const { error } = await supabase.from("content_queue").update(update).eq("id", item.id);
      if (error) throw error;
      setItems((old) => old.map((x) => x.id === item.id ? { ...x, ...update, stage: "image_ready" } : x));
      setMessage("Carousel ready. All slides are kept with the post.");
    } catch (e) { setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function generateReel(item, provider = "grok", duration = 6) {
    if (!item.image_url) return setMessage("Generate the image first.");
    setBusy(true);
    setMessage(`Generating ${provider === "grok" && duration <= 6 ? "Simple Reel" : ADVANCED.find((x) => x[0] === provider)?.[1] || provider}…`);
    try {
      const notes = notesFor(item);
      const simple = provider === "grok" && Number(duration) <= 6;
      const prompt = [
        notes.video_prompt || item.photo_direction || item.photo_idea,
        "Preserve the exact person, face, hair, body proportions, wardrobe and environment from the image. No identity drift. No new people. No new location. No unrelated objects.",
        simple ? "Simple Reel: one continuous 5-6 second social clip. Natural breathing, blink, tiny posture shift, subtle camera drift, environmental motion and authentic phone-camera physics." : "Advanced Reel: 5-15 seconds, deliberate camera behaviour, physical action, continuity, timed beats and a clear visual payoff. Treat the prompt as a production brief rather than a generic animation command.",
      ].join(" ");
      const r = await fetch("/api/track-b-video-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: item.image_url, prompt, provider, duration: Number(duration), resolution: "720p", aspectRatio: "9:16" }) });
      const request = await r.json();
      if (!r.ok) throw new Error(request?.error || "Video submit failed");
      const url = await waitVideo(request, setMessage);
      const notesNext = { ...notes, video_provider: request.providerKey || provider, video_model: request.model, video_duration: duration };
      const update = { video_url: url, status: "draft", notes: JSON.stringify(notesNext) };
      const { error } = await supabase.from("content_queue").update(update).eq("id", item.id);
      if (error) throw error;
      setItems((old) => old.map((x) => x.id === item.id ? { ...x, ...update, stage: "video_ready" } : x));
      setMessage("Reel ready. It is saved beside the original image.");
    } catch (e) { setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  return <div style={page}>
    <div style={shell}>
      <div className="cw-head">
        <div><div className="cw-kicker">CornerstoneAIAssets · Track B</div><h1>AI Creator</h1><p>One connected creative workflow for Cara and Lila.</p></div>
      </div>

      <section className="cw-card">
        <div className="cw-step">1 · Who are we creating for?</div>
        <div className="cw-mode-row">
          {PEOPLE.map((p) => <button key={p.id} className={persona === p.id ? "on" : ""} onClick={() => setPersona(p.id)}>{p.name}<small style={{display:"block",marginTop:4,fontWeight:500,opacity:.65}}>{p.note}</small></button>)}
        </div>

        <div className="cw-block">
          <div className="cw-step">2 · What are we making?</div>
          <div className="cw-mode-row">{CONTENT_TYPES.map(([id,label]) => <button key={id} className={contentType === id ? "on" : ""} onClick={() => setContentType(id)}>{label}</button>)}</div>
        </div>

        {contentType === "social" && <div className="cw-grid four" style={{marginTop:16}}>
          <label>Platform<select style={input} value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Goal<select style={input} value={goal} onChange={(e) => setGoal(e.target.value)}>{GOALS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <div style={{gridColumn:"span 2"}} />
        </div>}
        {contentType === "fanvue" && <div className="cw-block"><div className="cw-label">Fanvue purpose</div><div className="cw-options">{FANVUE_PURPOSES.map((x) => <button key={x} className={fanvuePurpose === x ? "on" : ""} onClick={() => setFanvuePurpose(x)}><b>{x}</b><span>{FANVUE_VISUALS[x]}</span></button>)}</div></div>}
        {contentType === "carousel" && <div className="cw-block"><div className="cw-label">Carousel structure</div><div className="cw-options">{CAROUSEL_STRUCTURES.map((x) => <button key={x} className={carouselStructure === x ? "on" : ""} onClick={() => setCarouselStructure(x)}><b>{x}</b><span>One coherent visual thread. Every slide earns the next swipe.</span></button>)}</div></div>}

        <label className="cw-full">What do you want to create? <span>Optional — leave blank and the persona chooses the idea.</span><textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Optional topic, product, situation or idea. The character bible is enough on its own." /></label>
        <button className="cw-primary" disabled={busy} onClick={generateContent}>{busy ? "Working…" : "Generate Content"}</button>
      </section>

      <section className="cw-card">
        <div className="cw-step">3 · Review Queue</div>
        <div className="cw-test-intro">The creative is written first. The caption is ready before any image spend. Human Quality Gate checks coherence, persona fit and AI-slop before the item reaches this queue.</div>
        {!items.length && <div className="cw-empty">Nothing in Review Queue yet.</div>}
        <div className="cw-list">{items.map((item) => {
          const notes = notesFor(item);
          const carousel = Array.isArray(notes.carousel_slides) && notes.carousel_slides.length > 0;
          return <article key={item.id} className="cw-row">
            <div><b>{item.persona_name}</b><span>{item.content_label?.replace("AI Creator · ", "")}</span><span>{item.platform}</span></div>
            <div>
              <div className="cw-row-caption"><strong>{item.hook}</strong>{item.caption ? `\n\n${item.caption}` : ""}</div>
              <div className="cw-actions">
                {!item.image_url && <button className="cw-primary" disabled={busy} onClick={() => carousel ? generateCarousel(item) : generateImage(item)}>{carousel ? "Generate Carousel" : "Generate Image"}</button>}
                {item.image_url && <button className="cw-secondary" onClick={() => downloadAsset(item.image_url, `${item.persona_name}-image.jpg`)}>Download Image</button>}
                {item.image_url && !item.video_url && <button className="cw-secondary" disabled={busy} onClick={() => generateReel(item, "grok", 6)}>Simple Reel</button>}
                {item.image_url && !item.video_url && <><select style={{...input,width:180}} value={advancedModel} onChange={(e) => setAdvancedModel(e.target.value)}>{ADVANCED.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select><select style={{...input,width:110}} value={advancedDuration} onChange={(e) => setAdvancedDuration(e.target.value)}><option value="5">5 sec</option><option value="6">6 sec</option><option value="8">8 sec</option><option value="10">10 sec</option><option value="15">15 sec</option></select><button className="cw-secondary" disabled={busy} onClick={() => generateReel(item, advancedModel, Number(advancedDuration))}>Advanced Reel</button></>}
                {item.video_url && <button className="cw-secondary" onClick={() => downloadAsset(item.video_url, `${item.persona_name}-reel.mp4`)}>Download Reel</button>}
              </div>
              {item.image_url && <div className="cw-media"><div className="cw-media-main"><img src={item.image_url} alt="Generated creator" /></div>{carousel && Array.isArray(item.image_urls) && item.image_urls.length > 1 && <div className="cw-thumbs">{item.image_urls.map((u,i)=><img key={i} src={u} alt={`Slide ${i+1}`} />)}</div>}{item.video_url && <video className="cw-result-video" controls src={item.video_url} style={{marginTop:12}} />}</div>}
            </div>
          </article>;
        })}</div>
      </section>

      {message && <div className="cw-status">{message}</div>}
    </div>
  </div>;
}
