import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Zap, AlertTriangle, Download, Menu, X } from 'lucide-react';
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

// @component: CreditReportAnalyzerApp
export const CreditReportAnalyzerApp = () => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const handleFileUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setUploadedFile({
      file,
      url,
      name: file.name,
      size: file.size
    });
    setShowUploadModal(false);
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
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // @return
  return <div className="h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col overflow-hidden" data-magicpath-id="0" data-magicpath-path="CreditReportAnalyzerApp.tsx">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-6 py-4 flex items-center justify-between shadow-sm" data-magicpath-id="1" data-magicpath-path="CreditReportAnalyzerApp.tsx">
        <div className="flex items-center gap-3" data-magicpath-id="2" data-magicpath-path="CreditReportAnalyzerApp.tsx">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg" data-magicpath-id="3" data-magicpath-path="CreditReportAnalyzerApp.tsx">
            <FileText className="w-5 h-5 text-white" data-magicpath-id="4" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
          </div>
          <div data-magicpath-id="5" data-magicpath-path="CreditReportAnalyzerApp.tsx">
            <h1 className="text-xl font-bold text-slate-900" data-magicpath-id="6" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              <span data-magicpath-id="7" data-magicpath-path="CreditReportAnalyzerApp.tsx">Credit Report Analyzer</span>
            </h1>
            <p className="text-sm text-slate-600" data-magicpath-id="8" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              <span data-magicpath-id="9" data-magicpath-path="CreditReportAnalyzerApp.tsx">AI-Powered Legal Analysis</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3" data-magicpath-id="10" data-magicpath-path="CreditReportAnalyzerApp.tsx">
          {uploadedFile && <motion.button whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} onClick={handleDownloadProcessedPDF} disabled={isProcessing || !analysisResult} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" data-magicpath-id="11" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" data-magicpath-id="12" data-magicpath-path="CreditReportAnalyzerApp.tsx" /> : <Download className="w-4 h-4" data-magicpath-id="13" data-magicpath-path="CreditReportAnalyzerApp.tsx" />}
              <span data-magicpath-id="14" data-magicpath-path="CreditReportAnalyzerApp.tsx">Download Highlighted PDF</span>
            </motion.button>}
          
          <button onClick={toggleSidebar} className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200 lg:hidden" data-magicpath-id="15" data-magicpath-path="CreditReportAnalyzerApp.tsx">
            {isSidebarOpen ? <X className="w-5 h-5" data-magicpath-id="16" data-magicpath-path="CreditReportAnalyzerApp.tsx" /> : <Menu className="w-5 h-5" data-magicpath-id="17" data-magicpath-path="CreditReportAnalyzerApp.tsx" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden" data-magicpath-id="18" data-magicpath-path="CreditReportAnalyzerApp.tsx">
        {/* PDF Viewer Area */}
        <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-sm" data-magicpath-id="19" data-magicpath-path="CreditReportAnalyzerApp.tsx">
          {uploadedFile ? <PDFViewer fileUrl={uploadedFile.url} highlights={analysisResult?.highlights || []} isAnalyzing={isAnalyzing} data-magicpath-id="20" data-magicpath-path="CreditReportAnalyzerApp.tsx" /> : <div className="flex-1 flex items-center justify-center" data-magicpath-id="21" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              <div className="text-center max-w-md mx-auto px-6" data-magicpath-id="22" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg" data-magicpath-id="23" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <Upload className="w-12 h-12 text-blue-600" data-magicpath-id="24" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3" data-magicpath-id="25" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <span data-magicpath-id="26" data-magicpath-path="CreditReportAnalyzerApp.tsx">Upload Credit Report</span>
                </h2>
                <p className="text-slate-600 mb-6" data-magicpath-id="27" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <span data-magicpath-id="28" data-magicpath-path="CreditReportAnalyzerApp.tsx">Upload your PDF credit report to begin AI-powered legal analysis and highlighting</span>
                </p>
                <motion.button whileHover={{
              scale: 1.02
            }} whileTap={{
              scale: 0.98
            }} onClick={() => setShowUploadModal(true)} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 mx-auto" data-magicpath-id="29" data-magicpath-path="CreditReportAnalyzerApp.tsx">
                  <Upload className="w-5 h-5" data-magicpath-id="30" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
                  <span data-magicpath-id="31" data-magicpath-path="CreditReportAnalyzerApp.tsx">Choose File</span>
                </motion.button>
              </div>
            </div>}
        </div>

        {/* AI Chat Sidebar */}
        <AnimatePresence data-magicpath-id="32" data-magicpath-path="CreditReportAnalyzerApp.tsx">
          {isSidebarOpen && <motion.div initial={{
          x: 400,
          opacity: 0
        }} animate={{
          x: 0,
          opacity: 1
        }} exit={{
          x: 400,
          opacity: 0
        }} transition={{
          type: "spring",
          damping: 25,
          stiffness: 200
        }} className="w-96 bg-white/90 backdrop-blur-sm border-l border-slate-200/60 shadow-2xl lg:relative absolute right-0 top-0 bottom-0 z-50" data-magicpath-id="33" data-magicpath-path="CreditReportAnalyzerApp.tsx">
              <AIChatSidebar onAnalysisRequest={handleAnalysisRequest} isAnalyzing={isAnalyzing} analysisResult={analysisResult} hasFile={!!uploadedFile} onClose={() => setIsSidebarOpen(false)} data-magicpath-id="34" data-magicpath-path="CreditReportAnalyzerApp.tsx" />
            </motion.div>}
        </AnimatePresence>
      </div>

      {/* Upload Modal */}
      <AnimatePresence data-magicpath-id="35" data-magicpath-path="CreditReportAnalyzerApp.tsx">
        {showUploadModal && <PDFUploadModal onFileUpload={handleFileUpload} onClose={() => setShowUploadModal(false)} data-magicpath-id="36" data-magicpath-path="CreditReportAnalyzerApp.tsx" />}
      </AnimatePresence>
    </div>;
};