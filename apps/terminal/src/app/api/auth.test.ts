/**
 * Integration Test: Auth Boundary across all apps/terminal API routes
 * Task Requirement: "Every route returns 401 without a valid session."
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { POST as runCyclePOST } from './autotrader/run-cycle/route';
import { POST as modifyTradePOST } from './autotrader/modify-trade/route';
import { POST as autotraderConfigPOST } from './autotrader/route';
import { POST as tradePOST } from './trade/route';
import { POST as closeTradePOST } from './close-trade/route';
import { GET as oandaPositionsGET } from './oanda-positions/route';
import { POST as modeTransitionPOST } from './autotrader/mode-transition/route';
import { setActiveCookie, resetMockDb } from '../../test/setup';

describe('apps/terminal API Routes Auth Boundary', () => {
  beforeEach(() => {
    setActiveCookie('');
    resetMockDb();
  });

  it('POST /api/autotrader/mode-transition returns 401 without session', async () => {
    const req = new Request('http://localhost:3000/api/autotrader/mode-transition', {
      method: 'POST',
      body: JSON.stringify({ from: 'PAPER', to: 'LIVE', reason: 'Test' }),
    });
    const res = await modeTransitionPOST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('UNAUTHORIZED');
  });

  it('POST /api/autotrader/run-cycle returns 401 without session or x-cron-secret header', async () => {
    const req = new Request('http://localhost:3000/api/autotrader/run-cycle', { method: 'POST' });
    const res = await runCyclePOST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('UNAUTHORIZED');
  });

  it('POST /api/autotrader/modify-trade returns 401 without session', async () => {
    const req = new Request('http://localhost:3000/api/autotrader/modify-trade', {
      method: 'POST',
      body: JSON.stringify({ tradeId: 't1', move_sl: '1.3000' }),
    });
    const res = await modifyTradePOST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('UNAUTHORIZED');
  });

  it('POST /api/autotrader config endpoint returns 401 without session', async () => {
    const req = new Request('http://localhost:3000/api/autotrader', {
      method: 'POST',
      body: JSON.stringify({ enabled: true }),
    });
    const res = await autotraderConfigPOST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('UNAUTHORIZED');
  });

  it('POST /api/trade returns 401 without session', async () => {
    const req = new Request('http://localhost:3000/api/trade', {
      method: 'POST',
      body: JSON.stringify({ instrument: 'GBP/USD', direction: 'BUY', units: 1000 }),
    });
    const res = await tradePOST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('UNAUTHORIZED');
  });

  it('POST /api/close-trade returns 401 without session', async () => {
    const req = new Request('http://localhost:3000/api/close-trade', {
      method: 'POST',
      body: JSON.stringify({ tradeId: 't1' }),
    });
    const res = await closeTradePOST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('UNAUTHORIZED');
  });

  it('GET /api/oanda-positions returns 401 without session', async () => {
    const req = new Request('http://localhost:3000/api/oanda-positions', { method: 'GET' });
    const res = await oandaPositionsGET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('UNAUTHORIZED');
  });
});
