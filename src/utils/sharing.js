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

// Local development must opt in to a proxy to avoid writing test links to live D1.
// Production uses the configured URL or the existing deployed proxy.
const PROXY_URL =
  import.meta.env?.VITE_SHORTLINK_PROXY_URL ||
  (import.meta.env?.DEV ? '' : 'https://expense-shortlink-proxy.khandelwaly940.workers.dev');

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
  return parseShareURL(window.location.href);
}

/** Parse a full share URL; never follow a pasted URL or fetch its contents. */
export function parseShareURL(input) {
  let url;
  try { url = new URL(input); } catch { return null; }
  const validOrigin = url.origin === window.location.origin || ['https://yashkhandelwal.me', 'https://khandelwaly940.github.io'].includes(url.origin);
  if (!validOrigin || !['/Expense-Splitter', '/Expense-Splitter/'].includes(url.pathname)) return null;
  const params = url.searchParams;

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
 * @param {{ title?: string }} options
 * @returns {Promise<{ shortUrl: string, slug: string }>}
 */
export async function createShortLink(destinationUrl, { title } = {}) {
  if (!PROXY_URL) {
    throw new Error(
      'Short links are disabled in this local preview to avoid writing to the live service. You can still copy the full snapshot link.'
    );
  }

  const body = { destination_url: destinationUrl };
  if (title) body.title = title;

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok || !json.success || typeof json.short_url !== 'string' || !json.short_url.startsWith('https://')) {
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
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(el);
  }
}
