import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';

function run(cmd, args) {
  const isWin = process.platform === 'win32';
  const executable = isWin && cmd === 'npm' ? 'npm.cmd' : cmd;
  return new Promise((resolve, reject) => {
    const p = spawn(executable, args, { stdio: 'inherit', shell: isWin });
    p.on('exit', code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`)));
  });
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

try {
  await run('npm', ['run', 'scan']);
  for (const f of ['output/latest_report.json','output/latest_report.md','output/latest_report.pdf']) {
    if (!(await exists(f))) throw new Error(`Missing required output: ${f}`);
  }
  const report = JSON.parse(await fs.readFile('output/latest_report.json', 'utf8'));
  console.log('\nLUMILAB_DAILY_SUMMARY');
  console.log(`Target: ${report.targetUrl}`);
  console.log(`Cutoff date: ${report.cutoffDate} (${report.timezone})`);
  console.log(`Overall: ${report.scores.overall}/100 | SEO: ${report.scores.seo}/100 | AI visibility: ${report.scores.aiVisibility}/100 | Technical: ${report.scores.technical}/100`);
  console.log(`Issues: Critical ${report.issueCounts.Critical}, High ${report.issueCounts.High}, Medium ${report.issueCounts.Medium}, Low ${report.issueCounts.Low}`);
  console.log(`Trend: ${report.weeklyTrend.direction || report.weeklyTrend.summary}`);
  console.log('Top issues:');
  for (const [idx, issue] of report.topIssues.entries()) console.log(`${idx + 1}. [${issue.priority}] ${issue.title} — ${issue.page}`);
  console.log('PDF: output/latest_report.pdf');
} catch (e) {
  await fs.mkdir('output', { recursive: true });
  await fs.writeFile('output/error_report.json', JSON.stringify({ ok: false, timestamp: new Date().toISOString(), error: e.message }, null, 2));
  console.error('LumiLab daily run failed:', e.message);
  process.exit(1);
}
