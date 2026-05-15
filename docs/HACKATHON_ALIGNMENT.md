# LumiLab — OpenClaw Agenthon Alignment

## Core idea
LumiLab is an autonomous website visibility agent. The dashboard is only the surface; the agent performs the work.

## Required agent evidence
- **Tool call capability:** website crawler, source-code audit, Maton GA4/GSC, 9Router search/fetch, local memory, PDF generator.
- **Autonomous loop:** `Scan → Analyze → Remember → Prioritize → Report → Dashboard`.
- **Reasoning:** severity, business value, traffic opportunity, recurrence, AI/GEO readiness, competitor lens.
- **Decision-making:** ranks issues into Critical/High/Medium/Low and produces next actions.
- **Workflow execution:** `npm run openclaw:daily` runs the full task without manual intervention.

## Why it is not a chatbot
The AI dashboard assistant is grounded in generated artifacts and connector data. It answers from `latest_report.json`, source audit, memory trends, GA4/GSC outputs, and current report PDFs. It does not act as a generic chat wrapper.

## Judging rubric mapping
| Rubric | Evidence |
| --- | --- |
| Creativity & Originality 30% | Website visibility observability agent, not another SEO checker. Includes AI/GEO readiness. |
| Autonomy & Agent Behaviour 30% | Cron/OpenClaw loop runs scan, analysis, memory comparison, prioritization, and report generation. |
| Technical Execution 20% | Node crawler, adapters, Maton, 9Router, source audit, ReportLab PDF, dashboard API. |
| Use Case Clarity 10% | Helps non-technical founders and technical teams know what to fix first. |
| Deployability 10% | `npm run scan`, `npm run dashboard`, `.env.example`, reproducible outputs. |

## Demo line
“The user only provides a website. LumiLab independently scans it, pulls search and analytics signals, checks source-code implementation, remembers previous scans, prioritizes issues, generates human and technical reports, and powers a dashboard assistant.”
