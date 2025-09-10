# GPT‑5 Vision + PyMuPDF Analysis Improvement Plan

This document specifies a robust, multi‑pass pipeline to improve accuracy, reliability, and reproducibility of credit report analysis with GPT‑5 Vision and PyMuPDF. It defines architecture, data contracts (JSON schemas), prompting, validations, storage, UI/UX, testing, and a phased rollout plan.

---

## 1) Objectives

- Analyze full documents (no page caps) with predictable performance.
- Fuse text coordinates (PyMuPDF) with vision findings (GPT‑5).
- Enforce strict validation and fail‑fast semantics (no fallbacks).
- Persist artifacts for auditing, re‑run, and offline highlighting.
- Keep PyMuPDF as the single highlighting backend (yellow‑only policy).
- Reduce cost via dynamic chunking and contextual prompting.

---

## 2) Current vs Target Architecture

### 2.1 Current
1. PDF → images (300 DPI) via `/convert-to-images` (PyMuPDF Flask)
2. Images → GPT‑5 Vision (base64) → raw JSON issues (pixels)
3. Pixel coordinates → used directly to annotate PDF (PyMuPDF)
4. Downloads a highlighted PDF

Limitations:
- No text token map; cannot anchor or validate findings.
- Single‑pass; prone to false positives.
- No artifact persistence; re‑runs repeat full cost.
- Basic chunking; token budgets not enforced per chunk.

### 2.2 Target
1. Preflight: health check `/health`, resolve CORS, show server URL
2. Pass 1 (Text): `/extract-text-coordinates` → per‑page tokens in points
3. Pass 2 (Vision): images + compact page context → GPT‑5 Vision → raw JSON
4. Normalize: convert pixels→points, strict schema, enums, multiple rects
5. Validate: bounds check, token intersection, dedupe, scoring
6. Persist artifacts (JSON) + metrics + costs
7. Annotate with PyMuPDF using validated issues (yellow‑only)
8. Download PDF + optional artifact JSON

---

## 3) Data Contracts (JSON Artifacts)

All artifacts include `schemaVersion` and `documentId` (stable hash of PDF bytes + metadata).

### 3.1 text_extraction.json
```jsonc
{
  "schemaVersion": "1.0.0",
  "documentId": "<sha256>",
  "pages": [
    {
      "pageNumber": 1,
      "widthPoints": 612,
      "heightPoints": 792,
      "tokens": [
        { "text": "Account Number", "x": 72, "y": 108, "width": 140, "height": 12, "fontName": "Helvetica", "fontSize": 10.5 }
      ],
      "labels": ["Account Number", "Payment History", "Balance"]
    }
  ],
  "createdAt": "2025-09-08T12:00:00Z"
}
```

### 3.2 page_images_meta.json
```jsonc
{
  "schemaVersion": "1.0.0",
  "documentId": "<sha256>",
  "pages": [
    { "pageNumber": 1, "imageWidthPx": 2550, "imageHeightPx": 3300, "dpi": 300 }
  ]
}
```

### 3.3 vision_findings_raw.json (audit trail)
```jsonc
{
  "schemaVersion": "1.0.0",
  "documentId": "<sha256>",
  "chunks": [
    {
      "chunkIndex": 0,
      "pages": [1,2,3,4],
      "requestMeta": { "estimatedTokens": 8200, "images": 4 },
      "responseRaw": "{\n  \"issues\": [ ... ]\n}",
      "parsedOk": true,
      "error": null
    }
  ]
}
```

### 3.4 vision_findings_normalized.json (canonical output)
```jsonc
{
  "schemaVersion": "1.0.0",
  "documentId": "<sha256>",
  "pageMeta": [
    { "pageNumber": 1, "widthPoints": 612, "heightPoints": 792, "dpi": 300, "imageWidthPx": 2550, "imageHeightPx": 3300 }
  ],
  "issues": [
    {
      "id": "b8a9e5a8-2a0e-4ec9-86fb-1a2e3d2c9bd3",
      "pageNumber": 1,
      "rects": [ { "x": 310.5, "y": 250.2, "width": 140.7, "height": 22.3, "units": "points" } ],
      "description": "Payment cell appears empty in the grid.",
      "type": "warning",
      "category": "accuracy",
      "severity": "medium",
      "source": "vision",
      "anchorText": "Payment History",
      "mappingMethod": "vision_detection",
      "mappingConfidence": 0.85,
      "validation": { "inBounds": true, "intersectsTokens": true, "tokenCount": 3 },
      "recommendedAction": "Verify missing payment data"
    }
  ]
}
```

### 3.5 validated_issues.json
```jsonc
{
  "schemaVersion": "1.0.0",
  "documentId": "<sha256>",
  "issues": [
    { "id": "...", "pageNumber": 1, "rects": [ {"x":72,"y":108,"width":140,"height":22} ], "description": "..." }
  ],
  "stats": { "total": 24, "inBounds": 24, "intersecting": 21, "deduped": 3 }
}
```

### 3.6 highlights_payload.json (PyMuPDF input)
```jsonc
{
  "issues": [
    { "id": "...", "type": "warning", "description": "...", "pageNumber": 1,
      "coordinates": { "x": 72, "y": 108, "width": 140, "height": 22 } }
  ]
}
```

### 3.7 run_artifact.json (consolidated)
```jsonc
{
  "schemaVersion": "1.0.0",
  "documentId": "<sha256>",
  "pagesAnalyzed": 48,
  "textExtractionPath": "text_extraction.json",
  "pageImagesMetaPath": "page_images_meta.json",
  "visionRawPath": "vision_findings_raw.json",
  "visionNormalizedPath": "vision_findings_normalized.json",
  "validatedIssuesPath": "validated_issues.json",
  "highlightsPayloadPath": "highlights_payload.json",
  "costs": { "inputTokens": 128000, "outputTokens": 11000, "imageTokens": 24000, "totalUSD": 8.21 },
  "timings": { "imagesMs": 3123, "textMs": 1740, "visionMs": 64210, "validateMs": 932 },
  "createdAt": "2025-09-08T12:10:00Z",
  "version": {
    "frontend": "<git-sha>",
    "server": "<git-sha>",
    "schemas": "1.0.0"
  }
}
```

---

## 4) Prompting Specification (Per Chunk)

- Preamble (system):
  - “You are an expert credit report analyst. Always return valid JSON only.”
- Context (user content array):
  1) `text`: “Pages X–Y. Each image is labeled with page number, pixel size, and DPI. Measure coordinates in PIXELS from the top‑left.”
  2) For each page: a label text line: “Image page N, WxH pixels at D DPI.”
  3) image_url: data URI for each page (detail: high)
  4) compact page context: Top labels for each page (`labels` from text extraction)
- Schema (strict):
  ```jsonc
  {
    "issues": [
      {
        "id": "uuid-v4",
        "type": "critical|warning|attention|info",
        "category": "accuracy|FCRA_violation|collection|dispute|other",
        "severity": "high|medium|low",
        "pageNumber": <int>,
        "coordinates": { "x": <number>, "y": <number>, "width": <number>, "height": <number> },
        "description": <string>,
        "anchorText": <string>,
        "recommendedAction": <string>
      }
    ]
  }
  ```
- Constraints:
  - “Return ONLY valid JSON (no markdown). If uncertain, return empty issues array.”
  - “Use integers or decimals for coordinates; widths/heights must be positive.”

---

## 5) Normalization & Validation

### 5.1 Normalization (pixels → points)
- For each issue:
  - Use page‑specific factor: `points = pixels * (72 / dpi)`
  - Convert `{coordinates}` → `rects: [{ x, y, width, height, units: 'points' }]`
  - Attach `source='vision'`, `mappingMethod='vision_detection'`

### 5.2 Validation Gates (strict mode)
- Bounds:
  - Rect must intersect page bounds; reject or flag otherwise.
- Token intersection:
  - Requires ≥1 token intersection or proximity to a labeled region (configurable threshold).
- Deduplication:
  - Hash on `(page, category, round(cx,10), round(cy,10))` where `cx,cy` are rect centroids.
- Confidence score:
  - Start from model’s `mappingConfidence` or derive from validation outcomes.
- Fail‑fast:
  - If any issue lacks numeric coordinates → throw.
  - If zero valid issues across pages → stop with explicit error.

---

## 6) Dynamic Chunking (Late Chunking Integration)

- Target per‑chunk budget: ~8000 completion tokens; hard max ~12000.
- Token estimate per page: `textChars/4 + imageCost(≈1200)`.
- Chunk by section boundaries (use `labels` from text extraction).
- Carry a `contextSummary` string between chunks (top 3 findings + unresolved hypotheses).
- Concurrency: limit in‑flight requests; exponential backoff on timeouts.

---

## 7) UI/UX Requirements

- Preflight banner:
  - “PyMuPDF server unreachable at ${url} (health check failed). Start server or set VITE_PYMUPDF_SERVER_URL.”
- Progress stages:
  - Show per‑page counters for image conversion and analysis (e.g., page 12/48).
- Error surfaces:
  - CORS/server errors bubble with remediation hints.
- Artifact UX (optional):
  - “Download Analysis JSON” button after success (exports `run_artifact.json`).

---

## 8) Server Requirements (Flask / PyMuPDF)

- Endpoints
  - `GET /health` → `{ status: 'healthy' }`
  - `POST /convert-to-images` → per‑page images with `{ pageNumber, imageData(base64), mimeType, width, height, dpi }`
  - `POST /extract-text-coordinates` → per‑page tokens with font/size and bbox (points)
  - `POST /highlight-pdf` (strict) → coordinates REQUIRED; yellow‑only; bounds check
- CORS
  - Access‑Control‑Allow‑Origin: `*` (dev)
  - Methods: GET, POST, OPTIONS; Headers: Content-Type, Authorization

---

## 9) Tasks & Phased Rollout

### Phase A — Infrastructure & Health
1. Add preflight health check in UI and server URL display.
2. Ensure CORS headers (server) and `mode:'cors'` calls (client).
3. Remove any residual page caps in client/runner logic.

### Phase B — Text Extraction & Context
4. Invoke `/extract-text-coordinates` before vision; persist `text_extraction.json`.
5. Generate `labels` per page (e.g., via regex/keyword heuristics) for prompts.
6. Add `page_images_meta.json` from `/convert-to-images` output.

### Phase C — Prompting & Chunking
7. Implement dynamic chunking (budgeted by tokens; section‑aware if possible).
8. Emit per‑page label lines and compact context in messages; require strict JSON.
9. Add retries/backoff for timeouts; log chunk stats (size, tokens, retries).

### Phase D — Normalization & Validation
10. Normalize pixel coordinates → points with per‑page DPI.
11. Bounds and token intersection checks; dedupe; confidence scoring.
12. Generate `vision_findings_normalized.json`, `validated_issues.json`, `highlights_payload.json`.

### Phase E — Persistence & UX
13. Write `run_artifact.json` summarizing inputs/outputs, timings, and costs.
14. Add “Download Analysis JSON” button (exports `run_artifact.json`).
15. Document CLI/test script usage for batch runs.

---

## 10) Acceptance Criteria

- With the server running, analyzing a known test PDF produces:
  - Non‑empty `validated_issues.json` with bounds‑valid rectangles.
  - An annotated PDF where rectangles land correctly on intended content.
  - A complete `run_artifact.json` with timing and cost breakdowns.
- No hardcoded page caps; per‑page progress is visible; UI surfaces health errors.
- Strict mode: missing/invalid coordinates or out‑of‑bounds rects cause explicit failure.

---

## 11) Risks & Mitigations

- Model returns invalid JSON → strict parse + one retry; log and fail if still invalid.
- Long docs/timeouts → dynamic chunking + backoff; surface chunk‑level progress.
- CORS/server issues → preflight banner; clear remediation.
- Costs → reduce context; tune chunk sizes; reuse artifacts for re‑runs.

---

## 12) Metrics & Logging

- Timings: image conversion, text extraction, vision per chunk, normalization/validation, highlighting.
- Costs: input/output/image tokens and total spend estimate.
- Quality: % issues passing bounds & intersection; dedup ratio.
- Reliability: retry counts; failure codes/surfaces.

---

## 13) Implementation Notes (Code Touchpoints)

- Client
  - `src/services/gpt5VisionAnalyzer.ts`: preflight health, `/extract-text-coordinates` call, chunking, prompting, normalization, validation, artifact writer.
  - `src/components/DetailedProgressIndicator.tsx` + `src/hooks/useProgressTracking.ts`: page/chunk counters.
  - `src/components/generated/CreditReportAnalyzerApp.tsx`: optional “Download Analysis JSON”.
- Server
  - `pymupdf_highlight_server.py`: ensure CORS, strict coordinates, bounds checks already in place; extend logging as needed.

---

## 14) Example Pseudocode (Normalization)

```ts
function normalizeIssues(rawIssues, pageMeta) {
  const norm = [];
  for (const issue of rawIssues) {
    const pm = pageMeta.find(p => p.pageNumber === issue.pageNumber);
    if (!pm) throw new Error(`Missing page meta for ${issue.pageNumber}`);
    const f = 72 / pm.dpi;
    const c = issue.coordinates;
    if (!c || [c.x,c.y,c.width,c.height].some(v => typeof v !== 'number' || v <= 0)) {
      throw new Error(`Invalid coordinates for ${issue.id}`);
    }
    const rect = { x: c.x * f, y: c.y * f, width: c.width * f, height: c.height * f, units: 'points' };
    norm.push({ ...issue, rects: [rect], source: 'vision', mappingMethod: 'vision_detection' });
  }
  return norm;
}
```

---

## 15) Future Enhancements (Optional)

- Multi‑rect issues per payment grid row/column.
- OCR support for scanned PDFs (PyMuPDF + Tesseract) to augment tokens.
- Section segmentation model to automate semantic chunking.
- In‑browser IndexedDB cache for artifacts.

---

## 16) Glossary

- **Points**: PDF units (72 points per inch).
- **DPI**: Dots per inch for raster images used in vision analysis.
- **Tokens**: Model token units; rough estimate chars/4.

---

---

## 17) Equifax‑Only Extraction Output (Strict Spec)

This section defines the Equifax‑specific data extraction JSON that must be prompted and validated. The output is a single JSON object with exactly eight components and no extra keys. When a value is unknown, return the exact placeholders specified (null, "Not reported", or "-").

### 17.1 Master Envelope (equifax_extracted_data.json)

```jsonc
{
  "reportConfirmationDetails": { ... },
  "personalInformation": { ... },
  "summary": { ... },
  "creditAccountsSummary": [ ... ],
  "otherItemsSummary": { ... },
  "accounts": [ ... ],
  "collections": { ... },
  "inquiries": { ... }
}
```

### 17.2 Component #1 — Report Confirmation Details

```json
{
  "consumerName": "",
  "confirmationNumber": "",
  "reportDate": ""
}
```

Rules: strings only; use "" if unknown; prefer ISO‑8601 date when parsable.

### 17.3 Component #2 — Personal Information

```json
{
  "name": "Full legal name as reported to credit bureau",
  "addresses": "List of all addresses associated with the consumer",
  "socialSecurityNumber": "Social Security Number (masked for security)",
  "dateOfBirth": "Date of Birth",
  "employmentHistory": "Employment information reported to credit bureaus",
  "currentAddresses": "Addresses marked as current in the report",
  "previousAddresses": "Former addresses no longer current for the consumer"
}
```

Rules: all fields are strings; keep SSN masked; if multiple addresses, concatenate as string.

### 17.4 Component #3 — Summary

```json
{
  "reportDate": null,
  "creditFileStatus": null,
  "alertContacts": null,
  "averageAccountAge": null,
  "lengthOfCreditHistory": null,
  "accountsWithNegativeInfo": null,
  "oldestAccount": null,
  "recentAccount": null
}
```

Rules: values may be null or strings; prefer null when unknown; reportDate ISO if parsable.

### 17.5 Component #4 — Credit Accounts Summary (array; fixed order)

Order: Revolving, Mortgage, Installment, Other, Total.

```jsonc
[
  {
    "accountType": "Revolving",
    "totalAccounts": null,
    "open": null,
    "closed": null,
    "balance": null,
    "withBalance": null,
    "totalBalance": null,
    "available": null,
    "creditLimit": null,
    "debtToCredit": null,
    "payment": null
  },
  { "accountType": "Mortgage", "totalAccounts": null, "open": null, "closed": null, "balance": null, "withBalance": null, "totalBalance": null, "available": null, "creditLimit": null, "debtToCredit": null, "payment": null },
  { "accountType": "Installment", "totalAccounts": null, "open": null, "closed": null, "balance": null, "withBalance": null, "totalBalance": null, "available": null, "creditLimit": null, "debtToCredit": null, "payment": null },
  { "accountType": "Other", "totalAccounts": null, "open": null, "closed": null, "balance": null, "withBalance": null, "totalBalance": null, "available": null, "creditLimit": null, "debtToCredit": null, "payment": null },
  { "accountType": "Total", "totalAccounts": null, "open": null, "closed": null, "balance": null, "withBalance": null, "totalBalance": null, "available": null, "creditLimit": null, "debtToCredit": null, "payment": null }
]
```

Rules: numeric‑looking fields can be strings or null; debtToCredit can be a percentage string.

### 17.6 Component #5 — Other Items Summary

```json
{
  "inquiries": [],
  "publicRecords": [],
  "collections": [],
  "statementCount": 0,
  "personalInfoItemCount": 0,
  "recentInquiry": null,
  "inquiryCount": 0,
  "publicRecordCount": 0,
  "collectionCount": 0
}
```

Rules: arrays must exist; counts default 0.

### 17.7 Component #6 — Accounts (array of account objects)

Shape (one account):

```jsonc
{
  "accountName": "Sample Account",
  "accountNumber": "XXXX-XXXX-XXXX-1234",
  "accountType": "Not reported",
  "accountCategory": "Not reported",
  "accountOwnership": "Not reported",
  "openDate": "Not reported",
  "status": "Not reported",
  "balance": "Not reported",
  "balanceHistory": [ { "year": "-", "jan": "-", "feb": "-", "mar": "-", "apr": "-", "may": "-", "jun": "-", "jul": "-", "aug": "-", "sep": "-", "oct": "-", "nov": "-", "dec": "-" }, { "year": "-", ... }, { "year": "-", ... } ],
  "scheduledPaymentHistory": [ { "year": "-", ... }, { "year": "-", ... }, { "year": "-", ... } ],
  "actualPaymentHistory": [ { "year": "-", ... }, { "year": "-", ... }, { "year": "-", ... } ],
  "creditLimitHistory": [ { "year": "-", ... }, { "year": "-", ... }, { "year": "-", ... } ],
  "amountPastDueHistory": [ { "year": "-", ... }, { "year": "-", ... }, { "year": "-", ... } ],
  "activityDesignatorHistory": [ { "year": "-", ... }, { "year": "-", ... }, { "year": "-", ... } ],
  "paymentHistory": [ "-", "-", /* 36 entries total */ "-" ],
  "paymentStatusCodes": {
    "30": "30 days late",
    "60": "60 days late",
    "90": "90 days late",
    "120": "120 days late",
    "150": "150 days past due",
    "180": "180 days past due",
    "OK": "Payment made on time",
    "COL": "In collections",
    "C": "Collection account",
    "CO": "Charge-off",
    "R": "Repossession",
    "F": "Foreclosure",
    "V": "Voluntary surrender",
    "B": "Included in bankruptcy",
    "TNT": "Too new to rate",
    "X": "No data available"
  },
  "creditLimit": "Not reported",
  "highestBalance": "Not reported",
  "highCredit": "Not reported",
  "paymentStatus": "Not reported",
  "dateOpened": "Not reported",
  "dateReported": "Not reported",
  "dateClosed": "Not reported",
  "lastPaymentDate": "Not reported",
  "dateOfLastActivity": "Not reported",
  "dateOfFirstDelinquency": "Not reported",
  "delinquencyFirstReported": "Not reported",
  "deferredPaymentStartDate": "Not reported",
  "balloonPaymentDate": "Not reported",
  "currentBalance": "Not reported",
  "paymentAmount": "Not reported",
  "actualPaymentAmount": "Not reported",
  "scheduledPaymentAmount": "Not reported",
  "amountPastDue": "Not reported",
  "chargeOffAmount": "Not reported",
  "balloonPaymentAmount": "Not reported",
  "creditType": "Not reported",
  "loanType": "Not reported",
  "responsibility": "Not reported",
  "paymentResponsibility": "Not reported",
  "termsFrequency": "Not reported",
  "termDuration": "Not reported",
  "monthsReviewed": "Not reported",
  "activityDesignator": "Not reported",
  "creditorClassification": "Not reported",
  "accountStatus": "Not reported",
  "comments": [ "Not reported" ],
  "totalAccounts": 0,
  "openAccounts": 0,
  "closedAccounts": 0
}
```

Rules: exact keys and shapes; histories have exactly 3 year rows with 12 months each; paymentHistory has exactly 36 entries; dates/amounts remain strings; accountNumber must remain masked.

### 17.8 Component #7 — Collections

```json
{
  "collections": [],
  "collectionCount": 0,
  "collectionFields": {
    "dateReported": "Date the collection was reported to the credit bureau",
    "collectionAgency": "Name of the collection agency handling the debt",
    "balanceDate": "Date of the current balance information",
    "originalCreditorName": "Name of the original creditor who issued the debt",
    "accountDesignatorCode": "Code that identifies the type of collection account",
    "dateAssigned": "Date the debt was assigned to the collection agency",
    "accountNumber": "Collection account number (partially masked for security)",
    "originalAmountOwed": "Original amount owed before collection fees",
    "creditorClassification": "Classification of the creditor type",
    "amount": "Current collection amount owed",
    "lastPaymentDate": "Date of last payment made on the collection",
    "statusDate": "Date of the current collection status",
    "dateOfFirstDelinquency": "Date when the account first became delinquent",
    "status": "Current status of the collection account",
    "comments": "Comments about the collection account from the agency",
    "contact": "Contact information for the collection agency"
  }
}
```

Rules: collections array defaults to []; collectionCount equals collections.length.

### 17.9 Component #8 — Inquiries (hard and soft)

```json
{
  "hardInquiries": [],
  "softInquiries": []
}
```

Inquiry object shape:

```json
{
  "date": "YYYY-MM-DD or raw",
  "companyName": "string",
  "permissiblePurpose": "string or Not reported",
  "address": "string or Not reported"
}
```

Rules: arrays must exist; dates may be raw if not parsable; split by hard vs soft correctly.

### 17.10 Prompting & Validation Notes (Equifax)

- Always return a single JSON object with exactly the above eight keys.
- Use placeholders exactly as specified when unknown.
- Enforce history lengths (3 year rows; 36 paymentHistory entries).
- Validate with a strict schema; reject invalid shapes with precise error messages.

### 17.11 Optional Artifacts

- normalized_equifax.json: an internal, developer‑friendly normalization (arrays for addresses, ISO dates, numeric parsing) — must not replace the mandated equifax_extracted_data.json.
- equifax_field_anchors.json: per‑field anchors for highlighting (kept separate from data JSON; units = points).

---

End of plan.
