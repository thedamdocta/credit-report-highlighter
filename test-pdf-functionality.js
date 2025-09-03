// Test script for PDF upload functionality
console.log('🚀 Starting PDF functionality test...');

// Simulate PDF file upload test
async function testPDFUpload() {
  try {
    console.log('📄 Testing with Brittney Bradwell Equifax.pdf');
    
    // Fetch the actual PDF file
    const response = await fetch('/src/Brittney Bradwell Equifax.pdf');
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], 'Brittney Bradwell Equifax.pdf', { 
      type: 'application/pdf' 
    });
    
    console.log('✅ PDF file loaded successfully:');
    console.log(`   Name: ${file.name}`);
    console.log(`   Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Type: ${file.type}`);
    
    // Test file upload handler
    const fileInput = document.querySelector('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }
    
    console.log('🔄 Simulating file upload...');
    
    // Create file list and trigger upload
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    
    // Trigger change event
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);
    
    console.log('✅ File upload simulation complete');
    
    // Wait for React state updates
    setTimeout(() => {
      console.log('🔍 Checking PDF viewer state...');
      
      // Check if PDF viewer is rendered
      const pdfViewer = document.querySelector('[data-testid="pdf-viewer"], canvas, .react-pdf__Page');
      if (pdfViewer) {
        console.log('✅ PDF viewer found in DOM');
      } else {
        console.log('❌ PDF viewer not found in DOM');
      }
      
      // Check for any react-pdf related elements
      const reactPdfElements = document.querySelectorAll('[class*="react-pdf"]');
      console.log(`📊 Found ${reactPdfElements.length} react-pdf elements`);
      
      // Check if chat moved to bottom
      const bottomChat = document.querySelector('.absolute.bottom-0');
      if (bottomChat) {
        console.log('✅ Bottom chat overlay found');
      } else {
        console.log('❌ Bottom chat overlay not found');
      }
      
    }, 2000);
    
  } catch (error) {
    console.error('❌ PDF test failed:', error);
  }
}

// Test analysis functionality
function testAnalysisButtons() {
  console.log('🧪 Testing analysis buttons...');
  
  const buttons = document.querySelectorAll('button');
  const analysisButtons = Array.from(buttons).filter(btn => 
    btn.textContent?.includes('Analysis') || 
    btn.textContent?.includes('FCRA') ||
    btn.textContent?.includes('Collections') ||
    btn.textContent?.includes('Disputes')
  );
  
  console.log(`📊 Found ${analysisButtons.length} analysis buttons`);
  analysisButtons.forEach((btn, i) => {
    console.log(`   ${i + 1}: ${btn.textContent?.trim()}`);
  });
}

// Run tests when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testPDFUpload, 1000);
    setTimeout(testAnalysisButtons, 1500);
  });
} else {
  setTimeout(testPDFUpload, 1000);
  setTimeout(testAnalysisButtons, 1500);
}

console.log('📋 Test script loaded and ready');
