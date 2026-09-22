// src/imageGeneration/qwenImageClient.js
export const QWEN_IMAGE_PROVIDER = {
  id: "qwen-image-2.1-space",
  label: "Qwen Image 2.1",
  space: "Qwen/Qwen-Image-2.1",
};
export const QWEN_IMAGE_ASPECTS = {
  "9:16": [1536, 2688],
  "16:9": [2688, 1536],
  "1:1": [2048, 2048],
  "4:3": [2368, 1728],
  "3:4": [1728, 2368],
};
export function aspectFromVision(visionJson, fallback = "9:16") {
  const value = visionJson?.canvas?.aspect_ratio || fallback;
  return Object.prototype.hasOwnProperty.call(QWEN_IMAGE_ASPECTS, value) ? value : fallback;
}
export function promptFromVision(visionJson) {
  if (!visionJson || typeof visionJson !== "object") return "";
  const sections = ["objective","canvas","scene","subject","face","skin","hair","jewelry","wardrobe","body_and_pose","background","lighting","camera","composition_geometry","colour_palette","photographic_style","final_generation_instruction"];
  return sections.filter((key) => visionJson[key] != null).map((key) => key + ": " + JSON.stringify(visionJson[key])).join("\n").slice(0, 16000);
}
export async function generateCreatorImage({
  creator = "cara",
  visionJson = null,
  flowPrompt = "",
  references = null,
  aspectRatio = null,
  seed = 42,
  randomizeSeed = true,
  postId = null,
} = {}) {
  const { supabase } = await import("../supabase");
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const response = await fetch("/api/store-image", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: JSON.stringify({
      mode: "qwen",
      provider: "qwen-image-2.1",
      personaId: creator,
      visionJson,
      flowPrompt: flowPrompt || promptFromVision(visionJson),
      references: Array.isArray(references) && references.length ? references.slice(0, 10) : undefined,
      aspectRatio: aspectRatio || aspectFromVision(visionJson),
      seed,
      randomizeSeed,
      postId,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Qwen Image 2.1 generation failed.");
  return body;
}
