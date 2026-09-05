# Cornerstone AI Enterprises — Master Context

This file is the repository-side companion to the September 2026 Master Context DOCX. It supersedes the old V10 strategic framing.

## Canonical architecture

- **Cornerstone AI Enterprises** = parent + CEO operating layer.
- **Track A — Revenue Recovery** = AI Revenue Recovery Engine. Speciality: potential revenue lost through leads, enquiries, appointments, conversations and deals going cold. Automotive is a current starting market, not the permanent niche.
- **Track B — Content Engine** = AI Content Intelligence + Production Engine. Discover proven public content, analyse why it works, rebuild it as original content, produce long-form, multiply into short-form, publish, measure and replicate winners.
- **New Life** = personal execution/life operating system. Keep its context separate.

## Track A canonical wording

**Positioning:** AI Revenue Recovery Consultant.

**Offer:** Missed Opportunity Recovery.

**Speciality:** potential revenue lost through leads, deals, appointments and conversations going cold.

**Core question:** Where is revenue entering the business, and where is it disappearing?

Track A is problem-led, not vertical-led. Target any business where the pipeline contains recoverable value. Current and future verticals can include automotive, property, recruitment, finance, professional services, healthcare, education, fitness, agencies, trades and hospitality.

Do not turn Track A into a generic AI agency, CRM replacement, lead-generation agency or dealership-only product.

### Track A recovery chain

1. Demand entered the business.
2. Contact happened or failed.
3. Conversation progressed or went quiet.
4. Appointment/demo/visit happened or became a no-show.
5. Opportunity existed or stalled.
6. Deal was won/lost/stalled.
7. Previous buyer or dormant lead can be reactivated.

### Track A AI role

- classify lead state and recovery opportunity
- prioritise by recency, intent, value and evidence
- draft context-specific recovery actions
- surface neglected opportunities
- summarise context for human action
- recommend next actions
- learn from actual outcomes

### Track A claims rules

Use controlled language: identify, recover, test, measure, compare, improve. Never promise a fixed revenue lift without evidence. Never invent prospect facts, testimonials, lead volume or outcomes.

### Track A acquisition

Prospect-first. The prospect should recognise their own problem in the message. Do not lead with the founder biography, AI stack or feature list. Cold/warm outbound should not contain pricing. Each follow-up must add a new reason to reply.

### Current automotive compatibility

The existing external CRM is still automotive-shaped for backwards compatibility. Existing Firestore collections include `dealer_candidates`, `territories`, `prospects`, and `activities`. Do not delete or silently migrate live data merely to improve labels. Add generic business/recovery semantics around the existing records.

## Track B canonical wording

**Track B — Content Engine**.

Primary loop:

**Discover → Source → Analyse → Rebuild → Produce → Multiply → Publish → Learn**

### Discover

Find content, channels, topics and formats already earning attention. Rank by evidence strength, niche fit, emotional mechanism, repeatability, production simplicity and commercial potential.

### Source

Accept a URL or local video file. Preserve provenance, title, source, date, performance metadata where available, transcript and media. Keep source media separate from derived work.

### Analyse

Decompose hook, title, thumbnail promise, narrative structure, pacing, emotional engine, curiosity loops, visual treatment and strongest/weakest sections where evidence exists.

### Rebuild

Create a materially original angle, script, title, thumbnail and visual treatment. Borrow mechanisms, never exact wording, creator identity, branding, footage or distinctive execution.

### Produce

Create publish-ready long-form assets, visual plans, image/video prompts, audio, editing/captions and persistent outputs.

### Multiply

Turn one finished long-form episode into self-contained short-form derivatives for Shorts/Reels/TikTok/Facebook and related distribution.

### Publish + Learn

Record performance and build Creative DNA from observed results. Current-web trend research is not owned-account performance proof.

## Track B channels and monetisation

Potential channels include gaming, chatting/commentary, history, business/money, documentary storytelling, internet stories, technology and other niches selected by evidence.

Cara, Lila and Cara + Lila remain owned creator assets inside the engine. YouTube is a major destination, not the definition of Track B.

Potential monetisation: YouTube ads, sponsorships, affiliate revenue, TikTok Shop/commerce, Fanvue subscriptions/paid content, licensing, digital products, owned products after demand proof, and later optional B2B creator systems/licensing.

The key advantage is that Track B does not need clients to start. We can study what is already working, make it better as original work, and compound owned audiences.

## Track B product philosophy

The app must optimise for evidence and output, not for feature count. Client Delivery remains an optional commercial branch that uses the same production factory. It is not the definition of Track B.

## Local AI stack

Known current configuration:

- Text Qwen server: `http://127.0.0.1:8000`
- Text model: `mlx-community/Qwen3-8B-4bit`
- Vision Qwen server: `http://127.0.0.1:8001`
- Vision model: `mlx-community/Qwen2.5-VL-3B-Instruct-4bit`
- Local worker project: `~/Business/caig-local-worker`
- LaunchAgent: `~/Library/LaunchAgents/com.cornerstone.local-ai.plist`
- Supabase is used for persistent Track B data and job queues.
- Firebase Auth + Firestore remain the source of truth for the existing external Track A CRM.
- Whisper was previously not installed; the system should degrade gracefully when unavailable.

### Terminal rule

Do not assume the main repository checkout is `~/Business/caig-app`. A recent terminal attempt failed because that path does not exist, leaving the shell in `~`, so `git pull` and `npm` naturally failed. The exact local checkout path of `caig-app` is not confirmed. Verify it before running git commands.

The known local worker path is `~/Business/caig-local-worker`; the Qwen worker script has historically been run from there.

## Research firewalls

Use explicit domains and isolate context:

- `TRACK_A_REVENUE_RECOVERY`
- `TRACK_B_CREATOR_GROWTH`
- `TRACK_B_LONGFORM`
- `NEW_LIFE`

Use current public research for trend discovery. Do not present current-web research as private account analytics. Use **USE / ADAPT / IGNORE** for format transfer.

## Current application architecture

Known routes include:

- `/` Enterprise command home
- `/creative` canonical Track B shell + persistent generations
- `/outreach` Track A outreach workspace
- `/territory` Track A territory tooling
- `/workbench` retained operational tooling
- `/main-app` retained/legacy operational surface
- `/ceo` CEO view

### Important source files

- `src/EnterpriseHome.jsx`
- `src/EnterpriseCommandHome.jsx`
- `src/TrackBApplication.jsx`
- `src/YouTubeGrowthNicheWorkspace.jsx`
- `src/ClientDeliveryStaged.jsx`
- `src/TrackAOutreachWorkspace.jsx`
- `src/TrackATerritoryBlock.jsx`
- `src/PersistentGenerations.jsx`
- `scripts/qwen-worker.mjs`
- `api/queue-update.js`

## GitHub repositories

- `100492107/caig-app` — Enterprise application and Track B/local-AI orchestration.
- `100492107/caig-app-dashboard` — existing external Track A CRM/database application.

## UI standard

Cornerstone should feel like a quiet, professional working instrument: restrained hierarchy, strong typography, useful density, obvious next action, honest states, no heavy “AI theatre”, no redundant tool branding, no gold-gradient “premium AI” aesthetic.

## Non-negotiables

- do not redefine Track A around dealerships
- do not mix Track A and Track B research contexts
- do not expose server secrets to the browser
- do not invent customer/prospect facts
- do not claim unproven revenue lift
- do not copy source creators or source videos too literally
- do not mistake feature count or generated volume for business progress
- do not add architecture unless it removes a demonstrated bottleneck
- keep sources and derivatives separate and persistent
- keep New Life separate from business research

## Immediate implementation direction

1. Universalise Track A language, research domains and CRM semantics while keeping existing automotive data compatible.
2. Reframe Track B around Content Intelligence + Production.
3. Add first-class source ingestion and content-analysis stages.
4. Make the long-form → short-form multiplication workflow explicit.
5. Keep Cara/Lila, YouTube, Shop, Media, captions and Client Delivery as capabilities/destinations within the larger engine.
6. Keep the local AI stack documented and reliable.

## Source-of-truth hierarchy

1. Current live repository and data state.
2. This master context / current operating blueprint.
3. Historical commits and older documentation.
4. Model inference.

When in doubt, fetch current code and data rather than trusting an old note.
