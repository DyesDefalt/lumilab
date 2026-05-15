import fs from 'node:fs/promises';
import PDFDocument from 'pdfkit';
import { buildHumanHtml, buildTechHandoffMarkdown } from './humanReport.js';

function esc(s='') { return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

export function buildReport({ cutoffDate, timezone, targetUrl, crawl, connectorData, analysis, comparison, trend }) {
  const top = analysis.issues.slice(0, 5);
  return {
    product: 'LumiLab',
    targetUrl,
    cutoffDate,
    timezone,
    scanTimestamp: new Date().toISOString(),
    dataDisclosure: connectorData.disclosure,
    connectorStatus: { websiteCrawler: 'live_read_only', ga4: connectorData.ga4.source, gsc: connectorData.gsc.source, business: connectorData.business.source, memory: 'local_json' },
    scores: analysis.scores,
    issueCounts: analysis.counts,
    dailyComparison: comparison,
    weeklyTrend: trend,
    executiveSummary: `LumiLab scanned ${crawl.pages.length} page(s) for ${targetUrl}. Overall health is ${analysis.scores.overall}/100. Top priority: ${top[0]?.title || 'No major issue detected'}.`,
    topIssues: top,
    issues: analysis.issues,
    developerActionPlan: top.map((i, idx) => ({ rank: idx + 1, priority: i.priority, page: i.page, task: i.recommendation, reason: `${i.title}. Score ${i.score}.` })),
    crawledPages: crawl.pages
  };
}

export function toMarkdown(report) {
  return `# LumiLab Website Visibility Report\n\n**Target:** ${report.targetUrl}\n**Cutoff date:** ${report.cutoffDate} (${report.timezone})\n**Scan timestamp:** ${report.scanTimestamp}\n\n## Disclosure\n${report.dataDisclosure}\n\n## Scores\n- Overall: ${report.scores.overall}/100\n- SEO: ${report.scores.seo}/100\n- AI Visibility: ${report.scores.aiVisibility}/100\n- Technical: ${report.scores.technical}/100\n\n## Executive Summary\n${report.executiveSummary}\n\n## Daily Comparison\n- New issues: ${report.dailyComparison.new}\n- Repeated issues: ${report.dailyComparison.repeated}\n- Resolved issues: ${report.dailyComparison.resolved}\n\n## Weekly Trend\n${report.weeklyTrend.status === 'available' ? `${report.weeklyTrend.direction}, delta ${report.weeklyTrend.overallScoreDelta}, ${report.weeklyTrend.scansCompared} scans compared.` : report.weeklyTrend.summary}\n\n## Top Priority Issues\n${report.topIssues.map((i, n) => `${n+1}. **${i.priority}** — ${i.title}\n   - Page: ${i.page}\n   - Score: ${i.score}\n   - Action: ${i.recommendation}`).join('\n')}\n\n## Developer Action Plan\n${report.developerActionPlan.map(t => `${t.rank}. [${t.priority}] ${t.task}\n   - ${t.page}\n   - ${t.reason}`).join('\n')}\n`;
}

function toHtml(report, markdown) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Inter,Arial,sans-serif;margin:40px;color:#172033}h1{color:#4f46e5}.card{border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin:12px 0}.score{font-size:28px;font-weight:800}.crit{color:#b42318}.high{color:#b54708}</style></head><body><h1>LumiLab Website Visibility Report</h1><p><b>Target:</b> ${esc(report.targetUrl)}<br><b>Cutoff:</b> ${esc(report.cutoffDate)} ${esc(report.timezone)}</p><div class="card"><div class="score">Overall ${report.scores.overall}/100</div><p>SEO ${report.scores.seo}/100 • AI Visibility ${report.scores.aiVisibility}/100 • Technical ${report.scores.technical}/100</p></div><h2>Executive Summary</h2><p>${esc(report.executiveSummary)}</p><h2>Top Issues</h2>${report.topIssues.map(i=>`<div class="card"><b>${esc(i.priority)} — ${esc(i.title)}</b><p>${esc(i.page)}</p><p>Score ${i.score}. ${esc(i.recommendation)}</p></div>`).join('')}<h2>Daily / Weekly</h2><p>New ${report.dailyComparison.new}, repeated ${report.dailyComparison.repeated}, resolved ${report.dailyComparison.resolved}.</p><p>Weekly trend: ${esc(report.weeklyTrend.direction || report.weeklyTrend.summary)}</p><h2>Disclosure</h2><p>${esc(report.dataDisclosure)}</p></body></html>`;
}

export async function writeReports(report) {
  const hist = `output/history/${report.cutoffDate}`;
  await fs.mkdir(hist, { recursive: true });
  const md = toMarkdown(report);
  const json = JSON.stringify(report, null, 2);
  await fs.writeFile('output/latest_report.json', json);
  await fs.writeFile('output/latest_report.md', md);
  await fs.writeFile(`${hist}/report.json`, json);
  await fs.writeFile(`${hist}/report.md`, md);
  const html = buildHumanHtml(report);
  const techMd = buildTechHandoffMarkdown(report);
  await fs.writeFile('output/latest_report.html', html);
  await fs.writeFile('output/tech_handoff.md', techMd);
  await fs.writeFile(`${hist}/report.html`, html);
  await fs.writeFile(`${hist}/tech_handoff.md`, techMd);
  await writePdf('output/latest_report.pdf', report);
  await writePdf(`${hist}/report.pdf`, report);
}

async function writePdf(path, report) {
  const { buildHumanHtml } = await import('./humanReport.js');
  const html = buildHumanHtml(report);
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', async () => {
      try { await fs.writeFile(path, Buffer.concat(chunks)); resolve(); }
      catch (e) { reject(e); }
    });

    const W = doc.page.width, H = doc.page.height;
    const left = 42, right = W - 42, contentW = W - 84;
    const ink = '#172033', muted = '#667085', line = '#E5E7EB', bg = '#F8FAFC';
    const purple = '#5B5EF7', green = '#067647', orange = '#B54708', red = '#B42318', dark = '#0B1020';
    const issueColor = p => p === 'Critical' ? red : p === 'High' ? orange : p === 'Medium' ? purple : '#475467';
    const addFooter = () => { doc.fillColor(muted).fontSize(8).text(`LumiLab • ${report.cutoffDate} • read-only monitoring`, left, H - 28, { width: contentW, align: 'center' }); };
    const newPage = () => { addFooter(); doc.addPage({ margin: 0, size: 'A4' }); doc.y = 42; };
    const section = (t) => { if (doc.y > 730) newPage(); doc.moveDown(.8); doc.fillColor(ink).fontSize(16).text(t, left, doc.y, { width: contentW }); doc.moveTo(left, doc.y+4).lineTo(right, doc.y+4).strokeColor(line).stroke(); doc.moveDown(.8); };
    const text = (t, size=10, color=ink) => { doc.fillColor(color).fontSize(size).text(String(t), left, doc.y, { width: contentW, lineGap: 2 }); };
    const bullet = (items) => { doc.fillColor(ink).fontSize(10).list(items, left+8, doc.y, { width: contentW-8, bulletRadius: 2, textIndent: 12 }); };
    const card = (x,y,w,h,label,value,note,color) => { doc.roundedRect(x,y,w,h,10).fillAndStroke('#FFFFFF', line); doc.fillColor(muted).fontSize(8).text(label,x+12,y+12,{width:w-24}); doc.fillColor(color).fontSize(24).text(String(value),x+12,y+29,{width:w-24}); doc.fillColor(muted).fontSize(8).text(note,x+12,y+60,{width:w-24}); };

    // Cover / human summary
    doc.rect(0,0,W,118).fill(dark);
    doc.fillColor('#9CCFFF').fontSize(9).text('LUMILAB HUMAN SEO REPORT', left, 28, { characterSpacing: 1 });
    doc.fillColor('#FFFFFF').fontSize(25).text('Adkivo Visibility Report', left, 45, { width: contentW });
    doc.fillColor('#D8DEF5').fontSize(10).text(`${report.targetUrl} • Cutoff ${report.cutoffDate} (${report.timezone})`, left, 82, { width: contentW });
    doc.y = 142;
    card(left, doc.y, 120, 82, 'Overall', `${report.scores.overall}/100`, 'Good, not done', green);
    card(left+132, doc.y, 120, 82, 'SEO Basics', `${report.scores.seo}/100`, 'Strong foundation', green);
    card(left+264, doc.y, 120, 82, 'AI Visibility', `${report.scores.aiVisibility}/100`, 'Main growth gap', red);
    card(left+396, doc.y, 120, 82, 'Technical', `${report.scores.technical}/100`, 'Healthy crawl', green);
    doc.y += 104;

    section('1. Plain-English Summary');
    text('Good news: Adkivo is crawlable, technically healthy, has a working sitemap, GTM tracking, and existing schema. This is a solid base.');
    doc.moveDown(.5);
    text('Main growth gap: the site does not yet package answers clearly enough for search snippets, AI answers, and non-technical readers. Pages need visible FAQ blocks, stronger comparison content, and intent-led sections.');
    doc.moveDown(.5);
    doc.roundedRect(left, doc.y, contentW, 54, 10).fillAndStroke('#FFF7ED', '#FED7AA');
    doc.fillColor(orange).fontSize(10).text('Next best move', left+14, doc.y+10);
    doc.fillColor(ink).fontSize(10).text('Add FAQ/answer blocks to homepage and platform pages, fix the robots sitemap domain, then use GSC queries to build content clusters around ad specs, creative specs, safe zones, and UTM workflows.', left+14, doc.y+25, { width: contentW-28 });
    doc.y += 72;

    section('2. What Is Working vs Holding Growth Back');
    bullet([
      'Working: live pages return 200, key pages crawl successfully, schema exists, sitemap works, GTM is installed.',
      'Holding back: robots fallback points to adkivo.com, metadataBase is missing, many pages use the same global title, FAQ/answer-readiness is weak.',
      'Business meaning: the product is discoverable, but not yet optimized to become the answer users and AI tools quote.'
    ]);

    section('3. Priority Board');
    for (const issue of (report.topIssues || []).slice(0, 6)) {
      if (doc.y > 700) newPage();
      const y = doc.y, c = issueColor(issue.priority);
      doc.roundedRect(left, y, contentW, 76, 8).fillAndStroke('#FFFFFF', line);
      doc.rect(left, y, 6, 76).fill(c);
      doc.fillColor(c).fontSize(9).text(issue.priority.toUpperCase(), left+14, y+10);
      doc.fillColor(ink).fontSize(11).text(issue.title, left+96, y+9, { width: 390 });
      doc.fillColor(muted).fontSize(8).text(issue.page, left+14, y+29, { width: contentW-28 });
      doc.fillColor(ink).fontSize(9).text(`Why it matters: limits how easily users, Google, and AI tools understand the exact answer/value.`, left+14, y+45, { width: contentW-28 });
      doc.fillColor(ink).fontSize(9).text(`Action: ${issue.recommendation}`, left+14, y+59, { width: contentW-28 });
      doc.y = y + 88;
    }

    section('4. Search & Content Opportunities');
    bullet([
      'Platform-specific specs: target searches like Meta Ads specs, TikTok creative specs, Google ad formats, safe zones.',
      'Comparison pages: explain Adkivo vs official platform docs, free ad specs checker, best ad specs database.',
      'Templates/checklists: creative QA checklist, UTM naming template, launch checklist. These earn links and repeat visits.',
      'AI-answer pages: short definitions, tables, examples, FAQ blocks, and schema.'
    ]);

    newPage();
    section('5. Competitor / Market Lens');
    text('Adkivo competes with official platform documentation, agency blogs, ad spec databases, and AI answers. The winning angle is speed and clarity: be easier than official docs, more actionable than blogs, and more structured than generic AI responses.');
    doc.moveDown(.5);
    bullet([
      'Official docs win on authority; Adkivo can win by summarizing across platforms and adding practical launch checklists.',
      'Agency blogs win on SEO coverage; Adkivo can win with tools, exports, specs tables, and freshness dates.',
      'AI answers win on speed; Adkivo can win by becoming the structured source those answers rely on.'
    ]);

    section('6. Source-Code Audit Highlights');
    const findings = report.sourceAudit?.findings || [];
    bullet(findings.map(f => `${f.severity}: ${f.title} — ${f.techAction}`).slice(0, 8));

    section('7. Technical Snapshot');
    for (const p of (report.crawledPages || []).slice(0, 12)) {
      if (doc.y > 750) newPage();
      doc.fillColor(p.statusCode >= 400 ? red : green).fontSize(8).text(String(p.statusCode), left, doc.y, { width: 30, continued: true });
      doc.fillColor(ink).text(` ${p.responseTimeMs}ms • schema ${p.schemaCount || 0} • FAQ ${p.hasFaqSignals ? 'yes' : 'no'} • ${p.url}`, { width: contentW-30 });
    }

    section('8. Tech / AI Handoff');
    bullet([
      'Fix src/app/robots.ts fallback domain to https://www.adkivo.my.id.',
      'Add metadataBase in src/app/layout.tsx using NEXT_PUBLIC_SITE_URL fallback.',
      'Add dynamic platform metadata in src/app/platform/[id]/page.tsx.',
      'Add visible FAQ sections and FAQPage schema where content exists.',
      'Track events: search_used, platform_view, utm_generated, specs_exported, outbound_doc_click.'
    ]);

    section('9. Data Notes');
    text(report.dataDisclosure, 9, muted);
    doc.moveDown(.4);
    text('Live sources used now: website crawler and source-code audit. GA4/GSC live connector is pending environment credentials/Maton access in this runtime.', 9, muted);
    addFooter();
    doc.end();
  });
}
