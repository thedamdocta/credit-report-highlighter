#!/usr/bin/env python3
"""
Offline batch run (no local server). Uses PyMuPDF directly to:
- Render pages to images (300 DPI)
- Call GPT-5 Vision for issue coordinates (pixels)
- Convert to PDF points and add highlight annotations
- Save highlighted PDFs and analysis JSON

Env:
- OPENAI_API_KEY must be set

Outputs:
- test_outputs/real_offline/<base>_analysis.json
- test_outputs/real_offline/<base>_highlighted.pdf
"""
import os
import sys
import json
from pathlib import Path
import base64
import time
import math

import fitz  # PyMuPDF
import requests

PDFS = [
    "src/sample_equifax_report.pdf",
    "src/sample_experian_report.pdf",
    "src/sample_transunion_report.pdf",
]

OPENAI_API_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")

def ensure_key():
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        print("❌ OPENAI_API_KEY is not set")
        sys.exit(1)
    return key

def render_page_image(page, dpi=300):
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img_bytes = pix.tobytes("png")
    return img_bytes, pix.width, pix.height, dpi

def gpt5_analyze_page(key, page_num, png_b64, width, height, dpi, timeout=120):
    prompt = f"""You are an expert credit report analyst. Analyze this credit report page {page_num} image carefully.

Return ONLY valid JSON with issues having exact pixel coordinates measured from the top-left corner of the image.
"""
    messages = [
        {"role":"system","content":"You are an expert credit report analyst. Always return valid JSON only."},
        {"role":"user","content":[
            {"type":"text","text":f"The next image is page {page_num}, {width}x{height} pixels at {dpi} DPI. Measure coordinates in PIXELS from the top-left."},
            {"type":"image_url","image_url":{"url":f"data:image/png;base64,{png_b64}","detail":"high"}},
            {"type":"text","text":prompt}
        ]}
    ]
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-5",
        "messages": messages
    }
    r = requests.post(f"{OPENAI_API_URL}/chat/completions", headers=headers, json=payload, timeout=timeout)
    r.raise_for_status()
    data = r.json()
    content = data['choices'][0]['message']['content']
    try:
        return json.loads(content)
    except Exception as e:
        raise RuntimeError(f"Invalid JSON from GPT-5: {e}\nFirst 200 chars: {content[:200]}")

def add_highlights(pdf_path, issues, out_path, dpi=300):
    doc = fitz.open(pdf_path)
    factor = 72.0 / dpi
    color = (1,1,0)  # yellow
    valid_count = 0
    for issue in issues:
        page_idx = int(issue.get('pageNumber', 1)) - 1
        if page_idx < 0 or page_idx >= len(doc):
            raise ValueError(f"Issue page out of range: {page_idx+1}")
        c_raw = issue.get('coordinates')
        if isinstance(c_raw, list) and c_raw:
            c = c_raw[0] or {}
        else:
            c = c_raw or {}
        # Parse coordinates with NaN/inf protection
        try:
            x = float(c.get('x', 0))
            y = float(c.get('y', 0))
            w = float(c.get('width', 0))
            h = float(c.get('height', 0))
        except (TypeError, ValueError):
            print(f"⚠️ Invalid coordinate values in issue: {c}")
            continue
        
        # Check for NaN or infinite values
        if not all(math.isfinite(v) for v in [x, y, w, h]):
            print(f"⚠️ Non-finite coordinates detected: x={x}, y={y}, w={w}, h={h}")
            continue
        
        if w <= 0 or h <= 0:
            continue
        rect = fitz.Rect(x*factor, y*factor, (x+w)*factor, (y+h)*factor)
        page = doc[page_idx]
        # bounds check
        if not rect.intersects(page.rect):
            continue
        ann = page.add_highlight_annot(rect)
        ann.set_colors(stroke=color)
        ann.set_opacity(0.4)
        try:
            ann.set_info(title="AI Issue", content=(issue.get('description','') or '')[:500])
        except Exception:
            pass
        ann.update()
        valid_count += 1
    if valid_count == 0:
        raise ValueError("No valid coordinates to highlight")
    # basic metadata
    meta = doc.metadata or {}
    meta['title'] = (meta.get('title') or 'Credit Report') + ' (AI Analyzed)'
    doc.set_metadata(meta)
    doc.save(out_path)
    doc.close()

def verify_alignment(out_pdf_path, issues):
    doc = fitz.open(out_pdf_path)
    page_annots = {}
    total_annots = 0
    for p in doc:
        count = 0
        a = p.first_annot
        while a:
            count += 1
            a = a.next
        if count:
            page_annots[p.number + 1] = count
            total_annots += count
    doc.close()
    return {"annotations": total_annots, "pages_with_annots": page_annots, "issues": len(issues)}

def run():
    key = ensure_key()
    out_root = Path("creditpdfhighlighter/test_outputs/real_offline")
    out_root.mkdir(parents=True, exist_ok=True)

    summary = []
    for pdf in PDFS:
        p = Path("creditpdfhighlighter")/pdf
        if not p.exists():
            print(f"❌ Missing {p}")
            continue
        base = p.stem.replace(' ','_').replace('/','_')
        print(f"\n📄 {p}")
        doc = fitz.open(str(p))
        issues=[]
        for i in range(min(5, len(doc))):
            page = doc[i]
            img_bytes,w,h,dpi = render_page_image(page, dpi=300)
            png_b64 = base64.b64encode(img_bytes).decode('utf-8')
            print(f"🔍 GPT-5 Vision page {i+1}...")
            # retry with exponential backoff on timeouts
            attempts = [120, 180, 240]
            last_err = None
            for t in attempts:
                try:
                    res = gpt5_analyze_page(key, i+1, png_b64, w, h, dpi, timeout=t)
                    page_issues = res.get('issues', [])
                    issues.extend(page_issues)
                    print(f"   ➜ {len(page_issues)} issues")
                    last_err = None
                    break
                except Exception as e:
                    last_err = e
                    print(f"   ⚠️ attempt with timeout {t}s failed: {e}")
                    time.sleep(2)
            if last_err:
                print(f"   ❌ Skipping page {i+1} after retries")
        doc.close()
        if not issues:
            print("❌ No issues found; skipping highlight")
            continue
        analysis_path = out_root / f"{base}_analysis.json"
        with open(analysis_path,'w') as f:
            json.dump({"issues":issues}, f, indent=2)
        out_pdf = out_root / f"{base}_highlighted.pdf"
        add_highlights(str(p), issues, str(out_pdf), dpi=300)
        check = verify_alignment(str(out_pdf), issues)
        print(f"✅ Highlighted: {out_pdf}")
        summary.append({"pdf": str(p), "output": str(out_pdf), "check": check})

    print("\n==== Offline Batch Summary ====")
    for s in summary:
        print(json.dumps(s, indent=2))

if __name__ == '__main__':
    run()
