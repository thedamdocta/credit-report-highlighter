// Canvas Overlay Highlighting Service for Client-Side PDF Highlighting
import type {
  HighlightService,
  HighlightStrategy,
  HighlightRegion,
  EnhancedIssue,
  HighlightingResult,
  HighlightConfig,
  CrossPageLink,
  CanvasHighlightData
} from '../types/highlighting';
import type { TextToken } from '../types/creditReport';
import { CoordinateMapper } from './coordinateMapper';

export class CanvasOverlayHighlightService implements HighlightService {
  public strategy: HighlightStrategy = {
    name: 'Canvas Overlay',
    description: 'Client-side highlighting using HTML5 Canvas overlays on react-pdf display',
    capabilities: {
      canModifyPDF: false,
      canExport: true,
      supportsInteractivity: true,
      supportsCrossPageLinks: true,
      requiresServer: false
    }
  };

  private coordinateMapper: CoordinateMapper;
  private config: HighlightConfig;
  private canvasElements: Map<number, HTMLCanvasElement> = new Map();
  private interactionHandlers: Map<string, (event: MouseEvent) => void> = new Map();

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

      // Step 2: Map issues to highlight regions
      const allRegions: HighlightRegion[] = [];
      
      for (const issue of issues) {
        const regions = this.mapIssueToRegions(issue, pageTokens);
        allRegions.push(...regions);
      }

      // Step 3: Optimize regions
      const optimizedRegions = this.optimizeRegions(allRegions);

      // Step 4: Create cross-page links
      const crossPageLinks = this.createCrossPageLinks(issues, optimizedRegions);

      // Step 5: Create canvas overlay data
      const canvasData = this.createCanvasOverlayData(optimizedRegions, crossPageLinks);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        strategy: this.strategy.name,
        overlayData: canvasData,
        metrics: {
          regionsCreated: optimizedRegions.length,
          crossPageLinks: crossPageLinks.length,
          processingTime
        }
      };

    } catch (error) {
      console.error('Canvas Overlay Highlighting Error:', error);
      
      return {
        success: false,
        strategy: this.strategy.name,
        error: `Canvas overlay highlighting failed: ${error instanceof Error ? error.message : String(error)}`
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
                    id: `canvas-link-${sourceRegion.id}-${targetRegion.id}`,
                    sourceRegion,
                    targetRegion,
                    relationship: `${sourceRegion.metadata?.category} relates to ${targetRegion.metadata?.category}`,
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
    if (!result.overlayData) {
      throw new Error('No overlay data available for export');
    }

    // Create a JSON export of highlight data
    const exportData = {
      strategy: result.strategy,
      regions: Array.from(result.overlayData.pageHighlights.entries()).map(([page, regions]) => ({
        page,
        regions
      })),
      crossPageLinks: result.metrics?.crossPageLinks || 0,
      timestamp: new Date().toISOString()
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
  }

  async importHighlights(file: File): Promise<HighlightRegion[]> {
    const text = await file.text();
    const importData = JSON.parse(text);
    
    const regions: HighlightRegion[] = [];
    
    if (importData.regions && Array.isArray(importData.regions)) {
      importData.regions.forEach((pageData: any) => {
        if (pageData.regions && Array.isArray(pageData.regions)) {
          regions.push(...pageData.regions);
        }
      });
    }
    
    return regions;
  }

  validateCoordinates(region: HighlightRegion): boolean {
    return this.coordinateMapper.validateCoordinates(region);
  }

  optimizeRegions(regions: HighlightRegion[]): HighlightRegion[] {
    return this.coordinateMapper.optimizeRegions(regions);
  }

  // Canvas-specific methods

  /**
   * Creates canvas overlay data for rendering highlights
   */
  private createCanvasOverlayData(
    regions: HighlightRegion[],
    crossPageLinks: CrossPageLink[]
  ): CanvasHighlightData {
    // Group regions by page
    const pageHighlights = new Map<number, HighlightRegion[]>();
    
    regions.forEach(region => {
      if (!pageHighlights.has(region.page)) {
        pageHighlights.set(region.page, []);
      }
      pageHighlights.get(region.page)!.push(region);
    });

    // Create canvas elements and interaction handlers
    const canvasElements: HTMLCanvasElement[] = [];
    const interactionHandlers = new Map<string, (event: MouseEvent) => void>();

    // Create interaction handlers for each region
    regions.forEach(region => {
      const handler = (event: MouseEvent) => {
        this.handleRegionClick(region, event);
      };
      interactionHandlers.set(region.id, handler);
    });

    return {
      pageHighlights,
      canvasElements,
      interactionHandlers
    };
  }

  /**
   * Creates and configures a canvas overlay for a specific page
   */
  public createCanvasOverlay(
    pageNumber: number,
    pageWidth: number,
    pageHeight: number,
    regions: HighlightRegion[]
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'auto';
    canvas.style.zIndex = '10';

    const ctx = canvas.getContext('2d')!;
    
    // Draw highlights
    regions.forEach(region => {
      this.drawHighlight(ctx, region);
    });

    // Add event listeners
    canvas.addEventListener('click', (event) => {
      this.handleCanvasClick(event, canvas, regions);
    });

    canvas.addEventListener('mousemove', (event) => {
      this.handleCanvasMouseMove(event, canvas, regions);
    });

    // Store canvas reference
    this.canvasElements.set(pageNumber, canvas);

    return canvas;
  }

  /**
   * Draws a highlight region on the canvas
   */
  private drawHighlight(ctx: CanvasRenderingContext2D, region: HighlightRegion): void {
    const { rect, color, opacity, type } = region;

    // Parse color
    const rgbColor = this.parseColor(color);
    
    // Set styling
    ctx.globalAlpha = opacity;
    ctx.fillStyle = `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})`;
    
    if (this.config.styles.shadowBlur > 0) {
      ctx.shadowBlur = this.config.styles.shadowBlur;
      ctx.shadowColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.5)`;
    }

    // Draw based on highlight type
    switch (type) {
      case 'highlight':
        this.drawHighlightRect(ctx, rect);
        break;
      case 'underline':
        this.drawUnderline(ctx, rect);
        break;
      case 'strikeout':
        this.drawStrikeout(ctx, rect);
        break;
      case 'squiggly':
        this.drawSquigglyUnderline(ctx, rect);
        break;
      default:
        this.drawHighlightRect(ctx, rect);
    }

    // Reset styling
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawHighlightRect(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; width: number; height: number }
  ): void {
    if (this.config.styles.borderRadius > 0) {
      this.drawRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, this.config.styles.borderRadius);
    } else {
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    // Draw border if configured
    if (this.config.styles.borderWidth > 0) {
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = this.config.styles.borderWidth;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
  }

  private drawUnderline(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; width: number; height: number }
  ): void {
    const lineY = rect.y + rect.height - 2;
    ctx.lineWidth = 2;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(rect.x, lineY);
    ctx.lineTo(rect.x + rect.width, lineY);
    ctx.stroke();
  }

  private drawStrikeout(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; width: number; height: number }
  ): void {
    const lineY = rect.y + rect.height / 2;
    ctx.lineWidth = 2;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(rect.x, lineY);
    ctx.lineTo(rect.x + rect.width, lineY);
    ctx.stroke();
  }

  private drawSquigglyUnderline(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; width: number; height: number }
  ): void {
    const lineY = rect.y + rect.height - 2;
    const amplitude = 2;
    const frequency = 0.1;
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(rect.x, lineY);

    for (let x = rect.x; x <= rect.x + rect.width; x += 2) {
      const y = lineY + Math.sin((x - rect.x) * frequency) * amplitude;
      ctx.lineTo(x, y);
    }
    
    ctx.stroke();
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Handles clicks on highlight regions
   */
  private handleCanvasClick(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
    regions: HighlightRegion[]
  ): void {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked region
    const clickedRegion = regions.find(region => 
      x >= region.rect.x && 
      x <= region.rect.x + region.rect.width &&
      y >= region.rect.y && 
      y <= region.rect.y + region.rect.height
    );

    if (clickedRegion) {
      this.handleRegionClick(clickedRegion, event);
    }
  }

  /**
   * Handles mouse movement over canvas for hover effects
   */
  private handleCanvasMouseMove(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
    regions: HighlightRegion[]
  ): void {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find hovered region
    const hoveredRegion = regions.find(region => 
      x >= region.rect.x && 
      x <= region.rect.x + region.rect.width &&
      y >= region.rect.y && 
      y <= region.rect.y + region.rect.height
    );

    if (hoveredRegion) {
      canvas.style.cursor = 'pointer';
      this.showTooltip(hoveredRegion, event.clientX, event.clientY);
    } else {
      canvas.style.cursor = 'default';
      this.hideTooltip();
    }
  }

  /**
   * Handles clicks on individual highlight regions
   */
  private handleRegionClick(region: HighlightRegion, event: MouseEvent): void {
    console.log('Clicked highlight region:', region);
    
    // Show detailed information
    this.showRegionDetails(region);
    
    // Emit custom event for external handling
    const customEvent = new CustomEvent('highlightRegionClick', {
      detail: { region, originalEvent: event }
    });
    document.dispatchEvent(customEvent);
  }

  /**
   * Shows a tooltip for a highlight region
   */
  private showTooltip(region: HighlightRegion, x: number, y: number): void {
    // Remove existing tooltip
    this.hideTooltip();

    const tooltip = document.createElement('div');
    tooltip.id = 'highlight-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 30}px`;
    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.maxWidth = '300px';
    tooltip.style.zIndex = '1000';
    tooltip.style.pointerEvents = 'none';
    tooltip.innerHTML = region.tooltip || 'No description available';

    document.body.appendChild(tooltip);
  }

  /**
   * Hides the current tooltip
   */
  private hideTooltip(): void {
    const existingTooltip = document.getElementById('highlight-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
  }

  /**
   * Shows detailed information about a highlight region
   */
  private showRegionDetails(region: HighlightRegion): void {
    // This would integrate with your UI to show detailed region information
    console.log('Region Details:', {
      id: region.id,
      type: region.type,
      page: region.page,
      severity: region.metadata?.severity,
      category: region.metadata?.category,
      tooltip: region.tooltip
    });
  }

  /**
   * Parses a color string to RGB values
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
    
    // Default to yellow
    return { r: 255, g: 255, b: 0 };
  }

  /**
   * Cleanup method to remove canvas elements and event listeners
   */
  public cleanup(): void {
    this.canvasElements.forEach(canvas => {
      canvas.remove();
    });
    this.canvasElements.clear();
    this.interactionHandlers.clear();
    this.hideTooltip();
  }

  /**
   * Updates highlight visibility
   */
  public updateHighlightVisibility(regionId: string, visible: boolean): void {
    // Find and update specific highlight visibility
    this.canvasElements.forEach(canvas => {
      // This would require redrawing the canvas with updated visibility
      // Implementation depends on how regions are tracked per canvas
    });
  }

  private async extractPageTokens(pdfFile: File): Promise<Map<number, TextToken[]>> {
    // Placeholder - would integrate with EnhancedPDFProcessor
    return new Map<number, TextToken[]>();
  }
}