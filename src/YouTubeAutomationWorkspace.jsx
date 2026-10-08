import React, { useMemo, useState } from "react"
import { supabase } from "./supabase"
import EnterpriseShell from "./EnterpriseShell.jsx"

const STAGES = [
  ["research", "Research", "Find channels, topics and demand."],
  ["niche", "Niche", "Choose a market worth testing."],
  ["format", "Format", "Find repeatable video structures."],
  ["patterns", "Patterns", "Compare winners and extract what repeats."],
  ["make", "Make", "Build title, thumbnail, script and visual plan."],
  ["results", "Results", "Read performance and decide the next test."],
]
const QWEN_MODEL = "mlx-community/Qwen3.5-9B-4bit"
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function parse(raw) {
  const text = String(raw || "").replace(/```json|```/gi, "").replace(/<think>[\\s\\S]*?<\\/think>/gi, "").trim()
  try { return JSON.parse(text) } catch {}
  const match = text.match(/\\{[\\s\\S]*\\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  return { text }
}

async function runLocalAI(stage, inputs) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) throw new Error("Please sign in again.")
  const systemPrompt = [
    "You are Cornerstone YouTube Automation.",
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
    userPrompt = "Build one original YouTube video from the research context.\nNICHE: " + (inputs.niche || "Not set") + "\nTOPIC: " + (inputs.topic || "Not set") + "\nCHANNELS/REFERENCES: " + (inputs.channels || "None") + "\nDIRECTION: " + (inputs.direction || "Build the strongest original video.") + "\nReturn JSON: {audience,viewer_outcome,why_people_click,belief_reason,title_options:[],thumbnail_concepts:[],opening_hook,video_length_target,outline:[],script,visual_plan:[],voiceover_direction,editing_notes,fact_check_list:[],originality_check:[],next_step}"
  } else {
    userPrompt = "Diagnose YouTube performance.\nVIDEO/NICHE: " + (inputs.niche || "Not set") + "\nTOPIC: " + (inputs.topic || "Not set") + "\nRESULTS: " + (inputs.direction || "No results supplied") + "\nReturn JSON: {diagnosis:" + "\"PACKAGING|RETENTION|TOPIC|AUDIENCE|PRODUCTION|UNKNOWN\"" + ",what_is_strong:[],what_is_weak:[],likely_explanations:[],next_tests:[],metrics_to_watch:[],decision_rule}"
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
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [views, setViews] = useState("")
  const [rpm, setRpm] = useState("4")
  const [ctr, setCtr] = useState("")
  const [avd, setAvd] = useState("")

  const revenue = useMemo(() => {
    const v = Number(views), r = Number(rpm)
    if (!Number.isFinite(v) || !Number.isFinite(r) || v < 0 || r < 0) return "—"
    return "£" + ((v / 1000) * r).toLocaleString("en-GB", { maximumFractionDigits: 2 })
  }, [views, rpm])

  async function execute() {
    setBusy(true); setResult(null); setMessage("Working with your Mac’s local Qwen…")
    try {
      const data = await runLocalAI(stage, { niche, channels, topic, direction })
      setResult(data)
      setMessage("Done. Use the result to choose the next test.")
    } catch (e) {
      setMessage(e?.message || String(e))
    } finally { setBusy(false) }
  }

  const current = STAGES.find((x) => x[0] === stage) || STAGES[0]

  return (
    <EnterpriseShell active="youtube" eyebrow="YouTube">
      <main className="yt-auto">
        <header className="yt-head">
          <div><div className="yt-kicker">YOUTUBE</div><h1>YouTube Automation</h1><p>Build a repeatable media operation: find demand, study winners, make original videos, package them well, publish, measure and improve.</p></div>
          <div className="yt-reality"><b>The rule</b><span>Automate the work, not the quality.</span></div>
        </header>

        <nav className="yt-stages">
          {STAGES.map(([id, label, copy]) => <button key={id} className={stage === id ? "active" : ""} onClick={() => setStage(id)}><strong>{label}</strong><small>{copy}</small></button>)}
        </nav>

        <section className="yt-grid">
          <article className="yt-panel">
            <div className="yt-panel-head"><div><div className="yt-k">Your job</div><h2>{current[1]}</h2><p>{current[2]}</p></div><span className="yt-status">{busy ? "WORKING" : "READY"}</span></div>
            <div className="yt-fields">
              <label>Niche<input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. luxury homes, history, football stories" /></label>
              <label>Channels or videos to study<textarea value={channels} onChange={(e) => setChannels(e.target.value)} placeholder="Paste channel names, video titles or URLs — one per line." /></label>
              <label>Topic<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What should the video be about?" /></label>
              <label>Your direction<textarea value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="What are you trying to achieve?" /></label>
            </div>
            <button className="yt-primary" disabled={busy} onClick={execute}>{busy ? "Working…" : stage === "research" ? "Find opportunities" : stage === "make" ? "Build the video" : stage === "results" ? "Diagnose results" : "Run this step"}</button>
            {message && <div className="yt-message">{message}</div>}
          </article>

          <aside className="yt-side">
            <article className="yt-panel"><div className="yt-k">The whole system</div><div className="yt-flow">{["Research","Niche","Channels","Formats","Patterns","Make","Publish","Results","Learn"].map((x, i) => <div key={x}><span>{i + 1}</span><b>{x}</b>{i < 8 && <em>→</em>}</div>)}</div></article>
            <article className="yt-panel"><div className="yt-k">Revenue planner</div><div className="yt-revenue-grid"><label>Monthly views<input inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value)} placeholder="100000" /></label><label>Assumed RPM<input inputMode="decimal" value={rpm} onChange={(e) => setRpm(e.target.value)} /></label><div><span>Estimated ad revenue</span><strong>{revenue}</strong><small>Planning estimate only. RPM is an operator assumption.</small></div></div></article>
            <article className="yt-panel"><div className="yt-k">Quick diagnosis</div><div className="yt-mini-grid"><label>CTR %<input value={ctr} onChange={(e) => setCtr(e.target.value)} placeholder="e.g. 6.5" /></label><label>Average view duration<input value={avd} onChange={(e) => setAvd(e.target.value)} placeholder="e.g. 5:42" /></label></div><p className="yt-note">Read CTR together with impressions and viewer satisfaction. A high CTR with weak retention can mean the package is stronger than the video experience.</p></article>
          </aside>
        </section>

        {result && <section className="yt-panel yt-result"><div className="yt-k">Result</div><pre>{JSON.stringify(result, null, 2)}</pre></section>}

        <footer className="yt-sources"><b>YouTube guardrails</b><span>Original, useful and materially varied content matters. Repetitive, mass-produced or minimally transformed material can be ineligible for monetisation.</span><div><a href="https://support.google.com/youtube/answer/1311392" target="_blank" rel="noreferrer">Monetisation policy</a><a href="https://support.google.com/youtube/answer/16767369" target="_blank" rel="noreferrer">Impressions & CTR</a><a href="https://support.google.com/youtube/answer/9314414" target="_blank" rel="noreferrer">Analytics</a></div></footer>
      </main>
    </EnterpriseShell>
  )
}