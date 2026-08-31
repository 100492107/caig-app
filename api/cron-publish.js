import { createClient } from "@supabase/supabase-js";
import { uploadImageToFanvue } from "./fanvue-upload.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const MAX_JOBS = 3;
const STALE_MINUTES = 20;
const FETCH_TIMEOUT_MS = 18_000;

async function sendTokenExpiredAlert(personaId) {
  const resendKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CAIG_ALERT_EMAIL;
  if (!resendKey || !recipient) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "CAIG Alerts <hello@cornerstoneaigroup.com>",
      to: [recipient],
      subject: `Fanvue token expired — ${personaId}`,
      html: `<p>The Fanvue session token for <strong>${personaId}</strong> appears to be expired or invalid.</p><p>Refresh the platform token in your secure token store, then retry the affected queue items.</p>`,
    }),
  }).catch(() => {});
}

function responseDeadline() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return { controller, timer };
}

async function claimDuePosts() {
  const { data, error } = await supabase.rpc("claim_due_content_queue", { p_limit: MAX_JOBS, p_stale_minutes: STALE_MINUTES });
  if (error) throw error;
  return data || [];
}

async function setState(id, patch) {
  const { error } = await supabase.from("content_queue").update(patch).eq("id", id).eq("status", "publishing");
  if (error) throw error;
}

async function publishOne(post, tokenAlertSent) {
  try {
    const { data: tokenRow, error: tokenError } = await supabase
      .from("platform_tokens")
      .select("token")
      .eq("persona_id", post.persona_id)
      .eq("platform", "fanvue")
      .single();
    if (tokenError || !tokenRow?.token) {
      await setState(post.id, { status: "error", last_publish_error: "No Fanvue token found for persona", last_publish_attempt_at: new Date().toISOString() });
      return { id: post.id, status: "error", reason: "no_token" };
    }

    let mediaUuids = [];
    if (post.image_url) {
      try {
        const mediaUuid = await uploadImageToFanvue(post.image_url, tokenRow.token, `caig_${post.id}`);
        if (mediaUuid) mediaUuids = [mediaUuid];
      } catch (uploadErr) {
        console.error(`[PUBLISH] image upload failed ${post.id}:`, uploadErr.message);
      }
    }

    const baseUrl = process.env.PRODUCTION_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const { controller, timer } = responseDeadline();
    let publishRes;
    try {
      publishRes = await fetch(`${baseUrl}/api/fanvue-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CAIG-CRON": "1" },
        body: JSON.stringify({
          postId: post.id,
          caption: [post.hook, post.caption, post.cta, post.hashtags].filter(Boolean).join("\n\n"),
          sessionToken: tokenRow.token,
          mediaUuids,
          imagePrompt: post.image_prompt,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const publishText = await publishRes.text();
    let publishData = {};
    try { publishData = JSON.parse(publishText); } catch { publishData = { error: publishText.slice(0, 500) }; }

    if (publishRes.ok) {
      await setState(post.id, {
        status: "posted",
        fanvue_post_id: publishData.fanvue_post_id || null,
        publishing_started_at: null,
        last_publish_attempt_at: new Date().toISOString(),
        last_publish_error: null,
      });
      return { id: post.id, status: "posted" };
    }

    if (publishRes.status === 401 && !tokenAlertSent.has(post.persona_id)) {
      tokenAlertSent.add(post.persona_id);
      await sendTokenExpiredAlert(post.persona_id);
    }

    const transient = publishRes.status >= 500 || publishRes.status === 429;
    const attempts = Number(post.publish_attempts || 0) + 1;
    await setState(post.id, {
      status: transient && attempts < 5 ? "scheduled" : "error",
      last_publish_error: String(publishData.error || `Fanvue publish failed (${publishRes.status})`).slice(0, 1000),
      last_publish_attempt_at: new Date().toISOString(),
      publishing_started_at: null,
      scheduled_date: transient && attempts < 5 ? post.scheduled_date : post.scheduled_date,
      scheduled_time: transient && attempts < 5 ? new Date(Date.now() + Math.min(60, attempts * 10) * 60_000).toISOString().slice(11, 16) : post.scheduled_time,
      publish_attempts: attempts,
    });
    return { id: post.id, status: transient && attempts < 5 ? "retry" : "error", reason: publishData.error || publishRes.status };
  } catch (error) {
    const attempts = Number(post.publish_attempts || 0) + 1;
    const message = error?.name === "AbortError" ? "Fanvue publish timed out" : (error?.message || String(error));
    const transient = attempts < 5;
    await setState(post.id, {
      status: transient ? "scheduled" : "error",
      last_publish_error: message.slice(0, 1000),
      last_publish_attempt_at: new Date().toISOString(),
      publishing_started_at: null,
      publish_attempts: attempts,
    });
    return { id: post.id, status: transient ? "retry" : "error", reason: message };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: "Unauthorized" });

  try {
    const posts = await claimDuePosts();
    if (!posts.length) return res.status(200).json({ published: 0, processed: 0, message: "No posts due" });

    const tokenAlertSent = new Set();
    const results = await Promise.all(posts.map((post) => publishOne(post, tokenAlertSent)));
    const published = results.filter((result) => result.status === "posted").length;
    return res.status(200).json({ published, processed: results.length, results });
  } catch (error) {
    console.error("[PUBLISH] cron failed:", error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
