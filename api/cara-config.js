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
//
// SKIN/MAKEUP NOTE: previously this pushed hard on "unfiltered, not airbrushed,
// mild film grain" to avoid plastic-AI skin — but that instruction was fighting
// the reference images themselves if the refs show groomed/made-up skin, and
// text instructions can out-compete reference-image influence in edit models.
// The rule now is simpler and more reliable: match the reference finish
// exactly, whatever it is, rather than pushing toward "raw" by default.
export const CARA_IDENTITY_LOCK = `IDENTITY LOCK — HIGHEST PRIORITY, ZERO DEVIATION ALLOWED:
This is Cara. Use the provided reference images as the exact face, identity, and finish source. Composite that precise face onto the body/scene described below — do not blend, average, or drift toward a generic face.

EYES: Green, leaning hazel-green in some lighting, medium-set, with visible definition around the iris. Never blue, never brown, never grey.
EYEBROWS: Thick, dark brown, straight-to-softly-arched, natural (not thin, not overplucked, not drawn-on).
HAIR: Dark brown, long (past shoulders), natural loose waves/curls — never straight, never black, never blonde or lightened throughout (warm brown/caramel highlights only where light catches it naturally).
SKIN & MAKEUP: Match the exact skin finish, tone, and makeup level shown in the reference images — do not add a "natural/unfiltered/no-makeup" look if the references show more polished, made-up skin, and do not add heavy polish if the references show bare skin. Light freckles visible across the nose and upper cheeks where the references show them. The goal is an exact match to the reference finish, not a generic "realistic" or "raw" style imposed on top of it.
FACE SHAPE: Oval face, softly angular jaw, straight nose, fuller lips in a soft pink-nude tone. Resting expression is calm/direct, not a wide smile by default.
JEWELLERY: Small gold hoop or huggie earrings, worn consistently. Layered thin gold necklaces — at minimum a gold cross pendant, often paired with a small gold coin pendant — visible whenever the neck/chest area is in frame. This is a signature, non-negotiable detail.
BUILD: Slim, toned, natural athletic build.

CRITICAL: Facial structure, eye color, freckle pattern, and skin/makeup finish must match the reference images exactly. Zero facial drift between generations — this must look like the same real person in every image, not a family resemblance.`;

export const CARA_NEGATIVE_PROMPT = `plastic skin, porcelain skin, over-smoothed skin, wax skin, CGI skin, doll-like face, generic AI face, face drift, wrong eye colour, blue eyes, brown eyes, straight hair, black hair, blonde hair, missing freckles, missing gold jewellery, missing cross pendant, thin eyebrows, drawn-on eyebrows, studio softbox lighting, over-lit, glossy magazine finish, symmetrical posed model casting, cartoon, CGI, 3D render, illustration, text, watermark, logo, nudity, disfigured, blurry face, low resolution face, different person, inconsistent identity between shots, extra fingers, fused fingers, missing fingers, extra hands, extra arms, extra limbs, three arms, disconnected limbs, floating limbs, elongated arms, stretched arms, unnaturally long arms, arm bending at wrong angle, malformed hand, deformed hand, mutated hands, incorrect hand anatomy, wrong number of fingers, distorted body proportions, warped perspective, phone merging into hand, phone floating disconnected from hand`;

// ─── SELFIE / MIRROR-SELFIE ANATOMY GUIDANCE ───────────────────────────────
// Selfie and mirror-selfie poses are the single biggest source of anatomy
// errors in edit models — rendering an arm reaching toward camera, a phone,
// and (for mirror shots) a reflected arm and phone all at once is a hard
// geometry problem, and the model often "solves" it by inventing an extra
// limb or over-stretching the arm. Append this whenever a selfie/mirror
// framing is used, instead of leaving the model to improvise the geometry.
export const CARA_SELFIE_ANATOMY_GUIDANCE = `SELFIE / PHONE ANATOMY (must follow exactly):
One arm only, bent naturally at the elbow, phone held close to the body — never fully extended, never reaching far out of frame. The hand holding the phone shows natural grip. The other arm rests naturally at her side or in frame doing something ordinary (not holding anything else). Do not show the phone screen. For mirror selfies: the reflection shows the same single arm and phone, in the same natural bent position — not a second, differently-posed arm. If in doubt, favour a simpler, closer crop over a complex full-body selfie angle — a tighter, simpler shot is far less likely to distort anatomy than an ambitious full-length one.`;
