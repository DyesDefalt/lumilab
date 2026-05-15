#!/usr/bin/env python3
import json, pathlib, datetime, textwrap, os, glob
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'output'/'adkivo_seo_ai_visibility_report_clean.pdf'
report=json.loads((ROOT/'output'/'latest_report.json').read_text())
maton=ROOT/'research'/'maton'

def load(name, default=None):
    p=maton/name
    try: return json.loads(p.read_text())
    except: return default if default is not None else {}

gsc_pages=load('gsc_pages.json',{}).get('data',{}).get('rows',[])
gsc_queries=load('gsc_queries.json',{}).get('data',{}).get('rows',[])
ga4_overview=load('ga4_overview.json',{})
ga4_landing=load('ga4_landing_pages.json',{})
ga4_sources=load('ga4_sources.json',{})

def metric(row, i):
    try: return row['metricValues'][i]['value']
    except: return '0'

def dim(row, i):
    try: return row['dimensionValues'][i]['value']
    except: return ''

def fmt_int(v):
    try: return f"{int(float(v)):,}"
    except: return str(v)

def fmt_pct(v):
    try: return f"{float(v)*100:.1f}%"
    except: return str(v)

def truncate(s,n=72):
    s=str(s)
    return s if len(s)<=n else s[:n-1]+'…'

styles=getSampleStyleSheet()
styles.add(ParagraphStyle('CoverTitle', fontName='Helvetica-Bold', fontSize=25, leading=30, textColor=colors.HexColor('#111827'), spaceAfter=10))
styles.add(ParagraphStyle('H1x', fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=colors.HexColor('#111827'), spaceBefore=8, spaceAfter=10))
styles.add(ParagraphStyle('H2x', fontName='Helvetica-Bold', fontSize=13, leading=16, textColor=colors.HexColor('#111827'), spaceBefore=8, spaceAfter=6))
styles.add(ParagraphStyle('Bodyx', fontName='Helvetica', fontSize=9.3, leading=13.2, textColor=colors.HexColor('#374151'), spaceAfter=6))
styles.add(ParagraphStyle('Smallx', fontName='Helvetica', fontSize=7.8, leading=10, textColor=colors.HexColor('#6B7280')))
styles.add(ParagraphStyle('KPI', fontName='Helvetica-Bold', fontSize=22, leading=24, alignment=TA_CENTER, textColor=colors.HexColor('#111827')))
styles.add(ParagraphStyle('KPILabel', fontName='Helvetica', fontSize=7.2, leading=9, alignment=TA_CENTER, textColor=colors.HexColor('#6B7280')))
styles.add(ParagraphStyle('Callout', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=colors.HexColor('#111827'), backColor=colors.HexColor('#F8FAFC'), borderColor=colors.HexColor('#E5E7EB'), borderWidth=0.5, borderPadding=8))

palette={'navy':'#111827','muted':'#6B7280','line':'#E5E7EB','blue':'#2563EB','green':'#059669','orange':'#D97706','red':'#DC2626','bg':'#F9FAFB','purple':'#7C3AED'}

def P(text, style='Bodyx'):
    return Paragraph(str(text).replace('&','&amp;'), styles[style])

def bullet(items):
    return [P('- '+x,'Bodyx') for x in items]

def table(data, widths, header=True, font=8):
    t=Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign='LEFT')
    ts=[('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#E5E7EB')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('FONTSIZE',(0,0),(-1,-1),font)]
    if header:
        ts += [('BACKGROUND',(0,0),(-1,0),colors.HexColor('#F3F4F6')),('TEXTCOLOR',(0,0),(-1,0),colors.HexColor('#111827')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold')]
    t.setStyle(TableStyle(ts)); return t

def kpi(label, value, note, color):
    return Table([[P(label,'KPILabel')],[P(value,'KPI')],[P(note,'KPILabel')]], colWidths=[38*mm], rowHeights=[10*mm,14*mm,10*mm], style=TableStyle([
        ('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#E5E7EB')),('BACKGROUND',(0,0),(-1,-1),colors.white),('LINEABOVE',(0,0),(0,0),4,colors.HexColor(color)),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))

def footer(canvas, doc):
    canvas.saveState(); canvas.setFont('Helvetica',7); canvas.setFillColor(colors.HexColor('#9CA3AF'))
    canvas.drawString(18*mm, 10*mm, 'LumiLab SEO + AI Visibility Report - read-only monitoring')
    canvas.drawRightString(192*mm, 10*mm, f'Page {doc.page}')
    canvas.restoreState()

story=[]
# Cover
story += [P('LumiLab Report', 'Smallx'), P('Adkivo SEO + AI Visibility Audit', 'CoverTitle')]
story.append(P('A clear business + technical report for improving search visibility, AI-generated answer mentions, and website growth readiness. Data sources: live crawler, Adkivo source-code audit, Google Search Console, GA4, and 9Router competitor research.', 'Bodyx'))
story.append(Spacer(1,8))
story.append(table([[kpi('Overall Health', f"{report['scores']['overall']}/100", 'Good, needs AI content work', palette['green']), kpi('SEO Basics', f"{report['scores']['seo']}/100", 'Strong foundation', palette['green']), kpi('AI Visibility', f"{report['scores']['aiVisibility']}/100", 'Main growth gap', palette['red']), kpi('Technical', f"{report['scores']['technical']}/100", 'Healthy crawl', palette['green'])]], [42*mm,42*mm,42*mm,42*mm], header=False))
story.append(Spacer(1,12))
story.append(P(f"Target: {report['targetUrl']}<br/>Cutoff date: {report['cutoffDate']} ({report['timezone']})<br/>Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} WIB", 'Smallx'))
story.append(Spacer(1,10))
story.append(P('Executive verdict', 'H1x'))
story.append(P('Adkivo is not broken. The technical base is healthy: pages crawl, sitemap exists, schema exists, and GTM is installed. The growth gap is clarity and answer packaging: pages need more direct, quotable answers, stronger platform-specific metadata, FAQ blocks, and content clusters that can be cited by Google AI Overviews, ChatGPT, Gemini, Perplexity, and other generative engines.', 'Callout'))
story.append(PageBreak())

# Executive Summary
story.append(P('1. Executive Summary', 'H1x'))
story += bullet([
    'SEO basics are strong, but many pages still look similar to crawlers because platform pages use the same global title pattern.',
    'AI visibility is weak because pages do not expose enough concise Q&A, definitions, comparison tables, and citation-ready sections.',
    'Google Search Console has verified domain access for sc-domain:adkivo.my.id, but query data is currently sparse/zero for the last 28 days. This means the site needs content expansion and index/query growth.',
    'GA4 is connected. Initial data exists but is still small; the report should trend daily/weekly as traffic grows.',
    'Best next move: fix robots domain fallback, add metadataBase, then ship FAQ + schema + content clusters for platform ad specs and creative workflows.'
])
story.append(Spacer(1,6))
story.append(P('Priority actions', 'H2x'))
story.append(table([
    ['Priority','Action','Owner','Expected impact'],
    ['P0','Fix robots sitemap fallback domain and metadataBase','Developer','Cleaner indexing + canonical/OG reliability'],
    ['P0','Create unique platform page titles/descriptions','Developer/SEO','Higher CTR and clearer search intent match'],
    ['P1','Add FAQ blocks and FAQPage schema to key pages','SEO/Content','Better AI answer-readiness and rich-result eligibility'],
    ['P1','Build 3 content clusters: ad specs, safe zones, UTM/tracking','Content','More keyword coverage and internal links'],
    ['P2','Add PageSpeed/Core Web Vitals connector','Agent','Better technical monitoring']
], [20*mm,70*mm,32*mm,55*mm]))

# Live data
story.append(PageBreak())
story.append(P('2. Live Search + Traffic Data', 'H1x'))
story.append(P('Google Search Console and GA4 are now queried through Maton read-only connections. This replaces the earlier mock-only report sections.', 'Bodyx'))
story.append(P('Google Search Console - last ~28 days', 'H2x'))
if gsc_pages:
    rows=[['Page','Clicks','Impressions','CTR','Avg. position']]
    for r in gsc_pages[:10]:
        rows.append([P(truncate(r.get('keys',[''])[0],58),'Smallx'), fmt_int(r.get('clicks',0)), fmt_int(r.get('impressions',0)), fmt_pct(r.get('ctr',0)), f"{float(r.get('position',0)):.1f}"])
    story.append(table(rows,[78*mm,22*mm,28*mm,22*mm,28*mm], font=7.5))
else:
    story.append(P('No query rows returned. This usually means the property is new, traffic is still low, or query data is not available for the selected date range.', 'Callout'))

story.append(P('GA4 - last 30 days', 'H2x'))
rows=ga4_overview.get('rows',[])
if rows:
    r=rows[0]
    vals=[metric(r,i) for i in range(5)]
    story.append(table([['Sessions','Active users','Engaged sessions','Conversions','Page views'], [fmt_int(vals[0]),fmt_int(vals[1]),fmt_int(vals[2]),fmt_int(vals[3]),fmt_int(vals[4])]], [35*mm]*5))
else:
    story.append(P('No GA4 overview rows returned.', 'Bodyx'))

src_rows=ga4_sources.get('rows',[])
if src_rows:
    story.append(P('Traffic sources', 'H2x'))
    data=[['Channel','Sessions','Active users','Engaged sessions']]
    for r in src_rows[:8]: data.append([dim(r,0), fmt_int(metric(r,0)), fmt_int(metric(r,1)), fmt_int(metric(r,2))])
    story.append(table(data,[60*mm,35*mm,35*mm,40*mm]))

# Technical + AI visibility
story.append(PageBreak())
story.append(P('3. Website + Source-Code Audit', 'H1x'))
story.append(P('What is healthy', 'H2x'))
story += bullet(['Important pages return HTTP 200.', 'Sitemap endpoint works.', 'Organization/WebSite/SoftwareApplication schema exists.', 'Google Tag Manager is installed.', 'Source repo includes sitemap.ts and robots.ts.'])
story.append(P('What needs fixing', 'H2x'))
findings=report.get('sourceAudit',{}).get('findings',[])
fix_rows=[['Severity','Finding','Recommended fix']]
for f in findings:
    if f.get('severity')!='Good': fix_rows.append([f.get('severity'), P(f.get('title',''),'Smallx'), P(f.get('techAction',''),'Smallx')])
fix_rows.append(['Medium',P('Platform pages use generic global title in crawl','Smallx'),P('Generate unique metadata for /platform/[id] pages using platform name + intent keyword.','Smallx')])
fix_rows.append(['Medium',P('FAQ/answer-readiness is weak','Smallx'),P('Add visible FAQ sections and FAQPage schema to homepage, universal specs, and key platform pages.','Smallx')])
story.append(table(fix_rows,[24*mm,62*mm,92*mm],font=7.2))

story.append(P('AI Generative Visibility - May 2026 checklist', 'H2x'))
story += bullet([
    'Use direct answer blocks: 40-80 word answers under clear questions.',
    'Add comparison tables and definition boxes that AI systems can quote cleanly.',
    'Add author/entity signals: who created the guide, why it is trustworthy, freshness date, sources.',
    'Add schema that matches visible content: FAQPage, BreadcrumbList, Article for blog posts, SoftwareApplication/WebSite retained.',
    'Create pages that answer “best”, “vs”, “how to”, “template”, and “checklist” intents, not only generic platform pages.',
    'Keep every important page internally linked from relevant hubs so crawlers and AI tools see topical authority.'
])

# Competitor lens
story.append(PageBreak())
story.append(P('4. Competitor + Content Opportunity Lens', 'H1x'))
story.append(P('Based on 9Router search/fetch research and SEO report template analysis, Adkivo should compete as an advertising operations knowledge hub, not just an ad specs directory.', 'Bodyx'))
story.append(table([
    ['Competitor type','Examples found','How Adkivo can win'],
    ['Official docs','Meta, Google, TikTok help docs',P('Summarize across platforms, simplify language, add launch checklists and freshness dates.','Smallx')],
    ['Ad specs blogs','Soona, QuickFrame, Veuno, TheBrief, Udonis',P('Build better tables, templates, platform comparisons, and downloadable checklists.','Smallx')],
    ['Utility tools','UTM generators, ad size validators',P('Combine specs + UTM + creative QA in one workflow.','Smallx')],
    ['Ad intelligence tools','AdLibrary, Segwise, Hawky, Bigdatr, VibeMyAd',P('Own the pre-launch specs/QA niche before expanding into intelligence.','Smallx')]
], [34*mm,48*mm,95*mm], font=7.2))
story.append(P('Recommended content clusters', 'H2x'))
story.append(table([
    ['Cluster','Example pages','Business goal'],
    ['Ad specs','Meta Ads specs 2026, TikTok video specs, Google Demand Gen specs','Capture high-intent informational search'],
    ['Creative QA','Safe zone checker, image/video checklist, common rejection reasons','Become a practical workflow tool'],
    ['Tracking/UTM','UTM generator guide, naming conventions, campaign templates','Convert marketers and agencies'],
    ['Comparisons','Adkivo vs official docs, best free ad specs tools','Win commercial investigation searches']
], [30*mm,75*mm,70*mm], font=7.2))

# Tech handoff
story.append(PageBreak())
story.append(P('5. Developer / AI Handoff', 'H1x'))
story.append(P('Give this section to Cursor, Claude Code, or another coding agent.', 'Bodyx'))
story.append(P('Implementation prompt', 'H2x'))
prompt='''You are editing the Adkivo Next.js project. Do not change unrelated files. Fix src/app/robots.ts fallback domain to https://www.adkivo.my.id. Add metadataBase in src/app/layout.tsx using NEXT_PUBLIC_SITE_URL fallback https://www.adkivo.my.id. Add dynamic metadata for src/app/platform/[id]/page.tsx with unique title, description, OpenGraph and canonical. Add visible FAQ sections to homepage, universal specs, and key platform pages. Add FAQPage schema only where FAQ content is rendered and BreadcrumbList schema to platform pages. Keep existing schema, GTM, Supabase, and platform data. Run npm run build and report changed files.'''
story.append(P(prompt,'Callout'))
story.append(P('Measurement events to verify', 'H2x'))
story += bullet(['page_view','platform_view','search_used','utm_generated','specs_exported','outbound_doc_click','contact_submit'])
story.append(P('Report notes', 'H2x'))
story.append(P('This report is generated by LumiLab/Clawdyes in read-only mode. No website files were changed. GSC returned page rows but no query rows for the current range. Continue daily scans to establish trends.', 'Smallx'))

OUT.parent.mkdir(parents=True,exist_ok=True)
doc=SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=16*mm, leftMargin=16*mm, topMargin=16*mm, bottomMargin=16*mm)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
