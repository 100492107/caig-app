# Caption + image fields (operator contract)

After the Aug 2026 image/caption lock work, every generated post should expose:

| Field | Use |
|-------|-----|
| **`on_image_text`** | Exact short copy to put **on** the image (overlay / wall-of-text style). 3–12 words. Punchy. Readable on a phone. Fastlane-style scroll-stopper. |
| **`caption`** | The actual post caption under the image (1–3 short sentences, persona voice). |
| **`hook`** | Opening line; often the same as or a seed for `on_image_text`. |
| **`photo_idea`** | Visual brief the image model must match. Primary scene source. |

## Fastlane-style principles (baked into generation)

- Hook stops the scroll in the first line / on-image text.
- Specific scene, proof, decision, or contrast beats generic lifestyle.
- Image must depict the caption’s moment (lived-in phone UGC, not catalogue).
- Fanvue energy is fal-safe: intimate language rewritten so fal does not block; Grok Imagine still renders the energy.

## Frontend / queue UI

Show the operator:

1. **On image:** `on_image_text` (copy-paste onto the creative)
2. **Caption:** `caption` (copy-paste under the post)
3. Preview image + `photo_idea` so mismatches are obvious before publish

Until `generate-batch.js` returns `on_image_text` natively, fall back to `hook` for overlay text (cron already does this).

## Image pipeline

- `api/generate-submit.js` — `buildPrompt()` prefers `photo_idea`, applies lived-in spark rules, fal-safe Fanvue sanitization when `fanvueMode: true`.
- Callers (UI + cron) **must** pass `photo_idea` and `fanvueMode` when relevant.
