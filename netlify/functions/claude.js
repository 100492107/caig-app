// Netlify serverless function — proxies LLM API calls so the API key stays server-side.
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

    // If rate limited and we have retries left, wait and try again
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const waitSec = Math.pow(2, attempt + 1); // 2s, 4s, 8s
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }

    return { res, data };
  }
}

export default async function handler(req) {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured on the server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { system, user, maxTokens = 8000 } = await req.json();

    if (!system || !user) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: system, user" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Gemini API format — using gemini-2.5-pro (highest quality, best at unique creative content)
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

    const { res, data } = await callGemini(url, body);

    if (!res.ok) {
      const errMsg =
        data?.error?.message || `Gemini API error ${res.status}`;
      return new Response(JSON.stringify({ error: errMsg }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract text from Gemini response
    const text = (data.candidates || [])
      .map((c) => (c.content?.parts || []).map((p) => p.text || "").join(""))
      .join("")
      .trim();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Empty response from Gemini" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
