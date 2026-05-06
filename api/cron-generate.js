// api/cron-generate.js
// Daily autopilot: generates content for all active personas and saves to content_queue.
// Runs at 06:00 UTC daily — posts are then scheduled for platform posting times the same day.
// Pairs with cron-publish.js which publishes due posts every 5 minutes.
//
// Auth: CRON_SECRET (same as cron-publish.js)

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://zvyioxhwdyocaanzcgqf.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Cara's config ────────────────────────────────────────────────────────────
// Mirrors the FANVUE_PLATFORMS and FANVUE_PILLARS in App.jsx.
// Update here if platforms or pillars change.

const CARA_PERSONA = {
  id: "cara",
  name: "Cara Whitmore",
  niche: "travel",
  char: "Smart, dry, specific. British. 23. Budget travel creator turned subscription creator.",
  voice: "Casual, warm, slightly tired of the internet. Dry humour. Never performative.",
};

const CARA_PLATFORMS = [
  {
    id: "fv_instagram", name: "Instagram", times: ["11:00", "19:00"],
    purpose: "Top-of-funnel discovery. Instagram is brand-building — aesthetic, aspirational, personality-first. No nudity. Confident, flirtatious through styling and implication. Goal: profile visits → link in bio → Fanvue.",
    contentMix: [
      { type: "fv_tease",       weight: 3 },
      { type: "fv_bikini",      weight: 2 },
      { type: "fv_personality", weight: 3 },
      { type: "fv_interact",    weight: 2 },
    ],
  },
  {
    id: "fv_page", name: "Fanvue Page", times: ["10:00", "20:00"],
    purpose: "Content that lives on the Fanvue page — PPV captions and subscriber wall posts.",
    contentMix: [
      { type: "fv_ppv_caption", weight: 4 },
      { type: "fv_wall_post",   weight: 3 },
    ],
  },
];

const CARA_PILLARS = [
  "Behind the scenes — what I'm doing today that isn't on the page yet",
  "Travel throwback — a specific moment from a trip that feels relevant now",
  "Day in my life — honest, specific, not aspirational",
  "Content tease — what just went up on the page",
  "Personal thought — something I've been thinking about this week",
  "Fan interaction — something I want to know about them",
  "Mood check — relatable moment that makes fans feel close to me",
];

// Posts per day per platform (one per posting time slot)
const POSTS_PER_PLATFORM = 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayString() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function randomPillar() {
  return CARA_PILLARS[Math.floor(Math.random() * CARA_PILLARS.length)];
}

// Build slots array for generate-batch
function buildSlots(platforms, postsPerPlatform) {
  const slots = [];
  for (const platform of platforms) {
    for (let i = 0; i < postsPerPlatform; i++) {
      slots.push({
        personaId: CARA_PERSONA.id,
        platformId: platform.id,
        pillar: randomPillar(),
        scheduledDate: todayString(),
        scheduledTime: platform.times[i % platform.times.length],
      });
    }
  }
  return slots;
}

// Consume NDJSON stream from generate-batch, return array of post objects
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
    buffer = lines.pop(); // keep incomplete last line
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.post) posts.push(obj.post);
      } catch (_) { /* skip malformed lines */ }
    }
  }
  // Process any remaining buffer
  if (buffer.trim()) {
    try {
      const obj = JSON.parse(buffer);
      if (obj.post) posts.push(obj.post);
    } catch (_) {}
  }

  return posts;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Auth — same CRON_SECRET as cron-publish.js
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const today = todayString();

  // Check if we've already generated today — avoid double-running
  const { data: existing } = await supabase
    .from("content_queue")
    .select("id")
    .eq("persona_id", "cara")
    .eq("scheduled_date", today)
    .in("status", ["draft", "scheduled", "posted"])
    .limit(1);

  if (existing?.length > 0) {
    return res.status(200).json({
      skipped: true,
      reason: "Already generated content for today",
      date: today,
    });
  }

  const slots = buildSlots(CARA_PLATFORMS, POSTS_PER_PLATFORM);

  let posts = [];
  try {
    const genRes = await fetch(`${baseUrl}/api/generate-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slots,
        personas: [CARA_PERSONA],
        platforms: CARA_PLATFORMS,
        fanvueMode: true,
        ideaSeed: "",
      }),
    });

    if (!genRes.ok) {
      const err = await genRes.text();
      return res.status(500).json({ error: `generate-batch failed: ${err}` });
    }

    posts = await consumeBatchStream(genRes);
  } catch (e) {
    return res.status(500).json({ error: `Generation error: ${e.message}` });
  }

  if (!posts.length) {
    return res.status(500).json({ error: "No posts returned from generate-batch" });
  }

  // Save to Supabase content_queue as 'scheduled'
  const rows = posts.map(post => {
    const slot = slots.find(s => s.platformId === post.platformId) || slots[0];
    return {
      id:              post.id || `cron_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      persona_id:      "cara",
      persona_name:    "Cara Whitmore",
      platform:        post.platformId || post.platform,
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
      scheduled_date:  slot.scheduledDate,
      scheduled_time:  slot.scheduledTime,
      status:          "scheduled",   // skip draft/review — fully automated
    };
  });

  const { error: insertError } = await supabase
    .from("content_queue")
    .upsert(rows, { onConflict: "id" });

  if (insertError) {
    return res.status(500).json({ error: `Supabase insert error: ${insertError.message}` });
  }

  return res.status(200).json({
    generated: posts.length,
    scheduled: rows.length,
    date: today,
    slots: rows.map(r => ({ platform: r.platform, time: r.scheduled_time, type: r.post_type })),
  });
}
