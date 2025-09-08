#!/usr/bin/env python3
"""
Run real GPT-5 Vision analysis + PyMuPDF highlighting for a batch of PDFs.

Requirements:
- Environment var OPENAI_API_KEY must be set
- PyMuPDF Flask server running at http://localhost:5175

Outputs:
- test_outputs/real/<base>_analysis.json
- test_outputs/real/<base>_highlighted.pdf
- A verification summary that annotation rects intersect GPT-5 issue rects
"""

import os
import sys
import json
import time
from pathlib import Path
import base64
import requests

PDFS = [
    "src/sample_equifax_report.pdf",
    "src/sample_experian_report.pdf",
    "src/sample_transunion_report.pdf",
]

BACKEND_URL = os.environ.get("PYMUPDF_SERVER_URL", "http://localhost:5175")
OPENAI_API_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")

def ensure_env():
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        print("❌ OPENAI_API_KEY is not set. Aborting.")
        sys.exit(1)
    return key

def convert_to_images(pdf_path: str):
    with open(pdf_path, 'rb') as f:
        files = {
            'pdf': (os.path.basename(pdf_path), f, 'application/pdf'),
            'dpi': (None, '300'),
            'format': (None, 'PNG'),
        }
        r = requests.post(f"{BACKEND_URL}/convert-to-images", files=files, timeout=120)
        r.raise_for_status()
        data = r.json()
        return data.get('images', [])

def gpt5_vision_analyze_page(key: str, page_num: int, image):
    prompt = f"""You are an expert credit report analyst. Analyze this credit report page {page_num} image carefully.

Look for these SPECIFIC issues:
1. Missing or truncated account numbers (like xxxxxxxx1234 or incomplete numbers)
2. Empty cells in payment history tables where payment data should exist
3. Missing creditor names or account names
4. Blank fields where information should be present
5. Incomplete balance information

For EACH issue you find, provide ONLY valid JSON in this format:
{{
  "issues": [
    {{
      "id": "unique-id",
      "type": "critical|warning|attention|info",
      "category": "accuracy",
      "description": "Specific missing information",
      "pageNumber": {page_num},
      "coordinates": {{"x": 123, "y": 456, "width": 78, "height": 20}},
      "anchorText": "text at location or empty",
      "severity": "high|medium|low",
      "recommendedAction": "action"
    }}
  ]
}}

Be very precise with pixel coordinates measured from the top-left corner of the image."""

    messages = [
        {
            "role": "system",
            "content": "You are an expert credit report analyst. Always respond with valid JSON only."
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": f"The next image is page {page_num}, measure coordinates in PIXELS from top-left."},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{image['mimeType']};base64,{image['imageData']}",
                        "detail": "high"
                    }
                },
                {"type": "text", "text": prompt}
            ]
        }
    ]

    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-5",
        "messages": messages,
        "max_completion_tokens": 4000,
        "temperature": 0.1,
        "reasoning_effort": "low"
    }
    r = requests.post(f"{OPENAI_API_URL}/chat/completions", headers=headers, json=payload, timeout=120)
    r.raise_for_status()
    data = r.json()
    content = data['choices'][0]['message']['content']
    try:
        return json.loads(content)
    except Exception as e:
        raise RuntimeError(f"Invalid JSON from GPT-5: {e}\nFirst 200 chars: {content[:200]}")

def highlight(pdf_path: str, issues: list, out_pdf_path: str):
    with open(pdf_path, 'rb') as f:
        files = {'pdf': (os.path.basename(pdf_path), f, 'application/pdf')}
        data = {'issues': json.dumps(issues)}
        r = requests.post(f"{BACKEND_URL}/highlight-pdf", files=files, data=data, timeout=120)
        r.raise_for_status()
        Path(out_pdf_path).parent.mkdir(parents=True, exist_ok=True)
        with open(out_pdf_path, 'wb') as out:
            out.write(r.content)
        return out_pdf_path

def _rect_from_issue(i):
    c = i.get('coordinates', {})
    try:
        x = float(c.get('x', 0.0))
        y = float(c.get('y', 0.0))
        width = float(c.get('width', 0.0))
        height = float(c.get('height', 0.0))
        return (x, y, width, height)
    except (TypeError, ValueError) as e:
        print(f"⚠️ Invalid coordinates in issue: {c}")
        return (0.0, 0.0, 0.0, 0.0)

def verify_alignment(out_pdf_path: str, issues: list) -> dict:
    """Verify each issue has a corresponding highlight rectangle on the correct page.
    Returns per-issue verification ratio and counts.
    """
    try:
        import fitz
    except ImportError:
        return {"verified": False, "reason": "PyMuPDF not installed in test env"}

    doc = fitz.open(out_pdf_path)
    page_annots = {}
    for p in doc:
        rects = []
        a = p.first_annot
        while a:
            r = a.rect
            rects.append((float(r.x0), float(r.y0), float(r.width), float(r.height)))
            a = a.next
        page_annots[p.number + 1] = rects
    doc.close()

    def intersects(r1, r2):
        x1,y1,w1,h1 = r1; x2,y2,w2,h2 = r2
        return not (x1+w1 < x2 or x2+w2 < x1 or y1+h1 < y2 or y2+h2 < y1)

    matched = 0
    for i in issues:
        page = int(i.get('pageNumber', 0))
        r_issue = _rect_from_issue(i)
        rects = page_annots.get(page, [])
        if any(intersects(r_issue, r) for r in rects):
            matched += 1

    return {
        "verified": matched == len(issues),
        "matched": matched,
        "issues": len(issues),
        "pages_with_annots": {k: len(v) for k, v in page_annots.items() if v}
    }

def run():
    key = ensure_env()
    out_root = Path("test_outputs/real")
    out_root.mkdir(parents=True, exist_ok=True)

    summary = []
    for pdf in PDFS:
        if not Path(pdf).exists():
            print(f"❌ Missing PDF: {pdf}")
            continue

        base = Path(pdf).stem.replace(' ', '_').replace('/', '_')
        print(f"\n📄 Processing: {pdf}")

        images = convert_to_images(pdf)
        if not images:
            print("❌ No images extracted; skipping")
            continue

        issues = []
        pages_to_analyze = min(5, len(images))
        for i in range(pages_to_analyze):
            page_num = i + 1
            print(f"🔍 GPT-5 Vision on page {page_num}...")
            result = gpt5_vision_analyze_page(key, page_num, images[i])
            page_issues = result.get('issues', [])
            issues.extend(page_issues)
            print(f"   ➜ Found {len(page_issues)} issues")

        if not issues:
            print("❌ No issues reported by GPT-5; skipping highlight")
            continue

        analysis_path = out_root / f"{base}_analysis.json"
        with open(analysis_path, 'w') as f:
            json.dump({"issues": issues}, f, indent=2)
        print(f"💾 Saved analysis: {analysis_path}")

        out_pdf = out_root / f"{base}_highlighted.pdf"
        highlight(str(pdf), issues, str(out_pdf))
        print(f"✅ Highlighted PDF: {out_pdf}")

        check = verify_alignment(str(out_pdf), issues)
        print(f"🔎 Verify: {check}")
        summary.append({"pdf": pdf, "output": str(out_pdf), "verify": check})

    print("\n==== Batch Summary ====")
    for item in summary:
        print(json.dumps(item, indent=2))

if __name__ == "__main__":
    run()
