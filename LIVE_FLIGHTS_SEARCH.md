# Live flights search (gfscrape)

MySky proxies live Google Flights searches through:

- `POST /api/live-search` → `${FLIGHTS_API_URL}/api/search`
- `GET /api/live-search/health` → `${FLIGHTS_API_URL}/api/health`

## Configure Vercel (mysky project only)

Set **Project → Settings → Environment Variables**:

| Name | Value |
|------|--------|
| `FLIGHTS_API_URL` | Base URL of the durable gfscrape FastAPI host, no trailing slash |

With the variable unset the code falls back to `http://72.62.212.33:8000`, the
VPS this ran on originally. Treat that as a fallback, not the answer: it is a
bare IP over plain HTTP, and it breaks the day the IP changes.

Do **not** point production at:

- the gfscrape Vercel frontend — it is a proxy/mock layer, not the scraper, so
  it either returns fixtures or forwards to its own `FLIGHTS_API_URL`
- ephemeral tunnels: `*.trycloudflare.com` quick tunnels, `*.loca.lt`, free
  `*.ngrok-free.app`. Their hostname is generated per run and stops resolving
  the moment the tunnel closes, which takes production down with no warning.

`lib/live-search-upstream.ts` recognises those hosts: it warns on every request
in production and, when one stops resolving, says so in the error the search
drawer shows instead of a bare 502.

## Giving gfscrape a permanent address

gfscrape needs a real browser (Playwright) and a warm cache, so it wants a
long-running host rather than a serverless function. It does not need a public
IP: a **named** Cloudflare tunnel gives a fixed hostname, free TLS, and survives
restarts and reboots — which is the part a quick tunnel does not do.

**Prerequisite:** the domain must be a zone in your Cloudflare account.
`cloudflared tunnel login` lists the zones you can pick from; if the domain is
not there, move its DNS to Cloudflare first (the free plan is enough).

On the machine that runs gfscrape:

```bash
# 1. authorise cloudflared and pick the zone (writes ~/.cloudflared/cert.pem)
cloudflared tunnel login

# 2. create the tunnel — prints a UUID and writes ~/.cloudflared/<UUID>.json
cloudflared tunnel create gfscrape

# 3. point a hostname at it (creates the CNAME for you)
cloudflared tunnel route dns gfscrape scrape.example.com
```

Then `~/.cloudflared/config.yml`:

```yaml
tunnel: <UUID from step 2>
credentials-file: /home/<user>/.cloudflared/<UUID>.json

ingress:
  - hostname: scrape.example.com
    service: http://localhost:8000
  - service: http_status:404
```

Test it in the foreground, then install it as a service so it comes back after
a reboot:

```bash
cloudflared tunnel run gfscrape      # ctrl-C once /api/health answers
sudo cloudflared service install      # systemd unit, starts on boot
```

Finally set `FLIGHTS_API_URL=https://scrape.example.com` in Vercel and redeploy.
Confirm with `GET /api/live-search/health` on mysky — it reports the upstream it
tried and whether that upstream is ephemeral.

Make sure gfscrape itself also restarts on boot (a systemd unit, or
`--restart unless-stopped` if it runs in Docker). A tunnel that survives a
reboot in front of a scraper that does not is the same outage with extra steps.

**The hostname is public.** Anyone who finds it can drive your scraper and get
the host rate-limited or blocked upstream. Put Cloudflare Access in front of it,
or require a shared secret header that mysky's proxy sends and gfscrape checks.

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
