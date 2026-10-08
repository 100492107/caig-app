#!/usr/bin/env node
/**
 * Offline full-context exporter for Cornerstone AI Enterprises.
 * Reads an explicit allow-list of version-controlled sources only.
 * Does not load .env files, call Supabase, call Qwen, or read New Life personal data.
 *
 * Usage:
 *   npm run context:export
 *   node scripts/export-portable-ai-context.mjs --provider=claude
 *   node scripts/export-portable-ai-context.mjs --out=/absolute/path/context.md
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VERSION = '2026-10-08.4'
const SOURCES = [
  ['portable-ai/CONTEXT_RECEIPT_PROTOCOL.md', 'Context receipt protocol'],
  ['portable-ai/00_START_HERE.md', 'Portable brain entry point'],
  ['AGENTS.md', 'Project operating constitution'],
  ['portable-ai/CAIG_AI_CONTEXT.md', 'Portable business context'],
  ['portable-ai/CARA_LILA_AI_CONTEXT.md', 'Portable creator context'],
  ['docs/CEO_MASTER_CONTEXT_2026-10-08.md', 'CEO master context'],
  ['docs/CORNERSTONE_MASTER_CONTEXT.md', 'Canonical enterprise operating blueprint'],
  ['docs/MASTER_CONTEXT_SEP_2026.md', 'Master context and architecture companion'],
  ['docs/PORTABLE_AI_CONTEXT_2026-10-08.md', 'Portable AI context supplement'],
  ['docs/TRACK_B_LOCKED_STRATEGY.md', 'Track B locked strategy'],
  ['docs/LOCAL_RUN.md', 'Local AI recovery runbook'],
  ['docs/AI_FALLBACK_PROTOCOL.md', 'External AI fallback protocol'],
  ['portable-ai/SOCIAL_SALES_DOCTRINE.md', 'Portable social and sales doctrine'],
  ['portable-ai/YOUTUBE_AUTOMATION_AI_CONTEXT.md', 'YouTube automation context'],
  ['portable-ai/LOCAL_AI_QWEN.md', 'Local AI and Qwen'],
  ['portable-ai/PROVIDER_BOOT_PROMPTS.md', 'Provider boot prompts'],
  ['portable-ai/CONTEXT_MANIFEST.json', 'Portable context manifest'],
  ['shared/social-sales-doctrine.js', 'Runtime social and sales doctrine'],
  ['shared/creator-dna.js', 'Runtime creator DNA'],
  ['shared/content-lane-rules.js', 'Content lanes and content mix'],
  ['shared/scene-direction-knowledge.js', 'Visual and scene direction rules'],
  ['personas/cara/CHARACTER_BIBLE.md', 'Cara full character bible'],
  ['personas/cara/persona.md', 'Cara public persona'],
  ['personas/cara/persona-fanvue.md', 'Cara private-page persona'],
  ['personas/cara/voice-fanvue.md', 'Cara private-page voice rules'],
  ['personas/lila/CHARACTER_BIBLE.md', 'Lila full character bible'],
  ['personas/lila/persona.md', 'Lila public persona'],
  ['personas/lila/persona-fanvue.md', 'Lila private-page persona'],
  ['personas/duo/cara-lila.md', 'Cara plus Lila relationship source'],
  ['scripts/qwen-format-archaeology.mjs', 'Exact Qwen prompt-layer assembly source'],
  ['scripts/qwen-output-contract.mjs', 'Exact Qwen output-contract middleware source'],
  ['scripts/qwen-worker.mjs', 'Exact Qwen worker and research orchestration source'],
]
const args = Object.fromEntries(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
  const splitAt = x.indexOf('=')
  return splitAt < 0 ? [x.slice(2), 'true'] : [x.slice(2, splitAt), x.slice(splitAt + 1)]
}))
const provider = args.provider || 'portable / model-independent'
const today = new Date().toISOString().slice(0, 10)
const defaultOut = path.join(ROOT, 'portable-ai-exports', 'cornerstone-full-context-' + today + '.md')
const outPath = path.resolve(args.out || defaultOut)
const manifestPath = outPath.replace(/\.md$/i, '.manifest.json')

const RECEIPT_GATE = [
  'NON-NEGOTIABLE CONTEXT LOAD GATE — READ THIS BEFORE ANYTHING ELSE',
  'You are receiving Cornerstone AI Context Pack ' + VERSION + '. The model is replaceable; the context and methods are not.',
  'YOUR FIRST RESPONSE MUST BE A CONTEXT RECEIPT ONLY. DO NOT EXECUTE THE TASK IN THAT RESPONSE.',
  'Read every listed source section and check its matching END marker.',
  'Return: pack version and mode; every source ID in order marked READ / PARTIAL / MISSING; one distinctive anchor from every READ section; all conflicts, omissions, unreadable sections, truncation and capability gaps; then READY or NOT READY.',
  'Stop and wait for the operator to reply PROCEED. Do not execute before PROCEED.',
  'If any required section is missing or your context limit prevents reading it, say NOT READY. Never silently omit material, substitute a vague summary, or claim perfect ingestion.',
  'After PROCEED, execute the exact task that the operator supplied in the chat. If no specific task was supplied, ask what they want done.',
  'Do not reveal hidden chain-of-thought. The receipt is an auditable source checklist, not private reasoning.',
  'SECURITY: this export excludes .env values, credentials, API keys, service-role keys, auth tokens, New Life personal records and unexported private database rows. Review any task-specific data separately before sending it externally.',
  'This pack does not include model weights, local image/audio/video files, or access to services running on the operator Mac.',
].join('\n')

function hash(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

async function readSources() {
  const result = []
  for (let index = 0; index < SOURCES.length; index += 1) {
    const relativePath = SOURCES[index][0]
    const title = SOURCES[index][1]
    const fullPath = path.join(ROOT, relativePath)
    let content
    try {
      content = await fs.readFile(fullPath, 'utf8')
    } catch (error) {
      throw new Error('Export stopped. Required source is missing or unreadable: ' + relativePath + ' (' + (error?.message || error) + ')')
    }
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    const anchor = lines.find(line => line.length >= 18 && !line.startsWith('~~~') && !line.startsWith('#')) || lines[0] || title
    result.push({
      id: 'S' + String(index + 1).padStart(2, '0'),
      path: relativePath,
      title,
      content: content.trimEnd(),
      chars: content.length,
      sha256: hash(content),
      anchor: anchor.slice(0, 180),
    })
  }
  return result
}

function renderSource(source) {
  return [
    '<<<BEGIN_CONTEXT_SECTION id="' + source.id + '" path="' + source.path + '">>>',
    'TITLE: ' + source.title,
    'DECLARED_CHARACTERS: ' + source.chars,
    'SHA256_SOURCE_CHECKSUM: ' + source.sha256,
    'RECEIPT_ANCHOR: ' + source.anchor,
    '',
    source.content,
    '',
    '<<<END_CONTEXT_SECTION id="' + source.id + '">>>',
  ].join('\n')
}

async function main() {
  const sources = await readSources()
  const chars = sources.reduce((sum, source) => sum + source.chars, 0)
  const manifest = {
    name: 'Cornerstone full portable AI context',
    version: VERSION,
    generated_at: new Date().toISOString(),
    provider,
    mode: 'full_business_brain',
    source_count: sources.length,
    total_source_characters: chars,
    approximate_tokens_characters_divided_by_4: Math.ceil(chars / 4),
    source_manifest: sources.map(source => ({
      id: source.id,
      path: source.path,
      title: source.title,
      chars: source.chars,
      sha256: source.sha256,
      anchor: source.anchor,
    })),
    exclusions: [
      'New Life personal records',
      'environment file values',
      'API keys and credentials',
      'auth tokens and service-role keys',
      'unexported private database rows',
      'local model weights',
      'local media files',
    ],
    rule: 'Every source section is mandatory. If a section or end marker is missing, the receiving AI must say NOT READY.',
  }
  const header = [
    RECEIPT_GATE,
    '--- PACK HEADER ---',
    'Version: ' + VERSION,
    'Generated at: ' + manifest.generated_at,
    'Target provider: ' + provider,
    'Mode: full business brain',
    'Source sections: ' + sources.length,
    'Source characters: ' + chars,
    'Estimated tokens (rough estimate only): ' + manifest.approximate_tokens_characters_divided_by_4,
    'New Life personal records included: NO',
    'Credentials or secrets included: NO',
    '',
    '--- SOURCE MANIFEST (EVERY ENTRY REQUIRED) ---',
    JSON.stringify(manifest, null, 2),
    '',
    '--- BEGIN SOURCE MATERIAL ---',
  ].join('\n')
  const body = sources.map(renderSource).join('\n\n')
  const footer = [
    '--- END SOURCE MATERIAL ---',
    'EXPECTED SOURCE COUNT: ' + sources.length,
    'EXPECTED SOURCE CHARACTERS: ' + chars,
    '--- END CORNERSTONE CONTEXT PACK ---',
  ].join('\n')
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, [header, body, footer].join('\n\n'), 'utf8')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log('[CONTEXT EXPORT] Complete')
  console.log('[CONTEXT EXPORT] Markdown: ' + outPath)
  console.log('[CONTEXT EXPORT] Manifest: ' + manifestPath)
  console.log('[CONTEXT EXPORT] Sections: ' + sources.length)
  console.log('[CONTEXT EXPORT] Characters: ' + chars)
  console.log('[CONTEXT EXPORT] Approx tokens: ' + Math.ceil(chars / 4))
  console.log('[CONTEXT EXPORT] No secrets, New Life personal records, or environment values were read.')
  console.log('[CONTEXT EXPORT] Review the Markdown before sending it to an external provider.')
}

main().catch(error => {
  console.error('[CONTEXT EXPORT] FAILED: ' + (error?.message || error))
  process.exitCode = 1
})
