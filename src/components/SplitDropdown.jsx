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
  const label =
    splitAmong.length === participants.length
      ? 'Everyone'
      : splitAmong.length === 0
      ? 'No one'
      : `${splitAmong.length} people`;

  const allSelected = splitAmong.length === participants.length;
  const noneSelected = splitAmong.length === 0;

  const selectAll = (e) => {
    e.stopPropagation();
    participants.forEach(p => {
      if (!splitAmong.includes(p)) onToggleParticipant(expenseId, p);
    });
  };

  const deselectAll = (e) => {
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
          className="w-full text-left bg-gray-50 border border-gray-200 px-2 py-1 rounded text-slate-700 flex justify-between items-center text-sm"
        >
          <span className="truncate max-w-[100px]">{label}</span>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </button>
      ) : (
        <button
          onClick={onToggle}
          className="w-full p-2 text-left bg-transparent rounded hover:bg-white border border-transparent hover:border-gray-200 focus:ring-1 focus:ring-blue-400 text-sm flex justify-between items-center"
        >
          <span className="truncate">{label}</span>
          <Users className="w-3 h-3 text-slate-400 shrink-0" />
        </button>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute z-50 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden ${
            isMobile ? 'top-9 left-0' : 'top-10 left-0'
          }`}
        >
          {/* Header with Select All / Deselect All */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Split with</span>
            <div className="flex gap-2">
              <button
                className={`text-[10px] font-medium transition-colors ${
                  allSelected ? 'text-slate-300 cursor-default' : 'text-blue-500 hover:text-blue-700'
                }`}
                onClick={selectAll}
                disabled={allSelected}
              >
                All
              </button>
              <span className="text-slate-300 text-[10px]">·</span>
              <button
                className={`text-[10px] font-medium transition-colors ${
                  noneSelected ? 'text-slate-300 cursor-default' : 'text-slate-500 hover:text-red-500'
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
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => onToggleParticipant(expenseId, p)}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      isChecked
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300 hover:border-blue-400'
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
          <div className="px-3 py-2 border-t border-gray-100 text-center">
            <button
              className="text-xs text-blue-600 font-semibold hover:underline"
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
