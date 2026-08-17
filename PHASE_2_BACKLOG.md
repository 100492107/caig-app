# Cornerstone AI Group — Phase 2 Backlog

## Purpose

Phase 2 begins only after Phase 1 is proven end-to-end and stable. Phase 2 expands the local MoneyPrinterTurbo integration from a working video-production path into a richer production system that gives Cornerstone tighter control over materials, audio, subtitles, task management, and publishing metadata.

## Phase 2 priorities

### 1. Materials Library
Use MoneyPrinterTurbo's `/api/v1/video_materials` endpoints to build a controlled materials workflow.
- Upload approved local clips/materials.
- Retrieve and browse the materials library.
- Associate approved materials with a Creative Engine hypothesis/production brief.
- Prefer specific approved materials over generic stock retrieval where that improves realism and brand consistency.
- Preserve the anti-slop principle: visuals should be selected because they fit the concept, not because they are convenient filler.

### 2. Richer audio controls
Use `/api/v1/audio` only where the main video endpoint is insufficient.
- Allow explicit voice selection when needed.
- Support approved custom audio files.
- Add optional voice/audio previews.
- Keep the MPT config as the default fallback when CAIG does not specify a provider-specific option.

### 3. Subtitle controls
Use `/api/v1/subtitle` when separate subtitle generation/editing becomes useful.
- Regenerate subtitles without rebuilding the whole video.
- Support style/position presets.
- Allow human review of subtitle wording and timing.

### 4. Task management
Use `/api/v1/tasks` and `DELETE /api/v1/tasks/{task_id}` for operational controls.
- Show queue/progress/state in the CAIG app.
- Add Cancel Job.
- Add Retry Job.
- Preserve MPT task ID and timestamps in Supabase.
- Add clearer failure-stage reporting.

### 5. Preview/streaming
Use `/api/v1/stream/{file_path}` where it provides a better in-app preview than downloading/opening the stored MP4.
- Inline preview inside Video Production.
- Preview before review approval.

### 6. Music library
Use `/api/v1/musics` endpoints when CAIG needs curated BGM control.
- Upload approved tracks.
- Tag tracks by mood/use case.
- Allow production briefs to select a track or approved category.
- Avoid generic, repetitive BGM where it makes the content feel synthetic.

### 7. Script/terms ownership
Do not automatically use `/api/v1/scripts` or `/api/v1/terms` as a second creative brain.
- Cornerstone Creative Engine remains the source of truth for hypotheses, hooks, scripts and visual direction.
- MPT may assist only when explicitly requested or when a fallback is required.

### 8. Social metadata
Use `/api/v1/social-metadata` to supplement Cornerstone's own Distribution Lab.
- Compare MPT-generated metadata with CAIG's human-first metadata.
- Keep CAIG's distribution strategy as the authoritative layer.

## Phase 2 gate

Do not start Phase 2 merely because the endpoints exist. Start when Phase 1 can repeatedly:

Creative Engine → saved production brief → Supabase mpt_video_jobs → local MPT worker → MPT video task → completed MP4 → Supabase storage → review.

Phase 2 is an optimisation and control layer, not a prerequisite for proving the business.
