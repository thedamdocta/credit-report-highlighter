import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, AlertTriangle, Eye, Download, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import type { AnalysisResult } from '../types/creditReport';

interface AnalysisReportProps {
  analysisResult: AnalysisResult;
  isVisible: boolean;
  onToggle: () => void;
  onExportReport: () => void;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({
  analysisResult,
  isVisible,
  onToggle,
  onExportReport
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const groupedIssues = analysisResult.issues?.reduce((acc, issue) => {
    const category = issue.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(issue);
    return acc;
  }, {} as Record<string, typeof analysisResult.issues>) || {};

  const severityColors = {
    high: 'text-red-700 bg-red-50 border-red-200',
    medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    low: 'text-blue-700 bg-blue-50 border-blue-200'
  };

  const typeColors = {
    critical: 'bg-red-500',
    warning: 'bg-yellow-500',
    attention: 'bg-orange-500',
    info: 'bg-blue-500'
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 max-h-[60vh] bg-white border border-gray-200 rounded-lg shadow-lg z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">GPT-5 Analysis Report</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportReport}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Export Report"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          >
            <Eye className={`w-4 h-4 ${isVisible ? 'text-blue-600' : 'text-gray-400'}`} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Summary Section */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Analysis Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-600">Total Issues:</span>
                    <span className="font-medium ml-1">{analysisResult.totalIssues}</span>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <span className="text-gray-600">Critical:</span>
                    <span className="font-medium ml-1 text-red-600">{analysisResult.critical}</span>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded">
                    <span className="text-gray-600">Warnings:</span>
                    <span className="font-medium ml-1 text-yellow-600">{analysisResult.warning}</span>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <span className="text-gray-600">Info:</span>
                    <span className="font-medium ml-1 text-blue-600">{analysisResult.info}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xs text-gray-500">Confidence: {(analysisResult.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Detailed Issues by Category */}
              {Object.entries(groupedIssues).map(([category, issues]) => (
                <div key={category} className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection(category)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections[category] ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                      <span className="font-medium capitalize">{category.replace('_', ' ')}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {issues.length}
                      </span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedSections[category] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3">
                          {issues.map((issue, index) => (
                            <div
                              key={issue.id}
                              className={`border rounded-lg p-3 ${severityColors[issue.severity] || severityColors.low}`}
                            >
                              {/* Issue Header */}
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${typeColors[issue.type]}`}></div>
                                  <span className="font-medium text-sm">{issue.type.toUpperCase()}</span>
                                  <span className="text-xs text-gray-500">Page {issue.pageNumber}</span>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(JSON.stringify(issue, null, 2), issue.id)}
                                  className="p-1 hover:bg-white/50 rounded"
                                >
                                  {copiedItem === issue.id ? 
                                    <Check className="w-3 h-3 text-green-600" /> :
                                    <Copy className="w-3 h-3" />
                                  }
                                </button>
                              </div>

                              {/* Issue Description */}
                              <p className="text-sm font-medium mb-2">{issue.description}</p>

                              {/* Anchor Text (What GPT-5 Found) */}
                              {issue.anchorText && (
                                <div className="bg-white/70 rounded p-2 mb-2">
                                  <span className="text-xs font-medium text-gray-700">Found Text:</span>
                                  <p className="text-xs font-mono bg-gray-100 p-1 rounded mt-1 break-words">
                                    "{issue.anchorText.substring(0, 100)}..."
                                  </p>
                                </div>
                              )}

                              {/* Search Pattern */}
                              {issue.searchPattern && issue.searchPattern !== issue.anchorText && (
                                <div className="bg-white/70 rounded p-2 mb-2">
                                  <span className="text-xs font-medium text-gray-700">Search Pattern:</span>
                                  <p className="text-xs font-mono bg-gray-100 p-1 rounded mt-1 break-words">
                                    {issue.searchPattern.substring(0, 100)}...
                                  </p>
                                </div>
                              )}

                              {/* Coordinates */}
                              {issue.coordinates && (
                                <div className="text-xs text-gray-600">
                                  Position: ({issue.coordinates.x}, {issue.coordinates.y}) 
                                  Size: {issue.coordinates.width}×{issue.coordinates.height}
                                </div>
                              )}

                              {/* Recommended Action */}
                              {issue.recommendedAction && (
                                <div className="mt-2 p-2 bg-blue-50 rounded">
                                  <span className="text-xs font-medium text-blue-800">Recommended Action:</span>
                                  <p className="text-xs text-blue-700 mt-1">{issue.recommendedAction}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* Raw Analysis Output */}
              <div className="p-4">
                <button
                  onClick={() => toggleSection('raw')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="font-medium text-gray-900">Raw GPT-5 Response</span>
                  {expandedSections.raw ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                </button>

                <AnimatePresence>
                  {expandedSections.raw && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 overflow-hidden"
                    >
                      <div className="bg-gray-50 p-3 rounded font-mono text-xs overflow-x-auto max-h-40 overflow-y-auto">
                        <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};