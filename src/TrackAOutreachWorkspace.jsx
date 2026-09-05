import React, { useEffect, useMemo, useState } from 'react';

const emptyBusiness = { id: '', name: '', decisionMaker: '', email: '', website: '', location: '', vertical: '', offer: '', leadSource: '', knownSignal: '', notes: '', status: '', emailStage: 0, previousEmails: {} };
const readBusiness = () => {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('business') || params.get('dealer');
  if (!raw) return emptyBusiness;
  try { return JSON.parse(decodeURIComponent(raw)); } catch { try { return JSON.parse(raw); } catch { return emptyBusiness; } }
};
const text = (v) => String(v ?? '').trim();
function parseJson(value) {
  const s = String(value || '').replace(/```json|```/gi, '').trim();
  try { return JSON.parse(s); } catch {}
  const start = s.search(/[\[{]/); if (start < 0) throw new Error('Qwen returned invalid JSON');
  const open = s[start], close = open === '{' ? '}' : ']'; let depth = 0; let quote = false; let escape = false;
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i];
    if (quote) { if (escape) escape = false; else if (ch === '\\') escape = true; else if (ch === '"') quote = false; }
    else if (ch === '"') quote = true;
    else if (ch === open) depth += 1;
    else if (ch === close) { depth -= 1; if (depth === 0) return JSON.parse(s.slice(start, i + 1)); }
  }
  throw new Error('Qwen returned incomplete JSON');
}

export default function TrackAOutreachWorkspace() {
  const [business] = useState(readBusiness);
  const [status, setStatus] = useState('Starting');
  const [jobId, setJobId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mailOpened, setMailOpened] = useState(false);
  const [copied, setCopied] = useState('');
  const displayName = useMemo(() => text(business.decisionMaker || business.ownerName || business.contact) || 'there', [business]);
  const email = text(business.email);

  useEffect(() => {
    let stopped = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      try {
        setStatus('Qwen is researching the leakage angle…');
        const q = await fetch('/api/queue-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'queue_outreach', business }) });
        const queued = await q.json();
        if (!q.ok) throw new Error(queued.error || 'Could not queue Qwen outreach');
        setJobId(queued.jobId); setStatus('Qwen is writing the recovery message…');
        const deadline = Date.now() + 20 * 60 * 1000;
        while (!stopped && Date.now() < deadline) {
          await sleep(3000);
          const r = await fetch(`/api/queue-update?action=outreach_status&id=${encodeURIComponent(queued.jobId)}`);
          const job = await r.json();
          if (!r.ok) throw new Error(job.error || 'Could not read Qwen job');
          if (job.status === 'completed') { setResult(parseJson(job.result)); setStatus('Ready to review'); return; }
          if (job.status === 'error') throw new Error(job.error_message || 'Qwen failed');
        }
        throw new Error('Qwen timed out. Make sure the local Qwen worker is running.');
      } catch (e) { if (!stopped) { setError(e?.message || String(e)); setStatus('Needs attention'); } }
    })();
    return () => { stopped = true; };
  }, [business]);

  function copy(value, key) {
    navigator.clipboard?.writeText(String(value || '')); setCopied(key); window.setTimeout(() => setCopied(''), 1000);
  }
  function openMail() {
    if (!result) return;
    if (!email) return setError('No email address is stored for this business. Add it in the CRM first.');
    const subject = result.recommended_subject || result.subject_options?.[0] || '';
    const body = result.email || '';
    const href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const a = document.createElement('a');
    a.href = href;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    try { window.location.href = href; } catch {}
    setMailOpened(true);
  }
  function markSent() {
    if (!business.id) return;
    const opener = window.opener;
    if (opener && !opener.closed) {
      try { opener.location.href = `${opener.location.pathname.split('?')[0]}?markSent=${encodeURIComponent(business.id)}`; opener.focus?.(); window.close(); return; } catch {}
    }
    setError('Return to the Revenue Recovery CRM tab and refresh it. The outreach package remains saved in Qwen history.');
  }
  const canSend = Boolean(email && result?.email);
  const pill = { background: '#11151d', border: '1px solid #2a3341', borderRadius: 999, padding: '9px 12px', color: '#a9b2bf', fontSize: 11, alignSelf: 'flex-start' };
  const card = { background: '#11151d', border: '1px solid #252d3b', borderRadius: 20, padding: 20 };
  const label = { color: '#7f899a', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 };

  return <div className="ta-outreach">
    <div className="ta-outreach-inner">
      <div className="ta-outreach-head">
        <div>
          <div style={{ color: '#8d99ab', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.18em', fontWeight: 900 }}>Cornerstone · Track A Revenue Recovery</div>
          <h1 style={{ margin: '9px 0 8px', fontSize: 44, lineHeight: .98, letterSpacing: '-.05em' }}>Recovery conversation for {business.name || 'this business'}</h1>
          <p style={{ margin: 0, color: '#98a2b1', maxWidth: 800, lineHeight: 1.65 }}>Qwen researches the revenue-leakage angle and writes a prospect-first message. When ready, use <strong>Open in Mail</strong> to open your mail app with the subject and body filled in.</p>
        </div>
        <div style={pill}>{status}</div>
      </div>

      <div className="ta-outreach-grid-2">
        <section style={card}><div style={{ ...label, marginBottom: 12 }}>Business context</div><div style={{ display: 'grid', gap: 9 }}>{[['Decision maker',displayName],['Email',email||'Missing'],['Location',text(business.location)||'Not supplied'],['Vertical',text(business.vertical)||'Not supplied'],['Offer / transaction',text(business.offer)||'Not supplied'],['Lead source',text(business.leadSource)||'Not supplied'],['Known signal',text(business.knownSignal)||'Not supplied']].map(([k,v])=><div key={k}><div style={{ color:'#6e7889',fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:900 }}>{k}</div><div style={{ marginTop:4,color:'#e2e6ee',fontSize:13,overflowWrap:'anywhere' }}>{v}</div></div>)}</div></section>
        <section style={card}><div style={{ ...label, marginBottom: 12 }}>What the engine is optimising</div><div style={{ display:'grid',gap:9,color:'#dfe4eb',fontSize:13,lineHeight:1.55 }}><div>• Identify the likely revenue leakage point</div><div>• Start with the prospect's operational pain, not Cornerstone</div><div>• Make the cost of stale opportunities understandable</div><div>• Ask one question that is easy to answer</div><div>• Keep claims grounded in supplied facts or common workflow risks</div><div>• Position AI as the mechanism, not the headline</div></div></section>
      </div>

      {error && <div style={{ marginBottom:16,padding:14,borderRadius:14,background:'rgba(176,77,61,.08)',border:'1px solid rgba(176,77,61,.3)',color:'#f0b5a8' }}>{error}</div>}

      {!result ? <section style={{ minHeight:280, display:'grid',placeItems:'center',...card }}><div style={{ textAlign:'center',padding:'12px' }}><div style={{ fontSize:34, marginBottom:10 }}>↗</div><div style={{ fontSize:18,fontWeight:900 }}>Building the recovery outreach package</div><div style={{ color:'#7f899a',marginTop:7 }}>{status}</div>{jobId && <div style={{ color:'#586273',fontSize:10,marginTop:10 }}>Job {jobId.slice(0,8)}</div>}</div></section> : <div style={{ display:'grid',gap:14 }}>
        <section style={{ ...card, borderColor:'rgba(146,157,174,.28)' }}><div style={{ ...label }}>Recommended subject</div><div style={{ marginTop:8,fontSize:'clamp(18px,5vw,26px)',fontWeight:900,letterSpacing:'-.03em',overflowWrap:'anywhere' }}>{result.recommended_subject}</div><div style={{ display:'flex',gap:8,flexWrap:'wrap',marginTop:12 }}>{(result.subject_options||[]).map((s,i)=><button key={`${s}-${i}`} onClick={()=>copy(s,`s${i}`)} style={{ background:'#0d1118',color:'#cfd5df',border:'1px solid #2a3340',borderRadius:10,padding:'10px 12px',cursor:'pointer',minHeight:44 }}>{copied===`s${i}`?'Copied':`Option ${i+1}: ${s}`}</button>)}</div></section>
        <section style={card}><div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap' }}><div style={{ ...label }}>Recovery email</div></div><pre style={{ whiteSpace:'pre-wrap',fontFamily:'inherit',color:'#eef1f5',lineHeight:1.72,fontSize:15,margin:'14px 0 0',overflowWrap:'anywhere' }}>{result.email}</pre><div className="ta-outreach-actions" style={{ marginTop: 18 }}><button onClick={openMail} disabled={!canSend} style={{ border:0,background:canSend?'#e1ddd2':'#3a3f48',color:'#17191d',borderRadius:11,padding:'14px 18px',fontWeight:900,cursor:canSend?'pointer':'not-allowed',fontSize:13,minHeight:52 }}>{mailOpened?'Mail app opened — check Mail':'Open in Mail'}</button><button onClick={()=>copy(result.email,'body')} style={{ background:'#0d1118',color:'#e8ebf0',border:'1px solid #303948',borderRadius:11,padding:'14px 18px',fontWeight:800,cursor:'pointer',minHeight:52 }}>{copied==='body'?'Copied':'Copy email'}</button></div>{!email && <div style={{ marginTop:10,color:'#f0b5a8',fontSize:12 }}>No email on this record. Add one in the CRM, then Open in Mail will work.</div>}</section>
        <div className="ta-outreach-grid-2"><section style={card}><div style={label}>Why this should get a reply</div><p style={{ color:'#dfe4eb',lineHeight:1.65 }}>{result.why_this_should_get_a_reply}</p><div style={{ ...label,marginTop:14 }}>Leakage angle</div><p style={{ color:'#dfe4eb',lineHeight:1.65 }}>{result.recovery_opportunity || result.pattern_interrupt}</p></section><section style={card}><div style={label}>Diagnostic call</div><ul style={{ color:'#dfe4eb',lineHeight:1.65,paddingLeft:18 }}>{(result.discovery_questions||[]).map((q,i)=><li key={i}>{q}</li>)}</ul><div style={{ ...label,marginTop:14 }}>CTA</div><p style={{ color:'#dfe4eb',lineHeight:1.65 }}>{result.cta}</p></section></div>
        <section style={card}><div style={label}>Follow-up sequence</div><div className="ta-outreach-grid-4">{Object.entries(result.followup_plan||{}).map(([day,angle])=><div key={day} style={{ background:'#0d1118',border:'1px solid #252d3b',borderRadius:12,padding:12 }}><div style={{ color:'#9ca8b8',fontSize:10,textTransform:'uppercase',fontWeight:900 }}>{day.replaceAll('_',' ')}</div><div style={{ color:'#cbd2dc',marginTop:6,fontSize:12,lineHeight:1.55 }}>{angle}</div></div>)}</div></section>
        <section style={{ display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',background:'#0e1219',border:'1px solid #252d3b',borderRadius:16,padding:16 }}><div style={{ minWidth:0,flex:1 }}><div style={{ fontWeight:900 }}>Next: review the leakage hypothesis</div><div style={{ color:'#7f899a',marginTop:4,fontSize:12 }}>The call is where baseline, volume, stage-by-stage leakage and recoverability are established.</div></div><button onClick={markSent} disabled={!business.id} style={{ background:'#0d1118',color:'#d9dee7',border:'1px solid #303948',borderRadius:10,padding:'12px 14px',fontWeight:800,minHeight:48,width:'100%',maxWidth:320 }}>I sent it → update CRM</button></section>
      </div>}
    </div>
  </div>;
}
