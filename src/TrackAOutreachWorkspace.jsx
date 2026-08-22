import React, { useEffect, useMemo, useState } from 'react';

const emptyDealer = { id: '', name: '', ownerName: '', email: '', website: '', location: '', sampleCar: '', stockCount: '', notes: '', status: '', emailStage: 0, previousEmails: {} };
const readDealer = () => {
  const raw = new URLSearchParams(window.location.search).get('dealer');
  if (!raw) return emptyDealer;
  try { return JSON.parse(decodeURIComponent(raw)); } catch { try { return JSON.parse(raw); } catch { return emptyDealer; } }
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
  const [dealer] = useState(readDealer);
  const [status, setStatus] = useState('Starting');
  const [jobId, setJobId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mailOpened, setMailOpened] = useState(false);
  const [copied, setCopied] = useState('');
  const displayName = useMemo(() => text(dealer.ownerName) || 'there', [dealer.ownerName]);
  const email = text(dealer.email);

  useEffect(() => {
    let stopped = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      try {
        setStatus('Qwen is researching the angle…');
        const q = await fetch('/api/queue-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'queue_outreach', dealer }) });
        const queued = await q.json();
        if (!q.ok) throw new Error(queued.error || 'Could not queue Qwen outreach');
        setJobId(queued.jobId); setStatus('Qwen is writing Email 1…');
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
  }, [dealer]);

  function copy(value, key) {
    navigator.clipboard?.writeText(String(value || '')); setCopied(key); window.setTimeout(() => setCopied(''), 1000);
  }
  function openMail() {
    if (!result) return;
    if (!email) return setError('No email address is stored for this dealer. Add it in the CRM first.');
    const subject = result.recommended_subject || result.subject_options?.[0] || '';
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(result.email || '')}`;
    setMailOpened(true);
  }
  function markSent() {
    if (!dealer.id) return;
    const opener = window.opener;
    if (opener && !opener.closed) {
      try { opener.location.href = `${opener.location.pathname.split('?')[0]}?markSent=${encodeURIComponent(dealer.id)}`; opener.focus?.(); window.close(); return; } catch {}
    }
    setError('Return to the CRM tab and refresh it. The outreach package remains saved in Qwen history.');
  }
  const canSend = Boolean(email && result?.email);

  const pill = { background: '#11151d', border: '1px solid #2a3341', borderRadius: 999, padding: '9px 12px', color: '#a9b2bf', fontSize: 11 };
  const card = { background: '#11151d', border: '1px solid #252d3b', borderRadius: 20, padding: 20 };
  const label = { color: '#7f899a', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 };

  return <div style={{ minHeight: '100vh', background: '#0b0d12', color: '#f3f4f7', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', padding: '34px 24px 80px' }}>
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 24 }}>
        <div><div style={{ color: '#d4af37', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.18em', fontWeight: 900 }}>Cornerstone · Track A Outreach</div><h1 style={{ margin: '9px 0 8px', fontSize: 44, lineHeight: .98, letterSpacing: '-.05em' }}>Email 1 for {dealer.name || 'this dealer'}</h1><p style={{ margin: 0, color: '#98a2b1', maxWidth: 780, lineHeight: 1.65 }}>Qwen researches the angle, builds the pattern interrupt and writes the reply-oriented email. You review it, make the sample image, and send.</p></div><div style={pill}>{status}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <section style={card}><div style={{ ...label, marginBottom: 12 }}>Dealer context</div><div style={{ display: 'grid', gap: 9 }}>{[['Contact',displayName],['Email',email||'Missing'],['Location',text(dealer.location)||'Not supplied'],['Sample vehicle',text(dealer.sampleCar)||'Choose a vehicle'],['Stock',text(dealer.stockCount)||'Not supplied'],['Website',text(dealer.website)||'Not supplied']].map(([k,v])=><div key={k}><div style={{ color:'#6e7889',fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:900 }}>{k}</div><div style={{ marginTop:4,color:'#e2e6ee',fontSize:13 }}>{v}</div></div>)}</div></section>
        <section style={card}><div style={{ ...label, marginBottom: 12 }}>What Qwen is optimising</div><div style={{ display:'grid',gap:9,color:'#dfe4eb',fontSize:13,lineHeight:1.55 }}><div>• Open rate: short, human, curiosity-led subject line</div><div>• Reply rate: pattern interrupt + curiosity gap</div><div>• Specificity without invented dealership facts</div><div>• Sample-first CTA, no hard sell</div><div>• Founder voice with restrained dealership banter</div><div>• Format-archaeology thinking adapted to dealer outreach</div></div></section>
      </div>

      {error && <div style={{ marginBottom:16,padding:14,borderRadius:14,background:'rgba(176,77,61,.08)',border:'1px solid rgba(176,77,61,.3)',color:'#f0b5a8' }}>{error}</div>}

      {!result ? <section style={{ minHeight:330, display:'grid',placeItems:'center',...card }}><div style={{ textAlign:'center' }}><div style={{ fontSize:34, marginBottom:10 }}>✦</div><div style={{ fontSize:18,fontWeight:900 }}>Building the outreach package</div><div style={{ color:'#7f899a',marginTop:7 }}>{status}</div>{jobId && <div style={{ color:'#586273',fontSize:10,marginTop:10 }}>Job {jobId.slice(0,8)}</div>}</div></section> : <div style={{ display:'grid',gap:14 }}>
        <section style={{ ...card, borderColor:'rgba(212,175,55,.28)' }}><div style={{ ...label, color:'#d4af37' }}>Recommended subject</div><div style={{ marginTop:8,fontSize:26,fontWeight:900,letterSpacing:'-.03em' }}>{result.recommended_subject}</div><div style={{ display:'flex',gap:8,flexWrap:'wrap',marginTop:12 }}>{(result.subject_options||[]).map((s,i)=><button key={`${s}-${i}`} onClick={()=>copy(s,`s${i}`)} style={{ background:'#0d1118',color:'#cfd5df',border:'1px solid #2a3340',borderRadius:10,padding:'8px 10px',cursor:'pointer' }}>{copied===`s${i}`?'Copied':`Option ${i+1}: ${s}`}</button>)}</div></section>
        <section style={card}><div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:12 }}><div style={{ ...label,color:'#d4af37' }}>Email 1</div><button onClick={()=>copy(result.email,'body')} style={{ background:'#0d1118',color:'#cfd5df',border:'1px solid #2a3340',borderRadius:10,padding:'7px 10px',cursor:'pointer' }}>{copied==='body'?'Copied':'Copy email'}</button></div><pre style={{ whiteSpace:'pre-wrap',fontFamily:'inherit',color:'#eef1f5',lineHeight:1.72,fontSize:15,margin:'14px 0 0' }}>{result.email}</pre><div style={{ marginTop:18,display:'flex',gap:9,flexWrap:'wrap' }}><button onClick={openMail} disabled={!canSend} style={{ border:0,background:canSend?'#d4af37':'#3a3f48',color:'#17120a',borderRadius:11,padding:'11px 15px',fontWeight:900,cursor:canSend?'pointer':'not-allowed' }}>{mailOpened?'Mail app opened':'Open in Mail'}</button><button onClick={()=>copy(result.email,'body2')} style={{ background:'#0d1118',color:'#e8ebf0',border:'1px solid #303948',borderRadius:11,padding:'11px 15px',fontWeight:800,cursor:'pointer' }}>Copy & Paste</button></div></section>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}><section style={card}><div style={label}>Why this should get a reply</div><p style={{ color:'#dfe4eb',lineHeight:1.65 }}>{result.why_this_should_get_a_reply}</p><div style={{ ...label,marginTop:14 }}>Pattern interrupt</div><p style={{ color:'#dfe4eb',lineHeight:1.65 }}>{result.pattern_interrupt}</p></section><section style={card}><div style={label}>Sample image brief</div><p style={{ color:'#dfe4eb',lineHeight:1.65 }}>{result.sample_image_brief}</p><div style={{ ...label,marginTop:14 }}>CTA</div><p style={{ color:'#dfe4eb',lineHeight:1.65 }}>{result.cta}</p></section></div>
        <section style={card}><div style={label}>5-day follow-up sequence</div><div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:12 }}>{Object.entries(result.followup_plan||{}).map(([day,angle])=><div key={day} style={{ background:'#0d1118',border:'1px solid #252d3b',borderRadius:12,padding:12 }}><div style={{ color:'#d4af37',fontSize:10,textTransform:'uppercase',fontWeight:900 }}>{day.replaceAll('_',' ')}</div><div style={{ color:'#cbd2dc',marginTop:6,fontSize:12,lineHeight:1.55 }}>{angle}</div></div>)}</div></section>
        <section style={{ display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',background:'#0e1219',border:'1px solid #252d3b',borderRadius:16,padding:16 }}><div><div style={{ fontWeight:900 }}>Next: make the sample image</div><div style={{ color:'#7f899a',marginTop:4,fontSize:12 }}>{result.sample_vehicle||dealer.sampleCar||'Choose the strongest current listing'} · Review Email 1, then send it.</div></div><button onClick={markSent} disabled={!dealer.id} style={{ background:'#0d1118',color:'#d9dee7',border:'1px solid #303948',borderRadius:10,padding:'10px 12px',fontWeight:800 }}>I sent it → update CRM</button></section>
      </div>}
    </div>
  </div>;
}
