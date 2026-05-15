/* global LumiMockAnalytics, Chart */
const $ = (id) => document.getElementById(id);
const state = {
  preset: '28d',
  from: null,
  to: null,
  analytics: null,
  report: null,
  status: null,
  caps: null,
  charts: {},
  activePanel: 'overview',
};

async function api(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json();
}

function fmt(n, style = 'decimal') {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en', { maximumFractionDigits: style === 'pct' ? 2 : 0 }).format(n);
}

function fmtPct(n) {
  if (n == null) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

function deltaHtml(d, invert = false) {
  if (!d) return '';
  const good = invert ? d.direction === 'down' : d.direction === 'up';
  const bad = invert ? d.direction === 'up' : d.direction === 'down';
  const cls = d.direction === 'flat' ? 'flat' : good ? 'up' : bad ? 'down' : 'flat';
  const extra = invert && d.direction === 'down' ? ' good' : '';
  const arrow = d.direction === 'up' ? '↑' : d.direction === 'down' ? '↓' : '→';
  return `<div class="kpi-delta ${cls}${extra}">${arrow} ${Math.abs(d.change)}% vs prior period</div>`;
}

function destroyChart(key) {
  if (state.charts[key]) {
    state.charts[key].destroy();
    delete state.charts[key];
  }
}

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#8d96ab', font: { family: 'DM Sans', size: 11 } } },
    },
    scales: {
      x: {
        ticks: { color: '#8d96ab', maxRotation: 0, font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: { color: '#8d96ab', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
    },
  };
}

function renderDualTrend(canvasId, ga4Daily, gscDaily) {
  destroyChart(canvasId);
  const el = $(canvasId);
  if (!el) return;
  const labels = ga4Daily.map((d) => d.date.slice(5));
  state.charts[canvasId] = new Chart(el, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'GA4 Sessions',
          data: ga4Daily.map((d) => d.sessions),
          borderColor: '#f5b942',
          backgroundColor: 'rgba(245,185,66,0.08)',
          fill: true,
          tension: 0.35,
          yAxisID: 'y',
        },
        {
          label: 'GSC Clicks',
          data: gscDaily.map((d) => d.clicks),
          borderColor: '#2dd4bf',
          backgroundColor: 'rgba(45,212,191,0.08)',
          fill: true,
          tension: 0.35,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      ...chartDefaults(),
      interaction: { mode: 'index', intersect: false },
      scales: {
        ...chartDefaults().scales,
        y: { ...chartDefaults().scales.y, position: 'left' },
        y1: {
          position: 'right',
          ticks: { color: '#8d96ab' },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function renderBarChart(canvasId, labels, values, color) {
  destroyChart(canvasId);
  const el = $(canvasId);
  if (!el) return;
  state.charts[canvasId] = new Chart(el, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: color, borderRadius: 6 }],
    },
    options: {
      ...chartDefaults(),
      plugins: { ...chartDefaults().plugins, legend: { display: false } },
    },
  });
}

function renderDoughnut(canvasId, labels, values, colors) {
  destroyChart(canvasId);
  const el = $(canvasId);
  if (!el) return;
  state.charts[canvasId] = new Chart(el, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8d96ab', font: { size: 11 } } },
      },
    },
  });
}

function scoreRing(score, color) {
  const v = Math.min(100, Math.max(0, Number(score) || 0));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  return `<div class="score-ring" aria-label="Score ${v}">
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
      <circle cx="44" cy="44" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
    </svg>
    <span class="value">${v}</span>
  </div>`;
}

function setPanel(id) {
  state.activePanel = id;
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${id}`));
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.panel === id));
  requestAnimationFrame(() => {
    Object.values(state.charts).forEach((c) => {
      try {
        c.resize();
      } catch {
        /* chart may be destroyed */
      }
    });
  });
}

function getRangeParams() {
  if (state.preset === 'custom' && state.from && state.to) {
    return `from=${state.from}&to=${state.to}`;
  }
  return `preset=${state.preset}`;
}

async function loadAnalytics() {
  const data = await api(`/api/analytics?${getRangeParams()}`);
  state.analytics = data;
  return data;
}

function renderOverview() {
  const a = state.analytics;
  const r = state.report || {};
  const scores = r.scores || {};
  const d = a.deltas;

  const rangeText = `${a.range.from} → ${a.range.to} (${a.range.days} days)`;
  $('range-label').textContent = rangeText;
  const sub = document.querySelector('.topbar-title p');
  const target = state.report?.targetUrl || state.status?.targetUrl;
  if (sub) sub.textContent = target ? `${target} · ${rangeText}` : rangeText;
  $('disclosure-text').textContent = a.disclosure;

  $('kpi-strip').innerHTML = `
    <div class="card"><div class="kpi-label">Sessions <span class="badge ga4">GA4</span></div>
      <div class="kpi">${fmt(a.ga4.totals.sessions)}</div>${deltaHtml(d.sessions)}</div>
    <div class="card"><div class="kpi-label">Conversions <span class="badge ga4">GA4</span></div>
      <div class="kpi">${fmt(a.ga4.totals.conversions)}</div>${deltaHtml(d.conversions)}</div>
    <div class="card"><div class="kpi-label">Search clicks <span class="badge gsc">GSC</span></div>
      <div class="kpi">${fmt(a.gsc.totals.clicks)}</div>${deltaHtml(d.searchClicks)}</div>
    <div class="card"><div class="kpi-label">Avg position <span class="badge gsc">GSC</span></div>
      <div class="kpi">${a.gsc.totals.position}</div>${deltaHtml(d.avgPosition, true)}</div>`;

  $('score-rings').innerHTML = `
    ${scoreRing(scores.overall ?? 0, '#e8c547')}
    <div><div class="kpi-label">Overall health</div></div>
    ${scoreRing(scores.seo ?? 0, '#2dd4bf')}
    <div><div class="kpi-label">SEO health</div></div>
    ${scoreRing(scores.aiVisibility ?? 0, '#60a5fa')}
    <div><div class="kpi-label">AI visibility</div></div>
    ${scoreRing(scores.technical ?? 0, '#4ade80')}
    <div><div class="kpi-label">Technical</div></div>`;

  const insights = a.combined.insights || [];
  $('combined-insights').innerHTML = insights.length
    ? `<ul class="insight-list">${insights
        .map(
          (i) =>
            `<li class="${i.type}"><strong>${i.title}</strong><span class="muted">${i.detail}</span></li>`
        )
        .join('')}</ul>`
  : '<p class="muted">No cross-source insights for this period.</p>';

  renderDualTrend('chart-overview-trend', a.ga4.daily, a.gsc.daily);

  const join = a.combined.queryPageJoin || [];
  $('query-join-table').innerHTML = join
    .map(
      (row) => `<tr>
      <td>${row.query}</td>
      <td class="mono">${row.page}</td>
      <td class="mono">${fmt(row.gscClicks)}</td>
      <td class="mono">${row.gscPosition}</td>
      <td class="mono">${fmt(row.ga4Sessions)}</td>
      <td class="mono">${fmt(row.ga4Conversions)}</td>
      <td><span class="pill">${row.intent}</span></td>
    </tr>`
    )
    .join('');
}

function renderGa4() {
  const g = state.analytics.ga4;
  $('ga4-kpis').innerHTML = `
    <div class="card"><div class="kpi-label">Engagement rate</div><div class="kpi">${fmtPct(g.totals.engagementRate)}</div></div>
    <div class="card"><div class="kpi-label">Conversion rate</div><div class="kpi">${fmtPct(g.totals.conversionRate)}</div></div>
    <div class="card"><div class="kpi-label">Avg session</div><div class="kpi">${fmt(g.totals.avgSessionDuration)}s</div></div>
    <div class="card"><div class="kpi-label">Bounce rate</div><div class="kpi">${fmtPct(g.totals.bounceRate)}</div></div>`;

  renderBarChart(
    'chart-ga4-sessions',
    g.daily.map((d) => d.date.slice(5)),
    g.daily.map((d) => d.sessions),
    'rgba(245,185,66,0.75)'
  );

  renderDoughnut(
    'chart-ga4-channels',
    g.channelBreakdown.map((c) => c.channel),
    g.channelBreakdown.map((c) => c.sessions),
    ['#f5b942', '#e8c547', '#94a3b8', '#60a5fa', '#64748b']
  );

  $('ga4-pages-table').innerHTML = g.topPages
    .map(
      (p) => `<tr>
      <td>${p.title}</td>
      <td class="mono">${p.path}</td>
      <td class="mono">${fmt(p.sessions)}</td>
      <td class="mono">${fmt(p.conversions)}</td>
      <td class="mono">${fmtPct(p.engagementRate)}</td>
    </tr>`
    )
    .join('');

  $('ga4-events-table').innerHTML = g.events
    .map((e) => `<tr><td>${e.name}</td><td class="mono">${fmt(e.count)}</td></tr>`)
    .join('');

  renderDoughnut(
    'chart-ga4-devices',
    g.deviceSplit.map((d) => d.device),
    g.deviceSplit.map((d) => d.sessions),
    ['#f5b942', '#fcd34d', '#78716c']
  );
}

function renderGsc() {
  const g = state.analytics.gsc;
  $('gsc-kpis').innerHTML = `
    <div class="card"><div class="kpi-label">Impressions</div><div class="kpi">${fmt(g.totals.impressions)}</div></div>
    <div class="card"><div class="kpi-label">CTR</div><div class="kpi">${fmtPct(g.totals.ctr)}</div></div>
    <div class="card"><div class="kpi-label">Avg position</div><div class="kpi">${g.totals.position}</div></div>`;

  destroyChart('chart-gsc-trend');
  const el = $('chart-gsc-trend');
  if (el) {
    state.charts['chart-gsc-trend'] = new Chart(el, {
      type: 'line',
      data: {
        labels: g.daily.map((d) => d.date.slice(5)),
        datasets: [
          {
            label: 'Clicks',
            data: g.daily.map((d) => d.clicks),
            borderColor: '#2dd4bf',
            tension: 0.35,
            yAxisID: 'y',
          },
          {
            label: 'Impressions',
            data: g.daily.map((d) => d.impressions),
            borderColor: 'rgba(45,212,191,0.35)',
            tension: 0.35,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        ...chartDefaults(),
        scales: {
          ...chartDefaults().scales,
          y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#8d96ab' } },
        },
      },
    });
  }

  $('gsc-queries-table').innerHTML = g.queries
    .map(
      (q) => `<tr>
      <td>${q.query}</td>
      <td class="mono">${q.page}</td>
      <td class="mono">${fmt(q.impressions)}</td>
      <td class="mono">${fmt(q.clicks)}</td>
      <td class="mono">${fmtPct(q.ctr)}</td>
      <td class="mono">${q.position}</td>
      <td class="mono ${q.positionDelta > 0 ? 'up' : ''}">${q.positionDelta > 0 ? '+' : ''}${q.positionDelta}</td>
    </tr>`
    )
    .join('');

  $('gsc-pages-table').innerHTML = g.pages
    .map(
      (p) => `<tr>
      <td class="mono">${p.page}</td>
      <td class="mono">${fmt(p.impressions)}</td>
      <td class="mono">${fmt(p.clicks)}</td>
      <td class="mono">${fmtPct(p.ctr)}</td>
      <td class="mono">${p.position}</td>
    </tr>`
    )
    .join('');

  renderDoughnut(
    'chart-gsc-devices',
    g.devices.map((d) => d.device),
    g.devices.map((d) => d.clicks),
    ['#2dd4bf', '#5eead4', '#99f6e4']
  );

  const countriesEl = $('gsc-countries-table');
  if (countriesEl) {
    countriesEl.innerHTML = (g.countries || [])
      .map((c) => `<tr><td>${c.country}</td><td class="mono">${fmt(c.clicks)}</td></tr>`)
      .join('');
  }
}

function renderCombined() {
  const c = state.analytics.combined;
  $('combined-summary').innerHTML = `
    <div class="card"><div class="kpi-label">Blended sessions</div><div class="kpi">${fmt(c.summary.sessions)}</div></div>
    <div class="card"><div class="kpi-label">Organic clicks</div><div class="kpi">${fmt(c.summary.searchClicks)}</div></div>
    <div class="card"><div class="kpi-label">Search CTR</div><div class="kpi">${fmtPct(c.summary.blendedCtr)}</div></div>
    <div class="card"><div class="kpi-label">Conversions</div><div class="kpi">${fmt(c.summary.conversions)}</div></div>`;

  $('landing-matrix').innerHTML = c.landingPerformance
    .map(
      (row) => `<tr>
      <td class="mono">${row.path}</td>
      <td class="mono">${fmt(row.ga4Sessions)}</td>
      <td class="mono">${fmt(row.ga4Conversions)}</td>
      <td class="mono">${fmt(row.gscClicks)}</td>
      <td class="mono">${row.gscPosition ?? '—'}</td>
      <td><span class="signal-pill ${row.signal}">${row.signal.replace('-', ' ')}</span></td>
    </tr>`
    )
    .join('');
}

function renderIssues() {
  const r = state.report || {};
  const issues = r.topIssues || r.issues || [];
  $('issues-list').innerHTML = issues.length
    ? issues
        .slice(0, 12)
        .map(
          (i) => `<article class="issue-item">
        <span class="priority ${i.priority || 'Low'}">${i.priority || i.severity || 'Issue'}</span>
        <h4 style="margin:8px 0 4px">${i.title || i.issue}</h4>
        <p class="muted">${i.recommendation || ''}</p>
        <p class="mono muted" style="font-size:11px;margin-top:8px">${i.page || ''}</p>
        <div class="pill-row">
          <span class="pill">Score ${i.score ?? '—'}</span>
          <span class="pill">${i.type || 'general'}</span>
        </div>
      </article>`
        )
        .join('')
    : '<p class="muted">No issues in report. Run a scan first.</p>';

  const plan = r.developerActionPlan || [];
  $('dev-plan-table').innerHTML = plan
    .map(
      (t) => `<tr>
      <td class="mono">#${t.rank}</td>
      <td><span class="priority ${t.priority}">${t.priority}</span></td>
      <td class="mono">${t.page}</td>
      <td>${t.task}</td>
    </tr>`
    )
    .join('');

  const counts = r.issueCounts || {};
  $('issue-counts').innerHTML = Object.entries(counts)
    .map(([k, v]) => `<div class="memory-stat"><div class="num">${v}</div><div class="muted">${k}</div></div>`)
    .join('');
}

function renderCrawl() {
  const pages = state.report?.crawledPages || [];
  $('crawl-meta').textContent = pages.length
    ? `${pages.length} pages crawled · ${state.report?.targetUrl || ''}`
    : 'No crawl data';

  $('crawl-table-body').innerHTML = pages
    .map(
      (p) => `<tr>
      <td class="url mono" title="${p.url}">${p.url.replace(/^https?:\/\/[^/]+/, '')}</td>
      <td class="mono">${p.statusCode}</td>
      <td class="mono">${p.responseTimeMs}ms</td>
      <td>${(p.h1 || []).join(', ') || '—'}</td>
      <td class="mono">${p.wordCount}</td>
      <td>${p.hasFaqSignals ? '✓' : '—'}</td>
      <td class="mono">${p.schemaCount}</td>
    </tr>`
    )
    .join('');
}

function renderAgent() {
  const st = state.status || {};
  const caps = state.caps || { skills: [], guardrails: [] };
  const r = state.report || {};

  $('agent-target').textContent = st.targetUrl || r.targetUrl || '—';
  $('agent-updated').textContent =
    st.files?.find((f) => f.path.includes('latest_report.json'))?.updatedAt?.slice(0, 19) || '—';

  $('connector-status').innerHTML = Object.entries(r.connectorStatus || {})
    .map(([name, mode]) => {
      const live = mode.includes('live');
      return `<div class="connector-card">
        <div class="name">${name}</div>
        <span class="badge ${live ? 'live' : 'mock'}">${mode}</span>
      </div>`;
    })
    .join('');

  $('artifact-pills').innerHTML = (st.files || [])
    .map((f) => `<span class="pill ${f.exists ? 'ok' : 'bad'}">${f.exists ? '✓' : '×'} ${f.path.replace('output/', '')}</span>`)
    .join('');

  $('skills-list').innerHTML = caps.skills
    .map((s) => `<div class="pill" style="display:block;margin-bottom:8px"><strong>${s.name}</strong><br><span class="muted">${s.use}</span></div>`)
    .join('');

  $('guardrails').innerHTML = (caps.guardrails || []).map((g) => `<span class="pill">${g}</span>`).join(' ');

  const mem = r.dailyComparison || {};
  const trend = r.weeklyTrend || {};
  $('memory-stats').innerHTML = `
    <div class="memory-stat"><div class="num">${mem.new ?? 0}</div><div class="muted">New issues</div></div>
    <div class="memory-stat"><div class="num">${mem.repeated ?? 0}</div><div class="muted">Repeated</div></div>
    <div class="memory-stat"><div class="num">${mem.resolved ?? 0}</div><div class="muted">Resolved</div></div>
    <div class="memory-stat"><div class="num">${trend.overallScoreDelta ?? '—'}</div><div class="muted">Score Δ (${trend.direction || '—'})</div></div>`;

  $('executive-summary').innerHTML = (r.executiveSummary || 'No summary yet.').replace(/\n/g, '<br>');
}

function renderAll() {
  if (!state.analytics) return;
  renderOverview();
  renderGa4();
  renderGsc();
  renderCombined();
  renderIssues();
  renderCrawl();
  renderAgent();
}

async function loadAll() {
  try {
    const [report, status, caps] = await Promise.all([
      api('/api/latest-report'),
      api('/api/agent/status'),
      api('/api/agent/capabilities'),
    ]);
    state.report = report;
    state.status = status;
    state.caps = caps;
    await loadAnalytics();
    renderAll();
  } catch (e) {
    $('disclosure-text').textContent = e.message;
    $('kpi-strip').innerHTML = `<div class="card" style="grid-column:1/-1;color:var(--bad)">${e.message}. Run <code>npm run scan</code> first.</div>`;
  }
}

function applyPreset(preset) {
  state.preset = preset;
  document.querySelectorAll('.preset-btn').forEach((b) => b.classList.toggle('active', b.dataset.preset === preset));
  const custom = $('custom-dates');
  if (custom) custom.style.display = preset === 'custom' ? 'flex' : 'none';
  if (preset !== 'custom') loadAll();
}

async function askAgent() {
  const pre = $('agent-answer');
  pre.textContent = 'Thinking…';
  try {
    const r = await api('/api/assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: $('agent-question').value }),
    });
    pre.textContent = r.answer || 'No answer.';
  } catch (e) {
    pre.textContent = e.message;
  }
}

async function runScan() {
  $('agent-status-msg').textContent = 'Running autonomous scan…';
  try {
    await api('/api/agent/run-scan', { method: 'POST' });
    $('agent-status-msg').textContent = 'Scan complete.';
    await loadAll();
  } catch (e) {
    $('agent-status-msg').textContent = e.message;
  }
}

function init() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 27);
  $('date-from').value = start.toISOString().slice(0, 10);
  $('date-to').value = end.toISOString().slice(0, 10);

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => setPanel(btn.dataset.panel));
  });

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });

  $('btn-apply-dates').addEventListener('click', () => {
    state.preset = 'custom';
    state.from = $('date-from').value;
    state.to = $('date-to').value;
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
    loadAll();
  });

  $('btn-refresh').addEventListener('click', loadAll);
  $('btn-scan').addEventListener('click', runScan);
  $('btn-ask').addEventListener('click', askAgent);

  applyPreset('28d');
}

document.addEventListener('DOMContentLoaded', init);
