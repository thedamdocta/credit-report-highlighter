// React hook for managing PDF save functionality
import { useState, useCallback } from 'react';
import type { HighlightingResult, EnhancedIssue } from '../types/highlighting';
import { UnifiedHighlightService } from '../services/unifiedHighlightService';
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
      const highlightService = new UnifiedHighlightService();
      
      // Step 1: Generate highlights with specified strategy
      setProgress(25);
      const highlightResult = await highlightService.highlightIssues(
        pdfFile,
        issues,
        undefined, // Use default config
        {
          mode: options.highlightStrategy,
          enableCrossPageLinks: options.includeCrossPageLinks,
          exportFormat: options.exportFormat
        }
      );

      if (!highlightResult.success) {
        throw new Error(highlightResult.error || 'Failed to create highlights');
      }

      setProgress(50);

      // Step 2: Generate the appropriate export
      let exportBlob: Blob;
      let mimeType: string;
      let fileExtension: string;

      if (options.exportFormat === 'pdf') {
        // For PDF export, we need the highlighted PDF file
        if (highlightResult.highlightedFile) {
          exportBlob = highlightResult.highlightedFile;
          mimeType = 'application/pdf';
          fileExtension = '.pdf';
        } else {
          // If no highlighted PDF available, create one using PyMuPDF
          setProgress(60);
          const pdfResult = await highlightService.createExportableHighlights(
            pdfFile,
            issues
          );
          
          if (!pdfResult.success || !pdfResult.highlightedFile) {
            throw new Error('Failed to create exportable PDF');
          }
          
          exportBlob = pdfResult.highlightedFile;
          mimeType = 'application/pdf';
          fileExtension = '.pdf';
        }
      } else {
        // For other formats, use the export method
        setProgress(70);
        exportBlob = await highlightService.exportHighlights(
          highlightResult,
          options.exportFormat
        );
        
        if (options.exportFormat === 'json') {
          mimeType = 'application/json';
          fileExtension = '.json';
        } else if (options.exportFormat === 'xfdf') {
          mimeType = 'application/xml';
          fileExtension = '.xfdf';
        } else {
          mimeType = 'application/octet-stream';
          fileExtension = '.dat';
        }
      }

      setProgress(90);

      // Step 3: Trigger download
      const filename = options.filename || 
        `${pdfFile.name.replace('.pdf', '')}_analyzed${fileExtension}`;
      
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
      const highlightService = new UnifiedHighlightService();
      
      for (let i = 0; i < files.length; i++) {
        const { pdfFile, issues, options } = files[i];
        
        // Process each file
        const highlightResult = await highlightService.highlightIssues(
          pdfFile,
          issues,
          undefined,
          {
            mode: options.highlightStrategy,
            enableCrossPageLinks: options.includeCrossPageLinks,
            exportFormat: options.exportFormat
          }
        );

        if (highlightResult.success) {
          const exportBlob = options.exportFormat === 'pdf' && highlightResult.highlightedFile
            ? highlightResult.highlightedFile
            : await highlightService.exportHighlights(highlightResult, options.exportFormat);

          const filename = options.filename || 
            `${pdfFile.name.replace('.pdf', '')}_analyzed.${options.exportFormat}`;
          
          const mimeType = options.exportFormat === 'pdf' 
            ? 'application/pdf'
            : options.exportFormat === 'json'
            ? 'application/json'
            : 'application/xml';

          await downloadBlob(exportBlob, filename, mimeType);
        }

        setCompletedCount(i + 1);
        setProgress(((i + 1) / files.length) * 100);
      }

      highlightService.cleanup();
      
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