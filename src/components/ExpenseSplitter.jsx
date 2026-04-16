import React, { useState, useEffect } from 'react';

// Components
import Header from './Header';
import ParticipantsCard from './ParticipantsCard';
import SettlementEngine from './SettlementEngine';
import BalanceSheet from './BalanceSheet';
import ExpenseTable from './ExpenseTable';
import ExpenseCard from './ExpenseCard';
import ShareModal from './ShareModal';
import RepayPanel from './RepayPanel';

// Utils & Hooks
import { calculateBalances, calculateSmartSettlements, calculateItemizedSettlements } from '../utils/calculations';
import { loadFromURL } from '../utils/sharing';
import { exportToCSV } from '../utils/csv';
import { usePersistedState, loadPersistedState, clearPersistedState } from '../hooks/usePersistedState';

// ─── Default seed data ────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];

const DEFAULT_PARTICIPANTS = [];
const DEFAULT_EXPENSES = [];
const DEFAULT_TRIP_NAME = '';

const DEFAULT_PAYMENT_METHODS = [];

// ─── Initialise state (URL > localStorage > defaults) ────────────────────────
function getInitialState() {
  const fromURL = loadFromURL();
  if (fromURL?.p && fromURL?.e) {
    return {
      participants: fromURL.p,
      expenses: fromURL.e,
      tripName: fromURL.t || DEFAULT_TRIP_NAME,
      paymentMethods: fromURL.pm || DEFAULT_PAYMENT_METHODS,
      fromURL: true,
    };
  }

  const persisted = loadPersistedState();
  if (persisted?.participants && persisted?.expenses) {
    return {
      participants: persisted.participants,
      expenses: persisted.expenses,
      tripName: persisted.tripName || DEFAULT_TRIP_NAME,
      paymentMethods: persisted.paymentMethods || DEFAULT_PAYMENT_METHODS,
      fromURL: false,
    };
  }

  return {
    participants: DEFAULT_PARTICIPANTS,
    expenses: DEFAULT_EXPENSES,
    tripName: DEFAULT_TRIP_NAME,
    paymentMethods: DEFAULT_PAYMENT_METHODS,
    fromURL: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

const ExpenseSplitter = () => {
  // Memoize initial state — getInitialState() must only run ONCE (it reads
  // localStorage + URL params; re-running it on every render is both wasteful
  // and a source of stale-read bugs during reset).
  const initialRef = React.useRef(null);
  if (!initialRef.current) initialRef.current = getInitialState();
  const initial = initialRef.current;

  const [participants, setParticipants] = useState(initial.participants);
  const [expenses, setExpenses] = useState(initial.expenses);
  const [tripName, setTripName] = useState(initial.tripName);
  const [paymentMethods, setPaymentMethods] = useState(initial.paymentMethods);
  const [newParticipant, setNewParticipant] = useState('');

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [settlementMethod, setSettlementMethod] = useState('smart');
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRepay, setShowRepay] = useState(!initial.fromURL ? true : false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ── URL-share → localStorage handoff ─────────────────────────────────────
  //
  // When the app is opened via a share link the URL param (?d=...) takes
  // priority over localStorage in getInitialState(). If the user edits
  // anything, we must:
  //   1. Strip the ?d= param from the address bar (so a refresh no longer
  //      loads the old shared data)
  //   2. Enable localStorage persistence so their edits are saved
  //
  // persistActive starts FALSE when loaded from a URL, TRUE for normal loads.
  const [persistActive, setPersistActive] = useState(!initial.fromURL);

  usePersistedState({ participants, expenses, tripName, paymentMethods }, persistActive);

  useEffect(() => {
    if (!initial.fromURL || persistActive) return; // nothing to do
    // User made their first edit on a shared-URL session → hand off to localStorage
    window.history.replaceState({}, '', window.location.pathname);
    setPersistActive(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, expenses, tripName, paymentMethods]);

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = e => {
      if (!e.target.closest('.split-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = e => {
      const tag = document.activeElement?.tagName;
      const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
      if (isEditing) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addExpenseRow();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setShowShareModal(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [participants]); // re-bind when participants change (addExpenseRow closure)

  // ─── Derived data ──────────────────────────────────────────────────────────
  const totalSpent = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const balances = calculateBalances(participants, expenses);
  const settlements =
    settlementMethod === 'smart'
      ? calculateSmartSettlements(balances)
      : calculateItemizedSettlements(participants, expenses);

  // ─── Participant handlers ──────────────────────────────────────────────────
  const addParticipant = () => {
    const name = newParticipant.trim();
    if (name && !participants.includes(name)) {
      setParticipants(prev => [...prev, name]);
      setNewParticipant('');
    }
  };

  const removeParticipant = name => {
    setParticipants(prev => prev.filter(p => p !== name));
    setExpenses(prev =>
      prev.map(e => ({
        ...e,
        paidBy: e.paidBy === name ? (participants.find(p => p !== name) || '') : e.paidBy,
        splitAmong: e.splitAmong.filter(p => p !== name),
      }))
    );
  };

  // ─── Expense handlers ──────────────────────────────────────────────────────
  const addExpenseRow = () => {
    setExpenses(prev => [
      ...prev,
      {
        id: Date.now(),
        date: TODAY,
        item: '',
        amount: 0,
        paidBy: participants[0] || '',
        splitAmong: [...participants],
        paymentMethod: null,
        includeOwnShare: false,
        noteAmount: null,            // override ₹ amount in note sentence
        repayAmountOverride: null,   // override computed repay amount per expense
        noteText: null,              // override full note sentence text
      },
    ]);
  };

  // ─── Payment method handlers ────────────────────────────────────────────────
  const addPaymentMethod = name => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPaymentMethods(prev =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
  };

  const createAndAssignPaymentMethod = (expenseId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Add to global list if new
    setPaymentMethods(prev =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    // Assign to expense
    setExpenses(prev =>
      prev.map(e => e.id === expenseId ? { ...e, paymentMethod: trimmed } : e)
    );
  };

  const assignPaymentMethod = (expenseId, name) => {
    setExpenses(prev =>
      prev.map(e => e.id === expenseId ? { ...e, paymentMethod: name } : e)
    );
  };

  const removePaymentMethod = expenseId => {
    setExpenses(prev =>
      prev.map(e => e.id === expenseId ? { ...e, paymentMethod: null } : e)
    );
  };

  const toggleOwnShare = expenseId => {
    setExpenses(prev =>
      prev.map(e =>
        e.id === expenseId ? { ...e, includeOwnShare: !(e.includeOwnShare || false) } : e
      )
    );
  };

  const updateNoteAmount = (expenseId, value) => {
    setExpenses(prev =>
      prev.map(e => e.id === expenseId ? { ...e, noteAmount: value } : e)
    );
  };

  const updateRepayAmount = (expenseId, value) => {
    setExpenses(prev =>
      prev.map(e => e.id === expenseId ? { ...e, repayAmountOverride: value } : e)
    );
  };

  const updateNoteText = (expenseId, value) => {
    setExpenses(prev =>
      prev.map(e => e.id === expenseId ? { ...e, noteText: value } : e)
    );
  };

  const updateExpense = (id, field, value) => {
    setExpenses(prev => prev.map(e => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const removeExpense = id => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const cloneExpense = id => {
    setExpenses(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx === -1) return prev;
      const source = prev[idx];
      const clone = { ...source, id: Date.now() };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  };

  const toggleSplitParticipant = (expenseId, person) => {
    setExpenses(prev =>
      prev.map(e => {
        if (e.id !== expenseId) return e;
        const isIncluded = e.splitAmong.includes(person);
        return {
          ...e,
          splitAmong: isIncluded
            ? e.splitAmong.filter(p => p !== person)
            : [...e.splitAmong, person],
        };
      })
    );
  };

  const toggleDropdown = id => {
    setActiveDropdownId(prev => (prev === id ? null : id));
  };

  // ─── Share payload ─────────────────────────────────────────────────────────
  const sharePayload = { p: participants, e: expenses, t: tripName, pm: paymentMethods };

  // ─── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    // Clear persisted state synchronously, then reload for a guaranteed fresh start.
    // This avoids any in-memory stale state, debounced-save races, or HMR artifacts.
    clearPersistedState();
    window.history.replaceState({}, '', window.location.pathname);
    window.location.reload();
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white p-3 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <Header
          tripName={tripName}
          onTripNameChange={setTripName}
          totalSpent={totalSpent}
          onShare={() => setShowShareModal(true)}
          onExport={() => exportToCSV(expenses, `${tripName || 'expense_trip'}.csv`)}
          showRepay={showRepay}
          onToggleRepay={() => setShowRepay(prev => !prev)}
        />

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6 xl:col-span-1 order-1 xl:order-1">

            <ParticipantsCard
              participants={participants}
              newParticipant={newParticipant}
              onNewParticipantChange={setNewParticipant}
              onAdd={addParticipant}
              onRemove={removeParticipant}
            />

            <SettlementEngine
              settlements={settlements}
              totalSpent={totalSpent}
              settlementMethod={settlementMethod}
              onMethodChange={setSettlementMethod}
              expandedGroup={expandedGroup}
              onToggleGroup={id => setExpandedGroup(prev => (prev === id ? null : id))}
            />

            <BalanceSheet balances={balances} />

            {showRepay && (
              <div className="hidden xl:block">
                <RepayPanel
                  expenses={expenses}
                  onToggleOwnShare={toggleOwnShare}
                  onUpdateNoteAmount={updateNoteAmount}
                  onUpdateRepayAmount={updateRepayAmount}
                  onUpdateNoteText={updateNoteText}
                />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Expense log */}
          <div className="xl:col-span-2 order-2 xl:order-2 space-y-2">

            {/* Mobile cards */}
            <div className="md:hidden bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  Expense Log
                  <span className="text-[10px] font-normal text-slate-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    {expenses.length}
                  </span>
                </h2>
                <button
                  onClick={addExpenseRow}
                  className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
                >
                  + Add
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="py-14 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                  <span className="text-3xl">🧾</span>
                  <span>No expenses yet. Tap <strong>Add</strong> to start.</span>
                </div>
              ) : (
                expenses.map(expense => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    participants={participants}
                    paymentMethods={paymentMethods}
                    activeDropdownId={activeDropdownId}
                    onUpdate={updateExpense}
                    onRemove={removeExpense}
                    onClone={cloneExpense}
                    onToggleSplit={toggleSplitParticipant}
                    onToggleDropdown={toggleDropdown}
                    onAssignPaymentMethod={assignPaymentMethod}
                    onCreatePaymentMethod={createAndAssignPaymentMethod}
                    onRemovePaymentMethod={removePaymentMethod}
                  />
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <ExpenseTable
                expenses={expenses}
                participants={participants}
                paymentMethods={paymentMethods}
                activeDropdownId={activeDropdownId}
                onUpdate={updateExpense}
                onRemove={removeExpense}
                onClone={cloneExpense}
                onAddRow={addExpenseRow}
                onToggleSplit={toggleSplitParticipant}
                onToggleDropdown={toggleDropdown}
                onAssignPaymentMethod={assignPaymentMethod}
                onCreatePaymentMethod={createAndAssignPaymentMethod}
                onRemovePaymentMethod={removePaymentMethod}
              />
            </div>
          </div>
        </div>

        {/* Mobile-only Repay panel — rendered after the expense log so it appears last on mobile */}
        {showRepay && (
          <div className="xl:hidden">
            <RepayPanel
              expenses={expenses}
              onToggleOwnShare={toggleOwnShare}
              onUpdateNoteAmount={updateNoteAmount}
              onUpdateRepayAmount={updateRepayAmount}
              onUpdateNoteText={updateNoteText}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-slate-400 text-xs py-4 border-t border-gray-100">
          <span className="text-slate-300">Developed by Yash Khandelwal</span>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-slate-300/70">
              <kbd className="font-sans bg-white border border-gray-200 px-1 rounded text-[9px] text-slate-400">Ctrl+N</kbd> new row
              {' · '}
              <kbd className="font-sans bg-white border border-gray-200 px-1 rounded text-[9px] text-slate-400">Ctrl+S</kbd> share
            </span>

            {/* Inline reset confirmation — avoids window.confirm() which Chrome can block */}
            {showResetConfirm ? (
              <span className="flex items-center gap-2">
                <span className="text-slate-400">Reset everything?</span>
                <button
                  onClick={handleReset}
                  className="text-red-500 hover:text-red-600 font-semibold transition-colors"
                >
                  Yes, reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="text-slate-300 hover:text-red-400 transition-colors text-xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          payload={sharePayload}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default ExpenseSplitter;