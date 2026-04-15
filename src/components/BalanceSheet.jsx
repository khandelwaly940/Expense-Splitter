import React from 'react';

/**
 * Detailed balance sheet with per-person paid/share breakdown
 * and a visual CSS bar chart comparing paid vs share.
 */
const BalanceSheet = ({ balances }) => {
  if (balances.length === 0) return null;

  const maxPaid = Math.max(...balances.map(b => b.paid), 1);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
        Detailed Breakdown
      </h3>

      <div className="space-y-4">
        {balances.map(b => {
          const isPositive = b.balance >= 0;
          const paidPct = Math.min((b.paid / maxPaid) * 100, 100);
          const sharePct = Math.min((b.share / maxPaid) * 100, 100);

          return (
            <div key={b.name} className="space-y-1.5">
              {/* Name + net balance */}
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-slate-700">{b.name}</span>
                <span
                  className={`text-sm font-bold ${
                    isPositive ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {b.balance > 0 ? '+' : ''}
                  ₹{b.balance.toFixed(2)}
                </span>
              </div>

              {/* Bar chart: paid vs share */}
              <div className="space-y-1">
                {/* Paid bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 w-8 text-right shrink-0">Paid</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                      style={{ width: `${paidPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 w-16 text-right shrink-0 font-mono">
                    ₹{b.paid.toFixed(0)}
                  </span>
                </div>

                {/* Share bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 w-8 text-right shrink-0">Share</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-300 rounded-full transition-all duration-500"
                      style={{ width: `${sharePct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 w-16 text-right shrink-0 font-mono">
                    ₹{b.share.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-b border-gray-100" />
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
          <span className="text-[10px] text-slate-400">Paid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-300" />
          <span className="text-[10px] text-slate-400">Share</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-slate-400">Gets back</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-[10px] text-slate-400">Owes</span>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheet;
