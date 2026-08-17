import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const shell = { minHeight: '100vh', background: '#08070d', color: '#eef1f7', padding: '28px 32px 72px', fontFamily: 'Inter, system-ui, sans-serif' };
const card = { background: '#0e1017', border: '1px solid #252a39', borderRadius: 16, padding: 18 };
const input = { width: '100%', boxSizing: 'border-box', background: '#151822', color: '#fff', border: '1px solid #2a3040', borderRadius: 9, padding: 11 };
const button = { border: '1px solid #303648', background: '#151924', color: '#eef1f7', borderRadius: 9, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' };
const primary = { ...button, borderColor: '#d4af37', background: 'rgba(212,175,55,.14)', color: '#f7d77b' };
const muted = { color: '#7f8798', fontSize: 12 };

const MODES = [
  { id: 'static_image', label: 'Static Image', desc: 'Reuse or create one hero image.', defaultSeconds: 1, assetsNeeded: 1 },
  { id: 'carousel', label: 'Carousel', desc: '4–6 coherent images with a swipe narrative.', defaultSeconds: 1, assetsNeeded: 5 },
  { id: 'cinematic_motion', label: 'Cinematic Motion', desc: 'One approved image with 5–8s cinematic movement.', defaultSeconds: 8, assetsNeeded: 1 },
  { id: 'multi_image_motion', label: 'Multi-Image Motion', desc: '2–4 approved images with movement between shots.', defaultSeconds: 16, assetsNeeded: 4 },
  { id: 'ugc', label: 'UGC', desc: 'Character + product + believable social behaviour.', defaultSeconds: 15, assetsNeeded: 1 },
  { id: 'short_form', label: 'Short-form', desc: '5–60s social-native video.', defaultSeconds: 30, assetsNeeded: 3 },
  { id: 'long_form', label: 'Long-form', desc: 'YouTube story with scenes, narration and cutdowns.', defaultSeconds: 600, assetsNeeded: 8 },
];

const PROVIDERS = [
  { id: 'local', label: 'Free / local first', note: '£0 external generation cost. Uses local/FFmpeg execution when an adapter is available.' },
  { id: 'mpt', label: 'MPT fallback', note: '£0 external API cost, but not reference-aware. Use only for legacy/simple formats.' },
  { id: 'grok', label: 'Grok Imagine Video', note: 'Premium adapter planned. $0.05/s at 480p or $0.07/s at 720p.' },
  { id: 'seedance_fast', label: 'Seedance 2.0 Fast', note: 'Premium adapter planned. $0.2419/s at 720p.' },
  { id: 'seedance', label: 'Seedance 2.0 Standard', note: 'Premium adapter planned. $0.3024/s at 720p.' },
];

const USD_GBP = 1 / 1.356;
const IMAGE_EDIT_USD = 0.022;
const VIDEO_RATES = {
  grok: 0.05,
  seedance_fast: 0.2419,
  seedance: 0.3024,
};

function money(value, currency = '$') {
  return `${currency}${Number(value || 0).toFixed(2)}`;
}

function estimateCost({ provider, mode, seconds, outputs, existingAssetCount }) {
  const modeInfo = MODES.find((x) => x.id === mode) || MODES[0];
  const needed = Math.max(0, modeInfo.assetsNeeded - existingAssetCount);
  const imageCost = needed * IMAGE_EDIT_USD;
  const videoRate = VIDEO_RATES[provider] || 0;
  const videoCost = videoRate * Math.max(0, Number(seconds) || 0) * Math.max(1, Number(outputs) || 1);
  const externalUsd = imageCost + videoCost;
  return {
    newImagesNeeded: needed,
    imageCost,
    videoCost,
    externalUsd,
    externalGbp: externalUsd * USD_GBP,
    localCash: 0,
    hasPremiumAdapter: Boolean(VIDEO_RATES[provider]),
  };
}

function getShots(mode, seconds, refs) {
  const total = Number(seconds) || 1;
  const modeInfo = MODES.find((x) => x.id === mode) || MODES[0];
  const count = mode === 'static_image' ? 1 : mode === 'carousel' ? 5 : mode === 'multi_image_motion' ? 4 : mode === 'long_form' ? 8 : mode === 'short_form' ? 5 : 1;
  const per = total / count;
  return Array.from({ length: count }, (_, i) => ({
    shot_order: i + 1,
    duration_seconds: Number(per.toFixed(2)),
    purpose: mode === 'carousel' ? `Carousel slide ${i + 1}` : i === 0 ? 'Hook / opening' : i === count - 1 ? 'Payoff / ending' : 'Story progression',
    visual_prompt: i === 0 ? 'Use the strongest approved reference as the opening visual.' : 'Build from the approved creative direction and maintain identity/product continuity.',
    motion_prompt: mode === 'static_image' || mode === 'carousel' ? null : 'Use restrained, believable camera movement. Prioritise human realism and continuity over spectacle.',
    voice_direction: mode === 'long_form' || mode === 'short_form' || mode === 'ugc' ? 'Natural, human delivery. Avoid robotic cadence.' : null,
    sound_direction: mode === 'long_form' || mode === 'short_form' || mode === 'ugc' ? 'Use subtle ambience and purposeful sound design.' : null,
    reference_asset_ids: refs.map((r) => r.id),
    premium_generation: mode !== 'static_image' && mode !== 'carousel',
    metadata: { mode, shot_index: i + 1 },
  }));
}

export default function CornerstoneAIAssetsProductionStudio() {
  const [projects, setProjects] = useState([]);
  const [assets, setAssets] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [mode, setMode] = useState('cinematic_motion');
  const [duration, setDuration] = useState(8);
  const [outputs, setOutputs] = useState(1);
  const [provider, setProvider] = useState('local');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const [projectRes, assetRes, charRes, productRes] = await Promise.all([
        supabase.from('track_b_content_projects').select('id,title,status,brief,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('track_b_assets').select('id,name,asset_type,public_url,provider,approval_status,metadata').eq('approval_status', 'approved').order('created_at', { ascending: false }).limit(250),
        supabase.from('track_b_characters').select('id,name,description,style_profile').order('created_at'),
        supabase.from('track_b_products').select('id,name,brand_id,source_url,description,selling_points').order('created_at', { ascending: false }).limit(250),
      ]);
      if (projectRes.error) throw projectRes.error;
      if (assetRes.error) throw assetRes.error;
      if (charRes.error) throw charRes.error;
      if (productRes.error) throw productRes.error;
      setProjects(projectRes.data || []);
      setAssets(assetRes.data || []);
      setCharacters(charRes.data || []);
      setProducts(productRes.data || []);
      if (!selectedProjectId && projectRes.data?.[0]) setSelectedProjectId(projectRes.data[0].id);
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const m = MODES.find((x) => x.id === mode);
    if (m) setDuration(m.defaultSeconds);
  }, [mode]);

  const selectedProject = useMemo(() => projects.find((x) => x.id === selectedProjectId) || null, [projects, selectedProjectId]);
  const selectedAssets = useMemo(() => assets.filter((a) => selectedAssetIds.includes(a.id)), [assets, selectedAssetIds]);
  const estimate = useMemo(() => estimateCost({ provider, mode, seconds: duration, outputs, existingAssetCount: selectedAssets.length }), [provider, mode, duration, outputs, selectedAssets.length]);
  const modeInfo = MODES.find((x) => x.id === mode) || MODES[0];

  function toggleAsset(id) {
    setSelectedAssetIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function quickSelectCharacter(name) {
    const relevant = assets.filter((a) => String(a.name || '').toLowerCase().includes(name.toLowerCase()) || String(a.metadata?.persona_name || '').toLowerCase().includes(name.toLowerCase()));
    setSelectedCharacterId(characters.find((x) => x.name.toLowerCase() === name.toLowerCase())?.id || '');
    setSelectedAssetIds(relevant.slice(0, 3).map((x) => x.id));
  }

  async function saveProductionPlan(queueMpt = false) {
    if (!selectedProject) return;
    setBusy(true);
    setMessage(queueMpt ? 'Saving and queueing the MPT fallback…' : 'Saving the reference-aware production plan…');
    try {
      const refs = selectedAssets;
      const product = products.find((x) => x.id === selectedProductId) || null;
      const shots = getShots(mode, duration, refs);
      const providerInfo = PROVIDERS.find((x) => x.id === provider);
      const config = {
        mode,
        target_duration_seconds: Number(duration),
        output_count: Number(outputs),
        provider_strategy: provider,
        selected_character_id: selectedCharacterId || null,
        selected_product_id: selectedProductId || null,
        reference_asset_ids: refs.map((x) => x.id),
        estimated_cost_usd: estimate.externalUsd,
        estimated_cost_gbp: estimate.externalGbp,
        cost_basis: providerInfo?.note || '',
        adapters: {
          local: provider === 'local',
          mpt: provider === 'mpt',
          premium: estimate.hasPremiumAdapter,
        },
      };

      const { data: productionJob, error: jobError } = await supabase.from('track_b_production_jobs').insert({
        project_id: selectedProject.id,
        mode,
        target_duration_seconds: Number(duration),
        output_count: Number(outputs),
        provider_strategy: provider,
        estimated_credits: 0,
        estimated_compute_tier: estimate.externalUsd === 0 ? 'low' : estimate.externalUsd < 5 ? 'medium' : 'high',
        config,
        status: queueMpt ? 'queued' : 'draft',
      }).select('id').single();
      if (jobError) throw jobError;

      for (const shot of shots) {
        const { error } = await supabase.from('track_b_production_shots').insert({ production_job_id: productionJob.id, ...shot });
        if (error) throw error;
      }

      if (queueMpt) {
        const { error: mptError } = await supabase.from('mpt_video_jobs').insert({
          content_queue_id: selectedProject.brief?.content_queue_id || null,
          status: 'queued',
          payload: {
            video_subject: selectedProject.title,
            video_script: selectedProject.brief?.caption || selectedProject.brief?.script || '',
            video_terms: selectedProject.brief?.photo_direction || selectedProject.brief?.photo_idea || '',
            video_aspect: '9:16',
            video_source: 'pexels',
            match_materials_to_script: true,
            subtitle_enabled: true,
            subtitle_position: 'bottom',
            video_count: Number(outputs),
            production_config: config,
            reference_assets: refs.map((x) => ({ id: x.id, url: x.public_url, name: x.name })),
            custom_system_prompt: 'Legacy MPT fallback. Produce only where the selected mode is compatible. Do not claim to use reference-aware generation.',
          },
        });
        if (mptError) throw mptError;
      }

      await supabase.from('track_b_content_projects').update({ status: queueMpt ? 'in_production' : 'planned' }).eq('id', selectedProject.id);
      setMessage(queueMpt ? 'Saved and queued the MPT fallback. Reference assets are preserved in the Track B production record, but MPT itself will not consume them.' : 'Production plan saved. No premium API was called and no external spend occurred.');
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
      await load();
    }
  }

  return (
    <div style={shell}>
      <div style={{ maxWidth: 1240, margin: '0 auto 18px' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '.16em', fontSize: 10, color: '#d4af37', fontWeight: 800 }}>CornerstoneAIAssets · Track B</div>
        <h1 style={{ margin: '8px 0 5px', fontSize: 34, letterSpacing: '-.04em' }}>Reference-aware Production Studio</h1>
        <p style={{ margin: 0, ...muted }}>Creative Engine → persistent references → production plan → cost-aware execution. Existing assets are reused before anything expensive is generated.</p>
      </div>

      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16 }}>
        <section style={card}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>1. Source + references</div>
          <div style={muted}>Choose the Creative Engine project, then lock the person/product/assets that the production must preserve.</div>
          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} style={{ ...input, marginTop: 12 }}>
            <option value="">Choose a project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.status}</option>)}
          </select>
          {selectedProject && <div style={{ ...card, background: '#0a0c12', marginTop: 12 }}><b>{selectedProject.title}</b><div style={{ ...muted, marginTop: 5 }}>{selectedProject.brief?.caption || selectedProject.brief?.hook || 'No saved caption / hook.'}</div></div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#9ca5b6', marginBottom: 6 }}>Character</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {characters.map((c) => <button key={c.id} style={selectedCharacterId === c.id ? primary : button} onClick={() => quickSelectCharacter(c.name)}>{c.name}</button>)}
              </div>
            </div>
            <label style={{ fontSize: 11, color: '#9ca5b6' }}>Product
              <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} style={{ ...input, marginTop: 6 }}>
                <option value="">No product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          <div style={{ marginTop: 16, fontWeight: 800 }}>Approved reference assets</div>
          <div style={{ ...muted, margin: '5px 0 9px' }}>Select only the references the final production actually needs. Reusing these costs £0 additional generation.</div>
          {assets.length === 0 ? <div style={{ ...card, background: '#0a0c12', ...muted }}>No approved assets yet. Sync the Asset Library first.</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 8, maxHeight: 360, overflow: 'auto', paddingRight: 4 }}>
              {assets.map((a) => {
                const selected = selectedAssetIds.includes(a.id);
                return <button key={a.id} onClick={() => toggleAsset(a.id)} style={{ ...button, padding: 0, textAlign: 'left', overflow: 'hidden', borderColor: selected ? '#d4af37' : '#303648', background: selected ? 'rgba(212,175,55,.11)' : '#11141d' }}>
                  {a.public_url && a.asset_type === 'image' ? <img src={a.public_url} alt={a.name} style={{ width: '100%', height: 112, objectFit: 'cover', display: 'block' }} /> : <div style={{ height: 112, display: 'grid', placeItems: 'center', color: '#687185' }}>{String(a.asset_type || 'asset').toUpperCase()}</div>}
                  <div style={{ padding: 8 }}><div style={{ fontSize: 11, fontWeight: 800 }}>{a.name}</div><div style={{ ...muted, marginTop: 3 }}>{a.provider || 'asset'}{selected ? ' · SELECTED' : ''}</div></div>
                </button>;
              })}
            </div>
          )}
        </section>

        <section style={card}>
          <div style={{ fontWeight: 800 }}>2. Production</div>
          <div style={{ ...muted, margin: '5px 0 12px' }}>Choose the cheapest production method that still produces the creative you actually need.</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {MODES.map((m) => <button key={m.id} onClick={() => setMode(m.id)} style={{ ...button, textAlign: 'left', borderColor: mode === m.id ? '#d4af37' : '#303648', background: mode === m.id ? 'rgba(212,175,55,.11)' : '#151924' }}><div style={{ fontWeight: 800, fontSize: 12 }}>{m.label}</div><div style={{ ...muted, marginTop: 3 }}>{m.desc}</div></button>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <label style={{ fontSize: 11, color: '#9ca5b6' }}>Duration (seconds)<input type="number" min="1" max="7200" value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ ...input, marginTop: 6 }} /></label>
            <label style={{ fontSize: 11, color: '#9ca5b6' }}>Outputs<select value={outputs} onChange={(e) => setOutputs(Number(e.target.value))} style={{ ...input, marginTop: 6 }}>{[1,2,3,5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          </div>

          <label style={{ display: 'block', marginTop: 10, fontSize: 11, color: '#9ca5b6' }}>Execution / provider
            <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ ...input, marginTop: 6 }}>{PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
          </label>

          <div style={{ ...card, background: '#0a0c12', marginTop: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 17 }}>{modeInfo.label}</div>
            <div style={{ ...muted, marginTop: 4 }}>{selectedAssets.length} approved asset{selectedAssets.length === 1 ? '' : 's'} selected · {estimate.newImagesNeeded} new image{estimate.newImagesNeeded === 1 ? '' : 's'} potentially required</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#6f788b' }}>Your external cost</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 3 }}>{estimate.externalUsd === 0 ? '£0.00' : `${money(estimate.externalUsd)} · ${money(estimate.externalGbp, '£')}`}</div><div style={{ ...muted, marginTop: 4 }}>USD · GBP estimate</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#6f788b' }}>Local / MPT cash cost</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 3 }}>£0.00</div><div style={{ ...muted, marginTop: 4 }}>Excludes your Mac electricity / time.</div></div>
            </div>
            <div style={{ ...muted, marginTop: 12, lineHeight: 1.55 }}>
              {provider === 'grok' && `Grok estimate uses $0.05/sec at 480p. At 720p the current API rate is $0.07/sec. `}
              {provider === 'seedance_fast' && `Seedance 2.0 Fast estimate uses $0.2419/sec at 720p. `}
              {provider === 'seedance' && `Seedance 2.0 Standard estimate uses $0.3024/sec at 720p. `}
              {provider === 'local' && 'No external video API spend is assumed. This is a planning/execution slot for the free/local path.'}
              {provider === 'mpt' && 'MPT is the proven Phase 1 fallback. It does not consume the selected reference assets in its current implementation.'}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <button style={primary} disabled={busy || !selectedProject} onClick={() => saveProductionPlan(false)}>{busy ? 'Saving…' : 'Save reference-aware production plan'}</button>
            <button style={button} disabled={busy || !selectedProject || provider !== 'mpt'} onClick={() => saveProductionPlan(true)}>Queue legacy MPT fallback</button>
          </div>
          <div style={{ ...muted, marginTop: 9 }}>Premium provider buttons are intentionally plan-only until the matching server-side adapter is connected. Saving a plan does not spend money.</div>
        </section>
      </div>

      <section style={{ maxWidth: 1240, margin: '16px auto 0', ...card }}>
        <div style={{ fontWeight: 800 }}>What the system will remember</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 10 }}>
          {['Character identity', 'Product reference', 'Exact approved assets', 'Shot-by-shot production plan'].map((x) => <div key={x} style={{ ...card, background: '#0a0c12', fontSize: 11, fontWeight: 800 }}>{x}</div>)}
        </div>
      </section>
    </div>
  );
}
