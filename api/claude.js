// Vercel serverless function — proxies LLM API calls so the API key stays server-side.
// Uses Google Gemini 2.5 Pro. Key is read from GEMINI_API_KEY environment variable.
// Includes automatic retry on rate limit (429) errors.

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
      const waitSec = Math.pow(2, attempt + 1); // 2s, 4s, 8s
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }

    return { res, data };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured on the server" });
  }

  try {
    const { system, user, maxTokens = 8000 } = req.body;

    if (!system || !user) {
      return res.status(400).json({ error: "Missing required fields: system, user" });
    }

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: user }],
        },
      ],
      systemInstruction: {
        parts: [{ text: system }],
      },
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 1.0,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

    const { res: geminiRes, data } = await callGemini(url, body);

    if (!geminiRes.ok) {
      const errMsg = data?.error?.message || `Gemini API error ${geminiRes.status}`;
      return res.status(geminiRes.status).json({ error: errMsg });
    }

    const text = (data.candidates || [])
      .map((c) => (c.content?.parts || []).map((p) => p.text || "").join(""))
      .join("")
      .trim();

    if (!text) {
      return res.status(502).json({ error: "Empty response from Gemini" });
    }

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
