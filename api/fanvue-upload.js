// api/fanvue-upload.js
import { createHash } from "node:crypto";
// Uploads an image to Fanvue using their 4-step multipart upload flow.
// Endpoints reverse-engineered via DevTools on 05/05/2026.
//
// Flow:
//   1. media.createMediaMultipartUpload  — register the file, get uploadId + S3 URL
//   2. PUT to S3 presigned URL           — upload raw bytes, get ETag back
//   3. media.getMediaMultipartUploadUrl  — (optional poll, can skip for single-part)
//   4. media.finaliseMedia               — tell Fanvue upload is done, returns mediaUuid
//
// The mediaUuid from step 4 is what goes into post.createPost → mediaUuids[]

const FANVUE_BASE = "https://www.fanvue.com";
const TRPC = `${FANVUE_BASE}/trpc`;

function fanvueHeaders(sessionToken) {
  return {
    "Content-Type": "application/json",
    Cookie: `fv-auth.session-token=${sessionToken}`,
    Origin: FANVUE_BASE,
    Referer: `${FANVUE_BASE}/`,
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  };
}

/**
 * Upload an image to Fanvue from a public URL.
 * @param {string} imageUrl     - Public URL of the image to upload
 * @param {string} sessionToken - Fanvue fv-auth.session-token cookie value
 * @param {string} [filename]   - Optional filename (without extension)
 * @returns {Promise<string>}   - mediaUuid to pass to post.createPost
 */
export async function uploadImageToFanvue(imageUrl, sessionToken, filename) {
  // --- Fetch the image ---
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status} ${imageUrl}`);
  const imageBuffer = await imageRes.arrayBuffer();

  // Derive a clean filename from URL if not provided
  const name = filename || `caig_${Date.now()}`;
  const filenameWithExt = `${name}.jpeg`;

  // ----------------------------------------------------------------
  // STEP 1: media.createMediaMultipartUpload
  // Registers the upload with Fanvue, returns uploadId and S3 URL(s)
  // ----------------------------------------------------------------
  const createBody = {
    json: {
      mediaRole: "VAULT_ITEM",
      mediaType: 2,
      name: name,
      filename: filenameWithExt,
      numberOfParts: 1,
      isAIGenerated: null,
    },
    meta: {
      values: {
        isAIGenerated: ["undefined"],
      },
    },
  };

  const createRes = await fetch(`${TRPC}/media.createMediaMultipartUpload`, {
    method: "POST",
    headers: fanvueHeaders(sessionToken),
    body: JSON.stringify(createBody),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`createMediaMultipartUpload failed ${createRes.status}: ${err}`);
  }
  const createData = await createRes.json();
  console.log("createMediaMultipartUpload response:", JSON.stringify(createData));

  // Extract fields from tRPC response
  const uploadResult = createData?.result?.data?.json;
  console.log("step1 full uploadResult:", JSON.stringify(uploadResult));

  const mediaUuid = uploadResult?.media_uuid || uploadResult?.uuid || uploadResult?.mediaUuid || uploadResult?.id;
  const uploadId  = uploadResult?.uploadId   || uploadResult?.upload_id;

  // Fanvue returns presigned URL in parts[0] when numberOfParts is sent
  const part0 = uploadResult?.parts?.[0];
  const s3Url =
    part0?.signedUrl       ||
    part0?.url             ||
    part0?.signed_url      ||
    part0?.presignedUrl    ||
    part0?.upload_url      ||
    part0?.uploadUrl       ||
    uploadResult?.url      ||
    uploadResult?.uploadUrl||
    uploadResult?.signed_url||
    uploadResult?.presigned_url||
    null;

  console.log("step1 extracted:", { mediaUuid, uploadId, s3Url: s3Url?.slice(0, 80), part0Keys: part0 ? Object.keys(part0) : null });

  if (!mediaUuid) throw new Error(`No mediaUuid. Step1 raw: ${JSON.stringify(createData)}`);
  if (!uploadId)  throw new Error(`No uploadId. Step1 raw: ${JSON.stringify(createData)}`);

  // ----------------------------------------------------------------
  // STEP 2: POST to media.getMediaMultipartUploadUrl to get S3 presigned URL
  // This is a tRPC mutation (POST only). Input: mediaUuid, uploadId, partNumber.
  // ----------------------------------------------------------------
  const partNumber = 1;
  let presignedUrl = s3Url;

  if (!presignedUrl) {
    const step2Body = JSON.stringify({
      json: { media_uuid: mediaUuid, uploadId, partNumber },
    });
    const step2Res = await fetch(`${TRPC}/media.getMediaMultipartUploadUrl`, {
      method: "POST",
      headers: fanvueHeaders(sessionToken),
      body: step2Body,
    });
    const step2Text = await step2Res.text();
    console.log("step2 status:", step2Res.status, "body:", step2Text.slice(0, 300));

    if (!step2Res.ok) {
      throw new Error(`getMediaMultipartUploadUrl failed ${step2Res.status}: ${step2Text}`);
    }

    let step2Data;
    try { step2Data = JSON.parse(step2Text); } catch { throw new Error(`step2 non-JSON: ${step2Text}`); }

    // Response is a plain string URL at result.data.json
    const r = step2Data?.result?.data?.json;
    presignedUrl = typeof r === "string" ? r : (r?.url || r?.signedUrl || r?.uploadUrl || null);
    console.log("step2 presignedUrl:", presignedUrl?.slice(0, 80));
  }

  if (!presignedUrl) {
    throw new Error(`No presigned URL after step2. step1 keys: ${Object.keys(uploadResult || {}).join(",")}`);
  }

  // ----------------------------------------------------------------
  // STEP 3: PUT raw bytes to S3 presigned URL
  // ----------------------------------------------------------------
  const s3Res = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: imageBuffer,
  });
  if (!s3Res.ok) {
    const err = await s3Res.text();
    throw new Error(`S3 upload failed ${s3Res.status}: ${err}`);
  }

  // S3 single-part ETag = MD5 of content wrapped in quotes
  // Node fetch (undici) sometimes strips response headers — compute it ourselves to be safe
  let eTag = s3Res.headers.get("ETag") || s3Res.headers.get("etag");
  if (!eTag) {
    const md5 = createHash("md5").update(Buffer.from(imageBuffer)).digest("hex");
    eTag = `"${md5}"`;
    console.log("ETag computed from MD5:", eTag);
  } else {
    console.log("ETag from S3 headers:", eTag);
  }

  // ----------------------------------------------------------------
  // STEP 4: media.finaliseMedia
  // Tells Fanvue the upload is complete; confirms mediaUuid
  // ----------------------------------------------------------------
  const finaliseBody = {
    json: {
      mediaUuid: mediaUuid,
      uploadId: uploadId,
      parts: [{ ETag: eTag, PartNumber: partNumber }],
      counterpartUuid: null,
      cropInfo: null,
      vaultFolderName: null,
    },
    meta: {
      values: {
        vaultFolderName: ["undefined"],
        counterpartUuid: ["undefined"],
        cropInfo: ["undefined"],
      },
    },
  };

  const finaliseRes = await fetch(`${TRPC}/media.finaliseMedia`, {
    method: "POST",
    headers: fanvueHeaders(sessionToken),
    body: JSON.stringify(finaliseBody),
  });
  if (!finaliseRes.ok) {
    const err = await finaliseRes.text();
    throw new Error(`finaliseMedia failed ${finaliseRes.status}: ${err}`);
  }
  const finaliseData = await finaliseRes.json();

  // Confirmed mediaUuid from finalise response (should match step 1)
  const confirmedUuid =
    finaliseData?.result?.data?.json?.media_uuid ||
    finaliseData?.result?.data?.json?.uuid ||
    finaliseData?.result?.data?.json?.mediaUuid ||
    mediaUuid; // fall back to the one we already have

  return confirmedUuid;
}

// Fetch Fanvue session token from Supabase using service role key
async function getFanvueToken(personaId = "cara") {
  const SUPABASE_URL = "https://zvyioxhwdyocaanzcgqf.supabase.co";
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/platform_tokens?persona_id=eq.${personaId}&platform=eq.fanvue&select=token&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const rows = await res.json();
  return rows?.[0]?.token || null;
}

// Vercel serverless handler — for direct calls or testing
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { imageUrl, filename, personaId = "cara" } = body;
  // Accept sessionToken from body for backwards compat; otherwise fetch server-side
  let sessionToken = body.sessionToken;

  if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });

  if (!sessionToken) {
    sessionToken = await getFanvueToken(personaId);
    if (!sessionToken) return res.status(500).json({ error: "No Fanvue token found for persona" });
  }

  try {
    const mediaUuid = await uploadImageToFanvue(imageUrl, sessionToken, filename);
    return res.status(200).json({ success: true, mediaUuid });
  } catch (e) {
    console.error("fanvue-upload error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
