import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Download, MessageSquare, Settings, User, Plus, FileSearch, AlertTriangle, TrendingUp, Zap, Menu, X, Loader2 } from 'lucide-react';
import { pdfjs } from 'react-pdf';

// Import components
import { SimplePDFViewer } from './SimplePDFViewer';
import { SideBySidePDFViewer } from './SideBySidePDFViewer';
import { PDFUploadModal } from './PDFUploadModal';
import { AIInputWithSearch } from '../ui/ai-input-with-search';
import { VercelV0Chat } from '../ui/v0-ai-chat';
import FileUpload from '../ui/file-upload';
import { usePDFProcessing } from '../../hooks/usePDFProcessing';
import { PyMuPDFHighlightService } from '../../services/pymuPdfHighlighter';
import { SettingsModal } from './SettingsModal';

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
}];

// @component: CreditReportAnalyzerApp
export const CreditReportAnalyzerApp = () => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'welcome' | 'chat'>('welcome');
  const [isDownloading, setIsDownloading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // New state for enhanced PDF viewing
  const [highlightedPdfUrl, setHighlightedPdfUrl] = useState<string | null>(null);
  const [highlightedPdfFile, setHighlightedPdfFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'side-by-side'>('single');
  const [isGeneratingHighlightedPDF, setIsGeneratingHighlightedPDF] = useState(false);

  // Use the PDF processing hook
  const {
    isProcessing,
    isAnalyzing,
    processingStatus,
    pdfDocument,
    analysisResult: realAnalysisResult,
    error,
    processPDF,
    analyzePDF,
  } = usePDFProcessing();

  // Update analysis result when real analysis completes
  useEffect(() => {
    if (realAnalysisResult) {
      const highlights = realAnalysisResult.issues?.map((issue: any) => ({
        id: issue.id,
        page: issue.pageNumber,
        x: issue.coordinates?.x || 100,
        y: issue.coordinates?.y || 200,
        width: issue.coordinates?.width || 300,
        height: issue.coordinates?.height || 20,
        type: issue.type,
        description: issue.description,
      })) || [];

      setAnalysisResult({
        highlights,
        summary: realAnalysisResult.summary,
        processedPdfUrl: uploadedFile?.url,
      });
    }
  }, [realAnalysisResult, uploadedFile]);

  // Generate highlighted PDF after analysis completes
  useEffect(() => {
    if (analysisResult?.highlights && analysisResult.highlights.length > 0 && uploadedFile && !highlightedPdfUrl) {
      generateHighlightedPDF();
    }
  }, [analysisResult, uploadedFile, highlightedPdfUrl]);

  const generateHighlightedPDF = useCallback(async () => {
    if (!analysisResult?.highlights || !uploadedFile) return;

    setIsGeneratingHighlightedPDF(true);
    try {
      console.log('🎨 Generating highlighted PDF with PyMuPDF high-precision highlighting...');
      
      const pymupdfHighlighter = new PyMuPDFHighlightService();
      
      // Convert issues to the expected format for PyMuPDF
      const enhancedIssues = analysisResult.highlights.map(h => ({
        id: h.id,
        type: h.type,
        category: 'other' as const,
        description: h.description,
        severity: 'medium' as const,
        pageNumber: h.page,
        anchorText: h.description,
        coordinates: { x: h.x, y: h.y, width: h.width, height: h.height },
        recommendedAction: h.description
      }));
      
      const result = await pymupdfHighlighter.highlightIssues(
        uploadedFile.file,
        enhancedIssues
      );
      
      if (!result.success || !result.highlightedFile) {
        throw new Error('PyMuPDF highlighting failed: ' + (result.error || 'Unknown error'));
      }
      
      const highlightedPdfArrayBuffer = await result.highlightedFile.arrayBuffer();
      const highlightedPdfBytes = new Uint8Array(highlightedPdfArrayBuffer);
      
      // Create a new File and URL for the highlighted PDF
      const highlightedBlob = new Blob([highlightedPdfBytes], { type: 'application/pdf' });
      const highlightedFile = new File([highlightedBlob], `highlighted_${uploadedFile.name}`, { type: 'application/pdf' });
      const highlightedUrl = URL.createObjectURL(highlightedBlob);
      
      setHighlightedPdfFile(highlightedFile);
      setHighlightedPdfUrl(highlightedUrl);
      
      // Switch to side-by-side view after generating
      setTimeout(() => {
        setViewMode('side-by-side');
      }, 1000);
      
      console.log('✅ Highlighted PDF generated successfully!');
    } catch (error) {
      console.error('❌ Error generating highlighted PDF:', error);
    } finally {
      setIsGeneratingHighlightedPDF(false);
    }
  }, [analysisResult, uploadedFile]);


  // Keep sidebar closed when PDF is uploaded
  useEffect(() => {
    if (uploadedFile) {
      setIsSidebarOpen(false);
    }
  }, [uploadedFile]);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      // Close sidebar immediately and wait for state to update
      setIsSidebarOpen(false);
      setShowUploadModal(false);
      setActiveView('chat');
      
      // Reset highlighted PDF state for new upload
      if (highlightedPdfUrl) {
        URL.revokeObjectURL(highlightedPdfUrl);
      }
      setHighlightedPdfUrl(null);
      setHighlightedPdfFile(null);
      setViewMode('single');
      setAnalysisResult(null);
      
      // Longer delay to ensure sidebar close animation fully completes before PDF loads
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const url = URL.createObjectURL(file);
      setUploadedFile({
        file,
        url,
        name: file.name,
        size: file.size
      });

      // Process the PDF with real functionality
      await processPDF(file);
    } catch (error) {
      console.error('PDF upload/processing error:', error);
      // You could show an error message to the user here
    }
  }, [processPDF, highlightedPdfUrl]);

  const handleAnalysisRequest = useCallback(async (prompt: string) => {
    if (!uploadedFile || !pdfDocument) {
      console.warn('No PDF uploaded or processed yet');
      return;
    }

    try {
      // Always use late chunking for credit reports to ensure comprehensive error detection
      let analysisType: 'full' | 'fcra' | 'collections' | 'disputes' | 'custom' | 'late_chunking' = 'late_chunking';
      const lowerPrompt = prompt.toLowerCase();
      
      // Override with specific analysis types only if explicitly requested
      if (lowerPrompt.includes('fcra') && !lowerPrompt.includes('late chunking')) analysisType = 'fcra';
      else if (lowerPrompt.includes('collection') && !lowerPrompt.includes('late chunking')) analysisType = 'collections';
      else if (lowerPrompt.includes('dispute') && !lowerPrompt.includes('late chunking')) analysisType = 'disputes';
      else if (prompt !== 'full' && !lowerPrompt.includes('late chunking') && lowerPrompt.includes('custom')) analysisType = 'custom';

      // Perform real AI analysis
      await analyzePDF(analysisType, prompt);
    } catch (error) {
      console.error('Analysis error:', error);
      // You could show an error message to the user here
    }
  }, [uploadedFile, pdfDocument, analyzePDF]);

  const handleDownloadProcessedPDF = useCallback(async () => {
    if (!analysisResult?.highlights || !uploadedFile) return;

    setIsDownloading(true);
    try {
      console.log('💾 Downloading highlighted PDF...');
      
      if (highlightedPdfFile) {
        // Download the already generated highlighted PDF
        const pdfBytes = await highlightedPdfFile.arrayBuffer();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `highlighted_${uploadedFile.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Generate and download using PyMuPDF if not already generated
        const pymupdfHighlighter = new PyMuPDFHighlightService();
        
        const enhancedIssues = analysisResult.highlights.map(h => ({
          id: h.id,
          type: h.type,
          category: 'other' as const,
          description: h.description,
          severity: 'medium' as const,
          pageNumber: h.page,
          anchorText: h.description,
          coordinates: { x: h.x, y: h.y, width: h.width, height: h.height },
          recommendedAction: h.description
        }));
        
        const result = await pymupdfHighlighter.highlightIssues(
          uploadedFile.file,
          enhancedIssues
        );
        
        if (result.success && result.highlightedFile) {
          const pdfBytes = await result.highlightedFile.arrayBuffer();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `highlighted_${uploadedFile.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          throw new Error('Failed to generate highlighted PDF for download');
        }
      }
      
      console.log('✅ Download initiated successfully!');
    } catch (error) {
      console.error('❌ Error downloading highlighted PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [analysisResult, uploadedFile, highlightedPdfFile]);

  const handleQuickAction = useCallback((actionId: string) => {
    if (actionId === 'upload-pdf') {
      setShowUploadModal(true);
    } else if (uploadedFile && pdfDocument) {
      setActiveView('chat');
      // Trigger analysis based on action
      const prompts: Record<string, string> = {
        'fcra-violations': 'Analyze this credit report for potential Fair Credit Reporting Act (FCRA) violations and highlight any issues.',
        'collections': 'Analyze all collection accounts for accuracy, validation requirements, and potential violations.',
        'disputed-accounts': 'Identify and highlight all disputed accounts and verify they are properly marked according to FCRA requirements.'
      };
      const prompt = prompts[actionId];
      if (prompt) {
        handleAnalysisRequest(prompt);
      }
    }
  }, [uploadedFile, pdfDocument, handleAnalysisRequest]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (uploadedFile?.url) {
        URL.revokeObjectURL(uploadedFile.url);
      }
      if (highlightedPdfUrl) {
        URL.revokeObjectURL(highlightedPdfUrl);
      }
    };
  }, [uploadedFile, highlightedPdfUrl]);

  return (
    <div className="h-screen w-full bg-gray-50 flex overflow-hidden">
      {/* Left Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ x: -280, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: -280, opacity: 0 }} 
            transition={{ type: "spring", damping: 25, stiffness: 200 }} 
            className="w-70 bg-white border-r border-gray-200 flex flex-col shadow-sm absolute left-0 top-0 bottom-0 z-50"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span className="font-semibold text-sm text-gray-900">Credit Report PDF Highlighter</span>
                </div>
                <button 
                  onClick={toggleSidebar} 
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <button 
                onClick={() => setActiveView('chat')} 
                className="w-full bg-black text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors"
              >
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
                
                <button 
                  onClick={() => setActiveView('welcome')} 
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                    activeView === 'welcome' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>New Project</span>
                </button>
                
                <button 
                  onClick={() => handleQuickAction('fcra-violations')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>FCRA Analysis</span>
                </button>
                
                <button 
                  onClick={() => handleQuickAction('collections')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Collections Review</span>
                </button>
                
                <button 
                  onClick={() => handleQuickAction('disputed-accounts')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <FileSearch className="w-4 h-4" />
                  <span>Dispute Analysis</span>
                </button>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="p-4 border-t border-gray-200">
              <button 
                onClick={() => setSettingsOpen(true)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu Button (when sidebar is hidden) */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-3 left-2 z-40 p-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
        >
          <Menu className="w-3 h-3" />
        </button>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Main Content */}
        <div className="flex-1 bg-white">
          {activeView === 'welcome' && !uploadedFile ? (
            <div className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
              <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    <span>Highlight Your Credit Report</span>
                  </h1>
                  <p className="text-xl text-gray-500">
                    <span>Upload Your Report</span>
                  </p>
                </div>

                <FileUpload onFileUpload={handleFileUpload} />

                <VercelV0Chat 
                  onAnalysisRequest={handleAnalysisRequest}
                  canAnalyze={!!uploadedFile && !!pdfDocument}
                />
              </div>
            </div>
          ) : (
            // Conditionally show single or side-by-side view
            viewMode === 'side-by-side' && highlightedPdfUrl ? (
              <SideBySidePDFViewer
                originalFileUrl={uploadedFile?.url || ''}
                highlightedFileUrl={highlightedPdfUrl}
                highlights={analysisResult?.highlights || []}
                isAnalyzing={isAnalyzing || isGeneratingHighlightedPDF}
                originalFile={uploadedFile?.file}
                highlightedFile={highlightedPdfFile || undefined}
                onDownloadHighlighted={handleDownloadProcessedPDF}
                onBackToSingle={() => setViewMode('single')}
              />
            ) : (
              <SimplePDFViewer 
                fileUrl={uploadedFile?.url || ''} 
                highlights={analysisResult?.highlights || []} 
                isAnalyzing={isAnalyzing || isGeneratingHighlightedPDF}
                pdfFile={uploadedFile?.file}
                onDownloadHighlighted={analysisResult?.highlights?.length ? handleDownloadProcessedPDF : undefined}
                isDownloading={isDownloading}
              />
            )
          )}
        </div>

        {/* Bottom Chat Section - only show when PDF is uploaded */}
        {uploadedFile && (
          <div className="absolute bottom-0 left-0 right-0 bg-transparent">
            {/* Analysis Status */}
            {analysisResult?.highlights && analysisResult.highlights.length > 0 && viewMode === 'single' && highlightedPdfUrl && (
              <div className="px-4 py-2 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">
                    Analysis Complete - {analysisResult.highlights.length} issues found
                  </span>
                  <button
                    onClick={() => setViewMode('side-by-side')}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-full transition-colors"
                  >
                    View Comparison
                  </button>
                </div>
              </div>
            )}
            
            <div className="p-4">
              <VercelV0Chat 
                onAnalysisRequest={handleAnalysisRequest}
                canAnalyze={!!uploadedFile && !!pdfDocument}
              />
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <PDFUploadModal 
            onFileUpload={handleFileUpload} 
            onClose={() => setShowUploadModal(false)} 
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Error: {error}</span>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-50">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing PDF... ({typeof processingStatus === 'string' ? processingStatus : processingStatus?.status || 'Processing...'})</span>
          </div>
        </div>
      )}
    </div>
  );
};
