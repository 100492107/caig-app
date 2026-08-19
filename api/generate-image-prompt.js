// api/generate-image-prompt.js
// Shared image-prompt builder for generate-batch.
// Caption photo_idea is the primary scene source; IMG_SHOTS is soft fallback only.

import { getPersonaVisual } from "./cara-config.js";

/**
 * @param {object} opts
 * @param {object} opts.persona
 * @param {object} opts.post - must include photo_idea / caption / hook / cast
 * @param {number} opts.postIndex
 * @param {Array} opts.imgShots - IMG_SHOTS library from generate-batch
 * @param {function} opts.loadPersonaFiles - PERSONA_FILES loader from generate-batch
 */
export function buildImagePromptStruct({ persona, post, postIndex, imgShots, loadPersonaFiles }) {
  const captionScene = (post.photo_idea || post.caption || post.hook || "").trim();
  const hasStrongScene = captionScene.length > 40;
  const shot = imgShots[postIndex % imgShots.length];
  const cast = post.cast || (persona.id === "cara_lila" ? "both" : persona.id);
  const visualId = cast === "both" ? "duo" : cast;
  const personaFiles = loadPersonaFiles(visualId);
  const fluxNote = personaFiles.flux
    ? `PHYSICAL DESCRIPTORS — locked and must not drift:\n${personaFiles.flux.split("## SECTION 2")[0].replace(/^# flux\.md.*\n/, "").trim()}`
    : "";
  const visual = getPersonaVisual(visualId);
  const identityLock = `${visual.identityLock}${fluxNote ? "\n\n" + fluxNote : ""}`;

  const names =
    cast === "both"
      ? "Cara Whitmore and Lila Sterling"
      : cast === "lila"
        ? "Lila Sterling"
        : "Cara Whitmore";

  const sceneDriven = hasStrongScene
    ? `${names} in the exact moment described here: "${captionScene.slice(0, 320)}". ${cast === "both" ? "Both women are together in the same scene with distinct identities, natural chemistry and different expressions/postures." : "The subject is mid-action or mid-moment, not posing for a catalogue camera."} Match this scene exactly — do not invent a different setting or action.`
    : `${names} — ${shot.pose}`;

  const locationRuleConstraint =
    "LOCATION & FRAMING MANDATE: outdoor/public settings must be arm's-length selfie or candid. Mirror shots only indoors in private quarters.";

  const subjectDesc = `${sceneDriven} FRAMING: real phone photo distance and angle, slightly imperfect / off-centre preferred. ${locationRuleConstraint} Do NOT default to a frontal headshot. Prefer full-body, three-quarter or environmental framing. Include one lived-in background detail (clothes on chair, glass, charger, messy sheets, etc.).`;

  const angleNote = hasStrongScene
    ? "natural candid matching the scene"
    : shot.pose.match(
          /HIGH ANGLE|LOW ANGLE|OVERHEAD|FLOOR|MIRROR SELFIE|MIRROR|FEET|SILHOUETTE|WALKING|CANDID|LAUGHING|SEATED|RECLINED|STANDING|HANDS|BROWSING|SELFIE|TRAINING|RUNNING|PRESENTING|GETTING IN/i
        )?.[0] || "natural candid";

  const wardrobe = hasStrongScene
    ? "Wardrobe must match the scene description above and the creator's visual identity. Prefer real clothes she would actually wear in that moment."
    : shot.wardrobe;

  return {
    identity_lock: identityLock,
    shot_angle: angleNote,
    subject: subjectDesc,
    wardrobe,
    setting: hasStrongScene
      ? "Match the setting and light implied by the caption scene above — lived-in, not staged"
      : shot.setting,
    lighting: hasStrongScene
      ? "Natural light that fits the moment — morning grey, soft window, golden hour, lamp. Named and real."
      : shot.lighting,
    technical: `${hasStrongScene ? "iPhone 16 Pro Max" : shot.camera || "iPhone 16 Pro Max"}, 9:16 vertical portrait, photorealistic phone photo. Visible pores, natural skin texture, mild film grain. Zero plastic skin, zero airbrush. Exact identity match to references. Looks like a real phone photo taken in the moment, not a content shoot.`,
    style_ref:
      cast === "both"
        ? "Real phone selfie / candid lifestyle image of Cara and Lila together. Two distinct women, authentic shared moment, natural chemistry, lived-in environment, understated luxury."
        : "Real phone selfie / candid lifestyle from an actual young adult creator. Lived-in, natural, slightly imperfect.",
    negative_prompt: `${visual.negative}, plastic skin, porcelain skin, airbrushed skin, beauty filter, studio softbox, posed model casting, face drift, wrong eye colour, wrong hair colour, watermark, text, cartoon`,
  };
}
