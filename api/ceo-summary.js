import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://zvyioxhwdyocaanzcgqf.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2eWlveGh3ZHlvY2FhbnpjZ3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTM2NTUsImV4cCI6MjA5Mjg2OTY1NX0.px_s68TxIdBCDkA-OlTFZahqjZ2V8ndFi-XzYN7UIYk';

function buildClients(req) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  const authHeader = String(req.headers.authorization || '');
  const publicClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const service = serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  return { publicClient, service };
}

async function requireUser(publicClient, req) {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await publicClient.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
}

function queryClient(service, publicClient) {
  return service || publicClient;
}

async function safeCount(client, table, configure) {
  try {
    let query = client.from(table).select('*', { count: 'exact', head: true });
    if (configure) query = configure(query);
    const { count, error } = await query;
    return error ? null : (count || 0);
  } catch {
    return null;
  }
}

async function firstCount(client, candidates, configure) {
  for (const table of candidates) {
    const value = await safeCount(client, table, configure);
    if (value !== null) return value;
  }
  return null;
}

function nextAction(data) {
  if (data.content_due > 0) return { label: 'Clear the oldest content item', detail: `${data.content_due} content item${data.content_due === 1 ? '' : 's'} due`, href: '/creative' };
  if (data.warm_replies > 0) return { label: 'Reply to the warmest dealer', detail: `${data.warm_replies} warm conversation${data.warm_replies === 1 ? '' : 's'} recorded`, href: '/outreach' };
  if (data.calls_due > 0) return { label: 'Run the next diagnostic call', detail: `${data.calls_due} call${data.calls_due === 1 ? '' : 's'} due`, href: '/outreach' };
  if (data.pilots_open > 0) return { label: 'Move the next pilot toward payment', detail: `${data.pilots_open} pilot opportunit${data.pilots_open === 1 ? 'y' : 'ies'} open`, href: '/outreach' };
  if (data.creative_queue > 0) return { label: 'Clear the next approved creative job', detail: `${data.creative_queue} creative job${data.creative_queue === 1 ? '' : 's'} waiting`, href: '/creative' };
  return { label: 'Work the next US dealer', detail: 'No immediate operational blocker is recorded', href: '/outreach' };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const clients = buildClients(req);
    const user = await requireUser(clients.publicClient, req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const client = queryClient(clients.service, clients.publicClient);
    const today = new Date().toISOString().slice(0, 10);
    const [content, replies, calls, pilots, creative] = await Promise.all([
      safeCount(client, 'content_queue', (q) => q.in('status', ['review', 'approved', 'scheduled']).lte('scheduled_date', today)),
      firstCount(client, ['dealers', 'dealer_prospects', 'crm_prospects', 'leads'], (q) => q.in('status', ['replied', 'interested', 'warm', 'sample_requested'])),
      firstCount(client, ['dealers', 'dealer_prospects', 'crm_prospects', 'leads'], (q) => q.in('status', ['call_booked', 'diagnostic_booked'])),
      firstCount(client, ['dealers', 'dealer_prospects', 'crm_prospects', 'leads'], (q) => q.in('status', ['pilot', 'pilot_proposed', 'proposal_sent'])),
      safeCount(client, 'local_ai_jobs', (q) => q.in('status', ['queued', 'processing'])),
    ]);

    const metrics = {
      content_due: content ?? 0,
      warm_replies: replies ?? 0,
      calls_due: calls ?? 0,
      pilots_open: pilots ?? 0,
      creative_queue: creative ?? 0,
    };

    return res.status(200).json({ generated_at: new Date().toISOString(), metrics, next_action: nextAction(metrics) });
  } catch (error) {
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
