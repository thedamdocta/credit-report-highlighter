// PDF.js Annotation Highlighting Service for PDF Annotation Integration
import type {
  HighlightService,
  HighlightStrategy,
  HighlightRegion,
  EnhancedIssue,
  HighlightingResult,
  HighlightConfig,
  CrossPageLink,
  PDFAnnotationData,
  PDFAnnotation
} from '../types/highlighting';
import type { TextToken } from '../types/creditReport';
import { CoordinateMapper } from './coordinateMapper';

// PDF.js imports
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, AnnotationEditorType } from 'pdfjs-dist';

export class PDFJSAnnotationHighlightService implements HighlightService {
  public strategy: HighlightStrategy = {
    name: 'PDF.js Annotations',
    description: 'Native PDF annotation highlighting using PDF.js annotation layer',
    capabilities: {
      canModifyPDF: true,
      canExport: true,
      supportsInteractivity: true,
      supportsCrossPageLinks: false, // PDF.js annotations don't support cross-page links directly
      requiresServer: false
    }
  };

  private coordinateMapper: CoordinateMapper;
  private config: HighlightConfig;
  private pdfDocument: PDFDocumentProxy | null = null;
  private annotationLayers: Map<number, any> = new Map();

  constructor(config?: Partial<HighlightConfig>) {
    this.coordinateMapper = new CoordinateMapper(config);
    this.config = {
      colors: {
        critical: '#ff4444',
        warning: '#ff9944',
        attention: '#ffdd44',
        info: '#44ddff'
      },
      opacity: {
        default: 0.3,
        hover: 0.5,
        selected: 0.7
      },
      styles: {
        borderRadius: 2,
        borderWidth: 1,
        shadowBlur: 2
      },
      crossPageIndicators: {
        enabled: false, // Not supported in PDF.js annotations
        lineColor: '#666666',
        lineWidth: 2,
        arrowSize: 8
      },
      ...config
    };
  }

  async highlightIssues(
    pdfFile: File,
    issues: EnhancedIssue[],
    config?: HighlightConfig
  ): Promise<HighlightingResult> {
    const startTime = Date.now();

    try {
      // Step 1: Load PDF document with PDF.js
      this.pdfDocument = await this.loadPDFDocument(pdfFile);

      // Step 2: Extract page tokens for coordinate mapping
      const pageTokens = await this.extractPageTokens(pdfFile);

      // Step 3: Map issues to highlight regions
      const allRegions: HighlightRegion[] = [];
      
      for (const issue of issues) {
        const regions = this.mapIssueToRegions(issue, pageTokens);
        allRegions.push(...regions);
      }

      // Step 4: Optimize regions
      const optimizedRegions = this.optimizeRegions(allRegions);

      // Step 5: Create cross-page links (limited support)
      const crossPageLinks = this.createCrossPageLinks(issues, optimizedRegions);

      // Step 6: Create PDF.js annotations
      const annotationData = await this.createPDFJSAnnotations(optimizedRegions, crossPageLinks);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        strategy: this.strategy.name,
        annotationData,
        metrics: {
          regionsCreated: optimizedRegions.length,
          crossPageLinks: crossPageLinks.length,
          processingTime
        }
      };

    } catch (error) {
      console.error('PDF.js Annotation Highlighting Error:', error);
      
      return {
        success: false,
        strategy: this.strategy.name,
        error: `PDF.js annotation highlighting failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  mapIssueToRegions(
    issue: EnhancedIssue,
    pageTokens: Map<number, TextToken[]>
  ): HighlightRegion[] {
    return this.coordinateMapper.mapIssueToRegions(issue, pageTokens);
  }

  createCrossPageLinks(
    issues: EnhancedIssue[],
    regions: HighlightRegion[]
  ): CrossPageLink[] {
    // PDF.js annotations have limited cross-page support
    // We can create references in annotation content but not visual links
    const crossPageLinks: CrossPageLink[] = [];

    issues.forEach(issue => {
      if (issue.crossPageLinks && issue.crossPageLinks.length > 0) {
        const sourceRegions = regions.filter(r => r.metadata?.issueId === issue.id);
        
        issue.crossPageLinks.forEach(relatedIssueId => {
          const relatedIssue = issues.find(i => i.id === relatedIssueId);
          if (relatedIssue) {
            const targetRegions = regions.filter(r => r.metadata?.issueId === relatedIssueId);
            
            sourceRegions.forEach(sourceRegion => {
              targetRegions.forEach(targetRegion => {
                if (sourceRegion.page !== targetRegion.page) {
                  crossPageLinks.push({
                    id: `pdfjs-link-${sourceRegion.id}-${targetRegion.id}`,
                    sourceRegion,
                    targetRegion,
                    relationship: `See related issue on page ${targetRegion.page}`,
                    linkType: 'general'
                  });
                }
              });
            });
          }
        });
      }
    });

    return crossPageLinks;
  }

  async exportHighlights(result: HighlightingResult): Promise<Blob> {
    if (!result.annotationData) {
      throw new Error('No annotation data available for export');
    }

    // Export as XFDF format for PDF annotations
    const xfdfContent = await this.createXFDFExport(result.annotationData);
    
    return new Blob([xfdfContent], {
      type: 'application/xml',
      // XFDF is XML-based format for PDF annotations
    });
  }

  async importHighlights(file: File): Promise<HighlightRegion[]> {
    const text = await file.text();
    
    // Parse XFDF or JSON format
    if (file.name.endsWith('.xfdf') || file.type.includes('xml')) {
      return this.parseXFDFAnnotations(text);
    } else {
      // Assume JSON format
      const importData = JSON.parse(text);
      return this.parseJSONAnnotations(importData);
    }
  }

  validateCoordinates(region: HighlightRegion): boolean {
    return this.coordinateMapper.validateCoordinates(region);
  }

  optimizeRegions(regions: HighlightRegion[]): HighlightRegion[] {
    return this.coordinateMapper.optimizeRegions(regions);
  }

  // PDF.js-specific methods

  private async loadPDFDocument(pdfFile: File): Promise<PDFDocumentProxy> {
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    return await pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    }).promise;
  }

  private async createPDFJSAnnotations(
    regions: HighlightRegion[],
    crossPageLinks: CrossPageLink[]
  ): Promise<PDFAnnotationData> {
    const annotations: PDFAnnotation[] = [];
    const layerData: any = {};

    // Group regions by page
    const pageRegions = new Map<number, HighlightRegion[]>();
    regions.forEach(region => {
      if (!pageRegions.has(region.page)) {
        pageRegions.set(region.page, []);
      }
      pageRegions.get(region.page)!.push(region);
    });

    // Create annotations for each page
    for (const [pageNumber, pageRegionList] of pageRegions) {
      const page = await this.pdfDocument!.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.0 });

      // Create annotation layer data
      layerData[`page-${pageNumber}`] = {
        viewport,
        annotations: []
      };

      // Create annotations for each region
      for (const region of pageRegionList) {
        const annotation = await this.createPDFAnnotation(region, page, crossPageLinks);
        annotations.push(annotation);
        layerData[`page-${pageNumber}`].annotations.push(annotation);
      }
    }

    return {
      annotations,
      layerData,
      exportFormat: 'xfdf'
    };
  }

  private async createPDFAnnotation(
    region: HighlightRegion,
    page: PDFPageProxy,
    crossPageLinks: CrossPageLink[]
  ): Promise<PDFAnnotation> {
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Convert coordinates to PDF coordinate system (bottom-left origin)
    const pdfRect = this.convertToPDFCoordinates(region.rect, viewport.height);

    // Find cross-page references for this region
    const relatedLinks = crossPageLinks.filter(
      link => link.sourceRegion.id === region.id || link.targetRegion.id === region.id
    );

    // Create annotation content with cross-page references
    let content = region.tooltip || 'Credit Report Issue';
    if (relatedLinks.length > 0) {
      content += '\n\nRelated Issues:';
      relatedLinks.forEach(link => {
        const targetPage = link.sourceRegion.id === region.id 
          ? link.targetRegion.page 
          : link.sourceRegion.page;
        content += `\n• ${link.relationship} (Page ${targetPage})`;
      });
    }

    const annotation: PDFAnnotation = {
      id: region.id,
      type: this.mapHighlightTypeToPDFAnnotationType(region.type),
      page: region.page - 1, // PDF.js uses 0-based indexing
      rect: [pdfRect.x, pdfRect.y, pdfRect.x + pdfRect.width, pdfRect.y + pdfRect.height],
      color: this.parseColorToRGB(region.color),
      contents: content,
      author: 'Credit Report Analyzer',
      creationDate: new Date(),
      modificationDate: new Date(),
      opacity: region.opacity
    };

    return annotation;
  }

  private convertToPDFCoordinates(
    rect: { x: number; y: number; width: number; height: number },
    pageHeight: number
  ): { x: number; y: number; width: number; height: number } {
    // PDF coordinate system has origin at bottom-left
    return {
      x: rect.x,
      y: pageHeight - rect.y - rect.height,
      width: rect.width,
      height: rect.height
    };
  }

  private mapHighlightTypeToPDFAnnotationType(type: string): PDFAnnotation['type'] {
    switch (type) {
      case 'highlight':
        return 'Highlight';
      case 'underline':
        return 'Underline';
      case 'strikeout':
        return 'StrikeOut';
      case 'squiggly':
        return 'Squiggly';
      default:
        return 'Highlight';
    }
  }

  private parseColorToRGB(color: string): number[] {
    // Convert hex color to RGB array (0-1 range for PDF)
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b];
    }
    
    // Default to yellow
    return [1, 1, 0];
  }

  private async createXFDFExport(annotationData: PDFAnnotationData): Promise<string> {
    // Create XFDF (XML Forms Data Format) for PDF annotations
    let xfdf = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xfdf += '<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">\n';
    xfdf += '<annots>\n';

    annotationData.annotations.forEach(annotation => {
      xfdf += this.createXFDFAnnotation(annotation);
    });

    xfdf += '</annots>\n';
    xfdf += '</xfdf>\n';

    return xfdf;
  }

  private createXFDFAnnotation(annotation: PDFAnnotation): string {
    const rect = annotation.rect.join(',');
    const color = annotation.color.map(c => Math.round(c * 255)).join(',');
    
    let xfdfAnnotation = `<${annotation.type.toLowerCase()} `;
    xfdfAnnotation += `page="${annotation.page}" `;
    xfdfAnnotation += `rect="${rect}" `;
    xfdfAnnotation += `color="#${this.rgbToHex(annotation.color)}" `;
    if (annotation.opacity) {
      xfdfAnnotation += `opacity="${annotation.opacity}" `;
    }
    xfdfAnnotation += `title="${annotation.author || ''}" `;
    xfdfAnnotation += `subject="${annotation.type}" `;
    xfdfAnnotation += `date="${annotation.creationDate?.toISOString() || ''}"`;
    xfdfAnnotation += '>\n';
    xfdfAnnotation += `<contents>${this.escapeXML(annotation.contents)}</contents>\n`;
    xfdfAnnotation += `</${annotation.type.toLowerCase()}>\n`;

    return xfdfAnnotation;
  }

  private rgbToHex(rgb: number[]): string {
    return rgb.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private async parseXFDFAnnotations(xfdfContent: string): Promise<HighlightRegion[]> {
    // Parse XFDF content to extract highlight regions
    // This is a simplified parser - production code would use a proper XML parser
    const regions: HighlightRegion[] = [];
    
    // Extract annotation elements using regex (simplified approach)
    const annotationMatches = xfdfContent.match(/<(highlight|underline|strikeout|squiggly)[^>]*>/gi);
    
    if (annotationMatches) {
      annotationMatches.forEach((match, index) => {
        const rectMatch = match.match(/rect="([^"]+)"/);
        const colorMatch = match.match(/color="([^"]+)"/);
        const pageMatch = match.match(/page="([^"]+)"/);
        
        if (rectMatch && pageMatch) {
          const rect = rectMatch[1].split(',').map(Number);
          const page = parseInt(pageMatch[1]) + 1; // Convert back to 1-based indexing
          
          regions.push({
            id: `imported-${index}`,
            page,
            rect: {
              x: rect[0],
              y: rect[1],
              width: rect[2] - rect[0],
              height: rect[3] - rect[1]
            },
            color: colorMatch ? colorMatch[1] : '#ffff00',
            opacity: 0.3,
            type: 'highlight'
          });
        }
      });
    }
    
    return regions;
  }

  private parseJSONAnnotations(importData: any): HighlightRegion[] {
    const regions: HighlightRegion[] = [];
    
    if (importData.annotations && Array.isArray(importData.annotations)) {
      importData.annotations.forEach((annotation: any) => {
        if (annotation.rect && annotation.page !== undefined) {
          regions.push({
            id: annotation.id || `imported-${Date.now()}`,
            page: annotation.page + 1, // Convert to 1-based indexing
            rect: annotation.rect,
            color: annotation.color || '#ffff00',
            opacity: annotation.opacity || 0.3,
            type: annotation.type || 'highlight',
            tooltip: annotation.contents
          });
        }
      });
    }
    
    return regions;
  }

  /**
   * Applies annotations to a PDF.js annotation layer
   */
  public async applyAnnotationsToLayer(
    pageNumber: number,
    annotationLayer: any,
    regions: HighlightRegion[]
  ): Promise<void> {
    const pageRegions = regions.filter(region => region.page === pageNumber);
    
    for (const region of pageRegions) {
      await this.addAnnotationToLayer(annotationLayer, region);
    }
  }

  private async addAnnotationToLayer(annotationLayer: any, region: HighlightRegion): Promise<void> {
    // This would integrate with PDF.js annotation layer APIs
    // Implementation depends on the specific PDF.js version and annotation layer structure
    
    const annotationElement = {
      annotationType: this.mapHighlightTypeToPDFAnnotationType(region.type),
      rect: [region.rect.x, region.rect.y, region.rect.x + region.rect.width, region.rect.y + region.rect.height],
      color: this.parseColorToRGB(region.color),
      contents: region.tooltip || '',
      opacity: region.opacity
    };

    // Add to annotation layer (pseudo-code - actual implementation depends on PDF.js API)
    annotationLayer.addAnnotation(annotationElement);
  }

  private async extractPageTokens(pdfFile: File): Promise<Map<number, TextToken[]>> {
    // Placeholder - would integrate with EnhancedPDFProcessor
    return new Map<number, TextToken[]>();
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    if (this.pdfDocument) {
      this.pdfDocument.destroy();
      this.pdfDocument = null;
    }
    this.annotationLayers.clear();
  }
}