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
  return <div className="h-screen w-full bg-gray-50 flex overflow-hidden" data-magicpath-id="0" data-magicpath-path="CreditReportAnalyzerApp.tsx">
      {/* Left Sidebar */}
      <AnimatePresence data-magicpath-id="1" data-magicpath-path="CreditReportAnalyzerApp.tsx">
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
      }} className="w-70 bg-white border-r border-gray-200 flex flex-col shadow-sm lg:relative absolute left-0 top-0 bottom-0 z-50" data-magicpath-id="2" data-magicpath-path="CreditReportAnalyzerApp.tsx">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200" data-magicpath-id="3" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              <div className="flex items-center justify-between mb-4" data-magicpath-id="4" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                <div className="flex items-center gap-3" data-magicpath-id="5" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center" data-magicpath-id="6" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                    <FileText className="w-4 h-4 text-white" data-magicpath-id="7" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                  </div>
                  <span className="font-semibold text-gray-900" data-magicpath-id="8" data-magicpath-path="CreditReportAnalyzerApp.tsx">Credit Analyzer</span>
                </div>
                <button onClick={toggleSidebar} className="p-1 hover:bg-gray-100 rounded-lg transition-colors lg:hidden" data-magicpath-id="9" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <X className="w-4 h-4" data-magicpath-id="10" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                </button>
              </div>
              
              <button onClick={() => setActiveView('chat')} className="w-full bg-black text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors" data-magicpath-id="11" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                <MessageSquare className="w-4 h-4" data-magicpath-id="12" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                <span data-magicpath-id="13" data-magicpath-path="CreditReportAnalyzerApp.tsx">New Chat</span>
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-4" data-magicpath-id="14" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              <div className="space-y-1" data-magicpath-id="15" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3" data-magicpath-id="16" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <span data-magicpath-id="17" data-magicpath-path="CreditReportAnalyzerApp.tsx">Workspace</span>
                </h3>
                
                <button onClick={() => setActiveView('welcome')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3 ${activeView === 'welcome' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`} data-magicpath-id="18" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <FileText className="w-4 h-4" data-magicpath-id="19" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                  <span data-magicpath-id="20" data-magicpath-path="CreditReportAnalyzerApp.tsx">New Project</span>
                </button>
                
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3" data-magicpath-id="21" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <AlertTriangle className="w-4 h-4" data-magicpath-id="22" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                  <span data-magicpath-id="23" data-magicpath-path="CreditReportAnalyzerApp.tsx">FCRA Analysis</span>
                </button>
                
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3" data-magicpath-id="24" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <TrendingUp className="w-4 h-4" data-magicpath-id="25" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                  <span data-magicpath-id="26" data-magicpath-path="CreditReportAnalyzerApp.tsx">Collections Review</span>
                </button>
                
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3" data-magicpath-id="27" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <FileSearch className="w-4 h-4" data-magicpath-id="28" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                  <span data-magicpath-id="29" data-magicpath-path="CreditReportAnalyzerApp.tsx">Dispute Analysis</span>
                </button>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="p-4 border-t border-gray-200" data-magicpath-id="30" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3" data-magicpath-id="31" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                <Settings className="w-4 h-4" data-magicpath-id="32" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                <span data-magicpath-id="33" data-magicpath-path="CreditReportAnalyzerApp.tsx">Settings</span>
              </button>
              
              <div className="flex items-center gap-3 mt-4 px-3 py-2" data-magicpath-id="34" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center" data-magicpath-id="35" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <User className="w-4 h-4 text-gray-600" data-magicpath-id="36" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                </div>
                <div className="flex-1 min-w-0" data-magicpath-id="37" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <p className="text-sm font-medium text-gray-900 truncate" data-magicpath-id="38" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                    <span data-magicpath-id="39" data-magicpath-path="CreditReportAnalyzerApp.tsx">Legal Assistant</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col" data-magicpath-id="40" data-magicpath-path="CreditReportAnalyzerApp.tsx">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between" data-magicpath-id="41" data-magicpath-path="CreditReportAnalyzerApp.tsx">
          <div className="flex items-center gap-4" data-magicpath-id="42" data-magicpath-path="CreditReportAnalyzerApp.tsx">
            <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden" data-magicpath-id="43" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              <Menu className="w-5 h-5" data-magicpath-id="44" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
            </button>
            
            <div className="flex items-center gap-3" data-magicpath-id="45" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center" data-magicpath-id="46" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                <span className="text-xs font-bold text-white" data-magicpath-id="47" data-magicpath-path="CreditReportAnalyzerApp.tsx">AI</span>
              </div>
              <span className="text-sm font-medium text-gray-600" data-magicpath-id="48" data-magicpath-path="CreditReportAnalyzerApp.tsx">LEGAL-AI</span>
            </div>
          </div>

          <div className="flex items-center gap-3" data-magicpath-id="49" data-magicpath-path="CreditReportAnalyzerApp.tsx">
            {uploadedFile && <button onClick={handleDownloadProcessedPDF} disabled={isProcessing || !analysisResult} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" data-magicpath-id="50" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" data-magicpath-id="51" data-magicpath-path="CreditReportAnalyzerApp.tsx" /> : <Download className="w-4 h-4" data-magicpath-id="52" data-magicpath-path="CreditReportAnalyzerApp.tsx" />}
                <span data-magicpath-id="53" data-magicpath-path="CreditReportAnalyzerApp.tsx">Download</span>
              </button>}
            
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" data-magicpath-id="54" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              <span className="text-sm font-medium text-gray-600" data-magicpath-id="55" data-magicpath-path="CreditReportAnalyzerApp.tsx">Control</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex" data-magicpath-id="56" data-magicpath-path="CreditReportAnalyzerApp.tsx">
          {/* Main Content */}
          <div className="flex-1 bg-white" data-magicpath-id="57" data-magicpath-path="CreditReportAnalyzerApp.tsx">
            {activeView === 'welcome' && !uploadedFile ? <div className="h-full flex flex-col items-center justify-center p-8" data-magicpath-id="58" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                <div className="max-w-4xl w-full" data-magicpath-id="59" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <div className="text-center mb-12" data-magicpath-id="60" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4" data-magicpath-id="61" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                      <span data-magicpath-id="62" data-magicpath-path="CreditReportAnalyzerApp.tsx">Hi, Legal Professional!</span>
                    </h1>
                    <p className="text-xl text-gray-500" data-magicpath-id="63" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                      <span data-magicpath-id="64" data-magicpath-path="CreditReportAnalyzerApp.tsx">How can I assist you today?</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6" data-magicpath-id="65" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                    {quickAnalysisOptions.map(option => <motion.button key={option.id} whileHover={{
                  scale: 1.02
                }} whileTap={{
                  scale: 0.98
                }} onClick={() => handleQuickAction(option.id)} className="p-6 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left group" data-magicpath-id="66" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                        <div className="flex items-start gap-4" data-magicpath-id="67" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${option.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`} data-magicpath-id="68" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                            <option.icon className="w-6 h-6 text-white" data-magicpath-id="69" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                          </div>
                          <div className="flex-1" data-magicpath-id="70" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                            <h3 className="font-semibold text-gray-900 mb-2" data-magicpath-id="71" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                              <span data-magicpath-id="72" data-magicpath-path="CreditReportAnalyzerApp.tsx">{option.title}</span>
                            </h3>
                            <p className="text-sm text-gray-600" data-magicpath-id="73" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                              <span data-magicpath-id="74" data-magicpath-path="CreditReportAnalyzerApp.tsx">{option.description}</span>
                            </p>
                          </div>
                        </div>
                      </motion.button>)}
                  </div>

                  {/* Bottom Notice */}
                  <div className="mt-12 p-4 bg-green-50 border border-green-200 rounded-lg" data-magicpath-id="75" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                    <div className="flex items-center gap-2" data-magicpath-id="76" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded" data-magicpath-id="77" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                        New
                      </span>
                      <p className="text-sm text-green-800" data-magicpath-id="78" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                        <span data-magicpath-id="79" data-magicpath-path="CreditReportAnalyzerApp.tsx">Bring your docs, code, and files to collaborate with Legal AI and your team.</span>
                      </p>
                    </div>

                    {/* AI Text Area for PDF Upload and Highlighting Requests */}
                    <div className="mt-6 space-y-4" data-magicpath-id="80" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                      <div className="flex items-center gap-3 mb-3" data-magicpath-id="81" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center" data-magicpath-id="82" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                          <Zap className="w-4 h-4 text-white" data-magicpath-id="83" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900" data-magicpath-id="84" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                          <span data-magicpath-id="85" data-magicpath-path="CreditReportAnalyzerApp.tsx">AI Assistant</span>
                        </h3>
                      </div>
                      
                      <div className="relative" data-magicpath-id="86" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                        <textarea placeholder="Upload your PDF and ask me to highlight specific sections, identify FCRA violations, analyze disputed accounts, or any other legal analysis you need..." className="w-full p-4 pr-12 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm leading-relaxed min-h-[100px] placeholder-gray-400" rows={4} data-magicpath-id="87" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                        
                        <div className="absolute right-3 bottom-3 flex items-center gap-2" data-magicpath-id="88" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                          <button onClick={() => setShowUploadModal(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors group" title="Upload PDF" data-magicpath-id="89" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                            <Upload className="w-4 h-4 text-gray-600 group-hover:text-gray-800" data-magicpath-id="90" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                          </button>
                          
                          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium shadow-sm hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2" onClick={() => setActiveView('chat')} data-magicpath-id="91" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                            <MessageSquare className="w-4 h-4" data-magicpath-id="92" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                            <span data-magicpath-id="93" data-magicpath-path="CreditReportAnalyzerApp.tsx">Analyze</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2" data-magicpath-id="94" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                        <button className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-medium transition-colors" data-magicpath-id="95" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                          <span data-magicpath-id="96" data-magicpath-path="CreditReportAnalyzerApp.tsx">Highlight FCRA violations</span>
                        </button>
                        <button className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-full text-xs font-medium transition-colors" data-magicpath-id="97" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                          <span data-magicpath-id="98" data-magicpath-path="CreditReportAnalyzerApp.tsx">Find disputed accounts</span>
                        </button>
                        <button className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-xs font-medium transition-colors" data-magicpath-id="99" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                          <span data-magicpath-id="100" data-magicpath-path="CreditReportAnalyzerApp.tsx">Analyze collections</span>
                        </button>
                        <button className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-full text-xs font-medium transition-colors" data-magicpath-id="101" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                          <span data-magicpath-id="102" data-magicpath-path="CreditReportAnalyzerApp.tsx">Custom request</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div> : <PDFViewer fileUrl={uploadedFile?.url || ''} highlights={analysisResult?.highlights || []} isAnalyzing={isAnalyzing} data-magicpath-id="103" data-magicpath-path="CreditReportAnalyzerApp.tsx" />}
          </div>

          {/* Chat Sidebar */}
          {activeView === 'chat' && <div className="w-96 border-l border-gray-200" data-magicpath-id="104" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              <AIChatSidebar onAnalysisRequest={handleAnalysisRequest} isAnalyzing={isAnalyzing} analysisResult={analysisResult} hasFile={!!uploadedFile} onClose={() => setActiveView('welcome')} data-magicpath-id="105" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
            </div>}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence data-magicpath-id="106" data-magicpath-path="CreditReportAnalyzerApp.tsx">
        {showUploadModal && <PDFUploadModal onFileUpload={handleFileUpload} onClose={() => setShowUploadModal(false)} data-magicpath-id="107" data-magicpath-path="CreditReportAnalyzerApp.tsx" />}
      </AnimatePresence>
    </div>;
};