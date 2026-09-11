function round(value) {
  return Math.round(value);
}

function euro(value) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value) {
  return new Intl.NumberFormat('nl-NL').format(round(value));
}

function ratio(value) {
  return `${Number(value).toFixed(1).replace('.', ',')}x`;
}

function percent(value, digits = 0) {
  return `${Number(value).toFixed(digits).replace('.', ',')}%`;
}

function percentagePoints(value, digits = 1) {
  return `${Number(value).toFixed(digits).replace('.', ',')} pp`;
}

const FALLBACK_PROFILE = {
  minRoasForScale: 5.5,
  minCampaignBookings: 2,
  maxImpressionShareForScale: 75,
  minSeoDemand: 7500,
  targetSeoCtr: 4,
  minMobileSessionShare: 45,
  minMobileConversionGap: 0.35,
  returningGuestActivationRate: 15,
  weights: {
    impact: 0.42,
    urgency: 0.24,
    confidence: 0.2,
    effort: 0.14,
  },
};

function includesAny(value, terms) {
  const normalized = String(value ?? '').toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function effortScore(effort) {
  if (effort === 'Laag') return 100;
  if (effort === 'Middel') return 68;
  return 38;
}

function confidenceScore(confidence) {
  if (confidence === 'Hoog') return 92;
  if (confidence === 'Middel') return 68;
  return 44;
}

function priorityFromScore(score) {
  if (score >= 78) return 'Hoog';
  if (score >= 58) return 'Middel';
  return 'Laag';
}

function scoreInsight(insight, profile) {
  const weights = { ...FALLBACK_PROFILE.weights, ...(profile.weights ?? {}) };
  const impact = Math.min(100, Math.max(0, insight.impactScore ?? 50));
  const urgency = Math.min(100, Math.max(0, insight.urgencyScore ?? 50));
  const confidence = confidenceScore(insight.confidence);
  const effort = effortScore(insight.effort);
  const score = Math.round(
    impact * weights.impact +
      urgency * weights.urgency +
      confidence * weights.confidence +
      effort * weights.effort,
  );

  return {
    ...insight,
    score,
    priority: priorityFromScore(score),
    scoring:
      `Impact ${impact}/100, urgentie ${urgency}/100, vertrouwen ${confidence}/100, ` +
      `inspanning ${effort}/100.`,
  };
}

function findBestSearchCampaign(campaigns, profile) {
  return [...campaigns]
    .filter(
      (campaign) =>
        campaign.roas >= profile.minRoasForScale &&
        campaign.bookings >= profile.minCampaignBookings,
    )
    .sort((a, b) => b.roas - a.roas || b.revenue - a.revenue)[0];
}

function findMatchingSearchDemand(queries, campaignName) {
  const locationTerms = ['walcheren', 'westkapelle', 'zeeland', 'aan zee'];
  const campaignTerms = campaignName
    .toLowerCase()
    .replace(/search|performance|max|camping|familiecamping/g, '')
    .split(/\s|-/)
    .filter((term) => term.length > 3);

  return queries.find(
    (query) =>
      includesAny(query.query, [...locationTerms, ...campaignTerms]) &&
      (query.movement ?? 0) >= 0,
  );
}

function createAdsBudgetInsight({ report, campaign, matchingQuery, profile }) {
  if (!campaign) return null;
  if (report.metrics.adSpend <= 0 || report.metrics.adsRevenue <= 0 || campaign.roas <= 0) {
    return null;
  }

  const increasePct = report.key === 'year' ? 0.15 : 0.2;
  const extraBudget = campaign.cost * increasePct;
  const expectedRevenue = extraBudget * campaign.roas;
  const impressionShare = report.metrics.impressionShare ?? 100;
  const hasRoom = impressionShare <= profile.maxImpressionShareForScale;
  const impactScore = Math.min(100, (expectedRevenue / Math.max(report.metrics.bookingRevenue, 1)) * 900);
  const urgencyScore = hasRoom ? 86 : 42;

  return {
    id: 'ads-budget',
    status: report.key === 'year' ? 'Strategie' : 'Nu',
    owner: 'Ads',
    task:
      report.key === 'year'
        ? `Maak jaarbudget vrij voor ${campaign.name.replace('Search - ', '')}`
        : `Verhoog budget op ${campaign.name.replace('Search - ', '')} met ${percent(increasePct * 100)}`,
    expectedValue: `+${euro(expectedRevenue)} omzet`,
    effort: report.key === 'year' ? 'Middel' : 'Laag',
    reason: `${ratio(campaign.roas)} ROAS, ${percent(impressionShare)} impression share${matchingQuery ? ` en groei op "${matchingQuery.query}"` : ''}.`,
    formula: `${euro(campaign.cost)} kosten x ${percent(increasePct * 100)} extra budget x ${ratio(campaign.roas)} ROAS = ${euro(expectedRevenue)} verwachte omzet.`,
    sources: ['Google Ads', ...(matchingQuery ? ['Search Console'] : [])],
    confidence: hasRoom && matchingQuery ? 'Hoog' : 'Middel',
    impactScore,
    urgencyScore,
    rule: `ROAS >= ${ratio(profile.minRoasForScale)}, boekingen >= ${profile.minCampaignBookings}, impression share <= ${percent(profile.maxImpressionShareForScale)}.`,
  };
}

function createMobileConversionInsight({ dashboard, report, profile }) {
  const mobile = report.deviceSplit.find((device) => device.device === 'Mobiel');
  const desktop = report.deviceSplit.find((device) => device.device === 'Desktop');
  if (!mobile || !desktop) return null;

  const conversionGap = desktop.bookingRate - mobile.bookingRate;
  const improvementPoints = Math.min(0.4, Math.max(0.2, conversionGap));
  const expectedBookings = mobile.sessions * (improvementPoints / 100);
  const expectedRevenue = expectedBookings * dashboard.ga4.averageBookingValue;
  const totalSessions = report.metrics.sessions || mobile.sessions + desktop.sessions;
  const mobileShare = totalSessions > 0 ? mobile.sessions / totalSessions : 0;
  const mobileSharePct = mobileShare * 100;
  if (
    mobileSharePct < profile.minMobileSessionShare ||
    conversionGap < profile.minMobileConversionGap
  ) {
    return null;
  }

  return {
    id: 'mobile-price',
    status: report.key === 'year' ? 'Roadmap' : 'Deze week',
    owner: 'Website',
    task:
      report.key === 'year'
        ? 'Maak mobiele prijs- en beschikbaarheidsstap onderdeel van de roadmap'
        : 'Maak prijsindicatie eerder zichtbaar op mobiel',
    expectedValue:
      expectedRevenue > 1000
        ? `+${euro(expectedRevenue)} omzet`
        : `+${percentagePoints(improvementPoints)} conversie`,
    effort: report.key === 'year' ? 'Hoog' : 'Middel',
    reason: `Mobiel is ${percent(mobileShare * 100)} van de sessies, maar converteert ${percentagePoints(desktop.bookingRate - mobile.bookingRate)} lager dan desktop.`,
    formula: `${number(mobile.sessions)} mobiele sessies x ${percentagePoints(improvementPoints)} verbetering x ${euro(dashboard.ga4.averageBookingValue)} boekwaarde = ${euro(expectedRevenue)} potentieel.`,
    sources: ['GA4'],
    confidence: mobileShare > 0.5 ? 'Hoog' : 'Middel',
    impactScore: Math.min(100, (expectedRevenue / Math.max(report.metrics.bookingRevenue, 1)) * 1000),
    urgencyScore: Math.min(100, 58 + conversionGap * 8),
    rule: `Mobiel aandeel >= ${percent(profile.minMobileSessionShare)} en conversiegat >= ${percentagePoints(profile.minMobileConversionGap)}.`,
  };
}

function createSeoInsight({ report, profile }) {
  const opportunity = [...report.contentOpportunities].sort((a, b) => b.demand - a.demand)[0];
  if (!opportunity || opportunity.demand < profile.minSeoDemand) return null;

  const relatedQuery = report.queries.find((query) =>
    opportunity.topic
      .toLowerCase()
      .split(/\s+/)
      .some((term) => term.length > 4 && query.query.toLowerCase().includes(term)),
  );
  const expectedClicks = opportunity.demand * (profile.targetSeoCtr / 100);

  return {
    id: 'seo-content',
    status: report.key === 'year' ? 'Roadmap' : 'Deze week',
    owner: 'SEO',
    task:
      report.key === 'year'
        ? `Bouw SEO-cluster rond ${opportunity.topic.toLowerCase()}`
        : `Publiceer landingspagina voor ${opportunity.topic.toLowerCase()}`,
    expectedValue: `+${number(expectedClicks)} klikken`,
    effort: 'Middel',
    reason: `${number(opportunity.demand)} impressies met ${opportunity.difficulty.toLowerCase()} moeilijkheid${relatedQuery ? `; "${relatedQuery.query}" beweegt ${percent(relatedQuery.movement, 1)}` : ''}.`,
    formula: `${number(opportunity.demand)} impressies x ${percent(profile.targetSeoCtr)} haalbare CTR = ${number(expectedClicks)} extra klikken.`,
    sources: ['Search Console'],
    confidence: opportunity.demand > 10000 ? 'Hoog' : 'Middel',
    impactScore: Math.min(100, (expectedClicks / 1200) * 100),
    urgencyScore: opportunity.difficulty === 'Laag' ? 84 : opportunity.difficulty === 'Middel' ? 66 : 50,
    rule: `SEO-vraag >= ${number(profile.minSeoDemand)} impressies en haalbare CTR ${percent(profile.targetSeoCtr)}.`,
  };
}

function createReturningGuestInsight({ report, profile }) {
  const returning = report.segments.find((segment) => segment.id === 'returning');
  if (!returning || !report.segments.length) return null;

  const averageConversion =
    report.segments.reduce((sum, segment) => sum + segment.conversion, 0) / report.segments.length;
  const expectedBookings = returning.bookings * (profile.returningGuestActivationRate / 100);

  return {
    id: 'crm-returning',
    status: report.key === 'year' ? 'Roadmap' : 'Later',
    owner: 'CRM',
    task:
      report.key === 'year'
        ? 'Bouw lifecycle-campagnes voor terugkerende gasten en vroegboekers'
        : 'Activeer terugkerende gasten met gerichte e-mailcampagne',
    expectedValue: `+${number(expectedBookings)} boekingen`,
    effort: report.key === 'year' ? 'Middel' : 'Laag',
    reason: `Terugkerende gasten converteren ${percent(returning.conversion, 1)} tegenover segmentgemiddelde ${percent(averageConversion, 1)}.`,
    formula: `${number(returning.bookings)} boekingen x ${percent(profile.returningGuestActivationRate)} extra activatie = ${number(expectedBookings)} extra boekingen.`,
    sources: ['GA4', 'Reserveringen'],
    confidence: returning.conversion > averageConversion ? 'Hoog' : 'Middel',
    impactScore: Math.min(100, (expectedBookings / Math.max(report.metrics.bookings, 1)) * 1000),
    urgencyScore: returning.conversion > averageConversion ? 70 : 48,
    rule: `Terugkerende gasten moeten boven segmentgemiddelde converteren; activatie-aanname ${percent(profile.returningGuestActivationRate)}.`,
  };
}

function createAlerts({ report, adsInsight, mobileInsight, seoInsight }) {
  const alerts = [];

  if (adsInsight) {
    alerts.push({
      type: 'Kans',
      title: 'Campagne met budgetruimte gevonden',
      detail: adsInsight.reason,
      owner: 'Ads',
      sources: adsInsight.sources,
    });
  }

  if (mobileInsight) {
    alerts.push({
      type: 'Risico',
      title: 'Mobiele boekingsratio blijft achter',
      detail: mobileInsight.reason,
      owner: 'Website',
      sources: mobileInsight.sources,
    });
  }

  if (seoInsight) {
    alerts.push({
      type: 'Kans',
      title: report.key === 'year' ? 'SEO-cluster kan jaarvraag opbouwen' : 'Nieuwe landingspagina kan zoekvraag vangen',
      detail: seoInsight.reason,
      owner: 'SEO',
      sources: seoInsight.sources,
    });
  }

  return alerts;
}

export function generateInsights({ dashboard, report, profile = FALLBACK_PROFILE }) {
  const decisionProfile = { ...FALLBACK_PROFILE, ...profile };
  const campaigns = report.campaigns ?? [];
  const bestCampaign =
    findBestSearchCampaign(campaigns, decisionProfile) ??
    [...campaigns].filter((campaign) => campaign.roas > 0 || campaign.revenue > 0).sort((a, b) => b.roas - a.roas || b.revenue - a.revenue)[0];
  const matchingQuery = bestCampaign
    ? findMatchingSearchDemand(report.queries, bestCampaign.name)
    : null;

  const adsInsight = createAdsBudgetInsight({
    report,
    campaign: bestCampaign,
    matchingQuery,
    profile: decisionProfile,
  });
  const mobileInsight = createMobileConversionInsight({ dashboard, report, profile: decisionProfile });
  const seoInsight = createSeoInsight({ report, profile: decisionProfile });
  const returningInsight = createReturningGuestInsight({ report, profile: decisionProfile });

  const actionPlan = [adsInsight, mobileInsight, seoInsight, returningInsight]
    .filter(Boolean)
    .map((insight) => scoreInsight(insight, decisionProfile))
    .sort((a, b) => b.score - a.score);
  const alerts = createAlerts({ report, adsInsight, mobileInsight, seoInsight });

  return {
    actionPlan,
    alerts,
    decisionProfile,
  };
}
