import { pdfjs } from 'react-pdf';

/**
 * Configure PDF.js settings for proper operation
 * Call this function before rendering any PDF components
 */
export default function setupPDFJS() {
  // Configure PDF.js worker to use local file
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  
  console.log('PDF.js setup completed with worker:', pdfjs.GlobalWorkerOptions.workerSrc);
}
