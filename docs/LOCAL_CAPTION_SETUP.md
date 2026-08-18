# CAIG Local Caption Worker

The caption engine is intentionally split into a cloud UI/job queue and a local rendering worker. Heavy transcription and FFmpeg rendering stay on the machine running the worker.

## macOS setup

This path is designed for Apple Silicon Macs. MLX Whisper provides word-level timestamps directly, which the caption renderer converts into ASS karaoke timing. citeturn357951search2turn357951search0

From the CAIG repo:

```bash
./scripts/setup-local-caption-worker.sh
```

The setup installs FFmpeg, creates `.venv-caption`, installs the local Python requirements, and writes `.env.caption.local`.

Set these values in `.env.caption.local`:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
FFMPEG_BIN=/opt/homebrew/bin/ffmpeg
WHISPER_URL=http://127.0.0.1:8787
WHISPER_MODEL=mlx-community/whisper-large-v3-turbo
```

Apply the Supabase migration before queueing jobs:

```text
supabase/migrations/20260818080000_caption_engine.sql
```

Then use two terminals.

Terminal A:

```bash
source .env.caption.local
npm run caption:whisper
```

Terminal B:

```bash
source .env.caption.local
npm run caption:worker
```

Check the local transcription service:

```bash
curl http://127.0.0.1:8787/health
```

The expected response includes `ok: true` and the configured Whisper model.

## Workflow

1. Open CAIG → Caption Studio.
2. Paste a publicly reachable source video URL.
3. Pick the editorial caption treatment.
4. Leave local transcription enabled unless word timestamps are supplied manually.
5. Queue the render.
6. The local worker claims the Supabase job, downloads the source, transcribes it locally, generates ASS captions, renders with FFmpeg, uploads the final MP4 and marks the job complete.

The worker does not require Vercel to execute FFmpeg or Whisper.
