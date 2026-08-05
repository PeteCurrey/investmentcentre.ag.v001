/**
 * scripts/ci-check-data-integrity.ts
 *
 * CI Safety Control for CLAUDE.md Data Integrity Rules 1 & 6:
 * "No mock data. No fixture data. No seed data that looks real.
 * Everything generated cites its evidence; a claim that cannot cite does not render."
 *
 * Scans codebase for fabricated technical indicators, hardcoded fallback sentiment values,
 * and invented trade IDs.
 */
import fs from 'fs';
import path from 'path';

const SEARCH_DIRS = ['apps', 'packages'];

interface Violation {
  filePath: string;
  line: number;
  content: string;
  pattern: string;
}

const violations: Violation[] = [];

// Patterns indicating fabricated/fake trade data literals
const FORBIDDEN_PATTERNS = [
  {
    regex: /Technical Indicators: RSI 14=/i,
    pattern: 'Fabricated RSI string literal',
  },
  {
    regex: /Fundamental Sentiment: Bullish \(\+0\.42\)/i,
    pattern: 'Fabricated sentiment constant (+0.42)',
  },
  {
    regex: /48\.5 \+ \(direction === 'BUY'/i,
    pattern: 'Direction-derived fake RSI formula (48.5)',
  },
  {
    regex: /\[AUTOMATED TIER 4 EXECUTION\] \.\.\. RSI 14 neutral\/aligned/i,
    pattern: 'Fabricated OANDA trade reasoning string',
  },
  {
    regex: /\boanda_987\b/i,
    pattern: 'Hardcoded fake trade ID (oanda_987)',
  },
];

function scanFile(filePath: string) {
  if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts')) return;
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;

  const code = fs.readFileSync(filePath, 'utf-8');
  const lines = code.split('\n');

  lines.forEach((lineContent, idx) => {
    const lineNum = idx + 1;
    for (const item of FORBIDDEN_PATTERNS) {
      if (item.regex.test(lineContent)) {
        violations.push({
          filePath,
          line: lineNum,
          content: lineContent.trim(),
          pattern: item.pattern,
        });
      }
    }
  });
}

function scanDir(dirPath: string) {
  const absolutePath = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(absolutePath)) return;

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    scanFile(absolutePath);
  } else if (stat.isDirectory()) {
    const files = fs.readdirSync(absolutePath);
    for (const file of files) {
      scanDir(path.join(dirPath, file));
    }
  }
}

console.log('🔍 Running CI Data Integrity Grep Scanner (CLAUDE.md Rules 1 & 6)...');

for (const dir of SEARCH_DIRS) {
  scanDir(dir);
}

if (violations.length > 0) {
  console.error('\n❌ DATA INTEGRITY VIOLATION DETECTED:');
  for (const v of violations) {
    console.error(`  - ${v.filePath}:${v.line} -> ${v.pattern}`);
    console.error(`    Code: "${v.content}"`);
  }
  console.error('\nCLAUDE.md Rule 1 & Rule 6: No mock data or fake indicator literals allowed in production code.');
  process.exit(1);
} else {
  console.log('✅ Data Integrity Verification Passed: 0 fabricated data literals found across apps/ and packages/.');
  process.exit(0);
}
