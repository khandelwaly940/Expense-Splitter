import React from 'react';
import { Trash2, Copy, Calendar, User } from 'lucide-react';
import SplitDropdown from './SplitDropdown';

/**
 * Mobile card view for a single expense row.
 */
const ExpenseCard = ({
  expense,
  participants,
  activeDropdownId,
  onUpdate,
  onRemove,
  onClone,
  onToggleSplit,
  onToggleDropdown,
}) => {
  const isZeroAmount = !expense.amount || parseFloat(expense.amount) === 0;

  return (
    <div
      className={`p-4 border-b border-gray-100 relative transition-colors ${
        isZeroAmount ? 'bg-amber-50/40' : 'bg-white'
      }`}
    >
      {/* Top row: date + actions */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-1.5 text-slate-400 text-sm">
          <Calendar className="w-3 h-3" />
          <input
            type="date"
            className="bg-transparent border-b border-transparent focus:border-indigo-400 outline-none p-0 text-slate-600 text-sm"
            value={expense.date}
            onChange={e => onUpdate(expense.id, 'date', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onClone(expense.id)}
            className="text-slate-300 hover:text-indigo-500 p-1.5 transition-colors"
            title="Clone row"
            aria-label="Clone expense"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRemove(expense.id)}
            className="text-slate-300 hover:text-red-500 p-1.5 transition-colors"
            aria-label="Delete expense"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Description + Amount */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <input
            type="text"
            className="w-full text-sm font-medium placeholder-slate-300 border-b border-transparent focus:border-indigo-400 outline-none py-1 bg-transparent"
            placeholder="What is this for?"
            value={expense.item}
            onChange={e => onUpdate(expense.id, 'item', e.target.value)}
          />
        </div>
        <div className="w-24 relative">
          <span className="absolute left-0 top-1.5 text-slate-400 text-sm">₹</span>
          <input
            type="number"
            min="0"
            className={`w-full pl-3 text-sm font-bold border-b outline-none py-1 bg-transparent transition-colors ${
              isZeroAmount
                ? 'border-amber-300 text-amber-600 focus:border-amber-500'
                : 'border-transparent text-slate-800 focus:border-indigo-400'
            }`}
            value={expense.amount === 0 ? '' : expense.amount}
            onChange={e => onUpdate(expense.id, 'amount', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Paid by + Split with */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
          <User className="w-3 h-3 text-slate-400" />
          <select
            className="bg-transparent outline-none text-slate-700 max-w-[80px] text-xs"
            value={expense.paidBy}
            onChange={e => onUpdate(expense.id, 'paidBy', e.target.value)}
          >
            {participants.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <span className="text-slate-300 text-xs">split with</span>

        <div className="flex-1">
          <SplitDropdown
            expenseId={expense.id}
            participants={participants}
            splitAmong={expense.splitAmong}
            isOpen={activeDropdownId === expense.id}
            onToggle={() => onToggleDropdown(expense.id)}
            onToggleParticipant={onToggleSplit}
            isMobile={true}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpenseCard;
