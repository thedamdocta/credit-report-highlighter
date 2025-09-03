// Enhanced PDF Processing Service for Large, Complex Credit Reports
import { pdfjs } from 'react-pdf';
import type { 
  EnhancedPDFPage, 
  DocumentStructure, 
  TableData, 
  ImageData, 
  SemanticRegion, 
  LayoutStructure,
  Section,
  AccountSection,
  DisputeSection,
  ProcessingProgress
} from '../types/enhancedCreditReport';
import type { PDFDocument } from '../types/creditReport';

export class EnhancedPDFProcessor {
  private progressCallback?: (progress: ProcessingProgress) => void;
  
  constructor(progressCallback?: (progress: ProcessingProgress) => void) {
    this.progressCallback = progressCallback;
  }

  async processLargePDF(file: File): Promise<{
    document: PDFDocument;
    enhancedDocument: {
      pages: EnhancedPDFPage[];
      structure: DocumentStructure;
      totalPages: number;
      metadata: any;
    };
  }> {
    const startTime = Date.now();
    
    this.updateProgress({
      stage: 'parsing',
      progress: 0,
      message: 'Loading PDF document...',
      timeElapsed: 0
    });

    try {
      // Step 1: Basic PDF loading
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
      
      const metadata = await this.extractMetadata(pdf);
      const totalPages = pdf.numPages;
      
      this.updateProgress({
        stage: 'parsing',
        progress: 20,
        message: `Loaded PDF with ${totalPages} pages`,
        timeElapsed: Date.now() - startTime
      });

      // Step 2: Enhanced page processing
      const enhancedPages: EnhancedPDFPage[] = [];
      const basicPages: any[] = [];
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        this.updateProgress({
          stage: 'parsing',
          progress: 20 + (pageNum / totalPages) * 60,
          currentPage: pageNum,
          message: `Processing page ${pageNum} of ${totalPages}...`,
          timeElapsed: Date.now() - startTime
        });
        
        const page = await pdf.getPage(pageNum);
        const basicPage = await this.processBasicPage(page, pageNum);
        const enhancedPage = await this.processEnhancedPage(page, pageNum);
        
        basicPages.push(basicPage);
        enhancedPages.push(enhancedPage);
      }

      this.updateProgress({
        stage: 'structure_detection',
        progress: 85,
        message: 'Analyzing document structure...',
        timeElapsed: Date.now() - startTime
      });

      // Step 3: Document structure analysis
      const documentStructure = await this.analyzeDocumentStructure(enhancedPages, metadata);

      this.updateProgress({
        stage: 'complete',
        progress: 100,
        message: 'PDF processing complete',
        timeElapsed: Date.now() - startTime
      });

      return {
        document: {
          pages: basicPages,
          totalPages,
          metadata
        },
        enhancedDocument: {
          pages: enhancedPages,
          structure: documentStructure,
          totalPages,
          metadata
        }
      };
      
    } catch (error) {
      console.error('Enhanced PDF Processing Error:', error);
      throw new Error(`Failed to process large PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async processBasicPage(page: any, pageNumber: number): Promise<any> {
    const viewport = page.getViewport({ scale: 1 });
    const { width, height } = viewport;

    const textContent = await page.getTextContent();
    const text = this.extractTextFromContent(textContent);
    const tokens = this.extractTokensFromContent(textContent, viewport);

    return {
      pageNumber,
      text,
      width,
      height,
      rotation: 0,
      tokens
    };
  }

  private async processEnhancedPage(page: any, pageNumber: number): Promise<EnhancedPDFPage> {
    const viewport = page.getViewport({ scale: 1 });
    const { width, height } = viewport;

    // Extract text content
    const textContent = await page.getTextContent();
    const text = this.extractTextFromContent(textContent);
    const tokens = this.extractTokensFromContent(textContent, viewport);

    // Detect tables
    const tables = await this.detectTables(textContent, pageNumber, viewport);
    
    // Detect images/graphics
    const images = await this.detectImages(page, pageNumber);
    
    // Analyze layout
    const layout = this.analyzeLayout(textContent, viewport, pageNumber);
    
    // Create semantic regions
    const semanticRegions = this.createSemanticRegions(textContent, layout, pageNumber);
    
    // Determine content complexity
    const contentComplexity = this.assessContentComplexity(tables, images, text);

    return {
      pageNumber,
      text,
      tables,
      images,
      layout,
      semanticRegions,
      width,
      height,
      rotation: 0,
      tokens,
      contentComplexity
    };
  }

  private detectTables(textContent: any, pageNumber: number, viewport: any): TableData[] {
    const tables: TableData[] = [];
    
    if (!textContent?.items) return tables;

    // Analyze text positioning to identify table-like structures
    const items = textContent.items;
    const rows = this.groupItemsIntoRows(items, viewport);
    
    // Look for regular column patterns
    const potentialTables = this.identifyTableStructures(rows);
    
    potentialTables.forEach((table, index) => {
      const tableType = this.classifyTable(table.content);
      
      tables.push({
        id: `table-${pageNumber}-${index}`,
        pageNumber,
        rows: table.rows,
        headers: table.headers,
        position: table.position,
        tableType
      });
    });

    return tables;
  }

  private groupItemsIntoRows(items: any[], viewport: any): any[] {
    const rows: any[] = [];
    const pageHeight = viewport.height;
    const tolerance = 5; // pixels
    
    // Group items by Y coordinate (row)
    const rowMap = new Map<number, any[]>();
    
    items.forEach(item => {
      const yPos = Math.round(pageHeight - item.transform[5]);
      const existingY = Array.from(rowMap.keys()).find(y => Math.abs(y - yPos) <= tolerance);
      
      if (existingY !== undefined) {
        rowMap.get(existingY)!.push(item);
      } else {
        rowMap.set(yPos, [item]);
      }
    });
    
    // Sort by Y position and convert to array
    return Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([y, items]) => ({
        y,
        items: items.sort((a, b) => a.transform[4] - b.transform[4]) // sort by X
      }));
  }

  private identifyTableStructures(rows: any[]): any[] {
    const tables: any[] = [];
    
    // Look for sequences of rows with similar column patterns
    let currentTable: any = null;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const columnCount = row.items.length;
      
      // Heuristic: rows with 3+ columns might be tables
      if (columnCount >= 3) {
        if (!currentTable) {
          currentTable = {
            startRow: i,
            rows: [],
            headers: [],
            position: { x: 0, y: 0, width: 0, height: 0 },
            content: []
          };
        }
        
        const rowText = row.items.map((item: any) => item.str).filter((s: string) => s.trim());
        currentTable.rows.push(rowText);
        currentTable.content.push(rowText.join(' '));
      } else if (currentTable && currentTable.rows.length >= 2) {
        // End current table
        currentTable.headers = currentTable.rows[0] || [];
        tables.push(currentTable);
        currentTable = null;
      }
    }
    
    // Add final table if exists
    if (currentTable && currentTable.rows.length >= 2) {
      currentTable.headers = currentTable.rows[0] || [];
      tables.push(currentTable);
    }
    
    return tables;
  }

  private classifyTable(content: string[]): TableData['tableType'] {
    const contentText = content.join(' ').toLowerCase();
    
    if (contentText.includes('payment') && contentText.includes('history')) {
      return 'payment_history';
    }
    if (contentText.includes('account') && (contentText.includes('balance') || contentText.includes('status'))) {
      return 'account_summary';
    }
    if (contentText.includes('inquiry') || contentText.includes('inquiries')) {
      return 'inquiry_list';
    }
    if (contentText.includes('dispute')) {
      return 'dispute_history';
    }
    
    return 'other';
  }

  private async detectImages(page: any, pageNumber: number): Promise<ImageData[]> {
    const images: ImageData[] = [];
    
    try {
      // Get page operations to find image references
      const ops = await page.getOperatorList();
      
      let imageIndex = 0;
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        
        // Look for image operations (simplified detection)
        if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
          images.push({
            id: `image-${pageNumber}-${imageIndex}`,
            pageNumber,
            type: 'other', // Will be classified later
            position: { x: 0, y: 0, width: 0, height: 0 }, // Simplified positioning
            analysisRequired: true
          });
          imageIndex++;
        }
      }
    } catch (error) {
      console.warn(`Could not detect images on page ${pageNumber}:`, error);
    }
    
    return images;
  }

  private analyzeLayout(textContent: any, viewport: any, pageNumber: number): LayoutStructure {
    const { width, height } = viewport;
    
    // Simplified layout analysis
    const hasHeader = this.detectHeader(textContent, height);
    const hasFooter = this.detectFooter(textContent, height);
    const columns = this.estimateColumnCount(textContent, width);
    
    return {
      pageNumber,
      columns,
      hasHeader,
      hasFooter,
      contentRegions: [],
      readingOrder: []
    };
  }

  private detectHeader(textContent: any, pageHeight: number): boolean {
    if (!textContent?.items) return false;
    
    // Check if there's text in the top 10% of the page
    const topThreshold = pageHeight * 0.9; // PDF coords are bottom-up
    return textContent.items.some((item: any) => item.transform[5] > topThreshold);
  }

  private detectFooter(textContent: any, pageHeight: number): boolean {
    if (!textContent?.items) return false;
    
    // Check if there's text in the bottom 10% of the page
    const bottomThreshold = pageHeight * 0.1;
    return textContent.items.some((item: any) => item.transform[5] < bottomThreshold);
  }

  private estimateColumnCount(textContent: any, pageWidth: number): number {
    if (!textContent?.items) return 1;
    
    // Simplified column detection based on X positions
    const xPositions = textContent.items
      .map((item: any) => item.transform[4])
      .filter((x: number) => x > 0);
    
    if (xPositions.length === 0) return 1;
    
    // Group similar X positions
    const uniqueX = [...new Set(xPositions.map((x: number) => Math.round(x / 50) * 50))];
    
    return Math.min(uniqueX.length, 3); // Cap at 3 columns for credit reports
  }

  private createSemanticRegions(textContent: any, layout: LayoutStructure, pageNumber: number): SemanticRegion[] {
    const regions: SemanticRegion[] = [];
    
    if (!textContent?.items) return regions;
    
    const text = this.extractTextFromContent(textContent).toLowerCase();
    
    // Detect different types of content regions
    const regionTypes = [
      { type: 'personal_info', keywords: ['name', 'address', 'ssn', 'social security'], importance: 'critical' },
      { type: 'account_section', keywords: ['account', 'balance', 'payment', 'creditor'], importance: 'high' },
      { type: 'dispute_section', keywords: ['dispute', 'investigation', 'verified'], importance: 'high' },
      { type: 'inquiry_section', keywords: ['inquiry', 'inquiries', 'requested by'], importance: 'medium' },
      { type: 'score_section', keywords: ['score', 'fico', 'rating'], importance: 'critical' }
    ] as const;
    
    regionTypes.forEach((regionType, index) => {
      const hasKeywords = regionType.keywords.some(keyword => text.includes(keyword));
      
      if (hasKeywords) {
        regions.push({
          id: `region-${pageNumber}-${index}`,
          type: regionType.type,
          pageNumber,
          content: text.substring(0, 500), // Simplified content extraction
          position: { x: 0, y: 0, width: 0, height: 0 },
          importance: regionType.importance
        });
      }
    });
    
    return regions;
  }

  private assessContentComplexity(tables: TableData[], images: ImageData[], text: string): EnhancedPDFPage['contentComplexity'] {
    let complexityScore = 0;
    
    // Add points for different complexity factors
    complexityScore += tables.length * 2;
    complexityScore += images.length * 1;
    complexityScore += Math.floor(text.length / 1000);
    
    if (complexityScore <= 2) return 'simple';
    if (complexityScore <= 5) return 'moderate';
    if (complexityScore <= 10) return 'complex';
    return 'very_complex';
  }

  private async analyzeDocumentStructure(pages: EnhancedPDFPage[], metadata: any): Promise<DocumentStructure> {
    // Detect document type based on content patterns
    const documentType = this.detectDocumentType(pages);
    
    // Extract sections
    const sections = this.extractSections(pages);
    
    // Extract account information
    const accountSummaries = this.extractAccountSummaries(pages);
    
    // Extract dispute history
    const disputeHistory = this.extractDisputeHistory(pages);
    
    // Extract payment history
    const paymentHistory = this.extractPaymentHistory(pages);
    
    // Extract inquiries
    const inquiries = this.extractInquiries(pages);
    
    // Extract personal info
    const personalInfo = this.extractPersonalInfo(pages);
    
    // Extract credit scores
    const creditScores = this.extractCreditScores(pages);

    return {
      documentType,
      totalPages: pages.length,
      sections,
      accountSummaries,
      disputeHistory,
      paymentHistory,
      inquiries,
      personalInfo,
      creditScores
    };
  }

  private detectDocumentType(pages: EnhancedPDFPage[]): DocumentStructure['documentType'] {
    const fullText = pages.map(p => p.text).join(' ').toLowerCase();
    
    if (fullText.includes('equifax')) return 'equifax';
    if (fullText.includes('experian')) return 'experian';
    if (fullText.includes('transunion') || fullText.includes('trans union')) return 'transunion';
    
    return 'unknown';
  }

  private extractSections(pages: EnhancedPDFPage[]): Section[] {
    const sections: Section[] = [];
    
    // This is a simplified implementation
    // In a real system, you'd use more sophisticated NLP techniques
    
    return sections;
  }

  private extractAccountSummaries(pages: EnhancedPDFPage[]): AccountSection[] {
    const accounts: AccountSection[] = [];
    
    // Simplified account extraction from tables
    pages.forEach(page => {
      page.tables.forEach(table => {
        if (table.tableType === 'account_summary') {
          table.rows.forEach((row, index) => {
            if (index === 0) return; // Skip header
            
            accounts.push({
              id: `account-${accounts.length}`,
              accountNumber: row[0] || 'Unknown',
              creditorName: row[1] || 'Unknown',
              accountType: row[2] || 'Unknown',
              status: row[3] || 'Unknown',
              pageNumbers: [page.pageNumber],
              issues: []
            });
          });
        }
      });
    });
    
    return accounts;
  }

  private extractDisputeHistory(pages: EnhancedPDFPage[]): DisputeSection[] {
    // Simplified implementation
    return [];
  }

  private extractPaymentHistory(pages: EnhancedPDFPage[]): any[] {
    // Simplified implementation
    return [];
  }

  private extractInquiries(pages: EnhancedPDFPage[]): any[] {
    // Simplified implementation
    return [];
  }

  private extractPersonalInfo(pages: EnhancedPDFPage[]): any {
    // Simplified implementation
    return {
      name: 'Unknown',
      addresses: [],
      pageNumbers: []
    };
  }

  private extractCreditScores(pages: EnhancedPDFPage[]): any[] {
    // Simplified implementation
    return [];
  }

  private extractTextFromContent(textContent: any): string {
    if (!textContent || !textContent.items) {
      return '';
    }

    return textContent.items
      .map((item: any) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTokensFromContent(textContent: any, viewport: any) {
    if (!textContent || !Array.isArray(textContent.items)) {
      return [];
    }

    const pageHeight = viewport?.height ?? 842;

    return textContent.items.map((item: any) => {
      const str: string = typeof item?.str === 'string' ? item.str : '';
      const tr: number[] = Array.isArray(item?.transform) ? item.transform : [1, 0, 0, 1, 0, 0];

      const x = typeof tr[4] === 'number' ? tr[4] : 0;
      const yBottom = typeof tr[5] === 'number' ? tr[5] : 0;

      const height = Math.abs(typeof tr[3] === 'number' ? tr[3] : (item?.height ?? 0)) || 12;
      const width = typeof item?.width === 'number'
        ? item.width
        : Math.max(1, str.length) * (height * 0.5);

      const top = pageHeight - yBottom - height;

      return {
        str,
        x,
        y: top,
        width,
        height,
      };
    });
  }

  private async extractMetadata(pdf: any): Promise<any> {
    try {
      const metadata = await pdf.getMetadata();
      const info = metadata.info || {};

      return {
        title: info.Title,
        author: info.Author,
        subject: info.Subject,
        creator: info.Creator,
        producer: info.Producer,
        creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
        modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
      };
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      return {};
    }
  }

  private updateProgress(progress: ProcessingProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}