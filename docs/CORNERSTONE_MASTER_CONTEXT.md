# CORNERSTONE AI ENTERPRISES
## CEO Operating Blueprint — MASTER CONTEXT (Canonical)

**Status: September 2026 · Supersedes V10, V11 dual-docs, and any dealership-photo or client-first primary strategy.**

This is the single handoff document for strategy, product architecture, local AI, operating rules, and known constraints. Read this before changing code or reinventing the model.

---

## 0. The model in one page

| Layer | Definition | Primary job | Must not become |
|-------|------------|-------------|-----------------|
| **Cornerstone AI Enterprises** | Parent + CEO OS | Allocate attention, protect cash, evidence-based decisions | A decorative dashboard |
| **Track A — Revenue Recovery** | AI Revenue Recovery Engine | Find leakage between lead → deal; recover what can still move | Dealership CRM, generic AI agency, lead-gen shop |
| **Track B — Content Engine** | Content Intelligence + Production | Discover proven demand → analyse → build original → multiply → publish → monetise → measure | Client agency first, generic content spam |
| **New Life** | Personal execution OS | Protect operator: discipline, family, health, money, capacity | Motivation feed, second CRM |

**Thesis:** Track A recovers value already entering businesses. Track B turns proven attention into owned media assets. New Life keeps the operator able to run both.

**Cash vs assets:** Track A = cash now. Track B = compounding assets. Do not invert priorities when cash pressure is real.

---

## 1. Track A — Revenue Recovery

**Problem (fixed):** Revenue leakage on  
`Lead → Contact → Conversation → Appointment → Opportunity → Deal`

**Vertical (variable):** Automotive, property, recruitment, SaaS, professional services, trades, agencies, etc. Vertical changes vocabulary, not the speciality.

**Offer:** Missed Opportunity Recovery  
**Positioning:** AI Revenue Recovery Consultant  
**Commercial path:**  
`Target → Recovery conversation → Leakage diagnosis → Controlled test → Measured recovery → Repeat`

**Four blanks before money:** economic bucket, KPI, baseline, directional target.

**Outreach rules:**  
- First email = pain + value + cliffhanger. Under ~80 words. Soft CTA.  
- No em dashes. No AI voice. No photo/listing language. No invented metrics.  
- Domain id: `TRACK_A_REVENUE_RECOVERY`

**Gates:** Attention → Diagnosis → Paid test → Recovery movement → Repeat → Margin.

**Human rule:** AI prioritises and drafts. Humans approve relationship-affecting messages and close deals.

---

## 2. Track B — Content Engine

**Canonical stage vocabulary (locked — use only these names in UI and docs):**

`Discover → Analyse → Build → Multiply → Publish → Monetise → Measure → Repeat`

| Stage | Job | Done means |
|-------|-----|------------|
| Discover | Find what is already winning | Ranked opportunities with evidence |
| Analyse | Why it works (mechanism map) | Originality plan; USE / ADAPT / IGNORE |
| Build | Stronger original package | Script, titles, thumbs, visual plan |
| Multiply | Shorts / derivatives with lineage | Standalone hooks, parent IDs |
| Publish | Live or production queue | Asset + metadata + status |
| Monetise | One money test | Route + metric |
| Measure | Audience + economics | Creative DNA update |

**Do not use alternate stage names** (Radar, Source, Rebuild, Produce, Learn) in product UI. Those map as: Radar→Discover, Source+Analyse→Analyse, Rebuild+Produce→Build, Learn→Measure.

**Reference rule:** Teacher, not template. No copied scripts, identity, footage, or near-identical execution.

**Cara / Lila / Duo:** Owned *applications* of the engine, not the definition of Track B. Character bibles bind when those identities are selected.

**Client delivery:** Optional later branch. Not primary. Owned media first.

**Domain id:** `TRACK_B_CONTENT_ENGINE` (creator-specific work may use creator growth context under the same engine).

---

## 3. Application map

| Route | Role |
|-------|------|
| `/` | Enterprise command — Track A, Track B, New Life |
| `/outreach` | Track A recovery outreach workspace |
| `/creative` | Track B Content Engine shell |
| `/ceo` | Read-focused CEO control room |
| External CRM | `https://cornerstonegroupdatabase.vercel.app/` — Track A prospect source of truth |
| New Life | Separate repo/app — operator OS |

**One capability, one surface.** No parallel V2/V3/Final homes.

---

## 4. Local AI stack (Mac)

| Component | Endpoint / role |
|-----------|-----------------|
| Qwen text | `http://127.0.0.1:8000` — reasoning, outreach, content packages |
| Qwen Vision | `http://127.0.0.1:8001` — frames / scene |
| Whisper | `http://127.0.0.1:8787` — transcripts |
| Workers | `qwen-worker`, scene, caption, source ingestion |
| New Life coach | Separate worker; may share Qwen model only |

**UI is on Vercel. Intelligence jobs run on the Mac.**  
If workers are down, queues stall; the UI still loads.

See `docs/LOCAL_RUN.md` for terminal recovery. **Do not assume** `~/Business/caig-app` exists — resolve the real checkout path first.

No new model install is required when strategy changes. Pull repo + restart workers.

---

## 5. Research firewalls

- Track A evidence = commercial recovery evidence only.  
- Track B evidence = content/audience evidence only.  
- Never blend packs across engines.  
- Public web research ≠ owned-account performance.  
- Label weak evidence as hypothesis.

---

## 6. CEO cadence

1. Live Track A cash action (reply, diagnosis, test)  
2. Track A pipeline creation  
3. Track B publish / production bottleneck  
4. Track B discover / analyse  
5. System fixes only for demonstrated bottlenecks  

**Daily question:** What valuable work should I faithfully complete today?

**When stuck:** Return to evidence. Do not invent a new plan because the current one feels uncomfortable.

---

## 7. Never

- Redefine Track A as automotive-only or photo/listing product  
- Redefine Track B as client-delivery-first  
- Copy distinctive source execution  
- Invent metrics, testimonials, or private analytics  
- Mix research domains  
- Add parallel workspaces for existing capabilities  
- Build features instead of failing a gate honestly  

---

## 8. Final rule

Sell where value is stuck. Build where attention is proven. Measure what actually happened. Repeat what deserves to be repeated.

**Canonical files in-repo:**  
- This document  
- `AGENTS.md` (engineering constitution)  
- `docs/TRACK_B_LOCKED_STRATEGY.md` (Track B detail; stages must match this doc)  
- `docs/LOCAL_RUN.md`  
- Dashboard: `OUTREACH_PLAYBOOK.md` + `recovery-sequence.js`
