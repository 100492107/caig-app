import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function count(table, queryBuilder) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  query = queryBuilder ? queryBuilder(query) : query;
  const { count: value, error } = await query;
  if (error) throw error;
  return value || 0;
}

function nextAction(data) {
  if (data.samples_due > 0) return { label: 'Produce the oldest dealer sample', detail: `${data.samples_due} sample${data.samples_due === 1 ? '' : 's'} waiting`, href: '/outreach' };
  if (data.warm_replies > 0) return { label: 'Reply to the warmest dealer', detail: `${data.warm_replies} live reply conversation${data.warm_replies === 1 ? '' : 's'}`, href: '/outreach' };
  if (data.calls_due > 0) return { label: 'Run the next diagnostic call', detail: `${data.calls_due} call${data.calls_due === 1 ? '' : 's'} due`, href: '/outreach' };
  if (data.pilots_open > 0) return { label: 'Move the next pilot toward payment', detail: `${data.pilots_open} pilot opportunit${data.pilots_open === 1 ? 'y' : 'ies'} open`, href: '/outreach' };
  if (data.creative_queue > 0) return { label: 'Clear the next approved creative job', detail: `${data.creative_queue} production item${data.creative_queue === 1 ? '' : 's'} waiting`, href: '/creative' };
  return { label: 'Open Track A and add the next dealer', detail: 'The cash engine has no immediate blocker', href: '/outreach' };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) return res.status(500).json({ error: 'Supabase server configuration is incomplete' });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const [scheduled, replies, calls, pilots, creative] = await Promise.all([
      count('content_queue', (q) => q.in('status', ['review', 'approved', 'scheduled']).lte('scheduled_date', today)),
      count('prospects', (q) => q.in('status', ['replied', 'interested', 'warm', 'sample_requested'])),
      count('prospects', (q) => q.in('status', ['call_booked', 'diagnostic_booked'])),
      count('prospects', (q) => q.in('status', ['pilot', 'pilot_proposed', 'proposal_sent'])),
      count('local_ai_jobs', (q) => q.in('status', ['queued', 'processing'])),
    ]);

    const data = {
      samples_due: scheduled,
      warm_replies: replies,
      calls_due: calls,
      pilots_open: pilots,
      creative_queue: creative,
    };

    return res.status(200).json({ generated_at: new Date().toISOString(), metrics: data, next_action: nextAction(data) });
  } catch (error) {
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
