// api/cara-config.js
// Multi-persona visual identity — Cara Whitmore + Lila Sterling
// Primary pipeline: Grok Imagine Image 2.0 (fal.ai) with reference images

export const FAL_EDIT_MODEL = "xai/grok-imagine-image/v2.0/edit";
export const FAL_EDIT_QUEUE_URL = `https://queue.fal.run/${FAL_EDIT_MODEL}`;
// MUST include /edit — status/result live under the full endpoint id
export const FAL_EDIT_REQUESTS_BASE = "https://queue.fal.run/xai/grok-imagine-image/v2.0/edit/requests";
export const IMAGE_SIZE_9x16 = { width: 1080, height: 1920 };
export const CARA_IMAGE_SIZE = IMAGE_SIZE_9x16;
export const GROK_RESOLUTION = "2k";

// Exact files in Supabase buckets (cara ref / lila ref) — always sent on every job
export const CARA_REFS = [
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_5.jpg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_7.png",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_8.png",
];

export const LILA_REFS = [
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_2.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_10.jpeg",
  "https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_12.jpeg",
];

// Grok edit: max 3 refs
export function refsForSubmit(refs) {
  return (refs || []).slice(0, 3);
}

export const CARA_TRIGGER = "Cara";

export const CARA_IDENTITY_LOCK = `IDENTITY LOCK — HIGHEST PRIORITY:
Purely fictional adult woman. Match the provided reference images EXACTLY for face, body, skin, hair, freckles, mole, jewellery, and proportions — pixel-level consistency with the references. Do not blend, average, or invent a different face. Do not change eye colour, brow shape, hair colour, or facial structure away from the references.
SKIN (CRITICAL): Reproduce real human skin from the references — visible pores, natural texture variation, subtle uneven tone, fine peach fuzz where present in refs. No beauty filter, no airbrush, no porcelain, no waxy or plastic CGI skin, no over-smoothed cheeks or forehead.
Jewellery from refs (gold hoops, layered gold chains with cross/coin when visible) must appear when neck/chest is in frame.
Slim athletic natural build matching refs.
Zero facial drift between generations.`;

export const CARA_NEGATIVE_PROMPT = `plastic skin, porcelain skin, airbrushed skin, beauty filter, over-smoothed skin, waxy skin, glossy skin, CGI skin, 3D render skin, doll-like face, mannequin skin, generic AI face, face drift, different person from references, wrong identity, celebrity likeness, underage, text, watermark, logo, extra fingers, extra limbs, mutated hands, blurry face, soft-focus beauty glow, HD smooth skin, facetune, transparent fabric, full nudity, genitals`;

export const CARA_SELFIE_ANATOMY_GUIDANCE = `SELFIE ANATOMY:
- One phone, natural grip, five correct fingers. No extra/fused fingers, no floating phone.
- Natural arm foreshortening.
- Mirror shots: reflection matches the same single phone and hand.
- Face visible unless deliberate crop; eyes/upper face remain readable when cropped low.`;

export const CARA_UGC_STILL_CORE = `Ultra-realistic mobile photograph of a purely fictional adult woman. Face and body LOCKED to the reference images — match references exactly, do not alter identity.
Candid lifestyle / model UGC, vertical 9:16 preferred.
SKIN MUST LOOK HUMAN: visible pores on nose and cheeks, natural micro-texture, slight unevenness, real subsurface variation — like an unretouched phone photo. Strictly forbid plastic, waxy, porcelain, airbrushed, or beauty-filtered skin.
Expression natural: soft direct gaze or mid-thought, not a stiff model smile.
Private or lived-in settings. Named natural light only (window, phone fill, golden hour, lamp). No studio softbox. No beauty dish glow.
Quality: 4K ultra-clear photoreal phone capture. Fabric weave and skin detail both readable.
No text, no logos, no watermarks.`;

export const LILA_TRIGGER = "Lila";

export const LILA_IDENTITY_LOCK = `IDENTITY LOCK — HIGHEST PRIORITY:
Purely fictional adult woman. Match the provided reference images EXACTLY for face, body, skin, hair, and proportions — pixel-level consistency with the references. Do not blend toward any other identity or a generic face.
SKIN (CRITICAL): Real human skin from the Lila references — visible pores, natural texture, warm golden-tan variation. No beauty filter, no airbrush, no porcelain, no waxy or plastic CGI skin.
From refs: sun-lightened blonde natural waves, blue-green calm eyes, warm golden tan, lean graceful build, small simple gold hoop earrings only (no cross, no coin stack).
Zero facial drift. Must read as the same person as the Lila reference set.`;

export const LILA_NEGATIVE_PROMPT = `plastic skin, porcelain skin, airbrushed skin, beauty filter, over-smoothed skin, waxy skin, glossy skin, CGI skin, 3D render skin, doll-like face, mannequin skin, face drift, dark brown hair, black hair, gold cross pendant, gold coin pendant, layered chain stack, different person from references, celebrity likeness, underage, text, watermark, logo, extra fingers, extra limbs, mutated hands, blurry face, soft-focus beauty glow, HD smooth skin, facetune, transparent fabric, full nudity, genitals, loud neon wardrobe`;

export const LILA_SELFIE_ANATOMY_GUIDANCE = CARA_SELFIE_ANATOMY_GUIDANCE;

export const LILA_UGC_STILL_CORE = `Ultra-realistic mobile photograph of a purely fictional adult woman. Face and body LOCKED to the Lila reference images — match references exactly.
Candid lifestyle UGC, vertical 9:16 preferred.
SKIN MUST LOOK HUMAN: visible pores, natural micro-texture, golden-tan variation from refs — unretouched phone photo, not beauty campaign. No plastic, waxy, porcelain, or airbrushed skin.
Composed, calm expression. Wardrobe bias: white, cream, ivory, sage, soft neutrals; minimal swim in same palette.
Named natural light only. No studio softbox. No beauty dish glow.
Quality: 4K ultra-clear photoreal phone capture.
No text, no logos, no watermarks.`;

export const UGC_MOTION_BRIEF = `Use the first frame as exact identity reference. Match face and body exactly.
Camera: handheld phone, chest-up or mid-shot, natural micro-shake, 9:16, normal speed.
Motion: open mid-moment; natural blink, one gaze break, one micro pause, one posture shift; end unresolved.
Real skin texture, no beauty filter, imperfect presence.`;

export const DUO_REFS = [CARA_REFS[0], LILA_REFS[0]];

export const DUO_IDENTITY_LOCK = `IDENTITY LOCK — HIGHEST PRIORITY:
When the cast is BOTH, generate two distinct fictional adult women together: Cara Whitmore and Lila Sterling. Never blend them into one face. Cara must match Cara references exactly: bright green eyes, dark brown natural waves, freckles, slim athletic build, Cara jewellery from refs. Lila must match Lila references exactly: blue-green calm eyes, sun-lightened blonde natural waves, warm golden-tan skin, lean graceful build, simple gold hoops only. Preserve distinct facial structure, hair, skin tone, proportions and jewellery. Zero face drift. Both women must remain recognisably separate throughout the image.`;

export const DUO_NEGATIVE_PROMPT = `blended face, merged identity, same woman twice, duplicate face, swapped eyes, swapped hair, swapped jewellery, generic AI face, plastic skin, porcelain skin, airbrushed skin, beauty filter, CGI skin, studio softbox, text, watermark, logo, extra fingers, extra limbs, mutated hands, underage, full nudity, genitals`;

export const DUO_UGC_STILL_CORE = `Ultra-realistic mobile photograph of two fictional adult women, Cara Whitmore and Lila Sterling, together. Their identities are locked separately to their reference images and must remain distinct. Vertical 9:16 preferred. Candid lifestyle UGC, natural human skin texture, visible pores, real fabric detail, lived-in settings, named natural light only, no studio softbox, no beauty filter, no plastic skin, no text, no logos, no watermarks.`;

export function getPersonaVisual(personaId = "cara") {
  const id = (personaId || "cara").toLowerCase();
  if (["duo", "cara_lila", "cara&lila"].includes(id)) {
    return {
      id: "duo",
      name: "Cara & Lila",
      refs: DUO_REFS,
      identityLock: DUO_IDENTITY_LOCK,
      negative: DUO_NEGATIVE_PROMPT,
      selfieGuidance: CARA_SELFIE_ANATOMY_GUIDANCE,
      ugcStillCore: DUO_UGC_STILL_CORE,
      trigger: "Cara & Lila",
      storagePrefix: "cara-lila",
    };
  }
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
