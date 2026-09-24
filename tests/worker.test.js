import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../shortlink-proxy/worker.js';

const env = { ALLOWED_ORIGINS: 'https://yashkhandelwal.me', OPENSHORT_API_KEY: 'test', OPENSHORT_DOMAIN_ID: 'test' };
globalThis.caches = { default: { match: async () => null, put: async () => {} } };

test('disallowed origin preflight has no permissive CORS header', async () => {
  const response = await worker.fetch(new Request('https://proxy.example', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env);
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

test('lookalike destination host is rejected before upstream call', async () => {
  const response = await worker.fetch(new Request('https://proxy.example', { method: 'POST', headers: { Origin: 'https://yashkhandelwal.me', 'Content-Type': 'application/json' }, body: JSON.stringify({ destination_url: 'https://yashkhandelwal.me.evil.example/Expense-Splitter/?d=test' }) }), env);
  assert.equal(response.status, 403);
});

test('allowed destination uses the service binding and returns the short URL', async () => {
  const binding = { fetch: async (_url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer test');
    const payload = JSON.parse(init.body);
    assert.equal(payload.destination_url, 'https://yashkhandelwal.me/Expense-Splitter/?d=test');
    assert.equal(payload.expires_at, undefined);
    return new Response(JSON.stringify({ success: true, data: { domain_name: 'short.example', metadata: { route: '/r/*' }, slug: 'abc' } }), { status: 201 });
  } };
  const response = await worker.fetch(new Request('https://proxy.example', { method: 'POST', headers: { Origin: 'https://yashkhandelwal.me', 'Content-Type': 'application/json' }, body: JSON.stringify({ destination_url: 'https://yashkhandelwal.me/Expense-Splitter/?d=test', expires_in_hours: 72 }) }), { ...env, OPENSHORT_WORKER: binding });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).short_url, 'https://short.example/r/abc');
});
