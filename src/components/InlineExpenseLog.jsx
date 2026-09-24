import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import DatePicker from './DatePicker';
import MethodPicker from './MethodPicker';
import SelectionPopover from './SelectionPopover';
import PaymentBreakdown from './PaymentBreakdown';
import InfoTip from './InfoTip';
import { expenseIssues, isDraftExpense, paymentsFor, payersFor, methodsFor } from '../utils/expenses';
import { EmptyState, PersonTag, money, total, shortDate } from './BillWorkspace';
import { personColor } from '../utils/personColors';

function PersonSummary({ names, people, accent = false, subtle = false, fallback }) {
  if (!names.length) return <span>{fallback}</span>;
  return <span className="person-tags" title={names.join(', ')}>{names.slice(0, 3).map(name => <PersonTag key={name} name={name} people={people} accent={accent} subtle={subtle} />)}{names.length > 3 && <span className="person-tag person-overflow">+{names.length - 3}</span>}</span>;
}

function SplitPicker({ expense, people, personRecords, onChange }) {
  const members = expense.splitAmong;
  const fallback = payersFor(expense).length > 1 ? 'Payers only' : 'Payer only';
  return <SelectionPopover label={`Split with for ${expense.item || 'new expense'}`} title="Split with" multiple selected={members} summary={<PersonSummary names={members} people={personRecords} subtle fallback={fallback} />} options={people.map(name => ({ value: name, label: name, color: personColor(personRecords, name), detail: members.includes(name) ? money(Number(expense.amount) / members.length) : '—' }))} onSelect={name => onChange(members.includes(name) ? members.filter(p => p !== name) : [...members, name])} actions={<button type="button" className="text-button" onClick={() => onChange([...people])}>Everyone</button>}>
    <button type="button" className="selector-extra" onClick={() => onChange([])}>{fallback}</button>
    {!members.length && <InfoTip label="About payer-only expenses">Each payer bears what they paid. This expense creates no debt between people.</InfoTip>}
  </SelectionPopover>;
}

export default function InlineExpenseLog({ trip, expenses, filters, onUpdate, onRemove, onClone, onUndo, onDismissUndo, readOnly, focusId, onFocused }) {
  const root = useRef(null);
  const [paymentId, setPaymentId] = useState(null);
  const paymentExpense = trip.expenses.find(e => e.id === paymentId);
  useEffect(() => { if (!focusId) return; const target = [...root.current.querySelectorAll('[data-description-id]')].find(el => el.dataset.descriptionId === String(focusId) && el.getClientRects().length); if (target) { target.focus(); target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); onFocused(); } }, [focusId, expenses, onFocused]);
  const update = (expense, field, value) => onUpdate(expense.id, field, value);
  const issues = e => expenseIssues(e, trip.participants);
  const draftCount = trip.expenses.filter(e => isDraftExpense(e, trip.participants)).length;
  const description = e => <div className="description-editor"><input data-description-id={e.id} aria-label={`Description for ${e.item || 'new expense'}`} aria-invalid={!!issues(e).item} className="inline-input description-input" maxLength={160} placeholder="Description" value={e.item || ''} onChange={event => update(e, 'item', event.target.value)} />{isDraftExpense(e, trip.participants) && <small className="draft-caption">Draft · {Object.values(issues(e))[0]}</small>}</div>;
  const mobileDescription = e => <div className="description-editor"><textarea data-description-id={e.id} aria-label={`Description for ${e.item || 'new expense'}`} aria-invalid={!!issues(e).item} className="inline-input description-input mobile-description-input" rows={1} maxLength={160} placeholder="Description" value={e.item || ''} onChange={event => update(e, 'item', event.target.value)} />{isDraftExpense(e, trip.participants) && <small className="draft-caption">Draft · {Object.values(issues(e))[0]}</small>}</div>;
  const amount = e => <div className="inline-amount"><span>₹</span><input aria-label={`Amount for ${e.item || 'new expense'}`} aria-invalid={!!issues(e).amount} className="inline-input" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0" value={e.amount === 0 ? '' : e.amount} onChange={event => update(e, 'amount', event.target.value)} /></div>;
  const methods = [...new Set([...trip.paymentMethods, ...trip.expenses.flatMap(methodsFor).filter(Boolean)])];
  const multiButton = (e, method = false) => <button className="inline-split-trigger contribution-trigger" aria-label={`Payment breakdown for ${e.item || 'new expense'}`} onClick={() => setPaymentId(e.id)}>{method ? `${paymentsFor(e).length} payments` : <PersonSummary names={payersFor(e)} people={trip.people} accent fallback="Choose payer" />}</button>;
  const payer = e => paymentsFor(e).length > 1 ? multiButton(e) : readOnly ? <PersonSummary names={payersFor(e)} people={trip.people} accent fallback="Choose payer" /> : <SelectionPopover className="payer-picker" label={`Paid by for ${e.item || 'new expense'}`} title="Paid by" summary={<PersonSummary names={payersFor(e)} people={trip.people} accent fallback="Choose payer" />} options={trip.participants.map(name => ({ value: name, label: name, color: personColor(trip.people, name) }))} selected={payersFor(e)} onSelect={name => update(e, 'paidBy', name)}>{close => <button type="button" className="selector-extra" onClick={() => { close(); setPaymentId(e.id); }}>Add payment contribution</button>}</SelectionPopover>;
  const split = e => readOnly ? <PersonSummary names={e.splitAmong} people={trip.people} subtle fallback={payersFor(e).length > 1 ? 'Payers only' : 'Payer only'} /> : <SplitPicker expense={e} people={trip.participants} personRecords={trip.people} onChange={value => update(e, 'splitAmong', value)} />;
  const method = e => paymentsFor(e).length > 1 ? multiButton(e, true) : readOnly ? paymentsFor(e)[0]?.paymentMethod || '—' : <MethodPicker label={`Method for ${e.item || 'new expense'}`} value={paymentsFor(e)[0]?.paymentMethod} methods={methods} onChange={value => update(e, 'paymentMethod', value)} onContributions={() => setPaymentId(e.id)} />;
  const actions = e => <SelectionPopover className="row-menu" searchable={false} label={`Expense options for ${e.item || 'new expense'}`} title="Expense options" summary={<MoreHorizontal size={17} />} options={[{ value: 'payments', label: 'Payment breakdown' }, { value: 'duplicate', label: 'Duplicate' }, { value: 'remove', label: 'Remove' }]} onSelect={value => value === 'payments' ? setPaymentId(e.id) : value === 'duplicate' ? onClone(e.id) : onRemove(e.id)} />;
  const mobileActions = e => {
    const payments = paymentsFor(e);
    const methodLabel = payments.length > 1 ? `Payment methods · ${payments.length} payments` : `Payment method · ${payments[0]?.paymentMethod || 'None'}`;
    return <SelectionPopover className="row-menu" searchable={false} label={`Expense options for ${e.item || 'new expense'}`} title="Expense options" summary={<MoreHorizontal size={17} />} options={[{ value: 'method', label: methodLabel }, ...(!readOnly ? [{ value: 'duplicate', label: 'Duplicate' }, { value: 'remove', label: 'Remove' }] : [])]} onSelect={value => value === 'method' ? setPaymentId(e.id) : value === 'duplicate' ? onClone(e.id) : onRemove(e.id)} />;
  };
  const date = e => readOnly ? shortDate(e.date) : <div className={issues(e).date ? 'draft-field' : ''}><DatePicker compact stepper value={e.date} onChange={v => update(e, 'date', v)} /></div>;
  const isFiltered = expenses.length !== trip.expenses.length || filters.rules?.length || filters.description;
  return <section ref={root} className="inline-log">
    {!!draftCount && <div className="inline-log-notices"><span className="draft-count">{draftCount} draft{draftCount > 1 ? 's' : ''}<InfoTip label="About expense drafts">Drafts are saved here but excluded from totals, settlements, sharing and export until the required fields and payment amounts are complete.</InfoTip></span></div>}
    {!readOnly && trip.expenseUndo && <div className="expense-undo" role="status"><span>Expense removed</span><button className="text-button" onClick={onUndo}>Undo</button><button className="icon-button" aria-label="Dismiss expense undo" onClick={onDismissUndo}><X size={14} /></button></div>}
    {!expenses.length ? <EmptyState title={trip.expenses.length ? 'No matching expenses' : 'No expenses yet'} /> : <>
      <div className="inline-table-wrap"><table className="inline-table"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Paid by</th><th>Split with</th><th>Method</th>{!readOnly && <th><span className="sr-only">Actions</span></th>}</tr></thead><tbody>{expenses.map(e => <tr key={e.id} data-draft={isDraftExpense(e, trip.participants)} className={isDraftExpense(e, trip.participants) ? 'incomplete-row' : ''}><td>{date(e)}</td><td>{readOnly ? e.item || 'Untitled' : description(e)}</td><td>{readOnly ? money(e.amount) : amount(e)}</td><td>{payer(e)}</td><td>{split(e)}</td><td>{method(e)}</td>{!readOnly && <td>{actions(e)}</td>}</tr>)}</tbody></table></div>
      <div className="inline-mobile-list">{expenses.map(e => <article key={e.id} data-draft={isDraftExpense(e, trip.participants)} className={isDraftExpense(e, trip.participants) ? 'incomplete-row' : ''}><div className="inline-mobile-title">{readOnly ? <strong>{e.item}</strong> : mobileDescription(e)}{readOnly ? money(e.amount) : amount(e)}</div><div className="inline-mobile-date">{date(e)}{mobileActions(e)}</div><div className="inline-mobile-fields"><div><span>Paid by</span>{payer(e)}</div><div><span>Split with</span>{split(e)}</div></div></article>)}</div>
      {!!isFiltered && <div className="log-total"><span>View total</span><strong>{money(total(expenses))}</strong></div>}
    </>}
    {paymentExpense && <PaymentBreakdown expense={paymentExpense} participants={trip.participants} people={trip.people} methods={methods} readOnly={readOnly} onChange={payments => update(paymentExpense, 'payments', payments)} onClose={() => setPaymentId(null)} />}
  </section>;
}
