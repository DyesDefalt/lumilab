# LumiLab Tech / AI Handoff Report

Target: https://www.adkivo.my.id/
Cutoff: 2026-05-15 (Asia/Jakarta)

## Goal
Improve Adkivo SEO, AI visibility, and search-driven acquisition without breaking the existing Next.js app.

## Current State
- Overall: 72/100
- SEO: 100/100
- AI Visibility: 16/100
- Technical: 100/100
- Critical issues: 0
- High issues: 0

## Source Audit Findings
### High: robots.ts fallback sitemap domain does not match live domain
- Area: Indexability
- Evidence: robots.ts falls back to https://adkivo.com while live domain is adkivo.my.id
- User impact: Search engines may discover the wrong sitemap URL when NEXT_PUBLIC_SITE_URL is missing or misconfigured.
- Tech action: Set NEXT_PUBLIC_SITE_URL=https://www.adkivo.my.id in Vercel and change robots.ts fallback to https://www.adkivo.my.id.

### Good: Dynamic sitemap exists
- Area: Indexability
- Evidence: src/app/sitemap.ts exists and pulls platform/blog/team URLs.
- User impact: Search engines can discover important pages faster.
- Tech action: Keep sitemap working and monitor HTTP 200 daily.

### Good: Organization, SoftwareApplication, and WebSite schema exist
- Area: Structured Data
- Evidence: src/app/schema.ts and layout JSON-LD injection detected.
- User impact: Helps Google and AI systems understand the brand and product.
- Tech action: Add page-specific FAQPage/BreadcrumbList schema where content exists.

### Good: Google Tag Manager is installed
- Area: Analytics
- Evidence: GTMPageView and GoogleTagManager detected in root layout.
- User impact: Traffic and conversion events can be measured if GA4/GSC are configured correctly.
- Tech action: Verify GA4 events: page_view, search, platform_view, utm_generator_use, outbound_click.

### Medium: metadataBase is not configured in root metadata
- Area: Metadata
- Evidence: Next.js metadata lacks metadataBase.
- User impact: Absolute OG/canonical generation can be less reliable across environments.
- Tech action: Add metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.adkivo.my.id").

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
- 200 210ms https://www.adkivo.my.id/ | schema=3 | faq=no | h1=Launch ads fasterwith adkivo
- 200 999ms https://www.adkivo.my.id/blog | schema=3 | faq=no | h1=Blog & Insights
- 200 15ms https://www.adkivo.my.id/about | schema=3 | faq=no | h1=About adkivo
- 200 18ms https://www.adkivo.my.id/contact | schema=3 | faq=no | h1=Get in Touch
- 200 1019ms https://www.adkivo.my.id/platform/meta | schema=4 | faq=no | h1=Meta (Facebook/Instagram)
- 200 1051ms https://www.adkivo.my.id/platform/google | schema=4 | faq=no | h1=Google Ads
- 200 790ms https://www.adkivo.my.id/platform/tiktok | schema=4 | faq=no | h1=TikTok Ads
- 200 790ms https://www.adkivo.my.id/platform/shopee | schema=4 | faq=no | h1=Shopee Ads
- 200 990ms https://www.adkivo.my.id/platform/lazada | schema=4 | faq=no | h1=Lazada Ads
- 200 1016ms https://www.adkivo.my.id/platform/dv360 | schema=4 | faq=no | h1=Display & Video 360
- 200 781ms https://www.adkivo.my.id/platform/twitter | schema=4 | faq=no | h1=X (Twitter) Ads
- 200 791ms https://www.adkivo.my.id/platform/linkedin | schema=4 | faq=no | h1=LinkedIn Ads
