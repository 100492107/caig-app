import React, { useMemo, useState } from 'react'
import { creatorDnaFor } from '../shared/creator-dna.js'
import { CARA_LILA_PUBLIC_CHANNELS } from '../shared/creator-links.js'

const IMAGE_REFERENCES = {
  cara: 'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_5.jpg',
  lila: 'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_12.jpeg',
}

const TABS = [
  ['cara', 'Cara Whitmore', 'Build'],
  ['lila', 'Lila Sterling', 'Notice'],
  ['duo', 'Cara + Lila', 'Together'],
]

function List({ items }) {
  if (!Array.isArray(items) || !items.length) return <span className="dna-empty">None recorded</span>
  return <div className="dna-list">{items.map((item, index) => <span key={index}>{item}</span>)}</div>
}

function Fact({ label, value, wide = false }) {
  return (
    <div className={`dna-fact${wide ? ' dna-fact-wide' : ''}`}>
      <div className="dna-label">{label}</div>
      <div className="dna-value">{value || '—'}</div>
    </div>
  )
}

function PublicChannels({ label = 'Public distribution' }) {
  return (
    <div className="dna-public">
      <div className="dna-section-head"><strong>{label}</strong><span>Canonical public destinations</span></div>
      <div className="dna-public-grid">
        {CARA_LILA_PUBLIC_CHANNELS.map((channel) => (
          <a key={channel.network} href={channel.url} target="_blank" rel="noreferrer">
            <span>{channel.network}</span>
            <strong>{channel.handle || channel.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</strong>
          </a>
        ))}
      </div>
    </div>
  )
}

function CreatorMiniCard({ id }) {
  const dna = creatorDnaFor(id)
  return (
    <article className="dna-mini-card">
      <div className="dna-mini-top">
        <img src={IMAGE_REFERENCES[id]} alt={dna.name} />
        <div>
          <div className="dna-kicker">{dna.coreVerb}</div>
          <h3>{dna.name}</h3>
          <p>{dna.soul}</p>
        </div>
      </div>
      <div className="dna-mini-grid">
        <Fact label="Need" value={dna.coreNeed} />
        <Fact label="Signature question" value={dna.signatureQuestion} />
      </div>
    </article>
  )
}


const PUBLIC_CHANNEL_CSS = `
.dna-public{margin-top:14px;padding:14px 15px;border:1px solid var(--border,#2a3038);border-radius:14px;background:var(--surface,#11151b)}
.dna-public-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}
.dna-public-grid a{display:block;padding:9px 10px;border:1px solid var(--border,#2a3038);border-radius:10px;background:var(--panel,#0d1117);color:inherit;text-decoration:none;min-width:0}
.dna-public-grid a:hover{border-color:var(--accent,#d4b56a);background:rgba(212,181,106,.06)}
.dna-public-grid span{display:block;font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-subtle,#7d8593);font-weight:800}
.dna-public-grid strong{display:block;margin-top:5px;font-size:9px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:850px){.dna-public-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

export default function CreatorDnaDossier() {
  const [tab, setTab] = useState('cara')
  const dna = useMemo(() => creatorDnaFor(tab), [tab])
  const isDuo = tab === 'duo'

  return (
    <section className="dna-dossier">
      <style>{PUBLIC_CHANNEL_CSS}</style>
      <div className="dna-header">
        <div>
          <div className="dna-kicker">Canonical identity system</div>
          <h2>Nothing generated here starts from a blank character.</h2>
          <p>Every creator job should inherit this source of truth before ideas, captions, visual direction or monetisation are produced.</p>
        </div>
        <div className="dna-lock">
          <span className="dna-lock-dot" />
          Frozen · runtime source
        </div>
      </div>

      <div className="dna-tabs" role="tablist" aria-label="Creator DNA">
        {TABS.map(([id, label, verb]) => (
          <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
            <span>{label}</span>
            <small>{verb}</small>
          </button>
        ))}
      </div>

      {isDuo ? (
        <>
          <div className="dna-duo-hero">
            <div className="dna-duo-images">
              <img src={IMAGE_REFERENCES.cara} alt="Cara Whitmore" />
              <img src={IMAGE_REFERENCES.lila} alt="Lila Sterling" />
            </div>
            <div>
              <div className="dna-kicker">Shared account logic</div>
              <h3>{dna.coreDynamic}</h3>
              <p>{dna.sharedSoul}</p>
            </div>
          </div>
          <div className="dna-section">
            <div className="dna-section-head"><strong>Contrast</strong><span>Both minds stay visible</span></div>
            <List items={dna.contrast} />
          </div>
          <div className="dna-facts">
            <Fact label="Story engine" value={dna.contentEngine} wide />
            <Fact label="Signature question" value={dna.signatureQuestion} wide />
          </div>
          <details className="dna-details">
            <summary>Relationship rules</summary>
            <List items={dna.relationshipRules} />
          </details>
          <PublicChannels label="Cara + Lila · public account" />
          <div className="dna-duo-grid">
            <CreatorMiniCard id="cara" />
            <CreatorMiniCard id="lila" />
          </div>
        </>
      ) : (
        <>
          <div className="dna-hero">
            <div className="dna-portrait"><img src={IMAGE_REFERENCES[tab]} alt={dna.name} /></div>
            <div className="dna-hero-copy">
              <div className="dna-kicker">{dna.coreVerb} · {dna.name}</div>
              <h3>“{dna.soul}”</h3>
              <p>{dna.narrativeArc}</p>
              <div className="dna-hero-meta">
                <span><b>Audience fantasy</b>{dna.audienceFantasy}</span>
                <span><b>Social role</b>{dna.socialRole}</span>
              </div>
            </div>
          </div>

          <PublicChannels label="Cara + Lila · shared public account" />

          <div className="dna-facts">
            <Fact label="Core need" value={dna.coreNeed} />
            <Fact label="Central desire" value={dna.centralDesire} />
            <Fact label="Core fear" value={dna.coreFear} />
            <Fact label="Signature question" value={dna.signatureQuestion} />
            <Fact label="Story engine" value={dna.storyEngine} wide />
            <Fact label="Humour" value={dna.humour} />
            <Fact label="Faith" value={dna.faith} />
            <Fact label="Money" value={dna.money} />
            <Fact label="Fitness" value={dna.fitness} />
            <Fact label="Relationships" value={dna.relationships} wide />
          </div>

          <div className="dna-grid">
            <div className="dna-section">
              <div className="dna-section-head"><strong>Worldview</strong><span>Beliefs that shape choices</span></div>
              <List items={dna.worldview} />
            </div>
            <div className="dna-section">
              <div className="dna-section-head"><strong>Contradictions</strong><span>Keep the person human</span></div>
              <List items={dna.contradictions} />
            </div>
            <div className="dna-section">
              <div className="dna-section-head"><strong>Notices</strong><span>What catches attention</span></div>
              <List items={dna.notices} />
            </div>
            <div className="dna-section">
              <div className="dna-section-head"><strong>Seeks</strong><span>What she moves towards</span></div>
              <List items={dna.seeks} />
            </div>
            <div className="dna-section">
              <div className="dna-section-head"><strong>Avoids</strong><span>What the engine rejects</span></div>
              <List items={dna.avoids} />
            </div>
            <div className="dna-section">
              <div className="dna-section-head"><strong>Behaviour rules</strong><span>How she appears in content</span></div>
              <List items={dna.behaviourRules} />
            </div>
          </div>

          <details className="dna-details">
            <summary>Content territories + language system</summary>
            <div className="dna-details-grid">
              <Fact label="Content territories" value={<List items={dna.contentTerritories} />} />
              <Fact label="Rhythm" value={dna.language?.rhythm} />
              <Fact label="Preferred language" value={<List items={dna.language?.preferred} />} />
              <Fact label="Banned language" value={<List items={dna.language?.banned} />} />
            </div>
          </details>
        </>
      )}
    </section>
  )
}
