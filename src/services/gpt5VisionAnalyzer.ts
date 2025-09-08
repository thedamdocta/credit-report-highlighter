// GPT-5 Vision-Enhanced Credit Report Analyzer
// Combines text analysis with vision processing for complete issue detection

import { API_CONFIG } from '../config/api';
import { getOpenAIKey } from '../settings/openai';
import { globalCostTracker, CostTracker } from './costTracker';
import type {
  AnalysisResult,
  CreditIssue,
  PDFDocument,
  OpenAIResponse,
} from '../types/creditReport';

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
    imageTokens: number;
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
      
      progressCallback?.('Extracting images from PDF...');
      
      // Step 1: Convert PDF to images
      const images = await this.extractPDFImages(pdfFile!);
      
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
      throw new Error(`Failed to analyze credit report: ${error}`);
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
      const images = (data.images || []) as Array<{pageNumber:number; imageData:string; mimeType:string; width?:number; height?:number; dpi?:number}>;

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
      const hint = `PyMuPDF server unreachable or blocked by CORS at ${API_CONFIG.PYMUPDF_SERVER_URL}.` +
        ` Ensure it is running (python pymupdf_highlight_server.py) and accessible from http://localhost:5173.`;
      // Strict mode: do not proceed without images
      throw new Error(hint);
    }
  }

  /**
   * Create smart chunks based on account boundaries and context preservation
   */
  private createSmartChunks(
    pdfDocument: PDFDocument, 
    images: Array<{pageNumber: number; imageData: string; mimeType: string}>
  ): VisionAnalysisChunk[] {
    const chunks: VisionAnalysisChunk[] = [];
    const pagesPerChunk = 4; // Target 4 pages per chunk to manage token limits
    
    for (let i = 0; i < pdfDocument.pages.length; i += pagesPerChunk) {
      const startPage = i;
      const endPage = Math.min(i + pagesPerChunk - 1, pdfDocument.pages.length - 1);
      
      // Get text content for this chunk
      const chunkPages = pdfDocument.pages.slice(startPage, endPage + 1);
      const textContent = chunkPages
        .map(page => `Page ${page.pageNumber}:\n${page.text}`)
        .join('\n\n');
      
      // Get corresponding images
      const chunkImages = images.filter(img => 
        img.pageNumber >= startPage + 1 && img.pageNumber <= endPage + 1
      );
      
      chunks.push({
        chunkIndex: chunks.length,
        pageRange: { start: startPage + 1, end: endPage + 1 },
        textContent,
        images: chunkImages
      });
    }
    
    console.log(`📝 Created ${chunks.length} smart chunks for processing`);
    return chunks;
  }

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
    // Interleave page labels with images to help the model attribute coordinates to correct pages
    const labeledImageContents = chunk.images.flatMap(img => {
      const w = (img as any).width || 'unknown';
      const h = (img as any).height || 'unknown';
      const dpi = (img as any).dpi || 300;
      return ([
        { type: 'text', text: `The next image is page ${img.pageNumber}, ${w}x${h} pixels at ${dpi} DPI. Measure coordinates in PIXELS from the top-left corner.` },
        {
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType};base64,${img.imageData}`,
            detail: 'high'
          }
        }
      ]);
    });

    const messages = [
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
    ] as any[];

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
   * Create vision analysis prompt for GPT-5
   */
  private createVisionAnalysisPrompt(chunk: VisionAnalysisChunk, previousContext: string): string {
    return `You are an expert credit report analyst with advanced vision capabilities. Analyze pages ${chunk.pageRange.start}-${chunk.pageRange.end} of this credit report image carefully.

${previousContext ? `Previous context: ${previousContext}` : ''}

CRITICAL MISSION: Look for ACTUAL missing information in the credit report that would be legally significant:

1. MISSING OR TRUNCATED ACCOUNT NUMBERS:
   - Look for account numbers that show only xxxxxxxx1234 or similar patterns
   - Find completely missing account numbers where they should exist
   - Identify partial account numbers that are cut off or incomplete

2. EMPTY PAYMENT HISTORY CELLS:
   - Scan payment history tables for empty cells where payment data should exist
   - Look for missing payment amounts, dates, or statuses
   - Identify gaps in payment timelines

3. MISSING CREDITOR INFORMATION:
   - Find missing creditor names or company information
   - Look for blank fields where account names should appear
   - Identify incomplete contact information

4. INCOMPLETE BALANCE DATA:
   - Find missing balance amounts
   - Look for incomplete financial information
   - Identify missing limit or available credit data

5. MISSING DATES OR STATUS INFORMATION:
   - Find missing account opening dates
   - Look for missing payment due dates
   - Identify missing account status information

IMPORTANT: Only report issues you can actually SEE in the image. Provide precise pixel coordinates for each issue found.

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
   * Call GPT-5 Vision API
   */
  private async callGPT5Vision(messages: any[]): Promise<string> {
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

    console.log('🧠 Making GPT-5 Vision API call...');
    
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
      console.error('❌ GPT-5 Vision API error:', response.status, errorText);
      throw new Error(`GPT-5 Vision API error: ${response.status} ${errorText}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    console.log('✅ GPT-5 Vision API response received');
    console.log('📊 Response length:', content.length, 'characters');
    
    return content;
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
      costBreakdown: { inputTokens: 0, outputTokens: 0, imageTokens: 0, totalCost: 0 }
    };
  }

  /**
   * Combine results from all processed chunks
   */
  private combineChunkResults(
    chunkResults: VisionAnalysisResult[],
    totalPages: number
  ): AnalysisResult {
    // Combine all issues from chunks
    const allIssues = chunkResults.flatMap(result => result.issues);
    
    // Add empty payment cell issues as credit issues
    const emptyPaymentIssues: CreditIssue[] = chunkResults.flatMap(result =>
      result.emptyPaymentCells.map(cell => ({
        id: `empty-payment-${cell.pageNumber}-${Date.now()}-${Math.random()}`,
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
