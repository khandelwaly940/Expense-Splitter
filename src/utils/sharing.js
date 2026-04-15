/**
 * Sharing utilities — URL compression (lz-string) and short-link creation
 * via a secure Cloudflare Worker proxy.
 *
 * Security model:
 *  - The OpenShortURL API key + domain ID live ONLY in the CF Worker as secrets.
 *  - The browser only knows the public proxy URL (VITE_SHORTLINK_PROXY_URL).
 *  - No sensitive credentials are ever embedded in the JS bundle.
 */
import LZString from 'lz-string';

// Proxy URL is hardcoded for convenience.
// Override with VITE_SHORTLINK_PROXY_URL env var if you self-host a different proxy.
const PROXY_URL =
  import.meta.env.VITE_SHORTLINK_PROXY_URL ||
  'https://expense-shortlink-proxy.khandelwaly940.workers.dev';

// ---------------------------------------------------------------------------
// Encoding / Decoding
// ---------------------------------------------------------------------------

/** Encode state to a compressed URI-safe string (lz-string). */
export function encodeState(payload) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

/** Decode a compressed `?d=` param. */
export function decodeCompressed(str) {
  const json = LZString.decompressFromEncodedURIComponent(str);
  if (!json) return null;
  return JSON.parse(json);
}

/** Decode a legacy base64 `?data=` param (backward compat). */
export function decodeLegacy(str) {
  return JSON.parse(atob(str));
}

/**
 * Load shared state from URL.
 * Priority: `?d=` (compressed, new) → `?data=` (legacy base64)
 * @returns {{ p: string[], e: object[], t?: string } | null}
 */
export function loadFromURL() {
  const params = new URLSearchParams(window.location.search);

  const compressed = params.get('d');
  if (compressed) {
    try { return decodeCompressed(compressed); }
    catch (e) { console.error('Failed to decode compressed share link', e); }
  }

  const legacy = params.get('data');
  if (legacy) {
    try { return decodeLegacy(legacy); }
    catch (e) { console.error('Failed to decode legacy share link', e); }
  }

  return null;
}

/** Build the full (compressed) share URL using `?d=`. */
export function buildFullShareURL(payload) {
  const encoded = encodeState(payload);
  return `${window.location.origin}${window.location.pathname}?d=${encoded}`;
}

// ---------------------------------------------------------------------------
// Short link creation via Cloudflare Worker proxy
// ---------------------------------------------------------------------------

/**
 * Create a short link via the secure proxy Worker.
 * The API key never leaves the Worker — this call is safe in the browser.
 *
 * @param {string} destinationUrl  - The full URL to shorten (the `?d=` URL)
 * @param {{ expiresInHours?: number|null, title?: string }} options
 * @returns {Promise<{ shortUrl: string, slug: string }>}
 */
export async function createShortLink(destinationUrl, { expiresInHours, title } = {}) {
  if (!PROXY_URL) {
    throw new Error(
      'Short-link proxy not configured. Add VITE_SHORTLINK_PROXY_URL to your .env file.\n' +
      'See shortlink-proxy/worker.js for setup instructions.'
    );
  }

  const body = { destination_url: destinationUrl };
  if (title) body.title = title;
  if (expiresInHours) body.expires_in_hours = expiresInHours;

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || `Proxy error (${res.status})`);
  }

  return { shortUrl: json.short_url, slug: json.slug };
}

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

/**
 * Copy text to clipboard with textarea fallback.
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* fall through */ }
  }

  // Fallback for older browsers / non-HTTPS
  const el = document.createElement('textarea');
  el.value = text;
  Object.assign(el.style, { position: 'fixed', left: '-9999px', top: '0' });
  document.body.appendChild(el);
  el.focus();
  el.select();
  try {
    document.execCommand('copy');
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(el);
  }
}
