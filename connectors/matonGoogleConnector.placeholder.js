/**
 * Placeholder for Maton / Google live connectors.
 * Replace mock adapters when DATA_MODE=live and credentials are configured.
 *
 * TODO: Implement GA4 Data API via service account
 * TODO: Implement Search Console Search Analytics API
 * TODO: Wire Maton API key for unified Google access
 */

export async function getLiveGA4() {
  throw new Error(
    'Live GA4 connector not implemented. Set DATA_MODE=mock or implement matonGoogleConnector.'
  );
}

export async function getLiveGSC() {
  throw new Error(
    'Live GSC connector not implemented. Set DATA_MODE=mock or implement matonGoogleConnector.'
  );
}

export async function getLiveGoogleBundle() {
  const [ga4, gsc] = await Promise.all([getLiveGA4(), getLiveGSC()]);
  return { ga4, gsc };
}

export default { getLiveGA4, getLiveGSC, getLiveGoogleBundle };
