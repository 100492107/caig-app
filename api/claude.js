// Vercel serverless function — proxies LLM API calls so the API key stays server-side.
// Uses Google Gemini 2.5 Pro. Key is read from GEMINI_API_KEY environment variable.

const MAX_RETRIES = 3;

async function callGemini(url, body) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const waitSec = Math.pow(2, attempt + 1);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }

    return { res, data };
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error("Invalid JSON body")); }
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
          : h?.slop_risks
            ? [String(h.slop_risks)]
            : [],
      }));
      return JSON.stringify(parsed);
    }
  } catch (_) {
    // Keep non-JSON responses untouched; the client has its own parser/error handling.
  }
  return text;
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
    const { system, user, maxTokens = 8000 } = await readBody(req);

    if (!system || !user) {
      return res.status(400).json({ error: "Missing required fields: system, user" });
    }

    const geminiBody = {
      contents: [{ role: "user", parts: [{ text: user }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { maxOutputTokens: maxTokens, temperature: 1.0 },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    const { res: geminiRes, data } = await callGemini(url, geminiBody);

    if (!geminiRes.ok) {
      const errMsg = data?.error?.message || `Gemini API error ${geminiRes.status}`;
      return res.status(geminiRes.status).json({ error: errMsg });
    }

    const text = (data.candidates || [])
      .map((c) => (c.content?.parts || []).map((p) => p.text || "").join(""))
      .join("")
      .trim();

    if (!text) return res.status(502).json({ error: "Empty response from Gemini" });

    return res.status(200).json({ text: normalizeCreativeResponse(text) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
