function esc(s='') { return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function pct(n) { return `${Math.round(n)}%`; }
function severityClass(s) { return String(s).toLowerCase(); }

export function buildHumanHtml(report) {
  const top = report.topIssues || [];
  const sourceFindings = report.sourceAudit?.findings || [];
  const good = sourceFindings.filter(f => f.severity === 'Good');
  const problems = sourceFindings.filter(f => f.severity !== 'Good');
  const slowPages = [...(report.crawledPages || [])].sort((a,b)=>(b.responseTimeMs||0)-(a.responseTimeMs||0)).slice(0,5);
  const platforms = (report.crawledPages || []).filter(p => p.url.includes('/platform/')).slice(0,8);
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>LumiLab Human SEO Report</title><style>
:root{--ink:#172033;--muted:#667085;--line:#e5e7eb;--bg:#f6f7fb;--card:#fff;--purple:#5B5EF7;--cyan:#00A3FF;--green:#067647;--orange:#B54708;--red:#B42318;--soft:#F8FAFC}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,Arial,sans-serif;line-height:1.5}.hero{background:linear-gradient(135deg,#0B1020,#172033);color:white;padding:42px}.wrap{max-width:1080px;margin:auto;padding:28px}.hero .wrap{padding:0}.eyebrow{color:#9ccfff;text-transform:uppercase;letter-spacing:.08em;font-size:12px;font-weight:800}h1{font-size:36px;line-height:1.05;margin:8px 0 10px}h2{font-size:24px;margin:0 0 14px}h3{font-size:17px;margin:16px 0 8px}.sub{color:#d8def5;max-width:850px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin-bottom:18px;box-shadow:0 8px 24px rgba(16,24,40,.05)}.kpi .label{color:var(--muted);font-size:12px;font-weight:700}.kpi .value{font-size:34px;font-weight:900;color:var(--purple);margin-top:4px}.kpi .note{font-size:12px;color:var(--muted)}.badge{display:inline-block;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:800}.good{background:#ecfdf3;color:var(--green)}.medium{background:#eef2ff;color:var(--purple)}.high{background:#fffcf5;color:var(--orange)}.critical{background:#fffbfa;color:var(--red)}.low{background:#f2f4f7;color:#344054}.issue{border-left:6px solid var(--purple)}.issue.high{border-left-color:var(--orange)}.issue.critical{border-left-color:var(--red)}.issue.low{border-left-color:#98a2b3}.muted{color:var(--muted)}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:var(--soft);font-weight:800}.callout{border:1px solid #bfdbfe;background:#eff6ff;border-radius:16px;padding:16px;margin:14px 0}.action{background:#fff7ed;border-color:#fed7aa}.small{font-size:12px}.footer{font-size:11px;color:var(--muted);text-align:center;padding:24px}@media print{body{background:white}.card{box-shadow:none;break-inside:avoid}.hero{print-color-adjust:exact;-webkit-print-color-adjust:exact}.wrap{padding:18px}.grid{grid-template-columns:repeat(4,1fr)}a{color:inherit;text-decoration:none}}@media(max-width:800px){.grid,.two{grid-template-columns:1fr}h1{font-size:28px}}
</style></head><body>
<header class="hero"><div class="wrap"><div class="eyebrow">LumiLab autonomous website visibility report</div><h1>Adkivo is technically healthy, but needs stronger answer-ready content to win search and AI discovery.</h1><p class="sub">This report is written for founders, marketers, and developers. It translates crawler, source-code, and connector-ready search data into clear priorities.</p><p class="small">Target: ${esc(report.targetUrl)} • Cutoff: ${esc(report.cutoffDate)} (${esc(report.timezone)})</p></div></header>
<main class="wrap">
<section class="grid">
<div class="card kpi"><div class="label">Overall Health</div><div class="value">${report.scores.overall}</div><div class="note">Good, not done</div></div>
<div class="card kpi"><div class="label">SEO Basics</div><div class="value">${report.scores.seo}</div><div class="note">Strong foundation</div></div>
<div class="card kpi"><div class="label">AI Visibility</div><div class="value">${report.scores.aiVisibility}</div><div class="note">Main growth gap</div></div>
<div class="card kpi"><div class="label">Technical Health</div><div class="value">${report.scores.technical}</div><div class="note">Healthy crawl</div></div>
</section>

<section class="card"><h2>1. Plain-English Summary</h2>
<p><b>Good news:</b> Adkivo is crawlable, fast on most pages, has a working sitemap, GTM tracking, and existing schema. This is already better than many early-stage sites.</p>
<p><b>Main problem:</b> the site explains a lot, but it does not yet package answers in a way that search snippets, AI answers, and non-technical users can quickly reuse. Pages need more explicit question-answer blocks, comparison content, and intent-driven sections.</p>
<div class="callout action"><b>Next best move:</b> add FAQ/answer blocks to the homepage and platform pages, fix the robots sitemap domain, then use GSC queries to create content clusters around “ad specs”, “creative specs”, “safe zone”, “UTM generator”, and platform-specific ad format questions.</div>
</section>

<section class="two">
<div class="card"><h2>2. What Is Working</h2><ul>
${good.map(f=>`<li><b>${esc(f.title)}</b><br><span class="muted">${esc(f.userImpact)}</span></li>`).join('') || '<li>Website is reachable and key SEO basics are present.</li>'}
<li><b>Live sitemap works</b><br><span class="muted">Important pages can be discovered at /sitemap.xml.</span></li>
<li><b>Schema exists</b><br><span class="muted">Homepage has Organization/WebSite/SoftwareApplication JSON-LD.</span></li>
</ul></div>
<div class="card"><h2>3. What Is Holding Growth Back</h2><ul>
${problems.map(f=>`<li><b>${esc(f.title)}</b><br><span class="muted">${esc(f.userImpact)}</span></li>`).join('')}
<li><b>Weak answer-readiness</b><br><span class="muted">Pages do not expose enough concise FAQs for search snippets and AI answer systems.</span></li>
<li><b>Generic page titles across crawled routes</b><br><span class="muted">Many pages return the global title. Platform pages should have platform-specific titles.</span></li>
</ul></div>
</section>

<section class="card"><h2>4. Priority Board</h2>
${top.slice(0,8).map(i=>`<div class="card issue ${severityClass(i.priority)}"><span class="badge ${severityClass(i.priority)}">${esc(i.priority)}</span> <b>${esc(i.title)}</b><p class="muted">${esc(i.page)}</p><p><b>Why it matters:</b> This limits how easily users, Google, and AI tools understand the page’s exact answer/value.</p><p><b>Action:</b> ${esc(i.recommendation)}</p></div>`).join('')}
</section>

<section class="card"><h2>5. Search & Content Opportunities</h2>
<p>Without live GSC data connected in this environment, this section uses crawler/source audit plus practical search intent mapping. Once Maton GSC is connected, it should show exact queries, impressions, CTR, and ranking movement.</p>
<table><tr><th>Opportunity</th><th>Why it matters</th><th>Recommended content</th></tr>
<tr><td>Platform-specific specs</td><td>High-intent users search for exact ad sizes, formats, and safe zones.</td><td>“Meta Ads specs 2026”, “TikTok Spark Ads specs”, “Google Demand Gen creative specs”.</td></tr>
<tr><td>Comparison pages</td><td>Competitor tools win by answering “which tool/source should I use?”</td><td>“Adkivo vs official ad specs docs”, “Best free ad specs checker”.</td></tr>
<tr><td>Templates/checklists</td><td>Downloadable assets earn links and repeat visits.</td><td>Creative QA checklist, UTM naming template, platform launch checklist.</td></tr>
<tr><td>AI-answer pages</td><td>LLMs prefer direct, structured answers.</td><td>FAQ blocks, short definitions, tables, schema, examples.</td></tr>
</table></section>

<section class="card"><h2>6. Competitor / Market Lens</h2>
<p>Adkivo competes less with generic blogs and more with <b>official platform docs, agency checklists, ad spec databases, and AI search answers</b>. To win, it should be faster to use than official docs and more practical than blog articles.</p>
<table><tr><th>Competitor type</th><th>Their strength</th><th>How Adkivo can beat it</th></tr>
<tr><td>Official Meta/Google/TikTok docs</td><td>Authority and accuracy</td><td>Summarize across platforms, add practical launch checklists, simplify language.</td></tr>
<tr><td>Agency blog templates</td><td>SEO content coverage</td><td>Build interactive tools and downloadable checklists, not only articles.</td></tr>
<tr><td>Ad spec databases</td><td>Fast lookup</td><td>Add freshness dates, cross-platform comparison, exportable specs.</td></tr>
<tr><td>AI answers</td><td>Instant answers</td><td>Make pages answer-ready so AI tools cite/use Adkivo content.</td></tr>
</table></section>

<section class="card"><h2>7. Technical Snapshot</h2>
<table><tr><th>Page</th><th>Status</th><th>Speed</th><th>Schema</th><th>FAQ-ready?</th></tr>
${(report.crawledPages||[]).slice(0,12).map(p=>`<tr><td>${esc(p.url)}</td><td>${p.statusCode}</td><td>${p.responseTimeMs}ms</td><td>${p.schemaCount||0}</td><td>${p.hasFaqSignals?'Yes':'No'}</td></tr>`).join('')}
</table>
<h3>Slowest crawled pages</h3><ul>${slowPages.map(p=>`<li>${esc(p.url)} — ${p.responseTimeMs}ms</li>`).join('')}</ul>
</section>

<section class="card"><h2>8. 7-Day Action Plan</h2>
<ol>
<li><b>Fix robots sitemap domain.</b> Set Vercel <code>NEXT_PUBLIC_SITE_URL=https://www.adkivo.my.id</code> and update fallback in <code>src/app/robots.ts</code>.</li>
<li><b>Create FAQ blocks.</b> Homepage, /platform/meta, /platform/google, /platform/tiktok, /universal-specs.</li>
<li><b>Improve platform page metadata.</b> Each platform page needs unique title/description.</li>
<li><b>Add BreadcrumbList + FAQPage schema.</b> Only where content exists.</li>
<li><b>Connect GSC/GA4.</b> Pull exact top queries, landing pages, CTR drops, and conversion pages.</li>
<li><b>Create 3 content clusters.</b> Ad specs, UTM/tracking, creative safe zones.</li>
</ol></section>

<section class="card"><h2>9. Data Notes</h2>
<p>${esc(report.dataDisclosure)}</p><p>Live sources used now: website crawler and source-code audit. Connector-ready sources: GA4, GSC, PageSpeed, SERP/rank tracker.</p></section>
</main><div class="footer">Generated by LumiLab / Clawdyes. Read-only monitoring. No website changes were made.</div></body></html>`;
}

export function buildTechHandoffMarkdown(report) {
  const sourceFindings = report.sourceAudit?.findings || [];
  return `# LumiLab Tech / AI Handoff Report\n\nTarget: ${report.targetUrl}\nCutoff: ${report.cutoffDate} (${report.timezone})\n\n## Goal\nImprove Adkivo SEO, AI visibility, and search-driven acquisition without breaking the existing Next.js app.\n\n## Current State\n- Overall: ${report.scores.overall}/100\n- SEO: ${report.scores.seo}/100\n- AI Visibility: ${report.scores.aiVisibility}/100\n- Technical: ${report.scores.technical}/100\n- Critical issues: ${report.issueCounts.Critical}\n- High issues: ${report.issueCounts.High}\n\n## Source Audit Findings\n${sourceFindings.map(f=>`### ${f.severity}: ${f.title}\n- Area: ${f.area}\n- Evidence: ${f.evidence}\n- User impact: ${f.userImpact}\n- Tech action: ${f.techAction}`).join('\n\n')}\n\n## Top Implementation Tasks\n1. Fix robots sitemap domain.\n   - File: \`src/app/robots.ts\`\n   - Change fallback from \`https://adkivo.com\` to \`https://www.adkivo.my.id\`.\n   - Verify Vercel env \`NEXT_PUBLIC_SITE_URL=https://www.adkivo.my.id\`.\n\n2. Add unique metadata for platform pages.\n   - File likely: \`src/app/platform/[id]/page.tsx\`\n   - Generate title: \`{Platform} Ads Specs, Formats & Creative Guide | Adkivo\`.\n   - Generate description with platform name, specs, safe zones, creative requirements.\n\n3. Add answer-ready FAQ sections.\n   - Pages: homepage, /platform/meta, /platform/google, /platform/tiktok, /universal-specs.\n   - Each FAQ should answer real buyer/search questions in 40-80 words.\n\n4. Add schema extensions.\n   - Add BreadcrumbList to platform pages.\n   - Add FAQPage schema only when FAQ content exists.\n\n5. Add conversion/event tracking verification.\n   - Events: search_used, platform_view, utm_generated, specs_exported, outbound_doc_click, contact_submit.\n\n## Cursor Prompt\n\`\`\`txt\nYou are editing the Adkivo Next.js project. Do not change unrelated files.\n\nTasks:\n1. Fix src/app/robots.ts fallback domain to https://www.adkivo.my.id and keep sitemap path /sitemap.xml.\n2. Add metadataBase in src/app/layout.tsx using NEXT_PUBLIC_SITE_URL fallback https://www.adkivo.my.id.\n3. Add dynamic platform metadata in src/app/platform/[id]/page.tsx: unique title, description, OpenGraph, canonical.\n4. Add visible FAQ sections to homepage and platform detail pages. Keep copy concise and useful to marketers.\n5. Add FAQPage schema only where FAQ content is rendered. Add BreadcrumbList schema to platform pages.\n6. Do not remove existing schema, GTM, Supabase, or platform data.\n7. Run npm run build and report changed files.\n\`\`\`\n\n## Crawled Pages\n${(report.crawledPages||[]).map(p=>`- ${p.statusCode} ${p.responseTimeMs}ms ${p.url} | schema=${p.schemaCount||0} | faq=${p.hasFaqSignals?'yes':'no'} | h1=${(p.h1||[]).join('; ')}`).join('\n')}\n`;
}
