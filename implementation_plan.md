# Implementation Plan

## [Overview]
Fix PDF rendering failures by eliminating multiple conflicting PDF.js worker configurations and establishing a single, consistent PDF.js setup without fallbacks.

The current codebase has critical issues where multiple services (react-pdf, highlightGenerator, pdfProcessor) are trying to configure PDF.js workers independently, using different versions and causing conflicts. The browser console shows "Failed to load resource" errors for worker files and "Setting up fake worker failed" messages, indicating the PDF.js worker system is not functioning properly. This implementation will consolidate all PDF.js usage into a single, coherent configuration that uses consistent versions and eliminates the root cause of worker loading failures.

## [Types]
No new type definitions required for this fix.

The existing interfaces in `src/types/creditReport.ts` are sufficient. The changes will focus on service implementations rather than type system modifications.

## [Files]
Modify existing files to consolidate PDF.js configuration and eliminate conflicts.

**Modified Files:**
- `src/main.tsx` - Update worker configuration to use local bundled worker
- `src/services/highlightGenerator.ts` - Remove dynamic PDF.js loading, use react-pdf instance
- `src/services/pdfProcessor.ts` - Ensure consistent react-pdf usage
- `vite.config.ts` - Update worker handling configuration

**No new files needed** - this is a consolidation effort to fix existing conflicts.

## [Functions]
Modify service functions to use consistent PDF.js configuration.

**Modified Functions:**
- `highlightGenerator.ts::loadPDFJS()` - Remove entirely, use react-pdf's pdfjs
- `highlightGenerator.ts::generateHighlightedPDF()` - Update to use react-pdf pdfjs instance
- `highlightGenerator.ts::createCanvasBasedHighlights()` - Update to use react-pdf pdfjs instance
- `pdfProcessor.ts::processPDF()` - Ensure uses react-pdf pdfjs (already correct)
- `pdfProcessor.ts::validatePDF()` - Ensure uses react-pdf pdfjs (already correct)

**No new functions needed** - existing functions will be updated to use consolidated PDF.js.

## [Classes]
Modify existing service classes to eliminate PDF.js conflicts.

**Modified Classes:**
- `HighlightGenerator` - Remove `pdfjsLib` property and `loadPDFJS()` method, use imported pdfjs from react-pdf
- `PDFProcessor` - Already uses react-pdf correctly, no changes needed

**No new classes required** - this is a refactoring to fix conflicts in existing classes.

## [Dependencies]
No new dependencies required, using existing react-pdf and pdfjs-dist packages.

Current dependencies are appropriate:
- `react-pdf@^9.2.1` 
- `pdfjs-dist@^4.10.38`

The issue is not missing dependencies but conflicting usage patterns within the codebase.

## [Testing]
Verify PDF rendering works without worker errors.

**Test Requirements:**
- Upload PDF file through the UI
- Verify PDF renders without console errors
- Test page navigation (next/previous page)
- Test zoom functionality
- Verify highlight overlay positioning
- Test PDF download with highlights

**Validation Strategy:**
- Monitor browser console for worker-related errors
- Test with the existing `Brittney Bradwell Equifax.pdf` file
- Verify no "Failed to load resource" or "Setting up fake worker" errors

## [Implementation Order]
Sequence changes to avoid breaking functionality during development.

1. **Update main.tsx worker configuration** - Switch to local bundled worker
2. **Update Vite configuration** - Ensure proper worker asset handling  
3. **Refactor highlightGenerator service** - Remove dynamic loading, use react-pdf
4. **Test PDF upload and rendering** - Verify basic functionality works
5. **Test highlight generation** - Ensure highlighting still functions
6. **Final validation** - Complete end-to-end testing

This order ensures that the core PDF.js configuration is fixed first, then services are updated to use the consolidated configuration, followed by comprehensive testing to ensure no regressions.
