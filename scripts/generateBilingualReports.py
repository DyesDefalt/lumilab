#!/usr/bin/env python3
import json, pathlib, datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'output'
report = json.loads((OUT / 'latest_report.json').read_text())
speed = json.loads((ROOT/'research/pagespeed/adkivo_fallback_speed.json').read_text()) if (ROOT/'research/pagespeed/adkivo_fallback_speed.json').exists() else {}
now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle('TitleX', fontName='Helvetica-Bold', fontSize=22, leading=27, textColor=colors.HexColor('#111827'), spaceAfter=7))
styles.add(ParagraphStyle('H1X', fontName='Helvetica-Bold', fontSize=15, leading=19, textColor=colors.HexColor('#111827'), spaceBefore=8, spaceAfter=7))
styles.add(ParagraphStyle('H2X', fontName='Helvetica-Bold', fontSize=11.5, leading=14, textColor=colors.HexColor('#111827'), spaceBefore=5, spaceAfter=4))
styles.add(ParagraphStyle('BodyX', fontName='Helvetica', fontSize=8.8, leading=12.2, textColor=colors.HexColor('#374151'), spaceAfter=4))
styles.add(ParagraphStyle('SmallX', fontName='Helvetica', fontSize=7.4, leading=9.5, textColor=colors.HexColor('#6B7280')))
styles.add(ParagraphStyle('KPI', fontName='Helvetica-Bold', fontSize=20, leading=22, alignment=TA_CENTER, textColor=colors.HexColor('#111827')))
styles.add(ParagraphStyle('KPILabel', fontName='Helvetica', fontSize=7, leading=8.5, alignment=TA_CENTER, textColor=colors.HexColor('#6B7280')))
styles.add(ParagraphStyle('CodeX', fontName='Courier', fontSize=6.4, leading=8.3, textColor=colors.HexColor('#111827'), backColor=colors.HexColor('#F8FAFC')))

def esc(x): return str(x).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def P(text, style='BodyX'): return Paragraph(esc(text), styles[style])
def bullet(text): return P('• '+text)

def kpi(label, value, note, color):
    return Table([[P(label,'KPILabel')],[P(value,'KPI')],[P(note,'KPILabel')]], colWidths=[38*mm], rowHeights=[9*mm,13*mm,10*mm], style=TableStyle([
        ('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#E5E7EB')),('BACKGROUND',(0,0),(-1,-1),colors.white),('LINEABOVE',(0,0),(0,0),4,colors.HexColor(color)),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))

def table(data, widths):
    t=Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#E5E7EB')),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#F3F4F6')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),7.5),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
    return t

def footer(canvas, doc):
    canvas.saveState(); canvas.setFont('Helvetica',7); canvas.setFillColor(colors.HexColor('#9CA3AF'))
    canvas.drawString(18*mm, 10*mm, 'LumiLab / Clawdyes - bilingual website visibility report')
    canvas.drawRightString(192*mm, 10*mm, f'Page {doc.page}')
    canvas.restoreState()

scores=report.get('scores',{})
issues=report.get('topIssues') or report.get('priorityIssues') or report.get('issues',[])
counts=report.get('issueCounts',{})
target=report.get('targetUrl','https://www.adkivo.my.id/')

score_explain_id = 'Skor memakai skala 1-100. 1 berarti buruk/berisiko tinggi, 100 berarti sangat baik. Mirip cara membaca PageSpeed/Lighthouse, tetapi LumiLab menilai SEO dasar, teknikal crawl, AI/GEO answer-readiness, dan skor gabungan.'
score_explain_en = 'Scores use a 1-100 scale. 1 means poor/high-risk, 100 means excellent. It reads like PageSpeed/Lighthouse, but LumiLab scores SEO basics, technical crawlability, AI/GEO answer-readiness, and weighted overall health.'

prompt = '''You are OpenClaw AI Agent operating as LumiLab Website Fix Agent for Adkivo.
Mission: audit, fix, test, report, and repeat until website visibility improves.
Scope: read the LumiLab report, inspect the codebase, create a safe branch, fix only approved SEO/AI visibility tasks, run tests/build/lint, regenerate LumiLab report, then summarize changes.
Rules:
1. Never expose secrets.
2. Do not change business logic unless required by the task.
3. Prioritize: robots domain, metadataBase, unique page metadata, FAQ/answer blocks, Organization/SoftwareApplication/FAQ schema, internal links, trust/about signals.
4. After each fix: run npm test/build/lint if available, run LumiLab scan, compare score changes.
5. If a task requires content/business approval, create a TODO with exact suggested copy instead of inventing risky claims.
6. Stop and ask approval before pushing or deploying.
Loop: Audit -> Plan -> Fix -> Test -> Rescan -> Report -> Ask approval for next loop.'''

common_tasks = [
 ('P1','Fix robots.ts fallback domain','Change fallback from adkivo.com to https://www.adkivo.my.id.','Prevents wrong canonical/crawl hints if env config is missing.','Low risk / fast'),
 ('P1','Add metadataBase','Set metadataBase in root Next.js metadata to live domain.','Improves canonical/OpenGraph URL consistency.','Low risk / fast'),
 ('P1','Add homepage FAQ block','Add 4-6 concise Q&A items: what Adkivo is, who uses it, benefits, workflow, pricing/contact.','Raises AI/GEO score and makes page more snippet-ready.','Medium'),
 ('P1','Add schema depth','Add Organization, SoftwareApplication, WebSite/SearchAction, FAQPage where relevant.','Helps Google and AI systems understand entity and product.','Medium'),
 ('P2','Unique platform page copy','Give platform pages unique title, description, H1, and use-case copy.','Improves non-branded search and AI mentionability.','Medium'),
 ('P2','Content cluster','Create comparison/use-case pages around ad specs, UTM workflow, campaign QA.','Builds search demand coverage and authority.','Medium-high'),
]

def build(kind, path):
    story=[]
    period_id = 'Laporan Harian' if kind=='Daily' else 'Laporan Mingguan'
    period_en = 'Daily Report' if kind=='Daily' else 'Weekly Report'
    story += [P(f'Adkivo {period_id} / {period_en}','TitleX'), P(f'{target} • Generated {now.strftime("%d %b %Y %H:%M")} WIB','SmallX'), Spacer(1,8)]
    story.append(Table([[kpi('Overall',str(scores.get('overall','—')),'weighted health','#6D5EFC'),kpi('SEO',str(scores.get('seo','—')),'search basics','#059669'),kpi('AI/GEO',str(scores.get('aiVisibility','—')),'answer readiness','#D97706'),kpi('Technical',str(scores.get('technical','—')),'crawl foundation','#2563EB')]], colWidths=[42*mm]*4))
    story += [Spacer(1,8), P('1. Arti Skor / Score Meaning','H1X'), P(score_explain_id), P(score_explain_en)]
    story += [P('Interpretasi / Interpretation','H2X')]
    interp = [[P('Score','SmallX'),P('Meaning / Arti','SmallX')],[P('90-100','SmallX'),P('Excellent / sangat baik; maintain and monitor.','SmallX')],[P('70-89','SmallX'),P('Good but still has growth gaps / baik tapi belum selesai.','SmallX')],[P('40-69','SmallX'),P('Needs focused fixes / perlu perbaikan prioritas.','SmallX')],[P('1-39','SmallX'),P('High risk / buruk, butuh aksi cepat.','SmallX')]]
    story.append(table(interp,[28*mm,145*mm]))
    story += [Spacer(1,8), P('2. Ringkasan / Summary','H1X')]
    story.append(P('ID: Fondasi teknikal dan SEO Adkivo kuat. Masalah terbesar adalah AI/GEO visibility: halaman belum cukup mudah dikutip oleh AI answer engines karena FAQ, definisi entitas, dan schema perlu diperkuat.'))
    story.append(P('EN: Adkivo has a strong technical and SEO foundation. The biggest gap is AI/GEO visibility: pages are not yet easy enough for AI answer engines to cite because FAQ coverage, entity clarity, and schema depth need improvement.'))
    story += [P('3. Speed / Core Web Vitals Test','H1X')]
    if speed.get('pagespeed_api') == 'blocked_quota':
        story.append(P('ID: Google PageSpeed API tidak bisa dipakai saat ini karena quota server habis. Jadi laporan ini memakai fallback HTTP timing, bukan full Lighthouse/Core Web Vitals lab score.'))
        story.append(P('EN: Google PageSpeed API is currently blocked by server quota. This report uses fallback HTTP timing, not a full Lighthouse/Core Web Vitals lab score.'))
    speed_rows=[[P('Metric','SmallX'),P('Result','SmallX'),P('Meaning','SmallX')],[P('HTTP status','SmallX'),P(str(speed.get('status','—')),'SmallX'),P('200 means the homepage is reachable.','SmallX')],[P('Avg TTFB','SmallX'),P(str(speed.get('avg_ttfb_ms','—'))+' ms','SmallX'),P('Server response is fast from this test location.','SmallX')],[P('Avg total download','SmallX'),P(str(speed.get('avg_total_ms','—'))+' ms','SmallX'),P('HTML transfer is fast; still need Lighthouse for JS/CWV.','SmallX')],[P('HTML size','SmallX'),P(str(speed.get('download_bytes','—'))+' bytes','SmallX'),P('Reasonable; optimize media/JS separately in Lighthouse.','SmallX')]]
    story.append(table(speed_rows,[38*mm,42*mm,93*mm]))
    story += [Spacer(1,8), P('4. Priority List / Daftar Prioritas','H1X')]
    rows=[[P('Priority','SmallX'),P('Task','SmallX'),P('How to fix','SmallX'),P('Impact after completed','SmallX')]]
    for row in common_tasks:
        rows.append([P(row[0],'SmallX'),P(row[1],'SmallX'),P(row[2],'SmallX'),P(row[3],'SmallX')])
    story.append(table(rows,[18*mm,42*mm,58*mm,55*mm]))
    story += [Spacer(1,8), P('5. Current Issues / Masalah Saat Ini','H1X')]
    issue_rows=[[P('Priority','SmallX'),P('Issue','SmallX'),P('Page','SmallX'),P('Score','SmallX')]]
    for i in issues[:6]: issue_rows.append([P(i.get('priority','—'),'SmallX'),P(i.get('title') or i.get('issue','—'),'SmallX'),P(i.get('page','—'),'SmallX'),P(str(i.get('score','—')),'SmallX')])
    story.append(table(issue_rows,[21*mm,58*mm,76*mm,18*mm]))
    story += [PageBreak(), P('6. Task List / Checklist','H1X')]
    for p,t,fix,impact,effort in common_tasks:
        story.append(P(f'{p} — {t}','H2X'))
        story.append(P(f'ID Fix: {fix}'))
        story.append(P(f'EN Fix: {fix}'))
        story.append(P(f'Expected result / Dampak: {impact}'))
        story.append(P(f'Effort: {effort}','SmallX'))
    if kind == 'Weekly':
        story += [P('Weekly focus / Fokus mingguan','H1X'), bullet('ID: Ship 1 comparison/use-case page and 1 FAQ/schema improvement batch.'), bullet('EN: Ship 1 comparison/use-case page and 1 FAQ/schema improvement batch.'), bullet('Track GSC impressions, CTR, landing pages, and AI/GEO score next week.')]
    else:
        story += [P('Today focus / Fokus hari ini','H1X'), bullet('Fix robots domain + metadataBase first.'), bullet('Add homepage FAQ and schema after that.'), bullet('Regenerate LumiLab report and compare score movement.')]
    story += [P('7. OpenClaw AI Agent Prompt','H1X')]
    for chunk in prompt.split('\n'):
        story.append(P(chunk,'CodeX'))
    doc=SimpleDocTemplate(str(path),pagesize=A4,rightMargin=18*mm,leftMargin=18*mm,topMargin=18*mm,bottomMargin=16*mm)
    doc.build(story,onFirstPage=footer,onLaterPages=footer)

build('Daily', OUT/'adkivo_daily_bilingual_visibility_report.pdf')
build('Weekly', OUT/'adkivo_weekly_bilingual_visibility_report.pdf')
for f in ['adkivo_daily_bilingual_visibility_report.pdf','adkivo_weekly_bilingual_visibility_report.pdf']:
    p=OUT/f; r=PdfReader(str(p)); text='\n'.join(page.extract_text() or '' for page in r.pages)
    print(p, 'pages', len(r.pages), 'chars', len(text), 'has_prompt', 'OpenClaw AI Agent Prompt' in text, 'has_speed', 'TTFB' in text)
