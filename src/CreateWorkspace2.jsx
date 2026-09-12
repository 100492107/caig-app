import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const NICHES = ['Gaming', 'History', 'Stories', 'Documentary', 'Business / money', 'Technology', 'Lifestyle', 'Other']
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const clean = (v) => String(v ?? '').trim()

function parseJson(text) {
  const value = clean(text)
    .replace(/```json|```/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/<\|im_end\|>|<\|endoftext\|>/gi, '')
    .trim()
  try { return JSON.parse(value) } catch {}
  const start = value.search(/[\[{]/)
  if (start < 0) throw new Error('Cornerstone could not understand the returned package.')
  const open = value[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let quoted = false
  let escaped = false
  for (let i = start; i < value.length; i += 1) {
    const c = value[i]
    if (quoted) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') quoted = false
      continue
    }
    if (c === '"') quoted = true
    else if (c === open) depth += 1
    else if (c === close && --depth === 0) {
      try { return JSON.parse(value.slice(start, i + 1)) } catch { break }
    }
  }
  throw new Error('Cornerstone returned an incomplete package.')
}

async function api(action, payload = {}) {
  const r = await fetch('/api/queue-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action, ...payload }),
  })
  const b = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(b.error || `Request failed (${r.status})`)
  return b
}

async function jobStatus(id) {
  const r = await fetch(`/api/queue-update?action=job_status&id=${encodeURIComponent(id)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const b = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(b.error || 'Could not read the job.')
  return b
}

async function waitForJob(id, setMessage, label) {
  const until = Date.now() + 45 * 60 * 1000
  let last = ''
  while (Date.now() < until) {
    const job = await jobStatus(id)
    if (job.status !== last) {
      last = job.status
      if (job.status === 'processing') setMessage(`${label} is being analysed…`)
      else if (job.status === 'completed') setMessage(`${label} complete.`)
      else if (job.status === 'error') setMessage(job.error_message || `${label} failed.`)
      else setMessage(`${label} is ${job.status}…`)
    }
    if (job.status === 'completed') return job
    if (job.status === 'error') throw new Error(job.error_message || `${label} failed.`)
    await sleep(2500)
  }
  throw new Error(`${label} took too long. Check System for local intelligence status.`)
}

async function qwenOnline() {
  try {
    const { data } = await supabase.from('local_ai_worker_heartbeat').select('status,last_seen').eq('id', 'qwen').maybeSingle()
    return Boolean(data?.last_seen && Date.now() - new Date(data.last_seen).getTime() < 90000 && String(data.status || '').toLowerCase() !== 'offline')
  } catch {
    return false
  }
}

export default function CreateWorkspace2() {
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [niche, setNiche] = useState('Gaming')
  const [learning, setLearning] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase
      .from('track_b_learning_recommendations')
      .select('id,recommendation_type,hook_type,format,invariant_pattern,confidence,source_evidence_id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setLearning(data || null) })
    return () => { cancelled = true }
  }, [])

  const selected = result?.selected_video || result?.production_package || result
  const scenes = useMemo(() => result?.scene_directions || result?.scene_options || selected?.scene_directions || selected?.visual_directions || [], [result, selected])
  const titles = useMemo(() => selected?.titles || selected?.title_options || [], [selected])

  async function run() {
    setError('')
    setResult(null)
    if (!url.trim() && !notes.trim()) {
      setError('Paste a YouTube video link to start.')
      return
    }
    if (!(await qwenOnline())) {
      setError('Local intelligence is offline. Start the Cornerstone local AI stack first.')
      return
    }
    setBusy(true)
    try {
      setMessage('Finding the video…')
      const source = await fetch('/api/queue-youtube-ingestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ url: url.trim() }),
      })
      const sourceBody = await source.json().catch(() => ({}))
      if (!source.ok) throw new Error(sourceBody.error || 'Cornerstone could not queue the YouTube source.')

      const acquisition = await waitForJob(sourceBody.jobId, setMessage, 'YouTube source acquisition')
      const acquisitionResult = parseJson(acquisition.result || '{}')
      if (!acquisitionResult.media_job_id) throw new Error('The video was downloaded, but the media analysis job was not created.')

      const media = await waitForJob(acquisitionResult.media_job_id, setMessage, 'Video inspection')
      const mediaResult = parseJson(media.result || '{}')
      if (!mediaResult.text_analysis_job_id) throw new Error('Video inspection completed without a text analysis job.')

      const analysis = await waitForJob(mediaResult.text_analysis_job_id, setMessage, 'Source intelligence')
      const analysisResult = parseJson(analysis.result || '{}')

      setMessage('Turning what Cornerstone learned into an original package…')
      const learningNotes = learning
        ? `\n\nMEASURED LEARNING SIGNAL (direction only):\n${JSON.stringify(learning)}\nPreserve the invariant mechanism, vary the execution. Do not copy the winning asset.`
        : ''
      const generated = await api('queue_content_engine', {
        niche,
        channel: 'YouTube',
        referenceUrl: url.trim(),
        referenceNotes: `${notes}${learningNotes}\n\nSOURCE ANALYSIS FROM DOWNLOADED VIDEO:\n${JSON.stringify(analysisResult)}`,
        duration: '20',
        output: 'Long-form + Shorts',
        direction: 'Create a materially original package from the observed mechanism. Never copy wording, identity, branding, scenes, footage or distinctive packaging. Include practical original scene directions.',
        sourceAnalysis: { youtube_acquisition: acquisitionResult, media_inspection: mediaResult, source_analysis: analysisResult },
      })
      const packageJob = await waitForJob(generated.jobId, setMessage, 'Original package')
      setResult(parseJson(packageJob.result || '{}'))
      setMessage('Package ready.')
    } catch (e) {
      setError(e?.message || String(e))
      setMessage('')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!selected) return
    setBusy(true)
    setError('')
    setMessage('Saving to your library…')
    try {
      const bestTitle = titles?.[0]?.title || titles?.[0] || selected.topic || 'Original package'
      const hashtags = Array.isArray(selected.seo?.hashtags) ? selected.seo.hashtags.join(' ') : ''
      const brief = {
        topic: selected.topic || null,
        angle: selected.angle || null,
        why_this_should_work: selected.why_this_should_work || null,
        hook: selected.hook_0_5s || selected.hook || '',
        caption: selected.script || '',
        hashtags,
        cta: selected.seo?.next_video_cta || '',
        photo_idea: selected.thumbnails?.[0]?.composition || '',
        photo_direction: JSON.stringify(selected.visual_timeline || []),
        selected_video: selected,
        scene_directions: scenes,
        learning_recommendation: learning,
      }
      const { error: saveError } = await supabase.rpc('create_track_b_content_package', {
        p_title: bestTitle,
        p_source_url: url.trim() || null,
        p_source_type: 'youtube_reference',
        p_brief: brief,
        p_source_evidence: result?.reference_analysis || {},
        p_platform: 'YouTube',
        p_hook: selected.hook_0_5s || selected.hook || '',
        p_caption: selected.script || '',
        p_hashtags: hashtags,
        p_cta: selected.seo?.next_video_cta || '',
        p_photo_idea: selected.thumbnails?.[0]?.composition || '',
        p_photo_direction: JSON.stringify(selected.visual_timeline || []),
        p_post_type: 'Long-form + Shorts',
        p_content_queue_id: `ce-${crypto.randomUUID()}`,
      })
      if (saveError) throw saveError
      setMessage('Saved. Ready for Make.')
    } catch (e) {
      setError(e?.message || String(e))
      setMessage('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={styles.page}>
      {!result ? (
        <section style={styles.heroPanel}>
          <div style={styles.eyebrow}>SOURCE INTELLIGENCE</div>
          <h2 style={styles.heroTitle}>Give Cornerstone a video worth studying.</h2>
          <p style={styles.heroCopy}>Paste a public YouTube link. Cornerstone will acquire the video, inspect the transcript and representative frames, extract the mechanism, then build a materially original package.</p>
          {learning ? <div style={styles.learning}><strong>Learning already in play.</strong><span>{learning.invariant_pattern || learning.format || 'Latest measured signal will shape the next package.'}</span></div> : null}
          <div style={styles.form}>
            <label style={styles.field}>
              <span style={styles.label}>YouTube video</span>
              <input style={styles.input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" autoFocus />
            </label>
            <div style={styles.row}>
              <label style={styles.field}>
                <span style={styles.label}>Niche</span>
                <select style={styles.input} value={niche} onChange={(e) => setNiche(e.target.value)}>{NICHES.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <label style={styles.field}>
                <span style={styles.label}>What caught your attention?</span>
                <textarea style={{ ...styles.input, minHeight: 96 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional. Tell Cornerstone what made you stop scrolling." />
              </label>
            </div>
            {error ? <div style={styles.error}>{error}</div> : null}
            <div style={styles.actions}>
              <div style={styles.progress}>{message || 'Video → transcript → frames → mechanism → original package'}</div>
              <button type="button" onClick={run} disabled={busy} style={styles.primary}>{busy ? 'Working…' : 'Analyse & build'}</button>
            </div>
          </div>
        </section>
      ) : (
        <section style={styles.resultPanel}>
          <div style={styles.eyebrow}>ORIGINAL PACKAGE</div>
          <h2 style={styles.heroTitle}>{selected?.topic || 'Cornerstone found an opportunity.'}</h2>
          <p style={styles.heroCopy}>{selected?.angle || selected?.why_this_should_work || 'The package below was built from inspected source evidence, then reconstructed as original work.'}</p>
          <div style={styles.resultGrid}>
            <article style={styles.card}><div style={styles.label}>What Cornerstone found</div><p>{result?.operator_brief?.finding || result?.reference_analysis?.original_reconstruction || selected?.why_this_should_work || 'Source mechanism extracted.'}</p></article>
            <article style={styles.card}><div style={styles.label}>How we know</div><p>Downloaded YouTube source, transcripted audio and inspected representative frames. Evidence is separated from creative inference.</p></article>
          </div>
          {titles.length ? <article style={styles.card}><div style={styles.label}>Titles</div><div style={styles.list}>{titles.slice(0, 5).map((t, i) => <div key={i}>{typeof t === 'string' ? t : t?.title || JSON.stringify(t)}</div>)}</div></article> : null}
          {scenes.length ? <article style={styles.card}><div style={styles.label}>Possible scenes & creative direction</div><div style={styles.list}>{scenes.slice(0, 8).map((scene, i) => <div key={i}>{typeof scene === 'string' ? scene : scene?.direction || scene?.scene || JSON.stringify(scene)}</div>)}</div></article> : null}
          <div style={styles.actions}><button type="button" onClick={() => setResult(null)} style={styles.secondary}>Start another</button><button type="button" onClick={save} disabled={busy} style={styles.primary}>{busy ? 'Saving…' : 'Save to Library'}</button></div>
        </section>
      )}
    </main>
  )
}

const styles = {
  page: { maxWidth: 1180, margin: '0 auto', padding: '44px 0 100px', color: 'var(--text)' },
  heroPanel: { border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 16, overflow: 'hidden' },
  resultPanel: { display: 'grid', gap: 14 },
  eyebrow: { padding: '24px 28px 0', fontSize: 10, letterSpacing: '.16em', fontWeight: 800, color: 'var(--accent)' },
  heroTitle: { margin: '8px 28px 0', fontSize: 'clamp(42px, 6vw, 76px)', lineHeight: .92, letterSpacing: '-.06em', maxWidth: 11 + 'ch', color: 'var(--text)' },
  heroCopy: { margin: '16px 28px 0', maxWidth: 680, fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)' },
  learning: { margin: '24px 28px 0', padding: '13px 15px', borderLeft: '3px solid var(--accent)', background: 'var(--accent-soft)', display: 'grid', gap: 3 },
  form: { marginTop: 30, padding: 28, borderTop: '1px solid var(--line)', display: 'grid', gap: 18 },
  row: { display: 'grid', gridTemplateColumns: '0.6fr 1.4fr', gap: 14 },
  field: { display: 'grid', gap: 7 },
  label: { fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-3)' },
  input: { width: '100%', minHeight: 46, padding: '11px 13px', border: '1px solid var(--line-2)', borderRadius: 9, background: 'var(--panel-2)', color: 'var(--text)', font: 'inherit', fontSize: 13, outline: 'none' },
  actions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 6 },
  progress: { fontSize: 12, color: 'var(--text-3)', flex: '1 1 280px' },
  primary: { minHeight: 44, padding: '0 18px', border: 0, borderRadius: 9, background: 'var(--accent)', color: '#14120f', fontWeight: 800, cursor: 'pointer' },
  secondary: { minHeight: 44, padding: '0 18px', border: '1px solid var(--line-2)', borderRadius: 9, background: 'transparent', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' },
  error: { padding: '12px 14px', borderRadius: 9, background: 'rgba(222,100,100,.1)', border: '1px solid rgba(222,100,100,.28)', color: '#f0aaa6', fontSize: 12 },
  resultGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  card: { padding: 20, border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 12 },
  list: { display: 'grid', gap: 8, marginTop: 12 },
}
