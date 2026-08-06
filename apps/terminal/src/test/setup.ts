/**
 * apps/terminal/src/test/setup.ts
 *
 * Mock environment & helper utilities for API route integration testing.
 */
import { vi } from 'vitest';
import { createSessionToken } from '../lib/auth';

export const TEST_SESSION_SECRET = 'valid_session_secret_for_testing_purposes_at_least_32_chars!';
export const TEST_CRON_SECRET = 'valid_cron_secret_for_testing_purposes_at_least_32_chars!';
export const TEST_HMAC_SECRET = 'valid_risk_hmac_secret_for_testing_at_least_32_chars!';

// Set environment variables required for tests
process.env.SESSION_SECRET = TEST_SESSION_SECRET;
process.env.CRON_SECRET = TEST_CRON_SECRET;
process.env.RISK_HMAC_SECRET = TEST_HMAC_SECRET;
process.env.OANDA_API_KEY = 'mock_oanda_api_key_12345';
process.env.OANDA_ACCOUNT_ID = '101-001-1234567-001';
process.env.OANDA_ENVIRONMENT = 'practice';
// Supabase stubs — real DB calls are mocked at the @meridian/core level
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test_anon_key_placeholder_for_unit_tests';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key_placeholder_for_unit_tests';
process.env.SUPABASE_SECRET_KEY = 'test_service_key_placeholder_for_unit_tests';
process.env.ECONOMIC_CALENDAR_URL = 'https://calendar.test/events';

let activeCookieHeader = '';

/** Helper to create a valid session cookie string for request headers */
export async function getValidSessionCookie(): Promise<string> {
  const token = await createSessionToken('test_operator');
  return `console_session=${token}`;
}

/** Set current active cookie header for next/headers mock */
export function setActiveCookie(cookieHeader: string) {
  activeCookieHeader = cookieHeader;
}

// Mock next/headers so getSession() can parse console_session in Vitest
vi.mock('next/headers', () => {
  return {
    cookies: async () => ({
      get: (name: string) => {
        if (!activeCookieHeader) return undefined;
        const cookies = activeCookieHeader.split(';').map(c => c.trim());
        const match = cookies.find(c => c.startsWith(`${name}=`));
        if (!match) return undefined;
        return { name, value: match.split('=')[1] };
      },
    }),
  };
});

/** Mock Database State */
export interface MockDbState {
  config: {
    selectedInstruments: string[];
    lotUnits: number;
    autoStopAt: string | null;
    autoStopLabel: string | null;
    riskProfile: {
      slPips: number;
      tpPips: number;
      useTrailingStop: boolean;
      trailingDistancePips: number;
      breakEvenTriggerPips: number;
      sendTpToOanda: boolean;
    };
  };
  mode: 'OBSERVE' | 'PAPER' | 'LIVE';
  gateDecisions: any[];
  cycleLogs: any[];
  accountDays: any[];
  trades: any[];
  cycleLocks: Set<string>;
}

export function createInitialDbState(): MockDbState {
  return {
    config: {
      selectedInstruments: ['GBP/USD', 'EUR/USD'],
      lotUnits: 1000,
      autoStopAt: null,
      autoStopLabel: null,
      riskProfile: {
        slPips: 30,
        tpPips: 60,
        useTrailingStop: false,
        trailingDistancePips: 15,
        breakEvenTriggerPips: 10,
        sendTpToOanda: true,
      },
    },
    mode: 'OBSERVE',
    gateDecisions: [],
    cycleLogs: [],
    accountDays: [],
    trades: [],
    cycleLocks: new Set<string>(),
  };
}

let mockDb = createInitialDbState();

export function resetMockDb() {
  mockDb = createInitialDbState();
}

export function getMockDb() {
  return mockDb;
}

// Mock @meridian/core DB & State functions
vi.mock('@meridian/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@meridian/core')>();
  return {
    ...actual,
    readAutotraderConfig: async () => ({ ...mockDb.config, mode: mockDb.mode }),
    writeAutotraderConfig: async (updates: any) => {
      if (updates.mode) mockDb.mode = updates.mode;
      mockDb.config = { ...mockDb.config, ...updates };
      return { ...mockDb.config, mode: mockDb.mode };
    },
    getMode: async () => mockDb.mode,
    setMode: async (mode: any) => {
      mockDb.mode = mode;
      return true;
    },
    // requestTransition: validates legal transitions and updates mockDb.mode
    requestTransition: async (from: string, to: string, actor: string, reason: string) => {
      if (!reason || reason.trim().length === 0) {
        return { ok: false, error: 'reason is mandatory and must be non-empty' };
      }
      const LEGAL: [string, string][] = [
        ['OBSERVE', 'PAPER'], ['PAPER', 'OBSERVE'],
        ['PAPER', 'LIVE'], ['LIVE', 'PAPER'], ['LIVE', 'OBSERVE'],
      ];
      if (!LEGAL.some(([f, t]) => f === from && t === to)) {
        return { ok: false, error: `Transition ${from}→${to} is not permitted.` };
      }
      // System actors may only transition downward to OBSERVE.
      if (actor.startsWith('system:') && to !== 'OBSERVE') {
        return { ok: false, error: `System actor '${actor}' may not transition to ${to}. Upward transitions require a human session.` };
      }
      if (mockDb.mode !== from) {
        return { ok: false, error: `Current mode is ${mockDb.mode}, not ${from}.` };
      }
      mockDb.mode = to as any;
      return { ok: true };
    },
    insertGateDecision: async (decision: any) => {
      mockDb.gateDecisions.push(decision);
      return true;
    },
    insertCycleLog: async (log: any) => {
      mockDb.cycleLogs.push(log);
      return true;
    },
    upsertAccountDay: async (d: any) => {
      const existingIdx = mockDb.accountDays.findIndex((a) => a.day_date === d.dayDate);
      if (existingIdx >= 0) {
        const existingHwm = BigInt(mockDb.accountDays[existingIdx].high_water_mark || '0');
        const newHwm = BigInt(d.highWaterMark);
        const finalHwm = existingHwm > newHwm ? existingHwm : newHwm;
        mockDb.accountDays[existingIdx] = {
          ...mockDb.accountDays[existingIdx],
          high_water_mark: String(finalHwm),
          high_water_mark_updated_at: d.highWaterMarkUpdatedAt,
        };
      } else {
        const maxPrevHwm = mockDb.accountDays.reduce(
          (max, a) => (BigInt(a.high_water_mark || '0') > max ? BigInt(a.high_water_mark) : max),
          0n
        );
        const newHwm = BigInt(d.highWaterMark);
        const finalHwm = maxPrevHwm > newHwm ? maxPrevHwm : newHwm;
        mockDb.accountDays.push({
          day_date: d.dayDate,
          opening_balance: String(d.openingBalance),
          opening_balance_captured_at: d.openingBalanceCapturedAt,
          high_water_mark: String(finalHwm),
          high_water_mark_updated_at: d.highWaterMarkUpdatedAt,
        });
      }
      return true;
    },
    acquireCycleLock: async (cycleId: string) => {
      if (mockDb.cycleLocks.size > 0) return false;
      mockDb.cycleLocks.add(cycleId);
      return true;
    },
    releaseCycleLock: async (cycleId: string) => {
      mockDb.cycleLocks.delete(cycleId);
      return true;
    },
    readTrades: async () => mockDb.trades,
    recordTradeToDb: async (trade: any) => {
      mockDb.trades.push(trade);
      return true;
    },
    readCycleLogTradeMap: async () => {
      const map: Record<string, any> = {};
      for (const log of mockDb.cycleLogs) {
        if (log.orderId) {
          const rawId = log.orderId.replace(/^(OANDA-|PAPER-)/, '');
          map[rawId] = log;
        }
      }
      return map;
    },
    getSupabaseClient: () => createMockSupabaseClient(),
    getSupabaseServiceClient: () => createMockSupabaseClient(),
    resetSupabaseClient: () => {},
    // Schema is always valid in tests — no real DB to check
    assertSchemaComplete: async () => { /* no-op */ },
    checkSchemaComplete: async () => ({ ok: true, missing: [], present: [] }),
  };
});

function createMockSupabaseClient() {
  const schemaObj = (schemaName: string) => ({
    from: (tableName: string) => {
      const queryFilters: Record<string, any> = {};
      let limitVal: number | null = null;

      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          queryFilters[col] = val;
          return builder;
        },
        order: () => builder,
        limit: (n: number) => {
          limitVal = n;
          return builder;
        },
        maybeSingle: async () => {
          if (tableName === 'account_day') {
            const dayDate = queryFilters['day_date'];
            const found = mockDb.accountDays.find((d) => !dayDate || d.day_date === dayDate);
            return { data: found || null, error: null };
          }
          return { data: null, error: null };
        },
        single: async () => {
          if (tableName === 'account_day') {
            const dayDate = queryFilters['day_date'];
            const found = mockDb.accountDays.find((d) => !dayDate || d.day_date === dayDate);
            return { data: found || null, error: null };
          }
          return { data: null, error: null };
        },
        insert: async (row: any) => {
          const item = Array.isArray(row) ? row[0] : row;
          if (tableName === 'account_day') {
            mockDb.accountDays.push(item);
          } else if (tableName === 'gate_decisions') {
            mockDb.gateDecisions.push(item);
          } else if (tableName === 'cycle_log') {
            mockDb.cycleLogs.push(item);
          }
          return { data: item, error: null };
        },
        update: async (updates: any) => {
          if (tableName === 'account_day') {
            const dayDate = queryFilters['day_date'];
            const found = mockDb.accountDays.find((d) => !dayDate || d.day_date === dayDate);
            if (found) Object.assign(found, updates);
          }
          return { data: updates, error: null };
        },
        delete: async () => ({ data: null, error: null }),
        rpc: async () => ({ data: true, error: null }),
        then: (onfulfilled: any) => {
          if (tableName === 'account_day') {
            const sorted = [...mockDb.accountDays].sort((a, b) =>
              BigInt(b.high_water_mark || '0') > BigInt(a.high_water_mark || '0') ? 1 : -1
            );
            const res = limitVal ? sorted.slice(0, limitVal) : sorted;
            return Promise.resolve({ data: res, error: null }).then(onfulfilled);
          }
          if (tableName === 'cycle_log') {
            return Promise.resolve({ data: mockDb.cycleLogs, error: null }).then(onfulfilled);
          }
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        },
      };
      return builder;
    },
  });

  return {
    schema: schemaObj,
    from: (tableName: string) => schemaObj('public').from(tableName),
  };
}

/** OANDA REST Mock Server setup */
export interface MockOandaConfig {
  accountBalance: string;
  accountEquity: string;
  unrealizedPL: string;
  openPositionCount: number;
  openTradeCount: number;
  prices: Record<string, string>; // e.g. { 'GBP_USD': '1.3000' }
  candles: Record<string, Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>>;
  positions: any[];
  trades: any[];
  shouldFailOrderSubmit?: boolean;
}

export function createDefaultOandaMockConfig(): MockOandaConfig {
  const now = new Date();
  const makeCandles = (basePrice: number) => {
    const list = [];
    for (let i = 50; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 15 * 60 * 1000).toISOString();
      const p = basePrice + (50 - i) * 0.0002;
      list.push({
        time: t,
        open: p - 0.0001,
        high: p + 0.0005,
        low: p - 0.0005,
        close: p,
        volume: 100,
      });
    }
    return list;
  };

  return {
    accountBalance: '100000.00',
    accountEquity: '100000.00',
    unrealizedPL: '0.00',
    openPositionCount: 0,
    openTradeCount: 0,
    prices: {
      'GBP_USD': '1.30000',
      'EUR_USD': '1.08500',
      'XAU_USD': '2380.00',
    },
    candles: {
      'GBP_USD_M15': makeCandles(1.3000),
      'GBP_USD_H1': makeCandles(1.3000),
      'EUR_USD_M15': makeCandles(1.0850),
      'EUR_USD_H1': makeCandles(1.0850),
      'XAU_USD_M15': makeCandles(2380.00),
      'XAU_USD_H1': makeCandles(2380.00),
    },
    positions: [],
    trades: [],
  };
}

let oandaMock = createDefaultOandaMockConfig();

export function setOandaMockConfig(config: Partial<MockOandaConfig>) {
  oandaMock = { ...oandaMock, ...config };
}

export function resetOandaMockConfig() {
  oandaMock = createDefaultOandaMockConfig();
}

export function getOandaMockConfig() {
  return oandaMock;
}

// Global fetch interceptor for OANDA API endpoints
const originalFetch = globalThis.fetch;

export function setupFetchMock() {
  globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    // Calendar Endpoint Mock
    if (url.includes('calendar.test')) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // OANDA Account Summary Endpoint
    if (url.includes('/v3/accounts/') && url.includes('/summary')) {
      return new Response(
        JSON.stringify({
          account: {
            id: '101-001-1234567-001',
            balance: oandaMock.accountBalance,
            NAV: oandaMock.accountEquity,
            unrealizedPL: oandaMock.unrealizedPL,
            openPositionCount: oandaMock.openPositionCount,
            openTradeCount: oandaMock.openTradeCount,
            currency: 'USD',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // OANDA Pricing Endpoint
    if (url.includes('/v3/accounts/') && url.includes('/pricing')) {
      const urlObj = new URL(url);
      const instrumentsParam = urlObj.searchParams.get('instruments') || '';
      const symbols = instrumentsParam.split(',').map(s => s.trim());
      const prices = symbols
        .filter(s => oandaMock.prices[s] !== undefined)
        .map(s => {
          const spot = oandaMock.prices[s];
          const spotNum = parseFloat(spot);
          let pipVal = 0.0001;
          if (s.includes('JPY')) pipVal = 0.01;
          else if (s.startsWith('XAU') || s.startsWith('SPX')) pipVal = 1.0;
          const bidPrice = (spotNum - pipVal * 0.5).toFixed(5);
          const askPrice = (spotNum + pipVal * 0.5).toFixed(5);
          return {
            instrument: s,
            time: new Date().toISOString(),
            bids: [{ price: bidPrice, liquidity: 1000000 }],
            asks: [{ price: askPrice, liquidity: 1000000 }],
            tradeable: true,
          };
        });
      return new Response(JSON.stringify({ prices }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // OANDA Candles Endpoint
    if (url.includes('/v3/instruments/') && url.includes('/candles')) {
      const match = url.match(/\/v3\/instruments\/([^\/]+)\/candles/);
      const symbol = match ? match[1] : 'GBP_USD';
      const urlObj = new URL(url);
      const gran = urlObj.searchParams.get('granularity') || 'M15';
      const key = `${symbol}_${gran}`;
      const rawBars = oandaMock.candles[key] || oandaMock.candles['GBP_USD_M15'] || [];

      const candles = rawBars.map(b => ({
        complete: true,
        volume: b.volume,
        time: b.time,
        mid: {
          o: b.open.toFixed(5),
          h: b.high.toFixed(5),
          l: b.low.toFixed(5),
          c: b.close.toFixed(5),
        },
      }));

      return new Response(JSON.stringify({ candles }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // OANDA openTrades Endpoint
    if (url.includes('/v3/accounts/') && url.includes('/openTrades')) {
      return new Response(JSON.stringify({ trades: oandaMock.trades.filter(t => t.state !== 'CLOSED') }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // OANDA Positions Endpoint
    if (url.includes('/v3/accounts/') && url.includes('/openPositions')) {
      return new Response(JSON.stringify({ positions: oandaMock.positions }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // OANDA Orders Endpoint (Submit Order)
    if (url.includes('/v3/accounts/') && url.includes('/orders')) {
      if (oandaMock.shouldFailOrderSubmit) {
        return new Response(JSON.stringify({ errorMessage: 'OANDA rejected order' }), { status: 400 });
      }
      return new Response(
        JSON.stringify({
          orderCreateTransaction: { id: 'order_101', price: '1.30000' },
          orderFillTransaction: { id: 'fill_101', price: '1.30000' },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // OANDA single trade by ID Endpoint (e.g. /v3/accounts/101-001.../trades/trade_101)
    const singleTradeMatch = url.match(/\/v3\/accounts\/[^\/]+\/trades\/([^\/\?]+)/);
    if (singleTradeMatch) {
      const tradeId = singleTradeMatch[1];
      const found = oandaMock.trades.find(t => t.id === tradeId);
      if (!found) {
        return new Response(JSON.stringify({ errorMessage: 'Trade not found' }), { status: 404 });
      }
      return new Response(JSON.stringify({ trade: found }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // OANDA all trades list Endpoint
    if (url.includes('/v3/accounts/') && url.includes('/trades')) {
      return new Response(JSON.stringify({ trades: oandaMock.trades }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fallback to original fetch for non-OANDA URLs
    return originalFetch(input, init);
  }) as any;
}

export function restoreFetchMock() {
  globalThis.fetch = originalFetch;
}
