import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Download,
  Eye,
  KeyRound,
  Link2,
  Lock,
  LogOut,
  ListFilter,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { dashboardPrototype, formatDelta, formatMetric } from './data/dashboardPrototype.js';
import { clientRegistry } from './data/clientRegistry.js';
import recranetLogoUrl from './assets/recranet-logo.svg';
import { exportDashboardPresentation } from './utils/exportPresentation.js';
import { apiFetch } from './utils/apiClient.js';
import { createReportingContext, periodOptions } from './utils/reportingContext.js';

const tabs = [
  { id: 'overview', label: 'Overzicht' },
  { id: 'campaigns', label: 'Campagnes' },
  { id: 'seo', label: 'SEO' },
  { id: 'booking', label: 'Boekingspad' },
  { id: 'management', label: 'Beheer' },
];

const tabContext = {
  overview: {
    label: 'Klantdashboard',
    title: 'Overzicht',
    description: 'De belangrijkste ontwikkeling, kansen en aandachtspunten in één beeld.',
  },
  campaigns: {
    label: 'Kanaalprestatie',
    title: 'Campagnes',
    description: 'Campagneprestaties, budgetverloop en rendement per kanaal.',
  },
  seo: {
    label: 'Organische groei',
    title: 'SEO',
    description: 'Zoekvragen, pagina’s en groeikansen uit organisch verkeer.',
  },
  booking: {
    label: 'Conversie',
    title: 'Boekingspad',
    description: 'Waar bezoekers afhaken en waar conversieverbetering mogelijk is.',
  },
};

const scenarioOptions = {
  base: { label: 'Basis', revenue: 1, bookings: 1 },
  ads: { label: 'Ads +20%', revenue: 1.08, bookings: 1.06 },
  conversion: { label: 'Conversie +0,4 pp', revenue: 1.12, bookings: 1.1 },
};

const ADMIN_PASSWORD = 'beheer2026';
const CLIENT_PASSWORD = 'klant2026';
const CLIENT_STORAGE_KEY = 'recranet.dashboard.clients';
const AUTH_STORAGE_KEY = 'recranet.dashboard.auth';

const connectorBlueprints = [
  { id: 'google-ads', label: 'Google Ads', fields: ['customerId', 'conversionAction'] },
  { id: 'search-console', label: 'Search Console', fields: ['siteUrl'] },
  { id: 'ga4', label: 'GA4', fields: ['propertyId', 'purchaseEvent'] },
  { id: 'recranet', label: 'Recranet Booking', fields: ['tenantId', 'bookingApiStatus'] },
];

function loadClients() {
  if (typeof window === 'undefined') return clientRegistry;

  try {
    const stored = window.localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!stored) return clientRegistry;
    const storedClients = JSON.parse(stored);
    const missingClients = clientRegistry.filter(
      (seedClient) => !storedClients.some((client) => client.id === seedClient.id),
    );
    return [...storedClients, ...missingClients];
  } catch {
    return clientRegistry;
  }
}

function saveClients(clients) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clients));
}

function emptyClient() {
  return {
    id: `client-${Date.now()}`,
    slug: '',
    name: '',
    type: 'Camping',
    status: 'Setup',
    owner: 'Account',
    dashboardUrl: 'http://localhost:5173/',
    lastReportAt: 'Nog niet verzonden',
    health: 55,
    dataScale: 1,
    connectors: connectorBlueprints.map((connector) => ({
      id: connector.id,
      label: connector.label,
      status: 'Ontbreekt',
      detail: 'Nog niet gekoppeld',
      config: {},
    })),
    decisionProfile: clientRegistry[0].decisionProfile,
  };
}

function RecranetLogo() {
  return <img alt="Recranet" className="recranet-logo" src={recranetLogoUrl} />;
}

function GlobalLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: password }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError('Geen toegang met deze code.');
        return;
      }

      onLogin({
        role: payload.user.role,
        label: payload.user.role === 'admin' ? 'Beheerder' : 'Klant',
        user: payload.user,
      });
    } catch {
      setError('Backend niet bereikbaar. Start eerst npm run dev:full of node server/server.js.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <RecranetLogo />
        <div className="admin-lock">
          <Lock size={22} />
        </div>
        <span className="eyebrow">Beveiligde omgeving</span>
        <h1>Inloggen vereist</h1>
        <p>
          Dashboardrapporten, klantdata, koppelingen en beheerinstellingen zijn alleen
          toegankelijk na login.
        </p>
        <form onSubmit={submitLogin}>
          <label>
            Toegangscode
            <input
              autoComplete="current-password"
              autoFocus
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          {error ? <small>{error}</small> : null}
          <button disabled={isSubmitting} type="submit">
            <KeyRound size={16} />
            {isSubmitting ? 'Inloggen' : 'Inloggen'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Delta({ value }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`delta ${isPositive ? 'delta-positive' : 'delta-negative'}`}>
      <Icon size={14} />
      {formatDelta(value)}
    </span>
  );
}

function SourceBadge({ source }) {
  return <span className="source-badge">{source}</span>;
}

function cloneDashboardForClient(sourceDashboard, client) {
  const next = JSON.parse(JSON.stringify(sourceDashboard));
  const scale = client.dataScale ?? 1;

  next.meta.propertyName = client.name;
  next.meta.mode = client.status;
  next.meta.clientSlug = client.slug;
  next.decisionProfile = client.decisionProfile;
  next.kpis = next.kpis.map((item) =>
    ['currency', 'number'].includes(item.format)
      ? { ...item, value: Math.round(item.value * scale) }
      : item,
  );
  next.googleAds.cost = Math.round(next.googleAds.cost * scale);
  next.googleAds.revenue = Math.round(next.googleAds.revenue * scale);
  next.googleAds.bookings = Math.round(next.googleAds.bookings * scale);
  next.googleAds.campaigns = next.googleAds.campaigns.map((campaign) => ({
    ...campaign,
    cost: Math.round(campaign.cost * scale),
    revenue: Math.round(campaign.revenue * scale),
    bookings: Math.max(1, Math.round(campaign.bookings * scale)),
  }));
  next.searchConsole.clicks = Math.round(next.searchConsole.clicks * scale);
  next.searchConsole.impressions = Math.round(next.searchConsole.impressions * scale);
  next.searchConsole.queries = next.searchConsole.queries.map((query) => ({
    ...query,
    clicks: Math.round(query.clicks * scale),
    impressions: Math.round(query.impressions * scale),
  }));
  next.ga4.sessions = Math.round(next.ga4.sessions * scale);
  next.ga4.users = Math.round(next.ga4.users * scale);
  next.ga4.bookings = Math.round(next.ga4.bookings * scale);
  next.ga4.bookingRevenue = Math.round(next.ga4.bookingRevenue * scale);
  next.ga4.sourceSplit = next.ga4.sourceSplit.map((channel) => ({
    ...channel,
    sessions: Math.round(channel.sessions * scale),
    bookings: Math.max(1, Math.round(channel.bookings * scale)),
    revenue: Math.round(channel.revenue * scale),
  }));
  next.segments = next.segments.map((segment) => ({
    ...segment,
    revenue: Math.round(segment.revenue * scale),
    bookings: Math.max(1, Math.round(segment.bookings * scale)),
  }));

  return next;
}

function applyLiveSnapshotToDashboard(dashboard, snapshot) {
  if (!snapshot?.ok) return dashboard;

  const next = JSON.parse(JSON.stringify(dashboard));
  const queries = snapshot.searchConsole?.queries ?? [];
  const pages = snapshot.searchConsole?.pages ?? [];
  const totals = snapshot.searchConsole?.totals ?? {};
  const internalSearches = snapshot.ga4?.internalSearches ?? [];
  const totalInternalSearches = snapshot.ga4?.totalInternalSearches ?? 0;

  next.meta.updatedAt = new Date().toLocaleString('nl-NL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  next.meta.mode = 'Live Google data';
  next.sources = next.sources.map((source) => {
    if (source.id === 'google-ads') {
      return {
        ...source,
        status: 'ontbreekt',
        freshness: 'niet gekoppeld voor deze klant',
      };
    }
    if (source.id === 'search-console') {
      return {
        ...source,
        status: 'live',
        freshness: `${formatMetric(totals.clicks ?? 0, 'number')} klikken uit Search Console`,
      };
    }
    if (source.id === 'ga4') {
      return {
        ...source,
        status: 'live',
        freshness: `${formatMetric(totalInternalSearches, 'number')} interne zoekopdrachten`,
      };
    }
    return source;
  });

  next.searchConsole.clicks = totals.clicks ?? next.searchConsole.clicks;
  next.searchConsole.impressions = totals.impressions ?? next.searchConsole.impressions;
  next.searchConsole.ctr =
    totals.impressions > 0 ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0;
  next.searchConsole.position =
    queries.length > 0
      ? Number((queries.reduce((sum, query) => sum + query.position, 0) / queries.length).toFixed(1))
      : next.searchConsole.position;
  next.searchConsole.queries = queries.slice(0, 12).map((query, index) => ({
    query: query.query,
    clicks: query.clicks,
    impressions: query.impressions,
    ctr: query.ctr,
    position: query.position,
    movement: index < 3 ? 2.4 - index * 0.5 : 0,
  }));
  next.searchConsole.pages = pages.slice(0, 8).map((page) => ({
    path: page.page.replace('https://weststrate.nl', '') || '/',
    clicks: page.clicks,
    ctr: page.ctr,
    position: page.position,
  }));
  next.searchConsole.contentOpportunities = pages
    .filter((page) => page.impressions >= 1000 && page.ctr < 1)
    .slice(0, 4)
    .map((page) => ({
      topic: page.page
        .replace('https://weststrate.nl/', '')
        .replace(/[-_/]+/g, ' ')
        .slice(0, 44) || 'Homepage',
      demand: page.impressions,
      difficulty: page.position > 15 ? 'Hoog' : page.position > 8 ? 'Middel' : 'Laag',
      targetPage: page.page.replace('https://weststrate.nl', '') || '/',
      impact: `${formatMetric(page.impressions, 'number')} impressies met ${formatMetric(page.ctr, 'percent')} CTR.`,
    }));

  next.ga4.sessions = Math.max(totalInternalSearches * 2, next.ga4.sessions);
  next.ga4.users = Math.max(Math.round(totalInternalSearches * 1.4), next.ga4.users);
  next.ga4.bookingRevenue = 0;
  next.ga4.bookings = 0;
  next.googleAds.cost = 0;
  next.googleAds.revenue = 0;
  next.googleAds.bookings = 0;
  next.googleAds.roas = 0;
  next.googleAds.impressionShare = 0;
  next.googleAds.campaigns = [
    {
      name: 'Google Ads niet gekoppeld',
      cost: 0,
      revenue: 0,
      bookings: 0,
      roas: 0,
      cvr: 0,
      advice: 'Google Ads staat voor deze Weststrate-test bewust uit.',
    },
  ];
  next.ga4.sourceSplit = [
    {
      channel: 'Organic Search',
      sessions: Math.max(totalInternalSearches, 1),
      bookings: 0,
      revenue: 0,
    },
    {
      channel: 'Site search',
      sessions: Math.max(totalInternalSearches, 1),
      bookings: 0,
      revenue: 0,
    },
  ];
  next.segments = internalSearches.slice(0, 4).map((item, index) => ({
    id: `search-${index}`,
    label: item.term,
    revenue: 0,
    bookings: item.count,
    conversion: 0,
    roas: 0,
    note: `${formatMetric(item.count, 'number')} interne zoekopdrachten in GA4.`,
  }));

  return next;
}

function HeaderDropdown({ icon, label, value, options, onChange, meta }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options[value];

  function selectOption(id) {
    onChange(id);
    setIsOpen(false);
  }

  return (
    <div
      className={`header-dropdown ${icon ? 'has-icon' : 'no-icon'}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        aria-expanded={isOpen}
        className="header-dropdown-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {icon}
        <span>
          <small>{label}</small>
          <strong>{selected.label}</strong>
          {meta ? <em>{meta}</em> : null}
        </span>
        <ChevronDown size={15} />
      </button>
      {isOpen ? (
        <div className="header-dropdown-menu" role="menu">
          {Object.entries(options).map(([id, option]) => (
            <button
              className={id === value ? 'is-selected' : ''}
              key={id}
              onClick={() => selectOption(id)}
              role="menuitemradio"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Panel({ title, label, source, children, className = '' }) {
  return (
    <article className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <span>{label}</span>
          <h2>{title}</h2>
        </div>
        {source ? <SourceBadge source={source} /> : null}
      </div>
      {children}
    </article>
  );
}

function KpiCard({ item }) {
  return (
    <article className={`metric-card tone-${item.tone}`}>
      <div className="metric-card-top">
        <span>{item.source}</span>
        <Delta value={item.delta} />
      </div>
      <strong>{formatMetric(item.value, item.format)}</strong>
      <p>{item.label}</p>
    </article>
  );
}

function SummaryMetric({ label, value, detail }) {
  return (
    <div className="summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function CommandSummary({ dashboard, report }) {
  const primaryActions = report.actionPlan.slice(0, 2);

  return (
    <section className="command-summary" aria-label="Dashboard samenvatting">
      <article className="summary-panel">
        <div className="summary-copy">
          <span>Samenvatting</span>
          <h2>
            {report.period}: directe boekingen ontwikkelen positief, maar mobiel remt conversie.
          </h2>
          <p>
            De rapportage bundelt omzet, campagnes, organische vraag en boekingspad tot
            concrete klantinzichten voor {dashboard.meta.propertyName}.
          </p>
        </div>

        <div className="summary-metrics">
          <SummaryMetric
            label="Boekomzet"
            value={formatMetric(report.metrics.bookingRevenue, 'currency')}
            detail={report.period.toLowerCase()}
          />
          <SummaryMetric
            label="Prognose"
            value={formatMetric(report.metrics.expectedRevenue, 'currency')}
            detail={report.forecastLabel}
          />
          <SummaryMetric
            label="ROAS"
            value={formatMetric(report.metrics.roas, 'ratio')}
            detail="Google Ads"
          />
          <SummaryMetric
            label="Boekingen"
            value={report.metrics.bookings}
            detail="online"
          />
        </div>
      </article>

      <article className="next-panel">
        <span>Prioriteiten</span>
        <h2>Aanbevolen acties</h2>
        <div className="next-actions">
          {primaryActions.map((action) => (
            <div key={action.id}>
              <b>{action.owner}</b>
              <strong>{action.task}</strong>
              <small>{action.expectedValue} - {action.effort} werk</small>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function TrendChart({ data, forecast = [] }) {
  const [activePoint, setActivePoint] = useState(null);
  const currentRevenue = forecast[0]?.revenue ?? data.reduce((total, item) => total + item.revenue, 0);
  const historicalRatios = [0.52, 0.59, 0.64, 0.72, 0.83, 0.93, 1];
  const historicalData = data.map((item, index) => ({
    label: item.label,
    revenue: currentRevenue * (historicalRatios[index] ?? 1),
    bookings: item.bookings ?? 0,
    type: 'Historie',
  }));
  const chartData = [
    ...historicalData,
    ...forecast.slice(1).map((item) => ({ ...item, type: 'Prognose' })),
  ];
  const max = Math.max(...chartData.map((item) => item.revenue));
  const points = chartData
    .map((item, index) => {
      const x = 24 + index * (352 / (chartData.length - 1));
      const y = 148 - (item.revenue / max) * 110;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="trend-chart" aria-label="Omzettrend met prognose">
      <svg viewBox="0 0 400 170" role="img">
        <polyline className="trend-grid" points="24,148 376,148" />
        <polyline className="trend-grid" points="24,94 376,94" />
        <polyline className="trend-grid" points="24,40 376,40" />
        <polyline className="trend-line" points={points} />
        {chartData.map((item, index) => {
          const x = 24 + index * (352 / (chartData.length - 1));
          const y = 148 - (item.revenue / max) * 110;
          const point = { ...item, index, x, y };
          return (
            <g key={`${item.label}-${index}`}>
              <circle
                className={`trend-hit-area ${index >= data.length ? 'forecast-dot' : ''}`}
                cx={x}
                cy={y}
                onBlur={() => setActivePoint(null)}
                onFocus={() => setActivePoint(point)}
                onMouseEnter={() => setActivePoint(point)}
                onMouseLeave={() => setActivePoint(null)}
                r="13"
                tabIndex="0"
              />
              <circle
                className={index >= data.length ? 'forecast-dot' : ''}
                cx={x}
                cy={y}
                r={activePoint?.index === index ? '6' : '4'}
              />
            </g>
          );
        })}
      </svg>
      {activePoint ? (
        <div
          className="trend-tooltip"
          style={{
            left: `${(activePoint.x / 400) * 100}%`,
            top: `${(activePoint.y / 170) * 100}%`,
          }}
        >
          <span>{activePoint.type}</span>
          <strong>{activePoint.label}</strong>
          <b>{formatMetric(activePoint.revenue, 'currency')}</b>
          <small>{formatMetric(activePoint.bookings ?? 0, 'number')} boekingen</small>
        </div>
      ) : null}
      <div className="trend-labels">
        {chartData.map((item, index) => (
          <span key={`${item.label}-${index}`}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function CampaignTable({ campaigns }) {
  const [sortKey, setSortKey] = useState('roas');
  const sortedCampaigns = [...campaigns].sort((a, b) => b[sortKey] - a[sortKey]);

  return (
    <>
      <div className="table-toolbar">
        <label>
          Sorteer op
          <span>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
              <option value="roas">ROAS</option>
              <option value="revenue">Omzet</option>
              <option value="bookings">Boekingen</option>
              <option value="cvr">Conversie</option>
            </select>
            <ChevronDown size={15} />
          </span>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Campagne</th>
              <th>Kosten</th>
              <th>Omzet</th>
              <th>Boekingen</th>
              <th>ROAS</th>
              <th>Advies</th>
            </tr>
          </thead>
          <tbody>
            {sortedCampaigns.map((campaign) => (
              <tr key={campaign.name}>
                <td>
                  <strong>{campaign.name}</strong>
                </td>
                <td>{formatMetric(campaign.cost, 'currency')}</td>
                <td>{formatMetric(campaign.revenue, 'currency')}</td>
                <td>{formatMetric(campaign.bookings, 'number')}</td>
                <td>
                  <b>{formatMetric(campaign.roas, 'ratio')}</b>
                </td>
                <td>{campaign.advice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function QueryList({ queries }) {
  const [queryFilter, setQueryFilter] = useState('');
  const filteredQueries = queries.filter((query) =>
    query.query.toLowerCase().includes(queryFilter.toLowerCase()),
  );

  return (
    <div className="stack">
      <div className="search-field">
        <Search size={16} />
        <input
          value={queryFilter}
          onChange={(event) => setQueryFilter(event.target.value)}
          placeholder="Zoek zoekvraag"
          aria-label="Zoek zoekvraag"
        />
      </div>
      <div className="query-list">
        {filteredQueries.map((query) => (
          <article className="query-row" key={query.query}>
            <div>
              <strong>{query.query}</strong>
              <span>
                {formatMetric(query.clicks, 'number')} klikken - positie{' '}
                {query.position.toString().replace('.', ',')}
              </span>
            </div>
            <Delta value={query.movement} />
          </article>
        ))}
      </div>
    </div>
  );
}

function Funnel({ steps }) {
  return (
    <div className="funnel">
      {steps.map((step) => (
        <div className="funnel-row" key={step.step}>
          <div className="funnel-meta">
            <span>{step.step}</span>
            <strong>{formatMetric(step.count, 'number')}</strong>
          </div>
          <div className="funnel-bar">
            <span style={{ width: `${Math.max(step.rate, 4)}%` }} />
          </div>
          <small>{step.rate.toString().replace('.', ',')}%</small>
        </div>
      ))}
    </div>
  );
}

function SourceSplit({ channels }) {
  const max = Math.max(...channels.map((channel) => channel.revenue));

  return (
    <div className="source-split">
      {channels.map((channel) => (
        <article className="channel-row" key={channel.channel}>
          <div>
            <strong>{channel.channel}</strong>
            <span>
              {formatMetric(channel.sessions, 'number')} sessies -{' '}
              {formatMetric(channel.bookings, 'number')} boekingen
            </span>
          </div>
          <div className="channel-bar">
            <span style={{ width: `${(channel.revenue / max) * 100}%` }} />
          </div>
          <b>{formatMetric(channel.revenue, 'currency')}</b>
        </article>
      ))}
    </div>
  );
}

function SegmentGrid({ segments, selectedSegment, onSelectSegment }) {
  return (
    <div className="segment-grid">
      {segments.map((segment) => (
        <button
          className={`segment-card ${selectedSegment === segment.id ? 'is-active' : ''}`}
          key={segment.id}
          onClick={() => onSelectSegment(segment.id)}
          type="button"
        >
          <span>{segment.label}</span>
          <strong>{formatMetric(segment.revenue, 'currency')}</strong>
          <small>
            {segment.bookings} boekingen - {formatMetric(segment.conversion, 'percent')}
          </small>
          <p>{segment.note}</p>
        </button>
      ))}
    </div>
  );
}

function ActionBoard({ actions }) {
  const [completed, setCompleted] = useState([]);

  function toggleAction(id) {
    setCompleted((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="action-board">
      {actions.map((action) => {
        const isCompleted = completed.includes(action.id);

        return (
          <button
            className={`action-row ${isCompleted ? 'is-complete' : ''}`}
            key={action.id}
            onClick={() => toggleAction(action.id)}
            title={action.formula}
            type="button"
          >
            <span className="status-pill">{isCompleted ? 'Gedaan' : action.status}</span>
            <div>
              <strong>{action.task}</strong>
              <small>
                {action.owner} - {action.effort} werk - {action.expectedValue}
              </small>
              {action.reason ? <p className="action-reason">{action.reason}</p> : null}
            </div>
            <ClipboardCheck size={18} />
          </button>
        );
      })}
    </div>
  );
}

function AvailabilityTable({ availability }) {
  return (
    <div className="availability-list">
      {availability.map((item) => (
        <article key={item.week}>
          <div>
            <strong>{item.week}</strong>
            <span>{item.risk}</span>
          </div>
          <b>{item.pitches}</b>
          <b>{item.rentals}</b>
          <span className={`demand demand-${item.demand.toLowerCase().replace(' ', '-')}`}>
            {item.demand}
          </span>
        </article>
      ))}
    </div>
  );
}

function TrustStrip({ auth, liveSnapshotState, selectedClient }) {
  const syncLabel =
    liveSnapshotState.clientId === selectedClient.id && liveSnapshotState.snapshot
      ? liveSnapshotState.message
      : 'Laatste server-snapshot wordt automatisch geladen';

  return (
    <section className="trust-strip" aria-label="Dataveiligheid en bronstatus">
      <article>
        <ShieldCheck size={17} />
        <div>
          <span>Toegang</span>
          <strong>{auth.role === 'admin' ? 'Beheerder' : 'Klant'} sessie actief</strong>
        </div>
      </article>
      <article>
        <Lock size={17} />
        <div>
          <span>Tokens</span>
          <strong>Server-side, niet in de browser</strong>
        </div>
      </article>
      <article>
        <Link2 size={17} />
        <div>
          <span>Bronnen</span>
          <strong>{syncLabel}</strong>
        </div>
      </article>
    </section>
  );
}

function ManagementCenter({
  clients,
  liveSnapshotState,
  onFetchLiveSnapshot,
  onOpenDashboard,
  onSelectClient,
  selectedClient,
}) {
  const connectorIssues = clients.reduce(
    (total, client) =>
      total + client.connectors.filter((connector) => connector.status !== 'Verbonden').length,
    0,
  );
  const activeClients = clients.filter((client) =>
    ['Actief', 'Monitoring'].includes(client.status),
  ).length;
  const averageHealth = Math.round(
    clients.reduce((total, client) => total + client.health, 0) / Math.max(clients.length, 1),
  );

  return (
    <section className="portfolio-center" aria-label="Beheer overzicht">
      <div className="portfolio-summary">
        <article>
          <Building2 size={18} />
          <span>Klanten</span>
          <strong>{clients.length}</strong>
        </article>
        <article>
          <ShieldCheck size={18} />
          <span>Actief</span>
          <strong>{activeClients}</strong>
        </article>
        <article>
          <Link2 size={18} />
          <span>Koppelingen aandacht</span>
          <strong>{connectorIssues}</strong>
        </article>
        <article>
          <SlidersHorizontal size={18} />
          <span>Gem. datakwaliteit</span>
          <strong>{averageHealth}%</strong>
        </article>
      </div>

      <Panel label="Portfolio" title="Campings en parken">
        <div className="portfolio-table">
          <table>
            <thead>
              <tr>
                <th>Klant</th>
                <th>Status</th>
                <th>Datakwaliteit</th>
                <th>Koppelingen</th>
                <th>Laatste rapport</th>
                <th>Actie</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const missing = client.connectors.filter(
                  (connector) => connector.status !== 'Verbonden',
                );

                return (
                  <tr
                    className={client.id === selectedClient.id ? 'is-selected' : ''}
                    key={client.id}
                  >
                    <td>
                      <strong>{client.name}</strong>
                      <span>{client.type} - {client.owner}</span>
                    </td>
                    <td>
                      <span className={`connector-status status-${client.status.toLowerCase()}`}>
                        {client.status}
                      </span>
                    </td>
                    <td>
                      <b>{client.health}%</b>
                    </td>
                    <td>
                      {missing.length === 0 ? (
                        <span className="table-muted">Alles verbonden</span>
                      ) : (
                        <span className="table-warning">{missing.length} aandachtspunt(en)</span>
                      )}
                    </td>
                    <td>{client.lastReportAt}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => onSelectClient(client.id)} type="button">
                          Config
                        </button>
                        <button
                          onClick={() => {
                            onSelectClient(client.id);
                            onOpenDashboard();
                          }}
                          type="button"
                        >
                          Dashboard
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <section className="selected-client-strip">
        <Panel label="Geselecteerd" title={selectedClient.name}>
          <div className="connector-grid compact">
            {selectedClient.connectors.map((connector) => (
              <article className="connector-card" key={connector.id}>
                <div>
                  <Link2 size={17} />
                  <strong>{connector.label}</strong>
                </div>
                <span className={`connector-status status-${connector.status.toLowerCase()}`}>
                  {connector.status}
                </span>
                <p>{connector.detail}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel label="Rapportage" title="Operationele status">
          <div className="management-strip">
            <article>
              <Mail size={18} />
              <span>Laatste rapport</span>
            <strong>{selectedClient.lastReportAt}</strong>
          </article>
          <article>
            <ShieldCheck size={18} />
            <span>Datakwaliteit</span>
            <strong>{selectedClient.health}%</strong>
          </article>
            <article>
              <SlidersHorizontal size={18} />
              <span>Status</span>
              <strong>{selectedClient.status}</strong>
            </article>
          </div>
          <div className="live-sync-panel">
            <button
              disabled={liveSnapshotState.status === 'loading'}
              onClick={() => onFetchLiveSnapshot(selectedClient.id)}
              type="button"
            >
              <Download size={16} />
              {liveSnapshotState.status === 'loading' &&
              liveSnapshotState.clientId === selectedClient.id
                ? 'Live data ophalen'
                : 'Live data ophalen'}
            </button>
            {liveSnapshotState.clientId === selectedClient.id && liveSnapshotState.message ? (
              <div className={`live-sync-message status-${liveSnapshotState.status}`}>
                <strong>{liveSnapshotState.message}</strong>
                {liveSnapshotState.snapshot ? (
                  <span>
                    {formatMetric(
                      liveSnapshotState.snapshot.searchConsole.totals.clicks,
                      'number',
                    )}{' '}
                    klikken,{' '}
                    {formatMetric(
                      liveSnapshotState.snapshot.searchConsole.totals.impressions,
                      'number',
                    )}{' '}
                    impressies en{' '}
                    {formatMetric(
                      liveSnapshotState.snapshot.ga4.totalInternalSearches,
                      'number',
                    )}{' '}
                    interne zoekopdrachten.
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </Panel>
      </section>
    </section>
  );
}

function ClientEditor({ clients, selectedClient, onCreateClient, onUpdateClient }) {
  const [draft, setDraft] = useState(emptyClient);
  const hasName = draft.name.trim().length > 2;

  function updateSelected(path, value) {
    onUpdateClient({
      ...selectedClient,
      [path]: value,
    });
  }

  function updateConnector(connectorId, key, value) {
    onUpdateClient({
      ...selectedClient,
      connectors: selectedClient.connectors.map((connector) =>
        connector.id === connectorId
          ? {
              ...connector,
              [key]: key === 'config' ? { ...connector.config, ...value } : value,
            }
          : connector,
      ),
    });
  }

  function createClient(event) {
    event.preventDefault();
    if (!hasName) return;
    const slug =
      draft.slug ||
      draft.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    onCreateClient({ ...draft, slug, id: slug || draft.id });
    setDraft(emptyClient());
  }

  return (
    <section className="admin-grid">
      <Panel label="Nieuw" title="Camping of park aanmaken">
        <form className="admin-form" onSubmit={createClient}>
          <label>
            Naam
            <input
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              value={draft.name}
            />
          </label>
          <label>
            Slug
            <input
              onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
              placeholder="camping-voorbeeld"
              value={draft.slug}
            />
          </label>
          <label>
            Type
            <select
              onChange={(event) => setDraft({ ...draft, type: event.target.value })}
              value={draft.type}
            >
              <option>Camping</option>
              <option>Vakantiepark</option>
              <option>Verhuurorganisatie</option>
            </select>
          </label>
          <button disabled={!hasName} type="submit">
            <Plus size={16} />
            Aanmaken
          </button>
        </form>
      </Panel>

      <Panel className="admin-wide" label="Klant" title="Instellingen">
        <div className="settings-grid">
          <label>
            Naam
            <input value={selectedClient.name} onChange={(event) => updateSelected('name', event.target.value)} />
          </label>
          <label>
            Status
            <select value={selectedClient.status} onChange={(event) => updateSelected('status', event.target.value)}>
              <option>Setup</option>
              <option>Actief</option>
              <option>Monitoring</option>
              <option>Gepauzeerd</option>
            </select>
          </label>
          <label>
            Eigenaar
            <input value={selectedClient.owner} onChange={(event) => updateSelected('owner', event.target.value)} />
          </label>
          <label>
            Health
            <input
              max="100"
              min="0"
              onChange={(event) => updateSelected('health', Number(event.target.value))}
              type="number"
              value={selectedClient.health}
            />
          </label>
        </div>
      </Panel>

      <Panel className="admin-full" label="API's" title="Koppelingen configureren">
        <div className="admin-section-note">
          <ShieldCheck size={18} />
          <div>
            <strong>Configuratie, nog geen live verbinding</strong>
            <span>
              Deze velden leggen vast welke accounts/properties bij een klant horen. Voor echte
              data moeten OAuth, server-side connectors en veilige tokenopslag nog worden gekoppeld.
            </span>
          </div>
        </div>
        <div className="api-editor-grid">
          {selectedClient.connectors.map((connector) => {
            const blueprint = connectorBlueprints.find((item) => item.id === connector.id);

            return (
              <article className="api-editor-card" key={connector.id}>
                <div className="api-editor-head">
                  <strong>{connector.label}</strong>
                  <select
                    value={connector.status}
                    onChange={(event) => updateConnector(connector.id, 'status', event.target.value)}
                  >
                    <option>Ontbreekt</option>
                    <option>Voorbereid</option>
                    <option>Verbonden</option>
                    <option>Aandacht</option>
                  </select>
                </div>
                <label>
                  Omschrijving
                  <input
                    value={connector.detail}
                    onChange={(event) => updateConnector(connector.id, 'detail', event.target.value)}
                  />
                </label>
                {blueprint?.fields.map((field) => (
                  <label key={field}>
                    {field}
                    <input
                      value={connector.config?.[field] ?? ''}
                      onChange={(event) =>
                        updateConnector(connector.id, 'config', { [field]: event.target.value })
                      }
                    />
                  </label>
                ))}
                <div className="api-card-footer">
                  <span>Setupgegevens opgeslagen in prototype</span>
                  <button disabled type="button">Test later</button>
                </div>
              </article>
            );
          })}
        </div>
        <div className="protection-note">
          <ShieldCheck size={18} />
          <span>
            Sla hier alleen IDs, statussen en mapping op. OAuth-tokens en API-secrets horen in een
            server vault, niet in de browser.
          </span>
        </div>
      </Panel>
    </section>
  );
}

function AdminWorkspace({
  clients,
  liveSnapshotState,
  selectedClient,
  onCreateClient,
  onFetchLiveSnapshot,
  onOpenDashboard,
  onLogout,
  onSelectClient,
  onUpdateClient,
}) {
  return (
    <>
      <div className="admin-topbar">
        <div>
          <span className="eyebrow">Beheer</span>
          <h2>Dashboard center</h2>
          <p>Portfolio-overzicht, klantconfiguratie en connector-setup. Live data loopt pas na server-side koppeling.</p>
        </div>
        <button className="ghost-button" onClick={onLogout} type="button">
          <LogOut size={16} />
          Uitloggen
        </button>
      </div>
      <ManagementCenter
        clients={clients}
        liveSnapshotState={liveSnapshotState}
        onFetchLiveSnapshot={onFetchLiveSnapshot}
        selectedClient={selectedClient}
        onOpenDashboard={onOpenDashboard}
        onSelectClient={onSelectClient}
      />
      <ClientEditor
        clients={clients}
        selectedClient={selectedClient}
        onCreateClient={onCreateClient}
        onUpdateClient={onUpdateClient}
      />
    </>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSegment, setSelectedSegment] = useState('families');
  const [period, setPeriod] = useState('month');
  const [scenario, setScenario] = useState('base');
  const [isExporting, setIsExporting] = useState(false);
  const [clients, setClients] = useState(loadClients);
  const [selectedClientId, setSelectedClientId] = useState(clients[0].id);
  const [liveSnapshotState, setLiveSnapshotState] = useState({
    status: 'idle',
    clientId: null,
    message: '',
    snapshot: null,
  });
  const [auth, setAuth] = useState(() => {
    if (typeof window === 'undefined') return null;

    try {
      const stored = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isAdmin = auth?.role === 'admin';
  const isManagement = activeTab === 'management';
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.id !== 'management' || isAdmin),
    [isAdmin],
  );
  const sidebarTabs =
    isManagement && isAdmin
      ? [
          { id: 'management', label: 'Beheer' },
          { id: 'overview', label: 'Klantdashboard' },
        ]
      : visibleTabs;

  const selectedClient =
    clients.find((client) => client.id === selectedClientId) ?? clients[0];
  const selectedLiveSnapshot =
    liveSnapshotState.clientId === selectedClient?.id ? liveSnapshotState.snapshot : null;
  const dashboard = useMemo(
    () =>
      applyLiveSnapshotToDashboard(
        cloneDashboardForClient(dashboardPrototype, selectedClient),
        selectedLiveSnapshot,
      ),
    [selectedClient, selectedLiveSnapshot],
  );
  const periodConfig = periodOptions[period];
  const scenarioConfig = scenarioOptions[scenario];
  const report = useMemo(
    () => createReportingContext({ dashboard, periodConfig, scenarioConfig }),
    [dashboard, periodConfig, scenarioConfig],
  );
  const selectedSegmentData =
    report.segments.find((segment) => segment.id === selectedSegment) ?? report.segments[0];
  const projected = useMemo(
    () => ({
      revenue: report.metrics.expectedRevenue,
      bookings: report.metrics.expectedBookings,
    }),
    [report],
  );

  useEffect(() => {
    if (!auth) return;

    let cancelled = false;

    async function fetchClients() {
      try {
        const response = await apiFetch('/api/clients');
        if (!response.ok) return;
        const payload = await response.json();
        if (!payload.ok || cancelled) return;

        setClients(payload.clients);
        saveClients(payload.clients);
        if (!payload.clients.some((client) => client.id === selectedClientId)) {
          setSelectedClientId(payload.clients[0]?.id);
        }
      } catch {
        // Houd lokale prototype-data beschikbaar als de API niet draait.
      }
    }

    fetchClients();

    return () => {
      cancelled = true;
    };
  }, [auth, selectedClientId]);

  useEffect(() => {
    if (!auth || !selectedClient?.id) return;

    let cancelled = false;

    async function fetchStoredSnapshot() {
      try {
        const response = await apiFetch(`/api/clients/${selectedClient.id}/live-snapshot`);
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled || !payload.ok || !payload.snapshot) return;

        setLiveSnapshotState({
          status: payload.syncState?.status === 'running' ? 'loading' : 'success',
          clientId: selectedClient.id,
          message: payload.updatedAt
            ? `Laatst gesynchroniseerd ${new Date(payload.updatedAt).toLocaleString('nl-NL')}.`
            : 'Live data beschikbaar.',
          snapshot: payload.snapshot,
        });
      } catch {
        // Geen probleem: dashboard valt terug op prototype-data.
      }
    }

    fetchStoredSnapshot();

    return () => {
      cancelled = true;
    };
  }, [auth, selectedClient?.id]);

  async function handlePresentationExport() {
    if (!isAdmin) return;

    setIsExporting(true);
    try {
      await exportDashboardPresentation({
        dashboard,
        report,
        projected,
        scenarioLabel: scenarioConfig.label,
      });
    } catch (error) {
      console.error(error);
      window.alert('De PowerPoint-export kon niet worden gemaakt. Probeer het opnieuw.');
    } finally {
      setIsExporting(false);
    }
  }

  function persistClients(nextClients) {
    setClients(nextClients);
    saveClients(nextClients);
  }

  function handleCreateClient(client) {
    persistClients([...clients, client]);
    setSelectedClientId(client.id);
  }

  function handleUpdateClient(updatedClient) {
    persistClients(
      clients.map((client) => (client.id === updatedClient.id ? updatedClient : client)),
    );
  }

  async function handleFetchLiveSnapshot(clientId) {
    setLiveSnapshotState({
      status: 'loading',
      clientId,
      message: 'Live data ophalen uit GA4 en Search Console...',
      snapshot: null,
    });

    try {
      const response = await apiFetch(`/api/clients/${clientId}/live-snapshot?days=30`, {
        method: 'POST',
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Live data ophalen mislukt');
      }

      const nextClients = clients.map((client) =>
        client.id === payload.client.id ? payload.client : client,
      );
      persistClients(nextClients);
      setSelectedClientId(payload.client.id);
      setLiveSnapshotState({
        status: 'success',
        clientId,
        message: 'Live data opgehaald.',
        snapshot: payload.snapshot,
      });
    } catch (error) {
      setLiveSnapshotState({
        status: 'error',
        clientId,
        message: error.message,
        snapshot: null,
      });
    }
  }

  function handleLogin(nextAuth) {
    setAuth(nextAuth);
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
  }

  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ook lokaal uitloggen als de API niet bereikbaar is.
    }
    setAuth(null);
    setActiveTab('overview');
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }

  if (!auth) {
    return <GlobalLogin onLogin={handleLogin} />;
  }

  return (
    <main className={`app-shell ${isManagement ? 'is-management' : ''}`}>
      <aside className={`sidebar ${isManagement ? 'sidebar-management' : ''}`}>
        <div className="brand-block">
          <RecranetLogo />
        </div>
        <nav aria-label="Dashboard onderdelen">
          {sidebarTabs.map((tab) => (
            <button
              className={activeTab === tab.id ? 'is-active' : ''}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span>Ingelogd als</span>
          <strong>{auth.label}</strong>
          <p>
            {isAdmin
              ? 'Beheerderstoegang met klantconfiguratie en koppelingen.'
              : 'Klanttoegang tot rapportage.'}
          </p>
          <button className="sidebar-logout" onClick={handleLogout} type="button">
            <LogOut size={15} />
            Uitloggen
          </button>
        </div>
      </aside>

      <section className="workspace">
        {!isManagement && activeTab === 'overview' && (
          <header className="topbar">
            <div>
              <div className="topbar-brand">
                <RecranetLogo />
                <span>Rapportage</span>
              </div>
              <span className="eyebrow">Klantdashboard</span>
              <h1>{dashboard.meta.propertyName}</h1>
              <p>
                Inzicht in omzet, campagnes, organische vraag, beschikbaarheid en boekingen.
              </p>
            </div>
            <div className="header-actions">
              {isAdmin ? (
                <button
                  aria-label="Export naar PowerPoint"
                  className="export-button"
                  disabled={isExporting}
                  onClick={handlePresentationExport}
                  title="Export naar PowerPoint"
                  type="button"
                >
                  <Download size={16} />
                  {isExporting ? 'Exporteren' : 'Export'}
                </button>
              ) : null}
              <HeaderDropdown
                icon={<CalendarDays size={18} />}
                label="Periode"
                meta={`Bijgewerkt ${dashboard.meta.updatedAt}`}
                onChange={setPeriod}
                options={periodOptions}
                value={period}
              />
              <HeaderDropdown
                label="Scenario"
                onChange={setScenario}
                options={scenarioOptions}
                value={scenario}
              />
            </div>
          </header>
        )}

        {!isManagement && activeTab !== 'overview' && (
          <header className="viewbar">
            <div>
              <span className="eyebrow">{tabContext[activeTab].label}</span>
              <h1>{tabContext[activeTab].title}</h1>
              <p>
                {dashboard.meta.propertyName} - {tabContext[activeTab].description}
              </p>
            </div>
            <div className="header-actions">
              <HeaderDropdown
                icon={<CalendarDays size={18} />}
                label="Periode"
                meta={`Bijgewerkt ${dashboard.meta.updatedAt}`}
                onChange={setPeriod}
                options={periodOptions}
                value={period}
              />
              <HeaderDropdown
                label="Scenario"
                onChange={setScenario}
                options={scenarioOptions}
                value={scenario}
              />
            </div>
          </header>
        )}

        {!isManagement && activeTab === 'overview' && (
          <TrustStrip
            auth={auth}
            liveSnapshotState={liveSnapshotState}
            selectedClient={selectedClient}
          />
        )}

        {activeTab === 'overview' && <CommandSummary dashboard={dashboard} report={report} />}

        {activeTab === 'overview' && (
          <>
            <section className="dashboard-grid">
              <Panel className="panel-wide" label="GA4" source="Omzet" title="Trend en prognose">
                <TrendChart data={report.trend} forecast={report.forecast} />
              </Panel>

              <Panel label="Signalering" title="Belangrijkste meldingen">
                <div className="alert-list">
                  {report.alerts.map((alert) => (
                    <article key={alert.title}>
                      <span className={`alert-type alert-${alert.type.toLowerCase()}`}>
                        {alert.type}
                      </span>
                      <div>
                        <strong>{alert.title}</strong>
                        <p>{alert.detail}</p>
                        <small>{alert.owner}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </Panel>

              <Panel className="panel-wide" label="Segmenten" title="Doelgroepen">
                <SegmentGrid
                  segments={report.segments}
                  selectedSegment={selectedSegment}
                  onSelectSegment={setSelectedSegment}
                />
              </Panel>

              <Panel label="Focussegment" title={selectedSegmentData.label}>
                <div className="focus-card">
                  <strong>{formatMetric(selectedSegmentData.revenue, 'currency')}</strong>
                  <span>
                    {selectedSegmentData.bookings} boekingen - ROAS{' '}
                    {formatMetric(selectedSegmentData.roas, 'ratio')}
                  </span>
                  <p>{selectedSegmentData.note}</p>
                </div>
              </Panel>
            </section>

            <section className="dashboard-grid">
              <Panel className="panel-wide" label="Planning" title={`Beschikbaarheid ${report.period.toLowerCase()}`}>
                <AvailabilityTable availability={report.availability} />
              </Panel>
              <Panel label="Acties" title="Prioriteiten">
                <ActionBoard actions={report.actionPlan} />
              </Panel>
            </section>
          </>
        )}

        {activeTab === 'campaigns' && (
          <section className="dashboard-grid">
            <Panel
              className="panel-wide"
              label="Google Ads"
              source="Campagnes"
              title="Campagnes met advies"
            >
              <CampaignTable campaigns={report.campaigns} />
            </Panel>
            <Panel label="Google Ads" title="Budget pacing">
              <div className="pacing-list">
                {report.budgetPacing.map((item) => (
                  <div key={item.label}>
                    <div>
                      <span>{item.label}</span>
                      <strong>{formatMetric(item.value, 'currency')}</strong>
                    </div>
                    <div className="funnel-bar">
                      <span style={{ width: `${(item.value / item.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel label="Kanalen" source="GA4" title="Omzet per kanaal">
              <SourceSplit channels={report.sourceSplit} />
            </Panel>
          </section>
        )}

        {activeTab === 'seo' && (
          <section className="dashboard-grid">
            <Panel label="Search Console" source="Queries" title="Zoekvragen">
              <QueryList queries={report.queries} />
            </Panel>
            <Panel className="panel-wide" label="Search Console" title="Pagina's en kansen">
              <div className="opportunity-grid">
                {report.contentOpportunities.map((item) => (
                  <article key={item.topic}>
                    <div>
                      <ListFilter size={18} />
                      <strong>{item.topic}</strong>
                    </div>
                    <p>{item.impact}</p>
                    <span>
                      {formatMetric(item.demand, 'number')} impressies - {item.difficulty}
                    </span>
                    <code>{item.targetPage}</code>
                  </article>
                ))}
              </div>
            </Panel>
            <Panel className="panel-wide" label="Search Console" title="Presterende pagina's">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pagina</th>
                      <th>Klikken</th>
                      <th>CTR</th>
                      <th>Positie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.pages.map((page) => (
                      <tr key={page.path}>
                        <td>
                          <code>{page.path}</code>
                        </td>
                        <td>{formatMetric(page.clicks, 'number')}</td>
                        <td>{formatMetric(page.ctr, 'percent')}</td>
                        <td>{page.position.toString().replace('.', ',')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>
        )}

        {activeTab === 'booking' && (
          <section className="dashboard-grid">
            <Panel label="GA4" source="Funnel" title="Boekingspad">
              <Funnel steps={report.funnel} />
            </Panel>
            <Panel label="GA4" title="Devices">
              <div className="device-list">
                {report.deviceSplit.map((device) => (
                  <article key={device.device}>
                    <Eye size={18} />
                    <div>
                      <strong>{device.device}</strong>
                      <span>
                        {formatMetric(device.sessions, 'number')} sessies -{' '}
                        {formatMetric(device.bookingRate, 'percent')} conversie
                      </span>
                    </div>
                    <b>{formatMetric(device.revenue, 'currency')}</b>
                  </article>
                ))}
              </div>
            </Panel>
            <Panel className="panel-wide" label="Actieplan" title="Conversieverbeteringen">
              <ActionBoard actions={report.actionPlan} />
            </Panel>
          </section>
        )}

        {activeTab === 'management' && (
          isAdmin ? (
            <AdminWorkspace
              clients={clients}
              liveSnapshotState={liveSnapshotState}
              selectedClient={selectedClient}
              onCreateClient={handleCreateClient}
              onFetchLiveSnapshot={handleFetchLiveSnapshot}
              onOpenDashboard={() => setActiveTab('overview')}
              onLogout={handleLogout}
              onSelectClient={setSelectedClientId}
              onUpdateClient={handleUpdateClient}
            />
          ) : null
        )}

      </section>
    </main>
  );
}

export default App;
