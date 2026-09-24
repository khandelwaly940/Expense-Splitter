import { useState } from 'react';
import { ArrowRight, ArrowUpRight, CheckCircle2, ChevronDown, ExternalLink, ArrowRightLeft, ListChecks, BarChart3, Receipt, WalletCards } from 'lucide-react';
import { calculateBalances, calculateSmartSettlements, calculateItemizedSettlements } from '../utils/calculations';
import { settlementKey } from '../utils/trips';
import { upiForTransfer } from '../utils/personView';
import { EmptyState, money } from './BillWorkspace';
import Dialog from './Dialog';
import DetailedBreakdown from './DetailedBreakdown';

export default function SettlementView({ trip, readOnly = false, onViewLogs }) {
  const person = trip.people.find(p => p.id === trip.focusPersonId);
  const [tab, setTab] = useState('smart');
  const [showEveryone, setShowEveryone] = useState(false);
  const [method, setMethod] = useState('smart');
  const [personOpen, setPersonOpen] = useState(() => readOnly && !!person);
  const balances = calculateBalances(trip.participants, trip.expenses);
  const settlements = method === 'smart' ? calculateSmartSettlements(balances) : calculateItemizedSettlements(trip.participants, trip.expenses);
  const personBalance = balances.find(b => b.name === person?.name)?.balance || 0;
  const balanceLabel = personBalance < -.01 ? `You owe ${money(-personBalance)}` : personBalance > .01 ? `You’re owed ${money(personBalance)}` : 'No net balance';
  const relevant = tx => tx.from === person?.name || tx.to === person?.name;
  const visible = person && !showEveryone ? settlements.filter(relevant) : settlements;
  const outgoing = settlements.filter(tx => tx.from === person?.name);
  const viewLogs = personal => { setPersonOpen(false); onViewLogs(personal ? person.name : null); };
  return <section className="settlement-section reference-settlements">
    <header className="settlement-section-header"><h2><span className="settlement-mark" aria-hidden="true"><ArrowRightLeft size={19} strokeWidth={2.5} /></span>Who pays whom?</h2><div className="settlement-tabs" role="tablist" aria-label="Settlement views">{[['smart', ListChecks, 'Summary'], ['detailed', BarChart3, 'Detailed']].map(([id, Icon, label]) => <button key={id} role="tab" aria-selected={tab === id} aria-controls="settlement-view-panel" id={`settlement-tab-${id}`} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={16} />{label}</button>)}</div></header>
    {person && <div className="person-payment-summary"><button className="person-summary-trigger" aria-label={`Open ${person.name}’s overview`} onClick={() => setPersonOpen(true)}><strong>{person.name}</strong><span>{balanceLabel}</span></button><button className="text-button" onClick={() => setShowEveryone(!showEveryone)}>{showEveryone ? 'Show my payments' : 'Show everyone'}</button></div>}
    <div id="settlement-view-panel" role="tabpanel" aria-labelledby={`settlement-tab-${tab}`}>{tab === 'detailed' ? <DetailedBreakdown trip={trip} /> : <>
      <div className="settlement-mode-row"><button className="settlement-mode-switch" type="button" role="switch" aria-label="Smart payment plan" aria-description="Off uses itemized payments" aria-checked={method === 'smart'} title={method === 'smart' ? 'Smart is on; switch to itemized' : 'Itemized is on; switch to Smart'} onClick={() => setMethod(current => current === 'smart' ? 'itemized' : 'smart')}>
        <span className="settlement-switch-label">Smart</span><span className="settlement-switch-track" aria-hidden="true"><span className="settlement-switch-thumb" /></span>
      </button></div>
      {!visible.length ? <EmptyState icon={CheckCircle2} title={trip.expenses.length ? person && !showEveryone ? 'No payments for you' : 'Everyone is square' : 'Nothing to settle yet'} /> : <div className="settlement-grid">{visible.map(tx => {
        const upi = upiForTransfer(trip, tx);
        return <article className="settlement-card" key={settlementKey(tx)}>
          <div className="settlement-route"><span className="settlement-payer"><strong>{tx.from}</strong></span><span className="settlement-direction" aria-hidden="true"><ArrowRight size={18} /></span><span className="settlement-recipient"><strong>{tx.to}</strong></span></div>
          <div className="settlement-amount"><strong>{money(tx.amount).replace(/\.00$/, '')}</strong></div>
          {tx.items && <details className="settlement-breakdown"><summary><span><Receipt size={16} />Expenses <small>{tx.items.length}</small></span><ChevronDown size={17} /></summary><div className="settlement-expense-list">{tx.items.map((item, i) => <div key={i}><span>{item.reason}</span><strong>{money(item.amount)}</strong></div>)}</div></details>}
          {method === 'smart' && upi && (!person || tx.from === person.name) && <div className="settlement-upi"><a className="button settlement-upi-button" href={upi}><WalletCards size={16} />Pay via UPI<ArrowUpRight size={16} /></a></div>}
        </article>;
      })}</div>}
    </>}</div>
    {personOpen && person && <Dialog title={person.name} onClose={() => setPersonOpen(false)}><div className="dialog-body person-overview">
      <div className="person-overview-balance"><strong>{balanceLabel}</strong>{trip.partial && <small>For this shared snapshot</small>}</div>
      <div className="person-upi-list">{outgoing.map(tx => { const upi = upiForTransfer(trip, tx); return <div className="person-upi-row" key={settlementKey(tx)}><div><span>To {tx.to}</span><strong>{money(tx.amount)}</strong></div>{upi ? <a className="button primary" href={upi}>Pay via UPI<ExternalLink size={14} /></a> : <span className="muted">UPI unavailable</span>}</div>; })}</div>
      <div className="person-log-actions"><button className="button" onClick={() => viewLogs(true)}><Receipt size={16} />My expense logs</button><button className="button" onClick={() => viewLogs(false)}>Full expense logs<ArrowRight size={16} /></button></div>
    </div></Dialog>}
  </section>;
}
