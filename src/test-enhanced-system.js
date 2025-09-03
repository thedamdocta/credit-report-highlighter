// Test Script for Enhanced Credit Report Analysis System
import { EnhancedAIAnalyzer } from './services/enhancedAiAnalyzer.js';
import { EnhancedPDFProcessor } from './services/enhancedPdfProcessor.js';

console.log('🚀 Starting Enhanced Credit Report System Test...');

// Test configuration
const testFiles = [
  'Brittney Bradwell Equifax.pdf',
  'Brittney Bradwell Experian.pdf', 
  'Brittney Bradwell _ TransUnion Credit Report.pdf'
];

class EnhancedSystemTester {
  constructor() {
    this.analyzer = new EnhancedAIAnalyzer({
      enableProgressiveResults: true,
      enableBackgroundProcessing: false, // Disable for testing
      fallbackToTraditional: true,
      maxConcurrentRequests: 1
    });
    
    this.processor = new EnhancedPDFProcessor((progress) => {
      console.log(`📊 Processing: ${progress.message} (${progress.progress.toFixed(1)}%)`);
    });
    
    this.testResults = [];
  }

  async runTests() {
    console.log('🧪 Testing Enhanced System with Credit Report Examples...');
    
    for (const filename of testFiles) {
      try {
        console.log(`\n📄 Testing ${filename}...`);
        await this.testCreditReport(filename);
      } catch (error) {
        console.error(`❌ Test failed for ${filename}:`, error.message);
        this.testResults.push({
          file: filename,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    this.printSummary();
  }

  async testCreditReport(filename) {
    const startTime = Date.now();
    
    try {
      // Step 1: Load the PDF file
      console.log(`   📥 Loading ${filename}...`);
      const file = await this.loadPDFFile(filename);
      
      if (!file) {
        throw new Error('Could not load PDF file');
      }
      
      console.log(`   ✅ Loaded: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

      // Step 2: Process with Enhanced PDF Processor
      console.log(`   🔍 Processing PDF structure...`);
      const { document, enhancedDocument } = await this.processor.processLargePDF(file);
      
      console.log(`   📊 Structure Analysis:`);
      console.log(`      - Pages: ${enhancedDocument.totalPages}`);
      console.log(`      - Document Type: ${enhancedDocument.structure.documentType}`);
      console.log(`      - Accounts: ${enhancedDocument.structure.accountSummaries.length}`);
      console.log(`      - Disputes: ${enhancedDocument.structure.disputeHistory.length}`);
      console.log(`      - Tables: ${enhancedDocument.pages.reduce((sum, p) => sum + p.tables.length, 0)}`);
      console.log(`      - Complex Pages: ${enhancedDocument.pages.filter(p => p.contentComplexity === 'very_complex').length}`);

      // Step 3: Test Enhanced Analysis
      console.log(`   🧠 Running Enhanced Analysis...`);
      const analysisResult = await this.analyzer.analyzeEnhancedCreditReport(
        file,
        'full', // Comprehensive analysis
        undefined, // No custom prompt
        (progress) => {
          if (progress.progress % 20 === 0 || progress.stage === 'complete') {
            console.log(`      ${progress.stage}: ${progress.message} (${progress.progress.toFixed(1)}%)`);
          }
        }
      );

      // Step 4: Validate Results
      console.log(`   ✅ Analysis Complete!`);
      console.log(`      - Total Issues: ${analysisResult.totalIssues}`);
      console.log(`      - Critical: ${analysisResult.critical}`);
      console.log(`      - Warnings: ${analysisResult.warning}`);
      console.log(`      - Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%`);
      console.log(`      - Processing Time: ${analysisResult.processingMetrics?.totalProcessingTime || 0}ms`);
      console.log(`      - Chunks Processed: ${analysisResult.processingMetrics?.chunksProcessed || 0}`);

      // Step 5: Test Issue Quality
      const issueQuality = this.assessIssueQuality(analysisResult.issues);
      console.log(`   🎯 Issue Quality Assessment:`);
      console.log(`      - Issues with Page Numbers: ${issueQuality.withPageNumbers}/${analysisResult.totalIssues}`);
      console.log(`      - Issues with Anchor Text: ${issueQuality.withAnchorText}/${analysisResult.totalIssues}`);
      console.log(`      - Issues with FCRA References: ${issueQuality.withFCRARefs}/${analysisResult.totalIssues}`);
      console.log(`      - Context-Enhanced Issues: ${issueQuality.withContextRelationships}/${analysisResult.totalIssues}`);

      const processingTime = Date.now() - startTime;
      
      this.testResults.push({
        file: filename,
        success: true,
        fileSize: file.size,
        pages: enhancedDocument.totalPages,
        documentType: enhancedDocument.structure.documentType,
        totalIssues: analysisResult.totalIssues,
        critical: analysisResult.critical,
        confidence: analysisResult.confidence,
        processingTimeMs: processingTime,
        chunksProcessed: analysisResult.processingMetrics?.chunksProcessed || 0,
        tablesAnalyzed: analysisResult.processingMetrics?.tablesAnalyzed || 0,
        issueQuality,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Enhanced analysis failed: ${error.message}`);
    }
  }

  async loadPDFFile(filename) {
    try {
      const response = await fetch(`/src/${filename}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      return new File([blob], filename, { type: 'application/pdf' });
    } catch (error) {
      console.warn(`Could not load ${filename}:`, error.message);
      return null;
    }
  }

  assessIssueQuality(issues) {
    if (!Array.isArray(issues)) return { withPageNumbers: 0, withAnchorText: 0, withFCRARefs: 0, withContextRelationships: 0 };
    
    return {
      withPageNumbers: issues.filter(i => i.pageNumber && i.pageNumber > 0).length,
      withAnchorText: issues.filter(i => i.anchorText && i.anchorText.length > 0).length,
      withFCRARefs: issues.filter(i => i.fcraSection && i.fcraSection.length > 0).length,
      withContextRelationships: issues.filter(i => i.contextRelationship || i.crossPageRelationship).length
    };
  }

  printSummary() {
    console.log('\n📋 TEST SUMMARY');
    console.log('================');
    
    const successful = this.testResults.filter(r => r.success);
    const failed = this.testResults.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successful.length}/${this.testResults.length}`);
    console.log(`❌ Failed: ${failed.length}/${this.testResults.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎯 SUCCESS DETAILS:');
      successful.forEach(result => {
        console.log(`\n   📄 ${result.file}:`);
        console.log(`      - File Size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`      - Pages: ${result.pages}`);
        console.log(`      - Document Type: ${result.documentType}`);
        console.log(`      - Issues Found: ${result.totalIssues} (${result.critical} critical)`);
        console.log(`      - Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`      - Processing Time: ${(result.processingTimeMs / 1000).toFixed(2)}s`);
        console.log(`      - Chunks Processed: ${result.chunksProcessed}`);
        console.log(`      - Tables Analyzed: ${result.tablesAnalyzed}`);
        console.log(`      - Quality Metrics:`);
        console.log(`        * Page References: ${result.issueQuality.withPageNumbers}/${result.totalIssues}`);
        console.log(`        * Anchor Text: ${result.issueQuality.withAnchorText}/${result.totalIssues}`);
        console.log(`        * FCRA References: ${result.issueQuality.withFCRARefs}/${result.totalIssues}`);
        console.log(`        * Context Enhanced: ${result.issueQuality.withContextRelationships}/${result.totalIssues}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ FAILURES:');
      failed.forEach(result => {
        console.log(`   ${result.file}: ${result.error}`);
      });
    }

    // Performance Analysis
    if (successful.length > 0) {
      const avgProcessingTime = successful.reduce((sum, r) => sum + r.processingTimeMs, 0) / successful.length;
      const avgIssuesFound = successful.reduce((sum, r) => sum + r.totalIssues, 0) / successful.length;
      const avgConfidence = successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length;
      
      console.log('\n📊 PERFORMANCE METRICS:');
      console.log(`   Average Processing Time: ${(avgProcessingTime / 1000).toFixed(2)}s`);
      console.log(`   Average Issues Found: ${avgIssuesFound.toFixed(1)}`);
      console.log(`   Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    }

    console.log('\n✨ Enhanced Credit Report System Test Complete!');
  }
}

// Run tests when DOM is ready
async function runEnhancedTests() {
  try {
    const tester = new EnhancedSystemTester();
    await tester.runTests();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Auto-run tests
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(runEnhancedTests, 2000);
  });
} else {
  setTimeout(runEnhancedTests, 2000);
}

console.log('📋 Enhanced system test script loaded and ready');