import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const PERSONAS = [
  { id: 'cara', name: 'Cara', tone: 'Direct, dry, disciplined', tag: 'Sharper takes' },
  { id: 'lila', name: 'Lila', tone: 'Warm, observant, understated', tag: 'Quietly personal' },
  { id: 'cara_lila', name: 'Cara + Lila', tone: 'Contrast, chemistry, two voices', tag: 'Built for interaction' },
]

const OBJECTIVES = [
  ['content', 'Content creation', 'Build a repeatable content idea, hook, script, shots and derivative map.'],
  ['tiktok_shop', 'TikTok Shop', 'Find product-led content angles, native hooks, demonstrations, CTAs and testing ideas.'],
  ['affiliate', 'Affiliate', 'Build trust-first content around an offer, with audience fit, disclosure and conversion paths.'],
  ['fanvue', 'Fanvue', 'Build appropriate owned-creator content, positioning, conversion and retention ideas without inventing audience facts.'],
  ['growth', 'Audience growth', 'Find formats, hooks and recurring series that can build recognition and repeat viewing.'],
]

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube Shorts', 'TikTok + Instagram', 'Multi-platform']

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForJob(id, setMessage) {
  const until = Date.now() + 45 * 60 * 1000
  let last = ''
  while (Date.now() < until) {
    const { data, error } = await supabase
      .from('local_ai_jobs')
      .select('id,status,result,error_message')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    const status = data?.status || 'queued'
    if (status !== last) {
      last = status
      setMessage(status === 'processing' ? 'Cornerstone is thinking…' : status === 'completed' ? 'Creator strategy ready.' : `Creator strategy is ${status}…`)
    }
    if (status === 'completed') return data?.result || '{}'
    if (status === 'error') throw new Error(data?.error_message || 'Creator strategy failed.')
    await sleep(2500)
  }
  throw new Error('Creator strategy took too long. Check System.')
}

function parseJson(raw) {
  const value = String(raw || '')
    .replace(/```json|```/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/<\|im_end\|>|<\|endoftext\|>/gi, '')
    .trim()
  try { return JSON.parse(value) } catch {}
  const start = value.search(/[\[{]/)
  if (start < 0) throw new Error('Cornerstone returned an unreadable creator package.')
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
  throw new Error('Cornerstone returned an incomplete creator package.')
}

export default function CreatorEngineWorkspace() {
  const [persona, setPersona] = useState('cara')
  const [objective, setObjective] = useState('content')
  const [platform, setPlatform] = useState('TikTok')
  const [reference, setReference] = useState('')
  const [direction, setDirection] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [recent, setRecent] = useState([])

  const selectedPersona = PERSONAS.find((x) => x.id === persona) || PERSONAS[0]
  const selectedObjective = OBJECTIVES.find((x) => x[0] === objective) || OBJECTIVES[0]

  async function loadRecent() {
    const { data } = await supabase
      .from('local_ai_jobs')
      .select('id,title,status,created_at,persona_id,options')
      .eq('job_type', 'growth_mode')
      .order('created_at', { ascending: false })
      .limit(24)
    setRecent(data || [])
  }

  useEffect(() => { loadRecent() }, [])

  const recentForPersona = useMemo(() => recent.filter((job) => job.persona_id === persona), [recent, persona])

  async function run() {
    setBusy(true)
    setError('')
    setResult(null)
    setMessage('Building creator brief…')
    try {
      const { data: user, error: authError } = await supabase.auth.getUser()
      if (authError || !user?.user) throw new Error('Please sign in again.')

      const objectiveBlock = `OBJECTIVE: ${selectedObjective[1]}\nOBJECTIVE DESCRIPTION: ${selectedObjective[2]}`
      const sourceBlock = reference.trim() ? `REFERENCE / SIGNAL URL: ${reference.trim()}\nTreat this as a source signal. Do not claim performance facts unless the source evidence actually supports them.` : 'REFERENCE / SIGNAL URL: None'
      const prompt = `CREATOR: ${selectedPersona.name}\nPERSONA_ID: ${persona}\nPLATFORM: ${platform}\n${objectiveBlock}\n${sourceBlock}\nOPERATOR DIRECTION: ${direction.trim() || 'Choose the strongest evidenced opportunity for this creator.'}\n\nBuild a creator-native strategy package for Cornerstone Track B Creator Growth. This is not generic social media ideation. Protect the creator identity and character bible. Never invent follower counts, sales, earnings, audience reactions, customer testimonials or private analytics. Separate evidence, inference and recommendations.\n\nFor TikTok Shop, think product discovery, demonstration, native commerce hooks, proof and CTA tests. For affiliate, think problem-solution fit, trust, disclosure, content-to-click path and offer testing. For Fanvue, stay within appropriate owned-creator content strategy, positioning, content cadence, conversion and retention. For content creation, build repeatable formats and a derivative map.\n\nReturn JSON only with: {\"operator_brief\":{\"finding\":\"\",\"evidence_status\":\"observed|supported|mixed|inferred|insufficient\",\"evidence_quality\":\"strong|usable|weak|insufficient\",\"mechanism\":\"\",\"why\":\"\",\"recommended_subject\":\"\",\"recommended_angle\":\"\",\"next_action\":\"\",\"confidence\":\"high|medium|low\",\"limitations\":[]},\"creator_package\":{\"content_pillar\":\"\",\"series_name\":\"\",\"hooks\":[],\"concepts\":[],\"shot_list\":[],\"script\":\"\",\"caption\":\"\",\"cta\":\"\",\"scene_directions\":[],\"short_form_variants\":[],\"platform_notes\":[],\"offer_or_product_angle\":\"\",\"conversion_path\":[],\"testing_plan\":[],\"follow_ups\":[]},\"monetisation\":{\"route\":\"\",\"test\":\"\",\"success_metric\":\"\"}}`

      const { data: job, error: insertError } = await supabase
        .from('local_ai_jobs')
        .insert({
          owner_id: user.user.id,
          title: `${selectedPersona.name} · ${selectedObjective[1]} · ${platform}`,
          job_type: 'growth_mode',
          model: 'mlx-community/Qwen3-8B-4bit',
          persona_id: persona,
          system_prompt: `You are Cornerstone's creator growth director. Research domain: TRACK_B_CREATOR_GROWTH. Persona is ${persona}. Protect the creator identity and use the selected monetisation objective as the job boundary. Return evidence-grounded JSON.`,
          user_prompt: prompt,
          options: {
            research: true,
            max_tokens: 6000,
            temperature: 0.45,
            research_domain: 'TRACK_B_CREATOR_GROWTH',
            workspace_id: 'track_b',
            creator_objective: objective,
            platform,
            reference_url: reference.trim() || null,
          },
          status: 'queued',
          production_status: 'creator_strategy_queued',
        })
        .select('id')
        .single()
      if (insertError || !job?.id) throw insertError || new Error('Could not queue creator strategy.')
      const raw = await waitForJob(job.id, setMessage)
      setResult(parseJson(raw))
      await loadRecent()
    } catch (e) {
      setError(e?.message || String(e))
      setMessage('')
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    const pack = result.creator_package || result.production_package || result
    const brief = result.operator_brief || {}
    return (
      <main className="creator-engine">
        <div className="ce-kicker">CREATOR ENGINE</div>
        <h1>{selectedPersona.name}: {selectedObjective[1]}</h1>
        <p className="ce-lead">{brief.recommended_angle || brief.why || pack.content_pillar || 'Creator-native strategy built from the selected objective.'}</p>
        <section className="ce-grid">
          <article className="ce-card"><span>What Cornerstone found</span><strong>{brief.finding || 'A creator opportunity.'}</strong></article>
          <article className="ce-card"><span>Mechanism</span><strong>{brief.mechanism || 'A repeatable creator mechanism.'}</strong></article>
          <article className="ce-card"><span>Next action</span><strong>{brief.next_action || 'Make the first test.'}</strong></article>
          <article className="ce-card"><span>Monetisation</span><strong>{result.mon monetisation?.route || result.monetisation?.route || selectedObjective[1]}</strong></article>
        </section>
        <section className="ce-card ce-long">
          <span>Hooks</span>
          {(pack.hooks || []).slice(0, 8).map((item, i) => <div className="ce-item" key={i}>{typeof item === 'string' ? item : item?.hook || item?.title || JSON.stringify(item)}</div>)}
        </section>
        <section className="ce-card ce-long">
          <span>Concepts & scenes</span>
          {(pack.concepts || []).slice(0, 8).map((item, i) => <div className="ce-item" key={`c-${i}`}>{typeof item === 'string' ? item : JSON.stringify(item)}</div>)}
          {(pack.scene_directions || []).slice(0, 8).map((item, i) => <div className="ce-item" key={`s-${i}`}>{typeof item === 'string' ? item : item?.direction || JSON.stringify(item)}</div>)}
        </section>
        <section className="ce-card ce-long">
          <span>Testing plan</span>
          {(pack.testing_plan || []).slice(0, 8).map((item, i) => <div className="ce-item" key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</div>)}
        </section>
        <div className="ce-actions"><button onClick={() => setResult(null)} className="ce-secondary">New creator test</button></div>
      </main>
    )
  }

  return (
    <main className="creator-engine">
      <div className="ce-kicker">CREATOR ENGINE</div>
      <h1>Build the girls into businesses.</h1>
      <p className="ce-lead">Cara and Lila are not just another content preset. Choose the creator, choose what the content is supposed to do, and Cornerstone builds around the actual commercial objective.</p>
      <section className="ce-roster">
        {PERSONAS.map((p) => <button key={p.id} onClick={() => setPersona(p.id)} className={`ce-person ${persona === p.id ? 'active' : ''}`}><b>{p.name}</b><span>{p.tag}</span><small>{p.tone}</small></button>)}
      </section>
      <section className="ce-objectives">
        {OBJECTIVES.map(([id, label, description]) => <button key={id} onClick={() => setObjective(id)} className={`ce-objective ${objective === id ? 'active' : ''}`}><b>{label}</b><span>{description}</span></button>)}
      </section>
      <section className="ce-form">
        <div className="ce-row">
          <label><span>Platform</span><select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label><span>Reference / signal URL</span><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TikTok, Instagram, product or content reference" /></label>
        </div>
        <label><span>What are you trying?</span><textarea value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Product, affiliate offer, Fanvue direction, content idea, trend, series, story, test…" /></label>
        {error ? <div className="ce-error">{error}</div> : null}
        <div className="ce-actions"><div className="ce-status">{message || `${selectedPersona.name} · ${selectedObjective[1]} · ${platform}`}</div><button onClick={run} disabled={busy} className="ce-primary">{busy ? 'Building…' : 'Build creator strategy →'}</button></div>
      </section>
      <section className="ce-recent"><div className="ce-recent-head"><b>Recent {selectedPersona.name} work</b><span>{recentForPersona.length} tests</span></div>{recentForPersona.slice(0, 8).map((job) => <div className="ce-recent-row" key={job.id}><strong>{job.title}</strong><span>{job.status} · {new Date(job.created_at).toLocaleDateString('en-GB')}</span></div>)}</section>
      <style>{`
        .creator-engine{color:var(--text);padding:46px 0 110px}.ce-kicker{font-size:10px;font-weight:900;letter-spacing:.18em;color:var(--accent)}
        .creator-engine h1{margin:10px 0 0;font-size:clamp(44px,6vw,78px);line-height:.9;letter-spacing:-.06em;max-width:11ch}.ce-lead{margin:18px 0 28px;max-width:760px;color:var(--text-2);font-size:14px;line-height:1.65}
        .ce-roster{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.ce-person,.ce-objective{font:inherit;text-align:left;border:1px solid var(--line);background:var(--panel);color:var(--text);cursor:pointer;border-radius:8px}.ce-person{padding:18px;display:grid;gap:6px}.ce-person b{font-size:25px;letter-spacing:-.04em}.ce-person span{color:var(--accent);font-size:10px;text-transform:uppercase;letter-spacing:.08em}.ce-person small{color:var(--text-3);font-size:11px}.ce-person.active,.ce-objective.active{border-color:var(--accent);box-shadow:inset 3px 0 0 var(--accent)}
        .ce-objectives{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.ce-objective{padding:14px;display:grid;gap:5px}.ce-objective b{font-size:12px}.ce-objective span{font-size:10px;line-height:1.45;color:var(--text-3)}
        .ce-form{margin-top:16px;padding:20px;border:1px solid var(--line);background:var(--panel);display:grid;gap:14px}.ce-row{display:grid;grid-template-columns:.55fr 1.45fr;gap:12px}.ce-form label{display:grid;gap:6px}.ce-form label>span{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)}.ce-form input,.ce-form select,.ce-form textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--line-2);border-radius:6px;background:var(--panel-2);color:var(--text);font:inherit}.ce-form textarea{min-height:120px;resize:vertical}.ce-actions{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.ce-primary,.ce-secondary{min-height:44px;padding:0 16px;border-radius:6px;font:inherit;font-weight:800;cursor:pointer}.ce-primary{border:0;background:var(--accent);color:#1a0f0c}.ce-secondary{border:1px solid var(--line-2);background:transparent;color:var(--text)}.ce-status{font-size:12px;color:var(--text-3);flex:1}.ce-error{color:var(--bad);font-size:12px}.ce-recent{margin-top:18px}.ce-recent-head{display:flex;justify-content:space-between;margin-bottom:8px}.ce-recent-head span{color:var(--text-3);font-size:10px}.ce-recent-row{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--line-soft);font-size:11px}.ce-recent-row span{color:var(--text-3)}.ce-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:26px 0 12px}.ce-card{border:1px solid var(--line);background:var(--panel);padding:18px}.ce-card>span{display:block;color:var(--text-3);font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.ce-card strong{display:block;margin-top:8px;font-size:15px;line-height:1.45}.ce-long{margin-top:10px}.ce-item{padding:10px 0;border-bottom:1px solid var(--line-soft);font-size:12px;line-height:1.5}.ce-item:last-child{border-bottom:0}@media(max-width:900px){.ce-objectives{grid-template-columns:repeat(2,1fr)}.ce-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:650px){.ce-roster,.ce-objectives,.ce-grid,.ce-row{grid-template-columns:1fr}.ce-recent-row{display:grid}}
      `}</style>
    </main>
  )
}
