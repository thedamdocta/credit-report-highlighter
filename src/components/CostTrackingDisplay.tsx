import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Clock, Info } from 'lucide-react';

export interface CostDisplayData {
  totalCost: number;
  chunksProcessed: number;
  estimatedRemainingCost: number;
  averageCostPerChunk: number;
  processingStatus: 'estimating' | 'processing' | 'completed' | 'failed';
  totalChunks?: number;
}

interface CostTrackingDisplayProps {
  costData: CostDisplayData;
  className?: string;
  showDetailed?: boolean;
}

export const CostTrackingDisplay: React.FC<CostTrackingDisplayProps> = ({
  costData,
  className = '',
  showDetailed = false
}) => {
  const {
    totalCost,
    chunksProcessed,
    estimatedRemainingCost,
    averageCostPerChunk,
    processingStatus,
    totalChunks = 0
  } = costData;

  const projectedTotal = totalCost + estimatedRemainingCost;
  const completionPercentage = totalChunks > 0 ? (chunksProcessed / totalChunks) * 100 : 0;

  // Determine status color and message
  const getStatusColor = () => {
    switch (processingStatus) {
      case 'estimating': return 'text-blue-600';
      case 'processing': return 'text-indigo-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusMessage = () => {
    switch (processingStatus) {
      case 'estimating': return 'Estimating costs...';
      case 'processing': return `Processing chunk ${chunksProcessed}${totalChunks > 0 ? `/${totalChunks}` : ''}`;
      case 'completed': return 'Analysis completed';
      case 'failed': return 'Processing failed';
      default: return 'Initializing...';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-200 rounded-lg">
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <span className="text-sm font-medium text-slate-700">Analysis Cost</span>
        </div>
        <div className="flex items-center gap-1">
          <motion.div
            animate={{ 
              scale: processingStatus === 'processing' ? [1, 1.1, 1] : 1,
              opacity: processingStatus === 'processing' ? [1, 0.7, 1] : 1
            }}
            transition={{ duration: 2, repeat: processingStatus === 'processing' ? Infinity : 0 }}
            className={`text-xs font-medium ${getStatusColor()}`}
          >
            {getStatusMessage()}
          </motion.div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Current Cost */}
        <div className="text-center">
          <motion.div
            key={totalCost}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-lg font-bold text-slate-900"
          >
            ${totalCost.toFixed(3)}
          </motion.div>
          <div className="text-xs text-slate-500">Current Cost</div>
        </div>

        {/* Projected Total */}
        <div className="text-center">
          <motion.div
            key={projectedTotal}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-lg font-bold text-indigo-600"
          >
            ${projectedTotal.toFixed(3)}
          </motion.div>
          <div className="text-xs text-slate-500">Est. Total</div>
        </div>
      </div>

      {/* Progress Bar */}
      {totalChunks > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(completionPercentage)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Detailed Information (Collapsible) */}
      {showDetailed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="border-t border-slate-200 pt-3 space-y-2"
        >
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Avg per chunk:</span>
            <span className="font-medium text-slate-900">
              ${averageCostPerChunk.toFixed(4)}
            </span>
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Chunks processed:</span>
            <span className="font-medium text-slate-900">
              {chunksProcessed}{totalChunks > 0 ? `/${totalChunks}` : ''}
            </span>
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Remaining est.:</span>
            <span className="font-medium text-slate-900">
              ${estimatedRemainingCost.toFixed(3)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Cost Alert (if high) */}
      {projectedTotal > 0.5 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md"
        >
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700">
            <div className="font-medium">Higher than average cost</div>
            <div>Large document with extensive analysis required</div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Compact version for embedding in progress indicator
export const CompactCostDisplay: React.FC<{
  costData: CostDisplayData;
  className?: string;
}> = ({ costData, className = '' }) => {
  const projectedTotal = costData.totalCost + costData.estimatedRemainingCost;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2 text-sm bg-slate-100 rounded-md px-3 py-1 ${className}`}
    >
      <DollarSign className="w-3 h-3 text-slate-600" />
      <span className="text-slate-700">
        ${costData.totalCost.toFixed(3)} / ${projectedTotal.toFixed(3)} est.
      </span>
      {costData.processingStatus === 'processing' && (
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 bg-indigo-500 rounded-full"
        />
      )}
    </motion.div>
  );
};