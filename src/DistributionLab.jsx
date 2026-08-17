import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "caig_distribution_format_bank_v1";
const DEFAULT_PLATFORMS = ["TikTok", "Instagram", "Facebook", "YouTube Shorts"];
const FORMAT_FAMILIES = [
  "Problem realisation slideshow",
  "Ranked list / countdown",
  "Before / after",
  "Contrarian take",
  "Quiet observation / diary",
  "Creator-led UGC",
  "Screen recording / output-first",
  "Duo conversation / disagreement",
  "Day-in-the-life",
  "Comment-reply / response",
];

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("Gemini returned invalid JSON");
}

async function gemini(system, user, maxTokens = 6000) {
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user, maxTokens }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || `Gemini request failed (${r.status})`);
  return d.text;
}

const card = { background: "#0E1017", border: "1px solid #262C3A", borderRadius: 16, padding: 20 };
const button = { border: "1px solid #303847", background: "#151A24", color: "#F5F7FB", borderRadius: 999, padding: "9px 14px", cursor: "pointer", fontSize: 12, fontWeight: 800 };
const primary = { ...button, borderColor: "#D4AF37", background: "rgba(212,175,55,.12)", color: "#F1C95B" };
const input = { width: "100%", background: "#12161F", color: "#fff", border: "1px solid #2A3140", borderRadius: 10, padding: "10px 12px", fontSize: 13, boxSizing: "border-box" };

function loadBank() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveBank(v) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch {} }

export default function DistributionLab() {
  const [niche, setNiche] = useState("beauty / lifestyle DTC");
  const [product, setProduct] = useState("");
  const [platform, setPlatform] = useState("TikTok");
  const [recentWindow, setRecentWindow] = useState("last 30 days");
  const [formats, setFormats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [winner, setWinner] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mptStatus, setMptStatus] = useState("not checked");
  const [mptHost, setMptHost] = useState("http://127.0.0.1:8080");

  useEffect(() => setFormats(loadBank()), []);
  useEffect(() => { if (formats.length) saveBank(formats); }, [formats]);

  const validated = useMemo(() => formats.filter(x => x.validated), [formats]);
  const winners = useMemo(() => formats.filter(x => x.status === "winner"), [formats]);

  async function discoverFormats() {
    setBusy(true); setMessage("Gemini is turning the current distribution research into a format bank…"); setSelected([]);
    try {
      const system = `You are a senior organic distribution strategist. Build a practical content-format bank, not generic ideas. Use these operating principles: quantity and quality must coexist; study recent winners in the niche; prefer simple formats that blend into the feed; validate a format only when recent examples show meaningful reach and the structure is repeatable across multiple accounts; separate views from conversion; double down on winners; document validated formats so another creator can reproduce them. Never suggest spam, fake engagement, filter evasion, or fabricated results. Return JSON only.`;
      const user = `NICHE: ${niche}\nPRODUCT: ${product || "none"}\nPLATFORM: ${platform}\nRECENCY: ${recentWindow}\n\nReturn {"formats":[...]} with 10 objects. Each object must contain: id,name,family,why_it_can_work,hook_pattern,structure,visual_pattern,caption_pattern,proof_standard,replication_notes,kill_rule,scorecard_fields. Include at least 2 slideshow formats, 1 before/after, 1 contrarian, 1 quiet/observational, 1 creator-led, 1 output-first/screen-recording, and 1 comment-reply. Do not invent specific current viral posts or view counts; instead state what I should verify in the live feed.`;
      const out = parseJson(await gemini(system, user));
      const next = (Array.isArray(out.formats) ? out.formats : []).slice(0, 10).map((x, i) => ({
        ...x,
        id: x.id || `fmt_${Date.now()}_${i}`,
        status: "candidate",
        validated: false,
        variants: [],
        createdAt: new Date().toISOString(),
      }));
      setFormats(prev => [...next, ...prev].slice(0, 100));
      setMessage(`${next.length} candidate formats added. Verify them against the live feed before marking validated.`);
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }

  function toggleSelect(id) { setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }

  function markValidated(id) {
    setFormats(prev => prev.map(x => x.id === id ? { ...x, validated: true, status: x.status === "winner" ? "winner" : "validated" } : x));
  }

  function markWinner(id) {
    setWinner(id);
    setFormats(prev => prev.map(x => x.id === id ? { ...x, validated: true, status: "winner" } : x));
    setMessage("Winner locked. The next move is replication, not a new idea.");
  }

  async function generateVariations() {
    if (!winner) return;
    const base = formats.find(x => x.id === winner);
    if (!base) return;
    setBusy(true); setMessage("Generating five variations around the winning structure…");
    try {
      const system = `You are a performance creative director. A format has won. Do not reinvent it. Create five controlled variations that preserve the winning psychological mechanism, pacing and structural DNA while changing surface details. The goal is learning, not novelty. Never fabricate performance or claims. Return JSON only.`;
      const user = `WINNING FORMAT\n${JSON.stringify(base)}\n\nNICHE\n${niche}\nPRODUCT\n${product || "none"}\n\nReturn {"variations":[...]} with 5 objects. Each must contain: angle_shift,hook,scene,caption_direction,visual_change,what_is_held_constant,what_learning_question_this_tests.`;
      const out = parseJson(await gemini(system, user, 5000));
      const vars = Array.isArray(out.variations) ? out.variations : [];
      setFormats(prev => prev.map(x => x.id === winner ? { ...x, variants: vars } : x));
      setMessage(`Added ${vars.length} winner variations to the content bank.`);
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }

  async function checkMpt() {
    setMptStatus("checking…");
    try {
      const r = await fetch(`${mptHost.replace(/\/$/, "")}/openapi.json`, { method: "GET" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setMptStatus("connected");
      setMessage("MoneyPrinterTurbo API detected. The local video worker is reachable.");
    } catch (e) {
      setMptStatus("not reachable");
      setMessage(`MoneyPrinterTurbo not reachable at ${mptHost}. Start the local API first.`);
    }
  }

  function copyMptCommand() {
    const topic = winner ? (formats.find(x => x.id === winner)?.name || "short-form creative") : "short-form creative test";
    const command = `cd ~/MoneyPrinterTurbo && uv run python cli.py --video-subject ${JSON.stringify(`${topic} for ${niche}`)} --video-language en-US --stop-at video`;
    navigator.clipboard?.writeText(command);
    setMessage("MoneyPrinterTurbo command copied.");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08090D", color: "#EDEFF4", padding: "30px 28px 80px", fontFamily: "Inter,system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}><div style={{ color: "#D4AF37", fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", fontWeight: 800 }}>Distribution Lab</div><h1 style={{ fontSize: 34, letterSpacing: "-.04em", margin: "6px 0" }}>Find what works. Prove it. Multiply it.</h1><p style={{ color: "#8F98AA", fontSize: 13, maxWidth: 760 }}>This is the layer between strategy and publishing: recent format research, validation, winner replication and a production bridge.</p></div>

        <section style={card}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>1 · Discover format families</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <input style={input} value={niche} onChange={e => setNiche(e.target.value)} placeholder="Niche" />
            <input style={input} value={product} onChange={e => setProduct(e.target.value)} placeholder="Product (optional)" />
            <select style={input} value={platform} onChange={e => setPlatform(e.target.value)}>{DEFAULT_PLATFORMS.map(x => <option key={x}>{x}</option>)}</select>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>{FORMAT_FAMILIES.map(x => <span key={x} style={{ border: "1px solid #2B3240", borderRadius: 999, padding: "6px 9px", fontSize: 10, color: "#9BA4B5" }}>{x}</span>)}</div>
          <button style={{ ...primary, marginTop: 14 }} disabled={busy} onClick={discoverFormats}>{busy ? "Researching…" : "Generate 10 candidate formats"}</button>
        </section>

        {message && <div style={{ margin: "12px 0", color: "#F0C95B", fontSize: 12 }}>{message}</div>}

        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div><div style={{ fontSize: 14, fontWeight: 800 }}>2 · Format bank</div><div style={{ color: "#7F899A", fontSize: 11, marginTop: 3 }}>{validated.length} validated · {winners.length} winner · {formats.length} total</div></div>{winner && <button style={button} disabled={busy} onClick={generateVariations}>Generate 5 winner variations</button>}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginTop: 14 }}>
            {formats.map((f) => <article key={f.id} style={{ border: `1px solid ${f.status === "winner" ? "#D4AF37" : "#293140"}`, background: f.status === "winner" ? "rgba(212,175,55,.06)" : "#11151D", borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ color: "#D4AF37", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em" }}>{f.family}</span><span style={{ color: f.status === "winner" ? "#D4AF37" : "#728095", fontSize: 10 }}>{f.status}</span></div>
              <h3 style={{ margin: "8px 0 6px", fontSize: 17 }}>{f.name}</h3>
              <p style={{ color: "#A8B1C2", fontSize: 11, lineHeight: 1.55 }}>{f.why_it_can_work}</p>
              <div style={{ color: "#D9DEE7", fontSize: 11, lineHeight: 1.55 }}><b>Structure:</b> {f.structure}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}><button style={button} onClick={() => toggleSelect(f.id)}>{selected.includes(f.id) ? "Selected" : "Select"}</button>{!f.validated && <button style={button} onClick={() => markValidated(f.id)}>Mark validated</button>}<button style={f.status === "winner" ? primary : button} onClick={() => markWinner(f.id)}>Winner</button></div>
              {f.variants?.length > 0 && <div style={{ marginTop: 12, borderTop: "1px solid #2A3140", paddingTop: 10 }}><div style={{ color: "#D4AF37", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>Winner variants</div>{f.variants.map((v, i) => <div key={i} style={{ color: "#9FA8B8", fontSize: 10, marginBottom: 6 }}>{i + 1}. {v.hook} · {v.learning_question}</div>)}</div>}
            </article>)}
            {!formats.length && <div style={{ color: "#687386", fontSize: 12, padding: 12 }}>No formats yet. Generate the first bank above, then validate them against the live feed.</div>}
          </div>
        </section>

        <section style={card}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>3 · MoneyPrinterTurbo production bridge</div>
          <div style={{ color: "#8F98AA", fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>MoneyPrinterTurbo is the production engine, not the creative director. Use it for suitable short-form/video formats after the creative hypothesis and script are approved.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginTop: 12 }}><input style={input} value={mptHost} onChange={e => setMptHost(e.target.value)} /><button style={button} onClick={checkMpt}>Check API</button></div>
          <div style={{ marginTop: 8, fontSize: 11, color: mptStatus === "connected" ? "#69D3A8" : "#98A1B3" }}>Status: {mptStatus}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}><button style={button} onClick={copyMptCommand}>Copy local MPT command</button><a style={button} href={`${mptHost}/docs`} target="_blank" rel="noreferrer">Open MPT API docs</a></div>
          <div style={{ marginTop: 12, padding: 12, border: "1px solid #27303D", background: "#10141B", borderRadius: 10, color: "#9AA4B6", fontSize: 11, lineHeight: 1.6 }}>Keep high-value Cara/Lila lifestyle creative in the existing image/video pipeline when it needs premium art direction. Use MPT for volume formats where stock footage, narration, captions or screen-recording are the point.</div>
        </section>

        <section style={card}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>4 · Operating rule</div>
          <div style={{ color: "#B9C1CF", fontSize: 13, lineHeight: 1.65, marginTop: 8 }}>A candidate format is not a winner because Gemini says it is good. Verify it against current feeds, validate the structure across multiple accounts, publish enough reps to learn, then judge on conversion and business outcome rather than views alone.</div>
        </section>
      </div>
    </div>
  );
}
