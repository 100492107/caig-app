import React, { useEffect, useState } from "react";
import {
  loadProfiles,
  saveProfiles,
  loadEarnings,
  saveEarnings,
  formatMoney,
  profileStats,
} from "./ownedMediaStore.js";

const STATUSES = ["planned", "active", "paused", "retired"];

export default function ProfileChannelsWorkspace() {
  const [profiles, setProfiles] = useState(() => loadProfiles());
  const [activeId, setActiveId] = useState(() => loadProfiles()[0]?.id || "cara");
  const [earnings, setEarnings] = useState(() => loadEarnings());
  const [earnAmount, setEarnAmount] = useState("");
  const [earnNote, setEarnNote] = useState("");
  const [message, setMessage] = useState("");
  const active = profiles.find((p) => p.id === activeId) || profiles[0];
  const stats = profileStats(profiles);

  useEffect(() => { saveProfiles(profiles); }, [profiles]);
  useEffect(() => { saveEarnings(earnings); }, [earnings]);

  function updateActive(patch) {
    setProfiles((rows) => rows.map((p) => (p.id === active.id ? { ...p, ...patch } : p)));
  }
  function updatePlatform(index, patch) {
    const platforms = active.platforms.map((pl, i) => (i === index ? { ...pl, ...patch } : pl));
    updateActive({ platforms });
  }
  function addPlatform() {
    updateActive({ platforms: [...(active.platforms || []), { network: "New network", handle: "", url: "", status: "planned" }] });
  }
  function addProfile() {
    const id = `profile_${Date.now()}`;
    setProfiles((rows) => [...rows, { id, name: "New profile", type: "Channel", role: "Describe what this is for", platforms: [{ network: "YouTube", handle: "", url: "", status: "planned" }], notes: "" }]);
    setActiveId(id);
    setMessage("New profile added. Paste the exact public URL.");
  }
  function addEarning() {
    const n = Number(String(earnAmount).replace(/[^0-9.-]/g, ""));
    if (!n || Number.isNaN(n)) { setMessage("Enter a valid amount."); return; }
    const entry = { id: `e_${Date.now()}`, amount: n, note: earnNote.trim() || "Manual entry", profileId: active?.id, profileName: active?.name, at: new Date().toISOString() };
    setEarnings((prev) => ({ ...prev, total: (Number(prev.total) || 0) + n, entries: [entry, ...(prev.entries || [])].slice(0, 50) }));
    setEarnAmount("");
    setEarnNote("");
    setMessage(`Logged ${formatMoney(n, earnings.currency)}.`);
  }

  return (
    <div className="pf">
      <style>{`
        .pf{--panel:#161922;--panel2:#12151c;--line:rgba(255,255,255,.08);--text:#f3f1eb;--muted:#9a9faa;--soft:#6e7582;--gold:#d4b56a;--gold-soft:rgba(212,181,106,.12);width:100%;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif;box-sizing:border-box}
        .pf *,.pf *::before,.pf *::after{box-sizing:border-box}
        .pf-hero{margin-bottom:16px}
        .pf-kicker{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);font-weight:800}
        .pf-title{margin:8px 0 0;font-size:clamp(28px,4vw,40px);line-height:1.05;letter-spacing:-.04em;font-weight:850}
        .pf-help{margin:10px 0 0;max-width:60ch;color:var(--muted);font-size:14px;line-height:1.5}
        .pf-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0 18px}
        @media(max-width:700px){.pf-stats{grid-template-columns:1fr 1fr}}
        .pf-stat{padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--panel)}
        .pf-stat b{display:block;font-size:18px;color:#f0e6c8;font-weight:850}
        .pf-stat span{display:block;margin-top:3px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--soft);font-weight:700}
        .pf-grid{display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:14px;align-items:start}
        @media(max-width:900px){.pf-grid{grid-template-columns:1fr}}
        .pf-list,.pf-main{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:14px;min-width:0}
        .pf-list-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}
        .pf-list-head h2{margin:0;font-size:13px;font-weight:800}
        .pf-add{border:0;background:var(--gold-soft);color:var(--gold);border-radius:8px;padding:8px 12px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}
        .pf-item{width:100%;text-align:left;border:1px solid transparent;background:transparent;color:var(--muted);border-radius:12px;padding:11px 12px;cursor:pointer;font:inherit;margin-bottom:4px}
        .pf-item strong{display:block;font-size:13px;color:#eceae4}
        .pf-item span{display:block;margin-top:3px;font-size:11px;color:var(--soft)}
        .pf-item.is-active{background:var(--gold-soft);border-color:rgba(212,181,106,.28)}
        .pf-item.is-active strong{color:#f3e7c8}
        .pf-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media(max-width:700px){.pf-fields{grid-template-columns:1fr}}
        .pf-field{display:grid;gap:6px;min-width:0}
        .pf-field span{font-size:11px;font-weight:700;color:#c4c8d0}
        .pf-field input,.pf-field select,.pf-field textarea{width:100%;min-height:44px;padding:10px 12px;border-radius:11px;border:1px solid var(--line);background:var(--panel2);color:var(--text);font:inherit;font-size:13px}
        .pf-field textarea{min-height:90px;resize:vertical}
        .pf-section{margin-top:18px}
        .pf-section h3{margin:0 0 10px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--soft);font-weight:800}
        .pf-plat{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--panel2)}
        @media(min-width:900px){.pf-plat{grid-template-columns:1.1fr 1fr 1.5fr .9fr}}
        .pf-plat input,.pf-plat select{min-height:42px;padding:9px 11px;border-radius:10px;border:1px solid var(--line);background:#0c0e14;color:var(--text);font:inherit;font-size:12px;width:100%}
        .pf-earn-row{display:grid;grid-template-columns:120px 1fr auto;gap:8px;align-items:end}
        @media(max-width:600px){.pf-earn-row{grid-template-columns:1fr}}
        .pf-money{margin-top:16px;padding:14px;border-radius:14px;border:1px solid rgba(212,181,106,.25);background:var(--gold-soft)}
        .pf-money strong{display:block;color:#f0e2bc;font-size:13px}
        .pf-money p{margin:6px 0 0;color:#cfc3a4;font-size:12px;line-height:1.5}
        .pf-status{margin-top:12px;font-size:12px;color:var(--muted)}
        .pf-btn{min-height:42px;padding:0 14px;border-radius:11px;border:1px solid var(--line);background:var(--panel2);color:#e8e6df;font:inherit;font-size:12px;font-weight:750;cursor:pointer}
        .pf-btn.primary{background:var(--gold);border-color:var(--gold);color:#1a160e;font-weight:850}
        .pf-entries{margin-top:10px;display:grid;gap:6px}
        .pf-entry{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:10px;background:var(--panel2);border:1px solid var(--line);font-size:12px}
        .pf-entry b{color:#e8dfc8}.pf-entry span{color:var(--soft)}
      `}</style>

      <div className="pf-hero">
        <div className="pf-kicker">Owned media map</div>
        <h1 className="pf-title">Profiles</h1>
        <p className="pf-help">Paste exact public links. Log money earned. Home reads both instantly.</p>
      </div>

      <div className="pf-stats">
        <div className="pf-stat"><b>{stats.profiles}</b><span>Profiles</span></div>
        <div className="pf-stat"><b>{stats.withUrl}</b><span>Links set</span></div>
        <div className="pf-stat"><b>{stats.active}</b><span>Active</span></div>
        <div className="pf-stat"><b>{formatMoney(earnings.total, earnings.currency)}</b><span>Logged</span></div>
      </div>

      <div className="pf-grid">
        <aside className="pf-list">
          <div className="pf-list-head">
            <h2>Profiles</h2>
            <button type="button" className="pf-add" onClick={addProfile}>+ Add</button>
          </div>
          {profiles.map((p) => (
            <button key={p.id} type="button" className={`pf-item${p.id === active?.id ? " is-active" : ""}`} onClick={() => setActiveId(p.id)}>
              <strong>{p.name}</strong>
              <span>{p.type}</span>
            </button>
          ))}
        </aside>

        {active && (
          <section className="pf-main">
            <div className="pf-fields">
              <label className="pf-field"><span>Name</span><input value={active.name} onChange={(e) => updateActive({ name: e.target.value })} /></label>
              <label className="pf-field"><span>Type</span><input value={active.type} onChange={(e) => updateActive({ type: e.target.value })} /></label>
              <label className="pf-field" style={{ gridColumn: "1 / -1" }}><span>Role</span><input value={active.role} onChange={(e) => updateActive({ role: e.target.value })} /></label>
              <label className="pf-field" style={{ gridColumn: "1 / -1" }}><span>Notes</span><textarea value={active.notes} onChange={(e) => updateActive({ notes: e.target.value })} /></label>
            </div>

            <div className="pf-section">
              <h3>Social accounts · exact links</h3>
              {(active.platforms || []).map((pl, index) => (
                <div className="pf-plat" key={`${active.id}-${index}`}>
                  <input value={pl.network} onChange={(e) => updatePlatform(index, { network: e.target.value })} placeholder="Network" />
                  <input value={pl.handle} onChange={(e) => updatePlatform(index, { handle: e.target.value })} placeholder="@handle" />
                  <input value={pl.url} onChange={(e) => updatePlatform(index, { url: e.target.value })} placeholder="https:// exact URL" />
                  <select value={pl.status} onChange={(e) => updatePlatform(index, { status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
              <button type="button" className="pf-btn" onClick={addPlatform}>Add platform</button>
            </div>

            <div className="pf-section">
              <h3>Log money earned</h3>
              <div className="pf-earn-row">
                <label className="pf-field"><span>Amount</span><input value={earnAmount} onChange={(e) => setEarnAmount(e.target.value)} placeholder="250" inputMode="decimal" /></label>
                <label className="pf-field"><span>Note</span><input value={earnNote} onChange={(e) => setEarnNote(e.target.value)} placeholder="Fanvue · ads · affiliate" /></label>
                <button type="button" className="pf-btn primary" onClick={addEarning}>Log</button>
              </div>
              {(earnings.entries || []).length > 0 && (
                <div className="pf-entries">
                  {(earnings.entries || []).slice(0, 6).map((e) => (
                    <div className="pf-entry" key={e.id}>
                      <span>{e.note} · {e.profileName || "—"}</span>
                      <b>{formatMoney(e.amount, earnings.currency)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pf-money">
              <strong>Total logged · {formatMoney(earnings.total, earnings.currency)}</strong>
              <p>Manual log for now. Home updates when you save links or log money.</p>
            </div>
            <div className="pf-status">{message || "Saved on this device."}</div>
          </section>
        )}
      </div>
    </div>
  );
}
