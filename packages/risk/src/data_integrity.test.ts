/**
 * Data Integrity Test — API Routes
 *
 * Asserts that no file under apps/terminal/src/app/api/ contains fabricated
 * trade signal strings (hardcoded RSI values, invented EMA trends, constructed
 * sentiment labels, or false RiskGate approval claims).
 *
 * These patterns were previously used as plausible-looking fallbacks when no
 * real signal data was available. They violate DATA INTEGRITY Rule 1 and Rule 3.
 *
 * EXCLUSION: trade-analysis/route.ts contains an LLM prompt template that asks
 * the AI to comment on RSI context — this is generated analysis, not a hardcoded
 * claim, and is explicitly out of scope.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

// ── File collection ───────────────────────────────────────────────────────────

const API_DIR = join(process.cwd(), 'apps/terminal/src/app/api');

const EXCLUDED_FILES = [
  'trade-analysis/route.ts', // LLM prompt template — generated analysis, not hardcoded claims
];

function collectTsFiles(dir: string, base: string = dir): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(base, full);
    if (statSync(full).isDirectory()) {
      results.push(...collectTsFiles(full, base));
    } else if (entry.endsWith('.ts') && !EXCLUDED_FILES.some((ex) => rel.endsWith(ex))) {
      results.push(full);
    }
  }
  return results;
}

// ── Forbidden patterns ────────────────────────────────────────────────────────

const FORBIDDEN_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  {
    label: 'Fabricated RSI label "RSI 14 neutral/aligned"',
    pattern: /RSI 14 neutral\/aligned/,
  },
  {
    label: 'Fabricated EMA trend label "EMA Trend"',
    pattern: /EMA Trend/,
  },
  {
    label: 'Fabricated sentiment label "Fundamental Sentiment"',
    pattern: /Fundamental Sentiment/,
  },
  {
    label: 'Fabricated sentiment label "News Sentiment: Market Session Bias"',
    pattern: /News Sentiment: Market Session Bias/,
  },
  {
    label: 'Fabricated RiskGate approval "FTMO Standard Profile Checked"',
    pattern: /FTMO Standard Profile Checked/,
  },
  {
    label: 'Fabricated fixed RSI numeric 48.5',
    pattern: /48\.5\b/,
  },
  {
    label: 'Demo OANDA order ID oanda_9872145',
    pattern: /oanda_9872145/,
  },
  {
    label: 'Demo OANDA order ID oanda_9874123',
    pattern: /oanda_9874123/,
  },
  {
    label: 'Demo OANDA order ID oanda_9875199',
    pattern: /oanda_9875199/,
  },
  {
    label: 'Client-exposed TIER_4_ENABLED in API route order path',
    pattern: /NEXT_PUBLIC_TIER_4_ENABLED/,
  },
  {
    label: 'Deprecated OANDA_API_TOKEN environment variable (must use OANDA_API_KEY)',
    pattern: /OANDA_API_TOKEN/,
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DATA INTEGRITY — API routes must not contain fabricated signal strings', () => {
  const files = collectTsFiles(API_DIR);

  it('should find TypeScript files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { label, pattern } of FORBIDDEN_PATTERNS) {
    it(`must not contain: ${label}`, () => {
      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (pattern.test(line)) {
            const rel = relative(API_DIR, file);
            violations.push(`  ${rel}:${idx + 1}: ${line.trim()}`);
          }
        });
      }
      if (violations.length > 0) {
        throw new Error(
          `Forbidden fabricated string found in API route(s):\n${violations.join('\n')}\n\n` +
          `This pattern is prohibited by DATA INTEGRITY Rule 1 (no seed data that looks real) ` +
          `and Rule 3 (no imputed values). Remove the string and ensure the field is null ` +
          `or absent when real data is unavailable.`
        );
      }
    });
  }
});
