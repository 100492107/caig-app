import React, { useEffect, useMemo, useState } from 'react'
import EnterpriseShell from './EnterpriseShell.jsx'
import { supabase } from './supabase'

const STATUS_OPTIONS = ['all', 'candidate', 'approved', 'used', 'rejected']
const CONFIDENCE_OPTIONS = ['high', 'medium', 'low']
const DEFAULT_NICHE = 'discipline lifestyle AI creator'

const today = () => new Date().toISOString().slice(0, 10)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function numOrNull(value) {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readResult(result) {
  if (!result) return null
  if (typeof result === 'object') return result
  try {
    return JSON.parse(result)
  } catch {
    return { text: String(result) }
  }
}

export default function ResearchWorkspace() {
  const [signals, setSignals] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runningRadar, setRunningRadar] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [radarNiche, setRadarNiche] = useState(DEFAULT_NICHE)
  const [form, setForm] = useState({
    source_url: '',
    platform: '',
    source_creator: '',
    creator_baseline_views: '',
    observed_metric_name: 'views',
    observed_metric_value: '',
    outlier_rationale: '',
    topic: '',
    mechanism: '',
    confidence: 'medium',
    niche: DEFAULT_NICHE,
    status: 'candidate',
    notes: '',
    captured_at: today(),
  })

  async function loadSignals(nextStatus = statusFilter) {
    setLoading(true)
    setError('')
    const { data: userState, error: userError } = await supabase.auth.getUser()
    if (userError || !userState?.user) {
      setSignals([])
      setLoading(false)
      setError('Sign in required.')
      return
    }

    let query = supabase
      .from('cornerstone_research_signals')
      .select('id,source_url,platform,source_creator,creator_baseline_views,observed_metric_name,observed_metric_value,outlier_rationale,topic,mechanism,confidence,niche,status,notes,captured_at,created_at')
      .eq('owner_id', userState.user.id)
      .order('captured_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300)

    if (nextStatus !== 'all') query = query.eq('status', nextStatus)

    const { data, error: loadError } = await query
    if (loadError) {
      setSignals([])
      setError(loadError.message || 'Could not load research ledger.')
    } else {
      setSignals(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSignals('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadSignals(statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function submitSignal(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { data: userState, error: userError } = await supabase.auth.getUser()
      if (userError || !userState?.user) throw new Error('Sign in required.')
      if (!String(form.mechanism || '').trim()) throw new Error('Mechanism is required.')

      const payload = {
        owner_id: userState.user.id,
        source_url: form.source_url.trim() || null,
        platform: form.platform.trim() || null,
        source_creator: form.source_creator.trim() || null,
        creator_baseline_views: numOrNull(form.creator_baseline_views),
        observed_metric_name: form.observed_metric_name.trim() || 'views',
        observed_metric_value: numOrNull(form.observed_metric_value),
        outlier_rationale: form.outlier_rationale.trim() || null,
        topic: form.topic.trim() || null,
        mechanism: form.mechanism.trim(),
        confidence: CONFIDENCE_OPTIONS.includes(form.confidence) ? form.confidence : 'medium',
        niche: form.niche.trim() || null,
        status: ['candidate', 'approved', 'used', 'rejected'].includes(form.status) ? form.status : 'candidate',
        notes: form.notes.trim() || null,
        captured_at: form.captured_at || today(),
      }

      const { error: insertError } = await supabase.from('cornerstone_research_signals').insert(payload)
      if (insertError) throw insertError

      setMessage('Signal saved to research ledger.')
      setForm((prev) => ({
        ...prev,
        source_url: '',
        source_creator: '',
        creator_baseline_views: '',
        observed_metric_value: '',
        outlier_rationale: '',
        topic: '',
        mechanism: '',
        notes: '',
      }))
      await loadSignals(statusFilter)
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(signal, status) {
    setError('')
    const { error: updateError } = await supabase
      .from('cornerstone_research_signals')
      .update({ status })
      .eq('id', signal.id)
    if (updateError) {
      setError(updateError.message || 'Could not update status.')
      return
    }
    await loadSignals(statusFilter)
  }

  async function deleteSignal(signal) {
    if (!window.confirm('Delete this research signal?')) return
    setError('')
    const { error: removeError } = await supabase.from('cornerstone_research_signals').delete().eq('id', signal.id)
    if (removeError) {
      setError(removeError.message || 'Could not delete signal.')
      return
    }
    await loadSignals(statusFilter)
  }

  function useInBuild(signal) {
    const payload = {
      id: signal.id,
      mechanism: signal.mechanism,
      topic: signal.topic,
      confidence: signal.confidence,
      platform: signal.platform,
      source_url: signal.source_url,
      status: signal.status,
      niche: signal.niche,
    }
    sessionStorage.setItem('cornerstone_active_mechanism', JSON.stringify(payload))
    window.location.assign('/content/remake')
  }

  async function runAutoRadar() {
    setRunningRadar(true)
    setError('')
    setMessage('')
    try {
      const niche = radarNiche.trim() || DEFAULT_NICHE
      const { data: userState, error: userError } = await supabase.auth.getUser()
      if (userError || !userState?.user) throw new Error('Sign in required.')

      const systemPrompt = [
        'You are Cornerstone Research Radar.',
        'Return strict JSON only: {"signals":[{platform,source_url,source_creator,topic,mechanism,confidence,outlier_rationale,creator_baseline_views,observed_metric_name,observed_metric_value,notes}]}.',
        'Focus on repeated creator-growth mechanisms inside the niche and keep output concise.',
      ].join(' ')

      const userPrompt = [
        `NICHE: ${niche}`,
        'CREATORS: Cara and Lila',
        'Find mechanism-level opportunities that can be used in Build. No copied execution.',
      ].join('\n')

      const { data: created, error: createError } = await supabase
        .from('local_ai_jobs')
        .insert({
          owner_id: userState.user.id,
          title: `Research radar · ${niche}`,
          job_type: 'research_radar',
          model: 'mlx-community/Qwen3.5-9B-4bit',
          persona_id: 'cara_lila',
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          options: {
            research: true,
            research_domain: 'TRACK_B_CREATOR_GROWTH',
            niche,
            write_cornerstone_signals: true,
            max_tokens: 2200,
            temperature: 0.35,
          },
          status: 'queued',
          production_status: 'not_started',
        })
        .select('id')
        .single()

      if (createError || !created?.id) throw createError || new Error('Could not queue auto radar.')

      setMessage('Auto radar queued. Waiting for local worker…')
      const deadline = Date.now() + 4 * 60 * 1000
      while (Date.now() < deadline) {
        const { data: job, error: pollError } = await supabase
          .from('local_ai_jobs')
          .select('id,status,error_message,result')
          .eq('id', created.id)
          .maybeSingle()
        if (pollError) throw pollError
        if (!job) throw new Error('Auto radar job disappeared.')
        if (job.status === 'completed') {
          const parsed = readResult(job.result)
          const written = Number(parsed?.cornerstone_signals_written || 0)
          setMessage(written > 0 ? `Auto radar completed. ${written} signal(s) written.` : 'Auto radar completed.')
          await loadSignals(statusFilter)
          return
        }
        if (job.status === 'error') throw new Error(job.error_message || 'Auto radar failed.')
        await sleep(2500)
      }
      throw new Error('Auto radar timed out. Ensure local qwen-worker is running on Mac and retry.')
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setRunningRadar(false)
    }
  }

  const countByStatus = useMemo(() => {
    const counts = { all: signals.length, candidate: 0, approved: 0, used: 0, rejected: 0 }
    for (const signal of signals) {
      const key = signal.status || 'candidate'
      if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1
    }
    return counts
  }, [signals])

  return (
    <EnterpriseShell active="research" eyebrow="Research">
      <main className="bi">
        <header className="bi-head">
          <div>
            <div className="bi-k">Track B / Research workspace</div>
            <h1>Capture mechanisms before Build.</h1>
            <p>Manual and auto radar inputs land in the same ledger. Approve what is real, reject noise, and hand one mechanism directly into Remake.</p>
          </div>
          <div className="bi-head-meta">
            <b>{loading ? 'Refreshing…' : `${signals.length} signals`}</b>
            <span>Current filter: {statusFilter}</span>
            <small>Auto radar requires local qwen-worker running on Mac.</small>
          </div>
        </header>

        {error && <div className="bi-error">{error}</div>}
        {message && <div className="bi-success">{message}</div>}

        <section className="bi-grid2">
          <article className="bi-panel">
            <div className="bi-panel-head">
              <b>Manual research signal</b>
              <span>Writes to cornerstone_research_signals</span>
            </div>
            <form className="bi-capture-form" onSubmit={submitSignal}>
              <label>
                <span>Source URL</span>
                <input value={form.source_url} onChange={(e) => setForm((prev) => ({ ...prev, source_url: e.target.value }))} placeholder="https://…" />
              </label>
              <label>
                <span>Platform</span>
                <input value={form.platform} onChange={(e) => setForm((prev) => ({ ...prev, platform: e.target.value }))} placeholder="YouTube, TikTok…" />
              </label>
              <label>
                <span>Source creator</span>
                <input value={form.source_creator} onChange={(e) => setForm((prev) => ({ ...prev, source_creator: e.target.value }))} />
              </label>
              <label>
                <span>Baseline views</span>
                <input value={form.creator_baseline_views} type="number" onChange={(e) => setForm((prev) => ({ ...prev, creator_baseline_views: e.target.value }))} />
              </label>
              <label>
                <span>Observed metric name</span>
                <input value={form.observed_metric_name} onChange={(e) => setForm((prev) => ({ ...prev, observed_metric_name: e.target.value }))} />
              </label>
              <label>
                <span>Observed metric value</span>
                <input value={form.observed_metric_value} type="number" onChange={(e) => setForm((prev) => ({ ...prev, observed_metric_value: e.target.value }))} />
              </label>
              <label>
                <span>Topic</span>
                <input value={form.topic} onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))} />
              </label>
              <label>
                <span>Captured at</span>
                <input value={form.captured_at} type="date" onChange={(e) => setForm((prev) => ({ ...prev, captured_at: e.target.value }))} />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Mechanism (required)</span>
                <textarea required value={form.mechanism} onChange={(e) => setForm((prev) => ({ ...prev, mechanism: e.target.value }))} />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Outlier rationale</span>
                <textarea value={form.outlier_rationale} onChange={(e) => setForm((prev) => ({ ...prev, outlier_rationale: e.target.value }))} />
              </label>
              <label>
                <span>Confidence</span>
                <select value={form.confidence} onChange={(e) => setForm((prev) => ({ ...prev, confidence: e.target.value }))}>
                  {CONFIDENCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Niche</span>
                <input value={form.niche} onChange={(e) => setForm((prev) => ({ ...prev, niche: e.target.value }))} />
              </label>
              <label>
                <span>Status</span>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                  {STATUS_OPTIONS.filter((option) => option !== 'all').map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Notes</span>
                <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </label>
              <div className="bi-panel-actions" style={{ gridColumn: '1 / -1', padding: 0 }}>
                <span>Mechanism is required. Everything else can be refined later.</span>
                <button className="bi-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save signal'}</button>
              </div>
            </form>
          </article>

          <article className="bi-panel">
            <div className="bi-panel-head">
              <b>Auto radar</b>
              <span>Queues local_ai_jobs.research_radar</span>
            </div>
            <div style={{ padding: 16 }}>
              <div className="bi-k">Niche</div>
              <input
                style={{ width: '100%', marginTop: 8 }}
                value={radarNiche}
                onChange={(e) => setRadarNiche(e.target.value)}
              />
              <p className="bi-muted" style={{ padding: '12px 0 0' }}>
                Uses Track B creator-growth research with Cara/Lila context and writes candidates into the same research ledger.
              </p>
              <button className="bi-primary" style={{ marginTop: 12 }} disabled={runningRadar} onClick={runAutoRadar}>
                {runningRadar ? 'Running auto radar…' : 'Run auto radar'}
              </button>
              <div className="bi-rule" style={{ margin: '14px 0 0' }}>
                Keep local qwen-worker running on Mac while this runs. Polling stops after about 4 minutes.
              </div>
            </div>
          </article>
        </section>

        <section className="bi-panel">
          <div className="bi-panel-head">
            <b>Research ledger</b>
            <span>{loading ? 'Loading…' : `${signals.length} rows`}</span>
          </div>
          <div className="bi-tabs" style={{ padding: '12px 16px' }}>
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option}
                className={statusFilter === option ? 'active' : ''}
                onClick={() => setStatusFilter(option)}
              >
                {option} ({option === 'all' ? countByStatus.all : countByStatus[option]})
              </button>
            ))}
          </div>
          {signals.length === 0 ? (
            <div className="bi-empty">No signals yet for this filter.</div>
          ) : (
            signals.map((signal) => (
              <div className="bi-listrow" key={signal.id}>
                <div>
                  <b>{signal.mechanism}</b>
                  <span>
                    {(signal.platform || 'Unknown platform')} · {(signal.topic || 'No topic')} · {signal.confidence || 'medium'} confidence · {signal.status}
                  </span>
                  <span>
                    {(signal.source_creator || 'Unknown creator')} · {(signal.source_url || 'No source URL')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button onClick={() => updateStatus(signal, 'approved')}>Approve</button>
                  <button onClick={() => updateStatus(signal, 'rejected')}>Reject</button>
                  <button onClick={() => updateStatus(signal, 'used')}>Mark used</button>
                  <button onClick={() => useInBuild(signal)}>Use in Build</button>
                  <button onClick={() => deleteSignal(signal)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </EnterpriseShell>
  )
}
