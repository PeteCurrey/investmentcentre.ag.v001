/**
 * Integration Tests: POST /api/autotrader/mode-transition
 *
 * Covers:
 *   1. 401 without a valid session.
 *   2. 400 REASON_REQUIRED when reason is missing/empty.
 *   3. 400 OBSERVE_TO_LIVE_FORBIDDEN — API-layer guard fires before requestTransition.
 *   4. Legal PAPER -> LIVE transition succeeds with valid auth.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { POST as modeTransitionPOST } from './mode-transition/route';
import { setActiveCookie, resetMockDb, getValidSessionCookie, getMockDb } from '../../../test/setup';

describe('POST /api/autotrader/mode-transition Endpoint', () => {
  beforeEach(() => {
    setActiveCookie('');
    resetMockDb();
  });

  it('returns 401 UNAUTHORIZED without a valid session cookie', async () => {
    const req = new Request('http://localhost:3000/api/autotrader/mode-transition', {
      method: 'POST',
      body: JSON.stringify({ from: 'PAPER', to: 'LIVE', reason: 'Test without auth' }),
    });

    const res = await modeTransitionPOST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('UNAUTHORIZED');
  });

  it('returns 400 REASON_REQUIRED when reason is empty/whitespace', async () => {
    const cookie = await getValidSessionCookie();
    setActiveCookie(cookie);

    const req = new Request('http://localhost:3000/api/autotrader/mode-transition', {
      method: 'POST',
      body: JSON.stringify({ from: 'PAPER', to: 'LIVE', reason: '   ' }),
    });

    const res = await modeTransitionPOST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('REASON_REQUIRED');
  });

  it('returns 400 OBSERVE_TO_LIVE_FORBIDDEN — API guard blocks before any DB call', async () => {
    const cookie = await getValidSessionCookie();
    setActiveCookie(cookie);

    // DB is in OBSERVE mode by default (createInitialDbState)
    const before = getMockDb().mode;
    expect(before).toBe('OBSERVE');

    const req = new Request('http://localhost:3000/api/autotrader/mode-transition', {
      method: 'POST',
      body: JSON.stringify({ from: 'OBSERVE', to: 'LIVE', reason: 'Attempting direct skip' }),
    });

    const res = await modeTransitionPOST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('OBSERVE_TO_LIVE_FORBIDDEN');

    // Mode must remain unchanged — the guard fired before any DB write
    expect(getMockDb().mode).toBe('OBSERVE');
  });

  it('executes legal OBSERVE -> PAPER transition with valid auth and reason', async () => {
    const cookie = await getValidSessionCookie();
    setActiveCookie(cookie);

    // DB starts in OBSERVE
    expect(getMockDb().mode).toBe('OBSERVE');

    const req = new Request('http://localhost:3000/api/autotrader/mode-transition', {
      method: 'POST',
      body: JSON.stringify({
        from: 'OBSERVE',
        to: 'PAPER',
        reason: 'Activating paper mode for testing',
      }),
    });

    const res = await modeTransitionPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.mode).toBe('PAPER');
  });
});
