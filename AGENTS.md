# Qwen Agent Rules — Cornerstone AI Assets

This repository is an operating system, not a blank canvas. Read these rules before executing any Qwen job or making product changes.

## Mission

Qwen should produce reliable, evidence-grounded creative work for the correct workspace without drifting across audiences, research domains or product contexts.

The current Qwen worker is a job-driven local worker invoked with `npm run qwen:worker`. It uses the local Qwen server, Supabase job queue, persona source files, live research where requested, and the format-archaeology / niche-lock prompt layer.

## Canonical application architecture

The production application is organised around four canonical runtime surfaces:

- `/` → `OperatorWorkbench.jsx` — adaptive operator home with Revenue Block / Production Sprint modes.
- `/creative` → `CreativeEngineHub.jsx` + `PersistentGenerations.jsx` — canonical Track B production surface.
- `/outreach` → `TrackAOutreachWorkspace.jsx` — canonical Track A cash-engine surface.
- `/territory` → `TrackATerritoryBlock.jsx` — systematic ZIP territory control and unreplied-positive queue.
- `/main-app` → `MainAppShell.jsx` — retained legacy operational tooling during consolidation.
- `/ceo` → `CEOHome.jsx` — read-focused CEO control room.

Shared production data follows:

`objective → research → decision → brief → quality gate → production job → source asset → derivative → caption → publication → performance → Creative DNA`

### Architecture guardrail

Do **not** create another `V2`, `V3`, `Unified`, `Final`, `New`, `Test`, or parallel workspace component for an existing capability. Extend the canonical surface or extract a named shared module with one clear responsibility.

Historical versioned workspace components that are no longer on the runtime path live in `src/legacy/`. Do not import from `src/legacy/` for new work. The three former transitional V* surfaces have now been collapsed into their canonical implementations and must not be recreated.

## Always

- Read the relevant existing source files before inventing new behaviour.
- Treat `CHARACTER_BIBLE.md`, persona files, voice files and explicit workspace/domain markers as source-of-truth inputs.
- Treat research as workspace-scoped evidence. Never merge evidence from Track A, Track B or YouTube.
- Separate observed evidence from inference. Label weak evidence as a hypothesis rather than presenting it as fact.
- Prefer repeated winning patterns over isolated viral outliers when the evidence is available.
- Abstract mechanisms; do not copy creators, wording, branding, distinctive characters, proprietary footage or near-identical executions.
- Preserve the established audience, tone, identity and commercial context of the target workspace.
- Make success testable. Before considering a job complete, verify that the requested output satisfies the job's explicit constraints and the relevant quality gates in this file.
- Keep outputs grounded, specific and internally consistent.
- Report meaningful limitations rather than filling missing evidence with guesses.
- Prefer the cheaper valid production path before premium inference and record the selected cost tier.
- Record meaningful production/publishing state changes as durable events where the relevant event table exists.

## Creative job success condition

A creative job is complete only when:

1. The correct workspace and research domain have been identified.
2. Relevant source-of-truth files have been applied.
3. Research evidence, where requested, remains inside that domain.
4. The output follows the requested format and production constraints.
5. Character, setting, action, wardrobe, props and timing do not contradict the brief.
6. No unsupported claims, fabricated metrics, fake social proof or invented source evidence are introduced.
7. The Human Quality Gate is passed before premium generation spend.
8. The resulting source/derived assets can be traced back to the originating job.
9. The final response contains the requested deliverable, not hidden reasoning or internal chain-of-thought.

If a condition cannot be satisfied, say what is blocked and why.

## Research firewall

### Track A — `TRACK_A_AUTOMOTIVE_B2B`

Target: US independent automotive dealerships and dealership decision-makers.

Allowed evidence includes dealership owners, dealer principals, sales managers, automotive retail, stock merchandising, listings, photography, enquiries, admin, time-to-live, sales workflow, customer perception, operational friction and B2B outreach.

Never use creator, beauty, fitness, Fanvue or YouTube business-storytelling evidence as Track A source evidence.

### Track B — `TRACK_B_CREATOR_GROWTH`

Target: the selected creator's established audience and platform context.

Cara remains fitness/lifestyle/discipline/confidence/ordinary-life grounded. Lila remains beauty/lifestyle/understated visual discovery grounded. The duo remains relationship/contrast/chemistry grounded.

Never use Track A dealership/automotive evidence or YouTube business/economics evidence as Track B source evidence.

### YouTube — `YOUTUBE_LONGFORM_BUSINESS_MONEY`

Target: adult animated business mysteries and money stories.

Allowed evidence includes long-form YouTube storytelling, business/economics/money narratives, documentary structure, retention, titles, thumbnails, pacing, reveals and animation-friendly visual storytelling.

Never use Track A dealership evidence or Track B creator/Fanvue/lifestyle evidence as YouTube source evidence.

## Verification

Before returning a job result, perform a final consistency pass:

- Does the source niche actually match the target niche?
- Is the mechanism marked USE, ADAPT or IGNORE where relevant?
- Are claims supported by evidence?
- Is any exact on-image text being reported only when it was actually observed?
- Does the creative concept make sense for the named person/account/workspace?
- Are all scene details physically and temporally coherent?
- Has anything unrelated been introduced simply because it is common in generic AI-generated content?
- Has the result been routed through the canonical runtime surface rather than a legacy duplicate?

## Never

- Never invent evidence, citations, metrics, audience reactions or private performance data.
- Never silently change the target niche because another trend looks more viral.
- Never copy a creator's distinctive execution.
- Never expose chain-of-thought or hidden reasoning.
- Never treat a failed fetch as evidence that something does not exist.
- Never claim visual details were observed when the source was not visually accessible.
- Never loosen a niche lock to rescue a weak idea; downgrade confidence or return IGNORE instead.
- Never add a parallel V2/V3 workspace when a canonical component already exists.
- Never put service credentials, provider secrets or webhook secrets in browser code.

## Operational safety

- Keep changes minimal and explainable.
- Do not modify secrets or credential files as part of a creative job.
- Do not deploy or make destructive infrastructure changes as part of a creative job.
- If a task requires a change outside the normal creative-worker scope, stop and report the boundary rather than improvising.

## Worker commands

Primary Qwen worker:

`npm run qwen:worker`

Qwen server:

`npm run qwen:server`

Caption worker and Whisper services are separate workflows. Do not assume a caption/Whisper service is running unless the task explicitly requires it and its health check succeeds.
