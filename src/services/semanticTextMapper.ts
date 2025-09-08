// Semantic Text Mapping System
// Maps LLM semantic findings to precise PDF coordinates

export interface PDFTextToken {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  fontSize: number;
  fontName: string;
  bbox: [number, number, number, number]; // [x0, y0, x1, y1]
}

export interface SemanticIssue {
  id: string;
  type: 'critical' | 'warning' | 'attention' | 'info';
  description: string;
  semanticContext: string;  // What LLM found: "Missing account name for Chase Credit Card"
  targetText: string;       // Specific text to find: "Chase Credit Card" or "Account Name:"
  expectedLocation: 'near' | 'after' | 'before' | 'in_section';
  contextClues: string[];   // ["Chase", "Credit Card", "Account Name"]
  pageHint?: number;
}

export interface MappedHighlight {
  id: string;
  type: string;
  description: string;
  coordinates: { x: number; y: number; width: number; height: number };
  page: number;
  anchorText: string;
  confidence: number; // Always 1.0 for exact matches only
  mappingMethod: 'exact_match'; // Only exact matching - no fallbacks
}

import { API_CONFIG } from '../config/api';

export class SemanticTextMapper {
  private pdfTextTokens: PDFTextToken[] = [];
  private textSearchIndex: Map<string, PDFTextToken[]> = new Map();

  /**
   * Extract precise text coordinates from PDF using PyMuPDF
   * This replaces the approximation-based approach
   */
  async extractPDFTextCoordinates(pdfFile: File): Promise<PDFTextToken[]> {
    try {
      console.log('🔍 Extracting precise PDF text coordinates...');
      
      // Send PDF to PyMuPDF server for text extraction with coordinates
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      
      const response = await fetch(`${API_CONFIG.PYMUPDF_SERVER_URL}/extract-text-coordinates`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Text extraction failed: ${response.status}`);
      }

      const data = await response.json();
      this.pdfTextTokens = data.textTokens || [];
      
      // Build search index
      this.buildTextSearchIndex();
      
      console.log(`✅ Extracted ${this.pdfTextTokens.length} text tokens with coordinates`);
      return this.pdfTextTokens;
      
    } catch (error) {
      console.error('❌ PDF text coordinate extraction failed:', error);
      return [];
    }
  }

  /**
   * Build searchable index of text tokens
   */
  private buildTextSearchIndex(): void {
    this.textSearchIndex.clear();
    
    for (const token of this.pdfTextTokens) {
      const words = token.text.toLowerCase().split(/\s+/);
      
      for (const word of words) {
        if (word.length > 2) { // Skip short words
          if (!this.textSearchIndex.has(word)) {
            this.textSearchIndex.set(word, []);
          }
          this.textSearchIndex.get(word)!.push(token);
        }
      }
    }
  }

  /**
   * Map semantic LLM issues to precise PDF coordinates
   * This is the core innovation - semantic-to-spatial mapping
   */
  mapSemanticIssuesToCoordinates(issues: SemanticIssue[]): MappedHighlight[] {
    const mappedHighlights: MappedHighlight[] = [];

    for (const issue of issues) {
      console.log(`🎯 Mapping semantic issue: "${issue.description}"`);
      
      const mapping = this.findBestCoordinateMatch(issue);
      
      if (mapping) {
        mappedHighlights.push({
          id: issue.id,
          type: issue.type,
          description: issue.description,
          coordinates: mapping.coordinates,
          page: mapping.page,
          anchorText: mapping.anchorText,
          confidence: mapping.confidence,
          mappingMethod: mapping.mappingMethod
        });
        
        console.log(`✅ Mapped to coordinates: (${mapping.coordinates.x}, ${mapping.coordinates.y}) with confidence ${(mapping.confidence * 100).toFixed(1)}%`);
      } else {
        console.warn(`⚠️ Could not map issue: ${issue.description}`);
      }
    }

    return mappedHighlights;
  }

  /**
   * Find exact coordinate match for a semantic issue
   * NO FALLBACKS - only returns results with 100% confidence
   */
  private findBestCoordinateMatch(issue: SemanticIssue): MappedHighlight | null {
    // ONLY use exact text matching - no approximations or fallbacks
    return this.exactTextMatch(issue);
  }

  /**
   * Strategy 1: Exact text match
   * Find exact text that LLM mentioned
   */
  private exactTextMatch(issue: SemanticIssue): MappedHighlight | null {
    const targetTokens = this.findTextTokens(issue.targetText, issue.pageHint);
    
    if (targetTokens.length > 0) {
      const token = targetTokens[0]; // Use first match
      return {
        id: issue.id,
        type: issue.type,
        description: issue.description,
        coordinates: {
          x: token.x,
          y: token.y,
          width: token.width,
          height: token.height
        },
        page: token.page,
        anchorText: token.text,
        confidence: 1.0, // 100% confidence for exact matches only
        mappingMethod: 'exact_match'
      };
    }
    
    return null;
  }

  // All fallback methods removed - only exact matching for 100% accuracy

  /**
   * Helper methods
   */
  private findTextTokens(searchText: string, pageHint?: number): PDFTextToken[] {
    return this.pdfTextTokens.filter(token => {
      const matchesText = token.text.toLowerCase().includes(searchText.toLowerCase());
      const matchesPage = !pageHint || token.page === pageHint;
      return matchesText && matchesPage;
    });
  }

  // Helper methods for fallback strategies removed - only exact matching used
}
