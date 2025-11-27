import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Calculator, DollarSign, Check, Download, Share2, Link as LinkIcon, ArrowRightLeft, List, ChevronDown, ChevronRight, Calendar, User } from 'lucide-react';

const ExpenseSplitter = () => {
  // --- State Management ---
  const [participants, setParticipants] = useState(['Alice', 'Bob', 'Charlie']);
  const [newParticipant, setNewParticipant] = useState('');
  
  // Default data (will be overwritten if URL has data)
  const [expenses, setExpenses] = useState([
    { id: 1, date: new Date().toISOString().split('T')[0], item: 'Dinner', amount: 1800, paidBy: 'Alice', splitAmong: ['Alice', 'Bob', 'Charlie'] },
    { id: 2, date: new Date().toISOString().split('T')[0], item: 'Drinks', amount: 600, paidBy: 'Bob', splitAmong: ['Alice', 'Bob', 'Charlie'] },
  ]);

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [settlementMethod, setSettlementMethod] = useState('smart'); // 'smart' or 'itemized'
  const [expandedGroup, setExpandedGroup] = useState(null); // To track which itemized group is open

  // --- 1. Load Data from URL (Sharing Logic) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    if (data) {
      try {
        const decoded = JSON.parse(atob(data));
        if (decoded.p && decoded.e) {
            setParticipants(decoded.p);
            setExpenses(decoded.e);
        }
      } catch (e) {
        console.error("Failed to load shared bill", e);
      }
    }
  }, []);

  // --- Logic Engine ---

  const totalSpent = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  const calculateBalances = () => {
    let balanceMap = {};
    participants.forEach(p => {
      balanceMap[p] = { paid: 0, share: 0, net: 0 };
    });

    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount) || 0;
      const payer = expense.paidBy;
      const beneficiaries = expense.splitAmong.filter(p => participants.includes(p)); 
      
      const validBeneficiaries = beneficiaries.length > 0 ? beneficiaries : [payer];
      const costPerPerson = amount / validBeneficiaries.length;

      if (balanceMap[payer]) {
        balanceMap[payer].paid += amount;
      }

      validBeneficiaries.forEach(person => {
        if (balanceMap[person]) {
          balanceMap[person].share += costPerPerson;
        }
      });
    });

    return participants.map(p => ({
      name: p,
      paid: balanceMap[p].paid,
      share: balanceMap[p].share,
      balance: balanceMap[p].paid - balanceMap[p].share
    }));
  };

  const balances = calculateBalances();

  // --- Method 1: Smart Settle (Pooling / Greedy) ---
  const calculateSmartSettlements = () => {
    let debtors = balances
      .filter(b => b.balance < -0.01)
      .map(b => ({ ...b, balance: b.balance }));
    
    let creditors = balances
      .filter(b => b.balance > 0.01)
      .map(b => ({ ...b, balance: b.balance }));

    debtors.sort((a, b) => a.balance - b.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const transactions = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      let debtor = debtors[i];
      let creditor = creditors[j];

      let amount = Math.min(Math.abs(debtor.balance), creditor.balance);

      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: amount,
        reason: 'Settlement' 
      });

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (creditor.balance < 0.01) j++;
    }

    return transactions;
  };

  // --- Method 2: Itemized (Aggregated by Person Pair) ---
  const calculateItemizedSettlements = () => {
    const map = new Map(); // Key: "From-To"

    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount) || 0;
      const payer = expense.paidBy;
      const beneficiaries = expense.splitAmong.filter(p => participants.includes(p));
      
      if (beneficiaries.length === 0) return;

      const costPerPerson = amount / beneficiaries.length;

      beneficiaries.forEach(person => {
        if (person !== payer) {
          const key = `${person}-${payer}`;
          if (!map.has(key)) {
            map.set(key, { 
              from: person, 
              to: payer, 
              amount: 0, 
              items: [],
              id: key // Unique ID for toggle
            });
          }
          const entry = map.get(key);
          entry.amount += costPerPerson;
          entry.items.push({ 
            reason: expense.item || 'Untitled', 
            amount: costPerPerson 
          });
        }
      });
    });

    return Array.from(map.values());
  };

  const settlements = settlementMethod === 'smart' ? calculateSmartSettlements() : calculateItemizedSettlements();

  // --- Handlers ---

  const addParticipant = () => {
    const name = newParticipant.trim();
    if (name && !participants.includes(name)) {
      setParticipants([...participants, name]);
      setNewParticipant('');
    }
  };

  const removeParticipant = (name) => {
    setParticipants(participants.filter(p => p !== name));
    setExpenses(expenses.map(e => ({
      ...e,
      paidBy: e.paidBy === name ? (participants.find(p => p !== name) || '') : e.paidBy,
      splitAmong: e.splitAmong.filter(p => p !== name)
    })));
  };

  const addExpenseRow = () => {
    setExpenses([
      ...expenses,
      { 
        id: Date.now(), 
        date: new Date().toISOString().split('T')[0], 
        item: '', 
        amount: 0, 
        paidBy: participants[0] || '',
        splitAmong: [...participants] 
      }
    ]);
  };

  const updateExpense = (id, field, value) => {
    setExpenses(expenses.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const toggleSplitParticipant = (expenseId, person) => {
    setExpenses(expenses.map(e => {
      if (e.id !== expenseId) return e;
      
      const isIncluded = e.splitAmong.includes(person);
      let newSplit;
      if (isIncluded) {
        newSplit = e.splitAmong.filter(p => p !== person);
      } else {
        newSplit = [...e.splitAmong, person];
      }
      return { ...e, splitAmong: newSplit };
    }));
  };

  const removeExpense = (id) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const generateShareLink = () => {
    const payload = { p: participants, e: expenses };
    const encoded = btoa(JSON.stringify(payload));
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    
    const copyToClipboardFallback = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 3000);
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            prompt("Copy this link:", text);
        }
        document.body.removeChild(textArea);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
            .then(() => {
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 3000);
            })
            .catch(() => {
                copyToClipboardFallback(url);
            });
    } else {
        copyToClipboardFallback(url);
    }
  };

  const exportToCSV = () => {
    const headers = ["Date,Item Description,Amount,Paid By,Split Among"];
    const rows = expenses.map(e => {
      const safeItem = e.item.replace(/,/g, " "); 
      const safeSplit = e.splitAmong.join("; ");
      return `${e.date},${safeItem},${e.amount},${e.paidBy},"${safeSplit}"`;
    });

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "expense_trip_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.split-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleGroup = (id) => {
    setExpandedGroup(expandedGroup === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-8 font-sans text-slate-800">
      
      {showShareToast && (
        <div className="fixed top-5 right-5 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-bounce">
            <LinkIcon className="w-5 h-5 text-green-400" />
            <div>
                <div className="font-bold text-sm">Link Copied!</div>
                <div className="text-xs text-slate-300">Share this URL with your friends.</div>
            </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-blue-600" />
              Smart Expense Splitter
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Split bills easily with friends.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full lg:w-auto">
             <div className="text-right mr-2">
                <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Total Trip Cost</div>
                <div className="text-2xl md:text-3xl font-bold text-blue-600">₹{totalSpent.toLocaleString('en-IN')}</div>
             </div>
             
             <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={generateShareLink}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                  title="Copy Link to Clipboard"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
                
                <button 
                  onClick={exportToCSV}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm"
                  title="Download as CSV"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Configuration & Settlements */}
          <div className="space-y-6 xl:col-span-1 order-2 xl:order-1">
            
            {/* Participants Card */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-indigo-500" />
                People Involved
              </h2>
              
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  placeholder="Add Name..." 
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                />
                <button 
                  onClick={addParticipant}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {participants.map(p => (
                  <div key={p} className="flex items-center gap-2 bg-indigo-50 text-indigo-800 px-3 py-1 rounded-full text-sm">
                    {p}
                    <button onClick={() => removeParticipant(p)} className="hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SETTLEMENT ENGINE */}
            <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg flex flex-col max-h-[500px]">
              
              {/* Header with Toggle */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-slate-700 gap-3">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                  Who Pays Whom?
                </h2>
                
                {/* Mode Switcher */}
                <div className="flex bg-slate-800 rounded-lg p-1 text-xs self-start sm:self-auto">
                  <button 
                    onClick={() => setSettlementMethod('smart')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all ${settlementMethod === 'smart' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    <ArrowRightLeft className="w-3 h-3" /> Smart
                  </button>
                  <button 
                    onClick={() => setSettlementMethod('itemized')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all ${settlementMethod === 'itemized' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    <List className="w-3 h-3" /> Itemized
                  </button>
                </div>
              </div>
              
              {/* Results List */}
              <div className="overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {settlements.length === 0 ? (
                  <div className="text-slate-400 text-center py-4 italic">
                    {totalSpent === 0 ? "Add expenses to calculate." : "Everyone is settled up!"}
                  </div>
                ) : (
                    settlements.map((tx, idx) => (
                      <div key={idx} className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
                        
                        {/* Main Row */}
                        <div 
                          className={`p-3 flex items-center justify-between ${settlementMethod === 'itemized' ? 'cursor-pointer hover:bg-slate-700/50 transition-colors' : ''}`}
                          onClick={() => settlementMethod === 'itemized' && toggleGroup(tx.id)}
                        >
                          <div className="flex items-center gap-2">
                             {settlementMethod === 'itemized' && (
                               <div className="text-slate-400">
                                 {expandedGroup === tx.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                               </div>
                             )}
                             <div className="flex flex-wrap items-center gap-x-2 text-sm">
                                <span className="font-bold text-red-300">{tx.from}</span>
                                <span className="text-slate-500">→</span>
                                <span className="font-bold text-green-300">{tx.to}</span>
                              </div>
                          </div>
                          
                          <div className="font-mono text-lg font-bold text-white pl-2">
                            ₹{Math.ceil(tx.amount).toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Collapsible Tree (Itemized Mode Only) */}
                        {settlementMethod === 'itemized' && expandedGroup === tx.id && (
                          <div className="bg-slate-900/50 border-t border-slate-700 p-2 space-y-1">
                            {tx.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs px-2 py-1 hover:bg-slate-800 rounded">
                                <span className="text-slate-300 italic truncate w-2/3">{item.reason}</span>
                                <span className="text-slate-400 font-mono">₹{Math.ceil(item.amount).toLocaleString('en-IN')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Smart Mode Tag */}
                        {settlementMethod === 'smart' && (
                           <div className="px-3 pb-2 text-xs text-slate-500 flex justify-end">
                              <span className="bg-slate-700 px-1.5 rounded text-[10px] text-slate-300">Pooled</span>
                           </div>
                        )}
                        
                      </div>
                    ))
                )}
              </div>
            </div>

             {/* Detailed Balance Sheet */}
             <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
               <h3 className="text-sm font-semibold uppercase text-slate-500 mb-3">Detailed Breakdown</h3>
               <div className="space-y-3">
                 {balances.map((b) => (
                   <div key={b.name} className="flex flex-col text-sm border-b border-gray-100 pb-2 last:border-0">
                     <div className="flex justify-between font-medium">
                        <span>{b.name}</span>
                        <span className={b.balance >= 0 ? "text-green-600" : "text-red-500"}>
                          {b.balance > 0 ? "+" : ""}{b.balance.toFixed(2)}
                        </span>
                     </div>
                     <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Paid: ₹{b.paid.toFixed(2)}</span>
                        <span>Share: ₹{b.share.toFixed(2)}</span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>

          </div>

          {/* RIGHT COLUMN: The Spreadsheet */}
          <div className="xl:col-span-2 order-1 xl:order-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="font-semibold text-slate-700">Expense Log</h2>
                <button 
                  onClick={addExpenseRow}
                  className="text-sm bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 px-3 py-1.5 rounded shadow-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Row</span><span className="sm:hidden">Add</span>
                </button>
              </div>
              
              {/* Mobile View: Cards */}
              <div className="md:hidden">
                 {expenses.map((expense) => (
                    <div key={expense.id} className="p-4 border-b border-gray-100 relative">
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2 text-slate-500 text-sm">
                              <Calendar className="w-3 h-3" />
                              <input 
                                type="date"
                                className="bg-transparent border-b border-transparent focus:border-blue-400 outline-none p-0 w-24"
                                value={expense.date}
                                onChange={(e) => updateExpense(expense.id, 'date', e.target.value)}
                              />
                           </div>
                           <button 
                              onClick={() => removeExpense(expense.id)}
                              className="text-slate-300 hover:text-red-500 p-1 -mr-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="flex gap-3 mb-3">
                           <div className="flex-1">
                              <input 
                                type="text" 
                                className="w-full text-base font-medium placeholder-slate-300 border-b border-transparent focus:border-blue-400 outline-none py-1"
                                placeholder="What is this for?"
                                value={expense.item}
                                onChange={(e) => updateExpense(expense.id, 'item', e.target.value)}
                              />
                           </div>
                           <div className="w-24 relative">
                              <span className="absolute left-0 top-1.5 text-slate-400 text-sm">₹</span>
                              <input 
                                type="number" 
                                min="0"
                                className="w-full pl-3 text-base font-bold text-slate-800 border-b border-transparent focus:border-blue-400 outline-none py-1"
                                value={expense.amount === 0 ? '' : expense.amount}
                                onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                                placeholder="0"
                              />
                           </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                           <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                              <User className="w-3 h-3 text-slate-400" />
                              <select 
                                className="bg-transparent outline-none text-slate-700 max-w-[80px]"
                                value={expense.paidBy}
                                onChange={(e) => updateExpense(expense.id, 'paidBy', e.target.value)}
                              >
                                {participants.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                           </div>
                           <span className="text-slate-400 text-xs">split with</span>
                           
                           {/* Mobile Split Dropdown */}
                           <div className="relative flex-1 split-dropdown-container">
                              <button
                                onClick={() => setActiveDropdownId(activeDropdownId === expense.id ? null : expense.id)}
                                className="w-full text-left bg-gray-50 border border-gray-200 px-2 py-1 rounded text-slate-700 flex justify-between items-center"
                              >
                                <span className="truncate max-w-[100px]">
                                  {expense.splitAmong.length === participants.length 
                                    ? 'Everyone' 
                                    : expense.splitAmong.length === 0 
                                      ? 'No one' 
                                      : `${expense.splitAmong.length} people`}
                                </span>
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                              </button>
                              
                              {/* Dropdown Menu (Mobile Position) */}
                              {activeDropdownId === expense.id && (
                                <div className="absolute top-9 left-0 z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-200 p-2">
                                  <div className="text-xs font-semibold text-slate-400 px-2 py-1 mb-1">Split cost among:</div>
                                  {participants.map(p => {
                                    const isChecked = expense.splitAmong.includes(p);
                                    return (
                                      <div 
                                        key={p} 
                                        className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer"
                                        onClick={() => toggleSplitParticipant(expense.id, p)}
                                      >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                          {isChecked && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm text-slate-700">{p}</span>
                                      </div>
                                    );
                                  })}
                                  <div className="mt-2 pt-2 border-t border-gray-100 text-center">
                                    <button 
                                      className="text-xs text-blue-600 font-medium hover:underline p-2"
                                      onClick={() => setActiveDropdownId(null)}
                                    >
                                      Done
                                    </button>
                                  </div>
                                </div>
                              )}
                           </div>
                        </div>
                    </div>
                 ))}
                 {expenses.length === 0 && (
                   <div className="p-8 text-center text-slate-400 text-sm">
                     No expenses yet. Tap "Add" to start.
                   </div>
                 )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-visible">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase text-slate-500 tracking-wider">
                      <th className="p-3 font-semibold border-b w-36">Date</th>
                      <th className="p-3 font-semibold border-b">Item</th>
                      <th className="p-3 font-semibold border-b w-28">Amount (₹)</th>
                      <th className="p-3 font-semibold border-b w-28">Paid By</th>
                      <th className="p-3 font-semibold border-b w-40">Split With</th>
                      <th className="p-3 font-semibold border-b w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-blue-50/30 transition-colors group">
                        
                        {/* Date Picker */}
                        <td className="p-2 align-top">
                          <input 
                            type="date"
                            className="w-full p-2 bg-transparent rounded hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-400 outline-none text-sm text-slate-600"
                            value={expense.date}
                            onChange={(e) => updateExpense(expense.id, 'date', e.target.value)}
                          />
                        </td>

                        {/* Item */}
                        <td className="p-2 align-top">
                          <input 
                            type="text" 
                            className="w-full p-2 bg-transparent rounded hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-400 outline-none text-sm"
                            placeholder="Desc..."
                            value={expense.item}
                            onChange={(e) => updateExpense(expense.id, 'item', e.target.value)}
                          />
                        </td>

                        {/* Amount */}
                        <td className="p-2 align-top">
                           <div className="relative">
                            <span className="absolute left-2 top-2 text-slate-400 text-xs">₹</span>
                            <input 
                              type="number" 
                              min="0"
                              className="w-full p-2 pl-5 bg-transparent rounded hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-400 outline-none text-sm font-mono"
                              value={expense.amount === 0 ? '' : expense.amount}
                              onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                              placeholder="0"
                            />
                           </div>
                        </td>

                        {/* Paid By */}
                        <td className="p-2 align-top">
                          <select 
                            className="w-full p-2 bg-transparent rounded hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-400 outline-none text-sm"
                            value={expense.paidBy}
                            onChange={(e) => updateExpense(expense.id, 'paidBy', e.target.value)}
                          >
                            {participants.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>

                        {/* Split With (Custom Multi-Select) */}
                        <td className="p-2 align-top relative split-dropdown-container">
                          <button
                            onClick={() => setActiveDropdownId(activeDropdownId === expense.id ? null : expense.id)}
                            className="w-full p-2 text-left bg-transparent rounded hover:bg-white border border-transparent hover:border-gray-200 focus:ring-1 focus:ring-blue-400 text-sm flex justify-between items-center"
                          >
                            <span className="truncate">
                              {expense.splitAmong.length === participants.length 
                                ? 'Everyone' 
                                : expense.splitAmong.length === 0 
                                  ? 'No one' 
                                  : `${expense.splitAmong.length} people`}
                            </span>
                            <Users className="w-3 h-3 text-slate-400" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeDropdownId === expense.id && (
                            <div className="absolute top-10 left-0 z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-200 p-2">
                              <div className="text-xs font-semibold text-slate-400 px-2 py-1 mb-1">Split cost among:</div>
                              {participants.map(p => {
                                const isChecked = expense.splitAmong.includes(p);
                                return (
                                  <div 
                                    key={p} 
                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                                    onClick={() => toggleSplitParticipant(expense.id, p)}
                                  >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                      {isChecked && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-sm text-slate-700">{p}</span>
                                  </div>
                                );
                              })}
                              <div className="mt-2 pt-2 border-t border-gray-100 text-center">
                                <button 
                                  className="text-xs text-blue-600 font-medium hover:underline"
                                  onClick={() => setActiveDropdownId(null)}
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Delete */}
                        <td className="p-2 text-center align-top">
                          <button 
                            onClick={() => removeExpense(expense.id)}
                            className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-slate-500 text-center">
                Click "Share Bill" to generate a link that contains all this data.
              </div>
            </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-sm py-4 border-t border-gray-200 mt-8">
          Developed by Yash Khandelwal
        </div>

      </div>
    </div>
  );
};

export default ExpenseSplitter;