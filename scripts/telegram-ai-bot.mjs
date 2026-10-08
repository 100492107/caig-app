import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTABLE = path.join(ROOT, 'portable-ai');
const STATE_DIR = path.join(ROOT, '.local-ai-runtime', 'telegram');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

const BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const ADMIN_CHAT_ID = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim();
const DEFAULT_PROVIDER = String(process.env.TELEGRAM_AI_PROVIDER || 'qwen').trim().toLowerCase();
const FALLBACK_ORDER = String(process.env.TELEGRAM_FALLBACK_ORDER || 'qwen,gemini,anthropic,grok,openai').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

const QWEN_URL = (process.env.QWEN_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const QWEN_MODEL = process.env.QWEN_MODEL || 'mlx-community/Qwen3.5-9B-4bit';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const XAI_MODEL = process.env.XAI_MODEL || 'grok-4.7';

const CONTEXT_FILES = [
  'CAIG_AI_CONTEXT.md',
  'CARA_LILA_AI_CONTEXT.md',
  'SOCIAL_SALES_DOCTRINE.md',
  'YOUTUBE_AUTOMATION_AI_CONTEXT.md',
  'LOCAL_AI_QWEN.md',
  'TELEGRAM_AI_CONTEXT.md',
];

if (!BOT_TOKEN) {
  console.error('[TELEGRAM AI] Missing TELEGRAM_BOT_TOKEN. Bot not started.');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadPortableContext() {
  const parts = [];
  for (const file of CONTEXT_FILES) {
    try {
      parts.push('=== ' + file + ' ===\n' + (await fs.readFile(path.join(PORTABLE, file), 'utf8')).trim());
    } catch {
      console.warn('[TELEGRAM AI] Missing portable context file:', file);
    }
  }
  return parts.join('\n\n');
}

let SYSTEM_CONTEXT = await loadPortableContext();

async function loadState() {
  try {
    const parsed = JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
async function saveState(next) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(next, null, 2), 'utf8');
}
let state = await loadState();

function chatState(chatId) {
  const key = String(chatId);
  if (!state[key]) state[key] = { provider: DEFAULT_PROVIDER, history: [], updated_at: new Date().toISOString() };
  if (!Array.isArray(state[key].history)) state[key].history = [];
  return state[key];
}

function authorised(chatId) {
  return Boolean(ADMIN_CHAT_ID && String(chatId) === ADMIN_CHAT_ID);
}

async function telegram(method, body) {
  const response = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error('Telegram ' + method + ' failed: ' + (data.description || response.status));
  return data.result;
}

async function sendText(chatId, value) {
  const text = String(value || '').trim() || 'No response.';
  for (let i = 0; i < text.length; i += 3800) {
    await telegram('sendMessage', { chat_id: chatId, text: text.slice(i, i + 3800), disable_web_page_preview: true });
  }
}

async function sendDocument(chatId, filename, contents) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('document', new Blob([contents], { type: 'text/markdown' }), filename);
  const response = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendDocument', { method: 'POST', body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error('Telegram sendDocument failed: ' + (data.description || response.status));
}

async function qwenAvailable() {
  try {
    const response = await fetch(QWEN_URL + '/v1/models', { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return false;
    const data = await response.json();
    return Array.isArray(data?.data) && data.data.length > 0;
  } catch { return false; }
}

function providerAvailable(provider) {
  if (provider === 'qwen') return true;
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
  if (provider === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY);
  if (provider === 'grok') return Boolean(process.env.XAI_API_KEY);
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  return false;
}

async function callQwen(messages) {
  const response = await fetch(QWEN_URL + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages,
      temperature: 0.45,
      max_tokens: Number(process.env.TELEGRAM_QWEN_MAX_TOKENS || 1800),
      stream: false,
      chat_template_kwargs: { enable_thinking: false },
    }),
    signal: AbortSignal.timeout(Number(process.env.TELEGRAM_QWEN_TIMEOUT_MS || 120000)),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Qwen ' + response.status + ': ' + JSON.stringify(data));
  return String(data?.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function callOpenAI(messages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.OPENAI_API_KEY },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, temperature: 0.45 }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('OpenAI ' + response.status + ': ' + JSON.stringify(data));
  return String(data?.choices?.[0]?.message?.content || '').trim();
}

async function callAnthropic(messages) {
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const conversation = messages.filter((m) => m.role !== 'system');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: Number(process.env.TELEGRAM_ANTHROPIC_MAX_TOKENS || 1800),
      system,
      messages: conversation.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Anthropic ' + response.status + ': ' + JSON.stringify(data));
  return String((data?.content || []).filter((x) => x?.type === 'text').map((x) => x.text).join('\n') || '').trim();
}

async function callGemini(messages) {
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const conversation = messages.filter((m) => m.role !== 'system');
  const contents = conversation.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(GEMINI_MODEL) + ':generateContent?key=' + encodeURIComponent(process.env.GEMINI_API_KEY);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: contents.length ? contents : [{ role: 'user', parts: [{ text: 'Continue from the supplied operating context.' }] }],
      generationConfig: { temperature: 0.45, maxOutputTokens: Number(process.env.TELEGRAM_GEMINI_MAX_TOKENS || 1800) },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Gemini ' + response.status + ': ' + JSON.stringify(data));
  return String(data?.candidates?.[0]?.content?.parts?.map((x) => x?.text || '').join('\n') || '').trim();
}

async function callGrok(messages) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.XAI_API_KEY },
    body: JSON.stringify({ model: XAI_MODEL, messages, temperature: 0.45 }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Grok ' + response.status + ': ' + JSON.stringify(data));
  return String(data?.choices?.[0]?.message?.content || '').trim();
}

async function callProvider(provider, messages) {
  if (provider === 'qwen') return callQwen(messages);
  if (provider === 'gemini') return callGemini(messages);
  if (provider === 'anthropic') return callAnthropic(messages);
  if (provider === 'grok') return callGrok(messages);
  if (provider === 'openai') return callOpenAI(messages);
  throw new Error('Unknown provider: ' + provider);
}

function providerLabel(provider) {
  return ({ qwen: 'Qwen', gemini: 'Gemini', anthropic: 'Claude', grok: 'Grok', openai: 'ChatGPT' })[provider] || provider;
}

function candidateProviders(preferred) {
  const ordered = [preferred, ...FALLBACK_ORDER];
  return [...new Set(ordered)].filter(providerAvailable);
}

async function answer(chatId, userText) {
  const local = chatState(chatId);
  const messages = [
    {
      role: 'system',
      content: [
        'You are the alternate Cornerstone AI Enterprises operator assistant.',
        'The portable context below is the source of truth for strategy, creator systems, social and sales, YouTube automation, local AI and operating rules.',
        'Do not invent metrics, customer facts, platform eligibility, revenue, personal experiences, sources or implementation status.',
        'Keep Track A, Track B and New Life boundaries intact.',
        'Use British English unless the user requests otherwise.',
        'Never claim a local-only action happened unless it actually happened.',
        '',
        SYSTEM_CONTEXT,
      ].join('\n\n'),
    },
    ...local.history.slice(-18),
    { role: 'user', content: userText },
  ];

  let lastError = null;
  const tried = [];
  for (const provider of candidateProviders(local.provider)) {
    tried.push(provider);
    try {
      const output = await callProvider(provider, messages);
      if (!output) throw new Error('Provider returned an empty response.');
      local.history.push({ role: 'user', content: userText }, { role: 'assistant', content: output });
      local.history = local.history.slice(-24);
      local.updated_at = new Date().toISOString();
      await saveState(state);
      return { output, provider };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error('No AI provider completed the request. Tried: ' + tried.map(providerLabel).join(', ') + '. Last error: ' + (lastError?.message || 'unknown error'));
}

async function statusText(chatId) {
  const local = chatState(chatId);
  const configured = candidateProviders(local.provider).map(providerLabel);
  return [
    'Cornerstone Telegram AI',
    '',
    'Preferred: ' + providerLabel(local.provider),
    'Qwen: ' + (await qwenAvailable() ? 'online' : 'offline'),
    'Configured providers: ' + (configured.length ? configured.join(', ') : 'None'),
    'Portable context files: ' + CONTEXT_FILES.length,
    'Conversation history: ' + local.history.length + ' messages',
  ].join('\n');
}

async function handle(update) {
  const message = update?.message;
  if (!message?.chat?.id || typeof message.text !== 'string') return;
  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (text === '/id') {
    await sendText(chatId, 'This chat ID is ' + chatId + '. Add it as TELEGRAM_ADMIN_CHAT_ID, then restart the bot to enable private AI.');
    return;
  }

  if (!authorised(chatId)) {
    if (text === '/start' || text === '/help') {
      await sendText(chatId, 'This Telegram bot is installed but this chat is not authorised. Send /id, add that value to TELEGRAM_ADMIN_CHAT_ID on the Mac, then restart.');
    }
    return;
  }

  const local = chatState(chatId);

  if (text === '/start' || text === '/help') {
    await sendText(chatId, [
      'CORNERSTONE AI BACKUP',
      '',
      '/status — provider + Qwen health',
      '/provider — show preferred provider',
      '/provider qwen|gemini|anthropic|grok|openai — change preference',
      '/backup — send portable context backup',
      '/context — list loaded context',
      '/clear — clear Telegram chat memory',
      '',
      'Send a normal message to continue working from the Cornerstone context.',
    ].join('\n'));
    return;
  }

  if (text === '/status') {
    await sendText(chatId, await statusText(chatId));
    return;
  }

  if (text === '/context') {
    await sendText(chatId, 'Portable context loaded:\n\n' + CONTEXT_FILES.map((x) => '• ' + x).join('\n'));
    return;
  }

  if (text === '/backup') {
    SYSTEM_CONTEXT = await loadPortableContext();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await sendDocument(chatId, 'cornerstone-portable-context-' + timestamp + '.md', SYSTEM_CONTEXT);
    await sendText(chatId, 'Portable context backup sent. No secrets are included by this bot.');
    return;
  }

  if (text === '/clear') {
    local.history = [];
    local.updated_at = new Date().toISOString();
    await saveState(state);
    await sendText(chatId, 'Telegram conversation memory cleared. Portable Cornerstone context remains intact.');
    return;
  }

  if (text === '/provider' || text.startsWith('/provider ')) {
    const requested = text === '/provider' ? '' : text.slice('/provider '.length).trim().toLowerCase();
    const aliases = { claude: 'anthropic', chatgpt: 'openai' };
    const provider = aliases[requested] || requested;
    if (!provider) {
      await sendText(chatId, 'Preferred provider: ' + providerLabel(local.provider) + '\n\nAvailable: ' + (candidateProviders(local.provider).map(providerLabel).join(', ') || 'None configured'));
      return;
    }
    if (!['qwen', 'gemini', 'anthropic', 'grok', 'openai'].includes(provider)) {
      await sendText(chatId, 'Use qwen, gemini, anthropic/claude, grok or openai/chatgpt.');
      return;
    }
    local.provider = provider;
    local.updated_at = new Date().toISOString();
    await saveState(state);
    await sendText(chatId, 'Preferred provider set to ' + providerLabel(provider) + '. The bot will still use configured fallbacks if it fails.');
    return;
  }

  try { await telegram('sendChatAction', { chat_id: chatId, action: 'typing' }); } catch {}

  try {
    const result = await answer(chatId, text);
    const prefix = result.provider !== local.provider ? 'Fallback: ' + providerLabel(result.provider) + '\n\n' : '';
    await sendText(chatId, prefix + result.output);
  } catch (error) {
    await sendText(chatId, 'I could not complete that request.\n\n' + (error?.message || String(error)));
  }
}

console.log('[TELEGRAM AI] starting. provider order: ' + FALLBACK_ORDER.map(providerLabel).join(' → '));
console.log('[TELEGRAM AI] admin chat configured: ' + Boolean(ADMIN_CHAT_ID));

let offset = 0;
while (true) {
  try {
    const updates = await telegram('getUpdates', { offset, timeout: 45, allowed_updates: ['message'] });
    for (const update of updates || []) {
      offset = Number(update.update_id || 0) + 1;
      try { await handle(update); } catch (error) { console.error('[TELEGRAM AI] update handling failed:', error); }
    }
  } catch (error) {
    console.error('[TELEGRAM AI] polling failed:', error?.message || error);
    await sleep(3000);
  }
}
