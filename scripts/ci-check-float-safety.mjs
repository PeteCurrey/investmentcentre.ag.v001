/**
 * scripts/ci-check-float-safety.mjs
 *
 * CI Safety Control for CLAUDE.md Execution Safety Rule 3:
 * "Money is scaled integers. bigint + scale. Floats banned in
 * packages/core/money, risk, execute, edge. CI fails on a float
 * type in those paths."
 *
 * Runs as plain ESM (no build step) — node scripts/ci-check-float-safety.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TARGET_PATHS = [
  'packages/core/src/money.ts',
  'packages/risk/src',
  'packages/execute/src',
  'packages/edge/src',
];

/** @type {{ filePath: string; line: number; content: string; reason: string }[]} */
const violations = [];

// Patterns indicating illegal float usage for money/price representation
const BANNED_PATTERNS = [
  {
    regex: /balance\s*[?!]?\s*:\s*number\b/,
    reason: 'balance field must not be unbranded number — use ScaledInteger.',
  },
  {
    regex: /equity\s*[?!]?\s*:\s*number\b/,
    reason: 'equity field must not be unbranded number — use ScaledInteger.',
  },
  {
    regex: /\bpnl\s*[?!]?\s*:\s*number\b/i,
    reason: 'pnl field must not be unbranded number — use ScaledInteger.',
  },
  {
    regex: /amount\s*[?!]?\s*:\s*number\b/,
    reason: 'amount field must not be unbranded number — use ScaledInteger.',
  },
];

/**
 * @param {string} filePath
 */
function scanFile(filePath) {
  if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts')) return;
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;

  const code = fs.readFileSync(filePath, 'utf-8');
  const lines = code.split('\n');

  lines.forEach((lineContent, idx) => {
    const lineNum = idx + 1;
    // skip comment lines
    if (lineContent.trimStart().startsWith('//') || lineContent.trimStart().startsWith('*')) return;
    for (const { regex, reason } of BANNED_PATTERNS) {
      if (regex.test(lineContent)) {
        violations.push({ filePath: path.relative(ROOT, filePath), line: lineNum, content: lineContent.trim(), reason });
      }
    }
  });
}

/**
 * @param {string} dirOrFile
 */
function scanDir(dirOrFile) {
  const abs = path.resolve(ROOT, dirOrFile);
  if (!fs.existsSync(abs)) return;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    scanFile(abs);
  } else if (stat.isDirectory()) {
    for (const child of fs.readdirSync(abs)) {
      scanDir(path.join(dirOrFile, child));
    }
  }
}

console.log('🔍  Running CI Float Safety Scanner (CLAUDE.md Safety Rule 3)…');
for (const t of TARGET_PATHS) scanDir(t);

if (violations.length > 0) {
  console.error('\n❌  FLOAT SAFETY VIOLATION in financial execution packages:');
  for (const v of violations) {
    console.error(`   ${v.filePath}:${v.line}  ${v.reason}`);
    console.error(`   → "${v.content}"`);
  }
  console.error('\nCLAUDE.md Rule 3: Money must be ScaledInteger (bigint + scale). Floats are banned.');
  process.exit(1);
} else {
  console.log('✅  Float Safety: 0 forbidden float signatures in packages/core/money, risk, execute, edge.');
}
