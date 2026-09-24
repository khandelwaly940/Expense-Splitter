import { paymentsFor, readyExpenses, toPaise } from './expenses.js';

// Allocate a payer's own share across that payer's methods, not once per method.
export function repaymentRows(expenses) {
  return readyExpenses(expenses).flatMap(expense => {
    const payments = paymentsFor(expense);
    const totals = new Map(), allocated = new Map();
    payments.forEach(p => totals.set(p.paidBy, (totals.get(p.paidBy) || 0) + toPaise(p.amount)));
    return payments.map((payment, index) => {
      const paid = toPaise(payment.amount);
      const ownTotal = !expense.splitAmong.length ? totals.get(payment.paidBy)
        : expense.splitAmong.includes(payment.paidBy) ? Math.round(toPaise(expense.amount) / expense.splitAmong.length) : 0;
      const previous = allocated.get(payment.paidBy) || { paid: 0, own: 0 };
      const cumulativeOwn = Math.round(ownTotal * (previous.paid + paid) / totals.get(payment.paidBy));
      const own = cumulativeOwn - previous.own;
      allocated.set(payment.paidBy, { paid: previous.paid + paid, own: cumulativeOwn });
      const settings = payments.length === 1 ? { ...expense, ...payment } : payment;
      const includeOwnShare = settings.includeOwnShare !== false;
      const computed = Math.max(0, paid - (includeOwnShare ? 0 : own)) / 100;
      const custom = settings.repayAmountOverride == null ? null : toPaise(settings.repayAmountOverride);
      return { expense, index, key: JSON.stringify([expense.id, index]), payer: payment.paidBy, method: payment.paymentMethod,
        paid: paid / 100, own: own / 100, includeOwnShare, computed, repay: custom == null ? computed : custom / 100,
        custom: custom != null, noteAmount: settings.noteAmount ?? null, noteText: settings.noteText ?? null };
    }).filter(row => row.method);
  });
}

export function updateRepayment(expense, index, changes) {
  if (!Array.isArray(expense.payments)) return { ...expense, ...changes };
  return { ...expense, payments: expense.payments.map((p, i) => i === index ? { ...p, ...changes } : p),
    ...(expense.payments.length === 1 ? changes : {}) };
}

export const repaymentNote = row => row.noteText || `${row.expense.item || 'Expense'} · ${row.payer} · ${row.method} · Personal expense ₹${Number(row.noteAmount ?? row.own).toFixed(2)}`;

export function repaymentGroups(expenses) {
  const groups = new Map();
  for (const row of repaymentRows(expenses)) {
    const key = JSON.stringify([row.payer, row.method]);
    if (!groups.has(key)) groups.set(key, { paidBy: row.payer, paymentMethod: row.method, amount: 0, expenseIds: [] });
    const group = groups.get(key);
    group.amount = (Math.round(group.amount * 100) + Math.round(row.repay * 100)) / 100;
    if (!group.expenseIds.includes(row.expense.id)) group.expenseIds.push(row.expense.id);
  }
  return [...groups.values()];
}
