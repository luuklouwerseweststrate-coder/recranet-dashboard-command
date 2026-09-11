export const dashboardPrototype = {
  meta: {
    propertyName: 'Camping de Waschappelse Rups',
    brandContext: 'Recranet rapportage',
    period: 'Laatste 30 dagen',
    comparison: 'vs. vorige 30 dagen',
    updatedAt: '2026-09-10 09:40',
    mode: 'Prototype',
  },
  operations: {
    occupancy: 74,
    occupancyDelta: 6.2,
    availableUnits: 37,
    averageLeadTime: 46,
    cancellationRate: 3.4,
    paymentCompletion: 91,
    expectedMonthEndRevenue: 78300,
    forecastConfidence: 82,
  },
  sources: [
    {
      id: 'google-ads',
      label: 'Google Ads',
      status: 'prototype',
      freshness: 'campagneprestaties en rendement',
      metrics: ['cost', 'revenue', 'roas', 'bookings', 'ctr', 'cvr'],
    },
    {
      id: 'search-console',
      label: 'Search Console',
      status: 'prototype',
      freshness: 'organische vraag en zichtbaarheid',
      metrics: ['clicks', 'impressions', 'ctr', 'position', 'queries', 'pages'],
    },
    {
      id: 'ga4',
      label: 'GA4',
      status: 'prototype',
      freshness: 'websitegedrag en boekingsfunnel',
      metrics: ['users', 'sessions', 'engagement', 'bookings', 'revenue', 'funnel'],
    },
  ],
  kpis: [
    {
      id: 'totalRevenue',
      label: 'Boekomzet website',
      value: 62340,
      format: 'currency',
      delta: 18.4,
      source: 'GA4',
      tone: 'accent',
    },
    {
      id: 'adSpend',
      label: 'Google Ads kosten',
      value: 2840,
      format: 'currency',
      delta: -4.2,
      source: 'Google Ads',
      tone: 'blue',
    },
    {
      id: 'roas',
      label: 'ROAS Google Ads',
      value: 6.67,
      format: 'ratio',
      delta: 12.9,
      source: 'Google Ads',
      tone: 'accent',
    },
    {
      id: 'bookings',
      label: 'Online boekingen',
      value: 128,
      format: 'number',
      delta: 9.5,
      source: 'GA4',
      tone: 'coral',
    },
    {
      id: 'organicClicks',
      label: 'Organische klikken',
      value: 5860,
      format: 'number',
      delta: 7.8,
      source: 'Search Console',
      tone: 'amber',
    },
    {
      id: 'bookingRate',
      label: 'Boekingsratio',
      value: 3.8,
      format: 'percent',
      delta: 0.6,
      source: 'GA4',
      tone: 'blue',
    },
  ],
  googleAds: {
    cost: 2840,
    revenue: 18950,
    bookings: 42,
    roas: 6.67,
    ctr: 8.4,
    cvr: 4.9,
    cpa: 67.62,
    impressionShare: 62,
    campaigns: [
      {
        name: 'Search - Camping Walcheren aan zee',
        cost: 860,
        revenue: 8430,
        bookings: 19,
        roas: 9.8,
        cvr: 6.7,
        advice: 'Opschalen met extra budget en long-tail advertentiegroepen.',
      },
      {
        name: 'Performance Max - Familiecamping Zeeland',
        cost: 1180,
        revenue: 7120,
        bookings: 16,
        roas: 6.0,
        cvr: 4.2,
        advice: 'Asset groups splitsen op gezinnen, strand en last-minute.',
      },
      {
        name: 'Search - Last minute camping',
        cost: 520,
        revenue: 2360,
        bookings: 5,
        roas: 4.5,
        cvr: 3.6,
        advice: 'Alleen activeren rond echte beschikbaarheid en korte aankomstdatum.',
      },
      {
        name: 'Display remarketing - Zoek en boek afhakers',
        cost: 280,
        revenue: 1040,
        bookings: 2,
        roas: 3.7,
        cvr: 1.8,
        advice: 'Creatives vernieuwen met prijsvoordeel en beschikbare periodes.',
      },
    ],
    budgetPacing: [
      { label: 'Besteed', value: 2840, total: 4300 },
      { label: 'Gepland', value: 3610, total: 4300 },
      { label: 'Rendabel plafond', value: 4300, total: 4300 },
    ],
  },
  searchConsole: {
    clicks: 5860,
    impressions: 154200,
    ctr: 3.8,
    position: 11.7,
    queries: [
      {
        query: 'camping westkapelle',
        clicks: 930,
        impressions: 12100,
        ctr: 7.7,
        position: 4.2,
        movement: 2.1,
      },
      {
        query: 'familiecamping walcheren',
        clicks: 510,
        impressions: 18600,
        ctr: 2.7,
        position: 9.8,
        movement: 3.4,
      },
      {
        query: 'camping aan zee zeeland',
        clicks: 420,
        impressions: 26500,
        ctr: 1.6,
        position: 13.9,
        movement: -1.2,
      },
      {
        query: 'kamperen met kinderen zeeland',
        clicks: 260,
        impressions: 10400,
        ctr: 2.5,
        position: 12.5,
        movement: 4.7,
      },
      {
        query: 'camping met prive sanitair zeeland',
        clicks: 190,
        impressions: 8200,
        ctr: 2.3,
        position: 15.2,
        movement: 5.9,
      },
    ],
    pages: [
      {
        path: '/campingplaatsen',
        clicks: 1680,
        ctr: 4.5,
        position: 7.1,
      },
      {
        path: '/accommodaties/strandlodge',
        clicks: 940,
        ctr: 3.9,
        position: 10.2,
      },
      {
        path: '/last-minute',
        clicks: 610,
        ctr: 5.8,
        position: 6.8,
      },
      {
        path: '/omgeving/westkapelle',
        clicks: 390,
        ctr: 2.1,
        position: 16.4,
      },
    ],
    contentOpportunities: [
      {
        topic: 'Prive sanitair in Zeeland',
        demand: 8200,
        difficulty: 'Middel',
        targetPage: '/campingplaatsen/prive-sanitair',
        impact: 'Hoge koopintentie, nog geen sterke landingspagina.',
      },
      {
        topic: 'Familiecamping op Walcheren',
        demand: 18600,
        difficulty: 'Laag',
        targetPage: '/familiecamping-walcheren',
        impact: 'Stijgende positie met ruimte voor top 5.',
      },
      {
        topic: 'Last minute camping aan zee',
        demand: 26500,
        difficulty: 'Hoog',
        targetPage: '/last-minute',
        impact: 'Veel volume, alleen rendabel met actuele beschikbaarheid.',
      },
    ],
  },
  ga4: {
    users: 12430,
    sessions: 17840,
    engagedSessions: 11420,
    engagementRate: 64,
    bookings: 128,
    bookingRevenue: 62340,
    averageBookingValue: 487,
    sourceSplit: [
      { channel: 'Organic Search', sessions: 6730, bookings: 48, revenue: 23410 },
      { channel: 'Paid Search', sessions: 2240, bookings: 42, revenue: 18950 },
      { channel: 'Direct', sessions: 3180, bookings: 21, revenue: 10270 },
      { channel: 'Referral', sessions: 1410, bookings: 10, revenue: 5480 },
      { channel: 'Social', sessions: 980, bookings: 7, revenue: 4230 },
    ],
    funnel: [
      { step: 'Website bezoek', count: 17840, rate: 100 },
      { step: 'Zoek en boek gestart', count: 4210, rate: 23.6 },
      { step: 'Accommodatie bekeken', count: 2760, rate: 15.5 },
      { step: 'Prijs stap bereikt', count: 820, rate: 4.6 },
      { step: 'Boeking geplaatst', count: 128, rate: 0.7 },
    ],
    deviceSplit: [
      { device: 'Mobiel', sessions: 11230, bookingRate: 2.8, revenue: 31870 },
      { device: 'Desktop', sessions: 5210, bookingRate: 5.2, revenue: 25140 },
      { device: 'Tablet', sessions: 1400, bookingRate: 3.4, revenue: 5330 },
    ],
  },
  segments: [
    {
      id: 'families',
      label: 'Gezinnen',
      revenue: 28640,
      bookings: 56,
      conversion: 4.4,
      roas: 7.4,
      note: 'Sterk op schoolvakanties en faciliteitenpagina s.',
    },
    {
      id: 'couples',
      label: 'Stellen',
      revenue: 14780,
      bookings: 31,
      conversion: 3.6,
      roas: 5.8,
      note: 'Zoeken vaker op rust, natuur en fietsafstand.',
    },
    {
      id: 'lastminute',
      label: 'Last minute',
      revenue: 10320,
      bookings: 24,
      conversion: 2.9,
      roas: 4.5,
      note: 'Volume is hoog, rendement wisselt met beschikbaarheid.',
    },
    {
      id: 'returning',
      label: 'Terugkerende gasten',
      revenue: 8560,
      bookings: 17,
      conversion: 7.1,
      roas: 9.2,
      note: 'Kleinere groep met hoogste boekingskans.',
    },
  ],
  availability: [
    { week: 'Week 28', pitches: 12, rentals: 4, demand: 'Hoog', risk: 'Prijsdruk laag' },
    { week: 'Week 29', pitches: 8, rentals: 2, demand: 'Zeer hoog', risk: 'Bijna vol' },
    { week: 'Week 30', pitches: 19, rentals: 7, demand: 'Hoog', risk: 'Extra Ads rendabel' },
    { week: 'Week 31', pitches: 31, rentals: 12, demand: 'Middel', risk: 'Remarketing nodig' },
    { week: 'Week 32', pitches: 44, rentals: 18, demand: 'Middel', risk: 'Prijsactie overwegen' },
  ],
  alerts: [
    {
      type: 'Kans',
      title: 'Campagne Walcheren heeft budgetruimte',
      detail: 'ROAS 9,8x bij 62% impression share. Extra dagbudget is verdedigbaar.',
      owner: 'Marketing',
    },
    {
      type: 'Risico',
      title: 'Mobiele boekingsratio blijft achter',
      detail: 'Mobiel levert 63% van sessies, maar converteert 46% lager dan desktop.',
      owner: 'Website',
    },
    {
      type: 'Kans',
      title: 'Terugkerende gasten converteren het best',
      detail: 'Segment haalt 7,1% conversie. E-mail en remarketing kunnen dit vergroten.',
      owner: 'CRM',
    },
  ],
  advice: [
    {
      priority: 'Hoog',
      title: 'Zet budget richting high-intent zoekopdrachten op Walcheren.',
      insight:
        'De Ads-data laat zien dat Walcheren + aan zee zoekwoorden bijna 10x ROAS halen, terwijl generieke last-minute termen lager converteren.',
      action:
        'Maak aparte advertentiegroepen voor "camping westkapelle", "camping walcheren aan zee" en "familiecamping walcheren".',
      expectedImpact: '+8 tot +14 extra boekingen per maand',
      sources: ['Google Ads', 'Search Console'],
    },
    {
      priority: 'Hoog',
      title: 'Maak SEO-landingspagina voor gezinnen en prive sanitair.',
      insight:
        'Search Console toont stijgende posities op gezins- en sanitairvragen, maar de gemiddelde positie zit nog buiten de top 10.',
      action:
        'Publiceer twee praktische pagina s met beschikbaarheid, voordelen, FAQ en interne links naar zoek en boek.',
      expectedImpact: '+900 tot +1.400 organische impressies per maand',
      sources: ['Search Console'],
    },
    {
      priority: 'Middel',
      title: 'Los de grootste uitval in het boekingspad op.',
      insight:
        'In GA4 valt veel verkeer weg tussen accommodatie bekijken en de prijsstap.',
      action:
        'Test duidelijkere prijsindicatie, filters voor aankomstdatum en een sticky beschikbaarheidsknop op mobiel.',
      expectedImpact: '+0,4 procentpunt boekingsratio',
      sources: ['GA4'],
    },
    {
      priority: 'Middel',
      title: 'Maak remarketing afhankelijk van actuele beschikbaarheid.',
      insight:
        'Remarketing heeft de laagste ROAS en mist waarschijnlijk urgentie.',
      action:
        'Voed doelgroepen met zoek-en-boek gedrag en toon alleen periodes waar nog aanbod is.',
      expectedImpact: 'Lagere CPA en minder verspilde impressies',
      sources: ['Google Ads', 'GA4'],
    },
  ],
  actionPlan: [
    {
      id: 'ads-budget',
      status: 'Nu',
      owner: 'Ads',
      task: 'Verhoog budget op Walcheren-campagnes met 20%',
      expectedValue: '+€4.800 omzet',
      effort: 'Laag',
    },
    {
      id: 'mobile-price',
      status: 'Deze week',
      owner: 'Website',
      task: 'Maak prijsindicatie eerder zichtbaar op mobiel',
      expectedValue: '+0,4 pp conversie',
      effort: 'Middel',
    },
    {
      id: 'seo-family',
      status: 'Deze week',
      owner: 'SEO',
      task: 'Publiceer landingspagina familiecamping Walcheren',
      expectedValue: '+1.400 impressies',
      effort: 'Middel',
    },
    {
      id: 'crm-returning',
      status: 'Later',
      owner: 'CRM',
      task: 'Segment terugkerende gasten activeren met vroegboekkorting',
      expectedValue: '+12 boekingen',
      effort: 'Laag',
    },
  ],
  trend: [
    { label: 'D-29', revenue: 1240, bookings: 3 },
    { label: 'D-24', revenue: 1820, bookings: 4 },
    { label: 'D-19', revenue: 1410, bookings: 3 },
    { label: 'D-14', revenue: 2690, bookings: 6 },
    { label: 'D-9', revenue: 3410, bookings: 8 },
    { label: 'D-4', revenue: 2960, bookings: 7 },
    { label: 'Vandaag', revenue: 3840, bookings: 9 },
  ],
  forecast: [
    { label: 'Nu', revenue: 62340, bookings: 128 },
    { label: '+7d', revenue: 68100, bookings: 140 },
    { label: '+14d', revenue: 72450, bookings: 151 },
    { label: 'Maandeinde', revenue: 78300, bookings: 164 },
  ],
};

export function formatMetric(value, format) {
  if (format === 'currency') {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (format === 'ratio') {
    return `${value.toFixed(2).replace('.', ',')}x`;
  }

  if (format === 'percent') {
    return `${value.toFixed(1).replace('.', ',')}%`;
  }

  return new Intl.NumberFormat('nl-NL').format(value);
}

export function formatDelta(delta) {
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${delta.toString().replace('.', ',')}%`;
}
