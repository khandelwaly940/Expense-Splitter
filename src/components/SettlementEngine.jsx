import React from 'react';
import { DollarSign, ArrowRightLeft, List, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Settlement engine panel — shows who pays whom in Smart or Itemized mode.
 */
const SettlementEngine = ({
  settlements,
  totalSpent,
  settlementMethod,
  onMethodChange,
  expandedGroup,
  onToggleGroup,
}) => {
  return (
    <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg flex flex-col max-h-[520px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-slate-700/60 gap-3">
        <h2 className="text-base font-semibold flex items-center gap-2 text-emerald-400">
          <DollarSign className="w-4 h-4" />
          Who Pays Whom?
        </h2>

        {/* Mode Switcher */}
        <div className="flex bg-slate-800 rounded-xl p-1 text-xs self-start sm:self-auto">
          <button
            onClick={() => onMethodChange('smart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
              settlementMethod === 'smart'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3" />
            Smart
          </button>
          <button
            onClick={() => onMethodChange('itemized')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
              settlementMethod === 'itemized'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3 h-3" />
            Itemized
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="overflow-y-auto pr-1 space-y-2 flex-1 custom-scrollbar">
        {settlements.length === 0 ? (
          <div className="text-slate-500 text-center py-8 text-sm italic">
            {totalSpent === 0
              ? 'Add expenses to calculate.'
              : '🎉 Everyone is settled up!'}
          </div>
        ) : (
          settlements.map((tx, idx) => (
            <div
              key={tx.id || idx}
              className="bg-slate-800 rounded-xl border border-slate-700/50 flex flex-col overflow-hidden"
            >
              {/* Main row */}
              <div
                className={`p-3 flex items-center justify-between ${
                  settlementMethod === 'itemized'
                    ? 'cursor-pointer hover:bg-slate-700/40 transition-colors'
                    : ''
                }`}
                onClick={() => settlementMethod === 'itemized' && onToggleGroup(tx.id)}
              >
                <div className="flex items-center gap-2">
                  {settlementMethod === 'itemized' && (
                    <div className="text-slate-500">
                      {expandedGroup === tx.id ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                  {/* Left accent */}
                  <div className="w-1 h-6 rounded-full bg-red-500/60 shrink-0" />
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-semibold text-red-300">{tx.from}</span>
                    <span className="text-slate-600 text-xs">→</span>
                    <span className="font-semibold text-emerald-300">{tx.to}</span>
                  </div>
                </div>

                <div className="font-mono text-base font-bold text-white pl-2">
                  ₹{Math.ceil(tx.amount).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Collapsible items (itemized mode) */}
              {settlementMethod === 'itemized' && expandedGroup === tx.id && (
                <div className="bg-slate-900/60 border-t border-slate-700/50 p-2 space-y-1">
                  {tx.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs px-2 py-1 hover:bg-slate-800/70 rounded"
                    >
                      <span className="text-slate-400 italic truncate w-2/3">
                        {item.reason}
                      </span>
                      <span className="text-slate-400 font-mono">
                        ₹{Math.ceil(item.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Smart mode badge */}
              {settlementMethod === 'smart' && (
                <div className="px-3 pb-2 flex justify-end">
                  <span className="bg-slate-700/60 px-2 py-0.5 rounded-full text-[10px] text-slate-400 font-medium">
                    Pooled
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SettlementEngine;
