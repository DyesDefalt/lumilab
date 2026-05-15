import * as cheerio from 'cheerio';

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString().replace(/\/$/, '/')
  } catch {
    return null;
  }
}

function sameHost(url, host) {
  try { return new URL(url).host === host; } catch { return false; }
}

export async function crawlWebsite(targetUrl, limit = 10) {
  const start = new URL(targetUrl).toString();
  const host = new URL(start).host;
  const queue = [start];
  const seen = new Set();
  const pages = [];

  while (queue.length && pages.length < limit) {
    const url = queue.shift();
    const clean = normalizeUrl(url);
    if (!clean || seen.has(clean) || !sameHost(clean, host)) continue;
    seen.add(clean);

    const started = Date.now();
    let statusCode = 0, html = '', error = null;
    try {
      const res = await fetch(clean, { headers: { 'user-agent': 'LumiLab-Agent/0.1 read-only visibility monitor' } });
      statusCode = res.status;
      html = await res.text();
    } catch (e) {
      error = e.message;
    }
    const responseTimeMs = Date.now() - started;

    if (html) {
      const $ = cheerio.load(html);
      const title = ($('title').first().text() || '').trim();
      const metaDescription = ($('meta[name="description"]').attr('content') || '').trim();
      const canonical = ($('link[rel="canonical"]').attr('href') || '').trim();
      const h1 = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);
      const h2 = $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 20);
      const images = $('img').map((_, el) => ({ src: $(el).attr('src') || '', alt: $(el).attr('alt') || '' })).get();
      const imagesMissingAlt = images.filter(i => !i.alt.trim()).length;
      const links = $('a[href]').map((_, el) => new URL($(el).attr('href'), clean).toString()).get().filter(l => sameHost(l, host));
      const schemaJsonLd = $('script[type="application/ld+json"]').map((_, el) => $(el).contents().text().trim()).get().filter(Boolean);
      const text = $('body').text().replace(/\s+/g, ' ').trim();
      const wordCount = text ? text.split(/\s+/).length : 0;
      const hasFaqSignals = /faq|frequently asked|pertanyaan|tanya jawab/i.test(text);
      const trustSignals = /privacy|terms|security|contact|about|testimonial|case study|client/i.test(text);

      pages.push({ url: clean, statusCode, responseTimeMs, title, metaDescription, canonical, h1, h2, imagesTotal: images.length, imagesMissingAlt, internalLinks: [...new Set(links)].slice(0, 50), schemaCount: schemaJsonLd.length, hasFaqSignals, trustSignals, wordCount, error });
      for (const link of links) if (!seen.has(normalizeUrl(link)) && queue.length < limit * 4) queue.push(link);
    } else {
      pages.push({ url: clean, statusCode, responseTimeMs, error });
    }
  }

  return { targetUrl: start, crawledAt: new Date().toISOString(), pages };
}
