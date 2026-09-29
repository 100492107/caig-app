/**
 * Canonical content-lane rules for Cara + Lila generation (Qwen / Creator Engine).
 */
export const CONTENT_PORTFOLIO = {
  attention: '20–30%',
  useful: '30–40%',
  lifestyle: '25–35%',
  commerce: '10–15%',
};

export const FANVUE_POLICY =
  'Fanvue must NEVER appear in captions, hooks, on-screen text, or CTAs. Allowed only in profile bio and on caraandlila.com. People who want it will find it there.';

export const SOFT_COMMERCE_LANE_PROMPT = `
SOFT COMMERCE LANE (10–15% of public feed only):
- Style: UGC-style soft sell with Cara and/or Lila — ordinary lifestyle moment first, product secondary (what they actually use or prefer). Easy soft CTA. Ellie-style ease, NOT Ellie-style frequency (~1 in 7 posts).
- Paths: affiliate, TikTok Shop, caraandlila.com picks only.
- NEVER open on BUY / hard pitch / fake urgency.
- ${FANVUE_POLICY}
- Output: content_lane soft_commerce | product_role | soft cta | monetisation_path | fanvue_mention:false
`.trim();

export const LANE_PROMPTS = {
  attention: `ATTENTION / CONTROVERSY: polarising but defensible opinion, taboo-but-relatable admission, unexpected behaviour, social-rule violation, status reversal, uncomfortable truth or intriguing reveal. Full Attention Gate (≥5/8, no NEVER-DO, three filters). Do not manufacture outrage.`,
  useful: `USEFUL / EDUCATIONAL / INTERESTING: teach, explain, compare, demonstrate, curate or reveal something genuinely useful. Optimise for clarity, surprise, practical value and saves. Do not force controversy.`,
  lifestyle: `LIFESTYLE / RELATIONSHIP / DAY-IN-LIFE: real-feeling routines, travel, style, home, humour, chemistry, ordinary life. Hook useful; controversy optional.`,
  commerce: SOFT_COMMERCE_LANE_PROMPT,
};

export function lanePromptBlock(laneKey = 'lifestyle') {
  const key = String(laneKey || 'lifestyle').toLowerCase();
  const map = {
    attention: LANE_PROMPTS.attention,
    useful: LANE_PROMPTS.useful,
    lifestyle: LANE_PROMPTS.lifestyle,
    commerce: LANE_PROMPTS.commerce,
    soft_commerce: LANE_PROMPTS.commerce,
  };
  return map[key] || LANE_PROMPTS.lifestyle;
}
