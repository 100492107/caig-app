import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

const STORAGE_KEY = "caig_owned_profiles_v1";

const DEFAULTS = [
  {
    id: "cara",
    name: "Cara",
    type: "Creator persona",
    role: "Owned face · British, direct, dry",
    platforms: [
      { network: "Instagram", handle: "", url: "", status: "planned" },
      { network: "TikTok", handle: "", url: "", status: "planned" },
      { network: "Fanvue", handle: "", url: "", status: "planned" },
      { network: "X", handle: "", url: "", status: "planned" },
    ],
    notes: "Use Creators flow when content needs Cara's voice. Monetise via Fanvue / affiliate in bio once posting is consistent.",
  },
  {
    id: "lila",
    name: "Lila",
    type: "Creator persona",
    role: "Owned face · warm, measured, understated",
    platforms: [
      { network: "Instagram", handle: "", url: "", status: "planned" },
      { network: "TikTok", handle: "", url: "", status: "planned" },
      { network: "Fanvue", handle: "", url: "", status: "planned" },
    ],
    notes: "Pair with Cara for duo content or run solo softer lifestyle angles.",
  },
  {
    id: "youtube_main",
    name: "Main YouTube",
    type: "Long-form channel",
    role: "Primary long-form + Shorts home",
    platforms: [
      { network: "YouTube", handle: "", url: "", status: "planned" },
      { network: "YouTube Shorts", handle: "", url: "", status: "planned" },
    ],
    notes: "Content Engine packages target this channel. Discover → Analyse → Build → Multiply → Publish here first.",
  },
  {
    id: "tiktok_brand",
    name: "Brand TikTok",
    type: "Short-form",
    role: "Clips and tests from Multiply",
    platforms: [
      { network: "TikTok", handle: "", url: "", status: "planned" },
      { network: "Instagram Reels", handle: "", url: "", status: "planned" },
    ],
    notes: "Use for Shorts derivatives. Track which hooks transfer from long-form.",
  },
];

const STATUSES = ["planned", "active", "paused", "retired"];

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function saveLocal(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {}
}

export default function ProfileChannelsWorkspace() {
  const [profiles, setProfiles] = useState(() => loadLocal());
  const [activeId, setActiveId] = useState(() => loadLocal()[0]?.id || "cara");
  const [message, setMessage] = useState("");
  const active = profiles.find((p) => p.id === activeId) || profiles[0];

  useEffect(() => {
    saveLocal(profiles);
  }, [profiles]);

  function updateActive(patch) {
    setProfiles((rows) => rows.map((p) => (p.id === active.id ? { ...p, ...patch } : p)));
  }

  function updatePlatform(index, patch) {
    const platforms = active.platforms.map((pl, i) => (i === index ? { ...pl, ...patch } : pl));
    updateActive({ platforms });
  }

  function addPlatform() {
    updateActive({
      platforms: [...active.platforms, { network: "New network", handle: "", url: "", status: "planned" }],
    });
  }

  function addProfile() {
    const id = `profile_${Date.now()}`;
    const row = {
      id,
      name: "New profile",
      type: "Channel",
      role: "Describe what this is for",
      platforms: [{ network: "YouTube", handle: "", url: "", status: "planned" }],
      notes: "",
    };
    setProfiles((rows) => [...rows, row]);
    setActiveId(id);
    setMessage("New profile added. Fill handles and URLs so the engine can reference them.");
  }

  return (
    <div className="pf">
      <style>{`
        .pf{--panel:#161922;--panel2:#12151c;--line:rgba(255,255,255,.08);--text:#f3f1eb;--muted:#9a9faa;--soft:#6e7582;--gold:#d4b56a;--gold-soft:rgba(212,181,106,.12);width:100%;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif}
        .pf-hero{margin-bottom:18px}
        .pf-kicker{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);font-weight:800}
        .pf-title{margin:8px 0 0;font-size:clamp(28px,4vw,40px);line-height:1;letter-spacing:-.04em;font-weight:850}
        .pf-help{margin:10px 0 0;max-width:60ch;color:var(--muted);font-size:14px;line-height:1.5}
        .pf-grid{display:grid;grid-template-columns:240px minmax(0,1fr);gap:14px}
        @media(max-width:900px){.pf-grid{grid-template-columns:1fr}}
        .pf-list,.pf-main{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:14px}
        .pf-list-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .pf-list-head h2{margin:0;font-size:13px;font-weight:800}
        .pf-add{border:0;background:var(--gold-soft);color:var(--gold);border-radius:8px;padding:7px 10px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}
        .pf-item{width:100%;text-align:left;border:1px solid transparent;background:transparent;color:var(--muted);border-radius:12px;padding:11px 12px;cursor:pointer;font:inherit;margin-bottom:4px}
        .pf-item strong{display:block;font-size:13px;color:#eceae4}
        .pf-item span{display:block;margin-top:3px;font-size:11px;color:var(--soft)}
        .pf-item.is-active{background:var(--gold-soft);border-color:rgba(212,181,106,.28)}
        .pf-item.is-active strong{color:#f3e7c8}
        .pf-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media(max-width:700px){.pf-fields{grid-template-columns:1fr}}
        .pf-field{display:grid;gap:6px}
        .pf-field span{font-size:11px;font-weight:700;color:#c4c8d0}
        .pf-field input,.pf-field select,.pf-field textarea{width:100%;min-height:44px;padding:10px 12px;border-radius:11px;border:1px solid var(--line);background:var(--panel2);color:var(--text);font:inherit;font-size:13px}
        .pf-field textarea{min-height:90px;resize:vertical}
        .pf-section{margin-top:18px}
        .pf-section h3{margin:0 0 10px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--soft);font-weight:800}
        .pf-plat{display:grid;grid-template-columns:1.1fr 1fr 1.4fr .9fr;gap:8px;margin-bottom:8px}
        @media(max-width:800px){.pf-plat{grid-template-columns:1fr}}
        .pf-plat input,.pf-plat select{min-height:42px;padding:9px 11px;border-radius:10px;border:1px solid var(--line);background:var(--panel2);color:var(--text);font:inherit;font-size:12px}
        .pf-money{margin-top:16px;padding:14px;border-radius:14px;border:1px solid rgba(212,181,106,.25);background:var(--gold-soft)}
        .pf-money strong{display:block;color:#f0e2bc;font-size:13px}
        .pf-money p{margin:6px 0 0;color:#cfc3a4;font-size:12px;line-height:1.5}
        .pf-status{margin-top:12px;font-size:12px;color:var(--muted)}
        .pf-btn{min-height:42px;padding:0 14px;border-radius:11px;border:1px solid var(--line);background:var(--panel2);color:#e8e6df;font:inherit;font-size:12px;font-weight:750;cursor:pointer}
        .pf-btn.primary{background:var(--gold);border-color:var(--gold);color:#1a160e;font-weight:850}
      `}</style>

      <div className="pf-hero">
        <div className="pf-kicker">Owned media map</div>
        <h1 className="pf-title">Profiles</h1>
        <p className="pf-help">
          The accounts and personas the Content Engine works for. Fill handles and links so packages know where they ship and how they can make money.
        </p>
      </div>

      <div className="pf-grid">
        <aside className="pf-list">
          <div className="pf-list-head">
            <h2>Profiles</h2>
            <button type="button" className="pf-add" onClick={addProfile}>+ Add</button>
          </div>
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pf-item${p.id === active?.id ? " is-active" : ""}`}
              onClick={() => setActiveId(p.id)}
            >
              <strong>{p.name}</strong>
              <span>{p.type}</span>
            </button>
          ))}
        </aside>

        {active && (
          <section className="pf-main">
            <div className="pf-fields">
              <label className="pf-field">
                <span>Name</span>
                <input value={active.name} onChange={(e) => updateActive({ name: e.target.value })} />
              </label>
              <label className="pf-field">
                <span>Type</span>
                <input value={active.type} onChange={(e) => updateActive({ type: e.target.value })} />
              </label>
              <label className="pf-field" style={{ gridColumn: "1 / -1" }}>
                <span>Role in the system</span>
                <input value={active.role} onChange={(e) => updateActive({ role: e.target.value })} />
              </label>
              <label className="pf-field" style={{ gridColumn: "1 / -1" }}>
                <span>Notes · money path · positioning</span>
                <textarea value={active.notes} onChange={(e) => updateActive({ notes: e.target.value })} />
              </label>
            </div>

            <div className="pf-section">
              <h3>Social accounts</h3>
              {active.platforms.map((pl, index) => (
                <div className="pf-plat" key={`${active.id}-${index}`}>
                  <input value={pl.network} onChange={(e) => updatePlatform(index, { network: e.target.value })} placeholder="Network" />
                  <input value={pl.handle} onChange={(e) => updatePlatform(index, { handle: e.target.value })} placeholder="@handle" />
                  <input value={pl.url} onChange={(e) => updatePlatform(index, { url: e.target.value })} placeholder="https://…" />
                  <select value={pl.status} onChange={(e) => updatePlatform(index, { status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
              <button type="button" className="pf-btn" onClick={addPlatform}>Add platform</button>
            </div>

            <div className="pf-money">
              <strong>How this profile can make money</strong>
              <p>
                {active.id === "cara" || active.id === "lila"
                  ? "Post consistently → grow attention → Fanvue, affiliate links, or paid collabs. Creators packages are built for this."
                  : active.type.toLowerCase().includes("youtube") || active.name.toLowerCase().includes("youtube")
                    ? "Long-form builds trust and search. Shorts feed the top of funnel. Money comes from ads, affiliates, sponsors, and products once views are real."
                    : "Ship content here, measure what holds attention, then attach one monetisation test (affiliate, shop, lead, sponsorship)."}
              </p>
            </div>

            <div className="pf-status">{message || "Saved on this device. Profiles are the map the engine ships into."}</div>
          </section>
        )}
      </div>
    </div>
  );
}
