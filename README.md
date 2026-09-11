# Recranet dashboardrapportage

Professioneel prototype voor een Recranet booking-intelligence workflow. Het dashboard
combineert marketingprestaties, organische vraag, boekingsgedrag, forecast en concrete
actiepunten in één operationele cockpit.

## Wat zit erin

- Vite + React dashboard op `/dashboard`.
- Commandflow: `/dashboard camping-de-waschappelse-rups --periode laatste-30-dagen`.
- Representatieve prototype-data per bron: Google Ads, Search Console, GA4 en reserveringssignalen.
- Professionele dashboardnavigatie met overzicht, campagnes, SEO en boekingspad.
- Forecast, scenarioselectie, doelgroepsegmenten, beschikbaarheid en signaleringen.
- Sorteerbare campagnetabel, zoekfilter voor queries en actieboard met prioriteiten.
- Adviesmodule met prioriteit, onderbouwing, actie en verwachte impact.
- Losse service-laag in `src/services/googleConnectors.js` voor latere API-koppelingen.
- Terminalcommando voor mailrapporten via dezelfde Gmail API-aanpak als de bestaande gap-analyzer.

## Mailrapport vanuit VS Code

Preview maken zonder te verzenden:

```bash
python tools/dashboard_mail.py /dashboard waschappelse-rups --preview
```

Mail versturen naar Luuks testadres:

```bash
npm run dashboard:mail -- /dashboard waschappelse-rups
```

Standaard gaat de mail naar `luuklouwerse.weststrate@gmail.com`. Overschrijven kan zo:

```bash
python tools/dashboard_mail.py /dashboard andere-camping --to naam@example.nl
```

Een publieke of lokale dashboardlink meegeven kan zo:

```bash
python tools/dashboard_mail.py /dashboard waschappelse-rups --dashboard-url http://localhost:5173/dashboard
```

De mailer gebruikt standaard het bestaande Google OAuth-token uit
`../ga4-akeneo-gap-analyzer/token.json`, inclusief de Gmail `gmail.send` scope. Als Google
`invalid_grant` teruggeeft, is dat token verlopen of ingetrokken. Draai dan opnieuw:

```bash
cd ../ga4-akeneo-gap-analyzer
python auto_analyze.py --setup
```

Daarna kan het mailcommando opnieuw gedraaid worden.

## Recranet-context uit onderzoek

Recranet positioneert zich als totaaloplossing voor toerisme en recreatie met
reserveringssoftware, channel manager, online marketing en websiteontwikkeling. De
online marketingpagina legt nadruk op meer directe boekingen via de eigen website,
e-commerce tracking op site en zoek-en-boek, inzicht in Google Ads kosten en opbrengst,
en analyse van afhakers in het boekingsproces.

De reserveringssoftware bevat functies als zoek-en-boek, planbord, channel manager,
gekoppelde betalingen, automatische e-mails en realtime statistieken voor omzet,
bezetting, reserveringen en kansen. De websitepropositie draait om een CMS met directe
koppeling tussen website, tarieven, arrangementen, reserveringssysteem en marketing.

Recranet heeft ook een Booking API developer hub. Volgens de documentatie moet API-toegang
worden aangevraagd via support voordat live integraties gebruikt kunnen worden.

Bronnen:

- https://recranet.com/nl/
- https://recranet.com/nl/online-marketing-toerisme-recreatie
- https://recranet.com/nl/online-reserveringssysteem
- https://recranet.com/nl/website-toerisme-recreatie-hospitality
- https://developers.recranet.com/

## Google API richting

Later vervangen we de prototype-data door:

- Google Ads API reporting voor kosten, conversies, conversiewaarde, ROAS en campagneprestaties.
- Search Console API Search Analytics voor query's, pagina's, klikken, impressies, CTR en positie.
- Google Analytics Data API voor GA4 rapportages rond gebruikers, sessies, kanalen, events,
  ecommerce en boekingsfunnel.

Bronnen:

- https://developers.google.com/google-ads/api/docs/reporting/overview
- https://developers.google.com/webmaster-tools
- https://developers.google.com/analytics/devguides/reporting/data/v1

## Starten

```bash
npm install
npm run dev:full
```

Open daarna:

```text
http://127.0.0.1:5173/
```

## Live hosten voor klanten

`localhost` is alleen je eigen laptop. Voor klanten host je twee delen:

- Frontend dashboard: Vercel, statische Vite build uit `dist`.
- Backend API: Render, Node server met login, klantdata, Google sync en cookies.

### Frontend op Vercel

1. Push deze map naar GitHub.
2. Maak in Vercel een nieuw project van deze repository.
3. Vercel gebruikt `vercel.json`:
   - build command: `npm run build`
   - output directory: `dist`
4. Zet in Vercel bij Environment Variables:

```text
VITE_API_BASE_URL=https://jouw-render-api.onrender.com
```

Laat `VITE_API_BASE_URL` lokaal leeg; dan blijft de Vite proxy naar `localhost:8787`
werken.

### Backend op Render

1. Maak in Render een nieuwe Web Service van dezelfde repository.
2. Render kan `render.yaml` gebruiken. De backend draait via `Dockerfile`, omdat deze
   service zowel Node als Python/Google packages nodig heeft.
3. Zet minimaal deze Environment Variables:

```text
NODE_ENV=production
FRONTEND_ORIGIN=https://jouw-vercel-dashboard.vercel.app
ALLOWED_ORIGINS=https://jouw-vercel-dashboard.vercel.app,https://dashboard.jouwdomein.nl
ADMIN_PASSWORD=een-lang-uniek-beheer-wachtwoord
CLIENT_PASSWORD=een-lang-uniek-klant-wachtwoord
COOKIE_SAME_SITE=None
SYNC_INTERVAL_MS=600000
SEO_DASHBOARD_PATH=/pad/naar/seo-dashboard
```

De backend start in productie niet zonder `ADMIN_PASSWORD`, `CLIENT_PASSWORD` en
`FRONTEND_ORIGIN`. Dat voorkomt dat een klantomgeving per ongeluk met demo-wachtwoorden
online komt.

### Belangrijk voor echte klantdata

De huidige backend bewaart klantconfiguratie en snapshots nog in `server/data/db.json`.
Dat is prima voor lokale ontwikkeling en een demo, maar voor productie moet dit naar
Postgres/Supabase of een andere database met backups en toegangsbeheer.

De live Google connector gebruikt nu nog code uit de aparte `seo-dashboard` map. Voor
een echte deployment moet die connector-code mee in de backend-repository of als package
beschikbaar zijn. Tot die tijd wijst `SEO_DASHBOARD_PATH` naar de map met:

- `auth.py`
- `ga4_client.py`
- `search_console_client.py`

Voor een klantwaardige productieversie zijn daarna de volgende stappen nodig:

- Supabase/Postgres in plaats van `db.json`.
- Per klant eigen gebruikers en rollen.
- OAuth redirect URLs op het echte domein.
- Encrypted tokenopslag.
- Auditlog en backups buiten het lokale filesystem.

## Status

Dit prototype gebruikt representatieve voorbeelddata om de productrichting, workflows en
communicatievorm te tonen. De structuur is voorbereid op live koppelingen en klantdata.
