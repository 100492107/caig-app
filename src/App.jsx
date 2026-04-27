import { useState, useEffect, useCallback, useRef, memo } from "react";
import { supabase } from "./supabase";


// ─── CONFIGURATION ────────────────────────────────────────────────────────────
// API key is stored server-side only (Netlify function). Never exposed to the browser.

// ─── DATA ─────────────────────────────────────────────────────────────────────
const PERSONAS = [
  {
    id: "cara", name: "Cara & Lila", handle: "@caraandlila", niche: "Travel", color: "#34D399",
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
  {
    id: "maya", name: "Maya Chen", handle: "@maya.trains", niche: "Fitness", color: "#FB923C",
    char: "24, Singapore. Strength training, realistic nutrition. Hates fitness perfectionism. Shows real progress timelines.",
    voice: 'Dry, direct. "I trained for 90 days. Here\'s what actually changed — and what didn\'t."',
    pillars: [
      "What I actually ate this week — full breakdown, no filters",
      "Training recap with real numbers — sets, weights, how it felt",
      "Form deep-dive — the mistake most people make on this lift",
      "Supplement myths debunked — what the research actually says",
      "The thing nobody tells you about the gym in month one",
      "90-day progress — honest photos, honest numbers",
      "Why I stopped doing this popular workout and what replaced it",
      "What I eat on rest days vs training days — the actual difference",
      "The cheap gym vs the expensive gym — is it worth paying more?",
      "The biggest nutrition lie fitness influencers keep repeating",
      "How I hit my protein without eating chicken 5 times a day",
      "The training block that finally worked for me — and why",
      "What a realistic body recomposition timeline actually looks like",
      "The gym anxiety nobody talks about — what helped me",
      "Debunking the 'women shouldn't lift heavy' myth with actual data",
      "What I wish I knew in my first year of strength training",
      "The one mobility drill that fixed my [squat/deadlift/bench]",
      "Why my results stalled — and what I changed",
      "The actual cost of getting fit — gear, gym, food, per month",
      "Training while tired, stressed, or on your period — real talk",
    ],
    products: ["Workout programmes £15-25", "12-week guide £47", "Telegram community"],
    b2b: "Gym chains, PT studios, supplement brands, activewear",
    statusKey: "month2",
  },
  {
    id: "ellie", name: "Ellie Harper", handle: "@ellie.mumlife", niche: "Parenting", color: "#F472B6",
    char: "28, Manchester. First-time mum. Honest, unfiltered new motherhood — the chaos, cost, and joy they don't show on Instagram.",
    voice: "Raw, warm, exhausted-funny. The truth behind the curated mum aesthetic.",
    pillars: [
      "Real baby cost breakdown — month by month actual spend",
      "Mental health honest check-in — the days nobody talks about",
      "Product review — worth it or complete waste of money",
      "What nobody told me about this specific month of motherhood",
      "Relationship after baby — the honest, uncomfortable version",
      "The mum guilt nobody admits they feel — and how I dealt with it",
      "What I actually use vs what I was told I'd need",
      "Sleep deprivation is breaking me — real talk, no toxic positivity",
      "The cost of childcare nobody prepares you for",
      "What going back to work after maternity leave actually feels like",
      "The baby product that was actually worth every penny",
      "Why I stopped following the parenting advice everyone gave me",
      "Fed is best — my breastfeeding/formula journey, no judgement",
      "The unsolicited advice I got and what I actually wanted to hear",
      "Baby milestones — when comparison becomes dangerous",
      "What I actually look like 6 months postpartum — real photos",
      "How we split childcare as a couple — what works, what doesn't",
      "The village they say you need — and what to do when you don't have one",
      "Screen time guilt — what I decided after reading the research",
      "The moment it clicked and I actually enjoyed being a mum",
    ],
    products: ["First Year Survival Guide £19", "Budget baby essentials £12", "Telegram community"],
    b2b: "Baby brands, parenting apps, family finance services",
    statusKey: "month2",
  },
  {
    id: "zara", name: "Zara Williams", handle: "@zara.sportsgirl", niche: "Football", color: "#60A5FA",
    char: "22, Liverpool. Female football fan — the perspective the sports world ignores. Sharp, knowledgeable, unfiltered.",
    voice: "Passionate, opinionated. Real football intelligence delivered through the female fan lens.",
    pillars: [
      "Match verdict — what actually happened tactically, not just the score",
      "Player breakdown — why this player is being slept on or overrated",
      "Stadium guide on a budget — what they don't tell you before you go",
      "The female football fan experience — what we put up with",
      "Hot take on the transfer — what I actually think and why",
      "The tactical shift nobody in the punditry is talking about",
      "Why this manager decision was right/wrong — and the stats prove it",
      "Being a female fan in a male space — the moments that stayed with me",
      "The women's game vs the men's game — honest comparison",
      "Away day on a budget — full cost breakdown",
      "The player who's about to become a household name — calling it now",
      "What VAR gets right and what it ruins — honest verdict",
      "The media narrative about this club that's completely wrong",
      "The ref decision that changed this match — tactical breakdown",
      "Growing up watching football — the moment I became a fan",
      "The kit drop — worth the money or daylight robbery?",
      "Football Twitter vs real fan opinion — why they're never the same",
      "The thing male pundits always miss when they analyse this team",
      "What I think about the club's ownership — no PR spin",
      "The rivalry they say is dead — and whether I agree",
    ],
    products: ["The Football Girl's Guide £12", "Stadium guides £9", "Telegram match content"],
    b2b: "Sports brands, stadium experiences, football media",
    statusKey: "month3",
  },
  {
    id: "nova", name: "Nova", handle: "@nova.plays", niche: "Gaming", color: "#A78BFA",
    char: "20, online. Gaming girl. Quick humour, strong opinions, very online. Makes gaming accessible without dumbing it down.",
    voice: "Punchy, internet-fluent. Female perspective that appeals broadly — funny to people who don't game.",
    pillars: [
      "Game verdict in plain English — no jargon, just is it good",
      "Getting into gaming — the honest guide for absolute beginners",
      "Budget setup deep-dive — what you actually need vs what they tell you",
      "Gaming culture observation — why this thing is weird and we all accept it",
      "Game rec for your exact mood — specific and actually useful",
      "The game everyone hated that I actually love — hot take",
      "The game everyone loves that I think is overrated — unpopular opinion",
      "How much I've spent on gaming this month — honest breakdown",
      "What it's actually like being a girl in online gaming spaces",
      "The gaming setup I wish I had vs the one I can actually afford",
      "This game broke me emotionally and I'm not okay — story time",
      "The gaming trend that needs to die — no apologies",
      "Indie game that deserves way more attention than it's getting",
      "The DLC debate — when it's worth it and when it's a scam",
      "Streaming vs buying — which is actually better value in 2025?",
      "The game that got me into gaming — my origin story",
      "What 100 hours in this game actually taught me",
      "Gaming with anxiety — what helps and what makes it worse",
      "The gaming community moment that restored my faith in people",
      "What I'd tell someone who thinks gaming is a waste of time",
    ],
    products: ["Gaming Setup Under £200 £12", "Beginner's guide £15", "Telegram community"],
    b2b: "Hardware brands, gaming cafes, streaming platforms",
    statusKey: "month3",
  },
  {
    id: "aria", name: "Aria Blanc", handle: "@aria.luxe", niche: "Luxury", color: "#FBBF24",
    char: "26, Monaco/Paris. Makes luxury accessible — the insider hacks, the points games, the 5-star experience at 2-star prices.",
    voice: 'Elevated, knowing, slightly conspiratorial. "Here\'s what they don\'t tell you about business class."',
    pillars: [
      "Hotel review — what it actually cost vs the rack rate",
      "Business class hack — how I got this seat for economy money",
      "Fine dining honest verdict — was it worth what it cost",
      "Luxury piece — buy or skip, and exactly why",
      "The luxury wardrobe move nobody in my circle talks about",
      "Points and miles — the specific move I made this month",
      "The 5-star hotel trick that works every single time",
      "Affordable luxury — the brand that delivers at a third of the price",
      "What I actually spend in a month — luxury on a non-billionaire budget",
      "The luxury destination that's secretly affordable right now",
      "Upgrading without paying — exactly how I do it",
      "The luxury item I regret buying and what I'd get instead",
      "Private members clubs — what they're actually like inside",
      "The hotel amenity nobody uses but absolutely should",
      "Luxury resale — what I've bought, what I've sold, what it cost",
      "The airport lounge hack that changed how I travel",
      "What a butler actually does — the reality of true luxury hospitality",
      "First class vs business class — what you're actually paying for",
      "The overrated luxury brand and what I use instead",
      "How to get the 5-star experience without the 5-star price tag",
    ],
    products: ["Luxury Hacks series £19-29", "Telegram insiders", "Affiliate partnerships"],
    b2b: "Luxury hotels, premium travel, financial services",
    statusKey: "month4",
  },
  {
    id: "sage", name: "Sage", handle: "@sage.money", niche: "Finance", color: "#4ADE80",
    char: "25, London. Financial education only — never personalised advice. Makes money simple, specific, non-judgmental.",
    voice: '"The money stuff nobody taught you." Every post = one specific, actionable thing. Always includes disclaimer.',
    pillars: [
      "One money move this week — specific, actionable, doable today",
      "Real budget breakdown — what I actually spent last month",
      "I did this with £X — here's exactly what happened",
      "ISA explained simply — no jargon, just what it is and why it matters",
      "Why we spend the way we do — the psychology behind money decisions",
      "The financial mistake I made and what it actually cost me",
      "Pension explained for people who find it boring — but need to understand it",
      "What a credit score actually is and what moves it",
      "The savings account you probably don't know exists — and the rate it pays",
      "Buying vs renting — the numbers, not the opinions",
      "How much emergency fund is actually enough — the honest answer",
      "The subscription audit — what I cancelled and how much I saved",
      "Side income reality — what the numbers actually look like",
      "Why 'just invest' advice is more complicated than it sounds",
      "The money conversation couples avoid — and what happens when they do",
      "What happens to your money if you do nothing — the real cost of inaction",
      "The financial product that sounds good but has a catch",
      "How inflation is actually affecting your savings — with real numbers",
      "The difference between good debt and bad debt — with examples",
      "What I'd do with £1,000 right now — educational only, not advice",
    ],
    products: ["Your First Investment Guide £19", "The Budget Reset £15", "Telegram community"],
    b2b: "Fintech, investment platforms, insurance, banks",
    statusKey: "month4",
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
  const res = await fetch("/.netlify/functions/claude", {
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

async function generatePost(persona, platformId, pillar, postIndex, signal, usedHooks = [], ideaSeed = "") {
  const platform = PLATFORMS.find((p) => p.id === platformId);
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
  const needsTrends = contentType.type !== "lifestyle" && contentType.type !== "personal_moment";
  let trends = "";
  if (needsTrends) {
    try {
      trends = await callLLM({
        system: `You are an expert social media trend analyst. Today is ${TODAY}. Your job is to find what is ACTUALLY being talked about right now — not generic evergreen topics. Be hyper-specific: name real events, real people, real controversies, real viral moments.`,
        user: `Research the ${persona.niche} niche on ${platform.name} specifically. What are 3-4 SPECIFIC things people are talking about, debating, or engaging with RIGHT NOW in ${TODAY.split(" ").pop()}?

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

  const system = `You are ${persona.name}, a ${persona.niche} content creator.
CHARACTER: ${persona.char}
VOICE: ${persona.voice}
PLATFORM CONTEXT: You are posting on ${platform.name}. ${platform.purpose}
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
${contentType.type === "lifestyle" || contentType.type === "personal_moment" ? `- This is a PERSONAL/LIFESTYLE post. The caption should be casual, short, and conversational — like texting a friend. NOT educational. NOT a breakdown. Just a moment from your life that happens to be in your niche. Think "felt cute" not "here's 5 tips."` : ""}
${contentType.type === "tag_friend" ? `- Write something that makes people tag a specific friend. The content should be so relatable that readers immediately think of someone.` : ""}
${contentType.type === "discussion" ? `- Ask a question or state an opinion that will split the comments. Be bold. The goal is debate, not agreement.` : ""}
${contentType.type === "deep_story" || contentType.type === "day_in_life" ? `- Tell a STORY with a beginning, middle, and end. The audience should feel like they went on a journey with you. Include specific moments, dialogue, emotions.` : ""}
- Use REAL specific examples: real place names, real prices, real product names, real stats.
- DO NOT repeat hooks, topics, or structures from any other post in this batch.
- The hook must be COMPLETELY different in structure from every forbidden hook listed above.

Return this exact JSON format:
{
  "hook": "First line — must stop the scroll. Under 12 words.${contentType.type === "lifestyle" || contentType.type === "personal_moment" ? " Can be casual/playful — doesn't need to be educational." : " Specific number or bold statement."}",
  "caption": "${contentType.type === "lifestyle" || contentType.type === "personal_moment" ? "Short, casual caption. 80-150 chars. Like something you'd text a friend. Personal, warm, real." : contentType.type === "deep_story" || contentType.type === "day_in_life" || contentType.type === "deep_dive" ? "Full narrative caption or video script outline. 300-500 chars. Story arc: setup, tension, resolution." : "Full caption ready to paste. 180-260 chars. In character voice. Feels personal and authentic."}",
  "hashtags": "12-15 hashtags as one string, mix of niche and broad",
  "photo_direction": "9:16 aspect ratio. ${contentType.direction}",
  "cta": "${contentType.type === "lifestyle" || contentType.type === "personal_moment" ? "Casual, low-key — a question or emoji reaction prompt, not a hard sell" : contentType.type === "tag_friend" ? "Tag someone who needs to see this" : "One specific, low-friction ask"}",
  "post_type": "${contentType.type}",
  "content_label": "${contentType.label}",
  "trend_hook": "${trends ? "one word describing the trend angle used, or null" : "null"}"
}`;

  const raw = await callLLM({ system, user, maxTokens: 4000, signal });

  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch (_e) {
    // Try to extract JSON from the response
  }
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch (_e) {
      // Fall through to error
    }
  }
  throw new Error("Could not parse post JSON");
}

// ─── SCHEDULE BUILDER ─────────────────────────────────────────────────────────
const POSTS_PER_PLATFORM = 12;

function buildSchedule(selectedPersonas, selectedPlatforms) {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow));
  monday.setHours(0, 0, 0, 0);

  const dayPostCounts = [2, 2, 2, 2, 2, 1, 1]; // Mon-Sun = 12 total
  const slots = [];

  selectedPersonas.forEach((p) => {
    selectedPlatforms.forEach((platId) => {
      const plat = PLATFORMS.find((x) => x.id === platId);
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
    "Photo Direction",
    "CTA",
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
        esc(item.photo_direction),
        esc(item.cta),
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
  const H = ["Date", "Time", "Platform", "Account", "Caption", "Hashtags", "Photo Direction", "CTA"];
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
        e(item.photo_direction),
        e(item.cta),
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
.topbar{height:var(--nav-h);padding:0 36px;border-bottom:1px solid var(--e1);background:rgba(3,3,10,.92);backdrop-filter:blur(56px) saturate(1.5);-webkit-backdrop-filter:blur(56px) saturate(1.5);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;position:sticky;top:0;z-index:50}
.topbar::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(245,166,35,.22) 30%,rgba(245,166,35,.22) 70%,transparent)}
.tb-brand{display:flex;align-items:center;gap:10px;text-decoration:none}
.tb-gem{width:30px;height:30px;border-radius:9px;background:linear-gradient(145deg,#f7b034,#c97a00);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 18px rgba(245,166,35,.28),0 2px 8px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.2)}
.tb-wordmark{font-size:13px;font-weight:700;color:var(--t0);letter-spacing:-.03em;line-height:1}
.tb-wordmark span{display:block;font-size:9px;color:var(--t4);font-weight:400;letter-spacing:.02em;margin-top:1px}
.tb-nav{display:flex;align-items:center;gap:2px}
.tni{display:flex;align-items:center;gap:7px;padding:7px 13px;border-radius:8px;border:none;background:transparent;color:var(--t3);font-size:12px;font-family:var(--sans);font-weight:500;cursor:pointer;transition:background .12s,color .12s;white-space:nowrap;position:relative}
.tni:hover{background:var(--e1);color:var(--t0)}
.tni.on{background:rgba(245,166,35,.09);color:var(--t0)}
.tni.on::after{content:'';position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);width:20px;height:2px;background:var(--amber);border-radius:2px 2px 0 0;box-shadow:0 0 10px rgba(245,166,35,.6)}
.tni svg{width:13px;height:13px;flex-shrink:0;opacity:.5;transition:opacity .12s}
.tni:hover svg,.tni.on svg{opacity:1}
.nb{font-size:9px;color:var(--amber);font-family:var(--mono);background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.18);padding:1px 6px;border-radius:4px;font-weight:600;letter-spacing:.02em}
.tb-r{display:flex;align-items:center;gap:10px}
.tb-counts{display:flex;align-items:center;gap:12px}
.tb-count-item{text-align:center}
.tb-count-val{font-size:13px;font-weight:800;line-height:1;font-family:var(--mono)}
.tb-count-lbl{font-size:8px;color:var(--t4);text-transform:uppercase;letter-spacing:.06em;margin-top:1px}
.tb-signout{display:flex;align-items:center;gap:6px;padding:7px 11px;border-radius:8px;border:1px solid var(--e1);background:transparent;color:var(--t3);font-size:11.5px;font-family:var(--sans);cursor:pointer;transition:all .12s}
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
.pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
.pcard{background:var(--s3);border:1.5px solid var(--e1);border-radius:var(--rl);padding:16px 12px 14px;cursor:pointer;transition:border-color .16s,transform .16s,box-shadow .16s,background .16s;text-align:center;position:relative;overflow:hidden}
.pcard::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--pc);opacity:0;transition:opacity .18s}
.pcard:hover{border-color:var(--e3);transform:translateY(-2px);box-shadow:var(--shadow-md)}
.pcard.on{border-color:rgba(var(--pc-r,245),var(--pc-g,166),var(--pc-b,35),.35);background:var(--s4)}
.pcard.on::before{opacity:1}
.pcard-check{position:absolute;top:9px;right:10px;width:15px;height:15px;border-radius:50%;background:var(--pc);display:none;align-items:center;justify-content:center}
.pcard.on .pcard-check{display:flex}
.pcard-em{font-size:9.5px;font-weight:700;color:var(--pc);letter-spacing:.09em;margin-bottom:9px;text-transform:uppercase}
.pcard-name{font-size:11.5px;font-weight:600;color:var(--t0);margin-bottom:2px;letter-spacing:-.01em}
.pcard-niche{font-size:10px;color:var(--t2);margin-bottom:7px}
.pcard-status{font-size:9px;padding:2px 7px;border-radius:20px;background:var(--s5);color:var(--t3);display:inline-block;font-weight:500;letter-spacing:.04em}
.pcard.on .pcard-status{background:var(--pc);color:#030206}

/* ── PLATFORM CARDS ── */
.platgrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px}
.platcard{background:var(--s3);border:1.5px solid var(--e1);border-radius:var(--rl);padding:24px 18px 20px;cursor:pointer;transition:border-color .16s,transform .16s,box-shadow .16s;text-align:center;position:relative}
.platcard:hover{border-color:var(--e3);transform:translateY(-2px);box-shadow:var(--shadow-md)}
.platcard.on{border-color:color-mix(in srgb,var(--plc) 40%,transparent);background:var(--s4)}
.platcard.on::after{content:'✓';position:absolute;top:12px;right:14px;font-size:11px;font-weight:700;color:var(--plc)}
.platcard-dot{width:12px;height:12px;border-radius:50%;margin:0 auto 10px;transition:box-shadow .18s}
.platcard.on .platcard-dot{box-shadow:0 0 14px var(--plc)}
.platcard-name{font-size:15px;font-weight:700;color:var(--t0);margin-bottom:4px;letter-spacing:-.03em}
.platcard-detail{font-size:11px;color:var(--t3)}
.platcard.on .platcard-detail{color:var(--plc)}

/* ── GENERATE PANEL ── */
.gen-summary{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rl);padding:16px 20px;margin-bottom:18px;display:flex;gap:0;overflow:hidden}
.gen-stat{flex:1;padding:0 20px;border-right:1px solid var(--e1)}
.gen-stat:first-child{padding-left:0}
.gen-stat:last-child{border:none}
.gen-stat-l{font-size:9px;font-weight:700;color:var(--t4);letter-spacing:.15em;text-transform:uppercase;margin-bottom:5px}
.gen-stat-v{font-size:13.5px;color:var(--t0);font-weight:500;line-height:1.4}
.gen-btn{width:100%;padding:24px;border-radius:var(--rxl);border:1.5px solid var(--e1);background:var(--s2);font-size:18px;font-weight:700;font-family:var(--sans);letter-spacing:-.04em;cursor:pointer;transition:all .22s cubic-bezier(.22,1,.36,1);display:flex;align-items:center;justify-content:center;gap:10px;color:var(--t3);position:relative;overflow:hidden}
.gen-btn::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% -30%,rgba(245,166,35,.14),transparent 65%);opacity:0;transition:opacity .28s}
.gen-btn.ready{border-color:rgba(245,166,35,.2);color:var(--t0)}
.gen-btn.ready::before{opacity:1}
.gen-btn.ready:hover{border-color:rgba(245,166,35,.38);transform:translateY(-2px);box-shadow:0 20px 56px rgba(245,166,35,.14),0 0 0 1px rgba(245,166,35,.12) inset}
.gen-btn.ready{animation:amber-pulse 3.5s ease-in-out infinite}
.gen-btn.ready:hover{animation:none}
.gen-btn.ready:active{transform:scale(.99);animation:none}
.gen-btn:disabled{opacity:.18;cursor:not-allowed;transform:none !important;animation:none !important}
.gen-btn.running{border-color:rgba(45,212,160,.25);background:var(--s2);color:var(--green);animation:none}
.gen-btn.running::before{background:radial-gradient(ellipse at 50% -30%,rgba(45,212,160,.08),transparent 65%);opacity:1}
.gen-sub{font-size:11px;color:var(--t4);text-align:center;margin-top:9px;font-weight:300}
.spinner{width:17px;height:17px;border-radius:50%;border:2px solid rgba(45,212,160,.15);border-top-color:var(--green);animation:spin .72s linear infinite;flex-shrink:0}

/* ── PROGRESS ── */
.prog-wrap{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rl);padding:20px 22px;margin-top:14px;animation:fadeUp .22s ease}
.prog-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.prog-title{font-size:13px;font-weight:600;color:var(--t0);letter-spacing:-.02em}
.prog-pct{font-size:13px;font-weight:700;color:var(--green);font-family:var(--mono)}
.prog-bar-track{height:1.5px;background:var(--s6);border-radius:2px;margin-bottom:16px;overflow:hidden}
.prog-bar-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--blue),var(--green));transition:width .55s cubic-bezier(.22,1,.36,1)}
.prog-list{display:flex;flex-direction:column;max-height:250px;overflow-y:auto}
.prog-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--e1);font-size:12px;color:var(--t2)}
.prog-row:last-child{border:none}
.prog-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.prog-dot.done{background:var(--green)}
.prog-dot.running{background:var(--amber);animation:glow 1s ease-in-out infinite}
.prog-dot.pending{background:var(--s6)}
.prog-dot.error{background:var(--red)}

/* ── QUEUE ── */
.q-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
.q-filters{display:flex;gap:4px;flex-wrap:wrap}
.qf{padding:4.5px 12px;border-radius:20px;border:1px solid var(--e1);background:transparent;cursor:pointer;color:var(--t3);font-size:11px;font-family:var(--sans);font-weight:400;transition:all .11s;white-space:nowrap}
.qf:hover{color:var(--t0);border-color:var(--e3);background:var(--e1)}
.qf.on{background:var(--t0);color:var(--ink);border-color:var(--t0);font-weight:600}
.q-list{display:flex;flex-direction:column;gap:6px}
.qi{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rl);overflow:hidden;transition:border-color .13s,transform .13s,box-shadow .13s}
.qi:hover{border-color:var(--e2);transform:translateY(-1px);box-shadow:var(--shadow-md)}
.qi.exp .qi-hd{border-bottom:1px solid var(--e1)}
.qi-hd{display:flex;align-items:center;gap:10px;padding:13px 16px;cursor:pointer;user-select:none}
.qi-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.qi-info{flex:1;min-width:0}
.qi-name{font-size:12.5px;font-weight:600;color:var(--t0);letter-spacing:-.015em}
.qi-pillar{font-size:10px;color:var(--t3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:300}
.qi-plat{font-size:10px;padding:2px 7px;border-radius:5px;font-weight:600}
.qi-date{font-size:10px;color:var(--t4);font-family:var(--mono);flex-shrink:0}
.qi-type{font-size:8.5px;padding:2px 6px;border-radius:4px;background:var(--e1);color:var(--t4);font-weight:600;letter-spacing:.05em;text-transform:uppercase;flex-shrink:0}
.qi-st{font-size:9.5px;padding:2px 8px;border-radius:5px;font-weight:600;letter-spacing:.03em;flex-shrink:0}
.qi-body{padding:16px 18px;background:rgba(0,0,0,.22)}
.qfield{margin-bottom:12px}
.qfield:last-child{margin-bottom:0}
.qfl{font-size:8.5px;font-weight:700;color:var(--t4);letter-spacing:.16em;text-transform:uppercase;margin-bottom:5px;display:flex;align-items:center;justify-content:space-between}
.qfv{font-size:12.5px;color:var(--t1);line-height:1.75;background:var(--s3);border-radius:9px;padding:11px 13px;font-weight:300}
.qfv.accent{border-left:2px solid var(--qc,var(--amber));border-radius:0 9px 9px 0;font-size:13.5px;font-weight:600;color:var(--t0)}
.qfv.mono{font-family:var(--mono);font-size:11px;color:var(--t2)}
.qi-actions{display:flex;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--e1);flex-wrap:wrap}
.q-empty{text-align:center;padding:72px 20px;background:var(--s2);border-radius:var(--rl);border:1px solid var(--e1)}
.q-empty-icon{font-size:32px;margin-bottom:14px;opacity:.05;display:block}
.q-empty-t{font-size:17px;font-weight:700;color:var(--t0);letter-spacing:-.04em;margin-bottom:6px}
.q-empty-s{font-size:12.5px;color:var(--t3);font-weight:300;line-height:1.8}

/* ── CALENDAR ── */
.cal-wrap{display:flex;flex-direction:column;gap:0;height:100%;max-width:1200px;margin:0 auto}
.cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-shrink:0;gap:12px}
.cal-nav-left{display:flex;align-items:center;gap:10px}
.cal-month-label{font-size:19px;font-weight:700;color:var(--t0);letter-spacing:-.04em;white-space:nowrap}
.cal-nav-arrows{display:flex;gap:3px}
.cal-arrow{width:28px;height:28px;border-radius:8px;border:1px solid var(--e1);background:transparent;color:var(--t3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .11s}
.cal-arrow:hover{background:var(--s3);color:var(--t0);border-color:var(--e3)}
.cal-today-btn{padding:4px 10px;border-radius:7px;border:1px solid var(--e1);background:transparent;color:var(--t3);font-size:10.5px;font-weight:500;font-family:var(--sans);cursor:pointer;transition:all .11s}
.cal-today-btn:hover{background:var(--s3);color:var(--t0);border-color:var(--e3)}
.cal-nav-right{display:flex;align-items:center;gap:12px}
.cal-summary{display:flex;gap:14px}
.cal-sum-item{display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--t4)}
.cal-sum-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.cal-sum-v{font-family:var(--mono);font-weight:600;font-size:10.5px}
.cal-toggle{display:flex;background:var(--s3);border-radius:8px;padding:2px;gap:2px}
.cal-tog-btn{padding:4px 12px;border-radius:6px;border:none;background:transparent;color:var(--t3);font-size:11px;font-weight:500;font-family:var(--sans);cursor:pointer;transition:all .11s}
.cal-tog-btn.on{background:var(--s5);color:var(--t0)}
.cal-wd-row{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:3px;flex-shrink:0}
.cal-wd-cell{font-size:9.5px;font-weight:700;color:var(--t4);letter-spacing:.12em;text-transform:uppercase;text-align:center;padding:5px 0 7px}
.cal-month-body{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;flex:1}
.cal-mc{background:var(--s1);border:1px solid var(--e1);border-radius:9px;padding:8px 9px 7px;display:flex;flex-direction:column;overflow:hidden;transition:border-color .11s,background .11s;min-height:86px}
.cal-mc:hover{background:var(--s2);border-color:var(--e2)}
.cal-mc.other{opacity:.22}
.cal-mc.istoday{border-color:rgba(245,166,35,.28);background:var(--s2)}
.cal-mc.istoday::before{content:'';display:block;height:2px;background:linear-gradient(90deg,var(--amber),rgba(245,166,35,.4));margin:-8px -9px 8px;border-radius:9px 9px 0 0}
.cal-mc-num{font-size:12px;font-weight:600;color:var(--t3);line-height:1;margin-bottom:6px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;flex-shrink:0}
.cal-mc.istoday .cal-mc-num{background:var(--amber);color:#0a0500;font-weight:700}
.cal-pill{border-radius:3px;padding:2px 5px;font-size:9px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;line-height:1.5;cursor:default;letter-spacing:.01em}
.cal-overflow{font-size:8.5px;color:var(--t4);margin-top:2px;font-weight:500}
.cal-week-body{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;flex:1}
.cal-wc{background:var(--s1);border:1px solid var(--e1);border-radius:var(--rl);display:flex;flex-direction:column;overflow:hidden;min-height:280px}
.cal-wc.istoday{border-color:rgba(245,166,35,.24)}
.cal-wc.istoday .cal-wc-hd{border-bottom-color:rgba(245,166,35,.14)}
.cal-wc-hd{padding:10px 12px 9px;border-bottom:1px solid var(--e1);flex-shrink:0}
.cal-wc-wd{font-size:8.5px;font-weight:700;color:var(--t4);letter-spacing:.15em;text-transform:uppercase}
.cal-wc-num{font-size:20px;font-weight:700;color:var(--t3);line-height:1;margin-top:2px;letter-spacing:-.04em}
.cal-wc.istoday .cal-wc-num{color:var(--gold)}
.cal-wc-cnt{font-size:8.5px;color:var(--t4);margin-top:3px;font-family:var(--mono)}
.cal-wc-items{flex:1;overflow-y:auto;padding:5px;display:flex;flex-direction:column;gap:3px}
.cal-wc-item{border-radius:7px;padding:6px 8px;border:1px solid transparent;cursor:default;transition:transform .11s}
.cal-wc-item:hover{transform:scale(1.02)}
.cal-wc-item-name{font-size:10px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.01em}
.cal-wc-item-plat{font-size:8.5px;margin-top:2px}
.cal-wc-item-time{font-size:8.5px;color:var(--t3);font-family:var(--mono);margin-top:2px}
.cal-wc-empty{font-size:9.5px;color:var(--t4);text-align:center;padding:18px 6px}

/* ── DRIVE ── */
.drive-hero{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rxl);padding:32px 36px;margin-bottom:18px;position:relative;overflow:hidden}
.drive-hero::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 5%,rgba(245,166,35,.35) 50%,transparent 95%)}
.drive-hero::after{content:'';position:absolute;top:0;left:0;right:0;height:180px;background:radial-gradient(ellipse at 30% 0%,rgba(245,166,35,.03),transparent 70%);pointer-events:none}
.drive-title{font-size:20px;font-weight:700;color:var(--t0);letter-spacing:-.04em;margin-bottom:7px;position:relative}
.drive-desc{font-size:13px;color:var(--t2);font-weight:300;line-height:1.78;max-width:520px;position:relative}
.drive-setup{background:var(--s3);border-radius:var(--rl);padding:18px 20px;margin-bottom:12px}
.drive-setup-t{font-size:13px;font-weight:600;color:var(--t0);margin-bottom:5px}
.drive-setup-s{font-size:12px;color:var(--t2);font-weight:300;line-height:1.72;margin-bottom:12px}
.drive-steps-list{display:flex;flex-direction:column;gap:7px;margin-bottom:14px}
.drive-step-row{display:flex;align-items:flex-start;gap:10px;font-size:12px;color:var(--t2);line-height:1.6}
.drive-step-n{width:19px;height:19px;border-radius:50%;background:var(--s5);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700;color:var(--t0);flex-shrink:0;margin-top:1px}
.drive-status{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:var(--r);font-size:12.5px;font-weight:500}
.drive-status.ok{background:rgba(45,212,160,.06);border:1px solid rgba(45,212,160,.18);color:var(--green)}
.drive-status.warn{background:rgba(245,166,35,.06);border:1px solid var(--amberb);color:var(--amber)}
.drive-export-row{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}

/* ── SETTINGS ── */
.stg-layout{display:grid;grid-template-columns:160px 1fr;gap:18px}
.snb{width:100%;text-align:left;padding:7px 12px;border-radius:var(--r);border:none;background:transparent;font-family:var(--sans);font-size:12.5px;color:var(--t3);cursor:pointer;font-weight:400;transition:all .11s;margin-bottom:2px}
.snb:hover{background:var(--e1);color:var(--t0)}
.snb.on{background:var(--e2);color:var(--t0);font-weight:500}
.sc{background:var(--s2);border:1px solid var(--e1);border-radius:var(--rl);padding:22px 24px;margin-bottom:12px}
.sc-t{font-size:16px;font-weight:700;color:var(--t0);letter-spacing:-.04em;margin-bottom:4px}
.sc-d{font-size:12px;color:var(--t4);margin-bottom:16px;font-weight:300;line-height:1.65}
.sr{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--e1)}
.sr:last-child{border:none;padding-bottom:0}
.srl{font-size:13px;color:var(--t1);font-weight:300}
.srv{font-family:var(--mono);font-size:11.5px;color:var(--t3)}
.princ{font-size:12.5px;color:var(--t2);padding:10px 0;border-bottom:1px solid var(--e1);line-height:1.8;font-weight:300}
.princ:last-child{border:none}
.pnum{color:var(--amber);font-family:var(--mono);font-size:9px;margin-right:10px}

/* ── TOAST ── */
.toast{position:fixed;bottom:28px;right:28px;background:rgba(10,10,20,.96);backdrop-filter:blur(40px) saturate(1.5);border:1px solid var(--e3);border-radius:12px;padding:11px 17px;font-size:12.5px;color:var(--t0);z-index:200;display:flex;align-items:center;gap:8px;animation:fadeUp .16s ease;font-weight:400;box-shadow:0 20px 60px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.04) inset;max-width:340px}
.tdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;animation:pulse-ring 2s ease infinite}
.later-banner{background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.18);border-radius:var(--rl);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
.lb-t{font-size:13.5px;font-weight:600;color:var(--t0);margin-bottom:3px}
.lb-s{font-size:11.5px;color:var(--t2);font-weight:300;line-height:1.55}

/* ── IDEA SEED + CUSTOM PERSONA ── */
.extras-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;margin-bottom:16px}
.extra-box{background:var(--s3);border:1px solid var(--e1);border-radius:var(--rl);padding:16px 16px 14px;transition:border-color .14s}
.extra-box:focus-within{border-color:rgba(245,166,35,.3)}
.extra-box-hd{display:flex;align-items:center;gap:7px;margin-bottom:9px}
.extra-box-icon{width:20px;height:20px;border-radius:6px;background:var(--amber2);border:1px solid var(--amberb);display:flex;align-items:center;justify-content:center;color:var(--amber);flex-shrink:0}
.extra-box-title{font-size:12px;font-weight:600;color:var(--t0);letter-spacing:-.01em}
.extra-box-sub{font-size:10px;color:var(--t4);margin-bottom:9px;line-height:1.5}
.extra-box textarea,.extra-box input{background:var(--s4);border-color:var(--e1);font-size:12px;padding:8px 10px}
.extra-box textarea{height:68px}
.cp-fields{display:flex;flex-direction:column;gap:6px}
.cp-row{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.cp-actions{display:flex;gap:6px;margin-top:9px;align-items:center}
.cp-tag{font-size:9.5px;color:var(--green);background:rgba(45,212,160,.08);border:1px solid rgba(45,212,160,.15);border-radius:5px;padding:2px 7px;font-weight:600}
.pcard.custom{border-style:dashed}
.pcard.custom.on{border-style:solid}

/* ── HOME ── */
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
.bnav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:60;height:calc(58px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:rgba(3,3,10,.96);backdrop-filter:blur(56px) saturate(1.4);-webkit-backdrop-filter:blur(56px) saturate(1.4);border-top:1px solid rgba(255,255,255,.06);align-items:flex-start;justify-content:space-around;box-shadow:0 -8px 48px rgba(0,0,0,.6)}
.bni{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;flex:1;height:58px;border:none;background:transparent;cursor:pointer;color:rgba(255,255,255,.24);font-size:8.5px;font-family:var(--sans);font-weight:600;letter-spacing:.04em;text-transform:uppercase;transition:color .16s;-webkit-tap-highlight-color:transparent;position:relative;padding:0}
.bni svg{width:20px;height:20px;transition:opacity .16s,filter .16s;opacity:.35}
.bni.on{color:var(--amber)}
.bni.on svg{opacity:1;filter:drop-shadow(0 0 5px rgba(245,166,35,.55))}
.bni.on::after{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:28px;height:2px;background:var(--amber);border-radius:0 0 3px 3px;box-shadow:0 0 14px rgba(245,166,35,.8),0 0 28px rgba(245,166,35,.3)}
/* ── MOBILE ── */
@media(max-width:767px){
  .tb-nav{display:none}
  .bnav{display:flex}
  .topbar{padding:0 18px}
  .tb-counts{display:none}
  .view{padding:22px 16px calc(72px + env(safe-area-inset-bottom))}
  .home{max-width:100%}
  .home-greeting{font-size:clamp(20px,6vw,28px)}
  .home-stats{grid-template-columns:repeat(3,1fr);gap:7px}
  .home-grid{grid-template-columns:1fr}
  .home-pgrid{grid-template-columns:repeat(2,1fr)}
  .home-status{flex-wrap:wrap;gap:9px}
  .ap{max-width:100%}
  .platgrid{grid-template-columns:repeat(2,1fr)!important}
  .gen-btn{padding:20px 14px}
  .step-card{padding:20px 16px}
  .pgrid{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:400px){
  .home-stats{grid-template-columns:repeat(2,1fr)}
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

// ─── QUEUE ITEM ───────────────────────────────────────────────────────────────
const QueueItem = memo(function QueueItem({ item, onDelete, onStatus }) {
  const [open, setOpen] = useState(false);
  const plat = PLATFORMS.find((p) => p.id === item.platformId);
  const stMap = {
    pending: { bg: "rgba(255,255,255,.06)", c: "var(--t3)", l: "Pending" },
    ready: { bg: "rgba(99,102,241,.15)", c: "#818cf8", l: "Ready" },
    scheduled: { bg: "rgba(251,191,36,.13)", c: "var(--gold)", l: "Scheduled" },
    posted: { bg: "rgba(52,211,153,.12)", c: "var(--green)", l: "Posted" },
  };
  const st = stMap[item.status] || stMap.pending;
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
            { k: "photo_direction", l: "Visual Direction", accent: false, val: item.photo_direction },
            { k: "cta", l: "Call to Action", accent: false, val: item.cta },
          ]
            .filter((f) => f.val)
            .map((f) => (
              <div key={f.k} className="qfield">
                <div className="qfl">
                  {f.l}
                  <CopyBtn text={f.val} />
                </div>
                <div
                  className={`qfv${f.accent ? " accent" : ""}${f.mono ? " mono" : ""}`}
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
function Autopilot({ queue, setQueue, setView, toast_ }) {
  const [selP, setSelP] = useState(
    PERSONAS.map((p) => p.id)
  );
  const [selPl, setSelPl] = useState(["tiktok", "youtube"]);
  const [step, setStep] = useState(1);
  const [running, setRunning] = useState(false);
  const [prog, setProg] = useState([]);
  const abortRef = useRef(null);
  const [ideaSeed, setIdeaSeed] = useState("");
  const [customP, setCustomP] = useState({ name: "", handle: "", niche: "", voice: "" });
  const [customSaved, setCustomSaved] = useState(false);

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
    ] : [
      "share your story", "give practical tips", "discuss current trends",
      "share personal insights", "behind the scenes",
    ],
    color: "#a78bfa",
    statusKey: "live",
  } : null;

  const allPersonas = customPersonaObj ? [...PERSONAS, customPersonaObj] : PERSONAS;

  const toggleP = (id) => setSelP((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const togglePl = (id) =>
    setSelPl((s) => (s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : [...s, id]));

  const total = selP.length * selPl.length * POSTS_PER_PLATFORM;
  const canRun = selP.length > 0 && selPl.length > 0 && !running;

  const run = useCallback(async () => {
    if (!canRun) return;
    setRunning(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const slots = buildSchedule(
      allPersonas.filter((p) => selP.includes(p.id)),
      selPl
    );
    setProg(slots.map((s) => ({ ...s, genStatus: "pending" })));
    const results = [];
    const usedHooks = []; // track hooks across the batch to prevent repetition
    for (let i = 0; i < slots.length; i++) {
      if (ctrl.signal.aborted) break;
      const slot = slots[i];
      setProg((p) => p.map((x, j) => (j === i ? { ...x, genStatus: "running" } : x)));
      try {
        const persona = allPersonas.find((p) => p.id === slot.personaId);
        const post = await generatePost(
          persona,
          slot.platformId,
          slot.pillar,
          slot.postIndex,
          ctrl.signal,
          [...usedHooks],
          ideaSeed,
        );
        if (post.hook) usedHooks.push(post.hook);
        const item = {
          id: `${Date.now()}_${i}`,
          ts: Date.now(),
          ...slot,
          ...post,
          status: "ready",
        };
        results.push(item);
        setProg((p) => p.map((x, j) => (j === i ? { ...x, genStatus: "done" } : x)));
      } catch (e) {
        if (e.name === "AbortError") break;
        setProg((p) => p.map((x, j) => (j === i ? { ...x, genStatus: "error" } : x)));
        console.error("API Error:", e);
      }
      if (i < slots.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }
    setQueue((prev) => [...results, ...prev]);
    setRunning(false);
    toast_(`${results.length} posts generated — open Queue to review`);
    setTimeout(() => setView("queue"), 700);
  }, [canRun, selP, selPl, setQueue, setView, toast_, allPersonas, ideaSeed]);

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
    selPl.map((id) => PLATFORMS.find((p) => p.id === id)?.name).join(" + ") || "None";

  return (
    <div className="fu">
      <div className="ap">
        <div className="ap-header">
          <div className="ap-header-title">Content Hub</div>
          <div className="ap-header-sub">Select personas and platforms — the engine handles the rest.</div>
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
                    return (
                      <div
                        key={p.id}
                        className={`pcard${on ? " on" : ""}${isCustom ? " custom" : ""}`}
                        style={{ "--pc": p.color }}
                        onClick={() => toggleP(p.id)}
                      >
                        <div className="pcard-check">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#030206"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <div className="pcard-em">{p.niche}</div>
                        <div className="pcard-name">{p.name}</div>
                        <div className="pcard-niche">{p.handle}</div>
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
                  {PLATFORMS.map((p) => {
                    const on = selPl.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className={`platcard${on ? " on" : ""}`}
                        style={{ "--plc": p.color }}
                        onClick={() => togglePl(p.id)}
                      >
                        <div className="platcard-dot" style={{ background: p.color }} />
                        <div className="platcard-name">{p.name}</div>
                        <div className="platcard-detail">
                          {on ? "12 posts/week · auto-formatted" : "Click to include"}
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
                <div className="gen-summary">
                  {[
                    { l: "Personas", v: personaNames },
                    { l: "Platforms", v: platNames },
                    { l: "Posts", v: `${total} total — 12 per platform` },
                  ].map((r) => (
                    <div key={r.l} className="gen-stat">
                      <div className="gen-stat-l">{r.l}</div>
                      <div className="gen-stat-v">{r.v}</div>
                    </div>
                  ))}
                </div>
                <button
                  className={`gen-btn${canRun ? " ready" : ""}${running ? " running" : ""}`}
                  disabled={!canRun && !running}
                  onClick={running ? stop : run}
                >
                  {running ? (
                    <>
                      <div className="spinner" /> Writing {done}/{prog.length} posts — tap to stop
                    </>
                  ) : (
                    <>
                      {Ic.rocket}{" "}
                      {total > 0
                        ? `Generate ${total} posts for next week`
                        : "Select personas & platforms first"}
                    </>
                  )}
                </button>
                {total > 0 && !running && (
                  <div className="gen-sub">
                    Each post is researched fresh · {selP.length} persona
                    {selP.length !== 1 ? "s" : ""} · {selPl.length} platform
                    {selPl.length !== 1 ? "s" : ""} · photos, videos &amp; carousels
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
                  ? "Writing posts and generating 9:16 scene prompts\u2026"
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
            <QueueItem key={item.id} item={item} onDelete={del} onStatus={upSt} />
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
function Settings({ queue, setQueue, toast_ }) {
  const [tab, setTab] = useState("account");
  return (
    <div className="stg-layout fu">
      <div>
        {[
          { id: "account", l: "Account" },
          { id: "network", l: "Network" },
          { id: "principles", l: "Principles" },
          { id: "howto", l: "How to post" },
          { id: "export", l: "Export" },
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
        {tab === "network" && (
          <div className="sc">
            <div className="sc-t">Media Network</div>
            <div className="sc-d">All {PERSONAS.length} personas</div>
            {PERSONAS.map((p) => {
              const cnt = queue.filter((i) => i.personaId === p.id).length;
              return (
                <div key={p.id} className="sr">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: p.color,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div className="srl">
                        {p.name}{" "}
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--t3)" }}>
                          {p.handle}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1, fontWeight: 300 }}>
                        {p.niche} &middot; {cnt} posts in queue
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 5, background: `${p.color}18`, color: p.color, fontWeight: 600 }}>
                    {p.niche}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {tab === "principles" && (
          <div className="sc">
            <div className="sc-t">System Principles</div>
            <div className="sc-d">Master Plan v10.0</div>
            {[
              "THE SYSTEM IS THE PRODUCT. Build it properly. Document everything.",
              "PROVE ONE ACCOUNT FIRST. Cara & Lila must earn before the next account launches.",
              "B2B IS THE EXIT. Start outreach now. Do not wait for the perfect pitch.",
              "OWNED BEATS RENTED. Email, digital products, Telegram subscriptions. These are assets.",
              "QUICK WINS FIRST. Find the smallest thing that counts as progress. Do it today.",
              "DISCLOSE EVERYTHING. Transparency with clients builds trust. Be honest in every meeting.",
              "EXIT ON PROVEN REVENUE. Two consecutive months at 2\u00D7 net salary. Not projections.",
            ].map((p, i) => (
              <div key={i} className="princ">
                <span className="pnum">{String(i + 1).padStart(2, "0")}</span>
                {p}
              </div>
            ))}
          </div>
        )}
        {tab === "howto" && (
          <div className="sc">
            <div className="sc-t">How to post the content</div>
            <div className="sc-d">
              Your Sunday workflow — generate, export, schedule, done.
            </div>
            {[
              [
                "Step 1 — Run Autopilot",
                "Select your live personas and platforms. Hit Generate. Autopilot searches for what\u2019s trending in each niche right now and writes 12 fresh posts per platform — all optimized for visual content tools.",
              ],
              [
                "Step 2 — Review the Queue",
                "Go to Queue. Each post shows the hook, caption, hashtags, and exact visual direction. Check it, copy it, mark it scheduled.",
              ],
              [
                "Step 3 — Create your images/videos",
                "Each post has a Visual Direction note packed with your 9:16 and identity locks. Use Nano Banana 2 or your content tools to mass-produce the visuals.",
              ],
              [
                "Step 4 — Export for Later.com",
                "Hit Export for Later.com in the Queue view. Upload the CSV at later.com/bulk. Later places every post at the right time on the right day.",
              ],
              [
                "Step 5 — Attach images in Later",
                "Go through each scheduled post in Later and attach the photo/video you created. Approve. Done.",
              ],
              [
                "Step 6 — Sync to Google Drive",
                "Use the Drive Sync view to push the full schedule to a Google Sheet. Share it with your team or client so everyone can see what\u2019s coming.",
              ],
              [
                "The full loop",
                "Sunday: generate \u2192 review \u2192 create photos \u2192 export to Later \u2192 attach images \u2192 approve. Monday to Sunday runs itself.",
              ],
            ].map(([title, body]) => (
              <div
                key={title}
                className="sr"
                style={{ flexDirection: "column", alignItems: "flex-start", gap: 5 }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t0)" }}>
                  {title}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--t2)",
                    fontWeight: 300,
                    lineHeight: 1.75,
                  }}
                >
                  {body}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "export" && (
          <div className="sc">
            <div className="sc-t">Export</div>
            <div className="sc-d">Download your content.</div>
            {[
              {
                l: "Later.com CSV",
                s: `${queue.length} posts — upload at later.com/bulk`,
                cls: "btn-amber",
                lbl: "Download CSV",
                fn: () => {
                  dlFile(buildCSV(queue), "CAIG_Schedule.csv", "text/csv");
                  toast_("Exported");
                },
              },
              {
                l: "Clear all",
                s: "Remove everything from the queue permanently",
                cls: "btn-danger",
                lbl: "Clear",
                fn: () => {
                  if (!window.confirm("Delete all queue content?")) return;
                  setQueue([]);
                  toast_("Cleared");
                },
              },
            ].map((r) => (
              <div key={r.l} className="sr">
                <div>
                  <div className="srl">{r.l}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--t3)",
                      marginTop: 2,
                      fontWeight: 300,
                    }}
                  >
                    {r.s}
                  </div>
                </div>
                <button
                  className={`btn ${r.cls}`}
                  style={{ fontSize: 12, padding: "6px 13px" }}
                  onClick={r.fn}
                >
                  {r.lbl}
                </button>
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
  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));

  const PRIORITIES = [
    { id: "brand-outreach", label: "Brand Outreach Follow-ups", desc: "Tracking leads, sending follow-ups, chasing decisions" },
    { id: "payment-tracking", label: "Payment & Invoice Tracking", desc: "Knowing who owes what, when, and sending reminders" },
    { id: "content-approval", label: "Content Approval Workflow", desc: "Getting brand sign-off before posting goes live" },
    { id: "scheduling", label: "Content Scheduling & Posting", desc: "Getting posts from queue into Later / Buffer on time" },
    { id: "community", label: "Telegram / Community Management", desc: "Welcoming subscribers, posting updates, handling DMs" },
    { id: "reporting", label: "Performance Reporting", desc: "Pulling stats, tracking what's working, weekly summaries" },
  ];

  const ready = fields.contactName && fields.bottleneck;

  return (
    <div className="mod-shell" style={{ "--mod-c": "var(--c-automate)" }}>
      <div className="mod-hero">
        <div className="mod-badge">
          <div className="mod-badge-dot" />
          Creator Workflow
        </div>
        <div className="mod-title">Automate Your Creator Ops</div>
        <div className="mod-desc">
          Tell us where your time is leaking — we'll map out the automations that hand it back so you can focus on content and deals.
        </div>
      </div>

      {!submitted ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { v: "80%", l: "of creator admin tasks are repeatable and automatable" },
              { v: "6h", l: "average hours per week lost to outreach and scheduling admin" },
              { v: "3×", l: "faster deal close when follow-up is automated and consistent" },
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
                <label className="mod-label">Number of active personas</label>
                <select className="mod-input" value={fields.personaCount} onChange={e => set("personaCount", e.target.value)}>
                  <option value="">Select</option>
                  {["1", "2–3", "4–5", "6–7", "8+"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="mod-field">
                <label className="mod-label">Hours per week lost to admin (approx.)</label>
                <input className="mod-input" placeholder="e.g. 8" value={fields.hoursPerWeek} onChange={e => set("hoursPerWeek", e.target.value)} />
              </div>
              <div className="mod-field">
                <label className="mod-label">Tools you currently use</label>
                <input className="mod-input" placeholder="e.g. Later, Notion, Gmail, Stripe, Telegram" value={fields.currentTools} onChange={e => set("currentTools", e.target.value)} />
              </div>
            </div>

            <div className="mod-card">
              <div className="mod-card-title">Where's the bottleneck? <div className="mod-card-title-line" /></div>
              <div className="mod-field">
                <label className="mod-label">Describe what's eating your time *</label>
                <textarea className="mod-input mod-ta" style={{ minHeight: 100 }}
                  placeholder="e.g. I'm manually following up with brands every few days, tracking payments in a spreadsheet, and spending hours moving content from the queue into Later every Sunday..."
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

          <div className="mod-action-wrap">
            <button className={`mod-btn${ready ? " ready" : ""}`} disabled={!ready} onClick={() => setSubmitted(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Build My Automation Plan
            </button>
            <div className="mod-hint">We'll map out exactly what to automate first and the tools to do it.</div>
          </div>
        </>
      ) : (
        <>
          <div className="mod-preview-bar">
            <div className="mod-preview-title">Creator Automation Plan — {fields.contactName}</div>
            <button className="btn btn-dim" onClick={() => setSubmitted(false)} style={{ fontSize: 12 }}>← Edit</button>
          </div>

          <div className="mod-doc">
            <div className="pd-h1">Creator Automation Plan</div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 24 }}>
              {fields.contactName} · {fields.personaCount ? `${fields.personaCount} personas` : "Creator operation"} · {fields.hoursPerWeek ? `${fields.hoursPerWeek}h/week in admin` : ""}
            </div>

            <div className="pd-h2">The Problem</div>
            <div className="pd-p">
              {fields.bottleneck || "Manual admin is eating into the time you should be spending on content and brand relationships."}
            </div>
            <div className="pd-p">
              Running {fields.personaCount || "multiple"} personas means the admin compounds. Every task you do manually for one persona, you're doing {fields.personaCount || "multiple"} times. That's where automation earns the most.
            </div>

            <div className="pd-h2">Start Here: {PRIORITIES.find(p => p.id === fields.priority)?.label}</div>
            <div className="pd-p">{PRIORITIES.find(p => p.id === fields.priority)?.desc}. This is the right first move — high frequency, directly tied to revenue, and automatable without rebuilding how you work.</div>

            {fields.priority === "brand-outreach" && <>
              <div className="pd-h2">Brand Outreach Automation Stack</div>
              {[
                { tool: "Notion + Zapier", use: "Build a brand CRM in Notion. Zapier auto-updates status, sends you reminders at day 3, 7, and 14 after first contact — no chasing in your head." },
                { tool: "Gmail Canned Responses + Sequences", use: "Write your follow-up templates once. Use a sequence tool (Mailmeteor, Gmass) to send timed follow-ups automatically — looks personal, costs nothing." },
                { tool: "Calendly", use: "Stop the back-and-forth. Brand contacts book a 20-min call directly. You show up prepped, not chasing." },
                { tool: "Airtable Brand Pipeline", use: "One view showing every active deal: stage, persona, value, last contact. Filters by persona so you can see Cara's pipeline vs Maya's." },
              ].map(r => <div key={r.tool} className="pd-li"><strong>{r.tool}:</strong> {r.use}</div>)}
            </>}

            {fields.priority === "payment-tracking" && <>
              <div className="pd-h2">Payment & Invoice Automation Stack</div>
              {[
                { tool: "Stripe / Wise", use: "Issue invoices and collect payment in one click. Auto-reminders go out at 3, 7, and 14 days overdue — without you chasing." },
                { tool: "Notion Finance Tracker", use: "Log every deal: brand, persona, amount, due date, paid. One view tells you exactly what's outstanding." },
                { tool: "Zapier: Stripe → Notion", use: "When payment clears in Stripe, Zapier auto-marks it paid in your Notion tracker. Zero manual reconciliation." },
                { tool: "Google Sheets Payment Dashboard", use: "Monthly income by persona. Copy the CSV from Stripe, drop it in — sheet auto-calculates totals and flags anything overdue." },
              ].map(r => <div key={r.tool} className="pd-li"><strong>{r.tool}:</strong> {r.use}</div>)}
            </>}

            {fields.priority === "content-approval" && <>
              <div className="pd-h2">Content Approval Automation Stack</div>
              {[
                { tool: "Notion Approval Board", use: "Each sponsored post gets a card: draft, sent for review, approved, posted. Brand contacts get a shared link — no email chains." },
                { tool: "Google Drive Shared Folder per Campaign", use: "Drop the draft caption and visual in a folder. Share it with the brand. They comment, you update. One source of truth." },
                { tool: "Loom for Async Review", use: "Record a 60-second walkthrough of the post for the brand. Speeds up approval from days to hours — they see it in context." },
                { tool: "Deadline Zapier Alert", use: "Set an approval deadline in Notion. Zapier pings you (and optionally the brand contact) 24h before it expires." },
              ].map(r => <div key={r.tool} className="pd-li"><strong>{r.tool}:</strong> {r.use}</div>)}
            </>}

            {fields.priority === "scheduling" && <>
              <div className="pd-h2">Scheduling Automation Stack</div>
              {[
                { tool: "This App → Later.com CSV", use: "Generate your week, export the CSV from Settings, upload to Later.com/bulk. The full week is scheduled in under 10 minutes." },
                { tool: "Later Auto-publish", use: "Enable auto-publish on Later so approved posts go live without you touching anything. Images pre-attached, time pre-set." },
                { tool: "Google Drive Sync (in-app)", use: "Push the full schedule to a Google Sheet each week. Share with collaborators so everyone sees what's going live." },
                { tool: "Sunday System", use: "Generate Sunday → review queue → create visuals → export CSV → upload Later → attach images → approve. Done. Week runs itself." },
              ].map(r => <div key={r.tool} className="pd-li"><strong>{r.tool}:</strong> {r.use}</div>)}
            </>}

            {fields.priority === "community" && <>
              <div className="pd-h2">Community Management Automation Stack</div>
              {[
                { tool: "Telegram Bot (Combot / Rose)", use: "Auto-welcome new subscribers with a pinned message. Filter spam. Answer FAQs automatically. Runs 24/7 without you." },
                { tool: "Notion Content Calendar → Telegram", use: "Schedule your Telegram updates in Notion. Use Zapier to post them automatically at the right time — no manual copy-paste." },
                { tool: "Gumroad / Whop for Paid Access", use: "Payment → automatic Telegram invite link. No manual adding members, no chasing payments." },
                { tool: "Monthly Digest Template", use: "Write a monthly community update template once. Fill in the numbers, drop in the new content — done in 10 minutes." },
              ].map(r => <div key={r.tool} className="pd-li"><strong>{r.tool}:</strong> {r.use}</div>)}
            </>}

            {fields.priority === "reporting" && <>
              <div className="pd-h2">Performance Reporting Automation Stack</div>
              {[
                { tool: "Later Analytics Export", use: "Export your weekly stats from Later as CSV. Drop into a Google Sheet template that auto-calculates growth, engagement rate, top posts." },
                { tool: "Google Sheets Dashboard per Persona", use: "One tab per persona. Track followers, views, engagement, and brand deal income monthly. Colour-coded so you see what's working at a glance." },
                { tool: "Zapier: TikTok/Instagram → Sheet", use: "Auto-pull key metrics into your tracker weekly. No manual logging." },
                { tool: "Monthly Review Template", use: "30 minutes every month: review stats, identify top-performing pillars, adjust next month's content mix. Systemised, not improvised." },
              ].map(r => <div key={r.tool} className="pd-li"><strong>{r.tool}:</strong> {r.use}</div>)}
            </>}

            <div className="pd-h2">90-Day Creator Automation Roadmap</div>
            {[
              { phase: "Days 1–30", action: `Implement ${PRIORITIES.find(p => p.id === fields.priority)?.label} automation. Set up your tools, build the templates, test the workflow. Target: ${fields.hoursPerWeek ? Math.round(parseInt(fields.hoursPerWeek) * 0.4) + "h/week" : "40%"} of current admin time eliminated.` },
              { phase: "Days 31–60", action: "Layer in a second automation — if you started with outreach, add payment tracking next. Or if you started with scheduling, add reporting. Stack the systems." },
              { phase: "Days 61–90", action: `All six areas systematised. ${fields.personaCount ? `Running ${fields.personaCount} personas` : "Your full operation"} on a repeatable weekly rhythm. Admin drops to under 2h/week. The rest goes to content and deals.` },
            ].map(r => (
              <div key={r.phase} className="pd-li"><strong>{r.phase}:</strong> {r.action}</div>
            ))}

            <div className="pd-h2">Next Step</div>
            <div className="pd-p">
              Start with the one tool that addresses your top priority. Don't try to automate everything at once — pick the highest-pain task, build the system, then stack the next one on top.
            </div>
            {fields.currentTools && (
              <div className="pd-p">
                You're already using {fields.currentTools} — good starting point. Most of these automations connect directly to your existing stack without replacing anything.
              </div>
            )}
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

// ─── CREATOR INTELLIGENCE MODULE ─────────────────────────────────────────────
function Outreach() {
  const [fields, setFields] = useState({
    selectedPersonas: [],
    monthsActive: "",
    currentFollowers: "",
    topPillar: "",
    weakestPillar: "",
    revenueStreams: [],
    nextGoal: "brand-deal",
  });
  const [submitted, setSubmitted] = useState(false);
  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));

  const togglePersona = (id) =>
    set("selectedPersonas", fields.selectedPersonas.includes(id)
      ? fields.selectedPersonas.filter(x => x !== id)
      : [...fields.selectedPersonas, id]);

  const toggleRevenue = (r) =>
    set("revenueStreams", fields.revenueStreams.includes(r)
      ? fields.revenueStreams.filter(x => x !== r)
      : [...fields.revenueStreams, r]);

  const REVENUE_STREAMS = [
    "Brand sponsorships", "Affiliate links", "Digital products",
    "Telegram subscriptions", "Consultation calls", "None yet",
  ];

  const NEXT_GOALS = [
    { id: "brand-deal", label: "Land first brand deal", desc: "Get a paid partnership on one of the personas" },
    { id: "scale-content", label: "Scale content output", desc: "Grow to more personas or more platforms" },
    { id: "monetise-audience", label: "Monetise existing audience", desc: "Add digital products, Telegram, or affiliate income" },
    { id: "grow-followers", label: "Grow follower count", desc: "Build the audience before monetising" },
    { id: "systematise", label: "Systematise operations", desc: "Make the whole operation run with less input" },
  ];

  const chosenPersonas = PERSONAS.filter(p => fields.selectedPersonas.includes(p.id));
  const ready = fields.selectedPersonas.length > 0 && fields.nextGoal;

  return (
    <div className="mod-shell" style={{ "--mod-c": "var(--c-predict)" }}>
      <div className="mod-hero">
        <div className="mod-badge">
          <div className="mod-badge-dot" />
          Creator Intelligence
        </div>
        <div className="mod-title">Network Health Check</div>
        <div className="mod-desc">
          Tell us where your personas are right now — we'll diagnose what to focus on next and what the growth playbook looks like.
        </div>
      </div>

      {!submitted ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { v: "6–12m", l: "typical time for a niche creator account to land first paid brand deal" },
              { v: "10K", l: "follower threshold where brand outreach conversion improves significantly" },
              { v: "3×", l: "more revenue per follower from a focused niche vs broad lifestyle content" },
            ].map(s => (
              <div key={s.l} style={{ background: "var(--s2)", border: "1px solid var(--e1)", borderRadius: "var(--rl)", padding: "20px 22px" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--c-predict)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: "-.04em" }}>{s.v}</div>
                <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div className="mod-body">
            <div className="mod-card">
              <div className="mod-card-title">Your Network <div className="mod-card-title-line" /></div>

              <div className="mod-field">
                <label className="mod-label">Which personas are you running?</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                  {PERSONAS.map(p => (
                    <button key={p.id}
                      onClick={() => togglePersona(p.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                        borderRadius: "var(--r)",
                        border: "1px solid " + (fields.selectedPersonas.includes(p.id) ? p.color : "var(--e2)"),
                        background: fields.selectedPersonas.includes(p.id) ? p.color + "15" : "var(--s3)",
                        cursor: "pointer", textAlign: "left", transition: "all .15s",
                      }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t0)" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 1 }}>{p.niche} · {p.handle}</div>
                      </div>
                      {fields.selectedPersonas.includes(p.id) && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mod-field">
                <label className="mod-label">How many months have you been running?</label>
                <select className="mod-input" value={fields.monthsActive} onChange={e => set("monthsActive", e.target.value)}>
                  <option value="">Select</option>
                  {["Under 1 month","1–2 months","3–4 months","5–6 months","7–12 months","Over a year"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="mod-field">
                <label className="mod-label">Approx. total followers across all personas</label>
                <select className="mod-input" value={fields.currentFollowers} onChange={e => set("currentFollowers", e.target.value)}>
                  <option value="">Select</option>
                  {["Under 500","500–2K","2K–5K","5K–10K","10K–25K","25K–50K","50K+"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="mod-card">
              <div className="mod-card-title">Content & Revenue <div className="mod-card-title-line" /></div>

              <div className="mod-field">
                <label className="mod-label">Which content pillar is performing best?</label>
                <input className="mod-input" value={fields.topPillar}
                  onChange={e => set("topPillar", e.target.value)}
                  placeholder="e.g. Budget destination deep-dives, honest product reviews" />
              </div>

              <div className="mod-field">
                <label className="mod-label">Which pillar feels weakest or hardest to produce?</label>
                <input className="mod-input" value={fields.weakestPillar}
                  onChange={e => set("weakestPillar", e.target.value)}
                  placeholder="e.g. Behind-the-scenes content, long-form YouTube" />
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
            <button className={"mod-btn" + (ready ? " ready" : "")} disabled={!ready} onClick={() => setSubmitted(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
              Run Network Health Check
            </button>
            <div className="mod-hint">We'll diagnose your network and give you the focused next move.</div>
          </div>
        </>
      ) : (
        <>
          <div className="mod-preview-bar">
            <div className="mod-preview-title">Network Health Check — {chosenPersonas.map(p => p.name).join(", ")}</div>
            <button className="btn btn-dim" onClick={() => setSubmitted(false)} style={{ fontSize: 12 }}>← Edit</button>
          </div>

          <div className="mod-doc">
            <div className="pd-h1">Creator Network Health Check</div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 24 }}>
              {chosenPersonas.map(p => p.name).join(" · ")} · {fields.monthsActive || "Early stage"} · {fields.currentFollowers || "Growing"} followers
            </div>

            <div className="pd-h2">Where You Are</div>
            <div className="pd-p">
              You're running <strong>{chosenPersonas.length} persona{chosenPersonas.length > 1 ? "s" : ""}</strong> ({chosenPersonas.map(p => p.name + " in " + p.niche).join(", ")})
              {fields.monthsActive ? " and you're " + fields.monthsActive + " in" : ""}.
              {fields.currentFollowers ? " Total reach: approximately " + fields.currentFollowers + " followers." : ""}
            </div>
            {fields.revenueStreams.length > 0 && !fields.revenueStreams.includes("None yet") && (
              <div className="pd-p">
                Current revenue streams: <strong>{fields.revenueStreams.join(", ")}</strong>. The goal now is to systematise and scale what's working.
              </div>
            )}
            {(fields.revenueStreams.includes("None yet") || fields.revenueStreams.length === 0) && (
              <div className="pd-p">
                No revenue streams yet — that's fine at this stage. The priority is building the content engine and audience quality before monetising.
              </div>
            )}

            <div className="pd-h2">Content Diagnosis</div>
            {fields.topPillar && (
              <div className="pd-p">
                <strong>What's working: {fields.topPillar}.</strong> Double down on this. More frequency, more depth, more angles within this pillar.
              </div>
            )}
            {fields.weakestPillar && (
              <div className="pd-p">
                <strong>What's weak: {fields.weakestPillar}.</strong> Either systematise it (batch-produce once a week, make it templated) or drop it entirely and reallocate that time to your stronger pillar.
              </div>
            )}

            <div className="pd-h2">Your Primary Focus: {NEXT_GOALS.find(g => g.id === fields.nextGoal)?.label}</div>
            {fields.nextGoal === "brand-deal" && (
              <div>
                <div className="pd-p">You're at the stage where brand outreach makes sense. Here's the exact playbook:</div>
                {[
                  { step: "1. Build your outreach list", detail: "Identify 20 brands that already partner with creators in your niche. Look at who's sponsoring accounts at your size — they've proven the budget and model." },
                  { step: "2. Lead with data, not vibes", detail: "Your pitch needs: persona niche, platform, approx. follower count, engagement indicators, and one strong content example. Keep it under 150 words." },
                  { step: "3. Start with gifting", detail: "Ask for a gifted collaboration first. No money required — they send product, you create. This gets your first brand name on your portfolio." },
                  { step: "4. Prove it converts", detail: "Include an affiliate link or discount code. When you can show the brand it drove traffic or sales, the paid deal conversation becomes easy." },
                  { step: "5. Follow up twice", detail: "First email → 5 days → follow up. 5 more days → final follow up. If no response, move on. Consistent follow-up triples response rates." },
                ].map(r => <div key={r.step} className="pd-li"><strong>{r.step}:</strong> {r.detail}</div>)}
              </div>
            )}
            {fields.nextGoal === "scale-content" && (
              <div>
                <div className="pd-p">Scaling content output without losing quality requires systemisation, not more hours:</div>
                {[
                  { step: "Sunday batch generation", detail: "Use the Content Hub to generate a full week for all active personas in one session. Don't generate daily — batch everything." },
                  { step: "One visual style per persona", detail: "Lock the visual identity. Same filters, same text overlays, same colours. Speed comes from not making design decisions every time." },
                  { step: "Stagger persona launches", detail: "Don't go live with all personas at once. Prove one first (Cara & Lila), then launch the next." },
                  { step: "Repurpose systematically", detail: "Every TikTok becomes an Instagram Reel. Every Reel gets a still for feed. One piece of content → three posts." },
                ].map(r => <div key={r.step} className="pd-li"><strong>{r.step}:</strong> {r.detail}</div>)}
              </div>
            )}
            {fields.nextGoal === "monetise-audience" && (
              <div>
                <div className="pd-p">You have an audience — now convert it. The order matters:</div>
                {[
                  { step: "1. Telegram first", detail: "Lowest barrier. £5–10/month. Direct relationship with your most engaged followers. Promote it every 5–7 posts." },
                  { step: "2. Digital products second", detail: "Each persona has a natural product. Price under £25 to remove friction. Sell via Gumroad." },
                  { step: "3. Affiliate third", detail: "Add affiliate links for products you already mention. Amazon Associates or niche-specific programmes." },
                  { step: "4. Brand deals fourth", detail: "Once you have proof of sales, your brand pitch becomes significantly stronger." },
                ].map(r => <div key={r.step} className="pd-li"><strong>{r.step}:</strong> {r.detail}</div>)}
              </div>
            )}
            {fields.nextGoal === "grow-followers" && (
              <div>
                <div className="pd-p">Growth before monetisation is the right call at your stage. The lever is content consistency on the right pillars:</div>
                {[
                  { step: "Post frequency", detail: "Minimum 4x/week per active persona on TikTok. Drop below 3x and the algorithm deprioritises you." },
                  { step: "Hook quality", detail: "The first 2 seconds determines whether the post gets pushed. Write hooks that create an open loop or specific promise." },
                  { step: "Trending audio", detail: "Use sounds in the 200K–2M use range. Too new = no reach. Too saturated = buried." },
                  { step: "Niche consistency", detail: "Stay strictly within your niche for at least 3 months. The algorithm categorises you — mixed content kills reach." },
                ].map(r => <div key={r.step} className="pd-li"><strong>{r.step}:</strong> {r.detail}</div>)}
              </div>
            )}
            {fields.nextGoal === "systematise" && (
              <div>
                <div className="pd-p">The system is the product. Here's the full operational architecture:</div>
                {[
                  { step: "Sunday content loop", detail: "Generate → Review queue → Create visuals → Export CSV → Upload Later → Attach images → Approve. 2–3 hours max for all active personas." },
                  { step: "Brand pipeline tracker", detail: "Notion board: Prospect → Contacted → In negotiation → Confirmed → Live → Paid. One view per persona." },
                  { step: "Financial tracking", detail: "Stripe for payments. Notion for tracking by persona, campaign, and date. Monthly review: income, cost, net — per persona." },
                  { step: "Weekly rhythm", detail: "Sunday: generate. Monday: create visuals. Tuesday: upload and schedule. Wednesday–Saturday: posts go live automatically. Repeat." },
                ].map(r => <div key={r.step} className="pd-li"><strong>{r.step}:</strong> {r.detail}</div>)}
              </div>
            )}

            <div className="pd-h2">Next 30 Days — One Move</div>
            <div className="pd-p">
              Don't try to do everything. The single highest-leverage action right now is: <strong>{NEXT_GOALS.find(g => g.id === fields.nextGoal)?.label}</strong>. Everything else is secondary until you've made meaningful progress on this.
            </div>
            {chosenPersonas.length > 1 && (
              <div className="pd-p">
                You're running {chosenPersonas.length} personas. Prove one first — focus the next 30 days on <strong>{chosenPersonas[0].name}</strong> before splitting attention.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PROPOSALS ────────────────────────────────────────────────────────────────
const DELIVERABLE_OPTIONS = [
  "Dedicated TikTok post (60s)",
  "Instagram Reel (30s)",
  "YouTube Short (60s)",
  "Instagram static post + caption",
  "Instagram Story sequence (3 frames)",
  "YouTube integration (60s mid-roll)",
  "Pinned comment / link-in-bio",
  "Telegram community mention",
  "Digital product bundle inclusion",
  "Dedicated review post",
  "30-day content series",
  "Giveaway collaboration",
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
    selectedPersonas: [],
    deliverables: [],
    notes: "",
    preparedBy: "",
    date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  });
  const [preview, setPreview] = useState(false);
  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));

  const togglePersona = (id) =>
    set("selectedPersonas", fields.selectedPersonas.includes(id)
      ? fields.selectedPersonas.filter(x => x !== id)
      : [...fields.selectedPersonas, id]);

  const toggleDeliverable = (d) =>
    set("deliverables", fields.deliverables.includes(d)
      ? fields.deliverables.filter(x => x !== d)
      : [...fields.deliverables, d]);

  const ready = fields.brandName && fields.selectedPersonas.length > 0 && fields.deliverables.length > 0;

  const chosenPersonas = PERSONAS.filter(p => fields.selectedPersonas.includes(p.id));

  const buildDeck = () => {
    const personaSection = chosenPersonas.map(p => {
      const platforms = ["TikTok", "Instagram", "YouTube"].join(", ");
      return `## ${p.name} — ${p.niche} Creator

**Handle:** ${p.handle}
**Niche:** ${p.niche}
**Platforms:** ${platforms}
**Voice:** ${p.voice}
**Brand fit:** ${p.b2b}

Content pillars relevant to ${fields.brandName || "your brand"}:
${p.pillars.slice(0, 5).map(pl => `  • ${pl}`).join("\n")}

---`;
    }).join("\n\n");

    const deliverableList = fields.deliverables.map(d => `  • ${d}`).join("\n");

    const budgetLine = fields.budget ? `**Investment:** ${fields.budget}` : "";
    const timelineLine = fields.timeline ? `**Campaign Timeline:** ${fields.timeline}` : "";

    return `
# Brand Partnership Proposal

**Brand:** ${fields.brandName}${fields.brandWebsite ? ` · ${fields.brandWebsite}` : ""}
**Prepared for:** ${fields.brandContact || fields.brandName}
**Prepared by:** CAIG Media Network${fields.preparedBy ? ` · ${fields.preparedBy}` : ""}
**Date:** ${fields.date}

---

## About the Network

CAIG Media Network is a portfolio of AI-powered creator personas reaching highly engaged audiences across TikTok, Instagram, and YouTube. Each persona is built around a specific niche, a consistent voice, and content that earns trust — not just views.

We don't do generic sponsored content. Every brand integration is written in the creator's authentic voice, tied to a real content pillar, and designed to convert.

---

## Campaign Overview

${fields.brandProduct ? `**Product / Service:** ${fields.brandProduct}\n` : ""}${fields.campaignGoal ? `**Campaign Goal:** ${fields.campaignGoal}\n` : ""}${budgetLine ? `${budgetLine}\n` : ""}${timelineLine ? `${timelineLine}\n` : ""}

---

## Proposed Creator${chosenPersonas.length > 1 ? "s" : ""}

${personaSection}

## Deliverables

${deliverableList}

All content is produced, reviewed, and scheduled through our internal system. Final assets are delivered to you for approval before posting. Full revision round included.

---

## Why This Works

  • Audiences trust these voices — every persona is built on authentic, specific content, not aspirational fluff
  • Niche alignment means your product reaches people who are already in the buying mindset
  • We control the full production pipeline — no briefing chaos, no missed deadlines
  • Every post includes a clear CTA and tracked link so you can measure ROI directly

---

## Next Steps

1. Confirm deliverables and campaign timeline
2. Sign the partnership agreement
3. Submit brand assets and brief
4. Content drafted and sent for approval within 5 working days
5. Live on schedule

${fields.notes ? `---\n\n## Additional Notes\n\n${fields.notes}` : ""}

---

We look forward to building something that actually performs.

— CAIG Media Network
`.trim();
  };

  const deck = buildDeck();

  return (
    <div className="mod-shell" style={{ "--mod-c": "var(--c-proposals)" }}>
      {!preview ? (
        <>
          <div className="mod-hero">
            <div className="mod-badge"><span className="mod-badge-dot" /> Brand Partnerships</div>
            <div className="mod-title">Sponsorship Deck Builder</div>
            <div className="mod-desc">Select a persona, pick your deliverables, add the brand details — generate a polished partnership proposal in seconds.</div>
          </div>

          <div className="mod-body">
            {/* Left — brand details */}
            <div className="mod-card">
              <div className="mod-card-title">Brand Details <span className="mod-card-title-line" /></div>
              <div className="mod-field">
                <label className="mod-label">Brand name *</label>
                <input className="mod-input" value={fields.brandName}
                  onChange={e => set("brandName", e.target.value)} placeholder="e.g. BYLT Basics" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Brand website</label>
                <input className="mod-input" value={fields.brandWebsite}
                  onChange={e => set("brandWebsite", e.target.value)} placeholder="e.g. byltbasics.com" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Contact name</label>
                <input className="mod-input" value={fields.brandContact}
                  onChange={e => set("brandContact", e.target.value)} placeholder="e.g. James Reid, Partnerships Manager" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Product / service being promoted</label>
                <input className="mod-input" value={fields.brandProduct}
                  onChange={e => set("brandProduct", e.target.value)} placeholder="e.g. Performance base-layer clothing" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Campaign goal</label>
                <input className="mod-input" value={fields.campaignGoal}
                  onChange={e => set("campaignGoal", e.target.value)} placeholder="e.g. Drive traffic to launch page, boost UK brand awareness" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Budget / rate</label>
                <input className="mod-input" value={fields.budget}
                  onChange={e => set("budget", e.target.value)} placeholder="e.g. £1,500 flat / £800 per post + 10% affiliate" />
              </div>
              <div className="mod-field">
                <label className="mod-label">Campaign timeline</label>
                <input className="mod-input" value={fields.timeline}
                  onChange={e => set("timeline", e.target.value)} placeholder="e.g. 4 weeks, starting May 2025" />
              </div>
              <div className="mod-card-title" style={{ marginTop: 14 }}>Your Details <span className="mod-card-title-line" /></div>
              <div className="mod-field">
                <label className="mod-label">Prepared by</label>
                <input className="mod-input" value={fields.preparedBy}
                  onChange={e => set("preparedBy", e.target.value)} placeholder="Your name" />
              </div>
            </div>

            {/* Right — personas + deliverables */}
            <div className="mod-card">
              <div className="mod-card-title">Select Persona(s) * <span className="mod-card-title-line" /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                {PERSONAS.map(p => (
                  <button key={p.id}
                    onClick={() => togglePersona(p.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      borderRadius: "var(--r)",
                      border: `1px solid ${fields.selectedPersonas.includes(p.id) ? p.color : "var(--e2)"}`,
                      background: fields.selectedPersonas.includes(p.id) ? `${p.color}15` : "var(--s3)",
                      cursor: "pointer", textAlign: "left", transition: "all .15s",
                    }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t0)" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 1 }}>{p.handle} · {p.niche} · {p.b2b.split(",")[0]}</div>
                    </div>
                    {fields.selectedPersonas.includes(p.id) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                ))}
              </div>

              <div className="mod-card-title" style={{ marginTop: 18 }}>Deliverables * <span className="mod-card-title-line" /></div>
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
                placeholder="Exclusivity terms, past brand partnerships, specific requirements, affiliate tracking details…" />
            </div>
          </div>

          <div className="mod-action-wrap">
            <button className={`mod-btn${ready ? " ready" : ""}`} disabled={!ready}
              onClick={() => setPreview(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Build Partnership Deck
            </button>
            <div className="mod-hint">
              {ready ? "Ready — click to generate your sponsorship proposal" : "Select a persona, at least one deliverable, and add the brand name"}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mod-preview-bar">
            <button className="btn btn-dim" onClick={() => setPreview(false)}>← Edit</button>
            <div className="mod-preview-title">Partnership Deck — {fields.brandName}</div>
            <button className="btn btn-dim" onClick={() => navigator.clipboard.writeText(deck)}>
              {IcCopy} Copy text
            </button>
            <button className="btn" style={{ background: "var(--c-proposals)", color: "#fff", fontSize: 12 }}
              onClick={() => openPrint(`Partnership Deck — ${fields.brandName}`, deck, "#818cf8")}>
              {IcPrint} Save as PDF
            </button>
          </div>
          <div className="mod-doc">
            {renderDoc(deck, "var(--c-proposals)")}
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
      .select("is_active, role, agency_name")
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
        <div className="login-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#030206" strokeWidth="2.5">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
          </svg>
        </div>
        <div className="login-title">Cornerstone AI Group</div>
        <div className="login-sub">
          AI Content Engine &middot; Client Portal<br />Sign in to access your creator system.
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

function Home({ queue, setView }) {
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
    { l: "In Queue",  v: queue.length,    c: "var(--t0)" },
    { l: "Ready",     v: ready,           c: "var(--green)" },
    { l: "Scheduled", v: sched,           c: "var(--c-proposals)" },
    { l: "Published", v: posted,          c: "var(--amber)" },
    { l: "Personas",  v: PERSONAS.length, c: "var(--t1)" },
  ];

  const MODULES = [
    {
      id: "autopilot",
      title: "Content Hub",
      desc: "Generate on-brand social content, LinkedIn posts, and blogs across every persona and platform — in seconds.",
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
      title: "Brand Partnerships",
      desc: "Generate a polished sponsorship deck for any persona — deliverables, brand fit, and pricing in seconds.",
      color: "var(--c-proposals)",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
      live: false,
    },
    {
      id: "outreach",
      title: "Network Health Check",
      desc: "Diagnose your persona network — content performance, growth stage, and the one move to focus on next.",
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
      title: "Automate Creator Ops",
      desc: "Scheduling, brand outreach, payment tracking, community management — mapped out and handed off so you focus on content.",
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
          <span className="home-sh-ct">{PERSONAS.length} personas</span>
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

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
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
    // Create auth user via Supabase admin signup
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { emailRedirectTo: null }
    });
    if (error) { setFormErr(error.message); setBusy(false); return; }
    // Update the auto-created profile row
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
          <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 3 }}>Manage client access to the portal</div>
        </div>
        <button
          onClick={() => { setCreating(c => !c); setFormErr(""); setFormOk(""); }}
          style={{
            background: creating ? "var(--e2)" : "var(--gold)", color: creating ? "var(--t2)" : "#000",
            border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}
        >
          {creating ? "Cancel" : "+ New Client"}
        </button>
      </div>

      {creating && (
        <form onSubmit={createClient} style={{
          background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 12,
          padding: "24px 28px", marginBottom: 28,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 16 }}>Create New Client Account</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <input
              placeholder="Agency name"
              value={form.agency_name}
              onChange={e => setForm(f => ({ ...f, agency_name: e.target.value }))}
              style={{ background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "9px 12px", color: "var(--t1)", fontSize: 13, outline: "none" }}
            />
            <input
              placeholder="Email address"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={{ background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "9px 12px", color: "var(--t1)", fontSize: 13, outline: "none" }}
            />
          </div>
          <input
            placeholder="Temporary password"
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            style={{ width: "100%", boxSizing: "border-box", background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "9px 12px", color: "var(--t1)", fontSize: 13, outline: "none", marginBottom: 12 }}
          />
          {formErr && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 10 }}>{formErr}</div>}
          {formOk  && <div style={{ color: "var(--green)", fontSize: 12, marginBottom: 10 }}>{formOk}</div>}
          <button
            type="submit"
            disabled={busy}
            style={{
              background: "var(--gold)", color: "#000", border: "none", borderRadius: 8,
              padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? .5 : 1
            }}
          >
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
            <div key={c.id} style={{
              background: "var(--e1)", border: "1px solid var(--b1)", borderRadius: 12,
              padding: "16px 20px", display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: c.role === "admin" ? "rgba(245,166,35,.15)" : "var(--e2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: c.role === "admin" ? "var(--gold)" : "var(--t2)",
                flexShrink: 0,
              }}>
                {(c.agency_name || c.email || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>{c.agency_name || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{c.email}</div>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em",
                color: c.role === "admin" ? "var(--gold)" : "var(--t4)", marginRight: 8,
              }}>
                {c.role}
              </div>
              <div style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600,
                background: c.is_active ? "rgba(52,211,153,.12)" : "rgba(239,68,68,.12)",
                color: c.is_active ? "var(--green)" : "var(--red)",
                marginRight: 8,
              }}>
                {c.is_active ? "Active" : "Disabled"}
              </div>
              {c.role !== "admin" && (
                <button
                  onClick={() => toggleActive(c)}
                  style={{
                    background: "var(--e2)", border: "1px solid var(--b1)", borderRadius: 7,
                    padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "var(--t2)", cursor: "pointer",
                  }}
                >
                  {c.is_active ? "Disable" : "Enable"}
                </button>
              )}
            </div>
          ))}
          {clients.length === 0 && (
            <div style={{ color: "var(--t3)", fontSize: 13, padding: 20 }}>No accounts yet.</div>
          )}
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

  const [session, setSession]   = useState(null);   // supabase user
  const [profile, setProfile]   = useState(null);   // profiles row
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView]         = useState("home");
  const [queue, setQueue]       = useState(() => stor.get("caig_queue", []));
  const [toast, setToast]       = useState(null);

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
    autopilot:  { t: "Content Hub",     s: "Social media · Generate, schedule and publish" },
    queue:      { t: "Publish Queue",   s: `${queue.length} item${queue.length !== 1 ? "s" : ""} across all modules` },
    calendar:   { t: "Calendar",        s: "Full content schedule" },
    settings:   { t: "Settings",        s: "Network · Principles · Export" },
  };

  if (authLoading) return (
    <div style={{ position: "fixed", inset: 0, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--t3)", fontSize: 13 }}>Loading…</div>
    </div>
  );

  if (!session) return <LoginGate onAuth={(user, p) => { setSession(user); setProfile(p); }} />;

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
          <div className="tb-gem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#030206" strokeWidth="2.2">
              <path d="M4 6 L12 2 L20 6 L20 18 L12 22 L4 18 Z"/>
              <line x1="12" y1="2" x2="12" y2="22"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
            </svg>
          </div>
          <div className="tb-wordmark">
            Cornerstone AI Group
            <span>Operator Platform</span>
          </div>
        </div>

        {/* Nav links */}
        <div className="tb-nav">
          <button className={`tni${view === "home" ? " on" : ""}`} onClick={() => setView("home")}>
            {Ic.home} Home
          </button>
          <button className={`tni${view === "autopilot" ? " on" : ""}`} onClick={() => setView("autopilot")}>
            {IcContent} Content Hub
          </button>
          <button className={`tni${view === "proposals" ? " on" : ""}`} onClick={() => setView("proposals")}>
            {IcProposals} Proposals
          </button>
          <button className={`tni${view === "outreach" ? " on" : ""}`} onClick={() => setView("outreach")}>
            {IcOutreach} Predict Customers
          </button>
          <button className={`tni${view === "onboarding" ? " on" : ""}`} onClick={() => setView("onboarding")}>
            {IcOnboarding} Automate Tasks
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
          <button className={`tni${view === "queue" ? " on" : ""}`} onClick={() => setView("queue")}>
            {Ic.list} Queue {ready > 0 && <span className="nb">{ready}</span>}
          </button>
          <button className={`tni${view === "calendar" ? " on" : ""}`} onClick={() => setView("calendar")}>
            {Ic.cal} Calendar
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
          {view === "home"       && <Home queue={queue} setView={setView} />}
          {view === "autopilot"  && <Autopilot queue={queue} setQueue={setQueue} setView={setView} toast_={toast_} />}
          {view === "proposals"  && <Proposals />}
          {view === "outreach"   && <Outreach />}
          {view === "onboarding" && <Onboarding />}
          {view === "queue"      && <Queue queue={queue} setQueue={setQueue} toast_={toast_} />}
          {view === "calendar"   && <CalView queue={queue} />}
          {view === "settings"   && <Settings queue={queue} setQueue={setQueue} toast_={toast_} />}
          {view === "admin"      && profile?.role === "admin" && <AdminPanel />}
        </div>
      </div>

      {/* ── BOTTOM NAV (mobile) ─────────────────────────────────────────────── */}
      <nav className="bnav">
        {[
          { id: "home",      label: "Home",    ic: Ic.home   },
          { id: "autopilot", label: "Content", ic: IcContent },
          { id: "queue",     label: "Queue",   ic: Ic.list   },
          { id: "calendar",  label: "Cal",     ic: Ic.cal    },
          { id: "settings",  label: "System",  ic: Ic.cog    },
        ].map(n => (
          <button key={n.id} className={`bni${view === n.id ? " on" : ""}`} onClick={() => setView(n.id)}>
            {n.ic}
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
