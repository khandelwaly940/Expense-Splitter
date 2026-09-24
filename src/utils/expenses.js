// Contributions are payment sources, independent of who shares an expense.
export const paymentsFor = expense => {
  const settings = Object.fromEntries(['includeOwnShare', 'repayAmountOverride', 'noteAmount', 'noteText'].filter(key => expense[key] !== undefined).map(key => [key, expense[key]]));
  if (Array.isArray(expense.payments)) return expense.payments.length === 1 ? expense.payments.map(p => ({ ...settings, ...p })) : expense.payments;
  return [{ ...settings, id: 'single', paidBy: expense.paidBy, paymentMethod: expense.paymentMethod || null, amount: expense.amount }];
};
export const payersFor = expense => [...new Set(paymentsFor(expense).map(p => p.paidBy).filter(Boolean))];
export const methodsFor = expense => [...new Set(paymentsFor(expense).map(p => p.paymentMethod || ''))];
export const toPaise = value => {
  if (value === '' || value == null || !['number', 'string'].includes(typeof value)) return null;
  const amount = Number(value), paise = Math.round(amount * 100);
  return Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(paise) && Math.abs(amount * 100 - paise) < 0.000001 ? paise : null;
};
export function expenseIssues(expense, participants) {
  const issues = {};
  const managed = expense.entryVersion === 2 || Array.isArray(expense.payments);
  if (managed && !expense.item?.trim()) issues.item = 'Add a description';
  if (managed && (!/^\d{4}-\d{2}-\d{2}$/.test(expense.date || '') || !Number.isFinite(Date.parse(expense.date)) || new Date(`${expense.date}T12:00:00Z`).toISOString().slice(0, 10) !== expense.date)) issues.date = 'Choose a valid date';
  const amount = toPaise(expense.amount);
  if (amount == null || amount <= 0) issues.amount = 'Enter a positive amount, up to 2 decimals';
  const payments = paymentsFor(expense);
  if ((managed || participants) && (!payments.length || payments.some(p => !p || !p.paidBy || (participants && !participants.includes(p.paidBy))))) issues.paidBy = 'Choose a payer for every contribution';
  if (payments.some(p => !p || toPaise(p.amount) == null || toPaise(p.amount) <= 0)) issues.payments = 'Enter a positive amount for every contribution';
  else if (amount !== null && payments.reduce((sum, p) => sum + toPaise(p.amount), 0) !== amount) issues.payments = 'Payment contributions must match the expense total';
  if (participants && (expense.splitAmong || []).some(p => !participants.includes(p))) issues.splitAmong = 'Choose people in this trip';
  return issues;
}
export const isDraftExpense = (expense, participants) => Object.keys(expenseIssues(expense, participants)).length > 0;
export const readyExpenses = (expenses, participants) => expenses.filter(e => !isDraftExpense(e, participants));
export const expenseTotal = expenses => readyExpenses(expenses).reduce((sum, e) => sum + Number(e.amount), 0);

export function fundingFor(expense) {
  const amounts = new Map();
  for (const payment of paymentsFor(expense)) amounts.set(payment.paidBy, (amounts.get(payment.paidBy) || 0) + (toPaise(payment.amount) || 0));
  return [...amounts].map(([paidBy, amount]) => ({ paidBy, amount: amount / 100 }));
}

export function calculationExpenses(expenses, participants) {
  return readyExpenses(expenses, participants).flatMap(e => Array.isArray(e.payments)
    ? fundingFor(e).map(p => ({ ...e, amount: p.amount, paidBy: p.paidBy })) : [e]);
}

export function updateExpenseField(expense, field, value) {
  const next = { ...expense, entryVersion: 2, [field]: value };
  if (field === 'payments') {
    next.payments = value.map(p => ({ ...p }));
    next.paidBy = value[0]?.paidBy || expense.paidBy;
    next.paymentMethod = value.length === 1 ? value[0].paymentMethod || null : null;
  } else if (expense.payments?.length === 1 && ['amount', 'paidBy', 'paymentMethod'].includes(field)) {
    next.payments = expense.payments.map(p => ({ ...p, [field]: value }));
  }
  return next;
}

export function removeExpense(trip, id) {
  const index = trip.expenses.findIndex(e => e.id === id);
  if (index < 0) return trip;
  return { ...trip, expenses: trip.expenses.filter(e => e.id !== id), expenseUndo: { expense: trip.expenses[index], index } };
}
export function undoExpenseRemoval(trip) {
  if (!trip.expenseUndo) return trip;
  const expenses = [...trip.expenses];
  if (!expenses.some(e => e.id === trip.expenseUndo.expense.id)) expenses.splice(Math.min(trip.expenseUndo.index, expenses.length), 0, trip.expenseUndo.expense);
  return { ...trip, expenses, expenseUndo: null };
}
