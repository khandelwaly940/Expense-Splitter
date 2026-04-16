import React, { useState, useRef, useEffect } from 'react';
import { Calculator, Share2, Download, MoreHorizontal, CreditCard, Check } from 'lucide-react';

/**
 * App header — editable trip name, total cost, Share, Export and ⋯ options menu.
 * The options menu contains a toggle for the Repay panel visibility.
 */
const Header = ({
  tripName,
  onTripNameChange,
  totalSpent,
  onShare,
  onExport,
  showRepay,
  onToggleRepay,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white/80 backdrop-blur-sm p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200/80 gap-4">

      {/* Left: Logo + Trip Name */}
      <div className="flex items-start gap-3 min-w-0">
        <div className="bg-indigo-600 p-2.5 rounded-xl shrink-0 shadow-sm">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <input
            type="text"
            value={tripName}
            onChange={e => onTripNameChange(e.target.value)}
            placeholder="Trip Name…"
            className="text-lg md:text-xl font-bold text-slate-900 bg-transparent border-0 border-b-2 border-transparent focus:border-indigo-400 focus:outline-none transition-colors w-full max-w-xs placeholder-slate-300"
            aria-label="Trip name"
          />
          <p className="text-slate-400 mt-0.5 text-xs font-medium tracking-wide uppercase">
            Smart Expense Splitter
          </p>
        </div>
      </div>

      {/* Right: Total + Actions */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full lg:w-auto">

        {/* Total */}
        <div className="text-right">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            Total Spent
          </div>
          <div className="text-2xl md:text-3xl font-bold text-indigo-600 tabular-nums">
            ₹{totalSpent.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 w-full sm:w-auto items-center">
          <button
            id="share-btn"
            onClick={onShare}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm text-sm font-medium"
            title="Share bill (Ctrl+S)"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button
            id="export-btn"
            onClick={onExport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 active:scale-95 transition-all shadow-sm text-sm font-medium"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* ⋯ Options menu */}
          <div ref={menuRef} className="relative">
            <button
              id="options-btn"
              onClick={() => setMenuOpen(prev => !prev)}
              className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all
                ${menuOpen
                  ? 'bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-white border-gray-200 text-slate-500 hover:bg-gray-50 hover:text-slate-700'
                }`}
              title="More options"
              aria-label="More options"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-slideUp">
                <div className="px-3 py-2 border-b border-gray-100">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                    Display Options
                  </span>
                </div>

                {/* Show Repay toggle */}
                <button
                  type="button"
                  onClick={() => { onToggleRepay(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-violet-500 shrink-0" />
                  <span className="flex-1 text-left">Show Repay Panel</span>
                  <div className={`w-8 h-4.5 rounded-full border flex items-center transition-colors shrink-0 ${
                    showRepay ? 'bg-violet-600 border-violet-600' : 'bg-gray-200 border-gray-300'
                  }`}
                    style={{ height: '18px' }}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${
                      showRepay ? 'translate-x-3.5' : 'translate-x-0'
                    }`} />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
