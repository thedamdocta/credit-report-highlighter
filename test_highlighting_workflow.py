#!/usr/bin/env python3
"""
Background Test Script for Credit Report Highlighting Workflow
Tests the complete pipeline: PDF → GPT-5 Analysis → PyMuPDF Highlighting
"""

import os
import sys
import json
import requests
import time
from pathlib import Path

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_workflow():
    """Test the complete credit report highlighting workflow"""
    
    print("🚀 Starting Credit Report Highlighting Workflow Test")
    print("=" * 60)
    
    # Configuration
    credit_reports = [
        "src/Brittney Bradwell Equifax.pdf",
        "src/Brittney Bradwell _ TransUnion Credit Report.pdf", 
        "src/Brittney Bradwell Experian.pdf"
    ]
    
    pymupdf_server_url = "http://localhost:5174"
    output_dir = Path("test_outputs")
    output_dir.mkdir(exist_ok=True)
    
    print(f"📁 Output directory: {output_dir}")
    print(f"🔗 PyMuPDF server: {pymupdf_server_url}")
    print()
    
    # Test each credit report
    for i, report_path in enumerate(credit_reports, 1):
        print(f"📋 Testing Report {i}/3: {Path(report_path).name}")
        print("-" * 50)
        
        try:
            # Check if file exists
            if not Path(report_path).exists():
                print(f"❌ File not found: {report_path}")
                continue
            
            # Step 1: Check server health
            print("🔍 Step 1: Checking PyMuPDF server health...")
            try:
                health_response = requests.get(f"{pymupdf_server_url}/health", timeout=5)
                if health_response.status_code == 200:
                    print("✅ PyMuPDF server is healthy")
                else:
                    print(f"⚠️ Server health check failed: {health_response.status_code}")
                    continue
            except requests.RequestException as e:
                print(f"❌ Cannot connect to PyMuPDF server: {e}")
                print("💡 Make sure the server is running: python pymupdf_highlight_server.py")
                continue
            
            # Step 2: Create mock analysis results (simulating GPT-5 output)
            print("🤖 Step 2: Creating mock GPT-5 analysis results...")
            mock_issues = create_mock_credit_issues(report_path)
            print(f"📊 Generated {len(mock_issues)} mock issues")
            
            # Step 3: Send to PyMuPDF server for highlighting
            print("🎨 Step 3: Sending to PyMuPDF server for highlighting...")
            
            with open(report_path, 'rb') as pdf_file:
                files = {'pdf': (Path(report_path).name, pdf_file, 'application/pdf')}
                data = {'issues': json.dumps(mock_issues)}
                
                response = requests.post(
                    f"{pymupdf_server_url}/highlight-pdf",
                    files=files,
                    data=data,
                    timeout=30
                )
            
            if response.status_code == 200:
                # Step 4: Save highlighted PDF
                output_filename = f"highlighted_{Path(report_path).stem}_test.pdf"
                output_path = output_dir / output_filename
                
                with open(output_path, 'wb') as output_file:
                    output_file.write(response.content)
                
                file_size = len(response.content)
                print(f"✅ Highlighted PDF created successfully!")
                print(f"📄 Output file: {output_path}")
                print(f"📏 File size: {file_size:,} bytes")
                
                # Step 5: Verify the highlighted PDF was created properly
                if file_size > 1000:  # Basic size check
                    print("✅ File size looks good (>1KB)")
                else:
                    print("⚠️ File size seems small, might be an issue")
                
            else:
                print(f"❌ Highlighting failed: {response.status_code}")
                print(f"Error response: {response.text}")
            
        except Exception as e:
            print(f"❌ Error processing {report_path}: {e}")
        
        print()
        time.sleep(1)  # Brief pause between files
    
    print("🎯 Test Summary")
    print("=" * 30)
    
    # List all generated files
    output_files = list(output_dir.glob("*.pdf"))
    if output_files:
        print(f"✅ Generated {len(output_files)} highlighted PDF(s):")
        for file in output_files:
            size = file.stat().st_size
            print(f"   📄 {file.name} ({size:,} bytes)")
    else:
        print("❌ No highlighted PDFs were generated")
    
    print("\n🔍 Next Steps:")
    print("1. Check the 'test_outputs' directory for highlighted PDFs")
    print("2. Open the PDFs to verify highlights are visible")
    print("3. Compare with original PDFs to see the differences")

def create_mock_credit_issues(pdf_path):
    """Create realistic mock credit report issues for testing"""
    
    report_name = Path(pdf_path).stem.lower()
    
    # Base issues that would commonly be found in credit reports
    base_issues = [
        {
            "id": "missing-account-1",
            "type": "critical",
            "description": "Missing account number for credit card account",
            "pageNumber": 1,
            "anchorText": "Account Number: [MISSING]",
            "coordinates": {"x": 100, "y": 200, "width": 300, "height": 20}
        },
        {
            "id": "inconsistent-payment-1", 
            "type": "warning",
            "description": "Payment history inconsistency - different amounts reported",
            "pageNumber": 2,
            "anchorText": "Payment History",
            "coordinates": {"x": 150, "y": 300, "width": 250, "height": 25}
        },
        {
            "id": "missing-creditor-name-1",
            "type": "attention", 
            "description": "Missing creditor name for account",
            "pageNumber": 1,
            "anchorText": "Creditor Name:",
            "coordinates": {"x": 80, "y": 350, "width": 200, "height": 18}
        },
        {
            "id": "balance-inconsistency-1",
            "type": "warning",
            "description": "Balance amount inconsistency between sections",
            "pageNumber": 2,
            "anchorText": "Current Balance",
            "coordinates": {"x": 200, "y": 450, "width": 180, "height": 20}
        }
    ]
    
    # Add bureau-specific issues
    if 'equifax' in report_name:
        base_issues.extend([
            {
                "id": "equifax-specific-1",
                "type": "info",
                "description": "Equifax: Potential dispute opportunity identified",
                "pageNumber": 3,
                "anchorText": "Dispute Information",
                "coordinates": {"x": 120, "y": 500, "width": 220, "height": 22}
            }
        ])
    elif 'transunion' in report_name:
        base_issues.extend([
            {
                "id": "transunion-specific-1", 
                "type": "critical",
                "description": "TransUnion: Account validation required",
                "pageNumber": 2,
                "anchorText": "Account Validation",
                "coordinates": {"x": 90, "y": 600, "width": 280, "height": 24}
            }
        ])
    elif 'experian' in report_name:
        base_issues.extend([
            {
                "id": "experian-specific-1",
                "type": "attention",
                "description": "Experian: Collection account needs verification",
                "pageNumber": 3,
                "anchorText": "Collection Account",
                "coordinates": {"x": 160, "y": 250, "width": 240, "height": 20}
            }
        ])
    
    return base_issues

def check_prerequisites():
    """Check if all prerequisites are met"""
    print("🔧 Checking prerequisites...")
    
    # Check if PyMuPDF server is running
    try:
        response = requests.get("http://localhost:5174/health", timeout=5)
        if response.status_code == 200:
            print("✅ PyMuPDF server is running")
            return True
        else:
            print("❌ PyMuPDF server not responding properly")
            return False
    except requests.RequestException:
        print("❌ PyMuPDF server is not running")
        print("💡 Start it with: python pymupdf_highlight_server.py")
        return False

if __name__ == "__main__":
    print("🧪 Credit Report Highlighting Workflow Test")
    print("📅 " + time.strftime("%Y-%m-%d %H:%M:%S"))
    print()
    
    if check_prerequisites():
        test_workflow()
    else:
        print("\n❌ Prerequisites not met. Please start the PyMuPDF server first.")
        sys.exit(1)