import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export default function InfoTip({ label, children }) {
  const id = useId(), root = useRef(null), tip = useRef(null), leaveTimer = useRef(null);
  const [position, setPosition] = useState(null);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);
  const leave = () => { leaveTimer.current = setTimeout(() => { if (document.activeElement !== root.current) setPosition(null); }, 160); };
  const open = () => {
    clearTimeout(leaveTimer.current);
    const rect = root.current.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(rect.left, innerWidth - 268)), top: rect.bottom + 7, ...(rect.bottom > innerHeight - 160 ? { top: 'auto', bottom: innerHeight - rect.top + 7 } : {}) });
  };
  useEffect(() => {
    if (!position) return;
    const dismiss = e => {
      if (e.key === 'Escape') { e.stopPropagation(); setPosition(null); }
      if (e.type === 'pointerdown' && !root.current?.contains(e.target) && !tip.current?.contains(e.target)) setPosition(null);
    };
    const scroll = () => setPosition(null);
    document.addEventListener('keydown', dismiss, true);
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', scroll);
    return () => { document.removeEventListener('keydown', dismiss, true); document.removeEventListener('pointerdown', dismiss); window.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', scroll); };
  }, [position]);
  return <span className="info-tip"><button ref={root} type="button" className="info-tip-trigger" aria-label={label} aria-describedby={position ? id : undefined} aria-expanded={!!position} onMouseEnter={open} onMouseLeave={leave} onFocus={open} onBlur={() => setPosition(null)} onClick={open}><Info size={15} /></button>{position && createPortal(<span ref={tip} id={id} role="tooltip" className="info-tip-content" style={{ position: 'fixed', ...position }} onMouseEnter={open} onMouseLeave={leave}>{children}</span>, document.body)}</span>;
}
