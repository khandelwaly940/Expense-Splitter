import React from 'react';
import { Trash2, Copy, Calendar, User } from 'lucide-react';
import SplitDropdown from './SplitDropdown';
import PaymentMethodSelector from './PaymentMethodSelector';

/**
 * Mobile card view for a single expense row.
 */
const ExpenseCard = ({
  expense,
  participants,
  paymentMethods,
  activeDropdownId,
  onUpdate,
  onRemove,
  onClone,
  onToggleSplit,
  onToggleDropdown,
  onAssignPaymentMethod,
  onCreatePaymentMethod,
  onRemovePaymentMethod,
}) => {
  const isZeroAmount = !expense.amount || parseFloat(expense.amount) === 0;

  return (
    <div
      className={`p-4 border-b border-gray-100 relative transition-colors ${
        isZeroAmount ? 'bg-amber-50/30' : 'bg-white'
      }`}
    >
      {/* Top row: date + actions */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <Calendar className="w-3 h-3" />
          <input
            type="date"
            className="bg-transparent border-b border-transparent focus:border-indigo-400 outline-none p-0 text-slate-500 text-xs"
            value={expense.date}
            onChange={e => onUpdate(expense.id, 'date', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-0.5">
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
      </div>

      {/* Description + Amount */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <input
            type="text"
            className="w-full text-sm font-semibold placeholder-slate-300 border-b border-transparent focus:border-indigo-400 outline-none py-1 bg-transparent text-slate-800"
            placeholder="What is this for?"
            value={expense.item}
            onChange={e => onUpdate(expense.id, 'item', e.target.value)}
          />
        </div>
        <div className="w-28 relative">
          <span className="absolute left-0 top-1.5 text-slate-400 text-sm">₹</span>
          <input
            type="number"
            min="0"
            className={`w-full pl-4 text-base font-bold border-b outline-none py-1 bg-transparent transition-colors tabular-nums ${
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
        <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <select
            className="bg-transparent outline-none text-slate-700 max-w-[80px] text-xs font-medium"
            value={expense.paidBy}
            onChange={e => onUpdate(expense.id, 'paidBy', e.target.value)}
          >
            {participants.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <span className="text-slate-300 text-xs shrink-0">split with</span>

        <div className="flex-1 min-w-0">
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

      {/* Payment method */}
      <div className="mt-2.5">
        <PaymentMethodSelector
          expenseId={expense.id}
          paymentMethod={expense.paymentMethod || null}
          paymentMethods={paymentMethods || []}
          onAssign={onAssignPaymentMethod}
          onCreateAndAssign={onCreatePaymentMethod}
          onRemove={onRemovePaymentMethod}
          isMobile={true}
        />
      </div>
    </div>
  );
};

export default ExpenseCard;
