exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  try {
    const { password } = JSON.parse(event.body || "{}");
    const correct = process.env.CAIG_PASS;
    if (!correct) return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Not configured" }) };
    if (password === correct) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true }),
      };
    }
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false }),
    };
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false }) };
  }
};
