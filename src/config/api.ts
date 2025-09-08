// API Configuration for Credit Report Analysis System
// Note: Set VITE_OPENAI_API_KEY in your .env file for production
export const API_CONFIG = {
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  // Local PyMuPDF highlighting server used for image conversion and PDF annotation
  PYMUPDF_SERVER_URL: import.meta.env.VITE_PYMUPDF_SERVER_URL || 'http://localhost:5175',
  TIMEOUT_MS: 30000,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_FILE_TYPES: ['application/pdf'],
} as const;

export const ANALYSIS_TYPES = {
  FULL: 'full',
  FCRA: 'fcra',
  COLLECTIONS: 'collections',
  DISPUTES: 'disputes',
  CUSTOM: 'custom',
} as const;

export type AnalysisType = typeof ANALYSIS_TYPES[keyof typeof ANALYSIS_TYPES];
