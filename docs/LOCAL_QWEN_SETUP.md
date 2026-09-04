# Cornerstone local AI stack

Cornerstone queues local intelligence work in Supabase. The Mac runs Qwen text, Qwen Vision, FFmpeg and Whisper locally and writes job results back to Supabase.

## Qwen text

Default model:

`orcarouter/Qwen3.8-27B-Uncensored-MLX`

The local server exposes an OpenAI-compatible endpoint on `http://127.0.0.1:8000`.

## Qwen Vision

The Track B visual-analysis service exposes an OpenAI-compatible endpoint on `http://127.0.0.1:8001`.

Default model:

`mlx-community/Qwen2.5-VL-3B-Instruct-4bit`

## Whisper

The local Whisper service runs on `http://127.0.0.1:8787` and exposes `/health` and `/transcribe`.

Default model:

`mlx-community/whisper-large-v3-turbo`

The Track B source worker explicitly extracts audio with FFmpeg to 16 kHz mono PCM WAV before sending it to Whisper, so video and audio references follow the same timestamped transcript path.

## Track B source worker

After the browser uploads a source into the private `track-b-source-media` bucket, Cornerstone queues a `content_media_ingestion` job. Start the worker with:

```bash
source .env.qwen.local
npm run qwen:source:worker
```

The worker performs:

`private source -> download -> ffprobe -> FFmpeg audio -> FFmpeg representative frames -> Whisper timestamps -> Qwen Vision -> queued Qwen text analysis -> unified evidence`

The Content Engine consumes that evidence before producing the original package.

## Local terminals

Terminal A — Qwen text:

```bash
source .env.qwen.local
npm run qwen:server
```

Terminal B — Qwen text queue worker:

```bash
source .env.qwen.local
npm run qwen:worker
```

Terminal C — Qwen Vision:

```bash
source .env.qwen.local
npm run qwen:vision:server
```

Terminal D — Whisper:

```bash
source .env.qwen.local
npm run caption:whisper:start
```

Terminal E — Track B source ingestion:

```bash
source .env.qwen.local
npm run qwen:source:worker
```

Terminal F — Track B scene QA, used for final generated-media verification before publishing:

```bash
source .env.qwen.local
npm run qwen:scene:worker
```

The browser/Vercel application itself does not replace the local workers. It queues jobs and reads their state from Supabase.

## Supabase

The Track B source-media bucket is private and user-scoped. Browser uploads are stored beneath the authenticated user's ID. The worker retrieves them with a short-lived signed URL.

Environment values used by the workers include:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
TRACK_B_SOURCE_BUCKET=track-b-source-media
WHISPER_URL=http://127.0.0.1:8787
QWEN_URL=http://127.0.0.1:8000
QWEN_VISION_URL=http://127.0.0.1:8001
QWEN_MODEL=...
QWEN_VISION_MODEL=...
```

Keep service-role credentials in the local env file only. Never expose them in the browser bundle.

## 16 GB Apple Silicon guidance

Run one heavyweight model at a time when memory pressure becomes significant. The architecture is model-agnostic: change the model environment variable rather than rewriting application logic.
