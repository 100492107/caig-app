import React, { useState } from "react";
import { supabase } from "./supabase";

const PEOPLE = [
  { id: "cara", name: "Cara", desc: "Direct, dry, disciplined, British." },
  { id: "lila", name: "Lila", desc: "Warm, measured, observant, understated." },
  { id: "cara_lila", name: "Cara + Lila", desc: "Two distinct personalities, chemistry and contrast." },
];

const FORMATS = [
  ["personal_moment", "Personal moment", "A specific lived moment that makes the creator feel real."],
  ["pov", "POV / relatable", "A sharp observation or situation viewers recognise immediately."],
  ["quick_take", "Quick take", "One opinion, lesson or surprising observation delivered fast."],
  ["story", "Micro-story", "Setup → tension → payoff. Specific, not generic."],
  ["grwm", "GRWM", "Getting ready with a reason to watch: date, work, night out, travel, routine."],
  ["day_in_life", "Day in the life", "A coherent slice of the creator's day with natural movement."],
  ["slideshow", "Photo slideshow", "5–7 swipeable slides with a clear curiosity or identity thread."],
  ["reaction", "Reaction", "A genuine reaction to an idea, situation or relatable discovery."],
];

const BIBLES = {
  cara: `Cara is an adult fictional creator. Direct, dry, disciplined and British. Practical, confident, slightly self-aware. She speaks plainly. Strong worlds: routines, training, style, work, confidence, money mindset, useful discoveries and funny little failures. Her content should feel like a real person caught in an ordinary moment, not a polished influencer advertisement.`,
  lila: `Lila is an adult fictional creator. Warm, measured, observant and understated. Calm rather than loud. She notices small details in rooms, travel, beauty, hair, routines, food and everyday life. Short natural sentences. Her content should feel intimate, composed and believable rather than performative.`,
  cara_lila: `Cara and Lila are two separate adult fictional creators. Cara is direct, dry and disciplined. Lila is warm, measured and observant. Never merge their identities. Duo content should use genuine chemistry, contrast, teasing, shared situations or one noticing something the other misses.`,
};

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned invalid JSON");
  const opener = clean[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0, quote = false, escaped = false;
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

async function queueQwen({ title, persona, systemPrompt, userPrompt }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title,
    job_type: "growth_mode",
    model: "mlx-community/Qwen3-8B-4bit",
    persona_id: persona,
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    options: { max_tokens: 8000, temperature: 0.72 },
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
    setMessage(`Qwen is building follower-growth content… ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}

function copy(text, setMessage) {
  navigator.clipboard?.writeText(String(text || ""));
  setMessage("Copied.");
}

export default function GrowthModeWorkspace() {
  const [persona, setPersona] = useState("cara");
  const [format, setFormat] = useState("personal_moment");
  const [count, setCount] = useState("10");
  const [direction, setDirection] = useState("");
  const [fanvueFunnel, setFanvueFunnel] = useState(true);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    setBusy(true);
    setResults([]);
    setMessage(`Building ${count} growth tests…`);
    try {
      const person = PEOPLE.find((p) => p.id === persona);
      const fmt = FORMATS.find((x) => x[0] === format);
      const systemPrompt = `You are the senior TikTok creator strategist, UGC director, retention editor and follower-growth analyst inside CornerstoneAIAssets.\n\nCREATOR BIBLE:\n${BIBLES[persona]}\n\nMISSION:\nGrow the creator account first. There is NO product and that is intentional. The content must earn followers before TikTok Shop is unlocked. Make strangers stop, watch, relate, comment, save, share and follow. Do not force monetisation into the post. The creator's identity is the product right now.\n\nQUALITY RULES:\n1. Start from a human reason to watch, not from an AI gimmick.\n2. First 1–2 seconds / first slide must be immediately understandable without context.\n3. Build one clear retention mechanism: open loop, curiosity, contrast, escalation, payoff, humour or recognisable tension.\n4. Every concept needs a follower reason: why someone would want more from THIS creator tomorrow.\n5. Specific beats generic. Use real-feeling places, ordinary actions, tiny details, opinions, routines and imperfect moments.\n6. No fake achievements, fabricated facts, invented relationships, invented purchases or fake testimonials.\n7. Do not use generic phrases such as 'you won't believe', 'game changer', 'POV you needed this' unless the specific idea genuinely earns them.\n8. Avoid random luxury backdrops and perfect influencer posing unless the scene itself requires them.\n9. UGC means natural camera behaviour, believable body language, realistic phone framing and useful environmental detail.\n10. For slideshows, every slide earns the next swipe; no filler lists.\n11. Captions should sound like the creator speaking to one person, not a social media manager.\n12. Mix growth mechanics: relatable content, identity/aspiration, humour, useful insight, personal moments and recurring series.\n13. Do not mention TikTok Shop unless the user explicitly asks.\n14. Fanvue funnel: subtle background only. Keep the Fanvue destination in the bio, never hard-sell it in ordinary growth posts. If there is a natural profile-curiosity moment, keep it understated and non-explicit.\n15. The creator is an adult fictional character. Any Fanvue context remains adult, tasteful and non-explicit.\n\nFORMAT:\n${fmt?.[1]}\nFORMAT PURPOSE:\n${fmt?.[2]}\n\nReturn JSON only. No markdown.`;

      const userPrompt = `CREATOR: ${person?.name}\nFORMAT: ${fmt?.[1]}\nVARIATIONS: ${count}\nEXTRA DIRECTION: ${direction.trim() || "none — choose the strongest ideas yourself"}\nBACKGROUND FANVUE FUNNEL: ${fanvueFunnel ? "ON — bio destination exists quietly; never turn ordinary growth content into a Fanvue advert" : "OFF"}\n\nGenerate exactly ${count} materially different follower-growth tests. Return:\n{\"tests\":[{\"id\":\"G1\",\"series\":\"\",\"hook\":\"\",\"retention_mechanism\":\"\",\"follower_reason\":\"\",\"script\":\"\",\"post_caption\":\"\",\"on_image_caption\":\"\",\"image_generation_prompts\":[{\"shot\":1,\"purpose\":\"\",\"on_image_caption\":\"\",\"json_prompt\":\"\"}],\"video_json_prompt\":\"\",\"comment_prompt\":\"\",\"fanvue_profile_note\":\"\",\"why_this_should_work\":\"\"}]}\n\nFor video-led formats, include 1–3 production-ready image prompts for source frames/B-roll where useful. For slideshow, use 5–7 coherent slides. Every json_prompt must be a JSON-stringified, production-ready image brief with character identity, environment, wardrobe, action, camera, framing, lighting, realism constraints and negative constraints. Do not put text inside generated images unless explicitly useful; return the exact on-image copy separately. Make the ideas strong enough to post immediately.`;

      const jobId = await queueQwen({ title: `Growth Mode · ${person?.name} · ${fmt?.[1]}`, persona, systemPrompt, userPrompt });
      const parsed = parseJson(await waitQwen(jobId, setMessage));
      const generated = Array.isArray(parsed.tests) ? parsed.tests : [];
      if (!generated.length) throw new Error("Qwen returned no growth tests.");
      setResults(generated);
      setMessage(`${generated.length} follower-growth tests ready.`);
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={page}>
      <div style={shell}>
        <div style={{ marginBottom: 20 }}>
          <div style={eyebrow}>Track B · Growth Mode</div>
          <h1 style={h1}>Grow First. Monetise Second.</h1>
          <p style={mutedLarge}>No product required. This mode is specifically for getting Cara and Lila to the TikTok follower threshold while building a recognisable creator identity. TikTok Shop comes later; the quiet Fanvue destination stays in the bio.</p>
        </div>

        <section style={card}>
          <div style={title}>1. Creator</div>
          <div style={grid3}>{PEOPLE.map((p) => <button key={p.id} onClick={() => setPersona(p.id)} style={persona === p.id ? activeCard : cardButton}><div style={{ fontWeight: 900 }}>{p.name}</div><div style={muted}>{p.desc}</div></button>)}</div>
        </section>

        <section style={card}>
          <div style={title}>2. Growth format</div>
          <div style={grid4}>{FORMATS.map(([id, label, desc]) => <button key={id} onClick={() => setFormat(id)} style={format === id ? activeCard : cardButton}><div style={{ fontWeight: 900 }}>{label}</div><div style={muted}>{desc}</div></button>)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <label style={label}>Variations<select value={count} onChange={(e) => setCount(e.target.value)} style={input}><option value="5">5</option><option value="10">10</option></select></label>
            <label style={label}>Background Fanvue funnel<select value={fanvueFunnel ? "ON" : "OFF"} onChange={(e) => setFanvueFunnel(e.target.value === "ON")} style={input}><option>ON</option><option>OFF</option></select></label>
          </div>
          <textarea value={direction} onChange={(e) => setDirection(e.target.value)} rows={3} placeholder="Optional: a trend, situation, recurring series, topic or vibe you want to test. Leave blank and Qwen chooses." style={{ ...textarea, marginTop: 12 }} />
          <button disabled={busy} onClick={generate} style={{ ...primary, marginTop: 12, padding: "12px 18px" }}>{busy ? "Qwen is working…" : `Generate ${count} Growth Tests`}</button>
        </section>

        <section style={card}>
          <div style={title}>3. Ready-to-post test board</div>
          {!results.length && <div style={empty}>Nothing generated yet. Choose a creator and hit Generate.</div>}
          <div style={{ display: "grid", gap: 14 }}>
            {results.map((test, index) => <article key={test.id || index} style={resultCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div><div style={eyebrowSmall}>TEST {index + 1} · {test.series || "Growth idea"}</div><h2 style={{ margin: "5px 0", fontSize: 20 }}>{test.hook}</h2></div>
                <button onClick={() => copy(JSON.stringify(test, null, 2), setMessage)} style={button}>Copy JSON</button>
              </div>
              <div style={statGrid}>
                <Info label="Retention" value={test.retention_mechanism} />
                <Info label="Why follow" value={test.follower_reason} />
                <Info label="Comment" value={test.comment_prompt} />
                <Info label="Fanvue note" value={test.fanvue_profile_note || "Quiet bio destination only"} />
              </div>
              <div style={twoCol}>
                <Box title="Script" value={test.script} />
                <Box title="TikTok caption" value={test.post_caption} copy={() => copy(test.post_caption, setMessage)} />
                <Box title="On-image caption" value={test.on_image_caption || "—"} copy={() => copy(test.on_image_caption, setMessage)} />
                <Box title="Why this should work" value={test.why_this_should_work} />
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={section}>Image production prompts</div>
                <div style={{ display: "grid", gap: 10 }}>{(test.image_generation_prompts || []).map((shot, shotIndex) => <div key={shot.shot || shotIndex} style={promptCard}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b>Shot {shot.shot || shotIndex + 1}</b><button onClick={() => copy(shot.json_prompt, setMessage)} style={button}>Copy prompt</button></div><div style={smallLine}>On-image copy: <b>{shot.on_image_caption || "—"}</b></div><pre style={pre}>{shot.json_prompt || "—"}</pre></div>)}</div>
              </div>
              {test.video_json_prompt && <div style={{ marginTop: 12 }}><Box title="Video JSON prompt" value={test.video_json_prompt} copy={() => copy(test.video_json_prompt, setMessage)} /></div>}
            </article>)}
          </div>
        </section>
      </div>
      {message && <div style={toast}>{message}</div>}
    </div>
  );
}

function Info({ label, value }) { return <div style={info}><div style={section}>{label}</div><div style={valueText}>{value || "—"}</div></div>; }
function Box({ title, value, copy: copyFn }) { return <div><div style={section}>{title}{copyFn && <button onClick={copyFn} style={{ ...button, marginLeft: 8, padding: "4px 8px", fontSize: 10 }}>Copy</button>}</div><div style={output}>{value || "—"}</div></div>; }

const page = { minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: 26, fontFamily: "Inter,system-ui,sans-serif" };
const shell = { maxWidth: 1280, margin: "0 auto" };
const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18, marginBottom: 16 };
const title = { fontSize: 14, fontWeight: 900, marginBottom: 12 };
const h1 = { margin: "7px 0 5px", fontSize: 36, letterSpacing: "-.05em" };
const eyebrow = { fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "#d9a43c", fontWeight: 900 };
const eyebrowSmall = { fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#d9a43c", fontWeight: 900 };
const muted = { color: "#838ca0", fontSize: 11, lineHeight: 1.45, marginTop: 4 };
const mutedLarge = { color: "#9ba4b5", maxWidth: 880, lineHeight: 1.65, margin: 0 };
const mutedSmall = { color: "#838ca0", fontSize: 10.5, lineHeight: 1.4, marginTop: 4 };
const grid3 = { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 };
const grid4 = { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 };
const cardButton = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 10, padding: "11px 12px", fontWeight: 800, cursor: "pointer", textAlign: "left", minHeight: 70 };
const activeCard = { ...cardButton, borderColor: "#d4af37", background: "rgba(212,175,55,.12)" };
const label = { display: "flex", flexDirection: "column", gap: 7, fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800, color: "#7f8798" };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 10, padding: "10px 12px" };
const textarea = { ...input, resize: "vertical", fontFamily: "inherit", lineHeight: 1.45 };
const primary = { border: "1px solid #d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b", borderRadius: 10, padding: "10px 14px", fontWeight: 900, cursor: "pointer" };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 10, padding: "8px 11px", fontWeight: 800, cursor: "pointer" };
const empty = { padding: 24, textAlign: "center", border: "1px dashed #2a3040", borderRadius: 12, color: "#626b7e" };
const resultCard = { border: "1px solid #2a3040", borderRadius: 14, padding: 16, background: "#10131a" };
const statGrid = { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginTop: 12 };
const info = { border: "1px solid #252a39", borderRadius: 10, padding: 10 };
const section = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 900, color: "#7f8798", marginBottom: 6 };
const valueText = { fontSize: 12, lineHeight: 1.5, color: "#d7dde8" };
const twoCol = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 };
const output = { background: "#151822", border: "1px solid #2a3040", borderRadius: 10, padding: 11, color: "#dce2ec", fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap", minHeight: 46 };
const promptCard = { border: "1px solid #252a39", borderRadius: 10, padding: 12, background: "#0c0f15" };
const smallLine = { marginTop: 8, fontSize: 11, color: "#d7dde8" };
const pre = { margin: "10px 0 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "#0a0d12", border: "1px solid #202635", borderRadius: 8, padding: 10, color: "#bfc8d8", fontSize: 10.5, lineHeight: 1.45 };
const toast = { position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)", background: "#151a24", border: "1px solid #2e3646", color: "#e8edf5", borderRadius: 999, padding: "10px 15px", fontSize: 11.5, fontWeight: 700, zIndex: 200, maxWidth: "90vw", textAlign: "center" };
