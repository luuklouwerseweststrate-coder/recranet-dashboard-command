import { formatMetric } from '../data/dashboardPrototype.js';

const ASSETS = {
  logo: new URL('../assets/recranet-logo.svg', import.meta.url).href,
  hero: new URL('../assets/deck/camping-lake-tent.jpg', import.meta.url).href,
  campfire: new URL('../assets/deck/campfire-lake.jpg', import.meta.url).href,
};

const COLORS = {
  navy: '062238',
  panel: '0B304A',
  cyan: '22B8D8',
  white: 'FFFFFF',
  muted: 'AEC1CB',
  quiet: '78909D',
  line: '26526A',
  orange: 'E08A2E',
  veil: '021725',
};

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const FONT = 'Nunito Sans';
const HEADING_FONT = 'Work Sans';
const X = 0.72;
const W = 11.9;
const assetCache = new Map();

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pct(value, digits = 1) {
  return `${Number(value).toFixed(digits).replace('.', ',')}%`;
}

function clean(value) {
  return String(value).replace('â‚¬', 'EUR ');
}

function text(slide, value, x, y, w, h, options = {}) {
  slide.addText(clean(value), {
    x,
    y,
    w,
    h,
    fontFace: FONT,
    margin: 0,
    fit: 'shrink',
    breakLine: false,
    color: COLORS.white,
    ...options,
  });
}

function rect(slide, x, y, w, h, fill = COLORS.panel, line = fill, options = {}) {
  slide.addShape('rect', {
    x,
    y,
    w,
    h,
    fill: { color: fill, transparency: options.transparency ?? 0 },
    line: { color: line, transparency: options.lineTransparency ?? 0, width: options.lineWidth ?? 0.6 },
  });
}

function line(slide, x1, y1, x2, y2, color = COLORS.line, width = 1) {
  slide.addShape('line', {
    x: x1,
    y: y1,
    w: x2 - x1,
    h: y2 - y1,
    line: { color, width },
  });
}

function blobToDataUri(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function assetData(url) {
  if (assetCache.has(url)) return assetCache.get(url);

  if (typeof window === 'undefined') {
    const importNode = Function('specifier', 'return import(specifier)');
    const [{ readFile }, { fileURLToPath }] = await Promise.all([
      importNode('node:fs/promises'),
      importNode('node:url'),
    ]);
    const buffer = await readFile(fileURLToPath(url));
    const mime = url.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
    const data = `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
    assetCache.set(url, data);
    return data;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Kon asset niet laden: ${url}`);
  const data = await blobToDataUri(await response.blob());
  assetCache.set(url, data);
  return data;
}

async function loadAssets() {
  const entries = await Promise.all(
    Object.entries(ASSETS).map(async ([key, url]) => [key, await assetData(url)]),
  );
  return Object.fromEntries(entries);
}

function imageCover(slide, data, x, y, w, h, altText) {
  slide.addImage({
    data,
    x,
    y,
    w,
    h,
    sizing: { type: 'cover', w, h },
    altText,
  });
}

function logo(slide, assets, x = X, y = 0.36, w = 1.15) {
  slide.addImage({
    data: assets.logo,
    x,
    y,
    w,
    h: w / 2.997,
    altText: 'Recranet logo',
  });
}

function base(slide, ctx, index, options = {}) {
  slide.background = { color: COLORS.navy };
  rect(slide, 0, 0, SLIDE_W, SLIDE_H, COLORS.navy, COLORS.navy);
  rect(slide, 0, 0, SLIDE_W, 0.055, COLORS.cyan, COLORS.cyan);
  if (!options.hideLogo) logo(slide, ctx.assets);

  line(slide, X, 6.92, X + W, 6.92, COLORS.line, 0.7);
  text(slide, 'Recranet rapportage', X, 7.08, 3, 0.13, {
    fontSize: 6.5,
    color: COLORS.quiet,
  });
  text(slide, `${ctx.dashboard.meta.propertyName} - ${ctx.report.period}`, 4.7, 7.08, 3.9, 0.13, {
    fontSize: 6.5,
    color: COLORS.quiet,
    align: 'center',
  });
  text(slide, String(index).padStart(2, '0'), 12.16, 7.05, 0.42, 0.16, {
    fontSize: 7,
    color: COLORS.cyan,
    bold: true,
    align: 'right',
  });
}

function kicker(slide, value, x = X, y = 1.0) {
  text(slide, value.toUpperCase(), x, y, 4.2, 0.16, {
    fontSize: 7.5,
    fontFace: HEADING_FONT,
    bold: true,
    color: COLORS.cyan,
    charSpace: 1.25,
  });
}

function title(slide, kickerText, claim, sub) {
  kicker(slide, kickerText);
  text(slide, claim, X, 1.34, 9.35, 0.6, {
    fontSize: 24,
    fontFace: HEADING_FONT,
    bold: true,
  });
  if (sub) {
    text(slide, sub, X, 2.12, 8.2, 0.34, {
      fontSize: 10.4,
      color: COLORS.muted,
    });
  }
}

function metric(slide, label, value, detail, x, y, w = 1.7) {
  line(slide, x, y, x + w, y, COLORS.cyan, 1.5);
  text(slide, label.toUpperCase(), x, y + 0.18, w, 0.12, {
    fontSize: 6.2,
    fontFace: HEADING_FONT,
    color: COLORS.muted,
    bold: true,
    charSpace: 0.7,
  });
  text(slide, value, x, y + 0.4, w, 0.28, {
    fontSize: 17,
    fontFace: HEADING_FONT,
    color: COLORS.white,
    bold: true,
  });
  text(slide, detail, x, y + 0.76, w, 0.12, {
    fontSize: 6.8,
    color: COLORS.quiet,
  });
}

function bar(slide, label, value, max, valueLabel, x, y, w, color = COLORS.cyan) {
  text(slide, label, x, y - 0.02, 2.7, 0.15, { fontSize: 8, bold: true });
  rect(slide, x + 2.95, y + 0.03, w, 0.12, COLORS.panel, COLORS.panel);
  rect(slide, x + 2.95, y + 0.03, Math.max((value / max) * w, 0.07), 0.12, color, color);
  text(slide, valueLabel, x + 2.95 + w + 0.18, y - 0.01, 1.45, 0.15, {
    fontSize: 7.4,
    color,
    bold: true,
  });
}

function chart(slide, type, data, options) {
  slide.addChart(type, data, {
    showLegend: false,
    showTitle: false,
    showValue: false,
    catAxisLabelColor: COLORS.muted,
    valAxisLabelColor: COLORS.muted,
    catAxisLineColor: COLORS.line,
    valAxisLineColor: COLORS.line,
    catGridLine: { style: 'none' },
    valGridLine: { color: COLORS.line, transparency: 70 },
    chartColors: [COLORS.cyan, COLORS.orange, COLORS.muted],
    showValAxis: false,
    chartArea: { border: { color: COLORS.navy, pt: 0 }, fill: { color: COLORS.navy, transparency: 100 } },
    plotArea: { border: { color: COLORS.navy, pt: 0 }, fill: { color: COLORS.navy, transparency: 100 } },
    ...options,
  });
}

function coverSlide(pptx, ctx) {
  const slide = pptx.addSlide();
  imageCover(slide, ctx.assets.hero, 0, 0, SLIDE_W, SLIDE_H, 'Camping aan het water');
  rect(slide, 0, 0, SLIDE_W, SLIDE_H, COLORS.veil, COLORS.veil, { transparency: 18 });
  rect(slide, 0, 0, 6.2, SLIDE_H, COLORS.navy, COLORS.navy, { transparency: 7 });
  rect(slide, 0, 0, SLIDE_W, 0.055, COLORS.cyan, COLORS.cyan);
  logo(slide, ctx.assets, X, 0.62, 1.42);

  kicker(slide, 'Klantpresentatie', X, 1.58);
  text(slide, ctx.dashboard.meta.propertyName, X, 2.08, 5.6, 0.65, {
    fontSize: 28,
    bold: true,
  });
  text(slide, `Dashboardrapportage - ${ctx.report.period}`, X, 2.96, 4.85, 0.32, {
    fontSize: 15,
    color: COLORS.muted,
    bold: true,
  });
  text(
    slide,
    'Inzichten over omzet, campagnes, organische vraag en het boekingspad. Klaar om met de klant te bespreken.',
    X,
    3.52,
    4.8,
    0.58,
    { fontSize: 10.8, color: COLORS.muted },
  );

  metric(slide, 'Boekomzet', formatMetric(ctx.report.metrics.bookingRevenue, 'currency'), ctx.report.period, X, 5.3, 1.45);
  metric(slide, 'Prognose', formatMetric(ctx.report.metrics.expectedRevenue, 'currency'), ctx.report.forecastLabel, 2.45, 5.3, 1.45);
  metric(slide, 'Boekingen', ctx.report.metrics.bookings, 'online', 4.08, 5.3, 1.2);
}

function summarySlide(pptx, ctx) {
  const slide = pptx.addSlide();
  base(slide, ctx, 2);
  imageCover(slide, ctx.assets.campfire, 8.05, 0.62, 4.25, 5.75, 'Campinggasten bij kampvuur');
  rect(slide, 8.05, 0.62, 4.25, 5.75, COLORS.veil, COLORS.veil, { transparency: 44 });

  title(
    slide,
    'Managementsamenvatting',
    `${ctx.report.period}: de vraag is gezond, maar mobiel houdt omzetgroei tegen.`,
    `Belangrijkste signalen voor De Waschappelse Rups ten opzichte van ${ctx.report.comparison}.`,
  );

  [
    `${formatMetric(ctx.report.metrics.bookingRevenue, 'currency')} boekomzet en ${ctx.report.metrics.bookings} online boekingen in ${ctx.report.period.toLowerCase()}.`,
    `Google Ads draait rendabel met ${formatMetric(ctx.report.metrics.roas, 'ratio')} ROAS; budgetruimte zit vooral in de Walcheren-campagne.`,
    `Mobiel levert veel verkeer, maar converteert lager dan desktop. Daar zit de snelste verbetering.`,
  ].forEach((insight, index) => {
    text(slide, `0${index + 1}`, X, 3.28 + index * 0.58, 0.42, 0.15, {
      fontSize: 9,
      bold: true,
      color: index === 0 ? COLORS.cyan : COLORS.quiet,
    });
    text(slide, insight, X + 0.62, 3.25 + index * 0.58, 5.85, 0.22, {
      fontSize: 10.5,
      bold: true,
    });
  });
}

function revenueSlide(pptx, ctx) {
  const slide = pptx.addSlide();
  base(slide, ctx, 3);
  title(
    slide,
    'Omzet en prognose',
    `${formatMetric(ctx.report.metrics.bookingRevenue, 'currency')} gerealiseerd, prognose naar ${formatMetric(ctx.report.metrics.expectedRevenue, 'currency')}.`,
    `De prognose volgt de gekozen periode en scenario ${ctx.report.scenario}.`,
  );

  chart(
    slide,
    'line',
    [{ name: 'Prognose', labels: ctx.report.forecast.map((item) => item.label), values: ctx.report.forecast.map((item) => item.revenue) }],
    {
      x: X,
      y: 2.85,
      w: 7.0,
      h: 2.7,
      lineSize: 3,
      lineDataSymbol: 'circle',
      lineDataSymbolSize: 7,
      valAxisHidden: true,
      catAxisLabelFontSize: 8,
      chartColors: [COLORS.cyan],
    },
  );

  metric(slide, 'Prognose', formatMetric(ctx.report.metrics.expectedRevenue, 'currency'), ctx.report.forecastLabel, 8.55, 3.0, 1.95);
  metric(slide, 'Online boekingen', ctx.report.metrics.expectedBookings, 'verwacht', 8.55, 4.25, 1.95);
}

function adsSlide(pptx, ctx) {
  const slide = pptx.addSlide();
  base(slide, ctx, 4);
  title(
    slide,
    'Google Ads',
    `Betaalde zoekvraag levert ${formatMetric(ctx.report.metrics.adsRevenue, 'currency')} omzet op bij ${formatMetric(ctx.report.metrics.roas, 'ratio')} ROAS.`,
    'De klantvraag zit vooral op Walcheren en aan zee; daar is opschalen verdedigbaar.',
  );

  const campaigns = ctx.report.campaigns.slice(0, 4);
  const max = Math.max(...campaigns.map((campaign) => campaign.revenue));
  campaigns.forEach((campaign, index) => {
    bar(
      slide,
      campaign.name.replace('Search - ', '').replace('Performance Max - ', 'PMax - '),
      campaign.revenue,
      max,
      `${formatMetric(campaign.revenue, 'currency')} - ${formatMetric(campaign.roas, 'ratio')}`,
      X,
      3.0 + index * 0.45,
      3.25,
      index === 0 ? COLORS.cyan : COLORS.muted,
    );
  });

  rect(slide, 8.0, 2.92, 3.9, 2.65, COLORS.panel, COLORS.line);
  text(slide, 'Campagneadvies', 8.32, 3.24, 1.3, 0.14, {
    fontSize: 7.5,
    color: COLORS.cyan,
    bold: true,
  });
  text(slide, campaigns[0].advice, 8.32, 3.66, 2.85, 0.56, {
    fontSize: 10,
    bold: true,
  });
  text(slide, `${formatMetric(ctx.report.metrics.adSpend, 'currency')} advertentiekosten in ${ctx.report.period.toLowerCase()}.`, 8.32, 4.72, 2.8, 0.2, {
    fontSize: 8,
    color: COLORS.muted,
  });
}

function seoSlide(pptx, ctx) {
  const slide = pptx.addSlide();
  base(slide, ctx, 5);
  title(
    slide,
    'Organische vraag',
    'Search Console laat zien welke zoekvragen nu boekingskans worden.',
    'SEO wordt hiermee geen rankingrapport, maar een lijst met concrete content- en boekingskansen.',
  );

  text(slide, 'Top zoekvragen', X, 2.95, 1.4, 0.18, {
    fontSize: 8,
    color: COLORS.cyan,
    bold: true,
  });
  ctx.report.queries.slice(0, 4).forEach((query, index) => {
    const y = 3.34 + index * 0.48;
    text(slide, query.query, X, y, 3.2, 0.16, { fontSize: 9.4, bold: true });
    text(slide, `${formatMetric(query.clicks, 'number')} klikken - positie ${String(query.position).replace('.', ',')}`, 4.1, y, 2.25, 0.15, {
      fontSize: 7.8,
      color: COLORS.muted,
    });
    line(slide, X, y + 0.31, 6.5, y + 0.31, COLORS.line, 0.45);
  });

  rect(slide, 7.45, 2.95, 4.25, 2.45, COLORS.panel, COLORS.line);
  text(slide, 'Contentkansen', 7.78, 3.22, 1.3, 0.16, {
    fontSize: 8,
    color: COLORS.cyan,
    bold: true,
  });
  ctx.report.contentOpportunities.slice(0, 3).forEach((item, index) => {
    text(slide, item.topic, 7.78, 3.64 + index * 0.48, 2.5, 0.16, {
      fontSize: 9,
      bold: true,
    });
    text(slide, `${formatMetric(item.demand, 'number')} impressies`, 10.12, 3.65 + index * 0.48, 1.25, 0.14, {
      fontSize: 7.2,
      color: COLORS.muted,
      align: 'right',
    });
  });
}

function conversionSlide(pptx, ctx) {
  const slide = pptx.addSlide();
  base(slide, ctx, 6);
  title(
    slide,
    'Boekingspad',
    'Mobiel levert veel sessies, maar converteert lager dan desktop.',
    'Hier zit een concreet verbeterpunt: eerder prijs en beschikbaarheid tonen.',
  );

  const funnel = ctx.dashboard.ga4.funnel;
  const max = Math.max(...funnel.map((step) => step.rate));
  funnel.forEach((step, index) => {
    bar(
      slide,
      step.step,
      step.rate,
      max,
      `${formatMetric(step.count, 'number')} - ${pct(step.rate)}`,
      X,
      2.95 + index * 0.45,
      3.35,
      index > 2 ? COLORS.orange : COLORS.cyan,
    );
  });

  const mobile = ctx.dashboard.ga4.deviceSplit.find((device) => device.device === 'Mobiel');
  const desktop = ctx.dashboard.ga4.deviceSplit.find((device) => device.device === 'Desktop');
  imageCover(slide, ctx.assets.campfire, 8.2, 2.85, 3.65, 2.65, 'Camping sfeerbeeld');
  rect(slide, 8.2, 2.85, 3.65, 2.65, COLORS.veil, COLORS.veil, { transparency: 38 });
  text(slide, 'Mobiel', 8.52, 3.18, 0.9, 0.16, { fontSize: 9, bold: true });
  text(slide, pct(mobile.bookingRate), 8.52, 3.55, 1.1, 0.32, { fontSize: 23, bold: true, color: COLORS.orange });
  text(slide, 'Desktop', 10.15, 3.18, 1.0, 0.16, { fontSize: 9, bold: true });
  text(slide, pct(desktop.bookingRate), 10.15, 3.55, 1.1, 0.32, { fontSize: 23, bold: true, color: COLORS.cyan });
  text(slide, 'Actie: prijsindicatie eerder zichtbaar maken op mobiel.', 8.52, 4.52, 2.55, 0.28, {
    fontSize: 9.3,
    bold: true,
  });
}

function actionSlide(pptx, ctx) {
  const slide = pptx.addSlide();
  base(slide, ctx, 7);
  imageCover(slide, ctx.assets.hero, 8.25, 0.9, 4.0, 5.45, 'Camping aan het water');
  rect(slide, 8.25, 0.9, 4.0, 5.45, COLORS.veil, COLORS.veil, { transparency: 46 });
  title(
    slide,
    'Actieplan',
    `Aanbevolen acties voor ${ctx.report.actionWindow}.`,
    'Elke actie is gekoppeld aan eigenaar, inspanning en verwachte waarde.',
  );

  ctx.report.actionPlan.slice(0, 3).forEach((action, index) => {
    const y = 2.88 + index * 1.02;
    text(slide, `0${index + 1}`, X, y, 0.48, 0.18, {
      fontSize: 12,
      bold: true,
      color: index === 0 ? COLORS.cyan : COLORS.quiet,
    });
    text(slide, action.task, X + 0.7, y, 5.35, 0.18, {
      fontSize: 10.8,
      bold: true,
    });
    text(slide, `${action.owner} - ${action.effort} werk - ${clean(action.expectedValue)}`, X + 0.7, y + 0.3, 4.9, 0.14, {
      fontSize: 7.8,
      color: COLORS.muted,
    });
    if (action.reason) {
      text(slide, clean(action.reason), X + 0.7, y + 0.54, 5.2, 0.2, {
        fontSize: 7.3,
        color: COLORS.muted,
      });
    }
    line(slide, X, y + 0.78, X + 6.3, y + 0.78, COLORS.line, 0.6);
  });

  text(slide, 'Dashboardlink', 8.62, 5.0, 1.2, 0.14, { fontSize: 7.5, color: COLORS.cyan, bold: true });
  text(slide, 'localhost:5173/dashboard', 8.62, 5.34, 2.15, 0.14, { fontSize: 8, color: COLORS.white, bold: true });
}

function startDeck(pptxgen) {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Recranet';
  pptx.company = 'Recranet';
  pptx.subject = 'Dashboardrapportage klantpresentatie';
  pptx.theme = {
    headFontFace: HEADING_FONT,
    bodyFontFace: FONT,
    lang: 'nl-NL',
  };
  pptx.defineLayout({ name: 'LAYOUT_WIDE', width: SLIDE_W, height: SLIDE_H });
  return pptx;
}

export async function exportDashboardPresentation({ dashboard, report, scenarioLabel }) {
  const [{ default: pptxgen }, assets] = await Promise.all([import('pptxgenjs'), loadAssets()]);
  const pptx = startDeck(pptxgen);
  const ctx = { dashboard, report: { ...report, scenario: scenarioLabel }, assets };

  coverSlide(pptx, ctx);
  summarySlide(pptx, ctx);
  revenueSlide(pptx, ctx);
  adsSlide(pptx, ctx);
  seoSlide(pptx, ctx);
  conversionSlide(pptx, ctx);
  actionSlide(pptx, ctx);

  const fileName = `recranet-klantpresentatie-${slugify(dashboard.meta.propertyName)}-${slugify(report.period)}.pptx`;
  await pptx.writeFile({ fileName, compression: true });
  return fileName;
}
