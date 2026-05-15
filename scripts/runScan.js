import 'dotenv/config';
import { formatInTimeZone } from 'date-fns-tz';
import { crawlWebsite } from '../connectors/websiteCrawler.js';
import { loadConnectorData } from '../connectors/mockConnectors.js';
import { analyze } from '../agent/analyzer.js';
import { loadPreviousScan, loadRecentScans, saveScanMemory, compareIssues, weeklyTrend } from '../agent/memoryClient.js';
import { buildReport, writeReports } from '../agent/reportGenerator.js';
import { auditSource } from '../agent/sourceAudit.js';

const timezone = process.env.REPORT_TIMEZONE || 'Asia/Jakarta';
const cutoffDate = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
const targetUrl = process.env.TARGET_SITE_URL || 'https://www.adkivo.my.id/';
const crawlLimit = Number(process.env.CRAWL_LIMIT || 10);

try {
  const previous = await loadPreviousScan(cutoffDate);
  const crawl = await crawlWebsite(targetUrl, crawlLimit);
  const connectorData = await loadConnectorData();
  const analysis = analyze(crawl, connectorData, previous);
  const sourceAudit = await auditSource(process.env.TARGET_REPO_PATH, targetUrl);
  const comparison = compareIssues(analysis.issues, previous);
  const recentBeforeSave = await loadRecentScans(cutoffDate, 14);
  const trend = weeklyTrend([...recentBeforeSave, { scores: analysis.scores, issues: analysis.issues }]);
  const report = buildReport({ cutoffDate, timezone, targetUrl, crawl, connectorData, analysis, comparison, trend });
  report.sourceAudit = sourceAudit;
  await writeReports(report);
  await saveScanMemory(cutoffDate, report);
  console.log(JSON.stringify({ ok: true, cutoffDate, targetUrl, scores: report.scores, issueCounts: report.issueCounts, topIssues: report.topIssues.slice(0,3).map(i => ({ priority: i.priority, title: i.title, score: i.score, page: i.page })), pdf: 'output/latest_report.pdf' }, null, 2));
} catch (e) {
  console.error(e);
  process.exit(1);
}
