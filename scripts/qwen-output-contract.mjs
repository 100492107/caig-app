const ORIGINAL_FETCH = globalThis.fetch;

const TRACK_B_CONTRACT = `

CORNERSTONE TRACK B OPERATOR-FIRST OUTPUT CONTRACT
The human operator must understand the decision before seeing production data.

Return JSON with TWO top-level objects:
1. operator_brief: human decision layer.
2. production_package: machine execution layer.

operator_brief MUST contain:
- finding: what Cornerstone actually learned from evidence.
- evidence_status: observed | supported | mixed | inferred | insufficient.
- evidence_points: concise source-backed points with source and URL where available.
- mechanism: the transferable demand mechanism.
- why: why the mechanism plausibly matters. Clearly mark inference.
- recommended_subject: strongest original subject to make next.
- recommended_angle: distinct original angle.
- next_action: one immediate action.
- confidence: high | medium | low plus reason.
- limitations: claims/facts still needing verification.

HARD EVIDENCE FIREWALL:
- A URL alone proves nothing beyond the URL/identifier supplied by the operator.
- Never invent views, likes, comments, subscriber counts, dates, revenue, property sizes, careers, quotes or audience reactions.
- Never describe a source as inspected unless the job actually contains transcript, extracted media evidence, metadata or reliable research evidence.
- Never put a number in an evidence claim unless the number exists in the supplied evidence or live research context.
- Distinguish SOURCE FACT, PUBLIC SIGNAL, INFERENCE and CREATIVE RECOMMENDATION.
- Weak evidence is acceptable. Fabricated confidence is not.

production_package should contain the useful execution detail: ranked titles, thumbnail concepts, hook, script, chapters, visual timeline, production prompts, follow-ups, originality plan, short-form derivatives, publication sequence, measurement plan and monetisation tests.

The operator_brief is the product. production_package is the factory payload. Keep the factory payload valid and detailed, but do not let it replace the decision layer.
`;

const previousFetch = globalThis.fetch;

globalThis.fetch = async function contractFetch(input, init = {}) {
  try {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!String(url).includes('/v1/chat/completions')) return previousFetch(input, init);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    if (!body || !Array.isArray(body.messages)) return previousFetch(input, init);

    const text = body.messages.map((m) => String(m?.content || '')).join('\n').toLowerCase();
    const isTrackB = text.includes('track_b_content_engine') || text.includes('content intelligence') || text.includes('cornerstone_content_engine') || text.includes('workspace: track_b');
    if (!isTrackB) return previousFetch(input, init);

    const systemIndex = body.messages.findIndex((m) => m?.role === 'system');
    const system = systemIndex >= 0 ? String(body.messages[systemIndex].content || '') : '';
    if (systemIndex >= 0 && !system.includes('CORNERSTONE TRACK B OPERATOR-FIRST OUTPUT CONTRACT')) {
      body.messages[systemIndex] = { ...body.messages[systemIndex], content: `${system}${TRACK_B_CONTRACT}` };
    }

    body.max_tokens = Math.max(Number(body.max_tokens || 0), 2200);
    body.temperature = Math.min(Number(body.temperature ?? 0.55), 0.55);
    return previousFetch(input, { ...init, body: JSON.stringify(body) });
  } catch (error) {
    console.warn('[QWEN OUTPUT CONTRACT] patch skipped:', error?.message || error);
    return previousFetch(input, init);
  }
};

console.log('[QWEN] Track B operator-first output contract loaded');
