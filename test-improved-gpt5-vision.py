#!/usr/bin/env python3
"""
Improved GPT-5 Vision Test with Multi-Pass Analysis
Implements the comprehensive improvement plan from ANALYSIS_IMPROVEMENT_PLAN.md
"""

import os
import sys
import json
import time
import hashlib
import requests
from pathlib import Path
import base64
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import uuid

class ImprovedGPT5VisionAnalyzer:
    """Multi-pass credit report analyzer with validation and persistence"""
    
    def __init__(self, backend_url: str = "http://localhost:5175", output_dir: str = "improved_test_outputs"):
        self.backend_url = backend_url
        self.output_dir = output_dir
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.document_id = None
        self.artifacts = {}
        self.timings = {}
        self.costs = {
            'inputTokens': 0,
            'outputTokens': 0,
            'imageTokens': 0,
            'totalUSD': 0.0
        }
        
        # Create output directory
        Path(output_dir).mkdir(exist_ok=True)
    
    def run_analysis(self, pdf_path: str) -> bool:
        """Main entry point for multi-pass analysis"""
        print("🚀 Starting Improved GPT-5 Vision Analysis")
        print("=" * 60)
        
        # Phase 0: Preflight checks
        if not self._preflight_checks(pdf_path):
            return False
        
        # Generate document ID
        self._generate_document_id(pdf_path)
        
        # Phase 1: Extract text with coordinates
        text_data = self._extract_text_coordinates(pdf_path)
        if not text_data:
            return False
        
        # Phase 2: Convert to images for vision
        image_data = self._extract_images(pdf_path)
        if not image_data:
            return False
        
        # Phase 3: Dynamic chunking
        chunks = self._create_dynamic_chunks(text_data, image_data)
        
        # Phase 4: Multi-pass vision analysis
        vision_findings = self._perform_vision_analysis(chunks, text_data)
        
        # Phase 5: Normalize and validate
        validated_issues = self._normalize_and_validate(vision_findings, text_data, image_data)
        
        # Phase 6: Create highlighted PDF
        highlighted_pdf = self._create_highlighted_pdf(pdf_path, validated_issues)
        
        # Phase 7: Save all artifacts
        self._save_artifacts()
        
        # Final report
        self._print_final_report(validated_issues)
        
        return len(validated_issues) > 0
    
    def _preflight_checks(self, pdf_path: str) -> bool:
        """Perform all preflight checks"""
        print("\n0️⃣ Preflight Checks...")
        
        # Check PyMuPDF server health
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=2)
            if response.status_code == 200:
                print(f"✅ PyMuPDF server healthy at {self.backend_url}")
            else:
                print(f"❌ PyMuPDF server unhealthy: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ PyMuPDF server unreachable at {self.backend_url}")
            print(f"   Error: {e}")
            print("   Please start: python3 pymupdf_highlight_server.py")
            return False
        
        # Check OpenAI API key
        if not self.api_key:
            print("❌ Missing OPENAI_API_KEY environment variable")
            print("   Set: export OPENAI_API_KEY='your-key-here'")
            return False
        print(f"✅ OpenAI API key found: {self.api_key[:7]}...{self.api_key[-4:]}")
        
        # Check PDF exists
        if not os.path.exists(pdf_path):
            print(f"❌ PDF not found: {pdf_path}")
            return False
        
        pdf_size = os.path.getsize(pdf_path) / (1024 * 1024)
        print(f"✅ PDF found: {pdf_path} ({pdf_size:.2f} MB)")
        
        return True
    
    def _generate_document_id(self, pdf_path: str):
        """Generate stable document ID from PDF content hash"""
        with open(pdf_path, 'rb') as f:
            pdf_hash = hashlib.sha256(f.read()).hexdigest()[:16]
        self.document_id = pdf_hash
        print(f"📄 Document ID: {self.document_id}")
    
    def _extract_text_coordinates(self, pdf_path: str) -> Dict:
        """Pass 1: Extract text with precise coordinates"""
        print("\n1️⃣ Pass 1: Extracting Text with Coordinates...")
        start_time = time.time()
        
        try:
            with open(pdf_path, 'rb') as f:
                files = {'pdf': (os.path.basename(pdf_path), f, 'application/pdf')}
                response = requests.post(
                    f"{self.backend_url}/extract-text-coordinates",
                    files=files,
                    timeout=30
                )
            
            if response.status_code != 200:
                print(f"❌ Text extraction failed: {response.status_code}")
                return None
            
            data = response.json()
            
            # Process and structure the text data
            text_extraction = {
                'schemaVersion': '1.0.0',
                'documentId': self.document_id,
                'pages': [],
                'createdAt': datetime.now().isoformat()
            }
            
            for page in data.get('textTokens', []):
                page_num = page.get('page', 1)
                
                # Group tokens by page
                if page_num > len(text_extraction['pages']):
                    text_extraction['pages'].append({
                        'pageNumber': page_num,
                        'widthPoints': 612,  # Standard letter size
                        'heightPoints': 792,
                        'tokens': [],
                        'labels': []
                    })
                
                # Add token with coordinates in points
                text_extraction['pages'][page_num - 1]['tokens'].append({
                    'text': page.get('text', ''),
                    'x': page.get('x', 0),
                    'y': page.get('y', 0),
                    'width': page.get('width', 0),
                    'height': page.get('height', 0),
                    'fontName': page.get('fontName', ''),
                    'fontSize': page.get('fontSize', 0)
                })
                
                # Extract labels (headers, account names, etc.)
                text = page.get('text', '').strip()
                if any(keyword in text.upper() for keyword in 
                       ['ACCOUNT', 'PAYMENT', 'BALANCE', 'CREDIT', 'HISTORY']):
                    if text not in text_extraction['pages'][page_num - 1]['labels']:
                        text_extraction['pages'][page_num - 1]['labels'].append(text)
            
            self.timings['textMs'] = int((time.time() - start_time) * 1000)
            self.artifacts['text_extraction'] = text_extraction
            
            # Save text extraction artifact
            artifact_path = f"{self.output_dir}/text_extraction.json"
            with open(artifact_path, 'w') as f:
                json.dump(text_extraction, f, indent=2)
            
            print(f"✅ Extracted text from {len(text_extraction['pages'])} pages")
            print(f"   Total tokens: {sum(len(p['tokens']) for p in text_extraction['pages'])}")
            print(f"   Time: {self.timings['textMs']}ms")
            
            return text_extraction
            
        except Exception as e:
            print(f"❌ Text extraction error: {e}")
            return None
    
    def _extract_images(self, pdf_path: str) -> Dict:
        """Pass 2: Extract images for vision analysis"""
        print("\n2️⃣ Pass 2: Extracting Images for Vision...")
        start_time = time.time()
        
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
            
            if response.status_code != 200:
                print(f"❌ Image extraction failed: {response.status_code}")
                return None
            
            data = response.json()
            images = data.get('images', [])
            
            # Create image metadata
            page_images_meta = {
                'schemaVersion': '1.0.0',
                'documentId': self.document_id,
                'pages': []
            }
            
            for img in images:
                page_images_meta['pages'].append({
                    'pageNumber': img.get('pageNumber', 1),
                    'imageWidthPx': img.get('width', 0),
                    'imageHeightPx': img.get('height', 0),
                    'dpi': img.get('dpi', 300)
                })
                
                # Save sample images for first 3 pages
                if img.get('pageNumber', 0) <= 3:
                    img_bytes = base64.b64decode(img['imageData'])
                    img_path = f"{self.output_dir}/page_{img['pageNumber']}.png"
                    with open(img_path, 'wb') as img_file:
                        img_file.write(img_bytes)
            
            self.timings['imagesMs'] = int((time.time() - start_time) * 1000)
            self.artifacts['page_images_meta'] = page_images_meta
            
            # Save metadata
            with open(f"{self.output_dir}/page_images_meta.json", 'w') as f:
                json.dump(page_images_meta, f, indent=2)
            
            print(f"✅ Extracted {len(images)} page images")
            print(f"   Resolution: 300 DPI")
            print(f"   Time: {self.timings['imagesMs']}ms")
            
            return {'images': images, 'metadata': page_images_meta}
            
        except Exception as e:
            print(f"❌ Image extraction error: {e}")
            return None
    
    def _create_dynamic_chunks(self, text_data: Dict, image_data: Dict) -> List[Dict]:
        """Create smart chunks with token budgeting"""
        print("\n3️⃣ Creating Dynamic Chunks...")
        
        chunks = []
        images = image_data['images']
        pages = text_data['pages']
        
        # Token budget per chunk
        target_tokens = 8000
        hard_max_tokens = 12000
        tokens_per_image = 1200  # Conservative estimate for high-detail images
        
        current_chunk = {
            'chunkIndex': 0,
            'pages': [],
            'images': [],
            'textContent': '',
            'labels': [],
            'estimatedTokens': 0
        }
        
        for i, page in enumerate(pages):
            # Estimate tokens for this page
            text_tokens = sum(len(token['text']) for token in page['tokens']) // 4
            image_tokens = tokens_per_image if i < len(images) else 0
            page_tokens = text_tokens + image_tokens
            
            # Check if adding this page would exceed budget
            if (current_chunk['estimatedTokens'] + page_tokens > target_tokens and 
                len(current_chunk['pages']) > 0):
                # Save current chunk and start new one
                chunks.append(current_chunk)
                current_chunk = {
                    'chunkIndex': len(chunks),
                    'pages': [],
                    'images': [],
                    'textContent': '',
                    'labels': [],
                    'estimatedTokens': 0
                }
            
            # Add page to current chunk
            current_chunk['pages'].append(page['pageNumber'])
            current_chunk['labels'].extend(page['labels'][:5])  # Top 5 labels
            current_chunk['textContent'] += f"\nPage {page['pageNumber']}:\n"
            current_chunk['textContent'] += ' '.join(t['text'] for t in page['tokens'][:100])
            
            if i < len(images):
                current_chunk['images'].append(images[i])
            
            current_chunk['estimatedTokens'] += page_tokens
        
        # Add final chunk
        if current_chunk['pages']:
            chunks.append(current_chunk)
        
        print(f"✅ Created {len(chunks)} chunks")
        for chunk in chunks:
            pages_str = f"{chunk['pages'][0]}-{chunk['pages'][-1]}" if len(chunk['pages']) > 1 else str(chunk['pages'][0])
            print(f"   Chunk {chunk['chunkIndex']}: Pages {pages_str}, ~{chunk['estimatedTokens']} tokens")
        
        return chunks
    
    def _perform_vision_analysis(self, chunks: List[Dict], text_data: Dict) -> Dict:
        """Pass 3: Vision analysis with enhanced prompting"""
        print("\n4️⃣ Pass 3: Vision Analysis with GPT-5...")
        start_time = time.time()
        
        vision_findings_raw = {
            'schemaVersion': '1.0.0',
            'documentId': self.document_id,
            'chunks': []
        }
        
        all_issues = []
        context_summary = ""
        
        for chunk in chunks:
            print(f"\n📊 Analyzing chunk {chunk['chunkIndex'] + 1}/{len(chunks)}...")
            
            # Build enhanced prompt
            prompt = self._build_enhanced_prompt(chunk, context_summary, text_data)
            
            # Prepare messages for GPT-5
            messages = self._prepare_vision_messages(chunk, prompt)
            
            try:
                # Call GPT-5 Vision API
                response_text = self._call_gpt5_vision(messages)
                
                # Parse response
                try:
                    parsed = json.loads(response_text)
                    issues = parsed.get('issues', [])
                    context_summary = parsed.get('contextSummary', '')
                    
                    # Add to raw findings
                    vision_findings_raw['chunks'].append({
                        'chunkIndex': chunk['chunkIndex'],
                        'pages': chunk['pages'],
                        'requestMeta': {
                            'estimatedTokens': chunk['estimatedTokens'],
                            'images': len(chunk['images'])
                        },
                        'responseRaw': response_text,
                        'parsedOk': True,
                        'error': None
                    })
                    
                    all_issues.extend(issues)
                    print(f"   ✅ Found {len(issues)} issues in chunk")
                    
                except json.JSONDecodeError as e:
                    print(f"   ⚠️ Failed to parse response: {e}")
                    vision_findings_raw['chunks'].append({
                        'chunkIndex': chunk['chunkIndex'],
                        'pages': chunk['pages'],
                        'responseRaw': response_text[:500],
                        'parsedOk': False,
                        'error': str(e)
                    })
                    
            except Exception as e:
                print(f"   ❌ Vision analysis failed: {e}")
                continue
        
        self.timings['visionMs'] = int((time.time() - start_time) * 1000)
        self.artifacts['vision_findings_raw'] = vision_findings_raw
        
        # Save raw findings
        with open(f"{self.output_dir}/vision_findings_raw.json", 'w') as f:
            json.dump(vision_findings_raw, f, indent=2)
        
        print(f"\n✅ Vision analysis complete")
        print(f"   Total issues found: {len(all_issues)}")
        print(f"   Time: {self.timings['visionMs']}ms")
        
        return {'issues': all_issues, 'raw': vision_findings_raw}
    
    def _build_enhanced_prompt(self, chunk: Dict, context: str, text_data: Dict) -> str:
        """Build enhanced prompt with strict schema"""
        pages_str = f"{chunk['pages'][0]}-{chunk['pages'][-1]}" if len(chunk['pages']) > 1 else str(chunk['pages'][0])
        
        prompt = f"""You are an expert credit report analyst. Analyze pages {pages_str} of this credit report.

{f'Previous context: {context}' if context else ''}

CRITICAL: Look for these SPECIFIC credit report issues:

1. TRUNCATED ACCOUNT NUMBERS (VIOLATION):
   - Any account showing only last 4 digits (XXXX1234, ****1234, etc.)
   - Missing or incomplete account numbers
   - This is a FCRA violation that must be highlighted

2. EMPTY PAYMENT HISTORY CELLS:
   - Empty cells in payment history grids
   - Missing OK, 30, 60, 90, 120 day markers
   - Blank spaces where payment data should exist

3. MISSING CRITICAL DATA:
   - Missing creditor names or contact info
   - Missing account opening/closing dates
   - Missing balance amounts or credit limits
   - Missing payment amounts or due dates

4. DATA QUALITY ISSUES:
   - Incomplete addresses
   - Partial dates (missing month/year)
   - Truncated text that appears cut off

Page Labels for Reference: {', '.join(chunk['labels'][:10])}

IMPORTANT INSTRUCTIONS:
- Measure coordinates in PIXELS from top-left corner
- Only report issues you can SEE in the image
- Every issue MUST have exact pixel coordinates
- Focus on legally significant missing information

Return ONLY valid JSON in this exact format:
{{
  "issues": [
    {{
      "id": "unique-uuid-here",
      "type": "critical",
      "category": "FCRA_violation",
      "severity": "high",
      "pageNumber": {chunk['pages'][0]},
      "coordinates": {{"x": 100, "y": 200, "width": 150, "height": 25}},
      "description": "Account number truncated - showing only last 4 digits (****1234)",
      "anchorText": "Account #: ****1234",
      "recommendedAction": "Request full account number from creditor"
    }}
  ],
  "contextSummary": "Brief summary of findings for next chunk"
}}

ONLY return the JSON. No other text."""
        
        return prompt
    
    def _prepare_vision_messages(self, chunk: Dict, prompt: str) -> List[Dict]:
        """Prepare messages for GPT-5 vision API"""
        content = [{'type': 'text', 'text': prompt}]
        
        # Add labeled images
        for img in chunk['images']:
            # Add page label
            content.append({
                'type': 'text',
                'text': f"Image page {img['pageNumber']}, {img.get('width', 0)}x{img.get('height', 0)} pixels at {img.get('dpi', 300)} DPI"
            })
            
            # Add image
            content.append({
                'type': 'image_url',
                'image_url': {
                    'url': f"data:{img['mimeType']};base64,{img['imageData']}",
                    'detail': 'high'
                }
            })
        
        return [
            {
                'role': 'system',
                'content': 'You are an expert credit report analyst. Always return valid JSON only.'
            },
            {
                'role': 'user',
                'content': content
            }
        ]
    
    def _call_gpt5_vision(self, messages: List[Dict]) -> str:
        """Call GPT-5 Vision API"""
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'gpt-5',
            'messages': messages,
            'max_completion_tokens': 4000,
            'temperature': 0.1
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code != 200:
            raise Exception(f"GPT-5 API error: {response.status_code} - {response.text[:200]}")
        
        data = response.json()
        
        # Track costs (rough estimates)
        usage = data.get('usage', {})
        self.costs['inputTokens'] += usage.get('prompt_tokens', 0)
        self.costs['outputTokens'] += usage.get('completion_tokens', 0)
        
        return data['choices'][0]['message']['content']
    
    def _normalize_and_validate(self, vision_findings: Dict, text_data: Dict, image_data: Dict) -> List[Dict]:
        """Pass 4: Normalize coordinates and validate findings"""
        print("\n5️⃣ Pass 4: Normalization and Validation...")
        start_time = time.time()
        
        issues = vision_findings['issues']
        page_meta = image_data['metadata']['pages']
        
        normalized_issues = []
        validated_issues = []
        
        # Step 1: Normalize pixel coordinates to points
        for issue in issues:
            page_num = issue.get('pageNumber', 1)
            meta = next((p for p in page_meta if p['pageNumber'] == page_num), None)
            
            if not meta:
                print(f"   ⚠️ Skipping issue - no page meta for page {page_num}")
                continue
            
            # Convert pixels to points (72 DPI base)
            coords = issue.get('coordinates', {})
            if not all(k in coords for k in ['x', 'y', 'width', 'height']):
                print(f"   ⚠️ Skipping issue - invalid coordinates")
                continue
            
            dpi = meta.get('dpi', 300)
            factor = 72.0 / dpi
            
            normalized = {
                **issue,
                'id': issue.get('id', str(uuid.uuid4())),
                'rects': [{
                    'x': coords['x'] * factor,
                    'y': coords['y'] * factor,
                    'width': coords['width'] * factor,
                    'height': coords['height'] * factor,
                    'units': 'points'
                }],
                'source': 'vision',
                'mappingMethod': 'vision_detection',
                'mappingConfidence': issue.get('mappingConfidence', 0.85)
            }
            
            # Remove pixel coordinates
            if 'coordinates' in normalized:
                del normalized['coordinates']
            
            normalized_issues.append(normalized)
        
        # Step 2: Validation gates
        for issue in normalized_issues:
            validation = {
                'inBounds': True,
                'intersectsTokens': False,
                'tokenCount': 0
            }
            
            # Bounds check
            rect = issue['rects'][0]
            if rect['x'] < 0 or rect['y'] < 0 or rect['x'] + rect['width'] > 612 or rect['y'] + rect['height'] > 792:
                validation['inBounds'] = False
            
            # Token intersection check
            page_num = issue.get('pageNumber', 1)
            page_tokens = next((p['tokens'] for p in text_data['pages'] if p['pageNumber'] == page_num), [])
            
            for token in page_tokens:
                # Check if rect intersects with token
                if (rect['x'] < token['x'] + token['width'] and
                    rect['x'] + rect['width'] > token['x'] and
                    rect['y'] < token['y'] + token['height'] and
                    rect['y'] + rect['height'] > token['y']):
                    validation['intersectsTokens'] = True
                    validation['tokenCount'] += 1
            
            issue['validation'] = validation
            
            # Only keep validated issues
            if validation['inBounds'] and (validation['intersectsTokens'] or issue.get('type') == 'critical'):
                validated_issues.append(issue)
            else:
                print(f"   ⚠️ Filtered out: {issue.get('description', 'Unknown')[:50]}")
        
        # Step 3: Deduplication
        seen = set()
        deduped = []
        for issue in validated_issues:
            rect = issue['rects'][0]
            # Create hash based on page, category, and approximate location
            hash_key = (
                issue.get('pageNumber'),
                issue.get('category'),
                round(rect['x'] / 10) * 10,
                round(rect['y'] / 10) * 10
            )
            if hash_key not in seen:
                seen.add(hash_key)
                deduped.append(issue)
        
        self.timings['validateMs'] = int((time.time() - start_time) * 1000)
        
        # Save normalized and validated issues
        vision_normalized = {
            'schemaVersion': '1.0.0',
            'documentId': self.document_id,
            'pageMeta': page_meta,
            'issues': normalized_issues
        }
        
        validated_data = {
            'schemaVersion': '1.0.0',
            'documentId': self.document_id,
            'issues': deduped,
            'stats': {
                'total': len(issues),
                'normalized': len(normalized_issues),
                'validated': len(validated_issues),
                'deduped': len(deduped)
            }
        }
        
        self.artifacts['vision_findings_normalized'] = vision_normalized
        self.artifacts['validated_issues'] = validated_data
        
        with open(f"{self.output_dir}/vision_findings_normalized.json", 'w') as f:
            json.dump(vision_normalized, f, indent=2)
        
        with open(f"{self.output_dir}/validated_issues.json", 'w') as f:
            json.dump(validated_data, f, indent=2)
        
        print(f"✅ Validation complete")
        print(f"   Input issues: {len(issues)}")
        print(f"   Normalized: {len(normalized_issues)}")
        print(f"   Validated: {len(validated_issues)}")
        print(f"   After dedup: {len(deduped)}")
        print(f"   Time: {self.timings['validateMs']}ms")
        
        return deduped
    
    def _create_highlighted_pdf(self, pdf_path: str, validated_issues: List[Dict]) -> bool:
        """Create highlighted PDF with validated issues"""
        print("\n6️⃣ Creating Highlighted PDF...")
        
        if not validated_issues:
            print("   ⚠️ No issues to highlight")
            return False
        
        # Convert to PyMuPDF format
        highlights_payload = []
        for issue in validated_issues:
            rect = issue['rects'][0]
            highlights_payload.append({
                'id': issue.get('id'),
                'type': issue.get('type', 'warning'),
                'description': issue.get('description', ''),
                'pageNumber': issue.get('pageNumber', 1),
                'coordinates': {
                    'x': rect['x'],
                    'y': rect['y'],
                    'width': rect['width'],
                    'height': rect['height']
                }
            })
        
        # Save payload
        with open(f"{self.output_dir}/highlights_payload.json", 'w') as f:
            json.dump({'issues': highlights_payload}, f, indent=2)
        
        try:
            # Send to PyMuPDF server
            with open(pdf_path, 'rb') as f:
                files = {'pdf': (os.path.basename(pdf_path), f, 'application/pdf')}
                data = {'issues': json.dumps(highlights_payload)}
                
                response = requests.post(
                    f"{self.backend_url}/highlight-pdf",
                    files=files,
                    data=data,
                    timeout=30
                )
            
            if response.status_code == 200:
                output_path = f"{self.output_dir}/highlighted_result.pdf"
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                
                print(f"✅ Highlighted PDF created: {output_path}")
                
                # Open the PDF
                os.system(f"open '{output_path}'")
                return True
            else:
                print(f"❌ Highlighting failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Highlighting error: {e}")
            return False
    
    def _save_artifacts(self):
        """Save consolidated run artifact"""
        print("\n7️⃣ Saving Artifacts...")
        
        # Calculate costs
        self.costs['totalUSD'] = (
            self.costs['inputTokens'] * 0.015 / 1000 +  # GPT-5 input pricing
            self.costs['outputTokens'] * 0.075 / 1000 +  # GPT-5 output pricing
            self.costs['imageTokens'] * 0.01 / 1000      # Image token pricing
        )
        
        run_artifact = {
            'schemaVersion': '1.0.0',
            'documentId': self.document_id,
            'pagesAnalyzed': len(self.artifacts.get('text_extraction', {}).get('pages', [])),
            'textExtractionPath': 'text_extraction.json',
            'pageImagesMetaPath': 'page_images_meta.json',
            'visionRawPath': 'vision_findings_raw.json',
            'visionNormalizedPath': 'vision_findings_normalized.json',
            'validatedIssuesPath': 'validated_issues.json',
            'highlightsPayloadPath': 'highlights_payload.json',
            'costs': self.costs,
            'timings': self.timings,
            'createdAt': datetime.now().isoformat(),
            'version': {
                'frontend': 'N/A',
                'server': 'pymupdf_highlight_server.py',
                'schemas': '1.0.0'
            }
        }
        
        with open(f"{self.output_dir}/run_artifact.json", 'w') as f:
            json.dump(run_artifact, f, indent=2)
        
        print(f"✅ All artifacts saved to {self.output_dir}/")
    
    def _print_final_report(self, validated_issues: List[Dict]):
        """Print final analysis report"""
        print("\n" + "=" * 60)
        print("🎯 IMPROVED GPT-5 VISION ANALYSIS COMPLETE")
        print("=" * 60)
        
        # Categorize issues
        critical = [i for i in validated_issues if i.get('type') == 'critical']
        fcra_violations = [i for i in validated_issues if i.get('category') == 'FCRA_violation']
        truncated_accounts = [i for i in validated_issues if 'truncated' in i.get('description', '').lower()]
        empty_cells = [i for i in validated_issues if 'empty' in i.get('description', '').lower()]
        
        print(f"\n📊 Results Summary:")
        print(f"   Total validated issues: {len(validated_issues)}")
        print(f"   Critical issues: {len(critical)}")
        print(f"   FCRA violations: {len(fcra_violations)}")
        print(f"   Truncated account numbers: {len(truncated_accounts)}")
        print(f"   Empty payment cells: {len(empty_cells)}")
        
        print(f"\n💰 Cost Analysis:")
        print(f"   Input tokens: {self.costs['inputTokens']:,}")
        print(f"   Output tokens: {self.costs['outputTokens']:,}")
        print(f"   Total cost: ${self.costs['totalUSD']:.3f}")
        
        print(f"\n⏱️ Performance:")
        total_time = sum(self.timings.values())
        print(f"   Text extraction: {self.timings.get('textMs', 0):,}ms")
        print(f"   Image extraction: {self.timings.get('imagesMs', 0):,}ms")
        print(f"   Vision analysis: {self.timings.get('visionMs', 0):,}ms")
        print(f"   Validation: {self.timings.get('validateMs', 0):,}ms")
        print(f"   Total time: {total_time:,}ms ({total_time/1000:.1f}s)")
        
        print(f"\n📁 Artifacts saved to: {self.output_dir}/")
        print("   - text_extraction.json")
        print("   - page_images_meta.json")
        print("   - vision_findings_raw.json")
        print("   - vision_findings_normalized.json")
        print("   - validated_issues.json")
        print("   - highlights_payload.json")
        print("   - run_artifact.json")
        print("   - highlighted_result.pdf")
        
        if len(validated_issues) > 0:
            print("\n✅ SUCCESS: Analysis found and validated issues")
        else:
            print("\n❌ WARNING: No issues found - check prompts and thresholds")


def main():
    """Main entry point"""
    print("🔧 Improved GPT-5 Vision Credit Report Analyzer")
    print("📋 Implements comprehensive multi-pass analysis")
    print("-" * 60)
    
    # Check for API key
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ Please set OPENAI_API_KEY environment variable")
        print("   export OPENAI_API_KEY='your-key-here'")
        sys.exit(1)
    
    # Default test PDF
    test_pdf = "src/sample_equifax_report.pdf"
    if len(sys.argv) > 1:
        test_pdf = sys.argv[1]
    
    # Run analysis
    analyzer = ImprovedGPT5VisionAnalyzer()
    success = analyzer.run_analysis(test_pdf)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()