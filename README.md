# AeroOpt

AeroOpt is a travel-decision application that ranks flight offers by whole-journey value rather than ticket price alone. Its deterministic Travel Optimization Engine scores price, duration, layovers, reliability, baggage, schedule, airport convenience, flexibility, and connection risk on a transparent 0–100 scale.

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
npm run build
```

## Deployment

1. Provision managed PostgreSQL and Redis (Neon/Supabase and Upstash are suitable free-tier starting points).
2. Deploy `backend/` to Render, Railway, Cloud Run, or an equivalent service using `backend/Dockerfile`. Set production variables, run `alembic upgrade head`, and expose `/api/v1/health` for health checks.
3. Set the frontend host's `BACKEND_API_URL` to the deployed API's `/api/v1` URL. The frontend proxy keeps API credentials and refresh cookies same-origin to the browser.
4. Configure Amadeus production credentials, set `FLIGHT_PROVIDER=amadeus`, and set `ALLOW_DEMO_PROVIDER=false`.
5. Schedule `python -m app.workers.price_alerts` every 30–60 minutes on the backend platform. Configure SMTP if email delivery is desired.

The project deliberately does not include ticket issuance, payments, hotel booking, or document storage. Flight prices must be revalidated with the provider immediately before any booking handoff.
