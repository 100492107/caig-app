import React from 'react'

const MATH = [
  ['£30 × 15%', '£4.50', 'illustrative commission per sale'],
  ['100 sales', '£450', 'illustrative economics'],
  ['500 sales', '£2,250', 'illustrative economics'],
  ['1,000 sales', '£4,500', 'illustrative economics'],
]

const LOOP = ['Real product signal','Interesting idea','Cara / Lila concept','Real product evidence','AI creator presentation','CTA','Tracked sale','Learn']

const styles = `
.rm{--gold:#d4b56a;--gold2:#ead58f;--ink:#15130f;--panel:#171a22;--muted:#9a9faa;--line:rgba(255,255,255,.09);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif}
.rm *,.rm *::before,.rm *::after{box-sizing:border-box}
.rm-shell{display:grid;gap:16px}
.rm-hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);gap:14px}
.rm-card{border:1px solid var(--line);background:var(--surface);border-radius:20px;padding:22px}
.rm-card.hero{background:linear-gradient(145deg,rgba(212,181,106,.16),rgba(23,26,34,.98) 58%);border-color:rgba(212,181,106,.34)}
.rm-k{font-size:9px;letter-spacing:.17em;text-transform:uppercase;font-weight:900;color:var(--gold)}
.rm-h{margin:10px 0 0;font-size:clamp(34px,5vw,58px);line-height:.95;letter-spacing:-.065em;font-weight:700}
.rm-p{margin:12px 0 0;max-width:68ch;color:var(--muted);font-size:13px;line-height:1.6}
.rm-go{display:inline-flex;align-items:center;gap:8px;margin-top:18px;padding:10px 14px;border-radius:10px;background:var(--gold);color:var(--ink);font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
.rm-urgent{display:grid;align-content:space-between;min-height:100%}
.rm-urgent strong{font-size:24px;letter-spacing:-.04em}
.rm-urgent span{display:block;margin-top:7px;color:var(--muted);font-size:11px;line-height:1.5}
.rm-clock{margin-top:18px;padding-top:15px;border-top:1px solid var(--line);display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rm-clock b{display:block;font-size:18px;color:var(--gold2)}
.rm-clock span{display:block;margin-top:3px;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.11em}
.rm-section{display:grid;gap:10px}
.rm-section h2{margin:0;font-size:13px;letter-spacing:.1em;text-transform:uppercase;font-weight:900;color:var(--text)}
.rm-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.rm-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
.rm-stat{padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2)}
.rm-stat b{display:block;font-size:19px;letter-spacing:-.04em}
.rm-stat span{display:block;margin-top:4px;color:var(--muted);font-size:9px;line-height:1.4;text-transform:uppercase;letter-spacing:.1em}
.rm-loop{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:7px}
.rm-loop div{padding:11px 9px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2);font-size:10px;font-weight:800;line-height:1.3}
.rm-loop i{display:block;width:18px;height:18px;margin-bottom:8px;border-radius:6px;background:rgba(212,181,106,.12);border:1px solid rgba(212,181,106,.2);font-style:normal}
.rm-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.rm-list{display:grid;gap:7px}
.rm-row{display:flex;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2);font-size:11px}
.rm-row b{color:var(--gold2)}
.rm-copy{color:var(--muted);font-size:11px;line-height:1.55}
.rm-rule{padding:13px 14px;border:1px solid rgba(212,181,106,.22);border-radius:13px;background:rgba(212,181,106,.055);color:var(--muted);font-size:11px;line-height:1.55}
.rm-rule strong{color:var(--text)}
.rm-steps{display:grid;gap:7px}
.rm-step{display:grid;grid-template-columns:36px 1fr auto;gap:10px;align-items:center;padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2)}
.rm-step-num{width:26px;height:26px;display:grid;place-items:center;border-radius:8px;background:rgba(212,181,106,.12);color:var(--gold2);font-size:10px;font-weight:900}
.rm-step strong{font-size:11px}
.rm-step span{display:block;margin-top:2px;color:var(--muted);font-size:10px}
.rm-badge{padding:5px 7px;border-radius:999px;border:1px solid rgba(212,181,106,.25);color:var(--gold2);font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
.rm-footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:center}
.rm-footer span{color:var(--muted);font-size:10px}
.rm-link{color:var(--gold2);text-decoration:none;font-size:11px;font-weight:850}
@media(max-width:900px){.rm-hero,.rm-cols{grid-template-columns:1fr}.rm-grid{grid-template-columns:1fr 1fr}.rm-grid.three{grid-template-columns:1fr 1fr}.rm-loop{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:560px){.rm-grid,.rm-grid.three{grid-template-columns:1fr}.rm-loop{grid-template-columns:1fr 1fr}}
`

export function RevenueMissionBanner(){
  return (
    <section className="rm-card hero" style={{marginBottom:16}}>
      <style>{styles}</style>
      <div className="rm-k">Executive decision · GO</div>
      <div style={{display:'flex',justifyContent:'space-between',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
        <div>
          <h2 style={{margin:'8px 0 0',fontSize:'clamp(24px,3vw,34px)',letterSpacing:'-.05em'}}>Money first. Prove the loop.</h2>
          <p className="rm-p">The build phase has produced the machine. The operating priority is now cash: run the real creator → commerce → revenue → Learn loop before expanding the product again.</p>
        </div>
        <div style={{display:'grid',gap:6,minWidth:150}}>
          <div className="rm-badge">7-day proof window</div>
          <div className="rm-badge">14-day commercial sprint</div>
        </div>
      </div>
      <div className="rm-grid three" style={{marginTop:16}}>
        <div className="rm-stat"><b>First tracked commission</b><span>Primary objective</span></div>
        <div className="rm-stat"><b>2 different experiments / day</b><span>Cadence after launch</span></div>
        <div className="rm-stat"><b>£15–£60 products</b><span>First-test price band</span></div>
      </div>
      <div className="rm-footer" style={{marginTop:12}}>
        <span>Do not build substantial new features unless they remove a blocker to the live revenue loop.</span>
        <a className="rm-link" href="/mission">Open revenue directive →</a>
      </div>
    </section>
  )
}

export default function RevenueMission(){
  return (
    <main className="rm rm-shell">
      <style>{styles}</style>

      <section className="rm-hero">
        <article className="rm-card hero">
          <div className="rm-k">Executive decision · GO</div>
          <h1 className="rm-h">The revenue mission is live.</h1>
          <p className="rm-p">This is now the operating directive for Track B. We are not waiting for a perfect system, another feature, a bigger audience or a theoretical business model. We already have the core machine. The remaining proof is real Cara/Lila generation, an actual publication, a real commercial response and the measured result coming back into Learn.</p>
          <div className="rm-go">GO · First real money loop</div>
        </article>

        <article className="rm-card rm-urgent">
          <div>
            <div className="rm-k">Time pressure</div>
            <strong>Make the first money quickly.</strong>
            <span>The first target is deliberately small: one tracked commission. That single transaction proves creator → content → commerce → revenue.</span>
          </div>
          <div className="rm-clock">
            <div><b>7 days</b><span>First commission objective</span></div>
            <div><b>14 days</b><span>Commercial sprint</span></div>
          </div>
        </article>
      </section>

      <section className="rm-card rm-section">
        <div className="rm-k">The machine</div>
        <h2>One real loop. Then repeat it.</h2>
        <div className="rm-loop">
          {LOOP.map((step,i)=><div key={step}><i>{String(i+1).padStart(2,'0')}</i>{step}</div>)}
        </div>
        <div className="rm-rule"><strong>Our agreement:</strong> stop treating additional product work as progress unless it directly helps this loop run, get measured or learn faster.</div>
      </section>

      <section className="rm-cols">
        <article className="rm-card rm-section">
          <div className="rm-k">Phase 1</div>
          <h2>TikTok Shop affiliate commerce</h2>
          <div className="rm-copy">Sell other people's products first. Remove manufacturing, inventory, fulfilment, returns, customer service and working-capital complexity from the first demand test.</div>
          <div className="rm-grid" style={{marginTop:4}}>
            <div className="rm-stat"><b>£15–£60</b><span>Retail price band</span></div>
            <div className="rm-stat"><b>5</b><span>Best samples to request</span></div>
            <div className="rm-stat"><b>10–15</b><span>Initial finished assets</span></div>
            <div className="rm-stat"><b>2/day</b><span>Different experiments</span></div>
          </div>
          <p className="rm-copy" style={{margin:'12px 0 0'}}>Product filters: visually demonstrable, obvious use case, strong existing reviews, available on TikTok Shop, meaningful commission, and not dependent on medical or miracle claims.</p>
        </article>

        <article className="rm-card rm-section">
          <div className="rm-k">Creator positions</div>
          <h2>Two recognisable commercial personalities.</h2>
          <div className="rm-list">
            <div className="rm-row"><span><b style={{color:'var(--text)'}}>Cara</b> · practical upgrades, organisation, capability, useful discoveries</span><b>BUILD</b></div>
            <div className="rm-row"><span><b style={{color:'var(--text)'}}>Lila</b> · taste, wardrobe, interiors, travel, little luxuries, beautiful useful things</span><b>NOTICE</b></div>
          </div>
          <p className="rm-copy">No generic shopping account. The commerce angle must still feel native to each creator's canonical DNA.</p>
        </article>
      </section>

      <section className="rm-card rm-section">
        <div className="rm-k">The numbers</div>
        <h2>Economics, not a forecast.</h2>
        <div className="rm-grid">
          {MATH.map(([a,b,c])=><div className="rm-stat" key={a}><span style={{display:'block',fontSize:9,letterSpacing:'.1em',textTransform:'uppercase'}}>{a}</span><b style={{marginTop:5,color:'var(--gold2)'}}>{b}</b><span>{c}</span></div>)}
        </div>
        <p className="rm-copy">Example only: £30 retail price × 15% commission = £4.50 per sale. Actual commission rates vary by offer. The question is whether Cornerstone can repeatedly create content that causes measurable commercial behaviour.</p>
      </section>

      <section className="rm-cols">
        <article className="rm-card rm-section">
          <div className="rm-k">First 72 hours</div>
          <h2>Get the first experiment into market.</h2>
          <div className="rm-steps">
            {[
              ['01','Commerce access','TikTok Shop creator/e-commerce access, creator identity, Instagram, link hub and showcase.'],
              ['02','Product hunting','Find 10 candidate products from the existing signal layer; choose 5 to request as samples.'],
              ['03','Build the creative','Cara + Lila recipes, product evidence, 10–15 finished assets and tracking.'],
              ['04','Publish','Get the first real experiment in front of real people.'],
            ].map(([n,t,d])=><div className="rm-step" key={n}><div className="rm-step-num">{n}</div><div><strong>{t}</strong><span>{d}</span></div><div className="rm-badge">GO</div></div>)}
          </div>
        </article>

        <article className="rm-card rm-section">
          <div className="rm-k">Test discipline</div>
          <h2>Make different experiments, not clones.</h2>
          <div className="rm-list">
            {[
              ['Discovery','“I didn’t realise this existed…”'],
              ['Problem','“This fixes the annoying part of…”'],
              ['Comparison','“You don’t need the expensive version…”'],
              ['Aesthetic','Lila discovers the product naturally inside a lifestyle context.'],
              ['Opinion','Specific observation, never fabricated personal experience.'],
            ].map(([a,b])=><div className="rm-row" key={a}><span><b style={{color:'var(--text)'}}>{a}</b><br/>{b}</span></div>)}
          </div>
          <div className="rm-rule"><strong>Non-negotiable:</strong> never invent personal experience, testimonials, audience reactions, revenue, views, commissions, product facts or results.</div>
        </article>
      </section>

      <section className="rm-card rm-section">
        <div className="rm-k">Measure → Learn</div>
        <h2>Every test returns data to the machine.</h2>
        <div className="rm-grid">
          {['Creator','Product','Signal','Mechanism','Platform','Format','CTA','Views / retention','Clicks','Orders','Commission','Creative DNA'].map(x=><div className="rm-stat" key={x}><b style={{fontSize:13}}>{x}</b></div>)}
        </div>
        <p className="rm-copy">The measured result becomes evidence, winner/underperformance logic runs automatically where the evidence is sufficient, and the learning rule becomes the next creative input.</p>
      </section>

      <section className="rm-cols">
        <article className="rm-card rm-section">
          <div className="rm-k">Days 8–14</div>
          <h2>Let the data decide.</h2>
          <p className="rm-copy">Keep only what produces commercial behaviour. Repeat promising mechanisms. Introduce the second monetisation layer alongside the commerce system only after the first loop is actually running.</p>
          <div className="rm-rule"><strong>Second layer:</strong> Fanvue can run in parallel, but it must not distract from proving the first commission loop.</div>
        </article>

        <article className="rm-card rm-section">
          <div className="rm-k">Not the priority now</div>
          <h2>Do not confuse future options with current cash.</h2>
          <div className="rm-list">
            {['YouTube ads','Sponsorships','Digital products','Physical products','Selling Cornerstone'].map(x=><div className="rm-row" key={x}><span>{x}</span><b>Later</b></div>)}
          </div>
        </article>
      </section>

      <section className="rm-card rm-section">
        <div className="rm-k">Emergency priority</div>
        <h2>Generate → Save → Publish → Measure → Learn.</h2>
        <p className="rm-p">This is the completion layer. We already have creator DNA, mission building, research ingestion, local reasoning, vision checks, hosted generation, storage, publication structures and learning infrastructure. The next milestone is not another substantial feature. It is one Cara commerce experiment from inside Cornerstone reaching TikTok with a real product, a real tracking destination and a real result — then Lila.</p>
        <div className="rm-footer" style={{marginTop:12}}>
          <span>That is the first revenue engine.</span>
          <a href="/content/remake" className="rm-link">Start the loop →</a>
        </div>
      </section>

      <section className="rm-card">
        <div className="rm-footer">
          <span>Operating directive: money first, evidence first, real market first.</span>
          <span>Source: Revenue Mission memo · approved for execution</span>
        </div>
      </section>
    </main>
  )
}
