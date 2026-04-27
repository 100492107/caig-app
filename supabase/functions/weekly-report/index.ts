import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SVC_ROLE_KEY")!;
const FROM_EMAIL = "Cornerstone AI Group <hello@cornerstoneaigroup.com>";

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch all active clients
  const { data: clients, error: clientErr } = await supabase
    .from("profiles")
    .select("id, agency_name, email")
    .eq("role", "client")
    .eq("is_active", true);

  if (clientErr) {
    return new Response(JSON.stringify({ error: clientErr.message }), { status: 500 });
  }

  const weekStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const results: { client: string; status: string; error?: string }[] = [];

  for (const client of clients ?? []) {
    // Fetch creators and deals for this client
    const [{ data: creators }, { data: deals }, { data: content }] = await Promise.all([
      supabase.from("creators").select("*").eq("client_id", client.id).eq("is_active", true),
      supabase.from("deals").select("*, creators(name)").eq("client_id", client.id).order("created_at", { ascending: false }),
      supabase.from("content_queue").select("*").eq("client_id", client.id).order("created_at", { ascending: false }).limit(5),
    ]);

    const cr = creators ?? [];
    const dl = deals ?? [];
    const co = content ?? [];

    const confirmedValue = dl
      .filter((d: any) => d.stage === "Confirmed" || d.stage === "Live")
      .reduce((s: number, d: any) => s + (d.deal_value || 0), 0);

    const pipelineValue = dl
      .filter((d: any) => !["Rejected", "Closed"].includes(d.stage))
      .reduce((s: number, d: any) => s + (d.deal_value || 0), 0);

    // Group deals by stage
    const stageGroups: Record<string, any[]> = {};
    dl.forEach((d: any) => {
      if (!stageGroups[d.stage]) stageGroups[d.stage] = [];
      stageGroups[d.stage].push(d);
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; background: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e4e4e7; }
    .wrap { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
    .logo { font-size: 13px; font-weight: 700; color: #f5c518; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 40px; }
    .logo span { color: #71717a; font-weight: 400; margin-left: 6px; }
    h1 { font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 6px; letter-spacing: -.02em; }
    .sub { font-size: 14px; color: #71717a; margin: 0 0 36px; }
    .stats { display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
    .stat { background: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 16px 20px; flex: 1; min-width: 120px; }
    .stat-val { font-size: 26px; font-weight: 700; color: #fff; line-height: 1; margin-bottom: 4px; }
    .stat-lbl { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: .06em; }
    .stat-val.gold { color: #f5c518; }
    .stat-val.green { color: #34d399; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 11px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 1px solid #27272a; }
    .creator-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #18181b; }
    .creator-dot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; margin-right: 12px; flex-shrink: 0; }
    .creator-name { font-size: 14px; font-weight: 600; color: #e4e4e7; }
    .creator-meta { font-size: 12px; color: #71717a; margin-top: 2px; }
    .deal-row { display: flex; align-items: center; padding: 10px 12px; background: #18181b; border-radius: 8px; margin-bottom: 8px; }
    .deal-bar { width: 3px; align-self: stretch; border-radius: 2px; margin-right: 12px; flex-shrink: 0; }
    .deal-name { font-size: 14px; font-weight: 600; color: #e4e4e7; }
    .deal-val { font-size: 13px; color: #f5c518; font-weight: 600; margin-left: 8px; }
    .deal-stage { font-size: 11px; color: #71717a; margin-top: 2px; }
    .content-row { background: #18181b; border-radius: 8px; padding: 14px; margin-bottom: 8px; }
    .content-meta { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
    .content-hook { font-size: 14px; font-weight: 600; color: #e4e4e7; line-height: 1.4; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #27272a; font-size: 12px; color: #52525b; line-height: 1.7; }
    .footer a { color: #f5c518; text-decoration: none; }
    .empty { font-size: 13px; color: #52525b; font-style: italic; padding: 8px 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">Cornerstone AI Group <span>· Weekly Report</span></div>

    <h1>Weekly update for ${client.agency_name || client.email}</h1>
    <p class="sub">Week ending ${weekStr}</p>

    <!-- Stats -->
    <div class="stats">
      <div class="stat">
        <div class="stat-val">${cr.length}</div>
        <div class="stat-lbl">Active Creators</div>
      </div>
      <div class="stat">
        <div class="stat-val">${dl.length}</div>
        <div class="stat-lbl">Total Deals</div>
      </div>
      <div class="stat">
        <div class="stat-val gold">£${pipelineValue.toLocaleString("en-GB")}</div>
        <div class="stat-lbl">Pipeline Value</div>
      </div>
      <div class="stat">
        <div class="stat-val green">£${confirmedValue.toLocaleString("en-GB")}</div>
        <div class="stat-lbl">Confirmed</div>
      </div>
    </div>

    <!-- Creator roster -->
    <div class="section">
      <div class="section-title">Creator Roster</div>
      ${cr.length === 0
        ? `<div class="empty">No active creators yet.</div>`
        : cr.map((c: any) => `
          <div class="creator-row">
            <div class="creator-dot"></div>
            <div>
              <div class="creator-name">${c.name}${c.handle ? ` <span style="color:#71717a;font-weight:400">${c.handle}</span>` : ""}</div>
              <div class="creator-meta">${[c.niche, c.platform, c.follower_count ? `${Number(c.follower_count).toLocaleString()} followers` : null].filter(Boolean).join(" · ")}</div>
            </div>
          </div>`).join("")
      }
    </div>

    <!-- Deal pipeline -->
    <div class="section">
      <div class="section-title">Brand Deal Pipeline</div>
      ${dl.length === 0
        ? `<div class="empty">No deals in pipeline.</div>`
        : dl.map((d: any) => `
          <div class="deal-row">
            <div class="deal-bar" style="background:${stageColor(d.stage)}"></div>
            <div style="flex:1">
              <div class="deal-name">${d.brand_name}${d.deal_value ? `<span class="deal-val">£${Number(d.deal_value).toLocaleString("en-GB")}</span>` : ""}</div>
              <div class="deal-stage">${d.stage}${d.creators?.name ? ` · ${d.creators.name}` : ""}</div>
            </div>
          </div>`).join("")
      }
    </div>

    <!-- Recent content -->
    ${co.length > 0 ? `
    <div class="section">
      <div class="section-title">Recent Content (${co.length} latest)</div>
      ${co.map((c: any) => `
        <div class="content-row">
          <div class="content-meta">${c.persona_name || ""} · ${c.platform || ""} · ${c.status || ""}</div>
          <div class="content-hook">${c.hook || ""}</div>
        </div>`).join("")}
    </div>` : ""}

    <div class="footer">
      This report was generated automatically by the Cornerstone AI Group content system.<br/>
      Questions? Reply to this email or reach us at <a href="mailto:hello@cornerstoneaigroup.com">hello@cornerstoneaigroup.com</a><br/><br/>
      <a href="https://app.cornerstoneaigroup.com">View your portal →</a>
    </div>
  </div>
</body>
</html>`;

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [client.email],
        subject: `Your weekly update — ${weekStr} | Cornerstone AI Group`,
        html,
      }),
    });

    if (res.ok) {
      results.push({ client: client.agency_name || client.email, status: "sent" });
    } else {
      const err = await res.json();
      results.push({ client: client.agency_name || client.email, status: "failed", error: err.message });
    }
  }

  return new Response(JSON.stringify({ sent: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});

function stageColor(stage: string): string {
  const map: Record<string, string> = {
    "Prospecting": "#818CF8",
    "Outreach":    "#60A5FA",
    "In Talks":    "#FBBF24",
    "Negotiating": "#FB923C",
    "Confirmed":   "#34D399",
    "Live":        "#10B981",
    "Completed":   "#6EE7B7",
    "Rejected":    "#F87171",
    "Closed":      "#52525b",
  };
  return map[stage] || "#71717a";
}
