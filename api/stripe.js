// api/stripe.js — Unified Stripe handler (counts as 1 of 12 Vercel Hobby functions)
//
// Routes:
//   POST /api/stripe?action=checkout  — create a Stripe Checkout Session (admin only)
//   POST /api/stripe?action=webhook   — Stripe webhook (no auth, signature verified)
//
// Required env vars (set in Vercel dashboard):
//   STRIPE_SECRET_KEY        — sk_live_... (or sk_test_... for testing)
//   STRIPE_WEBHOOK_SECRET    — whsec_... (from Stripe Dashboard → Webhooks)
//   SUPABASE_URL             — https://....supabase.co
//   SUPABASE_SERVICE_ROLE_KEY
//   CRON_SECRET              — used to verify admin-only requests

import crypto from "crypto";

const STRIPE_API = "https://api.stripe.com/v1";

// £ price tiers in pence
const PLANS = {
  starter: { amount: 300000, label: "Starter — £3,000/mo", currency: "gbp" },
  growth:  { amount: 500000, label: "Growth — £5,000/mo",  currency: "gbp" },
  elite:   { amount: 800000, label: "Elite — £8,000/mo",   currency: "gbp" },
};

// ─── Stripe REST helpers ───────────────────────────────────────────────────────
function stripeEncode(obj, prefix = "") {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      parts.push(stripeEncode(v, key));
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "object") {
          parts.push(stripeEncode(item, `${key}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(item)}`);
        }
      });
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.join("&");
}

async function stripePost(path, data) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: stripeEncode(data),
  });
  return res.json();
}

// ─── Webhook signature verification (no SDK needed) ───────────────────────────
function verifyStripeSignature(rawBody, sigHeader, secret) {
  const parts = Object.fromEntries(
    sigHeader.split(",").map(p => { const [k, v] = p.split("="); return [k, v]; })
  );
  const timestamp = parts.t;
  const sig = parts.v1;
  if (!timestamp || !sig) return false;

  // Reject if > 5 minutes old
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

// ─── Supabase REST helper ──────────────────────────────────────────────────────
async function sbUpdate(table, match, data) {
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(match)) url.searchParams.set(k, `eq.${v}`);
  return fetch(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
}

async function sbInsert(table, data) {
  return fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
}

async function sbSelect(table, match) {
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set("select", "*");
  for (const [k, v] of Object.entries(match)) url.searchParams.set(k, `eq.${v}`);
  url.searchParams.set("limit", "1");
  const res = await fetch(url.toString(), {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const rows = await res.json();
  return rows?.[0] || null;
}

// ─── Main handler ──────────────────────────────────────────────────────────────
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  const action = req.query?.action;
  const rawBody = await readRawBody(req);

  // ── CREATE CHECKOUT SESSION ──────────────────────────────────────────────────
  if (action === "checkout") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    // Simple auth: must pass CRON_SECRET as Bearer token (admin only operation)
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { client_id, client_email, plan_tier, success_url, cancel_url } = JSON.parse(rawBody || "{}") || {};

    if (!client_id || !client_email || !plan_tier) {
      return res.status(400).json({ error: "Missing client_id, client_email, or plan_tier" });
    }

    const plan = PLANS[plan_tier];
    if (!plan) return res.status(400).json({ error: `Unknown plan: ${plan_tier}. Use: starter, growth, elite` });

    const origin = success_url?.split("/").slice(0, 3).join("/") || "https://app.cornerstoneaigroup.com";

    // Create Stripe Checkout Session (one-time invoice style — no recurring subscription complexity)
    const session = await stripePost("/checkout/sessions", {
      mode: "payment",
      customer_email: client_email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: plan.currency,
            unit_amount: plan.amount,
            product_data: {
              name: `Cornerstone AI — ${plan.label}`,
              description: "AI Creator managed service — first month. Subsequent months invoiced monthly.",
            },
          },
        },
      ],
      success_url: success_url || `${origin}/?payment=success`,
      cancel_url:  cancel_url  || `${origin}/?payment=cancelled`,
      metadata: {
        client_id,
        plan_tier,
        plan_amount: String(plan.amount),
      },
    });

    if (session.error) {
      console.error("Stripe checkout error:", session.error);
      return res.status(500).json({ error: session.error.message });
    }

    // Log the pending session in Supabase
    await sbInsert("client_subscriptions", {
      client_id,
      stripe_session_id: session.id,
      plan_tier,
      plan_amount: plan.amount,
      status: "pending",
    });

    return res.status(200).json({
      session_id: session.id,
      checkout_url: session.url,
    });
  }

  // ── STRIPE WEBHOOK ───────────────────────────────────────────────────────────
  if (action === "webhook") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const sigHeader = req.headers["stripe-signature"];
    if (!sigHeader) return res.status(400).json({ error: "Missing Stripe-Signature" });

    // rawBody already read at top of handler — used for signature verification
    const valid = verifyStripeSignature(rawBody, sigHeader, process.env.STRIPE_WEBHOOK_SECRET);
    if (!valid) return res.status(400).json({ error: "Invalid signature" });

    let event;
    try { event = JSON.parse(rawBody); } catch (_e) {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { client_id, plan_tier } = session.metadata || {};

      if (client_id) {
        // Mark subscription active
        await sbUpdate("client_subscriptions", { stripe_session_id: session.id }, {
          status: "active",
          stripe_customer_id: session.customer || null,
          updated_at: new Date().toISOString(),
        });

        // Also update profiles table so the client's tier is reflected
        await sbUpdate("profiles", { id: client_id }, {
          tier: plan_tier,
          subscription_status: "active",
        });
      }
    }

    if (event.type === "charge.refunded" || event.type === "checkout.session.expired") {
      const obj = event.data.object;
      const sessionId = obj.id || obj.payment_intent;
      if (sessionId) {
        await sbUpdate("client_subscriptions", { stripe_session_id: sessionId }, {
          status: "cancelled",
          updated_at: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({ received: true });
  }

  return res.status(400).json({ error: "Missing or unknown action. Use ?action=checkout or ?action=webhook" });
}

// Disable Vercel body parser globally so Stripe webhook signature verification works.
// Both routes read the raw body and parse manually.
export const config = {
  api: {
    bodyParser: false,
  },
};
