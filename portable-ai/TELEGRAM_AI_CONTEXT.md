# Telegram AI — Portable Backup / Alternate Interface

Telegram is an optional backup interface for Cornerstone AI Enterprises. It is not a second source of truth. It is an alternate way to keep working when the Cornerstone UI is unavailable, Qwen is unavailable, the Mac has a temporary issue, or the operator simply wants to work from Telegram.

The bot uses the same portable-ai context files as the external AI fallback system.

## Canonical relationship

GitHub / portable-ai = operating brain
Supabase = durable application state
Cornerstone UI = primary working interface
Telegram bot = alternate working interface
Local Qwen = preferred execution engine
Gemini / Claude / Grok / ChatGPT = replaceable fallback execution engines

The strategy and business context belong to the company, not to the model or the interface.

## Local operation

~~~bash
cd /Users/Joseph/Business/caig-app
npm run telegram:bot
~~~

The shared local AI stack can also start the bot automatically when TELEGRAM_BOT_TOKEN is present.

## Setup

Create a bot with Telegram's BotFather and keep the bot token private.

Put these values in the ignored local environment file:

~~~bash
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_ADMIN_CHAT_ID=YOUR_PRIVATE_CHAT_ID
~~~

For first setup, run the bot with only TELEGRAM_BOT_TOKEN, send /id, add the returned chat ID as TELEGRAM_ADMIN_CHAT_ID, and restart the bot. Until the admin chat is configured, the bot does not expose private AI context.

## Commands

/id — show the current Telegram chat ID during setup.
/start — show controls.
/status — show provider and Qwen health.
/provider — show preferred provider.
/provider qwen — use local Qwen first.
/provider gemini — use Gemini first.
/provider anthropic — use Claude first.
/provider grok — use Grok first.
/provider openai — use ChatGPT first.
/backup — send the portable operating context as Markdown.
/context — show loaded portable context files.
/clear — clear Telegram conversation history.

Normal messages are work requests.

## Provider failover

Default order:

Qwen → Gemini → Claude → Grok → ChatGPT

Providers without configured API keys are skipped. When Qwen fails, the bot continues to the next configured provider and reports which provider answered.

## Context carried into each request

The portable business model, Track A and Track B rules, Cara + Lila creator context, social + sales doctrine, YouTube automation context, local AI context, quality rules, evidence rules and the current Telegram conversation history.

The bot does not automatically send Supabase private records, customer/prospect data, service keys, authentication tokens or local filesystem secrets to external providers.

## Local-only capability rule

If a request depends on Qwen Vision, local Whisper, a particular media worker or a private authenticated Cornerstone action, the bot must say that the local capability was not run and provide the exact next work product or prompt instead. Never pretend a local capability executed.

## Backup philosophy

The important backup is the operating contract:

business model + creator identity + research method + social/sales doctrine + YouTube doctrine + quality rules + output rules + current priorities.

That contract can be loaded into another suitable AI even if Cornerstone or Qwen is unavailable.
