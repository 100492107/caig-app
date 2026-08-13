// api/cara-config.js
// Multi-persona visual identity — Cara Whitmore + Lila Sterling
// Primary pipeline: Grok Imagine Image 2.0 (fal.ai) with reference images

export const FAL_EDIT_MODEL = "xai/grok-imagine-image/v2.0/edit";
export const FAL_EDIT_QUEUE_URL = `https://queue.fal.run/${FAL_EDIT_MODEL}`;
export const FAL_EDIT_REQUESTS_BASE = "https://queue.fal.run/xai/grok-imagine-image/v2.0/requests";
export const IMAGE_SIZE_9x16 = { width: 1080, height: 1920 };
export const CARA_IMAGE_SIZE = IMAGE_SIZE_9x16;
export const GROK_RESOLUTION = "2k";

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

// Grok edit: send first 3 refs for identity lock
export function refsForSubmit(refs) {
  return (refs || []).slice(0, 3);
}

export const CARA_TRIGGER = "Cara";

export const CARA_IDENTITY_LOCK = `IDENTITY LOCK — HIGHEST PRIORITY:
Purely fictional adult woman. Match the provided reference images EXACTLY for face, body, skin, hair, freckles, mole, jewellery, and proportions — pixel-level consistency with the references. Do not blend, average, or invent a different face. Do not change eye colour, brow shape, hair colour, or facial structure away from the references.
Jewellery from refs (gold hoops, layered gold chains with cross/coin when visible) must appear when neck/chest is in frame.
Slim athletic natural build matching refs.
Zero facial drift between generations.`;

export const CARA_NEGATIVE_PROMPT = `plastic skin, porcelain skin, airbrushed skin, beauty filter, over-smoothed skin, CGI skin, doll-like face, generic AI face, face drift, different person from references, wrong identity, celebrity likeness, underage, text, watermark, logo, extra fingers, extra limbs, mutated hands, blurry face, transparent fabric, full nudity, genitals`;

export const CARA_SELFIE_ANATOMY_GUIDANCE = `SELFIE ANATOMY:
- One phone, natural grip, five correct fingers. No extra/fused fingers, no floating phone.
- Natural arm foreshortening.
- Mirror shots: reflection matches the same single phone and hand.
- Face visible unless deliberate crop; eyes/upper face remain readable when cropped low.`;

export const CARA_UGC_STILL_CORE = `Ultra-realistic mobile photograph of a purely fictional adult woman. Face and body LOCKED to the reference images — match references exactly, do not alter identity.
Candid lifestyle / model UGC, vertical 9:16 preferred. Real skin texture, visible pores, no beauty filter, no plastic skin.
Expression natural: soft direct gaze or mid-thought, not a stiff model smile.
Private or lived-in settings. Named natural light only (window, phone fill, golden hour, lamp). No studio softbox.
Quality: 4K ultra-clear, photoreal, fabric and skin detail visible.
No text, no logos, no watermarks.`;

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

export const LILA_IDENTITY_LOCK = `IDENTITY LOCK — HIGHEST PRIORITY:
Purely fictional adult woman. Match the provided reference images EXACTLY for face, body, skin, hair, and proportions — pixel-level consistency with the references. Do not blend toward any other identity or a generic face.
From refs: sun-lightened blonde natural waves, blue-green calm eyes, warm golden tan, lean graceful build, small simple gold hoop earrings only (no cross, no coin stack).
Zero facial drift. Must read as the same person as the Lila reference set.`;

export const LILA_NEGATIVE_PROMPT = `plastic skin, porcelain skin, airbrushed skin, beauty filter, CGI skin, doll-like face, face drift, dark brown hair, black hair, gold cross pendant, gold coin pendant, layered chain stack, different person from references, celebrity likeness, underage, text, watermark, logo, extra fingers, extra limbs, mutated hands, blurry face, transparent fabric, full nudity, genitals, loud neon wardrobe`;

export const LILA_SELFIE_ANATOMY_GUIDANCE = CARA_SELFIE_ANATOMY_GUIDANCE;

export const LILA_UGC_STILL_CORE = `Ultra-realistic mobile photograph of a purely fictional adult woman. Face and body LOCKED to the Lila reference images — match references exactly.
Candid lifestyle UGC, vertical 9:16 preferred. Real skin, no beauty filter, no plastic skin.
Composed, calm expression. Wardrobe bias: white, cream, ivory, sage, soft neutrals; minimal swim in same palette.
Named natural light only. No studio softbox.
Quality: 4K ultra-clear, photoreal.
No text, no logos, no watermarks.`;

export const UGC_MOTION_BRIEF = `Use the first frame as exact identity reference. Match face and body exactly.
Camera: handheld phone, chest-up or mid-shot, natural micro-shake, 9:16, normal speed.
Motion: open mid-moment; natural blink, one gaze break, one micro pause, one posture shift; end unresolved.
Real skin texture, no beauty filter, imperfect presence.`;

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
