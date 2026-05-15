function pagePath(url) {
  try {
    return new URL(url).pathname || '/';
  } catch {
    return url;
  }
}

function businessPageValue(path, highValuePages = []) {
  if (path === '/' || path === '') return 5;
  if (highValuePages.some((p) => path === p || path.startsWith(p))) return 5;
  if (/pricing|contact|signup|register|buy|checkout|demo/i.test(path)) return 5;
  if (/product|service|plan|feature/i.test(path)) return 4;
  if (/blog|article|news|docs|guide/i.test(path)) return 3;
  if (/about|team|career/i.test(path)) return 2;
  return 1;
}

function trafficOpportunityForPage(path, gscPages = [], ga4Pages = []) {
  const gsc = gscPages.find((p) => {
    try {
      return new URL(p.page).pathname === path;
    } catch {
      return p.page?.includes(path);
    }
  });
  const ga4 = ga4Pages.find((p) => p.path === path);

  const impressions = gsc?.impressions || 0;
  const ctr = gsc?.ctr || 0;
  const sessions = ga4?.sessions || 0;

  if (impressions > 5000 && ctr < 0.03) return 5;
  if (impressions > 2000 && ctr < 0.035) return 4;
  if (sessions > 200) return 4;
  if (impressions > 500) return 3;
  if (sessions > 50) return 2;
  return 1;
}

function makeIssue({
  id,
  category,
  type,
  page,
  title,
  description,
  severity,
  businessPageValue: bpv,
  trafficOpportunity,
  recommendation,
}) {
  return {
    id,
    category,
    type,
    page,
    title,
    description,
    severity,
    businessPageValue: bpv,
    trafficOpportunity,
    recommendation,
  };
}

export function analyzeWebsite({ crawlResult, performanceData }) {
  const issues = [];
  const pages = crawlResult?.pages || [];
  const gscPages = performanceData?.gsc?.data?.pages || [];
  const ga4Pages = performanceData?.ga4?.data?.pages || [];
  const highValuePages = performanceData?.business?.data?.highValuePages || [];
  const gscQueries = performanceData?.gsc?.data?.queries || [];
  const products = performanceData?.business?.data?.products?.products || [];

  for (const page of pages) {
    const path = pagePath(page.url);
    const bpv = businessPageValue(path, highValuePages);
    const traffic = trafficOpportunityForPage(path, gscPages, ga4Pages);

    if (page.statusCode >= 400 || page.statusCode === 0) {
      issues.push(
        makeIssue({
          id: `tech-status-${path}`,
          category: 'technical',
          type: 'http_error',
          page: page.url,
          title: `Page returns HTTP ${page.statusCode || 'error'}`,
          description: `URL ${page.url} failed to load properly.`,
          severity: 5,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation: 'Fix server errors, redirects, or DNS issues for this URL.',
        })
      );
    }

    if (page.responseTimeMs > 3000) {
      issues.push(
        makeIssue({
          id: `tech-slow-${path}`,
          category: 'technical',
          type: 'slow_response',
          page: page.url,
          title: 'Slow page response time',
          description: `Response time ${page.responseTimeMs}ms exceeds 3000ms threshold.`,
          severity: page.responseTimeMs > 5000 ? 4 : 3,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation: 'Optimize server response, caching, and asset delivery.',
        })
      );
    }

    if (!page.title || page.title.length < 10) {
      issues.push(
        makeIssue({
          id: `seo-title-${path}`,
          category: 'seo',
          type: 'missing_title',
          page: page.url,
          title: 'Missing or weak page title',
          description: page.title
            ? `Title "${page.title}" is too short (${page.title.length} chars).`
            : 'No title tag found.',
          severity: 4,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation: 'Add a descriptive 50–60 character title with primary keyword.',
        })
      );
    } else if (page.title.length > 60) {
      issues.push(
        makeIssue({
          id: `seo-title-long-${path}`,
          category: 'seo',
          type: 'title_too_long',
          page: page.url,
          title: 'Page title may be truncated in SERPs',
          description: `Title is ${page.title.length} characters.`,
          severity: 2,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation: 'Shorten title to under 60 characters.',
        })
      );
    }

    if (!page.metaDescription) {
      issues.push(
        makeIssue({
          id: `seo-meta-${path}`,
          category: 'seo',
          type: 'missing_meta_description',
          page: page.url,
          title: 'Missing meta description',
          description: 'No meta description tag found.',
          severity: 4,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation: 'Add a compelling 150–160 character meta description.',
        })
      );
    } else if (page.metaDescription.length < 70) {
      issues.push(
        makeIssue({
          id: `seo-meta-short-${path}`,
          category: 'seo',
          type: 'short_meta_description',
          page: page.url,
          title: 'Meta description too short',
          description: `Only ${page.metaDescription.length} characters.`,
          severity: 2,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation: 'Expand meta description to 120–160 characters.',
        })
      );
    }

    if (!page.h1 || page.h1.length === 0) {
      issues.push(
        makeIssue({
          id: `seo-h1-missing-${path}`,
          category: 'seo',
          type: 'missing_h1',
          page: page.url,
          title: 'Missing H1 heading',
          description: 'Page has no H1 element.',
          severity: 4,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation: 'Add one clear H1 that matches page intent and title.',
        })
      );
    } else if (page.h1.length > 1) {
      issues.push(
        makeIssue({
          id: `seo-h1-multiple-${path}`,
          category: 'seo',
          type: 'multiple_h1',
          page: page.url,
          title: 'Multiple H1 headings',
          description: `Found ${page.h1.length} H1 tags.`,
          severity: 3,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation: 'Use a single primary H1 per page.',
        })
      );
    }

    if (!page.canonical) {
      issues.push(
        makeIssue({
          id: `seo-canonical-${path}`,
          category: 'seo',
          type: 'missing_canonical',
          page: page.url,
          title: 'Missing canonical URL',
          description: 'No rel=canonical link found.',
          severity: 3,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation: 'Add canonical tag pointing to preferred URL version.',
        })
      );
    }

    if (page.images?.altCoveragePercent < 80 && page.images?.total > 0) {
      issues.push(
        makeIssue({
          id: `seo-alt-${path}`,
          category: 'seo',
          type: 'low_alt_coverage',
          page: page.url,
          title: 'Low image alt text coverage',
          description: `Only ${page.images.altCoveragePercent}% of images have alt text (${page.images.withAlt}/${page.images.total}).`,
          severity: page.images.altCoveragePercent < 50 ? 3 : 2,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation: 'Add descriptive alt attributes to all meaningful images.',
        })
      );
    }

    if (page.wordCount < 150 && path !== '/') {
      issues.push(
        makeIssue({
          id: `seo-thin-${path}`,
          category: 'seo',
          type: 'thin_content',
          page: page.url,
          title: 'Thin content detected',
          description: `Only ${page.wordCount} words on page.`,
          severity: 3,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation: 'Expand content with useful, intent-matching copy.',
        })
      );
    }

    const hasOrgOrWeb = (page.schemaTypes || []).some((t) =>
      /Organization|WebSite|WebPage|SoftwareApplication|Product|Service/i.test(t)
    );
    if (!hasOrgOrWeb && bpv >= 4) {
      issues.push(
        makeIssue({
          id: `ai-schema-${path}`,
          category: 'ai_visibility',
          type: 'missing_structured_data',
          page: page.url,
          title: 'Missing key structured data',
          description: 'No Organization, WebSite, Product, or Service schema detected.',
          severity: 4,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation:
            'Add JSON-LD for Organization/WebSite and page-specific Product or Service schema.',
        })
      );
    }

    if (
      bpv >= 4 &&
      !page.faqSignals?.hasFaqSchema &&
      !page.faqSignals?.hasFaqHeading &&
      page.faqSignals?.qaBlockCount === 0
    ) {
      issues.push(
        makeIssue({
          id: `ai-faq-${path}`,
          category: 'ai_visibility',
          type: 'missing_faq',
          page: page.url,
          title: 'No FAQ signals for AI answer readiness',
          description: 'High-value page lacks FAQ section or FAQPage schema.',
          severity: 3,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation:
            'Add FAQ section with FAQPage JSON-LD for common customer questions.',
        })
      );
    }

    if (bpv >= 4 && page.wordCount < 300) {
      issues.push(
        makeIssue({
          id: `ai-clarity-${path}`,
          category: 'ai_visibility',
          type: 'low_semantic_clarity',
          page: page.url,
          title: 'Low semantic clarity for AI systems',
          description: 'High-value page has limited explanatory content for entity understanding.',
          severity: 3,
          businessPageValue: bpv,
          trafficOpportunity: traffic,
          recommendation:
            'Add clear value proposition, entity definitions, and benefit-led copy.',
        })
      );
    }
  }

  const gscData = performanceData?.gsc?.data;
  const gscIndexing = gscData?.indexing;

  if (gscData?.totals?.clicks === 0) {
    issues.push(
      makeIssue({
        id: 'search-zero-clicks',
        category: 'search_opportunity',
        type: 'zero_organic_clicks',
        page: null,
        title: 'Zero organic search clicks',
        description: `GSC shows ${gscData.totals.impressions || 0} impressions but 0 clicks in the reporting period.`,
        severity: 5,
        businessPageValue: 5,
        trafficOpportunity: 5,
        recommendation:
          'Improve titles/meta, fix indexing issues, submit sitemap, and target branded queries like "adkivo".',
      })
    );
  }

  if (gscIndexing?.not_indexed_pages > 0) {
    issues.push(
      makeIssue({
        id: 'search-not-indexed',
        category: 'search_opportunity',
        type: 'pages_not_indexed',
        page: null,
        title: 'Pages not indexed in Google Search',
        description: `${gscIndexing.not_indexed_pages} page(s) not indexed vs ${gscIndexing.indexed_pages || 0} indexed.`,
        severity: gscIndexing.not_indexed_pages >= gscIndexing.indexed_pages ? 5 : 4,
        businessPageValue: 5,
        trafficOpportunity: 5,
        recommendation:
          'Use GSC URL Inspection, fix crawl blocks, add internal links, and ensure sitemap includes all key URLs.',
      })
    );
  }

  for (const q of gscQueries) {
    if (q.impressions >= 15 && q.clicks === 0 && q.position > 20) {
      issues.push(
        makeIssue({
          id: `search-zero-ctr-${q.query.replace(/\s+/g, '-').slice(0, 40)}`,
          category: 'search_opportunity',
          type: 'impressions_no_clicks',
          page: null,
          title: `Impressions but no clicks: "${q.query}"`,
          description: `${q.impressions} impressions, 0 clicks, avg position ${q.position}.`,
          severity: 3,
          businessPageValue: 4,
          trafficOpportunity: 4,
          recommendation: 'Improve SERP snippet and on-page relevance for this query.',
        })
      );
    }
    if (q.impressions > 1500 && q.ctr < 0.03 && q.position > 10) {
      issues.push(
        makeIssue({
          id: `search-opp-${q.query.replace(/\s+/g, '-').slice(0, 40)}`,
          category: 'search_opportunity',
          type: 'high_impressions_low_ctr',
          page: null,
          title: `Search opportunity: "${q.query}"`,
          description: `${q.impressions} impressions, ${(q.ctr * 100).toFixed(1)}% CTR, position ${q.position}.`,
          severity: 4,
          businessPageValue: 4,
          trafficOpportunity: 5,
          recommendation:
            'Improve title/meta for ranking pages, add dedicated landing content for this query.',
        })
      );
    }
  }

  for (const product of products) {
    if (!product.has_schema && product.revenue_weight >= 4) {
      issues.push(
        makeIssue({
          id: `biz-schema-${product.id}`,
          category: 'business',
          type: 'product_missing_schema',
          page: product.url,
          title: `High-value product missing schema: ${product.name}`,
          description: 'Revenue-weighted product/page lacks structured data.',
          severity: 4,
          businessPageValue: 5,
          trafficOpportunity: 4,
          recommendation: 'Add Product or Offer JSON-LD with price and availability.',
        })
      );
    }
  }

  const seen = new Set();
  return issues.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

export default { analyzeWebsite };
