# AeroOpt

AeroOpt is a travel-decision application that ranks flight offers by whole-journey value rather than ticket price alone. Its deterministic Travel Optimization Engine scores price, duration, layovers, reliability, baggage, schedule, airport convenience, flexibility, and connection risk on a transparent 0–100 scale.

> **GitHub description:** AI-powered flight search that ranks the best overall journey—not just the cheapest fare—using a transparent Travel Optimization Score.

## Architecture

| Layer | Implementation |
| --- | --- |
| Web app | React 19, Vinext/Next-compatible routes, TypeScript, Tailwind, shadcn primitives, TanStack Query, Zustand, Framer Motion |
| API | FastAPI, Pydantic, SQLAlchemy, Alembic |
| Data | PostgreSQL in production; SQLite for local quick-start/tests; Redis cache with a safe in-memory fallback |
| Flight data | `FlightProvider` abstraction with Amadeus and explicitly labelled development-only Demo adapters |
| AI | Server-side validated natural-language extraction. The deterministic optimizer never uses an LLM. |

## Local run

1. Copy `backend/.env.example` to `backend/.env`. For a no-credential local walkthrough, leave `ALLOW_DEMO_PROVIDER=true`.
2. Start the API:

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -e ".[dev]"
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
   ```

3. In another terminal, run the web app:

   ```powershell
   npm install
   npm run dev
   ```

Open `http://localhost:3000`. The application proxy forwards `/api/v1/*` to `BACKEND_API_URL` (default `http://localhost:8000/api/v1`).

### Hosted demo mode

The frontend includes a deterministic, server-side demo backend so the whole product can be explored without provider credentials or a database. When `BACKEND_API_URL` is not configured, the API route serves clearly labelled sample data:

- **Signed out:** `flights/search` and `airports` (flight ranking and airport lookup), plus `assistant/interpret`, which runs a transparent rule-based query parser — no LLM, matching the deterministic guarantee.
- **Demo account:** `auth/register` and `auth/login` start a session stored in an httpOnly cookie (no real credentials are checked or stored), unlocking `users/dashboard`, `saved-flights`, `alerts`, and `users/preferences` (preference edits persist in the cookie for that browser). `auth/refresh` restores the session and `auth/logout` clears it.

Nothing in demo mode persists beyond the visitor's browser. Configure a real `BACKEND_API_URL` to enable genuine authentication, database-backed saved flights and alerts, and live fares.

### Real fares (meta-search)

AeroOpt is a meta-search engine: it ranks real fares by whole-journey value, then hands off to the airline or OTA to complete the booking (no payments or ticket issuance run through AeroOpt). To switch the demo dataset for live fares:

1. Create free [Amadeus for Developers](https://developers.amadeus.com) Self-Service keys — the test environment needs no accreditation and no contract.
2. In `backend/.env`, set `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `FLIGHT_PROVIDER=amadeus`, and `ALLOW_DEMO_PROVIDER=false`. Keep `AMADEUS_BASE_URL=https://test.api.amadeus.com` for the free tier, or the production host once approved.
3. Restart the API. `/api/v1/flights/search` and `/api/v1/airports` now return live Amadeus content (the [Amadeus adapter](backend/app/providers/amadeus.py) normalizes it into the same scored offers).

The live adapter is covered by [tests](backend/tests/test_amadeus_provider.py) that mock the Amadeus responses, so its normalization is verified without live keys.

### Booking hand-off

Each ranked offer has a **Book** button that opens a partner site to complete the purchase — AeroOpt never sells or issues tickets. Configure the destination at build time (see [lib/booking.ts](lib/booking.ts)):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_BOOKING_PARTNER` | `skyscanner` (default), `google`, or `kayak` |
| `NEXT_PUBLIC_BOOKING_AFFILIATE_TEMPLATE` | Optional. A redirect URL containing `{url}`, replaced with the URL-encoded partner link so bookings are attributed to your affiliate account. |

For example, set `NEXT_PUBLIC_BOOKING_AFFILIATE_TEMPLATE=https://your-network.example/r?aid=YOUR_ID&url={url}` to monetise every hand-off without any code change.

For local PostgreSQL and Redis, run `docker compose up --build`; set `DATABASE_URL` and `REDIS_URL` as shown in `docker-compose.yml`.

## Configuration

| Variable | Required in production | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Managed PostgreSQL URL, using `postgresql+psycopg://` |
| `REDIS_URL` | Recommended | Shared cache for normalized flight searches |
| `JWT_SECRET` | Yes | At least 32 random characters |
| `CORS_ORIGINS` | Yes | Comma-separated allowed web origins |
| `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` | Yes for live flight data | Amadeus server credentials |
| `FLIGHT_PROVIDER=amadeus` | Yes for live flight data | Prevents development demo fares in production |
| `OPENAI_API_KEY` | Optional | Enables structured natural-language extraction only |
| `SMTP_*` | Optional | Sends price-alert email when a target is reached |
| `BACKEND_API_URL` | Yes for hosted frontend | API base URL, set as a frontend runtime secret |

Never expose provider, database, SMTP, JWT, or LLM credentials to client code. `ALLOW_DEMO_PROVIDER` must be `false` in production.

## Checks

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\ruff.exe check app tests

cd ..
npm run lint
npm run test:run
npm run build
```

Frontend unit tests use [Vitest](https://vitest.dev). Run `npm test` for the interactive watcher or `npm run test:run` for a single CI-style pass. End-to-end tests use [Playwright](https://playwright.dev): `npx playwright install chromium` once, then `npm run test:e2e` builds a production bundle, boots it in demo mode, and drives the flight-search, assistant, and demo-account flows in a real browser.

Every push and pull request runs the full matrix (frontend lint/unit/build, Playwright e2e, and backend ruff/pytest) via [GitHub Actions](.github/workflows/ci.yml).

## Deployment

### Vercel frontend

The repository supports a native Next.js build for Vercel while preserving the Vinext build used by OpenAI Sites:

```powershell
npm run build:vercel
vercel --prod
```

The deployed frontend automatically uses its deterministic demo flight-search backend when `BACKEND_API_URL` is not set. Configure `BACKEND_API_URL=https://<your-api-host>/api/v1` in Vercel to enable the full FastAPI service.

### One-click demo API

[Deploy the AeroOpt demo API on Render](https://render.com/deploy?repo=https://github.com/aneferez/AeroOpt)

The repository-level `render.yaml` provisions the Dockerized FastAPI service, generates a private JWT secret, runs database migrations at startup, and configures the hosted AeroOpt origin. It deliberately uses demo flight data and an ephemeral SQLite database for evaluation. After deployment, verify `<your-render-url>/api/v1/health`, then configure the frontend's `BACKEND_API_URL` as `<your-render-url>/api/v1`.

### Production deployment

1. Provision managed PostgreSQL and Redis (Neon/Supabase and Upstash are suitable free-tier starting points).
2. Deploy `backend/` to Render, Railway, Cloud Run, or an equivalent service using `backend/Dockerfile`. Set production variables, run `alembic upgrade head`, and expose `/api/v1/health` for health checks.
3. Set the frontend host's `BACKEND_API_URL` to the deployed API's `/api/v1` URL. The frontend proxy keeps API credentials and refresh cookies same-origin to the browser.
4. Configure Amadeus production credentials, set `FLIGHT_PROVIDER=amadeus`, and set `ALLOW_DEMO_PROVIDER=false`.
5. Schedule `python -m app.workers.price_alerts` every 30–60 minutes on the backend platform. Configure SMTP if email delivery is desired.

The project deliberately does not include ticket issuance, payments, hotel booking, or document storage. Flight prices must be revalidated with the provider immediately before any booking handoff.
