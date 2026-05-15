export function classify(score) {
  if (score >= 141) return 'Critical';
  if (score >= 81) return 'High';
  if (score >= 41) return 'Medium';
  return 'Low';
}

export function scoreIssue({ severity = 1, businessValue = 1, trafficOpportunity = 1, recurrenceFactor = 1 }) {
  const score = severity * businessValue * trafficOpportunity * recurrenceFactor;
  return { score, priority: classify(score) };
}
