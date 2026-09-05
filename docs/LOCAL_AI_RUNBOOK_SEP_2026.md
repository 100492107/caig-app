# Local AI Runbook — September 2026

## Purpose

Cornerstone uses a hybrid architecture. The hosted application handles UI, routing and persistence; local processes on the operator Mac provide local Qwen inference and media intelligence.

## Known services

| Service | Address | Model | Role |
|---|---|---|---|
| Text Qwen | `http://127.0.0.1:8000` | `mlx-community/Qwen3-8B-4bit` | reasoning, research synthesis, content planning and generation |
| Vision Qwen | `http://127.0.0.1:8001` | `mlx-community/Qwen2.5-VL-3B-Instruct-4bit` | visual understanding / scene verification |
| New Life coach | separate local worker | project-specific | New Life personal operating system |

## Known worker project

The known local worker directory is:

```bash
~/Business/caig-local-worker
```

The Qwen worker has historically been run with:

```bash
cd ~/Business/caig-local-worker
npm run qwen:worker
```

Do not assume the main `caig-app` repository is located at `~/Business/caig-app`. That path recently failed with `No such file or directory`. When the directory is unknown, locate the real checkout before using `git pull` or `npm`.

## LaunchAgent

Known LaunchAgent:

```bash
~/Library/LaunchAgents/com.cornerstone.local-ai.plist
```

It has historically been configured for `RunAtLoad` / `KeepAlive`, with a last-known successful exit state.

## Architecture

1. Browser/application queues a job.
2. Supabase persists the job.
3. Local worker consumes the job.
4. Worker builds the correct research/domain context.
5. Worker calls local Qwen and/or local vision infrastructure.
6. Worker writes result/status/errors back to persistence.
7. Application polls/reads the completed result.
8. Operator reviews and approves production output.

The renderer/provider is an implementation detail. The creative specification, context boundaries and stored outputs are the durable system.

## Research window

The known worker uses a seven-day current-signal window for research jobs. Previously used public sources include Google News RSS, Reddit weekly top posts, TikTok Creative Center pages and public/indexed Instagram references. Current public research is signal discovery, not private-account analytics.

## Domain firewall

Jobs must explicitly identify the research context. Current target domains are:

- `TRACK_A_REVENUE_RECOVERY`
- `TRACK_B_CREATOR_GROWTH`
- `TRACK_B_LONGFORM`
- `NEW_LIFE`

Never allow creator, Fanvue, gaming or YouTube context to become evidence for a Track A recovery job. Never allow dealership/business CRM context to become evidence for Track B creator or long-form jobs.

## Media stack

Known components include Qwen, local vision Qwen, FFmpeg, optional Whisper, and provider-based image/video generation. Whisper was previously not installed, so the system must handle missing Whisper cleanly rather than treating it as a hard dependency.

## Troubleshooting

### `cd ~/Business/caig-app` fails

The path is not the local checkout. Run a local filesystem search or inspect `~/Business` and enter the actual repository directory before continuing.

### `git pull` says “not a git repository”

The shell is not inside a Git checkout. Fix the `cd` step first.

### `npm` looks for `/Users/joseph/package.json`

The shell is in `~`, not a Node project. Fix the `cd` step first.

### Qwen job remains queued

Check the local Qwen worker is running, the Qwen service is reachable on port 8000, and the Supabase job row is being consumed/updated.

### Vision job fails

Check the service on port 8001 and the local vision model environment. The known model is `mlx-community/Qwen2.5-VL-3B-Instruct-4bit`.

### Never “fix” local AI by changing strategic context

A worker outage is an infrastructure problem. Do not solve it by weakening research firewalls, replacing source-of-truth rules or removing quality gates.
