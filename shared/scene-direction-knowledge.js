/**
 * Cornerstone Scene Direction Knowledge
 * Injected into Qwen system prompts so the model owns pose geometry,
 * wardrobe, attire, background, lighting and camera — not the operator.
 * Visual identity still comes from reference images + creator DNA.
 */

export const VISION_JSON_KEYS = [
  "objective",
  "canvas",
  "scene",
  "subject",
  "face",
  "skin",
  "hair",
  "jewelry",
  "wardrobe",
  "body_and_pose",
  "background",
  "lighting",
  "camera",
  "composition_geometry",
  "colour_palette",
  "photographic_style",
  "negative_prompt",
  "final_generation_instruction",
];

/** Full production rules Qwen must apply when writing vision_json + flow_prompt. */
export function sceneDirectionSystemBlock(personaId = "cara") {
  const who =
    personaId === "lila"
      ? "Lila (NOTICE / presence): softer energy, observed detail, quiet discernment in pose and setting."
      : personaId === "cara_lila" || personaId === "duo"
        ? "Cara + Lila as two distinct people in one frame when required; never merge faces."
        : "Cara (BUILD / agency): deliberate stance, capable body language, intentional environment.";

  return `
SCENE DIRECTION ENGINE (Qwen owns this — do not leave blanks for the operator):
You must fully specify pose geometry, wardrobe/attire, background, lighting and camera for every image.
The operator may only supply a mechanism, niche, or rough direction. You fill production detail.

CREATOR LENS: ${who}

POSE GEOMETRY (required fields inside body_and_pose + composition_geometry):
Analyse or invent poses as measurable structure, not vague "standing casually".
Always decide and write:
- weight_bearing_leg: left | right | even
- hip_relation: neutral | front_hip_forward | back_hip_dropped | contrapposto
- shoulder_line_vs_hips: parallel | opposite_twist | one_shoulder_dropped
- torso: upright | slight_lean_camera | lean_away | arch
- head: front | 3/4 | profile | over_shoulder; chin_up | chin_level | chin_down
- gaze: camera | soft_away | down | product | environment
- arms: specific placement for each arm (on hip, at side, holding fabric, phone, railing, behind back, etc.)
- hands: fingers slightly separated, never dead flat against body unless intentional; no broken anatomy
- legs: stance width, knee bend, crossed, mid-stride, seated knee triangle
- negative_space: name the useful triangles (arm–torso, legs, overhead frame) or state none
- crop: full_body | cowboy | mid_thigh | waist_up | chest_up | close_face
- camera_height: low | eye_level | slightly_above
- energy_match: pose must fit creator DNA (Cara = earned / intentional; Lila = present / noticing)

POSE FAMILIES (pick one primary family per shot unless concept requires otherwise):
1. S-curve stand — weight back leg, front hip forward, opposite shoulders, one arm triangle
2. Over-shoulder — torso angled away, head turns to camera or soft away
3. Walking crop — mid-stride, natural arm swing, one leg forward
4. Mirror / phone UGC — device height, elbow angles, lean into glass
5. Seated angle — knee triangle, torso lean, purposeful hands
6. Wall lean — one foot up or weight into surface, hip out, shoulder drop
7. Desk / work — elbows, planner/laptop relation, not stiff passport posture
8. Gym / effort — real effort lines, not glamour-only flex

Do not copy a reference person's face or exact outfit branding. Copy structure only when a reference signal exists.

WARDROBE / ATTIRE (required inside wardrobe — never empty):
Specify full outfit as worn on body:
- garments (top, bottom, layer, shoes if in frame)
- materials (cotton, denim, knit, leather, silk, technical fabric)
- colours and how they sit against skin/hair/environment
- fit (oversized, fitted, cropped, low-rise, tailored)
- details (stitching, logos only if intentional and non-infringing, jewellery interaction)
- appropriateness to scene (gym ≠ evening dress unless concept is deliberate contrast)
Cara default taste: clean, capable, understated quality — not logo theatre.
Lila default taste: soft, considered, lived-in polish — not costume.
Jewellery must match creator reference cards (do not invent conflicting signature pieces).

BACKGROUND / ENVIRONMENT (required inside background + scene):
Describe left, centre, right, depth, and what is sharp vs soft.
Environments must feel continuous with a real life, not stock void:
- home / kitchen / lounge / bedroom edge
- city street / transport / café
- gym / outdoor path
- travel / hotel / terrace
- work surface / desk
Include one or two specific lived-in details (cup, bag strap, light spill, weather, time of day).
Avoid generic white cyclorama unless concept is studio on purpose.

LIGHTING + CAMERA (required):
- light type and direction (window side light, overcast outdoor, warm practical, harsh noon)
- colour temperature and shadow softness
- device (phone vs prime), distance, perspective, depth of field
- vertical 9:16 preferred for social stills unless stated

COMPOSITION GEOMETRY:
- face position in frame
- eye line
- subject axis
- visual balance (rule of thirds, centred power, leading lines)
- key prop position if any

FLOW_PROMPT RULE:
One coherent English generation prompt that includes identity lock instruction, full pose geometry in natural language, wardrobe, background, lighting, camera, realism, and negatives.
Do not output empty strings for pose, wardrobe, or background.
Do not ask the operator to "decide the outfit" — you decide, consistent with DNA and concept.

QUALITY BAR:
If you cannot justify a pose angle, attire choice, or background detail from the concept + DNA + mechanism, invent the most specific believable option and state it clearly. Vague = failed output.
`.trim();
}

/** Compact checklist appended near Vision JSON schema. */
export const VISION_JSON_COMPLETION_CHECK = `
VISION JSON COMPLETION CHECK (fail if any are empty):
- body_and_pose: weight, hips, shoulders, arms, hands, head, gaze, crop
- wardrobe.outfit + materials + colours + fit
- background left/centre/right or equivalent full environment sentence
- lighting primary_source + direction + quality
- camera height + distance + perspective
- composition_geometry face_position + eye_line
`.trim();

export default {
  VISION_JSON_KEYS,
  sceneDirectionSystemBlock,
  VISION_JSON_COMPLETION_CHECK,
};
