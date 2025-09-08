// PyMuPDF Highlighting Service for Server-Side PDF Highlighting
import type {
  HighlightService,
  HighlightStrategy,
  HighlightRegion,
  EnhancedIssue,
  HighlightingResult,
  HighlightConfig,
  CrossPageLink
} from '../types/highlighting';
import type { TextToken } from '../types/creditReport';
import { CoordinateMapper } from './coordinateMapper';
import { API_CONFIG } from '../config/api';

export class PyMuPDFHighlightService implements HighlightService {
  public strategy: HighlightStrategy = {
    name: 'PyMuPDF Server-Side',
    description: 'Server-side PDF highlighting using PyMuPDF with full PDF modification capabilities',
    capabilities: {
      canModifyPDF: true,
      canExport: true,
      supportsInteractivity: false,
      supportsCrossPageLinks: true,
      requiresServer: true
    }
  };

  private coordinateMapper: CoordinateMapper;
  private config: HighlightConfig;

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
        enabled: true,
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
      // Step 1: Extract page tokens for coordinate mapping
      const pageTokens = await this.extractPageTokens(pdfFile);

      // Step 2: Build regions strictly from provided coordinates (no remapping)
      const allRegions: HighlightRegion[] = [];
      for (const issue of issues) {
        if (!issue.coordinates || ![issue.coordinates.x, issue.coordinates.y, issue.coordinates.width, issue.coordinates.height].every(v => typeof v === 'number' && !isNaN(v))) {
          throw new Error(`Issue ${issue.id} is missing valid coordinates`);
        }
        allRegions.push({
          id: `${issue.id}-direct`,
          page: issue.pageNumber,
          rect: {
            x: issue.coordinates.x,
            y: issue.coordinates.y,
            width: issue.coordinates.width,
            height: issue.coordinates.height,
          },
          color: this.config.colors[issue.type],
          opacity: this.config.opacity.default,
          type: 'highlight',
          tooltip: issue.description,
          metadata: { issueId: issue.id, severity: issue.type, category: issue.category }
        });
      }

      // Step 3: Optimize regions
      const optimizedRegions = this.optimizeRegions(allRegions);

      // Step 4: Create cross-page links
      const crossPageLinks = this.createCrossPageLinks(issues, optimizedRegions);

      // Step 5: Apply highlights using PyMuPDF
      const highlightedFile = await this.applyPyMuPDFHighlights(pdfFile, optimizedRegions, crossPageLinks);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        strategy: this.strategy.name,
        highlightedFile,
        metrics: {
          regionsCreated: optimizedRegions.length,
          crossPageLinks: crossPageLinks.length,
          processingTime,
          fileSize: highlightedFile.size
        }
      };

    } catch (error) {
      console.error('PyMuPDF Highlighting Error:', error);
      
      return {
        success: false,
        strategy: this.strategy.name,
        error: `PyMuPDF highlighting failed: ${error instanceof Error ? error.message : String(error)}`
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
    const crossPageLinks: CrossPageLink[] = [];

    // Find issues that have cross-page relationships
    issues.forEach(issue => {
      if (issue.crossPageLinks && issue.crossPageLinks.length > 0) {
        const sourceRegions = regions.filter(r => r.metadata?.issueId === issue.id);
        
        issue.crossPageLinks.forEach(relatedIssueId => {
          const relatedIssue = issues.find(i => i.id === relatedIssueId);
          if (relatedIssue) {
            const targetRegions = regions.filter(r => r.metadata?.issueId === relatedIssueId);
            
            // Create links between all combinations of source and target regions
            sourceRegions.forEach(sourceRegion => {
              targetRegions.forEach(targetRegion => {
                if (sourceRegion.page !== targetRegion.page) {
                  crossPageLinks.push({
                    id: `link-${sourceRegion.id}-${targetRegion.id}`,
                    sourceRegion,
                    targetRegion,
                    relationship: this.determineRelationshipType(issue, relatedIssue),
                    linkType: this.determineLinkType(issue, relatedIssue)
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
    if (!result.highlightedFile) {
      throw new Error('No highlighted file available for export');
    }

    return result.highlightedFile;
  }

  async importHighlights(file: File): Promise<HighlightRegion[]> {
    // This would parse existing highlights from a PDF file
    // Implementation would depend on PyMuPDF's annotation reading capabilities
    throw new Error('Import functionality not yet implemented');
  }

  validateCoordinates(region: HighlightRegion): boolean {
    return this.coordinateMapper.validateCoordinates(region);
  }

  optimizeRegions(regions: HighlightRegion[]): HighlightRegion[] {
    return this.coordinateMapper.optimizeRegions(regions);
  }

  private async extractPageTokens(pdfFile: File): Promise<Map<number, TextToken[]>> {
    // This would use the enhanced PDF processor to extract tokens
    // For now, return empty map - this would be integrated with EnhancedPDFProcessor
    const pageTokens = new Map<number, TextToken[]>();
    
    // TODO: Integrate with EnhancedPDFProcessor
    // const { enhancedDocument } = await enhancedPdfProcessor.processLargePDF(pdfFile);
    // enhancedDocument.pages.forEach(page => {
    //   if (page.tokens) {
    //     pageTokens.set(page.pageNumber, page.tokens);
    //   }
    // });

    return pageTokens;
  }

  private async applyPyMuPDFHighlights(
    pdfFile: File,
    regions: HighlightRegion[],
    crossPageLinks: CrossPageLink[]
  ): Promise<File> {
    // Convert File to ArrayBuffer for processing
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Prepare highlighting data for PyMuPDF
    const highlightData = this.preparePyMuPDFData(regions, crossPageLinks);

    // Strict mode: no client-side fallback; use server only and fail on error
    return await this.processWithServerSide(pdfFile, highlightData);
  }

  private preparePyMuPDFData(
    regions: HighlightRegion[], 
    crossPageLinks: CrossPageLink[]
  ): PyMuPDFHighlightData {
    const pageHighlights = new Map<number, PyMuPDFRegion[]>();

    // Group regions by page
    regions.forEach(region => {
      if (!pageHighlights.has(region.page)) {
        pageHighlights.set(region.page, []);
      }

      pageHighlights.get(region.page)!.push({
        rect: [region.rect.x, region.rect.y, region.rect.x + region.rect.width, region.rect.y + region.rect.height],
        color: this.hexToRgb(region.color),
        opacity: region.opacity,
        content: region.tooltip || '',
        annotationType: region.type === 'highlight' ? 0 : 1 // 0=Highlight, 1=Underline
      });
    });

    // Prepare cross-page annotations
    const crossPageAnnotations: PyMuPDFCrossPageAnnotation[] = crossPageLinks.map(link => ({
      sourceRect: [
        link.sourceRegion.rect.x,
        link.sourceRegion.rect.y,
        link.sourceRegion.rect.x + link.sourceRegion.rect.width,
        link.sourceRegion.rect.y + link.sourceRegion.rect.height
      ],
      targetRect: [
        link.targetRegion.rect.x,
        link.targetRegion.rect.y,
        link.targetRegion.rect.x + link.targetRegion.rect.width,
        link.targetRegion.rect.y + link.targetRegion.rect.height
      ],
      sourcePage: link.sourceRegion.page - 1, // PyMuPDF uses 0-based indexing
      targetPage: link.targetRegion.page - 1,
      linkType: link.linkType,
      relationship: link.relationship
    }));

    return {
      pageHighlights,
      crossPageAnnotations,
      config: {
        preserveOriginal: true,
        addBookmarks: true,
        addTooltips: true
      }
    };
  }

  private async processPDFWithPyMuPDF(
    arrayBuffer: ArrayBuffer,
    highlightData: PyMuPDFHighlightData
  ): Promise<ArrayBuffer> {
    // This would use PyMuPDF4LLM or similar library
    // For now, simulate the process
    
    try {
      // Attempt to use PyMuPDF4LLM API
      const formData = new FormData();
      formData.append('pdf', new Blob([arrayBuffer], { type: 'application/pdf' }));
      
      // Convert our highlighting data to the format expected by the Python server
      const allRegions: any[] = [];
      highlightData.pageHighlights.forEach((regions, pageNum) => {
        regions.forEach(region => {
          allRegions.push({
            id: `region-${pageNum}-${Math.random()}`,
            type: region.annotationType === 0 ? 'info' : 'warning',
            description: region.content || 'Issue detected',
            pageNumber: pageNum + 1, // Convert back to 1-based
            anchorText: region.content?.substring(0, 120) || '',
            coordinates: {
              x: region.rect[0],
              y: region.rect[1],
              width: region.rect[2] - region.rect[0],
              height: region.rect[3] - region.rect[1]
            }
          });
        });
      });
      
      formData.append('issues', JSON.stringify(allRegions));

      const response = await fetch(`${API_CONFIG.PYMUPDF_SERVER_URL}/highlight-pdf`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server highlighting failed: ${response.status}`);
      }

      return await response.arrayBuffer();

    } catch (error) {
      console.error('Server highlighting failed:', error);
      throw new Error(`Server highlighting failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  private async processWithServerSide(
    pdfFile: File,
    highlightData: PyMuPDFHighlightData
  ): Promise<File> {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    
    // Convert highlighting data to server format
    const allRegions: any[] = [];
    highlightData.pageHighlights.forEach((regions, pageNum) => {
      regions.forEach(region => {
        allRegions.push({
          id: `region-${pageNum}-${Math.random()}`,
          type: region.annotationType === 0 ? 'info' : 'warning',
          description: region.content || 'Issue detected',
          pageNumber: pageNum + 1, // Convert back to 1-based
          anchorText: region.content?.substring(0, 120) || '',
          coordinates: {
            x: region.rect[0],
            y: region.rect[1],
            width: region.rect[2] - region.rect[0],
            height: region.rect[3] - region.rect[1]
          }
        });
      });
    });
    
    formData.append('issues', JSON.stringify(allRegions));

    const response = await fetch(`${API_CONFIG.PYMUPDF_SERVER_URL}/highlight-pdf`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Server-side highlighting failed: ${response.status}`);
    }

    const highlightedBlob = await response.blob();
    return new File([highlightedBlob], `${pdfFile.name.replace('.pdf', '_highlighted.pdf')}`, {
      type: 'application/pdf'
    });
  }

  private determineRelationshipType(issue1: EnhancedIssue, issue2: EnhancedIssue): string {
    // Analyze the relationship between two issues
    if (issue1.category === 'dispute' && issue2.category === 'FCRA_violation') {
      return 'Dispute related to FCRA violation';
    }
    if (issue1.category === 'collection' && issue2.category === 'accuracy') {
      return 'Collection accuracy concern';
    }
    
    return `Related: ${issue1.category} and ${issue2.category}`;
  }

  private determineLinkType(issue1: EnhancedIssue, issue2: EnhancedIssue): CrossPageLink['linkType'] {
    if ((issue1.category === 'collection' || issue2.category === 'collection') ||
        (issue1.category === 'dispute' || issue2.category === 'dispute')) {
      return 'account_dispute';
    }
    
    if (issue1.description.toLowerCase().includes('payment') || 
        issue2.description.toLowerCase().includes('payment')) {
      return 'payment_history';
    }
    
    if (issue1.description.toLowerCase().includes('inquiry') || 
        issue2.description.toLowerCase().includes('inquiry')) {
      return 'inquiry_reference';
    }
    
    return 'general';
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [255, 255, 0]; // Default to yellow
  }
}

// Supporting interfaces for PyMuPDF integration
interface PyMuPDFHighlightData {
  pageHighlights: Map<number, PyMuPDFRegion[]>;
  crossPageAnnotations: PyMuPDFCrossPageAnnotation[];
  config: {
    preserveOriginal: boolean;
    addBookmarks: boolean;
    addTooltips: boolean;
  };
}

interface PyMuPDFRegion {
  rect: [number, number, number, number]; // [x1, y1, x2, y2]
  color: [number, number, number]; // RGB
  opacity: number;
  content: string;
  annotationType: number; // 0=Highlight, 1=Underline, 2=StrikeOut
}

interface PyMuPDFCrossPageAnnotation {
  sourceRect: [number, number, number, number];
  targetRect: [number, number, number, number];
  sourcePage: number;
  targetPage: number;
  linkType: CrossPageLink['linkType'];
  relationship: string;
}
