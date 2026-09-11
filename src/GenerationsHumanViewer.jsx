import React, { useEffect, useMemo, useState } from 'react';
import EnterpriseShell from './EnterpriseShell.jsx';

const creatorIds = new Set(['cara', 'lila', 'duo', 'cara_lila', 'cara-lila']);
const clean = (value) => String(value ?? '').trim();
const titleCase = (key) => String(key).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const primitive = (value) => ['string', 'number', 'boolean'].includes(typeof value);
const isUrl = (value) => /^https?:\/\//i.test(clean(value));

function bucket(job) {
  const persona = clean(job?.persona_id).toLowerCase();
  const domain = clean(job?.options?.research_domain).toUpperCase();
  const type = clean(job?.job_type).toLowerCase();
  return creatorIds.has(persona) || domain === 'TRACK_B_CREATOR_GROWTH' || type === 'social_caption_intelligence' || type === 'creator_growth' ? 'creators' : 'youtube';
}
function parseResult(value) {
  if (value && typeof value === 'object') return value;
  let raw = clean(value).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<analysis>[\s\S]*?<\/analysis>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').replace(/<\|im_end\|>|<\|endoftext\|>/gi, '').trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const start = raw.search(/[\[{]/); if (start < 0) return null;
  const open = raw[start], close = open === '{' ? '}' : ']'; let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < raw.length; i += 1) { const c = raw[i]; if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; } if (c === '"') { quoted = true; continue; } if (c === open) depth += 1; else if (c === close && --depth === 0) { try { return JSON.parse(raw.slice(start, i + 1)); } catch { return null; } } }
  return null;
}
function readValue(object, keys) { for (const key of keys) { const value = object?.[key]; if (value !== undefined && value !== null && clean(value)) return value; } return null; }
function Readable({ value, depth = 0 }) {
  if (value === null || value === undefined || value === '') return null;
  if (primitive(value)) return isUrl(value) ? <a href={String(value)} target="_blank" rel="noreferrer" style={styles.link}>{String(value)}</a> : <span>{String(value)}</span>;
  if (Array.isArray(value)) return <div style={styles.list}>{value.map((item, index) => <div key={index} style={styles.listItem}><Readable value={item} depth={depth + 1} /></div>)}</div>;
  return <div style={depth > 1 ? styles.nested : styles.object}>{Object.entries(value).map(([key, item]) => item == null || item === '' ? null : <div key={key} style={styles.field}><div style={styles.fieldLabel}>{titleCase(key)}</div><div style={styles.fieldValue}><Readable value={item} depth={depth + 1} /></div></div>)}</div>;
}
function Card({ title, children, hero = false }) { return <section style={{ ...styles.card, ...(hero ? styles.hero : {}) }}><div style={styles.kicker}>{title}</div><div style={styles.cardBody}>{children}</div></section>; }
function HumanResult({ value }) {
  const data = parseResult(value);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return <Card title="This result needs another look"><p style={styles.copy}>Cornerstone has saved the response, but it is not in a shape the studio can safely interpret yet.</p><details style={styles.details}><summary style={styles.summary}>Show saved response</summary><pre style={styles.raw}>{clean(value) || 'No response stored.'}</pre></details></Card>;
  const brief = data.operator_brief && typeof data.operator_brief === 'object' ? data.operator_brief : data.operatorBrief && typeof data.operatorBrief === 'object' ? data.operatorBrief : null;
  const pack = data.production_package && typeof data.production_package === 'object' ? data.production_package : data.productionPackage && typeof data.productionPackage === 'object' ? data.productionPackage : data;
  const sourceInspection = readValue(brief || data, ['source_inspection', 'sourceInspection']);
  const evidenceQuality = readValue(brief || data, ['evidence_quality', 'evidenceQuality']);
  const evidenceStatus = readValue(brief || data, ['evidence_status', 'support_level']);
  const confidence = readValue(brief || data, ['confidence', 'confidence_level']);
  const sections = [];
  const add = (key, heading, content, hero = false) => { if (content === null || content === undefined || content === '' || sections.some((x) => x.key === key)) return; sections.push({ key, node: <Card title={heading} hero={hero}><Readable value={content} /></Card> }); };
  add('finding', 'The signal', readValue(brief || data, ['finding', 'demand_signal', 'summary', 'insight', 'key_insight', 'audience_promise', 'core_mechanism', 'mechanism']), true);
  if (sourceInspection || evidenceQuality || evidenceStatus || confidence) sections.push({ key: 'truth', node: <Card title="How strong is it?"><div style={styles.truth}>{[['Source', sourceInspection], ['Evidence', evidenceQuality], ['Support', evidenceStatus], ['Confidence', confidence]].map(([label, v]) => <div key={label} style={styles.truthItem}><span>{label}</span><b>{clean(v).replace(/[_-]/g, ' ') || 'Not supplied'}</b></div>)}</div><p style={styles.copy}>{readValue(brief || data, ['evidence_quality_reason', 'evidence_quality_note', 'source_inspection_note', 'sourceInspectionNote']) || 'Cornerstone keeps source evidence, public signals and inference separate.'}</p></Card> });
  add('evidence', 'What supports it', readValue(brief || data, ['evidence_points', 'evidence', 'source_evidence', 'evidence_summary', 'support']));
  add('mechanism', 'What is reusable', readValue(brief || data, ['mechanism', 'core_mechanism', 'transferable_mechanism']));
  add('why', 'Why it matters', readValue(brief || data, ['why', 'reason', 'why_it_works', 'why_this_should_work', 'rationale']));
  add('subject', 'What to make', readValue(brief || data, ['recommended_subject', 'recommended_angle', 'subject', 'angle', 'opportunity_statement', 'opportunity']), true);
  add('next', 'Your next move', readValue(brief || data, ['next_action', 'recommended_next_action', 'best_next_move', 'recommendation']));
  add('limits', 'Check before you trust it', readValue(brief || data, ['limitations', 'uncertainties', 'verification', 'confidence_note']));
  add('hook', 'Opening hook', readValue(pack, ['hook_0_5s', 'hook']));
  add('titles', 'Title ideas', readValue(pack, ['titles', 'title_options', 'title_ideas', 'package_titles']));
  add('scenes', 'Ways to bring it to life', readValue(pack, ['scene_directions', 'scene_options', 'possible_scenes', 'creative_directions', 'visual_directions']));
  add('thumbnails', 'Thumbnail concepts', pack.thumbnails);
  add('narrative', 'Story structure', pack.narrative_structure);
  add('script', 'Spoken script', pack.script);
  add('visual', 'Production plan', pack.visual_timeline);
  add('shorts', 'Short-form ideas', pack.shorts || pack.short_form || pack.short_form_derivatives);
  add('publish', 'Publishing plan', pack.publication_sequence);
  add('seo', 'Upload package', pack.seo_upload);
  add('measure', 'How we will measure it', pack.measurement_plan);
  add('originality', 'Originality guardrails', pack.originality_plan);
  add('monetization', 'Monetisation tests', pack.monetization_tests);
  return <div style={styles.stack}>{sections.map((item) => <React.Fragment key={item.key}>{item.node}</React.Fragment>)}<details style={styles.details}><summary style={styles.summary}>Developer data</summary><pre style={styles.raw}>{JSON.stringify(data, null, 2)}</pre></details></div>;
}
export default function GenerationsHumanViewer() {
  const [jobs, setJobs] = useState([]), [selected, setSelected] = useState(null), [query, setQuery] = useState(''), [tab, setTab] = useState('youtube'), [loading, setLoading] = useState(true), [error, setError] = useState('');
  async function load() { setLoading(true); setError(''); try { const response = await fetch('/api/queue-update?action=generations&limit=100&offset=0', { cache: 'no-store', credentials: 'same-origin' }); const text = await response.text(); let body = {}; try { body = text ? JSON.parse(text) : {}; } catch { throw new Error(text.slice(0, 180) || 'The saved work library returned an invalid response.'); } if (!response.ok) throw new Error(body?.error || `Library failed (${response.status})`); setJobs(Array.isArray(body.jobs) ? body.jobs : []); } catch (err) { setError(err?.message || String(err)); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const counts = useMemo(() => jobs.reduce((a, j) => { a[bucket(j)] += 1; return a; }, { youtube: 0, creators: 0 }), [jobs]);
  const visible = useMemo(() => { const needle = query.trim().toLowerCase(); return jobs.filter((job) => bucket(job) === tab && (!needle || [job.title, job.job_type, job.status, job.persona_id, job.result].some((v) => clean(v).toLowerCase().includes(needle)))); }, [jobs, query, tab]);
  useEffect(() => { if (!visible.some((j) => j.id === selected?.id)) setSelected(visible[0] || null); }, [visible, selected]);
  const persona = clean(selected?.persona_id).toLowerCase();
  return <EnterpriseShell active="library"><div style={styles.page}>
    <header style={styles.header}><div><div style={styles.eyebrow}>LIBRARY</div><h1 style={styles.h1}>Your work, decisions and ideas.</h1><p style={styles.lede}>Everything Cornerstone has made for you, with the reasoning behind it.</p></div><button onClick={load} disabled={loading} style={styles.refresh}>{loading ? 'Updating' : 'Refresh'}</button></header>
    <div style={styles.tabs}>{[['youtube','YouTube'],['creators','Cara / Lila']].map(([id,name]) => <button key={id} onClick={() => { setTab(id); setQuery(''); }} style={{ ...styles.tab, ...(tab === id ? styles.tabActive : {}) }}><span>{name}</span><b>{counts[id]}</b></button>)}</div>
    <div style={styles.searchRow}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === 'youtube' ? 'Search your YouTube work…' : 'Search Cara / Lila work…'} style={styles.search} /><span style={styles.count}>{visible.length} {visible.length === 1 ? 'piece' : 'pieces'}</span></div>
    {error ? <div style={styles.error}>{error}</div> : null}
    <div style={styles.layout}><aside style={styles.sidebar}>{loading && !jobs.length ? <div style={styles.empty}>Opening your library…</div> : null}{!loading && !visible.length ? <div style={styles.empty}>Nothing saved here yet.</div> : null}{visible.map((job) => <button key={job.id} onClick={() => setSelected(job)} style={{ ...styles.job, ...(selected?.id === job.id ? styles.jobActive : {}) }}><div style={styles.jobTop}><span>{job.status === 'completed' ? 'Ready' : titleCase(job.status || 'Work')}</span><span>{creatorIds.has(clean(job.persona_id).toLowerCase()) ? clean(job.persona_id) : 'YouTube'}</span></div><strong style={styles.jobTitle}>{job.title || 'Untitled piece'}</strong><small style={styles.jobDate}>{job.created_at ? new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</small></button>)}</aside>
      <main style={styles.main}>{selected ? <><div style={styles.meta}>{creatorIds.has(persona) ? `Cara / Lila · ${persona}` : 'YouTube'} <span>·</span> {selected.status === 'completed' ? 'Ready' : titleCase(selected.status || 'Work')}</div><h2 style={styles.h2}>{selected.title || 'Untitled piece'}</h2><div style={styles.date}>{selected.created_at ? new Date(selected.created_at).toLocaleString('en-GB') : ''}</div><HumanResult value={selected.result || selected.error_message} /></> : <div style={styles.emptyMain}><div style={styles.mark}>C</div><h2>Choose a piece</h2><p>Your saved work will appear here with the decision behind it.</p></div>}</main>
    </div></div></EnterpriseShell>;
}
const styles = {
  page:{fontFamily:'var(--sans)',color:'var(--text)',padding:'4px 0 70px'},
  header:{display:'flex',justifyContent:'space-between',gap:24,alignItems:'flex-end',padding:'18px 0 30px',borderBottom:'1px solid var(--border)'},
  eyebrow:{fontSize:9,fontWeight:800,letterSpacing:'.18em',color:'var(--track-b)'},
  h1:{margin:'10px 0 0',fontFamily:'var(--display)',fontSize:'clamp(42px,6vw,70px)',fontWeight:500,lineHeight:.96,letterSpacing:'-.055em',maxWidth:'13ch'},
  lede:{margin:'14px 0 0',maxWidth:620,fontSize:13,lineHeight:1.65,color:'var(--text-muted)'},
  refresh:{minHeight:40,padding:'0 14px',border:'1px solid var(--border)',borderRadius:10,background:'var(--surface)',color:'var(--text)',fontWeight:750,cursor:'pointer'},
  tabs:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,margin:'18px 0 10px'},
  tab:{display:'flex',justifyContent:'space-between',padding:'13px 15px',border:'1px solid var(--border)',borderRadius:12,background:'var(--surface)',color:'var(--text-muted)',cursor:'pointer',fontWeight:760},
  tabActive:{borderColor:'rgba(208,193,164,.45)',background:'linear-gradient(135deg,rgba(208,193,164,.12),rgba(255,255,255,.025))',color:'var(--text)'},
  searchRow:{display:'flex',alignItems:'center',gap:12,marginBottom:14},
  search:{flex:1,minWidth:0,height:44,padding:'0 14px',border:'1px solid var(--border)',borderRadius:11,background:'var(--surface-soft)',color:'var(--text)',fontSize:12,outline:'none'},
  count:{fontSize:9,fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-subtle)'},
  error:{padding:13,border:'1px solid rgba(196,95,95,.32)',background:'rgba(196,95,95,.06)',borderRadius:11,color:'#e5aaaa',fontSize:11,marginBottom:14},
  layout:{display:'grid',gridTemplateColumns:'320px minmax(0,1fr)',gap:18,alignItems:'start'},
  sidebar:{position:'sticky',top:82,maxHeight:'calc(100svh - 110px)',overflow:'auto',paddingRight:4},
  job:{display:'block',width:'100%',textAlign:'left',padding:'14px 13px',marginBottom:7,border:'1px solid var(--border)',borderRadius:12,background:'var(--surface)',color:'var(--text)',cursor:'pointer'},
  jobActive:{borderColor:'rgba(208,193,164,.42)',background:'rgba(208,193,164,.07)'},
  jobTop:{display:'flex',justifyContent:'space-between',gap:8,fontSize:8,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--text-subtle)'},
  jobTitle:{display:'block',marginTop:7,fontSize:12,lineHeight:1.35},
  jobDate:{display:'block',marginTop:7,fontSize:9,color:'var(--text-subtle)'},
  meta:{fontSize:9,fontWeight:800,letterSpacing:'.13em',textTransform:'uppercase',color:'var(--track-b)'},
  h2:{margin:'9px 0 4px',fontFamily:'var(--display)',fontSize:'clamp(31px,4vw,52px)',fontWeight:500,lineHeight:.98,letterSpacing:'-.045em'},
  date:{fontSize:10,color:'var(--text-subtle)',marginBottom:18},
  main:{minWidth:0},
  stack:{display:'grid',gap:10},
  card:{padding:17,border:'1px solid var(--border)',borderRadius:15,background:'var(--surface)'},
  hero:{background:'linear-gradient(135deg,rgba(208,193,164,.10),rgba(255,255,255,.018))',borderColor:'rgba(208,193,164,.28)'},
  kicker:{fontSize:9,fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--text-subtle)'},
  cardBody:{marginTop:9,fontSize:12,lineHeight:1.68},
  copy:{margin:0,color:'var(--text-muted)'},
  truth:{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:7},
  truthItem:{padding:'10px 11px',border:'1px solid var(--border)',borderRadius:10,background:'var(--surface-2)'},
  truthItemSpan:{display:'block'},
  nested:{display:'grid',gap:7},
  object:{display:'grid',gap:10},
  field:{display:'grid',gridTemplateColumns:'165px minmax(0,1fr)',gap:12,paddingBottom:9,borderBottom:'1px solid var(--border)'},
  fieldLabel:{fontSize:10,color:'var(--text-subtle)',fontWeight:750},
  fieldValue:{minWidth:0},
  list:{display:'grid',gap:7},
  listItem:{padding:'10px 11px',border:'1px solid var(--border)',borderRadius:9,background:'var(--surface-2)'},
  link:{color:'var(--track-b)',wordBreak:'break-word'},
  details:{marginTop:0,border:'1px solid var(--border)',borderRadius:12,background:'var(--surface)'},
  summary:{cursor:'pointer',padding:12,fontSize:10,fontWeight:800},
  raw:{margin:0,padding:14,maxHeight:520,overflow:'auto',background:'#090a0d',color:'#89919f',font:'9px/1.55 var(--mono)',whiteSpace:'pre-wrap'},
  empty:{padding:'25px 13px',color:'var(--text-muted)',fontSize:11,textAlign:'center'},
  emptyMain:{minHeight:420,display:'grid',placeItems:'center',alignContent:'center',textAlign:'center',border:'1px dashed var(--border)',borderRadius:16,background:'var(--surface-soft)',padding:24},
  mark:{width:48,height:48,borderRadius:14,display:'grid',placeItems:'center',background:'#eee9dd',color:'#171614',fontFamily:'var(--display)',fontSize:22}
};
