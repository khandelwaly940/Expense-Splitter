import { useEffect, useRef, useState } from 'react';
import { ArrowDownWideNarrow, Plus, Search, X } from 'lucide-react';

const sortOptions = [
  ['date-desc', 'Newest first'], ['date-asc', 'Oldest first'],
  ['amount-desc', 'Amount: high to low'], ['amount-asc', 'Amount: low to high'],
  ['description-asc', 'Description: A–Z'], ['description-desc', 'Description: Z–A'],
  ['paidBy-asc', 'Paid by: A–Z'], ['paidBy-desc', 'Paid by: Z–A'],
  ['splitWith-asc', 'Split with: A–Z'], ['splitWith-desc', 'Split with: Z–A'],
  ['method-asc', 'Method: A–Z'],
];

export default function ExpenseLogToolbar({ filters, onFilters, onAdd, readOnly }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef(null);
  const expanded = searchOpen || !!filters.description;
  useEffect(() => { if (searchOpen) inputRef.current?.focus(); }, [searchOpen]);
  const closeSearch = () => { onFilters({ ...filters, description: '' }); setSearchOpen(false); };
  return <div className={`expense-toolbar-actions ${expanded ? 'search-open' : ''}`}>
    <div className={`expense-search ${expanded ? 'is-open' : ''}`}>
      {expanded ? <><Search size={17} aria-hidden="true" /><input ref={inputRef} aria-label="Search descriptions" placeholder="Search expenses…" value={filters.description || ''} onChange={e => onFilters({ ...filters, description: e.target.value })} onKeyDown={e => { if (e.key === 'Escape') closeSearch(); }} /><button type="button" aria-label="Close search" onClick={closeSearch}><X size={16} /></button></> : <button type="button" aria-label="Search expenses" aria-expanded="false" onClick={() => setSearchOpen(true)}><Search size={18} /></button>}
    </div>
    <label className="expense-sort"><ArrowDownWideNarrow size={17} aria-hidden="true" /><span>{sortOptions.find(([value]) => value === filters.sort)?.[1] || 'Newest first'}</span><select aria-label="Sort expenses" value={filters.sort} onChange={e => onFilters({ ...filters, sort: e.target.value })}>{sortOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    {!readOnly && <button type="button" className="button primary expense-add" aria-label="Add row" title="Add row" onClick={onAdd}><Plus size={18} /></button>}
  </div>;
}
