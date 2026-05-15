import { getGA4Data as getMockGA4 } from './ga4MockConnector.js';
import { getGSCData as getMockGSC } from './gscMockConnector.js';
import { getBusinessData as getMockBusiness } from './businessMockConnector.js';
import { getLiveGA4, getLiveGSC } from './matonGoogleConnector.placeholder.js';
import { crawlWebsite } from './websiteCrawler.js';

export async function loadPerformanceData() {
  const mode = (process.env.DATA_MODE || 'mock').toLowerCase();

  if (mode === 'live') {
    return {
      mode: 'live',
      ga4: await getLiveGA4(),
      gsc: await getLiveGSC(),
      business: await getMockBusiness(), // commerce live TBD
    };
  }

  const [ga4, gsc, business] = await Promise.all([
    getMockGA4(),
    getMockGSC(),
    getMockBusiness(),
  ]);

  return { mode: 'mock', ga4, gsc, business };
}

export async function runCrawler(options = {}) {
  return crawlWebsite(options);
}

export function getConnectorStatus(performanceData, crawlResult) {
  return {
    websiteCrawler: {
      status: crawlResult?.pages?.length ? 'live_active' : 'error',
      source: 'live',
      pagesCrawled: crawlResult?.pageCount || 0,
    },
    ga4: {
      status: performanceData.ga4?.status || 'unknown',
      source: performanceData.ga4?.source || performanceData.mode,
      label: performanceData.ga4?.label,
    },
    searchConsole: {
      status: performanceData.gsc?.status || 'unknown',
      source: performanceData.gsc?.source || performanceData.mode,
      label: performanceData.gsc?.label,
    },
    business: {
      status: performanceData.business?.status || 'unknown',
      source: performanceData.business?.source || performanceData.mode,
      label: performanceData.business?.label,
    },
    memory: { status: 'local_json', source: 'local' },
  };
}

export default { loadPerformanceData, runCrawler, getConnectorStatus };
