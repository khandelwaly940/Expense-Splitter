import { readyExpenses, payersFor, methodsFor, fundingFor, expenseIssues, expenseTotal } from './expenses.js';
export const WORKSPACE_KEY = 'expense-splitter-workspace-v2';
const LEGACY_KEY = 'expense-splitter-state';
import { calculateBalances, calculateSmartSettlements, calculateItemizedSettlements } from './calculations.js';

export const newId = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Older share URLs carry no snapshot or trip ID. Derive both from their content
// so reopening one URL never creates another inbox entry.
export function legacyShareId(payload) {
  const source = JSON.stringify(payload);
  let first = 2166136261, second = 5381;
  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619) >>> 0;
    second = (Math.imul(second, 33) ^ code) >>> 0;
  }
  return `legacy-${first.toString(36)}-${second.toString(36)}-${source.length.toString(36)}`;
}

// Dark enough for text on a light tint, and spaced apart for quick identification.
const PERSON_COLORS = ['#7652B8', '#087F8C', '#B45168', '#9B651E', '#4F6EBD', '#4F874C', '#A34B9C', '#A55A32', '#426E9B', '#8B7932', '#C14F52', '#527C73', '#765CA5', '#A65F83', '#536F39', '#A34878', '#5579A6', '#936535', '#417F99', '#7F5B91', '#A25D50', '#5B7D49', '#6E67B5', '#94763E'];
const validColor = color => typeof color === 'string' && (/^#[0-9a-f]{6}$/i.test(color) || /^hsl\(\d{1,3} 48% \d{2}%\)$/.test(color));
const hashId = id => [...String(id)].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);

export function assignPersonColors(people) {
  const used = new Set();
  return people.map(person => {
    let color = validColor(person.color) && !used.has(person.color.toLowerCase()) ? person.color : null;
    if (!color) {
      const start = hashId(person.id) % PERSON_COLORS.length;
      for (let offset = 0; offset < PERSON_COLORS.length; offset++) {
        const candidate = PERSON_COLORS[(start + offset) % PERSON_COLORS.length];
        if (!used.has(candidate.toLowerCase())) { color = candidate; break; }
      }
      // Beyond the curated palette, use distinct hues and tones without repeating a value.
      if (!color) {
        let index = hashId(person.id) % 360;
        do { color = `hsl(${index % 360} 48% ${38 + Math.floor(index / 360) % 12}%)`; index++; } while (used.has(color.toLowerCase()));
      }
    }
    used.add(color.toLowerCase());
    return { ...person, color };
  });
}

export function createTrip(name = '') {
  const id = newId();
  return { id, lineageId: id, name, participants: [], people: [], expenses: [], paymentMethods: [], settlementReports: {}, showRepay: false, createdAt: new Date().toISOString() };
}

export function normalizeTrip(input = {}) {
  const trip = createTrip(input.name || input.t || '');
  const participants = Array.isArray(input.participants) ? input.participants : Array.isArray(input.p) ? input.p : [];
  const expenses = Array.isArray(input.expenses) ? input.expenses : Array.isArray(input.e) ? input.e : [];
  const existingPeople = Array.isArray(input.people) ? input.people : [];
  return {
    ...trip,
    id: input.id || trip.id,
    lineageId: input.lineageId || input.id || trip.lineageId,
    participants: participants.filter(p => typeof p === 'string'),
    people: assignPersonColors(participants.filter(p => typeof p === 'string').map(name => {
      const found = existingPeople.find(p => p.name === name);
      return { id: found?.id || newId(), name, upiId: found?.upiId || '', color: found?.color };
    })),
    expenses: expenses.filter(e => e && typeof e === 'object').map(e => ({ ...e, id: e.id ?? newId(), splitAmong: Array.isArray(e.splitAmong) ? e.splitAmong : [] })),
    paymentMethods: Array.isArray(input.paymentMethods) ? input.paymentMethods : Array.isArray(input.pm) ? input.pm : [],
    settlementReports: input.settlementReports && typeof input.settlementReports === 'object' ? input.settlementReports : {},
    showRepay: input.showRepay === true,
    createdAt: input.createdAt || trip.createdAt,
    partial: !!input.partial,
    legacy: !!input.legacy,
    focusPersonId: input.focusPersonId || null,
    sourceSnapshotId: input.sourceSnapshotId || null,
    expenseUndo: input.expenseUndo || null,
  };
}

export function loadWorkspace(storage = localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(WORKSPACE_KEY));
    if (saved?.version === 2 && Array.isArray(saved.trips)) {
      const trips = saved.trips.map(trip => normalizeTrip(saved.repayDefaultVersion === 1 ? trip : { ...trip, showRepay: false }));
      return { version: 2, repayDefaultVersion: 1, trips, location: saved.location || null, activeTripId: trips.some(t => t.id === saved.activeTripId) ? saved.activeTripId : trips[0]?.id, inbox: Array.isArray(saved.inbox) ? saved.inbox : [], recovery: saved.recovery || null, views: saved.views && typeof saved.views === 'object' ? saved.views : {} };
    }
    if (saved !== null) throw new Error('Unsupported stored workspace');
  } catch { return { version: 2, trips: [], inbox: [], recovery: null, storageError: true }; }
  let trip;
  try {
    const legacy = JSON.parse(storage.getItem(LEGACY_KEY));
    trip = legacy?.participants && legacy?.expenses
      ? normalizeTrip({ name: legacy.tripName, participants: legacy.participants, expenses: legacy.expenses, paymentMethods: legacy.paymentMethods })
      : null;
  } catch { return { version: 2, trips: [], inbox: [], recovery: null, storageError: true }; }
  return { version: 2, repayDefaultVersion: 1, trips: trip ? [trip] : [], activeTripId: trip?.id || null, inbox: [], recovery: null };
}

export function saveWorkspace(workspace, storage = localStorage) {
  if (workspace.storageError) throw new Error('Stored data could not be read. Saving is paused to protect it.');
  storage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
}

export function tripFromShare(payload) {
  if (payload?.v != null && ![2, 3].includes(payload.v)) return null;
  const source = [2, 3].includes(payload?.v) ? payload.trip : payload;
  const people = source?.participants ?? source?.p;
  const expenses = source?.expenses ?? source?.e;
  if (!Array.isArray(people) || !people.every(p => typeof p === 'string') || !Array.isArray(expenses)) return null;
  if (['name', 't', 'id', 'lineageId'].some(key => source[key] != null && typeof source[key] !== 'string')) return null;
  if (source.people != null && (!Array.isArray(source.people) || !source.people.every(p => p && typeof p.name === 'string' && typeof p.id === 'string' && (p.upiId == null || typeof p.upiId === 'string') && (p.color == null || validColor(p.color))))) return null;
  const methods = source.paymentMethods ?? source.pm;
  if (methods != null && (!Array.isArray(methods) || !methods.every(m => typeof m === 'string'))) return null;
  if (payload.snapshotId != null && typeof payload.snapshotId !== 'string') return null;
  if (source.settlementReports != null && (typeof source.settlementReports !== 'object' || Array.isArray(source.settlementReports)
    || !Object.values(source.settlementReports).every(report => report && typeof report === 'object'
      && ['transactionId', 'reportedAt', 'basis', 'from', 'to'].every(key => report[key] == null || typeof report[key] === 'string')))) return null;
  if (!expenses.every(e => e && typeof e === 'object' && typeof e.paidBy === 'string' && people.includes(e.paidBy)
    && Number.isFinite(Number(e.amount)) && Number(e.amount) >= 0 && Array.isArray(e.splitAmong)
    && e.splitAmong.every(p => people.includes(p)) && (e.item == null || typeof e.item === 'string')
    && (e.date == null || typeof e.date === 'string')
    && (e.id == null || ['string', 'number'].includes(typeof e.id))
    && ['paymentMethod', 'noteText'].every(key => e[key] == null || typeof e[key] === 'string')
    && ['noteAmount', 'repayAmountOverride'].every(key => e[key] == null || (['string', 'number'].includes(typeof e[key]) && Number.isFinite(Number(e[key])) && Number(e[key]) >= 0)))) return null;
  if (!expenses.every(e => e.entryVersion !== 2 || !Object.keys(expenseIssues(e, people)).length)) return null;
  if (!expenses.every(e => e.payments == null || (Array.isArray(e.payments) && e.payments.length > 0 && e.payments.every(p => p && typeof p.paidBy === 'string' && people.includes(p.paidBy) && (p.id == null || typeof p.id === 'string') && (p.paymentMethod == null || typeof p.paymentMethod === 'string') && (p.includeOwnShare == null || typeof p.includeOwnShare === 'boolean') && (p.noteText == null || typeof p.noteText === 'string') && ['noteAmount', 'repayAmountOverride'].every(key => p[key] == null || (['string', 'number'].includes(typeof p[key]) && Number.isFinite(Number(p[key])) && Number(p[key]) >= 0))) && !Object.keys(expenseIssues(e, people)).length))) return null;
  if ([2, 3].includes(payload?.v)) return normalizeTrip({ ...source, partial: payload.partial, focusPersonId: payload.focusPersonId });
  if (Array.isArray(payload?.p) && Array.isArray(payload?.e)) return normalizeTrip({ ...payload, legacy: true });
  return null;
}

export function buildSnapshot(trip, expenses, options = {}) {
  const selected = readyExpenses(options.filtered ? expenses : trip.expenses, trip.participants);
  const peopleNeeded = new Set(selected.flatMap(e => [...payersFor(e), ...(e.splitAmong || [])]));
  const invited = trip.people.find(p => p.id === options.focusPersonId);
  if (invited) peopleNeeded.add(invited.name);
  const participants = options.filtered ? trip.participants.filter(p => peopleNeeded.has(p)) : trip.participants;
  const cleanedExpenses = selected.map(e => {
    const fields = ['id', 'date', 'item', 'amount', 'paidBy', 'splitAmong', 'paymentMethod', 'includeOwnShare', 'noteAmount', 'repayAmountOverride', 'noteText', 'entryVersion'];
    const item = Object.fromEntries(fields.filter(key => e[key] !== undefined).map(key => [key, e[key]]));
    if (e.payments) item.payments = e.payments.map(p => ({ id: p.id, paidBy: p.paidBy, amount: p.amount, ...(options.repay ? Object.fromEntries(['paymentMethod', 'includeOwnShare', 'repayAmountOverride', 'noteAmount', 'noteText'].filter(key => p[key] !== undefined).map(key => [key, p[key]])) : {}) }));
    if (!options.repay) {
      delete item.paymentMethod;
      delete item.includeOwnShare;
      delete item.noteAmount;
      delete item.repayAmountOverride;
      delete item.noteText;
    }
    return item;
  });
  const sharedTrip = {
    id: trip.lineageId,
    lineageId: trip.lineageId,
    name: trip.name,
    participants,
    people: trip.people.filter(p => participants.includes(p.name)).map(p => ({ id: p.id, name: p.name, color: p.color, upiId: options.upi ? p.upiId : '' })),
    expenses: cleanedExpenses,
    showRepay: !!options.repay,
    paymentMethods: options.repay ? [...new Set(selected.flatMap(methodsFor).filter(Boolean))] : [],
    settlementReports: {},
  };
  return { v: selected.some(e => e.payments?.length > 0) ? 3 : 2, snapshotId: newId(), createdAt: new Date().toISOString(), partial: !!trip.partial || !!options.filtered || selected.length < trip.expenses.length, trip: sharedTrip, focusPersonId: options.focusPersonId || null };
}

export function compareTrips(current, incoming) {
  const compare = (left, right, key) => {
    const a = new Map(left.map(item => [String(item[key]), item]));
    const b = new Map(right.map(item => [String(item[key]), item]));
    return {
      added: right.filter(item => !a.has(String(item[key]))),
      removed: left.filter(item => !b.has(String(item[key]))),
      changed: right.filter(item => a.has(String(item[key])) && JSON.stringify(a.get(String(item[key]))) !== JSON.stringify(item)),
    };
  };
  return {
    expenses: compare(current.expenses, incoming.expenses, 'id'),
    people: compare(current.people, incoming.people, incoming.legacy ? 'name' : 'id'),
    nameChanged: current.name !== incoming.name,
    methodsChanged: JSON.stringify(current.paymentMethods) !== JSON.stringify(incoming.paymentMethods),
    reportsChanged: JSON.stringify(current.settlementReports) !== JSON.stringify(incoming.settlementReports),
    oldTotal: expenseTotal(current.expenses),
    newTotal: expenseTotal(incoming.expenses),
  };
}

export function settlementKey(tx) {
  return `${tx.id ? 'itemized' : 'smart'}:${tx.from}\u2192${tx.to}:${Math.round(tx.amount * 100)}`;
}

// Reports remain in history after edits, but must never silently settle a changed bill.
export function financialBasis(trip) {
  return JSON.stringify(readyExpenses(trip.expenses).map(e => [String(e.id), Number(e.amount), fundingFor(e).length === 1 ? fundingFor(e)[0].paidBy : fundingFor(e).map(p => [p.paidBy, Number(p.amount)]).sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]), [...e.splitAmong].sort()]).sort((a, b) => a[0].localeCompare(b[0])));
}

export function renameTripPeople(trip, people) {
  const names = new Map(trip.people.map(old => [old.name, people.find(p => p.id === old.id)?.name || old.name]));
  const renamed = name => names.get(name) || name;
  const changeExpense = e => ({ ...e, paidBy: renamed(e.paidBy), splitAmong: e.splitAmong.map(renamed), ...(e.payments ? { payments: e.payments.map(p => ({ ...p, paidBy: renamed(p.paidBy) })) } : {}) });
  const next = { ...trip, people, participants: people.map(p => p.name), expenses: trip.expenses.map(changeExpense), expenseUndo: trip.expenseUndo ? { ...trip.expenseUndo, expense: changeExpense(trip.expenseUndo.expense) } : null };
  const oldBasis = financialBasis(trip), newBasis = financialBasis(next);
  const oldPlans = [...calculateSmartSettlements(calculateBalances(trip.participants, trip.expenses)), ...calculateItemizedSettlements(trip.participants, trip.expenses)];
  next.settlementReports = Object.fromEntries(Object.entries(trip.settlementReports || {}).map(([key, report]) => {
    const tx = oldPlans.find(t => settlementKey(t) === key);
    const from = report.from || tx?.from, to = report.to || tx?.to;
    if (!from || !to) return [key, report];
    const changed = { ...report, from: renamed(from), to: renamed(to), ...(report.basis === oldBasis ? { basis: newBasis } : {}) };
    const renamedKey = settlementKey({ from: changed.from, to: changed.to, amount: report.amount ?? tx?.amount ?? Number(key.slice(key.lastIndexOf(':') + 1)) / 100, ...(key.startsWith('itemized:') ? { id: 'itemized' } : {}) });
    return [renamedKey, changed];
  }));
  return next;
}
