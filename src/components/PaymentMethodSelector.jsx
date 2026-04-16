import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, Plus, X, ChevronDown } from 'lucide-react';

/**
 * Inline payment-method pill + dropdown for each expense row.
 *
 * Props:
 *  expenseId        — expense record id
 *  paymentMethod    — current method name (string | null)
 *  paymentMethods   — global list of method names
 *  onAssign         — (expenseId, methodName) => void
 *  onCreateAndAssign— (expenseId, methodName) => void  (creates globally + assigns)
 *  onRemove         — (expenseId) => void
 *  isMobile         — boolean — slightly different styling
 */
const PaymentMethodSelector = ({
  expenseId,
  paymentMethod,
  paymentMethods,
  onAssign,
  onCreateAndAssign,
  onRemove,
  isMobile = false,
}) => {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setNewName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Auto-focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const handleSelect = method => {
    onAssign(expenseId, method);
    setOpen(false);
    setNewName('');
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreateAndAssign(expenseId, name);
    setOpen(false);
    setNewName('');
  };

  const handleRemove = e => {
    e.stopPropagation();
    onRemove(expenseId);
  };

  // ── Pill trigger ──────────────────────────────────────────────────────────
  const hasMehod = !!paymentMethod;

  const pill = hasMehod ? (
    <button
      type="button"
      onClick={() => setOpen(prev => !prev)}
      className={`flex items-center gap-1 rounded-full text-xs font-medium transition-all
        ${isMobile
          ? 'px-2 py-1 bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200'
          : 'px-2 py-0.5 bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200'
        }`}
    >
      <CreditCard className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[80px]">{paymentMethod}</span>
      <ChevronDown className="w-2.5 h-2.5 shrink-0 opacity-60" />
      <span
        role="button"
        tabIndex={0}
        onClick={handleRemove}
        onKeyDown={e => e.key === 'Enter' && handleRemove(e)}
        className="ml-0.5 hover:text-red-500 transition-colors"
        title="Remove payment method"
      >
        <X className="w-2.5 h-2.5" />
      </span>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(prev => !prev)}
      className={`flex items-center gap-1 rounded-full text-xs transition-all border border-dashed
        ${isMobile
          ? 'px-2 py-1 border-slate-300 text-slate-400 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50'
          : 'px-2 py-0.5 border-slate-200 text-slate-300 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/50'
        }`}
    >
      <CreditCard className="w-3 h-3 shrink-0" />
      <span>method</span>
    </button>
  );

  // ── Dropdown ──────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative payment-method-container">
      {pill}

      {open && (
        <div
          className="absolute z-50 mt-1 left-0 w-52 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
          style={{ top: '100%' }}
        >
          {/* Existing methods */}
          {paymentMethods.length > 0 && (
            <div className="py-1 border-b border-gray-100">
              {paymentMethods.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelect(m)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors
                    ${m === paymentMethod
                      ? 'bg-violet-50 text-violet-700 font-semibold'
                      : 'text-slate-700 hover:bg-gray-50'
                    }`}
                >
                  <CreditCard className="w-3 h-3 text-violet-400 shrink-0" />
                  <span className="truncate">{m}</span>
                  {m === paymentMethod && (
                    <span className="ml-auto text-violet-500 text-[10px]">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Create new */}
          <div className="p-2">
            <div className="flex items-center gap-1.5">
              <Plus className="w-3 h-3 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setOpen(false); setNewName(''); }
                }}
                placeholder="New method…"
                className="flex-1 text-xs outline-none placeholder-slate-300 text-slate-700 bg-transparent"
              />
              {newName.trim() && (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="text-[10px] bg-violet-600 text-white px-2 py-0.5 rounded-full font-medium hover:bg-violet-700 transition-colors"
                >
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Remove option (when assigned) */}
          {hasMehod && (
            <div className="border-t border-gray-100 py-1">
              <button
                type="button"
                onClick={() => { onRemove(expenseId); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <X className="w-3 h-3" />
                Remove method
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
