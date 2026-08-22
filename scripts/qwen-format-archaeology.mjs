const ORIGINAL_FETCH = globalThis.fetch;

const BASE_LAYER = `

FORMAT ARCHAEOLOGY + NICHE LOCK — GLOBAL QWEN RULE
This layer applies to every creative job. Do not treat a viral post as an isolated idea; treat a repeated winning format as a reusable content asset.

1) FIND THE FORMAT ASSET
Look for accounts, series or repeated posts where the same underlying structure appears multiple times. A single viral outlier is weak evidence. Prefer accounts with relatively few posts but several posts materially outperforming their own baseline, or repeated winners using the same creative grammar. If this cannot be verified from the available evidence, label it as a hypothesis rather than fact.

2) REVERSE-ENGINEER THE MACHINE
For any candidate format, extract:
- source niche/category
- audience emotion
- content promise
- hook/headline architecture
- recurring visual grammar
- pacing / slide-count / shot pattern
- what stays invariant across episodes
- what changes from episode to episode
- CTA / comment / save / share mechanism
- why the format is repeatable
- whether it can produce 10+ strong episodes

3) NICHE LOCK — NEVER CROSS-CONTAMINATE BLINDLY
A borrowed format is valid only when the underlying audience emotion, problem, aspiration, identity or viewing behaviour maps credibly to the target niche.
Do NOT copy a format simply because it has high views.
Classify each candidate as USE, ADAPT or IGNORE.
- USE = the mechanism is already native to the target niche.
- ADAPT = the mechanism is proven elsewhere but the emotional trigger and audience context genuinely match the target niche.
- IGNORE = the source niche, behaviour, promise or tone does not fit the target audience, even if the post is viral.
The target niche is the hard boundary. The format can travel; the audience logic cannot be ignored.

4) SOURCE NICHE IS DATA, NOT DECORATION
Always identify the source niche and explain why its mechanism transfers. Then rewrite the format so the result feels native to the target niche rather than like a transplanted trend.
Never import unsupported claims, terminology, expert credentials, health/financial advice or cultural assumptions from the source niche.

5) BUILD A FORMAT FRANCHISE
A winning adaptation should be capable of becoming a repeatable series. Name the format in plain language, define its invariant structure, define the variable layer, and show at least 5–10 episode directions before treating it as scalable.
Prefer a small number of strong format franchises over endless one-off concepts.

6) DO NOT COPY THE CREATOR
Never reproduce exact wording, identity, distinctive characters, trademarked branding, signature graphics, proprietary footage, thumbnails or a near-identical execution. Abstract the mechanism and rebuild it with the target niche's own voice, world, people and evidence.

7) QUALITY TEST
Score every adapted format on niche fit, repeatability, evidence strength, emotional match, originality, production simplicity and commercial/attention potential. A viral source with poor niche fit must lose to a smaller source with stronger audience alignment.

8) OUTPUT DISCIPLINE
Where the surrounding workflow supports it, report the source niche, mechanism, USE/ADAPT/IGNORE decision, niche-fit reason, invariant structure, variable layer and franchise potential alongside the creative concept.
`;

const TRACK_A = `

TRACK A NICHE LOCK
Target niche: US independent automotive dealerships and dealership decision-makers.
Formats must map to dealership reality: stock, listings, photos, admin, time-to-live, enquiries, merchandising, sales workflow, customer perception and operational friction.
Do not import creator, beauty, fitness, wellness, finance-bro or consumer-app behaviour just because it is viral. Adapt only the underlying mechanism when the dealer audience has a credible emotional match.
`;

const TRACK_B = `

TRACK B NICHE LOCK
Target niche: the specific creator's established audience and lifestyle world.
Cara must remain fitness/lifestyle/discipline/confidence/ordinary-life grounded. Lila must remain beauty/lifestyle/understated visual discovery grounded. The duo must remain relationship/contrast/chemistry grounded.
A borrowed format is useful only when it can be expressed naturally inside that creator's existing world and recurring series. Do not let a viral external niche overwrite the creator's identity.
`;

const YOUTUBE = `

YOUTUBE NICHE LOCK
Target niche: adult animated business mysteries and money stories.
Every borrowed format must ultimately serve adult business/economics/money storytelling and long-form narrative. TikTok/social structures can inform the hook, reveal, list, reversal or pacing, but do not turn the channel into a short-form listicle feed. Preserve the channel's original 2D nostalgic visual identity and long-form causal storytelling.
`;

function identifyLayer(messages) {
  const all = messages.map((m) => String(m?.content || '')).join('\n').toLowerCase();
  if (all.includes('cornerstoneaigroup') || all.includes('cornerstone ai group') || all.includes('track a')) return TRACK_A;
  if (all.includes('animated business mysteries') || all.includes('youtube') && all.includes('long-form')) return YOUTUBE;
  if (all.includes('cornerstoneaiassets') || all.includes('cara') || all.includes('lila')) return TRACK_B;
  return '';
}

globalThis.fetch = async function patchedFetch(input, init = {}) {
  try {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!String(url).includes('/v1/chat/completions')) return ORIGINAL_FETCH(input, init);

    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    if (!body || !Array.isArray(body.messages)) return ORIGINAL_FETCH(input, init);

    const systemIndex = body.messages.findIndex((message) => message?.role === 'system');
    if (systemIndex < 0) return ORIGINAL_FETCH(input, init);

    const nicheLayer = identifyLayer(body.messages);
    const existing = String(body.messages[systemIndex].content || '');
    const merged = `${existing}${BASE_LAYER}${nicheLayer}`;

    body.messages[systemIndex] = { ...body.messages[systemIndex], content: merged };
    return ORIGINAL_FETCH(input, { ...init, body: JSON.stringify(body) });
  } catch (error) {
    console.warn('[QWEN FORMAT ARCHAEOLOGY] prompt patch skipped:', error?.message || error);
    return ORIGINAL_FETCH(input, init);
  }
};

console.log('[QWEN] format archaeology + niche lock loaded');
