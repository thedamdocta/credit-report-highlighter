// Enhanced Coordinate Mapping Service for PDF Highlighting
import type { 
  HighlightRegion, 
  EnhancedIssue, 
  CoordinateMapping, 
  TextSpan,
  HighlightConfig
} from '../types/highlighting';
import type { TextToken } from '../types/creditReport';

export class CoordinateMapper {
  private config: HighlightConfig;

  constructor(config?: Partial<HighlightConfig>) {
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

  /**
   * Maps an enhanced issue (from late chunking) to precise highlight regions
   */
  mapIssueToRegions(
    issue: EnhancedIssue,
    pageTokens: Map<number, TextToken[]>
  ): HighlightRegion[] {
    const regions: HighlightRegion[] = [];

    // Strategy 1: Use exact token positions if available
    if (issue.tokenPositions && issue.tokenPositions.length > 0) {
      const tokenRegions = this.createTokenBasedRegions(issue, issue.tokenPositions);
      regions.push(...tokenRegions);
    }
    // Strategy 2: Use anchor text matching
    else if (issue.anchorText && pageTokens.has(issue.pageNumber)) {
      const textRegions = this.createTextMatchingRegions(issue, pageTokens.get(issue.pageNumber)!);
      regions.push(...textRegions);
    }
    // No fallback regions allowed; if we cannot map precisely, return none

    return regions;
  }

  private createTokenBasedRegions(issue: EnhancedIssue, tokens: TextToken[]): HighlightRegion[] {
    const regions: HighlightRegion[] = [];
    
    // Group tokens by line to create efficient rectangular regions
    const lineGroups = this.groupTokensByLine(tokens);
    
    lineGroups.forEach((lineTokens, lineIndex) => {
      const boundingBox = this.calculateBoundingBox(lineTokens);
      
      regions.push({
        id: `${issue.id}-token-${lineIndex}`,
        page: issue.pageNumber,
        rect: boundingBox,
        color: this.config.colors[issue.type],
        opacity: this.config.opacity.default,
        type: 'highlight',
        tooltip: this.createTooltip(issue),
        metadata: {
          issueId: issue.id,
          severity: issue.type,
          category: issue.category,
          relatedIssues: issue.crossPageLinks
        }
      });
    });

    return regions;
  }

  private createTextMatchingRegions(issue: EnhancedIssue, pageTokens: TextToken[]): HighlightRegion[] {
    const regions: HighlightRegion[] = [];
    const anchorText = issue.anchorText?.trim().toLowerCase();
    
    if (!anchorText) return regions;

    // Find matching text sequences in the page tokens
    const matches = this.findTextMatches(anchorText, pageTokens);
    
    matches.forEach((match, matchIndex) => {
      const boundingBox = this.calculateBoundingBox(match.tokens);
      
      regions.push({
        id: `${issue.id}-text-${matchIndex}`,
        page: issue.pageNumber,
        rect: boundingBox,
        color: this.config.colors[issue.type],
        opacity: this.config.opacity.default,
        type: 'highlight',
        tooltip: this.createTooltip(issue),
        metadata: {
          issueId: issue.id,
          severity: issue.type,
          category: issue.category,
          relatedIssues: issue.crossPageLinks
        }
      });
    });

    return regions;
  }

  // Fallback region removed: application must never approximate coordinates

  private groupTokensByLine(tokens: TextToken[]): TextToken[][] {
    const lines: TextToken[][] = [];
    const lineThreshold = 5;
    
    const sortedTokens = [...tokens].sort((a, b) => a.y - b.y);
    
    sortedTokens.forEach(token => {
      let foundLine = false;
      
      for (const line of lines) {
        if (line.length > 0) {
          const avgY = line.reduce((sum, t) => sum + t.y, 0) / line.length;
          if (Math.abs(token.y - avgY) <= lineThreshold) {
            line.push(token);
            foundLine = true;
            break;
          }
        }
      }
      
      if (!foundLine) {
        lines.push([token]);
      }
    });
    
    return lines.map(line => line.sort((a, b) => a.x - b.x));
  }

  private calculateBoundingBox(tokens: TextToken[]): { x: number; y: number; width: number; height: number } {
    if (tokens.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const minX = Math.min(...tokens.map(t => t.x));
    const minY = Math.min(...tokens.map(t => t.y));
    const maxX = Math.max(...tokens.map(t => t.x + t.width));
    const maxY = Math.max(...tokens.map(t => t.y + t.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private findTextMatches(searchText: string, pageTokens: TextToken[]): { tokens: TextToken[]; confidence: number }[] {
    const matches: { tokens: TextToken[]; confidence: number }[] = [];
    const searchWords = searchText.split(/\s+/).filter(word => word.length > 2);
    
    if (searchWords.length === 0) return matches;

    for (let i = 0; i <= pageTokens.length - searchWords.length; i++) {
      const window = pageTokens.slice(i, i + searchWords.length * 3);
      const windowText = window.map(t => t.str).join(' ').toLowerCase();
      
      const similarity = this.calculateTextSimilarity(searchText, windowText.substring(0, searchText.length * 2));
      
      if (similarity > 0.7) {
        const matchingTokens = this.extractMatchingTokens(searchWords, window);
        
        if (matchingTokens.length > 0) {
          matches.push({
            tokens: matchingTokens,
            confidence: similarity
          });
        }
      }
    }

    return matches;
  }

  private extractMatchingTokens(searchWords: string[], windowTokens: TextToken[]): TextToken[] {
    const matchingTokens: TextToken[] = [];
    const usedIndices = new Set<number>();
    
    searchWords.forEach(searchWord => {
      let bestMatch = { index: -1, similarity: 0 };
      
      windowTokens.forEach((token, index) => {
        if (usedIndices.has(index)) return;
        
        const similarity = this.calculateTextSimilarity(searchWord, token.str.toLowerCase());
        if (similarity > bestMatch.similarity && similarity > 0.6) {
          bestMatch = { index, similarity };
        }
      });
      
      if (bestMatch.index >= 0) {
        matchingTokens.push(windowTokens[bestMatch.index]);
        usedIndices.add(bestMatch.index);
      }
    });

    return matchingTokens;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private createTooltip(issue: EnhancedIssue): string {
    let tooltip = `${issue.description}`;
    
    if (issue.severity) {
      tooltip += `\nSeverity: ${issue.severity}`;
    }
    
    if (issue.fcraSection) {
      tooltip += `\nFCRA Section: ${issue.fcraSection}`;
    }
    
    if (issue.recommendedAction) {
      tooltip += `\nAction: ${issue.recommendedAction}`;
    }
    
    return tooltip;
  }

  public optimizeRegions(regions: HighlightRegion[]): HighlightRegion[] {
    const optimized: HighlightRegion[] = [];
    const processed = new Set<string>();
    
    regions.forEach(region => {
      if (processed.has(region.id)) return;
      
      const candidates = regions.filter(other => 
        other.page === region.page &&
        other.metadata?.issueId === region.metadata?.issueId &&
        !processed.has(other.id) &&
        this.areRegionsAdjacent(region.rect, other.rect, 10)
      );
      
      if (candidates.length > 1) {
        const mergedRect = this.mergeBoundingBoxes(candidates.map(c => c.rect));
        
        optimized.push({
          ...region,
          id: `${region.metadata?.issueId}-merged-${optimized.length}`,
          rect: mergedRect
        });
        
        candidates.forEach(candidate => processed.add(candidate.id));
      } else {
        optimized.push(region);
        processed.add(region.id);
      }
    });
    
    return optimized;
  }

  private areRegionsAdjacent(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number },
    threshold: number
  ): boolean {
    const xOverlap = rect1.x < rect2.x + rect2.width + threshold && rect2.x < rect1.x + rect1.width + threshold;
    const yOverlap = rect1.y < rect2.y + rect2.height + threshold && rect2.y < rect1.y + rect1.height + threshold;
    
    return xOverlap && yOverlap;
  }

  private mergeBoundingBoxes(
    rects: { x: number; y: number; width: number; height: number }[]
  ): { x: number; y: number; width: number; height: number } {
    const minX = Math.min(...rects.map(r => r.x));
    const minY = Math.min(...rects.map(r => r.y));
    const maxX = Math.max(...rects.map(r => r.x + r.width));
    const maxY = Math.max(...rects.map(r => r.y + r.height));
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  public validateCoordinates(region: HighlightRegion): boolean {
    const { rect } = region;
    
    return (
      rect.x >= 0 &&
      rect.y >= 0 &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.x + rect.width <= 2000 &&
      rect.y + rect.height <= 3000
    );
  }
}
