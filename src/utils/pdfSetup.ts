import { pdfjs } from 'react-pdf';

/**
 * Configure PDF.js settings for proper operation
 * Call this function before rendering any PDF components
 */
export default function setupPDFJS() {
  if (typeof window === 'undefined') return;
  
  // Use local worker file to avoid CORS and network issues
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  
  console.log('PDF.js setup completed with local worker file');
}
