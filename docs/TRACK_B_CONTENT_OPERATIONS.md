# Track B — Content Engine File & Asset Operations
*Current operating standard · September 2026*

## Purpose

The app is the production system. The computer is the durable working archive.

Track B handles source material, research evidence, derived production, publishing and measurement across any selected niche/channel. Cara, Lila and other owned identities are applications of the same system.

## Master folder

Use one root:

`~/CornerstoneAIAssets/`

Recommended structure:

```text
CornerstoneAIAssets/
├── 00_INBOX/
├── 01_SOURCE_MEDIA/
│   ├── VIDEO/
│   ├── AUDIO/
│   ├── TEXT/
│   └── REFERENCES/
├── 02_RESEARCH/
│   ├── OPPORTUNITIES/
│   ├── SOURCE_ANALYSIS/
│   ├── FORMAT_DNA/
│   └── CREATIVE_DNA/
├── 03_CHANNELS/
│   ├── CHANNEL_01/
│   │   ├── 01_BRIEFS/
│   │   ├── 02_LONG_FORM/
│   │   ├── 03_SHORTS/
│   │   ├── 04_THUMBNAILS/
│   │   ├── 05_PUBLISHED/
│   │   └── 06_ARCHIVE/
│   └── ...
├── 04_CREATORS/
│   ├── 01_CARA/
│   ├── 02_LILA/
│   └── 03_CARA_LILA/
├── 05_SHARED_ASSETS/
│   ├── LOGOS/
│   ├── TEMPLATES/
│   ├── EXPORT_PRESETS/
│   └── AUDIO/
├── 06_ANALYTICS/
├── 07_MONETISATION/
└── 99_ARCHIVE/
```

## Source rule

Original/source material is never overwritten by a derived output.

A reference video remains a reference video. A source image remains a source image. A transcript is derived evidence, not the replacement for the original source.

Every derived project should preserve a source ID or lineage reference.

## Ingestion rule

For a source video:

`00_INBOX → SOURCE_MEDIA → ingestion → transcript + frames + metadata → analysis → brief`

Temporary processing files do not become permanent archive clutter.

## Naming standard

Use predictable names with date, channel or creator, project and asset type.

Examples:

`2026-09-05_channel01_reference_company-story_01.mp4`

`2026-09-05_channel01_longform_company-story_v1.mp4`

`2026-09-05_channel01_short_company-story_hook-03_v1.mp4`

`2026-09-05_cara_social_morning-01.png`

## Long-form package

A completed long-form project should keep together:

```text
project-id/
├── source-notes.md
├── source-analysis.json
├── research.json
├── brief.json
├── script.md
├── chapters.md
├── title-options.txt
├── thumbnail-concepts.md
├── visual-timeline.json
├── final.mp4
├── thumbnail.png
├── captions.vtt
├── shorts/
└── upload-package.md
```

## Short-form package

Each derivative should retain its parent long-form ID.

```text
short-id/
├── source-window.json
├── hook.txt
├── title.txt
├── caption.txt
├── video.mp4
└── parent-link.txt
```

## Creator package

For Cara, Lila and the duo, keep character references separate from generated content.

```text
creators/01_CARA/
├── CHARACTER_BIBLE/
├── REFERENCES/
├── SOCIAL/
├── FANVUE/
├── SHOP_AFFILIATE/
├── PUBLISHED/
└── ARCHIVE/
```

The same pattern applies to Lila and Cara + Lila.

## Publishing rule

Final outputs are stored before publishing. Published versions are copied or linked into the PUBLISHED area with publication date and platform information.

Do not leave the only copy of a finished asset in Downloads or a browser session.

## Analytics rule

Analytics records should identify:

- channel;
- content ID;
- niche;
- format;
- publication date;
- relevant audience signal;
- monetisation route;
- observed result;
- production time/cost.

Do not label a format as a winner without observed evidence.

## Archive rule

Archive:

- failed generations;
- superseded renders;
- duplicate downloads;
- obsolete exports;
- experiments that are complete.

Do not delete source-of-truth references merely because a derived asset is complete.

## Operating principle

The filesystem should answer three questions quickly:

1. What was the source?
2. What did we make from it?
3. What happened after publication?

The app should answer the same questions at job and asset level.
