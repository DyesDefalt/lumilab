# Copy LumiLab Agent Capability to Another Server

## Option A — Clone full repo

```bash
git clone https://github.com/DyesDefalt/lumilab.git
cd lumilab
npm install
cp .env.example .env
npm run scan
python3 scripts/generateBilingualReports.py
npm run dashboard
```

## Option B — Copy only OpenClaw skill

Copy this folder into the target OpenClaw workspace:

```text
skills/lumilab-visibility-agent/
```

Then open a new OpenClaw session and ask:

```text
Use lumilab-visibility-agent to configure daily website visibility reports for https://example.com.
```

## Option C — Copy agent capability files

Copy these files into an existing Node project:

```text
agent/capabilityManifest.js
agent/analyzer.js
agent/scoring.js
agent/sourceAudit.js
agent/reportGenerator.js
agent/humanReport.js
agent/memoryClient.js
connectors/websiteCrawler.js
connectors/mockConnectors.js
scripts/runScan.js
scripts/openclawDailyRun.js
scripts/generateBilingualReports.py
dashboard/server.js
dashboard/public/index.html
```

Then adapt `.env.example` and run:

```bash
npm install
npm run scan
python3 scripts/generateBilingualReports.py
npm run dashboard
```
