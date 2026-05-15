---
name: lumilab-visibility-agent
description: Run LumiLab autonomous website visibility monitoring for any website: crawl, SEO audit, AI/GEO readiness, speed fallback, daily/weekly bilingual PDF reports, dashboard API, and approval-gated fix loop. Use when user wants to install/copy LumiLab agent capability to another server or run recurring website visibility reports.
---

# LumiLab Visibility Agent

Use this skill to operate LumiLab as an OpenClaw-powered website visibility agent.

## What it does

- Crawls a target website read-only.
- Extracts SEO, technical, and AI/GEO answer-readiness signals.
- Loads mock/live-ready GA4/GSC/business adapters.
- Compares against local memory.
- Scores dimensions on a 1-100 scale.
- Generates daily and weekly bilingual PDF reports.
- Powers a dashboard assistant from report artifacts.
- Can create an approval-gated fix loop for another AI agent.

## Score meaning

1 is worst, 100 is best.

- 90-100: excellent.
- 70-89: good, with growth gaps.
- 40-69: needs focused fixes.
- 1-39: high risk.

Scores are similar to PageSpeed/Lighthouse in reading style, but LumiLab scores SEO, technical crawlability, AI/GEO readiness, and weighted overall health.

## Standard workflow

From a LumiLab project folder:

```bash
npm install
cp .env.example .env
npm run scan
python3 scripts/generateBilingualReports.py
npm run dashboard
```

Dashboard: `http://localhost:3001`

## Required `.env`

```bash
TARGET_SITE_URL=https://example.com/
CRAWL_LIMIT=10
DATA_MODE=mock
REPORT_TIMEZONE=Asia/Jakarta
PORT=3001
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4o-mini
```

Optional live connector values can be added for GA4/GSC/Maton.

## Recurring report

Use OpenClaw cron to run daily:

```bash
npm run openclaw:daily
python3 scripts/generateBilingualReports.py
```

Expected outputs:

- `output/latest_report.json`
- `output/latest_report.html`
- `output/latest_report.pdf`
- `output/adkivo_daily_bilingual_visibility_report.pdf`
- `output/adkivo_weekly_bilingual_visibility_report.pdf`
- `output/tech_handoff.md`

## Guardrails

- Read-only website monitoring by default.
- Do not expose secrets in reports/dashboard.
- Do not auto-fix or deploy without explicit approval.
- For source-code fixes: branch, patch, test, rescan, report, then ask approval before push/deploy.

## Fix-loop prompt

Use the prompt in `docs/OPENCLAW_AGENT_PROMPT.md` when another OpenClaw agent should fix the website.
