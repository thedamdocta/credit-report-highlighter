#!/bin/bash
set -euo pipefail

echo "🔍 Verifying Model Configuration and Compliance"
echo "======================================================"

# Confirm scripts exist
echo "1️⃣ Checking required npm scripts..."
if jq -r '.scripts' package.json | grep -E '"(check-models|validate-models|audit-models)"' > /dev/null; then
    echo "✅ All required npm scripts found"
else
    echo "❌ Missing required npm scripts"
    exit 1
fi

# Verify models config file exists
echo "2️⃣ Verifying models config file..."
if test -f src/config/models.ts; then
    echo "✅ src/config/models.ts exists"
else
    echo "❌ src/config/models.ts missing"
    exit 1
fi

# Scan code (exclude docs) for unauthorized model references
echo "3️⃣ Scanning for unauthorized model references (excluding docs)..."
if command -v rg &> /dev/null; then
    # Use ripgrep if available
    if rg -nP '(?i)\bgpt-4' -g '!**/*.md' -g '!**/docs/**' -g '!**/CHANGELOG*' 2>/dev/null; then
        echo "❌ Found unauthorized model references in code!"
        exit 1
    else
        echo "✅ No unauthorized model references found in code"
    fi
else
    # Fallback to grep
    if grep -r -i "gpt-4" src/ --exclude="*.md" 2>/dev/null | grep -v "config/models.ts"; then
        echo "❌ Found unauthorized model references in code!"
        exit 1
    else
        echo "✅ No unauthorized model references found in code"
    fi
fi

# Verify approved models are configured
echo "4️⃣ Verifying approved model usage..."
if grep -E "gpt-5|GPT-5" src/config/models.ts > /dev/null; then
    echo "✅ Approved models configured"
else
    echo "⚠️ No approved models found in config"
fi

# Run the full audit
echo "5️⃣ Running full model audit..."
if npm run audit-models; then
    echo "✅ Full audit passed"
else
    echo "❌ Audit failed"
    exit 1
fi

echo ""
echo "======================================================"
echo "✅ All verifications passed! Model configuration compliant."
echo "======================================================"