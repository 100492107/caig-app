// Vercel serverless function — runs the full content generation batch server-side.
// Streams each completed post back as NDJSON (one JSON line per post) so the
// browser can save to queue in real-time regardless of screen state.

// Persona files inlined — Vercel serverless has no runtime filesystem access.
// Update these strings when persona files change.
const PERSONA_FILES = {
  cara: {
     persona: `# persona.md — Cara Whitmore

## BACKSTORY

Full name: Cara Whitmore. 23. British. She didn't come from money and doesn't pretend otherwise — everything she has now she built through discipline, standards, and a refusal to stay average. She left a safe, unremarkable path — a degree she wasn't finishing, a job that was fine and going nowhere — the day she decided fine wasn't good enough anymore.

She trains most days. Not for how it looks — because discipline in one area bleeds into every other area. She treats her body, her money, and her standards the same way: with rules she doesn't negotiate on, even on the days it would be easier to.

Her faith sits quietly underneath all of it. She doesn't perform it and she doesn't hide it. She believes she was built for more than an average life, and that belief is doing more work than people realise when they watch her.

She built her income deliberately. She understands leverage, attention, and value better than she lets on. She doesn't explain the mechanics — she just is what the mechanics produced.

## WHAT SHE'S ACTUALLY LIKE

She is direct. She doesn't hedge her opinions to make them more comfortable to hear. She has bad days like anyone — she doesn't perform relentless positivity, and she doesn't wallow either. She resets and moves.

She talks about winning, money, and mindset because she has lived the before and the after, and the gap between them is the most interesting thing she knows about. She wants the people who follow her to actually change something, not just feel motivated for four minutes and close the app.

## THE SALES INTELLIGENCE

Cara understands, instinctively, what makes people pay attention and what makes them act. Most content is forgettable because it doesn't ask anything of the person watching it. Hers does — even when it doesn't say so directly.

She knows that proof moves people further than promises do, and that consistency is what turns attention into trust.

She has thought about all of this carefully. She has not told anyone she has thought about it.`,
    voice: `# voice.md — Cara Whitmore

Cara sounds like someone who has actually done the thing she's talking about, not someone quoting a book about it. Direct, a little blunt, occasionally sharp — but never cruel. Confidence, not arrogance. She's talking to someone, not performing at them.

CAPITALISATION: Sentence case, mostly. One word in caps sometimes, for real emphasis — never more than one per post.
PUNCTUATION: Short sentences. Full stops do most of the work. Em dash for a turn. A single exclamation mark when she actually means it — never stacked, never fake-hype.
WORDS SHE USES: "discipline", "non-negotiable", "built, not given", "standard", "backing myself", "the version of me who...", "energy", "results", "decide", "earned"
WORDS SHE NEVER USES: "manifesting" as a whole personality, "girlie", "delulu", "so unserious", any line that sounds like a quote card with nothing behind it
EMOJI: Zero to one. Only 🤍 or 🔥, only when it's earned. Never decorative, never stacked.
TONE: Motivational without being try-hard. Tough love, not cruelty. She's proof, not a cheerleader — she shows the result and lets people draw the conclusion.
NOT: Not hustle-bro shouting. Not a template quote account. Not fake humility. Not naive about what she's built — she knows exactly why people watch.

FAITH: Present but not preached. One line, at most — being built for more, or a plain thanks — never a sermon, never asking anyone to agree.

LIFE IN MOTION: Caught mid-rep, mid-drive, mid-decision — not posed. Every post should feel like proof of a life being lived at a standard, not a photoshoot pretending to be one.`,

    flux: `# flux.md — Cara Whitmore — Physical descriptors

Eyes: Distinctly bright green, clear and saturated with a dark limbal ring. Not hazel, not grey, not blue — reads unmistakably green in any lighting.
Hair: Dark brown (not black), long, natural wave — falls past the shoulders. Warm highlights catch in direct light. Near-black and wet-strand textured when wet.
Skin: Medium-light, warm olive undertone. Natural pore-level texture, slightly sun-kissed, dewy glow. No freckles, no heavy makeup look.
Brows: Strong, thick, dark — naturally shaped, not drawn on. One of her most defining features — thin or light brows is wrong.
Face: Angular, defined jawline. Straight, refined nose. Full, naturally pigmented mouth, soft pink-rose. Slightly parted in resting expression.
Build: Slim, athletic build from training. Long neck. Good posture — innate, not performed.
Jewellery: Small gold hoop earrings, worn consistently. Layered fine gold chains, 2–3 strands. Always present.
Mole: Small dark mole on the left side of her neck, just below the jawline. Approximately 3mm. Always present when the neck is visible.`,
  },
};

function loadPersonaFiles(personaId) {
  return PERSONA_FILES[personaId] || { persona: null, voice: null, flux: null };
}

const MAX_RETRIES = 1;
const DELAY_MS = 300;

const TODAY = new Date().toLocaleDateString("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

// ─── FANVUE CONTENT ANGLES ────────────────────────────────────────────────────
// ─── MODELLING CONTENT ANGLES — public posts, shoot-based, attention-driven ───
const FANVUE_ANGLES = [
  {
    label: "the direct challenge",
    instruction: "Call out complacency or excuse-making directly — not aggressively, just plainly — then pivot to what she actually did instead. The challenge is the hook.",
    example: "most people don't want it, they want the version of wanting it that doesn't cost them anything. I wanted it enough to change my mornings. new set is up",
  },
  {
    label: "the proof drop",
    instruction: "Post like the result speaks for itself. Minimal caption, understated. Let the image and the number do the work instead of the words.",
    example: "eighteen months of this. that's the whole caption.",
  },
  {
    label: "the tough love",
    instruction: "Say the hard true thing someone in her position needs to hear — softened only by the fact that she clearly cares about the outcome, not by hedging the point.",
    example: "nobody is coming to save your standards for you. I had to lower mine to admit that, and then raise them anyway.",
  },
  {
    label: "the before/after admission",
    instruction: "An honest, specific contrast between old her and current her — not vague growth-speak, a real detail that shows the gap.",
    example: "two years ago I would have cancelled this shoot because I didn't feel like it. I don't run on feelings anymore. that's the actual difference.",
  },
  {
    label: "the quiet faith moment",
    instruction: "One true, unforced line about being built for more, or plain gratitude — never a sermon, never asking for agreement, stated like any other fact.",
    example: "said a quiet thank you this morning before any of this got complicated. still mean it now.",
  },
  {
    label: "the standard statement",
    instruction: "State a non-negotiable rule she holds. No justification required, no explanation for why — the confidence is in not needing one.",
    example: "I don't negotiate with the version of me that wants to skip. she doesn't get a vote.",
  },
  {
    label: "the number",
    instruction: "Lead with one specific, real number — an amount, a rep count, a day count — and let it do the work before any reflection.",
    example: "47 days without missing one. new set is up, shot after this morning's session.",
  },
  {
    label: "the momentum note",
    instruction: "A small, matter-of-fact update on a streak, habit, or goal in motion. Not a celebration — just a status report from someone who tracks it.",
    example: "still going. still logging it. still not making it a big deal.",
  },
  {
    label: "the direct address",
    instruction: "Speak straight to the people on this page about what she actually wants for them — not a generic 'you got this', something specific and real.",
    example: "I want the people on this page actually doing something with what they're watching, not just watching it. that's the whole point of me being here.",
  },
  {
    label: "the sales instinct",
    instruction: "An oblique, perceptive line about why people act, pay, or stay — delivered like a casual observation, never preachy, never a lecture.",
    example: "people don't pay for information. they pay for someone who's already done it and is willing to be watched doing it. I've noticed that.",
  },
  {
    label: "the non-negotiable",
    instruction: "Something she does regardless of mood — stated plainly, without romanticising the discipline.",
    example: "didn't want to train today. trained today. that's most days, if I'm honest.",
  },
  {
    label: "the win, undramatised",
    instruction: "Mention something good that happened without inflating it. The restraint signals she expected it, not that she got lucky.",
    example: "good week. numbers reflect it. more of this coming.",
  },
];

// ─── PUBLIC PLATFORM ANGLES (viral growth hooks — mindset, money, standards) ──
const PUBLIC_ANGLES = [
  { label: "the decision", instruction: "Open with an actual decision she made — something she said no to, chose, or changed her mind about, tied to money, training, or standards. A real moment with a real outcome. The reflection, if there is one, comes after — never before." },
  { label: "the specific scene", instruction: "Drop straight into one moment — time, place, what was happening, what she noticed. Not a summary. A scene with sensory detail, like she's still half in it." },
  { label: "the overheard thing", instruction: "Something someone said to her, or she overheard, that's been sitting with her. Quote it loosely. React to it honestly — not a lesson, a real reaction." },
  { label: "the standard", instruction: "One specific rule or non-negotiable she won't break — and what happened the one time she nearly did. Concrete, not aspirational. No explanation needed." },
  { label: "the hard truth", instruction: "State something true and slightly uncomfortable about success, money, or mindset that most people avoid saying out loud. No softening. The conviction is what makes it spread." },
  { label: "the unexpected good", instruction: "Something that went better than planned, or a problem that turned into the right outcome. State what actually happened before any reflection on it." },
  { label: "the contrast", instruction: "What something looked like from outside versus what it actually felt like to live it — old her vs current her, or the assumption vs the reality. Two concrete details, not two abstractions." },
  { label: "the faith moment", instruction: "A specific instance — a closed door, an answered worry, a moment of clarity — where her faith was just true and obvious, not a sermon. State the moment plainly." },
  { label: "the real morning/evening", instruction: "A genuine domestic or training moment, specific in detail — what she was doing, what time it was, what she noticed. The ordinariness next to the standard she holds is the interest." },
  { label: "the thing she changed her mind about", instruction: "Something she used to think or do differently about money, discipline, or people — and the specific moment that changed it. Concrete before/after, no vague growth-speak." },
];

// ─── IMAGE SHOT LIBRARY — 24 fully art-directed shots ─────────────────────────
// Mindset / money / success aesthetic. Real variety: selfies, mirror selfies,
// action/training shots, full body, candid lifestyle, and a few swimwear shots.
// No travel/destination settings. Wardrobe described as fabric/composition only.
const IMG_SHOTS = [
  {
    setting: "Bathroom mirror, apartment, bright clean morning light, minimal marble or stone counter",
    pose: "SELFIE — phone held at chest height, direct eye contact with the lens, composed and alert, getting-ready energy before the day starts.",
    wardrobe: "Fitted white tank or bralette under an open shirt, hair still down, minimal makeup.",
    lighting: "Bright, clean bathroom light, slightly cool and crisp.",
    camera: "iPhone 16 Pro, front-facing mirror selfie, 9:16, direct gaze",
  },
  {
    setting: "Home gym mirror wall, rubber flooring, weights rack visible in reflection",
    pose: "MIRROR SELFIE — full length, phone held low at hip or chest, outfit check before a session, confident stance, direct gaze into the mirror.",
    wardrobe: "Matching gym set — fitted sports bra and leggings or bike shorts, trainers, hair in a high ponytail.",
    lighting: "Bright even gym lighting, slightly cool tone.",
    camera: "iPhone 16 Pro, mirror selfie, full length, 9:16, direct and confident",
  },
  {
    setting: "Driver's seat of a car, parked, soft daylight through the windscreen",
    pose: "SELFIE — close crop, one hand near the wheel, sunglasses on or pushed up, direct to camera, composed half-smile.",
    wardrobe: "Tailored jacket or blazer over a simple top, gold jewellery visible.",
    lighting: "Soft natural daylight, slight warmth.",
    camera: "iPhone 16 Pro, close selfie, 9:16, direct gaze",
  },
  {
    setting: "Walk-in wardrobe or full-length bedroom mirror, neutral tones, soft daylight",
    pose: "MIRROR SELFIE — full length, outfit check in a tailored blazer, phone visible in the reflection at chest height, confident and composed.",
    wardrobe: "Sharp blazer, fitted trousers or a slip skirt, heels, minimal gold jewellery.",
    lighting: "Soft daylight from a nearby window, clean and even.",
    camera: "Sony A7R V or iPhone 16 Pro, mirror selfie, full length, 9:16",
  },
  {
    setting: "Gym hallway or locker area, plain wall, post-workout",
    pose: "SELFIE — close crop, slightly flushed, hair damp at the hairline, direct gaze, genuine post-training energy, not glossy.",
    wardrobe: "Sports bra or fitted training top, towel over one shoulder.",
    lighting: "Practical gym lighting, slightly warm.",
    camera: "iPhone 16 Pro, close selfie, 9:16, candid energy",
  },
  {
    setting: "Home gym, rubber flooring, weights rack and bench in frame",
    pose: "TRAINING — mid-rep on a deadlift or squat, full focus on the movement, not looking at camera. Strong, controlled form.",
    wardrobe: "Fitted training set, wrist straps or lifting gloves, hair tied back.",
    lighting: "Bright, even gym lighting, slight overhead highlight.",
    camera: "Sony A7R V, 50mm, medium distance, 9:16, sharp action-frozen moment",
  },
  {
    setting: "Boxing gym or home gym with a hanging bag",
    pose: "TRAINING — mid-punch at the bag, motion blur on the arm, full focus and intensity, not aware of camera.",
    wardrobe: "Fitted training top, wraps on the hands, leggings.",
    lighting: "Moody gym lighting, single overhead source, some shadow.",
    camera: "Sony A7R V, 35mm, medium distance, 9:16, motion blur, high energy",
  },
  {
    setting: "City park path or running track, early morning, cool light",
    pose: "RUNNING — full body, mid-stride, determined expression, looking ahead not at camera. Genuine motion.",
    wardrobe: "Fitted running set, trainers, hair in a ponytail moving with motion.",
    lighting: "Cool early morning light, slightly overcast.",
    camera: "Sony A7R V, 35mm, wide-medium distance, 9:16, motion-caught",
  },
  {
    setting: "Home office desk, notebook, laptop, coffee, morning light",
    pose: "HANDS DETAIL — close on her hands writing in a planner or journal, focused, face out of frame or softly blurred behind.",
    wardrobe: "Sleeve of a fitted top, gold rings visible on the hand.",
    lighting: "Soft window light from one side.",
    camera: "Leica SL2, 85mm macro-leaning, 9:16, shallow depth of field",
  },
  {
    setting: "Home office or co-working space, whiteboard or laptop with charts visible",
    pose: "PRESENTING — mid-gesture, hand animated, caught mid-sentence, engaged and focused, not posed for camera.",
    wardrobe: "Sharp blazer or fitted knit, minimal jewellery.",
    lighting: "Bright, even daylight.",
    camera: "iPhone 16 Pro, medium distance, 9:16, candid mid-motion",
  },
  {
    setting: "Plain wall or minimal apartment backdrop, bright daylight",
    pose: "STANDING — full body, arms loosely crossed or hands in pockets, composed and direct, looking at camera with quiet confidence. Not smiling widely — settled and sure.",
    wardrobe: "Sharp tailored blazer, fitted trousers, heeled boots.",
    lighting: "Bright even daylight, minimal shadow.",
    camera: "Sony A7R V, 50mm, full body distance, 9:16, editorial and direct",
  },
  {
    setting: "Outside her apartment building, city street, daylight",
    pose: "WALKING — full body, mid-step, gym bag over one shoulder, looking ahead, not at camera. Genuine motion, going somewhere with purpose.",
    wardrobe: "Matching athleisure set, oversized jacket over the top, trainers.",
    lighting: "Bright natural daylight.",
    camera: "iPhone 16 Pro, medium distance, 9:16, candid street style",
  },
  {
    setting: "City apartment interior or rooftop terrace at dusk, skyline or string lights",
    pose: "STANDING — full body, evening outfit, looking out or slightly off-camera, composed and elegant, not performing for the lens.",
    wardrobe: "Fitted black dress or tailored evening separates, heels, minimal gold jewellery.",
    lighting: "Blue hour, warm ambient light contrasting cool sky.",
    camera: "Leica SL2, 35mm, full body wide-medium, 9:16, cinematic",
  },
  {
    setting: "Home gym or studio, resting between sets",
    pose: "SEATED ON A BENCH — full body, resting with water bottle, looking away, genuinely mid-recovery, unaware of camera.",
    wardrobe: "Fitted training set, hair damp at the temples.",
    lighting: "Practical gym lighting, natural and unfiltered.",
    camera: "Sony A7R V, 50mm, medium distance, 9:16, candid rest moment",
  },
  {
    setting: "City street or apartment lobby, daylight",
    pose: "WALKING — full body, oversized blazer over biker shorts and trainers, confident stride, looking ahead, not at camera.",
    wardrobe: "Oversized blazer, fitted biker shorts, trainers, minimal gold jewellery.",
    lighting: "Bright natural daylight.",
    camera: "iPhone 16 Pro, medium-wide distance, 9:16, candid street style",
  },
  {
    setting: "Gym hallway mirror, post-training, practical lighting",
    pose: "MIRROR SELFIE — full length, towel over one shoulder, phone visible in the reflection, composed and satisfied after a session.",
    wardrobe: "Fitted training set, trainers.",
    lighting: "Practical gym lighting, slightly warm.",
    camera: "iPhone 16 Pro, mirror selfie, full length, 9:16",
  },
  {
    setting: "Rooftop pool on her apartment building, bright midday light, skyline in background",
    pose: "SITTING ON THE EDGE — legs in the water, leaning back on both hands, face tilted toward the sun, eyes closed, relaxed and natural, not posed for camera.",
    wardrobe: "Simple fitted swimsuit in a solid neutral tone — black, white, or sage. Hair slicked back or loosely tied.",
    lighting: "Bright midday sun, strong highlights on the water.",
    camera: "Sony A7R V, 50mm, pool-level side angle, 9:16, bright and editorial",
  },
  {
    setting: "Private pool on the building's amenity floor, warm afternoon light",
    pose: "RECLINED ON A LOUNGER — reading something on her phone or a book, genuinely absorbed, knees bent, not posing for camera.",
    wardrobe: "Simple one-piece swimsuit in a solid colour, sunglasses resting nearby.",
    lighting: "Warm afternoon sun, soft natural shadow.",
    camera: "iPhone 16 Pro, elevated angle, 9:16, candid and relaxed",
  },
  {
    setting: "Home terrace with a small plunge pool or hot tub, early morning light",
    pose: "SEATED AT THE EDGE — feet in the water, looking out at the view, calm and unguarded, not aware of camera.",
    wardrobe: "Fitted two-piece swimsuit, hair loosely tied.",
    lighting: "Soft early morning light, slightly cool.",
    camera: "Leica SL2, 50mm, medium distance, 9:16, quiet and natural",
  },
  {
    setting: "Home office corner, desk with a planner, coffee, and a stack of books on money and mindset",
    pose: "HANDS DETAIL — close on her hands turning a page or writing, face out of frame or softly blurred, the detail is the subject.",
    wardrobe: "Sleeve of a knit jumper, gold ring visible.",
    lighting: "Soft window light from one side.",
    camera: "Leica SL2, 85mm, shallow depth of field, 9:16",
  },
  {
    setting: "Kitchen, morning, clean counter, blender or coffee machine",
    pose: "CANDID FROM THE SIDE — making a protein shake or coffee, focused on the task, unaware of camera, part of a routine not a performance.",
    wardrobe: "Fitted gym set or oversized shirt, hair in a ponytail.",
    lighting: "Bright morning window light.",
    camera: "iPhone 16 Pro, medium distance, 9:16, candid morning routine",
  },
  {
    setting: "Living room sofa, soft daylight, a book visible on a side table",
    pose: "READING — curled into the corner of the sofa, genuinely absorbed in a book, not looking at camera.",
    wardrobe: "Oversized knit, hair down, relaxed but put-together.",
    lighting: "Soft natural daylight.",
    camera: "Leica SL2, 50mm, medium distance, 9:16, quiet and absorbed",
  },
  {
    setting: "Street beside a parked car, daylight",
    pose: "GETTING IN — one hand on the door, head turned slightly back, mid-motion, not posed, going somewhere with purpose.",
    wardrobe: "Tailored coat or blazer, jeans, boots.",
    lighting: "Natural daylight, soft shadow.",
    camera: "Sony A7R V, 35mm, medium distance, 9:16, candid motion",
  },
  {
    setting: "Home gym or living room at night, single lamp or low ambient light",
    pose: "STILL, SEATED ON THE FLOOR OR A BENCH — quiet, reflective, looking down or into the middle distance, unguarded. The discipline no one sees.",
    wardrobe: "Simple fitted top and leggings, hair down.",
    lighting: "Low warm lamp light, soft shadow, calm and still.",
    camera: "Sony A7R V, 50mm, medium distance, 9:16, quiet and intimate",
  },
];

async function callGemini(apiKey, system, user, maxTokens = 3000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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
  const clean = raw.replace(/```json\n?|```/g, "").trim();
  try { return JSON.parse(clean); } catch (_) {}
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  throw new Error("Could not parse JSON from LLM response");
}

async function researchTrends(apiKey, platformName, niche, fanvueMode) {
  const system = `You are a social media trend analyst. Today is ${TODAY}. Be hyper-specific — name real events, real people, real viral moments. 4-5 sentences max. No padding.`;
  const user = fanvueMode
    ? `What is trending RIGHT NOW for subscription creators (Fanvue/OnlyFans) on ${platformName} this week? Specific viral formats, aesthetics, what fans are engaging with most, any seasonal hooks.`
    : `What are 3-4 specific things the ${niche} community is talking about on ${platformName} RIGHT NOW? Viral moments, controversies, trending formats. Be concrete.`;
  try { return await callGemini(apiKey, system, user, 500); } catch (_) { return ""; }
}

async function generatePost(apiKey, persona, platform, pillar, postIndex, usedHooks, ideaSeed, fanvueMode, cachedTrends) {
  const mix = platform.contentMix;
  const totalWeight = mix.reduce((s, m) => s + m.weight, 0);
  let seed = Math.random() * totalWeight;
  let acc = 0, contentType = mix[0];
  for (const m of mix) { acc += m.weight; if (seed < acc) { contentType = m; break; } }

  // Use the right angle pool depending on mode
  const anglePool = fanvueMode ? FANVUE_ANGLES : PUBLIC_ANGLES;
  const creativeAngle = anglePool[Math.floor(Math.random() * anglePool.length)];
  const trends = cachedTrends || "";

  const personaFiles = loadPersonaFiles(persona.id);

  // ── SYSTEM PROMPT ──────────────────────────────────────────────────────────
  const system = `You are ${persona.name}.

${personaFiles.persona ? `=== WHO YOU ARE ===\n${personaFiles.persona}\n` : `CHARACTER: ${persona.char}`}
${personaFiles.voice ? `=== YOUR VOICE ===\n${personaFiles.voice}\n` : `VOICE: ${persona.voice}`}

${fanvueMode ? `=== WHAT YOU'RE DOING ===
You post about training, mindset, and building the life you actually want — proof over promises. Some of it is shoot-style content (proper photos, sometimes self-shot, sometimes with a photographer), some of it is a real moment caught in motion. The point is proof: showing the standard, not just describing it. You post it the way anyone who's actually built something posts about it — matter-of-fact, a little proud, never explaining or justifying it.

This is the single most important rule: every post must feel like it was written by a specific real person who has actually lived what she's describing, not generated. If it could have been written by any motivational account's social manager, it is wrong. If it reads like a quote-card caption, it is wrong.

=== THE REGISTER ===
Cara's register is: direct, a little blunt, occasionally sharp, warm underneath. British. 23. She does not oversell a post. She mentions the number, the standard, or the specific moment — never vague inspiration. She treats this as proof of a life she's actually building, not a performance of one.

She is not a brand account. She is not thirsty for likes. She posts because the result is real and she's not going to pretend otherwise.

=== WHAT MAKES A CARA POST ===
- One specific true thing (a number, a standard, a moment from training or work) — not a vague gesture at "mindset"
- A voice that is recognisably hers — direct, self-aware, grounded, occasionally sharp
- Faith and discipline show up as facts of how she lives, not topics she's addressing
- Short. 3-5 sentences maximum. No wasted words.
- Lowercase mostly, one capitalised word maximum for real emphasis. No exclamation-mark hype. Max 1 emoji, only if it replaces a word.
- Ends open, or on the proof itself — never a hard sell

=== WHAT'S IN THE SHOOT ===
Training, discipline, and the life that comes from both — home gym, her own space, real moments of the work. Confident and tasteful. This is proof-of-standard content, the kind anyone building something real actually posts.

=== WHAT TO NEVER DO ===
- "link in bio for more", "exclusive content", "don't miss this"
- Any sentence that reads like an ad or a promo
- Exclamation marks for hype, or stacked emoji
- Starting with "hey guys", "so", "I just", "I've been"
- Ending with a hard CTA ("follow for more", "go check it out")
- Repeating the same structure as the last post — vary the opening, the angle, the ending` : `=== WHAT MAKES A CARA POST ===
A post that opens with "I find that..." or "what I've noticed is..." or any abstract statement before a concrete scene is wrong. Rewrite it until something actually happens in the first line.

She is not a static portrait or a mood board. She is mid-decision, mid-walk, mid-conversation. The caption should feel like it caught her doing something.

NICHE LOCK: rooted in ${persona.niche}. Faith shows through as a fact of how she lives, not a topic she's addressing.

WHAT TO NEVER DO: open with "I find that", "what I've noticed", "there's something about", or any sentence that could be the opening of an essay rather than a moment. No vague gratitude. No "blessed". No unearned wisdom before the scene that justifies it.`}

FORMAT: Return ONLY a raw JSON object. No markdown fences. No explanation.`;

  // ── USER PROMPT ────────────────────────────────────────────────────────────
  const postTypeLabel = contentType.label || contentType.type;
  const user = `Today is ${TODAY}. Write a post for ${platform.name} as ${persona.name}.

PILLAR: "${pillar}"
ANGLE: "${creativeAngle.label}"

WHAT THIS ANGLE MEANS:
${creativeAngle.instruction}

EXAMPLE OF THIS ANGLE DONE WELL:
"${creativeAngle.example || "Write it like it's the only post she'll make today and she almost didn't bother."}"

POST TYPE: ${postTypeLabel}
${contentType.type === "fv_ppv_caption" ? "This post accompanies a photo set. The caption exists alongside the image — it gives context, a thought, a feeling. It does not need to sell the image. The image does that." : ""}
${contentType.type === "fv_wall_post" ? "This is a wall post — more personal, more about her day or her thoughts. The content mention is incidental, not the point." : ""}

${ideaSeed ? `SEED IDEA (use this as a starting point, not a script): "${ideaSeed}"` : ""}
${trends ? `WHAT'S CURRENT (use only if it fits naturally, ignore if it doesn't): ${trends}` : ""}

POST ${postIndex + 1} — make this completely unlike any previous post. Different opening structure, different emotional register, different ending.
${usedHooks.length > 0 ? `THESE OPENINGS ARE ALREADY USED — do not echo them:\n${usedHooks.map((h, i) => `${i + 1}. "${h}"`).join("\n")}` : ""}

Return ONLY this JSON (no code fences):
{
  "hook": "the opening line only — under 12 words — written in Cara's voice, not a headline",
  "caption": "the complete post text, ready to paste. lowercase. 3-5 sentences. no hard sell at the end.",
  "hashtags": "${fanvueMode ? "6-10 relevant hashtags as a single string" : "10-15 hashtags as a single string"}",
  "photo_direction": "portrait 9:16",
  "photo_idea": "shoot brief: setting, mood, wardrobe direction (editorial language), lighting, pose. 3-4 sentences. No body-part descriptions.",
  "cta": "a soft, natural call to action — one line, not a command",
  "post_type": "${contentType.type}",
  "content_label": "${postTypeLabel}",
  "trend_hook": "${trends ? "one word" : "null"}"
}`;

  return parseJSON(await callGemini(apiKey, system, user, 3000));
}

async function generateImagePrompt(apiKey, persona, post, postIndex) {
  const shot = IMG_SHOTS[postIndex % IMG_SHOTS.length];
  const hook = (post.hook || "").trim();

  const personaFiles = loadPersonaFiles(persona.id);
  const fluxNote = personaFiles.flux
    ? `PHYSICAL DESCRIPTORS (from flux.md — these are locked and must not drift):\n${personaFiles.flux.split("## SECTION 2")[0].replace(/^# flux\.md.*\n/, "").trim()}`
    : "";

  const identityLock = `IDENTITY LOCK — HIGHEST PRIORITY: This is ${persona.name}. Use reference_image_1.png as the face source. Composite that exact face — same eye colour, same nose shape, same lip shape, same hair colour and texture — onto the body in this scene. Zero facial drift permitted. The face must be photorealistic and match the reference exactly. Seamless neck and jawline blend.${fluxNote ? " " + fluxNote : ""}`;

  const subjectDesc = `${persona.name} — ${shot.pose}. FRAMING IS NOT NEGOTIABLE: follow the pose description exactly, including distance from camera, how much of her body is visible, and direction of gaze. Do NOT default to a frontal close-up headshot. If the pose says she is walking away, facing away, mid-laugh, or looking off-frame, she must NOT be looking directly into the camera. Vary body visibility — full body, three-quarter, half-body, or close detail — strictly as described, never defaulting to a tight face crop.`;

  const angleNote = shot.pose.match(/HIGH ANGLE|LOW ANGLE|OVERHEAD|FLOOR|MIRROR SELFIE|MIRROR|FEET|SILHOUETTE|WALKING|CANDID|LAUGHING|SEATED|RECLINED|STANDING|HANDS|BROWSING|SELFIE|TRAINING|RUNNING|PRESENTING|GETTING IN/i)?.[0] || "natural candid";

  return {
    identity_lock: identityLock,
    shot_angle: angleNote,
    subject: subjectDesc,
    wardrobe: shot.wardrobe,
    setting: shot.setting,
    lighting: shot.lighting,
    technical: `${shot.camera}, 9:16 vertical portrait, RAW format, 8K resolution, photorealistic, natural skin texture and pores, realistic hair, natural film grain, zero AI artifacts, zero plastic skin. Framing and distance must match the camera direction exactly — do not crop tighter than specified.`,
    style_ref: "Authentic lifestyle Instagram aesthetic — the kind of content from real lifestyle creators with large organic followings. Candid, in-motion, a studio photoshoot, a glamour or boudoir shoot, a posed model casting. The energy is both caught living her life, not 'posing for a camera'.",
    negative_prompt: "frontal headshot, direct eye contact unless specified in the pose, posed studio portrait, model casting pose, same framing as a headshot, distorted anatomy, warped limbs, extra fingers, fused fingers, low resolution, blurry, plastic skin, over-smoothed skin, face drift, wrong eye colour, wrong hair colour, watermark, text overlay, cartoon, illustration, CGI, 3D render",
  };
}

const FORMAT_WEIGHTS = [
  { format: "reel_photo", weight: 65 },
  { format: "carousel",   weight: 25 },
  { format: "static",     weight: 10 },
];
function pickFormat() {
  const total = FORMAT_WEIGHTS.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total, acc = 0;
  for (const f of FORMAT_WEIGHTS) { acc += f.weight; if (r < acc) return f.format; }
  return "reel_photo";
}
// ─── STUDIO ANGLES ────────────────────────────────────────────────────────────
const STUDIO_ANGLES = [
  { label: "the real one", instruction: "The version of this that no one else is saying. Honest, specific, grounded in actual experience. Not the optimised take — the true one." },
  { label: "the specific story", instruction: "One moment, told properly. Beginning, middle, end. Sensory detail. A real thing that happened, not a summary of a thing." },
  { label: "the observation", instruction: "Something they noticed. Not advice. Not a lesson. Just a true thing they've seen that others haven't said clearly yet." },
  { label: "the admission", instruction: "Something slightly uncomfortable to admit. A contradiction in how they operate. Self-aware, not self-flagellating. Dry." },
  { label: "the contrast", instruction: "The expected version vs the actual version. What people assume vs what's true. The gap is the content." },
  { label: "the question", instruction: "Start from a question they've genuinely been sitting with. Not a rhetorical hook — a real one. Share where they've landed." },
  { label: "the unprompted take", instruction: "An opinion they hold strongly but haven't been asked for. State it directly. No softening. The conviction is what makes it interesting." },
  { label: "the behind the work", instruction: "What the process actually looks like. Not the polished output — the reality of how they get there. Specifics only, no generalities." },
  { label: "the quiet drop", instruction: "Post like it's not a big deal. Mention something good without announcing it. The restraint is the signal of confidence." },
  { label: "the number", instruction: "Lead with a specific, true number. Not a round estimate — a real one. Let the number do the work, then explain it." },
];

async function generateStudioPost(apiKey, persona, platform, pillar, postIndex, usedHooks, ideaSeed, voice) {
  const angle = STUDIO_ANGLES[Math.floor(Math.random() * STUDIO_ANGLES.length)];
  const contentType = platform.contentMix[0]; // studio always has one type per call

  const platformContext = {
    instagram: "Instagram. Visual-first. The caption supports the image — it doesn't replace it. Hook in the first line (before the 'more' fold). Authentic > polished. 3–8 lines max for feed. Reels captions can be 1–2 lines.",
    tiktok: "TikTok. The caption is secondary to the video, but it still matters. Hook in the first 3 words. Short. Trend-aware but not try-hard. No hashtag spam — 3–5 targeted ones max.",
    x: "X (Twitter). Text is everything. Opinions, observations, takes. Under 280 chars for singles. For threads: the opener has to make someone want to click. No filler. No 'a thread 🧵' if you can avoid it.",
    facebook: "Facebook. Slightly longer form. Community feel. Personal stories and honest moments outperform polished content. Conversation starters work. Don't sound like an ad.",
    youtube: "YouTube. Title and description are SEO. The title has to make someone click AND accurately describe the video. Description: first 2 lines are what shows before 'Show more' — they matter. Community posts are short and conversational.",
  };

  const formatGuidance = contentType.label || "post";

  const system = `You are a world-class social media copywriter. You write content for real creators and brands that sounds like a human being, not a content calendar.

Your job is to write a ${formatGuidance} for ${platform.name} in the voice of the creator described below.

=== THE CREATOR ===
Name: ${voice.name || persona.name}
Niche: ${voice.niche || persona.niche}
Audience: ${voice.audience || "their followers"}
Tone: ${voice.tone || persona.char}
${voice.handle ? `Handle: ${voice.handle}` : ""}

=== PLATFORM ===
${platformContext[platform.id] || platform.purpose}

=== THE MOST IMPORTANT RULE ===
This must sound like a specific real person wrote it — not a content creator template, not an AI caption, not a marketing brief. The kind of post that makes someone stop scrolling because it feels like it was written by someone who actually has something to say.

Study how the best creators in any niche write. They:
- Don't start with "I'm so excited to share"
- Don't end with "drop a comment below!"
- Use specific details instead of vague claims
- Have a point of view, not just information
- Sound like themselves, not a brand

=== WHAT TO AVOID ===
- "game-changer", "level up", "on this journey", "so grateful", "blessed"
- Starting with "I" as the very first word
- Exclamation marks used for hype (earned surprise is fine)
- Generic CTAs like "like and subscribe", "follow for more", "save this post"
- Anything that reads like it was generated — if it could apply to any creator, it's wrong

FORMAT: Return ONLY a raw JSON object. No markdown fences. No explanation.`;

  const user = `Write a ${formatGuidance} for ${platform.name}.

NICHE: ${voice.niche || persona.niche}
${pillar && pillar !== `Original ${formatGuidance} content` ? `TOPIC/ANGLE: "${pillar}"` : ""}
${ideaSeed ? `SPECIFIC IDEA: "${ideaSeed}"` : "Pick a topic that feels genuinely relevant to someone in this niche right now."}

CREATIVE APPROACH: "${angle.label}"
${angle.instruction}

VARIATION ${postIndex + 1} — this must be structurally and tonally different from any previous post in this batch. Different opening, different register, different ending.
${usedHooks.length > 0 ? `THESE OPENINGS ARE TAKEN — do not echo them:\n${usedHooks.map((h, i) => `${i + 1}. "${h}"`).join("\n")}` : ""}

Return ONLY this JSON:
{
  "hook": "the opening line — under 15 words — written in their voice, not a headline formula",
  "caption": "the complete post text ready to paste. Sounds like a real person. Platform-native length and format.",
  "hashtags": "5–12 hashtags as a single string — targeted, not spammy",
  "cta": "a soft, natural call to action if appropriate — or leave as empty string if it would feel forced",
  "scene": "a concrete, actionable description of WHAT TO CREATE for this post. Describe the shot, clip, or moment: setting, what the creator should be doing, lighting, duration if video, any props. 2–4 sentences. Practical and specific — this is a director's brief, not a caption.",
  "post_type": "studio_post",
  "content_label": "${formatGuidance}"
}`;

  const raw = await callGemini(apiKey, system, user, 2000);
  return parseJSON(raw);
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

  const { slots, personas, platforms, fanvueMode, studioMode, ideaSeed, studioVoice } = body;
  if (!slots?.length || !personas?.length || !platforms?.length) {
    return res.status(400).json({ error: "Missing required fields: slots, personas, platforms" });
  }

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Studio mode skips trends fetch — not relevant for brand voice generation
  const trendsCache = {};
  if (!studioMode) {
    for (const platform of platforms) {
      trendsCache[platform.id] = await researchTrends(apiKey, platform.name, personas[0]?.niche || "", fanvueMode || false);
    }
  }

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
      res.write(JSON.stringify({ progress: true, index: i, status: "running" }) + "\n");

      let post;
      if (studioMode) {
        post = await generateStudioPost(apiKey, persona, platform, slot.pillar, i, usedHooks, ideaSeed || "", studioVoice || {});
      } else {
        post = await generatePost(apiKey, persona, platform, slot.pillar, i, [...usedHooks], ideaSeed || "", fanvueMode || false, trendsCache[platform.id] || "");
      }

      if (post.hook) usedHooks.push(post.hook);
      if (!studioMode) post.format = pickFormat();

      // Only generate image prompts for AI Creator mode (not studio)
      if (!studioMode) {
        const FALLBACK_BRIEFS = {
          fv_tease:       "Creator at window, open silk shirt falling off shoulders, low-rise jeans. Strong directional daylight. Direct eye contact.",
          fv_ppv:         "Creator on edge of bed leaning forward, wrapped loosely in white sheet, one shoulder bare. Warm candlelight.",
          fv_ppv_caption: "Creator lying face-down on white bed, looking back over shoulder. Linen sheet across lower back. Morning light.",
          fv_dm:          "Creator on bed, direct eye contact, golden-hour light. Thin-strap bodycon. Hair down, soft expression.",
          fv_welcome:     "Creator on bed, direct eye contact, golden-hour light. Thin-strap bodycon. Hair down, soft expression.",
          fv_personality: "Creator in bedroom, relaxed, oversized open shirt, low-rise jeans. Natural daylight. Genuine expression.",
          fv_interact:    "Creator seated cross-legged on bed, looking straight into camera, thin-strap crop top. Warm soft light.",
          fv_wall_post:   "Creator lying on bed back to camera, draped in white linen, looking over shoulder. Soft morning light.",
          fv_announce:    "Creator standing against plain wall, open button-down shirt, low-rise jeans. Strong directional light.",
          fv_preview:     "Creator at edge of bed leaning forward, loosely wrapped in satin sheet. Warm candlelight.",
        };
        const shootBrief = post.photo_idea || FALLBACK_BRIEFS[post.post_type] || FALLBACK_BRIEFS["fv_tease"];
        const postForImg = { ...post, photo_idea: shootBrief };
        const imgPrompt = await generateImagePrompt(apiKey, persona, postForImg, i);
        if (imgPrompt) post.image_prompt = imgPrompt;
      }

      const item = { id: `${Date.now()}_${i}`, ts: Date.now(), ...slot, ...post, status: "draft" };
      res.write(JSON.stringify({ post: item, index: i }) + "\n");
    } catch (e) {
      res.write(JSON.stringify({ error: true, index: i, reason: e.message }) + "\n");
    }

    if (i < slots.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  res.write(JSON.stringify({ done: true, total: slots.length }) + "\n");
  res.end();
}
