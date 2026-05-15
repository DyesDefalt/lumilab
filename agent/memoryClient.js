import fs from 'node:fs/promises';
import path from 'node:path';

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

export async function loadPreviousScan(cutoffDate) {
  const dir = 'memory/scans';
  await fs.mkdir(dir, { recursive: true });
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json') && f.slice(0,10) < cutoffDate).sort();
  if (!files.length) return null;
  return JSON.parse(await fs.readFile(path.join(dir, files.at(-1)), 'utf8'));
}

export async function loadRecentScans(cutoffDate, days = 14) {
  const dir = 'memory/scans';
  await fs.mkdir(dir, { recursive: true });
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json') && f.slice(0,10) <= cutoffDate).sort().slice(-days);
  return Promise.all(files.map(async f => JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'))));
}

export async function saveScanMemory(cutoffDate, report) {
  await fs.mkdir('memory/scans', { recursive: true });
  await fs.writeFile(`memory/scans/${cutoffDate}.json`, JSON.stringify(report, null, 2));
}

export function compareIssues(current, previous) {
  const key = i => `${i.page}|${i.type}|${i.title}`;
  const cur = new Map(current.map(i => [key(i), i]));
  const prev = new Map((previous?.issues || []).map(i => [key(i), i]));
  return {
    new: [...cur.keys()].filter(k => !prev.has(k)).length,
    repeated: [...cur.keys()].filter(k => prev.has(k)).length,
    resolved: [...prev.keys()].filter(k => !cur.has(k)).length
  };
}

export function weeklyTrend(scans) {
  if (scans.length < 2) return { status: 'insufficient_data', summary: 'Need at least two scans for trend comparison.' };
  const last = scans.at(-1);
  const first = scans[0];
  const delta = (last.scores?.overall || 0) - (first.scores?.overall || 0);
  return { status: 'available', overallScoreDelta: delta, direction: delta > 0 ? 'improving' : delta < 0 ? 'worsening' : 'flat', scansCompared: scans.length };
}
