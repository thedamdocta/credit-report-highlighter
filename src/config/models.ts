/**
 * GPT-5 ONLY MODEL CONFIGURATION
 * 
 * 🚨 CRITICAL: This application ONLY uses GPT-5 models
 * NO GPT-4 models are permitted under any circumstances
 */

// Approved GPT-5 models only
export const APPROVED_MODELS = {
  // Main text analysis
  TEXT_ANALYSIS: 'gpt-5',
  
  // Vision analysis for PDFs (GPT-5 has built-in vision)
  VISION_ANALYSIS: 'gpt-5',
  
  // Lightweight tasks
  LIGHTWEIGHT: 'gpt-5-mini',
  
  // Fast processing (if available)
  TURBO: 'gpt-5-turbo'
} as const;

// Model validation
export function validateModel(model: string): boolean {
  const approvedModels = Object.values(APPROVED_MODELS);
  return approvedModels.includes(model as any);
}

// Enforce GPT-5 only
export function enforceGPT5Only(model: string): string {
  if (model.includes('gpt-4')) {
    console.error('❌ CRITICAL ERROR: GPT-4 model detected and BLOCKED:', model);
    throw new Error(`GPT-4 models are FORBIDDEN. Attempted model: ${model}. Use GPT-5 only.`);
  }
  
  if (!model.includes('gpt-5')) {
    console.warn('⚠️ WARNING: Non-GPT-5 model detected:', model);
    throw new Error(`Only GPT-5 models are allowed. Attempted model: ${model}`);
  }
  
  return model;
}

// Default model configurations for different services
export const SERVICE_MODELS = {
  AI_ANALYZER: APPROVED_MODELS.TEXT_ANALYSIS,
  VISION_ANALYZER: APPROVED_MODELS.VISION_ANALYSIS,
  HYBRID_ANALYZER: APPROVED_MODELS.TEXT_ANALYSIS,
  CHUNKING_SERVICE: APPROVED_MODELS.TEXT_ANALYSIS,
  ENHANCED_ANALYZER: APPROVED_MODELS.TEXT_ANALYSIS
} as const;

// Runtime validation
export function getRuntimeSafeModel(requestedModel: string): string {
  try {
    return enforceGPT5Only(requestedModel);
  } catch (error) {
    console.error('Model validation failed:', error);
    console.log('🔄 Falling back to default GPT-5 model');
    return APPROVED_MODELS.TEXT_ANALYSIS;
  }
}

// Log model usage for auditing
export function logModelUsage(service: string, model: string): void {
  console.log(`✅ ${service} using approved model: ${model}`);
  
  if (!validateModel(model)) {
    console.error(`❌ AUDIT ALERT: Service ${service} attempted to use unauthorized model: ${model}`);
  }
}

// Development helper
export function getAllApprovedModels(): string[] {
  return Object.values(APPROVED_MODELS);
}

// Audit function
export function auditModelConfiguration(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check all service models are approved
  Object.entries(SERVICE_MODELS).forEach(([service, model]) => {
    if (!validateModel(model)) {
      issues.push(`Service ${service} configured with invalid model: ${model}`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues
  };
}