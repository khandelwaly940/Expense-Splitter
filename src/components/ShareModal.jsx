import React, { useState } from 'react';
import { X, Link as LinkIcon, ExternalLink, Clock, Loader2, Check } from 'lucide-react';
import { buildFullShareURL, createShortLink, copyToClipboard } from '../utils/sharing';

const EXPIRY_OPTIONS = [
  { label: 'No expiry', hours: null },
  { label: '24 hours', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '7 days', hours: 168 },
  { label: '30 days', hours: 720 },
];

/**
 * Share modal — lets user choose between a full compressed link or a short link
 * with configurable expiry (via OpenShortURL API).
 */
const ShareModal = ({ payload, onClose }) => {
  const [mode, setMode] = useState('full'); // 'full' | 'short'
  const [expiryHours, setExpiryHours] = useState(null);
  const [shortUrl, setShortUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fullUrl = buildFullShareURL(payload);
  // Short-link proxy URL is hardcoded — always available.
  // Override with VITE_SHORTLINK_PROXY_URL env var to use a different proxy.

  const handleGenerateShort = async () => {
    setLoading(true);
    setError(null);
    setShortUrl(null);
    try {
      const { shortUrl: url } = await createShortLink(fullUrl, {
        expiresInHours: expiryHours,
        title: payload.t ? `${payload.t} — Expense Split` : 'Expense Split',
      });
      setShortUrl(url);
    } catch (e) {
      setError(e.message || 'Failed to generate short link. Check API config.');
    } finally {
      setLoading(false);
    }
  };

  const activeUrl = mode === 'short' ? shortUrl : fullUrl;

  const handleCopy = async () => {
    if (!activeUrl) return;
    const ok = await copyToClipboard(activeUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Native share (mobile)
  const handleNativeShare = async () => {
    if (!activeUrl) return;
    try {
      await navigator.share({ title: 'Expense Split', url: activeUrl });
    } catch {
      handleCopy();
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-indigo-500" />
            Share Bill
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('full')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                mode === 'full'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Full Link
            </button>
            <button
              onClick={() => { setMode('short'); setShortUrl(null); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                mode === 'short'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Short Link
            </button>
          </div>

          {/* Full link preview */}
          {mode === 'full' && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <p className="text-[11px] text-slate-400 mb-1 font-medium uppercase tracking-wider">
                Compressed URL
              </p>
              <p className="text-xs text-slate-600 break-all font-mono leading-relaxed line-clamp-3">
                {fullUrl}
              </p>
            </div>
          )}

          {/* Short link options */}
          {mode === 'short' && (
            <div className="space-y-3">

              {/* Expiry selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Clock className="w-3 h-3" />
                  Link Expiry
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {EXPIRY_OPTIONS.map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => setExpiryHours(opt.hours)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                        expiryHours === opt.hours
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              {!shortUrl && (
                <button
                  onClick={handleGenerateShort}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  ) : (
                    <><ExternalLink className="w-4 h-4" /> Generate Short Link</>
                  )}
                </button>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                  {error}
                </p>
              )}

              {/* Short URL result */}
              {shortUrl && (
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                  <p className="text-[11px] text-emerald-600 mb-1 font-semibold uppercase tracking-wider">
                    Short URL Ready
                  </p>
                  <p className="text-sm text-emerald-800 font-mono break-all">{shortUrl}</p>
                  <button
                    onClick={() => { setShortUrl(null); setError(null); }}
                    className="text-[10px] text-emerald-600 hover:underline mt-1"
                  >
                    Generate new
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Copy / Share buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCopy}
              disabled={mode === 'short' && !shortUrl}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-white hover:bg-slate-900'
              }`}
            >
              {copied ? (
                <><Check className="w-4 h-4" /> Copied!</>
              ) : (
                <><LinkIcon className="w-4 h-4" /> Copy Link</>
              )}
            </button>

            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                disabled={mode === 'short' && !shortUrl}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
