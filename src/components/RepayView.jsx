import { useState } from 'react';
import { CreditCard, MoreHorizontal, Copy } from 'lucide-react';
import { copyToClipboard } from '../utils/sharing';
import { repaymentRows, updateRepayment, repaymentNote } from '../utils/repayments';
import { toPaise } from '../utils/expenses';
import { EmptyState, money } from './BillWorkspace';
import InfoTip from './InfoTip';
import Dialog from './Dialog';
import SelectionPopover from './SelectionPopover';

export default function RepayView({ expenses, onUpdate, readOnly = false, onAdd }) {
  const [editing, setEditing] = useState(null), [copied, setCopied] = useState(null), [error, setError] = useState('');
  const rows = repaymentRows(expenses), groups = new Map();
  rows.forEach(row => {
    if (!groups.has(row.payer)) groups.set(row.payer, new Map());
    const methods = groups.get(row.payer);
    if (!methods.has(row.method)) methods.set(row.method, []);
    methods.get(row.method).push(row);
  });
  const update = (row, changes) => onUpdate(updateRepayment(row.expense, row.index, changes));
  const open = (row, mode) => { setError(''); setCopied(null); setEditing({ row, mode, amount: mode === 'custom' ? row.custom ? String(row.repay) : '' : String(row.noteAmount ?? row.own), text: row.noteText || '' }); };
  const copy = async row => { if (toPaise(row.noteAmount ?? row.own) == null) { setError('Enter an amount with up to 2 decimals.'); return; } if (await copyToClipboard(repaymentNote(row))) { setCopied(row.key); setError(''); } else setError('Copy was blocked. Select the note and copy it.'); };
  return <section className="repay-workspace"><div className="section-heading"><h2>Card / account repayments<InfoTip label="About repayments">Repayments go back to a payment method, separate from settling with people. Full contributions are included by default. Excluding your share allocates it across your contributions proportionally; repayment never falls below zero.</InfoTip></h2></div>
    {!rows.length ? <EmptyState icon={CreditCard} title="No payment methods yet" action={!readOnly && <button className="button" onClick={onAdd}>Add an expense</button>} /> : [...groups].map(([payer, methods]) => <section className="repay-payer" key={payer}><h3>{payer}</h3><div className="repay-groups">{[...methods].map(([method, entries]) => <article className="repay-group" key={method}><header><span className="method-icon"><CreditCard size={20} /></span><h3>{method}</h3><strong>{money(entries.reduce((sum, row) => sum + Math.round(row.repay * 100), 0) / 100)}</strong></header>{entries.map(row => <div className="repay-row" key={row.key}><div><strong>{row.expense.item || 'Untitled expense'}</strong><small>{row.custom ? 'Custom amount' : row.includeOwnShare ? 'Full contribution' : 'Own share excluded'} · Paid {money(row.paid)}</small>{row.repay === 0 && !row.custom && !row.includeOwnShare && <small>Own share covers this contribution.</small>}</div><span>{money(row.repay)}</span><SelectionPopover className="row-menu" searchable={false} label={`Repay options for ${row.expense.item} · ${payer} · ${method}`} title="Repayment options" summary={<MoreHorizontal size={18} />} selected={!row.includeOwnShare ? ['exclude'] : []} options={[...(!readOnly ? [{ value: 'exclude', label: 'Exclude my share' }, { value: 'custom', label: 'Custom amount' }] : []), { value: 'log', label: 'Log your expense' }]} onSelect={action => action === 'exclude' ? update(row, { includeOwnShare: !row.includeOwnShare, repayAmountOverride: null }) : open(row, action)} /></div>)}</article>)}</div></section>)}
    {editing && <Dialog title={editing.mode === 'custom' ? 'Custom repayment' : 'Log your expense'} onClose={() => setEditing(null)}><form onSubmit={e => { e.preventDefault(); if (editing.amount !== '' && toPaise(editing.amount) == null) { setError('Enter an amount with up to 2 decimals.'); return; } update(editing.row, editing.mode === 'custom' ? { repayAmountOverride: editing.amount === '' ? null : Number(editing.amount) } : { noteAmount: editing.amount === '' ? null : Number(editing.amount), noteText: editing.text || null }); setEditing(null); }}><div className="dialog-body form-stack"><div className="repay-context">{editing.row.expense.item} · {editing.row.payer} · {editing.row.method}</div>
      <label className="field">{editing.mode === 'custom' ? 'Repayment amount (₹)' : 'Personal expense (₹)'}<input data-autofocus readOnly={readOnly} type="number" min="0" step="0.01" value={editing.amount} placeholder={editing.row.computed.toFixed(2)} onChange={e => setEditing({ ...editing, amount: e.target.value })} /></label>
      {editing.mode === 'custom' ? <button type="button" className="text-button" onClick={() => setEditing({ ...editing, amount: '' })}>Use calculated amount · {money(editing.row.computed)}</button> : <><label className="field">Note<textarea aria-label="Note" readOnly={readOnly} rows={3} maxLength={1000} value={editing.text} placeholder={repaymentNote({ ...editing.row, noteAmount: editing.amount === '' ? null : Number(editing.amount), noteText: null })} onChange={e => setEditing({ ...editing, text: e.target.value })} /></label><div className="note-preview">{repaymentNote({ ...editing.row, noteAmount: editing.amount === '' ? null : Number(editing.amount), noteText: editing.text })}</div><button type="button" className="button" onClick={() => copy({ ...editing.row, noteAmount: editing.amount === '' ? null : Number(editing.amount), noteText: editing.text })}><Copy size={14} />{copied === editing.row.key ? 'Copied' : 'Copy note'}</button></>}
      {error && <p role="alert" className="error-message">{error}</p>}</div><footer className="dialog-footer"><button type="button" className="button" onClick={() => setEditing(null)}>{readOnly ? 'Done' : 'Cancel'}</button>{!readOnly && <button className="button primary">Save</button>}</footer></form></Dialog>}
  </section>;
}
