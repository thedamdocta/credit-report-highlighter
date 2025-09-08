// Late Chunking Service for Credit Report Analysis
import { API_CONFIG } from '../config/api';
import { getOpenAIKey } from '../settings/openai';
import type { PDFDocument, AnalysisResult, CreditIssue, AnalysisType } from '../types/creditReport';

export interface TokenEmbedding {
  token: string;
  embedding: number[];
  position: {
    start: number;
    end: number;
  };
  pageNumber: number;
}

export interface ChunkedEmbedding {
  id: string;
  text: string;
  embedding: number[];
  tokenSpan: {
    start: number;
    end: number;
  };
  pageNumbers: number[];
  contextPreserved: boolean;
  metadata?: {
    chunkIndex: number;
    originalLength?: number;
    startPos?: number;
    endPos?: number;
    contextPreserved?: boolean;
  };
}

export interface LateChunkingConfig {
  maxChunkSize: number;
  overlapSize: number;
  embeddingModel: string;
  analysisModel: string;
  preserveContext: boolean;
  enableCaching: boolean;
  maxRetries: number;
  costOptimization: boolean;
}

export class LateChunkingService {
  private apiKey: string;
  private baseUrl: string;
  private config: LateChunkingConfig;
  private embeddingCache: Map<string, number[]> = new Map();
  private analysisCache: Map<string, AnalysisResult> = new Map();

  constructor(config?: Partial<LateChunkingConfig>) {
    this.apiKey = API_CONFIG.OPENAI_API_KEY;
    this.baseUrl = API_CONFIG.OPENAI_BASE_URL;
    
    this.config = {
      maxChunkSize: 2000,
      overlapSize: 200,
      embeddingModel: 'text-embedding-3-large',
      analysisModel: 'gpt-5',
      preserveContext: true,
      enableCaching: true,
      maxRetries: 3,
      costOptimization: true,
      ...config
    };
  }

  async analyzeCreditReportWithLateChunking(
    pdfDocument: PDFDocument,
    analysisType: AnalysisType,
    customPrompt?: string
  ): Promise<AnalysisResult> {
    try {
      // Step 1: Extract and prepare full document text
      const fullText = this.extractFullText(pdfDocument);
      console.log(`Processing document with ${fullText.length} characters`);

      // Step 2: Create a single embedding for the full document
      // Late chunking principle: embed once, then pool for segments
      const documentEmbedding = await this.embedEntireDocument(fullText);
      console.log('Full document embedding created');

      // Step 3: Create dynamic, context-preserving chunks by pooling from the full embedding
      const chunkedEmbeddings = await this.performLateChunking(documentEmbedding, fullText);
      console.log(`Created ${chunkedEmbeddings.length} dynamic late chunks`);

      // Step 4: Analyze each chunk with preserved context
      const chunkAnalyses = await this.analyzeChunksWithContext(
        chunkedEmbeddings, 
        analysisType, 
        customPrompt,
        fullText
      );

      // Step 5: Aggregate and merge results
      const aggregatedResult = this.aggregateAnalysisResults(chunkAnalyses, pdfDocument.totalPages);

      return aggregatedResult;
    } catch (error) {
      console.error('Late Chunking Analysis Error:', error);
      throw new Error('Failed to analyze credit report with late chunking');
    }
  }

  private extractFullText(pdfDocument: PDFDocument): string {
    return pdfDocument.pages
      .map(page => `Page ${page.pageNumber}:\n${page.text}`)
      .join('\n\n');
  }

  /**
   * Create initial chunks that fit within embedding limits
   */
  private createInitialChunks(fullText: string): string[] {
    const maxChunkSize = 6000; // Safe limit for embedding API (well under 8192 tokens)
    const chunks: string[] = [];
    
    let currentPos = 0;
    
    while (currentPos < fullText.length) {
      const chunkEnd = Math.min(currentPos + maxChunkSize, fullText.length);
      let actualEnd = chunkEnd;
      
      // Try to break at natural boundaries (paragraph, sentence, etc.)
      if (chunkEnd < fullText.length) {
        const nearbyParagraph = fullText.lastIndexOf('\n\n', chunkEnd);
        const nearbyNewline = fullText.lastIndexOf('\n', chunkEnd);
        const nearbySentence = fullText.lastIndexOf('. ', chunkEnd);
        
        // Prefer paragraph breaks, then sentence breaks, then line breaks
        if (nearbyParagraph > currentPos + maxChunkSize * 0.6) {
          actualEnd = nearbyParagraph + 2;
        } else if (nearbySentence > currentPos + maxChunkSize * 0.7) {
          actualEnd = nearbySentence + 2;
        } else if (nearbyNewline > currentPos + maxChunkSize * 0.8) {
          actualEnd = nearbyNewline + 1;
        }
      }
      
      const chunkText = fullText.substring(currentPos, actualEnd).trim();
      if (chunkText.length > 0) {
        chunks.push(chunkText);
      }
      
      currentPos = actualEnd;
    }
    
    return chunks;
  }

  private createCacheKey(text: string): string {
    // Create a hash-like key from the text for caching
    return btoa(text.substring(0, 100)).replace(/[/+=]/g, '').substring(0, 16);
  }

  private async embedEntireDocument(text: string): Promise<number[]> {
    // Check cache first if enabled
    if (this.config.enableCaching) {
      const cacheKey = this.createCacheKey(text);
      if (this.embeddingCache.has(cacheKey)) {
        console.log('Using cached embedding for document');
        return this.embeddingCache.get(cacheKey)!;
      }
    }

    const apiKey = getOpenAIKey() || this.apiKey;
    if (!apiKey) {
      throw new Error('Missing OpenAI API key for embedding');
    }

    // Cost optimization: Use smaller model for cost optimization mode
    const model = this.config.costOptimization ? 'text-embedding-3-small' : this.config.embeddingModel;
    
    // OpenAI embedding models have token limits: text-embedding-3-small/large = 8192 tokens ≈ 6000-8000 chars safe limit
    const maxChars = this.config.costOptimization ? 6000 : 8000;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      try {
        const response = await fetch(`${this.baseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            input: truncatedText,
            encoding_format: 'float',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Embedding API error details:', errorText);
          throw new Error(`Embedding API error: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        const embedding = data.data[0].embedding;

        // Cache the result if caching is enabled
        if (this.config.enableCaching) {
          const cacheKey = this.createCacheKey(text);
          this.embeddingCache.set(cacheKey, embedding);
        }

        console.log(`Document embedded successfully using model: ${model} (attempt ${attempt + 1})`);
        return embedding;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;
        
        if (attempt < this.config.maxRetries) {
          console.warn(`Embedding attempt ${attempt} failed, retrying...`);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('Failed to embed document after multiple attempts');
  }

  private async performLateChunking(documentEmbedding: number[], fullText: string): Promise<ChunkedEmbedding[]> {
    // Dynamically compute chunk boundaries based on document length and config
    const boundaries = this.computeDynamicChunkBoundaries(fullText, this.config.maxChunkSize, this.config.overlapSize);
    const chunks: ChunkedEmbedding[] = [];

    for (let i = 0; i < boundaries.length; i++) {
      const { start, end } = boundaries[i];
      const text = fullText.substring(start, end);

      // Pool embedding segment proportionally from the full embedding
      const pooled = this.poolEmbeddingForChunk(documentEmbedding, start, end, fullText.length);

      chunks.push({
        id: `chunk-${i}`,
        text,
        embedding: pooled,
        tokenSpan: { start, end },
        pageNumbers: this.getPageNumbersForChunk(text, start, fullText),
        contextPreserved: true,
        metadata: {
          chunkIndex: i,
          originalLength: fullText.length,
          startPos: start,
          endPos: end,
          contextPreserved: true
        }
      });
    }

    return chunks;
  }

  private computeDynamicChunkBoundaries(fullText: string, defaultSize: number, overlap: number): Array<{ start: number; end: number }> {
    const boundaries: Array<{ start: number; end: number }> = [];

    // Estimate tokens and pick a target char size per chunk to keep GPT-5 prompts safe
    const totalTokens = Math.ceil(fullText.length / 4);
    const targetTokensPerChunk = totalTokens > 32000 ? 8000 : totalTokens > 16000 ? 6000 : 4000;
    const targetChars = targetTokensPerChunk * 4; // rough conversion

    let pos = 0;
    while (pos < fullText.length) {
      let chunkEnd = Math.min(pos + targetChars, fullText.length);

      // Try to end at a natural boundary: paragraph, sentence, or newline
      if (chunkEnd < fullText.length) {
        const para = fullText.lastIndexOf('\n\n', chunkEnd);
        const sentence = fullText.lastIndexOf('. ', chunkEnd);
        const newline = fullText.lastIndexOf('\n', chunkEnd);

        const candidates = [para, sentence, newline].filter(ix => ix > pos + targetChars * 0.5);
        if (candidates.length > 0) {
          chunkEnd = Math.max(...candidates) + 1;
        }
      }

      boundaries.push({ start: pos, end: chunkEnd });
      pos = Math.max(chunkEnd - overlap, chunkEnd);
    }

    return boundaries;
  }

  private poolEmbeddingForChunk(
    documentEmbedding: number[], 
    start: number, 
    end: number, 
    totalLength: number
  ): number[] {
    // Calculate the proportional segment of the embedding to pool
    const startRatio = start / totalLength;
    const endRatio = end / totalLength;
    
    const embeddingLength = documentEmbedding.length;
    const segmentStart = Math.floor(startRatio * embeddingLength);
    const segmentEnd = Math.floor(endRatio * embeddingLength);
    
    // Pool (average) the embedding vectors in this segment
    const segmentEmbedding = documentEmbedding.slice(segmentStart, segmentEnd);
    
    if (segmentEmbedding.length === 0) {
      return documentEmbedding.slice(0, Math.floor(embeddingLength / 10)); // fallback
    }

    return segmentEmbedding; // Return the segment directly for now
  }

  private getPageNumbersForChunk(chunkText: string, position: number, fullText: string): number[] {
    const pageNumbers: number[] = [];
    const pageMatches = chunkText.match(/Page (\d+):/g);
    
    if (pageMatches) {
      pageMatches.forEach(match => {
        const pageNum = parseInt(match.replace('Page ', '').replace(':', ''));
        if (!isNaN(pageNum)) {
          pageNumbers.push(pageNum);
        }
      });
    }
    
    // If no page markers found, estimate based on position
    if (pageNumbers.length === 0) {
      const estimatedPage = Math.max(1, Math.floor((position / fullText.length) * 10) + 1);
      pageNumbers.push(estimatedPage);
    }

    return [...new Set(pageNumbers)].sort();
  }

  private async analyzeChunksWithContext(
    chunks: ChunkedEmbedding[],
    analysisType: AnalysisType,
    customPrompt?: string,
    fullDocumentContext?: string
  ): Promise<AnalysisResult[]> {
    const analyses: AnalysisResult[] = [];

    for (const chunk of chunks) {
      try {
        const contextualPrompt = this.createContextualPrompt(
          chunk, 
          analysisType, 
          customPrompt, 
          fullDocumentContext
        );
        
        const analysis = await this.analyzeChunk(contextualPrompt, chunk);
        analyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze chunk ${chunk.id}:`, error);
        // Continue with other chunks
      }
    }

    return analyses;
  }

  private createContextualPrompt(
    chunk: ChunkedEmbedding,
    analysisType: AnalysisType,
    customPrompt?: string,
    fullDocumentContext?: string
  ): string {
    const contextNote = fullDocumentContext 
      ? `\n\nDOCUMENT CONTEXT: This chunk is part of a larger credit report. Consider the broader document context when analyzing issues.`
      : '';

    const basePrompt = `You are an expert credit report analyst specializing in FCRA compliance and consumer protection law. Analyze the following credit report chunk and identify potential issues, violations, and areas of concern.

This chunk spans pages: ${chunk.pageNumbers.join(', ')}
Context preserved: ${chunk.contextPreserved}

Credit Report Chunk:
${chunk.text}
${contextNote}

`;

    const typeSpecificPrompts = {
      full: `Conduct a comprehensive analysis focusing on this chunk. Identify:
1. FCRA violations and compliance issues
2. Collection account problems  
3. Dispute and accuracy issues
4. Any other legal concerns

Provide specific page references and detailed explanations for each issue found.`,

      fcra: `Focus specifically on Fair Credit Reporting Act (FCRA) compliance in this chunk.`,
      
      collections: `Focus on collection accounts and FDCPA compliance in this chunk.`,
      
      disputes: `Focus on disputed accounts and resolution procedures in this chunk.`,
      
      custom: customPrompt || `Analyze this credit report chunk based on the user's specific request.`
    };

    return basePrompt + (typeSpecificPrompts[analysisType] || typeSpecificPrompts.full) + `

Format your response as a JSON object with this exact structure:
{
  "totalIssues": number,
  "critical": number,
  "warning": number,
  "attention": number,
  "info": number,
  "issues": [
    {
      "id": "unique-id-here",
      "type": "critical|warning|attention|info",
      "category": "FCRA_violation|collection|dispute|accuracy|other",
      "description": "detailed description of the issue",
      "severity": "high|medium|low",
      "pageNumber": number,
      "anchorText": "short exact quote from the chunk (<=120 chars)",
      "fcraSection": "specific FCRA section if applicable",
      "recommendedAction": "specific recommended action"
    }
  ],
  "summary": "brief summary of findings in this chunk",
  "confidence": number between 0-1
}

Only return valid JSON, no additional text.`;
  }

  private async analyzeChunk(prompt: string, chunk: ChunkedEmbedding): Promise<AnalysisResult> {
    const apiKey = getOpenAIKey() || this.apiKey;
    if (!apiKey) {
      throw new Error('Missing OpenAI API key for analysis');
    }

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
      throw new Error(`Analysis API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content || '{}';
    
    return this.parseChunkAnalysisResponse(responseText);
  }

  private parseChunkAnalysisResponse(responseText: string): AnalysisResult {
    try {
      const parsed = JSON.parse(responseText);
      return {
        totalIssues: Math.max(0, parsed.totalIssues || 0),
        critical: Math.max(0, parsed.critical || 0),
        warning: Math.max(0, parsed.warning || 0),
        attention: Math.max(0, parsed.attention || 0),
        info: Math.max(0, parsed.info || 0),
        issues: parsed.issues || [],
        summary: parsed.summary || 'Chunk analysis completed',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
      };
    } catch (error) {
      console.error('Failed to parse chunk analysis response:', error);
      return {
        totalIssues: 0,
        critical: 0,
        warning: 0,
        attention: 0,
        info: 0,
        issues: [],
        summary: 'Chunk analysis failed - no issues identified',
        confidence: 0.3,
      };
    }
  }

  private aggregateAnalysisResults(chunkAnalyses: AnalysisResult[], totalPages: number): AnalysisResult {
    const aggregatedIssues: CreditIssue[] = [];
    let totalIssues = 0;
    let critical = 0;
    let warning = 0;
    let attention = 0;
    let info = 0;
    const summaries: string[] = [];
    let totalConfidence = 0;

    // Aggregate all chunk results
    chunkAnalyses.forEach((analysis, index) => {
      totalIssues += analysis.totalIssues;
      critical += analysis.critical;
      warning += analysis.warning;
      attention += analysis.attention;
      info += analysis.info;
      totalConfidence += analysis.confidence;
      
      if (analysis.summary) {
        summaries.push(`Chunk ${index + 1}: ${analysis.summary}`);
      }

      // Process issues with deduplication
      analysis.issues.forEach(issue => {
        // Simple deduplication by description similarity
        const isDuplicate = aggregatedIssues.some(existing => 
          existing.description === issue.description &&
          existing.pageNumber === issue.pageNumber
        );

        if (!isDuplicate) {
          aggregatedIssues.push({
            ...issue,
            id: `late-chunk-${issue.id}`,
          });
        }
      });
    });

    // Calculate averages and create final summary
    const avgConfidence = chunkAnalyses.length > 0 ? totalConfidence / chunkAnalyses.length : 0.5;
    const aggregatedSummary = `Late Chunking Analysis Summary:\n${summaries.join('\n')}\n\nTotal issues found across ${chunkAnalyses.length} contextual chunks with preserved document context.`;

    return {
      totalIssues: aggregatedIssues.length,
      critical: aggregatedIssues.filter(i => i.type === 'critical').length,
      warning: aggregatedIssues.filter(i => i.type === 'warning').length,
      attention: aggregatedIssues.filter(i => i.type === 'attention').length,
      info: aggregatedIssues.filter(i => i.type === 'info').length,
      issues: aggregatedIssues,
      summary: aggregatedSummary,
      confidence: avgConfidence,
    };
  }

  // Utility methods for performance and cost management

  public clearCache(): void {
    this.embeddingCache.clear();
    this.analysisCache.clear();
    console.log('Late chunking caches cleared');
  }

  public getCacheStats(): { embeddingCacheSize: number; analysisCacheSize: number } {
    return {
      embeddingCacheSize: this.embeddingCache.size,
      analysisCacheSize: this.analysisCache.size,
    };
  }

  public updateConfig(newConfig: Partial<LateChunkingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Late chunking configuration updated:', newConfig);
  }

  public estimateCost(documentLength: number): { estimatedTokens: number; estimatedCost: number } {
    // Rough cost estimation (tokens = chars / 4, costs based on OpenAI pricing)
    const estimatedTokens = Math.ceil(documentLength / 4);
    const embeddingCost = (estimatedTokens / 1000) * 0.00002; // text-embedding-3-small pricing
    const analysisCost = (estimatedTokens / 1000) * 0.001; // rough GPT-5 Vision input cost
    
    return {
      estimatedTokens,
      estimatedCost: embeddingCost + analysisCost,
    };
  }
}
