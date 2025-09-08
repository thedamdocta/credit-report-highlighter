// PDF Processing Service
import { pdfjs } from 'react-pdf';
import type { PDFDocument, PDFPage } from '../types/creditReport';

export class PDFProcessor {
  constructor() {
    // PDF.js is already configured globally in main.tsx
  }

  async processPDF(file: File): Promise<PDFDocument> {
    try {
      // Convert File to ArrayBuffer (ensure it's not detached)
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Load PDF document using globally configured pdfjs
      const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;

      const pages: PDFPage[] = [];
      const metadata = await this.extractMetadata(pdf);

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const pageData = await this.processPage(page, pageNum);
        pages.push(pageData);
      }

      return {
        pages,
        totalPages: pdf.numPages,
        metadata,
      };
    } catch (error) {
      console.error('PDF Processing Error:', error);
      throw new Error('Failed to process PDF file');
    }
  }

  private async processPage(page: any, pageNumber: number): Promise<PDFPage> {
    try {
      // Get page dimensions
      const viewport = page.getViewport({ scale: 1 });
      const { width, height } = viewport;

      // Extract text content and tokens (with positions)
      const textContent = await page.getTextContent();
      const text = this.extractTextFromContent(textContent);
      const tokens = this.extractTokensFromContent(textContent, viewport);

      return {
        pageNumber,
        text,
        width,
        height,
        rotation: 0, // Default rotation
        tokens,
      };
    } catch (error) {
      console.error(`Error processing page ${pageNumber}:`, error);
      // Strict mode: fail fast, do not return placeholder pages
      throw new Error(`Failed to process page ${pageNumber}`);
    }
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

  // Extract positioned text tokens from PDF.js textContent.
  // Coordinates are returned in page units with origin at top-left to match overlay rendering.
  private extractTokensFromContent(textContent: any, viewport: any) {
    if (!textContent || !Array.isArray(textContent.items)) {
      return [];
    }

    const pageHeight = viewport?.height ?? 842;

    return textContent.items.map((item: any) => {
      const str: string = typeof item?.str === 'string' ? item.str : '';
      const tr: number[] = Array.isArray(item?.transform) ? item.transform : [1, 0, 0, 1, 0, 0];

      // PDF transform matrix: [a, b, c, d, e, f]
      const x = typeof tr[4] === 'number' ? tr[4] : 0; // left in PDF coordinate space (origin bottom-left)
      const yBottom = typeof tr[5] === 'number' ? tr[5] : 0; // baseline/bottom in PDF coordinate space

      // Approximate width/height
      const height = Math.abs(typeof tr[3] === 'number' ? tr[3] : (item?.height ?? 0)) || 12;
      const width =
        typeof item?.width === 'number'
          ? item.width
          : Math.max(1, str.length) * (height * 0.5); // rough fallback

      // Convert to top-left origin for overlay: top = pageHeight - bottom - height
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

  private async extractMetadata(pdf: any): Promise<PDFDocument['metadata']> {
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

  async validatePDF(file: File): Promise<boolean> {
    try {
      // Check file type
      if (file.type !== 'application/pdf') {
        return false;
      }

      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        return false;
      }

      // Try to load the PDF to verify it's valid
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;

      // Basic validation - check if it has pages
      if (pdf.numPages < 1) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('PDF validation error:', error);
      return false;
    }
  }

  // Alternative method using PyMuPDF4LLM API (for future backend integration)
  async processPDFWithPyMuPDF(file: File): Promise<PDFDocument> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.pymupdf4llm.com/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`PyMuPDF API error: ${response.status}`);
      }

      const result = await response.json();

      // Convert PyMuPDF4LLM response to our format
      return this.convertPyMuPDFResponse(result);
    } catch (error) {
      console.error('PyMuPDF processing error:', error);
      // Fallback to browser-based processing
      return this.processPDF(file);
    }
  }

  private convertPyMuPDFResponse(apiResponse: any): PDFDocument {
    // Convert PyMuPDF4LLM API response format to our internal format
    const pages: PDFPage[] = apiResponse.pages?.map((page: any, index: number) => ({
      pageNumber: index + 1,
      text: page.text || '',
      width: page.width || 595,
      height: page.height || 842,
      rotation: page.rotation || 0,
    })) || [];

    return {
      pages,
      totalPages: pages.length,
      metadata: {
        title: apiResponse.metadata?.title,
        author: apiResponse.metadata?.author,
        subject: apiResponse.metadata?.subject,
        creator: apiResponse.metadata?.creator,
        producer: apiResponse.metadata?.producer,
      },
    };
  }
}
