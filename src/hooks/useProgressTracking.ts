import { useState, useCallback, useRef, useEffect } from 'react';
import { FileText, Brain, Search, Target, Highlighter, PenTool, CheckCircle } from 'lucide-react';
import type { ProgressStage } from '../components/DetailedProgressIndicator';

export interface ProgressManager {
  currentStageId: string;
  isVisible: boolean;
  stages: ProgressStage[];
  startProgress: () => void;
  nextStage: (stageId: string, substage?: string) => void;
  completeStage: (stageId: string) => void;
  setSubstage: (stageId: string, substage: string) => void;
  hideProgress: () => void;
  showProgress: () => void;
  resetProgress: () => void;
}

export function useProgressTracking(): ProgressManager {
  const [currentStageId, setCurrentStageId] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [stages, setStages] = useState<ProgressStage[]>([]);
  const timeoutsRef = useRef<number[]>([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

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

  const startProgress = useCallback(() => {
    console.log('🚀 Starting detailed progress tracking');
    
    // Clear any existing timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setStages(defaultStages.map(stage => ({ ...stage, status: 'pending' as const })));
    setCurrentStageId('pdf_processing');
    setIsVisible(true);
  }, []);

  const nextStage = useCallback((stageId: string, substage?: string) => {
    console.log(`📊 Progress: Moving to stage ${stageId}${substage ? ` (${substage})` : ''}`);
    
    // Clear any existing timeouts before starting new ones
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    
    setStages(prevStages => 
      prevStages.map(stage => ({
        ...stage,
        status: stage.id === stageId ? 'active' as const :
               prevStages.findIndex(s => s.id === stage.id) < prevStages.findIndex(s => s.id === stageId) ? 'completed' as const :
               'pending' as const,
        currentSubstage: stage.id === stageId ? substage : undefined
      }))
    );
    setCurrentStageId(stageId);

    // Auto-cycle through substages if they exist
    const currentStage = defaultStages.find(s => s.id === stageId);
    if (currentStage?.substages && !substage) {
      cycleSubstages(stageId, currentStage.substages);
    }
  }, []);

  const cycleSubstages = useCallback((stageId: string, substages: string[]) => {
    substages.forEach((substage, index) => {
      const timeout = setTimeout(() => {
        setStages(prevStages =>
          prevStages.map(stage => ({
            ...stage,
            currentSubstage: stage.id === stageId ? substage : stage.currentSubstage
          }))
        );
      }, index * 2000) as unknown as number; // 2 seconds per substage
      
      timeoutsRef.current.push(timeout);
    });
  }, []);

  const completeStage = useCallback((stageId: string) => {
    console.log(`✅ Progress: Completed stage ${stageId}`);
    
    setStages(prevStages =>
      prevStages.map(stage => ({
        ...stage,
        status: stage.id === stageId ? 'completed' as const : stage.status,
        currentSubstage: stage.id === stageId ? undefined : stage.currentSubstage
      }))
    );
  }, []);

  const setSubstage = useCallback((stageId: string, substage: string) => {
    setStages(prevStages =>
      prevStages.map(stage => ({
        ...stage,
        currentSubstage: stage.id === stageId ? substage : stage.currentSubstage
      }))
    );
  }, []);

  const hideProgress = useCallback(() => {
    console.log('📊 Hiding progress indicator');
    setIsVisible(false);
    
    // Clear timeouts when hiding
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const showProgress = useCallback(() => {
    console.log('📊 Showing progress indicator');
    setIsVisible(true);
  }, []);

  const resetProgress = useCallback(() => {
    console.log('📊 Resetting progress tracking');
    
    // Clear all timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    
    setStages(defaultStages.map(stage => ({ ...stage, status: 'pending' as const })));
    setCurrentStageId('');
    setIsVisible(false);
  }, []);

  return {
    currentStageId,
    isVisible,
    stages,
    startProgress,
    nextStage,
    completeStage,
    setSubstage,
    hideProgress,
    showProgress,
    resetProgress
  };
}
