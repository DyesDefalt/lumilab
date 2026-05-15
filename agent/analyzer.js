import { scoreIssue } from './scoring.js';

function businessValueFor(page, business) {
  const path = new URL(page.url).pathname;
  return business.highValuePaths?.some(p => path === p || path.startsWith(p + '/')) ? 5 : 2;
}

function trafficOpportunityFor(page, gsc) {
  const path = new URL(page.url).pathname;
  const hit = gsc.queries?.find(q => q.page === path || q.page === path.replace(/\/$/, ''));
  if (!hit) return 2;
  if (hit.impressions > 1000 && hit.position > 10) return 5;
  if (hit.impressions > 500) return 4;
  return 3;
}

function addIssue(issues, page, connectorData, previous, issue) {
  const pageValue = businessValueFor(page, connectorData.business);
  const trafficOpportunity = trafficOpportunityFor(page, connectorData.gsc);
  const repeated = previous?.issues?.some(i => i.page === page.url && i.type === issue.type && i.title === issue.title);
  const recurrenceFactor = repeated ? (issue.severity >= 4 ? 3 : 2) : 1;
  const scored = scoreIssue({ severity: issue.severity, businessValue: pageValue, trafficOpportunity, recurrenceFactor });
  issues.push({ ...issue, page: page.url, businessValue: pageValue, trafficOpportunity, recurrenceFactor, ...scored });
}

export function analyze(crawl, connectorData, previous) {
  const issues = [];
  for (const page of crawl.pages) {
    if (page.statusCode >= 400 || page.error) addIssue(issues, page, connectorData, previous, { type: 'technical', title: 'Page fetch/status problem', severity: 5, recommendation: 'Fix availability, redirect, or server response for this page.' });
    if (!page.title || page.title.length < 20) addIssue(issues, page, connectorData, previous, { type: 'seo', title: 'Missing or weak title tag', severity: 4, recommendation: 'Add a specific title tag with product/category and intent keywords.' });
    if (!page.metaDescription || page.metaDescription.length < 70) addIssue(issues, page, connectorData, previous, { type: 'seo', title: 'Missing or weak meta description', severity: 4, recommendation: 'Write a benefit-led 120–155 character meta description.' });
    if (!page.h1?.length) addIssue(issues, page, connectorData, previous, { type: 'seo', title: 'Missing H1', severity: 4, recommendation: 'Add one clear H1 that states the page purpose.' });
    if ((page.h1?.length || 0) > 1) addIssue(issues, page, connectorData, previous, { type: 'seo', title: 'Multiple H1 tags', severity: 2, recommendation: 'Keep one primary H1 and demote secondary headings.' });
    if (page.imagesMissingAlt > 0) addIssue(issues, page, connectorData, previous, { type: 'accessibility-seo', title: 'Images missing alt text', severity: 2, recommendation: 'Add descriptive alt text to important images.' });
    if (!page.schemaCount) addIssue(issues, page, connectorData, previous, { type: 'ai-visibility', title: 'No structured data detected', severity: 4, recommendation: 'Add Organization, WebSite, Product/Service, FAQ, or Breadcrumb schema where relevant.' });
    if (!page.hasFaqSignals) addIssue(issues, page, connectorData, previous, { type: 'ai-visibility', title: 'Weak answer-readiness / FAQ coverage', severity: 3, recommendation: 'Add concise FAQ or Q&A sections answering buyer/search intent questions.' });
    if (!page.trustSignals) addIssue(issues, page, connectorData, previous, { type: 'trust', title: 'Weak trust signals', severity: 3, recommendation: 'Add visible contact, privacy, security, case study, testimonial, or company proof.' });
    if ((page.wordCount || 0) < 250) addIssue(issues, page, connectorData, previous, { type: 'content', title: 'Thin page content', severity: 3, recommendation: 'Expand content with problem, solution, use cases, proof, and next action.' });
  }
  issues.sort((a,b) => b.score - a.score);
  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const i of issues) counts[i.priority]++;
  const seoPenalty = issues.filter(i => i.type.includes('seo')).length * 5;
  const aiPenalty = issues.filter(i => i.type === 'ai-visibility').length * 7;
  const techPenalty = issues.filter(i => i.type === 'technical').length * 15;
  const scores = {
    seo: Math.max(0, 100 - seoPenalty),
    aiVisibility: Math.max(0, 100 - aiPenalty),
    technical: Math.max(0, 100 - techPenalty)
  };
  scores.overall = Math.round((scores.seo + scores.aiVisibility + scores.technical) / 3);
  return { issues, counts, scores };
}
