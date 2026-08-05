/**
 * scripts/ci-check-float-safety.ts
 *
 * CI Safety Control for CLAUDE.md Execution Safety Rule 3:
 * "Money is scaled integers. bigint + scale. Floats banned in packages/core/money,
 * risk, execute, edge. CI fails on a float type in those paths."
 *
 * Scans TypeScript source files in target financial packages to ensure
 * monetary values, prices, and account balances do not use unbranded JS numbers/floats.
 */
import fs from 'fs';
import path from 'path';

const TARGET_PATHS = [
  'packages/core/src/money.ts',
  'packages/risk/src',
  'packages/execute/src',
  'packages/edge/src',
];

interface Violation {
  filePath: string;
  line: number;
  content: string;
  reason: string;
}

const violations: Violation[] = [];

// Patterns indicating illegal float usage for money/price representation
const BANNED_PATTERNS = [
  {
    regex: /:\s*number\b.*(?:\bbalance\b|\bequity\b|\bpnl\b|\bamount\b|\bprice\b)/i,
    reason: 'Monetary/price fields must use ScaledInteger or Price/Money interface, not unbranded number.',
  },
  {
    regex: /function\s+\w+\(.*?\):\s*number\b.*(?:\bbalance\b|\bequity\b|\bpnl\b|\bamount\b|\bprice\b)/i,
    reason: 'Functions returning financial/price values must return ScaledInteger, Price, or Money, not raw number.',
  },
];

function scanFile(filePath: string) {
  if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts')) return;
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;

  const code = fs.readFileSync(filePath, 'utf-8');
  const lines = code.split('\n');

  lines.forEach((lineContent, idx) => {
    const lineNum = idx + 1;
    for (const pattern of BANNED_PATTERNS) {
      if (pattern.regex.test(lineContent)) {
        // Exclude allowed exceptions like scale indicators or ratio percentages
        if (lineContent.includes('scale:') || lineContent.includes('Pct') || lineContent.includes('rate: number')) {
          continue;
        }
        violations.push({
          filePath,
          line: lineNum,
          content: lineContent.trim(),
          reason: pattern.reason,
        });
      }
    }
  });
}

function scanDir(dirOrFile: string) {
  const absolutePath = path.resolve(process.cwd(), dirOrFile);
  if (!fs.existsSync(absolutePath)) return;

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    scanFile(absolutePath);
  } else if (stat.isDirectory()) {
    const files = fs.readdirSync(absolutePath);
    for (const file of files) {
      scanDir(path.join(dirOrFile, file));
    }
  }
}

console.log('🔍 Running CI Float Safety Scanner (CLAUDE.md Safety Rule 3)...');

for (const target of TARGET_PATHS) {
  scanDir(target);
}

if (violations.length > 0) {
  console.error('\n❌ FLOAT SAFETY VIOLATION DETECTED in financial execution packages:');
  for (const v of violations) {
    console.error(`  - ${v.filePath}:${v.line} -> ${v.reason}`);
    console.error(`    Code: "${v.content}"`);
  }
  console.error('\nCLAUDE.md Rule 3: Money must be ScaledInteger (bigint + scale). Floats are banned for financial amounts.');
  process.exit(1);
} else {
  console.log('✅ Float Safety Verification Passed: 0 forbidden float signatures found in packages/core/money, risk, execute, edge.');
  process.exit(0);
}
