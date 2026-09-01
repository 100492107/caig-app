# Cornerstone AI Enterprises — Operator OS

This repository powers the internal Cornerstone operating application.

## Canonical operating model

The application is outcome-led rather than provider-led:

`Objective → Research → Decision → Brief → Human Quality Gate → Production → Persistent Asset → Caption → Publish → Measure → Creative DNA`

Track A and Track B are deliberately isolated:

- **Track A — cash engine:** US automotive dealer outreach, merchandising, territory control, sample → diagnostic → pilot → recurring support.
- **Track B — owned media/creator engine:** Cara, Lila and duo production, research, identity-locked generation, captions, publishing and learning.
- **YouTube — long-form lane:** adult animated business/money storytelling, kept separate from both Tracks A and B.

## Application surfaces

- `/` — Cornerstone AI Enterprise launcher. It is the top-level destination chooser for Track A, Track B and New Life.
- `/creative` — Creative Station / Track B production surface + persistent generation library.
- `/territory` — Track A ZIP territory control and unreplied-positive queue.
- `/outreach` — Track A acquisition and dealer workflow.
- `/workbench` — supporting Revenue Block, Learning Loop and Production Sprint operator workspace.
- `/ceo` — CEO Control Room view.
- `/main-app` — retained legacy operational surface during controlled consolidation.

### Revenue Block

Track A pipeline stages are persisted as measurable events: outreach → positive reply → sample → diagnostic → pilot → recurring. ZIP territories and unreplied positive leads are tracked separately so the cash engine can be worked systematically.

### Learning Loop

After publishing, the operator can capture reach/views/saves/shares/profile actions/clicks/conversions/revenue plus a short “why this worked” note. The system scores the outcome, promotes qualifying winners into reusable Creative DNA, extracts the invariant mechanism and stores controlled-variation guidance. Replication writes the learning into the existing Autopilot state so the next run starts with the proven mechanism rather than memory.

Public-social proof and Fanvue monetisation proof are stored separately.

### Production Sprint

The operator gets a keyboard-first A/R/K review queue, a cost pre-flight with cheaper-path suggestion, persistent caption-backlog visibility and a structured scene-contract pre-flight. Generated media can be verified visually against the contract before publish when QA is required, with local Qwen Vision providing the verdict.

## Production rules

1. Research is workspace/domain-scoped evidence. Never mix Track A, Track B or YouTube research.
2. The Human Quality Gate is a required production stage before premium generation spend.
3. Source assets and derived assets remain distinct and persist in the application storage model.
4. Publication is job-based, idempotent and retry-aware.
5. Creative DNA is stored as evidence-backed patterns, not as generic prompt inspiration.
6. The operator home should make the next commercially useful action obvious.
7. Winners earn reuse only from measured evidence; the system replicates mechanisms, not protected executions.
8. Automated scene verification is fail-closed for Track B content with final media: FAL renders the media, local Qwen Vision inspects it, Supabase stores the verdict, and publishing is blocked unless the verdict passes.
9. No external model provider is part of the intelligence or QA layer. Qwen runs locally on Apple Silicon. FAL is a media-generation provider only.

## Architecture

There is one canonical implementation per active capability. Do not create new `V2`, `V3`, `Unified`, `Final`, `New`, `Test` or parallel workspace components for an existing feature. Historical implementations are not runtime authorities and live under `src/legacy/` when retained for reference.

## Deployment

The project is a Vite/React application deployed on Vercel. The five-minute publisher is intentionally scheduled outside Vercel Cron so it remains compatible with the Hobby plan; GitHub Actions calls `/api/cron-publish` with `CRON_SECRET`.

## Required production configuration

Vercel/server-side runtime requires the appropriate Supabase service credentials and the scheduled-publisher webhook. GitHub Actions requires a repository secret named `CRON_SECRET`.

The browser may use a Supabase publishable/anonymous client key for authenticated client operations; database RLS, not key secrecy, is the security boundary. Privileged service-role and third-party provider keys must remain server-side. Where Vite environment variables are provisioned, use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` rather than duplicating client configuration in source.

## Supabase migrations

Run migrations in timestamp order. The strict ownership migrations are intentionally fail-closed for authenticated clients. Existing NULL-owned rows are backfilled only when exactly one non-deleted Supabase user exists; otherwise those rows remain inaccessible to client roles until explicitly assigned.

The operator leverage and scene-verification migrations add revenue events, evidence, learning recommendations, caption backlog, scene contracts, asset provenance, territory control and publish QA state.

## Local services

Normal production uses the local Qwen text server and worker. Track B final-media QA additionally requires a local Qwen Vision server and scene worker:

```bash
npm run qwen:server
npm run qwen:worker
npm run qwen:vision:server
npm run qwen:scene:worker
```

The vision server listens on `127.0.0.1:8001` by default and uses `QWEN_VISION_MODEL` from `.env.qwen.local` when supplied. The scene worker polls `local_ai_jobs` for `scene_verify` jobs, verifies images directly and extracts multiple frames from videos with local `ffmpeg` before asking local Qwen Vision for a strict pass/fail verdict.

Before first use of the vision server, the local Qwen environment needs `mlx-vlm` installed:

```bash
.venv-qwen/bin/pip install mlx-vlm
```

Qwen is the intelligence layer. FAL.ai is the renderer. Supabase is the durable state and evidence layer. Vercel is orchestration and secure API execution.
