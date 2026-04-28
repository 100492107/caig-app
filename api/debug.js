export default function handler(req, res) {
  res.status(200).json({
    hasKey: !!process.env.GEMINI_API_KEY,
    keyStart: process.env.GEMINI_API_KEY?.slice(0, 8) || "missing",
    allKeys: Object.keys(process.env).filter(k => k.includes("GEMINI") || k.includes("API")),
  });
}
