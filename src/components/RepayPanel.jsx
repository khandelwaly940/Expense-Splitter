import React from 'react';
import { CreditCard, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';

/**
 * Repay panel — light themed, consistent with the rest of the app.
 *
 * Shows contextual accounting notes per expense:
 *  - includeOwnShare ON  → "Log your expense of ₹[X] into your expense logs"
 *  - includeOwnShare OFF → "Log your expense of ₹[X] into [PaymentMethod]"
 */
const RepayPanel = ({ expenses, onToggleOwnShare }) => {
  const [noteAmounts, setNoteAmounts] = React.useState({});

  const handleNoteAmountChange = (expenseId, value) => {
    setNoteAmounts(prev => ({ ...prev, [expenseId]: value }));
  };

  const tagged = expenses.filter(e => e.paymentMethod && parseFloat(e.amount) > 0);
  if (tagged.length === 0) return null;

  const groups = [];
  const keyIndex = {};
  tagged.forEach(expense => {
    const key = `${expense.paidBy}::${expense.paymentMethod}`;
    if (keyIndex[key] === undefined) {
      keyIndex[key] = groups.length;
      groups.push({ paidBy: expense.paidBy, paymentMethod: expense.paymentMethod, expenses: [] });
    }
    groups[keyIndex[key]].expenses.push(expense);
  });

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Repay</h2>
        <span className="ml-auto text-[10px] text-slate-400 font-medium uppercase tracking-wider">
          to payment method
        </span>
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {groups.map(group => {

          const groupTotal = group.expenses.reduce((sum, e) => {
            const amt = parseFloat(e.amount) || 0;
            const members = e.splitAmong?.length > 0 ? e.splitAmong : [e.paidBy];
            const cpp = amt / members.length;
            const others = members.filter(p => p !== e.paidBy).length * cpp;
            const own = members.includes(e.paidBy) ? cpp : 0;
            return sum + others + ((e.includeOwnShare || false) ? own : 0);
          }, 0);

          return (
            <div key={`${group.paidBy}::${group.paymentMethod}`} className="space-y-2">

              {/* Group summary */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800">{group.paidBy}</span>
                  <span className="text-slate-400 text-xs">→</span>
                  <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
                    {group.paymentMethod}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-800 text-sm tabular-nums">
                  ₹{Math.ceil(groupTotal).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Per-expense rows */}
              <div className="space-y-2 pl-1">
                {group.expenses.map(expense => {
                  const amount = parseFloat(expense.amount) || 0;
                  const members = expense.splitAmong?.length > 0
                    ? expense.splitAmong : [expense.paidBy];
                  const costPerPerson = amount / members.length;
                  const othersCount = members.filter(p => p !== expense.paidBy).length;
                  const othersShare = othersCount * costPerPerson;
                  const ownShare = members.includes(expense.paidBy) ? costPerPerson : 0;
                  const includeOwn = expense.includeOwnShare || false;
                  const lineTotal = othersShare + (includeOwn ? ownShare : 0);

                  const defaultNoteAmt = Math.ceil(ownShare);
                  const noteAmtVal = noteAmounts[expense.id];
                  const noteAmtDisplay = noteAmtVal !== undefined
                    ? noteAmtVal
                    : (defaultNoteAmt > 0 ? String(defaultNoteAmt) : '');

                  const showNote = ownShare > 0;

                  return (
                    <div
                      key={expense.id}
                      className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 space-y-2"
                    >
                      {/* Name + repay total */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 truncate font-medium">
                          {expense.item || 'Untitled'}
                        </span>
                        <span className="font-mono text-sm font-semibold text-slate-800 shrink-0 tabular-nums">
                          ₹{Math.ceil(lineTotal).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Own-share toggle */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleOwnShare(expense.id)}
                          className={`flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 transition-all border font-medium ${
                            includeOwn
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                              : 'bg-white border-gray-200 text-slate-400 hover:bg-gray-100 hover:text-slate-600'
                          }`}
                        >
                          {includeOwn
                            ? <ToggleRight className="w-3 h-3" />
                            : <ToggleLeft className="w-3 h-3" />
                          }
                          {includeOwn ? 'incl. my share' : 'excl. my share'}
                        </button>

                        {ownShare > 0 && (
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            (own ₹{Math.ceil(ownShare).toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>

                      {/* Accounting note */}
                      {showNote && (
                        <div className={`rounded-lg px-2.5 py-2 border text-[11px] leading-snug ${
                          includeOwn
                            ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
                            : 'bg-amber-50 border-amber-200/80 text-amber-700'
                        }`}>
                          <span className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                            <span>📒 Log your expense of</span>
                            <span className="inline-flex items-baseline gap-px">
                              <span className={`text-[10px] ${includeOwn ? 'text-emerald-500' : 'text-amber-500'}`}>₹</span>
                              <input
                                type="number"
                                min="0"
                                value={noteAmtDisplay}
                                placeholder={String(defaultNoteAmt)}
                                onChange={e => handleNoteAmountChange(expense.id, e.target.value)}
                                className={`w-16 bg-transparent outline-none text-[11px] font-mono text-right px-0.5 border-b ${
                                  includeOwn
                                    ? 'border-emerald-300 text-emerald-800'
                                    : 'border-amber-300 text-amber-800'
                                }`}
                              />
                            </span>
                            {includeOwn ? (
                              <span>into your expense logs</span>
                            ) : (
                              <>
                                <span>into</span>
                                <span className="font-semibold">{expense.paymentMethod}</span>
                              </>
                            )}
                          </span>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-gray-100 flex items-center gap-1.5 text-[10px] text-slate-400">
        <RefreshCw className="w-3 h-3" />
        Amounts owed by the payer back to the payment method used.
      </div>

    </div>
  );
};

export default RepayPanel;
