import React, { useEffect, useMemo, useState } from 'react';

const APP_ORIGIN = window.location.origin;

function readContext() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('dealer');
  if (!raw) return { id: '', name: '', ownerName: '', email: '', website: '', location: '', sampleCar: '', stockCount: '', notes: '', status: '', emailStage: 0 };
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    try { return JSON.parse(raw); } catch { return { id: '', name: '', ownerName: '', email: '', website: '', location: '', sampleCar: '', stockCount: '', notes: '', status: '', emailStage: 0 }; }
  }
}

function parseResult(value) {
  const text = String(value || '').replace(/```json|```/gi, '').trim();
  try { return JSON.parse(text); } catch {}
  const start = text.search(/[\[{]/);
  if (start < 0) throw new Error('Qwen returned invalid JSON');
  const opener = text[start];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0; let quote = false; let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') quote = false;
    } else if (ch === '"') quote = true;
    else if (ch === opener) depth += 1;
    else if (ch === closer) {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error('Qwen returned incomplete JSON');
}

const safe = (v) => String(v ?? '').trim();

export default function TrackAOutreachWorkspace() {
  const [dealer] = useState(readContext);
  const [status, setStatus] = useState('Starting');
  const [jobId, setJobId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mailOpened, setMailOpened] = useState(false);
  const [copied, setCopied] = useState('');

  const displayName = useMemo(() => safe(dealer.ownerName) || 'there', [dealer.ownerName]);
  const email = safe(dealer.email);

  useEffect(() => {
    let stopped = false;
    async function run() {
      try {
        setStatus('Qwen is researching the angle…');
        const response = await fetch(`${APP_ORIGIN}/api/queue-outreach`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealer }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not queue outreach job');
        if (stopped) return;
        setJobId(payload.jobId);
        setStatus('Qwen is writing Email 1…');

        const deadline = Date.now() + 20 * 60 * 1000;
        while (Date.now() < deadline && !stopped) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const jobRes = await fetch(`${APP_ORIGIN}/api/outreach-job?id=${encodeURIComponent(payload.jobId)}`);
          const job = await jobRes.json();
          if (!jobRes.ok) throw new Error(job.error || 'Could not read Qwen job');
          if (job.status === 'completed') {
            const parsed = parseResult(job.result);
            if (!stopped) {
              setResult(parsed);
              setStatus('Ready to review');
            }
            return;
          }
          if (job.status === 'error') throw new Error(job.error_message || 'Qwen failed');
        }
        throw new Error('Qwen timed out. Make sure the local Qwen worker is running.');
      } catch (e) {
        if (!stopped) { setError(e?.message || String(e)); setStatus('Needs attention'); }
      }
    }
    run();
    return () => { stopped = true; };
  }, [dealer]);

  function copy(text, key) {
    navigator.clipboard?.writeText(String(text || ''));
    setCopied(key);
    window.setTimeout(() => setCopied(''), 1200);
  }

  function openMail() {
    if (!result) return;
    if (!email) return setError('No email address is stored for this dealer. Add the email in the CRM first.');
    const subject = result.recommended_subject || result.subject_options?.[0] || '';
    const body = result.email || '';
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setMailOpened(true);
  }

  function markSent() {
    if (!dealer.id) return;
    const target = window.opener;
    if (target && !target.closed) {
      try {
        target.location.href = `${target.location.pathname.split('?')[0]}?markSent=${encodeURIComponent(dealer.id)}`;
        target.focus?.();
        window.close();
        return;
      } catch {}
    }
    setError('Return to the CRM tab and use the updated Email 1 action to mark the message as sent.');
  }

  const canSend = Boolean(email && result?.email);

  return (
    <div style={{ minHeight: '100vh', background: '#0b0d12', color: '#f3f4f7', padding: '34px 24px 80px', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 26 }}>
          <div>
            <div style={{ color: '#d4af37', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.18em', fontWeight: 900 }}>Cornerstone · Track A Outreach</div>
            <h1 style={{ margin: '10px 0 8px', fontSize: 44, lineHeight: .98, letterSpacing: '-.05em' }}>Email 1 for {dealer.name || 'this dealer'}</h1>
            <p style={{ margin: 0, color: '#98a2b1', maxWidth: 780, lineHeight: 1.65 }}>Qwen is doing the research and copywriting. Your job is the judgement: review it, make the sample image, and send.</p>
          </div>
          <div style={{ padding: '10px 13px', borderRadius: 999, border: '1px solid #2a3343', color: '#a7b0bf', fontSize: 11 }}>{status}</div>
        </div>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
          <div style={{ background: '#11151d', border: '1px solid #252d3b', borderRadius: 18, padding: 18 }}>
            <div style={{ color: '#7f899a', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900, marginBottom: 12 }}>Dealer context</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[['Contact', displayName], ['Email', email || 'Missing'], ['Location', safe(dealer.location) || 'Not supplied'], ['Sample vehicle', safe(dealer.sampleCar) || 'Choose a vehicle'], ['Stock', safe(dealer.stockCount) || 'Not supplied'], ['Website', safe(dealer.website) || 'Not supplied']].map(([label, value]) => <div key={label}><div style={{ color: '#6e7889', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 900 }}>{label}</div><div style={{ marginTop: 4, color: '#e2e6ee', fontSize: 13 }}>{value}</div></div>)}
            </div>
          </div>
          <div style={{ background: '#11151d', border: '1px solid #252d3b', borderRadius: 18, padding: 18 }}>
            <div style={{ color: '#7f899a', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900, marginBottom: 12 }}>What Qwen is optimising</div>
            <div style={{ display: 'grid', gap: 9, color: '#dfe4eb', fontSize: 13, lineHeight: 1.55 }}>
              <div>• Open rate through a short, human subject line</div>
              <div>• Reply rate through a pattern interrupt + curiosity gap</div>
              <div>• Specificity without inventing dealership facts</div>
              <div>• Sample-first CTA rather than a heavy sales pitch</div>
              <div>• Human founder voice with restrained dealership banter</div>
            </div>
          </div>
        </section>

        {error && <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: 'rgba(176,77,61,.08)', border: '1px solid rgba(176,77,61,.3)', color: '#f0b5a8' }}>{error}</div>}

        {!result ? (
          <section style={{ minHeight: 330, display: 'grid', placeItems: 'center', background: '#11151d', border: '1px solid #252d3b', borderRadius: 22 }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 34, marginBottom: 10 }}>✦</div><div style={{ fontSize: 18, fontWeight: 900 }}>Building the outreach package</div><div style={{ color: '#7f899a', marginTop: 7 }}>{status}</div>{jobId && <div style={{ color: '#586273', fontSize: 10, marginTop: 10 }}>Job {jobId.slice(0, 8)}</div>}</div>
          </section>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            <section style={{ background: '#11151d', border: '1px solid rgba(212,175,55,.28)', borderRadius: 22, padding: 22 }}>
              <div style={{ color: '#d4af37', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>Recommended subject</div>
              <div style={{ marginTop: 9, fontSize: 26, fontWeight: 900, letterSpacing: '-.03em' }}>{result.recommended_subject}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{(result.subject_options || []).map((s, i) => <button key={`${s}-${i}`} onClick={() => copy(s, `s${i}`)} style={{ background: '#0d1118', color: '#cfd5df', border: '1px solid #2a3340', borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}>{copied === `s${i}` ? 'Copied' : `Option ${i + 1}: ${s}`}</button>)}</div>
            </section>

            <section style={{ background: '#11151d', border: '1px solid #252d3b', borderRadius: 22, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><div style={{ color: '#d4af37', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>Email 1</div><button onClick={() => copy(result.email, 'body')} style={{ background: '#0d1118', color: '#cfd5df', border: '1px solid #2a3340', borderRadius: 10, padding: '7px 10px', cursor: 'pointer' }}>{copied === 'body' ? 'Copied' : 'Copy email'}</button></div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#eef1f5', lineHeight: 1.72, fontSize: 15, margin: '14px 0 0' }}>{result.email}</pre>
              <div style={{ marginTop: 18, display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <button onClick={openMail} disabled={!canSend} style={{ border: 0, background: canSend ? '#d4af37' : '#3a3f48', color: '#17120a', borderRadius: 11, padding: '11px 15px', fontWeight: 900, cursor: canSend ? 'pointer' : 'not-allowed' }}>{mailOpened ? 'Mail app opened' : 'Open in Mail'}</button>
                <button onClick={() => copy(result.email, 'body2')} style={{ background: '#0d1118', color: '#e8ebf0', border: '1px solid #303948', borderRadius: 11, padding: '11px 15px', fontWeight: 800, cursor: 'pointer' }}>Copy & Paste</button>
              </div>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: '#11151d', border: '1px solid #252d3b', borderRadius: 18, padding: 18 }}><div style={{ color: '#7f899a', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>Why this should get a reply</div><p style={{ color: '#dfe4eb', lineHeight: 1.65, marginBottom: 0 }}>{result.why_this_should_get_a_reply}</p></div>
              <div style={{ background: '#11151d', border: '1px solid #252d3b', borderRadius: 18, padding: 18 }}><div style={{ color: '#7f899a', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>Sample image brief</div><p style={{ color: '#dfe4eb', lineHeight: 1.65, marginBottom: 0 }}>{result.sample_image_brief}</p></div>
            </section>

            <section style={{ background: '#11151d', border: '1px solid #252d3b', borderRadius: 18, padding: 18 }}>
              <div style={{ color: '#7f899a', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>5-day sequence</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 12 }}>{Object.entries(result.followup_plan || {}).map(([day, angle]) => <div key={day} style={{ background: '#0d1118', border: '1px solid #252d3b', borderRadius: 12, padding: 12 }}><div style={{ color: '#d4af37', fontSize: 10, textTransform: 'uppercase', fontWeight: 900 }}>{day.replaceAll('_', ' ')}</div><div style={{ color: '#cbd2dc', marginTop: 6, fontSize: 12, lineHeight: 1.55 }}>{angle}</div></div>)}</div>
            </section>

            <section style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', background: '#0e1219', border: '1px solid #252d3b', borderRadius: 16, padding: 16 }}>
              <div><div style={{ fontWeight: 900 }}>Next: make the sample image</div><div style={{ color: '#7f899a', marginTop: 4, fontSize: 12 }}>{result.sample_vehicle || dealer.sampleCar || 'Choose the strongest current listing'} · Then send Email 1.</div></div>
              <button onClick={markSent} disabled={!dealer.id} style={{ background: '#0d1118', color: '#d9dee7', border: '1px solid #303948', borderRadius: 10, padding: '10px 12px', fontWeight: 800 }}>I sent it → update CRM</button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
