import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const shell = { minHeight: '100vh', background: '#08070d', color: '#eef1f7', padding: '28px 32px 72px', fontFamily: 'Inter, system-ui, sans-serif' };
const card = { background: '#0e1017', border: '1px solid #252a39', borderRadius: 16, padding: 18 };
const input = { width: '100%', boxSizing: 'border-box', background: '#151822', color: '#fff', border: '1px solid #2a3040', borderRadius: 9, padding: 11 };
const button = { border: '1px solid #303648', background: '#151924', color: '#eef1f7', borderRadius: 9, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' };
const primary = { ...button, borderColor: '#d4af37', background: 'rgba(212,175,55,.14)', color: '#f7d77b' };
const muted = { color: '#7f8798', fontSize: 12 };

const DEFAULT_PEOPLE = [
  { name: 'Cara', description: 'Dedicated CornerstoneAIAssets demonstration creator. Direct, dry, disciplined, British.', style: { visual: 'natural social/editorial realism', tone: 'direct, dry, disciplined, British' } },
  { name: 'Lila', description: 'Dedicated CornerstoneAIAssets demonstration creator. Measured, warm, observant, understated.', style: { visual: 'natural social/editorial realism', tone: 'measured, warm, observant, understated' } },
];

function safeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') return [value];
  return [];
}

export default function TrackBAssetLibrary() {
  const [workspace, setWorkspace] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [assets, setAssets] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState('assets');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [referenceForm, setReferenceForm] = useState({ name: '', url: '', type: 'reference', characterId: '' });
  const [productForm, setProductForm] = useState({ brandName: '', website: '', productName: '', productUrl: '', description: '' });

  async function ensureWorkspace() {
    const { data: existing, error } = await supabase.from('track_b_workspaces').select('*').eq('slug', 'cornerstoneaiassets-internal').maybeSingle();
    if (error) throw error;
    if (existing) return existing;
    const { data, error: insertError } = await supabase.from('track_b_workspaces').insert({
      name: 'CornerstoneAIAssets Internal',
      slug: 'cornerstoneaiassets-internal',
      workspace_type: 'internal',
      status: 'active',
    }).select('*').single();
    if (insertError) throw insertError;
    return data;
  }

  async function ensureCharacterSeeds(ws) {
    const { data: existing, error } = await supabase.from('track_b_characters').select('*').eq('workspace_id', ws.id).order('created_at');
    if (error) throw error;
    const list = existing || [];
    for (const person of DEFAULT_PEOPLE) {
      if (list.some((x) => x.name.toLowerCase() === person.name.toLowerCase())) continue;
      const { data: created, error: createError } = await supabase.from('track_b_characters').insert({
        workspace_id: ws.id,
        name: person.name,
        description: person.description,
        style_profile: person.style,
        voice_profile: { status: 'reference_required' },
      }).select('*').single();
      if (createError) throw createError;
      list.push(created);
    }
    return list;
  }

  async function load() {
    setBusy(true);
    try {
      const ws = await ensureWorkspace();
      const chars = await ensureCharacterSeeds(ws);
      const [assetRes, brandRes, productRes] = await Promise.all([
        supabase.from('track_b_assets').select('*').eq('workspace_id', ws.id).order('created_at', { ascending: false }).limit(250),
        supabase.from('track_b_brands').select('*').eq('workspace_id', ws.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('track_b_products').select('*').order('created_at', { ascending: false }).limit(250),
      ]);
      if (assetRes.error) throw assetRes.error;
      if (brandRes.error) throw brandRes.error;
      if (productRes.error) throw productRes.error;
      setWorkspace(ws);
      setCharacters(chars);
      setAssets(assetRes.data || []);
      setBrands(brandRes.data || []);
      setProducts(productRes.data || []);
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filteredAssets = useMemo(() => {
    if (filter === 'all') return assets;
    return assets.filter((a) => a.asset_type === filter);
  }, [assets, filter]);

  async function importCreativeEngineAssets() {
    if (!workspace) return;
    setBusy(true);
    setMessage('Importing existing Creative Engine media into the persistent asset library…');
    try {
      const { data: rows, error } = await supabase.from('content_queue')
        .select('id,persona_name,image_url,image_urls,video_url,content_label,caption,photo_direction,image_prompt,notes,created_at')
        .like('content_label', '%Creative Engine%')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      let added = 0;
      for (const row of rows || []) {
        const urls = [...safeArray(row.image_urls), row.image_url, row.video_url].filter(Boolean);
        for (const url of [...new Set(urls)]) {
          const assetType = url === row.video_url ? 'video' : 'image';
          const name = `${row.persona_name || 'Creative'} · ${row.content_label || 'Creative Engine'} · ${assetType}`;
          const { data: existing } = await supabase.from('track_b_assets').select('id').eq('workspace_id', workspace.id).eq('source_url', url).maybeSingle();
          if (existing) continue;
          const { error: insertError } = await supabase.from('track_b_assets').insert({
            workspace_id: workspace.id,
            asset_type: assetType,
            name,
            provider: 'creative_engine',
            source_url: url,
            public_url: url,
            prompt: row.image_prompt || row.photo_direction || null,
            approval_status: 'approved',
            metadata: {
              source: 'content_queue',
              content_queue_id: row.id,
              persona_name: row.persona_name,
              caption: row.caption,
              notes: row.notes,
              imported_at: new Date().toISOString(),
            },
          });
          if (insertError) throw insertError;
          added += 1;
        }
      }
      setMessage(`Imported ${added} new Creative Engine asset${added === 1 ? '' : 's'}.`);
      await load();
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  async function addReference() {
    if (!workspace || !referenceForm.name.trim() || !referenceForm.url.trim()) return;
    setBusy(true);
    setMessage('Saving reference…');
    try {
      const { data: asset, error } = await supabase.from('track_b_assets').insert({
        workspace_id: workspace.id,
        asset_type: referenceForm.type,
        name: referenceForm.name.trim(),
        provider: 'reference',
        source_url: referenceForm.url.trim(),
        public_url: referenceForm.url.trim(),
        approval_status: 'approved',
        metadata: { reference_role: 'persistent_input' },
      }).select('*').single();
      if (error) throw error;
      if (referenceForm.characterId) {
        const { error: linkError } = await supabase.from('track_b_character_assets').insert({
          character_id: referenceForm.characterId,
          asset_id: asset.id,
          role: 'reference',
          sort_order: 0,
        });
        if (linkError) throw linkError;
      }
      setReferenceForm({ name: '', url: '', type: 'reference', characterId: '' });
      setMessage('Reference saved to the persistent asset library.');
      await load();
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  async function addBrandAndProduct() {
    if (!workspace || !productForm.brandName.trim() || !productForm.productName.trim()) return;
    setBusy(true);
    try {
      const slugBase = productForm.brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `brand-${Date.now()}`;
      const { data: brand, error: brandError } = await supabase.from('track_b_brands').insert({
        workspace_id: workspace.id,
        name: productForm.brandName.trim(),
        website_url: productForm.website.trim() || null,
        claims_policy: { require_source_facts: true },
      }).select('*').single();
      if (brandError) throw brandError;
      const { error: productError } = await supabase.from('track_b_products').insert({
        brand_id: brand.id,
        name: productForm.productName.trim(),
        source_url: productForm.productUrl.trim() || null,
        description: productForm.description.trim() || null,
        selling_points: [],
        claims_policy: { use_only_supplied_or_verified_claims: true },
      });
      if (productError) throw productError;
      setProductForm({ brandName: '', website: '', productName: '', productUrl: '', description: '' });
      setMessage(`Saved ${productForm.productName.trim()} under ${productForm.brandName.trim()}.`);
      await load();
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={shell}>
      <div style={{ maxWidth: 1240, margin: '0 auto 18px' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '.16em', fontSize: 10, color: '#d4af37', fontWeight: 800 }}>CornerstoneAIAssets · Track B</div>
        <h1 style={{ margin: '8px 0 5px', fontSize: 34, letterSpacing: '-.04em' }}>Asset Library</h1>
        <p style={{ margin: 0, ...muted }}>Persistent characters, references, generated media, brands and products. The Creative Engine creates. This library remembers.</p>
      </div>

      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          ['assets', 'Media & References'],
          ['characters', 'Cara + Lila'],
          ['brands', 'Brands + Products'],
        ].map(([id, label]) => <button key={id} onClick={() => setTab(id)} style={tab === id ? primary : button}>{label}</button>)}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={primary} onClick={importCreativeEngineAssets} disabled={busy}>{busy ? 'Working…' : 'Sync Creative Engine assets'}</button>
          <button style={button} onClick={load} disabled={busy}>Refresh</button>
        </div>
      </div>

      {message && <div style={{ maxWidth: 1240, margin: '0 auto 16px', ...card, color: '#d4af37', fontSize: 12 }}>{message}</div>}

      {tab === 'assets' && <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.5fr .75fr', gap: 16 }}>
        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div><div style={{ fontWeight: 800, fontSize: 18 }}>Approved library</div><div style={muted}>{assets.length} persistent assets</div></div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...input, width: 170 }}>
              <option value="all">All</option><option value="image">Images</option><option value="video">Video</option><option value="reference">References</option><option value="audio">Audio</option>
            </select>
          </div>
          {filteredAssets.length === 0 ? <div style={{ ...muted, padding: 20 }}>No assets yet. Sync the Creative Engine or add references manually.</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {filteredAssets.map((asset) => <article key={asset.id} style={{ background: '#0a0c12', border: '1px solid #252a39', borderRadius: 12, overflow: 'hidden' }}>
                {asset.public_url && asset.asset_type === 'image' ? <img src={asset.public_url} alt={asset.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} /> : <div style={{ aspectRatio: '4/3', display: 'grid', placeItems: 'center', background: '#11131c', color: '#667087', fontSize: 12 }}>{asset.asset_type.toUpperCase()}</div>}
                <div style={{ padding: 12 }}><div style={{ fontSize: 12, fontWeight: 800 }}>{asset.name}</div><div style={{ ...muted, marginTop: 5 }}>{asset.provider || 'unknown'} · {asset.approval_status}</div>{asset.public_url && <a href={asset.public_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#d4af37', fontSize: 11 }}>Open asset →</a>}</div>
              </article>)}
            </div>
          )}
        </section>

        <section style={card}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Add persistent reference</div>
          <div style={{ ...muted, margin: '6px 0 14px' }}>Paste a stable image URL for a person, product, location, brand reference or style reference. File upload can sit on top of this once authenticated storage policies are tightened.</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <input style={input} placeholder="Reference name" value={referenceForm.name} onChange={(e) => setReferenceForm({ ...referenceForm, name: e.target.value })} />
            <input style={input} placeholder="https://…" value={referenceForm.url} onChange={(e) => setReferenceForm({ ...referenceForm, url: e.target.value })} />
            <select style={input} value={referenceForm.type} onChange={(e) => setReferenceForm({ ...referenceForm, type: e.target.value })}><option value="reference">Reference</option><option value="image">Image</option><option value="logo">Logo</option><option value="document">Document</option></select>
            <select style={input} value={referenceForm.characterId} onChange={(e) => setReferenceForm({ ...referenceForm, characterId: e.target.value })}><option value="">No character link</option>{characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <button style={primary} onClick={addReference} disabled={busy || !referenceForm.name.trim() || !referenceForm.url.trim()}>Save reference</button>
          </div>
        </section>
      </div>}

      {tab === 'characters' && <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <section style={card}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Persistent creators</div><div style={muted}>Cara and Lila are first-class production references. Add approved identity images rather than generating a new identity from scratch every time.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginTop: 16 }}>
            {characters.map((character) => {
              const linked = assets.filter((a) => a.asset_type !== 'video' && String(a.metadata?.character_id || '') === character.id);
              return <article key={character.id} style={card}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div style={{ fontWeight: 900, fontSize: 22 }}>{character.name}</div><div style={muted}>{character.description}</div></div><div style={{ color: '#d4af37', fontSize: 10, textTransform: 'uppercase' }}>persistent identity</div></div><div style={{ marginTop: 14, padding: 12, background: '#0a0c12', borderRadius: 10, border: '1px solid #252a39' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#7c8495' }}>Style profile</div><pre style={{ whiteSpace: 'pre-wrap', color: '#cfd5e0', fontSize: 11, margin: '8px 0 0' }}>{JSON.stringify(character.style_profile || {}, null, 2)}</pre></div><div style={{ marginTop: 14, ...muted }}>{linked.length} explicitly linked references. Use the reference form to attach identity images to {character.name}.</div></article>;
            })}
          </div>
        </section>
      </div>}

      {tab === 'brands' && <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '.85fr 1.15fr', gap: 16 }}>
        <section style={card}><div style={{ fontWeight: 800, fontSize: 18 }}>Add brand + product</div><div style={{ ...muted, margin: '6px 0 14px' }}>This is the B2B foundation. Store the real product, source URL and known facts before the creative engine writes content.</div><div style={{ display: 'grid', gap: 10 }}><input style={input} placeholder="Brand name" value={productForm.brandName} onChange={(e) => setProductForm({ ...productForm, brandName: e.target.value })} /><input style={input} placeholder="Brand website" value={productForm.website} onChange={(e) => setProductForm({ ...productForm, website: e.target.value })} /><input style={input} placeholder="Product name" value={productForm.productName} onChange={(e) => setProductForm({ ...productForm, productName: e.target.value })} /><input style={input} placeholder="Product page / image URL" value={productForm.productUrl} onChange={(e) => setProductForm({ ...productForm, productUrl: e.target.value })} /><textarea style={{ ...input, minHeight: 110, resize: 'vertical' }} placeholder="Known product description / facts" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /><button style={primary} onClick={addBrandAndProduct} disabled={busy || !productForm.brandName.trim() || !productForm.productName.trim()}>Save brand + product</button></div></section><section style={card}><div style={{ fontWeight: 800, fontSize: 18 }}>B2B memory</div><div style={{ ...muted, margin: '6px 0 14px' }}>{brands.length} brands · {products.length} products</div><div style={{ display: 'grid', gap: 10 }}>{brands.map((brand) => <div key={brand.id} style={{ padding: 12, background: '#0a0c12', border: '1px solid #252a39', borderRadius: 10 }}><div style={{ fontWeight: 800 }}>{brand.name}</div><div style={muted}>{brand.website_url || 'No website stored'}</div>{products.filter((p) => p.brand_id === brand.id).map((p) => <div key={p.id} style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #d4af37' }}><div style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div><div style={muted}>{p.source_url || 'No product URL'}{p.description ? ` · ${p.description}` : ''}</div></div>)}</div>)}{brands.length === 0 && <div style={muted}>No client brands yet.</div>}</div></section></div>}
    </div>
  );
}
