import { useState } from 'react';
import SelectionPopover from './SelectionPopover';

export default function MethodPicker({ value, methods, label, onChange, onContributions }) {
  const [draft, setDraft] = useState('');
  return <SelectionPopover className="method-picker" label={label} title="Payment method" summary={<span>{value || 'No method'}</span>} options={[{ value: '', label: 'No method' }, ...methods.map(m => ({ value: m, label: m }))]} selected={[value || '']} onSelect={v => onChange(v || null)}>{close => <><div className="selector-add"><label className="field">Add new method<input aria-label="New payment method" maxLength={60} value={draft} placeholder="e.g. HDFC card" onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (draft.trim()) { onChange(methods.find(m => m.toLowerCase() === draft.trim().toLowerCase()) || draft.trim()); setDraft(''); close(); } } }} /></label><button type="button" className="button" disabled={!draft.trim()} onClick={() => { onChange(methods.find(m => m.toLowerCase() === draft.trim().toLowerCase()) || draft.trim()); setDraft(''); close(); }}>Add</button></div>{onContributions && <button type="button" className="selector-extra" onClick={() => { close(); onContributions(); }}>Add payment contribution</button>}</>}</SelectionPopover>;
}
