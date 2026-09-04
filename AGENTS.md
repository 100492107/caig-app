# Cornerstone AI Enterprise Operating Rules

This repository is the operating system for Cornerstone AI Enterprises. It is not a blank creative canvas. Product decisions, research, Qwen jobs and new UI must follow the current three-engine architecture.

## Mission

Cornerstone runs three connected but distinct engines under one operating layer:

- **Track A — Revenue Recovery:** recover revenue already entering a business but being lost when leads, enquiries, conversations, appointments, quotes or opportunities go cold, stale, unworked or fail to move.
- **Track B — Content Engine:** find content that already proves audience demand, understand why it works, build materially original and stronger content, multiply it into derivatives, publish, measure and monetise.
- **New Life — Personal Execution:** the personal operating system for disciplined action, family, health, finances and long-term stewardship.

The parent enterprise layer makes the next useful action obvious without mixing evidence or context between engines.

## Canonical application architecture

- `/` -> `EnterpriseCommandHome.jsx` — top-level Cornerstone launcher for Track A, Track B and New Life.
- `/creative` -> `TrackBApplication.jsx` + `PersistentGenerations.jsx` — canonical Track B Content Engine and persistent generation library.
- `/outreach` -> `TrackAOutreachWorkspace.jsx` — canonical Revenue Recovery outreach workspace.
- `/territory` -> compatibility route only; do not rebuild a vertical-specific prospecting subsystem here.
- `/ceo` -> `CEOHome.jsx` — read-focused operator control room.
- `/workbench` and `/main-app` are compatibility surfaces only and must not become the source of truth for current strategy.

Do not create another `V2`, `V3`, `Unified`, `Final`, `New`, `Test`, `Client Delivery` or parallel workspace for an existing capability. Extend the canonical surface or extract a shared module with one clear responsibility. Historical implementations may remain in `src/legacy/` for reference but are not runtime authorities.

## Track A — Revenue Recovery domain

Track A is defined by the **problem**, not a customer vertical.

The problem domain is revenue leakage between:

`Lead -> Contact -> Conversation -> Appointment -> Opportunity -> Deal`

Potential target businesses include automotive, property, finance, insurance, recruitment, professional services, agencies, SaaS, education, healthcare, fitness, hospitality, trades and other legitimate businesses where a commercial enquiry can enter a pipeline and disappear.

The speciality is identifying the leakage, prioritising recoverable opportunities and using AI to help restart the right conversations while humans retain control of the actual sale.

Primary language:

- revenue leakage
- missed opportunity
- stale pipeline
- missed enquiry
- ageing lead
- no-show
- silent conversation
- old quote
- stalled deal
- recovery

Never turn Track A back into a dealership-only, lead-generation-only, CRM-replacement or generic AI-agency proposition.

### Track A research firewall

Research domain: `TRACK_A_REVENUE_RECOVERY`.

Allowed evidence includes lead handling, response time, follow-up, no-shows, quote follow-up, stale pipeline, opportunity recovery, CRM workflow, sales operations, reactivation, conversion leakage and decision-maker behaviour across relevant lead-driven businesses.

A customer vertical is context, not the niche. Automotive evidence may inform an automotive prospect. It must not redefine the entire domain.

Never use Track B creator/Fanvue evidence as Track A evidence. A format mechanism may transfer only as an abstract mechanism after the model establishes that it fits the buyer and problem.

### Track A commercial rule

Cold outreach exists to earn a reply. The message starts with the prospect's problem, not Joseph's biography, technology or process.

Commercial path:

`Target account -> Recovery conversation -> Leakage diagnosis -> Controlled test -> Measured recovery -> Repeat / recurring support`

No invented lead volumes, spend, conversion rates, case studies, testimonials or recovered-revenue figures.

## Track B — Content Intelligence & Production Engine

Track B is an owned-media and production system. It does not require client outreach to prove the model.

Core loop:

`Discover -> Analyse -> Build -> Multiply -> Publish -> Monetise -> Measure -> Repeat`

The system should find videos, channels, posts and formats that already demonstrate attention. It should understand the underlying mechanism, then produce original content that improves the angle, story, packaging, pacing, visual logic or distribution potential.

The selected niche is explicit at job time. Examples include gaming, history, chatting/stories, documentary, business/money, technology, lifestyle and other niches chosen from evidence. There is no permanent Track B niche lock to one subject.

### Track B research firewall

Research domain: `TRACK_B_CONTENT_ENGINE`.

Allowed evidence includes public content performance signals, long-form storytelling, short-form formats, titles, thumbnails, retention mechanisms, topic demand, narrative structures, audience comments, platform-native formats and monetisation routes relevant to the selected niche/channel.

Creator identities such as Cara and Lila are downstream owned assets. Their character bibles remain hard constraints when content is made for them. They do not define the entire Track B operating domain.

Never use Track A revenue-recovery customer data as evidence of content performance.

### Reference-content originality rule

Reference content is a teacher, not a template.

Use reference material to learn:

- why the topic attracted attention
- what promise the packaging made
- what happened in the opening seconds
- how the narrative escalated
- where curiosity loops were created
- how visuals supported the story
- which moments created useful short-form derivatives
- what weaknesses provide room for improvement

Never copy exact wording, scripts, narration, creator identity, branding, distinctive thumbnail artwork, proprietary footage, music, protected characters or a near-identical execution. The output must be materially original and independently useful.

## Shared research rules

- Fresh public research is evidence about the current public signal layer, not proof of our own performance.
- Owned analytics are the proof of what works on our accounts.
- Prefer repeated patterns over isolated viral outliers.
- Label weak evidence as a hypothesis.
- Never treat an inaccessible source as visually inspected.
- Never blend research packs between Track A, Track B or any other workspace.
- Every mechanism gets a `USE`, `ADAPT` or `IGNORE` decision where relevant.

## Qwen operating rules

The local Qwen stack is the required intelligence layer. Qwen must:

1. Identify the correct workspace and research domain.
2. Apply the source-of-truth files relevant to that workspace.
3. Build a research pack when research is requested.
4. Separate evidence from inference.
5. Produce a useful decision, not generic ideation.
6. Pass the relevant human quality gate.
7. Return the requested deliverable and record durable job state.

Provider choice for rendering is an implementation detail. The intelligence and scene-QA layer remains local Qwen.

## Track B production success condition

A Content Engine job is complete only when the requested stage is satisfied. Depending on the job, this may mean:

- opportunity board with evidence and niche fit
- reference breakdown with originality plan
- original long-form package with titles, thumbnails, script and visual plan
- short-form derivatives with source windows and standalone hooks
- publish/SEO package
- monetisation experiments with measurable tests
- production state that can be traced back to its source/job

More generated content is not automatically progress.

## Quality and scene rules

- Character truth is mandatory when a named creator is involved.
- Every visual needs a reason to exist.
- Scene details must agree: subject, place, time, light, action, props, wardrobe and composition.
- Reject generic AI filler, random luxury scenes, impossible hands, contradictory lighting, irrelevant props and copy-paste motivational language.
- Use the cheapest valid production path that reaches the quality bar.
- Final media should be visually checked by local Qwen Vision when the workflow requires scene verification.

## Track A quality rules

- The prospect remains the centre of the message.
- Do not present a guessed leakage point as a confirmed audit finding.
- Use controlled language: identify, test, measure, compare, recover, improve.
- The call establishes the baseline, volume, leakage stage and recoverability.
- A paid test should be controlled and measured before recurring support is proposed.

## Security and data

- Keep service credentials and provider secrets server-side.
- Do not rely on front-end routing as a security boundary.
- Use authenticated database access and RLS where configured.
- Keep Track A business/prospect data separate from Track B creative data.
- Never make destructive infrastructure changes as part of a creative task without explicit scope.

## Never

- Never redefine Track A as automotive-only.
- Never redefine Track B as client delivery-only.
- Never use a fixed YouTube niche as the permanent Track B architecture.
- Never copy a source creator's distinctive execution.
- Never invent metrics, evidence, audience reactions, testimonials or private performance data.
- Never expose chain-of-thought or hidden reasoning.
- Never add a parallel V2/V3 workspace when a canonical component exists.
- Never put secrets in browser code.
- Never use external AI providers as the Cornerstone intelligence or final scene-QA layer.

## Worker commands

`npm run qwen:server`
`npm run qwen:worker`
`npm run qwen:vision:server`
`npm run qwen:scene:worker`

The normal text flow is local Qwen + Supabase job queue. Vision and scene verification are separate services and must not be assumed healthy unless health checks succeed.
