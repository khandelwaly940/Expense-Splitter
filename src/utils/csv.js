import { readyExpenses, payersFor, paymentsFor } from './expenses.js';

const cell = value => {
  const text = String(value ?? '');
  return '"' + (/^[=+@\t\r-]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
};
export function buildExpenseCSV(expenses) {
  const header = ['Date', 'Description', 'Amount', 'Paid by', 'Split with', 'Payments'];
  const rows = readyExpenses(expenses).map(e => [e.date, e.item, e.amount, payersFor(e).join('; '), e.splitAmong.join('; ') || 'Payer only', paymentsFor(e).map(p => `${p.paidBy}: ${p.amount} (${p.paymentMethod || 'No method'})`).join('; ')]);
  return [header, ...rows].map(row => row.map(cell).join(',')).join('\n');
}
export function exportToCSV(expenses, filename = 'expense_trip_export.csv') {
  const url = URL.createObjectURL(new Blob([buildExpenseCSV(expenses)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
