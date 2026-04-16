import React from 'react';
import { Trash2, Copy, Plus } from 'lucide-react';
import SplitDropdown from './SplitDropdown';
import PaymentMethodSelector from './PaymentMethodSelector';

/**
 * Desktop table view for the expense log.
 * Includes clone row functionality and zero-amount row highlighting.
 */
const ExpenseTable = ({
  expenses,
  participants,
  paymentMethods,
  activeDropdownId,
  onUpdate,
  onRemove,
  onClone,
  onAddRow,
  onToggleSplit,
  onToggleDropdown,
  onAssignPaymentMethod,
  onCreatePaymentMethod,
  onRemovePaymentMethod,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-visible">
      {/* Table header bar */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 rounded-t-2xl">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          Expense Log
          <span className="text-[10px] font-normal text-slate-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
            {expenses.length} {expenses.length === 1 ? 'item' : 'items'}
          </span>
        </h2>
        <button
          id="add-row-btn"
          onClick={onAddRow}
          className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-sm font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Row</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-visible">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase text-slate-400 tracking-widest bg-gray-50/40">
              <th className="px-3 py-2 font-semibold border-b border-gray-100 w-36">Date</th>
              <th className="px-3 py-2 font-semibold border-b border-gray-100">Description</th>
              <th className="px-3 py-2 font-semibold border-b border-gray-100 w-28">Amount (₹)</th>
              <th className="px-3 py-2 font-semibold border-b border-gray-100 w-28">Paid By</th>
              <th className="px-3 py-2 font-semibold border-b border-gray-100 w-40">Split With</th>
              <th className="px-3 py-2 font-semibold border-b border-gray-100 w-36">Method</th>
              <th className="px-3 py-2 font-semibold border-b border-gray-100 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-300 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">🧾</span>
                    <span>No expenses yet — click <strong className="text-slate-400">Add Row</strong> to start.</span>
                  </div>
                </td>
              </tr>
            )}
            {expenses.map(expense => {
              const isZero = !expense.amount || parseFloat(expense.amount) === 0;
              return (
                <tr
                  key={expense.id}
                  className={`group transition-colors ${
                    isZero
                      ? 'bg-amber-50/40 hover:bg-amber-50/80'
                      : 'hover:bg-indigo-50/20'
                  }`}
                >
                  {/* Date */}
                  <td className="p-1.5 align-middle">
                    <input
                      type="date"
                      className="w-full px-2 py-1.5 bg-transparent rounded-lg hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-none text-xs text-slate-600 transition-all"
                      value={expense.date}
                      onChange={e => onUpdate(expense.id, 'date', e.target.value)}
                    />
                  </td>

                  {/* Description */}
                  <td className="p-1.5 align-middle">
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 bg-transparent rounded-lg hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-none text-sm transition-all"
                      placeholder="Description…"
                      value={expense.item}
                      onChange={e => onUpdate(expense.id, 'item', e.target.value)}
                    />
                  </td>

                  {/* Amount */}
                  <td className="p-1.5 align-middle">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">₹</span>
                      <input
                        type="number"
                        min="0"
                        className={`w-full p-1.5 pl-5 rounded-lg hover:bg-white focus:bg-white focus:ring-1 outline-none text-sm font-mono transition-all tabular-nums ${
                          isZero
                            ? 'bg-amber-50 text-amber-600 focus:ring-amber-400 border border-amber-200/80'
                            : 'bg-transparent focus:ring-indigo-400'
                        }`}
                        value={expense.amount === 0 ? '' : expense.amount}
                        onChange={e => onUpdate(expense.id, 'amount', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </td>

                  {/* Paid By */}
                  <td className="p-1.5 align-middle">
                    <select
                      className="w-full px-2 py-1.5 bg-transparent rounded-lg hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-none text-sm transition-all cursor-pointer"
                      value={expense.paidBy}
                      onChange={e => onUpdate(expense.id, 'paidBy', e.target.value)}
                    >
                      {participants.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>

                  {/* Split With */}
                  <td className="p-1.5 align-middle relative split-dropdown-container">
                    <SplitDropdown
                      expenseId={expense.id}
                      participants={participants}
                      splitAmong={expense.splitAmong}
                      isOpen={activeDropdownId === expense.id}
                      onToggle={() => onToggleDropdown(expense.id)}
                      onToggleParticipant={onToggleSplit}
                      isMobile={false}
                    />
                  </td>

                  {/* Payment Method */}
                  <td className="p-1.5 align-middle relative payment-method-container">
                    <PaymentMethodSelector
                      expenseId={expense.id}
                      paymentMethod={expense.paymentMethod || null}
                      paymentMethods={paymentMethods || []}
                      onAssign={onAssignPaymentMethod}
                      onCreateAndAssign={onCreatePaymentMethod}
                      onRemove={onRemovePaymentMethod}
                      isMobile={false}
                    />
                  </td>

                  {/* Actions: Clone + Delete */}
                  <td className="p-1.5 align-middle">
                    <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onClone(expense.id)}
                        className="text-slate-300 hover:text-indigo-500 p-1.5 rounded-lg hover:bg-indigo-50 transition-all"
                        title="Clone row"
                        aria-label="Clone expense"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onRemove(expense.id)}
                        className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                        aria-label="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer hint */}
      <div className="px-5 py-2.5 bg-gray-50/60 border-t border-gray-100 text-[10px] text-slate-400 text-center rounded-b-2xl">
        Saved automatically · <strong>Share</strong> to send a link · <kbd className="font-sans bg-white border border-gray-200 px-1 rounded text-[9px]">Ctrl+N</kbd> new row
      </div>
    </div>
  );
};

export default ExpenseTable;
