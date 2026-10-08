# Cornerstone — External AI Fallback Protocol

## Purpose

Cornerstone uses local Qwen as its primary text intelligence layer. The local model is valuable because the worker combines the job prompt with Cornerstone's operating rules, creator context, research evidence, content-lane rules and output contract.

The fallback system exists so a Qwen outage, Mac issue, model download problem or worker failure does not stop the business workflow.

## What is preserved

The AI Backup workspace can export:

- the exact system prompt stored on the Cornerstone job
- the exact user request stored on the job
- the selected creator/persona context
- the active content lane
- the Cara/Lila creator DNA
- the 2026 social + sales doctrine
- content-lane rules
- Fanvue policy where relevant
- live research snapshot already attached to the job
- the local AI architecture reference
- the output rule requiring the external model to preserve the requested schema
- anti-invention and Track A / Track B separation rules

The result is a portable execution contract, not a copy of the Qwen model weights. Every packet starts with a mandatory context receipt gate: the external model must acknowledge each included source section, report missing/truncated content and wait for the operator to say PROCEED before executing.

## What is not preserved

An external model cannot automatically become the local Qwen installation.

It does not automatically gain:

- access to 127.0.0.1 services on the Mac
- Qwen Image
- local Whisper
- private Supabase data unless the data is exported in the packet
- Cornerstone's authenticated browser session
- the local filesystem
- private model weights

When a local-only capability is unavailable, the fallback model must produce the exact prompt, structured output or next-step work product rather than pretending the local capability ran.

## Normal emergency workflow

1. Open Cornerstone → Settings → AI Backup.
2. Select the stuck, queued, processing or failed job.
3. Choose Gemini, Claude, Grok or ChatGPT.
4. Cornerstone copies the full handoff packet and downloads a Markdown backup, then opens the selected provider.
5. Paste the packet into the new chat. The provider must return a context receipt only; review it and reply PROCEED once all sections are accounted for.
6. Complete the work in the external AI.
7. Copy its final answer.
8. Return to AI Backup.
9. Select the same job and provider.
10. Paste the final answer.
11. Save the result back into Cornerstone.

The original job id is preserved. The imported result is recorded with the provider name and import timestamp.

## Why this matters

Cornerstone is not dependent on one model's availability.

The business workflow becomes:

Cornerstone context → preferred local Qwen → external fallback when necessary → same job → same downstream workflow.

The intelligence contract lives in Cornerstone. The model is an execution engine.

## Provider guidance

Gemini, Claude, Grok and ChatGPT are treated as interchangeable manual fallback destinations. The application does not claim that they produce identical output to Qwen.

Use the provider that is available and suitable at the moment.

For current product capabilities and provider-specific limits, use the provider's own documentation. Cornerstone should not hard-code assumptions about model availability, limits or plan features.

## Data rule

Do not put service keys, tokens, passwords or other secrets into an external AI packet.

The packet may contain private business context, creator instructions, research and job content, so treat exported files as sensitive business material.

## Model-neutral quality contract

Every external fallback must:

- follow the supplied Cornerstone system contract
- preserve the requested output format
- separate facts, observed evidence, inference and recommendation
- avoid invented metrics or experiences
- keep Track A and Track B separate
- preserve Cara/Lila character identity where selected
- use British English for public-facing copy unless instructed otherwise
- study reference content for mechanism rather than copying distinctive execution
- avoid hidden reasoning disclosure
- state when required evidence or a capability is missing

## Re-entry rule

An external result is not considered a new workflow. It is a continuation of the same Cornerstone job.

The import action updates:

- local_ai_jobs.result
- local_ai_jobs.status
- local_ai_jobs.production_status
- local_ai_jobs.model
- local_ai_jobs.options.fallback_provider
- local_ai_jobs.options.fallback_imported_at
- local_ai_jobs.options.fallback_source

This allows existing Cornerstone polling, result viewers and downstream tooling to continue using the same job record.

## Future evolution

The manual fallback is the safety net.

Later, provider APIs can be added behind the same interface:

AI Backup
→ choose provider
→ package context
→ execute
→ validate output
→ save to the same job

The browser interface should remain model-neutral even if direct API providers are added later.

## Source-of-truth order

1. Current Cornerstone job record.
2. Current Cornerstone operating rules and shared doctrine.
3. Current creator DNA / content-lane rules.
4. Research snapshot actually attached to the job.
5. External model judgement.
6. No invented context.
