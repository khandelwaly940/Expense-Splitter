import React from 'react';
import { Trash2, Copy, Plus } from 'lucide-react';
import SplitDropdown from './SplitDropdown';

/**
 * Desktop table view for the expense log.
 * Includes clone row functionality and zero-amount row highlighting.
 */
const ExpenseTable = ({
  expenses,
  participants,
  activeDropdownId,
  onUpdate,
  onRemove,
  onClone,
  onAddRow,
  onToggleSplit,
  onToggleDropdown,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
      {/* Table header bar */}
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
        <h2 className="font-semibold text-slate-700 text-sm">
          Expense Log
          <span className="ml-2 text-xs font-normal text-slate-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
            {expenses.length} {expenses.length === 1 ? 'item' : 'items'}
          </span>
        </h2>
        <button
          id="add-row-btn"
          onClick={onAddRow}
          className="text-sm bg-white border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-600 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Row</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-visible">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 text-[11px] uppercase text-slate-400 tracking-widest">
              <th className="px-3 py-2.5 font-semibold border-b border-gray-100 w-36">Date</th>
              <th className="px-3 py-2.5 font-semibold border-b border-gray-100">Description</th>
              <th className="px-3 py-2.5 font-semibold border-b border-gray-100 w-28">Amount (₹)</th>
              <th className="px-3 py-2.5 font-semibold border-b border-gray-100 w-28">Paid By</th>
              <th className="px-3 py-2.5 font-semibold border-b border-gray-100 w-40">Split With</th>
              <th className="px-3 py-2.5 font-semibold border-b border-gray-100 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-sm italic">
                  No expenses yet — click <strong>Add Row</strong> to start.
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
                      ? 'bg-amber-50/30 hover:bg-amber-50/60'
                      : 'hover:bg-indigo-50/20'
                  }`}
                >
                  {/* Date */}
                  <td className="p-2 align-middle">
                    <input
                      type="date"
                      className="w-full p-2 bg-transparent rounded-lg hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-none text-sm text-slate-600 transition-all"
                      value={expense.date}
                      onChange={e => onUpdate(expense.id, 'date', e.target.value)}
                    />
                  </td>

                  {/* Description */}
                  <td className="p-2 align-middle">
                    <input
                      type="text"
                      className="w-full p-2 bg-transparent rounded-lg hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-none text-sm transition-all"
                      placeholder="Description…"
                      value={expense.item}
                      onChange={e => onUpdate(expense.id, 'item', e.target.value)}
                    />
                  </td>

                  {/* Amount */}
                  <td className="p-2 align-middle">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">₹</span>
                      <input
                        type="number"
                        min="0"
                        className={`w-full p-2 pl-5 rounded-lg hover:bg-white focus:bg-white focus:ring-1 outline-none text-sm font-mono transition-all ${
                          isZero
                            ? 'bg-amber-50 text-amber-600 focus:ring-amber-400 border border-amber-200'
                            : 'bg-transparent focus:ring-indigo-400'
                        }`}
                        value={expense.amount === 0 ? '' : expense.amount}
                        onChange={e => onUpdate(expense.id, 'amount', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </td>

                  {/* Paid By */}
                  <td className="p-2 align-middle">
                    <select
                      className="w-full p-2 bg-transparent rounded-lg hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-none text-sm transition-all cursor-pointer"
                      value={expense.paidBy}
                      onChange={e => onUpdate(expense.id, 'paidBy', e.target.value)}
                    >
                      {participants.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>

                  {/* Split With */}
                  <td className="p-2 align-middle relative split-dropdown-container">
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

                  {/* Actions: Clone + Delete */}
                  <td className="p-2 align-middle">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onClone(expense.id)}
                        className="text-slate-300 hover:text-indigo-500 p-1.5 rounded transition-colors"
                        title="Clone row"
                        aria-label="Clone expense"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onRemove(expense.id)}
                        className="text-slate-300 hover:text-red-500 p-1.5 rounded transition-colors"
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
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-[11px] text-slate-400 text-center rounded-b-2xl">
        Data is saved automatically. Use <strong>Share</strong> to generate a link you can send to others.
      </div>
    </div>
  );
};

export default ExpenseTable;
