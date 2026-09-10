const PROFILES_KEY = "caig_owned_profiles_v1";
const EARNINGS_KEY = "caig_owned_earnings_v1";

export const DEFAULT_PROFILES = [
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
    notes: "Monetise via Fanvue / affiliate once posting is consistent.",
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
    notes: "Pair with Cara or run softer lifestyle angles.",
  },
  {
    id: "youtube_main",
    name: "Main YouTube",
    type: "Long-form channel",
    role: "Primary long-form + Shorts",
    platforms: [
      { network: "YouTube", handle: "", url: "", status: "planned" },
      { network: "YouTube Shorts", handle: "", url: "", status: "planned" },
    ],
    notes: "Content Engine packages ship here first.",
  },
  {
    id: "tiktok_brand",
    name: "Brand TikTok",
    type: "Short-form",
    role: "Clips from Multiply",
    platforms: [
      { network: "TikTok", handle: "", url: "", status: "planned" },
      { network: "Instagram Reels", handle: "", url: "", status: "planned" },
    ],
    notes: "Shorts derivatives and tests.",
  },
];

export function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return DEFAULT_PROFILES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_PROFILES;
  } catch {
    return DEFAULT_PROFILES;
  }
}

export function saveProfiles(rows) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(rows));
    window.dispatchEvent(new Event("caig-profiles-updated"));
  } catch {}
}

export function loadEarnings() {
  try {
    const raw = localStorage.getItem(EARNINGS_KEY);
    if (!raw) return { total: 0, currency: "GBP", entries: [] };
    const parsed = JSON.parse(raw);
    return {
      total: Number(parsed.total) || 0,
      currency: parsed.currency || "GBP",
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return { total: 0, currency: "GBP", entries: [] };
  }
}

export function saveEarnings(data) {
  try {
    localStorage.setItem(EARNINGS_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event("caig-earnings-updated"));
  } catch {}
}

export function profileStats(profiles = loadProfiles()) {
  const allPlatforms = profiles.flatMap((p) => p.platforms || []);
  const linked = allPlatforms.filter((pl) => String(pl.url || "").trim() || String(pl.handle || "").trim());
  const active = allPlatforms.filter((pl) => pl.status === "active");
  const withUrl = allPlatforms.filter((pl) => String(pl.url || "").trim().startsWith("http"));
  return {
    profiles: profiles.length,
    platforms: allPlatforms.length,
    linked: linked.length,
    active: active.length,
    withUrl: withUrl.length,
    linkedList: linked.map((pl) => ({
      network: pl.network,
      handle: pl.handle,
      url: pl.url,
      status: pl.status,
    })),
  };
}

export function formatMoney(amount, currency = "GBP") {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  } catch {
    return `£${Number(amount) || 0}`;
  }
}
