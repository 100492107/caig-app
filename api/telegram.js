import { createClient } from '@supabase/supabase-js';
import { PORTABLE_AI_CONTEXT } from '../shared/portable-ai-context.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const ALLOWED_CHAT_ID = String(process.env.TELEGRAM_ALLOWED_CHAT_ID || '').trim();
const PROVIDER = String(process.env.TELEGRAM_AI_PROVIDER || '').trim().toLowerCase();
const MODEL = process.env.TELEGRAM_AI_MODEL || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

const tg = async (method, payload) => {
  const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/' + method, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.description || ('Telegram ' + method + ' failed.'));
  return j.result;
};
const chunks = (value, size = 3800) => { const out = []; const text = String(value || ''); for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size)); return out.length ? out : ['']; };
const sendText = async (chatId, value) => { for (const part of chunks(value)) await tg('sendMessage', { chat_id: chatId, text: part, disable_web_page_preview: true }); };
const sendDocument = async (chatId, filename, content) => {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', 'Cornerstone portable AI context backup.');
  form.append('document', new Blob([content], { type: 'text/markdown' }), filename);
  const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/sendDocument', { method: 'POST', body: form });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.description || 'Telegram document upload failed.');
};

const history = async (chatId) => {
  if (!supabase) return [];
  const { data } = await supabase.from('cornerstone_telegram_messages').select('role,content').eq('chat_id', chatId).order('created_at', { ascending: false }).limit(12);
  return (data || []).reverse().map((x) => ({ role: x.role, content: x.content }));
};
const save = async (chatId, role, content) => { if (supabase) await supabase.from('cornerstone_telegram_messages').insert({ chat_id: chatId, role, content }); };
const clear = async (chatId) => { if (supabase) await supabase.from('cornerstone_telegram_messages').delete().eq('chat_id', chatId); };

const systemPrompt = () => 'You are the Cornerstone AI Enterprises backup assistant. Use the canonical context below. Do not invent business facts, metrics, sources, revenue, audience numbers, platform eligibility, product details or results. Keep Track A, Track B and New Life boundaries intact. This Telegram bot is Cornerstone-only; do not expose New Life private data. Write in clear British English. When Qwen is unavailable, continue with the configured provider without dropping context or quality rules.\n\nCANONICAL CONTEXT:\n' + PORTABLE_AI_CONTEXT;

async function callAnthropic(messages) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key || !MODEL) throw new Error('Anthropic is not configured.');
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 1600, system: systemPrompt(), messages }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error?.message || 'Anthropic request failed.');
  return String((j.content || []).find((x) => x?.type === 'text')?.text || '');
}
async function callGemini(messages) {
  const key = process.env.GEMINI_API_KEY; if (!key || !MODEL) throw new Error('Gemini is not configured.');
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(MODEL) + ':generateContent?key=' + encodeURIComponent(key), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt() }] }, contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), generationConfig: { temperature: 0.4, maxOutputTokens: 1600 } }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error?.message || 'Gemini request failed.');
  return String(j?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') || '');
}
async function callOpenAICompatible(messages, baseUrl, key) {
  const r = await fetch(String(baseUrl).replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key }, body: JSON.stringify({ model: MODEL, temperature: 0.4, max_tokens: 1600, messages: [{ role: 'system', content: systemPrompt() }, ...messages] }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error?.message || 'Provider request failed.');
  return String(j?.choices?.[0]?.message?.content || '');
}
async function ask(messages) {
  if (PROVIDER === 'anthropic') return callAnthropic(messages);
  if (PROVIDER === 'gemini') return callGemini(messages);
  if (PROVIDER === 'xai' || PROVIDER === 'grok') { const key = process.env.XAI_API_KEY; if (!key || !MODEL) throw new Error('xAI is not configured.'); return callOpenAICompatible(messages, 'https://api.x.ai/v1', key); }
  if (PROVIDER === 'openai_compatible') { const key = process.env.AI_FALLBACK_API_KEY; const base = process.env.AI_FALLBACK_BASE_URL; if (!key || !base || !MODEL) throw new Error('OpenAI-compatible fallback is not configured.'); return callOpenAICompatible(messages, base, key); }
  throw new Error('No Telegram AI provider is configured.');
}

export default async function handler(request) {
  if (request.method !== 'POST') return new Response(JSON.stringify({ ok: true, service: 'cornerstone-telegram' }), { headers: { 'content-type': 'application/json' } });
  if (!TOKEN || !SECRET) return new Response(JSON.stringify({ error: 'Telegram backup is not configured.' }), { status: 503, headers: { 'content-type': 'application/json' } });
  if ((request.headers.get('x-telegram-bot-api-secret-token') || '') !== SECRET) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'content-type': 'application/json' } });
  let update = {}; try { update = await request.json(); } catch {}
  const message = update?.message; const chatId = message?.chat?.id; const text = String(message?.text || '').trim();
  if (!chatId || !text) return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  if (!ALLOWED_CHAT_ID || String(chatId) !== ALLOWED_CHAT_ID) { await sendText(chatId, 'This private Cornerstone bot is not authorised for this Telegram account.'); return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }); }
  if (text === '/start' || text === '/help') { await sendText(chatId, 'Cornerstone backup is online. Commands: /status, /context, /export, /clear. Any other message is a normal AI request using the same portable Cornerstone context.'); return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }); }
  if (text === '/status') { await sendText(chatId, ['CORNERSTONE BACKUP', 'Provider: ' + (PROVIDER || 'not configured'), 'Model: ' + (MODEL || 'not configured'), 'Canonical context: loaded', 'Conversation memory: ' + (supabase ? 'enabled' : 'not configured'), 'Qwen: not assumed reachable from Vercel'].join('\n')); return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }); }
  if (text === '/context') { await sendText(chatId, PORTABLE_AI_CONTEXT); return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }); }
  if (text === '/export') { await sendDocument(chatId, 'cornerstone-portable-ai-context.md', PORTABLE_AI_CONTEXT); return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }); }
  if (text === '/clear') { await clear(String(chatId)); await sendText(chatId, 'Telegram conversation memory cleared. Canonical context remains intact.'); return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }); }
  const previous = await history(String(chatId)); await save(String(chatId), 'user', text);
  try { const answer = (await ask(previous.concat([{ role: 'user', content: text }]))).trim() || 'The configured provider returned no usable answer.'; await save(String(chatId), 'assistant', answer); await sendText(chatId, answer); }
  catch (error) { const messageText = 'Backup AI unavailable: ' + (error?.message || String(error)); await save(String(chatId), 'assistant', messageText); await sendText(chatId, messageText); }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
}