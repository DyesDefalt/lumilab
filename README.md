# LumiLab — Autonomous Website Visibility Agent

**Turning website signals into prioritized growth actions.**

LumiLab is a read-only monitoring agent that crawls a target website, analyzes SEO and AI visibility signals, combines connector-ready performance data (mock or live), remembers historical scans, prioritizes issues by business impact, and generates dashboard-ready reports.

> **Monitored demo target:** [Adkivo](https://www.adkivo.my.id) — built from [adswift-guide](https://github.com/DyesDefalt/adswift-guide.git). LumiLab is separate and never modifies the monitored site or that repo.

## Core loop

```
Scan → Analyze → Remember → Prioritize → Generate PDF Report → Dashboard
```

## Quick start

```bash
cd lumilab
cp .env.example .env
# Edit .env — default TARGET_SITE_URL=https://www.adkivo.my.id
npm install
# If Puppeteer Chrome download fails on Windows:
#   $env:PUPPETEER_SKIP_DOWNLOAD='true'; npm install
npm run scan
npm run dashboard
```

Open **http://localhost:3001**

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run scan` | Run full visibility scan and generate reports |
| `npm run dashboard` | Start local dashboard on port 3001 |
| `npm run daily-report` | Start cron scheduler (daily 09:00 Asia/Jakarta) |
| `npm start` | Alias for dashboard |

### One-off cron test

```bash
node scripts/runDailyCron.js --once
```

## Environment variables

See [.env.example](.env.example). Key variables:

| Variable | Description |
|----------|-------------|
| `TARGET_SITE_URL` | Website to crawl (default: https://www.adkivo.my.id) |
| `GSC_SITE_URL` | Search Console property URL (default: https://adkivo.my.id/) |
| `CRAWL_LIMIT` | Max pages to crawl (5–10 recommended) |
| `DATA_MODE` | `mock` or `live` |
| `PORT` | Dashboard port (default 3001) |
| `OPENAI_API_KEY` | BYOK for AI assistant (backend only) |
| `OPENAI_BASE_URL` | OpenAI-compatible API base URL |
| `OPENAI_MODEL` | Model name (e.g. gpt-4o-mini) |
| `ACTIONS_ENABLED` | Must stay `false` in MVP — no auto-edits |

## Output files

Every scan produces:

```
output/
├── latest_report.json
├── latest_report.md
├── latest_report.pdf
└── history/
    └── YYYY-MM-DD/
        ├── report.json
        ├── report.md
        └── report.pdf
```

Memory:

```
memory/
├── scans/YYYY-MM-DD.json
└── trends.json
```

## Priority scoring

```
Priority Score = Severity × Business Page Value × Traffic Opportunity × Recurrence Factor
```

| Score | Priority |
|-------|----------|
| 141+ | Critical |
| 81–140 | High |
| 41–80 | Medium |
| 0–40 | Low |

## Mock vs live data

| Connector | MVP status |
|-----------|------------|
| Website Crawler | **LIVE** — real HTTP crawl of https://www.adkivo.my.id |
| GA4 | **MOCK** — calibrated to Adkivo (21 users / 28d, 123 events) |
| Search Console | **MOCK** — calibrated to Adkivo (0 clicks, 3 indexed / 4 not indexed) |
| Business/Commerce | **MOCK** — guide/landing page signals |

Mock data mirrors your live GA4/GSC dashboards until API credentials are wired. Set `DATA_MODE=live`, add `GA4_PROPERTY_ID` and `GOOGLE_APPLICATION_CREDENTIALS`, then implement `connectors/matonGoogleConnector.placeholder.js`.

**Related URLs**
- Production: https://www.adkivo.my.id/
- Vercel preview: https://adkivomy-p4f0dvyao-adie-azzams-projects.vercel.app
- Source repo: https://github.com/DyesDefalt/adswift-guide.git

## OpenClaw cron (daily scan)

Schedule LumiLab to run daily at **09:00 Asia/Jakarta**:

**Option A — built-in scheduler:**
```bash
npm run daily-report
```

**Option B — OpenClaw / system cron:**
```cron
0 9 * * * cd /path/to/lumilab && /usr/bin/node scripts/runScan.js >> logs/scan.log 2>&1
```

Weekly trend summaries are included automatically when enough scan history exists in `memory/`.

## AI assistant (BYOK)

- Endpoint: `POST /api/assistant` with `{ "question": "..." }`
- Uses `output/latest_report.json` as sole context
- API keys stay on the server — never sent to the browser
- Configure `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` in `.env`

## Security

- Never commit `.env` or API keys
- Read-only crawl — no writes to monitored websites
- `ACTIONS_ENABLED=false` by default
- Future action capabilities require explicit user approval

## Project structure

```
lumilab/
├── connectors/       # Crawler + mock/live adapters
├── agent/            # Analyzer, scoring, memory, trends, reports
├── dashboard/        # Express server + static UI
├── mock-data/        # GA4, GSC, commerce fixtures
├── memory/           # Scan history (gitignored)
├── output/           # Reports (gitignored)
├── scripts/          # runScan.js, runDailyCron.js
├── .env.example
└── README.md
```

## Hackathon compliance

| Requirement | Evidence |
|-------------|----------|
| Tool calls | Crawler, adapters, memory R/W, report generator |
| Autonomous loop | `npm run scan` end-to-end |
| Reasoning | Severity, traffic opportunity, recurrence |
| Decision-making | Priority classification + action plan |
| Workflow | Scan → report → dashboard update |

## Demo script (2 min)

1. Show `TARGET_SITE_URL=https://www.adkivo.my.id` in `.env`
2. Run `npm run scan` — show console output and generated PDF
3. Open dashboard — scores, top 5 issues, trend cards
4. Ask AI assistant: "What should I fix first?"
5. Highlight mock data disclosure in report

## Roadmap

- [ ] Live GA4 / GSC via Maton or Google service account
- [ ] mem9 cloud memory integration
- [ ] Lighthouse / Core Web Vitals
- [ ] Telegram/Discord alerts
- [ ] User-approved action mode (never auto-fix in MVP)

## License

MIT
