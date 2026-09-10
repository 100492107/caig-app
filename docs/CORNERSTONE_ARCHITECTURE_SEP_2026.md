# Cornerstone architecture

## Command
Command is the control layer. It answers four questions only:

- VALUE — revenue recovery and content return
- FLOW — jobs, production and publishing
- HEALTH — AI, queue, errors and dependencies
- NEXT — the single best action

Command should not duplicate workspaces. It routes the operator to the work that needs attention.

## Product tree

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

## Content loop

`Discover → Analyse → Build → Multiply → Publish → Monetise → Measure → Repeat`

The UI groups the execution surface into the six operator stages requested above. Discovery and analysis happen inside Remake today and can be split later without changing the top-level information architecture.

## Revenue

Track A remains a separate revenue-recovery workspace. Its canonical journey is:

`Lead → Contact → Conversation → Appointment → Opportunity → Deal`

Vertical is context. Revenue leakage is the product domain.

## System boundaries

- Browser auth is Supabase session auth.
- Server mutations require a verified Supabase user session.
- Server-only service-role access is scoped by that authenticated user ID.
- Local AI is an execution dependency, not the command layer itself.
- Track B source media stays private and is stored under the authenticated user's path.
- Content return is measured from owned performance evidence, not assumed.

## Data direction

The long-term canonical Track B model is:

`Workspace → Project → Source/Evidence → Concept → Asset → Production → Shots → Derivatives → Publication → Performance → Learning → Creative DNA`

The legacy `content_queue` should be treated as a publishing projection during convergence, not the primary content model.

## Reliability rules

Every user-facing job should have an owner, durable status, retry-safe transitions, observable failure stage and a clear next action. Workers can use service-role access because they are trusted server processes; browser clients may not.

## Compatibility

Legacy routes remain as compatibility aliases while the canonical routes are:

- `/` — Command
- `/content/remake`
- `/content/creators`
- `/content/profiles`
- `/content/production`
- `/content/publish`
- `/content/measurement`
- `/revenue`
- external New Life — Operator
- `/system`

No new parallel `V2`, `V3`, `Final`, `Unified` or duplicate workspace should be added for an existing capability.
