import { useEffect, useRef } from "react";

const SAVE_DEBOUNCE_MS = 800;

function draftKey(userId: string, feature: string): string {
  return `creatoros-draft:${userId}:${feature}`;
}

function readDraft<T>(userId: string, feature: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(userId, feature));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeDraft<T>(userId: string, feature: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftKey(userId, feature), JSON.stringify(value));
  } catch {
    // localStorage unavailable (private mode / disabled) -- draft just won't survive a reload.
  }
}

function removeDraft(userId: string, feature: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(userId, feature));
  } catch {
    // ignore
  }
}

interface UseDraftAutosaveParams<T> {
  userId: string | undefined;
  feature: string;
  enabled: boolean;
  value: T;
  onRestore: (draft: T) => void;
}

/**
 * Debounced localStorage autosave for in-progress studio state, keyed per
 * user so switching accounts on the same browser never surfaces another
 * user's draft. Restores once on mount (when a userId first becomes
 * available); every subsequent `value` change is saved after a short
 * debounce while `enabled` is true.
 */
export function useDraftAutosave<T>({ userId, feature, enabled, value, onRestore }: UseDraftAutosaveParams<T>) {
  const restoredForUser = useRef<string | null>(null);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  useEffect(() => {
    if (!userId || !enabled) return;
    if (restoredForUser.current === userId) return;
    restoredForUser.current = userId;
    const draft = readDraft<T>(userId, feature);
    if (draft !== null) {
      onRestoreRef.current(draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled, feature]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!userId || !enabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      writeDraft(userId, feature, value);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled, feature, value]);

  function clearDraft() {
    if (!userId) return;
    removeDraft(userId, feature);
  }

  return { clearDraft };
}
