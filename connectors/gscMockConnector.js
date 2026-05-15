import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getGSCData() {
  const path = join(__dirname, '..', 'mock-data', 'gsc_daily.json');
  const raw = await readFile(path, 'utf-8');
  const data = JSON.parse(raw);
  return {
    source: 'mock',
    connector: 'google_search_console',
    status: 'mock_active',
    label: data._meta?.label || 'MOCK GSC DATA',
    data,
  };
}

export default { getGSCData };
