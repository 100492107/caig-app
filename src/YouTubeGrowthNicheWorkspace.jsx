import React, { useState } from "react";
import { supabase } from "./supabase";

const NICHE = {
  name: "Animated Business Mysteries & Money Stories",
  audience: "Adults 25–54 interested in business, money, economics, company stories, scams, ambition, innovation and high-stakes decisions.",
  positioning: "Original long-form business and money storytelling presented as nostalgic 2D animation with a late-1990s/early-2000s hand-drawn television/cinema feel.",
  pillars: [
    "Rise and fall of companies",
    "Fortunes, frauds and financial disasters",
    "Business wars and unlikely winners",
    "Hidden economics behind familiar products",
    "Money psychology and behavioural stories",
    "Inventions, industries and people who changed markets",
  ],
  visual: "Original hand-drawn 2D animation, expressive character acting, painterly backgrounds, cinematic composition, warm cel-painted lighting, subtle film grain and nostalgic late-1990s/early-2000s visual language. Never reproduce Disney or other proprietary studio IP.",
};

const FORMATS = [
  "Business mystery",
  "Rise and fall",
  "How X made/broke a fortune",
  "Corporate battle",
  "Money psychology",
  "Hidden economics",
  "Scam / fraud story",
  "Invention that changed an industry",
];
const GOALS = ["Grow channel", "Maximise retention", "Maximise CTR", "Build authority", "Monetise"];

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/gi, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned invalid JSON.");
  const open = clean[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === open) depth += 1;
    else if (ch === close && --depth === 0) return JSON.parse(clean.slice(start, i + 1));
  }
  throw new Error("Qwen returned incomplete JSON.");
}

async function queueQwen({ title, systemPrompt, userPrompt }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title,
    job_type: "youtube_growth_niche",
    model: "mlx-community/Qwen3-8B-4bit",
    persona_id: "youtube_business_animation",
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    options: { max_tokens: 14000, temperature: 0.55 },
    status: "queued",
    production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function waitQwen(id, setMessage) {
  const deadline = Date.now() + 25 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    const { data, error } = await supabase.from("local_ai_jobs").select("status,result,error_message").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Qwen job disappeared from the queue.");
    if (data.status === "completed") return data.result || "";
    if (data.status === "error") throw new Error(data.error_message || "Qwen failed.");
    setMessage(`Qwen is researching and engineering the next story… ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}

const SYSTEM = `You are the lead creative director, YouTube strategist, documentary researcher, narrative architect, retention editor, audience psychologist, title/thumbnail strategist, SEO strategist and visual director for a premium adult long-form YouTube channel called ${NICHE.name}.

CHANNEL DNA
Niche: ${NICHE.name}
Audience: ${NICHE.audience}
Positioning: ${NICHE.positioning}
Pillars: ${NICHE.pillars.join(" | ")}
Visual language: ${NICHE.visual}

CORE JOB
Do not behave like a generic AI script writer. Think like an elite YouTube operator whose job is to find and exploit attention patterns, then turn them into original high-retention stories.

CREATIVE HIERARCHY
1. Audience desire/problem
2. Emotional trigger
3. Topic opportunity
4. Proven format or cross-category format adaptation
5. Title + thumbnail promise
6. Opening 5 seconds
7. Narrative engine
8. Curiosity loops and escalating stakes
9. Visual storytelling
10. Payoff and next-video behaviour

FORMAT ADAPTATION ENGINE
Study the mechanics of formats that work elsewhere, including other YouTube categories, TikTok, documentaries, podcasts, newsletters and social storytelling. Do not copy creators. Extract the underlying mechanism: curiosity gap, reversal, ranking, confession, reveal, comparison, countdown, investigation, timeline, rise/fall, hidden truth, consequence, participation, myth-vs-reality, “I finally figured out”, “things NOT worth your money”, challenge/progression, business war or emotional transformation.

Then ask:
- What emotion made the source format work?
- Does this audience feel the same emotion?
- What should remain structurally identical?
- What needs to change for business/money storytelling?
- What would make the adaptation feel fresh rather than derivative?

Never lift exact wording, scripts, thumbnails, branding or distinctive visual identity. Steal the structure, psychology and pacing only.

RESEARCH-FIRST RULE
Before scripting, build a ranked topic board. Prefer subjects with:
- a clear human story, conflict or mystery
- a strong consequence or transformation
- enough evidence or public material to support claims
- a visual story that can be animated
- a reason the topic matters to the audience now or remains evergreen
- commercial relevance without forcing finance jargon

Do not invent facts, revenue numbers, quotes or outcomes. Mark estimates as estimates. Use uncertainty explicitly when evidence is incomplete.

CTR + RETENTION
Treat title, thumbnail and opening as one promise.
- Generate 10 title options and rank them.
- Generate 3 thumbnail concepts and rank them.
- The title promises a question, conflict or outcome.
- The thumbnail visually intensifies that promise without repeating the title word-for-word.
- The first 5 seconds should create immediate tension, mystery, consequence or surprise.
- Do not begin with “welcome back”, channel intros or generic exposition.
- Every 30–60 seconds should introduce a new question, reveal, complication, reversal, evidence beat or emotional escalation.
- Remove sections that do not change what the viewer knows, feels or wants to know.

NARRATIVE STANDARD
Write spoken narration, not an essay. Use scenes, people, decisions, stakes, objects, places and consequences. Make numbers meaningful by attaching them to human decisions. Prefer causal chains: because X happened, Y changed, which caused Z.

VISUAL STORY STANDARD
The animation is not decoration. Every visual must do at least one job: explain, reveal, contrast, foreshadow, create emotion, establish place/time, visualise a number, embody a decision, or reset attention.
Default visual beat cadence is approximately 5 seconds, but do not force a cut if one shot can carry the narration better through Flow Labs motion.
Use original hand-drawn 2D animation inspired by broad late-1990s/early-2000s television/cinema nostalgia. Do not imitate Disney characters, logos, shots or proprietary designs.
Every visual prompt must be self-contained JSON and include continuity details for recurring characters, wardrobe, locations, props, camera, framing, lighting and negative constraints.

SEO
SEO supports discoverability; it does not override story quality. Provide primary keyword, secondary keywords, search intent, description, tags, hashtags, pinned comment, chapters and next-video CTA. Avoid keyword stuffing.

QUALITY GATE
Before returning the package, internally score each candidate on:
- click potential
- emotional clarity
- novelty of angle
- audience fit
- evidence strength
- long-form retention potential
- visual potential
- commercial potential
- series potential
Discard weak candidates before returning survivors.

BATCH INTELLIGENCE
When generating several topic ideas, vary the emotional engine and narrative shape. Do not return ten versions of the same story. When generating follow-ups, use what has already worked in the package to propose differentiated next episodes.

POLICY / ORIGINALITY
The final video must be materially original and educational or entertaining in its own right. Do not rely on copied articles, videos, stock narratives or interchangeable AI templates.

RETURN JSON ONLY. No markdown.`;

export default function YouTubeGrowthNicheWorkspace() {
  const [format, setFormat] = useState(FORMATS[0]);
  const [goal, setGoal] = useState(GOALS[0]);
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("10");
  const [direction, setDirection] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    setBusy(true);
    setResult(null);
    setMessage("Qwen is building the opportunity board before writing the video…");
    try {
      const userPrompt = `FORMAT: ${format}\nGOAL: ${goal}\nTARGET DURATION: ${duration} minutes\nTOPIC: ${topic || "None — choose the strongest opportunity yourself."}\nEXTRA DIRECTION: ${direction || "None."}\n\nWORKFLOW:\n1. Generate a ranked opportunity board of 8–12 topics/angles inside the fixed niche.\n2. For each, identify the emotional trigger, proven format mechanism, why the audience clicks, evidence/research requirements, visual potential, commercial potential and series potential.\n3. Select the strongest topic using those criteria, not personal preference.\n4. Generate 10 ranked title options and 3 ranked thumbnail concepts.\n5. Write the complete long-form script with deliberate retention loops and a strong payoff.\n6. Generate enough 5-second visual beats to cover the full duration.\n7. Every visual beat must have a self-contained JSON prompt for Nano Banana 2 / Flow Labs plus a motion note where useful.\n8. Produce the complete SEO/upload package.\n9. Produce 5 follow-up video ideas that exploit the same audience interest without becoming duplicates.\n\nReturn exactly:\n{\"channel\":{\"niche\":\"\",\"audience\":\"\",\"positioning\":\"\",\"pillars\":[],\"visual_style\":\"\"},\"topic_board\":[{\"rank\":1,\"topic\":\"\",\"format_mechanism\":\"\",\"emotional_trigger\":\"\",\"why_people_click\":\"\",\"evidence_strength\":\"\",\"visual_potential\":\"\",\"commercial_potential\":\"\",\"series_potential\":\"\"}],\"selected_video\":{\"topic\":\"\",\"angle\":\"\",\"emotional_engine\":\"\",\"format_adaptation\":\"\",\"titles\":[{\"rank\":1,\"title\":\"\",\"reason\":\"\"}],\"thumbnails\":[{\"rank\":1,\"text\":\"\",\"composition\":\"\",\"visual_hierarchy\":\"\",\"reason\":\"\"}],\"hook_0_5s\":\"\",\"script\":\"\",\"chapters\":[{\"time\":\"\",\"title\":\"\"}],\"seo\":{\"primary_keyword\":\"\",\"secondary_keywords\":[],\"search_intent\":\"\",\"description\":\"\",\"tags\":[],\"hashtags\":[],\"pinned_comment\":\"\",\"next_video_cta\":\"\"},\"visual_timeline\":[{\"start\":0,\"end\":5,\"type\":\"IMAGE\",\"spoken_support\":\"\",\"visual_objective\":\"\",\"on_screen_text\":\"\",\"json_prompt\":\"\",\"flow_motion_note\":\"\"}],\"production_checklist\":[],\"verification_notes\":[],\"quality_gate\":{\"click\":\"\",\"retention\":\"\",\"originality\":\"\",\"evidence\":\"\",\"visual\":\"\"},\"why_this_package_should_work\":\"\"},\"next_video_ideas\":[{\"topic\":\"\",\"format_mechanism\":\"\",\"why_follow\":\"\"}]}`;
      const id = await queueQwen({ title: `YouTube Studio · ${NICHE.name} · ${topic || "Opportunity Discovery"}`, systemPrompt: SYSTEM, userPrompt });
      const parsed = parseJson(await waitQwen(id, setMessage));
      if (!parsed?.selected_video) throw new Error("Qwen returned no selected video package.");
      setResult(parsed);
      setMessage("Complete channel-ready package generated.");
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  const copy = (value) => { navigator.clipboard?.writeText(String(value || "")); setMessage("Copied."); };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.eyebrow}>YouTube · Creator Intelligence Studio</div>
        <h1 style={styles.h1}>{NICHE.name}</h1>
        <p style={styles.muted}>{NICHE.positioning}</p>

        <section style={styles.card}>
          <div style={styles.title}>Qwen is operating at the strategy layer</div>
          <div style={styles.grid}>
            {[
              ["Audience psychology", "Why this audience should care"],
              ["Format intelligence", "Adapt what is already working elsewhere"],
              ["CTR + retention", "Title → thumbnail → opening → loops"],
              ["Visual storytelling", "Every frame has a narrative job"],
              ["Evidence discipline", "No invented facts or fake certainty"],
              ["Series thinking", "Find the next story before the current one ends"],
            ].map(([label, value]) => <div key={label} style={styles.info}><b>{label}</b><div style={styles.small}>{value}</div></div>)}
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.title}>Build the next video</div>
          <div style={styles.grid3}>
            <label style={styles.label}>Format<select value={format} onChange={(e) => setFormat(e.target.value)} style={styles.input}>{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label style={styles.label}>Goal<select value={goal} onChange={(e) => setGoal(e.target.value)} style={styles.input}>{GOALS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label style={styles.label}>Length<select value={duration} onChange={(e) => setDuration(e.target.value)} style={styles.input}>{["8", "10", "12", "15", "20"].map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Optional topic. Leave blank and Qwen finds the strongest opportunity." rows={3} style={styles.textarea} />
          <textarea value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Optional references, constraints or angle. Qwen decides what matters." rows={3} style={styles.textarea} />
          <button disabled={busy} onClick={generate} style={styles.primary}>{busy ? "Qwen is thinking…" : "Generate full documentary package"}</button>
          {message && <div style={styles.status}>{message}</div>}
        </section>

        {result && <>
          <section style={styles.card}>
            <div style={styles.title}>Opportunity board</div>
            {(result.topic_board || []).map((item) => <div key={item.rank} style={styles.info}><b>#{item.rank} {item.topic}</b><div style={styles.small}>{item.format_mechanism} · {item.emotional_trigger}</div><div style={styles.small}>{item.why_people_click}</div><div style={styles.small}>Evidence: {item.evidence_strength} · Visual: {item.visual_potential} · Commercial: {item.commercial_potential}</div></div>)}
          </section>

          <section style={styles.card}>
            <div style={styles.title}>Selected video</div>
            <h2 style={{ margin: "4px 0 8px" }}>{result.selected_video.topic}</h2>
            <div style={styles.small}>{result.selected_video.angle}</div>
            <div style={styles.section}>Format adaptation</div><div style={styles.output}>{result.selected_video.format_adaptation}</div>
            <div style={styles.section}>Emotional engine</div><div style={styles.output}>{result.selected_video.emotional_engine}</div>
            <div style={styles.section}>Titles</div>
            {(result.selected_video.titles || []).map((x) => <div key={x.rank} style={styles.info}><b>#{x.rank} {x.title}</b><button onClick={() => copy(x.title)} style={styles.copy}>Copy</button><div style={styles.small}>{x.reason}</div></div>)}
            <div style={styles.section}>Thumbnail concepts</div>
            {(result.selected_video.thumbnails || []).map((x) => <div key={x.rank} style={styles.info}><b>{x.text}</b><div style={styles.small}>{x.composition}</div><div style={styles.small}>{x.reason}</div></div>)}
            <div style={styles.section}>Opening</div><div style={styles.output}>{result.selected_video.hook_0_5s}</div>
            <div style={styles.section}>Script <button onClick={() => copy(result.selected_video.script)} style={styles.copy}>Copy</button></div><div style={styles.output}>{result.selected_video.script}</div>
          </section>

          <section style={styles.card}>
            <div style={styles.title}>SEO / upload package</div>
            <div style={styles.info}><b>{result.selected_video.seo?.primary_keyword}</b><div style={styles.small}>{result.selected_video.seo?.search_intent}</div><div style={styles.output}>{result.selected_video.seo?.description}</div></div>
            <div style={styles.section}>Tags</div><div style={styles.output}>{(result.selected_video.seo?.tags || []).join(", ")}</div>
          </section>

          <section style={styles.card}>
            <div style={styles.title}>5-second visual timeline</div>
            {(result.selected_video.visual_timeline || []).map((item, index) => <details key={`${item.start}-${index}`} style={styles.info}><summary><b>{item.start}s–{item.end}s · {item.type}</b> — {item.visual_objective}</summary><div style={styles.small}>Narration: {item.spoken_support}</div><div style={styles.small}>On-screen: {item.on_screen_text || "—"}</div><pre style={styles.pre}>{item.json_prompt}</pre><div style={styles.small}>Flow Labs: {item.flow_motion_note || "None"}</div></details>)}
          </section>

          <section style={styles.card}>
            <div style={styles.title}>Quality gate + next stories</div>
            <div style={styles.grid}>
              {Object.entries(result.selected_video.quality_gate || {}).map(([key, value]) => <div key={key} style={styles.info}><b>{key}</b><div style={styles.small}>{value}</div></div>)}
            </div>
            {(result.next_video_ideas || []).map((item, index) => <div key={index} style={styles.info}><b>{item.topic}</b><div style={styles.small}>{item.format_mechanism} · {item.why_follow}</div></div>)}
          </section>
        </>}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#090812", color: "#fff", padding: 24 },
  shell: { maxWidth: 1240, margin: "0 auto" },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: "#D4AF37", fontWeight: 900 },
  h1: { fontSize: 40, margin: "8px 0" },
  muted: { color: "#9ca3b5", lineHeight: 1.6, maxWidth: 900 },
  card: { background: "#121120", border: "1px solid #29283a", borderRadius: 16, padding: 18, marginTop: 14 },
  title: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#D4AF37", fontWeight: 900, marginBottom: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 },
  info: { padding: 12, border: "1px solid #2a2938", borderRadius: 12, marginTop: 8, background: "#0f0e1a" },
  small: { fontSize: 12, color: "#b9bfce", lineHeight: 1.55, marginTop: 4 },
  label: { fontSize: 11, color: "#8f95a8", display: "grid", gap: 5 },
  input: { background: "#0d0c16", color: "#fff", border: "1px solid #343347", borderRadius: 10, padding: 11 },
  textarea: { width: "100%", boxSizing: "border-box", marginTop: 10, background: "#0d0c16", color: "#fff", border: "1px solid #343347", borderRadius: 10, padding: 12 },
  primary: { marginTop: 12, background: "#D4AF37", color: "#0b0910", border: 0, borderRadius: 10, padding: "12px 16px", fontWeight: 900, cursor: "pointer" },
  status: { fontSize: 12, color: "#aab0c0", marginTop: 10 },
  section: { marginTop: 14, marginBottom: 6, fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#D4AF37" },
  output: { whiteSpace: "pre-wrap", background: "#0b0a13", border: "1px solid #282738", borderRadius: 10, padding: 12, lineHeight: 1.6, color: "#e6e9f0", fontSize: 13 },
  copy: { float: "right", background: "transparent", color: "#D4AF37", border: "1px solid #5a4d1f", borderRadius: 6, padding: "3px 8px" },
  pre: { whiteSpace: "pre-wrap", background: "#090812", padding: 10, borderRadius: 8, overflowX: "auto", fontSize: 11, color: "#d9dce6" },
};
