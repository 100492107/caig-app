// api/cron-generate.js
// Daily autopilot — Fanvue only.
// 06:00 UTC: generate copy → generate image → save as scheduled.
// cron-publish.js then auto-posts at the platform's posting times.

import { createClient } from "@supabase/supabase-js";
import { buildPrompt } from "./generate-submit.js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://zvyioxhwdyocaanzcgqf.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FAL_QUEUE_URL  = "https://queue.fal.run/fal-ai/nano-banana-2/edit";
const FAL_BASE       = "https://queue.fal.run/fal-ai/nano-banana-2/requests";

const CARA_REFS = [
  "https://v3b.fal.media/files/b/0a990cbf/7tn1zr6Tzvw4LP6NfoQJ5_Cara_Whitmore_10.png",
  "https://v3b.fal.media/files/b/0a990cbf/GZpvO79sLCKUEXmb5OjDZ_Cara_Whitmore_14.png",
  "https://v3b.fal.media/files/b/0a990cc0/hNz9MH3iKPSpX1SCu7JnC_Cara_Whitmore_16.png",
  "https://v3b.fal.media/files/b/0a990cc0/aC52Bfy17019kTbWG4L_L_Cara_Whitmore_18.png",
  "https://v3b.fal.media/files/b/0a990cc0/ne3QfVCW_NQnJZFjSnsST_Cara_Whitmore_23.jpeg",
];

// ─── Cara config — Fanvue only ────────────────────────────────────────────────

const CARA_PERSONA = {
  id: "cara",
  name: "Cara Whitmore",
  niche: "travel",
  char: "Smart, dry, specific. British. 23. Budget travel creator turned subscription creator.",
  voice: "Casual, warm, slightly tired of the internet. Dry humour. Never performative.",
};

const FANVUE_PLATFORM = {
  id: "fv_page",
  name: "Fanvue Page",
  times: ["10:00", "20:00"],
  purpose: "Content that lives on the Fanvue page — PPV captions and subscriber wall posts.",
  contentMix: [
    { type: "fv_ppv_caption", weight: 4 },
    { type: "fv_wall_post",   weight: 3 },
  ],
};

const CARA_PILLARS = [
  "Behind the scenes — what I'm doing today that isn't on the page yet",
  "Travel throwback — a specific moment from a trip that feels relevant now",
  "Day in my life — honest, specific, not aspirational",
  "Content tease — what just went up on the page",
  "Personal thought — something I've been thinking about this week",
  "Fan interaction — something I want to know about them",
  "Mood check — relatable moment that makes fans feel close to me",
];

const POSTS_PER_DAY = 1; // one post every 2 days — cron only runs on even UTC days

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayString() {
  return new Date().toISOString().split("T")[0];
}

function randomPillar() {
  return CARA_PILLARS[Math.floor(Math.random() * CARA_PILLARS.length)];
}

function buildSlots() {
  return [{
    personaId:     CARA_PERSONA.id,
    platformId:    FANVUE_PLATFORM.id,
    pillar:        randomPillar(),
    scheduledDate: todayString(),
    scheduledTime: "19:00",
    index:         0,
  }];
}

// Consume NDJSON stream from generate-batch, return post objects
async function consumeBatchStream(response) {
  const posts = [];
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try { const obj = JSON.parse(line); if (obj.post) posts.push(obj.post); } catch (_) {}
    }
  }
  if (buffer.trim()) {
    try { const obj = JSON.parse(buffer); if (obj.post) posts.push(obj.post); } catch (_) {}
  }
  return posts;
}

// Submit image job to fal.ai, return requestId
async function submitImage(falKey, post) {
  const prompt = buildPrompt({
    imagePrompt:    post.image_prompt,
    hook:           post.hook,
    caption:        post.caption,
    wardrobe:       post.wardrobe,
    shotAngle:      post.shot_angle,
    photoDirection: post.photo_direction,
  });

  const res = await fetch(FAL_QUEUE_URL, {
    method: "POST",
    headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      image_urls:     CARA_REFS,
      image_size:     { width: 1080, height: 1920 },
      output_format:  "jpeg",
      safety_tolerance: "6",
      num_images:     1,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.request_id) throw new Error(`fal.ai submit failed: ${JSON.stringify(data)}`);
  return data.request_id;
}

// Poll fal.ai until COMPLETED or FAILED — max 3 minutes, 10s intervals
async function pollImage(falKey, requestId, maxMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise(r => setTimeout(r, 10000)); // wait 10s between polls

    const statusRes = await fetch(`${FAL_BASE}/${requestId}/status`, {
      headers: { Authorization: `Key ${falKey}` },
    });
    const statusData = await statusRes.json();
    const status = statusData?.status;

    if (status === "COMPLETED") {
      const resultRes = await fetch(`${FAL_BASE}/${requestId}`, {
        headers: { Authorization: `Key ${falKey}` },
      });
      const resultData = await resultRes.json();
      const url = resultData?.images?.[0]?.url;
      if (!url) throw new Error("fal.ai completed but no image URL in result");
      return url;
    }

    if (status === "FAILED" || status === "NOT_FOUND") {
      throw new Error(`fal.ai job ${status}`);
    }
    // IN_QUEUE or IN_PROGRESS — keep polling
  }
  throw new Error("fal.ai image generation timed out after 3 minutes");
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const falKey = process.env.FAL_API_KEY;
  if (!falKey) return res.status(500).json({ error: "FAL_API_KEY not configured" });

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const today = todayString();

  // Duplicate guard — skip if already generated today
  const { data: existing } = await supabase
    .from("content_queue")
    .select("id")
    .eq("persona_id", "cara")
    .eq("platform", "fv_page")
    .eq("scheduled_date", today)
    .in("status", ["draft", "scheduled", "posted", "publishing"])
    .limit(1);

  if (existing?.length > 0) {
    return res.status(200).json({ skipped: true, reason: "Already generated for today", date: today });
  }

  const slots = buildSlots();

  // ── Step 1: Generate copy ──────────────────────────────────────────────────
  let posts = [];
  try {
    const genRes = await fetch(`${baseUrl}/api/generate-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slots,
        personas:   [CARA_PERSONA],
        platforms:  [FANVUE_PLATFORM],
        fanvueMode: true,
        ideaSeed:   "",
      }),
    });
    if (!genRes.ok) {
      const err = await genRes.text();
      return res.status(500).json({ error: `generate-batch failed: ${err}` });
    }
    posts = await consumeBatchStream(genRes);
  } catch (e) {
    return res.status(500).json({ error: `Copy generation error: ${e.message}` });
  }

  if (!posts.length) {
    return res.status(500).json({ error: "No posts returned from generate-batch" });
  }

  // ── Step 2: Generate image for each post, then save ───────────────────────
  const results = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const slot = slots[i] || slots[0];
    let imageUrl = null;

    try {
      const requestId = await submitImage(falKey, post);
      imageUrl = await pollImage(falKey, requestId, 90000); // 90s max per image
    } catch (imgErr) {
      // Image failed — still save the post, just without an image
      console.error(`[cron-generate] image failed for post ${i}:`, imgErr.message);
    }

    const row = {
      id:              post.id || `cron_${Date.now()}_${i}`,
      persona_id:      "cara",
      persona_name:    "Cara Whitmore",
      platform:        "fv_page",
      pillar:          post.pillar || slot.pillar,
      hook:            post.hook || "",
      caption:         post.caption || "",
      hashtags:        post.hashtags || "",
      cta:             post.cta || null,
      photo_direction: post.photo_direction || null,
      photo_idea:      post.photo_idea || null,
      post_type:       post.post_type || null,
      content_label:   post.content_label || null,
      trend_hook:      post.trend_hook || null,
      shot_angle:      post.shot_angle || null,
      wardrobe:        post.wardrobe || null,
      image_prompt:    post.image_prompt ? JSON.stringify(post.image_prompt) : null,
      image_url:       imageUrl,
      scheduled_date:  slot.scheduledDate,
      scheduled_time:  slot.scheduledTime,
      status:          "scheduled",
    };

    const { error: insertError } = await supabase
      .from("content_queue")
      .upsert(row, { onConflict: "id" });

    results.push({
      index:      i,
      post_type:  row.post_type,
      time:       slot.scheduledTime,
      has_image:  !!imageUrl,
      saved:      !insertError,
      error:      insertError?.message || null,
    });
  }

  return res.status(200).json({
    date:      today,
    generated: posts.length,
    results,
  });
}
