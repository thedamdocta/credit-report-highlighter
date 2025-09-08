// React hook for managing PDF save functionality
import { useState, useCallback } from 'react';
import type { HighlightingResult, EnhancedIssue } from '../types/highlighting';
import { PyMuPDFHighlightService } from '../services/pymuPdfHighlighter';
import type { PDFSaveOptions } from '../components/PDFSaveOptionsModal';

interface UsePDFSaveResult {
  saveWithOptions: (
    pdfFile: File,
    issues: EnhancedIssue[],
    options: PDFSaveOptions
  ) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
  progress: number;
}

export const usePDFSave = (): UsePDFSaveResult => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const saveWithOptions = useCallback(async (
    pdfFile: File,
    issues: EnhancedIssue[],
    options: PDFSaveOptions
  ) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const highlightService = new PyMuPDFHighlightService();
      
      // Step 1: Generate highlights with specified strategy
      setProgress(25);
      if (options.exportFormat && options.exportFormat !== 'pdf') {
        throw new Error('Only PDF export is supported in the current configuration');
      }
      const highlightResult = await highlightService.highlightIssues(
        pdfFile,
        issues
      );

      if (!highlightResult.success) {
        throw new Error(highlightResult.error || 'Failed to create highlights');
      }

      setProgress(50);

      // Step 2: Generate the appropriate export
      let exportBlob: Blob;
      let mimeType: string;
      let fileExtension: string;

      if (options.exportFormat === 'pdf' || !options.exportFormat) {
        // For PDF export, we need the highlighted PDF file
        if (highlightResult.highlightedFile) {
          exportBlob = highlightResult.highlightedFile;
          mimeType = 'application/pdf';
          fileExtension = '.pdf';
        } else {
          throw new Error('Failed to create highlighted PDF');
        }
      } else {
        throw new Error('Only PDF export is supported');
      }

      setProgress(90);

      // Step 3: Trigger download
      const filename = options.filename || 
        `${pdfFile.name.replace('.pdf', '')}_analyzed${fileExtension || '.pdf'}`;
      
      await downloadBlob(exportBlob, filename, mimeType);
      
      setProgress(100);
      
      // Cleanup
      highlightService.cleanup();
      
    } catch (err) {
      console.error('PDF save error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
      // Reset progress after a delay
      setTimeout(() => setProgress(0), 2000);
    }
  }, []);

  return {
    saveWithOptions,
    isProcessing,
    error,
    progress
  };
};

// Helper function to trigger file download
const downloadBlob = async (blob: Blob, filename: string, mimeType: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Create download URL
      const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
      
      // Create temporary download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      // Add to DOM and trigger click
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      resolve();
    } catch (error) {
      reject(new Error(`Failed to download file: ${error}`));
    }
  });
};

// Alternative hook for batch save operations
export const useBatchPDFSave = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const saveBatch = useCallback(async (
    files: Array<{
      pdfFile: File;
      issues: EnhancedIssue[];
      options: PDFSaveOptions;
    }>
  ) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setCompletedCount(0);

    try {
      const highlightService = new PyMuPDFHighlightService();
      for (let i = 0; i < files.length; i++) {
        const { pdfFile, issues, options } = files[i];
        if (options.exportFormat && options.exportFormat !== 'pdf') {
          throw new Error('Only PDF export is supported in batch mode');
        }
        const result = await highlightService.highlightIssues(pdfFile, issues);
        if (!result.success || !result.highlightedFile) {
          throw new Error('Failed to create highlighted PDF');
        }
        const filename = options.filename || `${pdfFile.name.replace('.pdf','')}_analyzed.pdf`;
        await downloadBlob(result.highlightedFile, filename, 'application/pdf');
        setCompletedCount(i + 1);
        setProgress(((i + 1) / files.length) * 100);
      }
      
    } catch (err) {
      console.error('Batch PDF save error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProgress(0);
        setCompletedCount(0);
      }, 2000);
    }
  }, []);

  return {
    saveBatch,
    isProcessing,
    error,
    progress,
    completedCount
  };
};
