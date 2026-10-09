# Portable AI Context Receipt Protocol
Version: 2026-10-09.6

## Purpose

The business context must survive a change of model or interface. Qwen is the preferred local executor, not the owner of strategy or memory. This protocol applies when Cornerstone context is pasted into ChatGPT, Claude, Gemini, Grok or any other capable AI.

## Priority source order

If included in the packet, `S00 docs/MONEY_THIS_WEEK.md` is authoritative for this week’s first goal and Cara + Lila content mix. `docs/CORNERSTONE_ONE_BRAIN_OPERATING_MANUAL.md` explains the wider business/system. When an older file conflicts, flag the conflict in the receipt and apply S00 after the operator says PROCEED.

## Required first response: receipt only

When a portable context packet arrives, do not perform the task in that first response. Reply with a **Context Receipt** only.

The receipt must:
1. Name the context-pack version and the job, if one is included.
2. List every source section ID from the packet manifest, in order.
3. Mark each section **READ**, **PARTIAL**, or **MISSING**.
4. Give one short, distinctive anchor from every section marked READ. This is a reading check, not a summary of the whole file.
5. Confirm that you have identified the business model, Track A / Track B separation, evidence hierarchy, relevant creator rules, social/sales or YouTube rules where applicable, local-only capability boundaries, the exact job request, and the required output format.
6. List any missing sections, truncation, source conflict, unclear instruction, or capability you cannot access.
7. State whether the packet is complete enough to proceed: **READY** or **NOT READY**.

Do not begin the work in the receipt response. Wait for the operator to reply **PROCEED**.

If anything essential is MISSING or PARTIAL, do not claim readiness and do not invent the missing context. Explain exactly what must be resent or clarified. If the operator replies **PROCEED WITH WARNINGS**, continue only within the listed limits and keep those limits visible.

## After the operator says PROCEED

Use the already supplied packet and exact job request. Do not ask the operator to repeat information already contained in it. Preserve the selected output schema, quality gates, research evidence and constraints. Produce the requested work.

If no specific job was included, ask what the operator wants done after the receipt is accepted.

## Source and conflict rules

Use this hierarchy:
1. Current job instructions and verified current data for the specific task.
2. Current canonical Cornerstone context and operating rules.
3. Relevant creator, YouTube, social/sales, research and quality doctrine.
4. Source material supplied for analysis.
5. Model inference.

Do not silently reconcile conflicting documents. Name the conflict, identify the sources, and ask for a decision if it changes the work.

## Completeness limits

This is a behavioural verification step, not a cryptographic proof that a model attended to every token. Different providers have different context windows, file handling and retention behaviour. Never claim guaranteed perfect ingestion. A missing ending marker, omitted source section, exceeded context limit or unreadable attachment must be reported as incomplete. Do not silently truncate, compress away, or replace supplied source material with a vague summary.

Never reveal hidden chain-of-thought. The receipt is an auditable checklist of sources and constraints, not private reasoning.

## Security and isolation

Portable packs do not include API keys, service-role keys, credentials, passwords or auth tokens. Do not export New Life personal data inside CAIG business packs. Job-specific prompts/results may contain private business information, so review the packet before sending it to an external provider. Never invent or send private customer/prospect records unless they are explicitly needed and authorised for that task.
