#!/usr/bin/env python3
"""
PyMuPDF Highlighting Server
Server-side PDF highlighting using PyMuPDF for maximum precision
"""

import json
import tempfile
import os
from pathlib import Path
from typing import Dict, List, Any
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import fitz  # PyMuPDF

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class PreciseHighlighter:
    """High-precision PDF highlighting using PyMuPDF"""
    
    def __init__(self):
        self.color_map = {
            'critical': (1, 0.2, 0.2),  # Red
            'warning': (1, 0.6, 0.2),   # Orange  
            'attention': (1, 0.9, 0.3), # Yellow
            'info': (0.3, 0.6, 1)       # Blue
        }
    
    def highlight_pdf(self, pdf_bytes: bytes, issues: List[Dict[str, Any]]) -> bytes:
        """
        Apply precise highlights to PDF using PyMuPDF
        
        Args:
            pdf_bytes: Original PDF as bytes
            issues: List of issues with coordinates and types
            
        Returns:
            bytes: Highlighted PDF as bytes
        """
        # Open PDF from bytes
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        try:
            # Group issues by page for efficient processing
            issues_by_page = {}
            for issue in issues:
                page_num = issue.get('pageNumber', issue.get('page', 1)) - 1  # Convert to 0-based
                if page_num not in issues_by_page:
                    issues_by_page[page_num] = []
                issues_by_page[page_num].append(issue)
            
            # Process each page with issues
            for page_num, page_issues in issues_by_page.items():
                if page_num >= len(doc):
                    continue
                    
                page = doc[page_num]
                
                for issue in page_issues:
                    self._add_highlight_to_page(page, issue)
            
            # Add metadata
            metadata = doc.metadata
            metadata['title'] = metadata.get('title', 'Credit Report') + ' (AI Analyzed)'
            metadata['subject'] = 'Credit Report Analysis with AI-detected issues'
            metadata['creator'] = 'Credit Report PDF Highlighter with PyMuPDF'
            doc.set_metadata(metadata)
            
            # Return highlighted PDF as bytes
            return doc.tobytes()
            
        finally:
            doc.close()
    
    def _add_highlight_to_page(self, page: fitz.Page, issue: Dict[str, Any]):
        """Add a single highlight to a page"""
        
        # Get coordinates
        coords = issue.get('coordinates')
        if not coords:
            # Try to find text if no coordinates provided
            anchor_text = issue.get('anchorText', issue.get('textToHighlight', ''))
            if anchor_text:
                coords = self._find_text_coordinates(page, anchor_text)
        
        if not coords:
            return
        
        # Convert coordinates to PyMuPDF format
        rect = fitz.Rect(
            coords.get('x', 0),
            coords.get('y', 0), 
            coords.get('x', 0) + coords.get('width', 100),
            coords.get('y', 0) + coords.get('height', 20)
        )
        
        # Get color for issue type
        issue_type = issue.get('type', 'info')
        color = self.color_map.get(issue_type, self.color_map['info'])
        
        # Add highlight annotation using correct PyMuPDF API
        highlight = page.add_highlight_annot(rect)
        highlight.set_colors(stroke=color)  # Don't set fill for highlights
        highlight.set_opacity(0.4)
        
        # Add content/tooltip using the correct PyMuPDF method
        description = issue.get('description', f"{issue_type.title()} issue detected")
        
        # Use the correct method to set annotation content
        try:
            # Try the modern PyMuPDF way first
            highlight.set_info(title=f"{issue_type.title()} Issue", content=description[:500])
        except AttributeError:
            # Fallback for older PyMuPDF versions
            try:
                highlight.info['title'] = f"{issue_type.title()} Issue"
                highlight.info['content'] = description[:500]
            except:
                pass  # Skip tooltip if not supported
        
        # Update the annotation
        highlight.update()
        
        # Add a subtle border rectangle for better visibility
        try:
            border = page.add_rect_annot(rect)
            border.set_colors(stroke=color)
            border.set_border(width=1.5)
            border.set_opacity(0.6)
            border.update()
        except:
            # If rect annotation fails, try square annotation
            try:
                square = page.add_square_annot(rect)
                square.set_colors(stroke=color)
                square.set_border(width=1.5)
                square.set_opacity(0.6)
                square.update()
            except:
                pass  # Skip border if not supported
    
    def _find_text_coordinates(self, page: fitz.Page, search_text: str) -> Dict[str, float]:
        """Find coordinates of text on the page"""
        if not search_text:
            return None
            
        # Search for text on the page
        text_instances = page.search_for(search_text[:50])  # Limit search text length
        
        if text_instances:
            # Use the first match
            rect = text_instances[0]
            return {
                'x': rect.x0,
                'y': rect.y0,
                'width': rect.width,
                'height': rect.height
            }
        
        return None

# Initialize highlighter
highlighter = PreciseHighlighter()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "PyMuPDF Highlighting Server"})

@app.route('/highlight-pdf', methods=['POST'])
def highlight_pdf():
    """
    Main highlighting endpoint
    
    Expected form data:
    - pdf: PDF file
    - issues: JSON string with issues to highlight
    """
    try:
        # Validate request
        if 'pdf' not in request.files:
            return jsonify({"error": "No PDF file provided"}), 400
        
        if 'issues' not in request.form:
            return jsonify({"error": "No issues data provided"}), 400
        
        pdf_file = request.files['pdf']
        if pdf_file.filename == '':
            return jsonify({"error": "No PDF file selected"}), 400
        
        # Parse issues data
        try:
            issues_data = json.loads(request.form['issues'])
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON in issues data"}), 400
        
        # Read PDF bytes
        pdf_bytes = pdf_file.read()
        
        # Apply highlighting
        highlighted_pdf_bytes = highlighter.highlight_pdf(pdf_bytes, issues_data)
        
        # Create temporary file for response
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(highlighted_pdf_bytes)
            temp_path = temp_file.name
        
        # Return highlighted PDF
        response = send_file(
            temp_path,
            as_attachment=True,
            download_name=f"highlighted_{pdf_file.filename}",
            mimetype='application/pdf'
        )
        
        # Clean up temp file after response
        @response.call_on_close
        def cleanup():
            try:
                os.unlink(temp_path)
            except OSError:
                pass
        
        return response
        
    except Exception as e:
        return jsonify({"error": f"Highlighting failed: {str(e)}"}), 500

@app.route('/extract-text', methods=['POST'])
def extract_text():
    """
    Extract text and coordinates from PDF for coordinate mapping
    
    Expected form data:
    - pdf: PDF file
    """
    try:
        if 'pdf' not in request.files:
            return jsonify({"error": "No PDF file provided"}), 400
        
        pdf_file = request.files['pdf']
        pdf_bytes = pdf_file.read()
        
        # Open PDF and extract text with coordinates
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        pages_data = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Get text blocks with coordinates
            blocks = page.get_text("dict")
            
            page_info = {
                "pageNumber": page_num + 1,
                "width": page.rect.width,
                "height": page.rect.height,
                "textBlocks": []
            }
            
            for block in blocks.get("blocks", []):
                if "lines" in block:  # Text block
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text_info = {
                                "text": span["text"],
                                "bbox": span["bbox"],  # [x0, y0, x1, y1]
                                "font": span.get("font", ""),
                                "size": span.get("size", 0)
                            }
                            page_info["textBlocks"].append(text_info)
            
            pages_data.append(page_info)
        
        doc.close()
        
        return jsonify({
            "success": True,
            "pages": pages_data,
            "totalPages": len(pages_data)
        })
        
    except Exception as e:
        return jsonify({"error": f"Text extraction failed: {str(e)}"}), 500

if __name__ == '__main__':
    print("🚀 Starting PyMuPDF Highlighting Server...")
    print("📍 Server will run on http://localhost:5174")
    print("🎯 Ready for high-precision PDF highlighting!")
    
    app.run(
        host='0.0.0.0',
        port=5174,
        debug=True,
        threaded=True
    )