# LumiLab — Autonomous Website Visibility Agent

LumiLab turns website signals into prioritized growth actions.

## Core loop
`Scan → Analyze → Remember → Prioritize → Report → Dashboard`

## Quick start
```bash
npm install
cp .env.example .env
npm run scan
npm run dashboard
```
Open dashboard: `http://localhost:3001`

## Agent commands
```bash
npm run scan              # run website scan + reports
npm run openclaw:daily    # OpenClaw-compatible autonomous daily run
npm run dashboard         # dashboard + agent API
```

## Outputs
- `output/latest_report.json`
- `output/latest_report.html`
- `output/latest_report.pdf`
- `output/adkivo_seo_ai_visibility_report_clean.pdf`
- `output/tech_handoff.md`

## Hackathon compliance
See `docs/HACKATHON_ALIGNMENT.md`.

## Agent capabilities
See `docs/AGENT_CAPABILITIES.md`.
