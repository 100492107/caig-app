import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { creatorDnaFor } from '../shared/creator-dna.js'
import EnterpriseShell from './EnterpriseShell.jsx'
import { RevenueMissionBanner } from './RevenueMission.jsx'

const FAIL = new Set(['error', 'failed', 'blocked'])
const money = (v) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number(v || 0))
const clean = (v) => String(v || '').replaceAll('_', ' ')
const num = (v) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(Number(v || 0))
const CREATOR_IMAGES = {
  cara: 'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_5.jpg',
  lila: 'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_12.jpeg',
}
const age = (v) => {
  if (!v) return 'No recent check-in'
  const s = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 1000))
  return s < 60 ? s + 's ago' : Math.round(s / 60) + 'm ago'
}

const DISMISS_KEY = 'cornerstone_command_dismissed_v1'

function loadDismissed() {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveDismissed(map) {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(map))
  } catch {}
}

async function safe(name, run, fallback) {
  try {
    const r = await run()
    if (r.error) return { data: fallback, error: { name, message: r.error.message || String(r.error) } }
    return { data: r.data ?? fallback, error: null }
  } catch (error) {
    return { data: fallback, error: { name, message: error?.message || String(error) } }
  }
}

function buildPath(state) {
  const { failed, online, commerceSetup, commerceSignals, commerceOpportunities, commerceTests, commerceProjects, commerceJobs, commercePubs, commerceEvidence, learning } = state
  const setupReady = !!commerceSetup?.tiktok_shop_ready && !!commerceSetup?.showcase_ready && !!commerceSetup?.creator_profile_url && !!commerceSetup?.tracking_destination
  const signalsReady = commerceSignals.length >= 2
  const opportunityReady = commerceOpportunities.length > 0
  const projectReady = commerceProjects.length > 0
  const makeReady = commerceJobs.some((j) => ['queued','processing','review','completed'].includes(String(j.status)))
  const qaReady = commerceJobs.some((j) => String(j.quality_status) === 'approved' && String(j.status) === 'completed')
  const publishedReady = commercePubs.some((p) => ['published','live'].includes(String(p.status)))
  const measuredReady = commerceEvidence.length > 0
  const commissionReady = commerceEvidence.some((e) => Number(e.commission || 0) > 0)
  const learningReady = learning.length > 0

  const steps = []
  if (failed.length) {
    steps.push({ id:'blocker', label:'Clear blockers', detail:failed.length+' stopped', href:'/system', cta:'Open System', done:false, hard:true, body:'Fix the constraint before spending more production effort.' })
  }
  if (online === false && !makeReady && !projectReady) {
    steps.push({ id:'intelligence', label:'Bring intelligence online', detail:'Local Qwen worker offline', href:'/system', cta:'Check System', done:false, hard:true, body:'Start the local stack. Commerce intelligence and creator strategy depend on it.' })
  }

  steps.push({ id:'setup', label:'Ready the commerce account', detail:setupReady?'Access, showcase and tracking recorded':'TikTok access + profile + tracking', href:'/commerce', cta:'Open Commerce', done:setupReady, hard:true, body:'Complete the live platform setup outside Cornerstone, then record the state in Commerce. This is the gate before the first post.' })
  steps.push({ id:'signals', label:'Capture product evidence', detail:signalsReady?commerceSignals.length+' signals':'Need 2 product / trend signals', href:'/commerce', cta:'Find products', done:signalsReady, hard:true, body:'Find candidate products with real evidence. Do not invent demand, prices, commissions or reviews.' })
  steps.push({ id:'opportunity', label:'Create Cara opportunity', detail:opportunityReady?commerceOpportunities.length+' opportunities':'No creator-commerce opportunity yet', href:'/commerce', cta:'Run intelligence', done:opportunityReady, hard:true, body:'Join product demand, research and visual signals into a specific Cara test.' })
  steps.push({ id:'creator', label:'Save the creator test', detail:projectReady?commerceProjects.length+' commercial package':'No saved commercial package', href:'/content/creators', cta:'Open Creator Engine', done:projectReady, hard:true, body:'Build Cara’s commercial concept and save it into the canonical content loop. A generation is not a job until it is saved.' })
  steps.push({ id:'make', label:'Make the first asset', detail:qaReady?'Production complete':makeReady?commerceJobs.map(j=>j.status).join(' · '):'Nothing in production', href:'/content/production', cta:'Open Make', done:qaReady, hard:true, body:'For the first commerce test, use Creator image for the fastest native path. Video modes are available when the creative needs them.' })
  steps.push({ id:'publish', label:'Put it in market', detail:publishedReady?commercePubs.length+' published':'Nothing live yet', href:'/content/publish', cta:'Open Publish', done:publishedReady, hard:true, body:'Schedule the approved asset. The current publisher hands off through the configured Make integration; the TikTok account/product link still has to be real.' })
  steps.push({ id:'measure', label:'Bring the result back', detail:measuredReady?commerceEvidence.length+' measured result':'No measured result', href:'/content/measurement', cta:'Open Learn', done:measuredReady, hard:true, body:'Record views, clicks, orders, revenue and commission from the live platform. Do not estimate missing numbers.' })
  steps.push({ id:'commission', label:'Prove the first commission', detail:commissionReady?'Commission recorded':'First tracked commission still outstanding', href:'/content/measurement', cta:'Record commission', done:commissionReady, hard:true, body:'This is the seven-day proof objective: one real transaction closing creator → content → commerce → revenue.' })
  steps.push({ id:'learn', label:'Compound the evidence', detail:learningReady?learning.length+' learning rule':'Learning appears after comparable evidence', href:'/content/measurement', cta:'Open Learn', done:learningReady && commissionReady, hard:false, body:learningReady?'Use the measured pattern to decide the next test.':'The first few results establish the baseline; let the data create the learning rule.' })

  const currentIndex = steps.findIndex((s) => !s.done)
  return { steps, current: currentIndex >= 0 ? steps[currentIndex] : null, currentIndex: currentIndex >= 0 ? currentIndex : steps.length - 1, allDone: currentIndex < 0 }
}

async function readState() {
  const [p, j, pu, e, h, l, cs, co, ctest, csetup] = await Promise.all([
    safe('projects', () => supabase.from('track_b_content_projects').select('id,title,status,brief,updated_at,created_at').order('updated_at', { ascending: false }).limit(200), []),
    safe('production jobs', () => supabase.from('track_b_production_jobs').select('id,project_id,mode,status,quality_status,updated_at,created_at').order('updated_at', { ascending: false }).limit(200), []),
    safe('publications', () => supabase.from('track_b_publications').select('id,project_id,title,platform,status,scheduled_at,published_at,updated_at,created_at').order('updated_at', { ascending: false }).limit(200), []),
    safe('performance evidence', () => supabase.from('track_b_performance_evidence').select('id,title,revenue,commission,clicks,conversions,winner,publication_id,commerce_test_id,operator_note,created_at').order('created_at', { ascending: false }).limit(200), []),
    safe('local AI heartbeat', () => supabase.from('local_ai_worker_heartbeat').select('status,last_seen,current_job_type').eq('id', 'qwen').maybeSingle(), null),
    safe('learning recommendations', () => supabase.from('track_b_learning_recommendations').select('id,recommendation_type,format,invariant_pattern,confidence,status,source_evidence_id,created_at').eq('status', 'active').order('created_at', { ascending: false }).limit(20), []),
    safe('commerce signals', () => supabase.from('cornerstone_commerce_signals').select('id,title,source_platform,signal_type,price_amount,price_currency,created_at').order('created_at', { ascending: false }).limit(100), []),
    safe('commerce opportunities', () => supabase.from('cornerstone_commerce_opportunities').select('id,title,creator_id,status,signal_ids,created_at').order('created_at', { ascending: false }).limit(30), []),
    safe('commerce tests', () => supabase.from('cornerstone_commerce_tests').select('id,opportunity_id,creator_id,status,views,clicks,conversions,commission,revenue,created_at').order('created_at', { ascending: false }).limit(30), []),
    safe('commerce setup', () => supabase.from('cornerstone_commerce_setup').select('*').maybeSingle(), null),
  ])

  const warnings = [p, j, pu, e, h, l, cs, co, ctest, csetup].filter((x) => x.error).map((x) => x.error.name + ': ' + x.error.message)
  const projects = p.data || []
  const jobs = j.data || []
  const pubs = pu.data || []
  const evidence = e.data || []
  const learning = l.data || []
  const commerceSignals = cs.data || []
  const commerceOpportunities = co.data || []
  const commerceTests = ctest.data || []
  const commerceSetup = csetup.data || null
  const hb = h.data || {}

  const heartbeatKnown = !h.error
  const online = heartbeatKnown ? Boolean(hb.last_seen && Date.now() - new Date(hb.last_seen).getTime() < 90000 && String(hb.status || '').toLowerCase() !== 'offline') : null
  const failed = [...jobs.filter((x) => FAIL.has(String(x.status))), ...pubs.filter((x) => FAIL.has(String(x.status)))]
  const commerceProjectIds = new Set(projects.filter((p) => p.brief?.commerce_context || p.brief?.commerce_test_id).map((p) => p.id))
  const commerceProjects = projects.filter((p) => commerceProjectIds.has(p.id))
  const commerceJobs = jobs.filter((j) => commerceProjectIds.has(j.project_id))
  const commercePubs = pubs.filter((p) => commerceProjectIds.has(p.project_id))
  const commerceTestIds = new Set(commerceTests.map((t) => t.id))
  const commerceEvidence = evidence.filter((e) => (e.commerce_test_id && commerceTestIds.has(e.commerce_test_id)) || commerceProjectIds.has(pubs.find((p) => p.id === e.publication_id)?.project_id))

  const revenue = evidence.reduce((n, x) => n + Number(x.revenue || 0), 0)
  const commission = evidence.reduce((n, x) => n + Number(x.commission || 0), 0)
  const published = pubs.filter((x) => ['published', 'live'].includes(String(x.status)))
  const path = buildPath({ failed, online, commerceSetup, commerceSignals, commerceOpportunities, commerceTests, commerceProjects, commerceJobs, commercePubs, commerceEvidence, learning })

  const recent = [
    ...evidence.map((x) => ({ kind: x.winner ? 'Winner' : 'Result', title: x.title || 'Performance result', when: x.created_at, href: '/content/measurement' })),
    ...pubs.map((x) => ({ kind: ['published', 'live'].includes(x.status) ? 'Published' : 'Scheduled', title: x.title || 'Publication', when: x.published_at || x.scheduled_at || x.updated_at, href: '/content/publish' })),
    ...commerceOpportunities.map((x) => ({ kind: 'Opportunity', title: x.title || 'Commerce opportunity', when: x.created_at, href: '/commerce' })),
  ].filter((x) => x.when).sort((a,b) => new Date(b.when) - new Date(a.when)).slice(0,5)

  return {
    revenue, commission, followers:0, subscribers:0, paidSubscribers:0,
    packages: projects.length,
    inMotion: jobs.filter((x) => ['queued','processing','review'].includes(String(x.status))).length,
    published: published.length,
    winners: evidence.filter((x) => x.winner === true).length,
    online,
    lastSeen: hb.last_seen,
    currentJob: hb.current_job_type,
    warnings,
    failed: failed.length,
    queued: jobs.filter((x) => x.status === 'queued').length,
    processing: jobs.filter((x) => x.status === 'processing').length,
    recent,
    learning,
    closedLoops: evidence.length,
    path,
    commerceSignals,
    commerceOpportunities,
    commerceTests,
    commerceSetup,
    commerceProjects,
    commerceJobs,
    commercePubs,
    commerceEvidence,
  }
}

export default function CommandHome() {
  const [s, setS] = useState(null)
  const [error, setError] = useState('')
  const [dismissed, setDismissed] = useState(loadDismissed)

  useEffect(() => {
    let live = true
    const load = () =>
      readState(dismissed)
        .then((v) => { if (live) { setS(v); setError('') } })
        .catch((e) => { if (live) setError(e?.message || String(e)) })
    load()
    const t = setInterval(load, 10000)
    return () => { live = false; clearInterval(t) }
  }, [dismissed])

  function tickSoft(stepId) {
    const next = { ...dismissed, [stepId]: true }
    setDismissed(next)
    saveDismissed(next)
  }

  const x = s || {
    revenue: 0, commission: 0, followers: 0, subscribers: 0, paidSubscribers: 0, packages: 0, inMotion: 0, published: 0, winners: 0,
    online: null, lastSeen: null, currentJob: null, warnings: [], failed: 0, queued: 0, processing: 0, recent: [], learning: [], closedLoops: 0, commerceSignals: [], commerceOpportunities: [], commerceTests: [], commerceSetup: null, commerceProjects: [], commerceJobs: [], commercePubs: [], commerceEvidence: [],
    path: {
      steps: [],
      current: { id: 'loading', label: 'Reading operating state…', detail: 'One moment', href: '/', cta: 'Wait', done: false, body: 'Cornerstone is checking blockers, research, production and results.' },
      currentIndex: 0, allDone: false,
    },
  }

  const path = x.path
  const current = path.current
  const doneCount = path.steps.filter((st) => st.done).length
  const total = path.steps.length || 1
  const pct = Math.round((doneCount / total) * 100)
  const cara = creatorDnaFor('cara')
  const lila = creatorDnaFor('lila')

  return (
    <EnterpriseShell active="command" eyebrow="Command">
      <main className="home cmd-today">
        <RevenueMissionBanner />

        <header className="cmd-today-head">
          <div>
            <div className="k">Today · revenue-first operating path</div>
            <h1>{path.allDone ? 'Loop proven. Compound the evidence.' : 'Make the first money.'}</h1>
            <p>One current objective: get the first tracked commission, then repeat the mechanisms that produce real commercial behaviour. Cornerstone is now organised around the live revenue loop, not feature collection.</p>
            <div className="presence">
              <i className={'dot' + (x.online === false ? ' off' : '')} />
              {x.online === null ? 'Intelligence status unavailable' : x.online ? 'Intelligence ready' : 'Intelligence offline'}{' '}
              · {age(x.lastSeen)}
              {x.currentJob ? ' · ' + clean(x.currentJob) : ''}
            </div>
          </div>
          <div className="cmd-progress-card">
            <div className="cmd-progress-meta">
              <span>{doneCount} of {total} steps</span>
              <b>{pct}%</b>
            </div>
            <div className="cmd-progress-bar"><i style={{ width: pct + '%' }} /></div>
            <div className="cmd-progress-stats">
              <span><b>{x.closedLoops}</b> loops</span>
              <span><b>{x.winners}</b> winners</span>
              <span><b>{money(x.revenue)}</b></span>
            </div>
          </div>
        </header>

        <section className="cmd-mission-grid">
          <article className={'cmd-mission' + (path.allDone ? ' is-clear' : '')}>
            <div className="cmd-mission-k">{path.allDone ? 'Path complete' : 'Current step only'}</div>
            <h2>{path.allDone ? 'Nothing blocking. Multiply what worked.' : current?.label}</h2>
            <p>{path.allDone ? 'Use a learning rule, run radar, or capture a new metric snapshot. Do not invent busywork.' : current?.body}</p>
            {!path.allDone && current ? (
              <div className="cmd-mission-actions">
                <a className="primary" href={current.href}>{current.cta} →</a>
                {!current.hard && !current.done ? (
                  <button type="button" className="ghost" onClick={() => tickSoft(current.id)}>Mark done for now</button>
                ) : null}
              </div>
            ) : (
              <div className="cmd-mission-actions">
                <a className="primary" href="/content/remake">Build from learning →</a>
                <a className="ghost" href="/research">Research</a>
              </div>
            )}
            {current && !path.allDone ? (
              <div className="cmd-mission-why">
                <span>Why this</span>
                <b>{current.detail}</b>
              </div>
            ) : null}
          </article>

          <aside className="cmd-path">
            <div className="cmd-path-head">
              <strong>Operating path</strong>
              <span>Tick by evidence</span>
            </div>
            <ol className="cmd-path-list">
              {path.steps.map((step, i) => {
                const isCurrent = !path.allDone && i === path.currentIndex
                const locked = !step.done && !isCurrent && i > path.currentIndex
                return (
                  <li key={step.id} className={'cmd-path-item' + (step.done ? ' is-done' : '') + (isCurrent ? ' is-current' : '') + (locked ? ' is-locked' : '')}>
                    <span className="cmd-path-mark" aria-hidden>{step.done ? '✓' : isCurrent ? '→' : String(i + 1).padStart(2, '0')}</span>
                    <div className="cmd-path-copy">
                      <strong>{step.label}</strong>
                      <span>{step.detail}</span>
                    </div>
                    {isCurrent ? <a href={step.href} className="cmd-path-go">Go</a> : step.done ? <span className="cmd-path-status">Done</span> : <span className="cmd-path-status">Next</span>}
                  </li>
                )
              })}
            </ol>
          </aside>
        </section>

        <section className="cmd-revenue-strip" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginTop:14}}>
          {[['Signals',x.commerceSignals.length,'Import real product / trend evidence'],['Opportunities',x.commerceOpportunities.length,'Create a specific creator test'],['Published',x.commercePubs.filter(p=>['published','live'].includes(String(p.status))).length,'Put an asset in market'],['Commission',money(x.commission),'First tracked money']].map(([a,b,d])=><article key={a} style={{padding:'13px 14px',border:'1px solid var(--cs-os-line)',borderRadius:12,background:'rgba(255,255,255,.012)'}}><span style={{display:'block',fontSize:9,letterSpacing:'.11em',textTransform:'uppercase',color:'var(--cs-os-subtle)',fontWeight:800}}>{a}</span><strong style={{display:'block',marginTop:5,fontSize:20,letterSpacing:'-.04em'}}>{b}</strong><small style={{display:'block',marginTop:3,color:'var(--cs-os-muted)',fontSize:9,lineHeight:1.4}}>{d}</small></article>)}
        </section>

        <section className="cs-creators cmd-creators-slim">
          <article className="cs-creator-card">
            <div className="cs-creator-avatar"><img src={CREATOR_IMAGES.cara} alt="Cara" /></div>
            <div>
              <div className="cs-command-k">Cara · BUILD</div>
              <strong>{cara?.soul || 'Agency. Earned progress.'}</strong>
            </div>
          </article>
          <article className="cs-creator-card">
            <div className="cs-creator-avatar"><img src={CREATOR_IMAGES.lila} alt="Lila" /></div>
            <div>
              <div className="cs-command-k">Lila · NOTICE</div>
              <strong>{lila?.soul || 'Presence. Quiet discernment.'}</strong>
            </div>
          </article>
        </section>

        <section className="footer cmd-footer-slim">
          <div className="foot"><b>{x.online ? 'Ready' : x.online === false ? 'Offline' : '—'}</b><span>Intelligence</span></div>
          <div className="foot"><b>{x.failed}</b><span>Blockers</span></div>
          <div className="foot"><b>{num(x.followers)}</b><span>Followers</span></div>
          <div className="foot"><b>{x.published}</b><span>In market</span></div>
        </section>

        {x.warnings?.length ? <div className="error" style={{ marginTop: 14 }}>Some data unavailable: {x.warnings.join(' · ')}</div> : null}
        {error ? <div className="error">Could not refresh Command: {error}</div> : null}
      </main>
    </EnterpriseShell>
  )
}
