// Portable AI fallback context for Cornerstone.
// Model-neutral: preserves the operating rules, context and job contract without depending on local Qwen.
import SOCIAL_SALES_DOCTRINE from './social-sales-doctrine.js'
import { CONTENT_PORTFOLIO, FANVUE_POLICY, LANE_PROMPTS } from './content-lane-rules.js'
import { creatorDnaText } from './creator-dna.js'
import CAIG_CONTEXT from '../portable-ai/CAIG_AI_CONTEXT.md?raw'
import CARA_LILA_CONTEXT from '../portable-ai/CARA_LILA_AI_CONTEXT.md?raw'
import SOCIAL_SALES_CONTEXT from '../portable-ai/SOCIAL_SALES_DOCTRINE.md?raw'
import YOUTUBE_CONTEXT from '../portable-ai/YOUTUBE_AUTOMATION_AI_CONTEXT.md?raw'
import LOCAL_AI_CONTEXT from '../portable-ai/LOCAL_AI_QWEN.md?raw'

export const QWEN_REFERENCE = {
  model: 'mlx-community/Qwen3.5-9B-4bit',
  textUrl: 'http://127.0.0.1:8000',
  visionUrl: 'http://127.0.0.1:8001',
  whisperUrl: 'http://127.0.0.1:8787',
}

export const CORNERSTONE_FALLBACK_RULES = [
  'You are acting as an external fallback execution engine for Cornerstone AI Enterprises.',
  'Do not replace Cornerstone strategy with your own. Treat the supplied Cornerstone contract as the authority for this job.',
  'Do not mention or expose hidden chain-of-thought. Give the final answer and required output only.',
  'Do not invent metrics, customer facts, prices, performance, testimonials, research claims, audience reactions or personal experiences.',
  'Keep Track A (revenue recovery) and Track B (creator/content) separate.',
  'Keep Cara and Lila as fictional creator characters. Do not present them as real people.',
  'Reference content is for learning mechanisms and audience psychology, not for copying wording, identity, footage, branding or distinctive execution.',
  'Preserve the requested JSON/output schema exactly when one is supplied.',
  'Use clear British English in human-facing copy unless the job explicitly requests another language.',
  'When local Qwen is unavailable, continue the work from this portable packet rather than redesigning the workflow.',
  'If a task depends on a live local-only capability, provide the exact production prompt or work product for the next step instead of pretending the capability ran.',
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

export function buildFallbackPacket({ job = null, provider = 'claude' } = {}) {
  const persona = personaIdFor(job)
  const lane = String(job?.options?.content_lane || job?.options?.contentLane || '').trim()
  const research = extractResearch(job)
  const character = creatorDnaText(persona === 'cara_lila' ? 'duo' : persona)
  const laneText = lane ? (LANE_PROMPTS[lane] || lane) : 'Use the job-specific content lane if one is supplied.'
  const researchText = research ? '\nLIVE RESEARCH SNAPSHOT\n' + JSON.stringify(research, null, 2) : ''
  const jobContract = String(job?.system_prompt || '(No job-specific system contract supplied.)')
  const portableContext = [
    '=== PORTABLE CAIG MASTER CONTEXT ===', CAIG_CONTEXT,
    '=== PORTABLE CARA + LILA CONTEXT ===', CARA_LILA_CONTEXT,
    '=== PORTABLE SOCIAL + SALES DOCTRINE ===', SOCIAL_SALES_CONTEXT,
    '=== PORTABLE YOUTUBE CONTEXT ===', YOUTUBE_CONTEXT,
    '=== PORTABLE LOCAL AI / QWEN CONTEXT ===', LOCAL_AI_CONTEXT,
  ].join('\\n\\n')
  const userTask = String(job?.user_prompt || '(No active user request supplied.)')

  const parts = [
    'CORNERSTONE EXTERNAL AI FALLBACK PACK',
    'Provider: ' + provider,
    'Generated: ' + new Date().toISOString(),
    '',
    CORNERSTONE_FALLBACK_RULES,
    '',
    'PORTABLE BRAIN — LOAD THIS FIRST',
    portableContext,
    '',
    'CORNERSTONE MISSION',
    'Track A = recover revenue already entering a business but lost in leads, enquiries, conversations, appointments, quotes or opportunities.',
    'Track B = find proven demand, understand why it works, build original stronger content, multiply, publish, monetise, measure and repeat.',
    'New Life is separate from Cornerstone.',
    '',
    'TRACK B CONTENT MIX',
    'Attention ' + CONTENT_PORTFOLIO.attention + ' · Useful ' + CONTENT_PORTFOLIO.useful + ' · Lifestyle ' + CONTENT_PORTFOLIO.lifestyle + ' · Commerce ' + CONTENT_PORTFOLIO.commerce + '.',
    FANVUE_POLICY,
    '',
    'SOCIAL + SALES DOCTRINE',
    SOCIAL_SALES_DOCTRINE,
    '',
    'SELECTED CONTENT LANE',
    laneText,
    '',
    'CREATOR / CHARACTER SOURCE OF TRUTH',
    character,
    '',
    'LOCAL AI REFERENCE',
    'Primary local text model: ' + QWEN_REFERENCE.model,
    'Primary local text endpoint: ' + QWEN_REFERENCE.textUrl,
    'Vision service: ' + QWEN_REFERENCE.visionUrl,
    'Whisper service: ' + QWEN_REFERENCE.whisperUrl,
    'These local services are not available to the external AI unless separately exposed. Do not claim they were used.',
    '',
    'JOB SYSTEM CONTRACT — PRESERVE THIS',
    jobContract,
    '',
    'JOB USER REQUEST — COMPLETE THIS',
    userTask,
    researchText,
    '',
    'OUTPUT RULE',
    'Complete the user request using the supplied job contract. Do not simplify or redesign the workflow because you are a different model. If the job asks for JSON, return the same JSON shape. If a field is unknown, leave it unknown rather than inventing it.',
  ]
  return parts.join('\n').trim()
}

export function buildFallbackPayload({ job = null, provider = 'claude' } = {}) {
  return {
    version: 1,
    kind: 'cornerstone-ai-fallback',
    provider,
    exported_at: new Date().toISOString(),
    model_reference: QWEN_REFERENCE,
    packet: buildFallbackPacket({ job, provider }),
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
    } : null,
  }
}
