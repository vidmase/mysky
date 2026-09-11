# Live flights search (gfscrape)

MySky proxies live Google Flights searches through:

- `POST /api/live-search` → `${FLIGHTS_API_URL}/api/search`
- `GET /api/live-search/health` → `${FLIGHTS_API_URL}/api/health`

## Configure Vercel (mysky project only)

Set **Project → Settings → Environment Variables**:

| Name | Value |
|------|--------|
| `FLIGHTS_API_URL` | Base URL of the durable gfscrape FastAPI host (no trailing slash) |

Do **not** point production at:

- the gfscrape Vercel frontend (mock-only), unless you intentionally want fixtures
- ephemeral tunnels (`*.loca.lt`, temporary cloudflared URLs)

## Upstream API shape

Compatible with `vidmase/gfscrape` FastAPI:

- Health includes `fetch_mode`, `playwright_available`, `cache_size`, `allow_mock_fallback`
- Search `current_status`: `success` | `empty` | `error` | `mock`
- Mock is returned only when the backend has `ALLOW_MOCK_FALLBACK=1` / `USE_MOCK_FLIGHTS=1`

See gfscrape README → **Robust live backend**.

## Local smoke test

```bash
# Terminal A — gfscrape FastAPI
cd ../gfscrape && source .venv/bin/activate
export FLIGHTS_FETCH_MODE=fallback ALLOW_MOCK_FALLBACK=0
uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend

# Terminal B — optional public tunnel for Vercel preview only
npx --yes localtunnel --port 8000
# then temporarily set FLIGHTS_API_URL to the tunnel URL on a preview env
```
