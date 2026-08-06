/**
 * packages/risk/src/state.ts
 *
 * Single shared module for constructing AccountRiskState.
 * THIS IS THE ONLY PLACE IN THE CODEBASE WHERE AccountRiskState IS CONSTRUCTED.
 */

/**
 * Minimal broker adapter interface required by buildAccountRiskState.
 * We intentionally do NOT import BrokerAdapter from @meridian/execute here
 * because @meridian/execute depends on @meridian/risk, creating a circular
 * dependency at build time. TypeScript structural typing means any adapter
 * that satisfies this shape will work.
 */
export interface StateAdapter {
  getAccountState(accountId: string): Promise<{
    success: boolean;
    value?: {
      balance: { price: bigint; scale: number; currency: string };
      equity: { price: bigint; scale: number; currency: string };
      unrealizedPnl: { price: bigint; scale: number; currency: string };
      openPositionsCount: number;
      currency: string;
    };
    error?: { message: string };
  }>;
  /** Optional — populate openPositions in AccountRiskState when available.
   *  Return shape is structurally compatible with BrokerPosition from @meridian/execute,
   *  but typed here without importing that package to avoid a circular dependency. */
  getPositions?(accountId: string): Promise<{
    success: boolean;
    value?: Array<{
      id: string;
      instrument: string;
      units: bigint;
      entryPrice: { price: bigint; scale: number; currency: string };
      unrealizedPnl: { price: bigint; scale: number; currency: string };
      openedAt: string;
      source: string;
      fetchedAt: string;
    }>;
    error?: { message: string };
  }>;
}
import { type ScaledInteger, getSupabaseServiceClient, createLogger } from '@meridian/core';
import { type AccountRiskState, type OpenPositionRisk } from './types';
import { checkNewsBlackoutStatus } from './calendar';

const log = createLogger('AccountRiskStateBuilder');

export interface BuildAccountRiskStateOptions {
  instrument?: string;
  quoteToAccountRates?: Record<string, number>;
  currentSpreadPips?: number;
}

/**
 * Calculates the ISO timestamp of the OANDA daily rollover (17:00 America/New_York).
 */
export function getOandaDayResetIso(now = new Date()): string {
  const nyDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const nyHour = parseInt(
    now.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
    }),
    10
  );

  let targetDateStr = nyDateStr;
  if (nyHour < 17) {
    const prev = new Date(now.getTime() - 24 * 3600 * 1000);
    targetDateStr = prev.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  }

  const dEst = new Date(`${targetDateStr}T17:00:00-05:00`);
  const estHour = parseInt(
    dEst.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
    }),
    10
  );

  if (estHour === 17) {
    return dEst.toISOString();
  }
  const dEdt = new Date(`${targetDateStr}T17:00:00-04:00`);
  return dEdt.toISOString();
}

/**
 * Build a single, authoritative AccountRiskState object for RiskGate evaluation.
 * THIS IS THE ONLY PLACE IN THE CODEBASE THAT CONSTRUCTS THIS OBJECT.
 */
export async function buildAccountRiskState(
  adapter: StateAdapter,
  accountId: string,
  options?: BuildAccountRiskStateOptions
): Promise<AccountRiskState> {
  const stateRes = await adapter.getAccountState(accountId);
  if (!stateRes.success || !stateRes.value) {
    throw new Error(`BROKER_ACCOUNT_SYNC_FAILED: ${stateRes.error?.message ?? 'Unknown error'}`);
  }
  const accountState = stateRes.value;
  if (!accountState.currency || typeof accountState.currency !== 'string') {
    throw new Error('ACCOUNT_CURRENCY_MISSING: OANDA broker account state is missing required currency field.');
  }
  const accountCurrency = accountState.currency.toUpperCase();
  const currentBalance = accountState.balance.price as ScaledInteger;
  const currentEquity = accountState.equity.price as ScaledInteger;

  // 2. Fetch OANDA realized PnL today (since 17:00 ET day rollover)
  const dayResetIso = getOandaDayResetIso();
  let realizedPnlToday = 0n as ScaledInteger;

  // Duck-type check: any adapter that implements getRealizedPnlToday is supported.
  // We intentionally avoid importing OandaBrokerAdapter directly to prevent a
  // circular dependency cycle between @meridian/risk and @meridian/execute.
  const adapterWithPnl = adapter as unknown as Record<string, unknown>;
  if (typeof adapterWithPnl['getRealizedPnlToday'] === 'function') {
    const pnlRes = await (adapterWithPnl['getRealizedPnlToday'] as (
      accountId: string,
      sinceIso: string
    ) => Promise<{ success: boolean; value?: ScaledInteger; error?: { message: string } }>)(
      accountId,
      dayResetIso
    );
    if (pnlRes && pnlRes.success && pnlRes.value !== undefined) {
      realizedPnlToday = pnlRes.value;
    }
  }

  // 3. Read/upsert startingDailyBalance and highWaterMark from meridian.account_day
  //
  // DATE STRATEGY
  // The OANDA trading day resets at 17:00 America/New_York, not at UTC midnight.
  // We key account_day rows by UTC calendar date (dayDate = today's YYYY-MM-DD in
  // UTC) rather than by the OANDA-reset ISO timestamp for two reasons:
  //   a) The OANDA reset at ~21:00 UTC falls within the same UTC calendar date as
  //      the session that follows it until ~00:00 UTC — only a small 3-hour window
  //      would ever straddle a UTC date boundary.
  //   b) The spurious pattern observed in production (yesterday's row supplying
  //      today's startingDailyBalance) arose because getOandaDayResetIso returns
  //      the start-of-current-session timestamp, whose date matches yesterday even
  //      while cycles run today.
  //
  // TWO DISTINCT QUERIES (intentional):
  //   Query A  — today's UTC-date row  →  startingDailyBalance  (must exist)
  //   Query B  — MAX over all rows     →  highWaterMark          (all-time peak)
  let startingDailyBalance: ScaledInteger | null = null;
  let storedHwm: ScaledInteger = currentEquity;

  // Today's key is the UTC calendar date, independent of OANDA day reset time.
  const utcToday = new Date().toISOString().substring(0, 10);

  try {
    const sb = getSupabaseServiceClient();

    // Query A: today's row for startingDailyBalance
    const { data: todayRow, error: todayErr } = await sb
      .schema('meridian')
      .from('account_day')
      .select('opening_balance, high_water_mark')
      .eq('day_date', utcToday)
      .maybeSingle();

    if (todayErr) {
      log.error('account_day today-row query failed', { error: todayErr.message });
    }

    // Query B: all-time high water mark across every day (independent of today)
    const { data: maxRows, error: maxErr } = await sb
      .schema('meridian')
      .from('account_day')
      .select('high_water_mark')
      .order('high_water_mark', { ascending: false })
      .limit(1);

    if (maxErr) {
      log.error('account_day hwm-max query failed', { error: maxErr.message });
    }

    const maxEverHwm =
      maxRows && maxRows.length > 0
        ? (BigInt(maxRows[0].high_water_mark) as ScaledInteger)
        : (0n as ScaledInteger);

    if (todayRow) {
      // Today's row exists — use its opening_balance as the daily-loss baseline.
      startingDailyBalance = BigInt(todayRow.opening_balance) as ScaledInteger;
      const rowHwm = BigInt(todayRow.high_water_mark) as ScaledInteger;
      // storedHwm = max(today's stored hwm, all-time max across all days)
      storedHwm = rowHwm > maxEverHwm ? rowHwm : maxEverHwm;

      // Monotonically advance HWM if current equity exceeds both stored values
      if (currentEquity > storedHwm) {
        storedHwm = currentEquity;
        await sb
          .schema('meridian')
          .from('account_day')
          .update({
            high_water_mark: String(currentEquity),
            high_water_mark_updated_at: new Date().toISOString(),
          })
          .eq('day_date', utcToday);
      }
    } else {
      // No row for today yet — create one with current balance as opening.
      // This happens on the first cycle of each calendar day.
      storedHwm = currentEquity > maxEverHwm ? currentEquity : maxEverHwm;
      startingDailyBalance = currentBalance;

      const { error: insertErr } = await sb
        .schema('meridian')
        .from('account_day')
        .insert({
          day_date: utcToday,
          opening_balance: String(currentBalance),
          opening_balance_captured_at: new Date().toISOString(),
          high_water_mark: String(storedHwm),
          high_water_mark_updated_at: new Date().toISOString(),
        });

      if (insertErr) {
        log.error('Failed to insert account_day row for today — will reject this cycle', {
          error: insertErr.message,
          utcToday,
        });
        // Null out so the guard below rejects rather than trading on a stale baseline.
        startingDailyBalance = null;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('account_day database operations failed', { error: message });
  }

  // If startingDailyBalance cannot be read or established, the gate MUST reject (fail closed)
  if (startingDailyBalance === null) {
    throw new Error(
      'ACCOUNT_DAY_MISSING: Unable to read or create starting daily balance record in meridian.account_day.'
    );
  }

  // 4. Check news blackout status
  const symbol = options?.instrument || 'GBP/USD';
  const parts = symbol.split('/');
  const currencies = parts.length === 2 ? parts : ['USD', 'GBP'];
  const newsStatus = await checkNewsBlackoutStatus(currencies);
  const isNewsBlackoutActive = newsStatus !== 'CLEAR';

  // 5. Fetch open positions from broker adapter if supported
  //    Maps to OpenPositionRisk[] for aggregate/correlated risk rule evaluation.
  //    Duck-typed via optional method on StateAdapter to avoid circular imports.
  const openPositions: OpenPositionRisk[] = [];
  if (typeof adapter.getPositions === 'function') {
    try {
      const posRes = await adapter.getPositions!(accountId);
      if (posRes?.success && posRes.value) {
        for (const p of posRes.value) {
          // OANDA: negative units = short (SELL), positive = long (BUY)
          const direction: 'BUY' | 'SELL' = p.units < 0n ? 'SELL' : 'BUY';
          // riskAmountInAccountCurrency: absolute unrealizedPnl magnitude as a proxy.
          const absUnrealised = p.unrealizedPnl.price < 0n
            ? -p.unrealizedPnl.price
            : p.unrealizedPnl.price;
          openPositions.push({
            instrument: p.instrument,
            direction,
            riskAmountInAccountCurrency: absUnrealised as ScaledInteger,
          });
        }
      }
    } catch (e: any) {
      log.warn('buildAccountRiskState: getPositions failed — openPositions will be empty', { error: e.message });
    }
  }

  return {
    accountId,
    accountCurrency,
    startingDailyBalance,
    currentEquity,
    highWaterMark: storedHwm,
    openPositionCount: accountState.openPositionsCount,
    realizedPnlToday,
    unrealizedPnl: accountState.unrealizedPnl.price as ScaledInteger,
    isNewsBlackoutActive,
    newsStatus,
    quoteToAccountRates: options?.quoteToAccountRates,
    openPositions: openPositions.length > 0 ? openPositions : undefined,
    currentSpreadPips: options?.currentSpreadPips,
  };
}
