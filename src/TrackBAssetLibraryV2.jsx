import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const shell = { minHeight: '100vh', background: '#08070d', color: '#eef1f7', padding: '28px 32px 72px', fontFamily: 'Inter, system-ui, sans-serif' };
const card = { background: '#0e1017', border: '1px solid #252a39', borderRadius: 16, padding: 18 };
const input = { width: '100%', boxSizing: 'border-box', background: '#151822', color: '#fff', border: '1px solid #2a3040', borderRadius: 9, padding: 11 };
const button = { border: '1px solid #303648', background: '#151924', color: '#eef1f7', borderRadius: 9, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' };
const primary = { ...button, borderColor: '#d4af37', background: 'rgba(212,175,55,.14)', color: '#f7d77b' };
const muted = { color: '#7f8798', fontSize: 12 };

const REFERENCES = {
  Cara: [
    'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_5.jpg',
    'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_7.png',
    'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_8.png',
  ],
  Lila: [
    'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_2.jpeg',
    'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_10.jpeg',
    'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_12.jpeg',
  ],
};

const CHARACTER_DEFAULTS = {
  Cara: { description: 'Dedicated CornerstoneAIAssets demonstration creator. Direct, dry, disciplined, British.', style_profile: { tone: 'direct, dry, disciplined, British', visual: 'natural social/editorial realism' } },
  Lila: { description: 'Dedicated CornerstoneAIAssets demonstration creator. Measured, warm, observant, understated.', style_profile: { tone: 'measured, warm, observant, understated', visual: 'natural social/editorial realism' } },
};

function listify(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string' && v.trim()) return [v];
  return [];
}

export default function TrackBAssetLibraryV2() {
  const [workspace, setWorkspace] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [links, setLinks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState('library');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [referenceForm, setReferenceForm] = useState({ name: '', url: '', type: 'reference', characterId: '' });
  const [productForm, setProductForm] = useState({ brandName: '', website: '', productName: '', productUrl: '', description: '' });

  async function getWorkspace() {
    const { data, error } = await supabase.from('track_b_workspaces').select('*').eq('slug', 'cornerstoneaiassets-internal').maybeSingle();
    if (error) throw error;
    if (data) return data;
    const created = await supabase.from('track_b_workspaces').insert({ name: 'CornerstoneAIAssets Internal', slug: 'cornerstoneaiassets-internal', workspace_type: 'internal' }).select('*').single();
    if (created.error) throw created.error;
    return created.data;
  }

  async function ensureCharacters(ws) {
    const out = [];
    for (const name of ['Cara', 'Lila']) {
      const { data: existing, error } = await supabase.from('track_b_characters').select('*').eq('workspace_id', ws.id).eq('name', name).maybeSingle();
      if (error) throw error;
      if (existing) { out.push(existing); continue; }
      const seed = CHARACTER_DEFAULTS[name];
      const created = await supabase.from('track_b_characters').insert({ workspace_id: ws.id, name, description: seed.description, style_profile: seed.style_profile, voice_profile: { status: 'reference_required' } }).select('*').single();
      if (created.error) throw created.error;
      out.push(created.data);
    }
    return out;
  }

  async function ensureCanonicalReferences(ws, chars) {
    for (const character of chars) {
      const refs = REFERENCES[character.name] || [];
      for (let i = 0; i < refs.length; i += 1) {
        const url = refs[i];
        let { data: asset, error } = await supabase.from('track_b_assets').select('*').eq('workspace_id', ws.id).eq('source_url', url).maybeSingle();
        if (error) throw error;
        if (!asset) {
          const created = await supabase.from('track_b_assets').insert({
            workspace_id: ws.id,
            asset_type: 'reference',
            name: `${character.name} reference ${i + 1}`,
            provider: 'cara-config',
            source_url: url,
            public_url: url,
            approval_status: 'approved',
            metadata: { canonical: true, identity_reference: character.name, reference_index: i },
          }).select('*').single();
          if (created.error) throw created.error;
          asset = created.data;
        }
        const { data: link, error: linkError } = await supabase.from('track_b_character_assets').select('*').eq('character_id', character.id).eq('asset_id', asset.id).maybeSingle();
        if (linkError) throw linkError;
        if (!link) {
          const inserted = await supabase.from('track_b_character_assets').insert({ character_id: character.id, asset_id: asset.id, role: 'identity_reference', sort_order: i });
          if (inserted.error) throw inserted.error;
        }
      }
    }
  }

  async function load() {
    setBusy(true);
    try {
      const ws = await getWorkspace();
      const chars = await ensureCharacters(ws);
      await ensureCanonicalReferences(ws, chars);
      const [a, l, b, p] = await Promise.all([
        supabase.from('track_b_assets').select('*').eq('workspace_id', ws.id).order('created_at', { ascending: false }).limit(300),
        supabase.from('track_b_character_assets').select('*'),
        supabase.from('track_b_brands').select('*').eq('workspace_id', ws.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('track_b_products').select('*').order('created_at', { ascending: false }).limit(300),
      ]);
      if (a.error) throw a.error; if (l.error) throw l.error; if (b.error) throw b.error; if (p.error) throw p.error;
      setWorkspace(ws); setCharacters(chars); setAssets(a.data || []); setLinks(l.data || []); setBrands(b.data || []); setProducts(p.data || []);
    } catch (e) { setMessage(e.message || String(e)); } finally { setBusy(false); }
  }

  useEffect(() => { load(); }, []);

  const filteredAssets = useMemo(() => filter === 'all' ? assets : assets.filter(a => a.asset_type === filter), [assets, filter]);
  const linkedAssetIds = (characterId) => new Set(links.filter(l => l.character_id === characterId).map(l => l.asset_id));

  async function syncCreativeEngine() {
    if (!workspace) return;
    setBusy(true); setMessage('Syncing Creative Engine outputs…');
    try {
      const { data: rows, error } = await supabase.from('content_queue').select('id,persona_name,image_url,image_urls,video_url,content_label,caption,photo_direction,image_prompt,notes').like('content_label', '%Creative Engine%').order('created_at', { ascending: false }).limit(250);
      if (error) throw error;
      let added = 0;
      let linked = 0;
      for (const row of rows || []) {
        const urls = [...listify(row.image_urls), row.image_url, row.video_url].filter(Boolean);
        const cast = String(row.persona_name || '').toLowerCase().includes('cara + lila') ? ['Cara', 'Lila'] : [row.persona_name || ''].flatMap(n => ['Cara', 'Lila'].filter(c => String(n).toLowerCase().includes(c.toLowerCase())));
        for (const url of [...new Set(urls)]) {
          let asset = (await supabase.from('track_b_assets').select('*').eq('workspace_id', workspace.id).eq('source_url', url).maybeSingle()).data;
          if (!asset) {
            const created = await supabase.from('track_b_assets').insert({ workspace_id: workspace.id, asset_type: url === row.video_url ? 'video' : 'image', name: `${row.persona_name || 'Creative'} · ${row.content_label || 'Creative Engine'}`, provider: 'creative_engine', source_url: url, public_url: url, prompt: row.image_prompt || row.photo_direction || null, approval_status: 'approved', metadata: { content_queue_id: row.id, persona_name: row.persona_name, caption: row.caption, notes: row.notes } }).select('*').single();
            if (created.error) throw created.error;
            asset = created.data; added += 1;
          }
          for (const person of cast) {
            const character = characters.find(c => c.name === person);
            if (!character) continue;
            const existingLink = (await supabase.from('track_b_character_assets').select('*').eq('character_id', character.id).eq('asset_id', asset.id).maybeSingle()).data;
            if (existingLink) continue;
            const inserted = await supabase.from('track_b_character_assets').insert({ character_id: character.id, asset_id: asset.id, role: 'generated_media', sort_order: 0 });
            if (inserted.error) throw inserted.error;
            linked += 1;
          }
        }
      }
      setMessage(`Synced ${added} new assets and ${linked} character links.`);
      await load();
    } catch (e) { setMessage(e.message || String(e)); } finally { setBusy(false); }
  }

  async function addReference() {
    if (!workspace || !referenceForm.name.trim() || !referenceForm.url.trim()) return;
    setBusy(true);
    try {
      const created = await supabase.from('track_b_assets').insert({ workspace_id: workspace.id, asset_type: referenceForm.type, name: referenceForm.name.trim(), provider: 'reference', source_url: referenceForm.url.trim(), public_url: referenceForm.url.trim(), approval_status: 'approved', metadata: { reference_role: 'persistent_input' } }).select('*').single();
      if (created.error) throw created.error;
      if (referenceForm.characterId) {
        const linked = await supabase.from('track_b_character_assets').insert({ character_id: referenceForm.characterId, asset_id: created.data.id, role: 'reference', sort_order: 0 });
        if (linked.error) throw linked.error;
      }
      setReferenceForm({ name: '', url: '', type: 'reference', characterId: '' });
      setMessage('Reference saved.'); await load();
    } catch (e) { setMessage(e.message || String(e)); } finally { setBusy(false); }
  }

  async function addBrandProduct() {
    if (!workspace || !productForm.brandName.trim() || !productForm.productName.trim()) return;
    setBusy(true);
    try {
      const brand = await supabase.from('track_b_brands').insert({ workspace_id: workspace.id, name: productForm.brandName.trim(), website_url: productForm.website.trim() || null, claims_policy: { require_source_facts: true } }).select('*').single();
      if (brand.error) throw brand.error;
      const product = await supabase.from('track_b_products').insert({ brand_id: brand.data.id, name: productForm.productName.trim(), source_url: productForm.productUrl.trim() || null, description: productForm.description.trim() || null, claims_policy: { use_only_supplied_or_verified_claims: true } });
      if (product.error) throw product.error;
      setProductForm({ brandName: '', website: '', productName: '', productUrl: '', description: '' }); setMessage('Brand and product saved.'); await load();
    } catch (e) { setMessage(e.message || String(e)); } finally { setBusy(false); }
  }

  return <div style={shell}>
    <div style={{ maxWidth: 1240, margin: '0 auto 18px' }}><div style={{ textTransform: 'uppercase', letterSpacing: '.16em', fontSize: 10, color: '#d4af37', fontWeight: 800 }}>CornerstoneAIAssets · Track B</div><h1 style={{ margin: '8px 0 5px', fontSize: 34, letterSpacing: '-.04em' }}>Asset Library</h1><p style={{ margin: 0, ...muted }}>The Creative Engine creates. This library remembers the approved identity, product and media references that production can reuse.</p></div>
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>{[['library','Media & References'],['characters','Cara + Lila'],['brands','Brands + Products']].map(([id,label]) => <button key={id} onClick={() => setTab(id)} style={tab === id ? primary : button}>{label}</button>)}<div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}><button style={primary} onClick={syncCreativeEngine} disabled={busy}>{busy ? 'Working…' : 'Sync Creative Engine assets'}</button><button style={button} onClick={load} disabled={busy}>Refresh</button></div></div>
    {message && <div style={{ maxWidth: 1240, margin: '0 auto 16px', ...card, color: '#d4af37', fontSize: 12 }}>{message}</div>}

    {tab === 'library' && <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.5fr .75fr', gap: 16 }}><section style={card}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}><div><div style={{ fontWeight: 800, fontSize: 18 }}>Approved library</div><div style={muted}>{assets.length} persistent assets</div></div><select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...input, width: 170 }}><option value="all">All</option><option value="reference">References</option><option value="image">Images</option><option value="video">Video</option><option value="audio">Audio</option></select></div>{filteredAssets.length === 0 ? <div style={{ ...muted, padding: 20 }}>No assets yet.</div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>{filteredAssets.map(asset => <article key={asset.id} style={{ background: '#0a0c12', border: '1px solid #252a39', borderRadius: 12, overflow: 'hidden' }}>{asset.public_url && asset.asset_type !== 'video' && asset.asset_type !== 'audio' ? <img src={asset.public_url} alt={asset.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} /> : <div style={{ aspectRatio: '4/3', display: 'grid', placeItems: 'center', background: '#11131c', color: '#667087' }}>{asset.asset_type.toUpperCase()}</div>}<div style={{ padding: 12 }}><div style={{ fontSize: 12, fontWeight: 800 }}>{asset.name}</div><div style={{ ...muted, marginTop: 5 }}>{asset.provider || 'unknown'} · {asset.approval_status}</div>{asset.public_url && <a href={asset.public_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#d4af37', fontSize: 11 }}>Open asset →</a>}</div></article>)}</div>}</section><section style={card}><div style={{ fontWeight: 800, fontSize: 18 }}>Add persistent reference</div><div style={{ ...muted, margin: '6px 0 14px' }}>Use this for client products, locations, logos or additional character references. Stable URLs are supported first; file upload can be added after authenticated storage rules are in place.</div><div style={{ display: 'grid', gap: 10 }}><input style={input} placeholder="Reference name" value={referenceForm.name} onChange={e => setReferenceForm({ ...referenceForm, name: e.target.value })} /><input style={input} placeholder="https://…" value={referenceForm.url} onChange={e => setReferenceForm({ ...referenceForm, url: e.target.value })} /><select style={input} value={referenceForm.type} onChange={e => setReferenceForm({ ...referenceForm, type: e.target.value })}><option value="reference">Reference</option><option value="image">Image</option><option value="logo">Logo</option><option value="document">Document</option></select><select style={input} value={referenceForm.characterId} onChange={e => setReferenceForm({ ...referenceForm, characterId: e.target.value })}><option value="">No character link</option>{characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button style={primary} onClick={addReference} disabled={busy || !referenceForm.name.trim() || !referenceForm.url.trim()}>Save reference</button></div></section></div>}

    {tab === 'characters' && <div style={{ maxWidth: 1240, margin: '0 auto' }}><section style={card}><div style={{ fontWeight: 800, fontSize: 18 }}>Persistent creators</div><div style={{ ...muted, marginTop: 5 }}>Canonical references below come from the same Cara/Lila reference sets the current image pipeline already uses.</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginTop: 16 }}>{characters.map(character => { const ids = linkedAssetIds(character.id); const refs = assets.filter(a => ids.has(a.id)); return <article key={character.id} style={card}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><div style={{ fontWeight: 900, fontSize: 24 }}>{character.name}</div><div style={muted}>{character.description}</div></div><div style={{ color: '#d4af37', fontSize: 10, textTransform: 'uppercase' }}>identity locked</div></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 14 }}>{refs.slice(0, 9).map(asset => asset.public_url ? <img key={asset.id} src={asset.public_url} alt={asset.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, border: '1px solid #252a39' }} /> : null)}</div><div style={{ marginTop: 12, ...muted }}>{refs.length} linked assets. {REFERENCES[character.name].length} canonical identity references.</div></article>; })}</div></section></div>}

    {tab === 'brands' && <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '.85fr 1.15fr', gap: 16 }}><section style={card}><div style={{ fontWeight: 800, fontSize: 18 }}>Add brand + product</div><div style={{ ...muted, margin: '6px 0 14px' }}>Create the persistent B2B memory before generating content for a client.</div><div style={{ display: 'grid', gap: 10 }}><input style={input} placeholder="Brand name" value={productForm.brandName} onChange={e => setProductForm({ ...productForm, brandName: e.target.value })} /><input style={input} placeholder="Brand website" value={productForm.website} onChange={e => setProductForm({ ...productForm, website: e.target.value })} /><input style={input} placeholder="Product name" value={productForm.productName} onChange={e => setProductForm({ ...productForm, productName: e.target.value })} /><input style={input} placeholder="Product page / image URL" value={productForm.productUrl} onChange={e => setProductForm({ ...productForm, productUrl: e.target.value })} /><textarea style={{ ...input, minHeight: 110, resize: 'vertical' }} placeholder="Known product facts" value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} /><button style={primary} onClick={addBrandProduct} disabled={busy || !productForm.brandName.trim() || !productForm.productName.trim()}>Save brand + product</button></div></section><section style={card}><div style={{ fontWeight: 800, fontSize: 18 }}>B2B memory</div><div style={{ ...muted, margin: '6px 0 14px' }}>{brands.length} brands · {products.length} products</div><div style={{ display: 'grid', gap: 10 }}>{brands.map(brand => <div key={brand.id} style={{ padding: 12, background: '#0a0c12', border: '1px solid #252a39', borderRadius: 10 }}><div style={{ fontWeight: 800 }}>{brand.name}</div><div style={muted}>{brand.website_url || 'No website stored'}</div>{products.filter(p => p.brand_id === brand.id).map(p => <div key={p.id} style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #d4af37' }}><div style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div><div style={muted}>{p.source_url || 'No product URL'}{p.description ? ` · ${p.description}` : ''}</div></div>)}</div>)}{brands.length === 0 && <div style={muted}>No client brands yet.</div>}</div></section></div>}
  </div>;
}
