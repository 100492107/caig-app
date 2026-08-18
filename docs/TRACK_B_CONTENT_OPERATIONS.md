# Track B — Content Operations & File Organisation

## Purpose

Keep Cornerstone AI Assets organised around three live creator assets:

1. Cara
2. Lila
3. Cara + Lila

The app is the production system. The computer is the asset archive.

## Master computer folder

Use one root folder:

`~/CornerstoneAIAssets/`

Recommended structure:

```text
CornerstoneAIAssets/
├── 00_INBOX/
├── 01_CARA/
│   ├── 01_REFERENCE/
│   ├── 02_IMAGES/
│   │   ├── SOCIAL/
│   │   ├── CAROUSELS/
│   │   └── FANVUE/
│   ├── 03_VIDEOS/
│   │   ├── SIMPLE_REELS/
│   │   ├── ADVANCED_REELS/
│   │   └── CAPTIONED/
│   ├── 04_CAPTIONS/
│   ├── 05_PUBLISHED/
│   └── 06_ARCHIVE/
├── 02_LILA/
│   ├── 01_REFERENCE/
│   ├── 02_IMAGES/
│   │   ├── SOCIAL/
│   │   ├── CAROUSELS/
│   │   └── FANVUE/
│   ├── 03_VIDEOS/
│   │   ├── SIMPLE_REELS/
│   │   ├── ADVANCED_REELS/
│   │   └── CAPTIONED/
│   ├── 04_CAPTIONS/
│   ├── 05_PUBLISHED/
│   └── 06_ARCHIVE/
├── 03_CARA_LILA/
│   ├── 01_REFERENCE/
│   ├── 02_IMAGES/
│   │   ├── SOCIAL/
│   │   ├── CAROUSELS/
│   │   └── FANVUE/
│   ├── 03_VIDEOS/
│   │   ├── SIMPLE_REELS/
│   │   ├── ADVANCED_REELS/
│   │   └── CAPTIONED/
│   ├── 04_CAPTIONS/
│   ├── 05_PUBLISHED/
│   └── 06_ARCHIVE/
├── 04_BRAND_ASSETS/
│   ├── LOGO/
│   ├── FAVICON/
│   ├── TEMPLATES/
│   └── EXPORT_PRESETS/
├── 05_CONTENT_PLANS/
├── 06_ANALYTICS/
└── 99_OLD_TO_SORT/
```

## File naming

Use predictable names. Example:

`2026-08-18_cara_social_pool_01.png`

`2026-08-18_cara_simple-reel_pool_01.mp4`

`2026-08-18_lila_fanvue_photo-set_01.png`

`2026-08-18_duo_carousel_travel_01_slide-01.png`

`2026-08-18_duo_carousel_travel_01_caption.txt`

## Download rule

Every generated asset gets saved into the creator's folder by creator + content type.

Never let reels replace images.

Never leave final deliverables in Downloads indefinitely.

Recommended flow:

`Downloads/` → `00_INBOX/` → creator folder → final asset folder.

## What belongs in 00_INBOX

Only newly downloaded files that have not yet been classified.

This is a temporary folder, not an archive.

## What belongs in 99_OLD_TO_SORT

Existing files from the current Mac that are clearly Cornerstone AI Assets material but whose creator/content type is not yet identified.

Do not delete these blindly. Sort them once and then remove the folder.

## Reference rule

Reference images are source-of-truth assets.

Do not mix reference images with generated social imagery.

Do not overwrite a reference image with a new generation.

## Final asset rule

A final approved post may have multiple files:

- source image
- on-image caption version
- social caption text
- simple reel
- advanced reel
- captioned final reel

Keep these together by date/content ID when practical.

## Suggested per-content package

```text
2026-08-18_cara_pool_01/
├── source-image.png
├── social-image-captioned.png
├── caption.txt
├── simple-reel.mp4
└── captioned-reel.mp4
```

For carousels:

```text
2026-08-18_lila_carousel_morning_01/
├── slide-01.png
├── slide-02.png
├── slide-03.png
├── slide-04.png
├── slide-05.png
├── post-caption.txt
└── upload-notes.txt
```

## Cleanup principle

The computer should contain source-of-truth references, approved content and active working files — not every failed generation.

Failed tests, duplicates, temporary downloads and obsolete renders should be removed or moved to archive after review.
