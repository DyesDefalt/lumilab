export function classifyPriority(score) {
  if (score >= 141) return 'Critical';
  if (score >= 81) return 'High';
  if (score >= 41) return 'Medium';
  return 'Low';
}

export function scoreIssue(issue) {
  const severity = issue.severity || 1;
  const businessPageValue = issue.businessPageValue || 1;
  const trafficOpportunity = issue.trafficOpportunity || 1;
  const recurrenceFactor = issue.recurrenceFactor || 1;

  const priorityScore =
    severity * businessPageValue * trafficOpportunity * recurrenceFactor;

  return {
    ...issue,
    priorityScore,
    priority: classifyPriority(priorityScore),
    factors: { severity, businessPageValue, trafficOpportunity, recurrenceFactor },
  };
}

export function scoreAllIssues(issues) {
  return issues
    .map(scoreIssue)
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function computeSiteScores(issues, crawlResult) {
  const pages = crawlResult?.pages || [];
  const pageCount = pages.length || 1;

  let techPenalty = 0;
  let seoPenalty = 0;
  let aiPenalty = 0;

  for (const issue of issues) {
    const weight = issue.severity || 1;
    if (issue.category === 'technical') techPenalty += weight * 3;
    if (issue.category === 'seo') seoPenalty += weight * 3;
    if (issue.category === 'ai_visibility') aiPenalty += weight * 3;
    if (issue.category === 'search_opportunity') seoPenalty += weight * 2;
    if (issue.category === 'business') aiPenalty += weight * 2;
  }

  const maxPenalty = pageCount * 15;
  const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

  const websiteHealth = clamp(100 - (techPenalty / maxPenalty) * 100);
  const seo = clamp(100 - (seoPenalty / maxPenalty) * 100);
  const aiVisibility = clamp(100 - (aiPenalty / maxPenalty) * 100);

  const avgResponse =
    pages.reduce((s, p) => s + (p.responseTimeMs || 0), 0) / pageCount;
  const healthAdjusted =
    avgResponse > 3000 ? Math.max(0, websiteHealth - 10) : websiteHealth;

  return {
    websiteHealth: healthAdjusted,
    seo,
    aiVisibility,
    overall: clamp((healthAdjusted + seo + aiVisibility) / 3),
  };
}

export default { classifyPriority, scoreIssue, scoreAllIssues, computeSiteScores };
