import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, Loader2, RotateCcw } from 'lucide-react';
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

interface SideBySidePDFViewerProps {
  originalFileUrl: string;
  highlightedFileUrl: string;
  highlights: Highlight[];
  isAnalyzing: boolean;
  originalFile?: File;
  highlightedFile?: File;
  onDownloadHighlighted: () => void;
  onBackToSingle?: () => void;
}

export const SideBySidePDFViewer = ({
  originalFileUrl,
  highlightedFileUrl,
  highlights,
  isAnalyzing,
  originalFile,
  highlightedFile,
  onDownloadHighlighted,
  onBackToSingle
}: SideBySidePDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState(60); // Smaller default zoom for side-by-side
  const [displayZoom, setDisplayZoom] = useState(75);
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reset state when files change
  useEffect(() => {
    if (originalFile || originalFileUrl) {
      setPageNumber(1);
      setNumPages(0);
      setLoadError(null);
      setIsLoading(true);
    }
  }, [originalFile, originalFileUrl, highlightedFile, highlightedFileUrl]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 15, 200)); // Smaller zoom increments
    setDisplayZoom(prev => Math.min(prev + 15, 250));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 15, 30)); // Smaller zoom decrements
    setDisplayZoom(prev => Math.max(prev - 15, 40));
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
    setLoadError('Failed to load PDF. Please try again.');
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

  if (!originalFileUrl && !originalFile) {
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar with Download Button */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 pl-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Back to single view */}
          {onBackToSingle && (
            <button
              onClick={onBackToSingle}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors mr-2"
              title="Back to single view"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Page Navigation */}
          <div className="flex items-center gap-1 px-2 py-1">
            <button 
              onClick={handlePrevPage} 
              disabled={pageNumber <= 1} 
              className="p-0.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            
            <div className="flex items-center gap-1 text-xs">
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
                className="w-8 text-center bg-white border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" 
              />
              <span className="text-gray-600">of {numPages || '...'}</span>
            </div>
            
            <button 
              onClick={handleNextPage} 
              disabled={pageNumber >= numPages} 
              className="p-0.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 px-2 py-1">
            <button 
              onClick={handleZoomOut} 
              disabled={displayZoom <= 40} 
              className="p-0.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            
            <span className="text-xs font-medium text-gray-700 min-w-[2rem] text-center">
              {displayZoom}%
            </span>
            
            <button 
              onClick={handleZoomIn} 
              disabled={displayZoom >= 250} 
              className="p-0.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Download Button */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-600">
            Found {highlights.length} issues
          </div>
          <button
            onClick={onDownloadHighlighted}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Highlighted PDF
          </button>
        </div>
      </div>

      {/* Side-by-side PDF Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-100 relative">
        <div className="absolute inset-0 flex justify-center p-4 pb-96 overflow-y-auto">
          <div className="flex gap-6 w-full max-w-none">
            {/* Original PDF */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-700 mb-2 text-center">Original Report</h3>
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ duration: 0.3 }}
                className="bg-white shadow-lg rounded-lg overflow-hidden relative"
              >
                {loadError ? (
                  <div className="flex items-center justify-center p-8 min-w-[300px] min-h-[400px]">
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
                    file={originalFile || originalFileUrl}
                    onLoadSuccess={handleDocumentLoadSuccess}
                    onLoadError={handleDocumentLoadError}
                    options={documentOptions}
                    loading={
                      <div className="flex items-center justify-center p-8 min-w-[300px] min-h-[400px]">
                        <div className="flex items-center">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-2" />
                          <span>Loading Original...</span>
                        </div>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={zoomLevel / 100}
                      loading={
                        <div className="flex items-center justify-center p-8 min-w-[300px] min-h-[400px]">
                          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        </div>
                      }
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                )}
              </motion.div>
            </div>

            {/* Highlighted PDF */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-700 mb-2 text-center">AI Analysis Results</h3>
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-white shadow-lg rounded-lg overflow-hidden relative ring-2 ring-green-200"
              >
                {highlightedFileUrl || highlightedFile ? (
                  <Document
                    file={highlightedFile || highlightedFileUrl}
                    onLoadSuccess={(data) => console.log('Highlighted PDF loaded', data)}
                    onLoadError={(error) => console.error('Highlighted PDF error:', error)}
                    options={documentOptions}
                    loading={
                      <div className="flex items-center justify-center p-8 min-w-[300px] min-h-[400px]">
                        <div className="flex items-center">
                          <Loader2 className="w-8 h-8 text-green-600 animate-spin mr-2" />
                          <span>Loading Analysis...</span>
                        </div>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={zoomLevel / 100}
                      loading={
                        <div className="flex items-center justify-center p-8 min-w-[300px] min-h-[400px]">
                          <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                        </div>
                      }
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                ) : (
                  <div className="flex items-center justify-center p-8 min-w-[300px] min-h-[400px]">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-2" />
                      <p className="text-gray-600">Generating highlighted PDF...</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Highlight Tooltip - only show if there are overlay highlights */}
      <AnimatePresence>
        {selectedHighlight && currentPageHighlights.length > 0 && (
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