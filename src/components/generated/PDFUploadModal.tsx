import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
interface PDFUploadModalProps {
  onFileUpload: (file: File) => void;
  onClose: () => void;
}

// @component: PDFUploadModal
export const PDFUploadModal = ({
  onFileUpload,
  onClose
}: PDFUploadModalProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validateFile = useCallback((file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Please select a PDF file only.';
    }
    if (file.size > 50 * 1024 * 1024) {
      // 50MB limit
      return 'File size must be less than 50MB.';
    }
    return null;
  }, []);
  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 20;
      });
    }, 200);

    // Simulate upload delay
    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        onFileUpload(file);
        setIsUploading(false);
      }, 500);
    }, 2000);
  }, [validateFile, onFileUpload]);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isUploading) {
      onClose();
    }
  }, [onClose, isUploading]);

  // @return
  return <motion.div initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} exit={{
    opacity: 0
  }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={handleBackdropClick} data-magicpath-id="0" data-magicpath-path="PDFUploadModal.tsx">
      <motion.div initial={{
      scale: 0.9,
      opacity: 0
    }} animate={{
      scale: 1,
      opacity: 1
    }} exit={{
      scale: 0.9,
      opacity: 0
    }} transition={{
      type: "spring",
      damping: 25,
      stiffness: 300
    }} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" data-magicpath-id="1" data-magicpath-path="PDFUploadModal.tsx">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50" data-magicpath-id="2" data-magicpath-path="PDFUploadModal.tsx">
          <div className="flex items-center justify-between" data-magicpath-id="3" data-magicpath-path="PDFUploadModal.tsx">
            <div className="flex items-center gap-3" data-magicpath-id="4" data-magicpath-path="PDFUploadModal.tsx">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center" data-magicpath-id="5" data-magicpath-path="PDFUploadModal.tsx">
                <FileText className="w-5 h-5 text-white" data-magicpath-id="6" data-magicpath-path="PDFUploadModal.tsx" />
              </div>
              <div data-magicpath-id="7" data-magicpath-path="PDFUploadModal.tsx">
                <h2 className="text-xl font-bold text-slate-900" data-magicpath-id="8" data-magicpath-path="PDFUploadModal.tsx">
                  <span data-magicpath-id="9" data-magicpath-path="PDFUploadModal.tsx">Upload Credit Report</span>
                </h2>
                <p className="text-sm text-slate-600" data-magicpath-id="10" data-magicpath-path="PDFUploadModal.tsx">
                  <span data-magicpath-id="11" data-magicpath-path="PDFUploadModal.tsx">Select a PDF file to begin analysis</span>
                </p>
              </div>
            </div>
            {!isUploading && <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors" data-magicpath-id="12" data-magicpath-path="PDFUploadModal.tsx">
                <X className="w-5 h-5 text-slate-500" data-magicpath-id="13" data-magicpath-path="PDFUploadModal.tsx" />
              </button>}
          </div>
        </div>

        {/* Content */}
        <div className="p-6" data-magicpath-id="14" data-magicpath-path="PDFUploadModal.tsx">
          {!isUploading ? <div data-magicpath-id="15" data-magicpath-path="PDFUploadModal.tsx">
              {/* Drop Zone */}
              <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${isDragOver ? 'border-blue-500 bg-blue-50' : error ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'}`} onClick={handleBrowseClick} data-magicpath-id="16" data-magicpath-path="PDFUploadModal.tsx">
                <div className="flex flex-col items-center gap-4" data-magicpath-id="17" data-magicpath-path="PDFUploadModal.tsx">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDragOver ? 'bg-blue-100' : error ? 'bg-red-100' : 'bg-slate-100'}`} data-magicpath-id="18" data-magicpath-path="PDFUploadModal.tsx">
                    {error ? <AlertCircle className="w-8 h-8 text-red-500" data-magicpath-id="19" data-magicpath-path="PDFUploadModal.tsx" /> : <Upload className={`w-8 h-8 ${isDragOver ? 'text-blue-600' : 'text-slate-500'}`} data-magicpath-id="20" data-magicpath-path="PDFUploadModal.tsx" />}
                  </div>
                  
                  <div data-magicpath-id="21" data-magicpath-path="PDFUploadModal.tsx">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2" data-magicpath-id="22" data-magicpath-path="PDFUploadModal.tsx">
                      <span data-magicpath-id="23" data-magicpath-path="PDFUploadModal.tsx">{isDragOver ? 'Drop your PDF here' : 'Drag & drop your PDF'}</span>
                    </h3>
                    <p className="text-slate-600 mb-4" data-magicpath-id="24" data-magicpath-path="PDFUploadModal.tsx">
                      <span data-magicpath-id="25" data-magicpath-path="PDFUploadModal.tsx">or click to browse files</span>
                    </p>
                    
                    <motion.button whileHover={{
                  scale: 1.02
                }} whileTap={{
                  scale: 0.98
                }} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200" data-magicpath-id="26" data-magicpath-path="PDFUploadModal.tsx">
                      <span data-magicpath-id="27" data-magicpath-path="PDFUploadModal.tsx">Choose File</span>
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* File Requirements */}
              <div className="mt-6 p-4 bg-slate-50 rounded-lg" data-magicpath-id="28" data-magicpath-path="PDFUploadModal.tsx">
                <h4 className="font-medium text-slate-900 mb-2" data-magicpath-id="29" data-magicpath-path="PDFUploadModal.tsx">
                  <span data-magicpath-id="30" data-magicpath-path="PDFUploadModal.tsx">File Requirements:</span>
                </h4>
                <ul className="text-sm text-slate-600 space-y-1" data-magicpath-id="31" data-magicpath-path="PDFUploadModal.tsx">
                  <li className="flex items-center gap-2" data-magicpath-id="32" data-magicpath-path="PDFUploadModal.tsx">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" data-magicpath-id="33" data-magicpath-path="PDFUploadModal.tsx" />
                    <span data-magicpath-id="34" data-magicpath-path="PDFUploadModal.tsx">PDF format only</span>
                  </li>
                  <li className="flex items-center gap-2" data-magicpath-id="35" data-magicpath-path="PDFUploadModal.tsx">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" data-magicpath-id="36" data-magicpath-path="PDFUploadModal.tsx" />
                    <span data-magicpath-id="37" data-magicpath-path="PDFUploadModal.tsx">Maximum file size: 50MB</span>
                  </li>
                  <li className="flex items-center gap-2" data-magicpath-id="38" data-magicpath-path="PDFUploadModal.tsx">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" data-magicpath-id="39" data-magicpath-path="PDFUploadModal.tsx" />
                    <span data-magicpath-id="40" data-magicpath-path="PDFUploadModal.tsx">Credit reports from major bureaus supported</span>
                  </li>
                </ul>
              </div>

              {/* Error Message */}
              <AnimatePresence data-magicpath-id="41" data-magicpath-path="PDFUploadModal.tsx">
                {error && <motion.div initial={{
              opacity: 0,
              y: -10
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              y: -10
            }} className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3" data-magicpath-id="42" data-magicpath-path="PDFUploadModal.tsx">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" data-magicpath-id="43" data-magicpath-path="PDFUploadModal.tsx" />
                    <p className="text-red-700 text-sm" data-magicpath-id="44" data-magicpath-path="PDFUploadModal.tsx">
                      <span data-magicpath-id="45" data-magicpath-path="PDFUploadModal.tsx">{error}</span>
                    </p>
                  </motion.div>}
              </AnimatePresence>
            </div> : (/* Upload Progress */
        <div className="text-center py-8" data-magicpath-id="46" data-magicpath-path="PDFUploadModal.tsx">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6" data-magicpath-id="47" data-magicpath-path="PDFUploadModal.tsx">
                <Upload className="w-8 h-8 text-blue-600" data-magicpath-id="48" data-magicpath-path="PDFUploadModal.tsx" />
              </div>
              
              <h3 className="text-lg font-semibold text-slate-900 mb-2" data-magicpath-id="49" data-magicpath-path="PDFUploadModal.tsx">
                <span data-magicpath-id="50" data-magicpath-path="PDFUploadModal.tsx">Uploading Credit Report</span>
              </h3>
              <p className="text-slate-600 mb-6" data-magicpath-id="51" data-magicpath-path="PDFUploadModal.tsx">
                <span data-magicpath-id="52" data-magicpath-path="PDFUploadModal.tsx">Please wait while we process your file...</span>
              </p>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-3 mb-4 overflow-hidden" data-magicpath-id="53" data-magicpath-path="PDFUploadModal.tsx">
                <motion.div initial={{
              width: 0
            }} animate={{
              width: `${uploadProgress}%`
            }} transition={{
              duration: 0.3
            }} className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" data-magicpath-id="54" data-magicpath-path="PDFUploadModal.tsx" />
              </div>
              
              <p className="text-sm text-slate-500" data-magicpath-id="55" data-magicpath-path="PDFUploadModal.tsx">
                <span data-magicpath-id="56" data-magicpath-path="PDFUploadModal.tsx">{Math.round(uploadProgress)}% complete</span>
              </p>
            </div>)}
        </div>

        {/* Hidden File Input */}
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileInputChange} className="hidden" data-magicpath-id="57" data-magicpath-path="PDFUploadModal.tsx" />
      </motion.div>
    </motion.div>;
};