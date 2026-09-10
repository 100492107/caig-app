const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zvyioxhwdyocaanzcgqf.supabase.co';

function getBearerToken(req) {
  const header = String(req.headers?.authorization || '');
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  const cookies = String(req.headers?.cookie || '').split(';').map((part) => part.trim());
  const session = cookies.find((part) => part.startsWith('caig_access_token='));
  return session ? decodeURIComponent(session.slice('caig_access_token='.length)) : '';
}

export async function requireUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const apiKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey) throw new Error('Supabase API key not configured');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return response.json();
}

export function setSessionCookie(res, token, maxAge = 3600) {
  res.setHeader('Set-Cookie', `caig_access_token=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'caig_access_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
}

export function sameOrigin(req) {
  const origin = String(req.headers?.origin || '');
  if (!origin) return true;
  const host = String(req.headers?.host || '');
  try { return new URL(origin).host === host; } catch { return false; }
}
