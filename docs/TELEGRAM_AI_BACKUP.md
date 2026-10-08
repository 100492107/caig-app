# Telegram AI Backup — Cornerstone

Telegram is being added as a secondary interface to Cornerstone so the operating context remains usable even when the Cornerstone web UI or local Qwen stack is unavailable.

## What it does

- /status shows the configured provider and context status.
- /context returns the portable operating context.
- /export sends the context as a Markdown file.
- /clear clears rolling Telegram conversation memory.
- Any normal message becomes an AI request with the canonical portable context attached.

## Architecture

Telegram -> HTTPS webhook -> Vercel function -> authorised chat check -> portable context -> provider router -> Telegram.

Telegram Bot API supports HTTPS webhooks and a secret_token that Telegram sends in the X-Telegram-Bot-Api-Secret-Token header. Vercel Functions can expose HTTP handler files under api/.

Sources: Telegram Bot API / setWebhook; Vercel Functions API.

## Supported providers in the current scaffold

- Anthropic / Claude
- Google / Gemini
- xAI / Grok
- OpenAI-compatible endpoints

The model is selected by environment variables. No provider secret is committed to the repository.

## Required Vercel environment variables

TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
TELEGRAM_ALLOWED_CHAT_ID
TELEGRAM_AI_PROVIDER
TELEGRAM_AI_MODEL

Then the matching provider key:
ANTHROPIC_API_KEY
GEMINI_API_KEY
XAI_API_KEY
or AI_FALLBACK_BASE_URL + AI_FALLBACK_API_KEY.

For rolling conversation memory:
VITE_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

## Important boundary

Telegram is not the source of truth. GitHub + Supabase + the formal context documents remain authoritative.
New Life remains a separate personal system. The Cornerstone Telegram bot must not ingest or expose New Life private data.

## Webhook setup

After the bot token and secret are set in Vercel, point Telegram at the public Vercel endpoint using setWebhook with the secret_token. Telegram requires an HTTPS webhook URL.

Example:

curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://app.cornerstoneaigroup.com/api/telegram" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  -d 'allowed_updates=["message"]'

Authorise the bot with TELEGRAM_ALLOWED_CHAT_ID before using it for real business context.