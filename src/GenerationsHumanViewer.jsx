import React, { useEffect, useMemo, useState } from 'react';
import EnterpriseShell from './EnterpriseShell.jsx';

const creatorIds = new Set(['cara', 'lila', 'duo', 'cara_lila', 'cara-lila']);
const clean = (value) => String(value ?? '').trim();
const label = (key) => String(key).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const isPrimitive = (value) => ['string', 'number', 'boolean'].includes(typeof value);
const isUrl = (value) => /^https?:\/\//i.test(clean(value));

function bucket(job) {
  const persona = clean(job?.persona_id).toLowerCase();
  const domain = clean(job?.options?.research_domain).toUpperCase();
  const type = clean(job?.job_type).toLowerCase();
  if (creatorIds.has(persona) || domain === 'TRACK_B_CREATOR_GROWTH' || type === 'social_caption_intelligence' || type === 'creator_growth') {
    return 'creators';
  }
  return 'youtube';
}

function parseResult(value) {
  if (value && typeof value === 'object') return value;
  let raw = clean(value);
  if (!raw) return null;
  raw = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/<\|im_end\|>|<\|endoftext\|>/gi, '')
    .trim();
  try { return JSON.parse(raw); } catch {}
  const start = raw.search(/[\[{]/);
  if (start < 0) return null;
  const open = raw[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(raw.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function first(object, keys) {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && clean(value)) return value;
  }
  return null;
}

function Readable({ value, depth = 0 }) {
  if (value === null || value === undefined || value === '') return null;
  if (isPrimitive(value)) {
    const text = String(value);
    return isUrl(text)
      ? <a href={text} target="_blank" rel="noreferrer" style={styles.link}>{text}</a>
      : <span>{text}</span>;
  }
  if (Array.isArray(value)) {
    return <div style={styles.list}>{value.map((item, index) => <div key={index} style={styles.listItem}><Readable value={item} depth={depth + 1} /></div>)}</div>;
  }
  return (
    <div style={depth > 1 ? styles.nested : styles.object}>
      {Object.entries(value).map(([key, item]) => item == null || item === '' ? null : (
        <div key={key} style={styles.field}>
          <div style={styles.fieldLabel}>{label(key)}</div>
          <div style={styles.fieldValue}><Readable value={item} depth={depth + 1} /></div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, children, hero = false, subtle = false }) {
  return (
    <section style={{ ...styles.card, ...(hero ? styles.hero : {}), ...(subtle ? styles.subtle : {}) }}>
      <div style={styles.kicker}>{title}</div>
      <div style={styles.cardBody}>{children}</div>
    </section>
  );
}

function TruthRow({ label: name, value }) {
  return (
    <div style={styles.truthItem}>
      <span>{name}</span>
      <b>{clean(value).replace(/[_-]/g, ' ') || 'not supplied'}</b>
    </div>
  );
}

function HumanResult({ value }) {
  const data = parseResult(value);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return (
      <Card title="Interpretation unavailable" subtle>
        <p style={styles.copy}>Cornerstone received output, but it could not safely interpret it as structured evidence. Nothing is presented as fact until it can be verified.</p>
        <details style={styles.details}>
          <summary style={styles.summary}>Machine response</summary>
          <pre style={styles.raw}>{clean(value) || 'No output stored.'}</pre>
        </details>
      </Card>
    );
  }

  const brief = data.operator_brief && typeof data.operator_brief === 'object'
    ? data.operator_brief
    : (data.operatorBrief && typeof data.operatorBrief === 'object' ? data.operatorBrief : null);
  const pack = data.production_package && typeof data.production_package === 'object'
    ? data.production_package
    : (data.productionPackage && typeof data.productionPackage === 'object' ? data.productionPackage : data);

  const sections = [];
  const add = (key, title, content, hero = false) => {
    if (content === null || content === undefined || content === '' || sections.some((item) => item.key === key)) return;
    sections.push({ key, element: <Card title={title} hero={hero}><Readable value={content} /></Card> });
  };

  const sourceInspection = first(brief || data, ['source_inspection', 'sourceInspection']);
  const evidenceQuality = first(brief || data, ['evidence_quality', 'evidenceQuality']);
  const evidenceStatus = first(brief || data, ['evidence_status', 'support_level']);
  const confidence = first(brief || data, ['confidence', 'confidence_level']);

  if (brief) {
    add('finding', 'What Cornerstone found', first(brief, ['finding', 'demand_signal', 'summary', 'insight']), true);
    if (sourceInspection || evidenceQuality || evidenceStatus || confidence) {
      sections.push({
        key: 'truth',
        element: (
          <Card title="How Cornerstone knows">
            <div style={styles.truth}>
              <TruthRow label="Source inspected" value={sourceInspection} />
              <TruthRow label="Evidence quality" value={evidenceQuality} />
              <TruthRow label="Evidence status" value={evidenceStatus} />
              <TruthRow label="Confidence" value={confidence} />
            </div>
            <p style={styles.copy}>{first(brief, ['evidence_quality_reason', 'evidence_quality_note', 'source_inspection_note', 'sourceInspectionNote']) || 'Cornerstone is required to distinguish source evidence, public signals and inference.'}</p>
          </Card>
        )
      });
    }
    add('evidence', 'Evidence', first(brief, ['evidence_points', 'evidence', 'support']));
    add('mechanism', 'Transferable mechanism', first(brief, ['mechanism', 'core_mechanism', 'transferable_mechanism']));
    add('why', 'Why it matters', first(brief, ['why', 'reason', 'why_it_works']));
    add('subject', 'What you should make', first(brief, ['recommended_subject', 'recommended_angle', 'subject', 'angle']), true);
    add('next', 'Recommended next action', first(brief, ['next_action', 'recommended_next_action', 'best_next_move']));
    add('limits', 'What to verify', first(brief, ['limitations', 'uncertainties', 'verification']));
  } else {
    add('finding', 'What Cornerstone found', first(data, ['finding', 'demand_signal', 'key_insight', 'audience_promise', 'core_mechanism', 'mechanism']), true);
    sections.push({ key: 'truth', element: <Card title="How Cornerstone knows"><div style={styles.truth}><TruthRow label="Source inspected" value={sourceInspection} /><TruthRow label="Evidence quality" value={evidenceQuality} /><TruthRow label="Evidence status" value={evidenceStatus} /><TruthRow label="Confidence" value={confidence} /></div></Card> });
    add('evidence', 'Evidence / support', first(data, ['evidence', 'source_evidence', 'evidence_summary']));
    add('mechanism', 'Transferable mechanism', first(data, ['transferable_mechanism', 'core_mechanism', 'mechanism']));
    add('why', 'Why it matters', first(data, ['why_it_works', 'why_this_should_work', 'strategic_reasoning', 'rationale']));
    add('subject', 'What you should make', first(data, ['recommended_subject', 'recommended_angle', 'original_reconstruction_opportunity', 'opportunity_statement', 'opportunity']), true);
    add('next', 'Recommended next action', first(data, ['next_action', 'recommended_next_action', 'best_next_move', 'recommendation']));
    add('limits', 'What to verify', first(data, ['limitations', 'uncertainties', 'confidence_note']));
  }

  add('hook', 'Opening hook', first(pack, ['hook_0_5s', 'hook']));
  add('titles', 'Title options', first(pack, ['titles', 'title_options', 'title_ideas', 'package_titles']));
  add('scenes', 'Possible scenes & creative direction', first(pack, ['scene_directions', 'scene_options', 'possible_scenes', 'creative_directions', 'visual_directions']));
  add('thumbnails', 'Thumbnail concepts', pack.thumbnails);
  add('narrative', 'Story structure', pack.narrative_structure);
  add('script', 'Spoken script', pack.script);
  add('visual', 'Visual production timeline', pack.visual_timeline);
  add('loops', 'Curiosity loops', pack.curiosity_loops);
  add('shorts', 'Short-form family', pack.shorts || pack.short_form || pack.short_form_derivatives);
  add('publish', 'Publication sequence', pack.publication_sequence);
  add('seo', 'Upload package', pack.seo_upload);
  add('measure', 'Measurement plan', pack.measurement_plan);
  add('originality', 'Originality plan', pack.originality_plan);
  add('monetization', 'Monetisation tests', pack.monetization_tests);

  return (
    <div style={styles.stack}>
      {sections.length ? sections.map((item) => <React.Fragment key={item.key}>{item.element}</React.Fragment>) : (
        <Card title="No operator brief returned" subtle>
          <p style={styles.copy}>Structured production data arrived without a reliable decision summary. Cornerstone will not invent one.</p>
        </Card>
      )}
      <details style={styles.details}>
        <summary style={styles.summary}>Developer / production data</summary>
        <pre style={styles.raw}>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}

export default function GenerationsHumanViewer() {
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('youtube');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/queue-update?action=generations&limit=100&offset=0', { cache: 'no-store', credentials: 'same-origin' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || `Library failed (${response.status})`);
      setJobs(Array.isArray(body.jobs) ? body.jobs : []);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => jobs.reduce((result, job) => {
    result[bucket(job)] += 1;
    return result;
  }, { youtube: 0, creators: 0 }), [jobs]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (bucket(job) !== tab) return false;
      if (!needle) return true;
      return [job.title, job.job_type, job.status, job.user_prompt, job.result, job.persona_id]
        .some((value) => clean(value).toLowerCase().includes(needle));
    });
  }, [jobs, query, tab]);

  useEffect(() => {
    if (!visible.some((job) => job.id === selected?.id)) setSelected(visible[0] || null);
  }, [visible, selected]);

  const persona = clean(selected?.persona_id).toLowerCase();

  return (
    <EnterpriseShell active="library" eyebrow="Track B · Intelligence library">
      <div style={styles.page}>
        <header style={styles.head}>
          <div>
            <div style={styles.overline}>TRACK B · CONTENT INTELLIGENCE + PRODUCTION</div>
            <h1 style={styles.h1}>What did Cornerstone learn?</h1>
            <p style={styles.lede}>The decision comes first. See what Cornerstone found, how strongly it is supported, what to make next, and what still needs checking.</p>
          </div>
          <button onClick={load} disabled={loading} style={styles.button}>{loading ? 'Refreshing…' : 'Refresh'}</button>
        </header>

        <div style={styles.tabs}>
          {[[ 'youtube', 'YouTube' ], [ 'creators', 'Cara / Lila' ]].map(([id, name]) => (
            <button key={id} onClick={() => { setTab(id); setQuery(''); }} style={{ ...styles.tab, ...(tab === id ? styles.tabActive : {}) }}>
              <span>{name}</span><b>{counts[id]}</b>
            </button>
          ))}
        </div>

        <div style={styles.searchRow}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'youtube' ? 'Search YouTube work, sources, subjects…' : 'Search Cara / Lila work, voices, subjects…'} style={styles.input} />
          <div style={styles.count}>{visible.length} saved</div>
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}

        <div style={styles.layout}>
          <aside style={styles.sidebar}>
            {loading && !jobs.length ? <div style={styles.empty}>Reading saved work…</div> : null}
            {!loading && !visible.length ? <div style={styles.empty}>No saved generations in this section.</div> : null}
            {visible.map((job) => (
              <button key={job.id} onClick={() => setSelected(job)} style={{ ...styles.job, ...(selected?.id === job.id ? styles.jobActive : {}) }}>
                <div style={styles.jobMeta}><span>{job.job_type || 'Generation'}</span><span>{job.status}</span></div>
                <strong style={styles.jobTitle}>{job.title || 'Untitled generation'}</strong>
                <span style={styles.jobDate}>{creatorIds.has(clean(job.persona_id).toLowerCase()) ? job.persona_id : (tab === 'creators' ? 'Creator' : 'YouTube')} · {job.created_at ? new Date(job.created_at).toLocaleString('en-GB') : ''}</span>
              </button>
            ))}
          </aside>

          <main style={styles.main}>
            {selected ? (
              <>
                <div style={styles.selectedMeta}>{selected.job_type || 'Generation'} · {selected.status} · {creatorIds.has(persona) ? persona : 'YouTube'}</div>
                <h2 style={styles.h2}>{selected.title || 'Untitled generation'}</h2>
                <div style={styles.date}>{selected.created_at ? new Date(selected.created_at).toLocaleString('en-GB') : ''}{selected.model ? ` · ${selected.model}` : ''}</div>
                <HumanResult value={selected.result || selected.error_message} />
              </>
            ) : (
              <div style={styles.emptyMain}><div style={styles.bigMark}>C</div><h2>Pick a generation</h2><p>Select saved work to see the evidence, decision and next move.</p></div>
            )}
          </main>
        </div>
      </div>
    </EnterpriseShell>
  );
}

const styles = {
  page:{padding:'22px 0 70px',color:'var(--text)',fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif'},
  head:{display:'flex',justifyContent:'space-between',gap:24,alignItems:'flex-end',paddingBottom:24,borderBottom:'1px solid var(--border)'},
  overline:{fontSize:9,fontWeight:900,letterSpacing:'.18em',textTransform:'uppercase',color:'var(--track-b)'},
  h1:{margin:'8px 0 0',fontSize:'clamp(42px,7vw,78px)',lineHeight:.9,letterSpacing:'-.075em',maxWidth:'11ch'},
  lede:{margin:'15px 0 0',maxWidth:'64ch',fontSize:13,lineHeight:1.65,color:'var(--text-muted)'},
  button:{border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',borderRadius:10,padding:'10px 13px',fontWeight:850,cursor:'pointer'},
  tabs:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,padding:'12px 0'},
  tab:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',border:'1px solid var(--border)',borderRadius:11,background:'var(--surface)',color:'var(--text-muted)',cursor:'pointer',fontWeight:850},
  tabActive:{borderColor:'rgba(212,181,106,.5)',background:'rgba(212,181,106,.08)',color:'var(--text)'},
  searchRow:{display:'flex',alignItems:'center',gap:12,padding:'4px 0 16px'},
  input:{flex:1,minWidth:0,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:11,color:'var(--text)',padding:'12px 13px',fontSize:12},
  count:{fontSize:9,fontWeight:900,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-subtle)'},
  error:{padding:12,border:'1px solid rgba(255,120,120,.28)',borderRadius:11,color:'#ffadad',fontSize:11,marginBottom:12},
  layout:{display:'grid',gridTemplateColumns:'330px minmax(0,1fr)',gap:14,alignItems:'start'},
  sidebar:{border:'1px solid var(--border)',borderRadius:16,background:'var(--surface)',padding:10,maxHeight:'70vh',overflow:'auto'},
  job:{display:'block',width:'100%',textAlign:'left',padding:13,marginBottom:8,border:'1px solid var(--border)',borderRadius:12,background:'transparent',color:'var(--text)',cursor:'pointer'},
  jobActive:{borderColor:'var(--track-b)',background:'var(--surface-2)'},
  jobMeta:{display:'flex',justifyContent:'space-between',fontSize:8,fontWeight:900,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--text-subtle)'},
  jobTitle:{display:'block',marginTop:7,fontSize:12,lineHeight:1.35},
  jobDate:{display:'block',marginTop:7,fontSize:9,color:'var(--text-subtle)'},
  main:{minWidth:0},
  selectedMeta:{fontSize:9,fontWeight:900,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--track-b)'},
  h2:{margin:'7px 0 4px',fontSize:'clamp(26px,4vw,42px)',letterSpacing:'-.05em',lineHeight:1},
  date:{fontSize:10,color:'var(--text-subtle)',marginBottom:18},
  stack:{display:'grid',gap:11},
  card:{padding:16,border:'1px solid var(--border)',borderRadius:15,background:'var(--surface)'},
  hero:{borderColor:'rgba(212,181,106,.33)',background:'linear-gradient(135deg,rgba(212,181,106,.08),var(--surface))'},
  subtle:{background:'var(--surface-2)'},
  kicker:{fontSize:9,fontWeight:900,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-subtle)'},
  cardBody:{marginTop:8,fontSize:12,lineHeight:1.65},
  copy:{margin:'10px 0 0',color:'var(--text-muted)',lineHeight:1.65},
  truth:{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:7},
  truthItem:{padding:'9px 10px',border:'1px solid var(--border)',borderRadius:10,background:'var(--surface-2)'},
  nested:{display:'grid',gap:6},
  object:{display:'grid',gap:10},
  field:{display:'grid',gridTemplateColumns:'170px minmax(0,1fr)',gap:12,paddingBottom:8,borderBottom:'1px solid var(--border)'},
  fieldLabel:{fontSize:10,fontWeight:800,color:'var(--text-subtle)'},
  fieldValue:{minWidth:0},
  list:{display:'grid',gap:7},
  listItem:{padding:'10px 11px',border:'1px solid var(--border)',background:'var(--surface-2)',borderRadius:9},
  link:{color:'var(--track-b)',wordBreak:'break-word'},
  details:{marginTop:2,border:'1px solid var(--border)',borderRadius:12,background:'var(--surface)'},
  summary:{cursor:'pointer',padding:12,fontSize:10,fontWeight:850},
  raw:{margin:0,padding:14,overflow:'auto',maxHeight:520,color:'var(--text-muted)',fontSize:9,lineHeight:1.5},
  empty:{padding:18,color:'var(--text-muted)',fontSize:11},
  emptyMain:{minHeight:420,display:'grid',placeItems:'center',alignContent:'center',textAlign:'center',border:'1px dashed var(--border)',borderRadius:16,background:'var(--surface)'},
  bigMark:{width:46,height:46,borderRadius:13,display:'grid',placeItems:'center',background:'#e6e1d5',color:'#171717',fontWeight:900}
};
