# 🧮 Smart Expense Splitter

A fast, account-free expense splitting app. Your editable trips live in this browser. Sharing creates an immutable snapshot URL; generating a short link stores that destination URL (including its encoded bill data) in the self-hosted OpenShortURL database.

**Live:** [yashkhandelwal.me/Expense-Splitter](https://yashkhandelwal.me/Expense-Splitter/)

---

## Features

- ✅ **Split expenses** across any number of people with per-expense split control
- 🔗 **Share via URL** — full state compressed into a `?d=` query param (lz-string)
- ✂️ **Short links** — powered by [OpenShortURL](https://github.com/idhamsy/openshortlink) (self-hosted on Cloudflare Workers + D1)
- 💾 **Persistent** — multiple trips auto-save to `localStorage`, with a read-only inbox for shared snapshots
- 🔎 **Compare updates** — open a newer snapshot, review changes, then explicitly replace a local trip or save a separate copy
- 🧮 **Filter & sort** expenses, and share only a filtered partial bill if desired
- 💳 **Optional UPI links** — direct payment handoff, without payment recording or verification
- 📊 **Balance overview** with each person's paid amount, share and net balance
- 🧾 **Settlement engine** — Smart (fewest transactions) or Itemized modes
- 📋 **CSV export**
- 📱 **Responsive** — mobile card view + desktop table view
- 🌙 **Dark by default** — persistent light/dark switch in the sidebar and mobile navigation
- 🗂️ **Focused workspace** — Who pays whom and Detailed breakdown above an inline-editable expense log; optional Card / account repayments tab and more options beside Total spent
- 🔖 **Saved filter views** — named tabs per trip with multi-select conditions, AND/OR matching and view-only sharing; views never copy or replace the original bill
- ⌨️ **Keyboard-friendly dialogs** — focus stays inside the active form; Escape closes the calendar before closing the form

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
npm install
npm run dev       # → http://localhost:5173/Expense-Splitter/
```

Short-link generation is disabled by default in local dev so testing does not write to the live short-link database. Full snapshot links still work locally.

Use the same browser and origin (including port) to see your saved trips. For a received short link, open it in another tab and paste the final full URL into **Open a bill link**; this avoids switching away from your local workspace.

### Local review flow

1. Create a trip with a name and at least one person; it opens ready to log expenses. Cancel creates nothing. In Bill, use Add row and edit directly in the log. The date’s −/+ buttons move backward/forward one day without opening the calendar.
2. Click the trip title to rename it (Enter saves, Escape cancels), and the people circles to edit names/UPI details. Share from the header icon; use the three dots for CSV export and Card / account repayments visibility. The sidebar starts collapsed and includes an Appearance switch above Open a bill link; the theme and your last workspace screen/bill survive refresh. Browser Back/Forward follows navigation; opening a shared link takes priority.
3. Review the Smart and Detailed tabs inside Who pays whom. Smart has a right-aligned Smart / Itemized toggle. Detailed shows each person's Paid/Share bars immediately; expand Expense details to inspect individual expenses. Pay via UPI appears directly when available. There are no payment-recording controls, paid statuses or transaction-reference fields.
4. Sharing starts with Everyone and Entire bill; open Customize what’s shared for a person, current view, Repayment details or UPI IDs. Continue to sharing, then open Share Link. Choose Short link to generate one immediately, or Direct link to copy the full snapshot URL. New links have no expiry setting. Person-specific links automatically open a centred overview with their balance, available UPI payments, My expense logs and Full expense logs. My logs include expenses they paid toward or share in, including multi-payer contributions; this only filters the view. Full logs show everything included in the snapshot. General links open the normal bill view. This is not private access. UPI IDs remain opt-in. Make editable copy only when you need to edit expenses. Compare before replacing; partial snapshots offer Save separate copy as the primary action. Replacing requires an extra acknowledgement and remains undoable from the sidebar.
5. Shared snapshots are grouped by originating trip, not name. Open a group for its latest received version, or use the version selector; versions never merge automatically. Making a copy again offers your existing local trip. Removing a shared group removes all its saved versions, not editable copies or shared links. One sidebar recovery action survives refresh and restores the last local/shared removal or replacement; the next removal/replacement replaces this recovery point. Contextual ⓘ controls support hover, keyboard focus and mobile tap.
6. Use New view to save a named combination of filter conditions. Select multiple people/methods, include or exclude values, add amount/date ranges, and choose AND / OR between conditions (AND is the default; the choice applies to all conditions). Sharing from a named view defaults to only its matching expenses, including through Trip options. You can explicitly choose Entire bill. Blank conditions and reversed ranges cannot be saved. Trip totals above remain based on all expenses; explicitly editing a filtered row edits that original expense. Adding a row returns to All expenses so the new row is visible.

### People & expense log (Module 2)

- New rows are saved immediately as drafts until description, date, amount and payment contributions are valid. Drafts stay editable but are excluded from balances, repayments, CSV and shared snapshots.
- Paid by and Method use the same searchable selector as Split with. Choose **Add payment contribution** to enter multiple payer/method/amount lines for one expense. Contributions must sum to the total; changing a multi-payment total never redistributes them automatically.
- An empty split means payer-only: with multiple payers, each bears their own contribution. Contributions and shares are otherwise independent.
- Renaming a used person requires confirmation and updates expenses, saved filters and existing settlement references. Used people cannot be removed.
- Row removal has its own refresh-safe Undo, separate from workspace recovery. Only the most recent removed row per trip is recoverable.
- Card/account repayments support every contribution, grouped by payer and payment method. Full contribution is the default; explicitly saved own-share exclusions remain respected.
- Legacy settlement records are retained in local data for compatibility, but hidden and never included in new snapshots, even when old share options request them.
- Contribution snapshots use version 3; this client still reads legacy and version 2 links. Older deployed clients do not support version 3. Test new links on the local app until the separately approved production release.

Repayment row ⋯ offers Exclude my share, Custom amount and Log your expense. Each payer’s own share is allocated proportionally across their contributions, including contributions without a method. Deductions are capped at the contribution so repayment never becomes negative. Payer-only expenses repay ₹0 when own share is excluded. Custom amounts (including zero) and personal-log notes are independent per contribution; neither alters expense totals or settlement balances. Log your expense saves/copies a personal accounting note—it does not create another trip expense. Shared snapshots include these settings only when Repayment details is selected; read-only recipients can view/copy notes, not edit them.

Run `npm run lint`, `npm test`, and `npm run build` before local review. Build does not deploy. Production push and deployment require a separate approval.

**Opt in to a proxy URL** (prefer a local/test Worker):
```bash
# .env
VITE_SHORTLINK_PROXY_URL=https://your-proxy.workers.dev
```

---

## Project structure

```
Expense/
├── src/
│   ├── components/          # UI components
│   │   ├── ExpenseSplitter.jsx   # Main orchestrator
│   │   ├── BillWorkspace.jsx    # Expense log, forms and people
│   │   ├── ShareFlow.jsx        # Scope selection and snapshot links
│   │   ├── CompareDialog.jsx    # Review before replacement
│   │   ├── SettlementView.jsx
│   │   ├── RepayView.jsx
│   │   └── ...
│   ├── utils/
│   │   ├── sharing.js       # lz-string encode/decode + proxy client
│   │   ├── calculations.js  # Balance + settlement logic
│   │   ├── trips.js         # versioned workspace + snapshot migration
│   │   ├── filters.js       # expense filtering and sorting
│   │   └── csv.js
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
- Expense data is encoded, **not encrypted**, in share links. Anyone with a link can read the included bill data.
- Short links are created via your own self-hosted OpenShortURL instance
- Shared links are snapshots, not live collaboration. To update someone else's copy, send them a newly published link for comparison.
- OpenShortURL/D1 stores the destination URL for each short link, so do not include sensitive information in a share unless intended.
- Trip and snapshot data stays in this browser's `localStorage`; clearing browser storage removes local copies.
