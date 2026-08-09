// api/cara-config.js
// Single source of truth for Cara's identity — reference-image editing via
// nano-banana-2 (fal.ai) is the primary pipeline.

// ⚠️ Two entries below (yacht sunbed, car selfie) were NOT part of the original
// verified set. If face drifts or looks "off", remove those two first before
// touching anything else.
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

// Kept for reference / future retraining only — NOT used by the live pipeline.
export const CARA_LORA = {
  path: "https://v3b.fal.media/files/b/0aa58574/6hWDSoNLAhVr4ndSlXbEt_pytorch_lora_weights.safetensors",
  scale: 1,
};
export const CARA_TRIGGER = "Cara";

// ── IMAGE MODEL: nano-banana-2 (fal.ai) ─────────────────────────────────────
export const FAL_EDIT_MODEL = "fal-ai/nano-banana-2/edit";
export const FAL_EDIT_QUEUE_URL = `https://queue.fal.run/${FAL_EDIT_MODEL}`;
export const FAL_EDIT_REQUESTS_BASE = `https://queue.fal.run/${FAL_EDIT_MODEL.replace("/edit", "")}/requests`;

export const CARA_IMAGE_SIZE = { width: 1080, height: 1920 }; // 9:16 vertical

// ─── ULTRA-SPECIFIC IDENTITY LOCK ──────────────────────────────────────────
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

export const CARA_SELFIE_ANATOMY_GUIDANCE = `SELFIE ANATOMY GUIDANCE — critical for phone-in-hand and reflective glass shots:
- Exactly one phone, held naturally in one hand with five correctly proportioned fingers gripping it. No extra or fused fingers, no floating or duplicated phone.
- The arm holding the phone should have natural, anatomically correct foreshortening, not an impossibly long or bent arm.
- In reflective glass/mirror shots: the reflection must show the same single phone and matching hand position as the real hand. No duplicate phones, no mismatched reflection, no extra person visible in the glass.
- Face stays clearly visible and unobscured by the phone, unless deliberately raised for a close lower-face crop, in which case eyes and upper face remain visible.
- Standard rectangular smartphone silhouette. No warped, curved, or oversized phone body.
- The other hand, if visible in frame, also has five correctly proportioned fingers.`;
