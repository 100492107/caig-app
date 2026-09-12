import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const NICHES = ['Gaming', 'History', 'Stories', 'Documentary', 'Business / money', 'Technology', 'Lifestyle', 'Other']
const clean = (v) => String(v ?? '').trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function parseJson(text) {
  const value = clean(text).replace(/```json|```/gi, '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<analysis>[\s\S]*?<\/analysis>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').replace(/<\|im_end\|>|<\|endoftext\|>/gi, '').trim()
  try { return JSON.parse(value) } catch {}
  const start = value.search(/[\[{]/)
  if (start < 0) throw new Error('Cornerstone could not understand the returned result.')
  const open = value[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0; let quoted = false; let escaped = false
  for (let i = start; i < value.length; i += 1) {
    const c = value[i]
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue }
    if (c === '"') quoted = true
    else if (c === open) depth += 1
    else if (c === close && --depth === 0) return JSON.parse(value.slice(start, i + 1))
  }
  throw new Error('Cornerstone returned an incomplete result.')
}

async function jobStatus(id) {
  const r = await fetch(`/api/queue-update?action=job_status&id=${encodeURIComponent(id)}`, { credentials: 'same-origin', cache: 'no-store' })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(body.error || 'Could not read job status.')
  return body
}

async function waitJob(id, setMessage, label) {
  const until = Date.now() + 45 * 60 * 1000
  let last = ''
  while (Date.now() < until) {
    const job = await jobStatus(id)
    if (job.status !== last) {
      last = job.status
      if (job.status === 'processing') setMessage(`${label} is working…`)
      else if (job.status === 'completed') setMessage(`${label} complete.`)
      else setMessage(`${label} is ${job.status}…`)
    }
    if (job.status === 'completed') return job
    if (job.status === 'error') throw new Error(job.error_message || `${label} failed.`)
    await sleep(2500)
  }
  throw new Error(`${label} took too long. Check System.`)
}

export default function CreateWorkspace3() {
  const [url, setUrl] = useState('')
  const [niche, setNiche] = useState('Gaming')
  const [notes, setNotes] = useState('')
  const [learning, setLearning] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [sourceMeta, setSourceMeta] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.from('track_b_learning_recommendations')
      .select('id,format,invariant_pattern,confidence,source_evidence_id')
      .eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (alive) setLearning(data || null) })
    return () => { alive = false }
  }, [])

  const selected = result?.selected_video || result?.production_package || result
  const scenes = useMemo(() => result?.scene_directions || selected?.scene_directions || selected?.visual_directions || [], [result, selected])
  const titles = useMemo(() => selected?.titles || selected?.title_options || [], [selected])

  async function run() {
    setError(''); setResult(null); setSaved(false)
    if (!url.trim()) return setError('Paste a public YouTube video link.')
    setBusy(true); setMessage('Checking local intelligence…')
    try {
      const { data: hb } = await supabase.from('local_ai_worker_heartbeat').select('status,last_seen').eq('id', 'qwen').maybeSingle()
      if (!(hb?.last_seen && Date.now() - new Date(hb.last_seen).getTime() < 90000 && hb.status !== 'offline')) throw new Error('Local intelligence is offline. Start the Cornerstone local AI stack.')

      setMessage('Acquiring the video…')
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) throw new Error('Please sign in again.')
      const sourceUrl = new URL(url.trim())
      const host = sourceUrl.hostname.toLowerCase().replace(/^www\./, '')
      if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) throw new Error('Use a YouTube URL.')
      const { data: acquisition, error: acquisitionError } = await supabase.from('local_ai_jobs').insert({
        owner_id: userData.user.id,
        title: `YouTube source · ${sourceUrl.toString()}`,
        job_type: 'youtube_source_ingestion',
        model: 'mlx-community/Qwen3-8B-4bit',
        persona_id: 'cornerstone_content_engine',
        system_prompt: 'Acquire one public YouTube source for local evidence inspection. Never claim analysis before the downloaded media is processed.',
        user_prompt: `Acquire this single public YouTube source: ${sourceUrl.toString()}`,
        options: { source_url: sourceUrl.toString(), original_url: sourceUrl.toString(), research_domain: 'TRACK_B_CONTENT_ENGINE', workspace_id: 'track_b' },
        status: 'queued',
        production_status: 'youtube_source_queued',
      }).select('id').single()
      if (acquisitionError || !acquisition?.id) throw acquisitionError || new Error('Could not queue the YouTube source.')

      const acquisitionJob = await waitJob(acquisition.id, setMessage, 'YouTube acquisition')
      const acquisitionResult = parseJson(acquisitionJob.result || '{}')
      if (!acquisitionResult.media_job_id) throw new Error('The video downloaded, but its inspection job was not created.')

      const mediaJob = await waitJob(acquisitionResult.media_job_id, setMessage, 'Video inspection')
      const mediaResult = parseJson(mediaJob.result || '{}')
      if (!mediaResult.text_analysis_job_id) throw new Error('Video inspection completed without source analysis.')

      const analysisJob = await waitJob(mediaResult.text_analysis_job_id, setMessage, 'Source intelligence')
      const analysis = parseJson(analysisJob.result || '{}')
      setSourceMeta({ acquisition: acquisitionResult, media: mediaResult, analysis })

      setMessage('Building the original package…')
      const learningNotes = learning ? `\n\nLATEST MEASURED LEARNING SIGNAL (direction only):\n${JSON.stringify(learning)}\nPreserve the invariant mechanism and vary the execution.` : ''
      const { data: generated, error: queueError } = await supabase.from('local_ai_jobs').insert({
        owner_id: userData.user.id,
        title: `Content package · ${analysis.topic_interest || sourceUrl.hostname}`,
        job_type: 'content_engine',
        model: 'mlx-community/Qwen3-8B-4bit',
        persona_id: 'cornerstone_content_engine',
        system_prompt: 'You are Cornerstone Track B content intelligence. Use inspected source evidence to build a materially original package. Never copy distinctive expression.',
        user_prompt: `TARGET NICHE: ${niche}\nCHANNEL: YouTube\nREFERENCE URL: ${sourceUrl.toString()}\nNOTES: ${notes || 'None'}${learningNotes}\n\nINSPECTED SOURCE EVIDENCE:\n${JSON.stringify(analysis)}\n\nBuild the full original Track B package requested by the Content Engine contract. Include operator brief, titles, thumbnails, hook, full script, chapters, visual timeline, scene_directions, Shorts, publication sequence, measurement, originality and monetisation tests.`,
        options: { research: true, max_tokens: 6500, temperature: 0.35, research_domain: 'TRACK_B_CONTENT_ENGINE', workspace_id: 'track_b', source_analysis: { youtube_acquisition: acquisitionResult, media_inspection: mediaResult, source_analysis: analysis } },
        status: 'queued',
        production_status: 'content_engine_queued',
      }).select('id').single()
      if (queueError || !generated?.id) throw queueError || new Error('Could not queue the original package.')
      const packageJob = await waitJob(generated.id, setMessage, 'Original package')
      setResult(parseJson(packageJob.result || '{}'))
      setMessage('Ready.')
    } catch (e) {
      setError(e?.message || String(e)); setMessage('')
    } finally { setBusy(false) }
  }

  async function save() {
    if (!selected || saved) return
    setBusy(true); setError(''); setMessage('Saving to your library…')
    try {
      const bestTitle = titles[0]?.title || titles[0] || selected.topic || 'Original package'
      const hashtags = Array.isArray(selected.seo?.hashtags) ? selected.seo.hashtags.join(' ') : ''
      const { error: saveError } = await supabase.rpc('create_track_b_content_package', {
        p_title: bestTitle, p_source_url: url.trim(), p_source_type: 'youtube_reference',
        p_brief: { selected_video: selected, scene_directions: scenes, shorts: result?.shorts || result?.short_form || [], learning_recommendation: learning, source_meta: sourceMeta },
        p_source_evidence: sourceMeta?.analysis || {}, p_platform: 'YouTube', p_hook: selected.hook_0_5s || selected.hook || '', p_caption: selected.script || '', p_hashtags: hashtags, p_cta: selected.seo?.next_video_cta || '', p_photo_idea: selected.thumbnails?.[0]?.composition || '', p_photo_direction: JSON.stringify(selected.visual_timeline || []), p_post_type: 'Long-form + Shorts', p_content_queue_id: `ce-${crypto.randomUUID()}`,
      })
      if (saveError) throw saveError
      setSaved(true); setMessage('Saved. Ready for Make.')
    } catch (e) { setError(e?.message || String(e)); setMessage('') }
    finally { setBusy(false) }
  }

  if (result) return <main style={styles.page}>
    <div style={styles.kicker}>ORIGINAL PACKAGE</div>
    <h1 style={styles.title}>{selected?.topic || 'Opportunity found.'}</h1>
    <p style={styles.lead}>{selected?.angle || selected?.why_this_should_work || 'Built from a downloaded and inspected source.'}</p>
    <div style={styles.grid}>
      <section style={styles.card}><div style={styles.label}>What Cornerstone found</div><p>{result?.operator_brief?.finding || result?.reference_analysis?.original_reconstruction || selected?.why_this_should_work || 'Source mechanism extracted.'}</p></section>
      <section style={styles.card}><div style={styles.label}>How we know</div><p>Source downloaded, audio transcribed with Whisper, representative frames inspected with Qwen Vision, then synthesised into source intelligence.</p></section>
    </div>
    {titles.length ? <section style={styles.card}><div style={styles.label}>Titles</div>{titles.slice(0, 8).map((x, i) => <div style={styles.item} key={i}>{typeof x === 'string' ? x : x?.title || JSON.stringify(x)}</div>)}</section> : null}
    {scenes.length ? <section style={styles.card}><div style={styles.label}>Possible scenes & creative direction</div>{scenes.slice(0, 8).map((x, i) => <div style={styles.item} key={i}>{typeof x === 'string' ? x : x?.direction || x?.scene || JSON.stringify(x)}</div>)}</section> : null}
    <div style={styles.actions}><button onClick={() => { setResult(null); setSourceMeta(null) }} style={styles.secondary}>New analysis</button><button onClick={save} disabled={busy || saved} style={styles.primary}>{saved ? 'Saved' : busy ? 'Saving…' : 'Save to Library'}</button></div>
    {error ? <div style={styles.error}>{error}</div> : null}
  </main>

  return <main style={styles.page}>
    <div style={styles.kicker}>SOURCE INTELLIGENCE</div>
    <h1 style={styles.title}>Show Cornerstone something worth stealing from.</h1>
    <p style={styles.lead}>Not the words. Not the creator. The mechanism. Cornerstone downloads the YouTube source, listens to it, looks at it, understands why it works, and builds an original version.</p>
    {learning ? <div style={styles.learning}><strong>Latest learning</strong><span>{learning.invariant_pattern || learning.format || 'No measured signal yet.'}</span></div> : null}
    <section style={styles.form}>
      <label style={styles.field}><span style={styles.label}>YouTube video</span><input style={styles.input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></label>
      <div style={styles.row}>
        <label style={styles.field}><span style={styles.label}>Niche</span><select style={styles.input} value={niche} onChange={(e) => setNiche(e.target.value)}>{NICHES.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label style={styles.field}><span style={styles.label}>Your note</span><textarea style={{ ...styles.input, minHeight: 100 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context for Cornerstone." /></label>
      </div>
      {error ? <div style={styles.error}>{error}</div> : null}
      <div style={styles.actions}><div style={styles.progress}>{message || 'YouTube → transcript → vision → mechanism → original package'}</div><button onClick={run} disabled={busy} style={styles.primary}>{busy ? 'Analysing…' : 'Analyse & build'}</button></div>
    </section>
  </main>
}

const styles = {
  page: { maxWidth: 1120, margin: '0 auto', padding: '48px 0 100px', color: 'var(--text)' },
  kicker: { fontSize: 10, fontWeight: 900, letterSpacing: '.18em', color: 'var(--accent)', textTransform: 'uppercase' },
  title: { margin: '10px 0 0', fontSize: 'clamp(42px, 6vw, 76px)', lineHeight: .9, letterSpacing: '-.06em', maxWidth: '12ch' },
  lead: { margin: '18px 0 0', maxWidth: 720, fontSize: 15, lineHeight: 1.65, color: 'var(--text-2)' },
  learning: { marginTop: 26, padding: '14px 16px', borderLeft: '3px solid var(--accent)', background: 'var(--accent-soft)', display: 'grid', gap: 3 },
  form: { marginTop: 30, padding: 28, border: '1px solid var(--line)', borderRadius: 14, background: 'var(--panel)', display: 'grid', gap: 18 },
  row: { display: 'grid', gridTemplateColumns: '0.55fr 1.45fr', gap: 14 },
  field: { display: 'grid', gap: 7 },
  label: { fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: 'var(--text-3)', textTransform: 'uppercase' },
  input: { width: '100%', minHeight: 46, padding: '11px 13px', borderRadius: 8, border: '1px solid var(--line-2)', background: 'var(--panel-2)', color: 'var(--text)', font: 'inherit', outline: 'none' },
  actions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' },
  progress: { flex: '1 1 300px', color: 'var(--text-3)', fontSize: 12 },
  primary: { minHeight: 44, padding: '0 18px', border: 0, borderRadius: 8, background: 'var(--accent)', color: '#16120f', fontWeight: 850, cursor: 'pointer' },
  secondary: { minHeight: 44, padding: '0 18px', border: '1px solid var(--line-2)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontWeight: 750, cursor: 'pointer' },
  error: { padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(223,119,112,.32)', background: 'rgba(223,119,112,.1)', color: '#efaaa4', fontSize: 12 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 28 },
  card: { padding: 20, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--panel)' },
  item: { marginTop: 8, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--panel-2)', fontSize: 13, lineHeight: 1.45 },
}
