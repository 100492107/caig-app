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

function buildPath(state, dismissed) {
  const {
    failed, online, jobs, projects, pubs, evidence, learning,
    caseStudyUpdates, researchCount, metricSnapshots, caseStudyError, researchError,
  } = state

  const published = pubs.filter((x) => ['published', 'live'].includes(String(x.status)))
  const production = jobs.filter((x) =>
    ['queued', 'processing', 'review', 'in_production'].includes(String(x.status)),
  )
  const makeDone =
    jobs.some((x) => ['completed', 'review', 'in_production'].includes(String(x.status))) || pubs.length > 0
  const hasMetrics = (metricSnapshots || []).length > 0
  const hasResearch = researchCount > 0
  const hasCaseStudy = caseStudyUpdates.length > 0

  const steps = []

  if (failed.length) {
    steps.push({
      id: 'blocker',
      label: 'Clear blockers',
      detail: failed.length + ' item' + (failed.length === 1 ? '' : 's') + ' stopped',
      href: '/system',
      cta: 'Open System',
      done: false,
      hard: true,
      body: 'Fix what is broken before adding more work. Command will not advance until this is clear.',
    })
  }

  if (online === false && (jobs.some((x) => ['queued', 'processing'].includes(String(x.status))) || projects.length === 0)) {
    steps.push({
      id: 'intelligence',
      label: 'Bring intelligence online',
      detail: 'Local Qwen worker offline',
      href: '/system',
      cta: 'Check System',
      done: false,
      hard: true,
      body: 'Analysis and radar need the local worker. Start the stack, then return here.',
    })
  }

  steps.push({
    id: 'case_study',
    label: 'Baseline case study',
    detail: hasCaseStudy ? 'Week 0 recorded' : 'Record starting point',
    href: '/business/case-study',
    cta: 'Open Case Study',
    done: hasCaseStudy || Boolean(dismissed.case_study),
    hard: false,
    soft: !caseStudyError,
    body: 'Write the starting line before numbers look good. Wins, gaps, next move — one weekly record.',
  })

  steps.push({
    id: 'research',
    label: 'Capture research signals',
    detail: hasResearch ? researchCount + ' signal' + (researchCount === 1 ? '' : 's') : 'No mechanisms yet',
    href: '/research',
    cta: 'Open Research',
    done: hasResearch || Boolean(dismissed.research),
    hard: false,
    body: 'Log outliers, strip topic, keep mechanism. Or run auto radar. Build starts from evidence, not the FYP.',
  })

  steps.push({
    id: 'build',
    label: 'Build one package',
    detail: projects.length ? projects.length + ' package' + (projects.length === 1 ? '' : 's') : 'No package yet',
    href: '/content/remake',
    cta: 'Open Build',
    done: projects.length > 0,
    hard: true,
    body: 'Turn a mechanism into an original Cara/Lila package under frozen DNA.',
  })

  steps.push({
    id: 'make',
    label: 'Make the media',
    detail: makeDone ? 'Production has run' : production.length ? production.length + ' in motion' : 'Not produced yet',
    href: '/content/production',
    cta: production.length ? 'Continue production' : 'Open Make',
    done: makeDone,
    hard: true,
    body: 'Finish the work already in motion before inventing the next idea.',
  })

  steps.push({
    id: 'publish',
    label: 'Publish to market',
    detail: published.length ? published.length + ' live' : 'Nothing in market',
    href: '/content/publish',
    cta: 'Open Publish',
    done: published.length > 0,
    hard: true,
    body: 'Put one piece in front of real people. Proof starts here.',
  })

  steps.push({
    id: 'measure',
    label: 'Record the result',
    detail: evidence.length ? evidence.length + ' result' + (evidence.length === 1 ? '' : 's') : 'No measured outcome',
    href: '/content/measurement',
    cta: 'Open Learn',
    done: evidence.length > 0,
    hard: true,
    body: 'Close the loop. Views, follows, revenue — whatever you can verify. Guessing ends here.',
  })

  steps.push({
    id: 'metrics',
    label: 'Audience / money snapshot',
    detail: hasMetrics ? 'Snapshot on file' : 'No ledger snapshot',
    href: '/business/capture',
    cta: 'Capture metrics',
    done: hasMetrics || Boolean(dismissed.metrics),
    hard: false,
    body: 'Put followers, subscribers and cash evidence into the business ledger so Command is not blind.',
  })

  steps.push({
    id: 'compound',
    label: 'Compound a winner',
    detail: learning.length ? learning.length + ' learning rule' + (learning.length === 1 ? '' : 's') : 'Nothing to compound yet',
    href: '/content/remake',
    cta: 'Build from learning',
    done: learning.length > 0 && evidence.length > 0,
    hard: false,
    body: learning.length
      ? 'A measured pattern exists. Rebuild from it instead of starting from zero.'
      : 'After a measured result, learning rules appear here automatically.',
  })

  const currentIndex = steps.findIndex((s) => !s.done)
  const current = currentIndex >= 0 ? steps[currentIndex] : null
  const allDone = currentIndex < 0

  return { steps, current, currentIndex: currentIndex < 0 ? steps.length - 1 : currentIndex, allDone }
}

async function readState(dismissed) {
  const [p, j, pu, e, h, l, bm, cs, rs] = await Promise.all([
    safe('projects', () => supabase.from('track_b_content_projects').select('id,title,status,updated_at,created_at').order('updated_at', { ascending: false }).limit(200), []),
    safe('production jobs', () => supabase.from('track_b_production_jobs').select('id,project_id,mode,status,updated_at,created_at').order('updated_at', { ascending: false }).limit(200), []),
    safe('publications', () => supabase.from('track_b_publications').select('id,project_id,title,platform,status,scheduled_at,published_at,updated_at,created_at').order('updated_at', { ascending: false }).limit(200), []),
    safe('performance evidence', () => supabase.from('track_b_performance_evidence').select('id,title,revenue,winner,publication_id,operator_note,created_at').order('created_at', { ascending: false }).limit(200), []),
    safe('local AI heartbeat', () => supabase.from('local_ai_worker_heartbeat').select('status,last_seen,current_job_type').eq('id', 'qwen').maybeSingle(), null),
    safe('learning recommendations', () => supabase.from('track_b_learning_recommendations').select('id,recommendation_type,format,invariant_pattern,confidence,status,source_evidence_id,created_at').eq('status', 'active').order('created_at', { ascending: false }).limit(20), []),
    safe('metric snapshots', () => supabase.from('cornerstone_metric_snapshots').select('scope,platform,audience_followers,subscribers,paid_subscribers,revenue,snapshot_date,captured_at,verified').order('snapshot_date', { ascending: false }).limit(200), []),
    safe('case study', () => supabase.from('cornerstone_case_study_updates').select('id').order('week_ending', { ascending: false }).limit(1), []),
    (async () => {
      try {
        const r = await supabase.from('cornerstone_research_signals').select('id', { count: 'exact', head: true })
        if (r.error) return { data: { count: 0 }, error: { name: 'research signals', message: r.error.message } }
        return { data: { count: r.count || 0 }, error: null }
      } catch (error) {
        return { data: { count: 0 }, error: { name: 'research signals', message: error?.message || String(error) } }
      }
    })(),
  ])

  const warnings = [p, j, pu, e, h, l, bm, cs, rs].filter((x) => x.error).map((x) => x.error.name + ': ' + x.error.message)
  const projects = p.data || []
  const jobs = j.data || []
  const pubs = pu.data || []
  const evidence = e.data || []
  const hb = h.data || {}
  const learning = l.data || []
  const metricSnapshots = bm.data || []
  const caseStudyUpdates = cs.data || []
  const researchN = rs.error ? 0 : Number(rs.data?.count || 0)

  const heartbeatKnown = !h.error
  const fresh = heartbeatKnown && Boolean(hb.last_seen && Date.now() - new Date(hb.last_seen).getTime() < 90000)
  const online = heartbeatKnown ? fresh && String(hb.status || '').toLowerCase() !== 'offline' : null
  const failed = [...jobs.filter((x) => FAIL.has(String(x.status))), ...pubs.filter((x) => FAIL.has(String(x.status)))]
  const production = jobs.filter((x) => ['queued', 'processing', 'review', 'in_production'].includes(String(x.status)))
  const scheduled = pubs.filter((x) => x.status === 'scheduled')
  const published = pubs.filter((x) => ['published', 'live'].includes(String(x.status)))
  const winners = evidence.filter((x) => x.winner === true)
  const revenue = evidence.reduce((n, x) => n + Number(x.revenue || 0), 0)
  const latestMetric = (scope, platform = null) =>
    metricSnapshots.find((x) => x.scope === scope && (platform ? x.platform === platform : true))
  const latestBusiness = latestMetric('business')
  const platformMetrics = [...new Set(metricSnapshots.filter((x) => x.scope === 'platform').map((x) => x.platform).filter(Boolean))]
    .map((platform) => latestMetric('platform', platform))
    .filter(Boolean)
  const followers = platformMetrics.reduce((n, x) => n + Number(x.audience_followers || 0), 0)
  const subscribers = platformMetrics.reduce((n, x) => n + Number(x.subscribers || 0), 0)
  const paidSubscribers = platformMetrics.reduce((n, x) => n + Number(x.paid_subscribers || 0), 0)

  const path = buildPath(
    {
      failed, online, jobs, projects, pubs, evidence, learning, caseStudyUpdates,
      researchCount: researchN, metricSnapshots,
      caseStudyError: cs.error, researchError: rs.error,
    },
    dismissed,
  )

  const recent = [
    ...evidence.map((x) => ({
      kind: x.winner ? 'Winner' : 'Result',
      title: x.title || 'Performance result',
      when: x.created_at,
      href: '/content/measurement',
    })),
    ...pubs.map((x) => ({
      kind: ['published', 'live'].includes(x.status) ? 'Published' : 'Scheduled',
      title: x.title || 'Publication',
      when: x.published_at || x.scheduled_at || x.updated_at,
      href: '/content/publish',
    })),
    ...projects.map((x) => ({
      kind: 'Built',
      title: x.title || 'Piece',
      when: x.updated_at || x.created_at,
      href: '/content/remake',
    })),
  ]
    .filter((x) => x.when)
    .sort((a, b) => new Date(b.when) - new Date(a.when))
    .slice(0, 5)

  return {
    revenue: latestBusiness ? Number(latestBusiness.revenue || 0) : revenue,
    followers, subscribers, paidSubscribers,
    packages: projects.length,
    inMotion: production.length + scheduled.length,
    published: published.length,
    winners: winners.length,
    online, lastSeen: hb.last_seen, currentJob: hb.current_job_type, warnings,
    failed: failed.length,
    queued: jobs.filter((x) => x.status === 'queued').length,
    processing: jobs.filter((x) => x.status === 'processing').length,
    recent, learning, closedLoops: evidence.length, path,
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
    revenue: 0, followers: 0, subscribers: 0, paidSubscribers: 0, packages: 0, inMotion: 0, published: 0, winners: 0,
    online: null, lastSeen: null, currentJob: null, warnings: [], failed: 0, queued: 0, processing: 0, recent: [], learning: [], closedLoops: 0,
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
            <div className="k">Today · sequential path</div>
            <h1>{path.allDone ? 'Path clear. Compound or rest.' : 'One step. Then the next.'}</h1>
            <p>
              Command is not a menu. Complete the current step; the next one unlocks. Soft steps can be marked done for
              this session; hard steps unlock from real evidence in the system.
            </p>
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
