// api/ugc-submit.js
// B2B UGC Centre — product image + locked persona (Cara/Lila) → composite stills via Grok Imagine 2.0

import {
  FAL_EDIT_QUEUE_URL,
  FAL_EDIT_REQUESTS_BASE,
  GROK_RESOLUTION,
  getPersonaVisual,
  refsForSubmit,
} from "./cara-config.js";

const USE_MODES = {
  wear: {
    id: "wear",
    label: "Wearing (apparel)",
    instruction:
      "The character is WEARING the product from the product reference image as clothing/apparel. Fit the garment naturally to her body with real fabric folds, seams, and gravity. Do not leave the product floating. Match fabric colour, pattern, and cut from the product image as closely as possible while keeping her face and body identity locked to the persona references.",
  },
  hold: {
    id: "hold",
    label: "Holding (bottle / box / tube)",
    instruction:
      "The character is HOLDING the exact product from the product reference image in one or both hands, product label facing camera and clearly readable when possible. Natural grip, correct fingers, product scale realistic relative to hands. Do not invent a different product.",
  },
  use: {
    id: "use",
    label: "Using (lifestyle)",
    instruction:
      "The character is actively USING the product from the product reference image in a candid lifestyle moment (applying, drinking, spraying, opening, demonstrating). Product must match the reference. Keep action natural and phone-UGC candid — not a stiff catalogue pose.",
  },
  beauty: {
    id: "beauty",
    label: "Beauty / makeup look",
    instruction:
      "The character is using or showcasing the beauty/makeup product from the product reference. If it is makeup, show a natural finished look consistent with the product type while keeping her facial identity locked to persona refs. Product packaging visible in frame when it helps the ad. No heavy beauty-filter skin.",
  },
};

function buildUgcPrompt({ personaId, mode, scene, brandName, productNotes }) {
  const visual = getPersonaVisual(personaId);
  const use = USE_MODES[mode] || USE_MODES.hold;
  const sceneLine = (scene || "").trim() ||
    "Modern lived-in interior, natural window light, candid phone-UGC energy, vertical 9:16.";
  const brandLine = brandName ? `Brand context: ${brandName}.` : "";
  const notesLine = productNotes ? `Product notes from operator: ${productNotes}.` : "";

  return `${visual.ugcStillCore}

PRODUCT UGC COMPOSITE — HIGHEST PRIORITY AFTER IDENTITY:
Image set includes: (1) PRODUCT reference — the exact item to feature; (2–3) PERSONA identity references.
${use.instruction}
${brandLine}
${notesLine}

SCENE: ${sceneLine}

CAMERA: Vertical 9:16 smartphone UGC. Candid, not studio catalogue. Natural phone or prime-lens realism.
SKIN HARD RULE: Real human skin from persona refs — visible pores, natural texture. No plastic, waxy, porcelain, airbrushed, or beauty-filter skin.
IDENTITY: Face and body must match persona reference images exactly. Same person as refs.
PRODUCT: Must be recognisably the same product as the product reference (shape, colour, label, packaging). Do not substitute a generic item.

${visual.identityLock}

DO NOT: ${visual.negative}, wrong product, unreadable swapped label, floating product, mannequin hands, catalogue white infinity background unless scene asks for it`;
}

async function submitToFal({ falKey, prompt, imageUrls }) {
  const urls = (imageUrls || []).filter(Boolean).slice(0, 3);
  if (urls.length < 2) {
    throw new Error("Need product image URL plus at least one persona ref");
  }

  const res = await fetch(FAL_EDIT_QUEUE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_urls: urls,
      num_images: 1,
      resolution: GROK_RESOLUTION,
      output_format: "jpeg",
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`fal.ai non-JSON error (${res.status}): ${text.slice(0, 180)}`);
  }
  if (!res.ok || !data.request_id) {
    throw new Error(`fal.ai submit failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

function buildPackCaptions({ brandName, mode, personaName }) {
  const brand = brandName || "this";
  const who = personaName || "she";
  // Lightweight templates — operator can edit in UI
  return {
    tiktok: [
      `okay but ${brand} actually hits different`,
      `the way ${who} uses ${brand} > any ad`,
      `not sponsored energy, just good product`,
    ],
    instagram: [
      `Keeping it simple with ${brand}.`,
      `In rotation for a reason.`,
      `Quiet favourite.`,
    ],
    ad_hook: [
      `Stop scrolling — this is the ${mode === "wear" ? "fit" : "product"} people keep asking about.`,
      `UGC that doesn't look like an ad.`,
    ],
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const falKey = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!falKey) return res.status(500).json({ error: "FAL key not configured" });

  let body;
  try {
    body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const {
    productImageUrl,
    personaId = "cara",
    mode = "hold",
    scene = "",
    brandName = "",
    productNotes = "",
    variants = 1,
  } = body;

  if (!productImageUrl || typeof productImageUrl !== "string") {
    return res.status(400).json({ error: "productImageUrl is required (public HTTPS URL)" });
  }

  const visual = getPersonaVisual(personaId);
  const personaRefs = refsForSubmit(visual.refs);
  // Product first, then up to 2 identity refs (fal max 3)
  const imageUrls = [productImageUrl, ...personaRefs].slice(0, 3);

  const prompt = buildUgcPrompt({
    personaId: visual.id,
    mode,
    scene,
    brandName,
    productNotes,
  });

  const n = Math.min(Math.max(parseInt(variants, 10) || 1, 1), 5);
  const jobs = [];

  try {
    for (let i = 0; i < n; i++) {
      const queueData = await submitToFal({ falKey, prompt, imageUrls });
      const requestId = queueData.request_id;
      jobs.push({
        requestId,
        statusUrl: queueData.status_url || `${FAL_EDIT_REQUESTS_BASE}/${requestId}/status`,
        resultUrl: queueData.response_url || `${FAL_EDIT_REQUESTS_BASE}/${requestId}`,
        variant: i + 1,
      });
    }
  } catch (e) {
    return res.status(502).json({ error: "UGC submit failed", detail: e.message });
  }

  const captions = buildPackCaptions({
    brandName,
    mode,
    personaName: visual.name,
  });

  return res.status(200).json({
    ok: true,
    personaId: visual.id,
    personaName: visual.name,
    mode,
    jobs,
    captions,
    model: "xai/grok-imagine-image/v2.0/edit",
    image_urls_used: imageUrls,
  });
}
