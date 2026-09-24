import test from 'node:test';
import assert from 'node:assert/strict';
import { expensesForPerson, upiForTransfer } from '../src/utils/personView.js';

test('personal logs union paid and shared expenses without duplicates or parent mutation', () => {
  const expenses = [
    { id: 'paid', paidBy: 'Ritika', splitAmong: ['John'] },
    { id: 'share', paidBy: 'John', splitAmong: ['Ritika'] },
    { id: 'both', paidBy: 'Ritika', splitAmong: ['Ritika', 'John'] },
    { id: 'multi', paidBy: 'John', payments: [{ paidBy: 'John' }, { paidBy: 'Ritika' }], splitAmong: [] },
    { id: 'other', paidBy: 'John', splitAmong: ['John'] },
  ];
  const before = JSON.stringify(expenses);
  assert.deepEqual(expensesForPerson(expenses, 'Ritika').map(e => e.id), ['paid', 'share', 'both', 'multi']);
  assert.deepEqual(expensesForPerson(expenses, 'Unknown'), []);
  assert.equal(JSON.stringify(expenses), before);
});

test('UPI links target the recipient with exact amount and reject unavailable details', () => {
  const trip = { name: 'Trip & dinner', people: [{ name: 'John', upiId: 'john@upi' }] };
  const tx = { from: 'Ritika', to: 'John', amount: 123.45 };
  const url = new URL(upiForTransfer(trip, tx));
  assert.equal(url.protocol, 'upi:');
  assert.equal(url.searchParams.get('pa'), 'john@upi');
  assert.equal(url.searchParams.get('am'), '123.45');
  assert.equal(url.searchParams.get('tn'), trip.name);
  assert.equal(upiForTransfer(trip, { ...tx, to: 'Unknown' }), null);
  assert.equal(upiForTransfer({ ...trip, people: [{ name: 'John', upiId: 'bad & id' }] }, tx), null);
  assert.equal(upiForTransfer(trip, { ...tx, amount: 0 }), null);
});
