# Local AI stack (Mac)

Remake packages, media analysis, and Studio jobs all depend on this stack.

## One command

From the repo root (with `.env.qwen.local` present):

```bash
bash scripts/start-local-ai-stack.sh
```

This starts:

| Service | Port / role |
|---------|-------------|
| Qwen text (mlx) | `127.0.0.1:8000` — Remake packages, captions, research |
| Qwen Vision | `127.0.0.1:8001` — frame analysis on uploads |
| Whisper | `127.0.0.1:8787` — transcript on uploads (needs `.venv-caption`) |
| `qwen-worker.mjs` | Claims text jobs from `local_ai_jobs` |
| `content-source-ingestion-worker.mjs` | Claims `content_media_ingestion` jobs |
| `qwen-scene-worker.mjs` | Scene verify jobs |
| Heartbeat | Writes `local_ai_worker_heartbeat` so the app shows Online |

## Prerequisites

1. `.env.qwen.local` with at least:
   - `VITE_SUPABASE_URL` or `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. MLX Qwen installed (see `scripts/setup-local-qwen.sh`)
3. Optional for uploads: `bash scripts/setup-local-caption-worker.sh` (Whisper venv)
4. `ffmpeg` / `ffprobe` on PATH for media probe + frames

## Remake flow

1. App queues `content_engine` job via `/api/queue-update`
2. `qwen-worker` picks it up, calls local Qwen, writes result
3. App polls `job_status` until `completed`
4. **Save to Studio** writes `content_queue` (already cloud / Supabase)

## Upload analysis flow

1. File → Supabase Storage `track-b-source-media`
2. App queues `content_media_ingestion`
3. Ingestion worker: download → ffprobe → audio → Whisper → frames → Vision → queues text analysis
4. Qwen worker finishes text analysis
5. Remake folds evidence into the package job

## Cloud data map

| Data | Where |
|------|--------|
| Profiles + earnings | `user_owned_media` |
| Remake / Studio packages | `content_queue` |
| AI jobs | `local_ai_jobs` |
| Worker liveness | `local_ai_worker_heartbeat` |

Packages were already cloud-backed. Profiles/earnings use the new sync table.
