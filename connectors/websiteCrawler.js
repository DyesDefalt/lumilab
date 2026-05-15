import * as cheerio from 'cheerio';

const DEFAULT_UA = 'LumiLabBot/0.1 (+https://lumilab.id)';

function normalizeUrl(url, base) {
  try {
    const u = new URL(url, base);
    u.hash = '';
    if (u.pathname !== '/' && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return null;
  }
}

function isSameOrigin(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function countWords(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function extractJsonLd($) {
  const schemas = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const parsed = JSON.parse(raw.trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const type = item['@type'];
        schemas.push({
          type: Array.isArray(type) ? type.join(',') : type || 'Unknown',
          raw: item,
        });
      }
    } catch {
      schemas.push({ type: 'InvalidJSON', raw: null });
    }
  });
  return schemas;
}

function detectFaqSignals($, schemas) {
  const signals = {
    hasFaqHeading: false,
    hasFaqSchema: false,
    qaBlockCount: 0,
    details: [],
  };

  $('h2, h3, h4').each((_, el) => {
    const t = $(el).text().toLowerCase();
    if (/faq|frequently asked|pertanyaan/.test(t)) {
      signals.hasFaqHeading = true;
      signals.details.push(`FAQ heading: ${$(el).text().trim().slice(0, 80)}`);
    }
  });

  for (const s of schemas) {
    const t = String(s.type || '');
    if (/FAQPage|Question/i.test(t)) {
      signals.hasFaqSchema = true;
    }
  }

  $('details, .faq-item, [itemtype*="Question"]').each(() => {
    signals.qaBlockCount += 1;
  });

  return signals;
}

function extractPageData(html, url, statusCode, responseTimeMs) {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null;
  const canonical =
    $('link[rel="canonical"]').attr('href')?.trim() || null;

  const h1 = $('h1')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const h2 = $('h2')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  const images = $('img');
  const imageCount = images.length;
  let imagesWithAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt && alt.trim()) imagesWithAlt += 1;
  });

  const internalLinks = [];
  const origin = new URL(url).origin;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const abs = normalizeUrl(href, url);
    if (abs && isSameOrigin(abs, origin)) {
      internalLinks.push(abs);
    }
  });

  const schemas = extractJsonLd($);
  const faqSignals = detectFaqSignals($, schemas);
  const bodyText = $('body').text();
  const wordCount = countWords(bodyText);

  return {
    url,
    statusCode,
    responseTimeMs,
    title,
    metaDescription,
    canonical,
    h1,
    h2,
    internalLinks: [...new Set(internalLinks)],
    images: {
      total: imageCount,
      withAlt: imagesWithAlt,
      altCoveragePercent: imageCount ? Math.round((imagesWithAlt / imageCount) * 100) : 100,
    },
    schemas,
    schemaTypes: schemas.map((s) => s.type).filter(Boolean),
    faqSignals,
    wordCount,
    contentHash: Buffer.from(bodyText.slice(0, 500)).toString('base64').slice(0, 32),
  };
}

async function fetchPage(url, timeoutMs, userAgent) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    const responseTimeMs = Math.round(performance.now() - start);
    const html = res.ok ? await res.text() : '';
    return {
      ok: res.ok,
      statusCode: res.status,
      html,
      responseTimeMs,
    };
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - start);
    return {
      ok: false,
      statusCode: err.name === 'AbortError' ? 408 : 0,
      html: '',
      responseTimeMs,
      error: err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * BFS crawl of same-origin pages up to limit.
 */
export async function crawlWebsite(options = {}) {
  const targetUrl = options.targetUrl || process.env.TARGET_SITE_URL;
  const limit = options.limit ?? parseInt(process.env.CRAWL_LIMIT || '8', 10);
  const timeoutMs = options.timeoutMs ?? parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10);
  const userAgent = options.userAgent || DEFAULT_UA;

  if (!targetUrl) {
    throw new Error('TARGET_SITE_URL is required');
  }

  const startUrl = normalizeUrl(targetUrl);
  const origin = new URL(startUrl).origin;
  const queue = [startUrl];
  const visited = new Set();
  const pages = [];
  const errors = [];

  while (queue.length > 0 && pages.length < limit) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    const result = await fetchPage(url, timeoutMs, userAgent);

    if (!result.ok && !result.html) {
      errors.push({ url, statusCode: result.statusCode, error: result.error });
      pages.push({
        url,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        error: result.error || 'Fetch failed',
        title: null,
        metaDescription: null,
        canonical: null,
        h1: [],
        h2: [],
        internalLinks: [],
        images: { total: 0, withAlt: 0, altCoveragePercent: 0 },
        schemas: [],
        schemaTypes: [],
        faqSignals: { hasFaqHeading: false, hasFaqSchema: false, qaBlockCount: 0, details: [] },
        wordCount: 0,
        contentHash: null,
      });
      continue;
    }

    const pageData = extractPageData(
      result.html || '<html></html>',
      url,
      result.statusCode,
      result.responseTimeMs
    );
    pages.push(pageData);

    for (const link of pageData.internalLinks) {
      const norm = normalizeUrl(link);
      if (norm && isSameOrigin(norm, origin) && !visited.has(norm) && !queue.includes(norm)) {
        queue.push(norm);
      }
    }
  }

  return {
    source: 'live_crawler',
    targetUrl: startUrl,
    crawledAt: new Date().toISOString(),
    pageCount: pages.length,
    pages,
    errors,
  };
}

export default { crawlWebsite };
