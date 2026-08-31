# Cornerstone AI Enterprises — Operator OS

This repository powers the internal Cornerstone operating application.

## Canonical operating model

The application is outcome-led rather than provider-led:

`Objective → Research → Decision → Brief → Human Quality Gate → Production → Persistent Asset → Caption → Publish → Measure → Creative DNA`

Track A and Track B are deliberately isolated:

- **Track A — cash engine:** US automotive dealer outreach, merchandising, sample → diagnostic → pilot → recurring support.
- **Track B — owned media/creator engine:** Cara, Lila and duo production, research, identity-locked generation, captions, publishing and learning.
- **YouTube — long-form lane:** adult animated business/money storytelling, kept separate from both Tracks A and B.

## Operator Workbench

- `/` — adaptive operator home. Morning defaults to the Revenue Block; afternoon defaults to Production Sprint.
- `/workbench` — Operator Workbench with Revenue Block, Learning Loop and Production Sprint tabs.
- `/creative` — Creative Engine Hub + persistent generation library.
- `/outreach` — Track A acquisition and dealer workflow.
- `/main-app` — legacy operational surface retained during controlled consolidation.
- `/ceo` — CEO Control Room view.

### Revenue Block

Track A pipeline stages are persisted as measurable events: outreach → positive reply → sample → diagnostic → pilot → recurring. A one-screen sample package action queues local Qwen with real dealer/listing context and produces a merchandising diagnosis, image direction, before/after explanation and diagnostic-call questions.

### Learning Loop

After publishing, the operator can capture reach/views/saves/shares/profile actions/clicks/conversions/revenue plus a short “why this worked” note. The system scores the outcome, promotes qualifying winners into reusable Creative DNA, extracts the invariant mechanism and stores controlled-variation guidance. “Replicate with controlled variation” writes that learning into the existing Autopilot state so the next Autopilot run starts with the proven mechanism rather than relying on memory.

Public-social proof and Fanvue monetisation proof are stored separately.

### Production Sprint

The operator gets a keyboard-first A/R/K review queue, a cost pre-flight with cheaper-path suggestion, persistent caption-backlog visibility and a scene-contract pre-flight. The database also stores scene contracts and source/derived asset provenance so production can be traced back to the creative decision, prompt, model, provider and cost.

## Production rules

1. Research is workspace/domain-scoped evidence. Never mix Track A, Track B or YouTube research.
2. The Human Quality Gate is a required production stage before premium generation spend.
3. Source assets and derived assets remain distinct and persist in the application storage model.
4. Publication is job-based, idempotent and retry-aware.
5. Creative DNA is stored as evidence-backed patterns, not as generic prompt inspiration.
6. The operator home should make the next commercially useful action obvious.
7. Winners earn reuse only from measured evidence; the system replicates mechanisms, not protected executions.

## Legacy components

Unused versioned workspace files (`*V2`–`*V7`, Unified, Flow variants) have been moved to `src/legacy/`. Do not import them for new work. A few transitional V* surfaces remain temporarily referenced by CreativeEngineHub and will be collapsed into the canonical surfaces.

## Deployment

The project is a Vite/React application deployed on Vercel. The five-minute publisher is intentionally scheduled outside Vercel Cron so it remains compatible with the Hobby plan; GitHub Actions calls `/api/cron-publish` with `CRON_SECRET`.

## Required production configuration

Vercel/server-side runtime requires the appropriate Supabase service credentials and the scheduled-publisher webhook. GitHub Actions requires a repository secret named `CRON_SECRET`.

The browser may use a Supabase publishable/anonymous client key for authenticated client operations; database RLS, not key secrecy, is the security boundary. Privileged service-role and third-party provider keys must remain server-side.

## Supabase migrations

Run migrations in timestamp order. The `2026083112...` strict ownership migration is intentionally fail-closed for authenticated clients: existing NULL-owned rows are backfilled only when exactly one non-deleted Supabase user exists. Otherwise those rows remain inaccessible to client roles until explicitly assigned.

The operator leverage migration (`2026083115...`) adds revenue events, post-publish evidence, learning recommendations, caption backlog, scene contracts and asset provenance.

## Local services

The Qwen and caption/Whisper workers are separate processes. Start only the worker required for the current production block and verify its health before assuming the service is available.
