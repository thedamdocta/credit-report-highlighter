# Instructions for Claude AI Assistant

## 🚨 CRITICAL REQUIREMENTS FOR THIS PROJECT

When working on this Credit Report PDF Highlighter project, you MUST follow these strict requirements:

### 1. GPT-5 ONLY POLICY (MANDATORY)
- **NEVER suggest or implement GPT-4 models**
- **ONLY use GPT-5 models**: `gpt-5` (has built-in vision), `gpt-5-mini`, `gpt-5-turbo`
- **Always validate model usage** before making changes
- **Run validation scripts** after modifications: `npm run audit-gpt5`

### 2. HIGHLIGHT COLORS
- **ONLY use YELLOW highlights** for all error identification
- **NO other colors** are permitted for highlights
- RGB: `(1, 1, 0)` or Hex: `#FFFF00`

### 3. VALIDATION REQUIREMENTS
Before suggesting any changes:
1. **Check existing model configurations** in the codebase
2. **Ensure no GPT-4 references** are introduced
3. **Verify yellow highlight configuration** is maintained
4. **Run validation commands** to confirm compliance

### 4. AVAILABLE VALIDATION COMMANDS
```bash
npm run check-gpt4        # Detect GPT-4 references
npm run validate-models   # Check model configurations  
npm run audit-gpt5        # Complete compliance audit
```

### 5. KEY FILES TO PROTECT
- `src/config/models.ts` - Central model configuration
- `src/services/gpt5VisionAnalyzer.ts` - Vision analysis service
- `pymupdf_highlight_server.py` - Highlight color configuration
- All service files in `src/services/`

### 6. REFERENCE DOCUMENTS
- `GPT5_ONLY_POLICY.md` - Detailed policy documentation
- `.gpt5-only` - Policy reminder file
- `README.md` - Contains prominent GPT-5 policy section

### 7. ENFORCEMENT
- **Policy violations are NOT ALLOWED**
- **Must validate before implementing changes**
- **System includes automated checks**
- **All changes must pass validation**

### 8. FOR FUTURE CLAUDE SESSIONS
When you start working on this project:
1. **Read this file first**
2. **Review the GPT-5 policy**
3. **Check current model configurations**
4. **Run validation commands**
5. **Maintain compliance throughout**

---

**Remember: This is a GPT-5 ONLY application with YELLOW highlights ONLY.**

**Policy Created:** 2025-09-06  
**Last Updated:** 2025-09-06  
**Compliance:** MANDATORY