import { calculateBalances } from '../utils/calculations';
import { money } from './BillWorkspace';

export default function DetailedBreakdown({ trip }) {
  const balances = calculateBalances(trip.participants, trip.expenses);
  const max = Math.max(1, ...balances.flatMap(b => [b.paid, b.share]));
  return <section className="reference-breakdown"><h3>Detailed breakdown</h3>
    {balances.map(person => <div className="reference-person" key={person.name}>
      <div className="reference-person-heading"><strong>{person.name}</strong><span className={person.balance > .01 ? 'credit-balance' : person.balance < -.01 ? 'debit-balance' : 'muted'}>{person.balance > 0 ? '+' : ''}₹{person.balance.toFixed(2)}</span></div>
      <div className="reference-bars"><div><span>Paid</span><i><b style={{ width: `${person.paid / max * 100}%` }} /></i><strong>{money(person.paid).replace(/\.00$/, '')}</strong></div><div><span>Share</span><i className="share-bar"><b style={{ width: `${person.share / max * 100}%` }} /></i><strong>{money(person.share).replace(/\.00$/, '')}</strong></div></div>
      <details className="reference-person-expenses"><summary>Expense details</summary><div className="breakdown-columns"><span>Expense</span><span>Paid</span><span>Share</span></div>{trip.expenses.map(e => ({ expense: e, balance: calculateBalances(trip.participants, [e]).find(b => b.name === person.name) })).filter(({ balance }) => balance.paid || balance.share).map(({ expense, balance }) => <div className="breakdown-columns" key={expense.id}><span>{expense.item || 'Untitled'}</span><span>{money(balance.paid)}</span><span>{money(balance.share)}</span></div>)}</details>
    </div>)}
    {!balances.length && <p className="helper">Add people to see their breakdown.</p>}
  </section>;
}
