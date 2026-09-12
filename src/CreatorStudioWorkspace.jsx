import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const CREATORS = [
  { id: 'cara', name: 'Cara', tone: 'Direct, dry, disciplined' },
  { id: 'lila', name: 'Lila', tone: 'Warm, observant, understated' },
  { id: 'cara_lila', name: 'Cara + Lila', tone: 'Contrast, chemistry, two voices' },
]
const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Fanvue', 'Multi-platform']
const OBJECTIVES = ['Content creation', 'TikTok Shop', 'Affiliate offers', 'Fanvue / subscriber content', 'Sponsorships', 'Audience growth']
const FORMATS = ['POV / relatable', 'Story / confession', 'GRWM', 'Day in the life', 'Reaction', 'Product / UGC', 'Photo carousel', 'Talking-to-camera', 'Duo interaction']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const clean = (v) => String(v ?? '').trim()

function parseJson(text) {
  const value = clean(text).replace(/```json|```/gi, '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<analysis>[\s\S]*?<\/analysis>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').replace(/<\|im_end\|>|<\|endoftext\|>/gi, '').trim()
  try { return JSON.parse(value) } catch {}
  const start = value.search(/[\[{]/)
  if (start < 0) throw new Error('Cornerstone could not understand the creator package.')
  const open = value[start]; const close = open === '{' ? '}' : ']'
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

async function jobStatus(id) {
  const r = await fetch(`/api/queue-update?action=job_status&id=${encodeURIComponent(id)}`, { credentials: 'same-origin', cache: 'no-store' })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(body.error || 'Could not read job status.')
  return body
}
async function waitJob(id, setMessage, label) {
  const until = Date.now() + 45 * 60 * 1000; let last = ''
  while (Date.now() < until) {
    const job = await jobStatus(id)
    if (job.status !== last) { last = job.status; setMessage(job.status === 'processing' ? `${label} is working…` : `${label} is ${job.status}…`) }
    if (job.status === 'completed') return job
    if (job.status === 'error') throw new Error(job.error_message || `${label} failed.`)
    await sleep(2500)
  }
  throw new Error(`${label} took too long. Check System.`)
}
function validSource(raw) {
  if (!raw.trim()) return null
  let url; try { url = new URL(raw.trim()) } catch { throw new Error('Reference URL is not valid.') }
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'tiktok.com', 'instagram.com'].includes(host)) throw new Error('Use a public YouTube, TikTok or Instagram reference.')
  return url.toString()
}

export default function CreatorStudioWorkspace() {
  const [creator, setCreator] = useState('cara')
  const [platform, setPlatform] = useState('TikTok')
  const [objective, setObjective] = useState('Content creation')
  const [format, setFormat] = useState('POV / relatable')
  const [direction, setDirection] = useState('')
  const [url, setUrl] = useState('')
  const [learning, setLearning] = useState(null)
  const [history, setHistory] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [saved, setSaved] = useState(false)

  const person = CREATORS.find((x) => x.id === creator) || CREATORS[0]
  const packageData = result?.production_package || result || {}
  const concepts = useMemo(() => packageData.concepts || packageData.content_ideas || packageData.ideas || [], [packageData])
  const hooks = useMemo(() => packageData.hooks || packageData.hook_options || [], [packageData])
  const monetisation = useMemo(() => packageData.monetisation_tests || packageData.monetization_tests || packageData.monetisation || [], [packageData])

  useEffect(() => {
    let alive = true
    Promise.all([
      supabase.from('track_b_learning_recommendations').select('id,creator_id,format,invariant_pattern,confidence,source_evidence_id').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('local_ai_jobs').select('id,title,status,created_at,persona_id,job_type').eq('job_type', 'growth_mode').order('created_at', { ascending: false }).limit(12),
    ]).then(([learn, recent]) => { if (!alive) return; setLearning(learn?.data || null); setHistory(recent?.data || []) })
    return () => { alive = false }
  }, [])

  async function run() {
    setError(''); setResult(null); setSaved(false)
    if (!url.trim() && !direction.trim()) return setError('Give Cornerstone a trend, product, idea or reference to work from.')
    setBusy(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData?.user) throw new Error('Please sign in again.')
      let sourceEvidence = null
      const sourceUrl = validSource(url)
      if (sourceUrl) {
        setMessage('Acquiring the reference…')
        const { data: queued, error: queueError } = await supabase.from('local_ai_jobs').insert({
          owner_id: authData.user.id, title: `Creator source · ${person.name} · ${platform}`, job_type: 'creator_source_ingestion', model: 'mlx-community/Qwen3-8B-4bit', persona_id: creator,
          system_prompt: 'Acquire one public creator reference for local evidence inspection. Never claim inspection before transcript and visual analysis complete.',
          user_prompt: `Acquire and inspect this public creator reference: ${sourceUrl}`,
          options: { source_url: sourceUrl, original_url: sourceUrl, research_domain: 'TRACK_B_CREATOR_GROWTH', workspace_id: 'track_b', creator_platform: platform }, status: 'queued', production_status: 'creator_source_queued',
        }).select('id').single()
        if (queueError || !queued?.id) throw queueError || new Error('Could not queue the creator reference.')
        const acquired = await waitJob(queued.id, setMessage, 'Reference acquisition'); const acquiredData = parseJson(acquired.result || '{}')
        if (!acquiredData.media_job_id) throw new Error('Reference downloaded without creating its inspection job.')
        const media = await waitJob(acquiredData.media_job_id, setMessage, 'Reference inspection'); const mediaData = parseJson(media.result || '{}')
        if (!mediaData.text_analysis_job_id) throw new Error('Reference inspection completed without creator analysis.')
        const analysed = await waitJob(mediaData.text_analysis_job_id, setMessage, 'Reference intelligence')
        sourceEvidence = { acquisition: acquiredData, inspection: mediaData, analysis: parseJson(analysed.result || '{}') }
      }

      setMessage('Building the next creator move…')
      const learningText = learning ? `\nLATEST MEASURED LEARNING SIGNAL (direction only):\n${JSON.stringify(learning)}\nUse it to shape this experiment, not to copy previous work.` : ''
      const prompt = `CREATOR: ${person.name}\nPERSONA_ID: ${creator}\nCREATOR TONE: ${person.tone}\nPLATFORM: ${platform}\nOBJECTIVE: ${objective}\nFORMAT: ${format}\nDIRECTION: ${direction || 'Choose the strongest evidence-backed opportunity.'}${learningText}\n${sourceEvidence ? `\nINSPECTED REFERENCE EVIDENCE:\n${JSON.stringify(sourceEvidence)}` : ''}\n\nBuild an operating package for this owned creator. Protect creator identity and any character or relationship bible. Make the output platform-native and commercially useful. Return JSON with operator_brief, concepts (8 ranked), hooks (5), production_directions (3), captions_or_talking_points, cta_options, test_plan_7_day, metrics_to_watch, monetisation_tests and next_action. For TikTok Shop, make product-led content experiments. For Affiliate offers, make audience-fit offer and tracked conversion experiments. For Fanvue / subscriber content, keep it appropriate to the owned creator asset and focus on value, retention and conversion. Do not promise earnings or invent performance data. Keep source evidence, public research, inference and recommendations separate.`

      const { data: created, error: createError } = await supabase.from('local_ai_jobs').insert({
        owner_id: authData.user.id, title: `Creator strategy · ${person.name} · ${objective}`, job_type: 'growth_mode', model: 'mlx-community/Qwen3-8B-4bit', persona_id: creator,
        system_prompt: 'You are Cornerstone creator strategy director. Build specific, platform-native, evidence-grounded creator content and monetisation systems. Protect creator identity. Never invent analytics or promise income. JSON only.',
        user_prompt: prompt,
        options: { research: true, max_tokens: 6500, temperature: 0.45, research_domain: 'TRACK_B_CREATOR_GROWTH', workspace_id: 'track_b', creator_platform: platform, creator_objective: objective, source_analysis: sourceEvidence }, status: 'queued', production_status: 'creator_strategy_queued',
      }).select('id').single()
      if (createError || !created?.id) throw createError || new Error('Could not queue the creator strategy.')
      const finished = await waitJob(created.id, setMessage, 'Creator strategy'); setResult(parseJson(finished.result || '{}')); setMessage('Creator package ready.')
    } catch (err) { setError(err?.message || String(err)); setMessage('') }
    finally { setBusy(false) }
  }

  async function save() {
    if (saved) return
    setBusy(true); setError(''); setMessage('Saving the creator package…')
    try {
      const bestTitle = packageData.concepts?.[0]?.title || packageData.concepts?.[0] || packageData.topic || `${person.name} · ${objective}`
      const { error: saveError } = await supabase.rpc('create_track_b_content_package', {
        p_title: clean(bestTitle) || `${person.name} · ${objective}`,
        p_source_url: url.trim() || null,
        p_source_type: url.trim() ? 'creator_reference' : 'creator_brief',
        p_brief: { creator, platform, objective, format, direction, operator_brief: result?.operator_brief || null, package: packageData, learning_recommendation: learning },
        p_source_evidence: result?.operator_brief?.evidence_points || {},
        p_platform: platform,
        p_hook: packageData.hooks?.[0] || '', p_caption: packageData.captions_or_talking_points?.[0] || packageData.caption || '',
        p_hashtags: Array.isArray(packageData.hashtags) ? packageData.hashtags.join(' ') : '', p_cta: packageData.cta_options?.[0] || '',
        p_photo_idea: packageData.production_directions?.[0] || '', p_photo_direction: JSON.stringify(packageData.production_directions || []),
        p_post_type: `${platform} · ${objective}`, p_content_queue_id: `creator-${crypto.randomUUID()}`,
      })
      if (saveError) throw saveError
      setSaved(true); setMessage('Saved. Ready for the Content Engine handoff.')
    } catch (err) { setError(err?.message || String(err)); setMessage('') }
    finally { setBusy(false) }
  }

  return <main className="creator-studio">
    <style>{`
      .creator-studio{display:grid;gap:18px;color:var(--text)} .creator-hero,.creator-card,.creator-result{border:1px solid var(--line);background:var(--panel);border-radius:14px}
      .creator-hero{padding:30px 32px;position:relative;overflow:hidden}.creator-hero:after{content:"";position:absolute;right:-70px;top:-80px;width:260px;height:260px;border:1px solid var(--accent-line);transform:rotate(45deg)}
      .creator-kicker,.creator-label{font-size:10px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:var(--accent)} .creator-hero h1{margin:10px 0 0;font-size:clamp(38px,5.5vw,72px);line-height:.92;letter-spacing:-.06em;max-width:13ch}.creator-hero p{margin:16px 0 0;max-width:760px;color:var(--text-2);font-size:14px;line-height:1.6}
      .creator-grid{display:grid;grid-template-columns:1.35fr .65fr;gap:18px}.creator-card{padding:22px}.creator-roster{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.creator-roster button{padding:14px;text-align:left;border:1px solid var(--line-2);background:var(--panel-2);color:var(--text);border-radius:8px;cursor:pointer}.creator-roster button.active{border-color:var(--accent);box-shadow:inset 3px 0 var(--accent)}.creator-roster strong{display:block;font-size:15px}.creator-roster span{display:block;margin-top:5px;color:var(--text-3);font-size:11px;line-height:1.35}
      .creator-form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}.creator-form-grid label,.creator-wide{display:grid;gap:6px}.creator-form-grid span,.creator-wide span{font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--text-3)}.creator-form-grid select,.creator-wide input,.creator-wide textarea{width:100%;border:1px solid var(--line-2);background:#0f0f0e;color:var(--text);border-radius:7px;padding:11px 12px;font:inherit;font-size:12px}.creator-wide{margin-top:12px}.creator-wide textarea{min-height:110px;resize:vertical}
      .creator-learning{margin-top:12px;padding:12px;border-left:3px solid var(--accent);background:var(--accent-soft);display:grid;gap:4px}.creator-learning span{font-size:12px;color:var(--text-2)}.creator-error{margin-top:12px;color:var(--bad);font-size:12px}.creator-actions{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--line)}.creator-actions span{font-size:11px;color:var(--text-3)}.creator-actions button{min-height:42px;padding:0 17px;border:1px solid transparent;background:var(--accent);color:#1a0f0c;border-radius:6px;font-size:12px;font-weight:800;cursor:pointer}.creator-actions button.ghost{background:transparent;color:var(--text);border-color:var(--line-2)}.creator-actions button:disabled{opacity:.45}
      .creator-side h2{margin:8px 0 0;font-size:42px;letter-spacing:-.05em}.creator-side p{color:var(--text-2);font-size:12px;line-height:1.55}.creator-lanes{display:grid;gap:7px;margin-top:18px}.creator-lanes div{padding:10px 11px;border-left:2px solid var(--line-2);font-size:11px;color:var(--text-2)}.creator-history{padding-top:18px;border-top:1px solid var(--line);margin-top:18px}.creator-history-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:9px 0;border-bottom:1px solid var(--line-soft)}.creator-history-row strong{font-size:11px}.creator-history-row span{font-size:10px;color:var(--text-3)}
      .creator-result{padding:22px}.creator-result h2{margin:8px 0 18px;font-size:32px;letter-spacing:-.04em}.creator-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.creator-result article{padding:15px;border:1px solid var(--line);background:var(--panel-2)}.creator-result article span{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}.creator-result article p{margin:7px 0 0;color:var(--text-2);font-size:12px;line-height:1.5}.creator-list{margin-top:10px;border-top:1px solid var(--line)}.creator-list div{padding:12px 0;border-bottom:1px solid var(--line-soft);font-size:12px;color:var(--text-2)}.creator-list b{display:inline-block;width:34px;color:var(--accent);font-size:10px}
      @media(max-width:850px){.creator-grid{grid-template-columns:1fr}.creator-roster,.creator-form-grid,.creator-result-grid{grid-template-columns:1fr}.creator-hero{padding:24px}.creator-card{padding:17px}.creator-actions{flex-direction:column;align-items:stretch}.creator-actions button{width:100%}}
    `}</style>
    {!result ? <>
      <section className="creator-hero"><div className="creator-kicker">CREATOR STUDIO</div><h1>Build the business around the girls, not just the platform.</h1><p>Cara and Lila now get the same intelligence loop as YouTube, but with their own voices, platforms, content formats and monetisation paths.</p></section>
      <div className="creator-grid"><section className="creator-card"><div className="creator-label">Choose the creator</div><div className="creator-roster">{CREATORS.map((x) => <button key={x.id} className={creator === x.id ? 'active' : ''} onClick={() => setCreator(x.id)}><strong>{x.name}</strong><span>{x.tone}</span></button>)}</div>{learning ? <div className="creator-learning"><strong>Learning already in play.</strong><span>{learning.invariant_pattern || learning.format || 'The latest measured signal will shape the next experiment.'}</span></div> : null}
        <div className="creator-form-grid"><label><span>Platform</span><select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select></label><label><span>Objective</span><select value={objective} onChange={(e) => setObjective(e.target.value)}>{OBJECTIVES.map((x) => <option key={x}>{x}</option>)}</select></label><label><span>Format</span><select value={format} onChange={(e) => setFormat(e.target.value)}>{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></label></div>
        <label className="creator-wide"><span>Reference content (optional)</span><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="YouTube, TikTok or Instagram reference" /></label><label className="creator-wide"><span>What should Cornerstone solve?</span><textarea value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="A trend, product, affiliate offer, content idea, Fanvue conversion problem, TikTok Shop angle, story or anything you want the girls to own…" /></label>{error ? <div className="creator-error">{error}</div> : null}<div className="creator-actions"><span>{message || `${platform} · ${objective} · ${format}`}</span><button onClick={run} disabled={busy}>{busy ? 'Building…' : 'Build creator package →'}</button></div></section>
      <aside className="creator-card creator-side"><div className="creator-label">Selected voice</div><h2>{person.name}</h2><p>{person.tone}. Every experiment is written for this creator, not a generic social account.</p><div className="creator-lanes"><div>Content creation</div><div>TikTok Shop product experiments</div><div>Affiliate offer tests</div><div>Fanvue / subscriber value + conversion</div><div>Audience growth + sponsorships</div><div>YouTube when the format suits it</div></div><section className="creator-history"><div className="creator-label">Recent creator work</div>{history.slice(0,6).map((x)=><div className="creator-history-row" key={x.id}><strong>{x.title}</strong><span>{x.persona_id} · {x.status}</span></div>)}{!history.length?<div style={{marginTop:10,color:'var(--text-3)',fontSize:11}}>Creator experiments will appear here.</div>:null}</section></aside></div>
    </> : <section className="creator-result"><div className="creator-kicker">CREATOR PACKAGE</div><h2>{packageData.topic || packageData.concepts?.[0]?.title || `${person.name} · ${objective}`}</h2><div className="creator-result-grid"><article><span>What Cornerstone found</span><p>{result?.operator_brief?.finding || packageData.why_this_fits || 'Creator opportunity built from the selected context.'}</p></article><article><span>Next action</span><p>{result?.operator_brief?.next_action || packageData.next_action || `Run the ${objective} test for ${person.name} on ${platform}.`}</p></article></div>{concepts.length?<article style={{marginTop:10}}><div className="creator-label">Concepts</div><div className="creator-list">{concepts.slice(0,8).map((x,i)=><div key={i}><b>0{i+1}</b>{typeof x==='string'?x:x?.title||x?.concept||JSON.stringify(x)}</div>)}</div></article>:null}{hooks.length?<article style={{marginTop:10}}><div className="creator-label">Hooks</div><div className="creator-list">{hooks.slice(0,5).map((x,i)=><div key={i}><b>0{i+1}</b>{typeof x==='string'?x:x?.hook||JSON.stringify(x)}</div>)}</div></article>:null}{monetisation.length?<article style={{marginTop:10}}><div className="creator-label">Monetisation tests</div><div className="creator-list">{monetisation.slice(0,6).map((x,i)=><div key={i}><b>0{i+1}</b>{typeof x==='string'?x:x?.test||x?.experiment||JSON.stringify(x)}</div>)}</div></article>:null}<div className="creator-actions"><button className="ghost" onClick={()=>setResult(null)}>Back to studio</button><button onClick={save} disabled={busy||saved}>{saved?'Saved':busy?'Saving…':'Save to Content Engine →'}</button></div>{error?<div className="creator-error">{error}</div>:null}</section>}
  </main>
}
