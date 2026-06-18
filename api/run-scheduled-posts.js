import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAKE_WEBHOOK = "https://hook.eu1.make.com/6s3r7qmjnmygmvstp8i6je4rh6jb5cyt";

export default async function handler(req, res) {
  if (req.query.key !== process.env.CAIG_CRON_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const now = new Date();
const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
const today = ukTime.toISOString().split('T')[0];
const currentTime = `${String(ukTime.getHours()).padStart(2,'0')}:${String(ukTime.getMinutes()).padStart(2,'0')}`;

  const { data: duePosts, error } = await supabase
    .from('content_queue')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_date', today);

  if (error) return res.status(500).json({ error: error.message });

  const results = [];
  for (const post of duePosts || []) {
    const isPastDate = post.scheduled_date < today;
    const isTodayAndDue = post.scheduled_date === today && (!post.scheduled_time || post.scheduled_time <= currentTime);
    if (!isPastDate && !isTodayAndDue) continue;

    const caption = [post.hook, post.caption, post.cta, post.hashtags].filter(Boolean).join("\n\n");

    try {
      const r = await fetch(MAKE_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, imageUrl: post.image_url, postId: post.id, platform: "all" }),
      });
      if (!r.ok) throw new Error("Make webhook failed");
      await supabase.from('content_queue').update({ status: 'posted' }).eq('id', post.id);
      results.push({ id: post.id, status: 'posted' });
    } catch (e) {
      await supabase.from('content_queue').update({ status: 'error', notes: e.message }).eq('id', post.id);
      results.push({ id: post.id, status: 'error', error: e.message });
    }
  }

  res.status(200).json({ checked: duePosts?.length || 0, fired: results.length, results });
}
