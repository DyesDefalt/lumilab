import { loadScanByDate, listScanDates, formatDate, dateOffset } from './memoryClient.js';

function issueMapFromScan(scan) {
  const map = new Map();
  if (!scan?.issues) return map;
  for (const issue of scan.issues) {
    map.set(issue.id, issue);
  }
  return map;
}

function classifyTrend(current, previous, trendRecord) {
  if (!previous && !trendRecord) {
    return { status: 'new', recurrenceFactor: 1 };
  }

  if (!current && previous) {
    return { status: 'resolved', recurrenceFactor: 1 };
  }

  if (current && previous) {
    const prevScore = previous.priorityScore || 0;
    const curScore = current.priorityScore || 0;
    const occurrences = trendRecord?.occurrences || 1;

    if (curScore > prevScore + 20) {
      return {
        status: 'worsening',
        recurrenceFactor: occurrences >= 2 ? 3 : 2,
      };
    }
    if (curScore < prevScore - 20) {
      return { status: 'improving', recurrenceFactor: occurrences >= 2 ? 2 : 1 };
    }
    return {
      status: 'repeated',
      recurrenceFactor: occurrences >= 3 || (current.priority === 'Critical' && occurrences >= 2) ? 3 : 2,
    };
  }

  if (current && trendRecord && trendRecord.occurrences > 1) {
    return {
      status: 'repeated',
      recurrenceFactor: trendRecord.occurrences >= 3 ? 3 : 2,
    };
  }

  return { status: 'new', recurrenceFactor: 1 };
}

export async function analyzeTrends({ scoredIssues, trends, cutoffDate }) {
  const yesterday = dateOffset(1);
  const previousScan =
    cutoffDate === formatDate()
      ? await loadScanByDate(yesterday)
      : await loadScanByDate(
          (await listScanDates()).filter((d) => d < cutoffDate).sort().reverse()[0] || ''
        );

  const prevMap = issueMapFromScan(previousScan);
  const currentMap = new Map(scoredIssues.map((i) => [i.id, i]));

  const dailyComparison = {
    previousDate: previousScan?.cutoffDate || previousScan?.scanDate || null,
    newIssues: [],
    repeatedIssues: [],
    resolvedIssues: [],
    worseningIssues: [],
    improvingIssues: [],
  };

  const enrichedIssues = scoredIssues.map((issue) => {
    const previous = prevMap.get(issue.id);
    const trendRecord = trends?.issues?.[issue.id];
    const { status, recurrenceFactor } = classifyTrend(issue, previous, trendRecord);

    const enriched = {
      ...issue,
      trendStatus: status,
      recurrenceFactor,
      previousPriorityScore: previous?.priorityScore || null,
    };

    if (status === 'new') dailyComparison.newIssues.push(enriched.id);
    else if (status === 'repeated') dailyComparison.repeatedIssues.push(enriched.id);
    else if (status === 'worsening') dailyComparison.worseningIssues.push(enriched.id);
    else if (status === 'improving') dailyComparison.improvingIssues.push(enriched.id);

    return enriched;
  });

  for (const [id, prev] of prevMap) {
    if (!currentMap.has(id)) {
      dailyComparison.resolvedIssues.push(id);
    }
  }

  const weeklyTrend = await buildWeeklyTrend(cutoffDate);

  return {
    issues: enrichedIssues,
    dailyComparison,
    weeklyTrend,
  };
}

async function buildWeeklyTrend(cutoffDate) {
  const dates = await listScanDates();
  const end = new Date(cutoffDate);
  const thisWeekStart = new Date(end);
  thisWeekStart.setDate(thisWeekStart.getDate() - 6);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekStart.getDate() - 6);

  const fmt = (d) => d.toISOString().slice(0, 10);
  const thisWeekDates = dates.filter(
    (d) => d >= fmt(thisWeekStart) && d <= cutoffDate
  );
  const lastWeekDates = dates.filter(
    (d) => d >= fmt(lastWeekStart) && d <= fmt(lastWeekEnd)
  );

  const summary = {
    thisWeek: { dates: thisWeekDates, scanCount: thisWeekDates.length },
    lastWeek: { dates: lastWeekDates, scanCount: lastWeekDates.length },
    hasEnoughData: thisWeekDates.length >= 2 && lastWeekDates.length >= 1,
    narrative: '',
  };

  if (!summary.hasEnoughData) {
    summary.narrative =
      'Insufficient weekly history for comparison. Run daily scans to unlock weekly trends.';
    return summary;
  }

  const thisWeekScans = await Promise.all(
    thisWeekDates.map((d) => loadScanByDate(d))
  );
  const lastWeekScans = await Promise.all(
    lastWeekDates.map((d) => loadScanByDate(d))
  );

  const avgScore = (scans, field) => {
    const vals = scans.filter(Boolean).map((s) => s.scores?.[field]).filter((v) => v != null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  summary.thisWeek.avgHealth = avgScore(thisWeekScans, 'websiteHealth');
  summary.thisWeek.avgSeo = avgScore(thisWeekScans, 'seo');
  summary.thisWeek.avgAi = avgScore(thisWeekScans, 'aiVisibility');
  summary.lastWeek.avgHealth = avgScore(lastWeekScans, 'websiteHealth');
  summary.lastWeek.avgSeo = avgScore(lastWeekScans, 'seo');
  summary.lastWeek.avgAi = avgScore(lastWeekScans, 'aiVisibility');

  const delta = (a, b) => (a != null && b != null ? a - b : null);
  summary.delta = {
    health: delta(summary.thisWeek.avgHealth, summary.lastWeek.avgHealth),
    seo: delta(summary.thisWeek.avgSeo, summary.lastWeek.avgSeo),
    ai: delta(summary.thisWeek.avgAi, summary.lastWeek.avgAi),
  };

  const parts = [];
  if (summary.delta.health != null) {
    parts.push(
      `Website health ${summary.delta.health >= 0 ? 'improved' : 'declined'} by ${Math.abs(summary.delta.health)} pts week-over-week.`
    );
  }
  if (summary.delta.seo != null) {
    parts.push(
      `SEO score ${summary.delta.seo >= 0 ? 'up' : 'down'} ${Math.abs(summary.delta.seo)} pts.`
    );
  }
  summary.narrative = parts.join(' ') || 'Weekly comparison available.';

  return summary;
}

export default { analyzeTrends };
