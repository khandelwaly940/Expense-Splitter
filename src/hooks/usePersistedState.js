import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'expense-splitter-state';
const DEBOUNCE_MS = 400;

/**
 * Load persisted state from localStorage.
 * @returns {object|null}
 */
export function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Hook that persists expense-splitter state to localStorage with debouncing.
 * Only persists when NOT loaded from a share URL (caller controls this).
 *
 * @param {object} state - { participants, expenses, tripName }
 * @param {boolean} enabled - Whether persistence is active (false when loaded from URL initially)
 */
export function usePersistedState(state, enabled = true) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to persist state', e);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, enabled]);
}

/**
 * Clear persisted state (for "Reset" action).
 */
export function clearPersistedState() {
  localStorage.removeItem(STORAGE_KEY);
}
