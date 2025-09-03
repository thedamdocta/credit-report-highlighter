// Runtime storage for OpenAI API key (persisted in localStorage)
const STORAGE_KEY = 'creditpdf.openai.apiKey';
const EVENT_NAME = 'creditpdf-openai-key-changed';

export type OpenAIKeyChangeDetail = {
  hasKey: boolean;
  key?: string | null;
};

// Guard access to localStorage (SSR-safe)
function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getOpenAIKey(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

export function setOpenAIKey(key: string | null): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (key && key.trim()) {
      storage.setItem(STORAGE_KEY, key.trim());
      dispatchKeyChange(true, key.trim());
    } else {
      storage.removeItem(STORAGE_KEY);
      dispatchKeyChange(false, null);
    }
  } catch {
    // ignore
  }
}

export function hasOpenAIKey(): boolean {
  return !!getOpenAIKey();
}

export function validateOpenAIKeyFormat(key: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  // Common OpenAI format starts with sk-, but support custom providers too.
  if (trimmed.length < 16) return false;
  return true;
}

export function maskKey(key: string | null | undefined): string {
  if (!key) return '';
  const k = key.trim();
  if (k.length <= 8) return '*'.repeat(k.length);
  return `${k.slice(0, 4)}${'*'.repeat(Math.max(4, k.length - 8))}${k.slice(-4)}`;
}

function dispatchKeyChange(hasKey: boolean, key?: string | null) {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      const evt = new CustomEvent<OpenAIKeyChangeDetail>(EVENT_NAME, {
        detail: { hasKey, key },
      });
      window.dispatchEvent(evt);
    }
  } catch {
    // ignore
  }
}

export function subscribeToOpenAIKeyChanges(
  cb: (detail: OpenAIKeyChangeDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<OpenAIKeyChangeDetail>;
    cb(ce.detail);
  };
  window.addEventListener(EVENT_NAME, handler as EventListener);
  return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
}
