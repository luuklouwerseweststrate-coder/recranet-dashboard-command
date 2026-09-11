import { dashboardPrototype } from '../data/dashboardPrototype.js';

export async function getMarketingDashboard({ mode = 'prototype' } = {}) {
  if (mode === 'prototype') {
    return dashboardPrototype;
  }

  throw new Error(
    'Live Google API koppelingen zijn nog niet ingesteld. Gebruik voorlopig mode="prototype".',
  );
}

export async function fetchGoogleAdsReport() {
  // Later: gebruik Google Ads API reporting met GAQL queries.
  return dashboardPrototype.googleAds;
}

export async function fetchSearchConsoleReport() {
  // Later: gebruik Search Console Search Analytics API.
  return dashboardPrototype.searchConsole;
}

export async function fetchGa4Report() {
  // Later: gebruik Google Analytics Data API runReport.
  return dashboardPrototype.ga4;
}

export const googleApiSetupTodo = [
  'Maak OAuth client of service account flow per klantorganisatie.',
  'Sla property IDs en customer IDs per camping veilig op.',
  'Map Google Ads kosten en conversiewaarde naar boekingen.',
  'Map Search Console queries, pagina s, CTR en posities.',
  'Map GA4 events voor zoek_en_boek_start, accommodatie_view, prijs_view en purchase.',
  'Voeg consent mode en cross-domain controle toe voordat cijfers worden gebruikt.',
];
