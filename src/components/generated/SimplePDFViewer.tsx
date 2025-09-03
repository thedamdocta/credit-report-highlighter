import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw, Maximize2, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

interface Highlight {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'critical' | 'warning' | 'attention' | 'info';
  description: string;
}

interface SimplePDFViewerProps {
  fileUrl: string;
  highlights: Highlight[];
  isAnalyzing: boolean;
  pdfFile?: File;
}

export const SimplePDFViewer = ({
  fileUrl,
  highlights,
  isAnalyzing,
  pdfFile
}: SimplePDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reset state when file changes
  useEffect(() => {
    if (pdfFile || fileUrl) {
      setPageNumber(1);
      setNumPages(0);
      setLoadError(null);
      setIsLoading(true);
    }
  }, [pdfFile, fileUrl]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 25, 300));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  }, []);

  const handlePrevPage = useCallback(() => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  }, [pageNumber]);

  const handleNextPage = useCallback(() => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  }, [pageNumber, numPages]);

  const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setLoadError(null);
  }, []);

  const handleDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setIsLoading(false);
    setLoadError('Failed to load PDF. Please try uploading again.');
  }, []);

  const getHighlightColor = (type: Highlight['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-400/40 border-red-500 border-2';
      case 'warning':
        return 'bg-orange-400/40 border-orange-500 border-2';
      case 'attention':
        return 'bg-yellow-400/40 border-yellow-500 border-2';
      case 'info':
      default:
        return 'bg-blue-400/40 border-blue-500 border-2';
    }
  };

  const currentPageHighlights = highlights.filter(h => h.page === pageNumber);

  // Document options with explicit worker configuration
  const documentOptions = useMemo(() => ({
    workerSrc: '/pdf.worker.min.js',
    disableAutoFetch: false,
    disableStream: false,
  }), []);

  if (!fileUrl && !pdfFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">No PDF uploaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Page Navigation */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            <button 
              onClick={handlePrevPage} 
              disabled={pageNumber <= 1} 
              className="p-1 hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2 text-sm">
              <input 
                type="number" 
                value={pageNumber} 
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= numPages) {
                    setPageNumber(page);
                  }
                }}
                min={1} 
                max={numPages} 
                className="w-12 text-center bg-white border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
              />
              <span className="text-gray-600">of {numPages || '...'}</span>
            </div>
            
            <button 
              onClick={handleNextPage} 
              disabled={pageNumber >= numPages} 
              className="p-1 hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            <button 
              onClick={handleZoomOut} 
              disabled={zoomLevel <= 50} 
              className="p-1 hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            
            <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
              {zoomLevel}%
            </span>
            
            <button 
              onClick={handleZoomIn} 
              disabled={zoomLevel >= 300} 
              className="p-1 hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-100">
        <div className="flex justify-center p-8 pb-32">
          <div className="relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.3 }}
              className="bg-white shadow-lg rounded-lg overflow-hidden relative"
            >
              {loadError ? (
                <div className="flex items-center justify-center p-8 min-w-[400px] min-h-[500px]">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Loader2 className="w-8 h-8 text-red-600" />
                    </div>
                    <p className="text-red-600 mb-2">Error loading PDF</p>
                    <p className="text-sm text-gray-500">{loadError}</p>
                  </div>
                </div>
              ) : (
                <Document
                  file={pdfFile || fileUrl}
                  onLoadSuccess={handleDocumentLoadSuccess}
                  onLoadError={handleDocumentLoadError}
                  options={documentOptions}
                  loading={
                    <div className="flex items-center justify-center p-8 min-w-[400px] min-h-[500px]">
                      <div className="flex items-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-2" />
                        <span>Loading PDF...</span>
                      </div>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={zoomLevel / 100}
                    loading={
                      <div className="flex items-center justify-center p-8 min-w-[400px] min-h-[500px]">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      </div>
                    }
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              )}

              {/* Highlights Overlay */}
              {!loadError && (
                <div className="absolute inset-0 pointer-events-none">
                  {currentPageHighlights.map(highlight => (
                    <motion.div 
                      key={highlight.id} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className={`absolute cursor-pointer transition-all duration-200 pointer-events-auto ${getHighlightColor(highlight.type)} ${selectedHighlight === highlight.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`} 
                      style={{
                        left: `${(highlight.x / 595) * 100}%`,
                        top: `${(highlight.y / 842) * 100}%`,
                        width: `${(highlight.width / 595) * 100}%`,
                        height: `${(highlight.height / 842) * 100}%`,
                      }} 
                      onClick={() => setSelectedHighlight(highlight.id)} 
                      onMouseEnter={() => setSelectedHighlight(highlight.id)} 
                      onMouseLeave={() => setSelectedHighlight(null)} 
                    />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Analysis Loading Overlay */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="absolute inset-0 bg-blue-600/10 backdrop-blur-sm rounded-lg flex items-center justify-center"
                >
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl flex items-center gap-3">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <span className="font-medium text-gray-900">AI Analysis in Progress...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Highlight Tooltip */}
      <AnimatePresence>
        {selectedHighlight && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 10 }} 
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 max-w-sm z-50"
          >
            {highlights.find(h => h.id === selectedHighlight) && (
              <div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                  highlights.find(h => h.id === selectedHighlight)?.type === 'critical' ? 'bg-red-100 text-red-800' :
                  highlights.find(h => h.id === selectedHighlight)?.type === 'warning' ? 'bg-orange-100 text-orange-800' :
                  highlights.find(h => h.id === selectedHighlight)?.type === 'attention' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  <span>{highlights.find(h => h.id === selectedHighlight)?.type.toUpperCase()}</span>
                </div>
                <p className="text-gray-700 text-sm">
                  {highlights.find(h => h.id === selectedHighlight)?.description}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
