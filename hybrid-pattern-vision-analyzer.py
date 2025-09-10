#!/usr/bin/env python3
"""
Hybrid Credit Report Analyzer
Combines pattern-based detection with GPT-5 vision analysis
Best of both worlds: Fast, accurate pattern matching + AI flexibility
"""

import fitz  # PyMuPDF
import re
import json
import requests
import base64
import os
from typing import List, Dict, Tuple, Any
from dataclasses import dataclass
from enum import Enum

class ErrorType(Enum):
    """Types of credit report errors"""
    COLLECTION = "collection"
    CHARGE_OFF = "charge_off"
    LATE_PAYMENT = "late_payment"
    TRUNCATED_ACCOUNT = "truncated_account"
    MISSING_DATA = "missing_data"
    HIGH_UTILIZATION = "high_utilization"
    DEROGATORY = "derogatory"
    DISPUTE = "dispute"

@dataclass
class DetectedIssue:
    """Represents a detected issue in the credit report"""
    error_type: ErrorType
    description: str
    page_num: int
    bbox: Tuple[float, float, float, float]  # x, y, width, height
    confidence: float
    method: str  # "pattern" or "vision"
    account_name: str = "Unknown"
    severity: int = 3

class HybridCreditAnalyzer:
    """Combines pattern-based and vision-based analysis"""
    
    # Pattern definitions (like their approach)
    ERROR_PATTERNS = {
        ErrorType.COLLECTION: [
            r'\bCOLLECTION\b',
            r'Collection Agency',
            r'PORTFOLIO RECOVERY',
            r'CAVALRY PORTFOLIO',
            r'Debt Buyer',
        ],
        ErrorType.CHARGE_OFF: [
            r'CHARGE[\s\-_]?OFF',
            r'Charged Off',
            r'Written Off',
        ],
        ErrorType.LATE_PAYMENT: [
            r'\b(30|60|90|120|150|180)\s*Days?\s*Past\s*Due',
            r'\b(30|60|90|120|150|180)\s*Days?\s*Late',
            r'PAST[\s\-_]?DUE',
        ],
        ErrorType.TRUNCATED_ACCOUNT: [
            r'[X\*]{4,}[\s\-]?\d{4}',  # XXXX1234 or ****1234
            r'\.{3,}\d{4}',  # ...1234
        ],
        ErrorType.HIGH_UTILIZATION: [
            r'(8[0-9]|9[0-9]|100)%?\s*Utilization',
            r'Over[\s\-]?Limit',
            r'Maxed[\s\-]?Out',
        ],
        ErrorType.DEROGATORY: [
            r'DEROGATORY',
            r'DELINQUENT',
            r'DEFAULT',
            r'REPOSSESSION',
            r'FORECLOSURE',
            r'BANKRUPTCY',
        ]
    }
    
    def __init__(self, pdf_path: str, use_gpt5: bool = True):
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)
        self.use_gpt5 = use_gpt5
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.issues = []
        self.text_map = {}  # Page -> extracted text with positions
        
    def analyze(self) -> List[DetectedIssue]:
        """Main analysis function combining both approaches"""
        print("🔍 Starting Hybrid Analysis...")
        
        # Phase 1: Fast pattern-based detection (like their approach)
        print("\n📝 Phase 1: Pattern-Based Detection...")
        pattern_issues = self._pattern_based_detection()
        print(f"   Found {len(pattern_issues)} issues via patterns")
        
        # Phase 2: GPT-5 vision for things patterns might miss
        vision_issues = []
        if self.use_gpt5 and self.api_key:
            print("\n👁️ Phase 2: GPT-5 Vision Analysis...")
            vision_issues = self._vision_based_detection()
            print(f"   Found {len(vision_issues)} issues via vision")
        
        # Phase 3: Merge and deduplicate
        print("\n🔄 Phase 3: Merging Results...")
        self.issues = self._merge_results(pattern_issues, vision_issues)
        print(f"   Total unique issues: {len(self.issues)}")
        
        return self.issues
    
    def _pattern_based_detection(self) -> List[DetectedIssue]:
        """Fast pattern-based detection (like their approach)"""
        issues = []
        
        for page_num in range(len(self.doc)):
            page = self.doc[page_num]
            
            # Extract text with positions (their method)
            blocks = page.get_text("dict")
            page_text = ""
            text_positions = []
            
            for block in blocks["blocks"]:
                if "lines" in block:
                    for line in block["lines"]:
                        line_text = ""
                        line_bbox = None
                        
                        for span in line["spans"]:
                            if line_bbox is None:
                                line_bbox = fitz.Rect(span["bbox"])
                            else:
                                line_bbox = line_bbox | fitz.Rect(span["bbox"])
                            line_text += span["text"]
                        
                        if line_text.strip():
                            page_text += line_text + " "
                            text_positions.append({
                                'text': line_text,
                                'bbox': (line_bbox.x0, line_bbox.y0, 
                                        line_bbox.width, line_bbox.height)
                            })
            
            # Store for later use
            self.text_map[page_num] = {
                'full_text': page_text,
                'positions': text_positions
            }
            
            # Search for patterns
            for error_type, patterns in self.ERROR_PATTERNS.items():
                for pattern in patterns:
                    matches = re.finditer(pattern, page_text, re.IGNORECASE)
                    
                    for match in matches:
                        # Find position of match
                        bbox = self._find_text_position(
                            match.group(), text_positions
                        )
                        
                        if bbox:
                            issues.append(DetectedIssue(
                                error_type=error_type,
                                description=f"Pattern match: {match.group()}",
                                page_num=page_num,
                                bbox=bbox,
                                confidence=0.95,  # High confidence for pattern match
                                method="pattern",
                                severity=self._calculate_severity(error_type)
                            ))
        
        return issues
    
    def _vision_based_detection(self) -> List[DetectedIssue]:
        """GPT-5 vision detection for complex issues"""
        issues = []
        
        # Convert pages to images
        for page_num in range(min(5, len(self.doc))):  # Limit to first 5 pages for cost
            page = self.doc[page_num]
            
            # Convert page to image
            pix = page.get_pixmap(dpi=150)
            img_data = pix.tobytes("png")
            img_base64 = base64.b64encode(img_data).decode()
            
            # Create focused prompt
            prompt = """Analyze this credit report page for issues that pattern matching might miss:
            
1. Visual indicators of problems (highlighting, boxes, markers)
2. Unusual formatting suggesting errors
3. Inconsistent data (dates out of order, impossible values)
4. Missing data in tables (empty cells where data should be)
5. Any visual anomalies
            
Focus on things that CANNOT be found by text search alone.
Return coordinates in pixels from top-left corner."""
            
            # Call GPT-5
            issues_from_page = self._call_gpt5_vision(img_base64, prompt, page_num)
            issues.extend(issues_from_page)
        
        return issues
    
    def _find_text_position(self, text: str, positions: List[Dict]) -> Tuple:
        """Find bounding box for text"""
        for pos in positions:
            if text in pos['text']:
                return pos['bbox']
        return None
    
    def _calculate_severity(self, error_type: ErrorType) -> int:
        """Calculate severity score"""
        severity_map = {
            ErrorType.CHARGE_OFF: 5,
            ErrorType.COLLECTION: 5,
            ErrorType.TRUNCATED_ACCOUNT: 5,  # FCRA violation
            ErrorType.LATE_PAYMENT: 3,
            ErrorType.HIGH_UTILIZATION: 2,
            ErrorType.DEROGATORY: 4,
            ErrorType.MISSING_DATA: 2,
            ErrorType.DISPUTE: 1
        }
        return severity_map.get(error_type, 3)
    
    def _call_gpt5_vision(self, img_base64: str, prompt: str, page_num: int) -> List[DetectedIssue]:
        """Call GPT-5 Vision API"""
        issues = []
        
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'model': 'gpt-5',
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {'type': 'text', 'text': prompt},
                            {
                                'type': 'image_url',
                                'image_url': {
                                    'url': f'data:image/png;base64,{img_base64}',
                                    'detail': 'high'
                                }
                            }
                        ]
                    }
                ],
                'max_completion_tokens': 1000,
                'temperature': 0.1
            }
            
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                # Parse GPT-5 response
                content = response.json()['choices'][0]['message']['content']
                # Convert response to issues (simplified)
                # In reality, would parse JSON response
                
        except Exception as e:
            print(f"GPT-5 error: {e}")
        
        return issues
    
    def _merge_results(self, pattern_issues: List, vision_issues: List) -> List[DetectedIssue]:
        """Merge and deduplicate results"""
        all_issues = pattern_issues + vision_issues
        
        # Deduplicate based on location and type
        unique = {}
        for issue in all_issues:
            # Create key based on page, approximate location, and type
            key = (
                issue.page_num,
                round(issue.bbox[0] / 10) * 10,  # Round to nearest 10 pixels
                round(issue.bbox[1] / 10) * 10,
                issue.error_type
            )
            
            if key not in unique:
                unique[key] = issue
            else:
                # Keep the one with higher confidence
                if issue.confidence > unique[key].confidence:
                    unique[key] = issue
        
        return list(unique.values())
    
    def highlight_pdf(self, output_path: str = None):
        """Apply highlights to PDF"""
        if output_path is None:
            output_path = self.pdf_path.replace('.pdf', '_highlighted.pdf')
        
        color_map = {
            ErrorType.COLLECTION: (1, 0, 0),      # Red
            ErrorType.CHARGE_OFF: (1, 0, 0),      # Red
            ErrorType.TRUNCATED_ACCOUNT: (1, 0, 1),  # Magenta (FCRA)
            ErrorType.LATE_PAYMENT: (1, 0.5, 0),  # Orange
            ErrorType.HIGH_UTILIZATION: (1, 1, 0),  # Yellow
            ErrorType.DEROGATORY: (1, 0.8, 0),    # Yellow-Orange
            ErrorType.MISSING_DATA: (0.5, 0.5, 0.5),  # Gray
            ErrorType.DISPUTE: (0, 0, 1),         # Blue
        }
        
        for issue in self.issues:
            page = self.doc[issue.page_num]
            
            # Create rectangle from bbox
            rect = fitz.Rect(
                issue.bbox[0],
                issue.bbox[1],
                issue.bbox[0] + issue.bbox[2],
                issue.bbox[1] + issue.bbox[3]
            )
            
            # Add highlight
            highlight = page.add_highlight_annot(rect)
            color = color_map.get(issue.error_type, (1, 1, 0))
            highlight.set_colors({"stroke": color})
            
            # Add comment
            highlight.set_info(
                title=f"{issue.error_type.value} ({issue.method})",
                content=f"{issue.description}\n"
                       f"Severity: {issue.severity}/5\n"
                       f"Confidence: {issue.confidence:.2f}"
            )
            
            highlight.update()
        
        self.doc.save(output_path)
        print(f"✅ Highlighted PDF saved to: {output_path}")
        
        return output_path
    
    def generate_report(self) -> Dict:
        """Generate analysis report"""
        report = {
            "total_issues": len(self.issues),
            "by_type": {},
            "by_method": {"pattern": 0, "vision": 0},
            "by_page": {},
            "high_severity": []
        }
        
        for issue in self.issues:
            # Count by type
            error_type = issue.error_type.value
            if error_type not in report["by_type"]:
                report["by_type"][error_type] = 0
            report["by_type"][error_type] += 1
            
            # Count by method
            report["by_method"][issue.method] += 1
            
            # Count by page
            page = f"Page {issue.page_num + 1}"
            if page not in report["by_page"]:
                report["by_page"][page] = 0
            report["by_page"][page] += 1
            
            # Track high severity
            if issue.severity >= 4:
                report["high_severity"].append({
                    "type": error_type,
                    "page": issue.page_num + 1,
                    "description": issue.description,
                    "method": issue.method
                })
        
        return report


# Main execution
def main():
    """Run hybrid analysis"""
    
    # Test the hybrid approach
    analyzer = HybridCreditAnalyzer(
        "src/sample_equifax_report.pdf",
        use_gpt5=True  # Set to False for pattern-only
    )
    
    # Run analysis
    issues = analyzer.analyze()
    
    # Generate highlighted PDF
    analyzer.highlight_pdf()
    
    # Generate report
    report = analyzer.generate_report()
    
    # Save report
    with open("hybrid_analysis_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print("\n📊 Final Report:")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()