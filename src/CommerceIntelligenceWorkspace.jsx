import React, { useEffect, useMemo, useState } from "react";
import EnterpriseShell from "./EnterpriseShell.jsx";
import { supabase } from "./supabase";

const DISCOVERY = [
  { id: "pinterest", label: "Pinterest", type: "visual", note: "Aesthetics, outfits, poses", url: (q) => `https://www.pinterest.co.uk/search/pins/?q=${encodeURIComponent(q)}` },
  { id: "vinted", label: "Vinted", type: "visual", note: "Real listings + silhouettes", url: (q) => `https://www.vinted.co.uk/catalog?search_text=${encodeURIComponent(q)}` },
  { id: "depop", label: "Depop", type: "visual", note: "Vintage + streetwear", url: (q) => `https://www.depop.com/search/?q=${encodeURIComponent(q)}` },
  { id: "tiktok", label: "TikTok Trends", type: "trend", note: "Hashtags + format signals", url: () => "https://ads.tiktok.com/creative/creativeCenter/trends?countryCode=GB&period=7" },
  { id: "tiktok_shop", label: "TikTok Shop", type: "product", note: "Creator-commerce products", url: () => "https://shop.tiktok.com/" },
  { id: "temu", label: "Temu", type: "product", note: "Product discovery + affiliate candidates", url: (q) => `https://www.temu.com/search_result.html?search_key=${encodeURIComponent(q)}` },
  { id: "alibaba", label: "Alibaba", type: "product", note: "Supplier / product research", url: (q) => `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}` },
];

const CREATOR_OPTIONS = [["cara", "Cara"], ["lila", "Lila"], ["duo", "Cara + Lila"], ["neutral", "Neutral"]];
const SIGNAL_FILTERS = ["all", "product", "trend", "visual", "listing"];

function parseResult(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return { text: String(value) }; }
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error("Sign in required.");
  return data.user;
}

async function waitJob(id) {
  const deadline = Date.now() + 7 * 60 * 1000;
  while (Date.now() < deadline) {
    const { data, error } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("The local AI job disappeared.");
    if (data.status === "completed") return parseResult(data.result);
    if (data.status === "error") throw new Error(data.error_message || "Local AI job failed.");
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error("Local commerce intelligence timed out. Check the local Qwen worker on your Mac.");
}

function badge(source) {
  const map = { pinterest: "PIN", vinted: "VINTED", depop: "DEPOP", tiktok: "TIKTOK", tiktok_shop: "SHOP", temu: "TEMU", alibaba: "ALIBABA", other: "WEB" };
  return map[source] || "WEB";
}

function money(amount, currency) {
  if (amount == null || !Number.isFinite(Number(amount))) return "";
  return (currency ? String(currency) + " " : "") + Number(amount).toFixed(2);
}

export default function CommerceIntelligenceWorkspace() {
  const [signals, setSignals] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [tests, setTests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("summer capsule wardrobe");
  const [searchSource, setSearchSource] = useState("temu");
  const [url, setUrl] = useState("");
  const [creator, setCreator] = useState("cara");
  const [shopId, setShopId] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [setup, setSetup] = useState({ tiktok_shop_ready: false, showcase_ready: false, creator_profile_url: "", instagram_url: "", tracking_destination: "", samples_requested: 0 });
  const [setupSaving, setSetupSaving] = useState(false);
  const [outcomeTest, setOutcomeTest] = useState(null);
  const [outcomeDraft, setOutcomeDraft] = useState({ views: "", clicks: "", conversions: "", revenue: "", commission: "" });

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const user = await currentUser();
      const [signalsRes, opportunitiesRes, testsRes, setupRes] = await Promise.all([
        supabase.from("cornerstone_commerce_signals").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("cornerstone_commerce_opportunities").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("cornerstone_commerce_tests").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("cornerstone_commerce_setup").select("*").eq("owner_id", user.id).maybeSingle(),
      ]);
      if (signalsRes.error) throw signalsRes.error;
      if (opportunitiesRes.error) throw opportunitiesRes.error;
      if (testsRes.error) throw testsRes.error;
      if (setupRes.error) throw setupRes.error;
      setSignals(signalsRes.data || []);
      setOpportunities(opportunitiesRes.data || []);
      setTests(testsRes.data || []);
      if (setupRes.data) setSetup({ tiktok_shop_ready: !!setupRes.data.tiktok_shop_ready, showcase_ready: !!setupRes.data.showcase_ready, creator_profile_url: setupRes.data.creator_profile_url || "", instagram_url: setupRes.data.instagram_url || "", tracking_destination: setupRes.data.tracking_destination || "", samples_requested: Number(setupRes.data.samples_requested || 0) });
    } catch (loadError) {
      setError(loadError?.message || String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function saveSetup() {
    setSetupSaving(true);
    setError("");
    setMessage("");
    try {
      const user = await currentUser();
      const payload = {
        owner_id: user.id,
        tiktok_shop_ready: !!setup.tiktok_shop_ready,
        showcase_ready: !!setup.showcase_ready,
        creator_profile_url: setup.creator_profile_url.trim() || null,
        instagram_url: setup.instagram_url.trim() || null,
        tracking_destination: setup.tracking_destination.trim() || null,
        samples_requested: Math.max(0, Number(setup.samples_requested || 0)),
        updated_at: new Date().toISOString(),
      };
      const { data, error: saveError } = await supabase.from("cornerstone_commerce_setup").upsert(payload, { onConflict: "owner_id" }).select("*").single();
      if (saveError) throw saveError;
      setSetup({ tiktok_shop_ready: !!data.tiktok_shop_ready, showcase_ready: !!data.showcase_ready, creator_profile_url: data.creator_profile_url || "", instagram_url: data.instagram_url || "", tracking_destination: data.tracking_destination || "", samples_requested: Number(data.samples_requested || 0) });
      setMessage("Launch checklist saved.");
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSetupSaving(false);
    }
  }


  const visibleSignals = useMemo(
    () => filter === "all" ? signals : signals.filter((item) => item.signal_type === filter),
    [signals, filter]
  );

  function openDiscovery() {
    const source = DISCOVERY.find((item) => item.id === searchSource) || DISCOVERY[0];
    window.open(source.url(query.trim() || "trending"), "_blank", "noopener,noreferrer");
  }

  async function importUrl() {
    setImporting(true);
    setError("");
    setMessage("");
    try {
      const value = url.trim();
      if (!value) throw new Error("Paste a product, trend, Pinterest, Vinted or Depop URL first.");
      const user = await currentUser();
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const response = await fetch("/api/store-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
        body: JSON.stringify({ mode: "commerce_ingest", url: value }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not import that source.");
      const { data, error: insertError } = await supabase.from("cornerstone_commerce_signals").insert({
        owner_id: user.id,
        source_platform: result.source_platform || "other",
        signal_type: result.signal_type || "product",
        source_url: result.source_url || value,
        canonical_url: result.canonical_url || value,
        title: result.title || null,
        description: result.description || null,
        image_url: result.image_url || null,
        storage_path: result.structured_data?.storage_path || null,
        product_id: result.product_id || null,
        shop_name: result.shop_name || null,
        brand: result.brand || null,
        price_amount: result.price_amount ?? null,
        price_currency: result.price_currency || null,
        availability: result.availability || null,
        rating: result.rating ?? null,
        review_count: result.review_count ?? null,
        sold_count: result.sold_count ?? null,
        metric_name: result.metric_name || null,
        metric_value: result.metric_value ?? null,
        metric_window: result.metric_window || null,
        trend_direction: result.trend_direction || null,
        category: result.category || null,
        tags: result.tags || [],
        affiliate_route: result.affiliate_route || null,
        evidence_confidence: result.evidence_confidence || "medium",
        metadata: result.structured_data || {},
        captured_at: new Date().toISOString(),
      }).select("*").single();
      if (insertError) throw insertError;
      setSignals((current) => [data, ...current]);
      setUrl("");
      setMessage("Imported " + (result.signal_type === "trend" ? "trend signal" : "product signal") + ".");
    } catch (importError) {
      setError(importError?.message || String(importError));
    } finally {
      setImporting(false);
    }
  }

  async function discoverTikTokShop() {
    setDiscovering(true);
    setError("");
    setMessage("");
    try {
      if (!shopId.trim()) throw new Error("Enter a TikTok Shop ID.");
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const response = await fetch("/api/store-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
        body: JSON.stringify({ mode: "tiktok_shop_discover", shop_id: shopId.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "TikTok Shop API discovery is not configured.");
      const user = await currentUser();
      const rows = Array.isArray(result.products) ? result.products : [];
      if (!rows.length) throw new Error("No TikTok Shop products were returned for that shop.");
      const inserts = rows.map((item) => ({
        owner_id: user.id,
        source_platform: "tiktok_shop",
        signal_type: "product",
        source_url: item.source_url || null,
        canonical_url: item.source_url || null,
        title: item.product_name || null,
        description: item.product_description || null,
        image_url: item.image_url || null,
        product_id: item.product_id ? String(item.product_id) : null,
        shop_name: item.shop_name || null,
        price_amount: item.price_amount ?? null,
        price_currency: item.price_currency || null,
        rating: item.rating ?? null,
        review_count: item.review_count ?? null,
        sold_count: item.product_sold_count ?? null,
        category: item.category || null,
        tags: ["tiktok_shop", "api"],
        evidence_confidence: "high",
        metadata: item,
      }));
      const { data, error: insertError } = await supabase.from("cornerstone_commerce_signals").insert(inserts).select("*");
      if (insertError) throw insertError;
      setSignals((current) => [...(data || []), ...current]);
      setMessage((data?.length || 0) + " TikTok Shop product signal(s) imported from the Research API.");
    } catch (discoverError) {
      setError(discoverError?.message || String(discoverError));
    } finally {
      setDiscovering(false);
    }
  }

  async function generateOpportunities() {
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const user = await currentUser();
      if (signals.length < 2) throw new Error("Import at least two commerce signals first.");
      const selectedSignals = signals.slice(0, 24).map((item) => ({
        id: item.id,
        source_platform: item.source_platform,
        signal_type: item.signal_type,
        title: item.title,
        description: item.description,
        product_id: item.product_id,
        shop_name: item.shop_name,
        brand: item.brand,
        price_amount: item.price_amount,
        price_currency: item.price_currency,
        rating: item.rating,
        review_count: item.review_count,
        sold_count: item.sold_count,
        metric_name: item.metric_name,
        metric_value: item.metric_value,
        metric_window: item.metric_window,
        trend_direction: item.trend_direction,
        category: item.category,
        tags: item.tags,
        source_url: item.source_url,
      }));
      const { data: research } = await supabase.from("cornerstone_research_signals").select("id,platform,source_url,source_creator,observed_metric_name,observed_metric_value,topic,mechanism,confidence,niche,status").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(16);
      const { data: refs } = await supabase.from("cornerstone_visual_references").select("id,source_platform,title,category,tags,analysis,recipe").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(16);
      const { data: previousTests } = await supabase.from("cornerstone_commerce_tests").select("creator_id,platform,monetisation_route,status,impressions,views,clicks,conversions,revenue,commission,notes").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(16);
      const prompt = [
        "CORNERSTONE COMMERCE INTELLIGENCE",
        "Create a portfolio of 6 original creator-commerce opportunities for the selected creator.",
        "Join three evidence layers: commerce signals, research mechanisms, and visual/style structure.",
        "The goal is not to copy listings or trends. The goal is to identify a transferable demand pattern and turn it into a native content experiment.",
        "Every opportunity must connect trend/demand + product angle + visual treatment + content concept + monetisation test.",
        "Use only facts explicitly present in the input. Never invent price, sales, commission, reviews, product claims, audience response or platform eligibility.",
        "Treat Alibaba as supplier/product research unless the input explicitly provides an affiliate route. Treat Temu affiliate as a candidate route, not a guaranteed commission. Treat TikTok Shop as a candidate commerce route subject to account/market eligibility.",
        "Return JSON only with an opportunities array where each item has:",
        '{"title":"","summary":"","signal_ids":[],"trend":"","product_angle":"","aesthetic_angle":"","hook":"","content_concept":"","format":"","visual_direction":{"shot":"","wardrobe":"","pose":"","scene":"","composition":""},"content_prompt":"","monetisation_route":"","monetisation_test":"","cta":"","kpi":"","winner_rule":"","evidence_confidence":""}',
        "SELECTED CREATOR: " + creator,
        "COMMERCE SIGNALS:",
        JSON.stringify(selectedSignals).slice(0, 42000),
        "RESEARCH MECHANISMS:",
        JSON.stringify(research || []).slice(0, 18000),
        "VISUAL REFERENCES:",
        JSON.stringify(refs || []).slice(0, 18000),
        "PREVIOUS COMMERCE TEST OUTCOMES:",
        JSON.stringify(previousTests || []).slice(0, 18000),
        "Use observed prior outcomes as learning context. Do not convert them into claims about future performance.",
      ].join("\n");
      const { data: job, error: queueError } = await supabase.from("local_ai_jobs").insert({
        owner_id: user.id,
        title: "Commerce intelligence · " + creator,
        job_type: "commerce_intelligence",
        model: "mlx-community/Qwen3.5-9B-4bit",
        persona_id: creator === "duo" ? "cara_lila" : creator,
        system_prompt: "You are Cornerstone's commerce intelligence analyst. Convert evidence into original creator-commerce experiments. Preserve creator identity. Distinguish observed evidence from inference. Do not invent facts. Return strict JSON.",
        user_prompt: prompt,
        options: { creator_id: creator, max_tokens: 4200, temperature: 0.45 },
        status: "queued",
        production_status: "commerce_intelligence_queued",
      }).select("id").single();
      if (queueError) throw queueError;
      setMessage("Qwen is joining the product, trend and visual signals…");
      const result = await waitJob(job.id);
      const opportunitiesResult = result?.opportunities || result?.data?.opportunities || [];
      if (!Array.isArray(opportunitiesResult) || !opportunitiesResult.length) throw new Error("Qwen returned no usable commerce opportunities.");
      const allowedIds = new Set(signals.map((item) => item.id));
      const rows = opportunitiesResult.slice(0, 8).map((item) => ({
        owner_id: user.id,
        creator_id: CREATOR_OPTIONS.some(([id]) => id === item.creator_id) ? item.creator_id : creator,
        title: String(item.title || "Commerce opportunity").trim(),
        summary: String(item.summary || "").trim() || null,
        signal_ids: Array.isArray(item.signal_ids) ? item.signal_ids.filter((id) => allowedIds.has(id)).slice(0, 12) : [],
        trend: String(item.trend || "").trim() || null,
        product_angle: String(item.product_angle || "").trim() || null,
        aesthetic_angle: String(item.aesthetic_angle || "").trim() || null,
        hook: String(item.hook || "").trim() || null,
        content_concept: String(item.content_concept || "").trim() || null,
        format: String(item.format || "").trim() || null,
        visual_direction: item.visual_direction && typeof item.visual_direction === "object" ? item.visual_direction : {},
        content_prompt: String(item.content_prompt || "").trim() || null,
        monetisation_route: String(item.monetisation_route || "").trim() || null,
        monetisation_test: String(item.monetisation_test || "").trim() || null,
        cta: String(item.cta || "").trim() || null,
        kpi: String(item.kpi || "").trim() || null,
        winner_rule: String(item.winner_rule || "").trim() || null,
        evidence_confidence: ["high","medium","low"].includes(item.evidence_confidence) ? item.evidence_confidence : "medium",
        status: "candidate",
        metadata: { generated_by: "qwen-commerce-worker", creator_id: creator, generated_at: new Date().toISOString() },
      })).filter((row) => row.title);
      const { data, error: saveError } = await supabase.from("cornerstone_commerce_opportunities").insert(rows).select("*");
      if (saveError) throw saveError;
      setOpportunities((current) => [...(data || []), ...current]);
      const plannedTests = (data || []).map((opportunity) => ({
        owner_id: user.id,
        opportunity_id: opportunity.id,
        creator_id: opportunity.creator_id || creator,
        platform: String(opportunity.monetisation_route || "").toLowerCase().includes("tiktok") ? "TikTok" : "multi-platform",
        monetisation_route: opportunity.monetisation_route || "commerce",
        source_signal_ids: opportunity.signal_ids || [],
        cta: opportunity.cta || "Use the tracked offer link.",
        kpi: opportunity.kpi || "Clicks → conversion → net revenue",
        winner_rule: opportunity.winner_rule || "Repeat the mechanism only after observed evidence.",
        status: "planned",
        metadata: { opportunity_title: opportunity.title, content_prompt: opportunity.content_prompt || null }
      }));
      if (plannedTests.length) {
        const { data: insertedTests, error: testsError } = await supabase.from("cornerstone_commerce_tests").insert(plannedTests).select("*");
        if (testsError) throw testsError;
        setTests((current) => [...(insertedTests || []), ...current]);
      }
      setMessage((data?.length || 0) + " opportunities created and " + plannedTests.length + " monetisation tests planned.");
    } catch (generationError) {
      setError(generationError?.message || String(generationError));
    } finally {
      setGenerating(false);
    }
  }

  function recordTestOutcome(test) {
    setError("");
    setMessage("");
    setOutcomeTest(test);
    setOutcomeDraft({ views: test.views ?? "", clicks: test.clicks ?? "", conversions: test.conversions ?? "", revenue: test.revenue ?? "", commission: test.commission ?? "" });
  }

  async function saveTestOutcome() {
    if (!outcomeTest) return;
    try {
      const values = Object.fromEntries(Object.entries(outcomeDraft).map(([k,v]) => [k, Number(v || 0)]));
      if (Object.values(values).some((v) => !Number.isFinite(v) || v < 0)) throw new Error("Outcome values must be zero or positive numbers.");
      const user = await currentUser();
      const { data: updated, error: updateError } = await supabase.from("cornerstone_commerce_tests").update({
        views: values.views || null,
        impressions: values.views || null,
        clicks: values.clicks || null,
        conversions: values.conversions || null,
        revenue: values.revenue || null,
        commission: values.commission || null,
        status: "complete",
        completed_at: new Date().toISOString(),
        notes: "Outcome recorded by operator in Commerce Intelligence."
      }).eq("id", outcomeTest.id).eq("owner_id", user.id).select("*").single();
      if (updateError) throw updateError;
      const clickRate = values.views > 0 ? values.clicks / values.views : null;
      const conversionRate = values.clicks > 0 ? values.conversions / values.clicks : null;
      const { error: researchError } = await supabase.from("cornerstone_research_signals").insert({
        owner_id: user.id,
        source_url: outcomeTest.content_url || outcomeTest.tracking_url || null,
        platform: outcomeTest.platform || null,
        source_creator: outcomeTest.creator_id || creator,
        creator_baseline_views: null,
        observed_metric_name: "commission",
        observed_metric_value: values.commission || null,
        outlier_rationale: "Observed commerce test outcome. CTR: " + (clickRate == null ? "unknown" : (clickRate * 100).toFixed(2) + "%") + ", conversion: " + (conversionRate == null ? "unknown" : (conversionRate * 100).toFixed(2) + "%") + ".",
        topic: outcomeTest.metadata?.opportunity_title || null,
        mechanism: "Commerce test outcome · " + (outcomeTest.monetisation_route || "commerce"),
        confidence: "medium",
        niche: "Track B Commerce",
        status: "used",
        notes: JSON.stringify({ test_id: outcomeTest.id, ...values, click_rate: clickRate, conversion_rate: conversionRate }),
        captured_at: new Date().toISOString().slice(0, 10)
      });
      if (researchError) throw researchError;
      setTests((current) => current.map((row) => row.id === outcomeTest.id ? updated : row));
      setOutcomeTest(null);
      setMessage("Outcome recorded and fed back into the evidence layer.");
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  async function createTest(opportunity) {
    setError("");
    setMessage("");
    try {
      const user = await currentUser();
      const route = opportunity.monetisation_route || "commerce";
      const { data, error: insertError } = await supabase.from("cornerstone_commerce_tests").insert({
        owner_id: user.id,
        opportunity_id: opportunity.id,
        creator_id: opportunity.creator_id || creator,
        platform: route.toLowerCase().includes("tiktok") ? "TikTok" : "multi-platform",
        monetisation_route: route,
        product_id: signals.find((signal) => (opportunity.signal_ids || []).includes(signal.id))?.product_id || null,
        source_signal_ids: opportunity.signal_ids || [],
        cta: opportunity.cta || "Use the tracked offer link.",
        kpi: opportunity.kpi || "Clicks → conversion → net revenue",
        winner_rule: opportunity.winner_rule || "Repeat the mechanism only after observed evidence.",
        status: "planned",
        metadata: { opportunity_title: opportunity.title, content_prompt: opportunity.content_prompt || null },
      }).select("*").single();
      if (insertError) throw insertError;
      setTests((current) => [data, ...current]);
      setMessage("Monetisation test planned.");
    } catch (testError) {
      setError(testError?.message || String(testError));
    }
  }

  function applyOpportunity(opportunity) {
    const linkedSignals = signals.filter((item) => (opportunity.signal_ids || []).includes(item.id));
    const context = {
      opportunity_id: opportunity.id,
      creator: opportunity.creator_id === 'duo' ? 'cara_lila' : opportunity.creator_id,
      title: opportunity.title,
      trend: opportunity.trend,
      product_angle: opportunity.product_angle,
      aesthetic_angle: opportunity.aesthetic_angle,
      hook: opportunity.hook,
      content_concept: opportunity.content_concept,
      format: opportunity.format,
      visual_direction: opportunity.visual_direction || {},
      content_prompt: opportunity.content_prompt,
      monetisation_route: opportunity.monetisation_route,
      monetisation_test: opportunity.monetisation_test,
      cta: opportunity.cta,
      kpi: opportunity.kpi,
      winner_rule: opportunity.winner_rule,
      signal_ids: opportunity.signal_ids || [],
      product_id: linkedSignals.find((signal) => signal?.product_id)?.product_id || null,
      signals: linkedSignals,
      tracking_destination: setup.tracking_destination || null,
      creator_profile_url: setup.creator_profile_url || null,
      instagram_url: setup.instagram_url || null,
      applied_at: new Date().toISOString(),
    };
    sessionStorage.setItem("cornerstone_commerce_context", JSON.stringify(context));
    sessionStorage.setItem("cornerstone_creator_opportunity", JSON.stringify(context));
    window.location.href = "/content/creators";
  }

  return (
    <EnterpriseShell active="commerce" eyebrow="Commerce Intelligence">
      <div className="cs-page commerce-page">
        <div className="cs-page-head">
          <div className="eyebrow">Track B / Commerce Intelligence</div>
          <h1>Turn trends and products into measurable creator experiments.</h1>
          <p>Visual demand from Pinterest, Vinted and Depop. Trend and hook signals from TikTok. Product signals from TikTok Shop, Temu and Alibaba. Cornerstone connects the evidence before content is made.</p>
        </div>

        <section className="commerce-panel commerce-setup">
          <div className="commerce-panel-head"><div><strong>Launch checklist</strong><span>Prepare the first real commerce test</span></div><span className="commerce-live">BEFORE CONTENT</span></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,padding:16}}>
            <label className="commerce-check"><input type="checkbox" checked={setup.tiktok_shop_ready} onChange={(e)=>setSetup((s)=>({...s,tiktok_shop_ready:e.target.checked}))}/><span><b>TikTok Shop access ready</b><small>Use the live account eligibility screen as the source of truth.</small></span></label>
            <label className="commerce-check"><input type="checkbox" checked={setup.showcase_ready} onChange={(e)=>setSetup((s)=>({...s,showcase_ready:e.target.checked}))}/><span><b>Shop showcase ready</b><small>Product can be attached to the test when we publish.</small></span></label>
            <label className="commerce-field"><span>Creator / TikTok profile URL</span><input value={setup.creator_profile_url} onChange={(e)=>setSetup((s)=>({...s,creator_profile_url:e.target.value}))} placeholder="https://www.tiktok.com/@..." /></label>
            <label className="commerce-field"><span>Matching Instagram URL</span><input value={setup.instagram_url} onChange={(e)=>setSetup((s)=>({...s,instagram_url:e.target.value}))} placeholder="https://www.instagram.com/..." /></label>
            <label className="commerce-field"><span>Tracking destination</span><input value={setup.tracking_destination} onChange={(e)=>setSetup((s)=>({...s,tracking_destination:e.target.value}))} placeholder="Product / tracked destination URL" /></label>
            <label className="commerce-field"><span>Samples requested</span><input type="number" min="0" value={setup.samples_requested} onChange={(e)=>setSetup((s)=>({...s,samples_requested:e.target.value}))} /></label>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"0 16px 16px",flexWrap:"wrap"}}>
            <div className="commerce-setup-status">{setup.tiktok_shop_ready && setup.creator_profile_url && setup.tracking_destination ? "Ready to move from discovery into the first creator test." : "Complete the live access, creator profile and tracking destination before publishing."}</div>
            <button className="cs-btn" onClick={saveSetup} disabled={setupSaving}>{setupSaving ? "Saving…" : "Save checklist"}</button>
          </div>
        </section>

        <style>{`
          .commerce-setup{margin-bottom:2px}
          .commerce-check{display:flex;align-items:flex-start;gap:9px;padding:11px 12px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2);cursor:pointer}
          .commerce-check input{margin-top:2px;accent-color:var(--accent)}
          .commerce-check b{display:block;font-size:11px}
          .commerce-check small{display:block;margin-top:3px;color:var(--text-muted);font-size:9px;line-height:1.45}
          .commerce-field{display:grid;gap:6px}
          .commerce-field span{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-subtle);font-weight:800}
          .commerce-field input{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid var(--border-strong);border-radius:9px;background:var(--panel-2);color:var(--text);font:inherit;font-size:12px}
          .commerce-setup-status{color:var(--text-muted);font-size:10px;line-height:1.45}
          @media(max-width:760px){.commerce-check,.commerce-field{grid-column:1/-1}}
        `}</style>
        <div className="commerce-flow">
          <div><strong>01 Discover</strong><span>Open the source where demand is visible.</span></div>
          <div><strong>02 Import</strong><span>Capture product or trend evidence without inventing data.</span></div>
          <div><strong>03 Intelligence</strong><span>Qwen joins commerce + research + visual context.</span></div>
          <div><strong>04 Create</strong><span>Apply an opportunity to Creator Studio.</span></div>
          <div><strong>05 Test</strong><span>Track the monetisation route and KPI.</span></div>
          <div><strong>06 Learn</strong><span>Feed observed clicks, conversions and revenue back.</span></div>
        </div>

        <div className="commerce-grid">
          <section className="commerce-panel commerce-discovery">
            <div className="commerce-panel-head"><div><strong>Discovery</strong><span>Current public sources</span></div><span className="commerce-live">LIVE LINKS</span></div>
            <div className="commerce-source-grid">
              {DISCOVERY.map((source) => (
                <button className="commerce-source" key={source.id} onClick={() => { setSearchSource(source.id); window.open(source.url(query.trim() || "trending"), "_blank", "noopener,noreferrer"); }}>
                  <b>{source.label}</b><span>{source.note}</span>
                </button>
              ))}
            </div>
            <div className="commerce-search-row">
              <select value={searchSource} onChange={(e) => setSearchSource(e.target.value)}>
                {DISCOVERY.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
              </select>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search term, aesthetic, product…" />
              <button className="cs-btn" onClick={openDiscovery}>Open source</button>
            </div>
            <div className="commerce-tiktok-api">
              <div><b>TikTok Shop Research API</b><span>Optional API-backed product discovery for a known shop. The server uses the official Research API when a token is configured.</span></div>
              <div className="commerce-search-row"><input value={shopId} onChange={(e) => setShopId(e.target.value)} placeholder="TikTok Shop ID" /><button className="cs-btn-ghost" onClick={discoverTikTokShop} disabled={discovering}>{discovering ? "Discovering…" : "Discover products"}</button></div>
            </div>
          </section>

          <section className="commerce-panel commerce-import">
            <div className="commerce-panel-head"><div><strong>Import evidence</strong><span>Products, listings, trends</span></div><span className="commerce-live">NO FAKE METRICS</span></div>
            <textarea value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a TikTok Shop, Temu, Alibaba, TikTok Trends, Pinterest, Vinted or Depop URL…" />
            <div className="commerce-import-foot"><span>We capture public metadata and preserve the source URL. Product facts stay source-bound.</span><button className="cs-btn" onClick={importUrl} disabled={importing}>{importing ? "Importing…" : "Import signal"}</button></div>
          </section>
        </div>

        {(message || error) && <div className={error ? "commerce-alert is-error" : "commerce-alert"}>{error || message}</div>}

        <section className="commerce-panel">
          <div className="commerce-panel-head"><div><strong>Commerce evidence room</strong><span>{visibleSignals.length} signals</span></div><div className="commerce-tabs">{SIGNAL_FILTERS.map((item) => <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
          {loading ? <div className="commerce-empty">Loading evidence…</div> : !visibleSignals.length ? <div className="commerce-empty">Import a product or trend source to start building the evidence room.</div> : (
            <div className="commerce-signal-list">
              {visibleSignals.slice(0, 40).map((item) => (
                <article className="commerce-signal" key={item.id}>
                  <div className="commerce-signal-main">
                    <span className="commerce-badge">{badge(item.source_platform)}</span>
                    <div><b>{item.title || "Untitled signal"}</b><p>{item.description || item.category || "No description captured."}</p></div>
                  </div>
                  <div className="commerce-signal-meta">
                    {item.signal_type === "product" && <span>{money(item.price_amount, item.price_currency)}</span>}
                    {item.sold_count != null && <span>{Number(item.sold_count).toLocaleString()} sold</span>}
                    {item.rating != null && <span>{Number(item.rating).toFixed(1)}★</span>}
                    {item.metric_name && item.metric_value != null && <span>{item.metric_name}: {Number(item.metric_value).toLocaleString()}</span>}
                    <a href={item.source_url} target="_blank" rel="noreferrer">Source ↗</a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="commerce-panel">
          <div className="commerce-panel-head"><div><strong>Opportunity engine</strong><span>Trend + product + aesthetic → content + monetisation test</span></div><div className="commerce-actions"><select value={creator} onChange={(e) => setCreator(e.target.value)}>{CREATOR_OPTIONS.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select><button className="cs-btn" onClick={generateOpportunities} disabled={generating}>{generating ? "Synthesising…" : "Generate 6 opportunities"}</button></div></div>
          {!opportunities.length ? <div className="commerce-empty">Once signals exist, Qwen can turn them into creator-specific content experiments with a monetisation route, KPI and winner rule.</div> : (
            <div className="commerce-opportunity-list">
              {opportunities.slice(0, 12).map((item) => (
                <article className="commerce-opportunity" key={item.id}>
                  <div className="commerce-opportunity-head"><div><span className="commerce-badge">{String(item.creator_id || creator).toUpperCase()}</span><h3>{item.title}</h3><p>{item.summary}</p></div><span className="commerce-confidence">{item.evidence_confidence || "medium"} evidence</span></div>
                  <div className="commerce-opportunity-grid">
                    <div><label>Trend</label><b>{item.trend || "—"}</b></div>
                    <div><label>Product angle</label><b>{item.product_angle || "—"}</b></div>
                    <div><label>Visual angle</label><b>{item.aesthetic_angle || "—"}</b></div>
                    <div><label>Hook</label><b>{item.hook || "—"}</b></div>
                    <div><label>Format</label><b>{item.format || "—"}</b></div>
                    <div><label>Monetisation</label><b>{item.monetisation_route || "—"}</b></div>
                  </div>
                  <div className="commerce-opportunity-footer"><span>KPI: {item.kpi || "—"} · Winner rule: {item.winner_rule || "—"}</span><div><button className="cs-btn-ghost" onClick={() => createTest(item)}>Plan test</button><button className="cs-btn" onClick={() => applyOpportunity(item)}>Open in Creator Engine</button></div></div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="commerce-panel commerce-tests">
          <div className="commerce-panel-head"><div><strong>Monetisation tests</strong><span>Observed outcomes close the loop</span></div><span>{tests.length} planned / recorded</span></div>
          {tests.length ? <div className="commerce-test-list">{tests.slice(0, 12).map((item) => <div className="commerce-test" key={item.id}><div><b>{item.monetisation_route}</b><span>{item.creator_id} · {item.status}</span></div><div><span>Clicks {item.clicks ?? "—"}</span><span>Conversions {item.conversions ?? "—"}</span><span>Commission {item.commission ?? "—"}</span><button className="cs-btn-ghost" onClick={() => recordTestOutcome(item)}>{item.status === "complete" ? "Update outcome" : "Record outcome"}</button></div></div>)}</div> : <div className="commerce-empty">No tests planned yet.</div>}
          {outcomeTest ? <div style={{marginTop:12,padding:14,border:"1px solid var(--border)",borderRadius:12,background:"var(--surface-2)"}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div><b style={{fontSize:12}}>Record observed outcome</b><div style={{fontSize:9,color:"var(--text-muted)",marginTop:3}}>{outcomeTest.metadata?.opportunity_title || outcomeTest.monetisation_route}</div></div><button className="cs-btn-ghost" onClick={()=>setOutcomeTest(null)}>Cancel</button></div><div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:8,marginTop:12}}>{[['views','Views'],['clicks','Clicks'],['conversions','Orders'],['revenue','Revenue'],['commission','Commission']].map(([key,label])=><label key={key} style={{fontSize:9,color:"var(--text-subtle)",fontWeight:800,textTransform:"uppercase",letterSpacing:".08em"}}>{label}<input style={{width:"100%",boxSizing:"border-box",marginTop:5,padding:"9px 10px",border:"1px solid var(--border)",borderRadius:9,background:"var(--panel-2)",color:"var(--text)",font: "inherit"}} inputMode="decimal" value={outcomeDraft[key]} onChange={(e)=>setOutcomeDraft((d)=>({...d,[key]:e.target.value}))}/></label>)}</div><div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><button className="cs-btn" onClick={saveTestOutcome}>Save outcome →</button></div></div> : null}
        </section>

        <div className="commerce-disclaimer">Source discipline: Cornerstone records public evidence and operator-entered data. TikTok Shop API access is optional and requires approved credentials. Temu, Alibaba and TikTok Shop affiliate/commerce eligibility is not inferred from a product URL. Always use the applicable platform terms and disclosures.</div>
      </div>
    </EnterpriseShell>
  );
}
