import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import EnterpriseShell from './EnterpriseShell.jsx'

const FAIL = new Set(['error', 'failed', 'blocked'])
const money = (v) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number(v || 0))
const clean = (v) => String(v || '').replaceAll('_', ' ')
const num = (v) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(Number(v || 0))
const age = (v) => {
  if (!v) return 'No recent check-in'
  const s = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 1000))
  return s < 60 ? s + 's ago' : Math.round(s / 60) + 'm ago'
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
  const [p, j, pu, e, h, l, cs, co, ctest, csetup, sm] = await Promise.all([
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
    safe('Metricool social snapshots', () => supabase.from('cornerstone_metric_snapshots').select('id,platform,period_days,audience_followers,subscribers,views,reach,clicks,conversions,revenue,captured_at,source_name,verified').eq('scope','platform').like('source_name','Metricool%').order('captured_at',{ascending:false}).limit(50), []),
  ])

  const warnings = [p, j, pu, e, h, l, cs, co, ctest, csetup, sm].filter((x) => x.error).map((x) => x.error.name + ': ' + x.error.message)
  const projects = p.data || []
  const jobs = j.data || []
  const pubs = pu.data || []
  const evidence = e.data || []
  const learning = l.data || []
  const commerceSignals = cs.data || []
  const commerceOpportunities = co.data || []
  const commerceTests = ctest.data || []
  const commerceSetup = csetup.data || null
  const socialSnapshots = sm.data || []
  const metricool7d = new Map()
  socialSnapshots.filter((x) => Number(x.period_days || 0) === 7).forEach((x) => {
    if (!metricool7d.has(x.platform)) metricool7d.set(x.platform, x)
  })
  const social = [...metricool7d.values()]
  const socialFollowers = social.reduce((n, x) => n + Number(x.audience_followers || 0), 0)
  const socialViews = social.reduce((n, x) => n + Number(x.views || 0), 0)
  const socialReach = social.reduce((n, x) => n + Number(x.reach || 0), 0)
  const socialLastSync = social.reduce((latest, x) => !latest || new Date(x.captured_at) > new Date(latest) ? x.captured_at : latest, null)
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
    revenue, commission, followers:socialFollowers, subscribers:0, paidSubscribers:0,
    social, socialViews, socialReach, socialLastSync, metricoolConnected: true,
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
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    try {
      const value = await readState()
      setS(value)
      setError('')
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let live = true
    const load = async () => {
      try {
        const value = await readState()
        if (live) { setS(value); setError('') }
      } catch (e) {
        if (live) setError(e?.message || String(e))
      }
    }
    load()
    const timer = setInterval(load, 30000)
    return () => { live = false; clearInterval(timer) }
  }, [])

  const x = s || {
    revenue: null, commission: null, followers: null, social: [], socialViews: null,
    socialReach: null, socialLastSync: null, published: 0, online: null, lastSeen: null,
    currentJob: null, warnings: [], failed: 0, queued: 0, processing: 0, recent: [],
    packages: 0, inMotion: 0, winners: 0, closedLoops: 0,
  }
  const hasSocial = Array.isArray(x.social) && x.social.length > 0

  return (
    <EnterpriseShell active="command" eyebrow="Home">
      <main className="operator-home">
        <header className="operator-home-head">
          <div>
            <div className="operator-eyebrow">YOUR BUSINESS WORKSPACE</div>
            <h1>What are we moving forward today?</h1>
            <p>Use Cornerstone to bring money in, build content assets, and learn from the results. Your plans and work stay saved if Qwen stops working — use <b>Other AI</b> to continue with another model.</p>
          </div>
          <div className={'operator-ai-status ' + (x.online === true ? 'is-online' : x.online === false ? 'is-offline' : 'is-unknown')}>
            <span className="operator-status-dot" />
            <div><b>{x.online === true ? 'Local AI ready' : x.online === false ? 'Local AI not responding' : 'Local AI status unknown'}</b>
            <small>{x.online === true ? 'Qwen can take new work' : x.online === false ? 'Your work is still saved' : 'Last check: ' + age(x.lastSeen)}</small></div>
            <button onClick={refresh} disabled={refreshing}>{refreshing ? 'Checking…' : 'Refresh'}</button>
          </div>
        </header>

        <section className="operator-stats" aria-label="Current results">
          <article><span>Tracked revenue</span><strong>{x.revenue == null ? '—' : money(x.revenue)}</strong><small>Only recorded results</small></article>
          <article><span>Published posts</span><strong>{Number(x.published || 0).toLocaleString('en-GB')}</strong><small>Saved publication records</small></article>
          <article><span>Audience</span><strong>{hasSocial ? num(x.followers) : '—'}</strong><small>{hasSocial ? 'Latest connected social data' : 'Waiting for a social data sync'}</small></article>
          <article><span>Work in progress</span><strong>{Number(x.inMotion || 0).toLocaleString('en-GB')}</strong><small>{Number(x.queued || 0)} waiting · {Number(x.processing || 0)} running</small></article>
        </section>

        <section className="operator-section">
          <div className="operator-section-head">
            <div><div className="operator-eyebrow">CHOOSE YOUR NEXT TASK</div><h2>Start with the outcome you need</h2></div>
          </div>
          <div className="operator-work-grid">
            <a className="operator-work-card operator-revenue" href="/mission">
              <span className="operator-card-number">01 · INCOME</span>
              <h3>Recover revenue</h3>
              <p>Find where enquiries, conversations or sales have stalled and decide the next action.</p>
              <span className="operator-card-cta">Open revenue work <b>→</b></span>
            </a>
            <a className="operator-work-card operator-content" href="/content/remake">
              <span className="operator-card-number">02 · CONTENT</span>
              <h3>Make content</h3>
              <p>Study what works, turn the lesson into an original idea, then prepare it for production.</p>
              <span className="operator-card-cta">Start content <b>→</b></span>
            </a>
            <a className="operator-work-card operator-youtube" href="/youtube">
              <span className="operator-card-number">03 · YOUTUBE</span>
              <h3>Build a YouTube channel</h3>
              <p>Find a promising topic, test repeatable video formats, build the video, publish and learn.</p>
              <span className="operator-card-cta">Open YouTube work <b>→</b></span>
            </a>
            <a className="operator-work-card operator-ai" href="/system/ai-anywhere">
              <span className="operator-card-number">04 · BACKUP AI</span>
              <h3>Continue with another AI</h3>
              <p>Export the full business context or one saved job to Gemini, Claude, Grok or ChatGPT, then bring the answer back.</p>
              <span className="operator-card-cta">Open Other AI <b>→</b></span>
            </a>
          </div>
        </section>

        <section className="operator-how">
          <div><div className="operator-eyebrow">HOW CORNERSTONE WORKS</div><h2>One loop. No lost context.</h2>
          <p>Find evidence → decide what to do → make the work → publish or act → record the result → improve the next attempt.</p></div>
          <a href="/system/ai-anywhere">See how to switch AI without starting over <b>→</b></a>
        </section>

        <section className="operator-recent">
          <div className="operator-section-head"><div><div className="operator-eyebrow">RECENT WORK</div><h2>What has changed</h2></div></div>
          {x.recent?.length ? (
            <div className="operator-recent-list">
              {x.recent.map((item, i) => <a key={item.kind + '-' + item.title + '-' + i} href={item.href}>
                <span className="operator-recent-kind">{item.kind}</span>
                <b>{item.title}</b>
                <small>{age(item.when)}</small>
                <span aria-hidden="true">→</span>
              </a>)}
            </div>
          ) : <p className="operator-empty">Your recent jobs, posts and results will appear here as they are saved.</p>}
        </section>

        {x.warnings?.length ? <details className="operator-technical"><summary>Some information could not be loaded</summary><p>{x.warnings.join(' · ')}</p></details> : null}
        {error ? <div role="alert" className="operator-error">Home could not refresh: {error}</div> : null}
      </main>
    </EnterpriseShell>
  )
}
