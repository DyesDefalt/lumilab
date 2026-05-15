import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import { loadPerformanceData, runCrawler, getConnectorStatus } from '../connectors/index.js';
import { analyzeWebsite } from '../agent/analyzer.js';
import { scoreAllIssues, computeSiteScores } from '../agent/scoring.js';
import { analyzeTrends } from '../agent/trendAnalyzer.js';
import {
  formatDate,
  loadTrends,
  saveTrends,
  saveScanSnapshot,
  updateTrendsFromIssues,
} from '../agent/memoryClient.js';
import { buildReportPayload, writeReports } from '../agent/reportGenerator.js';

async function main() {
  const cutoffDate = formatDate();
  const scanTimestamp = new Date().toISOString();
  const targetUrl = process.env.TARGET_SITE_URL;

  if (!targetUrl) {
    console.error('ERROR: TARGET_SITE_URL is not set in .env');
    process.exit(1);
  }

  console.log('LumiLab scan starting...');
  console.log(`  Target: ${targetUrl}`);
  console.log(`  Cutoff: ${cutoffDate}`);
  console.log(`  Data mode: ${process.env.DATA_MODE || 'mock'}`);

  const [crawlResult, performanceData] = await Promise.all([
    runCrawler({ targetUrl, limit: parseInt(process.env.CRAWL_LIMIT || '8', 10) }),
    loadPerformanceData(),
  ]);

  console.log(`  Crawled ${crawlResult.pageCount} page(s)`);

  const rawIssues = analyzeWebsite({ crawlResult, performanceData });
  const trends = await loadTrends();

  const preScored = rawIssues.map((i) => ({
    ...i,
    recurrenceFactor: trends.issues?.[i.id]?.occurrences >= 2 ? 2 : 1,
  }));
  const scored = scoreAllIssues(preScored);
  const scores = computeSiteScores(scored, crawlResult);

  const { issues, dailyComparison, weeklyTrend } = await analyzeTrends({
    scoredIssues: scored,
    trends,
    cutoffDate,
  });

  const finalScored = scoreAllIssues(issues);
  const connectorStatus = getConnectorStatus(performanceData, crawlResult);

  const report = buildReportPayload({
    cutoffDate,
    scanTimestamp,
    targetUrl,
    connectorStatus,
    crawlResult,
    performanceData,
    issues: finalScored,
    scores,
    dailyComparison,
    weeklyTrend,
  });

  const paths = await writeReports(report);

  const snapshot = {
    cutoffDate,
    scanDate: cutoffDate,
    scanTimestamp,
    targetUrl,
    scores,
    issueCount: finalScored.length,
    issues: finalScored.map((i) => ({
      id: i.id,
      title: i.title,
      priority: i.priority,
      priorityScore: i.priorityScore,
      category: i.category,
      trendStatus: i.trendStatus,
    })),
  };

  await saveScanSnapshot(cutoffDate, snapshot);
  const updatedTrends = updateTrendsFromIssues(trends, finalScored, cutoffDate);
  await saveTrends(updatedTrends);

  console.log('\nLumiLab scan complete.');
  console.log(`  Health: ${scores.websiteHealth} | SEO: ${scores.seo} | AI: ${scores.aiVisibility}`);
  console.log(`  Issues: ${finalScored.length} (${finalScored.filter((i) => i.priority === 'Critical').length} critical)`);
  console.log(`  Report: ${paths.latestJson}`);
  console.log(`  PDF:    ${paths.latestPdf}`);
}

main().catch((err) => {
  console.error('Scan failed:', err);
  process.exit(1);
});
