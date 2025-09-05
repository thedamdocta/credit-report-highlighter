import React, { useEffect, useMemo, useState } from 'react';
import { X, KeyRound, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { 
  getOpenAIKey, 
  setOpenAIKey, 
  validateOpenAIKeyFormat, 
  maskKey 
} from '../../settings/openai';
import {
  getGeminiKey,
  setGeminiKey,
  hasGeminiKey
} from '../../settings/gemini';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'openai' | 'gemini'>('gemini');
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [savedOpenAIKey, setSavedOpenAIKey] = useState<string | null>(null);
  const [savedGeminiKey, setSavedGeminiKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{type: 'idle' | 'success' | 'error', message?: string}>({ type: 'idle' });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) {
      const currentOpenAI = getOpenAIKey();
      const currentGemini = getGeminiKey();
      setSavedOpenAIKey(currentOpenAI);
      setSavedGeminiKey(currentGemini);
      setOpenaiKey(currentOpenAI || '');
      setGeminiKey(currentGemini || '');
      setStatus({ type: 'idle' });
      // Default to Gemini since it has better context window
      setActiveTab('gemini');
    }
  }, [open]);

  const isOpenAIValid = useMemo(() => validateOpenAIKeyFormat(openaiKey || ''), [openaiKey]);
  const isGeminiValid = useMemo(() => !!geminiKey && geminiKey.length > 10, [geminiKey]);

  const handleSave = () => {
    if (activeTab === 'openai') {
      if (!isOpenAIValid) {
        setStatus({ type: 'error', message: 'Please enter a valid OpenAI API key.' });
        return;
      }
      setOpenAIKey(openaiKey.trim());
      setSavedOpenAIKey(openaiKey.trim());
      setStatus({ type: 'success', message: 'OpenAI API key saved.' });
    } else {
      if (!isGeminiValid) {
        setStatus({ type: 'error', message: 'Please enter a valid Gemini API key.' });
        return;
      }
      setGeminiKey(geminiKey.trim());
      setSavedGeminiKey(geminiKey.trim());
      setStatus({ type: 'success', message: 'Gemini API key saved.' });
    }
  };

  const handleClear = () => {
    if (activeTab === 'openai') {
      setOpenAIKey(null);
      setSavedOpenAIKey(null);
      setOpenaiKey('');
      setStatus({ type: 'success', message: 'OpenAI API key removed.' });
    } else {
      setGeminiKey('');
      setSavedGeminiKey(null);
      setGeminiKey('');
      setStatus({ type: 'success', message: 'Gemini API key removed.' });
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setStatus({ type: 'idle' });

    try {
      const keyToTest = activeTab === 'openai' ? (openaiKey || savedOpenAIKey) : (geminiKey || savedGeminiKey);
      
      if (!keyToTest) {
        setStatus({ type: 'error', message: `No ${activeTab === 'openai' ? 'OpenAI' : 'Gemini'} API key to test.` });
        return;
      }

      if (activeTab === 'openai') {
        // Test OpenAI API
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${keyToTest}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          setStatus({ type: 'success', message: '✅ OpenAI API key is valid and working!' });
        } else {
          const error = await response.text();
          setStatus({ type: 'error', message: `❌ OpenAI API error: ${response.status}` });
        }
      } else {
        // Test Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`);
        
        if (response.ok) {
          setStatus({ type: 'success', message: '✅ Gemini API key is valid and working!' });
        } else {
          const error = await response.text();
          setStatus({ type: 'error', message: `❌ Gemini API error: ${response.status}` });
        }
      }
    } catch (error) {
      setStatus({ type: 'error', message: `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setTesting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">AI Provider Settings</h2>
          </div>
          <button
            className="p-1 rounded hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pt-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('gemini')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'gemini'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Gemini (1M Context) ⭐
            </button>
            <button
              onClick={() => setActiveTab('openai')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'openai'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              OpenAI (GPT-5)
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {activeTab === 'gemini' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    if (status.type !== 'idle') setStatus({ type: 'idle' });
                  }}
                  placeholder="AIza..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Gemini 1.5 Pro with 1M token context window. Recommended for large documents (120+ pages).
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-700 flex items-center gap-1 min-w-0">
                  <span className="font-medium shrink-0">Current key:</span>
                  <span className="font-mono flex-1 min-w-0 truncate">
                    {savedGeminiKey ? maskKey(savedGeminiKey) : 'None'}
                  </span>
                </div>
                {savedGeminiKey && (
                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="mt-2 w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 disabled:opacity-50"
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-blue-800">
                  <div className="font-medium mb-1">Why use Gemini?</div>
                  <ul className="text-[11px] space-y-1 list-disc list-inside">
                    <li>1M token context = full document analysis without chunking</li>
                    <li>Better accuracy for large credit reports (120+ pages)</li>
                    <li>Cost-effective for document analysis</li>
                    <li>Perfect context preservation across all pages</li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => {
                    setOpenaiKey(e.target.value);
                    if (status.type !== 'idle') setStatus({ type: 'idle' });
                  }}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  GPT-5 - The latest model with enhanced reasoning capabilities. Best for complex documents.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-700 flex items-center gap-1 min-w-0">
                  <span className="font-medium shrink-0">Current key:</span>
                  <span className="font-mono flex-1 min-w-0 truncate">
                    {savedOpenAIKey ? maskKey(savedOpenAIKey) : 'None'}
                  </span>
                </div>
                {savedOpenAIKey && (
                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="mt-2 w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 disabled:opacity-50"
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                )}
              </div>
            </>
          )}

          <div className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2">
            🔒 Your API keys are stored locally in your browser and never sent to our servers.
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
            Remove {activeTab === 'openai' ? 'OpenAI' : 'Gemini'} Key
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
              disabled={activeTab === 'openai' ? !isOpenAIValid : !isGeminiValid}
              className={`text-xs px-3 py-1.5 rounded text-white ${
                (activeTab === 'openai' ? isOpenAIValid : isGeminiValid)
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-300 cursor-not-allowed'
              }`}
              type="button"
            >
              Save {activeTab === 'openai' ? 'OpenAI' : 'Gemini'} Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}