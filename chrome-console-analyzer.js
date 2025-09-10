// Chrome Console Log Analyzer
// Paste this entire script into Chrome DevTools Console while on localhost:5173

(function() {
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Create storage for captured logs
    window.__capturedLogs = [];
    window.__logStats = {
        total: 0,
        errors: 0,
        warnings: 0,
        gpt5Calls: 0,
        issuesFound: 0,
        pagesProcessed: new Set(),
        coordinates: [],
        highlights: 0,
        visionResponses: [],
        chunksSeen: new Set(),
        apiErrors: []
    };
    
    // Override console methods to capture logs
    console.log = function(...args) {
        const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        
        window.__capturedLogs.push({
            type: 'log',
            text: text,
            timestamp: Date.now()
        });
        
        // Analyze the log
        analyzeLog(text, 'log');
        
        // Call original method
        originalLog.apply(console, args);
    };
    
    console.error = function(...args) {
        const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        
        window.__capturedLogs.push({
            type: 'error',
            text: text,
            timestamp: Date.now()
        });
        
        window.__logStats.errors++;
        window.__logStats.apiErrors.push(text);
        
        originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
        const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        
        window.__capturedLogs.push({
            type: 'warn',
            text: text,
            timestamp: Date.now()
        });
        
        window.__logStats.warnings++;
        
        originalWarn.apply(console, args);
    };
    
    function analyzeLog(text, type) {
        window.__logStats.total++;
        
        // Check for GPT-5 API calls
        if (text.includes('Making GPT-5') || text.includes('GPT-5 Vision')) {
            window.__logStats.gpt5Calls++;
        }
        
        // Check for issues found
        if (text.includes('Found') && text.includes('issue')) {
            const match = text.match(/Found (\d+) issue/i);
            if (match) {
                window.__logStats.issuesFound += parseInt(match[1]);
            }
        }
        
        // Check for page processing
        const pageMatch = text.match(/[Pp]age\s+(\d+)/);
        if (pageMatch) {
            window.__logStats.pagesProcessed.add(pageMatch[1]);
        }
        
        // Check for chunks
        const chunkMatch = text.match(/chunk\s+(\d+)/i);
        if (chunkMatch) {
            window.__logStats.chunksSeen.add(chunkMatch[1]);
        }
        
        // Check for coordinates
        if (text.includes('coordinates') || text.includes('"x":') || text.includes('"y":')) {
            const coordMatch = text.match(/"x":\s*(\d+\.?\d*)[,\s]*"y":\s*(\d+\.?\d*)/);
            if (coordMatch) {
                window.__logStats.coordinates.push({
                    x: parseFloat(coordMatch[1]),
                    y: parseFloat(coordMatch[2])
                });
            }
        }
        
        // Check for highlights
        if (text.includes('highlight') || text.includes('Highlight')) {
            window.__logStats.highlights++;
        }
        
        // Capture GPT-5 responses
        if (text.includes('GPT-5 Vision API response received') || text.includes('Response length:')) {
            window.__logStats.visionResponses.push(text);
        }
    }
    
    // Function to show analysis
    window.showLogAnalysis = function() {
        console.clear();
        originalLog('%c📊 Console Log Analysis', 'font-size: 20px; color: #4CAF50; font-weight: bold');
        originalLog('=' .repeat(50));
        
        originalLog('%c📈 Statistics:', 'font-size: 16px; color: #2196F3');
        originalLog(`Total Logs: ${window.__logStats.total}`);
        originalLog(`Errors: ${window.__logStats.errors}`);
        originalLog(`Warnings: ${window.__logStats.warnings}`);
        originalLog(`GPT-5 API Calls: ${window.__logStats.gpt5Calls}`);
        originalLog(`Issues Found: ${window.__logStats.issuesFound}`);
        originalLog(`Pages Processed: ${window.__logStats.pagesProcessed.size}`);
        originalLog(`Chunks Processed: ${window.__logStats.chunksSeen.size}`);
        originalLog(`Coordinates Captured: ${window.__logStats.coordinates.length}`);
        originalLog(`Highlights Attempted: ${window.__logStats.highlights}`);
        
        originalLog('\n%c🔍 Problems Detected:', 'font-size: 16px; color: #FF5722');
        
        if (window.__logStats.issuesFound < 5) {
            originalLog('⚠️ Very few issues found - GPT-5 prompt may be too restrictive');
        }
        
        if (window.__logStats.coordinates.length === 0) {
            originalLog('❌ No coordinates captured - GPT-5 may not be returning proper coordinate format');
        }
        
        if (window.__logStats.errors > 0) {
            originalLog(`❌ ${window.__logStats.errors} errors detected`);
            originalLog('Last 3 errors:', window.__logStats.apiErrors.slice(-3));
        }
        
        if (window.__logStats.highlights === 0 && window.__logStats.issuesFound > 0) {
            originalLog('❌ Issues found but no highlights - coordinate conversion problem likely');
        }
        
        if (window.__logStats.gpt5Calls > window.__logStats.pagesProcessed.size * 2) {
            originalLog('⚠️ Too many API calls per page - may be retrying or looping');
        }
        
        originalLog('\n%c📍 Sample Coordinates:', 'font-size: 16px; color: #9C27B0');
        originalLog(window.__logStats.coordinates.slice(0, 5));
        
        originalLog('\n%c💡 Recommendations:', 'font-size: 16px; color: #00BCD4');
        
        if (window.__logStats.issuesFound < 5) {
            originalLog('1. Make GPT-5 prompt less restrictive');
            originalLog('2. Look for ANY issues, not just missing data');
            originalLog('3. Include negative items, late payments, collections');
        }
        
        if (window.__logStats.coordinates.length === 0) {
            originalLog('1. Check GPT-5 response format');
            originalLog('2. Ensure coordinates are being extracted properly');
            originalLog('3. Verify JSON parsing is working');
        }
        
        originalLog('\n%cTo export full logs:', 'color: #888');
        originalLog('Run: exportLogs()');
        originalLog('To clear and restart: resetLogCapture()');
        originalLog('To see this analysis again: showLogAnalysis()');
    };
    
    // Function to export logs
    window.exportLogs = function() {
        const data = {
            timestamp: new Date().toISOString(),
            stats: window.__logStats,
            logs: window.__capturedLogs,
            summary: {
                total: window.__logStats.total,
                errors: window.__logStats.errors,
                warnings: window.__logStats.warnings,
                issuesFound: window.__logStats.issuesFound,
                pagesProcessed: Array.from(window.__logStats.pagesProcessed),
                coordinates: window.__logStats.coordinates.length
            }
        };
        
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `console-analysis-${Date.now()}.json`;
        a.click();
        
        originalLog('✅ Logs exported to file');
    };
    
    // Function to reset
    window.resetLogCapture = function() {
        window.__capturedLogs = [];
        window.__logStats = {
            total: 0,
            errors: 0,
            warnings: 0,
            gpt5Calls: 0,
            issuesFound: 0,
            pagesProcessed: new Set(),
            coordinates: [],
            highlights: 0,
            visionResponses: [],
            chunksSeen: new Set(),
            apiErrors: []
        };
        originalLog('✅ Log capture reset');
    };
    
    // Initial message
    originalLog('%c✅ Console Log Analyzer Activated!', 'font-size: 18px; color: #4CAF50; font-weight: bold');
    originalLog('%cNow capturing all console output...', 'color: #888');
    originalLog('%cRun your credit report analysis, then type:', 'color: #2196F3');
    originalLog('%cshowLogAnalysis()', 'font-size: 14px; color: #FF5722; font-weight: bold');
    originalLog('to see the analysis');
    
})();