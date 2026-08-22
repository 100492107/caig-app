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

3) NICHE LOCK — NEVER CROSS-CONTAMINATE
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

9) RESEARCH FIREWALL
A research pack belongs to exactly one workspace/domain. Never reuse, cache, merge, summarise or transfer research evidence between Track A, Track B or YouTube. A source discovered for one domain may not be treated as evidence for another domain merely because the format appears transferable. Transfer only the abstract mechanism, never the source evidence, audience facts or niche assumptions.
`;

const TRACK_A = `

TRACK A NICHE LOCK
Research domain: TRACK_A_AUTOMOTIVE_B2B.
Target niche: US independent automotive dealerships and dealership decision-makers.
Research may cover dealership owners, dealer principals, sales managers, automotive retail, stock merchandising, listings, vehicle photography, enquiries, admin, time-to-live, sales workflow, customer perception, operational friction and B2B outreach.
Track A research must NEVER use Track B creator/beauty/fitness/Fanvue evidence or YouTube business-storytelling evidence as source evidence.
Only abstract a mechanism from outside automotive when the mechanism genuinely fits dealership psychology. Never import creator audience behaviour, beauty/lifestyle assumptions, subscriber psychology, consumer-app signals or long-form YouTube audience facts into dealership research.
`;

const TRACK_B = `

TRACK B NICHE LOCK
Research domain: TRACK_B_CREATOR_GROWTH.
Target niche: the selected creator's exact established audience, lifestyle world and platform context.
Cara must remain fitness/lifestyle/discipline/confidence/ordinary-life grounded. Lila must remain beauty/lifestyle/understated visual discovery grounded. The duo must remain relationship/contrast/chemistry grounded.
Track B research must NEVER use Track A dealership/automotive evidence or YouTube business/economics evidence as source evidence.
A borrowed format is useful only when expressed naturally inside the creator's existing world, audience emotion and recurring series. External evidence may inspire an abstract mechanism, but the evidence itself does not become creator-specific audience evidence.
`;

const YOUTUBE = `

YOUTUBE NICHE LOCK
Research domain: YOUTUBE_LONGFORM_BUSINESS_MONEY.
Target niche: adult animated business mysteries and money stories.
Research may cover long-form YouTube storytelling, business/economics/money narratives, documentary structure, retention, titles, thumbnails, chapter pacing, narrative reveals and animation-friendly visual storytelling.
YouTube research must NEVER use Track A dealership evidence or Track B creator/Fanvue/lifestyle evidence as source evidence.
Short-form formats may inform the hook, reveal, list, reversal or pacing mechanism, but the research conclusion must remain native to long-form YouTube storytelling and the channel's nostalgic 2D animated identity.
`;

function identifyLayer(messages) {
  const text = messages.map((m) => String(m?.content || '')).join('\n').toLowerCase();
  // Explicit workspace/domain markers always win. We do not infer a domain from a random word such as "track a" inside a long prompt.
  if (text.includes('research domain: track_a_automotive_b2b') || text.includes('workspace: track_a') || text.includes('workspace_id: track_a')) return TRACK_A;
  if (text.includes('research domain: track_b_creator_growth') || text.includes('workspace: track_b') || text.includes('workspace_id: track_b')) return TRACK_B;
  if (text.includes('research domain: youtube_longform_business_money') || text.includes('workspace: youtube') || text.includes('workspace_id: youtube')) return YOUTUBE;
  // Backwards-compatible fallbacks for older queued jobs.
  if (text.includes('animated business mysteries') || (text.includes('youtube') && text.includes('long-form'))) return YOUTUBE;
  if (text.includes('cornerstoneaigroup') || text.includes('cornerstone ai group') || text.includes('us independent automotive')) return TRACK_A;
  if (text.includes('cornerstoneaiassets') || text.includes('cara') || text.includes('lila')) return TRACK_B;
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

console.log('[QWEN] format archaeology + research firewall + niche locks loaded');
