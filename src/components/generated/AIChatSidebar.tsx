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
  return <div className="h-full flex flex-col bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => <motion.div key={message.id} initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.type === 'ai' && <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>}
            
            <div className={`max-w-[85%] ${message.type === 'user' ? 'order-first' : ''}`}>
              <div className={`p-3 rounded-2xl ${message.type === 'user' ? 'bg-black text-white ml-auto' : 'bg-gray-100 text-gray-900'}`}>
                <p className="text-sm leading-relaxed">
                  <span>{message.content}</span>
                </p>
              </div>
              <p className={`text-xs text-gray-500 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                <span>{formatTime(message.timestamp)}</span>
              </p>
            </div>

            {message.type === 'user' && <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>}
          </motion.div>)}

        {/* Analyzing Indicator */}
        <AnimatePresence>
          {isAnalyzing && <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -20
        }} className="flex gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-gray-600">Analyzing credit report...</span>
                </div>
              </div>
            </motion.div>}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {hasFile && <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickActions.map(action => <motion.button key={action.id} whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} onClick={() => handleQuickAction(action)} disabled={isAnalyzing} className={`p-3 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`}>
                <action.icon className="w-4 h-4 mx-auto mb-1" />
                <span>{action.label}</span>
              </motion.button>)}
          </div>
        </div>}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        {!hasFile ? <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSearch className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-2">
              <span>Upload a PDF credit report to start analyzing</span>
            </p>
          </div> : <div className="space-y-3">
            {/* Suggested Prompts */}
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt, index) => <button key={index} onClick={() => handleSuggestedPrompt(prompt)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors">
                  <span>{prompt}</span>
                </button>)}
            </div>

            {/* Input */}
            <div className="relative">
              <textarea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask me anything..." disabled={isAnalyzing} className="w-full p-3 pr-12 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm" rows={1} />
              
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Edit3 className="w-4 h-4 text-gray-400" />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Sparkles className="w-4 h-4 text-gray-400" />
                </button>
                
                <motion.button whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }} onClick={handleSendMessage} disabled={!inputValue.trim() || isAnalyzing} className="p-1 bg-black text-white rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ml-1">
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>}
      </div>
    </div>;
};