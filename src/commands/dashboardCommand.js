import { dashboardPrototype } from '../data/dashboardPrototype.js';

const DEFAULT_COMMAND = '/dashboard camping-de-waschappelse-rups --periode laatste-30-dagen';

export function executeDashboardCommand(rawCommand = DEFAULT_COMMAND) {
  const normalized = rawCommand.trim().replace(/\s+/g, ' ');

  if (!normalized.startsWith('/dashboard')) {
    return {
      ok: false,
      message: 'Gebruik /dashboard om het dashboardrapport te openen.',
      dashboard: dashboardPrototype,
    };
  }

  const tokens = normalized.split(' ');
  const propertySlug =
    tokens.find((token) => !token.startsWith('/') && !token.startsWith('--')) ||
    'camping-de-waschappelse-rups';

  const periodToken = tokens.find((token) => token.startsWith('--periode'));
  const period = periodToken?.includes('=')
    ? periodToken.split('=')[1]
    : tokens[tokens.indexOf('--periode') + 1] || 'laatste-30-dagen';

  return {
    ok: true,
    message: 'Dashboardrapport geladen.',
    command: {
      name: '/dashboard',
      propertySlug,
      period,
      mode: 'prototype',
    },
    dashboard: dashboardPrototype,
  };
}

export const dashboardCommandExample = DEFAULT_COMMAND;
