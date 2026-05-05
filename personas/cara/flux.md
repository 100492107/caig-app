# flux.md — Cara Whitmore
## Visual identity lock for consistent AI image generation

---

## SECTION 1 — PHYSICAL DESCRIPTORS (lock these across every generation)

| Feature | Locked value |
|---|---|
| **Eye colour** | Distinctly green — bright, clear green with a dark limbal ring. Not hazel, not grey-green. Unmistakably green in all lighting. |
| **Hair** | Very dark brown — near-black. Long, past shoulder. Natural wave pattern most visible when wet or damp. Worn down always. Often slightly damp-looking, not blow-dried. Never styled into curls. |
| **Brows** | Strong, thick, dark — one of her most defining features. Well-shaped but natural, not drawn on. Highly consistent — any generation where the brows are thin or light is wrong. |
| **Jaw** | Defined and slightly angular — clean jawline, not soft or rounded. Visible structure from most angles. |
| **Skin tone** | Medium-light, warm olive undertone. Glowy, no visible freckling. Looks slightly sun-kissed at all times. No blemishes, no heavy texture — but not filtered either. |
| **Nose** | Straight, refined, slightly narrow. Proportionate. |
| **Lips** | Full, naturally pigmented — soft pink-rose with no gloss or liner. Slightly parted in resting expression. |
| **Build** | Slim, toned. Flat stomach. Not model-thin — athletic without being muscular. |
| **Ears** | Small gold hoop earrings — worn consistently. Always visible when hair is pushed back or wet. |
| **Necklace** | Layered delicate gold chains — 2-3 thin strands at different lengths. Present in all pool, beach, and travel shots. This is a consistent accessory. |
| **Distinguishing mark** | Small dark mole on the left side of the neck, just below the jawline. Approximately 3mm. Always present. Never explained. Visible in close-ups and mid-shots when the neck is exposed. |

---

## SECTION 2 — ENVIRONMENT SETUPS WITH SEED RANGES

### Setup 1 — Flat / Bedroom (seeds 800–900)
**Lighting:** Warm, late afternoon window light from one side. Golden but not overexposed. Soft directional shadows.  
**Setting:** Minimal interior — white or neutral walls, natural light, not styled for content. Real-feeling, not an influencer set.  
**Content types:** Mirror selfies, lying-on-bed shots, getting-ready, morning, post-trip unpacking  
**Cara's look:** Hair down and natural — slightly air-dried wave. No makeup or minimal makeup. Natural skin. Layered gold chains always present if neckline visible.  
**Frequency:** 3x/week

### Setup 2 — Bathroom / Post-shower (seeds 1200–1300)
**Lighting:** Cool overhead — vanity or overhead bathroom light. Slightly blue-white. Good for skin but not flattering to everything.  
**Setting:** Simple bathroom — white or neutral tiles, mirror prominent. Nothing luxurious.  
**Content types:** Post-shower mirror shots, skincare, pre-going-out mirror check  
**Cara's look:** Hair wet and dark — this is the reference look from the photos. Damp, natural wave, near-black when wet. Minimal skin. If anything covering her — plain white or grey, not satin.  
**Frequency:** 2x/week

### Setup 3 — Travel / Outdoors / Pool (seeds 400–500)
**Lighting:** Natural bright sun — Mediterranean or tropical. Strong overhead or slightly angled. Skin glows in this light. This is her primary visual aesthetic — the pool and poolside look in the reference photos is the anchor for this setup.  
**Setting:** Pool edge, sunlounger, rooftop, beach, cobbled street. Specific enough to feel like a real place.  
**Cara's look:** Hair wet from pool — this is her signature look. Layered gold chains visible. Minimal or no makeup. The red bikini in the reference photos is a reference point for the level of coverage — small, simple triangles with thin tie straps. Natural colours preferred (red, black, white, neutral sand tones).  
**Frequency:** 4x/week (primary content pillar)

---

## SECTION 3 — GENERATION RULES

1. **Never generate without face reference loaded.** The physical descriptor list above supplements the reference — it does not replace it.
2. **The brows are the consistency test.** If they are thin, light, or shaped differently from the reference, the generation has drifted. Reject and regenerate.
3. **The eyes must read green** — not grey, not hazel. In any lighting. If they're reading as grey or brown, the generation is wrong.
4. **Hair when dry:** very dark brown wave, worn down. **Hair when wet or damp:** near-black, wet-strand texture, clinging to face and shoulders. Both are correct — the wet look is her signature outdoor/pool state.
5. **The mole on the left side of the neck must be present** in at minimum 60% of all generations. If a shot angle doesn't expose the neck, that's fine — but it must appear in the majority.
6. **Layered gold chains** must be present in all outdoor, pool, and travel setups. Optional in bedroom setup.
7. **Gold hoop earrings** present whenever ears are visible.
8. **No beauty filter look.** Skin is real — glowy and warm, but pores exist in close-ups. The reference close-up shot shows what correct skin rendering looks like: dewy, not plastic.
9. **Regenerate, do not edit,** if face drifts. Inpainting compounds artifacts.
10. **Expression:** reserved, slightly cool. The look in the reference photos — slightly parted lips, direct or averted gaze, no wide smile. She is comfortable being looked at, not performing for the camera.
11. **Jawline consistency check between seed setups:** if the jaw changes from defined/angular to soft/round, the seed range is wrong. Relock before continuing.

---

## SECTION 4 — CONTENT CALENDAR BY SETUP

| Day | Setup | Content type | Notes |
|---|---|---|---|
| Mon | Travel | Pool or destination arrival shot | Wet hair look — anchor of the week |
| Mon | Travel | Poolside lounging — she's there, not performing | Gold chains visible |
| Tue | Bedroom | Mirror selfie — natural, hair down | Mole visible |
| Wed | Travel | Street, café, or rooftop — candid-feeling | Looking away preferred |
| Wed | Bathroom | Post-shower | Wet hair, minimal look |
| Thu | Travel | Location detail or golden-hour shot | Warm light |
| Thu | Bedroom | Lying-on-bed — slower, personal | Warm directional light |
| Fri | Travel | Flagship image of the week — best shot | Most polished in this setup |
| Sat | Bathroom | Getting-ready, pre-night-out | Slightly more put-together |
| Sat | Travel | Evening location — warm light, looser energy | |
| Sun | Bedroom | Rest day — most intimate / least performative | |

---

## SECTION 5 — FANVUE-SPECIFIC NOTES

The same three setups apply. The face, hair, mole, gold chains, earrings — identical to public content. The subscriber recognises her from her public TikTok instantly. That recognition is the product.

Adjustments for exclusive content:
- **Bedroom (seeds 800–900):** Less coverage. Same environment, same face, same hair. What the fabric covers is governed by the artistic direction brief, not this file.
- **Bathroom (seeds 1200–1300):** Wet-hair look goes further — same girl, same light, same setting.
- **Travel / Pool (seeds 400–500):** The red bikini reference is the floor, not the ceiling. What the platform allows governs how far it goes.

The consistent detail that must survive into exclusive content: **the mole on the left side of the neck.** It is the link between the public persona and the subscription content. Subscribers will notice if it disappears.

---

*Generation is done when 10 fresh outputs from each seed range pass as the same person to someone who has seen all three setups back to back. The brows and the green eyes are the two fastest consistency checks. Do not launch a batch until both pass.*
