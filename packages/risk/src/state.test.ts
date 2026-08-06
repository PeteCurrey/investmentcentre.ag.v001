import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAccountRiskState, StateAdapter, getTradingDayStart } from './state';

// Mock @meridian/core's getSupabaseServiceClient and logger
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

const mockSbClient = {
  schema: vi.fn(() => mockSbClient),
  from: vi.fn(() => mockSbClient),
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
  maybeSingle: mockMaybeSingle,
  order: mockOrder,
  limit: mockLimit,
};

vi.mock('@meridian/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@meridian/core')>();
  return {
    ...actual,
    getSupabaseServiceClient: () => mockSbClient,
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

describe('buildAccountRiskState account_day multi-day isolation', () => {
  const mockAdapter: StateAdapter = {
    getAccountState: async () => ({
      success: true,
      value: {
        balance: { price: 10259208n, scale: 2, currency: 'GBP' },
        equity: { price: 10259508n, scale: 2, currency: 'GBP' },
        unrealizedPnl: { price: 300n, scale: 2, currency: 'GBP' },
        openPositionsCount: 0,
        currency: 'GBP',
      },
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sources startingDailyBalance strictly from current trading day row while highWaterMark uses max across days", async () => {
    const { dayDate } = getTradingDayStart();

    // Mock Query A (today's row) -> returns today's opening balance 10259208
    // Mock Query B (max HWM across all days) -> returns yesterday's HWM 10286814
    mockSbClient.select.mockImplementation((fields: string) => {
      if (fields === 'opening_balance, high_water_mark') {
        return {
          eq: vi.fn().mockImplementation((col: string, val: string) => {
            expect(col).toBe('day_date');
            expect(val).toBe(dayDate);
            return {
              maybeSingle: async () => ({
                data: { opening_balance: '10259208', high_water_mark: '10259508' },
                error: null,
              }),
            };
          }),
        };
      }
      if (fields === 'high_water_mark') {
        return {
          order: vi.fn().mockReturnValue({
            limit: async () => ({
              data: [{ high_water_mark: '10286814' }],
              error: null,
            }),
          }),
        };
      }
      return mockSbClient;
    });

    const state = await buildAccountRiskState(mockAdapter, '101-004-39906540-001');

    // ASSERT: startingDailyBalance MUST equal today's opening balance (10259208), NOT yesterday's (10286814)
    expect(state.startingDailyBalance).toBe(10259208n);
    // ASSERT: highWaterMark MUST reflect max across all days (10286814)
    expect(state.highWaterMark).toBe(10286814n);
  });

  it('throws ACCOUNT_DAY_MISSING when today row creation fails and startingDailyBalance is null', async () => {
    mockSbClient.select.mockImplementation((fields: string) => {
      if (fields === 'opening_balance, high_water_mark') {
        return {
          eq: vi.fn().mockReturnValue({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        };
      }
      if (fields === 'high_water_mark') {
        return {
          order: vi.fn().mockReturnValue({
            limit: async () => ({ data: [], error: null }),
          }),
        };
      }
      return mockSbClient;
    });

    mockSbClient.insert.mockImplementation(async () => ({
      error: { message: 'Database constraint failure' },
    }));

    await expect(
      buildAccountRiskState(mockAdapter, '101-004-39906540-001')
    ).rejects.toThrow('ACCOUNT_DAY_MISSING');
  });
});
