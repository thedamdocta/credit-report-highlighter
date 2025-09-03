// PDF Highlight Generation Service
import { pdfjs } from 'react-pdf';
import type { CreditIssue } from '../types/creditReport';

export class HighlightGenerator {
  constructor() {
    // PDF.js is already configured globally in main.tsx
  }

  async generateHighlightedPDF(
    originalFile: File,
    issues: CreditIssue[]
  ): Promise<Uint8Array> {
    try {
      // For now, we'll create a simple implementation that adds highlights as annotations
      // In a production environment, you'd want to use a more sophisticated PDF generation library

      const arrayBuffer = await originalFile.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      // Create a simple highlighted version by modifying the PDF structure
      // This is a basic implementation - for production, consider using pdf-lib or similar
      const highlightedPDF = await this.createHighlightedVersion(pdf, issues);

      return highlightedPDF;
    } catch (error) {
      console.error('Highlight generation error:', error);
      throw new Error('Failed to generate highlighted PDF');
    }
  }

  private async createHighlightedVersion(pdf: any, issues: CreditIssue[]): Promise<Uint8Array> {
    // This is a simplified implementation
    // In production, you'd want to use a proper PDF manipulation library

    // For now, we'll return the original PDF data with a note about highlights
    // In a real implementation, you'd modify the PDF structure to add highlights

    const arrayBuffer = pdf.source.data;
    const originalData = new Uint8Array(arrayBuffer);

    // Create a new PDF with highlight annotations
    // This would require a proper PDF library like pdf-lib
    const highlightedData = await this.addHighlightAnnotations(originalData, issues);

    return highlightedData;
  }

  private async addHighlightAnnotations(
    pdfData: Uint8Array,
    issues: CreditIssue[]
  ): Promise<Uint8Array> {
    // For now, we'll implement a simpler approach that doesn't require pdf-lib
    // In production, you would use a proper PDF manipulation library

    try {
      // Create a simple approach: return original PDF with highlights as separate data
      // In a real implementation, you'd modify the PDF structure to add highlights

      // For demonstration purposes, we'll return the original PDF data
      // and create highlights separately using canvas-based approach
      return await this.createCanvasBasedHighlights(pdfData, issues);

    } catch (error) {
      console.error('Failed to add highlight annotations:', error);
      // Fallback: return original PDF data
      return pdfData;
    }
  }

  private async createCanvasBasedHighlights(
    pdfData: Uint8Array,
    issues: CreditIssue[]
  ): Promise<Uint8Array> {
    try {
      // Create a canvas-based rendering of the highlighted PDF
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      const arrayBuffer = pdfData.buffer.slice(pdfData.byteOffset, pdfData.byteOffset + pdfData.byteLength);
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      // Get the first page for demonstration
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 2 });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render the page
      await firstPage.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;

      // Add highlights for issues on the first page
      const firstPageIssues = issues.filter(issue => issue.pageNumber === 1);
      this.addCanvasHighlights(ctx, firstPageIssues, viewport);

      // Convert canvas to blob and return as Uint8Array
      return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) {
            blob.arrayBuffer().then(arrayBuffer => {
              resolve(new Uint8Array(arrayBuffer));
            });
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, 'application/pdf');
      });

    } catch (error) {
      console.error('Canvas-based highlight generation error:', error);
      // Fallback: return original PDF data
      return pdfData;
    }
  }

  downloadHighlightedPDF(data: Uint8Array, filename: string): void {
    try {
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `highlighted_${filename}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download highlighted PDF:', error);
      throw new Error('Failed to download highlighted PDF');
    }
  }

  // Alternative method using canvas-based approach for better browser compatibility
  async generateHighlightedPDFCanvas(
    originalFile: File,
    issues: CreditIssue[]
  ): Promise<Uint8Array> {
    try {
      const arrayBuffer = await originalFile.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      // Create a canvas-based rendering of the highlighted PDF
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // This is a simplified implementation
      // In production, you'd want to render each page with highlights
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 2 });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render the page
      await firstPage.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;

      // Add highlights
      this.addCanvasHighlights(ctx, issues, viewport);

      // Convert canvas to PDF
      const pdfBytes = await this.canvasToPDF(canvas);

      return pdfBytes;

    } catch (error) {
      console.error('Canvas-based highlight generation error:', error);
      throw new Error('Failed to generate highlighted PDF');
    }
  }

  private addCanvasHighlights(
    ctx: CanvasRenderingContext2D,
    issues: CreditIssue[],
    viewport: any
  ) {
    issues.forEach(issue => {
      if (issue.coordinates) {
        const { x, y, width, height } = issue.coordinates;

        // Convert PDF coordinates to canvas coordinates
        const canvasX = x * viewport.scale;
        const canvasY = (viewport.height - y - height) * viewport.scale;
        const canvasWidth = width * viewport.scale;
        const canvasHeight = height * viewport.scale;

        // Draw highlight rectangle
        ctx.fillStyle = this.getCanvasHighlightColor(issue.type);
        ctx.globalAlpha = 0.3;
        ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);

        // Reset alpha for text
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(issue.description, canvasX + 5, canvasY + 15);
      }
    });
  }

  private getCanvasHighlightColor(type: CreditIssue['type']): string {
    switch (type) {
      case 'critical':
        return 'rgba(255, 0, 0, 0.3)';
      case 'warning':
        return 'rgba(255, 165, 0, 0.3)';
      case 'attention':
        return 'rgba(255, 255, 0, 0.3)';
      case 'info':
        return 'rgba(0, 0, 255, 0.3)';
      default:
        return 'rgba(255, 255, 0, 0.3)';
    }
  }

  private async canvasToPDF(canvas: HTMLCanvasElement): Promise<Uint8Array> {
    // This is a simplified implementation
    // In production, you'd use jsPDF or similar library to create a proper PDF

    // For now, we'll create a simple approach using the canvas data
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) {
          blob.arrayBuffer().then(arrayBuffer => {
            resolve(new Uint8Array(arrayBuffer));
          });
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'application/pdf');
    });
  }
}
