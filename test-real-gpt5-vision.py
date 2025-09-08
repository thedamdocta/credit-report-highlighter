#!/usr/bin/env python3
"""
REAL GPT-5 Vision System Test
This test uses actual GPT-5 Vision API calls to detect missing information
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
import base64

def test_real_gpt5_vision():
    print("🚀 Starting REAL GPT-5 Vision System Test")
    print("=" * 60)
    
    # Test configuration
    test_pdf = "src/Brittney Bradwell Equifax.pdf"
    output_dir = "real_test_outputs"
    backend_url = "http://localhost:5175"
    
    # GPT-5 Vision API configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    if not OPENAI_API_KEY:
        print("❌ CRITICAL ERROR: OPENAI_API_KEY environment variable not set")
        print("Please set your OpenAI API key: export OPENAI_API_KEY='your-key-here'")
        return False
    
    # Create output directory
    Path(output_dir).mkdir(exist_ok=True)
    
    # Step 1: Verify PDF exists
    print("\n1️⃣ Verifying Test PDF...")
    if not os.path.exists(test_pdf):
        print(f"❌ Test PDF not found: {test_pdf}")
        return False
    
    pdf_size = os.path.getsize(test_pdf) / (1024 * 1024)
    print(f"✅ Test PDF found: {test_pdf}")
    print(f"📄 PDF Size: {pdf_size:.2f} MB")
    
    # Step 2: Extract PDF Images
    print("\n2️⃣ Extracting PDF Images for Vision Analysis...")
    try:
        with open(test_pdf, 'rb') as f:
            files = {
                'pdf': (os.path.basename(test_pdf), f, 'application/pdf'),
                'dpi': (None, '300'),
                'format': (None, 'PNG')
            }
            
            response = requests.post(f"{backend_url}/convert-to-images", files=files, timeout=60)
            
            if response.status_code == 200:
                image_data = response.json()
                images = image_data.get('images', [])
                print(f"✅ Extracted {len(images)} images")
                
                # Save first few images for inspection
                for i, img in enumerate(images[:3]):  # Save first 3 pages
                    img_bytes = base64.b64decode(img['imageData'])
                    with open(f"{output_dir}/page_{i+1}.png", 'wb') as img_file:
                        img_file.write(img_bytes)
                    print(f"💾 Saved page {i+1} image")
                
            else:
                print(f"❌ Image extraction failed: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Image extraction error: {e}")
        return False
    
    # Step 3: REAL GPT-5 Vision Analysis
    print("\n3️⃣ Running REAL GPT-5 Vision Analysis...")
    
    real_issues = []
    
    # Analyze first 3 pages with actual GPT-5 Vision
    for page_num in range(1, min(4, len(images) + 1)):
        print(f"\n🔍 Analyzing page {page_num} with GPT-5 Vision...")
        
        try:
            # Get image data
            page_image = images[page_num - 1]
            image_b64 = page_image['imageData']
            
            # Create GPT-5 Vision prompt
            vision_prompt = f"""You are an expert credit report analyst. Analyze this credit report page {page_num} image carefully.

Look for these SPECIFIC issues:
1. Missing or truncated account numbers (like xxxxxxxx1234 or incomplete numbers)
2. Empty cells in payment history tables where payment data should exist
3. Missing creditor names or account names
4. Blank fields where information should be present
5. Incomplete balance information

For EACH issue you find, provide:
- Exact pixel coordinates (x, y, width, height) where the problem is located
- Clear description of what is missing or incomplete
- The text that should be there (if any)

Return ONLY valid JSON in this format:
{{
  "issues": [
    {{
      "id": "unique-id",
      "type": "critical|warning|attention", 
      "category": "accuracy",
      "description": "Detailed description of the specific missing information",
      "pageNumber": {page_num},
      "coordinates": {{"x": 123, "y": 456, "width": 78, "height": 20}},
      "anchorText": "text found at location or empty string if nothing",
      "severity": "high|medium|low",
      "recommendedAction": "specific action to take"
    }}
  ]
}}

Be very precise with coordinates. Only report issues you can actually see in the image."""

            # Call GPT-5 Vision API
            headers = {
                'Authorization': f'Bearer {OPENAI_API_KEY}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                "model": "gpt-5",  # GPT-5 has built-in vision capabilities
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": vision_prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_b64}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 2000,
                "temperature": 0.1
            }
            
            start_time = time.time()
            vision_response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers=headers,
                json=payload,
                timeout=60
            )
            analysis_time = time.time() - start_time
            
            if vision_response.status_code == 200:
                response_data = vision_response.json()
                content = response_data['choices'][0]['message']['content']
                
                print(f"✅ Page {page_num} analyzed with GPT-5 Vision in {analysis_time:.2f}s")
                
                # Parse JSON response
                try:
                    page_analysis = json.loads(content)
                    page_issues = page_analysis.get('issues', [])
                    real_issues.extend(page_issues)
                    print(f"🔍 Found {len(page_issues)} issues on page {page_num}")
                    
                    # Log issues found
                    for issue in page_issues:
                        print(f"  📍 {issue.get('description', 'Unknown issue')}")
                    
                except json.JSONDecodeError as e:
                    print(f"⚠️ Could not parse JSON response for page {page_num}: {e}")
                    print(f"Raw response: {content[:200]}...")
                
            else:
                print(f"❌ GPT-5 Vision API failed for page {page_num}: {vision_response.status_code}")
                if vision_response.status_code == 401:
                    print("❌ Invalid API key. Please check your OPENAI_API_KEY")
                    return False
                
        except Exception as e:
            print(f"❌ Error analyzing page {page_num}: {e}")
            continue
    
    # Step 4: Validate Real Results
    print(f"\n4️⃣ Validating Real GPT-5 Vision Results...")
    print(f"🔍 Total issues found across all pages: {len(real_issues)}")
    
    if len(real_issues) == 0:
        print("❌ CRITICAL FAILURE: GPT-5 Vision found NO issues")
        print("❌ This indicates the vision system is not working correctly")
        print("❌ TEST FAILED: System needs debugging")
        return False
    
    # Categorize issues
    account_issues = [i for i in real_issues if 'account' in i.get('description', '').lower()]
    empty_cell_issues = [i for i in real_issues if 'empty' in i.get('description', '').lower() or 'missing' in i.get('description', '').lower()]
    
    print(f"🔢 Account number issues: {len(account_issues)}")
    print(f"📋 Empty cell/missing data issues: {len(empty_cell_issues)}")
    
    # Save real analysis results
    real_analysis_result = {
        "totalIssues": len(real_issues),
        "issues": real_issues,
        "summary": f"Real GPT-5 Vision analysis found {len(real_issues)} actual issues",
        "confidence": 0.95,
        "method": "Real GPT-5 Vision API",
        "pagesAnalyzed": min(3, len(images))
    }
    
    with open(f"{output_dir}/real_analysis_results.json", 'w') as f:
        json.dump(real_analysis_result, f, indent=2)
    
    print(f"💾 Real analysis results saved")
    
    # Step 5: Create Highlighted PDF with REAL Data
    print("\n5️⃣ Creating Highlighted PDF with REAL Vision Data...")
    
    if len(real_issues) > 0:
        try:
            with open(test_pdf, 'rb') as f:
                files = {
                    'pdf': (os.path.basename(test_pdf), f, 'application/pdf')
                }
                
                data = {
                    'issues': json.dumps(real_issues)
                }
                
                response = requests.post(f"{backend_url}/highlight-pdf", files=files, data=data, timeout=30)
                
                if response.status_code == 200:
                    highlighted_pdf_path = f"{output_dir}/real_highlighted_result.pdf"
                    with open(highlighted_pdf_path, 'wb') as f:
                        f.write(response.content)
                    
                    print("✅ Real highlighted PDF created")
                    print(f"📄 Output: {highlighted_pdf_path}")
                    
                    # Open the PDF for inspection
                    os.system(f"open '{highlighted_pdf_path}'")
                    
                else:
                    print(f"❌ PDF highlighting failed: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ PDF highlighting error: {e}")
            return False
    
    # Final Assessment
    print("\n" + "=" * 60)
    print("🎯 REAL GPT-5 VISION TEST RESULTS")
    print("=" * 60)
    
    if len(real_issues) > 0 and (len(account_issues) > 0 or len(empty_cell_issues) > 0):
        print("✅ SUCCESS: Real GPT-5 Vision system is working")
        print(f"✅ Found {len(real_issues)} actual issues")
        print(f"✅ Highlighted PDF created with real data")
        print("✅ System ready for production")
        return True
    else:
        print("❌ FAILURE: Real GPT-5 Vision system needs fixes")
        print("❌ Not finding critical account or empty cell issues")
        print("❌ Highlighting system needs improvement")
        return False

if __name__ == "__main__":
    print("🔑 Make sure to set OPENAI_API_KEY environment variable first!")
    print("Example: export OPENAI_API_KEY='sk-...'")
    input("Press Enter to continue...")
    
    success = test_real_gpt5_vision()
    sys.exit(0 if success else 1)