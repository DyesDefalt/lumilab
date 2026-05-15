import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getGA4Data() {
  const path = join(__dirname, '..', 'mock-data', 'ga4_daily.json');
  const raw = await readFile(path, 'utf-8');
  const data = JSON.parse(raw);
  return {
    source: 'mock',
    connector: 'ga4',
    status: 'mock_active',
    label: data._meta?.label || 'MOCK GA4 DATA',
    data,
  };
}

export default { getGA4Data };
