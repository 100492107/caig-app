# MoneyPrinterTurbo local production worker

MoneyPrinterTurbo is a local production worker for suitable short-form video formats. It is not the Creative Engine's strategist.

## Architecture

`Creative Engine → Supabase mpt_video_jobs → Mac worker → MoneyPrinterTurbo → Supabase Storage → Creative Engine`

The browser does not call `127.0.0.1:8080` directly. The local worker does.

## Recommended Mac setup

1. Install Docker Desktop.
2. Clone the upstream project:

```bash
git clone https://github.com/harry0703/MoneyPrinterTurbo.git
cd MoneyPrinterTurbo
cp config.example.toml config.toml
```

3. Add the required API credentials to `config.toml`. Do not commit this file.
4. Start the prebuilt services:

```bash
docker compose -f docker-compose.release.yml up -d
```

5. Open the WebUI at `http://127.0.0.1:8501` and API docs at `http://127.0.0.1:8080/docs`.

## Supabase queue

Apply:

`supabase/migrations/20260817110000_mpt_video_jobs.sql`

This creates the `public.mpt_video_jobs` queue.

## Start the Cornerstone worker

From the `caig-app` repository, keep the service-role key local and never commit it:

```bash
export VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
export MPT_URL="http://127.0.0.1:8080"
```

Then:

```bash
npm install
npm run mpt:worker
```

The worker claims queued jobs, calls `POST /api/v1/videos`, polls `GET /api/v1/tasks/{task_id}`, downloads the finished MP4, uploads it to the existing `post-images` bucket under `creative/mpt/`, and records the public URL in `mpt_video_jobs`.

## App usage

In the Creative Engine hub, choose **Video Production**.

Select an existing Creative Engine output and click **Generate Reel with MoneyPrinterTurbo**. The job is queued in Supabase and the Mac worker renders it.

## Operating boundary

Use MPT for volume-friendly formats such as narrated explainers, stock-footage assembly, screen-recording-led video and captioned short-form. Keep premium Cara + Lila lifestyle/product creative in the existing image/video path when art direction and believable human presence are the point.

## Security

Keep `config.toml`, API keys and the Supabase service-role key off GitHub. For client-sensitive production, move MPT outputs into a dedicated private `creative-videos` bucket and switch the UI to signed URLs before broad client use.
