import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";

const MODEL = "mlx-community/Qwen3-8B-4bit";
const PEOPLE = [
  { id: "cara", name: "Cara", desc: "Direct, dry, disciplined, British." },
  { id: "lila", name: "Lila", desc: "Warm, measured, observant, understated." },
  { id: "cara_lila", name: "Cara + Lila", desc: "Two distinct voices, chemistry and contrast." },
];
const OBJECTIVES = ["Sell", "Discover", "Test Hook", "Build Demand"];
const FORMATS = [
  ["problem_solution", "Problem / Solution", "Pain → discovery → demonstration → payoff"],
  ["talking_ugc", "Talking UGC", "Mid-thought creator speech with the product woven in"],
  ["reaction", "Reaction", "A real reaction with a reason to care"],
  ["slideshow", "Slideshow", "5–7 swipeable frames, each earning the next"],
  ["before_after", "Before / After", "Observable contrast without fabricated claims"],
  ["grwm", "GRWM", "Product naturally enters a real routine"],
  ["story", "Story", "Specific problem → discovery → payoff"],
  ["comparison", "Comparison", "Useful A/B or old-way vs new-way contrast"],
];
const BIBLES = {
  cara: "Cara is an adult fictional British creator. Direct, dry, disciplined and practical. Public Cara is never a salesperson. Products appear because she is doing something, solving something or reacting to something. Language is concrete and understated.",
  lila: "Lila is an adult fictional creator. Warm, measured, observant and understated. She is beauty/lifestyle oriented but dislikes hype, forced praise and obvious selling. Products belong inside realistic routines, discoveries and small observations.",
  cara_lila: "Cara and Lila are separate adult fictional creators. Cara reacts faster and challenges things. Lila observes first and is more precise. Commerce content should use chemistry and contrast rather than merged voices or duplicated reactions.",
};
const ADAPTATIONS = [
  "adapt the emotional mechanism, never another creator's wording or identity",
  "flip a proven framing when the opposite angle creates tension",
  "borrow comparison/ranking structures from unrelated categories",
  "borrow confession/storytime structures when the product fits the emotional trigger",
  "use participation mechanics only when the audience has the same emotional stake",
  "test creator-first hooks before product-first hooks",
];
const styles = {
  page: { minHeight: "100vh", background: "radial-gradient(circle at 90% 0%,rgba(212,175,55,.07),transparent 28%),#090b10", color: "#fff" },
  shell: { maxWidth: 1400, margin: "0 auto", padding: "28px 28px 80px" },
  panel: { background: "linear-gradient(180deg,#121620 0%,#0d1017 100%)", border: "1px solid #252b3a", borderRadius: 22, boxShadow: "0 18px 60px rgba(0,0,0,.24)" },
  input: { width: "100%", boxSizing: "border-box", background: "#0b0e14", color: "#f2f4f8", border: "1px solid #2b3242", borderRadius: 12, padding: "11px 12px" },
  button: { background: "#151a24", color: "#eef2f7", border: "1px solid #2b3242", borderRadius: 12, padding: "9px 12px", fontWeight: 800, cursor: "pointer" },
  primary: { background: "linear-gradient(135deg,#e7c75a,#c69b27)", color: "#08090b", border: "none", borderRadius: 14, padding: "13px 18px", fontWeight: 950, cursor: "pointer" },
  label: { display: "grid", gap: 7, fontSize: 10, fontWeight: 900, color: "#aab3c4", letterSpacing: ".08em", textTransform: "uppercase" },
};

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/gi, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned no JSON result.");
  const opener = clean[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0, quote = false, escaped = false;
  for (let i = start; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quote = false;
    } else if (ch === '"') quote = true;
    else if (ch === opener) depth += 1;
    else if (ch === closer) {
      depth -= 1;
      if (depth === 0) return JSON.parse(clean.slice(start, i + 1));
    }
  }
  throw new Error("Qwen returned incomplete JSON.");
}

async function queueQwen({ title, persona, systemPrompt, userPrompt }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title,
    job_type: "commerce_test",
    model: MODEL,
    persona_id: persona,
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    options: { max_tokens: 11000, temperature: 0.58, top_p: 0.9 },
    status: "queued",
    production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function waitQwen(jobId, setMessage) {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const { data, error } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", jobId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Qwen job disappeared from the queue.");
    if (data.status === "completed") return data.result || "";
    if (data.status === "error") throw new Error(data.error_message || "Qwen failed.");
    setMessage(`Qwen is thinking → ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}

function copy(text, setMessage) {
  navigator.clipboard?.writeText(String(text || ""));
  setMessage("Copied.");
}

function PromptBlock({ title, value, onCopy }) {
  return <div style={{ background: "#090c11", border: "1px solid #1f2634", borderRadius: 12, padding: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b style={{ fontSize: 11 }}>{title}</b><button onClick={onCopy} style={{ ...styles.button, padding: "6px 9px", fontSize: 10 }}>Copy</button></div>
    <pre style={{ whiteSpace: "pre-wrap", color: "#aeb7c6", fontSize: 10, lineHeight: 1.6, margin: "8px 0 0", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" }}>{value || "—"}</pre>
  </div>;
}

function Info({ label, value }) {
  return <div style={{ background: "#0b0f16", border: "1px solid #202737", borderRadius: 12, padding: 11 }}><div style={{ color: "#677186", fontSize: 9, textTransform: "uppercase", fontWeight: 900, letterSpacing: ".08em" }}>{label}</div><div style={{ marginTop: 6, fontSize: 11, color: "#cbd2de", lineHeight: 1.5 }}>{value || "—"}</div></div>;
}

function loadProducts() {
  try { return JSON.parse(localStorage.getItem("caig_commerce_products") || "[]"); } catch { return []; }
}

export default function CommerceTestWorkspace() {
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
  const [products, setProducts] = useState(loadProducts);
  const [tests, setTests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selectedProduct = useMemo(() => products.find((p) => p.id === productId) || null, [products, productId]);

  function loadProduct(id) {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setProductName(product.name || ""); setProductUrl(product.url || ""); setProductPrice(product.price || ""); setCommission(product.commission || ""); setProblem(product.problem || ""); setProof(product.proof || "");
  }

  function saveProduct() {
    if (!productName.trim()) { setMessage("Add a product name first."); return; }
    const product = { id: productId || crypto.randomUUID(), name: productName.trim(), url: productUrl.trim(), price: productPrice.trim(), commission: commission.trim(), problem: problem.trim(), proof: proof.trim() };
    const next = [product, ...products.filter((p) => p.id !== product.id)];
    localStorage.setItem("caig_commerce_products", JSON.stringify(next));
    setProducts(next); setProductId(product.id); setMessage("Product saved.");
  }

  async function generate() {
    if (!productName.trim()) { setMessage("Add a product before generating."); return; }
    setBusy(true); setTests([]); setMessage("Qwen is building commerce concepts…");
    try {
      const person = PEOPLE.find((p) => p.id === persona) || PEOPLE[0];
      const formatMeta = FORMATS.find((f) => f[0] === format) || FORMATS[0];
      const systemPrompt = `You are CornerstoneAIAssets' senior commerce creative director. Combine TikTok-native UGC strategy, audience psychology, creator direction, retention editing, product positioning, trust and conversion judgement. You are not a generic affiliate copywriter.\n\nCREATOR SOURCE:\n${BIBLES[persona]}\n\nJOB:\nThe creator is the reason to follow. The product is the reason to click. A winning post must be enjoyable even if the viewer never buys.\n\nCREATIVE ORDER:\nCustomer emotion → creator angle → proven/adapted format → hook → retention → believable demonstration → product payoff → earned CTA.\n\nFORMAT ADAPTATION:\n${ADAPTATIONS.join(" | ")}. Never copy another creator's wording, identity, exact script or distinctive execution.\n\nFACTUALITY:\nNever invent product facts, prices, specs, testimonials, reviews, discounts, health claims, orders or personal experiences. If proof is not supplied, design an observable demonstration and label uncertain claims as unverified.\n\nUGC REALISM:\nStart mid-thought where useful. Use ordinary phone framing, plausible body language, realistic environments and one main action. Avoid polished commercial cadence unless the format calls for it.\n\nANTI-SLOP:\nReject generic influencer language, fake enthusiasm, random luxury scenes, unexplained props, perfect posing, plastic skin, meaningless cuts, unsupported claims and captions written like an ad agency.\n\nCONVERSION:\nThe product should enter when it solves the problem, not necessarily in the first sentence. The CTA must feel like the natural next step.\n\nBATCH INTELLIGENCE:\nAcross ${count} concepts, vary emotional angle, hook, scene, creator behaviour and format execution. Do not make five rewrites of one ad.\n\nReturn JSON only.`;
      const userPrompt = `CREATOR: ${person.name}\nPRODUCT: ${productName.trim()}\nPRODUCT URL: ${productUrl.trim() || "not supplied"}\nPRICE: ${productPrice.trim() || "not supplied"}\nCOMMISSION: ${commission.trim() || "not supplied"}\nCUSTOMER PROBLEM: ${problem.trim() || "not supplied"}\nVERIFIED FACTS/PROOF: ${proof.trim() || "none supplied"}\nOBJECTIVE: ${objective}\nFORMAT: ${formatMeta[1]} — ${formatMeta[2]}\nVARIATIONS: ${count}\nEXTRA DIRECTION: ${direction.trim() || "none"}\n\nInternally score candidates on stop power, problem clarity, creator fit, retention, product integration, trust, conversion potential and visual believability. Discard weak concepts before returning survivors.\n\nReturn exactly {"tests":[{"id":"T1","angle":"","audience_emotion":"","hook":"","retention_mechanism":"","problem":"","creator_role":"","product_role":"","script":"","post_caption":"","on_image_caption":"","cta":"","comment_prompt":"","image_generation_prompts":[{"shot":1,"purpose":"","on_image_caption":"","json_prompt":""}],"video_json_prompt":"","why_this_should_work":"","quality_gate":"PASS"}]}\n\nFor slideshows use 5–7 coherent slides. For other formats provide only necessary visual prompts. Every json_prompt must be production-ready JSON-stringified direction with identity, environment, wardrobe, action, camera, framing, lighting, product placement, continuity, realism constraints and negative constraints.`;
      const jobId = await queueQwen({ title: `Commerce Studio · ${person.name} · ${productName.trim()}`, persona, systemPrompt, userPrompt });
      const parsed = parseJson(await waitQwen(jobId, setMessage));
      const generated = Array.isArray(parsed.tests) ? parsed.tests : [];
      if (!generated.length) throw new Error("Qwen returned no commerce tests.");
      setTests(generated); setMessage(`${generated.length} curated commerce concepts ready.`);
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  return <div style={styles.page}>
    <div style={styles.shell}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: "#d4af37", fontSize: 11, fontWeight: 950, letterSpacing: ".14em", textTransform: "uppercase" }}>Track B / Commerce Studio</div>
        <h1 style={{ fontSize: "clamp(32px,4vw,52px)", lineHeight: 1, margin: "10px 0", letterSpacing: "-.04em" }}>Turn creator attention into purchases.</h1>
        <p style={{ maxWidth: 780, color: "#9ba5b7", fontSize: 14, lineHeight: 1.65, margin: 0 }}>Qwen treats creator identity, audience psychology, product truth and conversion as one system. The output remains model-ready JSON, so Cornerstone can render it with whichever production stack you choose.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px,400px) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
        <aside style={{ ...styles.panel, padding: 20, position: "sticky", top: 18 }}>
          <div style={{ color: "#7f899c", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 900 }}>Commerce brief</div>
          <div style={{ display: "grid", gap: 15, marginTop: 16 }}>
            <div><div style={{ fontSize: 12, color: "#788397", marginBottom: 8 }}>Creator</div><div style={{ display: "grid", gap: 8 }}>{PEOPLE.map((p) => <button key={p.id} onClick={() => setPersona(p.id)} style={{ ...styles.button, textAlign: "left", background: persona === p.id ? "linear-gradient(135deg,rgba(212,175,55,.18),rgba(212,175,55,.05))" : "#10141d", borderColor: persona === p.id ? "#9c7b2c" : "#2b3242" }}><b>{p.name}</b><div style={{ color: "#818b9d", fontSize: 11, marginTop: 4 }}>{p.desc}</div></button>)}</div></div>
            <label style={styles.label}>Saved product<select value={productId} onChange={(e) => loadProduct(e.target.value)} style={styles.input}><option value="">New product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.commission ? ` · ${p.commission}` : ""}</option>)}</select></label>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}><input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product" style={styles.input} /><input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="Price" style={styles.input} /><input value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="Comm." style={styles.input} /></div>
            <input value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="TikTok Shop / product URL" style={styles.input} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="Customer's real problem / language" rows={4} style={{ ...styles.input, resize: "vertical" }} /><textarea value={proof} onChange={(e) => setProof(e.target.value)} placeholder="Verified product facts / proof only" rows={4} style={{ ...styles.input, resize: "vertical" }} /></div>
            <button onClick={saveProduct} style={{ ...styles.button, width: "100%" }}>Save product to Commerce Library</button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><label style={styles.label}>Objective<select value={objective} onChange={(e) => setObjective(e.target.value)} style={styles.input}>{OBJECTIVES.map((o) => <option key={o}>{o}</option>)}</select></label><label style={styles.label}>Format<select value={format} onChange={(e) => setFormat(e.target.value)} style={styles.input}>{FORMATS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
            <label style={styles.label}>Batch size<select value={count} onChange={(e) => setCount(e.target.value)} style={styles.input}><option value="1">1 concept</option><option value="5">5 concepts</option><option value="10">10 concepts</option></select></label>
            <textarea value={direction} onChange={(e) => setDirection(e.target.value)} rows={4} placeholder="Optional angle, customer language, trend or reference" style={{ ...styles.input, resize: "vertical" }} />
            <button disabled={busy} onClick={generate} style={{ ...styles.primary, width: "100%", opacity: busy ? .65 : 1 }}>{busy ? "Qwen is thinking…" : "Generate commerce batch"}</button>
            {selectedProduct && <div style={{ fontSize: 11, color: "#778297" }}>Loaded: <b style={{ color: "#cdd3de" }}>{selectedProduct.name}</b></div>}
          </div>
        </aside>

        <main>
          <div style={{ ...styles.panel, padding: 18, marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><div style={{ color: "#d4af37", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 950 }}>Qwen commerce intelligence</div><div style={{ fontWeight: 900, marginTop: 4 }}>Creator → emotion → product truth → proof → conversion</div></div><div style={{ color: "#657085", fontSize: 11 }}>Affiliate-first · renderer agnostic</div></div>
          {!tests.length && <div style={{ ...styles.panel, padding: 46, textAlign: "center", minHeight: 360, display: "grid", placeItems: "center" }}><div><div style={{ fontSize: 42, marginBottom: 12 }}>◈</div><h2 style={{ margin: 0, fontSize: 22 }}>No commerce concepts yet.</h2><p style={{ maxWidth: 510, margin: "10px auto 0", color: "#798498", lineHeight: 1.6 }}>Add one real product and the customer's actual problem. Qwen will do the creative strategy and return the full production package.</p></div></div>}
          <div style={{ display: "grid", gap: 14 }}>{tests.map((test, index) => <article key={test.id || index} style={{ ...styles.panel, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div><div style={{ color: "#788397", fontSize: 10, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase" }}>Concept {index + 1} · {test.angle || "Commerce test"}</div><h2 style={{ fontSize: 24, lineHeight: 1.12, margin: "6px 0 0", letterSpacing: "-.025em" }}>{test.hook}</h2></div><button onClick={() => copy(JSON.stringify(test, null, 2), setMessage)} style={styles.button}>Copy JSON</button></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 14 }}><Info label="Emotion" value={test.audience_emotion} /><Info label="Retention" value={test.retention_mechanism} /><Info label="Creator role" value={test.creator_role} /><Info label="Product role" value={test.product_role} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 12, marginTop: 12 }}><div style={{ background: "#0b0f16", border: "1px solid #202737", borderRadius: 14, padding: 13 }}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", fontWeight: 950 }}>Script</div><div style={{ color: "#d4d9e2", fontSize: 12, lineHeight: 1.65, whiteSpace: "pre-wrap", marginTop: 7 }}>{test.script}</div></div><div style={{ display: "grid", gap: 12 }}><div style={{ background: "#0b0f16", border: "1px solid #202737", borderRadius: 14, padding: 13 }}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", fontWeight: 950 }}>TikTok caption</div><div style={{ color: "#d4d9e2", fontSize: 12, lineHeight: 1.55, marginTop: 7 }}>{test.post_caption || "—"}</div></div><div style={{ background: "#0b0f16", border: "1px solid #202737", borderRadius: 14, padding: 13 }}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", fontWeight: 950 }}>Quality gate</div><div style={{ color: "#78d2ae", fontSize: 12, fontWeight: 900, marginTop: 7 }}>{test.quality_gate || "PASS"}</div><div style={{ color: "#7f899c", fontSize: 11, lineHeight: 1.5, marginTop: 5 }}>{test.why_this_should_work || "—"}</div></div></div></div>
            <details style={{ marginTop: 12 }}><summary style={{ cursor: "pointer", color: "#9ea7b7", fontSize: 11, fontWeight: 800 }}>Production package</summary><div style={{ display: "grid", gap: 10, marginTop: 10 }}><div style={{ background: "#090c11", border: "1px solid #1f2634", borderRadius: 12, padding: 12 }}><div style={{ color: "#788397", fontSize: 9, fontWeight: 900, textTransform: "uppercase" }}>On-image copy</div><div style={{ marginTop: 6, color: "#d7dbe3", fontSize: 12 }}>{test.on_image_caption || "—"}</div></div>{(test.image_generation_prompts || []).map((shot, shotIndex) => <PromptBlock key={shot.shot || shotIndex} title={`Shot ${shot.shot || shotIndex + 1}`} value={shot.json_prompt} onCopy={() => copy(shot.json_prompt, setMessage)} />)}{test.video_json_prompt && <PromptBlock title="Video prompt" value={test.video_json_prompt} onCopy={() => copy(test.video_json_prompt, setMessage)} />}</div></details>
          </article>)}</div>
        </main>
      </div>
      {message && <div style={{ position: "fixed", right: 22, bottom: 22, background: "#141923", color: "#fff", border: "1px solid #30384a", borderRadius: 12, padding: "11px 14px", boxShadow: "0 20px 40px rgba(0,0,0,.3)", fontSize: 12 }}>{message}</div>}
    </div>
  );
}
