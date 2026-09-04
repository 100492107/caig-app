import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const STAGES = ["Clients", "Brief", "Factory", "Review", "Delivery"];
const MODES = [
  { id: "content_week", label: "Content week", description: "1 source brief → 5 publish-ready pieces", mode: "short_form", outputs: 5 },
  { id: "short_form_pack", label: "Short-form pack", description: "1 source → 3 short-form edits", mode: "short_form", outputs: 3 },
  { id: "long_form", label: "Long-form production", description: "One finished long-form asset", mode: "long_form", outputs: 1 },
];

function Shell({ eyebrow, title, copy, actions, children }) {
  return <div className="tb-stage-workspace">
    <div className="stage-surface-head">
      <div>
        <div className="tb-small-label">{eyebrow}</div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      {actions}
    </div>
    {children}
  </div>;
}
function Card({ children }) { return <section className="tb-panel staged-card">{children}</section>; }
function Button({ children, primary = false, ...props }) { return <button {...props} className={primary ? "tb-primary" : "tb-secondary"}>{children}</button>; }

const emptyForm = { name: "", contact: "", email: "", title: "", sourceUrl: "", offer: "", audience: "", deliverable: "Content week", notes: "" };

export default function ClientDeliveryStaged({ stage }) {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [mode, setMode] = useState(MODES[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [readyJobs, setReadyJobs] = useState([]);

  async function load() {
    const [{ data: ws }, { data: recentProjects }, { data: jobs }] = await Promise.all([
      supabase.from("track_b_workspaces").select("id,name,slug,workspace_type,status,created_at").eq("workspace_type", "client").order("created_at", { ascending: false }).limit(50),
      supabase.from("track_b_content_projects").select("id,workspace_id,title,source_type,source_url,brief,status,created_at,updated_at").eq("source_type", "client_brief").order("created_at", { ascending: false }).limit(100),
      supabase.from("track_b_production_jobs").select("id,project_id,mode,target_duration_seconds,output_count,status,created_at,completed_at").order("created_at", { ascending: false }).limit(100),
    ]);
    setClients(ws || []);
    setProjects(recentProjects || []);
    setReadyJobs(jobs || []);
    return ws || [];
  }
  useEffect(() => { load(); }, []);

  const clientProjects = useMemo(() => selectedClient ? projects.filter((p) => p.workspace_id === selectedClient.id) : [], [projects, selectedClient]);
  const selectedProject = clientProjects[0] || null;
  const jobsForProject = useMemo(() => selectedProject ? readyJobs.filter((j) => j.project_id === selectedProject.id) : [], [readyJobs, selectedProject]);

  function update(key, value) { setForm((x) => ({ ...x, [key]: value })); }

  async function createClient() {
    if (!form.name.trim()) { setMessage("Add the client name first."); return; }
    setBusy(true); setMessage("Creating client workspace…");
    const slug = `${form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
    const { data, error } = await supabase.from("track_b_workspaces").insert({ name: form.name.trim(), slug, workspace_type: "client", status: "active" }).select("id,name,slug,workspace_type,status,created_at").single();
    if (error) { setMessage(error.message); setBusy(false); return; }
    setSelectedClient(data); setClients((x) => [data, ...x]);
    setMessage("Client workspace created. Lock the brief next.");
    setBusy(false);
  }

  async function createProject() {
    if (!selectedClient) { setMessage("Select a client first."); return; }
    if (!form.title.trim()) { setMessage("Give the deliverable a working title."); return; }
    setBusy(true); setMessage("Locking client brief…");
    const brief = {
      contact: form.contact.trim(), email: form.email.trim(), offer: form.offer.trim(), audience: form.audience.trim(), deliverable: form.deliverable,
      notes: form.notes.trim(), commercial_mode: mode.id, promised_outputs: mode.outputs,
    };
    const { data, error } = await supabase.from("track_b_content_projects").insert({ workspace_id: selectedClient.id, title: form.title.trim(), source_type: "client_brief", source_url: form.sourceUrl.trim() || null, brief, status: "planned" }).select("*").single();
    if (error) { setMessage(error.message); setBusy(false); return; }
    setProjects((x) => [data, ...x]); setMessage("Brief locked. Build the production package."); setBusy(false);
  }

  async function queueFactory() {
    if (!selectedProject) { setMessage("Lock a client brief first."); return; }
    setBusy(true); setMessage("Queuing client production…");
    const { error } = await supabase.from("track_b_production_jobs").insert({
      project_id: selectedProject.id,
      mode: mode.mode,
      target_duration_seconds: mode.id === "long_form" ? 900 : 45,
      output_count: mode.outputs,
      provider_strategy: "auto",
      estimated_credits: 0,
      estimated_compute_tier: "medium",
      config: { commercial_package: mode.id, client_name: selectedClient?.name || "", source_url: form.sourceUrl.trim() || selectedProject.source_url || null },
      status: "queued",
    });
    if (error) { setMessage(error.message); setBusy(false); return; }
    await supabase.from("track_b_content_projects").update({ status: "in_production" }).eq("id", selectedProject.id);
    await load();
    setMessage(`${mode.label} queued. Keep the client promise attached to this project.`);
    setBusy(false);
  }

  async function markApproved() {
    if (!selectedProject) { setMessage("There is no client project to approve."); return; }
    setBusy(true);
    const { error } = await supabase.from("track_b_content_projects").update({ status: "approved" }).eq("id", selectedProject.id);
    if (error) setMessage(error.message); else { setProjects((x) => x.map((p) => p.id === selectedProject.id ? { ...p, status: "approved" } : p)); setMessage("Client package approved. Delivery can be closed."); }
    setBusy(false);
  }

  function reset() { setForm(emptyForm); setSelectedClient(null); setMessage(""); }

  if (stage === 0) return <Shell eyebrow="01 · CLIENTS" title="Put the commercial relationship in the system." copy="One client workspace per account. Keep the client, brief, production and delivery trail together."><Card>
    <div className="staged-grid staged-grid-2">
      <div className="staged-field"><label>Client / business</label><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Client name" /></div>
      <div className="staged-field"><label>Primary contact</label><input value={form.contact} onChange={(e) => update("contact", e.target.value)} placeholder="Name" /></div>
      <div className="staged-field"><label>Email</label><input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="contact@company.com" /></div>
    </div>
    <div className="staged-actions"><Button primary disabled={busy} onClick={createClient}>{busy ? "Creating…" : "Create client workspace"}</Button><Button onClick={reset}>Reset</Button></div>
    {message && <div className="staged-status">{message}</div>}
    <div className="staged-divider" />
    <div className="staged-list">{clients.map((c) => <button className="staged-row-button" key={c.id} onClick={() => { setSelectedClient(c); setForm((x) => ({ ...x, name: c.name })); setMessage(`Selected ${c.name}.`); }}><div><strong>{c.name}</strong><span>{c.workspace_type} · {c.status}</span></div><span>Open</span></button>)}{!clients.length && <div className="staged-empty">No client workspaces yet.</div>}</div>
  </Card></Shell>;

  if (stage === 1) return <Shell eyebrow="02 · BRIEF" title="Define the promise before making the content." copy="The deliverable, audience and commercial job are part of the project record — not a loose note."><Card>
    <div className="staged-context-row"><span>Client</span><strong>{selectedClient?.name || "Select a client"}</strong><span>Projects</span><strong>{clientProjects.length}</strong></div>
    <div className="staged-grid staged-grid-2">
      <div className="staged-field"><label>Deliverable title</label><input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. September content package" /></div>
      <div className="staged-field"><label>Source URL</label><input value={form.sourceUrl} onChange={(e) => update("sourceUrl", e.target.value)} placeholder="Video, article, folder or brief URL" /></div>
      <div className="staged-field"><label>What is being sold?</label><input value={form.offer} onChange={(e) => update("offer", e.target.value)} placeholder="Offer / service / commercial outcome" /></div>
      <div className="staged-field"><label>Who is it for?</label><input value={form.audience} onChange={(e) => update("audience", e.target.value)} placeholder="Audience" /></div>
    </div>
    <div className="staged-field"><label>Production notes</label><textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Proof, positioning, references, constraints, brand notes…" /></div>
    <div className="staged-grid staged-grid-3">{MODES.map((m) => <button className={`staged-choice ${mode.id === m.id ? "is-selected" : ""}`} key={m.id} onClick={() => { setMode(m); update("deliverable", m.label); }}><strong>{m.label}</strong><span>{m.description}</span></button>)}</div>
    <div className="staged-actions"><Button primary disabled={busy || !selectedClient} onClick={createProject}>{busy ? "Saving…" : "Lock client brief"}</Button></div>
    {message && <div className="staged-status">{message}</div>}
    {clientProjects.length > 0 && <div className="staged-list">{clientProjects.slice(0, 12).map((p) => <div className="staged-row" key={p.id}><div><strong>{p.title}</strong><span>{p.status} · {new Date(p.created_at).toLocaleString()}</span></div><span>{p.brief?.deliverable || "Client package"}</span></div>)}</div>}
  </Card></Shell>;

  if (stage === 2) return <Shell eyebrow="03 · FACTORY" title="Turn the promise into queued production." copy="The same production engine now has a commercial front door: client → brief → job → output."><Card>
    <div className="staged-context-row"><span>Client</span><strong>{selectedClient?.name || "—"}</strong><span>Project</span><strong>{selectedProject?.title || "No brief locked"}</strong></div>
    <div className="staged-grid staged-grid-3">{MODES.map((m) => <button className={`staged-choice ${mode.id === m.id ? "is-selected" : ""}`} key={m.id} onClick={() => setMode(m)}><strong>{m.label}</strong><span>{m.description}</span></button>)}</div>
    <div className="staged-actions"><Button primary disabled={busy || !selectedProject} onClick={queueFactory}>{busy ? "Queueing…" : "Queue production"}</Button></div>
    {message && <div className="staged-status">{message}</div>}
    <div className="staged-list">{jobsForProject.map((j) => <div className="staged-row" key={j.id}><div><strong>{j.mode} · {j.output_count} output{j.output_count === 1 ? "" : "s"}</strong><span>{j.status} · {new Date(j.created_at).toLocaleString()}</span></div><span>{j.completed_at ? "Completed" : "In motion"}</span></div>)}{!jobsForProject.length && <div className="staged-empty">No production jobs on this project yet.</div>}</div>
  </Card></Shell>;

  if (stage === 3) return <Shell eyebrow="04 · REVIEW" title="Review against the promise, not the process." copy="Nothing is client-ready just because a worker finished. The delivery record is where we decide whether the output is good enough to ship."><Card>
    <div className="staged-context-row"><span>Client</span><strong>{selectedClient?.name || "—"}</strong><span>Project</span><strong>{selectedProject?.title || "—"}</strong><span>Status</span><strong>{selectedProject?.status || "—"}</strong></div>
    <div className="staged-grid staged-grid-3"><div className="position"><strong>{mode.label}</strong><p>{mode.description}</p></div><div className="position"><strong>{jobsForProject.filter((j) => j.status === "completed").length}</strong><p>Completed production jobs</p></div><div className="position"><strong>{jobsForProject.reduce((n, j) => n + (j.output_count || 0), 0)}</strong><p>Total planned outputs</p></div></div>
    <div className="staged-actions"><Button primary disabled={busy || !selectedProject} onClick={markApproved}>Approve for delivery</Button></div>
    {message && <div className="staged-status">{message}</div>}
  </Card></Shell>;

  return <Shell eyebrow="05 · DELIVERY" title="Close the loop with the client." copy="The output is only useful when it leaves the factory, reaches the client and creates the next commercial action."><Card>
    <div className="staged-context-row"><span>Client</span><strong>{selectedClient?.name || "—"}</strong><span>Project</span><strong>{selectedProject?.title || "—"}</strong><span>Status</span><strong>{selectedProject?.status || "—"}</strong></div>
    <div className="staged-grid staged-grid-2"><div className="position"><strong>Delivery checklist</strong><p>Confirm outputs · package links · naming · client handoff · next content date.</p></div><div className="position"><strong>Next commercial action</strong><p>Ask what should be produced next while this package is being used.</p></div></div>
    <div className="staged-actions"><Button onClick={() => setMessage("Delivery marked as ready. Send the approved output and ask for the next brief.")}>Mark delivery ready</Button><Button primary onClick={async () => { await markApproved(); setMessage("Client relationship closed for this package. Move immediately to the next brief."); }}>Close package</Button></div>
    {message && <div className="staged-status">{message}</div>}
  </Card></Shell>;
}
