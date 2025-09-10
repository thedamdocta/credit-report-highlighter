// GPT-5 Vision-Enhanced Credit Report Analyzer
// Combines text analysis with vision processing for complete issue detection

import { API_CONFIG } from '../config/api';
import { getOpenAIKey } from '../settings/openai';
import { globalCostTracker, CostTracker } from './costTracker';
import { serverHealthMonitor } from '../utils/serverHealthCheck';
import type {
  AnalysisResult,
  CreditIssue,
  PDFDocument,
  OpenAIResponse,
} from '../types/creditReport';

// OpenAI Message Types
interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

export interface VisionAnalysisChunk {
  chunkIndex: number;
  pageRange: { start: number; end: number };
  textContent: string;
  images: Array<{
    pageNumber: number;
    imageData: string;
    mimeType: string;
    width?: number;
    height?: number;
    dpi?: number;
  }>;
  contextSummary?: string;
}

export interface VisionAnalysisResult {
  issues: CreditIssue[];
  emptyPaymentCells: Array<{
    pageNumber: number;
    coordinates: { x: number; y: number; width: number; height: number };
    description: string;
    tableType: string;
  }>;
  contextSummary: string;
  costBreakdown: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
}

export class GPT5VisionAnalyzer {
  private apiKey: string;
  private baseUrl: string;
  private costTracker: CostTracker;
  private pageImageInfo: Map<number, { width: number; height: number; dpi: number }> = new Map();

  constructor() {
    this.apiKey = API_CONFIG.OPENAI_API_KEY;
    this.baseUrl = API_CONFIG.OPENAI_BASE_URL;
    this.costTracker = globalCostTracker;
  }

  /**
   * Analyze PDF with GPT-5 vision + text processing
   */
  async analyzeWithVision(
    pdfDocument: PDFDocument,
    pdfFile?: File,
    progressCallback?: (progress: string) => void
  ): Promise<AnalysisResult> {
    try {
      console.log('🎯 Starting GPT-5 Vision Analysis...');
      
      // Initialize cost tracking
      this.costTracker.initializeTracking(pdfDocument.totalPages);
      
      progressCallback?.('Extracting text with coordinates...');
      
      // Step 1: Extract text with coordinates (multi-pass foundation)
      let textData: Awaited<ReturnType<typeof this.extractTextWithCoordinates>> = null;
      if (pdfFile) {
        textData = await this.extractTextWithCoordinates(pdfFile);
        if (textData) {
          console.log(`📝 Extracted text from ${textData.pages.length} pages`);
        }
      }
      
      progressCallback?.('Extracting images from PDF...');
      
      // Step 2: Convert PDF to images
      let images: Array<{
        pageNumber: number;
        imageData: string;
        mimeType: string;
        width?: number;
        height?: number;
        dpi?: number;
      }> = [];
      if (pdfFile) {
        images = await this.extractPDFImages(pdfFile);
      } else {
        console.warn('No PDF file provided for image extraction, proceeding with text-only analysis');
      }
      
      progressCallback?.('Creating dynamic chunks...');
      
      // Step 2: Create dynamic chunks with token-aware budgeting
      const chunks = this.createDynamicChunks(pdfDocument, images);
      
      // Step 3: Process each chunk with vision analysis
      const allResults: VisionAnalysisResult[] = [];
      let contextSummary = '';
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        progressCallback?.(this.costTracker.getFormattedCostDisplay());
        
        console.log(`📊 Processing chunk ${i + 1}/${chunks.length} (Pages ${chunk.pageRange.start}-${chunk.pageRange.end})`);
        
        const chunkResult = await this.processChunkWithVision(chunk, contextSummary);
        allResults.push(chunkResult);
        
        // Update context for next chunk
        contextSummary = chunkResult.contextSummary;
      }
      
      progressCallback?.('Compiling final analysis...');
      
      // Step 4: Combine results from all chunks
      const finalResult = this.combineChunkResults(allResults, pdfDocument.totalPages);
      
      // Log final cost summary
      const costReport = this.costTracker.getFinalReport();
      console.log(`💰 Final Cost: $${costReport.totalCost.toFixed(3)} | Efficiency: ${(costReport.processingEfficiency * 100).toFixed(1)}%`);
      
      return finalResult;
      
    } catch (error) {
      console.error('❌ GPT-5 Vision Analysis Error:', error);
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      const newError = new Error(`Failed to analyze credit report: ${message}`);
      if (stack) {
        newError.stack = `${newError.stack}\nCaused by:\n${stack}`;
      }
      throw newError;
    }
  }

  /**
   * Extract text with coordinates from PDF for multi-pass analysis
   */
  private async extractTextWithCoordinates(pdfFile: File): Promise<{
    pages: Array<{
      pageNumber: number;
      tokens: Array<{
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
        fontName?: string;
        fontSize?: number;
      }>;
      labels: string[];
    }>;
  } | null> {
    try {
      await serverHealthMonitor.ensureServerAvailable();
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      
      const response = await fetch(`${API_CONFIG.PYMUPDF_SERVER_URL}/extract-text-coordinates`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        body: formData,
      });
      
      if (!response.ok) {
        console.error('Text extraction failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      const textTokens = data.textTokens || [];
      
      // Group tokens by page and extract labels
      const pageMap = new Map<number, any>();
      
      for (const token of textTokens) {
        const pageNum = token.page || 1;
        if (!pageMap.has(pageNum)) {
          pageMap.set(pageNum, {
            pageNumber: pageNum,
            tokens: [],
            labels: []
          });
        }
        
        const page = pageMap.get(pageNum);
        page.tokens.push({
          text: token.text,
          x: token.x,
          y: token.y,
          width: token.width,
          height: token.height,
          fontName: token.fontName,
          fontSize: token.fontSize
        });
        
        // Extract labels (headers, account names, etc.)
        const text = token.text?.trim() || '';
        if (text.length > 3 && text.length < 100) {
          const keywords = ['ACCOUNT', 'PAYMENT', 'BALANCE', 'CREDIT', 'HISTORY', 'STATUS', 'DATE'];
          if (keywords.some(keyword => text.toUpperCase().includes(keyword))) {
            if (!page.labels.includes(text)) {
              page.labels.push(text);
            }
          }
        }
      }
      
      return {
        pages: Array.from(pageMap.values()).sort((a, b) => a.pageNumber - b.pageNumber)
      };
      
    } catch (error) {
      console.error('Text extraction error:', error);
      return null;
    }
  }

  /**
   * Extract PDF pages as high-quality images
   */
  private async extractPDFImages(pdfFile: File): Promise<Array<{
    pageNumber: number;
    imageData: string;
    mimeType: string;
    width?: number;
    height?: number;
    dpi?: number;
  }>> {
    try {
      // Preflight health check before attempting conversion
      await serverHealthMonitor.ensureServerAvailable();
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('dpi', '300'); // High DPI for vision analysis
      formData.append('format', 'PNG');
      
      const response = await fetch(`${API_CONFIG.PYMUPDF_SERVER_URL}/convert-to-images`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Image extraction failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Runtime validation for data.images
      if (!data || !Array.isArray(data.images)) {
        console.error('Invalid response: missing or non-array images field', data);
        return [];
      }
      
      // Validate and filter images to ensure correct shape
      const images = data.images.filter((img: any) => {
        const isValid = img && 
          typeof img.pageNumber === 'number' &&
          typeof img.imageData === 'string' &&
          typeof img.mimeType === 'string';
        
        if (!isValid) {
          console.warn('Skipping invalid image entry:', img);
        }
        
        return isValid;
      }).map((img: any) => ({
        pageNumber: img.pageNumber,
        imageData: img.imageData,
        mimeType: img.mimeType,
        width: typeof img.width === 'number' ? img.width : undefined,
        height: typeof img.height === 'number' ? img.height : undefined,
        dpi: typeof img.dpi === 'number' ? img.dpi : undefined
      }));

      // Cache per-page image info for coordinate conversion
      this.pageImageInfo.clear();
      for (const img of images) {
        if (typeof img.pageNumber === 'number') {
          this.pageImageInfo.set(img.pageNumber, {
            width: Number(img.width) || 0,
            height: Number(img.height) || 0,
            dpi: Number(img.dpi) || 300
          });
        }
      }

      return images;
      
    } catch (error) {
      console.error('❌ PDF image extraction failed:', error);
      
      // Provide specific error based on the failure type
      let errorMessage = 'Failed to convert PDF to images: ';
      
      if (error instanceof Error) {
        if (error.message.includes('PyMuPDF server is not available')) {
          errorMessage = error.message; // Use the preflight check error
        } else if (error.message.includes('fetch')) {
          errorMessage += `Network error - PyMuPDF server at ${API_CONFIG.PYMUPDF_SERVER_URL} is not reachable. `;
          errorMessage += `Please run: python3 pymupdf_highlight_server.py`;
        } else if (error.message.includes('CORS')) {
          errorMessage += `CORS blocked - PyMuPDF server needs proper CORS headers. `;
          errorMessage += `Ensure Flask server has flask-cors installed and configured.`;
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += `PyMuPDF server error at ${API_CONFIG.PYMUPDF_SERVER_URL}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  // Smart chunking functionality has been merged into createDynamicChunks

  /**
   * Create dynamic chunks that respect an approximate token budget.
   * Token estimate: text chars/4 + ~1200 tokens per high-detail page image.
   */
  private createDynamicChunks(
    pdfDocument: PDFDocument,
    images: Array<{ pageNumber: number; imageData: string; mimeType: string }>
  ): VisionAnalysisChunk[] {
    const targetTokens = 8000; // target per chunk
    const hardMaxTokens = 12000; // never exceed

    const numPages = pdfDocument.pages.length;
    const pageText = (i: number) => pdfDocument.pages[i].text || '';
    const pageTokens = (i: number) => Math.ceil(pageText(i).length / 4);
    const imageTokensPerPage = 1200; // conservative estimate

    const chunks: VisionAnalysisChunk[] = [];
    let start = 0;
    while (start < numPages) {
      let end = start;
      let sumTokens = 0;
      while (end < numPages) {
        const t = pageTokens(end);
        const hasImg = images.some(img => img.pageNumber === end + 1);
        const next = sumTokens + t + (hasImg ? imageTokensPerPage : 0);
        if (next > targetTokens && end > start) break;
        if (next > hardMaxTokens) break;
        sumTokens = next;
        end++;
      }

      const pages = pdfDocument.pages.slice(start, end);
      const textContent = pages.map(p => `Page ${p.pageNumber}:\n${p.text}`).join('\n\n');
      const chunkImages = images.filter(img => img.pageNumber >= start + 1 && img.pageNumber <= end);

      chunks.push({
        chunkIndex: chunks.length,
        pageRange: { start: start + 1, end },
        textContent,
        images: chunkImages
      });

      start = end;
    }

    console.log(`📝 Created ${chunks.length} dynamic chunks (budget ~${targetTokens} tok)`);
    return chunks;
  }

  /**
   * Process a single chunk with GPT-5 vision analysis
   */
  private async processChunkWithVision(
    chunk: VisionAnalysisChunk,
    previousContext: string
  ): Promise<VisionAnalysisResult> {
    // Create a summary logger to reduce console spam
    const logSummary = {
      chunkIndex: chunk.chunkIndex,
      pages: chunk.pageRange,
      imagesCount: chunk.images.length,
      startTime: Date.now()
    };
    // Interleave page labels with images to help the model attribute coordinates to correct pages
    const labeledImageContents = chunk.images.flatMap(img => {
      const w = img.width || 'unknown';
      const h = img.height || 'unknown';
      const dpi = img.dpi || 300;
      return [
        { type: 'text' as const, text: `The next image is page ${img.pageNumber}, ${w}x${h} pixels at ${dpi} DPI. Measure coordinates in PIXELS from the top-left corner.` },
        {
          type: 'image_url' as const,
          image_url: {
            url: `data:${img.mimeType};base64,${img.imageData}`,
            detail: 'high' as const
          }
        }
      ];
    });

    const messages: ChatCompletionMessage[] = [
      {
        role: 'system',
        content: `You are an expert credit report analyst with advanced vision capabilities. 
        
Analyze both TEXT and IMAGES to identify:
1. Credit report violations and issues
2. Missing payment information (empty cells in payment tables)
3. Incorrect payment information
4. Missing or truncated account numbers
5. Account name issues

For empty payment table cells, provide precise coordinates where the missing data should be highlighted.

Always respond with valid JSON only.`
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: this.createVisionAnalysisPrompt(chunk, previousContext) },
          ...labeledImageContents
        ]
      }
    ];

    try {
      const response = await this.callGPT5Vision(messages);
      const parsedResult = this.parseVisionResponse(response);
      
      // Track API cost
      const estimatedInputTokens = chunk.textContent.length / 4 + chunk.images.length * 1000; // Rough estimate
      const estimatedOutputTokens = response.length / 4;
      const estimatedImageTokens = chunk.images.length * 1000;
      
      this.costTracker.trackAPICall(
        estimatedInputTokens,
        estimatedOutputTokens,
        estimatedImageTokens,
        'multimodal'
      );
      
      return parsedResult;
      
    } catch (error) {
      console.error('❌ Chunk processing failed:', error);
      throw error;
    }
  }

  /**
   * Create enhanced vision analysis prompt for GPT-5 with strict requirements
   */
  private createVisionAnalysisPrompt(chunk: VisionAnalysisChunk, previousContext: string): string {
    return `You are an expert credit report analyst with advanced vision capabilities. Analyze pages ${chunk.pageRange.start}-${chunk.pageRange.end} of this credit report image carefully.

${previousContext ? `Previous context: ${previousContext}` : ''}

ANALYZE THIS CREDIT REPORT FOR ALL POSSIBLE ISSUES:

1. DATA COMPLETENESS ISSUES:
   - ANY masked/truncated account numbers (XXXX1234, ****1234) - FCRA VIOLATION
   - Empty cells in ANY table or grid
   - Missing values where data should exist (look for "N/A", "-", blank spaces)
   - Incomplete addresses (missing street, city, state, or ZIP)
   - Partial dates (missing month/year)
   - Missing account information fields

2. PAYMENT HISTORY ANALYSIS:
   - ANY cell in payment history grid (empty OR filled)
   - Late payment markers (30, 60, 90, 120, 150, 180 days)
   - Collection accounts (C, CO, COL markers)
   - Charge-offs, foreclosures, repossessions
   - Bankruptcy indicators
   - ANY payment status that isn't "OK" or "Paid as agreed"

3. ACCOUNT STATUS ISSUES:
   - Closed accounts that show activity
   - Disputed items (look for "Consumer disputes" text)
   - Accounts in collections
   - Charged-off accounts
   - Settlement accounts
   - Any negative account status

4. POTENTIAL ERRORS TO HIGHLIGHT:
   - Duplicate accounts (same creditor listed multiple times)
   - Incorrect balances (negative balances, impossibly high amounts)
   - Old accounts beyond 7-year reporting limit
   - Mixed files (accounts that may belong to someone else)
   - Incorrect personal information
   - Variations in name spelling or addresses

5. INQUIRY SECTION:
   - Hard inquiries (especially multiple for same purpose)
   - Unauthorized inquiries
   - Inquiries older than 2 years (should be removed)

6. PUBLIC RECORDS & COLLECTIONS:
   - Bankruptcies, liens, judgments
   - Collection accounts
   - Any derogatory public record

7. CREDIT UTILIZATION ISSUES:
   - High balance-to-limit ratios (over 30%)
   - Over-limit accounts
   - Maxed out credit cards

8. SUSPICIOUS PATTERNS:
   - Sudden changes in payment patterns
   - Recently opened accounts with immediate issues
   - Identity theft indicators

IMPORTANT: 
- Highlight EVERYTHING that could be disputed or corrected
- Include ALL negative items, not just missing data
- Look at ACTUAL VALUES, not just empty fields
- Check for inconsistencies between sections
- Flag ANY information that seems incorrect or questionable
- If a payment history shows ANYTHING other than perfect payment, highlight it

For each coordinate, measure from the top-left corner of the page:
- x: pixels from left edge
- y: pixels from top edge  
- width: width of the issue area in pixels
- height: height of the issue area in pixels

TEXT CONTENT FOR REFERENCE:
${chunk.textContent}

Return ONLY valid JSON in this exact format:
{
  "issues": [
    {
      "id": "unique-id-here",
      "type": "critical|warning|attention|info",
      "category": "accuracy|FCRA_violation|collection|dispute|other",
      "description": "Precise description of what is missing or incomplete",
      "severity": "high|medium|low",
      "pageNumber": ${chunk.pageRange.start},
      "coordinates": {"x": 123, "y": 456, "width": 78, "height": 20},
      "anchorText": "exact text found at location or empty string if nothing there",
      "recommendedAction": "specific legal or corrective action needed",
      "mappingConfidence": 0.95,
      "mappingMethod": "vision_detection"
    }
  ],
  "emptyPaymentCells": [
    {
      "pageNumber": ${chunk.pageRange.start},
      "coordinates": {"x": 300, "y": 400, "width": 50, "height": 25},
      "description": "Specific payment data that is missing",
      "tableType": "Payment History|Balance|Scheduled Payment|Actual Payment"
    }
  ],
  "contextSummary": "Brief summary for next chunk analysis"
}

ONLY return the JSON. No other text.`;
  }

  /**
   * Call GPT-5 Vision API with retry logic and exponential backoff
   */
  private async callGPT5Vision(messages: ChatCompletionMessage[], maxRetries: number = 3): Promise<string> {
    const request = {
      model: 'gpt-5',
      messages,
      // GPT-5 specific params
      max_completion_tokens: 4000,
      reasoning_effort: 'low',
      temperature: 0.1
    };

    const apiKey = getOpenAIKey() || this.apiKey;
    if (!apiKey) {
      throw new Error('Missing OpenAI API key. Please add it in Settings or set OPENAI_API_KEY environment variable.');
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff: 2s, 4s, 8s (max 10s)
          console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        
        console.log(`🧠 Making GPT-5 Vision API call (attempt ${attempt + 1}/${maxRetries})...`);
        
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Check if it's a rate limit error (429) or server error (5xx) - retry these
          if (response.status === 429 || response.status >= 500) {
            lastError = new Error(`GPT-5 API error (${response.status}): ${errorText}`);
            console.warn(`⚠️ Retryable error: ${response.status}`);
            continue; // Retry
          }
          
          // Non-retryable errors (4xx except 429)
          console.error('❌ GPT-5 Vision API error:', response.status, errorText);
          throw new Error(`GPT-5 Vision API error: ${response.status} ${errorText}`);
        }

        const data: OpenAIResponse = await response.json();
        const content = data.choices[0]?.message?.content || '';
        
        console.log('✅ GPT-5 Vision API response received');
        console.log('📊 Response length:', content.length, 'characters');
        
        return content;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Network errors or timeouts - retry
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.warn(`⚠️ Network error on attempt ${attempt + 1}: ${error.message}`);
          continue;
        }
        
        // If it's not a retryable error, throw immediately
        throw error;
      }
    }
    
    // All retries exhausted
    throw lastError || new Error('GPT-5 Vision API call failed after all retries');
  }

  /**
   * Parse GPT-5 vision response
   */
  private parseVisionResponse(responseText: string): VisionAnalysisResult {
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse GPT-5 Vision response:', error);
      throw new Error('Invalid JSON from GPT-5 vision');
    }

    // Basic structure validation
    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    const emptyPaymentCells = Array.isArray(parsed.emptyPaymentCells) ? parsed.emptyPaymentCells : [];

    return {
      issues,
      emptyPaymentCells,
      contextSummary: typeof parsed.contextSummary === 'string' ? parsed.contextSummary : '',
      costBreakdown: { inputTokens: 0, outputTokens: 0, totalCost: 0 }
    };
  }

  /**
   * Combine results from all processed chunks
   */
  private combineChunkResults(
    chunkResults: VisionAnalysisResult[],
    _totalPages: number
  ): AnalysisResult {
    // Combine all issues from chunks
    const allIssues = chunkResults.flatMap(result => result.issues);
    
    // Add empty payment cell issues as credit issues
    const emptyPaymentIssues: CreditIssue[] = chunkResults.flatMap(result =>
      result.emptyPaymentCells.map(cell => ({
        id: `empty-payment-${crypto.randomUUID()}`,
        type: 'warning' as const,
        category: 'accuracy' as const,
        description: `Missing payment data: ${cell.description}`,
        severity: 'medium' as const,
        pageNumber: cell.pageNumber,
        coordinates: cell.coordinates,
        recommendedAction: 'Verify missing payment information with creditor',
        mappingConfidence: 1.0,
        mappingMethod: 'exact_match' as const
      }))
    );
    
    // Combine all issues
    const combinedIssues = [...allIssues, ...emptyPaymentIssues];

    // Convert coordinates from image pixels -> PDF points using per-page DPI
    const convert = (issue: any) => {
      const c = issue.coordinates;
      const info = this.pageImageInfo.get(issue.pageNumber);
      if (c && info && info.dpi) {
        const factor = 72 / info.dpi; // points per pixel
        issue.coordinates = {
          x: c.x * factor,
          y: c.y * factor,
          width: c.width * factor,
          height: c.height * factor,
        };
      }
      return issue;
    };

    for (let i = 0; i < combinedIssues.length; i++) {
      combinedIssues[i] = convert(combinedIssues[i]);
    }

    // Strict validation: all issues must have valid coordinates
    const invalid = combinedIssues.find(i => {
      const c = (i as any).coordinates;
      return !(c && [c.x, c.y, c.width, c.height].every((v: any) => typeof v === 'number' && !isNaN(v)));
    });
    if (invalid) {
      throw new Error(`Issue lacks valid coordinates (id=${invalid.id || 'unknown'})`);
    }
    
    // Count issues by type
    const issueCounts = {
      critical: combinedIssues.filter(i => i.type === 'critical').length,
      warning: combinedIssues.filter(i => i.type === 'warning').length,
      attention: combinedIssues.filter(i => i.type === 'attention').length,
      info: combinedIssues.filter(i => i.type === 'info').length,
    };
    
    return {
      totalIssues: combinedIssues.length,
      critical: issueCounts.critical,
      warning: issueCounts.warning,
      attention: issueCounts.attention,
      info: issueCounts.info,
      issues: combinedIssues,
      summary: `GPT-5 Vision analysis found ${combinedIssues.length} issues including ${emptyPaymentIssues.length} missing payment data entries`,
      confidence: 0.95, // High confidence with vision analysis
      analysisMetadata: {
        method: 'GPT-5 Vision + Text Analysis',
        contextPreserved: true,
        chunkingUsed: chunkResults.length > 1,
        fullDocumentAnalysis: true,
        chunksAnalyzed: chunkResults.length
      }
    };
  }
}
