// api/cara-config.js
// Single source of truth for Cara's identity — reference-image editing via
// nano-banana-2/edit is the primary pipeline. LoRA config kept below but
// UNUSED by the runtime pipeline — retained only in case you want to
// regenerate a fresh reference set from it later.

// ⚠️ FILL IN: paste the 10 public URLs here once uploaded to Supabase Storage
// (or any public host). Order doesn't matter. Do NOT include the two
// blonde/back-facing beach images — different person, breaks identity lock.
export const CARA_REFS = [
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_1.jpg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_2.jpg",
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

export const FAL_EDIT_MODEL = "fal-ai/nano-banana-2/edit";
export const FAL_EDIT_QUEUE_URL = `https://queue.fal.run/${FAL_EDIT_MODEL}`;
export const FAL_EDIT_REQUESTS_BASE = `https://queue.fal.run/${FAL_EDIT_MODEL.replace("/edit", "")}/requests`;

export const CARA_IMAGE_SIZE = { width: 1080, height: 1920 }; // 9:16 vertical

// ─── ULTRA-SPECIFIC IDENTITY LOCK ──────────────────────────────────────────
// Built directly off the 10 approved reference photos. Every descriptor below
// is something actually visible across multiple refs, not generic filler.
// If you retrain or swap refs, re-derive this from the new photos — don't
// just tweak wording, re-verify against what's actually in the images.
export const CARA_IDENTITY_LOCK = `IDENTITY LOCK — HIGHEST PRIORITY, ZERO DEVIATION ALLOWED:
This is Cara Whitmore (19, British model). Use the provided reference images as the exact face and identity source. Composite that precise face onto the body/scene described below — do not blend, average, or drift toward a generic face.

FACIAL FEATURES (PIXEL REFERENCE EXACT MATCH TO REFS):
EYES: Green, clear hazel-green with visible definition around the iris. Never blue, brown, or grey.
EYEBROWS: Thick, dark brown, natural, straight-to-softly-arched.
HAIR: Dark brown, long (past shoulders), natural loose waves/curls.
SKIN: Warm olive/sun-kissed tone. Natural freckles visible across nose and upper cheeks. Natural skin texture.
FACE SHAPE: Defined jawline, straight nose, full naturally pigmented lips in a soft rose tone.
JEWELLERY: Small gold hoop earrings and signature thin gold chain with a cross pendant (always present when neck/chest is visible).
BUILD: Slim, toned, athletic model build.

CRITICAL IDENTITY RULE: Maintain exact face shape, eye color, and freckle pattern across every generation. Zero facial drift allowed.`;
export const CARA_NEGATIVE_PROMPT = `plastic skin, porcelain skin, airbrushed skin, beauty filter, over-smoothed skin, wax skin, CGI skin, doll-like face, generic AI face, face drift, wrong eye colour, blue eyes, brown eyes, straight hair, black hair, blonde hair, missing freckles, missing gold cross pendant, thin eyebrows, studio softbox lighting, over-lit, cartoon, CGI, 3D render, watermark, text, logo, disfigured, extra fingers, mutated hands, blurry face, low resolution face, different person, inconsistent identity, mirror selfie outdoors, mirror selfie in public`;
