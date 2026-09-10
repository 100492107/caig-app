import { requireUser, setSessionCookie, clearSessionCookie, sameOrigin } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const header = String(req.headers?.authorization || '');
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  try {
    if (!token) {
      clearSessionCookie(res);
      return res.status(204).end();
    }
    const user = await requireUser({ headers: { authorization: `Bearer ${token}` } });
    if (!user?.id) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Invalid session' });
    }
    const exp = Number(user?.exp || 0);
    const maxAge = exp > Math.floor(Date.now() / 1000) ? Math.max(60, exp - Math.floor(Date.now() / 1000)) : 3600;
    setSessionCookie(res, token, Math.min(maxAge, 3600));
    return res.status(200).json({ ok: true, userId: user.id });
  } catch (error) {
    clearSessionCookie(res);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
