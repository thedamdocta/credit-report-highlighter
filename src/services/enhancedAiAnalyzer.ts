// Enhanced AI Analyzer for Large Credit Reports with Streaming Support
import { API_CONFIG } from '../config/api';
import { getOpenAIKey } from '../settings/openai';
import type {
  EnhancedPDFPage,
  DocumentStructure,
  ProcessingProgress,
  EnhancedAnalysisResult
} from '../types/enhancedCreditReport';
import type { AnalysisType, PDFDocument } from '../types/creditReport';
import { EnhancedPDFProcessor } from './enhancedPdfProcessor';
import { EnhancedLateChunkingService } from './enhancedLateChunkingService';

export interface StreamingAnalysisConfig {
  enableProgressiveResults: boolean;
  enableBackgroundProcessing: boolean;
  maxConcurrentRequests: number;
  streamingBatchSize: number;
  enableRealTimeUpdates: boolean;
  fallbackToTraditional: boolean;
  timeoutMs: number;
}

export class EnhancedAIAnalyzer {
  private apiKey: string;
  private baseUrl: string;
  private config: StreamingAnalysisConfig;
  private pdfProcessor: EnhancedPDFProcessor;
  private lateChunkingService: EnhancedLateChunkingService;
  private activeProcesses: Map<string, AbortController> = new Map();
  private progressCallbacks: Map<string, (progress: ProcessingProgress) => void> = new Map();

  constructor(config?: Partial<StreamingAnalysisConfig>) {
    this.apiKey = API_CONFIG.OPENAI_API_KEY;
    this.baseUrl = API_CONFIG.OPENAI_BASE_URL;
    
    this.config = {
      enableProgressiveResults: true,
      enableBackgroundProcessing: true,
      maxConcurrentRequests: 5,
      streamingBatchSize: 10,
      enableRealTimeUpdates: true,
      fallbackToTraditional: true,
      timeoutMs: 600000, // 10 minutes for large documents
      ...config
    };

    // Initialize processors
    this.pdfProcessor = new EnhancedPDFProcessor(
      (progress) => this.broadcastProgress('pdf_processing', progress)
    );
    
    this.lateChunkingService = new EnhancedLateChunkingService(
      {
        enableHierarchicalContext: true,
        enableDocumentEmbedding: true,
        maxTokensPerChunk: 100000,
        costOptimization: false
      },
      (progress) => this.broadcastProgress('chunking', progress)
    );
  }

  async analyzeEnhancedCreditReport(
    file: File,
    analysisType: AnalysisType,
    customPrompt?: string,
    progressCallback?: (progress: ProcessingProgress) => void,
    processId: string = `process-${Date.now()}`
  ): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();
    
    // Register progress callback
    if (progressCallback) {
      this.progressCallbacks.set(processId, progressCallback);
    }
    
    // Create abort controller for this process
    const abortController = new AbortController();
    this.activeProcesses.set(processId, abortController);

    try {
      this.updateProgress(processId, {
        stage: 'parsing',
        progress: 0,
        message: 'Starting enhanced credit report analysis...',
        timeElapsed: 0
      });

      // Step 1: Enhanced PDF processing
      const { document, enhancedDocument } = await this.pdfProcessor.processLargePDF(file);
      
      this.updateProgress(processId, {
        stage: 'parsing',
        progress: 30,
        message: `Processed ${enhancedDocument.totalPages} pages with enhanced analysis`,
        timeElapsed: Date.now() - startTime
      });

      // Step 2: Determine processing strategy
      const processingStrategy = this.determineProcessingStrategy(
        enhancedDocument.pages,
        enhancedDocument.structure
      );

      this.updateProgress(processId, {
        stage: 'chunking',
        progress: 35,
        message: `Using ${processingStrategy} processing strategy`,
        timeElapsed: Date.now() - startTime
      });

      // Step 3: Enhanced analysis based on strategy
      let result: EnhancedAnalysisResult;
      
      if (processingStrategy === 'enhanced_late_chunking') {
        result = await this.performEnhancedLateChunkingAnalysis(
          enhancedDocument.pages,
          enhancedDocument.structure,
          analysisType,
          customPrompt,
          processId
        );
      } else if (processingStrategy === 'streaming' && this.config.enableProgressiveResults) {
        result = await this.performStreamingAnalysis(
          enhancedDocument.pages,
          enhancedDocument.structure,
          analysisType,
          processId,
          customPrompt
        );
      } else if (this.config.fallbackToTraditional) {
        // Fallback to traditional analysis for smaller documents
        result = await this.performTraditionalAnalysisWithEnhancements(
          document,
          analysisType,
          customPrompt
        );
      } else {
        throw new Error('No suitable processing strategy available');
      }

      // Step 4: Post-processing and validation
      const validatedResult = await this.validateAndEnhanceResult(result, enhancedDocument);

      this.updateProgress(processId, {
        stage: 'complete',
        progress: 100,
        message: `Analysis complete: ${validatedResult.totalIssues} issues found`,
        timeElapsed: Date.now() - startTime
      });

      // Clean up
      this.cleanup(processId);

      return validatedResult;

    } catch (error) {
      console.error('Enhanced AI Analysis Error:', error);
      this.cleanup(processId);
      
      if (this.config.fallbackToTraditional) {
        console.log('Attempting fallback to traditional analysis...');
        return this.performFallbackAnalysis(file, analysisType, customPrompt);
      }
      
      throw new Error(`Enhanced analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private determineProcessingStrategy(
    pages: EnhancedPDFPage[],
    structure: DocumentStructure
  ): 'enhanced_late_chunking' | 'streaming' | 'traditional' {
    const totalText = pages.reduce((sum, p) => sum + p.text.length, 0);
    const complexityScore = this.calculateComplexityScore(pages, structure);

    // Enhanced late chunking for very large or complex documents
    if (totalText > 50000 || pages.length > 20 || complexityScore > 8) {
      return 'enhanced_late_chunking';
    }
    
    // Streaming for medium-sized documents
    if (totalText > 20000 || pages.length > 10 || complexityScore > 4) {
      return 'streaming';
    }
    
    // Traditional for smaller documents
    return 'traditional';
  }

  private calculateComplexityScore(pages: EnhancedPDFPage[], structure: DocumentStructure): number {
    let score = 0;
    
    // Add points for various complexity factors
    score += pages.length * 0.5; // Page count
    score += pages.reduce((sum, p) => sum + p.tables.length, 0) * 2; // Tables
    score += pages.reduce((sum, p) => sum + p.images.length, 0) * 1; // Images
    score += structure.accountSummaries.length * 1.5; // Accounts
    score += structure.disputeHistory.length * 2; // Disputes (high complexity)
    score += pages.filter(p => p.contentComplexity === 'very_complex').length * 3;
    
    return score;
  }

  private async performEnhancedLateChunkingAnalysis(
    pages: EnhancedPDFPage[],
    structure: DocumentStructure,
    analysisType: AnalysisType,
    customPrompt?: string,
    processId?: string
  ): Promise<EnhancedAnalysisResult> {
    this.updateProgress(processId!, {
      stage: 'analysis',
      progress: 40,
      message: 'Performing enhanced late chunking analysis...',
      timeElapsed: 0
    });

    return await this.lateChunkingService.analyzeLargeDocumentWithLateChunking(
      pages,
      structure,
      analysisType,
      customPrompt
    );
  }

  private async performStreamingAnalysis(
    pages: EnhancedPDFPage[],
    structure: DocumentStructure,
    analysisType: AnalysisType,
    processId: string,
    customPrompt?: string
  ): Promise<EnhancedAnalysisResult> {
    this.updateProgress(processId, {
      stage: 'analysis',
      progress: 40,
      message: 'Starting streaming analysis...',
      timeElapsed: 0
    });

    // Process pages in batches with streaming
    const results: any[] = [];
    const batchSize = this.config.streamingBatchSize;
    
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      
      this.updateProgress(processId, {
        stage: 'analysis',
        progress: 40 + ((i / pages.length) * 50),
        message: `Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pages.length/batchSize)}...`,
        timeElapsed: 0
      });

      // Process batch with enhanced context
      const batchResult = await this.processBatchWithContext(
        batch,
        structure,
        analysisType,
        customPrompt,
        i > 0 ? pages.slice(Math.max(0, i - 2), i) : [] // Previous context
      );
      
      results.push(batchResult);

      // Emit progressive results if enabled
      if (this.config.enableRealTimeUpdates) {
        this.emitProgressiveResult(processId, this.aggregatePartialResults(results));
      }
    }

    // Aggregate all results
    return this.aggregateStreamingResults(results, structure, pages.length);
  }

  private async processBatchWithContext(
    batch: EnhancedPDFPage[],
    structure: DocumentStructure,
    analysisType: AnalysisType,
    customPrompt?: string,
    previousContext: EnhancedPDFPage[] = []
  ): Promise<any> {
    // Create context-aware prompt for this batch
    const contextualContent = [
      ...previousContext.map(p => `Previous Context Page ${p.pageNumber}: ${p.text.substring(0, 500)}`),
      ...batch.map(p => `Page ${p.pageNumber}: ${p.text}`)
    ].join('\n\n');

    const prompt = this.createStreamingPrompt(
      contextualContent,
      analysisType,
      customPrompt,
      structure,
      batch.map(p => p.pageNumber)
    );

    return await this.callOpenAIWithRetry(prompt);
  }

  private createStreamingPrompt(
    content: string,
    analysisType: AnalysisType,
    customPrompt?: string,
    structure?: DocumentStructure,
    pageNumbers: number[] = []
  ): string {
    const basePrompt = `You are an expert credit report analyst with advanced context awareness. 

STREAMING ANALYSIS CONTEXT:
- Document Type: ${structure?.documentType || 'Credit Report'}
- Pages in this batch: ${pageNumbers.join(', ')}
- Total document pages: ${structure?.totalPages || 'Unknown'}
- This is part of a larger streaming analysis maintaining cross-page context.

CONTENT TO ANALYZE:
${content}

`;

    const typeSpecificPrompts = {
      full: `Conduct comprehensive analysis of this batch while maintaining context awareness:
1. FCRA violations with cross-page relationship understanding
2. Collection issues considering document-wide patterns  
3. Dispute problems with complete context
4. Legal concerns leveraging broader document understanding

Important: Consider context from previous pages when analyzing current content.`,

      fcra: `Focus on FCRA compliance across this batch:
1. Section 611 violations (dispute procedures)
2. Section 615 violations (accuracy requirements)  
3. Section 623 violations (reporting requirements)
4. Other compliance issues with contextual awareness`,

      collections: `Analyze collection accounts in this batch:
1. FDCPA compliance issues
2. Account validation problems
3. Statute of limitations concerns
4. Communication violations`,

      disputes: `Examine dispute information in this batch:
1. Investigation procedure compliance
2. Documentation completeness
3. Resolution tracking
4. FCRA dispute requirements`,

      custom: customPrompt || 'Analyze based on custom requirements with context awareness.'
    };

    return basePrompt + (typeSpecificPrompts[analysisType] || typeSpecificPrompts.full) + `

Format as JSON:
{
  "batchSummary": "summary of findings in this batch",
  "totalIssues": number,
  "critical": number,
  "warning": number, 
  "attention": number,
  "info": number,
  "issues": [
    {
      "id": "unique-id",
      "type": "critical|warning|attention|info",
      "category": "FCRA_violation|collection|dispute|accuracy|other",
      "description": "detailed description",
      "severity": "high|medium|low",
      "pageNumber": number,
      "anchorText": "exact quote (<=120 chars)",
      "fcraSection": "specific FCRA section if applicable",
      "recommendedAction": "specific action",
      "contextRelationship": "how this relates to other document sections"
    }
  ],
  "contextContinuity": "description of context maintained from previous batches",
  "confidence": number between 0-1
}`;
  }

  private async performTraditionalAnalysisWithEnhancements(
    document: PDFDocument,
    analysisType: AnalysisType,
    customPrompt?: string
  ): Promise<EnhancedAnalysisResult> {
    // Enhanced version of traditional analysis
    const fullText = document.pages
      .map(page => `Page ${page.pageNumber}:\n${page.text}`)
      .join('\n\n');

    const prompt = this.createEnhancedTraditionalPrompt(analysisType, fullText, customPrompt);
    const result = await this.callOpenAIWithRetry(prompt);
    
    // Convert to enhanced result format
    return {
      ...result,
      documentStructure: {
        documentType: 'unknown',
        totalPages: document.totalPages,
        sections: [],
        accountSummaries: [],
        disputeHistory: [],
        paymentHistory: [],
        inquiries: [],
        personalInfo: { name: 'Unknown', addresses: [], pageNumbers: [] },
        creditScores: []
      },
      processingMetrics: {
        totalProcessingTime: 0,
        chunksProcessed: 1,
        tablesAnalyzed: 0,
        imagesProcessed: 0,
        tokensUsed: Math.ceil(fullText.length / 4),
        estimatedCost: 0.01
      },
      structuralIssues: [],
      crossPageRelationships: []
    };
  }

  private createEnhancedTraditionalPrompt(
    analysisType: AnalysisType,
    fullText: string,
    customPrompt?: string
  ): string {
    const basePrompt = `You are an expert credit report analyst specializing in FCRA compliance and consumer protection law.

ENHANCED TRADITIONAL ANALYSIS:
Analyze this complete credit report with attention to cross-page relationships and document-wide patterns.

Credit Report Content:
${fullText}

`;

    const typePrompts = {
      full: `Comprehensive analysis focusing on:
1. FCRA violations and compliance issues
2. Collection account problems
3. Dispute and accuracy issues  
4. Legal concerns with document-wide awareness`,

      fcra: `FCRA compliance focus with complete document context`,
      collections: `Collection account analysis with full document understanding`,
      disputes: `Dispute analysis with cross-page relationship awareness`,
      custom: customPrompt || 'Custom analysis with enhanced document awareness'
    };

    return basePrompt + typePrompts[analysisType] + `

Format response as JSON with enhanced structure:
{
  "totalIssues": number,
  "critical": number,
  "warning": number,
  "attention": number, 
  "info": number,
  "issues": [...],
  "summary": "comprehensive summary",
  "confidence": number,
  "documentAnalysis": {
    "crossPagePatterns": "patterns identified across pages",
    "structuralObservations": "document structure observations",
    "contextualFindings": "findings requiring document-wide context"
  }
}`;
  }

  private async performFallbackAnalysis(
    file: File,
    analysisType: AnalysisType,
    customPrompt?: string
  ): Promise<EnhancedAnalysisResult> {
    console.log('Performing fallback analysis with basic processing...');
    
    try {
      // Use basic PDF processor
      const basicProcessor = new (await import('./pdfProcessor')).PDFProcessor();
      const document = await basicProcessor.processPDF(file);
      
      return await this.performTraditionalAnalysisWithEnhancements(
        document,
        analysisType,
        customPrompt
      );
    } catch (error) {
      throw new Error(`Fallback analysis also failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async callOpenAIWithRetry(prompt: string, maxRetries: number = 3): Promise<any> {
    const apiKey = getOpenAIKey() || this.apiKey;
    if (!apiKey) {
      throw new Error('Missing OpenAI API key');
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5',
            messages: [
              {
                role: 'system',
                content: 'You are an expert credit report analyst. Always respond with valid JSON only.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_completion_tokens: 128000,
            reasoning_effort: 'high',
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const responseText = data.choices[0]?.message?.content || '{}';
        
        return JSON.parse(responseText);

      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  private aggregatePartialResults(results: any[]): any {
    // Aggregate partial results for progressive updates
    const allIssues = results.flatMap(r => r.issues || []);
    
    return {
      totalIssues: allIssues.length,
      critical: allIssues.filter(i => i.type === 'critical').length,
      warning: allIssues.filter(i => i.type === 'warning').length,
      attention: allIssues.filter(i => i.type === 'attention').length,
      info: allIssues.filter(i => i.type === 'info').length,
      issues: allIssues,
      summary: `Partial analysis: ${results.length} batches processed`,
      isPartial: true
    };
  }

  private aggregateStreamingResults(
    results: any[],
    structure: DocumentStructure,
    totalPages: number
  ): EnhancedAnalysisResult {
    const allIssues = results.flatMap(r => r.issues || []);
    const summaries = results.map(r => r.batchSummary).filter(Boolean);
    
    return {
      totalIssues: allIssues.length,
      critical: allIssues.filter(i => i.type === 'critical').length,
      warning: allIssues.filter(i => i.type === 'warning').length,
      attention: allIssues.filter(i => i.type === 'attention').length,
      info: allIssues.filter(i => i.type === 'info').length,
      issues: allIssues,
      summary: `Streaming Analysis Complete:\n${summaries.join('\n')}`,
      confidence: results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length,
      documentStructure: structure,
      processingMetrics: {
        totalProcessingTime: 0,
        chunksProcessed: results.length,
        tablesAnalyzed: 0,
        imagesProcessed: 0,
        tokensUsed: 0,
        estimatedCost: 0
      },
      structuralIssues: [],
      crossPageRelationships: []
    };
  }

  private async validateAndEnhanceResult(
    result: EnhancedAnalysisResult,
    enhancedDocument: any
  ): Promise<EnhancedAnalysisResult> {
    // Add validation and enhancement logic
    return {
      ...result,
      processingMetrics: {
        ...result.processingMetrics,
        tablesAnalyzed: enhancedDocument.pages.reduce((sum: number, p: EnhancedPDFPage) => sum + p.tables.length, 0),
        imagesProcessed: enhancedDocument.pages.reduce((sum: number, p: EnhancedPDFPage) => sum + p.images.length, 0)
      }
    };
  }

  private emitProgressiveResult(processId: string, partialResult: any): void {
    // Emit progressive results for real-time updates
    console.log(`Progressive result for ${processId}:`, partialResult.totalIssues, 'issues found');
  }

  private broadcastProgress(stage: string, progress: ProcessingProgress): void {
    // Broadcast progress to all active callbacks
    this.progressCallbacks.forEach(callback => {
      callback({
        ...progress,
        stage: stage as any
      });
    });
  }

  private updateProgress(processId: string, progress: ProcessingProgress): void {
    const callback = this.progressCallbacks.get(processId);
    if (callback) {
      callback(progress);
    }
  }

  private cleanup(processId: string): void {
    this.activeProcesses.delete(processId);
    this.progressCallbacks.delete(processId);
  }

  // Public methods
  public cancelAnalysis(processId: string): void {
    const controller = this.activeProcesses.get(processId);
    if (controller) {
      controller.abort();
      this.cleanup(processId);
    }
  }

  public getActiveProcesses(): string[] {
    return Array.from(this.activeProcesses.keys());
  }

  public clearAllCaches(): void {
    this.lateChunkingService.clearAllCaches();
    console.log('All enhanced analyzer caches cleared');
  }
}