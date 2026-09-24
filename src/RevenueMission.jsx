import React from 'react'
import EnterpriseShell from './EnterpriseShell.jsx'

const MATH = [
  ['£30 × 15%', '£4.50', 'example commission per sale'],
  ['100 sales', '£450', 'example economics'],
  ['500 sales', '£2,250', 'example economics'],
  ['1,000 sales', '£4,500', 'example economics'],
]

const LOOP = [
  'Real product signal',
  'Interesting idea',
  'Cara / Lila concept',
  'Real product evidence',
  'AI creator presentation',
  'CTA',
  'Tracked sale',
  'Learn',
]

const PRODUCT_FILTERS = [
  '£15–£60 retail price',
  'Visually demonstrable',
  'Obvious use case',
  'Strong existing reviews',
  'Available on TikTok Shop',
  'Meaningful commission',
  'No medical / miracle claims',
]

const TESTS = [
  ['Discovery', '“I didn’t realise this existed…”'],
  ['Problem', '“This fixes the annoying part of…”'],
  ['Comparison', '“You don’t need the expensive version…”'],
  ['Aesthetic', 'Lila discovers the product naturally inside a lifestyle context.'],
  ['Opinion', 'Specific observation. Never fabricated personal experience.'],
]

const css = `
.rm-page{display:grid;gap:18px}
.rm-panel{display:grid;gap:13px;padding:20px;border:1px solid var(--cs-os-line);border-radius:16px;background:var(--cs-os-panel)}
.rm-panel.is-primary{background:linear-gradient(135deg,rgba(212,181,106,.08),rgba(255,255,255,.018));border-color:rgba(212,181,106,.28)}
.rm-eyebrow{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--cs-os-accent);font-weight:800}
.rm-title{margin:0;font-size:clamp(31px,4vw,52px);line-height:.96;letter-spacing:-.055em;font-weight:650}
.rm-lead{margin:0;max-width:72ch;color:var(--cs-os-muted);font-size:13px;line-height:1.65}
.rm-meta{display:flex;flex-wrap:wrap;gap:7px}
.rm-pill{display:inline-flex;align-items:center;min-height:28px;padding:0 9px;border:1px solid var(--cs-os-line);border-radius:999px;color:var(--cs-os-text);font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.rm-pill.is-live{border-color:rgba(212,181,106,.34);color:var(--cs-os-accent);background:rgba(212,181,106,.06)}
.rm-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.rm-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
.rm-card{padding:14px;border:1px solid var(--cs-os-line);border-radius:13px;background:rgba(255,255,255,.012)}
.rm-card b{display:block;font-size:17px;letter-spacing:-.03em}
.rm-card span{display:block;margin-top:4px;color:var(--cs-os-muted);font-size:9px;line-height:1.45}
.rm-section-title{margin:0;font-size:15px;font-weight:700;letter-spacing:-.02em}
.rm-copy{margin:0;color:var(--cs-os-muted);font-size:11px;line-height:1.6}
.rm-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.rm-list{display:grid;gap:7px}
.rm-row{display:flex;justify-content:space-between;gap:10px;padding:11px 12px;border:1px solid var(--cs-os-line);border-radius:11px;background:rgba(255,255,255,.012);font-size:10px;line-height:1.45}
.rm-row strong{color:var(--cs-os-text)}
.rm-row span{color:var(--cs-os-muted)}
.rm-row em{font-style:normal;color:var(--cs-os-accent);font-weight:800;white-space:nowrap}
.rm-loop{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px}
.rm-loop-item{min-height:72px;padding:10px;border:1px solid var(--cs-os-line);border-radius:11px;background:rgba(255,255,255,.012);font-size:9px;font-weight:750;line-height:1.4}
.rm-loop-item i{display:grid;place-items:center;width:20px;height:20px;margin-bottom:7px;border-radius:6px;background:rgba(212,181,106,.08);color:var(--cs-os-accent);font-style:normal;font-size:8px}
.rm-step{display:grid;grid-template-columns:28px 1fr auto;gap:9px;align-items:start;padding:10px 11px;border:1px solid var(--cs-os-line);border-radius:11px;background:rgba(255,255,255,.012)}
.rm-step-num{display:grid;place-items:center;width:24px;height:24px;border-radius:7px;background:rgba(212,181,106,.08);color:var(--cs-os-accent);font-size:9px;font-weight:850}
.rm-step strong{display:block;font-size:10px}
.rm-step span{display:block;margin-top:3px;color:var(--cs-os-muted);font-size:9px;line-height:1.5}
.rm-quiet{padding:12px 13px;border:1px solid rgba(212,181,106,.18);border-radius:11px;background:rgba(212,181,106,.04);color:var(--cs-os-muted);font-size:10px;line-height:1.55}
.rm-quiet strong{color:var(--cs-os-text)}
.rm-footer{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;padding-top:2px;color:var(--cs-os-muted);font-size:9px}
.rm-link{color:var(--cs-os-accent);font-size:10px;font-weight:800;text-decoration:none}
@media(max-width:980px){.rm-loop{grid-template-columns:repeat(4,minmax(0,1fr))}.rm-grid{grid-template-columns:1fr 1fr}}
@media(max-width:700px){.rm-cols{grid-template-columns:1fr}.rm-grid.three{grid-template-columns:1fr}.rm-loop{grid-template-columns:1fr 1fr}}
`

export function RevenueMissionBanner(){
  return (
    <section className="rm-panel is-primary">
      <style>{css}</style>
      <div className="rm-eyebrow">Operating directive</div>
      <div>
        <h2 className="rm-section-title" style={{fontSize:'22px'}}>Money first. Prove the loop.</h2>
        <p className="rm-lead" style={{marginTop:8}}>
          The product-building phase has produced the machine. The priority is now to get a real creator → commerce → revenue → Learn loop working before we add more substantial product work.
        </p>
      </div>
      <div className="rm-meta">
        <span className="rm-pill is-live">GO</span>
        <span className="rm-pill">7-day first commission objective</span>
        <span className="rm-pill">14-day commercial sprint</span>
      </div>
      <div className="rm-grid three">
        <div className="rm-card"><b>First tracked commission</b><span>Primary proof</span></div>
        <div className="rm-card"><b>2 different experiments / day</b><span>Cadence after launch</span></div>
        <div className="rm-card"><b>£15–£60 products</b><span>Initial test band</span></div>
      </div>
      <div className="rm-footer">
        <span>Additional product work is only progress when it removes a blocker to the live revenue loop.</span>
        <a className="rm-link" href="/mission">Open directive →</a>
      </div>
    </section>
  )
}

export default function RevenueMission(){
  return (
    <EnterpriseShell active="mission" eyebrow="Directive">
      <main className="rm-page">
        <style>{css}</style>

        <header className="cs-page-head" style={{gap:10}}>
          <div className="eyebrow">Operating directive · Track B</div>
          <h1>Prove the money loop.</h1>
          <p>One real experiment. One real market response. One measured result. Then repeat what the evidence tells us to repeat.</p>
        </header>

        <section className="rm-panel is-primary">
          <div className="rm-meta">
            <span className="rm-pill is-live">GO</span>
            <span className="rm-pill">First money is the priority</span>
          </div>
          <p className="rm-lead">
            We already have creator DNA, research, generation, storage, production QA, publication structures and learning infrastructure. The remaining proof is the real operating cycle: Generate → Save → Publish → Measure → Learn.
          </p>
          <div className="rm-loop">
            {LOOP.map((step,i)=>(
              <div className="rm-loop-item" key={step}>
                <i>{String(i+1).padStart(2,'0')}</i>
                {step}
              </div>
            ))}
          </div>
          <div className="rm-quiet"><strong>Our agreement:</strong> stop treating more product work as progress unless it directly helps this loop run, get measured or learn faster.</div>
        </section>

        <section className="rm-cols">
          <article className="rm-panel">
            <div className="rm-eyebrow">Time box</div>
            <h2 className="rm-section-title">The first 14 days are about commercial proof.</h2>
            <div className="rm-grid three">
              <div className="rm-card"><b>7 days</b><span>Objective: first tracked commission</span></div>
              <div className="rm-card"><b>14 days</b><span>Objective: establish what produces commercial behaviour</span></div>
              <div className="rm-card"><b>2 / day</b><span>Different experiments once live</span></div>
            </div>
            <p className="rm-copy">The first objective is deliberately small. We are not waiting for followers, a large audience or £10,000. We need one transaction that closes the creator → content → commerce → revenue loop.</p>
          </article>

          <article className="rm-panel">
            <div className="rm-eyebrow">Phase 1</div>
            <h2 className="rm-section-title">TikTok Shop affiliate commerce</h2>
            <p className="rm-copy">Sell other people's products first. That removes manufacturing, inventory, fulfilment, returns, customer service and working-capital complexity from the initial demand test.</p>
            <div className="rm-list">
              {PRODUCT_FILTERS.map(x=><div className="rm-row" key={x}><span>{x}</span></div>)}
            </div>
          </article>
        </section>

        <section className="rm-panel">
          <div className="rm-eyebrow">Two owned commercial personalities</div>
          <h2 className="rm-section-title">Cara builds. Lila notices.</h2>
          <div className="rm-cols">
            <div className="rm-list">
              <div className="rm-row"><span><strong>Cara</strong> · useful discoveries, organisation, capability, practical upgrades</span><em>BUILD</em></div>
              <div className="rm-row"><span><strong>Lila</strong> · taste, wardrobe, interiors, travel, little luxuries, beautiful useful things</span><em>NOTICE</em></div>
            </div>
            <div className="rm-quiet">These are recognisable creator businesses, not two generic shopping feeds. Commerce still has to feel native to each creator's existing DNA.</div>
          </div>
        </section>

        <section className="rm-cols">
          <article className="rm-panel">
            <div className="rm-eyebrow">Content experiments</div>
            <h2 className="rm-section-title">Different mechanisms, not clones.</h2>
            <div className="rm-list">
              {TESTS.map(([a,b])=><div className="rm-row" key={a}><span><strong>{a}</strong><br/>{b}</span></div>)}
            </div>
            <div className="rm-quiet"><strong>Non-negotiable:</strong> never fabricate personal experience, testimonials, audience reactions, revenue, views, commissions, product facts or results.</div>
          </article>

          <article className="rm-panel">
            <div className="rm-eyebrow">72-hour attack</div>
            <h2 className="rm-section-title">Get the first experiment into market.</h2>
            <div className="rm-list">
              {[
                ['01','Commerce access','Set up the live creator identity, shop access, Instagram, link destination and showcase.'],
                ['02','Product hunting','Find 10 candidates from the signal layer; select the strongest 5 for samples.'],
                ['03','Creative','Use product evidence with the Cara/Lila recipes; create the first 10–15 assets and tracking.'],
                ['04','Publish','Put the first real experiment in front of real people.'],
              ].map(([n,t,d])=><div className="rm-step" key={n}><div className="rm-step-num">{n}</div><div><strong>{t}</strong><span>{d}</span></div><span className="rm-pill is-live">GO</span></div>)}
            </div>
          </article>
        </section>

        <section className="rm-panel">
          <div className="rm-eyebrow">The numbers</div>
          <h2 className="rm-section-title">Economics, not a forecast.</h2>
          <div className="rm-grid">
            {MATH.map(([a,b,c])=>(
              <div className="rm-card" key={a}>
                <span>{a}</span>
                <b style={{color:'var(--cs-os-accent)'}}>{b}</b>
                <span>{c}</span>
              </div>
            ))}
          </div>
          <p className="rm-copy">Example only: £30 retail price × 15% commission = £4.50 per sale. Actual commission varies by offer. The question is whether Cornerstone can repeatedly create content that produces measurable commercial behaviour.</p>
        </section>

        <section className="rm-panel">
          <div className="rm-eyebrow">Measure → Learn</div>
          <h2 className="rm-section-title">Every test returns to the machine.</h2>
          <div className="rm-grid">
            {['Creator','Product','Signal','Mechanism','Platform','Format','CTA','Views / retention','Clicks','Orders','Commission','Creative DNA'].map(x=>(
              <div className="rm-card" key={x}><b style={{fontSize:12}}>{x}</b></div>
            ))}
          </div>
          <p className="rm-copy">When the result is real, Cornerstone records the evidence, evaluates it against comparable owned results where possible, and turns validated learning into the next input.</p>
        </section>

        <section className="rm-cols">
          <article className="rm-panel">
            <div className="rm-eyebrow">Days 8–14</div>
            <h2 className="rm-section-title">Let the evidence decide what gets more production.</h2>
            <p className="rm-copy">Repeat promising mechanisms. Drop weak ones. Introduce the second monetisation layer only after the first commerce loop is actually running.</p>
            <div className="rm-quiet"><strong>Second layer:</strong> owned-creator subscription monetisation can run in parallel, but it cannot become an excuse to avoid proving the first commission loop.</div>
          </article>

          <article className="rm-panel">
            <div className="rm-eyebrow">Not the priority</div>
            <h2 className="rm-section-title">Future options stay future options.</h2>
            <div className="rm-list">
              {['YouTube ads','Sponsorships','Digital products','Physical products','Selling Cornerstone'].map(x=>(
                <div className="rm-row" key={x}><span>{x}</span><em>Later</em></div>
              ))}
            </div>
          </article>
        </section>

        <section className="rm-panel">
          <div className="rm-eyebrow">Immediate target</div>
          <h2 className="rm-section-title">One Cara commerce experiment into the market.</h2>
          <p className="rm-lead">Get one real product, one real tracking destination and one finished experiment from inside Cornerstone onto TikTok. Measure the result. Bring it back into Learn. Then run Lila.</p>
          <div className="rm-footer">
            <span>Operating priority: money first · evidence first · real market first.</span>
            <a className="rm-link" href="/content/remake">Start the loop →</a>
          </div>
        </section>
      </main>
    </EnterpriseShell>
  )
}
