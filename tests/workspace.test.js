import test from 'node:test';
import assert from 'node:assert/strict';
import { groupSharedBills, receiveSnapshot, resolveLocation, removeLocalTrip, replaceLocalTrip, removeSharedGroup, restoreRecovery } from '../src/utils/workspace.js';
import { normalizeTrip, loadWorkspace, saveWorkspace, WORKSPACE_KEY } from '../src/utils/trips.js';

const trip = id => normalizeTrip({ id, name: 'Same name', participants: ['A'], expenses: [{ id: `${id}-e`, amount: 100, paidBy: 'A', splitAmong: ['A'] }] });
const snapshot = (id, origin = 'shared-a') => ({ snapshotId: id, createdAt: '2026-09-20T10:00:00Z', trip: trip(origin) });
const initial = () => ({ version: 2, trips: [trip('local-a'), trip('local-b')], activeTripId: 'local-a', inbox: [snapshot('s2'), snapshot('other', 'shared-b'), snapshot('s1')], views: { 'shared:s1': [{ id: 'view' }], 'local-a': [{ id: 'local-view' }] } });
const roundTrip = workspace => {
  const data = new Map();
  const storage = { setItem: (key, value) => data.set(key, value), getItem: key => data.get(key) ?? null };
  saveWorkspace(workspace, storage);
  assert.ok(data.has(WORKSPACE_KEY));
  return loadWorkspace(storage);
};

test('shared versions group by origin, not name; receiving an existing snapshot is idempotent', () => {
  const workspace = initial(), before = JSON.stringify(workspace);
  const groups = groupSharedBills(workspace.inbox);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].versions.map(s => s.snapshotId), ['s2', 's1']);
  assert.equal(groups[0].latest.snapshotId, 's2');
  assert.equal(receiveSnapshot(workspace, snapshot('s1')), workspace);
  const received = receiveSnapshot(workspace, { ...snapshot('s0'), createdAt: '2020-01-01' });
  assert.equal(groupSharedBills(received.inbox)[0].latest.snapshotId, 's0');
  assert.equal(JSON.stringify(workspace), before);
});

test('unknown snapshot origins stay separate', () => {
  assert.equal(groupSharedBills([{ snapshotId: 'a', trip: { name: 'Same' } }, { snapshotId: 'b', trip: { name: 'Same' } }]).length, 2);
});

test('location restoration supports lists, local trips and exact shared versions', () => {
  const workspace = initial();
  workspace.repayDefaultVersion = 1;
  workspace.trips[1].showRepay = true;
  for (const location of [{ screen: 'home' }, { screen: 'inbox' }, { screen: 'trip', tripId: 'local-b', tab: 'repay' }, { screen: 'trip', snapshotId: 's1', tab: 'expenses' }]) {
    const loaded = roundTrip({ ...workspace, location });
    assert.deepEqual(resolveLocation(loaded), location);
  }
  assert.deepEqual(resolveLocation(workspace, { screen: 'trip', snapshotId: 'gone' }), { screen: 'inbox' });
  assert.deepEqual(resolveLocation(workspace, { screen: 'trip', tripId: 'gone' }), { screen: 'home' });
  assert.deepEqual(resolveLocation(workspace, { screen: 'trip', tripId: 'local-a', tab: 'repay' }), { screen: 'trip', tripId: 'local-a', tab: 'expenses' });
  assert.deepEqual(resolveLocation({ trips: [], inbox: [] }), { screen: 'home' });
});

test('shared-group removal and recovery persist every version and view without touching local trips', () => {
  const workspace = initial(), before = JSON.stringify(workspace);
  const removed = removeSharedGroup(workspace, 'shared-a');
  assert.deepEqual(removed.inbox.map(s => s.snapshotId), ['other']);
  assert.equal(removed.views['shared:s1'], undefined);
  assert.deepEqual(removed.trips, workspace.trips);
  const restored = restoreRecovery(roundTrip(removed));
  assert.deepEqual(restored.inbox, workspace.inbox);
  assert.deepEqual(restored.views, workspace.views);
  assert.equal(restored.recovery, null);
  assert.equal(JSON.stringify(workspace), before);
});

test('shared recovery does not duplicate reopened versions or demote newly received versions', () => {
  let workspace = removeSharedGroup(initial(), 'shared-a');
  workspace = receiveSnapshot(workspace, snapshot('s1'));
  workspace = receiveSnapshot(workspace, snapshot('s3'));
  const restored = restoreRecovery(workspace);
  assert.equal(restored.inbox.filter(s => s.snapshotId === 's1').length, 1);
  assert.equal(groupSharedBills(restored.inbox)[0].latest.snapshotId, 's3');
});

test('local removal restores original ordering and views after refresh', () => {
  const workspace = initial();
  const removed = removeLocalTrip(workspace, 'local-a');
  assert.equal(removed.activeTripId, 'local-b');
  assert.equal(removed.views['local-a'], undefined);
  const restored = restoreRecovery(roundTrip(removed));
  assert.deepEqual(restored.trips, workspace.trips);
  assert.deepEqual(restored.views, workspace.views);
  assert.equal(restored.location.tripId, 'local-a');
});

test('one recovery slot is replaced by the next removal or replacement', () => {
  const removed = removeSharedGroup(initial(), 'shared-a');
  const replacement = { ...trip('local-a'), name: 'Replacement', expenses: [] };
  const replaced = replaceLocalTrip(removed, 'local-a', replacement);
  assert.equal(replaced.recovery.kind, 'trip-replacement');
  const restored = restoreRecovery(roundTrip(replaced));
  assert.equal(restored.trips[0].expenses.length, 1);
  assert.deepEqual(restored.inbox.map(s => s.snapshotId), ['other']);
});

test('legacy recovery and editable-copy provenance survive workspace migration', () => {
  const workspace = initial();
  workspace.trips[0].sourceSnapshotId = 'original-snapshot';
  assert.equal(roundTrip(workspace).trips[0].sourceSnapshotId, 'original-snapshot');
  const restored = restoreRecovery(roundTrip({ ...workspace, trips: [], recovery: { trip: trip('older') } }));
  assert.equal(restored.trips[0].id, 'older');
});

test('reopening a removed older version keeps it most recently received after undo', () => {
  const removed = removeSharedGroup(initial(), 'shared-a');
  const reopened = receiveSnapshot(removed, snapshot('s1'));
  const restored = restoreRecovery(reopened);
  assert.equal(groupSharedBills(restored.inbox)[0].latest.snapshotId, 's1');
  assert.equal(restored.inbox.filter(s => s.snapshotId === 's1').length, 1);
});
