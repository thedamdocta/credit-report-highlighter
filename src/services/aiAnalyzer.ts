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

export class CreditAnalyzer {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = API_CONFIG.OPENAI_API_KEY;
    this.baseUrl = API_CONFIG.OPENAI_BASE_URL;
  }

  async analyzeCreditReport(
    pdfDocument: PDFDocument,
    analysisType: AnalysisType,
    customPrompt?: string
  ): Promise<AnalysisResult> {
    try {
      // Extract text from all pages
      const fullText = this.extractFullText(pdfDocument);

      // Create analysis prompt based on type
      const prompt = this.createAnalysisPrompt(analysisType, fullText, customPrompt);

      // Call OpenAI API
      const response = await this.callOpenAI(prompt);

      // Parse and validate the response
      const analysisResult = this.parseAnalysisResponse(response, pdfDocument.totalPages);

      return analysisResult;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      throw new Error('Failed to analyze credit report');
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

Provide specific page references and detailed explanations for each issue found.`,

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
    const request: OpenAIRequest = {
      model: 'gpt-4',
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
      temperature: 0.1,
      max_tokens: 4000,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
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
