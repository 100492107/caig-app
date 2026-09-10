import { supabase } from "./supabase";

const PROFILES_KEY = "caig_owned_profiles_v1";
const EARNINGS_KEY = "caig_owned_earnings_v1";
const TABLE = "user_owned_media";

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

function emptyEarnings() {
  return { total: 0, currency: "GBP", entries: [] };
}

function normalizeProfiles(value) {
  return Array.isArray(value) && value.length ? value : DEFAULT_PROFILES;
}

function normalizeEarnings(value) {
  if (!value || typeof value !== "object") return emptyEarnings();
  return {
    total: Number(value.total) || 0,
    currency: value.currency || "GBP",
    entries: Array.isArray(value.entries) ? value.entries : [],
  };
}

export function loadProfilesLocal() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return DEFAULT_PROFILES;
    return normalizeProfiles(JSON.parse(raw));
  } catch {
    return DEFAULT_PROFILES;
  }
}

export function loadEarningsLocal() {
  try {
    const raw = localStorage.getItem(EARNINGS_KEY);
    if (!raw) return emptyEarnings();
    return normalizeEarnings(JSON.parse(raw));
  } catch {
    return emptyEarnings();
  }
}

export function loadProfiles() {
  return loadProfilesLocal();
}

export function loadEarnings() {
  return loadEarningsLocal();
}

function writeLocal(profiles, earnings) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    localStorage.setItem(EARNINGS_KEY, JSON.stringify(earnings));
  } catch {}
  window.dispatchEvent(new Event("caig-profiles-updated"));
  window.dispatchEvent(new Event("caig-earnings-updated"));
}

export function saveProfiles(rows) {
  const profiles = normalizeProfiles(rows);
  const earnings = loadEarningsLocal();
  writeLocal(profiles, earnings);
  pushToCloud(profiles, earnings).catch(() => {});
}

export function saveEarnings(data) {
  const earnings = normalizeEarnings(data);
  const profiles = loadProfilesLocal();
  writeLocal(profiles, earnings);
  pushToCloud(profiles, earnings).catch(() => {});
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

export async function pullFromCloud() {
  const userId = await currentUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "signed_out",
      profiles: loadProfilesLocal(),
      earnings: loadEarningsLocal(),
    };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("profiles,earnings,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      reason: error.message,
      profiles: loadProfilesLocal(),
      earnings: loadEarningsLocal(),
    };
  }

  if (!data) {
    const profiles = loadProfilesLocal();
    const earnings = loadEarningsLocal();
    const pushed = await pushToCloud(profiles, earnings);
    return {
      ok: pushed.ok,
      reason: pushed.ok ? "seeded" : pushed.reason,
      profiles,
      earnings,
    };
  }

  const profiles = normalizeProfiles(data.profiles);
  const earnings = normalizeEarnings(data.earnings);
  writeLocal(profiles, earnings);
  return { ok: true, reason: "pulled", profiles, earnings, updatedAt: data.updated_at };
}

export async function pushToCloud(profiles = loadProfilesLocal(), earnings = loadEarningsLocal()) {
  const userId = await currentUserId();
  if (!userId) {
    return { ok: false, reason: "signed_out" };
  }

  const payload = {
    user_id: userId,
    profiles: normalizeProfiles(profiles),
    earnings: normalizeEarnings(earnings),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "user_id" });
  if (error) return { ok: false, reason: error.message };
  return { ok: true, reason: "pushed" };
}

export async function hydrateOwnedMedia() {
  const local = {
    profiles: loadProfilesLocal(),
    earnings: loadEarningsLocal(),
  };
  const remote = await pullFromCloud();
  return remote.ok
    ? { ...remote, source: remote.reason === "pulled" ? "cloud" : "local" }
    : { ok: true, source: "local", reason: remote.reason, ...local };
}

export function profileStats(profiles = loadProfilesLocal()) {
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
