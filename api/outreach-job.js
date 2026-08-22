const SUPABASE_URL = 'https://zvyioxhwdyocaanzcgqf.supabase.co';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const id = String(req.query?.id || '').trim();
  if (!key) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Valid job id required' });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs?id=eq.${encodeURIComponent(id)}&select=id,status,result,error_message,created_at,completed_at,job_type,persona_id`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const text = await response.text();
  if (!response.ok) return res.status(response.status).json({ error: `Supabase read failed: ${text}` });
  const rows = JSON.parse(text);
  if (!rows[0]) return res.status(404).json({ error: 'Job not found' });
  return res.status(200).json(rows[0]);
}
