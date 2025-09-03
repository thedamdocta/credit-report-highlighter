import React, { useEffect, useMemo, useState } from 'react';
import { X, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { 
  getOpenAIKey, 
  setOpenAIKey, 
  validateOpenAIKeyFormat, 
  maskKey 
} from '../../settings/openai';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [inputKey, setInputKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{type: 'idle' | 'success' | 'error', message?: string}>({ type: 'idle' });

  useEffect(() => {
    if (open) {
      const current = getOpenAIKey();
      setSavedKey(current);
      setInputKey(current || '');
      setStatus({ type: 'idle' });
    }
  }, [open]);

  const isValid = useMemo(() => validateOpenAIKeyFormat(inputKey || ''), [inputKey]);

  const handleSave = () => {
    if (!isValid) {
      setStatus({ type: 'error', message: 'Please enter a valid API key.' });
      return;
    }
    setOpenAIKey(inputKey.trim());
    setSavedKey(inputKey.trim());
    setStatus({ type: 'success', message: 'OpenAI API key saved.' });
  };

  const handleClear = () => {
    setOpenAIKey(null);
    setSavedKey(null);
    setInputKey('');
    setStatus({ type: 'success', message: 'OpenAI API key removed.' });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Settings</h2>
          </div>
          <button
            className="p-1 rounded hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                if (status.type !== 'idle') setStatus({ type: 'idle' });
              }}
              placeholder="sk-..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Your key is stored locally in your browser (localStorage). It is never sent to a server by this app.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-xs text-gray-700 flex items-center gap-1 min-w-0">
              <span className="font-medium shrink-0">Current key:</span>
              <span className="font-mono flex-1 min-w-0 truncate">
                {savedKey ? maskKey(savedKey) : 'None'}
              </span>
            </div>
          </div>

          {status.type === 'success' && status.message && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>{status.message}</span>
            </div>
          )}
          {status.type === 'error' && status.message && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>{status.message}</span>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="text-xs text-red-600 hover:text-red-700 px-3 py-1.5 rounded hover:bg-red-50"
            type="button"
          >
            Remove Key
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-100"
              type="button"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className={`text-xs px-3 py-1.5 rounded text-white ${isValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'}`}
              type="button"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
