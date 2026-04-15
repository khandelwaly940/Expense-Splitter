import React, { useState, useEffect, useCallback } from 'react';

// Components
import Header from './Header';
import ParticipantsCard from './ParticipantsCard';
import SettlementEngine from './SettlementEngine';
import BalanceSheet from './BalanceSheet';
import ExpenseTable from './ExpenseTable';
import ExpenseCard from './ExpenseCard';
import ShareModal from './ShareModal';

// Utils & Hooks
import { calculateBalances, calculateSmartSettlements, calculateItemizedSettlements } from '../utils/calculations';
import { loadFromURL } from '../utils/sharing';
import { exportToCSV } from '../utils/csv';
import { usePersistedState, loadPersistedState, clearPersistedState } from '../hooks/usePersistedState';

// ─── Default seed data ────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];

const DEFAULT_PARTICIPANTS = ['Alice', 'Bob', 'Charlie'];
const DEFAULT_EXPENSES = [
  { id: 1, date: TODAY, item: 'Dinner', amount: 1800, paidBy: 'Alice', splitAmong: ['Alice', 'Bob', 'Charlie'] },
  { id: 2, date: TODAY, item: 'Drinks', amount: 600, paidBy: 'Bob', splitAmong: ['Alice', 'Bob', 'Charlie'] },
];
const DEFAULT_TRIP_NAME = '';

// ─── Initialise state (URL > localStorage > defaults) ────────────────────────
function getInitialState() {
  const fromURL = loadFromURL();
  if (fromURL?.p && fromURL?.e) {
    return {
      participants: fromURL.p,
      expenses: fromURL.e,
      tripName: fromURL.t || DEFAULT_TRIP_NAME,
      fromURL: true,
    };
  }

  const persisted = loadPersistedState();
  if (persisted?.participants && persisted?.expenses) {
    return {
      participants: persisted.participants,
      expenses: persisted.expenses,
      tripName: persisted.tripName || DEFAULT_TRIP_NAME,
      fromURL: false,
    };
  }

  return {
    participants: DEFAULT_PARTICIPANTS,
    expenses: DEFAULT_EXPENSES,
    tripName: DEFAULT_TRIP_NAME,
    fromURL: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

const ExpenseSplitter = () => {
  const initial = getInitialState();

  const [participants, setParticipants] = useState(initial.participants);
  const [expenses, setExpenses] = useState(initial.expenses);
  const [tripName, setTripName] = useState(initial.tripName);
  const [newParticipant, setNewParticipant] = useState('');

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [settlementMethod, setSettlementMethod] = useState('smart');
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Persist to localStorage (debounced). Skip on first render if loaded from URL.
  const persistEnabled = !initial.fromURL;
  usePersistedState({ participants, expenses, tripName }, persistEnabled);

  // After URL load, start persisting on next change
  const [_persistActive, setPersistActive] = useState(persistEnabled);
  useEffect(() => {
    if (initial.fromURL) {
      // Once state changes from user interaction, enable persistence
      setPersistActive(true);
    }
  }, [participants, expenses, tripName]);

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
      },
    ]);
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
  const sharePayload = { p: participants, e: expenses, t: tripName };

  // ─── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm('Reset all data? This cannot be undone.')) return;
    clearPersistedState();
    setParticipants(DEFAULT_PARTICIPANTS);
    setExpenses(DEFAULT_EXPENSES);
    setTripName(DEFAULT_TRIP_NAME);
    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);
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
          </div>

          {/* RIGHT COLUMN: Expense log */}
          <div className="xl:col-span-2 order-2 xl:order-2 space-y-2">

            {/* Mobile cards */}
            <div className="md:hidden bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="font-semibold text-slate-700 text-sm">
                  Expense Log
                  <span className="ml-2 text-xs font-normal text-slate-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    {expenses.length}
                  </span>
                </h2>
                <button
                  onClick={addExpenseRow}
                  className="text-sm bg-white border border-gray-200 text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium"
                >
                  + Add
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm italic">
                  No expenses yet. Tap <strong>Add</strong> to start.
                </div>
              ) : (
                expenses.map(expense => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    participants={participants}
                    activeDropdownId={activeDropdownId}
                    onUpdate={updateExpense}
                    onRemove={removeExpense}
                    onClone={cloneExpense}
                    onToggleSplit={toggleSplitParticipant}
                    onToggleDropdown={toggleDropdown}
                  />
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <ExpenseTable
                expenses={expenses}
                participants={participants}
                activeDropdownId={activeDropdownId}
                onUpdate={updateExpense}
                onRemove={removeExpense}
                onClone={cloneExpense}
                onAddRow={addExpenseRow}
                onToggleSplit={toggleSplitParticipant}
                onToggleDropdown={toggleDropdown}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-slate-400 text-xs py-4 border-t border-gray-200">
          <span>Developed by Yash Khandelwal</span>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-slate-300">
              Ctrl+N — new row · Ctrl+S — share
            </span>
            <button
              onClick={handleReset}
              className="text-slate-300 hover:text-red-400 transition-colors text-xs underline underline-offset-2"
            >
              Reset
            </button>
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