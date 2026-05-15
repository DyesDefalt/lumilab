import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEMORY_ROOT = join(__dirname, '..', 'memory');
const SCANS_DIR = join(MEMORY_ROOT, 'scans');
const TRENDS_FILE = join(MEMORY_ROOT, 'trends.json');

function formatDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

async function ensureDirs() {
  await mkdir(SCANS_DIR, { recursive: true });
}

export async function loadTrends() {
  if (!existsSync(TRENDS_FILE)) {
    return { issues: {}, lastUpdated: null };
  }
  const raw = await readFile(TRENDS_FILE, 'utf-8');
  return JSON.parse(raw);
}

export async function saveTrends(trends) {
  await ensureDirs();
  trends.lastUpdated = new Date().toISOString();
  await writeFile(TRENDS_FILE, JSON.stringify(trends, null, 2), 'utf-8');
}

export async function loadScanByDate(dateStr) {
  const path = join(SCANS_DIR, `${dateStr}.json`);
  if (!existsSync(path)) return null;
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw);
}

export async function saveScanSnapshot(dateStr, snapshot) {
  await ensureDirs();
  const path = join(SCANS_DIR, `${dateStr}.json`);
  await writeFile(path, JSON.stringify(snapshot, null, 2), 'utf-8');
}

export async function listScanDates() {
  await ensureDirs();
  const files = await readdir(SCANS_DIR);
  return files
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();
}

export async function getPreviousScan(beforeDate = formatDate()) {
  const dates = await listScanDates();
  const prior = dates.filter((d) => d < beforeDate).sort().reverse();
  if (prior.length === 0) return null;
  return loadScanByDate(prior[0]);
}

export async function getWeekScans(endDate = formatDate()) {
  const dates = await listScanDates();
  const end = new Date(endDate);
  const weekStart = new Date(end);
  weekStart.setDate(weekStart.getDate() - 6);
  const startStr = formatDate(weekStart);
  return dates
    .filter((d) => d >= startStr && d <= endDate)
    .map((d) => ({ date: d }));
}

export function updateTrendsFromIssues(trends, issues, cutoffDate) {
  const updated = { ...trends, issues: { ...trends.issues } };
  const activeIds = new Set(issues.map((i) => i.id));

  for (const issue of issues) {
    const prev = updated.issues[issue.id];
    if (!prev) {
      updated.issues[issue.id] = {
        firstSeen: cutoffDate,
        lastSeen: cutoffDate,
        occurrences: 1,
        status: 'active',
        category: issue.category,
        title: issue.title,
        highestPriority: issue.priorityScore || 0,
      };
    } else {
      updated.issues[issue.id] = {
        ...prev,
        lastSeen: cutoffDate,
        occurrences: (prev.occurrences || 0) + 1,
        status: 'active',
        highestPriority: Math.max(prev.highestPriority || 0, issue.priorityScore || 0),
      };
    }
  }

  for (const [id, record] of Object.entries(updated.issues)) {
    if (record.status === 'active' && !activeIds.has(id) && record.lastSeen < cutoffDate) {
      updated.issues[id] = { ...record, status: 'resolved', resolvedOn: cutoffDate };
    }
  }

  return updated;
}

export { formatDate, dateOffset, MEMORY_ROOT };

export default {
  loadTrends,
  saveTrends,
  loadScanByDate,
  saveScanSnapshot,
  listScanDates,
  getPreviousScan,
  getWeekScans,
  updateTrendsFromIssues,
  formatDate,
  dateOffset,
};
