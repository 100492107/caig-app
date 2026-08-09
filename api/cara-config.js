// api/cara-config.js
// Single source of truth for Cara's identity — reference-image editing via
// GPT Image 2 (fal.ai) is the primary pipeline. LoRA config kept below but
// UNUSED by the runtime pipeline — retained only in case you want to
// regenerate a fresh reference set from it later.

// ⚠️ Two entries below (yacht sunbed, car selfie) are NOT part of the original
// 10 verified reference photos — confirm these are actually Cara before relying
// on them. Unverified refs broke identity lock once before (the blonde photos).
export const CARA_REFS = [
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_1.jpg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_2.jpg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_2.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Woman_reclining_on_yacht_sunbed_202607271359.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Woman_taking_car_selfie_2K_202607271357.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_3.jpg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_4.jpg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_5.jpg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_6.jpg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_7.png",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_8.png",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_9.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_10.jpeg",
];

// Kept for reference / future retraining use only — NOT called by generate-submit.js
// or cron-generate.js while CARA_REFS-based editing is the active pipeline.
export const CARA_LORA = {
  path: "https://v3b.fal.media/files/b/0aa58574/6hWDSoNLAhVr4ndSlXbEt_pytorch_lora_weights.safetensors",
  scale: 1,
};
export const CARA_TRIGGER = "Cara";

// ── IMAGE MODEL: GPT Image 2 (OpenAI, via fal.ai) ──────────────────────────
// Switched from fal-ai/nano-banana-2/edit. No safety_tolerance param exists on
// this endpoint — moderation is OpenAI's own and is NOT configurable here.
// Expect a higher rejection rate on high-skin-exposure content than nano-banana.
export const FAL_EDIT_MODEL = "openai/gpt-image-2/edit";
export const FAL_EDIT_QUEUE_URL = `https://queue.fal.run/${FAL_EDIT_MODEL}`;
export const FAL_EDIT_REQUESTS_BASE = `https://queue.fal.run/${FAL_EDIT_MODEL.replace("/edit", "")}/requests`;

// GPT Image 2 requires custom width/height to both be multiples of 16 — the old
// 1080x1920 (1080 is NOT a multiple of 16) would be rejected. Using the built-in
// portrait_16_9 preset instead avoids that entirely and is close enough to 9:16.
export const CARA_IMAGE_SIZE = "portrait_16_9";

// Quality tiers: auto | low | medium | high. High matches the fidelity you were
// getting before but costs more per image ($8/$30 per 1M image tokens in/out at
// high, per fal's pricing) — drop to "medium" if cost becomes a concern.
export const CARA_IMAGE_QUALITY = "high";

// ─── ULTRA-SPECIFIC IDENTITY LOCK ──────────────────────────────────────────
// Built directly off the 10 approved reference photos. Every descriptor below
// is something actually visible across multiple refs, not generic filler.
// If you retrain or swap refs, re-derive this from the new photos — don't
// just tweak wording, re-verify against what's actually in the images.
export const CARA_IDENTITY_LOCK = `IDENTITY LOCK — HIGHEST PRIORITY, ZERO DEVIATION ALLOWED:
This is Cara. Use the provided reference images CARA_REFS as the exact face and identity source. Composite that precise face onto the body/scene described below — do not blend, average, or drift toward a generic face. PIXEL RATIO 1:1, TRUE EXACT IDENTITY LOCK.

EYES: Vivid, saturated GREEN — this is a defining, non-negotiable trait. Medium-set, with clear definition around the iris. Must read as unmistakably green in every lighting condition, including overcast, indoor, and low-contrast light. NEVER grey, NEVER washed out, NEVER hazel-brown, NEVER blue, NEVER dull or desaturated — if the lighting is flat or grey, the eyes must still hold their green saturation, not fade toward the ambient tone.
EYEBROWS: Thick, dark brown, straight-to-softly-arched, natural (not thin, not overplucked, not drawn-on).
HAIR: Dark brown, long (past shoulders), natural loose waves/curls — never straight, never black, never blonde or lightened throughout (warm brown/caramel highlights only where light catches it naturally).
SKIN: Warm olive/tan undertone. Light freckles visible across the nose and upper cheeks in bright/natural light — must be present, not smoothed away. Natural texture, not airbrushed.
FACE SHAPE: Oval face, softly angular jaw, straight nose, fuller lips in a soft pink-nude tone. Resting expression is calm/direct, not a wide smile by default.
JEWELLERY: Small gold hoop or huggie earrings, worn consistently. Layered thin gold necklaces — at minimum a gold cross pendant, often paired with a small gold coin pendant — visible whenever the neck/chest area is in frame. This is a signature, non-negotiable detail.
BUILD: Slim, toned, natural athletic build.

CRITICAL: Facial structure, eye color, and freckle pattern must match the reference images exactly. Zero facial drift between generations — this must look like the same real person in every image, not a family resemblance.`;

export const CARA_NEGATIVE_PROMPT = `plastic skin, porcelain skin, airbrushed skin, beauty filter, over-smoothed skin, flawless skin, wax skin, CGI skin, doll-like face, generic AI face, face drift, wrong eye colour, grey eyes, washed out eyes, dull eyes, desaturated eyes, blue eyes, brown eyes, straight hair, black hair, blonde hair, missing freckles, missing gold jewellery, missing cross pendant, thin eyebrows, drawn-on eyebrows, studio softbox lighting, over-lit, glossy magazine finish, symmetrical posed model casting, cartoon, CGI, 3D render, illustration, text, watermark, logo, nudity, disfigured, extra fingers, extra limbs, mutated hands, blurry face, low resolution face, different person, inconsistent identity between shots`;

// Extra guidance appended only for selfie / reflective-glass framed shots — these
// are the frame types most prone to AI hand/phone artifacts, so they get a
// dedicated anatomy note on top of the general identity lock and negative prompt.
export const CARA_SELFIE_ANATOMY_GUIDANCE = `SELFIE ANATOMY GUIDANCE — critical for phone-in-hand and reflective glass shots:
- Exactly one phone, held naturally in one hand with five correctly proportioned fingers gripping it. No extra or fused fingers, no floating or duplicated phone.
- The arm holding the phone should have natural, anatomically correct foreshortening, not an impossibly long or bent arm.
- In reflective glass/mirror shots: the reflection must show the same single phone and matching hand position as the real hand. No duplicate phones, no mismatched reflection, no extra person visible in the glass.
- Face stays clearly visible and unobscured by the phone, unless deliberately raised for a close lower-face crop, in which case eyes and upper face remain visible.
- Standard rectangular smartphone silhouette. No warped, curved, or oversized phone body.
- The other hand, if visible in frame, also has five correctly proportioned fingers.`;
