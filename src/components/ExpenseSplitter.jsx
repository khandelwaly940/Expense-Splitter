import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, CreditCard, Download, FolderOpen, History, Inbox, Link, Menu, PanelLeftOpen, Plus, Receipt, MoreHorizontal, MoreVertical, Pencil, Share2, Trash2, X } from 'lucide-react';
import { NewTripDialog, PeopleDialog, EmptyState, Avatar, money, total } from './BillWorkspace';
import Dialog from './Dialog';
import InfoTip from './InfoTip';
import { updateExpenseField, removeExpense, undoExpenseRemoval, readyExpenses } from '../utils/expenses';
import { groupSharedBills, sharedGroupId, receiveSnapshot, resolveLocation, removeLocalTrip, replaceLocalTrip, removeSharedGroup, restoreRecovery, recoveryLabel } from '../utils/workspace';
import WorkspaceSidebar from './WorkspaceSidebar';
import InlineExpenseLog from './InlineExpenseLog';
import ExpenseLogToolbar from './ExpenseLogToolbar';
import { expensesForPerson } from '../utils/personView';
import FilterViews from './FilterViews';
import SettlementView from './SettlementView';
import RepayView from './RepayView';
import ShareFlow from './ShareFlow';
import CompareDialog from './CompareDialog';
import { emptyFilters, filterExpenses } from '../utils/filters';
import { loadFromURL, parseShareURL } from '../utils/sharing';
import { exportToCSV } from '../utils/csv';
import { assignPersonColors, buildSnapshot, createTrip, legacyShareId, loadWorkspace, newId, saveWorkspace, tripFromShare, renameTripPeople } from '../utils/trips';


function readSnapshot(payload) {
  const trip = tripFromShare(payload);
  if (!trip) return null;
  const snapshotId = payload.snapshotId || legacyShareId(payload);
  const source = payload.v === 2 || payload.v === 3 ? payload.trip : payload;
  const hasTripIdentity = !!(source?.lineageId || source?.id);
  const identifiedTrip = hasTripIdentity ? trip : { ...trip, id: snapshotId, lineageId: snapshotId };
  return { ...buildSnapshot(identifiedTrip, identifiedTrip.expenses, { repay: true, upi: true }), ...payload, trip: identifiedTrip, snapshotId };
}

export default function ExpenseSplitter() {
  const [boot] = useState(() => {
    let saved = loadWorkspace();
    const snapshot = readSnapshot(loadFromURL());
    const hasLink = ['d', 'data'].some(key => new URLSearchParams(window.location.search).has(key));
    if (snapshot) saved = { ...receiveSnapshot(saved, snapshot), location: { screen: 'trip', snapshotId: snapshot.snapshotId, tab: 'expenses' } };
    return { workspace: { ...saved, location: resolveLocation(saved) }, invalidLink: hasLink && !snapshot };
  });
  const [workspace, setWorkspaceState] = useState(boot.workspace);
  const workspaceRef = useRef(workspace);
  const setWorkspace = useCallback(updater => {
    const next = typeof updater === 'function' ? updater(workspaceRef.current) : updater;
    workspaceRef.current = next;
    setWorkspaceState(next);
  }, []);
  const location = resolveLocation(workspace);
  const screen = location.screen, tab = location.tab || 'expenses';
  const savedIncoming = workspace.inbox.find(s => s.snapshotId === location.snapshotId);
  const incoming = useMemo(() => savedIncoming ? readSnapshot(savedIncoming) : null, [savedIncoming]);
  const sharedGroups = groupSharedBills(workspace.inbox);
  const currentGroup = incoming ? sharedGroups.find(g => g.id === sharedGroupId(incoming)) : null;
  const existingCopies = incoming ? workspace.trips.filter(t => t.lineageId === incoming.trip.lineageId) : [];
  const [filters, setFilters] = useState(emptyFilters);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modal, setModal] = useState(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef(null);
  const optionsButtonRef = useRef(null);
  const [focusId, setFocusId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [shareView, setShareView] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('expense-theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } });
  const [sidebarPrefs, setSidebarPrefs] = useState(() => {
    const defaults = { version: 3, collapsed: true, home: true, inbox: true };
    try {
      const saved = JSON.parse(localStorage.getItem('expense-sidebar-preferences'));
      return saved?.version === 3 ? { ...defaults, ...saved } : { ...defaults, home: saved?.home ?? true, inbox: saved?.inbox ?? true };
    } catch { return defaults; }
  });
  const [inviteFor, setInviteFor] = useState(null);
  const [paste, setPaste] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [saveError, setSaveError] = useState(workspace.storageError ? 'Your stored data could not be read. Saving is paused so it won’t be overwritten. Please keep this browser’s data and ask for recovery help.' : '');
  const [toast, setToast] = useState('');
  const [sharedMenu, setSharedMenu] = useState(null);
  const sharedMenuCount = sharedMenu ? sharedGroups.find(g => g.id === sharedGroupId(sharedMenu))?.versions.length || 1 : 0;
  const [invalidLink, setInvalidLink] = useState(boot.invalidLink);
  const [readyToLog, setReadyToLog] = useState(false);
  const activeTrip = workspace.trips.find(t => t.id === (location.tripId || workspace.activeTripId)) || workspace.trips[0];
  const trip = incoming?.trip || activeTrip;
  const viewKey = incoming ? `shared:${incoming.snapshotId}` : activeTrip?.id;
  const views = workspace.views?.[viewKey] || [];
  const activeView = views.find(view => view.id === viewId);
  const currentFilters = useMemo(() => activeView ? { ...activeView.filters, description: filters.description, sort: filters.sort } : filters, [activeView, filters]);
  const [personalLogs, setPersonalLogs] = useState(null);
  const personalName = personalLogs && personalLogs.key === viewKey ? personalLogs.name : null;
  const visibleExpenses = useMemo(() => filterExpenses(personalName ? expensesForPerson(trip?.expenses || [], personalName) : trip?.expenses || [], currentFilters, trip?.participants || []), [trip, currentFilters, personalName]);
  useEffect(() => { try { localStorage.setItem('expense-sidebar-preferences', JSON.stringify(sidebarPrefs)); } catch { /* Preference storage failure must not alter bills. */ } }, [sidebarPrefs]);
  useEffect(() => { document.documentElement.dataset.theme = theme; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111421' : '#fafbfe'); try { localStorage.setItem('expense-theme', theme); } catch { /* The theme still works for this session. */ } }, [theme]);
  const readOnly = !!incoming;

  useEffect(() => {
    try { saveWorkspace(workspace); setSaveError(''); }
    catch (error) { setSaveError(error.message || 'This browser could not save your changes. Keep this tab open and export a backup.'); }
  }, [workspace]);

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { const close = e => { if (e.key === 'Escape') setMobileMenu(false); }; document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close); }, []);
  useEffect(() => {
    if (!optionsOpen) return;
    const outside = e => { if (!optionsRef.current?.contains(e.target)) setOptionsOpen(false); };
    const escape = e => { if (e.key === 'Escape') { setOptionsOpen(false); optionsButtonRef.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [optionsOpen]);

  const updateTrip = updater => setWorkspace(prev => ({ ...prev, trips: prev.trips.map(t => t.id === (prev.activeTripId || prev.trips[0]?.id) ? updater(t) : t) }));
  const go = useCallback((requested, transform = value => value, replace = false, preserveContext = false) => {
    setOptionsOpen(false);
    const next = transform(workspaceRef.current);
    const destination = resolveLocation(next, requested);
    const same = JSON.stringify(destination) === JSON.stringify(workspaceRef.current.location);
    window.history[replace || same ? 'replaceState' : 'pushState']({ expenseLocation: destination }, '', window.location.pathname);
    setWorkspace({ ...next, location: destination, activeTripId: destination.tripId || next.activeTripId });
    setInvalidLink(false);
    if (!preserveContext) { setPersonalLogs(null); setViewId(null); setFilters(emptyFilters); setMobileMenu(false); setModal(null); setSharedMenu(null); setFocusId(null); }
  }, [setWorkspace]);
  useEffect(() => {
    window.history.replaceState({ expenseLocation: workspaceRef.current.location }, '', window.location.href);
    const back = event => go(event.state?.expenseLocation || { screen: 'home' }, value => value, true);
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, [go]);
  useEffect(() => {
    if (!readyToLog) return;
    const frame = requestAnimationFrame(() => {
      const button = document.querySelector('.inline-log .section-heading button');
      button?.focus(); button?.scrollIntoView({ block: 'nearest' }); setReadyToLog(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [readyToLog]);
  const navigate = next => go({ screen: next, tripId: workspaceRef.current.activeTripId });
  const setTab = next => { if (next !== tab) go({ ...location, tab: next }, value => value, false, true); };
  const selectTrip = id => go({ screen: 'trip', tripId: id, tab: 'expenses' });
  const openSnapshot = snapshot => {
    const parsed = readSnapshot(snapshot);
    if (!parsed) { setToast('This snapshot is invalid and could not be opened.'); return; }
    go({ screen: 'trip', snapshotId: parsed.snapshotId, tab: 'expenses' }, prev => receiveSnapshot(prev, parsed));
  };
  const share = (person, view = false) => { setShareView(view || !!activeView); setInviteFor(person || null); setModal('share'); };
  const addExpense = () => {
    setPersonalLogs(null);
    if (!activeTrip.participants.length) { setModal('people'); setToast('Add people before adding an expense.'); return; }
    const now = new Date(), id = newId();
    const expense = { id, entryVersion: 2, date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, item: '', amount: 0, paidBy: activeTrip.participants[0], splitAmong: [...activeTrip.participants], paymentMethod: null, includeOwnShare: true, repayAmountOverride: null, noteAmount: null, noteText: null };
    updateTrip(t => ({ ...t, expenses: [...t.expenses, expense] }));
    if (viewId || filters.description) setToast('New row added to All expenses.');
    setViewId(null); setFilters(emptyFilters); setTab('expenses'); setFocusId(id);
  };
  const updateExpense = (id, field, value) => updateTrip(t => ({ ...t, expenses: t.expenses.map(e => e.id === id ? updateExpenseField(e, field, value) : e) }));
  const saveView = view => { setWorkspace(prev => ({ ...prev, views: { ...prev.views, [viewKey]: views.some(v => v.id === view.id) ? views.map(v => v.id === view.id ? view : v) : [...views, view] } })); setViewId(view.id); setFilters(emptyFilters); };
  const removeView = id => { setWorkspace(prev => ({ ...prev, views: { ...prev.views, [viewKey]: views.filter(v => v.id !== id) } })); if (viewId === id) { setViewId(null); setFilters(emptyFilters); } };
  const selectView = id => { setPersonalLogs(null); setViewId(id); setFilters(emptyFilters); };
  const saveExpense = expense => { updateTrip(t => ({ ...t, expenses: t.expenses.map(e => e.id === expense.id ? expense : e) })); setToast('Repayment options saved.'); };
  const createNew = (name, participants) => {
    const created = { ...createTrip(name), participants, people: assignPersonColors(participants.map(person => ({ id: newId(), name: person, upiId: '' }))) };
    go({ screen: 'trip', tripId: created.id }, prev => ({ ...prev, trips: [...prev.trips, created] }));
    setReadyToLog(true);
  };
  const saveIncoming = (separate = false) => {
    if (!separate && existingCopies.length) { setModal('existing-copy'); return; }
    const copy = { ...incoming.trip, id: newId(), sourceSnapshotId: incoming.snapshotId, createdAt: new Date().toISOString() };
    go({ screen: 'trip', tripId: copy.id }, prev => ({ ...prev, trips: [...prev.trips, copy] }));
    setToast('Editable copy saved.');
  };
  const replaceIncoming = id => { go({ screen: 'trip', tripId: id }, prev => replaceLocalTrip(prev, id, incoming.trip)); setToast('Local bill replaced.'); };
  const deleteTrip = () => { go({ screen: 'home' }, prev => removeLocalTrip(prev, activeTrip.id), true); setToast('Trip removed from this device.'); };
  const recover = () => {
    const restored = restoreRecovery(workspaceRef.current);
    go(restored.location, () => restored);
    setToast('Restored.');
  };
  const openPasted = e => { e.preventDefault(); const payload = parseShareURL(paste.trim()); if (payload && tripFromShare(payload)) { openSnapshot(payload); setModal(null); setPaste(''); setPasteError(''); return; } let isShort = false; try { isShort = ['openshortlink.khandelwaly940.workers.dev', 'api.yashkhandelwal.me'].includes(new URL(paste).hostname); } catch { /* Show a readable validation message below. */ } setPasteError(isShort ? 'Open the short link in a separate tab, then copy its final full URL here. This keeps your local workspace in this browser address.' : 'This isn’t a valid bill snapshot. Paste the complete link copied from Share.'); };
  const viewingBill = screen === 'trip' && trip;
  const removeShared = entry => {
    go({ screen: 'inbox' }, prev => removeSharedGroup(prev, sharedGroupId(entry)), true);
    setToast('Shared trip removed from this device.');
  };
  const sidebar = (mobile = false) => <WorkspaceSidebar workspace={workspace} groups={sharedGroups} collapsed={!mobile && sidebarPrefs.collapsed} onCollapse={() => setSidebarPrefs(prev => ({ ...prev, collapsed: !prev.collapsed }))} sections={sidebarPrefs} onSections={setSidebarPrefs} theme={theme} onThemeToggle={() => setTheme(current => current === 'dark' ? 'light' : 'dark')} screen={screen} incoming={incoming} activeTrip={activeTrip} onNavigate={navigate} onSelect={selectTrip} onSnapshot={openSnapshot} onNew={() => { setMobileMenu(false); setModal('new'); }} onPaste={() => { setMobileMenu(false); setPasteError(''); setModal('paste'); }} onRestore={() => { setMobileMenu(false); setModal('restore'); }} />;

  return <div className={`app-shell ${sidebarPrefs.collapsed ? 'sidebar-is-collapsed' : ''}`}><aside className="desktop-sidebar">{sidebar()}</aside>{sidebarPrefs.collapsed && <button type="button" className="icon-button sidebar-restore" aria-label="Open sidebar" title="Open sidebar" onClick={() => setSidebarPrefs(prev => ({ ...prev, collapsed: false }))}><PanelLeftOpen size={20} /></button>}<header className="mobile-header"><span className="brand-mini"><Receipt size={20} />Split.</span><button className="icon-button" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={22} /></button></header>{mobileMenu && <Dialog drawer title="Trips" onClose={() => setMobileMenu(false)}><div className="mobile-sidebar">{sidebar(true)}</div></Dialog>}
    <main className="workspace-main">{saveError && <div className="error-message storage-error" role="alert">{saveError}</div>}{invalidLink && <div className="error-message storage-error" role="alert">This shared link is incomplete or invalid. Your local trips have not been changed. Ask the sender for a new snapshot link.</div>}
      {viewingBill ? <>
        {incoming && <div className="shared-banner"><div className="shared-context"><span className="status-chip">Read-only</span><InfoTip label="About shared bills">A saved snapshot, not a live bill. Make a copy to edit expenses, then share an updated link.</InfoTip>{currentGroup?.versions.length > 1 && <><select aria-label="Shared version" value={incoming.snapshotId} onChange={e => openSnapshot(currentGroup.versions.find(v => v.snapshotId === e.target.value))}>{currentGroup.versions.map((version, index) => <option key={version.snapshotId} value={version.snapshotId}>{index === 0 ? 'Latest received' : `Version ${currentGroup.versions.length - index}`}{version.partial ? ' · Partial' : ''}{(version.receivedAt || version.createdAt) ? ` · ${new Date(version.receivedAt || version.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</option>)}</select><InfoTip label="About shared versions">Versions stay separate. Latest received means most recently added here, not necessarily most recently created. Switching versions never updates your editable trip.</InfoTip></>}</div><div className="shared-actions">{!!workspace.trips.length && <button className="button" onClick={() => setModal('compare')}>Compare update</button>}<button className="button" onClick={() => saveIncoming()}>Make editable copy<ArrowUpRight size={15} /></button></div></div>}
        <header className={`bill-header summary-bar ${readOnly ? 'is-readonly' : ''}`}>
          <div className="bill-title"><TripTitle key={`${trip.id}-${incoming?.snapshotId || 'local'}`} name={trip.name} readOnly={readOnly} onSave={name => updateTrip(t => ({ ...t, name }))} />{trip.sourceSnapshotId && !readOnly && <span className="status-chip">Editable copy</span>}{trip.partial && <span className="status-chip warning">Partial bill</span>}</div>
          <div className="bill-total"><span className="summary-label">Total spent</span><strong>{money(total(trip.expenses)).replace(/\.00$/, '')}</strong></div>
          <button className="summary-people" disabled={readOnly} aria-label="Edit people involved" title={readOnly ? 'Save an editable copy to manage people' : 'Manage people and UPI IDs'} onClick={() => setModal('people')}><span className="summary-label">People</span><span className="summary-people-value"><span className="avatar-stack">{trip.people.slice(0, 4).map(p => <Avatar key={p.id} name={p.name} color={p.color} small />)}</span><strong>{trip.participants.length}</strong><ChevronRight size={14} /></span></button>
          {!readOnly && <button className="icon-button summary-share" aria-label="Share bill" title="Share bill" onClick={() => share()}><Share2 size={19} /></button>}
          <div className="summary-more-anchor" ref={optionsRef}>
            <button ref={optionsButtonRef} className="icon-button summary-more" aria-label={readOnly ? 'Shared bill options' : 'Trip options'} aria-haspopup={readOnly ? undefined : 'dialog'} aria-expanded={readOnly ? undefined : optionsOpen} onClick={() => readOnly ? setSharedMenu(incoming) : setOptionsOpen(open => !open)}><MoreVertical size={20} /></button>
            {optionsOpen && !readOnly && <div className="trip-options-popover" role="dialog" aria-label="Trip options">
              <div className="trip-options-heading"><strong>Trip options</strong><span>For this bill</span></div>
              <div className="trip-options-list">
                <button onClick={() => { setOptionsOpen(false); setPasteError(''); setModal('paste'); }}><span className="trip-options-icon"><History size={17} /></span><span><strong>Review an updated bill</strong><small>Open a newer shared link</small></span><ChevronRight size={15} /></button>
                <button onClick={() => { setOptionsOpen(false); exportToCSV(visibleExpenses, `${activeTrip.name || 'trip'}.csv`); setToast(`Exported ${readyExpenses(visibleExpenses).length} expenses.`); }}><span className="trip-options-icon"><Download size={17} /></span><span><strong>Export current view</strong><small>Download CSV</small></span><ChevronRight size={15} /></button>
                <button role="switch" aria-checked={activeTrip.showRepay === true} aria-label="Show card / account repayments" onClick={() => { updateTrip(t => ({ ...t, showRepay: t.showRepay !== true })); if (tab === 'repay') setTab('expenses'); }}><span className="trip-options-icon"><CreditCard size={17} /></span><span><strong>Card / account repayments</strong><small>Show this section in the bill</small></span><span className="trip-options-switch" aria-hidden="true"><span /></span></button>
              </div>
              <div className="trip-options-danger"><button onClick={() => { setOptionsOpen(false); setModal('delete'); }}><Trash2 size={16} />Remove trip from this device</button></div>
            </div>}
          </div>
        </header>
        <nav className="bill-tabs" aria-label="Bill sections">{[['expenses', Receipt, 'Bill'], ...(trip.showRepay === true ? [['repay', CreditCard, 'Card / account repayments']] : [])].map(([id, Icon, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={17} />{label}</button>)}{readOnly && <button className="back-shared" onClick={() => navigate('inbox')}><ArrowLeft size={15} /><span>All shared bills</span></button>}</nav>
        <div className="bill-content" key={`${trip.id}-${incoming?.snapshotId || 'local'}`}>{tab === 'expenses' && <>{(readOnly || trip.expenses.length > 0) && <div className="bill-overview unified-overview"><SettlementView trip={trip} readOnly={readOnly} onViewLogs={name => { setViewId(null); setFilters(emptyFilters); setPersonalLogs(name ? { key: viewKey, name } : null); requestAnimationFrame(() => { const log = document.querySelector('.inline-log'); log?.scrollIntoView({ block: 'start', behavior: 'smooth' }); log?.querySelector('input')?.focus({ preventScroll: true }); }); }} /></div>}{!personalName && <FilterViews trip={trip} views={views} activeId={viewId} onSelect={selectView} onSave={saveView} onRemove={removeView} onShare={() => share(null, true)} toolbarActions={<ExpenseLogToolbar filters={currentFilters} onFilters={setFilters} onAdd={addExpense} readOnly={readOnly} />} />}{personalName && <div className="expense-toolbar personal-expense-toolbar"><div className="personal-log-scope"><strong>My expense logs · {personalName}</strong><button className="text-button" onClick={() => { setPersonalLogs(null); setViewId(null); setFilters(emptyFilters); }}>Full expense logs</button></div><ExpenseLogToolbar filters={currentFilters} onFilters={setFilters} onAdd={addExpense} readOnly={readOnly} /></div>}<InlineExpenseLog trip={trip} expenses={visibleExpenses} filters={currentFilters} onUpdate={updateExpense} focusId={focusId} onFocused={() => setFocusId(null)} readOnly={readOnly} onRemove={id => updateTrip(t => removeExpense(t, id))} onUndo={() => { updateTrip(undoExpenseRemoval); setViewId(null); setFilters(emptyFilters); }} onDismissUndo={() => updateTrip(t => ({ ...t, expenseUndo: null }))} onClone={id => { const source = trip.expenses.find(e => e.id === id); const newExpenseId = newId(); updateTrip(t => ({ ...t, expenses: [...t.expenses, { ...structuredClone(source), id: newExpenseId }] })); setFocusId(newExpenseId); }} /></>}{tab === 'repay' && <RepayView expenses={trip.expenses} readOnly={readOnly} onAdd={addExpense} onUpdate={saveExpense} />}</div>
      </> : screen === 'inbox' ? <><div className="page-heading"><div><h1>Shared with me</h1></div>{sharedGroups.length > 0 && <button className="button primary" onClick={() => { setPasteError(''); setModal('paste'); }}><Link size={16} />Open a bill link</button>}</div>{sharedGroups.length ? <div className="trip-grid">{sharedGroups.map(({ latest: entry, versions }) => <article className="shared-trip-card" key={entry.snapshotId}><button className="trip-card" onClick={() => openSnapshot(entry)}><span className="trip-card-icon"><Inbox size={22} /></span><span className="status-chip">Read-only{entry.partial ? ' · Partial' : ''}</span><h2>{entry.trip?.name || 'Untitled bill'}</h2><p>{entry.trip?.expenses?.length || 0} expenses · {entry.trip?.participants?.length || 0} people</p><footer><strong>{money(total(entry.trip?.expenses || []))}</strong><ArrowUpRight size={18} /></footer><small>{versions.length} version{versions.length !== 1 ? 's' : ''}</small></button><button className="icon-button shared-card-more" aria-label={`Options for ${entry.trip?.name || 'shared bill'}`} onClick={() => setSharedMenu(entry)}><MoreHorizontal size={18} /></button></article>)}</div> : <EmptyState icon={Inbox} title="No shared bills" action={<button className="button" onClick={() => setModal('paste')}><Link size={16} />Open a bill link</button>} />}</> : <><div className="page-heading"><div><h1>My trips</h1></div>{workspace.trips.length > 0 && <button className="button primary" onClick={() => setModal('new')}><Plus size={17} />Create a trip</button>}</div>{workspace.trips.length ? <><div className="trip-grid">{workspace.trips.map(t => <button className="trip-card" key={t.id} onClick={() => selectTrip(t.id)}><span className="trip-card-icon"><FolderOpen size={22} /></span>{t.sourceSnapshotId && <span className="status-chip">Editable copy</span>}{t.partial && <span className="status-chip warning">Partial bill</span>}<h2>{t.name || 'Untitled trip'}</h2><p>{t.expenses.length} expenses · {t.participants.length} people</p><footer><strong>{money(total(t.expenses))}</strong><ArrowUpRight size={18} /></footer><div className="avatar-stack">{t.people.slice(0, 5).map(p => <Avatar key={p.id} name={p.name} color={p.color} small />)}</div></button>)}</div></> : <EmptyState icon={FolderOpen} title="No trips yet" action={<><button className="button primary" onClick={() => setModal('new')}><Plus size={17} />Create trip</button><button className="button" onClick={() => { setPasteError(''); setModal('paste'); }}><Link size={16} />Open shared link</button></>} />}</>}
      <footer className="workspace-footer"><span>Local-first · By Yash Khandelwal</span></footer>
    </main>
    {modal === 'new' && <NewTripDialog onCreate={createNew} onClose={() => setModal(null)} />}
    {modal === 'people' && <PeopleDialog trip={activeTrip} onSave={people => {
      const rename = new Map(activeTrip.people.map(p => [p.name, people.find(next => next.id === p.id)?.name || p.name]));
      setWorkspace(prev => ({ ...prev, trips: prev.trips.map(t => t.id === activeTrip.id ? renameTripPeople(t, people) : t), views: { ...prev.views, [activeTrip.id]: (prev.views?.[activeTrip.id] || []).map(view => ({ ...view, filters: { ...view.filters, paidBy: rename.get(view.filters.paidBy) || view.filters.paidBy, splitWith: rename.get(view.filters.splitWith) || view.filters.splitWith, rules: (view.filters.rules || []).map(rule => ['paidBy', 'splitWith'].includes(rule.field) ? { ...rule, values: (rule.values || []).map(name => rename.get(name) || name) } : rule) } })) } }));
    }} onInvite={share} onClose={() => setModal(null)} />}
    {modal === 'share' && <ShareFlow trip={trip} filteredExpenses={visibleExpenses} initialFiltered={shareView} viewName={shareView ? activeView?.name : null} inviteFor={inviteFor} onClose={() => setModal(null)} />}
    {modal === 'compare' && incoming && <CompareDialog incoming={incoming.trip} trips={workspace.trips} initialId={workspace.trips.find(t => t.lineageId === incoming.trip.lineageId)?.id} onReplace={replaceIncoming} onSaveCopy={() => saveIncoming(true)} onClose={() => setModal(null)} />}
    {modal === 'paste' && <Dialog title="Open a bill link" onClose={() => setModal(null)}><form onSubmit={openPasted}><div className="dialog-body form-stack"><label className="field">Snapshot link<textarea data-autofocus required rows={4} value={paste} onChange={e => setPaste(e.target.value)} placeholder="Paste the complete shared bill URL…" /></label><InfoTip label="Opening a short link">Open a short link in another tab, then paste its final full URL here. Your local trips stay untouched.</InfoTip>{pasteError && <p className="error-message" role="alert">{pasteError}</p>}</div><footer className="dialog-footer"><button type="button" className="button" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="button primary">Preview bill<ArrowUpRight size={15} /></button></footer></form></Dialog>}
    {modal === 'delete' && <Dialog title="Remove this trip?" subtitle={activeTrip.name || 'Untitled trip'} onClose={() => setModal(null)}><div className="dialog-body"><p className="helper">Remove this trip from this device? Shared links remain available.</p>{workspace.recovery && <p className="warning-banner">This replaces your previous undo point.</p>}<InfoTip label="About removal recovery">You can undo this after refresh. The next removal or replacement replaces this recovery point.</InfoTip></div><footer className="dialog-footer"><button className="button" onClick={() => setModal(null)}>Keep trip</button><button className="button destructive" onClick={deleteTrip}>Remove trip</button></footer></Dialog>}
    {modal === 'restore' && workspace.recovery && <Dialog title={recoveryLabel(workspace.recovery)} subtitle={workspace.recovery.name || workspace.recovery.trip?.name} onClose={() => setModal(null)}><div className="dialog-body"><p>{workspace.recovery.kind === 'shared-removal' ? `Restore ${workspace.recovery.entries.length} saved version${workspace.recovery.entries.length !== 1 ? 's' : ''} and their views?` : workspace.recovery.kind === 'trip-removal' ? 'Restore this trip and its saved views?' : 'Restore the previous bill? Changes made since the replacement will be overwritten.'}</p><InfoTip label="Recovery limit">One recovery slot is saved on this device, including after refresh. The next removal or replacement replaces it.</InfoTip></div><footer className="dialog-footer"><button className="button" onClick={() => setModal(null)}>Cancel</button><button className="button primary" onClick={recover}>Restore</button></footer></Dialog>}
    {modal === 'existing-copy' && <Dialog title="Already in My trips" onClose={() => setModal(null)}><div className="dialog-body existing-copy-list">{existingCopies.map(copy => <button className="button" key={copy.id} onClick={() => selectTrip(copy.id)}>Open {copy.name || 'Untitled trip'}<ArrowUpRight size={15} /></button>)}</div><footer className="dialog-footer"><button className="button" onClick={() => setModal(null)}>Cancel</button><button className="button" onClick={() => setModal('compare')}>Compare update</button></footer></Dialog>}
    {sharedMenu && <Dialog title="Remove shared trip?" subtitle={sharedMenu.trip?.name} onClose={() => setSharedMenu(null)}><div className="dialog-body"><p>Remove {sharedMenuCount === 1 ? 'this saved version' : `all ${sharedMenuCount} saved versions`} from this device? Your editable copies and shared links stay unchanged.</p>{workspace.recovery && <p className="warning-banner">This replaces your previous undo point.</p>}<InfoTip label="About removal recovery">You can undo this after refresh. The next removal or replacement replaces this recovery point.</InfoTip></div><footer className="dialog-footer"><button className="button" onClick={() => setSharedMenu(null)}>Cancel</button><button className="button destructive" onClick={() => removeShared(sharedMenu)}>Remove from this device</button></footer></Dialog>}
    {toast && <div className="toast" role="status"><Check size={16} /><span>{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>;
}

function TripTitle({ name, readOnly, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const save = e => { e.preventDefault(); if (draft.trim()) { onSave(draft.trim()); setEditing(false); } };
  if (readOnly) return <h1>{name || 'Untitled trip'}</h1>;
  return editing ? <form className="title-editor" onSubmit={save}><input autoFocus aria-label="Trip name" required maxLength={100} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }} /><button className="icon-button" aria-label="Save trip name"><Check size={18} /></button><button type="button" className="icon-button" aria-label="Cancel rename" onClick={() => setEditing(false)}><X size={18} /></button></form> : <h1><button className="editable-trip-title" title="Click to rename" aria-label="Rename trip" onClick={() => { setDraft(name); setEditing(true); }}>{name || 'Untitled trip'}<Pencil size={15} aria-hidden="true" /></button></h1>;
}
