# MoneyPrinterTurbo local production worker

MoneyPrinterTurbo is a local production worker for suitable short-form video formats. It is not the Creative Engine's strategist.

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
6. In Cornerstone Creative Engine → Distribution Lab, set the MPT host to `http://127.0.0.1:8080` and click **Check API**.

## Operating boundary

Use MPT for volume-friendly formats such as narrated explainers, stock-footage assembly, screen-recording-led video and captioned short-form. Keep premium Cara + Lila lifestyle/product creative in the existing image/video path when art direction and believable human presence are the point.

## Security

Keep `config.toml`, API keys, local storage and generated media on the Mac. Never commit secrets to GitHub or the Vercel deployment.
