// Enhanced Analysis Results Component with PDF Save Integration
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Eye, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  FileText,
  Share2,
  Settings,
  Clock,
  BarChart3
} from 'lucide-react';
import type { HighlightingResult, EnhancedIssue } from '../types/highlighting';
import { PDFSaveOptionsModal, type PDFSaveOptions } from './PDFSaveOptionsModal';
import { usePDFSave } from '../hooks/usePDFSave';

interface AnalysisResultsWithSaveProps {
  originalFile: File;
  issues: EnhancedIssue[];
  highlightingResult: HighlightingResult | null;
  processingTime: number;
  onViewInteractive?: () => void;
  className?: string;
}

export const AnalysisResultsWithSave: React.FC<AnalysisResultsWithSaveProps> = ({
  originalFile,
  issues,
  highlightingResult,
  processingTime,
  onViewInteractive,
  className = ''
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const { saveWithOptions, isProcessing, error, progress } = usePDFSave();

  // Categorize issues by severity
  const issueSummary = useMemo(() => {
    const summary = {
      critical: 0,
      warning: 0,
      attention: 0,
      info: 0
    };

    issues.forEach(issue => {
      if (issue.type in summary) {
        summary[issue.type as keyof typeof summary]++;
      }
    });

    return summary;
  }, [issues]);

  const handleSave = async (options: PDFSaveOptions) => {
    try {
      await saveWithOptions(originalFile, issues, options);
      setShowSaveModal(false);
    } catch (err) {
      console.error('Failed to save PDF:', err);
      // Error is handled by the hook
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-orange-600 bg-orange-50';
      case 'attention':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return AlertTriangle;
      case 'warning':
        return AlertTriangle;
      case 'attention':
        return Info;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  const totalIssues = Object.values(issueSummary).reduce((sum, count) => sum + count, 0);

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header with Analysis Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Credit Report Analysis Complete
            </h2>
            <p className="text-blue-100">
              {totalIssues} issues found in {Math.round(processingTime / 1000)} seconds
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {totalIssues}
            </div>
            <div className="text-sm text-blue-100">
              Total Issues
            </div>
          </div>
        </div>
      </div>

      {/* Issue Summary Cards */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(issueSummary).map(([severity, count]) => {
            const Icon = getSeverityIcon(severity);
            return (
              <motion.div
                key={severity}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg ${getSeverityColor(severity)} border`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {count}
                    </div>
                    <div className="text-sm font-medium capitalize">
                      {severity}
                    </div>
                  </div>
                  <Icon className="w-6 h-6" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Highlighting Status */}
      {highlightingResult && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Highlighting Status
            </h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              highlightingResult.success 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {highlightingResult.success ? 'Success' : 'Failed'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {highlightingResult.metrics?.regionsCreated || 0}
              </div>
              <div className="text-gray-600">Regions Created</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {highlightingResult.metrics?.crossPageLinks || 0}
              </div>
              <div className="text-gray-600">Cross-Page Links</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {highlightingResult.strategy}
              </div>
              <div className="text-gray-600">Strategy Used</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {highlightingResult.metrics?.fileSize 
                  ? `${Math.round(highlightingResult.metrics.fileSize / 1024)}KB`
                  : 'N/A'
                }
              </div>
              <div className="text-gray-600">File Size</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Primary Save Button */}
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Save Highlighted PDF</span>
            {isProcessing && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
            )}
          </button>

          {/* Interactive View Button */}
          {onViewInteractive && (
            <button
              onClick={onViewInteractive}
              className="flex items-center justify-center space-x-2 bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-5 h-5" />
              <span>View Interactive</span>
            </button>
          )}

          {/* Share Button */}
          <button
            className="flex items-center justify-center space-x-2 bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>

        {/* Progress Bar */}
        {isProcessing && progress > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Processing...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            Error: {error}
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span>{originalFile.name}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{Math.round(processingTime / 1000)}s processing</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <BarChart3 className="w-4 h-4" />
            <span>Analysis Complete</span>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
        </div>
      </div>

      {/* Save Options Modal */}
      <PDFSaveOptionsModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        highlightingResult={highlightingResult}
        originalFilename={originalFile.name}
        issueCount={totalIssues}
        processingTime={processingTime}
      />
    </div>
  );
};