import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = join(__dirname, '..', 'output');

function topByCategory(issues, category, limit = 5) {
  return issues
    .filter((i) => i.category === category)
    .slice(0, limit)
    .map((i) => ({
      id: i.id,
      title: i.title,
      priority: i.priority,
      priorityScore: i.priorityScore,
      page: i.page,
      recommendation: i.recommendation,
    }));
}

function buildExecutiveSummary({ scores, issues, dailyComparison, targetUrl }) {
  const critical = issues.filter((i) => i.priority === 'Critical').length;
  const high = issues.filter((i) => i.priority === 'High').length;
  const newCount = dailyComparison.newIssues?.length || 0;
  const resolvedCount = dailyComparison.resolvedIssues?.length || 0;

  return (
    `LumiLab scanned ${targetUrl} and analyzed ${issues.length} visibility issues. ` +
    `Website health: ${scores.websiteHealth}/100, SEO: ${scores.seo}/100, AI visibility: ${scores.aiVisibility}/100. ` +
    `${critical} critical and ${high} high-priority issues require attention. ` +
    `${newCount} new issue(s) since last scan; ${resolvedCount} resolved.`
  );
}

function buildDeveloperTasks(issues, limit = 10) {
  return issues.slice(0, limit).map((issue, idx) => ({
    taskId: `DEV-${String(idx + 1).padStart(3, '0')}`,
    priority: issue.priority,
    priorityScore: issue.priorityScore,
    title: issue.title,
    page: issue.page,
    category: issue.category,
    action: issue.recommendation,
    acceptanceCriteria: `Resolve "${issue.type}" on ${issue.page || 'site-wide'} and verify in next scan.`,
  }));
}

function buildActionPlan(issues) {
  const plan = { critical: [], high: [], medium: [], low: [] };
  for (const issue of issues) {
    const bucket = issue.priority?.toLowerCase() || 'low';
    if (plan[bucket]) plan[bucket].push(issue.title);
  }
  return plan;
}

export function buildReportPayload({
  cutoffDate,
  scanTimestamp,
  targetUrl,
  connectorStatus,
  crawlResult,
  performanceData,
  issues,
  scores,
  dailyComparison,
  weeklyTrend,
}) {
  const dataDisclosure = {
    websiteCrawler: 'LIVE — real HTTP crawl of target site',
    ga4: performanceData.ga4?.source === 'mock' ? 'MOCK — simulated GA4 data' : 'LIVE',
    searchConsole:
      performanceData.gsc?.source === 'mock' ? 'MOCK — simulated GSC data' : 'LIVE',
    business:
      performanceData.business?.source === 'mock'
        ? 'MOCK — simulated commerce/business signals'
        : 'LIVE',
    note: 'Mock connectors are clearly labeled. Replace with live adapters when credentials are configured.',
  };

  const executiveSummary = buildExecutiveSummary({
    scores,
    issues,
    dailyComparison,
    targetUrl,
  });

  return {
    meta: {
      product: 'LumiLab',
      version: '0.1.0',
      reportCutoffDate: cutoffDate,
      scanTimestamp,
      targetUrl,
      pagesCrawled: crawlResult?.pageCount || 0,
    },
    connectorStatus,
    dataDisclosure,
    scores,
    executiveSummary,
    topTechnicalIssues: topByCategory(issues, 'technical'),
    topSeoIssues: topByCategory(issues, 'seo'),
    topAiVisibilityIssues: topByCategory(issues, 'ai_visibility'),
    searchOpportunities: topByCategory(issues, 'search_opportunity', 5),
    businessIssues: topByCategory(issues, 'business', 5),
    dailyComparison,
    weeklyTrend,
    prioritizedIssues: issues.slice(0, 20),
    topPriorityIssues: issues.slice(0, 5),
    prioritizedActionPlan: buildActionPlan(issues),
    developerTasks: buildDeveloperTasks(issues),
    allIssues: issues,
    crawlSummary: {
      targetUrl: crawlResult?.targetUrl,
      crawledAt: crawlResult?.crawledAt,
      pageCount: crawlResult?.pageCount,
      errors: crawlResult?.errors || [],
    },
  };
}

export function reportToMarkdown(report) {
  const lines = [];
  lines.push('# LumiLab Visibility Report');
  lines.push('');
  lines.push(`**Cutoff date:** ${report.meta.reportCutoffDate}`);
  lines.push(`**Scan time:** ${report.meta.scanTimestamp}`);
  lines.push(`**Target:** ${report.meta.targetUrl}`);
  lines.push(`**Pages crawled:** ${report.meta.pagesCrawled}`);
  lines.push('');
  lines.push('## Data disclosure');
  lines.push('| Connector | Status |');
  lines.push('|-----------|--------|');
  lines.push(`| Website Crawler | ${report.dataDisclosure.websiteCrawler} |`);
  lines.push(`| GA4 | ${report.dataDisclosure.ga4} |`);
  lines.push(`| Search Console | ${report.dataDisclosure.searchConsole} |`);
  lines.push(`| Business | ${report.dataDisclosure.business} |`);
  lines.push(`> ${report.dataDisclosure.note}`);
  lines.push('');
  lines.push('## Executive summary');
  lines.push(report.executiveSummary);
  lines.push('');
  lines.push('## Scores');
  lines.push(`- Website Health: **${report.scores.websiteHealth}**/100`);
  lines.push(`- SEO: **${report.scores.seo}**/100`);
  lines.push(`- AI Visibility: **${report.scores.aiVisibility}**/100`);
  lines.push(`- Overall: **${report.scores.overall}**/100`);
  lines.push('');
  lines.push('## Top priority issues');
  for (const issue of report.topPriorityIssues) {
    lines.push(
      `- **[${issue.priority}]** ${issue.title} (score: ${issue.priorityScore}) — ${issue.page || 'site-wide'}`
    );
  }
  lines.push('');
  lines.push('## Daily comparison');
  lines.push(`- Previous scan: ${report.dailyComparison.previousDate || 'none'}`);
  lines.push(`- New: ${report.dailyComparison.newIssues?.length || 0}`);
  lines.push(`- Repeated: ${report.dailyComparison.repeatedIssues?.length || 0}`);
  lines.push(`- Resolved: ${report.dailyComparison.resolvedIssues?.length || 0}`);
  lines.push(`- Worsening: ${report.dailyComparison.worseningIssues?.length || 0}`);
  lines.push(`- Improving: ${report.dailyComparison.improvingIssues?.length || 0}`);
  lines.push('');
  lines.push('## Weekly trend');
  lines.push(report.weeklyTrend?.narrative || 'No weekly data yet.');
  lines.push('');
  lines.push('## Developer tasks');
  for (const task of report.developerTasks) {
    lines.push(`### ${task.taskId} — [${task.priority}] ${task.title}`);
    lines.push(`- Page: ${task.page || 'site-wide'}`);
    lines.push(`- Action: ${task.action}`);
    lines.push(`- Done when: ${task.acceptanceCriteria}`);
    lines.push('');
  }
  return lines.join('\n');
}

function htmlTemplate(markdownHtml, report) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>LumiLab Report — ${report.meta.reportCutoffDate}</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; color: #172033; margin: 40px; line-height: 1.6; }
    h1 { color: #6d5efc; }
    h2 { color: #334155; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .banner { background: #f5f8ff; border: 1px solid #c7d7fe; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; }
    .scores { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
    .score-card { background: #f8fafc; border: 1px solid #e5e7eb; padding: 12px 20px; border-radius: 8px; }
    .score-card strong { font-size: 24px; color: #6d5efc; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; }
    .critical { color: #b42318; font-weight: bold; }
    footer { margin-top: 40px; font-size: 12px; color: #667085; }
  </style>
</head>
<body>
  <div class="banner">
    <strong>LumiLab Visibility Report</strong><br>
    ${report.meta.targetUrl} · Cutoff: ${report.meta.reportCutoffDate}
  </div>
  <div class="scores">
    <div class="score-card">Health<br><strong>${report.scores.websiteHealth}</strong></div>
    <div class="score-card">SEO<br><strong>${report.scores.seo}</strong></div>
    <div class="score-card">AI Visibility<br><strong>${report.scores.aiVisibility}</strong></div>
  </div>
  ${markdownHtml}
  <footer>Generated by LumiLab · Mock data clearly labeled where applicable · Read-only monitoring</footer>
</body>
</html>`;
}

function getChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ].filter(Boolean);
    for (const p of candidates) {
      try {
        if (existsSync(p)) return p;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

async function generatePdf(html, outputPath) {
  const executablePath = getChromeExecutable();
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const browser = await puppeteer.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

export async function writeReports(report) {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const historyDir = join(OUTPUT_ROOT, 'history', report.meta.reportCutoffDate);
  await mkdir(historyDir, { recursive: true });

  const jsonStr = JSON.stringify(report, null, 2);
  const md = reportToMarkdown(report);
  const mdHtml = marked.parse(md);
  const html = htmlTemplate(mdHtml, report);

  const paths = {
    latestJson: join(OUTPUT_ROOT, 'latest_report.json'),
    latestMd: join(OUTPUT_ROOT, 'latest_report.md'),
    latestPdf: join(OUTPUT_ROOT, 'latest_report.pdf'),
    historyJson: join(historyDir, 'report.json'),
    historyMd: join(historyDir, 'report.md'),
    historyPdf: join(historyDir, 'report.pdf'),
  };

  await writeFile(paths.latestJson, jsonStr, 'utf-8');
  await writeFile(paths.latestMd, md, 'utf-8');
  await writeFile(paths.historyJson, jsonStr, 'utf-8');
  await writeFile(paths.historyMd, md, 'utf-8');

  try {
    await generatePdf(html, paths.latestPdf);
    await generatePdf(html, paths.historyPdf);
    paths.pdfGenerated = true;
  } catch (err) {
    console.warn(`[LumiLab] PDF generation skipped: ${err.message}`);
    console.warn('[LumiLab] Run: npx puppeteer browsers install chrome');
    paths.pdfGenerated = false;
    paths.pdfError = err.message;
  }

  return paths;
}

export default { buildReportPayload, reportToMarkdown, writeReports };
