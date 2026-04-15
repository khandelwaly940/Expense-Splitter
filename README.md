# 🧮 Smart Expense Splitter

A fast, beautiful, privacy-first expense splitting app. No accounts, no servers, no data stored on anyone's servers — everything lives in your browser or in a shareable URL.

**Live:** [yashkhandelwal.me/Expense-Splitter](https://yashkhandelwal.me/Expense-Splitter/)

---

## Features

- ✅ **Split expenses** across any number of people with per-expense split control
- 🔗 **Share via URL** — full state compressed into a `?d=` query param (lz-string)
- ✂️ **Short links** — powered by [OpenShortURL](https://openshortlink.khandelwaly940.workers.dev) (self-hosted on Cloudflare Workers + D1)
- 💾 **Persistent** — auto-saves to `localStorage`, survives page refresh
- 📊 **Balance sheet** with per-person bar charts (paid vs. owed)
- 🧾 **Settlement engine** — Smart (fewest transactions) or Itemized modes
- 📋 **CSV export**
- 📱 **Responsive** — mobile card view + desktop table view
- ⌨️ **Keyboard shortcuts** — `Ctrl+N` new row, `Ctrl+S` share

---

## How sharing works

```
Browser  →  POST (share data)  →  expense-shortlink-proxy (CF Worker)
                                        ↓  (service binding, internal)
                                  openshortlink (CF Worker + D1)
                                        ↓
                              ← { short_url: "https://..." }
```

- The **short-link proxy** (`shortlink-proxy/`) is a thin Cloudflare Worker that:
  - Holds your API key as an **encrypted Worker Secret** — never in source code
  - Enforces CORS — only accepts requests from allowed domains
  - Rate-limits to **10 short links per IP per hour** (Cloudflare Cache API, free tier)
  - Calls the OpenShortURL Worker via a **service binding** (no public internet hop)

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Compression | lz-string |
| Short links | Self-hosted [OpenShortURL](https://openshortlink.khandelwaly940.workers.dev) |
| Proxy | Cloudflare Workers (free tier) |
| Hosting | GitHub Pages via `gh-pages` |

---

## Local development

```bash
cd Expense
npm install
npm run dev       # → http://localhost:5174/Expense-Splitter/
```

Short-link generation works in local dev because the proxy URL is hardcoded  
(calls `expense-shortlink-proxy.khandelwaly940.workers.dev` which allows localhost).

**Override the proxy URL** (e.g. for self-hosting):
```bash
# .env
VITE_SHORTLINK_PROXY_URL=https://your-proxy.workers.dev
```

---

## Deploy to GitHub Pages

Push to `main` → GitHub Actions builds and deploys automatically.

**One-time setup:**
1. Enable GitHub Pages → Source: `gh-pages` branch
2. No secrets needed — the proxy URL is hardcoded in the source

See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

---

## Project structure

```
Expense/
├── src/
│   ├── components/          # UI components
│   │   ├── ExpenseSplitter.jsx   # Main orchestrator
│   │   ├── Header.jsx
│   │   ├── ShareModal.jsx
│   │   └── ...
│   ├── utils/
│   │   ├── sharing.js       # lz-string encode/decode + proxy client
│   │   ├── calculations.js  # Balance + settlement logic
│   │   └── csv.js
│   └── hooks/
│       └── usePersistedState.js
├── shortlink-proxy/         # Cloudflare Worker proxy
│   ├── worker.js            # Proxy source
│   └── wrangler.toml        # CF Worker config (service binding, etc.)
└── .github/workflows/
    └── deploy.yml           # Auto-deploy to GitHub Pages
```

---

## Self-hosting the proxy

See [`shortlink-proxy/README.md`](shortlink-proxy/README.md) for full setup instructions including:
- Deploying the proxy Worker
- Setting Worker secrets
- Configuring allowed origins
- Rate limit configuration

---

## Privacy

- No user accounts, no tracking
- Expense data never leaves your device except as a compressed URL you control
- Short links are created via your own self-hosted OpenShortURL instance
- `localStorage` is used only for auto-save; cleared on reset
