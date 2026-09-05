# Local AI runbook (Mac)

The Vercel app queues work. The Mac runs Qwen and workers. Strategy changes do **not** require new models — only current code and running workers.

## 1. Find the real project paths

Do not assume `~/Business/caig-app`.

```bash
ls ~/Business
# common patterns:
#   ~/Business/caig-local-worker
#   a clone of github.com/100492107/caig-app somewhere else

find ~ -maxdepth 4 -type d -name 'caig-app' 2>/dev/null
find ~ -maxdepth 4 -type d -name 'caig-local-worker' 2>/dev/null
```

Enter the directory that contains `package.json` and `scripts/qwen-worker.mjs` (or the worker project that owns those scripts).

## 2. Env

```bash
source .env.qwen.local
# needs SUPABASE_URL / VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for workers
```

## 3. Start stack

Preferred (from caig-app root if present):

```bash
bash scripts/start-local-ai-stack.sh
```

Or manual terminals:

| Terminal | Command |
|----------|---------|
| Qwen text | `npm run qwen:server` |
| Qwen worker | `npm run qwen:worker` |
| Vision | `npm run qwen:vision:server` |
| Scene QA | `npm run qwen:scene:worker` |
| Whisper | `npm run caption:whisper:start` |
| Source ingest | `npm run qwen:source:worker` |

## 4. Health checks

```bash
curl -s http://127.0.0.1:8000/v1/models | head
curl -s http://127.0.0.1:8001/v1/models | head
curl -s http://127.0.0.1:8787/health
```

## 5. After `git pull`

Restart **workers** so prompt/domain/research code matches main. Model weights stay put.

## 6. New Life coach

Separate repo (`new-life-game`). May share Qwen on `:8000`. Must not share CAIG job queues or data. See that repo’s `AGENTS.md`.

## 7. Failure modes

| Symptom | Likely cause |
|---------|----------------|
| Outreach stays “Building…” | Worker offline or Qwen down |
| Content Engine times out | Same |
| UI loads fine, jobs never complete | Mac stack not running |
| `cd` / `npm` errors | Wrong directory — not a broken product |
