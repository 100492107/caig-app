# Cara + Lila — Soft Commerce Lane

**Canonical rules for the SOFT COMMERCE content lane (10–15% of the public feed).**  
Hybrid model: build the brand with attention / useful / lifestyle posts, and use a **small** share of posts as UGC-style soft sells for affiliates and TikTok Shop — with Cara + Lila in frame.

Reference pattern (style only, not frequency): lifestyle AI/creators who weave a product into an ordinary moment (e.g. easy “this is what I use” energy).  
**We do that style. We do not do it all the time.**

---

## 1. Portfolio lock

| Lane | Target |
|------|--------|
| Attention / controversy | 20–30% |
| Useful / educational / interesting | 30–40% |
| Lifestyle / relationship / day-in-life | 25–35% |
| **Soft commerce** | **10–15%** |

In a 7-post week: **about 1** clear soft-commerce post (2 only if both are very soft). Never a majority sell feed.

---

## 2. Fanvue (hard rule)

- **Allowed:** link in profile bio and/or on caraandlila.com only.
- **Forbidden in Soft Commerce and every other public post:**
  - Fanvue named in caption, hook, on-screen text, or voiceover
  - “link in bio for exclusive”, “subscribe”, “Fans”, “exclusive page” as CTA
  - Any push toward Fanvue as the point of the video

People who want it will find it in the bio/site. Discovery content must not become a Fanvue funnel.

---

## 3. What Soft Commerce is

**UGC-style soft sell with Cara and/or Lila:**

- Ordinary lifestyle setting (GRWM, bag dump, morning, travel, home, shopping)
- Product appears as something they **actually use / prefer / refuse the alternative for**
- Monetisation path: **affiliate link** and/or **TikTok Shop** (and site picks) — not hard brand-deal theatre
- CTA is light: “this one”, “link in bio / shop”, product sticker — not a pitch deck

**Not Soft Commerce:**

- Hard open: “Buy this”, “Use code…”, countdown urgency as the whole video
- Random products outside style / home / travel / everyday finds
- Sell as the only reason the post exists
- Fanvue or subscription push

---

## 4. Soft Commerce quality gate (must pass)

Score 0/1. **Ship only if ≥ 5/6 and no NEVER.**

| # | MUST |
|---|------|
| 1 | Setting is ordinary lifestyle (same world as non-sell posts) |
| 2 | Product is secondary to a real moment, preference, or micro-story |
| 3 | First 1–2 seconds are **not** a buy CTA |
| 4 | Sounds like Cara and/or Lila (not generic ad voice) |
| 5 | Clear organic path: affiliate and/or TikTok Shop / site pick |
| 6 | Could sit next to a lifestyle post without looking like a different account |

| # | NEVER |
|---|------|
| 1 | Fanvue / exclusive / subscribe language |
| 2 | Hard sell as the hook |
| 3 | Product outside niche world |
| 4 | Fake urgency or fake scarcity |
| 5 | Turning the weekly feed into mostly commerce |

---

## 5. Generation instructions (for Qwen / Creator Engine)

When `content_lane` = Soft commerce:

1. Build a **complete lifestyle beat** first (what they’re doing, why it matters in one line).
2. Introduce **one** product as the natural object in that beat.
3. Preference language: “this is the one we keep”, “not the hyped one”, “worth it for X”.
4. CTA: single, soft, platform-native (TikTok Shop tag / “details in bio” / site).
5. Output must include:
   - `content_lane: soft_commerce`
   - `product_role`: why it belongs in the scene
   - `cta`: soft only
   - `monetisation_path`: affiliate | tiktok_shop | site
   - `fanvue_mention: false` (always)
6. Never invent prices, fake reviews, or medical claims.

---

## 6. How Soft Commerce relates to other lanes

- **Attention** posts may create curiosity; do not smuggle products into Attention Gate posts unless the lane is explicitly Soft Commerce.
- **Useful** posts can compare or explain without a buy CTA; if a product is the point of conversion, use Soft Commerce lane.
- **Lifestyle** posts should usually stay product-light; chemistry and world-building first.
- Reach from non-sell posts supports discovery of occasional soft sells — only if soft sells stay rare and native.

---

## 7. Operator stamp

```text
CONTENT LANE: SOFT COMMERCE
Product: _______________
Path: affiliate / TikTok Shop / site
MUST: _/6
NEVER: none / listed
Fanvue in post: NO
Verdict: SHIP / REWRITE / KILL
```

*Brand first. Soft sell second. Fanvue never in the feed — only bio/site.*
