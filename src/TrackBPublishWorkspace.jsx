import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const toLocalParts = (date) => {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return { date: d.toISOString().slice(0,10), time: d.toISOString().slice(11,16) };
};

export default function TrackBPublishWorkspace() {
  const now = useMemo(() => toLocalParts(new Date(Date.now() + 10 * 60 * 1000)), []);
  const [rows, setRows] = useState([]), [selectedId, setSelectedId] = useState(''), [date, setDate] = useState(now.date), [time, setTime] = useState(now.time), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase.from('content_queue').select('id,content_label,platform,status,created_at,scheduled_date,scheduled_time,video_url,image_url,scene_verification_status,last_publish_error').like('content_label','%Creative Engine%').order('created_at',{ascending:false}).limit(100);
    if (error) setMessage(error.message); else setRows(data || []);
  }
  useEffect(() => { load(); }, []);
  const selected = useMemo(() => rows.find(x => x.id === selectedId) || null, [rows, selectedId]);

  useEffect(() => { if(selected?.scheduled_date) setDate(selected.scheduled_date); if(selected?.scheduled_time) setTime(selected.scheduled_time); }, [selected]);

  async function schedule() {
    if (!selected) { setMessage('Choose a Content Engine package first.'); return; }
    if (!date || !time) { setMessage('Choose a publish date and time.'); return; }
    setBusy(true); setMessage('Scheduling…');
    const response = await fetch('/api/queue-update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.id,update:{status:'scheduled',scheduled_date:date,scheduled_time:time,publishing_started_at:null,last_publish_error:null}})});
    const body = await response.json().catch(()=>({}));
    if (!response.ok) setMessage(body.error || 'Could not schedule the package.'); else { setMessage(`Scheduled for ${date} at ${time}.`); await load(); }
    setBusy(false);
  }

  return <div className='tb-publish'><style>{`.tb-publish{color:#eef1f7}.tb-publish h1{margin:0;font-size:32px;letter-spacing:-.045em}.sub{margin:7px 0 0;color:#858d9e;font-size:12px;line-height:1.6}.grid{display:grid;grid-template-columns:1.05fr .95fr;gap:12px;margin-top:16px}.card{border:1px solid rgba(255,255,255,.08);background:#11151b;border-radius:15px;padding:16px}.label{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#757d8c;font-weight:850}.list{display:grid;gap:7px;margin-top:10px}.item{display:block;text-align:left;width:100%;border:1px solid rgba(255,255,255,.08);background:#0b0f14;color:#d9dde4;border-radius:9px;padding:11px;cursor:pointer}.item.active{border-color:rgba(196,180,154,.4);background:rgba(196,180,154,.08)}.meta{color:#7d8593;font-size:9px;margin-top:4px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.field{width:100%;box-sizing:border-box;margin-top:6px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:#0b0f14;color:#f0f2f5;padding:10px;font:inherit}.btn{margin-top:12px;min-height:42px;border:1px solid #c4b49a;background:#ddd7ca;color:#14161a;border-radius:9px;padding:9px 12px;font-size:10px;font-weight:850;cursor:pointer}.pill{display:inline-block;margin-top:8px;margin-right:6px;padding:4px 6px;border-radius:999px;background:rgba(196,180,154,.09);color:#c9c1b3;font-size:8px}@media(max-width:850px){.grid{grid-template-columns:1fr}}@media(max-width:600px){.fields{grid-template-columns:1fr}}`}</style><h1>Publish</h1><p className='sub'>Schedule approved Track B packages. The existing publishing cron will claim due items, run local scene QA where required, then hand the approved media to the publishing webhook.</p><div className='grid'><section className='card'><div className='label'>Production queue</div><div className='list'>{rows.length===0?<div className='meta'>No Creative Engine packages have been saved yet.</div>:rows.map(r=><button key={r.id} className={`item ${selectedId===r.id?'active':''}`} onClick={()=>setSelectedId(r.id)}><div>{r.content_label}</div><div className='meta'>{r.platform} · {r.status}</div>{r.scheduled_date&&<span className='pill'>{r.scheduled_date} {r.scheduled_time||''}</span>}{r.scene_verification_status&&r.scene_verification_status!=='not_required'&&<span className='pill'>Scene QA: {r.scene_verification_status}</span>}</button>)}</div></section><section className='card'><div className='label'>Publish schedule</div>{selected?<><div style={{marginTop:10,fontSize:13,fontWeight:800}}>{selected.content_label}</div><div className='meta'>Current state: {selected.status}</div><div className='fields'><label className='label'>Date<input className='field' type='date' value={date} onChange={e=>setDate(e.target.value)}/></label><label className='label'>Time<input className='field' type='time' value={time} onChange={e=>setTime(e.target.value)}/></label></div><button className='btn' disabled={busy} onClick={schedule}>{busy?'Scheduling…':'Schedule publish'}</button>{selected.last_publish_error&&<div style={{marginTop:10,color:'#d4a7a7',fontSize:10}}>{selected.last_publish_error}</div>}</>:<div className='meta' style={{marginTop:10}}>Select an approved package.</div>}<div style={{marginTop:12,color:'#727a89',fontSize:9,lineHeight:1.5}}>Publishing is not treated as complete until the claim/publish job succeeds. Track B scene verification can block a post from going live when its required QA has not passed.</div></section></div>{message&&<div style={{marginTop:10,color:'#b8c0cb',fontSize:10}}>{message}</div>}</div>;
}
