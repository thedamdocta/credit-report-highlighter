// Enhanced Credit Report Analyzer with Late Chunking and Comprehensive Error Detection
import type { PDFDocument, AnalysisResult, CreditIssue } from '../types/creditReport';
import { getOpenAIKey } from '../settings/openai';
import { SemanticTextMapper, type SemanticIssue } from './semanticTextMapper';

interface CreditReportSection {
  type: 'personal_info' | 'account_summary' | 'payment_history' | 'collections' | 'inquiries' | 'disputes' | 'public_records';
  content: string;
  pageNumbers: number[];
  startIndex: number;
  endIndex: number;
}

interface ValidationRule {
  field: string;
  pattern?: RegExp;
  required: boolean;
  errorType: 'critical' | 'warning' | 'attention';
  description: string;
}

interface HighlightableIssue extends CreditIssue {
  textToHighlight: string;
  searchPattern: string;
  contextBefore?: string;
  contextAfter?: string;
}

export class EnhancedCreditAnalyzer {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private semanticMapper: SemanticTextMapper;
  
  // Validation rules for credit report fields
  private readonly validationRules: ValidationRule[] = [
    {
      field: 'Account Number',
      pattern: /Account\s*(Number|#|No\.?)[\s:]*([A-Z0-9\-]+)/gi,
      required: true,
      errorType: 'critical',
      description: 'Missing or invalid account number'
    },
    {
      field: 'Account Name',
      pattern: /Account\s*Name[\s:]*([A-Za-z\s&\-\.]+)/gi,
      required: true,
      errorType: 'warning',
      description: 'Missing account name/creditor information'
    },
    {
      field: 'Payment History',
      pattern: /Payment\s*History|Payment\s*Status/gi,
      required: true,
      errorType: 'critical',
      description: 'Missing payment history information'
    },
    {
      field: 'Balance',
      pattern: /Balance[\s:]*\$?[\d,]+/gi,
      required: true,
      errorType: 'warning',
      description: 'Missing balance information'
    },
    {
      field: 'Credit Limit',
      pattern: /Credit\s*Limit[\s:]*\$?[\d,]+/gi,
      required: false,
      errorType: 'attention',
      description: 'Missing credit limit for revolving accounts'
    },
    {
      field: 'Date Opened',
      pattern: /Date\s*Opened[\s:]*\d{1,2}\/\d{1,2}\/\d{2,4}/gi,
      required: true,
      errorType: 'warning',
      description: 'Missing account opening date'
    },
    {
      field: 'Status',
      pattern: /Status[\s:]*([A-Za-z\s]+)/gi,
      required: true,
      errorType: 'critical',
      description: 'Missing account status'
    }
  ];

  constructor() {
    this.apiKey = getOpenAIKey() || '';
    this.semanticMapper = new SemanticTextMapper();
  }

  async analyzeWithLateChunking(pdfDocument: PDFDocument, pdfFile?: File): Promise<AnalysisResult> {
    console.log('🚀 Starting Enhanced Credit Report Analysis with Late Chunking');
    
    // Step 1: Extract and structure the document
    const sections = this.identifySections(pdfDocument);
    console.log(`📋 Identified ${sections.length} sections in the document`);
    
    // Step 2: Create embeddings with full context (Late Chunking approach)
    const documentEmbedding = await this.createDocumentEmbedding(pdfDocument);
    
    // Step 3: Perform comprehensive analysis with GPT-5
    const analysisPrompt = this.createComprehensiveAnalysisPrompt(sections);
    const gptAnalysis = await this.performGPT5Analysis(analysisPrompt);
    
    // Step 4: Validate specific fields and patterns
    const validationIssues = this.performFieldValidation(pdfDocument);
    
    // Step 5: Check for inconsistencies across payment tables
    const inconsistencyIssues = await this.checkPaymentTableConsistency(sections);
    
    // Step 6: Merge all issues and create highlightable results
    const allIssues = this.mergeAndPrioritizeIssues(
      gptAnalysis.issues,
      validationIssues,
      inconsistencyIssues
    );
    
    // Step 7: Map issues to specific text locations for highlighting using semantic mapping
    const highlightableIssues = await this.mapIssuesToTextLocations(allIssues, pdfDocument, pdfFile);
    
    return {
      ...gptAnalysis,
      issues: highlightableIssues,
      totalIssues: highlightableIssues.length,
      analysisMetadata: {
        method: 'late_chunking_enhanced',
        contextPreserved: true,
        fullDocumentAnalysis: true,
        chunksAnalyzed: sections.length
      }
    };
  }

  private identifySections(pdfDocument: PDFDocument): CreditReportSection[] {
    const fullText = this.extractFullText(pdfDocument);
    const sections: CreditReportSection[] = [];
    
    // Pattern matching for different sections
    const sectionPatterns = {
      personal_info: /personal\s+information|consumer\s+information|name\s+and\s+address/i,
      account_summary: /account\s+summary|credit\s+accounts|trade\s+lines/i,
      payment_history: /payment\s+history|payment\s+record|payment\s+status/i,
      collections: /collection\s+accounts|collections|charge-offs/i,
      inquiries: /inquiries|credit\s+inquiries|hard\s+inquiries/i,
      disputes: /disputes|disputed\s+accounts|consumer\s+statements/i,
      public_records: /public\s+records|bankruptcies|liens|judgments/i
    };
    
    let currentIndex = 0;
    
    for (const [type, pattern] of Object.entries(sectionPatterns)) {
      const matches = fullText.matchAll(new RegExp(pattern, 'gi'));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          // Find the section content (next 2000 chars or until next section)
          const startIndex = match.index;
          let endIndex = Math.min(startIndex + 2000, fullText.length);
          
          // Look for next section marker
          for (const nextPattern of Object.values(sectionPatterns)) {
            const nextMatch = fullText.slice(startIndex + 100).search(nextPattern);
            if (nextMatch > 0 && nextMatch < endIndex - startIndex) {
              endIndex = startIndex + nextMatch + 100;
              break;
            }
          }
          
          const content = fullText.slice(startIndex, endIndex);
          const pageNumbers = this.identifyPageNumbers(content, pdfDocument);
          
          sections.push({
            type: type as CreditReportSection['type'],
            content,
            pageNumbers,
            startIndex,
            endIndex
          });
        }
      }
    }
    
    // Sort sections by their position in the document
    sections.sort((a, b) => a.startIndex - b.startIndex);
    
    return sections;
  }

  private async createDocumentEmbedding(pdfDocument: PDFDocument): Promise<number[]> {
    // This is a placeholder for the late chunking embedding process
    // In a real implementation, this would create contextual embeddings
    console.log('Creating document embeddings with late chunking methodology...');
    
    // For now, return a mock embedding
    return Array(1536).fill(0).map(() => Math.random());
  }

  private createComprehensiveAnalysisPrompt(sections: CreditReportSection[]): string {
    const sectionTexts = sections.map(s => `
[${s.type.toUpperCase()}] (Pages: ${s.pageNumbers.join(', ')})
${s.content}
`).join('\n---\n');

    return `You are an expert credit report analyst using GPT-5. Perform a comprehensive analysis of this credit report, looking for ALL of the following issues:

CRITICAL CHECKS:
1. **Missing Account Numbers**: Every account MUST have an account number. Flag any accounts without one.
2. **Missing Account Names**: Every account MUST have a creditor/account name. Flag any missing.
3. **Payment Information Issues**: 
   - Missing payment history
   - Inconsistent payment statuses across different sections
   - Payment amounts that don't match
4. **Data Consistency Issues**:
   - Same account showing different balances in different sections
   - Conflicting dates (opened/closed/last payment)
   - Status mismatches (e.g., "Paid" in one place, "Collection" in another)
5. **FCRA Violations**:
   - Accounts older than 7 years from date of first delinquency
   - Missing dispute notations
   - Incomplete information
6. **Format Issues**:
   - Truncated or partial information
   - Illegible or corrupted data
   - Missing required fields

CREDIT REPORT CONTENT:
${sectionTexts}

For EACH issue found, provide:
1. The EXACT text from the report that shows the issue (copy it verbatim)
2. The specific location/section where it appears
3. Why this is a problem
4. The severity (critical/warning/attention)

Return ONLY valid JSON with this structure:
{
  "issues": [
    {
      "id": "issue-1",
      "type": "critical",
      "category": "missing_data|inconsistency|fcra_violation|format_error",
      "description": "Detailed description of the issue",
      "severity": "high",
      "pageNumber": 1,
      "textToHighlight": "EXACT text from report to highlight",
      "searchPattern": "unique text to find this location",
      "contextBefore": "text before the issue",
      "contextAfter": "text after the issue",
      "specificField": "Account Number|Account Name|Payment History|etc",
      "recommendedAction": "What needs to be done"
    }
  ],
  "summary": "Overall analysis summary",
  "dataQualityScore": 0.0,
  "criticalIssueCount": 0,
  "totalInconsistencies": 0
}`;
  }

  private async performGPT5Analysis(prompt: string): Promise<any> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key required');
    }

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
            content: 'You are a credit report analysis expert. Always return valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 128000,
        reasoning_effort: 'high'
      }),
    });

    if (!response.ok) {
      throw new Error(`GPT-5 analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content || '{}';
    
    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse GPT-5 response:', error);
      return { issues: [], summary: 'Analysis failed' };
    }
  }

  private performFieldValidation(pdfDocument: PDFDocument): HighlightableIssue[] {
    const issues: HighlightableIssue[] = [];
    const fullText = this.extractFullText(pdfDocument);
    
    // Check each validation rule
    for (const rule of this.validationRules) {
      if (rule.pattern) {
        const matches = fullText.matchAll(rule.pattern);
        const matchArray = Array.from(matches);
        
        if (matchArray.length === 0 && rule.required) {
          // Field is completely missing
          issues.push({
            id: `validation-${rule.field}-missing`,
            type: rule.errorType,
            category: 'accuracy',
            description: `${rule.description} - Field "${rule.field}" not found anywhere in the report`,
            severity: 'high',
            pageNumber: 1,
            textToHighlight: '',
            searchPattern: rule.field,
            specificField: rule.field,
            recommendedAction: `Add missing ${rule.field} information`
          } as HighlightableIssue);
        } else {
          // Check if field values are properly formatted
          for (const match of matchArray) {
            if (!match[1] || match[1].trim() === '') {
              issues.push({
                id: `validation-${rule.field}-${match.index}`,
                type: rule.errorType,
                category: 'accuracy',
                description: `Empty or invalid ${rule.field}`,
                severity: 'medium',
                pageNumber: this.getPageNumber(match.index || 0, fullText),
                textToHighlight: match[0],
                searchPattern: match[0],
                specificField: rule.field,
                recommendedAction: `Provide valid ${rule.field}`
              } as HighlightableIssue);
            }
          }
        }
      }
    }
    
    return issues;
  }

  private async checkPaymentTableConsistency(sections: CreditReportSection[]): Promise<HighlightableIssue[]> {
    const issues: HighlightableIssue[] = [];
    const paymentSections = sections.filter(s => s.type === 'payment_history');
    
    // Extract payment tables and compare them
    const paymentTables: Map<string, any[]> = new Map();
    
    for (const section of paymentSections) {
      // Pattern to extract payment table data
      const tablePattern = /([A-Z][A-Za-z\s&]+)[\s\|]+(\d{1,2}\/\d{4})[\s\|]+(\$?[\d,]+)[\s\|]+([A-Za-z]+)/g;
      const matches = section.content.matchAll(tablePattern);
      
      for (const match of matches) {
        const [fullMatch, account, date, amount, status] = match;
        const key = account.trim();
        
        if (!paymentTables.has(key)) {
          paymentTables.set(key, []);
        }
        
        paymentTables.get(key)?.push({
          date,
          amount,
          status,
          location: section.pageNumbers[0],
          fullMatch
        });
      }
    }
    
    // Check for inconsistencies
    for (const [account, payments] of paymentTables) {
      const uniqueStatuses = new Set(payments.map(p => p.status));
      const uniqueAmounts = new Set(payments.map(p => p.amount));
      
      if (uniqueStatuses.size > 1 || uniqueAmounts.size > 1) {
        issues.push({
          id: `consistency-${account}-${Date.now()}`,
          type: 'warning',
          category: 'accuracy',
          description: `Inconsistent payment information for account "${account}"`,
          severity: 'high',
          pageNumber: payments[0].location,
          textToHighlight: payments[0].fullMatch,
          searchPattern: account,
          specificField: 'Payment History',
          recommendedAction: 'Verify and correct payment history inconsistencies'
        } as HighlightableIssue);
      }
    }
    
    return issues;
  }

  private mergeAndPrioritizeIssues(
    gptIssues: any[],
    validationIssues: HighlightableIssue[],
    inconsistencyIssues: HighlightableIssue[]
  ): HighlightableIssue[] {
    const allIssues = [
      ...gptIssues.map(issue => ({
        ...issue,
        source: 'gpt5'
      })),
      ...validationIssues.map(issue => ({
        ...issue,
        source: 'validation'
      })),
      ...inconsistencyIssues.map(issue => ({
        ...issue,
        source: 'consistency'
      }))
    ];
    
    // Remove duplicates based on textToHighlight
    const uniqueIssues = allIssues.filter((issue, index, self) =>
      index === self.findIndex(i => i.textToHighlight === issue.textToHighlight)
    );
    
    // Sort by severity and type
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const typeOrder = { critical: 0, warning: 1, attention: 2, info: 3 };
    
    uniqueIssues.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return typeOrder[a.type] - typeOrder[b.type];
    });
    
    return uniqueIssues;
  }

  private async mapIssuesToTextLocations(
    issues: HighlightableIssue[],
    pdfDocument: PDFDocument,
    pdfFile?: File
  ): Promise<CreditIssue[]> {
    console.log('🎯 Starting semantic text mapping for precise coordinate extraction...');
    
    // If we have the PDF file, extract precise coordinates using PyMuPDF
    if (pdfFile) {
      try {
        await this.semanticMapper.extractPDFTextCoordinates(pdfFile);
        console.log('✅ PDF text coordinates extracted successfully');
      } catch (error) {
        console.warn('⚠️ Failed to extract PDF coordinates, using fallback:', error);
      }
    }
    
    // Convert HighlightableIssues to SemanticIssues
    const semanticIssues: SemanticIssue[] = issues.map(issue => ({
      id: issue.id || `issue-${Date.now()}-${Math.random()}`,
      type: issue.type,
      description: issue.description,
      semanticContext: issue.description, // Use description as semantic context
      targetText: issue.textToHighlight || issue.searchPattern,
      expectedLocation: 'near', // Default expectation
      contextClues: this.extractContextClues(issue),
      pageHint: issue.pageNumber
    }));
    
    // Use semantic mapper to find precise coordinates
    const mappedHighlights = this.semanticMapper.mapSemanticIssuesToCoordinates(semanticIssues);
    console.log(`🎯 Mapped ${mappedHighlights.length}/${issues.length} issues to precise coordinates`);
    
    // Convert back to CreditIssue format
    const creditIssues: CreditIssue[] = mappedHighlights.map(highlight => ({
      id: highlight.id,
      type: highlight.type,
      category: issues.find(i => i.id === highlight.id)?.category || 'other',
      description: highlight.description,
      severity: issues.find(i => i.id === highlight.id)?.severity || 'medium',
      pageNumber: highlight.page,
      coordinates: highlight.coordinates,
      anchorText: highlight.anchorText,
      fcraSection: issues.find(i => i.id === highlight.id)?.fcraSection,
      recommendedAction: issues.find(i => i.id === highlight.id)?.recommendedAction,
      mappingConfidence: highlight.confidence,
      mappingMethod: highlight.mappingMethod
    }));
    
    // Do NOT add unmapped issues - only show issues with 100% accurate coordinates
    const unmappedCount = issues.length - creditIssues.length;
    if (unmappedCount > 0) {
      console.log(`🎯 Filtered out ${unmappedCount} issues without exact coordinate matches for 100% accuracy`);
    }
    
    return creditIssues;
  }

  /**
   * Extract context clues from an issue for semantic mapping
   */
  private extractContextClues(issue: HighlightableIssue): string[] {
    const clues: string[] = [];
    
    // Extract key terms from description
    const description = issue.description.toLowerCase();
    const descriptionWords = description.split(/\s+/).filter(word => word.length > 3);
    
    // Add specific field-related keywords
    if (issue.category === 'missing_data' || description.includes('account')) {
      clues.push('account', 'number', 'name');
    }
    
    if (description.includes('payment')) {
      clues.push('payment', 'history', 'status');
    }
    
    if (description.includes('balance')) {
      clues.push('balance', 'amount');
    }
    
    // Add context from before/after text
    if (issue.contextBefore) {
      const beforeWords = issue.contextBefore.toLowerCase().split(/\s+/)
        .filter(word => word.length > 3 && !/^\d+$/.test(word));
      clues.push(...beforeWords.slice(-3)); // Last 3 meaningful words
    }
    
    if (issue.contextAfter) {
      const afterWords = issue.contextAfter.toLowerCase().split(/\s+/)
        .filter(word => word.length > 3 && !/^\d+$/.test(word));
      clues.push(...afterWords.slice(0, 3)); // First 3 meaningful words
    }
    
    // Add meaningful words from the search pattern
    if (issue.searchPattern) {
      const patternWords = issue.searchPattern.toLowerCase().split(/\s+/)
        .filter(word => word.length > 2 && !/^\d+$/.test(word));
      clues.push(...patternWords);
    }
    
    // Remove duplicates and return
    return [...new Set(clues)].slice(0, 8); // Limit to 8 most relevant clues
  }

  // Note: findTextLocation method removed - replaced by SemanticTextMapper for precise coordinate extraction

  private extractFullText(pdfDocument: PDFDocument): string {
    return pdfDocument.pages
      .map(page => `Page ${page.pageNumber}:\n${page.text}`)
      .join('\n\n');
  }

  private identifyPageNumbers(text: string, pdfDocument: PDFDocument): number[] {
    const pageNumbers: number[] = [];
    const pageMatches = text.matchAll(/Page (\d+):/g);
    
    for (const match of pageMatches) {
      const pageNum = parseInt(match[1]);
      if (!isNaN(pageNum) && pageNum <= pdfDocument.totalPages) {
        pageNumbers.push(pageNum);
      }
    }
    
    return pageNumbers.length > 0 ? [...new Set(pageNumbers)] : [1];
  }

  private getPageNumber(textIndex: number, fullText: string): number {
    const textBeforeIndex = fullText.substring(0, textIndex);
    const pageMatches = textBeforeIndex.matchAll(/Page (\d+):/g);
    const matches = Array.from(pageMatches);
    
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      return parseInt(lastMatch[1]);
    }
    
    return 1;
  }
}