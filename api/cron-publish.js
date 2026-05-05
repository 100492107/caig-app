// api/cron-publish.js
// Vercel cron job — runs every 5 minutes, finds due posts in content_queue, publishes them
// Configured in vercel.json: { "crons": [{ "path": "/api/cron-publish", "schedule": "*/5 * * * *" }] }

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Vercel cron jobs send GET requests with Authorization header
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  const todayDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const currentTime = now.toTimeString().slice(0, 5);  // HH:MM

  // Find all posts that are due now or overdue, status = 'ready', platform = fanvue
  const { data: duePosts, error } = await supabase
    .from("content_queue")
    .select("*")
    .eq("status", "ready")
    .eq("platform", "fanvue")
    .lte("scheduled_date", todayDate)
    .lte("scheduled_time", currentTime)
    .limit(10); // process max 10 at a time per cron tick

  if (error) {
    console.error("content_queue fetch error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  if (!duePosts || duePosts.length === 0) {
    return res.status(200).json({ published: 0, message: "No posts due" });
  }

  const results = [];

  for (const post of duePosts) {
    try {
      // Mark as 'publishing' immediately to prevent double-publish on next tick
      await supabase
        .from("content_queue")
        .update({ status: "publishing" })
        .eq("id", post.id);

      // Get the platform token for this persona
      const { data: tokenRow } = await supabase
        .from("platform_tokens")
        .select("token")
        .eq("persona_id", post.persona_id)
        .eq("platform", "fanvue")
        .single();

      if (!tokenRow?.token) {
        await supabase.from("content_queue").update({ status: "error", notes: "No Fanvue token found for persona" }).eq("id", post.id);
        results.push({ id: post.id, status: "error", reason: "no_token" });
        continue;
      }

      // Call the Fanvue post API
      const publishRes = await fetch(`${process.env.VERCEL_URL}/api/fanvue-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          caption: [post.hook, post.caption, post.cta, post.hashtags].filter(Boolean).join("\n\n"),
          token: tokenRow.token,
          imagePrompt: post.image_prompt,
        }),
      });

      const publishData = await publishRes.json();

      if (publishRes.ok) {
        await supabase
          .from("content_queue")
          .update({ status: "posted", fanvue_post_id: publishData.fanvue_post_id })
          .eq("id", post.id);
        results.push({ id: post.id, status: "posted" });
      } else {
        await supabase
          .from("content_queue")
          .update({ status: "error", notes: publishData.error })
          .eq("id", post.id);
        results.push({ id: post.id, status: "error", reason: publishData.error });
      }
    } catch (e) {
      await supabase.from("content_queue").update({ status: "error", notes: e.message }).eq("id", post.id);
      results.push({ id: post.id, status: "error", reason: e.message });
    }
  }

  return res.status(200).json({ published: results.filter(r => r.status === "posted").length, results });
}
