import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const NICHES = ['Gaming', 'History', 'Stories', 'Documentary', 'Business / money', 'Technology', 'Lifestyle', 'Other']
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function clean(value) {
  return String(value ?? '').trim()
}

function parseJson(raw) {
  const text = clean(raw)
    .replace(/```json|```/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/<\|im_end\|>|<\|endoftext\|>/gi, '')
    .trim()
  try {
    return JSON.parse(text)
  } catch {}
  const start = text.search(/[\[{]/)
  if (start < 0) throw new Error('Cornerstone could not understand the returned package.')
  const open = text[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let quoted = false
  let escaped = false
  for (let i = start; i < text.length; i += 1) {
    const c = text[i]
    if (quoted) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') quoted = false
      continue
    }
    if (c === '"') quoted = true
    else if (c === open) depth += 1
    else if (c === close) {
      depth -= 1
      if (depth === 0) return JSON.parse(text.slice(start, i + 1))
    }
  }
  throw new Error('Cornerstone returned an incomplete package.')
}

function isYoutubeUrl(value) {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    return ['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)
  } catch {
    return false
  }
}

async function getJob(id) {
  const { data, error } = await supabase
    .from('local_ai_jobs')
    .select('id,status,error_message,result,owner_id')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message || 'Could not read job status.')
  if (!data) throw new Error('Cornerstone could not find this job. Refresh and try again.')
  return data
}

async function waitForJob(id, setMessage, label) {
  const until = Date.now() + 45 * 60 * 1000
  let last = ''
  while (Date.now() < until) {
    const job = await getJob(id)
    if (job.status !== last) {
      last = job.status
      setMessage(job.status === 'processing' ? `${label} is working…` : `${label} is ${job.status}…`)
    }
    if (job.status === 'completed') return job
    if (job.status === 'error') throw new Error(job.error_message || `${label} failed.`)
    await sleep(2500)
  }
  throw new Error(`${label} took too long. Check System.`)
}

export default function CreateWorkspace3() {
  const [url, setUrl] = useState('')
  const [niche, setNiche] = useState('Business / money')
  const [notes, setNotes] = useState('')
  const [learning, setLearning] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [sourceMeta, setSourceMeta] = useState(null)

  useEffect(() => {
    let alive = true
    supabase
      .from('track_b_learning_recommendations')
      .select('id,format,invariant_pattern,confidence,source_evidence_id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setLearning(data || null)
      })
    return () => { alive = false }
  }, [])

  const selected = result?.selected_video || result?.production_package || result || {}
  const titles = useMemo(() => selected?.titles || selected?.title_options || [], [selected])
  const scenes = useMemo(() => result?.scene_directions || selected?.scene_directions || selected?.visual_directions || [], [result, selected])

  async function run() {
    setError('')
    setResult(null)
    setSourceMeta(null)
    if (!url.trim()) {
      setError('Paste a public YouTube video link.')
      return
    }
    if (!isYoutubeUrl(url)) {
      setError('Create is currently for public YouTube references. Cara and Lila have their own creator engine under Voices.')
      return
    }

    setBusy(true)
    setMessage('Checking local intelligence…')
    try {
      const { data: heartbeat } = await supabase
        .from('local_ai_worker_heartbeat')
        .select('status,last_seen')
        .eq('id', 'qwen')
        .maybeSingle()
      const online = heartbeat?.last_seen && Date.now() - new Date(heartbeat.last_seen).getTime() < 90000 && heartbeat.status !== 'offline'
      if (!online) throw new Error('Local intelligence is offline. Start the Cornerstone local AI stack.')

      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth?.user) throw new Error('Please sign in again.')

      setMessage('Acquiring the YouTube source…')
      const { data: acquisition, error: acquisitionError } = await supabase
        .from('local_ai_jobs')
        .insert({
          owner_id: auth.user.id,
          title: `YouTube source · ${url.trim()}`,
          job_type: 'youtube_source_ingestion',
          model: 'mlx-community/Qwen3-8B-4bit',
          persona_id: 'cornerstone_content_engine',
          system_prompt: 'Acquire one public YouTube source for local evidence inspection. Never claim analysis before the downloaded media is processed.',
          user_prompt: `Acquire this YouTube reference: ${url.trim()}`,
          options: {
            source_url: url.trim(),
            original_url: url.trim(),
            research_domain: 'TRACK_B_CONTENT_ENGINE',
            workspace_id: 'track_b',
          },
          status: 'queued',
          production_status: 'not_started',
        })
        .select('id')
        .single()
      if (acquisitionError || !acquisition?.id) throw acquisitionError || new Error('Could not queue the YouTube source.')

      const acquisitionJob = await waitForJob(acquisition.id, setMessage, 'YouTube acquisition')
      const acquisitionResult = parseJson(acquisitionJob.result || '{}')
      if (!acquisitionResult.media_job_id) throw new Error('The video downloaded, but its inspection job was not created.')

      const mediaJob = await waitForJob(acquisitionResult.media_job_id, setMessage, 'Video inspection')
      const mediaResult = parseJson(mediaJob.result || '{}')
      if (!mediaResult.text_analysis_job_id) throw new Error('Video inspection completed without source intelligence.')

      const analysisJob = await waitForJob(mediaResult.text_analysis_job_id, setMessage, 'Source intelligence')
      const analysis = parseJson(analysisJob.result || '{}')
      const sourceEvidence = { acquisition: acquisitionResult, media: mediaResult, analysis }
      setSourceMeta(sourceEvidence)

      setMessage('Building the original package…')
      const learningContext = learning
        ? `\nLATEST MEASURED LEARNING:\n${JSON.stringify(learning)}\nUse it as directional evidence only.`
        : ''
      const { data: packageJob, error: packageError } = await supabase
        .from('local_ai_jobs')
        .insert({
          owner_id: auth.user.id,
          title: `Content package · ${analysis.topic_interest || niche}`,
          job_type: 'content_engine',
          model: 'mlx-community/Qwen3-8B-4bit',
          persona_id: 'cornerstone_content_engine',
          system_prompt: 'You are Cornerstone Track B content intelligence. Build materially original work from inspected evidence. Separate observation, public signal, inference and creative recommendation. Never invent metrics.',
          user_prompt: `TARGET NICHE: ${niche}\nCHANNEL: YouTube\nREFERENCE URL: ${url.trim()}\nOPERATOR NOTE: ${notes.trim() || 'None'}${learningContext}\n\nINSPECTED SOURCE EVIDENCE:\n${JSON.stringify(analysis)}\n\nBuild an original package. Never copy wording, identity, branding, scenes, footage or distinctive packaging. Include operator_brief, titles, thumbnails, hook, full script, chapters, visual timeline, scene_directions, Shorts, publication sequence, measurement, originality and monetisation tests. Return JSON only.`,
          options: {
            research: true,
            max_tokens: 6500,
            temperature: 0.35,
            research_domain: 'TRACK_B_CONTENT_ENGINE',
            workspace_id: 'track_b',
            source_analysis: sourceEvidence,
          },
          status: 'queued',
          production_status: 'not_started',
        })
        .select('id')
        .single()
      if (packageError || !packageJob?.id) throw packageError || new Error('Could not queue the original package.')

      const completed = await waitForJob(packageJob.id, setMessage, 'Original package')
      setResult(parseJson(completed.result || '{}'))
      setMessage('Ready.')
    } catch (e) {
      setError(e?.message || String(e))
      setMessage('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="create-workspace">
      <style>{` .create-workspace{color:var(--text)} .cw-head{padding:8px 0 28px;border-bottom:1px solid var(--border)} .cw-kicker{font-size:10px;font-weight:900;letter-spacing:.16em;color:var(--accent)} .cw-head h1{margin:8px 0 0;font-size:clamp(42px,5.8vw,76px);line-height:.9;letter-spacing:-.06em;max-width:900px} .cw-lead{margin:16px 0 0;max-width:780px;color:var(--text-muted);font-size:14px;line-height:1.65} .cw-box{margin-top:22px;padding:22px;border:1px solid var(--border);border-radius:12px;background:var(--surface);display:grid;gap:14px} .cw-row{display:grid;grid-template-columns:1fr 1fr;gap:12px} .cw-field{display:grid;gap:7px}.cw-field span{font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--text-subtle)} .cw-input{width:100%;padding:11px 12px;border:1px solid var(--border-strong);border-radius:8px;background:var(--panel-2);color:var(--text);font:inherit;font-size:12px}.cw-textarea{min-height:105px;resize:vertical}.cw-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.cw-progress{flex:1 1 320px;color:var(--text-muted);font-size:10px}.cw-btn{min-height:44px;padding:0 16px;border:0;border-radius:8px;background:var(--accent);color:#1a0f0c;font-size:11px;font-weight:900;cursor:pointer}.cw-btn:disabled{opacity:.45}.cw-error{padding:11px 12px;border:1px solid var(--bad);border-radius:8px;background:rgba(223,119,112,.08);color:var(--bad);font-size:11px}.cw-creator{margin-top:14px;padding:18px;border:1px solid var(--accent-line);border-radius:12px;background:var(--accent-soft)}.cw-creator b{display:block;font-size:12px}.cw-creator span{display:block;margin-top:5px;color:var(--text-2);font-size:11px;line-height:1.5}.cw-result{margin-top:14px;display:grid;gap:11px}.cw-result-main{padding:18px;border:1px solid var(--accent-line);border-radius:12px;background:var(--accent-soft)}.cw-result-main h2{margin:7px 0 0;font-size:28px;letter-spacing:-.04em}.cw-result-main p{margin:8px 0 0;color:var(--text-2);font-size:12px;line-height:1.5}.cw-card{padding:16px;border:1px solid var(--border);border-radius:11px;background:var(--surface)}.cw-label{font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--text-subtle)}.cw-item{margin-top:8px;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--panel-2);font-size:11px;line-height:1.45}@media(max-width:800px){.cw-row{grid-template-columns:1fr}}`}</style>
      {result ? (
        <section className="cw-result">
          <div className="cw-kicker">ORIGINAL PACKAGE</div>
          <div className="cw-result-main">
            <div className="cw-kicker">{selected.topic || 'Opportunity found'}</div>
            <h2>{selected.angle || selected.why_this_should_work || 'Built from an inspected reference.'}</h2>
            <p>{result?.operator_brief?.finding || 'Cornerstone extracted the source mechanism and rebuilt it as original work.'}</p>
          </div>
          {titles.length > 0 && <section className="cw-card"><div className="cw-label">Titles</div>{titles.slice(0, 8).map((item, index) => <div className="cw-item" key={index}>{typeof item === 'string' ? item : item?.title || JSON.stringify(item)}</div>)}</section>}
          {scenes.length > 0 && <section className="cw-card"><div className="cw-label">Possible scenes & creative direction</div>{scenes.slice(0, 10).map((item, index) => <div className="cw-item" key={index}>{typeof item === 'string' ? item : item?.direction || item?.scene || item?.shot || JSON.stringify(item)}</div>)}</section>}
          <div className="cw-actions"><button className="cw-btn" onClick={() => setResult(null)}>New analysis</button><a className="cw-btn" href="/content/creators">Open Cara & Lila →</a></div>
        </section>
      ) : (
        <>
          <header className="cw-head">
            <div className="cw-kicker">CREATE · SOURCE INTELLIGENCE</div>
            <h1>Find the mechanism. Build the original.</h1>
            <p className="cw-lead">Paste a public YouTube video and Cornerstone will acquire it locally, transcribe it, inspect representative frames, analyse the mechanism and build an original package. Cara and Lila have their own full creator-business engine under Voices.</p>
          </header>
          <section className="cw-creator"><b>Cara + Lila are not lost.</b><span>Use Voices for content creation, TikTok Shop, affiliates, Fanvue, audience growth and platform-native experiments.</span><div className="cw-actions"><span></span><a className="cw-btn" href="/content/creators">Open Creator Engine →</a></div></section>
          {learning && <section className="cw-box"><div className="cw-kicker">LATEST LEARNING</div><div>{learning.invariant_pattern || learning.format || 'Measured learning is ready to shape the next package.'}</div></section>}
          <section className="cw-box">
            <label className="cw-field"><span>YouTube reference</span><input className="cw-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" autoFocus /></label>
            <div className="cw-row"><label className="cw-field"><span>Niche</span><select className="cw-input" value={niche} onChange={(e) => setNiche(e.target.value)}>{NICHES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="cw-field"><span>What caught your attention?</span><textarea className="cw-input cw-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context for Cornerstone." /></label></div>
            {error && <div className="cw-error">{error}</div>}
            <div className="cw-actions"><div className="cw-progress">{message || 'YouTube → download → transcript → vision → mechanism → original package'}</div><button className="cw-btn" onClick={run} disabled={busy}>{busy ? 'Analysing…' : 'Analyse & build'}</button></div>
          </section>
        </>
      )}
    </main>
  )
}
