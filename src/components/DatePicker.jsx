import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = n => String(n).padStart(2, '0');
const toISO = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dateFor = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T12:00:00`)) ? new Date(`${value}T12:00:00`) : new Date();

export default function DatePicker({ value, onChange, compact = false, align = 'left', stepper = false }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => dateFor(value));
  const ref = useRef(null);
  const trigger = useRef(null);
  const popup = useRef(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useEffect(() => {
    if (!open) return;
    const close = event => {
      if (event.key === 'Escape' || (event.type === 'mousedown' && !ref.current?.contains(event.target) && !popup.current?.contains(event.target))) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = first.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const selected = value || '';
  const today = toISO(new Date());
  const shift = delta => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  const choose = iso => { onChange(iso); setOpen(false); trigger.current?.focus(); };
  const stepDate = delta => { const date = dateFor(value); date.setDate(date.getDate() + delta); onChange(toISO(date)); };
  const toggle = () => { const r = trigger.current.getBoundingClientRect(); setPosition({ left: Math.max(8, Math.min(align === 'right' ? r.right - 256 : r.left, innerWidth - 264)), top: Math.max(8, r.bottom + 335 > innerHeight ? r.top - 330 : r.bottom + 6) }); setMonth(dateFor(value)); setOpen(!open); };
  return <div ref={ref} className={`date-picker relative w-full ${stepper ? 'date-stepper' : 'inline-block'}`} onKeyDown={e => { if (open && e.key === 'Escape') { e.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
    {stepper && <button type="button" className="date-step" aria-label="Previous day" title="Previous day" onClick={() => stepDate(-1)}><Minus size={12} /></button>}
    <button ref={trigger} type="button" onClick={toggle}
      className={`flex items-center gap-1.5 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 ${compact ? 'text-xs py-1' : 'w-full px-2 py-1.5 text-xs'}`} aria-label="Choose date" aria-expanded={open}>
      <CalendarDays className="w-3.5 h-3.5" /> {value ? dateFor(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(compact ? {} : { year: 'numeric' }) }) : 'Choose date'}
    </button>
    {stepper && <button type="button" className="date-step" aria-label="Next day" title="Next day" onClick={() => stepDate(1)}><Plus size={12} /></button>}
    {open && createPortal(<div ref={popup} style={{ position: 'fixed', ...position }} className="date-calendar z-[120] w-64 rounded-2xl border border-indigo-100 bg-white p-3 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="p-1.5 rounded-lg hover:bg-indigo-50"><ChevronLeft className="w-4 h-4" /></button>
        <span className="font-semibold text-sm text-slate-800">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className="p-1.5 rounded-lg hover:bg-indigo-50"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">{weekdays.map(day => <span key={day} className="text-[10px] font-semibold text-slate-400 py-1">{day}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const iso = toISO(new Date(month.getFullYear(), month.getMonth(), day));
          return <button key={day} type="button" aria-pressed={iso === selected} title={iso} onClick={() => choose(iso)}
            className={`h-8 rounded-lg text-xs ${iso === selected ? 'bg-indigo-600 text-white font-bold' : iso === today ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>;
        })}
      </div>
      <button type="button" onClick={() => choose(today)} className="mt-3 w-full rounded-lg bg-indigo-50 py-1.5 text-xs font-medium text-indigo-700">Today</button>
    </div>, document.body)}
  </div>;
}
