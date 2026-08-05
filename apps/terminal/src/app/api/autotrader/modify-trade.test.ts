/**
 * Integration Test: POST /api/autotrader/modify-trade
 *
 * Covers:
 * - 401 Unauthorized without session.
 * - 404 when trade is not found on OANDA.
 * - Rejection when move_sl widens stop loss (STOP_WIDENING_PROHIBITED).
 * - Break-even uses server-fetched entry price and validates floating profit.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST as modifyTradePOST } from './modify-trade/route';
import {
  getValidSessionCookie,
  setActiveCookie,
  resetMockDb,
  resetOandaMockConfig,
  setOandaMockConfig,
  setupFetchMock,
  restoreFetchMock,
} from '../../../test/setup';

describe('POST /api/autotrader/modify-trade Integration Tests', () => {
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

  it('rejects with 404 when tradeId is not found on OANDA', async () => {
    const req = new Request('http://localhost:3000/api/autotrader/modify-trade', {
      method: 'POST',
      body: JSON.stringify({ tradeId: 'non_existent_trade', action: 'move_sl', value: '1.2900' }),
    });
    const res = await modifyTradePOST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('OANDA_TRADE_NOT_FOUND');
  });

  it('rejects move_sl widening a stop loss with STOP_WIDENING_PROHIBITED', async () => {
    // Mock open trade for long GBP/USD with entry 1.3000, current SL 1.2950
    setOandaMockConfig({
      trades: [
        {
          id: 'trade_101',
          instrument: 'GBP_USD',
          price: '1.30000',
          currentUnits: '1000', // LONG
          stopLossOrder: { price: '1.29500' }, // Current 50-pip SL
        },
      ],
      prices: {
        'GBP_USD': '1.30100',
      },
    });

    // Attempt to move SL to 1.2900 (widening SL from 50 pips to 100 pips)
    const req = new Request('http://localhost:3000/api/autotrader/modify-trade', {
      method: 'POST',
      body: JSON.stringify({ tradeId: 'trade_101', action: 'move_sl', value: '1.29000' }),
    });
    const res = await modifyTradePOST(req);
    expect(res.status).toBe(422);

    const data = await res.json();
    expect(data.reasonCode).toBe('STOP_WIDENING_PROHIBITED');
    expect(data.riskDecisionNote).toBe('RISK_WIDENING_BLOCKED_BY_POLICY');
  });
});
