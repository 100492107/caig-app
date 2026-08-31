import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const PEOPLE = [
  { id: "cara", name: "Cara", description: "Direct, dry, disciplined, British." },
  { id: "lila", name: "Lila", description: "Warm, measured, observant, understated." },
  { id: "cara_lila", name: "Cara + Lila", description: "Two distinct voices, chemistry and contrast." },
];

const OBJECTIVES = ["Sell", "Discover", "Test Hook", "Build Demand"];
const FORMATS = [
  ["problem_solution", "Problem / Solution", "Pain → discovery → demonstration → payoff → CTA"],
  ["talking_ugc", "Talking UGC", "Creator speaks directly to camera with the product woven into the story"],
  ["reaction", "Reaction", "Creator reacts to the problem, product or discovery"],
  ["slideshow", "Slideshow", "TikTok Photo Mode: swipeable story with on-image copy"],
  ["before_after", "Before / After", "Observable contrast without fabricated results"],
  ["grwm", "GRWM", "Product appears naturally inside getting-ready content"],
  ["story", "Story", "Specific micro-story with curiosity and payoff"],
  ["comparison", "Comparison", "Simple A/B or old-way-vs-new-way contrast"],
];
const BIBLES = {
  cara: `Cara is an adult fictional creator. Direct, dry, disciplined and British. Practical, confident and slightly self-aware. She speaks plainly, never like a corporate brand. Strong worlds: routines, style, training, work, confidence and useful discoveries.`,
  lila: `Lila is an adult fictional creator. Warm, measured, observant and understated. Calm rather than loud. Strong worlds: beauty, skincare, haircare, lifestyle, travel, routines and small discoveries.`,
  cara_lila: `Cara and Lila are two separate adult fictional creators. Cara is direct, dry and disciplined. Lila is warm, measured and observant. Never merge identities; use contrast, chemistry or shared situations.`,
};
const FORMAT_RULES = {
  problem_solution: "Make the problem concrete immediately. Frustration first, product second. End with a natural shopping cue.",
  talking_ugc: "Start mid-thought. Use one believable observation, one product detail and one reason to care. Avoid sales-script cadence.",
  reaction: "Open with a genuine reaction or curiosity gap. The reaction must matter to the viewer. Product enters naturally.",
  slideshow: "Create 5–7 coherent slides. Each earns the next swipe. Every slide gets short on-image text plus a detailed JSON image prompt.",
  before_after: "Define the exact visual difference. No fabricated numbers, testimonials or medical/beauty claims.",
  grwm: "The product belongs inside the routine. Use real situations: work, date night, going out, travel, skincare, hair or getting dressed.",
  story: "Use setup, tension, discovery and payoff. Be specific enough to feel lived rather than generic.",
  comparison: "Use a useful, simple contrast. Never invent prices, specs or superiority claims.",
};
const EMPTY_METRICS = { views: "", likes: "", comments: "", shares: "", saves: "", clicks: "", orders: "", commission: "" };

const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18, marginBottom: 16 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 10, padding: "10px 12px" };
const textarea = { ...input, resize: "vertical", fontFamily: "inherit", lineHeight: 1.45 };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 10, padding: "8px 11px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };
const title = { fontSize: 14, fontWeight: 900, marginBottom: 12 };
const label = { display: "flex", flexDirection: "column", gap: 7, fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800, color: "#7f8798" };
const section = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 900, color: "#7f8798", marginBottom: 6 };
const output = { background: "#151822", border: "1px solid #2a3040", borderRadius: 10, padding: 11, color: "#dce2ec", fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap", minHeight: 46 };
const pre = { margin: "10px 0 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "#0a0d12", border: "1px solid #202635", borderRadius: 8, padding: 10, color: "#bfc8d8", fontSize: 10.5, lineHeight: 1.45 };
const grid3 = { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 };
const twoCol = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 };
const info = { border: "1px solid #252a39", borderRadius: 10, padding: 10 };
const shell = { maxWidth: 1280, margin: "0 auto" };
const muted = { color: "#838ca0", fontSize: 12, lineHeight: 1.6 };

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned invalid JSON");
  const opener = clean[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let quote = false;
  let escaped = false;
  for (let i = start; i < clean.length; i += 1) {
    const c = clean[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quote = false;
    } else if (c === '"') quote = true;
    else if (c === opener) depth += 1;
    else if (c === closer) {
      depth -= 1;
      if (depth === 0) return JSON.parse(clean.slice(start, i + 1));
    }
  }
  throw new Error("Qwen returned incomplete JSON");
}

function loadProducts() {
  try { return JSON.parse(localStorage.getItem("caig_commerce_products") || "[]"); } catch { return []; }
}
function notesOf(row) { try { return row?.notes ? JSON.parse(row.notes) : {}; } catch { return {}; } }
function number(v) { const n = Number(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : 0; }
function metricsFromNotes(row) { return { ...EMPTY_METRICS, ...(notesOf(row).metrics || {}) }; }
function ratios(metrics) {
  const views = number(metrics.views);
  const clicks = number(metrics.clicks);
  const orders = number(metrics.orders);
  return {
    ctr: views ? ((clicks / views) * 100).toFixed(2) : "0.00",
    conversion: clicks ? ((orders / clicks) * 100).toFixed(2) : "0.00",
    revenue: number(metrics.commission),
  };
}

async function queueQwen({ title: jobTitle, persona, systemPrompt, userPrompt }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title: jobTitle,
    job_type: "commerce_test",
    model: "mlx-community/Qwen3-8B-4bit",
    persona_id: persona,
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    options: { max_tokens: 7000, temperature: 0.62 },
    status: "queued",
    production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}
async function waitQwen(jobId, setMessage) {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    const { data, error } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", jobId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Qwen job disappeared from the queue.");
    if (data.status === "completed") return data.result || "";
    if (data.status === "error") throw new Error(data.error_message || "Qwen failed.");
    setMessage(`Qwen is thinking like a senior TikTok UGC strategist… ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}

function Info({ label: labelText, value }) {
  return <div style={info}><div style={section}>{labelText}</div><div style={{ fontSize: 12, lineHeight: 1.5, color: "#d7dde8" }}>{value || "—"}</div></div>;
}
function Box({ title: boxTitle, value, copy }) {
  return <div><div style={section}>{boxTitle}{copy && <button type="button" onClick={copy} style={{ ...button, marginLeft: 8, padding: "4px 8px", fontSize: 10 }}>Copy</button>}</div><div style={output}>{value || "—"}</div></div>;
}

export default function CommerceTestWorkspaceV2() {
  const [persona, setPersona] = useState("cara");
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [problem, setProblem] = useState("");
  const [proof, setProof] = useState("");
  const [objective, setObjective] = useState("Sell");
  const [format, setFormat] = useState("problem_solution");
  const [count, setCount] = useState("5");
  const [direction, setDirection] = useState("");
  const [fanvueBackground, setFanvueBackground] = useState(true);
  const [products, setProducts] = useState(() => loadProducts());
  const [tests, setTests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId) || null, [products, productId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("content_queue").select("*").eq("pillar", "commerce_test").order("created_at", { ascending: false }).limit(100);
      if (data) setTests(data);
    })();
  }, []);

  function loadProduct(id) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setProductName(p.name || "");
    setProductUrl(p.url || "");
    setProductPrice(p.price || "");
    setCommission(p.commission || "");
    setProblem(p.problem || "");
    setProof(p.proof || "");
  }

  function saveProduct() {
    if (!productName.trim()) { setMessage("Add a product name first."); return; }
    const p = { id: productId || crypto.randomUUID(), name: productName.trim(), url: productUrl.trim(), price: productPrice.trim(), commission: commission.trim(), problem: problem.trim(), proof: proof.trim() };
    const next = [p, ...products.filter((x) => x.id !== p.id)];
    localStorage.setItem("caig_commerce_products", JSON.stringify(next));
    setProducts(next);
    setProductId(p.id);
    setMessage("Product saved.");
  }

  function copy(text) {
    navigator.clipboard?.writeText(String(text || ""));
    setMessage("Copied.");
  }

  function fanvueInstruction() {
    return fanvueBackground
      ? `BACKGROUND FANVUE FUNNEL: ON. Keep the Fanvue destination available in the creator bio from day one. Do not name Fanvue, subscription pages or adult monetisation in normal TikTok Shop content unless explicitly requested. Do not use hard Fanvue CTAs. On occasional lifestyle, identity or GRWM content, a light profile-curiosity line such as "more on my profile" may be used only when it sounds natural. Product content should remain product-first. The audience should discover the bio destination rather than being aggressively pushed to it.`
      : `BACKGROUND FANVUE FUNNEL: OFF. Do not reference profile curiosity or Fanvue. Focus only on the TikTok Shop objective.`;
  }

  async function persistTest(test, index, extra = {}) {
    const existing = tests.find((x) => x.id === test.__queueId);
    const id = test.__queueId || crypto.randomUUID();
    const notes = { ...notesOf(existing), commerce_test: test, product: { name: productName, url: productUrl, price: productPrice, commission }, fanvue_background: fanvueBackground, ...extra };
    const row = {
      id,
      persona_id: persona,
      persona_name: PEOPLE.find((p) => p.id === persona)?.name || persona,
      platform: "TikTok",
      status: extra.status || existing?.status || "draft",
      pillar: "commerce_test",
      hook: test.hook || "",
      caption: test.post_caption || "",
      cta: test.cta || null,
      photo_direction: JSON.stringify(test.image_generation_prompts || []),
      photo_idea: test.angle || null,
      post_type: format === "slideshow" ? "carousel" : "ugc",
      content_label: `Commerce Test · ${productName.trim()} · ${format}`,
      notes: JSON.stringify(notes),
      created_at: existing?.created_at || new Date().toISOString(),
    };
    const { error } = await supabase.from("content_queue").upsert(row, { onConflict: "id" });
    if (error) throw error;
    return { ...row, __queueId: id };
  }

  async function generateTests() {
    if (!productName.trim()) { setMessage("Add a product before generating."); return; }
    setBusy(true);
    setMessage(`Building ${count} commerce tests…`);
    try {
      const person = PEOPLE.find((p) => p.id === persona);
      const fmt = FORMATS.find((x) => x[0] === format);
      const systemPrompt = `You are the senior TikTok Shop creative strategist, UGC director, retention editor, follower-growth analyst and commerce producer inside CornerstoneAIAssets. You are an expert. Do not behave like a generic copywriter.\n\nCREATOR PERSONA:\n${BIBLES[persona]}\n\nMISSION: Grow the creator while selling the product. The post must still be worth consuming if the viewer never buys. The creator earns the follow; the product earns the click.\n\n${fanvueInstruction()}\n\nNON-NEGOTIABLES:\n1. Never invent product facts, prices, reviews, testimonials, specs, ingredients, results or personal experiences.\n2. Never fake urgency, scarcity or social proof.\n3. Avoid unsupported medical, therapeutic or exaggerated beauty claims. Use observable demonstrations and careful personal framing.\n4. Do not write ad-speak. Avoid generic filler such as 'you need this', 'game changer', 'run don't walk' unless a truly specific creative reason makes it appropriate.\n5. Hook for a stranger. Assume zero context and zero existing relationship.\n6. The first 1–2 seconds / first slide must be immediately understandable and visually interesting.\n7. Build a retention mechanism: curiosity gap, open loop, escalation, visual transformation, comparison, unexpected detail, question or payoff.\n8. Give the viewer a reason to comment, save, share or follow before the commerce CTA.\n9. Product appears when it solves or advances the story, never as a random beauty shot.\n10. Captions sound like the selected creator. They are short, conversational, specific and human.\n11. Every image-generation prompt must be production-ready JSON direction containing: subject identity, exact environment, wardrobe, action, camera/framing, lens feel, lighting, product placement, realism requirements, continuity constraints and negative constraints.\n12. Carousels require 5–7 connected slides, each with exact on-image caption plus its own JSON prompt.\n13. UGC actions must be physically plausible and easy to demonstrate.\n14. Prefer ordinary human situations and specific pain points over abstract benefits.\n15. Build materially different hypotheses rather than rewriting the same idea.\n16. Treat follower growth and commerce as two separate scores. A high-selling post that creates no reason to follow is not the only kind of winner.\n17. Never manufacture a testimonial or claim Cara/Lila personally used something unless the user provides that fact. Write as a creator demonstration or discovery, not fake lived experience.\n\nFORMAT: ${fmt?.[1]}\nFORMAT RULES: ${FORMAT_RULES[format]}\n\nOBJECTIVE: ${objective}\n\nQUALITY BAR: Imagine you have reviewed thousands of short-form posts. Reject anything that could belong to any random influencer. Every test needs: stop reason, retention mechanism, creator/follower reason, natural product role, exact caption and production-ready visual directions.\n\nReturn JSON only. No markdown and no explanation outside the JSON.`;

      const userPrompt = `CREATOR: ${person?.name}\nPRODUCT: ${productName.trim()}\nPRODUCT URL: ${productUrl.trim() || "not supplied"}\nPRICE: ${productPrice.trim() || "not supplied"}\nCOMMISSION: ${commission.trim() || "not supplied"}\nCORE PROBLEM: ${problem.trim() || "not supplied"}\nVERIFIED FACTS / PROOF: ${proof.trim() || "none supplied"}\nOBJECTIVE: ${objective}\nFORMAT: ${fmt?.[1]}\nEXTRA DIRECTION: ${direction.trim() || "none"}\n\nGenerate exactly ${count} materially different tests. Return exactly:\n{"tests":[{"id":"T1","angle":"","hook":"","retention_mechanism":"","follower_reason":"","creator_role":"","product_role":"","script":"","post_caption":"","cta":"","comment_prompt":"","image_generation_prompts":[{"shot":1,"purpose":"","on_image_caption":"","json_prompt":""}],"video_json_prompt":"","bio_strategy":"","why_this_should_work":""}]}\n\nRules for output: non-carousel formats should use only the number of image prompts genuinely needed, usually 1–4. Slideshow must use 5–7. post_caption is the exact TikTok caption. on_image_caption is the exact text for the image/slide. json_prompt is a valid JSON object encoded as a string. bio_strategy should describe the subtle background profile strategy without naming Fanvue unless the user explicitly asks. The package must be production-ready without another creative pass.`;

      const jobId = await queueQwen({ title: `Commerce Test · ${person?.name} · ${productName.trim()}`, persona, systemPrompt, userPrompt });
      const parsed = parseJson(await waitQwen(jobId, setMessage));
      const generated = Array.isArray(parsed.tests) ? parsed.tests : [];
      if (!generated.length) throw new Error("Qwen returned no commerce tests.");

      const saved = [];
      for (let i = 0; i < generated.length; i += 1) {
        saved.push(await persistTest(generated[i], i, { generated_at: new Date().toISOString() }));
      }
      setTests((current) => [...saved, ...current]);
      setMessage(`${saved.length} tests saved. Captions, on-image copy, JSON prompts and follower strategy are ready.`);
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveMetrics(row, metrics, winner = null) {
    setBusy(true);
    try {
      const existing = notesOf(row);
      const nextNotes = { ...existing, metrics, winner: winner ?? existing.winner ?? false, metrics_updated_at: new Date().toISOString() };
      const { error } = await supabase.from("content_queue").update({ notes: JSON.stringify(nextNotes), status: winner ? "winner" : row.status || "posted" }).eq("id", row.id);
      if (error) throw error;
      setTests((current) => current.map((x) => x.id === row.id ? { ...x, notes: JSON.stringify(nextNotes), status: winner ? "winner" : (x.status || "posted") } : x));
      setMessage(winner ? "Winner marked. Make more like this is ready." : "Performance saved.");
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  async function makeMoreLike(row) {
    const notes = notesOf(row);
    const test = notes.commerce_test || {};
    const metrics = notes.metrics || {};
    setBusy(true);
    setMessage("Qwen is analysing the winner and generating 10 stronger variations…");
    try {
      const product = notes.product || {};
      const person = PEOPLE.find((p) => p.id === row.persona_id) || PEOPLE[0];
      const systemPrompt = `You are the senior TikTok Shop creative strategist inside CornerstoneAIAssets. A commerce test has been proven enough to deserve 10 more variations. Preserve what worked, but do NOT clone the wording.\n\nCREATOR:\n${BIBLES[row.persona_id] || BIBLES.cara}\n\nWINNING TEST:\n${JSON.stringify(test)}\n\nPERFORMANCE:\n${JSON.stringify(metrics)}\n\nINSTRUCTIONS:\n1. Identify the winning mechanism, not just the topic.\n2. Preserve the strongest hook architecture and audience psychology.\n3. Introduce controlled variation in opening, scene, pacing, wording, product moment and visual treatment.\n4. Avoid changing ten variables at once. Each variation should feel like a deliberate test.\n5. Keep the creator's identity recognisable.\n6. Keep product claims strictly within supplied facts.\n7. Include exact TikTok caption, on-image copy and production-ready JSON prompts.\n8. Keep the subtle bio/Fanvue background funnel unchanged: never make the product post into an overt Fanvue promotion.\n\nReturn JSON only: {"tests":[{"id":"T1","angle":"","hook":"","retention_mechanism":"","follower_reason":"","creator_role":"","product_role":"","script":"","post_caption":"","cta":"","comment_prompt":"","image_generation_prompts":[{"shot":1,"purpose":"","on_image_caption":"","json_prompt":""}],"video_json_prompt":"","bio_strategy":"","why_this_should_work":""}]}`;
      const userPrompt = `Generate exactly 10 variations for ${person.name}. Product: ${product.name || productName}. Problem: ${product.problem || problem}. Verified facts: ${product.proof || proof}. Winning test and performance are provided above. The output must be production-ready.`;
      const jobId = await queueQwen({ title: `Commerce Winner Expansion · ${person.name} · ${product.name || productName}`, persona: row.persona_id, systemPrompt, userPrompt });
      const parsed = parseJson(await waitQwen(jobId, setMessage));
      const generated = Array.isArray(parsed.tests) ? parsed.tests.slice(0, 10) : [];
      const saved = [];
      for (let i = 0; i < generated.length; i += 1) saved.push(await persistTest(generated[i], i, { expansion_of: row.id, generated_at: new Date().toISOString() }));
      setTests((current) => [...saved, ...current]);
      setMessage(`${saved.length} follow-on variations saved from the winner.`);
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: 26, fontFamily: "Inter,system-ui,sans-serif" }}>
      <div style={shell}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "#d9a43c", fontWeight: 900 }}>Track B · Commerce Test</div>
          <h1 style={{ margin: "7px 0 5px", fontSize: 34, letterSpacing: "-.05em" }}>Product → Hook → UGC → Test → Winner</h1>
          <p style={{ ...muted, maxWidth: 930, margin: 0 }}>Qwen is the commerce brain. It writes the hook, retention mechanism, follower reason, script, TikTok caption, on-image copy and production-ready JSON prompts before media generation.</p>
        </div>

        <section style={card}>
          <div style={title}>1. Select creator</div>
          <div style={grid3}>{PEOPLE.map((p) => <button key={p.id} type="button" onClick={() => setPersona(p.id)} style={persona === p.id ? activeCard : cardButton}><div style={{ fontWeight: 900 }}>{p.name}</div><div style={mutedSmall}>{p.description}</div></button>)}</div>
        </section>

        <section style={card}>
          <div style={title}>2. Product</div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 230px", gap: 12 }}>
            <div>
              <label style={label}>Saved product<select value={productId} onChange={(e) => loadProduct(e.target.value)} style={input}><option value="">New product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.commission ? ` · ${p.commission}` : ""}</option>)}</select></label>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginTop: 10 }}><input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" style={input} /><input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="Price" style={input} /><input value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="Commission" style={input} /></div>
              <input value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="TikTok Shop/product URL" style={{ ...input, marginTop: 10 }} />
            </div>
            <div><button type="button" onClick={saveProduct} style={{ ...primary, width: "100%" }}>Save Product</button>{selectedProduct && <div style={{ marginTop: 10, ...muted, border: "1px solid #252a39", borderRadius: 10, padding: 10 }}>Saved: <b style={{ color: "#fff" }}>{selectedProduct.name}</b><br />Commission: {selectedProduct.commission || "—"}</div>}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}><textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="Problem it solves — use the customer's actual language where possible" rows={4} style={textarea} /><textarea value={proof} onChange={(e) => setProof(e.target.value)} placeholder="Verified facts / proof / seller details. Leave blank rather than invent." rows={4} style={textarea} /></div>
        </section>

        <section style={card}>
          <div style={title}>3. Build the test</div>
          <div style={grid3}><label style={label}>Objective<select value={objective} onChange={(e) => setObjective(e.target.value)} style={input}>{OBJECTIVES.map((x) => <option key={x}>{x}</option>)}</select></label><label style={label}>Format<select value={format} onChange={(e) => setFormat(e.target.value)} style={input}>{FORMATS.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label><label style={label}>Variations<select value={count} onChange={(e) => setCount(e.target.value)} style={input}><option value="1">1</option><option value="5">5</option><option value="10">10</option></select></label></div>
          <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "#121521", border: "1px solid #262c3c", color: "#aeb6c6", fontSize: 12, lineHeight: 1.55 }}>{FORMATS.find((x) => x[0] === format)?.[2]}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 10, padding: 12, border: `1px solid ${fanvueBackground ? "#7c5cff" : "#2a3040"}`, background: fanvueBackground ? "rgba(124,92,255,.08)" : "#10131a", borderRadius: 10 }}><div><b style={{ fontSize: 12 }}>Background Fanvue funnel</b><div style={mutedSmall}>Keep it in the bio. Do not hard-sell it in TikTok Shop posts.</div></div><button type="button" onClick={() => setFanvueBackground((v) => !v)} style={fanvueBackground ? activePill : pill}>{fanvueBackground ? "ON" : "OFF"}</button></div>
          <textarea value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Optional: exact hook, situation, trend, product angle, reference or test you want Qwen to explore" rows={3} style={{ ...textarea, marginTop: 10 }} />
          <button type="button" disabled={busy} onClick={generateTests} style={{ ...primary, marginTop: 12, padding: "12px 18px" }}>{busy ? "Qwen is working…" : `Generate ${count} Commerce Test${count === "1" ? "" : "s"}`}</button>
        </section>

        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><div style={title}>4. Test board</div><div style={muted}>Every test is saved. Enter performance after posting; when one wins, generate ten more from its exact mechanism.</div></div></div>
          {!tests.length && <div style={{ padding: 24, textAlign: "center", border: "1px dashed #2a3040", borderRadius: 12, color: "#626b7e" }}>Your commerce tests will appear here.</div>}
          <div style={{ display: "grid", gap: 16, marginTop: 14 }}>
            {tests.map((row, index) => {
              const test = notesOf(row).commerce_test || {};
              const savedMetrics = metricsFromNotes(row);
              const score = ratios(savedMetrics);
              const fanvue = notesOf(row).fanvue_background;
              return <article key={row.id || index} style={{ border: row.status === "winner" ? "1px solid #d4af37" : "1px solid #2a3040", borderRadius: 14, padding: 16, background: "#10131a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div><div style={{ color: "#d9a43c", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>TEST · {row.persona_name} · {row.platform}</div><h2 style={{ margin: "6px 0", fontSize: 20 }}>{test.hook || row.hook || "Hook"}</h2><div style={mutedSmall}>{test.angle || ""}</div></div><div style={{ fontSize: 10, color: row.status === "winner" ? "#f7d77b" : "#7c8497", textTransform: "uppercase", fontWeight: 900 }}>{row.status || "draft"}</div></div>
                <div style={{ ...statGrid, marginTop: 12 }}><Info label="Retention" value={test.retention_mechanism} /><Info label="Follower reason" value={test.follower_reason} /><Info label="Creator role" value={test.creator_role} /><Info label="Product role" value={test.product_role} /></div>
                <div style={twoCol}><Box title="Script" value={test.script} /><Box title="TikTok caption" value={test.post_caption} copy={() => copy(test.post_caption)} /><Box title="CTA" value={test.cta} /><Box title="Comment prompt" value={test.comment_prompt} /></div>
                <div style={{ marginTop: 12 }}><div style={section}>Production prompts</div>{(test.image_generation_prompts || []).map((shot, shotIndex) => <div key={`${row.id}-shot-${shot.shot || shotIndex}`} style={{ border: "1px solid #252a39", borderRadius: 10, padding: 12, background: "#0c0f15", marginTop: 8 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b style={{ color: "#fff" }}>Shot {shot.shot || shotIndex + 1}</b><button type="button" onClick={() => copy(shot.json_prompt)} style={button}>Copy JSON</button></div><div style={{ marginTop: 8, fontSize: 11, color: "#d7dde8" }}>On-image caption: <b>{shot.on_image_caption || "—"}</b></div><pre style={pre}>{shot.json_prompt || "—"}</pre></div>)}</div>
                {test.video_json_prompt && <div style={{ marginTop: 12 }}><Box title="Video JSON prompt" value={test.video_json_prompt} copy={() => copy(test.video_json_prompt)} /></div>}
                <div style={{ marginTop: 12 }}><Box title="Bio / Fanvue background strategy" value={test.bio_strategy || (fanvue ? "Background funnel ON: keep the destination in bio; do not mention it in the product post." : "Background funnel OFF")} /></div>
                <div style={{ marginTop: 14, borderTop: "1px solid #252a39", paddingTop: 14 }}><div style={section}>Performance</div><div style={{ display: "grid", gridTemplateColumns: "repeat(8,minmax(70px,1fr))", gap: 7 }}>{Object.keys(EMPTY_METRICS).map((key) => <label key={key} style={{ ...label, fontSize: 8 }}>{key}<input id={`${row.id}-${key}`} defaultValue={savedMetrics[key]} placeholder="0" style={{ ...input, padding: "8px 7px", fontSize: 11 }} /></label>)}</div><div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}><span style={mutedSmall}>CTR <b style={{ color: "#fff" }}>{score.ctr}%</b></span><span style={mutedSmall}>Click→Order <b style={{ color: "#fff" }}>{score.conversion}%</b></span><span style={mutedSmall}>Commission <b style={{ color: "#fff" }}>£{score.revenue.toFixed(2)}</b></span><button type="button" disabled={busy} onClick={() => { const next = {}; Object.keys(EMPTY_METRICS).forEach((k) => { next[k] = document.getElementById(`${row.id}-${k}`)?.value || ""; }); saveMetrics(row, next, false); }} style={button}>Save Results</button><button type="button" disabled={busy} onClick={() => { const next = {}; Object.keys(EMPTY_METRICS).forEach((k) => { next[k] = document.getElementById(`${row.id}-${k}`)?.value || ""; }); saveMetrics(row, next, true); }} style={primary}>Mark Winner</button>{row.status === "winner" && <button type="button" disabled={busy} onClick={() => makeMoreLike(row)} style={primary}>MAKE 10 MORE LIKE THIS</button>}</div></div>
              </article>;
            })}
          </div>
        </section>
      </div>
      {message && <div style={{ position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)", background: "#151a24", border: "1px solid #2e3646", color: "#e8edf5", borderRadius: 999, padding: "10px 15px", fontSize: 11.5, fontWeight: 700, zIndex: 200, maxWidth: "90vw", textAlign: "center" }}>{message}</div>}
    </div>
  );
}

const styles = {};
const cardButton = { ...button, textAlign: "left", minHeight: 68 };
const activeCard = { ...cardButton, borderColor: "#d4af37", background: "rgba(212,175,55,.12)", color: "#fff" };
const pill = { ...button, borderRadius: 999, minWidth: 62 };
const activePill = { ...primary, borderRadius: 999, minWidth: 62 };
const mutedSmall = { color: "#838ca0", fontSize: 11, lineHeight: 1.45, marginTop: 4 };
const hint = { marginTop: 10, padding: 12, borderRadius: 10, background: "#121521", border: "1px solid #262c3c", color: "#aeb6c6", fontSize: 12, lineHeight: 1.55 };
const savedBox = { marginTop: 10, border: "1px solid #252a39", borderRadius: 10, padding: 10, color: "#9ca6b8", fontSize: 11, lineHeight: 1.5 };
const statGrid = { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 };
const page = { minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: 26, fontFamily: "Inter,system-ui,sans-serif" };
const eyebrow = { fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "#d9a43c", fontWeight: 900 };
const h1 = { margin: "7px 0 5px", fontSize: 34, letterSpacing: "-.05em" };
