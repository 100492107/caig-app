# Local AI + Qwen — Portable Context

## Current operator setup

Main CAIG checkout (verified by operator 8 October 2026):
/Users/Joseph/Business/caig-app

Refresh:
~~~bash
cd /Users/Joseph/Business/caig-app
git pull origin main
bash scripts/start-local-ai-stack.sh
~~~

Verify models:
~~~bash
curl -s http://127.0.0.1:8000/v1/models | python3 -m json.tool | grep '"id"'
~~~

Latest verified model list included:
- mlx-community/Qwen3.5-9B-4bit
- Qwen/Qwen2.5-VL-3B-Instruct
- mlx-community/Qwen3-8B-4bit
- mlx-community/Qwen2.5-VL-3B-Instruct-4bit

## Services

Text Qwen: http://127.0.0.1:8000
Vision: http://127.0.0.1:8001
Whisper: http://127.0.0.1:8787 when installed

Supporting workers include source acquisition, scene analysis, production QA, references, commerce intelligence and captions.

## Architecture

UI → durable queue → local worker → Qwen / vision / media tools → stored result → operator review

Qwen is the local execution engine. The operating contract around it is the durable advantage.

## Qwen failure rule

Do not spend hours changing strategy because the worker is temporarily unavailable.

Switch execution provider and keep:
- business context
- creator context
- research method
- evidence rules
- quality gates
- output schema
- job detail

When the replacement model cannot access a local-only service, create the exact downstream prompt/work product and mark the local step as not run.

## Security

Never put secrets, service-role keys, auth tokens or credentials into the portable context.


## Telegram backup

The optional Telegram AI bot uses the same portable context, prefers local Qwen and fails over to configured external providers.

Start manually:

~~~bash
cd /Users/Joseph/Business/caig-app
npm run telegram:bot
~~~

See portable-ai/TELEGRAM_AI_CONTEXT.md.
