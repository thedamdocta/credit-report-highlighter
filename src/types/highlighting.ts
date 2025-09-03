// Type definitions for PDF highlighting integration

import type { CreditIssue, TextToken } from './creditReport';

export interface HighlightRegion {
  id: string;
  page: number;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: string;
  opacity: number;
  type: 'highlight' | 'underline' | 'strikeout' | 'squiggly';
  tooltip?: string;
  metadata?: {
    issueId: string;
    severity: 'critical' | 'warning' | 'attention' | 'info';
    category: string;
    relatedIssues?: string[];
  };
}

export interface HighlightGroup {
  id: string;
  name: string;
  color: string;
  regions: HighlightRegion[];
  crossPageLinks: CrossPageLink[];
}

export interface CrossPageLink {
  id: string;
  sourceRegion: HighlightRegion;
  targetRegion: HighlightRegion;
  relationship: string;
  linkType: 'account_dispute' | 'payment_history' | 'inquiry_reference' | 'general';
}

export interface EnhancedIssue extends CreditIssue {
  tokenPositions?: TextToken[];
  semanticContext?: string;
  crossPageLinks?: string[];
  contextualDescription?: string;
  relatedAccountIds?: string[];
  processingMethod?: 'traditional' | 'late_chunking' | 'enhanced';
}

export interface HighlightConfig {
  colors: {
    critical: string;
    warning: string;
    attention: string;
    info: string;
  };
  opacity: {
    default: number;
    hover: number;
    selected: number;
  };
  styles: {
    borderRadius: number;
    borderWidth: number;
    shadowBlur: number;
  };
  crossPageIndicators: {
    enabled: boolean;
    lineColor: string;
    lineWidth: number;
    arrowSize: number;
  };
}

export interface HighlightStrategy {
  name: string;
  description: string;
  capabilities: {
    canModifyPDF: boolean;
    canExport: boolean;
    supportsInteractivity: boolean;
    supportsCrossPageLinks: boolean;
    requiresServer: boolean;
  };
}

export interface CoordinateMapping {
  originalTokens: TextToken[];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  textSpans: TextSpan[];
  confidence: number;
}

export interface TextSpan {
  text: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  tokens: TextToken[];
  lineNumber: number;
}

export interface HighlightingResult {
  success: boolean;
  strategy: string;
  highlightedFile?: File | Blob;
  overlayData?: CanvasHighlightData;
  annotationData?: PDFAnnotationData;
  error?: string;
  metrics?: {
    regionsCreated: number;
    crossPageLinks: number;
    processingTime: number;
    fileSize?: number;
    unifiedStrategy?: {
      primaryStrategy?: string;
      autoSelected?: boolean;
      enhancementsApplied?: string[];
    };
  };
}

export interface CanvasHighlightData {
  pageHighlights: Map<number, HighlightRegion[]>;
  canvasElements: HTMLCanvasElement[];
  interactionHandlers: Map<string, (event: MouseEvent) => void>;
}

export interface PDFAnnotationData {
  annotations: PDFAnnotation[];
  layerData: any;
  exportFormat: 'xfdf' | 'fdf' | 'json';
}

export interface PDFAnnotation {
  id: string;
  type: 'Highlight' | 'Underline' | 'StrikeOut' | 'Squiggly';
  page: number;
  rect: number[];
  color: number[];
  contents: string;
  author?: string;
  creationDate?: Date;
  modificationDate?: Date;
  opacity?: number;
}

export interface HighlightService {
  strategy: HighlightStrategy;
  
  // Core highlighting methods
  highlightIssues(
    pdfFile: File,
    issues: EnhancedIssue[],
    config?: HighlightConfig
  ): Promise<HighlightingResult>;
  
  // Coordinate mapping
  mapIssueToRegions(
    issue: EnhancedIssue,
    pageTokens: Map<number, TextToken[]>
  ): HighlightRegion[];
  
  // Cross-page relationships
  createCrossPageLinks(
    issues: EnhancedIssue[],
    regions: HighlightRegion[]
  ): CrossPageLink[];
  
  // Export/Import
  exportHighlights(result: HighlightingResult): Promise<Blob>;
  importHighlights(file: File): Promise<HighlightRegion[]>;
  
  // Utility methods
  validateCoordinates(region: HighlightRegion): boolean;
  optimizeRegions(regions: HighlightRegion[]): HighlightRegion[];
}

export interface HighlightServiceFactory {
  createPyMuPDFService(): HighlightService;
  createCanvasOverlayService(): HighlightService;
  createPDFJSAnnotationService(): HighlightService;
  createUnifiedService(): HighlightService;
}