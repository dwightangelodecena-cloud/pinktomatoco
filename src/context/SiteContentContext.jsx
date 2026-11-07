import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_CONTENT } from '../data/siteContent.js';
import { getSiteContent } from '../lib/api.js';
import { load, save } from '../lib/storage.js';
import { supabase } from '../lib/supabase.js';

const SiteContentContext = createContext({ content: DEFAULT_CONTENT });
const KEY = 'ptc-content';
const WAIT_MS = 1500;

function merge(saved) {
  const merged = {};
  for (const key of Object.keys(DEFAULT_CONTENT)) merged[key] = { ...DEFAULT_CONTENT[key], ...saved?.[key] };
  return merged;
}

export function SiteContentProvider({ children }) {
  const [saved, setSaved] = useState(() => load(KEY, null));
  const [preview, setPreview] = useState(null);
  // First-time visitors wait briefly, so they don't see the built-in wording flash before the real wording.
  const [ready, setReady] = useState(() => !supabase || load(KEY, null) !== null);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const timer = setTimeout(() => setReady(true), WAIT_MS);
    getSiteContent()
      .then((rows) => {
        if (!alive) return;
        setSaved(rows);
        save(KEY, rows);
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  // The admin Content tab shows this site in a frame and sends unsaved edits to it.
  // Only that same-site parent frame is listened to, and nothing here is saved.
  useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (e) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (e.data?.type === 'ptc-preview-content') setPreview(e.data.content);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'ptc-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const value = useMemo(() => ({
    content: merge(preview ?? saved),
    publish(next) {
      setSaved(next);
      save(KEY, next);
    },
  }), [saved, preview]);

  if (!ready) return null;
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export const useSiteContent = () => useContext(SiteContentContext);
export const useContent = (key) => useSiteContent().content[key];
