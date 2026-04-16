import React from 'react';
import { CreditCard, RefreshCw, ToggleLeft, ToggleRight, RotateCcw } from 'lucide-react';

/**
 * Repay panel — light themed, fully editable with persist + reset for all amounts.
 *
 * Per-expense editable fields (all stored on expense object → persist via localStorage + share URL):
 *  - repayAmountOverride  → overrides computed repay amount (othersShare ± ownShare)
 *  - noteAmount           → overrides ₹ amount in the default note sentence
 *  - noteText             → overrides the full note sentence text
 *
 * All three follow the same pattern:
 *   null   = show computed default
 *   value  = user override (reset button sets back to null)
 *
 * Props:
 *  expenses              — full expense list
 *  onToggleOwnShare      — (expenseId) => void
 *  onUpdateNoteAmount    — (expenseId, value | null) => void
 *  onUpdateRepayAmount   — (expenseId, value | null) => void
 *  onUpdateNoteText      — (expenseId, value | null) => void
 */
const RepayPanel = ({
  expenses,
  onToggleOwnShare,
  onUpdateNoteAmount,
  onUpdateRepayAmount,
  onUpdateNoteText,
}) => {
  const tagged = expenses.filter(e => e.paymentMethod && parseFloat(e.amount) > 0);
  if (tagged.length === 0) return null;

  // ── helpers ──────────────────────────────────────────────────────────────────

  /** Compute the base repay amount for one expense (before any override). */
  const computeLineTotal = (expense) => {
    const amount = parseFloat(expense.amount) || 0;
    const members = expense.splitAmong?.length > 0 ? expense.splitAmong : [expense.paidBy];
    const cpp = amount / members.length;
    const othersShare = members.filter(p => p !== expense.paidBy).length * cpp;
    const ownShare = members.includes(expense.paidBy) ? cpp : 0;
    return { othersShare, ownShare, lineTotal: othersShare + ((expense.includeOwnShare || false) ? ownShare : 0) };
  };

  /** Effective repay amount: override if set, else computed. */
  const effectiveRepay = (expense) => {
    if (expense.repayAmountOverride != null) return parseFloat(expense.repayAmountOverride) || 0;
    return computeLineTotal(expense).lineTotal;
  };

  // ── Group by (paidBy, paymentMethod) ─────────────────────────────────────────
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

  // ── Shared style helpers ──────────────────────────────────────────────────────
  const resetBtn = (color, onClick, title = 'Reset to default') => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`opacity-40 hover:opacity-100 transition-opacity ${color}`}
    >
      <RotateCcw className="w-2.5 h-2.5" />
    </button>
  );

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

          // Group total uses effective (possibly overridden) repay per expense
          const groupTotal = group.expenses.reduce(
            (sum, e) => sum + effectiveRepay(e), 0
          );

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
                  const { ownShare, lineTotal: computedLineTotal } = computeLineTotal(expense);
                  const includeOwn = expense.includeOwnShare || false;

                  // ── Repay amount (editable) ────────────────────────────────
                  const repayOverridden = expense.repayAmountOverride != null;
                  const repayDisplay = repayOverridden
                    ? expense.repayAmountOverride
                    : String(Math.ceil(computedLineTotal));

                  // ── Note defaults ──────────────────────────────────────────
                  const defaultNoteAmt = Math.ceil(ownShare);
                  const noteAmtDisplay = expense.noteAmount != null
                    ? expense.noteAmount
                    : (defaultNoteAmt > 0 ? String(defaultNoteAmt) : '');
                  const noteAmtOverridden = expense.noteAmount != null;

                  // Default note sentence (with noteAmount or computed own share)
                  const noteAmtForDefault = expense.noteAmount != null
                    ? expense.noteAmount : defaultNoteAmt;
                  const computedNoteText = includeOwn
                    ? `Log your expense of ₹${noteAmtForDefault} into your expense logs`
                    : `Log your expense of ₹${noteAmtForDefault} into ${expense.paymentMethod}`;
                  const noteTextOverridden = expense.noteText != null;
                  const showNote = ownShare > 0;

                  return (
                    <div
                      key={expense.id}
                      className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 space-y-2"
                    >
                      {/* ── Name + editable repay amount ── */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 truncate font-medium">
                          {expense.item || 'Untitled'}
                        </span>

                        {/* Editable repay amount */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <span className="text-xs text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={repayDisplay}
                            placeholder={String(Math.ceil(computedLineTotal))}
                            onChange={e => onUpdateRepayAmount(expense.id, e.target.value)}
                            className="w-20 font-mono text-sm font-semibold text-slate-800 bg-transparent outline-none text-right border-b border-transparent hover:border-gray-300 focus:border-indigo-400 transition-colors tabular-nums"
                          />
                          {repayOverridden && resetBtn(
                            'text-slate-500',
                            () => onUpdateRepayAmount(expense.id, null),
                            'Reset to computed repay amount'
                          )}
                        </div>
                      </div>

                      {/* ── Own-share toggle ── */}
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

                      {/* ── Accounting note ── */}
                      {showNote && (
                        <div className={`rounded-lg px-2.5 py-2 border text-[11px] leading-snug space-y-1.5 ${
                          includeOwn
                            ? 'bg-emerald-50 border-emerald-200/80'
                            : 'bg-amber-50 border-amber-200/80'
                        }`}>

                          {/* Note text row: either free-form override or structured default */}
                          {noteTextOverridden ? (
                            /* Free-form editable note text */
                            <div className="flex items-center gap-1">
                              <span>📒</span>
                              <input
                                type="text"
                                value={expense.noteText}
                                onChange={e => onUpdateNoteText(expense.id, e.target.value)}
                                placeholder={computedNoteText}
                                className={`flex-1 bg-transparent outline-none text-[11px] border-b transition-colors ${
                                  includeOwn
                                    ? 'border-emerald-300 text-emerald-800 placeholder-emerald-400/50 focus:border-emerald-500'
                                    : 'border-amber-300 text-amber-800 placeholder-amber-400/50 focus:border-amber-500'
                                }`}
                              />
                              {resetBtn(
                                includeOwn ? 'text-emerald-600' : 'text-amber-600',
                                () => onUpdateNoteText(expense.id, null),
                                'Reset note text to default'
                              )}
                            </div>
                          ) : (
                            /* Structured default: text with editable ₹ amount inline */
                            <span className={`flex flex-wrap items-center gap-x-1 gap-y-0.5 ${
                              includeOwn ? 'text-emerald-700' : 'text-amber-700'
                            }`}>
                              <span>📒 Log your expense of</span>
                              <span className="inline-flex items-center gap-0.5">
                                <span className={`text-[10px] ${includeOwn ? 'text-emerald-500' : 'text-amber-500'}`}>₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={noteAmtDisplay}
                                  placeholder={String(defaultNoteAmt)}
                                  onChange={e => onUpdateNoteAmount(expense.id, e.target.value)}
                                  className={`w-16 bg-transparent outline-none text-[11px] font-mono text-right px-0.5 border-b ${
                                    includeOwn
                                      ? 'border-emerald-300 text-emerald-800'
                                      : 'border-amber-300 text-amber-800'
                                  }`}
                                />
                                {noteAmtOverridden && resetBtn(
                                  includeOwn ? 'text-emerald-600' : 'text-amber-600',
                                  () => onUpdateNoteAmount(expense.id, null),
                                  'Reset to own share amount'
                                )}
                              </span>
                              {includeOwn ? (
                                <span>into your expense logs</span>
                              ) : (
                                <>
                                  <span>into</span>
                                  <span className="font-semibold">{expense.paymentMethod}</span>
                                </>
                              )}
                              {/* Edit entire note text button */}
                              <button
                                type="button"
                                title="Edit full note text"
                                onClick={() => onUpdateNoteText(expense.id, computedNoteText)}
                                className={`text-[9px] font-medium ml-1 opacity-40 hover:opacity-100 transition-opacity underline underline-offset-1 ${
                                  includeOwn ? 'text-emerald-600' : 'text-amber-600'
                                }`}
                              >
                                edit text
                              </button>
                            </span>
                          )}
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
