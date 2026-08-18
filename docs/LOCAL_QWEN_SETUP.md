# CAIG local Qwen3.8 brain

The cloud CAIG app queues local AI jobs in Supabase. Your Apple Silicon Mac runs Qwen locally and writes the result back to Supabase.

## Model

Default model:

`orcarouter/Qwen3.8-27B-Uncensored-MLX`

Model page: https://huggingface.co/orcarouter/Qwen3.8-27B-Uncensored-MLX

The local server uses `mlx_lm.server`, exposing an OpenAI-compatible endpoint on `http://127.0.0.1:8000`.

## macOS setup

From the CAIG repo:

```bash
./scripts/setup-local-qwen.sh
```

The setup creates `.venv-qwen` and installs `mlx-lm`. It also creates `.env.qwen.local`.

Put the same Supabase URL and service-role key used by the local caption worker into `.env.qwen.local`.

Apply:

```text
supabase/migrations/20260818090000_local_ai_jobs.sql
```

## Start Qwen

Terminal A:

```bash
source .env.qwen.local
npm run qwen:server
```

The first launch downloads the model from Hugging Face if it is not already cached. Keep an eye on macOS memory pressure during the first load because this Mac has 16 GB unified memory.

Terminal B:

```bash
source .env.qwen.local
npm run qwen:worker
```

The worker polls `local_ai_jobs`, sends each job to the local OpenAI-compatible Qwen endpoint and stores the text result back in Supabase.

## Use it in CAIG

Open:

`CAIG -> Local AI`

Queue the built-in hook test first. When the worker completes it, the result appears in the job history.

## 16 GB memory guidance

The application intentionally does not force swap-heavy inference. Start with the exact model checkpoint configured above. If the checkpoint cannot load cleanly or macOS reports sustained memory pressure, stop and switch to a smaller MLX quantisation rather than making the machine fight swap. The rest of the CAIG architecture is model-agnostic, so changing the `QWEN_MODEL` value is enough to test another compatible checkpoint.
