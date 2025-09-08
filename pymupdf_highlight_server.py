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
# Explicit, permissive CORS for local dev (frontend at 5173)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

class PreciseHighlighter:
    """High-precision PDF highlighting using PyMuPDF"""
    
    def __init__(self):
        self.color_map = {
            'critical': (1, 1, 0),      # Yellow
            'warning': (1, 1, 0),       # Yellow  
            'attention': (1, 1, 0),     # Yellow
            'info': (1, 1, 0)           # Yellow
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
        """Add a single highlight to a page. Coordinates are REQUIRED."""
        coords = issue.get('coordinates')
        if not coords:
            raise ValueError('Missing coordinates for issue')
        
        # Convert coordinates to PyMuPDF format
        rect = fitz.Rect(
            coords.get('x', 0),
            coords.get('y', 0), 
            coords.get('x', 0) + coords.get('width', 100),
            coords.get('y', 0) + coords.get('height', 20)
        )

        # Validate rectangle is within the page bounds
        page_rect = page.rect
        if not rect.intersects(page_rect):
            raise ValueError(f'Highlight rectangle out of bounds: {rect} not in page {page.number + 1} size {page_rect}')
        
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

@app.route('/extract-text-coordinates', methods=['POST'])
def extract_text_coordinates():
    """Extract precise text coordinates from PDF for semantic mapping"""
    try:
        if 'pdf' not in request.files:
            return jsonify({'error': 'No PDF file provided'}), 400
        
        pdf_file = request.files['pdf']
        pdf_bytes = pdf_file.read()
        
        # Open PDF with PyMuPDF
        pdf_doc = fitz.open(stream=pdf_bytes)
        text_tokens = []
        
        print(f"🔍 Extracting text coordinates from {len(pdf_doc)} pages...")
        
        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            
            # Get text with precise coordinates using get_text("dict")
            text_dict = page.get_text("dict")
            
            for block in text_dict.get("blocks", []):
                if block.get("type") == 0:  # Text block (not image)
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            text = span.get("text", "").strip()
                            if len(text) > 0:  # Skip empty text
                                bbox = span.get("bbox", [0, 0, 0, 0])  # [x0, y0, x1, y1]
                                font_info = span.get("font", "")
                                font_size = span.get("size", 12)
                                
                                text_tokens.append({
                                    "text": text,
                                    "x": round(bbox[0], 2),
                                    "y": round(bbox[1], 2),
                                    "width": round(bbox[2] - bbox[0], 2),
                                    "height": round(bbox[3] - bbox[1], 2),
                                    "page": page_num + 1,
                                    "fontSize": round(font_size, 2),
                                    "fontName": font_info,
                                    "bbox": [round(x, 2) for x in bbox]
                                })
        
        pdf_doc.close()
        
        print(f"✅ Extracted {len(text_tokens)} text tokens with precise coordinates")
        
        return jsonify({
            'success': True,
            'textTokens': text_tokens,
            'totalTokens': len(text_tokens),
            'message': f'Extracted coordinates for {len(text_tokens)} text elements'
        })
        
    except Exception as e:
        print(f"❌ Text coordinate extraction error: {e}")
        return jsonify({'error': str(e)}), 500

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
        
        # Strict validation: every issue must include numeric coordinates
        def _has_valid_coords(issue: Dict[str, Any]) -> bool:
            c = issue.get('coordinates')
            if not isinstance(c, dict):
                return False
            for k in ('x', 'y', 'width', 'height'):
                v = c.get(k)
                if not isinstance(v, (int, float)):
                    return False
            return True

        invalid = [i for i in issues_data if not _has_valid_coords(i)]
        if invalid:
            return jsonify({"error": f"Invalid or missing coordinates for {len(invalid)} issue(s)"}), 400

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

@app.route('/convert-to-images', methods=['POST'])
def convert_to_images():
    """
    Convert PDF pages to high-quality images for GPT-5 vision analysis
    
    Expected form data:
    - pdf: PDF file
    - dpi: Optional DPI setting (default: 300)
    - format: Optional image format (default: PNG)
    """
    try:
        if 'pdf' not in request.files:
            return jsonify({"error": "No PDF file provided"}), 400
        
        pdf_file = request.files['pdf']
        pdf_bytes = pdf_file.read()
        
        # Get optional parameters
        dpi = int(request.form.get('dpi', 300))  # High DPI for vision analysis
        image_format = request.form.get('format', 'PNG').upper()
        
        # Open PDF with PyMuPDF
        pdf_doc = fitz.open(stream=pdf_bytes)
        images_data = []
        
        print(f"🖼️ Converting {len(pdf_doc)} pages to {image_format} images at {dpi} DPI...")
        
        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            
            # Create high-quality pixmap for vision analysis
            # Use matrix to scale for desired DPI
            zoom = dpi / 72.0  # 72 DPI is default
            matrix = fitz.Matrix(zoom, zoom)
            
            # Render page to pixmap
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            
            # Convert to bytes based on format
            if image_format == 'PNG':
                image_bytes = pixmap.tobytes("png")
                mime_type = "image/png"
            elif image_format == 'JPEG':
                image_bytes = pixmap.tobytes("jpeg")
                mime_type = "image/jpeg"
            else:
                # Default to PNG
                image_bytes = pixmap.tobytes("png")
                mime_type = "image/png"
            
            # Store image data
            import base64
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            images_data.append({
                "pageNumber": page_num + 1,
                "imageData": image_base64,
                "mimeType": mime_type,
                "width": pixmap.width,
                "height": pixmap.height,
                "dpi": dpi
            })
            
            # Clean up pixmap
            pixmap = None
        
        pdf_doc.close()
        
        print(f"✅ Converted {len(images_data)} pages to images for vision analysis")
        
        return jsonify({
            'success': True,
            'images': images_data,
            'totalPages': len(images_data),
            'dpi': dpi,
            'format': image_format,
            'message': f'Converted {len(images_data)} pages to {image_format} format'
        })
        
    except Exception as e:
        print(f"❌ Image conversion error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting PyMuPDF Highlighting Server...")
    print("📍 Server will run on http://localhost:5175")
    print("🎯 Ready for high-precision PDF highlighting!")
    
    app.run(
        host='0.0.0.0',
        port=5175,
        debug=True,
        threaded=True
    )
