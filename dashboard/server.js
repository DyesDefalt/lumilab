import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import OpenAI from 'openai';
import { capabilityManifest } from '../agent/capabilityManifest.js';

const app = express();
const port = Number(process.env.PORT || 3001);
app.use(express.json({ limit: '2mb' }));
app.use(express.static('dashboard/public'));
app.use('/output', express.static('output'));
app.use('/docs', express.static('docs'));

async function readJson(path, fallback = null) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return fallback; }
}
async function readText(path, fallback = '') {
  try { return await fs.readFile(path, 'utf8'); } catch { return fallback; }
}
function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: process.cwd(), shell: false });
    let out = '', err = '';
    p.stdout.on('data', d => out += d.toString());
    p.stderr.on('data', d => err += d.toString());
    p.on('exit', code => code === 0 ? resolve({ code, out, err }) : reject(new Error(err || out || `${cmd} exited ${code}`)));
  });
}

app.get('/api/latest-report', async (_, res) => {
  const report = await readJson('output/latest_report.json');
  if (!report) return res.status(404).json({ error: 'No report yet. Run npm run scan first.' });
  res.json(report);
});

app.get('/api/agent/capabilities', (_, res) => res.json(capabilityManifest));

app.get('/api/agent/status', async (_, res) => {
  const report = await readJson('output/latest_report.json', {});
  const files = await Promise.all(['output/latest_report.json','output/latest_report.html','output/adkivo_seo_ai_visibility_report_clean.pdf','output/tech_handoff.md'].map(async path => {
    try { const s = await fs.stat(path); return { path, exists: true, bytes: s.size, updatedAt: s.mtime.toISOString() }; }
    catch { return { path, exists: false }; }
  }));
  res.json({ ok: true, targetUrl: report.targetUrl, cutoffDate: report.cutoffDate, scores: report.scores, issueCounts: report.issueCounts, files, capabilities: capabilityManifest.skills.map(s => s.name) });
});

app.post('/api/agent/run-scan', async (_, res) => {
  try {
    const result = await runCommand('npm', ['run', 'openclaw:daily']);
    res.json({ ok: true, output: result.out.slice(-4000), errorOutput: result.err.slice(-2000) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/agent/tech-handoff', async (_, res) => {
  const text = await readText('output/tech_handoff.md');
  res.type('text/markdown').send(text || '# No tech handoff yet');
});

app.post('/api/assistant', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(400).json({ error: 'OPENAI_API_KEY not configured. Add BYOK key on backend .env.' });
    const report = await readText('output/latest_report.json', '{}');
    const tech = await readText('output/tech_handoff.md', '');
    const caps = JSON.stringify(capabilityManifest, null, 2);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
    const r = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are LumiLab Visibility Agent inside the dashboard. You are not a generic chatbot. Answer from the latest report, memory, tech handoff, and capability manifest. Be useful for non-technical and technical users. If asked to modify a website, explain that MVP is read-only and provide an approval-gated task instead.' },
        { role: 'user', content: `Capabilities:\n${caps}\n\nLatest report JSON:\n${report}\n\nTech handoff:\n${tech}\n\nQuestion: ${req.body?.question || ''}` }
      ]
    });
    res.json({ answer: r.choices[0]?.message?.content || '' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, () => console.log(`LumiLab dashboard: http://localhost:${port}`));
