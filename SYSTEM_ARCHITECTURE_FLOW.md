# Credit Report Highlighter - Complete System Architecture & Flow

## 🏗️ System Components

### 1. **Frontend (React/Vite)**
- **Port**: 5173
- **Main File**: `src/components/generated/CreditReportAnalyzerApp.tsx`
- **Purpose**: User interface for uploading PDFs and displaying results

### 2. **PyMuPDF Server (Python/Flask)**
- **Port**: 5175
- **Main File**: `pymupdf_highlight_server.py`
- **Purpose**: PDF manipulation - highlighting, text extraction, image conversion

### 3. **GPT-5 Vision Service (TypeScript)**
- **Main File**: `src/services/gpt5VisionAnalyzer.ts`
- **Purpose**: Coordinates AI analysis and manages the flow

---

## 📊 Complete Process Flow (Step by Step)

### **Phase 1: User Upload & Initial Setup**

```
User clicks "Upload PDF" → Browser
                ↓
File stored in React state (CreditReportAnalyzerApp.tsx)
                ↓
PDF displayed using PDF.js library (left panel)
```

### **Phase 2: User Clicks Analysis Button**

When user clicks "Full Analysis (GPT-5)" or any quick action button:

```
1. CreditReportAnalyzerApp.tsx → handleAnalyze()
                ↓
2. Calls gpt5VisionAnalyzer.analyzeWithVision()
```

### **Phase 3: Multi-Pass Analysis Process**

#### **Step 3.1: Text Extraction (Optional)**
```
gpt5VisionAnalyzer.ts → extractTextWithCoordinates()
                ↓
HTTP POST → localhost:5175/extract-text-coordinates
                ↓
pymupdf_highlight_server.py processes PDF
                ↓
Returns: Text tokens with exact coordinates
```

#### **Step 3.2: Image Extraction**
```
gpt5VisionAnalyzer.ts → extractPDFImages()
                ↓
HTTP POST → localhost:5175/convert-to-images
                ↓
pymupdf_highlight_server.py converts PDF pages to PNG
                ↓
Returns: Base64 encoded images (300 DPI)
```

#### **Step 3.3: Create Chunks**
```
gpt5VisionAnalyzer.ts → createDynamicChunks()
                ↓
Groups pages based on token budget (8000 tokens)
                ↓
Creates chunks with images + text
```

#### **Step 3.4: Vision Analysis (THE CRITICAL PART)**
```
For each chunk:
    gpt5VisionAnalyzer.ts → processChunkWithVision()
                    ↓
    Creates prompt with:
    - Text content
    - Base64 images
    - Instructions to find issues
                    ↓
    HTTP POST → api.openai.com/v1/chat/completions
                    ↓
    GPT-5 analyzes images
                    ↓
    Returns JSON with issues and coordinates
```

#### **Step 3.5: Parse & Validate Results**
```
gpt5VisionAnalyzer.ts → parseVisionResponse()
                ↓
Validates coordinates exist
                ↓
Converts pixel coordinates → PDF points (72 DPI)
                ↓
Filters invalid issues
```

### **Phase 4: Creating Highlights**

```
gpt5VisionAnalyzer.ts → combineChunkResults()
                ↓
All issues combined into single array
                ↓
HTTP POST → localhost:5175/highlight-pdf
                ↓
pymupdf_highlight_server.py → highlight_pdf()
                ↓
For each issue:
    - Creates yellow rectangle at coordinates
    - Adds to PDF as annotation
                ↓
Returns: Modified PDF with highlights
```

### **Phase 5: Display Results**

```
Backend returns highlighted PDF
                ↓
CreditReportAnalyzerApp.tsx updates state
                ↓
Right panel shows highlighted PDF
                ↓
"Download Highlighted PDF" button appears
```

---

## 🔴 WHERE THINGS ARE BREAKING

### **Problem 1: GPT-5 Finding Too Few Issues**
- **Location**: `gpt5VisionAnalyzer.ts` → `createVisionAnalysisPrompt()`
- **Issue**: Prompt is too restrictive, only looking for missing data
- **File**: Lines 469-533

### **Problem 2: Coordinates Not Working**
- **Location**: `gpt5VisionAnalyzer.ts` → `combineChunkResults()`
- **Issue**: Pixel to points conversion may be wrong
- **File**: Lines 579-597

### **Problem 3: Validation Too Strict**
- **Location**: `gpt5VisionAnalyzer.ts` → Lines 599-606
- **Issue**: Rejecting valid issues due to coordinate validation

---

## 📁 Key Files & Their Roles

### **Frontend Files:**
1. `src/components/generated/CreditReportAnalyzerApp.tsx`
   - Main UI component
   - Handles file upload
   - Triggers analysis
   - Displays results

2. `src/services/gpt5VisionAnalyzer.ts`
   - Orchestrates entire analysis
   - Calls PyMuPDF server
   - Calls GPT-5 API
   - Processes results

### **Backend Files:**
1. `pymupdf_highlight_server.py`
   - `/health` - Health check
   - `/convert-to-images` - PDF → PNG conversion
   - `/extract-text-coordinates` - Text extraction
   - `/highlight-pdf` - Apply highlights

### **Test Scripts:**
1. `test-real-gpt5-vision.py` - Original test
2. `test-improved-gpt5-vision.py` - Multi-pass test
3. `test-iterative-gpt5-vision.py` - One issue type at a time

---

## 🔄 API Call Sequence

```
1. Frontend → PyMuPDF: Extract text (optional)
2. Frontend → PyMuPDF: Convert to images
3. Frontend → OpenAI: Analyze images with GPT-5
4. Frontend → PyMuPDF: Apply highlights
5. Frontend displays result
```

---

## 🐛 Current Issues & Solutions

### **Issue 1: Only 4 issues found**
**Cause**: GPT-5 prompt too restrictive
**Solution**: Broadened prompt in lines 473-533

### **Issue 2: Highlights not showing**
**Possible Causes**:
1. Coordinates are in wrong format
2. Validation rejecting valid issues
3. PyMuPDF not receiving correct data

### **Issue 3: Too many console logs**
**Cause**: Processing each page individually
**Solution**: Added summary logging

---

## 🔍 How to Debug

1. **Check GPT-5 Response**:
   - Look for "GPT-5 Vision API response received" in console
   - Check if JSON contains coordinates

2. **Check Coordinate Format**:
   - Should be: `{x: number, y: number, width: number, height: number}`
   - Must be in PDF points (72 DPI), not pixels

3. **Check PyMuPDF Server**:
   - Look for `/highlight-pdf` requests
   - Check if returning 200 status

4. **Check Final Issues Array**:
   - Before sending to PyMuPDF
   - Must have valid coordinates for each issue

---

## 📝 Quick Test

To test if highlighting works at all:
```python
python3 test-improved-gpt5-vision.py
```

This will create test outputs in `improved_test_outputs/` folder.

---

## 🎯 Summary

The flow is:
1. **Upload PDF** → Frontend
2. **Convert to images** → PyMuPDF Server
3. **Analyze images** → GPT-5 Vision API
4. **Get coordinates** → From GPT-5 response
5. **Apply highlights** → PyMuPDF Server
6. **Show result** → Frontend

The break is likely at step 4 (not getting good coordinates) or step 5 (coordinate format wrong for PyMuPDF).