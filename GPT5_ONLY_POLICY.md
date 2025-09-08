# GPT-5 ONLY POLICY

## 🚨 CRITICAL REQUIREMENT 🚨

**This application MUST ONLY use GPT-5 models. NO GPT-4 models are allowed.**

## Approved Models Only

### ✅ ALLOWED MODELS:
- `gpt-5` - Main text analysis model (has built-in vision capabilities)
- `gpt-5-mini` - Lightweight tasks (if needed)
- `gpt-5-turbo` - Fast processing (if available)

### ❌ FORBIDDEN MODELS:
- `gpt-4` - NEVER USE
- `gpt-4o` - NEVER USE  
- `gpt-4-turbo` - NEVER USE
- `gpt-4-vision-preview` - NEVER USE
- Any model containing "gpt-4" - NEVER USE

## Implementation Guidelines

### For Developers:
1. **Always check model configuration** before making changes
2. **Use constants** from `src/config/models.ts` instead of hardcoding
3. **Run validation script** before deploying: `npm run validate-models`
4. **Review all API calls** to ensure GPT-5 usage

### For AI Assistants:
When modifying this codebase:
1. **NEVER suggest or use GPT-4 models**
2. **Always verify existing model configurations**
3. **Update model constants if new GPT-5 variants become available**
4. **Maintain consistency across all services**

## Validation Commands

```bash
# Check for any GPT-4 references
npm run check-gpt4

# Validate all model configurations
npm run validate-models

# Test with GPT-5 only
npm run test-gpt5-only
```

## Model Configuration Files

The following files contain model configurations:
- `src/config/models.ts` - Central model configuration
- `src/services/aiAnalyzer.ts`
- `src/services/gpt5VisionAnalyzer.ts`
- `src/services/hybridAnalyzer.ts`
- All chunking services

## Emergency Contact

If GPT-5 models are unavailable:
1. **DO NOT fallback to GPT-4**
2. **Display clear error message**
3. **Log the issue for investigation**
4. **Contact system administrator**

---

**Last Updated:** 2025-09-06  
**Policy Version:** 1.0  
**Enforcement:** MANDATORY