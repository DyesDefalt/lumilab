# LumiLab Tech / AI Handoff Report

Target: https://www.adkivo.my.id/
Cutoff: 2026-05-15 (Asia/Jakarta)

## Goal
Improve Adkivo SEO, AI visibility, and search-driven acquisition without breaking the existing Next.js app.

## Current State
- Overall: 77/100
- SEO: 100/100
- AI Visibility: 30/100
- Technical: 100/100
- Critical issues: 0
- High issues: 0

## Source Audit Findings


## Top Implementation Tasks
1. Fix robots sitemap domain.
   - File: `src/app/robots.ts`
   - Change fallback from `https://adkivo.com` to `https://www.adkivo.my.id`.
   - Verify Vercel env `NEXT_PUBLIC_SITE_URL=https://www.adkivo.my.id`.

2. Add unique metadata for platform pages.
   - File likely: `src/app/platform/[id]/page.tsx`
   - Generate title: `{Platform} Ads Specs, Formats & Creative Guide | Adkivo`.
   - Generate description with platform name, specs, safe zones, creative requirements.

3. Add answer-ready FAQ sections.
   - Pages: homepage, /platform/meta, /platform/google, /platform/tiktok, /universal-specs.
   - Each FAQ should answer real buyer/search questions in 40-80 words.

4. Add schema extensions.
   - Add BreadcrumbList to platform pages.
   - Add FAQPage schema only when FAQ content exists.

5. Add conversion/event tracking verification.
   - Events: search_used, platform_view, utm_generated, specs_exported, outbound_doc_click, contact_submit.

## Cursor Prompt
```txt
You are editing the Adkivo Next.js project. Do not change unrelated files.

Tasks:
1. Fix src/app/robots.ts fallback domain to https://www.adkivo.my.id and keep sitemap path /sitemap.xml.
2. Add metadataBase in src/app/layout.tsx using NEXT_PUBLIC_SITE_URL fallback https://www.adkivo.my.id.
3. Add dynamic platform metadata in src/app/platform/[id]/page.tsx: unique title, description, OpenGraph, canonical.
4. Add visible FAQ sections to homepage and platform detail pages. Keep copy concise and useful to marketers.
5. Add FAQPage schema only where FAQ content is rendered. Add BreadcrumbList schema to platform pages.
6. Do not remove existing schema, GTM, Supabase, or platform data.
7. Run npm run build and report changed files.
```

## Crawled Pages
- 200 147ms https://www.adkivo.my.id/ | schema=3 | faq=no | h1=Launch ads fasterwith adkivo
- 200 1723ms https://www.adkivo.my.id/blog | schema=3 | faq=no | h1=Blog & Insights
- 200 46ms https://www.adkivo.my.id/about | schema=3 | faq=no | h1=About adkivo
- 200 37ms https://www.adkivo.my.id/contact | schema=3 | faq=no | h1=Get in Touch
- 200 1263ms https://www.adkivo.my.id/platform/meta | schema=4 | faq=no | h1=Meta (Facebook/Instagram)
- 200 1063ms https://www.adkivo.my.id/platform/google | schema=4 | faq=no | h1=Google Ads
- 200 1414ms https://www.adkivo.my.id/platform/tiktok | schema=4 | faq=no | h1=TikTok Ads
- 200 1433ms https://www.adkivo.my.id/platform/shopee | schema=4 | faq=no | h1=Shopee Ads
- 200 973ms https://www.adkivo.my.id/platform/lazada | schema=4 | faq=no | h1=Lazada Ads
- 200 1458ms https://www.adkivo.my.id/platform/dv360 | schema=4 | faq=no | h1=Display & Video 360
