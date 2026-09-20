# Live flights search (gfscrape)

MySky proxies live Google Flights searches through:

- `POST /api/live-search` → `<upstream>/api/search`
- `GET /api/live-search/health` → `<upstream>/api/health`

`<upstream>` is not a single address but the first candidate that answers — see
**Addresses and failover** below.

## Configure Vercel (mysky project only)

Set **Project → Settings → Environment Variables**:

| Name | Value |
|------|--------|
| `FLIGHTS_API_URL` | Preferred base URL of the durable gfscrape FastAPI host, no trailing slash |
| `FLIGHTS_API_URLS` | Optional: more base URLs, comma-separated, tried in order after `FLIGHTS_API_URL` |
| `FLIGHTS_API_TIMEOUT_MS` | Optional: ceiling for one upstream call (default 90000; the health probe uses 10000) |

With both unset the code falls back to `DURABLE_UPSTREAMS` in
`lib/live-search-upstream.ts` — currently `http://72.62.212.33:8000`, the VPS this
ran on originally. Treat that as a fallback, not the answer: it is a bare IP over
plain HTTP, and it breaks the day the IP changes.

Do **not** leave production pointed *only* at:

- the gfscrape Vercel frontend — it is a proxy/mock layer, not the scraper, so
  it either returns fixtures or forwards to its own `FLIGHTS_API_URL`
- ephemeral tunnels: `*.trycloudflare.com` quick tunnels, `*.loca.lt`, free
  `*.ngrok-free.app`. Their hostname is generated per run and stops resolving
  the moment the tunnel closes.

## Addresses and failover

A single address is a single point of failure, and that is exactly how live
search broke: `FLIGHTS_API_URL` sat on a quick tunnel whose hostname stopped
resolving, and every search returned a 502 until someone noticed. So the proxy
treats the upstream as a candidate list and does the obvious thing with it:

1. Try the candidates in order — `FLIGHTS_API_URL`, then `FLIGHTS_API_URLS`, then
   the durable fallbacks.
2. Remember the one that answered and prefer it for the next ten minutes, so the
   common path is one call to the healthy host.
3. Bench a candidate that fails at the network level (or a tunnel host answering
   with a 5xx, which is what a closed quick tunnel looks like once something else
   holds its hostname) for two minutes, so one dead address does not add its
   failure to every request. When *every* candidate is benched the bench is
   treated as the stale opinion and the list is tried again from the top.
4. Report what happened rather than swallowing it: the 502 body carries one line
   per attempt (which is what the search drawer shows), `/api/live-search/health`
   adds `upstream`, `candidates` and `failoverFrom`, and every proxied response
   carries `x-live-search-upstream`.

Nothing here needs a redeploy when an address changes: add or replace it in the
environment, or point `FLIGHTS_API_URLS` at a second host so there are two.

## Monitoring

`GET /api/live-search/health` is the one endpoint worth watching — it answers
`ok: true/false`, and `failoverFrom` being non-empty means the address in the
environment is *not* the one serving traffic:

```bash
curl -s https://mysky.daugvila.lt/api/live-search/health | jq '{ok, upstream, failoverFrom}'
```

A daily check is enough (a dead scraper does not self-heal, and the VPS needs a
reboot when it does). Any scheduler will do — a GitHub Actions workflow with a
`curl --fail`, Uptime Kuma, or a cron entry — and the failure mode to alarm on is
`ok: false`, not a non-200, since a reachable-but-erroring scraper also matters.

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
