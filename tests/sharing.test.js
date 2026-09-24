import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeState, decodeCompressed, parseShareURL } from '../src/utils/sharing.js';
import { tripFromShare } from '../src/utils/trips.js';

globalThis.window = { location: { origin: 'http://localhost:5173' } };

test('versioned snapshot links round-trip and reject other origins', () => {
  const payload = { v: 2, trip: { name: 'Goa', participants: ['John'], expenses: [{ id: 'a', amount: 100 }] }, partial: false };
  const encoded = encodeState(payload);
  assert.deepEqual(decodeCompressed(encoded), payload);
  assert.deepEqual(parseShareURL(`http://localhost:5173/Expense-Splitter/?d=${encoded}`), payload);
  assert.deepEqual(parseShareURL(`https://yashkhandelwal.me/Expense-Splitter?d=${encoded}`), payload);
  assert.equal(parseShareURL(`https://yashkhandelwal.me.evil.example/Expense-Splitter/?d=${encoded}`), null);
});

test('old compressed and base64 bill links still become readable trips', () => {
  const oldBill = { t: 'Older bill', p: ['Yash', 'Ritika'], pm: ['UPI'], e: [{ id: 1720000000000, date: '2025-07-01', item: 'Dinner', amount: 400, paidBy: 'Yash', splitAmong: ['Yash', 'Ritika'], paymentMethod: 'UPI' }] };
  const compressed = parseShareURL(`https://yashkhandelwal.me/Expense-Splitter/?d=${encodeState(oldBill)}`);
  const base64 = parseShareURL(`https://yashkhandelwal.me/Expense-Splitter/?data=${encodeURIComponent(btoa(JSON.stringify(oldBill)))}`);
  for (const payload of [compressed, base64]) {
    const trip = tripFromShare(payload);
    assert.equal(trip.name, oldBill.t);
    assert.deepEqual(trip.participants, oldBill.p);
    assert.deepEqual(trip.paymentMethods, oldBill.pm);
    assert.deepEqual(trip.expenses[0].splitAmong, oldBill.e[0].splitAmong);
  }
});
