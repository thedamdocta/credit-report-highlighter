// Advanced Hierarchical Chunking Service for Large Credit Reports
import { API_CONFIG } from '../config/api';
import { getOpenAIKey } from '../settings/openai';
import type { 
  EnhancedChunk, 
  StreamingChunkConfig, 
  EnhancedPDFPage, 
  DocumentStructure,
  ProcessingProgress 
} from '../types/enhancedCreditReport';
import type { AnalysisType } from '../types/creditReport';

export interface AdvancedChunkingConfig extends StreamingChunkConfig {
  embeddingModel: string;
  analysisModel: string;
  enableParallelProcessing: boolean;
  enableSmartCaching: boolean;
  maxRetries: number;
  costOptimization: boolean;
  enableStreamingMode: boolean;
  hierarchicalLevels: ('document' | 'section' | 'page' | 'paragraph')[];
}

export class AdvancedChunkingService {
  private apiKey: string;
  private baseUrl: string;
  private config: AdvancedChunkingConfig;
  private embeddingCache: Map<string, number[]> = new Map();
  private chunkCache: Map<string, EnhancedChunk[]> = new Map();
  private progressCallback?: (progress: ProcessingProgress) => void;

  constructor(
    config?: Partial<AdvancedChunkingConfig>,
    progressCallback?: (progress: ProcessingProgress) => void
  ) {
    this.apiKey = API_CONFIG.OPENAI_API_KEY;
    this.baseUrl = API_CONFIG.OPENAI_BASE_URL;
    this.progressCallback = progressCallback;
    
    this.config = {
      maxTokensPerChunk: 128000, // GPT-4 Turbo token limit
      overlapTokens: 2000,
      priorityRegions: [],
      compressionRatio: 0.8,
      adaptiveChunking: true,
      preserveTableIntegrity: true,
      crossPageContextWindow: 5,
      embeddingModel: 'text-embedding-3-large',
      analysisModel: 'gpt-4-turbo-preview',
      enableParallelProcessing: true,
      enableSmartCaching: true,
      maxRetries: 3,
      costOptimization: false,
      enableStreamingMode: true,
      hierarchicalLevels: ['document', 'section', 'page', 'paragraph'],
      ...config
    };
  }

  async processLargeDocument(
    pages: EnhancedPDFPage[],
    documentStructure: DocumentStructure
  ): Promise<{
    chunks: EnhancedChunk[];
    processingMetrics: {
      totalChunks: number;
      processingTime: number;
      tokensProcessed: number;
      embeddingsGenerated: number;
    };
  }> {
    const startTime = Date.now();
    
    this.updateProgress({
      stage: 'chunking',
      progress: 0,
      message: 'Starting hierarchical chunking process...',
      timeElapsed: 0
    });

    try {
      // Step 1: Create hierarchical chunks at different levels
      const hierarchicalChunks = await this.createHierarchicalChunks(pages, documentStructure);
      
      // Step 2: Generate embeddings for chunks
      const embeddedChunks = await this.generateEmbeddings(hierarchicalChunks);
      
      // Step 3: Establish cross-chunk relationships
      const relatedChunks = this.establishChunkRelationships(embeddedChunks);
      
      const processingTime = Date.now() - startTime;
      
      this.updateProgress({
        stage: 'chunking',
        progress: 100,
        message: `Created ${relatedChunks.length} enhanced chunks`,
        timeElapsed: processingTime
      });

      return {
        chunks: relatedChunks,
        processingMetrics: {
          totalChunks: relatedChunks.length,
          processingTime,
          tokensProcessed: relatedChunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
          embeddingsGenerated: relatedChunks.filter(chunk => chunk.embedding).length
        }
      };
      
    } catch (error) {
      console.error('Advanced Chunking Error:', error);
      throw new Error(`Failed to process large document: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createHierarchicalChunks(
    pages: EnhancedPDFPage[], 
    documentStructure: DocumentStructure
  ): Promise<EnhancedChunk[]> {
    const chunks: EnhancedChunk[] = [];
    let chunkId = 0;

    // Level 1: Document-level chunks (major sections)
    if (this.config.hierarchicalLevels.includes('document')) {
      for (const section of documentStructure.sections) {
        const sectionPages = pages.filter(p => 
          p.pageNumber >= section.startPage && p.pageNumber <= section.endPage
        );
        
        const sectionChunk = await this.createSectionChunk(section, sectionPages, chunkId++);
        chunks.push(sectionChunk);
      }
    }

    // Level 2: Section-level chunks (accounts, disputes, etc.)
    if (this.config.hierarchicalLevels.includes('section')) {
      // Account sections
      for (const account of documentStructure.accountSummaries) {
        const accountPages = pages.filter(p => account.pageNumbers.includes(p.pageNumber));
        const accountChunk = await this.createAccountChunk(account, accountPages, chunkId++);
        chunks.push(accountChunk);
      }

      // Dispute sections
      for (const dispute of documentStructure.disputeHistory) {
        const disputePages = pages.filter(p => dispute.pageNumbers.includes(p.pageNumber));
        const disputeChunk = await this.createDisputeChunk(dispute, disputePages, chunkId++);
        chunks.push(disputeChunk);
      }
    }

    // Level 3: Page-level chunks
    if (this.config.hierarchicalLevels.includes('page')) {
      for (const page of pages) {
        if (page.contentComplexity === 'very_complex' || page.tables.length > 2) {
          const pageChunks = await this.createPageLevelChunks(page, chunkId);
          chunks.push(...pageChunks);
          chunkId += pageChunks.length;
        }
      }
    }

    // Level 4: Paragraph-level adaptive chunks
    if (this.config.hierarchicalLevels.includes('paragraph')) {
      const remainingText = this.getRemainingUnchunkedText(pages, chunks);
      const paragraphChunks = await this.createAdaptiveParagraphChunks(remainingText, chunkId);
      chunks.push(...paragraphChunks);
    }

    return chunks;
  }

  private async createSectionChunk(
    section: any, 
    pages: EnhancedPDFPage[], 
    id: number
  ): Promise<EnhancedChunk> {
    const content = pages.map(p => `Page ${p.pageNumber}:\n${p.text}`).join('\n\n');
    const tokenCount = this.estimateTokenCount(content);
    
    // Collect structural elements
    const tables = pages.flatMap(p => p.tables);
    const images = pages.flatMap(p => p.images);
    const semanticRegions = pages.flatMap(p => p.semanticRegions);

    return {
      id: `section-${id}`,
      content: this.truncateToTokenLimit(content, this.config.maxTokensPerChunk),
      semanticType: this.mapSectionToSemanticType(section.type),
      pageNumbers: pages.map(p => p.pageNumber),
      tokenCount: Math.min(tokenCount, this.config.maxTokensPerChunk),
      priority: section.importance === 'critical' ? 'critical' : 'high',
      contextPreserved: true,
      relatedChunks: [],
      structuralElements: {
        tables,
        images,
        semanticRegions
      }
    };
  }

  private async createAccountChunk(
    account: any, 
    pages: EnhancedPDFPage[], 
    id: number
  ): Promise<EnhancedChunk> {
    let content = `Account Information:\n`;
    content += `Account Number: ${account.accountNumber}\n`;
    content += `Creditor: ${account.creditorName}\n`;
    content += `Type: ${account.accountType}\n`;
    content += `Status: ${account.status}\n`;
    
    if (account.balance !== undefined) {
      content += `Balance: $${account.balance}\n`;
    }
    
    if (account.paymentHistory) {
      content += `Payment History: ${account.paymentHistory}\n`;
    }
    
    // Add relevant page content
    const pageContent = pages.map(p => {
      // Extract account-related content from each page
      const accountText = this.extractAccountSpecificContent(p.text, account);
      return accountText ? `Page ${p.pageNumber}:\n${accountText}` : '';
    }).filter(Boolean).join('\n\n');
    
    content += `\n\nDetailed Information:\n${pageContent}`;

    const tokenCount = this.estimateTokenCount(content);
    const tables = pages.flatMap(p => p.tables.filter(t => 
      t.tableType === 'account_summary' || t.tableType === 'payment_history'
    ));

    return {
      id: `account-${id}`,
      content: this.truncateToTokenLimit(content, this.config.maxTokensPerChunk),
      semanticType: 'account_data',
      pageNumbers: account.pageNumbers,
      tokenCount: Math.min(tokenCount, this.config.maxTokensPerChunk),
      priority: account.disputeStatus === 'disputed' ? 'critical' : 'high',
      contextPreserved: true,
      relatedChunks: [],
      structuralElements: {
        tables,
        images: [],
        semanticRegions: pages.flatMap(p => p.semanticRegions.filter(r => 
          r.type === 'account_section'
        ))
      }
    };
  }

  private async createDisputeChunk(
    dispute: any, 
    pages: EnhancedPDFPage[], 
    id: number
  ): Promise<EnhancedChunk> {
    let content = `Dispute Information:\n`;
    content += `Date: ${dispute.disputeDate}\n`;
    content += `Status: ${dispute.status}\n`;
    content += `Description: ${dispute.description}\n`;
    
    if (dispute.accountId) {
      content += `Related Account: ${dispute.accountId}\n`;
    }
    
    if (dispute.resolution) {
      content += `Resolution: ${dispute.resolution}\n`;
    }
    
    // Add page content
    const pageContent = pages.map(p => `Page ${p.pageNumber}:\n${p.text}`).join('\n\n');
    content += `\n\nDetailed Information:\n${pageContent}`;

    const tokenCount = this.estimateTokenCount(content);

    return {
      id: `dispute-${id}`,
      content: this.truncateToTokenLimit(content, this.config.maxTokensPerChunk),
      semanticType: 'dispute_info',
      pageNumbers: dispute.pageNumbers,
      tokenCount: Math.min(tokenCount, this.config.maxTokensPerChunk),
      priority: 'critical',
      contextPreserved: true,
      relatedChunks: [],
      structuralElements: {
        tables: pages.flatMap(p => p.tables.filter(t => t.tableType === 'dispute_history')),
        images: [],
        semanticRegions: pages.flatMap(p => p.semanticRegions.filter(r => 
          r.type === 'dispute_section'
        ))
      }
    };
  }

  private async createPageLevelChunks(page: EnhancedPDFPage, startId: number): Promise<EnhancedChunk[]> {
    const chunks: EnhancedChunk[] = [];
    let currentId = startId;

    // If page has many tables, create separate chunks for each major table
    if (page.tables.length > 0) {
      for (const table of page.tables) {
        const tableContent = this.formatTableContent(table, page.text);
        const tokenCount = this.estimateTokenCount(tableContent);

        chunks.push({
          id: `table-${currentId++}`,
          content: tableContent,
          semanticType: this.mapTableTypeToSemantic(table.tableType),
          pageNumbers: [page.pageNumber],
          tokenCount,
          priority: this.getTablePriority(table.tableType),
          contextPreserved: true,
          relatedChunks: [],
          structuralElements: {
            tables: [table],
            images: [],
            semanticRegions: []
          }
        });
      }
    }

    // Create chunks for semantic regions
    for (const region of page.semanticRegions) {
      if (region.importance === 'critical' || region.importance === 'high') {
        chunks.push({
          id: `region-${currentId++}`,
          content: region.content,
          semanticType: this.mapRegionTypeToSemantic(region.type),
          pageNumbers: [page.pageNumber],
          tokenCount: this.estimateTokenCount(region.content),
          priority: region.importance === 'critical' ? 'critical' : 'high',
          contextPreserved: true,
          relatedChunks: [],
          structuralElements: {
            tables: [],
            images: [],
            semanticRegions: [region]
          }
        });
      }
    }

    return chunks;
  }

  private async createAdaptiveParagraphChunks(
    text: string, 
    startId: number
  ): Promise<EnhancedChunk[]> {
    const chunks: EnhancedChunk[] = [];
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let currentTokens = 0;
    let chunkId = startId;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokenCount(paragraph);
      
      // If adding this paragraph would exceed limit, finalize current chunk
      if (currentTokens + paragraphTokens > this.config.maxTokensPerChunk && currentChunk) {
        chunks.push({
          id: `adaptive-${chunkId++}`,
          content: currentChunk.trim(),
          semanticType: 'mixed',
          pageNumbers: [], // Will be determined later
          tokenCount: currentTokens,
          priority: 'medium',
          contextPreserved: true,
          relatedChunks: [],
          structuralElements: {
            tables: [],
            images: [],
            semanticRegions: []
          }
        });
        
        currentChunk = '';
        currentTokens = 0;
      }
      
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokens += paragraphTokens;
    }

    // Add final chunk if exists
    if (currentChunk.trim()) {
      chunks.push({
        id: `adaptive-${chunkId}`,
        content: currentChunk.trim(),
        semanticType: 'mixed',
        pageNumbers: [],
        tokenCount: currentTokens,
        priority: 'medium',
        contextPreserved: true,
        relatedChunks: [],
        structuralElements: {
          tables: [],
          images: [],
          semanticRegions: []
        }
      });
    }

    return chunks;
  }

  private async generateEmbeddings(chunks: EnhancedChunk[]): Promise<EnhancedChunk[]> {
    this.updateProgress({
      stage: 'embedding',
      progress: 0,
      message: 'Generating embeddings for chunks...',
      timeElapsed: 0,
      totalChunks: chunks.length
    });

    const embeddedChunks: EnhancedChunk[] = [];
    const batchSize = this.config.enableParallelProcessing ? 10 : 1;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchPromises = batch.map(chunk => this.generateChunkEmbedding(chunk));
      
      const embeddedBatch = await Promise.all(batchPromises);
      embeddedChunks.push(...embeddedBatch);

      this.updateProgress({
        stage: 'embedding',
        progress: (i + batch.length) / chunks.length * 100,
        currentChunk: i + batch.length,
        totalChunks: chunks.length,
        message: `Generated embeddings for ${i + batch.length}/${chunks.length} chunks`,
        timeElapsed: 0
      });
    }

    return embeddedChunks;
  }

  private async generateChunkEmbedding(chunk: EnhancedChunk): Promise<EnhancedChunk> {
    // Check cache first
    if (this.config.enableSmartCaching) {
      const cacheKey = this.createCacheKey(chunk.content);
      if (this.embeddingCache.has(cacheKey)) {
        return {
          ...chunk,
          embedding: this.embeddingCache.get(cacheKey)!
        };
      }
    }

    const apiKey = getOpenAIKey() || this.apiKey;
    if (!apiKey) {
      console.warn(`No API key available for chunk ${chunk.id}, skipping embedding`);
      return chunk;
    }

    const model = this.config.costOptimization ? 'text-embedding-3-small' : this.config.embeddingModel;

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: chunk.content,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Cache the result
      if (this.config.enableSmartCaching) {
        const cacheKey = this.createCacheKey(chunk.content);
        this.embeddingCache.set(cacheKey, embedding);
      }

      return {
        ...chunk,
        embedding
      };
      
    } catch (error) {
      console.warn(`Failed to generate embedding for chunk ${chunk.id}:`, error);
      return chunk;
    }
  }

  private establishChunkRelationships(chunks: EnhancedChunk[]): EnhancedChunk[] {
    // Establish relationships between chunks based on content similarity and logical connections
    const relatedChunks = chunks.map(chunk => {
      const relations: string[] = [];

      // Find related chunks by semantic type
      chunks.forEach(otherChunk => {
        if (chunk.id !== otherChunk.id) {
          // Account-dispute relationships
          if (chunk.semanticType === 'account_data' && otherChunk.semanticType === 'dispute_info') {
            if (this.areAccountAndDisputeRelated(chunk, otherChunk)) {
              relations.push(otherChunk.id);
            }
          }
          
          // Page proximity relationships
          if (this.areChunksOnAdjacentPages(chunk, otherChunk)) {
            relations.push(otherChunk.id);
          }
          
          // Content similarity (if embeddings are available)
          if (chunk.embedding && otherChunk.embedding) {
            const similarity = this.calculateCosineSimilarity(chunk.embedding, otherChunk.embedding);
            if (similarity > 0.8) {
              relations.push(otherChunk.id);
            }
          }
        }
      });

      return {
        ...chunk,
        relatedChunks: relations
      };
    });

    return relatedChunks;
  }

  // Helper methods
  private mapSectionToSemanticType(sectionType: string): EnhancedChunk['semanticType'] {
    const mapping: Record<string, EnhancedChunk['semanticType']> = {
      'personal_info': 'personal_info',
      'accounts': 'account_data',
      'disputes': 'dispute_info',
      'inquiries': 'inquiry_data'
    };
    return mapping[sectionType] || 'mixed';
  }

  private mapTableTypeToSemantic(tableType: string): EnhancedChunk['semanticType'] {
    const mapping: Record<string, EnhancedChunk['semanticType']> = {
      'account_summary': 'account_data',
      'payment_history': 'payment_history',
      'inquiry_list': 'inquiry_data',
      'dispute_history': 'dispute_info'
    };
    return mapping[tableType] || 'mixed';
  }

  private mapRegionTypeToSemantic(regionType: string): EnhancedChunk['semanticType'] {
    const mapping: Record<string, EnhancedChunk['semanticType']> = {
      'personal_info': 'personal_info',
      'account_section': 'account_data',
      'dispute_section': 'dispute_info',
      'inquiry_section': 'inquiry_data'
    };
    return mapping[regionType] || 'mixed';
  }

  private getTablePriority(tableType: string): EnhancedChunk['priority'] {
    const highPriority = ['account_summary', 'dispute_history'];
    return highPriority.includes(tableType) ? 'high' : 'medium';
  }

  private extractAccountSpecificContent(pageText: string, account: any): string {
    // Simple heuristic to extract account-related content
    const accountIndicators = [
      account.accountNumber,
      account.creditorName,
      account.accountType
    ].filter(Boolean);

    const lines = pageText.split('\n');
    const relevantLines = lines.filter(line => 
      accountIndicators.some(indicator => 
        line.toLowerCase().includes(indicator.toLowerCase())
      )
    );

    return relevantLines.join('\n');
  }

  private formatTableContent(table: any, pageText: string): string {
    let content = `Table: ${table.tableType}\n`;
    content += `Headers: ${table.headers.join(' | ')}\n`;
    content += `Data:\n`;
    
    table.rows.forEach((row: string[], index: number) => {
      if (index === 0) return; // Skip header row
      content += row.join(' | ') + '\n';
    });
    
    // Add context from surrounding page text
    const contextLines = pageText.split('\n').slice(0, 3);
    content += `\nPage Context: ${contextLines.join(' ')}`;
    
    return content;
  }

  private getRemainingUnchunkedText(pages: EnhancedPDFPage[], existingChunks: EnhancedChunk[]): string {
    // This is a simplified implementation
    // In reality, you'd need more sophisticated logic to identify unchunked content
    const allText = pages.map(p => p.text).join('\n\n');
    
    // For now, return remaining text (simplified)
    const chunkedContent = existingChunks.map(c => c.content).join('\n\n');
    
    if (allText.length > chunkedContent.length * 2) {
      return allText.substring(chunkedContent.length);
    }
    
    return '';
  }

  private areAccountAndDisputeRelated(accountChunk: EnhancedChunk, disputeChunk: EnhancedChunk): boolean {
    // Simple heuristic to check if account and dispute are related
    const accountContent = accountChunk.content.toLowerCase();
    const disputeContent = disputeChunk.content.toLowerCase();
    
    // Look for common identifiers
    const accountNumbers = accountContent.match(/account.*?(\d{4,})/g) || [];
    const disputeAccountRefs = disputeContent.match(/account.*?(\d{4,})/g) || [];
    
    return accountNumbers.some(acc => 
      disputeAccountRefs.some(disp => acc === disp)
    );
  }

  private areChunksOnAdjacentPages(chunk1: EnhancedChunk, chunk2: EnhancedChunk): boolean {
    const pages1 = chunk1.pageNumbers;
    const pages2 = chunk2.pageNumbers;
    
    return pages1.some(p1 => 
      pages2.some(p2 => Math.abs(p1 - p2) <= this.config.crossPageContextWindow)
    );
  }

  private calculateCosineSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) return 0;
    
    const dotProduct = vector1.reduce((sum, v1, i) => sum + (v1 * vector2[i]), 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, v) => sum + (v * v), 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, v) => sum + (v * v), 0));
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private truncateToTokenLimit(text: string, tokenLimit: number): string {
    const charLimit = tokenLimit * 4; // Rough conversion
    return text.length > charLimit ? text.substring(0, charLimit) : text;
  }

  private createCacheKey(content: string): string {
    // Create a hash-like key from the content for caching
    return btoa(content.substring(0, 100)).replace(/[/+=]/g, '').substring(0, 16);
  }

  private updateProgress(progress: ProcessingProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  // Public utility methods
  public clearCache(): void {
    this.embeddingCache.clear();
    this.chunkCache.clear();
    console.log('Advanced chunking caches cleared');
  }

  public getCacheStats(): { embeddingCacheSize: number; chunkCacheSize: number } {
    return {
      embeddingCacheSize: this.embeddingCache.size,
      chunkCacheSize: this.chunkCache.size
    };
  }

  public estimateProcessingCost(pages: EnhancedPDFPage[]): {
    estimatedChunks: number;
    estimatedTokens: number;
    estimatedEmbeddingCost: number;
    estimatedAnalysisCost: number;
    totalEstimatedCost: number;
  } {
    const totalText = pages.map(p => p.text).join(' ');
    const estimatedTokens = this.estimateTokenCount(totalText);
    const estimatedChunks = Math.ceil(estimatedTokens / this.config.maxTokensPerChunk);
    
    const embeddingCostPerToken = this.config.costOptimization ? 0.00002 : 0.00013;
    const analysisCostPerToken = 0.001;
    
    const estimatedEmbeddingCost = (estimatedTokens / 1000) * embeddingCostPerToken;
    const estimatedAnalysisCost = (estimatedTokens / 1000) * analysisCostPerToken;
    
    return {
      estimatedChunks,
      estimatedTokens,
      estimatedEmbeddingCost,
      estimatedAnalysisCost,
      totalEstimatedCost: estimatedEmbeddingCost + estimatedAnalysisCost
    };
  }
}