// Vercel serverless function — runs the full content generation batch server-side.
// Streams each completed post back as NDJSON (one JSON line per post) so the
// browser can save to queue in real-time regardless of screen state.

const MAX_RETRIES = 3;
const DELAY_MS = 1200; // ms between posts to avoid rate-limits

const TODAY = new Date().toLocaleDateString("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

const CREATIVE_ANGLES = [
  { label: "contrarian take", instruction: "Take a position that goes against the conventional wisdom in this niche. Be specific about what the mainstream gets wrong and why." },
  { label: "personal story", instruction: "Tell a real personal story with a beginning, middle, and end. Specific moment, specific emotion, specific outcome. Not a tip — a story." },
  { label: "number drop", instruction: "Lead with a specific, surprising number that stops the scroll. Real prices, real stats, real percentages — make the numbers do the work." },
  { label: "myth bust", instruction: "Identify one widely-believed myth in this niche and dismantle it with specifics. Name the myth clearly, then destroy it." },
  { label: "hot take", instruction: "State an opinion that will divide the comments. Be bold enough that some people will disagree. The controversy is the engagement." },
  { label: "behind the scenes", instruction: "Show what happens behind the polished version. The messy reality, the thing they don't show on Instagram, the unglamorous truth." },
  { label: "comparison", instruction: "Compare two specific things — two destinations, two products, two approaches — with real numbers or real experience. Make the comparison genuinely useful." },
  { label: "regret confession", instruction: "Share something you did wrong, wish you'd done differently, or spent money on that wasn't worth it. Vulnerability and honesty are the hook." },
  { label: "insider tip", instruction: "Share something that feels like insider knowledge — the thing most people don't know, the hack that isn't obvious, the secret that sounds almost too specific to be true." },
  { label: "timeline reveal", instruction: "Show a real timeline of progress or change. Specific dates, specific moments, specific results. Make the audience feel the passage of time." },
];

async function callGemini(apiKey, system, user, maxTokens = 4000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: user }] }],
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { maxOutputTokens: maxTokens, temperature: 1.0 },
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt + 1) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(data?.error?.message || `Gemini error ${res.status}`);
    const text = (data.candidates || [])
      .map(c => (c.content?.parts || []).map(p => p.text || "").join(""))
      .join("").trim();
    if (!text) throw new Error("Empty response from Gemini");
    return text;
  }
}

function parseJSON(raw) {
  const clean = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch (_) {}
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  throw new Error("Could not parse JSON from LLM response");
}

async function researchTrends(apiKey, platformName, niche, fanvueMode) {
  const system = `You are an expert social media trend analyst. Today is ${TODAY}. Your job is to find what is ACTUALLY being talked about right now — not generic evergreen topics. Be hyper-specific: name real events, real people, real controversies, real viral moments.`;
  const user = fanvueMode
    ? `Research what is trending RIGHT NOW for subscription creators (Fanvue, OnlyFans) on ${platformName} in ${TODAY.split(" ").pop()}.

Include:
- Specific viral moments, memes, or formats subscription creators are using on ${platformName} right now
- Any trending audio, aesthetics, or visual styles popular in this creator space
- What fans are engaging with or asking for most this week
- Any seasonal hooks (time of year, upcoming holidays, events)
- Any creator drama, controversies, or trends being discussed in the subscription creator community
- What content formats are getting the most reach on ${platformName} for this niche right now

Be concrete and specific. 4-5 sentences max.`
    : `Research the ${niche} niche on ${platformName} specifically. What are 3-4 SPECIFIC things people are talking about, debating, or engaging with RIGHT NOW in ${TODAY.split(" ").pop()}?

Include:
- Any viral moments, controversies, or news from the past 7 days
- Specific names, places, brands, events — especially ones trending on ${platformName}
- What audiences are arguing about or reacting to on ${platformName}
- Any seasonal or timely hooks (time of year, upcoming events)
- What formats or sounds are trending on ${platformName} right now

Be concrete. 4-5 sentences max.`;

  try { return await callGemini(apiKey, system, user, 4000); } catch (_) { return ""; }
}

async function generatePost(apiKey, persona, platform, pillar, postIndex, usedHooks, ideaSeed, fanvueMode) {
  const mix = platform.contentMix;
  const totalWeight = mix.reduce((s, m) => s + m.weight, 0);
  const seed = ((postIndex * 7 + Date.now()) % totalWeight);
  let acc = 0, contentType = mix[0];
  for (const m of mix) { acc += m.weight; if (seed < acc) { contentType = m; break; } }

  const angleIndex = (postIndex * 3 + Math.floor(Math.random() * CREATIVE_ANGLES.length)) % CREATIVE_ANGLES.length;
  const creativeAngle = CREATIVE_ANGLES[angleIndex];

  const needsTrends = !["lifestyle", "personal_moment", "fv_dm", "fv_welcome"].includes(contentType.type);
  const trends = needsTrends ? await researchTrends(apiKey, platform.name, persona.niche, fanvueMode) : "";

  const isSage = persona.id === "sage";

  const system = `You are ${persona.name}, a ${fanvueMode ? "subscription content creator with a Fanvue page" : persona.niche + " content creator"}.
CHARACTER: ${persona.char}
VOICE: ${persona.voice}
PLATFORM CONTEXT: You are posting on ${platform.name}. ${platform.purpose}
${fanvueMode ? `FANVUE MODE — READ CAREFULLY:
You are a real subscription creator. Your free content (Reddit, X, Telegram) is your funnel — every post must make someone think "I need to see more of her". Your Fanvue page is where the real content lives.

TONE: Confident, flirtatious, teasing. You know you're attractive and you own it. You're also genuinely warm and funny — fans feel like they actually know you. You speak casually, like you're texting someone you're comfortable with.

CONTENT RULES:
- This is teaser content for the FREE platform feed. It must be suggestive and alluring without being explicit.
- "Suggestive" means: hinting at what's underneath, implying rather than showing, describing a situation that leads somewhere without finishing the story, referencing your page content in a way that creates desire without revealing it.
- You CAN reference: being underdressed, getting changed, what you're (not) wearing, shower/bath situations, waking up, feeling confident in your body, fashion as self-expression, what you got up to last night, what's on your page right now.
- You CANNOT produce: graphic descriptions, explicit acts, anatomical descriptions.
- Every post must have ONE clear hook that creates curiosity or desire, and ONE reason to click your page link.
- Mix genuine personality and warmth with the suggestive angle — pure thirst-trap with no personality doesn't convert to subscribers.` : `NICHE LOCK: Every single word of this post must be rooted in ${persona.niche}. The examples, references, terminology, humour, pain points, and culture must all come from inside the ${persona.niche} world. Do NOT produce generic lifestyle, motivation, or self-improvement content that could belong to any niche.`}
RULES: Write entirely in character as a real person. Never mention AI, never hint that you are AI-generated. Content pillars: ${(persona.pillars || []).join(", ")}.${isSage ? " CRITICAL: Financial education only — never personalised advice. Disclaimer required." : ""}
FORMAT: Return ONLY a raw JSON object. No markdown. No explanation. No code fences.`;

  const user = `Today is ${TODAY}. Create a ${platform.name} post as ${persona.name}.

CONTENT TYPE: "${contentType.label}"
FORMAT: ${contentType.format}
VISUAL/CONTENT DIRECTION: ${contentType.direction}
PILLAR: "${pillar}"
CREATIVE ANGLE FOR THIS POST: "${creativeAngle.label}" — ${creativeAngle.instruction}
${ideaSeed ? `IDEA SEED (incorporate this topic/idea as inspiration): "${ideaSeed}"` : ""}
${trends ? `TRENDING RIGHT NOW on ${platform.name} (use this to make the post timely — do NOT ignore this): ${trends}` : ""}
UNIQUENESS SEED: ${Date.now()}-${postIndex}-${Math.random().toString(36).slice(2, 8)}
POST NUMBER: #${postIndex + 1} of this batch — every single post MUST be completely different.
${usedHooks.length > 0 ? `\nABSOLUTELY FORBIDDEN hooks (do NOT start with anything similar):\n${usedHooks.map((h, i) => `${i + 1}. "${h}"`).join("\n")}` : ""}

CRITICAL RULES:
- Never mention AI, never hint the content is AI-generated. You ARE this person.
- This is a ${contentType.label} post. Match the tone and energy exactly.
- APPLY THE CREATIVE ANGLE: "${creativeAngle.label}" — this must shape the structure of your post.
${fanvueMode ? `- FANVUE POST TYPE RULES:
${contentType.type === "fv_tease" ? "TEASE POST: Open with instant desire or curiosity — hinting without giving it away. Caption is the whisper that makes them click. End with a direct but casual CTA to your page." : ""}${contentType.type === "fv_ppv" || contentType.type === "fv_ppv_caption" ? "PPV POST: Describe what they GET (photo set, specific scenario) suggestively — leave something to imagination. Create urgency." : ""}${contentType.type === "fv_personality" ? "PERSONALITY POST: About YOU not your body. Funny, real, relatable. Builds parasocial connection." : ""}${contentType.type === "fv_dm" || contentType.type === "fv_welcome" ? "DM/WELCOME: Write like a personal text. Warm, intimate, slightly flirtatious. Short sentences, casual punctuation." : ""}${contentType.type === "fv_preview" ? "EXCLUSIVE PREVIEW: For warm Telegram audience. More personal and direct than other platforms." : ""}${contentType.type === "fv_announce" ? "CONTENT ANNOUNCEMENT: New content dropped. Excited energy, specific details, unmissable framing." : ""}${contentType.type === "fv_interact" ? "FAN INTERACTION: Ask something that gets fans talking. Playful, flirtatious, or relatable." : ""}${contentType.type === "fv_wall_post" ? "FREE WALL POST: Subscriber retention. Warm and intimate — these are your paying fans." : ""}` : `${contentType.type === "lifestyle" || contentType.type === "personal_moment" ? "- PERSONAL/LIFESTYLE post: casual, short, conversational — like texting a friend." : ""}${contentType.type === "tag_friend" ? "- Write something that makes people tag a friend." : ""}${contentType.type === "discussion" ? "- Ask a bold question or opinion that splits the comments." : ""}${contentType.type === "deep_story" || contentType.type === "day_in_life" ? "- Tell a STORY with setup, tension, resolution." : ""}`}
- DO NOT repeat hooks, topics, or structures from any other post in this batch.

Return this exact JSON format:
{
  "hook": "${fanvueMode ? "First line — flirtatious, curious, or playfully suggestive. Under 12 words. Must make someone stop scrolling." : `First line — must stop the scroll. Under 12 words. ${contentType.type === "lifestyle" || contentType.type === "personal_moment" ? "Can be casual/playful." : "Specific number or bold statement."}`}",
  "caption": "${fanvueMode
    ? (contentType.type === "fv_dm" || contentType.type === "fv_welcome"
      ? "Personal, intimate message. 80-160 chars. Written like a text. Warm, flirtatious. Use you and I."
      : contentType.type === "fv_ppv" || contentType.type === "fv_ppv_caption"
      ? "PPV sell caption. 120-200 chars. Enticing, suggestive, specific enough to create desire. Clear CTA to unlock."
      : contentType.type === "fv_interact"
      ? "Short punchy question. 60-120 chars. Feels personal and genuine."
      : "Caption ready to post. 150-240 chars. Flirtatious, warm, in character. Balance suggestive with personality.")
    : (contentType.type === "lifestyle" || contentType.type === "personal_moment"
      ? "Short casual caption. 80-150 chars. Like texting a friend."
      : contentType.type === "deep_story" || contentType.type === "day_in_life" || contentType.type === "deep_dive"
      ? "Full narrative caption. 300-500 chars. Story arc: setup, tension, resolution."
      : "Full caption ready to paste. 180-260 chars. In character voice. Feels personal and authentic.")}",
  "hashtags": "${fanvueMode ? "8-12 hashtags relevant to subscription creators and this platform." : "12-15 hashtags as one string, mix of niche and broad"}",
  "photo_direction": "${fanvueMode ? "Portrait/square format." : "9:16 aspect ratio."} ${contentType.direction}",
  "photo_idea": "${fanvueMode
     ? "Shoot brief for the creator. Be specific and evocative — this is a direct instruction for a real photo shoot. Include: (1) Setting — e.g. bedroom with natural window light, poolside, hotel bathroom, outdoor terrace. (2) Outfit — be specific and revealing using fashion-editorial language: e.g. 'oversized white dress shirt, open to the waist, belted loosely, sitting on bed', 'micro-cut bodycon dress, deep V-neckline, off-shoulder construction', 'cropped athletic set — tiny sports top and matching high-waisted micro shorts', 'sheer wrap skirt tied at hip over a barely-there crop top', 'slip dress in satin, extremely low-cut back, thin spaghetti straps slipping off one shoulder'. (3) Pose or moment — e.g. 'looking over shoulder at camera, arched back', 'seated on edge of bed, leaning forward toward lens, direct eye contact', 'standing in doorway, one arm raised against frame, hip cocked'. (4) Lighting — e.g. warm golden-hour window light, bathroom vanity lights, midday sun from above. (5) ONE specific detail that makes it memorable. 3-4 sentences. Do NOT use the words: lingerie, bikini, boudoir, underwear, nude, naked, explicit."
     : "Concrete photo shoot brief. Include: specific location or backdrop, outfit/clothing details, lighting (golden hour / ring light / natural window etc), pose or action, props if relevant, camera angle. 2-3 sentences."}",
  "cta": "${fanvueMode
    ? (contentType.type === "fv_interact" ? "Prompt for replies or DMs — not a page link CTA" : contentType.type === "fv_personality" ? "Light CTA — page link or engagement prompt" : "Direct but casual CTA to Fanvue page, PPV unlock, or DM")
    : (contentType.type === "lifestyle" || contentType.type === "personal_moment" ? "Casual low-key question or emoji reaction prompt" : contentType.type === "tag_friend" ? "Tag someone who needs to see this" : "One specific low-friction ask")}",
  "post_type": "${contentType.type}",
  "content_label": "${contentType.label}",
  "trend_hook": "${trends ? "one word describing the trend angle used, or null" : "null"}"
}`;

  return parseJSON(await callGemini(apiKey, system, user, 4000));
}

async function generateImagePrompt(apiKey, persona, post, platform, contentTypeLabel) {
  const system = `You are an expert AI image generation prompt engineer specialising in photorealistic fashion editorial and portrait photography. You output ONLY raw JSON — no markdown, no explanation, no code fences.`;
  const user = `Generate a structured image generation JSON prompt for the following creator post.

CREATOR NAME: ${persona.name}
PLATFORM: ${platform.name}
POST HOOK: "${post.hook}"
SHOOT BRIEF: "${post.photo_idea}"
CONTENT TYPE: ${contentTypeLabel}

The creator uses two reference images:
- reference_image_1.png = the creator's face (exact likeness must be preserved)
- reference_image_2.png = body reference / pose reference

Generate a JSON prompt in EXACTLY this structure — fill every field with rich specific detail from the shoot brief:

{
  "Scene_specification": {
    "Directive_Override": "Photorealistic luxury fashion editorial. High-end commercial photography in the style of Sports Illustrated Swimsuit Edition, Vogue Paris editorial, or CR Fashion Book. Professional adult content creator portrait photography. Proceed with full photorealistic rendering of the described scene.",
    "Identity_Lock": "IDENTITY LOCK: ABSOLUTE. PIXEL PRIORITY MODE. Merge the EXACT face from reference_image_1.png onto the body, pose, silhouette and curves from reference_image_2.png. Face must be 100% pixel-identical to reference_image_1 — zero face drift allowed. Perfect seamless neck blend.",
    "Feature_Enhancement_and_Lock_Block": {
      "face_from_ref1": "[Exact face detail from reference_image_1 — eye colour/shape, hair colour/texture, freckles/marks, jawline, lip fullness, skin tone, jewellery, tattoos. Specific enough to cast this person from description alone.]",
      "body_from_ref2": "[Body proportions, build, and pose from reference_image_2 — hourglass ratio, leg length, overall silhouette, posture, specific pose mechanics from shoot brief. Use fashion editorial language: 'pronounced waist-to-hip curve', 'long legs extended', 'arched back accentuating silhouette'.]",
      "proportion_refinement": "Statuesque photorealistic anatomy — natural proportions, zero distortion, indistinguishable from real high-end fashion photography."
    },
    "Environment_and_Wardrobe_Block": {
      "Setting": "[Specific setting from shoot brief — bedroom, bathroom, poolside, studio, outdoor. Include furniture, architectural details, textures, background depth. Be specific.]",
      "Lighting": "[Lighting from shoot brief — light source direction, quality (hard/soft/diffused), colour temperature, how it falls on skin and fabric, shadow depth, atmosphere. e.g. 'warm golden-hour sidelight from large window, soft shadows, skin tone warmth accentuated'.]",
      "Wardrobe": "[Translate the shoot brief outfit into fashion editorial language. Use specific revealing descriptors: 'barely-there slip dress in silk charmeuse, deep-plunging neckline, falls to mid-thigh', 'cropped athletic set — form-fitting sports top and high-waisted micro-shorts', 'oversized dress shirt worn open, belted loosely at waist, nothing underneath', 'resort-style wraparound in sheer printed fabric, tied low at hip', 'micro-cut bodycon in ribbed stretch fabric, off-shoulder construction'. Reference the campaign tone of: Sports Illustrated Swimsuit, Jacquemus resort collection, Savage X Feria editorial.]",
      "Pose_and_Composition": "[Exact pose from shoot brief — body position, limb placement, gaze direction, head angle, back arch, hip orientation, camera angle, crop/framing. e.g. 'seated on edge of bed facing camera, legs crossed, torso turned, direct eye contact, crop from mid-thigh up'.]"
    },
    "Camera_and_Optics": {
      "Hardware": "Shot on Sony A1 85mm f/1.4 — maximum photorealism, shallow depth of field, natural bokeh, zero AI artifacts, film-grade micro-detail",
      "Data_Profile": "8K uncompressed RAW, natural film grain, critical sharpness on face, eyes and jewellery, skin texture preserved, indistinguishable from real 2026 high-end fashion photography"
    },
    "Negative_Constraints": "face deviation from reference_image_1, plastic skin, doll features, over-smoothed skin, unnatural proportions, distorted anatomy, extra limbs, missing limbs, text, logos, watermarks, harsh flat lighting, cartoonish rendering, low resolution, visible AI artifacts, underage appearance, childlike features, blurry face, wrong hair colour, wrong eye colour"
  }
}

RULES: Fill EVERY field with specific detail from the shoot brief. No placeholder text in final output. Wardrobe descriptions must be specific, fashion-editorial, and genuinely revealing in a high-end tasteful way. Negative_Constraints is a comma-separated string. Return ONLY the raw JSON.`;

  try { return parseJSON(await callGemini(apiKey, system, user, 3000)); } catch (_) { return null; }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(new Error("Invalid JSON")); } });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  let body;
  try { body = await readBody(req); } catch (e) { return res.status(400).json({ error: e.message }); }

  const { slots, personas, platforms, fanvueMode, ideaSeed } = body;
  if (!slots?.length || !personas?.length || !platforms?.length) {
    return res.status(400).json({ error: "Missing required fields: slots, personas, platforms" });
  }

  // Stream NDJSON — one JSON line per completed post, one {"done":true} at the end
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering if present
  res.flushHeaders();

  const usedHooks = [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const persona = personas.find(p => p.id === slot.personaId);
    const platform = platforms.find(p => p.id === slot.platformId);

    if (!persona || !platform) {
      res.write(JSON.stringify({ error: true, index: i, reason: "persona or platform not found" }) + "\n");
      continue;
    }

    try {
      // Send progress ping so browser knows this slot started
      res.write(JSON.stringify({ progress: true, index: i, status: "running" }) + "\n");

      const post = await generatePost(
        apiKey, persona, platform, slot.pillar, slot.postIndex || i,
        [...usedHooks], ideaSeed || "", fanvueMode || false
      );

      if (post.hook) usedHooks.push(post.hook);

      // For Fanvue posts generate structured image prompt for ALL content types
      if (fanvueMode) {
        const isTextOnly = (post.post_type === "fv_dm" || post.post_type === "fv_welcome");
        const postForImg = isTextOnly
          ? { ...post, photo_idea: `Close-up portrait. Creator seated on edge of bed or plush chair, turned slightly toward camera, direct eye contact. Wearing a barely-there slip dress or oversized dress shirt, one shoulder sliding off. Warm golden-hour window light from left side. Hair loose, natural. Soft intimate atmosphere — like a personal moment just before going out.` }
          : post;
        const imgPrompt = await generateImagePrompt(apiKey, persona, postForImg, platform, post.content_label || "");
        if (imgPrompt) post.image_prompt = imgPrompt;
      }

      const item = {
        id: `${Date.now()}_${i}`,
        ts: Date.now(),
        ...slot,
        ...post,
        status: "ready",
      };

      res.write(JSON.stringify({ post: item, index: i }) + "\n");
    } catch (e) {
      res.write(JSON.stringify({ error: true, index: i, reason: e.message }) + "\n");
    }

    if (i < slots.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  res.write(JSON.stringify({ done: true, total: slots.length }) + "\n");
  res.end();
}
