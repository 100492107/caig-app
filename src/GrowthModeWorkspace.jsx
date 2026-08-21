import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";

const MODEL = "mlx-community/Qwen3-8B-4bit";

const PEOPLE = [
  { id: "cara", name: "Cara", badge: "DIRECT / DRY", desc: "British, disciplined, funny, practical." },
  { id: "lila", name: "Lila", badge: "QUIET / OBSERVANT", desc: "Measured, warm, understated, visual." },
  { id: "cara_lila", name: "Cara + Lila", badge: "CHEMISTRY / CONTRAST", desc: "Two separate voices, genuine dynamic." },
];

const FORMATS = [
  ["personal_moment", "Personal moment", "A lived moment with one strong human detail."],
  ["pov", "POV / relatable", "A recognisable situation with immediate emotional context."],
  ["quick_take", "Quick take", "One sharp opinion, observation or discovery."],
  ["story", "Micro-story", "Setup → tension → payoff."],
  ["grwm", "GRWM", "Getting ready because something is happening."],
  ["day_in_life", "Day in the life", "A coherent slice of an actual-looking day."],
  ["slideshow", "Photo slideshow", "5–7 connected slides with a reason to swipe."],
  ["reaction", "Reaction", "A genuine reaction that matters to the viewer."],
];

const SERIES = {
  cara: ["Things I Stopped Doing", "If I Started Again From Zero", "Gym Mistakes I See All The Time", "Beginner vs Advanced", "30-Day Challenge", "What Nobody Tells You", "Unpopular Opinion", "What I'd Do Differently", "Realistic Routine", "Small Wins / Small Fails", "I Tried It So You Don't Have To", "Behind The Scene Of A Normal Day", "Things That Sound Expensive But Aren't", "One Small Change That Made Life Easier", "Same Situation, Different Choice"],
  lila: ["I Tried It So You Don't Have To", "Do This, Not That", "Same Product, 3 Ways", "Before vs After", "One-Minute Tutorial", "Full Look In 60 Seconds", "Drugstore vs High-End", "GRWM For...", "Testing Things TikTok Made Me Buy", "What Actually Suits Me", "Beauty Mistakes I Was Making", "Skincare Routine Breakdown", "Worst To Best", "One Small Change", "Things I Quietly Swear By", "What I Changed My Mind About"],
  cara_lila: ["Cara Says / Lila Says", "One Thinks It's Brilliant, One Thinks It's Stupid", "We Both Tried It", "Things We Completely Disagree On", "Get Ready Together", "Who Knows The Other Better?", "One Has A Plan, The Other Ruins It", "Two Reactions To The Same Thing", "Things Cara Does That Lila Finds Hilarious", "Things Lila Does That Cara Pretends Not To Notice", "We Went Out For One Thing", "Travel Day Problems", "Same Outfit Brief, Two Different Versions", "One Small Decision That Changed The Day"],
};

const AUDIENCE = {
  cara: "Women who want discipline without misery, confidence without performance, realistic routines, blunt observations and progress that feels earned.",
  lila: "Women who like calm aspiration with usefulness underneath: beauty, lifestyle filtering, understated taste, routines, places and small discoveries.",
  cara_lila: "Viewers who enjoy relationship dynamics, anticipation of disagreement, two distinct reactions and the feeling of watching something unfold between two people.",
};

const ADAPTATIONS = [
  "flip proven list framing when the opposite angle creates tension",
  "use curiosity-gap reveals only when the reveal is specific",
  "use movement-language only when natural to the audience",
  "use emotional reversal from frustration to unexpected upside",
  "borrow challenge/progression structures from other categories",
  "borrow participation mechanics only when the emotional trigger matches",
  "borrow ranking/comparison structures with a genuine contrast",
  "borrow confession/storytime structures with real consequence",
];

const BIBLES = {
  cara: "Cara is an adult fictional British creator. Direct, dry, disciplined, practical and warm underneath the edge. She can be tired, awkward, competitive over something trivial, quietly proud, sentimental, amused or wrong. Worlds: training, routines, style, work, money choices, confidence, travel, friendship, small luxuries, funny failures and ordinary chaos.",
  lila: "Lila is an adult fictional creator. Warm, measured, observant and understated. She notices light, rooms, texture, places, small details and changes in routine. She prefers simple things done exceptionally well and dislikes forced hype and obvious engagement bait. Worlds: beauty, skincare, haircare, travel, style, wellness, calm ambition and nostalgia.",
  cara_lila: "Cara and Lila are separate adult fictional creators. Cara reacts faster, jokes more readily and challenges things. Lila observes first, speaks more precisely and is calmer. Duo content is about relationship dynamics, teasing, disagreement, cooperation and distinct reactions. Never merge identities.",
};

const styles = {
  page: { minHeight: "100vh", background: "radial-gradient(circle at 10% 0%, rgba(212,175,55,.08), transparent 28%), #090b10", color: "#fff" },
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
    job_type: "growth_mode",
    model: MODEL,
    persona_id: persona,
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    options: { max_tokens: 11000, temperature: 0.64, top_p: 0.9 },
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

function Info({ label, value }) {
  return <div style={{ background: "#0b0f16", border: "1px solid #202737", borderRadius: 12, padding: 11 }}>
    <div style={{ color: "#677186", fontSize: 9, textTransform: "uppercase", fontWeight: 900, letterSpacing: ".08em" }}>{label}</div>
    <div style={{ marginTop: 6, fontSize: 11, color: "#cbd2de", lineHeight: 1.5 }}>{value || "—"}</div>
  </div>;
}

function PromptBlock({ title, value, onCopy }) {
  return <div style={{ background: "#090c11", border: "1px solid #1f2634", borderRadius: 12, padding: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <b style={{ fontSize: 11 }}>{title}</b>
      <button onClick={onCopy} style={{ ...styles.button, padding: "6px 9px", fontSize: 10 }}>Copy</button>
    </div>
    <pre style={{ whiteSpace: "pre-wrap", color: "#aeb7c6", fontSize: 10, lineHeight: 1.6, margin: "8px 0 0", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" }}>{value || "—"}</pre>
  </div>;
}

export default function GrowthModeWorkspace() {
  const [persona, setPersona] = useState("cara");
  const [format, setFormat] = useState("personal_moment");
  const [series, setSeries] = useState("Auto-select best series");
  const [count, setCount] = useState("10");
  const [direction, setDirection] = useState("");
  const [fanvueFunnel, setFanvueFunnel] = useState(true);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const person = useMemo(() => PEOPLE.find((p) => p.id === persona) || PEOPLE[0], [persona]);
  const seriesList = SERIES[persona] || SERIES.cara;
  const formatMeta = FORMATS.find((x) => x[0] === format) || FORMATS[0];

  async function generate() {
    setBusy(true);
    setResults([]);
    setMessage("Qwen is building the creative batch…");
    try {
      const systemPrompt = `You are CornerstoneAIAssets' senior creative director. Combine social strategy, audience psychology, creator direction, UGC realism, narrative structure, retention editing and quality control. You are not a generic copywriter.\n\nCREATOR SOURCE:\n${BIBLES[persona]}\n\nAUDIENCE:\n${AUDIENCE[persona]}\n\nSERIES LIBRARY:\n${seriesList.join(" | ")}\n\nMISSION:\nCreate follower-growth content that makes a stranger stop, understand immediately, care emotionally, keep watching and have a legitimate reason to follow. There is intentionally no product.\n\nCREATIVE ORDER:\nAudience emotion → series decision → proven/adapted format → hook → retention/payoff → human creator moment → visual sequence → caption/comment trigger → quality gate.\n\nFORMAT ADAPTATION:\nUse proven structures rather than inventing from nothing. Useful mechanisms: ${ADAPTATIONS.join(" | ")}. Steal the mechanism, never another creator's identity, exact wording, script or distinctive execution. Emotional match comes first.\n\nDISTINCTIVENESS:\nIf the concept still works with the creator name removed, rebuild it around a specific observation, contradiction, relationship, setting, behaviour or recurring-series identity.\n\nHUMANITY:\nEvery scene needs a believable reason to exist and one main action. Use plausible phone framing, normal posture, imperfect details and relevant environment. Allow tiredness, awkwardness, indecision, humour, disagreement or being wrong.\n\nANTI-SLOP:\nReject random luxury backdrops, generic posing, plastic skin, perfect symmetry, fake vulnerability, fabricated facts or experiences, unexplained wardrobe/prop changes, meaningless camera changes, obvious engagement bait, social-manager captions, impossible actions and repeated hooks.\n\nFOLLOWER CONVERSION:\nA like is not enough. Every concept needs a return reason: next episode, unresolved question, challenge, useful filter, personality people want more of, or relationship dynamic.\n\nBATCH INTELLIGENCE:\nAcross ${count} concepts, vary emotion, setting, shot distance, opening rhythm, subject and series execution. Do not output ten rewrites of one concept.\n\nFANVUE:\n${fanvueFunnel ? "Keep Fanvue in the background: profile/bio only, no hard-sell and no explicit content." : "Do not mention Fanvue."}\n\nReturn JSON only.`;

      const userPrompt = `CREATOR: ${person.name}\nFORMAT: ${formatMeta[1]} — ${formatMeta[2]}\nSERIES CHOICE: ${series}\nVARIATIONS: ${count}\nEXTRA DIRECTION: ${direction.trim() || "None — make the strongest strategic choices."}\n\nInternally score candidates on stop power, emotional clarity, retention, creator distinctiveness, follower reason, visual believability and series potential. Discard weak concepts before returning survivors.\n\nReturn exactly {"tests":[{"id":"G1","series":"","audience_emotion":"","format_strategy":"","hook":"","retention_mechanism":"","payoff":"","follower_reason":"","comment_reason":"","save_reason":"","share_reason":"","script":"","post_caption":"","on_image_caption":"","image_generation_prompts":[{"shot":1,"purpose":"","json_prompt":"","on_image_caption":""}],"video_json_prompt":"","production_notes":"","why_this_should_work":"","quality_gate":"PASS"}]}\n\nFor slideshows use 5–7 coherent slides. For video formats provide only genuinely useful image/B-roll prompts. Every json_prompt must be strict, production-ready JSON-stringified direction covering identity, environment, wardrobe, action, camera, framing, lighting, continuity, realistic anatomy, relevant props and negative constraints. Do not put text inside generated images by default; provide exact on-image copy separately. Never fabricate a personal experience just to strengthen a hook.`;

      const jobId = await queueQwen({ title: `Growth Studio · ${person.name} · ${formatMeta[1]}`, persona, systemPrompt, userPrompt });
      const parsed = parseJson(await waitQwen(jobId, setMessage));
      const generated = Array.isArray(parsed.tests) ? parsed.tests : [];
      if (!generated.length) throw new Error("Qwen returned no growth tests.");
      setResults(generated);
      setMessage(`${generated.length} curated concepts ready.`);
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  return <div style={styles.page}>
    <div style={styles.shell}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#d4af37", fontSize: 11, fontWeight: 950, letterSpacing: ".14em", textTransform: "uppercase" }}>Track B / Creator Growth Studio</div>
            <h1 style={{ fontSize: "clamp(32px,4vw,52px)", lineHeight: 1, margin: "10px 0", letterSpacing: "-.04em" }}>Build the person people follow.</h1>
            <p style={{ maxWidth: 760, margin: 0, color: "#9ba5b7", fontSize: 14, lineHeight: 1.65 }}>Qwen thinks first — audience, emotion, series, format, hook, retention, visual story and follower conversion — then hands the production layer exactly what it needs.</p>
          </div>
          <div style={{ ...styles.panel, padding: "11px 14px", minWidth: 220 }}>
            <div style={{ color: "#7f899c", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 900 }}>Qwen intelligence</div>
            <div style={{ fontWeight: 950, marginTop: 5 }}>Creator Director · ACTIVE</div>
            <div style={{ color: "#708094", fontSize: 11, marginTop: 4 }}>Curated before output</div>
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(310px,380px) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
        <aside style={{ ...styles.panel, padding: 20, position: "sticky", top: 18 }}>
          <div style={{ color: "#7f899c", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 900 }}>Creative brief</div>
          <div style={{ display: "grid", gap: 18, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "#788397", marginBottom: 8 }}>Creator</div>
              <div style={{ display: "grid", gap: 8 }}>
                {PEOPLE.map((p) => <button key={p.id} onClick={() => { setPersona(p.id); setSeries("Auto-select best series"); }} style={{ ...styles.button, textAlign: "left", padding: "12px 13px", background: persona === p.id ? "linear-gradient(135deg,rgba(212,175,55,.18),rgba(212,175,55,.05))" : "#10141d", borderColor: persona === p.id ? "#9c7b2c" : "#2b3242" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b>{p.name}</b><span style={{ color: persona === p.id ? "#d4af37" : "#657087", fontSize: 9, fontWeight: 900 }}>{p.badge}</span></div><div style={{ marginTop: 5, color: "#818b9d", fontSize: 11 }}>{p.desc}</div></button>)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#788397", marginBottom: 8 }}>Format</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>{FORMATS.map(([id, label]) => <button key={id} onClick={() => setFormat(id)} style={{ ...styles.button, fontSize: 11, padding: "10px 8px", background: format === id ? "#1d2330" : "#10141d", borderColor: format === id ? "#d4af37" : "#2b3242", color: format === id ? "#fff" : "#a7afbe" }}>{label}</button>)}</div>
            </div>

            <label style={styles.label}>Signature series<select value={series} onChange={(e) => setSeries(e.target.value)} style={styles.input}><option>Auto-select best series</option>{seriesList.map((s) => <option key={s}>{s}</option>)}</select></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={styles.label}>Batch size<select value={count} onChange={(e) => setCount(e.target.value)} style={styles.input}><option value="5">5 concepts</option><option value="10">10 concepts</option></select></label>
              <label style={styles.label}>Fanvue background<select value={fanvueFunnel ? "ON" : "OFF"} onChange={(e) => setFanvueFunnel(e.target.value === "ON")} style={styles.input}><option>ON</option><option>OFF</option></select></label>
            </div>
            <label style={styles.label}>Creative direction<textarea value={direction} onChange={(e) => setDirection(e.target.value)} rows={5} placeholder="Situation, trend, audience problem, place, mood or reference. Leave blank for Qwen to choose." style={{ ...styles.input, resize: "vertical", lineHeight: 1.55 }} /></label>
            <button disabled={busy} onClick={generate} style={{ ...styles.primary, width: "100%", opacity: busy ? .65 : 1 }}>{busy ? "Qwen is thinking…" : "Generate creative batch"}</button>
            <div style={{ borderTop: "1px solid #232a39", paddingTop: 14 }}>
              <div style={{ color: "#788397", fontSize: 10, textTransform: "uppercase", fontWeight: 900, letterSpacing: ".1em" }}>Qwen quality gate</div>
              <div style={{ display: "grid", gap: 7, marginTop: 9 }}>{["Audience emotion", "Series return reason", "Format adaptation", "Follower conversion", "Human realism", "Anti-slop rejection"].map((x) => <div key={x} style={{ display: "flex", gap: 8, alignItems: "center", color: "#aab2c0", fontSize: 11 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: "#78d2ae" }} />{x}</div>)}</div>
            </div>
          </div>
        </aside>

        <main>
          <div style={{ ...styles.panel, padding: 18, marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div><div style={{ color: "#d4af37", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 950 }}>Current brief</div><div style={{ fontWeight: 900, marginTop: 4 }}>{person.name} · {formatMeta[1]} · {series}</div></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><span style={{ ...styles.button, cursor: "default", color: "#8f98aa" }}>No product required</span><span style={{ ...styles.button, cursor: "default", color: "#8f98aa" }}>Fanvue bio only</span></div>
          </div>

          {!results.length && <div style={{ ...styles.panel, padding: 46, textAlign: "center", minHeight: 360, display: "grid", placeItems: "center" }}><div><div style={{ fontSize: 42, marginBottom: 12 }}>✦</div><h2 style={{ margin: 0, fontSize: 22 }}>Nothing generated yet.</h2><p style={{ maxWidth: 500, margin: "10px auto 0", color: "#798498", lineHeight: 1.6 }}>Choose the creator and format, then let Qwen curate the concepts. Weak ideas are discarded before they reach the board.</p></div></div>}

          <div style={{ display: "grid", gap: 14 }}>
            {results.map((test, index) => <article key={test.id || index} style={{ ...styles.panel, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}><div><div style={{ color: "#788397", fontSize: 10, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase" }}>Concept {index + 1} · {test.series || "One-off"}</div><h2 style={{ fontSize: 24, lineHeight: 1.12, margin: "6px 0 0", letterSpacing: "-.025em" }}>{test.hook}</h2></div><button onClick={() => copy(JSON.stringify(test, null, 2), setMessage)} style={styles.button}>Copy JSON</button></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 14 }}><Info label="Emotion" value={test.audience_emotion} /><Info label="Retention" value={test.retention_mechanism} /><Info label="Why follow" value={test.follower_reason} /><Info label="Why share" value={test.share_reason} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 12, marginTop: 12 }}><div style={{ background: "#0b0f16", border: "1px solid #202737", borderRadius: 14, padding: 13 }}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", fontWeight: 950 }}>Script</div><div style={{ color: "#d4d9e2", fontSize: 12, lineHeight: 1.65, whiteSpace: "pre-wrap", marginTop: 7 }}>{test.script}</div></div><div style={{ display: "grid", gap: 12 }}><div style={{ background: "#0b0f16", border: "1px solid #202737", borderRadius: 14, padding: 13 }}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", fontWeight: 950 }}>TikTok caption</div><div style={{ color: "#d4d9e2", fontSize: 12, lineHeight: 1.55, marginTop: 7 }}>{test.post_caption || "—"}</div></div><div style={{ background: "#0b0f16", border: "1px solid #202737", borderRadius: 14, padding: 13 }}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", fontWeight: 950 }}>Quality gate</div><div style={{ color: "#78d2ae", fontSize: 12, fontWeight: 900, marginTop: 7 }}>{test.quality_gate || "PASS"}</div><div style={{ color: "#7f899c", fontSize: 11, lineHeight: 1.5, marginTop: 5 }}>{test.why_this_should_work || "—"}</div></div></div></div>
              <details style={{ marginTop: 12 }}><summary style={{ cursor: "pointer", color: "#9ea7b7", fontSize: 11, fontWeight: 800 }}>Production package</summary><div style={{ display: "grid", gap: 10, marginTop: 10 }}><div style={{ background: "#090c11", border: "1px solid #1f2634", borderRadius: 12, padding: 12 }}><div style={{ color: "#788397", fontSize: 9, fontWeight: 900, textTransform: "uppercase" }}>On-image copy</div><div style={{ marginTop: 6, color: "#d7dbe3", fontSize: 12 }}>{test.on_image_caption || "—"}</div></div>{(test.image_generation_prompts || []).map((shot, shotIndex) => <PromptBlock key={shot.shot || shotIndex} title={`Shot ${shot.shot || shotIndex + 1}`} value={shot.json_prompt} onCopy={() => copy(shot.json_prompt, setMessage)} />)}{test.video_json_prompt && <PromptBlock title="Video prompt" value={test.video_json_prompt} onCopy={() => copy(test.video_json_prompt, setMessage)} />}</div></details>
            </article>)}
          </div>
        </main>
      </div>
      {message && <div style={{ position: "fixed", right: 22, bottom: 22, background: "#141923", color: "#fff", border: "1px solid #30384a", borderRadius: 12, padding: "11px 14px", boxShadow: "0 20px 40px rgba(0,0,0,.3)", fontSize: 12 }}>{message}</div>}
    </div>
  );
}
