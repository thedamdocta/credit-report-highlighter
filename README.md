# Credit Report PDF Highlighter with AI Analysis

An advanced web application that analyzes credit reports using AI, identifies potential issues and FCRA violations, and provides interactive PDF highlighting with save functionality. Built with React, TypeScript, and cutting-edge PDF processing technology.

## 🌟 Key Features

### AI-Powered Analysis
- **GPT-4 Integration** for intelligent credit report analysis
- **Late Chunking Technology** for context preservation across 120+ page documents
- **Multiple Analysis Modes**:
  - Full comprehensive analysis
  - FCRA compliance focus
  - Collections account analysis
  - Dispute tracking
  - Custom analysis with user prompts

### Advanced PDF Highlighting
- **Three Highlighting Strategies**:
  - **PyMuPDF**: Server-side permanent PDF modifications
  - **Canvas Overlay**: Interactive client-side highlighting with tooltips
  - **PDF.js Annotations**: Standard PDF annotations with XFDF export
- **Intelligent Strategy Selection** based on document size and requirements
- **Cross-Page Relationship Tracking** for linked issues

### Export Options
- **Save Highlighted PDFs** with embedded annotations
- **Multiple Export Formats**: PDF, JSON, XFDF
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

# Install dependencies
npm install

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
- **PDF Processing**: PDF.js + pdf-lib
- **AI Integration**: OpenAI GPT-4 API
- **State Management**: React Hooks

### Key Services

#### Late Chunking System
```typescript
// Handles large documents with context preservation
- EnhancedLateChunkingService
- AdvancedChunkingService
- Hierarchical chunking with 128K token support
```

#### Highlighting Services
```typescript
// Multi-strategy highlighting implementation
- UnifiedHighlightService (orchestrator)
- PyMuPDFHighlightService (server-side)
- CanvasOverlayHighlightService (client-side)
- PDFJSAnnotationHighlightService (annotations)
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
Customize highlighting behavior in `src/types/highlighting.ts`:

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
│   │   ├── lateChunkingService.ts
│   │   ├── coordinateMapper.ts
│   │   └── unifiedHighlightService.ts
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

- Built with assistance from Claude (Anthropic)
- PDF.js by Mozilla for PDF rendering
- pdf-lib for PDF manipulation
- OpenAI for GPT-4 API

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