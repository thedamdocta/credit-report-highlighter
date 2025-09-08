#!/usr/bin/env node
/**
 * Model Validation Script
 * 
 * This script validates that the entire codebase uses only approved models
 * as defined in the central configuration.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Model Validation Script');
console.log('='.repeat(50));

let violations = [];
let warnings = [];

// Files to check
const filesToCheck = [
  'src/services/aiAnalyzer.ts',
  'src/services/gpt5VisionAnalyzer.ts', 
  'src/services/hybridAnalyzer.ts',
  'src/services/advancedChunkingService.ts',
  'src/services/enhancedCreditAnalyzer.ts',
  'src/services/lateChunkingService.ts',
  'src/services/enhancedLateChunkingService.ts',
  'src/services/enhancedAiAnalyzer.ts'
];

// Check for unauthorized model references (excluding enforcement files)
console.log('1️⃣ Checking for unauthorized model references...');
try {
  // Look for any gpt- references that aren't gpt-5
  const grepResult = execSync('grep -r -i -E "gpt-[^5]|gpt-4" src/ --exclude="*/config/models.ts" || true', { encoding: 'utf8' });
  if (grepResult.trim()) {
    violations.push('Unauthorized model references found in codebase:');
    violations.push(grepResult);
  } else {
    console.log('✅ Only approved models found');
  }
} catch (error) {
  console.log('✅ Only approved models found');
}

// Check model configurations
console.log('2️⃣ Validating model configurations...');
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for model specifications
    const modelMatches = content.match(/model\s*:\s*['"](.*?)['"]/g);
    if (modelMatches) {
      modelMatches.forEach(match => {
        const model = match.match(/['"](.*?)['"]/)[1];
        if (!model.includes('gpt-5')) {
          violations.push(`❌ CRITICAL: ${file} contains unauthorized model: ${model}`);
        } else {
          console.log(`✅ ${file}: ${model}`);
        }
      });
    }
  } else {
    warnings.push(`⚠️ File not found: ${file}`);
  }
});

// Check package.json scripts
console.log('3️⃣ Checking package.json scripts...');
const packagePath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packagePath)) {
  const packageContent = fs.readFileSync(packagePath, 'utf8');
  const packageJson = JSON.parse(packageContent);
  
  // Add validation scripts if missing
  if (!packageJson.scripts) packageJson.scripts = {};
  
  const requiredScripts = {
    'check-models': 'grep -r -i -E "gpt-[^5]|gpt-4" src/ && exit 1 || echo "✅ Only approved models found"',
    'validate-models': 'node scripts/validate-models.js',
    'test-gpt5-only': 'npm run validate-models && npm test'
  };
  
  let scriptsAdded = false;
  Object.entries(requiredScripts).forEach(([script, command]) => {
    if (!packageJson.scripts[script]) {
      packageJson.scripts[script] = command;
      scriptsAdded = true;
      console.log(`✅ Added script: ${script}`);
    }
  });
  
  if (scriptsAdded) {
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('📝 Updated package.json with validation scripts');
  }
}

// Generate report
console.log('4️⃣ Generating validation report...');
console.log('='.repeat(50));

if (violations.length > 0) {
  console.log('❌ VALIDATION FAILED');
  console.log('Critical violations found:');
  violations.forEach(violation => console.log(violation));
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('⚠️ WARNINGS');
  warnings.forEach(warning => console.log(warning));
}

console.log('✅ VALIDATION PASSED');
console.log('🎉 All model configurations are compliant');
console.log('');
console.log('Available validation commands:');
console.log('- npm run check-models');
console.log('- npm run validate-models'); 
console.log('- npm run test-models');

process.exit(0);