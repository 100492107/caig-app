// Portable AI context for Cornerstone.
// Full context plus a receipt gate: an external model must report what arrived
// before it starts the task. This cannot technically force provider compliance,
// but it makes omissions visible and gives the operator a deliberate PROCEED checkpoint.
import SOCIAL_SALES_DOCTRINE from './social-sales-doctrine.js'
import { CONTENT_PORTFOLIO, FANVUE_POLICY, LANE_PROMPTS } from './content-lane-rules.js'
import { creatorDnaText } from './creator-dna.js'
import { sceneDirectionSystemBlock, VISION_JSON_COMPLETION_CHECK } from './scene-direction-knowledge.js'

import RECEIPT_PROTOCOL from '../portable-ai/CONTEXT_RECEIPT_PROTOCOL.md?raw'
import START_HERE from '../portable-ai/00_START_HERE.md?raw'
import CAIG_CONTEXT from '../portable-ai/CAIG_AI_CONTEXT.md?raw'
import CARA_LILA_CONTEXT from '../portable-ai/CARA_LILA_AI_CONTEXT.md?raw'
import SOCIAL_SALES_CONTEXT from '../portable-ai/SOCIAL_SALES_DOCTRINE.md?raw'
import YOUTUBE_CONTEXT from '../portable-ai/YOUTUBE_AUTOMATION_AI_CONTEXT.md?raw'
import YOUTUBE_DOCTRINE from '../docs/YOUTUBE_AUTOMATION_DOCTRINE.md?raw'
import LOCAL_AI_CONTEXT from '../portable-ai/LOCAL_AI_QWEN.md?raw'
import PROVIDER_PROMPTS from '../portable-ai/PROVIDER_BOOT_PROMPTS.md?raw'
import CONTEXT_MANIFEST from '../portable-ai/CONTEXT_MANIFEST.json?raw'
import PROJECT_RULES from '../AGENTS.md?raw'
import MONEY_THIS_WEEK from '../docs/MONEY_THIS_WEEK.md?raw'
import ONE_BRAIN_MANUAL from '../docs/CORNERSTONE_ONE_BRAIN_OPERATING_MANUAL.md?raw'
import CEO_MASTER_CONTEXT from '../docs/CEO_MASTER_CONTEXT_2026-10-08.md?raw'
import ENTERPRISE_MASTER_CONTEXT from '../docs/CORNERSTONE_MASTER_CONTEXT.md?raw'
import MASTER_CONTEXT from '../docs/MASTER_CONTEXT_SEP_2026.md?raw'
import PORTABLE_CONTEXT from '../docs/PORTABLE_AI_CONTEXT_2026-10-08.md?raw'
import TRACK_B_STRATEGY from '../docs/TRACK_B_LOCKED_STRATEGY.md?raw'
import LOCAL_RUNBOOK from '../docs/LOCAL_RUN.md?raw'
import QWEN_FORMAT_SOURCE from '../scripts/qwen-format-archaeology.mjs?raw'
import QWEN_OUTPUT_CONTRACT_SOURCE from '../scripts/qwen-output-contract.mjs?raw'
import QWEN_WORKER_SOURCE from '../scripts/qwen-worker.mjs?raw'
import CARA_BIBLE from '../personas/cara/CHARACTER_BIBLE.md?raw'
import CARA_PERSONA from '../personas/cara/persona.md?raw'
import CARA_FANVUE_PERSONA from '../personas/cara/persona-fanvue.md?raw'
import CARA_FANVUE_VOICE from '../personas/cara/voice-fanvue.md?raw'
import LILA_BIBLE from '../personas/lila/CHARACTER_BIBLE.md?raw'
import LILA_PERSONA from '../personas/lila/persona.md?raw'
import LILA_FANVUE_PERSONA from '../personas/lila/persona-fanvue.md?raw'
import DUO_BIBLE from '../personas/duo/cara-lila.md?raw'

export const QWEN_REFERENCE = {
  model: 'mlx-community/Qwen3.5-9B-4bit',
  textUrl: 'http://127.0.0.1:8000',
  visionUrl: 'http://127.0.0.1:8001',
  whisperUrl: 'http://127.0.0.1:8787',
}

export const CONTEXT_PACK_VERSION = '2026-10-09.7'

export const CORNERSTONE_FALLBACK_RULES = [
  'You are an execution partner for Cornerstone AI Enterprises.',
  'The provider is replaceable; the operating contract is not. Do not replace Cornerstone strategy with your own.',
  'PRIORITY AUTHORITY: S00 docs/MONEY_THIS_WEEK.md is the current source of truth for this week. It overrides conflicting older documents, prompts and manifests on immediate priorities and the Cara + Lila content mix.',
  'FIRST RESPONSE IS A CONTEXT RECEIPT ONLY. Do not do the task yet. Read the entire packet, list every source section ID, mark each READ/PARTIAL/MISSING, provide one distinctive anchor per READ section, list conflicts/capability gaps, and state READY or NOT READY. Then wait for the operator to say PROCEED.',
  'If the packet exceeds your context limit, a section is absent/truncated, or a required part cannot be read, mark NOT READY and name the exact missing section. Never silently skip or replace it with a summary.',
  'After PROCEED, execute the embedded request using the context already received. Do not ask the operator to repeat supplied information.',
  'Keep Track A (revenue recovery), Track B (content/media) and New Life (separate personal system) distinct. CAIG packs do not include New Life personal state.',
  'Do not expose hidden chain-of-thought. The receipt is an auditable source checklist, not private reasoning.',
  'Never invent metrics, customer facts, prices, performance, testimonials, research claims, audience reactions, sources, personal experiences or platform eligibility.',
  'Reference content is for learning mechanisms and audience psychology, not copying wording, identity, footage, branding or distinctive execution.',
  'Preserve the requested JSON/output schema exactly when one is supplied.',
  'Use clear British English in human-facing copy unless the job explicitly requests another language.',
  'When local Qwen is unavailable, continue from this portable packet rather than redesigning the workflow.',
  'If a task depends on a local-only capability, create the exact downstream work product and explicitly state that the local capability did not run.',
].join('\n')

export function personaIdFor(job) {
  const id = String(job?.persona_id || '').toLowerCase()
  if (id === 'duo') return 'cara_lila'
  return ['cara', 'lila', 'cara_lila'].includes(id) ? id : 'cara_lila'
}

export function extractResearch(job) {
  try {
    const raw = String(job?.result || '').trim()
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.research || null
  } catch {
    return null
  }
}

const QWEN_RUNTIME_LAYERS = `
QWEN EXECUTION LAYERS — PORTABLE EQUIVALENT
The local Qwen call is not only the job prompt. Effective context includes:
1. AGENTS.md project operating rules.
2. Enterprise operating layer: Track A revenue recovery, Track B content/media engine, New Life isolation, and the current cash-versus-asset priority.
3. Format intelligence, originality and evidence hierarchy rules.
4. A task/domain layer: Track A, general Track B, Cara/Lila creator growth, YouTube or the explicit research domain.
5. Full relevant character source material when Cara/Lila is selected.
6. Scene-direction rules and a completion check for creator visual/image jobs.
7. Live public research returned for this job, where research was requested and actually retrieved.
8. The exact stored job system prompt, user prompt, options and prior result/research snapshot.
9. The Track B operator-first output contract for relevant Track B/content jobs.
10. Durable result requirements and a no-invention quality rule.
This packet includes canonical source files and job inputs needed to reproduce these rules. It cannot reproduce private model weights, local service execution, unexported files, or data that was not included.
`.trim()

const TRACK_B_OUTPUT_CONTRACT = `
CORNERSTONE TRACK B OPERATOR-FIRST OUTPUT CONTRACT
For a Track B/content job producing a content package, return JSON with TWO top-level objects:
1. operator_brief: the human decision layer.
2. production_package: the machine execution layer.

operator_brief must contain: finding; evidence_status (observed | supported | mixed | inferred | insufficient); evidence_quality (strong | usable | weak | insufficient with reason); source_inspection (not_inspected | metadata_only | transcript_or_text | media_inspected | source_plus_public_signal); source-backed evidence_points with URL where available; mechanism; why (mark inference); recommended_subject; recommended_angle; next_action; confidence (high | medium | low plus reason); limitations.

Evidence firewall:
- A URL alone proves nothing beyond its supplied identifier.
- Never invent views, likes, comments, subscribers, dates, revenue, property sizes, careers, quotes or audience reactions.
- Never claim a source was inspected unless transcript, extracted media, metadata or reliable evidence was supplied.
- Never include a number unless it exists in supplied evidence or live research.
- Distinguish SOURCE FACT, PUBLIC SIGNAL, INFERENCE and CREATIVE RECOMMENDATION.
- Do not upgrade evidence quality merely because more weak signals were found.
- If source inspection is unavailable, say so and lower confidence.

production_package contains relevant execution detail: titles, thumbnail concepts, hook, script, chapters, visual timeline, prompts, follow-ups, originality plan, short-form derivatives, publication sequence, measurement plan and monetisation tests.
`.trim()

function section(id, path, title, content, anchor) {
  const body = String(content || '').trim()
  return { id, path, title, content: body, chars: body.length, anchor }
}

function coreSections() {
  return [
    section('S00', 'docs/MONEY_THIS_WEEK.md', 'This week’s only priority — Cara + Lila cash', MONEY_THIS_WEEK, 'Publish and monetise Cara + Lila this week; every other project is secondary.'),
    section('S00A', 'docs/CORNERSTONE_ONE_BRAIN_OPERATING_MANUAL.md', 'One-Brain Operating Manual', ONE_BRAIN_MANUAL, 'One business brain, one current priority, interchangeable models, measurable execution.'),
    section('S01', 'portable-ai/CONTEXT_RECEIPT_PROTOCOL.md', 'Context Receipt Protocol', RECEIPT_PROTOCOL, 'First response must be receipt only; wait for PROCEED.'),
    section('S02', 'portable-ai/00_START_HERE.md', 'Start Here / source-of-truth order', START_HERE, 'The model is replaceable; the operating contract is the asset.'),
    section('S03', 'AGENTS.md', 'Project operating constitution', PROJECT_RULES, 'Track A = cash now; Track B = compounding assets; New Life = capacity.'),
    section('S04', 'portable-ai/CAIG_AI_CONTEXT.md', 'Portable business context', CAIG_CONTEXT, 'Track A revenue recovery and Track B content/media are distinct engines.'),
    section('S04B', 'portable-ai/CARA_LILA_AI_CONTEXT.md', 'Portable Cara + Lila context', CARA_LILA_CONTEXT, 'Cara builds and states things directly; Lila notices and states them more quietly.'),
    section('S05', 'docs/CEO_MASTER_CONTEXT_2026-10-08.md', 'CEO master context', CEO_MASTER_CONTEXT, 'Track A is the bridge for near-term cash; Track B builds owned media assets.'),
    section('S06', 'docs/CORNERSTONE_MASTER_CONTEXT.md', 'Canonical enterprise operating blueprint', ENTERPRISE_MASTER_CONTEXT, 'Track B stages: Discover → Analyse → Build → Multiply → Publish → Monetise → Measure → Repeat.'),
    section('S07', 'docs/MASTER_CONTEXT_SEP_2026.md', 'Master context / architecture companion', MASTER_CONTEXT, 'Automotive is a starting market, not the permanent definition of Track A.'),
    section('S08', 'docs/TRACK_B_LOCKED_STRATEGY.md', 'Track B locked strategy', TRACK_B_STRATEGY, 'References are a teacher, not a template.'),
    section('S09', 'docs/PORTABLE_AI_CONTEXT_2026-10-08.md', 'Portable context supplement', PORTABLE_CONTEXT, 'Plans are objectives, not forecasts; owned evidence outranks public signals.'),
    section('S10', 'portable-ai/SOCIAL_SALES_DOCTRINE.md', 'Portable social and sales doctrine', SOCIAL_SALES_CONTEXT, 'Sell the transformation, not the object or feature.'),
    section('S11', 'shared/social-sales-doctrine.js', 'Runtime social and sales doctrine', SOCIAL_SALES_DOCTRINE, 'Viewer-first sales psychology; Discovery → Search → Community → Commerce.'),
    section('S12', 'portable-ai/YOUTUBE_AUTOMATION_AI_CONTEXT.md', 'YouTube automation context', YOUTUBE_CONTEXT, 'Title + thumbnail + opening are one promise.'),
    section('S12A', 'docs/YOUTUBE_AUTOMATION_DOCTRINE.md', 'Detailed YouTube automation doctrine', YOUTUBE_DOCTRINE, 'Research, topic, packaging, script, production, publishing, analytics and learning form one loop.'),
    section('S13', 'portable-ai/LOCAL_AI_QWEN.md', 'Local AI and Qwen setup', LOCAL_AI_CONTEXT, 'Local AI is an execution layer, not the source of truth.'),
    section('S14', 'docs/LOCAL_RUN.md', 'Local AI recovery runbook', LOCAL_RUNBOOK, 'After git pull, restart workers; model weights stay put.'),
    section('S15', 'portable-ai/PROVIDER_BOOT_PROMPTS.md', 'Provider setup guidance', PROVIDER_PROMPTS, 'Update GitHub first, then refresh the external provider from the newest pack.'),
    section('S16', 'portable-ai/CONTEXT_MANIFEST.json', 'Portable context manifest', CONTEXT_MANIFEST, 'The manifest declares the active portable source set and excludes credentials.'),
    section('S17', 'Qwen runtime layers', 'Effective Qwen execution layers', QWEN_RUNTIME_LAYERS, 'Stored job prompt plus injected rules, relevant source context, research and output contract.'),
    section('S18', 'Qwen Track B output contract', 'Operator-first Track B output contract', TRACK_B_OUTPUT_CONTRACT, 'Separate operator_brief from production_package.'),
    section('S19', 'shared/content-lane-rules.js', 'Content lane rules', JSON.stringify({
      content_portfolio: CONTENT_PORTFOLIO,
      fanvue_policy: FANVUE_POLICY,
      lane_prompts: LANE_PROMPTS,
    }, null, 2), 'Attention is 30–40%; useful is 25–35%; lifestyle is 15–25%; commerce is 10–15%. `docs/MONEY_THIS_WEEK.md` is the authority.'),
    section('S20', 'scripts/qwen-format-archaeology.mjs', 'Exact Qwen prompt-layer assembly source', QWEN_FORMAT_SOURCE, 'This source injects the project constitution, enterprise layers, domain rules, research and originality constraints.'),
    section('S21', 'scripts/qwen-output-contract.mjs', 'Exact Qwen output-contract middleware source', QWEN_OUTPUT_CONTRACT_SOURCE, 'Track B output is split into operator_brief and production_package with a hard evidence firewall.'),
    section('S22', 'scripts/qwen-worker.mjs', 'Exact Qwen worker and research orchestration source', QWEN_WORKER_SOURCE, 'The worker assembles the job, research, relevant character context, visual rules and persistent result.'),
  ]
}

function characterSections(job) {
  const persona = String(job?.persona_id || '').toLowerCase()
  const promptText = (String(job?.system_prompt || '') + '\n' + String(job?.user_prompt || '') + '\n' + JSON.stringify(job?.options || {})).toLowerCase()
  const fanvue = /\bfanvue\b/.test(promptText)
  if (!job) {
    return [
      section('C01', 'shared/creator-dna.js · Cara', 'Cara Creator DNA', creatorDnaText('cara'), 'Cara core verb: BUILD; she wants to know she actually earned a better life.'),
      section('C02', 'shared/creator-dna.js · Lila', 'Lila Creator DNA', creatorDnaText('lila'), 'Lila core verb: NOTICE; presence and honesty are central.'),
      section('C03', 'shared/creator-dna.js · Duo', 'Cara + Lila relationship DNA', creatorDnaText('duo'), 'Their friendship is lived-in, not manufactured conflict.'),
      section('C04', 'personas/cara/CHARACTER_BIBLE.md', 'Cara full Character Bible', CARA_BIBLE, 'Build from what Cara would notice, want, refuse, choose, find ridiculous or remember.'),
      section('C05', 'personas/cara/persona.md', 'Cara public persona', CARA_PERSONA, 'Public Cara never hard-sells.'),
      section('C06', 'personas/cara/persona-fanvue.md', 'Cara Fanvue persona', CARA_FANVUE_PERSONA, 'Keep public persona distinct from private-page persona.'),
      section('C07', 'personas/cara/voice-fanvue.md', 'Cara Fanvue voice', CARA_FANVUE_VOICE, 'Fanvue voice is a separate mode; it must not leak into public content.'),
      section('C08', 'personas/lila/CHARACTER_BIBLE.md', 'Lila full Character Bible', LILA_BIBLE, 'Build from what Lila would notice, savour, reject, question or remember.'),
      section('C09', 'personas/lila/persona.md', 'Lila public persona', LILA_PERSONA, 'Public Lila never hard-sells.'),
      section('C10', 'personas/lila/persona-fanvue.md', 'Lila Fanvue persona', LILA_FANVUE_PERSONA, 'Keep private-page instructions separate from public content.'),
      section('C11', 'personas/duo/cara-lila.md', 'Cara + Lila relationship source of truth', DUO_BIBLE, 'Do not manufacture conflict just to create engagement.'),
    ]
  }
  if (persona === 'cara') {
    return [
      section('C01', 'shared/creator-dna.js · Cara', 'Cara Creator DNA', creatorDnaText('cara'), 'Cara core verb: BUILD.'),
      section('C02', 'personas/cara/CHARACTER_BIBLE.md', 'Cara full Character Bible', CARA_BIBLE, 'Build from what Cara would notice, want, refuse, choose, find ridiculous or remember.'),
      section('C03', fanvue ? 'personas/cara/persona-fanvue.md' : 'personas/cara/persona.md', fanvue ? 'Cara Fanvue persona' : 'Cara public persona', fanvue ? CARA_FANVUE_PERSONA : CARA_PERSONA, fanvue ? 'Fanvue persona remains separate from public social.' : 'Public Cara never hard-sells.'),
      ...(fanvue ? [section('C04', 'personas/cara/voice-fanvue.md', 'Cara Fanvue voice', CARA_FANVUE_VOICE, 'Keep Fanvue voice separate from public content.')] : []),
    ]
  }
  if (persona === 'lila') {
    return [
      section('C01', 'shared/creator-dna.js · Lila', 'Lila Creator DNA', creatorDnaText('lila'), 'Lila core verb: NOTICE.'),
      section('C02', 'personas/lila/CHARACTER_BIBLE.md', 'Lila full Character Bible', LILA_BIBLE, 'Build from what Lila would notice, savour, reject, question or remember.'),
      section('C03', 'personas/lila/persona.md', 'Lila public persona', LILA_PERSONA, 'Public Lila never hard-sells.'),
      ...(fanvue ? [section('C04', 'personas/lila/persona-fanvue.md', 'Lila Fanvue persona', LILA_FANVUE_PERSONA, 'Keep private-page instructions separate from public content.')] : []),
    ]
  }
  return [
    section('C01', 'shared/creator-dna.js · Cara + Lila', 'Cara + Lila combined Creator DNA', creatorDnaText('duo'), 'Cara builds and states it directly; Lila notices and states it more quietly.'),
    section('C02', 'personas/duo/cara-lila.md', 'Cara + Lila relationship source of truth', DUO_BIBLE, 'Do not manufacture conflict just to create engagement.'),
    section('C03', 'personas/cara/CHARACTER_BIBLE.md', 'Cara full Character Bible', CARA_BIBLE, 'Cara core verb is BUILD.'),
    section('C04', 'personas/lila/persona.md', 'Lila public persona', LILA_PERSONA, 'Lila core verb is NOTICE.'),
  ]
}

function isCreatorJob(job) {
  if (!job) return true
  const value = (String(job.job_type || '') + ' ' + String(job.persona_id || '') + ' ' + String(job.system_prompt || '') + ' ' + String(job.user_prompt || '')).toLowerCase()
  return /\bcara\b|\blila\b|creator|content_package|growth_mode|creative_human_check|image|video|fanvue|track_b/.test(value)
}

function jobSections(job) {
  if (!job) return []
  const out = []
  out.push(section('J01', 'local_ai_jobs.job', 'Exact stored job metadata', JSON.stringify({
    id: job.id || null,
    title: job.title || null,
    job_type: job.job_type || null,
    persona_id: job.persona_id || null,
    model: job.model || null,
    status: job.status || null,
    production_status: job.production_status || null,
    options: job.options || {},
  }, null, 2), 'The job metadata and options define the task execution context.'))
  out.push(section('J02', 'local_ai_jobs.system_prompt', 'Exact job system prompt', String(job.system_prompt || '(No job-specific system prompt stored.)'), 'Follow the explicit task-specific contract unless it conflicts with higher-level safety/security rules.'))
  out.push(section('J03', 'local_ai_jobs.user_prompt', 'Exact job user request', String(job.user_prompt || '(No user prompt stored.)'), 'Complete this specific request after the receipt is accepted.'))
  const research = extractResearch(job)
  if (research) out.push(section('J04', 'local_ai_jobs.result.research', 'Research snapshot attached to the job', JSON.stringify(research, null, 2), 'Public research is evidence about the public signal layer, not our private account analytics.'))
  if (job.result) out.push(section('J05', 'local_ai_jobs.result', 'Previous job result (context for continuation)', String(job.result), 'A stored result is context for continuation, not proof that a new task has been completed.'))
  if (job.error_message) out.push(section('J06', 'local_ai_jobs.error_message', 'Previous worker error', String(job.error_message), 'Use this to avoid repeating a failed approach; do not pretend the local job succeeded.'))
  return out
}

function renderSection(item) {
  return [
    '<<<BEGIN_CONTEXT_SECTION id="' + item.id + '" path="' + item.path + '">>>',
    'TITLE: ' + item.title,
    'DECLARED_CHARACTERS: ' + item.chars,
    'RECEIPT_ANCHOR: ' + item.anchor,
    '',
    item.content,
    '',
    '<<<END_CONTEXT_SECTION id="' + item.id + '">>>',
  ].join('\n')
}

export function buildFallbackPacket({ job = null, provider = 'claude' } = {}) {
  const creator = characterSections(job)
  const useCreator = isCreatorJob(job)
  const sourceSections = [
    ...coreSections(),
    ...(useCreator ? creator : []),
    ...(useCreator ? [
      section('V01', 'shared/scene-direction-knowledge.js', 'Visual / scene direction rules', sceneDirectionSystemBlock(personaIdFor(job)) + '\n\n' + VISION_JSON_COMPLETION_CHECK, 'Visual prompts must specify pose, wardrobe, environment, lighting, camera and composition; empty fields fail.'),
    ] : []),
    ...jobSections(job),
  ]
  const userTask = String(job?.user_prompt || '').trim()
  const totalChars = sourceSections.reduce((sum, s) => sum + s.chars, 0)
  const manifest = {
    pack_version: CONTEXT_PACK_VERSION,
    provider,
    mode: job ? 'job_handoff' : 'full_business_brain',
    included_sections: sourceSections.map(({ id, path, title, chars, anchor }) => ({ id, path, title, chars, anchor })),
    source_section_count: sourceSections.length,
    total_source_characters: totalChars,
    instruction: 'Every listed section is mandatory. If any end marker or section is missing, report NOT READY.',
  }

  const opening = [
    'NON-NEGOTIABLE CONTEXT LOAD GATE — READ THIS BEFORE ANYTHING ELSE',
    'You are receiving Cornerstone AI Context Pack ' + CONTEXT_PACK_VERSION + ', for provider ' + provider + '.',
    'This packet may be large. Do not assume a summary is equivalent to its source sections.',
    '',
    'YOUR FIRST RESPONSE MUST BE A CONTEXT RECEIPT ONLY. DO NOT EXECUTE THE TASK IN THAT FIRST RESPONSE.',
    'PRIORITY AUTHORITY: S00 docs/MONEY_THIS_WEEK.md takes precedence over any conflicting historical source for the current week. Call out conflicts in the receipt.',
    'Read every section listed in the manifest and check its matching <<<END_CONTEXT_SECTION id="...">>> marker.',
    'Return: (1) pack version and mode; (2) every source section ID in exact order, each marked READ / PARTIAL / MISSING; (3) one brief receipt anchor from each READ section; (4) any conflict, omission, unreadable section or capability gap; (5) READY or NOT READY.',
    'Then stop and wait for the operator to reply PROCEED. If NOT READY, do not attempt the job or invent missing context.',
    'When the operator replies PROCEED, execute the exact embedded user request without asking them to repeat supplied context. If no job request is included, ask what they want to do.',
    'Do not claim perfect or guaranteed ingestion. If your context limit is reached, disclose it.',
    '',
    '--- CONTEXT PACK HEADER ---',
    'Pack version: ' + CONTEXT_PACK_VERSION,
    'Mode: ' + (job ? 'JOB HANDOFF' : 'FULL BUSINESS BRAIN'),
    'Target provider: ' + provider,
    'Generated at: ' + new Date().toISOString(),
    'New Life personal records: EXCLUDED',
    'Credentials, tokens, service-role keys: EXCLUDED',
    'Exact job request included: ' + (job && userTask ? 'YES' : 'NO'),
    '',
    '--- SOURCE MANIFEST ---',
    JSON.stringify(manifest, null, 2),
    '',
    '--- OPERATING RULES ---',
    CORNERSTONE_FALLBACK_RULES,
    '',
    '--- BEGIN SOURCE MATERIAL ---',
  ].join('\n')
  const sourceBody = sourceSections.map(renderSection).join('\n\n')
  const close = [
    '--- END SOURCE MATERIAL ---',
    'SOURCE SECTION COUNT DECLARED: ' + sourceSections.length,
    'TOTAL SOURCE CHARACTERS DECLARED: ' + totalChars,
    '--- END CORNERSTONE AI CONTEXT PACK ---',
  ].join('\n')
  return [opening, sourceBody, close].join('\n\n').trim()
}

export function buildFallbackPayload({ job = null, provider = 'claude' } = {}) {
  const packet = buildFallbackPacket({ job, provider })
  return {
    version: 2,
    kind: 'cornerstone-ai-context-receipt-pack',
    provider,
    exported_at: new Date().toISOString(),
    context_pack_version: CONTEXT_PACK_VERSION,
    qwen_reference: QWEN_REFERENCE,
    source_mode: job ? 'job_handoff' : 'full_business_brain',
    contains_secrets: false,
    contains_new_life_personal_data: false,
    receipt_required_before_execution: true,
    packet,
    job: job ? {
      id: job.id,
      title: job.title,
      job_type: job.job_type,
      persona_id: job.persona_id,
      model: job.model,
      status: job.status,
      production_status: job.production_status,
      options: job.options || {},
      system_prompt: job.system_prompt || '',
      user_prompt: job.user_prompt || '',
      result: job.result || null,
      error_message: job.error_message || null,
    } : null,
  }
}
