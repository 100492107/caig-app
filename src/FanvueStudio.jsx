import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";

const GBP_PER_USD = 0.737;
const DISCLOSURE = "Cara is the dedicated demonstration model of Cornerstone AI Assets. Every client asset maps onto private, unique reference weights — ensuring their content remains consistently them, not us.";
const PURPOSES = [
  ["personal", "Personal post"],
  ["photo_set", "Photo set"],
  ["personality", "Personality"],
  ["interaction", "Interaction"],
  ["tease", "Tease"],
  ["behind", "Behind the scenes"],
];
const MOODS = ["dry / funny", "soft / unguarded", "quietly proud", "tough-love", "tired-but-showed-up"];

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("AI returned invalid JSON");
}

async function ask(system, user) {
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user, maxTokens: 5000 }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || "AI request failed");
  return d.text;
}

const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 9, padding: 10 };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 9, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };

export default function FanvueStudio() {
  const [mood, setMood] = useState(MOODS[0]);
  const [purpose, setPurpose] = useState("personal");
  const [seed, setSeed] = useState("");
  const [context, setContext] = useState("");
  const [concepts, setConcepts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const purposeLabel = useMemo(() => PURPOSES.find(([id]) => id === purpose)?.[1] || purpose, [purpose]);

  async function generateConcepts() {
    setBusy(true);
    setMessage("Building six Fanvue-specific concepts…");
    try {
      const system = `You are the private-page creative director for Cara Whitmore. This is the Fanvue track only. Keep it adult, non-explicit, intimate, personality-led and subscriber-focused. Do not fabricate personal experiences, claims, locations or product use. Cara is direct, dry, disciplined, British, funny and sometimes quietly vulnerable. Vary the emotional register. Return JSON only.\n\nThe page must feel like a real person sharing a moment with subscribers, not public Instagram filler.\n\nRequired disclosure on every final caption: ${DISCLOSURE}`;
      const user = `PURPOSE: ${purposeLabel}\nMOOD: ${mood}\nIDEA SEED: ${seed || "Let the director find a specific everyday moment."}\nKNOWN CONTEXT: ${context || "None supplied."}\n\nReturn exactly {"concepts":[...]} with 6 objects. Each object: {id,title,hook,scene,caption_direction,visual_direction,why_subscribers_care,cta}. Make all six materially different.`;
      const out = parseJson(await ask(system, user));
      if (!Array.isArray(out.concepts) || out.concepts.length !== 6) throw new Error("Fanvue director must return six concepts.");
      setConcepts(out.concepts);
      setMessage("Six Fanvue concepts ready. Choose one to create the image.");
    } catch (e) {
      setMessage(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function generateImage(concept) {
    setBusy(true);
    setMessage(`Creating Cara's Fanvue scene with Grok Imagine…`);
    try {
      const prompt = `${concept.visual_direction || concept.scene || "A candid private-page lifestyle photograph"}. Cara Whitmore. This is Fanvue private-page content, adult and non-explicit. Use the existing Cara identity references exactly. The scene should feel intimate and personal without sexual explicitness: believable wardrobe, natural posture, lived-in environment, candid phone photography, real skin texture, small imperfections, natural eye line, ordinary details, no glossy advertising look, no beauty-filter skin, no generic influencer pose. ${concept.scene || ""}`;
      const r = await fetch("/api/generate-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: prompt,
          photo_idea: concept.scene,
          hook: concept.hook,
          caption: concept.caption_direction,
          photoDirection: concept.visual_direction,
          personaId: "cara",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || d?.detail || "Fanvue image generation failed");

      let imageUrl = null;
      const deadline = Date.now() + 3 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 4500));
        const p = await fetch("/api/generate-poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id: d.requestId, type: "image", status_url: d.statusUrl, result_url: d.resultUrl }),
        });
        const status = await p.json();
        if (status.status === "COMPLETED") { imageUrl = status.imageUrl || status.url; break; }
        if (status.status === "FAILED") throw new Error(status.error || "Fanvue image generation failed");
        setMessage(`Grok image generation: ${status.status}`);
      }
      if (!imageUrl) throw new Error("Fanvue image generation timed out.");

      const caption = `${concept.caption_direction || ""}\n\n${DISCLOSURE}`.trim();
      const id = crypto?.randomUUID?.() || `fanvue_${Date.now()}`;
      const { error } = await supabase.from("content_queue").upsert({
        id,
        persona_id: "cara",
        persona_name: "Cara",
        platform: "fv_page",
        status: "draft",
        pillar: purpose,
        hook: concept.hook || "",
        caption,
        hashtags: "",
        cta: concept.cta || null,
        photo_direction: concept.visual_direction || null,
        photo_idea: concept.scene || null,
        post_type: "fanvue_photo",
        content_label: "Fanvue · Creative Engine",
        image_url: imageUrl,
        image_urls: null,
        video_url: null,
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: new Date().toTimeString().slice(0, 5),
        notes: JSON.stringify({ fanvueMode: true, concept, mood, purpose }),
      }, { onConflict: "id" });
      if (error) throw new Error(`Could not save Fanvue draft: ${error.message}`);
      setMessage("Fanvue image generated and saved to the content queue.");
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setMessage(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return <div style={{ minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 32px 72px", fontFamily: "Inter,system-ui,sans-serif" }}>
    <div style={{ maxWidth: 1200, margin: "0 auto 18px" }}>
      <div style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 10, color: "#d4af37", fontWeight: 800 }}>CornerstoneAIAssets · Fanvue</div>
      <h1 style={{ margin: "8px 0 5px", fontSize: 34, letterSpacing: "-.04em" }}>Fanvue Studio</h1>
      <p style={{ margin: 0, color: "#7f8798", fontSize: 12 }}>Dedicated private-page creative workflow. Non-explicit, personality-led, reference-locked.</p>
    </div>
    <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 16 }}>
      <section style={card}>
        <b>Brief</b>
        <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Purpose<select style={input} value={purpose} onChange={(e) => setPurpose(e.target.value)}>{PURPOSES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Mood<select style={input} value={mood} onChange={(e) => setMood(e.target.value)}>{MOODS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Idea seed<input style={input} value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="e.g. didn't want to train today but did anyway" /></label>
        <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Known context<textarea rows={7} style={{ ...input, resize: "vertical" }} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Real details you want the director to use." /></label>
        <button type="button" style={{ ...primary, width: "100%", marginTop: 14 }} onClick={generateConcepts} disabled={busy}>{busy ? "Working…" : "Generate 6 Fanvue concepts"}</button>
        {message && <div style={{ color: "#cbd1dd", fontSize: 11, marginTop: 12 }}>{message}</div>}
      </section>
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b>Concepts</b><span style={{ color: "#7f8798", fontSize: 10 }}>Cara identity references are applied server-side.</span></div>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {concepts.map((c, i) => <article key={c.id || i} style={{ border: "1px solid #252a39", borderRadius: 12, padding: 12, background: "#0a0c12" }}>
            <div style={{ color: "#d4af37", fontSize: 10, fontWeight: 800 }}>TEST {i + 1} · {mood}</div>
            <div style={{ fontWeight: 900, fontSize: 16, marginTop: 4 }}>{c.title}</div>
            <div style={{ color: "#cbd1dd", fontSize: 11, marginTop: 6 }}><b>Hook:</b> {c.hook}</div>
            <div style={{ color: "#7f8798", fontSize: 11, marginTop: 6 }}>{c.scene}</div>
            <div style={{ color: "#7f8798", fontSize: 11, marginTop: 6 }}>{c.why_subscribers_care}</div>
            <button type="button" style={{ ...button, marginTop: 10 }} onClick={() => generateImage(c)} disabled={busy}>Generate Fanvue image</button>
          </article>)}
          {!concepts.length && <div style={{ color: "#7f8798", fontSize: 12, padding: 20, textAlign: "center" }}>Generate the concepts on the left first.</div>}
        </div>
      </section>
    </div>
  </div>;
}
