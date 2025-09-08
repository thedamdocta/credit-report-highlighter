// Enhanced Late Chunking Service with Hierarchical Context Preservation
import { API_CONFIG } from '../config/api';
import { getOpenAIKey } from '../settings/openai';
import type { 
  EnhancedChunk, 
  StreamingChunkConfig, 
  EnhancedPDFPage, 
  DocumentStructure,
  ProcessingProgress,
  EnhancedAnalysisResult
} from '../types/enhancedCreditReport';
import type { AnalysisType } from '../types/creditReport';
import { AdvancedChunkingService } from './advancedChunkingService';

export interface EnhancedLateChunkingConfig extends StreamingChunkConfig {
  embeddingModel: string;
  analysisModel: string;
  enableHierarchicalContext: boolean;
  enableDocumentEmbedding: boolean;
  hierarchicalContextLayers: number;
  contextPoolingStrategy: 'average' | 'weighted' | 'attention';
  preserveSemanticBoundaries: boolean;
  enableCrossChunkContext: boolean;
  maxRetries: number;
  costOptimization: boolean;
}

export class EnhancedLateChunkingService {
  private apiKey: string;
  private baseUrl: string;
  private config: EnhancedLateChunkingConfig;
  private advancedChunker: AdvancedChunkingService;
  private documentEmbeddingCache: Map<string, number[]> = new Map();
  private hierarchicalContextCache: Map<string, any> = new Map();
  private progressCallback?: (progress: ProcessingProgress) => void;

  constructor(
    config?: Partial<EnhancedLateChunkingConfig>,
    progressCallback?: (progress: ProcessingProgress) => void
  ) {
    this.apiKey = API_CONFIG.OPENAI_API_KEY;
    this.baseUrl = API_CONFIG.OPENAI_BASE_URL;
    this.progressCallback = progressCallback;
    
    this.config = {
      maxTokensPerChunk: 100000, // Large context window for late chunking
      overlapTokens: 5000,       // Significant overlap for context preservation
      priorityRegions: [],
      compressionRatio: 0.8,
      adaptiveChunking: true,
      preserveTableIntegrity: true,
      crossPageContextWindow: 10, // Expanded context window
      embeddingModel: 'text-embedding-3-large',
      analysisModel: 'gpt-5',
      enableHierarchicalContext: true,
      enableDocumentEmbedding: true,
      hierarchicalContextLayers: 3, // Document -> Section -> Chunk
      contextPoolingStrategy: 'weighted',
      preserveSemanticBoundaries: true,
      enableCrossChunkContext: true,
      maxRetries: 3,
      costOptimization: false,
      ...config
    };

    this.advancedChunker = new AdvancedChunkingService(
      {
        maxTokensPerChunk: this.config.maxTokensPerChunk,
        overlapTokens: this.config.overlapTokens,
        adaptiveChunking: this.config.adaptiveChunking,
        preserveTableIntegrity: this.config.preserveTableIntegrity,
        crossPageContextWindow: this.config.crossPageContextWindow,
        embeddingModel: this.config.embeddingModel,
        analysisModel: this.config.analysisModel,
        enableParallelProcessing: true,
        enableSmartCaching: true,
        costOptimization: this.config.costOptimization
      },
      progressCallback
    );
  }

  async analyzeLargeDocumentWithLateChunking(
    pages: EnhancedPDFPage[],
    documentStructure: DocumentStructure,
    analysisType: AnalysisType,
    customPrompt?: string
  ): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();

    this.updateProgress({
      stage: 'parsing',
      progress: 0,
      message: 'Starting enhanced late chunking analysis...',
      timeElapsed: 0
    });

    try {
      // Step 1: Generate document-level embedding for global context
      const documentEmbedding = this.config.enableDocumentEmbedding 
        ? await this.generateDocumentEmbedding(pages)
        : null;

      // Step 2: Create hierarchical chunks with context preservation
      const { chunks } = await this.advancedChunker.processLargeDocument(pages, documentStructure);

      // Step 3: Apply late chunking strategy to preserve context
      const contextEnhancedChunks = await this.applyLateChunkingStrategy(
        chunks, 
        documentEmbedding,
        documentStructure
      );

      // Step 4: Analyze chunks with preserved context
      const chunkAnalyses = await this.analyzeChunksWithPreservedContext(
        contextEnhancedChunks,
        analysisType,
        customPrompt,
        documentStructure
      );

      // Step 5: Aggregate results with hierarchical awareness
      const aggregatedResult = await this.aggregateHierarchicalResults(
        chunkAnalyses,
        documentStructure,
        pages.length
      );

      const processingTime = Date.now() - startTime;

      this.updateProgress({
        stage: 'complete',
        progress: 100,
        message: 'Enhanced late chunking analysis complete',
        timeElapsed: processingTime
      });

      return {
        ...aggregatedResult,
        documentStructure,
        processingMetrics: {
          totalProcessingTime: processingTime,
          chunksProcessed: contextEnhancedChunks.length,
          tablesAnalyzed: pages.reduce((sum, p) => sum + p.tables.length, 0),
          imagesProcessed: pages.reduce((sum, p) => sum + p.images.length, 0),
          tokensUsed: contextEnhancedChunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
          estimatedCost: this.estimateProcessingCost(contextEnhancedChunks)
        },
        structuralIssues: [],
        crossPageRelationships: this.identifyCrossPageRelationships(contextEnhancedChunks)
      };

    } catch (error) {
      console.error('Enhanced Late Chunking Analysis Error:', error);
      throw new Error(`Failed to analyze document with enhanced late chunking: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateDocumentEmbedding(pages: EnhancedPDFPage[]): Promise<number[] | null> {
    this.updateProgress({
      stage: 'embedding',
      progress: 10,
      message: 'Generating document-level embedding for global context...',
      timeElapsed: 0
    });

    try {
      // Create a condensed representation of the entire document
      const documentSummary = this.createDocumentSummary(pages);
      
      // Check cache
      const cacheKey = this.createCacheKey(documentSummary);
      if (this.documentEmbeddingCache.has(cacheKey)) {
        return this.documentEmbeddingCache.get(cacheKey)!;
      }

      const apiKey = getOpenAIKey() || this.apiKey;
      if (!apiKey) {
        console.warn('No API key available for document embedding');
        return null;
      }

      const model = this.config.costOptimization ? 'text-embedding-3-small' : this.config.embeddingModel;

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: documentSummary,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        throw new Error(`Document embedding API error: ${response.status}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Cache the result
      this.documentEmbeddingCache.set(cacheKey, embedding);

      return embedding;

    } catch (error) {
      console.warn('Failed to generate document embedding:', error);
      return null;
    }
  }

  private createDocumentSummary(pages: EnhancedPDFPage[]): string {
    // Create a condensed summary that captures the essence of the document
    let summary = 'Credit Report Document Summary:\n\n';

    // Extract key information from each page
    pages.slice(0, 10).forEach(page => { // Limit to first 10 pages for summary
      const pageText = page.text.substring(0, 500); // Truncate page content
      summary += `Page ${page.pageNumber}: ${pageText}\n`;

      // Add table summaries
      page.tables.forEach(table => {
        summary += `Table (${table.tableType}): ${table.headers.join(', ')}\n`;
      });

      // Add semantic region info
      page.semanticRegions.forEach(region => {
        if (region.importance === 'critical' || region.importance === 'high') {
          summary += `${region.type}: ${region.content.substring(0, 200)}\n`;
        }
      });
    });

    // Ensure it fits within embedding model limits
    return summary.length > 8000 ? summary.substring(0, 8000) : summary;
  }

  private async applyLateChunkingStrategy(
    chunks: EnhancedChunk[],
    documentEmbedding: number[] | null,
    documentStructure: DocumentStructure
  ): Promise<EnhancedChunk[]> {
    this.updateProgress({
      stage: 'chunking',
      progress: 40,
      message: 'Applying late chunking strategy for context preservation...',
      timeElapsed: 0
    });

    const contextEnhancedChunks: EnhancedChunk[] = [];

    for (const chunk of chunks) {
      // Step 1: Create hierarchical context layers
      const hierarchicalContext = this.config.enableHierarchicalContext
        ? await this.buildHierarchicalContext(chunk, chunks, documentStructure)
        : null;

      // Step 2: Pool embeddings with document context
      const contextualEmbedding = documentEmbedding && chunk.embedding
        ? this.poolEmbeddingWithDocumentContext(chunk.embedding, documentEmbedding, chunk)
        : chunk.embedding;

      // Step 3: Add cross-chunk context relationships
      const crossChunkContext = this.config.enableCrossChunkContext
        ? this.establishCrossChunkContext(chunk, chunks)
        : [];

      // Step 4: Preserve semantic boundaries
      const enhancedContent = this.config.preserveSemanticBoundaries
        ? await this.enhanceContentWithSemanticContext(chunk, hierarchicalContext)
        : chunk.content;

      contextEnhancedChunks.push({
        ...chunk,
        embedding: contextualEmbedding,
        content: enhancedContent,
        relatedChunks: [...chunk.relatedChunks, ...crossChunkContext],
        contextPreserved: true
      });
    }

    return contextEnhancedChunks;
  }

  private async buildHierarchicalContext(
    chunk: EnhancedChunk,
    allChunks: EnhancedChunk[],
    documentStructure: DocumentStructure
  ): Promise<any> {
    const context = {
      documentLevel: {},
      sectionLevel: {},
      chunkLevel: {},
      relationships: []
    };

    // Document-level context
    context.documentLevel = {
      type: documentStructure.documentType,
      totalPages: documentStructure.totalPages,
      sectionsCount: documentStructure.sections.length,
      accountsCount: documentStructure.accountSummaries.length,
      disputesCount: documentStructure.disputeHistory.length
    };

    // Section-level context
    const relatedSections = documentStructure.sections.filter(section =>
      chunk.pageNumbers.some(pageNum => 
        pageNum >= section.startPage && pageNum <= section.endPage
      )
    );

    context.sectionLevel = {
      sections: relatedSections.map(s => ({
        name: s.name,
        type: s.type,
        importance: s.importance,
        pageRange: `${s.startPage}-${s.endPage}`
      }))
    };

    // Chunk-level context (neighboring chunks)
    const neighboringChunks = allChunks.filter(otherChunk => 
      otherChunk.id !== chunk.id &&
      otherChunk.pageNumbers.some(pageNum => 
        chunk.pageNumbers.some(chunkPage => Math.abs(pageNum - chunkPage) <= 2)
      )
    );

    context.chunkLevel = {
      neighbors: neighboringChunks.slice(0, 3).map(c => ({ // Limit to 3 neighbors
        id: c.id,
        semanticType: c.semanticType,
        priority: c.priority,
        summary: c.content.substring(0, 100) + '...'
      }))
    };

    return context;
  }

  private poolEmbeddingWithDocumentContext(
    chunkEmbedding: number[],
    documentEmbedding: number[],
    chunk: EnhancedChunk
  ): number[] {
    const strategy = this.config.contextPoolingStrategy;
    
    switch (strategy) {
      case 'weighted':
        return this.weightedPooling(chunkEmbedding, documentEmbedding, chunk);
      case 'attention':
        return this.attentionPooling(chunkEmbedding, documentEmbedding, chunk);
      case 'average':
      default:
        return this.averagePooling(chunkEmbedding, documentEmbedding);
    }
  }

  private weightedPooling(
    chunkEmbedding: number[],
    documentEmbedding: number[],
    chunk: EnhancedChunk
  ): number[] {
    // Weight based on chunk priority and semantic type
    const chunkWeight = this.getChunkWeight(chunk);
    const documentWeight = 1 - chunkWeight;

    return chunkEmbedding.map((value, index) =>
      value * chunkWeight + documentEmbedding[index] * documentWeight
    );
  }

  private attentionPooling(
    chunkEmbedding: number[],
    documentEmbedding: number[],
    chunk: EnhancedChunk
  ): number[] {
    // Simplified attention mechanism
    const similarity = this.calculateCosineSimilarity(chunkEmbedding, documentEmbedding);
    const attentionWeight = Math.max(0.3, similarity); // Minimum 30% chunk weight

    return chunkEmbedding.map((value, index) =>
      value * attentionWeight + documentEmbedding[index] * (1 - attentionWeight)
    );
  }

  private averagePooling(chunkEmbedding: number[], documentEmbedding: number[]): number[] {
    return chunkEmbedding.map((value, index) =>
      (value + documentEmbedding[index]) / 2
    );
  }

  private getChunkWeight(chunk: EnhancedChunk): number {
    // Assign weights based on priority and semantic type
    const priorityWeights = {
      critical: 0.9,
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };

    const typeWeights = {
      personal_info: 0.9,
      account_data: 0.8,
      dispute_info: 0.9,
      payment_history: 0.7,
      inquiry_data: 0.6,
      mixed: 0.5
    };

    return Math.min(0.9, 
      (priorityWeights[chunk.priority] + typeWeights[chunk.semanticType]) / 2
    );
  }

  private establishCrossChunkContext(
    chunk: EnhancedChunk,
    allChunks: EnhancedChunk[]
  ): string[] {
    const contextChunks: string[] = [];

    // Find chunks that should maintain context relationships
    allChunks.forEach(otherChunk => {
      if (chunk.id !== otherChunk.id) {
        // Same semantic type on adjacent pages
        if (chunk.semanticType === otherChunk.semanticType &&
            this.areChunksContextuallyRelated(chunk, otherChunk)) {
          contextChunks.push(otherChunk.id);
        }

        // Account-dispute relationships
        if ((chunk.semanticType === 'account_data' && otherChunk.semanticType === 'dispute_info') ||
            (chunk.semanticType === 'dispute_info' && otherChunk.semanticType === 'account_data')) {
          if (this.containsRelatedIdentifiers(chunk.content, otherChunk.content)) {
            contextChunks.push(otherChunk.id);
          }
        }
      }
    });

    return contextChunks.slice(0, 5); // Limit cross-chunk context
  }

  private async enhanceContentWithSemanticContext(
    chunk: EnhancedChunk,
    hierarchicalContext: any
  ): Promise<string> {
    if (!hierarchicalContext) return chunk.content;

    let enhancedContent = chunk.content;

    // Add contextual information to the beginning of the chunk
    enhancedContent = `
CONTEXT INFORMATION:
- Document Type: ${hierarchicalContext.documentLevel.type}
- Section: ${hierarchicalContext.sectionLevel.sections.map((s: any) => s.name).join(', ')}
- Chunk Type: ${chunk.semanticType}
- Priority: ${chunk.priority}
- Pages: ${chunk.pageNumbers.join(', ')}

RELATED CONTEXT:
${hierarchicalContext.chunkLevel.neighbors.map((n: any) => 
  `- ${n.semanticType}: ${n.summary}`
).join('\n')}

ORIGINAL CONTENT:
${chunk.content}`;

    return enhancedContent;
  }

  private async analyzeChunksWithPreservedContext(
    chunks: EnhancedChunk[],
    analysisType: AnalysisType,
    customPrompt?: string,
    documentStructure?: DocumentStructure
  ): Promise<any[]> {
    this.updateProgress({
      stage: 'analysis',
      progress: 60,
      message: 'Analyzing chunks with preserved context...',
      timeElapsed: 0
    });

    const analyses: any[] = [];
    
    // Process high-priority chunks first
    const prioritizedChunks = chunks.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (let i = 0; i < prioritizedChunks.length; i++) {
      const chunk = prioritizedChunks[i];
      
      try {
        this.updateProgress({
          stage: 'analysis',
          progress: 60 + (i / prioritizedChunks.length) * 35,
          currentChunk: i + 1,
          totalChunks: prioritizedChunks.length,
          message: `Analyzing chunk ${i + 1}/${prioritizedChunks.length} (${chunk.semanticType})`,
          timeElapsed: 0
        });

        const contextualPrompt = this.createEnhancedContextualPrompt(
          chunk,
          analysisType,
          customPrompt,
          documentStructure
        );

        const analysis = await this.analyzeChunkWithRetry(contextualPrompt, chunk);
        analyses.push(analysis);

      } catch (error) {
        console.warn(`Failed to analyze chunk ${chunk.id}:`, error);
        // Continue with other chunks
      }
    }

    return analyses;
  }

  private createEnhancedContextualPrompt(
    chunk: EnhancedChunk,
    analysisType: AnalysisType,
    customPrompt?: string,
    documentStructure?: DocumentStructure
  ): string {
    const basePrompt = `You are an expert credit report analyst with deep knowledge of FCRA compliance and consumer protection law. 

ENHANCED CONTEXT PRESERVATION:
This analysis uses advanced late chunking methodology to preserve complete document context. The chunk below is part of a larger ${documentStructure?.documentType || 'credit'} report and maintains relationships with other document sections.

CHUNK INFORMATION:
- Semantic Type: ${chunk.semanticType}
- Priority: ${chunk.priority}
- Pages: ${chunk.pageNumbers.join(', ')}
- Context Preserved: ${chunk.contextPreserved}
- Related Chunks: ${chunk.relatedChunks.length}

STRUCTURAL ELEMENTS:
- Tables: ${chunk.structuralElements.tables.length}
- Images: ${chunk.structuralElements.images.length}
- Semantic Regions: ${chunk.structuralElements.semanticRegions.length}

ANALYSIS CONTENT:
${chunk.content}

`;

    const typeSpecificPrompts = {
      full: `Conduct a comprehensive analysis with enhanced context awareness. Identify:
1. FCRA violations leveraging cross-page context
2. Collection account issues with complete account history understanding
3. Dispute accuracy problems with full document context
4. Any legal concerns considering document-wide patterns

The late chunking methodology ensures you have complete context of related information across the document.`,

      fcra: `Focus on FCRA compliance with enhanced context preservation. Analyze:
1. Section 611 violations (dispute procedures) with complete dispute history
2. Section 615 violations (accuracy) with full account context
3. Section 623 violations (reporting) with cross-creditor analysis
4. Other FCRA issues leveraging document-wide understanding`,

      collections: `Analyze collection accounts with complete context:
1. Account history patterns across all pages
2. FDCPA compliance with full communication records
3. Statute of limitations with complete timeline context
4. Validation procedures with cross-referenced documentation`,

      disputes: `Examine disputes with enhanced context:
1. Dispute patterns across the complete report
2. Investigation procedures with full documentation context
3. Resolution tracking with cross-page verification
4. Compliance issues with complete dispute history`,

      custom: customPrompt || 'Analyze using the provided custom requirements with enhanced context awareness.'
    };

    return basePrompt + (typeSpecificPrompts[analysisType] || typeSpecificPrompts.full) + `

IMPORTANT: Your analysis benefits from preserved document context through late chunking. Consider relationships between this chunk and the broader document structure.

Format your response as JSON:
{
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
      "description": "detailed description leveraging document context",
      "severity": "high|medium|low",
      "pageNumber": number,
      "anchorText": "exact quote (<=120 chars)",
      "fcraSection": "specific FCRA section if applicable",
      "recommendedAction": "specific action considering document context",
      "contextConfidence": number between 0-1,
      "crossPageRelationship": "description of relationships to other document sections"
    }
  ],
  "summary": "analysis summary with context awareness",
  "confidence": number between 0-1,
  "contextUtilized": "description of how document context enhanced the analysis"
}`;
  }

  private async analyzeChunkWithRetry(prompt: string, chunk: EnhancedChunk): Promise<any> {
    const apiKey = getOpenAIKey() || this.apiKey;
    if (!apiKey) {
      throw new Error('Missing OpenAI API key');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.analysisModel,
            messages: [
              {
                role: 'system',
                content: 'You are an expert credit report analyst. Always respond with valid JSON.'
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
          throw new Error(`Analysis API error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0]?.message?.content || '{}';

        return this.parseEnhancedAnalysisResponse(responseText);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('Failed to analyze chunk after retries');
  }

  private parseEnhancedAnalysisResponse(responseText: string): any {
    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse enhanced analysis response:', error);
      return {
        totalIssues: 0,
        critical: 0,
        warning: 0,
        attention: 0,
        info: 0,
        issues: [],
        summary: 'Analysis failed - parsing error',
        confidence: 0.3,
        contextUtilized: 'Context analysis failed due to parsing error'
      };
    }
  }

  private async aggregateHierarchicalResults(
    chunkAnalyses: any[],
    documentStructure: DocumentStructure,
    totalPages: number
  ): Promise<any> {
    // Enhanced aggregation that considers hierarchical relationships
    const aggregatedIssues: any[] = [];
    const summaries: string[] = [];
    let totalConfidence = 0;

    // Process analyses with hierarchical deduplication
    chunkAnalyses.forEach((analysis, index) => {
      if (analysis.summary) {
        summaries.push(`Chunk ${index + 1}: ${analysis.summary}`);
      }
      
      totalConfidence += analysis.confidence || 0;

      analysis.issues?.forEach((issue: any) => {
        // Enhanced deduplication considering context relationships
        const isDuplicate = this.isIssueDuplicateWithContext(issue, aggregatedIssues);

        if (!isDuplicate) {
          aggregatedIssues.push({
            ...issue,
            id: `enhanced-late-chunk-${issue.id}`,
            processingMethod: 'enhanced_late_chunking'
          });
        }
      });
    });

    const avgConfidence = chunkAnalyses.length > 0 ? totalConfidence / chunkAnalyses.length : 0.5;

    return {
      totalIssues: aggregatedIssues.length,
      critical: aggregatedIssues.filter(i => i.type === 'critical').length,
      warning: aggregatedIssues.filter(i => i.type === 'warning').length,
      attention: aggregatedIssues.filter(i => i.type === 'attention').length,
      info: aggregatedIssues.filter(i => i.type === 'info').length,
      issues: aggregatedIssues,
      summary: `Enhanced Late Chunking Analysis Summary:\n${summaries.join('\n')}\n\nTotal issues found with preserved document context across ${chunkAnalyses.length} hierarchical chunks.`,
      confidence: avgConfidence
    };
  }

  // Helper methods
  private areChunksContextuallyRelated(chunk1: EnhancedChunk, chunk2: EnhancedChunk): boolean {
    // Check if chunks are on adjacent pages or share semantic context
    const pageDistance = Math.min(
      ...chunk1.pageNumbers.map(p1 =>
        Math.min(...chunk2.pageNumbers.map(p2 => Math.abs(p1 - p2)))
      )
    );
    
    return pageDistance <= this.config.crossPageContextWindow;
  }

  private containsRelatedIdentifiers(content1: string, content2: string): boolean {
    // Look for shared account numbers, creditor names, etc.
    const identifiers1 = this.extractIdentifiers(content1);
    const identifiers2 = this.extractIdentifiers(content2);
    
    return identifiers1.some(id => identifiers2.includes(id));
  }

  private extractIdentifiers(content: string): string[] {
    const identifiers: string[] = [];
    const text = content.toLowerCase();
    
    // Extract account numbers (simplified pattern)
    const accountMatches = text.match(/account.*?(\d{4,})/g) || [];
    identifiers.push(...accountMatches);
    
    // Extract creditor names (simplified - look for capitalized words)
    const creditorMatches = text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g) || [];
    identifiers.push(...creditorMatches);
    
    return identifiers;
  }

  private isIssueDuplicateWithContext(issue: any, existingIssues: any[]): boolean {
    return existingIssues.some(existing => {
      // More sophisticated deduplication considering context
      const descriptionSimilar = existing.description === issue.description;
      const pageSimilar = Math.abs(existing.pageNumber - issue.pageNumber) <= 1;
      const categorySame = existing.category === issue.category;
      
      return descriptionSimilar && pageSimilar && categorySame;
    });
  }

  private identifyCrossPageRelationships(chunks: EnhancedChunk[]): any[] {
    const relationships: any[] = [];
    
    chunks.forEach(chunk => {
      chunk.relatedChunks.forEach(relatedId => {
        const relatedChunk = chunks.find(c => c.id === relatedId);
        if (relatedChunk) {
          relationships.push({
            id: `rel-${chunk.id}-${relatedId}`,
            type: this.determineRelationshipType(chunk, relatedChunk),
            sourcePages: chunk.pageNumbers,
            targetPages: relatedChunk.pageNumbers,
            relationship: `${chunk.semanticType} -> ${relatedChunk.semanticType}`,
            confidence: 0.8
          });
        }
      });
    });
    
    return relationships;
  }

  private determineRelationshipType(chunk1: EnhancedChunk, chunk2: EnhancedChunk): string {
    if (chunk1.semanticType === 'account_data' && chunk2.semanticType === 'dispute_info') {
      return 'account_dispute_link';
    }
    if (chunk1.semanticType === 'account_data' && chunk2.semanticType === 'payment_history') {
      return 'account_payment_link';
    }
    return 'contextual_relationship';
  }

  private calculateCosineSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) return 0;
    
    const dotProduct = vector1.reduce((sum, v1, i) => sum + (v1 * vector2[i]), 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, v) => sum + (v * v), 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, v) => sum + (v * v), 0));
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  private createCacheKey(content: string): string {
    return btoa(content.substring(0, 100)).replace(/[/+=]/g, '').substring(0, 16);
  }

  private estimateProcessingCost(chunks: EnhancedChunk[]): number {
    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
    const embeddingCost = (totalTokens / 1000) * 0.00013; // text-embedding-3-large
    const analysisCost = (totalTokens / 1000) * 0.001;    // GPT-5 Vision
    return embeddingCost + analysisCost;
  }

  private updateProgress(progress: ProcessingProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  // Public utility methods
  public clearAllCaches(): void {
    this.documentEmbeddingCache.clear();
    this.hierarchicalContextCache.clear();
    this.advancedChunker.clearCache();
    console.log('All enhanced late chunking caches cleared');
  }

  public getCacheStats(): any {
    return {
      documentEmbeddings: this.documentEmbeddingCache.size,
      hierarchicalContext: this.hierarchicalContextCache.size,
      advancedChunker: this.advancedChunker.getCacheStats()
    };
  }
}