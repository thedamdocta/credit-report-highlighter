#!/usr/bin/env python3
"""
Iterative GPT-5 Vision Test - Scans for one issue type at a time
This approach is more focused and thorough than trying to find everything at once
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
import base64
from typing import Dict, List, Any
import uuid

class IterativeGPT5Analyzer:
    """Iterative analyzer that looks for one issue type at a time"""
    
    def __init__(self, backend_url: str = "http://localhost:5175", output_dir: str = "iterative_test_outputs"):
        self.backend_url = backend_url
        self.output_dir = output_dir
        self.api_key = os.getenv('OPENAI_API_KEY')
        Path(output_dir).mkdir(exist_ok=True)
        
        # Define issue types to scan for, one at a time
        self.issue_types = [
            {
                "name": "Truncated Account Numbers",
                "priority": "critical",
                "prompt": """Look ONLY for account numbers that are masked or truncated.
                
FIND THESE PATTERNS:
- XXXX-XXXX-XXXX-1234
- ****1234
- ...1234
- Any account number showing only last 4 digits
- Partially hidden account numbers

This is an FCRA violation. Mark EVERY instance you find."""
            },
            {
                "name": "Late Payments",
                "priority": "high",
                "prompt": """Look ONLY at payment history grids and tables.
                
FIND AND HIGHLIGHT:
- Any "30" (30 days late)
- Any "60" (60 days late)
- Any "90" (90 days late)
- Any "120" (120 days late)
- Any "150" or "180"
- Any "CO" (charge-off)
- Any "C" or "COL" (collection)
- ANY marker that isn't "OK" or blank

Highlight the EXACT cell containing the late payment marker."""
            },
            {
                "name": "Empty Payment Cells",
                "priority": "high",
                "prompt": """Look ONLY for empty/missing cells in payment history tables.
                
FIND:
- Blank cells in payment grids
- Missing payment data
- Cells that should have OK/30/60/90 but are empty
- Gaps in payment history timeline

Mark EVERY empty cell in payment tables."""
            },
            {
                "name": "Collection Accounts",
                "priority": "high",
                "prompt": """Look ONLY for collection accounts and related items.
                
FIND:
- Any account with "Collection" in the name
- "In Collections" status
- Collection agency names
- "Charged Off" status
- Any "CO" or "COL" markers
- Third-party collection companies

Highlight the entire account entry."""
            },
            {
                "name": "High Credit Utilization",
                "priority": "medium",
                "prompt": """Look ONLY at credit card/revolving accounts.
                
CALCULATE AND FIND:
- Balance ÷ Credit Limit > 30%
- Over-limit accounts (balance > limit)
- Maxed out cards (balance = limit)
- High balances relative to limit

Highlight accounts with utilization over 30%."""
            },
            {
                "name": "Missing Information",
                "priority": "medium",
                "prompt": """Look ONLY for missing or incomplete data fields.
                
FIND:
- Fields showing "N/A"
- Fields showing just "-" or "--"
- Blank fields that should have data
- "Not Reported" text
- Missing dates
- Incomplete addresses
- Missing account details

Mark every instance of missing data."""
            },
            {
                "name": "Inquiries",
                "priority": "low",
                "prompt": """Look ONLY at the inquiries section.
                
FIND:
- Hard inquiries
- Multiple inquiries for same purpose
- Inquiries older than 2 years
- Unauthorized inquiries
- Creditor names in inquiry list

Highlight each inquiry entry."""
            },
            {
                "name": "Disputed Items",
                "priority": "medium",
                "prompt": """Look ONLY for disputed items.
                
FIND:
- "Consumer disputes this account" text
- "Disputed" markers
- "Under investigation"
- Dispute comments
- Any dispute-related notation

Highlight the disputed account or notation."""
            },
            {
                "name": "Old Accounts",
                "priority": "low",
                "prompt": """Look ONLY at account dates.
                
FIND:
- Accounts opened more than 7 years ago with negative info
- Closed accounts older than 10 years
- Very old inquiries (>2 years)
- Outdated information

Calculate: Current Year - Account Open Date
Highlight if > 7 years with negative marks."""
            },
            {
                "name": "Duplicate Accounts",
                "priority": "medium",
                "prompt": """Look for the SAME account listed multiple times.
                
FIND:
- Same creditor name appearing twice
- Same account number (even if partially masked)
- Duplicate balances and dates
- Same account in different sections

Highlight all instances of duplicates."""
            }
        ]
    
    def run_iterative_analysis(self, pdf_path: str) -> bool:
        """Run iterative analysis - one issue type at a time"""
        print("🔄 Starting Iterative GPT-5 Vision Analysis")
        print("=" * 60)
        
        # Preflight checks
        if not self._check_prerequisites(pdf_path):
            return False
        
        # Extract images once
        print("\n📸 Extracting PDF images...")
        images = self._extract_images(pdf_path)
        if not images:
            print("❌ Failed to extract images")
            return False
        
        print(f"✅ Extracted {len(images)} page images")
        
        # Collect all issues across all passes
        all_issues = []
        issue_counts = {}
        
        # Iterate through each issue type
        for issue_type in self.issue_types:
            print(f"\n🔍 Pass {self.issue_types.index(issue_type) + 1}/{len(self.issue_types)}: Scanning for {issue_type['name']}...")
            
            issues_found = self._scan_for_issue_type(images, issue_type)
            
            if issues_found:
                all_issues.extend(issues_found)
                issue_counts[issue_type['name']] = len(issues_found)
                print(f"   ✅ Found {len(issues_found)} instances of {issue_type['name']}")
            else:
                print(f"   ⚪ No {issue_type['name']} found")
            
            # Small delay between passes to avoid rate limiting
            time.sleep(1)
        
        # Save results
        print(f"\n📊 Analysis Complete!")
        print(f"   Total issues found: {len(all_issues)}")
        for issue_type, count in issue_counts.items():
            print(f"   - {issue_type}: {count}")
        
        # Save all issues to JSON
        results = {
            "totalIssues": len(all_issues),
            "issuesByType": issue_counts,
            "issues": all_issues,
            "pagesAnalyzed": len(images),
            "method": "Iterative GPT-5 Vision Analysis"
        }
        
        with open(f"{self.output_dir}/iterative_analysis_results.json", 'w') as f:
            json.dump(results, f, indent=2)
        
        # Create highlighted PDF if issues found
        if all_issues:
            self._create_highlighted_pdf(pdf_path, all_issues)
        
        return len(all_issues) > 0
    
    def _scan_for_issue_type(self, images: List[Dict], issue_type: Dict) -> List[Dict]:
        """Scan all pages for a specific issue type"""
        issues = []
        
        # Process each page
        for page_image in images:
            page_num = page_image['pageNumber']
            
            # Create focused prompt for this specific issue type
            prompt = f"""You are analyzing page {page_num} of a credit report.

FOCUS ONLY ON THIS TASK:
{issue_type['prompt']}

IMPORTANT:
- Look ONLY for this specific issue type
- Ignore all other issues for now
- Be thorough - check every part of the page
- Provide exact pixel coordinates for each finding

Return ONLY valid JSON:
{{
  "issues": [
    {{
      "id": "unique-id",
      "type": "{issue_type['priority']}",
      "category": "{issue_type['name'].replace(' ', '_').lower()}",
      "description": "What you found",
      "pageNumber": {page_num},
      "coordinates": {{"x": 100, "y": 200, "width": 150, "height": 25}},
      "anchorText": "text at location"
    }}
  ]
}}

If you find nothing, return: {{"issues": []}}"""
            
            try:
                # Call GPT-5 Vision for this page and issue type
                response = self._call_gpt5_vision(page_image, prompt)
                
                # Parse response
                try:
                    data = json.loads(response)
                    page_issues = data.get('issues', [])
                    
                    # Add issue type metadata
                    for issue in page_issues:
                        issue['issueType'] = issue_type['name']
                        issue['scanPass'] = self.issue_types.index(issue_type) + 1
                        if 'id' not in issue or not issue['id']:
                            issue['id'] = str(uuid.uuid4())
                    
                    issues.extend(page_issues)
                    
                except json.JSONDecodeError:
                    print(f"      ⚠️ Failed to parse response for page {page_num}")
                    
            except Exception as e:
                print(f"      ❌ Error scanning page {page_num}: {e}")
        
        return issues
    
    def _call_gpt5_vision(self, page_image: Dict, prompt: str) -> str:
        """Call GPT-5 Vision API for a single page and issue type"""
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        # Prepare message with image
        messages = [
            {
                "role": "system",
                "content": "You are a credit report analyst. Return only valid JSON."
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{page_image['mimeType']};base64,{page_image['imageData']}",
                            "detail": "high"
                        }
                    }
                ]
            }
        ]
        
        payload = {
            "model": "gpt-5",
            "messages": messages,
            "max_completion_tokens": 2000,
            "temperature": 0.1
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()['choices'][0]['message']['content']
        else:
            raise Exception(f"GPT-5 API error: {response.status_code}")
    
    def _check_prerequisites(self, pdf_path: str) -> bool:
        """Check all prerequisites"""
        # Check PyMuPDF server
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=2)
            if response.status_code != 200:
                print("❌ PyMuPDF server not healthy")
                return False
        except:
            print("❌ PyMuPDF server not running")
            print("   Start with: python3 pymupdf_highlight_server.py")
            return False
        
        # Check API key
        if not self.api_key:
            print("❌ Missing OPENAI_API_KEY")
            return False
        
        # Check PDF exists
        if not os.path.exists(pdf_path):
            print(f"❌ PDF not found: {pdf_path}")
            return False
        
        print("✅ All prerequisites met")
        return True
    
    def _extract_images(self, pdf_path: str) -> List[Dict]:
        """Extract images from PDF"""
        try:
            with open(pdf_path, 'rb') as f:
                files = {
                    'pdf': (os.path.basename(pdf_path), f, 'application/pdf'),
                    'dpi': (None, '300'),
                    'format': (None, 'PNG')
                }
                
                response = requests.post(
                    f"{self.backend_url}/convert-to-images",
                    files=files,
                    timeout=60
                )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('images', [])
            else:
                return []
                
        except Exception as e:
            print(f"❌ Image extraction error: {e}")
            return []
    
    def _create_highlighted_pdf(self, pdf_path: str, issues: List[Dict]) -> bool:
        """Create highlighted PDF with all found issues"""
        print("\n📝 Creating highlighted PDF...")
        
        # Convert to PyMuPDF format
        highlights = []
        for issue in issues:
            if 'coordinates' in issue:
                # Convert pixels to points (assuming 300 DPI images)
                coords = issue['coordinates']
                factor = 72.0 / 300.0  # Convert 300 DPI to 72 DPI (PDF points)
                
                highlights.append({
                    'id': issue.get('id'),
                    'type': issue.get('type', 'warning'),
                    'description': f"{issue.get('issueType', '')}: {issue.get('description', '')}",
                    'pageNumber': issue.get('pageNumber', 1),
                    'coordinates': {
                        'x': coords['x'] * factor,
                        'y': coords['y'] * factor,
                        'width': coords['width'] * factor,
                        'height': coords['height'] * factor
                    }
                })
        
        try:
            with open(pdf_path, 'rb') as f:
                files = {'pdf': (os.path.basename(pdf_path), f, 'application/pdf')}
                data = {'issues': json.dumps(highlights)}
                
                response = requests.post(
                    f"{self.backend_url}/highlight-pdf",
                    files=files,
                    data=data,
                    timeout=30
                )
            
            if response.status_code == 200:
                output_path = f"{self.output_dir}/iterative_highlighted.pdf"
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                
                print(f"✅ Highlighted PDF saved: {output_path}")
                
                # Open the PDF
                os.system(f"open '{output_path}'")
                return True
            else:
                print(f"❌ Highlighting failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Highlighting error: {e}")
            return False


def main():
    """Main entry point"""
    print("🔄 Iterative GPT-5 Vision Credit Report Analyzer")
    print("📋 Scans for one issue type at a time for better accuracy")
    print("-" * 60)
    
    # Check for API key
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ Please set OPENAI_API_KEY environment variable")
        sys.exit(1)
    
    # Default test PDF
    test_pdf = "src/sample_equifax_report.pdf"
    if len(sys.argv) > 1:
        test_pdf = sys.argv[1]
    
    # Run iterative analysis
    analyzer = IterativeGPT5Analyzer()
    success = analyzer.run_iterative_analysis(test_pdf)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()