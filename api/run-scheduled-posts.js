import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MAKE_WEBHOOK = process.env.MAKE_SCHEDULED_POST_WEBHOOK;
const MAX_POSTS = 3;
const TIMEOUT_MS = 15_000;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (req.query.key !== process.env.CAIG_CRON_SECRET) return res.status(401).json({ error: 'unauthorized' });
  if (!MAKE_WEBHOOK) return res.status(500).json({ error: 'MAKE_SCHEDULED_POST_WEBHOOK is not configured' });

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentTime = now.toISOString().slice(11, 16);

    const { data: duePosts, error } = await supabase
      .from('content_queue')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_date', today)
      .or(`scheduled_date.lt.${today},scheduled_time.is.null,scheduled_time.lte.${currentTime}`)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true, nullsFirst: true })
      .limit(MAX_POSTS);

    if (error) return res.status(500).json({ error: error.message });
    if (!duePosts?.length) return res.status(200).json({ checked: 0, fired: 0, results: [] });

    const results = [];
    for (const post of duePosts) {
      const claimed = await supabase.from('content_queue').update({ status: 'publishing' }).eq('id', post.id).eq('status', 'scheduled').select('id').maybeSingle();
      if (claimed.error || !claimed.data) continue;

      const hasVideo = Boolean(post.video_url);
      const format = hasVideo ? 'reel' : (post.post_format || 'photo');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await fetch(MAKE_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caption: [post.hook, post.caption, post.cta, post.hashtags].filter(Boolean).join('\n\n'),
            imageUrl: post.image_url || null,
            videoUrl: post.video_url || null,
            imageUrls: post.image_urls || null,
            postId: post.id,
            platform: 'all',
            format,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Make webhook failed (${response.status})`);
        await supabase.from('content_queue').update({ status: 'posted', last_publish_error: null, publishing_started_at: null }).eq('id', post.id).eq('status', 'publishing');
        results.push({ id: post.id, status: 'posted', format });
      } catch (e) {
        await supabase.from('content_queue').update({ status: 'scheduled', last_publish_error: e?.message || String(e), publishing_started_at: null }).eq('id', post.id).eq('status', 'publishing');
        results.push({ id: post.id, status: 'retry', error: e?.message || String(e), format });
      } finally {
        clearTimeout(timer);
      }
    }

    return res.status(200).json({ checked: duePosts.length, fired: results.length, results });
  } catch (error) {
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
