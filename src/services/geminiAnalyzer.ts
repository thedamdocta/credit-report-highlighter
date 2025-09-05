// Gemini AI Analysis Service for Credit Reports with 1M token context
import type {
  AnalysisResult,
  CreditIssue,
  PDFDocument,
  AnalysisType,
} from '../types/creditReport';
import { getGeminiKey, setGeminiKey } from '../settings/gemini';

export interface GeminiRequest {
  contents: {
    parts: {
      text: string;
    }[];
  }[];
  generationConfig: {
    temperature: number;
    topK?: number;
    topP?: number;
    maxOutputTokens: number;
  };
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
    safetyRatings: any[];
  }[];
}

export class GeminiCreditAnalyzer {
  private apiKey: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
  private model: string = 'gemini-1.5-pro'; // 1M token context window

  constructor() {
    // Check for Gemini API key in environment or settings
    this.apiKey = this.getGeminiApiKey();
  }

  private getGeminiApiKey(): string {
    return getGeminiKey() || '';
  }

  async analyzeCreditReport(
    pdfDocument: PDFDocument,
    analysisType: AnalysisType,
    customPrompt?: string
  ): Promise<AnalysisResult> {
    try {
      if (!this.apiKey) {
        throw new Error('Gemini API key not found. Please set it in settings.');
      }

      console.log('Using Gemini 1.5 Pro with 1M token context for full document analysis');

      // Extract full text - no chunking needed with 1M context!
      const fullText = this.extractFullText(pdfDocument);
      console.log(`Analyzing full document: ${fullText.length} characters (~${Math.round(fullText.length / 4)} tokens)`);

      // Create analysis prompt
      const prompt = this.createAnalysisPrompt(analysisType, fullText, customPrompt);

      // Call Gemini API with full document context
      const response = await this.callGemini(prompt);

      // Parse and validate the response
      const analysisResult = this.parseAnalysisResponse(response, pdfDocument.totalPages);

      console.log(`✅ Gemini analysis complete: found ${analysisResult.totalIssues} issues`);
      return analysisResult;

    } catch (error) {
      console.error('Gemini Analysis Error:', error);
      throw new Error(`Failed to analyze credit report with Gemini: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    const basePrompt = `You are an expert credit report analyst with deep knowledge of FCRA compliance, consumer protection law, and credit reporting regulations. 

You have access to the COMPLETE credit report with full context preservation - no information has been lost through chunking.

Analyze the following complete credit report and identify ALL potential issues, violations, and areas of concern with perfect accuracy:

FULL CREDIT REPORT:
${fullText}

`;

    const typeSpecificPrompts = {
      full: `Conduct a comprehensive analysis of this COMPLETE credit report. With full document context, identify:

1. **FCRA Violations & Compliance Issues**:
   - Section 611 violations (dispute procedures)
   - Section 615 violations (accuracy requirements) 
   - Section 623 violations (reporting requirements)
   - Any procedural violations

2. **Collection Account Problems**:
   - Improper collection procedures
   - Statute of limitations issues
   - Validation problems
   - FDCPA compliance issues

3. **Accuracy & Dispute Issues**:
   - Incorrect account information
   - Missing dispute documentation
   - Inadequate investigation procedures
   - Verification failures

4. **Cross-Page Relationship Analysis**:
   - Link related issues across different pages
   - Identify patterns and inconsistencies
   - Find supporting evidence spread throughout the document

5. **Legal Concerns & Recommendations**:
   - Prioritize issues by legal significance
   - Provide specific remediation steps

Since you have the complete document context, ensure you:
- Reference specific page numbers accurately
- Identify cross-page relationships and patterns
- Provide comprehensive analysis without missing context
- Include exact text snippets for precise highlighting`,

      late_chunking: `This analysis benefits from COMPLETE document context (no chunking required with 1M token window). Perform the same comprehensive analysis as 'full' mode.`,

      fcra: `Focus on Fair Credit Reporting Act (FCRA) compliance with COMPLETE document context:
1. Section 611 violations (dispute procedures)
2. Section 615 violations (accuracy requirements)
3. Section 623 violations (reporting requirements)
4. Cross-reference violations across the entire document
5. Identify systematic compliance failures

With full context, provide precise legal analysis and specific FCRA section references.`,

      collections: `Focus on collection accounts and FDCPA compliance with COMPLETE document access:
1. Review ALL collection accounts throughout the document
2. Identify improper collection procedures
3. Check statute of limitations across all entries
4. Validate collection account accuracy
5. Cross-reference collection patterns

Leverage full document context for comprehensive collection analysis.`,

      disputes: `Focus on disputed accounts with COMPLETE document context:
1. Identify ALL dispute references throughout the document
2. Track dispute resolution procedures across pages
3. Find missing documentation or inadequate investigations
4. Cross-reference dispute outcomes with account status
5. Identify systematic dispute handling failures`,

      custom: customPrompt || `Analyze the complete credit report based on your specific requirements with full document context.`
    };

    const analysisPrompt = typeSpecificPrompts[analysisType] || typeSpecificPrompts.full;

    return basePrompt + analysisPrompt + `

**IMPORTANT FORMATTING**: Return ONLY a valid JSON object with this exact structure:

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
      "description": "detailed description with full context",
      "severity": "high|medium|low",
      "pageNumber": number,
      "anchorText": "exact text snippet for highlighting (≤120 chars)",
      "fcraSection": "specific FCRA section if applicable",
      "recommendedAction": "specific action with legal basis",
      "crossPageReferences": ["list of related page numbers if applicable"]
    }
  ],
  "summary": "comprehensive summary leveraging full document analysis",
  "confidence": 0.95,
  "analysisMethod": "complete_document_1M_context"
}

Return ONLY the JSON - no additional text, explanations, or formatting.`;
  }

  private async callGemini(prompt: string): Promise<string> {
    const request: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for factual analysis
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 8192 // Plenty for detailed JSON response
      }
    };

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const candidate = data.candidates[0];
    if (candidate.finishReason !== 'STOP') {
      console.warn(`Gemini response finished with reason: ${candidate.finishReason}`);
    }

    return candidate.content.parts[0].text || '';
  }

  private parseAnalysisResponse(responseText: string, totalPages: number): AnalysisResult {
    try {
      // Clean up response text (remove any markdown formatting)
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      
      const parsed = JSON.parse(cleanedResponse);

      // Validate and sanitize the response
      const result: AnalysisResult = {
        totalIssues: Math.max(0, parsed.totalIssues || 0),
        critical: Math.max(0, parsed.critical || 0),
        warning: Math.max(0, parsed.warning || 0),
        attention: Math.max(0, parsed.attention || 0),
        info: Math.max(0, parsed.info || 0),
        issues: this.validateAndSanitizeIssues(parsed.issues || [], totalPages),
        summary: parsed.summary || 'Complete document analysis completed with full context',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.9)),
      };

      // Add metadata about full context analysis
      result.analysisMetadata = {
        method: parsed.analysisMethod || 'complete_document_1M_context',
        contextPreserved: true,
        chunkingUsed: false,
        fullDocumentAnalysis: true
      };

      return result;
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      console.error('Response text:', responseText.substring(0, 500));
      
      // Return minimal valid result if parsing fails
      return {
        totalIssues: 0,
        critical: 0,
        warning: 0,
        attention: 0,
        info: 0,
        issues: [],
        summary: 'Analysis completed but response parsing failed',
        confidence: 0.5,
        analysisMetadata: {
          method: 'gemini_parse_error',
          contextPreserved: false,
          chunkingUsed: false,
          fullDocumentAnalysis: false
        }
      };
    }
  }

  private validateAndSanitizeIssues(issues: any[], totalPages: number): CreditIssue[] {
    if (!Array.isArray(issues)) return [];

    return issues
      .filter(issue => issue && typeof issue === 'object')
      .map(issue => ({
        id: issue.id || `gemini-issue-${Date.now()}-${Math.random()}`,
        type: this.validateIssueType(issue.type),
        category: this.validateCategory(issue.category),
        description: issue.description || 'Issue identified by Gemini analysis',
        severity: this.validateSeverity(issue.severity),
        pageNumber: this.validatePageNumber(issue.pageNumber, totalPages),
        anchorText: typeof issue.anchorText === 'string' ? issue.anchorText.slice(0, 120) : undefined,
        fcraSection: issue.fcraSection,
        recommendedAction: issue.recommendedAction,
        crossPageReferences: Array.isArray(issue.crossPageReferences) ? issue.crossPageReferences : undefined,
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

  /**
   * Check if Gemini API key is available
   */
  public hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Set Gemini API key
   */
  public setApiKey(key: string): void {
    this.apiKey = key;
    setGeminiKey(key);
  }

  /**
   * Get current model info
   */
  public getModelInfo() {
    return {
      model: this.model,
      contextWindow: '1M tokens',
      provider: 'Google',
      capabilities: [
        'Full document analysis',
        'No chunking required',
        'Perfect context preservation',
        'Cross-page relationship analysis',
        'Cost effective'
      ]
    };
  }
}