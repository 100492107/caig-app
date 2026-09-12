import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn, spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.TRACK_B_SOURCE_BUCKET || 'track-b-source-media'
const POLL_MS = Number(process.env.YOUTUBE_SOURCE_POLL_MS || 4000)
const TIMEOUT_MS = Number(process.env.YOUTUBE_SOURCE_TIMEOUT_MS || 20 * 60 * 1000)
const MAX_BYTES = Number(process.env.YOUTUBE_SOURCE_MAX_BYTES || 5 * 1024 * 1024 * 1024)
const DENO = process.env.YOUTUBE_DENO || ''
const COOKIE_BROWSER = String(process.env.YOUTUBE_COOKIES_BROWSER || '').trim()

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[YOUTUBE] Missing Supabase configuration.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function commandPath(command) {
  const result = spawnSync('sh', ['-lc', `command -v ${command}`], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : ''
}

function resolvePython() {
  const candidates = [
    process.env.YOUTUBE_PYTHON,
    path.join(process.cwd(), '.venv-source', 'bin', 'python'),
    path.join(process.cwd(), '.venv-caption', 'bin', 'python'),
    commandPath('python3'),
  ].filter(Boolean)
  for (const candidate of candidates) {
    try { requireFsAccess(candidate); return candidate } catch {}
  }
  return candidates[candidates.length - 1] || 'python3'
}

function requireFsAccess(candidate) {
  const result = spawnSync(candidate, ['-c', 'import os; assert os.path.exists(__import__("sys").executable)'], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error('python unavailable')
}

function nodeRuntime() {
  const node = commandPath('node')
  if (!node) return null
  const version = spawnSync(node, ['-p', 'process.versions.node'], { encoding: 'utf8' }).stdout.trim()
  return Number(version.split('.')[0]) >= 22 ? { path: node, version } : null
}

function runtimeArgs() {
  if (DENO) return ['--js-runtimes', `deno:${DENO}`]
  const node = nodeRuntime()
  return node ? ['--js-runtimes', `node:${node.path}`] : []
}

function run(command, args, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`${command} timed out`))
    }, timeoutMs)
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', (error) => { clearTimeout(timer); reject(error) })
    child.on('close', (code) => {
      clearTimeout(timer)
      code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr || `${command} exited with code ${code}`))
    })
  })
}

function sourceId(url) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.replace(/^www\./, '') === 'youtu.be') return parsed.pathname.replace(/^\//, '').split('/')[0] || 'source'
    return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop() || 'source'
  } catch { return 'source' }
}

function normaliseUrl(raw) {
  const value = String(raw || '').trim()
  try { return new URL(value).toString() } catch { return value }
}

function baseArgs(outputTemplate) {
  return [
    '-m', 'yt_dlp',
    '--no-playlist',
    '--no-part',
    '--restrict-filenames',
    '--format', 'bv*+ba/b',
    '--merge-output-format', 'mp4',
    '--max-filesize', String(MAX_BYTES),
    '--output', outputTemplate,
    '--remote-components', 'ejs:github',
    ...runtimeArgs(),
  ]
}

function extractorAttempts(url, outputTemplate) {
  const base = baseArgs(outputTemplate)
  const attempts = [
    { name: 'web_embedded', args: [...base, '--extractor-args', 'youtube:player_client=web_embedded', url] },
    { name: 'android_vr', args: [...base, '--extractor-args', 'youtube:player_client=android_vr', url] },
    { name: 'default_no_web_safari', args: [...base, '--extractor-args', 'youtube:player_client=default,-web_safari', url] },
    { name: 'default', args: [...base, url] },
  ]
  if (COOKIE_BROWSER) {
    attempts.push(
      { name: `cookies_${COOKIE_BROWSER}_web_embedded`, args: [...base, '--cookies-from-browser', COOKIE_BROWSER, '--extractor-args', 'youtube:player_client=web_embedded', url] },
      { name: `cookies_${COOKIE_BROWSER}_default`, args: [...base, '--cookies-from-browser', COOKIE_BROWSER, url] },
    )
  }
  return attempts
}

async function download(url, outputTemplate) {
  const python = resolvePython()
  let last = ''
  for (const attempt of extractorAttempts(url, outputTemplate)) {
    try {
      console.log(`[YOUTUBE] ${sourceId(url)} acquisition strategy=${attempt.name} python=${python}`)
      const result = await run(python, attempt.args)
      return { ...result, strategy: attempt.name, python }
    } catch (error) {
      last = `${attempt.name}: ${error instanceof Error ? error.message : String(error)}`
      console.warn(`[YOUTUBE] ${last}`)
    }
  }
  throw new Error(`YouTube extraction failed after all acquisition strategies. ${last}`)
}

async function claim() {
  const { data, error } = await supabase.from('local_ai_jobs').select('*').eq('job_type', 'youtube_source_ingestion').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (error) throw error
  if (!data) return null
  const { data: claimed, error: updateError } = await supabase.from('local_ai_jobs').update({ status: 'processing', started_at: new Date().toISOString(), production_status: 'youtube_downloading', error_message: null }).eq('id', data.id).eq('status', 'queued').select('*').maybeSingle()
  if (updateError) throw updateError
  return claimed
}

async function process(job) {
  const sourceUrl = normaliseUrl(job?.options?.source_url)
  if (!sourceUrl) throw new Error('YouTube ingestion job is missing source_url.')
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cornerstone-youtube-'))
  const outputTemplate = path.join(tempDir, 'source.%(ext)s')
  try {
    const downloadResult = await download(sourceUrl, outputTemplate)
    const files = await fs.readdir(tempDir)
    const mediaName = files.find((name) => /^source\./.test(name) && /\.(mp4|mkv|webm|mov|m4v)$/i.test(name))
    if (!mediaName) throw new Error('YouTube download completed without a playable media file.')
    const localPath = path.join(tempDir, mediaName)
    const stat = await fs.stat(localPath)
    if (stat.size > MAX_BYTES) throw new Error(`Downloaded source exceeds ${Math.round(MAX_BYTES / 1024 / 1024)}MB limit.`)
    const objectPath = `${job.owner_id}/youtube/${sourceId(sourceUrl)}-${crypto.randomUUID()}.mp4`
    const file = await fs.readFile(localPath)
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, file, { contentType: 'video/mp4', upsert: false })
    if (uploadError) throw uploadError
    const { data: child, error: childError } = await supabase.from('local_ai_jobs').insert({
      owner_id: job.owner_id,
      title: `Track B source analysis · ${sourceId(sourceUrl)}`,
      job_type: 'content_media_ingestion',
      model: job.model,
      persona_id: job.options?.persona_id || 'cornerstone_content_engine',
      system_prompt: 'Analyse a downloaded public YouTube reference through the Cornerstone source-ingestion pipeline. Do not claim inspection until transcript and visual analysis complete.',
      user_prompt: `Inspect the downloaded YouTube reference from ${sourceUrl}.`,
      options: { bucket: BUCKET, object_path: objectPath, file_name: `youtube-${sourceId(sourceUrl)}.mp4`, content_type: 'video/mp4', original_url: sourceUrl, youtube_parent_job_id: job.id, research_domain: job.options?.research_domain || 'TRACK_B_CONTENT_ENGINE', workspace_id: 'track_b' },
      status: 'queued',
      production_status: 'source_queued',
    }).select('id,status').single()
    if (childError) throw childError
    const result = { status: 'youtube_downloaded', source_url: sourceUrl, source_object_path: objectPath, media_job_id: child.id, media_job_status: child.status, source_id: sourceId(sourceUrl), bytes: stat.size, extraction_strategy: downloadResult.strategy, downloader_python: downloadResult.python, pipeline: ['youtube_download', 'private_storage', 'media_ingestion', 'transcript', 'vision', 'source_analysis'] }
    const { error } = await supabase.from('local_ai_jobs').update({ status: 'completed', result: JSON.stringify(result), completed_at: new Date().toISOString(), production_status: 'video_ready', error_message: null }).eq('id', job.id)
    if (error) throw error
    console.log(`[YOUTUBE] completed ${job.id} -> ${child.id} strategy=${downloadResult.strategy}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await supabase.from('local_ai_jobs').update({ status: 'error', error_message: message.includes('No module named') || message.includes('yt_dlp') ? 'yt-dlp is not installed in the local source environment. Run npm run source:setup, then retry.' : message, production_status: 'youtube_download_error' }).eq('id', job.id)
    console.error(`[YOUTUBE] failed ${job.id}:`, message)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

console.log(`[YOUTUBE] worker online · bucket=${BUCKET}`)
for (;;) {
  try {
    const job = await claim()
    if (job) await process(job)
    else await sleep(POLL_MS)
  } catch (error) {
    console.error('[YOUTUBE] worker loop:', error)
    await sleep(POLL_MS)
  }
}
