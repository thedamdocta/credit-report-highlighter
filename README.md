# Credit Report PDF Highlighter with AI Analysis

An advanced web application that analyzes credit reports using AI, identifies potential issues and FCRA violations, and saves a real, highlighted PDF with permanent annotations. Built with React, TypeScript, GPT‑5 Vision, and PyMuPDF.

## 🚨 CRITICAL: GPT-5 ONLY POLICY

**This application EXCLUSIVELY uses GPT-5 models. NO GPT-4 models are permitted.**

- ✅ **Vision Analysis**: GPT-5 with built-in vision capabilities
- ✅ **Text Analysis**: GPT-5
- ❌ **GPT-4 Models**: FORBIDDEN

### Enforcement Mechanisms:
- **CI/CD Gate**: Automated validation on all pushes and PRs
- **Pre-commit Hooks**: Local validation before every commit
- **Build Blocking**: CI fails if GPT-4 references detected

**Validation Commands:**
```bash
npm run check-models      # Check for unauthorized model references
npm run validate-models   # Validate model configurations
npm run audit-models      # Complete model audit
```

## 🌟 Key Features

### AI-Powered Analysis
- **GPT-5 Vision Integration** for intelligent credit report analysis
- **Late Chunking Technology** for context preservation across 120+ page documents
- **Multiple Analysis Modes**:
  - Full comprehensive analysis
  - FCRA compliance focus
  - Collections account analysis
  - Dispute tracking
  - Custom analysis with user prompts

### Advanced PDF Highlighting (PyMuPDF‑Only)
- **PyMuPDF**: Server-side (or offline) permanent PDF annotations
- **Strict Coordinates**: No fallbacks or approximations; failures surface immediately
- **Yellow‑Only Policy**: All highlight types are rendered yellow in the saved PDF
- **Cross-Page Relationship Support** via issue metadata

### Export Options
- **Save Highlighted PDF** (PDF only) with embedded annotations
- **Configurable Options**:
  - Bookmark generation for issues
  - Cross-page link indicators
  - Custom filename support

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- OpenAI API key for AI analysis

### Installation

```bash
# Clone the repository
git clone https://github.com/thedamdocta/credit-report-highlighter.git
cd credit-report-highlighter

# Install dependencies (includes pre-commit hooks setup)
npm install

# Pre-commit hooks are automatically installed via Husky
# They will validate model usage before every commit

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## 📊 Usage

1. **Upload Credit Report**: Click to upload a PDF credit report (supports files up to 120+ pages)

2. **Select Analysis Type**:
   - Full Analysis (recommended for comprehensive review)
   - FCRA Focus (for compliance issues)
   - Collections Focus (for debt-related issues)
   - Custom Analysis (with your own prompt)

3. **Start Analysis**: The AI will process your document with:
   - PDF parsing and text extraction
   - Late chunking for context preservation
   - Issue identification and categorization
   - Coordinate mapping for precise highlighting

4. **Review Results**: See categorized issues:
   - Critical (red) - severe violations
   - Warning (orange) - important concerns
   - Attention (yellow) - items to review
   - Info (blue) - informational items

5. **Save Highlighted PDF**:
   - Choose highlighting strategy
   - Select export format
   - Configure additional options
   - Download the highlighted document

## 🏗️ Architecture

### Core Technologies
- **Frontend**: React 19 + TypeScript + Vite
- **UI Components**: Tailwind CSS + Framer Motion
- **PDF Rendering (viewer)**: React‑PDF (PDF.js) for on‑screen viewing
- **PDF Highlighting (output)**: PyMuPDF (server-side or offline)
- **AI Integration**: OpenAI GPT‑5 Vision API
- **State Management**: React Hooks

### Key Services

#### Late Chunking System
```typescript
// Handles large documents with context preservation
- EnhancedLateChunkingService
- AdvancedChunkingService
- Hierarchical chunking with 128K token support
```

#### Highlighting Service
```typescript
// Single-strategy highlighting (PyMuPDF only)
- PyMuPDFHighlightService (server-side/offline)
```

#### AI Analysis
```typescript
// Enhanced AI analysis with streaming support
- EnhancedAIAnalyzer
- CreditAnalyzer
- Progressive result delivery
```

## 🔧 Configuration

### OpenAI API Key
Set your OpenAI API key in the settings modal or environment variables:

```env
VITE_OPENAI_API_KEY=your-api-key-here
```

### Highlighting Configuration
Customize highlighting behavior in `src/types/highlighting.ts` (used for overlay/metadata; saved PDF annotations are yellow by policy):

```typescript
export interface HighlightConfig {
  colors: {
    critical: '#ff4444',
    warning: '#ff9944',
    attention: '#ffdd44',
    info: '#44ddff'
  },
  opacity: {
    default: 0.3,
    hover: 0.5,
    selected: 0.7
  }
}
```

## 📁 Project Structure

```
credit-report-highlighter/
├── src/
│   ├── components/         # React components
│   │   ├── PDFSaveOptionsModal.tsx
│   │   ├── AnalysisResultsWithSave.tsx
│   │   └── EnhancedAnalysisWorkflow.tsx
│   ├── services/           # Core services
│   │   ├── aiAnalyzer.ts
│   │   ├── gpt5VisionAnalyzer.ts
│   │   ├── lateChunkingService.ts
│   │   ├── coordinateMapper.ts
│   │   └── pymuPdfHighlighter.ts
│   ├── pymupdf_highlight_server.py  # Flask server for PyMuPDF (optional)
│   ├── hooks/             # Custom React hooks
│   │   └── usePDFSave.ts
│   ├── types/             # TypeScript definitions
│   │   ├── creditReport.ts
│   │   ├── highlighting.ts
│   │   └── enhancedCreditReport.ts
│   └── utils/             # Utility functions
├── public/                # Static assets
└── dist/                  # Build output
```

## 🧪 Testing

Test the application with the included sample credit reports:
- `Brittney Bradwell Equifax.pdf`
- `Brittney Bradwell TransUnion Credit Report.pdf`
- `Brittney Bradwell Experian.pdf`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- React‑PDF / PDF.js by Mozilla for on‑screen rendering
- PyMuPDF for server/offline PDF annotation
- OpenAI for GPT‑5 Vision API

## 📞 Support

For issues or questions:
- Open an issue on [GitHub](https://github.com/thedamdocta/credit-report-highlighter/issues)
- Contact the repository owner

## 🚦 Status

- ✅ Production Ready
- ✅ Actively Maintained
- ✅ Open Source

---

**Note**: This application requires an OpenAI API key for AI analysis functionality. Ensure you have appropriate API access and credits before processing large documents.
