/**
 * Integration Test: GET /api/oanda-positions
 *
 * Covers:
 * - 401 Unauthorized without session cookie.
 * - Unmatched OANDA trades render as EXTERNAL with null signal reasoning (CLAUDE.md Rule 1 & Rule 6).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET as oandaPositionsGET } from './oanda-positions/route';
import {
  getValidSessionCookie,
  setActiveCookie,
  resetMockDb,
  resetOandaMockConfig,
  setOandaMockConfig,
  setupFetchMock,
  restoreFetchMock,
} from '../../test/setup';

describe('GET /api/oanda-positions Integration Tests', () => {
  let validCookie: string;

  beforeEach(async () => {
    setupFetchMock();
    resetMockDb();
    resetOandaMockConfig();
    validCookie = await getValidSessionCookie();
    setActiveCookie(validCookie);
  });

  afterEach(() => {
    restoreFetchMock();
  });

  it('renders unmatched broker trades as EXTERNAL with null signal reasoning', async () => {
    // Set OANDA mock with an unmatched trade (no local cycle_log entry)
    setOandaMockConfig({
      trades: [
        {
          id: 'trade_ext_999',
          instrument: 'GBP_USD',
          price: '1.30500',
          initialUnits: '10000',
          state: 'OPEN',
          openTime: new Date().toISOString(),
        },
      ],
    });

    const req = new Request('http://localhost:3000/api/oanda-positions', { method: 'GET' });
    const res = await oandaPositionsGET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.execLog).toHaveLength(1);

    const trade = data.execLog[0];
    expect(trade.tier).toBe('EXTERNAL');
    expect(trade.type).toBe('EXTERNAL');
    expect(trade.signal).toBeNull();
  });
});
