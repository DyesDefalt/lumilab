/**
 * Deterministic mock GA4 + GSC datasets for dashboard timeframes.
 * Seeded by date range so selections feel stable and comparable.
 */
(function (global) {
  const DAY = 86400000;

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return (h >>> 0) / 4294967296;
  }

  function seeded(seed, i) {
    return hash(`${seed}:${i}`);
  }

  function parseYmd(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  function formatYmd(d) {
    return d.toISOString().slice(0, 10);
  }

  function eachDay(from, to) {
    const days = [];
    const cur = new Date(from);
    while (cur <= to) {
      days.push(new Date(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return days;
  }

  function presetRange(preset, refDate = new Date()) {
    const end = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate()));
    const start = new Date(end);
    const map = { '7d': 6, '28d': 27, '90d': 89, yesterday: 0, today: 0 };
    if (preset === 'yesterday') {
      start.setUTCDate(start.getUTCDate() - 1);
      end.setUTCDate(end.getUTCDate() - 1);
    } else if (preset === 'today') {
      /* same day */
    } else {
      const offset = map[preset] ?? 27;
      start.setUTCDate(start.getUTCDate() - offset);
    }
    return { from: formatYmd(start), to: formatYmd(end), days: eachDay(start, end) };
  }

  const QUERIES = [
    { query: 'meta ad specs', page: '/', intent: 'commercial' },
    { query: 'tiktok safe zone dimensions', page: '/platform/tiktok', intent: 'informational' },
    { query: 'google ads creative sizes', page: '/platform/google', intent: 'commercial' },
    { query: 'utm generator tool', page: '/utm-generator', intent: 'transactional' },
    { query: 'adkivo advertising specs', page: '/', intent: 'navigational' },
    { query: 'shopee banner size', page: '/platform/shopee', intent: 'informational' },
    { query: 'lazada ads format', page: '/platform/lazada', intent: 'informational' },
    { query: 'dv360 creative guidelines', page: '/platform/dv360', intent: 'informational' },
    { query: 'ad creative best practices', page: '/blog', intent: 'informational' },
    { query: 'advertising command center', page: '/', intent: 'commercial' },
    { query: 'meta carousel specs 2026', page: '/platform/meta', intent: 'informational' },
    { query: 'how to track utm campaigns', page: '/utm-generator', intent: 'informational' },
  ];

  const CHANNELS = ['Organic Search', 'Direct', 'Referral', 'Organic Social', 'Unassigned'];
  const DEVICES = ['mobile', 'desktop', 'tablet'];
  const COUNTRIES = ['Indonesia', 'Singapore', 'Malaysia', 'United States', 'India'];

  function buildGa4(seed, days) {
    const daily = days.map((d, i) => {
      const r = seeded(seed, i);
      const sessions = Math.round(680 + r * 420 + Math.sin(i / 3) * 80);
      const engaged = Math.round(sessions * (0.52 + r * 0.18));
      const conversions = Math.round(sessions * (0.028 + r * 0.012));
      return {
        date: formatYmd(d),
        sessions,
        users: Math.round(sessions * 0.86),
        engagedSessions: engaged,
        engagementRate: +(engaged / sessions).toFixed(3),
        conversions,
        conversionRate: +(conversions / sessions).toFixed(4),
        avgSessionDuration: Math.round(95 + r * 140),
        bounceRate: +(0.38 + (1 - r) * 0.22).toFixed(3),
      };
    });

    const totals = daily.reduce(
      (a, d) => ({
        sessions: a.sessions + d.sessions,
        users: a.users + d.users,
        engagedSessions: a.engagedSessions + d.engagedSessions,
        conversions: a.conversions + d.conversions,
      }),
      { sessions: 0, users: 0, engagedSessions: 0, conversions: 0 }
    );

    totals.engagementRate = +(totals.engagedSessions / totals.sessions).toFixed(3);
    totals.conversionRate = +(totals.conversions / totals.sessions).toFixed(4);
    totals.avgSessionDuration = Math.round(
      daily.reduce((s, d) => s + d.avgSessionDuration, 0) / daily.length
    );
    totals.bounceRate = +(daily.reduce((s, d) => s + d.bounceRate, 0) / daily.length).toFixed(3);

    const channelBreakdown = CHANNELS.map((name, ci) => {
      const share = [0.42, 0.28, 0.12, 0.09, 0.09][ci] + seeded(seed, ci + 40) * 0.04;
      const sessions = Math.round(totals.sessions * share);
      return {
        channel: name,
        sessions,
        conversions: Math.round(sessions * (0.02 + seeded(seed, ci + 50) * 0.03)),
        share: +(share * 100).toFixed(1),
      };
    });

    const topPages = [
      { path: '/', title: 'Home — ad specs hub' },
      { path: '/utm-generator', title: 'UTM Generator' },
      { path: '/platform/meta', title: 'Meta Ads Specs' },
      { path: '/platform/google', title: 'Google Ads Specs' },
      { path: '/platform/tiktok', title: 'TikTok Ads Specs' },
      { path: '/blog', title: 'Blog & Insights' },
      { path: '/universal-specs', title: 'Universal Specs' },
    ].map((p, i) => {
      const r = seeded(seed, i + 60);
      const sessions = Math.round(totals.sessions * (0.22 - i * 0.022) * (0.85 + r * 0.3));
      const conversions = Math.round(sessions * (0.04 + r * 0.08));
      return { ...p, sessions, conversions, engagementRate: +(0.48 + r * 0.25).toFixed(2) };
    });

    const events = [
      { name: 'page_view', count: totals.sessions * 2.1 },
      { name: 'platform_view', count: Math.round(totals.sessions * 0.62) },
      { name: 'utm_generator_use', count: Math.round(totals.sessions * 0.11) },
      { name: 'outbound_click', count: Math.round(totals.sessions * 0.08) },
      { name: 'search_internal', count: Math.round(totals.sessions * 0.05) },
    ].map((e) => ({ ...e, count: Math.round(e.count) }));

    return {
      source: 'mock',
      connector: 'ga4',
      propertyId: 'G-ADKIVO-MOCK',
      timezone: 'Asia/Jakarta',
      totals,
      daily,
      channelBreakdown,
      topPages,
      events,
      deviceSplit: DEVICES.map((device, i) => ({
        device,
        sessions: Math.round(totals.sessions * [0.58, 0.36, 0.06][i]),
        share: [58, 36, 6][i],
      })),
    };
  }

  function buildGsc(seed, days) {
    const daily = days.map((d, i) => {
      const r = seeded(seed, i + 200);
      const impressions = Math.round(7200 + r * 4800 + Math.cos(i / 4) * 600);
      const clicks = Math.round(impressions * (0.012 + r * 0.018));
      return {
        date: formatYmd(d),
        impressions,
        clicks,
        ctr: +(clicks / impressions).toFixed(4),
        position: +(14.2 + (1 - r) * 8 + Math.sin(i / 5) * 2).toFixed(1),
      };
    });

    const totals = daily.reduce(
      (a, d) => ({
        impressions: a.impressions + d.impressions,
        clicks: a.clicks + d.clicks,
      }),
      { impressions: 0, clicks: 0 }
    );
    totals.ctr = +(totals.clicks / totals.impressions).toFixed(4);
    totals.position = +(daily.reduce((s, d) => s + d.position, 0) / daily.length).toFixed(1);

    const queries = QUERIES.map((q, i) => {
      const r = seeded(seed, i + 300);
      const impressions = Math.round(totals.impressions * (0.14 - i * 0.008) * (0.7 + r * 0.5));
      const clicks = Math.round(impressions * (0.008 + r * 0.025));
      const prevPos = q.position ?? 18 + i * 2;
      const position = +(prevPos - r * 4 + seeded(seed, i + 350) * 3).toFixed(1);
      return {
        ...q,
        impressions,
        clicks,
        ctr: +(clicks / impressions).toFixed(4),
        position,
        positionDelta: +(prevPos - position).toFixed(1),
      };
    }).sort((a, b) => b.clicks - a.clicks);

    const pages = [
      '/',
      '/platform/meta',
      '/platform/google',
      '/platform/tiktok',
      '/utm-generator',
      '/blog',
      '/platform/shopee',
    ].map((page, i) => {
      const r = seeded(seed, i + 400);
      const impressions = Math.round(totals.impressions * (0.18 - i * 0.02) * (0.8 + r * 0.4));
      const clicks = Math.round(impressions * (0.01 + r * 0.02));
      return { page, impressions, clicks, ctr: +(clicks / impressions).toFixed(4), position: +(12 + i * 2.1 - r * 3).toFixed(1) };
    });

    return {
      source: 'mock',
      connector: 'gsc',
      siteUrl: 'https://www.adkivo.my.id/',
      totals,
      daily,
      queries,
      pages,
      devices: DEVICES.map((device, i) => ({
        device,
        clicks: Math.round(totals.clicks * [0.52, 0.41, 0.07][i]),
        impressions: Math.round(totals.impressions * [0.51, 0.42, 0.07][i]),
      })),
      countries: COUNTRIES.map((country, i) => ({
        country,
        clicks: Math.round(totals.clicks * [0.62, 0.12, 0.1, 0.09, 0.07][i]),
      })),
    };
  }

  function buildCombined(ga4, gsc) {
    const pageMap = new Map();
    for (const p of ga4.topPages) {
      pageMap.set(p.path, { path: p.path, title: p.title, ga4Sessions: p.sessions, ga4Conversions: p.conversions });
    }
    for (const p of gsc.pages) {
      const row = pageMap.get(p.page) || { path: p.page, title: p.page };
      row.gscClicks = p.clicks;
      row.gscImpressions = p.impressions;
      row.gscCtr = p.ctr;
      row.gscPosition = p.position;
      pageMap.set(p.page, row);
    }

    const landingPerformance = [...pageMap.values()]
      .map((row) => {
        const sessions = row.ga4Sessions || 0;
        const clicks = row.gscClicks || 0;
        const efficiency = sessions > 0 ? clicks / sessions : 0;
        let signal = 'balanced';
        if (clicks > 40 && sessions < 200) signal = 'search-demand';
        if (sessions > 400 && clicks < 30) signal = 'conversion-gap';
        if (clicks > 50 && sessions > 300) signal = 'star';
        return { ...row, efficiency: +efficiency.toFixed(3), signal };
      })
      .sort((a, b) => (b.gscClicks || 0) + (b.ga4Sessions || 0) - ((a.gscClicks || 0) + (a.ga4Sessions || 0)));

    const queryPageJoin = gsc.queries.slice(0, 8).map((q) => {
      const ga4Page = ga4.topPages.find((p) => p.path === q.page);
      return {
        query: q.query,
        page: q.page,
        gscClicks: q.clicks,
        gscPosition: q.position,
        ga4Sessions: ga4Page?.sessions ?? 0,
        ga4Conversions: ga4Page?.conversions ?? 0,
        intent: q.intent,
      };
    });

    const insights = [];
    const organic = ga4.channelBreakdown.find((c) => c.channel === 'Organic Search');
    if (organic && organic.sessions < ga4.totals.sessions * 0.35) {
      insights.push({
        type: 'opportunity',
        title: 'Organic share below benchmark',
        detail: `Organic Search is ${organic.share}% of sessions. GSC shows ${gsc.totals.clicks} clicks — content clusters around platform specs could lift organic share.`,
      });
    }
    const topQuery = gsc.queries[0];
    if (topQuery?.position > 10) {
      insights.push({
        type: 'seo',
        title: `Ranking opportunity: “${topQuery.query}”`,
        detail: `Avg position ${topQuery.position}. Adding FAQ blocks on ${topQuery.page} may improve CTR and answer-readiness.`,
      });
    }
    const utm = landingPerformance.find((r) => r.path === '/utm-generator');
    if (utm?.ga4Conversions > 15 && utm.gscClicks < 20) {
      insights.push({
        type: 'content',
        title: 'UTM tool converts but under-discovered in search',
        detail: 'High GA4 conversions with low GSC clicks — publish supporting blog content and internal links.',
      });
    }

    return {
      landingPerformance,
      queryPageJoin,
      insights,
      summary: {
        sessions: ga4.totals.sessions,
        conversions: ga4.totals.conversions,
        searchClicks: gsc.totals.clicks,
        searchImpressions: gsc.totals.impressions,
        blendedCtr: gsc.totals.ctr,
        avgPosition: gsc.totals.position,
      },
    };
  }

  function getAnalytics({ from, to, preset }) {
    let range;
    if (from && to) {
      const start = parseYmd(from);
      const end = parseYmd(to);
      range = { from, to, days: eachDay(start, end) };
    } else {
      range = presetRange(preset || '28d');
    }
    if (!range.days.length) range.days = [parseYmd(range.to)];

    const seed = `${range.from}_${range.to}`;
    const ga4 = buildGa4(seed, range.days);
    const gsc = buildGsc(seed, range.days);
    const combined = buildCombined(ga4, gsc);

    const prevEnd = new Date(parseYmd(range.from));
    prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
    const span = range.days.length;
    const prevStart = new Date(prevEnd);
    prevStart.setUTCDate(prevStart.getUTCDate() - span + 1);
    const prevRange = { from: formatYmd(prevStart), to: formatYmd(prevEnd), days: eachDay(prevStart, prevEnd) };
    const prevSeed = `${prevRange.from}_${prevRange.to}`;
    const prevGa4 = buildGa4(prevSeed, prevRange.days);
    const prevGsc = buildGsc(prevSeed, prevRange.days);

    function delta(cur, prev, key) {
      const a = cur[key];
      const b = prev[key];
      if (!b) return { value: a, change: 0, direction: 'flat' };
      const change = +(((a - b) / b) * 100).toFixed(1);
      return { value: a, change, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' };
    }

    return {
      range: { from: range.from, to: range.to, days: range.days.length, preset: preset || null },
      previousRange: { from: prevRange.from, to: prevRange.to },
      ga4,
      gsc,
      combined,
      deltas: {
        sessions: delta(ga4.totals, prevGa4.totals, 'sessions'),
        conversions: delta(ga4.totals, prevGa4.totals, 'conversions'),
        searchClicks: delta(gsc.totals, prevGsc.totals, 'clicks'),
        impressions: delta(gsc.totals, prevGsc.totals, 'impressions'),
        avgPosition: delta(
          { position: gsc.totals.position },
          { position: prevGsc.totals.position },
          'position'
        ),
      },
      disclosure:
        'GA4 and Search Console metrics are mock Maton connector data for MVP. Website crawl and source audit remain live read-only.',
    };
  }

  global.LumiMockAnalytics = { getAnalytics, presetRange, formatYmd, parseYmd };
})(typeof window !== 'undefined' ? window : globalThis);
