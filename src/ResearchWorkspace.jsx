import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import EnterpriseShell from './EnterpriseShell.jsx'

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube Shorts', 'X', 'Other']
const STATUSES = ['candidate', 'approved', 'used', 'rejected']

const blankForm = () => ({
  source_url: '',
  platform: 'TikTok',
  source_creator: '',
  creator_baseline_views: '',
  observed_metric_name: 'views',
  observed_metric_value: '',
  outlier_rationale: '',
  topic: '',
  mechanism: '',
  confidence: 'medium',
  niche: '',
  status: 'candidate',
  notes: '',
  captured_at: new Date().toISOString().slice(0, 10),
})

const toNumber = (value) => {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export default function ResearchWorkspace() {
  const [form, setForm] = useState(blankForm)
  const [filterStatus, setFilterStatus] = useState('all')
  const [signals, setSignals] = useState([])
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadSignals(status = filterStatus) {
    setError('')
    let query = supabase
      .from('cornerstone_research_signals')
      .select('id,source_url,platform,source_creator,observed_metric_name,observed_metric_value,topic,mechanism,confidence,niche,status,captured_at,created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (status !== 'all') query = query.eq('status', status)
    const { data, error: queryError } = await query
    if (queryError) {
      setError(queryError.message)
      return
    }
    setSignals(data || [])
  }

  useEffect(() => {
    loadSignals(filterStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

  const hasSignals = useMemo(() => signals.length > 0, [signals])

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  async function save() {
    setMessage('')
    setError('')
    if (!form.mechanism.trim()) {
      setError('Mechanism is required. Strip topic. Keep mechanism.')
      return
    }
    setSaving(true)
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth?.user) throw new Error('Sign in required.')
      const payload = {
        owner_id: auth.user.id,
        source_url: form.source_url || null,
        platform: form.platform || null,
        source_creator: form.source_creator || null,
        creator_baseline_views: toNumber(form.creator_baseline_views),
        observed_metric_name: form.observed_metric_name || 'views',
        observed_metric_value: toNumber(form.observed_metric_value),
        outlier_rationale: form.outlier_rationale || null,
        topic: form.topic || null,
        mechanism: form.mechanism.trim(),
        confidence: form.confidence,
        niche: form.niche || null,
        status: form.status,
        notes: form.notes || null,
        captured_at: form.captured_at || null,
      }
      const { error: insertError } = await supabase.from('cornerstone_research_signals').insert(payload)
      if (insertError) throw new Error(insertError.message)
      setMessage('Research signal saved. Keep only what can compound.')
      setForm(blankForm())
      await loadSignals(filterStatus)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id, status) {
    setMessage('')
    setError('')
    setBusyId(id)
    const { error: updateError } = await supabase.from('cornerstone_research_signals').update({ status }).eq('id', id)
    if (updateError) setError(updateError.message)
    else {
      setMessage(`Signal marked ${status}.`)
      await loadSignals(filterStatus)
    }
    setBusyId('')
  }

  async function remove(id) {
    setMessage('')
    setError('')
    setBusyId(id)
    const { error: deleteError } = await supabase.from('cornerstone_research_signals').delete().eq('id', id)
    if (deleteError) setError(deleteError.message)
    else {
      setMessage('Signal deleted.')
      await loadSignals(filterStatus)
    }
    setBusyId('')
  }

  function useInBuild(signal) {
    const payload = {
      id: signal.id,
      mechanism: signal.mechanism,
      topic: signal.topic || null,
      platform: signal.platform || null,
      source_creator: signal.source_creator || null,
      observed_metric_name: signal.observed_metric_name || null,
      observed_metric_value: signal.observed_metric_value ?? null,
    }
    sessionStorage.setItem('cornerstone_active_mechanism', JSON.stringify(payload))
    window.location.href = '/content/remake'
  }

  return (
    <EnterpriseShell active="research" eyebrow="Research">
      <main className="bi">
        <header className="bi-head">
          <div>
            <div className="bi-k">Research</div>
            <h1>Capture mechanism before Build.</h1>
            <p>Bias-resistant research. The feed is not the market. Strip topic, keep mechanism, then decide what belongs in Build.</p>
          </div>
          <div className="bi-head-meta">
            <b>Evidence first</b>
            <span>Outliers are clues, not instructions.</span>
            <small>No mechanism enters Build until it is captured with context, rationale and confidence.</small>
          </div>
        </header>

        <div className="bi-tabs">
          <a className="active" href="/research">Research</a>
          <a href="/content/remake">Build</a>
          <a href="/content/measurement">Learn</a>
          <a href="/business/capture">Capture metrics</a>
        </div>

        {error ? <div className="bi-error">{error}</div> : null}
        {message ? <div className="bi-success">{message}</div> : null}

        <section className="bi-panel">
          <div className="bi-panel-head">
            <b>New research signal</b>
            <span>Capture the outlier, then extract mechanism</span>
          </div>
          <div className="bi-capture-form">
            <label><span>Source URL</span><input value={form.source_url} onChange={(e) => setField('source_url', e.target.value)} placeholder="https://…" /></label>
            <label><span>Platform</span><select value={form.platform} onChange={(e) => setField('platform', e.target.value)}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label><span>Source creator</span><input value={form.source_creator} onChange={(e) => setField('source_creator', e.target.value)} /></label>
            <label><span>Creator baseline views</span><input inputMode="decimal" value={form.creator_baseline_views} onChange={(e) => setField('creator_baseline_views', e.target.value)} /></label>
            <label><span>Observed metric name</span><input value={form.observed_metric_name} onChange={(e) => setField('observed_metric_name', e.target.value)} placeholder="views / CTR / saves" /></label>
            <label><span>Observed metric value</span><input inputMode="decimal" value={form.observed_metric_value} onChange={(e) => setField('observed_metric_value', e.target.value)} /></label>
            <label style={{ gridColumn: '1/-1' }}><span>Outlier rationale</span><textarea value={form.outlier_rationale} onChange={(e) => setField('outlier_rationale', e.target.value)} placeholder="Why this is unusual versus baseline." /></label>
            <label><span>Topic</span><input value={form.topic} onChange={(e) => setField('topic', e.target.value)} /></label>
            <label style={{ gridColumn: '1/-1' }}><span>Mechanism (required)</span><textarea value={form.mechanism} onChange={(e) => setField('mechanism', e.target.value)} placeholder="The transferable mechanism, independent from the topic." /></label>
            <label><span>Confidence</span><select value={form.confidence} onChange={(e) => setField('confidence', e.target.value)}><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select></label>
            <label><span>Niche</span><input value={form.niche} onChange={(e) => setField('niche', e.target.value)} /></label>
            <label><span>Status</span><select value={form.status} onChange={(e) => setField('status', e.target.value)}>{STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label><span>Captured at</span><input type="date" value={form.captured_at} onChange={(e) => setField('captured_at', e.target.value)} /></label>
            <label style={{ gridColumn: '1/-1' }}><span>Notes</span><textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} /></label>
          </div>
          <div className="bi-panel-actions">
            <button className="bi-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save signal →'}</button>
            <span>Keep mechanism language reusable. Avoid copying source execution.</span>
          </div>
        </section>

        <section className="bi-panel">
          <div className="bi-panel-head">
            <b>Signal ledger</b>
            <label style={{ display: 'inline-grid', gap: 6 }}>
              <span style={{ fontSize: 9, color: 'var(--cs-os-subtle)' }}>Filter status</span>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ minHeight: 34 }}>
                <option value="all">all</option>
                {STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
          </div>
          {!hasSignals ? (
            <div className="bi-empty">No research signals yet for this filter.</div>
          ) : (
            signals.map((signal) => (
              <div className="bi-listrow" key={signal.id} style={{ alignItems: 'flex-start' }}>
                <div>
                  <b>{signal.mechanism}</b>
                  <span>{signal.platform || 'Unknown platform'} · {signal.source_creator || 'Unknown creator'} · {signal.status} · {signal.confidence}</span>
                  <span>{signal.observed_metric_name || 'metric'}: {signal.observed_metric_value ?? '—'} · Captured {signal.captured_at || '—'}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="bi-primary" style={{ minHeight: 34 }} onClick={() => useInBuild(signal)}>Use in Build</button>
                  <button className="bi-primary" style={{ minHeight: 34 }} disabled={busyId === signal.id} onClick={() => updateStatus(signal.id, 'approved')}>Approve</button>
                  <button className="bi-primary" style={{ minHeight: 34 }} disabled={busyId === signal.id} onClick={() => updateStatus(signal.id, 'used')}>Mark used</button>
                  <button className="bi-primary" style={{ minHeight: 34 }} disabled={busyId === signal.id} onClick={() => updateStatus(signal.id, 'rejected')}>Reject</button>
                  <button className="bi-primary" style={{ minHeight: 34 }} disabled={busyId === signal.id} onClick={() => remove(signal.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </EnterpriseShell>
  )
}
