async function loadReport() {
  const res = await fetch('/api/report');
  if (!res.ok) {
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    return null;
  }
  return res.json();
}

function renderConnectors(status) {
  const el = document.getElementById('connectors');
  if (!status) return;
  const items = [
    ['Website Crawler', status.websiteCrawler],
    ['GA4', status.ga4],
    ['Search Console', status.searchConsole],
    ['Business', status.business],
    ['Memory', status.memory],
  ];
  el.innerHTML = items
    .map(([name, c]) => {
      const isMock = c?.source === 'mock' || c?.status?.includes('mock');
      const cls = isMock ? 'mock' : 'live';
      return `<span class="connector-pill ${cls}">${name}: ${c?.status || 'unknown'} (${c?.source || '—'})</span>`;
    })
    .join('');
}

function renderTrendCards(report) {
  const dc = report.dailyComparison || {};
  const cards = [
    { label: 'New issues', value: dc.newIssues?.length || 0 },
    { label: 'Repeated', value: dc.repeatedIssues?.length || 0 },
    { label: 'Resolved', value: dc.resolvedIssues?.length || 0 },
    { label: 'Worsening', value: dc.worseningIssues?.length || 0 },
  ];
  document.getElementById('trend-cards').innerHTML = cards
    .map(
      (c) =>
        `<div class="trend-card"><strong>${c.value}</strong><span>${c.label}</span></div>`
    )
    .join('');
}

function renderComparison(report) {
  const dc = report.dailyComparison || {};
  const wt = report.weeklyTrend || {};
  document.getElementById('comparison').innerHTML = `
    <p><strong>Daily</strong> vs ${dc.previousDate || 'no prior scan'}</p>
    <ul style="margin:8px 0 16px;padding-left:20px;font-size:14px;">
      <li>New: ${dc.newIssues?.length || 0}</li>
      <li>Repeated: ${dc.repeatedIssues?.length || 0}</li>
      <li>Resolved: ${dc.resolvedIssues?.length || 0}</li>
      <li>Improving: ${dc.improvingIssues?.length || 0}</li>
    </ul>
    <p><strong>Weekly:</strong> ${wt.narrative || 'Run more daily scans for weekly trends.'}</p>
  `;
}

function renderIssues(issues) {
  const el = document.getElementById('top-issues');
  if (!issues?.length) {
    el.innerHTML = '<li>No issues detected.</li>';
    return;
  }
  el.innerHTML = issues
    .map(
      (i) => `
    <li>
      <span class="priority ${i.priority}">${i.priority}</span>
      <strong>${i.title}</strong> (score: ${i.priorityScore})
      <br><small style="color:#667085">${i.page || 'site-wide'} · ${i.recommendation || ''}</small>
    </li>`
    )
    .join('');
}

function addMessage(role, text) {
  const box = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = role === 'user' ? `You: ${text}` : text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

async function init() {
  const report = await loadReport();
  if (!report) return;

  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');

  document.getElementById('cutoff-date').textContent =
    `Cutoff: ${report.meta?.reportCutoffDate || '—'}`;

  const s = report.scores || {};
  document.getElementById('score-health').textContent = s.websiteHealth ?? '—';
  document.getElementById('score-seo').textContent = s.seo ?? '—';
  document.getElementById('score-ai').textContent = s.aiVisibility ?? '—';
  document.getElementById('score-overall').textContent = s.overall ?? '—';

  document.getElementById('executive-summary').textContent =
    report.executiveSummary || '';

  renderConnectors(report.connectorStatus);
  renderTrendCards(report);
  renderComparison(report);
  renderIssues(report.topPriorityIssues);

  document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const question = input.value.trim();
    if (!question) return;
    addMessage('user', question);
    input.value = '';
    input.disabled = true;

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      addMessage('bot', data.answer || data.error || 'No response');
    } catch (err) {
      addMessage('bot', `Error: ${err.message}`);
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
}

init();
