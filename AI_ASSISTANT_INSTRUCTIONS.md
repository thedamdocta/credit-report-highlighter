# Instructions for AI Assistant

## 🚨 CRITICAL REQUIREMENTS FOR THIS PROJECT

When working on this Credit Report PDF Highlighter project, you MUST follow these strict requirements:

### 1. MODEL POLICY (MANDATORY)
- **NEVER suggest or implement deprecated models**
- **ONLY use the approved models listed in `src/config/models.ts`** — do not hardcode model IDs here
- **Do not assert model capabilities in this doc**; rely on the config and validation scripts
- **Validate model usage** and **run**: `npm run audit-models` after any change

### 2. HIGHLIGHT COLORS
- **ONLY use YELLOW highlights** for all error identification
- **NO other colors** are permitted for highlights
- RGB: `(1, 1, 0)` or Hex: `#FFFF00`

### 3. VALIDATION REQUIREMENTS
Before suggesting any changes:
1. **Check existing model configurations** in the codebase
2. **Ensure no deprecated model references** are introduced
3. **Verify yellow highlight configuration** is maintained
4. **Run validation commands** to confirm compliance

### 4. AVAILABLE VALIDATION COMMANDS
```bash
npm run check-models      # Detect unauthorized model references
npm run validate-models   # Check model configurations  
npm run audit-models      # Complete compliance audit
```

### 5. KEY FILES TO PROTECT
- `src/config/models.ts` - Central model configuration
- `src/services/visionAnalyzer.ts` - Vision analysis service
- `pymupdf_highlight_server.py` - Highlight color configuration
- All service files in `src/services/`

### 6. REFERENCE DOCUMENTS
- `MODEL_POLICY.md` - Detailed model policy documentation
- `.model-policy` - Policy reminder file
- `README.md` - Contains prominent model policy section

### 7. ENFORCEMENT
- **Policy violations are NOT ALLOWED**
- **Must validate before implementing changes**
- **System includes automated checks**
- **All changes must pass validation**

### 8. FOR FUTURE SESSIONS
When starting work on this project:
1. **Read this file first**
2. **Review the model policy**
3. **Check current model configurations**
4. **Run validation commands**
5. **Maintain compliance throughout**

---

**Remember: This application uses ONLY approved models with YELLOW highlights ONLY.**

**Policy Created:** 2025-09-06  
**Last Updated:** 2025-09-06  
**Compliance:** MANDATORY