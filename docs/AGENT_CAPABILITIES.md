# LumiLab Agent Capabilities

## Agent brain
Clawdyes/OpenClaw operates the agent loop. LumiLab dashboard calls local agent endpoints to access reports, ask questions, and trigger scans.

## Connected skills/tools
- OpenClaw cron: daily/weekly autonomous loop.
- Maton API Gateway: read-only GA4/GSC/GTM and Google services.
- 9Router web fetch/search/image: competitor research, content extraction, visual generation.
- Website SEO + SEO + GEO skills: technical SEO, content gap, generative AI visibility.
- GitHub/source audit: read-only implementation audit.
- PDF skills: client-readable report + technical handoff.

## Dashboard powers
- Latest report cards.
- Connector status.
- Human SEO report download.
- Technical AI handoff download.
- Ask the agent: “What should I fix first?”, “What changed?”, “What should I tell my developer?”
- Trigger scan endpoint for demo/manual run.

## Guardrails
- No secrets exposed to frontend.
- No website edits in MVP.
- Auto-fix requires explicit approval.
