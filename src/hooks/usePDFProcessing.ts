// React hook for managing PDF processing and analysis workflow
import { useState, useCallback } from 'react';
import { PDFProcessor } from '../services/pdfProcessor';
import { CreditAnalyzer } from '../services/aiAnalyzer';
import type {
  PDFDocument,
  AnalysisResult,
  AnalysisType,
  ProcessingStatus,
} from '../types/creditReport';

export interface UsePDFProcessingResult {
  isProcessing: boolean;
  isAnalyzing: boolean;
  processingStatus: ProcessingStatus | null;
  pdfDocument: PDFDocument | null;
  analysisResult: AnalysisResult | null;
  error: string | null;
  processPDF: (file: File) => Promise<void>;
  analyzePDF: (analysisType: AnalysisType, customPrompt?: string) => Promise<void>;
  reset: () => void;
}

export function usePDFProcessing(): UsePDFProcessingResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocument | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processor = new PDFProcessor();
  const analyzer = new CreditAnalyzer();

  const processPDF = useCallback(async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProcessingStatus({
        status: 'processing',
        progress: 0,
        message: 'Validating PDF file...',
      });

      // Validate PDF
      const isValid = await processor.validatePDF(file);
      if (!isValid) {
        throw new Error('Invalid PDF file');
      }

      setProcessingStatus({
        status: 'processing',
        progress: 25,
        message: 'Extracting text content...',
      });

      // Process PDF
      const document = await processor.processPDF(file);

      setProcessingStatus({
        status: 'completed',
        progress: 100,
        message: `Successfully processed ${document.totalPages} pages`,
      });

      setPdfDocument(document);

      // Clear status after a delay
      setTimeout(() => {
        setProcessingStatus(null);
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process PDF';
      setError(errorMessage);
      setProcessingStatus({
        status: 'failed',
        progress: 0,
        message: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const analyzePDF = useCallback(async (analysisType: AnalysisType, customPrompt?: string) => {
    if (!pdfDocument) {
      setError('No PDF document available for analysis');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      setProcessingStatus({
        status: 'processing',
        progress: 0,
        message: 'Starting AI analysis...',
      });

      // Perform AI analysis
      const result = await analyzer.analyzeCreditReport(pdfDocument, analysisType, customPrompt);

      setProcessingStatus({
        status: 'completed',
        progress: 100,
        message: `Analysis complete - found ${result.totalIssues} issues`,
      });

      setAnalysisResult(result);

      // Clear status after a delay
      setTimeout(() => {
        setProcessingStatus(null);
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze PDF';
      setError(errorMessage);
      setProcessingStatus({
        status: 'failed',
        progress: 0,
        message: errorMessage,
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [pdfDocument]);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setIsAnalyzing(false);
    setProcessingStatus(null);
    setPdfDocument(null);
    setAnalysisResult(null);
    setError(null);
  }, []);

  return {
    isProcessing,
    isAnalyzing,
    processingStatus,
    pdfDocument,
    analysisResult,
    error,
    processPDF,
    analyzePDF,
    reset,
  };
}
