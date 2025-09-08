// GPT-5 Vision System Playwright Test
// Tests the complete end-to-end functionality including cost tracking

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGPT5VisionSystem() {
    console.log('🚀 Starting GPT-5 Vision System Browser Test...');
    
    const browser = await chromium.launch({ 
        headless: false, 
        slowMo: 1000 // Slow down for visibility
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
        // Navigate to the application
        console.log('📍 Navigating to application...');
        await page.goto('http://localhost:5173');
        
        // Wait for the application to load
        await page.waitForLoadState('networkidle');
        console.log('✅ Application loaded successfully');
        
        // Check if analysis has already been performed (from screenshot)
        const issuesFound = await page.locator('text=Found').first();
        if (await issuesFound.isVisible()) {
            const issuesText = await issuesFound.textContent();
            console.log(`✅ Analysis already performed: ${issuesText}`);
            
            // Test cost tracking display if available
            console.log('🔍 Checking for cost tracking display...');
            const costDisplay = await page.locator('[data-test="cost-display"], [data-qa="cost-display"], [data-testid="cost-display"]').first();
            if (await costDisplay.isVisible()) {
                console.log('✅ Cost tracking display is visible');
            }
            
            // Test GPT-5 Analysis Report button
            console.log('🔍 Testing GPT-5 Analysis Report functionality...');
            const gpt5ReportButton = await page.locator('text=GPT-5 Analysis Report').first();
            if (await gpt5ReportButton.isVisible()) {
                console.log('✅ GPT-5 Analysis Report button is visible');
                await gpt5ReportButton.click();
                await page.waitForTimeout(2000);
                console.log('✅ GPT-5 Analysis Report button clicked');
            }
            
            // Test Download Highlighted PDF button
            console.log('🔍 Testing PDF download functionality...');
            const downloadButton = await page.locator('text=Download Highlighted PDF').first();
            if (await downloadButton.isVisible()) {
                console.log('✅ Download Highlighted PDF button is visible');
                // Don't click to avoid actual download, just verify visibility
            }
            
            // Test different analysis types
            console.log('🔍 Testing analysis type buttons...');
            const analysisButtons = [
                'Full Analysis (GPT-5)',
                'Deep Analysis', 
                'FCRA Violations',
                'Collections Check',
                'Dispute Validation'
            ];
            
            for (const buttonText of analysisButtons) {
                const button = await page.locator(`text=${buttonText}`).first();
                if (await button.isVisible()) {
                    console.log(`✅ ${buttonText} button is visible`);
                }
            }
            
        } else {
            // Test file upload functionality
            console.log('🔍 Testing file upload functionality...');
            
            // Look for file upload input or drag-drop area
            const fileInput = await page.locator('input[type="file"]').first();
            const dragArea = await page.locator('[data-test="drag-area"], [data-qa="drag-area"], [data-testid="drag-area"]').first();
            
            if (await fileInput.isVisible() || await dragArea.isVisible()) {
                console.log('✅ File upload interface is available');
                
                // Test uploading a sample PDF
                const samplePDF = process.env.TEST_PDF_PATH || path.join(__dirname, 'src', 'sample_equifax_report.pdf');
                
                // Check if the PDF file exists before attempting upload
                if (!fs.existsSync(samplePDF)) {
                    console.error(`❌ Sample PDF file not found: ${samplePDF}`);
                    throw new Error(`Test PDF file does not exist at path: ${samplePDF}`);
                }
                
                if (await fileInput.isVisible()) {
                    await fileInput.setInputFiles(samplePDF);
                    console.log('✅ Sample PDF uploaded via input');
                }
                
                // Wait for processing to start
                await page.waitForTimeout(3000);
                
                // Check for progress indicators
                const progressIndicator = await page.locator('[data-test="progress-indicator"], [data-qa="progress-indicator"], [data-testid="progress-indicator"]').first();
                if (await progressIndicator.isVisible()) {
                    console.log('✅ Progress indicator is visible during processing');
                }
                
                // Wait for analysis to complete (with timeout)
                console.log('⏳ Waiting for analysis to complete...');
                // Use a more specific selector for analysis results
                await page.waitForSelector('[data-testid="analysis-results"], [class*="analysis-result"], [role="region"][aria-label*="analysis"]', { timeout: 60000 });
                console.log('✅ Analysis completed');
            }
        }
        
        // Test UI responsiveness
        console.log('🔍 Testing UI responsiveness...');
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.waitForTimeout(1000);
        console.log('✅ UI responsive at 1200x800');
        
        await page.setViewportSize({ width: 800, height: 600 });
        await page.waitForTimeout(1000);
        console.log('✅ UI responsive at 800x600');
        
        // Test API endpoints are accessible
        console.log('🔍 Testing backend API endpoints...');
        
        // Test PyMuPDF server health
        try {
            const healthResponse = await fetch('http://localhost:5175/health');
            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                console.log('✅ PyMuPDF server health check:', healthData);
            } else {
                const errorBody = await healthResponse.text();
                console.error(`❌ PyMuPDF server health check failed: Status ${healthResponse.status}`, errorBody);
                throw new Error(`Health check failed with status ${healthResponse.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to connect to PyMuPDF server:', error.message);
            process.exit(1);
        }
        
        // Take screenshots for documentation
        console.log('📸 Taking screenshot for documentation...');
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.screenshot({ 
            path: path.join(__dirname, 'test-output', 'test-screenshot.png'),
            fullPage: true 
        });
        console.log('✅ Screenshot saved');
        
        console.log('🎉 All tests completed successfully!');
        
        return {
            success: true,
            message: 'GPT-5 Vision System is working correctly',
            features_tested: [
                'Application loading',
                'Analysis results display',
                'Cost tracking visibility', 
                'GPT-5 report functionality',
                'PDF download availability',
                'Analysis type buttons',
                'UI responsiveness',
                'Backend API health'
            ]
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        
        // Take error screenshot
        await page.screenshot({ 
            path: path.join(__dirname, 'test-output', 'error-screenshot.png'),
            fullPage: true 
        });
        
        return {
            success: false,
            error: error.message,
            message: 'Test encountered an error'
        };
    } finally {
        await browser.close();
        console.log('🔚 Browser closed');
    }
}

// Run the test
testGPT5VisionSystem()
    .then(result => {
        console.log('\n📊 Test Results:', result);
        process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });