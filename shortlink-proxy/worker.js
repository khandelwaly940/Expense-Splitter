/**
 * Cloudflare Worker — Expense Splitter Short-Link Proxy
 *
 * This Worker acts as a secure server-side proxy for creating short links
 * via the OpenShortURL API. The API key and Domain ID are stored as
 * encrypted Worker Secrets — they are NEVER sent to the browser.
 *
 * ── Deploy ────────────────────────────────────────────────────────────────
 * 1. Install Wrangler:  npm install -g wrangler
 * 2. Login:             wrangler login
 * 3. Create the worker: wrangler deploy shortlink-proxy/worker.js --name expense-shortlink-proxy
 * 4. Set secrets:
 *      wrangler secret put OPENSHORT_API_KEY
 *      wrangler secret put OPENSHORT_DOMAIN_ID
 *      wrangler secret put ALLOWED_ORIGINS   (comma-separated, e.g.:
 *        "https://yashkhandelwal.me,https://khandelwaly940.github.io,http://localhost:5173,http://localhost:5174")
 *
 * Your Worker URL will be:
 *   https://expense-shortlink-proxy.<your-cf-subdomain>.workers.dev
 *
 * Put ONLY this URL in your app's .env:
 *   VITE_SHORTLINK_PROXY_URL=https://expense-shortlink-proxy.<subdomain>.workers.dev
 * ──────────────────────────────────────────────────────────────────────────
 */

// Full URL for the OpenShortURL API endpoint.
// Used both for service binding calls (internal) and public fetch fallback (local dev).
const OPENSHORT_API = 'https://openshortlink.khandelwaly940.workers.dev/dashboard/api/v1/links';

export default {
  async fetch(request, env) {
    // ALLOWED_ORIGINS is a comma-separated list stored as a Worker Secret, e.g.:
    // "https://yashkhandelwal.me,https://khandelwaly940.github.io,http://localhost:5173,http://localhost:5174"
    const allowedOrigins = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);

    const origin = request.headers.get('Origin') || '';
    const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);

    // ── CORS preflight ──────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, isAllowed ? origin : '');
    }

    // ── Diagnostic GET (no secrets exposed) ─────────────────────────────
    if (request.method === 'GET') {
      return corsResponse(JSON.stringify({
        ok: true,
        secrets: {
          api_key: !!env.OPENSHORT_API_KEY,
          domain_id: !!env.OPENSHORT_DOMAIN_ID,
          allowed_origins: !!env.ALLOWED_ORIGINS,
        },
        origin,
        is_allowed: isAllowed,
      }), 200, isAllowed ? origin : '*');
    }

    // ── Only allow POST ─────────────────────────────────────────────────
    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, isAllowed ? origin : '');
    }

    // ── Origin check ────────────────────────────────────────────────────
    if (!isAllowed) {
      return corsResponse(JSON.stringify({ error: 'Forbidden origin' }), 403, '');
    }

    // ── Rate limiting (10 short links / IP / hour) ───────────────────────
    // Uses the Cloudflare Cache API — free tier, no KV needed.
    // Note: per-datacenter, not global — generous enough for a personal app.
    const RATE_LIMIT = Number(env.RATE_LIMIT_PER_HOUR || 10);
    const clientIpForRateLimit = request.headers.get('cf-connecting-ip') || 'unknown';
    const hourSlot = Math.floor(Date.now() / 3_600_000); // changes each hour
    const rateLimitKey = new Request(
      `https://rate-limit.internal/shortlink/${clientIpForRateLimit}/${hourSlot}`
    );
    const cache = caches.default;
    const cached = await cache.match(rateLimitKey);
    const currentCount = cached ? parseInt(await cached.text(), 10) : 0;

    if (currentCount >= RATE_LIMIT) {
      return corsResponse(
        JSON.stringify({ error: `Rate limit exceeded: max ${RATE_LIMIT} short links per hour per IP.` }),
        429,
        origin
      );
    }

    // Increment counter — TTL aligns to end of current hour
    const secondsLeftInHour = 3600 - (Math.floor(Date.now() / 1000) % 3600);
    await cache.put(
      rateLimitKey,
      new Response(String(currentCount + 1), {
        headers: { 'Cache-Control': `max-age=${secondsLeftInHour}` },
      })
    );

    // ── Parse body ──────────────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON body' }), 400, origin);
    }

    const { destination_url, expires_in_hours, title } = body;

    if (!destination_url || typeof destination_url !== 'string') {
      return corsResponse(JSON.stringify({ error: 'destination_url is required' }), 400, origin);
    }

    // ── Destination URL allowlist ────────────────────────────────────────
    // Even if someone spoofs the Origin header and calls this proxy directly,
    // they can only create short links that point back to our own domains.
    // Redirecting to external/malicious URLs is therefore impossible.
    const ALLOWED_DESTINATIONS = (env.ALLOWED_DESTINATIONS || '')
      .split(',')
      .map(d => d.trim())
      .filter(Boolean);

    // Fallback hardcoded list — used when env var is not set (e.g. local dev without .dev.vars)
    const DEFAULT_DESTINATIONS = [
      'https://yashkhandelwal.me',
      'https://khandelwaly940.github.io',
      'http://localhost:5173',
      'http://localhost:5174',
    ];

    const destinationAllowlist = ALLOWED_DESTINATIONS.length > 0 ? ALLOWED_DESTINATIONS : DEFAULT_DESTINATIONS;

    const isDestinationAllowed = destinationAllowlist.some(d => destination_url.startsWith(d));
    if (!isDestinationAllowed) {
      return corsResponse(
        JSON.stringify({ error: 'Forbidden destination: short links may only point to allowed domains.' }),
        403,
        origin
      );
    }

    // ── Build request payload ────────────────────────────────────────────
    const payload = { domain_id: env.OPENSHORT_DOMAIN_ID, destination_url };
    if (title) payload.title = String(title).slice(0, 255);
    if (expires_in_hours) {
      payload.expires_at = Math.floor(Date.now() / 1000) + Number(expires_in_hours) * 3600;
    }

    // ── POST to OpenShortURL Worker via Service Binding (no public internet hop) ──
    let apiRes, apiJson;
    try {
      // env.OPENSHORT_WORKER is a service binding — direct internal Worker call.
      // Falls back to public URL if binding is unavailable (e.g. local dev).
      const target = env.OPENSHORT_WORKER
        ? env.OPENSHORT_WORKER
        : { fetch: (url, init) => fetch(url, init) };

      // Forward the client's real IP so the OpenShortURL auth middleware
      // can identify the caller (it requires cf-connecting-ip).
      const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';

      apiRes = await target.fetch(OPENSHORT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENSHORT_API_KEY}`,
          'CF-Connecting-IP': clientIp,
        },
        body: JSON.stringify(payload),
      });
      apiJson = await apiRes.json();
    } catch (fetchErr) {
      return corsResponse(
        JSON.stringify({ error: `Upstream fetch failed: ${fetchErr?.message || fetchErr}` }),
        502,
        origin
      );
    }

    if (!apiJson.success) {
      const msg = apiJson.error?.message || 'Failed to create short link';
      const detail = msg.toLowerCase().includes('csrf')
        ? 'OpenShortURL CSRF not bypassed for API key auth.'
        : msg;
      return corsResponse(JSON.stringify({ error: detail }), apiRes.status, origin);
    }

    // ── Extract short URL from response ──────────────────────────────────
    const link = apiJson.data;
    const domainName = link.domain_name || 'openshortlink.khandelwaly940.workers.dev';

    let route = '/go';
    try {
      const meta = typeof link.metadata === 'string' ? JSON.parse(link.metadata) : link.metadata;
      route = (meta?.route || '/go/*').replace('/*', '');
    } catch {}

    const shortUrl = `https://${domainName}${route}/${link.slug}`;

    return corsResponse(
      JSON.stringify({ success: true, short_url: shortUrl, slug: link.slug }),
      200,
      origin
    );
  },
};

// ── Helper ──────────────────────────────────────────────────────────────────
function corsResponse(body, status, allowedOrigin) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
