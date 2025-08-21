import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Download, MessageSquare, Settings, User, Plus, FileSearch, AlertTriangle, TrendingUp, Zap, Menu, X } from 'lucide-react';
import { PDFViewer } from './PDFViewer';
import { AIChatSidebar } from './AIChatSidebar';
import { PDFUploadModal } from './PDFUploadModal';
interface UploadedFile {
  file: File;
  url: string;
  name: string;
  size: number;
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
const quickAnalysisOptions = [{
  id: 'upload-pdf',
  title: 'Upload PDF',
  description: 'Upload credit report for quick processing',
  icon: FileText,
  color: 'from-blue-500 to-blue-600'
}, {
  id: 'fcra-violations',
  title: 'FCRA Violations',
  description: 'Identify Fair Credit Reporting Act violations',
  icon: AlertTriangle,
  color: 'from-red-500 to-red-600'
}, {
  id: 'collections',
  title: 'Collections Analysis',
  description: 'Analyze collection accounts for accuracy',
  icon: TrendingUp,
  color: 'from-orange-500 to-orange-600'
}, {
  id: 'disputed-accounts',
  title: 'Disputed Accounts',
  description: 'Review disputed account markings',
  icon: FileSearch,
  color: 'from-yellow-500 to-yellow-600'
}];

// @component: CreditReportAnalyzerApp
export const CreditReportAnalyzerApp = () => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeView, setActiveView] = useState<'welcome' | 'chat'>('welcome');
  const handleFileUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setUploadedFile({
      file,
      url,
      name: file.name,
      size: file.size
    });
    setShowUploadModal(false);
    setActiveView('chat');
  }, []);
  const handleAnalysisRequest = useCallback(async (prompt: string) => {
    if (!uploadedFile) return;
    setIsAnalyzing(true);

    // Simulate AI analysis
    setTimeout(() => {
      const mockResult: AnalysisResult = {
        highlights: [{
          id: '1',
          page: 1,
          x: 100,
          y: 200,
          width: 300,
          height: 20,
          type: 'critical',
          description: 'Potential FCRA violation detected'
        }, {
          id: '2',
          page: 1,
          x: 150,
          y: 350,
          width: 250,
          height: 18,
          type: 'warning',
          description: 'Disputed account not properly marked'
        }],
        summary: `Analysis complete. Found ${Math.floor(Math.random() * 5) + 1} potential issues in the credit report.`,
        processedPdfUrl: uploadedFile.url
      };
      setAnalysisResult(mockResult);
      setIsAnalyzing(false);
    }, 3000);
  }, [uploadedFile]);
  const handleDownloadProcessedPDF = useCallback(() => {
    if (!analysisResult?.processedPdfUrl) return;
    setIsProcessing(true);

    // Simulate PDF processing
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = analysisResult.processedPdfUrl!;
      link.download = `highlighted_${uploadedFile?.name || 'credit_report.pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsProcessing(false);
    }, 2000);
  }, [analysisResult, uploadedFile]);
  const handleQuickAction = useCallback((actionId: string) => {
    if (actionId === 'upload-pdf') {
      setShowUploadModal(true);
    } else if (uploadedFile) {
      setActiveView('chat');
      // Trigger analysis based on action
      const prompts = {
        'fcra-violations': 'Analyze this credit report for potential Fair Credit Reporting Act (FCRA) violations and highlight any issues.',
        'collections': 'Analyze all collection accounts for accuracy, validation requirements, and potential violations.',
        'disputed-accounts': 'Identify and highlight all disputed accounts and verify they are properly marked according to FCRA requirements.'
      };
      const prompt = prompts[actionId as keyof typeof prompts];
      if (prompt) {
        handleAnalysisRequest(prompt);
      }
    }
  }, [uploadedFile, handleAnalysisRequest]);
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // @return
  return <div className="h-screen w-full bg-gray-50 flex overflow-hidden">
      {/* Left Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && <motion.div initial={{
        x: -280,
        opacity: 0
      }} animate={{
        x: 0,
        opacity: 1
      }} exit={{
        x: -280,
        opacity: 0
      }} transition={{
        type: "spring",
        damping: 25,
        stiffness: 200
      }} className="w-70 bg-white border-r border-gray-200 flex flex-col shadow-sm lg:relative absolute left-0 top-0 bottom-0 z-50">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-gray-900">Credit Analyzer</span>
                </div>
                <button onClick={toggleSidebar} className="p-1 hover:bg-gray-100 rounded-lg transition-colors lg:hidden">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <button onClick={() => setActiveView('chat')} className="w-full bg-black text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span>New Chat</span>
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-4">
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  <span>Workspace</span>
                </h3>
                
                <button onClick={() => setActiveView('welcome')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3 ${activeView === 'welcome' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <FileText className="w-4 h-4" />
                  <span>New Project</span>
                </button>
                
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4" />
                  <span>FCRA Analysis</span>
                </button>
                
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3">
                  <TrendingUp className="w-4 h-4" />
                  <span>Collections Review</span>
                </button>
                
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3">
                  <FileSearch className="w-4 h-4" />
                  <span>Dispute Analysis</span>
                </button>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="p-4 border-t border-gray-200">
              <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
              
              <div className="flex items-center gap-3 mt-4 px-3 py-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    <span>Legal Assistant</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden">
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <span className="text-xs font-bold text-white">AI</span>
              </div>
              <span className="text-sm font-medium text-gray-600">LEGAL-AI</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {uploadedFile && <button onClick={handleDownloadProcessedPDF} disabled={isProcessing || !analysisResult} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Download</span>
              </button>}
            
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="text-sm font-medium text-gray-600">Control</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Main Content */}
          <div className="flex-1 bg-white">
            {activeView === 'welcome' && !uploadedFile ? <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="max-w-4xl w-full">
                  <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                      <span>Hi, Legal Professional!</span>
                    </h1>
                    <p className="text-xl text-gray-500">
                      <span>How can I assist you today?</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {quickAnalysisOptions.map(option => <motion.button key={option.id} whileHover={{
                  scale: 1.02
                }} whileTap={{
                  scale: 0.98
                }} onClick={() => handleQuickAction(option.id)} className="p-6 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left group">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${option.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                            <option.icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2">
                              <span>{option.title}</span>
                            </h3>
                            <p className="text-sm text-gray-600">
                              <span>{option.description}</span>
                            </p>
                          </div>
                        </div>
                      </motion.button>)}
                  </div>

                  {/* Bottom Notice */}
                  <div className="mt-12 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        New
                      </span>
                      <p className="text-sm text-green-800">
                        <span>Bring your docs, code, and files to collaborate with Legal AI and your team.</span>
                      </p>
                    </div>

                    {/* AI Text Area for PDF Upload and Highlighting Requests */}
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          <span>AI Assistant</span>
                        </h3>
                      </div>
                      
                      <div className="relative">
                        <textarea placeholder="Upload your PDF and ask me to highlight specific sections, identify FCRA violations, analyze disputed accounts, or any other legal analysis you need..." className="w-full p-4 pr-12 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm leading-relaxed min-h-[100px] placeholder-gray-400" rows={4} />
                        
                        <div className="absolute right-3 bottom-3 flex items-center gap-2">
                          <button onClick={() => setShowUploadModal(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors group" title="Upload PDF">
                            <Upload className="w-4 h-4 text-gray-600 group-hover:text-gray-800" />
                          </button>
                          
                          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium shadow-sm hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2" onClick={() => setActiveView('chat')}>
                            <MessageSquare className="w-4 h-4" />
                            <span>Analyze</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-medium transition-colors">
                          <span>Highlight FCRA violations</span>
                        </button>
                        <button className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-full text-xs font-medium transition-colors">
                          <span>Find disputed accounts</span>
                        </button>
                        <button className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-xs font-medium transition-colors">
                          <span>Analyze collections</span>
                        </button>
                        <button className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-full text-xs font-medium transition-colors">
                          <span>Custom request</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div> : <PDFViewer fileUrl={uploadedFile?.url || ''} highlights={analysisResult?.highlights || []} isAnalyzing={isAnalyzing} />}
          </div>

          {/* Chat Sidebar */}
          {activeView === 'chat' && <div className="w-96 border-l border-gray-200">
              <AIChatSidebar onAnalysisRequest={handleAnalysisRequest} isAnalyzing={isAnalyzing} analysisResult={analysisResult} hasFile={!!uploadedFile} onClose={() => setActiveView('welcome')} />
            </div>}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && <PDFUploadModal onFileUpload={handleFileUpload} onClose={() => setShowUploadModal(false)} />}
      </AnimatePresence>
    </div>;
};