import { generateInsights } from './insightsEngine.js';

export const periodOptions = {
  week: {
    key: 'week',
    label: 'Deze week',
    comparison: 'vs. vorige week',
    factor: 0.28,
    bookingFactor: 0.3,
    trafficFactor: 0.25,
    forecastLabel: 'weekprognose',
    chartLabels: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
    trendLabels: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
    actionWindow: 'deze week',
  },
  month: {
    key: 'month',
    label: 'Deze maand',
    comparison: 'vs. vorige maand',
    factor: 1,
    bookingFactor: 1,
    trafficFactor: 1,
    forecastLabel: 'maandprognose',
    chartLabels: ['Nu', '+7d', '+14d', 'Maandeinde'],
    trendLabels: ['D-29', 'D-24', 'D-19', 'D-14', 'D-9', 'D-4', 'Vandaag'],
    actionWindow: 'deze maand',
  },
  quarter: {
    key: 'quarter',
    label: 'Dit kwartaal',
    comparison: 'vs. vorig kwartaal',
    factor: 2.85,
    bookingFactor: 2.8,
    trafficFactor: 2.75,
    forecastLabel: 'kwartaalprognose',
    chartLabels: ['M1', 'M2', 'M3', 'Einde kwartaal'],
    trendLabels: ['W1', 'W3', 'W5', 'W7', 'W9', 'W11', 'Nu'],
    actionWindow: 'dit kwartaal',
  },
  year: {
    key: 'year',
    label: 'Dit jaar',
    comparison: 'vs. vorig jaar',
    factor: 8.9,
    bookingFactor: 8.6,
    trafficFactor: 8.4,
    forecastLabel: 'jaarprognose',
    chartLabels: ['Q1', 'Q2', 'Q3', 'Q4'],
    trendLabels: ['Jan', 'Mrt', 'Mei', 'Jul', 'Sep', 'Nov', 'Nu'],
    actionWindow: 'dit jaar',
  },
};

const availabilityByPeriod = {
  week: [
    { week: 'Ma-di', pitches: 18, rentals: 6, demand: 'Middel', risk: 'Prijsdruk laag' },
    { week: 'Wo-do', pitches: 14, rentals: 5, demand: 'Hoog', risk: 'Zoekvraag trekt aan' },
    { week: 'Vrij', pitches: 9, rentals: 3, demand: 'Hoog', risk: 'Weekend bijna vol' },
    { week: 'Za-zo', pitches: 6, rentals: 2, demand: 'Zeer hoog', risk: 'Laatste plekken' },
  ],
  quarter: [
    { week: 'Maand 1', pitches: 86, rentals: 28, demand: 'Middel', risk: 'Vraag opbouwen' },
    { week: 'Maand 2', pitches: 61, rentals: 19, demand: 'Hoog', risk: 'Ads opschalen' },
    { week: 'Maand 3', pitches: 44, rentals: 15, demand: 'Zeer hoog', risk: 'Prijsstrategie bewaken' },
  ],
  year: [
    { week: 'Voorseizoen', pitches: 210, rentals: 74, demand: 'Middel', risk: 'Vroegboekvraag activeren' },
    { week: 'Zomerpiek', pitches: 96, rentals: 32, demand: 'Zeer hoog', risk: 'Marge en bezetting bewaken' },
    { week: 'Naseizoen', pitches: 184, rentals: 66, demand: 'Hoog', risk: 'Arrangementen en CRM' },
    { week: 'Winter', pitches: 260, rentals: 98, demand: 'Laag', risk: 'SEO- en contentbasis bouwen' },
  ],
};

function round(value) {
  return Math.round(value);
}

function scaledList(items, factor, keys) {
  return items.map((item) => {
    const next = { ...item };
    keys.forEach((key) => {
      if (typeof next[key] === 'number') {
        next[key] = round(next[key] * factor);
      }
    });
    return next;
  });
}

export function createReportingContext({ dashboard, periodConfig, scenarioConfig }) {
  const metrics = {
    bookingRevenue: round(dashboard.ga4.bookingRevenue * periodConfig.factor),
    expectedRevenue: round(
      dashboard.operations.expectedMonthEndRevenue * periodConfig.factor * scenarioConfig.revenue,
    ),
    bookings: round(dashboard.ga4.bookings * periodConfig.bookingFactor),
    expectedBookings: round(
      dashboard.forecast.at(-1).bookings * periodConfig.bookingFactor * scenarioConfig.bookings,
    ),
    adSpend: round(dashboard.googleAds.cost * periodConfig.factor),
    adsRevenue: round(dashboard.googleAds.revenue * periodConfig.factor),
    organicClicks: round(dashboard.searchConsole.clicks * periodConfig.trafficFactor),
    sessions: round(dashboard.ga4.sessions * periodConfig.trafficFactor),
    occupancy: dashboard.operations.occupancy,
    paymentCompletion: dashboard.operations.paymentCompletion,
    roas: dashboard.googleAds.roas,
    impressionShare: dashboard.googleAds.impressionShare,
  };

  const forecastRatios = [0.79, 0.87, 0.94, 1];
  const forecast = periodConfig.chartLabels.map((label, index) => ({
    label,
    revenue: round(metrics.expectedRevenue * forecastRatios[index]),
    bookings: round(metrics.expectedBookings * forecastRatios[index]),
  }));
  const trendRatios = [0.18, 0.28, 0.39, 0.53, 0.68, 0.84, 1];
  const trend = periodConfig.trendLabels.map((label, index) => ({
    label,
    revenue: round(metrics.bookingRevenue * trendRatios[index]),
    bookings: round(metrics.bookings * trendRatios[index]),
  }));
  const segments = scaledList(dashboard.segments, periodConfig.factor, ['revenue', 'bookings']).map(
    (segment) => {
      if (periodConfig.key === 'year' && segment.id === 'returning') {
        return {
          ...segment,
          note: 'Strategische groep voor lifecycle, vroegboekcampagnes en lagere afhankelijkheid van paid media.',
        };
      }
      if (periodConfig.key === 'quarter' && segment.id === 'families') {
        return {
          ...segment,
          note: 'Belangrijk voor vakantieperiodes; combineer beschikbaarheid met gezinsgerichte campagnes.',
        };
      }
      return segment;
    },
  );
  const funnel = scaledList(dashboard.ga4.funnel, periodConfig.trafficFactor, ['count']);
  const deviceSplit = scaledList(dashboard.ga4.deviceSplit, periodConfig.trafficFactor, [
    'sessions',
    'revenue',
  ]);
  const pages = scaledList(dashboard.searchConsole.pages, periodConfig.trafficFactor, ['clicks']);
  const budgetPacing = scaledList(dashboard.googleAds.budgetPacing, periodConfig.factor, [
    'value',
    'total',
  ]);
  const campaigns = scaledList(dashboard.googleAds.campaigns, periodConfig.factor, [
    'cost',
    'revenue',
    'bookings',
  ]);
  const sourceSplit = scaledList(dashboard.ga4.sourceSplit, periodConfig.trafficFactor, [
    'sessions',
    'bookings',
    'revenue',
  ]);
  const queries = scaledList(dashboard.searchConsole.queries, periodConfig.trafficFactor, [
    'clicks',
    'impressions',
  ]);
  const contentOpportunities = scaledList(
    dashboard.searchConsole.contentOpportunities,
    periodConfig.trafficFactor,
    ['demand'],
  );

  const report = {
    key: periodConfig.key,
    period: periodConfig.label,
    comparison: periodConfig.comparison,
    actionWindow: periodConfig.actionWindow,
    forecastLabel: periodConfig.forecastLabel,
    scenario: scenarioConfig.label,
    metrics,
    trend,
    forecast,
    availability: availabilityByPeriod[periodConfig.key] ?? dashboard.availability,
    segments,
    funnel,
    deviceSplit,
    pages,
    budgetPacing,
    campaigns,
    sourceSplit,
    queries,
    contentOpportunities,
  };

  const insights = generateInsights({ dashboard, report, profile: dashboard.decisionProfile });

  return {
    ...report,
    ...insights,
  };
}
