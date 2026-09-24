import { payersFor } from './expenses.js';

export const expensesForPerson = (expenses, name) => expenses.filter(e => payersFor(e).includes(name) || (e.splitAmong || []).includes(name));

export function upiForTransfer(trip, transfer) {
  const recipient = trip.people.find(p => p.name === transfer.to);
  if (!recipient?.upiId || !/^[\w.-]+@[\w.-]+$/.test(recipient.upiId) || !(transfer.amount > 0)) return null;
  return `upi://pay?${new URLSearchParams({ pa: recipient.upiId, pn: transfer.to, am: transfer.amount.toFixed(2), cu: 'INR', tn: (trip.name || 'Trip settlement').slice(0, 80) })}`;
}
