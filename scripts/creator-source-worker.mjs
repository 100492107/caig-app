import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn, spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.TRACK_B_SOURCE_BUCKET || 'track-b-source-media'
const POLL_MS = Number(process.env.CREATOR_SOURCE_POLL_MS || 4000)
const TIMEOUT_MS = Number(process.env.CREATOR_SOURCE_TIMEOUT_MS || 20 * 60 * 1000)
const MAX_BYTES = Number(process.env.CREATOR_SOURCE_MAX_BYTES || 5 * 1024 * 1024 * 1024)
const PYTHON = process.env.CREATOR_PYTHON || process.env.YOUTUBE_PYTHON || path.join(process.cwd(), '.venv-source', 'bin', 'python')
const DENO = process.env.YOUTUBE_DENO || ''
const COOKIE_BROWSER = String(process.env.YOUTUBE_COOKIES_BROWSER || '').trim()

if (!SUPABASE_URL || !SERVICE_KEY) { console.error('[CREATOR SOURCE] Missing Supabase configuration.'); process.exit(1) }
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function run(command, args, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', err = ''
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`${command} timed out`)) }, timeoutMs)
    child.stdout.on('data', (c) => { out += c.toString() })
    child.stderr.on('data', (c) => { err += c.toString() })
    child.on('error', (e) => { clearTimeout(timer); reject(e) })
    child.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve({ stdout: out, stderr: err }) : reject(new Error(err || `${command} exited with ${code}`)) })
  })
}

function commandPath(command) {
  const result = spawnSync('sh', ['-lc', `command -v ${command}`], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : ''
}
function nodeRuntimeArgs() {
  const node = commandPath('node')
  if (!node) return []
  const version = spawnSync(node, ['-p', 'process.versions.node'], { encoding: 'utf8' }).stdout.trim()
  return Number(version.split('.')[0]) >= 22 ? ['--js-runtimes', `node:${node}`] : []
}
function runtimeArgs() { return DENO ? ['--js-runtimes', `deno:${DENO}`] : nodeRuntimeArgs() }
function platform(url) { try { const h = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); if (h.includes('tiktok')) return 'tiktok'; if (h.includes('instagram')) return 'instagram'; if (h.includes('youtube') || h === 'youtu.be') return 'youtube' } catch {} return 'creator' }
function sourceId(url) { try { const p = new URL(url); if (p.hostname.replace(/^www\./, '') === 'youtu.be') return p.pathname.replace(/^\//, '').split('/')[0] || 'source'; return p.searchParams.get('v') || p.pathname.split('/').filter(Boolean).pop() || 'source' } catch { return 'source' } }
function isCreatorUrl(url) { try { const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); return ['youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com','tiktok.com','instagram.com'].includes(host) } catch { return false } }
function baseArgs(output) { return ['-m','yt_dlp','--no-playlist','--no-part','--restrict-filenames','--format','bv*+ba/b','--merge-output-format','mp4','--max-filesize',String(MAX_BYTES),'--output',output,'--remote-components','ejs:github',...runtimeArgs()] }
function attempts(url, output) {
  const base = baseArgs(output)
  const list = [
    { name:'default', args:[...base,url] },
    { name:'web_embedded', args:[...base,'--extractor-args','youtube:player_client=web_embedded',url] },
    { name:'android_vr', args:[...base,'--extractor-args','youtube:player_client=android_vr',url] },
    { name:'default_no_web_safari', args:[...base,'--extractor-args','youtube:player_client=default,-web_safari',url] },
  ]
  if (COOKIE_BROWSER && /^youtube|youtu\.be$/.test(new URL(url).hostname.replace(/^www\./,'').toLowerCase())) {
    list.push({ name:`cookies_${COOKIE_BROWSER}_web_embedded`, args:[...base,'--cookies-from-browser',COOKIE_BROWSER,'--extractor-args','youtube:player_client=web_embedded',url] })
  }
  return list
}
async function download(url, output) { let last=''; for (const attempt of attempts(url,output)) { try { return { ...(await run(PYTHON,attempt.args)), strategy:attempt.name } } catch (e) { last=`${attempt.name}: ${e.message}`; console.warn(`[CREATOR SOURCE] ${last}`) } } throw new Error(`Creator source extraction failed after all strategies. ${last}`) }
async function claim() { const { data,error }=await supabase.from('local_ai_jobs').select('*').eq('job_type','creator_source_ingestion').eq('status','queued').order('created_at',{ascending:true}).limit(1).maybeSingle(); if(error)throw error; if(!data)return null; const { data:claimed,error:updateError }=await supabase.from('local_ai_jobs').update({status:'processing',started_at:new Date().toISOString(),production_status:'creator_source_downloading',error_message:null}).eq('id',data.id).eq('status','queued').select('*').maybeSingle(); if(updateError)throw updateError; return claimed }
async function process(job) { const source=String(job?.options?.source_url||'').trim(); if(!source)throw new Error('Creator source job is missing source_url.'); if(!isCreatorUrl(source))throw new Error('Creator source must be a public YouTube, TikTok or Instagram URL.'); const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cornerstone-creator-source-')); const output=path.join(temp,'source.%(ext)s'); try { const downloaded=await download(source,output); const files=await fs.readdir(temp); const media=files.find(n=>/^source\./.test(n)&&/\.(mp4|mkv|webm|mov|m4v)$/i.test(n)); if(!media)throw new Error('Creator source download completed without a playable media file.'); const local=path.join(temp,media); const stat=await fs.stat(local); if(stat.size>MAX_BYTES)throw new Error(`Downloaded creator source exceeds ${Math.round(MAX_BYTES/1024/1024)}MB limit.`); const objectPath=`${job.owner_id}/creator/${platform(source)}-${sourceId(source)}-${crypto.randomUUID()}.mp4`; const file=await fs.readFile(local); const {error:uploadError}=await supabase.storage.from(BUCKET).upload(objectPath,file,{contentType:'video/mp4',upsert:false}); if(uploadError)throw uploadError; const {data:child,error:childError}=await supabase.from('local_ai_jobs').insert({owner_id:job.owner_id,title:`Creator source analysis · ${sourceId(source)}`,job_type:'content_media_ingestion',model:job.model,persona_id:job.persona_id||'creator',system_prompt:'Analyse this downloaded public creator reference with the Cornerstone media evidence pipeline. Protect identity. Separate observed evidence from inference.',user_prompt:`Inspect this downloaded creator reference from ${source}.`,options:{bucket:BUCKET,object_path:objectPath,file_name:`creator-${sourceId(source)}.mp4`,content_type:'video/mp4',original_url:source,creator_parent_job_id:job.id,research_domain:'TRACK_B_CREATOR_GROWTH',workspace_id:'track_b',creator_id:job.persona_id||null,platform:job.options?.platform||platform(source)},status:'queued',production_status:'source_queued'}).select('id,status').single(); if(childError)throw childError; const result={status:'creator_source_downloaded',source_url:source,source_object_path:objectPath,media_job_id:child.id,media_job_status:child.status,source_id:sourceId(source),platform:platform(source),bytes:stat.size,extraction_strategy:downloaded.strategy,pipeline:['source_download','private_storage','media_ingestion','transcript','vision','creator_source_analysis']}; const {error}=await supabase.from('local_ai_jobs').update({status:'completed',result:JSON.stringify(result),completed_at:new Date().toISOString(),production_status:'video_ready',error_message:null}).eq('id',job.id); if(error)throw error; console.log(`[CREATOR SOURCE] completed ${job.id} -> ${child.id} strategy=${downloaded.strategy}`) } catch(e) { const m=e instanceof Error?e.message:String(e); await supabase.from('local_ai_jobs').update({status:'error',error_message:m.includes('No module named')||m.includes('yt_dlp')?'yt-dlp is not installed in the local source environment. Run npm run source:setup, then retry.':m,production_status:'creator_source_error'}).eq('id',job.id); console.error(`[CREATOR SOURCE] failed ${job.id}:`,m) } finally { await fs.rm(temp,{recursive:true,force:true}).catch(()=>{}) } }

const runtime = DENO ? `deno:${DENO}` : nodeRuntimeArgs()[1] ? nodeRuntimeArgs()[1] : 'none'
console.log(`[CREATOR SOURCE] worker online · python=${PYTHON} · js=${runtime} · TikTok/Instagram/YouTube reference ingestion enabled`)
for (;;) { try { const job=await claim(); if(job)await process(job); else await sleep(POLL_MS) } catch(e) { console.error('[CREATOR SOURCE] worker loop:',e); await sleep(POLL_MS) } }
