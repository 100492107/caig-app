// api/cara-config.js
// Multi-persona visual identity - Cara Whitmore + Lila Sterling
// nano-banana-2 (fal.ai) reference-image editing is the primary pipeline.

export const FAL_EDIT_MODEL = "fal-ai/nano-banana-2/edit";
export const FAL_EDIT_QUEUE_URL = `https://queue.fal.run/${FAL_EDIT_MODEL}`;
export const FAL_EDIT_REQUESTS_BASE = `https://queue.fal.run/${FAL_EDIT_MODEL.replace("/edit", "")}/requests`;
export const IMAGE_SIZE_9x16 = { width: 1080, height: 1920 };
export const CARA_IMAGE_SIZE = IMAGE_SIZE_9x16;

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

export const CARA_LORA = {
  path: "https://v3b.fal.media/files/b/0aa58574/6hWDSoNLAhVr4ndSlXbEt_pytorch_lora_weights.safetensors",
  scale: 1,
};
export const CARA_TRIGGER = "Cara";

export const CARA_IDENTITY_LOCK = `IDENTITY LOCK - HIGHEST PRIORITY, ZERO DEVIATION ALLOWED:
This is Cara Whitmore. Use the provided reference images as the exact face and identity source. Composite that precise face onto the body/scene described - do not blend, average, or drift toward a generic face.

EYES: Vivid, saturated GREEN - defining, non-negotiable. Medium-set, clear iris definition. Must read unmistakably green in every lighting condition. NEVER grey, hazel-brown, blue, or dull.
EYEBROWS: Thick, dark brown, straight-to-softly-arched, natural (not thin, not overplucked).
HAIR: Dark brown, long (past shoulders), natural loose waves - never straight, never black, never fully blonde.
SKIN: Warm olive/tan undertone. Light freckles across nose and upper cheeks in bright light - must be present. Natural texture, not airbrushed.
FACE SHAPE: Oval, softly angular jaw, straight nose, fuller soft pink-nude lips. Resting expression calm/direct.
JEWELLERY: Small gold hoop or huggie earrings. Layered thin gold necklaces - gold cross pendant + often gold coin pendant - visible when neck/chest in frame. Signature, non-negotiable.
BUILD: Slim, toned, natural athletic.
CRITICAL: Facial structure, eye colour, freckle pattern must match references exactly. Zero facial drift.`;

export const CARA_NEGATIVE_PROMPT = `plastic skin, porcelain skin, airbrushed skin, beauty filter, over-smoothed skin, flawless skin, wax skin, CGI skin, doll-like face, generic AI face, face drift, wrong eye colour, grey eyes, washed out eyes, blue eyes, brown eyes, straight hair, black hair, fully blonde hair, missing freckles, missing gold jewellery, missing cross pendant, thin eyebrows, studio softbox lighting, glossy magazine finish, cartoon, CGI, 3D render, text, watermark, logo, extra fingers, extra limbs, mutated hands, blurry face, different person, Lila Sterling face, blonde waves as primary hair`;

export const CARA_SELFIE_ANATOMY_GUIDANCE = `SELFIE ANATOMY GUIDANCE:
- Exactly one phone, held naturally in one hand with five correctly proportioned fingers. No extra or fused fingers, no floating phone.
- Arm holding the phone has natural foreshortening.
- Mirror/glass: reflection shows the same single phone and matching hand. No duplicate phones, no extra person in glass.
- Face stays clearly visible unless deliberate lower-face crop (eyes/upper face still visible).
- Other hand, if visible, has five correct fingers.`;

export const CARA_UGC_STILL_CORE = `Ultra-realistic mobile front-camera selfie of Cara Whitmore (identity LOCKED to reference images - do not change face, freckles, green eyes, dark-brown wavy hair, or gold layered chains with cross and coin).
Candid lifestyle UGC, vertical 9:16, half-body or close-up, short distance, slight wide-angle phone distortion. She is documenting her life, not posing for a brand.
Real skin texture: visible pores, natural under-eye, freckles, no beauty filter, no plastic skin.
Expression: mid-thought or soft direct gaze at phone lens, micro-imperfection, not a model smile.
Setting: lived-in home, hotel, bathroom mirror, or casual outdoor - one imperfect background detail. Background slightly soft. No clean studio.
Lighting: named only - phone fill / window left / lamp behind / golden hour. Never studio softbox.
Photography: authentic mobile selfie, slight grain if low light, shallow DOF, native phone look.
Quality: 4K ultra-clear, ultra-detailed, sharp iris catchlights, pore-level skin, fabric weave visible — photoreal not AI-soft.
Model pipeline: nano-banana-2 edit with reference identity lock.
No text, no logos, no watermarks.`;

// Upload Lila solo refs to Supabase and paste public URLs here (8-12 shots, no Cara in frame).
export const LILA_REFS = [
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_1.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_2.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_3.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_4.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_5.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_6.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_7.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_8.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_9.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_10.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_11.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_12.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_13.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_14.jpeg",
];

export const LILA_TRIGGER = "Lila";

export const LILA_IDENTITY_LOCK = `IDENTITY LOCK - HIGHEST PRIORITY, ZERO DEVIATION ALLOWED:
This is Lila Sterling. Use the provided reference images as the exact face and identity source. Composite that precise face onto the body/scene described - do not blend toward Cara or a generic blonde face.

EYES: Blue-green, calm and composed - clear, cool-warm mix, not pure blue, not pure green, not brown. Steady gaze.
EYEBROWS: Soft, naturally arched, medium-blonde/taupe, not heavy, not drawn-on.
HAIR: Sun-lightened blonde natural waves, soft with movement, shoulder-to-mid length energy. Never dark brown, never black, never tight curls, never severe straight.
SKIN: Warm golden tan, healthy and even. Natural texture, light freckles optional but subtle. No olive-heavy Cara undertone.
FACE SHAPE: Soft oval, balanced features, refined nose, natural lips. Resting expression composed, serene - not wide performative smile by default.
JEWELLERY: Small simple gold hoop earrings ONLY. No cross pendant, no coin pendant, no layered chain stack. Keep neck clean except optional single fine chain if scene requires - default is hoops only.
BUILD: Lean graceful, gymnast / horse-riding physique with attractive curves. Long lines, not bulky.
CRITICAL: Must read as Lila, not Cara. Blonde waves + blue-green eyes + gold hoops + golden tan are the non-negotiable cluster. Zero facial drift.`;

export const LILA_NEGATIVE_PROMPT = `plastic skin, porcelain skin, airbrushed skin, beauty filter, over-smoothed skin, CGI skin, doll-like face, generic AI face, face drift, dark brown hair, black hair, vivid emerald green eyes as primary, heavy freckle pattern like Cara, gold cross pendant, gold coin pendant, layered chain stack, thick dark eyebrows, studio softbox lighting, glossy magazine finish, loud patterns, neon colours, bright saturated wardrobe, cartoon, CGI, 3D render, text, watermark, logo, extra fingers, extra limbs, mutated hands, blurry face, different person, Cara Whitmore face, dark wavy hair`;

export const LILA_SELFIE_ANATOMY_GUIDANCE = CARA_SELFIE_ANATOMY_GUIDANCE;

export const LILA_UGC_STILL_CORE = `Ultra-realistic mobile front-camera selfie of Lila Sterling (identity LOCKED to reference images - do not change face, blue-green eyes, sun-lightened blonde natural waves, warm golden tan, or small simple gold hoop earrings).
Candid lifestyle UGC, vertical 9:16, half-body or close-up, short distance, slight wide-angle phone distortion. She is documenting her life, not posing for a brand.
Real skin texture: visible pores, natural under-eye, healthy even tan, no beauty filter, no plastic skin.
Expression: composed, calm, thoughtful - soft gaze at lens or slight glance away. Serene energy, not performative.
Wardrobe: minimalist elevated - white, cream, ivory, sage, soft neutrals only. Clean lines. Swimwear only simple white/cream/neutral. Never loud patterns or bright colours.
Setting: lived-in or sunlit casual (terrace, bedroom, beach towel, hotel) - one imperfect detail. No clean studio.
Lighting: named only - window left / golden hour / phone fill / open shade. Never studio softbox.
Photography: authentic mobile selfie, natural grain if needed, shallow DOF, native phone look.
Quality: 4K ultra-clear, ultra-detailed, sharp iris catchlights, pore-level skin, fabric weave visible — photoreal not AI-soft.
Model pipeline: nano-banana-2 edit with reference identity lock.
No text, no logos, no watermarks.`;

export const UGC_MOTION_BRIEF = `Use the first frame as exact identity reference. Match the subject face and body exactly.
Camera: handheld phone selfie / chest-up or mid-shot, natural micro-shakes, 9:16, normal speed (not slow-mo).
Audio intent: phone-mic presence, room tone only. No music bed. No voiceover slogan.
Timing: open mid-moment; body with natural blinks, one gaze break, one micro pause, one posture shift; end trails off or interrupted. No slogan ending.
Behavioral beats (pick 2-3): glance away, adjust phone grip, half-smile at own thought, shrug, react to off-screen sound.
Always: real skin texture, no beauty filter, lips natural, imperfect presence.`;

export function getPersonaVisual(personaId = "cara") {
  const id = (personaId || "cara").toLowerCase();
  if (id === "lila" || id === "lila_sterling") {
    return {
      id: "lila",
      name: "Lila Sterling",
      refs: LILA_REFS,
      identityLock: LILA_IDENTITY_LOCK,
      negative: LILA_NEGATIVE_PROMPT,
      selfieGuidance: LILA_SELFIE_ANATOMY_GUIDANCE,
      ugcStillCore: LILA_UGC_STILL_CORE,
      trigger: LILA_TRIGGER,
      storagePrefix: "lila",
    };
  }
  return {
    id: "cara",
    name: "Cara Whitmore",
    refs: CARA_REFS,
    identityLock: CARA_IDENTITY_LOCK,
    negative: CARA_NEGATIVE_PROMPT,
    selfieGuidance: CARA_SELFIE_ANATOMY_GUIDANCE,
    ugcStillCore: CARA_UGC_STILL_CORE,
    trigger: CARA_TRIGGER,
    storagePrefix: "cara",
  };
}
