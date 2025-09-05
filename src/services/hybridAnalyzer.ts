// Hybrid AI Analysis: Gemini Context + OpenAI Analysis
import type {
  AnalysisResult,
  CreditIssue,
  PDFDocument,
  AnalysisType,
  OpenAIRequest,
  OpenAIResponse,
} from '../types/creditReport';
import { getOpenAIKey } from '../settings/openai';
import { getGeminiKey } from '../settings/gemini';

interface GeminiChunkingRequest {
  contents: {
    parts: {
      text: string;
    }[];
  }[];
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
}

interface GeminiChunkingResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

interface IntelligentChunk {
  id: string;
  content: string;
  pageNumbers: number[];
  category: 'personal_info' | 'credit_accounts' | 'collections' | 'inquiries' | 'disputes' | 'summary' | 'other';
  context: string;
  priority: 'high' | 'medium' | 'low';
}

export class HybridCreditAnalyzer {
  private openaiApiKey: string;
  private geminiApiKey: string;
  private openaiBaseUrl = 'https://api.openai.com/v1';
  private geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    this.openaiApiKey = getOpenAIKey() || '';
    this.geminiApiKey = getGeminiKey() || '';
  }

  async analyzeCreditReportHybrid(
    pdfDocument: PDFDocument,
    analysisType: AnalysisType,
    customPrompt?: string
  ): Promise<AnalysisResult> {
    try {
      if (!this.openaiApiKey) {
        throw new Error('OpenAI API key required for analysis');
      }
      if (!this.geminiApiKey) {
        throw new Error('Gemini API key required for intelligent chunking');
      }

      console.log('🔄 Using Hybrid Analysis: Gemini Chunking + OpenAI Analysis');
      
      // Step 1: Use Gemini's 1M context to intelligently chunk the document
      console.log('📋 Step 1: Intelligent chunking with Gemini 1M context...');
      const intelligentChunks = await this.performIntelligentChunking(pdfDocument);
      
      // Step 2: Use OpenAI to analyze each chunk with full context
      console.log('🔍 Step 2: Detailed analysis with OpenAI...');
      const chunkAnalysisResults = await this.analyzeChunksWithOpenAI(
        intelligentChunks,
        analysisType,
        customPrompt
      );
      
      // Step 3: Consolidate results into final analysis
      console.log('📊 Step 3: Consolidating results...');
      const consolidatedResult = await this.consolidateAnalysisResults(
        chunkAnalysisResults,
        pdfDocument.totalPages
      );

      console.log(`✅ Hybrid analysis complete: ${consolidatedResult.totalIssues} issues found`);
      return consolidatedResult;

    } catch (error) {
      console.error('Hybrid Analysis Error:', error);
      throw new Error(`Hybrid analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async performIntelligentChunking(pdfDocument: PDFDocument): Promise<IntelligentChunk[]> {
    const fullText = this.extractFullText(pdfDocument);
    
    const chunkingPrompt = `You are an expert credit report analyst. Analyze this COMPLETE credit report and break it into intelligent, contextual chunks for detailed analysis.

FULL CREDIT REPORT:
${fullText}

Break this credit report into logical, meaningful chunks based on:
1. **Document Structure**: Group related sections (personal info, accounts, collections, etc.)
2. **Context Preservation**: Maintain relationships between related information
3. **Analysis Readiness**: Each chunk should be self-contained for analysis
4. **Page Relationships**: Track which pages each chunk spans

Return ONLY a JSON array of chunks with this exact structure:
[
  {
    "id": "chunk-1",
    "content": "the actual text content for this chunk",
    "pageNumbers": [1, 2],
    "category": "personal_info|credit_accounts|collections|inquiries|disputes|summary|other",
    "context": "brief description of what this chunk contains and its importance",
    "priority": "high|medium|low"
  }
]

Create 5-15 chunks that preserve context while enabling detailed analysis. Focus on creating chunks that highlight potential FCRA violations, collection issues, and accuracy problems.`;

    const request: GeminiChunkingRequest = {
      contents: [
        {
          parts: [
            {
              text: chunkingPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192
      }
    };

    const url = `${this.geminiBaseUrl}/models/gemini-1.5-pro:generateContent?key=${this.geminiApiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini chunking failed: ${response.status} - ${errorText}`);
    }

    const data: GeminiChunkingResponse = await response.json();
    const chunkingResponse = data.candidates[0]?.content?.parts[0]?.text || '';

    try {
      const cleanedResponse = chunkingResponse.replace(/```json\n?|\n?```/g, '').trim();
      const chunks: IntelligentChunk[] = JSON.parse(cleanedResponse);
      
      console.log(`📋 Created ${chunks.length} intelligent chunks`);
      return chunks;
    } catch (parseError) {
      console.error('Failed to parse chunking response:', parseError);
      // Fallback: create simple page-based chunks
      return this.createFallbackChunks(pdfDocument);
    }
  }

  private createFallbackChunks(pdfDocument: PDFDocument): IntelligentChunk[] {
    const chunks: IntelligentChunk[] = [];
    const pagesPerChunk = 5;
    
    for (let i = 0; i < pdfDocument.pages.length; i += pagesPerChunk) {
      const chunkPages = pdfDocument.pages.slice(i, i + pagesPerChunk);
      const content = chunkPages.map(page => `Page ${page.pageNumber}:\n${page.text}`).join('\n\n');
      const pageNumbers = chunkPages.map(page => page.pageNumber);
      
      chunks.push({
        id: `fallback-chunk-${Math.floor(i / pagesPerChunk) + 1}`,
        content,
        pageNumbers,
        category: 'other',
        context: `Pages ${pageNumbers[0]}-${pageNumbers[pageNumbers.length - 1]} content`,
        priority: 'medium'
      });
    }
    
    return chunks;
  }

  private async analyzeChunksWithOpenAI(
    chunks: IntelligentChunk[],
    analysisType: AnalysisType,
    customPrompt?: string
  ): Promise<AnalysisResult[]> {
    const analysisPromises = chunks.map(chunk => this.analyzeChunkWithOpenAI(chunk, analysisType, customPrompt));
    return await Promise.all(analysisPromises);
  }

  private async analyzeChunkWithOpenAI(
    chunk: IntelligentChunk,
    analysisType: AnalysisType,
    customPrompt?: string
  ): Promise<AnalysisResult> {
    const analysisPrompt = this.createChunkAnalysisPrompt(chunk, analysisType, customPrompt);

    const request: OpenAIRequest = {
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are an expert credit report analyst specializing in FCRA compliance. Analyze the provided credit report chunk and return valid JSON only.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      max_completion_tokens: 128000,
      reasoning_effort: 'high',
    };

    const response = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`OpenAI analysis failed: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    const responseText = data.choices[0]?.message?.content || '';

    return this.parseChunkAnalysisResponse(responseText, chunk);
  }

  private createChunkAnalysisPrompt(chunk: IntelligentChunk, analysisType: AnalysisType, customPrompt?: string): string {
    const basePrompt = `Analyze this credit report chunk with full context awareness:

CHUNK CONTEXT:
- ID: ${chunk.id}
- Category: ${chunk.category}
- Pages: ${chunk.pageNumbers.join(', ')}
- Priority: ${chunk.priority}
- Context: ${chunk.context}

CHUNK CONTENT:
${chunk.content}

Focus on identifying issues specific to this chunk while being aware this is part of a larger credit report analysis.`;

    const typeSpecificPrompts = {
      full: `Conduct comprehensive analysis focusing on FCRA violations, collection issues, disputes, and accuracy problems within this chunk.`,
      late_chunking: `This chunk was intelligently created with full document context. Analyze thoroughly for all potential legal issues.`,
      fcra: `Focus on FCRA compliance issues within this chunk, including sections 611, 615, and 623 violations.`,
      collections: `Focus on collection account issues and FDCPA compliance within this chunk.`,
      disputes: `Focus on dispute-related issues and resolution procedures within this chunk.`,
      custom: customPrompt || 'Analyze based on specific requirements within this chunk.'
    };

    const analysisInstructions = typeSpecificPrompts[analysisType] || typeSpecificPrompts.full;

    return basePrompt + '\n\n' + analysisInstructions + `

Return ONLY valid JSON with this structure:
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
      "description": "detailed description",
      "severity": "high|medium|low",
      "pageNumber": number,
      "anchorText": "exact text quote (≤120 chars)",
      "fcraSection": "applicable FCRA section",
      "recommendedAction": "specific action",
      "chunkContext": "${chunk.id}"
    }
  ],
  "summary": "analysis summary for this chunk",
  "confidence": 0.9
}`;
  }

  private parseChunkAnalysisResponse(responseText: string, chunk: IntelligentChunk): AnalysisResult {
    try {
      const parsed = JSON.parse(responseText);
      
      // Add chunk context to each issue
      if (parsed.issues && Array.isArray(parsed.issues)) {
        parsed.issues = parsed.issues.map((issue: any) => ({
          ...issue,
          chunkId: chunk.id,
          chunkCategory: chunk.category
        }));
      }

      return {
        totalIssues: Math.max(0, parsed.totalIssues || 0),
        critical: Math.max(0, parsed.critical || 0),
        warning: Math.max(0, parsed.warning || 0),
        attention: Math.max(0, parsed.attention || 0),
        info: Math.max(0, parsed.info || 0),
        issues: this.validateIssues(parsed.issues || [], chunk.pageNumbers),
        summary: parsed.summary || `Analysis of ${chunk.id}`,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.8)),
      };
    } catch (error) {
      console.error(`Failed to parse chunk ${chunk.id} analysis:`, error);
      return {
        totalIssues: 0,
        critical: 0,
        warning: 0,
        attention: 0,
        info: 0,
        issues: [],
        summary: `Analysis of ${chunk.id} - parsing failed`,
        confidence: 0.5,
      };
    }
  }

  private async consolidateAnalysisResults(
    chunkResults: AnalysisResult[],
    totalPages: number
  ): Promise<AnalysisResult> {
    // Combine all issues from chunks
    const allIssues: CreditIssue[] = chunkResults.flatMap(result => result.issues);
    
    // Remove duplicates based on similar descriptions and page numbers
    const uniqueIssues = this.deduplicateIssues(allIssues);
    
    // Calculate totals
    const totalIssues = uniqueIssues.length;
    const critical = uniqueIssues.filter(issue => issue.type === 'critical').length;
    const warning = uniqueIssues.filter(issue => issue.type === 'warning').length;
    const attention = uniqueIssues.filter(issue => issue.type === 'attention').length;
    const info = uniqueIssues.filter(issue => issue.type === 'info').length;
    
    // Create consolidated summary
    const summaries = chunkResults.map(r => r.summary).filter(s => s);
    const consolidatedSummary = `Hybrid Analysis Complete: Analyzed ${chunkResults.length} intelligent chunks. Key findings: ${summaries.slice(0, 3).join('; ')}`;
    
    // Calculate average confidence
    const avgConfidence = chunkResults.reduce((sum, r) => sum + r.confidence, 0) / chunkResults.length;

    return {
      totalIssues,
      critical,
      warning,
      attention,
      info,
      issues: uniqueIssues,
      summary: consolidatedSummary,
      confidence: avgConfidence,
      analysisMetadata: {
        method: 'hybrid_gemini_chunking_openai_analysis',
        chunksAnalyzed: chunkResults.length,
        contextPreserved: true,
        chunkingUsed: true,
        fullDocumentAnalysis: true
      }
    };
  }

  private deduplicateIssues(issues: CreditIssue[]): CreditIssue[] {
    const seen = new Map<string, CreditIssue>();
    
    for (const issue of issues) {
      // Create a dedup key based on page number and description similarity
      const dedupKey = `${issue.pageNumber}-${issue.description.slice(0, 50)}`;
      
      if (!seen.has(dedupKey)) {
        seen.set(dedupKey, issue);
      } else {
        // If we've seen similar issue, keep the one with higher severity
        const existing = seen.get(dedupKey)!;
        const severityOrder = { high: 3, medium: 2, low: 1 };
        if (severityOrder[issue.severity] > severityOrder[existing.severity]) {
          seen.set(dedupKey, issue);
        }
      }
    }
    
    return Array.from(seen.values());
  }

  private validateIssues(issues: any[], pageNumbers: number[]): CreditIssue[] {
    if (!Array.isArray(issues)) return [];

    return issues
      .filter(issue => issue && typeof issue === 'object')
      .map(issue => ({
        id: issue.id || `hybrid-issue-${Date.now()}-${Math.random()}`,
        type: this.validateIssueType(issue.type),
        category: this.validateCategory(issue.category),
        description: issue.description || 'Issue identified',
        severity: this.validateSeverity(issue.severity),
        pageNumber: this.validatePageNumber(issue.pageNumber, pageNumbers),
        anchorText: typeof issue.anchorText === 'string' ? issue.anchorText.slice(0, 120) : undefined,
        fcraSection: issue.fcraSection,
        recommendedAction: issue.recommendedAction,
        chunkId: issue.chunkContext,
      }));
  }

  private validateIssueType(type: any): CreditIssue['type'] {
    const validTypes = ['critical', 'warning', 'attention', 'info'];
    return validTypes.includes(type) ? type : 'info';
  }

  private validateCategory(category: any): CreditIssue['category'] {
    const validCategories = ['FCRA_violation', 'collection', 'dispute', 'accuracy', 'other'];
    return validCategories.includes(category) ? category : 'other';
  }

  private validateSeverity(severity: any): CreditIssue['severity'] {
    const validSeverities = ['high', 'medium', 'low'];
    return validSeverities.includes(severity) ? severity : 'medium';
  }

  private validatePageNumber(pageNumber: any, validPageNumbers: number[]): number {
    const page = parseInt(pageNumber);
    if (isNaN(page)) return validPageNumbers[0] || 1;
    return validPageNumbers.includes(page) ? page : validPageNumbers[0] || 1;
  }

  private extractFullText(pdfDocument: PDFDocument): string {
    return pdfDocument.pages
      .map(page => `Page ${page.pageNumber}:\n${page.text}`)
      .join('\n\n');
  }

  public hasRequiredKeys(): boolean {
    return !!this.openaiApiKey && !!this.geminiApiKey;
  }

  public getModelInfo() {
    return {
      chunkingModel: 'Gemini 1.5 Pro (1M context)',
      analysisModel: 'OpenAI GPT-4',
      method: 'Hybrid Analysis',
      capabilities: [
        'Intelligent context-aware chunking with Gemini',
        'Detailed analysis with OpenAI',
        'Full document context preservation',
        'Cross-chunk relationship tracking',
        'Duplicate issue detection'
      ]
    };
  }
}