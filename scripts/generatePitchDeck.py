#!/usr/bin/env python3
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_LEFT
from pathlib import Path

OUT=Path('docs/deck/OpenClaw2026_DyesDefalt_LumiLab.pdf')
OUT.parent.mkdir(parents=True, exist_ok=True)
styles=getSampleStyleSheet()
styles.add(ParagraphStyle('DeckTitle', fontName='Helvetica-Bold', fontSize=32, leading=37, textColor=colors.HexColor('#111827'), spaceAfter=10))
styles.add(ParagraphStyle('DeckSub', fontName='Helvetica', fontSize=14, leading=19, textColor=colors.HexColor('#475467'), spaceAfter=8))
styles.add(ParagraphStyle('DeckH', fontName='Helvetica-Bold', fontSize=17, leading=21, textColor=colors.HexColor('#111827'), spaceBefore=6, spaceAfter=6))
styles.add(ParagraphStyle('DeckB', fontName='Helvetica', fontSize=11, leading=15, textColor=colors.HexColor('#344054'), spaceAfter=4))
styles.add(ParagraphStyle('DeckSmall', fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#667085')))

def P(s, st='DeckB'): return Paragraph(s.replace('&','&amp;'), styles[st])
def bullets(items): return [P('• '+x) for x in items]

def box(title, items, color='#6D5EFC'):
    data=[[P(title,'DeckH')]]+[[x] for x in bullets(items)]
    t=Table(data, colWidths=[110*mm])
    t.setStyle(TableStyle([('BOX',(0,0),(-1,-1),0.6,colors.HexColor('#E5E7EB')),('LINEABOVE',(0,0),(0,0),4,colors.HexColor(color)),('BACKGROUND',(0,0),(-1,-1),colors.white),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    return t

def slide(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor('#F8FAFC'))
    canvas.rect(0,0,297*mm,210*mm,stroke=0,fill=1)
    canvas.setFillColor(colors.HexColor('#111827'))
    canvas.rect(0,190*mm,297*mm,20*mm,stroke=0,fill=1)
    canvas.setFillColor(colors.white); canvas.setFont('Helvetica-Bold',9)
    canvas.drawString(18*mm,198*mm,'LumiLab — Autonomous Website Visibility Agent')
    canvas.setFillColor(colors.HexColor('#98A2B3')); canvas.setFont('Helvetica',8)
    canvas.drawRightString(279*mm,198*mm,f'OpenClaw Agenthon 2026 • Slide {doc.page}/5')
    canvas.restoreState()

slides=[]
slides += [P('1. Problem','DeckTitle'), P('Businesses can build websites, but most cannot continuously understand what blocks search, AI discovery, and conversion.','DeckSub'),
           box('Pain points',['GA4/GSC data is hard to translate into action','SEO checkers are one-shot and not agentic','AI-generated answers need clearer entities, schema, FAQ, and trust signals','Founders need executive summary; developers need exact tasks'],'#B42318')]
slides += [PageBreak:=__import__('reportlab.platypus').platypus.PageBreak()]
slides += [P('2. Solution','DeckTitle'), P('LumiLab turns any website into a monitored growth asset.','DeckSub'),
           box('What LumiLab does',['Crawls website read-only','Analyzes SEO, technical, speed fallback, AI/GEO readiness','Remembers previous scans','Scores and prioritizes issues','Generates bilingual Daily/Weekly PDFs and dashboard insight'],'#6D5EFC')]
slides += [PageBreak]
slides += [P('3. Agent Workflow / Architecture','DeckTitle'), P('Dashboard is the surface. OpenClaw/Clawdyes is the agent.','DeckSub'),
           box('Autonomous loop',['Scan website','Load GA4/GSC/business adapters','Read memory and source audit','Reason over severity, business value, opportunity, recurrence','Generate report + dashboard API','Optional approval-gated fix loop'],'#00A3FF')]
slides += [PageBreak]
slides += [P('4. Key Features & Tech Stack','DeckTitle'), P('Built for the Agenthon requirements: tool calls, autonomy, reasoning, workflow execution.','DeckSub'),
           Table([[box('Features',['1-100 visibility score','Daily & Weekly bilingual PDF reports','Dashboard assistant grounded in latest report','OpenClaw skill for reuse on another server','Agent prompt for audit/fix/report loop'],'#059669'), box('Stack',['OpenClaw','Node.js + Express','Cheerio crawler','ReportLab + pypdf','9Router research-ready','Maton GA4/GSC-ready','GitHub repo workflow'],'#7C3AED')]], colWidths=[125*mm,125*mm])]
slides += [PageBreak]
slides += [P('5. Impact & Roadmap','DeckTitle'), P('From report-only monitoring to autonomous approval-gated website improvement.','DeckSub'),
           box('Impact',['Non-technical users get clear reports','Developers get exact tasks and prompts','Agencies can automate SEO/GEO reporting','Future: live PageSpeed, live GA4/GSC, commerce connector, approval-based auto-fix PRs'],'#D97706'), Spacer(1,10), P('Demo command: npm run scan → python3 scripts/generateBilingualReports.py → npm run dashboard','DeckSmall')]

doc=SimpleDocTemplate(str(OUT), pagesize=landscape(A4), rightMargin=18*mm, leftMargin=18*mm, topMargin=28*mm, bottomMargin=14*mm)
doc.build(slides, onFirstPage=slide, onLaterPages=slide)
print(OUT)
