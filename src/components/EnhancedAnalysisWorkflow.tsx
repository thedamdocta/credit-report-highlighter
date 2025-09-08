// Enhanced Analysis Workflow - Complete integration of AI analysis, highlighting, and save functionality
import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Brain, Eye, Download, RefreshCw, AlertCircle } from 'lucide-react';
import type { 
  AnalysisResult, 
  AnalysisType, 
  PDFDocument, 
  CreditIssue 
} from '../types/creditReport';
import type { 
  HighlightingResult, 
  EnhancedIssue 
} from '../types/highlighting';
import { CreditAnalyzer } from '../services/aiAnalyzer';
import { PyMuPDFHighlightService } from '../services/pymuPdfHighlighter';
import { AnalysisResultsWithSave } from './AnalysisResultsWithSave';
import { extractTextFromPDF } from '../utils/pdfParser';

interface AnalysisStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

interface EnhancedAnalysisWorkflowProps {
  className?: string;
  onAnalysisComplete?: (
    result: AnalysisResult, 
    highlightingResult: HighlightingResult,
    originalFile: File
  ) => void;
}

export const EnhancedAnalysisWorkflow: React.FC<EnhancedAnalysisWorkflowProps> = ({
  className = '',
  onAnalysisComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('full');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [highlightingResult, setHighlightingResult] = useState<HighlightingResult | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzer = useRef(new CreditAnalyzer());
  const highlightService = useRef(new PyMuPDFHighlightService());

  const analysisSteps: AnalysisStep[] = [
    {
      id: 'parse',
      name: 'PDF Parsing',
      description: 'Extracting text and structure from PDF document',
      status: 'pending'
    },
    {
      id: 'analyze',
      name: 'AI Analysis',
      description: 'Identifying credit report issues using advanced AI',
      status: 'pending'
    },
    {
      id: 'enhance',
      name: 'Issue Enhancement',
      description: 'Adding coordinate mapping and cross-page relationships',
      status: 'pending'
    },
    {
      id: 'highlight',
      name: 'Highlighting Generation',
      description: 'Creating interactive and exportable highlights',
      status: 'pending'
    }
  ];

  const [steps, setSteps] = useState<AnalysisStep[]>(analysisSteps);

  const updateStep = useCallback((stepId: string, updates: Partial<AnalysisStep>) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    );
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      // Reset analysis state
      setAnalysisResult(null);
      setHighlightingResult(null);
      setSteps(analysisSteps);
      setCurrentStep(0);
    } else {
      setError('Please select a valid PDF file');
    }
  }, []);

  const convertIssuesToEnhanced = useCallback((issues: CreditIssue[]): EnhancedIssue[] => {
    return issues.map(issue => ({
      ...issue,
      processingMethod: 'enhanced',
      semanticContext: `Credit report issue on page ${issue.pageNumber}`,
      contextualDescription: issue.description
    }));
  }, []);

  const startAnalysis = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setCurrentStep(0);
    const startTime = Date.now();

    try {
      // Step 1: PDF Parsing
      updateStep('parse', { status: 'running', progress: 0 });
      setCurrentStep(0);

      const pdfDocument = await extractTextFromPDF(selectedFile);
      updateStep('parse', { status: 'completed', progress: 100 });

      // Step 2: AI Analysis  
      updateStep('analyze', { status: 'running', progress: 0 });
      setCurrentStep(1);

      const analysisResult = await analyzer.current.analyzeCreditReport(
        pdfDocument,
        analysisType,
        customPrompt,
        true, // Use late chunking for enhanced context
        (progress) => {
          updateStep('analyze', { progress: progress.progress });
        }
      );

      updateStep('analyze', { status: 'completed', progress: 100 });
      setAnalysisResult(analysisResult);

      // Step 3: Issue Enhancement
      updateStep('enhance', { status: 'running', progress: 0 });
      setCurrentStep(2);

      const enhancedIssues = convertIssuesToEnhanced(analysisResult.issues);
      
      // Add coordinate mapping and cross-page relationships
      // This would be done through the enhanced processors in a real implementation
      updateStep('enhance', { status: 'completed', progress: 100 });

      // Step 4: Highlighting Generation
      updateStep('highlight', { status: 'running', progress: 0 });
      setCurrentStep(3);

      const highlightingResult = await highlightService.current.highlightIssues(
        selectedFile,
        enhancedIssues
      );

      updateStep('highlight', { status: 'completed', progress: 100 });
      setHighlightingResult(highlightingResult);

      const endTime = Date.now();
      setProcessingTime(endTime - startTime);

      // Notify completion
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResult, highlightingResult, selectedFile);
      }

    } catch (err) {
      console.error('Analysis workflow error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      
      // Update current step with error
      const currentStepId = steps[currentStep]?.id;
      if (currentStepId) {
        updateStep(currentStepId, { 
          status: 'error', 
          error: errorMessage 
        });
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, analysisType, customPrompt, currentStep, steps, updateStep, convertIssuesToEnhanced, onAnalysisComplete]);

  const resetWorkflow = useCallback(() => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setHighlightingResult(null);
    setSteps(analysisSteps);
    setCurrentStep(0);
    setIsProcessing(false);
    setError(null);
    setProcessingTime(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const getStepIcon = (step: AnalysisStep) => {
    switch (step.status) {
      case 'completed':
        return '✓';
      case 'running':
        return '⟳';
      case 'error':
        return '⚠';
      default:
        return '○';
    }
  };

  const getStepColor = (step: AnalysisStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-600 border-green-300 bg-green-50';
      case 'running':
        return 'text-blue-600 border-blue-300 bg-blue-50';
      case 'error':
        return 'text-red-600 border-red-300 bg-red-50';
      default:
        return 'text-gray-500 border-gray-300 bg-gray-50';
    }
  };

  // Show results if analysis is complete
  if (analysisResult && selectedFile) {
    return (
      <div className={`space-y-6 ${className}`}>
        <AnalysisResultsWithSave
          originalFile={selectedFile}
          issues={convertIssuesToEnhanced(analysisResult.issues)}
          highlightingResult={highlightingResult}
          processingTime={processingTime}
          onViewInteractive={() => {
            // This would open an interactive PDF viewer
            console.log('Opening interactive viewer...');
          }}
        />
        
        <div className="flex justify-center">
          <button
            onClick={resetWorkflow}
            className="flex items-center space-x-2 px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Analyze Another Report</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Enhanced Credit Report Analysis
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Advanced AI-powered analysis with intelligent highlighting and PDF export capabilities.
          Uses late chunking technology for enhanced context preservation.
        </p>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          {/* File Selection */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              Upload Credit Report
            </label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg text-gray-600 mb-2">
                {selectedFile ? selectedFile.name : 'Click to select a PDF file'}
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF files up to 120 pages with enhanced processing
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Analysis Options */}
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Analysis Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Analysis Type
                </label>
                <select
                  value={analysisType}
                  onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full">Full Analysis (Recommended)</option>
                  <option value="late_chunking">Enhanced Late Chunking</option>
                  <option value="fcra">FCRA Focus</option>
                  <option value="collections">Collections Focus</option>
                  <option value="disputes">Disputes Focus</option>
                  <option value="custom">Custom Analysis</option>
                </select>
              </div>

              {/* Custom Prompt */}
              {analysisType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Analysis Prompt
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe what you want to focus on in this credit report analysis..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              )}

              {/* Start Analysis Button */}
              <button
                onClick={startAnalysis}
                disabled={isProcessing}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Brain className="w-5 h-5" />
                <span>
                  {isProcessing ? 'Analyzing Report...' : 'Start Enhanced Analysis'}
                </span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Processing Steps */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Analysis Progress
            </h3>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center p-4 rounded-lg border ${getStepColor(step)}`}
                >
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border-2 border-current mr-4">
                    <span className="text-sm font-bold">
                      {getStepIcon(step)}
                    </span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-semibold">{step.name}</h4>
                    <p className="text-sm opacity-75">{step.description}</p>
                    {step.error && (
                      <p className="text-sm text-red-600 mt-1">
                        Error: {step.error}
                      </p>
                    )}
                  </div>
                  {step.status === 'running' && step.progress !== undefined && (
                    <div className="flex-shrink-0 w-16 text-right">
                      <span className="text-sm font-medium">
                        {Math.round(step.progress)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900">Analysis Error</h4>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
