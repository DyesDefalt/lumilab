import dotenv from 'dotenv';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const TZ = 'Asia/Jakarta';
const SCHEDULE = '0 9 * * *'; // Daily at 09:00

function runScan() {
  return new Promise((resolve, reject) => {
    const scriptPath = join(dirname(fileURLToPath(import.meta.url)), 'runScan.js');
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Scan exited ${code}`))));
  });
}

async function main() {
  const runOnce = process.argv.includes('--once');

  if (runOnce) {
    console.log('[LumiLab cron] Running scan once...');
    await runScan();
    return;
  }

  console.log(`[LumiLab cron] Scheduled daily scan at 09:00 ${TZ}`);
  console.log('[LumiLab cron] Press Ctrl+C to stop.');

  cron.schedule(
    SCHEDULE,
    async () => {
      console.log(`\n[LumiLab cron] Triggered at ${new Date().toISOString()}`);
      try {
        await runScan();
      } catch (err) {
        console.error('[LumiLab cron] Scan failed:', err.message);
      }
    },
    { timezone: TZ }
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
