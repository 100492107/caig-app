import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGINAL_FETCH = globalThis.fetch;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AGENTS_PATH = path.join(REPO_ROOT, 'AGENTS.md');
function loadProjectRules() {
  try { const rules = fs.readFileSync(AGENTS_PATH, 'utf8').trim(); return rules ? `\n\nPROJECT OPERATING CONSTITUTION\n${rules}` : ''; }
  catch (error) { console.warn('[QWEN] AGENTS.md could not be loaded:', error?.message || error); return ''; }
}
const PROJECT_RULES = loadProjectRules();
const BASE_LAYER = `

FORMAT INTELLIGENCE + ORIGINALITY — GLOBAL RULE
Treat proven content formats as mechanisms, not templates. Prefer repeated evidence over isolated viral outliers.

For each candidate identify: source niche, audience promise, emotional trigger, hook, first-frame behaviour, title/thumbnail relationship, recurring structure, pacing, visual grammar, CTA/comment mechanism, invariant structure, variable layer, production complexity, repeatability and weaknesses.

Every candidate receives USE / ADAPT / IGNORE:
USE = already native to the target audience.
ADAPT = the underlying mechanism can transfer credibly, but the execution must be rebuilt for the target.
IGNORE = high views but poor audience fit, weak evidence, poor originality or commercially irrelevant.

Never copy exact wording, scripts, creator identity, distinctive characters, branding, logos, proprietary footage, music, thumbnails or a near-identical execution. The job is to understand why attention happened and build a new asset.

A format only becomes an asset when it can produce repeatable episodes and the owned results justify continuing it. Current public research is hypothesis/evidence about the market. Owned analytics are proof of our own performance.
`;
const TRACK_A = `

TRACK A — REVENUE RECOVERY DOMAIN
Research domain: TRACK_A_REVENUE_RECOVERY.
The niche is the problem: revenue leakage caused by leads, enquiries, conversations, appointments, quotes or opportunities going cold, stale, unworked or failing to move.
Customer vertical is variable. Automotive, property, finance, insurance, recruitment, professional services, agencies, SaaS, education, healthcare, fitness, hospitality, trades and other lead-driven businesses are possible markets.
Research should explain how revenue is lost, why follow-up breaks, what decision-makers care about, and which recovery mechanisms are credible. Do not reduce the domain to any one vertical.
`;
const TRACK_B = `

TRACK B — CONTENT ENGINE DOMAIN
Research domain: TRACK_B_CONTENT_ENGINE.
The target niche/channel is selected explicitly for the current content operation. The engine can work in gaming, history, chatting/stories, documentary, business, technology, lifestyle or another niche when the operator chooses it.
Study already-performing videos and channels to identify topic demand, packaging, narrative structure, retention mechanisms and short-form derivatives. Reference media is analysed for mechanism only. The final work must be materially original.
Cara, Lila and other owned creator assets are downstream identities that receive content when their character/audience context fits. They do not define the whole Track B domain.
`;
const CREATOR = `

CREATOR ASSET MODE
When persona_id is Cara, Lila or the duo, protect the character/relationship bible and use the selected creator's audience as the niche boundary. Current content intelligence can inspire an abstract mechanism, but does not override identity.
`;
function identifyLayer(messages) {
  const text = messages.map((m) => String(m?.content || '')).join('\n').toLowerCase();
  if (text.includes('research domain: track_a_revenue_recovery') || text.includes('workspace: track_a')) return TRACK_A;
  if (text.includes('research domain: track_a_automotive_b2b')) return TRACK_A;
  if (text.includes('research domain: track_b_content_engine') || text.includes('workspace: track_b')) return TRACK_B;
  if (text.includes('research domain: track_b_creator_growth')) return `${TRACK_B}${CREATOR}`;
  if (text.includes('persona_id: cara') || text.includes('persona_id: lila')) return `${TRACK_B}${CREATOR}`;
  return '';
}
globalThis.fetch = async function patchedFetch(input, init = {}) {
  try {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!String(url).includes('/v1/chat/completions')) return ORIGINAL_FETCH(input, init);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    if (!body || !Array.isArray(body.messages)) return ORIGINAL_FETCH(input, init);
    const systemIndex = body.messages.findIndex((m) => m?.role === 'system'); if (systemIndex < 0) return ORIGINAL_FETCH(input, init);
    const layer = identifyLayer(body.messages);
    const existing = String(body.messages[systemIndex].content || '');
    body.messages[systemIndex] = { ...body.messages[systemIndex], content: `${existing}${PROJECT_RULES}${BASE_LAYER}${layer}` };
    return ORIGINAL_FETCH(input, { ...init, body: JSON.stringify(body) });
  } catch (error) { console.warn('[QWEN FORMAT INTELLIGENCE] prompt patch skipped:', error?.message || error); return ORIGINAL_FETCH(input, init); }
};
console.log('[QWEN] format intelligence + originality + Revenue Recovery domain + Content Engine domain loaded');
