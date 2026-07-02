# flux.md — Cara Whitmore
## Visual identity lock for consistent AI image generation

---

## SECTION 1 — PHYSICAL DESCRIPTORS (lock these across every generation)

| Feature | Locked value |
|---|---|
| **Eye colour** | Distinctly bright green — moist iris with intricate radial patterns and realistic light reflections. Dark limbal ring. Not hazel, not grey-green, not blue. Unmistakably green in all lighting. |
| **Hair** | Dark brown — not black. Long, past shoulders. Natural wave pattern, most visible when wet or damp. Worn down always. Individual strands catching warm highlights in direct light. Near-black and wet-strand textured when wet. |
| **Brows** | Strong, thick, dark — one of her most defining features. Well-shaped but natural, not drawn on. Highly consistent — any generation where the brows are thin or light is wrong. |
| **Jaw** | Defined and slightly angular — clean jawline, not soft or rounded. Visible structure from most angles. |
| **Skin tone** | Medium-light, warm olive undertone. Glowy, no visible freckling. Looks slightly sun-kissed at all times. Pore-level micro-texture visible in close-ups. No beauty filter, no smoothing. |
| **Nose** | Straight, refined, slightly narrow. Proportionate. |
| **Lips** | Full, naturally pigmented — soft pink-rose with no gloss or liner. Slightly parted in resting expression. |
| **Build** | Slim, athletic build from training. Not model-thin — toned, not muscular. Flat stomach, long limbs. |
| **Ears** | Small gold hoop earrings — worn consistently. Always visible when hair is pushed back or wet. |
| **Necklace** | Layered delicate gold chains — 2–3 thin strands at different lengths. Present in city, pool, and gym settings. A consistent accessory. |
| **Distinguishing mark** | Small dark mole on the left side of the neck, just below the jawline. Approximately 3mm. Always present when the neck is visible and unobstructed. Never explained. |

---

## SECTION 2 — CAMERA & TECHNICAL SPECIFICATION

Every generation is rendered as if shot on:

| Parameter | Value |
|---|---|
| **Camera body** | Sony A7R V |
| **Lens** | 85mm prime |
| **Aperture** | f/1.8 |
| **Shutter** | 1/200s |
| **ISO** | 100 |
| **Focus** | Tack-sharp on eyes and skin — shallow depth of field |
| **Bokeh** | Circular, creamy, out-of-focus background |
| **Dynamic range** | High — full shadow and highlight detail |
| **Optical artifacts** | Extremely subtle chromatic aberration at frame edges only |
| **Color grading** | Teal and Orange LUT — warm skin tones, neutral whites, 5600K |
| **Output** | 9:16 vertical, 8K, raw photography aesthetic |

---

## SECTION 3 — SKIN & BIOLOGY REALISM STANDARDS

Every image must pass all of the following:

- Pore-level skin micro-texture visible in any shot at medium distance or closer
- Subsurface scattering — skin absorbs light physically correctly, no flat rendering
- Fine vellus hair on arms, shoulders, and face edges
- Natural skin unevenness — slight redness at cheeks, realistic warmth gradients
- Fine lines at natural expression points (eye corners, lip edges)
- Moisture sheen where contextually correct (pool, post-training, shower)
- Moist iris with intricate radial iris patterns and realistic specular catchlight
- Subtle venous detail on hands and inner arms
- Natural skin folds at waist, elbow creases, behind knee
- Realistic fabric tension where clothing contacts skin
- Real film grain — no digital smoothing
- Zero retouching / zero beauty filter / zero skin smoothing

---

## SECTION 4 — LIGHTING RIGS BY ENVIRONMENT

### Bedroom / Wardrobe / Mirror
Warm late-afternoon side window light, or soft daylight through a nearby window. Golden, soft directional shadows. Gentle highlights on skin and fabric. Intimate, real-feeling atmosphere. 5600K colour temperature.

### Bathroom / Post-shower / Mirror
Cool overhead vanity lighting. Slightly blue-white. Even illumination. Soft specular highlights on damp skin and tiles. Realistic water droplets or steam where appropriate.

### Home Gym / Training
Bright, even practical gym lighting, or a single moody overhead source for boxing/action shots. Slight sheen from exertion where contextually correct. No golden-hour glamour — this should read as real training, not a shoot.

### Rooftop / Home Pool
Bright natural daylight, midday or warm afternoon. Skin glows with a healthy warm sheen. Reflective water surface softens contrast. This is a home-building amenity setting — not a resort or destination.

### Studio / Default
Three-point lighting setup. Large softbox overhead as key light. Translucent natural side fill. Subtle rim light separating subject from background. Soft feathered shadows. Specular highlights on lips and skin.

---

## SECTION 5 — ENVIRONMENT SETUPS WITH SEED RANGES

No travel or destination setups. Everything is home, gym, or city — grounded and repeatable.

### Setup 1 — Flat / Bedroom / Mirror (seeds 800–900)
**Lighting:** Warm window light from one side, or soft daylight. Golden but not overexposed.
**Setting:** Minimal interior — bedroom, walk-in wardrobe, or full-length mirror. Real-feeling, not styled for content.
**Content types:** Mirror selfies, outfit checks, getting-ready, morning routine.
**Cara's look:** Hair down and natural — slightly air-dried wave. No makeup or minimal makeup. Layered gold chains if neckline visible.
**Frequency:** 3x/week

### Setup 2 — Bathroom / Post-shower (seeds 1200–1300)
**Lighting:** Cool overhead vanity/bathroom light. Slightly blue-white.
**Setting:** Simple bathroom — white or neutral tiles, mirror prominent. Nothing luxurious.
**Content types:** Post-shower mirror shots, skincare, pre-going-out mirror check.
**Cara's look:** Hair wet and dark — near-black when wet, damp natural wave. Minimal coverage if anything.
**Frequency:** 2x/week

### Setup 3 — Home Gym / Training (seeds 400–500)
**Lighting:** Bright practical gym lighting, or moody single-source for action/boxing shots.
**Setting:** Home gym, weights rack, boxing bag, or a nearby running track/park. Specific and real, not a commercial gym ad.
**Content types:** Mid-rep training shots, boxing bag action, running, resting between sets, gym mirror selfies.
**Cara's look:** Hair tied back or in a ponytail, minimal or no makeup, genuine exertion where contextually correct.
**Frequency:** 3x/week (primary content pillar)

### Setup 4 — Home Office (seeds 600–700)
**Lighting:** Soft window light, warm desk lamp glow.
**Setting:** Home office desk — planner, laptop, coffee, books. Real, lived-in, not a stock-photo office.
**Content types:** Hands-detail writing/journaling shots, presenting/gesturing mid-sentence, focused close-ups.
**Cara's look:** Sharp blazer or fitted knit, minimal gold jewellery, composed.
**Frequency:** 1x/week

### Setup 5 — Rooftop / Home Pool (seeds 1500–1600)
**Lighting:** Bright natural daylight, midday or warm afternoon.
**Setting:** Rooftop pool or private pool on the building's amenity floor, or a home terrace plunge pool/hot tub. Not a resort or destination — this reads as her own building.
**Cara's look:** Hair down or loosely tied, minimal or no makeup, layered gold chains visible.
**Frequency:** 1x/week

---

## SECTION 6 — GENERATION RULES

1. **Never generate without face reference loaded.** Physical descriptors supplement the reference — they do not replace it.
2. **The brows are the consistency test.** If they are thin, light, or shaped differently — reject and regenerate.
3. **The eyes must read bright green** — not grey, not hazel, not brown. In any lighting.
4. **Hair when dry:** dark brown wave, worn down. **Hair when wet:** near-black, wet-strand texture, clinging to face and shoulders.
5. **The mole on the left side of the neck must be present** in at minimum 60% of all generations where the neck is visible.
6. **Layered gold chains** must be present in all city, pool, and gym settings where the neckline is visible.
7. **Gold hoop earrings** present whenever ears are visible.
8. **No beauty filter look.** Skin is real — pores exist in close-ups. Dewy, not plastic.
9. **Regenerate, do not edit,** if face drifts. Inpainting compounds artifacts.
10. **Expression:** reserved, slightly cool. Slightly parted lips, direct or averted gaze, no wide smile. Comfortable being looked at, not performing.
11. **Fabric realism:** clothing must drape, fold, and interact with the body with physically accurate folds, shadows, and highlights.

---

## SECTION 7 — CONTENT CALENDAR BY SETUP

No travel. Home, gym, and city only.

| Day | Setup | Content type | Notes |
|---|---|---|---|
| Mon | Home Gym | Mid-rep training shot | Non-negotiable session, focused |
| Mon | Bedroom / Mirror | Mirror selfie — outfit or physique check | Mole visible |
| Tue | Home Gym | Boxing bag or running shot | High energy, motion |
| Wed | Home Office | Hands-detail writing/planner shot | Discipline in the detail |
| Wed | Bathroom | Post-shower / getting-ready | Wet hair, minimal look |
| Thu | Bedroom / Mirror | Gym mirror selfie, post-training | Composed, satisfied |
| Thu | Home Gym | Resting between sets | Candid, unaware of camera |
| Fri | Home Gym | Flagship image of the week — best shot | Most polished in this setup |
| Sat | Rooftop / Home Pool | Poolside — reading or relaxed | Gold chains visible |
| Sat | Bathroom | Getting-ready, pre-evening | Slightly more put-together |
| Sun | Bedroom | Rest day — quiet, least performative | The discipline no one sees |

---

## SECTION 8 — FANVUE-SPECIFIC NOTES

Same setups. Same face, hair, mole, gold chains, earrings. The subscriber recognises her from public content instantly — recognition is the product.

Adjustments for exclusive content:
- **Bedroom / Mirror (seeds 800–900):** Less coverage. Same environment, same face, same hair.
- **Bathroom (seeds 1200–1300):** Wet-hair look goes further — same girl, same light, same setting.
- **Rooftop / Home Pool (seeds 1500–1600):** The bikini reference is the floor, not the ceiling. What the platform allows governs how far it goes.

The consistent detail that must survive into exclusive content: **the mole on the left side of the neck.** It is the link between public persona and subscription content. Subscribers will notice if it disappears.

---

*Generation is done when 10 fresh outputs from each seed range pass as the same person to someone who has seen all setups back to back. The brows and the bright green eyes are the two fastest consistency checks. Do not launch a batch until both pass.*

*This file is a reference/design doc for the visual identity and fal.ai reference-image set. The version actually used at generation time lives inline in `api/generate-submit.js` (`CARA_REFS`, the identity-lock block in `buildPrompt()`, and the `SHOTS`/`WARDROBES`/`SETTINGS` libraries) — Vercel serverless functions have no runtime filesystem access, so this .md file is not read directly. Keep them in sync when editing.*
