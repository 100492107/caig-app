# flux.md — Cara Whitmore
## Visual identity lock for consistent AI image generation

---

## SECTION 1 — PHYSICAL DESCRIPTORS (lock these across every generation)

| Feature | Locked value |
|---|---|
| **Eye colour** | Light hazel — greenish-brown, slightly more green in natural light |
| **Hair** | Dark ash brown, shoulder-length, naturally slightly wavy. Usually down or in a low clip. Not styled — looks like someone who air-dries. |
| **Jaw** | Soft, slightly rounded. Not sharp or angular. |
| **Skin tone** | Light/medium, warm undertone. Light freckling across the nose and upper cheeks. |
| **Build** | Slim but not model-thin. 5'5". The kind of body that comes from walking a lot in hot countries, not from a gym programme. |
| **Nose** | Straight, slightly upturned at the tip |
| **Lips** | Medium fullness, natural colour — no overlined, no gloss in casual shots |
| **Distinguishing mark** | Small scar on right collarbone — approximately 2cm, horizontal, pale against skin. Slightly raised. Present in at minimum 60% of all generations. Never explained. |

---

## SECTION 2 — ENVIRONMENT SETUPS WITH SEED RANGES

### Setup 1 — Flat / Bedroom (seeds 800–900)
**Lighting:** Warm, late afternoon. Window light from the left. Golden hour quality without being outdoors. Soft shadows.  
**Setting:** Birmingham flat interior. White walls, minimal. A bit of clutter that suggests real life — a book, her phone charger on the nightstand, a hoodie thrown over the chair. Not an influencer hotel room.  
**Content types:** Mirror selfies, lying-on-bed shots, getting-ready moments, morning wake-up, post-trip unpacking  
**Cara's look in this setup:** Most natural version of herself. Low makeup or no makeup. Hair down or casually pinned. Oversized tee or soft fabric top. Often bare feet.  
**Frequency:** 3x/week

### Setup 2 — Bathroom / Post-shower (seeds 1200–1300)
**Lighting:** Cool, slightly blue-white. Overhead vanity lighting. Bathroom mirror dominant. The kind of light that makes skin look good but isn't flattering to everything.  
**Setting:** Her flat's small bathroom. White tiles, nothing fancy. Towel rail visible. Small toiletries on the edge of the basin.  
**Content types:** Post-shower mirror shots, skincare routine, pre-going-out mirror check, casual towel shots  
**Cara's look in this setup:** Damp hair, minimal. The slightly-dishevelled version. Natural skin. If wrapped in anything — a plain white or grey towel, not satin.  
**Frequency:** 2x/week

### Setup 3 — Travel location / Outdoors (seeds 400–500)
**Lighting:** Natural, varies by location. Aim for: warm midday Mediterranean, or golden-hour European street. No harsh overhead midday sun.  
**Setting:** Real travel locations — pool edge, cobbled street, rooftop terrace, beach, restaurant table. Setting should feel specific enough to be identifiable, not generic "beach".  
**Content types:** Destination photos, poolside, street-style walking shots, sitting at a café, looking at a view  
**Cara's look in this setup:** Sunglasses often. Minimal makeup in hot weather. Whatever she'd actually wear — not a photoshoot outfit. Linen, cotton, simple cuts.  
**Frequency:** 4x/week (this is the primary content pillar)

---

## SECTION 3 — GENERATION RULES

1. **Never generate without face reference loaded.** The physical descriptor list above is a supplement, not a replacement for a reference image.
2. **Regenerate, do not edit**, if the face drifts between setups. Edits (inpainting, face-swap) stack artifacts that compound over multiple generations.
3. **The collarbone scar must appear in at least 60% of all generations.** If a shot angle doesn't naturally show the collarbone, choose a different angle or add it in post — never skip it entirely for more than 2 consecutive posts.
4. **If the jawline changes between seed setups, the seed range is wrong.** Relock before generating the next batch.
5. **Skin consistency:** Light freckling on nose/upper cheeks in all well-lit close-up shots. Fades in lower-light setups — that's fine.
6. **No heavy beauty filter looks.** She does not have an Instagram face. Pores are visible in close-ups. That is correct.
7. **Hair rule:** Ash dark brown. Not black. Not warm brown. If it's reading warm in the preview, adjust temperature before generating the full set.
8. **Expression range:** She looks like she's tolerating you taking her photo, not posing for a magazine. Reserved smiles over wide smiles. Looking away from camera in 40% of shots.

---

## SECTION 4 — CONTENT CALENDAR BY SETUP

| Day | Setup | Content type | Notes |
|---|---|---|---|
| Mon | Travel | Destination detail shot — something specific not a landscape | Sets the week's location context |
| Mon | Travel | Poolside or beach — she's there, not performing | Scar visible |
| Tue | Bedroom | Mirror selfie — casual, authentic | Morning or pre-going-out |
| Wed | Travel | Street or café — candid-feeling | Looking away from camera preferred |
| Wed | Bathroom | Post-shower or skincare | Lower on makeup |
| Thu | Travel | Location food shot or market shot | Don't need to show her face |
| Thu | Bedroom | Lying-on-bed — relaxed content | Low light, warm, intimate feel |
| Fri | Travel | Best shot of the week — flagship image | Scar visible, slightly more polished |
| Sat | Bathroom | Getting-ready shot or pre-night-out | Slightly more put-together |
| Sat | Travel | Golden-hour or evening location | Warm light, looser energy |
| Sun | Bedroom | Rest day content — slower, personal | Most intimate / least performative |

---

## SECTION 5 — FANVUE-SPECIFIC NOTES

For Fanvue wall posts and exclusive content, the same setups apply with the following adjustments:

- **Bedroom setup (seeds 800–900):** Less fabric. The shots go further — the same environment and lighting, the same face and hair, but what the fabric covers changes. The artistic direction brief governs this, not this file.
- **Bathroom setup (seeds 1200–1300):** More of the post-shower look. Towel lower. Still the same girl, same lighting, same setting.
- **Travel setup (seeds 400–500):** Poolside goes further. Bikinis at minimum; what the platform allows governs the ceiling.

The face, the scar, the hair, the expression — all identical to public content. The subscriber should recognise her instantly from her public TikTok. That recognition is the product.

---

*Generation is done when 10 fresh outputs from each seed range pass as the same person to someone who has seen all three setups back to back. Do not launch a new content batch until this test passes.*
