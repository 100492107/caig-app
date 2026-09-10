# Cornerstone AI Enterprise Operating Rules

**Canonical strategy document:** `docs/CORNERSTONE_MASTER_CONTEXT.md`  
**Architecture document:** `docs/CORNERSTONE_ARCHITECTURE_SEP_2026.md`  
**Local AI runbook:** `docs/LOCAL_RUN.md`

This repository is the operating system for Cornerstone AI Enterprises. Product decisions, research, Qwen jobs and new UI must follow the canonical enterprise architecture.

## Mission

- **Track A — Revenue Recovery:** recover revenue already entering a business but lost when leads, enquiries, conversations, appointments, quotes or opportunities go cold.
- **Track B — Content Engine:** find proven demand, understand why it works, build original stronger content, multiply, publish, monetise, measure.
- **New Life — Personal Execution:** operator discipline, family, health, finances (separate app/repo).

Track A = cash now. Track B = compounding assets. New Life = capacity to run both.

## Canonical product tree

```text
Cornerstone
├── Command
├── Content
│   ├── Remake
│   ├── Creators
│   ├── Profiles
│   ├── Production
│   ├── Publish
│   └── Measure
├── Revenue
├── Operator
└── System
```

## Canonical routes

- `/` → Command
- `/content/remake` → Remake
- `/content/creators` → Creators
- `/content/profiles` → Profiles
- `/content/production` → Production
- `/content/publish` → Publish
- `/content/measurement` → Measure
- `/revenue` → Track A Revenue Recovery
- Operator → external New Life application
- `/system` → system health and dependencies

Compatibility aliases may remain temporarily (`/creative`, `/outreach`, `/ceo`, `/territory`, `/workbench`, `/main-app`) but new work must use canonical routes.

## Command

Command is control, not another workspace. It presents:

- **VALUE** — revenue / recovery / content return
- **FLOW** — jobs / production / publish
- **HEALTH** — AI / queue / errors / dependencies
- **NEXT** — one best action

## Track A

Domain: revenue leakage on `Lead → Contact → Conversation → Appointment → Opportunity → Deal`.  
Vertical is context, not identity. Research domain: `TRACK_A_REVENUE_RECOVERY`.  
Outreach: pain + value + cliffhanger; no em dashes; no photo/listing product language; no invented metrics.

## Track B

**Locked stages:** `Discover → Analyse → Build → Multiply → Publish → Monetise → Measure → Repeat`  
Research domain: `TRACK_B_CONTENT_ENGINE`.  
Cara/Lila are applications, not the whole engine. Client delivery is optional, not primary.  
Reference content is a teacher, not a template.

## Research firewalls

Never blend Track A commercial evidence with Track B content evidence.  
Public research ≠ owned analytics. Prefer repeated patterns. Label hypotheses.

## Qwen

Local Qwen is the intelligence layer. Identify domain → load context → research if needed → separate evidence from inference → human quality gate → durable job state.  
Rendering providers are implementation details.

## Security

- Browser actions must be authenticated.
- Server APIs must verify the Supabase user independently of UI auth.
- Service-role keys are server-only and every privileged operation must be scoped to the authenticated owner.
- Never trust a browser-supplied user ID for ownership.
- New private storage paths must begin with the authenticated user's ID.
- Do not add globally permissive authenticated or anonymous RLS policies to user data.

## Never

- Track A as automotive-only or visual-assets product
- Track B as client-delivery-first or permanent single niche
- Copy distinctive source execution
- Invent metrics or private performance data
- Parallel workspaces for one job
- Secrets in browser code
- External AI as Cornerstone intelligence or final scene QA

## Workers

`npm run qwen:server` · `npm run qwen:worker` · `npm run qwen:vision:server` · `npm run qwen:scene:worker`  
See `docs/LOCAL_RUN.md`.
