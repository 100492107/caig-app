import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const PEOPLE = [
  ['cara', 'Cara', 'Direct, dry, disciplined'],
  ['lila', 'Lila', 'Warm, observant, understated'],
  ['cara_lila', 'Cara + Lila', 'Contrast, chemistry, two voices'],
]
const JOBS = [
  ['content', 'Content creation', 'Repeatable ideas, scripts, shots and series.'],
  ['tiktok_shop', 'TikTok Shop', 'Product-led creative, demos and conversion tests.'],
  ['affiliate', 'Affiliate', 'Offer-led content, trust and click-through tests.'],
  ['fanvue', 'Fanvue', 'Owned-creator positioning, cadence and conversion.'],
  ['growth', 'Audience growth', 'Hooks, formats and recurring series.'],
]
const PLATFORMS = ['TikTok', 'Instagram', 'YouTube Shorts', 'TikTok + Instagram', 'Multi-platform']
const FORMATS = ['Personal moment', 'POV / relatable', 'Quick take', 'Micro-story', 'GRWM', 'Day in the life', 'Photo slideshow', 'Reaction', 'Product-led demo', 'Story + recommendation']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitJob(id, setMessage) {
  const until = Date.now() + 45 * 60 * 1000
  while (Date.now() < until) {
    const { data, error } = await supabase.from('local_ai_jobs').select('status,result,error_message').eq('id', id).maybeSingle()
    if (error) throw error
    if (data?.status === 'completed') return data.result || '{}'
    if (data?.status === 'error') throw new Error(data.error_message || 'Creator job failed.')
    setMessage(data?.status === 'processing' ? 'Cornerstone is thinking…' : 'Creator strategy is queued…')
    await sleep(2500)
  }
  throw new Error('Creator strategy took too long. Check System.')
}

function json(raw) {
  const text = String(raw || '').replace(/```json|```/gi, '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<analysis>[\s\S]*?<\/analysis>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').trim()
  try { return JSON.parse(text) } catch {}
  const start = text.search(/[\[{]/)
  if (start < 0) throw new Error('Cornerstone returned unreadable creator output.')
  const open = text[start], close = open === '{' ? '}' : ']'
  let depth = 0, quoted = false, escaped = false
  for (let i = start; i < text.length; i += 1) {
    const c = text[i]
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue }
    if (c === '"') quoted = true
    else if (c === open) depth += 1
    else if (c === close && --depth === 0) return JSON.parse(text.slice(start, i + 1))
  }
  throw new Error('Cornerstone returned incomplete creator output.')
}

export default function CreatorEngineWorkspaceFixed() {
  const [persona, setPersona] = useState('cara')
  const [jobType, setJobType] = useState('content')
  const [platform, setPlatform] = useState('TikTok')
  const [format, setFormat] = useState('Personal moment')
  const [reference, setReference] = useState('')
  const [offer, setOffer] = useState('')
  const [direction, setDirection] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [recent, setRecent] = useState([])

  const person = PEOPLE.find((p) => p[0] === persona) || PEOPLE[0]
  const job = JOBS.find((j) => j[0] === jobType) || JOBS[0]

  async function loadRecent() {
    const { data } = await supabase.from('local_ai_jobs').select('id,title,status,created_at,persona_id,options').eq('owner_id', (await supabase.auth.getUser()).data.user?.id || '').eq('job_type', 'growth_mode').order('created_at', { ascending: false }).limit(30)
    setRecent(data || [])
  }
  useEffect(() => { loadRecent().catch((e) => setError(e?.message || String(e))) }, [])

  async function build() {
    setBusy(true); setError(''); setResult(null); setMessage('Building creator strategy…')
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth?.user) throw new Error('Please sign in again.')
      const source = reference.trim() ? `REFERENCE / SIGNAL URL: ${reference.trim()}` : 'REFERENCE / SIGNAL URL: None'
      const prompt = `CREATOR: ${person[1]}\nPERSONA_ID: ${persona}\nPLATFORM: ${platform}\nOBJECTIVE: ${job[1]}\nOBJECTIVE_DETAIL: ${job[2]}\nFORMAT: ${format}\nOFFER / PRODUCT: ${offer.trim() || 'None'}\n${source}\nOPERATOR_DIRECTION: ${direction.trim() || 'Choose the strongest current opportunity.'}\n\nYou are Cornerstone Track B Creator Growth. Protect the selected creator identity and use existing character source-of-truth context. Build useful, platform-native work rather than generic ideas.\n\nContent creation: create a repeatable series, specific concept, hook set, spoken script, shot list, scene directions, caption and derivatives.\nTikTok Shop: develop product-led content tests, demonstration structure, trust/proof moments, natural purchase timing and CTA tests. Never invent product claims, discounts, commissions, reviews or results.\nAffiliate: develop trust-first recommendation content, problem-solution fit, disclosure, click path, CTA and offer tests. Never invent commissions, prices, product facts, reviews or results.\nFanvue: develop appropriate owned-creator positioning, public-to-paid content ladder, cadence, conversion and retention ideas. Do not invent audience behaviour, subscribers or revenue.\nGrowth: develop recurring series, hook systems, audience recognition and retention loops.\n\nNever invent follower counts, views, sales, earnings, testimonials, audience reactions, private analytics or commercial facts. Separate observed evidence, public signals, inference and creative recommendation.\n\nRETURN JSON ONLY: {\"operator_brief\":{\"finding\":\"\",\"evidence_status\":\"observed|supported|mixed|inferred|insufficient\",\"evidence_quality\":\"strong|usable|weak|insufficient\",\"source_inspection\":\"not_inspected|metadata_only|transcript_or_text|media_inspected|source_plus_public_signal\",\"mechanism\":\"\",\"why\":\"\",\"recommended_subject\":\"\",\"recommended_angle\":\"\",\"next_action\":\"\",\"confidence\":\"high|medium|low\",\"limitations\":[]},\"creator_research\":[],\"creator_package\":{\"series\":\"\",\"concept\":\"\",\"titles\":[],\"hooks\":[],\"opening_beat\":\"\",\"script\":\"\",\"shot_list\":[],\"scene_directions\":[],\"visual_direction\":[],\"image_prompts\":[],\"caption\":\"\",\"cta\":\"\",\"hashtags\":[],\"short_form_variants\":[],\"platform_notes\":[],\"offer_or_product_angle\":\"\",\"conversion_path\":[],\"publication_plan\":[],\"repurposing_plan\":[],\"testing_plan\":[],\"follow_ups\":[],\"originality_plan\":[]},\"monetisation\":{\"route\":\"\",\"test\":\"\",\"success_metric\":\",\"winner_rule\":\"\"}}`
      const { data, error: insertError } = await supabase.from('local_ai_jobs').insert({
        owner_id: auth.user.id,
        title: `${person[1]} · ${job[1]} · ${platform}`,
        job_type: 'growth_mode',
        model: 'mlx-community/Qwen3-8B-4bit',
        persona_id: persona,
        system_prompt: `You are Cornerstone's creator growth director. Research domain: TRACK_B_CREATOR_GROWTH. Persona is ${persona}. Objective is ${jobType}. Platform is ${platform}. Protect creator identity and use the relevant character bible. Return evidence-grounded operator-first JSON.`,
        user_prompt: prompt,
        options: { research: true, max_tokens: 6000, temperature: 0.45, research_domain: 'TRACK_B_CREATOR_GROWTH', workspace_id: 'track_b', creator_objective: jobType, platform, format, reference_url: reference.trim() || null, offer: offer.trim() || null },
        status: 'queued',
        production_status: 'creator_strategy_queued',
      }).select('id').single()
      if (insertError || !data?.id) throw insertError || new Error('Could not queue creator strategy.')
      setResult(json(await waitJob(data.id, setMessage)))
      setMessage('Creator strategy ready.')
      await loadRecent()
    } catch (e) { setError(e?.message || String(e)); setMessage('') }
    finally { setBusy(false) }
  }

  const pack = result?.creator_package || result?.production_package || {}
  const brief = result?.operator_brief || {}
  const list = (value, limit = 10) => Array.isArray(value) ? value.slice(0, limit) : []
  const renderItem = (value) => typeof value === 'string' ? value : value?.hook || value?.title || value?.direction || value?.scene || value?.concept || JSON.stringify(value)

  return <main className="creator-engine">
    <style>{STYLE}</style>
    {!result ? <>
      <div className="ce-kicker">CREATOR BUSINESS ENGINE</div><h1>Build the girls into businesses.</h1>
      <p className="ce-lead">One operating layer for Cara and Lila across content, TikTok Shop, affiliates, Fanvue and audience growth. Choose what the work is supposed to do, then make the next experiment.</p>
      <section className="ce-roster">{PEOPLE.map((p) => <button key={p[0]} className={persona === p[0] ? 'active' : ''} onClick={() => setPersona(p[0])}><b>{p[1]}</b><span>{p[2]}</span></button>)}</section>
      <section className="ce-objectives">{JOBS.map((j) => <button key={j[0]} className={jobType === j[0] ? 'active' : ''} onClick={() => setJobType(j[0])}><b>{j[1]}</b><span>{j[2]}</span></button>)}</section>
      <section className="ce-form"><div className="ce-row"><label>Platform<select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select></label><label>Format<select value={format} onChange={(e) => setFormat(e.target.value)}>{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></label></div><label>Reference / signal URL<input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TikTok, Instagram, YouTube, product, offer or content reference" /></label>{(jobType === 'tiktok_shop' || jobType === 'affiliate') ? <label>Product / offer<input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="What product or offer are you testing?" /></label> : null}<label>What are you trying?<textarea value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Trend, product, story, content idea, offer, series, conversion problem, test…" /></label>{error ? <div className="ce-error">{error}</div> : null}<div className="ce-actions"><span>{message || `${person[1]} · ${job[1]} · ${platform}`}</span><button onClick={build} disabled={busy} className="ce-primary">{busy ? 'Building…' : 'Build creator strategy →'}</button></div></section>
      <section className="ce-recent"><b>Recent {person[1]} work</b>{recent.filter((x) => x.persona_id === persona).slice(0, 8).map((x) => <div key={x.id}><strong>{x.title}</strong><span>{x.status} · {new Date(x.created_at).toLocaleDateString('en-GB')}</span></div>)}</section>
    </> : <>
      <div className="ce-kicker">{person[1].toUpperCase()} · {job[1].toUpperCase()}</div><h1>{pack.series || brief.recommended_subject || job[1]}</h1><p className="ce-lead">{brief.recommended_angle || brief.finding || pack.concept || 'Creator experiment ready.'}</p>
      <div className="ce-grid"><article><span>What Cornerstone found</span><b>{brief.finding || 'Opportunity identified.'}</b></article><article><span>Mechanism</span><b>{brief.mechanism || 'Creator-native mechanism.'}</b></article><article><span>Next action</span><b>{brief.next_action || 'Run the first test.'}</b></article><article><span>Money route</span><b>{result?.monetisation?.route || job[1]}</b></article></div>
      {list(result?.creator_research).length ? <section className="ce-section"><span>Evidence & comparable patterns</span>{list(result.creator_research).map((x, i) => <div key={i}>{renderItem(x)}</div>)}</section> : null}
      {list(pack.titles).length ? <section className="ce-section"><span>Titles / headlines</span>{list(pack.titles, 8).map((x, i) => <div key={i}>{renderItem(x)}</div>)}</section> : null}
      {list(pack.hooks).length ? <section className="ce-section"><span>Hooks</span>{list(pack.hooks, 8).map((x, i) => <div key={i}>{renderItem(x)}</div>)}</section> : null}
      <section className="ce-two"><section className="ce-section"><span>Concept & spoken execution</span><div>{pack.concept || ''}</div><div>{pack.script || ''}</div></section><section className="ce-section"><span>Offer & conversion</span><div>{pack.offer_or_product_angle || 'No specific product/offer selected.'}</div>{list(pack.conversion_path, 6).map((x, i) => <div key={i}>{renderItem(x)}</div>)}<div>{result?.monetisation?.test || pack.testing_plan?.[0] || 'Run one measurable test.'}</div></section></section>
      {list(pack.scene_directions).length ? <section className="ce-section"><span>Scenes & visual direction</span>{list(pack.scene_directions, 10).map((x, i) => <div key={i}>{renderItem(x)}</div>)}{list(pack.visual_direction, 6).map((x, i) => <div key={`v${i}`}>{renderItem(x)}</div>)}</section> : null}
      {list(pack.testing_plan).length ? <section className="ce-section"><span>Testing plan</span>{list(pack.testing_plan, 10).map((x, i) => <div key={i}>{renderItem(x)}</div>)}</section> : null}
      {list(pack.follow_ups).length ? <section className="ce-section"><span>Next tests</span>{list(pack.follow_ups, 8).map((x, i) => <div key={i}>{renderItem(x)}</div>)}</section> : null}
      <div className="ce-actions"><button className="ce-secondary" onClick={() => setResult(null)}>New creator test</button></div>
    </>}
  </main>
}

const STYLE=`.creator-engine{color:var(--text);padding:46px 0 110px}.ce-kicker{font-size:10px;font-weight:900;letter-spacing:.18em;color:var(--accent)}.creator-engine h1{margin:10px 0 0;font-size:clamp(44px,6vw,78px);line-height:.9;letter-spacing:-.06em;max-width:12ch}.ce-lead{margin:18px 0 28px;max-width:820px;color:var(--text-2);font-size:14px;line-height:1.65}.ce-roster{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.ce-roster button,.ce-objectives button{font:inherit;text-align:left;border:1px solid var(--line);background:var(--panel);color:var(--text);cursor:pointer;border-radius:6px}.ce-roster button{padding:18px;display:grid;gap:6px}.ce-roster b{font-size:25px}.ce-roster span,.ce-objectives span{color:var(--text-3);font-size:11px;line-height:1.4}.ce-roster .active,.ce-objectives .active{border-color:var(--accent);box-shadow:inset 3px 0 0 var(--accent)}.ce-objectives{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.ce-objectives button{padding:14px;display:grid;gap:6px}.ce-objectives b{font-size:12px}.ce-form{margin-top:16px;padding:20px;border:1px solid var(--line);background:var(--panel);display:grid;gap:14px}.ce-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ce-form label{display:grid;gap:7px;color:var(--text-3);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.ce-form input,.ce-form select,.ce-form textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--line-2);border-radius:6px;background:var(--panel-2);color:var(--text);font:inherit;text-transform:none;letter-spacing:normal}.ce-form textarea{min-height:120px;resize:vertical}.ce-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--text-3);font-size:12px;flex-wrap:wrap}.ce-primary,.ce-secondary{min-height:44px;padding:0 16px;border-radius:6px;font:inherit;font-weight:800;cursor:pointer}.ce-primary{border:0;background:var(--accent);color:#1a0f0c}.ce-secondary{border:1px solid var(--line-2);background:transparent;color:var(--text)}.ce-error{color:var(--bad);font-size:12px}.ce-recent{margin-top:20px}.ce-recent>b{font-size:12px}.ce-recent>div{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line-soft);font-size:11px}.ce-recent span{color:var(--text-3)}.ce-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:24px 0 12px}.ce-grid article,.ce-section{border:1px solid var(--line);background:var(--panel);padding:18px}.ce-grid span,.ce-section>span{display:block;color:var(--text-3);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.ce-grid b{display:block;margin-top:8px;font-size:14px;line-height:1.45}.ce-section{margin-top:10px}.ce-section div{padding:10px 0;border-bottom:1px solid var(--line-soft);font-size:12px;line-height:1.5;white-space:pre-wrap}.ce-section div:last-child{border-bottom:0}.ce-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ce-two .ce-section{margin-top:10px}@media(max-width:900px){.ce-objectives{grid-template-columns:repeat(2,1fr)}.ce-grid{grid-template-columns:repeat(2,1fr)}.ce-two{grid-template-columns:1fr}}@media(max-width:650px){.ce-roster,.ce-objectives,.ce-grid,.ce-row{grid-template-columns:1fr}.ce-recent>div{display:grid}}`
