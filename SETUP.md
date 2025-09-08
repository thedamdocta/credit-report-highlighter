# Credit Report PDF Highlighter - Setup Guide

## Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.8+
- Chrome/Firefox/Safari (modern browser)

## Installation

### 1. Install Python Dependencies

```bash
python3 -m pip install flask flask-cors pymupdf
```

### 2. Install Node Dependencies

```bash
cd creditpdfhighlighter
npm install
```

## Running the Application

You need to run **TWO** servers:

### Terminal 1: PyMuPDF Highlighting Server (Backend)

```bash
cd creditpdfhighlighter
python3 pymupdf_highlight_server.py
```

You should see:
```
🚀 Starting PyMuPDF Highlighting Server...
📍 Server will run on http://localhost:5175
🎯 Ready for high-precision PDF highlighting!
```

### Terminal 2: Vite Development Server (Frontend)

```bash
cd creditpdfhighlighter
npm run dev
```

The app will open at `http://localhost:5173` (or 5174 if 5173 is unavailable)

## Configuration

### OpenAI API Key (Required for GPT-5)

**Never store your OpenAI API key in a VITE_ env var or expose it to the frontend.**

Create a `.env` file in your backend/server directory (do not commit this file):

```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

Configure your Flask server to read `OPENAI_API_KEY` from the environment. All OpenAI API calls must be proxied through backend endpoints—**never call OpenAI directly from the browser**.

**Reminder:** Always specify the exact model name (e.g., `gpt-5-vision-preview`) in your backend requests to avoid model drift or unexpected changes.

### Custom PyMuPDF Server URL (Optional)

If running the PyMuPDF server on a different port:

```bash
VITE_PYMUPDF_SERVER_URL=http://localhost:YOUR_PORT
```

Then start the server with:
```bash
python3 pymupdf_highlight_server.py --port YOUR_PORT
```

## Verifying Setup

### 1. Check PyMuPDF Server Health

```bash
curl http://localhost:5175/health
```

Expected response:
```json
{"status":"healthy","service":"PyMuPDF Highlighting Server"}
```

### 2. Check Frontend Console

Open browser DevTools (F12) and look for:
```
✅ PyMuPDF Server Online: http://localhost:5175
```

If you see:
```
⚠️ PyMuPDF Server Offline: http://localhost:5175
   To fix: python3 pymupdf_highlight_server.py
```

The PyMuPDF server is not running or not accessible.

## Troubleshooting

### "Failed to analyze credit report" Error

**Cause**: PyMuPDF server is not running or CORS blocked

**Fix**:
1. Ensure PyMuPDF server is running in Terminal 1
2. Check the server is accessible: `curl http://localhost:5175/health`
3. Check browser console for specific errors

### CORS Errors

**Cause**: Browser blocking cross-origin requests

**Fix**: The server already has CORS headers configured. If still having issues:
1. Restart both servers
2. Clear browser cache
3. Try incognito/private mode

### Port Already in Use

**Fix**: Use a different port:
```bash
# For PyMuPDF server
python3 pymupdf_highlight_server.py --port 5176

# Update frontend config
echo "VITE_PYMUPDF_SERVER_URL=http://localhost:5176" >> .env.local
npm run dev
```

### Missing Python Dependencies

**Fix**:
```bash
python3 -m pip install --upgrade flask flask-cors pymupdf
```

### API Key Issues

**Fix**: Ensure your OpenAI API key:
1. Is valid and has GPT-5 access
2. Is properly set in `.env.local`
3. Starts with `sk-`

## Usage Workflow

1. **Start both servers** (PyMuPDF and Vite)
2. **Upload PDF**: Click "Upload PDF" or drag & drop
3. **Analyze**: Click "Analyze" button or use quick actions
4. **Wait**: GPT-5 analyzes the document (may take 30-60 seconds)
5. **View Results**: See highlighted issues in yellow
6. **Download**: Click "Download Highlighted PDF" to save

## System Architecture

**Frontend (Vite/React)**: UI and PDF viewing
**PyMuPDF Server (Python)**: PDF highlighting and image conversion
**Flask Backend**: Proxies all OpenAI API calls and document analysis

The system uses:
- PDF.js for browser-based PDF viewing
- PyMuPDF for server-side PDF annotation
- GPT-5 (via backend proxy) with built-in vision for analysis

## Notes

- All highlights are **yellow** for consistency
- The system requires **both servers** running
- Analysis uses GPT-5 (not GPT-4)—always pin the model name in backend requests
- Coordinates are converted from image pixels to PDF points automatically