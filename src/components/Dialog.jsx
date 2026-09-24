import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function Dialog({ title, subtitle, children, onClose, wide = false, drawer = false }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () => [...ref.current.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
    (ref.current.querySelector('[data-autofocus]') || focusables()[0])?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const keyboard = e => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    if (e.key !== 'Tab') return;
    const items = [...ref.current.querySelectorAll('button, input, select, textarea, a[href], summary, [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  };
  return <div className={`dialog-backdrop ${drawer ? 'is-drawer' : ''}`} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={ref} onKeyDown={keyboard} role="dialog" aria-modal="true" aria-labelledby={id} className={`dialog ${wide ? 'dialog-wide' : ''} ${drawer ? 'dialog-drawer' : ''}`}>
      <header className="dialog-heading"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></header>
      {children}
    </section>
  </div>;
}
