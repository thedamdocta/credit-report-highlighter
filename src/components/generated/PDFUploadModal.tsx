import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '../ui/progress';
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
      toast.error(validationError);
      return;
    }
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    // Show upload started toast
    toast.loading('Uploading credit report...', {
      id: 'upload-progress'
    });

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

      // Update toast to success
      toast.success('Credit report uploaded successfully!', {
        id: 'upload-progress',
        description: `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
      });

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
  }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={handleBackdropClick}>
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
    }} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  <span>Upload Credit Report</span>
                </h2>
                <p className="text-sm text-slate-600">
                  <span>Select a PDF file to begin analysis</span>
                </p>
              </div>
            </div>
            {!isUploading && <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isUploading ? <div>
              {/* Drop Zone */}
              <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${isDragOver ? 'border-blue-500 bg-blue-50' : error ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'}`} onClick={handleBrowseClick}>
                <div className="flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDragOver ? 'bg-blue-100' : error ? 'bg-red-100' : 'bg-slate-100'}`}>
                    {error ? <AlertCircle className="w-8 h-8 text-red-500" /> : <Upload className={`w-8 h-8 ${isDragOver ? 'text-blue-600' : 'text-slate-500'}`} />}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      <span>{isDragOver ? 'Drop your PDF here' : 'Drag & drop your PDF'}</span>
                    </h3>
                    <p className="text-slate-600 mb-4">
                      <span>or click to browse files</span>
                    </p>
                    
                    <motion.button whileHover={{
                  scale: 1.02
                }} whileTap={{
                  scale: 0.98
                }} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                      <span>Choose File</span>
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* File Requirements */}
              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">
                  <span>File Requirements:</span>
                </h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>PDF format only</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Maximum file size: 50MB</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Credit reports from major bureaus supported</span>
                  </li>
                </ul>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && <motion.div initial={{
              opacity: 0,
              y: -10
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              y: -10
            }} className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-red-700 text-sm">
                      <span>{error}</span>
                    </p>
                  </motion.div>}
              </AnimatePresence>
            </div> : (/* Upload Progress */
        <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                <span>Uploading Credit Report</span>
              </h3>
              <p className="text-slate-600 mb-6">
                <span>Please wait while we process your file...</span>
              </p>
              
              {/* Progress Bar */}
              <div className="w-full mb-4">
                <Progress value={uploadProgress} className="h-3" />
              </div>
              
              <p className="text-sm text-slate-500">
                <span>{Math.round(uploadProgress)}% complete</span>
              </p>
            </div>)}
        </div>

        {/* Hidden File Input */}
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileInputChange} className="hidden" />
      </motion.div>
    </motion.div>;
};
