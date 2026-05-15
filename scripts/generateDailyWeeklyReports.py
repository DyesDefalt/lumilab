#!/usr/bin/env python3
import json, pathlib, datetime, shutil
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'output'
report = json.loads((OUT / 'latest_report.json').read_text())
now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))

def esc(x):
    return str(x).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle('TitleX', fontName='Helvetica-Bold', fontSize=24, leading=29, textColor=colors.HexColor('#111827'), spaceAfter=8))
styles.add(ParagraphStyle('H1X', fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=colors.HexColor('#111827'), spaceBefore=8, spaceAfter=8))
styles.add(ParagraphStyle('H2X', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=colors.HexColor('#111827'), spaceBefore=6, spaceAfter=5))
styles.add(ParagraphStyle('BodyX', fontName='Helvetica', fontSize=9.2, leading=13, textColor=colors.HexColor('#374151'), spaceAfter=5))
styles.add(ParagraphStyle('SmallX', fontName='Helvetica', fontSize=7.8, leading=10, textColor=colors.HexColor('#6B7280')))
styles.add(ParagraphStyle('KPI', fontName='Helvetica-Bold', fontSize=22, leading=24, alignment=TA_CENTER, textColor=colors.HexColor('#111827')))
styles.add(ParagraphStyle('KPILabel', fontName='Helvetica', fontSize=7.2, leading=9, alignment=TA_CENTER, textColor=colors.HexColor('#6B7280')))

def P(text, style='BodyX'):
    return Paragraph(esc(text), styles[style])

def kpi(label, value, note, color):
    return Table([[P(label,'KPILabel')],[P(value,'KPI')],[P(note,'KPILabel')]], colWidths=[38*mm], rowHeights=[9*mm,14*mm,10*mm], style=TableStyle([
        ('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#E5E7EB')),('BACKGROUND',(0,0),(-1,-1),colors.white),('LINEABOVE',(0,0),(0,0),4,colors.HexColor(color)),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))

def table(data, widths):
    t=Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#E5E7EB')),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#F3F4F6')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
    return t

def footer(canvas, doc):
    canvas.saveState(); canvas.setFont('Helvetica',7); canvas.setFillColor(colors.HexColor('#9CA3AF'))
    canvas.drawString(18*mm, 10*mm, 'LumiLab / Clawdyes - read-only website visibility monitoring')
    canvas.drawRightString(192*mm, 10*mm, f'Page {doc.page}')
    canvas.restoreState()

scores = report.get('scores', {})
issues = report.get('topIssues') or report.get('priorityIssues') or report.get('issues', [])
pages = report.get('pages') or report.get('websitePages') or []
summary = report.get('executiveSummary') or report.get('summary') or f"LumiLab scanned {len(pages)} page(s) for {report.get('targetUrl','Adkivo')}."

def build(kind, path):
    story=[]
    title = f"Adkivo {kind} Visibility Report"
    subtitle = 'Daily operating snapshot' if kind == 'Daily' else 'Weekly strategy and trend report'
    story += [P(title,'TitleX'), P(subtitle,'BodyX'), P(f"Generated: {now.strftime('%d %b %Y %H:%M')} WIB | Target: {report.get('targetUrl','https://www.adkivo.my.id/')}",'SmallX'), Spacer(1,8)]
    story.append(Table([[kpi('Overall', str(scores.get('overall','—')), 'search + AI + technical', '#6D5EFC'), kpi('SEO', str(scores.get('seo','—')), 'metadata/indexability', '#059669'), kpi('AI / GEO', str(scores.get('aiVisibility','—')), 'answer readiness', '#D97706'), kpi('Technical', str(scores.get('technical','—')), 'crawl foundation', '#2563EB')]], colWidths=[42*mm]*4))
    story += [Spacer(1,10), P('Executive summary','H1X'), P(summary)]
    if kind == 'Daily':
        story += [P('Today’s read','H1X'), P('Adkivo’s technical SEO foundation is healthy. The main daily action is to improve answer-readiness: add FAQ-style explanations, strengthen entity clarity, and make platform pages easier for Google and AI systems to cite.')]
    else:
        story += [P('Weekly read','H1X'), P('This week’s strategy should focus on turning Adkivo from a technically crawlable site into an answerable authority. Prioritize content clusters, schema depth, and comparison/use-case pages that make the platform mentionable in AI-generated recommendations.')]
    story += [P('Priority issues','H1X')]
    rows=[[P('Priority','SmallX'),P('Issue','SmallX'),P('Page','SmallX'),P('Score','SmallX')]]
    for i in issues[:8]: rows.append([P(i.get('priority','—'),'SmallX'),P(i.get('title') or i.get('issue','—'),'SmallX'),P(i.get('page','—'),'SmallX'),P(str(i.get('score','—')),'SmallX')])
    story.append(table(rows,[22*mm,64*mm,70*mm,18*mm]))
    story += [Spacer(1,8), P('What to fix first','H1X')]
    actions = [
        'Add a concise FAQ block on homepage and key product pages: what Adkivo is, who it is for, how it helps, and why it is trustworthy.',
        'Add/expand SoftwareApplication, Organization, FAQPage, and WebSite schema where relevant.',
        'Create AI-search-friendly pages: “Adkivo vs spreadsheet ad tracking”, “Best ad specs command center for teams”, and “How to manage UTM and ad specs in one place”.',
        'Fix source fallback domain in robots.ts from adkivo.com to https://www.adkivo.my.id and add metadataBase in root metadata.',
        'Keep GA4/GSC monitoring active so LumiLab can compare impressions, CTR, landing pages, and recurring issues over time.'
    ]
    if kind == 'Weekly':
        actions += ['Build one weekly content asset and one comparison page. Track whether impressions and branded/non-branded queries move over the next 7–14 days.']
    for a in actions: story.append(P('• '+a))
    story += [PageBreak(), P('AI Generative / GEO visibility plan','H1X')]
    geo_rows = [[P('Area','SmallX'),P('Recommendation','SmallX'),P('Why it matters','SmallX')],
        [P('Entity clarity','SmallX'),P('Repeat consistent definition: Adkivo is a web advertising specs and command center platform.','SmallX'),P('AI systems need stable entity description before they cite or recommend a brand.','SmallX')],
        [P('Answer blocks','SmallX'),P('Add short, direct Q&A sections near key product claims.','SmallX'),P('Improves extraction for Google snippets, Perplexity, ChatGPT, Gemini-style answers.','SmallX')],
        [P('Trust signals','SmallX'),P('Add use cases, workflow screenshots, author/about details, and policy pages.','SmallX'),P('Makes recommendations safer for AI systems and search evaluators.','SmallX')],
        [P('Structured data','SmallX'),P('Use Organization, SoftwareApplication, FAQPage, BreadcrumbList, WebSite/SearchAction.','SmallX'),P('Reduces ambiguity and improves machine readability.','SmallX')]]
    story.append(table(geo_rows,[35*mm,75*mm,64*mm]))
    story += [Spacer(1,10), P('Technical handoff','H1X')]
    tech = ['Next.js source audit: sitemap and robots exist.', 'Known issue: robots.ts fallback domain still points to adkivo.com instead of live domain.', 'Add metadataBase in root metadata for robust canonical/OpenGraph URL generation.', 'Platform pages need unique titles/descriptions and more page-specific explanatory copy.']
    for t in tech: story.append(P('• '+t))
    if kind == 'Weekly':
        story += [Spacer(1,8), P('Weekly KPI watchlist','H1X')]
        for t in ['GSC impressions and CTR by page/query', 'GA4 sessions, engaged sessions, landing pages, source/medium', 'AI/GEO score movement', 'New vs repeated issues', 'Content shipped and indexed']: story.append(P('• '+t))
    doc=SimpleDocTemplate(str(path), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=18*mm, bottomMargin=16*mm)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)

build('Daily', OUT/'adkivo_daily_visibility_report.pdf')
build('Weekly', OUT/'adkivo_weekly_visibility_report.pdf')
print(OUT/'adkivo_daily_visibility_report.pdf')
print(OUT/'adkivo_weekly_visibility_report.pdf')
