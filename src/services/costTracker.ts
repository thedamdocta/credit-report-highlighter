// GPT-5 API Cost Tracking System
// Real-time cost monitoring for credit report analysis

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  imageTokens: number;
  inputCost: number;
  outputCost: number;
  imageCost: number;
  totalCost: number;
  requestType: 'text' | 'vision' | 'multimodal';
}

export interface ProcessingCostSummary {
  totalCost: number;
  chunksProcessed: number;
  averageCostPerChunk: number;
  estimatedRemainingCost: number;
  costBreakdown: CostBreakdown[];
  processingStatus: 'estimating' | 'processing' | 'completed' | 'failed';
}

export class CostTracker {
  // GPT-5 pricing (per 1M tokens)
  private readonly GPT5_INPUT_COST = 1.25; // $1.25 per 1M input tokens
  private readonly GPT5_OUTPUT_COST = 10.0; // $10.00 per 1M output tokens
  private readonly GPT5_VISION_COST = 2.0; // Estimated vision processing cost

  private costs: CostBreakdown[] = [];
  private totalPagesEstimate: number = 0;
  private chunksEstimate: number = 0;

  /**
   * Initialize cost tracking for a new PDF analysis
   */
  initializeTracking(totalPages: number): ProcessingCostSummary {
    this.costs = [];
    this.totalPagesEstimate = totalPages;
    this.chunksEstimate = Math.ceil(totalPages / 4); // Estimate 4 pages per chunk

    const estimatedCost = this.estimateInitialCost(totalPages);
    
    console.log(`💰 Cost Tracker initialized - Estimated: $${estimatedCost.toFixed(3)} for ${totalPages} pages`);

    return {
      totalCost: 0,
      chunksProcessed: 0,
      averageCostPerChunk: 0,
      estimatedRemainingCost: estimatedCost,
      costBreakdown: [],
      processingStatus: 'estimating'
    };
  }

  /**
   * Estimate initial cost based on page count
   */
  private estimateInitialCost(totalPages: number): number {
    // Estimate tokens per page (based on typical credit reports)
    const avgTextTokensPerPage = 800; // Text content
    const avgImageTokensPerPage = 1000; // Vision processing
    
    const totalTextTokens = totalPages * avgTextTokensPerPage;
    const totalImageTokens = totalPages * avgImageTokensPerPage;
    
    // Estimate output tokens (analysis results)
    const estimatedOutputTokens = Math.min(totalPages * 200, 50000); // Cap at 50k
    
    const textCost = (totalTextTokens / 1000000) * this.GPT5_INPUT_COST;
    const imageCost = (totalImageTokens / 1000000) * this.GPT5_VISION_COST;
    const outputCost = (estimatedOutputTokens / 1000000) * this.GPT5_OUTPUT_COST;
    
    return textCost + imageCost + outputCost;
  }

  /**
   * Track cost for a single API call
   */
  trackAPICall(
    inputTokens: number, 
    outputTokens: number, 
    imageTokens: number = 0,
    requestType: 'text' | 'vision' | 'multimodal' = 'text'
  ): CostBreakdown {
    const inputCost = (inputTokens / 1000000) * this.GPT5_INPUT_COST;
    const outputCost = (outputTokens / 1000000) * this.GPT5_OUTPUT_COST;
    const imageCost = (imageTokens / 1000000) * this.GPT5_VISION_COST;
    
    const costBreakdown: CostBreakdown = {
      inputTokens,
      outputTokens,
      imageTokens,
      inputCost,
      outputCost,
      imageCost,
      totalCost: inputCost + outputCost + imageCost,
      requestType
    };
    
    this.costs.push(costBreakdown);
    
    console.log(`💳 API Call Cost: $${costBreakdown.totalCost.toFixed(4)} (Input: ${inputTokens}, Output: ${outputTokens}, Images: ${imageTokens})`);
    
    return costBreakdown;
  }

  /**
   * Get current processing summary
   */
  getCurrentSummary(): ProcessingCostSummary {
    const totalCost = this.costs.reduce((sum, cost) => sum + cost.totalCost, 0);
    const chunksProcessed = this.costs.length;
    const averageCostPerChunk = chunksProcessed > 0 ? totalCost / chunksProcessed : 0;
    
    // Calculate remaining cost estimate
    const remainingChunks = Math.max(0, this.chunksEstimate - chunksProcessed);
    const estimatedRemainingCost = remainingChunks * averageCostPerChunk;
    
    return {
      totalCost,
      chunksProcessed,
      averageCostPerChunk,
      estimatedRemainingCost,
      costBreakdown: [...this.costs],
      processingStatus: chunksProcessed === 0 ? 'estimating' : 
                       chunksProcessed < this.chunksEstimate ? 'processing' : 'completed'
    };
  }

  /**
   * Get formatted cost display string
   */
  getFormattedCostDisplay(): string {
    const summary = this.getCurrentSummary();
    const totalEstimated = summary.totalCost + summary.estimatedRemainingCost;
    
    return `Processing... Chunk ${summary.chunksProcessed}/${this.chunksEstimate} | Current: $${summary.totalCost.toFixed(3)} | Est. Total: $${totalEstimated.toFixed(3)}`;
  }

  /**
   * Check if cost exceeds threshold
   */
  checkCostThreshold(maxCost: number): { exceeded: boolean; currentCost: number; projectedCost: number } {
    const summary = this.getCurrentSummary();
    const projectedCost = summary.totalCost + summary.estimatedRemainingCost;
    
    return {
      exceeded: projectedCost > maxCost,
      currentCost: summary.totalCost,
      projectedCost
    };
  }

  /**
   * Get cost breakdown for reporting
   */
  getFinalReport(): {
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalImageTokens: number;
    averageCostPerChunk: number;
    processingEfficiency: number;
  } {
    const summary = this.getCurrentSummary();
    const totalInputTokens = this.costs.reduce((sum, cost) => sum + cost.inputTokens, 0);
    const totalOutputTokens = this.costs.reduce((sum, cost) => sum + cost.outputTokens, 0);
    const totalImageTokens = this.costs.reduce((sum, cost) => sum + cost.imageTokens, 0);
    
    // Calculate efficiency (actual vs estimated)
    const initialEstimate = this.estimateInitialCost(this.totalPagesEstimate);
    const processingEfficiency = initialEstimate > 0 ? (summary.totalCost / initialEstimate) : 1.0;
    
    return {
      totalCost: summary.totalCost,
      totalInputTokens,
      totalOutputTokens,
      totalImageTokens,
      averageCostPerChunk: summary.averageCostPerChunk,
      processingEfficiency
    };
  }

  /**
   * Reset tracker for new analysis
   */
  reset(): void {
    this.costs = [];
    this.totalPagesEstimate = 0;
    this.chunksEstimate = 0;
    console.log('🔄 Cost tracker reset');
  }
}

// Singleton instance for global cost tracking
export const globalCostTracker = new CostTracker();