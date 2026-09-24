import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBalances, calculateSmartSettlements, calculateItemizedSettlements, calculateRepayments } from '../src/utils/calculations.js';

test('original balance and settlement results remain unchanged for subset splits', () => {
  const participants = ['John', 'Mohan', 'Yash'];
  const expenses = [
    { amount: 600, paidBy: 'John', splitAmong: participants, item: 'Dinner' },
    { amount: 200, paidBy: 'Mohan', splitAmong: ['Mohan', 'Yash'], item: 'Cab' },
  ];
  const balances = calculateBalances(participants, expenses);
  assert.deepEqual(balances, [{ name: 'John', paid: 600, share: 200, balance: 400 }, { name: 'Mohan', paid: 200, share: 300, balance: -100 }, { name: 'Yash', paid: 0, share: 300, balance: -300 }]);
  assert.deepEqual(calculateSmartSettlements(balances).map(({ from, to, amount }) => [from, to, amount]), [['Yash', 'John', 300], ['Mohan', 'John', 100]]);
  assert.deepEqual(calculateItemizedSettlements(participants, expenses).map(({ from, to, amount }) => [from, to, amount]), [['Mohan', 'John', 200], ['Yash', 'John', 200], ['Yash', 'Mohan', 100]]);
});

test('payer-only expenses repay zero when own share is excluded, as in the original MVP', () => {
  const expense = { id: 'solo', amount: 1200, paidBy: 'John', splitAmong: ['John'], paymentMethod: 'Card', includeOwnShare: false };
  assert.equal(calculateRepayments([expense])[0].amount, 0);
  assert.equal(calculateRepayments([{ ...expense, includeOwnShare: true }])[0].amount, 1200);
});
