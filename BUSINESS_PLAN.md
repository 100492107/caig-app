# Cornerstone AI Group — Business Plan
*Last updated: May 2026*

---

## What We're Building

A fully automated AI creator agency.

We build, run, and monetise AI personas on subscription platforms (Fanvue, OnlyFans) and social media (Instagram, TikTok, Reddit, Telegram, X). Every part of the operation — content generation, image creation, scheduling, posting, and fan DMs — is handled by AI. No human creative labour after setup.

We then sell this as a managed service to clients: **we run their AI creator for them, they take revenue, we take a cut.**

This is not a SaaS tool. This is an agency with a proprietary AI engine that nobody else has.

---

## Why This Is a Big Opportunity

The subscription creator economy (Fanvue, OnlyFans) generates billions annually. The bottleneck for most creators is not demand — it's consistent content production, posting cadence, and fan engagement. Most creators burn out or go inconsistent. Both destroy revenue.

We solve that entirely. Our system:

- Generates photorealistic, consistent images of a fixed AI persona using a LoRA-trained model
- Writes platform-native captions, hooks, and CTAs in the persona's voice
- Schedules and auto-posts across platforms
- Handles fan DMs automatically in the persona's voice (coming)
- Does all of this continuously, without a human in the loop

The result is a creator who never burns out, never goes dark, never posts something off-brand, and can run 24/7.

---

## Current Status

### Live and Working
- **Cara Whitmore** — our first AI persona, live on Fanvue at £4.99/month
- Full end-to-end post pipeline: generate → review → schedule → auto-publish
- Photorealistic image generation via fal.ai (nano-banana-2 + Cara LoRA, 23 reference images)
- Operator app at `app.cornerstoneaigroup.com` — content generation, review queue, scheduling, image management
- Gemini 2.5 Flash for caption/copy generation — persona voice, platform-specific, variety-controlled
- Supabase backend: auth, content queue, image storage, weekly email digest
- Cron auto-publish: scheduled posts go live at the right time without human action
- Multi-platform content generation: Instagram, TikTok, Reddit, Telegram, X, Fanvue page — all with platform-specific tone and content rules
- AI DM configuration written and ready to paste into Fanvue's native AI messages system (`personas/cara/ai-dms.md`)

### In Progress
- AI DMs via Fanvue's native system — config is written, needs activating
- Custom AI DM endpoint (Gemini reads inbox, responds in Cara's voice) — next build sprint

### Not Started Yet
- Platform API integrations (Instagram, TikTok, Reddit, Telegram, X)
- Client-facing dashboard (separate login, their persona, their stats)
- Stripe billing and client onboarding flow
- Second AI persona (proves the model is repeatable)

---

## The Product (What We Sell)

This is not a tool. This is a full creative operation running on autopilot — custom-trained on the persona's face, writing in their voice, posting on cadence, handling DMs. Nothing else on the market does all of this. Price accordingly.

### Tier 1 — Starter: Single Platform
**£3,000/month**

For creators who want to start with Fanvue only and prove the model before expanding.
- Custom persona design (name, backstory, voice, visual identity)
- LoRA training on fal.ai (photorealistic, consistent face/body)
- Fanvue page setup and content pipeline
- 7 posts/week on Fanvue
- AI DM handling (welcome, re-engagement, PPV follow-up)
- Monthly performance report

**One-time setup fee: £1,500** (covers LoRA training, persona build, platform setup)

### Tier 2 — Growth: Multi-Platform
**£5,000/month**

For creators ready to run a full top-of-funnel alongside their subscription page.
- Everything in Tier 1
- 2–3 additional social platforms (Instagram, TikTok, Reddit, X, Telegram — client chooses)
- Platform-native content strategy per channel (different tone, format, cadence per platform)
- Trend research integrated into every batch
- Priority support and faster turnaround on content reviews

**One-time setup fee: £2,500**

### Tier 3 — Full Autopilot: Complete Operation
**£8,000–12,000/month**

For serious operators who want the full machine running with no manual involvement.
- Everything in Tier 2
- All available platforms running simultaneously
- Daily auto-generation and auto-post (zero operator input required)
- Full AI DM automation — inbox handled end-to-end
- PPV strategy and pricing recommendations
- Dedicated account management
- Weekly performance call
- Custom content directions and persona evolution over time

**One-time setup fee: £3,500**

**Revenue model:** retainer-only. Predictable MRR, no rev share complexity, 90%+ margin at scale.

### Rev Share Option (selective)
**£1,000/month base + 25% of Fanvue net revenue**

Available for high-potential personas where we have conviction in the upside. Lower barrier, higher ceiling for us. Offered at our discretion — not the default.

### White Label / Licence (future)
Once the engine is proven and documented, licence the operator app + system to other agencies running their own creator rosters. SaaS pricing TBD — likely £2,000–5,000/month per agency seat.

---

## How We Get Clients

**Target:** existing creators who are inconsistent, burned out, or doing everything manually. Also managers and agencies who handle multiple creators.

**Channels (in order of priority):**
1. Direct outreach — Reddit communities (r/FanvueCreators, r/onlyfansadvice), Twitter/X creator community, Telegram groups
2. Referrals from first clients once results are visible
3. Case study content — show Cara's growth (without revealing she's AI) as social proof
4. Creator agency partnerships — they bring clients, we power the backend

**The pitch:** "Your creator never burns out. Never goes dark. Always posting, always in voice, always converting."

---

## Economics

### Our Costs (per persona, per month)
| Item | Cost |
|---|---|
| fal.ai image generation (est. 200 images/month) | ~£40–80 |
| Gemini API (caption generation) | ~£10–20 |
| Supabase (shared across personas) | £0–25 |
| Vercel (shared) | £0–20 |
| **Total per persona** | **~£50–125/month** |

### Revenue per client
| Tier | Retainer | Est. margin |
|---|---|---|
| Tier 1 — Starter | £3,000/month | ~£2,875/month (95%+) |
| Tier 2 — Growth | £5,000/month | ~£4,800/month (96%+) |
| Tier 3 — Autopilot | £8,000–12,000/month | ~£7,800–11,800/month (97%+) |

**At 5 clients (mixed tiers, avg £5k):** £25,000 MRR, ~£24,000 gross profit
**At 10 clients:** £50,000 MRR — with no meaningful increase in infrastructure cost

This is an extremely high-margin business. The heavy lifting is in setup (LoRA training, persona build). Once a persona is live, the ongoing cost is almost nothing.

---

## Immediate Next Steps

### Sprint 1 (Now)
1. **Activate AI DMs on Cara's Fanvue** — paste `ai-dms.md` config into Fanvue dashboard. This directly drives subscriber conversion and retention.
2. **Build custom AI DM endpoint** — Gemini reads Fanvue inbox, generates Cara-voice replies, operator reviews before send (or auto-sends). Full automation of the highest-value fan touchpoint.
3. **Autopilot cron** — extend `cron-publish.js` to also auto-generate content daily. Remove the manual generation step entirely. True hands-off operation.

### Sprint 2
4. **Grow Cara's subscriber base** — run the posting engine consistently, test Reddit and X for discovery, track what converts.
5. **Document the Cara build process** — so we can repeat it in 1–2 weeks for a second persona.
6. **Close first paying client** — one client at £1,500/month validates the model and funds further build.

### Sprint 3
7. **Second persona live** — proves repeatability, becomes the case study for the pitch deck.
8. **Client dashboard** — separate Supabase auth scope, persona-specific view, read-only stats and queue visibility.
9. **Stripe onboarding** — automated billing, contract, persona brief intake form.

---

## Risks and How We Handle Them

| Risk | Mitigation |
|---|---|
| Fanvue bans AI personas | Terms allow AI-assisted content; persona is presented as a real creator. Monitor policy. Diversify to OnlyFans early. |
| fal.ai blocks content | Already navigated — cinematic framing, no explicit prompts, `safety_tolerance: 6`. Ban list maintained. |
| Image quality / face drift | nano-banana-2 + LoRA + 5 reference images locked on permanent storage. Identity lock prompt in every generation. |
| Client churn | Retainer model with results-based case. Show subscriber growth + revenue data monthly. |
| Competition copies us | Speed and proprietary LoRA training are the moat. First mover in the managed AI creator space matters. |

---

## The Vision

12 months: 10+ AI personas running autonomously across Fanvue and social platforms. £20–30k MRR from retainers. A reputation as the agency that makes AI creators that actually work.

24 months: white-label the engine. Other agencies pay us to power their creator roster. Platform becomes the product.

This is not a side project. The infrastructure is built. The first persona is live. The unit economics work. The only thing between here and scale is clients and distribution.
