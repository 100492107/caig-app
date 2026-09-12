import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import EnterpriseShell from './EnterpriseShell.jsx'

function age(lastSeen) {
  if (!lastSeen) return 'No check-in'
  const seconds = Math.max(0, Math.round((Date.now() - new Date(lastSeen).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.round(seconds / 60)}m ago`
}

export default function SystemWorkspace() {
  const [state, setState] = useState({
    lastSeen: null, currentJob: null, model: null, hostname: null, jobs: 0, errors: 0,
  })
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const [heartbeat, jobs] = await Promise.all([
        supabase.from('local_ai_worker_heartbeat').select('status,last_seen,current_job_type,model,hostname').eq('id', 'qwen').maybeSingle(),
        supabase.from('local_ai_jobs').select('status').order('created_at', { ascending: false }).limit(100),
      ])
      const rows = (!jobs.error && jobs.data) ? jobs.data : []
      setState({
        lastSeen: heartbeat.data?.last_seen || null,
        currentJob: heartbeat.data?.current_job_type || null,
        model: heartbeat.data?.model || null,
        hostname: heartbeat.data?.hostname || null,
        jobs: rows.filter((x) => ['queued', 'processing'].includes(String(x.status))).length,
        errors: rows.filter((x) => ['error', 'failed'].includes(String(x.status))).length,
        status: heartbeat.data?.status || null,
      })
    } catch {
      // Keep last known state; System must not crash the shell
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  const online = Boolean(state.lastSeen && Date.now() - new Date(state.lastSeen).getTime() < 90000 && String(state.status || '').toLowerCase() !== 'offline')

  return (
    <EnterpriseShell active="system" eyebrow="System">
      <div className="cs-page system-workspace">
        <header className="cs-page-head">
          <div className="eyebrow">Constraints</div>
          <h1>What can stop the engine</h1>
          <p>Local AI, queue health, and blockers. Fix these, then return to Home or Create.</p>
        </header>

        <div className="sys-grid">
          <div className="sys-card">
            <strong className={online ? 'sys-ok' : 'sys-bad'}>{loading ? '…' : online ? 'Online' : 'Offline'}</strong>
            <span>Local AI</span>
            <small>{online ? `Check-in ${age(state.lastSeen)}` : 'Start the local stack on your Mac.'}</small>
          </div>
          <div className="sys-card">
            <strong>{loading ? '…' : state.jobs}</strong>
            <span>Active jobs</span>
            <small>Queued or processing</small>
          </div>
          <div className="sys-card">
            <strong className={state.errors ? 'sys-bad' : 'sys-ok'}>{loading ? '…' : state.errors}</strong>
            <span>Recent errors</span>
            <small>Last 100 jobs</small>
          </div>
          <div className="sys-card">
            <strong>{loading ? '…' : state.currentJob || 'Idle'}</strong>
            <span>Current job</span>
            <small>From worker heartbeat</small>
          </div>
        </div>

        <section className="sys-panel">
          <div className="cs-section-head" style={{ marginBottom: 12 }}>
            <h3>Dependencies</h3>
          </div>
          <div className="sys-list">
            <div className="sys-row"><span>Model</span><strong>{state.model || 'Not reported'}</strong></div>
            <div className="sys-row"><span>Machine</span><strong>{state.hostname || 'Not reported'}</strong></div>
            <div className="sys-row"><span>Heartbeat</span><strong>{state.lastSeen ? `${new Date(state.lastSeen).toLocaleString('en-GB')} · ${age(state.lastSeen)}` : 'None'}</strong></div>
            <div className="sys-row"><span>Queue</span><strong>{state.errors ? 'Needs attention' : state.jobs ? 'Moving' : 'Idle'}</strong></div>
          </div>
          <div className="sys-command">
            <a className="primary" href="/">Back to Home →</a>
            <a href="/content/remake">Open Create →</a>
          </div>
        </section>
      </div>
    </EnterpriseShell>
  )
}
