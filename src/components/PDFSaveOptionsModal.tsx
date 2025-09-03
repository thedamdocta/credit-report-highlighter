// PDF Save Options Modal - Allows users to save highlighted PDFs after AI analysis
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, Eye, Settings, X, Check } from 'lucide-react';
import type { HighlightingResult } from '../types/highlighting';

export interface PDFSaveOptions {
  includeHighlights: boolean;
  highlightStrategy: 'pymupdf' | 'canvas' | 'pdfjs';
  exportFormat: 'pdf' | 'json' | 'xfdf';
  includeCrossPageLinks: boolean;
  addBookmarks: boolean;
  filename?: string;
}

interface PDFSaveOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: PDFSaveOptions) => Promise<void>;
  highlightingResult: HighlightingResult | null;
  originalFilename: string;
  issueCount: number;
  processingTime: number;
}

export const PDFSaveOptionsModal: React.FC<PDFSaveOptionsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  highlightingResult,
  originalFilename,
  issueCount,
  processingTime
}) => {
  const [saveOptions, setSaveOptions] = useState<PDFSaveOptions>({
    includeHighlights: true,
    highlightStrategy: 'pymupdf',
    exportFormat: 'pdf',
    includeCrossPageLinks: true,
    addBookmarks: true,
    filename: originalFilename.replace('.pdf', '_analyzed.pdf')
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(saveOptions);
      setSaveComplete(true);
      setTimeout(() => {
        setSaveComplete(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to save PDF:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateOption = <K extends keyof PDFSaveOptions>(
    key: K,
    value: PDFSaveOptions[K]
  ) => {
    setSaveOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStrategyDescription = (strategy: string) => {
    switch (strategy) {
      case 'pymupdf':
        return 'Creates permanent highlights in the PDF file. Best for sharing and archiving.';
      case 'canvas':
        return 'Interactive overlay highlights. Good for review and analysis.';
      case 'pdfjs':
        return 'Standard PDF annotations. Compatible with most PDF viewers.';
      default:
        return '';
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'Complete PDF with embedded highlights';
      case 'json':
        return 'Highlight data in JSON format for reimporting';
      case 'xfdf':
        return 'XML-based annotation format';
      default:
        return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Download className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Save Analyzed Credit Report
                  </h2>
                  <p className="text-sm text-gray-500">
                    Choose your preferred export options
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Analysis Summary */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Analysis Summary
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {issueCount}
                  </div>
                  <div className="text-gray-600">Issues Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {highlightingResult?.metrics?.regionsCreated || 0}
                  </div>
                  <div className="text-gray-600">Highlights Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(processingTime / 1000)}s
                  </div>
                  <div className="text-gray-600">Processing Time</div>
                </div>
              </div>
            </div>

            {/* Save Options */}
            <div className="p-6 space-y-6">
              {/* File Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={saveOptions.filename}
                  onChange={(e) => updateOption('filename', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter filename..."
                />
              </div>

              {/* Highlight Strategy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Highlight Strategy
                </label>
                <div className="space-y-3">
                  {(['pymupdf', 'canvas', 'pdfjs'] as const).map((strategy) => (
                    <div key={strategy} className="flex items-start space-x-3">
                      <input
                        type="radio"
                        id={`strategy-${strategy}`}
                        name="strategy"
                        value={strategy}
                        checked={saveOptions.highlightStrategy === strategy}
                        onChange={(e) => updateOption('highlightStrategy', e.target.value as any)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`strategy-${strategy}`}
                          className="text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          {strategy.toUpperCase()}
                          {strategy === 'pymupdf' && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Recommended for PDF
                            </span>
                          )}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          {getStrategyDescription(strategy)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['pdf', 'json', 'xfdf'] as const).map((format) => (
                    <div key={format} className="relative">
                      <input
                        type="radio"
                        id={`format-${format}`}
                        name="format"
                        value={format}
                        checked={saveOptions.exportFormat === format}
                        onChange={(e) => updateOption('exportFormat', e.target.value as any)}
                        className="sr-only"
                      />
                      <label
                        htmlFor={`format-${format}`}
                        className={`
                          block p-3 border-2 rounded-lg cursor-pointer text-center transition-all
                          ${saveOptions.exportFormat === format
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="font-medium text-sm">
                          {format.toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {getFormatDescription(format)}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Additional Options
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={saveOptions.includeHighlights}
                      onChange={(e) => updateOption('includeHighlights', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Include visual highlights
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={saveOptions.includeCrossPageLinks}
                      onChange={(e) => updateOption('includeCrossPageLinks', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Include cross-page relationship indicators
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={saveOptions.addBookmarks}
                      onChange={(e) => updateOption('addBookmarks', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Add bookmarks for issues found
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>
                  {saveOptions.exportFormat === 'pdf' ? 'PDF Document' : 
                   saveOptions.exportFormat === 'json' ? 'JSON Data' : 'XFDF Annotations'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSave}
                  disabled={isSaving || saveComplete}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {saveComplete ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Saved!</span>
                    </>
                  ) : isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Save PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};