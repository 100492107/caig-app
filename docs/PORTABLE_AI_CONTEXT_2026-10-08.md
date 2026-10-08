# Cornerstone Portable AI Context — 8 October 2026

Use this with any AI provider. The model is replaceable; the context, business rules, Creator DNA, research methods, sales doctrine, YouTube workflow, evidence rules and boundaries are not.

## 1. Business definition
Cornerstone AI Enterprises is the parent / CEO operating layer. It coordinates two business engines and one separate personal execution system.

Track A — AI Revenue Recovery: identify and recover revenue leaking between enquiries, leads, conversations, appointments, quotes, opportunities and deals. Automotive is a useful starting market, not the permanent definition.

Track B — AI Content Intelligence + Production: discover public demand and proven content mechanisms, analyse why they work, rebuild original content, produce long-form and short-form assets, publish, measure and learn.

New Life is a separate personal execution system. It protects the human operator who runs Track A and Track B. Its personal data must remain isolated.

## 2. CEO decision hierarchy
Current code and live data outrank historical documents. Owned account / business evidence outranks public trend evidence. Public evidence outranks AI inference. Targets are objectives, not forecasts.

Never invent revenue, views, followers, testimonials, sources, platform eligibility, customer results, prices, commissions or audience reactions.

Never let feature count substitute for cash, audience, production economics, reliability, quality or repeatability.

## 3. Financial operating objective
Current baseline used by the system: £2,500/month.
Immediate target: £3,000/month reliable run-rate.
Next rungs: £4,000/month, then £5,000/month.
These are operating objectives, not guarantees.

Track A is the bridge for near-term cash. Track B builds owned media, audience and future commercial leverage.

## 4. Cara + Lila
Cara + Lila are fictional owned creator characters inside Track B.
Public positioning: a normal, genuinely interesting lifestyle duo with personality, chemistry, useful content and occasional controlled controversy.
World: style, home, travel, routines, getting ready, cafes, weekends, wellness, shopping, relationships, money, standards and ordinary life.
Cara tends to build, decide and push. Lila tends to notice, select and observe. Their contrast is part of their identity.
Public AI disclosure is required. Never present the characters as real people.

## 5. Content portfolio
Attention / controversy: 20–30% — discovery.
Useful / educational / interesting: 30–40% — saves, shares and trust.
Lifestyle / relationship / day-in-life: 25–35% — personality and continuity.
Soft commerce: 10–15% — action and monetisation.
Do not turn the account into a hot-take-only feed or a sell-majority feed.

## 6. Attention Gate
Use the full Attention Gate only for attention / controversy posts.
Minimum 5 of 8: ordinary setting; pattern interrupt in first 1–2 seconds; suppressed truth / social rule; reasonable disagreement; real WHAT? threshold; creator-specific voice; open loop; behaviour / dialogue rather than lecture.
Three filters all pass: genuine suppressed thought; reasonable disagreement; opening creates a need to know what happens next.
Never manufacture outrage, fake conflict, lie for engagement or invent claims.
Track B attention packages have server-side enforcement.

## 7. Sales psychology
Know the viewer before writing the hook: desired outcome, problem, friction, proof needed, natural action.
Sell the transformation or outcome, not the object or feature.
Lead with result, promise, claim, decision, discovery or tension; explain the mechanism after attention.
Build belief with specificity, examples, proof and a defensible point of view.
Use objections, questions and comments as research for the next piece.
CTA = logical next step, not automatic filler.
Content funnel: ATTENTION → RECOGNITION → VALUE → TRUST → DESIRE → ACTION → PROOF → REPEAT.

## 8. 2026 social direction
Build for recommendation feeds, discovery, curiosity, search, community and commerce.
State the subject naturally in speech, on-screen text and captions where useful.
Treat comments and audience language as creative inputs.
Prioritise original perspective and execution. AI is a production accelerator, not the creator identity.
Move commerce from discovery to trust to action when the product genuinely fits.

Current official platform signals support this direction: TikTok's 2026 forecast emphasises curiosity-driven discovery, active search, community participation and explaining why to buy; TikTok has also expanded discovery-to-action and comment features. Meta has publicly described increasing emphasis on original content and AI-assisted creator tools.

## 9. YouTube automation
YouTube is a major Track B destination.
Canonical workflow: research → niche → channels → formats → patterns → idea → packaging → script → production → publish → analytics → learning → repeat.
Title + thumbnail make one promise. The opening must deliver on it. Do not pad for length.
Reference content is studied for mechanisms, not copied in wording, branding, footage, thumbnails or execution.
Guard against repetitive, mass-produced or minimally transformed output.
Minimum scoreboard: impressions, CTR, views, average view duration, watch time, retention, subscribers gained, traffic source, returning / new viewers where available, revenue when monetised.
Build a content family: long-form episode → Shorts / clips → social discovery → audience → trust → commercial action → learning.

## 10. Research
Research is evidence collection, not copying.
Current local research uses public sources including Google News RSS, Reddit, TikTok Creative Center and indexed Instagram references. The current worker uses a seven-day cutoff for current signals.
Good research records provenance, creator, topic, audience, baseline where available, observed result, why it stood out, mechanism, evidence vs inference, adaptation, content lane, search intent and follow-up.

## 11. Creator production
Creator Builder uses Creator DNA, content-lane rules, scene-direction knowledge and social / sales doctrine.
Required planning fields: viewer, viewer_outcome, belief_reason, objection_or_question, search_intent, next_step, comment_seed, series_follow_up.
Human quality checks reject generic AI slop, incoherent scenes, invented claims, identity drift and mixed Track A material.

## 12. Local AI
Mac endpoints: Qwen text at 127.0.0.1:8000; Qwen Vision at 127.0.0.1:8001; Whisper at 127.0.0.1:8787.
8002 is retired legacy text routing.
Latest operator verification showed these model IDs on the local server: mlx-community/Qwen3.5-9B-4bit; Qwen/Qwen2.5-VL-3B-Instruct; mlx-community/Qwen3-8B-4bit; mlx-community/Qwen2.5-VL-3B-Instruct-4bit.
Main current text model: mlx-community/Qwen3.5-9B-4bit.
Workers include Qwen, source ingestion, scene, reference, commerce, production QA, caption and heartbeat services.
Browser jobs enter Supabase local_ai_jobs; workers claim them, call local inference, validate results and write them back.

Mac startup:
cd /Users/Joseph/Business/caig-app
git pull origin main
bash scripts/start-local-ai-stack.sh
curl -s http://127.0.0.1:8000/v1/models | python3 -m json.tool | grep '"id"'

## 13. Model independence
Qwen is a replaceable inference provider. The business context is the durable layer.
The same portable context must work in Claude, Gemini, Grok, ChatGPT, OpenAI-compatible endpoints and future providers.
When Qwen fails, change provider rather than losing the workflow or the context.
Do not claim a fallback provider is connected until its credentials and real call path have been tested.

## 14. External AI context receipt

Use Cornerstone → Settings → AI Anywhere to create a portable handoff for Claude, Gemini, Grok, ChatGPT or another suitable provider. Every packet includes the context source manifest and a gate requiring the replacement model to acknowledge all sections, flag missing/truncated material and wait for PROCEED before it executes. This cannot guarantee a provider can ingest unlimited context, so limits must be disclosed instead of silently skipping material.


## 15. Product UX
One visible UX per job. One canonical page per responsibility.
Do not stack multiple final, tight, v2, v3, authority, dual-surface or legacy interfaces.
Every page must answer: what am I doing, what do I enter, what happens next?
Use plain English for the operator. Technical language stays under the hood.

## 16. New Life
New Life is the operator system, not a third business.
Its loop is: highest-leverage move → smallest observable completion → execute → proof → reflection → next move.
It may share the local Qwen model endpoint operationally but must never share CAIG business queues, Track A prospects, Track B production data or research.

## 17. Roadmap
1. Publish the first Cara + Lila portfolio and stop redesigning until evidence exists.
2. Measure the first 14 days cleanly with Metricool and platform-native analytics.
3. Build YouTube long-form as a major distribution engine and multiply episodes into short-form.
4. Research repeatable mechanisms rather than isolated viral outliers.
5. Run verified commerce tests only when a real product and tracking path exist.
6. Keep Track A focused on the fastest credible path to the income target.
7. Keep the external provider context receipt workflow current and use it when Qwen is unavailable.
8. Only change architecture when a demonstrated bottleneck or reliability issue requires it.

## 18. Permanent rule
Do not redesign the machine instead of running it. Cash, audience, evidence, quality, production economics, reliability and repeatability are progress.
