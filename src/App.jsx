import { useState, useEffect, useCallback, useRef, memo } from "react";
import { supabase } from "./supabase";
import { LogoMark, Logo } from "./Logo";


// ─── CONFIGURATION ────────────────────────────────────────────────────────────
// API key is stored server-side only (Netlify function). Never exposed to the browser.

// ─── PERSONA OVERRIDES (persisted in localStorage) ────────────────────────────
const PERSONA_OVERRIDES_KEY = "caig_persona_overrides";
function getPersonaOverrides() {
  try { return JSON.parse(localStorage.getItem(PERSONA_OVERRIDES_KEY) || "{}"); } catch { return {}; }
}
function savePersonaOverride(id, patch) {
  const all = getPersonaOverrides();
  all[id] = { ...(all[id] || {}), ...patch };
  localStorage.setItem(PERSONA_OVERRIDES_KEY, JSON.stringify(all));
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const PERSONAS = [
  {
    id: "cara", name: "Cara Whitmore", handle: "@carawhitmore", niche: "Travel", color: "#34D399",
    avatarUrl: null, // drop a file at public/avatars/cara.jpg to use a real image
    avatarInitials: "C&L",
    char: "Two women, early 20s. Budget travel, premium visuals, brutally honest costs. Real numbers every single post.",
    voice: 'Warm, cheeky, specific. "£380. 7 days. Georgia. Here\'s everything we spent."',
    pillars: [
      "Budget destination deep-dive — exact spend, day by day",
      "Hidden costs nobody mentions (tourist tax, airport transfer, resort fees)",
      "Pack smarter not heavier — one specific decision that changed everything",
      "Honest destination verdict — would we go back? brutal truth",
      "How we cut the cost by £X — one specific hack or method",
      "Free things in a destination that tourists always pay for",
      "The destination nobody talks about but absolutely should",
      "What went wrong on this trip — authentic travel fail",
      "How we found the hotel/flight/experience for half the listed price",
      "The food that changed us — what we actually ate and what it cost",
      "Is this popular destination actually worth it in 2025?",
      "How to do the tourist trap without tourist prices",
      "What £800 gets you in an expensive destination vs a cheap one",
      "The local thing every tourist misses in this destination",
      "Travelling as two women — the honest safety verdict",
      "The influencer lie about this destination (what they don't show)",
      "What we'd do completely differently if we went back",
      "This destination in low season vs high season — real price difference",
      "How we fund our travel — honest breakdown of income vs spend",
      "The one thing that makes this destination perfect for solo/duo travel",
    ],
    products: ["Destination guides £12", "Budget Travel Masterclass £97", "Telegram channel"],
    b2b: "Tour operators, boutique hotels, booking platforms, luggage brands",
    statusKey: "live",
  },
];

const PLATFORMS = [
  {
    id: "tiktok", name: "TikTok", color: "#FF0050", times: ["15:00", "19:00"],
    purpose: "Entertainment first, value second. Quick, punchy, relatable. The audience scrolls fast — you have 1 second to hook them.",
    contentMix: [
      { type: "trending_sound", label: "Trending sound + niche take", weight: 4, format: "short video (15-30s)", direction: "Film yourself reacting to or using a trending sound. Overlay text with your niche take. Quick cuts, expressive face, casual setting." },
      { type: "quick_tip", label: "Quick tip / things nobody tells you", weight: 3, format: "short video (15-45s)", direction: "Talking head or text-on-screen format. One specific tip. Start mid-thought — no intros. Punchy, direct, slightly controversial." },
      { type: "personal_moment", label: "Personal / behind-the-scenes / casual selfie", weight: 3, format: "short video or photo (15-30s)", direction: "Casual, unpolished. Getting ready, walking somewhere, candid moment. Text overlay with a relatable thought. This is the 'real person' content that builds connection." },
    ],
  },
  {
    id: "instagram", name: "Instagram", color: "#E1306C", times: ["12:00", "18:00"],
    purpose: "The lifestyle window. This is who I am, not just what I know. Instagram is a social status symbol — the feed must look aspirational while the content delivers value.",
    contentMix: [
      { type: "lifestyle", label: "Selfie / outfit / location flex / looking good", weight: 4, format: "single photo or Reel (9:16)", direction: "High quality, aesthetic photo. Selfie, mirror shot, outfit of the day, posed at a beautiful location. This is the 'I want to be her' content. Caption is casual, personal, conversational — not educational." },
      { type: "value_carousel", label: "Value carousel — tips, breakdowns, lists", weight: 3, format: "carousel (5-7 slides)", direction: "Slide 1: bold hook text on branded background. Slides 2-6: one tip per slide, clean design, easy to read. Slide 7: CTA or summary. Educational content in a swipeable format." },
      { type: "reel", label: "Reel — short, aesthetic, music-driven", weight: 3, format: "Reel (9:16, 15-30s)", direction: "Aesthetic montage or day-in-the-life clip. Music-driven — the vibe matters more than the words. Text overlay with one key message. Beautiful locations, golden hour, movement." },
    ],
  },
  {
    id: "youtube", name: "YouTube", color: "#FF0000", times: ["14:00", "17:00"],
    purpose: "The storytelling platform. Long-form value and narrative. This is where deep content lives — every video tells a story with a beginning, middle, and end.",
    contentMix: [
      { type: "deep_story", label: "Full story — I did X, here's what happened", weight: 4, format: "YouTube Short or long-form concept (60s-10min)", direction: "Narrative structure: setup → tension → resolution. Personal experience told as a story. Specific numbers, real places, real outcomes. The viewer should feel like they went on a journey." },
      { type: "day_in_life", label: "Day in the life / vlog style", weight: 3, format: "YouTube Short or vlog concept (60s-8min)", direction: "Follow-along format. Wake up, show the routine, show the reality. Authentic, not curated. The appeal is the intimacy — the audience feels like they are there with you." },
      { type: "deep_dive", label: "Educational deep-dive / explainer", weight: 3, format: "YouTube Short or long-form concept (60s-12min)", direction: "Pick one topic and go deep. Research-backed, specific, authoritative. Structure: hook → context → breakdown → takeaway. This is the 'I learned something' content." },
    ],
  },
  {
    id: "facebook", name: "Facebook", color: "#1877F2", times: ["12:00", "15:00"],
    purpose: "Community and shareability. The 'send this to your mate' platform. Content should spark conversation, debate, or the urge to tag someone.",
    contentMix: [
      { type: "tag_friend", label: "Relatable post — tag your mate who does this", weight: 4, format: "photo or short text post", direction: "Relatable observation or opinion that makes people think of someone specific. The goal is tags and shares, not likes. Conversational, funny, opinionated." },
      { type: "discussion", label: "Discussion starter / hot take / opinion", weight: 3, format: "text post or photo with text overlay", direction: "Ask a question or state an opinion that splits the room. The comments section IS the content. Be bold enough to get disagreement." },
      { type: "reshared_value", label: "Value content — shareable tips or lists", weight: 3, format: "photo, carousel, or link post", direction: "Practical, useful content that people save or share to their story. Lists, checklists, 'things I wish I knew' format. Designed to be screenshot-and-shared." },
    ],
  },
];

// ─── IMAGE PROMPT VARIETY SEEDS ───────────────────────────────────────────────
const IMG_SETTINGS = [
  { setting: "Luxury hotel room, unmade white linen bed, floor-to-ceiling window overlooking city skyline", lighting: "Soft morning diffused light through sheer curtains, warm golden tones on skin", camera: "Leica SL2, 50mm Summilux, eye-level medium shot, shallow depth of field" },
  { setting: "Private white-sand beach at golden hour, shallow ocean waves lapping at shore, Mediterranean cliffs in distant background", lighting: "Late afternoon golden-hour sunlight, strong natural rim light, warm shimmering highlights on wet skin", camera: "Leica SL2, 85mm, low angle near water level, RAW" },
  { setting: "Ultra-modern minimalist bathroom, matte white walls, dark architectural lines, grey geometric floor tiles, large illuminated mirror", lighting: "High-key circular LED mirror light, brilliant specular highlights on surfaces", camera: "Sony A7R V, 35mm, full-body mirror reflection, wide editorial framing" },
  { setting: "Outdoor rooftop terrace at dusk, infinity pool, city lights beginning to glow below, warm evening air", lighting: "Blue-hour ambient with warm pool uplighting, twilight gradient sky", camera: "Leica SL2, 50mm, three-quarter body, editorial framing" },
  { setting: "Sleek penthouse living room, white sectional sofa, abstract art on wall, floor-to-ceiling city view", lighting: "Natural diffused daylight from panoramic windows, clean neutral tones", camera: "Sony A1, 85mm f/1.4, shallow DOF, full-body editorial" },
  { setting: "Forest hot spring, steaming natural pool surrounded by mossy rocks and pine trees, total privacy", lighting: "Dappled late-afternoon forest light, steam creating soft diffusion", camera: "Leica SL2, 50mm, medium shot, film grain" },
  { setting: "Boutique hotel bathroom, freestanding copper bathtub, marble floor, single window with sheer curtain", lighting: "Soft single-window natural light, intimate warm glow", camera: "iPhone 16 Pro natural mode, eye-level, 4:5 crop, hyper-realistic" },
  { setting: "Private villa poolside, terracotta tiles, bougainvillea in background, sunlounger in direct sun", lighting: "Midday Mediterranean direct sun, high contrast, deep shadows", camera: "Leica SL2, 35mm, full-body wide shot" },
  { setting: "Minimalist studio space, seamless white backdrop, large softbox to left", lighting: "Studio two-light setup, soft fill from right, deliberate shadow on one side", camera: "Sony A1, 85mm f/1.4, full-body editorial" },
  { setting: "Dimly lit luxury bedroom, candles on bedside table, silk sheets, blackout curtains, intimate atmosphere", lighting: "Warm candlelight and low bedside lamp, deep shadows, intimate glow on skin", camera: "Leica SL2, 50mm, medium close-up, natural film grain" },
  { setting: "Outdoor shower on private villa terrace, stone tiles, lush tropical plants surrounding, open sky above", lighting: "Bright overhead midday light, water catching light and creating sparkle", camera: "Sony A7R V, 35mm, full-body, water droplets sharp" },
  { setting: "Modern penthouse bedroom, king bed with white duvet, abstract art on wall, morning light flooding in", lighting: "Soft morning window light, cool-white balance, clean editorial", camera: "Leica SL2, 50mm, medium shot from foot of bed, wide editorial" },
];

const IMG_POSES = [
  "Lying face-down on bed, head turned toward camera, direct gaze, arched back, legs extended, arms folded under chin",
  "Seated on edge of bath, knees together, weight on one hip, torso angled toward camera, looking over shoulder with soft confident expression",
  "Standing at floor-to-ceiling window, back to camera, arms raised touching frame, gaze directed outside, full profile visible",
  "Reclined in shallow water on back, head tilted toward sky, eyes closed, arms relaxed at sides, legs extended, serene athletic pose",
  "Seated cross-legged on bed, elbows resting on knees, leaning forward toward lens, direct eye contact, hair falling naturally",
  "Standing in doorway, one arm raised against frame, hip cocked, weight on one leg, direct confident gaze at camera",
  "Kneeling on bed facing camera, body upright, hands resting on thighs, direct gaze, editorial framing from slight low angle",
  "Side-lying on sofa or lounger, head propped on hand, legs stacked, body in natural S-curve, looking directly at camera",
  "Seated in bath, knees drawn up to chest, arms wrapped lightly around knees, head tilted, soft gaze at camera",
  "Standing in outdoor shower, face tilted up toward water, eyes closed, hands loosely in hair, full body visible, profile angle",
  "Half-standing at mirror, one knee on bed, torso angled, looking back at camera over shoulder, low-angle editorial frame",
  "Lying on back on white linen, one knee bent, head turned toward camera, arms above head, relaxed confident energy",
];

const IMG_COVERAGE = [
  "Topless, bare chest fully visible, wearing only low-rise jeans unbuttoned at waist",
  "Fully nude, lying face-down, back and legs fully visible, nothing covered",
  "Topless in open silk robe, robe falling off both shoulders, hanging loose, nothing beneath",
  "Nude, seated, knees drawn up providing partial natural coverage, arms relaxed",
  "Topless, wearing only minimal bottoms — thin strap, low-slung on hips",
  "Nude from behind, full back and legs visible, standing pose",
  "Nude in bath, water and minimal bubble coverage, shoulders and chest above waterline",
  "Topless in outdoor shower, water running over bare chest and shoulders",
  "Wrapped in white bed sheet, one shoulder bare, sheet falling low at front, artfully draped",
  "Nude on bed, lying face-down, sheet pulled to lower back only, back and shoulders bare",
  "Topless, wearing only open unbuttoned shirt as cover — hanging off shoulders, nothing beneath, shirt parted",
  "Nude standing at window, natural body silhouette visible against light, back three-quarter angle",
];

// ─── FANVUE / SUBSCRIPTION PLATFORMS ─────────────────────────────────────────
const FANVUE_PLATFORMS = [
  {
    id: "fv_instagram", name: "Instagram", color: "#E1306C", times: ["11:00", "19:00"],
    purpose: "Top-of-funnel discovery for subscription creators. Instagram is brand-building — aesthetic, aspirational, and personality-first. Content must stay within guidelines (no nudity) but can be confident, flirtatious, and suggestive through styling, captions, and implication. Goal: profile visits → link in bio → Fanvue. ALL content is photo-based — no video concepts.",
    contentMix: [
      { type: "fv_tease", label: "Tease post — confident & alluring", weight: 4, format: "photo post or carousel with caption", direction: "Aesthetically polished. Suggestive through styling, pose, and caption — not explicit. Confident, alluring aesthetic. Caption creates curiosity. CTA directs to link in bio." },
      { type: "fv_personality", label: "Personality post — real and relatable", weight: 3, format: "photo — selfie or candid", direction: "Show the real person — funny, warm, relatable. A moment from the day, a thought, something that makes followers feel like they know her. Builds parasocial connection that drives subscriptions." },
      { type: "fv_interact", label: "Fan interaction — question or engagement prompt", weight: 3, format: "photo with caption question", direction: "Invite comments and DMs. A question about preferences, a 'this or that', a bold opinion. Boosts reach and warms up the audience for a CTA post." },
    ],
  },
  {
    id: "fv_tiktok", name: "TikTok", color: "#010101", times: ["12:00", "20:00"],
    purpose: "Fastest organic reach for subscription creators. TikTok content must stay within community guidelines. For our workflow, all content is photo-based — we produce captions, hooks, and on-screen text for photo posts and slideshows. Goal: viral reach → profile visits → link in bio → Fanvue.",
    contentMix: [
      { type: "fv_personality", label: "Personality photo post — real and compelling", weight: 4, format: "photo post with caption and on-screen text suggestion", direction: "Confident, authentic. Show personality first — the allure comes from who she is, not just how she looks. Relatable, funny, or story-driven caption that hooks in the first line." },
      { type: "fv_tease", label: "Tease photo post — implication & curiosity", weight: 3, format: "photo post with caption", direction: "Suggestive storytelling through implication — a getting-ready moment, a candid behind the scenes, a 'you'll never guess what I posted today' style hook. Never explicit. Caption teases the page. CTA to link in bio." },
      { type: "fv_interact", label: "Fan interaction — question or engagement post", weight: 3, format: "photo with caption question", direction: "Ask fans something directly. A cheeky question about preferences, a 'this or that' prompt. Builds community and boosts algorithmic reach through comment interaction." },
    ],
  },
  {
    id: "fv_reddit", name: "Reddit", color: "#FF4500", times: ["12:00", "20:00"],
    purpose: "The highest-intent discovery platform for subscription creators. Reddit allows adult content in NSFW subreddits — be direct about nude content on the page. Content must feel authentic and personal, not like an ad. Topless previews and direct references to nude sets are normal here.",
    contentMix: [
      { type: "fv_tease", label: "Tease post — direct nudity reference + CTA", weight: 4, format: "photo post with caption", direction: "Write with sexual tension. State exactly what's on the page — 'fully nude set', 'nothing on', 'you can see everything'. The caption should feel charged — like something is about to happen. Hard CTA to page link." },
      { type: "fv_personality", label: "Personality post — real and seductive", weight: 3, format: "selfie or candid with caption", direction: "Real and funny but with seductive energy underneath. Drop nude page content references naturally. Make them feel like they're talking to someone desirable who also happens to be interesting." },
      { type: "fv_ppv", label: "PPV drop — this just posted on my page", weight: 3, format: "cropped preview or topless preview photo with caption", direction: "Name the content explicitly. Write in charged language — what it is, what they'll see, why it's worth unlocking. Make not buying it feel like a mistake. CTA." },
    ],
  },
  {
    id: "fv_telegram", name: "Telegram", color: "#2AABEE", times: ["11:00", "21:00"],
    purpose: "Your warm audience. Telegram followers are already fans — this is where you reward loyalty, share previews, and push to Fanvue for the full content.",
    contentMix: [
      { type: "fv_preview", label: "Exclusive preview — subscribers only", weight: 4, format: "photo with message", direction: "Telegram is your warmest audience — be explicitly intimate. Describe the content in detail, reference the nudity directly. Make them feel like insiders getting something the rest of the internet won't see. Charged and personal." },
      { type: "fv_dm", label: "DM-style message — intimate and charged", weight: 3, format: "text message style", direction: "Write like you're texting someone you're attracted to who's attracted to you. Warm, direct, sexually charged but not graphic. Tell them what's on the page. Make them feel chosen and close." },
      { type: "fv_announce", label: "New content announcement", weight: 3, format: "text + image preview", direction: "Write the announcement with the energy of someone who knows they've just posted something incredible. Name the nudity directly. Proud, bold, daring. Make not clicking feel like missing out." },
    ],
  },
  {
    id: "fv_x", name: "X (Twitter)", color: "#000000", times: ["13:00", "22:00"],
    purpose: "High-volume teaser content and community engagement. X allows adult content — be direct about nude content on the page. More permissive than Instagram. Massive creator community and discovery potential. Reference page content boldly.",
    contentMix: [
      { type: "fv_tease", label: "Tease post — seductive with hard CTA", weight: 4, format: "photo + short caption", direction: "Sexual tension from the first word. State exactly what's on the page. Short, punchy, charged — reads like a dare. Hard CTA. Should make scrolling past feel impossible." },
      { type: "fv_personality", label: "Personality / opinion post", weight: 3, format: "text or photo + text", direction: "Funny, real, and seductive in equal parts. Hot take or relatable moment with an undercurrent of desirability. Reference page content naturally. The personality IS the seduction." },
      { type: "fv_interact", label: "Fan interaction — question or poll", weight: 3, format: "text post or poll", direction: "Ask something with sexual tension. 'Be honest — did you expect that set?', 'do you prefer completely bare or barely covered?', 'what do you actually want to see?'. Charged enough to demand an answer." },
    ],
  },
  {
    id: "fv_page", name: "Fanvue Page", color: "#7C3AED", times: ["10:00", "20:00"],
    purpose: "Content that lives on the Fanvue page itself — welcome messages, PPV captions, and subscriber posts. These convert new visitors and retain existing subscribers.",
    contentMix: [
      { type: "fv_welcome", label: "Welcome message — new subscriber DM", weight: 3, format: "DM text message", direction: "Write like you're texting someone you find attractive who's just walked into your world. Warm, intimate, charged. Tell them exactly what's on the page. Make them feel like subscribing was the right decision. End with an invitation." },
      { type: "fv_ppv_caption", label: "PPV caption — unlockable content", weight: 4, format: "caption for locked photo post", direction: "Name the content explicitly and write in seductive, charged language. Tell them what they'll see, why it's worth it. Make unlocking feel inevitable. Confident, direct, desirable." },
      { type: "fv_wall_post", label: "Free wall post — subscriber retention", weight: 3, format: "photo post with caption", direction: "Write for people who already like you and want more. Reference specific nude content. Intimate, body-confident, charged. Make staying subscribed feel like the obvious choice." },
    ],
  },
];

const FANVUE_PILLARS = [
  "Behind the scenes — what I'm doing today that isn't on the page yet",
  "This just dropped on my Fanvue — here's a tease",
  "Getting ready content — the before that leads to the after on my page",
  "Personal Q&A — fans ask, I answer (the ones I can answer here)",
  "What I'm wearing today — and what I'm not wearing on my page",
  "Mood check — relatable moment that makes fans feel close to me",
  "New PPV just posted — here's what it is (suggestive, no spoilers)",
  "Fan appreciation — shouting out loyal subscribers without naming them",
  "Day in my life — the real, unglamorous parts that build parasocial connection",
  "Subscriber milestone — celebrating with the community",
  "Upcoming content teaser — vote on what I should post next",
  "The question everyone DMs me — answered publicly for once",
  "This made me laugh today — relatable / funny personal moment",
  "Why I started creating — the real story, not the polished version",
  "Rate my look — engagement post that also drives profile visits",
  "What I'm listening to / watching / obsessed with right now",
  "Honest moment — something real and vulnerable that builds trust",
  "Exclusive for [platform] — content that makes this audience feel special",
  "New subscriber welcome — making new followers feel immediately seen",
  "End of month round-up — what was on my page this month",
];



// ─── STORAGE ──────────────────────────────────────────────────────────────────
const stor = {
  get: (k, def) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : def;
    } catch (_e) {
      return def;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (_e) {
      // Storage full or unavailable — silently ignore
    }
  },
};

// ─── LLM API (via Netlify serverless function → Google Gemini) ────────────────
async function callLLM({ system, user, maxTokens = 4000, signal }) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ system, user, maxTokens }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || `API error ${res.status}`);
  }

  if (!data.text) throw new Error("Empty response from Gemini");
  return data.text;
}

// ─── CONTENT GENERATION ───────────────────────────────────────────────────────
const TODAY = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Creative angles — randomly injected per post to force structural variety
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

// ─── IMAGE PROMPT GENERATOR (Fanvue mode only) ────────────────────────────────
async function generateImagePrompt(persona, post, platform, contentType, signal, postIndex = 0) {
  const si = postIndex % IMG_SETTINGS.length;
  const pi = (postIndex + 3) % IMG_POSES.length;
  const ci = (postIndex + 7) % IMG_COVERAGE.length;
  const seed = IMG_SETTINGS[si];
  const pose = IMG_POSES[pi];
  const coverage = IMG_COVERAGE[ci];

  const system = `You are an expert AI image generation prompt engineer specialising in photorealistic luxury fashion editorial and portrait photography. You output ONLY raw JSON — no markdown, no explanation, no code fences. Your prompts target Stable Diffusion XL, Flux, and MidJourney. Reference aesthetic: Playboy editorial, Treats! Magazine, high-end boudoir, Sports Illustrated Swimsuit Edition, Spencer Tunick fine art photography.`;

  const user = `Generate a structured image generation JSON prompt for the following creator post.

CREATOR: ${persona.name}
PLATFORM: ${platform.name}
POST HOOK: "${post.hook}"
SHOOT BRIEF: "${post.photo_idea}"
CONTENT TYPE: ${contentType}

SCENE SEED — incorporate into every field:
- Setting: ${seed.setting}
- Lighting: ${seed.lighting}
- Camera: ${seed.camera}
- Pose: ${pose}
- Wardrobe/styling: ${coverage}

Reference images:
- reference_image_1.png = creator face (exact likeness — zero deviation)
- reference_image_2.png = body and pose reference

Output EXACTLY this JSON structure with rich specific detail in every field:

{
  "scene_specification": {
    "core_subject": {
      "identity_lock": "IDENTITY_LOCK_BLOCK: Merge EXACT face from reference_image_1.png onto body and pose from reference_image_2.png. 100% pixel-identical face — zero drift, zero eye colour change, zero hair change. Perfect seamless neck blend. PIXEL PRIORITY MODE.",
      "physique_profile": {
        "body_type": "[Athletic/editorial physique from reference_image_2 — waist-to-hip ratio, leg development, silhouette, posture. Fashion editorial language. 2 sentences.]",
        "pose": "[Exact pose from seed — body position, limb placement, back arch, hip orientation, gaze, head angle. Technical and specific. Match shoot brief.]"
      },
      "facial_and_glam": {
        "expression": "[Expression for post mood — confident smirk, serene, playful over-shoulder, direct camera gaze.]",
        "makeup": "[Makeup look — glass skin/dewy/editorial bold/natural. Specific eye, brow, lip detail.]",
        "hair": "[Hair from reference_image_1 — exact colour, texture, length. Styled for scene: wet, loose, windswept, pinned.]"
      }
    },
    "wardrobe_design": {
      "attire": "[Wardrobe from seed above. Describe in luxury fashion editorial language — specific fabric, construction, cut. Reference aesthetic: Treats! Magazine, Agent Provocateur editorial, Sports Illustrated Swimsuit Edition, high-end boudoir.]",
      "design_details": "[Specific fabric texture, how light falls on material and skin, construction details. Hyper-specific fashion editorial description.]",
      "accessories": "[All jewellery and accessories from reference_image_1 — necklaces, rings, earrings, tattoos. Exact match.]"
    },
    "technical_photography": {
      "camera_angle": "[Camera angle and framing from seed: ${seed.camera}. Eye-level/low angle/overhead, head-to-toe/three-quarter/medium/close-up.]",
      "optics": "[Lens from seed: ${seed.camera}. Hyper-sharp face and eyes, realistic skin pores, natural film grain, zero AI artifacts.]",
      "style": "9:16 vertical, RAW format, 8K resolution, cinematic luxury editorial, indistinguishable from real 2026 high-end photography"
    },
    "environment_and_lighting": {
      "setting": "[Setting from seed: ${seed.setting}. Specific furniture, materials, textures, architectural details, background depth.]",
      "lighting": "[Lighting from seed: ${seed.lighting}. Direction, quality, colour temperature, how it falls on skin and fabric, shadow depth, atmosphere.]",
      "atmosphere": "[Overall mood — intimate, editorial, high-status, serene, confident. 1-2 sentences.]"
    },
    "negative_prompt": "nudity, sexual provocation, explicit content, suggestive poses, NSFW, graphic acts, distorted anatomy, warped limbs, extra limbs, low resolution, blurry, plastic skin, facial distortion, face drift from reference, wrong eye colour, wrong hair colour, underage appearance, watermark, text, logos, cartoonish"
  }
}

RULES: Fill every field with specific vivid detail from the seeds and shoot brief. Wardrobe must use luxury fashion editorial language. negative_prompt is a comma-separated string — do not alter it. Return ONLY the raw JSON object.`;

  try {
    const raw = await callLLM({ system, user, maxTokens: 3000, signal });
    const clean = raw.replace(/```json|```/g, "").trim();
    try { return JSON.parse(clean); } catch (_e) {}
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch (_e) {} }
    return null;
  } catch (_e) {
    return null;
  }
}

async function generatePost(persona, platformId, pillar, postIndex, signal, usedHooks = [], ideaSeed = "", fanvueMode = false) {
  const allPlatforms = fanvueMode ? FANVUE_PLATFORMS : PLATFORMS;
  const platform = allPlatforms.find((p) => p.id === platformId);
  const isSage = persona.id === "sage";

  // Pick content type based on weighted random selection per platform
  const mix = platform.contentMix;
  const totalWeight = mix.reduce((sum, m) => sum + m.weight, 0);
  // Use postIndex + timestamp to create varied but deterministic selection
  const seed = ((postIndex * 7 + Date.now()) % totalWeight);
  let acc = 0;
  let contentType = mix[0];
  for (const m of mix) {
    acc += m.weight;
    if (seed < acc) { contentType = m; break; }
  }

  // Pick a random creative angle for this post
  const angleIndex = (postIndex * 3 + Math.floor(Math.random() * CREATIVE_ANGLES.length)) % CREATIVE_ANGLES.length;
  const creativeAngle = CREATIVE_ANGLES[angleIndex];

  // Research trends (only for content types that benefit from it)
  const needsTrends = contentType.type !== "lifestyle" && contentType.type !== "personal_moment" && contentType.type !== "fv_dm" && contentType.type !== "fv_welcome";
  let trends = "";
  if (needsTrends) {
    try {
      trends = await callLLM({
        system: `You are an expert social media trend analyst. Today is ${TODAY}. Your job is to find what is ACTUALLY being talked about right now — not generic evergreen topics. Be hyper-specific: name real events, real people, real controversies, real viral moments.`,
        user: fanvueMode
          ? `Research what is trending RIGHT NOW for subscription creators (Fanvue, OnlyFans) on ${platform.name} in ${TODAY.split(" ").pop()}.

Include:
- Specific viral moments, memes, or formats subscription creators are using on ${platform.name} right now
- Any trending audio, aesthetics, or visual styles popular in this creator space
- What fans are engaging with or asking for most this week
- Any seasonal hooks (time of year, upcoming holidays, events)
- Any creator drama, controversies, or trends being discussed in the subscription creator community
- What content formats are getting the most reach on ${platform.name} for this niche right now

Be concrete and specific. 4-5 sentences max.`
          : `Research the ${persona.niche} niche on ${platform.name} specifically. What are 3-4 SPECIFIC things people are talking about, debating, or engaging with RIGHT NOW in ${TODAY.split(" ").pop()}?

Include:
- Any viral moments, controversies, or news from the past 7 days
- Specific names, places, brands, events — especially ones trending on ${platform.name}
- What audiences are arguing about or reacting to on ${platform.name}
- Any seasonal or timely hooks (time of year, upcoming events)
- What formats or sounds are trending on ${platform.name} right now

Be concrete. NOT "fitness trends are popular" — instead "the 75 Hard challenge backlash after [specific person] posted about injury". 4-5 sentences max.`,
        maxTokens: 4000,
        signal,
      });
    } catch (_e) {
      /* continue without trends if fetch fails */
    }
  }

  const system = `You are ${persona.name}, a ${fanvueMode ? "subscription content creator with a Fanvue page" : persona.niche + " content creator"}.
CHARACTER: ${persona.char}
VOICE: ${persona.voice}
PLATFORM CONTEXT: You are posting on ${platform.name}. ${platform.purpose}
${fanvueMode ? `FANVUE MODE — READ CAREFULLY:
You are a real subscription creator. Your free content (Reddit, X, Telegram, Instagram, TikTok) is your funnel. Your Fanvue page is where the premium content lives — exclusive sets, PPV, intimate DMs.

TONE: Sexually confident, seductive, unapologetic. You know exactly what effect you have on people and you use it. Your captions have sexual tension — the reader should feel like something is happening between you and them. Warm enough to feel real, bold enough to make them uncomfortable in a good way. Casual, like sexting someone you're very comfortable with.

WRITING STYLE EXAMPLES — match this energy:
- "woke up naked and spent 20 minutes debating whether to post this. decided yes. it's on my page 🔒"
- "the set I posted last night has had more unlocks than anything I've ever put up. I'll let you decide why 🫦"
- "I don't usually post stuff this explicit on here but I'm feeling bold today. link in bio if you want the rest"
- "every time I do a nude shoot in that bathroom I forget how good the light is in there. new set up now"
- "asked my photographer to delete some of these. she refused. they're on my page instead"

CONTENT RULES:
- Say exactly what's on the page — "a fully nude set", "nothing on at all", "you can see everything", "this is the explicit version".
- Use sexual tension in the writing — not graphic, but charged. The reader should feel desire, not just curiosity.
- First person, present tense, casual. Contractions. Short sentences that punch.
- Every post: one thing that creates desire, one reason to click.
- No euphemisms for nudity. No coy language. Direct.
- CANNOT produce: graphic sex acts, anatomical descriptions, anything involving third parties.` : `NICHE LOCK: Every single word of this post must be rooted in ${persona.niche}. The examples, references, terminology, humour, pain points, and culture must all come from inside the ${persona.niche} world. A reader who knows nothing about ${persona.niche} should feel like an outsider reading this. Do NOT produce generic lifestyle, motivation, or self-improvement content that could belong to any niche. If it could be posted by someone in a completely different niche with minor edits, it is wrong.`}
RULES: Write entirely in character as a real person. Never mention AI, never hint that you are AI-generated. Content pillars: ${persona.pillars.join(", ")}.${isSage ? " CRITICAL: Financial education only — never personalised advice. Disclaimer required." : ""}
FORMAT: Return ONLY a raw JSON object. No markdown. No explanation. No code fences.`;

  const user = `Today is ${TODAY}. Create a ${platform.name} post as ${persona.name}.

CONTENT TYPE: "${contentType.label}"
FORMAT: ${contentType.format}
VISUAL/CONTENT DIRECTION: ${contentType.direction}
PILLAR: "${pillar}"
CREATIVE ANGLE FOR THIS POST: "${creativeAngle.label}" — ${creativeAngle.instruction}
${ideaSeed ? `IDEA SEED (incorporate this topic/idea as inspiration for this post): "${ideaSeed}"` : ""}
${trends ? `TRENDING RIGHT NOW on ${platform.name} (use this to make the post timely and specific — do NOT ignore this): ${trends}` : ""}
UNIQUENESS SEED: ${Date.now()}-${postIndex}-${Math.random().toString(36).slice(2, 8)}
POST NUMBER: #${postIndex + 1} of this batch — every single post MUST be completely different.
${usedHooks.length > 0 ? `\nABSOLUTELY FORBIDDEN — these hooks have already been used in this batch. Do NOT start with anything similar:\n${usedHooks.map((h, i) => `${i + 1}. "${h}"`).join('\n')}` : ""}

CRITICAL RULES:
- Never mention AI, never hint the content is AI-generated. You ARE this person.
- This is a ${contentType.label} post. Match the tone and energy of this content type exactly.
- APPLY THE CREATIVE ANGLE: "${creativeAngle.label}" — this must shape the structure and angle of your post. Do not ignore it.
${fanvueMode ? `- FANVUE POST TYPE RULES:
${contentType.type === "fv_tease" ? "- TEASE POST: Write with sexual tension. Open with something that makes them feel something — desire, curiosity, a pulse of wanting. State exactly what's on the page ('fully nude set', 'nothing on at all', 'you can see everything'). The caption should feel like foreplay — leading somewhere. Hard CTA at the end." : ""}${contentType.type === "fv_ppv" || contentType.type === "fv_ppv_caption" ? "- PPV POST: Name the content explicitly — 'fully nude bedroom shoot', 'nothing on in this one', 'nude shower set'. Describe what makes it worth unlocking in charged, seductive language. Make them feel like not buying is missing something real. Urgency without desperation." : ""}${contentType.type === "fv_personality" ? "- PERSONALITY POST: Real and funny but laced with seductive energy. Even mundane moments should have an undercurrent of 'I'm someone you want to know better'. Drop nude content references casually — 'I literally posted that set while eating cereal'. The charm IS the seduction." : ""}${contentType.type === "fv_dm" || contentType.type === "fv_welcome" ? "- DM/WELCOME: Write like you're texting someone you're attracted to who's attracted to you. Warm, intimate, charged. Tell them exactly what's on your page. Make them feel chosen. End with something that makes them want to explore or reply." : ""}${contentType.type === "fv_preview" ? "- EXCLUSIVE PREVIEW: Telegram fans are warm — be explicitly intimate here. Describe the content directly, reference the nudity, make them feel like insiders. Charged, personal, urgent." : ""}${contentType.type === "fv_announce" ? "- CONTENT ANNOUNCEMENT: Write the announcement with the energy of someone who knows they've just posted something incredible. Name the nudity directly. Proud, bold, daring. Make them feel like they'd be stupid not to look." : ""}${contentType.type === "fv_interact" ? "- FAN INTERACTION: Ask something with sexual tension baked in. Not crude — charged. 'Be honest — did you expect that set?', 'what do you actually want to see next?', 'do you prefer completely bare or barely covered?'. Make them want to answer." : ""}${contentType.type === "fv_wall_post" ? "- FREE WALL POST: Write for subscribers who already like you — reward them. Reference specific nude content. Body-confident, intimate, revealing about what's coming. Make staying subscribed feel like the obvious choice." : ""}` : `${contentType.type === "lifestyle" || contentType.type === "personal_moment" ? "- This is a PERSONAL/LIFESTYLE post. The caption should be casual, short, and conversational — like texting a friend. NOT educational. NOT a breakdown. Just a moment from your life that happens to be in your niche. Think 'felt cute' not 'here's 5 tips'." : ""}${contentType.type === "tag_friend" ? "- Write something that makes people tag a specific friend. The content should be so relatable that readers immediately think of someone." : ""}${contentType.type === "discussion" ? "- Ask a question or state an opinion that will split the comments. Be bold. The goal is debate, not agreement." : ""}${contentType.type === "deep_story" || contentType.type === "day_in_life" ? "- Tell a STORY with a beginning, middle, and end. The audience should feel like they went on a journey with you. Include specific moments, dialogue, emotions." : ""}`}
${!fanvueMode ? "- Use REAL specific examples: real place names, real prices, real product names, real stats." : ""}
- DO NOT repeat hooks, topics, or structures from any other post in this batch.
- The hook must be COMPLETELY different in structure from every forbidden hook listed above.

Return this exact JSON format:
{
  "hook": "${fanvueMode ? "First line — seductive, charged, direct. Under 12 words. Should create immediate desire or make them feel something. Can reference nudity or page content outright. Reads like the opener of a text from someone you want." : `First line — must stop the scroll. Under 12 words. ${contentType.type === "lifestyle" || contentType.type === "personal_moment" ? "Can be casual/playful." : "Specific number or bold statement."}`}",
  "caption": "${fanvueMode
    ? (contentType.type === "fv_dm" || contentType.type === "fv_welcome"
      ? "Personal, intimate, charged. 80-160 chars. Like a text from someone who knows what you want. Reference what's on the page. Make them feel chosen. End with a pull — a question, an invitation, a reason to reply."
      : contentType.type === "fv_ppv" || contentType.type === "fv_ppv_caption"
      ? "PPV sell caption. 120-200 chars. Name the content explicitly. Write in charged, seductive language — what it is, why it's worth it, what they'll see. The reader should feel like not unlocking it would be a mistake. CTA."
      : contentType.type === "fv_interact"
      ? "Question with sexual tension. 60-120 chars. Not crude — charged. Personal, direct, makes them want to answer."
      : "Caption ready to post. 150-240 chars. Seductive and warm — sexual tension with personality underneath. Direct references to nudity or page content. Should feel like a text from someone desirable.")
    : (contentType.type === "lifestyle" || contentType.type === "personal_moment"
      ? "Short, casual caption. 80-150 chars. Like something you'd text a friend. Personal, warm, real."
      : contentType.type === "deep_story" || contentType.type === "day_in_life" || contentType.type === "deep_dive"
      ? "Full narrative caption. 300-500 chars. Story arc: setup, tension, resolution."
      : "Full caption ready to paste. 180-260 chars. In character voice. Feels personal and authentic.")}",
  "hashtags": "${fanvueMode ? "8-12 hashtags relevant to subscription creators and this platform. Mix of creator community tags and content-type tags." : "12-15 hashtags as one string, mix of niche and broad"}",
  "photo_direction": "${fanvueMode ? "Portrait/square format." : "9:16 aspect ratio."} ${contentType.direction}",
   "photo_idea": "${fanvueMode
      ? `Shoot brief for a boudoir/editorial photo shoot. Specific and detailed. Include: (1) Setting — bedroom, hotel room, bathroom, poolside, outdoor terrace. (2) Wardrobe/styling — e.g. 'topless, low-rise jeans', 'wrapped in white sheet, one shoulder bare', 'open silk robe loosely tied', 'back to camera draped in linen', 'minimal bikini, wet'. Use fashion editorial language. (3) Pose — e.g. 'lying face-down, looking back over shoulder', 'standing at window arms raised, back to camera', 'seated on edge of bath, knees together'. (4) Lighting — golden-hour window, bathroom vanity, soft studio, candlelight. (5) ONE specific detail that elevates it. 3-4 sentences.`
     : "Concrete photo shoot brief. Include: specific location or backdrop, outfit/clothing details, lighting (golden hour / ring light / natural window etc), pose or action, props if relevant, camera angle. Be specific enough that a photographer could shoot it with no further briefing. 2-3 sentences."}",
  "cta": "${fanvueMode
    ? (contentType.type === "fv_interact" ? "Prompt for replies or DMs — not a page link CTA" : contentType.type === "fv_personality" ? "Light CTA — could be a page link or just an engagement prompt" : "Direct but casual CTA to Fanvue page, PPV unlock, or DM")
    : (contentType.type === "lifestyle" || contentType.type === "personal_moment" ? "Casual, low-key — a question or emoji reaction prompt, not a hard sell" : contentType.type === "tag_friend" ? "Tag someone who needs to see this" : "One specific, low-friction ask")}",
  "post_type": "${contentType.type}",
  "content_label": "${contentType.label}",
  "trend_hook": "${trends ? "one word describing the trend angle used, or null" : "null"}"
}`;

  const raw = await callLLM({ system, user, maxTokens: 4000, signal });

  const clean = raw.replace(/```json|```/g, "").trim();
  let post = null;
  try {
    post = JSON.parse(clean);
  } catch (_e) {
    // Try to extract JSON from the response
  }
  if (!post) {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) {
      try { post = JSON.parse(m[0]); } catch (_e) {}
    }
  }
  if (!post) throw new Error("Could not parse post JSON");

  // For Fanvue posts, generate a structured image generation prompt as a second call
  // ALL content types get an image prompt — dm/welcome/text types get a default alluring portrait brief
  if (fanvueMode) {
    const FALLBACK_BRIEFS = {
      fv_tease:       "Alluring boudoir editorial. Creator at window, open silk shirt falling off shoulders, low-rise jeans. Strong directional daylight. Direct eye contact, confident expression. Vogue Intimates style.",
      fv_ppv:         "PPV preview portrait. Creator on edge of bed leaning forward, wrapped loosely in white sheet, one shoulder bare. Warm soft candlelight. Confident, intimate expression.",
      fv_ppv_caption: "Locked content preview. Creator lying face-down on white bed, looking back over shoulder. Linen sheet across lower back. Soft morning window light. Intimate, high-end boudoir editorial.",
      fv_dm:          "Close-up intimate portrait. Creator on bed, direct eye contact, warm golden-hour light. Thin-strap bodycon, one strap falling. Hair down, soft warm expression.",
      fv_welcome:     "Close-up intimate portrait. Creator on bed, direct eye contact, warm golden-hour light. Thin-strap bodycon, one strap falling. Hair down, soft warm expression.",
      fv_personality: "Candid natural portrait. Creator in bedroom, relaxed, open oversized shirt as a top, low-rise jeans. Natural daylight. Genuine, unposed expression.",
      fv_interact:    "Playful direct portrait. Creator seated cross-legged on bed, looking straight into camera, wearing only a thin-strap crop top. Warm soft light. Flirtatious expression.",
      fv_wall_post:   "Artistic boudoir. Creator lying on bed back to camera, draped in white linen, looking over shoulder. Soft morning light. Spencer Tunick fine art aesthetic.",
      fv_announce:    "Bold editorial portrait. Creator standing against plain light wall, open button-down shirt worn as a top, low-rise jeans. Strong directional light. Direct eye contact, slight smirk.",
      fv_preview:     "Exclusive preview. Creator at edge of bed leaning forward, loosely wrapped in satin sheet. Warm candlelight. Intimate, exclusive atmosphere.",
    };
    const shootBrief = post.photo_idea || FALLBACK_BRIEFS[contentType.type] || FALLBACK_BRIEFS["fv_tease"];
    const postForImg = { ...post, photo_idea: shootBrief };
    let imgPrompt = await generateImagePrompt(persona, postForImg, platform, contentType.label, signal, postIndex);
    // Third attempt with simplified fallback brief if both retries failed
    if (!imgPrompt) {
      const simpleBrief = FALLBACK_BRIEFS[contentType.type] || FALLBACK_BRIEFS["fv_tease"];
      imgPrompt = await generateImagePrompt(persona, { ...post, photo_idea: simpleBrief }, platform, contentType.label, signal, postIndex + 1);
    }
    if (imgPrompt) post.image_prompt = imgPrompt;
  }

  return post;
}

// ─── SCHEDULE BUILDER ─────────────────────────────────────────────────────────
const POSTS_PER_PLATFORM = 12;

function buildSchedule(selectedPersonas, selectedPlatforms, platformList = PLATFORMS) {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow));
  monday.setHours(0, 0, 0, 0);

  const dayPostCounts = [2, 2, 2, 2, 2, 1, 1]; // Mon-Sun = 12 total
  const slots = [];

  selectedPersonas.forEach((p) => {
    selectedPlatforms.forEach((platId) => {
      const plat = platformList.find((x) => x.id === platId);
      let postNum = 0;
      for (let d = 0; d < 7; d++) {
        const count = dayPostCounts[d];
        for (let s = 0; s < count; s++) {
          const date = new Date(monday);
          date.setDate(monday.getDate() + d);
          const pillar = p.pillars[Math.floor(Math.random() * p.pillars.length)];
          const time = plat.times[s % plat.times.length];
          slots.push({
            personaId: p.id,
            personaName: p.name,
            personaColor: p.color,
            handle: p.handle,
            niche: p.niche,
            platform: plat.name,
            platformId: platId,
            platformColor: plat.color,
            pillar,
            scheduledDate: date.toISOString().split("T")[0],
            scheduledTime: time,
            dayIndex: d,
            postIndex: postNum,
            status: "pending",
          });
          postNum++;
        }
      }
    });
  });

  return slots.sort(
    (a, b) => a.dayIndex - b.dayIndex || a.scheduledTime.localeCompare(b.scheduledTime)
  );
}

// ─── GOOGLE DRIVE ─────────────────────────────────────────────────────────────
let gisLoaded = false;
let tokenClient = null;

function loadGoogleScripts() {
  return new Promise((resolve) => {
    if (gisLoaded) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = () => {
      gisLoaded = true;
      resolve();
    };
    s.onerror = () => {
      resolve(); // Don't block — will fail at token request
    };
    document.head.appendChild(s);
  });
}

async function getGoogleToken(clientId) {
  await loadGoogleScripts();
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services failed to load. Check your internet connection.");
  }
  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (resp) =>
        resp.error ? reject(new Error(resp.error)) : resolve(resp.access_token),
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

async function exportToDrive(queue, clientId) {
  const token = await getGoogleToken(clientId);
  const headers = [
    "Persona",
    "Platform",
    "Date",
    "Time",
    "Status",
    "Pillar",
    "Post Type",
    "Hook",
    "Caption",
    "Hashtags",
    "Photo / Shoot Brief",
    "Photo Direction",
    "CTA",
    "Image Generation Prompt (JSON)",
  ];
  const rows = [headers.join("\t")];
  queue.forEach((item) => {
    const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
    rows.push(
      [
        esc(item.personaName),
        esc(item.platform),
        esc(item.scheduledDate),
        esc(item.scheduledTime),
        esc(item.status),
        esc(item.pillar),
        esc(item.post_type || "photo"),
        esc(item.hook),
        esc(item.caption),
        esc(item.hashtags),
        esc(item.photo_idea),
        esc(item.photo_direction),
        esc(item.cta),
        esc(item.image_prompt ? JSON.stringify(item.image_prompt) : ""),
      ].join("\t")
    );
  });

  const content = rows.join("\n");
  const weekOf = queue[0]?.scheduledDate?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const fileName = `CAIG Content Schedule — Week of ${weekOf}`;

  const meta = JSON.stringify({
    name: fileName,
    mimeType: "application/vnd.google-apps.spreadsheet",
  });
  const blob = new Blob([content], { type: "text/tab-separated-values" });
  const form = new FormData();
  form.append("metadata", new Blob([meta], { type: "application/json" }));
  form.append("file", blob);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error?.message || "Drive upload failed");
  }
  const file = await res.json();
  return `https://docs.google.com/spreadsheets/d/${file.id}`;
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
function buildCSV(queue) {
  const H = ["Date", "Time", "Platform", "Account", "Caption", "Hashtags", "Photo Direction", "CTA", "Image Generation Prompt (JSON)"];
  const rows = [H.join(",")];
  queue.forEach((item) => {
    const e = (s) => `"${(s || "").replace(/"/g, '""')}"`;
    rows.push(
      [
        e(item.scheduledDate),
        e(item.scheduledTime),
        e(item.platform),
        e(item.handle),
        e(item.caption),
        e(item.hashtags),
        e(item.photo_idea),
        e(item.photo_direction),
        e(item.cta),
        e(item.image_prompt ? JSON.stringify(item.image_prompt) : ""),
      ].join(",")
    );
  });
  return rows.join("\n");
}

function dlFile(content, name, type = "text/plain") {
  const b = new Blob([content], { type });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  URL.revokeObjectURL(u);
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;1,14..32,300&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
/* ── ROOT & BASE ── */
:root{
  --ink:#0f1117;--s1:#161b27;--s2:#1c2233;--s3:#222a3d;--s4:#283045;--s5:#2e3850;--s6:#3a4660;
  --e1:rgba(255,255,255,.07);--e2:rgba(255,255,255,.11);--e3:rgba(255,255,255,.16);--e4:rgba(255,255,255,.22);
  --t0:#eef0f8;--t1:#b0b8d0;--t2:#7a88a8;--t3:#5a6a8a;--t4:#3a4a6a;
  --amber:#f5a623;--amber2:rgba(245,166,35,.12);--amberb:rgba(245,166,35,.32);--amber-glow:rgba(245,166,35,.22);
  --green:#2dd4a0;--green2:rgba(45,212,160,.11);--blue:#6366f1;--blue2:rgba(99,102,241,.11);
  --violet:#818cf8;--red:#f07070;--gold:#fbbf24;
  --c-content:#34d399;--c-proposals:#818cf8;--c-outreach:#f59e0b;--c-onboarding:#fb923c;
  --c-automate:#38bdf8;--c-predict:#a78bfa;
  --r:10px;--rl:14px;--rxl:18px;--r2:22px;
  --sans:'Inter',-apple-system,system-ui,sans-serif;
  --mono:ui-monospace,'SF Mono','Fira Code',monospace;
  --shadow-sm:0 1px 3px rgba(0,0,0,.3),0 1px 2px rgba(0,0,0,.4);
  --shadow-md:0 4px 16px rgba(0,0,0,.35),0 2px 6px rgba(0,0,0,.25);
  --shadow-lg:0 12px 40px rgba(0,0,0,.45),0 4px 12px rgba(0,0,0,.3);
  --shadow-amber:0 4px 24px rgba(245,166,35,.22),0 1px 4px rgba(245,166,35,.14);
  --shadow-green:0 4px 24px rgba(45,212,160,.18),0 1px 4px rgba(45,212,160,.10);
  --nav-h:60px;
}
html,body,#root{height:100%;background:var(--ink);color:var(--t0);font-family:var(--sans);font-size:14px;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.app{display:flex;flex-direction:column;height:100vh;overflow:hidden}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--s6);border-radius:4px}::-webkit-scrollbar-thumb:hover{background:var(--t3)}

/* ── TOP NAV ── */
.topbar{height:var(--nav-h);padding:0 24px;border-bottom:1px solid var(--e1);background:rgba(3,3,10,.92);backdrop-filter:blur(56px) saturate(1.5);-webkit-backdrop-filter:blur(56px) saturate(1.5);display:flex;align-items:center;gap:8px;flex-shrink:0;position:sticky;top:0;z-index:50;overflow:hidden}
.topbar::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(245,166,35,.22) 30%,rgba(245,166,35,.22) 70%,transparent);pointer-events:none}
.tb-brand{display:flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0}
.tb-gem{width:30px;height:30px;border-radius:9px;background:linear-gradient(145deg,#f7b034,#c97a00);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 18px rgba(245,166,35,.28),0 2px 8px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.2)}
.tb-wordmark{font-size:13px;font-weight:700;color:var(--t0);letter-spacing:-.03em;line-height:1}
.tb-wordmark span{display:block;font-size:9px;color:var(--t4);font-weight:400;letter-spacing:.02em;margin-top:1px}
.tb-nav{display:flex;align-items:center;gap:1px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
.tb-nav::-webkit-scrollbar{display:none}
.tni{display:flex;align-items:center;gap:6px;padding:6px 11px;border-radius:8px;border:none;background:transparent;color:var(--t3);font-size:11.5px;font-family:var(--sans);font-weight:500;cursor:pointer;transition:background .12s,color .12s;white-space:nowrap;position:relative;flex-shrink:0}
.tni:hover{background:var(--e1);color:var(--t0)}
.tni.on{background:rgba(245,166,35,.09);color:var(--t0)}
.tni.on::after{content:'';position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);width:20px;height:2px;background:var(--amber);border-radius:2px 2px 0 0;box-shadow:0 0 10px rgba(245,166,35,.6)}
.tni svg{width:13px;height:13px;flex-shrink:0;opacity:.5;transition:opacity .12s}
.tni:hover svg,.tni.on svg{opacity:1}
.nb{font-size:9px;color:var(--amber);font-family:var(--mono);background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.18);padding:1px 6px;border-radius:4px;font-weight:600;letter-spacing:.02em}
.tb-r{display:flex;align-items:center;gap:8px;flex-shrink:0}
.tb-counts{display:flex;align-items:center;gap:10px}
.tb-count-item{text-align:center}
.tb-count-val{font-size:13px;font-weight:800;line-height:1;font-family:var(--mono)}
.tb-count-lbl{font-size:8px;color:var(--t4);text-transform:uppercase;letter-spacing:.06em;margin-top:1px}
.tb-signout{display:flex;align-items:center;gap:6px;padding:6px 11px;border-radius:8px;border:1px solid var(--e1);background:transparent;color:var(--t3);font-size:11px;font-family:var(--sans);cursor:pointer;transition:all .12s;flex-shrink:0;white-space:nowrap}
.tb-signout:hover{background:var(--s3);color:var(--t0);border-color:var(--e2)}
/* ── MAIN ── */
.main{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;background:var(--ink)}
.view{flex:1;overflow-y:auto;padding:40px 56px}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--r);font-size:12.5px;font-weight:500;font-family:var(--sans);cursor:pointer;border:none;transition:all .14s cubic-bezier(.22,1,.36,1);white-space:nowrap;letter-spacing:-.012em;position:relative;overflow:hidden}
.btn:active{transform:scale(.96)}
.btn::after{content:'';position:absolute;inset:0;background:rgba(255,255,255,0);transition:background .12s}
.btn:hover::after{background:rgba(255,255,255,.04)}
.btn-amber{background:linear-gradient(145deg,#f7b034,#c97a00);color:#0c0600;font-weight:700;box-shadow:var(--shadow-amber),inset 0 1px 0 rgba(255,255,255,.18)}
.btn-amber:hover:not(:disabled){box-shadow:0 6px 28px rgba(245,166,35,.42),0 1px 4px rgba(245,166,35,.2),inset 0 1px 0 rgba(255,255,255,.2);transform:translateY(-1px)}
.btn-amber:disabled{opacity:.28;cursor:not-allowed;transform:none !important;box-shadow:none}
.btn-dim{background:var(--s3);color:var(--t1);border:1px solid var(--e2)}
.btn-dim:hover{background:var(--s4);color:var(--t0);border-color:var(--e3)}
.btn-ghost{background:transparent;color:var(--t2);border:1px solid var(--e2)}
.btn-ghost:hover{background:var(--e1);color:var(--t0);border-color:var(--e3)}
.btn-green{background:linear-gradient(145deg,#2dd4a0,#18a076);color:#011a10;font-weight:700;box-shadow:var(--shadow-green),inset 0 1px 0 rgba(255,255,255,.15)}
.btn-green:hover{box-shadow:0 6px 28px rgba(45,212,160,.36),0 1px 4px rgba(45,212,160,.18),inset 0 1px 0 rgba(255,255,255,.18);transform:translateY(-1px)}
.btn-danger{background:transparent;color:var(--red);border:1px solid rgba(240,112,112,.18)}
.btn-danger:hover{background:rgba(240,112,112,.07);border-color:rgba(240,112,112,.3)}
.ib{display:inline-flex;align-items:center;justify-content:center;width:29px;height:29px;border-radius:8px;border:1px solid var(--e2);background:transparent;cursor:pointer;color:var(--t3);transition:all .12s;flex-shrink:0}
.ib:hover{background:var(--s3);color:var(--t0);border-color:var(--e3)}
.ib:active{transform:scale(.9)}
.ib.ok{color:var(--green);border-color:rgba(45,212,160,.25);background:rgba(45,212,160,.05)}
.ib.del:hover{color:var(--red);border-color:rgba(240,112,112,.2);background:rgba(240,112,112,.05)}

/* ── INPUTS ── */
input,textarea,select{background:var(--s3);border:1px solid var(--e2);border-radius:var(--r);padding:10px 13px;color:var(--t0);font-family:var(--sans);font-size:13px;font-weight:400;outline:none;transition:border-color .13s,background .13s,box-shadow .13s;width:100%}
input:focus,textarea:focus,select:focus{border-color:rgba(245,166,35,.4);background:var(--s4);box-shadow:0 0 0 3px rgba(245,166,35,.06),0 1px 4px rgba(0,0,0,.3)}
input::placeholder,textarea::placeholder{color:var(--t4)}
textarea{resize:vertical;line-height:1.65;min-height:80px}
select{cursor:pointer;appearance:none}

/* ── ANIMATIONS ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes glow{0%,100%{opacity:.2}50%{opacity:1}}
@keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(245,166,35,.45)}70%{box-shadow:0 0 0 10px rgba(245,166,35,0)}100%{box-shadow:0 0 0 0 rgba(245,166,35,0)}}
@keyframes amber-pulse{0%,100%{box-shadow:0 0 24px rgba(245,166,35,.14),0 0 0 1px rgba(245,166,35,.18)}50%{box-shadow:0 0 42px rgba(245,166,35,.30),0 0 0 1px rgba(245,166,35,.36)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
.fu{animation:fadeUp .3s cubic-bezier(.22,1,.36,1) both}
.fi{animation:fadeIn .2s ease both}
.si{animation:slideIn .22s cubic-bezier(.22,1,.36,1) both}
.spin{animation:spin .72s linear infinite}

/* ── AUTOPILOT / MODULE HEADER ── */
.ap{width:100%}
.ap-header{margin-bottom:28px}
.ap-header-title{font-size:20px;font-weight:700;color:var(--t0);letter-spacing:-.04em;margin-bottom:3px}
.ap-header-sub{font-size:12.5px;color:var(--t3);font-weight:300;line-height:1.6}
.fanvue-toggle-row{display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap}
.fanvue-toggle-btn{display:flex;align-items:center;gap:7px;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.25);border-radius:20px;padding:5px 14px 5px 8px;font-size:12px;font-weight:600;color:#a78bfa;cursor:pointer;transition:all .2s;letter-spacing:.01em}
.fanvue-toggle-btn:hover{background:rgba(124,58,237,.15);border-color:rgba(124,58,237,.45)}
.fanvue-toggle-btn.fv-on{background:rgba(124,58,237,.2);border-color:#7c3aed;color:#c4b5fd}
.fanvue-toggle-dot{width:8px;height:8px;border-radius:50%;background:rgba(124,58,237,.4);transition:background .2s}
.fanvue-toggle-btn.fv-on .fanvue-toggle-dot{background:#a78bfa;box-shadow:0 0 6px #7c3aed}
.fanvue-toggle-note{font-size:11px;color:var(--t3);font-style:italic}
.module-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;margin-bottom:18px;border:1px solid;border-color:var(--badge-border,var(--amberb));background:var(--badge-bg,var(--amber2));color:var(--badge-c,var(--amber))}
.ap-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;background:var(--amber2);border:1px solid var(--amberb);font-size:10px;font-weight:700;color:var(--amber);letter-spacing:.07em;text-transform:uppercase;margin-bottom:18px}
.ap-title{font-size:48px;font-weight:800;letter-spacing:-.055em;line-height:1.04;margin-bottom:16px;background:linear-gradient(155deg,#fff 0%,#ccc8f0 55%,#9d95e8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ap-title span{background:linear-gradient(135deg,var(--amber),#ffd580);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ap-desc{font-size:14.5px;color:var(--t2);font-weight:300;line-height:1.8;max-width:480px;margin:0 auto}

/* ── STEPS ── */
.steps{display:flex;flex-direction:column;gap:8px}
.step{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rxl);overflow:hidden;transition:border-color .18s,box-shadow .18s}
.step:hover{border-color:var(--e2)}
.step.active{border-color:rgba(245,166,35,.22);box-shadow:0 0 0 1px rgba(245,166,35,.04) inset,0 8px 32px rgba(0,0,0,.32)}
.step.active::before{content:'';display:block;height:1px;background:linear-gradient(90deg,transparent 5%,rgba(245,166,35,.45) 50%,transparent 95%);opacity:1}
.step-hd{display:flex;align-items:center;gap:14px;padding:18px 22px;cursor:pointer;user-select:none}
.step-num{width:26px;height:26px;border-radius:50%;background:var(--s4);border:1.5px solid var(--e2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--t3);flex-shrink:0;transition:all .18s}
.step.active .step-num,.step.done .step-num{background:linear-gradient(145deg,#f7b034,#c97a00);border-color:var(--amber);color:#1a0a00;box-shadow:0 0 16px rgba(245,166,35,.35)}
.step-info{flex:1;min-width:0}
.step-label{font-size:14px;font-weight:600;color:var(--t0);letter-spacing:-.025em}
.step-summary{font-size:11px;color:var(--t3);margin-top:2px;font-weight:300}
.step.active .step-summary{color:var(--amber)}
.step-arrow{color:var(--t3);transition:transform .2s;flex-shrink:0}
.step.active .step-arrow{transform:rotate(180deg);color:var(--amber)}
.step-body{padding:0 22px 22px;animation:fadeIn .18s ease}

/* ── PERSONA CARDS ── */
.pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.pcard{background:var(--s3);border:1.5px solid var(--e1);border-radius:14px;padding:20px 12px 16px;cursor:pointer;transition:border-color .16s,transform .16s,box-shadow .16s,background .16s;text-align:center;position:relative;overflow:hidden}
.pcard::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--pc);opacity:0;transition:opacity .18s}
.pcard:hover{border-color:var(--e3);transform:translateY(-2px);box-shadow:var(--shadow-md)}
.pcard.on{border-color:var(--pc);background:var(--s4);box-shadow:0 0 0 1px var(--pc),var(--shadow-md)}
.pcard.on::before{opacity:1}
.pcard-check{position:absolute;top:9px;right:10px;width:18px;height:18px;border-radius:50%;background:var(--pc);display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px var(--pc)}
.pcard-avatar{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,color-mix(in srgb,var(--pc) 30%,#030206),color-mix(in srgb,var(--pc) 15%,#030206));border:2px solid color-mix(in srgb,var(--pc) 40%,transparent);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 4px 16px color-mix(in srgb,var(--pc) 25%,transparent)}
.pcard.on .pcard-avatar{border-color:var(--pc);box-shadow:0 0 0 3px color-mix(in srgb,var(--pc) 25%,transparent),0 4px 16px color-mix(in srgb,var(--pc) 30%,transparent)}
.pcard-avatar-img{width:100%;height:100%;object-fit:cover}
.pcard-avatar-init{font-size:18px;font-weight:800;color:var(--pc);letter-spacing:-.02em;line-height:1;font-family:var(--mono)}
.pcard-name{font-size:12.5px;font-weight:700;color:var(--t0);margin-bottom:3px;letter-spacing:-.02em;line-height:1.2}
.pcard-handle{font-size:10px;color:var(--t3);margin-bottom:10px;font-weight:400}
.pcard-niche-pill{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--pc);background:color-mix(in srgb,var(--pc) 12%,transparent);border:1px solid color-mix(in srgb,var(--pc) 25%,transparent);padding:3px 8px;border-radius:20px}
.pcard-em{font-size:9.5px;font-weight:700;color:var(--pc);letter-spacing:.09em;margin-bottom:9px;text-transform:uppercase}
.pcard-niche{font-size:10px;color:var(--t2);margin-bottom:7px}
.pcard-status{font-size:9px;padding:2px 7px;border-radius:20px;background:var(--s5);color:var(--t3);display:inline-block;font-weight:500;letter-spacing:.04em}
.pcard.on .pcard-status{background:var(--pc);color:#030206}
.pcard.custom{border-style:dashed}

/* ── PLATFORM GRID ── */
.platgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
.platcard{background:var(--s3);border:1.5px solid var(--e1);border-radius:14px;padding:18px 14px 16px;cursor:pointer;transition:border-color .16s,transform .16s,box-shadow .16s,background .16s;text-align:center;position:relative;overflow:hidden}
.platcard::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--plc);opacity:0;transition:opacity .18s}
.platcard:hover{border-color:var(--e3);transform:translateY(-2px);box-shadow:var(--shadow-md)}
.platcard.on{border-color:var(--plc);background:var(--s4);box-shadow:0 0 0 1px var(--plc),var(--shadow-md)}
.platcard.on::before{opacity:1}
.platcard-icon{width:40px;height:40px;border-radius:50%;background:color-mix(in srgb,var(--plc) 15%,var(--s2));border:1.5px solid color-mix(in srgb,var(--plc) 30%,transparent);margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:18px;transition:box-shadow .16s}
.platcard.on .platcard-icon{box-shadow:0 0 12px color-mix(in srgb,var(--plc) 40%,transparent)}
.platcard-name{font-size:12.5px;font-weight:700;color:var(--t0);margin-bottom:4px;letter-spacing:-.02em}
.platcard-detail{font-size:10px;color:var(--t3);line-height:1.4}
.platcard.on .platcard-detail{color:var(--plc)}
.platcard-check{position:absolute;top:9px;right:10px;width:18px;height:18px;border-radius:50%;background:var(--plc);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .16s;box-shadow:0 0 8px var(--plc)}
.platcard.on .platcard-check{opacity:1}

/* ── GENERATE STEP ── */
.gen-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}
.gen-stat{background:var(--s3);border:1px solid var(--e2);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:5px}
.gen-stat-l{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.13em;color:var(--t4)}
.gen-stat-v{font-size:13px;font-weight:600;color:var(--t0);letter-spacing:-.02em;line-height:1.3}
.gen-btn{width:100%;padding:22px 24px;border-radius:14px;border:1.5px solid var(--e2);background:var(--s3);color:var(--t2);font-size:15px;font-weight:600;font-family:var(--sans);cursor:not-allowed;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .2s;letter-spacing:-.02em}
.gen-btn.ready{background:linear-gradient(135deg,#f5a623 0%,#e8960f 100%);border-color:#f5a623;color:#030206;cursor:pointer;box-shadow:0 4px 24px rgba(245,166,35,.35),0 0 0 0 rgba(245,166,35,0)}
.gen-btn.ready:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(245,166,35,.5),0 0 0 0 rgba(245,166,35,0)}
.gen-btn.running{background:var(--s4);border-color:var(--amber);color:var(--amber);cursor:pointer;animation:none}
.gen-sub{text-align:center;font-size:11px;color:var(--t4);margin-top:12px;line-height:1.6}


.home{width:100%;display:flex;flex-direction:column;gap:24px}
.home-head{display:flex;flex-direction:column;gap:4px;padding-bottom:4px}
.home-date{font-size:11px;color:var(--t2);letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;font-weight:500}
.home-greeting{font-size:32px;font-weight:800;color:var(--t0);letter-spacing:-.055em;line-height:1.1}
.home-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.hs{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rl);padding:20px 16px;text-align:center;transition:border-color .13s,transform .13s}
.hs:hover{border-color:var(--e3);transform:translateY(-1px)}
.hs-val{font-size:28px;font-weight:800;letter-spacing:-.055em;line-height:1;margin-bottom:6px;font-family:var(--mono)}
.hs-lbl{font-size:10px;color:var(--t2);text-transform:uppercase;letter-spacing:.11em;font-weight:600}
.home-card{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rxl);padding:24px 24px}
.home-sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.home-sh-t{font-size:11px;font-weight:700;color:var(--t1);text-transform:uppercase;letter-spacing:.13em}
.home-sh-ct{font-size:11px;color:var(--t2)}
.home-sh-link{background:transparent;border:none;color:var(--amber);font-size:11px;cursor:pointer;font-family:var(--sans);padding:0;opacity:.85;transition:opacity .12s}
.home-sh-link:hover{opacity:1}
.home-pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.hpc{background:var(--s3);border:1px solid var(--e1);border-radius:var(--rl);padding:14px 14px;position:relative;overflow:hidden;transition:border-color .13s,transform .13s;cursor:default}
.hpc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--pc);opacity:.8}
.hpc-dot{width:6px;height:6px;border-radius:50%;background:var(--pc);margin-bottom:10px;box-shadow:0 0 8px var(--pc)}
.hpc-name{font-size:12px;font-weight:600;color:var(--t0);letter-spacing:-.01em;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hpc-niche{font-size:10px;color:var(--t2);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hpc-cnt{font-size:10px;color:var(--t2);font-family:var(--mono)}
.home-recent-list{display:flex;flex-direction:column;gap:6px}
.hrc{background:var(--s3);border-radius:10px;padding:12px 14px;border:1px solid var(--e1)}
.hrc-top{display:flex;align-items:center;gap:8px;margin-bottom:3px}
.hrc-plat{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.hrc-pname{font-size:11px;font-weight:500;color:var(--t1)}
.hrc-date{margin-left:auto;font-size:10px;color:var(--t2);font-family:var(--mono)}
.hrc-hook{font-size:12px;color:var(--t1);line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.home-status{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rl);padding:12px 20px;display:flex;align-items:center;gap:24px;flex-wrap:wrap}
.hsb-item{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--t2)}
.hsb-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.hsb-dot.g{background:var(--green);box-shadow:0 0 8px var(--green)}
.hsb-dot.a{background:var(--amber);box-shadow:0 0 8px var(--amber)}
/* ── Home module cards ────────────────────────────────────── */
.home-modules{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:8px}
.hmc{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rxl);padding:28px 28px 22px;cursor:pointer;transition:border-color .18s,transform .18s,box-shadow .18s;position:relative;overflow:hidden;min-height:200px;display:flex;flex-direction:column}
.hmc::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,var(--mc-c,var(--amber)) 0%,transparent 55%);opacity:.07;pointer-events:none;transition:opacity .2s}
.hmc:hover{border-color:var(--mc-c,var(--amber));transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.3)}
.hmc:hover::before{opacity:.15}
.hmc-icon{width:42px;height:42px;border-radius:12px;background:color-mix(in srgb,var(--mc-c,var(--amber)) 16%,transparent);display:flex;align-items:center;justify-content:center;margin-bottom:18px;color:var(--mc-c,var(--amber));flex-shrink:0}
.hmc-title{font-size:15px;font-weight:700;color:var(--t0);margin-bottom:8px;letter-spacing:-.02em}
.hmc-desc{font-size:12.5px;color:var(--t2);line-height:1.65;flex:1}
.hmc-tag{display:inline-flex;align-items:center;gap:4px;margin-top:16px;font-size:10.5px;font-weight:600;color:var(--mc-c,var(--amber));text-transform:uppercase;letter-spacing:.07em}
.hmc-tag.soon{color:var(--t3)}
.hmc-arrow{font-size:14px;margin-left:2px}

/* ── LOGIN GATE ── */
.login-gate{position:fixed;inset:0;background:var(--ink);display:flex;align-items:center;justify-content:center;z-index:9999;background-image:radial-gradient(ellipse at 50% 0%,rgba(245,166,35,.04),transparent 60%)}
.login-card{background:var(--s2);border:1px solid var(--e2);border-radius:var(--r2);padding:44px 40px;text-align:center;max-width:360px;width:90%;box-shadow:0 40px 100px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04) inset;position:relative}
.login-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 10%,rgba(245,166,35,.4) 50%,transparent 90%);border-radius:var(--r2) var(--r2) 0 0}
.login-logo{width:52px;height:52px;background:linear-gradient(145deg,#f7b034,#c97a00);border-radius:15px;display:flex;align-items:center;justify-content:center;margin:0 auto 22px;box-shadow:0 0 32px rgba(245,166,35,.3),0 4px 12px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.2)}
.login-title{font-size:21px;font-weight:800;color:var(--t0);letter-spacing:-.04em;margin-bottom:6px}
.login-sub{font-size:12.5px;color:var(--t3);margin-bottom:28px;line-height:1.68;font-weight:300}
.login-btn{width:100%;justify-content:center;padding:13px;font-size:14px;font-weight:700}
/* ── BOTTOM NAV ── */
.bnav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:60;height:calc(62px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:rgba(3,3,10,.96);backdrop-filter:blur(56px) saturate(1.4);-webkit-backdrop-filter:blur(56px) saturate(1.4);border-top:1px solid rgba(255,255,255,.06);align-items:flex-start;justify-content:space-around;box-shadow:0 -8px 48px rgba(0,0,0,.6)}
.bni{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;flex:1;height:62px;border:none;background:transparent;cursor:pointer;color:rgba(255,255,255,.24);font-size:7.5px;font-family:var(--sans);font-weight:600;letter-spacing:.04em;text-transform:uppercase;transition:color .16s;-webkit-tap-highlight-color:transparent;position:relative;padding:0}
.bni svg{width:18px;height:18px;transition:opacity .16s,filter .16s;opacity:.35}
.bni.on{color:var(--amber)}
.bni.on svg{opacity:1;filter:drop-shadow(0 0 5px rgba(245,166,35,.55))}
.bni.on::after{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:28px;height:2px;background:var(--amber);border-radius:0 0 3px 3px;box-shadow:0 0 14px rgba(245,166,35,.8),0 0 28px rgba(245,166,35,.3)}
.bnav-badge{position:absolute;top:-5px;right:-7px;min-width:14px;height:14px;border-radius:7px;background:var(--amber);color:#030206;font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 3px;line-height:1}
/* ── MOBILE ── */
@media(max-width:767px){
  .tb-nav{display:none}
  .bnav{display:flex}
  .topbar{padding:0 14px;gap:8px}
  .tb-counts{display:none}
  .tb-wordmark span{display:none}
  .view{padding:18px 14px calc(78px + env(safe-area-inset-bottom))}
  .home{max-width:100%}
  .home-greeting{font-size:clamp(18px,5.5vw,26px)}
  .home-stats{grid-template-columns:repeat(3,1fr);gap:7px}
  .home-grid{grid-template-columns:1fr}
  .home-modules{grid-template-columns:1fr 1fr;gap:12px}
  .hmc{padding:18px 16px 14px;min-height:0}
  .hmc-icon{width:36px;height:36px;margin-bottom:12px}
  .hmc-title{font-size:13px}
  .hmc-desc{font-size:11.5px}
  .home-pgrid{grid-template-columns:repeat(2,1fr)}
  .home-status{flex-wrap:wrap;gap:9px}
  .ap{max-width:100%}
  .platgrid{grid-template-columns:repeat(2,1fr)!important}
  .gen-btn{padding:20px 14px}
  .step-card{padding:20px 16px}
  .pgrid{grid-template-columns:repeat(2,1fr)}
  .mod-title{font-size:28px}
  .mod-hero{padding:24px 16px 20px}
  .rg-form-grid{grid-template-columns:1fr!important}
  .dp-form-grid{grid-template-columns:1fr!important}
  .lt-form-grid{grid-template-columns:1fr!important}
  .bni{font-size:8px;gap:3px}
  .bni svg{width:22px;height:22px}
}
@media(max-width:400px){
  .home-stats{grid-template-columns:repeat(2,1fr)}
  .home-modules{grid-template-columns:1fr}
  .home-pgrid{grid-template-columns:1fr}
  .pgrid{grid-template-columns:1fr 1fr}
}
/* ── Shared module shell (Proposals / Outreach / Onboarding) ─────────────── */
.mod-shell{width:100%;padding:0 0 48px}
/* hero header */
.mod-hero{text-align:center;padding:36px 20px 32px;margin-bottom:32px;position:relative}
.mod-badge{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:18px;border:1px solid;background:color-mix(in srgb,var(--mod-c,var(--amber)) 10%,transparent);border-color:color-mix(in srgb,var(--mod-c,var(--amber)) 28%,transparent);color:var(--mod-c,var(--amber))}
.mod-badge-dot{width:5px;height:5px;border-radius:50%;background:var(--mod-c,var(--amber));box-shadow:0 0 6px var(--mod-c,var(--amber))}
.mod-title{font-size:42px;font-weight:800;letter-spacing:-.05em;line-height:1.06;margin-bottom:14px;background:linear-gradient(155deg,#fff 0%,#d4d0f5 55%,var(--mod-c,var(--amber)) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.mod-desc{font-size:14px;color:var(--t2);font-weight:300;line-height:1.8;max-width:480px;margin:0 auto}
/* form layout */
.mod-body{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
.mod-card{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rl);padding:22px 22px 18px;display:flex;flex-direction:column;gap:0}
.mod-card-title{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t4);margin-bottom:16px;display:flex;align-items:center;gap:7px}
.mod-card-title-line{flex:1;height:1px;background:var(--e1)}
.mod-field{margin-bottom:14px}
.mod-label{display:block;font-size:11px;color:var(--t3);margin-bottom:5px;font-weight:500}
.mod-input{width:100%;background:var(--s3);border:1px solid var(--e2);border-radius:8px;padding:9px 12px;font-size:12.5px;color:var(--t0);font-family:var(--sans);outline:none;transition:border-color .18s,box-shadow .18s}
.mod-input:focus{border-color:var(--mod-c,var(--amber));box-shadow:0 0 0 3px color-mix(in srgb,var(--mod-c,var(--amber)) 12%,transparent)}
.mod-ta{resize:vertical;min-height:80px}
/* chips */
.mod-chips{display:flex;flex-wrap:wrap;gap:7px}
.mod-chip{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:20px;border:1px solid var(--e2);background:var(--s3);font-size:11.5px;color:var(--t3);cursor:pointer;transition:all .15s;line-height:1}
.mod-chip:hover{border-color:var(--mod-c,var(--amber));color:var(--t0)}
.mod-chip.on{background:color-mix(in srgb,var(--mod-c,var(--amber)) 14%,transparent);border-color:color-mix(in srgb,var(--mod-c,var(--amber)) 40%,transparent);color:var(--mod-c,var(--amber));font-weight:600}
/* action button — mirrors gen-btn */
.mod-action-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:4px}
.mod-btn{width:100%;max-width:540px;padding:22px;border-radius:var(--rxl);border:1.5px solid var(--e1);background:var(--s2);font-size:17px;font-weight:700;font-family:var(--sans);letter-spacing:-.04em;cursor:pointer;transition:all .22s cubic-bezier(.22,1,.36,1);display:flex;align-items:center;justify-content:center;gap:10px;color:var(--t3);position:relative;overflow:hidden}
.mod-btn::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% -30%,color-mix(in srgb,var(--mod-c,var(--amber)) 20%,transparent),transparent 65%);opacity:0;transition:opacity .28s}
.mod-btn.ready{border-color:color-mix(in srgb,var(--mod-c,var(--amber)) 25%,transparent);color:var(--t0)}
.mod-btn.ready::before{opacity:1}
.mod-btn.ready:hover{border-color:color-mix(in srgb,var(--mod-c,var(--amber)) 50%,transparent);transform:translateY(-2px);box-shadow:0 20px 56px color-mix(in srgb,var(--mod-c,var(--amber)) 16%,transparent)}
.mod-btn:disabled{opacity:.2;cursor:not-allowed;transform:none!important}
.mod-hint{font-size:11px;color:var(--t4);font-weight:300}
/* preview bar */
.mod-preview-bar{display:flex;align-items:center;gap:10px;margin-bottom:22px;flex-wrap:wrap;background:var(--s2);border:1px solid var(--e1);border-radius:var(--rl);padding:12px 16px}
.mod-preview-title{flex:1;font-size:13px;color:var(--t1);font-weight:600}
/* document render */
.mod-doc{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rl);padding:44px 52px;max-width:780px;line-height:1.8}
.pd-h1{font-size:22px;font-weight:800;color:var(--t0);margin-bottom:8px;letter-spacing:-.03em}
.pd-h2{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mod-c,var(--amber));margin:30px 0 10px;padding-top:22px;border-top:1px solid var(--e1)}
.pd-hr{border:none;border-top:1px solid var(--e1);margin:24px 0}
.pd-p{font-size:13px;color:var(--t1);margin-bottom:8px}
.pd-li{font-size:13px;color:var(--t1);padding:2px 0 2px 16px;position:relative}
.pd-li::before{content:"•";position:absolute;left:0;color:var(--mod-c,var(--amber));font-weight:700}
.pd-gap{height:8px}
/* email cards */
.oc-email{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rl);overflow:hidden}
.oc-email-head{display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid var(--e1);background:var(--s3)}
.oc-email-label{font-size:12px;font-weight:700;color:var(--t0)}
.oc-email-delay{font-size:10.5px;color:var(--mod-c,var(--amber));font-weight:600;background:color-mix(in srgb,var(--mod-c,var(--amber)) 12%,transparent);padding:3px 9px;border-radius:20px;border:1px solid color-mix(in srgb,var(--mod-c,var(--amber)) 25%,transparent)}
.oc-body{font-family:var(--mono);font-size:12px;color:var(--t1);padding:20px 22px;white-space:pre-wrap;line-height:1.7;margin:0}
@media(max-width:700px){
  .mod-body{grid-template-columns:1fr}
  .mod-doc,.mod-title{font-size:30px}
  .mod-doc{padding:24px 18px}
}
/* ── QUEUE ── */
.q-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:24px;flex-wrap:wrap}
.q-filters{display:flex;gap:6px;flex-wrap:wrap}
.qf{padding:6px 14px;border-radius:20px;border:1px solid var(--e2);background:transparent;font-size:12px;font-weight:500;color:var(--t3);cursor:pointer;transition:all .15s;font-family:var(--sans)}
.qf.on{background:var(--s3);border-color:var(--e3);color:var(--t0);font-weight:600}
.qf:hover:not(.on){border-color:var(--e3);color:var(--t1)}
.q-list{display:flex;flex-direction:column;gap:8px}
.q-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 40px;gap:10px;text-align:center}
.q-empty-icon{font-size:28px;opacity:.2}
.q-empty-t{font-size:16px;font-weight:700;color:var(--t1)}
.q-empty-s{font-size:13px;color:var(--t3);max-width:380px;line-height:1.6}
/* queue item */
.qi{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rl);overflow:hidden;transition:border-color .15s}
.qi:hover{border-color:var(--e2)}
.qi.exp{border-color:var(--e3)}
.qi-hd{display:flex;align-items:center;gap:10px;padding:13px 16px;cursor:pointer;min-height:52px;user-select:none}
.qi-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.qi-info{flex:1;min-width:0}
.qi-name{font-size:12.5px;font-weight:700;color:var(--t0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qi-pillar{font-size:11px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;max-width:320px}
.qi-plat{font-size:10px;font-weight:700;letter-spacing:.04em;padding:3px 9px;border-radius:20px;flex-shrink:0;white-space:nowrap}
.qi-date{font-size:11px;color:var(--t3);flex-shrink:0;white-space:nowrap}
.qi-type{font-size:10px;font-weight:600;color:var(--t3);background:var(--s3);border:1px solid var(--e1);border-radius:5px;padding:2px 7px;flex-shrink:0;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}
.qi-st{font-size:10px;font-weight:700;letter-spacing:.05em;padding:3px 8px;border-radius:5px;flex-shrink:0;text-transform:uppercase}
/* expanded body */
.qi-body{padding:0 16px 16px;border-top:1px solid var(--e1);margin-top:0;display:flex;flex-direction:column;gap:10px;padding-top:14px}
.qfield{display:flex;flex-direction:column;gap:5px}
.qfield-photo{background:rgba(124,58,237,.04);border:1px solid rgba(124,58,237,.15);border-radius:8px;padding:10px 12px}
.qfl{display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--t3)}
.qfv{font-size:13px;color:var(--t1);line-height:1.65;white-space:pre-wrap;word-break:break-word}
.qfv.accent{font-size:14px;font-weight:600;color:var(--t0);line-height:1.5;border-left:2px solid var(--qc,var(--amber));padding-left:10px}
.qfv.mono{font-family:var(--mono);font-size:11.5px;color:var(--t3)}
.qfv.photo{font-size:12.5px;color:var(--t2);font-style:italic}
/* asset + actions */
.qi-asset-input{width:100%;background:var(--s3);border:1px solid var(--e2);border-radius:7px;padding:8px 11px;font-size:12px;color:var(--t0);font-family:var(--sans);outline:none;transition:border-color .15s}
.qi-asset-input:focus{border-color:var(--e3)}
.qi-actions{display:flex;align-items:center;gap:8px;padding-top:4px;flex-wrap:wrap}
.qi-sel{background:var(--s3);border:1px solid var(--e2);border-radius:7px;padding:6px 10px;font-size:12px;color:var(--t0);font-family:var(--sans);cursor:pointer;outline:none}
@media(max-width:700px){
  .qi-hd{gap:7px;padding:11px 12px}
  .qi-date,.qi-type{display:none}
  .qi-pillar{max-width:180px}
  .qi-body{padding:12px}
}
`;

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Ic = {
  rocket: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 11l-6 6 2 3 3-1 4-4m4-8 1-4 4 1-1 4-4-1zM5 3l4 4-2 2L3 5l2-2zm14 0l-4 4 2 2 4-4-2-2z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  list: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1" fill="currentColor" />
      <circle cx="3" cy="12" r="1" fill="currentColor" />
      <circle cx="3" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  cal: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  drive: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 16.74 14.64 3H9.36L2 16.74" />
      <path d="M2 16.74h12.64L18 10.5l2 3.24" />
      <path d="M14.64 16.74H22" />
    </svg>
  ),
  cog: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  copy: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  dl: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  trash: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  ext: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  up: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  chev: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  home: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  ),
};

// ─── COPY BUTTON ──────────────────────────────────────────────────────────────
const CopyBtn = memo(function CopyBtn({ text, label }) {
  const [ok, setOk] = useState(false);
  const go = useCallback(() => {
    navigator.clipboard.writeText(text || "").then(() => {
      setOk(true);
      setTimeout(() => setOk(false), 1800);
    });
  }, [text]);
  if (label)
    return (
      <button
        className={`btn btn-dim${ok ? " ib ok" : ""}`}
        style={{ fontSize: 12, padding: "5px 11px" }}
        onClick={go}
      >
        {ok ? Ic.check : Ic.copy} {ok ? "Copied" : label}
      </button>
    );
  return (
    <button className={`ib${ok ? " ok" : ""}`} onClick={go} title="Copy">
      {ok ? Ic.check : Ic.copy}
    </button>
  );
});

// ─── IMAGE PROMPT BLOCK ───────────────────────────────────────────────────────
function ImagePromptBlock({ prompt }) {
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(prompt, null, 2);
  return (
    <div style={{ marginTop: 10, border: "1px solid #7C3AED44", borderRadius: 10, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", background: "#7C3AED18", cursor: "pointer",
          fontSize: 12, fontWeight: 600, color: "#a78bfa", userSelect: "none",
        }}
      >
        <span>🎨 AI Image Generation Prompt (JSON)</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <CopyBtn text={json} />
          <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? "▲ hide" : "▼ show"}</span>
        </div>
      </div>
      {open && (
        <pre style={{
          margin: 0, padding: "12px 14px", fontSize: 10.5, lineHeight: 1.6,
          background: "#0d0d14", color: "#c4b5fd", overflowX: "auto",
          whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 420, overflowY: "auto",
        }}>
          {json}
        </pre>
      )}
    </div>
  );
}

// ─── QUEUE ITEM ───────────────────────────────────────────────────────────────
const QueueItem = memo(function QueueItem({ item, onDelete, onStatus, onAsset }) {
  const [open, setOpen] = useState(false);
  const [assetVal, setAssetVal] = useState(item.visualAsset || "");
  const [assetSaved, setAssetSaved] = useState(false);
  const plat = PLATFORMS.find((p) => p.id === item.platformId);
  const stMap = {
    pending: { bg: "rgba(255,255,255,.06)", c: "var(--t3)", l: "Pending" },
    ready: { bg: "rgba(99,102,241,.15)", c: "#818cf8", l: "Ready" },
    scheduled: { bg: "rgba(251,191,36,.13)", c: "var(--gold)", l: "Scheduled" },
    posted: { bg: "rgba(52,211,153,.12)", c: "var(--green)", l: "Posted" },
  };
  const st = stMap[item.status] || stMap.pending;
  const hasAsset = !!item.visualAsset;
  const isUrl = assetVal.startsWith("http://") || assetVal.startsWith("https://");

  const saveAsset = () => {
    onAsset(item.id, assetVal.trim());
    setAssetSaved(true);
    setTimeout(() => setAssetSaved(false), 2000);
  };

  return (
    <div className={`qi${open ? " exp" : ""}`}>
      <div className="qi-hd" onClick={() => setOpen((v) => !v)}>
        <div className="qi-dot" style={{ background: item.personaColor }} />
        <div className="qi-info">
          <div className="qi-name">{item.personaName}</div>
          <div className="qi-pillar">{item.pillar}</div>
        </div>
        <span
          className="qi-plat"
          style={{ background: `${plat?.color}18`, color: plat?.color }}
        >
          {item.platform}
        </span>
        <span className="qi-date">
          {item.scheduledDate} · {item.scheduledTime}
        </span>
        {(item.content_label || item.post_type) && <span className="qi-type">{item.content_label || item.post_type}</span>}
        {hasAsset && (
          <span title="Visual asset attached" style={{
            fontSize: 10, fontWeight: 700, letterSpacing: .4,
            background: "rgba(52,211,153,.15)", color: "var(--green)",
            borderRadius: 5, padding: "2px 7px", flexShrink: 0,
          }}>
            📎 Visual
          </span>
        )}
        <span className="qi-st" style={{ background: st.bg, color: st.c }}>
          {st.l}
        </span>
        <span
          style={{
            color: "var(--t3)",
            transition: "transform .2s",
            transform: open ? "rotate(180deg)" : "none",
            flexShrink: 0,
          }}
        >
          {Ic.chev}
        </span>
      </div>
      {open && item.hook && (
        <div className="qi-body">
          {[
            { k: "hook", l: "Hook", accent: true, val: item.hook },
            { k: "caption", l: "Caption", accent: false, val: item.caption },
            { k: "hashtags", l: "Hashtags", mono: true, val: item.hashtags },
            { k: "photo_idea", l: "📸 Photo / Shoot Brief", accent: false, photo: true, val: item.photo_idea },
            { k: "photo_direction", l: "Visual Direction", accent: false, val: item.photo_direction },
            { k: "cta", l: "Call to Action", accent: false, val: item.cta },
          ]
            .filter((f) => f.val)
            .map((f) => (
              <div key={f.k} className={`qfield${f.photo ? " qfield-photo" : ""}`}>
                <div className="qfl">
                  {f.l}
                  <CopyBtn text={f.val} />
                </div>
                <div
                  className={`qfv${f.accent ? " accent" : ""}${f.mono ? " mono" : ""}${f.photo ? " photo" : ""}`}
                  style={f.accent ? { "--qc": plat?.color } : {}}
                >
                  {f.val}
                </div>
              </div>
            ))}
          {item.trend_hook && item.trend_hook !== "null" && (
            <div
              style={{
                fontSize: 11,
                color: "var(--amber)",
                background: "var(--amber2)",
                borderRadius: 7,
                padding: "5px 10px",
                display: "inline-block",
                marginTop: 8,
              }}
            >
              Trend angle: {item.trend_hook}
            </div>
          )}

          {/* ── IMAGE GENERATION PROMPT (Fanvue mode) ── */}
          {item.image_prompt && (
            <ImagePromptBlock prompt={item.image_prompt} />
          )}

          {/* ── VISUAL ASSET ── */}
          <div className="qfield" style={{ marginTop: 12 }}>
            <div className="qfl" style={{ marginBottom: 6 }}>
              Flow Labs Visual Asset
              {hasAsset && isUrl && (
                <a
                  href={item.visualAsset}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 11, color: "var(--green)", marginLeft: 8, textDecoration: "none" }}
                >
                  Open ↗
                </a>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="qi-asset-input"
                placeholder="Paste Flow Labs URL or asset filename…"
                value={assetVal}
                onChange={(e) => { setAssetVal(e.target.value); setAssetSaved(false); }}
                onKeyDown={(e) => e.key === "Enter" && saveAsset()}
              />
              <button
                className="btn btn-dim"
                style={{ fontSize: 12, padding: "5px 13px", flexShrink: 0, color: assetSaved ? "var(--green)" : undefined }}
                onClick={saveAsset}
              >
                {assetSaved ? "✓ Saved" : "Save"}
              </button>
            </div>
            {hasAsset && !isUrl && (
              <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
                Asset: <span style={{ color: "var(--t1)" }}>{item.visualAsset}</span>
              </div>
            )}
          </div>

          <div className="qi-actions">
            <CopyBtn
              text={`${item.hook}\n\n${item.caption}\n\n${item.hashtags}`}
              label="Copy all"
            />
            <button
              className="btn btn-dim"
              style={{ fontSize: 12, padding: "5px 11px" }}
              onClick={() => onStatus(item.id, "scheduled")}
            >
              {Ic.cal} Scheduled
            </button>
            <button
              className="btn btn-dim"
              style={{ fontSize: 12, padding: "5px 11px" }}
              onClick={() => onStatus(item.id, "posted")}
            >
              {Ic.check} Posted
            </button>
            <button
              className="ib del"
              style={{ marginLeft: "auto" }}
              onClick={() => onDelete(item.id)}
            >
              {Ic.trash}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ─── AUTOPILOT VIEW ───────────────────────────────────────────────────────────
function Autopilot({ queue, setQueue, setView, toast_, dbCreators = [], onDeleteCreator }) {
  const [selP, setSelP] = useState(PERSONAS.map((p) => p.id));
  const [selPl, setSelPl] = useState(["tiktok", "youtube"]);
  const [step, setStep] = useState(1);
  const [running, setRunning] = useState(false);
  const [prog, setProg] = useState([]);
  const abortRef = useRef(null);
  const [ideaSeed, setIdeaSeed] = useState("");
  const [fanvueMode, setFanvueMode] = useState(false);
  const [customP, setCustomP] = useState({ name: "", handle: "", niche: "", voice: "" });
  const [customSaved, setCustomSaved] = useState(false);

  // Convert DB creators into persona-shaped objects
  const dbPersonas = dbCreators.map(c => {
    const niche = c.niche || "General";
    const platform = c.platform || "social media";
    return {
      id: `db_${c.id}`,
      name: c.name,
      handle: c.handle || `@${c.name.toLowerCase().replace(/\s+/g, "_")}`,
      niche,
      color: "#818CF8",
      char: c.voice
        ? `${c.name}. ${c.voice}`
        : `${c.name}. A ${niche} content creator on ${platform}. Every post is rooted in ${niche} — the topics, the language, the references, the culture. Nothing generic. Nothing that could belong to a different niche. Speaks to people already inside the ${niche} world.`,
      voice: c.voice || `Authentic ${niche} creator voice. Specific, direct, and deeply embedded in ${niche} culture. Uses real ${niche} terminology, references real ${niche} events, speaks to real ${niche} audiences.`,
      pillars: c.pillars ? c.pillars.split(",").map(p => p.trim()).filter(Boolean) : [
        `${niche} tips that only someone deep in ${niche} would know`,
        `honest takes and controversial opinions about ${niche}`,
        `personal stories and experiences from inside the ${niche} world`,
        `${niche} myths debunked with specifics`,
        `day in the life of a ${niche} creator — real and unfiltered`,
        `${niche} trends, news, and what's actually changing`,
        `${niche} recommendations — products, people, places, events`,
        `behind the scenes of the ${niche} journey`,
      ],
      products: [],
      b2b: c.brand_fit || "",
      statusKey: "live",
      isDb: true,
      dbId: c.id,
    };
  });

  const CUSTOM_ID = "custom_persona";
  const customPersonaObj = customSaved && customP.name ? {
    id: CUSTOM_ID,
    name: customP.name,
    handle: customP.handle || `@${customP.name.toLowerCase().replace(/\s+/g, "_")}`,
    niche: customP.niche || "general",
    char: customP.voice || `${customP.name}. A social media content creator in the ${customP.niche || "general"} space.`,
    voice: customP.voice || "Authentic, engaging, conversational.",
    pillars: customP.niche ? [
      `${customP.niche} tips and practical advice`,
      `${customP.niche} common mistakes and how to avoid them`,
      `${customP.niche} beginner guides and explainers`,
      `controversial or unpopular opinions about ${customP.niche}`,
      `personal stories and experiences in ${customP.niche}`,
      `${customP.niche} trends, news, and what's changing`,
      `behind the scenes of my ${customP.niche} journey`,
      `${customP.niche} product, tool, or resource recommendations`,
      `${customP.niche} myths debunked`,
      `day in the life of someone in ${customP.niche}`,
    ] : ["share your story", "give practical tips", "discuss current trends", "share personal insights", "behind the scenes"],
    color: "#a78bfa",
    statusKey: "live",
  } : null;

  const overrides = getPersonaOverrides();
  const basePersonas = PERSONAS.map(p => overrides[p.id] ? { ...p, ...overrides[p.id] } : p);
  const allPersonas = [...basePersonas, ...dbPersonas, ...(customPersonaObj ? [customPersonaObj] : [])];

  const toggleP = (id) => {
    setSelP((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      // Auto-advance to step 2 when a persona is first selected
      if (next.length > 0 && s.length === 0) setStep(2);
      // Auto-collapse step 1 when a selection is made (if already had selections)
      if (next.length > 0 && step === 1) setTimeout(() => setStep(2), 300);
      return next;
    });
  };
  const togglePl = (id) =>
    setSelPl((s) => (s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : [...s, id]));

  const activePlatforms = fanvueMode ? FANVUE_PLATFORMS : PLATFORMS;

  const total = selP.length * selPl.length * POSTS_PER_PLATFORM;
  const canRun = selP.length > 0 && selPl.length > 0 && !running;

  const run = useCallback(async () => {
    if (!canRun) return;
    setRunning(true);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const slots = buildSchedule(
      allPersonas.filter((p) => selP.includes(p.id)).map(p =>
        fanvueMode ? { ...p, pillars: FANVUE_PILLARS } : p
      ),
      selPl,
      activePlatforms
    );
    setProg(slots.map((s) => ({ ...s, genStatus: "pending" })));

    // Send all static data the server needs — personas (with pillars) and platforms
    const personasForServer = allPersonas
      .filter(p => selP.includes(p.id))
      .map(p => fanvueMode ? { ...p, pillars: FANVUE_PILLARS } : p);
    const platformsForServer = activePlatforms;

    let res;
    try {
      res = await fetch("/api/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          slots,
          personas: personasForServer,
          platforms: platformsForServer,
          fanvueMode,
          ideaSeed,
        }),
      });
    } catch (e) {
      if (e.name !== "AbortError") toast_("Generation failed — could not connect to server");
      setRunning(false);
      return;
    }

    if (!res.ok) {
      toast_("Server error — generation failed");
      setRunning(false);
      return;
    }

    // Read the NDJSON stream line by line
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let savedCount = 0;
    const results = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // last incomplete line stays in buffer
        for (const line of lines) {
          if (!line.trim()) continue;
          let msg;
          try { msg = JSON.parse(line); } catch (_) { continue; }

          if (msg.progress) {
            // Server started processing this slot
            setProg(p => p.map((x, j) => (j === msg.index ? { ...x, genStatus: "running" } : x)));
          } else if (msg.post) {
            // Completed post — save immediately
            const item = msg.post;
            results.push(item);
            savedCount++;
            setQueue(prev => [item, ...prev.filter(x => x.id !== item.id)]);
            setProg(p => p.map((x, j) => (j === msg.index ? { ...x, genStatus: "done" } : x)));
          } else if (msg.error) {
            setProg(p => p.map((x, j) => (j === msg.index ? { ...x, genStatus: "error" } : x)));
          } else if (msg.done) {
            // Final confirmation from server
          }
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error("Stream read error:", e);
    }

    // Sync any DB-creator posts to Supabase
    const dbResults = results.filter(item => item.personaId?.startsWith("db_"));
    if (dbResults.length > 0) {
      const rows = dbResults.map(item => {
        const dbCreator = dbCreators.find(c => `db_${c.id}` === item.personaId);
        return {
          id:           item.id,
          persona_id:   item.personaId,
          persona_name: item.personaName,
          platform:     item.platform,
          pillar:       item.pillar,
          hook:         item.hook || "",
          caption:      item.caption || "",
          hashtags:     item.hashtags || "",
          status:       "ready",
          client_id:    dbCreator?.client_id || null,
        };
      });
      supabase.from("content_queue").upsert(rows).then(({ error }) => {
        if (error) console.warn("content_queue sync error:", error.message);
      });
    }

    setRunning(false);
    toast_(`${savedCount} posts generated — open Queue to review`);
    setTimeout(() => setView("queue"), 700);
  }, [canRun, selP, selPl, setQueue, setView, toast_, allPersonas, ideaSeed, fanvueMode, activePlatforms, dbCreators]);

  const stop = () => {
    abortRef.current?.abort();
    setRunning(false);
    toast_("Stopped");
  };
  const done = prog.filter((p) => p.genStatus === "done").length;
  const pct = prog.length ? Math.round((done / prog.length) * 100) : 0;
  const personaNames =
    allPersonas.filter((p) => selP.includes(p.id))
      .map((p) => p.name)
      .join(", ") || "None";
  const platNames =
    selPl.map((id) => activePlatforms.find((p) => p.id === id)?.name).join(" + ") || "None";

  return (
    <div className="fu">
      <div className="ap">
        <div className="ap-header">
          <div className="ap-header-title">Content Engine</div>
          <div className="ap-header-sub">Select a persona and platform — the engine generates on-brand content in seconds.</div>
          <div className="fanvue-toggle-row">
            <button
              className={`fanvue-toggle-btn${fanvueMode ? " fv-on" : ""}`}
              onClick={() => {
                const next = !fanvueMode;
                setFanvueMode(next);
                setSelPl(next ? ["fv_instagram", "fv_tiktok", "fv_reddit", "fv_x"] : ["tiktok", "youtube"]);
              }}
            >
              <span className="fanvue-toggle-dot" />
              {fanvueMode ? "Fanvue Mode ON" : "Fanvue Mode"}
            </button>
            {fanvueMode && (
              <span className="fanvue-toggle-note">Teaser content for Reddit, Telegram, X &amp; Fanvue page — no explicit output</span>
            )}
          </div>
        </div>

        <div className="steps">
          {/* STEP 1 */}
          <div
            className={`step${step === 1 ? " active" : ""}${selP.length > 0 && step !== 1 ? " done" : ""}`}
          >
            <div className="step-hd" onClick={() => setStep(step === 1 ? 0 : 1)}>
              <div className="step-num">{selP.length > 0 && step !== 1 ? "\u2713" : "1"}</div>
              <div className="step-info">
                <div className="step-label">Choose your personas</div>
                <div className="step-summary">
                  {step === 1
                    ? "Select which characters to generate content for"
                    : personaNames}
                </div>
              </div>
              <span className="step-arrow">{Ic.chev}</span>
            </div>
            {step === 1 && (
              <div className="step-body">
                <div className="pgrid">
                  {allPersonas.map((p) => {
                    const on = selP.includes(p.id);
                    const isCustom = p.id === CUSTOM_ID;
                    const initials = p.avatarInitials || p.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
                    return (
                      <div
                        key={p.id}
                        className={`pcard${on ? " on" : ""}${isCustom ? " custom" : ""}`}
                        style={{ "--pc": p.color }}
                        onClick={() => toggleP(p.id)}
                      >
                        {on && (
                          <div className="pcard-check">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#030206" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                        {/* Avatar */}
                        <div className="pcard-avatar" style={{ "--pc": p.color }}>
                          {p.avatarUrl
                            ? <img src={p.avatarUrl} alt={p.name} className="pcard-avatar-img" />
                            : <span className="pcard-avatar-init">{initials}</span>
                          }
                        </div>
                        <div className="pcard-name">{p.name}</div>
                        <div className="pcard-handle">{p.handle}</div>
                        <div className="pcard-niche-pill" style={{ "--pc": p.color }}>{p.niche}</div>
                        {p.isDb && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (!window.confirm(`Remove ${p.name} from your roster?`)) return;
                              supabase.from("creators").delete().eq("id", p.dbId).then(() => {
                                setSelP(s => s.filter(x => x !== p.id));
                                onDeleteCreator && onDeleteCreator(p.dbId);
                              });
                            }}
                            style={{
                              position: "absolute", top: 6, right: 6,
                              background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.25)",
                              borderRadius: 5, padding: "2px 6px", fontSize: 10, color: "var(--red)",
                              cursor: "pointer", lineHeight: 1.4, zIndex: 2,
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* EXTRAS: Idea Seed + Custom Persona */}
                <div className="extras-row">
                  {/* Idea seed */}
                  <div className="extra-box">
                    <div className="extra-box-hd">
                      <div className="extra-box-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                        </svg>
                      </div>
                      <div className="extra-box-title">Topic / Idea Seed</div>
                    </div>
                    <div className="extra-box-sub">Optional — type a topic or idea and it&apos;ll be woven into every post this batch.</div>
                    <textarea
                      placeholder="e.g. 'the rise of AI in everyday life' or 'why most people fail at saving money'"
                      value={ideaSeed}
                      onChange={(e) => setIdeaSeed(e.target.value)}
                    />
                  </div>

                  {/* Custom persona */}
                  <div className="extra-box">
                    <div className="extra-box-hd">
                      <div className="extra-box-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <div className="extra-box-title">Custom Character</div>
                      {customSaved && <span className="cp-tag">Saved</span>}
                    </div>
                    <div className="extra-box-sub">Define a social media persona from scratch and generate content for them.</div>
                    <div className="cp-fields">
                      <div className="cp-row">
                        <input
                          placeholder="Name (e.g. Jordan)"
                          value={customP.name}
                          onChange={(e) => { setCustomP((c) => ({ ...c, name: e.target.value })); setCustomSaved(false); }}
                        />
                        <input
                          placeholder="Handle (e.g. @jordan)"
                          value={customP.handle}
                          onChange={(e) => { setCustomP((c) => ({ ...c, handle: e.target.value })); setCustomSaved(false); }}
                        />
                      </div>
                      <input
                        placeholder="Niche (e.g. fitness & nutrition)"
                        value={customP.niche}
                        onChange={(e) => { setCustomP((c) => ({ ...c, niche: e.target.value })); setCustomSaved(false); }}
                      />
                      <input
                        placeholder="Voice / character (e.g. 24, London, no-nonsense fitness coach)"
                        value={customP.voice}
                        onChange={(e) => { setCustomP((c) => ({ ...c, voice: e.target.value })); setCustomSaved(false); }}
                      />
                    </div>
                    <div className="cp-actions">
                      <button
                        className="btn btn-dim"
                        style={{ fontSize: "12px", padding: "7px 14px" }}
                        disabled={!customP.name}
                        onClick={() => {
                          setCustomSaved(true);
                          setSelP((s) => s.includes(CUSTOM_ID) ? s : [...s, CUSTOM_ID]);
                        }}
                      >
                        {customSaved ? "Saved \u2713" : "Save & add to batch"}
                      </button>
                      {customSaved && (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: "12px", padding: "7px 14px" }}
                          onClick={() => { setCustomSaved(false); setSelP((s) => s.filter((x) => x !== CUSTOM_ID)); }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-amber"
                    disabled={selP.length === 0}
                    onClick={() => setStep(2)}
                  >
                    Next — choose platforms &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2 */}
          <div
            className={`step${step === 2 ? " active" : ""}${selPl.length > 0 && step > 2 ? " done" : ""}`}
          >
            <div className="step-hd" onClick={() => setStep(step === 2 ? 0 : 2)}>
              <div className="step-num">
                {selPl.length > 0 && step > 2 ? "\u2713" : "2"}
              </div>
              <div className="step-info">
                <div className="step-label">Choose platforms</div>
                <div className="step-summary">
                  {step === 2
                    ? "Where will these posts be published?"
                    : platNames + " · 12 posts each"}
                </div>
              </div>
              <span className="step-arrow">{Ic.chev}</span>
            </div>
            {step === 2 && (
              <div className="step-body">
                <div className="platgrid">
                  {activePlatforms.map((p) => {
                    const on = selPl.includes(p.id);
                    const icons = {
                      tiktok: "🎵", instagram: "📸", youtube: "▶️", facebook: "👥",
                      fv_instagram: "📸", fv_tiktok: "🎵",
                      fv_reddit: "🔶", fv_telegram: "✈️", fv_x: "✖️", fv_page: "💜",
                    };
                    const icon = icons[p.id] || "📱";
                    return (
                      <div
                        key={p.id}
                        className={`platcard${on ? " on" : ""}`}
                        style={{ "--plc": p.color }}
                        onClick={() => togglePl(p.id)}
                      >
                        {on && (
                          <div className="platcard-check">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#030206" strokeWidth="3.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                        <div className="platcard-icon">{icon}</div>
                        <div className="platcard-name">{p.name}</div>
                        <div className="platcard-detail">
                          {on ? "✓ included · 12 posts" : "Tap to include"}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-amber"
                    disabled={selPl.length === 0}
                    onClick={() => setStep(3)}
                  >
                    Next — review &amp; generate &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3 */}
          <div className={`step${step === 3 ? " active" : ""}`}>
            <div className="step-hd" onClick={() => setStep(step === 3 ? 0 : 3)}>
              <div className="step-num">3</div>
              <div className="step-info">
                <div className="step-label">Review &amp; generate</div>
                <div className="step-summary">
                  {total} posts · Generates exact visual directions for every post
                </div>
              </div>
              <span className="step-arrow">{Ic.chev}</span>
            </div>
            {step === 3 && (
              <div className="step-body">
                {/* Summary stat cards */}
                <div className="gen-summary">
                  <div className="gen-stat">
                    <div className="gen-stat-l">Persona</div>
                    <div className="gen-stat-v">{personaNames}</div>
                  </div>
                  <div className="gen-stat">
                    <div className="gen-stat-l">Platforms</div>
                    <div className="gen-stat-v" style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {selPl.map(id => {
                        const pl = activePlatforms.find(p => p.id === id);
                        if (!pl) return null;
                        return (
                          <span key={id} style={{
                            display: "inline-block", fontSize: 10, fontWeight: 700,
                            padding: "2px 8px", borderRadius: 20,
                            background: `color-mix(in srgb,${pl.color} 15%,transparent)`,
                            border: `1px solid color-mix(in srgb,${pl.color} 35%,transparent)`,
                            color: pl.color, letterSpacing: ".03em"
                          }}>
                            {pl.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="gen-stat">
                    <div className="gen-stat-l">Total Posts</div>
                    <div className="gen-stat-v" style={{ fontSize: 22, fontFamily: "var(--mono)", color: "var(--amber)" }}>
                      {total} <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--sans)", fontWeight: 400 }}>posts</span>
                    </div>
                  </div>
                </div>

                {/* Generate button */}
                <button
                  className={`gen-btn${canRun ? " ready" : ""}${running ? " running" : ""}`}
                  disabled={!canRun && !running}
                  onClick={running ? stop : run}
                >
                  {running ? (
                    <>
                      <div className="spinner" />
                      Writing {done}/{prog.length} — tap to stop
                    </>
                  ) : (
                    <>
                      {Ic.rocket}
                      {total > 0 ? `Generate ${total} posts for next week` : "Select personas & platforms first"}
                    </>
                  )}
                </button>

                {total > 0 && !running && (
                  <div className="gen-sub">
                    Each post is researched live with trending topics · {selP.length} persona{selP.length !== 1 ? "s" : ""} · {selPl.length} platform{selPl.length !== 1 ? "s" : ""} · photo posts &amp; carousels
                  </div>
                )}

                {/* Progress list while running */}
                {running && prog.length > 0 && (
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                    {prog.map((s, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: "var(--s3)", borderRadius: 9, padding: "8px 12px",
                        border: "1px solid var(--e1)", fontSize: 11,
                        opacity: s.genStatus === "pending" ? 0.4 : 1,
                        transition: "opacity .2s"
                      }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                          background: s.genStatus === "done" ? "var(--green)" : s.genStatus === "running" ? "var(--amber)" : s.genStatus === "error" ? "var(--red)" : "var(--e2)",
                          boxShadow: s.genStatus === "running" ? "0 0 6px var(--amber)" : "none"
                        }} />
                        <span style={{ color: "var(--t2)", flex: 1 }}>{s.personaName} · {s.platform}</span>
                        <span style={{ color: "var(--t4)", fontFamily: "var(--mono)", fontSize: 10 }}>{s.scheduledDate}</span>
                        {s.genStatus === "done" && <span style={{ color: "var(--green)", fontSize: 10 }}>✓</span>}
                        {s.genStatus === "error" && <span style={{ color: "var(--red)", fontSize: 10 }}>✗</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {prog.length > 0 && (
          <div className="prog-wrap">
            <div className="prog-hd">
              <div className="prog-title">
                {running
                  ? "Writing posts and generating content briefs…"
                  : `Done — ${done} posts ready in your queue`}
              </div>
              <div className="prog-pct">{pct}%</div>
            </div>
            <div className="prog-bar-track">
              <div className="prog-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="prog-list">
              {prog.map((item, i) => (
                <div key={i} className="prog-row">
                  <div className={`prog-dot ${item.genStatus}`} />
                  <span style={{ color: "var(--t1)", flex: 1, fontWeight: 500 }}>
                    {item.personaName}
                  </span>
                  <span style={{ color: "var(--t3)", fontSize: 11.5 }}>{item.platform}</span>
                  <span
                    style={{
                      color: "var(--t3)",
                      fontSize: 11,
                      fontFamily: "var(--mono)",
                      marginLeft: 10,
                    }}
                  >
                    {item.scheduledDate}
                  </span>
                  <span
                    style={{
                      color:
                        item.genStatus === "done"
                          ? "var(--green)"
                          : item.genStatus === "error"
                            ? "var(--red)"
                            : item.genStatus === "running"
                              ? "var(--amber)"
                              : "var(--t4)",
                      fontSize: 11.5,
                      fontWeight: 600,
                      textTransform: "capitalize",
                      minWidth: 52,
                      textAlign: "right",
                      marginLeft: 10,
                    }}
                  >
                    {item.genStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── QUEUE VIEW ───────────────────────────────────────────────────────────────
function Queue({ queue, setQueue, toast_ }) {
  const [filt, setFilt] = useState("all");
  const upSt = (id, st) => setQueue((q) => q.map((i) => (i.id === id ? { ...i, status: st } : i)));
  const upAsset = (id, visualAsset) => setQueue((q) => q.map((i) => (i.id === id ? { ...i, visualAsset } : i)));
  const del = (id) => {
    setQueue((q) => q.filter((i) => i.id !== id));
    toast_("Removed");
  };
  const counts = {
    all: queue.length,
    ready: queue.filter((i) => i.status === "ready").length,
    scheduled: queue.filter((i) => i.status === "scheduled").length,
    posted: queue.filter((i) => i.status === "posted").length,
  };
  const filtered = queue.filter((i) => filt === "all" || i.status === filt);
  const exportCSV = () => {
    dlFile(buildCSV(queue), "CAIG_Schedule.csv", "text/csv");
    toast_("CSV downloaded");
  };
  return (
    <div className="fu">
      <div className="q-top">
        <div className="q-filters">
          {[
            { id: "all", l: "All", v: counts.all },
            { id: "ready", l: "Ready", v: counts.ready },
            { id: "scheduled", l: "Scheduled", v: counts.scheduled },
            { id: "posted", l: "Posted", v: counts.posted },
          ].map((f) => (
            <button
              key={f.id}
              className={`qf${filt === f.id ? " on" : ""}`}
              onClick={() => setFilt(f.id)}
            >
              {f.l}
              {f.v > 0 && <span style={{ marginLeft: 5, opacity: 0.6 }}>{f.v}</span>}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {queue.length > 0 && (
            <button className="btn btn-dim" style={{ fontSize: 12 }} onClick={exportCSV}>
              {Ic.up} Export CSV
            </button>
          )}
          {counts.posted > 0 && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12 }}
              onClick={() => {
                setQueue((q) => q.filter((i) => i.status !== "posted"));
                toast_("Cleared posted");
              }}
            >
              {Ic.trash} Clear posted
            </button>
          )}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="q-empty">
          <span className="q-empty-icon">&#9672;</span>
          <div className="q-empty-t">
            {queue.length === 0 ? "Queue is empty" : "No items here"}
          </div>
          <div className="q-empty-s">
            {queue.length === 0
              ? "Run Autopilot to generate your week. Every post appears here ready to copy, schedule and post."
              : "Try a different filter."}
          </div>
        </div>
      ) : (
        <div className="q-list">
          {filtered.map((item) => (
            <QueueItem key={item.id} item={item} onDelete={del} onStatus={upSt} onAsset={upAsset} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
function CalView({ queue }) {
  const [mode, setMode] = useState("month");
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const todayStr = new Date().toDateString();
  const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const PILL = {
    ready:     { bg: "rgba(99,102,241,.22)",  c: "#818cf8" },
    scheduled: { bg: "rgba(251,191,36,.22)",  c: "var(--gold)" },
    posted:    { bg: "rgba(45,212,160,.18)",  c: "var(--green)" },
    pending:   { bg: "rgba(255,255,255,.06)", c: "var(--t3)" },
  };

  const goToday = () => { const d = new Date(); d.setHours(0,0,0,0); setAnchor(d); };
  const shiftMonth = (dir) => setAnchor((a) => { const d = new Date(a); d.setMonth(d.getMonth() + dir); return d; });
  const shiftWeek  = (dir) => setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() + dir * 7); return d; });
  const prev = () => mode === "month" ? shiftMonth(-1) : shiftWeek(-1);
  const next = () => mode === "month" ? shiftMonth(1)  : shiftWeek(1);

  const monthCells = () => {
    const y = anchor.getFullYear(), m = anchor.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const startDow = (first.getDay() + 6) % 7;
    const cells = [];
    for (let i = startDow - 1; i >= 0; i--) cells.push({ date: new Date(y, m, -i), other: true });
    for (let d = 1; d <= last.getDate(); d++) cells.push({ date: new Date(y, m, d), other: false });
    while (cells.length % 7 !== 0) cells.push({ date: new Date(y, m + 1, cells.length - last.getDate() - startDow + 1), other: true });
    return cells;
  };

  const weekDays = () => {
    const d = new Date(anchor);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x; });
  };

  const itemsFor = (date) => {
    const dk = date.toISOString().split("T")[0];
    return queue.filter((x) => x.scheduledDate === dk).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  };

  const ready  = queue.filter((i) => i.status === "ready").length;
  const sched  = queue.filter((i) => i.status === "scheduled").length;
  const posted = queue.filter((i) => i.status === "posted").length;
  const monthLabel = anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="cal-wrap fu">
      {/* Nav bar */}
      <div className="cal-nav">
        <div className="cal-nav-left">
          <div className="cal-nav-arrows">
            <button className="cal-arrow" onClick={prev}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button className="cal-arrow" onClick={next}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          <div className="cal-month-label">{monthLabel}</div>
          <button className="cal-today-btn" onClick={goToday}>Today</button>
        </div>
        <div className="cal-nav-right">
          <div className="cal-summary">
            {[
              { v: ready,  c: "#818cf8",       l: "ready" },
              { v: sched,  c: "var(--gold)",   l: "scheduled" },
              { v: posted, c: "var(--green)",  l: "posted" },
            ].map(({ v, c, l }) => (
              <div key={l} className="cal-sum-item">
                <div className="cal-sum-dot" style={{ background: c }} />
                <span className="cal-sum-v" style={{ color: c }}>{v}</span>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <div className="cal-toggle">
            <button className={`cal-tog-btn${mode === "month" ? " on" : ""}`} onClick={() => setMode("month")}>Month</button>
            <button className={`cal-tog-btn${mode === "week"  ? " on" : ""}`} onClick={() => setMode("week")}>Week</button>
          </div>
        </div>
      </div>

      {/* Weekday label row */}
      <div className="cal-wd-row">
        {WD.map((d) => <div key={d} className="cal-wd-cell">{d}</div>)}
      </div>

      {/* Month view */}
      {mode === "month" && (
        <div className="cal-month-body">
          {monthCells().map(({ date, other }, i) => {
            const items   = itemsFor(date);
            const isToday = date.toDateString() === todayStr;
            const show    = items.slice(0, 3);
            const over    = items.length - show.length;
            return (
              <div key={i} className={`cal-mc${other ? " other" : ""}${isToday ? " istoday" : ""}`}>
                <div className="cal-mc-num">{date.getDate()}</div>
                {show.map((item) => {
                  const pc = PILL[item.status] || PILL.pending;
                  return (
                    <div key={item.id} className="cal-pill" style={{ background: pc.bg, color: pc.c }}>
                      {item.personaName}
                    </div>
                  );
                })}
                {over > 0 && <div className="cal-overflow">+{over} more</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Week view */}
      {mode === "week" && (
        <div className="cal-week-body">
          {weekDays().map((day, i) => {
            const items   = itemsFor(day);
            const isToday = day.toDateString() === todayStr;
            return (
              <div key={i} className={`cal-wc${isToday ? " istoday" : ""}`}>
                <div className="cal-wc-hd">
                  <div className="cal-wc-wd">{WD[i]}</div>
                  <div className="cal-wc-num">{day.getDate()}</div>
                  {items.length > 0 && (
                    <div className="cal-wc-cnt">{items.length} post{items.length !== 1 ? "s" : ""}</div>
                  )}
                </div>
                <div className="cal-wc-items">
                  {items.length === 0 && <div className="cal-wc-empty">—</div>}
                  {items.map((item) => {
                    const pc = PILL[item.status] || PILL.pending;
                    const pl = PLATFORMS.find((p) => p.id === item.platformId);
                    return (
                      <div key={item.id} className="cal-wc-item" style={{ background: pc.bg, borderColor: `${item.personaColor}30` }}>
                        <div className="cal-wc-item-name" style={{ color: item.personaColor }}>{item.personaName}</div>
                        <div className="cal-wc-item-plat" style={{ color: pl?.color }}>{item.platform}</div>
                        <div className="cal-wc-item-time">{item.scheduledTime}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DRIVE VIEW ───────────────────────────────────────────────────────────────
function DriveView({ queue, toast_ }) {
  const [clientId, setClientId] = useState(() => stor.get("gclientid", ""));
  const [syncing, setSyncing] = useState(false);
  const [lastUrl, setLastUrl] = useState(() => stor.get("glasturl", ""));
  const hasId = clientId.trim().length > 30;

  const save = (v) => {
    setClientId(v);
    stor.set("gclientid", v);
  };

  const sync = async () => {
    if (!hasId || queue.length === 0) return;
    setSyncing(true);
    try {
      const url = await exportToDrive(queue, clientId.trim());
      setLastUrl(url);
      stor.set("glasturl", url);
      toast_("Synced to Google Drive — opening sheet\u2026");
      setTimeout(() => window.open(url, "_blank"), 500);
    } catch (e) {
      toast_("Drive sync failed: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fu">
      <div className="drive-hero">
        <div className="drive-title">Google Drive Sync</div>
        <div className="drive-desc">
          Export your full content schedule as a Google Sheet — one row per post, every field
          included. Your team, your scheduler, your client can all access the same live document.
        </div>
      </div>

      <div className="drive-setup">
        <div className="drive-setup-t">Setup — one time only</div>
        <div className="drive-setup-s">
          You need a free Google Cloud project with a Client ID to authorise the Drive export. This
          takes about 4 minutes.
        </div>
        <div className="drive-steps-list">
          {[
            "Go to console.cloud.google.com \u2192 create a new project",
            "Enable the Google Drive API (search 'Drive API' in the API library)",
            "Go to Credentials \u2192 Create Credentials \u2192 OAuth 2.0 Client ID \u2192 Web application",
            "Add http://localhost:5173 and your live domain to Authorised JavaScript origins",
            "Copy the Client ID and paste it below",
          ].map((t, i) => (
            <div key={i} className="drive-step-row">
              <div className="drive-step-n">{i + 1}</div>
              <div>{t}</div>
            </div>
          ))}
        </div>
        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--t3)",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 7,
          }}
        >
          Google OAuth Client ID
        </label>
        <input
          value={clientId}
          onChange={(e) => save(e.target.value)}
          placeholder="1234567890-xxxxxxxxxxxx.apps.googleusercontent.com"
          style={{ marginBottom: 14 }}
        />
        <div className={`drive-status ${hasId ? "ok" : "warn"}`}>
          <span>{hasId ? "\u2713" : "!"}</span>
          {hasId
            ? "Client ID saved — ready to sync"
            : "Enter your Client ID above to enable Google Drive sync"}
        </div>
      </div>

      <div className="drive-export-row">
        <button
          className="btn btn-amber"
          disabled={!hasId || queue.length === 0 || syncing}
          onClick={sync}
        >
          {syncing ? (
            <>
              <div
                className="spin"
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(0,0,0,.2)",
                  borderTopColor: "#030206",
                  borderRadius: "50%",
                }}
              />{" "}
              Syncing\u2026
            </>
          ) : (
            <>
              {Ic.drive} Sync {queue.length} posts to Google Drive
            </>
          )}
        </button>
        {lastUrl && (
          <button className="btn btn-dim" onClick={() => window.open(lastUrl, "_blank")}>
            {Ic.ext} Open last sheet
          </button>
        )}
        <button
          className="btn btn-ghost"
          disabled={queue.length === 0}
          onClick={() => {
            dlFile(buildCSV(queue), "CAIG_Schedule.csv", "text/csv");
            toast_("CSV downloaded");
          }}
        >
          {Ic.dl} Download CSV instead
        </button>
      </div>

      {lastUrl && (
        <div
          style={{
            background: "var(--s2)",
            border: "1px solid var(--e1)",
            borderRadius: 16,
            padding: "14px 18px",
            fontSize: 12.5,
            color: "var(--t2)",
          }}
        >
          Last synced:{" "}
          <a
            href={lastUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--amber)", textDecoration: "none" }}
          >
            {lastUrl}
          </a>
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          background: "var(--s2)",
          border: "1px solid var(--e1)",
          borderRadius: 16,
          padding: "20px 22px",
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t0)", marginBottom: 10 }}>
          What the Google Sheet contains
        </div>
        {[
          "One row per post — every post from the queue",
          "Columns: Persona, Platform, Date, Time, Status, Pillar, Post Type, Hook, Caption, Hashtags, Photo Direction, CTA",
          "Sortable and filterable — share with your team or client",
          "Update the Status column directly in Sheets to track what's been posted",
          "Re-sync any time to push new posts — creates a new Sheet each time",
        ].map((t, i) => (
          <div
            key={i}
            style={{
              fontSize: 12.5,
              color: "var(--t2)",
              padding: "7px 0",
              borderBottom: "1px solid var(--e1)",
              display: "flex",
              gap: 10,
            }}
          >
            <span style={{ color: "var(--green)", flexShrink: 0 }}>{"\u2713"}</span>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
function PersonaNicheEditor({ toast_, setQueue }) {
  const overrides = getPersonaOverrides();
  const base = PERSONAS[0]; // base persona (Cara Whitmore by default)
  const current = overrides[base.id] ? { ...base, ...overrides[base.id] } : base;

  const [name,    setName]    = useState(current.name);
  const [handle,  setHandle]  = useState(current.handle);
  const [niche,   setNiche]   = useState(current.niche);
  const [desc,    setDesc]    = useState(current.char);
  const [voice,   setVoice]   = useState(current.voice);
  const [pillars, setPillars] = useState(current.pillars.join("\n"));
  const [loading, setLoading] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [mode,    setMode]    = useState("social"); // "social" | "fanvue"

  const FANVUE_PRESET = {
    niche: "Subscription / Fanvue Creator",
    char: "A confident, flirtatious female creator in her 20s. Runs a successful Fanvue page. Open, warm, and genuine — her fans feel like they actually know her. Every post builds the parasocial connection that keeps subscribers paying.",
    voice: `Confident, teasing, personal. "I just posted something on my page that I've never done before — go find out 👀"`,
    pillars: FANVUE_PILLARS,
  };

  const applyFanvuePreset = () => {
    setMode("fanvue");
    setNiche(FANVUE_PRESET.niche);
    setDesc(FANVUE_PRESET.char);
    setVoice(FANVUE_PRESET.voice);
    setPillars(FANVUE_PRESET.pillars.join("\n"));
    toast_("Fanvue preset applied — edit name/handle then save");
  };

  const regenerate = async () => {
    if (!niche.trim()) return;
    setLoading(true);
    try {
      const isFanvue = mode === "fanvue" || niche.toLowerCase().includes("fanvue") || niche.toLowerCase().includes("subscription");
      const text = await callLLM({
        system: `You are a content strategy expert. Given a creator persona and a new niche, you rewrite their character profile, voice description, and content pillars to perfectly match the new niche. Output valid JSON only — no markdown, no explanation.`,
        user: `Persona: ${name} (${handle})
New niche: ${niche}
${isFanvue ? `This is a SUBSCRIPTION CREATOR (Fanvue/OnlyFans style). All pillars must be teaser-focused, parasocial, and subscription-driving. Suggestive but never explicit. Focus on: behind the scenes, exclusive previews, fan connection, day-in-life, PPV teasers, personality moments.` : `This is a social media content creator. All pillars must be deeply embedded in the ${niche} niche.`}

Rewrite the following fields. Keep the creator's core identity but pivot everything to the new niche.

Return JSON with exactly these keys:
{
  "char": "one sentence character description",
  "voice": "one sentence voice description with a short example quote",
  "pillars": ["pillar 1", "pillar 2", ... 20 pillars total]
}`,
        maxTokens: 2000,
      });

      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setDesc(parsed.char);
      setVoice(parsed.voice);
      setPillars(Array.isArray(parsed.pillars) ? parsed.pillars.join("\n") : parsed.pillars);
      toast_("Regenerated — review and save");
    } catch (e) {
      toast_("Generation failed — try again");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    const pillarArr = pillars.split("\n").map(p => p.trim()).filter(Boolean);
    savePersonaOverride(base.id, { name, handle, niche, char: desc, voice, pillars: pillarArr });
    // Clear queue items for this persona — they're stale with the old name/voice
    setQueue(q => q.filter(item => item.personaId !== base.id));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    toast_(`Persona saved as "${name}" — stale queue items cleared`);
  };

  const reset = () => {
    savePersonaOverride(base.id, { name: base.name, handle: base.handle, niche: base.niche, char: base.char, voice: base.voice, pillars: base.pillars });
    setQueue(q => q.filter(item => item.personaId !== base.id));
    setName(base.name); setHandle(base.handle); setNiche(base.niche);
    setDesc(base.char); setVoice(base.voice);
    setPillars(base.pillars.join("\n"));
    setMode("social");
    toast_(`Reset to default — stale queue items cleared`);
  };

  return (
    <div className="sc">
      <div className="sc-t">Persona Editor</div>
      <div className="sc-d">Change the name, niche, and voice — the content engine uses this profile for all generation. Hit Regenerate to have AI rewrite everything for the new niche.</div>

      {/* Quick preset buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <button
          className="btn"
          style={{ fontSize: 11, padding: "6px 14px", background: mode === "social" ? "var(--s4)" : "var(--s3)", border: "1px solid var(--e2)", color: "var(--t1)" }}
          onClick={() => setMode("social")}
        >
          Social Media Mode
        </button>
        <button
          className="btn"
          style={{ fontSize: 11, padding: "6px 14px", background: mode === "fanvue" ? "rgba(124,58,237,.2)" : "var(--s3)", border: `1px solid ${mode === "fanvue" ? "#7c3aed" : "var(--e2)"}`, color: mode === "fanvue" ? "#c4b5fd" : "var(--t1)" }}
          onClick={applyFanvuePreset}
        >
          ⚡ Apply Fanvue Preset
        </button>
      </div>
      {mode === "fanvue" && (
        <div style={{ fontSize: 11, color: "#a78bfa", background: "rgba(124,58,237,.08)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          Fanvue preset active — pillars, voice and character are set for subscription creator content. Update the name and handle below to match your client, then Save.
        </div>
      )}

      {/* Name + Handle */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
        <div className="sr" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
          <div className="srl">Creator Name</div>
          <input
            className="qi-asset-input"
            style={{ width: "100%", fontSize: 13 }}
            placeholder="e.g. Sophie Rose"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="sr" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
          <div className="srl">Handle</div>
          <input
            className="qi-asset-input"
            style={{ width: "100%", fontSize: 13 }}
            placeholder="e.g. @sophierose"
            value={handle}
            onChange={e => setHandle(e.target.value)}
          />
        </div>
      </div>

      {/* Niche + Regenerate */}
      <div className="sr" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
        <div className="srl">Niche</div>
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <input
            className="qi-asset-input"
            style={{ flex: 1, fontSize: 13 }}
            placeholder="e.g. Fitness, Travel, Fanvue / Subscription Creator…"
            value={niche}
            onChange={e => setNiche(e.target.value)}
          />
          <button
            className="btn btn-amber"
            style={{ fontSize: 12, padding: "7px 16px", flexShrink: 0 }}
            onClick={regenerate}
            disabled={loading || !niche.trim()}
          >
            {loading ? "Generating…" : "Regenerate"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--t4)" }}>
          Regenerate rewrites the character, voice and all 20 content pillars for the new niche via AI. Review before saving.
        </div>
      </div>

      <div className="sr" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <div className="srl">Character Description</div>
        <textarea className="ft" rows={2} value={desc} onChange={e => setDesc(e.target.value)} style={{ width: "100%", fontSize: 12.5 }} />
      </div>

      <div className="sr" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <div className="srl">Voice</div>
        <textarea className="ft" rows={2} value={voice} onChange={e => setVoice(e.target.value)} style={{ width: "100%", fontSize: 12.5 }} />
      </div>

      <div className="sr" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <div className="srl">Content Pillars <span style={{ color: "var(--t4)", fontWeight: 400 }}>(one per line)</span></div>
        <textarea className="ft" rows={10} value={pillars} onChange={e => setPillars(e.target.value)} style={{ width: "100%", fontSize: 12, fontFamily: "var(--mono)" }} />
        <div style={{ fontSize: 11, color: "var(--t4)" }}>
          {pillars.split("\n").filter(p => p.trim()).length} pillars · edit freely before saving
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button className="btn btn-amber" style={{ fontSize: 13, padding: "9px 22px" }} onClick={save}>
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={reset}>
          Reset to default
        </button>
      </div>
    </div>
  );
}

function Settings({ queue, setQueue, toast_ }) {
  const [tab, setTab] = useState("persona");
  return (
    <div className="stg-layout fu">
      <div>
        {[
          { id: "persona", l: "Persona" },
          { id: "account", l: "Account" },
        ].map((t) => (
          <button
            key={t.id}
            className={`snb${tab === t.id ? " on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.l}
          </button>
        ))}
      </div>
      <div>
        {tab === "persona" && <PersonaNicheEditor toast_={toast_} setQueue={setQueue} />}
        {tab === "account" && (
          <div className="sc">
            <div className="sc-t">Account</div>
            <div className="sc-d">System configuration</div>
            {[
              ["Engine", "Gemini 2.5 Pro"],
              ["Version", "Content Autopilot"],
              ["Personas", `${PERSONAS.length} active`],
            ].map(([l, v]) => (
              <div key={l} className="sr">
                <div className="srl">{l}</div>
                <div className="srv">{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
const ONBOARDING_SECTIONS = [
  "Welcome & Introduction",
  "Agency Overview",
  "Point of Contact & Communication",
  "Onboarding Questionnaire",
  "Brand Assets Required",
  "Access & Logins",
  "Content Approval Process",
  "Reporting & Review Cadence",
  "Billing & Invoicing",
  "FAQs",
];

// ─── AUTOMATE TASKS MODULE ────────────────────────────────────────────────────
function Onboarding() {
  const [fields, setFields] = useState({
    contactName: "",
    bottleneck: "",
    currentTools: "",
    priority: "brand-outreach",
    hoursPerWeek: "",
    personaCount: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [aiDoc, setAiDoc]         = useState("");
  const [aiError, setAiError]     = useState("");
  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));

  const PRIORITIES = [
    { id: "brand-outreach",   label: "Lead & Client Follow-ups",         desc: "Tracking leads, sending follow-ups, chasing decisions" },
    { id: "payment-tracking", label: "Payment & Invoice Tracking",        desc: "Knowing who owes what, when, and sending reminders" },
    { id: "content-approval", label: "Content Approval Workflow",         desc: "Getting sign-off before content goes live" },
    { id: "scheduling",       label: "Content Scheduling & Publishing",   desc: "Getting content from draft to published on time, every time" },
    { id: "community",        label: "Community & Inbox Management",      desc: "Welcoming new members, sending updates, handling messages" },
    { id: "reporting",        label: "Performance Reporting",             desc: "Pulling stats, tracking what's working, weekly summaries" },
  ];

  const priorityLabel = PRIORITIES.find(p => p.id === fields.priority)?.label || "";
  const ready = fields.contactName && fields.bottleneck;

  async function generate() {
    setLoading(true);
    setAiError("");
    setSubmitted(true);
    try {
      const system = `You are a senior business operations consultant and automation expert. Your job is to produce a detailed, specific, actionable automation plan for the client. Write in clear, direct British English. Use markdown formatting: # for the main title, ## for section headers, **bold** for tool names and key points, and bullet points (•) for lists. Do NOT use generic advice — be specific about tools, workflows, triggers, and outcomes. The plan should feel like it was written by someone who has built hundreds of these systems.`;

      const user = `Produce a full Operations Automation Plan for the following business:

Name: ${fields.contactName}
Team size: ${fields.personaCount || "Not specified"}
Hours/week lost to admin: ${fields.hoursPerWeek || "Not specified"}
Tools currently in use: ${fields.currentTools || "Not specified"}
Biggest bottleneck (in their own words): "${fields.bottleneck}"
Top priority to automate first: ${priorityLabel}

The plan must include:

1. **The Problem** — restate and diagnose their specific bottleneck in 2-3 paragraphs. Be direct. Name what's costing them money and time. Reference the specific hours/week figure if given.

2. **Root Cause Analysis** — what is actually causing this? Not just "too much admin" — go deeper. Is it missing tools? No process documented? Wrong tool for the job? Human dependency on one person?

3. **The Automation Stack for ${priorityLabel}** — list 4-6 specific tools with exact use cases. For each tool: name it, explain the exact workflow it automates, what the trigger is, what the outcome is, and what it replaces. Include real tool names (e.g. Zapier, Make, HubSpot, Notion, Airtable, Stripe, Calendly, etc.) chosen based on their existing stack: ${fields.currentTools || "unspecified"}.

4. **Step-by-Step Implementation** — exact steps to go from zero to live. Number them. Be specific: "Create a Notion database with these columns: Name, Status, Last Contact, Next Action." Not vague platitudes.

5. **What Gets Automated vs What Stays Human** — a clear breakdown. Some things should never be automated. Explain what to keep human and why.

6. **90-Day Roadmap** — 3 phases (Days 1–30, 31–60, 61–90). Specific milestones per phase. What gets built when. What the measurable outcome of each phase is (hours saved, process eliminated, etc.).

7. **Expected ROI** — calculate the time/money value. If they're losing ${fields.hoursPerWeek || "X"} hours/week and an employee/contractor costs £25/hr, what does this automation save per month? Per year? Be specific.

8. **Next Action** — one clear thing to do in the next 48 hours to start. Not a list. One action.

Write at least 600 words. Make it dense, specific, and immediately useful. This is a paid deliverable.`;

      const text = await callLLM({ system, user, maxTokens: 8000 });
      setAiDoc(text);
    } catch (e) {
      setAiError(e.message || "Generation failed — please try again.");
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mod-shell" style={{ "--mod-c": "var(--c-automate)" }}>
      <div className="mod-hero">
        <div className="mod-badge">
          <div className="mod-badge-dot" />
          Operations
        </div>
        <div className="mod-title">Automate Your Ops</div>
        <div className="mod-desc">
          Tell us where your time is leaking — we'll map out the automations that hand it back so your team can focus on the work that matters.
        </div>
      </div>

      {!submitted ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { v: "80%", l: "of business admin tasks are repeatable and automatable" },
              { v: "6h",  l: "average hours per week lost to follow-ups and scheduling admin" },
              { v: "3×",  l: "faster deal close when follow-up is automated and consistent" },
            ].map(s => (
              <div key={s.l} style={{ background: "var(--s2)", border: "1px solid var(--e1)", borderRadius: "var(--rl)", padding: "20px 22px" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--c-automate)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: "-.04em" }}>{s.v}</div>
                <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div className="mod-body">
            <div className="mod-card">
              <div className="mod-card-title">Your Operation <div className="mod-card-title-line" /></div>
              <div className="mod-field">
                <label className="mod-label">Your name *</label>
                <input className="mod-input" placeholder="e.g. Joseph" value={fields.contactName} onChange={e => set("contactName", e.target.value)} />
              </div>
              <div className="mod-field">
                <label className="mod-label">Size of your team</label>
                <select className="mod-input" value={fields.personaCount} onChange={e => set("personaCount", e.target.value)}>
                  <option value="">Select</option>
                  {["Just me", "2–3 people", "4–5 people", "6–10 people", "10+"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="mod-field">
                <label className="mod-label">Hours per week lost to admin (approx.)</label>
                <input className="mod-input" placeholder="e.g. 8" value={fields.hoursPerWeek} onChange={e => set("hoursPerWeek", e.target.value)} />
              </div>
              <div className="mod-field">
                <label className="mod-label">Tools you currently use</label>
                <input className="mod-input" placeholder="e.g. Notion, Gmail, Stripe, Slack, HubSpot" value={fields.currentTools} onChange={e => set("currentTools", e.target.value)} />
              </div>
            </div>

            <div className="mod-card">
              <div className="mod-card-title">Where's the bottleneck? <div className="mod-card-title-line" /></div>
              <div className="mod-field">
                <label className="mod-label">Describe what's eating your time *</label>
                <textarea className="mod-input mod-ta" style={{ minHeight: 120 }}
                  placeholder="Be specific — e.g. I'm manually following up with leads every few days, tracking invoices in a spreadsheet, and spending hours moving tasks between tools that don't talk to each other. Every week I'm doing the same things that should be automated..."
                  value={fields.bottleneck} onChange={e => set("bottleneck", e.target.value)} />
              </div>
              <div className="mod-field" style={{ marginTop: 8 }}>
                <label className="mod-label">Top priority to automate first</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {PRIORITIES.map(p => (
                    <button key={p.id}
                      onClick={() => set("priority", p.id)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                        borderRadius: "var(--r)",
                        border: `1px solid ${fields.priority === p.id ? "var(--c-automate)" : "var(--e2)"}`,
                        background: fields.priority === p.id ? "color-mix(in srgb,var(--c-automate) 10%,transparent)" : "var(--s3)",
                        cursor: "pointer", textAlign: "left", transition: "all .15s",
                      }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: fields.priority === p.id ? "var(--c-automate)" : "var(--t3)", marginTop: 4, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: fields.priority === p.id ? "var(--t0)" : "var(--t1)", marginBottom: 2 }}>{p.label}</div>
                        <div style={{ fontSize: 11, color: "var(--t2)" }}>{p.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {aiError && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12, padding: "10px 14px", background: "rgba(248,113,113,.08)", borderRadius: "var(--r)", border: "1px solid rgba(248,113,113,.2)" }}>{aiError}</div>}

          <div className="mod-action-wrap">
            <button className={`mod-btn${ready ? " ready" : ""}`} disabled={!ready} onClick={generate}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Generate Automation Plan
            </button>
            <div className="mod-hint">AI generates a detailed, specific plan for your exact operation — takes ~20 seconds.</div>
          </div>
        </>
      ) : loading ? (
        <AiLoader color="var(--c-automate)" label="Building your automation plan…" />
      ) : (
        <>
          <div className="mod-preview-bar">
            <div className="mod-preview-title">Automation Plan — {fields.contactName}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-dim" onClick={() => { setSubmitted(false); setAiDoc(""); }} style={{ fontSize: 12 }}>← Edit</button>
              <button className="btn btn-dim" onClick={() => navigator.clipboard.writeText(aiDoc)} style={{ fontSize: 12 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy
              </button>
              <button className="btn" style={{ background: "var(--c-automate)", color: "#fff", fontSize: 12 }}
                onClick={() => openPrint(`Automation Plan — ${fields.contactName}`, aiDoc, "#fb923c")}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Save PDF
              </button>
            </div>
          </div>
          <div className="mod-doc">
            {renderDoc(aiDoc, "var(--c-automate)")}
          </div>
        </>
      )}
    </div>
  );
}
// ─── OUTREACH ─────────────────────────────────────────────────────────────────
const OUTREACH_TONES = ["Professional", "Friendly", "Direct", "Conversational", "Executive"];
const OUTREACH_GOALS = [
  "Book a discovery call",
  "Get a reply / start a conversation",
  "Promote a service",
  "Follow up after no response",
  "Re-engage a cold lead",
];

// ─── BUSINESS INTELLIGENCE MODULE ────────────────────────────────────────────
function Outreach() {
  const [fields, setFields] = useState({
    businessType: "",
    monthsActive: "",
    teamSize: "",
    topChannel: "",
    weakestArea: "",
    revenueStreams: [],
    nextGoal: "win-clients",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [aiDoc, setAiDoc]         = useState("");
  const [aiError, setAiError]     = useState("");
  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));

  const toggleRevenue = (r) =>
    set("revenueStreams", fields.revenueStreams.includes(r)
      ? fields.revenueStreams.filter(x => x !== r)
      : [...fields.revenueStreams, r]);

  const REVENUE_STREAMS = [
    "Retainer clients", "Project-based fees", "Digital products",
    "Affiliate / referral income", "Subscription / SaaS", "None yet",
  ];

  const NEXT_GOALS = [
    { id: "win-clients",        label: "Win new clients",                        desc: "Improve lead generation and close more business" },
    { id: "scale-output",       label: "Scale output without adding headcount",   desc: "Deliver more with the same team through systems" },
    { id: "monetise-audience",  label: "Monetise existing audience or network",   desc: "Add a product, service, or revenue stream" },
    { id: "grow-visibility",    label: "Build authority and visibility",           desc: "Become the known name in your niche" },
    { id: "systematise",        label: "Systematise the operation",               desc: "Make the whole business run with less owner input" },
  ];

  const goalLabel = NEXT_GOALS.find(g => g.id === fields.nextGoal)?.label || "";
  const ready = fields.businessType && fields.nextGoal;

  async function generate() {
    setLoading(true);
    setAiError("");
    setSubmitted(true);
    try {
      const system = `You are a senior business strategist and operations consultant with 20 years of experience scaling service businesses. You write with clarity, authority, and precision. Use markdown: # for title, ## for sections, **bold** for emphasis. Use numbered lists or bullet points (•) where appropriate. Be direct, specific, and immediately useful — this is a paid deliverable, not a blog post.`;

      const user = `Produce a full Business Health Check Report for the following business:

Business type: ${fields.businessType}
Time operating: ${fields.monthsActive || "Not specified"}
Team size: ${fields.teamSize || "Not specified"}
What's working best: ${fields.topChannel || "Not specified"}
Biggest drag or gap: ${fields.weakestArea || "Not specified"}
Revenue streams: ${fields.revenueStreams.length ? fields.revenueStreams.join(", ") : "None specified"}
Primary goal: ${goalLabel}

The report must include:

1. **Where You Are** — a 2-3 paragraph honest assessment of this business at this stage. Reference the specific business type, team size, and time operating. Be direct about what stage this is and what that means.

2. **What's Working** — analyse the channel/approach they've identified as working. Why is it working? What does that signal about the business? What's the risk of over-relying on it? How should they double down intelligently?

3. **The Real Problem** — diagnose the gap or drag they've identified. Go deeper than the surface symptom. What is actually causing it? What will happen in 6 months if it's not fixed?

4. **Revenue Model Analysis** — assess their current revenue mix. Is it healthy? What's missing? What's the highest-leverage addition to the model right now given their stage?

5. **The Priority Focus: ${goalLabel}** — give a detailed, step-by-step playbook for this specific goal. At least 5 specific action steps. Name real tools where relevant. Be prescriptive, not general.

6. **The 30/60/90 Plan** — three clear phases. What to do in the next 30 days, 60 days, and 90 days. Specific milestones. What "done" looks like at each stage.

7. **The One Move** — if they could only do one thing in the next 7 days, what is it? One clear, specific action. No lists. One sentence.

Write at least 500 words. Be direct, specific, and senior in tone. Avoid platitudes.`;

      const text = await callLLM({ system, user, maxTokens: 6000 });
      setAiDoc(text);
    } catch (e) {
      setAiError(e.message || "Generation failed — please try again.");
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mod-shell" style={{ "--mod-c": "var(--c-predict)" }}>
      <div className="mod-hero">
        <div className="mod-badge">
          <div className="mod-badge-dot" />
          Business Intelligence
        </div>
        <div className="mod-title">Business Health Check</div>
        <div className="mod-desc">
          Tell us where your business is right now — we'll diagnose what to focus on next and map out the highest-leverage move.
        </div>
      </div>

      {!submitted ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { v: "68%", l: "of businesses have no documented lead follow-up process" },
              { v: "5×", l: "more likely to close when a lead is followed up within 5 minutes" },
              { v: "3×", l: "revenue uplift for businesses that systematise before scaling" },
            ].map(s => (
              <div key={s.l} style={{ background: "var(--s2)", border: "1px solid var(--e1)", borderRadius: "var(--rl)", padding: "20px 22px" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--c-predict)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: "-.04em" }}>{s.v}</div>
                <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div className="mod-body">
            <div className="mod-card">
              <div className="mod-card-title">Your Business <div className="mod-card-title-line" /></div>

              <div className="mod-field">
                <label className="mod-label">What type of business are you running? *</label>
                <input className="mod-input" value={fields.businessType}
                  onChange={e => set("businessType", e.target.value)}
                  placeholder="e.g. Marketing agency, SaaS startup, professional services firm" />
              </div>

              <div className="mod-field">
                <label className="mod-label">How long have you been operating?</label>
                <select className="mod-input" value={fields.monthsActive} onChange={e => set("monthsActive", e.target.value)}>
                  <option value="">Select</option>
                  {["Under 6 months","6–12 months","1–2 years","2–5 years","5+ years"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="mod-field">
                <label className="mod-label">Team size</label>
                <select className="mod-input" value={fields.teamSize} onChange={e => set("teamSize", e.target.value)}>
                  <option value="">Select</option>
                  {["Just me","2–3","4–10","11–25","25+"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="mod-card">
              <div className="mod-card-title">Performance & Goals <div className="mod-card-title-line" /></div>

              <div className="mod-field">
                <label className="mod-label">What's working best right now?</label>
                <input className="mod-input" value={fields.topChannel}
                  onChange={e => set("topChannel", e.target.value)}
                  placeholder="e.g. Referrals, LinkedIn content, inbound SEO" />
              </div>

              <div className="mod-field">
                <label className="mod-label">What feels like the biggest drag or gap?</label>
                <input className="mod-input" value={fields.weakestArea}
                  onChange={e => set("weakestArea", e.target.value)}
                  placeholder="e.g. Lead follow-up, proposal turnaround, team coordination" />
              </div>

              <div className="mod-field">
                <label className="mod-label">Current revenue streams</label>
                <div className="mod-chips" style={{ marginTop: 6 }}>
                  {REVENUE_STREAMS.map(r => (
                    <button key={r} className={"mod-chip" + (fields.revenueStreams.includes(r) ? " on" : "")}
                      onClick={() => toggleRevenue(r)}>{r}</button>
                  ))}
                </div>
              </div>

              <div className="mod-field" style={{ marginTop: 8 }}>
                <label className="mod-label">Primary goal right now</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {NEXT_GOALS.map(g => (
                    <button key={g.id}
                      onClick={() => set("nextGoal", g.id)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                        borderRadius: "var(--r)",
                        border: "1px solid " + (fields.nextGoal === g.id ? "var(--c-predict)" : "var(--e2)"),
                        background: fields.nextGoal === g.id ? "color-mix(in srgb,var(--c-predict) 10%,transparent)" : "var(--s3)",
                        cursor: "pointer", textAlign: "left", transition: "all .15s",
                      }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: fields.nextGoal === g.id ? "var(--c-predict)" : "var(--t3)", marginTop: 4, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: fields.nextGoal === g.id ? "var(--t0)" : "var(--t1)", marginBottom: 2 }}>{g.label}</div>
                        <div style={{ fontSize: 11, color: "var(--t2)" }}>{g.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mod-action-wrap">
            <button className={"mod-btn" + (ready ? " ready" : "")} disabled={!ready} onClick={generate}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
              Run Business Health Check
            </button>
            <div className="mod-hint">AI diagnoses your operation and maps the highest-leverage next move — takes ~20 seconds.</div>
          </div>

          {aiError && <div style={{ color: "#f87171", fontSize: 12, marginTop: 12, padding: "10px 14px", background: "rgba(248,113,113,.08)", borderRadius: "var(--r)", border: "1px solid rgba(248,113,113,.2)" }}>{aiError}</div>}
        </>
      ) : loading ? (
        <AiLoader color="var(--c-predict)" label="Running your business health check…" />
      ) : (
        <>
          <div className="mod-preview-bar">
            <div className="mod-preview-title">Business Health Check — {fields.businessType || "Your Business"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-dim" onClick={() => { setSubmitted(false); setAiDoc(""); }} style={{ fontSize: 12 }}>← Edit</button>
              <button className="btn btn-dim" onClick={() => navigator.clipboard.writeText(aiDoc)} style={{ fontSize: 12 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy
              </button>
              <button className="btn" style={{ background: "var(--c-predict)", color: "#fff", fontSize: 12 }}
                onClick={() => openPrint(`Business Health Check — ${fields.businessType}`, aiDoc, "#818cf8")}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Save PDF
              </button>
            </div>
          </div>
          <div className="mod-doc">
            {renderDoc(aiDoc, "var(--c-predict)")}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PROPOSALS ────────────────────────────────────────────────────────────────
// ─── TIER ACCESS ──────────────────────────────────────────────────────────────
const TIER_MODULES = {
  foundation: ["autopilot", "proposals"],
  growth:     ["autopilot", "proposals", "outreach", "onboarding"],
  enterprise: ["autopilot", "proposals", "outreach", "onboarding"],
};

const TIER_LABEL = { foundation: "Foundation", growth: "Growth", enterprise: "Enterprise" };
const TIER_UPGRADE = { foundation: "Growth", growth: "Enterprise", enterprise: null };
const TIER_COLOR = { foundation: "var(--gold)", growth: "#34d399", enterprise: "#a78bfa" };

function canAccess(tier, view, role) {
  if (role === "admin") return true;
  return TIER_MODULES[tier || "foundation"]?.includes(view) ?? false;
}

function LockedModule({ moduleName, currentTier }) {
  const upgrade = TIER_UPGRADE[currentTier || "foundation"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", gap: 20, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--e2)", border: "1px solid var(--e3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)" }}>{moduleName}</div>
      <div style={{ fontSize: 13, color: "var(--t3)", maxWidth: 320, lineHeight: 1.7 }}>
        This module is not included in your <strong style={{ color: TIER_COLOR[currentTier || "foundation"] }}>{TIER_LABEL[currentTier || "foundation"]}</strong> plan.
        {upgrade && <> Upgrade to <strong>{upgrade}</strong> to unlock it.</>}
      </div>
      <div style={{ fontSize: 12, color: "var(--t4)", marginTop: 4 }}>
        Contact <a href="mailto:hello@cornerstoneaigroup.com" style={{ color: "var(--amber)", textDecoration: "none" }}>hello@cornerstoneaigroup.com</a> to upgrade your plan.
      </div>
    </div>
  );
}

const DELIVERABLE_OPTIONS = [
  "Strategy & Planning Session",
  "AI Workflow Build",
  "Content system setup",
  "Automation pipeline (Zapier / Make)",
  "CRM & pipeline build",
  "Reporting dashboard",
  "Dedicated LinkedIn post series",
  "Email sequence build",
  "Monthly retainer management",
  "Performance review & optimisation",
  "Team training & documentation",
  "Custom integration",
];

const IcCheck = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcCopy = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const IcPrint = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

function AiLoader({ color = "var(--amber)", label = "Generating…" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", gap: 20 }}>
      <div style={{ position: "relative", width: 48, height: 48 }}>
        <svg viewBox="0 0 48 48" fill="none" style={{ width: 48, height: 48, animation: "spin 1.4s linear infinite" }}>
          <circle cx="24" cy="24" r="20" stroke="var(--e2)" strokeWidth="3" />
          <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray="62.8" strokeDashoffset="47" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 18, height: 18, opacity: 0.8 }}>
          <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </div>
      <div style={{ fontSize: 13, color: "var(--t2)", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 11, color: "var(--t4)", maxWidth: 280, textAlign: "center", lineHeight: 1.6 }}>
        The AI is analysing your inputs and building a detailed, specific plan. This takes 15–30 seconds.
      </div>
    </div>
  );
}

function renderDoc(text, accentVar) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("# "))   return <h1 key={i} className="pd-h1">{line.slice(2)}</h1>;
    if (line.startsWith("## "))  return <h2 key={i} className="pd-h2" style={{ color: accentVar }}>{line.slice(3)}</h2>;
    if (line === "---")          return <hr key={i} className="pd-hr" />;
    if (line.startsWith("  • ") || line.startsWith("• ")) {
      const txt = line.startsWith("  • ") ? line.slice(4) : line.slice(2);
      return <div key={i} className="pd-li" style={{ "--mod-c": accentVar }}>{txt}</div>;
    }
    if (line.trim() === "") return <div key={i} className="pd-gap" />;
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return <p key={i} className="pd-p">{parts.map((pt, j) => j % 2 === 1 ? <strong key={j}>{pt}</strong> : pt)}</p>;
  });
}

function openPrint(title, content, accentHex) {
  const w = window.open("", "_blank");
  const html = content
    .replace(/^# (.+)$/m, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^  • (.+)$/gm, '<li>$1</li>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/<\/p><p><li>/g, '<ul><li>')
    .replace(/<\/li><\/p>/g, '</li></ul>');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Georgia',serif;color:#111;padding:60px 72px;max-width:860px;margin:0 auto;line-height:1.75}h1{font-size:26px;font-weight:700;margin-bottom:8px}h2{font-size:11px;font-weight:700;margin:30px 0 10px;letter-spacing:.08em;text-transform:uppercase;color:${accentHex || "#555"};border-top:1px solid #eee;padding-top:20px}p,li{font-size:13.5px;color:#222;margin-bottom:8px}ul{padding-left:18px;margin-bottom:10px}hr{border:none;border-top:1px solid #ddd;margin:24px 0}strong{font-weight:600}@media print{body{padding:40px 52px}}</style>
    </head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

function Proposals() {
  const [fields, setFields] = useState({
    brandName: "",
    brandWebsite: "",
    brandContact: "",
    brandProduct: "",
    campaignGoal: "",
    budget: "",
    timeline: "",
    deliverables: [],
    notes: "",
    preparedBy: "",
    date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  });
  const [preview, setPreview]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [aiDoc, setAiDoc]       = useState("");
  const [aiError, setAiError]   = useState("");
  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));

  const toggleDeliverable = (d) =>
    set("deliverables", fields.deliverables.includes(d)
      ? fields.deliverables.filter(x => x !== d)
      : [...fields.deliverables, d]);

  const ready = fields.brandName && fields.deliverables.length > 0;

  async function generate() {
    setLoading(true);
    setAiError("");
    setPreview(true);
    try {
      const system = `You are a senior consultant at Cornerstone AI Group, writing a polished, persuasive client proposal. Write in clear, confident British English. Use markdown: # for the title, ## for section headers, **bold** for key terms. The proposal must read like a premium professional document — direct, outcome-led, and tailored to the specific client. Never use generic filler language.`;

      const user = `Write a full client proposal for Cornerstone AI Group with the following details:

Client: ${fields.brandName}${fields.brandWebsite ? ` (${fields.brandWebsite})` : ""}
Contact: ${fields.brandContact || fields.brandName}
Prepared by: Cornerstone AI Group${fields.preparedBy ? ` · ${fields.preparedBy}` : ""}
Date: ${fields.date}
Client's challenge / problem: ${fields.brandProduct || "Not specified"}
Engagement goal: ${fields.campaignGoal || "Not specified"}
Investment: ${fields.budget || "To be confirmed"}
Timeline: ${fields.timeline || "To be confirmed"}
Scope of work: ${fields.deliverables.join(", ")}
Additional notes: ${fields.notes || "None"}

The proposal must include these sections:

# Client Proposal — ${fields.brandName}

A subtitle line with: Client name · Contact · Prepared by Cornerstone AI Group · Date

## About Cornerstone AI Group
2-3 sentences. We build AI-powered operational systems for businesses — not tools, outcomes. We design, build, and manage the systems.

## The Challenge
Restate the client's problem (from: "${fields.brandProduct || "their stated challenge"}") in 2-3 paragraphs. Be specific. Name what it's costing them — time, revenue, opportunity. Show you understand their world.

## Our Proposed Solution
How Cornerstone AI Group will solve this. Reference the goal: "${fields.campaignGoal || "their stated goal"}". Explain the approach, not just the deliverables.

## Scope of Work
List each deliverable (${fields.deliverables.join(", ")}) as a clear line item. For each one, add one sentence explaining exactly what it includes and what it delivers for the client.

## Investment & Timeline
${fields.budget ? `Investment: ${fields.budget}` : "Investment: [To be confirmed following discovery call]"}
${fields.timeline ? `Timeline: ${fields.timeline}` : "Timeline: [To be agreed]"}
Include a brief note on what the investment covers and the payment structure (setup + monthly retainer model).

## How We Work Together
5 steps: Discovery → Proposal confirmed → Build → Go-live → Ongoing management. One sentence per step. Specific and reassuring.

## Why Cornerstone AI Group
4 bullet points. Specific differentiators: bespoke systems not templates, we own delivery, one point of contact, documented handover.

${fields.notes ? `## Additional Notes\n${fields.notes}` : ""}

## Next Steps
One clear paragraph. What happens after they sign. End with a confident closing line from Cornerstone AI Group.

Write the full document. Make it feel worth £3,000/month.`;

      const text = await callLLM({ system, user, maxTokens: 5000 });
      setAiDoc(text);
    } catch (e) {
      setAiError(e.message || "Generation failed — please try again.");
      setPreview(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mod-shell" style={{ "--mod-c": "var(--c-proposals)" }}>
      {!preview ? (
        <>
          <div className="mod-hero">
            <div className="mod-badge"><span className="mod-badge-dot" /> Proposals</div>
            <div className="mod-title">Proposal Builder</div>
            <div className="mod-desc">Add the client details, select your deliverables — generate a polished proposal in seconds.</div>
          </div>

          <div className="mod-body">
            {/* Left — brand details */}
            <div className="mod-card">
              <div className="mod-card-title">Client Details <span className="mod-card-title-line" /></div>
              <div className="mod-field">
                <label className="mod-label">Client / company name *</label>
                <input className="mod-input" value={fields.brandName}
                  onChange={e => set("brandName", e.target.value)} placeholder="e.g. Acme Solutions Ltd" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Client website</label>
                <input className="mod-input" value={fields.brandWebsite}
                  onChange={e => set("brandWebsite", e.target.value)} placeholder="e.g. acmesolutions.com" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Contact name</label>
                <input className="mod-input" value={fields.brandContact}
                  onChange={e => set("brandContact", e.target.value)} placeholder="e.g. Sarah Mitchell, Operations Director" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Problem / challenge to solve</label>
                <input className="mod-input" value={fields.brandProduct}
                  onChange={e => set("brandProduct", e.target.value)} placeholder="e.g. Manual reporting taking 8h/week, no lead follow-up system" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Engagement goal</label>
                <input className="mod-input" value={fields.campaignGoal}
                  onChange={e => set("campaignGoal", e.target.value)} placeholder="e.g. Reduce admin by 60%, build a functioning sales pipeline" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Investment / retainer</label>
                <input className="mod-input" value={fields.budget}
                  onChange={e => set("budget", e.target.value)} placeholder="e.g. £3,000/mo Foundation / £2,500 setup fee" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Campaign timeline</label>
                <input className="mod-input" value={fields.timeline}
                  onChange={e => set("timeline", e.target.value)} placeholder="e.g. 3-month engagement, starting June 2025" />
              </div>
              <div className="mod-card-title" style={{ marginTop: 14 }}>Your Details <span className="mod-card-title-line" /></div>
              <div className="mod-field">
                <label className="mod-label">Prepared by</label>
                <input className="mod-input" value={fields.preparedBy}
                  onChange={e => set("preparedBy", e.target.value)} placeholder="Your name" />
              </div>
            </div>

            {/* Right — deliverables + notes */}
            <div className="mod-card">
              <div className="mod-card-title">Deliverables * <span className="mod-card-title-line" /></div>
              <div className="mod-chips">
                {DELIVERABLE_OPTIONS.map(d => (
                  <button key={d} className={`mod-chip${fields.deliverables.includes(d) ? " on" : ""}`}
                    onClick={() => toggleDeliverable(d)}>
                    {fields.deliverables.includes(d) && IcCheck}
                    {d}
                  </button>
                ))}
              </div>

              <div className="mod-card-title" style={{ marginTop: 18 }}>Additional Notes <span className="mod-card-title-line" /></div>
              <textarea className="mod-input mod-ta" rows={4} value={fields.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Specific constraints, prior context, exclusivity terms, integration requirements…" />
            </div>
          </div>

          <div className="mod-action-wrap">
            <button className={`mod-btn${ready ? " ready" : ""}`} disabled={!ready}
              onClick={generate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
               Build Proposal
            </button>
            <div className="mod-hint">
              {ready ? "AI generates a tailored, polished proposal — takes ~20 seconds." : "Add the client name, select at least one deliverable"}
            </div>
          </div>

          {aiError && <div style={{ color: "#f87171", fontSize: 12, marginTop: 12, padding: "10px 14px", background: "rgba(248,113,113,.08)", borderRadius: "var(--r)", border: "1px solid rgba(248,113,113,.2)" }}>{aiError}</div>}
        </>
      ) : loading ? (
        <AiLoader color="var(--c-proposals)" label="Writing your client proposal…" />
      ) : (
        <>
          <div className="mod-preview-bar">
            <button className="btn btn-dim" onClick={() => { setPreview(false); setAiDoc(""); }}>← Edit</button>
            <div className="mod-preview-title">Proposal — {fields.brandName}</div>
            <button className="btn btn-dim" onClick={() => navigator.clipboard.writeText(aiDoc)}>
              {IcCopy} Copy text
            </button>
            <button className="btn" style={{ background: "var(--c-proposals)", color: "#fff", fontSize: 12 }}
              onClick={() => openPrint(`Proposal — ${fields.brandName}`, aiDoc, "#818cf8")}>
              {IcPrint} Save as PDF
            </button>
          </div>
          <div className="mod-doc">
            {renderDoc(aiDoc, "var(--c-proposals)")}
          </div>
        </>
      )}
    </div>
  );
}



// ─── LOGIN GATE ───────────────────────────────────────────────────────────────
function LoginGate({ onAuth }) {
  const [email, setEmail]   = useState("");
  const [pw, setPw]         = useState("");
  const [err, setErr]       = useState("");
  const [busy, setBusy]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !pw.trim()) return;
    setBusy(true); setErr("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) {
      setErr("Incorrect email or password.");
      setBusy(false);
      return;
    }
    // Fetch profile to check is_active
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active, role, agency_name, tier")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile || !profile.is_active) {
      await supabase.auth.signOut();
      setErr("Your account has been disabled. Contact CAIG support.");
      setBusy(false);
      return;
    }
    onAuth(data.user, profile);
  }

  return (
    <div className="login-gate">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <LogoMark size={52} />
        </div>
        <div className="login-title">Cornerstone AI Group</div>
        <div className="login-sub">
          AI Content Engine &middot; Client Portal<br />Sign in to access your portal.
        </div>
        <form onSubmit={handleSubmit} style={{ width: "100%", marginTop: 8 }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => { setEmail(e.target.value); setErr(""); }}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 14px", marginBottom: 8,
              background: "var(--e1)", border: "1px solid var(--b1)",
              borderRadius: 8, color: "var(--t1)", fontSize: 14,
              outline: "none",
            }}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(""); }}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 14px", marginBottom: 10,
              background: "var(--e1)", border: "1px solid var(--b1)",
              borderRadius: 8, color: "var(--t1)", fontSize: 14,
              outline: "none",
            }}
          />
          {err && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{err}</div>}
          <button
            type="submit"
            className="btn btn-amber login-btn"
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div style={{ marginTop: 18, fontSize: 11.5, color: "var(--t4)", lineHeight: 1.6 }}>
          Access is by invitation only.<br />
          Contact <span style={{ color: "var(--gold)" }}>hello@cornerstoneaigroup.com</span> to get started.
        </div>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
const PLAT_COLORS_H = {
  linkedin: "#0077b5", twitter: "#1da1f2", instagram: "#e1306c",
  facebook: "#1877f2", tiktok: "#fe2c55", youtube: "#ff0000",
};
const PLAT_NAMES_H = {
  linkedin: "LinkedIn", twitter: "Twitter / X", instagram: "Instagram",
  facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube",
};

function Home({ queue, setView, dbStats = {}, dbCreators = [] }) {
  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const ready  = queue.filter(i => i.status === "ready").length;
  const sched  = queue.filter(i => i.status === "scheduled").length;
  const posted = queue.filter(i => i.status === "posted").length;
  const recent = [...queue].reverse().slice(0, 5);

  const stats = [
    { l: "In Queue",  v: queue.length,                                           c: "var(--t0)" },
    { l: "Ready",     v: ready,                                                  c: "var(--green)" },
    { l: "Scheduled", v: sched,                                                  c: "var(--c-proposals)" },
    { l: "Published", v: posted,                                                 c: "var(--amber)" },
    { l: "Clients",   v: dbStats.clients ?? 0,                                   c: "var(--gold)" },
    { l: "Creators",  v: dbStats.creators ?? PERSONAS.length,                    c: "var(--t1)" },
    { l: "Deals",     v: dbStats.deals ?? 0,                                     c: "var(--c-proposals)" },
  ];

   const MODULES = [
     {
       id: "autopilot",
       title: "Content Engine",
       desc: "Generate on-brand content across any channel, voice, or format — social, LinkedIn, email, blogs — in seconds.",
       color: "var(--c-content)",
       icon: (
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
           <rect x="3" y="3" width="18" height="18" rx="2"/>
           <path d="M3 9h18M9 21V9"/>
         </svg>
       ),
       live: true,
     },
     {
       id: "proposals",
       title: "Proposal Builder",
       desc: "Generate a polished client or partnership proposal — scope, deliverables, pricing, and brand fit — in seconds.",
       color: "var(--c-proposals)",
       icon: (
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
           <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
           <polyline points="14 2 14 8 20 8"/>
           <line x1="16" y1="13" x2="8" y2="13"/>
           <line x1="16" y1="17" x2="8" y2="17"/>
         </svg>
       ),
       live: true,
     },
     {
       id: "outreach",
       title: "Business Health Check",
       desc: "Diagnose your operation — where time is being lost, what's performing, and the single highest-impact move to make next.",
       color: "var(--c-predict)",
       icon: (
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
           <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
           <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
         </svg>
       ),
       live: true,
     },
     {
       id: "onboarding",
       title: "Automate Ops",
       desc: "Scheduling, follow-ups, reporting, payment tracking — mapped and automated so your team focuses on the work that matters.",
       color: "var(--c-automate)",
       icon: (
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
           <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
         </svg>
       ),
       live: true,
     },
   ];

  return (
    <div className="home">
      {/* Header */}
      <div className="home-head">
        <div className="home-date">{dateStr}</div>
        <div className="home-greeting">{greeting}.</div>
      </div>

      {/* Module entry cards */}
      <div className="home-modules">
        {MODULES.map(m => (
          <div
            key={m.id}
            className="hmc"
            style={{ "--mc-c": m.color }}
            onClick={() => m.live && setView(m.id)}
          >
            <div className="hmc-icon">{m.icon}</div>
            <div className="hmc-title">{m.title}</div>
            <div className="hmc-desc">{m.desc}</div>
            {m.live
              ? <div className="hmc-tag">Open module <span className="hmc-arrow">→</span></div>
              : <div className="hmc-tag soon">Coming soon</div>
            }
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="home-stats">
        {stats.map((s, i) => (
          <div className="hs" key={i}>
            <div className="hs-val" style={{ color: s.c }}>{s.v}</div>
            <div className="hs-lbl">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Persona grid */}
      <div className="home-card">
        <div className="home-sh">
          <span className="home-sh-t">Media Network</span>
          <span className="home-sh-ct">{PERSONAS.length + dbCreators.length} creators</span>
        </div>
        <div className="home-pgrid">
          {PERSONAS.map(p => {
            const cnt = queue.filter(i => i.personaId === p.id).length;
            return (
              <div className="hpc" key={p.id} style={{ "--pc": p.color }}>
                <div className="hpc-dot" />
                <div className="hpc-name">{p.name}</div>
                <div className="hpc-niche">{p.niche}</div>
                <div className="hpc-cnt">{cnt > 0 ? `${cnt} posts` : "no posts yet"}</div>
              </div>
            );
          })}
          {dbCreators.map(c => (
            <div className="hpc" key={c.id} style={{ "--pc": "#818CF8" }}>
              <div className="hpc-dot" />
              <div className="hpc-name">{c.name}</div>
              <div className="hpc-niche">{c.niche}</div>
              <div className="hpc-cnt">{c.handle || "content account"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent posts */}
      {recent.length > 0 && (
        <div className="home-card">
          <div className="home-sh">
            <span className="home-sh-t">Recent</span>
            <button className="home-sh-link" onClick={() => setView("queue")}>View all →</button>
          </div>
          <div className="home-recent-list">
            {recent.map((p, i) => (
              <div className="hrc" key={i}>
                <div className="hrc-top">
                  <span className="hrc-plat" style={{ color: PLAT_COLORS_H[p.platform] || "#888" }}>
                    {PLAT_NAMES_H[p.platform] || p.platform}
                  </span>
                  <span className="hrc-pname">{p.personaName}</span>
                  <span className="hrc-date">{p.scheduledDate}</span>
                </div>
                <div className="hrc-hook">{p.hook || p.caption || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="home-status">
        <div className="hsb-item"><span className="hsb-dot g" />Gemini 2.5 Pro · Connected</div>
        <div className="hsb-item"><span className="hsb-dot g" />AI Engine · Ready</div>
        <div className="hsb-item"><span className="hsb-dot a" />4 modules active</div>
      </div>
    </div>
  );
}

// ─── BRAND DEAL PIPELINE ──────────────────────────────────────────────────────
const DEAL_STAGES = ["Outreach", "In Talks", "Negotiating", "Contract Sent", "Confirmed", "Live", "Completed", "Rejected"];
const STAGE_COLORS = {
  "Outreach":      "#64748b",
  "In Talks":      "#818CF8",
  "Negotiating":   "#FBBF24",
  "Contract Sent": "#FB923C",
  "Confirmed":     "#34D399",
  "Live":          "#10B981",
  "Completed":     "#059669",
  "Rejected":      "#EF4444",
};

const BLANK_DEAL = { brand_name: "", deal_value: "", stage: "Outreach", notes: "", creator_id: "", client_id: "" };

function DealPipeline() {
  const [deals, setDeals]       = useState([]);
  const [creators, setCreators] = useState([]);
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState(BLANK_DEAL);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState("");
  const [filterStage, setFilterStage] = useState("All");
  const [filterClient, setFilterClient] = useState("All");

  async function load() {
    setLoading(true);
    const [{ data: d }, { data: cr }, { data: cl }] = await Promise.all([
      supabase.from("deals").select("*, creators(name, handle, niche), profiles(agency_name)").order("created_at", { ascending: false }),
      supabase.from("creators").select("id, name, handle, client_id").order("name"),
      supabase.from("profiles").select("id, agency_name").eq("role", "client").order("agency_name"),
    ]);
    setDeals(d || []);
    setCreators(cr || []);
    setClients(cl || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addDeal(e) {
    e.preventDefault();
    if (!form.brand_name || !form.creator_id) { setErr("Brand name and creator are required."); return; }
    setBusy(true); setErr("");
    // get client_id from creator
    const creator = creators.find(c => c.id === form.creator_id);
    const { error } = await supabase.from("deals").insert({
      brand_name:  form.brand_name,
      deal_value:  form.deal_value ? parseFloat(form.deal_value) : null,
      stage:       form.stage,
      notes:       form.notes,
      creator_id:  form.creator_id,
      client_id:   creator?.client_id || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setForm(BLANK_DEAL);
    setAdding(false);
    load();
  }

  async function updateStage(deal, stage) {
    await supabase.from("deals").update({ stage, updated_at: new Date().toISOString() }).eq("id", deal.id);
    load();
  }

  async function deleteDeal(deal) {
    if (!window.confirm(`Remove deal with ${deal.brand_name}?`)) return;
    await supabase.from("deals").delete().eq("id", deal.id);
    load();
  }

  const filtered = deals.filter(d =>
    (filterStage === "All" || d.stage === filterStage) &&
    (filterClient === "All" || d.client_id === filterClient)
  );

  const totalValue = filtered.filter(d => d.deal_value && !["Rejected"].includes(d.stage))
    .reduce((s, d) => s + Number(d.deal_value), 0);

  const confirmedValue = filtered.filter(d => d.deal_value && ["Confirmed", "Live", "Completed"].includes(d.stage))
    .reduce((s, d) => s + Number(d.deal_value), 0);

  const S = { background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "9px 12px", color: "var(--t1)", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 0 60px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t0)", letterSpacing: "-.02em" }}>Brand Deal Pipeline</div>
          <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 3 }}>Track every brand partnership across the network</div>
        </div>
        <button onClick={() => { setAdding(a => !a); setErr(""); }} style={{ background: adding ? "var(--e2)" : "var(--gold)", color: adding ? "var(--t2)" : "#000", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {adding ? "Cancel" : "+ New Deal"}
        </button>
      </div>

      {/* Stats */}
      <div className="home-stats" style={{ marginBottom: 24 }}>
        {[
          { l: "Total Deals",   v: filtered.length,                                              c: "var(--t0)" },
          { l: "Pipeline Value", v: totalValue ? `£${totalValue.toLocaleString()}` : "—",        c: "var(--gold)" },
          { l: "Confirmed",     v: confirmedValue ? `£${confirmedValue.toLocaleString()}` : "—", c: "var(--green)" },
          { l: "Active Stages", v: [...new Set(filtered.map(d => d.stage))].length,              c: "var(--t2)" },
        ].map((s, i) => (
          <div className="hs" key={i}>
            <div className="hs-val" style={{ color: s.c, fontSize: typeof s.v === "string" ? 18 : 28 }}>{s.v}</div>
            <div className="hs-lbl">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Add deal form */}
      {adding && (
        <form onSubmit={addDeal} style={{ background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 12, padding: "22px 24px", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 14 }}>New Brand Deal</div>
          <div className="dp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input placeholder="Brand name *" value={form.brand_name} onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))} style={S} />
            <input placeholder="Deal value £" type="number" value={form.deal_value} onChange={e => setForm(f => ({ ...f, deal_value: e.target.value }))} style={S} />
            <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))} style={S}>
              {DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="dp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <select value={form.creator_id} onChange={e => setForm(f => ({ ...f, creator_id: e.target.value }))} style={S}>
              <option value="">Select creator *</option>
              {creators.map(c => <option key={c.id} value={c.id}>{c.name} {c.handle || ""}</option>)}
            </select>
            <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={1} style={{ ...S, resize: "none" }} />
          </div>
          {err && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 10 }}>{err}</div>}
          <button type="submit" disabled={busy} style={{ background: "var(--gold)", color: "#000", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? .5 : 1 }}>
            {busy ? "Saving…" : "Add Deal"}
          </button>
        </form>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} style={{ background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 7, padding: "7px 12px", color: "var(--t2)", fontSize: 12, outline: "none" }}>
          <option value="All">All Stages</option>
          {DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 7, padding: "7px 12px", color: "var(--t2)", fontSize: 12, outline: "none" }}>
          <option value="All">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.agency_name}</option>)}
        </select>
      </div>

      {/* Deal list */}
      {loading ? (
        <div style={{ color: "var(--t3)", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "var(--t3)", fontSize: 13, padding: 20 }}>No deals yet. Click + New Deal to add one.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(deal => (
            <div key={deal.id} style={{ background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 11, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              {/* Stage colour bar */}
              <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: STAGE_COLORS[deal.stage] || "#888", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--t0)" }}>{deal.brand_name}</span>
                  {deal.deal_value && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>£{Number(deal.deal_value).toLocaleString()}</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--t3)" }}>
                  {deal.creators?.name && <span style={{ marginRight: 10 }}>{deal.creators.name}{deal.creators.handle ? ` ${deal.creators.handle}` : ""}</span>}
                  {deal.profiles?.agency_name && <span style={{ marginRight: 10 }}>· {deal.profiles.agency_name}</span>}
                  {deal.creators?.niche && <span>· {deal.creators.niche}</span>}
                </div>
                {deal.notes && <div style={{ fontSize: 12, color: "var(--t4)", marginTop: 4, fontStyle: "italic" }}>{deal.notes}</div>}
              </div>
              {/* Stage selector */}
              <select
                value={deal.stage}
                onChange={e => updateStage(deal, e.target.value)}
                style={{ background: `${STAGE_COLORS[deal.stage]}22`, border: `1px solid ${STAGE_COLORS[deal.stage]}55`, borderRadius: 7, padding: "5px 10px", color: STAGE_COLORS[deal.stage], fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}
              >
                {DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => deleteDeal(deal)} style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "var(--red)", cursor: "pointer" }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CLIENT ONBOARDING ────────────────────────────────────────────────────────
function OnboardingWelcome({ profile, onComplete }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const STEPS = [
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
          <path d="M4 6 L12 2 L20 6 L20 18 L12 22 L4 18 Z"/>
          <line x1="12" y1="2" x2="12" y2="22"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
        </svg>
      ),
      title: `Welcome to your portal, ${profile.agency_name || ""}`,
      body: "This is your Cornerstone AI Group client portal. Everything we build and manage for your creator roster lives here — content, brand deals, and your full team overview. We'll walk you through what's available in the next 60 seconds.",
      cta: "Show me what's here →",
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
      ),
      title: "Three sections. One portal.",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
          {[
            { label: "Overview", desc: "Your creator roster, live stats, and a snapshot of recent content and deals at a glance." },
            { label: "Content",  desc: "Every piece of AI-generated content for your creators — hooks, captions, hashtags — ready to review and use. Filterable by status." },
            { label: "Deals",    desc: "Your full brand deal pipeline. See every opportunity, its stage, value, and which creator it's attached to." },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t0)", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 13, color: "var(--t3)", lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      ),
      cta: "Got it →",
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ),
      title: "You're all set.",
      body: "Your portal is live and we're actively managing your system. If you ever have questions, reach us directly at hello@cornerstoneaigroup.com — we respond same day.",
      cta: "Go to my portal",
    },
  ];

  const current = STEPS[step];

  async function handleCta() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
      return;
    }
    setBusy(true);
    await supabase.from("profiles").update({ onboarded: true }).eq("id", profile.id);
    onComplete();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24,
    }}>
      <div style={{
        background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 20,
        padding: "48px 44px", maxWidth: 520, width: "100%", textAlign: "center",
        boxShadow: "0 32px 80px rgba(0,0,0,.5)",
      }}>
        {/* Step dots */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 40 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6, borderRadius: 3,
              background: i === step ? "var(--gold)" : "var(--b1)",
              transition: "all .3s",
            }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{ marginBottom: 24 }}>{current.icon}</div>

        {/* Title */}
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t0)", letterSpacing: "-.02em", marginBottom: 16, lineHeight: 1.3 }}>
          {current.title}
        </div>

        {/* Body */}
        <div style={{ fontSize: 14, color: "var(--t3)", lineHeight: 1.65, marginBottom: 36 }}>
          {current.body}
        </div>

        {/* CTA */}
        <button
          onClick={handleCta}
          disabled={busy}
          style={{
            background: "var(--gold)", color: "#000", border: "none", borderRadius: 10,
            padding: "13px 32px", fontSize: 14, fontWeight: 700, cursor: busy ? "wait" : "pointer",
            width: "100%", opacity: busy ? .7 : 1, transition: "opacity .15s",
          }}
        >
          {busy ? "Loading…" : current.cta}
        </button>

        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{ background: "none", border: "none", color: "var(--t4)", fontSize: 12, cursor: "pointer", marginTop: 14 }}
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}

// ─── CLIENT PORTAL ────────────────────────────────────────────────────────────
function ClientPortal({ profile, onSignOut }) {
  const [creators, setCreators]     = useState([]);
  const [deals, setDeals]           = useState([]);
  const [content, setContent]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("overview");
  const [contentFilter, setContentFilter] = useState("all");
  const [showOnboarding, setShowOnboarding] = useState(!profile.onboarded);

  useEffect(() => {
    Promise.all([
      supabase.from("creators").select("*").eq("client_id", profile.id),
      supabase.from("deals").select("*, creators(name, handle)").eq("client_id", profile.id).order("created_at", { ascending: false }),
      supabase.from("content_queue").select("*").eq("client_id", profile.id).order("created_at", { ascending: false }),
    ]).then(([{ data: cr }, { data: de }, { data: co }]) => {
      setCreators(cr || []);
      setDeals(de || []);
      setContent(co || []);
      setLoading(false);
    });
  }, [profile.id]);

  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const activeCreators = creators.filter(c => c.is_active);

  const NICHE_COLORS = {
    Travel: "#34D399", Fitness: "#FB923C", Parenting: "#F472B6",
    Gaming: "#818CF8", Football: "#60A5FA", Lifestyle: "#FBBF24", Wellness: "#A78BFA",
  };

  const STATUS_COLORS = { ready: "var(--green)", scheduled: "var(--gold)", posted: "var(--t3)" };

  const filteredContent = contentFilter === "all"
    ? content
    : content.filter(c => c.status === contentFilter);

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "content",  label: `Content${content.length > 0 ? ` (${content.length})` : ""}` },
    { id: "deals",    label: `Deals${deals.length > 0 ? ` (${deals.length})` : ""}` },
  ];

  const tabBtn = (t) => ({
    background: tab === t.id ? "var(--e2)" : "transparent",
    color: tab === t.id ? "var(--t0)" : "var(--t3)",
    border: tab === t.id ? "1px solid var(--b1)" : "1px solid transparent",
    borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", transition: "all .15s",
  });

  return (
    <div className="app">
      {showOnboarding && (
        <OnboardingWelcome profile={profile} onComplete={() => setShowOnboarding(false)} />
      )}
      {/* Top nav */}
      <div className="topbar">
        <div className="tb-brand">
          <Logo height={36} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginRight: 12, textAlign: "right", lineHeight: 1.4 }}>
          <div style={{ color: "var(--t1)", fontWeight: 600 }}>{profile.agency_name || profile.email}</div>
          <div style={{ textTransform: "uppercase", letterSpacing: ".06em", fontSize: 10, color: "var(--t4)" }}>Client</div>
        </div>
        <button className="tb-signout" onClick={onSignOut}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>

      <div className="main">
        <div className="view">
          <div className="home">
            {/* Header */}
            <div className="home-head">
              <div className="home-date">{dateStr}</div>
              <div className="home-greeting">{greeting}, {profile.agency_name || ""}.</div>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
              {TABS.map(t => (
                <button key={t.id} style={tabBtn(t)} onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {tab === "overview" && (
              <>
                <div className="home-stats">
                  {[
                    { l: "Creators",  v: creators.length,       c: "var(--t0)" },
                    { l: "Active",    v: activeCreators.length,  c: "var(--green)" },
                    { l: "Deals",     v: deals.length,           c: "var(--gold)" },
                    { l: "Content",   v: content.length,         c: "var(--c-proposals)" },
                  ].map((s, i) => (
                    <div className="hs" key={i}>
                      <div className="hs-val" style={{ color: s.c }}>{s.v}</div>
                      <div className="hs-lbl">{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Creator roster */}
                <div className="home-card">
                  <div className="home-sh">
                    <span className="home-sh-t">Your Creator Roster</span>
                    <span className="home-sh-ct">{creators.length} creator{creators.length !== 1 ? "s" : ""}</span>
                  </div>
                  {loading ? (
                    <div style={{ color: "var(--t3)", fontSize: 13, padding: "16px 0" }}>Loading…</div>
                  ) : creators.length === 0 ? (
                    <div style={{ color: "var(--t3)", fontSize: 13, padding: "16px 0" }}>
                      No creators added yet. Contact CAIG to get your roster set up.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                      {creators.map(c => (
                        <div key={c.id} style={{ background: "var(--e2)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: `${NICHE_COLORS[c.niche] || "#888"}22`, border: `2px solid ${NICHE_COLORS[c.niche] || "#888"}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: NICHE_COLORS[c.niche] || "#888" }}>
                            {(c.name || "?")[0]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>
                              {c.handle && <span style={{ marginRight: 10 }}>{c.handle}</span>}
                              {c.niche && <span style={{ marginRight: 10 }}>{c.niche}</span>}
                              {c.platform && <span>{c.platform}</span>}
                            </div>
                          </div>
                          {c.follower_count && (
                            <div style={{ fontSize: 12, color: "var(--t3)", textAlign: "right" }}>
                              <div style={{ fontWeight: 600, color: "var(--t2)", fontSize: 13 }}>{Number(c.follower_count).toLocaleString()}</div>
                              <div>followers</div>
                            </div>
                          )}
                          <div style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600, background: c.is_active ? "rgba(52,211,153,.12)" : "rgba(239,68,68,.1)", color: c.is_active ? "var(--green)" : "var(--red)" }}>
                            {c.is_active ? "Active" : "Paused"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent content preview */}
                {content.length > 0 && (
                  <div className="home-card">
                    <div className="home-sh">
                      <span className="home-sh-t">Recent Content</span>
                      <button style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 12, fontWeight: 600, cursor: "pointer" }} onClick={() => setTab("content")}>View all →</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                      {content.slice(0, 3).map(c => (
                        <div key={c.id} style={{ background: "var(--e2)", borderRadius: 9, padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".05em" }}>{c.persona_name} · {c.platform}</div>
                            <div style={{ marginLeft: "auto", fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 600, background: `${STATUS_COLORS[c.status] || "#888"}22`, color: STATUS_COLORS[c.status] || "#888" }}>{c.status}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", lineHeight: 1.4 }}>{c.hook}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* System status */}
                <div className="home-status">
                  <div className="hsb-item"><span className="hsb-dot g" />AI Content Engine · Active</div>
                  <div className="hsb-item"><span className="hsb-dot g" />Cornerstone AI Group · Managing your system</div>
                  <div className="hsb-item"><span className="hsb-dot a" />Questions? hello@cornerstoneaigroup.com</div>
                </div>
              </>
            )}

            {/* ── CONTENT TAB ── */}
            {tab === "content" && (
              <>
                {/* Filter bar */}
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {["all", "ready", "scheduled", "posted"].map(f => (
                    <button key={f} onClick={() => setContentFilter(f)} style={{ background: contentFilter === f ? "var(--gold)" : "var(--e2)", color: contentFilter === f ? "#000" : "var(--t3)", border: "1px solid var(--b1)", borderRadius: 7, padding: "5px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                      {f}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div style={{ color: "var(--t3)", fontSize: 13 }}>Loading…</div>
                ) : filteredContent.length === 0 ? (
                  <div style={{ color: "var(--t3)", fontSize: 13, padding: "24px 0" }}>
                    {content.length === 0
                      ? "No content generated yet. CAIG will generate content for your creators and it will appear here."
                      : "No content matching this filter."}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filteredContent.map(c => (
                      <div key={c.id} style={{ background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 12, padding: "18px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                            {c.persona_name} · {c.platform}
                          </div>
                          <div style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 12, fontWeight: 600, background: `${STATUS_COLORS[c.status] || "#888"}22`, color: STATUS_COLORS[c.status] || "#888" }}>
                            {c.status}
                          </div>
                        </div>
                        {c.pillar && <div style={{ fontSize: 11, color: "var(--t4)", marginBottom: 8, fontStyle: "italic" }}>{c.pillar}</div>}
                        {c.hook && <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t0)", marginBottom: 8, lineHeight: 1.45 }}>{c.hook}</div>}
                        {c.caption && <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 8 }}>{c.caption}</div>}
                        {c.hashtags && <div style={{ fontSize: 11, color: "var(--t3)" }}>{c.hashtags}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── DEALS TAB ── */}
            {tab === "deals" && (
              <>
                {loading ? (
                  <div style={{ color: "var(--t3)", fontSize: 13 }}>Loading…</div>
                ) : deals.length === 0 ? (
                  <div style={{ color: "var(--t3)", fontSize: 13, padding: "24px 0" }}>No deals in pipeline yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {deals.map(d => (
                      <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: STAGE_COLORS[d.stage] || "#888", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t0)" }}>
                            {d.brand_name}
                            {d.deal_value && <span style={{ fontWeight: 600, color: "var(--gold)", marginLeft: 10 }}>£{Number(d.deal_value).toLocaleString()}</span>}
                          </div>
                          {d.creators?.name && <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 3 }}>{d.creators.name}{d.creators.handle ? ` · ${d.creators.handle}` : ""}</div>}
                          {d.notes && <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4, fontStyle: "italic" }}>{d.notes}</div>}
                        </div>
                        <div style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, fontWeight: 600, background: `${STAGE_COLORS[d.stage] || "#888"}22`, color: STAGE_COLORS[d.stage] || "#888", flexShrink: 0 }}>
                          {d.stage}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
const BLANK_CREATOR = { name: "", handle: "", niche: "", platform: "", follower_count: "", voice: "", pillars: "", brand_fit: "" };
const NICHES    = ["Travel", "Fitness", "Parenting", "Gaming", "Football", "Lifestyle", "Wellness", "Finance", "Beauty", "Food", "Tech", "Other"];
const CREATOR_PLATFORMS = ["TikTok", "Instagram", "YouTube", "Twitter/X", "LinkedIn", "Twitch", "Pinterest", "Multi-platform"];

function CreatorForm({ clientId, onSaved, onCancel }) {
  const [form, setForm] = useState(BLANK_CREATOR);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const inp = (field, extra = {}) => ({
    value: form[field],
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    style: { background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "9px 12px", color: "var(--t1)", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", ...extra.style },
    ...extra,
  });

  async function save(e) {
    e.preventDefault();
    if (!form.name || !form.niche || !form.platform) { setErr("Name, niche and platform are required."); return; }
    setBusy(true); setErr("");
    const { error } = await supabase.from("creators").insert({
      client_id:      clientId,
      name:           form.name,
      handle:         form.handle,
      niche:          form.niche,
      platform:       form.platform,
      follower_count: form.follower_count ? parseInt(form.follower_count.replace(/,/g, "")) : null,
      voice:          form.voice,
      pillars:        form.pillars,
      brand_fit:      form.brand_fit,
      is_active:      true,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  }

  const S = { background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "9px 12px", color: "var(--t1)", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <form onSubmit={save} style={{ background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 12, padding: "22px 24px", marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 14 }}>Add Creator</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <input placeholder="Creator name *" {...inp("name")} />
        <input placeholder="Handle (e.g. @handle)" {...inp("handle")} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <select {...inp("niche")} style={S}>
          <option value="">Niche *</option>
          {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select {...inp("platform")} style={S}>
          <option value="">Platform *</option>
          {CREATOR_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input placeholder="Follower count" {...inp("follower_count")} />
      </div>
      <textarea placeholder="Voice / tone of voice" {...inp("voice")} rows={2} style={{ ...S, resize: "vertical", marginBottom: 10 }} />
      <textarea placeholder="Content pillars (comma separated)" {...inp("pillars")} rows={2} style={{ ...S, resize: "vertical", marginBottom: 10 }} />
      <textarea placeholder="Brand fit / ideal partners" {...inp("brand_fit")} rows={2} style={{ ...S, resize: "vertical", marginBottom: 12 }} />
      {err && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={busy} style={{ background: "var(--gold)", color: "#000", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? .5 : 1 }}>
          {busy ? "Saving…" : "Save Creator"}
        </button>
        <button type="button" onClick={onCancel} style={{ background: "var(--e2)", color: "var(--t2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ClientRow({ client, onToggle, onTierChange }) {
  const [expanded, setExpanded]     = useState(false);
  const [creators, setCreators]     = useState([]);
  const [loadingC, setLoadingC]     = useState(false);
  const [addingCreator, setAdding]  = useState(false);
  const [tier, setTier]             = useState(client.tier || "foundation");
  const [savingTier, setSavingTier] = useState(false);

  async function changeTier(newTier) {
    setSavingTier(true);
    await supabase.from("profiles").update({ tier: newTier }).eq("id", client.id);
    setTier(newTier);
    setSavingTier(false);
    onTierChange && onTierChange(client.id, newTier);
  }

  async function loadCreators() {
    setLoadingC(true);
    const { data } = await supabase.from("creators").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
    setCreators(data || []);
    setLoadingC(false);
  }

  function toggle() {
    if (!expanded) loadCreators();
    setExpanded(e => !e);
    setAdding(false);
  }

  async function toggleCreator(creator) {
    await supabase.from("creators").update({ is_active: !creator.is_active }).eq("id", creator.id);
    loadCreators();
  }

  async function deleteCreator(creator) {
    if (!window.confirm(`Remove ${creator.name}?`)) return;
    await supabase.from("creators").delete().eq("id", creator.id);
    loadCreators();
  }

  return (
    <div style={{ background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 12, overflow: "hidden" }}>
      {/* Client header row */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: client.role === "admin" ? "rgba(245,166,35,.15)" : "var(--e2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: client.role === "admin" ? "var(--gold)" : "var(--t2)",
        }}>
          {(client.agency_name || client.email || "?")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>{client.agency_name || "—"}</div>
          <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 1 }}>{client.email}</div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: client.role === "admin" ? "var(--gold)" : "var(--t4)", marginRight: 6 }}>
          {client.role}
        </div>
        {client.role !== "admin" && (
          <select
            value={tier}
            disabled={savingTier}
            onChange={e => changeTier(e.target.value)}
            style={{
              fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px",
              border: "1px solid var(--b1)", background: "var(--e2)", color:
                tier === "enterprise" ? "#a78bfa" :
                tier === "growth"     ? "#34d399" : "var(--gold)",
              cursor: "pointer", marginRight: 8, appearance: "none",
            }}>
            <option value="foundation">Foundation</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select>
        )}
        <div style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600, background: client.is_active ? "rgba(52,211,153,.12)" : "rgba(239,68,68,.12)", color: client.is_active ? "var(--green)" : "var(--red)", marginRight: 8 }}>
          {client.is_active ? "Active" : "Disabled"}
        </div>
        {client.role !== "admin" && (
          <>
            <button onClick={() => onToggle(client)} style={{ background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "var(--t2)", cursor: "pointer", marginRight: 6 }}>
              {client.is_active ? "Disable" : "Enable"}
            </button>
            <button onClick={toggle} style={{ background: expanded ? "var(--e3)" : "var(--e2)", border: "1px solid var(--b1)", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "var(--t2)", cursor: "pointer" }}>
              {expanded ? "▲ Creators" : "▼ Creators"}
            </button>
          </>
        )}
      </div>

      {/* Expanded creator section */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--b1)", padding: "16px 20px", background: "var(--e0)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Creator Roster</div>
            <button onClick={() => setAdding(a => !a)} style={{ background: addingCreator ? "var(--e2)" : "var(--gold)", color: addingCreator ? "var(--t2)" : "#000", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {addingCreator ? "Cancel" : "+ Add Creator"}
            </button>
          </div>

          {addingCreator && (
            <CreatorForm clientId={client.id} onSaved={() => { setAdding(false); loadCreators(); }} onCancel={() => setAdding(false)} />
          )}

          {loadingC ? (
            <div style={{ color: "var(--t3)", fontSize: 13, padding: "8px 0" }}>Loading…</div>
          ) : creators.length === 0 && !addingCreator ? (
            <div style={{ color: "var(--t3)", fontSize: 13, padding: "8px 0" }}>No creators yet. Click + Add Creator to get started.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: addingCreator ? 12 : 0 }}>
              {creators.map(cr => (
                <div key={cr.id} style={{ background: "var(--e1)", borderRadius: 9, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--b1)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{cr.name} {cr.handle && <span style={{ fontWeight: 400, color: "var(--t3)" }}>{cr.handle}</span>}</div>
                    <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>{cr.niche} · {cr.platform}{cr.follower_count ? ` · ${Number(cr.follower_count).toLocaleString()} followers` : ""}</div>
                  </div>
                  <div style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: cr.is_active ? "rgba(52,211,153,.12)" : "rgba(239,68,68,.1)", color: cr.is_active ? "var(--green)" : "var(--red)" }}>
                    {cr.is_active ? "Active" : "Paused"}
                  </div>
                  <button onClick={() => toggleCreator(cr)} style={{ background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "var(--t2)", cursor: "pointer" }}>
                    {cr.is_active ? "Pause" : "Activate"}
                  </button>
                  <button onClick={() => deleteCreator(cr)} style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "var(--red)", cursor: "pointer" }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LEAD TRACKER ─────────────────────────────────────────────────────────────
const LEAD_STAGES  = ["New", "Contacted", "Call Booked", "Demo Done", "Proposal Sent", "Negotiating", "Won", "Lost"];
const LEAD_STAGE_COLORS = {
  "New":             "#818CF8",
  "Contacted":       "#60A5FA",
  "Call Booked":     "#FBBF24",
  "Demo Done":       "#FB923C",
  "Proposal Sent":   "#A78BFA",
  "Negotiating":     "#34D399",
  "Won":             "#10B981",
  "Lost":            "#71717a",
};
const BLANK_LEAD = { agency_name: "", contact_name: "", email: "", linkedin: "", stage: "New", notes: "", plan: "Starter" };

function LeadTracker() {
  const [leads, setLeads]       = useState(() => {
    try { return JSON.parse(localStorage.getItem("caig_leads") || "[]"); } catch { return []; }
  });
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState(BLANK_LEAD);
  const [filter, setFilter]     = useState("All");
  const [expanded, setExpanded] = useState(null);

  function save(updated) {
    setLeads(updated);
    localStorage.setItem("caig_leads", JSON.stringify(updated));
  }

  function addLead(e) {
    e.preventDefault();
    if (!form.agency_name) return;
    const lead = { ...form, id: `${Date.now()}`, created_at: new Date().toISOString() };
    save([lead, ...leads]);
    setForm(BLANK_LEAD);
    setAdding(false);
  }

  function updateStage(id, stage) {
    save(leads.map(l => l.id === id ? { ...l, stage } : l));
  }

  function updateNotes(id, notes) {
    save(leads.map(l => l.id === id ? { ...l, notes } : l));
  }

  function deleteLead(id) {
    save(leads.filter(l => l.id !== id));
    if (expanded === id) setExpanded(null);
  }

  const filtered = filter === "All" ? leads : leads.filter(l => l.stage === filter);

  const wonValue = leads.filter(l => l.stage === "Won").length * 2000;
  const pipeline = leads.filter(l => !["Won","Lost"].includes(l.stage)).length;

  const inp = (field) => ({
    value: form[field],
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    style: { background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "9px 12px", color: "var(--t1)", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  });

  const card = { background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 12, padding: "20px 24px", marginBottom: 16 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t0)", letterSpacing: "-.02em" }}>Lead Tracker</div>
          <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 3 }}>Track prospects from first contact to signed client</div>
        </div>
        <button onClick={() => { setAdding(a => !a); setForm(BLANK_LEAD); }} style={{ background: adding ? "var(--e2)" : "var(--gold)", color: adding ? "var(--t2)" : "#000", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {adding ? "Cancel" : "+ Add Lead"}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Total Leads",  v: leads.length,                                           c: "var(--t0)" },
          { l: "In Pipeline",  v: pipeline,                                               c: "var(--c-proposals)" },
          { l: "Won",          v: leads.filter(l => l.stage === "Won").length,            c: "var(--green)" },
          { l: "Lost",         v: leads.filter(l => l.stage === "Lost").length,           c: "var(--t3)" },
          { l: "Won MRR",      v: `£${wonValue.toLocaleString()}/mo`,                     c: "var(--gold)" },
        ].map(s => (
          <div key={s.l} style={{ background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={addLead} style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 14 }}>New Lead</div>
          <div className="lt-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input placeholder="Agency name *" {...inp("agency_name")} />
            <input placeholder="Contact name" {...inp("contact_name")} />
            <input placeholder="Email" type="email" {...inp("email")} />
            <input placeholder="LinkedIn URL" {...inp("linkedin")} />
          </div>
          <div className="lt-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <select {...inp("stage")} style={{ ...inp("stage").style }}>
              {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select {...inp("plan")} style={{ ...inp("plan").style }}>
              {["Starter", "Growth", "Agency"].map(p => <option key={p} value={p}>{p} — £{p === "Starter" ? "3,000" : p === "Growth" ? "5,000" : "8,500"}/mo</option>)}
            </select>
          </div>
          <textarea placeholder="Notes / next action" {...inp("notes")} style={{ ...inp("notes").style, minHeight: 70, resize: "vertical", marginBottom: 10 }} />
          <button type="submit" style={{ background: "var(--gold)", color: "#000", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save Lead</button>
        </form>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {["All", ...LEAD_STAGES].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "var(--gold)" : "var(--e2)", color: filter === f ? "#000" : "var(--t3)", border: "1px solid var(--b1)", borderRadius: 7, padding: "5px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {f}{f !== "All" ? ` (${leads.filter(l => l.stage === f).length})` : ` (${leads.length})`}
          </button>
        ))}
      </div>

      {/* Lead list */}
      {filtered.length === 0 ? (
        <div style={{ color: "var(--t3)", fontSize: 13, padding: "24px 0" }}>
          {leads.length === 0 ? "No leads yet — add your first prospect above." : "No leads in this stage."}
        </div>
      ) : (
        filtered.map(lead => (
          <div key={lead.id} style={{ background: "var(--e1)", border: `1px solid ${expanded === lead.id ? "var(--gold)" : "var(--b1)"}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }} onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}>
              <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: LEAD_STAGE_COLORS[lead.stage] || "#888", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t0)" }}>{lead.agency_name}
                  {lead.contact_name && <span style={{ fontWeight: 400, color: "var(--t3)", marginLeft: 8 }}>{lead.contact_name}</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>
                  {lead.plan} plan · £{lead.plan === "Starter" ? "3,000" : lead.plan === "Growth" ? "5,000" : "8,500"}/mo
                  {lead.email && <span style={{ marginLeft: 10 }}>{lead.email}</span>}
                </div>
              </div>
              <select
                value={lead.stage}
                onClick={e => e.stopPropagation()}
                onChange={e => updateStage(lead.id, e.target.value)}
                style={{ background: `${LEAD_STAGE_COLORS[lead.stage]}22`, border: `1px solid ${LEAD_STAGE_COLORS[lead.stage]}55`, borderRadius: 7, padding: "5px 10px", color: LEAD_STAGE_COLORS[lead.stage], fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}
              >
                {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {expanded === lead.id && (
              <div style={{ padding: "0 18px 16px 18px", borderTop: "1px solid var(--b1)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em", margin: "14px 0 8px" }}>Notes / Next Action</div>
                <textarea
                  value={lead.notes}
                  onChange={e => updateNotes(lead.id, e.target.value)}
                  placeholder="Add notes or next action..."
                  style={{ background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "10px 12px", color: "var(--t1)", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 80, resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
                  {lead.linkedin && <a href={lead.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>LinkedIn →</a>}
                  {lead.email && <a href={`mailto:${lead.email}`} style={{ fontSize: 12, color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>Email →</a>}
                  <div style={{ marginLeft: "auto" }}>
                    <button onClick={() => deleteLead(lead.id)} style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 6, padding: "5px 12px", fontSize: 11, color: "var(--red)", cursor: "pointer" }}>Remove</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ─── WEEKLY REPORTS ───────────────────────────────────────────────────────────
function WeeklyReports() {
  const [clients, setClients]   = useState([]);
  const [selected, setSelected] = useState(null); // profile id
  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [building, setBuilding] = useState(false);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, agency_name, email")
        .eq("role", "client")
        .eq("is_active", true)
        .order("agency_name");
      setClients(data || []);
      setLoading(false);
    })();
  }, []);

  async function buildReport(clientId) {
    setBuilding(true);
    setReport(null);
    setCopied(false);
    const client = clients.find(c => c.id === clientId);

    const [{ data: creators }, { data: deals }] = await Promise.all([
      supabase.from("creators").select("*").eq("client_id", clientId).eq("is_active", true),
      supabase.from("deals").select("*, creators(name)").eq("client_id", clientId).order("created_at", { ascending: false }),
    ]);

    const cr = creators || [];
    const dl = deals || [];

    const confirmedValue = dl
      .filter(d => d.stage === "Confirmed" || d.stage === "Live")
      .reduce((s, d) => s + (d.deal_value || 0), 0);

    const pipelineValue = dl
      .filter(d => !["Rejected", "Closed"].includes(d.stage))
      .reduce((s, d) => s + (d.deal_value || 0), 0);

    const stageGroups = {};
    dl.forEach(d => {
      if (!stageGroups[d.stage]) stageGroups[d.stage] = [];
      stageGroups[d.stage].push(d);
    });

    const weekStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const lines = [
      `WEEKLY REPORT — ${(client?.agency_name || "Client").toUpperCase()}`,
      `Week ending ${weekStr}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `CREATOR ROSTER (${cr.length} active)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ...cr.map(c =>
        `• ${c.name} (${c.handle || "—"}) · ${c.niche || "—"} · ${c.platform || "—"}${c.follower_count ? ` · ${Number(c.follower_count).toLocaleString()} followers` : ""}`
      ),
      cr.length === 0 ? "  No active creators on roster." : "",
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `BRAND DEAL PIPELINE`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Pipeline total:  £${pipelineValue.toLocaleString()}`,
      `Confirmed / Live: £${confirmedValue.toLocaleString()}`,
      ``,
      ...Object.entries(stageGroups).map(([stage, ds]) =>
        [`  ${stage.toUpperCase()} (${ds.length})`,
          ...ds.map(d => `    - ${d.brand_name}${d.creators?.name ? ` × ${d.creators.name}` : ""}${d.deal_value ? ` · £${Number(d.deal_value).toLocaleString()}` : ""}${d.notes ? `  "${d.notes}"` : ""}`)
        ].join("\n")
      ),
      dl.length === 0 ? "  No deals in pipeline." : "",
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `NOTES`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `[Add your weekly notes here before sending]`,
      ``,
      `— Cornerstone AI Group`,
      `   hello@cornerstoneaigroup.com`,
    ];

    setReport({ text: lines.join("\n"), client, cr, dl, confirmedValue, pipelineValue });
    setBuilding(false);
  }

  function copyReport() {
    if (!report) return;
    navigator.clipboard.writeText(report.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const cardStyle = { background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 12, padding: "20px 24px", marginBottom: 16 };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 60px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t0)", letterSpacing: "-.02em" }}>Weekly Reports</div>
        <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 3 }}>Generate a per-client weekly summary — copy and send via email</div>
      </div>

      {loading ? (
        <div style={{ color: "var(--t3)", fontSize: 13 }}>Loading clients…</div>
      ) : clients.length === 0 ? (
        <div style={{ color: "var(--t3)", fontSize: 13 }}>No active clients found.</div>
      ) : (
        <>
          {/* Client selector */}
          <div style={cardStyle}>
            <div style={labelStyle}>Select Client</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {clients.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelected(c.id); buildReport(c.id); }}
                  style={{
                    background: selected === c.id ? "var(--gold)" : "var(--e2)",
                    color: selected === c.id ? "#000" : "var(--t1)",
                    border: "1px solid var(--b1)",
                    borderRadius: 8, padding: "8px 16px",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {c.agency_name}
                </button>
              ))}
            </div>
          </div>

          {building && (
            <div style={{ color: "var(--t3)", fontSize: 13, padding: "12px 0" }}>Building report…</div>
          )}

          {report && (
            <>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                {[
                  { l: "Active Creators", v: report.cr.length, c: "var(--t0)" },
                  { l: "Total Deals", v: report.dl.length, c: "var(--gold)" },
                  { l: "Pipeline Value", v: `£${report.pipelineValue.toLocaleString()}`, c: "var(--c-proposals)" },
                  { l: "Confirmed / Live", v: `£${report.confirmedValue.toLocaleString()}`, c: "var(--green)" },
                ].map(s => (
                  <div key={s.l} style={{ background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 10, padding: "14px 18px" }}>
                    <div style={{ fontSize: 11, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{s.l}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Report text */}
              <div style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={labelStyle}>Report — {report.client?.agency_name}</div>
                  <button
                    onClick={copyReport}
                    style={{ background: copied ? "var(--green)" : "var(--gold)", color: "#000", border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    {copied ? "Copied!" : "Copy Report"}
                  </button>
                </div>
                <pre style={{
                  fontFamily: "monospace", fontSize: 12, color: "var(--t2)",
                  background: "var(--e2)", borderRadius: 8, padding: "16px 18px",
                  whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
                  lineHeight: 1.7, maxHeight: 520, overflowY: "auto",
                }}>
                  {report.text}
                </pre>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function AdminPanel() {
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState({ email: "", agency_name: "", password: "" });
  const [formErr, setFormErr]   = useState("");
  const [formOk, setFormOk]     = useState("");
  const [busy, setBusy]         = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setClients(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(client) {
    await supabase.from("profiles").update({ is_active: !client.is_active }).eq("id", client.id);
    load();
  }

  async function createClient(e) {
    e.preventDefault();
    if (!form.email || !form.agency_name || !form.password) { setFormErr("All fields required."); return; }
    setBusy(true); setFormErr(""); setFormOk("");
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { emailRedirectTo: null }
    });
    if (error) { setFormErr(error.message); setBusy(false); return; }
    await supabase.from("profiles").update({
      agency_name: form.agency_name,
      role: "client",
      is_active: true,
    }).eq("id", data.user.id);
    setFormOk("Client account created successfully.");
    setForm({ email: "", agency_name: "", password: "" });
    setBusy(false);
    setCreating(false);
    load();
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t0)", letterSpacing: "-.02em" }}>Client Accounts</div>
          <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 3 }}>Manage clients, creators and access</div>
        </div>
        <button
          onClick={() => { setCreating(c => !c); setFormErr(""); setFormOk(""); }}
          style={{ background: creating ? "var(--e2)" : "var(--gold)", color: creating ? "var(--t2)" : "#000", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {creating ? "Cancel" : "+ New Client"}
        </button>
      </div>

      {creating && (
        <form onSubmit={createClient} style={{ background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 12, padding: "24px 28px", marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 16 }}>Create New Client Account</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <input placeholder="Agency name" value={form.agency_name} onChange={e => setForm(f => ({ ...f, agency_name: e.target.value }))} style={{ background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "9px 12px", color: "var(--t1)", fontSize: 13, outline: "none" }} />
            <input placeholder="Email address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "9px 12px", color: "var(--t1)", fontSize: 13, outline: "none" }} />
          </div>
          <input placeholder="Temporary password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "9px 12px", color: "var(--t1)", fontSize: 13, outline: "none", marginBottom: 12 }} />
          {formErr && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 10 }}>{formErr}</div>}
          {formOk  && <div style={{ color: "var(--green)", fontSize: 12, marginBottom: 10 }}>{formOk}</div>}
          <button type="submit" disabled={busy} style={{ background: "var(--gold)", color: "#000", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? .5 : 1 }}>
            {busy ? "Creating…" : "Create Account"}
          </button>
        </form>
      )}

      {formOk && !creating && (
        <div style={{ background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.25)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--green)", marginBottom: 20 }}>{formOk}</div>
      )}

      {loading ? (
        <div style={{ color: "var(--t3)", fontSize: 13, padding: 20 }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {clients.map(c => (
            <ClientRow key={c.id} client={c} onToggle={toggleActive} onTierChange={() => {}} />
          ))}
          {clients.length === 0 && <div style={{ color: "var(--t3)", fontSize: 13, padding: 20 }}>No accounts yet.</div>}
        </div>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
// ─── MODULE ACCENT COLOURS ────────────────────────────────────────────────────
const MODULE_COLORS = {
  content:    "var(--c-content)",
  autopilot:  "var(--c-content)",
  proposals:  "var(--c-proposals)",
  outreach:   "var(--c-outreach)",
  onboarding: "var(--c-onboarding)",
};

export default function App() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const [session, setSession]       = useState(null);
  const [profile, setProfile]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView]             = useState("home");
  const [queue, setQueue]           = useState(() => stor.get("caig_queue", []));
  const [toast, setToast]           = useState(null);
  const [dbCreators, setDbCreators] = useState([]);
  const [dbStats, setDbStats]       = useState({ clients: 0, creators: 0, deals: 0 });

  async function loadNetworkData() {
    const [{ data: cr }, { data: cl }, { data: de }] = await Promise.all([
      supabase.from("creators").select("id, name, handle, niche, platform, voice, pillars, brand_fit, follower_count, is_active, client_id").eq("is_active", true),
      supabase.from("profiles").select("id").eq("role", "client").eq("is_active", true),
      supabase.from("deals").select("id"),
    ]);
    setDbCreators(cr || []);
    setDbStats({ clients: (cl || []).length, creators: (cr || []).length, deals: (de || []).length });
  }

  // Restore session on load
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", s.user.id)
          .single();
        if (p && p.is_active) {
          setSession(s.user);
          setProfile(p);
          loadNetworkData();
        } else {
          await supabase.auth.signOut();
        }
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) { setSession(null); setProfile(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => stor.set("caig_queue", queue), [queue]);

  const toast_ = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const ready  = queue.filter((i) => i.status === "ready").length;
  const sched  = queue.filter((i) => i.status === "scheduled").length;
  const posted = queue.filter((i) => i.status === "posted").length;

  const TODAY_LABEL = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });

  const TB = {
    home:       { t: "Dashboard",       s: TODAY_LABEL },
    autopilot:  { t: "Content Engine",   s: "Generate on-brand content across any channel or format" },
    queue:      { t: "Publish Queue",    s: `${queue.length} item${queue.length !== 1 ? "s" : ""} ready to publish` },
    calendar:   { t: "Calendar",         s: "Full content schedule" },
    settings:   { t: "Settings",         s: "Account" },
  };

  if (authLoading) return (
    <div style={{ position: "fixed", inset: 0, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--t3)", fontSize: 13 }}>Loading…</div>
    </div>
  );

  if (!session) return <LoginGate onAuth={(user, p) => { setSession(user); setProfile(p); }} />;

  // Client portal — non-admin users see a different, restricted view
  if (!profile) return (
    <div style={{ position: "fixed", inset: 0, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--t3)", fontSize: 13 }}>Loading…</div>
    </div>
  );
  if (profile.role !== "admin") return <ClientPortal profile={profile} onSignOut={signOut} />;

  const IcContent = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 21V9"/>
    </svg>
  );
  const IcProposals = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  );
  const IcOutreach = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.72 16l.2.92z"/>
    </svg>
  );
  const IcOnboarding = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );

  return (
    <div className="app">

      {/* ── TOP NAV ──────────────────────────────────────────────────────────── */}
      <div className="topbar">
        {/* Brand */}
        <div className="tb-brand" style={{ cursor: "pointer" }} onClick={() => setView("home")}>
          <Logo height={36} />
        </div>

        {/* Nav links */}
        <div className="tb-nav">
          <button className={`tni${view === "home" ? " on" : ""}`} onClick={() => setView("home")}>
            {Ic.home} Home
          </button>
          <button className={`tni${view === "autopilot" ? " on" : ""}`} onClick={() => setView("autopilot")}>
            {IcContent} Content Hub
          </button>

          {profile?.role === "admin" && (
            <button className={`tni${view === "admin" ? " on" : ""}`} onClick={() => setView("admin")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Clients
            </button>
          )}
          {profile?.role === "admin" && (
            <button className={`tni${view === "deals" ? " on" : ""}`} onClick={() => setView("deals")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              Deals
            </button>
          )}
          {profile?.role === "admin" && (
            <button className={`tni${view === "reports" ? " on" : ""}`} onClick={() => setView("reports")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              Reports
            </button>
          )}
          {profile?.role === "admin" && (
            <button className={`tni${view === "leads" ? " on" : ""}`} onClick={() => setView("leads")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Leads
            </button>
          )}
          <button className={`tni${view === "queue" ? " on" : ""}`} onClick={() => setView("queue")}>
            {Ic.list} Queue {ready > 0 && <span className="nb">{ready}</span>}
          </button>
          <button className={`tni${view === "calendar" ? " on" : ""}`} onClick={() => setView("calendar")}>
            {Ic.cal} Calendar
          </button>
          <button className={`tni${view === "settings" ? " on" : ""}`} onClick={() => setView("settings")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </button>
        </div>

        {/* Right side */}
        <div className="tb-r">
          {profile && (
            <div style={{ fontSize: 11.5, color: "var(--t3)", marginRight: 8, textAlign: "right", lineHeight: 1.4 }}>
              <div style={{ color: "var(--t1)", fontWeight: 600 }}>{profile.agency_name || profile.email}</div>
              <div style={{ textTransform: "uppercase", letterSpacing: ".06em", fontSize: 10, color: profile.role === "admin" ? "var(--gold)" : "var(--t4)" }}>
                {profile.role === "admin" ? "Admin" : "Client"}
              </div>
            </div>
          )}
          {queue.length > 0 && (
            <div className="tb-counts">
              {[
                { l: "Ready",     v: ready,  c: "var(--c-proposals)" },
                { l: "Scheduled", v: sched,  c: "var(--gold)" },
                { l: "Posted",    v: posted, c: "var(--green)" },
              ].filter(s => s.v > 0).map(s => (
                <div key={s.l} className="tb-count-item">
                  <div className="tb-count-val" style={{ color: s.c }}>{s.v}</div>
                  <div className="tb-count-lbl">{s.l}</div>
                </div>
              ))}
            </div>
          )}
          <button
            className="tb-signout"
          onClick={signOut}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────────── */}
      <div className="main">
        <div className="view">
          {view === "home"       && <Home queue={queue} setView={setView} dbStats={dbStats} dbCreators={dbCreators} />}
          {/* Autopilot stays mounted to preserve generation state across navigation */}
          <div style={{ display: view === "autopilot" ? "contents" : "none" }}>
            {canAccess(profile?.tier, "autopilot", profile?.role)
              ? <Autopilot queue={queue} setQueue={setQueue} setView={setView} toast_={toast_} dbCreators={dbCreators} onDeleteCreator={id => setDbCreators(prev => prev.filter(c => c.id !== id))} />
              : <LockedModule moduleName="Content Engine" currentTier={profile?.tier} />}
          </div>
          {view === "proposals"  && (canAccess(profile?.tier, "proposals",  profile?.role) ? <Proposals />  : <LockedModule moduleName="Proposal Builder"   currentTier={profile?.tier} />)}
          {view === "outreach"   && (canAccess(profile?.tier, "outreach",   profile?.role) ? <Outreach />   : <LockedModule moduleName="Business Health Check" currentTier={profile?.tier} />)}
          {view === "onboarding" && (canAccess(profile?.tier, "onboarding", profile?.role) ? <Onboarding /> : <LockedModule moduleName="Automate Ops"        currentTier={profile?.tier} />)}
          {view === "queue"      && <Queue queue={queue} setQueue={setQueue} toast_={toast_} />}
          {view === "calendar"   && <CalView queue={queue} />}
          {view === "settings"   && <Settings queue={queue} setQueue={setQueue} toast_={toast_} />}
          {view === "admin"      && profile?.role === "admin" && <AdminPanel />}
          {view === "deals"      && profile?.role === "admin" && <DealPipeline />}
          {view === "reports"    && profile?.role === "admin" && <WeeklyReports />}
          {view === "leads"      && profile?.role === "admin" && <LeadTracker />}
        </div>
      </div>

      {/* ── BOTTOM NAV (mobile) ─────────────────────────────────────────────── */}
      <nav className="bnav">
        {[
          { id: "home",       label: "Home",     ic: Ic.home   },
          { id: "autopilot",  label: "Content",  ic: IcContent },
          { id: "queue",      label: "Queue",    ic: Ic.list, badge: ready > 0 ? ready : null },
          { id: "calendar",   label: "Calendar", ic: Ic.cal    },
          { id: "settings",   label: "Settings", ic: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          )},
        ].map(n => (
          <button key={n.id} className={`bni${view === n.id ? " on" : ""}`} onClick={() => setView(n.id)}>
            <span style={{ position: "relative", display: "inline-flex" }}>
              {n.ic}
              {n.badge && <span className="bnav-badge">{n.badge}</span>}
            </span>
            {n.label}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="toast">
          <div className="tdot" style={{ background: toast.includes("fail") || toast.includes("error") ? "var(--red)" : "var(--green)" }} />
          {toast}
        </div>
      )}
    </div>
  );
}
