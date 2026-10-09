import React, { useMemo, useState } from "react"
import { supabase } from "./supabase"
import EnterpriseShell from "./EnterpriseShell.jsx"
import MONEY_THIS_WEEK from "../docs/MONEY_THIS_WEEK.md?raw"
import YOUTUBE_AUTOMATION_CONTEXT from "../portable-ai/YOUTUBE_AUTOMATION_AI_CONTEXT.md?raw"
import YOUTUBE_AUTOMATION_DOCTRINE from "../docs/YOUTUBE_AUTOMATION_DOCTRINE.md?raw"
import SOCIAL_SALES_DOCTRINE from "../shared/social-sales-doctrine.js"

const STAGES = [
  ["research", "Find a topic", "Look for audience demand and promising channels."],
  ["niche", "Choose a niche", "Check whether the audience and opportunity are strong enough."],
  ["format", "Pick a format", "Choose a video structure you can repeat well."],
  ["patterns", "Study winners", "Find what successful videos have in common."],
  ["make", "Build a video plan", "Create the title, thumbnail idea, opening, script and production plan."],
  ["publish", "Prepare upload", "Prepare the title, description, chapters, thumbnail brief and upload checklist."],
  ["results", "Review results", "Use real performance data to choose the next test."],
]
const QWEN_MODEL = "mlx-community/Qwen3.5-9B-4bit"
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))


function readableLabel(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (m) => m.toUpperCase())
}
function ReadableValue({ value, depth = 0 }) {
  if (value === null || value === undefined || value === "") return <p className="yt-value-empty">No details provided.</p>
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <div className="yt-value-text">{String(value)}</div>
  }
  if (Array.isArray(value)) {
    if (!value.length) return <p className="yt-value-empty">No items returned.</p>
    return <div className="yt-value-list">
      {value.map((item, index) => (
        <article className="yt-value-item" key={String(index)}>
          {typeof item === "object" && item !== null
            ? <ReadableValue value={item} depth={depth + 1} />
            : <div className="yt-value-text">{String(item)}</div>}
        </article>
      ))}
    </div>
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
    const main = entries.filter(([key]) => !["research_run_id", "cornerstone_signals_written"].includes(key))
    return <div className={depth === 0 ? "yt-value-grid yt-value-grid-root" : "yt-value-grid"}>
      {main.map(([key, child]) => {
        const longText = typeof child === "string" && child.length > 1600
        const nested = child && typeof child === "object"
        return <section className="yt-value-section" key={key}>
          <h3>{readableLabel(key)}</h3>
          {longText
            ? <details><summary>Read full {readableLabel(key).toLowerCase()}</summary><div className="yt-value-text">{child}</div></details>
            : nested && depth >= 1
              ? <details><summary>Open {readableLabel(key).toLowerCase()}</summary><ReadableValue value={child} depth={depth + 1} /></details>
              : <ReadableValue value={child} depth={depth + 1} />}
        </section>
      })}
    </div>
  }
  return <div className="yt-value-text">{String(value)}</div>
}
function ReadableResult({ data }) {
  if (data?.text) return <section className="yt-readable-result"><ReadableValue value={data.text} /></section>
  return <section className="yt-readable-result"><ReadableValue value={data} /></section>
}

function parse(raw) {
  const text = String(raw || "").replace(/```json|```/gi, "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
  try { return JSON.parse(text) } catch {}
  const match = text.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  return { text }
}

async function runLocalAI(stage, inputs, onJobCreated = () => {}) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) throw new Error("Please sign in again.")
  const systemPrompt = [
    "You are Cornerstone YouTube Automation.",
    "The business brain is shared across models. Follow the current weekly priority and do not create a competing strategy.",
    "CURRENT MONEY PRIORITY (authoritative):\n" + MONEY_THIS_WEEK,
    "YOUTUBE OPERATING CONTEXT:\n" + YOUTUBE_AUTOMATION_CONTEXT,
    "DETAILED YOUTUBE AUTOMATION DOCTRINE:\n" + YOUTUBE_AUTOMATION_DOCTRINE,
    "SHARED SOCIAL + SALES DOCTRINE:\n" + SOCIAL_SALES_DOCTRINE,
    "Build a media operation, not a content farm.",
    "Use this workflow: RESEARCH -> NICHE -> CHANNELS -> FORMATS -> PATTERNS -> PACKAGING -> SCRIPT -> PRODUCTION -> PUBLISH -> ANALYTICS -> LEARNING.",
    "Study successful media for mechanisms. Do not copy distinctive wording, branding, footage, thumbnails or execution.",
    "Separate evidence, inference and creative recommendation.",
    "Never invent views, subscribers, revenue, RPM, sources, audience reactions, quotes or product facts.",
    "Originality and viewer value are mandatory. Avoid repetitive or mass-produced template output.",
    "For YouTube, packaging and viewer experience must work together: title/thumbnail earn the click; the opening must earn the watch.",
    "Give a clear next test at the end.",
    "Return plain English. JSON only when requested.",
  ].join("\n")
  let userPrompt = ""
  if (stage === "research") {
    userPrompt = "Find promising YouTube niches, channels, formats, patterns and search questions.\nNICHE: " + (inputs.niche || "Choose possibilities") + "\nTOPIC: " + (inputs.topic || "Current opportunities") + "\nEXAMPLES: " + (inputs.channels || "None") + "\nDIRECTION: " + (inputs.direction || "Look for repeatable opportunities.") + "\nReturn JSON: {niche_options:[],channel_research:[],format_options:[],patterns:[],search_questions:[],opportunities:[],risks:[],next_actions:[]}"
  } else if (stage === "niche") {
    userPrompt = "Evaluate this YouTube niche hard.\nNICHE: " + (inputs.niche || "Not set") + "\nEXAMPLES: " + (inputs.channels || "None") + "\nDIRECTION: " + (inputs.direction || "Find the strongest case for and against it.") + "\nReturn JSON: {verdict:" + "\"STRONG|TEST|WEAK\"" + ",audience:" + "\"\"" + ",viewer_problem_or_desire:" + "\"\"" + ",demand_signals:[],competition_signals:[],content_depth:" + "\"\"" + ",monetisation_paths:[],risks:[],best_sub_niches:[],next_test:" + "\"\"" + "}"
  } else if (stage === "format") {
    userPrompt = "Find repeatable long-form YouTube formats.\nNICHE: " + (inputs.niche || "Not set") + "\nCHANNELS: " + (inputs.channels || "None") + "\nTOPIC: " + (inputs.topic || "Not set") + "\nReturn JSON: {formats:[{name,viewer_promise,length_range,title_pattern,thumbnail_pattern,production_complexity,why_it_can_repeat,how_to_make_it_original}],best_test,reason}"
  } else if (stage === "patterns") {
    userPrompt = "Find repeated mechanisms across the supplied channels/videos.\nNICHE: " + (inputs.niche || "Not set") + "\nCHANNELS/VIDEOS: " + (inputs.channels || "None") + "\nTOPIC: " + (inputs.topic || "Not set") + "\nReturn JSON: {patterns:[{pattern,evidence,confidence,adaptation,test}],anti_patterns:[],best_mechanism,next_test}"
  } else if (stage === "make") {
    userPrompt = "Build one original YouTube video plan. Use earlier research and pattern results when supplied. Do not copy source execution.\\nNICHE: " + (inputs.niche || "Not set") + "\\nTOPIC: " + (inputs.topic || "Not set") + "\\nCHANNELS/REFERENCES: " + (inputs.channels || "None") + "\\nDIRECTION: " + (inputs.direction || "Build the strongest original video.") + "\\nReturn JSON: {audience,viewer_outcome,why_people_click,belief_reason,title_options:[],thumbnail_concepts:[],opening_hook,video_length_target,outline:[],script,visual_plan:[],voiceover_direction,editing_notes,fact_check_list:[],originality_check:[],production_assets_needed:[],next_step}"
  } else if (stage === "publish") {
    userPrompt = "Prepare a manual-ready YouTube upload pack using the supplied earlier research and video plan. Do not claim that a finished video, thumbnail or edit exists unless the operator supplied it. Use natural searchable wording without keyword stuffing. Mark missing items as blockers.\\nNICHE: " + (inputs.niche || "Not set") + "\\nTOPIC: " + (inputs.topic || "Not set") + "\\nCHANNELS/REFERENCES: " + (inputs.channels || "None") + "\\nVIDEO / DIRECTION: " + (inputs.direction || "Use the previous stage result if available.") + "\\nReturn JSON: {recommended_title,alternative_titles:[],final_thumbnail_brief,description,chapters:[],pinned_comment,call_to_action,end_screen_or_related_video,next_video_suggestion,optional_tags,disclosure_or_rights_notes:[],upload_checklist:[],assets_still_needed:[],manual_upload_steps:[],analytics_to_capture:[],ready_status,blockers:[],next_step}"
  } else {
    userPrompt = "Diagnose YouTube performance using only the actual metrics supplied. A blank metric is unknown, not zero. Interpret CTR together with impressions, average view duration and retention; hypotheses are not proven causes.\\nVIDEO/NICHE: " + (inputs.niche || "Not set") + "\\nTOPIC: " + (inputs.topic || "Not set") + "\\nADDITIONAL CONTEXT: " + (inputs.direction || "No additional context supplied") + "\\nReturn JSON: {diagnosis:" + "\\"PACKAGING|RETENTION|TOPIC|AUDIENCE|PRODUCTION|UNKNOWN\\"" + ",observed_facts:[],missing_metrics:[],what_is_strong:[],what_is_weak:[],likely_explanations:[],next_tests:[],metrics_to_watch:[],decision_rule}"
  }
  if (inputs.previousResult) {
    userPrompt += "\\n\\nPREVIOUS STAGE RESULT (continue from this; do not make the operator repeat it):\\n" +
      JSON.stringify(inputs.previousResult).slice(0, 14000);
  }
  if (stage === "results") {
    userPrompt += "\\n\\nMETRICS ENTERED BY THE OPERATOR (blank means unknown; do not turn blank values into zero):\\n" +
      JSON.stringify(inputs.metrics || {}, null, 2);
  }
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    owner_id: auth.user.id,
    title: "YouTube Automation · " + stage,
    job_type: stage === "research" ? "research_radar" : "youtube_automation",
    model: QWEN_MODEL,
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    options: { max_tokens: 6000, temperature: 0.55, research: stage === "research", research_domain: "TRACK_B_CONTENT_ENGINE", niche: inputs.niche || "YouTube" },
    status: "queued",
    production_status: "not_started",
  }).select("id").single()
  if (error) throw error
  onJobCreated(data.id)
  const deadline = Date.now() + 8 * 60 * 1000
  while (Date.now() < deadline) {
    await sleep(2500)
    const { data: job, error: jobError } = await supabase.from("local_ai_jobs").select("status,result,error_message").eq("id", data.id).maybeSingle()
    if (jobError) throw jobError
    if (job?.status === "completed") return parse(job.result)
    if (job?.status === "error") throw new Error(job.error_message || "Local AI job failed.")
  }
  throw new Error("Local AI took too long. Check the Mac worker.")
}

export default function YouTubeAutomationWorkspace() {
  const [stage, setStage] = useState("research")
  const [niche, setNiche] = useState("")
  const [channels, setChannels] = useState("")
  const [topic, setTopic] = useState("")
  const [direction, setDirection] = useState("")
  const [result, setResult] = useState(null)
  const [lastJobId, setLastJobId] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [views, setViews] = useState("")
  const [rpm, setRpm] = useState("")
  const [ctr, setCtr] = useState("")
  const [avd, setAvd] = useState("")
  const [impressions, setImpressions] = useState("")
  const [retention, setRetention] = useState("")
  const [subsGained, setSubsGained] = useState("")
  const [trafficSource, setTrafficSource] = useState("")

  const revenue = useMemo(() => {
    if (views.trim() === "" || rpm.trim() === "") return "—"
    const v = Number(views), r = Number(rpm)
    if (!Number.isFinite(v) || !Number.isFinite(r) || v < 0 || r < 0) return "—"
    return "£" + ((v / 1000) * r).toLocaleString("en-GB", { maximumFractionDigits: 2 })
  }, [views, rpm])

  async function execute() {
    setBusy(true); setResult(null); setLastJobId(""); setMessage("Saving the job and asking local Qwen…")
    try {
      const data = await runLocalAI(stage, {
        niche, channels, topic, direction,
        previousResult: result,
        metrics: {
          views: views.trim() || null,
          assumed_rpm: rpm.trim() || null,
          impressions: impressions.trim() || null,
          click_through_rate_percent: ctr.trim() || null,
          average_view_duration: avd.trim() || null,
          audience_retention_percent: retention.trim() || null,
          subscribers_gained: subsGained.trim() || null,
          traffic_source: trafficSource.trim() || null,
        },
      }, setLastJobId)
      setResult(data)
      setMessage("Done. The result is saved. Use it to choose the next test.")
    } catch (e) {
      setMessage(e?.message || String(e))
    } finally { setBusy(false) }
  }

  const current = STAGES.find((x) => x[0] === stage) || STAGES[0]

  return (
    <EnterpriseShell active="youtube" eyebrow="YouTube">
      <main className="yt-auto">
        <header className="yt-head">
          <div><div className="yt-kicker">MAKE VIDEOS PEOPLE CHOOSE TO WATCH</div><h1>YouTube workspace</h1><p>Research demand, study repeatable formats, build an original video plan, prepare the upload and learn from real results. Actual upload still happens in YouTube unless a verified publishing connection is configured.</p></div>
          <div className="yt-reality"><b>Our rule</b><span>Automate the repetitive work. Keep the ideas original and the quality high.</span></div>
        </header>

        <nav className="yt-stages">
          {STAGES.map(([id, label, copy]) => <button key={id} className={stage === id ? "active" : ""} onClick={() => setStage(id)}><strong>{label}</strong><small>{copy}</small></button>)}
        </nav>

        <section className="yt-grid">
          <article className="yt-panel">
            <div className="yt-panel-head"><div><div className="yt-k">STEP {STAGES.findIndex((x) => x[0] === stage) + 1} OF {STAGES.length}</div><h2>{current[1]}</h2><p>{current[2]}</p></div><span className="yt-status">{busy ? "WORKING" : "READY"}</span></div>
            <div className="yt-fields">
              <label>Niche<input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. luxury homes, history, football stories" /></label>
              <label>Examples to learn from<textarea value={channels} onChange={(e) => setChannels(e.target.value)} placeholder="Paste channel names, video titles or URLs — one per line. Leave blank if you want Cornerstone to suggest examples." /></label>
              <label>Topic<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What should the video be about?" /></label>
              <label>Anything specific to consider<textarea value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Optional: audience, style, budget, time available, or what you want to avoid." /></label>
            </div>
            <button className="yt-primary" disabled={busy} onClick={execute}>{busy ? "Working…" : stage === "research" ? "Find opportunities" : stage === "make" ? "Build the video" : stage === "results" ? "Diagnose results" : "Run this step"}</button>
            {message && <div className="yt-message" role="status">{message}</div>}
            {lastJobId && <a className="yt-other-ai-link" href={"/system/ai-anywhere?job=" + encodeURIComponent(lastJobId)}>Need to switch AI? Continue this saved job with another AI →</a>}
          </article>

          <aside className="yt-side">
            <article className="yt-panel"><div className="yt-k">Start from a real example</div><p className="yt-note">Paste a public YouTube link to study its promise, opening, story, pacing and visuals. We learn the method and build something original — we do not copy the video.</p><a className="yt-primary" href="/content/remake" style={{display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none"}}>Analyse a video</a></article>
            <article className="yt-panel"><div className="yt-k">From idea to improvement</div><div className="yt-flow">{["Find demand","Choose a topic","Study examples","Choose a format","Make original work","Publish","Measure","Learn","Repeat"].map((x, i) => <div key={x}><span>{i + 1}</span><b>{x}</b>{i < 8 && <em>→</em>}</div>)}</div></article>
            <article className="yt-panel"><div className="yt-k">Estimate possible ad revenue</div><div className="yt-revenue-grid"><label>Monthly views<input inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value)} placeholder="e.g. 100000" /></label><label>Assumed RPM<input inputMode="decimal" value={rpm} onChange={(e) => setRpm(e.target.value)} /></label><div><span>Estimated ad revenue</span><strong>{revenue}</strong><small>Planning estimate only. RPM is an operator assumption.</small></div></div></article>
            <article className="yt-panel"><div className="yt-k">Review a published video</div><p className="yt-note">Enter what YouTube Studio actually reports. The review step will use these values; a blank field stays unknown.</p><div className="yt-mini-grid">
              <label>Impressions<input inputMode="numeric" value={impressions} onChange={(e) => setImpressions(e.target.value)} placeholder="e.g. 12000" /></label>
              <label>CTR %<input inputMode="decimal" value={ctr} onChange={(e) => setCtr(e.target.value)} placeholder="e.g. 6.5" /></label>
              <label>Views<input inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value)} placeholder="e.g. 1500" /></label>
              <label>Average view duration<input value={avd} onChange={(e) => setAvd(e.target.value)} placeholder="e.g. 5:42" /></label>
              <label>Average retention %<input inputMode="decimal" value={retention} onChange={(e) => setRetention(e.target.value)} placeholder="e.g. 42" /></label>
              <label>Subscribers gained<input inputMode="numeric" value={subsGained} onChange={(e) => setSubsGained(e.target.value)} placeholder="e.g. 15" /></label>
              <label>Top traffic source<input value={trafficSource} onChange={(e) => setTrafficSource(e.target.value)} placeholder="Browse, search, suggested…" /></label>
            </div><p className="yt-note">Use CTR with impressions and viewer satisfaction. A high CTR with weak retention can mean the package is stronger than the video experience.</p></article>
          </aside>
        </section>

        {result && <section className="yt-panel yt-result"><div className="yt-result-head"><div><div className="yt-k">WORK SAVED</div><h2>Your result</h2><p>Read this first. Open the technical version only when you need to inspect the raw data.</p></div><button type="button" className="yt-copy-result" onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(result, null, 2)); setMessage("Result copied.") } catch { setMessage("Copy was blocked by the browser. Use the technical result below.") } }}>Copy result</button></div>
          <ReadableResult data={result} />
          <details className="yt-raw-result"><summary>Show technical result (JSON)</summary><pre>{JSON.stringify(result, null, 2)}</pre></details></section>}

        <footer className="yt-sources"><b>YouTube guardrails</b><span>Original, useful and materially varied content matters. Repetitive, mass-produced or minimally transformed material can be ineligible for monetisation.</span><div><a href="https://support.google.com/youtube/answer/1311392" target="_blank" rel="noreferrer">Monetisation policy</a><a href="https://support.google.com/youtube/answer/16767369" target="_blank" rel="noreferrer">Impressions & CTR</a><a href="https://support.google.com/youtube/answer/9314414" target="_blank" rel="noreferrer">Analytics</a></div></footer>
      </main>
    </EnterpriseShell>
  )
}