import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw, Maximize2, Loader2 } from 'lucide-react';
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
interface PDFViewerProps {
  fileUrl: string;
  highlights: Highlight[];
  isAnalyzing: boolean;
}

// @component: PDFViewer
export const PDFViewer = ({
  fileUrl,
  highlights,
  isAnalyzing
}: PDFViewerProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  useEffect(() => {
    if (fileUrl) {
      // Simulate PDF loading
      const timer = setTimeout(() => {
        setIsLoading(false);
        setTotalPages(3); // Mock total pages
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [fileUrl]);
  const handleZoomIn = useCallback(() => {
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex < zoomLevels.length - 1) {
      setZoom(zoomLevels[currentIndex + 1]);
    }
  }, [zoom, zoomLevels]);
  const handleZoomOut = useCallback(() => {
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex > 0) {
      setZoom(zoomLevels[currentIndex - 1]);
    }
  }, [zoom, zoomLevels]);
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);
  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);
  const handlePageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);
  const getHighlightColor = (type: Highlight['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-500/30 border-red-500';
      case 'warning':
        return 'bg-orange-500/30 border-orange-500';
      case 'attention':
        return 'bg-yellow-500/30 border-yellow-500';
      case 'info':
        return 'bg-cyan-500/30 border-cyan-500';
      default:
        return 'bg-blue-500/30 border-blue-500';
    }
  };
  const currentPageHighlights = highlights.filter(h => h.page === currentPage);
  if (!fileUrl) {
    return <div className="flex-1 flex items-center justify-center bg-gray-50" data-magicpath-id="0" data-magicpath-path="PDFViewer.tsx">
        <div className="text-center" data-magicpath-id="1" data-magicpath-path="PDFViewer.tsx">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4" data-magicpath-id="2" data-magicpath-path="PDFViewer.tsx">
            <Loader2 className="w-8 h-8 text-gray-400" data-magicpath-id="3" data-magicpath-path="PDFViewer.tsx" />
          </div>
          <p className="text-gray-500" data-magicpath-id="4" data-magicpath-path="PDFViewer.tsx">
            <span data-magicpath-id="5" data-magicpath-path="PDFViewer.tsx">No PDF uploaded</span>
          </p>
        </div>
      </div>;
  }

  // @return
  return <div className="flex-1 flex flex-col bg-gray-50" data-magicpath-id="6" data-magicpath-path="PDFViewer.tsx">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between" data-magicpath-id="7" data-magicpath-path="PDFViewer.tsx">
        <div className="flex items-center gap-3" data-magicpath-id="8" data-magicpath-path="PDFViewer.tsx">
          {/* Page Navigation */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2" data-magicpath-id="9" data-magicpath-path="PDFViewer.tsx">
            <button onClick={handlePrevPage} disabled={currentPage <= 1} className="p-1 hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" data-magicpath-id="10" data-magicpath-path="PDFViewer.tsx">
              <ChevronLeft className="w-4 h-4" data-magicpath-id="11" data-magicpath-path="PDFViewer.tsx" />
            </button>
            
            <div className="flex items-center gap-2 text-sm" data-magicpath-id="12" data-magicpath-path="PDFViewer.tsx">
              <input type="number" value={currentPage} onChange={handlePageInputChange} min={1} max={totalPages} className="w-12 text-center bg-white border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" data-magicpath-id="13" data-magicpath-path="PDFViewer.tsx" />
              <span className="text-gray-600" data-magicpath-id="14" data-magicpath-path="PDFViewer.tsx">of {totalPages}</span>
            </div>
            
            <button onClick={handleNextPage} disabled={currentPage >= totalPages} className="p-1 hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" data-magicpath-id="15" data-magicpath-path="PDFViewer.tsx">
              <ChevronRight className="w-4 h-4" data-magicpath-id="16" data-magicpath-path="PDFViewer.tsx" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2" data-magicpath-id="17" data-magicpath-path="PDFViewer.tsx">
            <button onClick={handleZoomOut} disabled={zoom <= zoomLevels[0]} className="p-1 hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" data-magicpath-id="18" data-magicpath-path="PDFViewer.tsx">
              <ZoomOut className="w-4 h-4" data-magicpath-id="19" data-magicpath-path="PDFViewer.tsx" />
            </button>
            
            <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center" data-magicpath-id="20" data-magicpath-path="PDFViewer.tsx">
              {Math.round(zoom * 100)}%
            </span>
            
            <button onClick={handleZoomIn} disabled={zoom >= zoomLevels[zoomLevels.length - 1]} className="p-1 hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" data-magicpath-id="21" data-magicpath-path="PDFViewer.tsx">
              <ZoomIn className="w-4 h-4" data-magicpath-id="22" data-magicpath-path="PDFViewer.tsx" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2" data-magicpath-id="23" data-magicpath-path="PDFViewer.tsx">
          <button onClick={handleRotate} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" data-magicpath-id="24" data-magicpath-path="PDFViewer.tsx">
            <RotateCw className="w-4 h-4" data-magicpath-id="25" data-magicpath-path="PDFViewer.tsx" />
          </button>
          
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" data-magicpath-id="26" data-magicpath-path="PDFViewer.tsx">
            <Maximize2 className="w-4 h-4" data-magicpath-id="27" data-magicpath-path="PDFViewer.tsx" />
          </button>
        </div>
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 overflow-auto bg-gray-100" ref={containerRef} data-magicpath-id="28" data-magicpath-path="PDFViewer.tsx">
        <div className="flex items-center justify-center min-h-full p-8" data-magicpath-id="29" data-magicpath-path="PDFViewer.tsx">
          {isLoading ? <div className="flex flex-col items-center gap-4" data-magicpath-id="30" data-magicpath-path="PDFViewer.tsx">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" data-magicpath-id="31" data-magicpath-path="PDFViewer.tsx" />
              <p className="text-gray-600 font-medium" data-magicpath-id="32" data-magicpath-path="PDFViewer.tsx">Loading PDF...</p>
            </div> : <div className="relative" data-magicpath-id="33" data-magicpath-path="PDFViewer.tsx">
              {/* PDF Page Container */}
              <motion.div initial={{
            opacity: 0,
            scale: 0.9
          }} animate={{
            opacity: 1,
            scale: 1
          }} transition={{
            duration: 0.3
          }} className="bg-white shadow-lg rounded-lg overflow-hidden" style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center'
          }} data-magicpath-id="34" data-magicpath-path="PDFViewer.tsx">
                {/* Mock PDF Content */}
                <div className="w-[595px] h-[842px] bg-white p-8 relative" data-magicpath-id="35" data-magicpath-path="PDFViewer.tsx">
                  <div className="space-y-4" data-magicpath-id="36" data-magicpath-path="PDFViewer.tsx">
                    <div className="h-6 bg-gray-800 rounded w-3/4" data-magicpath-id="37" data-magicpath-path="PDFViewer.tsx" />
                    <div className="space-y-2" data-magicpath-id="38" data-magicpath-path="PDFViewer.tsx">
                      <div className="h-4 bg-gray-300 rounded w-full" data-magicpath-id="39" data-magicpath-path="PDFViewer.tsx" />
                      <div className="h-4 bg-gray-300 rounded w-5/6" data-magicpath-id="40" data-magicpath-path="PDFViewer.tsx" />
                      <div className="h-4 bg-gray-300 rounded w-4/5" data-magicpath-id="41" data-magicpath-path="PDFViewer.tsx" />
                    </div>
                    <div className="space-y-2 mt-8" data-magicpath-id="42" data-magicpath-path="PDFViewer.tsx">
                      <div className="h-4 bg-gray-400 rounded w-2/3" data-magicpath-id="43" data-magicpath-path="PDFViewer.tsx" />
                      <div className="h-4 bg-gray-300 rounded w-full" data-magicpath-id="44" data-magicpath-path="PDFViewer.tsx" />
                      <div className="h-4 bg-gray-300 rounded w-3/4" data-magicpath-id="45" data-magicpath-path="PDFViewer.tsx" />
                      <div className="h-4 bg-gray-300 rounded w-5/6" data-magicpath-id="46" data-magicpath-path="PDFViewer.tsx" />
                    </div>
                    <div className="space-y-2 mt-8" data-magicpath-id="47" data-magicpath-path="PDFViewer.tsx">
                      <div className="h-4 bg-gray-400 rounded w-1/2" data-magicpath-id="48" data-magicpath-path="PDFViewer.tsx" />
                      <div className="h-4 bg-gray-300 rounded w-full" data-magicpath-id="49" data-magicpath-path="PDFViewer.tsx" />
                      <div className="h-4 bg-gray-300 rounded w-4/5" data-magicpath-id="50" data-magicpath-path="PDFViewer.tsx" />
                    </div>
                    
                    {/* Credit Report Specific Content */}
                    <div className="mt-12 space-y-6" data-magicpath-id="51" data-magicpath-path="PDFViewer.tsx">
                      <div className="border-t border-gray-200 pt-6" data-magicpath-id="52" data-magicpath-path="PDFViewer.tsx">
                        <div className="h-5 bg-gray-600 rounded w-1/3 mb-4" data-magicpath-id="53" data-magicpath-path="PDFViewer.tsx" />
                        <div className="grid grid-cols-3 gap-4" data-magicpath-id="54" data-magicpath-path="PDFViewer.tsx">
                          <div className="space-y-2" data-magicpath-id="55" data-magicpath-path="PDFViewer.tsx">
                            <div className="h-3 bg-gray-300 rounded w-full" data-magicpath-id="56" data-magicpath-path="PDFViewer.tsx" />
                            <div className="h-3 bg-gray-300 rounded w-3/4" data-magicpath-id="57" data-magicpath-path="PDFViewer.tsx" />
                          </div>
                          <div className="space-y-2" data-magicpath-id="58" data-magicpath-path="PDFViewer.tsx">
                            <div className="h-3 bg-gray-300 rounded w-full" data-magicpath-id="59" data-magicpath-path="PDFViewer.tsx" />
                            <div className="h-3 bg-gray-300 rounded w-2/3" data-magicpath-id="60" data-magicpath-path="PDFViewer.tsx" />
                          </div>
                          <div className="space-y-2" data-magicpath-id="61" data-magicpath-path="PDFViewer.tsx">
                            <div className="h-3 bg-gray-300 rounded w-full" data-magicpath-id="62" data-magicpath-path="PDFViewer.tsx" />
                            <div className="h-3 bg-gray-300 rounded w-4/5" data-magicpath-id="63" data-magicpath-path="PDFViewer.tsx" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-6" data-magicpath-id="64" data-magicpath-path="PDFViewer.tsx">
                        <div className="h-5 bg-gray-600 rounded w-2/5 mb-4" data-magicpath-id="65" data-magicpath-path="PDFViewer.tsx" />
                        <div className="space-y-3" data-magicpath-id="66" data-magicpath-path="PDFViewer.tsx">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded" data-magicpath-id="67" data-magicpath-path="PDFViewer.tsx">
                            <div className="h-3 bg-gray-400 rounded w-1/4" data-magicpath-id="68" data-magicpath-path="PDFViewer.tsx" />
                            <div className="h-3 bg-gray-300 rounded w-1/6" data-magicpath-id="69" data-magicpath-path="PDFViewer.tsx" />
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded" data-magicpath-id="70" data-magicpath-path="PDFViewer.tsx">
                            <div className="h-3 bg-gray-400 rounded w-1/3" data-magicpath-id="71" data-magicpath-path="PDFViewer.tsx" />
                            <div className="h-3 bg-gray-300 rounded w-1/5" data-magicpath-id="72" data-magicpath-path="PDFViewer.tsx" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Highlights Overlay */}
                  {currentPageHighlights.map(highlight => <motion.div key={highlight.id} initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} className={`absolute border-2 cursor-pointer transition-all duration-200 ${getHighlightColor(highlight.type)} ${selectedHighlight === highlight.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`} style={{
                left: highlight.x,
                top: highlight.y,
                width: highlight.width,
                height: highlight.height
              }} onClick={() => setSelectedHighlight(highlight.id)} onMouseEnter={() => setSelectedHighlight(highlight.id)} onMouseLeave={() => setSelectedHighlight(null)} data-magicpath-id="73" data-magicpath-path="PDFViewer.tsx" />)}
                </div>
              </motion.div>

              {/* Analysis Loading Overlay */}
              <AnimatePresence data-magicpath-id="74" data-magicpath-path="PDFViewer.tsx">
                {isAnalyzing && <motion.div initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} exit={{
              opacity: 0
            }} className="absolute inset-0 bg-blue-600/10 backdrop-blur-sm rounded-lg flex items-center justify-center" data-magicpath-id="75" data-magicpath-path="PDFViewer.tsx">
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl flex items-center gap-3" data-magicpath-id="76" data-magicpath-path="PDFViewer.tsx">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" data-magicpath-id="77" data-magicpath-path="PDFViewer.tsx" />
                      <span className="font-medium text-gray-900" data-magicpath-id="78" data-magicpath-path="PDFViewer.tsx">AI Analysis in Progress...</span>
                    </div>
                  </motion.div>}
              </AnimatePresence>
            </div>}
        </div>
      </div>

      {/* Highlight Tooltip */}
      <AnimatePresence data-magicpath-id="79" data-magicpath-path="PDFViewer.tsx">
        {selectedHighlight && <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0,
        y: 10
      }} className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 max-w-sm z-50" data-magicpath-id="80" data-magicpath-path="PDFViewer.tsx">
            {highlights.find(h => h.id === selectedHighlight) && <div data-magicpath-id="81" data-magicpath-path="PDFViewer.tsx">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-2 ${highlights.find(h => h.id === selectedHighlight)?.type === 'critical' ? 'bg-red-100 text-red-800' : highlights.find(h => h.id === selectedHighlight)?.type === 'warning' ? 'bg-orange-100 text-orange-800' : highlights.find(h => h.id === selectedHighlight)?.type === 'attention' ? 'bg-yellow-100 text-yellow-800' : 'bg-cyan-100 text-cyan-800'}`} data-magicpath-id="82" data-magicpath-path="PDFViewer.tsx">
                  <span data-magicpath-id="83" data-magicpath-path="PDFViewer.tsx">{highlights.find(h => h.id === selectedHighlight)?.type.toUpperCase()}</span>
                </div>
                <p className="text-gray-700 text-sm" data-magicpath-id="84" data-magicpath-path="PDFViewer.tsx">
                  <span data-magicpath-id="85" data-magicpath-path="PDFViewer.tsx">{highlights.find(h => h.id === selectedHighlight)?.description}</span>
                </p>
              </div>}
          </motion.div>}
      </AnimatePresence>
    </div>;
};