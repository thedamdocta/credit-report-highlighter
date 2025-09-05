// Gemini API Key Management
let geminiApiKey: string | null = null;

export function getGeminiKey(): string | null {
  // Return cached key if available
  if (geminiApiKey) {
    return geminiApiKey;
  }

  // Try to get from localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) {
      geminiApiKey = stored;
      return geminiApiKey;
    }
  }

  // Try environment variable
  const envKey = import.meta.env?.VITE_GEMINI_API_KEY;
  if (envKey) {
    geminiApiKey = envKey;
    return geminiApiKey;
  }

  return null;
}

export function setGeminiKey(key: string | null): void {
  if (key === null) {
    clearGeminiKey();
    return;
  }
  
  geminiApiKey = key;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('gemini_api_key', key);
  }
}

export function clearGeminiKey(): void {
  geminiApiKey = null;
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gemini_api_key');
  }
}

export function hasGeminiKey(): boolean {
  return !!getGeminiKey();
}