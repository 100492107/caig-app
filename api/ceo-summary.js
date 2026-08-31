import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://zvyioxhwdyocaanzcgqf.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

function buildClients(req) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
  const authHeader = String(req.headers.authorization || '');
  const publicClient = anonKey ? createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  }) : null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const service = serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return { publicClient, service };
}

async function requireUser(publicClient, req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || !publicClient) return null;
  const { data } = await publicClient.auth.getUser(token);
  return data?.user || null;
}

function queryClient(service, publicClient) { return service || publicClient; }

async function safeCount(client, table, configure) {
  try {
    let query = client.from(table).select('*', { count: 'exact', head: true });
    if (configure) query = configure(query);
    const { count, error } = await query;
    return error ? null : (count || 0);
  } catch { return null; }
}

async function safeRows(client, table, columns, configure) {
  try {
    let query = client.from(table).select(columns);
    if (configure) query = configure(query);
    const { data, error } = await query;
    return error ? [] : (data || []);
  } catch { return []; }
}

function deriveRevenueState(rows) {
  const byDealer = new Map();
  for (const row of rows) {
    const key = String(row.dealer_id || row.dealer_name || '').trim().toLowerCase();
    if (!key) continue;
    const current = byDealer.get(key) || { dealer_name: row.dealer_name, stages: new Set(), next_action_at: null, latest: 0 };
    current.stages.add(row.stage);
    const ts = row.created_at ? Date.parse(row.created_at) : 0;
    if (ts > current.latest) current.latest = ts;
    if (row.next_action_at) current.next_action_at = row.next_action_at;
    byDealer.set(key, current);
  }
  const now = Date.now();
  let unrepliedPositive = 0;
  let samplesReady = 0;
  let callsDue = 0;
  let pilotsOpen = 0;
  for (const dealer of byDealer.values()) {
    if (dealer.stages.has('positive') && !dealer.stages.has('sample') && !dealer.stages.has('diagnostic') && !dealer.stages.has('pilot') && !dealer.stages.has('recurring')) unrepliedPositive += 1;
    if (dealer.stages.has('sample') && !dealer.stages.has('diagnostic') && !dealer.stages.has('pilot') && !dealer.stages.has('recurring')) samplesReady += 1;
    if (dealer.stages.has('diagnostic')) {
      if (!dealer.next_action_at || Date.parse(dealer.next_action_at) <= now) callsDue += 1;
    }
    if (dealer.stages.has('pilot') && !dealer.stages.has('recurring')) pilotsOpen += 1;
  }
  return { unrepliedPositive, samplesReady, callsDue, pilotsOpen };
}

function rankActions(data) {
  const actions = [];
  const push = (score, label, detail, href, reason) => actions.push({ score, label, detail, href, reason });

  if (data.scene_failures > 0) push(120 + data.scene_failures, 'Fix failed scene verification', `${data.scene_failures} generated item${data.scene_failures === 1 ? '' : 's'} cannot safely publish`, '/workbench', 'Publishing quality blocker');
  if (data.calls_due > 0) push(110 + data.calls_due * 2, 'Run the next diagnostic call', `${data.calls_due} diagnostic conversation${data.calls_due === 1 ? '' : 's'} due`, '/outreach', 'Closest route to a pilot');
  if (data.unreplied_positive > 0) push(105 + data.unreplied_positive, 'Reply to warm dealer demand', `${data.unreplied_positive} positive lead${data.unreplied_positive === 1 ? '' : 's'} has not moved to a sample or call`, '/workbench', 'Warm demand decays fastest');
  if (data.pilots_open > 0) push(100 + data.pilots_open, 'Move a pilot toward recurring', `${data.pilots_open} pilot opportunit${data.pilots_open === 1 ? 'y' : 'ies'} open`, '/workbench', 'Existing revenue opportunity');
  if (data.samples_ready > 0) push(95 + data.samples_ready, 'Send the next sample', `${data.samples_ready} sample-ready dealer${data.samples_ready === 1 ? '' : 's'}`, '/workbench', 'Turns interest into a conversation');
  if (data.content_due > 0) push(75 + Math.min(15, data.content_due), 'Clear the oldest content item', `${data.content_due} content item${data.content_due === 1 ? '' : 's'} due`, '/creative', 'Prevents production backlog');
  if (data.caption_backlog > 0) push(65 + Math.min(20, data.caption_backlog), 'Clear the caption backlog', `${data.caption_backlog} local photo${data.caption_backlog === 1 ? '' : 's'} waiting`, '/creative', 'Protects existing creative inventory');
  if (data.creative_queue > 0) push(55 + Math.min(20, data.creative_queue), 'Review the next creative job', `${data.creative_queue} job${data.creative_queue === 1 ? '' : 's'} queued or processing`, '/creative', 'Keeps the afternoon block moving');
  if (data.active_territories > 0 && data.territory_unworked > 0) push(50 + Math.min(20, data.territory_unworked), 'Work the current ZIP territory', `${data.territory_unworked} active territory target${data.territory_unworked === 1 ? '' : 's'} still need coverage`, '/workbench', 'Keeps dealer acquisition systematic');
  if (data.winners > 0) push(40 + Math.min(15, data.winners), 'Replicate a proven winner', `${data.winners} evidence-backed winner${data.winners === 1 ? '' : 's'} available`, '/workbench', 'Compounds measured learning');

  actions.sort((a, b) => b.score - a.score);
  return actions.slice(0, 6);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const clients = buildClients(req);
    const user = await requireUser(clients.publicClient, req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const client = queryClient(clients.service, clients.publicClient);
    const today = new Date().toISOString().slice(0, 10);

    const [content, creative, captions, sceneFailures, winners, territoryRows, revenueRows] = await Promise.all([
      safeCount(client, 'content_queue', q => q.in('status', ['review', 'approved', 'scheduled']).lte('scheduled_date', today)),
      safeCount(client, 'local_ai_jobs', q => q.in('status', ['queued', 'processing'])),
      safeCount(client, 'track_b_caption_backlog', q => q.in('status', ['waiting', 'processing', 'ready', 'queued'])),
      safeCount(client, 'content_queue', q => q.eq('scene_verification_status', 'failed')),
      safeCount(client, 'track_b_performance_evidence', q => q.eq('winner', true)),
      safeRows(client, 'track_a_territories', 'zip_code,status,discovered_dealers,contacted_dealers'),
      safeRows(client, 'track_a_revenue_events', 'dealer_id,dealer_name,stage,next_action_at,created_at', q => q.order('created_at', { ascending: false }).limit(800)),
    ]);

    const revenue = deriveRevenueState(revenueRows);
    const activeTerritories = territoryRows.filter(x => x.status === 'active');
    const territoryUnworked = activeTerritories.filter(x => Number(x.contacted_dealers || 0) < Number(x.discovered_dealers || x.target_dealers || 0)).length;

    const metrics = {
      content_due: content ?? 0,
      warm_replies: revenue.unrepliedPositive,
      unreplied_positive: revenue.unrepliedPositive,
      samples_ready: revenue.samplesReady,
      calls_due: revenue.callsDue,
      pilots_open: revenue.pilotsOpen,
      creative_queue: creative ?? 0,
      caption_backlog: captions ?? 0,
      scene_failures: sceneFailures ?? 0,
      winners: winners ?? 0,
      active_territories: activeTerritories.length,
      territory_unworked: territoryUnworked,
    };

    const ranked = rankActions(metrics);
    const next = ranked[0] || { label: 'Work the next US dealer', detail: 'No immediate operational blocker is recorded', href: '/workbench', reason: 'Cash engine default' };
    return res.status(200).json({ generated_at: new Date().toISOString(), metrics, next_action: next, next_actions: ranked });
  } catch (error) {
    return res.status(500).json({ error: error?.message || String(error) });
  }
}