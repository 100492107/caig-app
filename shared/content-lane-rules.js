/**
 * Canonical content-lane rules for Cara + Lila generation (Qwen / Creator Engine / external AI).
 */
export const CONTENT_PORTFOLIO = {
  attention: '30–40%',
  useful: '25–35%',
  lifestyle: '15–25%',
  commerce: '10–15%',
};

export const FANVUE_POLICY =
  'Fanvue must NEVER appear in captions, hooks, on-screen text, or CTAs. Allowed only in profile bio and on caraandlila.com. People who want it will find it there.';

export const FIRST_SECONDS_RULE =
  'FIRST 1–2 SECONDS: mandatory pattern interrupt, problem, true claim, or refusal. NEVER open with a greeting, "today we…", or soft throat-clearing. The hook is the product.';

export const HOOK_STRUCTURES = [
  'Confession → true claim',
  'Social rule → calm refusal',
  'Duo split on one fact',
  'Everyone pretends X. We don’t.',
  'Status reversal (rather be difficult than liked)',
  'Money / options stated without apology',
  'Relationship boundary without TED talk',
];

export const SOFT_COMMERCE_LANE_PROMPT = `
SOFT COMMERCE LANE (10–15% of public feed only):
- Style: UGC-style soft sell with Cara and/or Lila — ordinary lifestyle moment first, product secondary (what they actually use or prefer). Easy soft CTA.
- Paths: affiliate, TikTok Shop, caraandlila.com picks only.
- NEVER open on BUY / hard pitch / fake urgency.
- ${FANVUE_POLICY}
- ${FIRST_SECONDS_RULE}
- Output: content_lane soft_commerce | product_role | soft cta | monetisation_path | fanvue_mention:false
`.trim();

export const LANE_PROMPTS = {
  attention: `ATTENTION / CONTROVERSY (30–40% of feed): ordinary setting + precise TRUE statement people are pressured not to say. Polarising but defensible. Full Attention Gate (≥5/8, no NEVER-DO, three filters). Truth is definitive — feelings do not override reality. ${FIRST_SECONDS_RULE} Rotate hook structures: ${HOOK_STRUCTURES.join('; ')}. Do not manufacture outrage or rage-bait.`,
  useful: `USEFUL / EDUCATIONAL / INTERESTING (25–35%): teach, explain, compare, demonstrate, curate. Optimise for clarity, surprise, practical value and SAVES. Do not force controversy. ${FIRST_SECONDS_RULE}`,
  lifestyle: `LIFESTYLE / RELATIONSHIP / DAY-IN-LIFE (15–25%): real-feeling routines, chemistry, ordinary life, continuity. Build recognition and follow behaviour. No manufactured fight. ${FIRST_SECONDS_RULE}`,
  commerce: SOFT_COMMERCE_LANE_PROMPT,
};

export const WEEKLY_OPS = `
BATCH: script day → produce day → schedule day.
MEASURE by lane (retention, comments, shares, saves, follows, named clicks/sales).
CLONE formats that produce saves/follows/comments. PAUSE formats that only get empty views.
`.trim();

export function lanePromptBlock(laneKey = 'useful') {
  const key = String(laneKey || 'useful').toLowerCase();
  const map = {
    attention: LANE_PROMPTS.attention,
    useful: LANE_PROMPTS.useful,
    lifestyle: LANE_PROMPTS.lifestyle,
    commerce: LANE_PROMPTS.commerce,
    soft_commerce: LANE_PROMPTS.commerce,
  };
  return map[key] || LANE_PROMPTS.useful;
}
