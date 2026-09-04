# Cornerstone AI Enterprises — Operator OS

This repository powers the internal Cornerstone AI Enterprise operating application.

## Current operating model

Cornerstone is built around three engines under one command layer:

### Track A — Revenue Recovery

The niche is **revenue leakage**, not a customer vertical. Track A helps lead-driven businesses recover opportunities that already entered their pipeline but went quiet, stale, unworked or stalled.

`Target account -> Recovery conversation -> Leakage diagnosis -> Controlled test -> Measured recovery -> Repeat / recurring support`

Potential markets include automotive, property, finance, insurance, recruitment, professional services, agencies, SaaS, education, healthcare, fitness, hospitality, trades and other businesses where leads and opportunities can disappear before a sale.

The commercial message is problem-first: **where is revenue entering the business, and where is it disappearing?** AI is the mechanism for identifying leakage, prioritising opportunities and generating context-specific recovery actions. It is not another CRM and it is not positioned as generic AI automation.

### Track B — Content Intelligence & Production Engine

Track B is an owned-media/content factory. It does not depend on finding clients. It finds content that is already proving demand, understands why it works, builds a materially original stronger version, multiplies it into short-form, publishes, measures and monetises.

`Discover -> Analyse -> Build -> Multiply -> Publish -> Monetise -> Measure -> Repeat`

Inputs can include successful YouTube videos, TikTok/Instagram formats, transcripts, reference notes, current trend signals and explicit niche/channel decisions. A reference is used to study demand and mechanism, never to copy wording, footage, narration, branding or distinctive execution.

Cara and Lila remain owned creator assets inside Track B. Their audience, character bibles and platform context are respected when content is made for them. TikTok Shop, affiliate offers, Fanvue, YouTube advertising where eligible, sponsorships, products, subscriptions and licensing are downstream monetisation tests rather than the definition of the engine.

### New Life — Personal Execution Engine

New Life is the personal operating system for action, discipline, family, health, money and long-term stewardship. It supports the operator rather than becoming another business distraction.

## Application surfaces

- `/` — Cornerstone Enterprise command screen for Track A, Track B and New Life.
- `/creative` — canonical Track B Content Engine and persistent generation library.
- `/outreach` — canonical Track A Revenue Recovery outreach workspace.
- `/ceo` — read-focused CEO control room.
- `/territory`, `/workbench`, `/main-app` — compatibility surfaces retained only where needed for transition; they are not strategy authorities.

## Shared operating loop

`Objective -> Research -> Decision -> Brief -> Human Quality Gate -> Production -> Persistent Asset -> Publish -> Measure -> Learn`

Track A uses the same evidence discipline for commercial recovery. Track B uses it for content and audience growth. Data and research remain domain-scoped so evidence does not bleed between engines.

## Content Engine capabilities

The canonical Track B workspace can:

1. discover current opportunities in a selected niche;
2. analyse a reference video or content format;
3. identify the mechanism, strengths, weaknesses and originality opportunity;
4. produce an original long-form package with titles, thumbnails, script and visual plan;
5. derive multiple standalone Shorts from the finished long-form concept;
6. create publication/SEO guidance;
7. design monetisation tests;
8. record research and job state in the persistent generation system.

## Research domains

- `TRACK_A_REVENUE_RECOVERY` — revenue leakage, lead handling, follow-up, pipeline recovery and missed opportunity signals.
- `TRACK_B_CONTENT_ENGINE` — public content performance, niche demand, storytelling, packaging, retention and format mechanisms.
- `TRACK_B_CREATOR_GROWTH` — creator-specific mode for Cara/Lila when their character/audience context is explicitly selected.

The older automotive-only and fixed YouTube-business research domains are retired from active architecture.

## Production rules

- Research is workspace/domain-scoped.
- Public-web research is not private account analytics.
- Prefer repeated winners over isolated viral outliers.
- Abstract mechanisms; do not copy protected executions.
- The Human Quality Gate runs before expensive generation.
- Source and derived assets remain distinct and persistent.
- Final media can be visually verified by local Qwen Vision when required.
- No invented claims, testimonials, audience reactions or performance metrics.
- Build only what removes a demonstrated bottleneck.
- Measure business outcomes, not software activity.

## Local services

```bash
npm run qwen:server
npm run qwen:worker
npm run qwen:vision:server
npm run qwen:scene:worker
```

Qwen is the intelligence layer. FAL and other approved providers are renderer implementations only. Supabase provides durable job/state storage. Vercel provides secure API orchestration.

## Architecture rule

There is one canonical implementation per active capability. Do not create `V2`, `V3`, `Unified`, `Final`, `New`, `Test` or parallel workspaces for an existing function. Historical components may remain under `src/legacy/` for reference, but they are not active strategy authorities.

## Security

Keep service credentials server-side. Use authenticated access and database RLS where configured. Never rely on front-end routing as a security boundary. Keep Track A commercial data separate from Track B creative data.
