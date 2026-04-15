import React from 'react';
import { Calculator, Share2, Download } from 'lucide-react';

/**
 * App header — editable trip name, total cost, Share and Export buttons.
 */
const Header = ({ tripName, onTripNameChange, totalSpent, onShare, onExport }) => {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200 gap-4">
      {/* Left: Logo + Trip Name */}
      <div className="flex items-start gap-3 min-w-0">
        <div className="bg-indigo-100 p-2.5 rounded-xl shrink-0">
          <Calculator className="w-5 h-5 text-indigo-600" />
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
          <p className="text-slate-400 mt-0.5 text-sm">Smart Expense Splitter</p>
        </div>
      </div>

      {/* Right: Total + Actions */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full lg:w-auto">
        <div className="text-right">
          <div className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">
            Total Spent
          </div>
          <div className="text-2xl md:text-3xl font-bold text-indigo-600">
            ₹{totalSpent.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            id="share-btn"
            onClick={onShare}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm text-sm font-medium"
            title="Share bill"
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
        </div>
      </div>
    </div>
  );
};

export default Header;
