export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({
    ok: true,
    personas: [
      { id: 'cara', name: 'Cara Whitmore', referencesConfigured: true },
      { id: 'lila', name: 'Lila Sterling', referencesConfigured: true },
      { id: 'duo', name: 'Cara & Lila', referencesConfigured: true }
    ]
  });
}
