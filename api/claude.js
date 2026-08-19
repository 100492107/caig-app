// Vercel serverless function — proxies Gemini text + image understanding so API keys stay server-side.
// POST { system, user, images?: [{ dataUrl, mimeType }], maxTokens }

const MAX_RETRIES = 3;

async function callGemini(url, body) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const waitSec = Math.pow(2, attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
      continue;
    }
    return { response, data };
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

function normalizeCreativeResponse(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.hypotheses)) {
      parsed.hypotheses = parsed.hypotheses.map((h) => ({
        ...h,
        slop_risks: Array.isArray(h?.slop_risks)
          ? h.slop_risks.filter(Boolean)
          : h?.slop_risks ? [String(h.slop_risks)] : [],
      }));
      return JSON.stringify(parsed);
    }
  } catch (_) {
    // Keep non-JSON responses untouched; the client has its own parser/error handling.
  }
  return text;
}

function imagePart(image) {
  const dataUrl = String(image?.dataUrl || "");
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error("Invalid image data URL.");
  return {
    inlineData: {
      mimeType: image.mimeType || match[1],
      data: match[2],
    },
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured on the server" });

  try {
    const { system, user, images = [], maxTokens = 8000 } = await readBody(req);
    if (!system || !user) return res.status(400).json({ error: "Missing required fields: system, user" });
    if (!Array.isArray(images) || images.length > 4) return res.status(400).json({ error: "Maximum 4 images per vision request." });

    const parts = [{ text: user }];
    for (const image of images) parts.push(imagePart(image));

    const geminiBody = {
      contents: [{ role: "user", parts }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    const { response: geminiResponse, data } = await callGemini(url, geminiBody);

    if (!geminiResponse.ok) {
      const errMsg = data?.error?.message || `Gemini API error ${geminiResponse.status}`;
      return res.status(geminiResponse.status).json({ error: errMsg });
    }

    const text = (data.candidates || [])
      .map((candidate) => (candidate.content?.parts || []).map((part) => part.text || "").join(""))
      .join("")
      .trim();

    if (!text) return res.status(502).json({ error: "Empty response from Gemini" });
    return res.status(200).json({ text: normalizeCreativeResponse(text) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
