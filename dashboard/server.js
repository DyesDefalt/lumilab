import dotenv from 'dotenv';
import express from 'express';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const OUTPUT_ROOT = join(__dirname, '..', 'output');
const REPORT_JSON = join(OUTPUT_ROOT, 'latest_report.json');
const REPORT_PDF = join(OUTPUT_ROOT, 'latest_report.pdf');

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

async function loadReport() {
  if (!existsSync(REPORT_JSON)) return null;
  const raw = await readFile(REPORT_JSON, 'utf-8');
  return JSON.parse(raw);
}

app.get('/api/report', async (_req, res) => {
  try {
    const report = await loadReport();
    if (!report) {
      return res.status(404).json({
        error: 'No report found. Run npm run scan first.',
      });
    }
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/report.pdf', (_req, res) => {
  if (!existsSync(REPORT_PDF)) {
    return res.status(404).json({ error: 'PDF not found. Run npm run scan first.' });
  }
  res.download(REPORT_PDF, `lumilab-report-${Date.now()}.pdf`);
});

app.post('/api/assistant', async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return res.json({
      answer:
        'BYOK AI assistant is not configured. Set OPENAI_API_KEY in your .env file on the server.',
      configured: false,
    });
  }

  const report = await loadReport();
  if (!report) {
    return res.status(404).json({ error: 'No report available. Run npm run scan first.' });
  }

  const systemPrompt = `You are LumiLab's website visibility analyst.
Answer ONLY using the provided latest_report.json context.
Do not invent data. If information is not in the report, say so.
Be concise and actionable. Reference priority scores when relevant.
Never reveal API keys or internal env configuration.`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Report context:\n${JSON.stringify(report, null, 2)}\n\nQuestion: ${question}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `AI provider error: ${errText.slice(0, 200)}` });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'No response from model.';
    res.json({ answer, configured: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`LumiLab dashboard running at http://localhost:${PORT}`);
});
