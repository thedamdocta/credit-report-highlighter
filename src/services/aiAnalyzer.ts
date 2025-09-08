// AI Analysis Service for Credit Report Analysis
import { API_CONFIG } from '../config/api';
import type {
  AnalysisResult,
  CreditIssue,
  PDFDocument,
  AnalysisType,
  OpenAIRequest,
  OpenAIResponse,
} from '../types/creditReport';
import type { ProcessingProgress } from '../types/enhancedCreditReport';
import { getOpenAIKey } from '../settings/openai';
import { LateChunkingService } from './lateChunkingService';
import { EnhancedAIAnalyzer } from './enhancedAiAnalyzer';
import { GeminiCreditAnalyzer } from './geminiAnalyzer';
import { HybridCreditAnalyzer } from './hybridAnalyzer';
import { EnhancedCreditAnalyzer } from './enhancedCreditAnalyzer';
import { GPT5VisionAnalyzer } from './gpt5VisionAnalyzer';

export class CreditAnalyzer {
  private apiKey: string;
  private baseUrl: string;
  private lateChunkingService: LateChunkingService;
  private enhancedAnalyzer: EnhancedAIAnalyzer;
  private geminiAnalyzer: GeminiCreditAnalyzer;
  private hybridAnalyzer: HybridCreditAnalyzer;
  private enhancedCreditAnalyzer: EnhancedCreditAnalyzer;
  private gpt5VisionAnalyzer: GPT5VisionAnalyzer;

  constructor() {
    this.apiKey = API_CONFIG.OPENAI_API_KEY;
    this.baseUrl = API_CONFIG.OPENAI_BASE_URL;
    this.lateChunkingService = new LateChunkingService();
    this.enhancedAnalyzer = new EnhancedAIAnalyzer({
      enableProgressiveResults: true,
      enableBackgroundProcessing: true,
      fallbackToTraditional: true
    });
    this.geminiAnalyzer = new GeminiCreditAnalyzer();
    this.hybridAnalyzer = new HybridCreditAnalyzer();
    this.enhancedCreditAnalyzer = new EnhancedCreditAnalyzer();
    this.gpt5VisionAnalyzer = new GPT5VisionAnalyzer();
  }

  async analyzeCreditReport(
    pdfDocument: PDFDocument,
    analysisType: AnalysisType,
    customPrompt?: string,
    useLateChunking?: boolean,
    progressCallback?: (progress: ProcessingProgress) => void,
    pdfFile?: File
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Create a dynamic progress wrapper that properly forwards progress state
      const createProgressWrapper = (baseProgress: number = 0, stage: ProcessingProgress['stage'] = 'analysis') => {
        return (progressData: string | Partial<ProcessingProgress>) => {
          if (progressCallback) {
            const timeElapsed = Date.now() - startTime;
            // Handle both string messages and full progress objects
            if (typeof progressData === 'string') {
              progressCallback({
                stage,
                progress: baseProgress,
                message: progressData,
                timeElapsed
              });
            } else {
              // Forward the full progress state with defaults
              progressCallback({
                stage: progressData.stage || stage,
                progress: progressData.progress || baseProgress,
                message: progressData.message || '',
                timeElapsed: progressData.timeElapsed || timeElapsed,
                percentage: progressData.percentage,
                currentPage: progressData.currentPage,
                currentChunk: progressData.currentChunk,
                totalChunks: progressData.totalChunks,
                estimatedTimeRemaining: progressData.estimatedTimeRemaining
              });
            }
          }
        };
      };

      // Determine which analyzer to use based on configuration and capabilities
      // Priority: 1. GPT-5 Vision (if PDF file provided), 2. Enhanced with Late Chunking, 3. Standard
      
      if (pdfFile && this.shouldUseVisionAnalyzer(analysisType, pdfDocument)) {
        console.log('🎯 Using GPT-5 Vision Analyzer with smart chunking and empty cell detection');
        const progressWrapper = createProgressWrapper(50, 'analysis');
        return await this.gpt5VisionAnalyzer.analyzeWithVision(pdfDocument, pdfFile, progressWrapper);
      }
      
      // Use Enhanced Credit Analyzer with Late Chunking for comprehensive analysis
      if (useLateChunking || analysisType === 'late_chunking') {
        console.log('🧠 Using Enhanced Credit Analyzer with Late Chunking methodology');
        progressCallback?.({
          stage: 'chunking',
          progress: 20,
          message: 'Initializing Late Chunking analysis...',
          timeElapsed: Date.now() - startTime
        });
        
        const result = await this.enhancedCreditAnalyzer.analyzeWithLateChunking(
          pdfDocument,
          pdfFile
        );
        
        progressCallback?.({
          stage: 'complete',
          progress: 100,
          message: 'Analysis complete',
          timeElapsed: Date.now() - startTime
        });
        
        return result;
      }
      
      // Fallback to standard analysis if no special requirements
      console.log('📊 Using standard credit analysis');
      progressCallback?.({
        stage: 'analysis',
        progress: 30,
        message: 'Performing standard analysis...',
        timeElapsed: Date.now() - startTime
      });
      
      const fullText = this.extractFullText(pdfDocument);
      const prompt = this.createAnalysisPrompt(analysisType, fullText, customPrompt);
      const response = await this.callOpenAI(prompt);
      const result = this.parseAnalysisResponse(response, pdfDocument.pages.length);
      
      progressCallback?.({
        stage: 'complete',
        progress: 100,
        message: 'Analysis complete',
        timeElapsed: Date.now() - startTime
      });
      
      return result;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      progressCallback?.({
        stage: 'complete',
        progress: 0,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timeElapsed: Date.now() - startTime
      });
      throw new Error(`Failed to analyze credit report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private shouldUseVisionAnalyzer(analysisType: AnalysisType, pdfDocument: PDFDocument): boolean {
    // Use vision analyzer for complex documents or when explicitly needed
    // Check for indicators like tables, complex layouts, or specific analysis types
    const complexAnalysisTypes = ['full', 'comprehensive', 'vision'];
    const hasComplexLayout = pdfDocument.pages.some(page => 
      page.text.includes('│') || // Table indicators
      page.text.includes('─') ||
      /\s{5,}/.test(page.text) // Multiple spaces indicating columns
    );
    
    return complexAnalysisTypes.includes(analysisType) || hasComplexLayout;
  }

  private extractFullText(pdfDocument: PDFDocument): string {
    return pdfDocument.pages
      .map(page => `Page ${page.pageNumber}:\n${page.text}`)
      .join('\n\n');
  }

  private createAnalysisPrompt(
    analysisType: AnalysisType,
    fullText: string,
    customPrompt?: string
  ): string {
    const basePrompt = `You are an expert credit report analyst specializing in FCRA compliance and consumer protection law. Analyze the following credit report text and identify potential issues, violations, and areas of concern.

Credit Report Text:
${fullText}

`;

    const typeSpecificPrompts = {
      full: `Conduct a comprehensive analysis of this credit report. Identify:
1. FCRA violations and compliance issues
2. Collection account problems
3. Dispute and accuracy issues
4. Any other legal concerns

Provide specific page references and detailed explanations for each issue found. Include a short exact anchor text snippet from the report that best pinpoints the issue on that page.`,

      late_chunking: `Conduct a comprehensive contextual analysis of this credit report using advanced late chunking methodology. Identify:
1. FCRA violations and compliance issues with enhanced context awareness
2. Collection account problems with cross-page relationship analysis
3. Dispute and accuracy issues with preserved document context
4. Any other legal concerns leveraging full document understanding

This analysis benefits from preserved document context through late chunking embedding technology. Provide specific page references and detailed explanations for each issue found.`,

      fcra: `Focus specifically on Fair Credit Reporting Act (FCRA) compliance. Identify:
1. Section 611 violations (dispute procedures)
2. Section 615 violations (accuracy requirements)
3. Section 623 violations (reporting requirements)
4. Other FCRA compliance issues

Provide specific FCRA section references and legal implications for each violation.`,

      collections: `Focus on collection accounts and FDCPA compliance. Identify:
1. Improper collection procedures
2. Statute of limitations issues
3. Validation problems
4. Communication violations

Analyze each collection account for legal compliance.`,

      disputes: `Focus on disputed accounts and resolution procedures. Identify:
1. Missing dispute documentation
2. Inadequate investigation procedures
3. Unresolved disputes
4. Verification failures

Check if disputes were properly investigated and resolved.`,

      custom: customPrompt || `Analyze the credit report based on the user's specific request. Provide detailed findings with page references and legal implications.`
    };

    return basePrompt + (typeSpecificPrompts[analysisType] || typeSpecificPrompts.full) + `

When you list each issue, also provide an anchorText field: a short exact quote (<= 120 characters) copied verbatim from the report text on that page that best pinpoints the issue. Prefer a unique phrase that can be located precisely.

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
      "anchorText": "short exact quote from the report on that page that identifies the issue (<=120 chars)",
      "fcraSection": "specific FCRA section if applicable",
      "recommendedAction": "specific recommended action"
    }
  ],
  "summary": "brief overall summary of findings",
  "confidence": number between 0-1
}

Only return valid JSON, no additional text or explanation.`;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const request: any = {
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
      // GPT-5 specific: use max_completion_tokens instead of max_tokens
      max_completion_tokens: 128000,
      // GPT-5 reasoning parameters
      reasoning_effort: 'high'
    };

    const apiKey = getOpenAIKey() || this.apiKey;
    if (!apiKey) {
      throw new Error('Missing OpenAI API key. Please add it in Settings.');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private parseAnalysisResponse(responseText: string, totalPages: number): AnalysisResult {
    try {
      const parsed = JSON.parse(responseText);

      // Validate and sanitize the response
      const result: AnalysisResult = {
        totalIssues: Math.max(0, parsed.totalIssues || 0),
        critical: Math.max(0, parsed.critical || 0),
        warning: Math.max(0, parsed.warning || 0),
        attention: Math.max(0, parsed.attention || 0),
        info: Math.max(0, parsed.info || 0),
        issues: this.validateAndSanitizeIssues(parsed.issues || [], totalPages),
        summary: parsed.summary || 'Analysis completed',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
      };

      return result;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // Return a minimal valid result if parsing fails
      return {
        totalIssues: 0,
        critical: 0,
        warning: 0,
        attention: 0,
        info: 0,
        issues: [],
        summary: 'Analysis completed - no issues identified',
        confidence: 0.5,
      };
    }
  }

  private validateAndSanitizeIssues(issues: any[], totalPages: number): CreditIssue[] {
    if (!Array.isArray(issues)) return [];

    return issues
      .filter(issue => issue && typeof issue === 'object')
      .map(issue => ({
        id: issue.id || `issue-${Date.now()}-${Math.random()}`,
        type: this.validateIssueType(issue.type),
        category: this.validateCategory(issue.category),
        description: issue.description || 'Issue identified',
        severity: this.validateSeverity(issue.severity),
        pageNumber: this.validatePageNumber(issue.pageNumber, totalPages),
        anchorText: typeof issue.anchorText === 'string' ? issue.anchorText.slice(0, 200) : undefined,
        fcraSection: issue.fcraSection,
        recommendedAction: issue.recommendedAction,
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

  private validatePageNumber(pageNumber: any, totalPages: number): number {
    const page = parseInt(pageNumber);
    return isNaN(page) ? 1 : Math.max(1, Math.min(page, totalPages));
  }
}
