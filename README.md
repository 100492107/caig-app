# Cornerstone AI Enterprises — Operator OS

This repository powers the internal Cornerstone operating application.

## Canonical operating model

The application is outcome-led rather than provider-led:

`Objective → Research → Decision → Brief → Human Quality Gate → Production → Persistent Asset → Caption → Publish → Measure → Creative DNA`

Track A and Track B are deliberately isolated:

- **Track A — cash engine:** US automotive dealer outreach, merchandising, sample → diagnostic → pilot → recurring support.
- **Track B — owned media/creator engine:** Cara, Lila and duo production, research, identity-locked generation, captions, publishing and learning.
- **YouTube — long-form lane:** adult animated business/money storytelling, kept separate from both Tracks A and B.

## Production rules

1. Research is workspace/domain-scoped evidence. Never mix Track A, Track B or YouTube research.
2. The Human Quality Gate is a required production stage before premium generation spend.
3. Source assets and derived assets remain distinct and persist in the application storage model.
4. Publication is job-based, idempotent and retry-aware.
5. Creative DNA is stored as evidence-backed patterns, not as generic prompt inspiration.
6. The operator home should make the next commercially useful action obvious.

## Runtime surfaces

- `/` — CEO Control Room / next-best-action home.
- `/creative` — Creative Engine Hub + persistent generation library.
- `/outreach` — Track A acquisition and dealer workflow.
- `/main-app` — legacy operational surface retained during controlled consolidation.

## Deployment

The project is a Vite/React application deployed on Vercel. The five-minute publisher is intentionally scheduled outside Vercel Cron so it remains compatible with the Hobby plan; GitHub Actions calls `/api/cron-publish` with `CRON_SECRET`.

## Required production configuration

Vercel/server-side runtime requires the appropriate Supabase service credentials and the scheduled-publisher webhook. GitHub Actions requires a repository secret named `CRON_SECRET`.

The browser may use the Supabase anonymous key for authenticated client operations; database RLS, not key secrecy, is the security boundary.

## Supabase migrations

Run migrations in timestamp order. The `2026083112...` strict ownership migration is intentionally fail-closed for authenticated clients: existing NULL-owned rows are backfilled only when exactly one non-deleted Supabase user exists. Otherwise those rows remain inaccessible to client roles until explicitly assigned.

## Local services

The Qwen and caption/Whisper workers are separate processes. Start only the worker required for the current production block and verify its health before assuming the service is available.
