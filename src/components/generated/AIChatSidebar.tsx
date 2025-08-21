import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Zap, AlertTriangle, FileSearch, TrendingUp, X, Loader2 } from 'lucide-react';
interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}
interface AnalysisResult {
  highlights: Array<{
    id: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'critical' | 'warning' | 'attention' | 'info';
    description: string;
  }>;
  summary: string;
  processedPdfUrl?: string;
}
interface AIChatSidebarProps {
  onAnalysisRequest: (prompt: string) => void;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
  hasFile: boolean;
  onClose: () => void;
}
const quickActions = [{
  id: 'fcra-violations',
  label: 'FCRA Violations',
  icon: AlertTriangle,
  prompt: 'Analyze this credit report for potential Fair Credit Reporting Act (FCRA) violations and highlight any issues.',
  color: 'from-red-500 to-red-600'
}, {
  id: 'disputed-accounts',
  label: 'Disputed Accounts',
  icon: FileSearch,
  prompt: 'Identify and highlight all disputed accounts and verify they are properly marked according to FCRA requirements.',
  color: 'from-orange-500 to-orange-600'
}, {
  id: 'collections',
  label: 'Collections Analysis',
  icon: TrendingUp,
  prompt: 'Analyze all collection accounts for accuracy, validation requirements, and potential violations.',
  color: 'from-yellow-500 to-yellow-600'
}, {
  id: 'debt-income',
  label: 'Debt-to-Income',
  icon: Zap,
  prompt: 'Calculate and analyze debt-to-income ratios and highlight any concerning patterns or inaccuracies.',
  color: 'from-blue-500 to-blue-600'
}];

// @component: AIChatSidebar
export const AIChatSidebar = ({
  onAnalysisRequest,
  isAnalyzing,
  analysisResult,
  hasFile,
  onClose
}: AIChatSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    type: 'ai',
    content: 'Hello! I\'m your AI legal assistant. Upload a credit report and I\'ll help you identify potential FCRA violations, disputed accounts, and other legal issues. Use the quick actions below or ask me anything!',
    timestamp: new Date()
  }]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, []);
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  useEffect(() => {
    if (analysisResult) {
      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: analysisResult.summary,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }
  }, [analysisResult]);
  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim() || !hasFile) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    onAnalysisRequest(inputValue.trim());
    setInputValue('');
  }, [inputValue, hasFile, onAnalysisRequest]);
  const handleQuickAction = useCallback((action: typeof quickActions[0]) => {
    if (!hasFile) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: action.label,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    onAnalysisRequest(action.prompt);
  }, [hasFile, onAnalysisRequest]);
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // @return
  return <div className="h-full flex flex-col bg-white/90 backdrop-blur-sm" data-magicpath-id="0" data-magicpath-path="AIChatSidebar.tsx">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/60 bg-gradient-to-r from-blue-50 to-indigo-50" data-magicpath-id="1" data-magicpath-path="AIChatSidebar.tsx">
        <div className="flex items-center justify-between mb-3" data-magicpath-id="2" data-magicpath-path="AIChatSidebar.tsx">
          <div className="flex items-center gap-3" data-magicpath-id="3" data-magicpath-path="AIChatSidebar.tsx">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center" data-magicpath-id="4" data-magicpath-path="AIChatSidebar.tsx">
              <Bot className="w-4 h-4 text-white" data-magicpath-id="5" data-magicpath-path="AIChatSidebar.tsx" />
            </div>
            <div data-magicpath-id="6" data-magicpath-path="AIChatSidebar.tsx">
              <h2 className="font-semibold text-slate-900" data-magicpath-id="7" data-magicpath-path="AIChatSidebar.tsx">
                <span data-magicpath-id="8" data-magicpath-path="AIChatSidebar.tsx">AI Legal Assistant</span>
              </h2>
              <p className="text-xs text-slate-600" data-magicpath-id="9" data-magicpath-path="AIChatSidebar.tsx">
                <span data-magicpath-id="10" data-magicpath-path="AIChatSidebar.tsx">Credit Report Analysis</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-lg transition-colors lg:hidden" data-magicpath-id="11" data-magicpath-path="AIChatSidebar.tsx">
            <X className="w-4 h-4" data-magicpath-id="12" data-magicpath-path="AIChatSidebar.tsx" />
          </button>
        </div>

        {/* Quick Actions */}
        {hasFile && <div className="space-y-2" data-magicpath-id="13" data-magicpath-path="AIChatSidebar.tsx">
            <p className="text-xs font-medium text-slate-700 mb-2" data-magicpath-id="14" data-magicpath-path="AIChatSidebar.tsx">
              <span data-magicpath-id="15" data-magicpath-path="AIChatSidebar.tsx">Quick Actions</span>
            </p>
            <div className="grid grid-cols-2 gap-2" data-magicpath-id="16" data-magicpath-path="AIChatSidebar.tsx">
              {quickActions.map(action => <motion.button key={action.id} whileHover={{
            scale: 1.02
          }} whileTap={{
            scale: 0.98
          }} onClick={() => handleQuickAction(action)} disabled={isAnalyzing} className={`p-2 rounded-lg text-white text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${action.color}`} data-magicpath-id="17" data-magicpath-path="AIChatSidebar.tsx">
                  <action.icon className="w-3 h-3 mx-auto mb-1" data-magicpath-id="18" data-magicpath-path="AIChatSidebar.tsx" />
                  <span data-magicpath-id="19" data-magicpath-path="AIChatSidebar.tsx">{action.label}</span>
                </motion.button>)}
            </div>
          </div>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-magicpath-id="20" data-magicpath-path="AIChatSidebar.tsx">
        {messages.map(message => <motion.div key={message.id} initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`} data-magicpath-id="21" data-magicpath-path="AIChatSidebar.tsx">
            {message.type === 'ai' && <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center flex-shrink-0" data-magicpath-id="22" data-magicpath-path="AIChatSidebar.tsx">
                <Bot className="w-4 h-4 text-white" data-magicpath-id="23" data-magicpath-path="AIChatSidebar.tsx" />
              </div>}
            
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`} data-magicpath-id="24" data-magicpath-path="AIChatSidebar.tsx">
              <div className={`p-3 rounded-2xl shadow-sm ${message.type === 'user' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ml-auto' : 'bg-white border border-slate-200'}`} data-magicpath-id="25" data-magicpath-path="AIChatSidebar.tsx">
                <p className={`text-sm leading-relaxed ${message.type === 'user' ? 'text-white' : 'text-slate-800'}`} data-magicpath-id="26" data-magicpath-path="AIChatSidebar.tsx">
                  <span data-magicpath-id="27" data-magicpath-path="AIChatSidebar.tsx">{message.content}</span>
                </p>
              </div>
              <p className={`text-xs text-slate-500 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`} data-magicpath-id="28" data-magicpath-path="AIChatSidebar.tsx">
                <span data-magicpath-id="29" data-magicpath-path="AIChatSidebar.tsx">{formatTime(message.timestamp)}</span>
              </p>
            </div>

            {message.type === 'user' && <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center flex-shrink-0" data-magicpath-id="30" data-magicpath-path="AIChatSidebar.tsx">
                <User className="w-4 h-4 text-white" data-magicpath-id="31" data-magicpath-path="AIChatSidebar.tsx" />
              </div>}
          </motion.div>)}

        {/* Analyzing Indicator */}
        <AnimatePresence data-magicpath-id="32" data-magicpath-path="AIChatSidebar.tsx">
          {isAnalyzing && <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -20
        }} className="flex gap-3" data-magicpath-id="33" data-magicpath-path="AIChatSidebar.tsx">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center flex-shrink-0" data-magicpath-id="34" data-magicpath-path="AIChatSidebar.tsx">
                <Bot className="w-4 h-4 text-white" data-magicpath-id="35" data-magicpath-path="AIChatSidebar.tsx" />
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm" data-magicpath-id="36" data-magicpath-path="AIChatSidebar.tsx">
                <div className="flex items-center gap-2" data-magicpath-id="37" data-magicpath-path="AIChatSidebar.tsx">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" data-magicpath-id="38" data-magicpath-path="AIChatSidebar.tsx" />
                  <span className="text-sm text-slate-600" data-magicpath-id="39" data-magicpath-path="AIChatSidebar.tsx">Analyzing credit report...</span>
                </div>
              </div>
            </motion.div>}
        </AnimatePresence>

        <div ref={messagesEndRef} data-magicpath-id="40" data-magicpath-path="AIChatSidebar.tsx" />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200/60 bg-gradient-to-r from-slate-50 to-blue-50" data-magicpath-id="41" data-magicpath-path="AIChatSidebar.tsx">
        {!hasFile ? <div className="text-center py-4" data-magicpath-id="42" data-magicpath-path="AIChatSidebar.tsx">
            <p className="text-sm text-slate-500 mb-2" data-magicpath-id="43" data-magicpath-path="AIChatSidebar.tsx">
              <span data-magicpath-id="44" data-magicpath-path="AIChatSidebar.tsx">Upload a PDF credit report to start analyzing</span>
            </p>
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto" data-magicpath-id="45" data-magicpath-path="AIChatSidebar.tsx">
              <FileSearch className="w-6 h-6 text-slate-400" data-magicpath-id="46" data-magicpath-path="AIChatSidebar.tsx" />
            </div>
          </div> : <div className="flex gap-2" data-magicpath-id="47" data-magicpath-path="AIChatSidebar.tsx">
            <div className="flex-1 relative" data-magicpath-id="48" data-magicpath-path="AIChatSidebar.tsx">
              <textarea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask about FCRA violations, disputed accounts, or any legal concerns..." disabled={isAnalyzing} className="w-full p-3 pr-12 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white/80 backdrop-blur-sm text-sm" rows={2} data-magicpath-id="49" data-magicpath-path="AIChatSidebar.tsx" />
              <motion.button whileHover={{
            scale: 1.05
          }} whileTap={{
            scale: 0.95
          }} onClick={handleSendMessage} disabled={!inputValue.trim() || isAnalyzing} className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" data-magicpath-id="50" data-magicpath-path="AIChatSidebar.tsx">
                <Send className="w-4 h-4" data-magicpath-id="51" data-magicpath-path="AIChatSidebar.tsx" />
              </motion.button>
            </div>
          </div>}
      </div>
    </div>;
};