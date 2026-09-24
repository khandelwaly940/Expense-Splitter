import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBalances, calculateSmartSettlements, calculateItemizedSettlements, calculateRepayments } from '../src/utils/calculations.js';
import { paymentsFor, updateExpenseField, expenseIssues, readyExpenses, expenseTotal, removeExpense, undoExpenseRemoval } from '../src/utils/expenses.js';
import { buildSnapshot, tripFromShare, normalizeTrip, financialBasis, settlementKey, renameTripPeople, loadWorkspace, saveWorkspace } from '../src/utils/trips.js';
import { buildExpenseCSV } from '../src/utils/csv.js';
import { filterExpenses, emptyFilters } from '../src/utils/filters.js';

const people = ['Yash', 'Ritika', 'Mohan'];
const expense = () => ({ id: 'dinner', entryVersion: 2, item: 'Dinner', date: '2026-09-20', amount: 1500, paidBy: 'Yash', splitAmong: people, payments: [
  { id: 'a', paidBy: 'Yash', paymentMethod: 'UPI', amount: 600 },
  { id: 'b', paidBy: 'Yash', paymentMethod: 'Card', amount: 400 },
  { id: 'c', paidBy: 'Ritika', paymentMethod: 'Cash', amount: 500 },
] });
const trip = expenses => normalizeTrip({ id: 'trip', name: 'Trip', participants: people, people: people.map((name, i) => ({ id: String(i), name, upiId: `${name}@upi` })), expenses });

test('multiple payers and methods fund one independently split expense', () => {
  const e = expense(), before = JSON.stringify(e);
  assert.deepEqual(calculateBalances(people, [e]), [
    { name: 'Yash', paid: 1000, share: 500, balance: 500 },
    { name: 'Ritika', paid: 500, share: 500, balance: 0 },
    { name: 'Mohan', paid: 0, share: 500, balance: -500 },
  ]);
  const smart = calculateSmartSettlements(calculateBalances(people, [e]));
  assert.equal(smart.length, 1); assert.equal(smart[0].from, 'Mohan'); assert.equal(smart[0].to, 'Yash'); assert.equal(smart[0].amount, 500);
  const itemized = calculateItemizedSettlements(people, [e]);
  const net = Object.fromEntries(people.map(p => [p, 0]));
  itemized.forEach(t => { net[t.from] -= t.amount; net[t.to] += t.amount; });
  assert.ok(Math.abs(net.Yash - 500) < .00001); assert.ok(Math.abs(net.Ritika) < .00001); assert.ok(Math.abs(net.Mohan + 500) < .00001);
  assert.equal(itemized.find(t => t.from === 'Mohan' && t.to === 'Yash').items.length, 1);
  assert.equal(JSON.stringify(e), before);
});

test('empty multi-payer split assigns each payer their own contribution, no debt', () => {
  const e = { ...expense(), splitAmong: [] };
  assert.deepEqual(calculateBalances(people, [e]).map(b => b.balance), [0, 0, 0]);
  assert.deepEqual(calculateItemizedSettlements(people, [e]), []);
});

test('unbalanced and incomplete drafts stay out of every financial output', () => {
  const valid = expense();
  const drafts = [
    { ...valid, id: 'd1', item: '' }, { ...valid, id: 'd2', date: '2026-02-31' },
    { ...valid, id: 'd3', amount: 1600 }, { ...valid, id: 'd4', amount: -1 },
    { ...valid, id: 'd5', payments: [] }, { ...valid, id: 'd6', payments: [{ paidBy: 'Yash', amount: '1500.001' }] },
  ];
  assert.deepEqual(readyExpenses(drafts), []);
  assert.equal(expenseTotal([valid, ...drafts]), 1500);
  assert.deepEqual(calculateBalances(people, drafts).map(b => b.balance), [0, 0, 0]);
  assert.deepEqual(calculateItemizedSettlements(people, drafts), []);
  assert.deepEqual(calculateRepayments(drafts), []);
  const shared = buildSnapshot(trip([valid, ...drafts]), [], {});
  assert.equal(shared.trip.expenses.length, 1);
  assert.equal(buildExpenseCSV([valid, ...drafts]).split('\n').length, 2);
});

test('single payment follows total changes; multiple contributions never redistribute', () => {
  const legacy = { ...expense(), payments: undefined, amount: 100 };
  const changed = updateExpenseField(legacy, 'amount', 200);
  assert.equal(paymentsFor(changed)[0].amount, 200);
  const single = updateExpenseField(legacy, 'payments', [{ id: 'one', paidBy: 'Yash', amount: 100 }]);
  assert.equal(updateExpenseField(single, 'amount', 250).payments[0].amount, 250);
  const multi = updateExpenseField(expense(), 'amount', 2000);
  assert.deepEqual(multi.payments, expense().payments);
  assert.ok(expenseIssues(multi).payments);
});

test('paise validation accepts decimal sums without floating-point mismatches', () => {
  const e = { ...expense(), amount: '.30', payments: [{ paidBy: 'Yash', amount: '.10' }, { paidBy: 'Ritika', amount: '.20' }] };
  assert.deepEqual(expenseIssues(e), {});
  assert.ok(expenseIssues({ ...e, amount: '.301' }).amount);
});

test('repayments include all contributions by default and preserve explicit own-share exclusions', () => {
  assert.equal(calculateRepayments([expense()]).reduce((sum, group) => sum + group.amount, 0), 1500);
  const single = { ...expense(), includeOwnShare: false, payments: [{ paidBy: 'Yash', amount: 1500, paymentMethod: 'Card' }] };
  assert.equal(calculateRepayments([single])[0].amount, 1000);
});

test('v3 share preserves funding and split while omitting methods and drafts when requested', () => {
  const t = trip([expense(), { ...expense(), id: 'unfinished', item: '' }]);
  const snapshot = buildSnapshot(t, [], { repay: false, upi: false });
  assert.equal(snapshot.v, 3);
  assert.equal(snapshot.trip.expenses.length, 1);
  assert.ok(snapshot.trip.expenses[0].payments.every(p => p.paymentMethod === undefined));
  const decoded = tripFromShare(snapshot);
  assert.deepEqual(calculateBalances(people, decoded.expenses), calculateBalances(people, [expense()]));
  const broken = structuredClone(snapshot); broken.trip.expenses[0].payments[0].amount = 1;
  assert.equal(tripFromShare(broken), null);
  const outsider = structuredClone(snapshot); outsider.trip.expenses[0].payments[0].paidBy = 'Unknown';
  assert.equal(tripFromShare(outsider), null);
  assert.equal(tripFromShare({ ...snapshot, v: 100 }), null);
});

test('filtered snapshots retain payers outside the split list, with every contribution', () => {
  const e = { ...expense(), splitAmong: ['Mohan'] };
  const snapshot = buildSnapshot(trip([e]), [e], { filtered: true, repay: true });
  assert.deepEqual(snapshot.trip.participants, people);
  assert.deepEqual(snapshot.trip.paymentMethods, ['UPI', 'Card', 'Cash']);
  assert.equal(snapshot.trip.expenses[0].payments.length, 3);
});

test('payer/method filters recognise every contribution without rewriting expenses', () => {
  const e = expense();
  assert.equal(filterExpenses([e], { ...emptyFilters, paidBy: 'Ritika' }).length, 1);
  assert.equal(filterExpenses([e], { ...emptyFilters, method: 'Card' }).length, 1);
  assert.equal(filterExpenses([e], { ...emptyFilters, rules: [{ field: 'paidBy', operator: 'not', values: ['Ritika'] }] }).length, 0);
});

test('method reallocations do not invalidate settlement reports, payer reallocations do', () => {
  const t = trip([expense()]);
  const movedMethod = structuredClone(t); movedMethod.expenses[0].payments[0].amount = 500; movedMethod.expenses[0].payments[1].amount = 500;
  assert.equal(financialBasis(movedMethod), financialBasis(t));
  movedMethod.expenses[0].payments[0].paidBy = 'Ritika';
  assert.notEqual(financialBasis(movedMethod), financialBasis(t));
});

test('rename updates contributions, splits, undo and active reports without changing numbers', () => {
  const t = trip([expense()]);
  const tx = calculateSmartSettlements(calculateBalances(people, t.expenses))[0];
  t.settlementReports[settlementKey(tx)] = { ...tx, basis: financialBasis(t), transactionId: 'REF' };
  t.expenseUndo = { expense: expense(), index: 0 };
  const renamed = renameTripPeople(t, t.people.map(p => p.name === 'Yash' ? { ...p, name: 'Yash K' } : p));
  assert.equal(renamed.expenses[0].payments[0].paidBy, 'Yash K');
  assert.equal(renamed.expenseUndo.expense.payments[0].paidBy, 'Yash K');
  assert.ok(renamed.expenses[0].splitAmong.includes('Yash K'));
  const report = Object.values(renamed.settlementReports)[0];
  assert.equal(report.to, 'Yash K'); assert.equal(report.transactionId, 'REF'); assert.equal(report.basis, financialBasis(renamed));
  assert.deepEqual(calculateBalances(renamed.participants, renamed.expenses).map(b => b.balance), calculateBalances(t.participants, t.expenses).map(b => b.balance));
});

test('row undo survives storage separately from workspace recovery', () => {
  const original = trip([expense()]), deleted = removeExpense(original, 'dinner');
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  saveWorkspace({ version: 2, trips: [deleted], inbox: [], recovery: { kind: 'test' } }, storage);
  const loaded = loadWorkspace(storage);
  assert.deepEqual(undoExpenseRemoval(loaded.trips[0]).expenses, original.expenses);
  assert.equal(loaded.recovery.kind, 'test');
});
