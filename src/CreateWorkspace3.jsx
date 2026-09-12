import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const NICHES = ['Gaming', 'History', 'Stories', 'Documentary', 'Business / money', 'Technology', 'Lifestyle', 'Other']
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function clean(value) {
  return String(value ?? '').trim()
}

function parseJson(raw) {
  // Supabase jsonb columns often arrive as objects; workers sometimes double-encode strings.
  if (raw == null || raw === '') return {}
  if (typeof raw === 'object') return raw
  const text = clean(raw)
    .replace(/```json|```/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/<\|im_end\|>|<\|endoftext\|>/gi, '')
    .trim()
  try {
    const once = JSON.parse(text)
    if (typeof once === 'string') {
      try { return JSON.parse(once) } catch { return { raw: once } }
    }
    return once && typeof once === 'object' ? once : {}
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

async function resolveMediaJobId(acquisitionId, acquisitionResult, ownerId) {
  if (acquisitionResult?.media_job_id) return acquisitionResult.media_job_id
  const { data, error } = await supabase
    .from('local_ai_jobs')
    .select('id,options,created_at,job_type')
    .eq('owner_id', ownerId)
    .eq('job_type', 'content_media_ingestion')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message || 'Could not locate the inspection job.')
  const match = (data || []).find((row) => {
    const options = row.options || {}
    return options.youtube_parent_job_id === acquisitionId || options.youtube_parent_job_id === String(acquisitionId)
  })
  if (match?.id) return match.id
  return null
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

export default function CreateWorkspace() {
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [niche, setNiche] = useState('Technology')
  const [learning, setLearning] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('track_b_learning_recommendations')
      .select('id,recommendation_type,hook_type,format,invariant_pattern,confidence,source_evidence_id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLearning(data || null))
  }, [])

  const selected = result?.selected_video || result?.package || result
  const shorts = useMemo(() => result?.shorts || result?.short_form || [], [result])
  const scenes = useMemo(
    () => result?.scene_directions || result?.scene_options || selected?.scene_directions || [],
    [result, selected],
  )

  async function run() {
    setError('')
    setMessage('')
    setResult(null)
    if (!isYoutubeUrl(url)) {
      setError('Paste a public YouTube video URL.')
      return
    }
    setBusy(true)
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

      setMessage('Queueing YouTube acquisition…')
      const { data: acquisition, error: acquisitionError } = await supabase
        .from('local_ai_jobs')
        .insert({
          owner_id: auth.user.id,
          title: `YouTube source · ${url}`,
          job_type: 'youtube_source_ingestion',
          model: 'yt-dlp',
          persona_id: 'cornerstone_content_engine',
          system_prompt: 'Download a public YouTube reference into private Cornerstone storage for offline inspection.',
          user_prompt: `Acquire ${url}`,
          options: {
            source_url: url,
            research_domain: 'TRACK_B_CONTENT_ENGINE',
            workspace_id: 'track_b',
            niche,
            operator_notes: notes || null,
          },
          status: 'queued',
          production_status: 'not_started',
        })
        .select('id')
        .single()
      if (acquisitionError || !acquisition?.id) throw acquisitionError || new Error('Could not queue the YouTube source.')

      const acquisitionJob = await waitForJob(acquisition.id, setMessage, 'YouTube acquisition')
      const acquisitionResult = parseJson(acquisitionJob.result || {})
      const mediaJobId = await resolveMediaJobId(acquisition.id, acquisitionResult, auth.user.id)
      if (!mediaJobId) {
        throw new Error('The video downloaded, but its inspection job was not created. Confirm the YouTube worker and source-ingestion worker are running on your Mac, then retry.')
      }

      const mediaJob = await waitForJob(mediaJobId, setMessage, 'Video inspection')
      const mediaResult = parseJson(mediaJob.result || {})
      let analysisJobId = mediaResult.text_analysis_job_id
      if (!analysisJobId) {
        const { data: analysisJobs, error: analysisLookupError } = await supabase
          .from('local_ai_jobs')
          .select('id,job_type,options,created_at')
          .eq('owner_id', auth.user.id)
          .eq('job_type', 'content_source_analysis')
          .order('created_at', { ascending: false })
          .limit(20)
        if (analysisLookupError) throw new Error(analysisLookupError.message)
        const linked = (analysisJobs || []).find((row) => {
          const options = row.options || {}
          return options.parent_media_job_id === mediaJobId || options.parent_media_job_id === String(mediaJobId)
        })
        analysisJobId = linked?.id || null
      }
      if (!analysisJobId) throw new Error('Video inspection completed without source intelligence. Confirm Whisper, Vision and the source-ingestion worker are running.')

      setMessage('Source intelligence is working…')
      const analysisJob = await waitForJob(analysisJobId, setMessage, 'Source intelligence')
      const analysis = parseJson(analysisJob.result || {})
      const sourceEvidence = { acquisition: acquisitionResult, media: mediaResult, analysis }

      const learningNotes = learning
        ? `\n\nMEASURED LEARNING SIGNAL:\n${JSON.stringify(learning)}\nPreserve the invariant mechanism. Change the execution. Do not copy the winning asset.`
        : ''

      setMessage('Building the original package…')
      const { data: packageJob, error: packageError } = await supabase
        .from('local_ai_jobs')
        .insert({
          owner_id: auth.user.id,
          title: `Original package · ${niche}`,
          job_type: 'content_engine',
          model: 'mlx-community/Qwen3-8B-4bit',
          persona_id: 'cornerstone_content_engine',
          system_prompt:
            'You are Cornerstone Content Engine. Build original packages from source mechanisms. Never copy wording, identity, branding, scenes or distinctive packaging. Return operator-first JSON.',
          user_prompt: `NICHE: ${niche}\nREFERENCE_URL: ${url}\nOPERATOR_NOTES: ${notes || 'None'}${learningNotes}\n\nSOURCE_EVIDENCE:\n${JSON.stringify(sourceEvidence).slice(0, 90000)}\n\nCreate a materially original long-form + shorts package. Include selected_video with topic, angle, why_this_should_work, hook_0_5s, titles, script, seo, thumbnails; plus shorts and scene_directions.`,
          options: {
            max_tokens: 8000,
            temperature: 0.55,
            content_engine: true,
            research_domain: 'TRACK_B_CONTENT_ENGINE',
            workspace_id: 'track_b',
            learning_recommendation_id: learning?.id || null,
            source_evidence_id: learning?.source_evidence_id || null,
          },
          status: 'queued',
          production_status: 'not_started',
        })
        .select('id')
        .single()
      if (packageError || !packageJob?.id) throw packageError || new Error('Could not queue the original package.')

      const completed = await waitForJob(packageJob.id, setMessage, 'Original package')
      setResult(parseJson(completed.result || {}))
      setMessage('Original package ready.')
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

      <header className="cw-head">
        <div className="cw-kicker">Create</div>
        <h1>Find the mechanism. Build the original.</h1>
        <p className="cw-lead">
          Paste a public YouTube video and Cornerstone will acquire it locally, transcribe it, inspect representative frames, analyse the mechanism and build an original package. Cara and Lila have their own full creator-business engine under Voices.
        </p>
      </header>

      <div className="cw-creator">
        <b>Cara + Lila are not lost.</b>
        <span>Use Voices for content creation, TikTok Shop, affiliates, Fanvue, audience growth and platform-native experiments.</span>
        <div style={{ marginTop: 12 }}>
          <a className="cw-btn" href="/content/creators" style={{ display: 'inline-flex', textDecoration: 'none' }}>Open Creator Engine →</a>
        </div>
      </div>

      <section className="cw-box">
        <label className="cw-field">
          <span>YouTube reference</span>
          <input className="cw-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
        </label>
        <div className="cw-row">
          <label className="cw-field">
            <span>Niche</span>
            <select className="cw-input" value={niche} onChange={(e) => setNiche(e.target.value)}>
              {NICHES.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="cw-field">
            <span>What caught your attention?</span>
            <textarea className="cw-input cw-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context for Cornerstone." />
          </label>
        </div>
        {error ? <div className="cw-error">{error}</div> : null}
        <div className="cw-actions">
          <div className="cw-progress">{message || 'YouTube → download → transcript → vision → mechanism → original package'}</div>
          <button className="cw-btn" disabled={busy} onClick={run}>
            {busy ? 'Working…' : 'Analyse & build'}
          </button>
        </div>
      </section>

      {result ? (
        <section className="cw-result">
          <article className="cw-result-main">
            <div className="cw-label">Original package</div>
            <h2>{selected?.topic || selected?.titles?.[0]?.title || selected?.title || 'Package ready'}</h2>
            <p>{selected?.angle || selected?.why_this_should_work || selected?.summary || 'Mechanism extracted and rewritten into an original piece.'}</p>
          </article>
          {selected?.hook_0_5s ? (
            <article className="cw-card">
              <div className="cw-label">Hook</div>
              <div className="cw-item">{selected.hook_0_5s}</div>
            </article>
          ) : null}
          {selected?.why_this_should_work ? (
            <article className="cw-card">
              <div className="cw-label">Why it should work</div>
              <div className="cw-item">{selected.why_this_should_work}</div>
            </article>
          ) : null}
          {scenes?.length ? (
            <article className="cw-card">
              <div className="cw-label">Scenes</div>
              {scenes.slice(0, 6).map((s, i) => (
                <div className="cw-item" key={i}>
                  {typeof s === 'string' ? s : s?.title || s?.direction || JSON.stringify(s)}
                </div>
              ))}
            </article>
          ) : null}
          {shorts?.length ? (
            <article className="cw-card">
              <div className="cw-label">Shorts</div>
              {shorts.slice(0, 6).map((s, i) => (
                <div className="cw-item" key={i}>
                  {s.short_title || s.title || s.hook || JSON.stringify(s)}
                </div>
              ))}
            </article>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}
