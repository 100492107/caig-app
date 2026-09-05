# Cornerstone AI Enterprise Operating Rules

**Canonical strategy document:** `docs/CORNERSTONE_MASTER_CONTEXT.md`  
**Local AI runbook:** `docs/LOCAL_RUN.md`

This repository is the operating system for Cornerstone AI Enterprises. Product decisions, research, Qwen jobs and new UI must follow the three-engine architecture.

## Mission

- **Track A — Revenue Recovery:** recover revenue already entering a business but lost when leads, enquiries, conversations, appointments, quotes or opportunities go cold.
- **Track B — Content Engine:** find proven demand, understand why it works, build original stronger content, multiply, publish, monetise, measure.
- **New Life — Personal Execution:** operator discipline, family, health, finances (separate app/repo).

Track A = cash now. Track B = compounding assets. New Life = capacity to run both.

## Canonical routes

- `/` → `EnterpriseCommandHome.jsx`
- `/creative` → `TrackBApplication.jsx` + `PersistentGenerations.jsx`
- `/outreach` → `TrackAOutreachWorkspace.jsx`
- `/ceo` → `CEOHome.jsx`
- `/territory`, `/workbench`, `/main-app` → compatibility only

External Track A CRM: `https://cornerstonegroupdatabase.vercel.app/`

Do not create parallel V2/V3/Final/Unified workspaces for an existing capability.

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
