/**
 * CSV export utility.
 */

/**
 * Export expenses to a CSV file and trigger download.
 * @param {object[]} expenses
 * @param {string} [filename='expense_trip_export.csv']
 */
export function exportToCSV(expenses, filename = 'expense_trip_export.csv') {
  const headers = ['Date,Item Description,Amount,Paid By,Split Among'];
  const rows = expenses.map(e => {
    const safeItem = (e.item || '').replace(/,/g, ' ');
    const safeSplit = e.splitAmong.join('; ');
    return `${e.date},${safeItem},${e.amount},${e.paidBy},"${safeSplit}"`;
  });

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
