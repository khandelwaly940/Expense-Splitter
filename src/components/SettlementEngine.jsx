import React from 'react';
import { DollarSign, ArrowRightLeft, List, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Settlement engine panel — shows who pays whom in Smart or Itemized mode.
 * Light-theme consistent with the rest of the app.
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
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 flex flex-col max-h-[520px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-gray-100 gap-3">
        <h2 className="text-xs font-semibold flex items-center gap-2 text-slate-500 uppercase tracking-widest">
          <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
          Who Pays Whom?
        </h2>

        {/* Mode Switcher */}
        <div className="flex bg-gray-100 rounded-xl p-1 text-xs self-start sm:self-auto">
          <button
            onClick={() => onMethodChange('smart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
              settlementMethod === 'smart'
                ? 'bg-white text-indigo-600 shadow-sm border border-gray-200'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3" />
            Smart
          </button>
          <button
            onClick={() => onMethodChange('itemized')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
              settlementMethod === 'itemized'
                ? 'bg-white text-indigo-600 shadow-sm border border-gray-200'
                : 'text-slate-400 hover:text-slate-600'
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
          <div className="text-slate-400 text-center py-8 text-sm">
            {totalSpent === 0
              ? 'Add expenses to calculate.'
              : '🎉 Everyone is settled up!'}
          </div>
        ) : (
          settlements.map((tx, idx) => (
            <div
              key={tx.id || idx}
              className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col overflow-hidden hover:border-gray-300 transition-colors"
            >
              {/* Main row */}
              <div
                className={`p-3 flex items-center justify-between ${
                  settlementMethod === 'itemized'
                    ? 'cursor-pointer hover:bg-gray-100 transition-colors'
                    : ''
                }`}
                onClick={() => settlementMethod === 'itemized' && onToggleGroup(tx.id)}
              >
                <div className="flex items-center gap-2">
                  {settlementMethod === 'itemized' && (
                    <div className="text-slate-400">
                      {expandedGroup === tx.id ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                  {/* Left accent */}
                  <div className="w-1 h-5 rounded-full bg-red-400 shrink-0" />
                  <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
                    <span className="font-semibold text-red-600">{tx.from}</span>
                    <span className="text-slate-400 text-xs">→</span>
                    <span className="font-semibold text-emerald-600">{tx.to}</span>
                  </div>
                </div>

                <div className="font-mono text-sm font-bold text-slate-800 pl-2 tabular-nums">
                  ₹{Math.ceil(tx.amount).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Collapsible items (itemized mode) */}
              {settlementMethod === 'itemized' && expandedGroup === tx.id && (
                <div className="bg-white border-t border-gray-100 p-2 space-y-1">
                  {tx.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs px-2 py-1 hover:bg-gray-50 rounded"
                    >
                      <span className="text-slate-400 italic truncate w-2/3">
                        {item.reason}
                      </span>
                      <span className="text-slate-500 font-mono tabular-nums">
                        ₹{Math.ceil(item.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Smart mode badge */}
              {settlementMethod === 'smart' && (
                <div className="px-3 pb-2 flex justify-end">
                  <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-[10px] text-slate-400 font-medium">
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
