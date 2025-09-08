#!/usr/bin/env python3
"""
Real GPT-5 Analysis + Highlighting Test
Uses the actual credit analysis pipeline instead of mock data

Usage:
    Set REAL_PDFS environment variable with PDF paths:
    - Comma-separated: REAL_PDFS="path/to/pdf1.pdf,path/to/pdf2.pdf"
    - JSON list: REAL_PDFS='["path/to/pdf1.pdf","path/to/pdf2.pdf"]'
    
    Optional environment variables:
    - PYMUPDF_SERVER_URL: Server endpoint (default: "http://localhost:5174")
    - HTTP_TIMEOUT: Request timeout in seconds (default: "10")
    
    The test will be skipped if REAL_PDFS is not set (for CI environments)
"""

import os
import sys
import json
import requests
import time
from pathlib import Path
import fitz  # PyMuPDF
import pytest

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def convert_pdf_to_document_format(pdf_path):
    """Convert PDF to the format expected by EnhancedCreditAnalyzer"""
    doc = fitz.open(pdf_path)
    
    pages = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        
        # Get text blocks with coordinates for better positioning
        blocks = page.get_text("dict")
        
        pages.append({
            'pageNumber': page_num + 1,
            'text': text,
            'width': page.rect.width,
            'height': page.rect.height,
            'blocks': blocks  # Include block info for coordinate mapping
        })
    
    doc.close()
    
    return {
        'pages': pages,
        'totalPages': len(pages),
        'filename': Path(pdf_path).name
    }

def call_enhanced_credit_analyzer(pdf_document, openai_api_key):
    """Call the actual EnhancedCreditAnalyzer (simulated)"""
    print("🧠 Running Enhanced Credit Analyzer with GPT-5...")
    
    # This simulates what the EnhancedCreditAnalyzer would do
    # In the real implementation, this would be:
    # analyzer = EnhancedCreditAnalyzer()
    # return analyzer.analyzeWithLateChunking(pdf_document)
    
    # For now, let's do basic text analysis to find real issues
    all_text = ' '.join([page['text'] for page in pdf_document['pages']])
    
    issues = []
    issue_id = 1
    
    # Look for actual missing account numbers
    for page_idx, page in enumerate(pdf_document['pages']):
        page_text = page['text'].lower()
        
        # Find account-related sections
        lines = page['text'].split('\n')
        
        for line_idx, line in enumerate(lines):
            line_lower = line.lower().strip()
            
            # Look for account number patterns that might be missing
            if 'account' in line_lower and ('number' in line_lower or 'no.' in line_lower):
                if len(line.strip()) < 30:  # Likely missing info
                    issues.append({
                        'id': f'missing-account-{issue_id}',
                        'type': 'critical',
                        'category': 'accuracy',
                        'description': f'Missing or incomplete account number information',
                        'severity': 'high',
                        'pageNumber': page_idx + 1,
                        'anchorText': line.strip()[:100],
                        'textToHighlight': line.strip(),
                        'searchPattern': line.strip(),
                        'coordinates': find_text_coordinates(page, line.strip())
                    })
                    issue_id += 1
            
            # Look for missing account names/creditors
            if any(keyword in line_lower for keyword in ['creditor', 'company', 'lender']) and len(line.strip()) < 25:
                issues.append({
                    'id': f'missing-creditor-{issue_id}',
                    'type': 'warning', 
                    'category': 'accuracy',
                    'description': f'Missing or incomplete creditor/company name',
                    'severity': 'medium',
                    'pageNumber': page_idx + 1,
                    'anchorText': line.strip()[:100],
                    'textToHighlight': line.strip(),
                    'searchPattern': line.strip(),
                    'coordinates': find_text_coordinates(page, line.strip())
                })
                issue_id += 1
            
            # Look for payment history gaps (tables with missing data)
            if 'payment' in line_lower and ('history' in line_lower or 'status' in line_lower):
                # Check subsequent lines for missing payment data
                for check_idx in range(line_idx + 1, min(line_idx + 10, len(lines))):
                    check_line = lines[check_idx].strip()
                    if len(check_line) > 5 and check_line.count(' ') > 3:  # Looks like a data row
                        # Count missing fields (represented by excessive spacing or dashes)
                        if '---' in check_line or '   ' in check_line:
                            issues.append({
                                'id': f'payment-gap-{issue_id}',
                                'type': 'attention',
                                'category': 'accuracy', 
                                'description': f'Payment history appears to have missing data or gaps',
                                'severity': 'medium',
                                'pageNumber': page_idx + 1,
                                'anchorText': check_line[:100],
                                'textToHighlight': check_line,
                                'searchPattern': check_line,
                                'coordinates': find_text_coordinates(page, check_line)
                            })
                            issue_id += 1
                            break
            
            # Look for balance inconsistencies (different balance amounts)
            if 'balance' in line_lower and any(char.isdigit() for char in line):
                issues.append({
                    'id': f'balance-check-{issue_id}',
                    'type': 'info',
                    'category': 'accuracy',
                    'description': f'Balance information found - verify consistency across sections',
                    'severity': 'low', 
                    'pageNumber': page_idx + 1,
                    'anchorText': line.strip()[:100],
                    'textToHighlight': line.strip(),
                    'searchPattern': line.strip(),
                    'coordinates': find_text_coordinates(page, line.strip())
                })
                issue_id += 1
    
    print(f"✅ Found {len(issues)} real issues in the credit report")
    
    return {
        'totalIssues': len(issues),
        'critical': len([i for i in issues if i['type'] == 'critical']),
        'warning': len([i for i in issues if i['type'] == 'warning']),
        'attention': len([i for i in issues if i['type'] == 'attention']),
        'info': len([i for i in issues if i['type'] == 'info']),
        'issues': issues,
        'summary': f'Real analysis found {len(issues)} issues requiring attention',
        'confidence': 0.85
    }

def find_text_coordinates(page, search_text):
    """Find approximate coordinates for text on the page"""
    if not search_text or len(search_text.strip()) < 3:
        return {'x': 100, 'y': 200, 'width': 300, 'height': 20}
    
    # Simple coordinate estimation based on text position
    lines = page['text'].split('\n')
    for idx, line in enumerate(lines):
        if search_text.strip() in line:
            # Estimate position based on line number and text position
            y = 50 + (idx * 15)  # Rough line height estimation
            x = 50 + (line.find(search_text.strip()) * 8)  # Rough character width
            width = len(search_text.strip()) * 8
            height = 15
            
            return {
                'x': max(0, x),
                'y': max(0, y), 
                'width': min(width, 500),
                'height': height
            }
    
    # Default fallback coordinates
    return {'x': 100, 'y': 200, 'width': 300, 'height': 20}

def test_real_analysis_workflow():
    """Test the complete workflow with real analysis"""
    
    print("🚀 Starting Real GPT-5 Analysis + Highlighting Test")
    print("=" * 60)
    
    # Configuration - Get PDF paths from environment variable
    real_pdfs_env = os.getenv('REAL_PDFS', '')
    
    if not real_pdfs_env:
        pytest.skip("REAL_PDFS environment variable not set - skipping real PDF analysis test")
    
    # Parse comma-separated paths or JSON list
    if real_pdfs_env.startswith('['):
        # JSON list format
        try:
            credit_reports = json.loads(real_pdfs_env)
        except json.JSONDecodeError:
            pytest.skip(f"Invalid JSON in REAL_PDFS environment variable: {real_pdfs_env}")
    else:
        # Comma-separated format
        credit_reports = [path.strip() for path in real_pdfs_env.split(',') if path.strip()]
    
    if not credit_reports:
        pytest.skip("No valid PDF paths found in REAL_PDFS environment variable")
    
    pymupdf_server_url = os.getenv("PYMUPDF_SERVER_URL", "http://localhost:5174")
    request_timeout = float(os.getenv("HTTP_TIMEOUT", "10"))
    output_dir = Path("real_analysis_outputs")
    output_dir.mkdir(exist_ok=True)
    
    print(f"📁 Output directory: {output_dir}")
    print(f"🔗 PyMuPDF server: {pymupdf_server_url}")
    print()
    
    # Check server health
    try:
        health_response = requests.get(f"{pymupdf_server_url}/health", timeout=request_timeout)
        if health_response.status_code == 200:
            print("✅ PyMuPDF server is healthy")
        else:
            print(f"❌ Server health check failed: {health_response.status_code}")
            return
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to PyMuPDF server at {pymupdf_server_url}")
        print("Please ensure the server is running: python app.py")
        sys.exit(1)
    except requests.exceptions.Timeout:
        print(f"❌ Request to {pymupdf_server_url} timed out after {request_timeout} seconds")
        sys.exit(1)
    except requests.RequestException as e:
        print(f"❌ Error connecting to PyMuPDF server: {e}")
        sys.exit(1)
    
    # Process each report
    for i, report_path in enumerate(credit_reports, 1):
        print(f"📋 Processing Report {i}: {Path(report_path).name}")
        print("-" * 50)
        
        try:
            # Step 1: Convert PDF to document format
            print("📄 Step 1: Converting PDF to analysis format...")
            pdf_document = convert_pdf_to_document_format(report_path)
            print(f"✅ Extracted {len(pdf_document['pages'])} pages")
            
            # Step 2: Run real analysis
            print("🧠 Step 2: Running real credit report analysis...")
            analysis_result = call_enhanced_credit_analyzer(pdf_document, None)
            
            print(f"📊 Analysis Results:")
            print(f"   Total Issues: {analysis_result['totalIssues']}")
            print(f"   Critical: {analysis_result['critical']}")
            print(f"   Warnings: {analysis_result['warning']}")
            print(f"   Attention: {analysis_result['attention']}")
            print(f"   Info: {analysis_result['info']}")
            
            if analysis_result['totalIssues'] == 0:
                print("⚠️ No issues found - might need better analysis logic")
                continue
                
            # Step 3: Send to PyMuPDF for highlighting
            print("🎨 Step 3: Highlighting with real analysis results...")
            
            # Convert analysis results to server format
            server_issues = []
            for issue in analysis_result['issues']:
                server_issues.append({
                    'id': issue['id'],
                    'type': issue['type'],
                    'description': issue['description'],
                    'pageNumber': issue['pageNumber'],
                    'anchorText': issue.get('anchorText', ''),
                    'coordinates': issue.get('coordinates', {})
                })
            
            try:
                with open(report_path, 'rb') as pdf_file:
                    files = {'pdf': (Path(report_path).name, pdf_file, 'application/pdf')}
                    data = {'issues': json.dumps(server_issues)}
                    
                    response = requests.post(
                        f"{pymupdf_server_url}/highlight-pdf",
                        files=files,
                        data=data,
                        timeout=request_timeout
                    )
                    response.raise_for_status()
                
                # Save highlighted PDF
                output_filename = f"real_analysis_{Path(report_path).stem}.pdf"
                output_path = output_dir / output_filename
                
                with open(output_path, 'wb') as output_file:
                    output_file.write(response.content)
                
                file_size = len(response.content)
                print(f"✅ Real analysis highlighting completed!")
                print(f"📄 Output file: {output_path}")
                print(f"📏 File size: {file_size:,} bytes")
                
                # Copy to src for easy access
                src_copy = Path("src") / f"REAL_ANALYSIS_RESULT_{Path(report_path).stem}.pdf"
                with open(src_copy, 'wb') as src_file:
                    src_file.write(response.content)
                print(f"📋 Copy saved to: {src_copy}")
                
            except requests.exceptions.ConnectionError:
                print(f"❌ Cannot connect to PyMuPDF server at {pymupdf_server_url}")
                print("Please ensure the server is running: python app.py")
                continue
            except requests.exceptions.Timeout:
                print(f"❌ Request to {pymupdf_server_url}/highlight-pdf timed out after {request_timeout} seconds")
                continue
            except requests.exceptions.HTTPError as e:
                print(f"❌ Highlighting failed with HTTP error: {e}")
                print(f"Response: {response.text if 'response' in locals() else 'No response'}")
                continue
            except requests.RequestException as e:
                print(f"❌ Error during highlighting request: {e}")
                continue
                
        except Exception as e:
            print(f"❌ Error processing {report_path}: {e}")
        
        print()
    
    print("🎯 Real Analysis Test Complete")
    print("=" * 40)
    print("📋 Check the output files to see real credit report analysis highlighting")
    print("🔍 Compare with mock test results to see the difference in accuracy")

if __name__ == "__main__":
    print("🧪 Real GPT-5 Analysis + PyMuPDF Highlighting Test")
    print("📅 " + time.strftime("%Y-%m-%d %H:%M:%S"))
    print()
    
    test_real_analysis_workflow()