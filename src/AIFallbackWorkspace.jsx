import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import EnterpriseShell from './EnterpriseShell.jsx'
import { buildFallbackPacket, buildFallbackPayload, QWEN_REFERENCE } from '../shared/ai-fallback-context.js'

const PROVIDERS = [
  { id: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/' },
  { id: 'claude', label: 'Claude', url: 'https://claude.ai/new' },
  { id: 'grok', label: 'Grok', url: 'https://grok.com/' },
  { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/' },
]

function download(name, contents, type = 'text/plain') {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = value
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.focus()
    area.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch {}
    area.remove()
    return ok
  }
}

function statusLabel(status) {
  const map = { queued: 'Waiting', processing: 'Working', completed: 'Done', error: 'Failed', failed: 'Failed' }
  return map[String(status || '').toLowerCase()] || status || 'Unknown'
}

export default function AIFallbackWorkspace() {
  const [jobs, setJobs] = useState([])
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('job') || '')
  const [provider, setProvider] = useState('gemini')
  const [message, setMessage] = useState('')
  const [resultText, setResultText] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [approvedExternalShare, setApprovedExternalShare] = useState(false)
  const [receiptConfirmed, setReceiptConfirmed] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('local_ai_jobs')
      .select('id,title,job_type,model,status,result,error_message,created_at,completed_at,persona_id,options,system_prompt,user_prompt,production_status')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) setMessage(error.message)
    else {
      setJobs(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selected = useMemo(() => jobs.find((x) => x.id === selectedId) || null, [jobs, selectedId])
  const packet = useMemo(() => buildFallbackPacket({ job: selected, provider }), [selected, provider])
  const payload = useMemo(() => buildFallbackPayload({ job: selected, provider }), [selected, provider])
  const activeJobs = jobs.filter((j) => ['queued', 'processing', 'error', 'failed'].includes(String(j.status || '').toLowerCase()))
  const recentDone = jobs.filter((j) => String(j.status || '').toLowerCase() === 'completed').slice(0, 10)
  const packetStats = useMemo(() => ({ chars: packet.length, words: packet.trim() ? packet.trim().split(/\s+/).length : 0, sections: (packet.match(/<<<BEGIN_CONTEXT_SECTION/g) || []).length, approximateTokens: Math.ceil(packet.length / 4) }), [packet])

  async function send(providerId) {
    if (!approvedExternalShare) {
      setMessage('Please confirm that you have reviewed the packet and approve sending this business context to the selected external provider.')
      return
    }
    setProvider(providerId)
    const p = PROVIDERS.find((x) => x.id === providerId) || PROVIDERS[0]
    const packed = buildFallbackPacket({ job: selected, provider: providerId })
    window.open(p.url, '_blank', 'noopener,noreferrer')
    const ok = await copyText(packed)
    download('cornerstone-ai-context-' + providerId + '-' + (selected ? 'job' : 'full-brain') + '.md', packed)
    setMessage(
      ok
        ? 'Context packet copied and downloaded. Paste it into ' + p.label + '. Its first response must be a context receipt only. Check it, then type PROCEED.'
        : 'Packet downloaded. Open ' + p.label + ' and paste the .md contents. Check its context receipt before typing PROCEED.'
    )
  }

  function downloadMarkdown() {
    download('cornerstone-ai-context-' + (selected ? 'job-handoff' : 'full-brain') + '.md', packet)
    setMessage('Context packet downloaded as Markdown.')
  }

  function downloadJson() {
    download('cornerstone-ai-context-backup.json', JSON.stringify(payload, null, 2), 'application/json')
    setMessage('Structured context downloaded as JSON.')
  }

  async function saveExternalResult() {
    if (!selected?.id || !resultText.trim() || saving || !receiptConfirmed) return
    setSaving(true)
    setMessage('Saving the external result back into Cornerstone…')
    const nextOptions = {
      ...(selected.options || {}),
      fallback_provider: provider,
      fallback_imported_at: new Date().toISOString(),
      fallback_source: 'external_ai',
    }
    const { error } = await supabase
      .from('local_ai_jobs')
      .update({
        status: 'completed',
        production_status: 'completed',
        result: resultText.trim(),
        model: 'external:' + provider,
        options: nextOptions,
        error_message: null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', selected.id)
    if (error) {
      setMessage('Could not save the result: ' + error.message)
    } else {
      setMessage('External result saved. Cornerstone can continue from the same job.')
      setResultText('')
      setReceiptConfirmed(false)
      await load()
    }
    setSaving(false)
  }

  const responsiveStyle = `@media(max-width:900px){
  .ai-fallback-hero{grid-template-columns:1fr!important}
  .ai-fallback-providers{grid-template-columns:1fr 1fr!important}
  .ai-fallback-actions{grid-template-columns:1fr!important}
  .ai-fallback-job-summary{grid-template-columns:1fr 1fr!important}
}
@media(max-width:560px){
  .ai-fallback-providers,.ai-fallback-job-summary{grid-template-columns:1fr!important}
}`;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: responsiveStyle }} />
      <EnterpriseShell active="ai-anywhere" eyebrow="AI Anywhere">
      <main className="ai-fallback" style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header className="cs-page-head">
          <div className="eyebrow">OTHER AI</div>
          <h1>Keep working when Qwen stops.</h1>
          <p>Your plans, instructions and saved jobs stay in Cornerstone. Send the right context to Gemini, Claude, Grok or ChatGPT, continue there, then save the answer back here.</p>
        </header>

        <section className="ai-fallback-hero" style={styles.hero}>
          <div>
            <strong style={{ fontSize: 18 }}>The AI can change. Your work should not.</strong>
            <p style={styles.muted}>Choose a saved job to carry its exact instructions and previous result, or leave the selection empty to export the full business context. Nothing is sent until you approve it.</p>
          </div>
          <div style={styles.modelBox}>
            <span>Local Qwen</span>
            <strong>{QWEN_REFERENCE.model}</strong>
            <small>Text {QWEN_REFERENCE.textUrl} · Vision {QWEN_REFERENCE.visionUrl} · Whisper {QWEN_REFERENCE.whisperUrl}</small>
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.headRow}>
            <div>
              <div style={styles.kicker}>STEP 1 OF 3</div>
              <h2 style={styles.h2}>Choose what you need to continue</h2>
            </div>
            <button style={styles.ghost} onClick={load}>Refresh</button>
          </div>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={styles.input}>
            <option value="">No job — export the full business brain (recommended)</option>
            {activeJobs.map((j) => <option key={j.id} value={j.id}>{statusLabel(j.status)} · {j.title || j.job_type} · {j.persona_id || 'general'}</option>)}
            {recentDone.length > 0 && <option disabled>──────── recent completed jobs ────────</option>}
            {recentDone.map((j) => <option key={j.id} value={j.id}>Done · {j.title || j.job_type} · {j.persona_id || 'general'}</option>)}
          </select>
          <div className="ai-fallback-job-summary" style={styles.jobSummary}>
            <div><span>Mode</span><strong>{selected ? 'Job handoff' : 'Full business brain'}</strong></div>
            <div><span>Type</span><strong>{selected?.job_type || 'Portable context'}</strong></div>
            <div><span>AI</span><strong>{selected?.model || QWEN_REFERENCE.model}</strong></div>
            <div><span>Creator</span><strong>{selected?.persona_id || 'All relevant context'}</strong></div>
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.kicker}>STEP 2 OF 3</div>
          <h2 style={styles.h2}>Open another AI with the right context</h2>
          <p style={styles.muted}>No job selected means export the full business brain. Choose a specific job only when you need that job's exact instructions, evidence and previous result. Every packet begins with the context receipt gate.</p>
          <div className="ai-fallback-job-summary" style={styles.jobSummary}>
            <div><span>Sources</span><strong>{packetStats.sections}</strong></div>
            <div><span>Words</span><strong>{packetStats.words.toLocaleString()}</strong></div>
            <div><span>Characters</span><strong>{packetStats.chars.toLocaleString()}</strong></div>
            <div><span>Approx. tokens</span><strong>{packetStats.approximateTokens.toLocaleString()}</strong></div>
          </div>
          <div style={{ ...styles.message, marginTop: 12, marginBottom: 8 }}><strong>Important:</strong> External models cannot be forced to ingest unlimited context. If the receipt says PARTIAL, MISSING or NOT READY, do not proceed. Resend the missing sections instead of trusting a summary.</div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '12px 0', color: '#c4ccd7', fontSize: 12, lineHeight: 1.5 }}><input type="checkbox" checked={approvedExternalShare} onChange={(e) => setApprovedExternalShare(e.target.checked)} style={{ marginTop: 3 }} /><span>I reviewed the packet and approve sending its contents to another AI provider. The packet excludes credentials and New Life personal records, but a selected job may contain sensitive business details.</span></label>
          <div className="ai-fallback-providers" style={styles.providerGrid}>
            {PROVIDERS.map((p) => <button key={p.id} disabled={!approvedExternalShare} onClick={() => send(p.id)} style={{ ...styles.provider, opacity: approvedExternalShare ? 1 : .45, cursor: approvedExternalShare ? 'pointer' : 'not-allowed' }}><b>{p.label}</b><span>Copy + open</span></button>)}
          </div>
          <div className="ai-fallback-actions" style={styles.secondaryActions}>
            <button style={styles.primary} onClick={downloadMarkdown}>Download handoff (.md)</button>
            <button style={styles.ghost} onClick={downloadJson}>Download structured backup (.json)</button>
          </div>
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', color: '#b7c0cc', fontWeight: 800 }}>Show every included source section</summary>
            <textarea readOnly value={packet} style={{ ...styles.input, minHeight: 360, marginTop: 10, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 12, lineHeight: 1.45 }} />
          </details>
        </section>

        <section style={styles.panel}>
          <div style={styles.kicker}>STEP 3 OF 3</div>
          <h2 style={styles.h2}>Save the answer back to Cornerstone</h2>
          <p style={styles.muted}>After the AI has returned its context receipt and you have replied PROCEED, paste its final work here. Cornerstone saves that result onto the original job and records which provider supplied it.</p>
          <div style={styles.providerRow}>
            {PROVIDERS.map((p) => <button key={p.id} onClick={() => setProvider(p.id)} style={provider === p.id ? styles.selectedProvider : styles.ghost}>{p.label}</button>)}
          </div>
          <textarea value={resultText} onChange={(e) => setResultText(e.target.value)} placeholder="Paste the external AI's final answer here…" style={{ ...styles.input, minHeight: 260, marginTop: 12 }} />
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '12px 0', color: '#c4ccd7', fontSize: 12, lineHeight: 1.5 }}><input type="checkbox" checked={receiptConfirmed} onChange={(e) => setReceiptConfirmed(e.target.checked)} style={{ marginTop: 3 }} /><span>I checked the AI's Context Receipt. It marked every required section READ, reported READY, and I replied PROCEED before it created this result.</span></label>
          <button disabled={!selected || !resultText.trim() || saving || !receiptConfirmed} onClick={saveExternalResult} style={styles.primary}>{saving ? 'Saving…' : 'Save result back to Cornerstone →'}</button>
        </section>

        {message && <div role="status" style={styles.message}>{message}</div>}
        {loading && <div style={styles.message}>Loading recent AI jobs…</div>}
      </main>
      </EnterpriseShell>
    </>
  )
}

const styles = {
  panel: { background: '#0e1017', border: '1px solid #252a39', borderRadius: 18, padding: 18, marginBottom: 16 },
  hero: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12, background: 'linear-gradient(145deg,#111720,#0d1017)', border: '1px solid #273141', borderRadius: 18, padding: 18, marginBottom: 16 },
  modelBox: { background: '#0a0d12', border: '1px solid #252d39', borderRadius: 14, padding: 14, display: 'grid', gap: 4 },
  kicker: { fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase', color: '#8a94a5', fontWeight: 900 },
  kickerGold: { fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#d4af37', fontWeight: 900 },
  h2: { margin: '5px 0 8px', fontSize: 21, letterSpacing: '-.035em' },
  muted: { color: '#929cab', fontSize: 13, lineHeight: 1.55 },
  headRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  input: { width: '100%', boxSizing: 'border-box', background: '#121720', color: '#f1f4f8', border: '1px solid #2b3442', borderRadius: 12, padding: 12, font: 'inherit' },
  ghost: { border: '1px solid #303949', background: '#131822', color: '#eef1f6', borderRadius: 11, padding: '10px 13px', fontWeight: 850, cursor: 'pointer', minHeight: 44 },
  primary: { width: '100%', border: '1px solid #d4af37', background: 'rgba(212,175,55,.14)', color: '#f7d77b', borderRadius: 11, padding: '12px 14px', fontWeight: 900, cursor: 'pointer', minHeight: 48 },
  provider: { border: '1px solid #303949', background: '#121720', color: '#eef1f6', borderRadius: 14, padding: 15, textAlign: 'left', cursor: 'pointer', minHeight: 74, display: 'grid', gap: 5 },
  providerGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginTop: 12 },
  providerRow: { display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  selectedProvider: { border: '1px solid #d4af37', background: 'rgba(212,175,55,.14)', color: '#f7d77b', borderRadius: 11, padding: '10px 13px', fontWeight: 900, minHeight: 44 },
  secondaryActions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 },
  jobSummary: { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginTop: 10 },
  message: { margin: '0 0 16px', padding: 12, borderRadius: 12, background: '#121720', border: '1px solid #2b3442', color: '#ccd4df', fontSize: 13, lineHeight: 1.45 },
  neverForget: {
    background: 'linear-gradient(160deg,#16120a,#0f1218)',
    border: '1px solid rgba(212,175,55,.35)',
    borderRadius: 20,
    padding: '20px 18px 18px',
    marginBottom: 18,
  },
  neverForgetHead: { marginBottom: 14 },
  winLine: { marginTop: 8, color: '#e8e0c8', fontSize: 15, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.35 },
  steps: {
    margin: '0 0 16px',
    paddingLeft: 22,
    color: '#eef1f6',
    fontSize: 14,
    lineHeight: 1.5,
  },
  stepBody: { marginTop: 4, color: '#a8b0bd', fontSize: 13, lineHeight: 1.55, fontWeight: 500 },
  code: {
    background: '#0a0d12',
    border: '1px solid #2a3340',
    borderRadius: 6,
    padding: '1px 6px',
    fontSize: 12,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
    color: '#f0d78c',
  },
  refreshBox: {
    background: '#0a0d12',
    border: '1px solid #2a3340',
    borderRadius: 14,
    padding: 14,
  },
  pre: {
    margin: '10px 0 10px',
    padding: 12,
    background: '#06080c',
    borderRadius: 10,
    overflowX: 'auto',
    fontSize: 12,
    lineHeight: 1.5,
    color: '#c8d0dc',
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
}
