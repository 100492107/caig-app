import { supabase } from "./supabase";
import { creatorDnaFor } from "../shared/creator-dna.js";

const PROFILES_KEY = "caig_owned_profiles_v1";
const EARNINGS_KEY = "caig_owned_earnings_v1";
const TABLE = "user_owned_media";

export const DEFAULT_PROFILES = [
  {
    id: "cara",
    name: "Cara Whitmore",
    type: "Owned creator",
    role: "BUILD · Agency",
    canonical_dna: creatorDnaFor("cara"),
    platforms: [
      { network: "Instagram", handle: "", url: "", status: "planned" },
      { network: "TikTok", handle: "", url: "", status: "planned" },
      { network: "Fanvue", handle: "", url: "", status: "planned" },
      { network: "X", handle: "", url: "", status: "planned" },
    ],
    notes: "Audience fantasy: My life is becoming more intentional. Story engine: decisions and consequences.",
  },
  {
    id: "lila",
    name: "Lila Sterling",
    type: "Owned creator",
    role: "NOTICE · Presence",
    canonical_dna: creatorDnaFor("lila"),
    platforms: [
      { network: "Instagram", handle: "", url: "", status: "planned" },
      { network: "TikTok", handle: "", url: "", status: "planned" },
      { network: "Fanvue", handle: "", url: "", status: "planned" },
    ],
    notes: "Audience fantasy: I want my everyday life to feel a little more like this. Story engine: places, people and small discoveries.",
  },
  {
    id: "cara_lila",
    name: "Cara + Lila",
    type: "Owned creator duo",
    role: "BUILD + NOTICE · Contrast",
    canonical_dna: creatorDnaFor("duo"),
    platforms: [
      { network: "Instagram", handle: "", url: "", status: "planned" },
      { network: "TikTok", handle: "", url: "", status: "planned" },
      { network: "YouTube Shorts", handle: "", url: "", status: "planned" },
    ],
    notes: "One wants to move forward. One wants to look around first. Neither is always right.",
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
    notes: "Cornerstone Content Engine packages.",
  },
  {
    id: "tiktok_brand",
    name: "Brand TikTok",
    type: "Short-form",
    role: "Shorts derivatives and tests",
    platforms: [
      { network: "TikTok", handle: "", url: "", status: "planned" },
      { network: "Instagram Reels", handle: "", url: "", status: "planned" },
    ],
    notes: "Cornerstone-owned commercial experiments.",
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
  if (remote.ok) {
    const source = remote.reason === "pulled" || remote.reason === "seeded" ? "cloud" : "local";
    return { ...remote, source };
  }
  return { ok: true, source: "local", reason: remote.reason, ...local };
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
