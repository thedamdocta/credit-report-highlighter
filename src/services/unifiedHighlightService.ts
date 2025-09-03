// Unified Highlighting Service - Orchestrates all highlighting strategies
import type {
  HighlightService,
  HighlightStrategy,
  HighlightRegion,
  EnhancedIssue,
  HighlightingResult,
  HighlightConfig,
  CrossPageLink,
  HighlightServiceFactory
} from '../types/highlighting';
import type { TextToken } from '../types/creditReport';

import { PyMuPDFHighlightService } from './pymuPdfHighlighter';
import { CanvasOverlayHighlightService } from './canvasOverlayHighlighter';
import { PDFJSAnnotationHighlightService } from './pdfjsAnnotationHighlighter';

export type HighlightMode = 'pymupdf' | 'canvas' | 'pdfjs' | 'hybrid' | 'auto';

export interface UnifiedHighlightOptions {
  mode: HighlightMode;
  fallbackMode?: HighlightMode;
  enableCrossPageLinks?: boolean;
  exportFormat?: 'pdf' | 'json' | 'xfdf';
  config?: HighlightConfig;
}

export class UnifiedHighlightService implements HighlightService {
  public strategy: HighlightStrategy = {
    name: 'Unified Multi-Strategy',
    description: 'Intelligent highlighting system that uses the best strategy based on requirements and capabilities',
    capabilities: {
      canModifyPDF: true,
      canExport: true,
      supportsInteractivity: true,
      supportsCrossPageLinks: true,
      requiresServer: false
    }
  };

  private pymupdfService: PyMuPDFHighlightService;
  private canvasService: CanvasOverlayHighlightService;
  private pdfjsService: PDFJSAnnotationHighlightService;
  private currentStrategy: HighlightService | null = null;

  constructor(config?: Partial<HighlightConfig>) {
    this.pymupdfService = new PyMuPDFHighlightService(config);
    this.canvasService = new CanvasOverlayHighlightService(config);
    this.pdfjsService = new PDFJSAnnotationHighlightService(config);
  }

  /**
   * Main highlighting method that intelligently chooses the best strategy
   */
  async highlightIssues(
    pdfFile: File,
    issues: EnhancedIssue[],
    config?: HighlightConfig,
    options?: UnifiedHighlightOptions
  ): Promise<HighlightingResult> {
    const startTime = Date.now();
    const highlightOptions = this.normalizeOptions(options);

    try {
      // Step 1: Analyze requirements and choose strategy
      const chosenStrategy = await this.chooseOptimalStrategy(pdfFile, issues, highlightOptions);
      this.currentStrategy = chosenStrategy.service;

      console.log(`Using highlighting strategy: ${chosenStrategy.service.strategy.name}`);

      // Step 2: Execute highlighting with chosen strategy
      const result = await chosenStrategy.service.highlightIssues(pdfFile, issues, config);

      // Step 3: Handle fallback if needed
      if (!result.success && highlightOptions.fallbackMode) {
        console.log(`Primary strategy failed, trying fallback: ${highlightOptions.fallbackMode}`);
        const fallbackService = this.getServiceForMode(highlightOptions.fallbackMode);
        if (fallbackService && fallbackService !== chosenStrategy.service) {
          const fallbackResult = await fallbackService.highlightIssues(pdfFile, issues, config);
          if (fallbackResult.success) {
            return {
              ...fallbackResult,
              strategy: `${result.strategy} -> ${fallbackResult.strategy} (fallback)`
            };
          }
        }
      }

      // Step 4: Enhance result with unified capabilities
      if (result.success) {
        return await this.enhanceResult(result, pdfFile, issues, highlightOptions);
      }

      return result;

    } catch (error) {
      console.error('Unified Highlighting Error:', error);
      
      return {
        success: false,
        strategy: this.strategy.name,
        error: `Unified highlighting failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Choose the optimal highlighting strategy based on requirements
   */
  private async chooseOptimalStrategy(
    pdfFile: File,
    issues: EnhancedIssue[],
    options: UnifiedHighlightOptions
  ): Promise<{ service: HighlightService; reason: string }> {
    
    if (options.mode !== 'auto') {
      const service = this.getServiceForMode(options.mode);
      if (!service) {
        throw new Error(`Invalid highlighting mode: ${options.mode}`);
      }
      return {
        service,
        reason: `Explicitly requested mode: ${options.mode}`
      };
    }

    // Auto-selection logic
    const fileSize = pdfFile.size;
    const hasComplexIssues = issues.some(issue => 
      issue.crossPageLinks && issue.crossPageLinks.length > 0
    );
    const requiresExport = options.exportFormat === 'pdf';
    const requiresInteractivity = !requiresExport;

    // Decision matrix for auto-selection
    if (requiresExport && fileSize > 50 * 1024 * 1024) {
      // Large files that need PDF export - use PyMuPDF
      return {
        service: this.pymupdfService,
        reason: 'Large file requiring PDF export'
      };
    }

    if (hasComplexIssues && requiresExport) {
      // Complex cross-page relationships requiring permanent highlighting
      return {
        service: this.pymupdfService,
        reason: 'Complex cross-page relationships requiring PDF modification'
      };
    }

    if (requiresInteractivity && !requiresExport) {
      // Interactive viewing without export - use Canvas
      return {
        service: this.canvasService,
        reason: 'Interactive viewing without export requirements'
      };
    }

    if (requiresExport && options.exportFormat === 'xfdf') {
      // Annotation-based export - use PDF.js
      return {
        service: this.pdfjsService,
        reason: 'Annotation-based export requirements'
      };
    }

    // Default to Canvas for most use cases
    return {
      service: this.canvasService,
      reason: 'Default choice for interactive highlighting'
    };
  }

  private getServiceForMode(mode: HighlightMode): HighlightService | null {
    switch (mode) {
      case 'pymupdf':
        return this.pymupdfService;
      case 'canvas':
        return this.canvasService;
      case 'pdfjs':
        return this.pdfjsService;
      default:
        return null;
    }
  }

  private normalizeOptions(options?: UnifiedHighlightOptions): UnifiedHighlightOptions {
    return {
      mode: 'auto',
      fallbackMode: 'canvas',
      enableCrossPageLinks: true,
      exportFormat: 'json',
      ...options
    };
  }

  private async enhanceResult(
    result: HighlightingResult,
    pdfFile: File,
    issues: EnhancedIssue[],
    options: UnifiedHighlightOptions
  ): Promise<HighlightingResult> {
    // Add cross-strategy capabilities if needed
    
    // If primary strategy doesn't support PDF export but it's requested
    if (options.exportFormat === 'pdf' && !result.highlightedFile && this.currentStrategy !== this.pymupdfService) {
      try {
        console.log('Primary strategy cannot export PDF, using PyMuPDF for export...');
        const exportResult = await this.pymupdfService.highlightIssues(pdfFile, issues, options.config);
        if (exportResult.success && exportResult.highlightedFile) {
          result.highlightedFile = exportResult.highlightedFile;
        }
      } catch (error) {
        console.warn('Failed to enhance result with PDF export:', error);
      }
    }

    // Add metadata about strategy choice
    result.metrics = {
      regionsCreated: result.metrics?.regionsCreated || 0,
      crossPageLinks: result.metrics?.crossPageLinks || 0,
      processingTime: result.metrics?.processingTime || 0,
      ...result.metrics,
      unifiedStrategy: {
        primaryStrategy: this.currentStrategy?.strategy.name,
        autoSelected: options.mode === 'auto',
        enhancementsApplied: result.highlightedFile ? ['pdf_export'] : []
      }
    };

    return result;
  }

  // Delegate methods to current strategy

  mapIssueToRegions(
    issue: EnhancedIssue,
    pageTokens: Map<number, TextToken[]>
  ): HighlightRegion[] {
    if (!this.currentStrategy) {
      return this.canvasService.mapIssueToRegions(issue, pageTokens);
    }
    return this.currentStrategy.mapIssueToRegions(issue, pageTokens);
  }

  createCrossPageLinks(
    issues: EnhancedIssue[],
    regions: HighlightRegion[]
  ): CrossPageLink[] {
    if (!this.currentStrategy) {
      return this.canvasService.createCrossPageLinks(issues, regions);
    }
    return this.currentStrategy.createCrossPageLinks(issues, regions);
  }

  async exportHighlights(result: HighlightingResult, format?: 'pdf' | 'json' | 'xfdf'): Promise<Blob> {
    if (!this.currentStrategy) {
      throw new Error('No active highlighting strategy');
    }

    // Route to appropriate service based on export format
    if (format === 'pdf' && result.highlightedFile) {
      return result.highlightedFile;
    }

    if (format === 'xfdf' && this.pdfjsService && result.annotationData) {
      return await this.pdfjsService.exportHighlights(result);
    }

    // Default to current strategy
    return await this.currentStrategy.exportHighlights(result);
  }

  async importHighlights(file: File): Promise<HighlightRegion[]> {
    // Try to determine format and use appropriate service
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xfdf')) {
      return await this.pdfjsService.importHighlights(file);
    }
    
    if (fileName.endsWith('.json')) {
      return await this.canvasService.importHighlights(file);
    }

    // Default to Canvas service for JSON format
    return await this.canvasService.importHighlights(file);
  }

  validateCoordinates(region: HighlightRegion): boolean {
    return this.canvasService.validateCoordinates(region);
  }

  optimizeRegions(regions: HighlightRegion[]): HighlightRegion[] {
    return this.canvasService.optimizeRegions(regions);
  }

  // Unified convenience methods

  /**
   * Create highlights optimized for interactive viewing
   */
  async createInteractiveHighlights(
    pdfFile: File,
    issues: EnhancedIssue[],
    config?: HighlightConfig
  ): Promise<HighlightingResult> {
    return await this.highlightIssues(pdfFile, issues, config, {
      mode: 'canvas',
      enableCrossPageLinks: true,
      exportFormat: 'json'
    });
  }

  /**
   * Create highlights with PDF export capability
   */
  async createExportableHighlights(
    pdfFile: File,
    issues: EnhancedIssue[],
    config?: HighlightConfig
  ): Promise<HighlightingResult> {
    return await this.highlightIssues(pdfFile, issues, config, {
      mode: 'pymupdf',
      fallbackMode: 'pdfjs',
      enableCrossPageLinks: true,
      exportFormat: 'pdf'
    });
  }

  /**
   * Create annotation-based highlights
   */
  async createAnnotationHighlights(
    pdfFile: File,
    issues: EnhancedIssue[],
    config?: HighlightConfig
  ): Promise<HighlightingResult> {
    return await this.highlightIssues(pdfFile, issues, config, {
      mode: 'pdfjs',
      fallbackMode: 'canvas',
      enableCrossPageLinks: false, // PDF.js has limited cross-page support
      exportFormat: 'xfdf'
    });
  }

  /**
   * Hybrid approach - interactive viewing with PDF export option
   */
  async createHybridHighlights(
    pdfFile: File,
    issues: EnhancedIssue[],
    config?: HighlightConfig
  ): Promise<{ 
    interactive: HighlightingResult; 
    exportable: HighlightingResult; 
  }> {
    const [interactive, exportable] = await Promise.all([
      this.createInteractiveHighlights(pdfFile, issues, config),
      this.createExportableHighlights(pdfFile, issues, config)
    ]);

    return { interactive, exportable };
  }

  /**
   * Get available highlighting strategies
   */
  getAvailableStrategies(): HighlightStrategy[] {
    return [
      this.pymupdfService.strategy,
      this.canvasService.strategy,
      this.pdfjsService.strategy,
      this.strategy
    ];
  }

  /**
   * Get strategy recommendations based on file and requirements
   */
  async getStrategyRecommendations(
    pdfFile: File,
    issues: EnhancedIssue[],
    requirements: {
      needsExport?: boolean;
      needsInteractivity?: boolean;
      hasCrossPageLinks?: boolean;
      performanceCritical?: boolean;
    }
  ): Promise<{
    recommended: HighlightStrategy;
    alternatives: HighlightStrategy[];
    reasoning: string;
  }> {
    const fileSize = pdfFile.size;
    const isLargeFile = fileSize > 50 * 1024 * 1024;
    const hasComplexIssues = issues.some(issue => 
      issue.crossPageLinks && issue.crossPageLinks.length > 0
    );

    let recommended: HighlightStrategy;
    let reasoning: string;
    let alternatives: HighlightStrategy[] = [];

    if (requirements.needsExport && (isLargeFile || hasComplexIssues)) {
      recommended = this.pymupdfService.strategy;
      reasoning = 'PyMuPDF recommended for large files or complex cross-page relationships requiring PDF export';
      alternatives = [this.pdfjsService.strategy];
    } else if (requirements.needsInteractivity && !requirements.needsExport) {
      recommended = this.canvasService.strategy;
      reasoning = 'Canvas overlay recommended for interactive highlighting without export requirements';
      alternatives = [this.pdfjsService.strategy];
    } else if (requirements.performanceCritical) {
      recommended = this.canvasService.strategy;
      reasoning = 'Canvas overlay recommended for performance-critical applications';
      alternatives = [this.pdfjsService.strategy, this.pymupdfService.strategy];
    } else {
      recommended = this.strategy;
      reasoning = 'Unified service recommended for automatic strategy selection';
      alternatives = [
        this.pymupdfService.strategy,
        this.canvasService.strategy,
        this.pdfjsService.strategy
      ];
    }

    return { recommended, alternatives, reasoning };
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    this.canvasService.cleanup();
    this.pdfjsService.cleanup();
    this.currentStrategy = null;
  }
}

// Factory implementation for creating highlighting services
export class HighlightServiceFactoryImpl implements HighlightServiceFactory {
  createPyMuPDFService(): HighlightService {
    return new PyMuPDFHighlightService();
  }

  createCanvasOverlayService(): HighlightService {
    return new CanvasOverlayHighlightService();
  }

  createPDFJSAnnotationService(): HighlightService {
    return new PDFJSAnnotationHighlightService();
  }

  createUnifiedService(): HighlightService {
    return new UnifiedHighlightService();
  }
}

// Export factory instance
export const highlightServiceFactory = new HighlightServiceFactoryImpl();