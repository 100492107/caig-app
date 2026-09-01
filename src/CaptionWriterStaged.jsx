import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const PERSONAS = {
  cara: { name: "Cara", note: "Direct, dry, disciplined, British. Confident without shouting." },
  lila: { name: "Lila", note: "Measured, warm, observant, understated. Quiet confidence." },
  duo: { name: "Cara + Lila", note: "Two distinct women. Natural chemistry, contrast, shared moments. Never blend their voices." },
};

const PLATFORMS = [
  { id: "instagram", name: "Instagram", objective: "Attention + comments + profile visits" },
  { id: "facebook", name: "Facebook", objective: "Conversation + shares + profile visits" },
  { id: "fanvue", name: "Fanvue", objective: "Curiosity + intimacy + paid-page conversion" },
];

function parseJson(value) {
  const text = String(value || "").trim().replace(/```json|```/gi, "").trim();
  try { return JSON.parse(text); } catch {}
  const start = text.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned no JSON.");
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0; let quoted = false; let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === open) depth += 1;
    else if (ch === close && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("Qwen returned incomplete JSON.");
}

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function promptFor({ platform, persona, evidence, imageDescription, context }) {
  const creator = PERSONAS[persona] || PERSONAS.duo;
  const destination = PLATFORMS.find((item) => item.id === platform) || PLATFORMS[0];
  const fanvue = platform === "fanvue";
  return `PLATFORM: ${destination.name}\nOBJECTIVE: ${destination.objective}\nCREATOR: ${creator.name}\nCREATOR VOICE: ${creator.note}\n\nCURRENT EVIDENCE:\n${evidence || "No current evidence supplied. Do not invent performance numbers."}\n\nIMAGE FACTS:\n${imageDescription}\n\nCONTEXT:\n${context || "None supplied."}\n\nWrite captions for this exact image. Match only what the image supports. Do not invent location, outfit, time, people, actions or backstory. Avoid generic AI influencer language. ${fanvue ? "For Fanvue, use curiosity, personality and exclusivity without explicit sexual content." : "For public social, optimise for attention, interaction and profile visits first."}\n\nReturn JSON only:\n{\"recommended\":\"\",\"alternatives\":[\"\",\"\",\"\"],\"angle\":\"\",\"cta\":\"\",\"why_this_angle\":\"\",\"test_note\":\"\"}`;
}

async function analyseImage(dataUrl, mimeType) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: "You are a visual fact checker. Describe only what is visibly present. Return concise JSON with people, clothing, setting, lighting, objects, pose, expression, composition and mood. Do not invent identity or backstory.",
      user: "Describe this image for a caption writer that must match it exactly.",
      images: [{ dataUrl, mimeType }],
      maxTokens: 900,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Image analysis failed.");
  return body.text || "";
}

async function queueCaption({ persona, platform, file, prompt }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title: `Caption · ${persona} · ${platform} · ${file.name}`,
    job_type: "caption_writer",
    model: "mlx-community/Qwen3-8B-4bit",
    persona_id: persona === "duo" ? "cara_lila" : persona,
    system_prompt: "You are Qwen, the local social caption strategist for CornerstoneAIAssets. The supplied image facts are authoritative. Never invent visual facts or performance numbers. Return JSON only.",
    user_prompt: prompt,
    options: { max_tokens: 2200, temperature: 0.62 },
    status: "queued",
    production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function waitForJob(id, onStatus) {
  for (let i = 0; i < 120; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const { data, error } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) continue;
    if (data.status === "error") throw new Error(data.error_message || "Qwen caption job failed.");
    if (data.status === "completed") return parseJson(data.result);
    onStatus?.(data.status);
  }
  throw new Error("Caption job timed out.");
}

export default function CaptionWriterStaged() {
  const [stage, setStage] = useState(0);
  const [persona, setPersona] = useState("cara");
  const [platform, setPlatform] = useState("instagram");
  const [files, setFiles] = useState([]);
  const [evidence, setEvidence] = useState("");
  const [context, setContext] = useState("");
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const destination = useMemo(() => PLATFORMS.find((item) => item.id === platform) || PLATFORMS[0], [platform]);
  const selectedCreator = useMemo(() => PERSONAS[persona] || PERSONAS.duo, [persona]);
  const hasResults = Object.keys(results).length > 0;

  useEffect(() => {
    try { sessionStorage.setItem("caig_caption_stage", String(stage)); } catch {}
  }, [stage]);

  function onFilesChange(event) {
    const picked = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    setFiles(picked.slice(0, 20));
    setResults({});
    if (picked.length) setMessage(`${Math.min(picked.length, 20)} photo${picked.length === 1 ? "" : "s"} selected.`);
  }

  async function generate() {
    if (!files.length) { setMessage("Choose at least one photo in Select first."); setStage(0); return; }
    setBusy(true);
    setStage(2);
    setResults({});
    try {
      const next = {};
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setMessage(`Photo ${index + 1}/${files.length} · checking the image…`);
        const dataUrl = await readFileDataUrl(file);
        const imageFacts = await analyseImage(dataUrl, file.type || "image/jpeg");
        const prompt = promptFor({ platform, persona, evidence, context, imageDescription: imageFacts });
        setMessage(`Photo ${index + 1}/${files.length} · Qwen is writing the caption…`);
        const jobId = await queueCaption({ persona, platform, file, prompt });
        const result = await waitForJob(jobId, (status) => setMessage(`Photo ${index + 1}/${files.length} · Qwen ${status}…`));
        next[file.name] = { result, jobId };
        setResults((current) => ({ ...current, [file.name]: next[file.name] }));
      }
      setMessage(`${files.length} caption${files.length === 1 ? "" : "s"} ready for review.`);
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  const copy = (text) => {
    navigator.clipboard?.writeText(String(text || ""));
    setMessage("Caption copied.");
  };

  return (
    <div className="tb-stage-workspace cw-stage-workspace">
      <div className="cw-toolbar">
        <div>
          <div className="tb-small-label">CAPTION WORKFLOW</div>
          <h2 className="cw-title">Write captions from the actual photo.</h2>
          <p className="cw-subtitle">Three steps. Select the source, set the intent, then review what Qwen wrote.</p>
        </div>
        <div className="cw-context"><strong>{selectedCreator.name}</strong><span>{destination.name}</span><span>{files.length} photo{files.length === 1 ? "" : "s"}</span></div>
      </div>

      <div className="cw-stage-panels">
        {stage === 0 && (
          <section className="tb-panel cw-panel">
            <div className="cw-panel-head"><div><div className="tb-small-label">01 · SELECT</div><h3>Choose the source</h3></div><span className="cw-count">{files.length}/20</span></div>
            <div className="cw-choice-grid">
              {Object.entries(PERSONAS).map(([id, value]) => (
                <button key={id} type="button" className={`cw-choice ${persona === id ? "is-selected" : ""}`} onClick={() => setPersona(id)}>
                  <strong>{value.name}</strong><span>{value.note}</span>
                </button>
              ))}
            </div>
            <div className="cw-field-label">Destination</div>
            <div className="cw-choice-grid">
              {PLATFORMS.map((item) => (
                <button key={item.id} type="button" className={`cw-choice ${platform === item.id ? "is-selected" : ""}`} onClick={() => setPlatform(item.id)}>
                  <strong>{item.name}</strong><span>{item.objective}</span>
                </button>
              ))}
            </div>
            <div className="cw-upload">
              <label htmlFor="cw-file-input" className="cw-upload-label">Choose photos</label>
              <input id="cw-file-input" type="file" accept="image/*" multiple onChange={onFilesChange} />
              <span>{files.length ? `${files.length} selected · read locally` : "Nothing is uploaded to the Asset Library"}</span>
            </div>
            <div className="cw-actions"><button className="tb-primary" type="button" onClick={() => setStage(1)} disabled={!files.length}>Continue to Write</button></div>
          </section>
        )}

        {stage === 1 && (
          <section className="tb-panel cw-panel">
            <div className="cw-panel-head"><div><div className="tb-small-label">02 · WRITE</div><h3>Give Qwen the signal</h3></div><span className="cw-context-pill">{destination.name}</span></div>
            <div className="cw-write-grid">
              <div>
                <div className="cw-field-label">Current evidence</div>
                <textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Winning hooks, posts, comments, saves, shares, sales observations or other real evidence." />
              </div>
              <div>
                <div className="cw-field-label">Batch context</div>
                <textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="Optional context: travel, gym, dinner, beach, outfit, launch, private set…" />
              </div>
            </div>
            <div className="cw-summary"><span>Creator</span><strong>{selectedCreator.name}</strong><span>Platform</span><strong>{destination.name}</strong><span>Photos</span><strong>{files.length}</strong></div>
            <div className="cw-actions"><button type="button" className="tb-secondary" onClick={() => setStage(0)}>Back</button><button className="tb-primary" type="button" onClick={generate} disabled={busy}> {busy ? "Working…" : "Generate captions"}</button></div>
          </section>
        )}

        {stage === 2 && (
          <section className="tb-panel cw-panel">
            <div className="cw-panel-head"><div><div className="tb-small-label">03 · REVIEW</div><h3>{hasResults ? "Choose the strongest line" : "Ready to generate"}</h3></div><span className="cw-context-pill">{message || "Review the result before publishing."}</span></div>
            {!hasResults && <div className="cw-empty"><div className="cw-empty-title">Your captions will appear here.</div><div className="cw-empty-copy">Run the batch from Write. Qwen will analyse each photo, write against the selected creator and platform, and return alternatives for review.</div><button type="button" className="tb-secondary" onClick={() => setStage(1)}>Back to Write</button></div>}
            <div className="cw-results">
              {Object.entries(results).map(([name, payload]) => (
                <article key={name} className="cw-result">
                  <div className="cw-result-head"><div><div className="tb-small-label">{name}</div><strong>{payload.result?.angle || "Caption"}</strong></div><button type="button" className="tb-secondary" onClick={() => copy(payload.result?.recommended)}>Copy</button></div>
                  <div className="cw-recommended">{payload.result?.recommended || "No recommended caption returned."}</div>
                  {payload.result?.cta && <div className="cw-note"><b>CTA</b>{payload.result.cta}</div>}
                  {payload.result?.why_this_angle && <div className="cw-note"><b>Why</b>{payload.result.why_this_angle}</div>}
                  {(payload.result?.alternatives || []).map((text, index) => <button key={`${name}-${index}`} type="button" className="cw-alt" onClick={() => copy(text)}><span>Alternative {index + 1}</span>{text}</button>)}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
