/**
 * scripts/ci-check-data-integrity.mjs
 *
 * CI Safety Control for CLAUDE.md Data Integrity Rules 1 & 6:
 * "No mock data. No fixture data. No seed data that looks real."
 * "Everything generated cites its evidence."
 *
 * Scans for fabricated technical indicators, hardcoded sentiment, and
 * invented trade IDs that have previously appeared in route code.
 *
 * Runs as plain ESM (no build step) — node scripts/ci-check-data-integrity.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SEARCH_DIRS = ['apps', 'packages'];

/** @type {{ filePath: string; line: number; content: string; pattern: string }[]} */
const violations = [];

const FORBIDDEN_PATTERNS = [
  {
    regex: /Technical Indicators: RSI 14=/i,
    pattern: 'Fabricated RSI string literal in trade log',
  },
  {
    regex: /Fundamental Sentiment: Bullish \(\+0\.42\)/i,
    pattern: 'Fabricated sentiment constant (+0.42)',
  },
  {
    regex: /48\.5 \+ \(direction === ['"]BUY['"]/i,
    pattern: 'Direction-derived fake RSI formula (48.5)',
  },
  {
    regex: /\[AUTOMATED TIER 4 EXECUTION\].*RSI 14 neutral/i,
    pattern: 'Fabricated OANDA trade reasoning with invented RSI',
  },
  {
    regex: /\boanda_987\b/i,
    pattern: 'Hardcoded fake trade ID (oanda_987)',
  },
  {
    regex: /News Sentiment: Moderate/i,
    pattern: 'Fabricated news sentiment string literal',
  },
];

/**
 * @param {string} filePath
 */
function scanFile(filePath) {
  // Skip test files — they may legitimately test for the presence/absence of these strings
  if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts') || filePath.endsWith('.test.mjs')) return;
  // Only scan source files
  if (!/\.(ts|tsx|mts|js|mjs)$/.test(filePath)) return;
  // Skip node_modules and .next build output
  if (filePath.includes('node_modules') || filePath.includes('/.next/')) return;

  const code = fs.readFileSync(filePath, 'utf-8');
  const lines = code.split('\n');

  lines.forEach((lineContent, idx) => {
    const lineNum = idx + 1;
    // skip pure comment lines
    if (lineContent.trimStart().startsWith('//') || lineContent.trimStart().startsWith('*')) return;
    for (const { regex, pattern } of FORBIDDEN_PATTERNS) {
      if (regex.test(lineContent)) {
        violations.push({ filePath: path.relative(ROOT, filePath), line: lineNum, content: lineContent.trim(), pattern });
      }
    }
  });
}

/**
 * @param {string} dirPath
 */
function scanDir(dirPath) {
  const abs = path.resolve(ROOT, dirPath);
  if (!fs.existsSync(abs)) return;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    scanFile(abs);
  } else if (stat.isDirectory()) {
    for (const child of fs.readdirSync(abs)) {
      // skip hidden dirs and node_modules
      if (child.startsWith('.') || child === 'node_modules') continue;
      scanDir(path.join(dirPath, child));
    }
  }
}

console.log('🔍  Running CI Data Integrity Scanner (CLAUDE.md Rules 1 & 6)…');
for (const dir of SEARCH_DIRS) scanDir(dir);

if (violations.length > 0) {
  console.error('\n❌  DATA INTEGRITY VIOLATION:');
  for (const v of violations) {
    console.error(`   ${v.filePath}:${v.line}  ${v.pattern}`);
    console.error(`   → "${v.content}"`);
  }
  console.error('\nCLAUDE.md Rule 1 & 6: No fabricated indicator literals or fake sentiment values in production code.');
  process.exit(1);
} else {
  console.log('✅  Data Integrity: 0 fabricated data literals found across apps/ and packages/.');
}
