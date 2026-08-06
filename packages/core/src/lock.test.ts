/**
 * packages/core/src/lock.test.ts
 *
 * Unit tests for acquireCycleLock / releaseCycleLock.
 *
 * Uses vi.mock to replace getSupabaseServiceClient with a controllable stub.
 * Tests verify:
 *   1. Successful acquisition returns true.
 *   2. Unique-constraint violation (PG 23505) returns false (lock held by another).
 *   3. Any other DB error during INSERT throws loudly rather than returning false.
 *   4. DELETE error throws loudly rather than being silently swallowed.
 *   5. Release succeeds when DELETE returns no error.
 *   6. Release throws when DELETE returns an error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dbModule from './db';

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockLt = vi.fn();
const mockInsert = vi.fn();

// Build chainable supabase-js stub
function makeChain(terminalResult: { error: unknown }) {
  const chain = {
    delete: () => chain,
    eq: () => chain,
    lt: () => terminalResult,
    insert: () => terminalResult,
  };
  return chain;
}

vi.mock('./db', async (importOriginal) => {
  const original = await importOriginal<typeof dbModule>();
  return {
    ...original,
    getSupabaseServiceClient: vi.fn(),
  };
});

function setupClient(deleteResult: { error: unknown }, insertResult: { error: unknown }) {
  const client = {
    from: vi.fn().mockImplementation(() => ({
      delete: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() => ({
          lt: vi.fn().mockResolvedValue(deleteResult),
          eq: vi.fn().mockResolvedValue(deleteResult),
        })),
      })),
      insert: vi.fn().mockResolvedValue(insertResult),
    })),
  };
  vi.mocked(dbModule.getSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof dbModule.getSupabaseServiceClient>);
  return client;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('acquireCycleLock', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns true when both DELETE and INSERT succeed', async () => {
    setupClient({ error: null }, { error: null });
    const { acquireCycleLock } = await import('./lock');
    const result = await acquireCycleLock('cycle-abc');
    expect(result).toBe(true);
  });

  it('returns false when INSERT fails with PG 23505 (unique violation = lock held)', async () => {
    const uniqueViolation = { code: '23505', message: 'duplicate key value violates unique constraint "execution_lock_pkey"', details: '', hint: '' };
    setupClient({ error: null }, { error: uniqueViolation });
    const { acquireCycleLock } = await import('./lock');
    const result = await acquireCycleLock('cycle-abc');
    expect(result).toBe(false);
  });

  it('throws when INSERT fails with a non-23505 error (infrastructure failure)', async () => {
    const infraError = { code: '42P01', message: 'relation "meridian.execution_lock" does not exist', details: '', hint: '' };
    setupClient({ error: null }, { error: infraError });
    const { acquireCycleLock } = await import('./lock');
    await expect(acquireCycleLock('cycle-abc')).rejects.toThrow(/42P01/);
  });

  it('throws when DELETE fails (cleanup error = infrastructure failure)', async () => {
    const deleteError = { code: '42P01', message: 'relation "meridian.execution_lock" does not exist', details: '', hint: '' };
    // DELETE fails, so INSERT never runs
    setupClient({ error: deleteError }, { error: null });
    const { acquireCycleLock } = await import('./lock');
    await expect(acquireCycleLock('cycle-abc')).rejects.toThrow(/infrastructure failure/i);
  });
});

describe('releaseCycleLock', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('resolves without throwing when DELETE succeeds', async () => {
    const client = {
      from: vi.fn().mockImplementation(() => ({
        delete: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
    vi.mocked(dbModule.getSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof dbModule.getSupabaseServiceClient>);

    const { releaseCycleLock } = await import('./lock');
    await expect(releaseCycleLock('cycle-abc')).resolves.toBeUndefined();
  });

  it('throws when DELETE fails', async () => {
    const releaseError = { code: '42P01', message: 'relation does not exist', details: '', hint: '' };
    const client = {
      from: vi.fn().mockImplementation(() => ({
        delete: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockResolvedValue({ error: releaseError }),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
    vi.mocked(dbModule.getSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof dbModule.getSupabaseServiceClient>);

    const { releaseCycleLock } = await import('./lock');
    await expect(releaseCycleLock('cycle-abc')).rejects.toThrow(/Lock release failure/);
  });
});
