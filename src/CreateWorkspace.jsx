import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';

const NICHES=['Gaming','History','Stories','Documentary','Business / money','Technology','Lifestyle','Other'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clean=v=>String(v??'').trim();
function parseJson(text){
 const value=clean(text).replace(/```json|```/gi,'').replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/<analysis>[\s\S]*?<\/analysis>/gi,'').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi,'').replace(/<\|im_end\|>|<\|endoftext\|>/gi,'').trim();
 try{return JSON.parse(value)}catch{}
 const start=value.search(/[\[{]/);if(start<0)throw new Error('Cornerstone could not understand the returned package.');
 const open=value[start],close=open==='{'?'}':']';let depth=0,quoted=false,escaped=false;
 for(let i=start;i<value.length;i++){const c=value[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}if(c==='"'){quoted=true;continue}if(c===open)depth++;else if(c===close&&--depth===0){try{return JSON.parse(value.slice(start,i+1))}catch{break}}}
 throw new Error('Cornerstone returned an incomplete package.');
}
async function api(action,payload={}){const r=await fetch('/api/queue-update',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action,...payload})});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||`Request failed (${r.status})`);return b;}
async function waitJob(id,setMessage){const until=Date.now()+45*60*1000;let last='queued';while(Date.now()<until){const r=await fetch(`/api/queue-update?action=job_status&id=${encodeURIComponent(id)}`,{credentials:'same-origin',cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Could not read the job.');if(b.status!==last){last=b.status;setMessage(`Cornerstone is ${b.status==='processing'?'thinking':b.status}…`)}if(b.status==='completed')return b.result||'';if(b.status==='error')throw new Error(b.error_message||'The package could not be completed.');await sleep(2500)}throw new Error('This is taking longer than expected. Open System and check local intelligence.');}
async function online(){try{const{data}=await supabase.from('local_ai_worker_heartbeat').select('status,last_seen').eq('id','qwen').maybeSingle();return Boolean(data?.last_seen&&Date.now()-new Date(data.last_seen).getTime()<90000&&String(data.status||'').toLowerCase()!=='offline')}catch{return false}}

export default function CreateWorkspace(){
 const[url,setUrl]=useState(''),[notes,setNotes]=useState(''),[niche,setNiche]=useState('Gaming'),[file,setFile]=useState(null),[learning,setLearning]=useState(null),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{supabase.from('track_b_learning_recommendations').select('id,recommendation_type,hook_type,format,invariant_pattern,confidence,source_evidence_id').eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle().then(({data})=>setLearning(data||null))},[]);
 const selected=result?.selected_video;const shorts=useMemo(()=>result?.shorts||result?.short_form||[],[result]);const scenes=useMemo(()=>result?.scene_directions||result?.scene_options||result?.possible_scenes||selected?.scene_directions||selected?.visual_directions||[],[result,selected]);
 async function run(){
  if(!url.trim()&&!notes.trim()&&!file){setMessage('Start with a reference, a thought, or a source file.');return}
  if(!(await online())){setMessage('Cornerstone is offline. Open System and start local intelligence.');return}
  setBusy(true);setSaved(false);setResult(null);setMessage('Reading the opportunity…');
  try{
   let evidence=null;
   if(file){const{data:u,error:ue}=await supabase.auth.getUser();if(ue||!u?.user)throw new Error('Please sign in to upload a source.');const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'_');const path=`${u.user.id}/${crypto.randomUUID()}-${safe}`;const up=await supabase.storage.from('track-b-source-media').upload(path,file,{contentType:file.type||'application/octet-stream'});if(up.error)throw new Error(up.error.message);setMessage('Inspecting your source…');const q=await api('queue_media_ingestion',{userId:u.user.id,objectPath:path,fileName:file.name,contentType:file.type});const raw=await waitJob(q.jobId,setMessage);const ing=parseJson(raw);if(ing?.text_analysis_job_id){const a=await waitJob(ing.text_analysis_job_id,setMessage);evidence={ingestion:ing,text_analysis:parseJson(a)}}}
   setMessage(learning?'Using the latest learning signal…':'Finding the strongest opportunity…');
   const learningNotes=learning?`\n\nMEASURED LEARNING SIGNAL (direction only, not proof of the new package):\n${JSON.stringify(learning)}\n\nPreserve the strongest invariant mechanism, vary the execution, and do not copy the winning asset.`:'';
   const q=await api('queue_content_engine',{niche,channel:'',referenceUrl:url,referenceNotes:`${notes}${learningNotes}`,duration:'20',output:'Long-form + Shorts',direction:'Create a materially original package. Use the underlying mechanism only. Never copy wording, identity, branding, scenes, footage or distinctive packaging. Include practical original scene directions.',sourceAnalysis:evidence});
   const raw=await waitJob(q.jobId,setMessage);setResult(parseJson(raw));setMessage('Your piece is ready.');
  }catch(e){setMessage(e?.message||String(e))}finally{setBusy(false)}
 }
 async function save(){
  if(!selected||saved)return;setBusy(true);setMessage('Saving the piece…');
  try{const bestTitle=selected.titles?.[0]?.title||selected.topic||'Original package';const hashtags=Array.isArray(selected.seo?.hashtags)?selected.seo.hashtags.join(' '):'';const brief={topic:selected.topic||null,angle:selected.angle||null,why_this_should_work:selected.why_this_should_work||null,hook:selected.hook_0_5s||'',caption:selected.script||'',hashtags,cta:selected.seo?.next_video_cta||'',photo_idea:selected.thumbnails?.[0]?.composition||'',photo_direction:JSON.stringify(selected.visual_timeline||[]),selected_video:selected,shorts,scene_directions:scenes,learning_recommendation:learning};const{error}=await supabase.rpc('create_track_b_content_package',{p_title:bestTitle,p_source_url:url||null,p_source_type:'creative_brief',p_brief:brief,p_source_evidence:result?.reference_analysis||{},p_platform:'YouTube',p_hook:selected.hook_0_5s||'',p_caption:selected.script||'',p_hashtags:hashtags,p_cta:selected.seo?.next_video_cta||'',p_photo_idea:selected.thumbnails?.[0]?.composition||'',p_photo_direction:JSON.stringify(selected.visual_timeline||[]),p_post_type:'Long-form + Shorts',p_content_queue_id:`ce-${crypto.randomUUID()}`});if(error)throw error;setSaved(true);setMessage('Saved. It is ready to make.')}catch(e){setMessage(e?.message||String(e))}finally{setBusy(false)}
 }

 return (
  <main className="cw">
    <style>{`
      .cw { display: grid; gap: 20px; color: var(--text); }
      .cw-panel {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--panel);
        overflow: hidden;
      }
      .cw-panel-head {
        display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
        padding: 18px 20px; border-bottom: 1px solid var(--line);
      }
      .cw-panel-head .k {
        font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
        text-transform: uppercase; color: var(--text-3);
      }
      .cw-panel-head h2 {
        margin: 6px 0 0; font-size: 20px; font-weight: 600; letter-spacing: -0.03em;
      }
      .cw-learn {
        flex-shrink: 0;
        padding: 6px 10px; border-radius: 999px;
        background: var(--accent-soft); border: 1px solid var(--accent-line);
        color: var(--accent-2); font-size: 11px; font-weight: 650;
      }
      .cw-form { display: grid; gap: 16px; padding: 20px; }
      .cw-row { display: grid; grid-template-columns: 1.4fr 0.6fr; gap: 12px; }
      .cw-field { display: grid; gap: 6px; }
      .cw-field.full { grid-column: 1 / -1; }
      .cw-label {
        font-size: 11px; font-weight: 600; color: var(--text-3);
        letter-spacing: 0.04em; text-transform: uppercase;
      }
      .cw-input, .cw-select, .cw-textarea {
        width: 100%; min-height: 40px; padding: 10px 12px;
        border: 1px solid var(--line-2); border-radius: 8px;
        background: var(--panel-2); color: var(--text);
        font: inherit; font-size: 13px; outline: none;
      }
      .cw-textarea { min-height: 100px; resize: vertical; line-height: 1.45; }
      .cw-input:focus, .cw-select:focus, .cw-textarea:focus {
        border-color: var(--accent-line);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .cw-upload {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        padding: 12px 14px; border: 1px dashed var(--line-2); border-radius: 8px;
        background: rgba(255,255,255,0.02);
      }
      .cw-upload p { margin: 0; font-size: 12px; color: var(--text-2); line-height: 1.4; }
      .cw-upload strong { display: block; color: var(--text); font-size: 13px; margin-bottom: 2px; }
      .cw-file {
        position: relative; display: inline-flex; align-items: center; justify-content: center;
        min-height: 36px; padding: 0 14px; border-radius: 6px;
        border: 1px solid var(--line-2); background: transparent; color: var(--text);
        font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;
      }
      .cw-file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
      .cw-foot {
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
        padding: 16px 20px; border-top: 1px solid var(--line);
        background: rgba(255,255,255,0.02);
      }
      .cw-status { font-size: 12px; color: var(--text-3); margin: 0; max-width: 48ch; line-height: 1.4; }
      .cw-status.err { color: var(--bad); }
      .cw-btn {
        display: inline-flex; align-items: center; justify-content: center;
        min-height: 40px; padding: 0 18px; border-radius: 6px;
        border: 1px solid transparent; background: var(--accent); color: #1a0f0c;
        font-size: 13px; font-weight: 650; cursor: pointer;
      }
      .cw-btn:hover { background: var(--accent-2); }
      .cw-btn:disabled { opacity: 0.5; cursor: default; }
      .cw-btn.ghost { background: transparent; border-color: var(--line-2); color: var(--text); }
      .cw-result { display: grid; gap: 14px; }
      .cw-result-hero {
        padding: 22px; border: 1px solid var(--accent-line); border-radius: 12px;
        background: radial-gradient(500px 180px at 0% 0%, var(--accent-soft), transparent 55%), var(--panel);
      }
      .cw-result-hero .k { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); }
      .cw-result-hero h2 { margin: 8px 0 0; font-size: 28px; font-weight: 600; letter-spacing: -0.03em; max-width: 18ch; }
      .cw-result-hero p { margin: 10px 0 0; color: var(--text-2); font-size: 13px; line-height: 1.5; max-width: 56ch; }
      .cw-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
      .cw-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .cw-card { padding: 16px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel); }
      .cw-card .k { font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; }
      .cw-card h3 { margin: 8px 0 0; font-size: 15px; font-weight: 600; }
      .cw-card p { margin: 8px 0 0; color: var(--text-2); font-size: 13px; line-height: 1.5; }
      .cw-disc { border: 1px solid var(--line); border-radius: 12px; background: var(--panel); overflow: hidden; }
      .cw-disc summary { padding: 14px 16px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text); list-style: none; }
      .cw-disc summary::-webkit-details-marker { display: none; }
      .cw-disc[open] summary { border-bottom: 1px solid var(--line); }
      .cw-disc-body { padding: 12px 16px 16px; display: grid; gap: 8px; }
      .cw-disc-body div { padding: 10px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel-2); }
      .cw-disc-body b { display: block; font-size: 13px; }
      .cw-disc-body span { display: block; margin-top: 3px; font-size: 12px; color: var(--text-3); }
      .cw-raw { white-space: pre-wrap; font-size: 12px; line-height: 1.5; color: var(--text-2); max-height: 280px; overflow: auto; }
      @media (max-width: 800px) {
        .cw-row { grid-template-columns: 1fr; }
        .cw-cards { grid-template-columns: 1fr; }
        .cw-foot { flex-direction: column; align-items: stretch; }
        .cw-btn { width: 100%; }
      }
    `}</style>

    {!result ? (
      <section className="cw-panel">
        <div className="cw-panel-head">
          <div>
            <div className="k">Brief</div>
            <h2>What are you making?</h2>
          </div>
          {learning ? <span className="cw-learn">Learning signal ready</span> : null}
        </div>

        <div className="cw-form">
          <div className="cw-row">
            <label className="cw-field">
              <span className="cw-label">Reference URL</span>
              <input className="cw-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a video, post, article or source URL" autoFocus />
            </label>
            <label className="cw-field">
              <span className="cw-label">Subject</span>
              <select className="cw-select" value={niche} onChange={e => setNiche(e.target.value)}>
                {NICHES.map(n => <option key={n}>{n}</option>)}
              </select>
            </label>
          </div>

          <label className="cw-field full">
            <span className="cw-label">What made you notice it?</span>
            <textarea className="cw-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Hook, story, comment, visual idea — whatever caught your eye." />
          </label>

          <div className="cw-field full">
            <span className="cw-label">Or upload a source</span>
            <div className="cw-upload">
              <p>
                <strong>{file ? file.name : 'Video, audio or transcript'}</strong>
                {file ? 'Ready to inspect' : 'Cornerstone will inspect it for evidence'}
              </p>
              <label className="cw-file">
                {file ? 'Change file' : 'Choose file'}
                <input type="file" accept="video/*,audio/*,.txt,.md" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
        </div>

        <div className="cw-foot">
          <p className={/offline|error|failed|sign in/i.test(message) ? 'cw-status err' : 'cw-status'}>
            {message || (learning ? 'This run will use your active learning signal.' : 'Ready when you are.')}
          </p>
          <button className="cw-btn" disabled={busy} onClick={run}>
            {busy ? 'Building…' : 'Build the piece →'}
          </button>
        </div>
      </section>
    ) : (
      <section className="cw-result">
        <div className="cw-result-hero">
          <div className="k">Ready to make</div>
          <h2>{selected?.topic || selected?.titles?.[0]?.title || 'Original piece'}</h2>
          <p>{selected?.angle || selected?.why_this_should_work || 'Built from the transferable mechanism, not the source execution.'}</p>
          <div className="cw-actions">
            <button className="cw-btn" disabled={busy || saved} onClick={save}>
              {saved ? 'Saved ✓' : 'Save to Make →'}
            </button>
            <button className="cw-btn ghost" onClick={() => { setResult(null); setMessage(''); setSaved(false); }}>
              Start another
            </button>
          </div>
          {message ? <p className="cw-status" style={{ marginTop: 12 }}>{message}</p> : null}
        </div>

        <div className="cw-cards">
          <article className="cw-card">
            <div className="k">Why it should work</div>
            <h3>Reason</h3>
            <p>{selected?.why_this_should_work || selected?.angle || 'Strongest transferable mechanism packaged for production.'}</p>
          </article>
          <article className="cw-card">
            <div className="k">Opening</div>
            <h3>Hook</h3>
            <p>{selected?.hook_0_5s || 'No hook returned.'}</p>
          </article>
        </div>

        {scenes.length ? (
          <details className="cw-disc">
            <summary>Scenes & direction</summary>
            <div className="cw-disc-body">
              {scenes.slice(0, 8).map((s, i) => (
                <div key={i}>
                  <b>{typeof s === 'string' ? s : s?.title || s?.name || s?.direction || `Scene ${i + 1}`}</b>
                  {typeof s === 'object' ? <span>{s?.description || s?.visual || s?.why || s?.notes || ''}</span> : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {selected?.titles?.length ? (
          <details className="cw-disc">
            <summary>Title options</summary>
            <div className="cw-disc-body">
              {selected.titles.slice(0, 6).map((t, i) => (
                <div key={i}>
                  <b>{typeof t === 'string' ? t : t.title}</b>
                  {typeof t === 'object' && t.reason ? <span>{t.reason}</span> : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {selected?.script ? (
          <details className="cw-disc">
            <summary>Full script</summary>
            <div className="cw-disc-body"><div className="cw-raw">{selected.script}</div></div>
          </details>
        ) : null}

        {shorts.length ? (
          <details className="cw-disc">
            <summary>{shorts.length} short-form directions</summary>
            <div className="cw-disc-body">
              {shorts.slice(0, 8).map((s, i) => (
                <div key={i}>
                  <b>{s.short_title || `Short ${i + 1}`}</b>
                  <span>{s.hook || s.angle || ''}</span>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </section>
    )}
  </main>
);
}
