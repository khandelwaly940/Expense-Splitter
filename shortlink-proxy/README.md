# Expense Shortlink Proxy — Setup & Maintenance

A thin Cloudflare Worker that securely proxies short-link creation requests
from the Expense Splitter app to the self-hosted OpenShortURL API.

## Architecture

```
Browser  →  POST  →  expense-shortlink-proxy (this Worker)
                            ↓  service binding (internal, free)
                       openshortlink Worker (OpenShortURL)
                            ↓  D1 database
                      ← { short_url }
```

## One-time deploy

```bash
# 1. Install Wrangler
npm install -g wrangler
wrangler login

# 2. Deploy worker
cd shortlink-proxy
wrangler deploy

# 3. Set encrypted secrets (never stored in code)
wrangler secret put OPENSHORT_API_KEY    # your sk_live_... key
wrangler secret put OPENSHORT_DOMAIN_ID  # domain_xxxxx
wrangler secret put ALLOWED_ORIGINS      # comma-separated URLs (see below)
```

### ALLOWED_ORIGINS value
```
https://yashkhandelwal.me,https://khandelwaly940.github.io,http://localhost:5173,http://localhost:5174
```

## Configuration

| Secret | Required | Default | Description |
|--------|----------|---------|-------------|
| `OPENSHORT_API_KEY` | ✅ | — | Bearer token for OpenShortURL API |
| `OPENSHORT_DOMAIN_ID` | ✅ | — | Domain ID to create links under |
| `ALLOWED_ORIGINS` | ✅ | — | Comma-separated allowed request origins |
| `ALLOWED_DESTINATIONS` | ❌ | hardcoded in worker.js | Comma-separated destination domain prefixes; short links may only point to these |
| `RATE_LIMIT_PER_HOUR` | ❌ | `10` | Max short links per IP per hour |

## Local development

```bash
# Create .dev.vars (gitignored — never commit this)
cat > .dev.vars << 'EOF'
OPENSHORT_API_KEY=sk_live_...
OPENSHORT_DOMAIN_ID=domain_...
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
EOF

wrangler dev
```

## Updating the proxy

```bash
# Edit worker.js, then:
wrangler deploy
# Secrets persist automatically — no need to re-set them
```

## Checking secrets are set

```bash
wrangler secret list
```

## Testing the deployed proxy

```bash
# Health check (GET)
curl https://expense-shortlink-proxy.khandelwaly940.workers.dev

# Create a short link (POST)
curl -s -X POST https://expense-shortlink-proxy.khandelwaly940.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5174" \
  -d '{"destination_url":"https://example.com","title":"Test"}'
```
