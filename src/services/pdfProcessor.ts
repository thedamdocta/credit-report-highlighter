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

      // Extract text content
      const textContent = await page.getTextContent();
      const text = this.extractTextFromContent(textContent);

      return {
        pageNumber,
        text,
        width,
        height,
        rotation: 0, // Default rotation
      };
    } catch (error) {
      console.error(`Error processing page ${pageNumber}:`, error);
      return {
        pageNumber,
        text: '',
        width: 595, // Default A4 width
        height: 842, // Default A4 height
        rotation: 0,
      };
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
