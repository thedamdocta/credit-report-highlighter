import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CompactCostDisplay, CostDisplayData } from './CostTrackingDisplay';
import { 
  FileText, 
  Brain, 
  Search, 
  Highlighter, 
  Download, 
  CheckCircle, 
  Clock,
  Zap,
  Eye,
  Layers,
  Target,
  PenTool
} from 'lucide-react';

export interface ProgressStage {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'active' | 'completed' | 'error';
  duration?: number; // estimated duration in ms
  substages?: string[];
  currentSubstage?: string;
}

interface DetailedProgressIndicatorProps {
  stages: ProgressStage[];
  currentStageId: string;
  isVisible: boolean;
  className?: string;
  costData?: CostDisplayData;
}

const defaultStages: ProgressStage[] = [
  {
    id: 'pdf_processing',
    title: 'Processing PDF',
    description: 'Extracting text and analyzing document structure',
    icon: FileText,
    status: 'pending',
    substages: [
      'Validating PDF format',
      'Extracting text content',
      'Analyzing page layout',
      'Building document structure'
    ]
  },
  {
    id: 'analysis_prep',
    title: 'Preparing Analysis',
    description: 'Initializing GPT-5 with credit report analysis protocols',
    icon: Brain,
    status: 'pending',
    substages: [
      'Loading analysis templates',
      'Configuring GPT-5 parameters',
      'Setting up late chunking methodology',
      'Preparing document segments'
    ]
  },
  {
    id: 'content_analysis',
    title: 'Analyzing Content',
    description: 'GPT-5 is examining each section for accuracy issues',
    icon: Search,
    status: 'pending',
    substages: [
      'Analyzing account information',
      'Checking payment histories',
      'Validating creditor names',
      'Identifying missing data',
      'Cross-referencing balances',
      'Detecting inconsistencies'
    ]
  },
  {
    id: 'issue_compilation',
    title: 'Compiling Results',
    description: 'Organizing findings and generating issue reports',
    icon: Target,
    status: 'pending',
    substages: [
      'Categorizing issues by severity',
      'Calculating confidence scores',
      'Mapping issues to coordinates',
      'Generating recommendations'
    ]
  },
  {
    id: 'highlighting_prep',
    title: 'Preparing Highlights',
    description: 'Converting analysis results to highlighting instructions',
    icon: Highlighter,
    status: 'pending',
    substages: [
      'Converting issues to highlight data',
      'Calculating precise coordinates',
      'Setting color codes by severity',
      'Preparing PyMuPDF instructions'
    ]
  },
  {
    id: 'pdf_highlighting',
    title: 'Creating Highlighted PDF',
    description: 'PyMuPDF is applying professional-grade highlights',
    icon: PenTool,
    status: 'pending',
    substages: [
      'Loading original PDF',
      'Applying critical issue highlights',
      'Adding warning annotations',
      'Embedding tooltip information',
      'Finalizing document structure'
    ]
  },
  {
    id: 'finalization',
    title: 'Finalizing',
    description: 'Preparing results for download and review',
    icon: CheckCircle,
    status: 'pending',
    substages: [
      'Validating highlighted PDF',
      'Generating analysis report',
      'Preparing download links',
      'Creating audit trail'
    ]
  }
];

export const DetailedProgressIndicator: React.FC<DetailedProgressIndicatorProps> = ({
  stages = defaultStages,
  currentStageId,
  isVisible,
  className = '',
  costData
}) => {
  const currentStageIndex = stages.findIndex(stage => stage.id === currentStageId);
  const currentStage = stages[currentStageIndex];
  
  // Update stage statuses based on current stage
  const updatedStages = stages.map((stage, index) => ({
    ...stage,
    status: index < currentStageIndex ? 'completed' : 
           index === currentStageIndex ? 'active' : 'pending'
  }));

  const completedStages = updatedStages.filter(s => s.status === 'completed').length;
  const progressPercentage = (completedStages / stages.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${className}`}
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            className="bg-white rounded-lg shadow-2xl p-6 mx-4 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                AI Credit Report Analysis
              </h2>
              <p className="text-gray-600 mb-4">
                GPT-5 is performing comprehensive credit report analysis
              </p>
              
              {/* Overall Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <motion.div
                  className="bg-blue-600 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-sm text-gray-500">
                {completedStages} of {stages.length} stages completed ({Math.round(progressPercentage)}%)
              </p>
              
              {/* Cost Tracking Display */}
              {costData && (
                <div className="mt-3">
                  <CompactCostDisplay costData={costData} />
                </div>
              )}
            </div>

            {/* Current Stage Highlight */}
            {currentStage && (
              <motion.div
                key={currentStage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <currentStage.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900">{currentStage.title}</h3>
                    <p className="text-sm text-blue-700">{currentStage.description}</p>
                  </div>
                </div>

                {/* Current Substage Animation */}
                {currentStage.substages && (
                  <div className="ml-11">
                    <AnimatePresence mode="wait">
                      {currentStage.substages.map((substage, index) => (
                        <motion.div
                          key={`${currentStage.id}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ 
                            opacity: 1, 
                            x: 0,
                            transition: { delay: index * 0.8 }
                          }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center gap-2 py-1 text-sm text-blue-600"
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"
                          />
                          <span>{substage}...</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}

            {/* All Stages List */}
            <div className="space-y-3">
              {updatedStages.map((stage, index) => {
                const Icon = stage.icon;
                const isActive = stage.status === 'active';
                const isCompleted = stage.status === 'completed';
                const isPending = stage.status === 'pending';

                return (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0,
                      transition: { delay: index * 0.1 }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isActive ? 'bg-blue-50 border border-blue-200' :
                      isCompleted ? 'bg-green-50 border border-green-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {/* Stage Icon */}
                    <div className={`p-2 rounded-lg ${
                      isActive ? 'bg-blue-100' :
                      isCompleted ? 'bg-green-100' :
                      'bg-gray-100'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : isActive ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <Icon className="w-5 h-5 text-blue-600" />
                        </motion.div>
                      ) : (
                        <Icon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* Stage Info */}
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        isActive ? 'text-blue-900' :
                        isCompleted ? 'text-green-900' :
                        'text-gray-500'
                      }`}>
                        {stage.title}
                      </h4>
                      <p className={`text-sm ${
                        isActive ? 'text-blue-700' :
                        isCompleted ? 'text-green-700' :
                        'text-gray-400'
                      }`}>
                        {stage.description}
                      </p>
                    </div>

                    {/* Stage Status */}
                    <div className="text-xs">
                      {isCompleted && (
                        <span className="text-green-600 font-medium">✓ Complete</span>
                      )}
                      {isActive && (
                        <motion.span 
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-blue-600 font-medium"
                        >
                          In Progress...
                        </motion.span>
                      )}
                      {isPending && (
                        <span className="text-gray-400">Waiting</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <motion.p 
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-sm text-gray-600"
              >
                Please wait while we complete the analysis...
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { defaultStages };