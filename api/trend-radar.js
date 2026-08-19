const FEEDS = {
  US: "https://trends.google.com/trending/rss?geo=US",
  GB: "https://trends.google.com/trending/rss?geo=GB",
};

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const region = String(req.query?.region || "US").toUpperCase();
  const url = FEEDS[region] || FEEDS.US;

  try {
    const response = await fetch(url, { headers: { "User-Agent": "CornerstoneAIAssets/1.0" } });
    const xml = await response.text();
    if (!response.ok) throw new Error(`Trend feed returned ${response.status}`);

    const items = xml.split(/<item>/i).slice(1).map((block) => ({
      title: tag(block, "title"),
      traffic: tag(block, "approx_traffic"),
      published: tag(block, "pubDate"),
      link: tag(block, "link"),
      source: "Google Trending Searches",
    })).filter((item) => item.title);

    return res.status(200).json({ region, source: url, fetchedAt: new Date().toISOString(), items: items.slice(0, 25) });
  } catch (error) {
    return res.status(502).json({ error: error.message || "Could not load live trend feed", source: url });
  }
}
