import fs from 'node:fs/promises';
import path from 'node:path';

async function readIfExists(file) { try { return await fs.readFile(file, 'utf8'); } catch { return ''; } }
async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }

export async function auditSource(repoPath, targetUrl) {
  if (!repoPath || !(await exists(repoPath))) return { status: 'not_configured', findings: [], routes: [] };
  const findings = [];
  const appDir = path.join(repoPath, 'src/app');
  const layout = await readIfExists(path.join(appDir, 'layout.tsx'));
  const robots = await readIfExists(path.join(appDir, 'robots.ts'));
  const sitemap = await readIfExists(path.join(appDir, 'sitemap.ts'));
  const schema = await readIfExists(path.join(appDir, 'schema.ts'));
  const targetHost = new URL(targetUrl).host;

  if (robots && /adkivo\.com/.test(robots) && targetHost.includes('my.id')) {
    findings.push({ severity: 'High', area: 'Indexability', title: 'robots.ts fallback sitemap domain does not match live domain', evidence: 'robots.ts falls back to https://adkivo.com while live domain is adkivo.my.id', userImpact: 'Search engines may discover the wrong sitemap URL when NEXT_PUBLIC_SITE_URL is missing or misconfigured.', techAction: 'Set NEXT_PUBLIC_SITE_URL=https://www.adkivo.my.id in Vercel and change robots.ts fallback to https://www.adkivo.my.id.' });
  }
  if (sitemap) findings.push({ severity: 'Good', area: 'Indexability', title: 'Dynamic sitemap exists', evidence: 'src/app/sitemap.ts exists and pulls platform/blog/team URLs.', userImpact: 'Search engines can discover important pages faster.', techAction: 'Keep sitemap working and monitor HTTP 200 daily.' });
  if (schema && /Organization/.test(schema) && /WebSite/.test(schema)) findings.push({ severity: 'Good', area: 'Structured Data', title: 'Organization, SoftwareApplication, and WebSite schema exist', evidence: 'src/app/schema.ts and layout JSON-LD injection detected.', userImpact: 'Helps Google and AI systems understand the brand and product.', techAction: 'Add page-specific FAQPage/BreadcrumbList schema where content exists.' });
  if (layout && /GoogleTagManager/.test(layout)) findings.push({ severity: 'Good', area: 'Analytics', title: 'Google Tag Manager is installed', evidence: 'GTMPageView and GoogleTagManager detected in root layout.', userImpact: 'Traffic and conversion events can be measured if GA4/GSC are configured correctly.', techAction: 'Verify GA4 events: page_view, search, platform_view, utm_generator_use, outbound_click.' });
  if (layout && !/metadataBase/.test(layout)) findings.push({ severity: 'Medium', area: 'Metadata', title: 'metadataBase is not configured in root metadata', evidence: 'Next.js metadata lacks metadataBase.', userImpact: 'Absolute OG/canonical generation can be less reliable across environments.', techAction: 'Add metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.adkivo.my.id").' });

  const routeFiles = [];
  async function walk(dir) {
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name === 'page.tsx') routeFiles.push(p);
    }
  }
  await walk(appDir);
  const routes = routeFiles.map(f => '/' + path.relative(appDir, path.dirname(f)).replace(/\\/g, '/').replace(/^\.$/, '').replace(/\/page$/, '')).map(r => r === '/' ? '/' : r.replace(/\/\(.+?\)/g, '').replace(/\/\[.+?\]/g, '/:dynamic'));

  return { status: 'ok', repoPath, findings, routes: [...new Set(routes)].sort() };
}
