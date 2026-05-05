// api/fanvue-post.js
// Creates a post on Fanvue via their internal tRPC API.
// Called by cron-publish.js for each due post in content_queue.
//
// Auth: cookie-based session (fv-auth.session-token from Fanvue)
// Endpoint: POST https://www.fanvue.com/trpc/post.createPost

const FANVUE_BASE = "https://www.fanvue.com";
const CREATE_POST_URL = `${FANVUE_BASE}/trpc/post.createPost`;

/**
 * Build the tRPC-wrapped request body Fanvue expects.
 * Fields discovered via DevTools network interception 05/05/2026.
 *
 * @param {string} text          - Full caption text
 * @param {string[]} mediaUuids  - Array of media UUIDs (from fanvue-upload.js)
 * @param {number|null} price    - PPV price in pence (null = free to subscribers)
 * @param {string|null} publishAt - ISO datetime string for scheduled posts (null = now)
 * @param {string|null} mediaPreviewUuid - Preview image UUID for PPV posts
 */
function buildPostBody(text, mediaUuids = [], price = null, publishAt = null, mediaPreviewUuid = null) {
  return {
    json: {
      availableToGroupId: 0,          // 0 = all subscribers
      contentCollectionUuids: [],
      expiresAt: null,
      mediaPreviewUuid: mediaPreviewUuid,
      mediaUuids: mediaUuids,
      price: price,                   // null = free, integer = PPV price
      publishAt: publishAt,           // null = immediate, ISO string = scheduled
      text: text,
    },
    meta: {
      values: {
        expiresAt: ["undefined"],
        mediaPreviewUuid: mediaPreviewUuid ? [] : ["undefined"],
        price: price !== null ? [] : ["undefined"],
        publishAt: publishAt ? [] : ["undefined"],
      },
    },
  };
}

/**
 * Build cookie header from stored session token.
 * Fanvue uses cookie-based auth — no Bearer token, just the session cookie.
 */
function buildCookieHeader(sessionToken) {
  return `fv-auth.session-token=${sessionToken}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { postId, caption, sessionToken, mediaUuids = [], price = null, publishAt = null, mediaPreviewUuid = null } = body;

  if (!caption) return res.status(400).json({ error: "caption is required" });
  if (!sessionToken) return res.status(400).json({ error: "sessionToken is required" });

  const postBody = buildPostBody(caption, mediaUuids, price, publishAt, mediaPreviewUuid);

  let fanvueRes;
  try {
    fanvueRes = await fetch(CREATE_POST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": buildCookieHeader(sessionToken),
        "Origin": FANVUE_BASE,
        "Referer": `${FANVUE_BASE}/`,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "trpc-accept": "application/jsonl",
      },
      body: JSON.stringify(postBody),
    });
  } catch (e) {
    return res.status(502).json({ error: "Network error reaching Fanvue", detail: e.message });
  }

  let data;
  try {
    data = await fanvueRes.json();
  } catch {
    return res.status(502).json({ error: "Invalid response from Fanvue", status: fanvueRes.status });
  }

  if (!fanvueRes.ok) {
    console.error("Fanvue createPost error:", fanvueRes.status, JSON.stringify(data));
    return res.status(fanvueRes.status).json({
      error: "Fanvue rejected the post",
      detail: data,
      fanvue_status: fanvueRes.status,
    });
  }

  // Extract the post UUID/ID from the tRPC response
  const fanvuePostId = data?.result?.data?.json?.uuid
    || data?.result?.data?.json?.id
    || data?.result?.data?.uuid
    || null;

  return res.status(200).json({
    success: true,
    fanvue_post_id: fanvuePostId,
    raw: data,
  });
}
