import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { clientRegistry } from '../src/data/clientRegistry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);
const DATA_DIR = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(__dirname, 'data');
const DB_FILE = process.env.DB_FILE ? resolve(process.env.DB_FILE) : join(DATA_DIR, 'db.json');
const PORT = Number(process.env.PORT || 8787);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = new Set(
  [
    FRONTEND_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ].filter(Boolean),
);
const SESSION_COOKIE = 'recranet_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 10 * 60 * 1000);
const COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'None' : 'Lax');
const sessions = new Map();

function assertRuntimeConfig() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = ['ADMIN_PASSWORD', 'CLIENT_PASSWORD', 'FRONTEND_ORIGIN'].filter(
    (key) => !process.env[key],
  );

  if (missing.length) {
    throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = hashPassword(password, salt).split(':')[1];
  return timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

function seedDatabase() {
  return {
    users: [
      {
        id: 'admin',
        email: 'beheer@recranet.local',
        name: 'Beheerder',
        role: 'admin',
        passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'beheer2026'),
        clientIds: clientRegistry.map((client) => client.id),
      },
      {
        id: 'client-waschappelse-rups',
        email: 'klant@waschappelse-rups.local',
        name: 'Camping de Waschappelse Rups',
        role: 'client',
        passwordHash: hashPassword(process.env.CLIENT_PASSWORD || 'klant2026'),
        clientIds: ['waschappelse-rups'],
      },
    ],
    clients: clientRegistry.map((client) => ({
      ...client,
      connectors: client.connectors.map((connector) => ({
        ...connector,
        config: connector.config ?? {},
        lastSyncAt: null,
        lastError: null,
      })),
    })),
    snapshots: {},
    syncState: {},
    auditLog: [
      {
        id: randomBytes(8).toString('hex'),
        at: new Date().toISOString(),
        actor: 'system',
        action: 'database.seeded',
        target: 'backend',
      },
    ],
  };
}

async function readDb() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    const db = JSON.parse(await readFile(DB_FILE, 'utf8'));
    const missingClients = clientRegistry.filter(
      (seedClient) => !db.clients.some((client) => client.id === seedClient.id),
    );

    db.snapshots = db.snapshots ?? {};
    db.syncState = db.syncState ?? {};

    if (missingClients.length) {
      db.clients.push(
        ...missingClients.map((client) => ({
          ...client,
          connectors: client.connectors.map((connector) => ({
            ...connector,
            config: connector.config ?? {},
            lastSyncAt: null,
            lastError: null,
          })),
        })),
      );
      db.users = db.users.map((user) =>
        user.role === 'admin'
          ? {
              ...user,
              clientIds: Array.from(
                new Set([...user.clientIds, ...missingClients.map((client) => client.id)]),
              ),
            }
          : user,
      );
      db.auditLog.unshift({
        id: randomBytes(8).toString('hex'),
        at: new Date().toISOString(),
        actor: 'system',
        action: 'database.seed_clients_added',
        target: 'backend',
        meta: { clients: missingClients.map((client) => client.id) },
      });
      await writeDb(db);
    }

    return db;
  } catch {
    const db = seedDatabase();
    await writeDb(db);
    return db;
  }
}

async function writeDb(db) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientIds: user.clientIds,
  };
}

function allowedCorsOrigin(origin) {
  if (!origin) return FRONTEND_ORIGIN;
  if (ALLOWED_ORIGINS.has('*')) return origin;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  return null;
}

function corsHeaders(res) {
  const origin = allowedCorsOrigin(res.requestOrigin);
  return {
    ...(origin ? { 'access-control-allow-origin': origin } : {}),
    vary: 'Origin',
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    ...corsHeaders(res),
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function setSessionCookie(res, sessionId) {
  const sameSite = `; SameSite=${COOKIE_SAME_SITE}`;
  const secure = process.env.NODE_ENV === 'production' || COOKIE_SAME_SITE === 'None' ? '; Secure' : '';
  res.setHeader(
    'set-cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; HttpOnly${sameSite}; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`,
  );
}

function clearSessionCookie(res) {
  const sameSite = `; SameSite=${COOKIE_SAME_SITE}`;
  const secure = process.env.NODE_ENV === 'production' || COOKIE_SAME_SITE === 'None' ? '; Secure' : '';
  res.setHeader(
    'set-cookie',
    `${SESSION_COOKIE}=; HttpOnly${sameSite}; Path=/; Max-Age=0${secure}`,
  );
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function currentUser(req, db) {
  const sessionId = parseCookies(req)[SESSION_COOKIE];
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session || session.expiresAt < Date.now()) {
    if (sessionId) sessions.delete(sessionId);
    return null;
  }

  return db.users.find((user) => user.id === session.userId) ?? null;
}

function canAccessClient(user, clientId) {
  return user.role === 'admin' || user.clientIds.includes(clientId);
}

function connectorById(client, connectorId) {
  return client.connectors.find((connector) => connector.id === connectorId);
}

function googleConfigForClient(client) {
  const searchConsole = connectorById(client, 'search-console');
  const ga4 = connectorById(client, 'ga4');
  return {
    siteUrl: searchConsole?.config?.siteUrl,
    propertyId: ga4?.config?.propertyId,
  };
}

async function fetchGoogleSnapshot({ siteUrl, propertyId, days = 30 }) {
  const { stdout } = await execFileAsync(
    'python',
    [
      join(__dirname, 'google_snapshot.py'),
      '--site-url',
      siteUrl,
      '--property-id',
      String(propertyId),
      '--days',
      String(days),
    ],
    {
      cwd: dirname(__dirname),
      maxBuffer: 1024 * 1024 * 5,
    },
  );
  return JSON.parse(stdout);
}

async function syncClientSnapshot(db, user, client, days = 30) {
  const { siteUrl, propertyId } = googleConfigForClient(client);

  if (!siteUrl || !propertyId) {
    throw new Error('Missing Search Console siteUrl or GA4 propertyId');
  }

  db.syncState[client.id] = {
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: db.syncState[client.id]?.finishedAt ?? null,
    lastError: null,
  };
  await writeDb(db);

  const snapshot = await fetchGoogleSnapshot({ siteUrl, propertyId, days });

  client.connectors = client.connectors.map((connector) =>
    ['search-console', 'ga4'].includes(connector.id)
      ? {
          ...connector,
          status: snapshot.ok ? 'Verbonden' : 'Aandacht',
          lastSyncAt: new Date().toISOString(),
          lastError: snapshot.ok ? null : snapshot.error,
        }
      : connector,
  );
  client.lastReportAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  client.health = snapshot.ok ? Math.max(client.health, 86) : client.health;
  db.snapshots[client.id] = {
    snapshot,
    updatedAt: new Date().toISOString(),
    days,
  };
  db.syncState[client.id] = {
    status: snapshot.ok ? 'success' : 'error',
    startedAt: db.syncState[client.id]?.startedAt ?? null,
    finishedAt: new Date().toISOString(),
    lastError: snapshot.ok ? null : snapshot.error,
  };
  await addAudit(db, user, 'client.live_snapshot', client.id, {
    siteUrl,
    propertyId,
    ok: snapshot.ok,
    automatic: user?.id === 'scheduler',
  });

  return snapshot;
}

async function addAudit(db, actor, action, target, meta = {}) {
  db.auditLog.unshift({
    id: randomBytes(8).toString('hex'),
    at: new Date().toISOString(),
    actor: actor?.email ?? 'anonymous',
    action,
    target,
    meta,
  });
  db.auditLog = db.auditLog.slice(0, 300);
  await writeDb(db);
}

async function handleApi(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});

  const url = new URL(req.url, `http://${req.headers.host}`);
  const db = await readDb();
  const user = await currentUser(req, db);

  if (url.pathname === '/api/health') {
    return json(res, 200, { ok: true, service: 'recranet-dashboard-api' });
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readBody(req);
    const login = String(body.email || '').toLowerCase();
    const password = String(body.password || body.code || '');
    const matchedUser =
      db.users.find((item) => item.email.toLowerCase() === login) ||
      (password === (process.env.ADMIN_PASSWORD || 'beheer2026')
        ? db.users.find((item) => item.role === 'admin')
        : null) ||
      (password === (process.env.CLIENT_PASSWORD || 'klant2026')
        ? db.users.find((item) => item.role === 'client')
        : null);

    if (!matchedUser || !verifyPassword(password, matchedUser.passwordHash)) {
      return json(res, 401, { ok: false, error: 'Invalid credentials' });
    }

    const sessionId = randomBytes(32).toString('hex');
    sessions.set(sessionId, {
      userId: matchedUser.id,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    setSessionCookie(res, sessionId);
    await addAudit(db, matchedUser, 'auth.login', matchedUser.id);
    return json(res, 200, { ok: true, user: publicUser(matchedUser) });
  }

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    const sessionId = parseCookies(req)[SESSION_COOKIE];
    if (sessionId) sessions.delete(sessionId);
    clearSessionCookie(res);
    return json(res, 200, { ok: true });
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    return user
      ? json(res, 200, { ok: true, user: publicUser(user) })
      : json(res, 401, { ok: false, error: 'Not authenticated' });
  }

  if (!user) return json(res, 401, { ok: false, error: 'Not authenticated' });

  if (url.pathname === '/api/clients' && req.method === 'GET') {
    const clients =
      user.role === 'admin'
        ? db.clients
        : db.clients.filter((client) => user.clientIds.includes(client.id));
    return json(res, 200, { ok: true, clients });
  }

  if (url.pathname === '/api/clients' && req.method === 'POST') {
    if (user.role !== 'admin') return json(res, 403, { ok: false, error: 'Forbidden' });

    const body = await readBody(req);
    const slug =
      body.slug ||
      String(body.name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const client = {
      id: slug,
      slug,
      name: body.name,
      type: body.type || 'Camping',
      status: body.status || 'Setup',
      owner: body.owner || 'Account',
      dashboardUrl: body.dashboardUrl || `${FRONTEND_ORIGIN}/?client=${slug}`,
      lastReportAt: 'Nog niet verzonden',
      health: Number(body.health ?? 55),
      dataScale: Number(body.dataScale ?? 1),
      connectors: body.connectors || [],
      decisionProfile: body.decisionProfile || clientRegistry[0].decisionProfile,
    };

    db.clients.push(client);
    await addAudit(db, user, 'client.created', client.id);
    return json(res, 201, { ok: true, client });
  }

  const clientMatch = url.pathname.match(/^\/api\/clients\/([^/]+)$/);
  if (clientMatch && req.method === 'PUT') {
    const clientId = clientMatch[1];
    if (user.role !== 'admin') return json(res, 403, { ok: false, error: 'Forbidden' });
    const body = await readBody(req);
    const index = db.clients.findIndex((client) => client.id === clientId);
    if (index === -1) return json(res, 404, { ok: false, error: 'Client not found' });

    db.clients[index] = { ...db.clients[index], ...body, id: clientId };
    await addAudit(db, user, 'client.updated', clientId);
    return json(res, 200, { ok: true, client: db.clients[index] });
  }

  const connectorMatch = url.pathname.match(/^\/api\/clients\/([^/]+)\/connectors\/([^/]+)$/);
  if (connectorMatch && req.method === 'PUT') {
    if (user.role !== 'admin') return json(res, 403, { ok: false, error: 'Forbidden' });
    const [, clientId, connectorId] = connectorMatch;
    const body = await readBody(req);
    const client = db.clients.find((item) => item.id === clientId);
    if (!client) return json(res, 404, { ok: false, error: 'Client not found' });

    client.connectors = client.connectors.map((connector) =>
      connector.id === connectorId
        ? {
            ...connector,
            ...body,
            config: { ...(connector.config ?? {}), ...(body.config ?? {}) },
          }
        : connector,
    );
    await addAudit(db, user, 'connector.updated', `${clientId}:${connectorId}`);
    return json(res, 200, { ok: true, connectors: client.connectors });
  }

  const testMatch = url.pathname.match(/^\/api\/clients\/([^/]+)\/connectors\/([^/]+)\/test$/);
  if (testMatch && req.method === 'POST') {
    const [, clientId, connectorId] = testMatch;
    if (!canAccessClient(user, clientId)) return json(res, 403, { ok: false, error: 'Forbidden' });
    const client = db.clients.find((item) => item.id === clientId);
    const connector = client?.connectors.find((item) => item.id === connectorId);
    if (!connector) return json(res, 404, { ok: false, error: 'Connector not found' });

    return json(res, 200, {
      ok: true,
      live: false,
      status: connector.status,
      message:
        'Connectorconfiguratie gevonden. Live OAuth/data-fetch is de volgende implementatiestap.',
    });
  }

  const liveSnapshotMatch = url.pathname.match(/^\/api\/clients\/([^/]+)\/live-snapshot$/);
  if (liveSnapshotMatch && req.method === 'GET') {
    const clientId = liveSnapshotMatch[1];
    if (!canAccessClient(user, clientId)) return json(res, 403, { ok: false, error: 'Forbidden' });

    return json(res, 200, {
      ok: true,
      snapshot: db.snapshots?.[clientId]?.snapshot ?? null,
      updatedAt: db.snapshots?.[clientId]?.updatedAt ?? null,
      syncState: db.syncState?.[clientId] ?? { status: 'idle' },
    });
  }

  if (liveSnapshotMatch && req.method === 'POST') {
    const clientId = liveSnapshotMatch[1];
    if (!canAccessClient(user, clientId)) return json(res, 403, { ok: false, error: 'Forbidden' });

    const client = db.clients.find((item) => item.id === clientId);
    if (!client) return json(res, 404, { ok: false, error: 'Client not found' });

    const { siteUrl, propertyId } = googleConfigForClient(client);

    if (!siteUrl || !propertyId) {
      return json(res, 400, {
        ok: false,
        error: 'Missing Search Console siteUrl or GA4 propertyId',
      });
    }

    try {
      const snapshot = await syncClientSnapshot(
        db,
        user,
        client,
        Number(url.searchParams.get('days') || 30),
      );

      return json(res, 200, { ok: true, client, snapshot });
    } catch (error) {
      await addAudit(db, user, 'client.live_snapshot_failed', clientId, {
        error: error.message,
      });
      return json(res, 500, {
        ok: false,
        error: 'Live snapshot failed',
        detail: error.message,
      });
    }
  }

  if (url.pathname === '/api/audit-log' && req.method === 'GET') {
    if (user.role !== 'admin') return json(res, 403, { ok: false, error: 'Forbidden' });
    return json(res, 200, { ok: true, events: db.auditLog.slice(0, 100) });
  }

  return json(res, 404, { ok: false, error: 'Not found' });
}

async function runScheduledSync() {
  const db = await readDb();
  const schedulerUser = { id: 'scheduler', email: 'scheduler@local', role: 'system' };
  const eligibleClients = db.clients.filter((client) => {
    const { siteUrl, propertyId } = googleConfigForClient(client);
    return siteUrl && propertyId;
  });

  for (const client of eligibleClients) {
    const state = db.syncState?.[client.id];
    if (state?.status === 'running') continue;

    const lastUpdated = db.snapshots?.[client.id]?.updatedAt;
    const age = lastUpdated ? Date.now() - new Date(lastUpdated).getTime() : Infinity;
    if (age < SYNC_INTERVAL_MS) continue;

    try {
      console.log(`Scheduled sync: ${client.id}`);
      await syncClientSnapshot(db, schedulerUser, client, 30);
    } catch (error) {
      db.syncState[client.id] = {
        status: 'error',
        startedAt: db.syncState[client.id]?.startedAt ?? null,
        finishedAt: new Date().toISOString(),
        lastError: error.message,
      };
      await addAudit(db, schedulerUser, 'client.scheduled_sync_failed', client.id, {
        error: error.message,
      });
    }
  }
}

const server = createServer((req, res) => {
  res.requestOrigin = req.headers.origin;
  handleApi(req, res).catch((error) => {
    console.error(error);
    json(res, 500, { ok: false, error: 'Internal server error' });
  });
});

assertRuntimeConfig();

server.listen(PORT, () => {
  console.log(`Recranet Dashboard API listening on http://localhost:${PORT}`);
  console.log(`Automatic sync interval: ${Math.round(SYNC_INTERVAL_MS / 1000)}s`);
  runScheduledSync().catch((error) => console.error('Initial sync failed', error));
  setInterval(() => {
    runScheduledSync().catch((error) => console.error('Scheduled sync failed', error));
  }, Math.min(SYNC_INTERVAL_MS, 60 * 1000));
});
