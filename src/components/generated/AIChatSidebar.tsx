import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Zap, AlertTriangle, FileSearch, TrendingUp, Loader2, Sparkles, Edit3, BookOpen } from 'lucide-react';
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
  color: 'bg-red-100 text-red-700 hover:bg-red-200'
}, {
  id: 'disputed-accounts',
  label: 'Disputed Accounts',
  icon: FileSearch,
  prompt: 'Identify and highlight all disputed accounts and verify they are properly marked according to FCRA requirements.',
  color: 'bg-orange-100 text-orange-700 hover:bg-orange-200'
}, {
  id: 'collections',
  label: 'Collections Analysis',
  icon: TrendingUp,
  prompt: 'Analyze all collection accounts for accuracy, validation requirements, and potential violations.',
  color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
}, {
  id: 'debt-income',
  label: 'Debt-to-Income',
  icon: Zap,
  prompt: 'Calculate and analyze debt-to-income ratios and highlight any concerning patterns or inaccuracies.',
  color: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
}];
const suggestedPrompts = ["Identify similar images online", "Summarize this transcript", "Analyze the contents of this image"];

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
  const handleSuggestedPrompt = useCallback((prompt: string) => {
    if (!hasFile) return;
    setInputValue(prompt);
  }, [hasFile]);
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
  return <div className="h-full flex flex-col bg-white" data-magicpath-id="0" data-magicpath-path="AIChatSidebar.tsx">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-magicpath-id="1" data-magicpath-path="AIChatSidebar.tsx">
        {messages.map(message => <motion.div key={message.id} initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`} data-magicpath-id="2" data-magicpath-path="AIChatSidebar.tsx">
            {message.type === 'ai' && <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0" data-magicpath-id="3" data-magicpath-path="AIChatSidebar.tsx">
                <Bot className="w-4 h-4 text-white" data-magicpath-id="4" data-magicpath-path="AIChatSidebar.tsx" />
              </div>}
            
            <div className={`max-w-[85%] ${message.type === 'user' ? 'order-first' : ''}`} data-magicpath-id="5" data-magicpath-path="AIChatSidebar.tsx">
              <div className={`p-3 rounded-2xl ${message.type === 'user' ? 'bg-black text-white ml-auto' : 'bg-gray-100 text-gray-900'}`} data-magicpath-id="6" data-magicpath-path="AIChatSidebar.tsx">
                <p className="text-sm leading-relaxed" data-magicpath-id="7" data-magicpath-path="AIChatSidebar.tsx">
                  <span data-magicpath-id="8" data-magicpath-path="AIChatSidebar.tsx">{message.content}</span>
                </p>
              </div>
              <p className={`text-xs text-gray-500 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`} data-magicpath-id="9" data-magicpath-path="AIChatSidebar.tsx">
                <span data-magicpath-id="10" data-magicpath-path="AIChatSidebar.tsx">{formatTime(message.timestamp)}</span>
              </p>
            </div>

            {message.type === 'user' && <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0" data-magicpath-id="11" data-magicpath-path="AIChatSidebar.tsx">
                <User className="w-4 h-4 text-gray-600" data-magicpath-id="12" data-magicpath-path="AIChatSidebar.tsx" />
              </div>}
          </motion.div>)}

        {/* Analyzing Indicator */}
        <AnimatePresence data-magicpath-id="13" data-magicpath-path="AIChatSidebar.tsx">
          {isAnalyzing && <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -20
        }} className="flex gap-3" data-magicpath-id="14" data-magicpath-path="AIChatSidebar.tsx">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0" data-magicpath-id="15" data-magicpath-path="AIChatSidebar.tsx">
                <Bot className="w-4 h-4 text-white" data-magicpath-id="16" data-magicpath-path="AIChatSidebar.tsx" />
              </div>
              <div className="bg-gray-100 p-3 rounded-2xl" data-magicpath-id="17" data-magicpath-path="AIChatSidebar.tsx">
                <div className="flex items-center gap-2" data-magicpath-id="18" data-magicpath-path="AIChatSidebar.tsx">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" data-magicpath-id="19" data-magicpath-path="AIChatSidebar.tsx" />
                  <span className="text-sm text-gray-600" data-magicpath-id="20" data-magicpath-path="AIChatSidebar.tsx">Analyzing credit report...</span>
                </div>
              </div>
            </motion.div>}
        </AnimatePresence>

        <div ref={messagesEndRef} data-magicpath-id="21" data-magicpath-path="AIChatSidebar.tsx" />
      </div>

      {/* Quick Actions */}
      {hasFile && <div className="p-4 border-t border-gray-200" data-magicpath-id="22" data-magicpath-path="AIChatSidebar.tsx">
          <div className="grid grid-cols-2 gap-2 mb-4" data-magicpath-id="23" data-magicpath-path="AIChatSidebar.tsx">
            {quickActions.map(action => <motion.button key={action.id} whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} onClick={() => handleQuickAction(action)} disabled={isAnalyzing} className={`p-3 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`} data-magicpath-id="24" data-magicpath-path="AIChatSidebar.tsx">
                <action.icon className="w-4 h-4 mx-auto mb-1" data-magicpath-id="25" data-magicpath-path="AIChatSidebar.tsx" />
                <span data-magicpath-id="26" data-magicpath-path="AIChatSidebar.tsx">{action.label}</span>
              </motion.button>)}
          </div>
        </div>}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200" data-magicpath-id="27" data-magicpath-path="AIChatSidebar.tsx">
        {!hasFile ? <div className="text-center py-8" data-magicpath-id="28" data-magicpath-path="AIChatSidebar.tsx">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4" data-magicpath-id="29" data-magicpath-path="AIChatSidebar.tsx">
              <FileSearch className="w-8 h-8 text-gray-400" data-magicpath-id="30" data-magicpath-path="AIChatSidebar.tsx" />
            </div>
            <p className="text-sm text-gray-500 mb-2" data-magicpath-id="31" data-magicpath-path="AIChatSidebar.tsx">
              <span data-magicpath-id="32" data-magicpath-path="AIChatSidebar.tsx">Upload a PDF credit report to start analyzing</span>
            </p>
          </div> : <div className="space-y-3" data-magicpath-id="33" data-magicpath-path="AIChatSidebar.tsx">
            {/* Suggested Prompts */}
            <div className="flex flex-wrap gap-2" data-magicpath-id="34" data-magicpath-path="AIChatSidebar.tsx">
              {suggestedPrompts.map((prompt, index) => <button key={index} onClick={() => handleSuggestedPrompt(prompt)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors" data-magicpath-id="35" data-magicpath-path="AIChatSidebar.tsx">
                  <span data-magicpath-id="36" data-magicpath-path="AIChatSidebar.tsx">{prompt}</span>
                </button>)}
            </div>

            {/* Input */}
            <div className="relative" data-magicpath-id="37" data-magicpath-path="AIChatSidebar.tsx">
              <textarea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask me anything..." disabled={isAnalyzing} className="w-full p-3 pr-12 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm" rows={1} data-magicpath-id="38" data-magicpath-path="AIChatSidebar.tsx" />
              
              <div className="absolute right-2 bottom-2 flex items-center gap-1" data-magicpath-id="39" data-magicpath-path="AIChatSidebar.tsx">
                <button className="p-1 hover:bg-gray-100 rounded transition-colors" data-magicpath-id="40" data-magicpath-path="AIChatSidebar.tsx">
                  <Edit3 className="w-4 h-4 text-gray-400" data-magicpath-id="41" data-magicpath-path="AIChatSidebar.tsx" />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors" data-magicpath-id="42" data-magicpath-path="AIChatSidebar.tsx">
                  <BookOpen className="w-4 h-4 text-gray-400" data-magicpath-id="43" data-magicpath-path="AIChatSidebar.tsx" />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors" data-magicpath-id="44" data-magicpath-path="AIChatSidebar.tsx">
                  <Sparkles className="w-4 h-4 text-gray-400" />
                </button>
                
                <motion.button whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }} onClick={handleSendMessage} disabled={!inputValue.trim() || isAnalyzing} className="p-1 bg-black text-white rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ml-1" data-magicpath-id="45" data-magicpath-path="AIChatSidebar.tsx">
                  <Send className="w-4 h-4" data-magicpath-id="46" data-magicpath-path="AIChatSidebar.tsx" />
                </motion.button>
              </div>
            </div>
          </div>}
      </div>
    </div>;
};