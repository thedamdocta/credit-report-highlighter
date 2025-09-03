// Type definitions for Credit Report Analysis System

export interface CreditIssue {
  id: string;
  type: 'critical' | 'warning' | 'attention' | 'info';
  category: 'FCRA_violation' | 'collection' | 'dispute' | 'accuracy' | 'other';
  description: string;
  severity: 'high' | 'medium' | 'low';
  pageNumber: number;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fcraSection?: string;
  recommendedAction?: string;
}

export interface AnalysisResult {
  totalIssues: number;
  critical: number;
  warning: number;
  attention: number;
  info: number;
  issues: CreditIssue[];
  processedPdfUrl?: string;
  summary: string;
  confidence: number;
}

export interface PDFProcessingRequest {
  file: File;
  analysisType: 'full' | 'fcra' | 'collections' | 'disputes' | 'custom';
  customPrompt?: string;
}

export interface PDFHighlightRequest {
  file: File;
  highlights: CreditIssue[];
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime?: number;
}

export interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: AnalysisResult;
}

export interface PDFDocument {
  pages: PDFPage[];
  totalPages: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

export interface PDFPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
  fontSize?: number;
  rotation?: number;
}

export interface HighlightPosition {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export type AnalysisType = 'full' | 'fcra' | 'collections' | 'disputes' | 'custom';
