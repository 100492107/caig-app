import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const PERSONAS = [
  { id: 'cara', name: 'Cara', tone: 'Direct, dry, disciplined', tag: 'Sharper takes' },
  { id: 'lila', name: 'Lila', tone: 'Warm, observant, understated', tag: 'Quietly personal' },
  { id: 'cara_lila', name: 'Cara + Lila', tone: 'Contrast, chemistry, two voices', tag: 'Built for interaction' },
]
const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'TikTok Shop', 'Affiliate', 'Fanvue']
const OBJECTIVES = ['Create content', 'Grow audience', 'Test monetisation', 'Drive clicks / sales', 'Build a repeatable series']
const FORMATS = ['Personal moment', 'POV / relatable', 'Quick take', 'Micro-story', 'GRWM', 'Day in the life', 'Photo slideshow', 'Reaction', 'Product-led demo', 'Story + recommendation']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function user() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('Please sign in again.')
  return data.user
}

async function waitJob(id, setMessage) {
  const until = Date.now() + 45 * 60 * 1000
  let last = ''
  while (Date.now() < until) {
    const { data, error } = await supabase.from('local_ai_jobs').select('id,status,result,error_message').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Creator job disappeared.')
    if (data.status !== last) {
      last = data.status
      setMessage(data.status === 'processing' ? 'Cornerstone is researching and building…' : `Creator engine is ${data.status}…`)
    }
    if (data.status === 'completed') return data
    if (data.status === 'error') throw new Error(data.error_message || 'Creator package failed.')
    await sleep(2500)
  }
  throw new Error('Creator package took too long. Check System.')
}

function parse(value) {
  if (typeof value !== 'string') return value || {}
  const text = value.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json|```/gi, '').trim()
  try { return JSON.parse(text) } catch {}
  return { raw: text }
}

function list(v) {
  if (!Array.isArray(v)) return []
  return v
}

export default function CreatorGrowthWorkspace({ onAdvance } = {}) {
  const [persona, setPersona] = useState('cara')
  const [platform, setPlatform] = useState('TikTok')
  const [objective, setObjective] = useState('Create content')
  const [format, setFormat] = useState('Personal moment')
  const [direction, setDirection] = useState('')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [result, setResult] = useState(null)
  const [jobs, setJobs] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selected = PERSONAS.find((x) => x.id === persona) || PERSONAS[0]
  const packageData = result?.production_package || result?.package || result || {}
  const brief = result?.operator_brief || {}
  const titles = useMemo(() => list(packageData.titles || packageData.title_options || packageData.titleOptions), [packageData])
  const imagePrompts = useMemo(() => list(packageData.image_prompts || packageData.image_prompt_options || packageData.visual_image_prompts), [packageData])
  const content = packageData.script || packageData.content || packageData.spoken_lines || packageData.body || ''
  const caption = packageData.caption || packageData.caption_copy || packageData.social_caption || ''
  const cta = packageData.cta || packageData.call_to_action || packageData.next_action || ''
  const hashtags = packageData.hashtags || packageData.seo?.hashtags || []
  const similar = result?.creator_research || packageData.similar_accounts || packageData.comparable_accounts || packageData.competitor_research || []
  const monetisation = packageData.monetisation_test || packageData.monetisation || packageData.revenue_test || ''
  const visual = packageData.visual_direction || packageData.shot_list || packageData.visual_timeline || []

  async function load() {
    const u = await user()
    const { data, error: loadError } = await supabase.from('local_ai_jobs').select('id,title,status,created_at,persona_id,result,options').eq('owner_id', u.id).eq('job_type', 'content_engine').contains('options', { workspace_id: 'creator_growth' }).order('created_at', { ascending: false }).limit(24)
    if (loadError) throw loadError
    setJobs(data || [])
  }

  useEffect(() => { load().catch((e) => setError(e?.message || String(e))) }, [])

  const counts = useMemo(() => PERSONAS.reduce((acc, p) => { acc[p.id] = jobs.filter((j) => j.persona_id === p.id).length; return acc }, {}), [jobs])

  async function build() {
    setBusy(true); setError(''); setMessage('Starting creator intelligence…'); setResult(null)
    try {
      const u = await user()
      const prompt = [
        `CREATOR: ${selected.name}`,
        `PLATFORM: ${platform}`,
        `OBJECTIVE: ${objective}`,
        `FORMAT: ${format}`,
        `REFERENCE URL: ${referenceUrl.trim() || 'None'}`,
        `DIRECTION: ${direction.trim() || 'Choose the strongest evidence-backed opportunity for this creator.'}`,
        '',
        'This is a complete creator-business job, not a generic idea request.',
        'Use the selected creator bible as hard identity context.',
        'Use current public research for similar creators/accounts, formats and audience behaviour where evidence exists. Never invent follower counts, views, sales, audience reactions, account names or income.',
        'RESEARCH REQUIREMENT: identify the most relevant comparable public creator/content patterns returned by current research, explain what they are doing that is useful, and distinguish evidence from inference. Include source URLs where available.',
        'CONTENT REQUIREMENT: give a complete publishable package. The human output must contain a concrete idea, title/headline, hook, actual content/script/spoken lines where appropriate, visual direction, caption, CTA, hashtags and a platform-specific posting plan.',
        'IMAGE REQUIREMENT: for Cara, Lila or the duo, include practical JSON image-generation prompts for each needed image/scene. Prompts must preserve the creator identity supplied by the character source, specify framing, environment, wardrobe, mood and composition, and must be original. Do not output image prompts alone. They are one production layer inside the complete package.',
        'TIKTOK SHOP: if selected, build useful product-led content, product placement beats, compliant claims only, CTA, product demo structure and a measurable click/cart/purchase test. Do not invent product facts.',
        'AFFILIATE: if selected, build content that earns attention first, then a natural recommendation, disclosure/CTA placement and a measurable click/conversion test. Do not invent commissions or earnings.',
        'FANVUE: if selected, build safe creator-appropriate teaser/content packaging, retention hooks, caption, CTA and a measurable conversion test. Do not invent audience behaviour or revenue.',
        'YOUTUBE: if selected, build a standalone video concept with title, hook, script/outline and Shorts derivatives.',
        'TIKTOK / INSTAGRAM: optimise the first frame, first spoken line, pacing, retention loop, caption and repeatability.',
        'Return operator-first JSON with these top-level objects: operator_brief, creator_research, production_package.',
        'operator_brief must explain: what was found, evidence status, evidence quality, source inspection, mechanism, why it matters, recommended subject, recommended angle, next action, confidence and limitations.',
        'creator_research should contain: comparable accounts/patterns, platform, observable signal, useful mechanism, what to adapt, what to ignore, and source URL when available.',
        'production_package should contain: idea, titles, hook, script/content, visual direction, shot list, image_prompts, caption, CTA, hashtags, publication plan, monetisation route, monetisation_test, KPI, winner_rule, follow_up_ideas and originality_plan.',
      ].join('\n')

      const { data, error: insertError } = await supabase.from('local_ai_jobs').insert({
        owner_id: u.id,
        title: `${selected.name} · ${platform} · ${format}`,
        job_type: 'content_engine',
        model: 'mlx-community/Qwen3-8B-4bit',
        persona_id: persona,
        system_prompt: 'You are Cornerstone Track B creator-business director. Protect creator identity. Use current public creator research. Build complete publishable work plus monetisation experiments. Human usefulness matters more than JSON volume. Never invent metrics or commercial claims. Return operator-first JSON.',
        user_prompt: prompt,
        options: {
          research: true,
          max_tokens: 6500,
          temperature: 0.42,
          research_domain: 'TRACK_B_CREATOR_GROWTH',
          workspace_id: 'creator_growth',
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
      if (insertError || !data?.id) throw insertError || new Error('Could not queue creator package.')

      const job = await waitJob(data.id, setMessage)
      setResult(parse(job.result))
      setMessage('Creator package ready.')
      await load()
    } catch (e) {
      setError(e?.message || String(e)); setMessage('')
    } finally { setBusy(false) }
  }

  return <main className="creator-engine">
    <style>{`
      .creator-engine{color:var(--text)}
      .ce-head{display:flex;justify-content:space-between;gap:30px;align-items:flex-end;padding:8px 0 28px;border-bottom:1px solid var(--border)}
      .ce-kicker{font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
      .ce-title{margin:8px 0 0;font-size:clamp(40px,5.5vw,70px);line-height:.93;letter-spacing:-.06em;max-width:780px}
      .ce-copy{margin:12px 0 0;max-width:760px;color:var(--text-muted);font-size:14px;line-height:1.6}
      .ce-people{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}
      .ce-person{position:relative;min-height:150px;padding:18px;border:1px solid var(--border);border-radius:14px;background:var(--surface);text-align:left;color:var(--text);cursor:pointer}.ce-person.active{border-color:var(--accent)}
      .ce-person:before{content:"";position:absolute;left:0;top:0;width:100%;height:3px;background:var(--border-strong)}.ce-person.active:before{background:var(--accent)}
      .ce-num{font-size:9px;color:var(--text-subtle);letter-spacing:.12em}.ce-name{margin-top:25px;font-size:29px;font-weight:850;letter-spacing:-.05em}.ce-tag{display:inline-block;margin-top:6px;font-size:9px;color:var(--text-muted);padding:5px 8px;background:var(--surface-2);border-radius:999px}.ce-tone{margin-top:10px;color:var(--text-muted);font-size:10px}
      .ce-work{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;margin-top:14px}.ce-card{padding:20px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}
      .ce-label{font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:var(--text-subtle)}.ce-card h2{margin:7px 0 0;font-size:25px;letter-spacing:-.04em}
      .ce-fields{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:16px}.ce-field{display:grid;gap:6px}.ce-field.full{grid-column:1/-1}.ce-field label{font-size:9px;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:var(--text-subtle)}
      .ce-field input,.ce-field select,.ce-field textarea{width:100%;padding:11px 12px;border:1px solid var(--border-strong);border-radius:8px;background:var(--panel-2);color:var(--text);font:inherit;font-size:11px}.ce-field textarea{min-height:110px;resize:vertical;line-height:1.5}
      .ce-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:14px}.ce-btn{min-height:44px;padding:0 15px;border:0;border-radius:8px;background:var(--accent);color:#1a0f0c;font-size:11px;font-weight:900;cursor:pointer}.ce-btn:disabled{opacity:.45}.ce-btn.alt{background:transparent;border:1px solid var(--line-2);color:var(--text)}
      .ce-preview{background:var(--panel-2)}.ce-preview h3{margin:8px 0 0;font-size:30px;letter-spacing:-.05em}.ce-preview p{margin-top:9px;color:var(--text-2);font-size:11px;line-height:1.65}.ce-chiprow{display:flex;flex-wrap:wrap;gap:6px;margin-top:16px}.ce-chip{padding:5px 8px;border-radius:999px;border:1px solid var(--border);background:var(--surface);font-size:9px;color:var(--text-muted)}
      .ce-result{margin-top:14px;display:grid;gap:12px}.ce-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ce-result-card{padding:17px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.ce-result-card h3{margin-top:6px;font-size:17px;letter-spacing:-.03em}.ce-result-card p{margin-top:8px;color:var(--text-2);font-size:12px;line-height:1.55;white-space:pre-wrap}
      .ce-list{display:grid;gap:7px;margin-top:10px}.ce-item{padding:10px 11px;border-left:2px solid var(--accent);background:var(--panel-2);font-size:11px;line-height:1.45}.ce-item pre{margin:0;white-space:pre-wrap;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text-2)}
      .ce-research{display:grid;gap:8px;margin-top:10px}.ce-research-item{padding:11px 12px;border:1px solid var(--border);background:var(--panel-2);border-radius:9px}.ce-research-item strong{font-size:11px}.ce-research-item span{display:block;margin-top:4px;color:var(--text-3);font-size:10px;line-height:1.4}
      .ce-status{margin-top:9px;color:var(--text-muted);font-size:10px}.ce-error{margin-top:10px;color:var(--bad);font-size:11px}
      .ce-history{margin-top:18px;padding-top:18px;border-top:1px solid var(--border)}.ce-jobs{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:10px}.ce-job{padding:11px;border:1px solid var(--border);border-radius:9px;background:var(--surface)}.ce-job strong{font-size:10px}.ce-job span{display:block;margin-top:4px;color:var(--text-muted);font-size:9px}
      @media(max-width:900px){.ce-work,.ce-result-grid{grid-template-columns:1fr}.ce-people{grid-template-columns:1fr}.ce-fields{grid-template-columns:1fr}.ce-field.full{grid-column:auto}.ce-jobs{grid-template-columns:1fr}}
    `}</style>

    <header className="ce-head"><div><div className="ce-kicker">Creator engine</div><h1 className="ce-title">Build Cara and Lila into real content businesses.</h1><p className="ce-copy">Research the market, study similar public creators, choose the platform, make the content, generate the image prompts, write the caption, test monetisation and learn what to do next. YouTube is one destination, not the whole engine.</p></div></header>

    <section className="ce-people">{PERSONAS.map((p, i) => <button key={p.id} className={`ce-person${persona === p.id ? ' active' : ''}`} onClick={() => setPersona(p.id)}><div className="ce-num">0{i + 1}</div><div className="ce-name">{p.name}</div><span className="ce-tag">{p.tag}</span><div className="ce-tone">{p.tone} · {counts[p.id] || 0} packages</div></button>)}</section>

    {!result ? <section className="ce-work"><div className="ce-card"><div className="ce-label">Creator brief</div><h2>What should {selected.name} test next?</h2><div className="ce-fields"><div className="ce-field"><label>Platform</label><select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select></div><div className="ce-field"><label>Objective</label><select value={objective} onChange={(e) => setObjective(e.target.value)}>{OBJECTIVES.map((x) => <option key={x}>{x}</option>)}</select></div><div className="ce-field"><label>Format</label><select value={format} onChange={(e) => setFormat(e.target.value)}>{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></div><div className="ce-field"><label>Reference / product / account</label><input value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} placeholder="Optional URL" /></div><div className="ce-field full"><label>Direction</label><textarea value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="A trend, product, story, feeling, format, affiliate idea or series you want Cornerstone to explore…" /></div></div><div className="ce-actions"><button className="ce-btn" disabled={busy} onClick={build}>{busy ? 'Researching…' : 'Research & build package →'}</button><button className="ce-btn alt" onClick={() => { if (typeof onAdvance === 'function') onAdvance(); else window.location.href = '/content/profiles' }}>Continue to Channels →</button></div>{message ? <div className="ce-status">{message}</div> : null}{error ? <div className="ce-error">{error}</div> : null}</div><aside className="ce-card ce-preview"><div className="ce-label">Selected creator</div><h3>{selected.name}</h3><p>{selected.tone}. Cornerstone will load the relevant character source, research the selected platform and build the package around the creator rather than around a generic content template.</p><div className="ce-chiprow"><span className="ce-chip">{platform}</span><span className="ce-chip">{objective}</span><span className="ce-chip">{format}</span><span className="ce-chip">Public research</span><span className="ce-chip">Monetisation test</span><span className="ce-chip">Image prompts</span></div></aside></section> : <section className="ce-result"><div className="ce-result-card"><div className="ce-label">What Cornerstone found</div><h3>{brief.recommended_subject || packageData.idea || packageData.concept || 'Creator opportunity'}</h3><p>{brief.finding || packageData.why_it_should_work || packageData.why_this_should_work || packageData.angle || 'The package below is grounded in current creator research and the selected creator context.'}</p></div><div className="ce-result-grid"><div className="ce-result-card"><div className="ce-label">Why it matters</div><p>{brief.why || packageData.why_it_should_work || packageData.mechanism || ''}</p></div><div className="ce-result-card"><div className="ce-label">Next action</div><p>{brief.next_action || packageData.next_action || 'Make the first test and record the result.'}</p></div></div>{similar.length ? <div className="ce-result-card"><div className="ce-label">Similar creators / public patterns</div><div className="ce-research">{similar.slice(0,8).map((x,i)=><div className="ce-research-item" key={i}><strong>{typeof x === 'string' ? x : x?.account || x?.creator || x?.name || x?.title || 'Public pattern'}</strong><span>{typeof x === 'string' ? '' : x?.signal || x?.mechanism || x?.what_to_adapt || x?.observation || JSON.stringify(x)}</span></div>)}</div></div> : null}<div className="ce-result-card"><div className="ce-label">Titles / hooks</div><div className="ce-list">{titles.slice(0,10).map((x,i)=><div className="ce-item" key={i}>{typeof x === 'string' ? x : x?.title || x?.hook || JSON.stringify(x)}</div>)}</div></div>{content ? <div className="ce-result-card"><div className="ce-label">Actual content / script</div><p>{typeof content === 'string' ? content : JSON.stringify(content,null,2)}</p></div> : null}<div className="ce-result-grid"><div className="ce-result-card"><div className="ce-label">Caption</div><p>{typeof caption === 'string' ? caption : JSON.stringify(caption,null,2)}</p>{hashtags.length ? <p>{Array.isArray(hashtags) ? hashtags.join(' ') : hashtags}</p> : null}<p>{cta}</p></div><div className="ce-result-card"><div className="ce-label">Visual direction</div><div className="ce-list">{visual.slice(0,10).map((x,i)=><div className="ce-item" key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</div>)}</div></div></div>{imagePrompts.length ? <div className="ce-result-card"><div className="ce-label">Image prompts · JSON ready</div><div className="ce-list">{imagePrompts.slice(0,12).map((x,i)=><div className="ce-item" key={i}><pre>{JSON.stringify(x,null,2)}</pre></div>)}</div></div> : null}<div className="ce-result-grid"><div className="ce-result-card"><div className="ce-label">Monetisation test</div><p>{typeof monetisation === 'string' ? monetisation : JSON.stringify(monetisation,null,2)}</p></div><div className="ce-result-card"><div className="ce-label">Evidence / confidence</div><p>{brief.evidence_quality || ''}{brief.confidence ? `\n${brief.confidence}` : ''}{brief.limitations ? `\n${Array.isArray(brief.limitations) ? brief.limitations.join('\n') : brief.limitations}` : ''}</p></div></div><div className="ce-actions"><button className="ce-btn alt" onClick={() => setResult(null)}>New test</button>{typeof onAdvance === 'function' ? <button className="ce-btn" onClick={onAdvance}>Continue to Channels →</button> : null}</div>{error ? <div className="ce-error">{error}</div> : null}</section>}

    <section className="ce-history"><div className="ce-label">Recent creator packages</div><div className="ce-jobs">{jobs.slice(0,8).map((j) => <div className="ce-job" key={j.id}><strong>{j.title}</strong><span>{j.status} · {new Date(j.created_at).toLocaleDateString('en-GB')}</span></div>)}{!jobs.length ? <div className="ce-job"><span>No creator packages yet.</span></div> : null}</div></section>
  </main>
}
