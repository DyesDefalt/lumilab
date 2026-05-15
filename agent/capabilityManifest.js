export const capabilityManifest = {
  agent: 'Clawdyes / LumiLab Visibility Agent',
  mission: 'Autonomous website visibility monitoring: scan, analyze, remember, prioritize, report, and answer dashboard questions with tool-backed evidence.',
  hackathonAlignment: {
    toolCallCapability: ['Live crawler', 'GA4 via Maton', 'GSC via Maton', '9Router search/fetch', 'source-code audit', 'PDF generation', 'memory read/write'],
    autonomousLoop: 'Cron/OpenClaw triggers daily scan -> adapters -> memory comparison -> scoring -> report -> dashboard output.',
    reasoning: ['Issue severity', 'business value', 'traffic opportunity', 'recurrence factor', 'AI/GEO readiness'],
    workflowExecution: ['npm run openclaw:daily', 'output JSON/HTML/PDF', 'dashboard API endpoints'],
    notJustChatbot: 'Dashboard assistant is grounded in latest report, scan history, source audit, and live connector data.'
  },
  skills: [
    { name: 'website-seo', use: 'Technical SEO, schema, internal linking, content gap analysis' },
    { name: 'SEO specialist', use: 'Site audit, competitor/content strategy, ranking priorities' },
    { name: 'geo-seo-optimizer', use: 'Generative Engine Optimization / AI answer readiness' },
    { name: '9router-web-search', use: 'Competitor and SERP-style research through search-combo' },
    { name: '9router-web-fetch', use: 'Fetch blocked articles/templates and competitor pages through fetch-combo' },
    { name: '9router-image', use: 'Future visual/creative assets for dashboard/deck' },
    { name: 'api-gateway / Maton', use: 'Read-only GA4, GSC, GTM, Google Ads/Merchant connections' },
    { name: 'github', use: 'Read-only source audit and repo workflow' },
    { name: 'pdf', use: 'Readable PDF report generation and validation' },
    { name: 'frontend-design', use: 'Dashboard UX and executive report interface design' },
    { name: 'canvas-design', use: 'Deck/report visual structure' }
  ],
  outputs: ['output/latest_report.json', 'output/latest_report.html', 'output/latest_report.pdf', 'output/adkivo_seo_ai_visibility_report_clean.pdf', 'output/tech_handoff.md'],
  guardrails: ['Read-only website monitoring by default', 'No secrets in frontend/reports', 'No auto-fix without explicit approval', 'Non-GET external API writes require approval']
};
