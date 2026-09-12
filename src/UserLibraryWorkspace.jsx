import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import EnterpriseShell from './EnterpriseShell.jsx'

const clean = (v) => String(v ?? '').trim()

function parseResult(value) {
  if (value && typeof value === 'object') return value
  let raw = clean(value)
  if (!raw) return null
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  try { return JSON.parse(raw) } catch {}
  const start = raw.search(/[\[{]/)
  if (start < 0) return null
  try { return JSON.parse(raw.slice(start)) } catch { return null }
}

export default function UserLibraryWorkspace() {
  const [jobs, setJobs] = useState([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const { data, error: qe } = await supabase
          .from('local_ai_jobs')
          .select('id,job_type,status,result,created_at,updated_at,persona_id')
          .order('created_at', { ascending: false })
          .limit(80)
        if (qe) throw qe
        if (live) setJobs(data || [])
      } catch (e) {
        if (live) setError(e?.message || String(e))
      }
    })()
    return () => { live = false }
  }, [])

  const rows = useMemo(() => {
    return jobs.filter((j) => filter === 'all' || j.status === filter)
  }, [jobs, filter])

  return (
    <EnterpriseShell active="library" eyebrow="Library">
      <div className="cs-page library">
        <header className="cs-page-head">
          <div className="eyebrow">Archive</div>
          <h1>Intelligence library</h1>
          <p>Completed and recent jobs. Use this to inspect outputs — Create is where new work starts.</p>
        </header>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['all', 'completed', 'processing', 'queued', 'error'].map((f) => (
            <button
              key={f}
              type="button"
              className={filter === f ? 'cs-btn' : 'cs-btn-ghost'}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="cs-panel" style={{ border: '1px solid var(--line)', borderRadius: 12, background: 'var(--panel)', overflow: 'hidden' }}>
          {error ? <div style={{ color: 'var(--bad)', padding: 16 }}>{error}</div> : null}
          {!rows.length && !error ? (
            <div style={{ padding: 20, color: 'var(--text-3)' }}>
              No jobs yet. <a href="/content/remake" style={{ color: 'var(--text)', fontWeight: 600 }}>Create something</a>.
            </div>
          ) : null}
          {rows.map((job) => {
            const parsed = parseResult(job.result)
            const title = parsed?.selected_video?.topic || parsed?.topic || job.job_type || 'Job'
            return (
              <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 13 }}>{clean(title)}</strong>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--text-3)' }}>
                    {job.job_type} · {job.status} · {job.created_at ? new Date(job.created_at).toLocaleString('en-GB') : '—'}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{job.status}</span>
              </div>
            )
          })}
        </div>
      </div>
    </EnterpriseShell>
  )
}
