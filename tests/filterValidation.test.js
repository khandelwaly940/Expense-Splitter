import test from 'node:test';
import assert from 'node:assert/strict';
import { filterError } from '../src/utils/filters.js';

test('saved filters reject empty conditions and invalid ranges', () => {
  const error = rule => filterError({ rules: [rule] });
  assert.ok(filterError({ rules: [] }));
  assert.ok(error({ field: 'paidBy', values: [] }));
  assert.ok(error({ field: 'description', value: ' ' }));
  assert.ok(error({ field: 'amount', from: '', to: '' }));
  assert.ok(error({ field: 'amount', from: '100', to: '20' }));
  assert.ok(error({ field: 'date', from: '2026-02-31', to: '' }));
  assert.ok(error({ field: 'date', from: '2026-09-20', to: '2026-09-01' }));
  assert.equal(error({ field: 'amount', from: 0, to: '' }), '');
  assert.equal(error({ field: 'date', from: '2026-09-01', to: '' }), '');
  assert.equal(error({ field: 'method', values: [''] }), '');
  assert.equal(error({ field: 'splitWith', operator: 'none', values: [] }), '');
});
