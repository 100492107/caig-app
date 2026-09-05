# Cornerstone Local AI Stack
*Current operating guidance · September 2026*

Cornerstone uses the Mac as the local intelligence and media-processing layer. The web application queues work; local services process it and write durable state back to Supabase.

## Services

### Qwen text

Default local model:

`mlx-community/Qwen3-8B-4bit`

Endpoint:

`http://127.0.0.1:8000`

### Qwen Vision

Default local model:

`mlx-community/Qwen2.5-VL-3B-Instruct-4bit`

Endpoint:

`http://127.0.0.1:8001`

Used for source-frame analysis and final scene verification where the workflow requires it.

### Whisper

Source-video ingestion can use the local Whisper service at:

`http://127.0.0.1:8787`

The source worker extracts 16 kHz mono audio with FFmpeg before transcription.

Whisper is an optional dependency of the broader stack. Do not assume it is healthy until its health endpoint succeeds. When it is unavailable, source-video jobs that require timestamps cannot complete and must report that dependency instead of pretending the analysis happened.

## Track B source worker

The Content Engine can upload a source video to the private `track-b-source-media` bucket and queue ingestion.

The target pipeline is:

`source → private storage → ffprobe → FFmpeg audio → transcript → representative frames → Qwen Vision → Qwen text analysis → unified evidence`

Start manually when needed:

```bash
source .env.qwen.local
npm run qwen:source:worker
```

## Normal worker commands

```bash
npm run qwen:server
npm run qwen:worker
npm run qwen:vision:server
npm run qwen:scene:worker
npm run qwen:source:worker
```

## LaunchAgent operation

The normal Mac setup uses LaunchAgents so the operator does not need a terminal tab open for every worker.

Expected loaded services include:

```text
com.cornerstoneaigroup.caig-workers
com.cornerstone.local-ai
```

Check:

```bash
launchctl list | grep cornerstone
```

A loaded service with exit status `0` indicates the LaunchAgent is currently loaded without reporting a non-zero last exit status. It does not, by itself, prove that every HTTP endpoint is healthy.

## Health checks

```bash
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:8001/health
npm run caption:whisper:health
```

Use only the checks supported by the service currently installed.

## 16 GB Apple Silicon guidance

Run heavy local models deliberately. The application is model-agnostic, so a model can be changed through environment configuration without rewriting the Content Engine.

The goal is not to keep every model permanently loaded. The goal is reliable intelligence at acceptable memory and cost.

## Security

Keep service-role credentials in the local env file and server-side functions. Never expose them in the browser bundle.
