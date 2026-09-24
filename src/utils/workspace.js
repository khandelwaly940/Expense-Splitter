// Workspace lifecycle only. Expense and settlement calculations live elsewhere.
export const sharedGroupId = snapshot => snapshot.trip?.lineageId || snapshot.trip?.id || snapshot.snapshotId;

export function groupSharedBills(inbox = []) {
  const groups = new Map();
  for (const snapshot of inbox) {
    const id = sharedGroupId(snapshot);
    if (!groups.has(id)) groups.set(id, { id, latest: snapshot, versions: [] });
    groups.get(id).versions.push(snapshot);
  }
  return [...groups.values()];
}

export function receiveSnapshot(workspace, snapshot) {
  if (workspace.inbox.some(entry => entry.snapshotId === snapshot.snapshotId)) return workspace;
  return { ...workspace, inbox: [{ ...snapshot, receivedAt: snapshot.receivedAt || new Date().toISOString() }, ...workspace.inbox] };
}

export function resolveLocation(workspace, requested = workspace.location) {
  if (!requested) return workspace.trips.length ? { screen: 'trip', tripId: workspace.trips.find(t => t.id === workspace.activeTripId)?.id || workspace.trips[0].id, tab: 'expenses' } : { screen: 'home' };
  if (requested.screen === 'home' || requested.screen === 'inbox') return { screen: requested.screen };
  const snapshot = requested.snapshotId && workspace.inbox.find(s => s.snapshotId === requested.snapshotId);
  const trip = snapshot?.trip || (!requested.snapshotId && workspace.trips.find(t => t.id === requested.tripId));
  if (!trip) return { screen: requested.snapshotId ? 'inbox' : 'home' };
  return { screen: 'trip', ...(snapshot ? { snapshotId: snapshot.snapshotId } : { tripId: trip.id }), tab: requested.tab === 'repay' && trip.showRepay === true ? 'repay' : 'expenses' };
}

export function removeLocalTrip(workspace, tripId) {
  const trip = workspace.trips.find(t => t.id === tripId);
  if (!trip) return workspace;
  const views = { ...workspace.views };
  const savedViews = views[tripId];
  delete views[tripId];
  return { ...workspace, trips: workspace.trips.filter(t => t.id !== tripId), views,
    activeTripId: workspace.activeTripId === tripId ? workspace.trips.find(t => t.id !== tripId)?.id || null : workspace.activeTripId,
    recovery: { kind: 'trip-removal', trip, views: savedViews, index: workspace.trips.indexOf(trip), savedAt: new Date().toISOString() } };
}

export function replaceLocalTrip(workspace, tripId, replacement) {
  const trip = workspace.trips.find(t => t.id === tripId);
  if (!trip) return workspace;
  return { ...workspace, trips: workspace.trips.map(t => t.id === tripId ? { ...replacement, id: tripId, sourceSnapshotId: trip.sourceSnapshotId } : t), activeTripId: tripId,
    recovery: { kind: 'trip-replacement', trip, savedAt: new Date().toISOString() } };
}

export function removeSharedGroup(workspace, groupId) {
  const entries = workspace.inbox.map((snapshot, index) => ({ snapshot, index })).filter(e => sharedGroupId(e.snapshot) === groupId);
  if (!entries.length) return workspace;
  const views = { ...workspace.views }, savedViews = {};
  for (const { snapshot } of entries) {
    const key = `shared:${snapshot.snapshotId}`;
    if (views[key]) savedViews[key] = views[key];
    delete views[key];
  }
  return { ...workspace, inbox: workspace.inbox.filter(s => sharedGroupId(s) !== groupId), views,
    recovery: { kind: 'shared-removal', entries, inboxOrder: workspace.inbox.map(s => s.snapshotId), views: savedViews, name: entries[0].snapshot.trip?.name || 'Shared bill', savedAt: new Date().toISOString() } };
}

export function restoreRecovery(workspace) {
  const recovery = workspace.recovery;
  if (!recovery) return workspace;
  if (recovery.kind === 'shared-removal') {
    const inbox = [...workspace.inbox];
    for (const { snapshot, index } of recovery.entries) {
      if (!inbox.some(s => s.snapshotId === snapshot.snapshotId)) inbox.splice(Math.min(index, inbox.length), 0, snapshot);
    }
    const order = recovery.inboxOrder || inbox.map(s => s.snapshotId);
    const byId = new Map(inbox.map(s => [s.snapshotId, s]));
    const removedIds = new Set(recovery.entries.map(e => e.snapshot.snapshotId));
    const recent = workspace.inbox.filter(s => !order.includes(s.snapshotId) || removedIds.has(s.snapshotId));
    const recentIds = new Set(recent.map(s => s.snapshotId));
    const restoredInbox = [...recent, ...order.filter(id => !recentIds.has(id)).map(id => byId.get(id)).filter(Boolean)];
    return { ...workspace, inbox: restoredInbox, views: { ...recovery.views, ...workspace.views }, recovery: null, location: { screen: 'inbox' } };
  }
  // Older workspaces stored only a trip; preserve their recovery support.
  const trip = recovery.trip;
  if (!trip) return workspace;
  const trips = [...workspace.trips];
  const index = trips.findIndex(t => t.id === trip.id);
  if (index >= 0) trips[index] = trip;
  else trips.splice(Math.min(recovery.index ?? trips.length, trips.length), 0, trip);
  return { ...workspace, trips, activeTripId: trip.id, recovery: null,
    views: { ...workspace.views, ...(recovery.views ? { [trip.id]: recovery.views } : {}) },
    location: { screen: 'trip', tripId: trip.id, tab: 'expenses' } };
}

export const recoveryLabel = recovery => recovery?.kind === 'shared-removal' ? 'Undo shared removal' : recovery?.kind === 'trip-removal' ? 'Undo trip removal' : 'Undo replacement';
