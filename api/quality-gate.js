import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function userFromRequest(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return null;
  const { data } = await authClient.auth.getUser(auth.slice(7));
  return data?.user || null;
}

export default async function handler(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('track_b_quality_gates')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return res.status(200).json({ gates: data || [] });
    }

    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const action = body.action || 'create';
    if (!['create', 'approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Unsupported quality-gate action' });

    if (action === 'create') {
      const { data, error } = await supabase.from('track_b_quality_gates').insert({
        owner_id: user.id,
        project_id: body.project_id || null,
        production_job_id: body.production_job_id || null,
        status: 'required',
        checks: body.checks || {},
        reviewer_notes: body.reviewer_notes || null,
      }).select('*').single();
      if (error) throw error;
      return res.status(200).json({ gate: data });
    }

    if (!body.id) return res.status(400).json({ error: 'Quality gate id is required' });
    const nextStatus = action === 'approve' ? 'approved' : 'rejected';
    const { data, error } = await supabase.from('track_b_quality_gates').update({
      status: nextStatus,
      checks: body.checks || {},
      reviewer_notes: body.reviewer_notes || null,
      approved_at: nextStatus === 'approved' ? new Date().toISOString() : null,
      approved_by: nextStatus === 'approved' ? user.id : null,
    }).eq('id', body.id).eq('owner_id', user.id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Quality gate not found' });
    return res.status(200).json({ gate: data });
  } catch (error) {
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
