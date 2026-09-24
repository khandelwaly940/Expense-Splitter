import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyFilters, filterExpenses } from '../src/utils/filters.js';

const expenses = [
  { id: 'a', date: '2026-09-01', item: 'Dinner', amount: 400, paidBy: 'John', splitAmong: ['John', 'Mohan'], paymentMethod: 'Card' },
  { id: 'b', date: '2026-09-05', item: 'Hotel', amount: 1200, paidBy: 'Mohan', splitAmong: ['Mohan'], paymentMethod: 'UPI' },
];

test('filters by all expense dimensions and sorts without mutating source', () => {
  assert.deepEqual(filterExpenses(expenses, { ...emptyFilters, splitWith: 'John' }).map(e => e.id), ['a']);
  assert.deepEqual(filterExpenses(expenses, { ...emptyFilters, paidBy: 'Mohan', method: 'UPI', minAmount: '1000', maxAmount: '1500', description: 'hot', fromDate: '2026-09-02', toDate: '2026-09-06' }).map(e => e.id), ['b']);
  assert.deepEqual(filterExpenses(expenses, { ...emptyFilters, sort: 'amount-desc' }).map(e => e.id), ['b', 'a']);
  assert.deepEqual(filterExpenses(expenses, { ...emptyFilters, sort: 'paidBy-desc' }).map(e => e.id), ['b', 'a']);
  assert.deepEqual(filterExpenses(expenses, { ...emptyFilters, sort: 'method-asc' }).map(e => e.id), ['a', 'b']);
  assert.equal(expenses[0].id, 'a');
});

test('saved view rules support multiple values, AND, OR and exclusions without changing expenses', () => {
  const before = JSON.stringify(expenses);
  const paidBy = { field: 'paidBy', operator: 'is', values: ['John', 'Mohan'] };
  const method = { field: 'method', operator: 'is', values: ['UPI'] };
  assert.deepEqual(filterExpenses(expenses, { ...emptyFilters, rules: [paidBy, method] }).map(e => e.id), ['b']);
  assert.equal(filterExpenses(expenses, { ...emptyFilters, match: 'any', rules: [paidBy, method] }).length, 2);
  assert.deepEqual(filterExpenses(expenses, { ...emptyFilters, rules: [{ ...method, operator: 'not' }] }).map(e => e.id), ['a']);
  assert.deepEqual(filterExpenses(expenses, { ...emptyFilters, rules: [{ field: 'splitWith', operator: 'every', values: ['John', 'Mohan'] }] }).map(e => e.id), ['a']);
  assert.deepEqual(filterExpenses(expenses, { ...emptyFilters, rules: [{ field: 'amount', from: '1000', to: '1500' }, { field: 'date', from: '2026-09-02', to: '2026-09-06' }, { field: 'description', value: 'HOT', operator: 'is' }] }).map(e => e.id), ['b']);
  assert.equal(JSON.stringify(expenses), before);
});

test('empty rules do not turn an OR view into all expenses', () => {
  assert.deepEqual(filterExpenses(expenses, { ...emptyFilters, match: 'any', rules: [{ field: 'method', values: ['Card'] }, { field: 'paidBy', values: [] }] }).map(e => e.id), ['a']);
});

test('split filters distinguish one, two, everyone, none and an exact named set', () => {
  const participants = ['John', 'Mohan', 'Yash'];
  const rows = [
    { id: 'none', splitAmong: [] },
    { id: 'one', splitAmong: ['Yash'] },
    { id: 'pair', splitAmong: ['John', 'Mohan'] },
    { id: 'other-pair', splitAmong: ['Yash', 'Mohan'] },
    { id: 'all', splitAmong: [...participants] },
  ];
  const find = (operator, values = []) => filterExpenses(rows, { ...emptyFilters, rules: [{ field: 'splitWith', operator, values }] }, participants).map(e => e.id);
  assert.deepEqual(find('one'), ['one']);
  assert.deepEqual(find('two'), ['pair', 'other-pair']);
  assert.deepEqual(find('everyone'), ['all']);
  assert.deepEqual(find('none'), ['none']);
  assert.deepEqual(find('exact', ['Mohan', 'John']), ['pair']);
  assert.deepEqual(find('every', ['John', 'Mohan']), ['pair', 'all']);
  assert.deepEqual(find('is', ['John']), ['pair', 'all']);
  assert.deepEqual(rows[0].splitAmong, []);
});

test('everyone uses the trip roster, not the number of people in any observed expense', () => {
  const rows = [{ id: 'pair', splitAmong: ['John', 'Mohan'] }];
  const filters = { ...emptyFilters, rules: [{ field: 'splitWith', operator: 'everyone', values: [] }] };
  assert.equal(filterExpenses(rows, filters, ['John', 'Mohan', 'Yash']).length, 0);
  assert.equal(filterExpenses(rows, filters, ['John', 'Mohan']).length, 1);
  assert.equal(filterExpenses([{ splitAmong: [] }], filters, []).length, 0);
});
