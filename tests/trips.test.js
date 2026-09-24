import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSPACE_KEY, assignPersonColors, buildSnapshot, compareTrips, createTrip, financialBasis, legacyShareId, loadWorkspace, normalizeTrip, saveWorkspace, settlementKey, tripFromShare } from '../src/utils/trips.js';
import { calculateBalances } from '../src/utils/calculations.js';

test('person colors are unique, stable, and included in shared snapshots', () => {
  const people = assignPersonColors(Array.from({ length: 32 }, (_, index) => ({ id: `person-${index}`, name: `Person ${index}`, upiId: '' })));
  assert.equal(new Set(people.map(person => person.color)).size, people.length);
  const trip = normalizeTrip({ participants: people.map(person => person.name), people, expenses: [] });
  assert.deepEqual(trip.people.map(person => person.color), people.map(person => person.color));
  assert.deepEqual(tripFromShare(buildSnapshot(trip, [])).people.map(person => person.color), people.map(person => person.color));
  const storage = memory();
  saveWorkspace({ version: 2, trips: [trip], inbox: [] }, storage);
  assert.deepEqual(loadWorkspace(storage).trips[0].people.map(person => person.color), people.map(person => person.color));
  const added = assignPersonColors([...people, { id: 'new-person', name: 'New person', upiId: '' }]);
  assert.deepEqual(added.slice(0, people.length), people);
  assert.equal(new Set(added.map(person => person.color)).size, added.length);
  const duplicates = normalizeTrip({ participants: ['A', 'B'], people: [{ id: 'a', name: 'A', color: '#7652B8' }, { id: 'b', name: 'B', color: '#7652B8' }] });
  assert.equal(duplicates.people[0].color, '#7652B8');
  assert.notEqual(duplicates.people[1].color, '#7652B8');
});

const memory = seed => {
  const data = new Map(Object.entries(seed || {}));
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
};

test('migrates the old single bill without deleting it', () => {
  const legacy = { tripName: 'Goa', participants: ['John', 'Mohan'], expenses: [{ id: 4, item: 'Dinner', amount: 500, paidBy: 'John', splitAmong: ['John', 'Mohan'] }], paymentMethods: ['Card'] };
  const storage = memory({ 'expense-splitter-state': JSON.stringify(legacy) });
  const workspace = loadWorkspace(storage);
  assert.equal(workspace.trips[0].name, 'Goa');
  assert.equal(workspace.trips[0].expenses[0].id, 4);
  assert.equal(workspace.trips[0].people.length, 2);
  saveWorkspace(workspace, storage);
  assert.ok(storage.getItem('expense-splitter-state'));
  assert.ok(storage.getItem(WORKSPACE_KEY));
  assert.equal(loadWorkspace(storage).trips[0].people[0].id, workspace.trips[0].people[0].id);
});

test('old share URLs get stable, content-specific inbox identities', () => {
  const old = { t: 'Old bill', p: ['A'], e: [{ id: 1, amount: 100, paidBy: 'A', splitAmong: ['A'] }] };
  assert.equal(legacyShareId(old), legacyShareId(JSON.parse(JSON.stringify(old))));
  assert.notEqual(legacyShareId(old), legacyShareId({ ...old, e: [{ ...old.e[0], amount: 200 }] }));
});

test('legacy bill migration preserves expense details and financial results across reloads', () => {
  const legacy = {
    tripName: 'Family trip',
    participants: ['Yash', 'Ritika', 'Arjun'],
    paymentMethods: ['UPI', 'Card'],
    expenses: [
      { id: 1720000000000, date: '2025-07-01', item: 'Hotel', amount: 1200, paidBy: 'Yash', splitAmong: ['Yash', 'Ritika', 'Arjun'], paymentMethod: 'Card', includeOwnShare: false, noteAmount: 50, noteText: 'Hotel share' },
      { id: 1720000000001, date: '2025-07-02', item: 'Dinner', amount: 450, paidBy: 'Ritika', splitAmong: ['Yash', 'Ritika'], paymentMethod: 'UPI', includeOwnShare: true },
    ],
  };
  const raw = JSON.stringify(legacy);
  const storage = memory({ 'expense-splitter-state': raw });
  const imported = loadWorkspace(storage);
  assert.equal(imported.trips.length, 1);
  assert.equal(imported.trips[0].name, legacy.tripName);
  assert.deepEqual(imported.trips[0].paymentMethods, legacy.paymentMethods);
  assert.deepEqual(imported.trips[0].expenses, legacy.expenses);
  assert.deepEqual(calculateBalances(imported.trips[0].participants, imported.trips[0].expenses), calculateBalances(legacy.participants, legacy.expenses));
  saveWorkspace(imported, storage);
  const reloaded = loadWorkspace(storage);
  assert.equal(reloaded.trips.length, 1);
  assert.deepEqual(reloaded.trips[0].expenses, legacy.expenses);
  assert.equal(reloaded.trips[0].id, imported.trips[0].id);
  assert.equal(storage.getItem('expense-splitter-state'), raw);
});

test('repayment section starts hidden and a later explicit choice persists', () => {
  assert.equal(createTrip('New').showRepay, false);
  assert.equal(normalizeTrip({ participants: ['A'] }).showRepay, false);
  const old = normalizeTrip({ participants: ['A'], showRepay: true });
  const storage = memory({ [WORKSPACE_KEY]: JSON.stringify({ version: 2, trips: [old], activeTripId: old.id }) });
  const migrated = loadWorkspace(storage);
  assert.equal(migrated.trips[0].showRepay, false);
  migrated.trips[0].showRepay = true;
  saveWorkspace(migrated, storage);
  assert.equal(loadWorkspace(storage).trips[0].showRepay, true);
});

test('partial share omits unselected bills and private fields', () => {
  const trip = normalizeTrip({ ...createTrip('Trip'), participants: ['John', 'Mohan'], people: [{ id: 'john', name: 'John', upiId: 'john@upi' }, { id: 'mohan', name: 'Mohan', upiId: 'mohan@upi' }], expenses: [
    { id: 'a', date: '2026-09-01', item: 'Dinner', amount: 600, paidBy: 'John', splitAmong: ['John', 'Mohan'], paymentMethod: 'Card', noteText: 'Private' },
    { id: 'b', date: '2026-09-02', item: 'Hotel', amount: 1000, paidBy: 'Mohan', splitAmong: ['John', 'Mohan'] },
  ] });
  const snapshot = buildSnapshot(trip, [trip.expenses[0]], { filtered: true, repay: false, upi: false, paymentStatus: false });
  assert.equal(snapshot.partial, true);
  assert.equal(snapshot.trip.expenses.length, 1);
  assert.equal(snapshot.trip.expenses[0].paymentMethod, undefined);
  assert.equal(snapshot.trip.expenses[0].noteText, undefined);
  assert.equal(snapshot.trip.showRepay, false);
  assert.equal(snapshot.trip.people[0].upiId, '');
  assert.equal(tripFromShare(snapshot).expenses[0].id, 'a');
  const invitation = buildSnapshot(trip, trip.expenses, { focusPersonId: 'john', upi: true, paymentStatus: true, transactionIds: false });
  assert.equal(tripFromShare(invitation).focusPersonId, 'john');
  assert.equal(invitation.trip.people[0].upiId, 'john@upi');
});

test('comparison uses stable expense IDs and detects changed amounts', () => {
  const oldTrip = normalizeTrip({ participants: ['John'], expenses: [{ id: 'a', amount: 100, splitAmong: ['John'] }] });
  const newTrip = normalizeTrip({ ...oldTrip, expenses: [{ id: 'a', amount: 150, splitAmong: ['John'] }, { id: 'b', amount: 50, splitAmong: ['John'] }] });
  const diff = compareTrips(oldTrip, newTrip);
  assert.equal(diff.expenses.added.length, 1);
  assert.equal(diff.expenses.changed.length, 1);
  assert.equal(diff.newTotal, 200);
  assert.notEqual(settlementKey({ from: 'John', to: 'Mohan', amount: 100 }), settlementKey({ from: 'John', to: 'Mohan', amount: 101 }));
});

test('an empty workspace stays empty and corrupt storage is never overwritten', () => {
  assert.equal(loadWorkspace(memory()).trips.length, 0);
  const empty = memory({ [WORKSPACE_KEY]: JSON.stringify({ version: 2, trips: [] }) });
  assert.equal(loadWorkspace(empty).trips.length, 0);
  const corrupt = memory({ [WORKSPACE_KEY]: '{broken' });
  const loaded = loadWorkspace(corrupt);
  assert.equal(loaded.storageError, true);
  assert.throws(() => saveWorkspace(loaded, corrupt));
  assert.equal(corrupt.getItem(WORKSPACE_KEY), '{broken');
});

test('partial snapshots stay partial when reshared as an entire bill', () => {
  const trip = normalizeTrip({ partial: true, participants: ['John'], expenses: [] });
  assert.equal(buildSnapshot(trip, [], { filtered: false }).partial, true);
});

test('personalised filtered snapshots retain the recipient without leaking other expenses or UPI IDs', () => {
  const trip = normalizeTrip({ participants: ['Ritika', 'Yash'], people: [{ id: 'r', name: 'Ritika', upiId: 'ritika@upi' }, { id: 'y', name: 'Yash', upiId: 'yash@upi' }], expenses: [
    { id: 'a', amount: 100, paidBy: 'Yash', splitAmong: ['Yash'] },
    { id: 'b', amount: 300, paidBy: 'Yash', splitAmong: ['Ritika', 'Yash'] },
  ] });
  const before = JSON.stringify(trip);
  const snapshot = buildSnapshot(trip, [trip.expenses[0]], { filtered: true, focusPersonId: 'r' });
  const restored = tripFromShare(snapshot);
  assert.equal(restored.focusPersonId, 'r');
  assert.equal(restored.people.find(p => p.id === 'r').name, 'Ritika');
  assert.deepEqual(restored.expenses.map(e => e.id), ['a']);
  assert.ok(restored.people.every(p => p.upiId === ''));
  assert.equal(restored.partial, true);
  assert.equal(JSON.stringify(trip), before);
});

test('workspace persistence retains more than 25 shared snapshots', () => {
  const storage = memory();
  const trip = normalizeTrip({ participants: ['John'], expenses: [] });
  const inbox = Array.from({ length: 30 }, () => buildSnapshot(trip, []));
  saveWorkspace({ version: 2, trips: [], inbox }, storage);
  assert.deepEqual(loadWorkspace(storage).inbox, inbox);
});

test('legacy reports stay local and never enter new snapshots, even with old share options', () => {
  const trip = normalizeTrip({ participants: ['John', 'Mohan'], expenses: [{ id: 'a', item: 'Lunch', amount: 200, paidBy: 'John', splitAmong: ['John', 'Mohan'] }] });
  const key = settlementKey({ from: 'Mohan', to: 'John', amount: 100 });
  trip.settlementReports[key] = { basis: financialBasis(trip), transactionId: 'PRIVATE-REF' };
  const renamed = { ...trip, expenses: trip.expenses.map(e => ({ ...e, item: 'Dinner' })) };
  assert.equal(financialBasis(renamed), financialBasis(trip));
  const edited = { ...trip, expenses: trip.expenses.map(e => ({ ...e, amount: 300 })) };
  assert.notEqual(financialBasis(edited), trip.settlementReports[key].basis);
  assert.equal(edited.settlementReports[key].transactionId, 'PRIVATE-REF');
  assert.equal(Object.keys(buildSnapshot(edited, edited.expenses, { paymentStatus: true }).trip.settlementReports).length, 0);
  const snapshot = buildSnapshot(trip, trip.expenses, { paymentStatus: true, transactionIds: true });
  assert.deepEqual(snapshot.trip.settlementReports, {});
  assert.equal(JSON.stringify(snapshot).includes('PRIVATE-REF'), false);
  assert.equal(trip.settlementReports[key].transactionId, 'PRIVATE-REF');
});

test('filtered snapshots do not leak unrelated methods or financial report history', () => {
  const trip = normalizeTrip({ participants: ['John', 'Mohan'], paymentMethods: ['Public card', 'Secret account'], expenses: [
    { id: 'a', item: 'Public', amount: 200, paidBy: 'John', splitAmong: ['John', 'Mohan'], paymentMethod: 'Public card' },
    { id: 'secret', item: 'Private', amount: 300, paidBy: 'John', splitAmong: ['John'], paymentMethod: 'Secret account' },
  ] });
  const key = settlementKey({ from: 'Mohan', to: 'John', amount: 100 });
  trip.settlementReports[key] = { basis: financialBasis(trip), transactionId: 'SECRET-TRANSACTION' };
  const snapshot = buildSnapshot(trip, [trip.expenses[0]], { filtered: true, repay: true, paymentStatus: true });
  assert.deepEqual(snapshot.trip.paymentMethods, ['Public card']);
  assert.equal(JSON.stringify(snapshot).includes('secret'), false);
  assert.equal(JSON.stringify(snapshot).includes('SECRET-TRANSACTION'), false);
});

test('malformed snapshots are rejected before they reach the UI', () => {
  assert.equal(tripFromShare({ v: 2, trip: { participants: ['John'], expenses: [null] } }), null);
  assert.equal(tripFromShare({ v: 2, trip: { participants: ['John'], expenses: [{ amount: 10, paidBy: 'Unknown', splitAmong: ['John'] }] } }), null);
  assert.equal(tripFromShare({ v: 2, trip: 'invalid' }), null);
});

test('saved views survive refresh separately from trip data and do not enter snapshot links', () => {
  const trip = normalizeTrip({ participants: ['John'], expenses: [{ id: 'a', item: 'Hotel', amount: 100, paidBy: 'John', splitAmong: ['John'] }] });
  const views = { [trip.id]: [{ id: 'view-a', name: 'Private view name', filters: { rules: [{ field: 'paidBy', values: ['John'] }] } }] };
  const storage = memory();
  const original = JSON.stringify(trip);
  saveWorkspace({ version: 2, trips: [trip], activeTripId: trip.id, inbox: [], views }, storage);
  assert.deepEqual(loadWorkspace(storage).views, views);
  assert.equal(JSON.stringify(trip), original);
  assert.equal(JSON.stringify(buildSnapshot(trip, trip.expenses)).includes('Private view name'), false);
});
