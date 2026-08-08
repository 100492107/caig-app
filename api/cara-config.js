// api/cara-config.js
// Single source of truth for Cara's LoRA identity. Update this file only
// when retraining — generate-submit.js and cron-generate.js both import from here.

export const CARA_LORA = {
  path: "https://v3b.fal.media/files/b/0aa58574/6hWDSoNLAhVr4ndSlXbEt_pytorch_lora_weights.safetensors",
  scale: 1, // 0.7–1.1 is the usual useful range; raise if likeness is weak, lower if it's overbaked/artifacted
};

export const CARA_TRIGGER = "Cara"; // must appear early in every prompt to activate the LoRA

export const FAL_LORA_MODEL = "fal-ai/flux-lora";
export const FAL_LORA_QUEUE_URL = `https://queue.fal.run/${FAL_LORA_MODEL}`;
export const FAL_LORA_REQUESTS_BASE = `https://queue.fal.run/${FAL_LORA_MODEL}/requests`;

export const CARA_IMAGE_SIZE = { width: 1080, height: 1920 }; // 9:16 vertical
