import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { personStyle } from '../utils/personColors';

export default function SelectionPopover({ label, title, summary, options, selected = [], multiple = false, onSelect, children, actions, searchable = true, className = '' }) {
  const root = useRef(null), panel = useRef(null);
  const [position, setPosition] = useState(null), [query, setQuery] = useState('');
  const close = () => { setPosition(null); root.current?.querySelector('button')?.focus({ preventScroll: true }); };
  useEffect(() => {
    if (!position) return;
    panel.current?.querySelector('input, button')?.focus();
    const outside = e => { if (!root.current?.contains(e.target) && !panel.current?.contains(e.target)) setPosition(null); };
    const reposition = () => setPosition(null);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', reposition);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', reposition); };
  }, [position]);
  const toggle = () => {
    if (position) return close();
    const rect = root.current.getBoundingClientRect();
    setQuery('');
    setPosition({ left: Math.max(8, Math.min(rect.left, innerWidth - 288)), top: Math.max(8, Math.min(rect.bottom + 6, innerHeight - 370)) });
  };
  return <div ref={root} className={`inline-split ${className}`}><button type="button" className="inline-split-trigger" aria-label={label} aria-expanded={!!position} aria-haspopup="dialog" onClick={toggle}>{summary}<ChevronDown size={12} /></button>{position && createPortal(<div ref={panel} role="dialog" aria-label={title} className="selection-panel" style={position} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } }}><header><strong>{title}</strong>{actions}</header>{searchable && <label className="selector-search"><Search size={14} /><input aria-label={`Search ${title.toLowerCase()}`} placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} /></label>}<div className="selector-options">{options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())).map(option => <button type="button" key={option.value} className={selected.includes(option.value) ? 'selected' : ''} aria-pressed={selected.includes(option.value)} onClick={() => { onSelect(option.value); if (!multiple) close(); }}><span className="selector-option-label">{option.color && <span className="person-color-dot" style={personStyle(option.color)} aria-hidden="true" />}{option.label}</span>{option.detail && <small>{option.detail}</small>}<span className={`selector-mark ${multiple ? 'checkbox-mark' : ''}`}>{selected.includes(option.value) && <Check size={13} />}</span></button>)}{!options.some(o => o.label.toLowerCase().includes(query.toLowerCase())) && <span className="selector-empty">No matches</span>}</div>{typeof children === 'function' ? children(close) : children}{searchable && <footer><button type="button" className="text-button" onClick={close}>Done</button></footer>}</div>, root.current.closest('section[role="dialog"]') || document.body)}</div>;
}
