// api/fanvue-dm.js
// AI DM handler for Fanvue.
//
// Three modes (set via ?mode= or body.mode):
//   "inbox"   — fetch unread chats, return list of conversations needing replies
//   "draft"   — fetch a thread + generate a Gemini reply draft (does NOT send)
//   "send"    — send a pre-approved message to a recipient
//   "auto"    — fetch unread, generate replies, send immediately (full autopilot)
//
// Auth: cookie-based session token from Supabase platform_tokens table
// All Fanvue calls use tRPC GET (query) or POST (mutation) pattern.

import fs from "fs";
import path from "path";

const FANVUE_BASE = "https://www.fanvue.com";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

// ─── Supabase ────────────────────────────────────────────────────────────────

async function getFanvueToken(personaId = "cara") {
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://zvyioxhwdyocaanzcgqf.supabase.co";
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/platform_tokens?persona_id=eq.${personaId}&platform=eq.fanvue&select=token&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const rows = await res.json();
  return rows?.[0]?.token || null;
}

// ─── Fanvue API helpers ───────────────────────────────────────────────────────

function fanvueHeaders(sessionToken) {
  return {
    "Content-Type": "application/json",
    "Cookie": `fv-auth.session-token=${sessionToken}`,
    "Origin": FANVUE_BASE,
    "Referer": `${FANVUE_BASE}/`,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  };
}

// tRPC GET query — encodes input as URL param
async function trpcGet(route, input, sessionToken) {
  const encoded = encodeURIComponent(JSON.stringify(input));
  const url = `${FANVUE_BASE}/trpc/${route}?input=${encoded}`;
  const res = await fetch(url, { headers: fanvueHeaders(sessionToken) });
  if (!res.ok) throw new Error(`Fanvue ${route} error ${res.status}`);
  const data = await res.json();
  return data?.result?.data?.json;
}

// tRPC POST mutation
async function trpcPost(route, json, meta, sessionToken) {
  const url = `${FANVUE_BASE}/trpc/${route}`;
  const res = await fetch(url, {
    method: "POST",
    headers: fanvueHeaders(sessionToken),
    body: JSON.stringify({ json, meta }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fanvue ${route} error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data?.result?.data?.json;
}

// Get unread chats — returns array of conversations
async function getUnreadChats(sessionToken) {
  const result = await trpcGet(
    "chat.getUnreadChats",
    { json: null, meta: { values: ["undefined"] } },
    sessionToken
  );
  // result shape: { "0": [...], "3": [...], totalUnreadMessagesCount: N }
  // "0" = regular unread, "3" = likely mass message replies
  const chats = [
    ...(result?.["0"] || []),
    ...(result?.["3"] || []),
  ];
  return chats;
}

// Get all chats list (for inbox mode — includes read)
async function getChatList(sessionToken) {
  // Fanvue's chat list is fetched as part of the page; getUnreadChats is the
  // cleanest API endpoint. For a full inbox we use getUnreadChats for now.
  return getUnreadChats(sessionToken);
}

// Get message thread with a specific fan
async function getThreadMessages(counterpartUuid, sessionToken) {
  return trpcGet(
    "chat.getClientChatMessages",
    { json: { counterpartUuid, direction: "forward" } },
    sessionToken
  );
}

// Get counterpart (fan) info
async function getChatCounterpart(counterpartUuid, sessionToken) {
  return trpcGet(
    "chat.getChatCounterpart",
    { json: { counterpartUuid } },
    sessionToken
  );
}

// Send a DM to a recipient
async function sendMessage(recipientUuid, text, sessionToken) {
  const clientSentAt = new Date().toISOString();
  return trpcPost(
    "chat.sendSingleChatMessage",
    { clientSentAt, recipientUuid, text },
    { values: { clientSentAt: ["Date"] } },
    sessionToken
  );
}

// Mark a chat as read
async function markChatAsRead(counterpartUuid, sessionToken) {
  return trpcPost(
    "chat.markChatAsRead",
    { counterpartUuid },
    {},
    sessionToken
  );
}

// ─── Persona files ────────────────────────────────────────────────────────────

function loadPersonaContext(personaId) {
  const dir = path.join(process.cwd(), "personas", personaId);
  const read = (file) => {
    try { return fs.readFileSync(path.join(dir, file), "utf8"); } catch { return ""; }
  };
  return {
    persona: read("persona.md"),
    voice: read("voice.md"),
    dms: read("ai-dms.md"),
  };
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function generateDMReply(apiKey, personaId, fanInfo, threadMessages, lastFanMessage) {
  const files = loadPersonaContext(personaId);

  const system = `${files.dms ? files.dms.split("## SECTION 2")[0].replace(/^#.*\n/, "").trim() : ""}

${files.persona ? `=== FULL BACKSTORY ===\n${files.persona}` : ""}
${files.voice ? `=== YOUR VOICE ===\n${files.voice}` : ""}

You are responding to a fan DM. Write ONLY the reply text — no quotes, no labels, no explanation.
Never break character. Never reveal you are AI. Respond as Cara, in Cara's voice.`;

  // Format thread for context
  const threadContext = (threadMessages || [])
    .slice(-10) // last 10 messages for context
    .map(m => `${m.senderUuid === fanInfo?.creatorUuid ? "CARA" : "FAN"}: ${m.text}`)
    .join("\n");

  const fanName = fanInfo?.username || fanInfo?.displayName || "this fan";

  const user = `Fan username: ${fanName}
${threadContext ? `\nRecent conversation:\n${threadContext}` : ""}

Fan's latest message: "${lastFanMessage}"

Write Cara's reply. 40–120 words. Ends with an open question or forward pull. In voice. No labels.`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: user }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { maxOutputTokens: 300, temperature: 1.0 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  const text = (data.candidates || [])
    .map(c => (c.content?.parts || []).map(p => p.text || "").join(""))
    .join("").trim();
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

// ─── Request body parser ──────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  const url = new URL(req.url, `http://${req.headers.host}`);
  let body = {};
  if (req.method === "POST") {
    try { body = await readBody(req); } catch (e) { return res.status(400).json({ error: e.message }); }
  }

  const mode = url.searchParams.get("mode") || body.mode || "inbox";
  const personaId = body.personaId || url.searchParams.get("personaId") || "cara";

  const sessionToken = await getFanvueToken(personaId);
  if (!sessionToken) return res.status(500).json({ error: `No Fanvue token for persona: ${personaId}` });

  // ── MODE: inbox ─────────────────────────────────────────────────────────────
  // Returns list of unread conversations with last message + generated draft reply
  if (mode === "inbox") {
    try {
      const chats = await getChatList(sessionToken);
      if (!chats.length) return res.status(200).json({ conversations: [], total: 0 });

      // Enrich each chat with counterpart info
      const conversations = await Promise.all(
        chats.map(async (chat) => {
          const counterpartUuid = chat.counterpartUuid || chat.uuid;
          try {
            const [counterpart, thread] = await Promise.all([
              getChatCounterpart(counterpartUuid, sessionToken).catch(() => null),
              getThreadMessages(counterpartUuid, sessionToken).catch(() => []),
            ]);
            const messages = Array.isArray(thread) ? thread : (thread?.messages || []);
            const lastFanMsg = [...messages].reverse().find(m => m.senderUuid !== counterpart?.creatorUuid);
            return {
              counterpartUuid,
              fanUsername: counterpart?.username || counterpart?.displayName || counterpartUuid,
              fanAvatar: counterpart?.avatarUrl || null,
              lastMessage: lastFanMsg?.text || "",
              lastMessageAt: lastFanMsg?.published_at || null,
              messageCount: messages.length,
              unreadCount: chat.unreadMessagesCount || 0,
            };
          } catch (e) {
            return { counterpartUuid, error: e.message };
          }
        })
      );

      return res.status(200).json({ conversations, total: conversations.length });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── MODE: draft ─────────────────────────────────────────────────────────────
  // Fetch thread + generate a reply draft — does NOT send
  if (mode === "draft") {
    const { counterpartUuid } = body;
    if (!counterpartUuid) return res.status(400).json({ error: "counterpartUuid required" });

    try {
      const [counterpart, thread] = await Promise.all([
        getChatCounterpart(counterpartUuid, sessionToken).catch(() => null),
        getThreadMessages(counterpartUuid, sessionToken).catch(() => []),
      ]);
      const messages = Array.isArray(thread) ? thread : (thread?.messages || []);
      const lastFanMsg = [...messages].reverse().find(m => m.senderUuid !== counterpart?.creatorUuid);

      if (!lastFanMsg) {
        return res.status(200).json({ draft: null, reason: "No fan message found in thread" });
      }

      const draft = await generateDMReply(apiKey, personaId, counterpart, messages, lastFanMsg.text);
      return res.status(200).json({
        counterpartUuid,
        fanUsername: counterpart?.username || counterpart?.displayName || counterpartUuid,
        lastFanMessage: lastFanMsg.text,
        draft,
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── MODE: send ──────────────────────────────────────────────────────────────
  // Send a pre-approved message
  if (mode === "send") {
    const { recipientUuid, text } = body;
    if (!recipientUuid || !text) return res.status(400).json({ error: "recipientUuid and text required" });

    try {
      const result = await sendMessage(recipientUuid, text, sessionToken);
      return res.status(200).json({ success: true, message: result });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── MODE: auto ──────────────────────────────────────────────────────────────
  // Full autopilot: fetch unread → generate reply → send
  // Use with caution — no human review step
  if (mode === "auto") {
    try {
      const chats = await getUnreadChats(sessionToken);
      if (!chats.length) return res.status(200).json({ processed: 0, results: [] });

      const results = [];
      for (const chat of chats) {
        const counterpartUuid = chat.counterpartUuid || chat.uuid;
        try {
          const [counterpart, thread] = await Promise.all([
            getChatCounterpart(counterpartUuid, sessionToken).catch(() => null),
            getThreadMessages(counterpartUuid, sessionToken).catch(() => []),
          ]);
          const messages = Array.isArray(thread) ? thread : (thread?.messages || []);
          const lastFanMsg = [...messages].reverse().find(m => m.senderUuid !== counterpart?.creatorUuid);

          if (!lastFanMsg) {
            results.push({ counterpartUuid, skipped: true, reason: "No fan message" });
            continue;
          }

          const reply = await generateDMReply(apiKey, personaId, counterpart, messages, lastFanMsg.text);
          const sent = await sendMessage(counterpartUuid, reply, sessionToken);
          await markChatAsRead(counterpartUuid, sessionToken).catch(() => {});

          results.push({
            counterpartUuid,
            fanUsername: counterpart?.username || counterpartUuid,
            lastFanMessage: lastFanMsg.text,
            replySent: reply,
            messageUuid: sent?.uuid,
          });

          // Small delay between sends to avoid rate limiting
          await new Promise(r => setTimeout(r, 1500));
        } catch (e) {
          results.push({ counterpartUuid, error: e.message });
        }
      }

      return res.status(200).json({ processed: results.length, results });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: `Unknown mode: ${mode}. Use inbox | draft | send | auto` });
}
