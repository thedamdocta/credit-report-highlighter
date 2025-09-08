// Analysis Logger for GPT-5 Credit Report Analysis
// Creates detailed audit trail of what GPT-5 found wrong with the credit report

import type { AnalysisResult } from '../types/creditReport';

export interface AnalysisAuditLog {
  timestamp: string;
  fileName: string;
  analysisType: string;
  prompt: string;
  gptModel: string;
  tokensUsed: number;
  analysisResult: AnalysisResult;
  detailedFindings: {
    totalIssuesFound: number;
    issuesByType: Record<string, number>;
    issuesByCategory: Record<string, number>;
    issuesBySeverity: Record<string, number>;
    pagesAnalyzed: number[];
    confidenceScore: number;
    processingTime: number;
  };
  issueDetails: Array<{
    issueId: string;
    type: string;
    category: string;
    severity: string;
    page: number;
    description: string;
    exactTextFound: string;
    contextAround: string;
    whyFlagged: string;
    recommendedAction: string;
    coordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: number;
  }>;
  rawGptResponse?: string;
}

class AnalysisLogger {
  private logs: AnalysisAuditLog[] = [];

  logAnalysis(
    fileName: string,
    analysisType: string,
    prompt: string,
    analysisResult: AnalysisResult,
    processingTime: number,
    rawGptResponse?: string
  ): AnalysisAuditLog {
    const timestamp = new Date().toISOString();
    
    // Create detailed findings summary
    const detailedFindings = {
      totalIssuesFound: analysisResult.totalIssues,
      issuesByType: {
        critical: analysisResult.critical || 0,
        warning: analysisResult.warning || 0,
        attention: analysisResult.attention || 0,
        info: analysisResult.info || 0,
      },
      issuesByCategory: this.groupByCategory(analysisResult.issues || []),
      issuesBySeverity: this.groupBySeverity(analysisResult.issues || []),
      pagesAnalyzed: [...new Set((analysisResult.issues || []).map(issue => issue.pageNumber))].sort((a, b) => a - b),
      confidenceScore: analysisResult.confidence || 0,
      processingTime
    };

    // Create detailed issue breakdown
    const issueDetails = (analysisResult.issues || []).map(issue => ({
      issueId: issue.id,
      type: issue.type,
      category: issue.category || 'uncategorized',
      severity: issue.severity || 'medium',
      page: issue.pageNumber,
      description: issue.description,
      exactTextFound: issue.anchorText || '',
      contextAround: issue.searchPattern || issue.anchorText || '',
      whyFlagged: this.generateWhyFlagged(issue),
      recommendedAction: issue.recommendedAction || this.generateRecommendedAction(issue),
      coordinates: issue.coordinates || { x: 0, y: 0, width: 0, height: 0 },
      confidence: issue.confidence || 0.8
    }));

    const auditLog: AnalysisAuditLog = {
      timestamp,
      fileName,
      analysisType,
      prompt,
      gptModel: 'gpt-5',
      tokensUsed: 0, // Would need to be passed from the API call
      analysisResult,
      detailedFindings,
      issueDetails,
      rawGptResponse
    };

    this.logs.push(auditLog);
    
    // Save to console for debugging
    console.log('📊 GPT-5 Analysis Audit Log:', {
      file: fileName,
      timestamp,
      summary: `Found ${analysisResult.totalIssues} issues across ${detailedFindings.pagesAnalyzed.length} pages`,
      confidence: `${(analysisResult.confidence * 100).toFixed(1)}%`,
      breakdown: detailedFindings.issuesByType
    });

    // Save detailed findings for debugging
    this.saveAnalysisReport(auditLog);

    return auditLog;
  }

  private groupByCategory(issues: any[]): Record<string, number> {
    return issues.reduce((acc, issue) => {
      const category = issue.category || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  }

  private groupBySeverity(issues: any[]): Record<string, number> {
    return issues.reduce((acc, issue) => {
      const severity = issue.severity || 'medium';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});
  }

  private generateWhyFlagged(issue: any): string {
    const reasons = [];
    
    if (issue.type === 'critical') {
      reasons.push('Critical accuracy issue detected');
    }
    
    if (issue.anchorText && issue.anchorText.length < 20) {
      reasons.push('Text appears incomplete or missing');
    }
    
    if (issue.description.toLowerCase().includes('missing')) {
      reasons.push('Missing required information');
    }
    
    if (issue.description.toLowerCase().includes('inconsistent')) {
      reasons.push('Data inconsistency detected');
    }
    
    if (issue.description.toLowerCase().includes('account number')) {
      reasons.push('Account identification issue');
    }
    
    if (issue.description.toLowerCase().includes('payment history')) {
      reasons.push('Payment record anomaly');
    }

    return reasons.length > 0 ? reasons.join('; ') : 'Pattern matching analysis flagged this content';
  }

  private generateRecommendedAction(issue: any): string {
    if (issue.type === 'critical') {
      return 'Immediate review required - contact credit bureau for correction';
    }
    
    if (issue.description.toLowerCase().includes('missing account number')) {
      return 'Request complete account information from creditor';
    }
    
    if (issue.description.toLowerCase().includes('payment history')) {
      return 'Verify payment records with original creditor';
    }
    
    if (issue.description.toLowerCase().includes('balance')) {
      return 'Cross-reference balance with creditor statements';
    }

    return 'Review and verify accuracy with relevant party';
  }

  private saveAnalysisReport(auditLog: AnalysisAuditLog) {
    // Create a human-readable analysis report
    const report = this.generateHumanReadableReport(auditLog);
    
    // In a real app, you'd save this to a file or send to a logging service
    // For now, we'll just log it for debugging
    console.log('📋 Detailed Analysis Report:\n', report);
    
    // Also save as downloadable content
    this.createDownloadableReport(auditLog);
  }

  private generateHumanReadableReport(auditLog: AnalysisAuditLog): string {
    const { detailedFindings, issueDetails, timestamp, fileName } = auditLog;
    
    let report = `
=================================================
CREDIT REPORT ANALYSIS AUDIT REPORT
=================================================
File: ${fileName}
Analysis Date: ${new Date(timestamp).toLocaleString()}
GPT Model: ${auditLog.gptModel}
Analysis Type: ${auditLog.analysisType}
Processing Time: ${detailedFindings.processingTime}ms

=================================================
EXECUTIVE SUMMARY
=================================================
Total Issues Found: ${detailedFindings.totalIssuesFound}
Pages Analyzed: ${detailedFindings.pagesAnalyzed.join(', ')}
Overall Confidence: ${(detailedFindings.confidenceScore * 100).toFixed(1)}%

Issue Breakdown:
- Critical: ${detailedFindings.issuesByType.critical}
- Warning: ${detailedFindings.issuesByType.warning} 
- Attention: ${detailedFindings.issuesByType.attention}
- Info: ${detailedFindings.issuesByType.info}

=================================================
DETAILED FINDINGS
=================================================

`;

    issueDetails.forEach((issue, index) => {
      report += `
${index + 1}. ${issue.type.toUpperCase()} - Page ${issue.page}
   Category: ${issue.category}
   Severity: ${issue.severity}
   
   Issue: ${issue.description}
   
   Exact Text Found: "${issue.exactTextFound}"
   
   Why This Was Flagged: ${issue.whyFlagged}
   
   Recommended Action: ${issue.recommendedAction}
   
   Location: (${issue.coordinates.x}, ${issue.coordinates.y})
   Confidence: ${(issue.confidence * 100).toFixed(1)}%
   
   ---

`;
    });

    report += `
=================================================
TECHNICAL DETAILS
=================================================
Prompt Used: ${auditLog.prompt}

Raw GPT Response Available: ${auditLog.rawGptResponse ? 'Yes' : 'No'}

=================================================
END OF REPORT
=================================================
`;

    return report;
  }

  private createDownloadableReport(auditLog: AnalysisAuditLog) {
    const report = this.generateHumanReadableReport(auditLog);
    
    // Create a blob and data URL for download
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Store for potential download
    (window as any).__analysisReport = {
      blob,
      url,
      filename: `analysis-report-${auditLog.fileName.replace('.pdf', '')}-${new Date().toISOString().split('T')[0]}.txt`
    };
  }

  getLatestLog(): AnalysisAuditLog | null {
    return this.logs[this.logs.length - 1] || null;
  }

  getAllLogs(): AnalysisAuditLog[] {
    return [...this.logs];
  }

  exportLog(logId: string): string {
    const log = this.logs.find(l => l.timestamp === logId);
    return log ? JSON.stringify(log, null, 2) : '';
  }

  downloadLatestReport() {
    const reportData = (window as any).__analysisReport;
    if (reportData) {
      const link = document.createElement('a');
      link.href = reportData.url;
      link.download = reportData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

export const analysisLogger = new AnalysisLogger();