import React, { useState } from 'react';
import { Check, Users, ChevronDown } from 'lucide-react';

/**
 * Reusable multi-select dropdown for splitting expenses among participants.
 * Used in both desktop table and mobile card views.
 */
const SplitDropdown = ({
  expenseId,
  participants,
  splitAmong,
  isOpen,
  onToggle,
  onToggleParticipant,
  isMobile = false,
}) => {
  const allSelected = splitAmong.length === participants.length;
  const noneSelected = splitAmong.length === 0;

  const label =
    allSelected ? 'Everyone'
    : noneSelected ? 'No one'
    : `${splitAmong.length} of ${participants.length}`;

  const selectAll = e => {
    e.stopPropagation();
    participants.forEach(p => {
      if (!splitAmong.includes(p)) onToggleParticipant(expenseId, p);
    });
  };

  const deselectAll = e => {
    e.stopPropagation();
    participants.forEach(p => {
      if (splitAmong.includes(p)) onToggleParticipant(expenseId, p);
    });
  };

  return (
    <div className="relative split-dropdown-container">
      {/* Trigger Button */}
      {isMobile ? (
        <button
          onClick={onToggle}
          className="w-full text-left bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl text-slate-700 flex justify-between items-center text-xs font-medium gap-1"
        >
          <span className="truncate max-w-[90px]">{label}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          onClick={onToggle}
          className="w-full px-2 py-1.5 text-left bg-transparent rounded-lg hover:bg-white border border-transparent hover:border-gray-200 focus:ring-1 focus:ring-indigo-400 text-sm flex justify-between items-center gap-1 transition-all"
        >
          <span className="truncate text-sm">{label}</span>
          <Users className="w-3 h-3 text-slate-400 shrink-0" />
        </button>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute z-50 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-slideUp ${
            isMobile ? 'top-10 left-0' : 'top-10 left-0'
          }`}
        >
          {/* Header */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Split with</span>
            <div className="flex gap-2">
              <button
                className={`text-[10px] font-semibold transition-colors ${
                  allSelected ? 'text-slate-300 cursor-default' : 'text-indigo-500 hover:text-indigo-700'
                }`}
                onClick={selectAll}
                disabled={allSelected}
              >
                All
              </button>
              <span className="text-slate-300 text-[10px]">·</span>
              <button
                className={`text-[10px] font-semibold transition-colors ${
                  noneSelected ? 'text-slate-300 cursor-default' : 'text-slate-400 hover:text-red-500'
                }`}
                onClick={deselectAll}
                disabled={noneSelected}
              >
                None
              </button>
            </div>
          </div>

          {/* Participant List */}
          <div className="py-1">
            {participants.map(p => {
              const isChecked = splitAmong.includes(p);
              return (
                <div
                  key={p}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 cursor-pointer transition-colors"
                  onClick={() => onToggleParticipant(expenseId, p)}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      isChecked
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-sm text-slate-700">{p}</span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-100 text-center bg-gray-50/50">
            <button
              className="text-xs text-indigo-600 font-semibold hover:underline"
              onClick={onToggle}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplitDropdown;
