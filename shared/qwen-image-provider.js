// shared/qwen-image-provider.js
// Server-side adapter for the hosted Qwen/Qwen-Image-2.1 Gradio Space.
// Kept outside /api so it does not count as an additional Vercel Function.

import { getPersonaVisual } from "../api/cara-config.js";

const SPACE_URL = (process.env.QWEN_IMAGE_SPACE_URL || "https://qwen-qwen-image-2-1.hf.space").replace(/\/$/, "");
const SPACE_TOKEN = process.env.QWEN_IMAGE_HF_TOKEN || process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || "";

export const QWEN_IMAGE_SIZES = {
  "9:16": [1536, 2688],
  "16:9": [2688, 1536],
  "1:1": [2048, 2048],
  "4:3": [2368, 1728],
  "3:4": [1728, 2368],
};

function text(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

function compactVision(visionJson) {
  if (!visionJson || typeof visionJson !== "object") return "";
  const sections = [
    "objective","canvas","scene","subject","face","skin","hair","jewelry","wardrobe",
    "body_and_pose","background","lighting","camera","composition_geometry","colour_palette",
    "photographic_style","negative_prompt","final_generation_instruction"
  ];
  return sections
    .filter((key) => visionJson[key] != null && text(visionJson[key]))
    .map((key) => key.toUpperCase() + ": " + text(visionJson[key]))
    .join("\n")
    .slice(0, 18000);
}

function buildPrompt({ personaId, visionJson, flowPrompt }) {
  const visual = getPersonaVisual(personaId);
  const vision = compactVision(visionJson);
  const identity = visual.id === "duo"
    ? "Use the supplied Cara and Lila reference images as two separate canonical identity anchors. Keep both women recognisably distinct; never merge or swap their identities."
    : "Use the supplied " + visual.name + " reference images as the canonical identity anchor. Preserve the same face, hair identity, proportions, skin characteristics and recognisable details across the output.";
  const scene = text(flowPrompt) || ["Create the image exactly from the supplied production vision specification.", vision].filter(Boolean).join("\n");
  return [
    identity,
    "Create an original creator image.",
    scene,
    vision ? "Production vision specification:\n" + vision : "",
    "Preserve real human anatomy, natural skin texture, coherent hands, believable objects, logical spatial relationships and continuity with the supplied references.",
    "Do not add text, captions, logos, watermarks or social-media interface elements unless the production specification explicitly requires visible text.",
  ].filter(Boolean).join("\n\n").slice(0, 30000);
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  if (SPACE_TOKEN) headers.Authorization = "Bearer " + SPACE_TOKEN;
  return headers;
}

function parseSseEvents(buffer) {
  const events = [];
  for (const chunk of buffer.split(/\n\n+/)) {
    if (!chunk.trim()) continue;
    let event = "message";
    const dataLines = [];
    for (const line of chunk.split(/\r?\n/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) events.push({ event, data: dataLines.join("\n") });
  }
  return events;
}

function findMedia(value) {
  if (!value) return null;
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? { url: value } : { path: value };
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMedia(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    if (typeof value.url === "string" && value.url) return { url: value.url };
    if (typeof value.path === "string" && value.path) return { url: value.path };
    if (value.data != null) return findMedia(value.data);
  }
  return null;
}

function absoluteMediaUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith("/") ? SPACE_URL + value : SPACE_URL + "/" + value;
}

export async function generateQwenImageServer({
  personaId,
  visionJson = null,
  flowPrompt = "",
  aspectRatio = "9:16",
  seed = 42,
  randomizeSeed = true,
}) {
  const [width, height] = QWEN_IMAGE_SIZES[aspectRatio] || QWEN_IMAGE_SIZES["9:16"];
  const visual = getPersonaVisual(personaId);
  const prompt = buildPrompt({ personaId, visionJson, flowPrompt });
  const negativePrompt = [
    Array.isArray(visionJson?.negative_prompt) ? visionJson.negative_prompt.join(", ") : text(visionJson?.negative_prompt),
    visual.negative,
  ].filter(Boolean).join(", ");
  const refs = visual.refs.slice(0, 10);
  const submit = await fetch(SPACE_URL + "/gradio_api/call/generate_with_enhance", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json", "x-gradio-user": "api" }),
    body: JSON.stringify({
      data: [
        refs.map((url) => [url, null]),
        prompt,
        false,
        true,
        "",
        Number.isFinite(Number(seed)) ? Number(seed) : 42,
        Boolean(randomizeSeed),
        height,
        width,
        negativePrompt || "",
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  const submitText = await submit.text();
  let submitBody = {};
  try { submitBody = JSON.parse(submitText); } catch {}
  if (!submit.ok || !submitBody?.event_id) {
    throw new Error("Qwen Space submit failed (" + submit.status + "): " + submitText.slice(0, 500));
  }

  const resultResponse = await fetch(
    SPACE_URL + "/gradio_api/call/generate_with_enhance/" + encodeURIComponent(submitBody.event_id),
    {
      headers: authHeaders({ Accept: "text/event-stream", "x-gradio-user": "api" }),
      signal: AbortSignal.timeout(290000),
    },
  );
  if (!resultResponse.ok) {
    throw new Error("Qwen Space result stream failed (" + resultResponse.status + ")");
  }
  if (!resultResponse.body) throw new Error("Qwen Space returned no result stream.");

  const reader = resultResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      for (const item of parseSseEvents(buffer)) {
        if (item.event === "error") throw new Error("Qwen Space generation error: " + item.data.slice(0, 500));
        if (item.event !== "complete") continue;
        let data;
        try { data = JSON.parse(item.data); } catch { throw new Error("Qwen Space returned invalid completion data."); }
        const media = findMedia(Array.isArray(data) ? data : (data?.data || data));
        if (!media) throw new Error("Qwen Space completed without an image result.");
        return {
          sourceUrl: absoluteMediaUrl(media.url || media.path),
          requestId: submitBody.event_id,
          width,
          height,
          seed: Number.isFinite(Number(seed)) ? Number(seed) : 42,
          referenceCount: refs.length,
        };
      }
      const boundary = buffer.lastIndexOf("\n\n");
      if (boundary >= 0) buffer = done ? "" : buffer.slice(boundary + 2);
      if (done) break;
    }
  } finally {
    try { await reader.cancel(); } catch {}
  }
  throw new Error("Qwen Space result stream ended without a completed image.");
}
