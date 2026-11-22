import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { personStyle } from '../utils/personColors';

export default function SelectionPopover({ label, title, summary, options, selected = [], multiple = false, onSelect, children, actions, searchable = true, className = '' }) {
  const root = useRef(null), panel = useRef(null);
  const [open, setOpen] = useState(false), [position, setPosition] = useState(null), [query, setQuery] = useState('');
  const close = useCallback(() => { setOpen(false); setPosition(null); root.current?.querySelector('button')?.focus({ preventScroll: true }); }, []);
  const place = useCallback(() => {
    const trigger = root.current, menu = panel.current;
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6, margin = 8;
    const width = menu.offsetWidth, height = menu.offsetHeight;
    const below = innerHeight - rect.bottom - margin;
    const top = below >= height || rect.top < height + gap
      ? rect.bottom + gap
      : rect.top - height - gap;
    setPosition({
      left: Math.max(margin, Math.min(rect.left, innerWidth - width - margin)),
      top: Math.max(margin, Math.min(top, innerHeight - height - margin)),
    });
  }, []);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector('input, button')?.focus();
    const outside = e => {
      if (!root.current?.contains(e.target) && !panel.current?.contains(e.target)) {
        setOpen(false);
        setPosition(null);
      }
    };
    const reposition = () => requestAnimationFrame(place);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); };
  }, [open, place]);
  useLayoutEffect(() => { if (open) place(); }, [open, place, query, options.length]);
  const toggle = () => {
    if (open) return close();
    setQuery('');
    setPosition({ left: 8, top: 8 });
    setOpen(true);
  };
  return <div ref={root} className={`inline-split ${className}`}><button type="button" className="inline-split-trigger" aria-label={label} aria-expanded={open} aria-haspopup="dialog" onClick={toggle}>{summary}<ChevronDown size={12} /></button>{open && createPortal(<div ref={panel} role="dialog" aria-label={title} className="selection-panel" style={position || { left: 8, top: 8 }} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } }}><header><strong>{title}</strong>{actions}</header>{searchable && <label className="selector-search"><Search size={14} /><input aria-label={`Search ${title.toLowerCase()}`} placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} /></label>}<div className="selector-options">{options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())).map(option => <button type="button" key={option.value} className={selected.includes(option.value) ? 'selected' : ''} aria-pressed={selected.includes(option.value)} onClick={() => { onSelect(option.value); if (!multiple) close(); }}><span className="selector-option-label">{option.color && <span className="person-color-dot" style={personStyle(option.color)} aria-hidden="true" />}{option.label}</span>{option.detail && <small>{option.detail}</small>}<span className={`selector-mark ${multiple ? 'checkbox-mark' : ''}`}>{selected.includes(option.value) && <Check size={13} />}</span></button>)}{!options.some(o => o.label.toLowerCase().includes(query.toLowerCase())) && <span className="selector-empty">No matches</span>}</div>{typeof children === 'function' ? children(close) : children}{searchable && <footer><button type="button" className="text-button" onClick={close}>Done</button></footer>}</div>, document.body)}</div>;
}
