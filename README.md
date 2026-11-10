# JayDev CTV Portal

Local React dashboard for checking credits, reviewing customers, preparing quick replies, and activating a Locket account through a configurable JayDev API contract.

## Cài nhanh cho người mới

- [Hướng dẫn Windows](docs/CAI_DAT_WINDOWS.md)
- [Hướng dẫn VPS Linux](docs/CAI_DAT_VPS_LINUX.md)

Windows:

```powershell
irm https://raw.githubusercontent.com/ninhneec/locket/main/scripts/setup-windows.ps1 | iex
```

Linux/VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/ninhneec/locket/main/scripts/setup-linux.sh | bash
```

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The app uses demo data while `JAYDEV_API_KEY` is empty. No live activation request is sent in demo mode. The key is read only by the Express server and is never bundled into browser JavaScript.

## Configure the API

The two source documents disagree about authentication and route names. Confirm the live contract with the API owner, then set these values in `.env.local`:

- `JAYDEV_API_BASE_URL`
- `JAYDEV_API_KEY`
- `JAYDEV_AUTH_MODE`: `x-api-key` or `bearer`
- `JAYDEV_STATS_PATH`
- `JAYDEV_CUSTOMERS_PATH`
- `JAYDEV_ACTIVATE_PATH`
- `JAYDEV_LOOKUP_PATH`

Do not commit `.env.local`. The included Express proxy owns the secret and serves the production frontend after `npm run build`.

## Telegram bot

Telegram is isolated in `server/telegram.ts`. Copy `config/telegram.example.json` to
`config/telegram.local.json`, then add your own `botToken`, `chatId`, and set
`enabled` to `true`. The local file is ignored by Git and is safe to keep out of
shared source archives.

Test the connection while the API is running:

```bash
curl -X POST http://localhost:8787/api/telegram/test
```

Check configuration status without revealing the token:

```bash
curl http://localhost:8787/api/telegram/status
```

## Checks

```powershell
npm run typecheck
npm run build
```
