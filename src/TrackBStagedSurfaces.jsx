import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const PERSONAS = [
  { id: 'cara', name: 'Cara', tone: 'Direct, dry, disciplined', tag: 'Sharper takes' },
  { id: 'lila', name: 'Lila', tone: 'Warm, observant, understated', tag: 'Quietly personal' },
  { id: 'cara_lila', name: 'Cara + Lila', tone: 'Contrast, chemistry, two voices', tag: 'Built for interaction' },
]

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Fanvue', 'TikTok Shop', 'Affiliate']
const OBJECTIVES = ['Grow audience', 'Create content', 'Test monetisation', 'Drive clicks / sales', 'Build a repeatable series']
const FORMATS = ['Personal moment', 'POV / relatable', 'Quick take', 'Micro-story', 'GRWM', 'Day in the life', 'Photo slideshow', 'Reaction', 'Product-led demo', 'Story + recommendation']

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function readUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('Please sign in again.')
  return data.user
}

async function waitJob(id, setMessage) {
  const until = Date.now() + 45 * 60 * 1000
  let last = ''
  while (Date.now() < until) {
    const { data, error } = await supabase
      .from('local_ai_jobs')
      .select('id,status,error_message')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Creator job disappeared.')
    if (data.status !== last) {
      last = data.status
      setMessage(data.status === 'processing' ? 'Cornerstone is building the creator package…' : `Creator package is ${data.status}…`)
    }
    if (data.status === 'completed') return data
    if (data.status === 'error') throw new Error(data.error_message || 'Creator package failed.')
    await sleep(2500)
  }
  throw new Error('Creator package took too long. Check System.')
}

export function CreatorsStaged({ onAdvance } = {}) {
  const [persona, setPersona] = useState('cara')
  const [platform, setPlatform] = useState('TikTok')
  const [objective, setObjective] = useState('Create content')
  const [format, setFormat] = useState('Personal moment')
  const [direction, setDirection] = useState('')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [jobs, setJobs] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const selected = PERSONAS.find((x) => x.id === persona) || PERSONAS[0]

  async function load() {
    const user = await readUser()
    const { data, error } = await supabase
      .from('local_ai_jobs')
      .select('id,title,status,created_at,persona_id,job_type,options,result')
      .eq('owner_id', user.id)
      .eq('job_type', 'growth_mode')
      .order('created_at', { ascending: false })
      .limit(24)
    if (error) throw error
    setJobs(data || [])
  }

  useEffect(() => {
    load().catch((error) => setMessage(error?.message || String(error)))
  }, [])

  const counts = useMemo(() => PERSONAS.reduce((acc, p) => {
    acc[p.id] = jobs.filter((job) => job.persona_id === p.id).length
    return acc
  }, {}), [jobs])

  async function queue() {
    setBusy(true)
    setMessage('Creating the creator brief…')
    setResult(null)
    try {
      const user = await readUser()
      const prompt = [
        `CREATOR: ${selected.name}`,
        `PLATFORM: ${platform}`,
        `OBJECTIVE: ${objective}`,
        `FORMAT: ${format}`,
        `REFERENCE URL: ${referenceUrl.trim() || 'None'}`,
        `DIRECTION: ${direction.trim() || 'Choose the strongest opportunity from the creator context and current public evidence.'}`,
        '',
        'Create a platform-native package for this owned creator asset.',
        'Use the creator bible as hard identity context.',
        'Return actionable content, not generic advice.',
        'Include: opportunity, concept, hook options, opening beat, outline, shot list, spoken lines where appropriate, caption, CTA, visual direction, repurposing plan, KPI, monetisation route, monetisation test, and next experiment.',
        'For TikTok Shop or Affiliate: make the content useful first, then integrate the product or offer naturally. Do not invent product claims, commissions or results.',
        'For Fanvue: keep ideas appropriate to the owned creator asset, specific and monetisation-aware. Do not invent audience behaviour or revenue.',
        'For YouTube: build a strong standalone concept and include a short-form derivative plan.',
        'For TikTok and Instagram: prioritise first-frame behaviour, retention, native pacing and repeatability.',
        'Use only claims supported by supplied context or current public research.',
      ].join('\n')

      const { data, error } = await supabase.from('local_ai_jobs').insert({
        owner_id: user.id,
        title: `${selected.name} · ${platform} · ${format}`,
        job_type: 'growth_mode',
        model: 'mlx-community/Qwen3-8B-4bit',
        persona_id: persona,
        system_prompt: 'You are Cornerstone Track B creator growth director. Preserve the selected creator identity and platform context. Use current public evidence when available. Build practical content and monetisation experiments. Never invent metrics, audience reactions, product facts or revenue. Return operator-useful JSON.',
        user_prompt: prompt,
        options: {
          research: true,
          max_tokens: 6500,
          temperature: 0.48,
          research_domain: 'TRACK_B_CREATOR_GROWTH',
          workspace_id: 'track_b',
          creator_id: persona,
          platform,
          objective,
          format,
          reference_url: referenceUrl.trim() || null,
          monetisation: platform === 'TikTok Shop' ? 'shop' : platform === 'Affiliate' ? 'affiliate' : platform === 'Fanvue' ? 'fanvue' : null,
        },
        status: 'queued',
        production_status: 'creator_package_queued',
      }).select('id').single()
      if (error || !data?.id) throw error || new Error('Could not queue creator package.')

      const job = await waitJob(data.id, setMessage)
      let parsed = job.result
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed) } catch { parsed = { raw: parsed } }
      }
      setResult(parsed)
      setMessage('Creator package ready.')
      await load()
    } catch (error) {
      setMessage(error?.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="voices">
      <style>{`
        .voices{color:var(--text);font-family:var(--sans)}
        .v-head{display:flex;justify-content:space-between;gap:30px;align-items:flex-end;padding:8px 0 30px;border-bottom:1px solid var(--border)}
        .v-eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
        .v-title{margin:8px 0 0;font-size:clamp(38px,5.5vw,68px);line-height:.98;letter-spacing:-.06em;max-width:820px}
        .v-copy{margin:10px 0 0;max-width:720px;color:var(--text-muted);font-size:14px;line-height:1.6}
        .v-roster{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px}
        .v-person{position:relative;min-height:180px;padding:20px;border:1px solid var(--border);border-radius:16px;background:var(--surface);text-align:left;cursor:pointer;overflow:hidden;color:var(--text)}
        .v-person:before{content:"";position:absolute;left:0;top:0;width:100%;height:4px;background:var(--border-strong)}
        .v-person.active{border-color:var(--accent)}.v-person.active:before{background:var(--accent)}
        .v-number{font-size:9px;color:var(--text-subtle);letter-spacing:.12em}.v-name{margin-top:26px;font-size:31px;font-weight:800;letter-spacing:-.05em}
        .v-tag{margin-top:5px;display:inline-block;padding:5px 8px;border-radius:999px;background:var(--surface-2);font-size:9px;color:var(--text-muted)}
        .v-tone{margin-top:14px;color:var(--text-muted);font-size:10px}.v-count{position:absolute;right:18px;bottom:17px;font-size:9px;color:var(--text-subtle)}
        .v-studio{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;margin-top:16px}.v-card{padding:22px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}
        .v-card h2{margin:7px 0 0;font-size:25px;letter-spacing:-.04em}.v-label{font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--text-subtle)}
        .v-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.v-field{display:grid;gap:7px}.v-field.full{grid-column:1/-1}
        .v-field label{font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--text-subtle)}
        .v-field select,.v-field input,.v-field textarea{width:100%;padding:12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--panel-2);color:var(--text);font:inherit;font-size:11px}
        .v-field textarea{min-height:120px;resize:vertical;line-height:1.5}.v-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:15px}
        .v-btn{min-height:46px;padding:0 16px;border:0;border-radius:10px;background:var(--accent);color:#1a0f0c;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.v-btn:disabled{opacity:.45}.v-btn.ghost{background:transparent;border:1px solid var(--line-2);color:var(--text)}
        .v-preview{background:var(--panel-2)}.v-preview h3{margin:8px 0 0;font-size:32px;letter-spacing:-.05em}.v-preview p{margin-top:10px;color:var(--text-2);font-size:11px;line-height:1.65}
        .v-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:18px}.v-chip{padding:6px 8px;border:1px solid var(--border);background:var(--surface);border-radius:999px;font-size:9px;color:var(--text-muted)}
        .v-result{margin-top:16px;padding:18px;border:1px solid var(--accent-line);border-radius:16px;background:var(--accent-soft)}.v-result h3{margin:6px 0 0;font-size:22px}.v-result p{margin:8px 0 0;color:var(--text-2);font-size:12px;line-height:1.55}.v-result pre{margin:12px 0 0;white-space:pre-wrap;max-height:360px;overflow:auto;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text-2)}
        .v-message{margin-top:10px;color:var(--text-muted);font-size:10px}.v-history{margin-top:18px;padding-top:20px;border-top:1px solid var(--border)}.v-history-head{display:flex;justify-content:space-between}.v-history-head strong{font-size:13px}.v-history-head span{font-size:9px;color:var(--text-subtle)}
        .v-jobs{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px}.v-job{padding:13px;border:1px solid var(--border);border-radius:11px;background:var(--surface)}.v-job strong{font-size:10px}.v-job span{display:block;margin-top:4px;color:var(--text-muted);font-size:9px}
        @media(max-width:850px){.v-roster{grid-template-columns:1fr}.v-studio{grid-template-columns:1fr}.v-fields{grid-template-columns:1fr}.v-jobs{grid-template-columns:1fr}}
      `}</style>

      <header className="v-head">
        <div>
          <div className="v-eyebrow">Voices · Creator engine</div>
          <h1 className="v-title">Give Cara and Lila an actual content business.</h1>
          <p className="v-copy">Content creation, TikTok, Instagram, YouTube, TikTok Shop, affiliates and Fanvue all live here. Choose the creator, choose what you are trying to achieve, and Cornerstone builds the experiment around the right platform.</p>
        </div>
      </header>

      <section className="v-roster">
        {PERSONAS.map((p, i) => (
          <button key={p.id} className={`v-person${persona === p.id ? ' active' : ''}`} onClick={() => setPersona(p.id)}>
            <div className="v-number">0{i + 1}</div>
            <div className="v-name">{p.name}</div>
            <span className="v-tag">{p.tag}</span>
            <div className="v-tone">{p.tone}</div>
            <div className="v-count">{counts[p.id] || 0} packages</div>
          </button>
        ))}
      </section>

      <section className="v-studio">
        <div className="v-card">
          <div className="v-label">Creator brief</div>
          <h2>What should {selected.name} test next?</h2>
          <div className="v-fields">
            <div className="v-field"><label>Platform</label><select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select></div>
            <div className="v-field"><label>Objective</label><select value={objective} onChange={(e) => setObjective(e.target.value)}>{OBJECTIVES.map((x) => <option key={x}>{x}</option>)}</select></div>
            <div className="v-field"><label>Format</label><select value={format} onChange={(e) => setFormat(e.target.value)}>{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></div>
            <div className="v-field"><label>Reference URL</label><input value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} placeholder="Optional reference, product or inspiration link" /></div>
            <div className="v-field full"><label>Direction</label><textarea value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="A thought, story, product, feeling, trend, offer, conversation or experiment worth owning…" /></div>
          </div>
          <div className="v-actions">
            <button className="v-btn" disabled={busy} onClick={queue}>{busy ? 'Building…' : 'Build creator package →'}</button>
            <button type="button" className="v-btn ghost" onClick={() => { if (typeof onAdvance === 'function') onAdvance(); else window.location.href = '/content/profiles' }}>Continue to Channels →</button>
          </div>
          {message ? <div className="v-message">{message}</div> : null}
        </div>

        <aside className="v-card v-preview">
          <div className="v-label">Selected creator</div>
          <h3>{selected.name}</h3>
          <p>{selected.tone}. Cornerstone will preserve the creator context and write for the selected platform instead of defaulting everything to YouTube.</p>
          <div className="v-chips"><span className="v-chip">{platform}</span><span className="v-chip">{objective}</span><span className="v-chip">{format}</span></div>
          <div style={{ marginTop: 18 }} className="v-label">Commercial layer</div>
          <p style={{ marginTop: 6 }}>{platform === 'TikTok Shop' ? 'Product-led content with a useful story first and a measurable shop action.' : platform === 'Affiliate' ? 'Content designed to earn the click before asking for the sale.' : platform === 'Fanvue' ? 'Owned-creator content with a clear conversion and retention test.' : 'Audience growth first, with monetisation tested where it fits the format.'}</p>
        </aside>
      </section>

      {result ? (
        <section className="v-result">
          <div className="v-label">Latest package</div>
          <h3>{result?.concept?.title || result?.title || result?.opportunity || 'Creator package ready'}</h3>
          <p>{result?.why_it_should_work || result?.opportunity || 'Cornerstone has produced a platform-native creator experiment.'}</p>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </section>
      ) : null}

      <section className="v-history">
        <div className="v-history-head"><strong>Recent creator work</strong><span>Owned creator workspace</span></div>
        <div className="v-jobs">
          {jobs.slice(0, 8).map((job) => <div className="v-job" key={job.id}><strong>{job.title}</strong><span>{job.persona_id} · {job.options?.platform || 'creator'} · {job.status} · {new Date(job.created_at).toLocaleDateString('en-GB')}</span></div>)}
          {!jobs.length ? <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 10 }}>Creator experiments will appear here.</div> : null}
        </div>
      </section>
    </main>
  )
}

export function ShopStaged() { return null }
export function MediaStaged() { return null }
export function CaptionStudioStaged() { return null }
export function LocalAIStaged() { return null }
