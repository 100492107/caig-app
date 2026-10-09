# Cornerstone AI Enterprises — Portable AI Context

Status: active, October 2026

## Business model

Cornerstone AI Enterprises is the parent + CEO operating layer.

It runs two distinct commercial engines.

### Track A — Revenue Recovery

Track A recovers revenue already entering businesses but leaking when leads, enquiries, conversations, appointments, quotes or opportunities go cold.

Canonical chain:
Lead → Contact → Conversation → Appointment → Opportunity → Deal

Positioning: AI Revenue Recovery Consultant
Offer: Missed Opportunity Recovery

Core question:
Where is revenue entering the business, and where is it disappearing?

Track A is problem-led, not permanently vertical-led. Automotive is a current starting market, not the definition of the product.

AI can classify lead state, find neglected opportunities, prioritise recoverable opportunities, draft context-specific follow-up and recommend next actions. Humans retain responsibility for relationship-affecting communication, commitments and the actual sale.

Commercial path:
Target → Recovery conversation → Leakage diagnosis → Controlled test → Measured recovery → Repeat

Never invent prospect facts, testimonials, lead volumes or revenue lifts.

### Track B — Content Intelligence + Production Engine

Canonical stages:
Discover → Analyse → Build → Multiply → Publish → Monetise → Measure → Repeat

Track B finds proven demand, understands why it works, builds materially original stronger content, multiplies it into derivatives, publishes, tests monetisation, measures owned performance and repeats what deserves to be repeated.

Reference content is a teacher, not a template. Do not copy distinctive wording, creator identity, footage, branding or distinctive execution.

Cara, Lila and Cara + Lila are owned creator assets inside Track B. They do not define the whole engine. YouTube is a major destination, not the whole engine.

Possible future/adjacent niches include gaming, history, documentary storytelling, business/money, technology, internet stories, lifestyle and other territories selected by evidence.

### New Life

New Life is a separate personal execution system. It protects the operator's capacity to run Track A and Track B.

New Life must remain separate from CAIG private queues, prospect data, production data and research.

## Track B loop

Discover:
Find topics, channels, videos and formats already earning attention. Rank by evidence strength, audience promise, emotional mechanism, repeatability, originality potential, production feasibility, derivative potential and commercial fit.

Analyse:
Map topic appeal, title/thumbnail promise, opening, narrative structure, pacing, curiosity, emotional engine, proof, payoff, visual treatment, weaknesses and upgrade opportunities.

Build:
Create an original concept, script, title, thumbnail and visual treatment. Improve the mechanism rather than paraphrasing the source.

Multiply:
Turn strong long-form into self-contained Shorts/Reels/TikTok/Facebook derivatives. Each derivative needs its own hook and enough context to stand alone.

Publish:
Publish through authorised platform workflows. Record the exact asset and metadata.

Monetise:
Test appropriate routes: YouTube advertising where eligible, affiliate commerce, TikTok Shop where available, sponsorships, subscriptions/private monetisation, digital products, licensing or other owned offers.

Measure:
Record owned performance: impressions, CTR, views, watch time, retention, subscribers, traffic source, returning/new viewers where available, clicks/conversions and revenue when relevant.

Repeat:
A single viral result is a test. Repeated performance creates stronger evidence. Production economics and repeatability determine whether a winner is an asset.

## Evidence hierarchy

1. Owned evidence — our actual audience/customer outcomes
2. Current public evidence — current public research/trend signals
3. Reference evidence — what a source asset contains or achieved
4. Inference — model interpretation

Never treat these categories as interchangeable.

A public trend is not private analytics.
A viral source is not proof our version will work.
A plan is not a result.
A view is not revenue.

## Social + sales principles

For every idea ask:
Who is this for?
What do they want, avoid, understand or become?
What stops the scroll?
Why should they believe it?
What outcome matters?
What naturally comes next?

Sell the transformation, not the object.

Use a clear point of view. The strongest content can defend its central claim calmly.

Show the result, tension, discovery or promise before explaining the process.

Comments are research. Recurring objections, questions and audience language become future content.

The collective content funnel is:
ATTENTION → RECOGNITION → VALUE → TRUST → DESIRE → ACTION → PROOF → REPEAT

Not every post needs every stage.

The current cash priority and mix authority is `docs/MONEY_THIS_WEEK.md`.

## Cara + Lila feed mix

Attention / controversy: 30–40%
Useful / educational / interesting: 25–35%
Lifestyle / relationship / day-in-life: 15–25%
Soft commerce: 10–15%

The account is not a controversy page. Controversy is one discovery engine. Useful and lifestyle content make the characters worth following. Commerce follows interest.

## Research doctrine

Prioritise:
repeatable creator formats
search questions and topics
comments and audience language
recurring series
useful content
real commerce opportunities
production patterns that improve clarity and retention

Record source, creator, topic, audience, observed result, reason it stood out, mechanism, evidence vs inference, adaptation, lane and search intent where relevant.

Use USE / ADAPT / IGNORE for format transfer.

## Quality rules

Never invent followers, views, sales, revenue, commissions, prices, testimonials, audience reactions, customer facts, sources, personal experiences, platform eligibility or private analytics.

Prefer fewer high-quality pieces over mass-produced filler.

AI is for speed and capability. Human judgement is the quality layer.

## Local AI

Primary local text model:
mlx-community/Qwen3.5-9B-4bit

Text endpoint:
http://127.0.0.1:8000

Vision endpoint:
http://127.0.0.1:8001

Known vision model:
mlx-community/Qwen2.5-VL-3B-Instruct-4bit

Whisper endpoint, when installed:
http://127.0.0.1:8787

The common architecture is:
UI → durable job queue → local worker → Qwen / vision / media tools → durable result → operator review

Local AI is an execution layer, not the source of truth.

## Portability

If Qwen is unavailable, switch execution provider rather than changing the strategy.

An external AI should receive the same operating context, creator context where relevant, social/sales doctrine, YouTube doctrine where relevant, job instructions, output schema and research snapshot.

The model is replaceable. The operating contract is the asset.

## Security

Do not put secrets, service-role keys, auth tokens or credentials in portable context.

Do not expose private customer/prospect data to external AI unless the destination is explicitly approved and the relevant privacy/security requirements are satisfied.

## What Cornerstone is

GitHub / portable context = canonical operating brain
Supabase = durable operational state
Cornerstone UI = operator interface
Local Qwen = primary execution
External AIs = interchangeable fallback/execution providers
Media providers = replaceable implementation layers
Metricool / platform analytics = observed audience evidence


## Model independence

The model is replaceable. The business context is not.

The canonical operating brain is the version-controlled portable-ai context plus current job-specific instructions and verified evidence. Qwen is the preferred local executor. Gemini, Claude, Grok and ChatGPT are approved alternate execution providers when configured.

A different model must preserve the same strategy, creator identity, evidence hierarchy, quality gates, output contracts and separation between Track A, Track B and New Life.

The portable context receipt protocol is the required first step for any external AI handoff: acknowledge every section and wait for PROCEED before executing.
