import fs from 'node:fs/promises';

async function readJson(path) { return JSON.parse(await fs.readFile(path, 'utf8')); }

export async function loadConnectorData() {
  return {
    mode: 'mock',
    disclosure: 'GA4, Search Console, and business signals are mock connector data for MVP. Website crawl is live read-only.',
    ga4: await readJson('mock-data/ga4_yesterday.json'),
    gsc: await readJson('mock-data/gsc_yesterday.json'),
    business: await readJson('mock-data/business_signals.json')
  };
}
