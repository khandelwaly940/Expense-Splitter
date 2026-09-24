import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Copy, Link, Loader2, Shield, Share2, SlidersHorizontal } from 'lucide-react';
import { readyExpenses } from '../utils/expenses';
import { buildSnapshot } from '../utils/trips';
import { buildFullShareURL, createShortLink, copyToClipboard } from '../utils/sharing';
import { money, total } from './BillWorkspace';
import Dialog from './Dialog';
import InfoTip from './InfoTip';

export default function ShareFlow({ trip, filteredExpenses, inviteFor, onClose, initialFiltered = false, viewName = null }) {
  const [options, setOptions] = useState({ filtered: initialFiltered, repay: trip.showRepay === true, upi: false });
  const [recipientId, setRecipientId] = useState(inviteFor || '');
  const [customize, setCustomize] = useState(false);
  const [ready, setReady] = useState(false);
  const [shortUrl, setShortUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [linkChoice, setLinkChoice] = useState('');
  const snapshot = useMemo(() => buildSnapshot(trip, filteredExpenses, { ...options, focusPersonId: recipientId }), [trip, filteredExpenses, options, recipientId]);
  const fullUrl = buildFullShareURL(snapshot);
  const person = trip.people.find(p => p.id === recipientId);
  const scope = options.filtered ? viewName || 'Current view' : 'Entire bill';
  const update = (key, checked) => { setCopied(false); setShortUrl(''); setOptions(prev => ({ ...prev, [key]: checked })); };
  const copy = async url => { setError(''); if (await copyToClipboard(url)) setCopied(true); else setError('Clipboard access was blocked. Select and copy the link below.'); };
  const shorten = async () => {
    setBusy(true); setError('');
    try {
      const result = await createShortLink(fullUrl, { title: trip.name || 'Expense Split' });
      setShortUrl(result.shortUrl); setCopied(false);
    } catch (failure) { setError(failure.message || 'Could not shorten the link. You can still use the direct link.'); }
    finally { setBusy(false); }
  };
  const chooseShort = () => { setLinkChoice('short'); setCopied(false); setError(''); if (!shortUrl && !busy) shorten(); };
  const check = (key, label, description) => <label className="check-row"><input type="checkbox" checked={options[key]} onChange={event => update(key, event.target.checked)} /><span><strong>{label}</strong><InfoTip label={`About ${label.toLowerCase()}`}>{description}</InfoTip></span></label>;

  return <Dialog title={ready ? 'Your snapshot is ready' : person ? `Share with ${person.name}` : 'Share this bill'} onClose={onClose}>
    <div className="dialog-body form-stack">
      {trip.expenses.length > readyExpenses(trip.expenses).length && <p className="warning-banner">{trip.expenses.length - readyExpenses(trip.expenses).length} draft expenses excluded.</p>}
      <div className="share-summary"><span className="method-icon"><Link size={22} /></span><div><strong>{trip.name || 'Untitled trip'}</strong><small>{snapshot.trip.expenses.length} expenses · {snapshot.trip.participants.length} people{snapshot.partial ? ' · Partial bill' : ''}</small></div><strong>{money(total(snapshot.trip.expenses))}</strong></div>
      <div className="share-selection-summary" aria-label="Sharing selection"><span>{scope}</span><span>{person?.name || 'Everyone'}</span><span>Repayment {options.repay ? 'included' : 'excluded'}</span><span>UPI {options.upi ? 'included' : 'excluded'}</span></div>
      {!ready ? <>
        <button type="button" className="share-customize-trigger" aria-expanded={customize} onClick={() => setCustomize(open => !open)}><SlidersHorizontal size={16} /><span>Customize what’s shared</span><ChevronDown size={16} /></button>
        {customize && <div className="share-customize-panel">
          <label className="field"><span className="field-title">Share for<InfoTip label="About person-specific links">A person-specific link opens their overview. Everyone with the link can still access all included expenses; this is not private access.</InfoTip></span><select aria-label="Share for" value={recipientId} onChange={event => { setRecipientId(event.target.value); setShortUrl(''); setCopied(false); }}><option value="">Everyone</option>{trip.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <fieldset className="share-scope"><legend className="field-label">Include<InfoTip label="About shared scope">A view shares only its matching expenses. Balances are recalculated for that subset. Entire bill includes all completed expenses in this copy.</InfoTip></legend><label className={options.filtered ? '' : 'chosen'}><input type="radio" name="share-scope" checked={!options.filtered} onChange={() => update('filtered', false)} /><span><strong>Entire bill</strong><small>All {readyExpenses(trip.expenses).length} expenses</small></span></label><label className={options.filtered ? 'chosen' : ''}><input type="radio" name="share-scope" checked={options.filtered} onChange={() => update('filtered', true)} /><span><strong>{viewName || 'Current filtered view'}</strong><small>{readyExpenses(filteredExpenses).length} expenses</small></span></label></fieldset>
          <div className="share-checklist">{check('repay', 'Repayment details', 'Payment methods, own-share settings and accounting notes')}{check('upi', 'UPI payment links', 'Include people’s UPI IDs so recipients can pay directly')}</div>
        </div>}
      </> : <>
        <button className="button primary full-width" aria-expanded={!!linkChoice} onClick={() => { setLinkChoice(choice => choice ? '' : 'choose'); setError(''); }}><Share2 size={16} />Share Link</button>
        {linkChoice && <div className="share-link-options">
          <div className="share-link-choices"><button className={linkChoice === 'short' ? 'active' : ''} disabled={busy} onClick={chooseShort}>Short link</button><button className={linkChoice === 'direct' ? 'active' : ''} onClick={() => { setLinkChoice('direct'); setCopied(false); copy(fullUrl); }}>Direct link</button></div>
          {linkChoice === 'short' && <div className="share-link-detail">{busy && <p className="helper"><Loader2 size={16} className="animate-spin" />Generating short link…</p>}{shortUrl && <><textarea aria-label="Short snapshot link" readOnly rows={2} value={shortUrl} onFocus={event => event.target.select()} /><button className="button full-width" onClick={() => copy(shortUrl)}><Copy size={16} />{copied ? 'Copied' : 'Copy short link'}</button></>}{!busy && !shortUrl && error && <button className="button full-width" onClick={shorten}>Retry short link</button>}</div>}
          {linkChoice === 'direct' && <div className="share-link-detail"><textarea aria-label="Direct snapshot link" readOnly rows={3} value={fullUrl} onFocus={event => event.target.select()} /><button className="button full-width" onClick={() => copy(fullUrl)}><Copy size={16} />{copied ? 'Copied' : 'Copy direct link'}</button></div>}
        </div>}
      </>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <p className="privacy-note"><Shield size={16} /><span>Anyone with the link can read it. This snapshot won’t update automatically.</span></p>
    </div>
    <footer className="dialog-footer">{ready ? <><button className="text-button footer-leading" disabled={busy} onClick={() => { setReady(false); setLinkChoice(''); setError(''); setShortUrl(''); setCopied(false); }}><ArrowLeft size={15} />Edit selection</button><button className="button" onClick={onClose}>Done</button></> : <><button className="button" onClick={onClose}>Cancel</button><button className="button primary" onClick={() => setReady(true)}>Continue to sharing</button></>}</footer>
  </Dialog>;
}
