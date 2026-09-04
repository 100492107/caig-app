import { createClient } from '@supabase/supabase-js';
const FALLBACK_SUPABASE_URL = 'https://zvyioxhwdyocaanzcgqf.supabase.co';
function buildClients(req) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const authHeader = String(req.headers.authorization || '');
  const publicClient = anonKey ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: authHeader ? { headers: { Authorization: authHeader } } : undefined }) : null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const service = serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return { publicClient, service };
}
async function requireUser(publicClient, req) { const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); if (!token || !publicClient) return null; const { data } = await publicClient.auth.getUser(token); return data?.user || null; }
function clientFor(service, publicClient) { return service || publicClient; }
async function safeCount(client, table, configure) { try { let q = client.from(table).select('*', { count:'exact', head:true }); if (configure) q = configure(q); const { count, error } = await q; return error ? null : (count || 0); } catch { return null; } }
async function safeRows(client, table) { try { const { data, error } = await client.from(table).select('*').limit(1000); return error ? [] : (data || []); } catch { return []; } }
function businessKey(row) { return String(row.business_id || row.prospect_id || row.dealer_id || row.business_name || row.dealer_name || row.name || '').trim().toLowerCase(); }
function deriveRecovery(rows) {
  const groups = new Map();
  for (const row of rows) { const key = businessKey(row); if (!key) continue; const g = groups.get(key) || { stages:new Set(), next:null }; if (row.stage) g.stages.add(String(row.stage).toLowerCase()); if (row.next_action_at) g.next = row.next_action_at; groups.set(key, g); }
  const now = Date.now(); let open = 0, calls = 0, tests = 0, warm = 0;
  for (const g of groups.values()) { const terminal = ['dead','closed','suppressed','won','recurring']; const isTerminal = [...g.stages].some((s) => terminal.includes(s)); if (!isTerminal) open += 1; if (g.stages.has('diagnostic') && (!g.next || Date.parse(g.next) <= now)) calls += 1; if (['pilot','test'].some((s) => g.stages.has(s))) tests += 1; if (g.stages.has('positive') && !['sample','diagnostic','pilot','test','won','recurring'].some((s) => g.stages.has(s))) warm += 1; }
  return { open, calls, tests, warm };
}
function rankActions(data) {
  const actions = []; const add = (score,label,detail,href,external=false) => actions.push({ score,label,detail,href,external });
  if (data.warm_replies) add(120 + data.warm_replies, 'Move the warmest recovery conversation', `${data.warm_replies} opportunity signal${data.warm_replies === 1 ? '' : 's'} is waiting for a next step`, 'https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/', true);
  if (data.calls_due) add(115 + data.calls_due * 2, 'Run the next leakage diagnosis', `${data.calls_due} recovery conversation${data.calls_due === 1 ? '' : 's'} is due`, '/outreach');
  if (data.recovery_tests) add(110 + data.recovery_tests, 'Measure the recovery test', `${data.recovery_tests} controlled recovery test${data.recovery_tests === 1 ? '' : 's'} is in motion`, 'https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/', true);
  if (data.scene_failures) add(100 + data.scene_failures, 'Fix the media blocker', `${data.scene_failures} media item${data.scene_failures === 1 ? '' : 's'} failed final scene verification`, '/creative');
  if (data.content_queue) add(80 + Math.min(20, data.content_queue), 'Run the next Content Engine job', `${data.content_queue} content job${data.content_queue === 1 ? '' : 's'} queued or processing`, '/creative');
  if (data.winners) add(65 + Math.min(20, data.winners), 'Multiply a proven content winner', `${data.winners} evidence-backed winner${data.winners === 1 ? '' : 's'} available`, '/creative');
  if (!actions.length) add(10, 'Find the next bottleneck', 'No active blocker is recorded. Create one piece of evidence before adding another feature.', '/creative');
  return actions.sort((a,b) => b.score - a.score).slice(0,6);
}
export default async function handler(req,res) {
  if (req.method !== 'GET') return res.status(405).json({ error:'Method not allowed' });
  try {
    const { publicClient, service } = buildClients(req); const user = await requireUser(publicClient,req); if (!user) return res.status(401).json({ error:'Unauthorized' }); const client = clientFor(service, publicClient); const today = new Date().toISOString().slice(0,10);
    const [contentQueue, creativeQueue, sceneFailures, winners, recoveryRows, captionBacklog] = await Promise.all([
      safeCount(client,'local_ai_jobs',q => q.in('status',['queued','processing'])),
      safeCount(client,'local_ai_jobs',q => q.in('job_type',['content_engine','trend_scan','social_caption_intelligence']).in('status',['queued','processing'])),
      safeCount(client,'content_queue',q => q.eq('scene_verification_status','failed')),
      safeCount(client,'track_b_performance_evidence',q => q.eq('winner',true)),
      safeRows(client,'track_a_revenue_events'),
      safeCount(client,'track_b_caption_backlog',q => q.in('status',['waiting','processing','ready','queued']))
    ]);
    const recovery = deriveRecovery(recoveryRows);
    const metrics = { recovery_open: recovery.open, warm_replies: recovery.warm, calls_due: recovery.calls, recovery_tests: recovery.tests, content_queue: creativeQueue ?? contentQueue ?? 0, winners: winners ?? 0, scene_failures: sceneFailures ?? 0, caption_backlog: captionBacklog ?? 0 };
    const ranked = rankActions(metrics);
    return res.status(200).json({ generated_at:new Date().toISOString(), metrics, next_action:ranked[0], next_actions:ranked, data_date:today });
  } catch (error) { return res.status(500).json({ error:error?.message || String(error) }); }
}
