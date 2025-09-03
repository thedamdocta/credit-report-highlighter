// Enhanced type definitions for large, complex credit report processing

export interface TableData {
  id: string;
  pageNumber: number;
  rows: string[][];
  headers: string[];
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  tableType: 'account_summary' | 'payment_history' | 'inquiry_list' | 'dispute_history' | 'other';
}

export interface ImageData {
  id: string;
  pageNumber: number;
  type: 'logo' | 'chart' | 'signature' | 'scan' | 'other';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  extractedText?: string;
  analysisRequired: boolean;
}

export interface SemanticRegion {
  id: string;
  type: 'header' | 'account_section' | 'personal_info' | 'score_section' | 'dispute_section' | 'inquiry_section' | 'footer';
  pageNumber: number;
  content: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  importance: 'critical' | 'high' | 'medium' | 'low';
  relatedSections?: string[];
}

export interface LayoutStructure {
  pageNumber: number;
  columns: number;
  hasHeader: boolean;
  hasFooter: boolean;
  contentRegions: SemanticRegion[];
  readingOrder: string[];
}

export interface EnhancedPDFPage {
  pageNumber: number;
  text: string;
  tables: TableData[];
  images: ImageData[];
  layout: LayoutStructure;
  semanticRegions: SemanticRegion[];
  width: number;
  height: number;
  rotation?: number;
  tokens?: TextToken[];
  contentComplexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
}

export interface DocumentStructure {
  documentType: 'equifax' | 'experian' | 'transunion' | 'unknown';
  totalPages: number;
  sections: Section[];
  accountSummaries: AccountSection[];
  disputeHistory: DisputeSection[];
  paymentHistory: PaymentSection[];
  inquiries: InquirySection[];
  personalInfo: PersonalInfoSection;
  creditScores: CreditScoreSection[];
}

export interface Section {
  id: string;
  name: string;
  type: 'personal_info' | 'credit_score' | 'accounts' | 'inquiries' | 'disputes' | 'other';
  startPage: number;
  endPage: number;
  content: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

export interface AccountSection {
  id: string;
  accountNumber: string;
  creditorName: string;
  accountType: string;
  status: string;
  balance?: number;
  paymentHistory?: string;
  pageNumbers: number[];
  disputeStatus?: 'disputed' | 'resolved' | 'none';
  issues: string[];
}

export interface DisputeSection {
  id: string;
  accountId?: string;
  disputeDate: Date;
  status: 'pending' | 'resolved' | 'rejected';
  description: string;
  pageNumbers: number[];
  resolution?: string;
}

export interface PaymentSection {
  id: string;
  accountId: string;
  paymentHistory: Array<{
    date: Date;
    amount: number;
    status: 'on_time' | 'late' | 'missed';
    daysLate?: number;
  }>;
  pageNumbers: number[];
}

export interface InquirySection {
  id: string;
  date: Date;
  inquirer: string;
  type: 'hard' | 'soft';
  purpose?: string;
  pageNumber: number;
}

export interface PersonalInfoSection {
  name: string;
  addresses: Array<{
    address: string;
    type: 'current' | 'previous';
  }>;
  ssn?: string;
  dateOfBirth?: Date;
  pageNumbers: number[];
}

export interface CreditScoreSection {
  score: number;
  provider: string;
  date: Date;
  range: {
    min: number;
    max: number;
  };
  factors: string[];
  pageNumber: number;
}

export interface StreamingChunkConfig {
  maxTokensPerChunk: number;
  overlapTokens: number;
  priorityRegions: SemanticRegion[];
  compressionRatio: number;
  adaptiveChunking: boolean;
  preserveTableIntegrity: boolean;
  crossPageContextWindow: number;
}

export interface EnhancedAnalysisResult extends AnalysisResult {
  documentStructure: DocumentStructure;
  processingMetrics: {
    totalProcessingTime: number;
    chunksProcessed: number;
    tablesAnalyzed: number;
    imagesProcessed: number;
    tokensUsed: number;
    estimatedCost: number;
  };
  structuralIssues: StructuralIssue[];
  crossPageRelationships: CrossPageRelationship[];
}

export interface StructuralIssue {
  id: string;
  type: 'missing_section' | 'incomplete_data' | 'format_error' | 'data_inconsistency';
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedPages: number[];
  suggestedFix?: string;
}

export interface CrossPageRelationship {
  id: string;
  type: 'account_continuation' | 'dispute_reference' | 'payment_history_link' | 'personal_info_update';
  sourcePages: number[];
  targetPages: number[];
  relationship: string;
  confidence: number;
}

export interface EnhancedChunk {
  id: string;
  content: string;
  embedding?: number[];
  semanticType: 'personal_info' | 'account_data' | 'dispute_info' | 'payment_history' | 'inquiry_data' | 'mixed';
  pageNumbers: number[];
  tokenCount: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  contextPreserved: boolean;
  relatedChunks: string[];
  structuralElements: {
    tables: TableData[];
    images: ImageData[];
    semanticRegions: SemanticRegion[];
  };
}

export interface ProcessingProgress {
  stage: 'parsing' | 'structure_detection' | 'chunking' | 'embedding' | 'analysis' | 'aggregation' | 'complete';
  progress: number;
  percentage?: number; // Added for compatibility - optional
  currentPage?: number;
  currentChunk?: number;
  totalChunks?: number;
  message: string;
  timeElapsed: number;
  estimatedTimeRemaining?: number;
}

// Import existing types
import type { 
  CreditIssue, 
  AnalysisResult, 
  TextToken, 
  PDFPage 
} from './creditReport';