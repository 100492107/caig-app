# CornerstoneAIAssets — Track B Blueprint

## Purpose

Track B is the **CornerstoneAIAssets** content and content-repurposing business. It is separate from Track A (Cornerstone AI Group / cars), while intentionally feeding Track A with a high-end content production capability.

Track B is not a generic AI video generator. It is a **creative operating system + managed content service** that turns ideas, brands, products, people, reference assets and existing content into premium short-form, long-form, UGC, carousels and repurposed content.

The existing Creative Engine remains the creative brain. Today's MoneyPrinterTurbo integration remains a proven Phase 1 production foundation and fallback. Track B expands the production layer around it rather than discarding the working system.

## Track B business model

### 1. Internal media engine
Cara, Lila and Cornerstone AI Group are the visible ambassadors / proof assets. Their content demonstrates the system while creating audience, creator rewards, media value and commercial opportunities.

### 2. B2B content service
Businesses become clients of CornerstoneAIAssets. They provide brand information, product references, websites, images/video, offers and guidelines. CornerstoneAIAssets returns a content system rather than a single video: short-form, long-form, clips, carousels, UGC-style assets, captions and metadata.

### 3. Product / affiliate / creator monetisation
The same creative infrastructure can generate content around Track A packs, products and future affiliate offers, while Cara/Lila can generate creator-platform revenue where permitted.

### 4. Future SaaS
Once internal workflows are reliable, the same system can become a multi-workspace SaaS with client workspaces, approvals, brand memory, asset libraries, production modes and usage / credit controls.

## Product architecture

```text
CornerstoneAIAssets
        |
        +-- Creative Engine (source of truth)
        |
        +-- Asset Memory
        |     +-- Cara
        |     +-- Lila
        |     +-- Cornerstone
        |     +-- client brands
        |     +-- products
        |     +-- locations
        |
        +-- Production Planner
        |     +-- Static
        |     +-- Carousel
        |     +-- Cinematic Motion
        |     +-- Multi-shot Reel
        |     +-- UGC
        |     +-- Short-form
        |     +-- Long-form
        |
        +-- Model Router
        |     +-- local / free where practical
        |     +-- MoneyPrinterTurbo fallback
        |     +-- premium hosted models only where justified
        |
        +-- Audio / Voice
        +-- Deterministic Assembly
        +-- Repurposing / Clipping
        +-- Export / authorised distribution
        +-- Analytics / performance feedback
```

## Production modes

### A. Static Image
One generated image. No video generation.

### B. Carousel
Generate a coherent 4–6 image sequence from one creative concept. Maintain subject, product, brand and visual consistency.

### C. Cinematic Motion
One approved image becomes a 5–8 second motion reel. Prefer low-cost/local motion techniques and only invoke premium image-to-video when it materially improves the shot.

### D. Multi-image Motion Reel
Two to four approved images, each with motion / transition, producing a short narrative sequence.

### E. UGC
Use character references or client/product references to create believable social-native content. Product references can come from descriptions, URLs and uploaded images.

### F. Short-form
5–60 second social content with explicit shot planning, captions and CTA.

### G. Long-form
3–30+ minute YouTube-style production with chapter/scene planning, narration, B-roll, captions, thumbnail and derivative clips.

## Credit / cost philosophy

The system must be **cost-aware**. Free/local production is the default where quality is acceptable; premium generation is an escalation path, not the default.

Before generation, the UI should show:
- production mode
- target duration
- number of outputs
- visual asset count
- whether premium AI video is required
- estimated credit / compute tier
- estimated generation time

The user can choose 1, 2, 3 or 5 outputs rather than always generating one or many fixed outputs.

## Asset memory

Every approved visual becomes a reusable asset rather than a disposable image.

Asset records should support:
- type
- provider
- prompt
- source/reference relationship
- storage path / URL
- aspect ratio
- style tags
- character / product / brand association
- generation metadata
- approval state

Characters such as Cara and Lila should have persistent profiles with reference images and optional voice / style information. Products should support a URL, description, key selling points, reference images and claim restrictions.

## Repurposing engine

### Long-form -> short-form
A long-form source becomes a ranked list of clips. Each clip can receive its own hook, captions, reframing, B-roll, branding and CTA.

### Short-form -> long-form
A proven short can be expanded into a structured long-form concept.

### One creative -> content tree
A single concept can produce:
- hero image
- 4–6 slide carousel
- 5–15 second reel
- 15–60 second short
- long-form video
- cutdowns
- quote / still assets
- platform-specific metadata

## Client mode

Track B should support client workspaces with:
- brand identity
- brand voice
- visual guidelines
- products / services
- reference assets
- approved claims
- prohibited claims
- previous content
- approval workflow
- revisions
- content history

The client-facing proposition is an outcome: **one source of truth turned into a complete content system**.

## Distribution philosophy

CAIG/CornerstoneAIAssets should not rely on browser bots or platform-evasion automation. Export should support:
- MP4 downloads
- image / carousel packs
- captions
- titles
- descriptions
- hashtags / metadata
- platform-safe aspect ratios

Where a platform offers an authorised API or draft workflow, integration can be added deliberately and transparently. Otherwise the creator completes posting manually.

## Model strategy

Provider adapters should be swappable.

```text
Creative request
      |
      +-- local / open model where practical
      +-- MoneyPrinterTurbo fallback
      +-- fal adapter
      +-- xAI adapter
      +-- future adapter
```

Do not make the company dependent on one hosted model. Do not design around bypassing a provider's safety controls.

## Phase gates

### Phase 1 — Proven production foundation ✅
Creative Engine -> Supabase job -> local worker -> MoneyPrinterTurbo -> completed MP4 -> Supabase Storage.

The Phase 1 pipeline has now been proven end-to-end with completed jobs and stored MP4 output.

### Phase 2A — Asset + production foundations
1. Persist fal.ai/generated visual assets and reference relationships.
2. Add production modes and configurable duration/output count.
3. Store production configuration and shot plans in Supabase.
4. Replace the legacy MPT-only UI with a CornerstoneAIAssets Production Studio while retaining MPT as the first execution adapter.
5. Add asset-aware production briefs so approved Creative Engine images are passed into production instead of ignored.

### Phase 2B — Intelligent production
1. Local/free motion path for simple image-to-motion jobs.
2. Premium model adapters for selected shots only.
3. Separate voice/audio generation from the MPT video pipeline.
4. Deterministic FFmpeg assembly.
5. Multi-shot rendering.
6. UGC and product-reference workflows.

### Phase 2C — Repurposing
1. Long-form ingestion.
2. Clip detection / ranking.
3. Automated short-form derivatives.
4. Carousel / still derivatives.
5. Content tree and source lineage.

### Phase 2D — Client operations
1. Client workspaces.
2. Brand / product / character memory.
3. Review / approval workflow.
4. Revision tracking.
5. Content calendar.
6. Usage and production-cost reporting.

### Phase 2E — Commercialisation
1. B2B packages.
2. Case studies from Cara / Lila / Cornerstone.
3. Client onboarding.
4. Managed content retainers.
5. Future SaaS packaging.

## Success criteria

Track B is successful when CornerstoneAIAssets can take one creative brief or source asset and cheaply turn it into a coherent content tree across image, carousel, short-form, UGC and long-form outputs, while preserving brand / character consistency, recording asset lineage and making the production economics visible to the operator.
