#!/usr/bin/env bash
set -euo pipefail
npm run scan
python3 scripts/generateCleanSeoReport.py || true
python3 scripts/generateDailyWeeklyReports.py || true
python3 scripts/generateBilingualReports.py
printf '\nGenerated reports:\n'
ls -lh output/*report*.pdf output/latest_report.* output/tech_handoff.md 2>/dev/null || true
