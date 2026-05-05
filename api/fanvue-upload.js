// api/fanvue-upload.js
// Uploads an image to Fanvue and returns the mediaUuid for use in post.createPost.
//
// STATUS: STUB — media upload endpoint not yet captured from DevTools.
// TODO: In Fanvue, attach an image to a draft post and capture the network request:
//   - Look for: media.upload, media.create, multipart/form-data, or /upload in URL
//   - Paste the Request URL and Payload here and complete this file
//
// Likely endpoint pattern (tRPC or REST):
//   POST https://www.fanvue.com/trpc/media.upload   (tRPC)
//   or
//   POST https://www.fanvue.com/api/media/upload    (REST multipart)
//
// Expected flow:
//   1. Fetch image buffer from our Supabase Storage / external URL
//   2. POST as multipart/form-data to Fanvue upload endpoint
//   3. Fanvue returns a mediaUuid
//   4. Pass mediaUuid array to fanvue-post.js

const FANVUE_BASE = "https://www.fanvue.com";

/**
 * Upload an image to Fanvue from a URL.
 * @param {string} imageUrl     - Public URL of the image to upload
 * @param {string} sessionToken - Fanvue fv-auth.session-token cookie value
 * @returns {Promise<string>}   - mediaUuid string
 */
export async function uploadImageToFanvue(imageUrl, sessionToken) {
  // Step 1: fetch the image as a buffer
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);
  const imageBuffer = await imageRes.arrayBuffer();
  const contentType = imageRes.headers.get("content-type") || "image/jpeg";

  // Step 2: build multipart form — TODO: confirm field names from DevTools
  const form = new FormData();
  const blob = new Blob([imageBuffer], { type: contentType });
  form.append("file", blob, "image.jpg"); // field name may differ — check DevTools

  // TODO: Replace URL below with real endpoint from DevTools capture
  const UPLOAD_URL = `${FANVUE_BASE}/trpc/media.upload`; // PLACEHOLDER

  const uploadRes = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Cookie: `fv-auth.session-token=${sessionToken}`,
      Origin: FANVUE_BASE,
      Referer: `${FANVUE_BASE}/`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      // Do NOT set Content-Type — fetch sets it automatically with boundary for FormData
    },
    body: form,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Fanvue upload failed ${uploadRes.status}: ${err}`);
  }

  const data = await uploadRes.json();

  // TODO: confirm response shape from DevTools — adjust path below
  const mediaUuid =
    data?.result?.data?.json?.uuid ||
    data?.result?.data?.uuid ||
    data?.uuid ||
    data?.mediaUuid;

  if (!mediaUuid) throw new Error(`No mediaUuid in Fanvue upload response: ${JSON.stringify(data)}`);
  return mediaUuid;
}

// Vercel handler — called directly if needed, or imported by cron-publish.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imageUrl, sessionToken } = req.body || {};
  if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });
  if (!sessionToken) return res.status(400).json({ error: "sessionToken required" });

  try {
    const mediaUuid = await uploadImageToFanvue(imageUrl, sessionToken);
    return res.status(200).json({ success: true, mediaUuid });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
